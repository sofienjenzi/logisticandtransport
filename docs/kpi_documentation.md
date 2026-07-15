# KPI Documentation

Source of truth: [frontend/src/dashboards/](../frontend/src/dashboards/) (one config module per dashboard) and [frontend/src/lib/model.js](../frontend/src/lib/model.js) (data loading and joins). Every KPI below is computed client-side from `data/logistics_exports.zip` after filters are applied (country, year, client/product/etc. depending on the page).

> Note: this doc was written against the original vanilla-JS `site/js/dashboard-page.js`, since migrated to the React app in `frontend/` (same formulas, ported near-verbatim — see [docs/data_model.md](data_model.md) if you need the schema this all reads from).

Status color rule shown in `[]` after each KPI: good / warn / bad thresholds, where defined.

## 1. Executif (`dashboard-executif.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| CA total | `SUM(fact_sales.revenue_amount)` | always "good" |
| Marge % | `AVG(fact_sales.margin_rate)` | good ≥25%, warn ≥15%, else bad |
| Service à temps | `AVG(fact_delivery.delivered_on_time_flag)` | good ≥92%, warn ≥85%, else bad |
| Rupture stock | `AVG(fact_stock.stockout_flag)` | good ≤5%, warn ≤12%, else bad |
| Satisfaction | `AVG(fact_customer_satisfaction.satisfaction_score)` | good ≥4.0, warn ≥3.5, else bad |
| Coût logistique / CA | `(SUM(transport.cost) + SUM(maintenance.cost) + SUM(fuel.cost)) / SUM(revenue)` | good ≤10%, warn ≤15%, else bad |
| Intensité CO2 | `SUM(transport.co2_kg) / SUM(revenue) × 1000` (kg CO2 per k€ de CA) | neutral |

Charts: on-time gauge (target 95%), CA/margin trend by month, CA vs transport cost by country, delay-category stack by country, NPS mix.

> **Design note on "coût logistique / CA":** deliberately excludes `fact_purchase.amount`. Purchase amount is cost-of-goods for resale — nearly identical in magnitude to `fact_sales.cost_amount`, which is already netted into `margin_rate`. Including it made the ratio read ~99% (it was really just restating COGS), which isn't a logistics metric. Only transport, fleet maintenance, and fuel — genuine operational overhead — go into this ratio.

## 2. Ventes (`dashboard-ventes.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| CA | `SUM(revenue_amount)` | good |
| Marge | `SUM(margin_amount)` | good |
| Marge % | `AVG(margin_rate)` | good ≥25%, else warn |
| Lignes | `COUNT(fact_sales rows)` | neutral |
| Taux remise | `SUM(discount_amount) / SUM(revenue_amount)` | good ≤5%, warn ≤10%, else bad |
| Score crédit moyen | `AVG(dim_client.credit_score)` | neutral |

Charts: top clients by CA, CA/margin by product, sales channel mix, margin-band distribution, CA by country, **CA by client segment** (Key/Growth/Standard), **CA by loyalty tier** (Gold/Silver/Bronze).

## 3. Achats (`dashboard-achats.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Coût achats | `SUM(purchase_amount)` | neutral |
| Délai réel moyen | `AVG(real_delay_days)` | neutral |
| Écart délai | `AVG(delay_gap_days)` (real − planned) | good ≤0, warn ≤1, else bad |
| Fournisseurs | `COUNT(DISTINCT supplier)` | neutral |
| Fiabilité fournisseur | `AVG(dim_supplier.reliability_score)` (0-100) | good ≥90, warn ≥80, else bad |
| Taux OTD fournisseur | `AVG(dim_supplier.on_time_delivery_rate)` | neutral |

Charts: cost by supplier, on-time-purchase gauge (target 90%, gap ≤0), cost by product, delay classification (En avance / 0-1j / 1-2j / >2j), purchases by country, **reliability score by supplier**.

> Skipped from the original proposal: "fournisseurs à risque (status ≠ actif)". Checked the data — all 24 suppliers in `dim_supplier.status` are `"Active"`. The field has zero variance in this seed dataset, so a KPI built on it would always read 0. Reliability score and OTD rate (used above) carry the actual signal instead.

## 4. Stocks (`dashboard-stocks.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Valeur stock | `SUM(stock_value_amount)` | neutral |
| Rupture | `AVG(stockout_flag)` | good ≤5%, warn ≤12%, else bad |
| Écart stock | `SUM(stock_real − stock_theoretical)` | neutral |
| Entrepôts | `COUNT(DISTINCT warehouse)` | neutral |
| Valeur courte durée de vie (≤150j) | `SUM(stock_value_amount)` where `dim_product.shelf_life_days ≤ 150` | always "warn" |

Charts: availability gauge (target 95%, = 1 − stockout rate), stock status mix, value by warehouse, value by product, stockouts by country, **stock value by shelf-life band** (0-150j / 151-250j / >250j — bands calibrated to the actual product range, 133-324 days).

> **Dropped from the original proposal: inventory turnover** (`SUM(sales.cost) / AVG(stock.value)`). Checked the real numbers: average total inventory value across all products/warehouses on a given snapshot date is ~€112k, against ~€47M annual COGS — any ratio between those two comes out at 400x+, regardless of how it's averaged. That's not a formula bug, it's a scale mismatch in how the seed data generates stock snapshots vs. sales volume (`src/etl/pipeline.py` / `rebalance_realistic_facts.py`). Shipping a "689x turnover" card would be actively misleading, so it's left out rather than faked with a relabeled threshold.

## 5. Livraisons (`dashboard-livraisons.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Livraisons | `COUNT(fact_delivery rows)` | neutral |
| À temps | `AVG(delivered_on_time_flag)` | good ≥92%, warn ≥85%, else bad |
| Service moyen | `AVG(service_rate)` | neutral |
| Retard moyen | `AVG(delay_minutes)` | neutral |

Charts: on-time gauge (target 95%), delay-category stack by country, monthly service-rate trend, lowest-on-time clients, driver on-time ranking, **on-time rate by day type** (Semaine / Weekend / Férié, from `dim_date.is_weekend`/`is_holiday`).

## 6. Transport (`dashboard-transport.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Coût transport | `SUM(transport_cost_amount)` | neutral |
| Distance | `SUM(distance_km)` | neutral |
| Coût/km | `SUM(cost) / SUM(distance)` | neutral |
| Fill rate | `AVG(fill_rate)` | good ≥80%, warn ≥65%, else bad |
| CO2 | `SUM(co2_kg)` | neutral |
| Écart durée vs planifié | `AVG(duration_hours − dim_route.planned_time_hours)` | good ≤0, warn ≤0.5h, else bad |

Charts: fill-rate gauge (target 85%), cost/km vs distance scatter, cost by carrier, fill-rate band mix, CO2 by country, **cost/km by route difficulty** (Low/Medium/High).

> Skipped: "toll cost per route". `dim_route.toll_count` exists but there's no toll price field to turn it into €, and it's already a decent proxy folded into `difficulty_level`. Would need an ETL addition (a per-toll cost assumption) to be a real € figure rather than a raw count.

## 7. Véhicules (`dashboard-vehicules.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Maintenance | `SUM(maintenance_cost_amount)` | neutral |
| Carburant | `SUM(fuel_cost_amount)` | neutral |
| Taux pannes | `AVG(breakdown_flag)` | good ≤5%, warn ≤12%, else bad |
| Immobilisation | `SUM(immobilization_hours)` | neutral |
| Âge moyen flotte | `AVG(currentYear − dim_vehicle.model_year)` | neutral |
| Maintenance ≤30j | `COUNT(vehicles)` where `next_maintenance_date` is due within 30 days (incl. overdue) | good = 0, warn ≤3, else bad |

Charts: fleet-reliability gauge (target 95%, = 1 − breakdown rate), maintenance cost by vehicle, fuel cost by vehicle, maintenance cost by vehicle type, immobilization hours by vehicle, **average odometer by vehicle type**.

## 8. RH Chauffeurs (`dashboard-rh.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Heures | `SUM(worked_hours)` | neutral |
| Présence | `AVG(present_flag)` | good ≥94%, warn ≥88%, else bad |
| Retards | `AVG(late_flag)` | good ≤5%, warn ≤12%, else bad |
| Expérience | `AVG(driver.experience_years)` | neutral |
| Masse salariale chauffeurs | `SUM(DISTINCT driver.salary_monthly)` | neutral |
| Effectif siège | `COUNT(dim_employee rows)` | neutral |

Charts: presence gauge (target 95%), attendance-status mix, worked hours by country, most-late drivers, experience-band distribution, **absence rate by seniority band**, **head-office headcount by department** (first use of `dim_employee` — previously an orphan dimension with no fact linked to it; shown here as a dimension-level breakdown since it has no measures of its own).

## 9. Incidents (`dashboard-incidents.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Incidents | `COUNT(fact_incident rows)` | neutral |
| Coût | `SUM(incident_cost_amount)` | always "bad" (cost is inherently negative) |
| Résolution | `AVG(resolution_hours)` | neutral |
| Accidents | `AVG(accident_flag)` | good ≤4%, warn ≤10%, else bad |

Charts: accident-free gauge (target 95%), severity mix, severity stack by country, cost by incident type, resolution time by severity, **cost by root cause** (Pareto view of `dim_incident.main_cause`).

## 10. Satisfaction (`dashboard-satisfaction.html`)

| KPI | Formula | Thresholds |
|---|---|---|
| Score moyen | `AVG(satisfaction_score)` | good ≥4.0, warn ≥3.5, else bad |
| Réclamations | `AVG(complaint_flag)` | good ≤5%, warn ≤12%, else bad |
| Promoters | `COUNT(nps_class = "Promoter") / COUNT(*)` | good ≥50%, warn ≥35%, else bad |
| Évaluations | `COUNT(fact_customer_satisfaction rows)` | neutral |

Charts: satisfaction gauge (target 4/5), NPS mix, satisfaction-band mix, score by country, complaint rate by client.

## 11. ML layer (`dashboard-ml.html`, `src/ml/train_models.py`)

Not KPIs in the BI sense, but the "quality KPIs" of the trained models, reported in `data/ml/model_report.json`:
- Delivery delay prediction — regression/classification error metrics (documented as generated, not hardcoded)
- Client classification — accuracy/F1 per segment
- Predictive maintenance — breakdown-risk score

---

## Implementation status

Everything in section A of the original proposal below has now been implemented (now in [frontend/src/dashboards/](../frontend/src/dashboards/)), with three exceptions caught during implementation once real numbers were checked against the data:

| Originally proposed | Outcome |
|---|---|
| Fournisseurs à risque (status ≠ actif) | **Dropped** — `dim_supplier.status` is `"Active"` for all 24 suppliers, zero variance. Replaced with reliability score + OTD rate (Achats). |
| Rotation de stock (turnover) | **Dropped** — real numbers give 400x+ regardless of aggregation method; a genuine scale mismatch between `fact_stock` snapshot values and `fact_sales` COGS in the seed data, not a formula issue. |
| Valeur périmée (≤30j) | **Recalibrated to ≤150j** — actual `shelf_life_days` range is 133–324 days; nothing in the data is ever ≤30, so the original threshold always read €0. |

Two items remain genuinely undone — see A below.

### A. Still open (needs an ETL change, not just a dashboard change)

| Proposed KPI | Why it's blocked |
|---|---|
| OTIF (On Time In Full) | Needs order completeness (qty delivered vs qty ordered), which isn't captured anywhere in `fact_delivery` today. |
| Coût péage par route (€) | `dim_route.toll_count` exists but there's no per-toll price field to convert it to euros. `difficulty_level` (now used in the Transport cost/km chart) is the closest proxy available without an ETL change. |
| Conformité chaîne du froid | Would need `fact_incident` to carry a temperature reading (or link to product) to cross-check against `dim_product.storage_temperature_c` — not present. |
| Cash conversion / utilisation entrepôt | `dim_warehouse.capacity_pallets` is in pallets; `fact_stock` values are in € and units, not pallets — no common unit to compute utilization %. |

### B. Needs new data sources (not in current schema)

These match exactly what the README already flags as documented future extensions for the ML layer — the same gaps apply to BI KPIs:
- **Traffic conditions** → delay-cause attribution, ETA accuracy
- **Weather** → weather-adjusted delay risk, seasonal fuel consumption
- **Departure hour / time-of-day** → peak-hour cost and delay analysis
- **Returns / reverse logistics** → return rate, cost of returns
- **Payment terms/status** → DSO (Days Sales Outstanding), late-payment risk
- **IoT sensors (temperature, GPS, fuel level)** → real-time cold-chain compliance, route deviation, fuel theft/anomaly detection

### C. Composite Exécutif KPIs

- **Logistics cost as % of revenue** and **carbon intensity** — done, see the Exécutif table above. (The logistics-cost formula was corrected during implementation to exclude COGS — see the design note under Exécutif.)
- **Perfect Order Rate** = on-time × in-full × damage-free — still blocked on OTIF (needs order completeness data, see A above).
- **Cost-to-serve per order** = (transport cost + maintenance cost allocated + incident cost) / order count — not implemented; straightforward to add once OTIF-style order-level joins exist, low priority on its own.

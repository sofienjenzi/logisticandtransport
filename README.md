# Logistics DW Seed Pipeline (France, Germany, Spain)

This project builds a professional BI seed dataset for logistics and transport with a star schema and robust ETL process.

## Scope

- Countries: France (`FR`), Germany (`DE`), Spain (`ES`)
- Real external sources (API parsing):
  - Open-Meteo Geocoding API: real latitude/longitude by city
  - OSRM API: real road distance and planned duration between cities
  - Nager.Date API: real public holidays for date dimension
  - World Bank API (`EP.PMP.DESL.CD`): diesel pump price by country/year
- Output:
  - Full dimensions in CSV
  - Full fact tables in CSV
  - Optional SQLite data warehouse load

## Important professional note

Open public data does not provide unrestricted transactional records at company order-line level for clients/suppliers/drivers because of legal/privacy constraints. This pipeline uses:

- Real geographic and market indicators from public APIs
- Deterministic business generation for order-level facts calibrated on those indicators

Result: robust, reproducible, and professional data foundation for Power BI and KPI dashboards.

## Structure

- [config/project_config.yaml](config/project_config.yaml)
- [sql/schema.sql](sql/schema.sql)
- [src/etl/pipeline.py](src/etl/pipeline.py)
- [src/etl/load_sqlite.py](src/etl/load_sqlite.py)
- `data/curated/*.csv` (generated)
- `data/logistics_dw.sqlite` (generated)

## Run

1. Create and activate a Python environment.
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Generate dimensions and facts:

```bash
python src/etl/pipeline.py
```

4. Load generated CSV into SQLite DW:

```bash
python src/etl/load_sqlite.py
```

5. Run data quality audit:

```bash
python src/etl/data_quality.py
```

Audit output:
- `data/curated/quality_report.json`

Optional: rebalance the generated facts with more realistic business distributions:

```bash
python src/etl/rebalance_realistic_facts.py
python src/etl/data_quality.py
```

This refreshes `data/curated/fact_*.csv` and `data/logistics_exports.zip` with diversified, coherent values. See [docs/data_realism_logic.md](docs/data_realism_logic.md).

## Website dashboards (React frontend)

The frontend is a React + Vite single-page app in `frontend/`, served together with the API by the same Flask process — there is no more static-only mode (`python -m http.server`), since the ML pages always need the API and client-side routes (e.g. `/dashboard/executif`) need Flask's SPA fallback to resolve correctly.

**Development** (hot reload, talks to the API via a dev-server proxy):

```bash
python src/ml/app.py        # terminal 1 — API + data on :8501
cd frontend && npm install && npm run dev   # terminal 2 — dev server on :5173
```

Open `http://localhost:5173/`.

**Production build** (single server, what's actually deployed):

```bash
cd frontend && npm run build   # outputs frontend/dist/
python src/ml/app.py           # serves frontend/dist/ + the API, both on :8501
```

Open `http://localhost:8501/`.

The app includes:
- Dynamic global filters (country, year, client, product, etc. — vary per dashboard)
- One route per dashboard (`/dashboard/:key`), all driven by a shared data model loaded once per session
- Navigation via the shared navbar/breadcrumbs
- Executive, Sales, Purchases, Stock, Delivery, Transport, Vehicles, Drivers, Incidents, Satisfaction dashboards
- Professional charts powered by `data/logistics_exports.zip`
- An IA & ML section with delivery delay prediction, client classification and predictive maintenance

### IA & ML layer

New files:
- `src/ml/train_models.py`
- `src/ml/inference.py`
- `src/ml/app.py`
- `frontend/src/pages/MlOverviewPage.jsx`, `MlDeliveryPage.jsx`, `MlClientPage.jsx`, `MlMaintenancePage.jsx`
- `data/ml/*.joblib` and `data/ml/model_report.json` (generated after training)

Run the ML training:

```bash
python src/ml/train_models.py
```

Then rebuild the frontend and launch the site with the API as described above.

Notes:
- The ML models are trained on the fields that already exist in the warehouse.
- Requested fields not yet present in the project data (traffic, weather, departure hour, returns, payment, sensor IoT variables) are exposed as future extensions and are documented in the ML report.

Files:
- `frontend/src/pages/` — one component per route (landing, dashboards, ML pages)
- `frontend/src/dashboards/` — one config module per dashboard (KPIs + charts as data)
- `frontend/src/lib/` — data loading (`model.js`), chart helpers (`charts.js`), formatters (`format.js`)
- `frontend/src/styles/` — the merged design system (tokens, base, dashboard, ml, landing)

Power BI build guide:
- [docs/powerbi_dashboard_spec.md](docs/powerbi_dashboard_spec.md)
- [docs/powerbi_dax_starter.md](docs/powerbi_dax_starter.md)
- [docs/powerbi_model_calculated_tables.dax](docs/powerbi_model_calculated_tables.dax)
- [docs/powerbi_measures.dax](docs/powerbi_measures.dax)

## Generated tables

Dimensions:
- `dim_date`
- `dim_client`
- `dim_supplier`
- `dim_product`
- `dim_vehicle`
- `dim_driver`
- `dim_warehouse`
- `dim_route`
- `dim_carrier`
- `dim_employee`
- `dim_incident`
- `dim_order`
- `dim_transport_mode`

Facts:
- `fact_sales`
- `fact_purchase`
- `fact_stock`
- `fact_delivery`
- `fact_transport`
- `fact_maintenance`
- `fact_driver_presence`
- `fact_incident`
- `fact_fuel`
- `fact_customer_satisfaction`

## Data quality suggestions

- Add unique and not-null tests per surrogate key.
- Validate business rules:
  - `fact_sales.margin_amount = revenue_amount - cost_amount`
  - `fact_delivery.delivered_on_time_flag` aligned with delay threshold
  - `fact_fuel.consumption_l_100km` in expected vehicle range
- Add incremental load by date for production.

## BI-ready fields for dynamic DAX

The model includes reusable categorical fields to simplify `IF` / `SWITCH` logic in Power BI:

- `dim_date.year_month`, `dim_date.year_quarter`, `dim_date.month_sort_key`
- `fact_sales.margin_rate`, `fact_sales.margin_band`
- `fact_delivery.delay_category`
- `fact_stock.stock_status`
- `fact_transport.transport_cost_per_km`, `fact_transport.fill_rate_band`
- `fact_driver_presence.attendance_status`
- `fact_incident.severity_band`
- `fact_customer_satisfaction.satisfaction_band`
# logisticandtransport

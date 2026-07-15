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

## Website dashboards (ITESLAB8LOGISTIC8ANALITYCS)

Launch a local web server from the project root:

```bash
python -m http.server 8501
```

Open:
- `http://localhost:8501/site/`

The website includes:
- Dynamic global filters (country, year, client, product)
- One standalone page per dashboard
- Navigation buttons between dashboards
- Executive, Sales, Purchases, Stock, Delivery, Transport, Vehicles, Drivers, Incidents, Satisfaction dashboards
- Professional charts powered by `data/logistics_exports.zip`
- A new IA & ML page with delivery delay prediction, client classification and predictive maintenance

### IA & ML layer added to the website

New files:
- `src/ml/train_models.py`
- `src/ml/inference.py`
- `src/ml/app.py`
- `site/dashboard-ml.html`
- `site/js/ml-dashboard.js`
- `data/ml/*.joblib` and `data/ml/model_report.json` (generated after training)

Run the ML training:

```bash
python src/ml/train_models.py
```

Launch the website with API and all existing dashboards:

```bash
python src/ml/app.py
```

Open:
- `http://localhost:8501/`
- `http://localhost:8501/dashboard-ml.html`

Notes:
- The ML models are trained on the fields that already exist in the warehouse.
- Requested fields not yet present in the project data (traffic, weather, departure hour, returns, payment, sensor IoT variables) are exposed as future extensions and are documented in the ML report.

Files:
- `site/index.html`
- `site/styles.css`
- `site/app.js`
- `site/dashboard-*.html`
- `site/js/dashboard-page.js`

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

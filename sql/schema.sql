-- Star schema for logistics BI (FR/DE/ES)
-- Naming convention: ASCII, snake_case, surrogate keys in integer.

CREATE TABLE IF NOT EXISTS dim_date (
    sk_date INTEGER PRIMARY KEY,
    full_date TEXT NOT NULL,
    year_month TEXT NOT NULL,
    year_quarter TEXT NOT NULL,
    month_sort_key INTEGER NOT NULL,
    day_num INTEGER NOT NULL,
    day_name TEXT NOT NULL,
    week_num INTEGER NOT NULL,
    month_num INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    quarter_num INTEGER NOT NULL,
    semester_num INTEGER NOT NULL,
    year_num INTEGER NOT NULL,
    is_weekend INTEGER NOT NULL,
    is_holiday INTEGER NOT NULL,
    country_code TEXT NOT NULL,
    UNIQUE (full_date, country_code)
);

CREATE TABLE IF NOT EXISTS dim_client (
    sk_client INTEGER PRIMARY KEY,
    client_code TEXT NOT NULL UNIQUE,
    client_name TEXT NOT NULL,
    client_type TEXT NOT NULL,
    sector_activity TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    country_code TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    creation_date TEXT,
    loyalty_level TEXT,
    credit_limit REAL,
    credit_score INTEGER,
    satisfaction_score REAL,
    segment TEXT
);

CREATE TABLE IF NOT EXISTS dim_supplier (
    sk_supplier INTEGER PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    supplier_type TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    country_code TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    reliability_score REAL,
    avg_delivery_days REAL,
    on_time_delivery_rate REAL,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_product (
    sk_product INTEGER PRIMARY KEY,
    product_code TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    brand TEXT,
    weight_kg REAL NOT NULL,
    volume_m3 REAL NOT NULL,
    purchase_price REAL NOT NULL,
    sale_price REAL NOT NULL,
    storage_temperature_c REAL,
    is_fragile INTEGER NOT NULL,
    shelf_life_days INTEGER,
    unit_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_vehicle (
    sk_vehicle INTEGER PRIMARY KEY,
    vehicle_id TEXT NOT NULL UNIQUE,
    plate_number TEXT NOT NULL UNIQUE,
    vehicle_type TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    model_year INTEGER NOT NULL,
    capacity_weight_kg REAL NOT NULL,
    capacity_volume_m3 REAL NOT NULL,
    fuel_type TEXT NOT NULL,
    avg_consumption_l_100km REAL NOT NULL,
    odometer_km REAL NOT NULL,
    last_maintenance_date TEXT,
    next_maintenance_date TEXT,
    status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_driver (
    sk_driver INTEGER PRIMARY KEY,
    driver_code TEXT NOT NULL UNIQUE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    gender TEXT,
    birth_date TEXT,
    hire_date TEXT NOT NULL,
    experience_years INTEGER NOT NULL,
    license_type TEXT NOT NULL,
    phone TEXT,
    salary_monthly REAL,
    availability TEXT NOT NULL,
    status TEXT NOT NULL,
    country_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_warehouse (
    sk_warehouse INTEGER PRIMARY KEY,
    warehouse_code TEXT NOT NULL UNIQUE,
    warehouse_name TEXT NOT NULL,
    city TEXT NOT NULL,
    region TEXT,
    country_code TEXT NOT NULL,
    warehouse_type TEXT NOT NULL,
    area_m2 REAL NOT NULL,
    capacity_pallets INTEGER NOT NULL,
    manager_name TEXT
);

CREATE TABLE IF NOT EXISTS dim_route (
    sk_route INTEGER PRIMARY KEY,
    route_code TEXT NOT NULL UNIQUE,
    departure_city TEXT NOT NULL,
    arrival_city TEXT NOT NULL,
    country_code TEXT NOT NULL,
    distance_km REAL NOT NULL,
    planned_time_hours REAL NOT NULL,
    toll_count INTEGER NOT NULL,
    difficulty_level TEXT NOT NULL,
    zone_type TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_carrier (
    sk_carrier INTEGER PRIMARY KEY,
    carrier_code TEXT NOT NULL UNIQUE,
    carrier_name TEXT NOT NULL,
    carrier_type TEXT NOT NULL,
    cost_per_km REAL NOT NULL,
    performance_score REAL,
    sla_level TEXT
);

CREATE TABLE IF NOT EXISTS dim_employee (
    sk_employee INTEGER PRIMARY KEY,
    employee_code TEXT NOT NULL UNIQUE,
    last_name TEXT NOT NULL,
    first_name TEXT NOT NULL,
    department TEXT NOT NULL,
    role_name TEXT NOT NULL,
    manager_name TEXT,
    hire_date TEXT NOT NULL,
    salary_monthly REAL,
    status TEXT NOT NULL,
    country_code TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_incident (
    sk_incident INTEGER PRIMARY KEY,
    incident_code TEXT NOT NULL UNIQUE,
    incident_type TEXT NOT NULL,
    category TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    main_cause TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_order (
    sk_order INTEGER PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    order_type TEXT NOT NULL,
    priority_level TEXT NOT NULL,
    sales_channel TEXT NOT NULL,
    order_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dim_transport_mode (
    sk_transport_mode INTEGER PRIMARY KEY,
    transport_mode_code TEXT NOT NULL UNIQUE,
    transport_mode TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    standard_delay_hours REAL,
    avg_cost_per_km REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS fact_sales (
    fact_sales_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_client INTEGER NOT NULL,
    sk_product INTEGER NOT NULL,
    sk_order INTEGER NOT NULL,
    quantity_units REAL NOT NULL,
    unit_sale_price REAL NOT NULL,
    revenue_amount REAL NOT NULL,
    cost_amount REAL NOT NULL,
    margin_amount REAL NOT NULL,
    margin_rate REAL NOT NULL,
    margin_band TEXT NOT NULL,
    discount_amount REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_client) REFERENCES dim_client(sk_client),
    FOREIGN KEY (sk_product) REFERENCES dim_product(sk_product),
    FOREIGN KEY (sk_order) REFERENCES dim_order(sk_order)
);

CREATE TABLE IF NOT EXISTS fact_purchase (
    fact_purchase_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_supplier INTEGER NOT NULL,
    sk_product INTEGER NOT NULL,
    sk_order INTEGER NOT NULL,
    quantity_units REAL NOT NULL,
    purchase_unit_price REAL NOT NULL,
    purchase_amount REAL NOT NULL,
    planned_delay_days REAL NOT NULL,
    real_delay_days REAL NOT NULL,
    delay_gap_days REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_supplier) REFERENCES dim_supplier(sk_supplier),
    FOREIGN KEY (sk_product) REFERENCES dim_product(sk_product),
    FOREIGN KEY (sk_order) REFERENCES dim_order(sk_order)
);

CREATE TABLE IF NOT EXISTS fact_stock (
    fact_stock_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_product INTEGER NOT NULL,
    sk_warehouse INTEGER NOT NULL,
    stock_theoretical REAL NOT NULL,
    stock_real REAL NOT NULL,
    stock_value_amount REAL NOT NULL,
    safety_stock REAL NOT NULL,
    stockout_flag INTEGER NOT NULL,
    stock_status TEXT NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_product) REFERENCES dim_product(sk_product),
    FOREIGN KEY (sk_warehouse) REFERENCES dim_warehouse(sk_warehouse)
);

CREATE TABLE IF NOT EXISTS fact_delivery (
    fact_delivery_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_order INTEGER NOT NULL,
    sk_driver INTEGER NOT NULL,
    sk_vehicle INTEGER NOT NULL,
    sk_route INTEGER NOT NULL,
    sk_client INTEGER NOT NULL,
    planned_delay_hours REAL NOT NULL,
    real_delay_hours REAL NOT NULL,
    delay_minutes REAL NOT NULL,
    delay_category TEXT NOT NULL,
    delivered_on_time_flag INTEGER NOT NULL,
    service_rate REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_order) REFERENCES dim_order(sk_order),
    FOREIGN KEY (sk_driver) REFERENCES dim_driver(sk_driver),
    FOREIGN KEY (sk_vehicle) REFERENCES dim_vehicle(sk_vehicle),
    FOREIGN KEY (sk_route) REFERENCES dim_route(sk_route),
    FOREIGN KEY (sk_client) REFERENCES dim_client(sk_client)
);

CREATE TABLE IF NOT EXISTS fact_transport (
    fact_transport_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_route INTEGER NOT NULL,
    sk_vehicle INTEGER NOT NULL,
    sk_driver INTEGER NOT NULL,
    sk_carrier INTEGER NOT NULL,
    sk_transport_mode INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    duration_hours REAL NOT NULL,
    transport_cost_amount REAL NOT NULL,
    transport_cost_per_km REAL NOT NULL,
    fill_rate REAL NOT NULL,
    fill_rate_band TEXT NOT NULL,
    co2_kg REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_route) REFERENCES dim_route(sk_route),
    FOREIGN KEY (sk_vehicle) REFERENCES dim_vehicle(sk_vehicle),
    FOREIGN KEY (sk_driver) REFERENCES dim_driver(sk_driver),
    FOREIGN KEY (sk_carrier) REFERENCES dim_carrier(sk_carrier),
    FOREIGN KEY (sk_transport_mode) REFERENCES dim_transport_mode(sk_transport_mode)
);

CREATE TABLE IF NOT EXISTS fact_maintenance (
    fact_maintenance_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_vehicle INTEGER NOT NULL,
    maintenance_cost_amount REAL NOT NULL,
    immobilization_hours REAL NOT NULL,
    breakdown_flag INTEGER NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_vehicle) REFERENCES dim_vehicle(sk_vehicle)
);

CREATE TABLE IF NOT EXISTS fact_driver_presence (
    fact_presence_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_driver INTEGER NOT NULL,
    present_flag INTEGER NOT NULL,
    worked_hours REAL NOT NULL,
    absence_flag INTEGER NOT NULL,
    late_flag INTEGER NOT NULL,
    attendance_status TEXT NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_driver) REFERENCES dim_driver(sk_driver)
);

CREATE TABLE IF NOT EXISTS fact_incident (
    fact_incident_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_incident INTEGER NOT NULL,
    sk_driver INTEGER,
    sk_vehicle INTEGER,
    sk_route INTEGER,
    incident_cost_amount REAL NOT NULL,
    severity_score REAL NOT NULL,
    severity_band TEXT NOT NULL,
    resolution_hours REAL NOT NULL,
    accident_flag INTEGER NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_incident) REFERENCES dim_incident(sk_incident),
    FOREIGN KEY (sk_driver) REFERENCES dim_driver(sk_driver),
    FOREIGN KEY (sk_vehicle) REFERENCES dim_vehicle(sk_vehicle),
    FOREIGN KEY (sk_route) REFERENCES dim_route(sk_route)
);

CREATE TABLE IF NOT EXISTS fact_fuel (
    fact_fuel_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_vehicle INTEGER NOT NULL,
    liters REAL NOT NULL,
    fuel_cost_amount REAL NOT NULL,
    odometer_km REAL NOT NULL,
    consumption_l_100km REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_vehicle) REFERENCES dim_vehicle(sk_vehicle)
);

CREATE TABLE IF NOT EXISTS fact_customer_satisfaction (
    fact_satisfaction_id INTEGER PRIMARY KEY,
    sk_date INTEGER NOT NULL,
    sk_client INTEGER NOT NULL,
    sk_order INTEGER,
    satisfaction_score REAL NOT NULL,
    satisfaction_band TEXT NOT NULL,
    complaint_flag INTEGER NOT NULL,
    nps_class TEXT NOT NULL,
    resolution_hours REAL NOT NULL,
    FOREIGN KEY (sk_date) REFERENCES dim_date(sk_date),
    FOREIGN KEY (sk_client) REFERENCES dim_client(sk_client),
    FOREIGN KEY (sk_order) REFERENCES dim_order(sk_order)
);

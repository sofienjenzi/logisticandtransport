from __future__ import annotations

import csv
import hashlib
import json
import logging
import math
import random
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import requests
import yaml
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


LOGGER = logging.getLogger("logistics_etl")


@dataclass
class CityGeo:
    country_code: str
    city: str
    latitude: float
    longitude: float


def _stable_hash(value: str) -> int:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:12], 16)


def _session() -> requests.Session:
    session = requests.Session()
    retry = Retry(
        total=4,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def load_config(config_path: Path) -> dict:
    with config_path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _to_date(value: object) -> date:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    raise TypeError(f"Unsupported date value type: {type(value)}")


def _margin_band(rate: float) -> str:
    if rate < 0:
        return "Loss"
    if rate < 0.1:
        return "Low"
    if rate < 0.2:
        return "Medium"
    return "High"


def _delay_category(delay_minutes: float) -> str:
    if delay_minutes <= 0:
        return "On Time"
    if delay_minutes <= 30:
        return "Minor Delay"
    if delay_minutes <= 120:
        return "Moderate Delay"
    return "Severe Delay"


def _fill_rate_band(fill_rate: float) -> str:
    if fill_rate < 0.7:
        return "Low"
    if fill_rate < 0.85:
        return "Medium"
    return "High"


def _stock_status(stock_real: float, safety_stock: float) -> str:
    if stock_real <= 0:
        return "Out of Stock"
    if stock_real < safety_stock:
        return "Below Safety"
    if stock_real > safety_stock * 2.5:
        return "Overstock"
    return "Healthy"


def _satisfaction_band(score: float) -> str:
    if score < 3.0:
        return "Poor"
    if score < 4.0:
        return "Average"
    if score < 4.5:
        return "Good"
    return "Excellent"


def daterange(start: date, end: date) -> Iterable[date]:
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def geocode_city(session: requests.Session, city: str, country_code: str) -> CityGeo:
    params = {
        "name": city,
        "country": country_code,
        "count": 1,
        "language": "en",
        "format": "json",
    }
    response = session.get("https://geocoding-api.open-meteo.com/v1/search", params=params, timeout=20)
    response.raise_for_status()
    payload = response.json()
    if not payload.get("results"):
        raise ValueError(f"City not found in geocoding API: {city}/{country_code}")
    result = payload["results"][0]
    return CityGeo(
        country_code=country_code,
        city=city,
        latitude=float(result["latitude"]),
        longitude=float(result["longitude"]),
    )


def route_metrics(session: requests.Session, origin: CityGeo, destination: CityGeo) -> Tuple[float, float]:
    coordinates = f"{origin.longitude},{origin.latitude};{destination.longitude},{destination.latitude}"
    params = {"overview": "false", "alternatives": "false"}
    url = f"https://router.project-osrm.org/route/v1/driving/{coordinates}"
    response = session.get(url, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()
    routes = payload.get("routes", [])
    if not routes:
        raise ValueError(f"No route found between {origin.city} and {destination.city}")
    route = routes[0]
    distance_km = float(route["distance"]) / 1000.0
    duration_hours = float(route["duration"]) / 3600.0
    return round(distance_km, 2), round(duration_hours, 2)


def world_bank_indicator(session: requests.Session, iso3: str, indicator: str) -> List[dict]:
    url = f"https://api.worldbank.org/v2/country/{iso3}/indicator/{indicator}"
    params = {"format": "json", "per_page": 200}
    response = session.get(url, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()
    if not isinstance(payload, list) or len(payload) < 2:
        return []

    rows: List[dict] = []
    for item in payload[1]:
        value = item.get("value")
        year = item.get("date")
        if value is None or year is None:
            continue
        rows.append({"year": int(year), "value": float(value)})
    return rows


def nager_holidays(session: requests.Session, year: int, country_code: str) -> set[str]:
    url = f"https://date.nager.at/api/v3/PublicHolidays/{year}/{country_code}"
    response = session.get(url, timeout=30)
    response.raise_for_status()
    payload = response.json()
    return {item["date"] for item in payload}


def build_dim_date(config: dict, session: requests.Session) -> List[dict]:
    start_date = _to_date(config["project"]["start_date"])
    end_date = _to_date(config["project"]["end_date"])

    rows: List[dict] = []
    sk_date = 1
    for country in config["countries"]:
        years = list(range(start_date.year, end_date.year + 1))
        holidays: set[str] = set()
        for year in years:
            holidays.update(nager_holidays(session, year, country["code"]))

        for day in daterange(start_date, end_date):
            rows.append(
                {
                    "sk_date": sk_date,
                    "full_date": day.strftime("%Y-%m-%d"),
                    "year_month": day.strftime("%Y-%m"),
                    "year_quarter": f"{day.year}-Q{int(math.ceil(day.month / 3))}",
                    "month_sort_key": int(day.strftime("%Y%m")),
                    "day_num": day.day,
                    "day_name": day.strftime("%A"),
                    "week_num": int(day.isocalendar().week),
                    "month_num": day.month,
                    "month_name": day.strftime("%B"),
                    "quarter_num": int(math.ceil(day.month / 3)),
                    "semester_num": 1 if day.month <= 6 else 2,
                    "year_num": day.year,
                    "is_weekend": 1 if day.weekday() >= 5 else 0,
                    "is_holiday": 1 if day.strftime("%Y-%m-%d") in holidays else 0,
                    "country_code": country["code"],
                }
            )
            sk_date += 1

    return rows


def build_city_geo(config: dict, session: requests.Session) -> Dict[Tuple[str, str], CityGeo]:
    city_geo: Dict[Tuple[str, str], CityGeo] = {}
    for country in config["countries"]:
        for city in country["cities"]:
            city_geo[(country["code"], city)] = geocode_city(session, city, country["code"])
    return city_geo


def build_dim_client(config: dict, city_geo: Dict[Tuple[str, str], CityGeo]) -> List[dict]:
    rows: List[dict] = []
    sectors = ["Retail", "E-commerce", "Wholesale"]
    loyalty_levels = ["Gold", "Silver", "Bronze"]
    sk = 1

    for country in config["countries"]:
        for idx, name in enumerate(config["clients"]):
            city = country["cities"][idx % len(country["cities"])]
            geo = city_geo[(country["code"], city)]
            h = _stable_hash(f"{country['code']}|{name}")
            rows.append(
                {
                    "sk_client": sk,
                    "client_code": f"CLI-{country['code']}-{idx + 1:03d}",
                    "client_name": name,
                    "client_type": "B2B",
                    "sector_activity": sectors[h % len(sectors)],
                    "city": city,
                    "region": city,
                    "country_code": country["code"],
                    "latitude": geo.latitude,
                    "longitude": geo.longitude,
                    "creation_date": f"{2018 + (h % 7)}-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "loyalty_level": loyalty_levels[h % len(loyalty_levels)],
                    "credit_limit": float(100000 + (h % 8) * 50000),
                    "credit_score": int(620 + (h % 200)),
                    "satisfaction_score": round(3.5 + ((h % 15) / 10), 2),
                    "segment": ["Key", "Growth", "Standard"][h % 3],
                }
            )
            sk += 1
    return rows


def build_dim_supplier(config: dict) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        dial_code = 33 if country["code"] == "FR" else (49 if country["code"] == "DE" else 34)
        for idx, name in enumerate(config["suppliers"]):
            h = _stable_hash(f"SUP|{country['code']}|{name}")
            email_domain = name.lower().replace(" ", "").replace("+", "")
            rows.append(
                {
                    "sk_supplier": sk,
                    "supplier_code": f"SUP-{country['code']}-{idx + 1:03d}",
                    "supplier_name": name,
                    "supplier_type": "Logistics Provider",
                    "city": country["cities"][idx % len(country["cities"])],
                    "region": country["cities"][idx % len(country["cities"])],
                    "country_code": country["code"],
                    "contact_name": f"Contact {idx + 1}",
                    "phone": f"+{dial_code}600{idx:04d}",
                    "email": f"contact{idx + 1}@{email_domain}.com",
                    "reliability_score": round(75 + (h % 25), 2),
                    "avg_delivery_days": round(1 + (h % 5) + ((h % 10) / 10), 2),
                    "on_time_delivery_rate": round(0.82 + ((h % 15) / 100), 3),
                    "status": "Active",
                }
            )
            sk += 1
    return rows


def build_dim_product(config: dict) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for product in config["products"]:
        h = _stable_hash(product["code"])
        purchase_price = round(150 + (h % 400), 2)
        sale_price = round(purchase_price * (1.15 + (h % 8) / 100), 2)
        rows.append(
            {
                "sk_product": sk,
                "product_code": product["code"],
                "product_name": product["name"],
                "category": product["category"],
                "sub_category": product["sub_category"],
                "brand": ["Generic", "Premium", "Value"][h % 3],
                "weight_kg": float(product["weight_kg"]),
                "volume_m3": float(product["volume_m3"]),
                "purchase_price": purchase_price,
                "sale_price": sale_price,
                "storage_temperature_c": float(product["storage_temp_c"]),
                "is_fragile": 1 if product["fragile"] else 0,
                "shelf_life_days": int(30 + (h % 330)),
                "unit_name": product["unit"],
            }
        )
        sk += 1
    return rows


def build_dim_warehouse(config: dict) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        for idx, city in enumerate(country["cities"][:3]):
            h = _stable_hash(f"WH|{country['code']}|{city}")
            rows.append(
                {
                    "sk_warehouse": sk,
                    "warehouse_code": f"WH-{country['code']}-{idx + 1:02d}",
                    "warehouse_name": f"Hub {city}",
                    "city": city,
                    "region": city,
                    "country_code": country["code"],
                    "warehouse_type": "Regional DC" if idx == 0 else "Urban DC",
                    "area_m2": float(7000 + (h % 9000)),
                    "capacity_pallets": int(4000 + (h % 12000)),
                    "manager_name": f"Manager {country['code']}-{idx + 1}",
                }
            )
            sk += 1
    return rows


def build_dim_route(config: dict, city_geo: Dict[Tuple[str, str], CityGeo], session: requests.Session) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        cities = country["cities"]
        for idx in range(len(cities) - 1):
            dep = cities[idx]
            arr = cities[idx + 1]
            origin = city_geo[(country["code"], dep)]
            destination = city_geo[(country["code"], arr)]
            distance_km, duration_hours = route_metrics(session, origin, destination)
            h = _stable_hash(f"ROUTE|{country['code']}|{dep}|{arr}")
            rows.append(
                {
                    "sk_route": sk,
                    "route_code": f"RTE-{country['code']}-{idx + 1:03d}",
                    "departure_city": dep,
                    "arrival_city": arr,
                    "country_code": country["code"],
                    "distance_km": distance_km,
                    "planned_time_hours": duration_hours,
                    "toll_count": int(1 + (h % 7)),
                    "difficulty_level": ["Low", "Medium", "High"][h % 3],
                    "zone_type": "Domestic",
                }
            )
            sk += 1
    return rows


def build_dim_carrier(config: dict) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        for idx, carrier in enumerate(config["transporters"]):
            h = _stable_hash(f"CAR|{country['code']}|{carrier}")
            rows.append(
                {
                    "sk_carrier": sk,
                    "carrier_code": f"CAR-{country['code']}-{idx + 1:03d}",
                    "carrier_name": carrier,
                    "carrier_type": "Road",
                    "cost_per_km": round(0.95 + (h % 80) / 100, 2),
                    "performance_score": round(78 + (h % 20), 2),
                    "sla_level": ["Standard", "Premium", "Critical"][h % 3],
                }
            )
            sk += 1
    return rows


def build_dim_vehicle(config: dict) -> List[dict]:
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        for idx, vehicle in enumerate(config["vehicles"]):
            h = _stable_hash(f"VEH|{country['code']}|{idx}")
            rows.append(
                {
                    "sk_vehicle": sk,
                    "vehicle_id": f"VEH-{country['code']}-{idx + 1:03d}",
                    "plate_number": f"{country['code']}-{1000 + idx}X{idx}",
                    "vehicle_type": vehicle["type"],
                    "brand": vehicle["brand"],
                    "model": vehicle["model"],
                    "model_year": int(2018 + (h % 7)),
                    "capacity_weight_kg": float(vehicle["capacity_weight_kg"]),
                    "capacity_volume_m3": float(vehicle["capacity_volume_m3"]),
                    "fuel_type": vehicle["fuel_type"],
                    "avg_consumption_l_100km": float(vehicle["consumption_l_per_100km"]),
                    "odometer_km": float(60000 + (h % 220000)),
                    "last_maintenance_date": f"2025-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "next_maintenance_date": f"2026-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "status": "Active",
                }
            )
            sk += 1
    return rows


def build_dim_driver(config: dict) -> List[dict]:
    rows: List[dict] = []
    first_names = ["Alex", "Sofia", "Lucas", "Marta", "Daniel", "Nora", "Hugo", "Emma"]
    last_names = ["Martin", "Garcia", "Muller", "Dubois", "Lopez", "Schmidt", "Rossi", "Bernard"]
    sk = 1
    for country in config["countries"]:
        dial_code = 33 if country["code"] == "FR" else (49 if country["code"] == "DE" else 34)
        for idx in range(18):
            h = _stable_hash(f"DRV|{country['code']}|{idx}")
            rows.append(
                {
                    "sk_driver": sk,
                    "driver_code": f"DRV-{country['code']}-{idx + 1:03d}",
                    "last_name": last_names[h % len(last_names)],
                    "first_name": first_names[(h // 3) % len(first_names)],
                    "gender": ["M", "F"][h % 2],
                    "birth_date": f"{1975 + (h % 25)}-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "hire_date": f"{2010 + (h % 14)}-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "experience_years": int(3 + (h % 20)),
                    "license_type": ["C", "CE", "C1E"][h % 3],
                    "phone": f"+{dial_code}700{idx:04d}",
                    "salary_monthly": float(2200 + (h % 1800)),
                    "availability": ["Available", "Busy", "Leave"][h % 3],
                    "status": "Active",
                    "country_code": country["code"],
                }
            )
            sk += 1
    return rows


def build_dim_incident() -> List[dict]:
    incidents = [
        ("INC-001", "Delay", "Operational", "Low", "Traffic congestion"),
        ("INC-002", "Accident", "Safety", "High", "Road collision"),
        ("INC-003", "Breakdown", "Technical", "Medium", "Engine fault"),
        ("INC-004", "Damaged Goods", "Quality", "Medium", "Handling issue"),
        ("INC-005", "Documentation", "Administrative", "Low", "Missing papers"),
    ]
    rows: List[dict] = []
    for idx, (code, inc_type, category, severity, cause) in enumerate(incidents, start=1):
        rows.append(
            {
                "sk_incident": idx,
                "incident_code": code,
                "incident_type": inc_type,
                "category": category,
                "severity_level": severity,
                "main_cause": cause,
            }
        )
    return rows


def build_dim_order() -> List[dict]:
    rows: List[dict] = []
    for idx in range(1, 2501):
        h = _stable_hash(f"ORD|{idx}")
        status_mod = h % 100
        if status_mod < 78:
            order_status = "Delivered"
        elif status_mod < 95:
            order_status = "In Transit"
        elif status_mod < 98:
            order_status = "Returned"
        else:
            order_status = "Cancelled"
        rows.append(
            {
                "sk_order": idx,
                "order_number": f"ORD-{idx:07d}",
                "order_type": ["Standard", "Express", "Backorder"][h % 3],
                "priority_level": ["Low", "Medium", "High", "Critical"][h % 4],
                "sales_channel": ["B2B", "E-commerce", "EDI"][h % 3],
                "order_status": order_status,
            }
        )
    return rows


def build_dim_transport_mode() -> List[dict]:
    return [
        {"sk_transport_mode": 1, "transport_mode_code": "MOD-ROAD", "transport_mode": "Road", "vehicle_type": "Truck", "standard_delay_hours": 24, "avg_cost_per_km": 1.25},
        {"sk_transport_mode": 2, "transport_mode_code": "MOD-RAIL", "transport_mode": "Rail", "vehicle_type": "Cargo Train", "standard_delay_hours": 36, "avg_cost_per_km": 0.8},
        {"sk_transport_mode": 3, "transport_mode_code": "MOD-SEA", "transport_mode": "Maritime", "vehicle_type": "Container Ship", "standard_delay_hours": 120, "avg_cost_per_km": 0.35},
        {"sk_transport_mode": 4, "transport_mode_code": "MOD-AIR", "transport_mode": "Air", "vehicle_type": "Cargo Plane", "standard_delay_hours": 8, "avg_cost_per_km": 3.9},
    ]


def build_dim_employee(config: dict) -> List[dict]:
    roles = ["Planner", "Dispatcher", "Warehouse Supervisor", "Procurement Specialist", "Data Analyst"]
    rows: List[dict] = []
    sk = 1
    for country in config["countries"]:
        for idx in range(10):
            h = _stable_hash(f"EMP|{country['code']}|{idx}")
            rows.append(
                {
                    "sk_employee": sk,
                    "employee_code": f"EMP-{country['code']}-{idx + 1:03d}",
                    "last_name": f"Last{idx + 1}",
                    "first_name": f"First{idx + 1}",
                    "department": ["Operations", "Procurement", "Sales", "Finance"][h % 4],
                    "role_name": roles[h % len(roles)],
                    "manager_name": f"Manager {country['code']}-{(idx % 3) + 1}",
                    "hire_date": f"{2014 + (h % 10)}-{1 + (h % 12):02d}-{1 + (h % 27):02d}",
                    "salary_monthly": float(2400 + (h % 2600)),
                    "status": "Active",
                    "country_code": country["code"],
                }
            )
            sk += 1
    return rows


def diesel_price_by_country_year(config: dict, session: requests.Session) -> Dict[Tuple[str, int], float]:
    output: Dict[Tuple[str, int], float] = {}
    for country in config["countries"]:
        rows = world_bank_indicator(session, country["iso3"], "EP.PMP.DESL.CD")
        for row in rows:
            output[(country["code"], int(row["year"]))] = float(row["value"])
    return output


def _group_by_country(rows: List[dict], key: str) -> Dict[str, List[dict]]:
    grouped: Dict[str, List[dict]] = {}
    for row in rows:
        grouped.setdefault(row[key], []).append(row)
    return grouped


def build_facts(config: dict, dims: Dict[str, List[dict]], diesel_prices: Dict[Tuple[str, int], float]) -> Dict[str, List[dict]]:
    seed = int(config["project"]["seed"])
    rng = random.Random(seed)

    dim_date = dims["dim_date"]
    dim_client = dims["dim_client"]
    dim_supplier = dims["dim_supplier"]
    dim_product = dims["dim_product"]
    dim_order = dims["dim_order"]
    dim_driver = dims["dim_driver"]
    dim_vehicle = dims["dim_vehicle"]
    dim_route = dims["dim_route"]
    dim_carrier = dims["dim_carrier"]
    dim_transport_mode = dims["dim_transport_mode"]
    dim_warehouse = dims["dim_warehouse"]
    dim_incident = dims["dim_incident"]

    date_by_country = _group_by_country(dim_date, "country_code")
    clients_by_country = _group_by_country(dim_client, "country_code")
    suppliers_by_country = _group_by_country(dim_supplier, "country_code")
    drivers_by_country = _group_by_country(dim_driver, "country_code")
    routes_by_country = _group_by_country(dim_route, "country_code")
    warehouses_by_country = _group_by_country(dim_warehouse, "country_code")

    vehicles_by_country: Dict[str, List[dict]] = {"FR": [], "DE": [], "ES": []}
    carriers_by_country: Dict[str, List[dict]] = {"FR": [], "DE": [], "ES": []}
    for row in dim_vehicle:
        for country in vehicles_by_country:
            if country in row["vehicle_id"]:
                vehicles_by_country[country].append(row)
                break
    for row in dim_carrier:
        for country in carriers_by_country:
            if country in row["carrier_code"]:
                carriers_by_country[country].append(row)
                break

    road_mode = [m for m in dim_transport_mode if m["transport_mode"] == "Road"][0]

    eligible_orders = [order for order in dim_order if order["order_status"] != "Cancelled"]
    sampled_orders = rng.sample(eligible_orders, 1800)

    sales_rows: List[dict] = []
    purchase_rows: List[dict] = []
    stock_rows: List[dict] = []
    delivery_rows: List[dict] = []
    transport_rows: List[dict] = []
    maintenance_rows: List[dict] = []
    presence_rows: List[dict] = []
    incident_rows: List[dict] = []
    fuel_rows: List[dict] = []
    satisfaction_rows: List[dict] = []

    sales_id = purchase_id = stock_id = delivery_id = transport_id = 1
    maintenance_id = presence_id = incident_id = fuel_id = satisfaction_id = 1

    countries = ["FR", "DE", "ES"]

    for order in sampled_orders:
        country = rng.choice(countries)
        order_status = order["order_status"]

        date_row = rng.choice(date_by_country[country])
        client = rng.choice(clients_by_country[country])
        supplier = rng.choice(suppliers_by_country[country])
        product = rng.choice(dim_product)
        driver = rng.choice(drivers_by_country[country])
        vehicle = rng.choice(vehicles_by_country[country])
        route = rng.choice(routes_by_country[country])
        carrier = rng.choice(carriers_by_country[country])
        warehouse = rng.choice(warehouses_by_country[country])

        qty = float(rng.randint(2, 37))
        unit_sale = float(product["sale_price"])
        unit_purchase = float(product["purchase_price"])
        revenue = round(qty * unit_sale, 2)
        purchase_amount = round(qty * unit_purchase, 2)
        discount = round(revenue * rng.uniform(0.01, 0.08), 2)
        margin = round((revenue - discount) - purchase_amount, 2)
        margin_rate = round((margin / (revenue - discount)), 4) if (revenue - discount) > 0 else 0.0
        margin_band = _margin_band(margin_rate)

        planned_hours = float(route["planned_time_hours"])
        real_hours = round(planned_hours * rng.uniform(0.85, 1.35), 2)
        if order_status == "In Transit":
            real_hours = round(planned_hours * rng.uniform(1.0, 1.45), 2)
        elif order_status == "Returned":
            real_hours = round(planned_hours * rng.uniform(0.95, 1.25), 2)
        delay_minutes = max(0.0, round((real_hours - planned_hours) * 60, 2))
        on_time = 1 if real_hours <= planned_hours * 1.08 and order_status == "Delivered" else 0
        service_rate = round(rng.uniform(0.9, 1.0) if on_time else rng.uniform(0.72, 0.9), 3)
        if order_status == "In Transit":
            service_rate = round(rng.uniform(0.65, 0.86), 3)
        if order_status == "Returned":
            service_rate = round(rng.uniform(0.5, 0.78), 3)
        delay_category = _delay_category(delay_minutes)

        distance_km = float(route["distance_km"])
        fill_rate = round(rng.uniform(0.62, 0.98), 3)

        year_num = int(date_row["year_num"])
        diesel_price = diesel_prices.get((country, year_num), 1.65)

        liters = round(distance_km * float(vehicle["avg_consumption_l_100km"]) / 100.0, 2)
        fuel_cost = round(liters * diesel_price, 2)

        carrier_cost = round(distance_km * float(carrier["cost_per_km"]), 2)
        transport_cost = round(carrier_cost + fuel_cost + rng.uniform(25, 130), 2)
        co2 = round(liters * 2.64, 2)

        stock_theoretical = float(rng.randint(120, 949))
        stock_real = max(0.0, round(stock_theoretical + rng.gauss(0, 35), 2))
        stock_value = round(stock_real * unit_purchase, 2)
        safety = float(rng.randint(80, 169))
        stockout = 1 if stock_real < safety else 0
        stock_status = _stock_status(stock_real, safety)

        planned_delay_days = round(planned_hours / 24, 2)
        real_delay_days = round(real_hours / 24, 2)

        sales_rows.append(
            {
                "fact_sales_id": sales_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_client": int(client["sk_client"]),
                "sk_product": int(product["sk_product"]),
                "sk_order": int(order["sk_order"]),
                "quantity_units": qty,
                "unit_sale_price": unit_sale,
                "revenue_amount": round(revenue - discount, 2),
                "cost_amount": purchase_amount,
                "margin_amount": margin,
                "margin_rate": margin_rate,
                "margin_band": margin_band,
                "discount_amount": discount,
            }
        )
        sales_id += 1

        purchase_rows.append(
            {
                "fact_purchase_id": purchase_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_supplier": int(supplier["sk_supplier"]),
                "sk_product": int(product["sk_product"]),
                "sk_order": int(order["sk_order"]),
                "quantity_units": qty,
                "purchase_unit_price": unit_purchase,
                "purchase_amount": purchase_amount,
                "planned_delay_days": planned_delay_days,
                "real_delay_days": real_delay_days,
                "delay_gap_days": round(real_delay_days - planned_delay_days, 2),
            }
        )
        purchase_id += 1

        stock_rows.append(
            {
                "fact_stock_id": stock_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_product": int(product["sk_product"]),
                "sk_warehouse": int(warehouse["sk_warehouse"]),
                "stock_theoretical": stock_theoretical,
                "stock_real": stock_real,
                "stock_value_amount": stock_value,
                "safety_stock": safety,
                "stockout_flag": stockout,
                "stock_status": stock_status,
            }
        )
        stock_id += 1

        delivery_rows.append(
            {
                "fact_delivery_id": delivery_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_order": int(order["sk_order"]),
                "sk_driver": int(driver["sk_driver"]),
                "sk_vehicle": int(vehicle["sk_vehicle"]),
                "sk_route": int(route["sk_route"]),
                "sk_client": int(client["sk_client"]),
                "planned_delay_hours": planned_hours,
                "real_delay_hours": real_hours,
                "delay_minutes": delay_minutes,
                "delay_category": delay_category,
                "delivered_on_time_flag": on_time,
                "service_rate": service_rate,
            }
        )
        delivery_id += 1

        transport_rows.append(
            {
                "fact_transport_id": transport_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_route": int(route["sk_route"]),
                "sk_vehicle": int(vehicle["sk_vehicle"]),
                "sk_driver": int(driver["sk_driver"]),
                "sk_carrier": int(carrier["sk_carrier"]),
                "sk_transport_mode": int(road_mode["sk_transport_mode"]),
                "distance_km": distance_km,
                "duration_hours": real_hours,
                "transport_cost_amount": transport_cost,
                "transport_cost_per_km": round((transport_cost / distance_km), 4) if distance_km > 0 else 0.0,
                "fill_rate": fill_rate,
                "fill_rate_band": _fill_rate_band(fill_rate),
                "co2_kg": co2,
            }
        )
        transport_id += 1

        breakdown_flag = 1 if rng.random() < 0.12 else 0
        maintenance_rows.append(
            {
                "fact_maintenance_id": maintenance_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_vehicle": int(vehicle["sk_vehicle"]),
                "maintenance_cost_amount": round(rng.uniform(650, 2600), 2) if breakdown_flag else round(rng.uniform(150, 980), 2),
                "immobilization_hours": round(rng.uniform(6, 24), 2) if breakdown_flag else round(rng.uniform(1, 8), 2),
                "breakdown_flag": breakdown_flag,
            }
        )
        maintenance_id += 1

        absence = 1 if rng.random() < 0.08 else 0
        present = 1 - absence
        worked_hours = round(rng.uniform(6, 11), 2) if present == 1 else 0.0
        late_flag = 1 if present == 1 and rng.random() < 0.15 else 0
        presence_rows.append(
            {
                "fact_presence_id": presence_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_driver": int(driver["sk_driver"]),
                "present_flag": present,
                "worked_hours": worked_hours,
                "absence_flag": absence,
                "late_flag": late_flag,
                "attendance_status": "Absent" if absence == 1 else ("Late" if late_flag == 1 else "On Time"),
            }
        )
        presence_id += 1

        incident_ref = rng.choice(dim_incident)
        sev_score = {"Low": 1.0, "Medium": 2.5, "High": 4.0}[incident_ref["severity_level"]]
        severity_band = incident_ref["severity_level"]
        accident_flag = 1 if incident_ref["incident_type"] == "Accident" else 0
        if severity_band == "High":
            incident_cost = round(rng.uniform(1800, 9000), 2)
            resolution_hours = round(rng.uniform(24, 120), 2)
        elif severity_band == "Medium":
            incident_cost = round(rng.uniform(500, 3200), 2)
            resolution_hours = round(rng.uniform(8, 72), 2)
        else:
            incident_cost = round(rng.uniform(90, 1100), 2)
            resolution_hours = round(rng.uniform(0.5, 24), 2)
        incident_rows.append(
            {
                "fact_incident_id": incident_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_incident": int(incident_ref["sk_incident"]),
                "sk_driver": int(driver["sk_driver"]),
                "sk_vehicle": int(vehicle["sk_vehicle"]),
                "sk_route": int(route["sk_route"]),
                "incident_cost_amount": incident_cost,
                "severity_score": sev_score,
                "severity_band": severity_band,
                "resolution_hours": resolution_hours,
                "accident_flag": accident_flag,
            }
        )
        incident_id += 1

        fuel_rows.append(
            {
                "fact_fuel_id": fuel_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_vehicle": int(vehicle["sk_vehicle"]),
                "liters": liters,
                "fuel_cost_amount": fuel_cost,
                "odometer_km": round(float(vehicle["odometer_km"] + distance_km), 2),
                "consumption_l_100km": float(vehicle["avg_consumption_l_100km"]),
            }
        )
        fuel_id += 1

        score = round(rng.uniform(2.4, 4.2), 1) if order_status == "Returned" else round(rng.uniform(2.8, 5.0), 1)
        satisfaction_band = _satisfaction_band(score)
        satisfaction_rows.append(
            {
                "fact_satisfaction_id": satisfaction_id,
                "sk_date": int(date_row["sk_date"]),
                "sk_client": int(client["sk_client"]),
                "sk_order": int(order["sk_order"]),
                "satisfaction_score": score,
                "satisfaction_band": satisfaction_band,
                "complaint_flag": 1 if score < 3.3 or order_status == "Returned" else 0,
                "nps_class": "Promoter" if score >= 4.5 else ("Passive" if score >= 3.5 else "Detractor"),
                "resolution_hours": round(rng.uniform(10, 120), 2) if order_status == "Returned" else round(rng.uniform(2, 96), 2),
            }
        )
        satisfaction_id += 1

    return {
        "fact_sales": sales_rows,
        "fact_purchase": purchase_rows,
        "fact_stock": stock_rows,
        "fact_delivery": delivery_rows,
        "fact_transport": transport_rows,
        "fact_maintenance": maintenance_rows,
        "fact_driver_presence": presence_rows,
        "fact_incident": incident_rows,
        "fact_fuel": fuel_rows,
        "fact_customer_satisfaction": satisfaction_rows,
    }


def write_csv(rows: List[dict], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        output_path.write_text("", encoding="utf-8")
        return

    fieldnames = list(rows[0].keys())
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def write_tables(tables: Dict[str, List[dict]], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, rows in tables.items():
        path = output_dir / f"{name}.csv"
        write_csv(rows, path)
        LOGGER.info("Wrote %s (%s rows)", path.name, len(rows))


def run_pipeline(base_dir: Path) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
    config_path = base_dir / "config" / "project_config.yaml"
    curated_dir = base_dir / "data" / "curated"

    config = load_config(config_path)
    session = _session()

    LOGGER.info("Building dimensions")
    city_geo = build_city_geo(config, session)

    dims: Dict[str, List[dict]] = {
        "dim_date": build_dim_date(config, session),
        "dim_client": build_dim_client(config, city_geo),
        "dim_supplier": build_dim_supplier(config),
        "dim_product": build_dim_product(config),
        "dim_vehicle": build_dim_vehicle(config),
        "dim_driver": build_dim_driver(config),
        "dim_warehouse": build_dim_warehouse(config),
        "dim_route": build_dim_route(config, city_geo, session),
        "dim_carrier": build_dim_carrier(config),
        "dim_employee": build_dim_employee(config),
        "dim_incident": build_dim_incident(),
        "dim_order": build_dim_order(),
        "dim_transport_mode": build_dim_transport_mode(),
    }

    LOGGER.info("Fetching diesel indicator from World Bank API")
    diesel_prices = diesel_price_by_country_year(config, session)
    if not diesel_prices:
        LOGGER.warning("World Bank diesel price was empty; fallback values will be used in fact_fuel")

    LOGGER.info("Building fact tables")
    facts = build_facts(config, dims, diesel_prices)

    all_tables = {**dims, **facts}
    write_tables(all_tables, curated_dir)


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    run_pipeline(repo_root)

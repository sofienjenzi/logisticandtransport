from __future__ import annotations

import csv
import json
import random
import zipfile
from collections import defaultdict
from datetime import datetime
from pathlib import Path


SEED = 20260721
FACT_ROWS = 2400


COUNTRY_PROFILE = {
    "FR": {"demand": 1.04, "service": 0.99, "cost": 1.03, "stock_risk": 0.09, "labor": 0.94},
    "DE": {"demand": 1.12, "service": 1.00, "cost": 1.08, "stock_risk": 0.06, "labor": 0.97},
    "ES": {"demand": 0.92, "service": 1.00, "cost": 0.95, "stock_risk": 0.13, "labor": 0.90},
}

CHANNEL_PROFILE = {
    "B2B": {"demand": 1.15, "margin": 0.95, "service": 0.92},
    "E-commerce": {"demand": 0.65, "margin": 1.18, "service": 0.86},
    "EDI": {"demand": 1.35, "margin": 0.88, "service": 0.94},
}

PRODUCT_PROFILE = {
    "Food": {"demand": 1.25, "margin": 0.72, "stock_risk": 0.12, "damage": 0.08},
    "FMCG": {"demand": 1.18, "margin": 0.85, "stock_risk": 0.09, "damage": 0.04},
    "NonFood": {"demand": 0.82, "margin": 1.22, "stock_risk": 0.06, "damage": 0.05},
}

CLIENT_SEGMENT_PROFILE = {
    "Key": {"demand": 1.45, "discount": 0.06, "service_expectation": 0.95},
    "Growth": {"demand": 1.05, "discount": 0.035, "service_expectation": 0.90},
    "Standard": {"demand": 0.72, "discount": 0.015, "service_expectation": 0.84},
}


def read_csv(path: Path) -> list[dict]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def write_csv(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def group(rows: list[dict], key: str) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        out[row[key]].append(row)
    return out


def index(rows: list[dict], key: str) -> dict[str, dict]:
    return {str(row[key]): row for row in rows}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(value, high))


def weighted_choice(rng: random.Random, rows: list[dict], weight_fn) -> dict:
    weights = [max(0.01, float(weight_fn(row))) for row in rows]
    return rng.choices(rows, weights=weights, k=1)[0]


def margin_band(rate: float) -> str:
    if rate < 0:
        return "Loss"
    if rate < 0.10:
        return "Low"
    if rate < 0.22:
        return "Medium"
    return "High"


def delay_category(delay_minutes: float) -> str:
    if delay_minutes <= 15:
        return "On Time"
    if delay_minutes <= 45:
        return "Minor Delay"
    if delay_minutes <= 180:
        return "Moderate Delay"
    return "Severe Delay"


def fill_rate_band(fill_rate: float) -> str:
    if fill_rate < 0.68:
        return "Low"
    if fill_rate < 0.86:
        return "Medium"
    return "High"


def stock_status(stock_real: float, safety_stock: float) -> str:
    if stock_real <= 2:
        return "Out of Stock"
    if stock_real < safety_stock:
        return "Below Safety"
    if stock_real > safety_stock * 2.3:
        return "Overstock"
    return "Healthy"


def satisfaction_band(score: float) -> str:
    if score < 3.0:
        return "Poor"
    if score < 4.0:
        return "Average"
    if score < 4.5:
        return "Good"
    return "Excellent"


def build_realistic_facts(base_dir: Path) -> None:
    rng = random.Random(SEED)
    curated = base_dir / "data" / "curated"

    dims = {
        name: read_csv(curated / f"{name}.csv")
        for name in [
            "dim_date",
            "dim_client",
            "dim_supplier",
            "dim_product",
            "dim_order",
            "dim_driver",
            "dim_vehicle",
            "dim_route",
            "dim_carrier",
            "dim_transport_mode",
            "dim_warehouse",
            "dim_incident",
        ]
    }

    dates_by_country = group(dims["dim_date"], "country_code")
    clients_by_country = group(dims["dim_client"], "country_code")
    suppliers_by_country = group(dims["dim_supplier"], "country_code")
    drivers_by_country = group(dims["dim_driver"], "country_code")
    routes_by_country = group(dims["dim_route"], "country_code")
    warehouses_by_country = group(dims["dim_warehouse"], "country_code")

    vehicles_by_country = defaultdict(list)
    carriers_by_country = defaultdict(list)
    for vehicle in dims["dim_vehicle"]:
        vehicles_by_country[vehicle["vehicle_id"].split("-")[1]].append(vehicle)
    for carrier in dims["dim_carrier"]:
        carriers_by_country[carrier["carrier_code"].split("-")[1]].append(carrier)

    modes_by_name = {m["transport_mode"]: m for m in dims["dim_transport_mode"]}
    incidents_by_type = {i["incident_type"]: i for i in dims["dim_incident"]}
    valid_orders = [o for o in dims["dim_order"] if o["order_status"] != "Cancelled"]
    sampled_orders = rng.sample(valid_orders, FACT_ROWS)

    sales_rows: list[dict] = []
    purchase_rows: list[dict] = []
    stock_rows: list[dict] = []
    delivery_rows: list[dict] = []
    transport_rows: list[dict] = []
    maintenance_rows: list[dict] = []
    presence_rows: list[dict] = []
    incident_rows: list[dict] = []
    fuel_rows: list[dict] = []
    satisfaction_rows: list[dict] = []

    countries = ["FR", "DE", "ES"]
    country_weights = [1.05, 1.18, 0.92]

    for i, order in enumerate(sampled_orders, start=1):
        country = rng.choices(countries, weights=country_weights, k=1)[0]
        cprof = COUNTRY_PROFILE[country]

        date_row = weighted_choice(
            rng,
            dates_by_country[country],
            lambda d: 1.25 if d["month_num"] in {"9", "10", "11"} else (1.12 if d["month_num"] in {"3", "4", "5"} else 0.92),
        )
        month = int(date_row["month_num"])
        year = int(date_row["year_num"])

        client = weighted_choice(
            rng,
            clients_by_country[country],
            lambda c: CLIENT_SEGMENT_PROFILE.get(c["segment"], CLIENT_SEGMENT_PROFILE["Standard"])["demand"],
        )
        product = weighted_choice(
            rng,
            dims["dim_product"],
            lambda p: PRODUCT_PROFILE.get(p["category"], PRODUCT_PROFILE["NonFood"])["demand"],
        )
        supplier = weighted_choice(
            rng,
            suppliers_by_country[country],
            lambda s: float(s["reliability_score"]),
        )
        route = weighted_choice(
            rng,
            routes_by_country[country],
            lambda r: 1.35 if r["difficulty_level"] == "Medium" else (1.1 if r["difficulty_level"] == "High" else 0.85),
        )
        vehicle = weighted_choice(
            rng,
            vehicles_by_country[country],
            lambda v: float(v["capacity_weight_kg"]) / 1000,
        )
        carrier = weighted_choice(
            rng,
            carriers_by_country[country],
            lambda c: float(c["performance_score"]),
        )
        driver = weighted_choice(
            rng,
            drivers_by_country[country],
            lambda d: 0.75 + float(d["experience_years"]) / 20,
        )
        warehouse = rng.choice(warehouses_by_country[country])

        category = product["category"]
        pprof = PRODUCT_PROFILE.get(category, PRODUCT_PROFILE["NonFood"])
        segment_prof = CLIENT_SEGMENT_PROFILE.get(client["segment"], CLIENT_SEGMENT_PROFILE["Standard"])
        channel_prof = CHANNEL_PROFILE.get(order["sales_channel"], CHANNEL_PROFILE["B2B"])

        seasonal = 1.18 if month in (9, 10, 11) else (1.10 if month in (3, 4, 5) else 0.94)
        base_qty = {
            "Food": rng.triangular(12, 95, 42),
            "FMCG": rng.triangular(10, 78, 35),
            "NonFood": rng.triangular(3, 38, 12),
        }.get(category, rng.triangular(5, 55, 20))
        qty = max(1, round(base_qty * cprof["demand"] * segment_prof["demand"] * channel_prof["demand"] * seasonal, 0))

        purchase_unit = float(product["purchase_price"]) * rng.uniform(0.96, 1.08)
        desired_margin = rng.triangular(0.04, 0.38, 0.18) * pprof["margin"] * channel_prof["margin"]
        desired_margin = clamp(desired_margin, -0.04, 0.42)
        list_price = purchase_unit / max(0.58, 1 - desired_margin)
        discount_rate = clamp(rng.gauss(segment_prof["discount"], 0.018), 0.0, 0.14)
        if order["order_status"] == "Returned":
            discount_rate += rng.uniform(0.03, 0.08)
        revenue_before_discount = qty * list_price
        discount = round(revenue_before_discount * discount_rate, 2)
        revenue = round(revenue_before_discount - discount, 2)
        purchase_amount = round(qty * purchase_unit, 2)
        extra_cost = round(revenue * rng.choice([0, 0, 0, rng.uniform(0.01, 0.05)]), 2)
        cost_amount = round(purchase_amount + extra_cost, 2)
        margin = round(revenue - cost_amount, 2)
        margin_rate = round(margin / revenue, 4) if revenue else 0

        reliability = float(supplier["on_time_delivery_rate"])
        planned_delay_days = {
            "Food": rng.triangular(1.0, 4.5, 2.0),
            "FMCG": rng.triangular(2.0, 7.0, 3.2),
            "NonFood": rng.triangular(4.0, 14.0, 7.5),
        }.get(category, rng.triangular(2, 9, 4))
        supplier_delay_risk = (1 - reliability) * 8
        real_delay_days = max(0.3, planned_delay_days + rng.gauss(supplier_delay_risk - 0.55, 1.1))
        if supplier["status"] != "Active":
            real_delay_days += rng.uniform(1, 3)

        planned_hours = float(route["planned_time_hours"]) * rng.uniform(0.95, 1.12)
        route_risk = {"Low": 0.90, "Medium": 1.04, "High": 1.22}[route["difficulty_level"]]
        driver_factor = 1 - min(float(driver["experience_years"]), 20) * 0.006
        carrier_factor = 1 + (90 - float(carrier["performance_score"])) / 180
        fragile_factor = 1.12 if product["is_fragile"] == "1" else 1.0
        service_expected = segment_prof["service_expectation"] * channel_prof["service"] * cprof["service"]
        delay_factor = rng.gauss(1.0, 0.18) * route_risk * carrier_factor * driver_factor * fragile_factor
        real_hours = max(planned_hours * 0.78, planned_hours * delay_factor)
        if order["order_status"] == "In Transit":
            real_hours *= rng.uniform(1.08, 1.42)
        elif order["order_status"] == "Returned":
            real_hours *= rng.uniform(1.15, 1.55)
        raw_delay_minutes = round((real_hours - planned_hours) * 60, 2)
        on_time_probability = service_expected - max(raw_delay_minutes, 0) / 520
        if raw_delay_minutes <= 15:
            on_time_probability += 0.16
        elif raw_delay_minutes <= 45:
            on_time_probability += 0.08
        elif raw_delay_minutes > 180:
            on_time_probability -= 0.20
        on_time = 1 if rng.random() < clamp(on_time_probability, 0.04, 0.98) else 0
        delay_minutes = max(0, raw_delay_minutes)

        service_rate = clamp(service_expected - max(delay_minutes, 0) / 900 + rng.gauss(0, 0.035), 0.45, 0.995)

        distance_km = float(route["distance_km"])
        mode_name = "Road"
        if distance_km > 650 and rng.random() < 0.22:
            mode_name = "Rail"
        if order["priority_level"] == "Critical" and category == "NonFood" and rng.random() < 0.18:
            mode_name = "Air"
        if country == "ES" and distance_km > 700 and rng.random() < 0.06:
            mode_name = "Maritime"
        mode = modes_by_name[mode_name]

        mode_factor = {"Road": 1.0, "Rail": 0.72, "Air": 3.2, "Maritime": 0.55}[mode_name]
        carrier_cost = float(carrier["cost_per_km"]) * distance_km * cprof["cost"] * mode_factor
        vehicle_consumption = float(vehicle["avg_consumption_l_100km"]) * rng.uniform(0.92, 1.14)
        liters = round(distance_km * vehicle_consumption / 100, 2)
        fuel_price = {"FR": 1.72, "DE": 1.78, "ES": 1.58}[country] * (1 + (year - 2024) * 0.035)
        fuel_cost = round(liters * fuel_price * (0.35 if mode_name in {"Rail", "Maritime"} else (0.15 if mode_name == "Air" else 1.0)), 2)
        handling = rng.uniform(45, 260) * (1.8 if mode_name == "Air" else 1.0)
        transport_cost = round(carrier_cost + fuel_cost + handling, 2)
        fill_rate = clamp(rng.triangular(0.42, 0.98, 0.78) + (0.08 if order["sales_channel"] == "EDI" else 0) - (0.12 if mode_name == "Air" else 0), 0.35, 0.99)
        co2_factor = {"Road": 2.64, "Rail": 0.85, "Air": 7.8, "Maritime": 0.45}[mode_name]
        co2 = round(liters * co2_factor, 2)

        safety_stock = round(rng.triangular(60, 260, 130) * pprof["stock_risk"] * 7.5, 0)
        target_stock = safety_stock * rng.triangular(0.4, 3.4, 1.55)
        if rng.random() < (cprof["stock_risk"] + pprof["stock_risk"]) * 0.58:
            target_stock *= rng.uniform(0.0, 0.85)
        if month in (9, 10, 11) and category in {"Food", "FMCG"}:
            target_stock *= rng.uniform(0.65, 1.1)
        stock_theoretical = round(max(25, safety_stock * rng.uniform(1.2, 2.9)), 0)
        stock_real = round(max(0, target_stock + rng.gauss(0, safety_stock * 0.20)), 2)
        stock_value = round(stock_real * purchase_unit, 2)
        stockout = 1 if stock_real < safety_stock else 0

        vehicle_age = 2026 - int(vehicle["model_year"])
        breakdown_probability = clamp(0.025 + vehicle_age * 0.012 + (float(vehicle["odometer_km"]) / 300000) * 0.06, 0.03, 0.22)
        breakdown = 1 if rng.random() < breakdown_probability else 0
        maintenance_cost = rng.triangular(180, 1400, 520) + vehicle_age * 65
        immobilization = rng.triangular(1, 12, 3.5)
        if breakdown:
            maintenance_cost += rng.triangular(1200, 8500, 2600)
            immobilization += rng.triangular(10, 96, 28)

        absence_prob = clamp(0.04 + (1 - cprof["labor"]) * 0.18 + (0.025 if month in (7, 8, 12) else 0), 0.03, 0.16)
        absence = 1 if rng.random() < absence_prob else 0
        present = 1 - absence
        late_probability = clamp(0.07 + (1 - cprof["labor"]) * 0.25 + (0.04 if route["difficulty_level"] == "High" else 0), 0.04, 0.26)
        late = 1 if present and rng.random() < late_probability else 0
        worked_hours = 0.0 if absence else round(rng.triangular(6.0, 10.8, 8.2), 2)

        incident_type_weights = {
            "Delay": max(0.10, max(delay_minutes, 0) / 140),
            "Accident": 0.035 + (0.045 if route["difficulty_level"] == "High" else 0),
            "Breakdown": 0.05 + (0.22 if breakdown else 0),
            "Damaged Goods": pprof["damage"] + (0.04 if product["is_fragile"] == "1" else 0),
            "Documentation": 0.055 + (0.03 if order["sales_channel"] == "EDI" else 0),
        }
        incident_type = rng.choices(list(incident_type_weights), weights=list(incident_type_weights.values()), k=1)[0]
        incident_ref = incidents_by_type[incident_type]
        severity_base = {"Low": 1.0, "Medium": 2.4, "High": 4.1}[incident_ref["severity_level"]]
        if incident_type == "Delay" and delay_minutes > 180:
            severity_band = "High"
            severity_score = rng.uniform(3.5, 4.8)
        elif incident_type == "Breakdown" and breakdown:
            severity_band = "Medium" if rng.random() < 0.72 else "High"
            severity_score = rng.uniform(2.5, 4.5)
        else:
            severity_band = incident_ref["severity_level"]
            severity_score = rng.uniform(max(0.5, severity_base - 0.4), min(5.0, severity_base + 0.5))
        incident_cost = {
            "Low": rng.triangular(80, 1400, 300),
            "Medium": rng.triangular(500, 5500, 1700),
            "High": rng.triangular(2500, 22000, 7200),
        }[severity_band]
        resolution_hours = {
            "Low": rng.triangular(1, 36, 8),
            "Medium": rng.triangular(8, 96, 32),
            "High": rng.triangular(24, 240, 86),
        }[severity_band]

        score = 4.55
        score -= max(delay_minutes, 0) / 260
        score -= 0.45 if stockout else 0
        score -= 0.55 if incident_type in {"Damaged Goods", "Accident"} else 0
        score -= 0.35 if order["order_status"] == "Returned" else 0
        score += 0.18 if client["loyalty_level"] == "Gold" else 0
        score += rng.gauss(0, 0.32)
        score = round(clamp(score, 1.4, 5.0), 1)
        complaint = 1 if score < 3.2 or incident_type in {"Damaged Goods", "Accident"} or order["order_status"] == "Returned" else 0

        sales_rows.append({
            "fact_sales_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_client": int(client["sk_client"]),
            "sk_product": int(product["sk_product"]),
            "sk_order": int(order["sk_order"]),
            "quantity_units": qty,
            "unit_sale_price": round(list_price, 2),
            "revenue_amount": revenue,
            "cost_amount": cost_amount,
            "margin_amount": margin,
            "margin_rate": margin_rate,
            "margin_band": margin_band(margin_rate),
            "discount_amount": discount,
        })
        purchase_rows.append({
            "fact_purchase_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_supplier": int(supplier["sk_supplier"]),
            "sk_product": int(product["sk_product"]),
            "sk_order": int(order["sk_order"]),
            "quantity_units": qty,
            "purchase_unit_price": round(purchase_unit, 2),
            "purchase_amount": purchase_amount,
            "planned_delay_days": round(planned_delay_days, 2),
            "real_delay_days": round(real_delay_days, 2),
            "delay_gap_days": round(real_delay_days - planned_delay_days, 2),
        })
        stock_rows.append({
            "fact_stock_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_product": int(product["sk_product"]),
            "sk_warehouse": int(warehouse["sk_warehouse"]),
            "stock_theoretical": stock_theoretical,
            "stock_real": stock_real,
            "stock_value_amount": stock_value,
            "safety_stock": safety_stock,
            "stockout_flag": stockout,
            "stock_status": stock_status(stock_real, safety_stock),
        })
        delivery_rows.append({
            "fact_delivery_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_order": int(order["sk_order"]),
            "sk_driver": int(driver["sk_driver"]),
            "sk_vehicle": int(vehicle["sk_vehicle"]),
            "sk_route": int(route["sk_route"]),
            "sk_client": int(client["sk_client"]),
            "planned_delay_hours": round(planned_hours, 2),
            "real_delay_hours": round(real_hours, 2),
            "delay_minutes": delay_minutes,
            "delay_category": delay_category(delay_minutes),
            "delivered_on_time_flag": on_time,
            "service_rate": round(service_rate, 3),
        })
        transport_rows.append({
            "fact_transport_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_route": int(route["sk_route"]),
            "sk_vehicle": int(vehicle["sk_vehicle"]),
            "sk_driver": int(driver["sk_driver"]),
            "sk_carrier": int(carrier["sk_carrier"]),
            "sk_transport_mode": int(mode["sk_transport_mode"]),
            "distance_km": distance_km,
            "duration_hours": round(real_hours, 2),
            "transport_cost_amount": transport_cost,
            "transport_cost_per_km": round(transport_cost / distance_km, 4),
            "fill_rate": round(fill_rate, 3),
            "fill_rate_band": fill_rate_band(fill_rate),
            "co2_kg": co2,
        })
        maintenance_rows.append({
            "fact_maintenance_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_vehicle": int(vehicle["sk_vehicle"]),
            "maintenance_cost_amount": round(maintenance_cost, 2),
            "immobilization_hours": round(immobilization, 2),
            "breakdown_flag": breakdown,
        })
        presence_rows.append({
            "fact_presence_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_driver": int(driver["sk_driver"]),
            "present_flag": present,
            "worked_hours": worked_hours,
            "absence_flag": absence,
            "late_flag": late,
            "attendance_status": "Absent" if absence else ("Late" if late else "On Time"),
        })
        incident_rows.append({
            "fact_incident_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_incident": int(incident_ref["sk_incident"]),
            "sk_driver": int(driver["sk_driver"]),
            "sk_vehicle": int(vehicle["sk_vehicle"]),
            "sk_route": int(route["sk_route"]),
            "incident_cost_amount": round(incident_cost, 2),
            "severity_score": round(severity_score, 2),
            "severity_band": severity_band,
            "resolution_hours": round(resolution_hours, 2),
            "accident_flag": 1 if incident_type == "Accident" else 0,
        })
        fuel_rows.append({
            "fact_fuel_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_vehicle": int(vehicle["sk_vehicle"]),
            "liters": liters,
            "fuel_cost_amount": fuel_cost,
            "odometer_km": round(float(vehicle["odometer_km"]) + distance_km * rng.uniform(0.9, 1.25), 2),
            "consumption_l_100km": round(vehicle_consumption, 2),
        })
        satisfaction_rows.append({
            "fact_satisfaction_id": i,
            "sk_date": int(date_row["sk_date"]),
            "sk_client": int(client["sk_client"]),
            "sk_order": int(order["sk_order"]),
            "satisfaction_score": score,
            "satisfaction_band": satisfaction_band(score),
            "complaint_flag": complaint,
            "nps_class": "Promoter" if score >= 4.5 else ("Passive" if score >= 3.5 else "Detractor"),
            "resolution_hours": round(rng.triangular(2, 144, 28) * (1.7 if complaint else 0.75), 2),
        })

    fact_tables = {
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

    for name, rows in fact_tables.items():
        write_csv(curated / f"{name}.csv", rows)

    report = {
        "seed": SEED,
        "rows_per_fact": FACT_ROWS,
        "business_logic": [
            "country demand/service/cost profiles",
            "product-specific margins, demand and stock risk",
            "client segment discounts and service expectations",
            "supplier reliability drives purchase delays",
            "route difficulty and carrier performance drive delivery delays",
            "vehicle age and odometer drive breakdown risk",
            "satisfaction depends on delivery delay, stockout, incidents and returns",
        ],
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
    (curated / "realistic_generation_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")

    zip_path = base_dir / "data" / "logistics_exports.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for csv_path in sorted(curated.glob("*.csv")):
            z.write(csv_path, arcname=csv_path.name)
        for json_path in sorted(curated.glob("*.json")):
            z.write(json_path, arcname=json_path.name)

    print(f"Regenerated facts and ZIP: {zip_path}")


if __name__ == "__main__":
    build_realistic_facts(Path(__file__).resolve().parents[2])

from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Dict, List


def read_csv(path: Path) -> List[dict]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def table_profile(rows: List[dict]) -> dict:
    if not rows:
        return {"rows": 0, "columns": 0, "null_cells": 0}

    null_cells = 0
    for row in rows:
        for value in row.values():
            if value is None or value == "":
                null_cells += 1

    return {
        "rows": len(rows),
        "columns": len(rows[0].keys()),
        "null_cells": null_cells,
    }


def audit_relationships(base: Path) -> Dict[str, int]:
    dims = {
        "dim_date": "sk_date",
        "dim_client": "sk_client",
        "dim_supplier": "sk_supplier",
        "dim_product": "sk_product",
        "dim_vehicle": "sk_vehicle",
        "dim_driver": "sk_driver",
        "dim_warehouse": "sk_warehouse",
        "dim_route": "sk_route",
        "dim_carrier": "sk_carrier",
        "dim_incident": "sk_incident",
        "dim_order": "sk_order",
        "dim_transport_mode": "sk_transport_mode",
    }

    dim_keys: Dict[str, set[str]] = {}
    for dim, key in dims.items():
        rows = read_csv(base / f"{dim}.csv")
        dim_keys[dim] = {row[key] for row in rows}

    checks = [
        ("fact_sales", "sk_date", "dim_date"),
        ("fact_sales", "sk_client", "dim_client"),
        ("fact_sales", "sk_product", "dim_product"),
        ("fact_sales", "sk_order", "dim_order"),
        ("fact_purchase", "sk_supplier", "dim_supplier"),
        ("fact_delivery", "sk_driver", "dim_driver"),
        ("fact_delivery", "sk_vehicle", "dim_vehicle"),
        ("fact_delivery", "sk_route", "dim_route"),
        ("fact_transport", "sk_carrier", "dim_carrier"),
        ("fact_transport", "sk_transport_mode", "dim_transport_mode"),
        ("fact_stock", "sk_warehouse", "dim_warehouse"),
        ("fact_incident", "sk_incident", "dim_incident"),
    ]

    results: Dict[str, int] = {}
    for fact, col, dim in checks:
        rows = read_csv(base / f"{fact}.csv")
        missing = sum(1 for row in rows if row[col] not in dim_keys[dim])
        results[f"{fact}.{col}->{dim}"] = missing
    return results


def audit_business_rules(base: Path) -> Dict[str, int]:
    results: Dict[str, int] = {}

    sales = read_csv(base / "fact_sales.csv")
    bad_margin = 0
    for row in sales:
        rev = round(float(row["revenue_amount"]), 2)
        cost = round(float(row["cost_amount"]), 2)
        margin = round(float(row["margin_amount"]), 2)
        if round(rev - cost, 2) != margin:
            bad_margin += 1
    results["fact_sales.margin_consistency_errors"] = bad_margin

    presence = read_csv(base / "fact_driver_presence.csv")
    bad_presence = 0
    for row in presence:
        present = int(row["present_flag"])
        absence = int(row["absence_flag"])
        worked = float(row["worked_hours"])
        if present + absence != 1:
            bad_presence += 1
        if absence == 1 and worked != 0.0:
            bad_presence += 1
    results["fact_driver_presence.consistency_errors"] = bad_presence

    delivery = read_csv(base / "fact_delivery.csv")
    negative_delay = sum(1 for row in delivery if float(row["delay_minutes"]) < 0)
    results["fact_delivery.negative_delay_errors"] = negative_delay

    stock = read_csv(base / "fact_stock.csv")
    stock_mismatch = 0
    for row in stock:
        stock_real = float(row["stock_real"])
        safety = float(row["safety_stock"])
        flag = int(row["stockout_flag"])
        expected = 1 if stock_real < safety else 0
        if flag != expected:
            stock_mismatch += 1
    results["fact_stock.stockout_flag_errors"] = stock_mismatch

    return results


def run(base_dir: Path) -> None:
    curated = base_dir / "data" / "curated"
    report_path = curated / "quality_report.json"

    profiles = {}
    for csv_path in sorted(curated.glob("*.csv")):
        if csv_path.name == "quality_report.json":
            continue
        profiles[csv_path.stem] = table_profile(read_csv(csv_path))

    report = {
        "profiles": profiles,
        "relationships": audit_relationships(curated),
        "business_rules": audit_business_rules(curated),
    }

    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Quality report written: {report_path}")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    run(root)

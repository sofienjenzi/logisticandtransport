from __future__ import annotations

import sqlite3
from pathlib import Path
import csv


def apply_schema(connection: sqlite3.Connection, schema_path: Path) -> None:
    schema_sql = schema_path.read_text(encoding="utf-8")
    connection.executescript(schema_sql)


def load_csv_folder_to_sqlite(curated_dir: Path, db_path: Path, schema_path: Path) -> None:
    connection = sqlite3.connect(db_path)
    try:
        apply_schema(connection, schema_path)

        csv_files = sorted(curated_dir.glob("*.csv"))
        for csv_file in csv_files:
            table_name = csv_file.stem
            with csv_file.open("r", encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(handle)
                rows = list(reader)

            if not rows:
                print(f"Skipped {table_name} (0 rows)")
                continue

            columns = list(rows[0].keys())
            connection.execute(f"DELETE FROM {table_name}")
            placeholders = ", ".join(["?" for _ in columns])
            col_clause = ", ".join(columns)
            insert_sql = f"INSERT INTO {table_name} ({col_clause}) VALUES ({placeholders})"

            data = [tuple(row[col] for col in columns) for row in rows]
            connection.executemany(insert_sql, data)
            print(f"Loaded {table_name} ({len(rows)} rows)")

        connection.commit()
    finally:
        connection.close()


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    curated = root / "data" / "curated"
    schema = root / "sql" / "schema.sql"
    db = root / "data" / "logistics_dw.sqlite"
    load_csv_folder_to_sqlite(curated, db, schema)

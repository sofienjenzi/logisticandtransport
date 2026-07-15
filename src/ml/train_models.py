from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score, roc_auc_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_predict, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from xgboost import XGBClassifier, XGBRegressor

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data" / "curated"
ML_DIR = ROOT / "data" / "ml"
ML_DIR.mkdir(parents=True, exist_ok=True)


REQUESTED_FIELDS = {
    "delivery": [
        "distance",
        "type_vehicule",
        "poids",
        "volume",
        "region",
        "conducteur",
        "trafic",
        "meteo",
        "heure_depart",
        "jour_semaine",
        "type_client",
        "priorite",
    ],
    "client": ["nombre_commandes", "chiffre_affaires", "paiement", "retours", "reclamations"],
    "maintenance": [
        "kilometrage",
        "age",
        "nombre_reparations",
        "temperature_moteur",
        "pression_pneus",
        "consommation",
        "vibrations",
    ],
    "fuel": [
        "distance_parcourue",
        "type_vehicule",
        "capacite_charge",
        "annee_vehicule",
        "region",
        "carburant",
        "nb_reparations",
        "conso_moyenne_constructeur",
        "saison",
    ],
    "transport_cost": [
        "distance",
        "duree",
        "mode_transport",
        "type_vehicule",
        "transporteur",
        "cout_km_transporteur",
        "taux_remplissage",
        "peages",
        "difficulte_route",
        "zone",
    ],
}


def build_preprocessor(num_features: List[str], cat_features: List[str]) -> ColumnTransformer:
    num_pipe = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]
    )
    cat_pipe = Pipeline(
        steps=[("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]
    )
    return ColumnTransformer(
        transformers=[("num", num_pipe, num_features), ("cat", cat_pipe, cat_features)],
        remainder="drop",
    )


def read_csv(name: str) -> pd.DataFrame:
    return pd.read_csv(DATA_DIR / name)


def save_bundle(name: str, pipeline: Pipeline, features: List[str], metadata: Dict) -> None:
    joblib.dump({"pipeline": pipeline, "features": features, "metadata": metadata}, ML_DIR / f"{name}.joblib")


def qcut_safe(series: pd.Series, labels: List[str]) -> pd.Series:
    ranked = series.rank(method="first")
    bins = min(len(labels), ranked.nunique())
    out_labels = labels[:bins]
    return pd.qcut(ranked, q=bins, labels=out_labels, duplicates="drop")


def build_delivery_dataset() -> Tuple[pd.DataFrame, List[str], List[str], List[str]]:
    fact_delivery = read_csv("fact_delivery.csv")
    dim_route = read_csv("dim_route.csv")
    dim_vehicle = read_csv("dim_vehicle.csv")
    dim_driver = read_csv("dim_driver.csv")
    dim_client = read_csv("dim_client.csv")
    dim_order = read_csv("dim_order.csv")
    dim_date = read_csv("dim_date.csv")
    fact_sales = read_csv("fact_sales.csv")
    dim_product = read_csv("dim_product.csv")

    sales = fact_sales.merge(dim_product[["sk_product", "weight_kg", "volume_m3"]], on="sk_product", how="left")
    sales["weight_kg"] = sales["weight_kg"].fillna(0)
    sales["volume_m3"] = sales["volume_m3"].fillna(0)
    sales["quantity_units"] = sales["quantity_units"].fillna(0)
    order_loads = (
        sales.assign(
            total_weight_kg=sales["quantity_units"] * sales["weight_kg"],
            total_volume_m3=sales["quantity_units"] * sales["volume_m3"],
        )
        .groupby("sk_order", as_index=False)
        .agg(
            total_weight_kg=("total_weight_kg", "sum"),
            total_volume_m3=("total_volume_m3", "sum"),
            total_quantity_units=("quantity_units", "sum"),
        )
    )

    df = (
        fact_delivery.merge(dim_route, on="sk_route", how="left", suffixes=("", "_route"))
        .merge(dim_vehicle, on="sk_vehicle", how="left", suffixes=("", "_vehicle"))
        .merge(dim_driver, on="sk_driver", how="left", suffixes=("", "_driver"))
        .merge(dim_client, on="sk_client", how="left", suffixes=("", "_client"))
        .merge(dim_order, on="sk_order", how="left", suffixes=("", "_order"))
        .merge(dim_date[["sk_date", "day_name", "month_num", "is_weekend", "year_num"]], on="sk_date", how="left")
        .merge(order_loads, on="sk_order", how="left")
    )

    df["actual_delivery_hours"] = df["planned_time_hours"].fillna(0) + df["real_delay_hours"].clip(lower=0)

    feature_map = {
        "distance_km": df["distance_km"],
        "vehicle_type": df["vehicle_type"],
        "total_weight_kg": df["total_weight_kg"],
        "total_volume_m3": df["total_volume_m3"],
        "region": df["region"],
        "driver_code": df["driver_code"],
        "experience_years": df["experience_years"],
        "day_name": df["day_name"],
        "month_num": df["month_num"],
        "is_weekend": df["is_weekend"],
        "client_type": df["client_type"],
        "priority_level": df["priority_level"],
        "difficulty_level": df["difficulty_level"],
        "zone_type": df["zone_type"],
        "planned_time_hours": df["planned_time_hours"],
    }
    data = pd.DataFrame(feature_map)
    data["target"] = df["actual_delivery_hours"]
    data = data.dropna(subset=["target"])

    num_features = [
        "distance_km",
        "total_weight_kg",
        "total_volume_m3",
        "experience_years",
        "month_num",
        "is_weekend",
        "planned_time_hours",
    ]
    cat_features = [
        "vehicle_type",
        "region",
        "driver_code",
        "day_name",
        "client_type",
        "priority_level",
        "difficulty_level",
        "zone_type",
    ]
    supported = [
        "distance",
        "type_vehicule",
        "poids",
        "volume",
        "region",
        "conducteur",
        "jour_semaine",
        "type_client",
        "priorite",
    ]
    return data, num_features, cat_features, supported


def build_client_dataset() -> Tuple[pd.DataFrame, List[str], List[str], List[str]]:
    dim_client = read_csv("dim_client.csv")
    fact_sales = read_csv("fact_sales.csv")
    fact_satisfaction = read_csv("fact_customer_satisfaction.csv")

    sales_agg = fact_sales.groupby("sk_client", as_index=False).agg(
        nombre_commandes=("sk_order", pd.Series.nunique),
        chiffre_affaires=("revenue_amount", "sum"),
        marge_moyenne=("margin_rate", "mean"),
        remise_totale=("discount_amount", "sum"),
    )
    sat_agg = fact_satisfaction.groupby("sk_client", as_index=False).agg(
        reclamations=("complaint_flag", "sum"),
        satisfaction_moyenne=("satisfaction_score", "mean"),
        resolution_moyenne_h=("resolution_hours", "mean"),
    )

    df = dim_client.merge(sales_agg, on="sk_client", how="left").merge(sat_agg, on="sk_client", how="left")
    for col in [
        "nombre_commandes",
        "chiffre_affaires",
        "marge_moyenne",
        "remise_totale",
        "reclamations",
        "satisfaction_moyenne",
        "resolution_moyenne_h",
    ]:
        df[col] = df[col].fillna(0)

    orders_q1 = df["nombre_commandes"].quantile(0.25)
    orders_med = df["nombre_commandes"].median()
    revenue_q1 = df["chiffre_affaires"].quantile(0.25)
    revenue_q3 = df["chiffre_affaires"].quantile(0.75)
    complaints_q3 = df["reclamations"].quantile(0.75)
    sat_q1 = df["satisfaction_moyenne"].quantile(0.25)
    sat_med = df["satisfaction_moyenne"].median()

    def assign_segment(row: pd.Series) -> str:
        if (
            row["chiffre_affaires"] >= revenue_q3
            and row["nombre_commandes"] >= orders_med
            and row["satisfaction_moyenne"] >= sat_med
        ):
            return "VIP"
        if row["reclamations"] >= complaints_q3 and row["satisfaction_moyenne"] <= sat_med:
            return "Risque"
        if row["nombre_commandes"] <= orders_q1 and row["chiffre_affaires"] <= revenue_q1:
            return "Occasionnel"
        return "Normal"

    df["target_label"] = df.apply(assign_segment, axis=1)

    feature_cols = {
        "nombre_commandes": df["nombre_commandes"],
        "chiffre_affaires": df["chiffre_affaires"],
        "reclamations": df["reclamations"],
        "satisfaction_moyenne": df["satisfaction_moyenne"],
        "resolution_moyenne_h": df["resolution_moyenne_h"],
        "credit_score": df["credit_score"],
        "credit_limit": df["credit_limit"],
        "loyalty_level": df["loyalty_level"],
        "client_type": df["client_type"],
        "region": df["region"],
        "sector_activity": df["sector_activity"],
    }
    data = pd.DataFrame(feature_cols)
    data["target"] = df["target_label"]

    num_features = [
        "nombre_commandes",
        "chiffre_affaires",
        "reclamations",
        "satisfaction_moyenne",
        "resolution_moyenne_h",
        "credit_score",
        "credit_limit",
    ]
    cat_features = ["loyalty_level", "client_type", "region", "sector_activity"]
    supported = ["nombre_commandes", "chiffre_affaires", "reclamations"]
    return data, num_features, cat_features, supported


def build_maintenance_dataset() -> Tuple[pd.DataFrame, List[str], List[str], List[str]]:
    fact_maintenance = read_csv("fact_maintenance.csv")
    dim_vehicle = read_csv("dim_vehicle.csv")
    dim_date = read_csv("dim_date.csv")
    fact_fuel = read_csv("fact_fuel.csv")

    maint = fact_maintenance.merge(dim_date[["sk_date", "full_date", "year_num"]], on="sk_date", how="left")
    maint["full_date"] = pd.to_datetime(maint["full_date"])

    fuel = fact_fuel.merge(dim_date[["sk_date", "full_date"]], on="sk_date", how="left")
    fuel["full_date"] = pd.to_datetime(fuel["full_date"])
    fuel["sk_vehicle"] = fuel["sk_vehicle"].astype(int)
    maint["sk_vehicle"] = maint["sk_vehicle"].astype(int)
    fuel = fuel.sort_values(["full_date", "sk_vehicle"]).reset_index(drop=True)
    maint = maint.sort_values(["full_date", "sk_vehicle"]).reset_index(drop=True)

    fuel = fuel.rename(
        columns={
            "odometer_km": "fuel_odometer_km",
            "consumption_l_100km": "fuel_consumption_l_100km",
        }
    )
    merged = pd.merge_asof(
        maint,
        fuel[["sk_vehicle", "full_date", "fuel_odometer_km", "fuel_consumption_l_100km"]],
        by="sk_vehicle",
        on="full_date",
        direction="backward",
    )

    df = merged.merge(dim_vehicle, on="sk_vehicle", how="left")
    df["vehicle_age_years"] = df["year_num"] - df["model_year"]
    df["repair_count_before"] = df.groupby("sk_vehicle").cumcount()
    df["fuel_odometer_km"] = df["fuel_odometer_km"].fillna(df["odometer_km"])
    df["fuel_consumption_l_100km"] = df["fuel_consumption_l_100km"].fillna(df["avg_consumption_l_100km"])

    feature_cols = {
        "kilometrage": df["fuel_odometer_km"],
        "age": df["vehicle_age_years"],
        "nombre_reparations": df["repair_count_before"],
        "consommation": df["fuel_consumption_l_100km"],
        "immobilization_hours": df["immobilization_hours"],
        "maintenance_cost_amount": df["maintenance_cost_amount"],
        "vehicle_type": df["vehicle_type"],
        "fuel_type": df["fuel_type"],
        "brand": df["brand"],
        "status": df["status"],
    }
    data = pd.DataFrame(feature_cols)
    data["target"] = df["breakdown_flag"].astype(int)

    num_features = [
        "kilometrage",
        "age",
        "nombre_reparations",
        "consommation",
        "immobilization_hours",
        "maintenance_cost_amount",
    ]
    cat_features = ["vehicle_type", "fuel_type", "brand", "status"]
    supported = ["kilometrage", "age", "nombre_reparations", "consommation"]
    return data, num_features, cat_features, supported


def evaluate_regression_extended(X: pd.DataFrame, y: pd.Series, num_features: List[str], cat_features: List[str]) -> Tuple[Pipeline, Dict]:
    """Régression étendue : RandomForest + XGBoost + LightGBM, métriques MAE/RMSE/R²."""
    candidates = {
        "RandomForestRegressor": RandomForestRegressor(n_estimators=220, max_depth=14, min_samples_leaf=2, random_state=42, n_jobs=-1),
        "XGBoostRegressor": XGBRegressor(n_estimators=260, max_depth=6, learning_rate=0.05, subsample=0.9, colsample_bytree=0.9, objective="reg:squarederror", random_state=42, n_jobs=4),
        "LGBMRegressor": LGBMRegressor(n_estimators=260, learning_rate=0.05, num_leaves=31, max_depth=-1, subsample=0.9, colsample_bytree=0.9, random_state=42, n_jobs=4),
    }
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    best_name, best_mae, best_pipeline = None, None, None
    for name, model in candidates.items():
        pipe = Pipeline(steps=[("prep", build_preprocessor(num_features, cat_features)), ("model", model)])
        preds = cross_val_predict(pipe, X, y, cv=cv, n_jobs=1)
        mae = float(mean_absolute_error(y, preds))
        rmse = float(np.sqrt(mean_squared_error(y, preds)))
        r2 = float(r2_score(y, preds))
        results[name] = {"mae_cv": round(mae, 4), "rmse_cv": round(rmse, 4), "r2_cv": round(r2, 4)}
        if best_mae is None or mae < best_mae:
            best_mae, best_name, best_pipeline = mae, name, pipe
    best_pipeline.fit(X, y)
    return best_pipeline, {"best_model": best_name, "leaderboard": results}


def evaluate_regression(X: pd.DataFrame, y: pd.Series, num_features: List[str], cat_features: List[str]) -> Tuple[Pipeline, Dict]:
    candidates = {
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=220, max_depth=14, min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "XGBoostRegressor": XGBRegressor(
            n_estimators=260,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="reg:squarederror",
            random_state=42,
            n_jobs=4,
        ),
    }
    cv = KFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    best_name = None
    best_mae = None
    best_pipeline = None

    for name, model in candidates.items():
        pipe = Pipeline(steps=[("prep", build_preprocessor(num_features, cat_features)), ("model", model)])
        scores = cross_validate(pipe, X, y, cv=cv, scoring={"mae": "neg_mean_absolute_error", "r2": "r2"}, n_jobs=1)
        mae = float(-scores["test_mae"].mean())
        r2 = float(scores["test_r2"].mean())
        results[name] = {"mae_cv": round(mae, 4), "r2_cv": round(r2, 4)}
        if best_mae is None or mae < best_mae:
            best_mae = mae
            best_name = name
            best_pipeline = pipe

    best_pipeline.fit(X, y)
    return best_pipeline, {"best_model": best_name, "leaderboard": results}


def evaluate_multiclass(X: pd.DataFrame, y: pd.Series, num_features: List[str], cat_features: List[str]) -> Tuple[Pipeline, Dict, LabelEncoder]:
    le = LabelEncoder()
    y_enc = le.fit_transform(y)
    class_counts = pd.Series(y_enc).value_counts()
    min_class = int(class_counts.min())
    folds = max(2, min(5, min_class))
    cv = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)

    candidates = {
        "DecisionTreeClassifier": DecisionTreeClassifier(max_depth=5, min_samples_leaf=2, random_state=42),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=240, max_depth=10, min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "XGBoostClassifier": XGBClassifier(
            n_estimators=240,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="multi:softprob",
            eval_metric="mlogloss",
            random_state=42,
            n_jobs=4,
        ),
    }

    results = {}
    best_name = None
    best_f1 = None
    best_pipeline = None

    for name, model in candidates.items():
        pipe = Pipeline(steps=[("prep", build_preprocessor(num_features, cat_features)), ("model", model)])
        scores = cross_validate(pipe, X, y_enc, cv=cv, scoring={"f1": "f1_macro", "acc": "accuracy"}, n_jobs=1)
        f1 = float(scores["test_f1"].mean())
        acc = float(scores["test_acc"].mean())
        results[name] = {"f1_macro_cv": round(f1, 4), "accuracy_cv": round(acc, 4)}
        if best_f1 is None or f1 > best_f1:
            best_f1 = f1
            best_name = name
            best_pipeline = pipe

    best_pipeline.fit(X, y_enc)
    return best_pipeline, {"best_model": best_name, "leaderboard": results, "labels": list(le.classes_)}, le


def evaluate_binary(X: pd.DataFrame, y: pd.Series, num_features: List[str], cat_features: List[str]) -> Tuple[Pipeline, Dict]:
    pos = int(y.sum())
    neg = int((1 - y).sum())
    scale_pos_weight = max(1.0, neg / max(pos, 1))

    candidates = {
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=260, max_depth=10, min_samples_leaf=2, random_state=42, n_jobs=-1, class_weight="balanced"
        ),
        "XGBoostClassifier": XGBClassifier(
            n_estimators=260,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            objective="binary:logistic",
            eval_metric="logloss",
            scale_pos_weight=scale_pos_weight,
            random_state=42,
            n_jobs=4,
        ),
        "LightGBMClassifier": LGBMClassifier(
            n_estimators=260,
            learning_rate=0.05,
            num_leaves=31,
            class_weight="balanced",
            random_state=42,
        ),
    }
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    results = {}
    best_name = None
    best_auc = None
    best_pipeline = None

    for name, model in candidates.items():
        pipe = Pipeline(steps=[("prep", build_preprocessor(num_features, cat_features)), ("model", model)])
        scores = cross_validate(pipe, X, y, cv=cv, scoring={"f1": "f1", "acc": "accuracy", "auc": "roc_auc"}, n_jobs=1)
        auc = float(scores["test_auc"].mean())
        f1 = float(scores["test_f1"].mean())
        acc = float(scores["test_acc"].mean())
        results[name] = {"roc_auc_cv": round(auc, 4), "f1_cv": round(f1, 4), "accuracy_cv": round(acc, 4)}
        if best_auc is None or auc > best_auc:
            best_auc = auc
            best_name = name
            best_pipeline = pipe

    best_pipeline.fit(X, y)
    return best_pipeline, {"best_model": best_name, "leaderboard": results}


def train_delivery() -> Dict:
    data, num_features, cat_features, supported = build_delivery_dataset()
    X = data[num_features + cat_features]
    y = data["target"]
    pipeline, metrics = evaluate_regression(X, y, num_features, cat_features)
    metadata = {
        "problem_type": "regression",
        "target": "actual_delivery_hours",
        "records": int(len(data)),
        "supported_fields": supported,
        "missing_requested_fields": [x for x in REQUESTED_FIELDS["delivery"] if x not in supported],
        **metrics,
    }
    save_bundle("delivery_delay_model", pipeline, num_features + cat_features, metadata)
    return metadata


def train_client() -> Dict:
    data, num_features, cat_features, supported = build_client_dataset()
    X = data[num_features + cat_features]
    y = data["target"]
    pipeline, metrics, encoder = evaluate_multiclass(X, y, num_features, cat_features)
    metadata = {
        "problem_type": "classification",
        "target": "client_segment",
        "records": int(len(data)),
        "supported_fields": supported,
        "missing_requested_fields": [x for x in REQUESTED_FIELDS["client"] if x not in supported],
        **metrics,
    }
    save_bundle("client_classification_model", pipeline, num_features + cat_features, metadata)
    joblib.dump({"classes": list(encoder.classes_)}, ML_DIR / "client_label_encoder.joblib")
    return metadata


def train_maintenance() -> Dict:
    data, num_features, cat_features, supported = build_maintenance_dataset()
    X = data[num_features + cat_features]
    y = data["target"]
    pipeline, metrics = evaluate_binary(X, y, num_features, cat_features)
    metadata = {
        "problem_type": "binary_classification",
        "target": "breakdown_flag",
        "records": int(len(data)),
        "supported_fields": supported,
        "missing_requested_fields": [x for x in REQUESTED_FIELDS["maintenance"] if x not in supported],
        **metrics,
    }
    save_bundle("maintenance_predictive_model", pipeline, num_features + cat_features, metadata)
    return metadata


def build_fuel_dataset() -> Tuple[pd.DataFrame, List[str], List[str], List[str]]:
    """Cible : fact_fuel.liters (consommation de carburant réelle)."""
    fact_fuel = read_csv("fact_fuel.csv")
    dim_vehicle = read_csv("dim_vehicle.csv")
    dim_route = read_csv("dim_route.csv")
    dim_date = read_csv("dim_date.csv")
    fact_transport = read_csv("fact_transport.csv")
    fact_maintenance = read_csv("fact_maintenance.csv")

    transport_day = (fact_transport.groupby(["sk_date", "sk_vehicle"], as_index=False).agg(distance_km=("distance_km", "sum")))
    maint_sorted = fact_maintenance.sort_values(["sk_vehicle", "sk_date"]).copy()
    maint_sorted["nb_reparations"] = maint_sorted.groupby("sk_vehicle").cumcount()

    df = (
        fact_fuel.merge(transport_day, on=["sk_date", "sk_vehicle"], how="left")
        .merge(dim_vehicle, on="sk_vehicle", how="left", suffixes=("", "_veh"))
        .merge(dim_route[["sk_route", "country_code", "region"]], on="sk_route", how="left")
        .merge(dim_date[["sk_date", "month_num", "is_weekend", "is_holiday", "year_num"]], on="sk_date", how="left")
        .merge(maint_sorted[["sk_date", "sk_vehicle", "nb_reparations"]], on=["sk_date", "sk_vehicle"], how="left")
    )

    df["distance_km"] = df["distance_km"].fillna(df["odometer_km"] / 100.0)
    df["nb_reparations"] = df["nb_reparations"].fillna(0)
    df["vehicle_age_years"] = df["year_num"].fillna(2024) - df["model_year"].fillna(2020)
    df["season"] = df["month_num"].map(
        {12: "Hiver", 1: "Hiver", 2: "Hiver", 3: "Printemps", 4: "Printemps", 5: "Printemps",
         6: "Ete", 7: "Ete", 8: "Ete", 9: "Automne", 10: "Automne", 11: "Automne"}
    )

    feature_cols = {
        "distance_km": df["distance_km"],
        "vehicle_type": df["vehicle_type"],
        "capacity_weight_kg": df["capacity_weight_kg"],
        "age": df["vehicle_age_years"],
        "region": df["region"],
        "fuel_type": df["fuel_type"],
        "nb_reparations": df["nb_reparations"],
        "avg_consumption_l_100km": df["avg_consumption_l_100km"],
        "season": df["season"],
    }
    data = pd.DataFrame(feature_cols)
    data["target"] = df["liters"].astype(float)
    data = data.dropna(subset=["target"])

    num_features = ["distance_km", "capacity_weight_kg", "age", "nb_reparations", "avg_consumption_l_100km"]
    cat_features = ["vehicle_type", "region", "fuel_type", "season"]
    supported = [
        "distance_parcourue", "type_vehicule", "capacite_charge",
        "annee_vehicule", "region", "carburant",
        "nb_reparations", "conso_moyenne_constructeur", "saison",
    ]
    return data, num_features, cat_features, supported


def build_transport_cost_dataset() -> Tuple[pd.DataFrame, List[str], List[str], List[str]]:
    """Cible : fact_transport.transport_cost_amount (coût réel du transport)."""
    fact_transport = read_csv("fact_transport.csv")
    dim_route = read_csv("dim_route.csv")
    dim_vehicle = read_csv("dim_vehicle.csv")
    dim_carrier = read_csv("dim_carrier.csv")
    dim_transport_mode = read_csv("dim_transport_mode.csv")
    dim_driver = read_csv("dim_driver.csv")
    dim_date = read_csv("dim_date.csv")

    df = (
        fact_transport.merge(dim_route, on="sk_route", how="left", suffixes=("", "_route"))
        .merge(dim_vehicle, on="sk_vehicle", how="left", suffixes=("", "_veh"))
        .merge(dim_carrier, on="sk_carrier", how="left", suffixes=("", "_carr"))
        .merge(dim_transport_mode, on="sk_transport_mode", how="left", suffixes=("", "_mod"))
        .merge(dim_driver, on="sk_driver", how="left", suffixes=("", "_drv"))
        .merge(dim_date[["sk_date", "month_num", "is_weekend", "is_holiday"]], on="sk_date", how="left")
    )

    df["fill_rate"] = df["fill_rate"].clip(0, 1)
    df["cost_per_km"] = df["cost_per_km"].fillna(df["avg_cost_per_km"])
    df["experience_years"] = df["experience_years"].fillna(df["experience_years"].median())

    feature_cols = {
        "distance_km": df["distance_km"],
        "duration_hours": df["duration_hours"],
        "vehicle_type": df["vehicle_type"],
        "transport_mode": df["transport_mode"],
        "carrier_type": df["carrier_type"],
        "cost_per_km": df["cost_per_km"],
        "fill_rate": df["fill_rate"],
        "toll_count": df["toll_count"],
        "difficulty_level": df["difficulty_level"],
        "zone_type": df["zone_type"],
        "planned_time_hours": df["planned_time_hours"],
        "standard_delay_hours": df["standard_delay_hours"],
        "experience_years": df["experience_years"],
        "month_num": df["month_num"],
        "is_weekend": df["is_weekend"],
        "is_holiday": df["is_holiday"],
    }
    data = pd.DataFrame(feature_cols)
    data["target"] = df["transport_cost_amount"].astype(float)
    data = data.dropna(subset=["target"])

    num_features = [
        "distance_km", "duration_hours", "cost_per_km", "fill_rate",
        "toll_count", "planned_time_hours", "standard_delay_hours",
        "experience_years", "month_num", "is_weekend", "is_holiday",
    ]
    cat_features = ["vehicle_type", "transport_mode", "carrier_type", "difficulty_level", "zone_type"]
    supported = [
        "distance", "duree", "mode_transport", "type_vehicule",
        "transporteur", "cout_km_transporteur", "taux_remplissage",
        "peages", "difficulte_route", "zone",
    ]
    return data, num_features, cat_features, supported


def train_fuel() -> Dict:
    data, num_features, cat_features, supported = build_fuel_dataset()
    X = data[num_features + cat_features]
    y = data["target"]
    pipeline, metrics = evaluate_regression_extended(X, y, num_features, cat_features)
    metadata = {
        "problem_type": "regression",
        "target": "Fuel_Consumed",
        "records": int(len(data)),
        "supported_fields": supported,
        "missing_requested_fields": [x for x in REQUESTED_FIELDS["fuel"] if x not in supported],
        **metrics,
    }
    save_bundle("fuel_consumption_model", pipeline, num_features + cat_features, metadata)
    return metadata


def train_transport_cost() -> Dict:
    data, num_features, cat_features, supported = build_transport_cost_dataset()
    X = data[num_features + cat_features]
    y = data["target"]
    pipeline, metrics = evaluate_regression_extended(X, y, num_features, cat_features)
    metadata = {
        "problem_type": "regression",
        "target": "Transport_Cost",
        "records": int(len(data)),
        "supported_fields": supported,
        "missing_requested_fields": [x for x in REQUESTED_FIELDS["transport_cost"] if x not in supported],
        **metrics,
    }
    save_bundle("transport_cost_model", pipeline, num_features + cat_features, metadata)
    return metadata


def build_default_inputs() -> Dict:
    delivery, _, _, _ = build_delivery_dataset()
    client, _, _, _ = build_client_dataset()
    maintenance, _, _, _ = build_maintenance_dataset()
    fuel, _, _, _ = build_fuel_dataset()
    transport, _, _, _ = build_transport_cost_dataset()

    def _defaults(df: pd.DataFrame) -> Dict:
        num = df.drop(columns=["target"]).median(numeric_only=True).to_dict()
        cat_df = df.drop(columns=["target"]).select_dtypes(include="object")
        cat = cat_df.mode().iloc[0].to_dict() if len(cat_df.columns) else {}
        return num | cat

    return {
        "delivery": _defaults(delivery),
        "client": _defaults(client),
        "maintenance": _defaults(maintenance),
        "fuel": _defaults(fuel),
        "transport_cost": _defaults(transport),
    }


def main() -> None:
    report = {
        "delivery": train_delivery(),
        "client": train_client(),
        "maintenance": train_maintenance(),
        "fuel": train_fuel(),
        "transport_cost": train_transport_cost(),
        "default_inputs": build_default_inputs(),
    }
    with open(ML_DIR / "model_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()

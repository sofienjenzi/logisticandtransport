from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

import joblib
import pandas as pd

import src.ml.fix_compat  # noqa: F401 — compatibilité sklearn 1.6.1 → version actuelle

ROOT = Path(__file__).resolve().parents[2]
ML_DIR = ROOT / "data" / "ml"
REPORT_PATH = ML_DIR / "model_report.json"


class ModelService:
    def __init__(self) -> None:
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._report = self._load_report()
        self._client_labels = self._load_client_labels()

    def _load_report(self) -> Dict[str, Any]:
        if REPORT_PATH.exists():
            return json.loads(REPORT_PATH.read_text(encoding="utf-8"))
        return {}

    def _load_bundle(self, name: str) -> Dict[str, Any]:
        if name not in self._cache:
            path = ML_DIR / f"{name}.joblib"
            if not path.exists():
                raise FileNotFoundError(f"Modèle introuvable: {path}")
            self._cache[name] = joblib.load(path)
        return self._cache[name]

    def _load_client_labels(self) -> Any:
        path = ML_DIR / "client_label_encoder.joblib"
        if path.exists():
            return joblib.load(path)
        return None

    def overview(self) -> Dict[str, Any]:
        return self._report

    def _prepare_df(self, bundle_name: str, payload: Dict[str, Any]) -> pd.DataFrame:
        bundle = self._load_bundle(bundle_name)
        features = bundle["features"]
        default_key = {
            "delivery_delay_model": "delivery",
            "client_classification_model": "client",
            "maintenance_predictive_model": "maintenance",
        }[bundle_name]
        defaults = (self._report.get("default_inputs") or {}).get(default_key, {})
        row = {feature: payload.get(feature, defaults.get(feature)) for feature in features}
        return pd.DataFrame([row]), bundle

    def predict_delivery(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        X, bundle = self._prepare_df("delivery_delay_model", payload)
        pred = float(bundle["pipeline"].predict(X)[0])
        return {
            "predicted_delivery_hours": round(pred, 2),
            "predicted_delivery_minutes": int(round(pred * 60)),
            "best_model": bundle["metadata"].get("best_model"),
            "supported_fields": bundle["metadata"].get("supported_fields", []),
            "missing_requested_fields": bundle["metadata"].get("missing_requested_fields", []),
        }

    def classify_client(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        X, bundle = self._prepare_df("client_classification_model", payload)
        model = bundle["pipeline"]
        pred_idx = int(model.predict(X)[0])
        labels = (self._client_labels or {}).get("classes", [])
        label = labels[pred_idx] if 0 <= pred_idx < len(labels) else str(pred_idx)
        probabilities = None
        if hasattr(model, "predict_proba"):
            raw = model.predict_proba(X)[0]
            probabilities = {labels[i]: round(float(raw[i]), 4) for i in range(min(len(labels), len(raw)))}
        return {
            "predicted_segment": label,
            "probabilities": probabilities,
            "best_model": bundle["metadata"].get("best_model"),
            "supported_fields": bundle["metadata"].get("supported_fields", []),
            "missing_requested_fields": bundle["metadata"].get("missing_requested_fields", []),
        }

    def predict_maintenance(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        X, bundle = self._prepare_df("maintenance_predictive_model", payload)
        model = bundle["pipeline"]
        pred = int(model.predict(X)[0])
        risk = None
        if hasattr(model, "predict_proba"):
            risk = float(model.predict_proba(X)[0][1])
        return {
            "failure_prediction": pred,
            "failure_risk": round(risk, 4) if risk is not None else None,
            "risk_label": "Risque élevé" if risk is not None and risk >= 0.65 else "Risque modéré" if risk is not None and risk >= 0.35 else "Risque faible",
            "best_model": bundle["metadata"].get("best_model"),
            "supported_fields": bundle["metadata"].get("supported_fields", []),
            "missing_requested_fields": bundle["metadata"].get("missing_requested_fields", []),
        }

    def _prepare_df_ext(self, bundle_name: str, payload: Dict[str, Any]):
        bundle = self._load_bundle(bundle_name)
        features = bundle["features"]
        default_key = {
            "fuel_consumption_model": "fuel",
            "transport_cost_model": "transport_cost",
        }[bundle_name]
        defaults = (self._report.get("default_inputs") or {}).get(default_key, {})
        row = {feature: payload.get(feature, defaults.get(feature)) for feature in features}
        return pd.DataFrame([row]), bundle

    def predict_fuel(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        X, bundle = self._prepare_df_ext("fuel_consumption_model", payload)
        pred_l = float(bundle["pipeline"].predict(X)[0])
        pred_cost = round(pred_l * 1.85, 2)
        return {
            "Fuel_Consumed_pred_l": round(pred_l, 2),
            "Fuel_Cost_pred_eur": pred_cost,
            "best_model": bundle["metadata"].get("best_model"),
            "supported_fields": bundle["metadata"].get("supported_fields", []),
            "missing_requested_fields": bundle["metadata"].get("missing_requested_fields", []),
        }

    def predict_transport_cost(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        X, bundle = self._prepare_df_ext("transport_cost_model", payload)
        pred = float(bundle["pipeline"].predict(X)[0])
        distance = float(payload.get("distance_km", 0.0))
        cost_per_km = float(payload.get("cost_per_km", 0.0))
        target = distance * cost_per_km if cost_per_km > 0 else None
        variance_pct = round(((pred - target) / target) * 100, 2) if target else None
        return {
            "Transport_Cost_pred_eur": round(pred, 2),
            "Transport_Cost_target_eur": round(target, 2) if target else None,
            "Cost_Variance_pct": variance_pct,
            "best_model": bundle["metadata"].get("best_model"),
            "supported_fields": bundle["metadata"].get("supported_fields", []),
            "missing_requested_fields": bundle["metadata"].get("missing_requested_fields", []),
        }

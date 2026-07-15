from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parents[2]
SITE_DIR = ROOT / "frontend" / "dist"
DATA_DIR = ROOT / "data"

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.ml.inference import ModelService  # noqa: E402

app = Flask(__name__, static_folder=None)
service = ModelService()


@app.get("/")
def home():
    return send_from_directory(SITE_DIR, "index.html")


@app.get("/<path:path>")
def serve_site(path: str):
    candidate = SITE_DIR / path
    if candidate.exists() and candidate.is_file():
        return send_from_directory(SITE_DIR, path)
    return send_from_directory(SITE_DIR, "index.html")


@app.get("/data/<path:path>")
def serve_data(path: str):
    return send_from_directory(DATA_DIR, path)


@app.get("/api/health")
def api_health():
    return jsonify({"status": "ok"})


@app.get("/api/ml/overview")
def ml_overview():
    return jsonify(service.overview())


@app.post("/api/predict/delivery")
def predict_delivery():
    payload = request.get_json(force=True, silent=True) or {}
    return jsonify(service.predict_delivery(payload))


@app.post("/api/predict/client")
def predict_client():
    payload = request.get_json(force=True, silent=True) or {}
    return jsonify(service.classify_client(payload))


@app.post("/api/predict/maintenance")
def predict_maintenance():
    payload = request.get_json(force=True, silent=True) or {}
    return jsonify(service.predict_maintenance(payload))


@app.post("/api/predict/fuel")
def predict_fuel():
    payload = request.get_json(force=True, silent=True) or {}
    return jsonify(service.predict_fuel(payload))


@app.post("/api/predict/transport-cost")
def predict_transport_cost():
    payload = request.get_json(force=True, silent=True) or {}
    return jsonify(service.predict_transport_cost(payload))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8501, debug=False)

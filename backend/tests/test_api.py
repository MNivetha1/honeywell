"""
API Endpoints Integration Tests
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import init_database, SessionLocal
from app.services.dataset_service import DatasetService

@pytest.fixture(autouse=True)
def setup_database():
    init_database()
    with SessionLocal() as db:
        DatasetService.sync_dataset_to_db(db)
    yield

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["backend_connected"] is True
    assert data["cv_engine_ready"] is True

def test_system_info_endpoint():
    response = client.get("/api/system/info")
    assert response.status_code == 200
    data = response.json()
    assert "opencv_version" in data
    assert "python_version" in data

def test_config_endpoints():
    # GET config
    response = client.get("/api/config")
    assert response.status_code == 200
    cfg = response.json()
    assert "image_processing" in cfg
    assert "feature_exclusion" in cfg
    assert "scoring" in cfg

    # Update config
    cfg["decision"]["threshold_percent"] = 88.5
    put_res = client.put("/api/config", json=cfg)
    assert put_res.status_code == 200
    assert put_res.json()["decision"]["threshold_percent"] == 88.5

    # Reset config
    reset_res = client.post("/api/config/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["decision"]["threshold_percent"] == 90.0

def test_dataset_pairs_endpoint():
    response = client.get("/api/dataset/pairs")
    assert response.status_code == 200
    pairs = response.json()
    assert len(pairs) == 100

def test_single_compare_endpoint():
    response = client.post("/api/compare/pair_001")
    assert response.status_code == 200
    res = response.json()
    assert res["pair_id"] == "pair_001"
    assert res["result"] == "PASS"
    assert res["similarity_score"] >= 90.0

def test_reports_endpoints():
    json_res = client.get("/api/reports/json")
    assert json_res.status_code == 200
    data = json_res.json()
    assert "summary" in data
    assert "results" in data

    excel_res = client.get("/api/reports/excel")
    assert excel_res.status_code == 200
    assert excel_res.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

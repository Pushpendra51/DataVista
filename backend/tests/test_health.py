from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "health_endpoint" in data
    assert data["health_endpoint"] == "/api/health"

def test_health_endpoint_status_and_schema():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == f"{settings.PROJECT_NAME} API"
    assert data["version"] == settings.VERSION
    assert "timestamp" in data

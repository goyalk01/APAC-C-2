"""New endpoint test — GET /api/v1/alerts (happy path + one failure path).

Covers Phase 2 requirement 5: minimal test suite per endpoint.
"""
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.services.local_cache import init_db, insert_threat

SAMPLE_PAYLOAD = {
    "node_id": "NODE_001",
    "alert_type": "BRIDGE_COLLAPSE",
    "confidence": 0.98,
    "gps": {"lat": 27.1751, "lng": 78.0421},
    "timestamp": "2026-07-05T14:23:00Z",
    "model_version": "swarmguard-edge-v1.2",
    "visual_proof_hash": "sha256:abc123def456",
    "signature": "ed25519:dummysig",
}


@pytest.fixture
def client(_isolated_settings, monkeypatch):
    # Import app AFTER env vars are patched by _isolated_settings so the
    # Settings() singleton picks up the isolated paths.
    import importlib
    import app.main as main_module
    importlib.reload(main_module)
    init_db()
    with TestClient(main_module.app) as c:
        yield c


def test_list_alerts_happy_path(client):
    insert_threat(SAMPLE_PAYLOAD)
    resp = client.get("/api/v1/alerts")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["node_id"] == "NODE_001"


def test_list_alerts_invalid_limit_returns_422(client):
    """Failure path: limit above the allowed max (1000) triggers validation
    error, surfaced via the centralized error envelope."""
    resp = client.get("/api/v1/alerts", params={"limit": 5000})
    assert resp.status_code == 422
    body = resp.json()
    assert body["error"]["code"] == "VALIDATION_ERROR"


def test_healthz(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "alive"


def test_readyz_not_ready_without_keys(client):
    """Failure path: readyz reports not_ready when the key registry is empty
    (node_keys.json not generated in this isolated test env)."""
    resp = client.get("/readyz")
    assert resp.status_code == 503
    assert resp.json()["status"] == "not_ready"

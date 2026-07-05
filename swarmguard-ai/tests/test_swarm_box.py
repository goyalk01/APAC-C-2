import pytest
from swarm_box.local_cache import init_db, insert_threat, get_all_threats, DB_PATH
from swarm_box.tts_engine import threat_to_speech
from pathlib import Path
import os

SAMPLE_PAYLOAD = {
    "node_id": "NODE_001",
    "alert_type": "BRIDGE_COLLAPSE",
    "confidence": 0.98,
    "gps": {"lat": 27.1751, "lng": 78.0421},
    "timestamp": "2026-07-05T14:23:00Z",
    "model_version": "swarmguard-edge-v1.2",
    "visual_proof_hash": "sha256:abc123def456",
    "signature": "ed25519:dummysig"
}

@pytest.fixture(autouse=True)
def clean_db(tmp_path, monkeypatch):
    """Use a temp DB for each test."""
    test_db = tmp_path / "test_swarm_cache.db"
    import swarm_box.local_cache as lc
    monkeypatch.setattr(lc, "DB_PATH", test_db)
    init_db()
    yield

def test_insert_and_retrieve():
    event_id = insert_threat(SAMPLE_PAYLOAD)
    assert event_id  # non-empty
    threats = get_all_threats()
    assert len(threats) == 1
    assert threats[0]["node_id"] == "NODE_001"
    assert threats[0]["alert_type"] == "BRIDGE_COLLAPSE"
    assert threats[0]["synced_to_cloud"] == 0

def test_tts_speech():
    speech = threat_to_speech(SAMPLE_PAYLOAD)
    assert "bridge collapse" in speech
    assert "NODE_001" in speech
    assert "98 percent" in speech

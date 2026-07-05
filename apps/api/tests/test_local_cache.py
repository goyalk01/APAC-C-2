"""Moved + extended from swarmguard-ai/tests/test_swarm_box.py (cache portion).
Adds a failure-path test (missing required field) alongside the original
happy-path insert/retrieve test.
"""
import pytest

from app.services.local_cache import init_db, insert_threat, get_all_threats, count_threats

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


@pytest.fixture(autouse=True)
def _init(_isolated_settings):
    init_db()
    yield


def test_insert_and_retrieve_happy_path():
    event_id = insert_threat(SAMPLE_PAYLOAD)
    assert event_id
    threats = get_all_threats()
    assert len(threats) == 1
    assert threats[0]["node_id"] == "NODE_001"
    assert threats[0]["alert_type"] == "BRIDGE_COLLAPSE"
    assert threats[0]["synced_to_cloud"] == 0
    assert count_threats() == 1


def test_pagination_limit_offset():
    for i in range(5):
        payload = dict(SAMPLE_PAYLOAD)
        payload["node_id"] = f"NODE_{i:03d}"
        insert_threat(payload)

    page = get_all_threats(limit=2, offset=0)
    assert len(page) == 2
    assert count_threats() == 5


def test_insert_missing_required_field_raises():
    """Failure path: a payload missing a required key (e.g. 'gps') should
    raise a KeyError rather than silently corrupting the row."""
    bad_payload = dict(SAMPLE_PAYLOAD)
    del bad_payload["gps"]
    with pytest.raises(KeyError):
        insert_threat(bad_payload)

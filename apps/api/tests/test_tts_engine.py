"""Moved as-is from swarmguard-ai/tests/test_swarm_box.py (TTS portion)."""
from app.services.tts_engine import threat_to_speech

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


def test_tts_speech_happy_path():
    speech = threat_to_speech(SAMPLE_PAYLOAD)
    assert "bridge collapse" in speech
    assert "NODE_001" in speech
    assert "98 percent" in speech


def test_tts_speech_unknown_alert_type_fallback():
    """Failure/edge path: an alert_type not in ALERT_LABELS should fall back
    to a lowercased, underscore-replaced label instead of raising."""
    payload = dict(SAMPLE_PAYLOAD)
    payload["alert_type"] = "UNKNOWN_HAZARD"
    speech = threat_to_speech(payload)
    assert "unknown hazard" in speech

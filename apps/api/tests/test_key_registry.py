"""Moved as-is from swarmguard-ai/tests/test_key_registry.py — logic unchanged.
Imports EdgeNode/CryptoSigner from swarmguard-ai/edge_nodes (untouched,
Decision 3) via sys.path insertion, same as app/generate_keys.py does.
"""
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SWARMGUARD_AI_DIR = REPO_ROOT / "swarmguard-ai"

sys.path.insert(0, str(SWARMGUARD_AI_DIR))

from edge_nodes.edge_node import EdgeNode  # noqa: E402

from app.services.key_registry import register_node, verify_payload, _registry  # noqa: E402


@pytest.fixture(autouse=True)
def clear_registry():
    _registry.clear()
    yield
    _registry.clear()


class TestKeyRegistry:
    def test_roundtrip_sign_verify(self):
        """Happy path: a payload signed by an edge node verifies with its
        registered public key."""
        node = EdgeNode(node_id="TEST_001")
        register_node("TEST_001", node.get_public_key_b64())

        payload = node.generate_threat_payload(
            alert_type="BRIDGE_COLLAPSE",
            confidence=0.95,
            lat=27.1751,
            lng=78.0421,
            visual_proof_hash="sha256:abc123",
        )

        assert verify_payload(payload) is True

    def test_reject_tampered_payload(self):
        """Failure path: a payload with modified fields fails verification."""
        node = EdgeNode(node_id="TEST_002")
        register_node("TEST_002", node.get_public_key_b64())

        payload = node.generate_threat_payload(
            alert_type="FLOODING",
            confidence=0.87,
            lat=27.1631,
            lng=78.0421,
            visual_proof_hash="sha256:def456",
        )
        payload["confidence"] = 0.99  # tamper

        assert verify_payload(payload) is False

    def test_reject_unknown_node(self):
        node = EdgeNode(node_id="ROGUE_NODE")
        payload = node.generate_threat_payload(
            alert_type="GAS_LEAK",
            confidence=0.91,
            lat=27.0945,
            lng=77.6593,
            visual_proof_hash="sha256:ghi789",
        )
        assert verify_payload(payload) is False

    def test_reject_missing_signature(self):
        register_node("TEST_003", EdgeNode(node_id="TEST_003").get_public_key_b64())
        payload = {
            "node_id": "TEST_003",
            "alert_type": "STRUCTURAL_FIRE",
            "confidence": 0.94,
            "gps": {"lat": 27.2031, "lng": 77.9981},
            "timestamp": "2026-07-05T12:00:00Z",
            "model_version": "swarmguard-edge-v1.2",
        }
        assert verify_payload(payload) is False

    def test_reject_wrong_key(self):
        node_a = EdgeNode(node_id="NODE_A")
        node_b = EdgeNode(node_id="NODE_B")
        register_node("NODE_A", node_b.get_public_key_b64())

        payload = node_a.generate_threat_payload(
            alert_type="CROWD_STAMPEDE",
            confidence=0.82,
            lat=27.1983,
            lng=77.9778,
            visual_proof_hash="sha256:jkl012",
        )
        assert verify_payload(payload) is False

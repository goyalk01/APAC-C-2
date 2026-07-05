"""Tests for the key registry and end-to-end signature verification."""
import json
import sys
import os
import pytest

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from edge_nodes.edge_node import EdgeNode
from edge_nodes.crypto_signer import CryptoSigner
from swarm_box.key_registry import register_node, verify_payload, _registry


@pytest.fixture(autouse=True)
def clear_registry():
    """Clear the key registry before each test."""
    _registry.clear()
    yield
    _registry.clear()


class TestKeyRegistry:
    def test_roundtrip_sign_verify(self):
        """A payload signed by an edge node should verify with its registered public key."""
        node = EdgeNode(node_id="TEST_001")

        # Register the node's public key
        register_node("TEST_001", node.get_public_key_b64())

        # Generate a signed payload
        payload = node.generate_threat_payload(
            alert_type="BRIDGE_COLLAPSE",
            confidence=0.95,
            lat=27.1751,
            lng=78.0421,
            visual_proof_hash="sha256:abc123"
        )

        assert verify_payload(payload) is True

    def test_reject_tampered_payload(self):
        """A payload with modified fields should fail verification."""
        node = EdgeNode(node_id="TEST_002")
        register_node("TEST_002", node.get_public_key_b64())

        payload = node.generate_threat_payload(
            alert_type="FLOODING",
            confidence=0.87,
            lat=27.1631,
            lng=78.0421,
            visual_proof_hash="sha256:def456"
        )

        # Tamper with the confidence
        payload["confidence"] = 0.99

        assert verify_payload(payload) is False

    def test_reject_unknown_node(self):
        """A payload from an unregistered node should be rejected."""
        node = EdgeNode(node_id="ROGUE_NODE")

        payload = node.generate_threat_payload(
            alert_type="GAS_LEAK",
            confidence=0.91,
            lat=27.0945,
            lng=77.6593,
            visual_proof_hash="sha256:ghi789"
        )

        # Don't register the node's key
        assert verify_payload(payload) is False

    def test_reject_missing_signature(self):
        """A payload with no signature field should be rejected."""
        register_node("TEST_003", EdgeNode(node_id="TEST_003").get_public_key_b64())

        payload = {
            "node_id": "TEST_003",
            "alert_type": "STRUCTURAL_FIRE",
            "confidence": 0.94,
            "gps": {"lat": 27.2031, "lng": 77.9981},
            "timestamp": "2026-07-05T12:00:00Z",
            "model_version": "swarmguard-edge-v1.2",
        }
        # No "signature" key

        assert verify_payload(payload) is False

    def test_reject_wrong_key(self):
        """A payload verified against a different node's key should fail."""
        node_a = EdgeNode(node_id="NODE_A")
        node_b = EdgeNode(node_id="NODE_B")

        # Register node_b's key under node_a's ID (simulating a key mismatch)
        register_node("NODE_A", node_b.get_public_key_b64())

        payload = node_a.generate_threat_payload(
            alert_type="CROWD_STAMPEDE",
            confidence=0.82,
            lat=27.1983,
            lng=77.9778,
            visual_proof_hash="sha256:jkl012"
        )

        assert verify_payload(payload) is False

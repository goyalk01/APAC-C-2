import pytest
import json
from edge_nodes.edge_node import EdgeNode
from edge_nodes.crypto_signer import CryptoSigner

def test_edge_node_threat_generation():
    node = EdgeNode(node_id="NODE_TEST")
    
    payload = node.generate_threat_payload(
        alert_type="BRIDGE_COLLAPSE",
        confidence=0.98,
        lat=27.1751,
        lng=78.0421,
        visual_proof_hash="sha256:dummyhash123"
    )
    
    assert payload["node_id"] == "NODE_TEST"
    assert payload["alert_type"] == "BRIDGE_COLLAPSE"
    assert payload["confidence"] == 0.98
    assert "gps" in payload
    assert "signature" in payload
    
    # Verify signature
    signature = payload.pop("signature")
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    assert node.signer.verify(payload_bytes, signature) is True
    
    # Payload size should be < 1KB
    assert len(payload_bytes) < 1024

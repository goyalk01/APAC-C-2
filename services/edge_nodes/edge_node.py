# ponytail: simple simulation node. No heavy threading or actual camera access.
import json
import hashlib
import time
from .crypto_signer import CryptoSigner

class EdgeNode:
    def __init__(self, node_id: str, model_version: str = "swarmguard-edge-v1.2"):
        self.node_id = node_id
        self.model_version = model_version
        import hashlib
        seed = hashlib.sha256(node_id.encode('utf-8')).digest()
        self.signer = CryptoSigner(private_key_bytes=seed)

    def get_public_key_b64(self) -> str:
        """Export this node's public key for the Swarm Box key registry."""
        return self.signer.get_public_key_b64()
        
    def cache_visual_proof(self, image_data: bytes) -> str:
        # ponytail: skipped actual disk writing for this mock, just return hash
        return "sha256:" + hashlib.sha256(image_data).hexdigest()

    def generate_threat_payload(self, alert_type: str, confidence: float, lat: float, lng: float, visual_proof_hash: str) -> dict:
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        
        payload_dict = {
            "node_id": self.node_id,
            "alert_type": alert_type,
            "confidence": confidence,
            "gps": {"lat": lat, "lng": lng},
            "timestamp": timestamp,
            "model_version": self.model_version,
            "visual_proof_hash": visual_proof_hash
        }
        
        # ponytail: sign the JSON string representation
        payload_bytes = json.dumps(payload_dict, separators=(',', ':')).encode('utf-8')
        signature = self.signer.sign(payload_bytes)
        
        payload_dict["signature"] = signature
        return payload_dict

# Key registry for Ed25519 signature verification.
# Pre-shared key model: keys are provisioned at deployment time.
# No CA required — verification is purely local.
import json
import base64
import logging
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization

log = logging.getLogger(__name__)

# In-memory registry: node_id -> Ed25519PublicKey object
_registry: dict[str, ed25519.Ed25519PublicKey] = {}


def register_node(node_id: str, public_key_b64: str) -> None:
    """Register a node's public key. Call once per node at startup."""
    raw = base64.b64decode(public_key_b64)
    _registry[node_id] = ed25519.Ed25519PublicKey.from_public_bytes(raw)
    log.info(f"Registered public key for {node_id}")


def load_registry_from_file(path: str) -> None:
    """Load all node keys from a JSON file {node_id: public_key_b64}."""
    import pathlib
    data = json.loads(pathlib.Path(path).read_text(encoding="utf-8"))
    for node_id, pub_b64 in data.items():
        register_node(node_id, pub_b64)
    log.info(f"Loaded {len(data)} node keys from {path}")


def is_registered(node_id: str) -> bool:
    return node_id in _registry


def verify_payload(payload: dict) -> bool:
    """Verify a threat payload's Ed25519 signature against the registered key.

    Returns True if the signature is valid, False otherwise.
    Mirrors the signing logic in edge_nodes/edge_node.py:31 exactly.
    """
    node_id = payload.get("node_id")
    signature_str = payload.get("signature")

    if not node_id or not signature_str:
        log.warning("Payload missing node_id or signature field")
        return False

    if node_id not in _registry:
        log.warning(f"Unknown node_id '{node_id}' — not in key registry")
        return False

    # Reconstruct the signed bytes: the payload without the signature field,
    # serialized with compact separators — must match edge_node.py:31
    payload_copy = {k: v for k, v in payload.items() if k != "signature"}
    payload_bytes = json.dumps(payload_copy, separators=(',', ':')).encode('utf-8')

    # Strip the "ed25519:" prefix if present
    sig_b64 = signature_str
    if sig_b64.startswith("ed25519:"):
        sig_b64 = sig_b64[8:]

    try:
        sig_bytes = base64.b64decode(sig_b64)
        _registry[node_id].verify(sig_bytes, payload_bytes)
        return True
    except Exception as e:
        log.warning(f"Signature verification failed for {node_id}: {e}")
        return False

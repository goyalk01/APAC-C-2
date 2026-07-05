import asyncio
import json
import random
import websockets
from .edge_node import EdgeNode
from .threat_scenarios import SCENARIOS


def get_all_node_keys() -> dict[str, str]:
    """Create all edge nodes and return {node_id: public_key_b64} for the key registry."""
    keys = {}
    for node_id in SCENARIOS:
        node = EdgeNode(node_id=node_id)
        keys[node_id] = node.get_public_key_b64()
    return keys


# Cache node instances so the same keypair is used for key export and transmission
_node_cache: dict[str, EdgeNode] = {}


def _get_or_create_node(node_id: str) -> EdgeNode:
    if node_id not in _node_cache:
        _node_cache[node_id] = EdgeNode(node_id=node_id)
    return _node_cache[node_id]


async def run_node_scenario(node_id: str):
    scenario = SCENARIOS[node_id]

    # Jitter: make demo data look organic, not rehearsed
    jittered_delay = scenario["delay"] + random.uniform(1.0, 3.0)
    jittered_confidence = max(0.0, min(1.0, scenario["confidence"] + random.uniform(-0.05, 0.05)))
    jittered_lat = scenario["gps"]["lat"] + random.uniform(-0.001, 0.001)
    jittered_lng = scenario["gps"]["lng"] + random.uniform(-0.001, 0.001)

    await asyncio.sleep(jittered_delay)

    node = _get_or_create_node(node_id)
    # ponytail: skipped actual local image saving for simulation.
    dummy_image = b"fake_image_data_for_demo"
    proof_hash = node.cache_visual_proof(dummy_image)

    payload = node.generate_threat_payload(
        alert_type=scenario["alert_type"],
        confidence=jittered_confidence,
        lat=jittered_lat,
        lng=jittered_lng,
        visual_proof_hash=proof_hash
    )

    try:
        async with websockets.connect("ws://localhost:8765") as websocket:
            await websocket.send(json.dumps(payload))
            print(f"[{node_id}] Transmitted payload successfully.")
            # Keep connection alive momentarily to ensure flush
            await asyncio.sleep(1)
    except Exception as e:
        print(f"[{node_id}] Mesh transmission failed: {e}")


def get_node_keys_from_cache() -> dict[str, str]:
    """Return {node_id: public_key_b64} for all cached nodes.
    Call after nodes have been created via run_node_scenario or _get_or_create_node.
    """
    return {nid: node.get_public_key_b64() for nid, node in _node_cache.items()}



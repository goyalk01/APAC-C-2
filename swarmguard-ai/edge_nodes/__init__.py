import asyncio
import websockets
import json
from .edge_node import EdgeNode
from .threat_scenarios import SCENARIOS

async def run_node_scenario(node_id: str):
    scenario = SCENARIOS[node_id]
    await asyncio.sleep(scenario["delay"])
    
    node = EdgeNode(node_id=node_id)
    # ponytail: skipped actual local image saving for simulation.
    dummy_image = b"fake_image_data_for_demo"
    proof_hash = node.cache_visual_proof(dummy_image)
    
    payload = node.generate_threat_payload(
        alert_type=scenario["alert_type"],
        confidence=scenario["confidence"],
        lat=scenario["gps"]["lat"],
        lng=scenario["gps"]["lng"],
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


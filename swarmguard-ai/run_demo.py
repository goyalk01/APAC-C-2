"""
SwarmGuard AI — All-in-one local demo launcher.

Starts everything in one process:
  1. Generates keys + writes node_keys.json
  2. Starts the mesh relay
  3. Starts the Swarm Box web app
  4. Launches all 5 edge nodes (staggered by their scenario delays)

Usage:
    python run_demo.py
"""
import asyncio
import json
import sys
import os
import signal
from pathlib import Path

# Ensure project root is on path
PROJECT_ROOT = Path(__file__).parent
sys.path.insert(0, str(PROJECT_ROOT))

from edge_nodes import _get_or_create_node, run_node_scenario, get_node_keys_from_cache
from edge_nodes.threat_scenarios import SCENARIOS
from mesh_network.mesh_relay import relay_handler


KEYS_FILE = PROJECT_ROOT / "swarm_box" / "node_keys.json"


async def start_mesh_relay():
    """Start the WebSocket mesh relay on port 8765."""
    import websockets
    server = await websockets.serve(relay_handler, "localhost", 8765)
    print("[Demo] Mesh relay active on ws://localhost:8765")
    return server


async def start_swarm_box():
    """Start the Swarm Box FastAPI app on port 8010."""
    import uvicorn
    config = uvicorn.Config(
        "swarm_box.app:app",
        host="127.0.0.1",
        port=8010,
        log_level="info",
    )
    server = uvicorn.Server(config)
    print("[Demo] Swarm Box starting on http://127.0.0.1:8010")
    return server


def generate_keys_from_cache():
    """Pre-create all nodes and write their public keys to node_keys.json.
    The same node instances are reused by run_node_scenario via _node_cache.
    """
    for node_id in SCENARIOS:
        _get_or_create_node(node_id)

    keys = get_node_keys_from_cache()
    KEYS_FILE.write_text(json.dumps(keys, indent=2), encoding="utf-8")
    print(f"[Demo] Generated keys for {len(keys)} nodes -> {KEYS_FILE.name}")
    for nid, pub in keys.items():
        print(f"  {nid}: {pub[:16]}...")


async def launch_edge_nodes():
    """Launch all 5 edge node scenarios concurrently."""
    print("[Demo] Launching edge nodes (staggered by scenario delays)...")
    tasks = [asyncio.create_task(run_node_scenario(nid)) for nid in SCENARIOS]
    await asyncio.gather(*tasks)
    print("[Demo] All edge nodes have transmitted their payloads.")


async def main():
    print("=" * 60)
    print("  SwarmGuard AI — Local Demo")
    print("=" * 60)
    print()

    # Step 1: Generate keys (same node instances will be reused for transmission)
    generate_keys_from_cache()
    print()

    # Step 2: Start mesh relay
    relay_server = await start_mesh_relay()

    # Step 3: Start Swarm Box
    swarm_box = await start_swarm_box()
    swarm_box_task = asyncio.create_task(swarm_box.serve())

    # Give the servers a moment to bind
    await asyncio.sleep(2)
    print("============================================================")
    print("   Dashboard ready -> http://127.0.0.1:8010")
    print("   Open this URL in your browser now!")
    print("============================================================")
    print()

    # Step 4: Launch edge nodes after a brief pause for user to open browser
    await asyncio.sleep(3)
    await launch_edge_nodes()

    # Keep running so the dashboard stays up
    print()
    print("[Demo] All alerts transmitted. Dashboard is live.")
    print("[Demo] Press Ctrl+C to stop.")
    try:
        await asyncio.Event().wait()  # run forever
    except asyncio.CancelledError:
        pass
    finally:
        relay_server.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Demo] Shutdown.")

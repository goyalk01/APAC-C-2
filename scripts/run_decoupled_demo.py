"""
SwarmGuard AI — Decoupled E2E Dev Launcher.

Starts the full decoupled pipeline in one process:
  1. Pre-instantiates edge nodes and writes matching keys to apps/api/node_keys.json
  2. Starts the mesh relay (port 8765)
  3. Starts the decoupled FastAPI backend (port 8010)
  4. Starts the Next.js frontend dev server (port 3000) as a subprocess
  5. Launches the 5 edge node scenarios staggered by their delays
"""
import asyncio
import json
import sys
import os
import subprocess
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services"))
sys.path.insert(0, str(PROJECT_ROOT / "apps" / "api"))

# Set environment variables for the decoupled backend
os.environ["SQLITE_PATH"] = str(PROJECT_ROOT / "apps" / "api" / "swarm_cache.db")
os.environ["NODE_KEYS_PATH"] = str(PROJECT_ROOT / "apps" / "api" / "node_keys.json")
os.environ["CORS_ALLOWED_ORIGINS"] = "http://localhost:3000"

from edge_nodes import _get_or_create_node, run_node_scenario, get_node_keys_from_cache
from edge_nodes.threat_scenarios import SCENARIOS
from mesh_network.mesh_relay import relay_handler

KEYS_FILE = Path(os.environ["NODE_KEYS_PATH"])

async def start_mesh_relay():
    import websockets
    server = await websockets.serve(relay_handler, "localhost", 8765)
    print("[Demo] Mesh relay active on ws://localhost:8765")
    return server

async def start_decoupled_backend():
    import uvicorn
    # Import the FastAPI app instance from apps/api/app/main.py
    from app.main import app as fastapi_app
    config = uvicorn.Config(
        fastapi_app,
        host="0.0.0.0",
        port=8010,
        log_level="info",
    )
    server = uvicorn.Server(config)
    print("[Demo] Decoupled API active on http://localhost:8010")
    return server

def generate_keys_from_cache():
    for node_id in SCENARIOS:
        _get_or_create_node(node_id)
    keys = get_node_keys_from_cache()
    KEYS_FILE.parent.mkdir(parents=True, exist_ok=True)
    KEYS_FILE.write_text(json.dumps(keys, indent=2), encoding="utf-8")
    print(f"[Demo] Generated key registry for {len(keys)} nodes -> {KEYS_FILE}")

async def start_frontend():
    print("[Demo] Starting Next.js Dev Server on http://localhost:3000...")
    frontend_path = PROJECT_ROOT / "apps" / "web"
    # Run npm run dev in the apps/web folder
    process = subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=str(frontend_path),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True
    )
    return process

async def launch_edge_nodes():
    print("[Demo] Launching simulated edge nodes...")
    tasks = [asyncio.create_task(run_node_scenario(nid)) for nid in SCENARIOS]
    await asyncio.gather(*tasks)
    print("[Demo] All simulated edge nodes have completed transmissions.")

async def main():
    print("=" * 60)
    print("  SwarmGuard AI — Decoupled Pipeline Launcher")
    print("=" * 60)

    # 1. Generate keys from cache
    generate_keys_from_cache()

    # 2. Start WebSocket mesh relay
    relay_server = await start_mesh_relay()

    # 3. Start decoupled backend
    backend_server = await start_decoupled_backend()
    backend_task = asyncio.create_task(backend_server.serve())

    # 4. Start Next.js dev server
    frontend_process = await start_frontend()

    # Give servers time to bind and compile
    await asyncio.sleep(4)

    # 5. Launch edge nodes
    await launch_edge_nodes()

    print()
    print("[Demo] All alerts transmitted. Decoupled dashboard and API are live.")
    print("       Dashboard: http://localhost:3000")
    print("       API Backend: http://localhost:8010")
    print("       Press Ctrl+C to terminate all services.")

    try:
        await asyncio.Event().wait()
    except KeyboardInterrupt:
        pass
    finally:
        print("\n[Demo] Cleaning up and shutting down services...")
        frontend_process.terminate()
        relay_server.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Demo] Stopped.")

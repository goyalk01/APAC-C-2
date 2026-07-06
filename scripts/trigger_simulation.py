"""
SwarmGuard AI — Local Threat Simulation Trigger for Deployed Cloud Stack
"""
import asyncio
import sys
import os
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services"))

from edge_nodes import run_node_scenario
from edge_nodes.threat_scenarios import SCENARIOS

async def main():
    print("[Simulator] Starting IoT edge node transmissions...")
    relay_url = os.environ.get("MESH_RELAY_URL")
    if not relay_url:
        print("[ERROR] MESH_RELAY_URL environment variable is not set!")
        sys.exit(1)
        
    print(f"[Simulator] Transmitting to Cloud Mesh Relay: {relay_url}")
    tasks = [asyncio.create_task(run_node_scenario(nid)) for nid in SCENARIOS]
    await asyncio.gather(*tasks)
    print("[Simulator] All simulated alert scenarios completed.")

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Simulator] Stopped.")

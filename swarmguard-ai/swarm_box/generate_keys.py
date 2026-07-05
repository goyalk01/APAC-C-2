"""Generate the node_keys.json registry file.

Run this once to create the key registry that the Swarm Box uses for
signature verification. Must be run BEFORE starting the Swarm Box.

Usage:
    python -m swarm_box.generate_keys
"""
import json
import sys
import os
from pathlib import Path

# Add parent to path so edge_nodes can be imported
sys.path.insert(0, str(Path(__file__).parent.parent))

from edge_nodes import get_all_node_keys

KEYS_FILE = Path(__file__).parent / "node_keys.json"


def main():
    print("[KeyGen] Generating Ed25519 keypairs for all edge nodes...")
    keys = get_all_node_keys()

    KEYS_FILE.write_text(json.dumps(keys, indent=2), encoding="utf-8")
    print(f"[KeyGen] Wrote {len(keys)} node keys to {KEYS_FILE}")
    for node_id, pub_b64 in keys.items():
        print(f"  {node_id}: {pub_b64[:16]}...")


if __name__ == "__main__":
    main()

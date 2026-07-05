"""Generate the node_keys.json registry file.

Run this once to create the key registry that the API uses for
signature verification. Must be run BEFORE starting the API.

Usage (from apps/api):
    python -m app.generate_keys

MOVED from swarmguard-ai/swarm_box/generate_keys.py. Structural change only:
imports edge_nodes from its original location (swarmguard-ai/edge_nodes,
untouched per Decision 3) and writes to the env-configured NODE_KEYS_PATH
instead of a hardcoded Path(__file__)-relative location.
"""
import json
import sys
from pathlib import Path

# services/edge_nodes stays in place — add it to sys.path
# so it stays importable without moving/duplicating any of its code.
REPO_ROOT = Path(__file__).resolve().parents[3]
SWARMGUARD_AI_DIR = REPO_ROOT / "services"
sys.path.insert(0, str(SWARMGUARD_AI_DIR))

from edge_nodes import get_all_node_keys  # noqa: E402

from .core.config import get_settings  # noqa: E402


def main():
    settings = get_settings()
    print("[KeyGen] Generating Ed25519 keypairs for all edge nodes...")
    keys = get_all_node_keys()

    keys_path = Path(settings.NODE_KEYS_PATH)
    keys_path.parent.mkdir(parents=True, exist_ok=True)
    keys_path.write_text(json.dumps(keys, indent=2), encoding="utf-8")
    print(f"[KeyGen] Wrote {len(keys)} node keys to {keys_path}")
    for node_id, pub_b64 in keys.items():
        print(f"  {node_id}: {pub_b64[:16]}...")


if __name__ == "__main__":
    main()

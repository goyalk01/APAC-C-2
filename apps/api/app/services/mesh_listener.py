"""Background task: connects to the mesh relay as a WS client and forwards
verified alerts into the local cache + connected dashboard clients.

Extracted from swarm_box/app.py's inline `mesh_listener()` function — same
logic, same crash guards, same verification flow. Structural change only:
the relay URL now comes from Settings (env-driven) instead of a hardcoded
"ws://localhost:8765" literal, and the WebSocket set is passed in rather
than being a module-level global in app.py.
"""
import asyncio
import json
import logging

import websockets
from fastapi import WebSocket

from ..core.config import get_settings
from . import local_cache
from .tts_engine import threat_to_speech
from .key_registry import verify_payload

log = logging.getLogger(__name__)

REQUIRED_FIELDS = ("node_id", "alert_type", "confidence", "gps", "timestamp", "signature")


async def mesh_listener(dashboard_clients: set[WebSocket]) -> None:
    """Connect to the mesh relay and forward alerts to cache + dashboards."""
    settings = get_settings()
    while True:
        try:
            async with websockets.connect(settings.MESH_RELAY_URL) as ws:
                log.info(f"Connected to mesh relay {settings.MESH_RELAY_URL}")
                async for raw in ws:
                    # --- Crash guard: malformed JSON ---
                    try:
                        payload = json.loads(raw)
                    except (json.JSONDecodeError, ValueError) as e:
                        log.warning(f"Malformed JSON from mesh (dropped): {str(raw)[:200]} — {e}")
                        continue

                    # --- Crash guard: missing required fields ---
                    missing = [f for f in REQUIRED_FIELDS if f not in payload]
                    if missing:
                        log.warning(f"Payload missing fields {missing}, dropped: {str(raw)[:200]}")
                        continue

                    # --- Signature verification ---
                    if not verify_payload(payload):
                        log.warning(f"REJECTED: signature verification failed for {payload.get('node_id', '?')}")
                        continue

                    log.info(f"VERIFIED alert: {payload['alert_type']} from {payload['node_id']}")

                    # Cache to SQLite
                    event_id = local_cache.insert_threat(payload)

                    # Build dashboard message
                    speech_text = threat_to_speech(payload)
                    dashboard_msg = json.dumps({
                        "type": "new_alert",
                        "event_id": event_id,
                        "payload": payload,
                        "speech": speech_text
                    })

                    # Broadcast to all connected browser dashboards
                    dead = set()
                    for client in dashboard_clients:
                        try:
                            await client.send_text(dashboard_msg)
                        except Exception:
                            dead.add(client)
                    dashboard_clients.difference_update(dead)

        except Exception as e:
            log.warning(f"Mesh connection lost ({e}), retrying in 3s...")
            await asyncio.sleep(3)

"""WS /ws/dashboard — live alert stream to browser dashboards.

Extracted from swarm_box/app.py `dashboard_ws()` — same behavior:
accept connection, add to shared client set, keep alive on receive,
remove on disconnect. The `dashboard_clients` set is now owned by main.py
and injected here via a small module-level reference set at app startup.
"""
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

log = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# Populated by main.py at app creation time (single shared set instance).
dashboard_clients: set[WebSocket] = set()


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket):
    await websocket.accept()
    dashboard_clients.add(websocket)
    log.info(f"Dashboard client connected ({len(dashboard_clients)} total)")
    try:
        while True:
            # keep alive; client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        dashboard_clients.discard(websocket)
        log.info(f"Dashboard client disconnected ({len(dashboard_clients)} total)")

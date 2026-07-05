# ponytail: single-file FastAPI app. No router abstractions for 4 endpoints.
import asyncio
import json
import logging
from pathlib import Path
from contextlib import asynccontextmanager

import websockets
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse

from .local_cache import init_db, insert_threat, get_all_threats
from .tts_engine import threat_to_speech
from .key_registry import load_registry_from_file, verify_payload, is_registered

logging.basicConfig(level=logging.INFO, format="[SwarmBox] %(message)s")
log = logging.getLogger(__name__)

# ---- Key registry path ----
KEYS_FILE = Path(__file__).parent / "node_keys.json"

# ---- WebSocket clients (browser dashboards) ----
dashboard_clients: set[WebSocket] = set()

# ---- Mesh listener background task ----
async def mesh_listener():
    """Connect to the mesh relay and forward alerts to cache + dashboards."""
    while True:
        try:
            async with websockets.connect("ws://localhost:8765") as ws:
                log.info("Connected to mesh relay ws://localhost:8765")
                async for raw in ws:
                    # --- Crash guard: malformed JSON ---
                    try:
                        payload = json.loads(raw)
                    except (json.JSONDecodeError, ValueError) as e:
                        log.warning(f"Malformed JSON from mesh (dropped): {str(raw)[:200]} — {e}")
                        continue

                    # --- Crash guard: missing required fields ---
                    required = ("node_id", "alert_type", "confidence", "gps", "timestamp", "signature")
                    missing = [f for f in required if f not in payload]
                    if missing:
                        log.warning(f"Payload missing fields {missing}, dropped: {str(raw)[:200]}")
                        continue

                    # --- Signature verification ---
                    if not verify_payload(payload):
                        log.warning(f"REJECTED: signature verification failed for {payload.get('node_id', '?')}")
                        continue

                    log.info(f"VERIFIED alert: {payload['alert_type']} from {payload['node_id']}")

                    # Cache to SQLite
                    event_id = insert_threat(payload)

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

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("SQLite cache initialized")
    # Load key registry
    if KEYS_FILE.exists():
        load_registry_from_file(str(KEYS_FILE))
    else:
        log.warning(f"Key registry not found at {KEYS_FILE} — run generate_keys.py first! All payloads will be REJECTED.")
    task = asyncio.create_task(mesh_listener())
    yield
    task.cancel()

app = FastAPI(title="SwarmGuard Swarm Box", lifespan=lifespan)

# ---- Static files & templates ----
STATIC_DIR = Path(__file__).parent / "static"
TEMPLATES_DIR = Path(__file__).parent / "templates"

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = TEMPLATES_DIR / "index.html"
    return HTMLResponse(content=html_path.read_text(encoding="utf-8"))

# ---- REST endpoints ----
@app.get("/api/v1/alerts")
async def list_alerts():
    return JSONResponse(content=get_all_threats())

# ---- Dashboard WebSocket ----
@app.websocket("/ws/dashboard")
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

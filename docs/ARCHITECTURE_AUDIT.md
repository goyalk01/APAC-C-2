# ARCHITECTURE_AUDIT.md — SwarmGuard AI

**Scope note:** This audit covers the actual repository (SwarmGuard AI — offline-first disaster-response edge intelligence system), not a fintech banking app. The original task template referenced a fintech UI (tabbed Personal/Business/Freelance cards, login flows) that does not exist in this codebase. This audit and the subsequent plan are adapted to the real system: a FastAPI "Swarm Box" command dashboard fed by a WebSocket mesh relay from simulated cryptographically-signed edge nodes.

---

## 1. File Map

```
APAC-C-2/
├── README.md, HANDOVER_STATE.md          [docs — ground truth status]
├── swarmguard_phase_plan.csv, swarmguard_trd_techstack.csv   [planning artifacts]
└── services/
    ├── run_demo.py, run_local.bat        [orchestration — dev-only local launcher, now legacy]
    ├── requirements.txt                  [fastapi, uvicorn, websockets, cryptography, pytest]
    │
    ├── edge_nodes/                       [BACKEND — simulated IoT/edge tier]
    │   ├── __init__.py                   [node factory/cache, scenario runner, mesh transmit]
    │   ├── edge_node.py                  [EdgeNode class — builds + signs threat payload]
    │   ├── crypto_signer.py              [Ed25519 keygen/sign/verify wrapper]
    │   ├── threat_scenarios.py           [hardcoded scenario data per node]
    │   └── node_1.py..node_5.py          [CLI entrypoints, one per simulated node]
    │
    ├── mesh_network/                     [BACKEND — transport tier]
    │   └── mesh_relay.py                 [WebSocket pub/sub hub, port 8765, in-memory clients set]
    │
    ├── swarm_box/                        [BACKEND — API + FRONTEND — currently coupled]
    │   ├── app.py                        [FastAPI app: serves HTML, static files, REST, WS]
    │   ├── key_registry.py               [Ed25519 pubkey registry + payload verification]
    │   ├── generate_keys.py              [CLI: writes node_keys.json]
    │   ├── local_cache.py                [SQLite DAL — single table threat_events]
    │   ├── tts_engine.py                 [payload → speech-text string builder]
    │   ├── node_keys.json                [generated pubkey registry, gitignored-candidate secret-adjacent]
    │   ├── swarm_cache.db                [SQLite file, runtime artifact]
    │   ├── templates/index.html          [FRONTEND — single monolithic HTML page, 4 tabs]
    │   └── static/
    │       ├── css/style.css             [FRONTEND — 1147 lines, CSS custom-property dark/light theme]
    │       ├── js/app.js                 [FRONTEND — 829 lines, all dashboard logic, WS client, Chart.js, canvas radar map, TTS]
    │       └── img/evidence_placeholder.svg
    │
    ├── cloud_layer/                      [BACKEND — dormant/stubbed cloud sync service]
    │   ├── sync_api.py                   [separate FastAPI app, POST /api/v1/sync — fake, no BigQuery writes]
    │   ├── bigquery_schema.sql           [schema only, unused]
    │   ├── Dockerfile, cloudbuild.yaml, service.yaml   [infra — Cloud Run deploy config, unused/aspirational]
    │
    └── tests/                            [pytest — crypto, edge node, key registry, swarm_box cache/TTS]
```

**Grouping:**
- **Frontend (to migrate to Next.js):** `swarm_box/templates/index.html`, `swarm_box/static/css/style.css`, `swarm_box/static/js/app.js`, `static/img/*`
- **Backend (stays Python/FastAPI, gets decoupled from HTML):** `swarm_box/app.py` (minus HTML serving), `key_registry.py`, `local_cache.py`, `tts_engine.py`, `generate_keys.py`
- **Backend — adjacent services (unchanged/out of scope for now):** `edge_nodes/*` (simulators, not a deployable API), `mesh_network/mesh_relay.py` (separate WS process), `cloud_layer/*` (stubbed, dormant)
- **Shared/config:** `requirements.txt`, `node_keys.json` (runtime secret artifact), no `.env` file currently exists — all config is hardcoded (`localhost:8765`, `localhost:8010`)
- **Infra:** `cloud_layer/Dockerfile`, `cloudbuild.yaml`, `service.yaml` (targets the dormant sync API only; the Swarm Box itself has **no Dockerfile**)
- **Tests:** `tests/test_crypto.py`, `test_edge_node.py`, `test_key_registry.py`, `test_swarm_box.py` — all backend, zero frontend tests

---

## 2. Backend Routes / Endpoints

### `swarm_box/app.py` (primary app — runs on port 8000/8010)

| Method | Path | Handler | Request | Response | Auth | DB Touched |
|---|---|---|---|---|---|---|
| GET | `/` | `index()` | none | raw HTML string (reads `templates/index.html` from disk on every request) | none | none |
| GET | `/static/*` | StaticFiles mount | none | static file bytes | none | none |
| GET | `/api/v1/alerts` | `list_alerts()` | none | `JSONResponse(list[dict])` — full row dump from `get_all_threats()`, no pagination, no filtering | none | SQLite `threat_events` (read all) |
| WS | `/ws/dashboard` | `dashboard_ws()` | connect only, client may send arbitrary text (ignored/discarded) | server pushes `{"type": "new_alert", "event_id", "payload", "speech"}` JSON frames | none | none directly (fed by `mesh_listener`) |
| (background task, not HTTP) | `mesh_listener()` | connects out to `ws://localhost:8765` as a WS **client** | consumes raw JSON frames from mesh relay | verifies sig → inserts into SQLite → broadcasts to all `dashboard_clients` | N/A | SQLite `threat_events` (insert) |

### `cloud_layer/sync_api.py` (separate app, dormant, port 8080)

| Method | Path | Handler | Request | Response | Auth | DB Touched |
|---|---|---|---|---|---|---|
| POST | `/api/v1/sync` | `sync_threats()` | JSON body: single object or array of threat payloads | `{"status": "success", "synced_events": int}` | none | **none** — only `log.info()`, no BigQuery write despite the name |

### `mesh_network/mesh_relay.py` (not an HTTP API — raw WebSocket hub, port 8765)
Pure broadcast: any connected client's message is forwarded verbatim to all other connected clients. No auth, no schema validation, no persistence.

**Auth summary across all of the above: NONE.** No session, no cookie, no token, no API key anywhere in the current system. This is a closed local-network demo assumption baked into the code.

---

## 3. Frontend Pages / Data Flow

Only **one HTML page** exists: `templates/index.html`, rendered client-side into 4 tab "panes" via JS (`app.js` toggles `.active` class — no server routing per tab).

| Tab (client-side view) | Backend calls | Data flow mechanism |
|---|---|---|
| Dashboard (`#tab-dashboard`) | `GET /api/v1/alerts` (once, on page load) + `WS /ws/dashboard` (continuous) | **Hybrid**: REST fetch for initial/historical state (`fetch('/api/v1/alerts')` in `app.js:178`), then WebSocket push for live updates (`ws.onmessage` → `handleNewAlert`) |
| Mesh Topology (`#tab-mesh`) | none (reuses in-memory state already pushed via WS) | Pure client-side render from JS state (`nodeTelemetry` object is **entirely fabricated/simulated in the browser** — not real telemetry from edge nodes) |
| Analytics & Logs (`#tab-analytics`) | none (reuses in-memory `alertCounts`/`confidenceData` state) | Client-side Chart.js rendering from accumulated WS events |
| Cloud Sync (`#tab-sync`) | **none — `syncNowBtn` click handler is a fully fake `setInterval` animation** (`app.js:472-534`). It never calls `POST /api/v1/sync`. It fabricates progress bar %, then clears local state. | Zero backend interaction despite the UI implying a real sync |

**Critical finding:** The "Cloud Sync" tab's UI implies it talks to `cloud_layer/sync_api.py`, but it does not — it's pure front-end theater. This must be flagged, not silently "fixed," per constraints.

There is no server-side templating/injection of data into HTML (`index()` just returns the static file content verbatim) — so the frontend is *already* effectively data-blank at initial render, all data arrives via fetch + WebSocket. This is actually the easiest possible starting point for decoupling.

---

## 4. End-to-End Request Lifecycles (sequence form)

### Lifecycle A — Live threat alert (mesh → dashboard)
```
EdgeNode (edge_node.py)
  → generate_threat_payload() [builds dict, signs with Ed25519 → adds "signature" key]
  → websocket.send(json.dumps(payload))                     [to ws://localhost:8765]

MeshRelay (mesh_relay.py)
  → relay_handler() receives message
  → broadcasts verbatim to all OTHER connected clients        [no validation, no auth]

SwarmBox.mesh_listener() (app.py, background task, itself a WS client of the relay)
  → receives raw frame
  → json.loads()                     [guarded: malformed JSON dropped]
  → check required fields present    [guarded: missing fields dropped]
  → key_registry.verify_payload()    [Ed25519 verify against node_keys.json registry]
  → local_cache.insert_threat()      [SQLite INSERT, generates event_id UUID]
  → tts_engine.threat_to_speech()    [builds spoken text string]
  → broadcast JSON {"type":"new_alert", event_id, payload, speech} to all dashboard_clients (WS)

Browser (app.js)
  → ws.onmessage → handleNewAlert(data)
  → mutates in-memory JS state (alertCounts, nodeTelemetry, alertsList)
  → DOM: createAlertCard(), updateCharts(), drawTacticalMap() [canvas], playAudioSynthesis() [Web Speech API]
```

### Lifecycle B — Initial dashboard load (historical alerts)
```
Browser navigates to http://host:8010/
  → GET /  → app.py index() → reads templates/index.html from disk → returns raw HTML (no data injected)
  → browser loads /static/css/style.css, /static/js/app.js, /static/vendor/chart.umd.min.js  [GET /static/*]
  → app.js executes on load:
       → new WebSocket(ws://host/ws/dashboard)                [opens persistent connection]
       → fetch('/api/v1/alerts')
             → app.py list_alerts() → local_cache.get_all_threats() → SQLite SELECT * ORDER BY id DESC
             → JSONResponse(list of row dicts)
       → .then(alerts => alerts.reverse().forEach(a => handleNewAlert({payload: reshaped(a)}, silent=true)))
  → DOM populated with historical cards silently (no TTS, no flash)
```

### Lifecycle C — "Cloud Sync" button (currently fake, flagged for Phase 2/3 decision)
```
User clicks #syncNowBtn (app.js:472)
  → NO network call is made
  → setInterval() locally fabricates progress 0%→100% over ~3.2s with hardcoded addLogLine() messages
       claiming "TLS handshake", "streaming to Cloud Run /sync", "BigQuery upload"
  → on completion: clears ALL local in-memory state (alertsList, counts, DOM feed) — but SQLite DB is UNTOUCHED
  → Real backend cloud_layer/sync_api.py (POST /api/v1/sync) is never invoked and has no CORS/route wiring to swarm_box at all — they are two separate unconnected FastAPI processes.
```

---

## 5. Non-Negotiable Coupling Points (frontend ↔ backend)

| # | Coupling | Detail | Impact on decoupling |
|---|---|---|---|
| 1 | **Same-origin static serving** | `app.py` mounts `/static` and serves `index.html` from the same FastAPI process that hosts `/api/v1/alerts` and `/ws/dashboard`. Frontend JS uses **relative paths** (`/static/...`, `fetch('/api/v1/alerts')`, `` `ws://${location.host}/ws/dashboard` ``). | Must be replaced with absolute/configurable base URLs once frontend moves to Next.js on a different origin/port. `location.host` trick breaks immediately. |
| 2 | **No CORS configuration at all** | FastAPI app has zero `CORSMiddleware`. Currently works only because everything is same-origin. | Must add explicit CORS allow-list for the Next.js dev origin (`localhost:3000`) and prod origin (Vercel domain). |
| 3 | **WebSocket is the primary data channel, not just an enhancement** | Live alerts ONLY arrive via `/ws/dashboard`; there is no polling fallback. Next.js frontend must implement its own WS client (React Query doesn't natively do WS — needs a custom hook or SWR-with-WS-mutate pattern). | Architecturally significant — this is not a simple REST wrapper job. |
| 4 | **In-browser fabricated state treated as source of truth** | `nodeTelemetry` (CPU/RAM/battery/signal) is 100% client-side random-jitter fake data, never sent by any node. If naively "kept as-is" during migration, it'll look like real backend data in the new frontend too. | Must flag: is this fake telemetry intentional demo dressing (keep, labeled) or should real backend expose it? Recommend keeping as clearly-labeled simulated overlay, not wiring to a real endpoint (no real endpoint exists). |
| 5 | **Cloud Sync button is entirely fake** | See Lifecycle C. No real endpoint call exists to move to a typed API client. | Must ask: should Phase 2/3 wire this to the *real* (but still stubbed) `cloud_layer/sync_api.py`, or keep it as a labeled simulation? This is a product decision, not a structural one. |
| 6 | **`node_keys.json` is a shared secret-adjacent artifact** | Generated by `swarm_box/generate_keys.py`, read by `app.py` at startup. Not an env var — a flat file checked into the `swarm_box/` directory (visible in file listing, likely NOT gitignored — needs verification). | Should move to env-var-driven path or a proper secrets location in the decoupled backend; irrelevant to frontend. |
| 7 | **Hardcoded ports/hosts everywhere** | `ws://localhost:8765` (mesh relay address) is hardcoded in `app.py`, `edge_nodes/__init__.py`, and node scripts. `run_demo.py` hardcodes port 8010. No `.env` file exists anywhere in the repo. | Phase 1 env strategy must introduce configurable host/port for every service. |
| 8 | **Two separate FastAPI apps, no shared code, no API versioning discipline** | `swarm_box/app.py` uses `/api/v1/alerts`; `cloud_layer/sync_api.py` uses `/api/v1/sync` — versioned by convention only, not enforced, and they don't share a router/schema layer. | Phase 1 must define one real OpenAPI contract; decide if these merge into one backend service or stay split (recommend: document as two logically separate services, only `swarm_box` gets a frontend). |
| 9 | **CSS theme (dark/light) is a client-side `data-theme` attribute + `localStorage`** | Not server-coupled, but worth noting: theming logic (1147-line CSS custom-property file) needs a full Tailwind token remapping, not a copy-paste. | Frontend-only concern, flagged for Phase 3. |

---

## 6. Environment Variables / Secrets Inventory

**Current state: there are effectively none.** A full search confirms no `.env`, `os.environ`, or `os.getenv` usage anywhere in `services/`. All configuration is hardcoded literals:

| Value | Hardcoded location(s) | Should become |
|---|---|---|
| Mesh relay host/port (`localhost:8765`) | `swarm_box/app.py:31`, `edge_nodes/__init__.py:53`, `mesh_network/mesh_relay.py:25` | `MESH_RELAY_URL` (backend env) |
| Swarm Box host/port (`127.0.0.1:8010` in `run_demo.py`; `--port 8000` in README) | `run_demo.py:44-47`, README Quick Start | `API_HOST`, `API_PORT` (backend env) |
| Cloud Sync API port (`8080`) | `cloud_layer/sync_api.py:28` | `SYNC_API_PORT` (backend env, if ever activated) |
| Key registry file path | `swarm_box/app.py:21`, `generate_keys.py:19` | `NODE_KEYS_PATH` (backend env) |
| SQLite DB path | `local_cache.py:7` | `DATABASE_URL` or `SQLITE_PATH` (backend env) |
| Frontend API base URL | N/A (frontend uses relative paths / `location.host`) | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WS_URL` (frontend env, once decoupled) |
| CORS allowed origins | N/A (doesn't exist) | `CORS_ALLOWED_ORIGINS` (backend env) |

No API keys, DB passwords, or third-party credentials exist in the codebase currently — the only semi-sensitive artifact is `node_keys.json` (public keys only, so low sensitivity, but should still be treated as generated/runtime data, not committed).

---

## Open Questions Before Phase 1 (flagging per constraints — asking rather than guessing)

1. **Cloud Sync tab**: keep as a clearly-labeled simulated/demo interaction, or wire it to the real (still-stubbed) `cloud_layer/sync_api.py` as part of this migration?
2. **`cloud_layer/sync_api.py`**: in scope for this decoupling effort at all, or explicitly out of scope (per HANDOVER_STATE.md, it's part of the deferred "Path B" cloud features)?
3. **Node telemetry data** (CPU/RAM/battery in Mesh Topology tab): confirmed fake/simulated — keep as labeled simulation in the new frontend, correct?
4. **Deployment targets**: confirm frontend → Vercel is desired even though this dashboard's core value (WebSocket real-time mesh feed) assumes a long-lived local network demo context — Vercel + a separately hosted backend (Render/Fly) WS connection needs to be validated for the offline-first demo narrative.

Stopping here per instructions — awaiting confirmation before Phase 1 (Target Architecture Design).

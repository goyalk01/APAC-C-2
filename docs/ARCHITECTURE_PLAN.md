# ARCHITECTURE_PLAN.md — SwarmGuard AI Target Architecture

Supersedes nothing in ARCHITECTURE_AUDIT.md; builds on it. Decisions below reflect answers to the 4 open questions (Phase 0) and 3 plan decisions (Phase 1) — **ALL RESOLVED, this document is final:**

**Phase 0 answers:**
1. **Cloud Sync tab** → kept as a clearly-labeled simulation, no real backend call.
2. **`cloud_layer/`** → documented here as a future service; its code is NOT touched/restructured in this migration.
3. **Fake node telemetry** → kept, ported to TSX, with a visible "Simulated" badge/tooltip so it's never mistaken for real data.
4. **Deployment** → all services made env-configurable in Phases 1-4; actual hosting/topology decision deferred to Phase 5.

**Phase 1 decisions:**
5. **Auth** → optional shared API-key header (`X-SwarmGuard-Key`) IS adopted — off by default in dev, recommended on for public deployment.
6. **New `/api/v1/alerts/{event_id}` endpoint** → REJECTED. Contract stays strictly 1:1 with today: `GET /api/v1/alerts` only.
7. **`services/` relocation** → Decided to preserve `edge_nodes/`, `mesh_network/`, and `cloud_layer/` under the renamed `/services/` root folder during cleanup.


---

## 1. Target Folder / Repo Structure

**Recommendation: Monorepo**, single repo, two independently deployable apps.

```
APAC-C-2/
├── apps/
│   ├── web/                     # Next.js 15 App Router + TS + Tailwind (NEW)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                    # Dashboard (default view)
│   │   │   ├── mesh/page.tsx               # Mesh Topology tab → real route
│   │   │   ├── analytics/page.tsx          # Analytics & Logs tab → real route
│   │   │   └── sync/page.tsx               # Cloud Sync (simulated) tab → real route
│   │   ├── components/
│   │   │   ├── nav/CommandNav.tsx
│   │   │   ├── alerts/AlertFeed.tsx, AlertCard.tsx
│   │   │   ├── map/TacticalMap.tsx         # canvas radar, ported
│   │   │   ├── charts/ThreatDoughnut.tsx, ConfidenceBar.tsx
│   │   │   ├── evidence/EvidenceViewer.tsx
│   │   │   ├── telemetry/NodeTelemetryGrid.tsx  # has "Simulated" badge
│   │   │   ├── sync/CloudSyncPanel.tsx     # has "Simulated" badge
│   │   │   └── ui/ (Pill, Badge, Card, StatChip — shared primitives)
│   │   ├── lib/
│   │   │   ├── api.ts                      # typed REST client
│   │   │   ├── useAlertsSocket.ts          # WS hook (React Query cache bridge)
│   │   │   └── types.ts                    # shared response/domain types
│   │   ├── styles/globals.css              # Tailwind + design tokens (dark/light)
│   │   ├── next.config.ts, tailwind.config.ts, tsconfig.json
│   │   └── .env.local.example
│   │
│   └── api/                     # FastAPI backend (RESTRUCTURED from swarm_box/)
│       ├── app/
│       │   ├── main.py                     # app factory, CORS, middleware, lifespan
│       │   ├── routers/
│       │   │   ├── alerts.py               # GET /api/v1/alerts (only — no single-item route)
│       │   │   ├── health.py               # /healthz, /readyz
│       │   │   └── ws.py                   # /ws/dashboard

│       │   ├── services/
│       │   │   ├── key_registry.py         # moved as-is (logic unchanged)
│       │   │   ├── local_cache.py          # moved as-is
│       │   │   ├── tts_engine.py           # moved as-is
│       │   │   └── mesh_listener.py        # extracted background task
│       │   ├── schemas/                    # pydantic models (request/response contracts)
│       │   │   └── threat.py
│       │   ├── core/
│       │   │   ├── config.py               # pydantic Settings (env-driven)
│       │   │   ├── logging.py              # structured logging config
│       │   │   └── errors.py               # centralized exception handlers
│       │   └── generate_keys.py            # moved as-is
│       ├── tests/                          # moved + extended
│       ├── requirements.txt
│       ├── Dockerfile                      # NEW
│       └── .env.example
│
├── services/                     # Reorganized location for core simulation services
│   ├── edge_nodes/               # Simulated threat transmitter nodes
│   ├── mesh_network/             # WebSocket mesh relay broadcast hub
│   └── cloud_layer/              # Dormant cloud sync mock API
│
├── docs/                         # Documentations and CSV assets
│   ├── ARCHITECTURE_AUDIT.md
│   ├── ARCHITECTURE_PLAN.md
│   └── HANDOVER_STATE.md
├── README.md
├── docker-compose.yml            # Runs apps/api + services/mesh_network together
└── .github/workflows/ci.yml      # NEW — Phase 4
```

**Tradeoffs (monorepo vs. two repos):**
- Monorepo chosen because: single source of truth for the API contract, one PR can touch both sides during this migration, simpler for a small team/hackathon-scale project, Vercel and Render/Fly both support "root directory" monorepo deploys natively.
- Downside accepted: slightly heavier repo, need path-based CI triggers later (Phase 4) so a frontend-only change doesn't re-run backend tests and vice versa.
- **Final scope of `apps/` restructuring**: only `swarm_box/` (the actual API + dashboard) is restructured into `apps/api` + `apps/web`. `edge_nodes/`, `mesh_network/`, and `cloud_layer/` reside in `services/` (renamed from `swarmguard-ai/`).


---

## 2. API Contract (OpenAPI-style, versioned `/api/v1`)

### `apps/api` — Swarm Box Service

```yaml
openapi: 3.0.3
info:
  title: SwarmGuard Swarm Box API
  version: "1.0"
servers:
  - url: /api/v1

paths:
  /alerts:
    get:
      summary: List all cached threat alerts (most recent first)
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 100 }
        - name: offset
          in: query
          schema: { type: integer, default: 0 }
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items: { $ref: '#/components/schemas/ThreatEvent' }
                  total: { type: integer }
        '500':
          $ref: '#/components/responses/Error'

  /healthz:
    get:
      summary: Liveness probe
      responses:
        '200': { description: "OK — process is alive" }

  /readyz:
    get:
      summary: Readiness probe — checks SQLite connectivity + key registry loaded
      responses:
        '200': { description: "Ready" }
        '503': { description: "Not ready (DB unreachable or key registry empty)" }

components:
  schemas:
    ThreatEvent:
      type: object
      required: [event_id, node_id, alert_type, confidence, latitude, longitude, timestamp, model_version, signature, received_at]
      properties:
        event_id: { type: string, format: uuid }
        node_id: { type: string }
        alert_type:
          type: string
          enum: [BRIDGE_COLLAPSE, FLOODING, STRUCTURAL_FIRE, GAS_LEAK, CROWD_STAMPEDE]
        confidence: { type: number, minimum: 0, maximum: 1 }
        latitude: { type: number }
        longitude: { type: number }
        timestamp: { type: string, format: date-time }
        model_version: { type: string }
        visual_proof_hash: { type: string, nullable: true }
        signature: { type: string }
        received_at: { type: string, format: date-time }
        synced_to_cloud: { type: boolean }

  responses:
    Error:
      description: Standard error envelope
      content:
        application/json:
          schema:
            type: object
            properties:
              error:
                type: object
                properties:
                  code: { type: string }
                  message: { type: string }
                  details: { type: object, nullable: true }

# WebSocket (documented, not OpenAPI-native):
# WS /ws/dashboard
#   Server → Client frames:
#     { "type": "new_alert", "event_id": string, "payload": ThreatEvent-shaped, "speech": string|null }
#     { "type": "pong" }  (heartbeat reply, NEW — see infra needs below)
#   Client → Server frames:
#     "ping" (text) — heartbeat, NEW
```

**Changes from current behavior (structural only, not business logic):**
- `/api/v1/alerts` gains optional `limit`/`offset` pagination params (currently returns everything unbounded) and wraps the array in `{items, total}` instead of a bare array — this is a contract normalization, not a logic change (same underlying `get_all_threats()` query, just paginated at the response layer).
- **No single-item `/api/v1/alerts/{event_id}` endpoint** — per Decision 2, the contract stays 1:1 with today's single list-endpoint. The evidence viewer will continue to work from data already present in the list/WS payload, exactly as it does now.
- Error response envelope standardized (today, unhandled errors would produce FastAPI's default 500 HTML/JSON — inconsistent). This is a structural/consistency addition, not new business behavior.
- `/healthz` and `/readyz` are net-new (needed for Phase 5 deployment health checks, required by Render/Fly/Railway).
- New optional `X-SwarmGuard-Key` header check (per Decision 1) — enforced via FastAPI dependency only when `SWARMBOX_API_KEY` env var is set; absent env var = auth disabled (dev default).


### `cloud_layer/sync_api.py` (documented only, per Q2 — NOT modified)
Existing contract stands as-is:
```
POST /api/v1/sync
  body: ThreatEvent | ThreatEvent[]
  200: { status: "success", synced_events: number }
```
No changes proposed. Listed here purely for completeness of the system's full API surface.

---

## 3. Auth Strategy — DECIDED

**Current state: no auth anywhere.** 

**Decision: adopt the optional shared API-key header.**

- A single shared **API key header** (`X-SwarmGuard-Key`), checked via a FastAPI dependency on protected routes (`/api/v1/alerts`, `/ws/dashboard` handshake), configured via env var `SWARMBOX_API_KEY`.
- **Off by default** when `SWARMBOX_API_KEY` is unset (local dev stays frictionless, matches current zero-auth behavior exactly).
- **On** when the env var is set (recommended for any public/staging/prod deployment) — requests without a matching header get `401` in the standard error envelope.
- Frontend sends the key via `apps/web` server-side only (Route Handler proxy, see §5) if the key must be treated as a real secret — OR directly from the browser if the operator considers the key a low-sensitivity "shared secret" akin to the current pre-shared node key model (matches the project's existing "no CA needed, pre-shared model" security philosophy per HANDOVER_STATE.md).
- No JWT/session/refresh-token flow — there's no user identity concept in this system to attach a token to, and inventing one would violate "don't change business logic."


---

## 4. Environment Config Strategy

| Variable | Side | Example | Notes |
|---|---|---|---|
| `MESH_RELAY_URL` | backend | `ws://localhost:8765` | replaces hardcoded string in `app.py`, `edge_nodes/__init__.py` |
| `API_HOST` / `API_PORT` | backend | `0.0.0.0` / `8010` | replaces `run_demo.py` hardcoding |
| `NODE_KEYS_PATH` | backend | `./node_keys.json` | replaces hardcoded `Path(__file__).parent / "node_keys.json"` |
| `SQLITE_PATH` | backend | `./swarm_cache.db` | replaces hardcoded path in `local_cache.py` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000,https://swarmguard.vercel.app` | comma-separated allow-list |
| `SWARMBOX_API_KEY` | backend (optional) | (secret) | unset in dev = auth disabled; set in staging/prod = enforced |

| `LOG_LEVEL` | backend | `INFO` | Phase 2 structured logging |
| `NEXT_PUBLIC_API_BASE_URL` | frontend | `http://localhost:8010/api/v1` | public — safe to expose, no secrets |
| `NEXT_PUBLIC_WS_URL` | frontend | `ws://localhost:8010/ws/dashboard` | public |
| `SWARMBOX_API_KEY` (server-only, NOT `NEXT_PUBLIC_*`) | frontend (Route Handler only) | (secret) | used only inside `app/api/proxy/[...path]/route.ts` if the key is treated as a real secret; never exposed to the browser bundle |


Files: `apps/api/.env.example`, `apps/web/.env.local.example` (dev) and platform-level env config for `.env.production` equivalents (Vercel/Render dashboards) in Phase 5 — no `.env.production` file committed to repo (secrets never committed).

---

## 5. Route Handler / Server Action vs. Real Backend Call

Per constraint "don't silently move business logic into the frontend":

| Concern | Where it lives | Why |
|---|---|---|
| Fetching alerts list, single alert | Real backend call (`GET /api/v1/alerts`) via `lib/api.ts` + React Query | Business logic (SQLite query) stays in FastAPI, unchanged |
| Live alert stream | Real backend WebSocket (`/ws/dashboard`), consumed directly from the browser via a custom `useAlertsSocket` hook | WS auth/signature verification/caching logic stays server-side; frontend is a pure consumer |
| Threat-to-speech text generation | Stays backend (`tts_engine.py`), payload already includes `speech` field pushed over WS | Do not reimplement in frontend — would duplicate/diverge business logic |
| Evidence canvas rendering | **Frontend-only, and correctly so** — this was already pure client-side canvas drawing using data already present in the alert payload (no new backend logic needed; it's presentation, not business logic) |
| Node telemetry (CPU/RAM/battery) | **Frontend-only simulation, explicitly labeled** (per Q3) — was never backed by a real endpoint, stays that way, ported verbatim | Not a "server call moved to frontend" — it never had a server implementation to begin with |
| Cloud Sync button | **Frontend-only simulated animation, explicitly labeled** (per Q1) — no Route Handler, no real fetch | Prevents implying a fake capability is real |
| Theme (dark/light) persistence | Frontend only (`localStorage` equivalent, e.g. a client component + cookie for SSR-safe hydration) | Pure UI preference, no backend concern, matches current behavior |
| API-key auth header injection (adopted, Decision 1) | **Next.js Route Handler proxy** (`app/api/proxy/[...path]/route.ts`) if the key is treated as a real secret; otherwise sent directly client→backend as a shared/low-sensitivity key (operator's choice at deploy time) | Prevents an unnecessary secret leak into the browser bundle if the key is meant to be truly private |


No Server Actions are needed — this system has no form mutations from the frontend (it's a read + WS-subscribe dashboard, not a CRUD app). This is called out explicitly rather than force-fitting Server Actions where none apply.

---

## 6. New Infra Needs

- **CORS policy**: `CORSMiddleware` in FastAPI, allow-list driven by `CORS_ALLOWED_ORIGINS` env var; credentials off (no cookies in play) unless API-key-via-cookie is later adopted.
- **Typed API client**: single `apps/web/lib/api.ts` — thin `fetch` wrapper returning typed results (`ThreatEvent[]`, etc.), no ad-hoc fetches in components. Paired with **React Query** for caching/retry/loading states on `/api/v1/alerts`.
- **WebSocket client**: custom hook `useAlertsSocket()` wrapping native `WebSocket`, exposing `{status, lastAlert}`; bridges into React Query cache via `queryClient.setQueryData` on new frames (documented pattern, since RQ/SWR don't natively manage WS push).
- **Error boundary strategy**: Next.js `error.tsx` per route segment + a top-level `global-error.tsx`; React Query's `isError` states drive inline empty/error UI in data views (per Phase 3 requirement).
- **Rate limiting**: lightweight in-process limiter (e.g. `slowapi` for FastAPI) on `/api/v1/alerts` — currently unbounded reads are cheap (SQLite, single table) but a public deployment should still cap request rate. New infra addition, not a logic change.
- **Health-check endpoints**: `/healthz` (liveness) and `/readyz` (readiness: SQLite reachable + key registry loaded) — required for Render/Fly/Railway health probes in Phase 5.
- **Structured logging**: replace ad-hoc `logging.basicConfig` string format with a consistent JSON-capable logger (still human-readable in dev), one logger per module, correlation via `event_id` where applicable.
- **Centralized error handling**: FastAPI exception handlers mapping known exceptions (validation, not-found, DB errors) to the standard error envelope from §2.

---

## Summary of What Changes vs. What's Preserved

**Preserved exactly (per "don't touch business logic" constraint):**
- Ed25519 signing/verification logic, key registry semantics
- SQLite schema and queries
- TTS text generation logic
- Mesh relay broadcast behavior
- Node telemetry fabrication logic (relocated, relabeled, not rewritten)
- Cloud Sync fake animation logic (relocated, relabeled, not wired to real backend)
- `cloud_layer/` — completely untouched

**Structurally changed (Phase 2/3 scope):**
- HTML/JS split out of FastAPI (`swarm_box/`) into a separate Next.js app (`apps/web`); backend restructured into `apps/api`
- `/api/v1/alerts` gains pagination + envelope, stays the ONLY alerts endpoint (no single-item route)
- New `/healthz`, `/readyz` endpoints added
- CORS, structured logging, centralized error handling, rate limiting added
- All hardcoded hosts/ports/paths become env vars
- Optional `X-SwarmGuard-Key` API-key auth header added (off by default in dev, on via env var for public deployment)
- `edge_nodes/`, `mesh_network/`, `cloud_layer/` reside under `services/`

---

## All Decisions Resolved — Proceeding to Phase 2

Phase 0 (4 questions) and Phase 1 (3 decisions) are fully resolved and reflected throughout this document. No outstanding decisions remain. Proceeding to Phase 2 (Backend Decoupling).



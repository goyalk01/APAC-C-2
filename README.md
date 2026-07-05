# SwarmGuard AI

Offline-first edge intelligence for disaster response. Edge nodes run local threat inference, sign payloads cryptographically, and propagate alerts through a WebSocket mesh relay to a decoupled Swarm Box dashboard.

---

## Repository Structure

- `apps/api/` — Decoupled FastAPI JSON/WebSocket backend.
- `apps/web/` — Decoupled Next.js 15 + TypeScript + Tailwind CSS dashboard app.
- `swarmguard-ai/edge_nodes/` — Simulated IoT edge node tier (Ed25519 signing).
- `swarmguard-ai/mesh_network/` — Simulated WebSocket mesh relay hub.
- `swarmguard-ai/cloud_layer/` — Dormant schematics for cloud-sync capability.

---

## Local Development Setup

### 1. Backend Prerequisites (Python 3.11+)
Install dependencies for the FastAPI backend:
```bash
pip install -r apps/api/requirements.txt
```

### 2. Frontend Prerequisites (Node 20+)
Install packages for the Next.js frontend:
```bash
cd apps/web
npm install
cd ../..
```

### 3. Run Everything Together
To launch the full pipeline (Mesh Relay + API Backend + Frontend + Staggered Simulation Nodes) with a single command:
```bash
python run_decoupled_demo.py
```
Visit:
- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **API Backend docs:** [http://localhost:8010/docs](http://localhost:8010/docs)

---

## Environment Variables Reference

### Backend (`apps/api/`)
Configure these variables in a `.env` file inside `apps/api/` or on your hosting provider:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `API_HOST` | `0.0.0.0` | Host interface to bind the FastAPI server to. |
| `API_PORT` | `8010` | Port interface to bind the FastAPI server to. |
| `MESH_RELAY_URL` | `ws://localhost:8765` | WebSocket URL of the mesh relay client connection. |
| `SQLITE_PATH` | `./swarm_cache.db` | Directory path where SQLite database is written. |
| `NODE_KEYS_PATH` | `./node_keys.json` | Directory path where public key registry is stored. |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated list of permitted CORS frontend hosts. |
| `SWARMBOX_API_KEY` | *(unset)* | Shared API key (`X-SwarmGuard-Key`). Leave unset to disable auth in dev. |
| `LOG_LEVEL` | `INFO` | Console log verbosity level. |
| `SENTRY_DSN` | *(unset)* | DSN hook for backend Sentry error monitoring. |

### Frontend (`apps/web/`)
Configure these variables in a `.env.local` file inside `apps/web/` or on your hosting provider:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8010/api/v1` | Public REST API base endpoint for alerts. |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8010/ws/dashboard` | Public WebSocket endpoint for real-time alerts. |
| `NEXT_PUBLIC_SENTRY_DSN` | *(unset)* | Public client-side Sentry hook. |

---

## Independent PaaS Deployment (Phase 5 Overview)

Both applications are fully decoupled and designed for independent, scalable PaaS deployment:

### Backend Deployment (Render / Fly.io / Cloud Run)
- Build container via [apps/api/Dockerfile](file:///e:/VS%20Code/Combination/Hackathon/APAC-C-2/apps/api/Dockerfile).
- Run and expose port `8010`.
- Setup env vars `MESH_RELAY_URL` (pointing to your relay), `CORS_ALLOWED_ORIGINS` (pointing to your deployed Next.js URL), and `SWARMBOX_API_KEY` (if authentication is enabled).

### Frontend Deployment (Vercel / Netlify)
- Link `/apps/web` root directory to Vercel.
- Configure `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_URL` env vars to target your live deployed backend API.
- Deploy with standard Next.js build presets.


# SwarmGuard AI

Offline-first edge intelligence for disaster response. Edge nodes run local threat inference, sign payloads cryptographically, and propagate alerts through a relay network to a Swarm Box — a decoupled zero-dependency command dashboard with voice broadcast.

## What's Built and Working

- **Edge Node Simulator** — 5 simulated nodes generating signed threat JSON with Ed25519 cryptographic signatures (located in the project root)
- **Cryptographic Verification** — End-to-end: nodes sign payloads, Swarm Box verifies signatures against a pre-shared key registry before caching
- **Relay Network** — WebSocket-based relay hub broadcasting alerts to all connected Swarm Boxes
- **Decoupled Swarm Box Dashboard** — Real-time Next.js 15 frontend in `apps/web` with alert feed, analytics chart, evidence viewer, and TTS voice broadcast
- **Decoupled Swarm Box API** — Pure FastAPI JSON API backend in `apps/api` (SQLite data persistence)
- **Fully Offline** — All assets (fonts, scripts, images) bundled locally. No CDN or API dependencies during blackout operation

## Quick Start

```bash
# 1. Install Python backend dependencies
pip install -r apps/api/requirements.txt

# 2. Install Next.js frontend dependencies
cd apps/web
npm install
cd ../..

# 3. Launch everything end-to-end
python run_decoupled_demo.py
```

This dev launcher scripts will generate matching keys, start the mesh relay, spin up the API backend, start the frontend dev server, and stagger-run the edge node simulations.

## Decoupled Architecture

```
Edge Nodes (5x)          Relay Hub             API Backend (apps/api)      Frontend UI (apps/web)
┌─────────────┐     ┌────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│ Local Infer  │     │  WebSocket     │     │ FastAPI + SQLite    │     │ Next.js 15 Dashboard │
│ Sign (Ed25519)│────▶│  Broadcast    │────▶│ verify signature    │◀────│ Read alerts (REST)   │
│ Transmit JSON│     │  Hub          │     │ cache → WS broadcast│     │ WS live alerts stream│
└─────────────┘     └────────────────┘     └─────────────────────┘     └──────────────────────┘
```

## Tests

```bash
# Run backend tests
pytest apps/api/tests/ -v
```


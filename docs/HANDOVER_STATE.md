# SwarmGuard AI — Handover State
**Context:** This is the ground-truth state of the decoupled codebase as of handover.

## 1. Ground Truth Status Table

| Component | Status | Code Proof (File:Line) | What "Done" Requires |
|---|---|---|---|
| **Edge Node Simulator** | **WORKING** | `services/edge_nodes/edge_node.py:8` (generates signed payload) | ✅ Jitter added — confidence ±5%, delay +1-3s, GPS ±0.001° |
| **Cryptographic Signing** | **WORKING** | `services/edge_nodes/crypto_signer.py:6` (Ed25519 sign) | ✅ End-to-end: keys pre-shared via `node_keys.json`, verified in backend API |
| **Signature Verification** | **WORKING** | `apps/api/app/services/key_registry.py` | ✅ All payloads verified before caching. Tampered/unknown payloads rejected. |
| **Mesh Routing** | **PARTIAL** | `services/mesh_network/mesh_relay.py` (broadcast loop) | Centralized WebSocket hub, not a mesh. Prototype uses WebSocket relay. |
| **Decoupled API Backend** | **WORKING** | `apps/api/app/main.py` (FastAPI app) | ✅ Pure JSON API, CORS configured, env-driven config. |
| **Decoupled Frontend UI** | **WORKING** | `apps/web/src/app/page.tsx` (Next.js 15 app) | ✅ Rebuilt fully offline, dynamic charts, radar canvas, TTS. |
| **Swarm Box (TTS)** | **WORKING** | `apps/api/app/services/tts_engine.py` / `AlertsContext.tsx` | Template-based NLG + Browser Web Speech API. |
| **Offline Assets** | **WORKING** | `apps/web/package.json` | ✅ Local package-based dependencies (`chart.js`). No CDNs. |
| **Evidence Viewer** | **WORKING** | `apps/web/src/components/dashboard/EvidenceViewer.tsx` | ✅ Canvas-generated evidence images. No external URLs. |
| **Cloud Run Sync API** | **STUBBED** | `services/cloud_layer/sync_api.py` | Loops payloads, logs to console, returns success. No BigQuery. |
| **BigQuery Integration** | **STUBBED** | `services/cloud_layer/bigquery_schema.sql` | Schema file exists, zero Python code writes to it. |
| **Pub/Sub Streaming** | **NOT STARTED** | N/A | Zero code exists. |
| **ADK Conversational Agent**| **DEFERRED** | N/A | Explicitly deferred per Path A decision. |

---

## 2. Resolved Contradictions

These contradictions have been fixed in code, docs, and CSVs:

*   ✅ **RESOLVED: Gemini Flash for Offline TTS.**
    *   **Fix:** Removed all Gemini Flash claims. TTS is template-based NLG (`tts_engine.py`) + Browser Web Speech API.

*   ✅ **RESOLVED: End-to-End Cryptographic Security.**
    *   **Fix:** Decoupled backend verifies Ed25519 signatures before caching via standard settings path `NODE_KEYS_PATH`.

*   ✅ **RESOLVED: Offline-capable Dashboard.**
    *   **Fix:** Next.js uses local dependencies without external network dependency constraints.

---

## 3. Path Decision: PATH A — Harden Offline Stack ✅

The team chose **PATH A** — making the offline demo bulletproof. All Phase 3-6 cloud features are explicitly deferred.

---

## 4. Landmines for Whoever Touches This Next

*   **`services/cloud_layer/sync_api.py` (The Fake API):** Returns `{"status": "success"}` no matter what. No BigQuery writes.
*   **Key Registry:** `node_keys.json` must be regenerated if edge nodes are recreated. Run `python -m app.generate_keys` in `apps/api/`.
*   **Node Cache:** Edge nodes use `_node_cache` in `services/edge_nodes/__init__.py` to ensure the same keypair is used for key export and transmission within a session.

---

## 5. What Not to Touch

*   **`apps/api/app/services/local_cache.py` (WORKING):** SQLite schema and DAL work perfectly.
*   **`services/edge_nodes/crypto_signer.py` (WORKING):** Ed25519 signing is cryptographically sound.
*   **The JSON Payload Schema:** `services/edge_nodes/edge_node.py` generates specific keys (`gps.lat`, `confidence`, `alert_type`, `signature`), which API and Next.js extract. Do not rename or change these keys.

---

## 6. Definition of Done — Status

1.  [x] Next.js uses package-level Chart.js and local font mappings.
2.  [x] Evidence viewer displays local Canvas-generated verification proof.
3.  [x] Decoupled backend wraps JSON parsing in robust `try/except` block.
4.  [x] Decoupled backend verifies Ed25519 signature against registry public keys.
5.  [x] Simulation edge nodes use jitter.

---

## 7. UI Theme Overhaul & Polish (Warm SaaS Aesthetic)

*   **Dark Theme Overhaul**: Replaced the previous neon-cyberpunk tactical style (blue-black background, bright neon-green highlights) with a premium warm SaaS theme:
    *   **Palette**: Charcoal `#111113` background, stone-scale grays (`#f5f5f4`, `#a8a29e`, `#78716c`), and amber `#f59e0b` accents.
    *   **Light Mode**: Maintained clean, original light theme styling.
    *   **Unified Variables**: 45 CSS variables updated in `apps/web/src/app/globals.css`.
    *   **Canvas Elements**: Coordinate overlays, tactical mesh lines, radar sweeps, and Evidence Viewer grids updated in `TacticalMap.tsx` and `EvidenceViewer.tsx` to match the new dark mode design system.
    *   **Style Bug Fix**: Resolved the conflicting `borderColor` vs `borderLeftColor` console error in dashboard cards.
    *   **Showcase Images**: Saved and linked E2E verification screenshots of all dashboard pages in `docs/images/` and integrated them into the root `README.md`.


## 8. GCP Cloud Run E2E Deployment

We successfully containerized and deployed the full decoupled stack (Mesh Relay, FastAPI Backend, Next.js Frontend) to Google Cloud Run (Always Free Tier).
*   **Mesh Relay**: Deployed to `https://mesh-relay-185632210036.us-central1.run.app` with `min-instances: 0` and token-based connection authentication. Resolved `websockets` v14.0+ request path compatibility (`request.path` fallback).
*   **FastAPI Backend API**: Deployed to `https://backend-api-185632210036.us-central1.run.app`. Connects to the cloud Mesh Relay, verifies deterministic Ed25519 signatures, and caches payloads. Restricted CORS specifically to the live frontend URL.
*   **Next.js Frontend**: Deployed to `https://frontend-web-185632210036.us-central1.run.app`. Multi-stage standalone container with build-time injected API and WebSocket endpoints.
*   **Automated Deployment**: Created automated deployment scripts `deploy_gcp.ps1` (PowerShell) and `deploy_gcp.sh` (Bash) to run remote Cloud Builds and deployments seamlessly.
*   **E2E Verification**: Verified that simulated payloads sent locally from `trigger_simulation.py` route through the cloud relay and are verified/cached by the API, and rendered on the live frontend. Visual evidence proofs render flawlessly.

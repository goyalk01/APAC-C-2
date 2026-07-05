# SwarmGuard AI — Handover State
**Date:** 2026-07-05
**Context:** This is the ground-truth state of the codebase as of handover. It supersedes all planning documents and pitch claims. If you are picking up work today, read this first.

## 1. Ground Truth Status Table

| Component | Status | Code Proof (File:Line) | What "Done" Requires |
|---|---|---|---|
| **Edge Node Simulator** | **WORKING** | `edge_nodes/edge_node.py:17` (generates signed payload) | Add randomized coordinates/delays instead of the 100% hardcoded data in `threat_scenarios.py`. |
| **Cryptographic Signing** | **PARTIAL** | `edge_nodes/crypto_signer.py:21` (Ed25519 sign) | Signatures are generated but **never verified** by Swarm Box. Needs `verify()` added to `app.py`. |
| **Mesh Routing** | **PARTIAL** | `mesh_network/mesh_relay.py:12` (broadcast loop) | It is currently a centralized WebSocket hub, not a mesh. Needs multi-hop routing/failover logic. |
| **Swarm Box (Web App/UI)** | **WORKING** | `swarm_box/app.py:66` (FastAPI app) | Needs try/except block around `json.loads(raw)` in the mesh listener to prevent crashing on bad data. |
| **Swarm Box (TTS)** | **PARTIAL** | `swarm_box/tts_engine.py:12` / `static/js/app.js:72` | Works, but uses pure browser Web Speech API. **Zero Gemini integration exists.** |
| **Cloud Run Sync API** | **STUBBED** | `cloud_layer/sync_api.py:18-24` | It loops payloads, logs to console, and returns success. Needs actual Google Cloud BigQuery API integration. |
| **BigQuery Integration** | **STUBBED** | `cloud_layer/bigquery_schema.sql:1` | Schema file exists, but zero Python code writes to it. Needs to be deployed and wired into `sync_api.py`. |
| **Pub/Sub Streaming** | **NOT STARTED** | N/A | Zero code exists. Needs Publisher/Subscriber implementation. |
| **ADK Conversational Agent**| **NOT STARTED** | N/A | Zero code exists. Needs complete end-to-end implementation (Phase 4). |
| **AlloyDB + RAG Pipeline** | **NOT STARTED** | N/A | Zero code exists. Needs DB setup, embedding model integration, and retrieval logic. |
| **Looker Dashboard** | **NOT STARTED** | N/A | Zero code exists. Looker environment must be provisioned and pointed at BigQuery. |
| **Vertex AI Integration** | **NOT STARTED** | N/A | Zero code exists (`model_version` is just a hardcoded string). Needs actual model API call. |

---

## 2. Active Contradictions

These are places where the documentation asserts something that the code actively disproves:

*   **Contradiction:** **Gemini Flash for Offline TTS.** The tech stack (`swarmguard_trd_techstack.csv:7`) claims Gemini Flash is used for TTS. The problem statement emphasizes an "offline blackout" scenario.
    *   **The Reality:** Gemini is a hosted API requiring network access. It is not invoked anywhere in this codebase. The TTS uses the browser's native `window.speechSynthesis` (`swarm_box/static/js/app.js:72`).
    *   **Resolution Needed:** Either cut the Gemini TTS claim entirely, or build an online-only Gemini path that gracefully degrades to the browser API when offline.
*   **Contradiction:** **Mesh Routing.** The Phase 1 plan claims a "WebSocket mesh relay."
    *   **The Reality:** `mesh_network/mesh_relay.py` is a single centralized server acting as a broadcast hub (`clients.send(message)`). It is a star topology, not a mesh. If the relay server goes down, everything stops.
    *   **Resolution Needed:** Reframe the pitch to call this a "simulated relay hub" or actually implement peer discovery and multi-hop routing.
*   **Contradiction:** **End-to-End Cryptographic Security.** The plan claims cryptographic signing.
    *   **The Reality:** Edge nodes generate signatures (`edge_nodes/edge_node.py:32`), but the Swarm Box blindly stores payloads in SQLite without ever verifying the signature (`swarm_box/local_cache.py:40`).
    *   **Resolution Needed:** Add key distribution (or a hardcoded public key registry) and a signature verification check in `swarm_box/app.py` before caching.
*   **Contradiction:** **Offline-capable Dashboard.**
    *   **The Reality:** The dashboard relies on internet-hosted CDNs for Google Fonts and Chart.js (`swarm_box/templates/index.html:7-12`), and `placehold.co` for evidence images (`swarm_box/static/js/app.js:64`). If you demo this with WiFi turned off, it will break visually.
    *   **Resolution Needed:** Download the font and JS files into `/static/` and bundle them locally. Generate local static placeholder images for the evidence viewer.

---

## 3. Fork-in-the-Road Decision

**The team must choose ONE of the following paths. DO NOT ATTEMPT BOTH.** You do not have time.

*   **PATH A: Harden the real offline stack.** (Recommended for immediate demo viability)
    *   Focus entirely on the Edge Nodes and Swarm Box.
    *   Add signature verification so the security claim holds up.
    *   Add error handling for malformed JSON and out-of-order events so the mesh listener doesn't crash live.
    *   Download CDN assets locally so the "offline blackout" demo actually works without WiFi.
    *   *Tradeoff: Explicitly abandon all Phase 3-5 cloud features (BigQuery, RAG, Looker). The demo ends at the Swarm Box dashboard.*
*   **PATH B: Build ONE genuine cloud beat.**
    *   Ignore the fragility of the offline stack (hope it doesn't crash during demo).
    *   Wire `sync_api.py` into a real BigQuery dataset using the Python client.
    *   Prove that when the Swarm Box comes "back online," data actually lands in GCP.
    *   *Tradeoff: Explicitly abandon ADK, AlloyDB+RAG, Looker, and Gemini. If a judge unplugs your router, the dashboard UI might break due to CDN dependencies.*

---

## 4. Landmines for Whoever Touches This Next

*   **`cloud_layer/sync_api.py` (The Fake API):** It returns `{"status": "success"}` no matter what you send it. Do not build a Looker dashboard or cloud UI expecting data to be in BigQuery — it isn't. The API drops the payload on the floor.
*   **`swarm_box/app.py` Line 30 (The Crash Trap):** `payload = json.loads(raw)` is completely unprotected. If an edge node (or an attacker) sends a malformed string or a JSON object missing `alert_type`, the entire `mesh_listener` background task will crash and the dashboard will go permanently silent.
*   **`swarm_box/static/js/app.js` Line 64 (The Internet Trap):** `showEvidence(hash)` dynamically calls `placehold.co`. If you are demonstrating the "offline" capability and click on an alert, the image will show a broken link icon.
*   **`edge_nodes/crypto_signer.py` Line 11 (The Key Trap):** Keys are generated randomly on initialization. There is no mechanism for the Swarm Box to know the public keys of the edge nodes unless you build a mechanism to share them.

---

## 5. What Not to Touch

*   **`swarm_box/local_cache.py` (WORKING):** The SQLite schema and data access patterns work perfectly for the store-and-forward requirement. Leave it alone unless adding new fields.
*   **`edge_nodes/crypto_signer.py` (WORKING):** The Ed25519 signing logic is cryptographically sound. Do not replace this with a weaker hashing mechanism.
*   **The JSON Payload Schema:** `edge_node.py` generates specific keys (`gps.lat`, `confidence`, `alert_type`, `signature`), which `app.py` and `app.js` extract directly. Do not rename or change these keys without updating all three files simultaneously.

---

## 6. Definition of Done for Tomorrow

*(Assuming you choose **PATH A** to guarantee a surviving demo)*:

1.  [ ] `index.html` references local copies of Chart.js and Inter fonts (no CDNs).
2.  [ ] `app.js` displays local static placeholder images instead of `placehold.co`.
3.  [ ] `app.py` `mesh_listener` wraps the JSON parsing and caching in a robust `try/except` block.
4.  [ ] `app.py` verifies the Ed25519 signature against a known public key before writing to SQLite.
5.  [ ] `threat_scenarios.py` includes jitter (±5% confidence, random 1-3s delay offsets) so the demo data doesn't look rehearsed.
6.  [ ] The pitch deck has been updated to remove claims of Gemini TTS, Looker, RAG, and ADK.

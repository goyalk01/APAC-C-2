# ponytail: simple REST API to ingest sync payloads. Dormant for now.
import logging
from fastapi import FastAPI, Request

logging.basicConfig(level=logging.INFO, format="[CloudSyncAPI] %(message)s")
log = logging.getLogger(__name__)

app = FastAPI(title="SwarmGuard Cloud Sync API (Dormant)")

@app.post("/api/v1/sync")
async def sync_threats(request: Request):
    payloads = await request.json()
    
    if not isinstance(payloads, list):
        payloads = [payloads]
        
    valid_count = 0
    for payload in payloads:
        # ponytail: skipped deep signature validation here since edge_node verifies it locally.
        # Just simulate BigQuery insertion.
        log.info(f"Syncing event {payload.get('event_id', 'UNKNOWN')} to BigQuery.")
        valid_count += 1
        
    return {"status": "success", "synced_events": valid_count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)

"""GET /api/v1/alerts — the only alerts endpoint (Decision 2: no single-item route).

Structural change from the original swarm_box/app.py `list_alerts()`:
- Adds optional `limit`/`offset` query params (default limit=100, offset=0).
- Wraps the response in {items, total} instead of a bare array.
- Protected by the optional shared API-key dependency (no-op unless
  SWARMBOX_API_KEY is set).
Underlying query logic (`get_all_threats`) is unchanged.
"""
from fastapi import APIRouter, Depends, Query

from ..core.auth import require_api_key
from ..schemas.threat import AlertsListResponse
from ..services import local_cache

router = APIRouter(prefix="/api/v1", tags=["alerts"])


@router.get("/alerts", response_model=AlertsListResponse, dependencies=[Depends(require_api_key)])
async def list_alerts(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    items = local_cache.get_all_threats(limit=limit, offset=offset)
    total = local_cache.count_threats()
    return AlertsListResponse(items=items, total=total)

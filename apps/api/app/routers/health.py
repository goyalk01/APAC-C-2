"""Health/readiness endpoints — net-new, required for Phase 5 deployment
health checks (Render/Fly/Railway). No auth — platform health probes must
be reachable unauthenticated.
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from ..services import local_cache
from ..services.key_registry import _registry

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz():
    """Liveness probe — process is alive."""
    return {"status": "alive"}


@router.get("/readyz")
async def readyz():
    """Readiness probe — SQLite reachable AND key registry loaded."""
    db_ok = local_cache.db_healthy()
    keys_ok = len(_registry) > 0

    ready = db_ok and keys_ok
    body = {
        "status": "ready" if ready else "not_ready",
        "checks": {
            "database": "ok" if db_ok else "unreachable",
            "key_registry": "loaded" if keys_ok else "empty",
        },
    }
    return JSONResponse(
        status_code=status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE,
        content=body,
    )

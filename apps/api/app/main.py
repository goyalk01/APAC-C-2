"""FastAPI app factory — pure JSON API, no HTML/template rendering.

This is the Phase 2 replacement for swarmguard-ai/swarm_box/app.py.
Structural changes vs. the original:
  - HTML/template serving REMOVED (GET "/" and StaticFiles mount for the
    dashboard are gone — the frontend is now a separate Next.js app).
  - CORS middleware ADDED (restricted to CORS_ALLOWED_ORIGINS).
  - Structured logging + centralized error handlers ADDED.
  - Health/readiness endpoints ADDED.
  - Optional shared API-key auth ADDED (off by default).
Business logic (mesh listener, signature verification, caching, TTS) is
unchanged — only relocated into services/.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import get_settings
from .core.logging import configure_logging
from .core.errors import register_exception_handlers
from .routers import alerts, health, ws
from .routers.ws import dashboard_clients
from .services import local_cache
from .services.key_registry import load_registry_from_file
from .services.mesh_listener import mesh_listener

configure_logging()
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()

    local_cache.init_db()
    log.info("SQLite cache initialized at %s", settings.SQLITE_PATH)

    keys_file = Path(settings.NODE_KEYS_PATH)
    if keys_file.exists():
        load_registry_from_file(str(keys_file))
    else:
        log.warning(
            "Key registry not found at %s — run `python -m app.generate_keys` first! "
            "All payloads will be REJECTED.",
            keys_file,
        )

    task = asyncio.create_task(mesh_listener(dashboard_clients))
    yield
    task.cancel()


def create_app() -> FastAPI:
    settings = get_settings()

    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            integrations=[FastApiIntegration()],
            traces_sample_rate=1.0,
        )

    app = FastAPI(title="SwarmGuard Swarm Box API", version="1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(alerts.router)
    app.include_router(ws.router)

    return app


app = create_app()

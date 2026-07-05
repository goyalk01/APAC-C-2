"""Optional shared API-key auth dependency (Decision 1 in ARCHITECTURE_PLAN.md).

Off by default: if SWARMBOX_API_KEY is unset, this dependency is a no-op,
preserving today's zero-auth behavior exactly for local dev.
When SWARMBOX_API_KEY is set (recommended for public deployment), requests
must include a matching `X-SwarmGuard-Key` header or receive 401.
"""
from fastapi import Header, HTTPException, status

from .config import get_settings


async def require_api_key(x_swarmguard_key: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.auth_enabled:
        return  # Auth disabled — dev default, matches current behavior.

    if x_swarmguard_key != settings.SWARMBOX_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid X-SwarmGuard-Key header.",
        )

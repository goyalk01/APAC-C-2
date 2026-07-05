"""Centralized, env-driven configuration.

Structural addition only — replaces hardcoded hosts/ports/paths that
previously lived inline in swarm_box/app.py, local_cache.py, and generate_keys.py.
No business logic changes.
"""
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Service identity ---
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8010

    # --- Mesh relay (upstream WS source this service connects to as a client) ---
    MESH_RELAY_URL: str = "ws://localhost:8765"

    # --- Storage ---
    SQLITE_PATH: str = str(Path(__file__).resolve().parent.parent.parent / "swarm_cache.db")
    NODE_KEYS_PATH: str = str(Path(__file__).resolve().parent.parent.parent / "node_keys.json")

    # --- CORS ---
    # Comma-separated list of allowed origins, e.g.
    # "http://localhost:3000,https://swarmguard.vercel.app"
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"

    # --- Optional shared API-key auth (Decision 1 — off by default) ---
    SWARMBOX_API_KEY: str | None = None

    # --- Logging ---
    LOG_LEVEL: str = "INFO"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def auth_enabled(self) -> bool:
        return bool(self.SWARMBOX_API_KEY)


@lru_cache
def get_settings() -> Settings:
    return Settings()

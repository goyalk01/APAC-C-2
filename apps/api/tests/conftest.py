import sys
from pathlib import Path

# Ensure `app` package is importable when running pytest from apps/api/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from app.core.config import get_settings


@pytest.fixture(autouse=True)
def _isolated_settings(tmp_path, monkeypatch):
    """Give every test an isolated SQLite DB + node_keys.json path so tests
    don't clobber real runtime artifacts or each other."""
    get_settings.cache_clear()
    monkeypatch.setenv("SQLITE_PATH", str(tmp_path / "test_swarm_cache.db"))
    monkeypatch.setenv("NODE_KEYS_PATH", str(tmp_path / "node_keys.json"))
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()

"""Structured logging configuration.

Replaces the ad-hoc `logging.basicConfig(format="[SwarmBox] %(message)s")`
calls scattered across the original swarm_box modules with one consistent
setup. Still human-readable in dev; JSON-capable if LOG_FORMAT=json is added
later without further structural change.
"""
import logging
import sys

from .config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    root = logging.getLogger()
    if root.handlers:
        # Already configured (e.g. reload) — avoid duplicate handlers.
        root.setLevel(settings.LOG_LEVEL)
        return

    handler = logging.StreamHandler(stream=sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    root.addHandler(handler)
    root.setLevel(settings.LOG_LEVEL)

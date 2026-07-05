"""Pydantic response schemas — request validation / consistent response shape.

Structural addition per ARCHITECTURE_PLAN.md §2. Mirrors the existing SQLite
row shape from local_cache.py exactly; does not change what data is stored
or computed.
"""
from pydantic import BaseModel, ConfigDict


class ThreatEvent(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: int

    event_id: str
    node_id: str
    alert_type: str
    confidence: float
    latitude: float
    longitude: float
    timestamp: str
    model_version: str
    visual_proof_hash: str | None = None
    signature: str
    received_at: str
    synced_to_cloud: int


class AlertsListResponse(BaseModel):
    items: list[ThreatEvent]
    total: int

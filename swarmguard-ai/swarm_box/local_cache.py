# ponytail: stdlib sqlite3, no ORM needed for a single table.
import sqlite3
import uuid
import time
from pathlib import Path

DB_PATH = Path(__file__).parent / "swarm_cache.db"

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS threat_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT UNIQUE NOT NULL,
            node_id TEXT NOT NULL,
            alert_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            timestamp TEXT NOT NULL,
            model_version TEXT NOT NULL,
            visual_proof_hash TEXT,
            signature TEXT NOT NULL,
            received_at TEXT NOT NULL,
            synced_to_cloud INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()

def insert_threat(payload: dict) -> str:
    event_id = str(uuid.uuid4())
    received_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    conn = get_connection()
    conn.execute("""
        INSERT INTO threat_events
            (event_id, node_id, alert_type, confidence, latitude, longitude,
             timestamp, model_version, visual_proof_hash, signature, received_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        event_id,
        payload["node_id"],
        payload["alert_type"],
        payload["confidence"],
        payload["gps"]["lat"],
        payload["gps"]["lng"],
        payload["timestamp"],
        payload["model_version"],
        payload.get("visual_proof_hash", ""),
        payload["signature"],
        received_at
    ))
    conn.commit()
    conn.close()
    return event_id

def get_all_threats() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM threat_events ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_unsynced_threats() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM threat_events WHERE synced_to_cloud = 0 ORDER BY id").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def mark_synced(event_ids: list[str]):
    conn = get_connection()
    conn.executemany(
        "UPDATE threat_events SET synced_to_cloud = 1 WHERE event_id = ?",
        [(eid,) for eid in event_ids]
    )
    conn.commit()
    conn.close()

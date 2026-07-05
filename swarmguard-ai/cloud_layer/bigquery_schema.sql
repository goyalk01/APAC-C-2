CREATE TABLE swarmguard.threat_events (
    event_id STRING NOT NULL,
    node_id STRING NOT NULL,
    alert_type STRING NOT NULL,
    confidence FLOAT64 NOT NULL,
    latitude FLOAT64 NOT NULL,
    longitude FLOAT64 NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    model_version STRING NOT NULL,
    visual_proof_hash STRING,
    signature STRING NOT NULL,
    synced_at TIMESTAMP NOT NULL,
    zone STRING
);

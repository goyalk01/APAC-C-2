# MOVED AS-IS from swarmguard-ai/swarm_box/tts_engine.py — logic unchanged.
# Pure string formatting, no NLP library needed.
# Browser Web Speech API handles the actual audio; this just makes readable text.

ALERT_LABELS = {
    "BRIDGE_COLLAPSE": "bridge collapse",
    "FLOODING": "flooding",
    "STRUCTURAL_FIRE": "structural fire",
    "GAS_LEAK": "gas leak",
    "CROWD_STAMPEDE": "crowd stampede",
}

def threat_to_speech(payload: dict) -> str:
    alert = ALERT_LABELS.get(payload["alert_type"], payload["alert_type"].lower().replace("_", " "))
    confidence_pct = int(payload["confidence"] * 100)
    lat = payload["gps"]["lat"]
    lng = payload["gps"]["lng"]
    node = payload["node_id"]

    return (
        f"ALERT. {alert} detected by {node} "
        f"with {confidence_pct} percent confidence. "
        f"Location: latitude {lat}, longitude {lng}. "
        f"Timestamp: {payload['timestamp']}. Respond immediately."
    )

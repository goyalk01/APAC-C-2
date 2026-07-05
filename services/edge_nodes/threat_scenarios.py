# ponytail: simple dictionary mapping node IDs to their predefined scenario parameters.
SCENARIOS = {
    "NODE_001": {
        "alert_type": "BRIDGE_COLLAPSE",
        "confidence": 0.98,
        "gps": {"lat": 27.1751, "lng": 78.0421},
        "delay": 5
    },
    "NODE_002": {
        "alert_type": "FLOODING",
        "confidence": 0.87,
        "gps": {"lat": 27.1631, "lng": 78.0421},
        "delay": 12
    },
    "NODE_003": {
        "alert_type": "STRUCTURAL_FIRE",
        "confidence": 0.94,
        "gps": {"lat": 27.2031, "lng": 77.9981},
        "delay": 20
    },
    "NODE_004": {
        "alert_type": "GAS_LEAK",
        "confidence": 0.91,
        "gps": {"lat": 27.0945, "lng": 77.6593},
        "delay": 28
    },
    "NODE_005": {
        "alert_type": "CROWD_STAMPEDE",
        "confidence": 0.82,
        "gps": {"lat": 27.1983, "lng": 77.9778},
        "delay": 35
    }
}

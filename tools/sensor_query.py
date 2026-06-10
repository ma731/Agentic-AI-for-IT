import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "sensors"


def sensor_query(machine_id: str, window: str, sensors: list[str]) -> dict:
    """
    Returns time-series sensor readings for a machine over the requested window.

    Tool catalog:
      Input:  machine_id (str), window ("24h"/"48h"/"72h"), sensors (list of sensor names)
      Output: dict with per-sensor readings array + summary stats
      Use when: assessing current machine health or trending anomalies
      Do NOT use: to make predictions — that's rul_predictor's job
      Fallback: if file missing, returns {"error": "data_unavailable", "machine_id": machine_id}
      Risk tier: READ (autonomous)
    """
    filename = DATA_DIR / f"{machine_id}_{window}.json"
    if not filename.exists():
        return {"error": "data_unavailable", "machine_id": machine_id, "window": window}

    with open(filename) as f:
        raw = json.load(f)

    filtered = {k: v for k, v in raw["readings"].items() if k in sensors}
    return {
        "machine_id": machine_id,
        "window": window,
        "readings": filtered,
        "summary": raw.get("summary", {}),
        "data_timestamp": raw.get("data_timestamp"),
    }

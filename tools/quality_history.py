import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "quality"


def quality_history(machine_id: str) -> dict:
    """
    Returns recent quality metrics (escape rate, defects) for a machine from MES/QMS.

    Tool catalog:
      Input:  machine_id (str)
      Output: quality_escape_rate_ppm vs baseline, trend, recent_defects
      Use when: assessing whether a failing machine is already producing escapes, or whether a
                reroute target is quality-healthy (challenge 4)
      Do NOT use: to correlate with telemetry — that is telemetry_correlate
      Fallback: {"error": "quality_data_unavailable"}
      Risk tier: READ (autonomous)
    """
    f = DATA_DIR / "quality_metrics.json"
    if not f.exists():
        return {"error": "quality_data_unavailable"}
    with open(f, encoding="utf-8") as fh:
        data = json.load(fh)
    m = data.get(machine_id)
    if not m:
        return {"error": "machine_not_in_qms", "machine_id": machine_id}
    return m

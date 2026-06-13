import json
from pathlib import Path

QUALITY_DIR = Path(__file__).parent.parent / "data" / "quality"
SENSOR_DIR = Path(__file__).parent.parent / "data" / "sensors"


def telemetry_correlate(machine_id: str) -> dict:
    """
    Correlates a machine's quality escapes with its sensor telemetry — the MES/QMS-to-OT
    link that does not exist today (challenge 4).

    Tool catalog:
      Input:  machine_id (str)
      Output: escape trend, vibration trend, and a correlation verdict + likely root cause
      Use when: defects are rising and you need to know if a mechanical fault is the cause
      Do NOT use: as a failure predictor — that is rul_predictor
      Fallback: {"error": ...} if either data source missing
      Risk tier: READ (autonomous)
    """
    qf = QUALITY_DIR / "quality_metrics.json"
    sf = SENSOR_DIR / f"{machine_id}_72h.json"
    if not qf.exists():
        return {"error": "quality_data_unavailable"}
    with open(qf, encoding="utf-8") as fh:
        q = json.load(fh).get(machine_id, {})
    if not q:
        return {"error": "machine_not_in_qms", "machine_id": machine_id}

    vib_trend = None
    if sf.exists():
        with open(sf, encoding="utf-8") as fh:
            vib_trend = json.load(fh).get("summary", {}).get("vibration", {}).get("trend")

    escapes_rising = q.get("trend") == "rising"
    vib_rising = vib_trend == "rising"
    correlated = escapes_rising and vib_rising
    return {
        "machine_id": machine_id,
        "quality_escape_trend": q.get("trend"),
        "escape_rate_ppm": q.get("quality_escape_rate_ppm"),
        "baseline_ppm": q.get("baseline_escape_rate_ppm"),
        "vibration_trend": vib_trend,
        "correlation": "POSITIVE" if correlated else "INCONCLUSIVE",
        "likely_root_cause": (
            "Mechanical degradation (rising vibration) is the probable driver of the rising "
            "dimensional escapes — quality will keep degrading until the bearing is fixed."
            if correlated else "No clear telemetry-quality link detected."
        ),
    }

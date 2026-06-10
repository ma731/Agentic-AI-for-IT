import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "assets"


def maintenance_schedule(plant_id: str, horizon: str = "7d") -> dict:
    """
    Returns scheduled maintenance windows for a plant within a time horizon.
    Can also write a new draft window (requires human approval before commit).

    Tool catalog:
      Input:  plant_id (str), horizon ("7d"/"14d"/"30d"), draft_window (optional dict)
      Output: existing_windows list, next_available slot
      Use when: checking if intervention can fit in existing schedule
      Do NOT use: to commit schedule changes — changes go to APPROVE tier
      Fallback: if scheduler unavailable, return last known window + staleness flag
      Risk tier: READ=autonomous, WRITE=APPROVE required
    """
    schedule_file = DATA_DIR / "maintenance_schedule.json"
    if not schedule_file.exists():
        return {
            "error": "schedule_unavailable",
            "plant_id": plant_id,
            "staleness_flag": True,
        }

    with open(schedule_file) as f:
        schedules = json.load(f)

    plant_schedule = schedules.get(plant_id, {})
    return {
        "plant_id": plant_id,
        "horizon": horizon,
        "existing_windows": plant_schedule.get("windows", []),
        "next_available_slot": plant_schedule.get("next_available"),
        "data_timestamp": plant_schedule.get("data_timestamp"),
    }

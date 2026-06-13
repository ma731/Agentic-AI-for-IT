import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "production"


def shift_conflict_check(plant_id: str, target_machines: list[str] | None = None) -> dict:
    """
    Checks the shift roster for operator/technician conflicts affecting the given machines.

    Tool catalog:
      Input:  plant_id (str), target_machines (optional list — machines being rerouted to / serviced)
      Output: shifts, known_conflicts, and whether any conflict touches the target machines
      Use when: a proposed maintenance window or reroute may double-book staff (challenge 3)
      Do NOT use: to actually edit the roster — committing schedule changes is APPROVE tier
      Fallback: {"error": "shift_data_unavailable"}
      Risk tier: READ (autonomous)
    """
    f = DATA_DIR / "shifts.json"
    if not f.exists():
        return {"error": "shift_data_unavailable", "plant_id": plant_id}
    with open(f, encoding="utf-8") as fh:
        data = json.load(fh)

    conflicts = data.get("known_conflicts", [])
    relevant = conflicts
    if target_machines:
        relevant = [c for c in conflicts
                    if any(m in json.dumps(c) for m in target_machines)] or conflicts
    return {
        "plant_id": plant_id,
        "shifts": data.get("shifts", []),
        "known_conflicts": relevant,
        "has_conflict": bool(relevant),
        "data_timestamp": data.get("data_timestamp"),
    }

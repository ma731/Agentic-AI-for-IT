import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "production"


def robot_cell_status(plant_id: str) -> dict:
    """
    Returns robot-cell state: which robots serve which machines, assigned operators,
    collaborative mode, and recent safety shutdowns.

    Tool catalog:
      Input:  plant_id (str)
      Output: cells list with operators, mode, safety_state, shutdown counts
      Use when: a reroute or window change may create human-robot coordination issues (challenge 3)
      Do NOT use: to gate a safety action — that is safety_gate (Compliance & Safety agent)
      Fallback: {"error": "robot_cells_unavailable"}
      Risk tier: READ (autonomous)
    """
    f = DATA_DIR / "robot_cells.json"
    if not f.exists():
        return {"error": "robot_cells_unavailable", "plant_id": plant_id}
    with open(f, encoding="utf-8") as fh:
        data = json.load(fh)
    return {"plant_id": plant_id, "cells": data.get("cells", []),
            "data_timestamp": data.get("data_timestamp")}

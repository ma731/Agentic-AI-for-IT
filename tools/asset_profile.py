import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "assets"


def asset_profile(machine_id: str) -> dict:
    """
    Returns machine specs, BOM (bill of materials), failure modes, and maintenance requirements.

    Tool catalog:
      Input:  machine_id (str)
      Output: specs, required_parts list, failure_modes, technician_requirements
      Use when: need to know what parts a repair requires or machine operational limits
      Do NOT use: for real-time sensor data — use sensor_query
      Fallback: returns {"error": "asset_not_found"} if machine unknown
      Risk tier: READ (autonomous)
    """
    profile_file = DATA_DIR / "asset_profiles.json"
    if not profile_file.exists():
        return {"error": "asset_db_unavailable"}

    with open(profile_file, encoding="utf-8") as f:
        profiles = json.load(f)

    profile = profiles.get(machine_id)
    if not profile:
        return {"error": "asset_not_found", "machine_id": machine_id}

    return profile

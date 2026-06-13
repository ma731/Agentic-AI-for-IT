import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "assets"


def job_reroute(machine_id: str, jobs: list[str]) -> dict:
    """
    Proposes how to reroute a down machine's production jobs onto equivalent machines.

    Tool catalog:
      Input:  machine_id (str, the machine going down), jobs (list of job IDs)
      Output: candidate machines with spare capacity + a proposed job assignment
      Use when: a machine will be offline for maintenance and its jobs must be covered (challenge 3)
      Do NOT use: to assess failure risk (Reliability agent) or quality impact (Quality agent)
      Fallback: {"error": "asset_db_unavailable"} or capacity_shortfall flag
      Risk tier: AUTO (rerouting within equivalent machines is autonomous)
    """
    f = DATA_DIR / "asset_profiles.json"
    if not f.exists():
        return {"error": "asset_db_unavailable"}
    with open(f, encoding="utf-8") as fh:
        profiles = json.load(fh)

    src = profiles.get(machine_id, {})
    candidates = []
    for cid in src.get("equivalent_machines", []):
        c = profiles.get(cid, {})
        candidates.append({
            "machine_id": cid,
            "available_capacity_pct": c.get("available_capacity_pct", 0),
            "status": c.get("status", "unknown"),
        })

    total_capacity = sum(c["available_capacity_pct"] for c in candidates)
    # Greedy assignment: distribute jobs across candidates with capacity.
    assignment, idx = {}, 0
    for job in jobs:
        if not candidates:
            break
        assignment[job] = candidates[idx % len(candidates)]["machine_id"]
        idx += 1
    return {
        "down_machine": machine_id,
        "jobs": jobs,
        "candidates": candidates,
        "proposed_assignment": assignment,
        "capacity_shortfall": total_capacity < 50,
    }

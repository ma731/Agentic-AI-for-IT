import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "suppliers"


def tier2_supplier_risk(supplier_ids: list[str]) -> dict:
    """
    Reveals Tier-2 (supplier's supplier) dependencies and their risk for given Tier-1 suppliers.

    Tool catalog:
      Input:  supplier_ids (list of Tier-1 supplier IDs, e.g. ["SUP-SCHAEFFLER-DE"])
      Output: per-supplier Tier-2 dependencies, single-source flags, overall risk
      Use when: a sourcing option depends on a supplier whose own supply chain may be at risk (challenge 2)
      Do NOT use: for on-hand stock — use parts_inventory
      Fallback: {"error": "tier2_map_unavailable"}
      Risk tier: READ (autonomous)
    """
    f = DATA_DIR / "tier2_map.json"
    if not f.exists():
        return {"error": "tier2_map_unavailable"}
    with open(f, encoding="utf-8") as fh:
        m = json.load(fh)
    results = {}
    for sid in supplier_ids:
        results[sid] = m.get(sid, {"error": "supplier_not_mapped"})
    return {"suppliers": results, "data_timestamp": m.get("data_timestamp")}

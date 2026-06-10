import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "inventory"


def parts_inventory(parts: list[str], plant_id: str) -> dict:
    """
    Checks on-site and central warehouse stock for specified part numbers.

    Tool catalog:
      Input:  parts (list of part IDs), plant_id (str)
      Output: per-part: on_site qty, warehouse qty, standard_transit_days
      Use when: confirming parts availability before recommending repair plan
      Do NOT use: as substitute for supplier_catalog — this is stock only, not procurement
      Fallback: if stock data age > 4h, flag as STALE and re-query before committing
      Risk tier: READ (autonomous)
    """
    inventory_file = DATA_DIR / "parts_stock.json"
    if not inventory_file.exists():
        return {"error": "inventory_unavailable"}

    with open(inventory_file) as f:
        stock = json.load(f)

    results = {}
    for part_id in parts:
        part_data = stock.get(part_id)
        if not part_data:
            results[part_id] = {"error": "part_not_found"}
            continue
        plant_stock = part_data.get("plants", {}).get(plant_id, {})
        results[part_id] = {
            "on_site_qty": plant_stock.get("qty", 0),
            "warehouse_qty": part_data.get("warehouse", {}).get("qty", 0),
            "warehouse_location": part_data.get("warehouse", {}).get("location"),
            "standard_transit_days": part_data.get("warehouse", {}).get("transit_days"),
            "data_timestamp": stock.get("data_timestamp"),
        }

    return {"plant_id": plant_id, "parts": results}

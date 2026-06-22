"""Case memory: retrieve the most similar past incidents for the current alert.

This is the Learning loop's recall step. The reliability agent calls it so its
assessment is grounded in precedent (predicted vs actual RUL, the human decision, and
the outcome), not just the live reading. The store is data/memory/case_library.json,
which the audit log appends to as new runs close.
"""
from __future__ import annotations

import json
from pathlib import Path

_LIB = Path(__file__).resolve().parents[1] / "data" / "memory" / "case_library.json"


def _score(case: dict, machine_id: str, sensor: str, signature: str) -> int:
    """Cheap similarity: shared sensor, machine type, and keyword overlap on the signature."""
    s = 0
    if sensor and case.get("sensor") == sensor:
        s += 40
    if machine_id and case.get("machine_id") == machine_id:
        s += 25
    sig_words = {w for w in (signature or "").lower().replace(",", " ").split() if len(w) > 3}
    case_words = {w for w in case.get("signature", "").lower().replace(",", " ").split() if len(w) > 3}
    if sig_words and case_words:
        s += int(35 * len(sig_words & case_words) / max(1, len(sig_words)))
    return min(s, 99)


def recall_similar_cases(machine_id: str = "", sensor: str = "", signature: str = "", top_k: int = 3) -> dict:
    """Return the top_k most similar closed cases, each with a match %, the predicted
    vs actual RUL, the decision taken, and the outcome."""
    try:
        lib = json.loads(_LIB.read_text(encoding="utf-8")).get("cases", [])
    except Exception as exc:  # noqa: BLE001
        return {"error": f"case library unavailable: {exc}", "matches": []}
    ranked = sorted(lib, key=lambda c: _score(c, machine_id, sensor, signature), reverse=True)
    matches = []
    for c in ranked[:top_k]:
        matches.append({
            "id": c["id"],
            "match_pct": _score(c, machine_id, sensor, signature),
            "machine_id": c["machine_id"],
            "signature": c["signature"],
            "predicted_rul_h": c["predicted_rul_h"],
            "actual_failure_h": c["actual_failure_h"],
            "decision": c["decision"],
            "outcome": c["outcome"],
        })
    closed = [c for c in lib if c.get("actual_failure_h") is not None]
    in_win = [c for c in closed if c.get("in_window")]
    return {
        "matches": matches,
        "library_size": len(lib),
        "rul_accuracy_pct": round(100 * len(in_win) / len(closed)) if closed else None,
    }

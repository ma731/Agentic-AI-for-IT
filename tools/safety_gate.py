import json
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data" / "compliance"


def safety_gate(action_description: str) -> dict:
    """
    Classifies a proposed action against OSHA / machine-safety rules and returns a gate verdict.

    Tool catalog:
      Input:  action_description (str — plain text of the action being considered)
      Output: verdict (OK | ESCALATE | HALT), matched rule, authority, basis
      Use when: ANY action is about to be committed — the Compliance & Safety agent gates it (challenge 5)
      Do NOT use: to assess production capacity or quality — different agents
      Fallback: defaults to ESCALATE (fail safe) if rules unavailable
      Risk tier: this tool IS the safety control; its HALT verdict overrides other agents
    """
    f = DATA_DIR / "safety_rules.json"
    if not f.exists():
        return {"verdict": "ESCALATE", "reason": "safety_rules_unavailable — failing safe"}
    with open(f, encoding="utf-8") as fh:
        rules = json.load(fh).get("rules", [])

    text = action_description.lower()
    # Evaluate most-restrictive-first so HALT wins over ESCALATE wins over OK.
    order = {"HALT": 0, "ESCALATE": 1, "OK": 2}
    matched = sorted(
        [r for r in rules if any(k in text for k in r["keywords"])],
        key=lambda r: order.get(r["verdict"], 3),
    )
    if not matched:
        return {"verdict": "OK", "action": action_description,
                "reason": "No safety rule matched; no incremental safety risk."}
    r = matched[0]
    return {
        "verdict": r["verdict"],
        "action": action_description,
        "matched_rule": r["rule_id"],
        "authority": r["authority"],
        "basis": r["basis"],
        "detail": r["detail"],
    }

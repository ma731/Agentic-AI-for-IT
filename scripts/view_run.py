"""
Replay a recorded TOS run from logs/tos_audit.jsonl as a readable transcript.

No model calls — this just renders what already happened, so it's free to run even
when the Groq token quota is exhausted. Great for *seeing* how the agents interacted.

Usage (from the repo root):
    python scripts/view_run.py            # latest run that produced a final plan
    python scripts/view_run.py RUN-...    # a specific run id
    python scripts/view_run.py --list     # list recent runs
"""
import json
import sys
from collections import OrderedDict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # repo root → import tos

from audit_log import LOG_FILE as LOG  # single source of truth for the log path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass
ICON = {"perception": "📡", "route": "🧭", "tool_call": "🔧", "agent_report": "🗒️",
        "decision": "🧠", "escalation": "⚠️", "approval_request": "⏸️",
        "human_decision": "👤", "plan": "📋", "agent_error": "❌"}


def load_runs():
    runs = OrderedDict()
    if not LOG.exists():
        return runs
    with open(LOG, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except json.JSONDecodeError:
                continue
            runs.setdefault(e["run_id"], []).append(e)
    return runs


def short(obj, n=200):
    s = obj if isinstance(obj, str) else json.dumps(obj, ensure_ascii=False, default=str)
    return s if len(s) <= n else s[:n] + " …"


def render(events):
    for e in events:
        t, d, agent = e["type"], e.get("detail", {}), e.get("agent", "")
        icon = ICON.get(t, "•")
        if t == "perception":
            a = d.get("alert", {})
            print(f"\n{icon} PERCEPTION — {a.get('machine_id')} {a.get('sensor')}="
                  f"{a.get('value')}{a.get('unit')} (threshold {a.get('threshold')})")
        elif t == "route":
            print(f"\n{icon} ORCHESTRATOR routes → {d.get('message','').split('→')[-1].strip()}"
                  f"   (choices: {d.get('allowed')})")
        elif t == "tool_call":
            print(f"      {icon} {agent}.{d.get('tool')}  in={short(d.get('input'),80)}")
            print(f"            ↳ {short(d.get('result'),150)}")
        elif t == "agent_report":
            print(f"   {icon} [{agent.upper()} REPORT]\n        {short(d.get('report'), 600)}")
        elif t in ("decision", "escalation"):
            print(f"\n{icon} {agent}: {d.get('message')}")
        elif t == "approval_request":
            print(f"\n{icon} APPROVAL GATE — {d.get('question')} (ceiling €{d.get('ceiling_eur')})")
        elif t == "human_decision":
            print(f"{icon} HUMAN — {d.get('decision')}")
        elif t == "plan":
            print(f"\n{icon} FINAL ACTION PLAN\n{'='*64}\n{d.get('plan')}\n{'='*64}")


def main():
    runs = load_runs()
    if not runs:
        print("No runs in logs/tos_audit.jsonl yet. Run demo_scenario.py or app.py first.")
        return
    args = sys.argv[1:]
    if args and args[0] == "--list":
        for rid, evs in runs.items():
            has_plan = any(e["type"] == "plan" for e in evs)
            print(f"{rid}  ({len(evs)} events){'  ✓plan' if has_plan else ''}")
        return
    if args:
        rid = args[0]
    else:  # latest run that produced a final plan
        rid = next((r for r in reversed(runs) if any(e["type"] == "plan" for e in runs[r])),
                   next(reversed(runs)))
    print(f"REPLAY — run {rid}  ({len(runs[rid])} events)")
    render(runs[rid])


if __name__ == "__main__":
    main()

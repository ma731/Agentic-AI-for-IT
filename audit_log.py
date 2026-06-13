"""
Structured audit log for Titan Operations Sentinel.

Every perception, tool call, decision, escalation, human approval, and final plan
is written as one JSON line to logs/tos_audit.jsonl. This is the logging/monitoring
component required by the architecture brief (§6) and doubles as the "sample audit
log" elite deliverable. It is also returned in-process so the UI can render the trace.

Schema per event:
    {ts, run_id, type, agent, detail}
  type ∈ {perception, tool_call, decision, escalation, approval_request,
          human_decision, plan, error}
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

LOG_DIR = Path(__file__).parent / "logs"
LOG_FILE = LOG_DIR / "tos_audit.jsonl"


def new_run_id() -> str:
    return f"RUN-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"


class AuditLog:
    """One instance per orchestrator run. Appends to the shared JSONL file and
    keeps an in-memory copy for the live UI."""

    def __init__(self, run_id: str | None = None):
        self.run_id = run_id or new_run_id()
        self.events: list[dict] = []
        LOG_DIR.mkdir(exist_ok=True)

    def record(self, type: str, detail: dict, agent: str = "orchestrator") -> dict:
        event = write_event(self.run_id, type, detail, agent)
        self.events.append(event)
        return event


def write_event(run_id: str, type: str, detail: dict, agent: str = "orchestrator") -> dict:
    """Fire-and-forget JSONL append. Used by graph nodes which keep their own
    live trace in graph state; this is the durable audit record."""
    event = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "type": type,
        "agent": agent,
        "detail": detail,
    }
    try:
        LOG_DIR.mkdir(exist_ok=True)
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(event, default=str) + "\n")
    except OSError as exc:
        # Logging must never break the agent; surface to stderr only.
        print(f"[audit] could not persist event: {exc}")
    return event

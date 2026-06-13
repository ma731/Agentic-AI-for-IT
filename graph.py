"""
Titan Operations Sentinel — multi-agent orchestration (LangGraph).

A society of six agents that solve all five TMC challenges by sharing one running
conversation and being routed by an LLM orchestrator:

    perceive → SUPERVISOR ⇄ { reliability, supply_chain, production, quality,
                              compliance_safety }  → finalize(approval) → synthesize

How they communicate (natural language):
- Every specialist writes a natural-language report; it is appended to a SHARED
  TRANSCRIPT that every later agent reads in full. So agents converse through one
  growing dialogue, not isolated handoffs.
- An agent may end its report with `FOLLOWUP: <agent> — <question>` to put a direct
  question to another specialist; the orchestrator honours it (bounded re-routing),
  which is genuine agent-to-agent messaging.
- The SUPERVISOR (LLM) decides who acts next, constrained by a policy that guarantees
  coverage (all cross-domain agents on HIGH risk) and termination (compliance_safety
  gates before FINISH, and each agent runs at most MAX_VISITS times).

Specialists are autonomous ReAct agents (agents.py) — each LLM picks its own tools.
Compliance & Safety can HALT the plan; the approval gate uses interrupt() for HITL.
Three paths via `scenario`: happy / edge / escalation.
"""
from __future__ import annotations

import json
import operator
import re
from collections import Counter
from pathlib import Path
from typing import Annotated, TypedDict

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

import llm
from agents import AGENT_NAMES, build_agents
from audit_log import new_run_id, write_event

PROMPTS = Path(__file__).parent / "prompts"
COST_CEILING_EUR = 500
JOBS = ["J4421", "J4422", "J4423", "J4424", "J4425"]
CORE_AGENTS = ["supply_chain", "production", "quality"]
MAX_VISITS = 2          # cap re-engagement per agent so follow-ups can't loop forever


def _prompt(name: str) -> str:
    p = PROMPTS / name
    return p.read_text(encoding="utf-8") if p.exists() else ""


def _merge(a: dict, b: dict) -> dict:
    r = dict(a or {})
    r.update(b or {})
    return r


class OpsState(TypedDict, total=False):
    run_id: str
    alert: dict
    scenario: str
    machine_id: str
    plant_id: str
    transcript: Annotated[list, operator.add]   # [{agent, message}] — the shared dialogue
    ops_context: Annotated[dict, _merge]         # {agent: latest report} — quick lookup
    visited: Annotated[list, operator.add]
    pending_followup: str                        # agent name another agent asked for
    next_agent: str
    risk: str                                    # HIGH | LOW | ESCALATE
    escalate: bool
    halt: bool
    needs_approval: bool
    approval: dict
    final_plan: str
    status: str
    trace: Annotated[list, operator.add]


def _ev(rid: str, etype: str, agent: str, **detail) -> dict:
    write_event(rid, etype, detail, agent)
    return {"type": etype, "agent": agent, **detail}


# --------------------------------------------------------------------------- #
# Read a ReAct agent's run: surface its tool calls + its full natural-language reply.
# --------------------------------------------------------------------------- #
def _safe(content):
    try:
        return json.loads(content) if isinstance(content, str) else content
    except (json.JSONDecodeError, TypeError):
        return content


def _tool_events(messages, agent, rid):
    events, blob, pending = [], [], {}
    for m in messages:
        for tc in (getattr(m, "tool_calls", None) or []):
            pending[tc["id"]] = (tc["name"], tc.get("args", {}))
        if m.__class__.__name__ == "ToolMessage":
            name, args = pending.get(getattr(m, "tool_call_id", None),
                                     (getattr(m, "name", "?"), {}))
            blob.append(str(m.content))
            events.append(_ev(rid, "tool_call", agent, tool=name, input=args,
                              result=_safe(m.content)))
    return events, " ".join(blob).lower()


def _agent_report(messages) -> str:
    """All of the agent's spoken (non-tool) text, joined — so the full assessment reaches
    the transcript, not just the final one-liner (fixes the terse-report bug)."""
    parts = [m.content for m in messages
             if m.__class__.__name__ == "AIMessage"
             and isinstance(m.content, str) and m.content.strip()]
    return "\n".join(parts).strip()


def _detect_followup(report: str, sender: str) -> str | None:
    m = re.search(r"FOLLOWUP:\s*([a-z_]+)", report, re.IGNORECASE)
    if not m:
        return None
    target = m.group(1).lower()
    return target if target in AGENT_NAMES and target != sender else None


# --------------------------------------------------------------------------- #
# Task prompts: each agent sees the FULL shared transcript + its own instruction.
# --------------------------------------------------------------------------- #
def _conversation(state: OpsState) -> str:
    lines = [f"[{t['agent']}]: {t['message']}" for t in state.get("transcript", [])]
    return "\n\n".join(lines) if lines else "(no messages yet — you are first)"


def _instruction(name: str, state: OpsState) -> str:
    alert = state["alert"]
    mid, pid = state["machine_id"], state["plant_id"]
    scenario = state.get("scenario", "happy")
    window = "dropout" if scenario == "escalation" else "72h"
    downtime_day = alert.get("production_impact_per_day_eur", 162000)

    if name == "reliability":
        return (f"Triage the alert stream at plant {pid}, confirm the critical machine, then "
                f"assess its failure risk, RUL, required parts, and maintenance-window gap. "
                f"Use sensor window '{window}'. Alert: {json.dumps(alert)}")
    if name == "supply_chain":
        downtime_hr = round(downtime_day / 24)
        edge = ("\nNOTE: primary supply is DISRUPTED today — call supplier_catalog with "
                "scenario='edge'. If nothing fits the RUL window, find a cross-plant transfer "
                "via parts_inventory at sister plants AMS and MUC."
                if scenario == "edge" else "")
        return (f"Confirm parts availability for {mid} at {pid} (the parts are in the reliability "
                f"report above), check the chosen supplier's Tier-2 risk, and recommend a sourcing "
                f"option ranked by ROI. When you call expedite_cost use downtime_cost_per_hour="
                f"{downtime_hr} and failure_window_hours=52.{edge}")
    if name == "production":
        return (f"{mid} needs an emergency window, so reroute its jobs {JOBS} to equivalent "
                f"machines and ensure no human-robot or shift conflict at plant {pid}; adapt if "
                f"there is one.")
    if name == "quality":
        return (f"Assess the quality impact of the {mid} failure and whether the reroute targets "
                f"(CNC-05-LEI, CNC-08-LEI) are quality-safe for extra load.")
    if name == "compliance_safety":
        actions = ("reduce spindle speed to OEM safe limit; reroute production jobs to equivalent "
                   "machines; open the machine for emergency maintenance / bearing replacement in a "
                   "Saturday window; authorize an emergency parts purchase")
        return (f"Gate EACH of these proposed actions against safety/OSHA, then assemble the audit "
                f"trail for run {state['run_id']}.\nProposed actions: {actions}")
    return "Proceed."


def _task_for(name: str, state: OpsState) -> str:
    return (f"CONVERSATION SO FAR (what the other agents have reported):\n"
            f"{_conversation(state)}\n\n"
            f"YOUR TASK:\n{_instruction(name, state)}\n\n"
            f"If you need input from another specialist, end your reply with a line: "
            f"`FOLLOWUP: <agent_name> — <your question>` (agents: {', '.join(AGENT_NAMES)}).")


# --------------------------------------------------------------------------- #
# Nodes
# --------------------------------------------------------------------------- #
def perceive(state: OpsState) -> dict:
    alert = state["alert"]
    ev = _ev(state["run_id"], "perception", "orchestrator",
             message="Alert received. Orchestrator will route across specialist agents.",
             alert=alert)
    return {"machine_id": alert["machine_id"], "plant_id": alert.get("plant_id", "LEI"),
            "status": "perceiving", "trace": [ev]}


def _make_worker(name: str):
    def node(state: OpsState) -> dict:
        rid = state["run_id"]
        agents = build_agents()
        try:
            result = agents[name].invoke({"messages": [("user", _task_for(name, state))]})
            msgs = result["messages"]
        except Exception as exc:  # noqa: BLE001 — a flaky tool call must not kill the run
            ev = _ev(rid, "agent_error", name, error=str(exc)[:300])
            report = f"[{name} could not complete autonomously: {str(exc)[:200]}]"
            update = {"ops_context": {name: report}, "visited": [name],
                      "transcript": [{"agent": name, "message": report}],
                      "pending_followup": "", "status": f"{name}_error",
                      "trace": [ev, _ev(rid, "agent_report", name, report=report)]}
            if name == "reliability":
                update["risk"] = "HIGH"   # fail toward caution
            if name == "supply_chain":
                update["needs_approval"] = True
            return update

        events, blob = _tool_events(msgs, name, rid)
        report = _agent_report(msgs)
        events.append(_ev(rid, "agent_report", name, report=report))
        followup = _detect_followup(report, name)
        update: dict = {"ops_context": {name: report}, "visited": [name],
                        "transcript": [{"agent": name, "message": report}],
                        "pending_followup": followup or "",
                        "status": f"{name}_done", "trace": events}
        if followup:
            update["trace"].append(_ev(rid, "decision", name,
                                       message=f"{name} asks {followup} a direct follow-up."))

        if name == "reliability":
            if ("interrupted" in blob or "data_unavailable" in blob
                    or '"low_confidence_flag": true' in blob):
                update["escalate"], update["risk"] = True, "ESCALATE"
            elif "spindle_bearing_failure" in blob:
                update["risk"] = "HIGH"
            else:
                update["risk"] = "LOW"
        if name == "supply_chain":
            update["needs_approval"] = True
        if name == "compliance_safety":
            update["halt"] = ('"verdict": "halt"' in blob or "verdict: halt" in report.lower())
        return update
    return node


def _allowed_next(state: OpsState) -> list[str]:
    visited = state.get("visited", [])
    counts = Counter(visited)
    if "reliability" not in visited:
        return ["reliability"]
    if state.get("escalate"):
        return ["FINISH"]
    # Honour a direct agent-to-agent follow-up, bounded by MAX_VISITS to prevent loops.
    fu = state.get("pending_followup")
    if fu and fu in AGENT_NAMES and counts[fu] < MAX_VISITS:
        return [fu]
    if state.get("risk") != "HIGH":
        return ["compliance_safety", "FINISH"] if "compliance_safety" not in visited else ["FINISH"]
    missing = [a for a in CORE_AGENTS if a not in visited]
    if missing:
        return missing                      # LLM picks the ORDER among these
    if "compliance_safety" not in visited:
        return ["compliance_safety"]
    return ["FINISH"]


def _llm_route(state: OpsState, allowed: list[str]) -> str:
    resp = llm.complete(
        _prompt("supervisor_system.md"),
        f"Alert: {json.dumps(state['alert'])}\nAgents already done: {state.get('visited', [])}\n"
        f"Conversation so far:\n{_conversation(state)}\n\nChoose the NEXT agent to run. "
        f"Respond with exactly one of: {allowed}",
    ).lower()
    for a in allowed:
        if a.lower() in resp:
            return a
    return allowed[0]


def supervisor(state: OpsState) -> dict:
    allowed = _allowed_next(state)
    choice = allowed[0] if len(allowed) == 1 else _llm_route(state, allowed)
    ev = _ev(state["run_id"], "route", "orchestrator",
             message=f"Orchestrator routes → {choice}", allowed=allowed)
    return {"next_agent": choice, "trace": [ev]}


def route_from_supervisor(state: OpsState) -> str:
    nxt = state.get("next_agent", "FINISH")
    return "finalize" if nxt == "FINISH" else nxt


def approval_gate(state: OpsState) -> dict:
    rid = state["run_id"]
    if state.get("halt"):
        return {"trace": [_ev(rid, "decision", "orchestrator",
                              message="Plan HALTED by Compliance & Safety — skipping approval.")]}
    if not state.get("needs_approval"):
        return {}
    request = {"type": "approval_request",
               "question": "Approve emergency procurement + maintenance window? (approve / reject)",
               "ceiling_eur": COST_CEILING_EUR,
               "supply_summary": str(state.get("ops_context", {}).get("supply_chain", ""))[:400]}
    write_event(rid, "approval_request", request, "orchestrator")
    decision = interrupt(request)
    return {"approval": decision,
            "trace": [_ev(rid, "human_decision", "human", decision=decision)]}


def synthesize(state: OpsState) -> dict:
    rid = state["run_id"]
    plan = llm.complete(
        _prompt("orchestrator_system.md"),
        f"Synthesise the FINAL action plan in your exact [AUTO]/[APPROVE]/[MONITOR] format, "
        f"integrating ALL specialist findings in the conversation below. Risk={state.get('risk')}. "
        f"Safety halt={state.get('halt', False)}. Human decision on procurement="
        f"{state.get('approval', 'N/A')}.\n\nALERT: {json.dumps(state['alert'])}\n\n"
        f"FULL AGENT CONVERSATION:\n{_conversation(state)}",
    )
    status = "halted" if state.get("halt") else ("escalated" if state.get("escalate")
                                                 else "complete")
    ev = _ev(rid, "plan", "orchestrator", plan=plan)
    return {"final_plan": plan, "status": status, "trace": [ev]}


# --------------------------------------------------------------------------- #
# Graph assembly
# --------------------------------------------------------------------------- #
def build_graph():
    g = StateGraph(OpsState)
    g.add_node("perceive", perceive)
    g.add_node("supervisor", supervisor)
    for name in AGENT_NAMES:
        g.add_node(name, _make_worker(name))
    g.add_node("finalize", approval_gate)
    g.add_node("synthesize", synthesize)

    g.add_edge(START, "perceive")
    g.add_edge("perceive", "supervisor")
    routes = {a: a for a in AGENT_NAMES}
    routes["finalize"] = "finalize"
    g.add_conditional_edges("supervisor", route_from_supervisor, routes)
    for name in AGENT_NAMES:
        g.add_edge(name, "supervisor")
    g.add_edge("finalize", "synthesize")
    g.add_edge("synthesize", END)

    return g.compile(checkpointer=MemorySaver())


FRIDAY_CASCADE_ALERT = {
    "alert_id": "ALT-22847", "machine_id": "CNC-07-LEI", "plant_id": "LEI",
    "plant_name": "Titan Leipzig (Plant 7)", "sensor": "vibration", "value": 7.2,
    "unit": "mm/s_RMS", "threshold": 6.0, "trend": "rising", "baseline": 3.1,
    "trend_window": "6h", "timestamp": "2026-06-12T14:32:00Z",
    "production_impact_per_day_eur": 162000,
}


def make_initial_state(scenario: str = "happy") -> OpsState:
    return {"run_id": new_run_id(), "alert": dict(FRIDAY_CASCADE_ALERT),
            "scenario": scenario, "ops_context": {}, "visited": [], "transcript": [],
            "trace": []}

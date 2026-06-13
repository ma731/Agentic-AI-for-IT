"""
Titan Operations Sentinel — Streamlit demo UI.

Shows the agent's perception → reasoning → action loop live, then pauses at the
human-in-the-loop approval gate with real Approve / Reject buttons that resume the
LangGraph. Three scenario buttons drive the happy / edge / escalation paths.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # repo root → import tos

import streamlit as st
from langgraph.types import Command

from graph import build_graph, make_initial_state

st.set_page_config(page_title="Titan Operations Sentinel", layout="wide")
st.title("🛰️ Titan Operations Sentinel")
st.caption("Agentic AI for Predictive Maintenance & Supply-Chain Intelligence — "
           "LangGraph hierarchical supervisor on Groq / Llama 3.3 70B")

ss = st.session_state
if "graph" not in ss:
    ss.graph = build_graph()
    ss.phase = "idle"
    ss.trace = []
    ss.request = None
    ss.config = None
    ss.final = None

ICON = {"perception": "📡", "route": "🧭", "tool_call": "🔧", "agent_report": "🗒️",
        "decision": "🧠", "escalation": "⚠️", "approval_request": "⏸️",
        "human_decision": "👤", "plan": "📋"}


def collect(stream):
    """Pull trace deltas out of a graph stream into ss.trace; return interrupt payload."""
    paused = None
    for chunk in stream:
        if "__interrupt__" in chunk:
            paused = chunk["__interrupt__"][0].value
            continue
        for _node, update in chunk.items():
            ss.trace.extend((update or {}).get("trace", []))
    return paused


def render_event(ev: dict):
    icon = ICON.get(ev["type"], "•")
    agent = ev.get("agent", "")
    if ev["type"] == "perception":
        a = ev["alert"]
        st.info(f"{icon} **Alert {a['alert_id']}** — {a['machine_id']} · {a['sensor']} "
                f"= {a['value']} {a['unit']} (threshold {a['threshold']}, {a['trend']})\n\n{ev['message']}")
    elif ev["type"] == "route":
        st.markdown(f"{icon} **Orchestrator** routes → `{ev['message'].split('→')[-1].strip()}`  "
                    f"<span style='color:gray'>(choices: {ev['allowed']})</span>", unsafe_allow_html=True)
    elif ev["type"] == "tool_call":
        with st.expander(f"{icon} `{agent}` → **{ev['tool']}**", expanded=False):
            st.write("**input**", ev["input"])
            st.write("**result**", ev["result"])
    elif ev["type"] == "agent_report":
        with st.expander(f"{icon} **{agent}** report", expanded=True):
            st.markdown(ev["report"])
    elif ev["type"] == "decision":
        st.markdown(f"{icon} **{agent}** — {ev['message']}")
    elif ev["type"] == "escalation":
        st.warning(f"{icon} **Escalation ({agent})** — {ev['message']}  \n_reason: {ev.get('reason')}_")
    elif ev["type"] == "human_decision":
        st.success(f"{icon} Human decision recorded: `{ev['decision']}`")
    elif ev["type"] == "plan":
        st.markdown(f"### {icon} Final action plan")
        st.code(ev["plan"], language="text")


# --- Controls -------------------------------------------------------------- #
c1, c2, c3, c4 = st.columns(4)
scenarios = {c1: ("Happy path", "happy"), c2: ("Edge: cross-plant", "edge"),
             c3: ("Escalation: dropout", "escalation")}
for col, (label, scen) in scenarios.items():
    if col.button(label, use_container_width=True):
        ss.trace, ss.request, ss.final = [], None, None
        state = make_initial_state(scen)
        ss.config = {"configurable": {"thread_id": state["run_id"]}, "recursion_limit": 50}
        ss.request = collect(ss.graph.stream(state, ss.config))
        ss.phase = "awaiting_approval" if ss.request else "done"
        if not ss.request:
            ss.final = ss.graph.get_state(ss.config).values
if c4.button("Reset", use_container_width=True):
    ss.trace, ss.request, ss.phase, ss.final = [], None, "idle", None

st.divider()

# --- Trace ----------------------------------------------------------------- #
for ev in ss.trace:
    render_event(ev)

# --- Approval gate --------------------------------------------------------- #
if ss.phase == "awaiting_approval" and ss.request:
    r = ss.request
    st.error("⏸️ **HUMAN APPROVAL REQUIRED** — procurement exceeds the "
             f"€{r['ceiling_eur']} autonomy ceiling")
    st.write(r.get("supply_summary", ""))
    a, b = st.columns(2)
    if a.button("✅ Approve", use_container_width=True):
        ss.request = collect(ss.graph.stream(
            Command(resume={"decision": "approve", "approver": "Plant Manager Schmidt"}), ss.config))
        ss.final = ss.graph.get_state(ss.config).values
        ss.phase = "done"
        st.rerun()
    if b.button("❌ Reject", use_container_width=True):
        ss.request = collect(ss.graph.stream(
            Command(resume={"decision": "reject", "approver": "Plant Manager Schmidt"}), ss.config))
        ss.final = ss.graph.get_state(ss.config).values
        ss.phase = "done"
        st.rerun()

if ss.phase == "done" and ss.final:
    st.caption(f"Run complete · status: **{ss.final.get('status')}**")

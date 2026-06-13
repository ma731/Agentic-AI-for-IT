"""Integration tests for the multi-agent graph.

These require a real tool-calling model (the ReAct agents can't run on the offline
stub), so they SKIP unless GROQ_API_KEY (or an Ollama TOS_MODEL) is configured.

The assertions target the orchestrator's routing *policy*, which is deterministic even
though the agents' internal reasoning is not: on HIGH risk the policy guarantees all five
agents run and compliance gates before finishing; on escalation it stops after reliability.

Run: python -m pytest tests/test_agent_flow.py
"""
import os
import sys
from pathlib import Path

import pytest
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent.parent))
load_dotenv()

from langgraph.types import Command  # noqa: E402

_HAS_MODEL = bool(os.getenv("GROQ_API_KEY")) or os.getenv("TOS_MODEL", "").startswith("ollama")
pytestmark = pytest.mark.skipif(not _HAS_MODEL, reason="no tool-calling model configured (set GROQ_API_KEY)")


def _run(scenario, decision="approve"):
    from graph import build_graph, make_initial_state
    graph = build_graph()
    state = make_initial_state(scenario)
    config = {"configurable": {"thread_id": state["run_id"]}, "recursion_limit": 50}

    def drain(stream):
        paused = None
        for chunk in stream:
            if "__interrupt__" in chunk:
                paused = chunk["__interrupt__"][0].value
        return paused

    paused = drain(graph.stream(state, config))
    if paused is not None:
        drain(graph.stream(Command(resume={"decision": decision}), config))
    return graph.get_state(config).values, paused


def test_happy_engages_all_five_agents_then_completes():
    state, paused = _run("happy", "approve")
    assert state["risk"] == "HIGH"
    assert set(state["visited"]) >= {"reliability", "supply_chain", "production",
                                     "quality", "compliance_safety"}
    assert paused is not None                       # human-in-the-loop fired
    assert state["status"] in {"complete", "halted"}


def test_escalation_stops_after_reliability():
    state, paused = _run("escalation")
    assert state.get("escalate") is True
    assert state["visited"] == ["reliability"]      # no other agent engaged
    assert paused is None
    assert state["status"] == "escalated"


def test_edge_engages_full_team():
    state, paused = _run("edge", "approve")
    assert state["risk"] == "HIGH"
    assert set(state["visited"]) >= {"reliability", "supply_chain", "production",
                                     "quality", "compliance_safety"}
    assert paused is not None

"""Offline tests for the escalation synthesis path.

The escalation branch of `synthesize()` is deterministic (no model call), so unlike the
multi-agent flow tests in `test_agent_flow.py` these run without a GROQ_API_KEY. They guard
the contract that, on escalation, the orchestrator produces a crisp human-review handoff
instead of fabricating an action plan from data it does not trust.

Requires the declared deps (langgraph) to import `graph`. Run: python -m pytest tests/
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import graph  # noqa: E402


def _escalated_state():
    return {
        "run_id": "R-TEST",
        "alert": {"machine_id": "CNC-07-LEI"},
        "plant_id": "LEI",
        "escalate": True,
        "ops_context": {"reliability": "RUL unknown; telemetry interrupted mid-window."},
    }


def test_escalation_status_is_escalated():
    out = graph.synthesize(_escalated_state())
    assert out["status"] == "escalated"


def test_escalation_does_not_call_the_model(monkeypatch):
    """The whole point of escalation is that there is nothing trustworthy to reason over,
    so it must not spend a model call (matters on the Groq free-tier token budget)."""
    def _boom(*a, **k):
        raise AssertionError("llm.complete must not run on the escalation path")
    monkeypatch.setattr(graph.llm, "complete", _boom)
    out = graph.synthesize(_escalated_state())          # would raise if the model were called
    assert out["status"] == "escalated"


def test_escalation_plan_is_a_human_handoff_not_an_action_plan():
    plan = graph.synthesize(_escalated_state())["final_plan"]
    assert "INSUFFICIENT DATA" in plan
    assert "[ESCALATE]" in plan
    # It must NOT present autonomous/approval actions drawn from untrusted data.
    assert "[AUTO]" not in plan
    assert "[APPROVE]" not in plan


def test_escalation_plan_surfaces_the_reliability_finding():
    plan = graph.synthesize(_escalated_state())["final_plan"]
    assert "telemetry interrupted mid-window" in plan
    assert "CNC-07-LEI" in plan

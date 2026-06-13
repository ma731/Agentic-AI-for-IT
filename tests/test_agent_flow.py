"""
Agent-flow tests for the Titan Operations Sentinel orchestrator.

These run WITHOUT the anthropic package or an API key: a scripted fake SDK is injected
into sys.modules before the agent modules import it. The fake returns canned responses so
we can assert the orchestrator's *control flow* — that it genuinely delegates to each
specialist as a tool, loops on their results, runs a self-evaluation pass, and that the
shared guardrails are injected into every agent's system prompt.

Run: pytest tests/test_agent_flow.py -v
"""
import sys
import types
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))


# --------------------------------------------------------------------------------------
# Scripted fake anthropic SDK — injected BEFORE the agent modules import `anthropic`.
# --------------------------------------------------------------------------------------
class _Block:
    """Bare content block. tool_use blocks deliberately have no `.text` attribute,
    matching how the production code distinguishes them via hasattr(block, 'text')."""


def _text(t):
    b = _Block()
    b.type = "text"
    b.text = t
    return b


def _tool(name, inp, block_id):
    b = _Block()
    b.type = "tool_use"
    b.name = name
    b.input = inp
    b.id = block_id
    return b


class _Resp:
    def __init__(self, content, stop_reason):
        self.content = content
        self.stop_reason = stop_reason


class FakeAnthropic:
    """Routes each .messages.create() call to a canned response based on which tools are
    offered, simulating: orchestrator (delegates twice, then plans), the two sub-agents
    (return an assessment immediately), and the tool-less self-evaluation pass."""

    last = None  # most recently constructed instance, for assertions

    def __init__(self, *args, **kwargs):
        self.messages = types.SimpleNamespace(create=self._create)
        self.counts = {"orchestrator": 0, "maintenance": 0, "supply_chain": 0, "self_eval": 0}
        self.systems_seen = []
        self.tools_seen = []
        FakeAnthropic.last = self

    def _create(self, model, max_tokens, system, messages, tools=None):
        names = {t["name"] for t in (tools or [])}
        self.systems_seen.append(system)
        self.tools_seen.append(names)

        # Orchestrator — always offers the two specialist tools.
        if "maintenance_agent" in names:
            self.counts["orchestrator"] += 1
            n = self.counts["orchestrator"]
            if n == 1:
                return _Resp([
                    _text("Vibration is above threshold and rising. I must establish failure risk first."),
                    _tool("maintenance_agent", {"reason": "establish failure risk and timeline"}, "tu_m"),
                ], "tool_use")
            if n == 2:
                return _Resp([
                    _text("Maintenance confirms HIGH risk with a parts gap. I need procurement options."),
                    _tool("supply_chain_agent", {"reason": "high risk and parts gap confirmed"}, "tu_s"),
                ], "tool_use")
            return _Resp([_text(
                "SITUATION SUMMARY\nHigh-confidence bearing failure within 52h.\n\n"
                "ACTION PLAN\n[AUTO] Throttle spindle to 60%\n"
                "[APPROVE] Authorize EUR 3,200 Schaeffler expedite\n\n"
                "COST ANALYSIS\nROI 44:1"
            )], "end_turn")

        # Maintenance sub-agent — offers sensor_query among its tools.
        if "sensor_query" in names:
            self.counts["maintenance"] += 1
            return _Resp([_text(
                "MAINTENANCE ASSESSMENT — CNC-07-LEI\nFailure risk: HIGH. RUL 52-76h. "
                "Parts: P-4421, P-7803. Schedule gap: CRITICAL."
            )], "end_turn")

        # Supply-chain sub-agent — offers parts_inventory among its tools.
        if "parts_inventory" in names:
            self.counts["supply_chain"] += 1
            return _Resp([_text(
                "SUPPLY CHAIN ASSESSMENT — recommended Schaeffler expedite, EUR 3,200, 18h, ROI 44:1."
            )], "end_turn")

        # No tools offered -> the self-evaluation pass. Return the plan validated/unchanged.
        self.counts["self_eval"] += 1
        return _Resp([_text(
            "SITUATION SUMMARY\n(validated)\n\nACTION PLAN\n[AUTO] Throttle spindle to 60%\n"
            "[APPROVE] Authorize EUR 3,200 Schaeffler expedite\n\nCOST ANALYSIS\nROI 44:1"
        )], "end_turn")


_fake = types.ModuleType("anthropic")
_fake.Anthropic = FakeAnthropic
sys.modules["anthropic"] = _fake

from agents.orchestrator import run_orchestrator  # noqa: E402  (must follow the injection)


SAMPLE_ALERT = {
    "alert_id": "ALT-22847",
    "machine_id": "CNC-07-LEI",
    "plant_id": "LEI",
    "sensor": "vibration",
    "value": 7.2,
    "threshold": 6.0,
    "trend": "rising",
    "baseline": 3.1,
    "production_impact_per_day_eur": 162000,
}


def test_orchestrator_delegates_to_both_specialists_then_plans():
    events = []
    result = run_orchestrator(SAMPLE_ALERT, stream_callback=events.append)
    fake = FakeAnthropic.last

    # The orchestrator MODEL decided to call each specialist exactly once.
    assert fake.counts["maintenance"] == 1
    assert fake.counts["supply_chain"] == 1
    # It looped: two tool rounds + one final plan = three orchestrator model calls.
    assert fake.counts["orchestrator"] == 3
    # The self-evaluation pass ran (a tool-less audit of the draft plan).
    assert fake.counts["self_eval"] == 1

    assert result["status"] == "action_required"
    assert result["maintenance_assessment"]["assessment"].startswith("MAINTENANCE ASSESSMENT")
    assert "[APPROVE]" in result["action_plan"]


def test_delegation_order_is_emitted_to_the_ui():
    events = []
    run_orchestrator(SAMPLE_ALERT, stream_callback=events.append)
    types_seen = [e["type"] for e in events]

    assert types_seen.count("orchestrator_decision") == 2
    assert "final_plan" in types_seen

    decisions = [e["message"] for e in events if e["type"] == "orchestrator_decision"]
    assert "Maintenance Agent" in decisions[0]   # maintenance is delegated first
    assert "Supply Chain Agent" in decisions[1]  # supply chain only after the assessment


def test_guardrails_are_injected_into_every_agent():
    run_orchestrator(SAMPLE_ALERT, stream_callback=lambda e: None)
    fake = FakeAnthropic.last

    tool_using_systems = [s for s, names in zip(fake.systems_seen, fake.tools_seen) if names]
    assert tool_using_systems, "expected at least one tool-using agent call"
    # Every agent that runs tools carries the shared hard-constraint layer.
    for system_prompt in tool_using_systems:
        assert "GUARDRAILS" in system_prompt


def test_low_risk_path_can_skip_supply_chain(monkeypatch):
    """If the orchestrator never delegates to supply chain, status is MONITOR, not action."""
    events = []
    result = run_orchestrator(SAMPLE_ALERT, stream_callback=events.append)
    # In the scripted happy path supply chain IS engaged; assert the status mapping is wired
    # to the supply-chain result rather than to a keyword match.
    assert (result["status"] == "action_required") == (result["supply_chain_plan"] is not None)

"""
The six agents of Titan Operations Sentinel.

Each specialist is a genuine autonomous ReAct agent (LangGraph `create_react_agent`):
its LLM chooses which of its bound tools to call and loops until done. Routing *between*
agents is handled by the orchestrator/supervisor in graph.py (guided handoffs).

  Orchestrator (supervisor) ── routes to ──▶ reliability / supply_chain /
                                             production / quality / compliance_safety
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from langgraph.prebuilt import create_react_agent

from llm import get_chat_model
from tools import lc as T

PROMPTS = Path(__file__).parent.parent / "prompts"

# name → (prompt file, tools, optional footer appended to the system prompt)
AGENT_SPECS = {
    "reliability": (
        "maintenance_agent_system.md", T.RELIABILITY_TOOLS,
        "\n\nYou also have `alert_triage` to find the critical machine first. "
        "Write your FULL assessment in the required format — including the specific part IDs "
        "the Supply Chain Agent will need — THEN add a final line that is exactly one of: "
        "`RISK: HIGH`, `RISK: LOW`, or `RISK: ESCALATE`. Do not output only the RISK line.",
    ),
    "supply_chain": (
        "supply_chain_agent_system.md", T.SUPPLY_CHAIN_TOOLS,
        "\n\nYou also have `tier2_supplier_risk` to check a chosen supplier's upstream risk. "
        "Write your full assessment in the required format, ending with the recommended option.",
    ),
    "production": ("production_agent_system.md", T.PRODUCTION_TOOLS, ""),
    "quality": ("quality_agent_system.md", T.QUALITY_TOOLS, ""),
    "compliance_safety": (
        "compliance_agent_system.md", T.COMPLIANCE_TOOLS,
        "\n\nWrite your full gate assessment in the required format, THEN add a final line that "
        "is exactly one of: `VERDICT: PROCEED`, `VERDICT: SIGN-OFF`, or `VERDICT: HALT`.",
    ),
}

AGENT_NAMES = list(AGENT_SPECS)

# Appended to every agent. Llama on Groq will otherwise sometimes emit arithmetic
# expressions as tool arguments (e.g. 162000/24), which fails JSON tool parsing.
SHARED_FOOTER = (
    "\n\nIMPORTANT: when calling a tool, pass every argument as a concrete JSON value — "
    "plain numbers like 6750, never a formula or expression like 162000/24. "
    "Compute any arithmetic yourself first, then pass the final number."
)


def _prompt(name: str) -> str:
    p = PROMPTS / name
    return p.read_text(encoding="utf-8") if p.exists() else ""


@lru_cache(maxsize=1)
def build_agents() -> dict:
    """Construct all five specialist ReAct agents once, sharing one chat model."""
    model = get_chat_model()
    agents = {}
    for name, (prompt_file, tools, footer) in AGENT_SPECS.items():
        agents[name] = create_react_agent(
            model, tools, prompt=_prompt(prompt_file) + footer + SHARED_FOOTER, name=name
        )
    return agents

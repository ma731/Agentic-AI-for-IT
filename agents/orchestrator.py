import json
import anthropic
from pathlib import Path
from agents.maintenance_agent import run_maintenance_agent
from agents.supply_chain_agent import run_supply_chain_agent

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def _load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    return path.read_text() if path.exists() else ""


def run_orchestrator(alert: dict, stream_callback=None) -> dict:
    """
    Main entry point. Receives a machine alert, coordinates Maintenance and Supply Chain agents,
    synthesizes findings into a final prioritized action plan.

    stream_callback(event: dict) propagates all agent steps to the UI in real time.
    """
    client = anthropic.Anthropic()

    orchestrator_prompt = _load_prompt("orchestrator_system.md")
    maintenance_prompt = _load_prompt("maintenance_agent_system.md")
    supply_chain_prompt = _load_prompt("supply_chain_agent_system.md")

    if stream_callback:
        stream_callback({
            "type": "orchestrator_start",
            "alert": alert,
            "message": "Alert received. Assessing failure risk — routing to Maintenance Agent.",
        })

    # Step 1: Maintenance assessment
    maintenance_result = run_maintenance_agent(
        alert=alert,
        system_prompt=maintenance_prompt,
        client=client,
        stream_callback=stream_callback,
    )

    assessment_text = maintenance_result.get("assessment", "")

    # Step 2: Check if high-risk → engage supply chain
    assessment_lower = assessment_text.lower()
    high_risk = any(kw in assessment_lower for kw in ["high", "critical", "failure", "imminent"])

    if not high_risk:
        if stream_callback:
            stream_callback({
                "type": "orchestrator_decision",
                "message": "Risk level: LOW. No supply chain action required. Monitoring mode.",
            })
        return {
            "status": "monitor",
            "maintenance_assessment": maintenance_result,
            "supply_chain_plan": None,
            "action_plan": _build_monitor_plan(alert, assessment_text),
        }

    if stream_callback:
        stream_callback({
            "type": "orchestrator_decision",
            "message": "High-probability failure confirmed. Routing to Supply Chain Agent.",
        })

    # Step 3: Supply chain resolution
    plant_id = alert.get("plant_id", "LEI")
    supply_chain_result = run_supply_chain_agent(
        maintenance_assessment=maintenance_result,
        plant_id=plant_id,
        system_prompt=supply_chain_prompt,
        client=client,
        stream_callback=stream_callback,
    )

    if stream_callback:
        stream_callback({
            "type": "orchestrator_synthesis",
            "message": "Synthesizing findings into action plan.",
        })

    action_plan = _synthesize_action_plan(
        alert, maintenance_result, supply_chain_result, client, orchestrator_prompt
    )

    if stream_callback:
        stream_callback({"type": "final_plan", "plan": action_plan})

    return {
        "status": "action_required",
        "maintenance_assessment": maintenance_result,
        "supply_chain_plan": supply_chain_result,
        "action_plan": action_plan,
    }


def _synthesize_action_plan(alert, maintenance_result, supply_chain_result, client, system_prompt) -> str:
    synthesis_prompt = (
        f"Synthesize the following maintenance and supply chain findings into a final "
        f"prioritized action plan. Label each action [AUTO], [APPROVE], or [MONITOR]. "
        f"Include cost of inaction vs cost of plan.\n\n"
        f"Alert: {json.dumps(alert)}\n\n"
        f"Maintenance Assessment:\n{maintenance_result.get('assessment', '')}\n\n"
        f"Supply Chain Plan:\n{supply_chain_result.get('supply_chain_plan', '')}"
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": synthesis_prompt}],
    )
    return response.content[0].text


def _build_monitor_plan(alert, assessment_text) -> str:
    return (
        f"[MONITOR] Machine {alert.get('machine_id')} — low failure risk. "
        f"Continue monitoring. Re-assess if vibration exceeds 6.0 mm/s or bearing temp rises 5°C.\n\n"
        f"Assessment summary:\n{assessment_text}"
    )

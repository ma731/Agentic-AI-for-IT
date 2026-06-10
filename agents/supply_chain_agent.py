import json
import anthropic
from tools.parts_inventory import parts_inventory
from tools.supplier_catalog import supplier_catalog
from tools.expedite_cost import expedite_cost
from tools.work_order_draft import work_order_draft
from tools.notify import notify

TOOLS = [
    {
        "name": "parts_inventory",
        "description": "Checks on-site and central warehouse stock for specified part numbers.",
        "input_schema": {
            "type": "object",
            "properties": {
                "parts": {"type": "array", "items": {"type": "string"}},
                "plant_id": {"type": "string"},
            },
            "required": ["parts", "plant_id"],
        },
    },
    {
        "name": "supplier_catalog",
        "description": "Returns supplier options, standard and expedited lead times, and cost premiums for part IDs.",
        "input_schema": {
            "type": "object",
            "properties": {
                "part_ids": {"type": "array", "items": {"type": "string"}}
            },
            "required": ["part_ids"],
        },
    },
    {
        "name": "expedite_cost",
        "description": "Calculates ROI for each procurement option against downtime cost. Returns ranked options with recommendation.",
        "input_schema": {
            "type": "object",
            "properties": {
                "options": {"type": "array", "items": {"type": "object"}},
                "downtime_cost_per_hour": {"type": "number"},
                "failure_window_hours": {"type": "integer"},
            },
            "required": ["options", "downtime_cost_per_hour", "failure_window_hours"],
        },
    },
    {
        "name": "work_order_draft",
        "description": "Generates a draft work order for human review. NOT committed until approved.",
        "input_schema": {
            "type": "object",
            "properties": {
                "machine_id": {"type": "string"},
                "plant_id": {"type": "string"},
                "failure_mode": {"type": "string"},
                "parts_required": {"type": "array", "items": {"type": "object"}},
                "proposed_window": {"type": "object"},
                "technicians_required": {"type": "array", "items": {"type": "string"}},
                "estimated_duration_hours": {"type": "integer"},
                "actions": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["machine_id", "plant_id", "failure_mode", "parts_required",
                         "proposed_window", "technicians_required", "estimated_duration_hours", "actions"],
        },
    },
    {
        "name": "notify",
        "description": "Drafts an approval request to the appropriate decision-maker. NOT sent until human reviews.",
        "input_schema": {
            "type": "object",
            "properties": {
                "recipient_role": {"type": "string"},
                "subject": {"type": "string"},
                "situation_summary": {"type": "string"},
                "recommended_actions": {"type": "array", "items": {"type": "object"}},
                "cost_of_inaction_eur": {"type": "number"},
                "cost_of_recommended_plan_eur": {"type": "number"},
                "decision_deadline_utc": {"type": "string"},
                "work_order_id": {"type": "string"},
            },
            "required": ["recipient_role", "subject", "situation_summary",
                         "recommended_actions", "cost_of_inaction_eur",
                         "cost_of_recommended_plan_eur", "decision_deadline_utc"],
        },
    },
]

TOOL_DISPATCH = {
    "parts_inventory": lambda args: parts_inventory(**args),
    "supplier_catalog": lambda args: supplier_catalog(**args),
    "expedite_cost": lambda args: expedite_cost(**args),
    "work_order_draft": lambda args: work_order_draft(**args),
    "notify": lambda args: notify(**args),
}


def run_supply_chain_agent(maintenance_assessment: dict, plant_id: str, system_prompt: str, client: anthropic.Anthropic, stream_callback=None) -> dict:
    """
    Runs the Supply Chain Agent.
    Returns: parts gap analysis, procurement options ranked by ROI, draft WO, draft notification.
    """
    messages = [
        {
            "role": "user",
            "content": (
                f"Based on this maintenance assessment, check parts availability, "
                f"identify procurement options, calculate ROI, draft a work order, "
                f"and draft an approval notification.\n\n"
                f"Plant: {plant_id}\nAssessment: {json.dumps(maintenance_assessment)}"
            ),
        }
    ]

    while True:
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=system_prompt,
            tools=TOOLS,
            messages=messages,
        )

        if stream_callback:
            stream_callback({"type": "agent_response", "agent": "supply_chain", "content": response.content})

        if response.stop_reason == "end_turn":
            final_text = next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )
            return {"supply_chain_plan": final_text, "raw": response.content}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = TOOL_DISPATCH[block.name](block.input)
                    if stream_callback:
                        stream_callback({
                            "type": "tool_call",
                            "agent": "supply_chain",
                            "tool": block.name,
                            "input": block.input,
                            "result": result,
                        })
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result),
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

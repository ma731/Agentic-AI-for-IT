import json
import anthropic
from tools.sensor_query import sensor_query
from tools.rul_predictor import rul_predictor
from tools.asset_profile import asset_profile
from tools.maintenance_schedule import maintenance_schedule

TOOLS = [
    {
        "name": "sensor_query",
        "description": "Returns time-series sensor readings (vibration, temp, current) for a machine over a specified window.",
        "input_schema": {
            "type": "object",
            "properties": {
                "machine_id": {"type": "string"},
                "window": {"type": "string", "enum": ["24h", "48h", "72h"]},
                "sensors": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["machine_id", "window", "sensors"],
        },
    },
    {
        "name": "rul_predictor",
        "description": "Estimates Remaining Useful Life (hours) based on current sensor readings. Returns confidence interval and matched historical failure pattern.",
        "input_schema": {
            "type": "object",
            "properties": {
                "machine_id": {"type": "string"},
                "current_readings": {"type": "object"},
            },
            "required": ["machine_id", "current_readings"],
        },
    },
    {
        "name": "asset_profile",
        "description": "Returns machine specs, bill of materials for common repairs, known failure modes, and technician requirements.",
        "input_schema": {
            "type": "object",
            "properties": {"machine_id": {"type": "string"}},
            "required": ["machine_id"],
        },
    },
    {
        "name": "maintenance_schedule",
        "description": "Returns existing maintenance windows for a plant within a time horizon.",
        "input_schema": {
            "type": "object",
            "properties": {
                "plant_id": {"type": "string"},
                "horizon": {"type": "string", "enum": ["7d", "14d", "30d"]},
            },
            "required": ["plant_id", "horizon"],
        },
    },
]

TOOL_DISPATCH = {
    "sensor_query": lambda args: sensor_query(**args),
    "rul_predictor": lambda args: rul_predictor(**args),
    "asset_profile": lambda args: asset_profile(**args),
    "maintenance_schedule": lambda args: maintenance_schedule(**args),
}


def run_maintenance_agent(alert: dict, system_prompt: str, client: anthropic.Anthropic, stream_callback=None) -> dict:
    """
    Runs the Maintenance Intelligence Agent.
    Returns structured assessment: failure probability, RUL, required parts, schedule gap.
    stream_callback(event: dict) is called for each reasoning step and tool call (for UI).
    """
    messages = [
        {
            "role": "user",
            "content": (
                f"Assess this alert and determine failure risk, predicted timeline, "
                f"required parts, and maintenance window availability.\n\nAlert: {json.dumps(alert)}"
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
            stream_callback({"type": "agent_response", "agent": "maintenance", "content": response.content})

        if response.stop_reason == "end_turn":
            final_text = next(
                (b.text for b in response.content if hasattr(b, "text")), ""
            )
            return {"assessment": final_text, "raw": response.content}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = TOOL_DISPATCH[block.name](block.input)
                    if stream_callback:
                        stream_callback({
                            "type": "tool_call",
                            "agent": "maintenance",
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

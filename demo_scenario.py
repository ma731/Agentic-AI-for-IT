"""
Friday Afternoon Cascade — terminal demo runner.
Runs the full orchestrator flow and prints each step to stdout.
"""
import json
from agents.orchestrator import run_orchestrator

FRIDAY_CASCADE_ALERT = {
    "alert_id": "ALT-22847",
    "machine_id": "CNC-07-LEI",
    "plant_id": "LEI",
    "plant_name": "Titan Leipzig (Plant 7)",
    "sensor": "vibration",
    "value": 7.2,
    "unit": "mm/s_RMS",
    "threshold": 6.0,
    "trend": "rising",
    "baseline": 3.1,
    "trend_window": "6h",
    "timestamp": "2026-06-12T14:32:00Z",
    "production_impact_per_day_eur": 162000,
}


def print_event(event: dict):
    t = event.get("type", "unknown")
    print(f"\n{'='*60}")
    print(f"[{t.upper()}]")

    if t == "orchestrator_start":
        print(f"Alert: {event['alert']['machine_id']} | {event['alert']['sensor']} = {event['alert']['value']} {event['alert']['unit']}")
        print(f"Trend: {event['alert']['trend']} from baseline {event['alert']['baseline']}")
        print(f"Message: {event['message']}")

    elif t == "tool_call":
        print(f"Agent: {event['agent']} | Tool: {event['tool']}")
        print(f"Input:  {json.dumps(event['input'], indent=2)}")
        print(f"Result: {json.dumps(event['result'], indent=2)}")

    elif t in ("orchestrator_decision", "orchestrator_synthesis"):
        print(event["message"])

    elif t == "final_plan":
        print("\n*** FINAL ACTION PLAN ***")
        print(event["plan"])

    elif t == "agent_response":
        for block in event.get("content", []):
            if hasattr(block, "text") and block.text:
                print(f"[{event['agent'].upper()} reasoning] {block.text[:300]}...")


if __name__ == "__main__":
    print("TITAN OPERATIONS SENTINEL — Friday Afternoon Cascade Demo")
    print(f"Alert: {FRIDAY_CASCADE_ALERT['machine_id']} | Vibration {FRIDAY_CASCADE_ALERT['value']} mm/s RMS")

    result = run_orchestrator(FRIDAY_CASCADE_ALERT, stream_callback=print_event)

    print("\n" + "="*60)
    print("FINAL STATUS:", result["status"])

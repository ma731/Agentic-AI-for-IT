# Audit-Log Schema (logging & monitoring)

Appendix artifact (brief §16 "Elite": *sample audit log / logging schema*; also the §6
logging/monitoring architecture component). Every run appends newline-delimited JSON to
`logs/tos_audit.jsonl` — one object per event, written as it happens. It is the system's memory,
its monitoring feed, and the source for the token-free replay.

## Envelope (every event)

```json
{ "run_id": "R-7f3a…", "ts": "2026-06-18T14:32:07Z", "agent": "reliability", "type": "tool_call", "...": "type-specific fields" }
```

| Field | Type | Meaning |
|---|---|---|
| `run_id` | str | groups all events of one run (replay key) |
| `ts` | ISO-8601 | event time |
| `agent` | str | who emitted it (`orchestrator` or an agent id) |
| `type` | enum | event kind (below) |

## Event types

| `type` | Key fields | Emitted when |
|---|---|---|
| `perception` | `alert`, `message` | alert received |
| `route` | `to`, `allowed`, `message` | supervisor picks the next agent |
| `tool_call` | `tool`, `input`, `result` | an agent calls a tool |
| `agent_report` | `report` | an agent finishes its assessment |
| `agent_error` | `error` | an agent degraded (run continues) |
| `decision` / `escalation` | `message` | routing note / agent-to-agent FOLLOWUP / escalation |
| `approval_request` | `question`, `ceiling_eur` | spend > ceiling → human gate opens |
| `human_decision` | `decision` | approve / reject recorded |
| `plan` | `plan` / `status` | final action plan |

## Sample (abridged real run)

```jsonl
{"run_id":"R-7f3a","ts":"2026-06-18T14:32:01Z","agent":"orchestrator","type":"perception","alert":{"id":"ALT-22847","machine_id":"CNC-07-LEI"}}
{"run_id":"R-7f3a","ts":"2026-06-18T14:32:02Z","agent":"orchestrator","type":"route","to":"reliability","allowed":["reliability"]}
{"run_id":"R-7f3a","ts":"2026-06-18T14:32:05Z","agent":"reliability","type":"tool_call","tool":"rul_predictor","input":{},"result":{"rul":"52-76h","conf":0.95}}
{"run_id":"R-7f3a","ts":"2026-06-18T14:32:07Z","agent":"reliability","type":"agent_report","report":"RISK=HIGH; RUL 52-76h; parts P-4421, P-7803"}
{"run_id":"R-7f3a","ts":"2026-06-18T14:33:10Z","agent":"orchestrator","type":"approval_request","question":"Authorize €3,200 expedite?","ceiling_eur":500}
{"run_id":"R-7f3a","ts":"2026-06-18T14:33:24Z","agent":"human","type":"human_decision","decision":"APPROVED"}
{"run_id":"R-7f3a","ts":"2026-06-18T14:33:25Z","agent":"orchestrator","type":"plan","status":"complete"}
```

## Why it matters
- **Compliance / traceability:** a complete, timestamped record of every perception, decision, and approval — `audit_assemble` reconstructs it for the auditor.
- **Monitoring:** the metrics in `evaluation_metrics.md` (tool-selection accuracy, escalation rate, time-to-plan) are all derivable from this log — no extra instrumentation.
- **Zero-cost demo:** `scripts/view_run.py` replays a run straight from this file with no API calls.

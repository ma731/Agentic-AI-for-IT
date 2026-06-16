# Risk Matrix — Titan Operations Sentinel

Assignment brief §10 format. For Q&A appendix and 15pt Risk Awareness rubric dimension.

---

## Risk table

| Risk | Why it matters here | Mitigation |
|---|---|---|
| **Hallucinated RUL prediction** | Wrong timeline → wrong urgency → emergency order triggered too late or too early | `rul_predictor` grounds output in historical pattern match; `low_confidence_flag: true` when confidence < 0.6 → escalation path; agent cites matched historical event in its report |
| **Stale inventory data** | Parts ordered that aren't on-site → plan fails at execution | `parts_inventory` returns data timestamp; staleness flag if > 4h; agent re-queries before committing |
| **Unauthorized cost approval** | Agent approves purchase beyond authority → financial / control breach | Hard €500 ceiling in autonomy policy and all agent prompts; any cost above → APPROVE tier routed to plant manager via `interrupt()` gate |
| **Prompt injection via data feeds** | Malicious payload in sensor data or tool output hijacks agent behavior | Tool output never executed as code; system prompt scope lock; `safety_gate` runs on every proposed action description |
| **False positive → unnecessary downtime** | Healthy machine shut down or throttled on bad signal | RUL prediction requires `confidence ≥ 0.6`; throttle (AUTO) ≠ shutdown (APPROVE); no autonomous shutdown in any tier |
| **Cascade failure in multi-agent chain** | Reliability agent returns bad data → Supply Chain agent makes wrong procurement call | Orchestrator validates outputs at each handoff; `agent_error` trace event degrades gracefully (run continues, error surfaces in plan); `safety_gate` is always last before FINISH |
| **Sensor telemetry dropout** | RUL cannot be assessed → agent must not guess | `sensor_status: INTERRUPTED` from `sensor_query` → escalation path → human inspection checklist; agent does not proceed with incomplete telemetry |
| **Over-automation eroding technician judgment** | Plant staff stop learning manual diagnosis; skill atrophy | All reasoning steps are visible in the Streamlit trace; agent designed as advisor first, actor second; AUTO tier limited to speed throttle + job rerouting within OEM params |
| **Safety-critical action taken autonomously** | Safety system bypassed → personnel risk | Safety actions are categorically excluded from AUTO tier; `safety_gate` can return `HALT` which overrides all agents and stops the plan; HALT routes to safety officer |
| **Token budget exhaustion (free-tier LLM)** | Run silently truncated mid-analysis | Transcript trimmed per-agent with `clip()` before injection into context; tested via `test_token_budget.py`; Gemini 2.5 Flash is primary provider (higher free quota than Groq) |
| **Model refusing tool call (Llama/Groq)** | Agent emits arithmetic expression as arg → Groq rejects the tool call → agent stalls | `SHARED_FOOTER` in every agent prompt: "pass numeric tool args as plain numbers, never as expressions"; validated in live Groq runs |

---

## Human-in-the-loop approval matrix

| Action | Tier | Who approves | Implementation |
|---|---|---|---|
| Throttle machine speed within OEM parameters | AUTO | None | Agent executes; logged to audit trail |
| Re-route production jobs between equivalent machines | AUTO | None | `job_reroute` returns proposal; agent marks `[AUTO]` in plan |
| Update asset log / maintenance record | AUTO | None | Tool call; no human gate |
| Generate draft work order | AUTO (draft) | Human releases | `work_order_draft` outputs `DRAFT_PENDING_APPROVAL`; not committed |
| Draft approval notification | AUTO (draft) | Human reviews before send | `notify` outputs `DRAFT_PENDING_SEND` |
| Parts order ≤ €500 | APPROVE | Shift supervisor | `interrupt()` pauses graph; resumes on approve/reject |
| Parts order €500–€10k | APPROVE | Plant manager | `interrupt()` pauses graph |
| Parts order > €10k | APPROVE | Procurement + plant director | `interrupt()` pauses graph + escalation note |
| Emergency maintenance window (affects production) | APPROVE | Plant manager | `interrupt()` pauses graph |
| Any action touching safety systems | ESCALATE | Safety officer | `safety_gate` returns `ESCALATE`; plan halts until reviewed |
| `HALT` verdict from `safety_gate` | HALT (plan stops) | Safety officer | Graph terminates current run; no further AUTO or APPROVE actions |

---

## Confidence threshold policy

| Condition | Agent behavior |
|---|---|
| `rul_predictor.confidence ≥ 0.8` | Proceed with full autonomy on AUTO-tier actions |
| `rul_predictor.confidence 0.6–0.79` | Proceed but surface confidence prominently in approval request |
| `rul_predictor.confidence < 0.6` | `low_confidence_flag: true` → escalation path → human inspection, no procurement |
| `sensor_status: INTERRUPTED` | Escalation path immediately; no RUL estimate attempted |
| Any tool returns `{"error": ...}` | `agent_error` trace event; run continues with degraded info; flagged in final plan |

---

## Failure mode table

| Failure | System response | User impact |
|---|---|---|
| Groq / Gemini API down | `llm.complete()` falls back to templated stub; ReAct agents cannot run (need real model) | Demo-day: switch to `TOS_MODEL=ollama:llama3.1:8b`; routing/synthesis still works offline |
| Sensor file missing | `sensor_query` returns `{"error": "data_unavailable"}` | Reliability agent cannot assess; plan notes data gap; no procurement triggered |
| Parts data stale > 4h | `parts_inventory` returns `staleness_flag: true` | Supply Chain agent surfaces caveat in recommendation; approval request flags it |
| `safety_gate` unreachable | Fallback returns `ESCALATE` (fail-safe) | Plan pauses for human; nothing proceeds autonomously |
| Token quota exhausted (Groq free tier) | Run truncated mid-agent | Re-run on Gemini or local Ollama; use `scripts/view_run.py` to replay last partial run |

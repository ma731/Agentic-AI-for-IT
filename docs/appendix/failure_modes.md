# Failure-Mode Table (FMEA)

Appendix artifact (brief §16 "Elite": *failure mode table*). How each part fails, how the system
**detects** it, and what happens — every row is real behaviour in the code, not aspiration.

| # | Component | Failure mode | Detection | System response | Severity | Residual risk |
|---|-----------|--------------|-----------|-----------------|----------|---------------|
| 1 | LLM provider | rate-limit (429) / timeout | exception on `invoke` | `max_retries` exponential backoff → on exhaustion, `llm.complete` degrades to a labelled stub; recorded replay for the demo | Med | brief stall; mitigated by provider-swap |
| 2 | LLM provider | daily quota exhausted | repeated 429 | one-line provider swap (Gemini→OpenRouter→Groq) or replay | Med | none for demo (replay) |
| 3 | A ReAct agent | tool call errors / model hiccup | per-agent `try/except` | degraded report, **run continues**; Reliability error ⇒ `risk=HIGH` (fail-safe) | Low | one agent's depth reduced |
| 4 | Telemetry feed | interrupted / dropout | `sensor_status`, dropout scenario | Reliability flags low confidence → **escalation**, no fabricated plan | High→Low | human inspects |
| 5 | Tool output | malformed / out-of-range value | schema-shaped returns; downstream sanity | agent reasons over what it has; compliance still gates | Low | rare bad recommendation, caught at gate |
| 6 | Compliance | proposed action violates OSHA/OEM | `safety_gate` verdict = HALT | plan **stopped**, approval skipped, `status=halted` | High→none | action never executes |
| 7 | Supervisor | agents loop on follow-ups | `MAX_VISITS` cap per agent | bounded re-routing → guaranteed termination | Low | none |
| 8 | Spend | recommendation exceeds budget | €500 ceiling check | forced to APPROVE tier → `interrupt()` human gate | High→none | human decides |
| 9 | Cost | token runaway across agents | transcript caps (`PEER/ROUTE/REPORT_*_CHARS`) | context bounded ~62% | Low | none |
| 10 | Prompt injection (prod) | malicious tool/data content | tools are pure functions over fixed data; scoped prompts | no shell/eval, no open web | Med | sanitisation needed at prod ingest |

**Severity legend:** the `High→none/Low` arrows show severity *before → after* the mitigation —
the point of the design is that the high-severity modes are driven to near-zero by a gate, a cap,
or a human, not left open.

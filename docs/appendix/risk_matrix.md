# Risk Matrix & Mitigations — Titan Operations Sentinel

Appendix artifact for the Agentic AI assignment (rubric: *Risk Awareness & Mitigation*, 15 pts).
Every mitigation below points at something that **actually exists in the system**, not an aspiration.

---

## 1. Risk matrix (brief §10)

| # | Risk | Why it matters | Mitigation **in this system** | Mitigation **for production** |
|---|------|----------------|-------------------------------|-------------------------------|
| 1 | **Hallucinated recommendation** | A wrong RUL or sourcing call drives a costly bad decision | Specialists reason **only over tool outputs** (sensor/inventory/supplier data); the orchestrator synthesises from the shared transcript, not free invention; Compliance gates the plan | Confidence thresholds + retrieval grounding + mandatory human review on high-impact actions |
| 2 | **Unauthorized / over-budget action** | Financial or legal exposure | Hard **€500 cost ceiling**; any spend above it is forced to the **APPROVE** tier and pauses at the `interrupt()` **human approval gate**; agents cannot self-approve | Role-based access (plant-manager vs safety-officer); signed approvals; spend audit |
| 3 | **Sensitive data exposure** | Compliance / privacy breach | All scenario data is **simulated** (no PII, no live SCADA/ERP); every step is written to an **audit log** for review | Field-level masking + permission checks + encrypted audit store |
| 4 | **Bad / failed tool output** | One bad tool poisons the whole plan | **Per-agent `try/except`**: a flaky tool call degrades to a noted error and the run continues; reliability **fails toward caution** (error ⇒ risk = HIGH) | Schema validation on tool returns + retry + typed fallbacks per tool |
| 5 | **Overconfidence on thin data** | Acting on unreliable signals erodes trust | Interrupted / low-confidence telemetry ⇒ **escalation**: the system returns *"INSUFFICIENT DATA — HUMAN REVIEW"* and **refuses to fabricate an action plan** | Explicit confidence score surfaced to the user + auto-abstain band |
| 6 | **Prompt injection** | Malicious input hijacks agent behaviour | Tools are **pure functions over fixed scenario data** — no shell/eval, no open web; agent scope is locked by `guardrails.md` composed onto every prompt | Input sanitisation, allow-listed tool args, output filtering |
| 7 | **Stale / incomplete data** | Decisions made on the wrong picture | `sensor_status` and **dropout detection** flag bad feeds; a dropout routes straight to escalation rather than a plan | Freshness timestamps + source citation + staleness alerts |
| 8 | **Over-automation** | Removes human judgement where it's needed | **Autonomy tiers** (AUTO / APPROVE / ESCALATE); **Compliance can HALT** the entire plan; the human gate fires on any real spend | Tunable autonomy thresholds + periodic human-in-the-loop audits |
| 9 | **Provider rate-limit / outage mid-run** | A dead model kills the live demo | `max_retries` **exponential backoff** on 429s; `llm.complete()` degrades to a labelled stub; **recorded replay** runs the demo with **zero API calls** | Multi-provider failover + queued retries |
| 10 | **Cost / token runaway** | Free-tier quota exhausted before the demo | **Transcript token caps** (~62% reduction) + the €500 hard ceiling on actions | Budget guards + per-run token accounting + alerting |

---

## 2. Human-in-the-loop approval matrix (brief §10)

| Tier | Example actions | Who decides | Mechanism in code |
|------|-----------------|-------------|-------------------|
| **AUTO** (low risk) | Throttle spindle within OEM limits, reroute jobs, draft a work order, write logs | Agent executes autonomously | direct tool calls |
| **APPROVE** (medium risk) | Any purchase, any emergency maintenance window affecting production (and **any spend > €500**) | **Plant manager** | `interrupt()` approval gate — graph pauses for approve/reject |
| **ESCALATE** (high risk) | Anything touching safety systems; any low-confidence / insufficient-data situation | **Safety officer** | escalation path → `_escalation_plan()` human handoff; Compliance **HALT** |

---

## 3. Failure-mode table (elite differentiator, brief §16)

| Component | Failure | How it's detected | How the system handles it |
|-----------|---------|-------------------|---------------------------|
| LLM provider | 429 / timeout / outage | exception on invoke | `max_retries` backoff → labelled offline stub → recorded replay for the demo |
| A specialist ReAct agent | tool call errors or model hiccup | `try/except` around the agent run | degraded report, **run continues**; reliability error ⇒ risk = HIGH (fail-safe) |
| Telemetry feed | interrupted / dropout | `sensor_status`, dropout scenario data | reliability flags low confidence → **escalation**, no fabricated plan |
| Compliance & Safety | proposed action violates OSHA/safety rule | `safety_gate` verdict = HALT | plan **stopped**; approval gate skipped; status = halted |
| Supervisor routing | agents could loop on follow-ups | `MAX_VISITS` cap per agent | bounded re-routing → guaranteed termination |
| Spend | recommendation exceeds budget | €500 ceiling check | forced to APPROVE tier → human gate |

---

*Each row above is demonstrable: the happy path shows the approval gate, the escalation path shows
the insufficient-data handoff, and a forced tool error shows graceful degradation.*

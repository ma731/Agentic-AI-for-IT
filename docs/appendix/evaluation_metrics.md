# Evaluation Metrics — three layers

Appendix artifact (brief §12 — a "standout/high-score" differentiator). How we'd measure success
in production, across product, agent, and business layers. Targets are illustrative but concrete.

---

## Layer 1 — Product metrics
| Metric | Definition | Target |
|---|---|---|
| Task completion rate | runs that reach an approved/recorded plan without manual rescue | ≥ 90% |
| Time-to-plan | alert → costed action plan | < 2 min (vs hours manually) |
| Human time saved per incident | analyst minutes displaced | ≥ 80% reduction |
| Adoption | % of eligible alerts routed through the agent | ≥ 70% in 6 months |

## Layer 2 — Agent-performance metrics
| Metric | Definition | Target |
|---|---|---|
| Tool-selection accuracy | correct tool chosen for the step (vs expert label) | ≥ 95% |
| Plan success rate | plans that, when executed, resolve the issue | ≥ 90% |
| **Escalation rate** | runs correctly handed to a human on low-confidence data | tracked, not minimised — *calibration* matters |
| Hallucination / error rate | recommendations unsupported by tool data | < 2% |
| Safety-gate catch rate | unsafe actions caught by Compliance before execution | 100% (non-negotiable) |

## Layer 3 — Business metrics
| Metric | Definition | Target |
|---|---|---|
| Downtime cost avoided | €/incident vs the €180k/day baseline | primary KPI |
| Expedite ROI realised | actual vs predicted sourcing ROI | within ±15% of estimate |
| SLA / on-time maintenance | windows hit before predicted failure | ≥ 95% |
| Cost to run | LLM spend per incident | < €0.10 (free-tier / pay-as-you-go) |

---

### How we'd actually collect these
Every run already writes a structured **audit log** (`tos_audit.jsonl`: perceptions, tool calls,
decisions, approvals, the final plan). That log is the measurement substrate — tool-selection
accuracy, escalation rate, and time-to-plan are all derivable from it offline, no extra
instrumentation needed. The token-accounting harness adds cost-per-run.

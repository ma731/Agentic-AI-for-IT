# Why an Agent — not a dashboard, alert, or RPA script

Appendix artifact (rubric: *Problem Framing*, 15 pts; brief §15 mandatory Q&A). The professor
explicitly asks: *"Why does this need an agent instead of rule-based automation or a dashboard?"*

---

## The one-line answer
**A dashboard tells a human what's wrong and waits. An RPA script does one fixed thing. Our agent
*reasons across five domains*, decides what to do, and produces a costed, safety-gated action plan —
adapting when the data is messy — then hands the human a decision, not a problem.**

---

## The Friday Cascade, three ways

| | **Dashboard / BI** | **RPA / rule script** | **Agentic AI (ours)** |
|---|---|---|---|
| Sensor spike detected | Lights up a chart | Fires a templated alert | Triages 22k alerts → confirms the critical machine |
| Failure timeline | Human must interpret | n/a | Predicts RUL, identifies the failure mode + parts |
| Parts gap | Human checks ERP | Fixed reorder rule | Finds the gap, ranks suppliers by **ROI**, checks Tier-2 risk |
| Production impact | Separate tool | n/a | Reroutes jobs **without breaking shift/robot constraints** |
| Quality & safety | Separate teams | n/a | Correlates defects; **OSHA-gates every action**, can HALT |
| Output | 6 dashboards, 1 stressed engineer | A ticket | **One costed plan**, safety-checked, awaiting one approval |
| Messy data | Shows a gap | Breaks or proceeds blindly | **Escalates**: "insufficient data — human review" |

## Why each non-agentic option falls short
- **Dashboard:** shifts the cognitive load onto a human under time pressure (€6,750/hour of downtime). It *describes*; it doesn't *decide* or *act*. Five dashboards across five teams = no single coherent plan.
- **RPA / rules:** brittle. It can't weigh ROI vs risk, can't adapt a reroute around an operator conflict, and has no notion of "I'm not confident — escalate." Every new situation needs a new rule.
- **Single LLM chatbot:** can talk about the problem but has no tools, no autonomy tiers, no human gate, no audit trail — it can't *act* safely.

## What specifically requires genuine agency
1. **Planning over open situations** — the order of operations isn't fixed; the supervisor routes based on what each agent finds.
2. **Tool selection under uncertainty** — each ReAct agent chooses its own tools and loops until done.
3. **Cross-domain trade-offs** — reliability ↔ supply ↔ production ↔ quality ↔ compliance can't be a lookup table.
4. **Adaptation & abstention** — it reroutes around conflicts, and it *refuses to act* on bad data instead of guessing.

> **The distinction the professor cares about (brief §6):** the **agent** interprets the goal, plans,
> and *decides*; the **tools** only fetch data, compute, draft, or check. Our tools never make
> decisions — they `fetch / compute / draft`, and the agent decides. That separation is what makes
> the autonomy *safe*.

# CLAUDE.md — Titan Operations Sentinel

Project guidance for Claude Code sessions. Read this first. Details live in the code and prompts — this file is pointers and conventions.

---

## 1. What this is

**Titan Operations Sentinel (TOS)** — agentic AI system for a manufacturing course group project (IE University, Agentic AI for IT). Presentation: June 24, 2026.

Detects early failure signals in CNC machines, reasons across maintenance + supply chain data, and autonomously orchestrates the response.

**Demo scenario:** "The Friday Afternoon Cascade" — CNC-07-LEI spindle bearing failure predicted 52–76h out, parts shortage confirmed, agent calculates ROI and drafts action plan for plant manager approval.

---

## 2. Architecture

A **multi-agent operations brain** — six agents that solve all five TMC challenges by
sharing one operational context and being routed by an LLM orchestrator.

```
perceive → SUPERVISOR ⇄ { reliability        (challenge 1)
                          supply_chain        (challenge 2)
                          production           (challenge 3)
                          quality              (challenge 4)
                          compliance_safety }  (challenge 5)  → finalize(⏸ approval) → synthesize
```

**Pattern:** Orchestrator/supervisor + 5 autonomous specialist agents, as a LangGraph `StateGraph`.

**Agents are real ReAct agents** (`agents.py`, `create_react_agent`): each specialist's LLM
**chooses its own tools** and loops until done. The **orchestrator controls routing** between
agents (`supervisor` node) — "autonomous tools, guided handoffs".

**Routing = guided autonomy:** a policy in `_allowed_next()` guarantees coverage (on HIGH risk,
all of supply_chain/production/quality run) and termination (compliance_safety always gates
before FINISH). When ≥2 agents are allowed, the LLM picks the order; when 1 is allowed it's
deterministic. This is the "deterministic vs model-driven" split for the rubric.

**Natural-language communication:** every agent appends its full report to a shared `transcript`
that all later agents read; an agent may end with `FOLLOWUP: <agent> — <q>` to ask another
specialist directly (honoured by the supervisor, capped at `MAX_VISITS` to prevent loops).
`ops_context` keeps the latest report per agent for quick lookup.
**Safety override:** `compliance_safety` can return HALT, which stops the whole plan.
**Human-in-the-loop:** the approval gate uses `interrupt()` + `MemorySaver` checkpointer — the
graph pauses for a human approve/reject. Checkpointer also = **episodic memory**.

**Framework:** LangGraph (NOT direct Anthropic SDK). Migrated 2026-06-13; expanded to 6 agents 2026-06-13.
**Model:** Groq / `llama-3.3-70b-versatile` (free tier) via `init_chat_model`, set by `TOS_MODEL`;
one-line swap to `ollama:...` offline. `llm.complete()` (used for routing/synthesis only) degrades
to a templated stub with no provider; the ReAct agents need a real tool-calling model (`get_chat_model`).

---

## 3. Repo structure

Flat layout (run everything from the repo root):

```
graph.py                 # orchestration: supervisor + workers + transcript + approval gate
agents/
  __init__.py            # exports build_agents, AGENT_NAMES, AGENT_SPECS
  factory.py             # builds the 5 ReAct agents (create_react_agent)
tools/
  lc.py                  # LangChain @tool wrappers (grouped per agent)
  alert_triage, sensor_query, rul_predictor, asset_profile          # reliability (1)
  parts_inventory, supplier_catalog, expedite_cost, tier2_supplier_risk  # supply chain (2)
  job_reroute, robot_cell_status, shift_conflict_check              # production/human-robot (3)
  quality_history, telemetry_correlate                              # quality (4)
  safety_gate, audit_assemble                                       # compliance & safety (5)
  maintenance_schedule, work_order_draft, notify                    # shared / scheduling
prompts/                 # supervisor + orchestrator + 5 agent prompts + guardrails + self_eval
data/                    # scenario data: alerts/ sensors/ assets/ inventory/ suppliers/ production/ quality/ compliance/
llm.py                   # model factory: get_chat_model() for agents; complete() for routing/synthesis
audit_log.py             # JSONL audit trail → logs/tos_audit.jsonl (read by audit_assemble)
scripts/
  run_demo.py            # terminal runner — happy / edge / escalation
  view_run.py            # replay a recorded run from the audit log (no tokens)
streamlit_app/
  app.py                 # Streamlit UI — live multi-agent trace + human approval gate
tests/
  test_tools.py          # 17 tool unit tests (offline)
  test_agent_flow.py     # 3 multi-agent flow tests (skip without GROQ_API_KEY)
docs/                    # brief, brainstorm, case study, PROGRESS.md, tool_catalog.md, architecture.mmd
```

**Imports:** top-level modules use absolute imports (`import llm`, `from agents import build_agents`,
`from tools.X import ...`). `agents/` and `tools/` are packages (have `__init__.py`); within them use
relative imports (`from .factory import ...`, `from .alert_triage import ...`). Entrypoints in
`scripts/` and `streamlit_app/` add the repo root to `sys.path`, so run them from the repo root.

---

## 4. Key data IDs (Friday Cascade scenario)

| ID | Meaning |
|----|---------|
| `CNC-07-LEI` | Machine: CNC Machining Center #7, Leipzig Plant 7 |
| `LEI` | Plant: Titan Leipzig |
| `P-4421` | Part: spindle bearing kit — 0 units on-site, 3 in Amsterdam warehouse |
| `P-7803` | Part: hydraulic seal set — 1 unit on-site (need 2), 4 in Amsterdam |
| `AMS` | Central warehouse: Amsterdam |

---

## 5. Autonomy tiers (load-bearing — do not change without updating prompts)

| Tier | What | Who approves |
|------|------|-------------|
| AUTO | Throttle machine speed within OEM params, re-route jobs, update logs, generate draft WO | None — agent executes |
| APPROVE | Any purchase, emergency maintenance window affecting production | Plant manager |
| ESCALATE | Any action touching safety systems | Safety officer |

**Hard ceiling:** agent cannot approve costs > €500. Anything above → APPROVE tier, routed to plant manager.

---

## 6. Tool ordering policy (recommended in system prompts, not hard-enforced)

Agents are autonomous (ReAct) — they choose tool order. The recommended order lives in each
agent's prompt:

```
reliability:  alert_triage → sensor_query → rul_predictor → asset_profile
supply_chain: parts_inventory → supplier_catalog → expedite_cost (→ tier2_supplier_risk)
```

If you need strict ordering for a tool, state it firmly in that agent's prompt. Don't rely on
graph edges to order within-agent calls anymore — that's the agent's job now.

---

## 7. Trace event contract (graph state `trace`, rendered by demo + Streamlit)

Each node appends typed events to `state["trace"]` (reducer = list add); they are also written
to the audit log. Event types:

```python
{"type": "perception",   "alert": dict, "message": str}
{"type": "route",        "agent": "orchestrator", "allowed": list, "message": str}
{"type": "tool_call",    "agent": str, "tool": str, "input": dict, "result": any}
{"type": "agent_report", "agent": str, "report": str}
{"type": "agent_error",  "agent": str, "error": str}     # degraded — run continues
{"type": "decision" | "escalation", "agent": str, "message": str}
{"type": "approval_request", "question": str, "ceiling_eur": int}
{"type": "human_decision",   "decision": dict}
{"type": "plan",             "plan": str}
```

---

## 8. Environment

```bash
pip install -r requirements.txt        # install dependencies
cp .env.example .env                   # add GROQ_API_KEY (free, console.groq.com)
python scripts/run_demo.py             # happy path (auto-approves)
python scripts/run_demo.py edge        # cross-plant adaptation path
python scripts/run_demo.py escalation  # telemetry dropout → stops after reliability
python scripts/view_run.py             # replay last recorded run (no tokens) — also --list, RUN-id
python -m pytest tests/test_tools.py   # 17 tool tests, offline, no key needed
python -m pytest tests/                # also runs flow tests (need GROQ_API_KEY; else skipped)
streamlit run streamlit_app/app.py     # demo UI with live multi-agent trace + approval gate
```

The 5 ReAct agents need a real tool-calling model (GROQ_API_KEY in `.env`, or `TOS_MODEL=ollama:…`).
Only the routing/synthesis `llm.complete()` calls can fall back to the offline stub.

---

## 9. What to avoid

- Do not add a new tool without: writing the pure function in `tools/`, a `@tool` wrapper in
  `tools_lc.py`, adding it to the right agent group, and updating `docs/tool_catalog.md`.
- Do not add an agent without a prompt in `prompts/`, an entry in `AGENT_SPECS`, a worker node +
  edges in `graph.py`, and a routing-policy update in `_allowed_next()`.
- Pass numeric tool args as plain numbers in prompts — Llama emits arithmetic expressions
  otherwise and Groq rejects the tool call (see `SHARED_FOOTER` in agents.py).
- Do not change autonomy tiers / the €500 ceiling without updating §5 and the agent prompts.
- Do not use `git add -A`/`git add .` — stage explicit paths to avoid committing `.env`.
- Do not hardcode machine IDs or part numbers in agent code — they come from alerts/tool outputs.

---

## 10. Build status

| Component | Status |
|-----------|--------|
| 6-agent architecture (orchestrator + 5 ReAct specialists) | Done |
| All 5 TMC challenges covered (1–5) | Done |
| Tool functions (18) + `@tool` wrappers | Done |
| Data files incl. challenge 3/4/5 + edge + dropout | Done |
| Agent prompts (5) + supervisor + guardrails + self-eval | Done |
| Shared blackboard, guided routing, safety HALT, interrupt approval | Done |
| Audit log + `audit_assemble` reconstruction | Done |
| Streamlit UI (live multi-agent trace + approval) | Done |
| Tool tests (17, offline) | Done |
| Live Groq run verified (happy path end-to-end) | Done |
| Full flow tests (happy/edge/escalation) live | In progress / verify |
| Slides | TODO |

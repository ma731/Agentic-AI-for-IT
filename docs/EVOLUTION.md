# Repository Evolution — Titan Operations Sentinel

How this project was built, what changed between sessions, and why. Useful context for any new contributor or for Q&A.

---

## Timeline

| Date | What happened |
|---|---|
| June 10, 2026 | Session 1 — full skeleton with direct Anthropic SDK |
| June 13, 2026 | Session 2 — migrated to LangGraph + Groq, closed rubric gaps |
| June 13, 2026 | Session 3 — expanded to 6 agents covering all 5 TMC challenges |
| June 13–16, 2026 | 4 fix/perf/feat PRs merged to main |

---

## Session 1 — June 10, 2026: Skeleton (direct Anthropic SDK)

**Commit:** `feat: scaffold full TOS agent skeleton — tools, agents, data, prompts`

### What was built

- **3 agents** using direct Anthropic SDK `tool_use` loop:
  - `agents/orchestrator.py` — received alert, routed to specialists, synthesized plan
  - `agents/maintenance_agent.py` — sensor → RUL → asset profile → schedule
  - `agents/supply_chain_agent.py` — inventory → supplier → ROI → draft WO
- **8 tools** covering challenges 1 and 2 only
- **Friday Cascade scenario data** baked into `data/` (CNC-07-LEI sensor readings, parts shortage, supplier catalog)
- **5 prompts** (orchestrator, maintenance, supply chain, guardrails, self-eval)
- Streamlit `app.py` as a placeholder
- `demo_scenario.py` as a terminal runner

### Key decisions made here

- Direct Anthropic SDK (not LangChain) — chain-of-thought must be visible per the rubric
- `stream_callback` contract for Streamlit rendering
- `€500` autonomy ceiling (hard-coded in prompts)
- Risk-first sort in `expedite_cost` (Schaeffler ranks above warehouse transfer even though warehouse is cheaper)

### What was left TODO

- HITL was described but not implemented (no real approval gate)
- Streamlit was a placeholder
- Edge and escalation scenarios were described but not implemented
- Challenges 3–5 not covered
- No logging/monitoring component

---

## Session 2 — June 13, 2026: LangGraph + Groq migration

**Commits:** `tools → agents → data → prompts → core → scripts → streamlit_app → tests → docs`

### Why this happened

Assignment §14 explicitly forbids paid API keys. The group had no Anthropic key. The Session 1 direct SDK approach had to be replaced. Simultaneously, a compliance audit flagged rubric gaps.

### What changed

| Component | Before | After |
|---|---|---|
| Agent framework | Direct Anthropic SDK `tool_use` loop | LangGraph `StateGraph` |
| Model | `claude-sonnet-4-6` (unavailable) | Groq `llama-3.3-70b-versatile` (free tier) |
| HITL | Described in prompts only | `interrupt()` + `MemorySaver` — live approve/reject |
| Logging | None | `audit_log.py` → `logs/tos_audit.jsonl` |
| Edge scenario | Described only | `data/suppliers/supplier_catalog_edge.json` — real data |
| Escalation scenario | Described only | `data/sensors/CNC-07-LEI_dropout.json` — real data |
| Streamlit | Placeholder | Live trace + Approve/Reject buttons wired to `interrupt()` |
| Demo runner | `demo_scenario.py` | `scripts/run_demo.py` (3 scenarios) + `scripts/view_run.py` (replay) |
| Tests | Described | 14 offline tests — all passing |

### New files

- `graph.py` — the entire orchestration: `StateGraph`, supervisor node, worker nodes, approval gate
- `llm.py` — provider-agnostic model factory (`get_chat_model` for agents, `complete` for routing/synthesis, templated stub offline)
- `audit_log.py` — JSONL audit trail
- `scripts/run_demo.py`, `scripts/view_run.py`
- Rebuilt `streamlit_app/app.py`

### Rubric gaps closed

- Edge path (cross-plant adaptation) — now real and demoable
- Escalation path (telemetry dropout) — now real and demoable
- Logging/monitoring — JSONL audit log
- HITL — `interrupt()` graph pause, live
- Memory — `MemorySaver` checkpointer labelled as episodic memory

### Verified

Happy path, edge, escalation all passing offline (no key). `pytest` 14/14 green.

---

## Session 3 — June 13, 2026: 6-agent brain, all 5 challenges

**Commits:** `tools → agents → data → prompts → core → streamlit_app → tests`

### Why this happened

The 2-agent system only covered challenges 1 and 2. The assignment case study has 5 challenges. Expanding to cover all 5 was both a rubric requirement and a stronger demo narrative.

### What changed

| Component | Before (2 agents) | After (6 agents) |
|---|---|---|
| Architecture | Orchestrator + 2 specialists | Orchestrator + 5 ReAct specialists (1 per challenge) |
| Agents | maintenance, supply_chain | reliability, supply_chain, production, quality, compliance_safety |
| Tools | 8 tools | 18 tools (+9: robot_cell_status, job_reroute, shift_conflict_check, quality_history, telemetry_correlate, safety_gate, audit_assemble, tier2_supplier_risk, alert_triage) |
| Agent type | Deterministic nodes (tool call sequence fixed) | `create_react_agent` — each agent's LLM chooses its own tools |
| Routing | Fixed sequence | `_allowed_next()` policy — constrained model-driven routing |
| Data files | 4 | 10 (+robot_cells.json, shifts.json, quality_metrics.json, safety_rules.json, tier2_map.json, supplier_catalog_edge.json) |
| Prompts | 3 agent prompts | 6 agent prompts + supervisor prompt |
| Communication | Orchestrator translates findings | Shared `transcript` blackboard; agents read each other's reports; `FOLLOWUP:` protocol |
| Safety | Guardrails in prompts only | `safety_gate` can return `HALT` — overrides all agents, stops plan |

### New agent capabilities

- **Production & Human-Robot (challenge 3):** reroutes jobs, checks robot cell status, detects shift conflicts
- **Quality & Traceability (challenge 4):** quality history, telemetry↔defect correlation
- **Compliance & Safety (challenge 5):** classifies every action against OSHA rules, assembles audit log, can HALT the plan
- **Shared blackboard:** `ops_context` keeps latest report per agent; `transcript` accumulates all reports
- **`FOLLOWUP:` protocol:** agent can request another agent's input directly (supervisor honours, capped at `MAX_VISITS`)

### Resilience additions

- Per-agent `try/except` — a flaky Llama tool call generates `agent_error` trace event, run continues
- `SHARED_FOOTER` in every agent prompt — instructs passing numeric args as plain numbers (Llama otherwise emits `162000/24` which Groq rejects)

### Verified live on Groq

Happy path end-to-end: reliability (RISK:HIGH) → supply_chain → production (autonomously rerouted to CNC-08 to avoid op_Keller conflict) → quality (vibration↔defect correlation) → compliance (VERDICT: SIGN-OFF) → approval gate → complete.

`pytest` flow tests: happy ✅, edge ✅ live. Escalation test failed only due to Groq 100k/day quota exhausted — not a logic bug.

---

## Post-session 3 PRs (June 13–16, 2026)

### PR #4 — `fix/windows-encoding`

**Problem:** JSON data files failed to open on Windows (default encoding ≠ UTF-8).  
**Fix:** Added `encoding="utf-8"` to all `open()` calls in `tools/`.  
**Commit:** `fix: specify utf-8 encoding when reading JSON data files`

---

### PR #5 — `fix/escalation-output`

**Problem:** The escalation path (telemetry dropout) was handing off to a human but the output wasn't deterministic — the LLM was sometimes trying to synthesize a plan anyway.  
**Fix:** Escalation path now routes to a dedicated `escalation_node` that generates a deterministic human-handoff message without calling the LLM for the final plan.  
**Commit:** `fix: deterministic human-review handoff on the escalation path`  
**Tests added:** `tests/test_escalation.py` (4 tests)

---

### PR #6 — `perf/trim-transcript-tokens`

**Problem:** The shared `transcript` grows with each agent. On Groq free tier (100k/day), three full runs exhaust the daily quota. The transcript injection was the largest single token consumer.  
**Fix:** `clip(text, max_chars)` truncation applied per-message before injection into agent context. `MAX_TRANSCRIPT_CHARS` and `MAX_MESSAGE_CHARS` constants in `graph.py`.  
**Commit:** `perf: cap transcript size to fit the Groq free-tier token budget`  
**Tests added:** `tests/test_token_budget.py` (4 tests)

---

### PR #7 — `feat/gemini-support`

**Problem:** Groq free tier (100k tokens/day) is too tight for rehearsals. Three runs = quota gone.  
**Fix:** Added `langchain-google-genai` as a dependency. `.env.example` now defaults to `TOS_MODEL=google_genai:gemini-2.5-flash`. Gemini 2.5 Flash has a higher free quota and supports tool calling natively. Groq remains a one-line swap.  
**Also added:** Rate-limit resilience — exponential backoff on 429 responses.  
**Docs added:** `docs/SETUP_GEMINI.md` — team setup guide.  
**Commits:** `feat: Gemini as primary provider + free-tier rate-limit resilience`, `docs: team setup guide for running on Gemini`

---

## Current state (June 16, 2026)

| Component | Status |
|---|---|
| 6-agent architecture | Done |
| All 5 TMC challenges | Done |
| 18 tools + @tool wrappers | Done |
| 3 scenario data sets | Done |
| 6 agent prompts + supervisor + guardrails + self-eval | Done |
| Audit log + audit_assemble reconstruction | Done |
| Streamlit UI | Done |
| 25 tests (17 tools + 4 escalation + 4 token budget), all passing | Done |
| 3 flow tests (happy/edge/escalation) | Skip without GROQ/Gemini key — need live verify |
| Gemini primary + Groq alternative + Ollama offline | Done |
| `.env` file | **Missing** — must add API key before any live run |
| Live end-to-end rehearsal (all 3 scenarios) | **Pending** — needs `.env` |
| Slides | TODO |
| Pre-submission package to instructor | TODO |

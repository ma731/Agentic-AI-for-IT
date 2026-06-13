# CLAUDE.md — Titan Operations Sentinel

Project guidance for Claude Code sessions. Read this first. Details live in the code and prompts — this file is pointers and conventions.

---

## 1. What this is

**Titan Operations Sentinel (TOS)** — agentic AI system for a manufacturing course group project (IE University, Agentic AI for IT). Presentation: June 24, 2026.

Detects early failure signals in CNC machines, reasons across maintenance + supply chain data, and autonomously orchestrates the response.

**Demo scenario:** "The Friday Afternoon Cascade" — CNC-07-LEI spindle bearing failure predicted 52–76h out, parts shortage confirmed, agent calculates ROI and drafts action plan for plant manager approval.

---

## 2. Architecture

```
Alert → Orchestrator (claude-sonnet-4-6)
           │  tools: [maintenance_agent, supply_chain_agent]  ← specialists exposed AS tools
           ├── Maintenance Agent → [sensor_query, rul_predictor, asset_profile, maintenance_schedule]
           └── Supply Chain Agent → [parts_inventory, supplier_catalog, expedite_cost, work_order_draft, notify]
```

**Pattern:** Hierarchical orchestrator + specialist sub-agents, using the **agents-as-tools** pattern. The orchestrator is itself an LLM `tool_use` loop: the two specialists are tools it chooses to call, in the order its own reasoning dictates — routing is **not** hardcoded in Python. Its reasoning between delegations is the visible "agentic thinking" for the 25-point rubric dimension.

Direct Anthropic SDK `tool_use` — no LangChain, no LangGraph. Every reasoning step is explicit in `response.content`.

**Prompt wiring (load-bearing):** `guardrails.md` is composed onto every agent's system prompt at load time (`_compose_system_prompt`), and `self_eval.md` runs as a self-evaluation pass over the draft action plan before it is returned. All four prompt types (system, task, guardrail, self-eval) are live in the running system, not just files in `prompts/`.

**Why direct SDK:** The 25-point "Agentic Thinking" grading dimension requires showing perception → reasoning → action live. Direct SDK makes chain-of-thought renderable in Streamlit with zero abstraction.

**Model:** `claude-sonnet-4-6` for all agents.

---

## 3. Repo structure

```
agents/
  orchestrator.py          # main loop — routes to sub-agents, synthesizes final plan
  maintenance_agent.py     # sensor analysis, RUL, asset profile, schedule check
  supply_chain_agent.py    # parts, suppliers, ROI, draft WO, draft notification
tools/
  sensor_query.py          # reads data/sensors/<machine_id>_<window>.json
  rul_predictor.py         # heuristic RUL from sensor readings + historical match
  asset_profile.py         # reads data/assets/asset_profiles.json
  maintenance_schedule.py  # reads data/assets/maintenance_schedule.json
  parts_inventory.py       # reads data/inventory/parts_stock.json
  supplier_catalog.py      # reads data/suppliers/supplier_catalog.json
  expedite_cost.py         # pure calculation — no file I/O
  work_order_draft.py      # generates draft WO dict — not committed until approved
  notify.py                # generates draft notification dict — not sent until approved
data/
  sensors/CNC-07-LEI_72h.json      # Friday Cascade scenario — the anomaly
  sensors/CNC-03-LEI_hist.json     # historical bearing failure — RUL comparison
  assets/asset_profiles.json       # machine specs, BOM, failure modes
  assets/maintenance_schedule.json # scheduled windows per plant
  inventory/parts_stock.json       # on-site + warehouse stock
  suppliers/supplier_catalog.json  # lead times, expedite options, costs
prompts/
  orchestrator_system.md
  maintenance_agent_system.md
  supply_chain_agent_system.md
app.py                   # Streamlit demo UI
demo_scenario.py         # terminal runner — Friday Cascade end-to-end
tests/
  test_tools.py
  test_agent_flow.py
```

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

## 6. Tool ordering policy (enforced in system prompts)

```
Maintenance Agent:  sensor_query → rul_predictor → asset_profile → maintenance_schedule
Supply Chain Agent: parts_inventory → supplier_catalog → expedite_cost → work_order_draft → notify
```

Never call `rul_predictor` before `sensor_query`. Never call `expedite_cost` before knowing the parts gap. Never draft WO before parts plan is confirmed. Violations produce hallucinated plans.

---

## 7. stream_callback contract

All agent functions accept `stream_callback(event: dict)`. The Streamlit UI subscribes to this. Event types:

```python
{"type": "orchestrator_start",   "alert": dict, "message": str}
{"type": "tool_call",            "agent": str, "tool": str, "input": dict, "result": dict}
{"type": "agent_response",       "agent": str, "content": list}   # raw response.content blocks
{"type": "orchestrator_decision","message": str}
{"type": "orchestrator_synthesis","message": str}
{"type": "final_plan",           "plan": str}
```

---

## 8. Environment

```bash
pip install -r requirements.txt
cp .env.example .env         # add ANTHROPIC_API_KEY
python demo_scenario.py      # terminal run — Friday Cascade
streamlit run app.py         # demo UI
```

---

## 9. What to avoid

- Do not call tools out of order (see §6).
- Do not add new tools without updating TOOLS list in the relevant agent file AND this CLAUDE.md.
- Do not change autonomy tier definitions without updating §5 here and all 3 system prompts.
- Do not use `git add -A` or `git add .` — stage explicit paths to avoid committing `.env`.
- Do not hardcode machine IDs or part numbers in agent code — they come from alerts and tool outputs.

---

## 10. Build status

| Component | Status |
|-----------|--------|
| Directory structure | Done |
| Tool functions (8) | Done |
| Agents (3) | Done — orchestrator is agentic (agents-as-tools); guardrails + self-eval wired |
| Data files (JSON) | Done — Friday Cascade scenario present |
| System prompts (5) | Done — all four prompt types live in the runtime |
| Streamlit UI | TODO |
| Tests | Agent-flow tests passing (`tests/test_agent_flow.py`); tool unit tests TODO |
| Slides | TODO |

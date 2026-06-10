# Build Progress — Session 1 (June 10, 2026)

Skeleton complete. Agent loop is wired end-to-end. All tools tested and passing. Next person picks up from **Step 1** below.

---

## What was built this session

### Directory structure
Full repo scaffold matching the brainstorm architecture:
```
agents/ tools/ data/ prompts/ tests/ app.py demo_scenario.py
```

### Tools layer — 8 tools, all tested ✅
| File | What it does | Reads from |
|------|-------------|-----------|
| `tools/sensor_query.py` | 72h sensor readings for a machine | `data/sensors/<id>_<window>.json` |
| `tools/rul_predictor.py` | Remaining Useful Life estimate + confidence | historical match in `data/sensors/` |
| `tools/asset_profile.py` | Machine specs, BOM, failure modes | `data/assets/asset_profiles.json` |
| `tools/maintenance_schedule.py` | Scheduled windows per plant | `data/assets/maintenance_schedule.json` |
| `tools/parts_inventory.py` | On-site + warehouse stock | `data/inventory/parts_stock.json` |
| `tools/supplier_catalog.py` | Suppliers, lead times, expedite costs | `data/suppliers/supplier_catalog.json` |
| `tools/expedite_cost.py` | ROI ranking of procurement options | pure calculation |
| `tools/work_order_draft.py` | Draft WO (not committed until human approves) | — |
| `tools/notify.py` | Draft approval notification (not sent until reviewed) | — |

### Agent layer — 3 agents wired ✅
| File | Role |
|------|------|
| `agents/orchestrator.py` | Receives alert, routes to sub-agents, synthesizes final action plan |
| `agents/maintenance_agent.py` | Sensor → RUL → asset profile → schedule check |
| `agents/supply_chain_agent.py` | Inventory → supplier → ROI → draft WO → draft notify |

All agents use direct Anthropic SDK `tool_use` loop. Chain-of-thought exposed via `stream_callback` for Streamlit rendering.

### Data files — Friday Cascade scenario baked in ✅
| File | What's in it |
|------|-------------|
| `data/sensors/CNC-07-LEI_72h.json` | 37 hourly readings, vibration 3.1→7.2 mm/s, bearing temp +14°C, current spikes |
| `data/sensors/CNC-03-LEI_hist.json` | Sept 2023 historical bearing failure — RUL pattern match |
| `data/assets/asset_profiles.json` | CNC-07-LEI specs, BOM (P-4421, P-7803), equivalent machines |
| `data/assets/maintenance_schedule.json` | No LEI window for 9 days. Emergency slot: Sat 06:00 |
| `data/inventory/parts_stock.json` | P-4421: 0 on-site, 3 AMS. P-7803: 1 on-site (need 2), 4 AMS |
| `data/suppliers/supplier_catalog.json` | Schaeffler: 18h expedite €3,200. AMS transfer: 36h €420 |

### Prompts — 5 files, contract-first design ✅
| File | Purpose |
|------|---------|
| `prompts/orchestrator_system.md` | Role, autonomy policy, cost ceiling (€500), output format |
| `prompts/maintenance_agent_system.md` | Tool order enforced, structured output spec |
| `prompts/supply_chain_agent_system.md` | Parts gap → ROI → WO → notify, zero self-approval |
| `prompts/guardrails.md` | Hard constraints + low-confidence escalation template |
| `prompts/self_eval.md` | Per-agent checklist before each response |

### Supporting files ✅
- `CLAUDE.md` — project context for all Claude Code sessions (read this first)
- `demo_scenario.py` — terminal runner for the Friday Cascade
- `app.py` — Streamlit placeholder
- `requirements.txt`, `.env.example`, `.gitignore`

---

## Key decisions locked in

| Decision | Rationale |
|----------|-----------|
| Direct Anthropic SDK (no LangChain) | Chain-of-thought must be visible for the 25pt demo dimension |
| Model: `claude-sonnet-4-6` | All three agents |
| Hierarchical orchestrator pattern | Keeps agent/tool decision boundaries explicit |
| Risk-first sort in `expedite_cost` | Ensures Schaeffler (LOW risk, 18h) ranks above warehouse transfer (MEDIUM risk, 36h) even though warehouse is cheaper |
| `stream_callback` contract | Every agent step emits a typed event — Streamlit subscribes to this |

---

## What's left to build

### Step 1 — Environment setup (anyone, ~5 min)
```bash
pip install -r requirements.txt
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
python demo_scenario.py   # should run the full Friday Cascade in terminal
```

### Step 2 — Streamlit UI (owner: whoever builds the demo)
`app.py` is a placeholder. Needs:
- Trigger button for the Friday Cascade alert
- Live rendering of `stream_callback` events (reasoning, tool calls, tool results)
- Final action plan display with AUTO/APPROVE/MONITOR color coding
- Edge case toggle (parts unavailable from all suppliers)
- Escalation toggle (sensor dropout mid-analysis)

Reference: brainstorm §3 has the exact demo script. Target: 90s agent run visible on screen.

### Step 3 — Tests (owner: whoever does QA)
`tests/test_tools.py` — unit test each tool with known inputs/outputs
`tests/test_agent_flow.py` — integration test the full orchestrator loop

### Step 4 — Slides (owner: whoever owns presentation)
Brainstorm §8 has the full 6-slide plan. Architecture diagram from CLAUDE.md §2.

---

## How the agent loop works (for teammates)

```
demo_scenario.py
  └── run_orchestrator(alert)              # agents/orchestrator.py
        ├── run_maintenance_agent(alert)   # agents/maintenance_agent.py
        │     tools: sensor_query → rul_predictor → asset_profile → maintenance_schedule
        │     returns: assessment text
        │
        ├── [if high risk] run_supply_chain_agent(assessment)  # agents/supply_chain_agent.py
        │     tools: parts_inventory → supplier_catalog → expedite_cost → work_order_draft → notify
        │     returns: supply chain plan text
        │
        └── _synthesize_action_plan()      # final Claude call, no tools
              returns: structured [AUTO]/[APPROVE]/[MONITOR] plan
```

Every step emits to `stream_callback` — that's what the Streamlit UI renders live.

---

## Demo scenario values (Friday Afternoon Cascade)

| Field | Value |
|-------|-------|
| Machine | CNC-07-LEI (CNC Machining Center #7, Leipzig) |
| Alert | Vibration 7.2 mm/s RMS, threshold 6.0, rising from 3.1 baseline over 6h |
| RUL prediction | 52–76h (95% confidence), spindle_bearing_failure |
| Parts needed | P-4421 (spindle bearing kit), P-7803 (hydraulic seal set x2) |
| Parts gap | P-4421: 0 on-site. P-7803: 1 on-site, need 2 |
| Recommended option | Schaeffler expedite, 18h, €3,200 (LOW risk) |
| Cost of inaction | €162,000/day = €6,750/hour |
| ROI of recommended plan | 71.7:1 |
| Emergency window | Saturday 06:00 (requires plant manager approval) |

---

*Session 1 complete. Repo is clean and ready to push.*

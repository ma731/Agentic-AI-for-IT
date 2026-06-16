# Architectural Trade-offs — Titan Operations Sentinel

For Q&A appendix and 10pt Architecture rubric dimension. Covers every decision the professor is likely to probe.

---

## 1. Multi-agent orchestrator vs single agent

**Chosen:** Orchestrator + 5 autonomous ReAct specialists (one per TMC challenge).

**Why not a single agent with all tools?**
A single agent with 18 tools makes poor tool-selection decisions — this is empirically documented (and explicitly called out in the course slides). Each specialist is focused on its domain: the Reliability agent only sees 4 tools, the Supply Chain agent only sees 4. Focused agents use tools correctly and consistently. Combined, the agents reason *across* domains, which is what the problem requires.

**Why not peer-to-peer (no orchestrator)?**
Peer-to-peer is harder to debug, monitor, and explain. Accountability is unclear. The orchestrator gives us a single point of control and a readable chain of reasoning — important for the demo, important for production safety, and important for the 25pt Agentic Thinking dimension (the professor needs to *see* the reasoning).

**Cost of this choice:** More prompt surface area. Each agent needs its own system prompt and tool list. Supervisor routing logic must be maintained.

---

## 2. Deterministic vs model-driven routing

**Chosen:** Split — policy-constrained model-driven routing.

The `_allowed_next()` function in `graph.py` constrains which agent the LLM can route to next, based on risk level and run state:
- On HIGH risk: supply_chain, production, quality must all run (deterministic guarantee)
- `compliance_safety` always gates before FINISH (deterministic)
- When ≥2 agents are allowed, the LLM picks the order (model-driven)
- When only 1 agent is allowed, routing is deterministic

**Why not fully deterministic?**
A fixed sequence (reliability → supply_chain → production → quality → compliance) always runs all agents even when the situation doesn't need them. That wastes tokens and is less intelligent-looking.

**Why not fully model-driven?**
An unconstrained LLM might skip compliance, loop back to the same agent, or never finish. The policy guarantees coverage and termination. This is explicitly the "deterministic vs model-driven" split required by the rubric.

---

## 3. ReAct agent pattern vs Plan-Execute

**Chosen:** ReAct (Reason + Act in a loop) via LangGraph `create_react_agent`.

Each specialist's LLM decides which tool to call next based on what it just observed, loops until it has enough information, then reports. The agent is not handed a pre-written plan — it builds the plan by executing and observing.

**Why not Plan-Execute?**
Plan-Execute generates a full plan upfront, then executes each step. This fails when early tool outputs change what steps are needed (e.g. sensor dropout midway changes everything). ReAct adapts because each step re-evaluates.

**Cost:** ReAct uses more tokens (multiple LLM calls per agent). On free-tier Groq (100k/day), three full runs can exhaust the quota. Mitigated by Gemini 2.5 Flash (higher free quota) and transcript trimming.

---

## 4. LangGraph vs direct Anthropic SDK

**Chosen:** LangGraph `StateGraph`.

The original skeleton (Session 1) used the direct Anthropic SDK. Migrated to LangGraph in Session 2.

**Why LangGraph?**
- `interrupt()` gives us a clean human-in-the-loop pause with resume — impossible with a raw SDK loop without custom state management
- `MemorySaver` checkpointer = episodic memory out of the box; graph state persists across the approval pause
- `create_react_agent` gives each specialist a standardized ReAct loop without boilerplate
- State graph makes the architecture diagram directly correspond to the code

**What we lost:** The direct SDK approach made every LLM call explicit in the code. LangGraph abstracts some of that. Mitigated by the `trace` event list and `audit_log.py` which capture every tool call and agent report.

---

## 5. Groq/Llama vs Gemini vs OpenAI vs Anthropic

**Chosen:** Gemini 2.5 Flash (primary), Groq Llama-3.3-70B (fast alternative), Ollama (offline fallback).

**Why not Anthropic Claude?**
Assignment §14 forbids paid API keys. No Anthropic key available.

**Why Gemini over Groq as primary?**
Groq free tier is 100k tokens/day — three full 6-agent runs exhaust it. Gemini 2.5 Flash has a higher free quota and supports tool calling. Switched primary in the final PR.

**Why keep Groq?**
Groq is faster (Llama inference is extremely low-latency). Better for live demo timing if quota is available.

**Why Ollama fallback?**
Fully offline = no network dependency on demo day. `TOS_MODEL=ollama:llama3.1:8b` runs the full stack locally.

**Trade-off:** Llama-3.3-70B sometimes emits arithmetic expressions as tool arguments (`162000/24` instead of `6750`), which Groq rejects. Fixed via `SHARED_FOOTER` in every agent prompt instructing plain numeric args. Not needed for Gemini.

---

## 6. Simulated tools vs real integrations

**Chosen:** Simulated (pure Python functions reading JSON files).

**Why not real SCADA/SAP?**
Real SCADA requires OT network access, OPC-UA licenses, firewall rules, and months of data pipeline setup. SAP MM integration requires enterprise credentials and API configuration. Neither is feasible for an 8-week project.

**Why simulated is still valid:**
The JSON data structures match real SCADA historian and SAP MM schemas. The agent behavior is production-representative — the same tool interfaces would work with a real data layer behind them. The professor is evaluating the *agent design*, not the data layer.

**What to say in Q&A:**
"In production V2, `sensor_query` would call an OPC-UA historian API. The function signature and return schema are identical — only the data source changes. The agent code doesn't change."

---

## 7. Memory types used

| Memory type | How implemented | What it stores |
|---|---|---|
| In-context | `state["transcript"]` passed to each agent | All prior agent reports; current alert |
| External / RAG | JSON files in `data/` | Asset profiles, parts stock, supplier catalog, quality metrics, compliance rules |
| Episodic | `MemorySaver` checkpointer + audit log | Full run state (survives the `interrupt()` approval pause); past runs in `logs/tos_audit.jsonl` |
| Semantic | Agent system prompts | Domain knowledge: bearing failure thresholds, autonomy policy, OSHA rules |

**No vector database / embedding search.** MVP uses exact-match lookups in JSON. V2 would add a vector store for fuzzy part matching and historical failure retrieval.

---

## 8. Shared blackboard vs isolated agents

**Chosen:** Shared blackboard (`ops_context` + `transcript` in graph state).

Every agent appends its full report to `state["transcript"]`. Later agents read prior reports via `{transcript}` in their system prompt. An agent can end its report with `FOLLOWUP: <agent> — <question>` to trigger a targeted inter-agent question.

**Why not isolated (agents can't see each other)?**
The problem *requires* cross-domain reasoning. The Supply Chain agent needs the Reliability agent's failure timeline. The Production agent needs both. Isolated agents would require the orchestrator to manually translate findings — more tokens, more failure points.

**Risk:** Transcript grows with each agent, consuming tokens. Mitigated by `clip()` per-message truncation (tested in `test_token_budget.py`).

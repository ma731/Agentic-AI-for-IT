# Agentic AI Group Assignment — Project Planning Brief

> A planning brief for the group project: the full plan, architecture design, prompt pack, and slide outline.

---

## 1. What we are building

A group presentation and (optional) MVP for the **Agentic AI for IT** course at IE University. The audience is the professor, who will evaluate us as if he were an investor. Any group member can be questioned on any part.

**Presentation date options:** June 24 or July 1, 2026  
**Length:** 15 minutes max  
**Slides:** 8–10 max (instructor preference ~6)  
**Pre-submission required:** agent prompt(s) + tool description(s) sent to instructor before presentation

---

## 2. Grading rubric (100 points)

| Dimension | Points | What it means |
|---|---|---|
| Problem Framing, Agent Goals & Prompt | 15 | Real user/business/operational need; measurable value; prompt quality |
| Agentic System Architecture | 10 | Patterns chosen, alignment with problem, trade-offs explained |
| Tools, Actions & Feasibility | 15 | Tool justification; agent decides → tools act (this distinction must be explicit) |
| Agentic Thinking and Autonomy | 25 | Perception → reasoning → action shown via demo or equivalent flow |
| Risk Awareness and Mitigation | 15 | Risk management strategies, human-in-the-loop, security |
| Clarity, Presentation Quality & Creativity | 20 | Individual delivery; everyone must understand and be able to answer Q&A |

**Highest-weight dimension:** Agentic Thinking and Autonomy (25pts). The demo or demo flow is critical.

---

## 3. Mandatory deliverable structure

### Slides (8–10, ~6 preferred)
1. Problem statement
2. Proposed solution
3. Agentic AI architecture — agents, tools, model type (e.g. AWS Bedrock / Groq / Gemini free tier / LLaMA)
4. MVP demo or demo flow (user intent → LLM result → plan → tool calls → output)
5. Business benefits and desired outcomes
6. Next steps and improvements

### Appendix (not presented, but prepared for Q&A)
- Full prompt pack (system prompt, task prompts, guardrail prompts, self-evaluation prompt)
- Tool catalog (name, function, inputs, outputs, when to use, when NOT to use, fallback)
- Risk matrix
- Architectural trade-offs
- Sample conversation / agent trace
- Assumptions and limitations

---

## 4. Case study and industry selection

Three case studies are available (different industries). The group must:
- Pick **one industry**
- Address **at least one challenge** from that industry
- Optionally cover two challenges if the system naturally handles both

**TO BE FILLED IN BY THE GROUP:**
```
Selected industry: [e.g. Insurance / Retail / Manufacturing / Financial Services / IT Operations]
Selected challenge(s): [describe the challenge from the case study]
Target user/persona: [e.g. Claims Handler, IT Support Agent, SRE, Service Level Manager]
```

---

## 5. Problem framing template

Use this structure when defining the problem (15 pts dimension):

```
User: Who experiences the problem?
Context: In what workflow or process does this happen?
Pain: What is slow, manual, error-prone, inconsistent, or expensive?
Consequence: What happens if nothing changes?
Opportunity: Why can an agentic AI system improve this specifically?
Why not a chatbot/dashboard/automation: What makes it require genuine planning, tool use, and adaptation?
```

**Quality bar:** Be specific. Not "support is inefficient." Instead: "[Persona] spends X time doing Y manually, causing Z consequence, because [current system] cannot [specific gap]."

---

## 6. Architecture requirements

### Minimum components to include
- User / trigger
- Interface (chat, email, portal, API call)
- Orchestrator / main agent
- Sub-agents or modules (if applicable)
- LLM / model layer (be specific: GPT-4o via Azure, Claude 3.5 via Bedrock, Gemini via Vertex, LLaMA via Groq free tier, etc.)
- Tools (3–6, well-justified)
- Memory / context (in-context, external/RAG, episodic, semantic — label which types)
- Business rules / guardrails
- Human-in-the-loop checkpoints
- Data sources / APIs
- Logging / monitoring

### Key distinction the professor explicitly cares about
> The **agent** interprets goals, plans actions, and selects tools.  
> The **tools** fetch data, update systems, send outputs, or run checks.  
> State this clearly in the architecture explanation.

### Architecture pattern choices to justify
- Single-agent vs multi-agent (and why)
- Deterministic vs model-driven steps (label which is which)
- ReAct loop vs Plan-Execute vs other framework
- RAG vs fine-tuned model vs general LLM

---

## 7. Agent loop — show all 9 steps

The demo or demo flow must trace:

1. Input / trigger
2. Intent understanding
3. Context retrieval (tools / memory)
4. Plan generation
5. Tool selection
6. Action execution
7. Result evaluation
8. Fallback or escalation
9. Final output + memory/logging

### Show three paths
- **Happy path** — normal request, successful resolution
- **Edge case path** — ambiguous input, missing data, or policy conflict → agent asks or adapts
- **Risk/escalation path** — restricted action or low confidence → human-in-the-loop triggered

---

## 8. Tools specification template

For each tool, write a spec like this:

```
Tool name:
What it does:
Input(s):
Output(s):
When the agent should use it:
When the agent should NOT use it:
Risk if misused:
Fallback if tool fails:
Authentication / permission requirements:
```

Target 3–6 tools. Fewer well-justified tools > many vague ones.

---

## 9. Prompt pack — what to generate

The prompt pack must include all four prompt types:

### A. System prompt
- Role definition
- Scope and objectives
- Constraints and what the agent cannot do
- Tool-use policy (when to call which tool)
- Escalation rules
- Safety and guardrail rules
- Output format

### B. Task / workflow prompts
- Intake / initial request parsing
- Planning step
- Tool selection reasoning
- Output generation
- Validation step
- Escalation decision

### C. Guardrail / security prompts
- Do not act on missing critical data
- Do not fabricate unavailable information
- Do not execute restricted actions without approval
- Ask clarifying questions when confidence is below threshold
- Flag policy conflicts

### D. Self-evaluation prompt
- Did I solve the user's actual request?
- Did I use the correct tool for this context?
- Is this output safe and compliant?
- Should this be escalated to a human?

---

## 10. Risk matrix — minimum coverage

Include a table with at least these risks:

| Risk | Why it matters | Mitigation |
|---|---|---|
| Hallucinated recommendation | Wrong decisions made from bad output | Retrieval + confidence threshold + human review |
| Unauthorized action | Business or legal damage | Approval gates + role-based access |
| Sensitive data exposure | Compliance/privacy risk | Masking + permission checks + audit logs |
| Bad tool output | Cascading failure in the plan | Validation layer + fallback + retry logic |
| Overconfidence | User trust loss | Confidence messaging + escalation trigger |
| Prompt injection | Malicious takeover of agent behavior | Input sanitization + scope locks |
| Stale or incomplete data | Incorrect context used for decisions | Freshness checks + source citation |
| Over-automation | Removes human judgment where needed | Human-in-the-loop thresholds |

### Human-in-the-loop approval matrix
```
Low-risk actions    → fully autonomous
Medium-risk actions → confirm with user before executing
High-risk actions   → escalate to human approver
```
Label each tool action in the tool catalog with its risk tier.

---

## 11. Business benefits — structure

Quantify where possible. Cover all four value types:

- **Business value** (cost, throughput, turnaround time, SLA)
- **User value** (time saved, cognitive load, satisfaction)
- **Operational value** (consistency, error rate, scalability)
- **Strategic value** (competitive advantage, compliance posture, data quality)

Avoid generic claims. Use the format: "[Metric] reduced/improved by [estimate] because [agent capability]."

---

## 12. Evaluation metrics — three layers

Suggest metrics across:

**Product metrics:** task completion rate, time saved per interaction, user satisfaction, adoption rate  
**Agent performance:** tool selection accuracy, plan success rate, escalation rate, hallucination/error rate  
**Business metrics:** cost reduction, SLA improvement, compliance improvement, throughput increase

---

## 13. Slide outline to generate

Produce a slide-by-slide content plan:

```
Slide 1: Title + one-line pitch (what problem + for whom + using what)
Slide 2: Problem — user, pain, consequence, why current solutions fail
Slide 3: Solution overview — what the agent does at a high level
Slide 4: Architecture — diagram + component explanation + agent/tool distinction
Slide 5: Agent flow — demo or demo flow (happy path + edge case)
Slide 6: Tools + prompts summary — what tools exist, what guardrails
Slide 7: Risks + mitigations — top 4–5 risks with mitigations
Slide 8: Benefits + KPIs — quantified business value
Slide 9: Next steps / roadmap — MVP vs V2 vs V3
[Slide 10 if needed: Appendix intro for Q&A]
```

**Slide design rules:**
- One idea per slide
- Strong heading = conclusion, not label (e.g. "Our agent separates reasoning from execution to prevent unsafe actions" not just "Architecture")
- Diagrams over paragraphs
- Minimal text, strong visual flow

---

## 14. Technical constraints

- Use **free-tier LLMs** for any MVP: Groq (LLaMA), Gemini free tier, or equivalent
- No paid API keys in the demo
- MVP is optional but recommended — even a simulated flow in a free-tier LLM (Gemini or Groq) with screenshots counts
- The professor said to use AI intentionally, not just decoratively

---

## 15. Q&A preparation

Every team member must be able to answer:

- Why does this need an agent instead of a rule-based automation or a dashboard?
- Why did you choose this model and architecture?
- What happens when the tool returns wrong or incomplete data?
- Where exactly is the human in the loop?
- What are your top three risks and mitigations?
- How would you measure success in production?
- What would version 2 look like?
- Why is this feasible with current technology?

---

## 16. What "above and beyond" looks like

### Must-have (baseline pass)
- Clear problem framing with specific persona and pain
- Realistic architecture with agent/tool separation explicit
- Prompt pack (all four types)
- Risk matrix with mitigations
- Demo or demo flow covering 3 paths
- Quantified benefits
- Roadmap

### Standout (high score)
- Edge-case and escalation handling shown explicitly
- Human approval tier matrix
- Evaluation metrics defined
- Trade-off analysis for architectural choices
- Fallback logic per tool
- Trust and safety design section

### Elite (maximum differentiation)
- Sequence diagram or agent trace
- Confidence threshold policy
- Failure mode table
- Sample audit log or logging schema
- Comparison against non-agentic alternative (why automation/chatbot falls short)
- Lightweight wireframe of user interface

---

## 17. Group fill-in section

```
Group members:
1. [Name] — owns: Problem + Business Case
2. [Name] — owns: Architecture + Model Choices
3. [Name] — owns: Tools + Prompts + Workflow
4. [Name] — owns: Demo + Risk Mitigation
5. [Name] — owns: Benefits + KPIs + Q&A coordination

Selected industry: [TBD]
Selected challenge(s): [TBD]
Target persona: [TBD]
Presentation slot preference: [June 24 / July 1]
MVP status: [building / simulated flow / none]
LLM platform for MVP: [Groq / Gemini free tier / other]
```

---

*Planning brief for IE Agentic AI for IT, Session 11 group assignment.*

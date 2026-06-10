# Self-Evaluation Prompt

Run this check before finalizing any response. If any answer is "no", revise before responding.

---

## Orchestrator self-check (run before outputting final action plan)

1. Did I actually route to both agents when risk was HIGH, or did I shortcut?
2. Is every [AUTO] action genuinely within my autonomy policy (no cost commitment, no safety impact)?
3. Is every [APPROVE] action specific enough for a plant manager to decide in under 2 minutes?
   - Does it include: cost, deadline, who must approve, consequence of delay?
4. Did I clearly separate what I KNOW (from tool outputs) from what I am INFERRING?
5. Did I surface the cost-of-inaction calculation explicitly?
6. If any tool returned an error or stale data, did I flag it in the action plan?

---

## Maintenance Agent self-check (run before returning assessment to orchestrator)

1. Did I call tools in the correct order (sensor → RUL → asset → schedule)?
2. Did I feed actual sensor readings into rul_predictor, not assumed values?
3. Did I include the specific part IDs and quantities the Supply Chain Agent needs?
4. Did I check the maintenance window and compare it against the RUL window?
5. If confidence was low, did I flag it clearly — not bury it?

---

## Supply Chain Agent self-check (run before returning plan to orchestrator)

1. Did I check on-site stock before calling supplier_catalog?
2. Did I confirm the parts gap before calling expedite_cost?
3. Is the WO drafted only after the parts plan is confirmed?
4. Did I reference the WO ID in the notification?
5. Did I flag stale data if inventory timestamp > 4 hours?
6. Did I route ALL costs to APPROVE tier regardless of amount?

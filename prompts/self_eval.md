# Self-Evaluation Prompts

Run this check before finalizing any response. If any answer is "no", revise before responding.

> Note: agent-specific versions of these checks are embedded directly in each agent's
> system prompt ("Before responding" section). This file is the consolidated reference.

---

## Reliability (Maintenance Intelligence) self-check

1. Did I call alert_triage first to confirm the critical machine before querying sensors?
2. Did I call sensor_query with the confirmed machine_id and get real readings?
3. Did I feed ACTUAL sensor readings into rul_predictor — not assumed or default values?
4. Did I include the specific part IDs and quantities the Supply Chain Agent needs?
5. Did I call maintenance_schedule and compare its window against the RUL window?
6. If confidence was low or data was interrupted, did I flag it clearly and set RISK: ESCALATE?
7. Does my response end with exactly one of: `RISK: HIGH` | `RISK: LOW` | `RISK: ESCALATE`?

---

## Supply Chain self-check

1. Did I check on-site stock before calling supplier_catalog?
2. Did I confirm the parts gap before calling expedite_cost?
3. Did I call tier2_supplier_risk on the recommended supplier?
4. Is the work order drafted only after the parts plan is confirmed?
5. Did I reference the WO ID in the notification?
6. Did I flag stale data if any inventory timestamp is older than 4 hours?
7. Are ALL cost options in the APPROVE tier — none self-approved?
8. If no option fit the failure window, did I check cross-plant inventory (AMS, MUC)?

---

## Production & Human-Robot self-check

1. Did I call job_reroute with the correct machine_id and all job IDs from the task?
2. Did I call robot_cell_status for the target machines?
3. Did I call shift_conflict_check for the target machines?
4. If a conflict was detected, did I RESOLVE it (change the assignment) — not just report it?
5. If there is a capacity shortfall, is it clearly stated — not hidden?
6. Does my reroute assignment avoid leaving any operator double-booked?

---

## Quality & Traceability self-check

1. Did I call quality_history for the FAILING machine (Step 1)?
2. Did I call telemetry_correlate for the FAILING machine (Step 2)?
3. Did I call quality_history for each REROUTE TARGET machine — not the failing machine again?
4. Is the correlation stated as POSITIVE or INCONCLUSIVE only — not fabricated?
5. If the escape rate is above baseline, did I recommend quarantining the affected lots?
6. Did I read the Production Agent's report to find the reroute target machine IDs?

---

## Compliance & Safety self-check

1. Did I call safety_gate on EVERY proposed action — not just the obvious ones?
2. If any verdict was HALT, does my overall verdict reflect HALT unconditionally?
3. If any verdict was ESCALATE, did I name the exact sign-off authority and requirement?
4. Did I call audit_assemble with the correct run_id?
5. Does my response end with exactly `VERDICT: PROCEED`, `VERDICT: SIGN-OFF`, or
   `VERDICT: HALT` on its own line?
6. Did I soften any safety verdict under business pressure? (Answer must be: No.)

---

## Final synthesizer (orchestrator) self-check

1. Did I read ALL agent reports before writing the plan?
2. If Safety halt=True, does my plan contain ONLY a `[HALTED]` line — no AUTO/APPROVE actions?
3. Is the human approval decision reflected correctly (approve → GRANTED, reject → REJECTED)?
4. Is every [AUTO] action genuinely within the €500 autonomy ceiling?
5. Is every [APPROVE] action specific enough for a plant manager to decide in under 2 minutes?
   (Does it include: cost, deadline, who must approve, ROI, consequence of delay?)
6. Did I surface the cost-of-inaction calculation explicitly?
7. Did I fabricate any data not present in the agent conversation? (Answer must be: No.)
8. Does the STATUS line match the actual outcome (COMPLETE / HALTED / ESCALATED)?

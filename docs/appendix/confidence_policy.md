# Confidence-Threshold & Autonomy Policy

Appendix artifact (brief §16 "Elite": *confidence threshold policy*). When does the system act on
its own, when does it ask a human, and when does it refuse? This is the explicit policy behind the
three demo paths.

## 1. Two independent axes

The system never decides on one number. It separates **confidence in the assessment** (can I trust
what I know?) from **authority over the action** (am I allowed to do this?).

```
                    AUTHORITY (cost / safety tier)
                    AUTO (<€500)      APPROVE (>€500)     ESCALATE (safety)
CONFIDENCE  high    act autonomously  human approves $    safety officer
            low     →→→→→→→→→  ESCALATE: insufficient data, human review  →→→→→→→
```

## 2. Confidence gate (the abstention rule)

Reliability assigns a confidence to its assessment from the telemetry it can actually read:

| Signal | Confidence | Action |
|---|---|---|
| Clean 72h window, matched failure pattern | **HIGH** | proceed — full plan |
| Interrupted / dropout / `low_confidence_flag` | **LOW** | **abstain** → `escalate=True` |
| No critical pattern found | LOW-risk | monitor, no action |

On LOW confidence the orchestrator routes straight to `FINISH` and `synthesize()` returns a
deterministic *"INSUFFICIENT DATA — HUMAN REVIEW"* handoff. **It does not fabricate a plan from data
it has flagged as untrustworthy.** (This is the Escalation demo path.)

## 3. Authority gate (the autonomy tiers)

Even at high confidence, the action's tier decides who signs off:

| Tier | Examples | Decided by | Mechanism |
|---|---|---|---|
| **AUTO** | throttle within OEM limits, reroute jobs, draft WO | agent | direct tool call |
| **APPROVE** | any purchase, production-affecting window, **spend > €500** | plant manager | `interrupt()` gate |
| **ESCALATE** | anything touching safety systems; low confidence | safety officer | escalation / Compliance HALT |

## 4. How the three paths exercise the policy

- **Cascade:** HIGH confidence + €3,200 spend → AUTO actions execute, the purchase hits the **APPROVE** gate.
- **Edge:** HIGH confidence + €420 cross-plant transfer (**< €500**) → fully **AUTO**, no human needed.
- **Escalation:** **LOW** confidence (telemetry dropout) → abstain → human review, no plan.

That contrast *is* the safety story: the system is autonomous where it's confident and authorised,
and it stops itself everywhere else.

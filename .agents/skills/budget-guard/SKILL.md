---
name: budget-guard
description: Use when a demo-delivery task is approaching configured role-turn or revision limits and continuation must not weaken required tests, evidence, or approvals.
---

# Delivery Budget Guard

## Core Rule

Control cost by removing optional work or pausing. Never save budget by skipping mandatory authority, tests, payment evidence, independent reviews, or user gates.

## Inputs

Require configured limits, used turns, round counters, active state, remaining required roles, optional work, unresolved findings, and required review/evidence gates. Use `missing` rather than estimating unavailable counters.

## Decision

1. Calculate remaining turns and the minimum required path to the next user gate.
2. Include every required planner, critic, executor, and independent reviewer turn. Do not assume a role will pass.
3. If used capacity reaches the soft limit, return `restricted`: remove optional exploration, reuse still-valid approved evidence, and allow only the minimum required path.
4. If the minimum required path would exceed the hard cap, return `budget_paused` before dispatching another role.
5. If used capacity reaches the hard cap, return `budget_paused`.
6. If the minimum path fits, return `continue` with the allowed next role only.

Round limits are separate hard boundaries. When a plan or implementation revision limit is reached, pause even if role turns remain.

## Output Contract

```yaml
decision: continue | restricted | budget_paused
used_turns: <number|missing>
hard_limit: <number|missing>
remaining_turns: <number|missing>
minimum_required_turns: <number|missing>
allowed_next_role: <role|none>
removed_optional_work: []
reason: <calculation and binding gate>
recommendation: <one next decision>
```

Recommend one of: split the task, increase the explicit cap to cover the calculated required path, use a stronger role where permitted, clarify authority, or stop. Acceptance of residual risk may dispose of optional or Minor work only; it cannot waive a mandatory review, test, evidence obligation, or unresolved Critical/Important finding.

Return the decision to the orchestrator. Do not write budget/state files, change limits, approve work, or dispatch agents.

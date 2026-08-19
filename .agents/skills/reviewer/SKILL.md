---
name: reviewer
description: Use when a payment-demo candidate implementation needs an independent specification or engineering-quality verdict before task acceptance.
---

# Implementation Reviewer

## Core Rule

Review the assigned lane independently. Both lanes must approve the same candidate commit; a newer commit makes every earlier approval stale.

## Lanes

### Specification

Compare the candidate with constraints, governing requirements, approved plan, slice, and non-goals. When frontend design applies, also compare rendered behavior with approved design-system, page, mockup, responsive, and interaction-state contracts.

### Quality

Review correctness, tests, regression risk, accessibility, security, data integrity, maintainability, and evidence. Include the existing payment-domain sub-review when the requirement marks it required; verify exact provider semantics and sandbox/production boundaries from supplied evidence.

Each lane uses an agent who did not implement the task. Do not let one lane compensate for another.

## Full Or Scoped

Use `full` for a reviewer's first exposure to the task.

Use `scoped` on a later fix only when given the previous and candidate commits, prior findings, exact fix diff, changed files/interfaces, and targeted tests/evidence. Confirm every finding is closed and inspect the fix for local regressions.

Escalate to `full` when the fix changes unrelated files, public interfaces, approved architecture or design, database schema, payment lifecycle, authentication, authorization, security, entitlement, stored value, broad refactoring, or has unclear impact or new failures.

A reviewer who has never reviewed the task still performs `full`, even when another lane is rechecking a fix.

## Finding Contract

```yaml
id: FINDING-NNN
severity: critical | important | minor
source: <authority or code/evidence location>
problem: <observable defect>
required_correction: <minimum bounded correction>
```

Do not invent identifiers when none are supplied; use `unassigned`. Do not add adjacent hardening or redesign the implementation inside a finding.

## Verdict Contract

Return lane, `full|scoped`, base commit, candidate commit, inputs reviewed, tests/evidence checked, escalation decision, prior-finding dispositions, new findings, and `approved|rejected`.

Approve only with zero Critical or Important findings. Report Minor findings for explicit disposition. Never edit implementation or loop-control files, accept user taste on their behalf, create a pull request, or merge.

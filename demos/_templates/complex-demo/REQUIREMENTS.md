# {{DEMO_NAME}} Requirements

This file is the only product-requirement authority for this demo. Scenario, design, architecture, task, plan, and tracking files are derived views.

## Identifier Rules

- Requirement IDs use `REQ-0001` through `REQ-9999`.
- IDs are demo-local, unique, permanent, never renumbered, and never reused.
- Removed requirements remain as tombstones with their original ID and approval reference.
- User decisions use `user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>`.
- Repository, wiki, and official-document sources use a stable file/heading, raw-source identifier, or URL plus retrieval date.

Related identifiers:

- `DESIGN-0001` through `DESIGN-9999`
- `SLICE-001` through `SLICE-999`
- `TASK-0001` through `TASK-9999`
- `TC-0001` through `TC-9999`
- `EVID-0001` through `EVID-9999`

## Requirement Schema

`lifecycle_status` is one of:

- `draft`
- `approved`
- `in_progress`
- `implemented`
- `verified`
- `removed`

`planning_disposition` is one of:

- `unassigned`
- `active_slice`
- `future_slice`
- `blocked`
- `deferral_proposed`
- `deferred`
- `complete`
- `removed`

Every requirement record contains these fields:

- `id`
- `title`
- `audience`
- `source`
- `lifecycle_status`
- `planning_disposition`
- `target_slice`
- `blocker`
- `deferral_reason`
- `removal_reason`
- `next_trigger`
- `approval_reference`
- `acceptance`
- `negative_cases`
- `dependencies`
- `design_links`
- `task_links`
- `test_links`
- `evidence_links`

Use `none` when an optional field is not applicable. Do not leave fields absent.

Allowed lifecycle/disposition combinations:

| Lifecycle status | Allowed planning dispositions                                                            |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `draft`          | `unassigned`                                                                             |
| `approved`       | `unassigned`, `active_slice`, `future_slice`, `blocked`, `deferral_proposed`, `deferred` |
| `in_progress`    | `active_slice`                                                                           |
| `implemented`    | `active_slice`                                                                           |
| `verified`       | `complete`                                                                               |
| `removed`        | `removed`                                                                                |

Any other combination is invalid. Lifecycle describes promise verification; disposition describes planning treatment. Neither field changes implicitly when the other changes.

## Transition Rules

- `in_progress` or `implemented` requires `active_slice` and an approved target slice.
- `verified` requires `complete` and passing required evidence.
- `future_slice` requires a named slice but no speculative task, test, or evidence links before that slice is approved.
- `blocked` requires a blocker and reevaluation trigger.
- `deferral_proposed` requires a reason, next trigger, and pending user approval.
- `deferred` requires lifecycle `approved`, a reason, next trigger, and user approval reference.
- `removed` requires lifecycle and disposition `removed`, a non-empty `removal_reason`, and user approval reference.

## Requirement Register

| ID  | Title | Lifecycle | Disposition | Target slice | Source |
| --- | ----- | --------- | ----------- | ------------ | ------ |

## Requirement Record Template

```markdown
### REQ-0001 — Concise promise

- Audience: buyer | operator | developer | mixed
- Source: user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>
- Lifecycle status: draft
- Planning disposition: unassigned
- Target slice: none
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: none
- Approval reference: none
- Acceptance:
  - Observable outcome
- Negative cases:
  - Failure or exclusion that must remain true
- Dependencies: none
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none
```

## Tombstones

Removed requirements remain here with their original IDs, removal reasons, and user approval references.

```markdown
### REQ-0001 — Removed promise

- Lifecycle status: removed
- Planning disposition: removed
- Removal reason: exact reason
- Approval reference: user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>
```

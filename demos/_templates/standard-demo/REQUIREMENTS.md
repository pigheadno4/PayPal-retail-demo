# {{DEMO_NAME}} Requirements

This file is the only product-requirement authority for this demo. Scenario, design, architecture, task, plan, and tracking files are derived views.

## Identifier Rules

- Requirement IDs use `REQ-0001` through `REQ-9999`.
- IDs are demo-local, unique, permanent, never renumbered, and never reused.
- Removed requirements remain as tombstones with their original ID and approval reference.
- User decisions use `user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>`.
- Other durable sources use `repo:<path>#<heading>@<YYYY-MM-DD>`, `wiki:<path-or-raw-id>#<heading>@<YYYY-MM-DD>`, or `official:<https-url>@<YYYY-MM-DD>`.

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

- `approved`, `in_progress`, `implemented`, and `verified` records require a durable user approval reference and concrete acceptance, negative cases, affected surfaces, required test types, required evidence types, and exclusions; placeholders are invalid.
- `in_progress` or `implemented` requires `active_slice` and an approved target slice.
- `verified` requires `complete` and passing required evidence.
- `future_slice` requires a named slice but no speculative task, test, or evidence links before that slice is approved.
- Required test and evidence types must be present in linked test `Layer` and evidence `Type` values before execution or verification.
- `blocked` requires a blocker and reevaluation trigger.
- `deferral_proposed` requires a reason, next trigger, and pending user approval.
- `deferred` requires lifecycle `approved`, a reason, next trigger, and user approval reference.
- `removed` requires lifecycle and disposition `removed`, a non-empty `removal_reason`, and user approval reference.

## Requirement Register

| ID  | Title | Lifecycle | Disposition | Target slice | Source |
| --- | ----- | --------- | ----------- | ------------ | ------ |

`ID` is the only register key. Use one exact `REQ-NNNN` per non-empty row; identifiers in other columns do not create records, duplicate keys are invalid, and every declared summary column mirrors the full record. The same rule applies to the Tombstone Register.

## Active Requirement Records

Add every non-removed `REQ-*` record here using the full schema below.

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
- Affected surfaces: platforms, pages, APIs, data, and PSP surfaces
- Required test types: unit | integration | interaction | hosted | other concrete types
- Required evidence types: static | interaction | backend | failure | responsive | accessibility | typography | provider | hosted
- Exclusions: explicit behavior this promise does not include
- Payment-domain review required: yes | no
- Payment-domain review reason: concrete PSP scope or concrete non-applicability reason
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none
```

## Tombstone Register

| ID  | Title | Removal reason | Approval reference |
| --- | ----- | -------------- | ------------------ |

## Tombstones

Removed requirements remain here as full records with their original IDs, prior context, removal reasons, and user approval references. Do not use a shortened schema.

```markdown
### REQ-0001 — Removed promise

- Audience: buyer | operator | developer | mixed
- Source: user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>
- Lifecycle status: removed
- Planning disposition: removed
- Target slice: none
- Blocker: none
- Deferral reason: none
- Removal reason: exact reason
- Next trigger: none
- Approval reference: user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>
- Acceptance:
  - Historical observable outcome retained for audit
- Negative cases:
  - Historical exclusion retained for audit
- Dependencies: none
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none
```

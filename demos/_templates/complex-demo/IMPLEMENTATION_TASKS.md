# {{DEMO_NAME}} Implementation Tasks

This is a derived execution view. It cannot create, narrow, defer, remove, or verify a requirement.

Task IDs use `TASK-0001` through `TASK-9999`, are permanent, and are never reused.

## Active Slice

- Slice: none
- Charter: none

## Task Register

| Task | Slice | Requirements | Design decisions | Tests | Evidence | Status |
| ---- | ----- | ------------ | ---------------- | ----- | -------- | ------ |

`Task` is the only register key. Keep every declared register column. Each non-retired task record links at least one governing requirement and uses one exact task ID and one exact `SLICE-NNN` owner compatible with that requirement's disposition and slice state; deferred or removed scope cannot retain executable work. Prose, multiple owners, duplicate keys, and summary values that disagree with the full record are invalid. It also names concrete files, interfaces, at least one test case, at least one evidence record, and model/effort routing. Verification requires linked tasks to be `implemented` or `reviewed`.

Statuses: `planned`, `in_progress`, `implemented`, `reviewed`, `blocked`, `retired`.

## Task Template

```markdown
### TASK-0001 — Independently reviewable result

- Slice: SLICE-001
- Requirements: REQ-0001
- Design decisions: none
- Files: exact paths
- Interfaces: consumed and produced contracts
- Test cases: TC-0001
- Evidence: EVID-0001
- Non-goals: exact exclusions
- Model/effort: assigned in slice charter
- Status: planned
```

# Test Cases

Test IDs use `TC-0001` through `TC-9999`, are permanent, and are never reused.

## Test Case Register

| Test ID | Requirements | Slice | Evidence | Status |
| ------- | ------------ | ----- | -------- | ------ |

`Test ID` is the only register key. Keep every declared register column. Each non-retired test record links at least one governing requirement and uses one exact test ID and one exact `SLICE-NNN` owner; prose, multiple owners, duplicate keys, and summary values that disagree with the full record are invalid. A `passing` test has concrete non-placeholder preconditions, action, expected result, and negative case.

Statuses: `planned`, `failing`, `passing`, `blocked`, `retired`.

## Test Case Template

```markdown
### TC-0001 — Observable behavior

- Requirements: REQ-0001
- Slice: SLICE-001
- Evidence: EVID-0001
- Layer: unit | integration | interaction | browser | hosted | sandbox | manual
- Preconditions: describe exact state
- Action: describe exact action
- Expected: describe observable result
- Negative case: describe failure or exclusion
- Status: planned
```

## Milestone Close Gate

- Every active-slice requirement has concrete test and evidence links.
- Future-slice requirements have a valid disposition without speculative coverage.
- Shell-only work remains open until interaction and required state evidence pass.
- PSP or wallet UI proves the official hydrated provider surface in every promised placement.
- API-backed UI covers loading, success, failure, retry, and recovery against the backend contract.

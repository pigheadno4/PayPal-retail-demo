# Evidence Register

Evidence IDs use `EVID-0001` through `EVID-9999`, are permanent, and are never reused.

## Evidence Index

| Evidence | Requirements | Slice | Type | Status | Artifact |
| -------- | ------------ | ----- | ---- | ------ | -------- |

`Evidence` is the only index key. Keep every declared index column. Each non-retired evidence record links at least one governing requirement and uses one exact evidence ID and one exact compatible `SLICE-NNN` owner; prose, multiple owners, duplicate keys, and summary values that disagree with the full record are invalid. `passing` evidence has concrete artifact and verifier fields, a real calendar-valid ISO timestamp, and a result beginning with `passed`, `success`, `successful`, `completed`, or `ok`. A local artifact path resolves inside the demo; external proof uses HTTPS.

## Evidence Record Template

```markdown
### EVID-0001 — Observable proof

- Requirements: REQ-0001
- Slice: SLICE-001
- Type: static | interaction | backend | failure | responsive | accessibility | typography | provider | hosted
- Status: planned
- Artifact: pending
- Captured at: pending
- Verified by: pending
- Result: pending
```

Statuses: `planned`, `captured`, `passing`, `failed`, `blocked`, `retired`.

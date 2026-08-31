# TASK-0004 Execution — Atomic Allowance And Generate Answer

- status: needs_review
- implementation_round: 3 of 3
- task: TASK-0004
- slice: SLICE-001
- accepted_base: `846f7c0d67233483b149226d3600e3ea45aff6a8`
- candidate_parent: `c1a917875765f6aa1e9c6109fbe6f29c7f0c4145`
- candidate_commit: recorded in the executor handoff because a commit cannot contain its own final hash
- approved_plan_sha256: `487ebe3235ceb01485383720dd3f3949d1db2157a79b0a6428944f135fec4920`
- approved_plan_review_sha256: `ded82df64a5f2110154bebdbe6d3eee199d9627b4d36ea5d7e2d4e5343125b43`
- rejected_quality_report_historical_sha256: `cef3a8b5cd216f5ea6020347157b165ddbcf838e584bfee243812329977d598f`
- user_approval: `user:TASK-0004:2026-08-31:plan-487ebe-approved`
- evidence_label: `TASK-0004 local E2E from accepted handoff`
- final_report_sha256: recorded in the executor handoff because embedding it would change this file's hash
- final_evidence_sha256: recorded in the executor handoff because embedding it would change the evidence file's hash

## Round 3 Finding Closure

| Finding | Disposition | Smallest correction |
| --- | --- | --- |
| Quality FINDING-001 | Corrected; ready for independent review | `readSummary` now executes its existing allowance and operation projections inside one short `REPEATABLE READ READ ONLY` transaction. Both statements therefore use one database snapshot. No row lock, write, schema change, queue, polling system, delay, or public API change was added. |

The configured-Postgres regression synchronizes a real reserve between the allowance and history reads, then a real commit between the same reads. It asserts that every returned summary is one of the internally coherent before/after states. Synchronization is query-boundary based through a test-only database-client proxy; it uses no sleep or timing assumption.

## Test-First Record

### RED

Command:

```text
node --env-file=.env.local node_modules/vitest/vitest.mjs run server/src/domain/usage/repository.integration.test.ts
```

Against parent `c1a917875765f6aa1e9c6109fbe6f29c7f0c4145`, the new deterministic test failed because the summary contained a 10-unit reserved operation while allowance counters still reported reserved 0. That is the reviewed torn snapshot. The same run also encountered the existing release-versus-late-commit race selecting the other legal terminal winner; it was unrelated to the new test and did not change the correction boundary.

The first sandboxed attempt could not resolve the remote Supabase host. It was rerun with approved network access; the behavioral RED above came from the configured database rather than the sandbox failure.

### GREEN

The final configured-Postgres file passed 4/4 in 139.15 seconds after the minimal repository change. The deterministic regression observed coherent summaries across both reserve and commit transitions, and the existing activation, provenance, terminal-state, idempotency, and cleanup proofs remained green.

## Fresh Verification

| Proof | Result |
| --- | --- |
| Focused TASK-0004 command | PASS — 5 files / 17 tests. The initial sandbox invocation failed only because Supertest could not bind a local socket; the approved rerun passed. |
| Configured Supabase Postgres command | PASS — 1 file / 4 tests in 139.15s. |
| Previously failing exact-390 TC-0009 path | PASS — 1/1 in 37.9s. |
| Full TASK-0004 browser matrix | PASS — 4/4 in 2.4m. |
| Full `npm test` | PASS — 33 files passed, 3 skipped; 213 tests passed, 8 skipped. The initial sandbox invocation failed only on local socket permissions; the approved rerun passed. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS — Express TypeScript and Vite production output. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities after the sandbox DNS-only failure was rerun with approved network access. |
| `git diff --check` | PASS. |
| Schema/provider protected-path audit | PASS — no diff under `supabase/**` or protected PayPal paths. |
| Delivery-loop, demo-workflow, and agent-system validators | PASS. |

## Round 3 Changed Files

- `server/src/domain/usage/repository.ts` — one short consistent read-only snapshot around the existing two projections.
- `server/src/domain/usage/repository.integration.test.ts` — deterministic configured-Postgres reserve/commit snapshot regression.
- `tracking/tasks/TASK-0004/execution.md` — this corrected round-3 execution record.
- `tracking/evidence/EVID-0004.md` — corrected fresh local evidence record.

No screenshot is part of the round-3 diff because the UI did not change. The full browser matrix was rerun, while the already-sanitized visual artifacts and hashes remained the evidence manifest.

## Evidence Boundary

EVID-0004 proves only local application behavior after an accepted authenticated, verified-funded handoff. It does not prove hosted OTP delivery, browser-session OTP isolation, real PayPal sandbox approval/capture, webhook delivery, reusable credential creation, a renewal charge, deployment, production readiness, or complete customer E2E behavior.

## Out-Of-Scope Observations

- The existing terminal-race integration test permits either transition to win at the repository level but asserts that the release wins by using a 250ms delay. One RED run selected commit first. No timing change was made because the round-3 correction is limited to read consistency and the final configured-Postgres run passed the existing assertion.
- Extensive unrelated tracked and untracked work remains in the shared worktree. None is included in this candidate.

## Rollback

Revert only the round-3 candidate commit. It removes the test-only concurrency regression and returns `readSummary` to its prior two-statement read behavior. No remote data, schema, provider state, identity, or payment rollback is involved.

# TASK-0004 Execution — Atomic Allowance And Generate Answer

- status: needs_review
- implementation_round: 2 of 3
- task: TASK-0004
- slice: SLICE-001
- accepted_base: `846f7c0d67233483b149226d3600e3ea45aff6a8`
- approved_plan_sha256: `487ebe3235ceb01485383720dd3f3949d1db2157a79b0a6428944f135fec4920`
- approved_plan_review_sha256: `ded82df64a5f2110154bebdbe6d3eee199d9627b4d36ea5d7e2d4e5343125b43`
- rejected_candidate: `1e672f9196118be860e8d82b0c194781ff89eb67`
- correction_review_sha256: `c71e8d99667a1375ab73948c9d966dbd42db4e6b762fb475995955bd22db7e40`
- user_approval: `user:TASK-0004:2026-08-31:plan-487ebe-approved`
- evidence_label: `TASK-0004 local E2E from accepted handoff`
- candidate_commit: recorded in the executor handoff because a commit cannot include its own final hash

## Scope Delivered

1. An owned verified-funded Go Monthly arrangement idempotently activates one 100-unit allowance window using the existing schema.
2. A confirmed curated Generate Answer request fixes its server-side cost at 10, reserves once, runs a deterministic fixture outside the transaction, commits once, and returns a labeled simulated result at 90 available.
3. Failure/internal release restores the reservation once. A late completion cannot reverse a released operation, and a late release cannot reverse a committed operation. Every two-row transition locks allowance first and usage operation second.
4. The accepted handoff and direct return reach the responsive C3-G workspace. A dedicated test-only Express composition uses injected `VerifyToken`, the real TASK-0004 routes, and configured Postgres on desktop and exact 390-pixel mobile.

No migration, PSP call, provider semantic change, OTP shortcut, customer cancellation control/API, worker, queue, credit system, additional tier/action, or mobile application code was added.

## Round 2 Finding Dispositions

| Finding | Disposition | Bounded correction |
| --- | --- | --- |
| FINDING-001 | Corrected | Added configured-Postgres and authenticated Express negative activation proof for authentication-only, unverified/browser-approved, and failed arrangements. Every case returns a sanitized conflict, creates zero allowance windows, and leaves entitlement state unchanged. |
| FINDING-002 | Corrected | Usage-history funding provenance now projects through the owned allowance window, billing arrangement, account, checkout intent, quote, and completed funding operation. Only the normalized client value `PayPal Wallet` is returned; absent or inconsistent evidence fails closed. |
| FINDING-003 | Corrected | Exact 390-pixel mobile uses the approved compact allowance strip above the transcript, a keyboard-focusable `View usage` disclosure, prompt-first flow, and Marker-style `#Generate Answer` separator. Desktop retains the full side allowance card. Initial, reserved, committed-return, and released states are asserted across light and dark coverage. |

## Test-First Record

### RED

| Boundary | Failing check retained during implementation | Expected reason |
| --- | --- | --- |
| Shared contract | `npm test -- shared/src/usage.test.ts` | `shared/src/usage.ts` did not exist. |
| Usage-history contract | `npm test -- shared/src/usage.test.ts` after the first green implementation | Strict schema rejected the required sanitized `allowanceWindowId`; the DTO and projection were completed before freeze. |
| Service | `npm test -- server/src/domain/usage/service.test.ts` | Usage service and fixed-cost fixture ownership did not exist. |
| Configured Postgres | `node --env-file=.env.local node_modules/vitest/vitest.mjs run server/src/domain/usage/repository.integration.test.ts` | Repository module and activation/reserve/terminal SQL did not exist. |
| Express adapter | `npm test -- server/src/routes/usage.test.ts` | Usage routes did not exist. |
| Workspace/handoff | `npm test -- web/src/routes/workspace.test.tsx web/src/components/checkout/payment-handoff.test.tsx web/src/styles.test.ts` | Workspace state, activation handoff, and responsive styles did not exist. |
| Browser composition | TASK-0004 Playwright run | First run exposed a missing test-runtime env mapping/browser executable; the next run exposed authoritative-reserved-state timing and fixture-cleanup overlap. |
| Browser assertions | TASK-0004 Playwright rerun | A broad `Simulated AI` locator matched the static workspace eyebrow, and the expected initial summary `404` was initially classified as unexpected. |
| TASK-0008 regression environment | Generic TASK-0008 Playwright command | The bundled Playwright browser was absent; the first Chrome rerun reused an unrelated server on port 3000. No test reached the accepted review surface in that reused-server run. |

### GREEN

- Strict shared DTO tests: 2 passed.
- Usage service tests: 4 passed.
- Usage route tests: 3 passed.
- Workspace, handoff, and style focused tests: 12 passed at the implementation checkpoint.
- The final exact focused command passed 5 files / 17 tests.
- The configured-Postgres test passed after proving concurrent activation, one runner owner, release to 100, immutable late completion, commit to 90, duplicate terminal calls, return restoration, and cleanup.
- TASK-0004 Playwright passed 4/4 cases: desktop and exact 390-pixel mobile success/refresh/dark plus deterministic failure/release/light. TASK-0004 API requests were not intercepted.
- TASK-0008 unit regression passed 8 files / 81 tests. Its browser regression passed 28/28 on an isolated port using installed Chrome and the accepted TASK-0008 build-time configuration.

The browser fixes stayed test/interaction-focused: the UI polls the authoritative summary only while its own Generate Answer request is pending; fixture execution remains outside SQL transactions; cleanup closes the page and drains the in-flight request before deleting exact fixture-owned rows. The browser assertion now excludes the specific answer heading and permits only the one expected initial `GET /api/v1/me/summary` 404, while separately recording every failed response and console error.

### Round 2 RED -> GREEN

| Finding | RED | GREEN |
| --- | --- | --- |
| FINDING-001 | The first configured-database negative fixture run exposed invalid test setup: a pending vault could not own a customer and an invalid checkout transition violated the existing schema. This was a fixture RED, not a production failure; the existing activation implementation already rejected every valid negative arrangement. | With fixture-owned valid negative states, the focused configured-Postgres/Express test passed and proved 409, zero allowance windows, and unchanged entitlement state for all three cases. No production activation code changed. |
| FINDING-002 | The focused configured-Postgres provenance test changed the owned payment operation to failed; history still returned the hard-coded `PayPal Wallet` value instead of failing closed. | The same test passed after the repository projection joined and validated the owned arrangement and completed payment relationship. |
| FINDING-003 | Focused workspace/style tests failed 4 assertions because the compact strip, Marker separator, state labels, and mobile desktop-card suppression were absent. | The same focused command passed 2 files / 8 tests after the approved exact-390 correction. Final browser proof passed all four cases. |

Intermediate browser reruns also corrected assertion synchronization and locator precision without adding timing infrastructure. The final test support fixture remains at its original three-second deterministic duration.

## Fresh Verification

| Proof | Result |
| --- | --- |
| Focused TASK-0004 plus TASK-0008 unit regression | PASS — 13 files, 99 tests. |
| Configured Supabase Postgres command | PASS — 1 file, 3 integration tests in 84.79s on the final rerun; an immediately preceding full rerun also passed 3/3 in 85.88s. |
| TASK-0004 exact Playwright command with sanitized capture | PASS — 4/4 in 2.3m on the final rerun using the config's installed-Chrome fallback. |
| TASK-0008 focused provider regression | Included in the 13-file / 99-test focused command. |
| TASK-0008 Playwright regression | PASS — 28/28 against an isolated local server; the initial generic invocation failure was environment-only and is recorded above. |
| Full `npm test` | PASS — 33 files passed, 3 skipped; 213 tests passed, 7 skipped. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm run build` | PASS — Express TypeScript and Vite production output. |
| `npm audit --omit=dev --audit-level=high` | PASS — 0 vulnerabilities. |
| `git diff --check` | PASS. |
| Schema/provider protected-path audit | PASS — no diff under `supabase/**` or protected PayPal paths. |
| Sanitized configured-Postgres post-run counts | PASS — allowance windows 0, usage operations 0, matching the captured baseline. |

The configured-database negative/provenance proof and the exact-390 browser state matrix were rerun fresh after the corrections. The remote database race stayed deterministic on the final two full configured-Postgres runs. Four sanitized screenshots were captured under `tracking/evidence/artifacts/EVID-0004/`.

## Changed Files Owned By This Execution

### Round 2 correction

- `server/src/domain/usage/repository.ts`
- `server/src/domain/usage/repository.integration.test.ts`
- `web/src/components/workspace/allowance-card.tsx`
- `web/src/routes/workspace.tsx`
- `web/src/routes/workspace.test.tsx`
- `web/src/styles.css`
- `web/src/styles.test.ts`
- `tests/e2e/generate-answer.spec.ts`
- `tracking/tasks/TASK-0004/execution.md`
- `tracking/evidence/EVID-0004.md`
- four sanitized PNG files under `tracking/evidence/artifacts/EVID-0004/`

The test-only TASK-0004 server support file was temporarily inspected during synchronization diagnosis, then restored byte-for-byte; it is not part of the correction diff.

### Created

- `shared/src/usage.ts`, `shared/src/usage.test.ts`
- `server/src/domain/usage/fixtures.ts`
- `server/src/domain/usage/repository.ts`, `server/src/domain/usage/repository.integration.test.ts`
- `server/src/domain/usage/service.ts`, `server/src/domain/usage/service.test.ts`
- `server/src/routes/usage.ts`, `server/src/routes/usage.test.ts`
- `web/src/routes/workspace.tsx`, `web/src/routes/workspace.test.tsx`
- `web/src/components/workspace/allowance-card.tsx`
- `web/src/components/workspace/generate-answer.tsx`
- `web/src/components/workspace/action-confirmation.tsx`
- `web/src/components/workspace/simulated-message.tsx`
- `web/src/components/workspace/completion-status.tsx`
- `tests/e2e/generate-answer.spec.ts`
- `tests/e2e/support/task0004-fixture.ts`
- `tests/e2e/support/task0004-server.ts`
- `playwright.task0004.config.ts`
- `tracking/tasks/TASK-0004/execution.md`
- `tracking/evidence/EVID-0004.md`

### Modified

- `server/src/server.ts`
- `web/src/app.tsx`
- `web/src/lib/api.ts`
- `web/src/components/checkout/payment-handoff.tsx`
- `web/src/components/checkout/payment-handoff.test.tsx`
- `web/src/styles.css`
- `web/src/styles.test.ts`
- `tests/e2e/paypal-checkout.spec.ts`
- `tracking/evidence.md`

## Evidence Boundary

EVID-0004 proves only the local application behavior after an accepted authenticated, verified-funded handoff. It does not prove hosted OTP delivery, browser-session OTP isolation, PayPal sandbox approval/capture, webhook delivery, reusable credential creation, a renewal charge, deployment, production readiness, or a complete customer E2E. Those remain outside TASK-0004 and must not be inferred from local fixtures.

## Out-Of-Scope Observations

- The generic Playwright config can reuse an unrelated process on port 3000 when not running under CI. TASK-0004 did not modify that shared config; its dedicated config uses a fixed isolated port and one worker.
- A process crash during the short reserved interval could strand a reservation. The approved plan explicitly leaves cleanup/expiry workers as future hardening.
- The repository already contained extensive unrelated tracked and untracked work. None of it is part of this execution candidate.

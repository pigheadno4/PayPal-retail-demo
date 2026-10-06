# TASK-0011 resumed local candidate evidence

Status: `needs_review`. This is executor evidence, not self-approval, provider acceptance or a canonical requirement/evidence update. The historical blocked checkpoint remains intact in the primary task packet. The exact candidate hash is appended there after this scoped local commit.

Authority: `user:TASK-0011:2026-10-06:local-implementation-loop-approved`, supplemented by `user:TASK-0011:2026-10-06:risk-bootstrap-amendment-approved`. Original plan SHA-256 `0f0b618d7f9b1b081ad17cb4c9dcfac5187ed573f01f13ea59c453cd44978511`; contract SHA-256 `af92550654b44264722c2d059add9323523be9aa32e60b9dbab85a3ac3f75a5b`. Reviewers must read the primary risk-bootstrap addendum alongside those frozen documents. Branch `codex/task0011-reactivation`, baseline `6f967b1dcc46e6cfdfd844eeab9e83b2a8b25f30`.

## Implemented scope

- Owned expired workspace entry, strict recovery-only DTO/routes, normal-price immutable review and explicit confirmation; initial acquisition quotes remain purpose-isolated.
- Server-owned review FraudNet bootstrap and extraction of the existing loader. Recovery does not request an acquisition id-token, create a vault, replace a primary, or invoke a real provider.
- One durable saved-token operation per expired-window obligation, full create response, exact completed-funding projection and at most one claimed same-order GET. Pending, unknown, action-required and failed never grant access or trigger payment retry/capture continuation.
- Same-arrangement funding-time calendar month, 100 new units without carryover, immutable acquisition history and window-specific usage funding provenance. Removal races retain verified money without reviving the method.
- Persisted refresh/status UI and unchanged funded wallet management, using the approved focused mockup and existing semantic typography/colors. Removed an extra empty expired-management panel because the existing paid-period-only management API intentionally returns no wallet there; funded management remains available.
- One CLI-generated additive migration and task-specific offline fixture/server/browser support. No dependency, new production table, scheduler, hosted runner or generic provider abstraction was added.

## Final verification

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin TMPDIR=/private/tmp node tests/e2e/support/task0011-local.mjs verify
git diff --check
```

Both exited 0. Fresh fixture `/private/tmp/task0011-postgres-CKUZPs`, PostgreSQL 17.10, exact role/database `task0011/task0011_test`, address `127.0.0.1:55411`. Parent environment/configuration and env files were not imported. Existing installed Node 26.0.0 was used; package declares 24.18.0, so that exact Node version was not independently verified or installed.

| Required check | Result |
| --- | --- |
| Typecheck, lint | Passed |
| Full serialized unit/integration | 658 passed, 57 files, zero skipped tests; all five actual PostgreSQL integration suites executed |
| Migration/SQL | Forced failed-migration transaction rolled back; baseline acquisition rows/counts preserved; 32 negative CHECK/FK/partial-unique/capture/funding-window cases passed |
| Build | Existing server build passed; existing web build passed with task-only offline Vite config instead of env-file-loading production config |
| Browser | 84 passed, zero failed, six historical skips, 90 total; desktop/mobile recovery plus affected acquisition/usage/removal suites executed |
| Network guard | Six Node negative transport/DNS probes passed; browser outbound probe passed. All contexts use the non-forwarding local proxy, service workers blocked and synthetic external loaders intercepted |
| Visual/accessibility | Review no overflow at 375/768/1024/1440 in light/dark; axe recovery checks passed; keyboard confirmation exercised; 28 safe screenshots captured |

The six browser skips are the existing temporary-alias browser-A OTP, hosted originating-session isolation, and real sandbox SDK/FraudNet/capture/webhook contracts, each in both projects. They are not TASK-0011 local proof and were not relabeled passed or removed.

## AC-to-proof index

| AC / test | Local proof |
| --- | --- |
| AC1 / TC-0021 | Owned expired entry and other-owner concealment; opening performs no confirmation/activation; no free allowance |
| AC2 / TC-0022 | $10 base, zero promotion, effective $1.06 tax, $11.06 total; immutable superseded quotes and stale/cross-owner confirmation rejected; browser expiry removes confirmation and requires explicit review |
| AC3 / TC-0023 | Owned primary and removal/readiness/provenance rechecked at claim; risk failure disables payment; concurrent duplicate confirmation creates once; full response/headers exact; mismatched amount/currency/payee/reference unfunded; bounded same-order reconciliation and terminal states persisted |
| AC4 / TC-0024 | Completed funding only; Jan31/leap/nonleap/DST gap/overlap cases; delayed evidence retains original effective term; duplicate capture cannot settle a second operation; exact old intent/quote/payment/method/window snapshots preserved; new window funding provenance supplies usage |
| AC5 / TC-0025 | Confirmed refresh restores 100-unit workspace and existing wallet panel; pending/action-required/failed/unknown refresh remains non-funded with no retry; existing usage and mocked wallet-management contracts pass |

## Red/green and fixture corrections

Historical pre-resume behavioral reds remain in the primary checkpoint. Resume adds: recovery UI placeholder red4 then green4; risk parameters red1 then green1; expired workspace restoration red1 then green; window funding provenance red1 then green; late expired activation and GET action-required red2 then green; claim-time original funding change red1 (653/654 green) then green. Final whole run is 658/658.

Setup errors are separate, not behavioral red evidence: malformed unavailable-method fixture violated the existing removal CHECK; task runtime entry was type/lint-invalid and then its exports were tree-shaken; SQL fixture initially omitted existing non-null funding/vault fields. Each was corrected only in task support/tests.

Initial browser checkpoint was 74 passed / 6 failed / 6 historical skips. After task fixture/export corrections, 78 passed / 2 failed / 6 skips. Existing Chrome native-dialog forward focus may visit browser chrome/body before returning to Keep wallet; the test now permits only that body transition, then verifies safe return, Escape/cancel and no payment. No production removal behavior changed. Final browser is 84 passed / 0 failed / 6 historical skips.

Acquisition assertions formerly expected a checkbox removed by approved TASK-0009 checkbox-free preparation. Primary `DESIGN.md` and `tracking/tasks/TASK-0009/paypal-preparation-design-approval.md` were checked before minimal fixture/assertion reconciliation. Real acquisition amount, token, payment and authorization semantics were unchanged.

## Evidence, shutdown and limits

Screenshots are in [artifacts](artifacts/): review at all required widths/themes, expired, pending, action-required, failed, unknown and restored workspace. They show synthetic amounts/status only; no email, OTP, token, customer/vault identifier or provider error. Representative final desktop-light/mobile-dark review, pending and restored-wallet screenshots were visually inspected after regeneration.

The owned task HTTP server and cluster were stopped; read-only checks found no listener on 3111 or 55411. Diagnostic directories remain for investigation; no recursive deletion, prior database reuse, inverse DDL or paid-history deletion occurred. Pre-existing `test-results/` and raw `task0011-test-results/` stay untracked and excluded from the candidate.

Independent same-candidate spec/quality reviews remain root-owned and pending. Local fake provider/auth with real PostgreSQL is not exact merchant/token provider proof, hosted funding, real risk readiness, real OTP or real wallet deletion. No hosted schema/data, provider mutation, push, deployment, PR or merge occurred. Rollback is a scoped local commit reversal preserving unrelated work; once recovery data exists, schema corrections must be forward-only.

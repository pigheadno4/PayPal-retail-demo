# TASK-0007 Execution Report

- status: needs_review
- task: TASK-0007
- implementation_round: 3 of 3
- plan_sha256: `e39aaea70c1c2d6583818dba130a127abb5bc8b850579706a90f55a2614e8c5c`
- plan_approval: `user:TASK-0007:2026-08-29:plan-approved`
- candidate_base_commit: `621afb43f731caa780400a9316f2fcdc69d40611`
- prior_candidate_commit: `26a049290ead3939caf54e8c0ead9bc229d699c0`
- round_2_review_input: `tracking/tasks/TASK-0007/spec-review.md` SHA-256 `2063cec4e0054af9e4765b5ddbc7169f3b9306141509dc789c7c174f6ef9a711`
- round_3_review_input: `tracking/tasks/TASK-0007/review-quality.md` SHA-256 `3e914bbe84a199885f4a781d1e16813b17e586fb5a263ef356c2959ed49eace3`
- round_3_scope_approval: `user:TASK-0007:2026-08-29:otp-schema-boundary-extension-approved`
- candidate_commit: the single evidence-bearing commit containing this report; its exact final hash is returned to the orchestrator because a commit cannot contain its own hash
- frontend_route: reuse
- payment_route: boundary_only

## Delivered Scope

TASK-0007 migrates the accepted Go Monthly identity/session/quote story to the accepted Vite/Express runtime. It adds strict shared DTOs, verified bearer identity, signed anonymous-origin proof, a raw verified Supabase Send Email Hook, encrypted temporary OTP handling, concrete Postgres repositories, exact Seattle quote/replacement behavior, and the approved Go selection/identity/review/stale Vite states. The task ends at `Payment step not started`.

Round 3 adds one additive Supabase migration for explicit OTP issuance time and replaces only the affected OTP-lifetime constraint. No provider adapter, provider control, PayPal call, payment operation, billing arrangement, entitlement, allowance, usage, AI action, alternate tier, annual cadence, or mobile client was added.

## Exact Implementation And Test Files

### Shared and server

- `shared/src/identity.ts`, `shared/src/identity.test.ts`
- `shared/src/checkout.ts`, `shared/src/checkout.test.ts`
- `shared/src/http.ts`
- `server/src/db/client.ts`
- `server/src/middleware/auth.ts`, `server/src/middleware/auth.test.ts`
- `server/src/domain/auth/demo-session.ts`, `send-email-hook.ts`, `service.ts`, `service.test.ts`
- `server/src/domain/checkout/repository.ts`, `repository.integration.test.ts`, `service.ts`
- `server/src/domain/quote/go-monthly-seattle.ts`, `repository.ts`, `service.ts`, `service.test.ts`
- `server/src/routes/identity.ts`, `identity.test.ts`, `quotes.ts`, `quotes.test.ts`, `supabase-hook.ts`, `supabase-hook.test.ts`
- `server/src/server.ts`

### Vite customer route

- `web/src/lib/api.ts`, `supabase.ts`
- `web/src/components/checkout/header-controls.tsx`, `identity-panel.tsx`, `quote-review.tsx`
- `web/src/routes/home.tsx`, `home.test.tsx`, `checkout.tsx`, `checkout.test.tsx`
- `web/src/app.tsx`, `app.test.tsx`, `styles.css`, `styles.test.ts`, `vite-env.d.ts`
- `web/index.html`, `web/public/favicon.svg`
- `package.json`, `package-lock.json` for exact OFL font package pins only
- `tsconfig.json`, `playwright.config.ts`, `tests/e2e/identity-and-quote.spec.ts`

### Removed after parity

- Identity/quote-only `src/app/page.tsx` and the exact approved Next route/test adapters under checkout-intents, auth, Supabase send-email Hook, and quotes.
- The mixed TASK-0008 checkout page, PayPal routes, PayPal components, PayPal tests, and fixtures remain present and unchanged.

### Direct evidence

- `tracking/evidence/EVID-0002.md`
- `tracking/evidence/artifacts/EVID-0002/task-0007-choose-go-laptop.png`
- `tracking/evidence/artifacts/EVID-0002/task-0007-review-laptop.png`
- `tracking/evidence/artifacts/EVID-0002/task-0007-identity-mobile-dark.png`
- `tracking/evidence/artifacts/EVID-0002/task-0007-identity-mobile-light.png`
- `tracking/tasks/TASK-0007/execution.md`

### Round-3 OTP correction

- `supabase/migrations/20260829045606_fix_demo_session_otp_lifetime.sql`
- `supabase/tests/slice001_core_test.sql`
- `server/src/domain/auth/send-email-hook.ts`, `service.test.ts`
- `server/src/domain/checkout/repository.ts`, `repository.integration.test.ts`

## Acceptance Criteria And Proof

| AC | Executor result | Proof |
| --- | --- | --- |
| AC-1 | Pass at local/actual-Postgres level | Strict selection/cookie/bearer/resume tests; actual counts; persistent return browser flow; zero provider requests. |
| AC-2 | Pass locally and on actual configured Postgres; hosted proof blocked | Raw Hook/signature, receipt-relative encrypted expiry, browser proof, clearing/replay, exact alias correlation, actual cleanup, and browser A/B simulation pass. Hosted Hook/inbox/isolation is not claimed. |
| AC-3 | Pass at local/actual-Postgres level | Exact quote values, strict DTO/statuses, idempotence, ownership, stale gate, one-winner concurrency, and zero forbidden effects pass. |
| AC-4 | Pass at local production-build/browser level | Laptop/mobile light/dark/focus/target/no-overflow/reduced-motion/favicon/no-console/no-provider checks pass. Exact pinned OFL packages contain the font assets/licenses; the production build emits WOFF2 and the browser observes both computed families and loaded local font URLs. |

## TDD Red / Green Record

1. Shared/auth RED: three suites failed because the replacement DTO and middleware modules did not exist. GREEN: 3 files, 8 tests.
2. Domain RED: two suites failed because the replacement identity/quote services did not exist. The first Hook signature fixture also exposed timestamp tolerance. GREEN: 2 files, 8 tests after correcting only the test clock.
3. Route RED: three suites failed because the Express route modules did not exist. GREEN: 3 files, 9 tests.
4. Frontend RED: missing route modules, missing approved content, and missing interaction styles failed four focused files. GREEN: 4 files, 9 tests.
5. Actual Postgres: the restricted run failed before connection on DNS; the authorized run passed 1/1 in 16.21 seconds and restored baseline counts.
6. Browser RED/GREEN: the first installed-Chrome run passed persistent and temporary flows and exposed two evidence-test mistakes: a stale timestamp still in the future and radio-glyph size being measured instead of the 72px label target. The corrected focused run passed 2/2; the final laptop/mobile run passed 8 and skipped 2 hosted-only cases.
7. Font RED/GREEN: the focused style proof failed on absent package/import/license/WOFF2 evidence. After the bounded exact Fontsource 5.3.0 intake, package/license/asset tests passed 4/4 and the production browser confirmed actual local WOFF2 loading.
8. Final typecheck RED/GREEN: stale generated `.next` validators referenced the intentionally removed adapters. Regenerating only production route types did not clear the separate development cache, confirming that the active Vite/Express typecheck still included obsolete Next-generated authority. The root TypeScript scope was narrowed to preserved source/tests/config while server and web retain their dedicated configs; the exact typecheck then passed without restoring obsolete routes.
9. Dark-theme evidence RED/GREEN: an immediate computed-style assertion sampled the reduced-motion theme transition's previous frame even though the dark tokens had already changed. Polling the rendered foregrounds until the 0.01 ms transition settled passed in focused and full browser runs; the refreshed mobile artifact confirms the intended contrast without a production-style workaround.
10. FINDING-001 RED/GREEN: with dark OS emulation, explicit light selection changed `data-theme` but the focused browser test continued to observe the complete dark token set on the body, reading surface, and selection evidence surface. The existing light token block now also applies to `:root[data-theme="light"]`; the focused rerun passed 1/1 and the full two-project browser matrix passed 10 with 2 hosted-only skips.
11. OTP-lifetime finding RED/GREEN: an actual configured-Postgres test created a still-valid session ten minutes before Hook receipt. Before the migration, its freshly stored OTP expired at `created_at + 5 minutes` (received `04:49:48.351Z`, expected `04:59:48.351Z`) and the focused file failed 1/2. After adding explicit `otp_issued_at`, changing the repository/Hook boundary, and applying the audited migration, the same file passed 2/2 with successful retrieval, consumption/replay clearing, expiry clearing, and exact fixture cleanup. Direct transactional pgTAP execution passed 42/42 with zero failures.

## Final Verification

- Focused TASK-0007 backend command: 8 files, 25 tests passed.
- Focused TASK-0007 frontend command: 4 files, 10 tests passed.
- Actual configured Supabase Postgres: 2 tests passed; delayed-session OTP retrieval/clearing and exact fixture cleanup passed.
- Direct transactional pgTAP against configured Supabase: 42 assertions passed, 0 failed.
- Full `npm test`: 29 files passed, 2 skipped; 177 tests passed, 4 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero findings.
- `npm run build`: passed; server compiled and Vite transformed 124 modules.
- Production-service Playwright on installed Chrome: 10 passed, 2 hosted-only skipped across laptop and mobile projects, including dark-OS to explicit-light rendered body and evidence surfaces.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- Linked `app_private` database lint: no schema errors.
- Migration list: local and remote both record `20260813141941` and `20260829045606`; the preceding dry run listed only `20260829045606_fix_demo_session_otp_lifetime.sql`.
- Protected PayPal/mixed-checkout and unrelated-schema diff: clean; the only `supabase/**` changes are the approved migration and its pgTAP assertions.
- Forbidden boundary scan: matches only negative test assertions and zero-effect count assertions; no provider import, call, control, or mutation.

## Proof Levels And Honest Limitations

- Local unit/route, actual configured Postgres, combined production-build browser simulation, and responsive visual proof are complete for the recorded commands.
- The first Playwright attempt used the package-default missing browser revision and did not execute. The final run used the installed Google Chrome binary through the existing test-only executable input.
- Render deployment, real HTTPS Send Email Hook delivery, controlled persistent inbox, hosted browser isolation, screen-reader testing, and production readiness were not executed.
- Fontsource registry metadata and packaged contents were inspected before intake. Both exact 5.3.0 packages identify `OFL-1.1`, include license text, and contain variable WOFF2 assets. Runtime proof confirms the built assets load; fallback-only rendering is not counted.
- The Supabase CLI `test db` wrapper returned `LegacyDockerRunError` for both `--linked` and `--db-url`, even though the target was remote. The same committed pgTAP file was therefore executed directly through the configured Postgres client inside its own `begin`/`rollback`; all 42 assertions passed. The CLI wrapper limitation is not presented as test success.
- The migration push succeeded and migration history is synchronized. Its post-push catalog-cache step emitted the same Docker warning; direct schema inspection independently confirmed `otp_issued_at timestamptz` and a validated replacement constraint.

## Protected-Path And Dirty-Tree Result

The exact protected diff contains only the user-approved OTP migration and pgTAP change under `supabase/**`; PayPal server/contracts/routes/webhooks/components/tests/fixtures, billing, allowance, mobile, frontend, and the retained mixed checkout page are unchanged. Orchestrator-owned loop state/budget/log and unrelated dirty-tree files were not edited by this executor and are excluded from the candidate.

## Rollback

Because migration `20260829045606` is applied remotely, do not revert only the application commit: the pre-fix repository does not populate the new all-or-none issuance field. A rollback requires a separately approved compatibility migration that restores the former constraint/removes `otp_issued_at` after handling any live OTP row, followed by reverting the cumulative TASK-0007 candidates. TASK-0008 mixed PayPal checkout, provider objects, billing, entitlement, allowance, usage, and unrelated dirty-tree state are otherwise unaffected.

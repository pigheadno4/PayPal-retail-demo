# TASK-0007 Execution Report

- status: needs_review
- task: TASK-0007
- implementation_round: 1 of 3
- plan_sha256: `e39aaea70c1c2d6583818dba130a127abb5bc8b850579706a90f55a2614e8c5c`
- plan_approval: `user:TASK-0007:2026-08-29:plan-approved`
- candidate_base_commit: `621afb43f731caa780400a9316f2fcdc69d40611`
- candidate_commit: the single evidence-bearing commit containing this report; its exact final hash is returned to the orchestrator because a commit cannot contain its own hash
- frontend_route: reuse
- payment_route: boundary_only

## Delivered Scope

TASK-0007 migrates the accepted Go Monthly identity/session/quote story to the accepted Vite/Express runtime. It adds strict shared DTOs, verified bearer identity, signed anonymous-origin proof, a raw verified Supabase Send Email Hook, encrypted temporary OTP handling, concrete Postgres repositories, exact Seattle quote/replacement behavior, and the approved Go selection/identity/review/stale Vite states. The task ends at `Payment step not started`.

No Supabase migration, provider adapter, provider control, PayPal call, payment operation, billing arrangement, entitlement, allowance, usage, AI action, alternate tier, annual cadence, or mobile client was added.

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
- `tracking/tasks/TASK-0007/execution.md`

## Acceptance Criteria And Proof

| AC | Executor result | Proof |
| --- | --- | --- |
| AC-1 | Pass at local/actual-Postgres level | Strict selection/cookie/bearer/resume tests; actual counts; persistent return browser flow; zero provider requests. |
| AC-2 | Pass locally; hosted proof blocked | Raw Hook/signature, encrypted expiry, browser proof, clearing/replay, exact alias correlation, actual cleanup, and browser A/B simulation pass. Hosted Hook/inbox/isolation is not claimed. |
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

## Final Verification

- Focused TASK-0007 backend command: 8 files, 25 tests passed.
- Focused TASK-0007 frontend command: 4 files, 10 tests passed.
- Actual configured Supabase Postgres: 1 test passed; exact fixture cleanup passed.
- Full `npm test`: 29 files passed, 2 skipped; 177 tests passed, 3 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero findings.
- `npm run build`: passed; server compiled and Vite transformed 124 modules.
- Production-service Playwright on installed Chrome: 8 passed, 2 hosted-only skipped across laptop and mobile projects.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Protected schema/PayPal/mixed-checkout diff: clean.
- Forbidden boundary scan: matches only negative test assertions and zero-effect count assertions; no provider import, call, control, or mutation.

## Proof Levels And Honest Limitations

- Local unit/route, actual configured Postgres, combined production-build browser simulation, and responsive visual proof are complete for the recorded commands.
- The first Playwright attempt used the package-default missing browser revision and did not execute. The final run used the installed Google Chrome binary through the existing test-only executable input.
- Render deployment, real HTTPS Send Email Hook delivery, controlled persistent inbox, hosted browser isolation, screen-reader testing, and production readiness were not executed.
- Fontsource registry metadata and packaged contents were inspected before intake. Both exact 5.3.0 packages identify `OFL-1.1`, include license text, and contain variable WOFF2 assets. Runtime proof confirms the built assets load; fallback-only rendering is not counted.
- The existing database migration caps OTP expiry relative to session-row creation. The repository additionally takes the earlier of the requested expiry and that schema cap, failing closed without the forbidden schema change; a delayed Hook can therefore shorten the available code window rather than extend it.

## Protected-Path And Dirty-Tree Result

The exact protected diff command is clean for `supabase/**`, PayPal server/contracts/routes/webhooks/components/tests/fixtures, and the retained mixed checkout page. Orchestrator-owned loop state/budget/log and unrelated dirty-tree files were not edited by this executor and are excluded from the candidate.

## Rollback

Revert the single TASK-0007 candidate. This restores the accepted TASK-0006 shell and the preserved TASK-0002 identity-only Next adapters/page, removes only the replacement shared/server/Vite identity and quote files plus direct evidence, and leaves Supabase schema, TASK-0008 mixed PayPal checkout, provider objects, billing, entitlement, allowance, usage, and unrelated dirty-tree state unchanged.

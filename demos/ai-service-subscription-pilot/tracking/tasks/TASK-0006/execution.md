# TASK-0006 Execution Report

- status: needs_review
- task: TASK-0006
- implementation_round: 3
- plan_sha256: `5a7b74c75c8c9c4b5f033a8fc6ff4aa6e5cce837e34cd52345bc575f50427ba8`
- plan_approval: `user:TASK-0006:2026-08-28:plan-approved`
- candidate_base_commit: `c797dcd992f0e744cdc47c79bcf2ea0e8b5102e9`
- previous_rejected_candidate: `cb546a8cc430f6a11ccbd85be4d2eb494f702c56`
- earlier_rejected_candidate: `a4522b5cb7800777a3b4841bae3be1e2abb23b74`
- candidate_commit: the single evidence-bearing commit containing this report; its exact post-freeze hash is returned to the orchestrator because a commit cannot contain its own final hash
- frontend_route: reuse
- payment_route: not_applicable
- evidence_artifact: `tracking/evidence/artifacts/EVID-0001/TASK-0006-runtime-foundation.txt`
- evidence_artifact_sha256: `c5fbbf0d4d401bcae2bbce690c6efa1f7108d67a5d81c45cf15ed9ceb748a499`

## Scope Delivered

TASK-0006 adds only the approved replacement runtime foundation:

- a passive Vite React shell wrapped by declarative `BrowserRouter`;
- one Express 5 service with isolated `/api/v1` and `/webhooks` boundaries;
- compiled static assets and safe browser-history fallback;
- independent base, PayPal-capability, and email-hook-capability configuration readers;
- exact health and sanitized error DTOs;
- one Vite development proxy and one compiled production build/start contract; and
- additive, local-only evidence.

No identity, OTP, quote, checkout, PayPal call, webhook verification, entitlement, allowance, usage, customer-journey adapter, Supabase schema, mobile, or hosted-deployment behavior was implemented.

## Files Changed And Why

### Runtime and tests created

- `vite.config.ts`: approved `web/` root, `dist/web` output, exact proxy keys, and three-key public environment allowlist.
- `tsconfig.server.json`, `tsconfig.web.json`: scoped Node ESM emission and Vite web typechecking.
- `shared/src/http.ts`: client-safe readiness and sanitized error DTOs only.
- `server/src/config/env.ts`, `server/src/config/env.test.ts`: base and capability configuration contracts with sanitized failures.
- `server/src/http/errors.ts`: bounded configuration and missing-capability error types.
- `server/src/routes/api.ts`, `server/src/routes/webhooks.ts`: health route and reserved webhook boundary.
- `server/src/app.ts`, `server/src/app.test.ts`: mount order, parsing isolation, static/history behavior, and sanitized error mapping.
- `server/src/server.ts`: validated startup and compiled-web serving.
- `web/index.html`, `web/src/main.tsx`, `web/src/app.tsx`, `web/src/app.test.tsx`: passive semantic Vite foundation shell.
- `web/src/styles.css`, `web/src/styles.test.ts`: reused C3-G semantic palette, font roles/fallbacks, strong reading surface, and opaque reduced-transparency behavior.
- `web/src/vite-config.test.ts`: executable proxy/output/public-variable contract.

### Approved runtime files modified

- `package.json`, `package-lock.json`: exact dependency pins and Vite/Express build, development, start, test, lint, and typecheck scripts.
- `tsconfig.json`: retains the pre-existing Next-generated formatting/includes and adds generated `dist` exclusion while root typecheck still covers preserved and replacement source.
- `vitest.config.ts`: discovers preserved and replacement test locations while retaining the `server-only` alias.
- `eslint.config.mjs`: excludes generated `dist` output while retaining existing rules.
- `.env.example`: separates browser-safe, base-server, PayPal-capability, and email-hook-capability examples and adds `PORT`.
- `render.yaml`: preserves one service and changes only the health path to `/api/v1/health`.

### Evidence modified or created

- `tracking/evidence/EVID-0001.md`: additive candidate/local-only replacement-runtime section; accepted schema history is unchanged.
- `tracking/evidence/artifacts/EVID-0001/TASK-0006-runtime-foundation.txt`: sanitized command and route transcript.
- `tracking/tasks/TASK-0006/execution.md`: this executor report.

## Acceptance Criteria Results

| AC | Result | Tests and evidence |
| --- | --- | --- |
| AC-1 | Pass, local candidate | Exact pins are in manifest/lockfile; `npm ci`, typecheck, lint, combined build, compiled output checks, and one-service Render inspection passed. `build` and `start` do not invoke Next. |
| AC-2 | Pass, local replacement candidate | `server/src/app.test.ts` and compiled smoke prove constant health, API/webhook isolation, legacy `/api` isolation, real static content types, eligible HTML fallback, and literal, encoded, or malformed file/reserved paths returning sanitized JSON 404 rather than SPA HTML. |
| AC-3 | Pass, local candidate | `server/src/config/env.test.ts` proves base startup validation, port and URL bounds, optional capability isolation, all-or-none PayPal/email groups, and sanitized capability errors. |
| AC-4 | Pass, bounded source/runtime shell | Web tests prove semantic header/main structure, absence of payment/provider controls, approved public-variable boundary, reusable tokens/font roles/reading surface/opaque fallback, and exact Vite roots/proxies. No visual-completion or runtime-accessibility claim is made. |
| AC-5 | Pass, local replacement candidate | Focused 48/48; full 148 passed and 2 skipped; typecheck, lint, build, audit, output checks, route smoke, protected-path diff, and scope scan passed. Evidence is refreshed before replacement freeze. |

## Red-Green Record

1. Configuration red: `npm test -- server/src/config/env.test.ts` failed because `./env` did not exist.
2. Configuration green: the focused file passed 19 tests; a later invalid-database mutation failed one test and then passed after the minimal URL validator, leaving 21 configuration tests green.
3. HTTP red: `npm test -- server/src/app.test.ts` failed because `./app` did not exist.
4. HTTP green: the first restricted-sandbox attempt received `EPERM` on Supertest's ephemeral bind; the approved localhost run passed 33 combined configuration/HTTP tests.
5. Vite red: the three web files failed because `app.tsx`, `styles.css`, and `vite.config.ts` did not exist.
6. Vite green: 3 files and 7 tests passed.
7. Round-1 focused: 5 files and 42 tests passed.
8. Round-1 regression after `npm ci`: 21 files passed, 1 skipped; 142 tests passed, 2 skipped.
9. Round-2 FINDING-001 red: `npm test -- server/src/app.test.ts` failed only for `GET /assets/missing` because it returned `200` instead of `404`.
10. Round-2 FINDING-001 green: the same focused file passed 15/15 after excluding `/assets` and descendants from history fallback.
11. Round-2 full regression: 21 files passed, 1 skipped; 143 tests passed, 2 skipped.
12. Round-3 FINDING-002 red: `npm test -- server/src/app.test.ts` failed for encoded file, asset, API, and webhook paths plus malformed percent encoding; each returned `200` instead of `404`, while 15 existing cases passed.
13. Round-3 FINDING-002 green: the same focused file passed 20/20 after safely decoding only for history classification, failing closed on malformed encoding, and checking decoded reserved namespaces and file extensions.
14. Round-3 full regression: 21 files passed, 1 skipped; 148 tests passed, 2 skipped.

## Final Verification

- `npm ci`: exit 0; 516 packages installed; audit reported 0 vulnerabilities.
- `npm test`: exit 0; 148 passed, 2 skipped.
- `npm run typecheck`: exit 0.
- `npm run lint`: exit 0 with no warnings.
- `npm run build`: exit 0; 74 Vite modules transformed.
- `test -f dist/server/src/server.js`: exit 0.
- `test -f dist/web/index.html`: exit 0.
- `npm audit --omit=dev --audit-level=high`: exit 0; 0 vulnerabilities.
- Development proxy `GET http://127.0.0.1:5173/api/v1/health`: `200` with exactly `{"status":"ready"}`.
- Compiled production smoke: `/missing%2Ejs`, `/assets%2Fmissing`, `/api%2Fv1%2Fhealth`, `/webhooks%2Fmissing`, malformed `/malformed%2`, and literal `/assets/missing` with `Accept: text/html` each return `404 application/json` with exact sanitized `not_found`; the normal deep link remains `200 text/html`; literal health remains `200` exact ready JSON.
- Protected feature/domain/Supabase diff: exit 0 before and after execution.
- Scope scan: no imported legacy feature adapter, domain, or schema path; matches are only approved `/api/v1` declarations/tests and Render health configuration.

## Existing Baseline And Honest Limitations

- Before execution, the existing suite passed 100 tests with 2 skips; typecheck and lint passed.
- The historical Next build failed because the restricted sandbox denied Turbopack an internal port bind. TASK-0006 did not repair or reinterpret the historical runtime.
- The verification host used Node v26.0.0 and npm 11.12.1, so `npm ci` emitted an engine warning against the exact Node 24.18.0 package/Render pin. This report does not claim a Node-24-hosted execution.
- `npm ls --depth=0` labels `@img/sharp-wasm32` and `@emnapi/runtime` as extraneous optional packages in the preserved Next/sharp compatibility tree. They are not top-level manifest dependencies or TASK-0006 replacement-runtime packages.
- The local shell is not proof of customer journey parity, responsive final fidelity, real font loading, accessibility completion, PSP hydration, or payment behavior.
- No hosted Render deployment, linked Supabase run, email delivery, provider call, webhook delivery, mobile run, or production-readiness verification occurred.

## Review Finding Disposition

- `FINDING-001` (`important`, specification review): resolved in implementation round 2 pending independent scoped re-review. Root cause was the history predicate's reliance on an empty file extension; `/assets/missing` therefore looked like an eligible SPA route. The replacement candidate adds one negative regression and one explicit `/assets` namespace exclusion. No generic asset abstraction or other routing behavior was added.
- `FINDING-002` (`important`, engineering-quality review): resolved in implementation round 3 pending both independent lanes reviewing the same replacement candidate. Root cause was classifying the percent-encoded request path. The scoped correction decodes once inside history eligibility, returns ineligible when decoding fails, and checks the decoded asset/API/webhook namespaces and file extension. No routing abstraction or adjacent behavior was added.

## Out-Of-Scope Observations

- TASK-0007 still owns migration of customer React surfaces and feature adapters onto the replacement boundaries.
- Preserved Next dependencies and compatibility source remain intentionally installed/unmounted until TASK-0007 decides their approved migration/removal.
- The local runner-version mismatch should be closed by CI or Render evidence on configured Node 24.18.0 in a separately authorized hosted/deployment step, not by broadening this task.

## Rollback Notes

Roll back all three TASK-0006 commits in reverse order: revert the current round-3 replacement candidate at `HEAD`, then revert round-2 candidate `cb546a8cc430f6a11ccbd85be4d2eb494f702c56`, then revert the initial runtime-foundation commit `a4522b5cb7800777a3b4841bae3be1e2abb23b74`. Equivalently, restore the complete TASK-0006 range to base commit `c797dcd992f0e744cdc47c79bcf2ea0e8b5102e9`; reverting only the latest correction does not remove the earlier corrections or foundation. This restores the previous package scripts, dependency lock, TypeScript/Vitest/ESLint environment, `.env.example`, and Render health path and removes only the new `server/`, `shared/`, `web/`, Vite configuration, and additive TASK-0006 evidence. Preserve unrelated dirty work and the accepted evidence that predates TASK-0006. This boundary does not alter the preserved `src/` feature/domain tree, any Supabase migration/test, accepted schema evidence, payment evidence, provider object, or hosted resource.

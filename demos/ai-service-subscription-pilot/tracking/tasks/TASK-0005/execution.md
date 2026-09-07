# TASK-0005 Execution — Local Preparation

- status: blocked
- task: TASK-0005
- slice: SLICE-001
- implementation_round: 1 of 3
- plan: `tracking/tasks/TASK-0005/plan.md`
- plan_sha256: `315352d87d0a0e0adcd5d1884d66dcb7719d0fedd4a5199711eadfffb17df438`
- approval: `user:TASK-0005:2026-09-05:plan-315352d8-approved`
- candidate_commit: local deployment-source commit containing this report; exact Git hash is reported by the orchestrator, not task acceptance
- semantic_dependency_head: `5239e79f4d1b4aa557566ac9699ac34bf07d3359`
- report_date: 2026-09-05
- boundary: approved ordered local preparation steps 1–7 only; actual hosted proof and independent candidate reviews remain pending

## Changes And Ownership

| Files | Reason |
| --- | --- |
| `server/src/server.ts`, `server/src/routes/identity.ts`, `server/src/routes/identity.test.ts` | Derive cookie security from validated APP_URL; HTTPS adds Secure while local HTTP behavior and all existing cookie attributes remain intact. Browser body/proxy headers cannot choose the policy. |
| `server/src/routes/supabase-hook.ts`, `server/src/routes/supabase-hook.test.ts`, `server/src/app.test.ts` | Handle only HookRejectedError as generic signature/body rejection; forward capability/provider failures to the existing sanitized application boundary. Preserve the raw body and unrelated-route availability. |
| `server/src/domain/auth/service.test.ts`, `server/src/domain/auth/send-email-hook.ts` | Add signed six-digit delivery regressions. RED exposed numeric token coercion; require the token to be a six-digit string before delivery. No identity model, repository, or schema change. |
| `server/src/config/env.test.ts`, `.env.example` | Test absent/partial email capability isolation and redaction; document existing key ownership without new provider values or keys. Existing parser and Render manifest required no change. |
| `playwright.task0005.config.ts`, `tests/e2e/hosted-identity.spec.ts` | Serial headed hosted-only identity run, manual persistent code entry, manual OTP-only inbox confirmation, same-account/intent review restoration, origin-cookie denial matrix, real expiry wait, and explicit sanitized capture. |
| `tests/evidence/task0005-sanitize.ts`, `tests/evidence/task0005-sanitize.test.ts` | Task-specific fixed-field projector, matched case/status/outcome/proof levels, required blocked claims, complete manifest validation, and prohibited-value tests. |
| `vitest.config.ts` | One directly necessary test-discovery include for tests/evidence; explicitly accepted by orchestrator. No other test configuration change. |
| This report | Local verification, preserved-work boundary, and hosted blockers. |

Pre-existing `server.ts` PayPal appUrl wiring and `app.test.ts` sandbox CSP changes were inspected and preserved. Every other pre-existing dirty/untracked file was preserved; the entire working-tree diff is not the TASK-0005 candidate. No protected runtime, web source, schema, pricing, quote, usage, PayPal, or accepted evidence/history file was edited or absorbed.

## AC Results

| AC | Local result | Unexecuted proof |
| --- | --- | --- |
| AC-1 | HTTPS/local cookie tests, constant health, history/static/API/webhook isolation, base configuration and capability-isolation checks pass. Existing single-service Render root/build/start/health/Node declaration was inspected and unchanged. | Actual Render service/deploy identity, HTTPS responses, build/runtime configuration ownership, and the reversible contained-failure gate. |
| AC-2 | Untouched body/signature rejection, six-digit persistent/temporary routing, malformed tokens, generic capability/provider failures and unrelated-route availability pass. | Real Supabase Hook to Resend delivery, invalid-signature hosted probe, manual inbox confirmation, and one contained-failure probe. |
| AC-3 | Origin-cookie local regressions and unchanged full local browser suite pass; hosted harness is discoverable and typechecked. | Persistent email verification/refresh, real temporary origin and denial matrix, real five-minute expiry, and no-payment/no-allowance hosted proof. |
| AC-4 | 28 sanitizer tests pass, including complete manifest acceptance, duplicate/both-failure rejection, and sensitive/unsupported values. | Actual EVID-0006 manifest and explicit post-form screenshots, leakage scan, and independent manual inspection. No hosted evidence files have been created. |

Local preparation is green, not TASK-0005 acceptance. TC-0014/TC-0015 remain unproved on hosted infrastructure. EVID-0003, TC-0011, TC-0012, final EVID-0005, and TASK-0009 boundaries remain unchanged.

## RED And GREEN Commands

All project commands below ran from the demo directory unless stated otherwise. Private environment files were not printed or loaded into unit tests. Local runtime was Node v26.0.0; the unchanged Render contract requests Node 24.18.0, whose actual hosted runtime remains to be verified.

1. RED: `npm test -- server/src/config/env.test.ts server/src/app.test.ts server/src/routes/identity.test.ts` — attributable result: 3 failures / 52 passes. Secure cookie absent; capability/provider errors returned 401 instead of 503/500. Initial sandbox listener denial was environmental and was not counted as RED; rerun with permission to bind local test ports produced these actual assertion failures.
2. Cookie GREEN/hook RED: route/app run — cookie tests passed; the two hook status failures remained.
3. Hook/domain RED: `npm test -- server/src/domain/auth/service.test.ts server/src/routes/supabase-hook.test.ts server/src/app.test.ts server/src/config/env.test.ts` — 3 failures / 64 passes: same status mapping failures plus a signed numeric token incorrectly accepted.
4. Domain/route GREEN: focused six-file identity set — 76 passed after the minimal hook/type correction.
5. Sanitizer RED: `npm test -- tests/evidence/task0005-sanitize.test.ts` — fixed-record acceptance failed against the initial rejecting implementation; prohibited-value cases rejected. Final sanitizer run: 28 passed.
6. Final focused GREEN: `npm test -- server/src/config/env.test.ts server/src/app.test.ts server/src/domain/auth/service.test.ts server/src/routes/supabase-hook.test.ts server/src/routes/identity.test.ts shared/src/identity.test.ts tests/evidence/task0005-sanitize.test.ts` — 104 passed across 7 files.
7. `npm test` — 258 passed; 8 database-gated integration checks skipped across 3 files because no database URL was loaded. No database/provider execution proof is claimed.
8. `npm run typecheck` — exit 0.
9. `npm run lint` — exit 0.
10. `npm run build` — server compilation and Vite production build passed.
11. `npm audit --omit=dev --audit-level=high` — exit 0 after network-enabled retry. One moderate qs advisory remains; zero high-severity findings. No dependency modification was made.
12. `git diff --check` — exit 0.
13. `node node_modules/@playwright/test/cli.js test --config=playwright.task0005.config.ts --list` — exactly one hosted-chromium test discovered; no hosted run occurred.

### Preserved Existing Browser Regression

The unchanged existing spec writes EVID-0002 screenshots when run in its desktop project. To avoid overwriting protected evidence, its full demo runtime/source/config were copied to `/private/tmp/task0005-browser.LQxVSO`, excluding private environment files, existing tracking/artifacts, build outputs, and dependencies; installed dependencies were linked. The spec and assertions were not edited. Both original projects remained enabled.

Executed in that temporary copy:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node node_modules/@playwright/test/cli.js test --config=playwright.config.ts tests/e2e/identity-and-quote.spec.ts --grep-invert '@hosted'
```

Result: **10 passed** across chromium and mobile-chromium. The initial default launch failed because the expected Playwright browser revision was absent; the configured installed-Chrome override resolved that prerequisite. Only local fixture configuration/intercepted identity behavior was exercised. Color-environment warnings were emitted by the runner; there were no failing browser assertions. No real PSP launch occurred. Temporary screenshots are local regression output, not new accepted or hosted evidence.

### Protected Identity Check

Before the first task edit, executed the exact approved plan capture command to mode-0600 `/private/tmp/task0005-protected-baseline.json`. The approved plan hash was checked before capture. At local freeze reran the identical command with destination `/private/tmp/task0005-protected-candidate.json`, then:

```sh
cmp -s /private/tmp/task0005-protected-baseline.json /private/tmp/task0005-protected-candidate.json
```

Result: exit 0, exact protected path/class/mode/byte identity equality. These temporary identity manifests are not evidence and must not be staged.

## Hosted Readiness And Remaining Prerequisites

### Isolated Deployment Preparation — 2026-09-07

- Prepared `/private/tmp/task0005-render-candidate` on local branch `codex/task0005-render-candidate` from exact accepted semantic dependency HEAD. No private environment file was read or copied; installed dependencies were linked, not committed.
- Transferred only the existing TASK-0005 changes listed above. Excluded the pre-existing PayPal `appUrl` wiring from `server.ts`, the sandbox CSP additions from `app.test.ts`, and all unrelated dirty/untracked files. The deployment candidate therefore retains accepted HEAD versions of protected web, PSP, schema, quote and usage code rather than absorbing later local edits.
- Isolated verification: 103 focused tests pass; 256 full tests pass and 8 database-gated tests skip. Counts are lower than the earlier working-tree run because unrelated uncommitted tests are excluded. Typecheck, lint, production build, hosted-test discovery (one test), and diff whitespace checks pass. Unit tests required loopback-listener sandbox permission; the first EPERM run was environmental, not an attributable code defect.
- Production dependency audit exits 0 at the high-severity threshold; one unchanged moderate qs finding remains. This is local Node 26 proof only. The prior ten-browser-test result belongs to the earlier local preparation, not a newly executed isolated or hosted run.
- Value-free history checks found no non-example private environment-file paths and no candidate-ancestry matches for high-entropy Supabase secret/Resend key literals or private-key headers. These targeted checks are not a guarantee that all possible secret formats are absent.
- Preservation blocker: the earlier `/private/tmp/task0005-protected-baseline.json` is no longer present. Historical exact baseline equality cannot be rerun or claimed. No replacement baseline was manufactured; original working-tree protected files were not edited during this preparation. Publication disposition requires the orchestrator to resolve this evidence gap explicitly.
- No push, Render mutation, Supabase mutation, PR, merge, or hosted proof occurred. Task status remains blocked.

### Approved Durable Baseline Recovery — 2026-09-07

- Authority: `user:TASK-0005:2026-09-07:durable-baseline-recovery-approved`.
- The unavailable historical temporary baseline remains a recorded evidence gap; no earlier equality is inferred. The user approved starting a fresh current-tree integrity window, without changing any acceptance criterion or hosted/reviewer gate.
- Used the exact approved protected-manifest algorithm against the original working tree. The private durable baseline is `/Users/tengtao/Development/demo-projects/.git/task0005-integrity/2026-09-07-recovery-baseline.json`, containing 161 rows with mode 0600 inside a mode-0700 directory. It is outside the source tree and must never be staged.
- Baseline SHA-256: `ee031f956898e88b0753aac7dc6716677a1517ad5fc03550b308f3f77f654c35`.
- A fresh after-preparation manifest is compared byte-for-byte with this baseline before the isolated commit. The isolated task diff excludes protected paths relative to accepted HEAD; none of the original protected files is modified or absorbed. This establishes preservation only from this recovery point onward.
- No runtime code changed during recovery. The isolated local verification results above remain applicable. The deployment-source commit includes only the 16 task runtime/test/report files; the dependency symlink, private environments, integrity manifests and unrelated local changes are excluded. Hosted proof and two independent reviews remain pending.

Remote service/configuration preflight is orchestrator-owned; this executor performed no Render, Supabase, or Resend mutation and makes no assertion about their current key values or deployment status. The orchestrator must record a value-free before/after checklist for the existing keys: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY; APP_URL, DATABASE_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, DEMO_SESSION_SIGNING_SECRET, PORT; SUPABASE_SEND_EMAIL_HOOK_SECRET, RESEND_API_KEY, EMAIL_FROM_ADDRESS. Record only names, present/absent state, HTTPS/capability status and rollback owner; do not copy values. PayPal configuration remains untouched.

Before hosted execution: establish the exact one-service revision and base configuration; select the approved preferred absent-email gate or safely restorable fallback; confirm the same-origin Supabase hook and verified Resend sender; supply a user-controlled persistent mailbox and headed-browser manual OTP entry. A mailbox with pre-existing active Go allowance will not satisfy this harness's no-allowance result and requires orchestration review, not account cleanup.

The explicit capture run expects the *actual* completed reversible failure probe to supply exactly one sanitized row at `/private/tmp/task0005-hosted-failure.json`, using the sanitizer contract. No placeholder row has been generated. It then produces the bounded manifest only when every identity case passes. This temporary handoff contains no raw request, key, response, sender, or provider ID; its provenance still requires orchestrator verification. No raw traces, videos, automatic screenshots, console messages, request archives, or email screenshots are retained. Installed Playwright can otherwise capture failure-time accessibility snapshots, so the dedicated config sets its supported-in-this-installed-runtime suppression flag, and failures expose only generic text.

Independent specification and quality review must inspect the same eventual candidate and every real retained artifact. Both lanes and user acceptance remain required.

## Out-Of-Scope Observations And Rollback

- The moderate qs production dependency finding is recorded for a separate authorized dependency task. No automatic audit fix was run.
- The local test runtime differs from the declared hosted Node version; local results do not prove the Render runtime.
- No hosted manifest, EVID-0006 capture, successful delivery, provider claim, or full-slice claim has been manufactured.
- Rollback removes/reverts only the TASK-0005-added cookie/hook hunks, tests/config documentation, dedicated harness/sanitizer, and this report. Preserve the pre-existing server/app-test hunks and all unrelated work. No remote rollback is needed for this executor, because no remote mutation occurred.

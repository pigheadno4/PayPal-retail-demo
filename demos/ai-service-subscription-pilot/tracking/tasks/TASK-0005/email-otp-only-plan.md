# TASK-0005 Email-OTP-Only Implementation Plan

> For agentic workers: use the project executor role and test-first implementation; apply `superpowers:executing-plans` within that role. Do not start another delegation pipeline. Role65 plans, role66 critiques, role67 executes only after detailed-plan approval, and roles68/69 independently review the same candidate.

- Status: `ready_for_critique`; not approved for implementation.
- Date: 2026-09-19. Planning round5; authorized cap69. This is one task with five acceptance criteria, not five new tasks.
- Goal: remove temporary-account entry and current acceptance execution while retaining persistent email OTP, existing backend protections/data, and truthful historical evidence.
- Architecture: reuse the Vite React identity form and Express/Supabase persistent identity contract. Narrow only customer route wiring, browser acceptance selection and explicit evidence validation scope. No new runtime service, schema or endpoint.
- Tech stack: existing React/TypeScript, Vitest and Playwright; no dependencies added.
- Spec: `REQUIREMENTS.md` approved 2026-09-19 amendment, REQ-0034 and REQ-0038; approval `user:TASK-0005:2026-09-19:email-otp-only-approved`.

## Authority and boundaries

Owning slice/task: `slices/SLICE-001.md`, `IMPLEMENTATION_TASKS.md` TASK-0005. Design: DESIGN-0157/DESIGN-0160 in `DESIGN.md`, `design-system/pages/slice-001-go-paypal-wallet.md`, and approved `mockups/slice-001-go-paypal-wallet-e2e-state-board.html`. Architecture: `architecture/ADR-0001-vite-express-shared-api.md`. Tests: TC-0002/0004 persistent interaction/quote, TC-0014 persistent hosted identity, TC-0003/0015 temporary portions deferred. Evidence: EVID-0002 historical interaction; EVID-0006 partial identity; EVID-0003/0005 and TASK-0009 payment/full-slice gates unchanged.

The requirements amendment explicitly supersedes old temporary-route acceptance obligations and narrower TASK-0005 plan prohibitions on editing these named web files. The older `tracking/tasks/TASK-0005/plan.md` and role reports remain historical, not executable authority for temporary retests or provider reconfiguration. Amend current derived views by dated scope notes, not by rewriting history. The original state-board HTML remains approved historical design evidence; only its persistent-email form/layout is reused now.

Frontend route: **reuse**. Removing one alternative and its dependent control introduces no new visual state; retain C3-G light/dark surfaces, heading, email/code labels, busy/error semantics, spacing, fonts and 44px targets. No CSS redesign, UI retrieval or replacement mockup is needed. If removing controls cannot fit those patterns, stop rather than invent design.

Payment route: **evidence_boundary_only**. No PSP API, customer mapping, pricing, consent, quote freshness, funds, vault, allowance or entitlement behavior changes. Keep persistent before/after allowance comparison and no-payment guards in the hosted harness. No additional payment capability claim is made; inherited knowledge/evidence boundaries remain in SLICE-001 and EVID-0003. Local fixtures are not Supabase delivery, hosted identity, payment or production proof.

Non-goals: deleting accounts/tables/history; disabling retained temporary backend endpoints or security tests; changing request schemas, provider configuration, email delivery or Supabase clients; password/quick login; expiry fixes; diagnostic instrumentation expansion; deployment, push, PR, live OTP, live DB queries or fault injection. No investigation of unresolved temporary expiry continues.

## Acceptance criteria (five)

| AC | Required result | Verification and evidence |
| --- | --- | --- |
| 1 | Homepage and checkout offer only real-email OTP; no temporary selector, alias promise or reveal-code action. Existing email/code/busy/error states remain usable. | Home/checkout Vitest assertions plus local browser request/verify/failure coverage; executor report records desktop and exact390px light/dark visual review, focus/labels/targets and absence of temporary controls. |
| 2 | Persistent request uses `{intentId, identityRoute: "persistent", email}`, verifies email OTP, resumes the same intent and preserves refresh and stale-quote replacement; no temporary endpoint, payment, activation or usage request occurs during identity. | TC-0002/0004 fixture interception asserts payload/intent/review and forbidden requests. Existing pricing/review assertions remain. Evidence is explicitly local mocked interaction, not hosted login or allowance DB proof. |
| 3 | Current hosted acceptance runs only persistent identity and retains readiness/isolation/inbox/resume/refresh/non-mutation/privacy guards; temporary UI scenarios are deferred, never passed. | Hosted test discovery without running it; local structural assertions; TC-0003 browser body remains skipped with amendment reason. Retained backend auth/identity/hook tests pass without live providers. Report lists hosted checks not run. |
| 4 | Future email-only capture has an explicit validation scope; existing legacy full manifests retain their original strict validation and immutable artifacts. | Sanitizer tests: legacy19 records still required by default; explicit persistent scope accepts exactly11 required records, rejects temporary/extra/duplicate/missing records and wrong failure count; original privacy/blocked-claim tests stay green. No hosted manifest is generated in this task. |
| 5 | Current docs accurately describe email-only support and temporary acceptance deferral while keeping unresolved failure history and separate persistent/payment evidence gates; the patch is attributable to one reviewed candidate. | Exact-file diff/doc audit, protected-path comparison and spec/quality review of the same candidate commit. Local evidence is recorded under the new execution report; historical EVID-0002/0003/0004/0006 captures and reports are unchanged. |

## Exact file boundary

All paths below are relative to `demos/ai-service-subscription-pilot/`.

Runtime edits, and only these:

- `web/src/components/checkout/identity-panel.tsx`: remove `IdentityRoute`, route/onRoute, temporaryEmail/onRevealDemoOtp props and temporary controls; keep required email form, code form, safe status/error/busy UI. Keep `Use my email` as plain supporting text if needed; do not retain a one-option radio selector.
- `web/src/routes/checkout.tsx`: remove route-selection state/callback, temporary email and `revealDemoOtp`; always request persistent OTP. Preserve token restoration, verifyEmailOtp, same-intent resume and quote replacement unchanged.
- `web/src/routes/home.tsx`: replace `Persistent or 24-hour demo identity` with `Sign in with an email verification code`.

Test/harness edits:

- `web/src/routes/home.test.tsx`, `web/src/routes/checkout.test.tsx`.
- `tests/e2e/identity-and-quote.spec.ts`: strengthen persistent fixtures; defer temporary TC-0003 with static `test.skip` and amendment explanation; remove no historical case body. Redirect this suite's screenshots to a temporary local-review directory, not existing TASK-0007/EVID-0002 filenames. Retain persistent/stale/theme/font checks.
- `tests/e2e/hosted-identity.spec.ts`: remove temporary execution and now-unused temporary helper functions/imports; rename title to persistent TC-0014 scope. Historical source remains in existing version history/reports; do not modify old artifacts. Add `/api/v1/demo-sessions` to forbidden outgoing paths for this persistent-only harness; do not block checkout-intent cookie creation.
- `tests/evidence/task0005-sanitize.ts`, `tests/evidence/task0005-sanitize.test.ts`: explicit scope described below; retain legacy rows and default semantics.
- Create `tests/evidence/task0005-email-only.test.ts`: local source/AST checks that hosted title/scope are persistent-only, no temporary execution/helper remains, allowance/inbox/refresh guards remain, and temporary browser test is explicitly skipped. These complement browser interaction, not substitute for it.

Derived-document edits, each restricted to current-scope reconciliation and links:

- `DEMO.md`, `DESIGN.md`, `design-system/pages/slice-001-go-paypal-wallet.md`, `IMPLEMENTATION_PLAN.md`, `IMPLEMENTATION_TASKS.md`, `PLAN.md`, `ROADMAP.md`, `slices/SLICE-001.md`, `tracking/test-cases.md`, `tracking/evidence.md`, `tracking/todos.md`, `tracking/progress.md`.
- Add a dated current-scope override where historical text remains: email-only; TC-0003 current UI scenario deferred; TC-0015 temporary acceptance deferred, not passed; move its persistent resume/refresh obligations explicitly into TC-0014; retained backend security remains required. Preserve identifiers and old execution results. Distinguish temporary account identity from unrelated temporary-recovery subscription concepts.
- Create `tracking/tasks/TASK-0005/email-otp-only-execution.md` with red/green, command results, local visual inspection, protected-path receipt, precise candidate ID and unproved gates. Optional new local screenshots only under `tracking/tasks/TASK-0005/email-otp-only-local/` after inspecting fixture-only content; do not relabel them hosted evidence.

No edits to `REQUIREMENTS.md`, mockup HTML, workflow/loop controls, old task reports or accepted evidence artifacts. Preserve `server/**`, `shared/**`, `supabase/**`, `src/**`, browser API/Supabase clients, package/config files, payment/quote/usage components and remaining tests. Retain unused public client temporary methods: deleting them is unnecessary cleanup. Coordinator alone owns status/budget controls and approval records.

## Interfaces and minimal implementation

IdentityPanel receives only `busy`, `requested?`, `error?`, `onRequestOtp(email)`, `onVerifyOtp(otp)`. Identity checkout state keeps phase/busy/requested/email/error; view keeps request/verify/replace callbacks. Persistent request implementation retains existing error text and state transition:

```ts
await demoApi.requestOtp({ intentId, identityRoute: "persistent", email });
setState({ phase: "identity", busy: false, requested: true, email });
```

Evidence API retains the existing record schema and case allowlist. Extend only the existing manifest validator:

```ts
export function validateTask0005Manifest(
  input: unknown,
  scope: "legacy_full" | "persistent_email" = "legacy_full",
): Task0005Record[]
```

Legacy scope retains exactly today's required labels and one contained-failure row (19 records). Persistent scope requires exactly `health`, `history_route`, `api_isolation`, `webhook_isolation`, `legacy_api_isolation`, `invalid_hook`, `persistent_inbox`, `persistent_resume`, `persistent_refresh`, `authentication_only`, plus exactly one of `email_capability_absent`/`email_provider_unavailable` (11 records). Reject unknown scope, extras including temporary labels, duplicates and missing labels; run every row through the unchanged strict sanitizer. Do not silently default legacy files to reduced scope.

The hosted capture call explicitly passes `"persistent_email"` and writes `tracking/evidence/artifacts/EVID-0006/manifest-email-otp-only.json`; any persistent screenshot uses `persistent-review-email-otp-only.png`. Those are future capture paths, not files to produce now. Existing `manifest.json` remains validated with legacy default; add a separate conditional validation for the new filename with explicit scope. Document this filename/scope mapping in `tracking/evidence.md`. No envelope/schema migration or second validation framework.

## Ordered test-first steps

- [ ] 1. Re-read approved plan/critic/user gate and confirm coordinator controls reflect cap69. Capture `git status --short`, index state and content hashes for intended files plus protected directories/old evidence before any edit. If pre-existing changes overlap, preserve a mode0600 temporary baseline and distinguish task hunks; do not assume the entire file is authorized staging content.
- [ ] 2. Update home/checkout tests first. Assert email input and Send remain; temporary labels/reveal/radio controls are absent in idle/requested/busy/error states. Add exact persistent-scope validator fixtures/rejections and hosted structural checks. Run focused Vitest; record expected red failures caused by old UI/validator/harness, not incidental infrastructure errors.

```ts
expect(html).toContain("Email address");
expect(html).not.toMatch(/24-hour demo address|Retrieve this browser|identity-route/);
expect(validateTask0005Manifest(persistentRows, "persistent_email")).toHaveLength(11);
expect(() => validateTask0005Manifest(persistentRows)).toThrow("invalid_task0005_evidence");
```

- [ ] 3. Make the three runtime changes and validator/harness changes above. Update only existing view call sites in checkout tests. Keep strict failure/blocked-claim handling; do not manufacture a contained-failure row or mark missing hosted proof passed. Run focused tests green.
- [ ] 4. Before browser execution, add forbidden-request collection for temporary endpoints, external network and payment/activation/usage paths, keeping fixture verification intercepted. Assert `identityRoute: "persistent"`, same intent, review amounts, unchecked recurring consent and no auto payment; cover request/verify error text and disabled busy control. Use controlled delayed mock responses for busy states, not live requests. Mark TC-0003 skipped before running. Redirect screenshot output away from historical evidence.
- [ ] 5. Run local-only browser regression and visually inspect email entry, code request, safe error and review at desktop and390px in light/dark themes. Verify keyboard order/focus, labels, visible disabled/busy state, no horizontal overflow and44px targets. Use fake `.test` fixture email/code only; do not enter a real mailbox or provider login. A rendering pass alone does not satisfy interaction proof.
- [ ] 6. Reconcile the named derived documents, append execution evidence, run full local checks and protected-path comparison, then freeze the attributable candidate for both independent reviews. Stop after that handoff; no extra diagnostics or cleanup.

## Verification commands and evidence

From the demo directory, without loading `.env.local` into the test process:

```sh
npm test -- web/src/routes/home.test.tsx web/src/routes/checkout.test.tsx tests/evidence/task0005-sanitize.test.ts tests/evidence/task0005-email-only.test.ts tests/evidence/task0005-allowance-baseline.test.ts
npm test -- server/src/domain/auth/service.test.ts server/src/domain/auth/otp-timing.test.ts server/src/routes/identity.test.ts server/src/routes/supabase-hook.test.ts server/src/middleware/auth.test.ts
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

Any environment-gated DB test must remain skipped; never inject real DB credentials to make local counts green. Do not run network audit, Supabase CLI, hosted probes or production builds with deployment side effects.

Local Playwright command, from a clean process environment with no inherited credentials or remote base URL (preserve needed browser executable path only after read-only discovery):

```sh
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/Users/tengtao VITE_SUPABASE_URL=https://task0007.supabase.test VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_e2e_placeholder VITE_PAYPAL_CLIENT_ID=paypal-client-id-e2e-placeholder /opt/homebrew/bin/node node_modules/@playwright/test/cli.js test --config=playwright.config.ts tests/e2e/identity-and-quote.spec.ts --grep-invert '@hosted' --output=/private/tmp/task0005-email-only-results
```

Existing Playwright config supplies local fake server configuration. Fake Vite values override `.env.local` Vite values; do not print that file. Check no remote base URL, no reuse of an unrelated existing server and no nonlocal network escapes. If port3000 is occupied by an unrelated process, stop and report; do not kill it or silently use it. If Chrome override is required, add only the known local executable path. Browser/sandbox permission remains a separate tool approval, not provider authorization.

Discover the hosted harness without executing it:

```sh
/opt/homebrew/bin/node node_modules/@playwright/test/cli.js test --config=playwright.task0005.config.ts tests/e2e/hosted-identity.spec.ts --list
```

Expected: current hosted list has persistent-only identity; no temporary acceptance execution. Local browser reports show TC-0003 skipped/deferred rather than passed. Existing backend temporary security regressions remain active and green. Historical artifact hashes remain equal. Preserve actual failures/skips in the report; green local tests do not close hosted EVID-0006 or TASK-0005 overall.

## Same-candidate review and dirty-workspace protection

No `git add .`, `git add -A`, bulk directory staging, reset, checkout, clean or wholesale snapshot of the dirty tree. At executor start record pre-existing index entries and per-file baseline. Present only this task's hunks plus exact new files to the coordinator for explicit staging approval; existing unrelated hunks in an allowlisted file remain unstaged. If hunk separation cannot reproduce a runnable candidate, stop and report the dependency instead of absorbing unrelated work.

Both reviewers must receive the same candidate commit and exact file/hunk scope. The coordinator obtains staging/commit authority and owns candidate creation; this plan does not grant it. Reproduce tests on that candidate in an isolated checkout so working-tree-only/untracked dependencies cannot masquerade as candidate proof. If candidate construction would require additional previously unreviewed files, disclose them and await explicit approval. Do not substitute mutable working-tree hashes for the mandated same-commit review. If that gate cannot be met within authorized roles, retain a blocked handoff rather than declaring acceptance.

## Risks, dependencies, rollback and open decisions

Dependencies: role66 critique, detailed user plan approval, coordinator control reconciliation, installed local test/browser dependencies, and exact-candidate staging approval. All are gates, not implicit completion claims.

Main risks: accidental disabling of backend security while removing UI; old acceptance still calling temporary endpoints; reduced evidence validator reclassifying historical proof; screenshot overwrite; mock login mistaken for hosted success; dirty working tree contaminating the candidate. The bounded files, explicit scope/default, skipped-case reason, separate output paths, protected receipts and same-commit review address these without new runtime machinery.

Rollback: reverse only this task's approved hunks/new local test/docs artifacts against the captured baseline; preserve every pre-existing change and all backend/account data/history. No provider/account/DB rollback exists because none is changed.

Open product/design decision: none. This plan is ready for independent critique, not execution. Temporary expiry remains unresolved and deferred by approved scope, not corrected. Persistent hosted evidence and the separate payment-to-workspace journey retain their own later approval and evidence gates.

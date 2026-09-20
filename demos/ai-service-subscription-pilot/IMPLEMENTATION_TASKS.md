# AI Service Subscription Pilot Implementation Tasks

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


This is a derived execution view. It cannot create, narrow, defer, remove, or verify a requirement.

Task IDs use `TASK-0001` through `TASK-9999`, are permanent, and are never reused.

## Active Slice

- Slice: SLICE-001
- Approved plan: `IMPLEMENTATION_PLAN.md`
- Charter: `slices/SLICE-001.md`

## Task Register

| Task | Slice | Requirements | Design decisions | Tests | Evidence | Status |
| --- | --- | --- | --- | --- | --- | --- |
| TASK-0001 | SLICE-001 | REQ-0034, REQ-0036, REQ-0037, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0001 | EVID-0001 | reviewed |
| TASK-0002 | SLICE-001 | REQ-0034, REQ-0035, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0002, TC-0003, TC-0004 | EVID-0002 | reviewed |
| TASK-0003 | SLICE-001 | REQ-0036, REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0005, TC-0006, TC-0007 | EVID-0003 | blocked |
| TASK-0004 | SLICE-001 | REQ-0037, REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0008, TC-0009, TC-0010 | EVID-0004 | reviewed |
| TASK-0005 | SLICE-001 | REQ-0034, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0014, TC-0015 | EVID-0006 | planned |
| TASK-0006 | SLICE-001 | REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0013 | EVID-0001 | reviewed |
| TASK-0007 | SLICE-001 | REQ-0034, REQ-0035, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0002, TC-0003, TC-0004 | EVID-0002 | reviewed |
| TASK-0008 | SLICE-001 | REQ-0036, REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0005, TC-0006, TC-0007 | EVID-0003 | reviewed |
| TASK-0009 | SLICE-001 | REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0011, TC-0012 | EVID-0005 | planned |

`Task` is the only register key. Execution details and checkbox steps live in `IMPLEMENTATION_PLAN.md`.

### TASK-0001 — Runtime and server-owned persistence foundation

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0036, REQ-0037, REQ-0038
- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `.node-version`, `package.json`, `package-lock.json`, Next.js/TypeScript/test configuration, `.env.example`, `src/server/config/*`, `src/server/db/*`, `src/lib/supabase/*`, `src/proxy.ts`, `supabase/config.toml`, CLI-generated `supabase/migrations/*_slice001_core.sql`, `supabase/tests/slice001_core_test.sql`
- Interfaces: produces `RuntimeEnv`, Supabase SSR clients, verified request identity, server-only SQL client, and the normalized SLICE-001 schema
- Test cases: TC-0001
- Evidence: EVID-0001
- Non-goals: customer flow, PSP calls, generic repository framework, background jobs, and future-slice tables
- Model/effort: primary Codex implementation agent, strongest suitable, high; independent engineering review required
- Status: reviewed

### TASK-0002 — Pending intent, Supabase identity, and exact quote

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0035, REQ-0038
- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `src/contracts/identity.ts`, `src/contracts/checkout.ts`, `src/server/auth/*`, `src/server/checkout/*`, `src/server/quote/*`, identity/quote Route Handlers, minimal `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/checkout/[intentId]/page.tsx`, checkout components, `render.yaml`, and focused tests
- Interfaces: consumes Task 1 runtime/schema; produces signed anonymous intent, verified application identity, session-bound `.test` OTP retrieval, and immutable `CheckoutReview`
- Test cases: TC-0002, TC-0003, TC-0004
- Evidence: EVID-0002
- Non-goals: password settings, account deletion or suspension, payment submission, production email deliverability, and arbitrary tax locations
- Model/effort: primary Codex implementation agent, strongest suitable, high; Supabase and design review required
- Status: reviewed

### TASK-0003 — PayPal Wallet funding and reusable-credential reconciliation

- Slice: SLICE-001
- Requirements: REQ-0036, REQ-0038
- Design decisions: DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `src/contracts/paypal.ts`, `src/server/paypal/*`, PayPal Route Handlers, provider-owned checkout components, PayPal fixtures and focused tests
- Interfaces: consumes verified user/current quote; produces PayPal user ID token, exact initial order, verified capture funding, independently verified vault readiness, one exactly-once funded-arrangement transition for TASK-0004, and sanitized payment-to-activation status; it does not create an allowance window
- Test cases: TC-0005, TC-0006, TC-0007
- Evidence: EVID-0003
- Non-goals: PayPal Subscriptions, card vaulting, later renewal charge, refunds, production eligibility, and generic multi-PSP adapters
- Model/effort: primary Codex implementation agent, strongest suitable payment model, high; independent payment sub-review required
- Status: blocked

### TASK-0004 — Atomic allowance and deterministic Generate Answer

- Slice: SLICE-001
- Requirements: REQ-0037, REQ-0038
- Design decisions: DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `shared/src/usage.ts`, `server/src/domain/usage/*`, `server/src/routes/usage.ts`, narrow `server/src/server.ts` composition, `web/src/routes/workspace.tsx`, `web/src/components/workspace/*`, narrow checkout handoff/API/style updates, `tests/e2e/generate-answer.spec.ts`, and focused tests
- Interfaces: consumes verified funded arrangement; creates or reuses one 100-unit window, then produces atomic 10-unit reserve/commit/release, deterministic simulated output, and persisted 90-unit summary
- Test cases: TC-0008, TC-0009, TC-0010
- Evidence: EVID-0004
- Non-goals: real AI provider, other actions, purchased credits, low-balance warnings, and tier logic
- Model/effort: primary Codex implementation agent, strongest suitable, high; concurrency and design review required
- Status: reviewed

### TASK-0005 — Hosted identity and sanitized identity evidence

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0038
- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: existing `render.yaml`, `.env.example`, capability-scoped server configuration/composition, existing Supabase Send Email Hook and identity routes/domain, focused hosted identity tests, sanitized evidence helpers, `tracking/evidence.md`, and `tracking/progress.md`; exact executor files remain planner-owned
- Interfaces: consumes the accepted Vite/Express, Supabase identity, pending-intent, and `.test` session contracts; produces one hosted HTTPS identity proof and sanitized partial identity evidence without changing identity semantics
- Test cases: TC-0014, TC-0015
- Evidence: EVID-0006
- Split approval: `user:TASK-0005:2026-09-01:task0005-task0009-split-approved`
- Approved hosted-identity boundary:
  1. Deploy the existing Vite/Express service to Render with its existing HTTPS API and webhook boundaries.
  2. Configure the existing Supabase Send Email Hook and Resend path so persistent real-email users receive a six-digit OTP rather than the default Magic Link email.
  3. Prove persistent-email OTP resume and originating-browser `.test` OTP retrieval against the hosted service without exposing OTPs, cookies, tokens, secrets, or full identifiers in evidence.
  4. Record sanitized success and contained-failure evidence while retaining all unexecuted provider and hosted gates as blocked.
- Non-goals: reopening TASK-0007, TASK-0008, or TASK-0004; Magic Link callback/resume; identity redesign; checkout, PayPal, allowance, or schema changes; new visual direction; hosted PayPal proof; production email deliverability; public launch; mobile work; additional provider lanes; and Integration Lab
- Model/effort: primary Codex implementation agent, strongest suitable, high; all independent review lanes required
- Status: planned

### TASK-0006 — Vite and Express runtime foundation reconciliation

- Slice: SLICE-001
- Requirements: REQ-0038
- Design decisions: DESIGN-0158, DESIGN-0159, DESIGN-0160
- Architecture decision: `architecture/ADR-0001-vite-express-shared-api.md`
- Files: root runtime/build/test configuration, `web/` Vite shell, `server/` Express entry/config/static delivery, minimal `shared/` contract boundary, `render.yaml`, and focused foundation tests
- Interfaces: produces the single Render Node service, `/api/v1` and webhook mount boundaries, safe health response, Vite development proxy, history fallback, base configuration, and capability-specific readiness contract; it does not migrate customer identity, quote, checkout, or PayPal behavior
- Test cases: TC-0013
- Historical boundary: the accepted database/schema proof from the earlier persistence-foundation task remains unchanged
- Evidence: replacement runtime portion of EVID-0001; accepted database/schema evidence remains retained
- Non-goals: schema changes, feature-route migration, customer-flow redesign, PSP behavior, hosted-provider proof, mobile clients, workspaces, and microservices
- Model/effort: planner and executor use the strongest suitable implementation model at high effort; independent spec and quality review required
- Status: reviewed

### TASK-0007 — Identity, temporary session, exact quote, and Vite parity

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0035, REQ-0038
- Design decisions: DESIGN-0157 and DESIGN-0160 govern executable identity/quote UI; DESIGN-0158 and DESIGN-0159 are inherited REQ-0038 boundaries and do not authorize payment or activation work
- Architecture decision: `architecture/ADR-0001-vite-express-shared-api.md`
- Files: migrate approved identity and checkout-review client-safe contracts to `shared/`, identity/checkout/quote domain code to `server/`, thin bearer-authenticated `/api/v1` Express adapters and raw Supabase Hook handling, Vite React identity/quote surfaces, directly affected unit/integration/browser evidence, and the user-approved additive OTP-issuance lifetime migration
- Interfaces: consumes TASK-0006 runtime boundaries; produces bearer-authenticated client-neutral identity and exact-quote APIs while preserving the separate signed HttpOnly `.test` originating-browser cookie
- Test cases: TC-0002, TC-0003, TC-0004
- Evidence: replacement runtime/browser portion of EVID-0002; hosted Supabase and email gates remain blocked until exercised
- Non-goals: PayPal or another PSP call, funding or vault readiness, redesign, allowance or activation, generic abstractions, mobile clients, legacy `/api/*` compatibility, or schema beyond the user-approved OTP-issuance lifetime correction
- Model/effort: strongest suitable implementation model at high effort; Supabase, spec, and quality review required
- Status: reviewed

### TASK-0008 — PayPal funding, vault reconciliation, and Vite parity

- Slice: SLICE-001
- Requirements: REQ-0036, REQ-0038
- Design decisions: DESIGN-0158 and DESIGN-0160 govern executable PayPal/provider UI; DESIGN-0159 is an inherited REQ-0038 handoff boundary and does not authorize activation work
- Architecture decision: `architecture/ADR-0001-vite-express-shared-api.md`
- Dependency: accepted TASK-0007 identity ownership and exact current quote output
- Files: migrate approved PayPal client-safe contracts to `shared/`, retained PayPal domain code to `server/`, thin bearer-authenticated `/api/v1` order/capture adapters and raw PayPal webhook handling, Vite React provider states, and directly affected unit/integration/browser evidence
- Interfaces: consumes TASK-0007 account ownership and quote; produces verified funding and reusable-readiness handoff while preserving operation-specific idempotency and exact delayed-vault correlation
- Test cases: TC-0005, TC-0006, TC-0007
- Evidence: replacement runtime/browser portion of EVID-0003; hosted and PayPal sandbox gates remain blocked until exercised
- Non-goals: TASK-0004 allowance or activation, renewal charging, another payment lane, redesign, generic PSP abstraction, mobile clients, legacy `/api/*` compatibility, or new schema
- Model/effort: strongest suitable implementation model at high effort; payment-domain, spec, and quality review required
- Status: reviewed

### TASK-0009 — Complete responsive and hosted slice closure

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038
- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Split approval: `user:TASK-0005:2026-09-01:task0005-task0009-split-approved`
- Dependency: accepted TASK-0007, TASK-0008, and TASK-0004 plus accepted TASK-0005 hosted-identity evidence
- Files: complete-slice visual/accessibility tests, hosted customer-story and provider evidence tests, sanitized final evidence aggregation, and only the smallest directly required existing UI/configuration corrections; exact executor files require separate planning
- Interfaces: consumes accepted identity, quote, payment, allowance, and hosted-identity outputs; produces TC-0011 responsive/accessibility closure, the non-identity and provider portions of TC-0012, and final EVID-0005 aggregation
- Test cases: TC-0011, TC-0012
- Evidence: EVID-0005
- Non-goals: changing accepted identity, quote, payment, vault, allowance, or AI semantics; subsequent renewal charging; new provider lanes; product redesign; production-readiness claims; public launch; mobile apps; and Integration Lab
- Planning rule: requires a separate user start-planning gate and must split again if one executor-ready plan cannot remain coherent with at most five acceptance criteria
- Model/effort: strongest suitable implementation/payment model at high effort; specification, quality, design, and payment evidence review required
- Status: planned

# AI Service Subscription Pilot Implementation Tasks

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
| TASK-0002 | SLICE-001 | REQ-0034, REQ-0035, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0002, TC-0003, TC-0004 | EVID-0002 | planned |
| TASK-0003 | SLICE-001 | REQ-0036, REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0005, TC-0006, TC-0007 | EVID-0003 | planned |
| TASK-0004 | SLICE-001 | REQ-0037, REQ-0038 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0008, TC-0009, TC-0010 | EVID-0004 | planned |
| TASK-0005 | SLICE-001 | REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038 | DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160 | TC-0011, TC-0012 | EVID-0005 | planned |

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
- Files: `src/contracts/identity.ts`, `src/contracts/checkout.ts`, `src/server/auth/*`, `src/server/checkout/*`, `src/server/quote/*`, identity/quote Route Handlers, `src/app/page.tsx`, `src/app/checkout/[intentId]/page.tsx`, checkout components and focused tests
- Interfaces: consumes Task 1 runtime/schema; produces signed anonymous intent, verified application identity, session-bound `.test` OTP retrieval, and immutable `CheckoutReview`
- Test cases: TC-0002, TC-0003, TC-0004
- Evidence: EVID-0002
- Non-goals: password settings, account deletion, payment submission, production email deliverability, and arbitrary tax locations
- Model/effort: primary Codex implementation agent, strongest suitable, high; Supabase and design review required
- Status: planned

### TASK-0003 — PayPal Wallet funding and reusable-credential reconciliation

- Slice: SLICE-001
- Requirements: REQ-0036, REQ-0038
- Design decisions: DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `src/contracts/paypal.ts`, `src/server/paypal/*`, PayPal Route Handlers, provider-owned checkout components, PayPal fixtures and focused tests
- Interfaces: consumes verified user/current quote; produces PayPal user ID token, exact initial order, verified capture funding, independently verified vault readiness, and sanitized status
- Test cases: TC-0005, TC-0006, TC-0007
- Evidence: EVID-0003
- Non-goals: PayPal Subscriptions, card vaulting, later renewal charge, refunds, production eligibility, and generic multi-PSP adapters
- Model/effort: primary Codex implementation agent, strongest suitable payment model, high; independent payment sub-review required
- Status: planned

### TASK-0004 — Atomic allowance and deterministic Generate Answer

- Slice: SLICE-001
- Requirements: REQ-0037, REQ-0038
- Design decisions: DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: `src/contracts/usage.ts`, `src/server/entitlement/*`, `src/server/usage/*`, account-summary and Generate Answer Route Handlers, workspace page/components and focused tests
- Interfaces: consumes verified funded arrangement; produces one 100-unit window, atomic 10-unit reserve/commit/release, deterministic simulated output, and persisted 90-unit summary
- Test cases: TC-0008, TC-0009, TC-0010
- Evidence: EVID-0004
- Non-goals: real AI provider, other actions, purchased credits, low-balance warnings, and tier logic
- Model/effort: primary Codex implementation agent, strongest suitable, high; concurrency and design review required
- Status: planned

### TASK-0005 — Responsive customer story, failures, hosted proof, and review

- Slice: SLICE-001
- Requirements: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038
- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Files: app shell/theme/components, `tests/e2e/*`, `tests/evidence/*`, `render.yaml`, `.env.example`, `tracking/evidence.md`, `tracking/progress.md`
- Interfaces: consumes all prior APIs; produces complete laptop/mobile light/dark flow, contained failures, hosted HTTPS proof, and sanitized merchant evidence
- Test cases: TC-0011, TC-0012
- Evidence: EVID-0005
- Non-goals: public launch, production readiness, load program, additional provider lanes, mobile apps, and Integration Lab
- Model/effort: primary Codex implementation agent, strongest suitable, high; all independent review lanes required
- Status: planned

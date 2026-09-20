# Test Cases

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


Test IDs use `TC-0001` through `TC-9999`, are permanent, and are never reused.

## Test Case Register

| Test ID | Requirements | Slice | Evidence | Status |
| --- | --- | --- | --- | --- |
| TC-0001 | REQ-0034, REQ-0036, REQ-0037, REQ-0038 | SLICE-001 | EVID-0001 | passing |
| TC-0002 | REQ-0034, REQ-0038 | SLICE-001 | EVID-0002 | planned |
| TC-0003 | REQ-0034, REQ-0038 | SLICE-001 | EVID-0002 | planned |
| TC-0004 | REQ-0035, REQ-0038 | SLICE-001 | EVID-0002 | planned |
| TC-0005 | REQ-0036, REQ-0038 | SLICE-001 | EVID-0003 | planned |
| TC-0006 | REQ-0036, REQ-0038 | SLICE-001 | EVID-0003 | planned |
| TC-0007 | REQ-0036, REQ-0038 | SLICE-001 | EVID-0003 | planned |
| TC-0008 | REQ-0037, REQ-0038 | SLICE-001 | EVID-0004 | planned |
| TC-0009 | REQ-0037, REQ-0038 | SLICE-001 | EVID-0004 | planned |
| TC-0010 | REQ-0037, REQ-0038 | SLICE-001 | EVID-0004 | planned |
| TC-0011 | REQ-0038 | SLICE-001 | EVID-0005 | planned |
| TC-0012 | REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038 | SLICE-001 | EVID-0005 | planned |
| TC-0013 | REQ-0038 | SLICE-001 | EVID-0001 | planned |
| TC-0014 | REQ-0034, REQ-0038 | SLICE-001 | EVID-0006 | planned |
| TC-0015 | REQ-0034, REQ-0038 | SLICE-001 | EVID-0006 | planned |

### TC-0001 — Server-owned schema and privilege boundary

- Requirements: REQ-0034, REQ-0036, REQ-0037, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0001
- Layer: integration, security
- Preconditions: the dedicated linked Supabase demo project has the CLI-generated SLICE-001 migration applied and the anon/authenticated database roles are available
- Action: run the pgTAP contract through a transaction-bound linked remote SQL query, inspect relations, constraints, indexes and grants, and exercise rejection cases against `app_private`
- Expected: all normalized and raw-evidence tables exist; constraints/indexes pass; browser roles have no schema access; only server code can mutate payment, allowance, OTP, or entitlement state
- Negative case: a public or authenticated Data API request cannot read or mutate private state
- Status: passing

### TC-0002 — Persistent email restores one pending intent

- Requirements: REQ-0034, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0002
- Layer: integration, interaction, failure
- Preconditions: a signed-out browser has one server-owned Go Monthly intent and a valid real email inbox
- Action: request and verify the email OTP, then open the restored checkout
- Expected: the same intent belongs to one Supabase user and resumes at a newly calculated review without creating a payment operation
- Negative case: invalid/expired OTP preserves safe intent state and creates no account-owned checkout transition or payment
- Status: planned

### TC-0003 — Temporary OTP is originating-session-only

- Requirements: REQ-0034, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0002
- Layer: security, hosted, failure
- Preconditions: browser A created a high-entropy `.test` session; the verified Supabase Hook captured its OTP with five-minute expiry
- Action: browser A and unrelated browser B request the captured OTP, then browser A verifies it
- Expected: only browser A receives the code, Supabase issues the session, `demo_identity` is trusted server state, and the captured OTP is deleted
- Negative case: browser B, unknown alias, expired session, and invalid hook signature receive non-enumerating denial and store no usable OTP
- Status: planned

### TC-0004 — Exact immutable quote and stale replacement

- Requirements: REQ-0035, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0002
- Layer: unit, integration, interaction, hosted, failure
- Preconditions: verified user owns a Go Monthly intent and the Seattle Q3 2026 fixture is effective
- Action: create and view the quote, then expire or supersede one material input before payment
- Expected: first quote records $10.00 base, −$5.00 promotion, $5.00 taxable subtotal, 10.55%, $0.53 tax, $5.53 due, absolute expiry, renewal/reset timestamps, timezone and versions; changed input creates a new quote requiring review
- Negative case: stale quote ID cannot create a PayPal order and the PSP never becomes tax authority
- Status: planned

### TC-0005 — Exact PayPal initial payload and operation idempotency

- Requirements: REQ-0036, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0003
- Layer: unit, integration, idempotency, failure
- Preconditions: verified user owns the current $5.53 quote and PayPal fake gateway records requests
- Action: create the initial order twice with the same application operation and then attempt capture
- Expected: the payload uses `attributes.vault` with `SUBSCRIPTION_PREPAID`, one $5 trial then $10 regular RBA item, $5 item total, $0.53 tax, no discount; create retries reuse one create ID and capture uses a different stable ID
- Negative case: stale quote, wrong owner, amount/currency mismatch, or request-ID reuse across operations is rejected
- Status: planned

### TC-0006 — Verified funding is distinct from vault readiness

- Requirements: REQ-0036, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0003
- Layer: sandbox, integration, hosted, failure
- Preconditions: hydrated PayPal sandbox approval completed for the current order
- Action: capture and reconcile either immediate `VAULTED` or nested `APPROVED` vault evidence
- Expected: only verified `COMPLETED` capture funds and activates; `VAULTED` is reusable-ready, while `APPROVED` keeps renewal suppressed and shows setup finishing
- Negative case: browser return, cancel, failed capture, mismatched capture, or unverified result grants no funded state
- Status: planned

### TC-0007 — Verified delayed vault event correlates exactly once

- Requirements: REQ-0036, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0003
- Layer: security, hosted, sandbox, idempotency, failure
- Preconditions: one verified-funded operation is pending vault readiness for a known merchant/environment/PayPal customer
- Action: deliver valid, duplicate, invalid-signature, unmatched, ambiguous, and already-owned-vault event fixtures
- Expected: one valid verified `VAULT.PAYMENT-TOKEN.CREATED` promotes the linked method/arrangement once and retains raw evidence
- Negative case: every invalid, unmatched, ambiguous, duplicate-effect, or ownership-conflicting event is rejected/quarantined with vault readiness still pending
- Status: planned

### TC-0008 — Verified funding grants one 100-unit window

- Requirements: REQ-0037, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0004
- Layer: unit, integration, concurrency
- Preconditions: one verified funding operation exists and no allowance window has been granted
- Action: process the same funding evidence concurrently and repeatedly
- Expected: exactly one Go arrangement and one 100-unit allowance window exist with the approved timestamps
- Negative case: browser approval, authentication, or duplicate evidence cannot grant a second window
- Status: planned

### TC-0009 — Confirmed Generate Answer commits once and returns 90

- Requirements: REQ-0037, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0004
- Layer: interaction, integration, hosted
- Preconditions: signed-in Go customer has 100 available units
- Action: select the curated prompt, confirm the displayed 10-unit cost, complete the deterministic action, refresh, sign out, and return
- Expected: one reservation commits once, simulated result is labeled, usage history records the operation, and every return shows 90
- Negative case: viewing or selecting the prompt before confirmation changes no balance
- Status: planned

### TC-0010 — Failed or canceled action releases all 10 units

- Requirements: REQ-0037, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0004
- Layer: failure, concurrency
- Preconditions: signed-in Go customer has 100 units and a confirmed 10-unit operation is reservable
- Action: force deterministic failure/cancellation while repeating the completion callback concurrently
- Expected: no result is delivered, reservation is released once, committed usage is zero, and available balance remains 100
- Negative case: no partial debit, duplicate release, negative reserved counter, or result-on-failure is allowed
- Status: planned

### TC-0011 — Responsive, theme, typography, and accessibility contract

- Requirements: REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0005
- Layer: interaction, responsive, visual review, accessibility
- Preconditions: all customer states are available through deterministic local fixtures
- Action: traverse every state at laptop and 390px mobile in light/dark and reduced-motion/transparency modes using keyboard and automated accessibility checks
- Expected: approved C3-G hierarchy, real fonts, visible focus, 44px targets, non-color status meaning, readable copy, no horizontal overflow, and no serious axe violations
- Negative case: fallback-only fonts, fake provider controls, clipped content, hidden focus, or color-only status fails the test
- Status: planned

### TC-0012 — Hosted merchant-safe end-to-end proof

- Requirements: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0005
- Layer: hosted, sandbox, security, interaction, responsive, visual review, accessibility, integration, failure
- Preconditions: Render HTTPS service, Supabase project/Hook, real-email transport, PayPal sandbox app and webhook are configured for this slice
- Action: execute the complete customer story plus required cancellation, capture, vault-pending, invalid-webhook, duplicate, stale-quote, OTP, and AI-failure branches
- Expected: sanitized evidence proves every normalized transition and displays only documented/sandbox-proven/simulated status without exposing secrets or full identifiers
- Negative case: static mockup, provider docs, unverified callback, or sandbox success cannot be labeled production-ready proof
- Status: planned

### TC-0013 — Replacement runtime assembly and boundary isolation

- Requirements: REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0001
- Layer: unit, integration, build, security, failure
- Preconditions: ADR-0001 is approved; the accepted Supabase schema and framework-independent feature source remain unchanged; TASK-0006 dependencies are exactly pinned
- Action: build and start the single Express service with the compiled Vite shell, then exercise health, API/webhook 404 isolation, static asset and browser-history delivery, base configuration failure, optional capability absence, and Vite public-variable rejection
- Expected: one Node service serves the passive Vite shell and constant `/api/v1/health`; API/webhook requests never receive SPA HTML; missing optional PayPal/email configuration does not block startup but fails closed when invoked; only approved public build variables enter the client; local tests, typecheck, lint, build, audit, and protected-path checks pass
- Negative case: legacy `/api/*` compatibility, secret/config leakage, an API path returning HTML, missing base configuration reaching `listen`, a second deployable, or a diff in protected schema/feature paths fails the test
- Status: planned

### TC-0014 — Hosted Vite/Express and six-digit persistent-email OTP

- Requirements: REQ-0034, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0006
- Layer: hosted, integration, security, failure
- Preconditions: the existing single Render Node service, Supabase project and Send Email Hook, and Resend sender are configured with secrets outside the repository
- Action: verify the hosted health/API/webhook boundaries, deliver a six-digit OTP for a persistent real-email identity through the verified raw-body hook, reject an invalid hook signature, and contain unavailable email capability/provider failure
- Expected: the persistent user receives a six-digit OTP rather than a Magic Link, the existing intent resumes after verification, unrelated capabilities remain available, and no OTP, raw email, secret, authorization value, or internal provider error appears in client output or retained evidence
- Negative case: a second deployable, Magic Link delivery, unverified hook body, exposed sensitive value, production-deliverability claim, or unrelated-route failure fails the test
- Status: planned

### TC-0015 — Hosted persistent resume and originating-browser temporary identity proof

- Requirements: REQ-0034, REQ-0038
- Slice: SLICE-001
- Evidence: EVID-0006
- Layer: hosted, interaction, security, failure
- Preconditions: the hosted service can issue persistent and high-entropy `.test` identities while the temporary retrieval route retains its signed HttpOnly originating-browser cookie
- Action: resume the same Go intent after persistent OTP verification; retrieve and verify a five-minute `.test` OTP in the originating browser; repeat retrieval from a second browser and with missing, expired, or unknown session evidence; capture only sanitized results
- Expected: both valid identities resume the same application-owned intent into a newly calculated review, only the originating temporary session can retrieve its OTP, denials remain non-enumerating, and EVID-0006 labels hosted identity proof separately from all unexecuted payment and complete-slice gates
- Negative case: alias knowledge substitutes for the cookie, temporary identity becomes recovery proof, OTP or full identifier enters evidence, authentication pays or grants service, or identity proof upgrades EVID-0003/EVID-0005 provider claims
- Status: planned

## Milestone Close Gate

- Every active-slice requirement has concrete test and evidence links.
- Future-slice requirements do not receive speculative coverage.
- PSP or wallet claims require official provider and applicable sandbox or hosted evidence.
- Usage, entitlement, identity, payment, and allowance behavior require backend state evidence in addition to UI evidence.

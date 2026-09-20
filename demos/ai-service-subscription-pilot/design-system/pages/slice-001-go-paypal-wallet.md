# SLICE-001 Go Monthly + PayPal Wallet Design Contract

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


Status: approved visual and interaction contract for SLICE-001; runtime implementation, provider hydration, hosted behavior, accessibility proof, and PSP evidence remain separate execution gates.

Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:slice-001-go-paypal-wallet-e2e-state-board-approved

Written contract approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:slice-001-written-design-contract-approved

## Purpose

Define one bounded customer-facing path from Go Monthly selection through Supabase identity, a versioned Seattle quote, PayPal Wallet approval and verification, verified Go activation, one deterministic Generate Answer action, and a persisted return balance. This contract narrows broader product mockups without rejecting their future design direction.

## Fixed Slice Fixture

- tier and cadence: Go Monthly
- monthly base price: $10.00
- first-period promotion: -$5.00
- taxable subtotal: $5.00
- Seattle Q3 2026 customer tax: 10.55%, rounded to $0.53
- amount due today: $5.53
- normal next renewal: $10.00 plus then-applicable tax
- initial included allowance: 100 units
- Generate Answer cost: 10 units
- committed return balance: 90 units
- executable payment lane: PayPal Wallet only
- output source: deterministic simulated AI fixture

Plus, Pro, Pro Max, annual checkout, purchased credits, tier changes, alternate PSP lanes, and a real subsequent renewal charge remain non-executable in this slice.

## Customer Contract

| State | Customer-visible treatment | Authority boundary |
| --- | --- | --- |
| Choose Go | One complete Go Monthly card with the 50% first-period promotion and 100-unit allowance | selection creates only a pending application intent |
| Identity | Persistent real email and twenty-four-hour .test routes preserve the same Go intent | Supabase owns application identity; PSP identity is absent |
| Review $5.53 | One versioned breakdown shows base, promotion, taxable subtotal, tax, exact total, quote expiry, and exact next boundary | authentication never pays; changed inputs require a replacement review |
| PayPal approval | The official PayPal SDK region launches a provider-owned approval experience with recurring-use terms | provider presentation and browser return are not success evidence |
| Verify | Controls lock while capture funding, vault readiness, ownership, and entitlement are checked separately | only authoritative server and verified provider evidence can advance state |
| Activation handoff | Verified funding is durable; reusable readiness is shown separately as pending or ready; the customer sees `Preparing your Go workspace` with no unit balance or workspace action yet | TASK-0003 ends at one exactly-once funded-arrangement transition; it cannot grant allowance or activate access |
| Setup finishing | TASK-0004 creates or reuses the one 100-unit allowance window and activates Go while vault readiness may remain pending | automatic renewal stays suppressed until reusable-ready evidence is verified |
| Active 100 | The signed-in Go workspace offers curated Generate Answer prompts, then shows an explicit 10-unit confirmation with the projected 90-unit balance | no usage mutation before confirmation and atomic reservation |
| Return 90 | One deterministic result commits 10 units once; a return visit restores 90 instead of resetting | server-owned allowance and usage history remain authoritative |
| Exceptions | Stale quote, PayPal cancel, capture failure, invalid webhook, pending vault, and failed AI action remain contained states | every branch fails closed and exposes only its safe next action |

## Responsive And Theme Contract

- Laptop and mobile show the same amounts, timestamps, states, and authority boundaries.
- Mobile uses one-column task order, a compact allowance strip, full-width provider action, 44-pixel-or-larger controls, and no document-level horizontal overflow.
- The header uses one theme icon separated from the account action by a vertical Separator.
- C3-G uses restrained warm G1 glass in light mode and G3 aubergine glass in dark mode.
- Prices, consent, tax, status, evidence, forms, and warnings remain high-opacity evidence islands.
- Status meaning always combines label, structure, and icon; color never acts alone.
- Reduced motion removes nonessential transitions and collapses spinner animation to a near-static state.
- Reduced transparency replaces glass blur with opaque evidence-safe surfaces.

## Component Routing

- shadcn/ui Button, Card, Alert, Separator, Input, and Dialog provide the primitive semantics.
- The PayPal button and approval window remain provider-owned hydrated regions; the static artifact labels them as fixtures.
- The server-issued PayPal user ID token and the Supabase-user-to-PayPal-customer provenance mapping remain backend contracts; they do not create a second account identity in the customer UI.
- MarkerContent identifies #Generate Answer.
- Message and Bubble patterns separate customer and simulated AI content.
- Toast confirms the committed usage effect but never owns durable payment, vault, or failure status.
- Progress rows show causal verification stages without inventing provider completion percentages.

## Error And Recovery Contract

- Stale quote: replace and reconfirm before any PSP call.
- PayPal cancel: return to the valid review without entitlement or an automatic retry loop.
- Capture failure: retain terminal evidence, grant zero units, and return to review.
- Invalid webhook signature: retain rejected evidence and perform no normalized transition.
- Vault pending after verified funding: keep access active, expose setup finishing, and suppress automatic renewal.
- Activation handoff failure: keep verified funding and its original payment operation, show a contained retryable `Preparing Go` state, and never create another PayPal order or capture.
- Failed or canceled AI action: deliver no result, release the complete 10-unit reservation, and keep the balance at 100.
- Duplicate browser returns, provider responses, webhooks, or action completion cannot duplicate payment, allowance, entitlement, or usage.

## Evidence Boundary

The approved HTML is design evidence only. It does not prove:

- live Supabase authentication or .test originating-session isolation
- exact PayPal merchant eligibility or hydrated SDK rendering
- verified capture, webhook signature, vault token, or reusable future charge
- real Fraunces and Source Sans 3 runtime loading
- keyboard, screen-reader, contrast, reduced-motion, or hosted behavior
- production readiness

Those facts remain required execution evidence under REQ-0038.

## Approved Artifact

- mockups/slice-001-go-paypal-wallet-e2e-state-board.html

## Governing Requirements

- REQ-0034
- REQ-0035
- REQ-0036
- REQ-0037
- REQ-0038

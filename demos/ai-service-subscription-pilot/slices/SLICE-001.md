# SLICE-001 — Go Monthly PayPal Wallet Thin Slice

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


- Status: active
- User approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:slice-001-charter-approved
- Slice Steward: primary Codex agent
- Payment-domain sub-review required: yes

## Goal And Outcome

A signed-out customer selects Go Monthly, verifies either a persistent real-email or temporary `.test` Supabase identity, reviews the exact Seattle Q3 2026 introductory quote, funds the first period through PayPal Wallet while the reusable credential is verified, receives 100 Go units, completes one deterministic 10-unit Generate Answer action, and returns to a persisted 90-unit balance. The presenter can explain each boundary with sanitized evidence without claiming that a subsequent renewal charge or production merchant readiness has been proved.

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| ----------- | --------- | ----------- | ------------------------ |
| REQ-0034 | approved | active_slice | One server-owned Go Monthly intent resumes after persistent real-email or originating-session `.test` OTP verification into a newly calculated review and never auto-pays. |
| REQ-0035 | approved | active_slice | The first-period quote shows $10.00 base, $5.00 promotion, $5.00 taxable subtotal, $0.53 Seattle tax, $5.53 due, and the exact next-renewal and allowance-reset timestamp. |
| REQ-0036 | approved | active_slice | Verified PayPal `COMPLETED` funding and independently verified `VAULTED` or matching `VAULT.PAYMENT-TOKEN.CREATED` evidence establish the funded and reusable-ready facts without duplicate effects. |
| REQ-0037 | approved | active_slice | Verified funding grants 100 units; one confirmed deterministic Generate Answer reserves and commits 10 exactly once, persists 90, and fully releases on failure or cancellation. |
| REQ-0038 | approved | active_slice | Laptop/mobile, light/dark, typography, accessibility, hosted identity, provider, backend, failure, and merchant-safe evidence meet the approved proof contract. |

These requirements are now `active_slice` under the separately approved charter and implementation plan.

## Slice Acceptance Contract

The exact acceptance and negative-case authority remains in `REQUIREMENTS.md`. Closure additionally requires one connected proof chain:

1. pending intent → identity verification → recalculated quote;
2. customer PayPal approval → verified capture funding → verified reusable-credential readiness;
3. verified funding → one allowance grant → one atomic usage reservation and commit;
4. return visit → the same account, arrangement, usage history, and 90-unit balance;
5. sanitized merchant presentation → only the evidence level actually demonstrated.

## Design And State Links

- Design decisions: DESIGN-0157, DESIGN-0158, DESIGN-0159, DESIGN-0160
- Design-system contracts: `design-system/MASTER.md`, `design-system/TYPOGRAPHY.md`, `design-system/COMPONENTS.md`, `design-system/BOARD.md`
- Page contracts: `design-system/pages/slice-001-go-paypal-wallet.md`
- Mockups/state boards: `mockups/slice-001-go-paypal-wallet-e2e-state-board.html`

The four linked slice-specific design decisions are approved. Runtime font, accessibility, Supabase, hosted, PayPal, and backend behavior remain execution evidence gates rather than design blockers.

## Dependencies And Cross-Cutting Requirements

- Supabase owns the application identity; PSP profiles never own the account or entitlement.
- The backend owns checkout intent, quote, payment operation, billing arrangement, entitlement, allowance, and usage state.
- A hosted HTTPS endpoint is required for the Supabase send-email hook and PayPal webhooks.
- The PayPal merchant and sandbox account must support the exact Wallet save-with-purchase route.
- The Seattle Q3 2026 mapping is a fixed demo fixture whose version and expiry remain visible.
- Provider idempotency, application uniqueness, locking, signature verification, and ownership correlation are all required; none substitutes for another.
- The deterministic AI fixture is simulated, while usage accounting and access decisions are genuine application behavior.

## PayPal Thin-Slice Contract

- The initial order uses `payment_source.paypal.attributes.vault.usage_pattern: SUBSCRIPTION_PREPAID`; later merchant-initiated charges use the separate stored-credential fields and are outside this slice.
- One RBA billing-plan item encodes one $5.00 monthly introductory cycle followed by open-ended $10.00 monthly regular cycles. The initial amount is $5.00 item total plus $0.53 tax, with no recurring `breakdown.discount` field.
- The server generates the PayPal user ID token. It stores the PayPal-generated customer ID against the Supabase user as merchant- and environment-scoped provider provenance; returning checkout passes that ID as `target_customer_id` without treating it as application identity.
- A capture with verified `COMPLETED` funding and `payment_source.paypal.attributes.vault.status: APPROVED` creates a uniquely correlated pending vault operation. A verified `VAULT.PAYMENT-TOKEN.CREATED` event may resolve it only through the expected merchant, environment, PayPal customer ID, and the single linked application operation/order. An absent or ambiguous match is quarantined and remains pending.
- The exact initial-order payload and delayed-event correlation must pass the configured PayPal sandbox before implementation closure. Verified funding may still activate Go while reusable readiness remains pending.

## Explicit Non-Goals

- No Stripe, Apple Pay, Google Pay, PayPal card vaulting, Link, Fastlane, or additional provider lane.
- No real subsequent renewal charge; the slice proves only initial funding and reusable-credential readiness.
- No annual plan, tier change, cancellation, reactivation, renewal recovery, refund, payment-method replacement, purchased-credit pack, or low-balance warning.
- No Plus, Pro, Pro Max, document analysis, image creation, or batch comparison execution.
- No seeded persona provisioning, application-account suspension, or administrator cleanup lifecycle; those remain under REQ-0011 and REQ-0031 for SLICE-005.
- No Integration Lab implementation.
- No iOS, Android, H5 redirect, React Native, or native SDK implementation.
- No production tax engine, arbitrary-address accuracy, production merchant onboarding, or production-readiness claim.

## Deferrals And Removals

| Requirement | Proposed disposition | Reason | Next trigger | User approval reference |
| ----------- | -------------------- | ------ | ------------ | ----------------------- |

No requirement is deferred or removed by this slice. Every out-of-slice approved requirement retains the approved `future_slice` or `blocked` disposition in `REQUIREMENTS.md`.

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| ----------- | ----- | ---------- | -------- |
| REQ-0034 | TASK-0001, TASK-0002, TASK-0005, TASK-0007, TASK-0009 | TC-0001, TC-0002, TC-0003, TC-0012, TC-0014, TC-0015 | EVID-0001, EVID-0002, EVID-0005, EVID-0006 |
| REQ-0035 | TASK-0002, TASK-0007, TASK-0009 | TC-0004, TC-0012 | EVID-0002, EVID-0005 |
| REQ-0036 | TASK-0001, TASK-0003, TASK-0008, TASK-0009 | TC-0001, TC-0005, TC-0006, TC-0007, TC-0012 | EVID-0001, EVID-0003, EVID-0005 |
| REQ-0037 | TASK-0001, TASK-0004, TASK-0009 | TC-0001, TC-0008, TC-0009, TC-0010, TC-0012 | EVID-0001, EVID-0004, EVID-0005 |
| REQ-0038 | TASK-0001, TASK-0002, TASK-0003, TASK-0004, TASK-0005, TASK-0006, TASK-0007, TASK-0008, TASK-0009 | TC-0001, TC-0002, TC-0003, TC-0004, TC-0005, TC-0006, TC-0007, TC-0008, TC-0009, TC-0010, TC-0011, TC-0012, TC-0013, TC-0014, TC-0015 | EVID-0001, EVID-0002, EVID-0003, EVID-0004, EVID-0005, EVID-0006 |

The identifiers above are planned under the approved charter. None is passing or authorized for runtime execution until the implementation plan receives separate user approval.

## Knowledge Evidence

Required for this payment-domain slice.

- Question and search terms: PayPal Wallet save during purchase, Orders v2 recurring stored credential, `attributes.vault.usage_pattern`, RBA `billing_plan`, user ID token, `target_customer_id`, PayPal customer mapping, `merchant_customer_id`, `store_in_vault`, `VAULTED`, `APPROVED`, `VAULT.PAYMENT-TOKEN.CREATED`, `PayPal-Request-Id`, delayed-event correlation, webhook verification, Supabase OTP, send-email hook, SSR identity, and `.test` session isolation
- Wiki pages/source summaries/raw files: `payment wiki root (see KNOWLEDGE_SOURCES.md)/wiki/sources/source-paypal-save-payment-methods.md`, `payment wiki root (see KNOWLEDGE_SOURCES.md)/wiki/sources/source-paypal-checkout-save-payment-methods-recurring.md`, `payment wiki root (see KNOWLEDGE_SOURCES.md)/wiki/sources/source-paypal-best-practices-recurring-payment.md`, `payment wiki root (see KNOWLEDGE_SOURCES.md)/raw/paypal-save-paypal-js-sdk.md`, `payment wiki root (see KNOWLEDGE_SOURCES.md)/raw/paypal-checkout-save-payment-methods-recurring.md`, `payment wiki root (see KNOWLEDGE_SOURCES.md)/raw/paypal-best-practices-recurring-payment.md`
- Confirmed conclusions and confidence: high confidence that PayPal Orders can combine an initial purchase with Wallet vaulting, the initial classification belongs in `attributes.vault.usage_pattern`, customer-visible RBA plan data belongs in one `billing_plan` item, a server-issued user ID token and stored PayPal customer ID support first-time and returning buyers, `VAULTED` is reusable-ready, `APPROVED` requires later verified vault evidence, stable operation-scoped request identifiers support idempotent retries, and verified webhooks are required before asynchronous provider state becomes authoritative
- Contradictions, staleness, assumptions, or gaps: the documented delayed vault event exposes a PayPal customer ID and vault ID but not an order or application-operation ID; therefore exact event-field propagation, unique pending-operation correlation, sandbox merchant eligibility, hosted-domain behavior, immediate-versus-delayed vault creation, Supabase `.test` hook isolation, and provider-controlled presentation remain closure gates; no subsequent renewal charge is included; documentation examples cannot substitute for sandbox evidence
- Official verification and retrieval date: official PayPal Orders/vaulting/idempotency/webhook and Supabase Auth/send-email-hook guidance checked on 2026-08-13; re-check before implementation if provider documentation or sandbox behavior changes
- Affected identifiers: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038, SLICE-001

## Skill And Model Routing

| Work | Required or conditional skill | Trigger or non-applicable reason | Assigned agent | Model | Effort | Escalation condition |
| ---- | ----------------------------- | -------------------------------- | -------------- | ----- | ------ | -------------------- |
| Requirement and charter reconciliation | superpowers brainstorming | required before scope or behavior changes | primary Codex agent | strongest suitable | high | any proposed expansion or requirement contradiction returns to user approval |
| Supabase identity and data planning | Supabase plus Postgres best practices | required before any Supabase schema, policy, hook, or Auth implementation plan | primary Codex implementation agent | strongest suitable | high | any identity, RLS, hook-signature, or session-isolation ambiguity blocks execution |
| PayPal semantics and evidence | Payment Knowledge Gate | required before PSP planning, code, or capability claims | primary Codex implementation agent | strongest suitable payment model | high | contradictory, stale, merchant-specific, or sandbox-unproved behavior remains unresolved |
| UI implementation | shadcn/ui design contracts plus test-driven development | required only after the charter and applicable design decisions are approved | primary Codex implementation agent | strongest suitable implementation model | high | any visual divergence, provider-control imitation, or accessibility gap blocks closure |
| Final verification | verification-before-completion | required before any completion claim | `/root/slice001_requirements_review` | strongest suitable | high | missing hosted, provider, failure, accessibility, or typography evidence blocks closure |

## Reviewer Assignments

| Lane | Reviewer/agent | Independent from implementer | Model and effort | Required inputs | Decision authority |
| ---- | -------------- | ---------------------------- | ---------------- | --------------- | ------------------ |
| Requirements coverage | `/root/slice001_requirements_review` | yes | strongest suitable, high | requirement register, charter, disposition map | accept or reject requirement coverage |
| Design fidelity | `/root/slice001_design_review` | yes | strongest suitable design model, high | DESIGN-0157 through DESIGN-0160, page contract, state board, screenshots | accept or reject design fidelity |
| Engineering quality | `/root/slice001_requirements_review` | yes | strongest suitable, high | approved charter, implementation diff, tests, evidence | accept or reject engineering quality |
| Payment-domain engineering sub-review | `/root/slice001_payment_review` | yes | strongest suitable payment model, high | Knowledge Evidence, PSP sources, implementation diff, sandbox and hosted tests | accept or reject PSP semantics inside engineering lane |

## Charter Review Record

- Requirements coverage: approved by `/root/slice001_requirements_review` on 2026-08-13.
- Design fidelity: approved by `/root/slice001_design_review` on 2026-08-13 after the existing board gained explicit quote/reset timestamps, the 10-unit confirmation state, and corrected mobile target/readability values.
- Payment-domain semantics: approved by `/root/slice001_payment_review` on 2026-08-13 after the initial RBA payload, user-ID-token/customer provenance mapping, and fail-closed delayed-vault correlation were made explicit.
- Unresolved charter-review findings: 0 Critical, 0 Important.
- Scope effect: none. No new page, provider lane, lifecycle, or implementation authority was added.

## Entry Criteria

All items are checked before status becomes `approved`, `active`, `blocked`, or `closed`.

- [x] Requirements and dispositions are valid.
- [x] Design and state artifacts are approved when applicable.
- [x] Knowledge Evidence is sufficient for charter review; exact sandbox evidence remains a closure gate.
- [x] Coverage boundaries, skills, models, and independent reviewer roles are assigned; named runtime agents are bound when implementation begins.
- [x] User approved this charter.

## Exit Criteria

All items are checked before status becomes `closed`.

- [ ] Every inherited requirement has its promised task, test, and evidence result.
- [ ] No unresolved Critical or Important findings remain.
- [ ] Every Minor finding has an explicit accepted disposition.
- [ ] Required hosted, sandbox, PSP, accessibility, typography, responsive, and platform evidence passes.
- [ ] Requirement register, active plan, tasks, tests, evidence, and tracking agree.
- [ ] User approved required visual/taste outcomes.

## Close Record

- Closed by: none
- Closed at: none
- Requirements review decision: pending
- Design review decision: pending
- Engineering review decision: pending
- Payment-domain sub-review decision: pending
- Critical/Important findings: pending
- Minor findings disposition: pending
- Evidence summary: none
- Progress-log reference: none

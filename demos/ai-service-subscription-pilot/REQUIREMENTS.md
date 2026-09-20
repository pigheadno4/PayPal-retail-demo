# AI Service Subscription Pilot Requirements

This file is the only product-requirement authority for this demo. Scenario, design, architecture, task, plan, and tracking files are derived views.

## Approved current-demo identity scope amendment — 2026-09-19

Approval: `user:TASK-0005:2026-09-19:email-otp-only-approved`.

The current merchant demo supports persistent real-email Supabase OTP sign-in only. Remove the temporary/24-hour account entry and associated customer-facing promises from the current demo, and stop running temporary-account scenarios in its acceptance flow. This supersedes temporary-account obligations in the current SLICE-001 scope, including REQ-0034/0038 and their derived design/task/test views. Broader historical temporary-account specifications under REQ-0011 and related future-slice requirements are retained as deferred reference, not supported current-demo behavior; reopening requires explicit approval.

Preserve existing account data, database tables, server-side security controls and provider/payment history. This amendment does not authorize destructive cleanup, weakening retained endpoint protections, new password/quick-login flows, payment changes or broader redesign. Existing persistent email-entry styling is reused. Authentication still cannot charge, grant entitlement or bypass current price review.

Temporary expiry remains unresolved, not fixed or passed. Retain its historical failure evidence and explicitly mark its current-demo acceptance scenarios deferred by this scope decision rather than silently deleting evidence. Retained backend unit/security tests may remain; no more live temporary-account investigation is required for this demo. Persistent-login proof and the separate payment-to-workspace journey retain their applicable evidence gates. Implementation and reconciliation of derived documents are pending; this approval is not a completion claim.

## Identifier Rules

Requirement, design, slice, task, test, and evidence identifiers follow `demos/NEW_DEMO_PROTOCOL.md`. IDs are demo-local, permanent, never renumbered, and never reused.

## Requirement Register

| ID | Title | Lifecycle | Disposition | Target slice | Source |
| --- | ----- | --------- | ----------- | ------------ | ------ |
| REQ-0001 | Serve merchant education and provider comparison | approved | future_slice | SLICE-007 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:audience-and-purpose |
| REQ-0002 | Use one Supabase application identity | approved | future_slice | SLICE-005 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:shared-account-system |
| REQ-0003 | Deliver the complete web experience before mobile implementation | approved | future_slice | SLICE-007 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:web-first-sequence |
| REQ-0004 | Use reusable payment methods for merchant-controlled billing | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:vault-first-billing |
| REQ-0005 | Support monthly and annual promotional pricing | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:billing-and-promotions |
| REQ-0006 | Simulate AI output while recording real usage | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:usage-simulator |
| REQ-0007 | Warn at low and critical allowance thresholds | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:allowance-thresholds |
| REQ-0008 | Sell durable purchased-credit packs | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:credit-freeze-effective-access-end |
| REQ-0009 | Reserve primary payment-method changes for payment management | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:payment-management |
| REQ-0010 | Treat alternate methods during purchase as one-time payment | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:alternate-payment-method |
| REQ-0011 | Create and restore application accounts within the customer journey | approved | future_slice | SLICE-005 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:account-journeys |
| REQ-0012 | Preserve normalized state and raw provider provenance | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:normalized-and-raw-state |
| REQ-0013 | Provide three connected Integration Lab tools | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:three-tool-lab |
| REQ-0014 | Build guided scenarios with inspectable process traces | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:scenario-builder |
| REQ-0015 | Compare equivalent outcomes through staged provider-neutral lanes | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-10:staged-provider-neutral-comparison-lanes |
| REQ-0016 | Separate provider capability from demo evidence | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:capability-matrix |
| REQ-0017 | Present merchant and integration detail views | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:dual-presentation |
| REQ-0018 | Model platform and integration route independently | approved | future_slice | SLICE-006 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:mobile-route-taxonomy |
| REQ-0019 | Scope the first app-to-web pilot to the US iOS storefront | approved | future_slice | SLICE-009 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:us-ios-h5-scope |
| REQ-0020 | Prove H5 credit purchase before H5 subscription purchase | approved | future_slice | SLICE-008 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:h5-credit-first |
| REQ-0021 | Compare evidence-supported payment-method lanes | approved | future_slice | SLICE-003 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:payment-method-lanes |
| REQ-0022 | Define four service tiers | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-tier-model |
| REQ-0023 | Define upgrade and downgrade financial treatment | approved | future_slice | SLICE-004 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-tier-change-rules |
| REQ-0024 | Define AI action-to-usage weights | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-usage-map |
| REQ-0025 | Define native and React Native implementation scope | draft | unassigned | none | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-mobile-implementation |
| REQ-0026 | Name the four tiers Go, Plus, Pro, and Pro Max | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:tier-names-go-plus-pro-pro-max |
| REQ-0027 | Differentiate tiers through allowance and capability progression | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:hybrid-tier-model |
| REQ-0028 | Allocate tier usage in exact monthly allowance windows | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:tier-allowance-ladder |
| REQ-0029 | Offer four representative AI actions | approved | future_slice | SLICE-002 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:four-ai-action-catalog |
| REQ-0030 | Provision four distinct sandbox subscription personas | approved | blocked | none | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:four-sandbox-personas |
| REQ-0031 | Retain self-registered accounts with admin-controlled lifecycle | approved | blocked | none | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-21:persistent-accounts-admin-lifecycle |
| REQ-0032 | Calculate US B2C tax from a source-backed mapping table | approved | future_slice | SLICE-007 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-22:us-b2c-tax-mapping-scope |
| REQ-0033 | Recover failed monthly renewals without granting unfunded allowance | approved | blocked | none | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:ordinary-renewal-recovery |
| REQ-0034 | Resume checkout through one application identity | approved | active_slice | SLICE-001 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved |
| REQ-0035 | Quote the first Go monthly period exactly | approved | active_slice | SLICE-001 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved |
| REQ-0036 | Fund and verify a PayPal Wallet reusable credential | approved | active_slice | SLICE-001 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved |
| REQ-0037 | Grant and consume the Go allowance atomically | approved | active_slice | SLICE-001 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved |
| REQ-0038 | Prove the thin slice with merchant-safe evidence | approved | active_slice | SLICE-001 | user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved |

`ID` is the only register key. The register summarizes the authoritative records below.

## Active Requirement Records

### REQ-0001 — Serve merchant education and provider comparison

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:audience-and-purpose
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-007
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: assign after the first slice is proposed
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:audience-and-purpose
- Acceptance:
  - The default story explains customer value and merchant operational tradeoffs, while the lab supports expert PayPal-versus-Stripe learning.
- Negative cases:
  - The experience does not collapse into a PSP API explorer or present unsupported commercial claims as sales facts.
- Dependencies: REQ-0013
- Affected surfaces: customer story, Integration Lab, documentation
- Required test types: interaction, manual
- Required evidence types: interaction, responsive
- Exclusions: production readiness and merchant-specific contractual advice
- Payment-domain review required: yes
- Payment-domain review reason: provider comparisons and merchant claims require evidence-backed PSP semantics
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0002 — Use one Supabase application identity

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:shared-account-system
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-005
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the account-entry screen contract and identity-mode transitions
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:shared-account-system
- Acceptance:
  - Web and future mobile clients map to one Supabase-authenticated application account.
  - Link, Fastlane, PayPal, Apple, and wallet profiles remain payment or provider identities rather than application accounts.
  - A hosted `.test` identity is explicitly classified in server-owned application state as `demo_identity`; the classification cannot be supplied or changed through user-editable metadata.
  - A verified real-email customer retains one stable Supabase application identity whether they authenticate by email OTP or by an optional password set later in Account Settings.
- Negative cases:
  - A PSP profile cannot silently create a competing customer account or become the entitlement owner.
  - A `.test` alias cannot be treated as a recoverable private account or used as proof of identity after its originating demo session is unavailable.
  - Enabling password sign-in cannot create a second application account or change ownership of subscription, entitlement, usage, credit, payment-method, or history records.
- Dependencies: current Supabase security and architecture research
- Affected surfaces: signup, login, checkout, account recovery, backend identity mapping
- Required test types: integration, interaction, security
- Required evidence types: backend, interaction, failure
- Exclusions: Login with PayPal and Sign in with Apple as application identity providers
- Payment-domain review required: yes
- Payment-domain review reason: provider identity accelerators must remain separate from reusable-payment ownership
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0003 — Deliver the complete web experience before mobile implementation

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:web-first-sequence
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-007
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve web requirements and visual direction
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:web-first-sequence
- Acceptance:
  - Web customer, billing, usage, credit, account, and lab contracts are completed before a mobile implementation slice begins.
- Negative cases:
  - Research into mobile routes does not authorize mobile runtime code or narrow the shared backend contract.
- Dependencies: complete web requirement and design register
- Affected surfaces: project sequencing, web, iOS, Android, shared backend
- Required test types: requirements review
- Required evidence types: static
- Exclusions: preventing research-only mobile capability analysis
- Payment-domain review required: no
- Payment-domain review reason: this requirement controls project sequencing rather than PSP behavior
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0004 — Use reusable payment methods for merchant-controlled billing

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:vault-first-billing
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: capture exact method-by-method sandbox evidence for reusable-token creation, reuse, replacement, and cleanup through the Payment Knowledge Gate
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:vault-first-billing
- Acceptance:
  - The pilot models recurring service billing from provider-supported reusable payment credentials controlled by merchant billing logic.
  - The application retains the provider and acquisition provenance required to invoke the correct future-charge and management path.
  - Reusable credentials belong to one immutable application ownership chain: Supabase user, billing arrangement, provider customer binding, reusable credential, and explicit subscription primary assignment.
  - Every credential retains PSP, environment, merchant account, acquisition provenance, consent and use type, original transaction evidence, and lifecycle status.
  - A recurring charge begins from the server-owned billing arrangement and its primary assignment; it cannot trust a browser-supplied user, provider customer, or token identifier.
  - Before a reusable credential can fund or replace a primary method, the backend verifies that its application user, billing arrangement, provider customer, environment, merchant account, and reuse eligibility match the intended operation.
  - Provider correlation metadata uses an opaque application operation reference rather than exposing the Supabase user identifier.
  - Funding, reusable-credential verification, primary assignment, and entitlement are four independently evidenced and idempotent facts.
  - Each renewal or reactivation has one normalized billing operation and at most one committed movement for the same arrangement and billing period.
  - Provider idempotency complements application uniqueness, locking, and idempotent webhook handling; it never replaces them.
  - PayPal requests use a stable `PayPal-Request-Id` where the exact endpoint supports or requires it. The same identifier is reused only for an identical retry of the same API call, never across create, capture, refund, or different billing periods.
  - Stripe requests use a stable `Idempotency-Key` with the same identical-retry boundary.
  - An uncertain provider response is retrieved or reconciled before retry where possible. The application never generates a new idempotency identifier merely to escape uncertainty and never blindly recharges after the provider's retention window expires.
- Negative cases:
  - The primary model does not delegate lifecycle ownership to PayPal Subscriptions or Stripe Billing subscriptions without a later approved change.
  - The application never stores raw card or wallet credentials.
  - A credential associated with another application user, provider customer, environment, or merchant account cannot be charged, promoted, or displayed as eligible.
  - A browser return, redirect parameter, client-supplied token, duplicate webhook, or duplicate provider response cannot independently authorize access, primary replacement, or another charge.
  - The same provider idempotency identifier cannot be reused for a different payload, operation type, or billing period.
- Dependencies: provider vaulting eligibility, consent, redisplay, and merchant-initiated transaction research
- Affected surfaces: checkout, billing engine, provider adapters, payment management, webhooks
- Required test types: integration, sandbox, hosted
- Required evidence types: backend, provider, failure, hosted
- Exclusions: unsupported cross-provider token portability
- Payment-domain review required: yes
- Payment-domain review reason: vault creation, consent, reuse, and merchant-initiated charging are PSP-specific
- Design links: design-system/pages/reactivation-payment-method.md, design-system/pages/integration-lab.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0005 — Support monthly and annual promotional pricing

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:billing-and-promotions
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade pricing and checkout visual artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:demo-first-tier-pricing
- Acceptance:
  - Each tier can expose monthly and annual cadence, with annual total priced at ten percent less than twelve monthly periods.
  - A brand-new customer's first monthly period is fifty percent off for the Go tier and twenty percent off for other tiers.
  - The initial demo-first normal monthly USD prices are Go $10, Plus $25, Pro $50, and Pro Max $100.
  - The corresponding normal annual totals are Go $108, Plus $270, Pro $540, and Pro Max $1,080.
  - The eligible first monthly-period prices are Go $5, Plus $20, Pro $40, and Pro Max $80.
  - One monthly price purchases one full customer-specific calendar-month period and its complete tier allowance; the amount is not prorated merely because the period includes February or a different number of calendar days.
  - Checkout and account surfaces show the exact next renewal and allowance-reset timestamp in the confirmed subscription timezone and describe the cadence as `renews monthly`.
  - Pricing analysis can explain effective included-unit economics, but it cannot assign a cash-redemption value to included or purchased usage units.
- Negative cases:
  - The customer is not promised a zero-charge first month in the default customer story.
  - Introductory pricing does not recur after the first eligible period.
  - The experience cannot promise `every 30 days`, describe a renewal as a fee for a named calendar month, or imply that a shorter calendar-month interval receives less allowance.
  - Demo-first pricing cannot be presented as market research, competitor pricing, or a production recommendation.
- Dependencies: REQ-0022, REQ-0032, and currency scope
- Affected surfaces: pricing, checkout review, billing schedule, account history
- Required test types: unit, integration, interaction
- Required evidence types: backend, interaction, failure
- Exclusions: free trials, promo-code authoring, and provider-native subscription promotions
- Payment-domain review required: yes
- Payment-domain review reason: charged amounts and recurring schedules must match provider requests and stored billing state
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/ai-service-simulator.md, design-system/pages/tier-change-lifecycle.md, design-system/pages/tax-mapping.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0006 — Simulate AI output while recording real usage

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:usage-simulator
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade AI workspace and metering state artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:curated-plus-document-analysis-conversation
- Acceptance:
  - Representative AI actions return deterministic fixture output while the backend writes real, attributable usage events and recomputes allowance.
  - The customer can observe consumed amount, remaining amount, reset date, and exhaustion behavior.
  - Every action is clearly labeled as simulated AI, previews its fixed unit cost, and uses a curated input that maps truthfully to deterministic output.
  - The presentation layer may stream predefined fixtures through a realistic chat lifecycle, but server-authoritative usage reservation, completion, and ledger state remain independent from that local presentation lifecycle.
  - A successful action shows its persistent result and the exact included-allowance and purchased-credit debit breakdown.
  - A failed or canceled fixture run releases its reservation and consumes no units.
- Negative cases:
  - Mocked AI output is not presented as evidence that an external AI provider was called.
  - Client-side counters are not authoritative usage state.
  - A local streamed completion, Toast, browser state, or rendered result cannot independently authorize or fabricate a committed usage debit.
- Dependencies: REQ-0024 and the entitlement model
- Affected surfaces: AI simulator, usage API, ledger, allowance summary, diagnostics
- Required test types: unit, integration, interaction
- Required evidence types: backend, interaction, failure
- Exclusions: production AI inference, token billing, and model-provider cost reconciliation
- Payment-domain review required: no
- Payment-domain review reason: this requirement concerns application metering rather than PSP behavior
- Design links: design-system/pages/ai-service-simulator.md, design-system/pages/account-usage-history.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0007 — Warn at low and critical allowance thresholds

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:allowance-thresholds
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade allowance-warning visual states
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:allowance-warning-and-true-exhaustion
- Acceptance:
  - The experience presents a low-allowance warning at twenty percent remaining and a more urgent warning at ten percent remaining.
  - Warning actions can route to credit purchase or an eligible tier upgrade.
  - Thresholds measure committed included allowance separately from purchased credits.
  - The current warning remains visible beside the allowance meter; a transient Toast may reinforce but cannot replace the persistent state.
  - If one action crosses both thresholds, both crossings are recorded once for that allowance window while the customer sees only the most severe newly crossed state.
  - Included allowance reaching zero while purchased credits remain changes the message to `Using purchased credits` and cannot be labeled service exhaustion.
  - Service is blocked only when the combined eligible balance cannot fund the selected action, at which point the exact shortage, top-up route, and eligible upgrade route are shown.
- Negative cases:
  - The same event cannot repeatedly create duplicate warnings or duplicate purchase intents.
  - A customer with spendable purchased credits cannot be told that service has stopped merely because included allowance reached zero.
  - Email, SMS, and push delivery are not implied by the approved in-product warning contract.
- Dependencies: REQ-0006, REQ-0008
- Affected surfaces: AI simulator, allowance indicator, messages, credit-purchase entry
- Required test types: unit, interaction, accessibility
- Required evidence types: interaction, responsive, accessibility
- Exclusions: email, push, and SMS notification delivery until separately approved
- Payment-domain review required: no
- Payment-domain review reason: thresholds and warning presentation are application behavior
- Design links: design-system/pages/ai-service-simulator.md, design-system/pages/h5-credit-purchase.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0008 — Sell durable purchased-credit packs

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:credit-freeze-effective-access-end
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: capture the two approved direct-card sandbox refund snapshots and approve implementation-grade visual states
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-28:purchased-credit-reversal-written-review
- Acceptance:
  - Existing active customers can buy an initial versioned catalog of 200 credits for $20, 500 credits for $50, and 1,000 credits for $100 before applicable tax.
  - Purchased credits are non-monetary prepaid AI usage entitlements measured in service units; they are not a stored-value wallet, gift card, cash balance, payment method, or transferable currency.
  - Every initial pack uses the same transparent $0.10 catalog rate per credit, and the approved refund-compensation conversion rate is also $0.10 per credit.
  - A pack price and the published refund-compensation conversion rate do not create a customer-visible monetary redemption value or permit credits to pay subscription fees, buy another pack, transfer value, or obtain cash.
  - Consuming purchased credits fulfills the prepaid usage entitlement through approved AI action weights and does not initiate another provider payment.
  - Verified one-time payment fulfillment adds an idempotent ledger entry.
  - A customer-selected refund-compensation resolution can add an idempotent AI usage-credit ledger entry without a new provider payment under REQ-0023.
  - Refund-compensation credits use the same durable purchased-credit balance, consumption behavior, tier-based action eligibility, and subscription-end freeze or reactivation rules as purchased packs, while retaining distinct `refund_compensation` provenance.
  - Refund compensation grants `ceil(rounded service refund amount / $0.10)` whole credits under the approved versioned formula; historical tax remains separate and never increases that quantity.
  - Included allowance is consumed before purchased or refund-compensation credits.
  - One action can atomically split its debit across the remaining included allowance and purchased-credit grants when the combined eligible balance covers the full action cost.
  - Purchased and refund-compensation grants are allocated oldest first while retaining grant-level provenance.
  - While the subscription remains active, purchased credits can restore metered service access after included allowance is exhausted.
  - A cancellation request does not freeze purchased credits while paid service access remains active.
  - At the authoritative effective service-access end timestamp, the remaining purchased-credit balance is retained but frozen and cannot be consumed.
  - Reactivating an eligible subscription unfreezes the intact remaining purchased-credit balance.
  - During an approved renewal `tax_review_required` grace state, existing purchased credits remain usable because temporary tier access continues; the state does not add, revalue, or reset the balance.
  - If unresolved tax evidence moves the arrangement from grace into recoverable `tax_suspended`, tier access ends and the retained purchased-credit balance freezes until a separately verified explicit reactivation restores eligible service access.
  - Verified funding for an explicit `tax_suspended` reactivation starts a fresh paid term and unfreezes the intact purchased-credit balance at the same authoritative funding timestamp.
  - During approved ordinary monthly `renewal_payment_recovery`, existing purchased and refund-compensation credits remain usable because the previous tier stays temporarily effective, while new credit-pack checkout is unavailable.
  - If ordinary renewal recovery expires without verified funding, tier access ends and the retained purchased-credit balance freezes intact until explicit reactivation.
  - In phase one, customer-requested purchased-credit refunds and provider disputes are taught only through isolated Integration Lab scenarios; they are not customer-facing exercises in the normal AI-service or credit-purchase story.
  - The phase-one lab contains two distinct purchased-credit reversal fixtures: a customer-requested refund while purchased credits remain unused, and a provider dispute or chargeback after some purchased credits have already been consumed.
  - The customer-requested fixture uses a proportional unused-credit refund against one selected original purchased-pack grant: refundable units equal that grant's remaining unconsumed credits, and refundable service value derives from the original purchase snapshot rather than the current catalog.
  - The selected refundable units are locked while the provider refund is pending or uncertain. Verified refund success permanently removes those units, verified terminal failure releases them, and uncertainty cannot authorize further consumption, another refund, or a second reimbursement.
  - Historical tax for the unused-credit refund is restored proportionally from the original settled credit-pack transaction under REQ-0032; the current address or tax catalog cannot reprice it.
  - When a provider dispute or chargeback opens after some credits from the disputed purchased-pack grant have been consumed, only that grant's remaining units freeze; included allowance, unrelated purchased or refund-compensation grants, and the independently funded subscription remain unchanged.
  - A verified resolution in the merchant's favor unfreezes the disputed grant's remaining units. A verified resolution against the merchant permanently removes only those frozen remaining units and records the already-consumed units as delivered-service loss without creating a negative customer balance.
  - While a purchased-credit dispute remains open, new credit-pack checkout is blocked for the account, but subscription renewal, tier management, included allowance, unrelated eligible grants, and the existing primary recurring method remain governed by their normal independent rules.
  - A verified merchant-favorable dispute resolution automatically restores credit-pack purchasing. A verified merchant-adverse resolution leaves new top-ups blocked in `top_up_review_required` until an authorized administrator completes the separately approved account review.
  - Phase one represents the post-loss account review only through a read-only Integration Lab simulation with two inspectable outcomes: `top_ups_restored_after_review` and `top_ups_remain_blocked`.
  - Each purchased-credit reversal fixture is a matched PayPal-versus-Stripe pair. The pack, original service value, historical tax, usage, remaining units, customer state, timestamps, requested outcome, and normalized application policy remain constant; only verified or explicitly simulated provider evidence and provider-required timing may differ.
  - Both matched pairs originate from direct one-time card purchases: PayPal Advanced Card Payments on the PayPal side and a direct-card PaymentIntent on the Stripe side. Neither route requests vaulting, saving for future use, accelerator enrollment, or subscription-primary-method replacement.
  - Both pairs use one fixed Seattle purchase snapshot: 500 credits for $50.00 service value, 10.55% historical tax rounded to $5.28, and a $55.28 original gross charge.
  - The unused-credit refund pair fixes 120 consumed units and 380 refundable units, producing a $38.00 service refund, $4.01 historical proportional tax refund, and $42.01 gross refund.
  - The post-consumption dispute pair fixes 200 consumed units and 300 remaining units when the full $55.28 payment is disputed; merchant-favorable resolution unfreezes the 300, while merchant-adverse resolution removes the 300 and records 200 units of delivered-service exposure.
  - The unused-credit refund pair targets one retained sanitized successful sandbox refund snapshot for each direct-card provider lane. Until an exact lane has been captured and reviewed, its evidence level remains `documented` or `unverified`, never `sandbox_proven`.
  - The post-consumption dispute pair, its merchant-win or merchant-loss branches, and the later administrator-review outcomes are phase-one classifier or application-policy simulations. Every such card carries the appropriate simulation label and cannot be described as a live sandbox dispute.
  - Each provider card defaults to merchant impact—provider, direct one-time-card acquisition, evidence level, monetary movement, credit effect, top-up eligibility, subscription impact, and next action—while Integration Details separately exposes masked provider evidence, original grant provenance, historical calculation, normalized transitions, projected ledger effect, evidence metadata, and classifier metadata.
  - Phase-one controls are read-only: evidence inspection, simulated merchant-win or merchant-loss replay, simulated review-outcome replay, and return to comparison.
- Negative cases:
  - Redirect success without verified provider completion cannot add credits.
  - Renewal allowance resets cannot delete purchased-credit balance.
  - Scheduling cancellation cannot prematurely freeze credits before the effective service-access end timestamp.
  - Ordinary renewal recovery cannot freeze existing credits before its approved expiry or permit a new credit-pack purchase.
  - An inactive subscription cannot consume frozen purchased credits.
  - A refund obligation cannot add AI usage credits without explicit customer consent or settle the same amount through both credits and a monetary refund.
  - A partial balance cannot be consumed when the customer's combined eligible balance is insufficient to fund the complete action.
  - The uniform $0.10 calculation cannot be described as cash redemption, stored value, or a promise that credits can be exchanged back into money.
  - The prepaid-usage product definition cannot itself be represented as proof of taxability, the separately approved purchase-time rule, or a Washington digital-code classification; taxability remains a source-backed tax decision under REQ-0032.
  - A purchased-credit refund or dispute fixture cannot mutate a seeded persona, a self-registered audience account, its provider transaction, or its spendable balance, and cannot be presented as an available customer self-service workflow.
  - The unused-credit refund and post-consumption dispute cannot be blended into one ambiguous scenario or presented as if the provider determines the application's credit-entitlement policy.
  - A refund cannot use the current credit-pack price, another grant's unit value, or the combined visible credit balance to calculate the selected grant's refundable service value.
  - Credits locked for an unresolved refund cannot be spent, transferred to another refund attempt, or silently released merely because a browser return or timeout occurred.
  - An open or lost purchased-credit dispute cannot claw back included allowance, freeze unrelated grants, cancel or downgrade the subscription, or make future allowance or credit purchases repay already-consumed disputed units.
  - A dispute webhook, browser event, or provider balance movement cannot remove or unfreeze credits without a normalized, verified dispute state tied to the original purchased-pack grant and payment.
  - The top-up risk gate cannot suspend AI access funded by the active subscription or unrelated legitimate credits, cancel the subscription, change its tier, replace its primary recurring method, or block ordinary subscription renewal.
  - An unresolved or merchant-adverse dispute cannot be bypassed by choosing another one-time payment method for a new credit pack.
  - The phase-one review simulation cannot mutate a real demo account, restore or block its actual checkout eligibility, call a PSP, upload evidence, assign a case, or imply that a production risk-review system exists.
  - Matched Compare cannot change the credit pack, usage amount, tax snapshot, refund obligation, dispute exposure, or entitlement result merely to make one provider lane easier to demonstrate.
  - The purchased-credit fixtures cannot imply that direct card entry creates a reusable method, that Fastlane or Link participated, or that a top-up changes the recurring subscription primary.
  - A provider lane cannot reprice, round differently, or change the fixed matched fixture values; any provider limitation or differing raw amount representation remains visible as evidence rather than changing normalized application truth.
  - A documented or simulated dispute fixture cannot be promoted to `sandbox_proven`, and the lab cannot imply that its provider case, win or loss, or administrator review actually occurred.
  - A purchased-credit reversal card cannot expose refund submission, refund retry, dispute response, evidence upload, credit mutation, top-up restoration, subscription mutation, recurring-method mutation, or provider-console mutation.
- Dependencies: REQ-0006, REQ-0023, REQ-0024, REQ-0032, REQ-0033, direct-card provider fulfillment, and retained refund evidence
- Affected surfaces: low-allowance warning, credit store, checkout, ledger, entitlement service, account history
- Required test types: unit, integration, interaction, sandbox
- Required evidence types: backend, interaction, provider, failure
- Exclusions: permanent unversioned pack pricing, credit transfer, cash redemption, real purchased-credit dispute mutation, and production risk-case management
- Payment-domain review required: yes
- Payment-domain review reason: one-time payment fulfillment, refunds, disputes, and wallet availability vary by provider
- Design links: design-system/pages/ai-service-simulator.md, design-system/pages/allowance-window-lifecycle.md, design-system/pages/h5-credit-purchase.md, design-system/pages/integration-lab.md, design-system/pages/tax-mapping.md, design-system/pages/tier-change-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: design-system/research/2026-07-28-purchased-credit-reversal-fixtures.md

### REQ-0009 — Reserve primary payment-method changes for payment management

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:payment-management
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: capture method-by-method sandbox evidence for the approved replacement and cleanup contracts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:payment-management
- Acceptance:
  - A dedicated payment-management surface is the only customer route that changes the subscription's primary reusable payment method.
  - The surface explains provider-specific replacement, consent, and future-use consequences before confirmation.
  - An explicit `tax_suspended` reactivation may open the same dedicated recurring-method-management subflow in context, with the existing eligible primary preselected.
  - The reactivation subflow states that a newly selected method pays today's reactivation charge and, only after reusable-token verification, becomes the method for future automatic renewals.
  - A replacement candidate cannot become primary until both verified funding and verified reusable-token evidence belong to the same approved operation and ownership chain.
  - After the replacement is primary, the old credential is blocked locally before provider deletion or detachment begins; provider-cleanup uncertainty cannot reactivate it.
- Negative cases:
  - Buying credits or paying with an alternate method does not silently replace the subscription primary method.
  - A failed or abandoned reactivation cannot change the primary method.
  - The old credential cannot be revoked before the replacement is verified and promoted.
  - Cleanup failure cannot roll back the new primary, paid term, or entitlement.
- Dependencies: REQ-0004 and provider-specific management research
- Affected surfaces: account billing, payment-method management, provider adapters
- Required test types: integration, interaction, sandbox
- Required evidence types: backend, interaction, provider, failure
- Exclusions: cross-provider migration of an existing token
- Payment-domain review required: yes
- Payment-domain review reason: add, replace, consent, and redisplay behavior is provider-specific
- Design links: design-system/pages/reactivation-payment-method.md, design-system/pages/admin-account-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0010 — Treat alternate methods during purchase as one-time payment

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:alternate-payment-method
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve payment selection and consent copy
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:alternate-payment-method
- Acceptance:
  - When an existing customer chooses a different payment method during a one-time purchase, the method pays only that transaction unless the customer entered the dedicated management flow.
  - Saved Apple Pay customers are offered a different payment method for scenarios where the original Apple Pay credential cannot support the required return-buyer action.
- Negative cases:
  - The purchase flow does not add an extra save-for-future choice or silently vault the alternate method.
- Dependencies: provider eligibility and wallet reuse research
- Affected surfaces: credit checkout, balance recovery, payment selection, receipts
- Required test types: integration, interaction, sandbox
- Required evidence types: interaction, backend, provider, failure
- Exclusions: primary-method replacement and unsupported wallet redisplay
- Payment-domain review required: yes
- Payment-domain review reason: instant payment, wallet eligibility, and reuse semantics differ across providers
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0011 — Create and restore application accounts within the customer journey

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:account-journeys
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-005
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the remaining suspended-account and stale-commercial-state treatments before implementation planning
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-09:temporary-demo-expiry-visual-approved
- Earlier approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:account-journeys
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-04:real-email-checkout-resume-option-a
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-09:persistent-account-sign-in-methods-approved
- Acceptance:
  - A brand-new signed-out customer can provide email, verify or create the Supabase account inline, and resume the selected tier or credit intent.
  - An existing signed-out customer can authenticate and resume the same intent with current arrangement and safe masked methods restored.
  - An existing signed-in customer skips identity collection and proceeds from current account state.
  - In the hosted Customer Story, a browser can request a high-entropy `.test` alias, receive a session-bound demonstration OTP through the real Supabase email-OTP verification path, and resume its selected intent after successful verification.
  - The demonstration OTP is retained only in a private server-side store for five minutes, is retrievable only by the originating signed HttpOnly demo session, and is deleted after successful verification or expiry.
  - A fixed mock code is restricted to an explicitly labeled Integration Lab simulation and cannot create or verify a Supabase session.
  - While its originating browser session remains available, a verified `.test` `demo_identity` can complete the full sandbox customer journey: subscribe through an eligible PayPal or Stripe lane, create and use reusable sandbox credentials, consume simulated AI allowance, buy credits, upgrade, downgrade, cancel, reactivate, and use payment management.
  - The server owns an explicit demo-session expiry timestamp; reaching it automatically suspends the `demo_identity` even if the browser never returns.
  - The `.test` active interval is a fixed twenty-four hours from temporary-account creation and does not slide or restart because of customer activity.
  - Every merchant-owned signed-in Customer Story surface keeps the temporary-account status and remaining time visible; the presentation becomes a clear warning at one hour remaining and a critical warning at ten minutes remaining.
  - The displayed countdown derives from the server-owned expiry timestamp and cannot extend the session; provider-owned approval windows or redirects are not represented as carrying the merchant indicator.
  - When fifteen minutes or less remain, the customer can continue simulated AI usage and read-only exploration but cannot start a new subscription checkout, tier change, credit purchase, reactivation, or payment-method operation.
  - An operation started before the cutoff receives a deadline equal to the earlier of its ordinary quote or operation expiry and the fixed demo-session expiry.
  - Provider-confirmed effective completion on or before that deadline is reconciled idempotently even when evidence arrives later, but the `.test` account still suspends at its fixed session expiry.
  - A customer who verifies a real email owns a persistent account whose subscription, allowance, purchased credits, usage, transaction, reusable-payment references, and lifecycle history remain available across all future visits until an authorized lifecycle action changes or deletes the account.
  - Email OTP is the default persistent-account sign-in and recovery route; after OTP authentication, the customer may optionally set or change a password in Account Settings and may later choose either OTP or password sign-in for the same account.
  - Password recovery uses verified email OTP followed by setting a new password in Account Settings; the pilot does not require a separate forgot-password link or password-reset-email workflow.
  - Signed-out entry makes `Start a 24-hour demo` the primary action and `Use my real email for a persistent account` the secondary action while preserving the customer's selected tier or credit-purchase intent through either route.
  - Persistent real-email entry always presents `Continue with email code` as the primary action and `Use password instead` as an explicit secondary action; selecting the latter opens the password form without a public account or password-capability lookup.
  - Account Settings always shows verified email-code access as available, shows password as either `Not set` or `Enabled`, and exposes only `Set password` or `Change password` as applicable.
  - Setting or changing a password uses Supabase secure-password-change reauthentication: a session created within the documented twenty-four-hour recent-sign-in window continues directly, while an older session verifies a fresh email OTP and resumes the same password task.
  - The approved responsive persistent-account surface covers password-not-set, recent-session password setup, older-session email-code reauthentication, password-enabled durable state, returning password sign-in, and generic wrong-password recovery on laptop and narrow mobile.
  - Successful authentication returns the customer to an order-review step for the preserved intent and cannot itself submit a payment; changed or expired pricing, tax, availability, or quote state is recalculated and requires fresh customer confirmation.
  - Wrong-password, invalid-OTP, expired-OTP, and resend-throttle states retain the safe pending intent and provide a generic recovery action without revealing whether an account or password exists.
  - Conversion from `demo_identity` to a persistent real-email account remains a separate future UX decision.
- Negative cases:
  - Authentication does not discard the selected offer, create duplicate application accounts, or expose full provider credentials.
  - Demonstration OTPs never enter logs, analytics, URLs, or browser storage, and another browser cannot retrieve an OTP by knowing or guessing its `.test` alias.
  - Dismissing a warning, navigating between pages, refreshing, or returning from a provider flow cannot reset or hide the authoritative expiry.
  - A stale client cannot bypass the final fifteen-minute cutoff; the backend checks the authoritative session deadline before creating any new money-moving or credential-changing operation.
  - Evidence arrival after expiry cannot by itself invalidate a proven on-time completion or extend the demo session.
  - Signing out, closing the browser, or allowing an authentication session to expire cannot delete or reset a persistent real-email account.
  - An administrator cannot recover a customer account by assigning a shared or predictable default password; a customer who controls the real email recovers through OTP.
  - Authentication success cannot charge the customer, accept stale commercial terms, create duplicate accounts or payment attempts, or bypass an application-account suspension.
  - The pilot cannot expose a public forgot-password flow, password-removal control, email-code disablement, remembered-browser method preference, or differential response that confirms account or password existence.
- Dependencies: REQ-0002 and Supabase authentication research
- Affected surfaces: pricing, checkout, authentication, account, mobile return
- Required test types: integration, interaction, security
- Required evidence types: interaction, backend, failure, accessibility
- Exclusions: PayPal, Link, Fastlane, or Apple as the application account authority
- Payment-domain review required: yes
- Payment-domain review reason: payment accelerators may add authentication but must not own application identity
- Design links: design-system/pages/account-entry-and-settings.md, mockups/real-email-checkout-resume-options.html, mockups/persistent-account-sign-in-methods.html
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0012 — Preserve normalized state and raw provider provenance

- Audience: operator
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:normalized-and-raw-state
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve authoritative data and event contracts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:normalized-and-raw-state
- Acceptance:
  - The entitlement engine determines access from verified normalized application state.
  - Raw provider events, provider object identifiers, acquisition route, and relevant state are retained alongside normalized state for replay and diagnosis.
  - For a `.test` operation crossing session expiry, the normalized decision retains separate operation deadline, provider-effective completion, and evidence-arrival timestamps.
  - A provider-effective completion after the operation deadline, or evidence that cannot establish whether completion was on time, enters `payment_timing_review` without entitlement grant, recurring-credential promotion, retry, or another charge.
- Negative cases:
  - Provider payloads cannot overwrite immutable history, and a browser redirect cannot directly grant entitlement.
  - The application cannot substitute webhook arrival time for provider-effective completion time or classify uncertain timing as on-time merely to grant access.
- Dependencies: webhook, polling, reconciliation, and data-retention design
- Affected surfaces: backend, database, entitlements, diagnostics, Integration Lab trace
- Required test types: unit, integration, security
- Required evidence types: backend, failure
- Exclusions: storing prohibited payment credentials or unnecessary personal data
- Payment-domain review required: yes
- Payment-domain review reason: provider event authority, object lifecycle, and provenance are PSP-specific
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0013 — Provide three connected Integration Lab tools

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:three-tool-lab
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade lab visual artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:three-tool-lab
- Acceptance:
  - The Integration Lab contains connected Scenario Builder, Matched Compare, and Capability Matrix tools.
  - Shared context such as market, platform, integration route, customer state, and business intent transfers between tools.
  - Phase one prioritizes the integration expert as the hands-on operator; a Merchant Summary presents the same run to merchants without changing its facts.
  - The initial launcher offers three investigation intents: explore one checkout solution, compare equivalent solutions, or investigate a special scenario.
  - The last editable investigation workspace is application-owned state for the authenticated Integration Lab operator and is restored when that operator returns from another supported browser or device.
  - The restored workspace is visibly identified by investigation, last-edited context, and signed-in synchronization; it cannot be confused with a simulated customer's subscription or payment state.
  - Starting a new investigation while a restored workspace exists requires one explicit choice: reuse the restored shared context or begin with empty context. A first visit with no stored workspace begins with no active context.
  - A completed run may be retained as a lightweight investigation snapshot containing its locked inputs, normalized outcome, evidence level, and operator note. Later notes or evidence gaps cannot rewrite the recorded facts of that run.
- Negative cases:
  - The tools do not silently change starting assumptions when a customer follows a cross-tool link.
  - Browser-local storage may retain presentation preferences such as theme, but it is not the authority for the cross-device editable workspace or completed run facts.
- Dependencies: REQ-0014, REQ-0015, REQ-0016
- Affected surfaces: Integration Lab navigation and shared scenario context
- Required test types: interaction, browser
- Required evidence types: interaction, responsive, accessibility
- Exclusions: direct production PSP control or merchant-account mutation from the lab
- Payment-domain review required: yes
- Payment-domain review reason: lab claims and scenario availability depend on PSP evidence
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0014 — Build guided scenarios with inspectable process traces

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:scenario-builder
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: bind the approved PayPal vaulted-card Builder to exact current provider evidence through the Payment Knowledge Gate
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:scenario-builder
- Acceptance:
  - The builder configures business intent, customer state, subscription state, platform, integration route, provider, payment method, commercial rules, and optional failure conditions.
  - A run exposes customer journey steps and a synchronized technical trace of provider objects, events, normalized transitions, and fulfillment.
- Negative cases:
  - Unsupported combinations are blocked or clearly identified as research/mock states rather than executed as genuine integrations.
- Dependencies: REQ-0012, REQ-0016
- Affected surfaces: builder controls, run timeline, state trace, evidence drawer
- Required test types: unit, interaction, browser
- Required evidence types: interaction, backend, responsive
- Exclusions: arbitrary API request construction and secret entry
- Payment-domain review required: yes
- Payment-domain review reason: each runnable provider chain must match documented PSP semantics
- Design links: design-system/pages/integration-lab.md, mockups/integration-lab-scenario-builder-paypal-vaulted-card.html
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0015 — Compare equivalent outcomes through staged provider-neutral lanes

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-10:staged-provider-neutral-comparison-lanes
- Earlier approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:matched-compare
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the first detailed Matched Compare workflow
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-10:staged-provider-neutral-comparison-lanes
- Acceptance:
  - A provider-neutral comparison set locks customer, market, platform, route, amount, package or tier, and target business outcome before creating provider lanes.
  - PayPal and Stripe are the phase-one runnable provider families; Adyen and Braintree can participate as explicitly source-backed research lanes without implying sandbox or E2E proof.
  - A research lane exposes its supported, constrained, unsupported, or unresolved capability claim, source, verification date, evidence gap, and promotion status, but contains no fabricated provider objects or run result.
  - A research lane can later be promoted through configured and sandbox-verified states into a runnable lane without redesigning the comparison set or rewriting prior immutable runs.
  - Results compare customer steps, authentication, consent, provider objects, webhooks, fulfillment, return behavior, management consequences, and configurable economics.
  - Non-equivalent provider constraints are made explicit.
- Negative cases:
  - The comparison does not alter one side to manufacture visual or semantic parity.
  - Official provider support is not presented as though the demo has integrated or executed it.
  - An unsupported or research-only lane cannot be displayed as a failed executable run.
- Dependencies: REQ-0014, REQ-0016
- Affected surfaces: Matched Compare setup, provider-lane catalog, compatibility gate, split trace, difference summary, evidence drawer
- Required test types: unit, interaction, manual
- Required evidence types: interaction, provider, responsive
- Exclusions: phase-one runnable Adyen or Braintree integrations, declaring a universal winner, or hard-coding merchant-specific fees
- Payment-domain review required: yes
- Payment-domain review reason: provider equivalence and differences require current source evidence
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0016 — Separate provider capability from demo evidence

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:capability-matrix
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: bind exact current provider sources through the Payment Knowledge Gate before implementation planning
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-11:evidence-refresh-option-a-approved
- Acceptance:
  - Every capability cell reports provider status independently from demo proof status.
  - Capability states include supported, supported with constraints, unsupported, not applicable, and research unresolved.
  - Evidence states distinguish official documentation, local wiki, lab mock, local integration, and E2E verification.
  - A cell exposes the exact claim, constraints, route, storefront, sources, last verification date, gaps, and links to build or compare the scenario.
- Negative cases:
  - Official provider support is not displayed as though the demo has implemented or verified it.
- Dependencies: evidence registry and Payment Knowledge Gate
- Affected surfaces: Capability Matrix, evidence drawer, Builder and Compare handoffs
- Required test types: unit, interaction, manual
- Required evidence types: static, interaction, provider
- Exclusions: unsourced capability inference
- Payment-domain review required: yes
- Payment-domain review reason: provider capability status is a payment-domain claim
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0017 — Present merchant and integration detail views

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:dual-presentation
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve representative desktop and mobile lab surfaces
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-27:renewal-merchant-integration-detail-boundary
- Acceptance:
  - Lab results default to concise customer journey, outcome, and merchant implications.
  - An Integration details control reveals API objects, webhooks, normalized state, payment-method provenance, evidence, and timing without changing the scenario.
  - For renewal recovery, the merchant summary shows the business outcome, customer-access and allowance effects, purchased-credit availability, recurring primary, automatic-retry status and reason, customer action, merchant action, next checkpoint, and operational owner.
  - Renewal Integration Details expose the normalized outcome and classification rule, raw provider status and advice, masked provider objects and idempotency identity, acquisition provenance, request and webhook timeline, provider effective timestamp versus evidence arrival, retrieval or same-request replay history, next permitted transition, and entitlement effect.
  - Full Integration Details are available inside the Integration Lab but do not appear in the normal customer account experience.
- Negative cases:
  - Technical detail is not required to understand the merchant story, and the concise view does not hide provider constraints.
  - A customer-facing recovery surface cannot expose raw PSP error codes, object identifiers, idempotency data, or internal ownership and reconciliation diagnostics.
- Dependencies: REQ-0012, REQ-0013
- Affected surfaces: all Integration Lab result views
- Required test types: interaction, accessibility, browser
- Required evidence types: interaction, responsive, accessibility
- Exclusions: separate duplicate lab implementations for merchants and experts
- Payment-domain review required: yes
- Payment-domain review reason: the integration view exposes PSP-specific chains and evidence
- Design links: design-system/pages/integration-lab.md, design-system/pages/allowance-window-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0018 — Model platform and integration route independently

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:mobile-route-taxonomy
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-006
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: complete route-specific provider research
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:mobile-route-taxonomy
- Acceptance:
  - Lab scenarios separately identify platform, launch context, integration route, storefront, provider, payment method, return mechanism, and evidence level.
  - PSP comparisons hold the integration route constant; route comparisons hold PSP and business outcome constant.
  - Web, H5, future native SDK, and React Native routes share the same server-authoritative allowance-window contract; a client can propose and display a timezone but cannot calculate, grant, reset, or move allowance.
- Negative cases:
  - H5 redirect, native SDK, and React Native SDK are not treated as interchangeable labels for mobile support.
  - A different client route or device timezone cannot silently change an existing subscription anchor.
- Dependencies: platform-policy and provider-SDK evidence
- Affected surfaces: Capability Matrix, Scenario Builder, Matched Compare
- Required test types: unit, interaction
- Required evidence types: static, interaction, provider
- Exclusions: claiming implementation parity across platforms
- Payment-domain review required: yes
- Payment-domain review reason: available provider and wallet behavior depends on platform and integration route
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/integration-lab.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0019 — Scope the first app-to-web pilot to the US iOS storefront

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:us-ios-h5-scope
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-009
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: web E2E completion and current Apple-policy re-verification
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:us-ios-h5-scope
- Acceptance:
  - The first native-app-to-web checkout pilot is explicitly gated to the US iOS storefront.
  - The route records storefront eligibility, browser handoff, verified fulfillment, Universal Link return, and entitlement refresh.
  - A later H5 subscription purchase carries a server-controlled device-timezone proposal, compares it with the H5-detected timezone, and requires explicit confirmation of any mismatch before funding.
  - Other regions remain visible as research-only policy rows.
- Negative cases:
  - The demo does not describe H5 redirect as universally avoiding Apple fees or as globally permitted.
- Dependencies: REQ-0003 and current Apple, PayPal, and Stripe official evidence
- Affected surfaces: iOS entry, H5 checkout, backend, Universal Link return, Capability Matrix
- Required test types: integration, interaction, hosted, manual
- Required evidence types: backend, provider, hosted, responsive, failure
- Exclusions: non-US production eligibility and legal or contractual advice
- Payment-domain review required: yes
- Payment-domain review reason: regional app-store rules and provider routes are volatile payment constraints
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/h5-credit-purchase.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0020 — Prove H5 credit purchase before H5 subscription purchase

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:h5-credit-first
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-008
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: web E2E completion and H5 slice proposal
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:h5-credit-first
- Acceptance:
  - The first H5 E2E proves low-allowance entry, app-to-browser checkout, verified webhook fulfillment, idempotent credit addition, Universal Link return, and refreshed balance.
  - H5 subscription purchase follows only after the credit flow establishes the shared handoff and fulfillment contracts.
  - Buying credits through H5 cannot create, replace, or move the existing subscription or allowance anchor.
- Negative cases:
  - Browser return alone cannot credit the account, and repeated provider events cannot duplicate credits.
  - H5 or device timezone detection during a credit-only purchase cannot change the existing allowance schedule.
- Dependencies: REQ-0008, REQ-0019
- Affected surfaces: iOS low-allowance state, H5 checkout, webhook processing, credit ledger, app return
- Required test types: unit, integration, interaction, hosted
- Required evidence types: backend, provider, hosted, failure, responsive
- Exclusions: native in-app payment and subscription purchase in the first H5 slice
- Payment-domain review required: yes
- Payment-domain review reason: provider checkout, webhooks, and mobile return must be verified end to end
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/h5-credit-purchase.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0021 — Compare evidence-supported payment-method lanes

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:payment-method-lanes
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-003
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: complete method-by-method Payment Knowledge Gate
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-27:payment-method-renewal-boundaries
- Acceptance:
  - The lab is capable of representing PayPal Wallet vaulting, Stripe card reuse, PayPal Apple Pay recurring scenarios, and Stripe Google Pay recurring scenarios where exact evidence supports them.
  - PayPal card vaulting and Stripe Apple Pay recurring are included as comparison candidates.
  - Link and Fastlane are shown as acquisition/payment accelerators with their provenance and constraints rather than application identities.
  - Every subscription has exactly one explicit recurring primary credential; PayPal Wallet, PayPal-saved Apple Pay, PayPal card, Stripe card, Stripe-saved Google Pay, Stripe-saved Apple Pay, and Link are separate acquisition or management scenarios rather than automatic fallback sources.
  - Direct PayPal card and Fastlane-acquired card are distinct customer-present acquisition experiences. After verified vault creation, both renew through the resulting PayPal card vault identifier; a Fastlane single-use token and Fastlane authentication are never used for an ordinary merchant-initiated renewal.
  - A Fastlane profile remains a PayPal checkout identity, not the Supabase application account. Its email lookup and authentication are invoked only when acquiring or replacing the card.
  - Stripe card-specific Link is the approved Pro Max customer-story route. It yields a reusable card PaymentMethod while retaining Link acquisition provenance; the native Link PaymentMethod model remains an Integration Lab-only comparison candidate.
  - Stripe card, card-specific Link, Google Pay, and Apple Pay lanes each retain their own reusable PaymentMethod as the subscription primary. Every renewal creates a new off-session PaymentIntent against only that primary PaymentMethod.
  - A PayPal Wallet recovery may return the buyer to PayPal to choose an eligible underlying funding source while the application's recurring primary remains the same PayPal vault token.
  - A PayPal-saved Apple Pay credential can fund an eligible merchant-initiated recurring charge but cannot be redisplayed as an ordinary returning-buyer method. Buyer-present recovery defaults to a different one-time method; replacing the subscription primary requires a fresh dedicated Apple Pay setup and verified new vault identifier.
- Negative cases:
  - A lane cannot be labeled supported, reusable, recurring, or comparable merely because its payment mark can be rendered.
  - The scheduler cannot silently try another wallet, Link profile, card, PSP, or one-time recovery method after the explicit recurring primary fails.
  - An original Stripe PaymentIntent identifier or Fastlane single-use token cannot be stored or charged as the future recurring credential.
  - Shared provider response handling cannot erase acquisition provenance or imply that Google Pay, Apple Pay, Link, and direct card were tested as interchangeable funding methods for one subscription.
- Dependencies: REQ-0002, REQ-0004, REQ-0016
- Affected surfaces: customer checkout, payment management, Scenario Builder, Matched Compare, Capability Matrix
- Required test types: integration, interaction, sandbox, hosted
- Required evidence types: provider, backend, interaction, hosted
- Exclusions: guaranteeing eligibility for every merchant, buyer, device, browser, country, or currency
- Payment-domain review required: yes
- Payment-domain review reason: wallet presentation, vaulting, reuse, recurring eligibility, and accelerator behavior are PSP-specific
- Design links: design-system/pages/seeded-personas.md, design-system/pages/allowance-window-lifecycle.md, design-system/pages/integration-lab.md, design-system/pages/reactivation-payment-method.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0022 — Define four service tiers

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-tier-model
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade pricing, comparison, and account visual artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:focused-four-tier-product-model
- Acceptance:
  - Go costs $10 monthly, includes 100 monthly units, and permits Generate answer.
  - Plus costs $25 monthly, includes 300 monthly units, and adds Analyze document.
  - Pro costs $50 monthly, includes 800 monthly units, and adds Create image.
  - Pro Max costs $100 monthly, includes 2,000 monthly units, and adds Batch-analyze documents.
  - Each tier inherits every lower-tier action, and all four action cards remain visible in a stable order.
  - An unavailable action is explicitly tier locked with its required tier, unit cost, capability explanation, and eligible upgrade route.
  - A tier lock is distinct from insufficient usage: purchased credits can fund an eligible action but can never unlock an action excluded by the effective tier.
  - All tiers share the same simulated-output quality, deterministic timing, single-user account model, usage history, purchased-credit behavior, payment management, and support treatment.
- Negative cases:
  - Tiers must not differ only through decorative labels.
  - The pilot cannot claim tier-specific named AI models, production inference quality, priority support, team seats, data retention, generation speed, image resolution, or document-size promises.
  - A locked action cannot reserve or consume usage.
- Dependencies: REQ-0026, REQ-0027, REQ-0028, and product positioning
- Affected surfaces: pricing, entitlements, usage, account management
- Required test types: requirements review
- Required evidence types: static
- Exclusions: production model access, performance or support SLAs, teams, enterprise administration, and implementation before visual and slice approval
- Payment-domain review required: no
- Payment-domain review reason: the approved product packaging does not assert PSP behavior
- Design links: design-system/pages/ai-service-simulator.md, design-system/pages/tier-change-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0023 — Define upgrade and downgrade financial treatment

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-tier-change-rules
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-004
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: assign the approved behavior to a tier-management slice; exact routes remain unable to claim `sandbox_proven` until their required refund snapshots exist
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-12:req-0023-product-rules-approved-evidence-gated
- Acceptance:
  - Define deterministic upgrade and downgrade outcomes for billing, entitlement, allowance, and customer communication.
  - An upgrade takes effect immediately only after its rounded non-zero prorated adjustment payment succeeds or an approved rounded-zero adjustment is recorded as verified application-ledger evidence; a failed or incomplete non-zero payment leaves the original tier active.
  - A successful immediate upgrade preserves the customer's unconsumed included allowance and adds only the prorated difference between the new tier's and old tier's full-period included allowances.
  - The backend captures one exact `proration_at` timestamp when it creates the upgrade quote and stores the applicable billing-period and allowance-period remaining fractions with that quote.
  - Each remaining fraction equals `(applicable_period_end - proration_at) / (applicable_period_end - applicable_period_start)`, using authoritative UTC instants and clamping the result to the inclusive range from zero through one.
  - A monthly subscription uses the same monthly remaining fraction for its quoted adjustment charge and included-allowance increment; neither is recalculated at payment-success time.
  - An annual subscription uses its annual billing-period remaining fraction for money and its current monthly allowance-period remaining fraction for included units; both derive from the same `proration_at` timestamp and are locked in the same quote.
  - A same-cadence annual tier upgrade takes effect immediately after verified non-zero adjustment-payment success or a recorded rounded-zero adjustment and preserves the existing annual renewal timestamp.
  - Its adjustment charge equals `(target tier discounted annual price - current tier discounted annual price) × annual billing-period remaining fraction` before the separately approved currency-rounding step.
  - Each tier's discounted annual price remains ten percent below twelve normal monthly periods; the upgrade does not restart the annual term or stack another annual discount.
  - The next renewal uses the target tier's normal discounted annual price at the preserved renewal timestamp.
  - An annual-to-monthly change is an immediate replacement rather than a scheduled same-arrangement downgrade: the current annual arrangement ends at the conversion timestamp, its refundable unused service value is returned, and a new monthly arrangement begins after verified non-zero monthly payment success or a recorded rounded-zero charge adjustment.
  - The annual refund basis is the sum of the unearned portions of eligible settled annual-service ledger items at `proration_at`, using each item's own service interval; it is not recomputed from the current catalog price.
  - The new monthly arrangement charges the target tier's normal monthly price without restarting introductory eligibility and establishes a new monthly billing and allowance window at the conversion timestamp.
  - The closed annual allowance window does not carry unused included units into the new monthly window; the new target tier starts with its full approved monthly allowance, while the preexisting purchased-credit balance remains unchanged before any separately consented refund-compensation entry.
  - The conversion quote shows the new monthly charge, annual refund, and net customer effect as distinct values, and the account history retains separate charge and refund ledger entries.
  - Each non-zero refund is routed through the PSP and eligible settled provider transaction that originally received the refundable service payment; changing the subscription primary method does not migrate that historical transaction or its refund route.
  - The replacement cadence's non-zero initial charge uses the customer's current explicit subscription primary reusable method, even when that method belongs to a different PSP from the refundable original transaction.
  - A cross-provider conversion preserves independent provider operations and application-ledger movements rather than attempting to net a refund owed by one PSP against a charge sent to another PSP.
  - If the current explicit subscription primary is unusable, the application blocks the replacement charge and routes the customer to dedicated payment management; it does not silently reuse the original PSP or promote an alternate one-time method.
  - The normal Customer Story may demonstrate the simpler same-provider case, while the Integration Lab exposes a cross-provider case with original-transaction provenance, current-primary provenance, both movements, and their reconciliation states.
  - Before charging the replacement cadence, the application checks its ledger and retrieves available provider state to confirm that every required original movement still appears refund-eligible; this preflight reduces avoidable failures but cannot be presented as a guarantee that a submitted refund will complete.
  - Refund support uses a dual-axis matrix: the customer-visible acquisition or funding lane retains PayPal Wallet, Apple Pay, Google Pay, direct card, Link, or Fastlane provenance, while execution and eligibility follow the eligible original PayPal capture or Stripe PaymentIntent or Charge.
  - PayPal Wallet, PayPal Apple Pay, direct PayPal vaulted card, and Fastlane-acquired PayPal card transactions share the PayPal Payments v2 capture-refund family; each refund uses the original funded transaction's capture ID rather than the current recurring primary, a PayPal wallet's inferred underlying source, a vault ID, a Fastlane profile, or a Fastlane single-use token.
  - Stripe direct card, card-specific Link, Google Pay, Apple Pay, and native Link transactions use a Stripe Refund against the original PaymentIntent or Charge; the visible lane and exact PaymentMethod type remain provenance and evidence rather than separate application refund engines.
  - The matrix records `documented`, `sandbox_proven`, `unsupported`, or `unverified` independently for each exact lane. Provider-family documentation cannot be presented as exact pilot-route sandbox proof.
  - The first web release uses a lean refund-evidence gate. It requires one retained successful exact-route sandbox refund snapshot for each Customer Story lane: PayPal Wallet, PayPal-processed Apple Pay, Stripe-processed Google Pay, and Stripe card acquired through card-specific Link.
  - The five lab-only lanes—direct PayPal vaulted card, Fastlane-acquired PayPal card, Stripe direct card, Stripe Apple Pay, and native Link PaymentMethod—remain visible in the Capability Matrix with `documented`, `unsupported`, or `unverified` evidence and an explicit missing-proof checklist. They cannot expose a live run or claim `sandbox_proven` until their own exact-route evidence exists.
  - Phase one includes exactly two matched negative classifier simulations for the same business obligation: a cross-cadence replacement payment has succeeded, the replacement plan is active, a partial refund remains owed against the original payment, and a dispute begins around the refund.
  - The PayPal-family simulation uses the documented partial-refund response `TRANSACTION_DISPUTED`, which prevents refund creation while an open case exists. It normalizes to `refund_blocked` with `open_dispute`; compensation and any new refund submission remain locked while the next action routes the merchant to review or resolve the PayPal case.
  - The Stripe-family simulation shows an accepted refund moving from `pending` to `failed` with `failure_reason=charge_for_pending_refund_disputed`. Despite the raw `failed` status, it normalizes to `refund_blocked` with `open_dispute`, not `refund_failed`; compensation and any new refund submission remain locked while the next action routes the merchant to accept or challenge the Stripe dispute.
  - Both simulations can be reclassified only after verified provider evidence changes. Each is labeled `classifier_simulation`, uses a sanitized fixture, demonstrates the timing difference between the provider responses and the same duplicate-reimbursement safety decision, and is never counted or worded as provider sandbox proof.
  - The matched fixture uses one synthetic annual-Pro-to-monthly-Pro-Max Seattle scenario at the halfway point of the annual service interval. The original annual service amount is $540.00 with $56.97 historical tax, the established partial-refund obligation is $270.00 service plus $28.49 historical tax for $298.49 gross, and the verified replacement payment is $100.00 service plus $10.55 tax for $110.55 gross, producing a $187.94 net customer refund effect. These values are fixed educational fixture data rather than a provider quote or live customer record.
  - Both cards show the same synthetic scenario identifier, masked refund-obligation and tier-change identifiers, currency, amounts, synthetic event clock, normalized outcome and reason, compensation gate, movement gate, and merchant explanation. Provider-specific masked original-payment, request, and refund identifiers appear only when that provider timeline establishes them; the PayPal card explicitly shows that no refund identifier was created.
  - The merchant view leads with business impact and the exact shared warning: the replacement plan remains active, the refund is blocked by a dispute, and the merchant must not issue another refund or AI-credit compensation. Integration Details separately exposes the sanitized raw provider excerpt, synthetic timeline, classification rule and version, evidence-label meaning, and provider-specific next action.
  - Fixture artifacts use stable pseudonymous identifiers and synthetic timestamps. They contain no real customer or application-user identifier, email, provider credential, complete provider transaction or request identifier, reusable token, direct personal data, or payload field unrelated to the teaching point.
  - The only fixture actions are to inspect evidence, view provider dispute guidance, and return to the comparison. Retry refund, create a new refund, grant AI credits, mark resolved, or mutate customer state are absent or explicitly disabled.
  - Phase one does not provide audience-triggered live refunds, automated evidence setup or reset for all nine lanes, reproduction of every provider failure state, a general-purpose evidence orchestration engine, or automated evidence-freshness monitoring.
  - A successful refund snapshot records the visible acquisition lane, provider and environment, masked original transaction authority, refund amount and currency, masked provider refund identifier, raw provider status, normalized outcome, evidence time, and a sanitized provider-response reference. It contains no secret, reusable credential, complete provider identifier, or direct personal data.
  - Refund proof is historical evidence with an explicit verification date and selected provider configuration; it is not a permanent capability promise. Official documentation and selected exact routes are refreshed before implementation and merchant delivery.
  - Capturing or refreshing refund proof cannot mutate a ready seeded persona's active subscription, entitlement, allowance, purchased-credit balance, or current primary method merely to produce a lab artifact. A proof transaction or provisioning run must be isolated from the persona state being demonstrated.
  - Refund eligibility is dynamic per original transaction, not a permanent yes or no attached to a displayed payment method. Preflight evaluates provider and merchant ownership, environment, successful settlement, age, currency, remaining refundable amount, dispute state, provider availability, and exact-route restrictions.
  - PayPal's documented 180-day refund window is an approved preflight rule for the pilot. A PayPal capture older than 180 days is known provider-ineligible, including a late annual-to-monthly replacement, and enters the approved customer compensation choice before replacement charging.
  - Stripe's general card-refund documentation publishes no equivalent universal age cutoff. The application does not invent a fixed Stripe duration or promise unlimited refundability; it retrieves and evaluates the exact original PaymentIntent or Charge and applies method-specific evidence.
  - Customer-facing wording identifies the original visible payment lane without guessing an underlying PayPal Wallet funding source. The Integration Lab exposes acquisition provenance, refund execution family, evaluated eligibility facts, documentation and sandbox evidence levels, provider request and result, and normalized refund composition.
  - Refund response handling is layered: the application preserves immutable raw provider evidence, then derives a provider-neutral outcome, normalized reason, compensation-eligibility decision, and next operational action. Raw HTTP status, provider status, error code or issue, refund identifier, request identifier, webhook or retrieval evidence, and evidence time are never overwritten by the normalized result.
  - The approved normalized refund outcomes are `refund_completed`, `refund_pending`, `refund_uncertain`, `refund_blocked`, `refund_repair_required`, `refund_failed`, `refund_ineligible`, and `refund_admin_review`.
  - `refund_pending` covers an accepted provider refund that is still processing. A provider state that requires customer action remains `refund_pending` with `customer_action_required` reason and retains the provider's verified next-action and expiration evidence; it cannot be presented as passive processing.
  - `refund_uncertain` covers transport failure, provider server failure, rate limiting, a previous-request-in-progress conflict, or any response that does not establish whether the provider accepted the movement. It enters evidence-first retrieval and cannot unlock compensation.
  - `refund_blocked` covers an open dispute, chargeback, already-refunded response, excessive-refund conflict, or other evidence conflict that can indicate an existing or competing reimbursement. The application reconciles the original payment, refund history, and dispute state before deciding whether any obligation remains; compensation stays locked to prevent duplicate reimbursement.
  - `refund_repair_required` covers invalid input, wrong resource or environment, authentication, authorization, ownership, permission, or merchant-configuration errors that prevent a trustworthy refund submission. The merchant repairs the integration or evidence and safely continues the same obligation; the application does not treat a correctable integration failure as customer-method ineligibility.
  - `refund_failed` requires verified terminal provider evidence that an accepted refund failed or was cancelled and excludes dispute-related or conflicting-refund cases that map to `refund_blocked`. `refund_ineligible` requires evidence that the original provider route is unavailable, including an approved preflight rule or an explicit provider source or time-limit restriction.
  - A raw provider label such as `failed` does not by itself unlock compensation. Manual monetary resolution or AI-credit compensation is available only for `refund_ineligible`, or for `refund_failed` after replacement funding is verified; it remains locked for pending, uncertain, blocked, repair-required, and admin-review outcomes.
  - An unknown or newly introduced provider response fails closed. It preserves raw evidence and enters uncertainty, repair, or admin review according to what the evidence proves; it is never silently coerced to success, failure, ineligibility, or compensation eligibility.
  - Customer surfaces derive plain-language status and available actions from the normalized result without exposing raw PSP codes. The Integration Lab may reveal the raw response, classification rule, compensation gate, and evidence timeline as separate diagnostic layers.
  - A known provider-ineligible refund does not permanently block a cross-cadence change: before the replacement charge, the customer must choose either manual monetary resolution or equal-value AI usage-credit compensation and confirm that choice with the quote.
  - A cross-cadence replacement attempts the idempotent non-zero replacement charge before submitting any non-zero refund.
  - If the replacement charge fails, is abandoned, or remains uncertain, the application does not submit the refund and does not end the original arrangement until provider retrieval or verified asynchronous evidence resolves the charge outcome.
  - After verified replacement-charge success, or an approved rounded-zero charge adjustment, the application activates the replacement arrangement, ends the original arrangement at `proration_at`, and immediately submits each provider-eligible required non-zero refund through its original provider transaction or fulfills the customer's previously confirmed non-provider compensation choice.
  - A refund accepted in a pending state does not roll back or suspend the funded replacement arrangement; the account shows the new tier as active and the original-payment refund as pending until verified completion.
  - If the refund request receives an uncertain response after replacement-charge success, the normalized outcome is `refund_uncertain`, the operation records `refund_required`, and the application enters the approved evidence-first retrieval schedule; any same-key request replay must satisfy the separately approved provider-evidence rule below.
  - If verified provider evidence qualifies as `refund_failed`, the replacement arrangement remains active, the application records `refund_due`, and the customer can choose manual monetary resolution or equal-value AI usage-credit compensation; the choice is not offered while the normalized outcome is pending, uncertain, blocked, repair-required, or admin-review.
  - Neither a pending nor failed refund authorizes a second replacement charge, reactivation of the original arrangement, removal of replacement entitlements, or representation of the conversion as fully reconciled.
  - Each charge and refund has a stable movement-specific idempotency key and retains the provider request ID, provider transaction ID when created, request attempts, verified status evidence, and reconciliation timestamps.
  - Browser return state or an API timeout is not authoritative; verified webhooks and server retrieval resolve uncertain charge and refund outcomes.
  - A known provider-ineligible refund enters the approved customer compensation choice before replacement charging, while a verified terminal provider failure enters `refund_due` immediately after replacement funding; neither case receives an automatic second provider refund movement.
  - A provider-accepted pending refund or transport-uncertain refund response starts one evidence-first reconciliation schedule anchored to the first unresolved observation: provider retrieval immediately, at fifteen minutes, at two hours, and at twenty-four hours.
  - A verified webhook or retrieval result can resolve or reclassify the movement at any time and cancels all later scheduled checks for that movement.
  - Scheduled checks retrieve state and do not create a new refund. A transport-uncertain request may be replayed only with the same movement identity, identical parameters, and original provider idempotency key after retrieval has not found the operation and the current provider contract explicitly permits that replay within its key-retention window.
  - The application never invents a new idempotency key to escape an unresolved result and never resubmits a provider-pending or verified-failed refund as a new financial movement.
  - If the twenty-four-hour check still cannot establish a terminal outcome, the movement enters `refund_admin_review` with the replacement arrangement still active and the refund still pending or uncertain.
  - `refund_admin_review` is an operational attention state, not evidence of failure: it cannot unlock manual money or AI-credit compensation, rewrite provider state, submit another refund, or describe the obligation as reconciled.
  - The AI usage-credit compensation quantity equals `ceil(rounded service refund amount / published credit unit price)`, using a positive published price denominated in the refund currency and rounding up once to a whole credit at the final credit-ledger boundary.
  - The historical tax-refund component remains a separate part of the gross customer obligation and never increases the AI usage-credit quantity.
  - By explicitly choosing AI credits, the customer exchanges the complete gross service-plus-tax refund obligation for tax-normalized non-monetary compensation: credits represent only the service component, while the historical tax component remains separately recorded as resolved through the same customer-selected non-monetary route.
  - The compensation is not a purchased credit pack, creates no new PSP payment or tax calculation, and cannot mark the original tax as monetarily or provider-refunded.
  - The quote and compensation ledger retain the rounded service refund, historical tax-refund component, gross obligation, currency, published credit-unit price, rate-version identifier, raw quotient, final whole-credit quantity, customer choice, consent timestamp, and non-monetary tax-resolution evidence.
  - Example: in the Seattle scenario, a $10.00 service refund plus $1.06 historical tax creates an $11.06 gross obligation; at $0.10 per credit, compensation grants `ceil(10.00 / 0.10) = 100` AI usage credits, not 111.
  - If the rounded service refund is zero while a positive historical tax amount remains due, AI-credit compensation is unavailable because it would grant no service value; the customer must use an eligible monetary or approved manual monetary resolution.
  - The published initial USD compensation rate is $0.10 per credit, matching the uniform approved purchased-credit catalog rate and remaining immutable for an accepted compensation quote.
  - Refund-compensation credits are fulfilled exactly once after verified replacement funding, use `refund_compensation` provenance, and then follow the same durability, action-eligibility, and subscription-end freeze or reactivation behavior as purchased credits under REQ-0008.
  - Selecting AI usage credits resolves only the identified refund obligation; it does not create a monetary account balance, claim that a PSP refund occurred, or permit a later monetary refund for the same settled amount.
  - When the customer selects manual monetary resolution for a known provider-ineligible or verified-failed refund, the application creates one unresolved manual-refund obligation only after replacement funding is verified; the choice does not claim that money has already been returned.
  - An authorized administrator resolves that obligation by recording the exact owed amount and currency, external refund method, external reference number, explanatory note, administrator identity, and resolution timestamp; the external reference and note are both required.
  - Phase one does not accept, upload, store, display, or download an evidence-file attachment for manual monetary resolution. The required structured external reference and explanatory note, together with the trusted administrator identity, exact amount and currency, external method, and server-recorded timestamp, are the complete sandbox evidence contract.
  - Evidence-file attachments are deferred from the pilot rather than treated as a missing implementation detail. Adding them later requires a separately approved scope for validation, malware handling, storage, access control, retention, deletion, and sensitive-data treatment.
  - The sandbox external-method catalog contains exactly `bank_transfer`, `external_wallet_transfer`, and `other_external_method`; the final option requires a concise administrator-entered method label.
  - The catalog is evidence-only: the application records the administrator's sandbox resolution attestation and reference but does not initiate, authorize, verify, settle, or reconcile the external transfer.
  - Admin, customer, and merchant-facing history label the outcome as a sandbox manual resolution rather than an application-executed or provider-verified refund.
  - For the sandbox pilot, one administrator with trusted server-controlled authorization can confirm the manual resolution; a second approver and amount-based approval thresholds are not required.
  - The recorded amount and currency must match the unresolved refund obligation; any variance requires a separately approved correction or adjustment rather than silently changing the amount owed.
  - The application appends a `manual_refund_resolution` record linked to the refund obligation and tier-change operation, closes that obligation exactly once, and identifies the outcome as merchant-recorded external resolution rather than a PayPal, Stripe, or other PSP refund.
  - Provider transaction identifiers, refund statuses, raw events, and request history remain immutable; an external reference cannot be inserted into a provider-refund identifier field or used to fabricate provider success.
  - Customer history says `sandbox manual resolution recorded`, with amount, currency, resolution date, external method, and only a safely masked or non-sensitive reference; it does not say the application or a provider transferred money.
  - Provider refund, AI usage-credit compensation, and manual monetary resolution are mutually exclusive terminal outcomes for the same refund obligation. Corrections append new audit evidence and never edit or delete the original resolution record.
  - Terminal evidence is route-specific: a provider refund requires verified PSP evidence, AI-credit compensation requires a committed idempotent credit-ledger entry, and manual resolution requires the authorized administrator's immutable sandbox attestation.
  - Only the provider-evidenced route may use `refund completed`; the credit and manual routes use their distinct compensation or sandbox-resolution wording even though each closes the application refund obligation exactly once.
  - The four Customer Story refund snapshots must be produced before those routes receive customer-facing `sandbox_proven` claims. Lab-only exact-route evidence can be added incrementally under the same contract.
  - A monthly-to-annual change is also an immediate replacement: the current monthly arrangement ends at the conversion timestamp, its refundable unused service value is returned, and a new annual arrangement begins after verified non-zero annual payment success or a recorded rounded-zero charge adjustment.
  - The monthly refund basis uses the unearned portion of the settled monthly-service ledger item at `proration_at`, including the effect of any introductory price actually paid rather than substituting the normal catalog price.
  - The new annual arrangement charges the target tier's complete discounted annual price, starts a new twelve-month billing term, and does not transfer or restart an introductory monthly promotion.
  - The closed monthly allowance window does not carry unused included units into the new annual arrangement; its first monthly allowance window starts at the conversion timestamp with the target tier's full approved monthly allowance, while the preexisting purchased-credit balance remains unchanged before any separately consented refund-compensation entry.
  - The monthly-to-annual quote and account history show the full annual charge, unused monthly refund, and net customer effect as distinct values and ledger movements.
  - Each independent charge and refund is calculated with decimal full precision and rounded half up exactly once at its final provider-facing boundary to the supported currency's minor-unit exponent.
  - The unrounded calculation and rounded provider-facing amount are both retained as quote and ledger evidence.
  - Charge and refund movements are rounded independently; the displayed net customer effect equals the sum of rounded charges minus the sum of rounded refunds and is not independently rounded or derived from unrounded netting.
  - For a two-decimal currency, a raw charge of 12.345 becomes 12.35 and a raw refund of 5.675 becomes 5.68, producing a displayed net charge of 6.67.
  - When a positive raw charge or refund rounds to zero minor units, the application does not send that zero-value movement to a PSP.
  - The application instead records an explicit `zero_adjustment` or `zero_refund` ledger movement containing the unrounded raw amount, rounded zero amount, currency, currency exponent, rounding mode, quote identifier, and `proration_at` evidence.
  - A rounded-zero charge satisfies the application's financial prerequisite for activation but cannot be described as provider-paid or assigned a fabricated provider transaction identifier or provider-success status.
  - A rounded-zero refund does not block an otherwise successful cross-cadence replacement; the quote, history, and reconciliation evidence still display the separate refund as $0.00 after rounding.
  - If only one movement in a cross-cadence replacement rounds to zero, the application sends only the non-zero movement to its applicable PSP while retaining both independent movements in the application ledger.
  - A payment attempt accepted before the quote expires retains that quote through payer authentication or provider processing, while an attempt submitted after expiration must receive a newly calculated quote before payment can begin.
  - An expired quote cannot be charged silently; the customer must see and confirm its replacement quote.
  - An upgrade quote expires fifteen minutes after backend creation; `expires_at` equals the server-side quote-creation timestamp plus fifteen minutes.
  - During a brand-new customer's eligible introductory monthly period, a same-cadence upgrade uses each tier's own introductory price: Go at fifty percent off and Plus, Pro, or Pro Max at twenty percent off.
  - The introductory-period upgrade charge equals `(target tier introductory price - current tier introductory price) × billing-period remaining fraction` before the separately approved currency-rounding step.
  - Upgrading does not restart, extend, or create another introductory period; the original promotional end timestamp remains unchanged, and the next renewal uses the target tier's normal recurring price.
  - An immediate upgrade therefore brings total first-period payment to the target tier's introductory price, while a later upgrade charges only the remaining-time difference.
  - The included-allowance increment equals `(new tier allowance - old tier allowance) × allowance-period remaining fraction`; already-consumed included units remain consumed and the upgrade does not reset the allowance meter.
  - The backend retains the full-precision included-allowance calculation as quote and ledger evidence, then credits `floor(full-precision included increment)` whole units exactly once at the final allowance-ledger boundary.
  - No intermediate operand or fraction is rounded, and customer-facing allowance balances do not expose fractional included units.
  - Example: upgrading halfway through a period from Go (100 units) to Plus (300 units) after consuming 80 units retains 20 units and adds 100 units, producing 120 included units remaining before any separately held purchased credits.
  - For an annual Go-to-Pro upgrade at the same halfway point, the current monthly window retains the 20 unused Go units and adds `(800 - 100) × 50% = 350`, producing 370 included units until the next monthly reset; that reset then grants the full 800-unit Pro allowance.
  - An annual upgrade near a monthly reset grants only the small remaining-window increment and then grants the target tier's full monthly allowance at the reset, preventing two full target-tier allowances in adjacent days.
  - The included-allowance increment and higher-tier entitlement are recorded exactly once only after verified non-zero adjustment-payment success or the explicit rounded-zero adjustment evidence.
  - An upgrade, scheduled downgrade, or effective downgrade does not itself add, deduct, convert, revalue, refund, or expire the customer's existing purchased-credit balance; a separately consented refund-compensation ledger entry is the only approved tier-change exception that can add credits.
  - Before a scheduled downgrade takes effect, the current tier continues to determine action eligibility; after it takes effect, the lower tier determines action eligibility while the unchanged purchased-credit balance remains available.
  - Purchased credits can fund only actions permitted by the customer's effective active tier and cannot independently unlock a higher-tier capability.
  - A successful immediate upgrade makes the higher tier's eligible actions available without changing the purchased-credit quantity.
  - Cancellation and expiration continue to retain and freeze purchased credits only at the effective service-access end timestamp under REQ-0008; a tier change between active paid tiers does not freeze them.
  - A same-cadence tier downgrade is scheduled for the next renewal, produces no immediate refund, preserves the current paid tier until that date, and can be canceled before it takes effect.
  - A successful alternate one-time payment can settle the upgrade adjustment without replacing the subscription primary reusable payment method.
  - After alternate-payment success, the confirmation identifies both the adjustment payment method and the unchanged renewal method, warns when the primary needs attention, and links to dedicated payment management.
  - The renewal engine continues to reference the explicit subscription primary method rather than the most recent successful transaction method.
  - Retryable or uncertain primary-method failures retain the primary with a warning; an expired, revoked, or otherwise unusable primary blocks renewal and requires replacement rather than silently falling back to a one-time method.
  - For a PayPal Wallet primary, the application treats the PayPal vault token as the merchant-visible reusable method and does not claim control over the wallet's underlying funding-source choice.
- Negative cases:
  - A tier change cannot create duplicate arrangements or an unexplained charge or refund.
  - Entitlements cannot move to the higher tier before verified non-zero payment success or explicit rounded-zero adjustment evidence.
  - A tier change cannot erase, rescale, or silently consume purchased credits.
  - A purchased-credit balance cannot bypass the effective tier's action eligibility.
  - Intermediate rounding or repeated rounding cannot change the final included-unit credit, and fractional remainders cannot accumulate across tier changes.
  - Monetary operands, fractions, or an aggregate unrounded net cannot be rounded in place of final-step rounding for each independent movement.
  - The application cannot send a zero-value PSP request or fabricate a provider transaction identifier or provider-success state for a rounded-zero movement.
  - An upgrade cannot carry Go's fifty-percent discount percentage into a higher tier, ignore the unused promotional value already purchased, or restart the introductory period.
  - An annual tier upgrade cannot restart or extend the annual commitment, move the renewal timestamp, or grant a full target-tier monthly allowance immediately before the normal monthly reset.
  - An annual-to-monthly replacement cannot silently reuse introductory pricing, carry the closed annual included allowance into the fresh monthly window, hide either money movement, or claim completion while a required provider operation remains unreconciled.
  - A monthly-to-annual replacement cannot refund unused time at the normal catalog price when the customer paid an introductory price, stack the introductory and annual discounts, carry the closed monthly included allowance forward, or hide either money movement.
  - A refund cannot be rerouted to the PSP that owns the current primary method, and independent cross-provider movements cannot be replaced by a fabricated net provider transaction.
  - A visible wallet or accelerator lane cannot create a fabricated independent refund engine, and provider-family documentation cannot be labeled as exact sandbox proof.
  - A PayPal vault ID, Fastlane profile, Fastlane single-use token, Stripe PaymentMethod used for a later payment, or current subscription primary cannot replace the original capture, PaymentIntent, or Charge as refund authority.
  - A PayPal capture known to be older than the documented 180-day window cannot be submitted as an ordinary provider refund or described as provider-eligible.
  - The absence of one universal Stripe card-refund cutoff cannot be described as unlimited eligibility, and the application cannot infer or expose an unverified underlying PayPal Wallet refund destination.
  - A cross-cadence replacement cannot charge an unusable primary, silently fall back to the original PSP, or turn an alternate one-time method into the new recurring primary.
  - A cross-cadence replacement cannot submit its refund before replacement-charge success, end the original arrangement after a failed or unresolved charge, or label a pending or failed refund as reconciled.
  - A refund timeout or webhook duplication cannot create a second refund, and a failed refund cannot trigger a second replacement charge or automatic entitlement rollback.
  - An unresolved refund cannot receive a new idempotency key, a blind POST retry, or a second movement at any reconciliation checkpoint; reaching twenty-four hours cannot be treated as provider failure or customer-compensation eligibility.
  - A late provider webhook cannot be ignored merely because the movement entered admin review, and an administrator cannot manually override pending or uncertain provider evidence to terminal failure.
  - The application cannot grant refund-compensation credits before replacement funding is verified, while the provider refund is pending or uncertain, without explicit consent, or after the same refund obligation has already been fulfilled monetarily or by credits.
  - A non-administrator cannot record a manual monetary resolution, and an administrator cannot close one while provider outcome is pending or uncertain, before replacement funding is verified, without all required resolution evidence, or for an amount or currency that does not match the obligation.
  - A phase-one manual-resolution surface cannot offer an evidence-file input, accept an uploaded file through another request path, or create attachment storage or download metadata.
  - Customer-facing surfaces cannot reveal an unmasked external reference, administrator-only note, or other sensitive manual-resolution evidence.
  - A catalog selection cannot trigger an external transfer, claim that the application supports that rail, or represent administrator-attested sandbox evidence as provider verification or real-money settlement.
  - The single-admin sandbox rule cannot be presented as a production segregation-of-duties, financial-control, or regulatory recommendation.
  - A refund obligation cannot be resolved twice or through more than one terminal route, and a manual resolution cannot overwrite provider evidence, reuse an external reference as a PSP refund identifier, or be edited or deleted after recording.
  - The credit conversion cannot use an unpublished, expired, cross-currency, tier-specific, or silently changed rate, round down the raw quotient, or describe AI usage credits as money held on account.
  - The application cannot silently change the approved $0.10 rate for an accepted quote, apply a pack-specific discount, or use a different tier-specific rate.
  - The last successful payment method cannot silently become the renewal method.
  - A one-time alternate method cannot become an implicit fallback chain for future merchant-initiated charges.
- Dependencies: REQ-0004, REQ-0005, REQ-0008, REQ-0009, REQ-0010, REQ-0022, REQ-0032
- Affected surfaces: account, tier selection, billing engine, ledger, entitlements
- Required test types: unit, integration, interaction
- Required evidence types: backend, interaction, failure
- Exclusions: assumed provider-native proration, provider or funding-source capability beyond the approved matrix and verified exact-route evidence, unsupported provider-error classification, external-rail execution, or unverified provider-support claims
- Payment-domain review required: yes
- Payment-domain review reason: charges, refunds, and reuse of payment methods require PSP-specific evidence
- Design links: design-system/pages/tier-change-lifecycle.md, design-system/pages/ai-service-simulator.md, design-system/pages/tax-mapping.md
- Task links: none
- Test links: none
- Evidence links: design-system/research/2026-07-22-refund-reconciliation-evidence.md, design-system/research/2026-07-27-provider-refund-support-matrix.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-refund-payment.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-save-applepay-js-sdk.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-refunds.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-apple-pay-disputes-refunds.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-cards.md

### REQ-0024 — Define AI action-to-usage weights

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-usage-map
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade simulator and reset-boundary state artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:fixed-action-weights-and-atomic-metering
- Acceptance:
  - Generate answer costs 10 units and is eligible for Go and higher.
  - Analyze document costs 30 units and is eligible for Plus and higher.
  - Create image costs 80 units and is eligible for Pro and higher.
  - Batch-analyze documents costs 200 units and is eligible for Pro Max.
  - Costs are fixed per successfully completed action rather than varying with prompt length, pages, image settings, batch size, model tokens, or simulated execution time.
  - Each tier's full monthly allowance funds exactly ten uses of its newly unlocked flagship action when no other action is used.
  - Before execution, one server-authoritative operation verifies entitlement and atomically reserves the exact fixed cost from included allowance first and then the oldest eligible purchased or refund-compensation grants.
  - An action can split atomically across included and purchased balances; if their combined eligible balance is insufficient, no partial debit occurs and the action does not begin.
  - Successful completion commits the reservation exactly once. Failure or cancellation before completion releases it without consumption.
  - Concurrent operations cannot reserve the same units, and replaying one operation returns the original outcome without another debit.
  - A reservation remains owned by the half-open allowance window in which the server-authoritative operation timestamp placed it, even if completion occurs after that window closes.
  - Successful post-boundary completion commits the old-window reservation, while failure or cancellation releases it without adding to the new window or creating rollover.
- Negative cases:
  - A repeated idempotent request cannot consume usage twice.
  - Client rendering, streamed fixture completion, action duration, or browser return cannot override the server-authoritative reservation and ledger outcome.
  - Failed, canceled, ineligible, or insufficient-balance actions cannot consume units.
  - A reset racing an action cannot move its reservation between windows, create a duplicate allowance grant, or let a released expired-window reservation increase the new balance.
  - Action cost cannot silently vary within the first catalog version.
- Dependencies: REQ-0006, REQ-0022, REQ-0029
- Affected surfaces: AI simulator, usage ledger, tier entitlements
- Required test types: unit, integration, interaction, concurrency, failure
- Required evidence types: backend, interaction, failure
- Exclusions: real model token accounting
- Payment-domain review required: no
- Payment-domain review reason: this requirement concerns application metering rather than PSP behavior
- Design links: design-system/pages/ai-service-simulator.md, design-system/pages/allowance-window-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0025 — Define native and React Native implementation scope

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:unresolved-mobile-implementation
- Lifecycle status: draft
- Planning disposition: unassigned
- Target slice: none
- Blocker: web and H5 are intentionally first; native and React Native SDK capabilities remain research-only
- Deferral reason: none
- Removal reason: none
- Next trigger: completion of web E2E and the US-iOS H5 credit pilot
- Approval reference: none
- Acceptance:
  - Define native Swift, native Kotlin, and React Native comparison slices from current evidence and proven shared contracts.
- Negative cases:
  - Research matrix entries cannot be presented as implemented mobile support.
- Dependencies: REQ-0003, REQ-0018, REQ-0020
- Affected surfaces: iOS, Android, React Native research, shared backend
- Required test types: requirements review, manual
- Required evidence types: static, provider
- Exclusions: mobile runtime code during the current research phase
- Payment-domain review required: yes
- Payment-domain review reason: SDK availability and wallet behavior depend on PSP, platform, and integration route
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0026 — Name the four tiers Go, Plus, Pro, and Pro Max

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:tier-names-go-plus-pro-pro-max
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: apply the approved names consistently in visual artifacts
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:tier-names-go-plus-pro-pro-max
- Acceptance:
  - Pricing, checkout, account, lifecycle, usage, and lab surfaces use the ordered tier names Go, Plus, Pro, and Pro Max.
  - Go is the entry tier, followed by Plus, Pro, and Pro Max in ascending service level.
- Negative cases:
  - The names Basic, Business, or other previous working labels cannot remain in customer-facing tier references.
  - The name Pro Max does not imply unapproved team seats, enterprise administration, or a specific third-party brand relationship.
- Dependencies: none
- Affected surfaces: pricing, promotions, checkout, account, tier changes, entitlements, usage, Integration Lab
- Required test types: unit, interaction, visual review
- Required evidence types: static, interaction, responsive
- Exclusions: prices, allowances, action access, service limits, and support promises
- Payment-domain review required: no
- Payment-domain review reason: this requirement controls application tier naming rather than PSP behavior
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0027 — Differentiate tiers through allowance and capability progression

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:hybrid-tier-model
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade tier-comparison and locked-action visual states
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:focused-four-tier-product-model
- Acceptance:
  - Each successive tier from Go through Pro Max provides a strictly larger included usage allowance.
  - Higher tiers add meaningful AI capability access in addition to allowance growth.
  - Every tier retains a coherent core AI-service experience rather than existing only as a payment label.
  - The exact capability progression is Generate answer at Go, Analyze document at Plus, Create image at Pro, and Batch-analyze documents at Pro Max.
- Negative cases:
  - A higher tier cannot provide a smaller included allowance than a lower tier.
  - The four tiers cannot differ only by name, styling, or allowance quantity without capability progression.
- Dependencies: REQ-0026
- Affected surfaces: pricing, tier comparison, checkout, account, upgrades, downgrades, entitlements, usage simulator, Integration Lab
- Required test types: unit, interaction, visual review
- Required evidence types: static, interaction, backend, responsive
- Exclusions: ownership of numeric allowances, action weights, and prices defined by their linked requirements; production performance promises, support levels, and team features
- Payment-domain review required: no
- Payment-domain review reason: this requirement defines application packaging and entitlement progression rather than PSP behavior
- Design links: design-system/pages/ai-service-simulator.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0028 — Allocate tier usage in exact monthly allowance windows

- Audience: buyer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:tier-allowance-ladder
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade checkout, account, reset, and recovery visual states
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:exact-allowance-window-contract
- Acceptance:
  - A monthly Go allowance period starts with 100 included usage units.
  - A monthly Plus allowance period starts with 300 included usage units.
  - A monthly Pro allowance period starts with 800 included usage units.
  - A monthly Pro Max allowance period starts with 2,000 included usage units.
  - An annual subscription retains monthly allowance periods and receives the effective tier's approved monthly quantity in each period rather than receiving twelve months of included units upfront.
  - Annual billing duration and monthly allowance duration remain separate clocks.
  - Verified initial funding creates an arrangement-local anchor containing the original calendar day, local clock time, confirmed IANA timezone, and exact initial UTC instant.
  - A monthly plan uses that anchor for billing and allowance windows; an annual plan uses it for successive monthly allowance windows inside its funded annual billing term.
  - Every funded allowance window grants the complete effective-tier quantity and is described as one calendar month rather than thirty fixed days or a daily-priced period.
  - For original days from the 29th through the 31st, a month without that day uses its final calendar day and a later month returns to the original day when possible.
  - If the original local clock time does not exist during a daylight-saving gap, the boundary uses the first valid local time after the gap; if it occurs twice, the later occurrence is used; later months return to the original clock time.
  - Each boundary retains both its customer-facing local value and exact UTC instant, and changing account display settings, device timezone, or travel location does not alter an existing arrangement.
  - Web detects and presents a browser IANA timezone for confirmation before payment. A future native-to-H5 subscription intent proposes the device timezone, H5 compares its detected timezone, and any mismatch requires explicit confirmation.
  - Initial purchase, cross-cadence replacement, and fresh-term reactivation create a new anchor at verified funding; ordinary same-cadence upgrades and scheduled downgrades preserve the existing anchor.
  - Allowance windows are half-open: `window_start <= authoritative operation timestamp < window_end`. The old window closes and the next eligible window becomes authoritative at the exact end timestamp.
  - Customer and merchant surfaces describe these as usage units rather than guaranteed request counts.
- Negative cases:
  - The interface cannot imply that one unit equals one AI action; the approved action weights vary from 10 through 200 units.
  - Purchased-credit balance cannot be included in or mistaken for the plan's included allowance.
  - The interface cannot promise `every 30 days`, silently change an existing subscription timezone, permanently drift a 29th-through-31st anchor after a short month, or use a device clock as boundary authority.
  - Browser return, H5 deep link, delayed client refresh, duplicate reset event, or client-calculated time cannot grant or reset allowance.
- Dependencies: REQ-0005, REQ-0018, REQ-0024, REQ-0026, REQ-0027
- Affected surfaces: pricing, web and H5 checkout, account, usage meter, warnings, upgrades, downgrades, renewals, Integration Lab
- Required test types: unit, integration, interaction, concurrency, timezone, visual review
- Required evidence types: static, backend, interaction, responsive
- Exclusions: ownership of prices, action weights, proration, purchased-credit values, ordinary renewal recovery, provider scheduling, and runtime timezone-library selection defined by their linked requirements or later implementation planning
- Payment-domain review required: no
- Payment-domain review reason: this requirement defines application allowance quantities rather than PSP behavior
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/ai-service-simulator.md, design-system/pages/tier-change-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0029 — Offer four representative AI actions

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:four-ai-action-catalog
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-002
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve implementation-grade AI workspace visual and interaction states
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-31:pro-max-batch-input
- Acceptance:
  - The AI service simulator offers Generate answer, Analyze document, Create image, and Batch-analyze documents as distinct customer actions.
  - Each action has an action-specific input, progress presentation, deterministic output fixture, and backend-recorded usage event.
  - Generate answer uses a curated sample topic and short prompt, streams a chat-style fixture, and costs 10 units.
  - Analyze document selects one provided demo PDF or TXT fixture, progresses through extraction and analysis, returns a summary with marked findings and cited sample sections, and costs 30 units.
  - The Customer Story permits dropping or selecting only files from the provided fixture catalog; arbitrary audience documents and private-document upload remain excluded.
  - A recognized fixture produces no reservation or debit until the customer confirms the exact 30-unit action after seeing current and projected remaining allowance.
  - Confirmation moves the allowance surface from unchanged to reserved; successful fixture completion commits once, while failure or cancellation releases the reservation and restores the prior available balance.
  - Create image selects a predefined subject, style, and format, progresses through queue and rendering states, returns a matching prebuilt image fixture, and costs 80 units.
  - Batch-analyze documents begins from one explicit `Add documents` action and selects a provided set of three to five demo documents, shows per-document and comparison progress, returns a comparison table and batch summary, and costs 200 units.
  - Its source chooser offers a recommended four-document sample batch, a selectable provided demo-file catalog, and optional recognized local fixture files; selecting a folder remains an Integration Lab-only route that returns to the same three-to-five-document review gate.
  - Selected documents appear as removable and reorderable attachment rows with file metadata and eligibility feedback. Selection, removal, reordering, and validation reserve and consume zero units; reservation begins only after the separate 200-unit confirmation.
  - The shared workspace can use deterministic AI SDK message streaming, Message and Message Scroller behavior, Marker with restrained Shimmer for active status, and semantic Toast reinforcement as defined in the design contract.
- Negative cases:
  - The four actions cannot be represented as identical text prompts with only different labels.
  - Fixture output cannot be presented as evidence that a live AI model or image service was called.
  - Arbitrary user-document upload and fabricated chain-of-thought are excluded from the first simulator.
  - Shimmer cannot decorate completed results, balances, prices, or payment outcomes, and Toast cannot be the only record of usage, payment, credit, or failure state.
- Dependencies: REQ-0006
- Affected surfaces: AI workspace, usage ledger, allowance meter, tier comparison, account usage history, Integration Lab
- Required test types: unit, integration, interaction, visual review
- Required evidence types: static, backend, interaction, responsive
- Exclusions: live AI calls, arbitrary document analysis, displayed chain-of-thought, and production inference quality
- Payment-domain review required: no
- Payment-domain review reason: this requirement defines simulated application actions rather than PSP behavior
- Design links: design-system/pages/ai-service-simulator.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0030 — Provision four distinct sandbox subscription personas

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:four-sandbox-personas
- Lifecycle status: approved
- Planning disposition: blocked
- Target slice: none
- Blocker: exact sandbox credentials, wallet/device readiness, hosted domain, and provisioning ownership remain unapproved
- Deferral reason: none
- Removal reason: none
- Next trigger: reevaluate for SLICE-007 after provider lanes, hosted domain, and the persona-provisioning ownership contract are approved
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-09:presenter-reset-all-demo-cycles-approved
- Earlier approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-20:four-sandbox-personas
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-08:public-seeded-persona-one-click-entry-approved
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-09:seeded-personas-presenter-only
- Acceptance:
  - Provide four sign-in-ready Supabase application accounts whose Go, Plus, Pro, and Pro Max subscription states are backed by genuine provider sandbox customers, initial transactions, reusable credentials, provider events, and normalized application state.
  - The Go persona uses PayPal Wallet vaulting, Plus uses PayPal-processed Apple Pay recurring, Pro uses Stripe-processed Google Pay recurring, and Pro Max uses a Stripe card acquired through Stripe's card-specific Link integration.
  - Provider customer, vault, and payment-method identifiers come from completed sandbox integrations and verified provider responses or webhooks rather than fabricated database fixtures.
  - Apple Pay and Google Pay personas use a guided human-in-the-loop provisioning ceremony when wallet, browser, device, domain, or sandbox eligibility prevents fully automated provisioning.
  - A persona exposes its current readiness and payment-method provenance without exposing prohibited credentials or making the provider identity an application identity.
  - The four seeded personas are available only inside an authorized presenter or administrator session. They are not offered as public self-service logins and do not require a public lease, queue, observer, or persona-in-use experience.
  - The protected presenter selector shows all four ready personas on laptop and one information-complete tab-selected persona on mobile, including tier, active services, current persistent allowance, masked payment presentation, provider ownership, and acquisition provenance.
  - `Present workspace` enters the selected seeded persona without showing or delivering its email, password, OTP, recovery factor, reusable payment credential, or provider token. A compact presenter context identifies the active persona and provides `Switch persona`; the underlying customer workspace otherwise retains its normal UX.
  - Audience members who want hands-on testing create their own temporary `.test` or persistent real-email account through the normal Customer Story entry, then use their independent subscription, usage, credits, payment methods, and history.
  - Signed-in audiences can exercise AI usage, tier changes, credit top-ups, cancellation, reactivation, and payment management against the persona's real application and sandbox payment state, subject to the separately approved lifecycle rules.
  - The Plus persona may display Apple Pay via PayPal as the subscription billing source, but it does not offer the vaulted Apple Pay credential as an on-session returning-buyer payment choice; a buyer-initiated purchase launches a fresh eligible payment experience.
  - Signing out, closing the browser, allowing the session to expire, or returning to a seeded persona does not reset its consumed allowance.
  - An authorized presenter or administrator can begin one new demonstration cycle for all four seeded personas together through a single confirmed, auditable application operation.
  - The reset restores Go, Plus, Pro, and Pro Max to full included allowances of 100, 300, 800, and 2,000 units, restores their predefined purchased-credit baselines of 0, 200, 200, and 500 credits, and returns each active workspace to its clean service chooser.
  - The reset preserves provider transactions, webhook history, reusable credentials, subscription state, ownership provenance, and immutable prior-cycle usage entries; it cannot fabricate a funding or renewal event.
  - Temporary `.test` and persistent real-email audience accounts cannot be targeted or changed by the seeded reset.
- Negative cases:
  - The customer story does not show separate PayPal-card and Stripe-card subscription lanes that could look like duplicate card choices.
  - PayPal card vaulting and Stripe Apple Pay recurring remain Integration Lab comparison candidates rather than seeded customer-story personas.
  - A database reset cannot rewrite or delete provider transaction history, and a persona cannot be labeled ready before its reusable credential and subscription state are verified.
  - Tier behavior cannot be presented as caused by the persona's assigned provider or payment method.
  - Ordinary login cannot be treated as a seeded demo reset, and a reset cannot fabricate funding, renewal, refund, or provider evidence.
- Dependencies: REQ-0002, REQ-0004, REQ-0006, REQ-0008, REQ-0012, REQ-0021, REQ-0023
- Affected surfaces: seeded login, customer dashboard, AI simulator, tier management, credit purchase, payment management, provisioning operations, Integration Lab
- Required test types: integration, interaction, sandbox, security, hosted
- Required evidence types: provider, backend, interaction, failure, hosted
- Exclusions: production payment credentials, automatic creation of Apple or Google wallet profiles, and provider-history deletion
- Payment-domain review required: yes
- Payment-domain review reason: each persona depends on provider-specific vaulting, recurring, redisplay, consent, wallet eligibility, and webhook behavior
- Design links: design-system/pages/seeded-personas.md, mockups/presenter-controlled-persona-showcase.html, mockups/presenter-reset-all-demo-cycles.html
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0031 — Retain self-registered accounts with admin-controlled lifecycle

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-21:persistent-accounts-admin-lifecycle
- Lifecycle status: approved
- Planning disposition: blocked
- Target slice: none
- Blocker: exact retention fields, admin bootstrap procedure, and provider-cleanup reconciliation contract remain unapproved
- Deferral reason: none
- Removal reason: none
- Next trigger: reevaluate for SLICE-005 after the retention, administrator bootstrap, and provider-cleanup reconciliation contracts are approved
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-21:persistent-accounts-admin-lifecycle
- Acceptance:
  - Self-registered real-email demo accounts persist across all future visits and retain their subscription, allowance, purchased-credit, usage, transaction, payment-method, and lifecycle-history state until an authorized administrator changes their lifecycle.
  - Signing out, closing the browser, allowing an authentication session to expire, and returning later do not replenish or otherwise mutate a persistent account's remaining allowance.
  - A persistent account receives the effective tier's complete new included allowance only at a valid funded allowance-window boundary or another separately approved subscription-lifecycle event; it is never eligible for the seeded-persona `Reset demo cycle` operation.
  - The application provides separate `Suspend` and `Permanently delete` administrative actions.
  - Suspension is reversible: it blocks account access and new sensitive operations, revokes active refresh sessions, prevents scheduled merchant-initiated billing, and retains application and reusable-payment state for later restoration.
  - Permanent deletion is an ordered backend workflow that suspends the account, blocks new billing, revokes all associated reusable payment credentials, verifies provider cleanup, preserves a minimal anonymized audit tombstone, and deletes the Supabase Auth user last.
  - PayPal cleanup deletes each applicable Payment Method Token; Stripe cleanup detaches each applicable PaymentMethod from its Customer. Provider-specific results and asynchronous events are reconciled before application deletion completes.
  - A provider-cleanup failure leaves the account suspended in `cleanup_failed`, records the failed operation, and permits an authorized retry without duplicating completed cleanup steps.
  - Administrator authorization uses trusted server-side state, and privileged Supabase or PSP credentials never reach the browser.
  - One administrator with trusted server-side authorization is sufficient to record a manual monetary refund resolution in the sandbox pilot; dual approval and amount thresholds are out of scope.
  - Seeded Go, Plus, Pro, and Pro Max personas are protected from ordinary permanent deletion and require a separately authorized provisioning or repair operation.
  - Temporary `.test` accounts remain distinguishable from persistent self-registered accounts, appear in the authorized admin lifecycle, and use the same provider-cleanup-first permanent-deletion ordering when an administrator removes them.
  - Demo-session expiry automatically suspends the temporary account, blocks application access and new sensitive operations, and prevents scheduled renewals or other new merchant-initiated charges without deleting reusable credentials or provider history.
  - Provider evidence already in flight at the expiry boundary can finish reconciliation, but expiry cannot authorize a new retry or charge.
  - A `.test` account remains suspended for seven days after automatic session-expiry suspension; at the end of that interval, the application automatically starts the provider-cleanup-first permanent-deletion workflow.
  - If `payment_timing_review` is still unresolved at the seven-day boundary, automatic deletion pauses as `cleanup_blocked_pending_evidence`; the account remains suspended until the original operation reaches a verified terminal classification, after which the existing cleanup workflow may continue.
- Negative cases:
  - Subscription cancellation cannot delete the application account or revoke its payment credentials because the customer may reactivate later.
  - Permanent account deletion cannot be treated as a refund, reversal, erasure of provider transaction history, or cancellation of already-settled payments.
  - The Supabase Auth user cannot be deleted before session handling, provider cleanup, and application-state preservation have reached a safe terminal state.
  - A user-editable profile field cannot grant administrator authority.
  - The pilot's single-admin resolution model cannot be represented as a production financial-control recommendation.
  - A failed provider cleanup cannot be hidden behind a successful-looking account deletion.
  - Automatic cleanup cannot delete account-to-provider mappings or the Supabase Auth user while payment timing remains unresolved.
  - Losing the originating `.test` browser session cannot silently convert the temporary identity into a recoverable or persistent account.
  - Browser-cookie loss is not treated as proof that the server-side expiry has occurred; the server-owned expiry timestamp is authoritative.
  - Activity during the twenty-four-hour interval cannot extend the expiry, and the seven-day suspended interval applies only to `.test` `demo_identity` accounts.
- Dependencies: REQ-0002, REQ-0004, REQ-0008, REQ-0012, REQ-0030, current Supabase Auth and provider token-management evidence
- Affected surfaces: returning login, admin account list, account detail, suspension, permanent deletion, billing scheduler, webhook reconciliation, audit history
- Required test types: unit, integration, security, sandbox, failure, interaction
- Required evidence types: backend, provider, security, failure, interaction
- Exclusions: end-user self-deletion, production legal-retention policy, production segregation-of-duties controls, dual approval, amount-based approval thresholds, refunds initiated by deletion, and deletion of provider transaction history
- Payment-domain review required: yes
- Payment-domain review reason: permanent deletion revokes provider-specific reusable credentials and must prevent future merchant-initiated charging without corrupting historical evidence
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0032 — Calculate US B2C tax from a source-backed mapping table

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-22:us-b2c-tax-mapping-scope
- Lifecycle status: approved
- Planning disposition: future_slice
- Target slice: SLICE-007
- Blocker: none for the normalized product contract; exact method-by-method sandbox acceptance, wallet display, and returned provider evidence remain Payment Knowledge Gate requirements before a lane can be labeled locally integrated or E2E verified
- Deferral reason: none
- Removal reason: none
- Next trigger: capture method-by-method sandbox evidence for the approved amount-breakdown and reconciliation contract before implementation claims
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-22:us-b2c-tax-mapping-scope
- Acceptance:
  - Tax is a merchant-facing learning objective rather than an omitted sandbox assumption.
  - The first tax scope is US business-to-consumer web purchases for AI service subscriptions and purchased-credit packs; B2B exemption workflows and non-US VAT or GST regimes are deferred.
  - The application owns one normalized tax calculation and evidence contract so equivalent PayPal and Stripe scenarios begin with the same product, location, taxable basis, and calculated tax outcome.
  - PSP selection or wallet presentation does not determine taxability or the tax rate. Provider-specific amount-breakdown acceptance, display, and reconciliation are verified separately through the Payment Knowledge Gate.
  - Provider amount handling follows the maximum-truthful-breakdown contract: the accepted normalized quote remains authoritative, while each PSP receives and displays the richest amount detail verified for that exact method and route.
  - Every provider-bound charge derives its currency, gross amount, service or purchased-credit item value, merchant discount, and tax total from one immutable normalized quote snapshot; a provider adapter cannot recalculate or substitute those values.
  - PayPal Orders-based lanes transmit an item matching the purchased service or credit pack plus an arithmetically consistent order amount breakdown, including item total, tax total, and an applicable merchant discount where the exact sandbox route supports those fields.
  - The PayPal Apple Pay payment sheet presents line items from that same quote. Payment-sheet presentation does not prove that the exact Apple Pay save-and-vault Orders combination accepts, retains, or redisplays every field; that combination requires its own sandbox evidence.
  - Stripe card, Link, and Google Pay PaymentIntent lanes transmit the same gross amount with verified Payment Line Items and structured total-tax detail. Arithmetic validation remains enabled rather than allowing mismatched line items to be accepted silently.
  - The Stripe Express Checkout wallet sheet presents line items from the same quote for Google Pay or another enabled wallet. Wallet-sheet line items are presentation evidence and do not replace PaymentIntent request and response evidence.
  - Customer-present initial payments may expose the normalized line items in a PSP or wallet review surface. Off-session renewal creates a new provider payment object from a new normalized renewal quote with the same breakdown contract, but it cannot claim a customer-visible wallet sheet when the customer is absent.
  - A provider refund receives the established gross refund amount in the currency and against the eligible original provider transaction. The normalized ledger separately retains service refund, historical tax refund, component allocation, and gross obligation.
  - Provider refund success proves the gross provider movement and its destination provenance. It does not prove that the PSP independently recalculated, classified, or restored the normalized service-and-tax split.
  - Every provider adapter records which supported amount fields were transmitted, intentionally omitted as unsupported for the exact route, rejected, and returned. An unexpected schema rejection cannot be hidden by silently stripping structured amount fields and retrying as an apparently equivalent run.
  - The Integration Lab exposes three aligned evidence layers for a charge or refund: normalized calculation authority, provider request or wallet-display detail, and provider result with reconciliation evidence.
  - Matched Compare reuses the same normalized quote snapshot for both lanes and highlights provider-specific presentation or field differences without treating richer PSP display as a different customer price.
  - The mapping table identifies country, state or region, postal or local jurisdiction, buyer type, product category, transaction type, taxability, component rates, tax-exclusive or tax-inclusive treatment, effective dates, rounding rule, refund rule, source, retrieved date, and evidence level.
  - Covered transaction types include initial subscription purchase, renewal, same-cadence prorated upgrade, cross-cadence replacement charge and refund, purchased-credit top-up, and refund-compensation credit treatment once the underlying product rules are approved.
  - Every active mapping row references source-backed jurisdiction and rate evidence plus an approved product-treatment decision, and is versioned, effective-dated, and reproducible; the application never invents or silently updates a jurisdiction, treatment, or rate.
  - The first approved numeric subscription scenario is Seattle, Washington, location code `1726`, for Q3 2026: local rate `0.0405`, state rate `0.0650`, and combined rate `0.1055`, effective from July 1 through September 30, 2026, according to the Washington Department of Revenue Q3 rate table.
  - The Seattle Q3 row is an immutable historical version. A Q4 quote cannot reuse, edit, or extend it; Q4 requires a separately sourced, reviewed, effective-dated row selected by the quote timestamp.
  - The initial catalog contains exactly 51 selectable demo-location presets: one named representative locality for each of the 50 states plus Washington, DC.
  - Each preset is a source-backed, effective-dated demonstration of one narrowly defined US B2C AI-service classification at one named locality; it is not a statewide rate and does not claim accuracy for an arbitrary street address in that state.
  - The subscription product classified by every preset is a fully automated, browser-accessed B2C generative AI service that generates text, analyzes documents, and creates images; it includes no downloaded or physically delivered media, live human consulting, telecommunications, advertising, data resale, or separately sold software.
  - A customer selects a demo-location preset before the quote. The Supabase account retains the preset identifier, and changing the selection recalculates any unaccepted quote without rewriting settled history.
  - Each preset records state, representative locality, narrow product treatment, taxable, non-taxable, conditional, or unsupported status, state and local rate components, combined customer rate, effective interval, source, retrieved date, evidence status, and review note.
  - All 51 Q3 2026 subscription rows, including the explicit class-C product-treatment and seller-tax pass-through decisions, are approved in `design-system/research/2026-07-23-us-ai-service-tax-presets-q3.md`.
  - Missing or unresolved rows for a different effective interval remain visibly unsupported and cannot inherit a neighboring state, national default, prior-quarter row, or assumed zero rate.
  - Pricing cards retain the base monthly or annual tier price and disclose `plus applicable tax`; selecting a demo-location preset does not rewrite the cards.
  - The exact location-specific total first appears in checkout after preset selection. Checkout shows service subtotal, merchant discount, tax, and total, while the Integration Lab can reveal the component calculation and evidence.
  - Merchant promotions and discounts reduce the service subtotal before tax. Any approved preset-specific taxable-basis adjustment, such as Texas's 80% basis, applies to that discounted subtotal.
  - Each tax component is calculated at full precision. Raw components are summed, and total tax is rounded half up exactly once to the applicable currency minor unit.
  - Displayed component amounts allocate the already-rounded total: floor each nonnegative raw component in minor units, then distribute the remaining minor units by descending fractional remainder, with stable ties resolved in state, county, city, then special-jurisdiction order.
  - Allocated components must sum to the rounded total tax. Independently rounded components cannot replace or alter the aggregate-once result.
  - The gross customer amount equals the discounted service subtotal plus the rounded total tax.
  - A customer quote retains the original service subtotal, merchant discount, preset-specific basis adjustment, full-precision raw components, raw total tax, rounded total tax, deterministic component allocation, currency rounding mode and exponent, and gross customer amount.
  - Full street-address entry, normalization, jurisdiction resolution, provider-address comparison, IP inference, and live tax-service calls are excluded from the active payment-demo scope and preserved only as future tax-focused learning.
  - Purchased-credit packs do not resolve through the subscription classification. Their initial Q3 results come from the separately materialized and explicitly approved mirrored companion catalog, while any applicable tax follows the approved purchase-time rule.
  - For the pilot, any applicable purchased-credit tax is quoted and collected with the successful credit-pack purchase. Consuming, freezing, or unfreezing credits does not create another tax calculation or provider payment.
  - Purchase-time treatment is a timing rule only. It does not make a credit pack taxable or select a rate; each representative-location preset uses its separately approved purchased-credit mapping row.
  - The initial Q3 2026 purchased-credit catalog contains exactly 51 separately stored and versioned mapping rows, one for every approved representative-location preset, with product category `purchased_ai_usage_credits`.
  - Each initial purchased-credit row is a one-time materialized mirror of its approved subscription row's location, configured taxability, treatment, taxable-basis fraction, rate components, customer rate, and effective interval.
  - Mirrored rows retain their subscription evidence reference and add an explicit `mirrored_demo_classification` evidence treatment. This means the numeric jurisdiction evidence is reused while the purchased-credit product treatment is visibly an approved pilot assumption rather than an independently researched legal conclusion.
  - Runtime quote resolution reads only the separately stored purchased-credit row. It cannot fall back to, join live against, or dynamically inherit the subscription result.
  - A future subscription-row correction, new quarter, or product-treatment change cannot mutate or cascade into a purchased-credit row. The credit row requires its own new version, review, and approval even when its resulting values remain identical.
  - A mirrored `0.00%` credit row is an affirmative configured demo treatment rather than missing evidence.
  - The Integration Lab's same-location comparison shows the distinct subscription and purchased-credit mapping IDs and classifications even when their basis, rate, tax, and total are numerically identical.
  - Before a PSP call, a credit-pack quote snapshots the selected preset, purchased-credit classification version, pack subtotal, discount if any, taxable basis, raw and rounded tax, and gross amount using the shared approved calculation contract.
  - A failed, abandoned, or unverified pack payment does not grant credits or book settled tax. Verified funding creates the purchased-credit grant and its associated service and tax ledger evidence exactly once.
  - Refund-compensation credits are not a purchased pack and do not use the pack-purchase timing rule; their quantity derives only from rounded service refund value and never from restored tax.
  - Every monetary refund restores tax only from its original settled transaction snapshot. It never uses the customer's current preset, a current-quarter rate, or a newly generated tax quote.
  - Refund-tax restoration is calculated independently for each original transaction; service value, taxable basis, tax components, or rounding remainders cannot be pooled across transactions.
  - For an original transaction, the cumulative refund fraction equals cumulative full-precision refundable service value divided by the original full-precision refundable service value, capped from zero through one.
  - Cumulative target tax refund equals the original raw total tax multiplied by that cumulative fraction, rounded half up once to the currency minor unit and capped at the original rounded tax.
  - The current tax-refund amount equals the cumulative target tax refund minus all tax amounts already committed to prior refund obligations for the same original transaction.
  - This cumulative-difference method ensures that repeated partial refunds cannot over-refund tax and that a complete refund restores exactly the original rounded tax, including any earlier rounding remainder.
  - Cumulative component targets use the original raw component amounts and the same refund fraction. The approved deterministic allocation rule distributes the fixed cumulative target across components without exceeding each original settled component allocation; the current component refund is the cumulative allocation minus prior committed component refunds.
  - The service refund retains full-precision evidence and rounds half up once under the approved monetary-movement rule. The customer refund obligation equals rounded service refund plus the current rounded tax refund and is not independently rounded again.
  - A refund quote snapshots the original transaction, mapping and classification versions, original raw and rounded tax, cumulative service-refund fraction, prior committed refund allocations, target cumulative tax, current tax and component refunds, service refund, and gross refund obligation.
  - If another refund changes the committed cumulative state before quote acceptance, the stale quote cannot execute and must be recalculated.
  - Provider acceptance, pending status, failure, or a later compensation route cannot silently recalculate the established service-and-tax refund obligation.
  - When the customer explicitly selects AI-credit compensation, the complete gross service-plus-tax obligation is resolved through one tax-normalized non-monetary route, but only the rounded service refund determines the granted credit quantity.
  - The historical tax component remains separately visible and is marked as resolved through customer-selected non-monetary compensation; it cannot be labeled as a monetary tax refund, provider refund, additional credit value, or a new purchased-credit tax event.
  - Tax-normalized compensation creates no PSP payment and performs no new tax calculation. It retains the original transaction's service, tax, mapping, and refund-allocation evidence.
  - Example: a $10.00 service refund and $1.06 historical Seattle tax form an $11.06 gross obligation. At $0.10 per credit, the customer receives 100 AI credits from the $10.00 service component; the $1.06 tax component grants no additional credits.
  - AI-credit compensation is unavailable when rounded service refund value is zero and only a positive historical tax amount remains; that obligation requires an eligible provider or approved manual monetary route.
  - A customer quote snapshots the selected preset, mapping version, product classification, taxable basis, component tax amounts, rounding evidence, and final tax amount used for that operation.
  - Tax, service subtotal, discounts, credits, refunds, and gross customer effect remain separate normalized ledger values even when a PSP accepts only a combined provider-facing amount.
  - The Customer Story explains the calculated tax succinctly, while the Integration Lab exposes the selected mapping row, evidence level, normalized calculation, and provider-specific transmission or display differences.
  - The source-research record covers the 51 representative subscription presets, the 51 separately materialized purchased-credit companion rows, a same-location comparison of their distinct classifications, and one stale, ambiguous, or unsupported mapping that fails closed.
  - Purchased credits enter tax research as non-monetary prepaid AI usage entitlements rather than a stored-value wallet; the product definition alone does not determine taxability, while the approved companion catalog supplies the initial Q3 pilot classifications.
  - When an automatic renewal cannot produce a valid tax quote, no provider charge is submitted and the arrangement enters `tax_review_required` rather than payment failure or immediate cancellation.
  - While `tax_review_required` remains within its approved grace period, the effective tier and eligible actions remain available, the unused remainder of the just-ended included-allowance window and existing purchased credits remain usable, and no new monthly included allowance is granted until renewal funding is verified.
  - Usage during tax-review grace consumes the preserved prior-window allowance remainder before purchased credits according to the normal consumption order; it does not borrow from or reduce the next funded allowance grant.
  - The tax-review grace period lasts exactly 72 hours from the timestamp at which the automatic renewal first enters `tax_review_required`; the start and expiry timestamps are retained as normalized evidence.
  - If valid tax evidence remains unavailable when the 72-hour interval expires, the arrangement enters recoverable `tax_suspended`: no provider charge is submitted, tier access ends, existing purchased credits freeze intact, and the account, arrangement, reusable-method references, normalized history, and raw provider evidence remain retained.
  - `tax_suspended` is not automatic cancellation. Reactivation requires an explicit customer action and a new valid tax quote before a charge can be submitted.
  - After verified reactivation funding, the selected monthly or annual cadence begins a fresh paid term at the funding timestamp, establishes a new renewal anchor, closes the preserved prior allowance window without carrying its remainder forward, starts one full target-tier monthly allowance window, and unfreezes the intact purchased-credit balance.
  - The reactivation review preselects the existing eligible recurring primary and offers an explicit `Change recurring payment method` subflow; selecting a replacement clearly means that it pays today's reactivation and, after reusable-token verification, becomes the method for future automatic renewals.
  - Verified reactivation funding starts the fresh paid term, grants the full target-tier monthly allowance, and unfreezes purchased credits even when PayPal reusable-token creation remains in a separately evidenced asynchronous pending state.
  - A PayPal payment can therefore move the arrangement to active access with `active_vault_pending` method status when successful funding returns approved vault creation without the final vault identifier. Automatic renewal remains suppressed until the matching reusable-token event is verified and the new primary assignment commits.
  - A Stripe replacement verifies successful PaymentIntent funding and attachment of the resulting PaymentMethod to the expected Stripe Customer before primary promotion.
  - If the replacement charge fails or is abandoned, the arrangement remains `tax_suspended`, the candidate is not promoted, and the existing primary assignment is unchanged.
  - Duplicate or out-of-order provider evidence cannot create more than one fresh term, allowance grant, credit-unfreeze entry, or primary promotion.
  - Reactivation does not charge for the suspended interval, backdate the new term, preserve the expired renewal anchor, or grant allowance or unfreeze credits before funding is verified; retry cadence and notification behavior remain separate approval decisions.
- Negative cases:
  - A rendered PayPal, Apple Pay, Google Pay, Link, Fastlane, or card experience cannot be treated as the tax calculator or evidence that a tax rule is correct.
  - Provider line items, wallet-sheet line items, or tax fields cannot override, recalculate, or silently change the accepted normalized quote.
  - A wallet sheet displaying subtotal and tax cannot be presented as evidence that an off-session renewal or saved-payment route supports the same customer-visible presentation.
  - A successful gross provider refund cannot be described as provider verification of the service-and-tax component split.
  - An adapter cannot silently remove rejected amount-detail fields, retry a gross-only request, and label the result equivalent to a structured-breakdown run.
  - A demo mapping cannot be represented as tax, accounting, legal, registration, nexus, filing, invoice, or compliance advice.
  - A stale, unsourced, future-dated, ambiguous, or overlapping active mapping row cannot calculate tax silently.
  - The Q3 2026 Seattle rate cannot be silently applied to a quote timestamp on or after October 1, 2026.
  - A US B2C mapping cannot be reused for a business buyer, tax-exempt customer, or non-US purchase without a separately approved rule.
  - PayPal and Stripe matched comparisons cannot use different tax inputs or tax versions while claiming an equivalent scenario.
  - Changing a payment method cannot silently change the selected demo-location preset or normalized tax result.
  - A representative locality rate cannot be labeled as the statewide rate or applied to a customer-entered street address.
  - An unconfigured state cannot inherit a national fallback, neighboring-state rate, or assumed zero rate.
  - Pricing cards cannot silently include a selected-location tax, display a universal tax-inclusive total, or vary by PSP lane.
  - Tax cannot be rounded at an intermediate calculation step or derived by summing independently rounded components.
  - Component allocation cannot change the approved rounded total or use an unstable tie-break that makes the same quote non-reproducible.
  - Purchase-time tax treatment cannot be represented as evidence that a credit pack is taxable in a specific jurisdiction.
  - A credit-pack quote cannot resolve, substitute, or display a subscription mapping row merely because the approved numeric results match.
  - Updating or replacing a subscription preset cannot silently update an already approved purchased-credit mapping version.
  - Credit consumption, subscription-end freezing, reactivation unfreezing, or allowance exhaustion cannot create a second tax or PSP event for an already funded pack.
  - A quoted but unverified credit-pack payment cannot create settled tax evidence or usable credits.
  - A refund cannot use a current, replacement, neighboring, or fallback mapping row to recalculate historical tax.
  - Each partial refund cannot round its proportional tax independently when prior refunds exist; it must derive the current amount from the cumulative target minus prior committed allocations.
  - Refundable value and tax from different original transactions cannot be pooled to hide a rounding difference or provider-routing boundary.
  - Cumulative service refund, total tax refund, or any component refund cannot exceed the corresponding original settled amount.
  - A stale concurrent refund quote cannot reserve or execute a second allocation after the transaction's committed cumulative state has changed.
  - A tax amount cannot be divided by the credit-unit price, increase the compensation quantity, or be hidden inside an undifferentiated gross conversion basis.
  - Tax-normalized compensation cannot create a purchased-credit checkout, submit a provider payment or refund, or claim that the historical tax was returned in money.
  - A tax-blocked renewal cannot call the PSP, record a failed provider charge, grant a new included allowance, cancel the arrangement immediately, or freeze existing purchased credits while the approved grace state remains active.
  - The prior allowance remainder cannot be increased, reset, converted into purchased credits, carried into the fresh term, or added on top of the new full allowance grant.
  - The application cannot silently extend, restart, or stack the 72-hour tax-review grace interval in response to repeated quote attempts.
  - Grace expiry cannot delete the application account, revoke reusable payment credentials, erase transaction evidence, fabricate a provider cancellation, or submit a delayed renewal charge without explicit reactivation.
  - Reactivation cannot collect a missed-period charge, prorate from the expired renewal anchor, or create more than one paid term, allowance grant, or credit-unfreeze event from repeated provider evidence.
  - A PayPal vault-creation event without matching application operation, provider customer, environment, merchant account, and successful funding evidence cannot promote a reusable credential.
  - A Stripe PaymentMethod attached to a different Customer cannot become the arrangement primary.
  - A browser success return cannot replace verified provider funding or reusable-token evidence.
- Dependencies: REQ-0001, REQ-0004, REQ-0005, REQ-0008, REQ-0012, REQ-0014, REQ-0015, REQ-0016, REQ-0023
- Affected surfaces: pricing, checkout review, renewal, tier management, credit purchase, refund history, account billing, Integration Lab, normalized ledger, provider requests
- Required test types: unit, integration, interaction, sandbox, failure, visual review
- Required evidence types: static, backend, provider, interaction, failure
- Exclusions: arbitrary US street-address accuracy, live address validation, provider or IP location inference, B2B exemptions and tax IDs, non-US VAT or GST, production nexus or registration determination, return filing, remittance, tax invoices, and production tax-engine implementation
- Payment-domain review required: yes
- Payment-domain review reason: the application-calculated service, tax, refund, and gross amounts must be transmitted and reconciled accurately for each PSP flow
- Design links: design-system/pages/tax-mapping.md, design-system/pages/reactivation-payment-method.md, design-system/pages/tier-change-lifecycle.md, design-system/pages/integration-lab.md, design-system/pages/admin-account-lifecycle.md
- Task links: none
- Test links: none
- Evidence links: design-system/research/2026-07-23-us-ai-service-tax-presets-q3.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-checkout-pass-line-items.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-refund-payment.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-apm-apple-pay.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-payment-line-items.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-refunds.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-stripe-express-checkout-element-accept-payment.md

### REQ-0033 — Recover failed monthly renewals without granting unfunded allowance

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-26:ordinary-renewal-recovery
- Lifecycle status: approved
- Planning disposition: blocked
- Target slice: none
- Blocker: sandbox proof for every approved method-and-outcome combination, any exact PayPal retry allowlist, and implementation-grade renewal-recovery visual states remain evidence-gated
- Deferral reason: none
- Removal reason: none
- Next trigger: reevaluate for SLICE-004 after the method-outcome sandbox catalog and renewal-recovery visual states are approved
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-27:normalized-renewal-outcome-contract
- Acceptance:
  - An annual subscription's monthly allowance resets occur inside an already funded annual term and do not initiate another provider charge.
  - At a monthly renewal boundary, unused included allowance expires.
  - Verified on-time funding grants one full new allowance and preserves the existing subscription anchor.
  - A failed or genuinely unresolved monthly renewal starts `renewal_payment_recovery` for exactly 72 hours at the scheduled boundary; pre-renewal checks and warnings cannot start grace early.
  - The application-owned automatic cadence is one attempt at the scheduled boundary, then eligible retries at twenty-four and forty-eight hours after that boundary; the seventy-two-hour checkpoint expires recovery and is not another automatic charge attempt.
  - During recovery, the previous tier and its action eligibility remain temporarily effective, no new included allowance is granted, existing purchased and refund-compensation credits remain usable, and new credit-pack checkout is unavailable.
  - The customer may retry the explicit recurring primary or use an eligible alternate one-time method for this renewal without making that alternate method the future primary.
  - A new payment attempt is available only after the prior attempt is terminally failed or provider retrieval and local idempotency evidence establish that another attempt cannot duplicate an unresolved charge.
  - An automatic twenty-four- or forty-eight-hour retry runs only when the immediately preceding provider attempt is terminally failed and current provider evidence explicitly permits retry of that payment method for the same renewal obligation.
  - Every normalized outcome other than `automatic_retry_permitted` suppresses the scheduled automatic attempt; `payment_confirmed` also closes the renewal obligation and cancels later checkpoints.
  - Provider-specific evidence is normalized into `payment_confirmed`, `payment_uncertain`, `automatic_retry_permitted`, `customer_action_required`, `primary_method_unusable`, `credential_or_configuration_error`, `risk_or_do_not_retry`, or `unknown_unmapped`; raw provider status, failure, advice, request, response, webhook, retrieval evidence, and acquisition provenance remain alongside the normalized outcome.
  - Only `payment_confirmed` can fund a new term, grant its included allowance, or authorize the corresponding entitlement transition.
  - `payment_uncertain` triggers provider retrieval, webhook reconciliation, or an identical same-key replay where supported; it never authorizes a blind new charge.
  - `automatic_retry_permitted` is the only outcome that can enter the next scheduled automatic checkpoint.
  - `customer_action_required` stops silent retries and routes the customer back to the appropriate provider or application recovery experience.
  - `primary_method_unusable` requires dedicated payment-method replacement rather than another silent attempt with an alternate source.
  - `credential_or_configuration_error`, `risk_or_do_not_retry`, and `unknown_unmapped` suppress automatic charging and enter the appropriate merchant repair, risk, or evidence-review state.
  - For Stripe direct off-session PaymentIntent charging, `succeeded` maps to `payment_confirmed`; `processing` remains `payment_uncertain`; `requires_action` maps to `customer_action_required`; and `requires_payment_method` is classified from `last_payment_error`, Charge outcome, and provider advice.
  - Stripe `try_again_later` advice can qualify a verified terminal failure as `automatic_retry_permitted`; `do_not_try_again`, `confirm_card_data`, expired or lost credentials, risk blocks, and failures requiring a new payment method do not qualify for silent automatic retry.
  - For PayPal Orders charging with a vaulted source, a transport timeout or eligible server error remains uncertain and uses retrieval or an identical same-key replay where the endpoint contract permits; PayPal Subscriptions intelligent retry is not treated as the retry engine for this direct Orders-based billing model.
  - A PayPal capture `COMPLETED` maps to `payment_confirmed`; `PAYER_ACTION_REQUIRED` maps to `customer_action_required`; `REFERENCED_CARD_EXPIRED` maps to `primary_method_unusable`; and `TOKEN_ID_NOT_FOUND` or a mismatched vault identifier maps to `credential_or_configuration_error`.
  - PayPal `INSTRUMENT_DECLINED`, `PAYMENT_DENIED`, and `TRANSACTION_REFUSED` fail closed unless current evidence for the exact route and error explicitly permits a scheduled retry. A future sandbox-backed allowlist may promote only that exact combination to `automatic_retry_permitted`.
  - An unrecognized PayPal or Stripe result maps to `unknown_unmapped`, suppresses automatic charging, and remains open for evidence review rather than being guessed into a retryable category.
  - Ordinary renewal recovery uses a hybrid customer entry: the AI-service dashboard retains a persistent recovery card and usable service context, while the card's outcome-specific action opens a dedicated billing-recovery page for payment detail and decisions.
  - The recovery card and page show the exact access-expiry timestamp, zero newly granted included allowance, usable purchased-credit balance, recurring primary, automatic-retry status, and whether a one-time payment affects future renewals.
  - `payment_confirmed` restores the active service presentation; `automatic_retry_permitted` says when the application will retry; `customer_action_required` presents the provider-appropriate continuation; and `payment_uncertain` disables new payment controls while reconciliation is unresolved.
  - `primary_method_unusable` routes to dedicated payment-method replacement. For PayPal-saved Apple Pay, the default recovery action instead pays the current renewal with another eligible one-time method, while changing the future primary remains a secondary dedicated setup action.
  - `risk_or_do_not_retry` offers only an evidence-permitted alternate route; `credential_or_configuration_error` and `unknown_unmapped` use neutral merchant-review wording and expose no customer payment action until a safe route is established.
  - Raw PSP errors and object identifiers remain Integration Lab evidence rather than customer-facing copy.
  - In-product recovery state updates immediately. Email notifications are event-based and deduplicated by renewal operation and notification purpose rather than emitted for every provider attempt, retrieval, webhook, or replay.
  - A T0 retry-eligible failure sends one email with the next attempt; an unchanged T+24-hour retry state updates in-product timing without another email; a failed T+48-hour final attempt sends an access-expiry warning; customer-action-required and method-unusable transitions send immediately; and T+72-hour expiry sends immediately.
  - A newly observed `payment_uncertain` state appears in-product immediately and begins reconciliation, but its informational email waits fifteen minutes. If it remains uncertain at that threshold, the email tells the customer that confirmation continues and not to pay again.
  - If uncertainty becomes terminal before fifteen minutes, the uncertain-state email is canceled and the resulting confirmed, action-required, unusable, or other approved notification rule applies. Later unchanged reconciliation evidence cannot send duplicate uncertain-state emails.
  - A `payment_confirmed` resolution sends email only when the customer previously received a recovery or uncertainty email for the same operation. Credential or configuration errors notify the merchant or administrator without exposing technical details to the customer.
  - A same-request idempotent replay used to resolve transport uncertainty is evidence reconciliation, not the twenty-four- or forty-eight-hour new authorization attempt. A new scheduled attempt receives its own attempt identity only after the previous attempt is verified terminal and retry-eligible.
  - A customer-initiated successful settlement or verified provider completion cancels every later scheduled attempt for the renewal operation.
  - When provider funding actually completed at the original boundary but authoritative evidence arrives later, the original funded-window anchor and effective funding timestamp remain authoritative.
  - A genuinely later successful retry grants the complete tier allowance exactly once and starts a fresh paid month and new anchor at the provider's effective completion timestamp.
  - If recovery expires without verified funding, tier access ends and remaining purchased credits freeze intact.
  - If authoritative evidence discovered after recovery expiry proves that funding already completed, the application restores the funded term using the provider's effective completion timestamp, grants its allowance idempotently, and unfreezes retained credits without another charge or explicit reactivation.
  - A later explicit reactivation begins a fresh funded term, grants the complete allowance, creates a new anchor, and unfreezes retained credits only after the prior renewal attempt is terminally failed or otherwise proven safe for a new charge.
  - `tax_review_required` remains a distinct merchant-responsibility grace: it preserves the approved prior allowance remainder, while ordinary payment recovery does not.
- Negative cases:
  - Recovery cannot begin before the scheduled boundary, carry expired included allowance forward, grant new included allowance before funding, or stack and silently extend repeated grace intervals.
  - Existing purchased credits cannot freeze during active recovery, and a customer cannot buy another credit pack until renewal funding or explicit reactivation restores normal active state.
  - Provider evidence arrival time cannot replace the provider's effective completion time, and an uncertain outcome cannot be classified as a genuinely late success merely to move the anchor.
  - A pending or transport-uncertain renewal cannot trigger a blind primary retry, alternate-method charge, or second idempotency identity.
  - Elapsed time alone cannot classify a failure as retryable, and the twenty-four- or forty-eight-hour scheduler cannot override provider advice or customer-action requirements.
  - A generic decline label cannot promote a PayPal attempt into `automatic_retry_permitted`, and a common normalized outcome name cannot erase a provider-specific difference.
  - An unknown or unmapped provider result cannot grant entitlement, become a terminal failure by assumption, or enter the next scheduled attempt.
  - The seventy-two-hour expiry checkpoint cannot submit a fourth automatic attempt.
  - A manual recovery payment and a scheduled automatic attempt cannot race to create two committed movements for the same renewal.
  - Recovery expiry cannot convert uncertainty into provider failure, authorize a replacement charge, or ignore later authoritative success evidence.
  - Delayed or duplicate provider evidence cannot create two paid terms, allowance grants, anchors, or credit state transitions.
  - A one-time recovery method cannot silently replace the recurring primary or become an implicit future fallback.
  - The customer cannot be forced away from still-usable AI service solely because ordinary recovery began, and a banner-only treatment cannot replace the dedicated page when the customer must make a payment decision.
  - An unresolved `payment_uncertain` state cannot expose retry, alternate-payment, or replace-method controls that could duplicate the charge.
  - Repeated attempts, retrievals, webhooks, or unchanged normalized outcomes cannot generate duplicate customer emails.
  - Ordinary payment recovery cannot be labeled `tax_review_required`, preserve the tax-grace allowance remainder, or claim that the merchant lacked a valid tax quote.
- Dependencies: REQ-0004, REQ-0005, REQ-0008, REQ-0009, REQ-0010, REQ-0012, REQ-0028, REQ-0032
- Affected surfaces: renewal, account billing, AI simulator, purchased-credit store, payment recovery, entitlement service, Integration Lab
- Required test types: unit, integration, interaction, concurrency, sandbox, failure, visual review
- Required evidence types: backend, provider, interaction, failure
- Exclusions: exhaustive sandbox proof for every method-and-error combination, merchant-specific PayPal retry allowlists without exact evidence, provider-native dunning features, production email deliverability and template localization, SMS or mobile push notification delivery, production collections policy, and dependency on Stripe's private-preview Off-Session Payments API
- Payment-domain review required: yes
- Payment-domain review reason: renewal funding time, provider completion evidence, retry eligibility, and method-specific failure classification vary by PSP and funding source
- Design links: design-system/pages/allowance-window-lifecycle.md, design-system/pages/tier-change-lifecycle.md, design-system/pages/tax-mapping.md, design-system/pages/integration-lab.md, design-system/pages/reactivation-payment-method.md, design-system/pages/seeded-personas.md
- Task links: none
- Test links: none
- Evidence links: none

### REQ-0034 — Resume checkout through one application identity

- Audience: customer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the SLICE-001 implementation plan, then execute its first reviewed task
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- SLICE-001 reconciliation reference: user:TASK-0002:2026-08-19:minimal-reconciliation-approved
- Acceptance:
  - Selecting Go Monthly creates a server-owned pending checkout intent before authentication.
  - The current demo customer continues through a persistent real-email identity using Supabase email OTP; temporary/24-hour account entry is excluded by the 2026-09-19 approved scope amendment.
  - Successful email OTP verification restores the selected Go Monthly intent into a newly calculated checkout review; authentication never submits payment automatically.
  - A persistent real-email customer can return later and recover the same application account and retained account state.
  - Existing temporary-account data and backend safeguards remain intact; temporary-account behavior is not a current-demo acceptance path.
- Negative cases:
  - Link, Fastlane, PayPal, or another PSP profile cannot own the application identity or silently create a second application account.
  - Authentication success cannot charge the customer, accept a stale quote, or grant entitlement.
  - A `.test` OTP cannot be exposed to another browser session or treated as recovery proof after expiry.
- Dependencies: REQ-0002, REQ-0011
- Affected surfaces: signed-out homepage, plan selection, account entry, OTP verification, checkout review
- Required test types: integration, interaction, security, hosted, failure
- Required evidence types: backend, interaction, hosted, failure
- Exclusions: password setup, password recovery, provider-owned identity, application-account suspension and administrative account lifecycle (retained under REQ-0011 and REQ-0031 for SLICE-005), and production email deliverability
- Payment-domain review required: yes
- Payment-domain review reason: application identity and restored checkout intent must remain separate from PSP customer and reusable-payment ownership
- Design links: DESIGN-0157, DESIGN-0160, design-system/pages/slice-001-go-paypal-wallet.md, mockups/slice-001-go-paypal-wallet-e2e-state-board.html
- Task links: TASK-0001, TASK-0002, TASK-0005, TASK-0007, TASK-0009
- Test links: TC-0001, TC-0002, TC-0003, TC-0012, TC-0014, TC-0015
- Evidence links: EVID-0001, EVID-0002, EVID-0005, EVID-0006

### REQ-0035 — Quote the first Go monthly period exactly

- Audience: customer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the SLICE-001 implementation plan, then execute its first reviewed task
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Acceptance:
  - The first Go Monthly quote starts from a $10.00 base price and applies a $5.00 first-period promotion.
  - The Seattle Q3 2026 fixture calculates 10.55% tax on the $5.00 taxable subtotal, rounds the tax to $0.53, and presents an initial charge of $5.53.
  - Checkout states that the next normal renewal is $10.00 plus the then-applicable tax and shows the exact renewal and allowance-reset timestamp.
  - The quote is immutable and retains its pricing, promotion, tax, mapping, timezone, and effective-time versions.
  - Any material input or effective mapping change before payment creates a replacement quote that the customer must review and confirm.
- Negative cases:
  - The fixture cannot be presented as a universal tax determination, production tax advice, or a PSP-owned tax calculation.
  - A stale or expired mapping cannot be silently reused, and authentication cannot preserve an obsolete monetary total.
  - Annual billing and tiers other than Go are not executable in this slice.
- Dependencies: REQ-0005, REQ-0032, REQ-0034
- Affected surfaces: Go plan selection, checkout review, tax summary, receipt
- Required test types: unit, integration, interaction, hosted, failure
- Required evidence types: static, backend, interaction, hosted, failure
- Exclusions: the remaining 50 location presets, annual execution, arbitrary addresses, live tax engines, filing, nexus, and remittance
- Payment-domain review required: yes
- Payment-domain review reason: the exact normalized amount must be transmitted to and reconciled with the PSP without making the PSP the pricing or tax authority
- Design links: DESIGN-0157, DESIGN-0160, design-system/pages/slice-001-go-paypal-wallet.md, mockups/slice-001-go-paypal-wallet-e2e-state-board.html
- Task links: TASK-0002, TASK-0007, TASK-0009
- Test links: TC-0004, TC-0012
- Evidence links: design-system/research/2026-07-23-us-ai-service-tax-presets-q3.md, EVID-0002, EVID-0005

### REQ-0036 — Fund and verify a PayPal Wallet reusable credential

- Audience: mixed
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: exact sandbox merchant eligibility, hosted domain, and immediate-versus-delayed vault outcome remain evidence gates for implementation closure
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the SLICE-001 implementation plan, then close the exact PayPal sandbox evidence gate before claiming provider completion
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Acceptance:
  - The initial Orders v2 request places `store_in_vault: ON_SUCCESS`, `usage_type: MERCHANT`, and `usage_pattern: SUBSCRIPTION_PREPAID` under `payment_source.paypal.attributes.vault`; `payment_source.paypal.stored_credential` is reserved for a later merchant-initiated charge and is not used to classify the initial purchase.
  - One `purchase_units.items[].billing_plan` presents the recurring agreement: sequence 1 is one monthly chargeable `TRIAL` cycle at $5.00, and sequence 2 is an open-ended monthly `REGULAR` cycle at $10.00. The initial $5.53 order uses a $5.00 `item_total` and $0.53 `tax_total`; it does not send the unsupported recurring `breakdown.discount` field. Exact field acceptance remains a PayPal sandbox evidence gate.
  - Before the PayPal JS SDK renders, the server issues the short-lived user ID token. A first-time payer has no `target_customer_id`; a returning payer uses the stored PayPal-generated customer ID as `target_customer_id`.
  - The application stores an environment- and merchant-scoped mapping from the Supabase user to an opaque merchant customer reference and the PayPal-generated customer ID. That PayPal ID remains provider provenance and never becomes application identity, account ownership, or entitlement authority.
  - The customer sees readable recurring-payment and future-use consent before approving PayPal.
  - Create and capture use separate stable `PayPal-Request-Id` values; an identical retry reuses only the identifier belonging to that exact API operation.
  - A browser approval or return cannot activate service. Verified `COMPLETED` capture evidence establishes funding.
  - A `VAULTED` result with a verified vault identifier establishes reusable-credential readiness.
  - An `APPROVED` vault status remains pending; only a verified, matching `VAULT.PAYMENT-TOKEN.CREATED` event can promote it to reusable-ready.
  - The application persists the application operation, PayPal order ID, merchant account, environment, opaque merchant customer reference, and PayPal customer ID before waiting for delayed vault evidence. At most one vault operation may be pending for the same merchant, environment, and PayPal customer ID.
  - A delayed vault event is accepted only when its verified webhook endpoint identifies the expected merchant and environment, its `resource.customer.id` resolves to exactly one pending operation, and its vault ID is not already owned elsewhere. No match or multiple matches quarantines the event and leaves vault readiness pending; the linked application operation supplies the already-recorded order correlation.
  - Webhook signature, application operation, environment, merchant, customer, order, and ownership correlations are verified before provider evidence changes normalized state. The delayed `APPROVED` to `VAULT.PAYMENT-TOKEN.CREATED` correlation and actual field propagation must be proved in the configured sandbox before provider completion can be claimed.
  - Funding and reusable-credential readiness remain separate facts: verified funding may activate the paid service while automatic renewal remains suppressed until vault readiness is verified.
  - Duplicate requests, responses, returns, and webhooks cannot duplicate payment, entitlement, primary-method assignment, or allowance.
  - The merchant-safe result says `vault token verified; future-charge path documented`; it does not claim a subsequent renewal charge was executed.
- Negative cases:
  - Raw browser values, unverified webhooks, mismatched ownership, and provider-profile identity cannot authorize funding, vault readiness, or entitlement.
  - A PayPal customer ID cannot replace the Supabase user ID, and a delayed vault event cannot be guessed onto the latest order for that customer.
  - The same request identifier cannot cross create, capture, refund, or billing-period boundaries.
  - This slice cannot claim renewal E2E proof, PayPal Subscriptions ownership, or production readiness.
- Dependencies: REQ-0004, REQ-0012, REQ-0034, REQ-0035
- Affected surfaces: PayPal checkout, provider adapter, webhook receiver, billing arrangement, payment-method summary, receipt
- Required test types: unit, integration, sandbox, hosted, security, idempotency, failure
- Required evidence types: backend, provider, hosted, failure
- Exclusions: real subsequent renewal charge, PayPal Subscriptions, saved PayPal card, Apple Pay, Google Pay, Stripe, refunds, and production merchant enablement
- Payment-domain review required: yes
- Payment-domain review reason: PayPal order, capture, vault status, webhook, stored-credential, ownership, and idempotency semantics determine safe funding and reuse
- Design links: DESIGN-0158, DESIGN-0160, design-system/pages/slice-001-go-paypal-wallet.md, mockups/slice-001-go-paypal-wallet-e2e-state-board.html
- Task links: TASK-0001, TASK-0003, TASK-0008, TASK-0009
- Test links: TC-0001, TC-0005, TC-0006, TC-0007, TC-0012
- Evidence links: payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-save-payment-methods.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-checkout-save-payment-methods-recurring.md, payment wiki (root via KNOWLEDGE_SOURCES.md): wiki/sources/source-paypal-best-practices-recurring-payment.md, EVID-0001, EVID-0003, EVID-0005

### REQ-0037 — Grant and consume the Go allowance atomically

- Audience: customer
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: approve the SLICE-001 implementation plan, then execute its first reviewed task
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Acceptance:
  - Verified funding opens one Go allowance window with 100 included units.
  - Generate Answer previews an exact 10-unit cost before execution and atomically reserves those units when confirmed.
  - A deterministic simulated answer commits the reservation exactly once and leaves 90 included units.
  - Usage history records the action, reservation, terminal outcome, allowance window, and funding source for the debit.
  - A failed or canceled action releases the complete reservation and leaves the balance at 100.
  - Refreshes, duplicate completion evidence, and concurrent requests cannot double-spend or double-commit the same usage operation.
  - A return visit restores the committed 90-unit balance rather than replenishing it.
  - The customer-facing result clearly labels the AI output as simulated.
- Negative cases:
  - Client-side counters, authentication success, or an unverified payment cannot grant or mutate entitlement.
  - A failed or canceled action cannot produce a customer result or a partial debit.
  - The demo cannot claim a live external AI model generated the fixture output.
- Dependencies: REQ-0006, REQ-0024, REQ-0028, REQ-0036
- Affected surfaces: signed-in AI workspace, allowance summary, Generate Answer conversation, usage history
- Required test types: unit, integration, interaction, concurrency, hosted, failure
- Required evidence types: backend, interaction, hosted, failure
- Exclusions: the other three AI services, purchased credits, low-balance alerts, tier changes, annual resets, and seeded-persona resets
- Payment-domain review required: no
- Payment-domain review reason: usage reservation and entitlement accounting are application behavior after verified funding; PSP semantics are owned by REQ-0036
- Design links: DESIGN-0159, DESIGN-0160, design-system/pages/slice-001-go-paypal-wallet.md, mockups/slice-001-go-paypal-wallet-e2e-state-board.html
- Task links: TASK-0001, TASK-0004, TASK-0009
- Test links: TC-0001, TC-0008, TC-0009, TC-0010, TC-0012
- Evidence links: EVID-0001, EVID-0004, EVID-0005

### REQ-0038 — Prove the thin slice with merchant-safe evidence

- Audience: merchant
- Source: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: runtime font, accessibility, hosted Supabase hook, and PayPal sandbox evidence remain implementation closure gates
- Deferral reason: none
- Removal reason: none
- Next trigger: complete SLICE-001 planning and obtain implementation-plan approval before runtime execution
- Approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:option-a-ac-contract-and-disposition-map-approved
- Acceptance:
  - The slice works on laptop and mobile in light and dark themes using the approved responsive design contracts.
  - Runtime evidence proves Fraunces and Source Sans 3 loaded from real font sources rather than fallback-only rendering.
  - Keyboard order, visible focus, 44-pixel mobile targets, reduced motion, contrast, and non-color meaning pass the agreed accessibility checks.
  - Evidence proves persistent email-OTP Supabase application-account ownership. Temporary-account originating-session/expiry acceptance is deferred under the 2026-09-19 scope amendment; historical failures remain recorded, not relabeled as passes.
  - Sanitized evidence retains the PayPal create, capture, webhook, vault, correlation, and verification chain without exposing secrets or full identifiers.
  - Backend evidence retains the normalized quote, funding, entitlement, allowance, and usage transitions.
  - Failure evidence covers authentication failure, PayPal cancellation, capture failure, pending vault readiness, invalid webhook signature, duplicate provider evidence, stale quote replacement, and failed simulated AI execution.
  - Hosted HTTPS proves the Supabase send-email hook and PayPal webhook paths used by the slice.
  - Merchant-facing status uses only demonstrated evidence levels and does not present sandbox or design proof as production capability.
- Negative cases:
  - Static UI cannot substitute for backend, provider, security, accessibility, typography, or hosted evidence.
  - Secrets, complete provider identifiers, raw OTPs, and customer-private data cannot appear in screenshots, logs, or presentation artifacts.
  - Sandbox success cannot be labeled production readiness or complete merchant-release coverage.
- Dependencies: REQ-0034, REQ-0035, REQ-0036, REQ-0037
- Affected surfaces: all SLICE-001 customer surfaces, evidence capture, merchant presentation, hosted callbacks
- Required test types: interaction, responsive, visual review, accessibility, integration, sandbox, hosted, security, failure
- Required evidence types: static, backend, provider, interaction, responsive, accessibility, typography, hosted, failure
- Exclusions: public launch readiness, production merchant onboarding, comprehensive load testing, mobile apps, Integration Lab, and evidence for future slices
- Payment-domain review required: yes
- Payment-domain review reason: the merchant-safe presentation must distinguish documented, sandbox-proven, simulated, unresolved, and unsupported PSP behavior
- Design links: DESIGN-0158, DESIGN-0159, DESIGN-0160, design-system/pages/slice-001-go-paypal-wallet.md, mockups/slice-001-go-paypal-wallet-e2e-state-board.html
- Task links: TASK-0001, TASK-0002, TASK-0003, TASK-0004, TASK-0005, TASK-0006, TASK-0007, TASK-0008, TASK-0009
- Test links: TC-0001, TC-0002, TC-0003, TC-0004, TC-0005, TC-0006, TC-0007, TC-0008, TC-0009, TC-0010, TC-0011, TC-0012, TC-0013, TC-0014, TC-0015
- Evidence links: EVID-0001, EVID-0002, EVID-0003, EVID-0004, EVID-0005, EVID-0006

## Tombstone Register

| ID | Title | Removal reason | Approval reference |
| --- | ----- | -------------- | ------------------ |

## Tombstones

No requirements have been removed.

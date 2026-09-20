# AI Service Subscription Pilot

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


This is a derived scenario and supported-flow summary. Product promises and acceptance criteria live only in `REQUIREMENTS.md`.

Complexity: complex

## Audience

- Primary: merchants evaluating flexible recurring billing, vaulting, payment management, and mobile checkout choices across PayPal and Stripe.
- Secondary: payment integration specialists using the pilot as a learning and comparison playground.

## Business Scenario

An online AI service offers Go, Plus, Pro, and Pro Max service tiers with 100, 300, 800, and 2,000 included units respectively for a customer-specific calendar-month allowance period, plus one cumulative action unlock at each higher tier. Monthly and annual purchase choices coexist with separately purchased credits; annual billing retains successive monthly allowance resets rather than granting one annual usage bucket. Customers simulate Generate answer, Analyze document, Create image, and Batch-analyze documents while the application records real allowance and credit-ledger changes. Purchased credits can restore metered service access after included allowance is exhausted while paid or approved temporary-recovery access remains active. A cancellation request does not freeze them immediately; at the effective service-access end timestamp, the remaining balance is retained but frozen until an eligible subscription is reactivated. Merchants can inspect the customer story and open an Integration Lab to understand provider, wallet, lifecycle, allowance-window, and platform differences.

US consumer web purchases also expose a provider-neutral tax calculation from a source-backed, effective-dated mapping table. The customer sees a concise tax result, while merchants can inspect location, product classification, taxable basis, mapping version, and provider-specific amount transmission without treating the demo as tax advice.

Four sign-in-ready sandbox personas make the customer story tangible: Go uses PayPal Wallet vaulting, Plus uses PayPal-processed Apple Pay recurring, Pro uses Stripe-processed Google Pay recurring, and Pro Max uses a Stripe card acquired through card-specific Link. Each persona is backed by genuine provider sandbox and application state rather than fabricated payment identifiers.

## Payment Products

- PayPal reusable-payment-method and merchant-initiated billing routes, subject to the Payment Knowledge Gate.
- Stripe reusable-payment-method and merchant-initiated billing routes, subject to the Payment Knowledge Gate.
- Candidate funding experiences include PayPal Wallet, cards, Apple Pay, Google Pay, Link, and Fastlane only where current evidence and eligibility support the exact scenario.
- Provider-native subscription products are not the primary billing model for this pilot.

## Supported Flows

The following are approved target flows, not implemented claims:

- Web-first signup, subscription purchase, usage simulation, allowance display, credit purchase, tier management, and payment management.
- Four provisioned sandbox personas that can exercise those flows with distinct payment provenance.
- Exactly one recurring primary credential per subscription. PayPal and Stripe wallets, cards, Link, and Fastlane remain separate acquisition or management scenarios rather than automatic fallback sources.
- Persistent self-registered accounts with full sandbox subscription, AI usage, tier-change, credit, cancellation, reactivation, and payment-management journeys.
- Customer-specific monthly allowance windows with confirmed subscription timezone, short-month and daylight-saving behavior, exact reset ordering, and consistent web, H5, and future native presentation.
- Ordinary failed monthly renewals use a 72-hour recovery period with no unfunded included allowance, existing credits still usable, new top-ups disabled, and a fresh anchor for genuinely late successful funding. The application attempts the primary at T0 and retries at T+24 and T+48 only after a verified terminal, provider-permitted failure; T+72 expires recovery without another charge.
- Renewal recovery uses a persistent AI-dashboard card plus a dedicated billing-recovery page, normalized outcome-specific customer actions, a merchant summary with optional Integration Details in the lab, and event-based email notifications. A newly uncertain payment waits fifteen minutes before sending one do-not-pay-again email if it remains unresolved.
- A protected admin account-management journey with reversible suspension, provider-cleanup-first permanent deletion, and single-admin sandbox recording of manual monetary refund resolutions.
- Hybrid tier changes: paid immediate upgrades, next-renewal same-cadence downgrades without refunds, charge-first immediate cross-cadence replacement with an unused-value refund and fresh target-tier monthly allowance window, original-PSP refund routing with current-primary replacement charges, immediate/15-minute/2-hour/24-hour evidence retrieval for pending or uncertain refunds before diagnostic admin review, durable failed-refund reconciliation without rolling back the funded new plan, customer-selected equal-value AI usage-credit compensation or append-only admin-recorded manual monetary resolution, and no silent replacement of the recurring primary method after an alternate one-time payment.
- Source-backed US B2C tax calculation for web subscriptions, renewals, tier changes, refunds, and purchased-credit transactions, with normalized tax held constant across matched PayPal and Stripe scenarios.
- A merchant-facing Integration Lab composed of Scenario Builder, Matched Compare, and Capability Matrix.
- A later US-iOS app-to-web H5 pilot, beginning with credit purchase and then subscription purchase.
- Native iOS, native Android, and React Native are later comparison dimensions; React Native remains research-only initially.

## Payment Flow Map

### Web reusable-payment flow

Entry point: authenticated web customer chooses a subscription, credit purchase, or dedicated primary-payment-method change.
Frontend SDK or UI layer: provider-supported PayPal or Stripe web experience selected for the scenario.
Backend APIs: exact Node.js framework and PSP endpoint contracts remain unapproved.
Stored state: Supabase application identity, normalized billing and entitlement state, immutable provider events, raw provider state, and payment-method provenance.
Verification: verified provider webhooks and server retrieval determine fulfillment; a browser return alone is not authoritative.

### US iOS app-to-web credit purchase

Entry point: an authenticated iOS customer receives a low-allowance warning and chooses Buy credits.
Frontend SDK or UI layer: native application opens an eligible H5/provider checkout in Safari.
Backend APIs: shared backend creates the provider transaction and processes verified asynchronous completion.
Stored state: an idempotent credit-ledger entry tied to the application account and provider transaction.
Verification: verified webhook updates the ledger; a Universal Link returns to the app, which refreshes server-authoritative balance and entitlement state.

## Demo Boundaries

- This is a demo, not a production compliance, pricing, tax, fee, settlement, or platform-policy reference.
- Economic comparisons use explicit merchant assumptions and do not promise universal Apple-fee avoidance.
- Non-US iOS storefronts, native SDK implementations, and React Native remain research-only until separately approved.
- Method-by-method recurring-primary boundaries, the eight-outcome PayPal-versus-Stripe renewal contract, hybrid recovery entry, dual merchant/detail presentation, and event-based email timing are approved. Sandbox proof for every lane and outcome, exact PayPal automatic-retry allowlists, provider or funding-source refund classifications, production email delivery and localization, SMS or push delivery, and optional admin-evidence attachment storage and retention remain unresolved. The conservative hybrid renewal cadence, fail-closed normalized outcome framework, tier prices, action access and weights, allowance-window boundaries, ordinary recovery behavior, purchased-credit prices, the compensation rate, and the representative Q3 2026 tax catalog are approved demo configuration rather than production pricing or compliance recommendations.
- The US B2C mapping table is educational demo evidence, not tax, accounting, registration, nexus, filing, invoice, or legal advice.
- Permanent deletion revokes reusable payment credentials but does not erase, refund, or rewrite provider transaction history.
- Single-admin manual refund recording is a sandbox simplification, not a production segregation-of-duties or financial-control recommendation.
- Bank transfer, external wallet transfer, and other external method are evidence-only sandbox labels; the application does not execute or claim provider support for those transfers.

## Runbook

No runtime runbook exists during discovery.

## Verification Checklist

- Confirm every PSP capability against local wiki evidence and current official documentation.
- Distinguish provider capability from demo implementation evidence.
- Verify normalized entitlement state from backend/provider evidence, not redirect parameters.
- Verify usage and purchased-credit ledger behavior independently of mocked AI output.
- Verify storefront eligibility and app-to-web return behavior before claiming an iOS route.

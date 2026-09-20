# SLICE-001 Go Monthly + PayPal Wallet Implementation Plan

## Current scope override — 2026-09-19

The approved REQUIREMENTS email-OTP-only amendment supersedes temporary-account promises in the historical material below. The current customer demo uses persistent real-email OTP only, reusing the approved email form and C3-G light/dark styling; no temporary selector, alias or reveal-code action is supported. TC-0003 current UI execution and TC-0015 temporary acceptance are **deferred, not passed**. Persistent same-intent resume, refresh and non-mutation obligations are now explicitly part of TC-0014. Retained backend temporary-session/security tests and account data remain unchanged.

Temporary expiry remains unresolved; prior failures and evidence remain historical, not fixed or relabeled. This does not defer unrelated subscription temporary-recovery concepts. Local fixture results do not prove hosted OTP delivery/login, allowance database invariance or payment. EVID-0006 remains partial; EVID-0003/EVID-0005 and TASK-0009 payment/full-slice gates remain separate. Implementation detail and pending candidate/review gates: `tracking/tasks/TASK-0005/email-otp-only-plan.md` and `tracking/tasks/TASK-0005/email-otp-only-execution.md` (demo-relative paths).


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- Status: approved
- User approval reference: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-13:slice-001-implementation-plan-approved
- Architecture amendment: `architecture/ADR-0001-vite-express-shared-api.md`
- Architecture amendment approval: user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-27:adr-0001-vite-express-shared-api-approved
- Governing charter: `slices/SLICE-001.md`
- Governing requirements: REQ-0034, REQ-0035, REQ-0036, REQ-0037, REQ-0038

**Goal:** Deliver one hosted, merchant-demonstrable web journey from Go Monthly selection through Supabase identity, an exact $5.53 Seattle quote, PayPal Wallet funding and reusable-credential verification, 100-unit activation, one confirmed 10-unit Generate Answer action, and a persisted 90-unit return balance.

**Architecture:** Build one Render Node.js service that mounts versioned `/api/v1` Express 5 JSON routes and provider hooks, then serves the compiled Vite React application with a browser-history fallback. Web and future native clients share the API contracts, while framework-independent server modules own quote, payment, entitlement, and usage transitions. Supabase owns Auth and Postgres persistence; PayPal owns the hydrated Wallet approval control; no separate microservice, queue, renewal scheduler, or general provider abstraction is introduced.

**Tech Stack:** Node.js 24.18.0 LTS, Express 5, Vite, TypeScript, React, declarative React Router, Tailwind CSS, shadcn/ui primitives, `@supabase/supabase-js`, Supabase CLI/Postgres, `postgres`, Zod, PayPal JS SDK/Orders v2 REST, Vitest, Playwright, and axe-core. TASK-0006 must verify and pin exact package versions before implementation.

## Global Constraints

- Implement only SLICE-001. Plus, Pro, Pro Max, annual, credits, tier changes, refunds, renewal execution, additional payment methods, Integration Lab, native clients, and administrator workflows remain non-executable.
- Use thin Express `/api/v1` adapters for customer mutation APIs so web and future native clients reuse the same HTTP contracts.
- Keep payment, entitlement, allowance, OTP capture, and raw provider evidence in server-only modules and database tables. The browser receives only sanitized DTOs.
- Use verified Supabase bearer tokens for persistent authenticated APIs. Keep the signed HttpOnly `.test` demo-session cookie separate and limited to originating-browser OTP retrieval.
- Never expose the Supabase secret/service-role key, database URL, PayPal secret, webhook IDs/secrets, Send Email Hook secret, Resend key, raw OTP, complete vault ID, or full provider payload in browser bundles, logs, analytics, URLs, screenshots, or test snapshots.
- The Supabase Send Email Hook must verify the Standard Webhooks signature over the unmodified request body. `.test` OTPs are stored only for five minutes and bound to the originating signed HttpOnly demo-session cookie; real-email OTP delivery routes through Resend without claiming production deliverability.
- Store money as integer cents, tax as integer basis points, and timestamps as `timestamptz`. Display the approved fixture in `America/Los_Angeles` while retaining UTC instants.
- The initial PayPal request uses `attributes.vault.usage_pattern: SUBSCRIPTION_PREPAID`, one RBA billing-plan item, $5.00 `item_total`, $0.53 `tax_total`, and no recurring `breakdown.discount`.
- Create and capture use different stable `PayPal-Request-Id` values. Browser approval is never funding evidence; only verified `COMPLETED` capture funds the arrangement.
- Funding and vault readiness are independent. A nested vault status of `APPROVED` leaves renewal suppressed until uniquely correlated, verified `VAULT.PAYMENT-TOKEN.CREATED` evidence arrives.
- Database transactions must not wrap external Supabase, Resend, or PayPal HTTP calls. Acquire row locks only for short, deterministic state transitions and always in stable primary-key order.
- Use real Fraunces and Source Sans 3 font assets, the approved C3-G light/dark tokens, 44px mobile targets, visible focus, reduced-motion treatment, and no horizontal document overflow.
- Pin installed packages exactly and commit `package-lock.json`. Run dependency audit and current official-document checks before execution because Supabase Auth and PSP behavior can change.
- Do not claim provider completion, hosted completion, accessibility completion, or production readiness without the corresponding passing `EVID-*` record.

---

## File And Ownership Map

| Area | Files | Responsibility |
| --- | --- | --- |
| Runtime | `.node-version`, `package.json`, `package-lock.json`, `vite.config.ts`, root and scoped TypeScript configuration, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`, `render.yaml` | pinned runtime, scripts, single-service build/start, test boundaries, and environment inventory |
| App shell | `web/index.html`, `web/src/main.tsx`, `web/src/app.tsx`, `web/src/routes/*`, `web/src/styles/*` | Vite React composition and declarative browser routes only |
| UI | `web/src/components/app/*`, `web/src/components/checkout/*`, `web/src/components/workspace/*`, `web/src/components/ui/*` | approved C3-G presentation and shadcn primitives; no authoritative state mutation |
| API contracts | `shared/src/identity.ts`, `shared/src/checkout.ts`, `shared/src/paypal.ts`, `shared/src/usage.ts` | Zod request/response schemas safe for web and future clients |
| Auth | `web/src/lib/supabase.ts`, `server/src/middleware/auth.ts`, `server/src/domain/auth/*` | Supabase bearer-token verification, verified current account, separate demo-session cookie, and Send Email Hook verification/routing |
| Database | `supabase/config.toml`, CLI-generated `supabase/migrations/*_slice001_core.sql`, `supabase/tests/slice001_core_test.sql`, `src/server/db/client.ts`, `src/server/db/repositories/*` | private normalized state, immutable raw evidence, short transactions, ownership queries |
| Quote | `src/server/quote/go-monthly-seattle.ts`, `src/server/quote/service.ts` | deterministic versioned $5.53 fixture and replacement rules |
| PayPal | `src/server/paypal/gateway.ts`, `src/server/paypal/http-gateway.ts`, `src/server/paypal/fake-gateway.ts`, `src/server/paypal/payload.ts`, `src/server/paypal/service.ts`, `src/server/paypal/webhook.ts` | exact provider calls and evidence normalization behind one PayPal-specific seam |
| Entitlement/usage | `src/server/entitlement/service.ts`, `src/server/usage/service.ts`, `src/server/usage/fixtures.ts` | verified activation, allowance window, atomic reserve/commit/release, deterministic answer |
| HTTP adapters | `server/src/app.ts`, `server/src/server.ts`, `server/src/routes/*`, `server/src/middleware/*` | authentication, validation, versioned routing, static/history delivery, status mapping, and sanitized DTO responses |
| Verification | `server/src/**/*.test.ts`, `shared/src/**/*.test.ts`, `web/src/**/*.test.tsx`, `tests/e2e/*.spec.ts`, `tests/fixtures/paypal/*`, `tests/evidence/*` | automated proof, sanitized capture helpers, and hosted deployment contract |

Historical TASK-0001 through TASK-0003 sections below retain their reviewed implementation record. Their Next-specific file paths and adapter instructions are superseded by ADR-0001 and are not executable authority. TASK-0006, TASK-0007, and TASK-0008 provide replacement runtime and adapter plans without rewriting prior acceptance history.

## Core Interfaces

```ts
export type Money = Readonly<{ currency: "USD"; cents: number }>;

export type CheckoutReview = Readonly<{
  intentId: string;
  quoteId: string;
  tier: "go";
  cadence: "monthly";
  base: Money;
  promotion: Money;
  taxableSubtotal: Money;
  taxBasisPoints: 1055;
  tax: Money;
  dueToday: Money;
  expiresAt: string;
  renewsAt: string;
  allowanceResetsAt: string;
  timeZone: "America/Los_Angeles";
  pricingVersion: string;
  taxVersion: string;
}>;

export interface PayPalGateway {
  createUserIdToken(targetCustomerId?: string): Promise<{ idToken: string }>;
  createOrder(
    input: PayPalCreateOrderInput,
    requestId: string,
    clientMetadataId: string,
  ): Promise<PayPalOrderCreated>;
  captureOrder(orderId: string, requestId: string): Promise<PayPalCaptureEvidence>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<PayPalVerifiedWebhook>;
}

export type PayPalCaptureEvidence = Readonly<{
  orderId: string;
  captureId: string;
  captureStatus: "COMPLETED";
  amount: Money;
  payeeMerchantId?: string;
  capturedAt: string;
  vaultStatus: "VAULTED" | "APPROVED";
  paypalCustomerId?: string;
  vaultId?: string;
}>;

export type UsageOutcome =
  | { status: "committed"; operationId: string; remainingUnits: 90; result: SimulatedAnswer }
  | { status: "released"; operationId: string; remainingUnits: 100; reason: "failed" | "canceled" };
```

## Data Model

The CLI-generated migration creates one non-exposed `app_private` schema and these focused tables:

- `accounts`: Supabase `auth.users.id`, trusted `identity_kind`, and temporary-demo expiry.
- `demo_sessions`: hashed signed-cookie token, high-entropy `.test` alias, five-minute OTP capture fields, and twenty-four-hour session boundary.
- `checkout_intents`: opaque public ID, anonymous-session hash, eventual user owner, Go/monthly selection, and state.
- `quotes`: immutable cents/basis-points amounts, version identifiers, UTC timestamps, timezone, and supersession link.
- `provider_customers`: merchant/environment-scoped Supabase-user ↔ PayPal-customer provenance mapping.
- `payment_operations`: quote/order ownership, stable create/capture request IDs, funding state, vault state, and provider-effective timestamps.
- `provider_events`: unique PayPal event ID, raw JSON evidence, signature result, correlation result, and processing timestamp.
- `payment_methods`: provider customer, masked display data, unique vault ID, readiness, and primary status.
- `billing_arrangements`: Go/monthly normalized funding, reusable readiness, entitlement, renewal, and allowance-reset state.
- `allowance_windows`: exactly one 100-unit window per arrangement boundary with reserved and committed counters.
- `usage_operations`: unique client operation ID, 10-unit Generate Answer reservation, terminal outcome, and fixture key.

All primary keys are `bigint generated always as identity`; external references are unique UUIDs. Every foreign key is indexed. Check and unique constraints encode valid statuses, non-negative counters, quote arithmetic, one primary method, one allowance window, provider-event idempotency, and at most one pending vault operation per merchant/environment/PayPal customer. `PUBLIC`, `anon`, and `authenticated` receive no access to `app_private`; only the server-side database connection may query it.

## Task 1: Runtime And Server-Owned Persistence Foundation

**Files:**
- Create: `.node-version`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `.env.example`
- Create: `src/server/config/env.ts`, `src/server/config/env.test.ts`, `src/server/db/client.ts`
- Create: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`
- Create: `supabase/config.toml`, CLI-generated `supabase/migrations/*_slice001_core.sql`, `supabase/tests/slice001_core_test.sql`

**Interfaces:**
- Produces `RuntimeEnv`, `createBrowserSupabaseClient()`, `createServerSupabaseClient()`, `requireCurrentUser()`, `sql`, and the complete SLICE-001 database contract.
- Consumed by every later task; it consumes no application interface.

- [ ] **Step 1: Write failing runtime and schema tests.**

```ts
it("rejects a browser-visible secret", () => {
  expect(() => parseRuntimeEnv({ NEXT_PUBLIC_PAYPAL_CLIENT_SECRET: "secret" })).toThrow();
});

it("requires the server-only database and webhook settings", () => {
  expect(() => parseRuntimeEnv({})).toThrow(/DATABASE_URL/);
});
```

`supabase/tests/slice001_core_test.sql` must assert all eleven tables exist in `app_private`, `anon` and `authenticated` have no schema usage, quote totals satisfy `500 + 53 = 553`, foreign keys have indexes, provider event IDs are unique, and the pending-vault partial unique index rejects a second pending operation for the same correlation tuple.

- [ ] **Step 2: Run the focused tests and confirm they fail because runtime and schema files do not exist.**

Run: `npm test -- src/server/config/env.test.ts`

Run: `npx supabase test db --file supabase/tests/slice001_core_test.sql`

Expected: the TypeScript import and SQL relations are missing; no test may pass against an empty scaffold.

- [ ] **Step 3: Create the minimal pinned application and database foundation.**

Use Node 24.18.0, Next.js 16.3.0 stable, npm, TypeScript strict mode, App Router, Tailwind, Vitest, Playwright, Supabase packages, `postgres`, and Zod. This supersedes the originally reviewed 16.2.11 pin because the pre-execution production audit found high-severity vulnerable transitive PostCSS and Sharp releases, while the npm stable tag and audit remediation point to 16.3.0. Run `npx supabase init`, then `npx supabase migration new slice001_core`; edit only the CLI-generated migration. Keep authenticated pages dynamic, make `src/proxy.ts` refresh Supabase cookies, validate every environment variable in `RuntimeEnv`, and open Postgres connections only from server-only modules.

- [ ] **Step 4: Verify the foundation.**

Run: `npm run typecheck && npm run lint && npm test -- src/server/config/env.test.ts`

Run: `npx supabase db reset && npx supabase test db --file supabase/tests/slice001_core_test.sql`

Expected: all commands pass; the Data API cannot access `app_private`; no secret name is prefixed `NEXT_PUBLIC_`.

- [ ] **Step 5: Capture EVID-0001 and submit TASK-0001 for independent review before continuing.**

Review must inspect the migration, privilege boundary, constraints, dependency audit, lockfile, and environment inventory. Do not implement customer flow during this task.

## Task 2: Pending Intent, Supabase Identity, And Exact Quote

**Files:**
- Create: `src/contracts/identity.ts`, `src/contracts/checkout.ts`
- Create: `src/server/auth/demo-session.ts`, `src/server/auth/send-email-hook.ts`, `src/server/auth/service.ts`
- Create: `src/server/checkout/repository.ts`, `src/server/checkout/service.ts`
- Create: `src/server/quote/go-monthly-seattle.ts`, `src/server/quote/service.ts`
- Create: `src/app/api/checkout-intents/route.ts`, `src/app/api/auth/request-otp/route.ts`, `src/app/api/auth/verify-otp/route.ts`, `src/app/api/auth/demo-session/route.ts`, `src/app/api/auth/demo-session/otp/route.ts`, `src/app/api/hooks/supabase/send-email/route.ts`, `src/app/api/quotes/route.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/checkout/[intentId]/page.tsx`, `src/components/checkout/identity-panel.tsx`, `src/components/checkout/quote-review.tsx`
- Create: `render.yaml` only as the minimal hosted identity-and-quote proof prerequisite; TASK-0005 extends this existing deployment contract for the complete slice
- Test: `src/server/auth/service.test.ts`, `src/server/quote/service.test.ts`, `tests/e2e/identity-and-quote.spec.ts`

**Interfaces:**
- Consumes `RuntimeEnv`, Supabase clients, `sql`, and the Task 1 schema.
- Produces `CreateCheckoutIntentResponse`, `RequestOtpRequest`, `VerifyOtpRequest`, `CheckoutReview`, `createGoMonthlyQuote(clock)`, and a verified-user-owned intent.

Approved TASK-0002 reconciliation `user:TASK-0002:2026-08-19:minimal-reconciliation-approved` assigns the smallest runnable App Router shell and hosted Supabase-hook deployment prerequisite to this task. TASK-0005 extends those files for complete-slice closure. Application-account suspension remains in REQ-0011/REQ-0031 and SLICE-005 rather than adding a new SLICE-001 schema or UI state.

- [ ] **Step 1: Write failing TC-0002, TC-0003, and TC-0004 tests.**

```ts
expect(createGoMonthlyQuote(now)).toMatchObject({
  base: { currency: "USD", cents: 1000 },
  promotion: { currency: "USD", cents: 500 },
  taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055,
  tax: { currency: "USD", cents: 53 },
  dueToday: { currency: "USD", cents: 553 },
  timeZone: "America/Los_Angeles",
});
```

The interaction test selects Go before Auth, verifies a real email or originating `.test` OTP, and expects a newly created quote rather than the pre-auth total. The security test sends the same alias from a different signed cookie and expects the same non-enumerating denial used for unknown or expired sessions.

- [ ] **Step 2: Run the focused tests and confirm they fail at the missing route/domain boundary.**

Run: `npm test -- src/server/auth/service.test.ts src/server/quote/service.test.ts`

Run: `npm run test:e2e -- tests/e2e/identity-and-quote.spec.ts`

- [ ] **Step 3: Implement intent and Auth without payment side effects.**

`POST /api/checkout-intents` creates an anonymous Go/monthly intent and binds it to a signed HttpOnly `SameSite=Lax` cookie. `POST /api/auth/request-otp` calls Supabase `signInWithOtp`; `POST /api/auth/verify-otp` calls Supabase `verifyOtp`, creates or restores `accounts`, transfers only the matching intent to the verified user, and creates a fresh quote. Authentication must not call a PayPal module or alter entitlement.

For `.test`, create a random alias and session secret, verify the Supabase Hook signature over raw bytes, store the OTP for five minutes, and return it only to the matching cookie. Delete it after verified use or expiry. For real email, forward the verified hook payload through Resend; do not store the OTP and do not label delivery production-ready.

- [ ] **Step 4: Implement the approved plan, identity, and review surfaces.**

Use the C3-G tokens and approved state-board copy. The review must show $10.00, −$5.00, $5.00, 10.55%, $0.53, $5.53, the absolute quote expiry, the next renewal timestamp, and the separate allowance-reset timestamp. A changed location/version/expiry creates a new quote ID and requires reconfirmation.

- [ ] **Step 5: Verify Task 2 and capture EVID-0002.**

Run: `npm test -- src/server/auth/service.test.ts src/server/quote/service.test.ts`

Run: `npm run test:e2e -- tests/e2e/identity-and-quote.spec.ts`

Expected: persistent and temporary identities resume the same intent; cross-session OTP retrieval fails; stale quotes cannot advance; no payment operation exists.

## Task 3: PayPal Wallet Funding And Vault Reconciliation

**Files:**
- Create: `src/contracts/paypal.ts`
- Create: `src/server/paypal/gateway.ts`, `src/server/paypal/http-gateway.ts`, `src/server/paypal/fake-gateway.ts`, `src/server/paypal/payload.ts`, `src/server/paypal/service.ts`, `src/server/paypal/webhook.ts`
- Create: `src/app/api/paypal/id-token/route.ts`, `src/app/api/paypal/orders/route.ts`, `src/app/api/paypal/orders/[orderId]/capture/route.ts`, `src/app/api/webhooks/paypal/route.ts`
- Create: `src/components/checkout/paypal-wallet-button.tsx`, `src/components/checkout/payment-verification.tsx`, `src/components/checkout/activation-state.tsx`
- Test: `src/server/paypal/payload.test.ts`, `src/server/paypal/service.test.ts`, `src/server/paypal/webhook.test.ts`, `tests/e2e/paypal-checkout.spec.ts`
- Fixture: `tests/fixtures/paypal/create-order.json`, `tests/fixtures/paypal/capture-vaulted.json`, `tests/fixtures/paypal/capture-approved.json`, `tests/fixtures/paypal/vault-created.json`

**Interfaces:**
- Consumes verified user, current quote, Task 1 repositories, and `PayPalGateway`.
- Produces `PayPalCreateOrderInput`, `PayPalCaptureEvidence`, verified normalized funding/vault states, sanitized checkout status, and one exactly-once verified-funded arrangement transition for Task 4.
- Does not activate entitlement or create an allowance window. Its customer checkpoint says payment is verified and Go activation is still processing; Task 4 owns the atomic 100-unit grant and the final active-workspace treatment.

- [ ] **Step 1: Write failing TC-0005, TC-0006, and TC-0007 tests.**

```ts
expect(buildInitialPayPalOrder(review)).toMatchObject({
  intent: "CAPTURE",
  payment_source: { paypal: { attributes: { vault: {
    store_in_vault: "ON_SUCCESS",
    usage_type: "MERCHANT",
    usage_pattern: "SUBSCRIPTION_PREPAID",
  }}}},
  purchase_units: [{
    amount: { value: "5.53", breakdown: {
      item_total: { value: "5.00" },
      tax_total: { value: "0.53" },
    }},
  }],
});
expect(JSON.stringify(buildInitialPayPalOrder(review))).not.toContain("discount");
```

Tests also require separate stable create/capture request IDs, reject capture amount/currency/owner mismatches, keep `APPROVED` vault state pending, accept `VAULTED` immediately, reject invalid webhook signatures, deduplicate event IDs, and quarantine absent or ambiguous delayed-vault correlation.

- [ ] **Step 2: Run focused tests and confirm the gateway/service boundary is missing.**

Run: `npm test -- src/server/paypal/payload.test.ts src/server/paypal/service.test.ts src/server/paypal/webhook.test.ts`

- [ ] **Step 3: Implement the PayPal-specific adapter and server routes.**

Use one direct first-party sandbox merchant and that merchant's REST app credentials. `PAYPAL_MERCHANT_ID` is the server-only expected payee identity copied from that sandbox business account; do not infer it from browser input. This pilot is not a platform or partner integration, so it must not send `PayPal-Auth-Assertion`, `PayPal-Partner-Attribution-Id`, or an on-behalf-of SDK merchant ID. `PAYPAL_WEBHOOK_ID` must identify the listener created for the same PayPal environment.

Generate the short-lived user ID token server-side; pass `target_customer_id` only for an existing scoped PayPal customer mapping. On the web checkout page, load PayPal FraudNet, generate one browser risk identifier for the attempt, send that value to the same-origin create-order route, validate it as an opaque bounded identifier, and forward it only as the Orders v2 `PayPal-Client-Metadata-Id` header. Do not log or persist the raw risk identifier. A missing or invalid value fails closed before the provider call. This is the TASK-0003 web RDA path; native Magnes remains future mobile scope.

Persist the payment operation and create request ID before calling Orders v2. Enforce one external-call owner per operation: the owner performs the provider call, while concurrent same-operation callers receive a sanitized `in_progress` response and retry through the stored operation rather than starting another PayPal order. Capture outside a database transaction. Project `PayPalCaptureEvidence` only from the stored order relation and the authoritative nested capture transaction: nested capture ID, nested `status=COMPLETED`, nested amount/currency, nested payee merchant ID when returned, capture timestamp, and PayPal vault/customer fields. Reject missing or multiple authoritative captures and any order, amount, currency, quote, environment, owner, or configured-payee mismatch before applying the normalized funded-arrangement transition in one short transaction. An identical retry reuses only its operation-specific request ID.

Render the official hydrated PayPal control through `@paypal/react-paypal-js`; no merchant-drawn yellow substitute is allowed in runtime. Lock merchant controls during server verification. PayPal cancel returns to the valid review; capture failure grants nothing.

- [ ] **Step 4: Implement verified webhook reconciliation.**

Read the raw body before parsing. Verify PayPal delivery with the configured webhook ID and official verification API. Store invalid delivery as rejected raw evidence without state transition. For `VAULT.PAYMENT-TOKEN.CREATED`, require expected merchant/environment, exactly one pending operation for `resource.customer.id`, and an unowned vault ID; otherwise quarantine. A valid event promotes only the linked method and arrangement to reusable-ready. Use a fake-repository fixture to prove the defensive ambiguous-correlation branch. Against real PostgreSQL, prove the pending-vault uniqueness constraint rejects creation of the second ambiguous row; do not claim a database state the schema forbids.

- [ ] **Step 5: Verify fake-gateway behavior, then run the explicit sandbox gate and capture EVID-0003.**

Run: `npm test -- src/server/paypal/payload.test.ts src/server/paypal/service.test.ts src/server/paypal/webhook.test.ts`

Run: `npm run test:e2e -- tests/e2e/paypal-checkout.spec.ts`

Sandbox execution must separately capture immediate `VAULTED` if available and delayed `APPROVED → VAULT.PAYMENT-TOKEN.CREATED` if available. Hosted closure must also show that the configured `PAYPAL_WEBHOOK_ID` belongs to the same sandbox environment and listener URL and that this listener is actually subscribed to `VAULT.PAYMENT-TOKEN.CREATED`. Capture sanitized proof that the FraudNet identifier reached Orders v2 as `PayPal-Client-Metadata-Id`; never retain its raw value. If merchant eligibility, RDA propagation, endpoint subscription, delivery, or delayed correlation cannot be proved, funding may pass but EVID-0003 remains blocked and renewal remains suppressed.

## Task 4: Atomic Allowance And Deterministic Generate Answer

**Files:**
- Create: `shared/src/usage.ts`
- Create: `server/src/domain/usage/repository.ts`, `server/src/domain/usage/service.ts`, `server/src/domain/usage/fixtures.ts`
- Create: `server/src/routes/usage.ts`
- Create: `web/src/routes/workspace.tsx`, `web/src/components/workspace/allowance-card.tsx`, `web/src/components/workspace/generate-answer.tsx`, `web/src/components/workspace/action-confirmation.tsx`, `web/src/components/workspace/simulated-message.tsx`
- Modify narrowly: `server/src/server.ts`, `web/src/app.tsx`, `web/src/lib/api.ts`, the existing verified-funding checkout handoff, and workspace styles
- Test: shared contract, usage repository/service/router, workspace/handoff component, actual-Postgres integration, and `tests/e2e/generate-answer.spec.ts` tests under the existing Vite/Express workspace

**Interfaces:**
- Consumes a verified funded arrangement, authenticated user, and client operation UUID; creates or reuses the arrangement's one allowance window before usage.
- Produces an idempotent 100-unit grant, `UsageOutcome`, sanitized account summary, and deterministic simulated answer.

- [ ] **Step 1: Write failing TC-0008, TC-0009, and TC-0010 tests.**

```ts
await Promise.all([
  service.runGenerateAnswer(userId, operationId),
  service.runGenerateAnswer(userId, operationId),
]);
expect(await remainingUnits(userId)).toBe(90);
expect(await committedUsageCount(operationId)).toBe(1);
```

Add a failure fixture that reserves 10, produces no answer, releases all 10, and leaves 100. Add a return-visit browser assertion that the server summary restores 90 rather than creating another allowance window.

- [ ] **Step 2: Run the focused tests and confirm they fail before the atomic service exists.**

Run: `npm test -- shared/src/usage.test.ts server/src/domain/usage/service.test.ts server/src/routes/usage.test.ts web/src/routes/workspace.test.tsx`

Run: `npm run test:e2e -- tests/e2e/generate-answer.spec.ts`

- [ ] **Step 3: Implement the short reserve/commit/release transactions.**

Every transaction that mutates both records uses one lock order: allowance window first, then usage operation. On confirmed action, lock the current allowance row, insert or retrieve and lock the unique usage operation, verify at least 10 available units, and reserve 10. Release the transaction before producing the deterministic fixture. Commit and release first resolve the owned allowance identifier without mutation, then lock the allowance row and usage operation in that same order and re-read their state before one guarded terminal transition. Duplicate or concurrent calls return the existing terminal result.

- [ ] **Step 4: Implement the approved workspace interaction.**

Show `#Generate Answer`, the exact 10-unit confirmation and projected 90-unit balance before the POST, disabled conflicting controls while processing, simulated-output labeling, durable success Toast as supplemental feedback, and the return state with 90. Toast must not own the balance or result state.

- [ ] **Step 5: Verify Task 4 and capture EVID-0004.**

Run: `npm test -- shared/src/usage.test.ts server/src/domain/usage/service.test.ts server/src/routes/usage.test.ts web/src/routes/workspace.test.tsx`

Run: `node --env-file=.env.local node_modules/@playwright/test/cli.js test --config=playwright.task0004.config.ts tests/e2e/generate-answer.spec.ts`

Expected: one funding fact grants one window; one confirmed successful operation commits 10; duplicate calls do not reach 80; failure produces no result and remains 100.

## Task 5: Hosted Identity And Sanitized Identity Evidence

**Split authority:** `user:TASK-0005:2026-09-01:task0005-task0009-split-approved`

**Outcome:** Use the existing Vite React plus Express single-service architecture to prove the already approved identity contract on Render: persistent real-email users receive a Resend-delivered six-digit Supabase OTP and resume the same pending Go intent, while temporary `.test` OTP retrieval remains limited to the signed originating browser session. Capture only sanitized identity success and contained-failure evidence in EVID-0006.

**Interfaces:** Consume the accepted TASK-0006 runtime, TASK-0007 identity/intent/session behavior, and existing `render.yaml`, `/webhooks/supabase/send-email`, `/api/v1` identity routes, and capability-scoped email configuration. Produce TC-0014, TC-0015, and EVID-0006 without changing identity, quote, payment, allowance, schema, or UI semantics.

**Planning boundary:** Exactly four acceptance criteria may cover the existing Render deployment, Supabase Send Email Hook plus Resend six-digit OTP delivery, hosted persistent and originating-browser temporary identity proof, and sanitized success/failure evidence. The executor-ready file list, test-first steps, hosted commands, and evidence manifest remain owned by the independently reviewed TASK-0005 plan.

**Non-goals:** Magic Link callback/resume, password or identity redesign, schema migration, checkout/payment/vault/allowance/AI changes, hosted PayPal proof, new visual direction, mobile work, production email deliverability, public launch, and production readiness.

## Task 9: Complete Responsive And Hosted Slice Closure

**Split authority:** `user:TASK-0005:2026-09-01:task0005-task0009-split-approved`

**Outcome:** After TASK-0005 acceptance, retain and close the remaining complete-slice obligations: TC-0011 responsive/theme/typography/accessibility evidence, the non-identity and provider portions of TC-0012, and final EVID-0005 aggregation across accepted quote, payment, allowance, usage, failure, and hosted evidence.

**Interfaces:** Consume accepted TASK-0007, TASK-0008, TASK-0004, and TASK-0005 outputs without reopening their product semantics. Produce only evidence-backed complete-slice closure and keep unproved hosted PayPal webhook/delayed-vault or production claims blocked.

**Planning boundary:** TASK-0009 requires a separate user start-planning gate. Its planner must reuse DESIGN-0157 through DESIGN-0160 and split again if one executor-ready plan cannot remain coherent with at most five acceptance criteria.

**Non-goals:** Subsequent renewal charge, new provider lane, product redesign, identity/payment/allowance behavior changes, public launch, mobile apps, Integration Lab, and production readiness.

## Task 6: Vite And Express Runtime Foundation Reconciliation

**Architecture authority:** `architecture/ADR-0001-vite-express-shared-api.md`

**Outcome:** Replace only the runtime foundation with one production Node service that mounts Express `/api/v1` and webhook boundaries, serves a compiled Vite React shell with browser-history fallback, validates base and capability-specific configuration correctly, and exposes a sanitized health result. The bounded executor-ready plan lives at `tracking/tasks/TASK-0006/plan.md` after planner and critic review.

**Non-goals:** identity, quote, checkout, PayPal, domain-service migration, database/schema changes, customer-flow redesign, mobile clients, multiple deployables, and generic platform abstractions.

## Task 7: Identity, Temporary Session, Exact Quote, And Vite Parity

**Architecture authority:** `architecture/ADR-0001-vite-express-shared-api.md`

**Outcome:** Accepted on exact candidate `71b77fd62128cdb475be46a769c9c07571f1accb`. After TASK-0006 acceptance, the task migrated pending checkout intent, Supabase identity, the separate signed HttpOnly `.test` originating-browser session, exact quote and stale replacement behind bearer-authenticated `/api/v1` adapters and approved Vite React identity/quote surfaces. It also applied the explicitly approved additive OTP-issuance lifetime correction and replaced only the applicable superseded Next-specific tests and EVID-0002 runtime/browser proof. The accepted boundary ends at a current reviewed quote without a PSP call.

**Non-goals:** PayPal or another PSP call, funding or vault readiness, allowance/activation, new customer behavior, redesign, mobile clients, legacy route compatibility, schema beyond the approved OTP-issuance lifetime correction, and generic abstractions.

## Task 8: PayPal Funding, Vault Reconciliation, And Vite Parity

**Architecture authority:** `architecture/ADR-0001-vite-express-shared-api.md`

**Outcome:** After TASK-0007 acceptance, migrate the retained PayPal funding and vault-reconciliation behavior behind bearer-authenticated `/api/v1` adapters, raw verified PayPal webhook handling, and approved Vite React provider states. Preserve exact initial order payload, operation-specific idempotency, funding separate from reusable readiness, and exact delayed-vault correlation while replacing only the applicable EVID-0003 runtime/browser proof. End at the reviewed TASK-0003 handoff without allowance or activation.

**Non-goals:** TASK-0004 allowance/activation, renewal charging, new payment lanes, redesign, generic PSP abstraction, mobile clients, legacy route compatibility, schema changes, or production claims without provider evidence.

## Test Strategy

- Unit: quote arithmetic/versioning, PayPal payload construction, state normalization, environment validation, entitlement and usage transition rules.
- Integration: local Supabase Auth/Postgres ownership, intent transfer, quote replacement, database constraints, PayPal fake-gateway capture/webhook transitions, and atomic allowance operations.
- Interaction/browser: approved laptop/mobile customer flow, official provider region, confirmation/disabled states, return persistence, and contained recovery.
- Security: cross-session OTP denial, raw-body hook/webhook verification, secret scanning, ownership mismatches, ambiguous vault-event quarantine, and duplicate-event rejection.
- Sandbox/hosted: real hosted Supabase Hook, real PayPal sandbox button/order/capture/vault evidence, Render HTTPS callbacks, and merchant-safe sanitized proof.
- Accessibility/typography: keyboard/focus, 44px targets, contrast, reduced motion/transparency, non-color meaning, loaded fonts, and zero horizontal overflow.

## Requirement Traceability Matrix

| Requirement | Slice | Design decisions | Implementation tasks | Test cases | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-0034 | SLICE-001 | DESIGN-0157, DESIGN-0160 | TASK-0001, TASK-0002, TASK-0005, TASK-0007, TASK-0009 | TC-0001, TC-0002, TC-0003, TC-0012, TC-0014, TC-0015 | EVID-0001, EVID-0002, EVID-0005, EVID-0006 |
| REQ-0035 | SLICE-001 | DESIGN-0157, DESIGN-0160 | TASK-0002, TASK-0007, TASK-0009 | TC-0004, TC-0012 | EVID-0002, EVID-0005 |
| REQ-0036 | SLICE-001 | DESIGN-0158, DESIGN-0160 | TASK-0001, TASK-0003, TASK-0008, TASK-0009 | TC-0001, TC-0005, TC-0006, TC-0007, TC-0012 | EVID-0001, EVID-0003, EVID-0005 |
| REQ-0037 | SLICE-001 | DESIGN-0159, DESIGN-0160 | TASK-0001, TASK-0004, TASK-0009 | TC-0001, TC-0008, TC-0009, TC-0010, TC-0012 | EVID-0001, EVID-0004, EVID-0005 |
| REQ-0038 | SLICE-001 | DESIGN-0158, DESIGN-0159, DESIGN-0160 | TASK-0001, TASK-0002, TASK-0003, TASK-0004, TASK-0005, TASK-0006, TASK-0007, TASK-0008, TASK-0009 | TC-0001 through TC-0015 | EVID-0001, EVID-0002, EVID-0003, EVID-0004, EVID-0005, EVID-0006 |

## Platform Plan

- Web: responsive Vite React single-page application using declarative React Router and the approved shadcn-based C3-G design contract; Express supplies the browser-history fallback.
- Backend: the same Render Node service exposes versioned Express `/api/v1` JSON APIs and framework-independent server modules; future mobile clients may call these contracts after their own slices are approved.
- Database: Supabase Postgres in a non-exposed `app_private` schema with server-only access, constraints, immutable provider evidence, and short transactions; Supabase Auth owns the user session and Express verifies client bearer tokens.
- Email: Supabase Send Email Hook on Render; `.test` capture is originating-session-bound and real-email delivery uses Resend as a demo transport.
- Payments: PayPal Wallet JS SDK plus server-side Orders v2 and verified webhook handling; no PayPal Subscriptions product and no subsequent renewal execution.
- Hosting: one Render Node web service; no worker, queue, cron, Redis, or second deployable in SLICE-001.
- iOS/Android/H5/React Native: excluded from execution; no client package or endpoint promise beyond the web-used JSON contract.

## Agent And Reviewer Strategy

- Slice Steward and primary implementer: primary Codex agent, strongest suitable model, high effort.
- Each task requires test-driven development and an independent task review before the next payment- or state-dependent task begins.
- Requirements and engineering closure: `/root/slice001_requirements_review`, independent from the implementer.
- Design fidelity: `/root/slice001_design_review`, independent from the implementer.
- Payment-domain engineering sub-review: `/root/slice001_payment_review`, independent from the implementer.
- Escalate to the user before any architecture split, new provider, new account mode, change in money/allowance semantics, or deferral/removal.

## Plan Self-Review

- Spec coverage: every acceptance, negative case, test type, evidence type, approved design decision, and sandbox/hosted gate in REQ-0034 through REQ-0038 maps to a task, test, and evidence record.
- Placeholder scan: the executable tasks contain no deferred implementation language; evidence artifacts remain `planned` until execution because fabricated proof is prohibited.
- Type consistency: `CheckoutReview`, `PayPalGateway`, `UsageOutcome`, IDs, money, timestamps, and status names are defined once above and reused by all tasks.
- YAGNI check: one deployable service, one PayPal-specific adapter seam, no generic PSP framework, no queue, no renewal scheduler, no admin UI, no Integration Lab, and no future-tier implementation.

## Plan Approval Gate

TASK-0007 is accepted on exact candidate `71b77fd62128cdb475be46a769c9c07571f1accb`, TASK-0008 on `846f7c0d67233483b149226d3600e3ea45aff6a8`, and TASK-0004 on `5239e79f4d1b4aa557566ac9699ac34bf07d3359`. Their evidence boundaries remain explicit: TASK-0004 begins at the accepted authenticated funded-arrangement handoff, and EVID-0003 does not claim hosted webhook or production readiness. The user-approved TASK-0005/TASK-0009 split keeps hosted identity proof in TC-0014/TC-0015/EVID-0006 and preserves TC-0011/TC-0012/final EVID-0005 under TASK-0009. TASK-0005 requires an independently approved executor-ready plan; TASK-0009 requires a later separate start-planning gate. Any architecture, identity, PSP, money, entitlement, or allowance change returns to user approval.

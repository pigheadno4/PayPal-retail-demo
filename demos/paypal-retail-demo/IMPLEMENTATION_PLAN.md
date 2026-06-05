# PayPal Retail Demo Implementation Plan

## Goal

Implement a complex PayPal retail demo with a POP MART-style buyer experience, reusable MochiToy Studio profile, real PayPal sandbox payment flows, Supabase-backed data/auth, and a reusable Express backend for future mobile clients.

## Scope

V1 includes responsive web, backend APIs, Supabase schema/seed, delivery checkout, BOPIS checkout, PayPal payment methods, verified webhooks, account flows, Admin Portal, and tracking files.

Out of scope for v1:

- Fastlane
- subscriptions
- preorder payment collection
- native apps
- disputes/refunds
- reset/reseed tooling

## Technical Stack

- Web: Vite React with TypeScript
- Backend: Node.js Express with TypeScript
- Shared domain: TypeScript modules consumed by web, server, tests, and seed tooling
- Database/Auth: Supabase
- Assets: local app assets
- Payments: PayPal JS SDK v6 and npm package v9.x

## Supporting Planning Docs

- `DATA_MODEL.md`: Supabase table draft, profile scoping, cart/order snapshots, seed plan.
- `API_CONTRACT.md`: Express route draft, request/response rules, PayPal payload contracts.
- `ENVIRONMENT.md`: Milestone 0 environment strategy, local tool probe, env var shape, and wallet testing approach.
- `PAYPAL_EVIDENCE.md`: local `wiki-v2` source map for PayPal capabilities and demo-specific contracts.
- `IMPLEMENTATION_TASKS.md`: execution task breakdown, planned file structure, milestone gates.

## Evidence Pass

This section captures implementation evidence from `/Users/tengtao/Development/wiki-v2`. Treat `wiki-v2` raw/source pages as the PayPal source of truth for this repo. Use external PayPal docs only if the wiki has a gap or the user explicitly asks for a live refresh.

### PayPal SDK v6 And React

- Use PayPal JavaScript SDK v6 core script URLs:
  - Sandbox: `https://www.sandbox.paypal.com/web-sdk/v6/core`
  - Production: `https://www.paypal.com/web-sdk/v6/core`
- Initialize with `window.paypal.createInstance({ clientId, components, pageType, locale, clientMetadataId })`.
- Use `clientId` for standard one-time checkout, cards, Venmo, Apple Pay, and Google Pay.
- Use `clientToken` only where the current PayPal flow requires it, such as PayPal payment vaulting or Fastlane. Fastlane remains out of v1.
- Always call `findEligibleMethods({ currencyCode })` before rendering a payment method.
- SDK v6 `createOrder` must return `{ orderId: string }`, not a plain string.
- React integration should use `@paypal/react-paypal-js` v9.x SDK v6 APIs. The wiki source summary records v9.x SDK v6 APIs; final install should verify the package version locally when dependencies are added.

### Market Switching And Sandbox Buyer Country

- The active demo market controls currency, locale, buyer country, Pay Later buyer country, PayPal component set, and sandbox buyer simulation.
- JS SDK v6 uses a static loader plus runtime config, so market switch should not reload the whole app. Re-render the storefront from fresh API data and remount only the PayPal provider/payment subtree when the backend `provider_key` changes.
- Use `findEligibleMethods({ currencyCode })` after every market or amount change before rendering wallet rows.
- Pay Later messages must receive the market's buyer-country context. Homepage/category messages are non-amount promotional placements; PDP/cart/minicart/checkout messages are amount-aware.
- Sandbox testing must set the PayPal test buyer country for JS SDK v6 to simulate the buyer environment. Store this separately as `sandbox_test_buyer_country`, return it from config APIs only in sandbox/test, and map it to SDK v6 `createInstance({ testBuyerCountry })`. Production must not rely on this field.
- `wiki-v2` evidence for the SDK v6 type snapshot shows `testBuyerCountry?: string` on `CreateInstanceOptions`. During dependency install, verify the installed `@paypal/react-paypal-js` v9 / SDK v6 types still support that option before implementing the provider.
- Existing carts are scoped by `profile_id + market_id`. Admin market switch clears the active browser cart binding and checkout/payment context, then fetches or creates the cart for the new market. It never converts cart currency.
- Pending orders keep the original market, currency, locale, buyer country, sandbox test buyer country, PayPal config snapshot, and prices. Resume checkout uses the order's locked market config.

### Payment Method Evidence

- PayPal Client ID is browser-safe and should be delivered to the frontend through the backend SDK config API.
- PayPal Client Secret and OAuth access tokens are server-only.
- PayPal client token should be generated only for flows that require it, such as vault-enabled card or PayPal wallet flows.
- Authenticated save-for-future captures create local saved-payment records only when `vault_requested = true`: `VAULTED` becomes active immediately, while `APPROVED` stays pending until a verified `VAULT.PAYMENT-TOKEN.CREATED` webhook provides the vault ID.
- Saved payment deletion uses PayPal Payment Method Tokens delete when a vault ID exists, then marks the local account record deleted.
- PayPal webhook verification uses `POST /v1/notifications/verify-webhook-signature` with `PAYPAL_WEBHOOK_ID` and notification headers before any state mutation.
- PayPal and Pay Later use the `paypal-payments` component.
- Pay Later should be gated by eligibility. Amount-aware messages must use the current product/cart/order amount; message amount does not change the actual captured order amount.
- Card fields use the `card-fields` component, render PayPal-hosted iframe fields, submit the PayPal order ID as a plain string, and capture server-side after successful submit/3DS handling. The checkout UI keeps the card fields, save checkbox, and card pay button inside the expanded payment row rather than the Order Summary or mobile sticky bar.
- Apple Pay uses `applepay-payments` and has domain validation/browser/device prerequisites. Apple Pay go-live requires domain association and PayPal capability setup.
- Google Pay uses `googlepay-payments`, the Google Pay SDK, PayPal eligibility/config, `confirmOrder`, and possible 3DS payer action handling.
- Venmo uses `venmo-payments`, is US/USD focused, and has sandbox limitations. Desktop sandbox may not match production QR behavior.

### Delivery Express Evidence

- PDP/cart/minicart PayPal and Pay Later express are delivery-only.
- Use server-side shipping callbacks for express delivery because they support PayPal and Venmo and are better aligned with future mobile clients.
- Delivery express Create Order should use `shipping_preference: "GET_FROM_FILE"` so wallet address changes can trigger shipping callbacks.
- Subscribe to `SHIPPING_ADDRESS` first. Add `SHIPPING_OPTIONS` only if implementation needs recalculation when the buyer changes the selected option inside PayPal.
- Callback responses must keep PayPal amount breakdown internally consistent: selected shipping cost, item total, tax total, currency, and purchase unit total must all match the merchant snapshot.
- After PayPal approval, show merchant Review and Confirm for express only, then capture after final amount consistency verification.
- Backend capture uses the locked merchant/provider amount snapshot before calling PayPal; the sanitized Orders capture response is stored for Admin/debug review.
- Successful capture is the durable finalization point: order status becomes paid, payment session becomes captured, inventory decrements, lifecycle/total snapshots are written, and only paid order items are removed from the active cart.

### BOPIS Evidence And Demo Decision

- Do not use the authorize-at-checkout/capture-at-pickup BOPIS guide as the v1 implementation pattern. That document is not the flow this demo is intended to prove.
- V1 BOPIS is triggered by Create Order parameters, then captured at checkout after buyer approval.
- V1 BOPIS Create Order target is mandatory:
  - `intent: "CAPTURE"`
  - `payment_source.paypal.experience_context.shipping_preference: "SET_PROVIDED_ADDRESS"`
  - `purchase_units[].shipping.type: "PICKUP_IN_STORE"`
  - `purchase_units[].shipping.address`: selected store address
  - `purchase_units[].shipping.name.full_name`: `s2s ${storeName}` convention
- `PICKUP_IN_STORE` is a PayPal-recognized shipping type for store pickup. The older generic pickup value is deprecated in favor of `PICKUP_IN_STORE` or `PICKUP_FROM_PERSON`.
- Payload builder tests must assert the exact field placement and values above.
- The authorize-at-pickup pattern remains a future alternate flow only if the user explicitly asks for it.

### Vaulting Evidence

- Guests cannot vault in v1.
- Logged-in PayPal wallet save-for-future should use official vault attributes only where supported.
- After capture, store a saved payment as active when a vault/payment token ID is returned. If PayPal returns an approved/pending vault state and token completion is asynchronous, store local status as pending and activate from verified webhook.
- Token deletion must call the current PayPal token delete/revoke API where supported before local deletion.

### Webhook Evidence

- Webhook endpoint must verify PayPal signature before processing.
- Store raw valid webhook payloads, headers needed for audit/debug, verification result, linked order/payment session, and processing status.
- Invalid or unverifiable webhooks must be logged and must not mutate order, payment, or saved-payment state.
- Webhook processing must be idempotent by `provider + event_id`; PayPal retries should return the stored audit result without re-running mutations.

### PayPal Invoice And Line-Item Evidence

- PayPal rejects duplicate `invoice_id` values with `DUPLICATE_INVOICE_ID`; generate a unique PayPal invoice ID for each new PayPal transaction attempt.
- Delivery buyer-facing order numbers use `DO-YYYYMMDD-000001`.
- Pickup/BOPIS buyer-facing order numbers use `PO-YYYYMMDD-000001`.
- First PayPal attempt may use the buyer-facing order number as `purchase_units[].invoice_id`.
- If a pending order needs a fresh PayPal order/session, keep the buyer-facing order number stable and append an attempt suffix for PayPal `invoice_id`, such as `DO-20260526-000001-A2`.
- Use `PayPal-Request-Id` as the idempotency key for retrying the same PayPal API call with the same payload. Generate a new request ID when the payload changes.
- PayPal `items[]` should include detailed product data where available: name, quantity, unit amount, description, SKU, PDP URL, image URL, and `PHYSICAL_GOODS` category.
- PayPal amount breakdown must reconcile exactly: item total equals sum of item unit amounts times quantities; tax total equals sum of item taxes if item-level tax is sent.
- For BOPIS partial inventory, PayPal line items include only pickup-available quantities.

## Supabase Architecture Draft

### Access Model

- Frontend uses Supabase Auth and a publishable key for authentication only.
- Express is the main application data API for buyer, checkout, admin, and payment flows.
- Express uses a server-only Supabase secret/service credential. Never expose this credential to the browser, mobile apps, docs, screenshots, or logs.
- Database tables should live in an internal schema, proposed as `app`, with no direct browser Data API access in v1.
- RLS remains enabled for defense in depth on exposed/public tables. Since Express owns data access with elevated credentials, every API route must enforce buyer ownership, guest cart secret checks, admin passcode session checks, and profile/market scoping in application code.
- If any table or view is later exposed to the Supabase Data API, add explicit grants and RLS policies before exposing it.

### Identity And Cart Model

- `auth.users` remains Supabase-managed.
- `app.user_profiles` stores buyer display/profile data keyed by Supabase auth user ID.
- Guest carts use a server cart row plus an opaque `cart_public_id` and secret verifier. Browser localStorage stores only the public ID and client secret, not full cart contents.
- Logged-in carts are canonical in Supabase. On login, checkout, minicart open, cart page open, express payment start, and pending resume, backend refreshes and merges latest server state.
- Merge rules:
  - same product/profile/options: add quantities and cap by stock/demo limit
  - different product/options: append
  - stale local cart loses only when the buyer explicitly chooses not to merge

### Proposed Schemas

Use these as draft table names. Final SQL/RLS naming can change during M2. See `DATA_MODEL.md` for the column-level draft and seed plan.

Profile and catalog:

- `app.profiles`
- `app.markets`
- `app.categories`
- `app.products`
- `app.product_prices`
- `app.product_images`
- `app.homepage_sections`
- `app.release_events`

Inventory and stores:

- `app.stores`
- `app.store_pickup_dates`
- `app.central_inventory`
- `app.store_inventory`

Buyer/account:

- `app.user_profiles`
- `app.addresses`
- `app.saved_payment_methods`
- `app.guest_order_access`

Cart and checkout:

- `app.carts`
- `app.cart_items`
- `app.checkout_drafts`
- `app.promo_rules`
- `app.promo_rule_regions`
- `app.promo_rule_products`
- `app.promo_compatibility`
- `app.promo_evaluations`
- `app.promo_evaluation_lines`
- `app.tax_rates`
- `app.shipping_options`

Orders and payments:

- `app.orders`
- `app.order_items`
- `app.order_addresses`
- `app.total_snapshots`
- `app.payment_sessions`
- `app.paypal_order_snapshots`
- `app.webhook_events`
- `app.order_lifecycle_events`

Reviews and admin:

- `app.reviews`
- `app.admin_sessions`
- `app.runtime_debug_logs`

### Profile And Market Scoping

Profile-scoped tables include products, categories, product images, and reviews through products.

Market reference tables shared across profiles include markets, stores, pickup dates, tax rules, and shipping options.

Profile-and-market scoped tables include product prices, inventory, carts, checkout drafts, orders, promos, homepage sections, and release events.

User-level/shared tables include auth users, addresses, and saved payment methods.

### API Surface Draft

All API responses must include enough IDs for Admin debug without exposing secrets to buyer UI. See `API_CONTRACT.md` for request/response rules and route-level semantics.

Public/storefront:

- `GET /api/config`
- `GET /api/catalog/home`
- `GET /api/catalog/categories`
- `GET /api/catalog/products`
- `GET /api/catalog/products/:slug`
- `GET /api/catalog/release-events`

Auth/account:

- `POST /api/auth/email-status`
- `GET /api/account`
- `PATCH /api/account/profile`
- `GET /api/account/addresses`
- `POST /api/account/addresses`
- `PATCH /api/account/addresses/:id`
- `DELETE /api/account/addresses/:id`
- `GET /api/account/orders`
- `GET /api/account/orders/:id`
- `GET /api/account/saved-payments`
- `DELETE /api/account/saved-payments/:id`
- `GET /api/guest-orders/:orderNumber`

Cart:

- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `POST /api/cart/merge`
- `POST /api/cart/refresh`

Checkout:

- `POST /api/checkout/drafts`
- `PATCH /api/checkout/drafts/:id/fulfillment`
- `PATCH /api/checkout/drafts/:id/shipping-address`
- `PATCH /api/checkout/drafts/:id/billing-address`
- `PATCH /api/checkout/drafts/:id/shipping-option`
- `PATCH /api/checkout/drafts/:id/pickup-store`
- `PATCH /api/checkout/drafts/:id/pickup-date`
- `POST /api/checkout/drafts/:id/promos/evaluate`
- `POST /api/checkout/drafts/:id/promos/apply`

PayPal:

- `GET /api/paypal/sdk-config`
- `POST /api/paypal/client-token`
- `POST /api/paypal/orders/delivery`
- `POST /api/paypal/orders/express-delivery`
- `POST /api/paypal/orders/bopis`
- `POST /api/paypal/orders/:paypalOrderId/capture`
- `POST /api/paypal/orders/:paypalOrderId/shipping-callback`
- `POST /api/paypal/webhooks`

Reviews:

- `GET /api/products/:productId/reviews`
- `POST /api/orders/:orderId/items/:itemId/review`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

Admin:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/state`
- `PATCH /api/admin/profile-market`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `POST /api/admin/orders/:id/lifecycle`
- `GET /api/admin/inventory`
- `PATCH /api/admin/inventory/:id`
- `GET /api/admin/pickup-dates`
- `PATCH /api/admin/pickup-dates/:id`
- `GET /api/admin/webhooks`
- `GET /api/admin/debug-logs`

## Test Strategy

Use TDD for deterministic business logic and manual sandbox verification for PayPal SDK/payment surfaces.

### Unit Tests

Required for:

- cart merge/sync
- market-scoped cart switching
- product price lookup by profile and market
- pending order resume
- promo compatibility/selection
- tax excluding shipping
- destination-based shipping option selection
- BOPIS inventory and partial pickup
- PayPal delivery payload builder
- PayPal BOPIS payload builder
- PayPal SDK config and provider key builder
- amount consistency checks
- review eligibility
- order status transitions

### API Tests

Add once routes stabilize:

- auth/session helpers
- active config and market switch APIs
- cart APIs
- checkout draft APIs
- promo evaluation APIs
- delivery payment session APIs
- BOPIS payment session APIs
- webhook handler
- admin APIs

### UI Tests

Use focused Playwright after core flow stabilizes:

- storefront navigation
- cart/minicart
- checkout tab state preservation
- guest order lookup
- account order history
- admin passcode gate
- visual QA at 375px, 768px, 1024px, and 1440px for storefront, checkout, and Admin detail views
- sticky header and sticky payment bar overlap checks
- accessibility checks for focus order, announced errors, image alt text, and color-independent status labels

### Manual Sandbox Verification

Required for:

- PayPal button rendering
- Pay Later messages/buttons
- PayPal card fields
- Apple Pay
- Google Pay
- Venmo
- vaulting
- webhook verification
- PDP/cart/minicart express Review and Confirm
- full checkout Delivery and Pickup flows

## Platform Plan

### Web

- Build POP MART storefront profile UI.
- Build MochiToy Studio generic profile UI.
- Build shared product/category/cart/checkout components.
- Build account and guest order lookup pages.
- Build `/admin` React portal.
- Keep POP MART mode image-led and retail-first; do not apply heavy glassmorphism or generic profile colors to the POP MART storefront.
- Reserve layout space for PayPal buttons and Pay Later messages to avoid large layout shifts after eligibility checks.
- Scope the PayPal SDK provider around the selected checkout payment action so Order Summary can render PayPal, Pay Later, card, Apple Pay, Google Pay, or Venmo without reinitializing the whole app shell.
- Render Pay Later with `method=paylater`, `paypal-payments` plus `paypal-messages`, an amount-aware `<paypal-message>` in the Pay Later row, and the selected Pay Later button/message under Order Summary.

### Backend

- Express API organized by domain:
  - profiles/market
  - catalog
  - cart
  - checkout
  - promos
  - tax/shipping
  - PayPal
  - orders
  - reviews
  - account
  - admin
  - webhooks
- All payment-sensitive operations are server-side.
- Backend validates amount consistency before capture.
- Backend capture finalization updates orders, payment sessions, PayPal snapshots, total snapshots, lifecycle events, inventory, and active-cart cleanup in one repository workflow.
- Backend protects admin APIs with admin passcode session/token.

### Database

- Supabase schema for profiles, shared markets/stores/tax/shipping, products, categories, inventory, carts, orders, promos, reviews, saved payments, webhooks, and debug logs.
- Supabase Auth for buyers.
- TypeScript seed script creates demo auth users with service role key from env.
- Initial seed required; reset/reseed deferred.

### Assets

- `web/public/assets/popmart/`: user-provided customer-specific images.
- `web/public/assets/generic/`: generated/original MochiToy Studio assets.
- POP MART and generic profiles require 25 products with 3-4 images each.

### iOS/Android

No native apps in v1. Backend APIs should be designed as reusable HTTP APIs for future mobile clients.

## Milestones

### M1: Documentation And Demo Scaffold

- Create demo docs and tracking files.
- Confirm final docs with user.
- Create web/server/shared/supabase structure.
- Add TypeScript config for web, server, shared modules, tests, and seed tooling.
- Add demo-specific AGENTS guardrails.

### M2: Supabase Schema And Seed

- Design profile-scoped schema with shared market reference data.
- Add initial seed script.
- Seed shared auth users, addresses, shared market stores, products, categories, inventory, pickup dates, tax, shipping, promos, reviews.
- Verify seed can run locally.

### M3: Core Business Logic TDD

- Cart sync/merge.
- Promo evaluation and selection.
- Tax/shipping totals.
- Inventory availability.
- Pending order resume.
- PayPal payload builders.
- Amount consistency guard.

### M4: Storefront And Catalog

- Homepage sections.
- Category filters.
- PDP released/unreleased states.
- Product images.
- Pay Later message placements.

### M5: Cart And Minicart

- Guest/server cart persistence.
- Logged-in cart sync.
- PayPal/Pay Later delivery express entry.
- Pickup hints in cart/minicart only.

### M6: Checkout

- Delivery/Pickup tabs.
- Accordion flows.
- Explicit loading, saving, recalculating, error, and locked states.
- Delivery address/billing/shipping option.
- Pickup ZIP/default address ranking, store selection, billing, pickup date.
- Active tab Order Summary.
- Promo selection inline.
- Payment wall UI.
- Mobile sticky payment bar with only one selected non-card action.

### M7: PayPal Delivery And Express

- PayPal JS SDK v6 integration.
- Delivery order create/update/capture.
- PDP/cart/minicart express.
- Review and Confirm.
- Amount consistency verification.

### M8: BOPIS Payment

- BOPIS create order payload.
- Pickup store address and `PICKUP_IN_STORE`.
- Partial pickup order amount.
- Store inventory decrement on paid order.

### M9: Additional Payment Methods

- Pay Later.
- Card fields.
- Apple Pay.
- Google Pay.
- Venmo.
- Eligibility/debug surfaces.

### M10: Vaulting And Saved Payments

- Save checkbox UX.
- Capture response vault handling.
- Pending saved payment state.
- Vault webhook handling.
- Account delete saved payment.

### M11: Webhooks

- PayPal signature verification.
- Store valid events.
- Reject invalid events.
- Link events to orders/payment sessions.
- Admin webhook viewer.

### M12: Account, Guest, Reviews

- Email-first auth modal.
- Guest order lookup.
- Inline account creation on guest confirmation.
- Account settings.
- Order history/detail timeline.
- Review submission/edit/delete.

### M13: Admin Portal

- Passcode gate.
- Profile/market global controls.
- Order lifecycle controls.
- Inventory/pickup date controls.
- Runtime debug logs.
- Payment/order details.
- Order detail information architecture for timeline, PayPal snapshots, total snapshots, promo evaluation lines, inventory effect, and linked webhooks.

### M14: QA And Polish

- Manual sandbox checklist.
- UI polish, accessibility checks, and responsive screenshot checks.
- POP MART asset pass.
- MochiToy generated asset review.
- Tracking updates.

## Task Tracking

Before implementation starts, fill:

- `tracking/todos.md`
- `tracking/test-cases.md`

During implementation:

- Update `tracking/progress.md` after meaningful tasks.
- Update `tracking/debug.md` for investigations.
- Update `tracking/learnings.md` for reusable discoveries.

## Verification Checklist

- Initial seed creates expected data.
- POP MART default profile loads.
- Admin profile/market switch works and resets active carts.
- Guest cart persists by local cart ID.
- Logged-in cart refreshes before checkout/payment.
- Delivery checkout works end to end.
- BOPIS checkout works end to end.
- PDP/cart/minicart express returns to Review and Confirm.
- Promo/tax/shipping totals follow calculation order.
- PayPal amount mismatch blocks capture.
- Webhook signature verification is enforced.
- Pending order resume revalidates state.
- Account reviews attach to products.
- Admin lifecycle controls update buyer order timeline.

## Open Decisions

- Final API contracts.
- Final table names and RLS policies.
- Exact PayPal SDK v6 component APIs.
- Exact PayPal wallet eligibility prerequisites.
- Exact PayPal token deletion/revoke API path.

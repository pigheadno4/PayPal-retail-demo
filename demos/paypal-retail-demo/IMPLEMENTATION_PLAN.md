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
- Authenticated save-for-future captures create local saved-payment records only when `vault_requested = true`: the checkout UI can send that flag only from eligible PayPal/card save controls, `VAULTED` becomes active immediately, while `APPROVED` stays pending until a verified `VAULT.PAYMENT-TOKEN.CREATED` webhook provides the vault ID.
- Saved payment deletion uses PayPal Payment Method Tokens delete when a vault ID exists, then marks the local account record deleted.
- PayPal webhook verification uses `POST /v1/notifications/verify-webhook-signature` with `PAYPAL_WEBHOOK_ID` and notification headers before any state mutation.
- PayPal and Pay Later use the `paypal-payments` component.
- Pay Later should be gated by eligibility. Amount-aware messages must use the current product/cart/order amount; message amount does not change the actual captured order amount.
- Card fields use the `card-fields` component, render PayPal-hosted iframe fields, submit the PayPal order ID as a plain string, and capture server-side after successful submit/3DS handling. The checkout UI keeps the card fields, eligible-only save checkbox, and card pay button inside the expanded payment row rather than the Order Summary or mobile sticky bar.
- Apple Pay uses `applepay-payments` and has domain validation/browser/device prerequisites. Apple Pay go-live requires domain association and PayPal capability setup.
- Google Pay uses `googlepay-payments`, the Google Pay SDK, PayPal eligibility/config, `confirmOrder`, and possible 3DS payer action handling.
- Venmo uses `venmo-payments`, is US/USD focused, and has sandbox limitations. Desktop sandbox may not match production QR behavior.

### Delivery Express Evidence

- PDP/cart/minicart PayPal and Pay Later express are delivery-only.
- PDP/cart/minicart express SDK buttons must call create-order with the active `cart_public_id`/cart binding, not a checkout draft ID or local route transition.
- Use server-side shipping callbacks for express delivery because they support PayPal and Venmo and are better aligned with future mobile clients.
- Delivery express Create Order should use `shipping_preference: "GET_FROM_FILE"` so wallet address changes can trigger shipping callbacks.
- Subscribe to `SHIPPING_ADDRESS` first. Add `SHIPPING_OPTIONS` only if implementation needs recalculation when the buyer changes the selected option inside PayPal.
- Callback responses must keep PayPal amount breakdown internally consistent: selected shipping cost, item total, tax total, currency, and purchase unit total must all match the merchant snapshot.
- After PayPal approval, show merchant Review and Confirm at `/checkout/express-review?paypal_order_id={paypalOrderId}` for express only. The page loads `GET /api/paypal/orders/express-review` from the latest synchronized PayPal shipping-update snapshot, or from the same-session `review_confirm` snapshot in local/no-callback mode, then captures only after final buyer confirmation and amount consistency verification.
- M13 Capture Completion is wired in the buyer app: Review and Confirm posts `/api/paypal/orders/:paypalOrderId/capture` only after Confirm and pay, shows captured/error status with the capture ID or debug reference, and keeps the buyer confirm action disabled when the amount guard is blocked.
- Backend capture uses the locked merchant/provider amount snapshot before calling PayPal; the sanitized Orders capture response is stored for Admin/debug review.
- Successful capture is the durable finalization point: order status becomes paid, payment session becomes captured, inventory decrements, lifecycle/total snapshots are written, and only paid order items are removed from the active cart.

Before capture work resumes, complete the M13.1 recovery bridge: active browser cart binding restore, fresh-browser guest cart bootstrap into server cart rows, guest cart `x-cart-id`/`x-cart-secret` API headers, checkout route cart continuity, minicart quantity controls, server-ready create-order gating, Pickup guest/logged-in initial-state separation, Pay Later eligibility/detail gating, and merchant-visible create-order failure feedback. The starter-cart bootstrap is a tactical bridge while the buyer UI still carries curated POP MART fixture products; the durable catalog alignment should load buyer products/cart seeds from server catalog data. This bridge turns the live QA gaps into explicit acceptance checks rather than treating them as generic M13 cleanup.

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
- Migrate repeated UI primitives through the local shadcn layer page by page: use `Avatar` for account/profile entry, `Calendar` for release merchandising, `Sheet`/`Dialog` for overlays, `Card` for real card/panel surfaces, `FieldGroup`/`Field`/`Input`/`Checkbox`/`Textarea` for behavior-specific checkout and account forms, and Lucide icons for icon-only buyer actions while preserving POP MART-specific ecommerce composition.
- Build account and guest order lookup pages.
- Build `/admin` React portal.
- Keep POP MART mode image-led, playful, and retail-first; do not apply heavy glassmorphism or generic profile colors to the POP MART storefront.
- Add a POP MART playful collectible visual pass after the buyer-flow recovery: multi-accent profile tokens, rounded/tactile product and category cards, sticker-like retail badges, drop-calendar styling, collectible-event promo cards, and calmer but branded checkout accents.
- Keep PayPal official surfaces visually stable and readable during the visual pass; do not decorate or recolor official PayPal buttons/messages beyond their intended placement and reserved layout space.
- Reserve layout space for PayPal buttons and Pay Later messages to avoid large layout shifts after eligibility checks.
- When checkout payment actions are not yet eligible or active, hide the merchant-owned payment slot instead of showing a placeholder panel. Keep official PayPal-rendered controls untouched once they mount.
- Cart and checkout accent polish is CSS-scoped through explicit `data-visual-accent-*` markers on merchant-owned containers. Accent rails, warm gradients, and focus outlines may apply to cart hero/items/summary and checkout hero/steps/summary/trust strip only; PayPal frames, Pay Later messages, and payment slots stay on the existing stable payment styles.
- Minicart drawer separation is owned by the shadcn Sheet wrapper plus minicart CSS only: pass a minicart-specific overlay class, keep `side="right"`, retain outside-click dismissal, and use panel shadow/edge/accent rail rather than decorating PayPal SDK surfaces.
- Mobile responsive polish must enforce 44px minimum hit areas for merchant-owned buttons, shadcn buttons/tabs/inputs, breadcrumbs, footer links, filter chips, release-calendar controls, and drawer close controls while leaving official PayPal-rendered custom elements visually undistorted. Compact native radio inputs are acceptable only inside large clickable labels/cards.
- For checkout reference polish, keep the left/right rhythm: secure breadcrumb/header, step cards on the left, and a shadcn `Card` order summary on the right with active-cart thumbnails/quantities/line totals when available, auto-offer status copy, subtotal/shipping/tax/total lines, and the selected official payment action slot.
- Checkout section submit should immediately collapse the completed section into a concise summary card with an icon-only pencil edit action while the backend save/recalculation runs. Preserve semantic saving/recalculating state for tests and assistive logic, but do not render visible `Saved`, `Editing`, `Saving`, or `Recalculating` chips.
- For Pickup store selection, render both inline summaries and selectable modal rows as compact store-ticket cards: shadcn `Card` composition, address, phone, distance/status badge, available and unavailable counts, `data-inventory-state`, and a partial-inventory note when unavailable quantities stay in cart. Keep PayPal payment surfaces unchanged; this is a checkout fulfillment UI slice, not a payment-button rewrite.
- Checkout promo presentation must reflect implemented behavior only. Show auto-offer/recalculation status until manual promo-code entry is wired; do not add inert or fake promo inputs.
- Checkout trust-strip copy must be constrained to implemented capabilities and must not decorate or recolor official PayPal-rendered surfaces.
- Keep Vite-only/API-failure storefront fallbacks internally navigable: Category/PLP fallback products and PDP fallback records must be generated from the same slug, title, price, and image set, must respect supported query filters, and must never reintroduce old Labubu/Skullpanda/Hirono fixture media during loading or fallback states.
- PDP summary metadata must keep real vendor copy profile-scoped: API-loaded products derive `vendorName` from the active storefront profile display name, while fallback POP MART PDPs use the same demo profile label. Keep vendor/review/status metadata separate from category/series chips so the page matches the detailed reference without inventing product-level manufacturer data.
- PDP mobile density should be handled with responsive CSS before adding duplicate content: cap main gallery height, reduce thumbnail and purchase-option chrome, keep price/Pay Later/options/add-to-cart before long lower content, and consider a reserved sticky purchase bar only if a later visual pass needs a first-viewport CTA without covering PayPal messages or tab/footer content.
- Scope the PayPal SDK provider around the selected checkout payment action so Order Summary can render PayPal, Pay Later, card, Apple Pay, Google Pay, or Venmo without reinitializing the whole app shell.
- Configure PayPal and Pay Later one-time SDK buyer actions with the shared demo-safe modal presentation mode so approval cannot fall onto popup-dependent flows in local/browser demos.
- Instrument PayPal server startup, SDK config, client-token planning/generation, create-order, express-review lookup, capture, gateway handoff, persistence, and failure paths with structured frontend/backend diagnostics. Logs may include route stage, method/source/kind, cart/draft/session/order IDs, amount/currency, generated debug ID, request/action labels, and safe booleans such as `hasCartClientSecret`; logs must never include bearer tokens, cart secrets, client tokens, PayPal client secrets, OAuth access tokens, Supabase service keys, or raw buyer PII.
- Render Pay Later with `method=paylater`, `paypal-payments` plus `paypal-messages`, an amount-aware `<paypal-message>` in the Pay Later row, and the selected Pay Later button with the official message directly below it under Order Summary or the mobile sticky payment bar. Use SDK v6 manual message content fetch/application for all buyer-facing Pay Later message placements, including Home, Category, PDP, Cart, Minicart, and checkout Order Summary; show buyer-safe fallback copy only when PayPal presentment content fails or SDK config is unavailable.
- Render official Pay Later buttons only after the SDK v6 eligibility/details check succeeds for the current amount and currency; keep the buyer action hidden or unavailable while loading, errored, or ineligible.
- Render wallet methods only from eligible checkout rows. Apple Pay uses the React SDK v6 wallet component only after PayPal eligibility returns Apple Pay config; Venmo uses the React SDK v6 wallet component when the provider is ready; Google Pay is runtime-gated because PayPal exposes the Google Pay session while Google's PaymentsClient owns the button/payment-data flow.
- Render save-for-future controls only for authenticated eligible PayPal/card methods; Pay Later, Apple Pay, Google Pay, Venmo, and guests do not show save controls in v1.

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
- Mobile cart/minicart presentation uses vertical item cards, touch-sized quantity controls, no horizontal overflow, and independent minicart item/action scrolling so official PayPal surfaces do not crowd item confirmation.

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
- Review and Confirm backed by synchronized PayPal shipping-update snapshots.
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

- Email-first auth modal with server email lookup branching to password entry or password-only registration.
- Supabase Auth sign-in/register submit, buyer session persistence, and authenticated cart merge.
- Guest order lookup.
- Inline account creation on guest confirmation.
- Account settings profile info, saved payment list/delete, and address book with default delete constraints.
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
- POP MART playful collectible visual pass.
- POP MART asset quality pass.
- MochiToy generated asset review.
- Tracking updates.

Active Round 4 polish handoff:

- Use `ROUND4_AUTH_MINICART_CHECKOUT_POLISH_PLAN.md` as the detailed implementation and acceptance contract for Auth, Password, Minicart, checkout payment/order sheet, and pickup inventory-row polish.
- Use `mockups/round4-auth-minicart-checkout-polish.html` as the visual companion reference and future acceptance evidence target.
- Do not start runtime edits for this slice unless `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, and `tracking/test-cases.md` contain the Round 4 open rows.
- Preserve PayPal, promo, cart, checkout-draft, BOPIS, and auth semantics; this slice is surface polish only.
- 2026-07-11 status: Auth email/password/register, Minicart, checkout payment/order-sheet, and pickup inventory-row runtime polish are locally closed. The hardened Round 4 browser helper passes `31` required rows and `40` quality-95 JPEGs plus `metrics.json`: no missing/failed/console/response/overflow/overlap/suspicious-pixel rows, `65` scoped contrast samples with a `4.60:1` minimum, asserted Auth initial focus, six product-specifically named quantity controls per Minicart row, exact Minicart PayPal/Pay Later ownership, dedicated visible full/partial/empty Pickup screenshots at 320/390/1440, placement-scoped official PayPal/Pay Later/Card Fields nodes, visible grabber color, three order-sheet close methods with focus return, and explicit width-coverage rationale. Fresh `npm run verify` passes `599` tests across `69` files plus typecheck/lint/format, and read-only `ui-ux-pro-max` review found no unresolved P0/P1/P2 findings. Hosted Render smoke remains open until the patched build is deployed.

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
- Exact PayPal token deletion/revoke API path.

## 2026-07-12 Wallet SDK Upgrade Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the PayPal JS SDK packages to the latest published compatible versions, render Apple Pay and Google Pay through official browser/PayPal components, and keep selected wallet actions aligned with the existing 52px checkout action contract.

**Architecture:** `PayPalSdkProviderScope` continues to load the PayPal Web SDK v6 component chosen by the server. The document head loads Apple's auto-updating Apple Pay JS SDK and Google's Pay JS SDK before React mounts. `WalletCheckoutAction` uses the React SDK's official Apple Pay component and Google Pay session hook, mounts Google's official created button into the shared wallet slot, and forwards approved wallet orders into the same checkout capture callback used by PayPal and Pay Later.

**Tech Stack:** React 19, TypeScript, PayPal Web SDK v6, `@paypal/react-paypal-js@10.1.2`, `@paypal/paypal-js@10.0.3`, Apple Pay JS `1.latest`, Google Pay JS, Vitest, Vite.

### Global Constraints

- Keep `PayPalProvider.environment` explicit as `sandbox` or `production`.
- Do not render a merchant-drawn Google Pay button.
- Load Apple Pay JS from `https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js` with anonymous CORS and no integrity hash.
- Load Google Pay JS from `https://pay.google.com/gp/p/js/pay.js`.
- Serve PayPal's sandbox Apple domain-association payload at `/.well-known/apple-developer-merchantid-domain-association` and register the deployed Render domain in the PayPal dashboard.
- Style only merchant-owned wrappers and supported Apple custom properties; do not reach into provider shadow DOM or iframes.

### Task 1: Lock Browser SDK And Static Association Requirements

**Files:**
- Create: `web/src/features/payments/walletSdkAssets.test.ts`
- Modify: `web/index.html`
- Create: `web/public/.well-known/apple-developer-merchantid-domain-association`

**Interfaces:**
- Consumes: Vite's `web/public` static-file contract.
- Produces: `window.ApplePaySession`, the registered `<apple-pay-button>` custom element, `window.google.payments.api.PaymentsClient`, and the public Apple validation path.

- [x] Write a failing test that reads `web/index.html`, requires both official SDK URLs, requires `crossorigin="anonymous"` on Apple Pay JS, and requires a nonempty hexadecimal domain-association file.
- [x] Run `npm test -- web/src/features/payments/walletSdkAssets.test.ts`; expect failure because both scripts and the well-known file are absent.
- [x] Add the Apple and Google scripts before `/src/main.tsx`, and add the downloaded PayPal sandbox association payload under `web/public/.well-known/`.
- [x] Re-run the focused test and expect it to pass.

### Task 2: Upgrade PayPal Packages Without Regressing Provider Configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Verify: `web/src/features/payments/PayPalSdkProviderScope.test.tsx`

**Interfaces:**
- Consumes: server `environment`, `components`, locale, page type, and sandbox test-buyer-country SDK configuration.
- Produces: v10 `PayPalProvider` props with an explicit environment.

- [x] Install `@paypal/react-paypal-js@10.1.2` so npm resolves its compatible `@paypal/paypal-js@10.0.3` dependency.
- [x] Run the provider test and TypeScript checks; expect the existing explicit `environment` mapping to satisfy the v10 breaking change.
- [x] Make only type/API adaptations required by the published v10 declarations.

### Task 3: Replace The Fake Google Pay Control And Bridge Wallet Approval

**Files:**
- Create: `web/src/features/payments/WalletCheckoutAction.runtime.test.tsx`
- Modify: `web/src/features/payments/WalletCheckoutAction.tsx`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/app/App.checkout-paypal-capture.test.tsx`

**Interfaces:**
- Consumes: `useGooglePayOneTimePaymentSession`, its official `createGooglePayButton()` output, wallet eligibility config, checkout create-order APIs, and the existing `CheckoutApprovedPaymentContext` callback.
- Produces: official Google `PaymentsClient.createButton()` rendering and approved Apple/Google/Venmo order context containing method, fulfillment mode, PayPal order ID, and payment-session ID.

- [x] Write a failing component test whose mocked Google Pay session hook receives `googlePayConfig`, final `transactionInfo`, `createOrder`, and `onApprove`; assert the official returned element mounts and no merchant-drawn Google Pay button is used.
- [x] Write a failing App interaction/capture test proving a Google Pay approval reaches the existing capture flow once with the created payment-session ID.
- [x] Replace `GooglePayRuntimeSurface` with the eligibility-driven Google Pay session hook, mount `createGooglePayButton()` directly into the 52px action container, and retain the last create-order response for approval bridging.
- [x] Route Apple Pay, Google Pay, and Venmo approval callbacks through `renderCheckoutPaymentAction(...).onApproved`.
- [x] Run the focused wallet and checkout-capture tests and expect them to pass.

### Task 4: Normalize Official Wallet Button Dimensions

**Files:**
- Modify: `web/src/styles/global.test.ts`
- Modify: `web/src/styles/global.css`

**Interfaces:**
- Consumes: existing `.wallet-checkout-action` 52px selected-action slot.
- Produces: full-width 52px Apple, Google, and Venmo actions in desktop summary, sticky summary, and mobile order sheet.

- [x] Add failing CSS assertions for the Apple custom-element height variables and the official Google button container.
- [x] Set supported Apple Pay custom properties (`--apple-pay-button-width`, `--apple-pay-button-height`, `--apple-pay-button-border-radius`) and size the Google component's merchant-owned container to the same 52px contract.
- [x] Delete the fake Google button rules and run `npm test -- web/src/styles/global.test.ts`.

### Task 5: Documentation, Verification, And Review

**Files:**
- Modify: `DEMO.md`
- Modify: `DESIGN.md`
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/debug.md`
- Modify: `tracking/progress.md`
- Modify: `tracking/todos.md`

**Interfaces:**
- Consumes: focused test/build/browser evidence.
- Produces: current source-of-truth prerequisites, completion state, and any remaining PayPal dashboard/deployment actions.

- [x] Record the version upgrade, SDK-loading rules, official Google session/button path, domain-validation dependency, and wallet height acceptance criteria.
- [x] Run focused tests, `npm run typecheck`, `npm run build`, `npm run lint`, `npm run format:check`, and `git diff --check`.
- [x] Start the local app and verify both external SDK requests, official wallet element geometry, absence of the fake Google button, and the well-known route.
- [x] Spawn an independent read-only review subagent, resolve any findings, and repeat affected verification.

## 2026-07-12 Wallet Preselection Eligibility Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Apple Pay and Google Pay payment-wall rows absent until both PayPal merchant eligibility and the current browser/device readiness check succeed.

**Architecture:** Add a focused `CheckoutWalletEligibilityProbes` component that mounts only inside the checkout route boundary and runs Apple/Google checks inside their method-scoped `PayPalSdkProviderScope` instances. It reports explicit pending/eligible/ineligible state to `CheckoutRouteStage`; `CheckoutPage` consumes a boolean eligibility map and filters the two rows before selection while retaining its existing draft-level `eligible: false` guard.

**Tech Stack:** React 19, TypeScript, PayPal Web SDK v6, `@paypal/react-paypal-js@10.1.2`, Apple Pay JS `1.latest`, Google Pay JS, Vitest, Testing Library.

### Global Constraints

- Apple Pay requires PayPal `isEligible("applepay") === true` and `ApplePaySession.canMakePayments() === true`.
- Google Pay requires PayPal `isEligible("googlepay") === true` and `PaymentsClient.isReadyToPay(...).result === true` using PayPal's formatted configuration.
- Pending and error states are ineligible for display; do not show disabled or loading wallet rows.
- Eligibility probes must not create an order, render a branded merchant substitute, or change payment-session timing.
- Do not change Venmo eligibility, fulfillment binding, PayPal Create Order fields, promo/tax rules, or capture behavior.

### Task 1: Lock Checkout Choice Filtering

**Files:**
- Modify: `web/src/features/checkout/CheckoutPage.tsx`
- Modify: `web/src/features/checkout/CheckoutPage.test.tsx`

**Interfaces:**
- Consumes: `paymentMethodEligibility?: Partial<Record<"apple_pay" | "google_pay", boolean>>`.
- Produces: normalized payment choices that include Apple Pay or Google Pay only when the corresponding value is exactly `true` and the draft choice is not explicitly ineligible.

- [x] Add a failing server-render test proving both rows are absent while eligibility is missing/false and present only for explicit true values.
- [x] Run `npm test -- web/src/features/checkout/CheckoutPage.test.tsx`; expect the new row-gating assertion to fail because choices currently use only draft eligibility.
- [x] Thread `paymentMethodEligibility` through `CheckoutPage` choice normalization and selected-method eligibility without altering non-wallet methods.
- [x] Re-run the focused test and preserve existing choice-selection coverage.

### Task 2: Add Official Browser And Provider Probes

**Files:**
- Create: `web/src/features/payments/CheckoutWalletEligibilityProbes.tsx`
- Create: `web/src/features/payments/CheckoutWalletEligibilityProbes.test.tsx`
- Modify: `web/src/app/App.tsx`
- Modify: `web/src/app/App.test.tsx`
- Modify: `web/src/app/App.interactions.test.tsx`
- Modify: `web/src/app/App.checkout-paypal-capture.test.tsx`

**Interfaces:**
- Produces: `CheckoutWalletEligibility = { apple_pay: "pending" | "eligible" | "ineligible"; google_pay: "pending" | "eligible" | "ineligible" }` and `onEligibilityChange(method, state)` callbacks.
- Consumes: PayPal `useEligibleMethods`, Google `useGooglePayOneTimePaymentSession().paymentsClient/formattedConfig`, `ApplePaySession.canMakePayments()`, market, currency, and resolved sandbox/production environment.

- [x] Add failing jsdom tests for Apple provider true/browser false, Apple provider true/browser true, Google PayPal true/Google false, Google both true, and error-to-ineligible behavior.
- [x] Verify the tests fail because the probe module does not exist.
- [x] Implement method-scoped probes with stale-effect guards, stable callbacks, Google `TEST`/`PRODUCTION` mapping, and hook/session cleanup.
- [x] Mount probes only on the checkout route, map only `eligible` to `true`, and pass the map to `CheckoutPage`.
- [x] Update App tests so SSR/pending rows stay absent and interaction/capture tests explicitly mock successful readiness before selecting Apple/Google.
- [x] Run the focused probe, CheckoutPage, App static, App interaction, and checkout capture tests.

### Task 3: Tracking, Verification, Browser Evidence, And Review

**Files:**
- Modify: `DEMO.md`
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `tracking/debug.md`
- Modify: `tracking/progress.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/todos.md`

**Interfaces:**
- Consumes: focused red/green evidence, full verification, build output, and browser inspection.
- Produces: synchronized canonical status and independent review disposition.

- [x] Record the root cause, implementation boundary, tests, and remaining eligible-device capture requirement.
- [x] Run `npm run verify`, `npm run build`, `scripts/check-agent-system.sh`, `git diff --check`, and refresh Graphify.
- [x] Verify the browser gate against the production build: unsupported Apple Pay stays absent, Google Pay appears only after both probes succeed, no wallet action exists before selection, and the selected Google row mounts the official 52px Google-created element. Keep eligible Apple-device proof open.
- [ ] Spawn the requested independent read-only review subagent after coding, resolve all P0-P2 findings, and repeat affected verification.

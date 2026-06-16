# PayPal Retail Demo Implementation Task Breakdown

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for parallel implementation slices or `superpowers:executing-plans` for inline execution. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the PayPal Retail Demo as a POP MART-style, Supabase-backed, PayPal sandbox-enabled retail checkout demo with Delivery, BOPIS, express checkout, account, reviews, and Admin Portal flows.

**Architecture:** Vite React owns buyer/admin UI. Express owns application APIs, PayPal calls, calculations, and Supabase data access. Supabase stores profile-scoped demo data, shared market and buyer reference data, order/payment snapshots, webhook logs, and runtime debug state.

**Tech Stack:** Vite React, Node.js Express, TypeScript, Supabase Auth/Postgres, PayPal JS SDK v6, `@paypal/react-paypal-js` v9.x, local app assets.

---

## Execution Rules

- Do not start implementation until `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, `DATA_MODEL.md`, and `API_CONTRACT.md` are approved.
- Use TypeScript for web, server, shared domain modules, tests, and seed tooling.
- Start implementation with tests for deterministic business logic before UI.
- Use `/Users/tengtao/Development/wiki-v2` for PayPal evidence.
- Do not replace the v1 BOPIS Create Order contract with authorize-at-checkout/capture-at-pickup.
- Keep POP MART assets local and customer-specific.
- Update tracking files after every implementation milestone.

## Planned File Structure

### Root Demo Files

- `demos/paypal-retail-demo/package.json`: demo-level workspace scripts.
- `demos/paypal-retail-demo/.env.example`: browser-safe and server-only env names with no secrets.
- `demos/paypal-retail-demo/README.md`: runbook after commands are real.
- `demos/paypal-retail-demo/PLAN.md`: active Superpowers-style execution router.
- `demos/paypal-retail-demo/DEMO.md`: business/product contract.
- `demos/paypal-retail-demo/DESIGN.md`: UX contract.
- `demos/paypal-retail-demo/IMPLEMENTATION_PLAN.md`: architecture/milestones.
- `demos/paypal-retail-demo/DATA_MODEL.md`: schema/seed planning.
- `demos/paypal-retail-demo/API_CONTRACT.md`: API planning.
- `demos/paypal-retail-demo/ENVIRONMENT.md`: environment and secret-handling plan.
- `demos/paypal-retail-demo/PAYPAL_EVIDENCE.md`: local PayPal source map.
- `demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md`: task sequencing.

### Shared Domain

- `demos/paypal-retail-demo/shared/src/money.ts`: minor-unit arithmetic and rounding.
- `demos/paypal-retail-demo/shared/src/types.ts`: shared DTOs and enums.
- `demos/paypal-retail-demo/shared/src/market.ts`: market config, provider key, sandbox buyer-country, and market-scoped cart helpers.
- `demos/paypal-retail-demo/shared/src/catalog.ts`: product/release status helpers.
- `demos/paypal-retail-demo/shared/src/orderNumbers.ts`: DO/PO order number and PayPal invoice ID helpers.
- `demos/paypal-retail-demo/shared/src/promos.ts`: promo evaluation types and pure helpers.
- `demos/paypal-retail-demo/shared/src/tax.ts`: tax calculation helpers.
- `demos/paypal-retail-demo/shared/src/shipping.ts`: shipping option helpers.
- `demos/paypal-retail-demo/shared/src/inventory.ts`: central/store inventory helpers.
- `demos/paypal-retail-demo/shared/src/orders.ts`: order status and resume helpers.
- `demos/paypal-retail-demo/shared/src/paypal.ts`: PayPal payload types and safe snapshots.

### Supabase

- `demos/paypal-retail-demo/supabase/config.toml`: local Supabase config if local CLI is used.
- `demos/paypal-retail-demo/supabase/migrations/`: generated migrations.
- `demos/paypal-retail-demo/supabase/seed/`: seed data source files.
- `demos/paypal-retail-demo/supabase/seed/run-seed.ts`: deterministic TypeScript seed runner that can generate SQL and apply through linked/local Supabase CLI without committed secrets.

### Express Server

- `demos/paypal-retail-demo/server/src/app.ts`: Express app wiring.
- `demos/paypal-retail-demo/server/src/server.ts`: local server entrypoint.
- `demos/paypal-retail-demo/server/src/config/env.ts`: env parsing and validation.
- `demos/paypal-retail-demo/server/src/db/supabase.ts`: server Supabase client.
- `demos/paypal-retail-demo/server/src/middleware/auth.ts`: buyer auth/session parsing.
- `demos/paypal-retail-demo/server/src/middleware/admin.ts`: admin passcode session guard.
- `demos/paypal-retail-demo/server/src/routes/*.ts`: API routes by domain.
- `demos/paypal-retail-demo/server/src/services/*.ts`: domain services.
- `demos/paypal-retail-demo/server/src/paypal/*.ts`: PayPal client, payload builders, webhook verification, capture guard.
- `demos/paypal-retail-demo/server/src/debug/logger.ts`: sanitized runtime debug logs.
- `demos/paypal-retail-demo/server/tests/`: API and service tests.

### Web

- `demos/paypal-retail-demo/web/src/main.tsx`: React entrypoint.
- `demos/paypal-retail-demo/web/src/app/App.tsx`: routing and app shell.
- `demos/paypal-retail-demo/web/src/styles/`: design tokens and global CSS.
- `demos/paypal-retail-demo/web/src/api/`: typed API client.
- `demos/paypal-retail-demo/web/src/state/`: cart/auth/checkout state.
- `demos/paypal-retail-demo/web/src/components/`: shared UI components.
- `demos/paypal-retail-demo/web/src/features/catalog/`: homepage, category, PDP.
- `demos/paypal-retail-demo/web/src/features/cart/`: cart and minicart.
- `demos/paypal-retail-demo/web/src/features/checkout/`: Delivery/Pickup checkout.
- `demos/paypal-retail-demo/web/src/features/payments/`: PayPal, Pay Later, card, Apple Pay, Google Pay, Venmo surfaces.
- `demos/paypal-retail-demo/web/src/features/account/`: account settings, order history, reviews.
- `demos/paypal-retail-demo/web/src/features/admin/`: Admin Portal.
- `demos/paypal-retail-demo/web/public/assets/popmart/`: user-provided POP MART assets.
- `demos/paypal-retail-demo/web/public/assets/generic/`: generated/original generic assets.
- `demos/paypal-retail-demo/web/tests/`: Playwright tests.

## Milestone 0: Review And Environment Gate

- [x] Review and approve all planning docs for Milestone 1 scaffold.
- [x] Confirm local Supabase project strategy: local CLI and remote project.
- [x] Install or configure the selected Supabase access path before migrations are created.
- [x] Confirm PayPal sandbox app credentials are available through local env only.
- [x] Record PayPal evidence map; final sandbox account capability review is deferred to the Milestone 16 manual sandbox checklist.
- [x] Confirm Apple Pay/Google Pay local testing remains eligibility/debug/manual locally, with hosted preview or approved HTTPS tunnel for full wallet verification later.
- [x] Confirm POP MART asset handoff path and filename convention.
- [x] Convert the env variable shape in `ENVIRONMENT.md` into `.env.example` during scaffold.
- [x] Update `tracking/todos.md` with accepted Milestone 0 decision changes.

Verification:

- `scripts/check-agent-system.sh` passes from repo root.
- No secrets are present in docs or tracked files.

## Milestone 1: Demo Scaffold

- [x] Create demo package/workspace scripts.
- [x] Create `web`, `server`, `shared`, and `supabase` folders.
- [x] Add TypeScript, lint, format, and test setup.
- [x] Add shared strict TypeScript config and package-level configs for web, server, shared, tests, and seed tooling.
- [x] Add `.env.example` with explicit browser-safe versus server-only variables.
- [x] Add README runbook stub with real commands once scripts exist.

Verification:

- `npm install` succeeds in the demo folder after dependencies are chosen.
- Typecheck command exists and runs.
- TypeScript strict mode is enabled for app-owned code unless a specific exception is documented.
- Unit test command exists and runs with an empty or smoke test suite.

## Milestone 2: Supabase Schema And Seed

- [x] Create migration for private `app` schema.
- [x] Create profile, shared market/store/tax/shipping, product price, catalog, release, inventory, buyer, cart, checkout, promo, total snapshot, order, payment, webhook, review, admin, and debug tables from `DATA_MODEL.md`.
- [x] Add indexes for profile scoping, market lookup, user ownership, cart lookup, order lookup, payment session lookup, promo explanation lookup, and webhook event IDs.
- [x] Add migration-level comments for demo assumptions: tax estimate only, no inventory reservation, shipping excluded from tax/promo.
- [x] Create deterministic TypeScript seed runner for generated SQL and linked/local Supabase CLI apply.
- [x] Seed `popmart` and `generic` storefront/reference data with shared markets/stores/tax/shipping, products, market-specific prices, categories, release calendar data, inventory, homepage sections, and promos.
- [x] Seed guarded buyer/account/order data with auth users, default addresses, saved payment placeholders, reviews, pending orders, completed orders, and lifecycle snapshots.

Verification:

- Migration applies on the linked remote database; clean local apply remains blocked until Docker/local Supabase is available.
- Storefront/reference seed creates 2 profiles, shared active markets, 5 categories/profile, 25 products/profile, one active price/product/market, 9 stores/market, tax/shipping rows, promo rows, release events, and inventory.
- Guarded seed creates 5 shared auth users plus account, review, pending order, and completed order scenarios.
- Seed does not require committed secrets.

## Milestone 3: Deterministic Domain Logic TDD

- [x] Implement money helpers first.
- [x] Implement market config helpers for currency, locale, buyer country, Pay Later buyer country, sandbox test buyer country, and PayPal provider key.
- [x] Implement market-scoped product price lookup.
- [x] Implement product purchasability and release calendar helpers.
- [x] Implement promo engine with auto/manual promos, expiry, compatibility, recommended set, rejected reasons, and snapshots.
- [x] Implement tax calculation after promo and excluding shipping.
- [x] Implement destination-based shipping option selection with cheapest default.
- [x] Implement store distance ranking and fallback store behavior.
- [x] Implement BOPIS partial inventory split.
- [x] Implement cart merge and refresh semantics.
- [x] Implement market switch semantics: clear active browser cart binding, fetch/create cart for new market, never convert old cart prices.
- [x] Implement pending order resume revalidation rules.
- [x] Implement fulfillment-specific order number helpers: `DO-YYYYMMDD-000001` and `PO-YYYYMMDD-000001`.
- [x] Implement PayPal invoice ID helper that appends an attempt suffix when a fresh payment session is created for the same pending order.
- [x] Implement order status transition rules.

Verification:

- Unit tests cover every checked item in `tracking/test-cases.md` under Core Business Logic.
- Market tests prove carts, prices, and pending orders stay locked to the correct market.
- Promo tests include the case where `B + C` beats `A` alone.
- Tax tests prove shipping fee is excluded.

## Milestone 4: PayPal Payload Builders And Capture Guard TDD

- [x] Implement PayPal delivery full-checkout Create Order builder.
- [x] Implement PayPal express delivery Create Order builder with server-side shipping callback config.
- [x] Implement PayPal BOPIS Create Order builder with mandatory v1 pickup fields.
- [x] Implement PayPal SDK config response builder with browser-safe client ID.
- [x] Include `buyer_country`, `paylater_buyer_country`, sandbox-only `sandbox_test_buyer_country`, SDK components, and deterministic `provider_key` in the SDK config builder.
- [x] Implement PayPal client token request rules for vault-enabled flows.
- [x] Implement PayPal invoice ID and `PayPal-Request-Id` assignment.
- [x] Implement PayPal detailed line-item builder and amount breakdown reconciliation.
- [x] Implement Pay Later, Venmo, Apple Pay, Google Pay, card method mapping.
- [x] Implement vault attribute inclusion only for logged-in eligible buyers.
- [x] Implement amount consistency guard.
- [x] Implement sanitized PayPal snapshot storage shape.

Verification:

- Tests assert BOPIS has `intent: "CAPTURE"`, `SET_PROVIDED_ADDRESS`, `PICKUP_IN_STORE`, selected store address, and receiver name `s2s ${storeName}`.
- Tests assert delivery express uses `GET_FROM_FILE` and callback config.
- Tests assert guests cannot request vaulting.
- Tests assert basic one-time flows expose client ID but do not request a client token.
- Tests assert sandbox SDK config includes the test buyer country and production SDK config does not.
- Tests assert provider key changes when market, currency, locale, buyer country, sandbox test buyer country, component set, or market version changes.
- Tests assert vault-enabled flows request a client token and reject guests.
- Tests assert duplicate PayPal invoice ID is avoided when a pending order creates a fresh payment session.
- Tests assert PayPal line-item totals reconcile with amount breakdown.
- Tests assert capture is blocked on amount mismatch outside rounding tolerance.

## Milestone 5: Express API Foundation

- [x] Build Express app shell and health endpoint.
- [x] Add env validation.
- [x] Add Supabase server client.
- [x] Add buyer auth middleware.
- [x] Add guest cart middleware.
- [x] Add admin passcode session middleware.
- [x] Add error response format and sanitized debug logger.

Verification:

- API smoke tests cover success and error shapes.
- Server refuses to start when required server env vars are missing.
- Debug logs do not include secrets or access tokens.

## Milestone 6: Catalog, Cart, Checkout Draft APIs

- [x] Implement storefront config, homepage, categories, product list, PDP, and release events APIs.
- [x] Implement Admin profile/market switch API and active config refresh behavior.
- [x] Implement cart create/read/add/update/delete/merge/refresh APIs.
  - [x] Cart route contracts and repository boundary.
  - [x] Supabase-backed cart repository and live server wiring.
- [x] Implement checkout draft create/update APIs for Delivery and Pickup tabs.
  - [x] Checkout route contracts and repository boundary.
  - [x] Supabase-backed checkout draft repository and live server wiring.
- [x] Implement promo evaluate/apply/remove APIs.
- [x] Implement guest order lookup API.

Verification:

- API tests cover released/unreleased PDP behavior.
- API tests cover market-scoped catalog prices and profile/market switch config.
- API tests cover guest cart local ID/secret behavior.
- API tests cover logged-in cart refresh and merge.
- API tests cover Delivery and Pickup checkout draft recalculation.

## Milestone 7: PayPal And Payment APIs

- [x] Implement PayPal auth/client wrapper.
- [x] Implement PayPal SDK config API.
- [x] Implement PayPal client token API.
- [x] Implement delivery order create API.
  - [x] Add route/gateway boundary and payload-builder coverage.
  - [x] Add Supabase-backed order/payment-session preparation and snapshot persistence.
- [x] Implement express delivery order create API.
  - [x] Add route/gateway boundary and shipping callback payload coverage.
  - [x] Add Supabase-backed express order/payment-session preparation and review-confirm persistence.
- [x] Implement BOPIS order create API.
  - [x] Add route/gateway boundary and pickup-in-store payload coverage.
  - [x] Add Supabase-backed pickup order/payment-session preparation and snapshot persistence.
- [x] Implement PayPal shipping callback API for express delivery.
  - [x] Return raw PayPal success/decline response shapes instead of the standard app response envelope.
  - [x] Recalculate selected/default shipping option, tax, pending order totals, payment-session totals, order item tax, and total snapshots.
  - [x] Add promo auto-apply/re-evaluation to the callback with shared promo rules/scopes/compatibility and order-scoped promo snapshots.
- [x] Implement capture API with amount consistency guard.
  - [x] Guard capture against the locked merchant/provider total snapshot before calling PayPal.
  - [x] Call PayPal Orders capture with `PayPal-Request-Id` and store the sanitized capture response.
  - [x] Mark successful orders paid/captured, write capture total/lifecycle snapshots, decrement inventory, and clear paid cart items.
- [x] Implement webhook verification and processing.
- [x] Implement saved payment active/pending/delete flows.

Verification:

- API tests cover payload builders through route calls.
- Webhook tests reject invalid verification.
- Capture tests update order, inventory, cart, payment session, and lifecycle events.

## Milestone 8: Web App Shell And Design System

- [x] Build React app shell and routing.
- [x] Add POP MART-style design tokens and responsive layout primitives.
- [x] Add generic MochiToy visual tokens separately so POP MART mode does not inherit the generic blue/amber/cream direction.
- [x] Add accessibility primitives for focus-visible states, alert regions, form errors, and reduced-motion support.
- [x] Add profile-aware asset resolver.
- [x] Add market-aware config provider that remounts only the PayPal payment subtree when `provider_key` changes.
- [x] Add API client and state providers.
- [x] Add auth modal shell.
- [x] Add minicart shell.

Verification:

- App loads with no console errors.
- Mobile and desktop shells do not overlap content.
- `/admin` is reachable only by manual route entry and is not linked from buyer UI.
- Market switch refreshes app config/catalog/cart without a whole-app route reset.

## Milestone 9: Storefront And Catalog UI

- [x] Build homepage hero, hot sales, categories, release calendar, Pay Later promo, promo cards, popular series, and footer.
- [x] Build release calendar legend and color-independent release state labels.
- [x] Build category filters.
- [x] Build PDP gallery, product status, product details, price display, Pay Later message placement, add-to-cart, express buttons, and reviews.
- [x] Block unreleased product checkout actions and hide reviews.

Verification:

- Calendar release dates render as outlined/unfilled circles.
- Calendar release state is understandable without relying on color alone.
- PDP image switching works with 3-4 images.
- PDP has no pickup hint.
- Homepage/category Pay Later promo has no amount.

## Milestone 10: Cart And Minicart UI

- [x] Build minicart with item summary, Pay Later amount message, checkout/view-cart actions, PayPal/Pay Later delivery express, and pickup hint text.
- [x] Build full cart with quantity editing, Pay Later amount message, checkout action, PayPal/Pay Later delivery express, and pickup hint text.
- [x] Keep pickup hints as text only, no pickup button.

Verification:

- Cart/minicart express creates delivery-only payment sessions.
- Pickup hint appears in cart/minicart and not PDP.
- Quantity changes refresh Pay Later amount-aware messages.

## Milestone 11: Checkout UI

- [x] Build `/checkout` with Delivery/Pickup tabs and preserved tab state.
- [x] Build Delivery accordion: shipping address, billing address, shipping option, payment.
- [x] Build Pickup accordion: ZIP/default location, store selection, billing address, pickup date, payment.
- [x] Build checkout step states: idle, saving, saved/collapsed, editing, recalculating totals, blocked/error, and locked.
- [x] Build focus movement and announced errors for checkout form validation.
- [x] Build partial pickup store card counts before store submit.
- [x] Build Order Summary with promo evaluation, ready/unavailable pickup item split, and selected payment action slot.
- [x] Build mobile sticky payment action for selected non-card methods.

Verification:

- Buyer can switch tabs before payment session starts.
- Fulfillment mode locks after payment session starts.
- Pickup partial inventory excludes unavailable items from payment amount but leaves them in cart.
- Sticky payment bar does not cover checkout content.
- Card payment stays inside the expanded card fields box on mobile and desktop.

## Milestone 11.5: Buyer Flow Interaction Recovery

Purpose: close the gap between visual shells and working buyer actions before continuing deeper PayPal confirm/capture work.

- [x] Re-audit checked Milestone 9-12 UI items and label any remaining visual-shell-only behavior before changing payment semantics.
- [x] Wire PDP add-to-cart into cart state.
- [x] Ensure PDP delivery express actions either start the intended express flow or are explicitly disabled/deferred with buyer-safe copy.
- [x] Wire cart and minicart buyer actions: open/close minicart, server-backed quantity updates, checkout navigation, Pay Later amount refresh, and delivery-only express payment entry.
  - [x] Wire app-owned minicart open/close, View cart, Checkout, full-cart checkout navigation, Pay Later amount refresh, and delivery-only express UI entry.
  - [x] Wire server-backed cart quantity PATCH plus cart refresh triggers before checkout and express payment start.
  - [x] Map backend cart update/refresh responses back into buyer `CartData` so server-side price and blocker changes visibly reconcile.
- [x] Replace checkout read-only shells with an interactive Delivery/Pickup state machine for editing, validation, submit, saved/collapsed, recalculating, locked, and error states.
- [x] Enforce a single-expanded-section accordion per fulfillment tab: first actionable step expanded initially, submitted steps collapsed to summaries, edit reopens one step and collapses the others.
- [x] Wire checkout submit transitions through saving, recalculating totals, saved/collapsed, and next-section editing states for Delivery and Pickup step saves.
- [x] Wire Delivery checkout steps for shipping address, same-as-shipping billing, alternate billing, shipping option selection, and payment-method selection.
- [x] Wire Delivery checkout promo/tax/shipping recalculation hooks.
- [x] Wire Pickup guest flow: ZIP/postcode submit, ranked store-list modal, selected-store summary, billing, pickup date, and payment-method selection.
- [x] Wire Pickup logged-in flow: nearest/default-address store preselected, Change store modal, selected-store summary, billing, pickup date, and payment-method selection.
- [x] Wire Pickup partial inventory behavior so selecting a partial store updates Order Summary payable/unavailable lines while preserving original cart intent.
- [x] Wire Pickup promo/tax/inventory recalculation hooks after store, billing, or pickup date changes.
- [x] Drive PayPal, Pay Later, and card surfaces from the selected checkout payment method instead of static fixture state.
- [x] Drive Apple Pay, Google Pay, and Venmo surfaces from selected checkout payment method with runtime eligibility checks.
- [x] Add buyer-journey tests proving the Delivery and Pickup UI paths can advance from cart/PDP into checkout payment selection.
- [x] Keep PayPal synchronized shipping callback totals, final express review snapshot, capture, and amount consistency guard deferred to Milestone 13.
- [x] Add a milestone-close gate so visible actions are wired, disabled with reason, or explicitly deferred before any UI milestone is marked done.

Verification:

- PDP add-to-cart changes the cart and refreshes amount-aware Pay Later messaging.
- Cart and minicart quantity changes persist through the app cart state and refresh Pay Later amounts.
- Cart and minicart close/view-cart/checkout actions route through App state and close the minicart instead of silently falling back to document navigation.
- PDP/cart/minicart delivery express controls mount official PayPal/Pay Later SDK surfaces; route to Review and Confirm happens after PayPal approval, while confirm-triggered capture remains Milestone 13.
- Delivery checkout starts with only Shipping address expanded; submitting or editing a section leaves only one section expanded.
- Buyer can complete all Delivery checkout sections from editable fields to selected payment method.
- Guest Pickup opens a store-list modal after ZIP/postcode submit and can advance from selected store to pickup date and selected payment method.
- Logged-in Pickup starts with a preselected nearest/default-address store, can change store from a modal, and can advance to pickup date and selected payment method.
- Partial Pickup store selection updates the Pickup Order Summary and excludes unavailable items from the payable pickup amount while preserving original cart intent.
- Payment method radio changes render the matching PayPal/Pay Later/card surface and hide unrelated selected-action surfaces.
- Wallet radio surfaces switch from buyer interaction, render only eligible rows, and keep Apple Pay/Google Pay/Venmo runtime eligibility evidence visible.
- No visible checkout/cart/PDP action is a silent placeholder. If live QA finds a shell action, reopen the related milestone item instead of treating the route transition as complete behavior.

## Milestone 12: Payment UI Integration

- [x] Integrate PayPal SDK v6 provider/loading.
- [x] Pass currency, locale, buyer country, Pay Later buyer country, and sandbox test buyer country from backend config into the SDK v6 integration.
- [x] Verify the installed `@paypal/react-paypal-js` v9 / SDK v6 types still include `testBuyerCountry` before wiring the provider.
- [x] Map backend `sandbox_test_buyer_country` to SDK v6 `createInstance({ testBuyerCountry })` for sandbox/test environments only.
- [x] Render PayPal standalone button when PayPal radio is selected.
- [x] Render Pay Later message in Pay Later radio row and Pay Later button/message under Order Summary when selected.
- [x] Render card fields expanded in the payment step with save checkbox inside card box.
- [x] Render Apple Pay, Google Pay, and Venmo buttons only when eligible.
- [x] Reserve layout space for PayPal buttons and Pay Later messages to avoid major layout shift.
- [x] Render save-for-future checkbox only for logged-in eligible buyers and supported methods.

Verification:

- PayPal sandbox renders and captures for Delivery.
- Sandbox market tests prove the configured test buyer country affects eligibility/message behavior.
- SDK v6 create-instance options receive `testBuyerCountry` in sandbox/test and omit it in production.
- Pay Later renders where eligible.
- Card fields render and submit.
- Apple Pay/Google Pay/Venmo eligibility behavior is visible in debug/Admin.
- PDP/cart/minicart express surfaces render official PayPal/Pay Later SDK controls and call `/api/paypal/orders/express-delivery` with the active cart binding before routing to Review and Confirm.

## Milestone 13: Express Review And Confirm

- [x] Build express Review and Confirm route/page.
- [x] Show synchronized PayPal shipping callback totals.
- [x] Show final item, shipping, promo, tax, and total snapshot.
- [x] Recover PDP/cart/minicart official PayPal and Pay Later express SDK surfaces before considering express checkout complete.
- [x] Recover checkout payment placement: no official PayPal/Pay Later/card/wallet action renders until the payment section is active and the matching radio method is selected.
- [x] Keep `UX_STATE_CONTRACT.md` and `.superpowers/brainstorm/57024-1779720088/content/checkout-recovery-state-contract.html` aligned with the Milestone 13 recovery implementation.
- [x] Recover Delivery accordion submit/collapse/edit behavior with live-data timing: shipping address collapses after save, billing address exposes an Edit action after save, and only one section is expanded at a time.
- [x] Recover Delivery shipping option state: it is not marked saved before buyer confirmation, changing the selected option updates Order Summary shipping/total lines, and edit/re-submit behavior is verified.
- [x] Resolve or explicitly gate Supabase-backed checkout draft submits so shipping/billing/shipping-option failures stay visible and retryable when the database is unreachable.

### Milestone 13.1: Cart, Checkout Draft, And Pay Later Recovery

Purpose: stabilize the cart/draft/payment readiness layer before confirm-triggered capture.

- [x] Restore browser cart binding on app load/refresh from persisted `cart_public_id` plus `cart_client_secret`, then server cart read/refresh; never reset a non-empty active cart to fixture defaults.
- [x] Bootstrap a fresh browser with no persisted cart binding by creating/reading a server guest cart, persisting the opaque binding, seeding starter cart items through `/api/cart/items`, and using returned server cart item IDs for later quantity edits.
- [x] Attach `x-cart-id` and `x-cart-secret` headers to guest cart, checkout draft, and PayPal express create-order API calls whenever an active guest cart binding exists.
- [x] Keep cart and minicart state bound on `/checkout`, including cart count and minicart contents.
- [x] Add minicart quantity controls that use the same server-backed cart update/reconcile path as the full cart, or explicitly disable/defer with buyer-facing copy before closing this slice.
- [x] Gate checkout and express PayPal create-order on server-ready cart/draft bindings; do not call PayPal with fixture draft IDs, missing cart IDs, or stale cart data.
- [x] Recover Pickup initial state separation: guest flow starts with ZIP/postcode only and no preselected store/default-address summary; logged-in flow may preselect nearest/default-address store.
- [x] Prevent market fixture leakage in Pickup; US market must not show GB postcode defaults such as `W1F 7JL` unless the active market is GB.
- [x] Add merchant-visible create-order failure handling for Supabase/PayPal failures with buyer-safe copy, debug ID, and retry affordance after popup close/failure.
- [x] Gate Pay Later SDK v6 buttons with `useEligibleMethods`/`findEligibleMethods`, amount/currency payload, and `getDetails("paylater")` before rendering official Pay Later buttons.
- [x] Verify browser refresh, minicart quantity edit, checkout route cart continuity, Pickup guest/logged-in initial states, Pay Later eligibility rendering, and PayPal create-order failure paths before capture work resumes.

### Milestone 13 Capture Completion

- [x] Capture only when buyer confirms.
- [x] Block capture if amount consistency guard fails.

Verification:

- PDP/cart/minicart express returns to merchant Review and Confirm.
- Full checkout does not add a separate Review and Confirm page.
- Browser refresh preserves the active cart binding and reloads server cart data.
- Fresh-browser starter carts are bridged into real Supabase cart rows before quantity edits; this is a tactical bridge until the buyer UI loads catalog products directly from the server.
- Checkout route does not reset cart count or minicart contents.
- Minicart quantity edits reconcile with the same server-backed cart path as full cart edits.
- Guest cart-backed API calls include both `x-cart-id` and `x-cart-secret`; missing bindings block checkout/create-order with buyer-safe copy.
- Review and Confirm posts capture only from the buyer Confirm and pay action, shows captured/error status, and never posts capture when the amount guard blocks payment.
- Pickup guest flow does not preselect a store or default address before ZIP/postcode submit, and market-specific defaults match the active market.
- Pay Later official button is absent while eligibility is loading/ineligible and appears only when eligible details are available.
- PayPal create-order failures leave visible merchant-side error/debug evidence.

## Milestone 14: Account, Guest, Reviews

- [x] Implement email-first login/register modal branching with server email lookup.
- [x] Wire Supabase Auth sign-in/register submit, buyer session persistence, and authenticated cart merge.
- [x] Resolve live Supabase Auth sign-in/register blocker where the configured remote project returns a token-endpoint database schema error before the app can merge the signed-in cart.
- [x] Fix live minicart viewport placement so the drawer opens inside the desktop viewport and Close/View cart/Checkout controls are clickable.
- [x] Fix live Pickup market/store source so US ZIP searches cannot show GB/London stores, even after previous guest/logged-in fixture cleanup.
- [x] Keep checkout Order Summary payment-neutral until the Payment method section is active and a radio method is selected.
- [x] Pass authenticated buyer request context into checkout and delivery-express PayPal create-order surfaces after login, so logged-in payment attempts use bearer auth instead of guest cart secrets.
- [x] Implement account settings profile info.
- [x] Implement address book with default delete constraints.
- [x] Implement saved payment list/delete.
- [ ] Implement order history and order detail timeline.
- [ ] Implement guest order lookup.
- [ ] Implement guest confirmation inline account creation prompt.
- [ ] Implement review submission/edit/delete from completed order items.

Verification:

- Guest checkout cannot vault.
- Guest order lookup requires order number and email.
- Completed delivered/picked-up order allows one active review per order item.
- Deleting review reopens eligibility.

## Milestone 15: Admin Portal

- [ ] Build `/admin` passcode gate.
- [ ] Build profile/market global controls.
- [ ] Build order list/detail and lifecycle controls.
- [ ] Build Admin order detail sections for timeline, PayPal snapshots, total snapshots, promo evaluation lines, inventory effect, and linked webhooks.
- [ ] Build inventory and pickup date controls.
- [ ] Build webhook viewer.
- [ ] Build payment/order debug viewer.
- [ ] Build runtime debug logs.

Verification:

- Admin profile/market switch resets active carts/session context only.
- Manual delivery lifecycle updates buyer timeline.
- Manual pickup lifecycle updates buyer timeline.
- Invalid webhooks are visible but do not mutate state.

## Milestone 16: QA, UX Review, And Demo Polish

- [ ] Run unit/API/UI test suite.
- [ ] Run manual PayPal sandbox checklist, including final `PAYPAL_EVIDENCE.md` review against sandbox account capabilities.
- [ ] Add POP MART playful collectible visual refresh tokens: coral CTA, candy pink, lemon yellow, mint green, sky blue, warm white, deep ink, and separate generic profile tokens.
- [ ] Refresh storefront typography toward rounder retail character, preferring Rubik headings and Nunito Sans body/UI where web font loading is acceptable.
- [ ] Refresh homepage visual language: blind-box/drop hero, hot-sales stickers, capsule/toy-shelf category cards, drop-calendar treatment, and collectible-event promo cards.
- [ ] Refresh category and PDP product surfaces: tactile product cards, sticker-like status labels, clear current/regular price, release state, and pickup availability without table-like clutter.
- [ ] Refresh cart, minicart, and checkout accents so the brand feels playful while PayPal official surfaces remain stable, readable, and visually undistorted.
- [ ] Refresh Pickup store cards as compact store-ticket surfaces with address, phone, distance, available/unavailable counts, and partial-inventory notes.
- [ ] Run responsive visual QA at 375px, 768px, 1024px, and 1440px.
- [ ] Verify sticky header and sticky bottom payment bar do not cover content.
- [ ] Verify checkout forms announce errors and move focus predictably.
- [ ] Verify release calendar, promo, inventory, and lifecycle states do not rely on color alone.
- [ ] Verify PayPal buttons/messages render without major layout shift.
- [ ] Verify POP MART mode is playful premium collectible retail, not a generic white/red ecommerce shell and not the generic profile's blue/amber/cream treatment.
- [ ] Verify visual accents stay controlled: no childish clutter, no heavy glassmorphism, no decorative orbs, no page-wide rainbow effect, and product imagery remains the hero.
- [ ] Verify POP MART asset quality and replace weak images.
- [ ] Verify generic MochiToy profile assets are public-safe.
- [ ] Update runbook with exact commands.
- [ ] Update tracking files and promote reusable learnings.

Verification:

- `scripts/check-agent-system.sh` passes.
- Demo starts locally from documented commands.
- Core Delivery and Pickup flows complete in sandbox where eligible.
- Admin Portal can explain payment/order/debug state during a live presentation.

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
  - [x] Optimize shipping/billing draft recalculation so address submits reuse already-loaded cart rows and eligible shipping options instead of repeating slow backend reads.
- [x] Implement promo evaluate/apply/remove APIs.
- [x] Implement guest order lookup API.

Verification:

- API tests cover released/unreleased PDP behavior.
- API tests cover market-scoped catalog prices and profile/market switch config.
- API tests cover guest cart local ID/secret behavior.
- API tests cover logged-in cart refresh and merge.
- API tests cover Delivery and Pickup checkout draft recalculation.
- Repository tests cover shipping/billing checkout draft recalculation without duplicate cart or shipping-option reads.

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
- [x] Wire category route query state into live catalog API requests and active filter/count chrome for API-backed product grids.
- [x] Build PDP gallery, product status, product details, price display, Pay Later message placement, add-to-cart, express buttons, and reviews.
- [x] Block unreleased product checkout actions and hide reviews.

Verification:

- Calendar release dates render as outlined/unfilled circles.
- Calendar release state is understandable without relying on color alone.
- PDP image switching works with 3-4 images.
- PDP has no pickup hint.
- Homepage/category Pay Later promo has no amount.
- Category route query filters request server-filtered products and mark the active category/applied count state.

## Milestone 10: Cart And Minicart UI

- [x] Build minicart with item summary, Pay Later amount message, checkout/view-cart actions, PayPal/Pay Later delivery express, and pickup hint text.
- [x] Keep minicart express actions stacked inside the drawer so PayPal/Pay Later controls do not overlap on desktop or 375px mobile.
- [x] Build full cart with quantity editing, Pay Later amount message, checkout action, PayPal/Pay Later delivery express, and pickup hint text.
- [x] Keep pickup hints as text only, no pickup button.

Verification:

- Cart/minicart express creates delivery-only payment sessions.
- Pickup hint appears in cart/minicart and not PDP.
- Quantity changes refresh Pay Later amount-aware messages.
- Minicart express actions fit within the drawer without overlap or horizontal overflow.

## Milestone 11: Checkout UI

- [x] Build `/checkout` with Delivery/Pickup tabs and preserved tab state.
- [x] Build Delivery accordion: shipping address, billing address, shipping option, payment.
- [x] Build Pickup accordion: ZIP/default location, store selection, billing address, pickup date, payment.
- [x] Normalize stale seeded pickup dates into a current rolling checkout calendar window, and submit the default selected date when the buyer does not manually change the calendar.
- [x] Build checkout step states: idle, saving, saved/collapsed, editing, recalculating totals, blocked/error, and locked.
- [x] Build focus movement and announced errors for checkout form validation.
- [x] Build partial pickup store card inventory before store submit, including item-level cart-line status where the checkout draft provides product names and quantities.
- [x] Build Order Summary with neutral/no-promo state unless a real code/discount exists, ready/unavailable pickup item split, and selected payment action slot.
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
- [x] Keep Pay Later radio rows compact with logo labeling, and render Pay Later button/message under Order Summary when selected, using explicit message content fetch with a buyer-safe fallback when PayPal presentment content fails or renders empty.
- [x] Detect Pay Later message slots that report ready but render empty, then show the same buyer-safe fallback and structured console evidence.
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

- [x] Recover the frontend design source of truth before continuing account/order UI: strengthen `DESIGN.md` with POP MART tokens, component contracts, detailed page implementation specs, UX-flow contracts, state contracts, and frontend acceptance gates.
- [x] Apply the recovered POP MART design language to existing buyer account settings surfaces before closing Account UX polish.
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
- [x] Implement order history and order detail timeline.
- [x] Implement guest order lookup.
- [x] Implement guest confirmation inline account creation prompt.
- [x] Implement review submission/edit/delete from completed order items.

Verification:

- Frontend slices check `DESIGN.md` before implementation and update `tracking/test-cases.md` with visual, interaction, async state, and responsive acceptance rows.
- Customer-facing frontend slices include Computer Use or browser/Playwright visual evidence before being marked complete.
- Guest checkout cannot vault.
- Guest order lookup requires order number and email.
- Completed delivered/picked-up order allows one active review per order item.
- Deleting review reopens eligibility.

## Milestone 15: Admin Portal

- [x] Build `/admin` passcode gate.
- [x] Build profile/market global controls.
- [x] Build order list/detail and lifecycle controls.
- [x] Build Admin order detail sections for timeline, PayPal snapshots, total snapshots, promo evaluation lines, inventory effect, and linked webhooks.
- [x] Build inventory and pickup date controls.
- [x] Build webhook viewer.
- [x] Build payment/order debug viewer.
- [x] Build runtime debug logs.

Verification:

- Admin profile/market switch resets active carts/session context only.
- Manual delivery lifecycle updates buyer timeline.
- Manual pickup lifecycle updates buyer timeline.
- Invalid webhooks are visible but do not mutate state.

## Milestone 16: QA, UX Review, And Demo Polish

Reference-level polish execution guide:

- Use `docs/superpowers/plans/2026-06-18-popmart-reference-polish.md` as historical reference-level context before coding Home/Category/PDP/Cart/Minicart/Checkout/Order Confirmation/Account polish. For Cart/Checkout A+ edits, `CART_CHECKOUT_A_PLUS_SPEC.md` is the current contract and supersedes older generated mockup targets.
- `DESIGN.md` owns the visual contract and truth constraints. Do not add fake search, fake preorder economics, fake ratings, fake social auth, unsupported trust claims, or unsupported PayPal behavior to match the reference screenshots. Header search is allowed only as a real form-backed `/products?q=...` catalog search.
- Generated concept mockups for Home, Category/PLP, PDP, Cart, Minicart, Checkout, Order Confirmation, and Account/sign-up clarify target hierarchy; use them as directional UX references, not as literal runtime screenshots.
- Before continuing additional page polish, adopt a shadcn component foundation for repeated primitives. Keep custom ecommerce page composition and official PayPal SDK surfaces; do not replace pages wholesale with generic shadcn page blocks.
- Mobile-friendly gates from `ui-ux-pro-max`: mobile-first defaults, no horizontal page scroll, touch-sized controls, compact filters/drawers, vertical cart cards, reachable checkout/payment actions, labeled forms, correct input types/inputmodes/autocomplete, submit feedback, and verification at 320/375/414/768/1024/1440px.
- Close page slices only after focused component tests, `npm run typecheck` or stronger verification, and desktop/mobile visual evidence.

- [x] Run unit/API/UI test suite.
- [ ] Run manual PayPal sandbox checklist, including final `PAYPAL_EVIDENCE.md` review against sandbox account capabilities.
- [x] Add the shadcn foundation gate before further page polish: initialize/adopt project config and aliases, add the near-term primitives (`Button`, `Card`, `Avatar`, `Badge`, `Separator`, `Skeleton`, `Sheet`, `Dialog`, `Tabs`, `Calendar`, `Accordion`/`Collapsible`, `ScrollArea`, and form field primitives), create demo-local wrappers only where needed, preserve official PayPal SDK-rendered surfaces, and document the migration path.
- [x] Migrate the first shared shadcn primitive slice: cart/minicart local links and fallback delivery express buttons use shadcn `Button`, the shared `PayPalPaymentFrame` uses shadcn `FieldSet`/`FieldLegend`, Vitest resolves the `@/*` alias, and official SDK-rendered PayPal surfaces remain externally rendered.
- [x] Migrate the PDP lower-detail navigation to shadcn `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` while preserving PDP class hooks, product detail semantics, force-mounted inactive panel hiding, explicit trigger click handling, Radix tab-panel accessibility wiring, selected-state visual feedback, and the existing collector/product facts/gallery/review/shipping/Q&A hierarchy.
- [x] Migrate checkout Delivery/Pickup fulfillment switching to shadcn `Tabs`, `TabsList`, `TabsTrigger`, and `TabsContent` while preserving locked-mode behavior, separate Delivery/Pickup panel state, checkout step progression, and payment-context interactions.
- [x] Migrate Category/PLP mobile filters to shadcn `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, and `SheetDescription` while preserving the desktop sidebar, reset action, supported filter IDs, product-grid ordering, and no native details/summary fallback.
- [x] Migrate the auth modal/save-order account path to shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `FieldGroup`, `Field`, `FieldLabel`, `FieldError`, `Input`, and `Button` while preserving sign-in/register/change-email flows, guest-order save account entry, close behavior, and field validation semantics.
- [x] Migrate the cart/minicart presentation shell to shadcn `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetClose`, `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Badge`, and `Separator` while preserving cart quantities, Pay Later/PayPal SDK placements, checkout navigation, and the modal drawer accessibility contract.
- [x] Migrate the Express Review/order confirmation shell to shadcn `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`, `Badge`, `Separator`, and `Button` while preserving amount-guard blocking, capture status/receipt messaging, guest save-order focus, and account creation entry.
- [x] Migrate the buyer-shell action and release-calendar slice to shared primitives: account uses shadcn `Avatar`, wishlist/cart/search/menu/close controls use `lucide-react` icons, Home release dates render through shadcn `Calendar`, minicart outside-click dismissal is covered through controlled `Sheet` behavior, and visible close buttons are icon-only X controls with accessible labels.
- [x] Migrate Home and Category/PLP card surfaces through shadcn `Card` composition: Home trust/product/category/promo/series cards and Category product cards use `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` while preserving full-card route links and existing retail CSS hooks.
- [x] Migrate PDP non-payment card surfaces through shadcn `Card` composition: story, series lineup, lineup items, review/social proof, trust badges, and recommendation tiles use `Card`, `CardHeader`, `CardAction`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter` while preserving tab semantics, full recommendation links, and official PayPal frame isolation.
- [x] Continue shadcn `Card` migration page by page for remaining Checkout and Account card/panel surfaces, preserving form controls, behavior-specific rows, and the no-nested-cards rule instead of bulk-replacing page compositions.
- [x] Add POP MART playful collectible visual refresh tokens: coral CTA, candy pink, lemon yellow, mint green, sky blue, warm white, deep ink, and separate generic profile tokens.
- [x] Refresh storefront typography toward rounder retail character, preferring Rubik headings and Nunito Sans body/UI where web font loading is acceptable.
- [x] Translate the generated concept mockup targets into implementation: Home, Category/PLP, PDP, Cart, Minicart, Checkout, Order Confirmation, and Account/sign-up must each match the documented hierarchy before the slice is marked complete.
- [x] Refresh global buyer shell to the approved reference level: utility strip, supported discovery/navigation, account/wishlist/cart actions with live count, and production-ready footer without inert search or unsupported trust claims.
- [x] Compress the mobile buyer header: simplify the brand to a POP logo mark, keep browse/account/wishlist/cart/menu in touch-sized controls, hide the desktop product-nav grid on mobile, and expose product categories plus support links through an accessible drawer.
- [x] Refresh homepage visual language to the approved reference level: cinematic blind-box/drop hero, trust strip, release/calendar plus product shelf, capsule/toy-shelf category cards, collectible-event promo cards, popular-series rail, and deep footer.
- [x] Refine the mobile homepage first viewport so the hero image fills the hero card, title/subtitle/compact CTAs overlay the image, the image links to the featured drop, and utility/trust cards move below release/product merchandising on mobile.
- [x] Apply the Homepage Reference Polish V2 guidance from `DESIGN.md`: image-led hero overlay, Lucide/shadcn trust cards, denser release/calendar plus pre-order board, badge/action product cards, arrowed category shelf, image-backed promo/event cards, compact popular-series rail, and mobile local rails without horizontal page scroll.
- [x] Apply the Homepage Reference Polish V3 guidance from `DESIGN.md`: replace the fake header discovery anchor with a real shadcn-backed catalog search form, route submitted keywords to `/products?q=...`, pass `q` to live/fallback category filtering, and lighten the POP MART typography weight/hero scale.
- [x] Apply the Homepage Reference Polish V4 guidance from `DESIGN.md`: reduce homepage dark visual mass, deepen release-calendar discovery, improve footer/newsletter commercial depth, preserve real search, keep lighter typography, and close the slice only with GUI evidence at the required desktop/tablet/mobile widths.
  - [x] V4 pre-implementation review: run a read-only homepage audit with Computer Use/Playwright plus `ui-ux-pro-max` guidance, optionally using an independent sub-agent for checklist coverage, then reconcile findings back into `tracking/todos.md` and `tracking/test-cases.md` before runtime edits.
  - [x] V4 shell/tokens: rebalance utility/header/nav/footer colors so deep navy is an accent instead of a large uninterrupted frame; keep POP MART red/pink/yellow/mint/sky accents for badges, active states, and compact CTAs.
  - [x] V4 utility/header/nav: keep the real `/products?q=...` search form typeable and focusable, refine desktop header/action density, keep mobile logo/search/account/cart/menu compact, and keep category/support navigation in the shadcn mobile `Sheet`.
  - [x] V4 hero/trust: preserve the image-led clickable hero while reducing surrounding chrome; keep four compact buyer-facing trust cards with only implemented/demo-backed capabilities.
  - [x] V4 release calendar desktop/tablet: make date selection update selected state, visible event details, and the adjacent product shelf; 1280px keeps the full desktop calendar, 1024px and below use a compact collapsible calendar, and desktop/tablet/mobile interaction paths now drive release discovery without page-level horizontal overflow.
    - [x] Replace the oversized desktop explanatory details block with compact event/date chips, a compact selected-release card, and color-independent legend copy.
    - [x] Wire release-date selection to update visible selected state, event details, selected-date `aria-live` feedback, and adjacent product shelf content.
  - [x] V4 release calendar mobile: default to compact agenda/date chips plus product cards, move the full month calendar behind shadcn `Sheet`, `Dialog`, `Accordion`, or `Collapsible`, and keep touch targets at 44px+ without page-level horizontal scroll.
  - [x] V4 merchandise modules: tighten product cards, category rail, promo banners, and popular series with shadcn `Card`/`Badge`/`ScrollArea` composition, stable media boxes, readable labels, and supported CTA behavior.
  - [x] V4 Pay Later/footer/loading: keep direct official Pay Later message rendering after merchandising, add buyer-safe timeout fallback without layout jump, split footer into light newsletter band plus shorter navy base, and use shadcn `Skeleton`/image placeholders for loading states.
    - [x] Split the footer into a light collector-updates band with retail actions and a shorter navy footer base, and verify the shell/footer visual-mass reduction at desktop and mobile widths without page-level horizontal overflow.
    - [x] Move the Home Pay Later surface after the merchandising modules so it no longer interrupts product discovery before categories, promo cards, and popular-series rails.
    - [x] Render shadcn `Skeleton` placeholders for pending Home release/product/category/promo/series surfaces so the initial state does not flash empty/mock product modules.
    - [x] Verify Home Pay Later on the full local server, where `/api/paypal/sdk-config` is available: the provider reaches `ready`, the sandbox `paypal-message` element mounts after merchandising, and no provider or amount fallback renders at 1440, 1280, 1024, 768, 390, or 320 widths.
  - [x] V4 typography refinement: lower non-hero section/product heading weights from 900 toward the V4 650-800 range while preserving the already-fixed real search and lighter shell controls.
  - [x] V4 verification gate: run focused tests plus GUI/browser checks at 1440, 1280, 1024, 768, 390, and 320 widths, then update `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` before claiming completion.
- [x] Apply the Category + PDP Reference Polish V5 guidance from `DESIGN.md` and `docs/superpowers/plans/2026-06-29-category-pdp-reference-polish-v5.md`: improve Category Pay Later/filter/card states and PDP coming-soon/review/tab/mobile purchase behavior with explicit review gates before runtime completion.
  - [x] V5 focused pre-implementation review gate: capture live Render baseline screenshots/metrics for Category, released PDP, and unreleased PDP, run `ui-ux-pro-max` review, and reconcile findings into this checklist plus `tracking/test-cases.md` before editing runtime code.
    - Inspection standard: baseline evidence records mobile first-product depth, Category filter footprint, Pay Later placement/readiness, PDP tab dimensions, PDP support-card footprint, unreleased payment-frame presence/absence, and page-level horizontal overflow.
    - [x] 2026-06-29 focused Render evidence covers `/products` at 1440 and 390, released `/products/blind-boxes-2` at 1440 and 390 with Product facts/Customer reviews tab clicks, and unreleased `/products/blind-boxes-1` at 390. Evidence lives in `/Users/tengtao/Development/demo-projects/.playwright-mcp/v5-preaudit-20260629/`.
    - [x] Reconciled findings: Category Pay Later renders but is still visually detached; Category desktop remains sidebar-heavy; coming-soon cards lack a strong top-right badge/muted-media distinction; released PDP support modules still consume rail space and create desktop gallery-side blank area; released PDP mobile tab interaction works but the rail hides left/right tabs offscreen; released PDP mobile has no sticky Add to cart candidate after scroll; unreleased PDP still renders disabled Add to cart plus disabled PayPal/Pay Later frame DOM and must hide the whole purchase/payment frame.
    - [x] Full final GUI matrix covers `/products`, `/products?category=blind-boxes`, `/products?q=molly`, `/products/blind-boxes-2`, and `/products/blind-boxes-1` at 1440, 1280, 1024, 768, 390, and 320 widths. Evidence lives in `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v5-final-20260701/`; the initial cold `/products` 1440 capture was rerun as `category-all-1440-rerun.png` after API settle and showed 25 products, no skeletons, and no overflow.
  - [x] V5 Category Pay Later integration: align the official amount-free Pay Later message inside a restrained page-token section without restyling the `paypal-message` element.
    - Inspection standard: exactly one official message or one buyer-safe fallback renders, no duplicate fallback appears after SDK readiness, and products remain visible in the first mobile browsing pass.
    - [x] Place the Pay Later section with the Category toolbar/grid context rather than as a disconnected raw text line.
    - [x] Use merchant-owned shadcn/card-like wrapper chrome with compact padding, warm border/background, optional short label, and stable loading/fallback height.
    - [x] Do not decorate PayPal SDK internals, shadow DOM, SDK iframes, or official button internals with merchant CSS; shared layout CSS may still size SDK custom elements such as `paypal-message` so official content fills the reserved slot.
    - [x] Focused unit/browser coverage verifies the merchant-owned wrapper, fallback slot, amount-free copy, and final Category matrix behavior. Local PayPal sandbox presentment can log timeout warnings; buyer-safe fallback remains available and hosted Render smoke stays the post-deploy check.
  - [x] V5 Category filter/sort redesign: move primary filters/sort above the grid, keep active filters as chips, put secondary filters in a shadcn `Sheet`/popover, preserve route query state, and keep mobile controls compact.
    - Inspection standard: category, release status, price, availability, pickup context, sort, and `q` survive reload/back/forward; controls are 44px+ on mobile; no horizontal overflow appears at 320px.
    - [x] Toolbar order is page context/result count, quick category chips, sort, `All filters`, active chips/reset, then product grid.
    - [x] Quick chips cover implemented primary categories; secondary filters cover only supported release status, availability, price, and pickup availability with disabled reason when location context is missing.
    - [x] Mobile and desktop filter sheets have title/description, focus trap, X close, 44px+ tap rows, selected indicators, body scroll lock, and focus return through shadcn `Sheet`.
    - [x] Final matrix covers direct category/search URL states, the mobile filter Sheet interaction at 390px, 320px overflow, and product-grid visibility after filters/search settle. Back/forward route-state remains lower-risk follow-up scope if future filter behavior changes.
    - [x] Focused Category tests cover the implemented toolbar, filter Sheet, active state, and API-down fallback behavior where existing test harnesses support it.
  - [x] V5 Category product-card state polish: add top-right coming-soon/not-released labels, muted unreleased media, no purchase-start affordance for unreleased products, sale badge consistency, stable media skeletons, and non-color-only status copy.
    - Inspection standard: released, sale, and coming-soon cards are visually distinct in screenshots; badges do not overlap at 320px; no old mock-image flash or card-height jump occurs.
    - [x] Define data-driven card state mapping for released/purchasable and coming soon/not released where current Category data supports it.
    - [x] Badge priority prevents `Sale` and `Coming soon` collisions; unreleased state wins when product cannot be purchased.
    - [x] Unreleased cards keep PDP navigation but hide or disable cart/checkout/payment-start affordances with clear copy.
    - [x] Focused unit coverage plus final matrix verifies badge priority, unreleased action suppression, sale/coming-soon display, muted-media state, no old mock image flash, and no 320px overlap/overflow. Wishlist remains absent from Category cards in this scope.
  - [x] V5 PDP coming-soon gating: hide Add to cart, PayPal, Pay Later, and delivery express frames for unreleased products while showing disabled coming-soon/not-released action copy and release context.
    - Inspection standard: unreleased PDP has no payment frame/message/button DOM, reviews stay hidden, and product inspection content remains accessible.
    - [x] Implement released/unreleased purchase-state branching instead of rendering the released purchase rail with disabled internals.
    - [x] Unreleased PDP keeps breadcrumb, gallery, title, status, vendor/profile label, facts, shipping/returns, and Q&A/detail content reachable.
    - [x] Do not add enabled `Notify me` or email capture unless real state/routes are implemented.
    - [x] Tests prove released PDP shows eligible purchase/payment/reviews and unreleased PDP hides purchase/payment/reviews/social proof without hiding inspection content.
    - [x] Review-gate fix: unreleased PDPs also hide review/social-proof surfaces if upstream data accidentally includes social proof, and PayPal SDK custom-element tags keep explicit layout sizing for checkout/delivery actions rather than relying on wrapper-only width.
    - [x] Local browser verify unreleased fallback PDP at 1440, 390, and 320 with no Add to cart, PayPal frame/button, Pay Later message/button, review cards, sticky purchase action, or horizontal overflow.
      - Evidence: `/products/vinyl-figures-7?qa=pdp-v5-unreleased-gating` passed in local Vite fallback mode; screenshots are `pdp-v5-unreleased-desktop-1440.png`, `pdp-v5-unreleased-mobile-390.png`, and `pdp-v5-unreleased-small-320.png`; metrics live in `/private/tmp/paypal-retail-pdp-v5-unreleased-gating-20260630/metrics.json`.
      - Final matrix: `/products/blind-boxes-1` is covered at 1440, 1280, 1024, 768, 390, and 320 widths with no active Add to cart, PayPal frame, Pay Later message/button, review cards, sticky purchase action, or horizontal overflow.
  - [x] V5 PDP purchase rail/reviews/detail navigation: compact support cards, keep Pay Later under price, show real review summary/preview for released products, and refine desktop/mobile detail navigation.
    - Inspection standard: no fake ratings, Customer reviews are discoverable from real data, desktop tabs have no vertical scrollbar artifact, mobile tabs/accordion do not clip inaccessible right-side controls, and all detail sections activate by click/keyboard.
    - [x] Audit the four support modules and decide keep/merge/move/remove for `PayPal checkout`, `Delivery choices`, `Order recovery`, and `Demo policies`.
      - Result: kept and merged the current runtime support set `PayPal checkout`, `Delivery express`, `Pay Later`, and `Order recovery` into a compact support band. The older standalone `Demo policies` module is not present in current PDP support defaults and was not recreated; shipping/returns policy copy stays in the detail tab.
    - [x] Compress support info into chips, a compact band, or an accordion so the purchase rail no longer creates excessive blank space below the gallery.
    - [x] Preserve released PDP order: price, official Pay Later, purchase options, Add to cart, secured PayPal frame, compact support/trust.
    - [x] Show rating/review summary near title only when real review data exists; lower review preview uses seeded/submitted reviews or a released-only empty state.
      - Review-gate fix: social proof cannot reopen `Customer reviews` without real `reviews[]` records and is rendered with separate `data-social-proof-card` instrumentation when reviews exist, not as `data-review-card`.
    - [x] Mobile details use accordion/collapsible sections or a constrained scrollable tab rail with visible scroll affordance, 44px+ triggers, no vertical scrollbar artifact, and inactive panels hidden from the accessibility tree.
    - [x] Local browser proof: `/products/blind-boxes-2?qa=pdp-v5-task6-tab-start` passed released-PDP checks at 1440/1280/768/390/320 with four compact support items, no old trust grid, review summary present, no page-level horizontal overflow, tab rail `overflow-y: hidden`, first tab visible after the 768px alignment fix, and 320px Customer reviews click activating the real review summary. Evidence is in `/private/tmp/paypal-retail-pdp-v5-task6-20260630/`.
    - [x] Final matrix and focused 390px console check captured exact released-PDP console behavior: the previous React missing-key error is fixed by returning review IDs from the catalog API and defensively keying frontend review cards; remaining local console warnings are PayPal sandbox Pay Later timeout warnings with buyer-safe fallback available.
  - [x] V5 PDP mobile sticky purchase bar: show a released-product sticky Add to cart bar only when the main CTA is out of view, using the same option/quantity/price state and add-to-cart handler.
    - Inspection standard: sticky bar respects safe-area padding, does not cover PayPal messages/detail tabs/footer content, disappears when the main CTA is visible, and never exposes payment actions for unreleased products.
    - [x] Sticky bar appears below the mobile breakpoint only, includes selected option (`Random 1PC` / `Whole Box` where applicable), quantity/pack count, selected price, and Add to cart.
    - [x] Sticky action reuses the main add-to-cart handler and cannot dispatch duplicate cart adds or wrong whole-box quantity.
    - [x] Sticky bar never renders PayPal, Pay Later, card, wallet, or express-payment buttons.
    - [x] Tests cover intersection visibility, selected option sync, whole-box quantity, hidden unreleased state, no payment-surface copy, and one cart dispatch per click. Loading/error copy is not represented because the current PDP add-to-cart handler is synchronous and has no per-button loading/error prop.
    - [x] Local browser proof: released `/products/blind-boxes-2?qa=pdp-v5-sticky-390` passed at 390/320 with sticky show when the main CTA is out of view, hide when the CTA is visible, safe-area bottom reserve, no sticky PayPal/Pay Later/card/wallet text, no horizontal overflow, Whole Box sticky sync to qty 12, and one sticky click moving the header cart to 12. Unreleased fallback `/products/vinyl-figures-7?qa=pdp-v5-sticky-unreleased` passed at 390/320 with no sticky action, no Add to cart, no PayPal frame, and no Pay Later. Evidence: `/private/tmp/paypal-retail-pdp-v5-sticky-20260630/`.
  - [x] V5 milestone review gate: after Category implementation and after PDP implementation, run an independent review or explicit checklist audit before proceeding to the next slice.
    - Inspection standard: review findings are fixed or added as open tracking rows before any V5 row is marked complete.
    - [x] Category received an explicit local GUI/checklist gate before PDP work; PDP received focused tests plus independent reviewer `019f1d69-222a-7e91-877e-8b4e9b7c01d1` before final close.
  - [x] V5 final verification gate: run focused Category/PDP/App/payment tests for changed behavior, `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and GUI/browser checks at 1440, 1280, 1024, 768, 390, and 320 widths for Category, released PDP, and unreleased PDP.
    - Inspection standard: `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` list the exact evidence path, pass commands, remaining open items, and any deferred scope before V5 is closed.
    - [x] Hard blockers for closing V5 are clear in local final evidence: no missing message/fallback hard blocker, no unreleased PDP active payment/add-to-cart action, no page-level horizontal overflow, no clipped inaccessible tabs/filter controls after tab scroll activation, no fake review/rating data, no sticky CTA content overlap, and final evidence package is recorded. Local PayPal sandbox timeout warnings remain a hosted smoke caveat, not a runtime hard blocker.
- [x] Apply the Category + PDP Refinement V6 guidance from `DESIGN.md` and `docs/superpowers/plans/2026-07-02-category-pdp-refinement-v6.md`: keep Category product-first, convert mobile filters to a floating icon Sheet trigger, make Category Pay Later a quiet divider/strip, move PDP support tiles into lower details, refine real-data-only review/rating copy, and add verified footer payment marks.
  - [x] V6 mockup and plan review gate: spawned read-only sub-agent `019f22a4-6297-7222-8166-46ff59ffdda9` with `ui-ux-pro-max`; reconciled findings into the V6 plan, checklist, todos, test cases, and progress notes before runtime edits.
  - [x] V6 Category structure slice: remove or collapse the bulky `catalog-hero`/large `All products` first-pass presentation, keep compact route-aware context, and make product imagery visible in the first `320` and `390` mobile viewport.
    - Inspection standard: browser metrics prove at least one product media box intersects the first mobile viewport, direct `/products`, `/products?category=blind-boxes`, and `/products?q=molly` state still works, and no page-level horizontal overflow appears.
  - [x] V6 Category Pay Later and mobile filter slice: replace the card/copy Pay Later treatment with a centered quiet strip, replace the mobile text filter row with a circular Lucide/shadcn Sheet trigger, and preserve selected-state/reset/focus-return behavior.
    - Inspection standard: one official PayPal message or one fallback renders, the strip is compact during timeout/fallback, the filter control is `44px` minimum with `aria-label` and focus state, and tests no longer expect `catalog-paylater__card` or text `Filter & sort` mobile rail behavior.
  - [x] V6 PDP support/review slice: remove support tiles from below the secured PayPal frame, render the four approved simple support tiles between collector story and series lineup, shorten visual review/rating labels to real-data-only SVG/icon star rows plus count, and keep full accessible review names.
    - Inspection standard: tests assert support tile ordering between collector copy and lineup, no support tile grid appears after the PayPal frame, review SVG/icon star UI is omitted when review data is absent or unreleased, and PDP tabs remain reachable without hidden/clipped triggers.
  - [x] V6 footer payment-mark slice: add verified local SVG marks for PayPal, Visa, Mastercard, and only already-supported checkout options with conservative eligibility wording.
    - Inspection standard: logo source is verified before assets are added, footer payment marks have accessible labels, no unsupported capability claim is introduced, and mobile/desktop footer screenshots show no clipping or contrast regression.
  - [x] V6 final verification gate: focused Category/PDP/App/style tests, `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and GUI/browser checks at 1440, 1280, 1024, 768, 390, and 320 passed for Category, released PDP, local unreleased PDP, and footer.
    - Evidence: `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v6-final-20260702/` covers `/products`, `/products?category=blind-boxes`, `/products?q=molly`, released `/products/blind-boxes-2`, and local unreleased `/products/vinyl-figures-7`; `metrics.json` reports `30` checks and `0` failures.
  - [x] V6 hosted Render smoke: after `main` advanced to `7f1c5d70`, Render served asset `index-DY1tYvnK.js` and hosted browser checks passed Category 1440/390/320, released PDP 1440/390, and hosted unreleased PDP 390 with 0 failures.
    - Evidence: `/Users/tengtao/Development/demo-projects/.playwright-mcp/paypal-retail-category-pdp-v6-render-smoke-after-main-20260702/` screenshots show no horizontal overflow, first product media in 390/320 mobile viewports, V6 Pay Later strip, floating mobile filter trigger, support tiles before series lineup, yellow SVG review stars, unreleased purchase/payment/review gating, and footer payment marks.
- [x] Apply the Cart + Checkout A+ Polish guidance from `CART_CHECKOUT_A_PLUS_SPEC.md`: product-first cart, checkout-primary hierarchy, secondary delivery express PayPal/Pay Later frame, compact checkout progress, thumbnail-backed Order Summary, mobile-safe sticky actions, and strict selected-payment gating.
  - [x] A+ spec/review gate: keep the approved Superpowers Variant A direction as behavioral guidance, run a read-only `ui-ux-pro-max` sub-agent review of the spec and acceptance criteria, and reconcile findings into `DESIGN.md`, this checklist, `tracking/todos.md`, and `tracking/test-cases.md` before runtime edits.
    - Inspection standard: review findings are fixed or explicitly tracked before any runtime row is marked complete; the mockup's hand-drawn PayPal buttons are treated as placeholders only, never as implementation guidance.
  - [x] A+ Cart hierarchy slice: compact the cart header, make item rows/cards product-first, keep `Go to checkout` dominant, move delivery express PayPal/Pay Later below the primary checkout action, and replace vague shipping/tax placeholders with buyer-safe calculated-later copy.
    - Inspection standard: at 320, 390/414, 1024, and 1440 widths, item media and item context appear before payment surfaces, quantity/remove controls stay 44px+, no horizontal overflow appears, and empty cart hides checkout/payment controls.
    - [x] Evidence: focused Cart/App/style tests and live API-backed browser screenshots under `/private/tmp/paypal-retail-cart-checkout-a-plus-20260703/` cover `/cart` at 320, 390, 1024, and 1440 with populated product rows, line totals, no horizontal overflow, and item media before PayPal express content.
  - [x] A+ Checkout structure slice: add compact active-step progress, keep Delivery/Pickup state separation, preserve one-expanded-section behavior, improve collapsed summaries/edit controls, and make Order Summary thumbnail-backed with capped `+N more` item context.
    - Inspection standard: initial checkout has no PayPal/Pay Later/wallet/card action or placeholder panel, submitted sections collapse immediately with concise summaries, focus moves predictably, progress updates after submit/edit/backtracking/tab switches, and Order Summary updates with active tab totals.
    - [x] Evidence: focused Checkout/App/style tests and live API-backed browser screenshots under `/private/tmp/paypal-retail-cart-checkout-a-plus-20260703/` cover `/checkout` at 320, 390, 1024, and 1440 with summary thumbnails, progress `Delivery - Shipping address - 1 of 4`, no initial provider action, and no horizontal overflow.
  - [x] A+ Mobile sticky/payment slice: keep mobile order context reachable, ensure sticky total/payment bars reserve safe-area padding and page bottom space, show exactly one selected non-card provider action, fit Pay Later message/fallback without clipping, and keep card payment inline.
    - Inspection standard: 320, 375, 390/414, 768, 1024, and 1440 evidence proves sticky bars do not cover forms, PayPal messages, footer content, modal controls, validation targets, focused inputs, or open sheets/dialogs.
    - [x] Evidence: focused tests cover selected non-card mobile sticky rendering and inline card behavior, and live browser proof covers selected PayPal, Pay Later, and inline Card surfaces at the 390px mobile breakpoint with no horizontal overflow, exactly one selected non-card provider action, no card sticky action, Pay Later message amount refresh to the active total, and no sticky/footer overlap. Follow-up live passes found and fixed the open mobile menu, open minicart Sheet, and open Sign in dialog overlap cases by hiding the checkout sticky action while `#mobile-menu`, `[data-slot="sheet-content"]`, or `[data-slot="dialog-content"]` is open; evidence includes `checkout-mobile-paylater-mobile-menu-open-390-fixed.jpg`, `checkout-delivery-paylater-minicart-open-active-390-fixed.jpg`, and `checkout-delivery-paylater-signin-dialog-fixed-390.png`. Pickup has a live 390px minicart-bound walkthrough through ZIP, full-inventory store, billing, pickup date, and selected Pay Later payment with `checkout-pickup-paylater-selected-390.png`; focused-input sticky safety is proved by reopening Pickup billing after Pay Later selection, where `.checkout-sticky-action` unmounts and the active field does not overlap any sticky rect in `checkout-pickup-focused-billing-after-paylater-390.png`. The selected-provider matrix covers Delivery Pay Later at 320, 375, 414, 768, 1024, 1280, and 1440, plus Delivery PayPal/Card at 320 and 1024, under `/private/tmp/paypal-retail-cart-checkout-a-plus-20260704/`; final clean-pass evidence under `/private/tmp/paypal-retail-cart-checkout-a-plus-20260704-final/` proves clean checkout entry, selected Pay Later, upstream edit suspension, and zero new warning/error logs for the pass.
  - [x] A+ PayPal/payment safety slice: preserve official SDK-rendered provider surfaces, hide ineligible wallets without stale selected actions, block missing/stale/loading/failed cart or draft bindings and payment eligibility/totals with buyer-safe syncing/retry copy, refresh Pay Later amount/message/fallback after cart and fulfillment changes, and keep SDK custom-element sizing stable.
    - Inspection standard: tests/browser checks prove official PayPal/Pay Later content is readable, undistorted, layout-stable, no create-order call occurs while readiness is missing/stale/loading/failed, and provider actions are present only in allowed selected-payment or delivery-express states.
    - [x] Evidence: focused tests cover missing checkout draft, syncing/stale/recalculating/failed readiness, failed card readiness, app-level provider-scope blocking for PayPal/Pay Later/card, upstream-edit provider suspension, ineligible selected wallet suppression, and Pay Later amount-message refresh on total changes. Live browser proof covers clean checkout entry with no provider scopes before payment, selected Pay Later at `$75.63` with one `paylater:ready` provider and no fallback duplicate, zero warning/error logs since pass start, and upstream shipping edit suspension with no payment rows, no provider scopes, no sticky action, no reserved payment slot, and no horizontal overflow. Buyer UI does not expose a safe live trigger for synthetic missing/stale/failed readiness without adding a QA hook, so those failure states remain intentionally verified by focused tests.
  - [x] A+ final verification gate: run focused Cart/Checkout/App/style tests, `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and browser checks for full cart plus Delivery/Pickup checkout states at the required widths.
    - Evidence standard: record screenshot path, route, viewport, console warnings/errors, horizontal overflow, sticky overlap, official PayPal element presence/absence, and whether first mobile cart pass shows item media before payment surfaces.
    - [x] Evidence: focused Cart/Checkout/App/PayLater/style verification passed `155` tests; `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` passed. Browser evidence covers initial cart/Delivery checkout, selected PayPal/Pay Later/Card mobile proof, fixed open mobile menu/open minicart Sheet/open Sign in dialog overlap proof, selected-provider matrix breadth, clean warning triage, tested readiness/error proof, Pickup Pay Later progression, Pickup focused-input sticky suspension, and the final clean 390px `/checkout` pass under `/private/tmp/paypal-retail-cart-checkout-a-plus-20260704-final/`.
- [ ] Apply the Cart + Checkout Round 2 density and mobile checkout disclosure refinement from `CART_CHECKOUT_A_PLUS_SPEC.md`: compact cart/title typography, hidden native quantity spinners, form-first mobile checkout, real Delivery/Pickup switch, complete shipping address collection, shipping method section, truthful promo UX, and v5 grabber-only order-details sheet.
  - [x] Round 2 spec/review gate: run a read-only sub-agent review of `CART_CHECKOUT_A_PLUS_SPEC.md`, `DESIGN.md`, this checklist, `tracking/todos.md`, and `tracking/test-cases.md`; reconcile missing deploy-quality criteria before runtime edits.
    - Inspection standard: review findings are either incorporated into the docs or explicitly deferred with reason; no runtime row below is marked complete until the spec/review gate is closed.
    - Evidence: read-only sub-agent review completed on 2026-07-04 with verdict `Ready with small additions`; added explicit settled/current totals definition, create-order request/callback proof, 250ms shipping-save progression, measurable typography density, grabber accessible name, US shipping requiredness, no default selected payment method, promo visibility guard, sticky Pay Later message placement, hosted smoke gate, shadcn component gate, browser-specific spinner proof, and consistent viewport matrix.
  - [x] Round 2 UI/UX caveat review gate: reconcile the later `ui-ux-pro-max` sub-agent verification verdict `Ready with caveats` into the deploy-quality checklist.
    - Inspection standard: caveats from the reviewer are either converted into open runtime tasks or explicitly deferred with reason before final deploy closure.
    - Evidence: updated this checklist plus `CART_CHECKOUT_A_PLUS_SPEC.md`, `DESIGN.md`, `tracking/todos.md`, and `tracking/test-cases.md` with the original caveats: 44px grabber hit target, amount-first promo display, direct shadcn Sheet ARIA/close/focus-return proof, and provider create-order request/callback counts in the hosted/API-backed matrix. Local tests and Playwright MCP evidence now close the first three caveats.
    - Follow-up evidence: a second read-only `ui-ux-pro-max` sub-agent verification returned `Ready with caveats`: visible Round 2 polish matches the approved virtual mockups. The selected-provider browser request/callback caveat was later closed locally for PayPal and Pay Later, and the API-backed real discount visual proof is now closed with `-$8.55 promo (AUTO10 + BUNDLE8)` in sticky, summary, and Sheet surfaces. Deploy closure still needs hosted smoke, recalculation/failure visual rows, selected Pay Later timeout-warning triage, and sticky/fixed UI overlap proof with focused inputs, Sheet controls, footer, PayPal messages, and dialogs.
  - [x] Round 2 cart density slice: reduce the cart header/title to compact bag status, keep item image/name/price/quantity visible before summary/payment content on mobile, and hide native number input spinner controls while preserving merchant decrement/input/increment controls.
    - Inspection standard: 320 and 390/414 screenshots show item media before any large title/summary/PayPal/Pay Later/trust block; no cart/checkout utility heading relies on 40px+ hero-scale type; runtime markup/CSS contain `.cart-status` and no `.cart-hero`; Chromium, WebKit/Safari, and Firefox spinner CSS is covered by tests or browser inspection; quantity controls remain 44px+, keyboard usable, and focus-visible.
    - [x] Evidence: runtime now uses a compact `.cart-status` bag row, removes the old `.cart-hero` shell from markup/CSS, reduces cart-only heading scale below hero typography, and hides native quantity spinners for WebKit/Chromium and Firefox while leaving merchant-owned decrement/input/increment controls intact. Focused `CartPage` and `global.css` tests cover the compact density marker, forbidden hero selector, and spinner CSS; local Chrome CDP screenshots captured `/cart` mobile layout in `/private/tmp/cart-mobile.png`. API-backed populated-cart first-viewport screenshots now exist at 320, 390, and 1440 in `/private/tmp/paypal-retail-cart-checkout-round2-api-backed-20260705/`.
  - [x] Round 2 checkout mobile form-first slice: make the first mobile checkout viewport prioritize fulfillment mode, active progress, and shipping address task; implement Delivery/Pickup as a real shadcn-style `Tabs` switch; collect first name, last name, street, optional apt/suite/building, city, state select, ZIP/postcode, and phone with mobile metadata and validation.
    - Inspection standard: 320 and 390/414 screenshots prove the order summary is not the dominant first-viewport content; runtime markup/CSS contain `.checkout-status` and no `.checkout-hero`; mobile CSS does not reorder `.checkout-summary` ahead of `.checkout-workflow`; `Tabs` has default value, keyboard behavior, active state, and state preservation; US-market shipping treats first name, last name, street, city, state, ZIP, and phone as required and apt/suite/building as optional; labels/autocomplete/market-appropriate input modes/inline errors are test-covered, including numeric keyboard for active US ZIP, telephone keyboard for phone, and text keyboard for explicitly alphanumeric postcodes; narrow layouts have no clipped labels, inputs, or submit controls.
    - [x] Evidence: checkout now uses compact `.checkout-status`, removes `.checkout-hero` from markup/CSS, and removes the mobile `.checkout-summary { order: -1; }` rule that pushed repeated order info above the buyer task. Focused `CheckoutPage` and `global.css` tests cover the compact status row, forbidden hero selector, workflow-before-summary CSS contract, shadcn `Tabs` markers, active/idle step shells, full shipping field set, `autocomplete`, requiredness, US ZIP `inputMode="numeric"`, phone `inputMode="tel"`, visually hidden required helper copy, validation, and shadcn state select opening. Local 320px Playwright DOM inspection confirmed no page-level horizontal overflow, workflow before summary, no `.checkout-hero`, active Shipping address, and unclipped first name, last name, street, apt/suite/building, city, state, ZIP, and full-width phone controls.
  - [x] Round 2 checkout progression slice: keep Shipping method between Billing address and Payment method in Delivery, and make shipping-save advance promptly to Billing while backend totals can continue in a visible recalculating/pending state.
    - Inspection standard: Delivery initial, shipping-saved, billing-active, shipping-method-visible, payment-ready, and recalculating states are covered; Billing opens within 250ms after client validation without waiting for the network round trip; payment actions are disabled until settled/current totals pass; shipping-save failure returns focus/error to the shipping step without stale totals.
    - [x] Evidence: focused checkout interaction tests cover Shipping address only at entry, Billing opening after submit, Shipping options remaining between Billing and Payment, the 250ms Billing-open path while a slow draft update is still pending, and save failure returning Shipping to blocked/editable state. Draft mapping/submission now preserves first name, last name, street, apt/suite/building, city, state, ZIP, and phone through the app-level draft update body. Same-mode draft updates are queued through the latest applied checkout data so a fast Billing save cannot overwrite a still-saving Shipping address response before Shipping method submit.
  - [x] Round 2 sticky order-details slice: replace arrow/caret review controls with the approved v5 neutral grabber integrated into the collapsed sticky summary; collapsed state shows only total, directly stacked promo, and current payment action; expanded state uses shadcn `Sheet side="bottom"` for order details.
    - Inspection standard: grabber is a measured 44px clickable/focusable target with an accessible name plus `aria-expanded`/`aria-controls`; no arrow/caret badge renders; sheet uses shadcn `Sheet side="bottom"` dialog semantics rather than a custom fixed panel; sheet includes item rows, subtotal, promo amount, shipping, tax, total, focus trap, Escape/scrim/handle close, focus return to the grabber trigger, reduced-motion behavior, reachable payment action when ready, a `Close order details` handle with a 44px minimum hit target, and no fake drag-to-close.
    - [x] Partial evidence: mobile checkout now renders a neutral top-edge grabber with accessible `Review order details` naming, keeps collapsed content to total/promo/current action state, and opens a shadcn bottom `Sheet` for item rows and totals. Focused checkout tests cover the neutral no-method state, selected non-card sticky action, and sheet open path; Chrome CDP screenshots captured `/checkout` neutral sticky and expanded sheet states in `/private/tmp/checkout-neutral-mobile.png` and `/private/tmp/checkout-sheet-mobile.png`.
    - [x] Caveat evidence: focused checkout/style tests now prove stable `aria-expanded`/`aria-controls`, shadcn `Sheet side="bottom"`, handle/Escape/scrim close, focus return to the grabber, a CSS-locked `44px` high by `112px` wide sticky trigger, a CSS-locked `44px` by `44px` minimum close-handle hit target, and skip-link layering below the Sheet/Dialog z-index while staying above the site header. Playwright MCP measured the rendered 390px checkout trigger at `112 x 44`, with `aria-controls="checkout-order-details-sheet"` and focus returning after Escape; screenshot evidence captured as `checkout-sticky-grabber-390.png`. API-backed metrics in `/private/tmp/paypal-retail-cart-checkout-round2-api-backed-20260705/metrics.json` also measure the expanded `Close order details` handle at `390 x 44`.
  - [ ] Round 2 promo/payment truthfulness slice: remove inert or fake promo activation, show truthful no-promo/offer status, display real discounts directly under total in collapsed sticky and inside expanded order details, and keep official provider actions gated by selected method plus settled totals.
    - Inspection standard: no manual promo input appears unless backend evaluate/apply/remove is fully wired and tested; discount copy uses text plus color; when `discount_minor > 0`, buyer-facing collapsed and expanded summaries show a signed amount such as `-$3.99 promo` and any promo code is secondary, never the only discount display; settled/current totals require active draft ID, latest draft update response applied to displayed summary, no saving/recalculating step, no pending draft request, and `paymentReadiness` absent or `ready`; no PayPal create-order path can fire during missing/stale/loading/failed/recalculating cart, draft, eligibility, shipping, tax, promo, or total states.
    - [x] Partial evidence: checkout no longer defaults to PayPal as an implicit selected method. Before explicit payment selection, mobile sticky action is disabled/neutral and App interaction tests prove PayPal remains unchecked until the buyer selects it; selected PayPal/Pay Later paths still render exactly one eligible provider action in focused tests. The broader failed/stale/recalculating request-count matrix remains open for the final verification gate.
    - [x] Amount-first evidence: draft API reconciliation now displays signed savings before promo codes whenever `discount_minor > 0`, for example `-$3.99 promo` and `-$3.99 promo (SAVE10)`. Focused API tests cover selected-code and auto-promo cases; App interaction tests now assert `-$4.00 promo (SAVE10)` and `-$4.00 promo (PICKUP5)` after delivery/pickup draft recalculation.
    - [x] Local create-order count evidence: `checkoutDraftApi.test.ts` proves backend `payment_readiness` maps into checkout data. `App.checkout-paypal-capture.test.tsx` now proves payment-ready/no-method creates zero `/api/paypal/orders/delivery` requests and zero SDK create-order callbacks; selected PayPal and selected Pay Later each require explicit buyer selection, the active checkout draft ID, exactly one SDK create-order callback, exactly one delivery create-order request, and the expected `method` payload (`paypal` or `paylater`); selected Card renders the inline card pay action with no sticky provider action and no PayPal button callback before card submit; recalculating readiness, failed readiness, and focused upstream billing input states keep request/callback counts at zero; open mobile menu, open minicart Sheet, and open sign-in dialog unmount the sticky provider action and keep request/callback counts at zero; expanded order-details Sheet creates exactly one request/callback only after the buyer taps the provider action; opening and closing the Sheet without payment keeps counts at zero. Hosted/API-backed visual matrix proof remains open for deploy closure.
  - [ ] Round 2 final verification gate: run focused Cart/Checkout/App/style tests, `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and GUI/browser evidence for cart plus mobile checkout initial, saved, payment-ready, selected-payment, expanded-sheet, collapsed-sheet, and failure/recalculation states.
    - Evidence standard: record screenshot path, route, viewport, route/action-scoped console warnings/errors, horizontal overflow, sticky overlap, first mobile cart pass, first mobile checkout viewport, surface-scoped provider counts, payment readiness reason, active draft/total state, create-order request/callback count, measured grabber hit-target rect, grabber accessible name/ARIA state, sheet focus trap/close/focus-return, promo state including amount-vs-code display, shipping-method visibility, and create-order blocked/allowed state. Include positive allowed browser paths proving both selected PayPal and selected Pay Later with settled/current totals fire exactly one method-attributed create-order request and one matching SDK callback when activated, plus a hosted smoke for `/cart` and `/checkout` at 320, 390/414, and 1440.
    - Inspection matrix: record `/cart` first mobile pass plus `/checkout` Delivery initial, saved shipping, billing active, shipping method visible, payment-ready no method, selected PayPal, selected Pay Later, selected Card, expanded order details, collapsed-again focus return, recalculating totals, failed totals/save, focused input with sticky visible or suspended, and open mobile menu/minicart Sheet/sign-in dialog/order-details Sheet overlap smoke. Add Pickup smoke if a shared checkout shell or sticky behavior changes.
    - Per-state data requirement: for each checkout payment state, record fulfillment mode, checkout draft ID, payment readiness state/reason, displayed total, promo, shipping, tax, selected method, provider counts by surface and provider type (`checkout-sticky`, `order-sheet`, `inline-card`, `minicart`, `message-only`), create-order request count, create-order callback count, and proof that displayed labels came from the latest applied draft response before provider actions unlocked. Browser metrics must expose baseline count, row delta, and cumulative count for create-order requests and callbacks per row so a selected-provider activation does not make later blocked rows look ambiguous.
    - Create-order pass/fail rule: blocked states require zero create-order requests and callbacks; selected PayPal and selected Pay Later with settled/current totals require exactly one create-order request and callback when activated; selected Card requires no mobile sticky provider action and keeps card payment inline.
    - Visual/fixed-position rule: hosted/API-backed evidence must prove no horizontal overflow and no sticky/fixed overlap with focused inputs, provider buttons/messages, Sheet controls, footer content, validation errors, mobile menu, minicart Sheet, sign-in dialog, skip link, or order-details Sheet controls. Local fallback-only screenshots cannot close deploy quality.
    - [x] Local code verification evidence: focused Cart/Checkout/App/style tests passed, and fresh full `npm run verify` passed typecheck, all `561` tests across `68` files, eslint, and prettier after the provider/create-order proof plus draft-update queue slice. Local Playwright DOM inspection at 390px and 320px mobile viewports confirmed `/cart` renders `.cart-status` with no `.cart-hero`, `/checkout` renders `.checkout-status` with no `.checkout-hero`, no page-level horizontal overflow, and `.checkout-workflow` above `.checkout-summary`; Playwright MCP measured the updated sticky grabber at `112 x 44` in a 390px checkout viewport. Existing local Chrome CDP visual QA captured the compact cart, neutral sticky summary, and expanded order-details sheet; API-backed populated-state checkpoint evidence now exists, while hosted smoke remains open before deploy-quality closure.
    - [x] Local provider/create-order focused evidence: `App.checkout-paypal-capture.test.tsx`, `App.interactions.test.tsx`, `CheckoutPage.test.tsx`, `CheckoutPage.interactions.test.tsx`, `checkoutDraftApi.test.ts`, `CartPage.test.tsx`, and `global.test.ts` passed after adding request/callback count assertions for no-method, selected PayPal, selected Pay Later, selected Card inline, recalculating readiness, failed readiness, focused upstream billing input, open mobile menu, open minicart Sheet, open sign-in dialog, expanded order-details Sheet payment, Sheet close-without-payment states, and draft-update queueing; fresh full `npm run verify` passed typecheck, all `561` tests across `68` files, lint, and format.
    - [x] API-backed visual checkpoint evidence: local API + Vite browser evidence under `/private/tmp/paypal-retail-cart-checkout-round2-api-backed-20260705/` covers `/cart` first pass at 320/390/1440, `/checkout` Delivery initial at 320/390/1440, and 390px checkout billing-active, shipping-method-visible, payment-ready/no-method, selected PayPal, expanded order-details, collapsed-again, selected Pay Later, selected Pay Later with mobile menu/minicart/sign-in overlays, selected Card, and focused billing input states. `metrics.json` records zero page-level horizontal overflow, zero create-order requests before provider activation for the recorded 390px states, a `112 x 44` sticky grabber, and a `390 x 44` expanded `Close order details` handle; the overlay rows record no checkout sticky summary while those overlays are open. Follow-up review found the checkpoint still had route-noise console errors, including `Homepage products load failed`, and page-level `providerCount` was ambiguous without surface buckets.
    - [x] Focused API-backed provider/discount/sticky rerun evidence: the refreshed `/private/tmp/paypal-retail-cart-checkout-round2-api-backed-20260705/metrics.json` now seeds through `/cart`, removes the homepage route-noise console error, records surface-scoped provider buckets (`checkoutSticky`, `orderSheet`, `inlineCard`, `minicart`, `messageOnly`, `other`), records payment-method attribution from create-order request bodies, records browser callback metrics from the app's SDK callback `console.info` logs, applies real backend promo evaluation/apply for seeded `BUNDLE8`, and records selected `AUTO10 + BUNDLE8` as `-$8.55 promo (AUTO10 + BUNDLE8)` in the sticky summary, order summary, and expanded order-details Sheet. Selected PayPal browser activation creates exactly one `paypal` delivery create-order request delta and one PayPal callback delta; selected Pay Later browser activation creates exactly one `paylater` delivery create-order request delta and one Pay Later callback delta; blocked/no-method/card/overlay/focused-input rows stay at zero request/callback deltas. The latest sticky-clearance rerun records `stickyOverlapTargets[].occludedByStickyCount === 0` for the recorded selected Card inline form, focused billing street input, provider buttons/messages, Sheet controls, footer content, validation errors, mobile menu controls, minicart controls, sign-in dialog controls, and order-details controls. The 2026-07-06 Pay Later timeout telemetry fix closes the selected Pay Later warning-triage item by reporting expected timeout fallback as structured `console.info` instead of `console.warn`; real SDK/fetch/content-application failures still log as errors. Remaining deploy-quality closure still requires hosted smoke, helper-owned recalculation/failure visual rows, and hosted/required-state sticky/fixed overlap proof.
- [x] Refresh category product surface to the approved reference level: compact filter/sort controls, visible applied filters, dense image-led cards, sticker-like status labels, clear current/regular price, release state, pickup availability, and official amount-free Pay Later message slot.
- [x] Add supported category density refinements: remove the `All products` explanatory subtitle from runtime, lazy-load product-card images, show a top-right `Sale` badge for marked-down products, and render the official Pay Later message directly without wrapper-card chrome.
- [x] Refresh PDP product surface to the approved detailed reference level for the supported V1 data model: breadcrumb, vertical desktop thumbnail rail where multiple images exist, large stable gallery image, status/vendor/real-review row, truthful chips, concise description, dense product fact grid, right-side purchase/preorder rail, price-linked official Pay Later message, secured PayPal express frame, wired action controls only, trust grid, semantic detail tabs, and real-data-only review/recommendation rails. Richer final media coverage remains tracked separately.
- [x] Add the supported PDP detailed structure: breadcrumb, status/review row, desktop-capable gallery stage, purchase/trust grid, direct official Pay Later message under price, secured PayPal express frame, and semantic detail tabs without duplicate purchase-status panel, fake recommendation rails, fake preorder economics, fake rewards, or unsupported wishlist/quantity behavior.
- [x] Add the supported blind-box PDP commerce and merchandising layer: wired Random 1PC / Whole Box purchase options, whole-box amount-aware Pay Later updates, cart quantity creation for API-loaded PDP products, demo-safe scarcity/viewing prompt, story/spec/lineup/social-proof sections, You may also like rail from existing generated catalog assets, container-responsive PayPal/Pay Later frame sizing, and no text-only media placeholder cards in the PDP viewport.
- [x] Align category sidebar secondary filter metadata with API-supported live filters so counts and route query state do not advertise unsupported `series` behavior.
- [x] Refresh mobile category layout so filters collapse into a compact filter/sort entry and product cards appear in the first mobile browsing pass.
- [x] Refresh mobile PDP hierarchy so collectible inspection stays image-led while title, price, and primary purchase action are reachable without excessive first-pass scrolling.
- [x] Refresh mobile cart layout so item rows become vertical cards, totals and checkout remain reachable, and no wide table causes horizontal page scroll.
- [x] Refresh mobile minicart layout so the drawer/sheet separates from page content, item list scrolls independently, and sticky actions do not crowd PayPal/Pay Later surfaces.
- [x] Refresh mobile checkout/account forms so labels, required states, input types/inputmodes/autocomplete, validation, submit feedback, and terms controls remain visible and touch-friendly.
- [x] Refresh cart, minicart, and checkout accents so the brand feels playful while PayPal official surfaces remain stable, readable, and visually undistorted.
- [x] Add the supported cart/minicart payment-frame recovery: official PayPal/Pay Later delivery express actions sit in the shared `Secured by PayPal` frame, SDK custom elements have stable 44px+ render boxes, eligible desktop/tablet layouts show PayPal and Pay Later side by side, narrow/mobile layouts stack them, empty cart/minicart states hide checkout and payment controls, and cart/minicart quantity steppers meet mobile touch-target sizing.
- [x] Refresh cart summary hierarchy so promo/tax/shipping placeholders, total, Pay Later messaging, and checkout action are scannable on desktop and reachable in the first mobile cart-summary pass.
- [x] Refresh cart and minicart express pending states so PayPal and Pay Later SDK loading/unavailable slots are method-labeled or consolidated instead of rendering duplicated "cart is refreshing" copy.
- [x] Refresh minicart drawer hierarchy and mobile density so the panel clearly separates from background content, prioritizes Checkout, keeps View cart secondary, and prevents Pay Later/express/pickup copy from crowding the action area.
- [x] Refresh checkout empty/payment-pending states so blank placeholders explain what unlocks them, mobile order context remains visible, and long forms do not hide the next action.
- [x] Refresh checkout to the approved reference level: secure-checkout breadcrumb/header, left-side step cards, right-side order summary with item thumbnails/totals, supported auto-offer/payment controls, and bottom trust strip.
- [x] Refresh captured Express Review/order confirmation to the approved reference level: success hierarchy, buyer-safe order number, confirmation/status note, order details grid, next actions, optional real-data recommendations, and guest save-order prompt.
- [x] Refresh Account/sign-up surfaces to the approved reference level: split product-art/benefits and form composition, tabbed sign-up/login where applicable, visible terms acceptance, and no fake social-auth behavior.
- [x] Refresh Pickup store cards as compact store-ticket surfaces with address, phone, distance, available/unavailable counts, and partial-inventory notes.
- [x] Generate first-pass original primary toy images for all 25 seeded POP MART-profile products under `web/public/assets/popmart/products/`, using POP MART GB as high-level merchandising reference only.
- [ ] Generate remaining product-gallery coverage to reach 3-4 images per seeded POP MART-profile product before the final customer demo; current runtime intentionally uses one existing primary image per toy.
- [ ] Generate real blind-box PDP media assets for multi-angle images, package exterior, hidden silhouette, and material-detail short video; until those assets exist, keep the slot plan in docs/tracking and omit placeholder media cards from runtime PDP UI.
- [x] Wire generated product images into seeded/runtime catalog image paths, resolving the `.webp` versus `.png` extension gap and `/popmart` versus `/assets/popmart` path convention for POP MART product images and seeded order item snapshots.
- [x] Wire generated catalog images into API-backed category, direct PDP, cart, and minicart runtime views, including cart metadata reconciliation for generated image paths, product names, links, alt text, and prices.
- [x] Replace static homepage fixture merchandising with generated API-backed catalog imagery, either by enriching the home API response with product-card payloads or by fetching the relevant catalog products for home sections.
- [x] Clean the homepage default/Vite-only fallback merchandising so API-unavailable screenshots use generated PNG product assets and category-backed links instead of old Labubu/Hirono/Skullpanda SVG fixtures.
- [x] Clean the Category/PLP default/Vite-only fallback merchandising so API-unavailable screenshots show generated PNG product assets, supported category query filtering still applies, and generated fallback product links resolve to generated PDP fallback records instead of not-found.
- [x] Reconcile initial checkout summary with the active restored cart/draft so checkout does not show old fixture totals before the buyer submits a draft step.
- [x] Add pending-state handling for API-backed direct PDP routes so the product detail page does not flash not-found before live catalog data resolves.
- [x] Remove fixture-first image flashes from live buyer routes so Home, Category, PDP, Cart, Checkout, and hidden minicart do not mount old Labubu/Hirono/Skullpanda SVG assets before API-backed generated PNG data resolves.
- [x] Render official PayPal Pay Later message components on Category, PDP, Cart, and Minicart surfaces instead of only local static Pay Later copy, while keeping graceful static fallback copy for SDK/config failures.
- [x] Remove decorative wrapper boxes around official Pay Later message surfaces on Category, PDP, Cart, and Minicart so the PayPal message renders directly in the relevant price/summary flow.
- [x] Close the storefront polish regression pass from hosted/live GUI QA: Home now has an official amount-free Pay Later message slot, PDP shadcn tabs constrain the root/list to the mobile card width with horizontal-only scrolling and no visible vertical scrollbar, PDP review/social-proof cards expose stable review-card markers, Home release calendar content stays below the sticky header stacking layer, and route product-loading states use shadcn `Skeleton` blocks.
- [x] Keep storefront Pay Later fallback copy out of the rendered subtree when official PayPal message content applies; fallback copy remains for SDK config loading/error states and PayPal presentment-content failures.
- [x] Add shadcn-style skeleton treatment for the initial home hero placeholder and lazy-load secondary product imagery so loading states no longer rely only on full-size eager image replacement.
- [x] Generate and wire low-resolution image derivatives for final product media so image containers can quick-fill with LQIP sources and replace with high-quality assets after load.
- [x] Resolve PayPal line-item PDP URLs and image URLs to HTTPS public absolute URLs before building provider payloads, and omit local HTTP URL/image fields in local sandbox mode.
- [x] Fix cart PayPal delivery express create-order reliability: preserve/recover paired guest cart bindings, align PayPal/cart guest-secret hashing, omit local HTTP PayPal callback/item URLs, and verify the cart PayPal button opens the sandbox approval modal.
- [x] Fix repeated cart PayPal delivery express create-order retries after a pending provider order exists: cart-scoped lookup uses the latest express order only, excludes checkout-draft orders, and generates suffixed PayPal invoice/request metadata after a prior PayPal order ID has been recorded.
- [x] Complete the full cart PayPal approval and capture sandbox pass after a sandbox buyer login/session is available; 2026-06-24 browser QA completed sandbox buyer approval, merchant Review and Confirm, PayPal capture, paid-order persistence, capture snapshot creation, and cart clearing for order `DO-20260624-000001` / PayPal order `5YR26262S4472494N`.
- [x] Add the checkout PayPal/Pay Later approval bridge so standalone checkout SDK approvals call App-level pending-review loading, backend capture, confirmation rendering, and cart reload handlers; focused component/App tests cover the bridge.
- [x] Add the checkout Card Fields approval bridge so successful hosted-card submits call App-level pending-review loading, backend capture, confirmation rendering, and cart reload handlers; focused component tests cover PayPal order/session handoff plus visible card failure notices.
- [x] Re-run delivery-checkout PayPal sandbox capture after PayPal-side approval/session state is usable; 2026-06-24 Playwright GUI completed checkout PayPal approval/capture for order `DO-20260624-000004`, PayPal order `6GK84058A01890038`, payment session `66f7e2bd-87bc-43b8-9398-d5a9e6664f0b`, capture `5VE76310HS283401C`, with amount guard matched and cart cleared.
- [x] Complete hosted HTTPS checkout Pay Later Pay in 4 sandbox approval/capture; 2026-06-25 Playwright GUI completed checkout Pay Later eligibility at `$154.39`, Pay in 4 approval/application, final Pay in 4 confirmation, merchant capture, confirmation rendering, Pay Later payment-method display, capture `8AG36137NP271803X`, and cart clearing for order `DO-20260625-000004`.
- [ ] Complete hosted HTTPS checkout Card Fields sandbox approval/capture after explicit action-time approval to submit public PayPal sandbox card data; verify confirmation rendering, card payment-method display, capture ID, and cart clearing.
- [x] Polish the checkout selected-payment primary action so choosing PayPal or Pay Later never leaves an ambiguous standalone `Continue` button; desktop/tablet show the selected official provider surface in Order Summary, while mobile replaces the sticky continue action with the selected official PayPal/Pay Later surface and renders the official Pay Later message below Pay Later.
- [x] Fix the follow-up checkout/minicart regressions from GUI review: suppress inline Pickup store cards while the store-picker modal is open, keep the mini-cart `Checkout` and `View cart` actions visually framed in the portaled Sheet, use the visible black Apple Pay logo in checkout payment rows, and route storefront plus checkout Pay Later message placements through the managed official content fetch/apply path with buyer-safe fallback behavior.
- [x] Optimize checkout draft recalculation after the shipping/billing submit UX review: reuse already-loaded cart rows and delivery shipping options, parallelize delivery/pickup draft response assembly, and keep the duplicate-read regression covered in repository tests.
- [x] Fix PDP Add to cart server persistence regression so product-page additions POST to `/api/cart/items`, persist the returned cart binding, and survive checkout navigation/reload without manual cart seeding.
- [x] Review generated product media for IP distance, visual consistency, descriptive alt text, and customer-demo suitability.
- [x] Accept the current generated POP MART-leaning primary images for this Popmart-specific demo version; separate generic/non-Popmart audience demos must use their own safer asset set.
- [x] Run responsive visual QA at 320px, 375px, 414px, 768px, 1024px, and 1440px.
- [x] Verify no horizontal page scroll on Home, Category, PDP, Cart, Minicart, Checkout, Order Confirmation, and Account/sign-up at mobile widths.
- [x] Verify mobile Category/PLP sort/filter controls do not clip at 320-375px, filter sheet options have clear touch affordance/selected state, and disabled wishlist controls expose a buyer-readable reason.
- [x] Verify sticky header and sticky bottom payment bar do not cover content.
- [x] Verify checkout forms announce errors and move focus predictably.
- [x] Verify release calendar, promo, inventory, and lifecycle states do not rely on color alone.
- [x] Verify PayPal buttons/messages render without major layout shift.
- [x] Lock PayPal and Pay Later one-time buyer actions to modal presentation for local sales-demo reliability, with regression coverage for checkout and delivery express surfaces.
- [x] Add structured frontend/backend PayPal create-order diagnostics for PDP/cart/minicart/checkout troubleshooting, while logging only safe IDs/stage/amount context and booleans for secrets.
- [x] Verify POP MART mode is playful premium collectible retail, not a generic white/red ecommerce shell and not the generic profile's blue/amber/cream treatment.
- [x] Verify visual accents stay controlled: no childish clutter, no heavy glassmorphism, no decorative orbs, no page-wide rainbow effect, and product imagery remains the hero.
- [x] Verify POP MART asset quality remains demo-acceptable in-context; defer replacement workflow unless new Popmart/audience criteria require it.
- [x] Verify generic MochiToy profile assets are public-safe.
- [x] Update runbook with exact commands.
- [x] Update tracking files and promote reusable learnings.

Verification:

- `scripts/check-agent-system.sh` passes.
- Demo starts locally from documented commands.
- Core Delivery and Pickup flows complete in sandbox where eligible.
- Admin Portal can explain payment/order/debug state during a live presentation.

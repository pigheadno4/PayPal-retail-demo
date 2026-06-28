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

- Use `docs/superpowers/plans/2026-06-18-popmart-reference-polish.md` before coding Home/Category/PDP/Cart/Minicart/Checkout/Order Confirmation/Account polish.
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
- [ ] Apply the Homepage Reference Polish V4 guidance from `DESIGN.md`: reduce homepage dark visual mass, deepen release-calendar discovery, improve footer/newsletter commercial depth, preserve real search, keep lighter typography, and close the slice only with GUI evidence at the required desktop/tablet/mobile widths.
  - [x] V4 pre-implementation review: run a read-only homepage audit with Computer Use/Playwright plus `ui-ux-pro-max` guidance, optionally using an independent sub-agent for checklist coverage, then reconcile findings back into `tracking/todos.md` and `tracking/test-cases.md` before runtime edits.
  - [x] V4 shell/tokens: rebalance utility/header/nav/footer colors so deep navy is an accent instead of a large uninterrupted frame; keep POP MART red/pink/yellow/mint/sky accents for badges, active states, and compact CTAs.
  - [x] V4 utility/header/nav: keep the real `/products?q=...` search form typeable and focusable, refine desktop header/action density, keep mobile logo/search/account/cart/menu compact, and keep category/support navigation in the shadcn mobile `Sheet`.
  - [x] V4 hero/trust: preserve the image-led clickable hero while reducing surrounding chrome; keep four compact buyer-facing trust cards with only implemented/demo-backed capabilities.
  - [x] V4 release calendar desktop/tablet: make date selection update selected state, visible event details, and the adjacent product shelf; 1280px keeps the full desktop calendar, 1024px and below use a compact collapsible calendar, and desktop/tablet/mobile interaction paths now drive release discovery without page-level horizontal overflow.
    - [x] Replace the oversized desktop explanatory details block with compact event/date chips, a compact selected-release card, and color-independent legend copy.
    - [x] Wire release-date selection to update visible selected state, event details, selected-date `aria-live` feedback, and adjacent product shelf content.
  - [x] V4 release calendar mobile: default to compact agenda/date chips plus product cards, move the full month calendar behind shadcn `Sheet`, `Dialog`, `Accordion`, or `Collapsible`, and keep touch targets at 44px+ without page-level horizontal scroll.
  - [x] V4 merchandise modules: tighten product cards, category rail, promo banners, and popular series with shadcn `Card`/`Badge`/`ScrollArea` composition, stable media boxes, readable labels, and supported CTA behavior.
  - [ ] V4 Pay Later/footer/loading: keep direct official Pay Later message rendering after merchandising, add buyer-safe timeout fallback without layout jump, split footer into light newsletter band plus shorter navy base, and use shadcn `Skeleton`/image placeholders for loading states.
    - [x] Split the footer into a light collector-updates band with retail actions and a shorter navy footer base, and verify the shell/footer visual-mass reduction at desktop and mobile widths without page-level horizontal overflow.
    - [x] Move the Home Pay Later surface after the merchandising modules so it no longer interrupts product discovery before categories, promo cards, and popular-series rails.
  - [x] V4 typography refinement: lower non-hero section/product heading weights from 900 toward the V4 650-800 range while preserving the already-fixed real search and lighter shell controls.
  - [ ] V4 verification gate: run focused tests plus GUI/browser checks at 1440, 1280, 1024, 768, 390, and 320 widths, then update `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` before claiming completion.
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

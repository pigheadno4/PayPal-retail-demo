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
- [ ] Review `PAYPAL_EVIDENCE.md` against final PayPal sandbox account capabilities.
- [x] Confirm Apple Pay/Google Pay local testing remains eligibility/debug/manual locally, with hosted preview or approved HTTPS tunnel for full wallet verification later.
- [x] Confirm POP MART asset handoff path and filename convention.
- [ ] Convert the env variable shape in `ENVIRONMENT.md` into `.env.example` during scaffold.
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
- [ ] Implement amount consistency guard.
- [ ] Implement sanitized PayPal snapshot storage shape.

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
- [ ] Build Express app shell and health endpoint.
- [ ] Add env validation.
- [ ] Add Supabase server client.
- [ ] Add buyer auth middleware.
- [ ] Add guest cart middleware.
- [ ] Add admin passcode session middleware.
- [ ] Add error response format and sanitized debug logger.

Verification:
- API smoke tests cover success and error shapes.
- Server refuses to start when required server env vars are missing.
- Debug logs do not include secrets or access tokens.

## Milestone 6: Catalog, Cart, Checkout Draft APIs
- [ ] Implement storefront config, homepage, categories, product list, PDP, and release events APIs.
- [ ] Implement Admin profile/market switch API and active config refresh behavior.
- [ ] Implement cart create/read/add/update/delete/merge/refresh APIs.
- [ ] Implement checkout draft create/update APIs for Delivery and Pickup tabs.
- [ ] Implement promo evaluate/apply/remove APIs.
- [ ] Implement guest order lookup API.

Verification:
- API tests cover released/unreleased PDP behavior.
- API tests cover market-scoped catalog prices and profile/market switch config.
- API tests cover guest cart local ID/secret behavior.
- API tests cover logged-in cart refresh and merge.
- API tests cover Delivery and Pickup checkout draft recalculation.

## Milestone 7: PayPal And Payment APIs
- [ ] Implement PayPal auth/client wrapper.
- [ ] Implement PayPal SDK config API.
- [ ] Implement PayPal client token API.
- [ ] Implement delivery order create API.
- [ ] Implement express delivery order create API.
- [ ] Implement BOPIS order create API.
- [ ] Implement PayPal shipping callback API for express delivery.
- [ ] Implement capture API with amount consistency guard.
- [ ] Implement webhook verification and processing.
- [ ] Implement saved payment active/pending/delete flows.

Verification:
- API tests cover payload builders through route calls.
- Webhook tests reject invalid verification.
- Capture tests update order, inventory, cart, payment session, and lifecycle events.

## Milestone 8: Web App Shell And Design System
- [ ] Build React app shell and routing.
- [ ] Add POP MART-style design tokens and responsive layout primitives.
- [ ] Add generic MochiToy visual tokens separately so POP MART mode does not inherit the generic blue/amber/cream direction.
- [ ] Add accessibility primitives for focus-visible states, alert regions, form errors, and reduced-motion support.
- [ ] Add profile-aware asset resolver.
- [ ] Add market-aware config provider that remounts only the PayPal payment subtree when `provider_key` changes.
- [ ] Add API client and state providers.
- [ ] Add auth modal shell.
- [ ] Add minicart shell.

Verification:
- App loads with no console errors.
- Mobile and desktop shells do not overlap content.
- `/admin` is reachable only by manual route entry and is not linked from buyer UI.
- Market switch refreshes app config/catalog/cart without a whole-app route reset.

## Milestone 9: Storefront And Catalog UI
- [ ] Build homepage hero, hot sales, categories, release calendar, Pay Later promo, promo cards, popular series, and footer.
- [ ] Build release calendar legend and color-independent release state labels.
- [ ] Build category filters.
- [ ] Build PDP gallery, product status, product details, price display, Pay Later message placement, add-to-cart, express buttons, and reviews.
- [ ] Block unreleased product checkout actions and hide reviews.

Verification:
- Calendar release dates render as outlined/unfilled circles.
- Calendar release state is understandable without relying on color alone.
- PDP image switching works with 3-4 images.
- PDP has no pickup hint.
- Homepage/category Pay Later promo has no amount.

## Milestone 10: Cart And Minicart UI
- [ ] Build minicart with item summary, Pay Later amount message, checkout/view-cart actions, PayPal/Pay Later delivery express, and pickup hint text.
- [ ] Build full cart with quantity editing, Pay Later amount message, checkout action, PayPal/Pay Later delivery express, and pickup hint text.
- [ ] Keep pickup hints as text only, no pickup button.

Verification:
- Cart/minicart express creates delivery-only payment sessions.
- Pickup hint appears in cart/minicart and not PDP.
- Quantity changes refresh Pay Later amount-aware messages.

## Milestone 11: Checkout UI
- [ ] Build `/checkout` with Delivery/Pickup tabs and preserved tab state.
- [ ] Build Delivery accordion: shipping address, billing address, shipping option, payment.
- [ ] Build Pickup accordion: ZIP/default location, store selection, billing address, pickup date, payment.
- [ ] Build checkout step states: idle, saving, saved/collapsed, editing, recalculating totals, blocked/error, and locked.
- [ ] Build focus movement and announced errors for checkout form validation.
- [ ] Build partial pickup store card counts before store submit.
- [ ] Build Order Summary with promo evaluation, ready/unavailable pickup item split, and selected payment action slot.
- [ ] Build mobile sticky payment action for selected non-card methods.

Verification:
- Buyer can switch tabs before payment session starts.
- Fulfillment mode locks after payment session starts.
- Pickup partial inventory excludes unavailable items from payment amount but leaves them in cart.
- Sticky payment bar does not cover checkout content.
- Card payment stays inside the expanded card fields box on mobile and desktop.

## Milestone 12: Payment UI Integration
- [ ] Integrate PayPal SDK v6 provider/loading.
- [ ] Pass currency, locale, buyer country, Pay Later buyer country, and sandbox test buyer country from backend config into the SDK v6 integration.
- [ ] Verify the installed `@paypal/react-paypal-js` v9 / SDK v6 types still include `testBuyerCountry` before wiring the provider.
- [ ] Map backend `sandbox_test_buyer_country` to SDK v6 `createInstance({ testBuyerCountry })` for sandbox/test environments only.
- [ ] Render PayPal standalone button when PayPal radio is selected.
- [ ] Render Pay Later message in Pay Later radio row and Pay Later button/message under Order Summary when selected.
- [ ] Render card fields expanded in the payment step with save checkbox inside card box.
- [ ] Render Apple Pay, Google Pay, and Venmo buttons only when eligible.
- [ ] Reserve layout space for PayPal buttons and Pay Later messages to avoid major layout shift.
- [ ] Render save-for-future checkbox only for logged-in eligible buyers and supported methods.

Verification:
- PayPal sandbox renders and captures for Delivery.
- Sandbox market tests prove the configured test buyer country affects eligibility/message behavior.
- SDK v6 create-instance options receive `testBuyerCountry` in sandbox/test and omit it in production.
- Pay Later renders where eligible.
- Card fields render and submit.
- Apple Pay/Google Pay/Venmo eligibility behavior is visible in debug/Admin.

## Milestone 13: Express Review And Confirm
- [ ] Build express Review and Confirm route/page.
- [ ] Show synchronized PayPal shipping callback totals.
- [ ] Show final item, shipping, promo, tax, and total snapshot.
- [ ] Capture only when buyer confirms.
- [ ] Block capture if amount consistency guard fails.

Verification:
- PDP/cart/minicart express returns to merchant Review and Confirm.
- Full checkout does not add a separate Review and Confirm page.

## Milestone 14: Account, Guest, Reviews
- [ ] Implement email-first login/register modal.
- [ ] Implement account settings profile info.
- [ ] Implement address book with default delete constraints.
- [ ] Implement saved payment list/delete.
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
- [ ] Run manual PayPal sandbox checklist.
- [ ] Run responsive visual QA at 375px, 768px, 1024px, and 1440px.
- [ ] Verify sticky header and sticky bottom payment bar do not cover content.
- [ ] Verify checkout forms announce errors and move focus predictably.
- [ ] Verify release calendar, promo, inventory, and lifecycle states do not rely on color alone.
- [ ] Verify PayPal buttons/messages render without major layout shift.
- [ ] Verify POP MART mode does not inherit generic profile colors or visual treatment.
- [ ] Verify POP MART asset quality and replace weak images.
- [ ] Verify generic MochiToy profile assets are public-safe.
- [ ] Update runbook with exact commands.
- [ ] Update tracking files and promote reusable learnings.

Verification:
- `scripts/check-agent-system.sh` passes.
- Demo starts locally from documented commands.
- Core Delivery and Pickup flows complete in sandbox where eligible.
- Admin Portal can explain payment/order/debug state during a live presentation.

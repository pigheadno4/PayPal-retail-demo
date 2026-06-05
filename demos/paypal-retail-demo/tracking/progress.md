# Progress

## 2026-05-26

- Brainstormed and approved the flagship PayPal retail demo direction.
- Selected demo folder name: `paypal-retail-demo`.
- Confirmed default POP MART profile and reusable MochiToy Studio profile.
- Confirmed Vite React frontend, Node.js Express backend, Supabase Auth/database, local assets, PayPal JS SDK v6/npm v9.x.
- Created initial protocol documentation and tracking structure.
- Verified the initial files exist, contain no placeholder markers, and pass `scripts/check-agent-system.sh`.
- Corrected BOPIS planning docs: v1 uses capture-at-checkout with specific Create Order pickup parameters, not the authorize-at-pickup guide.
- Added `DATA_MODEL.md` with Supabase schema, profile scoping, snapshots, inventory, promo/tax/shipping, and seed plan.
- Added `API_CONTRACT.md` with Express route draft, PayPal payload contracts, cart/checkout/payment rules, and Admin API scope.
- Updated planning todos and test cases for the data/API contract review gate.
- Added `IMPLEMENTATION_TASKS.md` with planned file structure, milestone sequencing, TDD gates, and QA milestones.
- Refined PayPal API contract for SDK config/client token split, DO/PO order numbers, duplicate-safe PayPal invoice IDs, idempotency keys, and detailed line-item payloads.
- Refined market-switch planning: markets now carry currency, locale, buyer country, Pay Later buyer country, sandbox test buyer country, component set, and provider key behavior; carts/prices/pending orders are market-scoped.
- Confirmed from local `wiki-v2` PayPal JS SDK v6 type snapshot that sandbox buyer simulation maps to `createInstance({ testBuyerCountry })`; updated docs and tests to use backend `sandbox_test_buyer_country` as the stored/API field.
- Filled schema gaps for guest order lookup, promo region/product scoping, and total snapshots; moved SDK `testBuyerCountry` frontend mapping from PayPal payload-builder milestone to payment UI milestone.
- Added `ENVIRONMENT.md` with local tool probe, Supabase/PayPal environment strategy, secret boundaries, wallet testing approach, and initial env variable shape.
- Added `PAYPAL_EVIDENCE.md` to map each planned PayPal capability to local `wiki-v2` source pages and distinguish PayPal-confirmed behavior from demo-specific BOPIS receiver-name convention.
- Refined data model after database review: shared market/store/tax/shipping reference data, profile-scoped inventory/promos, checkout-capable total snapshots, promo explanation rows, and explicit constraint/index expectations.
- Locked the implementation language to TypeScript across web, server, shared modules, tests, and seed tooling.
- Folded UI/UX review findings into the design and execution docs: POP MART visual contract, checkout states, mobile sticky payment rules, accessibility requirements, Admin information architecture, and visual QA gates.
- Added `PLAN.md` as the active Superpowers-style execution router, with `IMPLEMENTATION_TASKS.md` as the canonical detailed implementation plan.
- Closed Milestone 0 decision gates for Supabase, PayPal env handling, strict TypeScript scaffold, Apple Pay/Google Pay local testing, and POP MART asset naming.
- Completed Milestone 1 scaffold: demo-level npm workspace, strict TypeScript project references, Vite React app shell, Express server shell, shared module/test smoke suite, Supabase seed folder, lint/test/typecheck scripts, `.env.example`, and README runbook stub.
- Installed dependencies and generated `package-lock.json`. Local install resolved `@paypal/react-paypal-js@9.2.0` with transitive `@paypal/paypal-js@9.7.0`.
- Verified installed PayPal SDK v6 types include `CreateInstanceOptions.testBuyerCountry?: string`, matching the sandbox buyer-country planning requirement.
- Verified Milestone 1 commands: `npm run typecheck`, `npm test`, `npm run lint`, and `npm run format:check`.
- Added local Supabase CLI tooling as a demo dev dependency and initialized `supabase/config.toml`.
- Created the first Supabase migration through `npx supabase migration new init_app_schema`.
- Drafted the private `app` schema migration with 38 app tables, RLS enabled on every app table, service-role-only grants, profile/market scoping constraints, promo explanation rows, total snapshots, PayPal invoice/webhook uniqueness, and comments for tax/shipping/inventory demo assumptions.
- Local migration apply is not yet verified because Docker Desktop/daemon is unavailable in this environment.
- Linked a remote Supabase project and applied the initial schema migration with `npx supabase db push --linked`.
- Added and applied a follow-up hardening migration for function search paths and public execution grants after Supabase advisors flagged security warnings.
- Verified the linked remote database reports 38 `app` tables and `npx supabase db advisors --linked` returns no issues.
- Added deterministic TypeScript seed tooling for storefront/reference data with dry-run summary, SQL generation, linked apply, and local apply modes.
- Added first seed dataset for 2 profiles, 2 markets, 5 categories/profile, 25 products/profile, active market prices, 9 stores/market, store pickup dates, central/store inventory, tax rates, shipping options, homepage sections, release events, and promo rules/compatibility data.
- Verified seed tooling with `npm run verify` and applied the storefront/reference seed slice to the linked remote Supabase project.
- Verified linked remote seed counts match the generated summary for profiles, markets, categories, products, product prices, product images, stores, pickup dates, inventory, tax, shipping, and promo tables.
- Added guarded buyer/account/order seed data: 5 demo auth users, auth identities, user profiles, default addresses, saved payment placeholders, active carts, pending delivery/pickup orders, completed delivery/pickup orders, guest lookup data, payment sessions, total snapshots, PayPal snapshots, lifecycle events, webhooks, and reviews.
- Verified the guarded seed slice with tests, applied it to the linked remote Supabase project, and confirmed linked remote counts match the generated summary for auth, account, cart, order, payment, webhook, and review tables.
- Started Milestone 3 deterministic domain logic with TDD for shared money helpers, US/GB market config/provider keys, DO/PO order-number generation, and PayPal invoice attempt suffixes.
- Added shared catalog helpers with TDD for market-scoped active product price lookup, sale/current price normalization, product purchase state, and outlined release calendar entries.
- Added shared promo, tax, and shipping helpers with TDD for best compatible promo-set recommendation, region/product promo scopes, tax after promo excluding shipping, and cheapest eligible shipping defaults.
- Added shared BOPIS inventory helpers with TDD for Haversine store distance ranking, full-inventory fallback store selection, and partial pickup ready/unavailable item splits.
- Added shared cart lifecycle helpers with TDD for guest-to-user cart merge, stale-cart refresh triggers, canonical quantity/price refresh, checkout blockers, and browser cart binding shape.
- Added shared market switch planner with TDD for Admin profile/market switches, cart binding reset, fetch-or-create cart actions, config/catalog/cart/PayPal SDK refresh targets, preserved business resources, and no cart currency conversion.
- Added shared pending order resume planner with TDD for locked order market/config snapshots, order item price snapshots, resume revalidation actions, expired/invalid payment-session replacement, stable buyer-facing order numbers, fresh PayPal invoice IDs, and pickup-date rebooking.
- Added shared order status transition helpers with TDD for payment capture, delivery manual lifecycle, pickup manual lifecycle, timeline event plans, cross-fulfillment blocking, and terminal-state blocking.
- Synchronized tracking after Milestone 3 completion and queued Milestone 4 PayPal payload/config helpers as the next active implementation stage.
- Added the first Milestone 4 PayPal helper with TDD: full-checkout Delivery Create Order payload builder using `CAPTURE`, merchant-provided shipping address semantics, detailed physical-goods line items, item/shipping/tax/discount breakdown, and minor-unit amount reconciliation.
- Added the express Delivery PayPal Create Order payload builder with TDD: `GET_FROM_FILE`, server-side shipping callback config, default `SHIPPING_ADDRESS` subscription, optional `SHIPPING_OPTIONS`, detailed physical-goods line items, and no locked merchant shipping address.
- Added the BOPIS PayPal Create Order payload builder with TDD: `CAPTURE`, `SET_PROVIDED_ADDRESS`, selected pickup store address, `shipping.type: PICKUP_IN_STORE`, receiver name `s2s ${storeName}`, detailed physical-goods line items, and BOPIS amount breakdown without shipping fee.
- Added the PayPal SDK config response builder with TDD: browser-safe client ID, sandbox/production SDK URL, market currency/locale/buyer-country fields, sandbox-only test buyer country, normalized components, deterministic provider key, and vaulting `needs_client_token`.
- Added the PayPal client-token request planner with TDD: standard flows skip token generation, guest vaulting rejects with `GUEST_VAULTING_NOT_ALLOWED`, logged-in card/PayPal vaulting can generate a normalized OAuth client-token request, and unsupported methods/domains are rejected before server-side PayPal calls.
- Added the PayPal request metadata planner with TDD: first attempts generate fresh request IDs and base invoice IDs, same-payload retries reuse the prior `PayPal-Request-Id`, changed payloads generate fresh request IDs, and fresh attempts use suffixed invoice IDs.
- Added PayPal line-item tax allocation and amount consistency guard prep with TDD: aggregate order-line tax can become per-unit PayPal `items[].tax`, uneven cents split a same-product PayPal line into grouped quantities, mismatched line tax is blocked before PayPal calls, and payload amount consistency returns structured mismatch reasons.
- Added the PayPal payment method mapper with TDD: maps PayPal, Pay Later, card, Apple Pay, Google Pay, and Venmo to SDK components/session methods/UI surfaces, hides runtime-ineligible rows, keeps card inside the card box, enforces Venmo US/USD scope, and returns hidden-method reasons for debug/Admin use.
- Added the PayPal vault attribute planner with TDD: emits PayPal/card save-for-future attributes only for authenticated opt-in buyers, includes card customer/3DS attributes when a PayPal customer ID exists, omits attributes when not requested, and rejects guest or unsupported-method vault requests before PayPal calls.
- Added the PayPal capture amount guard with TDD: extracts provider amount snapshots from PayPal purchase units, compares them with locked merchant snapshots, blocks capture on amount/currency mismatches, and allows only configured rounding tolerance.
- Added the sanitized PayPal snapshot storage helper with TDD: builds the `paypal_order_snapshots` row shape, preserves explainable item-level request/response details, stores merchant amount snapshots, and redacts tokens, client secrets, auth headers, payer email, and phone data.
- Completed Milestone 5 Express API foundation with TDD: `/api/health` success shape, standard API 404 shape, env validation, server Supabase client factory, buyer auth middleware, guest cart middleware, signed admin session guard, reusable API response helpers, and sanitized debug logger.
- Started Milestone 6 storefront APIs with TDD route contracts: `/api/config`, homepage, categories, products, PDP, and release-events routes resolve profile/market context, preserve filter inputs, return standard response envelopes, and handle missing PDP products with buyer-safe 404s.

## 2026-05-31

- Added the Supabase-backed catalog repository with TDD: profile/market config mapping, homepage sections, categories, product filters, unreleased PDP checkout/review blocking, and PDP-linked release calendar events.
- Wired the Express server startup to create a service-role Supabase client, attach the app-schema catalog data source, and serve storefront catalog APIs from real Supabase rows.
- Adjusted the server TypeScript project boundary so server code can consume shared catalog helpers while preserving strict typecheck.
- Added the Admin profile/market switch API with TDD: signed admin-session protection, profile/market ID lookup, same-shape config response, active no-query storefront config refresh, and buyer-safe missing-context errors.
- Added the cart API route surface with TDD: active cart read/create contract, add/update/delete item inputs, merge after login/register, refresh triggers, buyer auth context, guest cart binding headers, and buyer-safe validation errors. Supabase-backed cart persistence remains queued as the next slice.

## 2026-06-01

- Added the Supabase-backed cart repository with TDD: guest cart creation with hashed client-secret storage, existing guest cart verification, current-price add-to-cart with quantity caps, authenticated cart merge, stale-price refresh, and unreleased checkout blockers.
- Wired live server startup to attach buyer auth, guest cart middleware, and the Supabase cart repository so `/api/cart` uses real app-schema persistence.
- Kept merge behavior aligned with login/register cart sync by refreshing merged lines against canonical product rules before returning the authenticated cart.
- Added the checkout draft API route surface with TDD: draft create/refresh, fulfillment switching, delivery shipping/billing/shipping-option updates, pickup location/store/date updates, buyer/auth/cart context propagation, and buyer-safe validation errors. Supabase-backed checkout persistence remains queued as the next slice.
- Added the Supabase-backed checkout draft repository with TDD: verified guest-cart draft creation, draft ownership checks, delivery address persistence, cheapest eligible shipping default, tax calculation excluding shipping, pickup store/date persistence, and BOPIS ready/unavailable item split.
- Wired live server startup to attach buyer auth, guest cart middleware, and the Supabase checkout repository so `/api/checkout/drafts` uses real app-schema persistence.
- Added checkout promo evaluate/apply/remove APIs with TDD: route-level code normalization, Supabase promo rule/scope/compatibility loading, persisted promo evaluation snapshots and explanation lines, selected promo draft linking, discount-driven tax recalculation, and remove-code recalculation.
- Added guest order lookup API with TDD: `GET /api/guest-orders/:orderNumber?email=...` normalizes order number/email, returns buyer-safe not-found errors, hashes guest email for lookup, updates lookup attempt metadata, and returns read-only order details without internal IDs.
- Started Milestone 7 PayPal APIs with TDD: added the PayPal OAuth/client-token gateway, browser-safe SDK config API, authenticated-only client-token API, server wiring, and default client-token domain selection from `PUBLIC_HTTPS_ORIGIN` or `APP_BASE_URL`.
- Added PayPal create-order route/gateway boundaries with TDD: `/api/paypal/orders/delivery`, `/express-delivery`, and `/bopis` validate source input, resolve buyer/storefront context, build shared PayPal payloads, call `/v2/checkout/orders` with `PayPal-Request-Id`, record merchant/provider snapshots through a repository boundary, and preserve Delivery/Express/BOPIS payload semantics. Supabase-backed order preparation remains queued.
- Added the Supabase-backed PayPal order preparation repository with TDD: Delivery drafts create pending `DO-*` orders from finalized shipping address/shipping option/promo/tax snapshots, BOPIS drafts create pending `PO-*` orders with pickup-store address and partial-inventory payable quantities only, and express delivery creates pending Delivery orders from verified guest/auth carts with a server-side shipping callback URL.
- Wired live server startup to attach the PayPal order repository and guest cart middleware to PayPal routes, so create-order APIs can prepare payment sessions from real app-schema cart/checkout data before calling PayPal.
- Added PayPal create-order persistence: payment sessions store invoice/request IDs, method, attempt number, merchant totals, and source fingerprints; total snapshots are written for Admin debug; PayPal create-order responses update the payment session and write sanitized `paypal_order_snapshots`.
- Added PayPal express shipping callback recalculation with TDD: raw PayPal callback responses, raw PayPal decline JSON for invalid callback input, selected/default shipping option handling, tax recalculation excluding shipping, pending order/payment-session total updates, order item tax refresh, and `paypal_shipping_update` total snapshots.
- Added auto promo re-evaluation to PayPal express shipping callbacks with TDD: callback totals now use shared promo rules/scopes/compatibility, write order-scoped `promo_evaluations` and `promo_evaluation_lines`, include PayPal discount breakdown when an auto promo applies, and store the promo evaluation ID on the shipping-update total snapshot.

## 2026-06-02

- Added the PayPal capture route/gateway/repository slice with TDD: `/api/paypal/orders/:paypalOrderId/capture` prepares capture through the repository amount guard, blocks mismatches before PayPal, calls Orders capture with `PayPal-Request-Id`, and returns a standard app envelope with capture IDs/status plus the guard decision.
- Added capture finalization persistence: successful captures mark the order paid and payment session captured, write sanitized PayPal capture snapshots, write `capture` total snapshots, add lifecycle events, decrement central or pickup-store inventory, and clear only paid order items from the active cart.
- Documented the v1 capture snapshot behavior in `API_CONTRACT.md`: PayPal capture responses are stored in full after sanitization, while the guard relies on locked merchant/provider amount snapshots when the minimal capture response does not echo the original full amount breakdown.

## 2026-06-03

- Completed the pending-order resume promo wrap-up with TDD: Delivery and BOPIS create-order preparation now re-evaluates eligible auto promos when reusing a pending checkout order, writes order-scoped promo evaluation rows/lines, recalculates tax and totals from the refreshed discount, links the `pending_resume` total snapshot, and keeps the buyer-facing order number stable while fresh PayPal attempts receive the expected suffixed invoice ID.
- Completed the Milestone 7 webhook and saved-payment slice with TDD: PayPal webhook verification now calls the PayPal verification API with `PAYPAL_WEBHOOK_ID` and notification headers, invalid webhooks are stored as ignored without mutation, valid capture webhooks reconcile payment/order status, vault-created/deleted webhooks reconcile saved-payment state, authenticated capture vaulting creates active or pending saved-payment records, and account saved-payment delete calls PayPal Payment Method Tokens delete before marking local records deleted.
- Tightened the Milestone 7 webhook repository after review: PayPal webhook events are now reserved/audited before mutation and duplicate `event_id` deliveries return the stored processing result without repeating saved-payment/order updates.
- Restored the Milestone 8 web-shell WIP after merging M7: added the typed web API client, route resolver, profile asset resolver, provider-key shell state helper, buyer/admin app shell split, auth modal shell, minicart shell, and POP MART/generic responsive theme tokens.
- Finished the Milestone 8 web app shell/config foundation with TDD: added reusable accessibility primitives, skip-to-content and live-status shell affordances, reduced-motion/focus-visible CSS guards, app API/runtime providers, and a PayPal provider scope keyed only around the future payment subtree so provider-key changes do not reset the whole buyer shell.
- Started Milestone 9 storefront/catalog UI with TDD: added the homepage component, route wiring, required merchandising sections, local POP MART placeholder SVG assets, descriptive image alt text, amount-free homepage Pay Later promo, outlined release calendar dates, color-independent release labels/legend, and PDP links from selected release products.
- Continued Milestone 9 category/catalog UI with TDD: added the category page component, `/products` route wiring, typed filter/product data, "All options" category switcher, applied filter count/reset controls, disabled pickup-location hint, amount-free category Pay Later promo, responsive filter layout, and PDP links from product cards.
- Completed the Milestone 9 PDP UI slice with TDD: added the product detail component, `/products/:slug` route wiring, 3-image gallery controls, product status/details/current-versus-regular price display, amount-aware PDP Pay Later message for purchasable products, delivery express action placeholders, released-product reviews, local gallery placeholder assets, and unreleased-product checkout/review blocking.
- Completed Milestone 10 cart/minicart UI with TDD: added the shared cart model, `/cart` route, minicart item summary, full cart item rows with quantity controls, merchandise-only cart total calculation, amount-aware Pay Later cart messaging, checkout/view-cart actions, delivery-only PayPal/Pay Later express metadata, and pickup hints as text only with no pickup button.
- Started Milestone 11 checkout UI with TDD: added the checkout page component, `/checkout` route wiring, Delivery/Pickup tab shell with preserved per-mode drafts, explicit checkout step state labels, fulfillment-mode lock notice/disabled inactive tabs, mode-aware order summary, pickup ready/unavailable item split, selected-payment slot placeholder, and mobile sticky selected-payment action shell.
- Continued Milestone 11 detailed checkout accordions with TDD: added data-driven step details for delivery shipping/billing/shipping-option/payment content, pickup ZIP/default-location/store-selection/billing/pickup-date/payment content, and pickup store cards with distance, phone, available/unavailable item counts, selected state, and partial-inventory callout before store submit.

## 2026-06-05

- Completed the Milestone 11 checkout validation UI with TDD: added a typed validation state contract, assertive validation summary, field-level `aria-invalid`/described-by errors, focus-target step markup, browser focus movement to the first invalid step, and visible error/focus styling.
- Started Milestone 12 payment UI integration with TDD: added a scoped PayPal SDK v6 provider that fetches browser-safe backend SDK config, renders loading/error and SDK status regions, preserves currency/buyer-country/Pay Later buyer-country metadata for child payment surfaces, verifies the installed v9.2.0 `testBuyerCountry` type, and maps sandbox `sandbox_test_buyer_country` into `PayPalProvider` `testBuyerCountry`.

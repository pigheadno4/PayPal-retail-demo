# Learnings

Reusable implementation lessons from this demo should be added here during milestones.

## PayPal JS SDK v6 Sandbox Market Testing

- Keep market buyer country and sandbox test buyer country as separate config values.
- `buyer_country` / `paylater_buyer_country` describe buyer-facing market behavior and Pay Later messaging context.
- `sandbox_test_buyer_country` is a sandbox-only simulation knob for PayPal JS SDK v6 and should be omitted or ignored in production.
- The local `wiki-v2` PayPal JS source snapshot shows SDK v6 `CreateInstanceOptions` includes `testBuyerCountry?: string`, so the frontend should map backend `sandbox_test_buyer_country` to `createInstance({ testBuyerCountry })`.
- The installed `@paypal/react-paypal-js` v9 / `@paypal/paypal-js` v9 package types still expose `testBuyerCountry`, matching the local wiki snapshot checked during Milestone 4 SDK config work.
- Production SDK config should null `sandbox_test_buyer_country`; sandbox config should return it so the frontend can map it to SDK v6 `createInstance({ testBuyerCountry })`.

## Milestone Completion Gates

- Treat `IMPLEMENTATION_TASKS.md` as the canonical milestone checklist, and use `PLAN.md` only as the current execution router.
- A buyer-facing UI milestone is not complete just because the screen renders. Visible actions must be wired, disabled with a reason, or explicitly deferred in tracking.
- Milestone close evidence should include interaction tests or manual verification notes for the promised buyer journey, not only render tests.
- If a milestone is discovered to have shell-level gaps after being checked, add a corrective milestone instead of silently moving the plan forward.
- Multi-step UI should have a state contract or mockup that stays aligned with implementation, tests, and tracking.
- PSP or wallet UI close evidence must include browser verification of the hydrated official SDK/provider surface in every promised placement; local branded buttons and static labels are shell progress only.
- API-backed UI close evidence should include loading, success, and failure-state coverage against the backend contract, because route transitions alone do not prove recalculation or payment readiness.

## PayPal Express Delivery Shipping Callbacks

- Express delivery from PDP, minicart, or cart should keep fulfillment locked to delivery and use `shipping_preference: "GET_FROM_FILE"` so PayPal wallet shipping can drive server-side updates.
- The local `wiki-v2` shipping module source uses Orders API snake_case payload fields: `payment_source.paypal.experience_context.order_update_callback_config.callback_events` and `callback_url`.
- Default to `SHIPPING_ADDRESS` when the callback can return all eligible shipping options and amounts upfront; include `SHIPPING_OPTIONS` only when selected shipping option changes must trigger a fresh server recalculation.

## PayPal BOPIS Pickup Payload

- V1 BOPIS in this demo uses capture-at-checkout, not authorize-at-checkout/capture-at-pickup.
- The local `wiki-v2` Orders API spec confirms `purchase_units[].shipping.type` can be `PICKUP_IN_STORE`, and the shipping address is required when `shipping_preference` is `SET_PROVIDED_ADDRESS`.
- Receiver name `s2s ${storeName}` is a demo-specific contract from prior implementation experience, not a general PayPal documentation claim.

## PayPal Client Token Rules

- JS SDK v6 client token authentication is for PayPal vaulting and Fastlane; standard one-time checkout should use client ID.
- The PayPal OAuth client-token request uses `grant_type=client_credentials`, `response_type=client_token`, and `domains[]`.
- V1 demo vaulting is limited to logged-in card and PayPal methods; guests and unsupported methods are rejected before the backend calls PayPal.

## PayPal Request Idempotency Metadata

- PayPal `PayPal-Request-Id` is an idempotency key for POST/PUT requests and should be reused only for retrying the same API payload.
- Store a canonical payload fingerprint with the payment session so the backend can distinguish a true retry from a changed request.
- When a fresh PayPal order/payment session is created for the same buyer-facing order, keep the buyer-facing order number stable and suffix the PayPal `invoice_id`.

## PayPal Line-Item Tax Reconciliation

- PayPal item tax is represented as per-unit `items[].tax`; the sum of item tax times quantity must reconcile with `amount.breakdown.tax_total`.
- Demo order rows keep aggregate `line_tax_minor`, so the PayPal payload builder may split a same-product line into multiple grouped quantities when cents do not divide evenly across quantity.
- Generated payloads should treat item-level tax as all-or-none: send `items[].tax` only when every item has a line-tax allocation that reconciles exactly.

## PayPal Payment Method Mapping

- JS SDK v6 payment rows should be driven by runtime eligibility, not only static market configuration.
- Card fields are eligible through `advanced_cards` and should stay inside the card-fields box instead of using the Order Summary/sticky-button placement.
- Pay Later needs both eligibility and method details such as product/country before rendering its official button.
- Venmo is constrained to US/USD for this demo and should be hidden outside that market even when local test stubs mark it eligible.

## PayPal Vault Attribute Planning

- V1 save-for-future should emit Create Order vault attributes only for authenticated buyers who explicitly opt in.
- PayPal wallet save-for-future uses `payment_source.paypal.attributes.vault.store_in_vault: "ON_SUCCESS"` with wallet vault metadata.
- Card save-for-future uses `payment_source.card.attributes.vault.store_in_vault: "ON_SUCCESS"` plus card verification, defaulting to `SCA_WHEN_REQUIRED`.
- Pay Later, Apple Pay, Google Pay, and Venmo save-for-future controls remain out of v1 unless official support is separately confirmed.

## PayPal Capture Amount Guard

- Capture should compare the locked merchant snapshot with the provider/PayPal amount snapshot, not browser-submitted totals.
- The guard should block on currency, item total, shipping, tax, discount, or final total mismatches, except for explicitly configured rounding tolerance.
- PayPal purchase-unit amount breakdown can be normalized into a provider amount snapshot for the later capture API route.

## PayPal Snapshot Sanitization

- Admin/debug snapshots should preserve PayPal request/response structure and item-level details but redact secrets before storage.
- Redact obvious credential and privacy fields such as access tokens, client secrets, auth headers, payer email, and phone data.
- Store merchant amount snapshots beside sanitized PayPal snapshots so capture/debug views can explain expected versus provider totals without recalculating from browser data.

## Express API Foundation

- Keep API responses in the planned `{ ok, data|error, debug_id }` envelope from the first route so future buyer/mobile clients share one contract.
- Server env parsing should fail before listen when required secrets/config are missing, and error messages should name missing variables without echoing values.
- Supabase service-role clients stay server-only, use the private `app` schema, and disable browser-style auth session persistence.
- Middleware should attach explicit request contexts: `buyer`, `guestCart`, and `admin`, so later route handlers do not parse headers repeatedly.
- Debug logging must sanitize context recursively before writing or printing; useful IDs and amounts can stay, but tokens, service-role keys, auth headers, client secrets, and card-like fields are redacted.

## Supabase Catalog Repository

- Storefront routes should stay repository-driven so the buyer/mobile API contract can remain stable while the data source evolves.
- The repository maps Supabase app-schema rows into API DTOs and keeps release-state behavior centralized: unreleased products are non-purchasable and hide reviews.
- Server TypeScript now includes shared source in its project boundary because the catalog repository consumes shared catalog helpers directly.

## Admin Profile/Market Switch API

- Admin profile/market switching updates an in-memory active storefront context for the running demo API; explicit `profile` and `market` query params still override it for route-contract compatibility.
- The switch endpoint returns the same data shape as `GET /api/config`, so the frontend can refresh config/catalog/cart/PayPal SDK data without a separate response model.
- Test requests with JSON bodies need the in-process request harness to emit `data` and `end`; this environment does not expose a usable port from `app.listen(0)`.

## Cart API Surface

- Cart routes should receive `buyer`, `guestCart`, and active storefront context from middleware/state, then delegate persistence and rule enforcement to a cart repository.
- The initial route surface intentionally does not implement Supabase persistence; the next slice should store/verify guest cart secrets, create signed-in carts, and apply shared cart merge/refresh helpers against canonical product rules.
- Route-level validation should catch malformed quantities and unsupported refresh triggers before repository calls; product purchase, inventory cap, and price refresh rules belong in the repository/domain layer.

## Supabase Cart Repository

- Guest carts should store only `cart_public_id` plus a hashed client secret server-side; the raw client secret is returned only in the creation binding and then lives in the browser as the opaque cart credential.
- Cart repository responses should always return the full cart snapshot after a mutation, because the UI needs refreshed item IDs, prices, checkout eligibility, totals, and adjustment explanations.
- Login/register merge should refresh the merged cart against canonical product rules before returning it, so stale guest-cart price snapshots do not survive into the authenticated checkout path.
- Unreleased or otherwise non-purchasable items can remain in the cart but must return `checkout_eligible: false`; checkout/payment flows can then block the action without silently deleting buyer intent.

## Checkout API Surface

- Checkout draft routes should mirror the planned accordion steps so the web UI and future mobile clients can call the same step-specific endpoints.
- Route-level validation should normalize address and pickup-location country codes before the repository performs tax, shipping, promo, inventory, or store-distance calculations.
- Delivery and Pickup tab state should remain separate in the repository response; the route layer only validates inputs and passes buyer/cart/storefront context through.

## Supabase Checkout Repository

- Checkout drafts should reuse the active cart's profile/market/currency snapshots and validate ownership through either Supabase auth user ID or guest cart public ID plus hashed client secret.
- Delivery recalculation can default the cheapest eligible shipping option after shipping address submit, then keep tax calculation based on merchandise subtotal and promo discount only; shipping remains excluded.
- Pickup recalculation should keep the full cart intact while the payable checkout summary uses only store-available quantities, with unavailable quantities returned for the order summary strike-through UI.

## Checkout Promo APIs

- Promo evaluation can be persisted even before the buyer applies it; only apply/remove should update `checkout_drafts.selected_promo_evaluation_id`.
- Apply/remove should create fresh promo snapshots rather than mutating old ones, so pending-order resume and Admin Portal can explain which promo rules changed over time.
- Checkout summaries should read discount from the selected promo evaluation, then calculate tax on discounted merchandise only; shipping remains a separate total line and is excluded from both promo and tax bases.

## Guest Order Lookup

- Guest order lookup should normalize order numbers and emails at the route boundary, then use a hashed normalized email in the repository so raw lookup emails are not needed for matching.
- Return a generic not-found response for any mismatch to avoid revealing whether an order number exists or which email belongs to it.
- Buyer-facing guest order detail should omit internal order, item, address, and guest-access IDs; keep those for Admin Portal only.

## PayPal API Routes

- The SDK config route should stay browser-safe: return client ID, market, component, provider-key, and token-required flags, but never client secret or OAuth/token internals.
- Frontend SDK provider scopes should use the App-injected API client by default, with explicit override only for narrow tests; otherwise app-level env/base-url and test clients can drift from payment-surface behavior.
- Express payment UI must preserve the active cart public binding all the way from cart API response to the SDK button's create-order callback. Dropping `cart_public_id` turns official buttons into uncallable shells even when the visual button renders correctly.
- The installed `@paypal/react-paypal-js` v9.2.0 SDK v6 provider accepts `environment`, `components`, `locale`, `pageType`, and `testBuyerCountry`; it does not expose `sdkBaseUrl`, so `sdk_url` should remain backend/debug metadata unless local types change.
- Client-token generation should be a server-side PayPal OAuth wrapper that maps PayPal's `access_token` field into our buyer-facing `client_token` field.
- Use `PUBLIC_HTTPS_ORIGIN` as the preferred default client-token domain, falling back to `APP_BASE_URL` only for local/basic development; PayPal may reject localhost domains for domain-bound token flows.
- Keep PayPal order creation split into three layers: route validates buyer/source context, repository prepares merchant-locked order inputs from Supabase, and gateway performs OAuth plus `/v2/checkout/orders`.
- Full checkout Delivery, express Delivery, and BOPIS should share one route orchestration shape, but the payload builder must stay fulfillment-specific so BOPIS never accidentally receives delivery shipping callbacks or shipping fee breakdown.
- Create-order preparation should write the merchant order and payment session before calling PayPal so pending orders are visible when payment is abandoned; capture can clear paid cart items later, while pending orders keep cart intent intact.
- Store a source fingerprint on the payment session so retries can distinguish same-source idempotent reuse from a fresh PayPal invoice/payment attempt.
- Express delivery cannot know the PayPal order ID before Create Order returns, so the initial callback URL should use a known merchant-side identifier and the later shipping-callback route can map it back to the payment session/order.
- PayPal server-side shipping callback routes should return PayPal's raw success or `UNPROCESSABLE_ENTITY` decline JSON, not the app's standard `{ ok, data }` envelope, because PayPal consumes the callback response directly.
- Express shipping callback recalculation can update the pending merchant order and current payment session before the buyer confirms in PayPal; the later Review and Confirm step can treat the returned amount as the confirmed provider-side amount snapshot.
- Express shipping callbacks should create an order-scoped promo evaluation snapshot every time, even when no promo matches, so Admin can explain both selected and rejected promo decisions tied to the PayPal shipping update.
- Capture should be a backend-only operation after the merchant-side amount guard allows it; the route must block mismatches before calling PayPal.
- Orders capture uses the server OAuth token and a fresh `PayPal-Request-Id`, then stores the sanitized capture response beside the locked merchant amount snapshot for Admin/debug review.
- In v1, use the persisted provider total from create-order/shipping-update as the capture guard's provider amount when the minimal PayPal capture response does not echo the original item/shipping/tax/discount breakdown.
- Successful capture finalization is the point where pending orders become paid, payment sessions become captured, inventory is decremented, and only paid order items are removed from the active cart.

# Learnings

Reusable implementation lessons from this demo should be added here during milestones.

## PayPal JS SDK v6 Sandbox Market Testing
- Keep market buyer country and sandbox test buyer country as separate config values.
- `buyer_country` / `paylater_buyer_country` describe buyer-facing market behavior and Pay Later messaging context.
- `sandbox_test_buyer_country` is a sandbox-only simulation knob for PayPal JS SDK v6 and should be omitted or ignored in production.
- The local `wiki-v2` PayPal JS source snapshot shows SDK v6 `CreateInstanceOptions` includes `testBuyerCountry?: string`, so the frontend should map backend `sandbox_test_buyer_country` to `createInstance({ testBuyerCountry })`.
- The installed `@paypal/react-paypal-js` v9 / `@paypal/paypal-js` v9 package types still expose `testBuyerCountry`, matching the local wiki snapshot checked during Milestone 4 SDK config work.
- Production SDK config should null `sandbox_test_buyer_country`; sandbox config should return it so the frontend can map it to SDK v6 `createInstance({ testBuyerCountry })`.

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

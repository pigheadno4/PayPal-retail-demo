# PayPal Retail Demo API Contract

## Purpose
This document defines the draft Express API contract before implementation. It is a planning artifact and should be updated when route names or payloads change.

## API Rules
- Browser and future mobile clients call Express APIs, not Supabase tables directly.
- Payment-sensitive calculations run server-side.
- Browser-submitted prices, discounts, taxes, shipping fees, and totals are never trusted.
- Every checkout/payment response includes a buyer-safe summary and an internal debug ID for Admin Portal lookup.
- Buyer APIs never expose PayPal access tokens, service role keys, webhook secrets, or full raw provider payloads.
- Admin APIs can expose sanitized request/response snapshots and debug logs.
- PayPal client ID is browser-safe and can be returned to the frontend through an API.
- PayPal client token is short-lived and should be generated only for flows that need it, such as vault-enabled card or PayPal wallet flows.
- PayPal `invoice_id` must be unique per PayPal transaction attempt because PayPal rejects duplicate invoice IDs.
- PayPal order payloads should include detailed line-item data so buyers can recognize the order from PayPal review, email, and account activity surfaces.

## Common Request Context
Most APIs derive:
- `profile_id` from global admin-selected active profile or request-safe profile config.
- `market_id` from active market.
- buyer identity from Supabase Auth token when present.
- guest cart identity from `cart_public_id` and cart client secret.

Common headers:
- `Authorization: Bearer <supabase access token>` for logged-in buyers.
- `x-cart-id: <cart_public_id>` for guest/session cart.
- `x-cart-secret: <cart client secret>` for guest/session cart mutation.
- `x-admin-session: <admin session token>` for admin APIs.

## Response Shape
Default success shape:

```json
{
  "ok": true,
  "data": {},
  "debug_id": "dbg_123"
}
```

Default error shape:

```json
{
  "ok": false,
  "error": {
    "code": "AMOUNT_MISMATCH",
    "message": "The order total changed. Please review the updated total.",
    "details": {}
  },
  "debug_id": "dbg_123"
}
```

## Public Storefront APIs

### `GET /api/config`
Returns active profile, market, feature flags, and buyer-safe PayPal client configuration.

Response includes:

```json
{
  "profile": {
    "id": "profile_popmart",
    "slug": "popmart",
    "display_name": "POP MART Demo"
  },
  "market": {
    "id": "market_us",
    "code": "US",
    "currency_code": "USD",
    "locale": "en-US",
    "language_code": "en",
    "buyer_country": "US",
    "paypal_page_type": "checkout",
    "paylater_enabled": true,
    "paylater_buyer_country": "US",
    "sandbox_test_buyer_country": "US",
    "market_version": 1
  },
  "features": {
    "delivery": true,
    "pickup": true,
    "vaulting": true,
    "apple_pay": true,
    "google_pay": true,
    "venmo": true
  }
}
```

Rules:
- `buyer_country` is the shopper country used for market, funding eligibility, and buyer-facing payment behavior.
- `paylater_buyer_country` is passed to Pay Later message/session setup when Pay Later needs an explicit buyer country.
- `sandbox_test_buyer_country` is returned only for sandbox/test environments and is used to simulate the PayPal buyer environment in JS SDK v6. Production responses must omit it or return `null`.
- Market switches are admin demo controls, not buyer currency selectors.
- When profile or market changes, the browser must refetch config, catalog, cart, and PayPal SDK config.
- Existing carts are scoped by `profile_id + market_id`; do not convert cart currency or prices across markets.

### `GET /api/catalog/home`
Returns homepage sections:
- hero
- hot sales
- categories
- release calendar summary
- Pay Later promo placement config
- banner cards
- popular series

### `GET /api/catalog/categories`
Returns active categories for current profile.

### `GET /api/catalog/products`
Query params:
- `category`
- `price_min`
- `price_max`
- `availability`
- `release_status`
- `pickup_available`
- `sort`

Returns product cards and filter counts.

### `GET /api/catalog/products/:slug`
Returns PDP data:
- product details
- image gallery
- price display
- release status
- inventory summary
- review summary
- payment placement eligibility hints

Future release products return `purchasable: false`.

### `GET /api/catalog/release-events`
Returns calendar events and related PDP links.

## Auth And Account APIs

### `POST /api/auth/email-status`
Request:

```json
{
  "email": "buyer@example.com"
}
```

Response:

```json
{
  "exists": true,
  "next_step": "password"
}
```

or:

```json
{
  "exists": false,
  "next_step": "register"
}
```

### `GET /api/account`
Returns profile info, default addresses, saved payment summary, and order summary.

### Address APIs
- `GET /api/account/addresses`
- `POST /api/account/addresses`
- `PATCH /api/account/addresses/:id`
- `DELETE /api/account/addresses/:id`

Delete default address must fail unless another default exists.

### Order APIs
- `GET /api/account/orders`
- `GET /api/account/orders/:id`

Order detail returns buyer-facing timeline and review eligibility. Technical IDs stay hidden from buyer UI.

### Saved Payment APIs
- `GET /api/account/saved-payments`
- `DELETE /api/account/saved-payments/:id`

Delete flow:
1. Verify saved payment belongs to buyer.
2. Call PayPal token delete/revoke where supported.
3. Mark local record deleted.
4. Return updated list.

### `GET /api/guest-orders/:orderNumber`
Query params:
- `email`

Returns read-only order detail if order number and email match.

## Cart APIs

### `GET /api/cart`
Returns active cart. Creates an empty guest cart if needed.

### `POST /api/cart/items`
Request:

```json
{
  "product_id": "prod_123",
  "quantity": 1
}
```

Server verifies:
- product belongs to active profile
- product is released/purchasable
- quantity is within demo stock caps

### `PATCH /api/cart/items/:id`
Updates quantity and revalidates caps.

### `DELETE /api/cart/items/:id`
Removes item.

### `POST /api/cart/merge`
Used after login/register.

Rules:
- same product/options: add quantities and cap
- different product/options: append
- preserve latest buyer intent unless user explicitly declines merge

### `POST /api/cart/refresh`
Refreshes server cart from canonical database state before checkout, express payment, minicart open, or cart open.

## Checkout APIs

### `POST /api/checkout/drafts`
Creates or refreshes checkout draft from cart.

Response includes:
- delivery tab state
- pickup tab state
- order summary draft
- promo calculation status

### Delivery Step APIs
- `PATCH /api/checkout/drafts/:id/shipping-address`
- `PATCH /api/checkout/drafts/:id/billing-address`
- `PATCH /api/checkout/drafts/:id/shipping-option`

Shipping address update triggers tax, shipping, inventory, and promo recalculation. Billing address does not change tax in v1 unless user selects a billing-only market rule later.

### Pickup Step APIs
- `PATCH /api/checkout/drafts/:id/pickup-location`
- `PATCH /api/checkout/drafts/:id/pickup-store`
- `PATCH /api/checkout/drafts/:id/billing-address`
- `PATCH /api/checkout/drafts/:id/pickup-date`

Pickup store update triggers:
- store inventory check
- ready/unavailable item split
- promo recalculation
- tax recalculation using billing or configured pickup tax rule
- total recalculation

### Promo APIs
- `POST /api/checkout/drafts/:id/promos/evaluate`
- `POST /api/checkout/drafts/:id/promos/apply`
- `DELETE /api/checkout/drafts/:id/promos/:code`

Evaluation response:

```json
{
  "recommended_set": ["AUTO10", "STATE5"],
  "candidate_sets": [
    {
      "codes": ["AUTO10", "STATE5"],
      "discount_minor": 1500,
      "final_total_minor": 9450,
      "recommended": true
    }
  ],
  "rejected": [
    {
      "code": "EXPIRED20",
      "reason": "expired"
    }
  ]
}
```

Discount base excludes shipping.

## PayPal APIs

### `GET /api/paypal/sdk-config`
Returns browser-safe PayPal SDK configuration for the active profile, market, and page context.

Query params:
- `page_type`: `home`, `product-details`, `cart`, `mini-cart`, `checkout`, `admin`
- `flow`: `standard`, `vaulting`
- `method`: `paypal`, `paylater`, `card`, `apple_pay`, `google_pay`, `venmo`

Response:

```json
{
  "client_id": "PAYPAL_PUBLIC_CLIENT_ID",
  "environment": "sandbox",
  "sdk_url": "https://www.sandbox.paypal.com/web-sdk/v6/core",
  "currency_code": "USD",
  "locale": "en-US",
  "buyer_country": "US",
  "paylater_buyer_country": "US",
  "sandbox_test_buyer_country": "US",
  "components": [
    "applepay-payments",
    "card-fields",
    "googlepay-payments",
    "paypal-messages",
    "paypal-payments",
    "venmo-payments"
  ],
  "page_type": "checkout",
  "provider_key": "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:applepay-payments,card-fields,googlepay-payments,paypal-messages,paypal-payments,venmo-payments",
  "needs_client_token": false
}
```

Rules:
- Never return PayPal client secret.
- Return `client_id` for basic PayPal, Pay Later, Venmo, Apple Pay, Google Pay, and non-vault one-time card flows.
- Set `needs_client_token: true` when the selected flow requires a client token, including card vaulting and PayPal wallet vaulting.
- The frontend must call `POST /api/paypal/client-token` only when `needs_client_token` is true.
- Normalize SDK component lists for deterministic response and `provider_key` generation.
- JS SDK v6 uses a static loader URL and runtime configuration. The frontend should remount only the PayPal provider/payment subtree when `provider_key` changes.
- `currency_code` is used for eligibility checks such as `findEligibleMethods({ currencyCode })`.
- `locale` is used for SDK/provider instance creation.
- `buyer_country` and `paylater_buyer_country` are used for Pay Later messages and method details where the SDK requires buyer-country context.
- In sandbox, map `sandbox_test_buyer_country` to PayPal JS SDK v6 `createInstance({ testBuyerCountry })` so the SDK simulates the buyer environment.
- Before coding against the installed package, verify `testBuyerCountry` still exists in the local `@paypal/react-paypal-js` v9 / SDK v6 types. If the installed type differs from the `wiki-v2` snapshot, stop and update this contract before implementing the provider.
- Pay Later, Venmo, Apple Pay, and Google Pay UI rows must be hidden unless runtime eligibility says they can render.

Payment method mapping rules:
- PayPal maps to `paypal-payments`, `findEligibleMethods().isEligible("paypal")`, `createPayPalOneTimePaymentSession`, and `<paypal-button>`.
- Pay Later maps to `paypal-payments` plus `paypal-messages`, `findEligibleMethods().isEligible("paylater")`, `getDetails("paylater")`, `createPayLaterOneTimePaymentSession`, `<paypal-pay-later-button>`, and amount-aware messages.
- Card maps to `card-fields`, `findEligibleMethods().isEligible("advanced_cards")`, `createCardFieldsOneTimePaymentSession`, and hosted card fields. Its pay button stays inside the card box, including mobile.
- Apple Pay maps to `applepay-payments`, Apple Pay config eligibility, `createApplePayOneTimePaymentSession`, and an official Apple Pay button surface.
- Google Pay maps to `googlepay-payments`, Google Pay config eligibility, `createGooglePayOneTimePaymentSession`, and an official Google Pay button surface.
- Venmo maps to `venmo-payments`, `findEligibleMethods().isEligible("venmo")`, `createVenmoOneTimePaymentSession`, and `<venmo-button>`. V1 demo hides Venmo outside US/USD even if generic runtime checks are stubbed as eligible.
- The method plan returns renderable rows, the selected/default method, required components for renderable rows, and hidden methods with debug reasons.

### `POST /api/paypal/client-token`
Generates a short-lived PayPal client token for vault-enabled flows.

Request:

```json
{
  "flow": "vaulting",
  "method": "card",
  "domains": ["localhost"]
}
```

Response:

```json
{
  "client_token": "short-lived-client-token",
  "expires_in_seconds": 900
}
```

Rules:
- Logged-in buyer required.
- Guest checkout must receive `403 GUEST_VAULTING_NOT_ALLOWED`.
- Standard one-time flows do not call this endpoint; they use the SDK config `client_id`.
- V1 vaulting client-token requests are supported for `card` and `paypal` methods.
- Request `domains` are normalized before the backend calls PayPal.
- Backend calls PayPal OAuth with `grant_type=client_credentials`, `response_type=client_token`, and `domains[]`.
- If a saved PayPal customer ID exists, backend can include it as `target_customer_id` in the PayPal token request.
- Backend generates token using server-side PayPal credentials.
- Token response must not include client secret or OAuth access token.

Vault attribute rules:
- Vault attributes are included only when the buyer explicitly requests save-for-future and is authenticated.
- Guests cannot request vault attributes; guest UI must hide/disable save-for-future controls.
- V1 save-for-future Create Order attributes are supported only for `paypal` and `card`.
- PayPal wallet save-for-future uses `payment_source.paypal.attributes.vault.store_in_vault: "ON_SUCCESS"` with PayPal wallet vault metadata.
- Card save-for-future uses `payment_source.card.attributes.vault.store_in_vault: "ON_SUCCESS"` and `payment_source.card.attributes.verification.method: "SCA_WHEN_REQUIRED"` by default.
- If a PayPal-generated customer ID exists for the buyer, card vault attributes can include `payment_source.card.attributes.customer.id`; the same customer ID can also be sent as `target_customer_id` in the client-token request.
- Pay Later, Apple Pay, Google Pay, and Venmo save-for-future controls remain disabled in v1 unless official support is separately confirmed and the plan is updated.
- Capture/webhook handling must treat vault status `APPROVED` as pending until a verified vault/payment-token webhook confirms the token.

### PayPal Order Number And Invoice ID Rules
Internal order numbers use fulfillment-specific prefixes:
- Delivery order: `DO-YYYYMMDD-000001`
- Pickup/BOPIS order: `PO-YYYYMMDD-000001`

PayPal `purchase_units[].invoice_id` rules:
- First PayPal payment attempt uses the internal order number as `invoice_id`.
- If a pending order must create a fresh PayPal order after the prior PayPal order/session expired, was cancelled, or failed, append an attempt suffix to keep the PayPal invoice ID unique, for example `DO-20260526-000001-A2`.
- Store the exact `paypal_invoice_id` on the payment session.
- Store a canonical PayPal Create Order payload fingerprint with `paypal_invoice_id` and `paypal_request_id`.
- Store and reuse the same `PayPal-Request-Id` only for retrying the same PayPal API request with the same payload.
- Generate a new `PayPal-Request-Id` when the payload changes or a fresh payment session is created.
- A changed payload must be treated as a fresh PayPal API request, even when it belongs to the same buyer-facing order.

### PayPal Line Item Rules
Every PayPal Create Order payload should include detailed item-level information when available.

Required item fields:
- `name`
- `quantity`
- `unit_amount`

Preferred item fields:
- `description`
- `sku`
- `url`
- `image_url`
- `category: "PHYSICAL_GOODS"`
- `tax` when line-level tax allocation can reconcile exactly with `amount.breakdown.tax_total`

Amount reconciliation:
- `sum(items[].unit_amount.value * quantity)` must equal `purchase_units[].amount.breakdown.item_total.value`.
- If item-level `tax` is passed, sum item taxes must equal `purchase_units[].amount.breakdown.tax_total.value`.
- Demo order rows store aggregate `order_items.line_tax_minor`; the backend may split a same-product PayPal line into multiple grouped quantities when cents cannot divide evenly across quantity.
- Item-level tax is all-or-none for a generated PayPal payload: either every order item provides `line_tax_minor`, or no PayPal `items[].tax` fields are sent.
- Promo discounts are represented in `amount.breakdown.discount`, not by reducing item names or hiding the original item total.
- Shipping fee is represented in `amount.breakdown.shipping`.
- BOPIS payload includes only pickup-available quantities in `items[]`; unavailable quantities remain in the cart and are excluded from the PayPal order amount.
- The backend must run an amount consistency check before capture: item total, optional item-level tax total, and final purchase-unit total must match the merchant-calculated snapshot within the configured rounding tolerance.

### `POST /api/paypal/orders/delivery`
Creates PayPal order for full checkout Delivery flow after checkout draft is finalized.

Rules:
- fulfillment mode is locked to `delivery`
- full checkout uses the merchant-collected shipping address from the finalized checkout draft
- use `shipping_preference: "SET_PROVIDED_ADDRESS"` so the selected checkout shipping address remains the order address
- do not use server-side shipping callbacks in full checkout Delivery; address, shipping option, tax, promo, and amount are finalized before payment approval
- include detailed item data when available and keep `items[]` reconciled with `amount.breakdown.item_total`

### `POST /api/paypal/orders/express-delivery`
Creates PayPal order from PDP/cart/minicart delivery express.

Rules:
- fulfillment mode is locked to `delivery`
- create pending order when session starts
- use server-side shipping callback config
- use `shipping_preference: "GET_FROM_FILE"`
- include `payment_source.paypal.experience_context.order_update_callback_config`
- default callback subscription is `["SHIPPING_ADDRESS"]`; add `SHIPPING_OPTIONS` only when the selected shipping option must trigger a fresh amount/promo recalculation
- callback URL points to `POST /api/paypal/orders/:paypalOrderId/shipping-callback` with enough internal cart/session context for server-side recalculation
- return buyer to merchant Review and Confirm after PayPal approval

### `POST /api/paypal/orders/bopis`
Creates PayPal order for Pickup checkout.

Mandatory payload semantics:

```json
{
  "intent": "CAPTURE",
  "purchase_units": [
    {
      "invoice_id": "PO-20260526-000001",
      "items": [
        {
          "name": "Product name",
          "quantity": "1",
          "sku": "product-sku",
          "category": "PHYSICAL_GOODS",
          "unit_amount": {
            "currency_code": "USD",
            "value": "19.99"
          }
        }
      ],
      "amount": {
        "currency_code": "USD",
        "value": "21.64",
        "breakdown": {
          "item_total": {
            "currency_code": "USD",
            "value": "19.99"
          },
          "tax_total": {
            "currency_code": "USD",
            "value": "1.65"
          }
        }
      },
      "shipping": {
        "type": "PICKUP_IN_STORE",
        "name": {
          "full_name": "s2s {storeName}"
        },
        "address": {
          "address_line_1": "{store address line 1}",
          "admin_area_2": "{store city}",
          "admin_area_1": "{store state}",
          "postal_code": "{store postal code}",
          "country_code": "{store country}"
        }
      }
    }
  ],
  "payment_source": {
    "paypal": {
      "experience_context": {
        "shipping_preference": "SET_PROVIDED_ADDRESS"
      }
    }
  }
}
```

Do not use authorize-at-checkout/capture-at-pickup for v1 BOPIS.

Rules:
- BOPIS uses the selected store as the PayPal purchase unit shipping address.
- BOPIS amount breakdown excludes shipping fee.
- Do not attach server-side shipping callback config to v1 BOPIS orders.

### `POST /api/paypal/orders/:paypalOrderId/shipping-callback`
Handles PayPal server-side shipping updates for delivery express.

Server recalculates:
- shipping eligibility
- selected/default shipping option
- promo set
- tax
- final amount

Response must keep PayPal amount breakdown consistent.

### `POST /api/paypal/orders/:paypalOrderId/capture`
Used after:
- full checkout payment approval
- express Review and Confirm
- card fields successful submit
- Apple Pay/Google Pay/Venmo confirmation when eligible

Before capture:
1. Fetch local payment session and order.
2. Recompute or load final locked merchant snapshot.
3. Compare merchant total and PayPal/provider amount.
4. Normalize the PayPal/provider amount into item total, shipping, tax, discount, final total, and currency fields.
5. Block capture on currency, item total, shipping, tax, discount, or final-total mismatch beyond configured rounding tolerance.
6. Allow only known rounding tolerance.
7. Capture if consistent.
8. Mark order paid.
9. Decrement inventory.
10. Clear paid cart items.

The capture guard returns an explainable decision shape for API/Admin use:
- `action`: `allow_capture` or `block_capture`
- `status`: `matched` or `mismatch`
- `can_capture`: boolean
- `tolerance_minor`
- `mismatches[]`: reason, merchant expected amount/currency, provider actual amount/currency

Snapshot storage:
- PayPal request/response snapshots are sanitized before writing `app.paypal_order_snapshots`.
- The storage row keeps `payment_session_id`, `paypal_invoice_id`, `paypal_request_id`, `request_json`, `response_json`, and `merchant_snapshot_json`.
- `request_json` and `response_json` preserve item-level details and amount breakdowns for Admin explanation.
- Sanitization redacts access tokens, refresh tokens, ID tokens, client secrets, authorization headers, PayPal auth assertions, payer email, phone, and phone-number fragments.
- `merchant_snapshot_json` stores currency and minor-unit item total, shipping, tax, discount, and final total used by capture validation.

### `POST /api/paypal/webhooks`
Verifies PayPal webhook signature before processing.

Valid events may update:
- payment session status
- order payment status
- saved payment active/pending status

Invalid events are stored as invalid and ignored.

## Review APIs
- `GET /api/products/:productId/reviews`
- `POST /api/orders/:orderId/items/:itemId/review`
- `PATCH /api/reviews/:id`
- `DELETE /api/reviews/:id`

Create review rules:
- buyer owns order
- order is delivered or picked up
- item belongs to order
- no active review exists for the same order item

## Admin APIs

### Admin Session
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/state`

Admin passcode session is separate from buyer auth.

### Profile And Market
- `PATCH /api/admin/profile-market`

Request:

```json
{
  "profile_id": "profile_popmart",
  "market_id": "market_gb"
}
```

Response returns the same config shape as `GET /api/config`.

Switching profile/market resets active browser cart bindings, checkout drafts, and in-progress payment sessions only. It does not reset orders, inventory, users, saved payments, reviews, or webhooks.

Rules:
- Close minicart/checkout UI after the switch.
- Create or fetch the active cart for the new `profile_id + market_id`.
- Pending orders keep their original profile, market, currency, locale, and buyer-country settings. Resume checkout for a pending order must use the order's locked market config, not the current admin-selected market.
- The returned PayPal `provider_key` should change whenever client ID, environment, market, currency, locale, buyer country, sandbox test buyer country, component set, or market version changes.

### Orders And Lifecycle
- `GET /api/admin/orders`
- `GET /api/admin/orders/:id`
- `POST /api/admin/orders/:id/lifecycle`

Allowed manual transitions:
- Delivery: `paid -> processing -> shipped -> delivered`
- Pickup: `paid -> preparing_pickup -> ready_for_pickup -> picked_up`

### Inventory And Pickup Dates
- `GET /api/admin/inventory`
- `PATCH /api/admin/inventory/:id`
- `GET /api/admin/pickup-dates`
- `PATCH /api/admin/pickup-dates/:id`

### Webhooks And Debug
- `GET /api/admin/webhooks`
- `GET /api/admin/debug-logs`

Admin debug may show sanitized PayPal request/response snapshots, amount comparisons, promo evaluations, and webhook verification status.

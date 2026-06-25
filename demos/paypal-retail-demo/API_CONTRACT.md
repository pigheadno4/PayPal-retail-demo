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

### `GET /api/health`

Returns API liveness in the standard success envelope.

```json
{
  "ok": true,
  "data": {
    "service": "paypal-retail-demo",
    "status": "ok"
  },
  "debug_id": "dbg_123"
}
```

Unknown `/api/*` routes return the standard error envelope with `code: "NOT_FOUND"` and the original request path in `details.path`.

Middleware context:

- Buyer auth middleware sets `request.buyer` to guest when no bearer token exists, or authenticated buyer context after Supabase verifies the bearer token.
- Guest cart middleware sets `request.guestCart` from paired `x-cart-id` and `x-cart-secret` headers; if only one is present, it returns `GUEST_CART_HEADERS_INCOMPLETE`.
- Admin session middleware verifies signed `x-admin-session` tokens and sets `request.admin`; invalid or expired tokens return `ADMIN_SESSION_REQUIRED`.
- Runtime debug logging must sanitize context recursively before storage/output and redact tokens, service-role keys, authorization headers, client secrets, and card-like fields.

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

Route behavior:

- `profile` and `market` query params are accepted for demo context routing until Admin profile/market state is implemented.
- Missing `profile` defaults to `popmart`; missing `market` defaults to `US`.
- `market` is normalized to uppercase before repository lookup.
- `pickup_available=true|false` is normalized to boolean; invalid boolean and invalid price filters are ignored for the first route-contract slice.

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

Missing products return `PRODUCT_NOT_FOUND` in the standard error envelope with the requested slug in `details.slug`.

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
- `GET /api/account/orders/:orderNumber`

Account order APIs require authenticated buyer context.

`GET /api/account/orders` returns `{ orders }` for the signed-in buyer, newest first.

`GET /api/account/orders/:orderNumber` returns `{ order }` only when the order belongs to the signed-in buyer.

Order DTOs include buyer-facing order number, placed date, fulfillment mode, status, payment status, currency, totals, item rows, lifecycle timeline, fulfillment addresses, and per-item review eligibility/submitted state. Technical PayPal order IDs, payment-session IDs, internal database IDs, and Admin/debug snapshots stay hidden from buyer UI.

### Saved Payment APIs

- `GET /api/account/saved-payments`
- `DELETE /api/account/saved-payments/:id`

Delete flow:

1. Verify saved payment belongs to buyer.
2. Call PayPal Payment Method Tokens delete when a vault ID exists.
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
- Local verification with `@paypal/react-paypal-js` v9.2.0 found that the React SDK v6 `PayPalProvider` accepts `environment`, `components`, `locale`, `pageType`, and `testBuyerCountry`; it does not expose a `sdkBaseUrl` prop. Keep `sdk_url` as backend/debug metadata unless the installed SDK type changes.
- Before coding against the installed package, verify `testBuyerCountry` still exists in the local `@paypal/react-paypal-js` v9 / SDK v6 types. If the installed type differs from the `wiki-v2` snapshot, stop and update this contract before implementing the provider.
- Pay Later, Venmo, Apple Pay, and Google Pay UI rows must be hidden unless runtime eligibility says they can render.

Payment method mapping rules:

- PayPal maps to `paypal-payments`, `findEligibleMethods().isEligible("paypal")`, `createPayPalOneTimePaymentSession`, and `<paypal-button>`.
- Pay Later maps to `paypal-payments` plus `paypal-messages`, `findEligibleMethods().isEligible("paylater")`, `getDetails("paylater")`, `createPayLaterOneTimePaymentSession`, `<paypal-pay-later-button>`, and amount-aware messages.
- Card maps to `card-fields`, `findEligibleMethods().isEligible("advanced_cards")`, `createCardFieldsOneTimePaymentSession`, and hosted card fields. Its pay button stays inside the card box, including mobile.
- Apple Pay maps to `applepay-payments`, Apple Pay config eligibility, `createApplePayOneTimePaymentSession`, and an official Apple Pay button surface.
- Google Pay maps to `googlepay-payments`, Google Pay config eligibility, `createGooglePayOneTimePaymentSession`, and a Google PaymentsClient-controlled button/payment-data surface. The PayPal SDK owns the Google Pay payment session and confirmation bridge; Google's runtime owns the button rendering.
- Venmo maps to `venmo-payments`, `findEligibleMethods().isEligible("venmo")`, `createVenmoOneTimePaymentSession`, and `<venmo-button>`. V1 demo hides Venmo outside US/USD even if generic runtime checks are stubbed as eligible.
- The method plan returns renderable rows, the selected/default method, required components for renderable rows, and hidden methods with debug reasons.

### `POST /api/paypal/client-token`

Generates a short-lived PayPal client token for vault-enabled flows.

Request:

```json
{
  "flow": "vaulting",
  "method": "card",
  "domains": ["https://checkout.example.test"]
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
- Request `domains` are normalized before the backend calls PayPal. If omitted, the backend uses the configured public HTTPS origin, falling back to app base URL for local development.
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
- Capture handling creates or updates local saved-payment records only for authenticated buyers with `vault_requested = true`.
- Capture status `VAULTED` creates or updates an `active` saved payment when a vault ID is available.
- Capture status `APPROVED` creates or updates a `pending` saved payment until a verified `VAULT.PAYMENT-TOKEN.CREATED` webhook provides the vault ID.
- Verified vault deletion webhooks reconcile local saved payment records to `disabled` or `deleted`.

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

Provider-bound `url` and `image_url` values must be public HTTPS absolute URLs resolved from the configured public origin. Storefront/catalog DTOs may keep app-relative paths such as `/assets/...`, but the PayPal payload boundary must not send relative product/image URLs or local HTTP asset URLs. When the demo runs without a public HTTPS origin, omit PayPal line-item URL/image fields instead of sending localhost URLs.

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
- checkout PayPal wallet calls can include `method: "paypal"` plus `vault_requested` only when the authenticated eligible buyer opted into save-for-future
- checkout card fields call this same endpoint with `method: "card"` and `vault_requested`; the backend includes card vault attributes only when the authenticated buyer opted in and is eligible

### `POST /api/paypal/orders/express-delivery`

Creates PayPal order from PDP/cart/minicart delivery express.

Request:

```json
{
  "cart_id": "cart_public_guest",
  "method": "paypal"
}
```

Rules:

- fulfillment mode is locked to `delivery`
- frontend uses the active cart public binding as `cart_id`; express entry points do not send checkout draft IDs
- create pending order when session starts
- use server-side shipping callback config when a public HTTPS API origin is configured
- use `shipping_preference: "GET_FROM_FILE"`
- include `payment_source.paypal.experience_context.order_update_callback_config` only when `PUBLIC_HTTPS_ORIGIN` or another HTTPS API origin is available; local HTTP development may omit the callback config so sandbox Create Order can still open the buyer approval modal
- default callback subscription is `["SHIPPING_ADDRESS"]`; add `SHIPPING_OPTIONS` only when the selected shipping option must trigger a fresh amount/promo recalculation
- callback URL points to `POST /api/paypal/orders/:callbackContextId/shipping-callback` with enough internal cart/session context for server-side recalculation. Because PayPal order ID is not known until Create Order returns, the initial callback context can be the merchant order/payment-session identifier; the callback handler should also read the PayPal order ID from PayPal's callback payload when present.
- return buyer to merchant Review and Confirm at `/checkout/express-review?paypal_order_id={paypalOrderId}` after PayPal approval

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
- Checkout PayPal wallet calls can include `method: "paypal"` plus `vault_requested` only when the authenticated eligible buyer opted into save-for-future.
- Checkout card fields call this same endpoint with `method: "card"` and `vault_requested`; the backend preserves pickup shipping semantics while applying card payment/vault attributes only when eligible.

### `POST /api/paypal/orders/:callbackContextId/shipping-callback`

Handles PayPal server-side shipping updates for delivery express.

Server recalculates:

- shipping eligibility
- selected/default shipping option
- auto promo set
- tax
- final amount

The endpoint returns PayPal callback JSON directly, not the app's standard `{ ok, data }` API envelope.

Success response:

- HTTP `200`
- top-level PayPal order `id`
- `purchase_units[].reference_id` using the merchant order number
- `purchase_units[].amount` with consistent `item_total`, `tax_total`, `shipping`, and final `value`
- `purchase_units[].shipping_options[]` with exactly one selected option

Decline response:

- HTTP `422`
- `{ "name": "UNPROCESSABLE_ENTITY", "details": [{ "issue": "..." }] }`
- supported issues include address/country/state/zip errors and unavailable shipping methods

Response must keep PayPal amount breakdown consistent. Callback recalculation writes an order-scoped promo evaluation snapshot, recalculates tax after promo discount, excludes shipping from promo and tax bases, updates order/payment-session snapshots, and includes `amount.breakdown.discount` when an auto promo applies.

### `GET /api/paypal/orders/express-review`

Loads the buyer-facing Review and Confirm snapshot after PayPal approves a PDP/cart/minicart delivery express order.

Query:

- `paypal_order_id` or `payment_session_id` is required.
- `market` is passed by the frontend for the active storefront context.

Response uses the standard app envelope and returns:

- merchant order number and PayPal order ID
- payment session ID and payment method label
- delivery address captured from the latest PayPal shipping callback snapshot, or a buyer-safe PayPal-supplied-address placeholder when local/no-callback express mode falls back to the same-session `review_confirm` snapshot
- selected shipping option label, estimate, and amount
- item rows with product names, SKU/quantity detail, and line totals
- merchandise subtotal, shipping, promo discount, tax, and total from the latest `paypal_shipping_update` total snapshot, falling back to the same payment session's `review_confirm` snapshot when no PayPal shipping callback snapshot exists
- amount guard result comparing the merchant synchronized total with the provider/payment-session total

If neither a same-session `paypal_shipping_update` nor `review_confirm` snapshot exists, the endpoint returns `PAYPAL_EXPRESS_REVIEW_NOT_FOUND` instead of showing placeholder totals. The frontend must render a blocked unavailable state rather than sample order data when this happens.

### `POST /api/paypal/orders/:paypalOrderId/capture`

Used after:

- full checkout payment approval
- express Review and Confirm
- card fields successful submit
- Apple Pay/Google Pay/Venmo confirmation when eligible

Before capture:

1. Fetch local payment session and order.
2. Recompute or load final locked merchant snapshot.
3. Compare merchant total and PayPal/provider amount snapshot.
4. Normalize the provider amount into item total, shipping, tax, discount, final total, and currency fields when PayPal supplies that breakdown.
5. Block capture on currency, item total, shipping, tax, discount, or final-total mismatch beyond configured rounding tolerance.
6. Allow only known rounding tolerance.
7. Capture if consistent.
8. Mark order paid.
9. Decrement inventory.
10. Clear paid cart items.

V1 implementation note:

- The create-order and shipping-update flows persist locked merchant/provider totals before capture.
- The Orders capture response can be minimal and may not echo the original item/shipping/tax/discount breakdown.
- When the capture response does not include the full original breakdown, the guard uses the stored provider total snapshot and the locked merchant snapshot, while the full sanitized capture response is still stored for Admin/debug review.

The capture guard returns an explainable decision shape for API/Admin use:

- `action`: `allow_capture` or `block_capture`
- `status`: `matched` or `mismatch`
- `can_capture`: boolean
- `tolerance_minor`
- `mismatches[]`: reason, merchant expected amount/currency, provider actual amount/currency

Successful app response:

```json
{
  "ok": true,
  "data": {
    "order_number": "DO-20260601-000001",
    "payment_session_id": "payment_session_...",
    "paypal_order_id": "PAYPAL_ORDER_ID",
    "paypal_capture_id": "PAYPAL_CAPTURE_ID",
    "paypal_order_status": "COMPLETED",
    "paypal_capture_status": "COMPLETED",
    "paypal_request_id": "request-capture-...",
    "amount_guard": {
      "action": "allow_capture",
      "status": "matched",
      "can_capture": true,
      "tolerance_minor": 0,
      "mismatches": []
    }
  },
  "debug_id": "dbg_..."
}
```

Blocked response:

- HTTP `409`
- standard app error envelope with `code: "PAYPAL_CAPTURE_AMOUNT_MISMATCH"`
- `details.amount_guard` contains the same explainable guard decision shape

Snapshot storage:

- PayPal request/response snapshots are sanitized before writing `app.paypal_order_snapshots`.
- The storage row keeps `payment_session_id`, `paypal_invoice_id`, `paypal_request_id`, `request_json`, `response_json`, and `merchant_snapshot_json`.
- `request_json` and `response_json` preserve item-level details and amount breakdowns for Admin explanation.
- Sanitization redacts access tokens, refresh tokens, ID tokens, client secrets, authorization headers, PayPal auth assertions, payer email, phone, and phone-number fragments.
- `merchant_snapshot_json` stores currency and minor-unit item total, shipping, tax, discount, and final total used by capture validation.

### `POST /api/paypal/webhooks`

Verifies PayPal webhook signature before processing.

Verification uses the PayPal notification headers:

- `PAYPAL-AUTH-ALGO`
- `PAYPAL-CERT-URL`
- `PAYPAL-TRANSMISSION-ID`
- `PAYPAL-TRANSMISSION-SIG`
- `PAYPAL-TRANSMISSION-TIME`

Backend calls PayPal `POST /v1/notifications/verify-webhook-signature` with the configured `PAYPAL_WEBHOOK_ID` and the received event body.

Implemented v1 processing:

- `PAYMENT.CAPTURE.COMPLETED`: links by related PayPal order ID, marks the payment session captured, and marks the order paid/captured for reconciliation.
- `VAULT.PAYMENT-TOKEN.CREATED`: activates a pending saved payment and stores vault/customer/card summary metadata.
- `VAULT.PAYMENT-TOKEN.DELETION-INITIATED`: marks the local saved payment disabled.
- `VAULT.PAYMENT-TOKEN.DELETED`: marks the local saved payment deleted.

Invalid events are stored as invalid/ignored and rejected with a buyer-safe API error. Invalid or unverifiable webhooks never mutate order, payment-session, or saved-payment state.

Webhook processing is idempotent by PayPal `event_id` per provider. A repeated event returns the stored processing result and does not re-run order, payment-session, or saved-payment mutations.

## Review APIs

Product detail reviews are returned by `GET /api/catalog/products/:slug` under
`product.reviews`. Released products expose active review rows; unreleased
products hide reviews.

Authenticated account review mutations use buyer-facing order numbers and
stable line-item IDs:

- `POST /api/account/orders/:orderNumber/items/:itemId/review`
- `PATCH /api/account/orders/:orderNumber/items/:itemId/review`
- `DELETE /api/account/orders/:orderNumber/items/:itemId/review`

Create/update request body:

```json
{
  "rating": 5,
  "title": "Tiny shelf star",
  "body": "The paint details look great beside my other figures."
}
```

Successful mutations return the refreshed buyer-safe account order DTO:

```json
{
  "order": {
    "order_number": "PO-20260602-000118",
    "items": [
      {
        "id": "line_1",
        "review_eligible": false,
        "review_submitted": true,
        "review": {
          "rating": 5,
          "title": "Tiny shelf star",
          "body": "The paint details look great beside my other figures."
        }
      }
    ]
  }
}
```

Create review rules:

- buyer owns order
- order is delivered or picked up
- item belongs to order
- no active review exists for the same order item

Edit/delete rules:

- buyer owns the same order and item
- active review exists for the same account/order item
- delete marks the review deleted instead of removing history, and the returned
  order reopens review eligibility for that item

Failure responses:

- `404 REVIEW_TARGET_NOT_FOUND` when the order item or active review cannot be
  resolved for the buyer
- `409 REVIEW_NOT_ELIGIBLE` when the order state or one-active-review rule
  blocks the mutation

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

`GET /api/admin/orders` returns recent orders with internal `id`, buyer-facing `order_number`, profile/market IDs, fulfillment mode, order/payment status, currency, total, placed/updated timestamps, and `next_statuses` for currently allowed manual actions.

`GET /api/admin/orders/:id` returns the selected order plus totals, items, fulfillment addresses, lifecycle timeline events, payment sessions, PayPal snapshots, total snapshots, promo evaluation lines, inventory effects derived from order item quantities, linked webhooks, and the same `next_statuses` action list.

Lifecycle request:

```json
{
  "next_status": "processing",
  "note": "Packed at warehouse station A."
}
```

Allowed manual transitions:

- Delivery: `paid -> processing -> shipped -> delivered`
- Pickup: `paid -> preparing_pickup -> ready_for_pickup -> picked_up`

Invalid transitions return `ADMIN_ORDER_LIFECYCLE_INVALID` with the current status and allowed next statuses. Successful transitions update `orders.status` and append an `order_lifecycle_events` row with `actor_type: "admin"` so buyer order timelines can reflect the change.

### Inventory And Pickup Dates

- `GET /api/admin/inventory`
- `PATCH /api/admin/inventory/:id`
- `GET /api/admin/pickup-dates`
- `PATCH /api/admin/pickup-dates/:id`

`GET /api/admin/inventory` returns central and store inventory rows for the active seeded demo scope. Row IDs are opaque API identifiers:

- Central inventory: `central:<profile_id>:<market_id>:<product_id>`
- Store inventory: `store:<store_inventory.id>`

Admin clients must echo the returned ID in the patch URL instead of reconstructing table keys. `PATCH /api/admin/inventory/:id` accepts:

```json
{
  "available_quantity": 9
}
```

`available_quantity` must be a non-negative whole number. Invalid IDs or payloads return `INVALID_ADMIN_INVENTORY_REQUEST`; missing rows return `ADMIN_INVENTORY_NOT_FOUND`.

`GET /api/admin/pickup-dates` returns pickup capacity rows with store labels for Admin editing. `PATCH /api/admin/pickup-dates/:id` accepts either or both fields:

```json
{
  "capacity": 18,
  "is_available": false
}
```

`capacity` must be a non-negative whole number and `is_available` must be a boolean. Invalid IDs or payloads return `INVALID_ADMIN_PICKUP_DATE_REQUEST`; missing rows return `ADMIN_PICKUP_DATE_NOT_FOUND`.

### Webhooks And Debug

- `GET /api/admin/webhooks`
- `GET /api/admin/payment-debug`
- `GET /api/admin/debug-logs`

`GET /api/admin/webhooks` requires a signed admin session and returns recent sanitized PayPal webhook events ordered by `received_at` descending. The response includes event ID/type, verification status, processing status, linked order/payment-session IDs when available, received timestamp, and processed timestamp. Invalid webhooks remain visible with `verification_status: "invalid"` and typically `processing_status: "ignored"`; listing them is read-only and must not mutate orders, saved payment methods, or payment sessions.

`GET /api/admin/payment-debug` requires a signed admin session and returns recent payment sessions ordered by latest update. Each row includes the payment-session status, PayPal order/capture/invoice/request IDs, merchant/provider total comparison, linked order summary when available, total snapshots, sanitized PayPal request/response snapshot metadata, and linked webhook events. The route is read-only and must not mutate orders, saved payment methods, payment sessions, inventory, or webhook processing state.

`GET /api/admin/debug-logs` requires a signed admin session and returns the bounded in-memory runtime debug log buffer. Each row includes timestamp, level, message, derived `debug_id`, derived source, derived request path, and sanitized context. Runtime context is sanitized recursively before storage/output and must redact access tokens, authorization headers, service-role keys, client secrets, PayPal auth assertions, card security fields, and similar secret-bearing keys. The route is read-only and must not mutate orders, saved payment methods, payment sessions, inventory, or webhook processing state.

Admin debug may show sanitized PayPal request/response snapshots, amount comparisons, promo evaluations, and webhook verification status.

# PayPal Retail Demo UX State Contract

This contract defines the Milestone 13 recovery behavior for checkout and official payment surfaces. It turns the live QA gaps into a single reference for implementation, tests, and demo review.

## Source Inputs

- User review on June 14, 2026: initial checkout must not show PayPal buttons before the Payment step, shipping/billing must shrink after save, shipping option totals must update immediately, and PayPal errors must stay visible.
- Live browser audit on June 14, 2026: the fixture cart exposed a public cart ID but no client secret, API calls did not attach `x-cart-id`/`x-cart-secret`, checkout draft creation failed, cart state reset across navigation/refresh, Pay Later readiness did not produce a visible button, and Pickup leaked a GB postcode/default-store state into the US guest flow.
- `DESIGN.md`: Delivery/Pickup accordion flow, radio-first payment wall, official PayPal button/message placement, and POP MART playful retail visual direction.
- `ui-ux-pro-max` review: active section indication, visible loading/error recovery, field-local errors with `role="alert"`, controlled React form state, and stable button/message space.

## Payment Surface Gate

Official PayPal, Pay Later, wallet, and card surfaces must mount only when all conditions are true:

1. The active fulfillment tab is visible.
2. The active tab's payment section is the only expanded section.
3. The selected payment radio is eligible.
4. The selected payment method has the matching official surface.
5. The active checkout draft/cart binding is server-ready for that surface.
6. Pay Later surfaces have completed the SDK v6 eligibility/details check for the current amount and currency.

If any condition is false, Order Summary keeps reserved empty space but renders no official payment action and no sticky mobile payment bar.

## Checkout Draft And Cart Binding

Fixture IDs such as `draft_delivery_123` and `draft_pickup_123` are allowed only in unit fixtures and mockups. Live App flow must use one of these modes:

- Server-backed mode: fetch or create an active checkout draft before section submit or create-order, then use the returned UUID.
- Explicit mock mode: block real PayPal create-order and show buyer-safe copy that the demo is running without server checkout data.

The app must not send fixture IDs to Supabase-backed endpoints. PayPal create-order buttons must be disabled or withheld until the binding is server-ready.

Browser cart state must persist as an opaque server cart binding only, such as cart public ID plus client secret. A browser refresh must reload the active server cart from that binding; it must not reset to fixture/default cart data while a valid cart binding exists.

Guest cart-backed API calls must attach the paired `x-cart-id` and `x-cart-secret` headers. A public cart ID without the client secret is not server-ready and must block checkout draft creation, cart mutation, and PayPal express create-order with buyer-safe copy.

Navigating to `/checkout` must not clear the header cart count or minicart contents. Checkout can refresh/reconcile the cart before creating a draft, but the buyer-facing shell must stay bound to the same active cart.

## Delivery Accordion

Initial Delivery state:

- Shipping address: expanded and editing.
- Billing address: collapsed and idle.
- Shipping options: collapsed and idle.
- Payment method: collapsed and idle.
- Order Summary: visible, neutral promo state unless a real code/discount exists, no payment action.

Submit behavior:

- Submit shipping address -> show saving/recalculating -> collapse shipping summary -> expand billing.
- Submit billing -> show saving/recalculating -> collapse billing summary with Edit action -> expand shipping options.
- Submit shipping option -> update Order Summary shipping/total lines -> collapse shipping options -> expand payment.
- Edit on any saved section expands only that section and collapses all others. Downstream totals can show recalculating or stale-state copy.

## Pickup Accordion

Guest Pickup:

- Start with Pickup location expanded.
- Do not preselect a store, default-address checkbox, or Order Summary store before ZIP/postcode submit and modal confirmation.
- Buyer enters ZIP/postcode and submits.
- Store picker modal opens with ranked stores, address, non-dominant phone, distance, full/partial status, item-level inventory lines when cart-line data is available, and a direct Select button on each store card.
- Selecting or confirming a store collapses location/store summary and opens billing.
- ZIP/postcode defaults and ranked stores must match the active market.

Logged-in Pickup:

- Start with nearest/default-address store preselected.
- Buyer can click Change store to open the same store picker modal.
- Continue with selected store opens billing.

Pickup date:

- The pickup date step uses the shadcn Calendar surface after billing is saved.
- Past-only seeded/demo pickup date windows are normalized to a rolling window starting from the current checkout date.
- The first available date is visually selected by default and must be included in the submit payload if the buyer clicks Submit pickup date without manually changing the calendar selection.

Partial inventory:

- Order Summary separates ready-for-pickup and not-available items.
- Store cards must not rely on aggregate counts alone when the checkout draft returns item-level inventory lines; show each cart item with `In stock`, `Only N available`, or `Sold out`.
- Unavailable pickup items are excluded from the BOPIS payment amount and remain in the original cart.

## Loading And Error States

- Section submit buttons stay visible while saving.
- API errors keep the current section expanded and show a clear inline `role="alert"` message with retry copy.
- App API errors must use JSON envelopes for API routes; HTML Express 500 pages are not acceptable for buyer flows.
- PayPal create-order errors must leave merchant-side feedback visible after popup close/failure and log sanitized debug context.

## POP MART Visual Direction

Checkout should be calmer than the homepage but still feel like collectible retail:

- Use coral, candy pink, lemon, mint, and sky-blue accents sparingly for step badges, status chips, pickup store cards, and summaries.
- Keep official PayPal surfaces visually undistorted, with reserved space and stable layout.
- Avoid a plain SaaS checkout feel, but do not make payment rows noisy.

## Acceptance Tests

- Initial `/checkout` has no official PayPal/Pay Later/wallet/card action mounted.
- Payment action appears only after the buyer reaches the expanded payment section and selects a matching radio method.
- Shipping option is not `saved` before buyer confirmation.
- Changing shipping option updates Order Summary shipping and total.
- Invalid or missing server checkout binding blocks create-order with visible copy instead of sending fixture IDs.
- API failures leave the edited section expanded and announced.
- PDP/cart/minicart official express surfaces call `/api/paypal/orders/express-delivery` only with active server cart binding.
- Browser refresh reloads active server cart data from the saved cart binding instead of restoring fixture/default items.
- Navigating to `/checkout` preserves header cart count and minicart contents.
- Guest cart-backed cart, checkout draft, and PayPal express API calls include paired `x-cart-id` and `x-cart-secret` headers.
- Missing or incomplete cart binding keeps buyer actions blocked with visible copy and does not send fixture/default IDs to backend endpoints.
- Minicart quantity controls update through the same server-backed cart update/reconcile path as full-cart quantity controls.
- Pay Later official buttons wait for SDK v6 eligibility/details for the current amount/currency before rendering.
- Pickup guest flow starts with ZIP/postcode only, no selected store, no default-address checkbox, and no preselected Order Summary store.
- Pickup default ZIP/postcode/store fixtures match the active market.

## Current Implementation Status

Completed in the Milestone 13 checkout-recovery slice:

- Initial checkout payment-action gating.
- Delivery/Pickup first-actionable-step initialization.
- Delivery section save/collapse/edit progression through payment selection.
- Server checkout draft UUID creation before live section PATCH requests.
- Order Summary shipping-line reconciliation from checkout draft responses.
- Retryable inline section errors when checkout draft updates fail.
- Standard JSON API error envelope for route dependency failures.
- Official PDP/cart/minicart express SDK controls.

Still open for the next Milestone 13 slices:

- Browser cart binding restore, including persisted `cart_public_id` plus `cart_client_secret`.
- Guest cart header propagation for cart, checkout draft, and PayPal express API calls.
- Checkout-route cart continuity.
- Minicart quantity editing through the server-backed cart path.
- Pay Later SDK v6 eligibility/detail gating for official Pay Later buttons.
- Pickup guest/logged-in initial-state separation and active-market fixture cleanup.
- Merchant-visible PayPal create-order failure/debug feedback after popup close or backend failure.
- Confirm-triggered capture and buyer-facing amount-guard blocking on Review and Confirm.

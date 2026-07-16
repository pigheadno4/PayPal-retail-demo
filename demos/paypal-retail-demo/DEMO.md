# PayPal Retail Demo

## Audience

Mixed business and technical stakeholders evaluating a POP MART-style retail payment experience with PayPal.

## Business Scenario

This is a flagship collectible retail demo. The buyer browses a polished storefront, adds collectible products to cart, chooses delivery or store pickup, applies eligible promotions, pays with PayPal payment methods, and later tracks orders or submits reviews.

The default customer-specific profile is a POP MART storefront presentation. A reusable generic profile, MochiToy Studio, uses the same app, backend, and payment flows with fictional assets.

## Success Criteria

- PayPal sandbox integrations work correctly where eligible.
- Delivery and BOPIS flows run end to end with correct totals and order states.
- Promo, tax, shipping, inventory, and payment totals remain consistent before capture.
- Admin Portal supports profile/market control plus route-separated Orders, Lifecycle, Inventory, Webhooks, and Diagnostics workbenches; buyer Account order history reflects merchant lifecycle updates without inventing PayPal webhook events.
- POP MART profile feels customer-ready; MochiToy profile keeps the demo reusable.
- PayPal behavior is verified from `/Users/tengtao/Development/wiki-v2` or marked as a demo assumption.

## Payment Products

V1 targets real sandbox integrations for:

- PayPal
- Pay Later
- PayPal card fields
- Apple Pay
- Google Pay
- Venmo
- Save for future / vaulting where officially supported

Out of v1:

- Fastlane
- Subscriptions or recurring billing
- Preorder payment semantics
- Disputes/refunds
- Native iOS/Android apps

## Supported Flows

- Homepage and catalog browsing
- Product detail with 3-4 product images
- Cart and minicart
- Delivery checkout
- BOPIS checkout
- PayPal and Pay Later express from PDP/cart/minicart for delivery only
- Review and Confirm page at `/checkout/express-review` for PDP/cart/minicart express only
- Guest checkout and guest order lookup
- Account registration/login
- Account address book, saved payments, order history, reviews submitted
- Pending order resume
- Admin Portal at `/admin` with route-backed Orders, Lifecycle, Inventory, Webhooks, and Diagnostics tabs

## Payment Flow Map

### Delivery Full Checkout

Entry point: `/checkout`, Delivery tab.

Frontend payment layer: radio-first payment wall. PayPal, Pay Later, Apple Pay, Google Pay, and Venmo selected actions render under Order Summary when eligible; Apple Pay and Google Pay rows start absent and appear only after both amount-aware PayPal provider eligibility for the active fulfillment total and current browser/device readiness succeed. The probes rerun when Delivery/Pickup or that mode's total changes. Pending, failed, or ineligible probes cannot leave behind a selectable row or active selected action. Apple Pay uses PayPal's React one-time-payment component plus Apple's auto-updating `1.latest` browser SDK and a deployed domain-association file. Google Pay uses PayPal's React one-time-payment session hook and mounts the official button returned by `PaymentsClient.createButton()` directly into the merchant-owned 52px action container; no merchant-drawn Google Pay button is allowed. Pay Later also renders an amount-aware message in its radio row using the active checkout draft total. Card fields expand inside the active payment row with PayPal-hosted number, expiry, and CVV fields; the card pay button stays inside that card box on desktop and mobile. Async PayPal buttons/messages reserve layout space to avoid large checkout jumps.

Backend APIs:

- Create delivery payment session/order after shipping, billing, shipping option, promo, tax, and total are finalized.
- Capture payment after selected payment method succeeds.
- Verify final amount consistency before capture.
- On successful capture, mark the order paid, mark the payment session captured, write PayPal/total/lifecycle snapshots, decrement central inventory, and clear only paid items from the active cart.
- Verified PayPal webhooks reconcile capture completion and saved-payment token lifecycle; invalid webhooks are stored for Admin/debug but never mutate business state.

Stored state:

- Cart snapshot
- Order and order items
- Shipping and billing address snapshots
- Shipping option snapshot
- Promo evaluation snapshot
- Tax and total snapshot
- Payment session and PayPal identifiers

Verification:

- Delivery order can complete in sandbox.
- Central inventory decrements after paid order.
- Paid items clear from active cart.
- Order appears in account order history.

### Delivery Express From PDP/Cart/Minicart

Entry point: PayPal or Pay Later button on PDP, cart, or minicart.

Frontend payment layer: official PayPal or Pay Later express button. The button create-order callback uses the active cart public binding and delivery-only method context; local button clicks must not jump directly to Review and Confirm.

Backend APIs:

- Create a delivery PayPal order/session.
- Use PayPal shipping/order update callbacks for delivery address, shipping option, promo, tax, and amount updates.
- Return buyer to merchant Review and Confirm page at `/checkout/express-review?paypal_order_id={paypalOrderId}`.
- Load Review and Confirm from `GET /api/paypal/orders/express-review` so the buyer sees the latest synchronized PayPal shipping-update totals, item rows, selected shipping option, promo, tax, and amount guard. In local/no-callback sandbox mode, the endpoint can fall back to the same-session `review_confirm` totals and a buyer-safe PayPal-supplied-address placeholder while preserving the amount guard.
- Capture only after buyer confirms on merchant page.
- Guard capture using the locked merchant/provider amount snapshot; store the sanitized PayPal capture response for Admin/debug review.

Stored state:

- Pending order once payment session starts
- Delivery fulfillment mode snapshot
- Final synchronized PayPal order amount snapshot
- Promo evaluation snapshot

Verification:

- Express flow remains delivery-only.
- Review and Confirm displays synchronized amount.
- Capture is blocked if merchant total and PayPal amount mismatch.

### BOPIS Checkout

Entry point: `/checkout`, Pickup tab.

Frontend payment layer: checkout payment wall after store, billing, and pickup date are confirmed.

Backend APIs:

- Rank stores from logged-in default address or guest ZIP/postcode.
- Preselect nearest store even if partial inventory.
- Create PayPal BOPIS order with pickup-specific Create Order fields.
- Capture at checkout in v1.

PayPal BOPIS payload target:

- `intent: "CAPTURE"`
- `payment_source.paypal.experience_context.shipping_preference: "SET_PROVIDED_ADDRESS"`
- `purchase_units[].shipping.type: "PICKUP_IN_STORE"`
- `purchase_units[].shipping.address`: selected store address
- `purchase_units[].shipping.name.full_name`: `s2s ${storeName}` convention

This Create Order parameter set is the v1 BOPIS contract. Do not implement BOPIS by switching to the authorize-at-checkout/capture-at-pickup guide unless the user explicitly approves a future alternate flow.

Stored state:

- Selected store
- Store inventory snapshot
- Pickup date
- Billing address snapshot
- Ready-for-pickup items
- Not-available-at-this-store items
- Promo/tax/total snapshot

Verification:

- Pickup order amount includes pickup-available items only.
- Store inventory decrements only for paid pickup items.
- Unavailable items remain in original cart.

### Saved Payment / Vaulting

Entry point: logged-in buyer selects save checkbox where supported.

Frontend payment layer:

- PayPal save checkbox under PayPal button.
- Card save checkbox inside expanded card box.
- No save checkbox for guest checkout or unsupported methods.

Backend APIs:

- Include official vaulting fields where supported.
- Store saved payment record if capture returns vault ID.
- Mark saved payment pending if token arrives asynchronously.
- Process vault/payment-token webhook to activate pending saved payment.
- Delete/revoke PayPal token when buyer deletes saved payment, where supported.

Verification:

- Saved payment appears active immediately when vault ID is returned.
- Pending saved payment updates after webhook.
- Delete action calls PayPal delete/revoke before local removal.

### Webhooks

Entry point: PayPal webhook endpoint.

Backend APIs:

- Verify PayPal webhook signature before processing.
- Store valid events.
- Reject/log invalid events.
- Link valid events to orders/payment sessions where possible.
- Treat PayPal webhook `event_id` as an idempotency key so retries do not re-run mutations.

V1 webhook scope:

- Payment lifecycle events
- Vault/payment-token events

Verification:

- Invalid webhook cannot mutate order state.
- Valid webhook appears in Admin Portal.

## Post-Purchase Operations And Account Experience

The approved post-purchase cycle turns the existing Admin and Account foundations into one truthful merchant-to-buyer demonstration:

- Admin routes are separate workbenches: `/admin/orders`, `/admin/lifecycle`, `/admin/inventory`, `/admin/webhooks`, and `/admin/diagnostics`.
- Orders, Lifecycle, Inventory, and Webhooks never render as one long page or preload unrelated datasets.
- Admin lifecycle changes update merchant order state and append an `admin` lifecycle audit event only. They never create synthetic PayPal webhook records.
- Delivery advances one step at a time from paid to processing, shipped, and delivered. Pickup advances from paid to preparing pickup, ready for pickup, and picked up.
- Account order history and detail reload canonical order/lifecycle data and show the new buyer-safe stage, timestamp, and eligible review action without technical IDs.
- Pending Account orders expose `Resume payment`, which revalidates the saved order snapshot and opens the existing Checkout payment wall. It never substitutes or consumes a newer active cart; a missing delivery address or invalid pickup store/date state requires buyer completion/rebooking before payment.
- Webhooks remain read-only evidence of genuinely received PayPal events and support event-type, verification, processing, linkage, and received-time filters.
- Diagnostics combines canonical payment/order snapshots with persisted sanitized runtime logs; logs supplement business records and never become a second source of payment truth.

## Demo Profiles

- `popmart`: default active profile, customer-specific assets supplied by the user.
- `generic`: MochiToy Studio, reusable profile with generated/original assets.

Admin Portal controls active profile and market globally. Switching profile/market resets active cart/session context but does not reset inventory, orders, webhooks, users, or reviews.

## Demo Boundaries

- This is a demo, not a production compliance, pricing, tax, settlement, risk, or contractual reference.
- Shipping fee is excluded from promo and tax calculations as a demo assumption.
- POP MART assets are customer-specific and must not be reused outside this demo.
- PayPal behavior must be confirmed against `/Users/tengtao/Development/wiki-v2` before customer delivery. Use external PayPal docs only if the wiki has a gap or the user asks for a live refresh.
- The BOPIS receiver-name convention `s2s ${storeName}` is part of the v1 demo payload contract from prior implementation experience.

## Runbook

Install and verify:

```bash
npm install
npm run verify
npm run seed:summary
```

Local Supabase commands require Docker Desktop or another compatible Docker daemon:

```bash
npm run db:start
npm run db:reset
npm run db:lint
npm run seed:local
```

When linked Supabase environment variables are configured, refresh remote seed data with:

```bash
npm run seed:linked
```

Start the buyer demo locally:

```bash
node --env-file=.env node_modules/tsx/dist/cli.mjs watch server/src/server.ts
npm run dev:web -- --host localhost
```

Use `http://localhost:5173`, not `127.0.0.1`, for API-backed browser QA unless CORS is updated. Primary buyer routes are `/`, `/products`, `/products/blind-boxes-2`, `/cart`, `/checkout`, and `/account`. The implemented Admin Portal starts at `/admin`; the approved post-purchase cycle splits its workbenches into route-backed Admin tabs before the next runtime closeout.

Current verified evidence paths:

- `/private/tmp/paypal-retail-responsive-gate-20260623-final`
- `/private/tmp/paypal-retail-api-backed-payment-gate-20260623`
- `/private/tmp/paypal-retail-m16-a11y-visual-gate-20260623`
- `/Users/tengtao/Development/demo-projects/paypal-sandbox-capture-confirmation.png`
- `/Users/tengtao/Development/demo-projects/paypal-sandbox-post-capture-empty-cart.png`

Full cart PayPal sandbox capture was completed on 2026-06-24 for order `DO-20260624-000001` / PayPal order `5YR26262S4472494N`. Future reruns remain a manual gate: click the cart PayPal button, sign in with a sandbox buyer account only after explicit user approval, approve, return to `/checkout/express-review`, confirm capture, and verify paid order, inventory, and cart-clearing state.

Expected high-level runbook:

- Configure Supabase environment.
- Configure PayPal sandbox credentials and webhook ID.
- Run initial seed script.
- Start Express backend.
- Start Vite frontend.
- Visit buyer storefront.
- Visit `/admin` with demo admin passcode.

## Verification Checklist

- POP MART profile loads by default.
- MochiToy profile can be selected from Admin Portal.
- Guest cart persists by local cart ID.
- Logged-in cart syncs from server before checkout/payment.
- Delivery checkout completes with PayPal sandbox.
- BOPIS checkout completes with pickup-specific payload.
- Pay Later messages render on correct surfaces.
- Promo/tax/shipping totals match calculation rules.
- Pending order resume uses saved item/price and locked market context, refreshes inventory/shipping or pickup/promo/tax totals, and preserves the active cart through resumed capture.
- Webhook signature verification is enforced.
- Admin Portal can advance delivery and pickup statuses manually.

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
- Admin Portal supports profile/market control, order lifecycle, inventory, webhook viewing, and runtime debug.
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
- Review and Confirm page for PDP/cart/minicart express only
- Guest checkout and guest order lookup
- Account registration/login
- Account address book, saved payments, order history, reviews submitted
- Pending order resume
- Admin Portal at `/admin`

## Payment Flow Map

### Delivery Full Checkout

Entry point: `/checkout`, Delivery tab.

Frontend payment layer: radio-first payment wall. PayPal, Pay Later, Apple Pay, Google Pay, and Venmo selected actions render under Order Summary. Pay Later also renders an amount-aware message in its radio row using the active checkout draft total. Card fields expand inside the payment section.

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

Frontend payment layer: official PayPal or Pay Later express button.

Backend APIs:

- Create a delivery PayPal order/session.
- Use PayPal shipping/order update callbacks for delivery address, shipping option, promo, tax, and amount updates.
- Return buyer to merchant Review and Confirm page.
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
- No save checkbox for guest checkout.

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

Runbook will be completed during implementation planning after the local stack commands are confirmed.

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
- Pending order resume revalidates current context.
- Webhook signature verification is enforced.
- Admin Portal can advance delivery and pickup statuses manually.

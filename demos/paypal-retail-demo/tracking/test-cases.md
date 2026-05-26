# Test Cases

## Seed And Database QA
- [x] Storefront/reference seed summary includes 2 profiles, 2 markets, 5 categories/profile, 25 products/profile, 9 stores/market, inventory, tax, shipping, homepage, release, and promo rows.
- [x] Seed row IDs are deterministic and unique within each seeded table.
- [x] Generated seed SQL targets the private `app` schema and uses upserts for repeated apply attempts.
- [x] Linked remote storefront/reference seed counts match the generated summary after apply.
- [x] Guarded seed slice creates 5 shared auth users with default addresses and demo-safe account data.
- [x] Guarded seed slice creates pending and completed orders that support resume, review, and Admin lifecycle demos.

## Core Business Logic
- [ ] Cart merge/sync across guest, login, and multiple devices.
- [ ] Guest cart stores only server cart ID/secret locally, not full cart as source of truth.
- [ ] Logged-in cart refreshes before minicart, cart, checkout, express payment, login/register, and pending resume.
- [ ] Admin market switch clears the active browser cart binding and fetches or creates a cart for the new `profile_id + market_id`.
- [ ] Market switch never converts existing cart prices or currency.
- [ ] Pending order resume uses the order's locked market, currency, locale, buyer country, sandbox test buyer country, and price snapshots.
- [ ] Product price lookup returns the active `product_prices` row for the current profile and market.
- [ ] Pending order resume uses order snapshot and revalidates current rules.
- [ ] Pending order resume creates a fresh payment session if the old session is expired or invalid.
- [ ] Promo evaluation supports automatic promos, manual codes, compatibility, expiry, and buyer selection.
- [ ] Promo evaluation respects country/state/county/postal promo scopes.
- [ ] Promo evaluation respects product/category promo scopes and exclusions.
- [ ] Promo evaluation recommends the best compatible promo set, not simply the largest single promo.
- [ ] Promo evaluation records Admin-readable selected/rejected line reasons without exposing internal debug details in buyer UI.
- [ ] Tax calculation excludes shipping and runs after eligible promo discounts.
- [ ] Total snapshots can be written before an order exists for checkout draft recalculation.
- [ ] Total snapshots preserve calculation stage, promo evaluation, taxable subtotal, tax, shipping, and final total.
- [ ] Shipping options are destination-based and cheapest option defaults.
- [ ] Store records are market-scoped and shared across profiles, while store inventory remains profile-and-market scoped.
- [ ] BOPIS store ranking preselects nearest store even if partial.
- [ ] Partial BOPIS excludes unavailable items from payment amount and keeps them in cart.
- [ ] Delivery inventory decrements central inventory after payment.
- [ ] BOPIS inventory decrements selected store inventory after payment.
- [ ] PayPal delivery payload builder uses delivery semantics.
- [ ] PayPal BOPIS payload builder uses pickup-store semantics.
- [ ] PayPal BOPIS payload builder sets `intent: "CAPTURE"`.
- [ ] PayPal BOPIS payload builder sets PayPal `shipping_preference: "SET_PROVIDED_ADDRESS"`.
- [ ] PayPal BOPIS payload builder sets `purchase_units[].shipping.type: "PICKUP_IN_STORE"`.
- [ ] PayPal BOPIS payload builder sets purchase unit shipping address to the selected store address.
- [ ] PayPal BOPIS payload builder sets receiver name to `s2s ${storeName}`.
- [ ] PayPal BOPIS flow does not use authorize-at-checkout/capture-at-pickup in v1.
- [ ] PayPal delivery express payload uses delivery semantics and server-side shipping callbacks.
- [ ] PayPal SDK config API returns browser-safe client ID for basic flows and never returns client secret.
- [ ] PayPal SDK config API returns currency, locale, buyer country, Pay Later buyer country, component set, and provider key.
- [ ] PayPal SDK config API returns sandbox test buyer country in sandbox and omits or nulls it in production.
- [ ] PayPal SDK v6 provider maps backend `sandbox_test_buyer_country` to `createInstance({ testBuyerCountry })` in sandbox/test.
- [ ] PayPal SDK v6 provider omits `testBuyerCountry` in production.
- [ ] PayPal provider key changes when client ID, environment, market, currency, locale, buyer country, sandbox test buyer country, component set, or market version changes.
- [ ] PayPal client token API returns a short-lived client token only for vault-enabled logged-in flows.
- [ ] Guest checkout cannot request PayPal client token for vaulting.
- [ ] Delivery order number generator uses `DO-YYYYMMDD-000001` format.
- [ ] Pickup order number generator uses `PO-YYYYMMDD-000001` format.
- [ ] PayPal `invoice_id` is unique per fresh PayPal payment attempt.
- [ ] Pending order resume keeps buyer-facing order number stable while generating a new PayPal invoice ID when a fresh PayPal order is required.
- [ ] PayPal Create Order payload includes detailed item data: name, quantity, unit amount, SKU, description, PDP URL, image URL, and physical goods category where available.
- [ ] PayPal Create Order amount breakdown item total equals sum of line item unit amounts times quantities.
- [ ] PayPal Create Order tax total equals line item tax sum when item-level tax is sent.
- [ ] Amount mismatch blocks capture except allowed rounding tolerance.
- [ ] Completed payment clears only paid cart items from the active cart.

## Buyer Flows
- [ ] Homepage calendar marks release dates with outlined circles.
- [ ] Homepage calendar includes a legend and does not rely on color alone.
- [ ] Unreleased PDP blocks checkout buttons and hides reviews.
- [ ] Cart and minicart show pickup hints without pickup buttons.
- [ ] Delivery checkout completes all accordion steps.
- [ ] Pickup checkout completes store, billing, pickup date, payment.
- [ ] Checkout accordion steps expose saving, recalculating, error, saved, and locked states.
- [ ] Checkout form errors are announced and focus moves to the first invalid field.
- [ ] Mobile checkout sticky payment bar shows only the selected non-card action and does not cover content.
- [ ] Card payment button remains inside the card fields box on mobile and desktop.
- [ ] Partial pickup store cards show available and unavailable counts before store submit.
- [ ] PDP/cart/minicart express returns to Review and Confirm.
- [ ] Guest checkout completes and offers inline account creation.
- [ ] Guest order lookup requires order number and email.
- [ ] Guest order lookup uses normalized email matching and does not expose internal order IDs.
- [ ] Guest buyer cannot enable save-for-future/vaulting.
- [ ] Completed order allows review submission per item.
- [ ] Review edit/delete updates PDP display.

## PayPal Sandbox
- [ ] PayPal renders and captures in delivery checkout.
- [ ] Pay Later message/button renders where eligible.
- [ ] JS SDK v6 sandbox configuration uses the configured test buyer country to simulate buyer environment.
- [ ] Pay Later amount-aware message updates when PDP/cart/minicart/checkout total changes.
- [ ] Card fields render and capture.
- [ ] Apple Pay renders and captures where eligible.
- [ ] Google Pay renders and captures where eligible.
- [ ] Venmo renders and captures where eligible.
- [ ] Vaulting active/pending states update correctly.
- [ ] Saved payment deletion calls PayPal revoke/delete where supported.
- [ ] Webhook signature verification rejects invalid events.
- [ ] Valid payment/vaulting webhooks link to orders/payment sessions.

## Admin Portal
- [ ] `/admin` is hidden from buyer UI.
- [ ] Admin passcode gate works independently from buyer auth.
- [ ] Profile/market switch resets active carts only.
- [ ] Profile/market switch does not reset orders, inventory, users, saved payments, reviews, or webhooks.
- [ ] Profile/market switch forces config, catalog, cart, and PayPal SDK config refresh.
- [ ] Manual delivery lifecycle updates order timeline.
- [ ] Manual pickup lifecycle updates order timeline.
- [ ] Admin inventory changes affect subsequent checkout/pending resume validation.
- [ ] Admin order detail shows timeline, PayPal snapshots, total snapshots, promo evaluation lines, inventory effect, and linked webhooks.
- [ ] Runtime debug logs are visible without exposing secrets.

## Visual QA
- [ ] Responsive screenshots pass at 375px, 768px, 1024px, and 1440px.
- [ ] POP MART profile stays image-led and retail-first without generic profile colors or heavy glass effects.
- [ ] Meaningful product, category, and banner images have descriptive alt text.
- [ ] PayPal buttons and Pay Later messages render without major layout shift.
- [ ] Sticky header and sticky payment bar do not obscure content.
- [ ] Text fits inside buttons, cards, accordions, and payment rows.

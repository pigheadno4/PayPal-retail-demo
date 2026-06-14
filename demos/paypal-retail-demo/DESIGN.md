# PayPal Retail Demo Design

## UX Goal

Create a customer-ready collectible retail demo that feels like a real POP MART storefront while proving a broad PayPal payment story. PayPal should be visible through official payment surfaces and Pay Later messages, not through heavy homepage co-branding.

## Main Screens

- Homepage
- Category/catalog page
- Product detail page
- Cart
- Minicart
- Checkout with Delivery and Pickup tabs
- Express Review and Confirm
- Order confirmation
- Account settings
- Account order history and order detail
- Guest order lookup
- Admin Portal at `/admin`

## Profiles And Assets

### POP MART Profile

- Default active profile.
- Buyer storefront should look like a POP MART storefront.
- No visible "POP MART x PayPal Demo" label in buyer header/hero.
- User supplies POP MART image files.
- Local assets live under `web/public/assets/popmart/`.
- Requires 25 products, 5 categories, and 3-4 real images per product.
- No product gallery placeholders.
- Visual contract: playful premium collectible retail. The POP MART profile should feel lively, cute, surprising, and collectible, while still being polished enough for a customer sales demo.
- Storefront foundation: warm light surfaces, image-led product grids, compact category navigation, strong product photography, and tactile product cards.
- Mood keywords: blind-box reveal, toy shelf, collector drop, playful premium, cute designer collectible, limited release.
- Do not apply the generic profile's vintage blue/amber/cream direction to the POP MART buyer storefront.

### Generic Profile

- Brand: MochiToy Studio.
- Storefront visual system: vintage blue, amber, cream direction.
- Product style: fictional cute designer-toy collectibles.
- Local assets live under `web/public/assets/generic/`.
- Requires 25 products, 5 categories, and 3-4 generated/original images per product.

### Branding

PayPal appears only in:

- official buttons
- Pay Later messages
- payment method rows
- checkout actions
- cart/minicart payment surfaces
- Admin Portal technical details

No PayPal-heavy hero, header, nav, or promotional co-branding.

## Visual System Rules

- Favor product imagery, collectible character art, and retail merchandising density over abstract decorative effects.
- Use a multi-accent POP MART profile palette instead of a one-accent red/white system: coral red for primary CTAs, candy pink for surprise/reveal accents, lemon yellow for drops/new arrivals, mint green for pickup/availability, sky blue for informational/payment-support surfaces, warm white for page background, and deep ink for body text.
- Use color as modular section identity, not page-wide noise. Homepage modules, category chips, release calendar markers, promo cards, and inventory badges can each carry a small accent; product photography must remain the hero.
- Use rounded, tactile, toy-like geometry where it improves delight: product cards, category pills, badges, and store cards can use 10-14px radii, soft shadows, and sticker-like tags. Checkout/payment controls should stay calmer and more utility-focused.
- Badges should feel like retail stickers or collectible labels: `Limited`, `Hot`, `New drop`, `Low stock`, `Ready for pickup`, and `Not available at this store` should be compact, high-contrast, and text-based.
- Prefer gentle hover/focus feedback: color shift, border highlight, soft lift, or shadow change in 150-300ms. Do not rely on hover-only behavior for touch users.
- Typography should feel rounder than a generic SaaS UI. POP MART profile should prefer Rubik for headings and Nunito Sans for body/UI if web font loading is acceptable; otherwise keep system fonts but increase heading weight, friendliness, and spacing through CSS.
- Avoid heavy glassmorphism, blurred translucent panels, large gradients, and decorative orbs; these reduce readability and do not match the POP MART storefront goal.
- Avoid making the storefront look childish, carnival-like, or overloaded. The target is collectible retail energy, not a kids app.
- Use restrained motion: hover/focus transitions around 150-300ms, with `prefers-reduced-motion` support.
- Use icon buttons where the action is familiar, with accessible labels/tooltips.
- Preserve space for async Pay Later messages and payment buttons so layout does not jump when PayPal eligibility finishes loading.
- Text contrast must meet at least 4.5:1 for normal text. Do not communicate inventory, promo, release, or error state by color alone.

### POP MART Profile Visual Language

Homepage:

- Hero should feel like a blind-box drop or collection launch, not a generic ecommerce banner.
- Hot sales and popular series should use vivid but controlled labels such as `Trending`, `Limited`, `Last chance`, and `New drop`.
- Category cards should feel like capsule/toy-shelf entries with strong images, short labels, and soft colored backgrounds.
- New arrivals calendar should read as a drop calendar; outlined release dates can use small sticker-like markers with text labels.
- Promo banners should feel like collectible event cards rather than plain information panels.

Category and PDP:

- Product cards should show clear current/regular price, release status, sale labels, and pickup availability without turning the whole grid into a dense table.
- PDP should feel like inspecting a collectible: large gallery, thumbnails, concise story/details, status badge, and strong add-to-cart/payment hierarchy.
- Unreleased products should stay visually exciting but have unmistakable disabled purchase states and no reviews.

Cart, minicart, and checkout:

- Cart/minicart can carry small pickup and Pay Later callouts, but should not become visually crowded with buttons.
- Checkout should inherit the playful brand through accents, step badges, and selected summaries, but payment rows and official PayPal surfaces must remain stable and readable.
- Pickup store cards can feel like store tickets: address, phone, distance, available/unavailable counts, and partial-inventory note in a compact, scannable block.

## Accessibility And Form Rules

- Every meaningful product, banner, and category image needs descriptive alt text.
- Form errors use `role="alert"` or `aria-live` and should move focus to the first invalid field after submit.
- Accordions move focus to the newly expanded step after successful submit.
- Use appropriate mobile keyboards: `inputmode="numeric"` for ZIP/postcode where applicable, phone, quantity, and numeric verification fields.
- Sticky header and sticky bottom payment bar must not cover page content; reserve matching top/bottom padding.
- Calendar dates, inventory status, promo results, and lifecycle states must use text or icons in addition to color.

## Homepage

Homepage includes:

- Hero
- Hot sales
- Categories
- New arrivals calendar
- Brief Pay Later promo without amount
- Promo/banner cards
- Popular series
- Footer

Hot sales and popular series use curated seed flags.

### New Arrivals Calendar

- Interactive date selection.
- Dates with release activity use an outlined/unfilled circle.
- Selected date shows related release products.
- Product cards link to PDP.
- Future release products are viewable but not purchasable.
- Include a compact legend for release status markers so outlined circles and color dots are not the only explanation.
- Keyboard users can move between dates and open the selected date's product list.

Future-release PDP:

- Status: not released / coming soon.
- Add to cart blocked.
- PayPal/Pay Later blocked or hidden.
- Reviews hidden.
- Preorder payment semantics are future phase.

## Category Page

V1 has filters only, no keyword search.

Filters:

- price
- availability
- category/series
- release status
- pickup availability

Pickup filter:

- enabled for logged-in buyer with default address or guest with ZIP/postcode
- disabled with hint if no location context exists
- Filter drawers and chips show applied count and provide a clear reset action.

## Product Detail Page

PDP focuses on the item.

Includes:

- 3-4 image gallery
- product introduction
- product status
- current/regular price display
- amount-aware official Pay Later message when purchasable
- add to cart
- PayPal express button for delivery only
- Pay Later express button for delivery only
- reviews for released products

No pickup hint on PDP.

## Cart And Minicart

PDP/cart/minicart PayPal and Pay Later buttons are delivery express only.

Cart:

- cart items and quantities
- amount-aware Pay Later message
- checkout button
- PayPal button
- Pay Later button
- text hint that Pickup can be selected on checkout page before payment

Minicart:

- compact item summary
- amount-aware Pay Later message
- view cart / checkout
- PayPal button
- Pay Later button
- short pickup hint
- no store selector
- no pickup button

## Checkout

Checkout is one `/checkout` page with top-level tabs:

- Delivery
- Pickup

Each tab has its own accordion flow. Order Summary stays visible and reflects active tab draft totals/context.

Accordion interaction contract:

- Only one checkout section is expanded in the active tab at a time.
- Initial Delivery state expands Shipping address only; all later sections are collapsed previews.
- Initial Pickup guest state expands Pickup location only; all later sections are collapsed previews.
- Initial Pickup logged-in state shows the preselected store summary in Store selection and lets the buyer change it from a store picker modal.
- Submitting a section saves and collapses that section, then expands the next actionable section.
- Editing a submitted section expands only that section, collapses the others, and marks downstream totals as needing recalculation where applicable.
- Collapsed submitted sections show a compact buyer-readable summary plus an Edit action.
- Accordions move focus to the newly expanded step after successful submit or edit.

Checkout steps must define these UI states:

- idle
- saving
- saved/collapsed
- editing
- recalculating totals
- blocked/error
- locked after payment session starts

Before payment session:

- buyer can switch tabs
- Delivery/Pickup states are preserved separately
- Order Summary updates to active tab

After payment session/order:

- active fulfillment mode is locked
- switching requires abandoning current payment attempt

### Delivery Flow

1. Shipping address.
2. Submit shipping address.
3. Billing expands.
4. Same as shipping checked by default.
5. Buyer explicitly submits billing.
6. Shipping options expand.
7. Cheapest option selected by default.
8. Buyer submits shipping option.
9. Payment method expands.

### Pickup Flow

Logged-in buyer uses default address for ranking. Guest enters ZIP/postcode first.

Guest flow:

1. Pickup location expands with ZIP/postcode input.
2. Buyer submits ZIP/postcode.
3. Store picker modal opens with ranked pickup stores.
4. Buyer selects a store in the modal.
5. Store selection collapses to the selected store summary.
6. Billing expands.
7. Buyer explicitly submits billing.
8. Store-specific pickup calendar expands.
9. Buyer selects date and submits.
10. Payment method expands.

Logged-in buyer flow:

1. Store selection starts with the nearest store preselected from the default shipping address, even if partial inventory.
2. Buyer can click Change store.
3. Store picker modal opens with ranked pickup stores.
4. Buyer keeps the preselected store or chooses another store.
5. Buyer submits store.
6. Billing expands.
7. Buyer explicitly submits billing.
8. Store-specific pickup calendar expands.
9. Buyer selects date and submits.
10. Payment method expands.

Store picker modal:

- Opens from guest ZIP/postcode submit or logged-in Change store.
- Uses an accessible dialog with labelled title, close action, keyboard access, and focus return to the triggering control.
- Store cards show store name, address, phone, distance, available item count, unavailable item count, and full/partial inventory status.
- Store cards are selectable controls, not static cards.
- Confirming a selected store updates Pickup Order Summary before payment.

### Partial Pickup

Order Summary has:

- Ready for pickup
- Not available at this store

Unavailable items:

- excluded from BOPIS payment amount
- remain in original cart
- do not decrement store inventory

Store cards must show available and unavailable item counts before the buyer submits the store. If a store is partial, the callout must say that unavailable items stay in the original cart.

## Payment Method UX

Payment section uses radio-first layout.

Rules:

- PayPal selected by default if eligible.
- PayPal selected: standalone PayPal button under Order Summary.
- Pay Later row includes official amount-aware Pay Later message when eligible, tied to the active Delivery/Pickup draft total.
- Pay Later selected: standalone Pay Later button under Order Summary and Pay Later message below.
- Apple Pay selected: official Apple Pay button under Order Summary when eligible.
- Google Pay selected: official Google Pay button under Order Summary when eligible.
- Venmo selected: official Venmo button under Order Summary when eligible.
- Ineligible wallet rows are hidden and do not render Order Summary or sticky actions. Google Pay must stay runtime-gated until the PayPal Google Pay session and Google PaymentsClient are both available.
- Card selected: card fields expand in payment section; card pay button is inside card box.
- Order Summary reserves stable space for selected PayPal, Pay Later, Apple Pay, Google Pay, and Venmo action surfaces.
- Pay Later row message reserves stable space while PayPal eligibility/message rendering finishes.
- Mobile: selected non-card action appears in sticky bottom payment bar.
- Mobile sticky bar shows only one selected non-card payment action at a time.
- Mobile sticky bar reserves space for the selected method label, total, button, and any required Pay Later message without overlapping content.
- Card payment never moves into the sticky bar; its pay button stays inside the card fields box.

Guests cannot save payment methods.

Vaulting:

- Eligible logged-in PayPal selected: unchecked save checkbox under PayPal button.
- Eligible logged-in card selected: unchecked save checkbox inside card box.
- No save checkbox for Pay Later / Apple Pay / Google Pay / Venmo unless official support is confirmed.

## Express Review And Confirm

Applies only to PayPal/Pay Later express started outside full checkout from PDP/cart/minicart.

Route: `/checkout/express-review?paypal_order_id={paypalOrderId}`.

Flow:

1. Buyer clicks PayPal/Pay Later express.
2. Backend creates delivery PayPal order.
3. PayPal shipping/order update flow settles address, shipping, promo, tax, and amount.
4. Buyer returns to merchant Review and Confirm.
5. Page loads `GET /api/paypal/orders/express-review` and shows final synchronized item, shipping, promo, tax, total, and amount-guard snapshot.
6. Buyer confirms.
7. Backend verifies the locked amount snapshot and captures.
8. Successful capture updates the order/payment-session state, writes Admin/debug snapshots, decrements inventory, and clears only paid cart items.

Full checkout does not add a separate Review and Confirm page.

## Promo, Tax, Shipping

### Calculation Order

1. Product `current_price`.
2. Merchandise subtotal.
3. Promo discounts on merchandise subtotal only.
4. Taxable merchandise subtotal after eligible promos.
5. Estimated tax.
6. Shipping fee.
7. Final total.

Shipping fee is excluded from promo and tax calculations.

### Promo UX

- Inline in Order Summary.
- "Add promo code" collapsed behind link.
- One eligible promo set auto-applies, buyer can remove/change.
- Multiple valid sets show recommended best option and alternatives.
- Manual code shows accepted/rejected/conflict result.
- Recalculation states should use plain language such as "Checking offers for this address..." and must not block unrelated form edits.
- Buyer-facing promo explanations stay concise; Admin Portal shows detailed selected/rejected promo reasons.

Promo evaluation snapshots store matched/rejected promos, compatible sets, discount amounts, taxable effects, totals, and timestamp/version.

## Orders

- Order is created when payment session/order is created.
- Pending means payment session started but not completed.
- Cart is not an order.
- Checkout draft is not an order.

Completed payment:

- clears paid active cart items
- decrements central inventory for delivery
- decrements selected store inventory for paid BOPIS items

Pending resume:

- uses pending order snapshot, not current active cart
- revalidates item availability, prices, inventory, shipping/pickup details, pickup date, tax, and promos
- creates fresh payment session if existing one is expired/invalid

## Account And Guest

### Auth

Email-first modal:

- enter email
- existing account shows password
- new account shows password registration
- registration collects email and password only

### Guest Checkout

- Guests can complete delivery and BOPIS checkout.
- Guests cannot vault/save payment methods.
- Guest lookup uses order number + email.
- Guest order detail is read-only.
- Confirmation page encourages inline account creation.
- After registration/login with verified email, matching guest orders link to account.

### Account Settings

Sections:

- Profile info
- Address book
- Saved payment methods
- Order history
- Reviews submitted

Address book:

- shared across profiles
- one address can be default shipping and billing
- default address cannot be deleted until another default is selected
- checkout save-to-address-book checkbox checked by default

Saved payment:

- user-level, shared across profiles
- capture can create active or pending saved-payment states for authenticated save-for-future buyers
- verified vault-created webhooks promote pending saved payments to active
- delete action calls PayPal Payment Method Tokens delete when a vault ID exists
- verified vault-deleted webhooks reconcile deleted local state
- simple confirmation dialog

Order detail:

- buyer-facing with status timeline
- no technical IDs

## Reviews

- PDP shows seeded and submitted reviews.
- Reviews are product-scoped.
- Buyer submits reviews from completed order detail only.
- One active review per user/order item.
- Buyer can edit/delete reviews.
- Deleting reopens review eligibility.

## Inventory

- Central inventory for delivery.
- Store inventory for BOPIS.
- No true reservation during checkout.
- Delivery paid order decrements central inventory.
- BOPIS paid order decrements selected store inventory for paid pickup items.
- Inventory is revalidated before payment and on pending resume.

## BOPIS Payment Semantics

Pickup checkout uses a capture-at-checkout PayPal order with explicit store pickup Create Order fields. The buyer flow must not route through the authorize-at-checkout/capture-at-pickup pattern in v1.

Required Create Order semantics:

- `intent: "CAPTURE"`
- `shipping_preference: "SET_PROVIDED_ADDRESS"` under PayPal experience context
- `purchase_units[].shipping.type: "PICKUP_IN_STORE"`
- selected store address as the purchase unit shipping address
- receiver name formatted as `s2s ${storeName}`

## Admin Portal

Route: `/admin`.

Access:

- hidden from buyer UI
- manual route entry
- simple env/config passcode
- React admin shell
- backend-protected admin APIs
- admin session separate from buyer auth

Scope:

- global profile switch
- global market switch
- orders and lifecycle controls
- BOPIS store inventory and pickup date controls
- payment/order debug details
- verified webhook viewer
- runtime debug logs

Information architecture:

- Orders: list, filters, status, fulfillment mode, payment status, and order detail.
- Order detail: buyer/order summary, lifecycle timeline, total snapshots, promo evaluation lines, PayPal snapshot, inventory effect, and linked webhooks.
- Webhooks: event list, verification status, linked order/payment session, processing result, and sanitized payload viewer.
- Inventory: central inventory, store inventory, partial pickup scenarios, and pickup date capacity.
- Lifecycle: manual delivery and pickup state controls with audit notes.
- Debug: sanitized runtime logs and amount comparison snapshots.

No admin user switcher. No reset tools in v1.

Manual lifecycle:

- Delivery: paid -> processing -> shipped -> delivered
- Pickup: paid -> preparing pickup -> ready for pickup -> picked up

## Data Model Notes

Profile-scoped:

- products
- categories
- reviews through products

Market reference data shared across profiles:

- markets
- stores
- pickup dates
- tax rules
- shipping options

Profile-and-market scoped:

- product prices
- inventory
- carts
- checkout drafts
- orders
- promos
- homepage content

User-level/shared:

- auth users
- addresses
- saved payment methods

Order snapshots store addresses, item prices, fulfillment mode, inventory context, promo evaluation, tax, shipping, and totals.

## Visual QA Gates

- Check responsive screenshots at 375px, 768px, 1024px, and 1440px.
- Required screenshot pages: homepage, category, PDP, cart, minicart, delivery checkout payment step, pickup checkout partial inventory step, express Review and Confirm, order confirmation, account order detail, and Admin order detail.
- Verify POP MART profile reads as playful premium collectible retail, not a generic white/red ecommerce shell.
- Verify the multi-accent palette is controlled and section-based: no page-wide rainbow effect, no generic blue/amber/cream inheritance, and no childish clutter.
- Verify product/category cards, badges, release calendar, promo cards, and pickup store cards use the tactile/sticker/store-ticket language defined above.
- Verify sticky header and sticky payment bar do not cover content.
- Verify all text fits inside buttons, cards, accordions, and payment rows.
- Verify PayPal buttons/messages render without causing major layout shift.
- Verify official PayPal buttons/messages remain visually stable, readable, and undistorted after the playful visual refresh.

## Open Decisions

- Exact PayPal JS SDK v6 APIs for each payment method.
- Exact PayPal vaulting support per method.
- Exact PayPal Apple Pay / Google Pay prerequisites.
- Exact Venmo sandbox support and eligibility behavior.
- Final Supabase schema naming and RLS model.

## Future Phases

- Fastlane
- preorder payment semantics
- subscriptions/recurring
- disputes/refunds
- native iOS/Android apps
- scheduled pricing
- reset/reseed tooling
- alternate authorize-at-pickup BOPIS scenario, only if explicitly requested

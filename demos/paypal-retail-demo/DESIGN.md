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

1. Rank stores.
2. Preselect nearest store even if partial inventory.
3. Buyer submits store.
4. Billing expands.
5. Buyer explicitly submits billing.
6. Store-specific pickup calendar expands.
7. Buyer selects date only.
8. Payment method expands.

### Partial Pickup
Order Summary has:
- Ready for pickup
- Not available at this store

Unavailable items:
- excluded from BOPIS payment amount
- remain in original cart
- do not decrement store inventory

## Payment Method UX
Payment section uses radio-first layout.

Rules:
- PayPal selected by default if eligible.
- PayPal selected: standalone PayPal button under Order Summary.
- Pay Later row includes official Pay Later message when eligible.
- Pay Later selected: standalone Pay Later button under Order Summary and Pay Later message below.
- Apple Pay selected: official Apple Pay button under Order Summary when eligible.
- Google Pay selected: official Google Pay button under Order Summary when eligible.
- Venmo selected: official Venmo button under Order Summary when eligible.
- Card selected: card fields expand in payment section; card pay button is inside card box.
- Mobile: selected non-card action appears in sticky bottom payment bar.

Guests cannot save payment methods.

Vaulting:
- PayPal save checkbox under PayPal button.
- Card save checkbox inside card box.
- No save checkbox for Pay Later / Apple Pay / Google Pay / Venmo unless official support is confirmed.

## Express Review And Confirm
Applies only to PayPal/Pay Later express started outside full checkout from PDP/cart/minicart.

Flow:
1. Buyer clicks PayPal/Pay Later express.
2. Backend creates delivery PayPal order.
3. PayPal shipping/order update flow settles address, shipping, promo, tax, and amount.
4. Buyer returns to merchant Review and Confirm.
5. Page shows final synchronized snapshot.
6. Buyer confirms.
7. Backend captures.

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
- delete action calls PayPal revoke/delete token API where supported
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

No admin user switcher. No reset tools in v1.

Manual lifecycle:
- Delivery: paid -> processing -> shipped -> delivered
- Pickup: paid -> preparing pickup -> ready for pickup -> picked up

## Data Model Notes
Profile-scoped:
- products
- categories
- stores
- inventory
- carts
- orders
- reviews through products
- promos
- tax rules
- shipping options
- homepage content

User-level/shared:
- auth users
- addresses
- saved payment methods

Order snapshots store addresses, item prices, fulfillment mode, inventory context, promo evaluation, tax, shipping, and totals.

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

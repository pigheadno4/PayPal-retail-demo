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

## UI/UX Implementation Guide

This section is the frontend source of truth. Frontend work must follow these rules before a milestone or slice can be marked complete.

### Design Authority

- `DESIGN.md` owns buyer and Admin UI/UX decisions.
- `IMPLEMENTATION_TASKS.md` owns sequencing, but cannot override the visual or interaction contracts here.
- `tracking/test-cases.md` must include a UX acceptance row for every customer-facing page or meaningful component slice.
- If implementation discovers a design gap, update this file first, then update tasks/tests.
- Do not treat a rendered component as complete unless it matches the page contract, state contract, and visual language here.

### Chosen POP MART Direction

Use `ui-ux-pro-max` as a reference, but do not copy every generated recommendation blindly. For this demo:

- Adopt: e-commerce-clean typography, vibrant/block retail hierarchy, bento-like product modules, tactile toy-like cards, sticker badges, and restrained micro-interactions.
- Avoid: Liquid Glass as a primary system, heavy blur, iridescent gradients, low-contrast translucent panels, large decorative orbs, and generic red/white ecommerce shells.
- Preserve: PayPal official button/message containers exactly enough that SDK-rendered surfaces stay readable, stable, and undistorted.

### POP MART Design Tokens

Use these tokens as the starting point for CSS variables. Add new tokens only when a real component need is not covered.

Colors:

- `--pm-coral-red: #f42434` for primary retail CTAs, active nav, urgent drops.
- `--pm-candy-pink: #ff8ab3` for surprise/reveal accents and soft feature backgrounds.
- `--pm-lemon: #ffd75a` for new-drop markers, calendar highlights, and cheerful badges.
- `--pm-mint: #4ecf9a` for pickup availability, success, and ready states.
- `--pm-sky: #82cfff` for informational panels and payment-support surfaces.
- `--pm-lavender: #bda7ff` for account/order secondary accents.
- `--pm-warm-white: #fff8f3` for page background.
- `--pm-card: #ffffff` for primary cards and forms.
- `--pm-ink: #161616` for body text.
- `--pm-muted: #67615f` for secondary text.
- `--pm-border: #eadfda` for card borders and separators.
- `--pm-error: #a6111f` for destructive/error states.

Typography:

- Preferred web fonts: Rubik for headings, Nunito Sans for body/UI.
- Fallback: system sans-serif with the same weight scale.
- Headings should feel round and confident; avoid thin SaaS typography.
- Do not use viewport-width font sizing. Use fixed/rem/clamp ranges with clear min/max.
- Letter spacing should be `0` by default. Use uppercase labels sparingly.

Geometry and spacing:

- Page max width: 1200px for storefront/account pages unless a page contract says otherwise.
- Compact panels: 8px radius.
- Product/category/order/account cards: 12-14px radius.
- Tactile hero/category modules: 16px radius maximum.
- Official payment containers: use stable dimensions and do not add decorative deformation.
- Section spacing: 40-56px desktop, 28-36px mobile.
- Card gap: 12-20px depending on density.

Shadows and borders:

- Use soft retail depth: `0 10px 28px rgba(22, 22, 22, 0.08)` for elevated cards.
- Use subtle inset or border highlights for selected cards.
- Avoid dark heavy shadows, glass blur, and shadow-only affordances.

Motion:

- Hover/focus transitions: 150-300ms.
- Active button press may use color/brightness or slight inset shadow; avoid layout-shifting scale by default.
- Use `prefers-reduced-motion` to remove non-essential animation.
- Loading states for waits over 300ms must show skeleton, spinner, or disabled button label.

### Component Contracts

Buttons:

- Primary retail actions use coral red fill with high-contrast text.
- Secondary actions use white fill, coral border/text, and clear hover/focus states.
- Destructive actions are text or outline actions unless inside a confirmation dialog.
- Disabled buttons must show disabled styling and a reason when the action is important.
- Async submit buttons must disable during submission and change label or show spinner.

Badges and status chips:

- Use sticker-like chips for retail status: `New drop`, `Limited`, `Hot`, `Low stock`, `Ready for pickup`, `Pending payment`, `Delivered`, `Review available`.
- Chips must include text; color alone is never enough.
- Use one dominant chip per card plus secondary chips only when needed.

Cards:

- Product cards emphasize image, title, current/regular price, release status, and primary action.
- Account/order cards emphasize buyer task and status, not raw database structure.
- Store cards use a ticket style with address, phone, distance, available count, unavailable count, and partial-inventory callout.
- Cards that are clickable need pointer cursor, visible hover/focus, and accessible names.

Forms:

- Use visible labels for every input.
- Do not rely only on browser-native validation tooltips for demo-critical forms.
- Field errors must render inline and be announced with `role="alert"` or `aria-live`.
- Required fields should be marked with text or helper copy, not color alone.
- Account and checkout forms should preserve entered values on recoverable errors.

Loading, empty, and error states:

- Loading: use skeleton blocks or a compact spinner plus plain-language copy.
- Empty: explain what is missing and offer the next action when one exists.
- Error: show what failed, whether retry is possible, and avoid exposing secrets or raw stack traces.
- API-backed UI must cover loading, success, empty, and failure states in tests or manual evidence.

Official payment surfaces:

- Use official PayPal SDK-rendered buttons/messages where promised.
- Reserve stable layout space before SDK hydration.
- Do not restyle official buttons in a way that distorts brand shape, color, label, or eligibility behavior.
- For Pay Later, use brief non-amount marketing copy on homepage/category and amount-aware messages on PDP/cart/minicart/checkout.

### Page-Level Contracts

Homepage:

- First viewport must feel like a collectible drop, not a generic marketplace.
- Hero is image-led with direct product/drop context.
- Hot sales, categories, release calendar, promo cards, and popular series must use distinct but restrained accent identities.
- Pay Later homepage copy is brief and non-amount-specific.

Category:

- Filter controls must be scan-friendly and show active counts.
- Product grid must preserve image dominance.
- Empty filtered state needs a reset action.
- Pickup availability filters stay disabled with a hint until a location context exists.

Product detail:

- PDP should feel like inspecting a collectible: large gallery, thumbnail rail, concise story/details, status badge, price, and action hierarchy.
- Unreleased products remain viewable but all checkout/payment actions are blocked or hidden with clear reason.
- PDP has no pickup hint.

Cart and minicart:

- Keep the payment/action area compact. Do not add competing pickup buttons.
- Pickup is communicated as text hint only: buyer chooses Pickup during checkout.
- Quantity controls must be obvious, stable, and connected to server-backed cart state.
- PayPal/Pay Later express actions are delivery-only and must be official SDK surfaces.

Checkout:

- Use playful accents only for orientation: step badges, selected summaries, store tickets, promo/status callouts.
- Payment method rows and official PayPal surfaces must remain calm, stable, and readable.
- Only one accordion section is expanded at a time.
- Every collapsed saved section needs a concise buyer-readable summary and Edit action.
- Order Summary must update immediately for buyer-selected options when possible, then reconcile with backend totals.

Account settings:

- Account must feel like a buyer account hub, not an admin panel.
- Provide account-level navigation for `Orders`, `Addresses`, `Payments`, `Profile`, and later `Reviews`.
- Address cards should show label, recipient, formatted address, default badges, and actions with disabled reasons.
- Add/edit address should use a polished form panel or modal with inline validation, not browser tooltip-only validation.
- Saved payment rows should show payment type, status, and delete action with confirmation when destructive.

Order history and order detail:

- Order history uses retail cards, not a dense table.
- Each order card shows order number, date, fulfillment mode, status chip, total, thumbnail strip, and primary CTA.
- Pending orders show `Resume payment` as the primary CTA.
- Completed orders show `View details` and later `Review items` where eligible.
- Order detail shows a buyer-facing timeline: placed, payment, processing, shipped/delivered or pickup ready/completed.
- Do not show technical PayPal IDs, payment-session IDs, or internal database IDs in buyer order detail.

Guest order lookup:

- Lookup form asks for order number and email.
- Empty, invalid, not-found, and found states must be explicit.
- Guest order detail is read-only and should encourage account creation after successful lookup.

Admin Portal:

- Admin can be denser and more utilitarian than buyer UI.
- Admin still needs readable tables, filters, loading states, and sanitized debug views.
- Do not let Admin visual style leak into buyer account screens.

### Detailed Page Implementation Specs

These specs turn the page contracts above into implementation guidance. When a page is touched, use the matching section as the UI checklist.

Global app shell:

- Header uses a clean retail layout: logo left, primary nav centered or left-aligned by viewport, account/cart actions right.
- Header should not expose admin or demo labels in buyer mode.
- Cart button shows a live count from the active server-backed cart.
- Active route state is visible through coral underline/fill, not only text weight.
- Mobile header may collapse nav, but cart and account entry remain reachable in one tap.
- Global status messages use a polite live region or toast area and should read like buyer support copy, not logs.

Homepage:

- First viewport includes a collectible drop hero with real product/collection imagery, short launch copy, and one primary shopping action.
- Hero should hint at the next section on desktop and mobile so the page feels browsable, not like a static landing page.
- Hot sales use product cards with image, title, current/regular price, release status, and one dominant action.
- Category shelf uses tactile category modules with image, short category label, and item count or short description.
- Release calendar uses outlined circles for release dates, selected-date details, PDP links, and a text legend.
- Brief Pay Later message is amount-free and should not compete with merchandise modules.
- Loading state uses skeleton hero/cards; empty curated sections show fallback curated copy and keep layout stable.

Category page:

- Top area shows current category/all-products context, category switcher with `All options`, sort control, and applied-filter count.
- Filter controls use chips or a compact drawer; selected filters remain visible after apply.
- Product grid keeps consistent image ratio and stable card height for sale/current price, release status, and unavailable states.
- Pickup availability filter stays disabled until location context exists and includes a concise reason.
- Empty filtered state shows the applied filters, a reset action, and a link back to all products.
- Pay Later copy is brief and amount-free.

Product detail page:

- Desktop layout is gallery left and purchase panel right; mobile places gallery first, then purchase panel.
- Gallery includes one large image, 3-4 thumbnails, keyboard-selectable thumbnails, and image alt text based on product/series.
- Purchase panel order is title, category/status chips, short intro, current/regular price, product facts, Pay Later message, add-to-cart, official express actions.
- PDP does not show pickup hint or store selection.
- Future/unreleased PDP shows status and release date, blocks add-to-cart and express actions with clear reason, and hides reviews.
- Reviews render only for released products and stay below the purchase decision area.

Cart page:

- Cart items use row cards: image, title, variant/status, quantity stepper, current/regular line price, remove action, and inline item error when needed.
- Quantity changes are optimistic only while the server request is in flight; failed updates roll back or preserve input with retry copy.
- Order summary shows merchandise subtotal, promo, tax, shipping placeholder or selected shipping, and total.
- Pay Later amount message uses current cart amount and updates when quantity changes.
- Express PayPal/Pay Later buttons are official delivery-only SDK surfaces.
- Pickup appears only as a text hint: `Prefer pickup? Choose store pickup during checkout.`

Minicart:

- Drawer is anchored inside the viewport on desktop and mobile; open drawer should not mount offscreen.
- Each item row includes thumbnail, title, quantity stepper, line amount, and remove/decrement behavior.
- Action area contains View cart, Checkout, official PayPal delivery express, official Pay Later delivery express, amount-aware Pay Later message, and pickup hint.
- Keep button density under control: no pickup button and no duplicate checkout action labels.
- Empty state shows a friendly message and one return-to-shopping action.

Checkout Delivery:

- Initial state expands Shipping address only.
- Shipping address form shows saved/default address when available, otherwise editable fields.
- Submit disables the button immediately, shows saving/recalculating copy, saves through backend, collapses to summary, and expands Billing.
- Billing starts with `same as shipping` checked after shipping is saved; buyer can uncheck to reveal separate fields.
- Billing submit follows the same immediate saving/collapse/edit pattern and expands Shipping options.
- Shipping options start unsaved; cheapest eligible option is selected by default after destination is known.
- Changing a shipping option updates Order Summary immediately, then backend reconciliation is reflected after submit.
- Payment method section opens only after required delivery steps are saved.
- Official payment action appears only when Payment is active and a method radio is selected.

Checkout Pickup:

- Guest initial state shows ZIP/postcode input only; no default-address checkbox, no preselected store, and no store summary.
- Guest submits ZIP/postcode, then an accessible store-list modal opens with active-market stores only.
- Logged-in buyer starts with nearest/default-address store preselected and a Change store action.
- Store list cards show name, address, phone, distance, available count, unavailable count, and full/partial inventory status.
- Selecting a partial store updates Order Summary with ready-for-pickup and not-available-at-this-store sections before payment.
- Billing follows store selection and uses the buyer default address for logged-in buyers when appropriate; guests fill billing address.
- Pickup calendar appears after billing, uses store-specific pickup dates, and blocks unavailable/past dates.
- Payment method section opens only after store, billing, and pickup date are saved.

Express Review and Confirm:

- Used only for PayPal/Pay Later express started from PDP, cart, or minicart.
- Page shows final synchronized items, shipping address, selected shipping option, promo, tax, total, and amount-guard status.
- Confirm button is the only action that triggers capture.
- If amount guard fails, keep capture blocked and show buyer-safe retry/support copy plus merchant debug reference.
- Success state shows buyer-facing order number and next-step delivery message, not raw provider IDs.

Account settings:

- Account uses buyer hub navigation: Orders, Addresses, Payments, Profile, and later Reviews.
- Profile panel shows email and lightweight account info without admin/internal IDs.
- Address cards show label, recipient, formatted address, default shipping/billing badges, Edit, Delete, and Make default actions.
- Add/edit address uses inline validation and a checked-by-default `Save to address book` behavior where relevant checkout flows later hand off to account.
- Deleting a default-only address is disabled with reason; destructive delete asks for confirmation.
- Saved payment cards show method type, display name/last digits where available, status, and delete with confirmation.

Order history:

- Order history uses retail cards instead of tables.
- Each card shows order number, date, fulfillment mode, status chip, total, thumbnail strip, and one primary CTA.
- Pending orders show Resume payment and explain that totals/promos may be refreshed.
- Completed orders show View details and Review items when eligible.
- Empty order history invites browsing products and, for guests, suggests guest lookup if they checked out without an account.

Order detail:

- Detail page shows timeline, fulfillment summary, item list, totals breakdown, payment status, and review eligibility.
- Delivery orders show shipping address, selected option, and delivery lifecycle.
- Pickup orders show store, pickup date/window, ready/unavailable split when applicable, and pickup lifecycle.
- Completed order item rows expose review action only once per item unless editing is supported.
- Technical IDs stay hidden from buyer detail; Admin/debug pages can expose sanitized provider references.

Guest order lookup:

- Form asks for order number and email with visible labels and inline validation.
- Not-found response is the same for wrong email and missing order number.
- Found state shows read-only order detail and account-registration encouragement.
- Loading and retry states preserve entered values.

Admin Portal:

- Admin route stays manually reachable through `/admin`; no buyer header label is needed.
- Admin surfaces orders, webhooks, inventory, and lifecycle only in v1 scope.
- Admin uses denser tables, filters, copied debug IDs, sanitized PayPal snapshots, and lifecycle actions.
- Admin does not adopt toy-like buyer styling beyond basic brand coherence.

### UX Flow Contracts

These flows must be reflected in tests and browser evidence when implemented.

Account sign-in/register:

- Entry: Sign in button, checkout account prompt, or confirmation-page registration prompt.
- Email-first modal checks whether the email exists.
- Existing email shows password sign-in; new email shows password registration.
- Successful sign-in/register restores session, merges guest cart into account cart, and keeps the buyer on the same route.
- Failure keeps the modal open, preserves email, and shows inline buyer-safe error.

Cart persistence and checkout entry:

- Guest browser stores only opaque `cart_public_id` and `cart_client_secret`.
- Refresh, route navigation, minicart open, checkout entry, and express entry all restore or refresh server cart before using totals.
- Missing or incomplete cart binding blocks checkout/payment with buyer-safe "cart is syncing" copy instead of fixture IDs.

Delivery checkout accordion:

- Shipping saved -> Billing editing -> Billing saved -> Shipping option editing -> Shipping option saved -> Payment editing.
- Edit on a saved section expands only that section and collapses others.
- Editing an upstream section marks downstream totals as recalculating or stale until backend reconciliation completes.
- Order Summary updates immediately for local choices where safe, then reconciles to backend totals.

Pickup checkout accordion:

- Guest ZIP/postcode -> store modal -> selected store summary -> billing -> pickup calendar -> payment.
- Logged-in preselected store -> optional Change store modal -> submit store -> billing -> pickup calendar -> payment.
- Partial inventory stays visible in store picker and Order Summary before payment.
- Original cart intent remains intact when unavailable pickup items are excluded from payable amount.

Payment method selection:

- Payment rows appear only in the Payment section.
- PayPal selected renders only PayPal official action under Order Summary.
- Pay Later selected renders Pay Later official action and amount-aware Pay Later message under Order Summary.
- Card selected expands card fields and pay button inside the payment section, never in mobile sticky bar.
- Wallet rows render only when runtime eligible and hide otherwise.

Pending order resume:

- Entry: Order history Pending card.
- Resume loads the order snapshot, revalidates prices, inventory, pickup dates, shipping, tax, and promos.
- Expired pickup dates require a new date before payment.
- Promo evaluation runs fresh and explains changed accepted/rejected results.
- Resume payment creates a fresh payment session when the old one is expired or invalid.

Completed order review:

- Entry: completed order card or order detail item row.
- Buyer can review only items from completed orders.
- Review form is item-scoped, preserves draft input on failure, and updates PDP review display after success.
- If editing/deleting reviews is not implemented yet, the UI must say so through absence of controls, not broken buttons.

Guest order lookup and registration:

- Guest searches with order number and email.
- Found order stays read-only.
- Confirmation and found lookup states encourage account creation.
- Registering with the same email links matching guest orders to the account after verification/login.

### Frontend Slice Acceptance Gate

Before any frontend slice is closed:

- `DESIGN.md` page/component contract has been checked and updated if needed.
- `tracking/test-cases.md` has acceptance rows for visual state, interaction state, async loading/error state, and responsive behavior.
- Component or interaction tests cover important state transitions where practical.
- Computer Use or Browser/Playwright evidence is captured for customer-facing pages.
- Screens are checked at minimum 375px mobile and 1024px desktop for the touched area.
- Official PSP surfaces are verified in browser when the slice touches PayPal, Pay Later, card, Apple Pay, Google Pay, or Venmo placement.
- Any shell-only UI remains unchecked in `IMPLEMENTATION_TASKS.md` and explicitly deferred in tracking.

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
- quantity controls for each editable line item
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
- Pickup guest state must not show a selected store, default-address checkbox, or store summary before the buyer submits ZIP/postcode and confirms a store from the modal.
- Pickup seeded defaults must match the active market; US checkout must not show GB postcode/store defaults, and GB checkout must not show US ZIP/store defaults.
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
3. Store picker modal opens with ranked pickup stores for the active market.
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
- Filters/ranks stores from the active market only.
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

1. Buyer clicks the official PayPal/Pay Later express button.
2. The SDK create-order callback sends the active cart public binding and backend creates a delivery PayPal order.
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

# POP MART Reference Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lift the PayPal retail demo Home, Category, PDP, Cart, Minicart, Checkout, Order Confirmation, and Account pages to the approved premium figure-shop reference quality while staying POP MART-specific and payment-safe.

**Architecture:** Treat `demos/paypal-retail-demo/DESIGN.md` as the visual and interaction contract, `demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md` as the canonical checklist, and this plan as the concrete M16 execution guide. Before additional page polish, adopt a shadcn component foundation for repeated primitives while preserving custom POP MART ecommerce page composition. Do not replace pages wholesale with generic shadcn page blocks. Do not add fake search, fake preorder economics, fake ratings, fake official authenticity claims, fake social login, or unsupported PayPal behavior just to match the screenshots.

**Tech Stack:** Vite React, TypeScript, shadcn source-owned UI primitives, Vitest server-rendered component tests, Playwright or Computer Use visual QA, existing local POP MART assets, PayPal SDK-rendered buttons/messages.

---

## File Map

- Modify: `demos/paypal-retail-demo/web/src/app/App.tsx`
  - Owns buyer shell structure, header actions, navigation, route rendering, minicart trigger, account trigger, PayPal render callbacks.
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`
  - Owns POP MART tokens, responsive page layout, header/footer styling, product card density, gallery layout, cart/minicart/checkout polish.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/HomePage.tsx`
  - Owns Home module order: hero, trust strip, release/calendar plus product shelf, category shelf, promo rail, series rail, footer content.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/HomePage.test.tsx`
  - Proves Home module order, generated asset fallback, no old fixture text, amount-free Pay Later copy, and calendar accessibility.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/CategoryPage.tsx`
  - Owns catalog hero, filter summary, compact filter/sort controls, product card merchandising, category Pay Later message slot.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/CategoryPage.test.tsx`
  - Proves unsupported filters are hidden, applied filters are visible, Pay Later copy stays amount-free, and product cards carry price/status/pickup data.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/ProductDetailPage.tsx`
  - Owns PDP gallery, breadcrumb, status/vendor/review summary, price/CTA panel, Pay Later message, delivery express surfaces, details tabs.
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/ProductDetailPage.test.tsx`
  - Proves released/unreleased PDP hierarchy, official-message fallback slot, blocked purchase states, no pickup hint, and gallery thumbnail behavior.
- Modify: `demos/paypal-retail-demo/web/src/features/cart/CartPage.tsx`
  - Owns full cart row cards, summary hierarchy, Pay Later amount message placement, delivery express surfaces, pickup hint only.
- Modify: `demos/paypal-retail-demo/web/src/features/cart/MinicartShell.tsx`
  - Owns drawer separation, item density, primary Checkout action, secondary View cart, consolidated SDK pending state.
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
  - Owns empty/payment-pending explanations, mobile order context, and readable payment rows.
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/ExpressReviewPage.tsx`
  - Owns express Review and Confirm plus post-capture/order-confirmation hierarchy.
- Modify: `demos/paypal-retail-demo/web/src/features/account/AccountPage.tsx`
  - Owns account settings, order history/detail, guest lookup, and account/signup surfaces.
- Modify tests beside each touched file.
- Update after implementation: `demos/paypal-retail-demo/tracking/progress.md`, `demos/paypal-retail-demo/tracking/test-cases.md`, and `demos/paypal-retail-demo/tracking/todos.md`.

## Data And Truth Constraints

- Product imagery must come from API-backed catalog data or `defaultHomePageData` fallback paths under `/assets/popmart/products/`.
- shadcn components are a primitive layer, not a page-template replacement. Use shadcn for buttons, cards, badges, separators, skeletons, sheets, dialogs, tabs, accordions/collapsibles, scroll areas, and forms before building custom equivalents.
- Keep Home, Category, PDP, Cart, Minicart, Checkout, Order Confirmation, and Account layouts custom to this demo's ecommerce behavior unless a shadcn block exactly matches the documented behavior and can be adapted without fake capabilities.
- Header search must not be an inert text box. If keyword search is implemented, first add API/query support and tests. Otherwise use navigation, category switcher, and sort/filter controls as the supported discovery model.
- Preorder economics panel must only show deposit, remaining balance, or estimated release when those fields exist in product data. If only release status/details exist, render a release-state facts panel instead.
- Rating summary must derive from real review data. If there are no reviews, show no fake score; use `New drop`, `Released`, or `Coming soon` status instead.
- Trust strip copy must use implemented demo capabilities only: Delivery, Pickup in checkout, PayPal checkout, Pay Later where eligible, account/order recovery, and support/help navigation if linked.
- Official PayPal buttons/messages must remain SDK-rendered and visually undistorted. Local fallback copy is allowed only while SDK/config is loading or unavailable.
- Social sign-up buttons may render only as disabled/demo-safe alternatives unless OAuth is implemented. Do not imply working Google/Facebook/Apple auth unless wired.
- Confirmation/order pages should show buyer-safe order numbers, payment status, fulfillment estimate, order details, and next actions. Do not expose internal database IDs or raw debug fields.

## shadcn Foundation Gate

Complete this gate before continuing unchecked page-polish tasks below.

- [x] Initialize/adopt shadcn-compatible project config, aliases, and styling integration for the Vite React app.
- [x] Add and review only the primitives needed for near-term M16 work: `Button`, `Card`, `Badge`, `Separator`, `Skeleton`, `Sheet`, `Dialog`, `Tabs`, `Accordion`/`Collapsible`, `ScrollArea`, and form field primitives.
- [ ] Create thin demo-local wrappers only where they reduce churn or preserve POP MART tokens, accessibility, and existing route behavior.
- [ ] Migrate repeated primitives before page-specific polish: buyer shell actions, cards/panels, empty states, loading states, auth/save-order dialogs, minicart/mobile-filter sheets, PDP/account tabs, checkout/mobile accordions, and forms.
- [x] Keep official PayPal buttons, Pay Later buttons, PayPal messages, and SDK custom elements SDK-rendered. shadcn may wrap/layout those surfaces but must not replace or restyle them into non-official buttons.
- [ ] Verify the foundation with focused component tests, typecheck, lint, and a small browser visual pass before continuing page-specific polish.

## Reference Page Targets

The user's Sakura reference screenshots and `sakura_figure_shop_design.md` design file add these durable system targets. Adapt them to the POP MART demo; do not copy Sakura branding, anime IP, Japanese copy, or unsupported capabilities.

### Reference Design System Extract

- Visual tone: premium, calm, collector-focused, organized, cute but not childish, and closer to a refined collectible magazine than a chaotic anime store.
- Color direction: deep navy/ink for header/navigation/major hierarchy, warm gold for primary CTAs/prices/active states, cream-white for content-heavy surfaces, soft blush/pink only as restrained decorative support.
- Typography direction: premium display serif can be used for hero/page titles if loaded locally or safely via existing app font strategy; body/UI remains clean sans-serif. Product metadata, forms, tables, and payment rows should stay sans-serif and highly readable.
- Layout direction: content width may stretch beyond the previous 1200px when the page needs ecommerce density; target 1280-1440px for desktop reference-level pages if the existing shell can support it without breaking other routes.
- Card direction: white cards with subtle warm borders, 14-16px product-card radii, 16-20px page-card radii only where the component is genuinely a large page panel, and soft navy-tinted shadows. Do not nest cards inside cards.
- Product imagery direction: product-card images use stable 4:5 or square containers, PDP main image uses 1:1 or 4:5, mini-cart thumbnails stay 1:1, and image containers should be consistent enough to prevent layout jump.
- Badge direction: short status labels only, usually one or two per card. `Pre-order`, `In stock`, `New`, `Low stock`, and sale states must use text as well as color.
- Trust direction: trust benefits can repeat on Home, PDP, Cart, Checkout, and Footer, but copy must stay limited to implemented demo capabilities or PSP-confirmed behavior.
- Responsive direction: desktop uses full header and two-column PDP/cart/checkout layouts; tablet reduces grids; mobile stacks PDP, converts category filters to compact controls/drawer, and makes cart rows vertical cards.

### Reference Page Targets

The latest reference collage adds these page-level quality targets:

- Checkout: left-side step cards for shipping address, shipping method, and payment; right-side order summary with item thumbnails, coupon entry, subtotal/shipping/tax/total, primary Place Order action, and bottom trust strip. The page should feel calm, secure, and retail-grade.
- Order confirmation: large success icon and thank-you hierarchy, hero product/character art, order number card, confirmation email note, order details grid, recommended products, and clear View Order / Continue Shopping actions.
- Cart: table-like item rows with product thumbnails, price, quantity stepper, line total, remove/save controls, summary card, PayPal checkout surface, trust badges, and a free-shipping/progress promo banner.
- Category: sidebar categories and filters, breadcrumb, dense product grid, sort and filter controls, product cards with pre-order/in-stock badges, favorite action, price, pagination, and subtle decorative corner art.
- Account/sign-up: split composition with character art and benefits on the left, tabbed sign-up/login form on the right, clean fields, terms checkbox, primary account action, disabled or implemented social-auth options, and existing-account link.
- Detailed PDP: vertical thumbnail rail, large image with gallery controls, breadcrumb, badge/title/brand/reviews, official/licensed chips only if truthful, concise description with read-more affordance, dense product fact grid, right-side sticky purchase/preorder panel, quantity stepper, primary preorder/add-to-cart action, secondary wishlist/notify action, trust grid, lower tabbed content with description/details/gallery/reviews/Q&A, customer review histogram, recommendation rail, and recently-viewed rail.

### Generated Concept Mockup Translation

The generated UX concept mockups are not runtime screenshots, but they clarify the target hierarchy for this implementation slice:

- Home: deep retail shell, image-led drop hero, trust strip, release/product modules visible below the hero, category shelf, promo cards, series rail, and footer depth.
- Category/PLP: breadcrumb, compact filter/sidebar controls, visible applied filter state, dense image-led product grid, short badges, sort/filter affordances, and pagination.
- PDP: vertical desktop thumbnail rail, stable hero gallery, truthful chips, concise description, dense fact grid, right-side purchase/preorder rail, trust grid, detail tabs, and real-data-only review/recommendation rails.
- Cart: full page item table/card hybrid, summary/trust/payment rail, optional free-shipping/progress banner only when supported, and no minicart-style overlay behavior.
- Minicart: distinct right drawer or mobile sheet with overlay, compact item list, sticky action area, Checkout first, View cart second, compact Pay Later/PayPal surfaces, and pickup as text hint only.
- Checkout: secure-checkout label, left step cards, right order summary with item thumbnails/totals, supported payment rows only, bottom trust strip, and forms that remain scannable.
- Order confirmation: calm success hierarchy, order number/status/details, next actions, optional real-data recommendations, and guest save-order prompt.
- Account/sign-up: split art/benefits/form composition on desktop, visible labels and terms, disabled/unavailable social auth unless wired, and mobile-stacked form-first layout.

### Mobile-Friendly Execution Gates

Apply these to every page task:

- Use mobile-first CSS defaults, then enhance at tablet/desktop breakpoints.
- Verify at 320px, 375px, 414px, 768px, 1024px, and 1440px before closing the page slice.
- No horizontal page scroll. Use responsive containers, wrapped header/action rows, and vertical cards instead of wide tables on small screens.
- Touch targets for nav, cart, filters, tabs, thumbnails, quantity steppers, close buttons, and payment actions must be easy to tap.
- Long desktop sidebars become drawers, sheets, compact summaries, or accordions on mobile.
- Sticky headers/bottom bars must reserve matching padding and never cover form fields, payment buttons, checkout actions, or cart totals.
- Forms use visible labels, correct `type`, `inputmode`, `autocomplete`, required indicators, blur validation where helpful, and loading/success/error submit feedback.
- React form inputs stay controlled. Future real search/filter text inputs should debounce or defer query handling.

### Task 1: Buyer Shell Header And Footer

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/app/App.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`
- Modify: `demos/paypal-retail-demo/web/src/app/App.test.tsx`

- [x] **Step 1: Add shell structure tests**

  In `App.test.tsx`, extend the buyer shell test to assert:

  ```ts
  expect(html).toContain("Free delivery and pickup options");
  expect(html).toContain('aria-label="Primary"');
  expect(html).toContain('aria-label="Buyer actions"');
  expect(html).toContain("Wishlist");
  expect(html).toContain("Cart (");
  expect(html).toContain("Stay in the loop");
  expect(html).not.toContain("Search products");
  ```

  The negative search assertion is intentional until keyword search is backed by the API.

- [x] **Step 2: Implement header anatomy**

  In `App.tsx`, keep the skip link, then render:
  - `.site-utility` with delivery/pickup and help/order links.
  - `.site-header__inner` with brand, category/navigation entry points, and buyer actions.
  - `.site-header__nav` as the primary nav under or inside the main header.
  - `.site-header__actions` with Account/Login, Wishlist placeholder link or disabled button only if intentionally nonfunctional, and Cart count.

  Do not add a visible search input unless the route/API supports a real query.

- [x] **Step 3: Implement footer anatomy**

  Add `.site-footer` after `<main>` and before `<MinicartShell>`. Include newsletter/sign-in/account link, shop links, help links, about/demo context, and social/action placeholders as plain links or disabled buttons. Keep copy buyer-facing and avoid unsupported PSP or shipping claims.

- [x] **Step 4: Style shell density**

  In `global.css`, make POP MART shell feel premium retail:
  - deep ink/navy header band with warm cream page body,
  - restrained gold/coral active states,
  - stable sticky header that does not cover content,
  - 1200px max content width,
  - mobile header with nav/actions wrapping or collapsing instead of horizontal overflow,
  - touch-sized account/wishlist/cart/menu controls on mobile.

- [x] **Step 5: Verify shell**

  Run:

  ```bash
  npm run test -- web/src/app/App.test.tsx
  npm run typecheck
  ```

  Expected: tests pass, no TypeScript errors, no Admin link in buyer shell.

  Completed on 2026-06-18 with `npm test -- web/src/app/App.test.tsx`,
  `npm run typecheck`, full `npm test`, `npm run lint`,
  `npm run format:check`, and in-app browser checks at 1280px, 375px,
  and 320px. Evidence screenshots:
  `/private/tmp/paypal-retail-shell-desktop.png` and
  `/private/tmp/paypal-retail-shell-mobile-320.png`.

  Refined on 2026-06-18 after sample-header review: the header now uses a
  three-part rhythm of utility row, brand/discovery/action row, and dedicated
  product-category nav. Checkout is intentionally removed from the product nav
  because Cart/minicart own the checkout entry point. The central discovery
  pill links to `/products` and must not become an inert keyword search before
  real query support exists.

- [x] **Step 6: Compact the mobile buyer header**

  After the mobile screenshot review, the desktop product-category nav grid is
  too tall for mobile and consumes the first browsing viewport. Keep the
  desktop header rhythm at wider breakpoints, but at mobile widths:
  - show only the simplified POP mark visually, with the full brand preserved
    in the accessible label,
  - keep the supported browse/discovery link compact and route-backed,
  - render Account/Sign in, Wishlist, Cart, and Menu as icon-first 44px
    controls with visible cart count and accessible names,
  - move NEW, COLLECTIONS, PRE-ORDERS, BLIND BOXES, FIGURES, ACCESSORIES,
    BRANDS, SALE, ABOUT, Help, Track order, and Order recovery into an
    accessible drawer/sheet controlled by a hamburger button with
    `aria-expanded` and `aria-controls`,
  - do not render Checkout in product navigation because Cart/minicart own that
    flow,
  - verify 320px, 375px, 414px, 768px, 1024px, and desktop widths have no
    horizontal overflow and that opening/closing the drawer works.

  Completed on 2026-06-18 with red-first App shell coverage and in-app browser
  verification. Evidence screenshots:
  `/private/tmp/paypal-retail-mobile-header-compact-closed-320.png`,
  `/private/tmp/paypal-retail-mobile-header-menu-open-320.png`, and
  `/private/tmp/paypal-retail-mobile-header-desktop-1440.png`.

### Task 2: Home Reference-Level Merchandising

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/features/catalog/HomePage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/HomePage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`

- [x] **Step 1: Add Home module-order tests**

  Assert these sections appear in this order in the static HTML:

  ```ts
  const heroIndex = html.indexOf("Blind-box drops");
  const trustIndex = html.indexOf("PayPal checkout");
  const calendarIndex = html.indexOf("New arrivals calendar");
  const categoryIndex = html.indexOf("Shop by category");
  const promoIndex = html.indexOf("Limited drops");
  const seriesIndex = html.indexOf("Popular series");

  expect(heroIndex).toBeGreaterThan(-1);
  expect(trustIndex).toBeGreaterThan(heroIndex);
  expect(calendarIndex).toBeGreaterThan(trustIndex);
  expect(categoryIndex).toBeGreaterThan(calendarIndex);
  expect(promoIndex).toBeGreaterThan(categoryIndex);
  expect(seriesIndex).toBeGreaterThan(promoIndex);
  ```

- [x] **Step 2: Add trust strip data locally in the component**

  Use a constant in `HomePage.tsx`:

  ```ts
  const homeTrustItems = [
    {
      title: "PayPal checkout",
      body: "PayPal, Pay Later, and card surfaces render where eligible.",
    },
    {
      title: "Delivery and pickup",
      body: "Choose fulfillment during checkout.",
    },
    {
      title: "Order recovery",
      body: "Resume pending orders and review completed orders.",
    },
    {
      title: "Generated demo catalog",
      body: "Local POP MART-profile assets keep the demo self-contained.",
    },
  ];
  ```

  If this copy changes, keep it limited to implemented features.

- [x] **Step 3: Upgrade Home layout**

  Render the first viewport as:
  - image-led hero with clickable featured-drop image,
  - contrast-safe hero copy over the image on mobile,
  - primary and secondary CTAs,
  - `.homepage-trust-strip`,
  - visible hint of the release/product module below.

  Then render:
  - release calendar and selected release details beside a product/preorder shelf,
  - tactile category shelf,
  - three promo/event cards,
  - popular series rail,
  - deep footer owned by the shell or page, but not both duplicating the same content.

- [x] **Step 4: Style Home like the reference level**

  Use strong image-led composition, dense section rhythm, stable card heights, 8-14px radii, warm cream panels, deep ink section headers, and coral/gold active accents. Do not add gradient orbs, heavy blur, nested cards, or text that describes how to use the UI.

  Mobile must show the hero CTA and the start of the next merchandising module without requiring the buyer to scroll through oversized decorative art.

  2026-06-19 mobile refinement: mobile Home uses the hero product image as the card surface with overlaid title/subtitle/compact CTAs and a clickable featured-drop image. The release/product board is visually ordered before the utility trust strip on mobile, while desktop/DOM order keeps the previously approved hero/trust/calendar reading sequence.

- [x] **Step 5: Verify Home**

  Run:

  ```bash
  npm run test -- web/src/features/catalog/HomePage.test.tsx
  npm run typecheck
  ```

  Expected: Home tests pass, no old Labubu/Hirono/Skullpanda fallback text appears in `defaultHomePageData`.

  Completed on 2026-06-18 with red-first `HomePage.test.tsx`
  module-order coverage, the Home trust strip/calendar-product board/category/
  promo/series runtime structure, shared-shell footer ownership, and mobile hero
  tightening. Fresh verification passed `npm run verify` and `git diff --check`.
  In-app browser QA verified Home at 320px, 375px, 414px, 768px, 1024px, and
  1440px with no horizontal overflow, no Vite overlay, ordered modules,
  generated POP MART PNG assets, no old fallback text, and hero Browse all
  navigation to `/products`. Expected console errors were limited to homepage
  and cart API fetch failures because the visual pass ran Vite without the
  Express API server. Evidence screenshots:
  `/private/tmp/paypal-retail-home-refined-desktop.png` and
  `/private/tmp/paypal-retail-home-refined-mobile-320.png`.

### Task 3: Category Dense Retail Grid

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/features/catalog/CategoryPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/CategoryPage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`

- [x] **Step 1: Add category layout assertions**

  Assert the page renders:

  ```ts
  expect(html).toContain("All products");
  expect(html).toContain("2 filters applied");
  expect(html).toContain("Reset filters");
  expect(html).toContain("Pay Later with PayPal");
  expect(html).toContain("Pickup eligible");
  expect(html).toContain("Released");
  expect(html).toContain("$13.99");
  expect(html).not.toContain('href="/products?series=');
  ```

- [x] **Step 2: Upgrade category page anatomy**

  Keep existing V1 filters, but render them as a compact retail control surface:
  - hero/context row,
  - category switcher,
  - applied filter count and reset,
  - supported filter chips or grouped drawer,
  - product grid with image, badge/status, category, name, current/regular price, pickup label,
  - official Category Pay Later message slot with amount-free fallback.

  2026-06-19 status: supported V1 category anatomy now removes the explanatory subtitle below `All products`, keeps unsupported series metadata hidden, marks discounted product cards with a top-right `Sale` text badge, lazy-loads grid images, and renders the official Pay Later message directly in the results flow without wrapper-card chrome.

- [x] **Step 3: Mobile category rule**

  At 375px, product cards must appear before a long filter list consumes the first viewport. Use a compact filter summary/drawer/accordion pattern instead of rendering the full filter sidebar above products.

  Also verify 320px and 414px: product cards should form a one- or two-column grid without horizontal scroll, and filter chips/buttons must remain tap-friendly.

  Completed on 2026-06-18 with red-first CategoryPage/static CSS
  coverage and in-app browser responsive checks. Mobile now hides the desktop
  filter sidebar, renders a compact filter/details control before the product
  grid, keeps the opened filter panel full width, preserves unique desktop and
  mobile filter IDs, and avoids horizontal overflow at 320px, 375px, and
  414px. The live Vite-only browser pass could not load API-backed product
  cards because the Express API server requires local Supabase/PayPal
  environment variables; component coverage verifies product-grid ordering
  when product data is present. Evidence screenshots:
  `/private/tmp/paypal-retail-category-mobile-filters-closed-320.png`,
  `/private/tmp/paypal-retail-category-mobile-filters-open-320.png`, and
  `/private/tmp/paypal-retail-category-desktop-filters-1440.png`.

- [ ] **Step 4: Verify category**

  Run:

  ```bash
  npm run test -- web/src/features/catalog/CategoryPage.test.tsx
  npm run typecheck
  ```

  Expected: supported filters remain visible, unsupported `series` links remain hidden, product cards preserve generated image paths and alt text.

### Task 4: PDP Premium Inspection Page

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/features/catalog/ProductDetailPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/catalog/ProductDetailPage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`

- [x] **Step 1: Add PDP structure assertions**

  Extend released PDP tests to require:

  ```ts
  expect(html).toContain("Home");
  expect(html).toContain("Collector details");
  expect(html).toContain("Product facts");
  expect(html).toContain("PayPal checkout");
  expect(html).toContain("Shipping and returns");
  expect(html).toContain("Customer reviews");
  expect(html).not.toContain("You may also like");
  expect(html).toContain('class="product-gallery__thumb"');
  expect(html).not.toContain("Pickup");
  ```

- [x] **Step 2: Add breadcrumb and status row**

  Render breadcrumb links before the gallery/summary grid:
  - Home
  - Products
  - category name
  - product name as current text

  Add a status/vendor/review summary row and keep it separate from truthful series/category chips. API-loaded vendor copy comes from the active storefront profile display name so POP MART and generic-profile demos do not borrow each other's brand labels. Use `seriesName`, `categoryName`, `statusLabel`, and real review count/rating labels. Do not invent a numeric rating if the product has no reviews. Official/licensed chips render only if backed by real seeded/demo product metadata; otherwise use truthful category/status chips.

  2026-06-23 status: complete for the supported current data model. `ProductDetailPageData` now includes optional `vendorName`; API-loaded PDPs map it from the active profile display name, fallback POP MART PDPs set the profile vendor label, and the summary renders a distinct status/vendor/review row plus a separate `.product-chip-row` for series/category chips.

- [x] **Step 3: Upgrade gallery to detailed PDP pattern**

  Match the detailed PDP reference:
  - desktop uses a vertical thumbnail rail beside a large image when width allows,
  - mobile keeps thumbnails below the main image,
  - thumbnails are keyboard-selectable buttons with `aria-pressed`,
  - previous/next controls, zoom, or 360-degree labels render only if implemented,
  - image area keeps a stable aspect ratio and never stretches product art.

  On mobile, the gallery may stack, but title/status/price and primary purchase action must appear before long descriptions, review content, recommendation rails, or recently-viewed rails.

  2026-06-19 status: complete for the supported current data model. Multi-image PDPs now render a `.product-gallery__stage` with keyboard-selectable thumbnails that can become a desktop rail, while one-image API-backed products keep the rail hidden to avoid duplicate mobile imagery.

- [x] **Step 4: Keep unsupported release/preorder facts out of the purchase rail**

  Do not render a duplicate purchase-status card just to fill the right rail:
  - summary status already appears in the product status row,
  - price appears in the purchase panel,
  - official Pay Later message appears directly under the price,
  - blocked checkout reasons can appear as compact action notices,
  - show deposit/remaining/estimated release only after real fields exist in `ProductDetailPageData`.

  2026-06-19 refinement status: the stale `.product-release-panel` /
  `Purchase status` card is intentionally removed. Future richer release or
  preorder facts need explicit product data and tests before reappearing.

- [x] **Step 5: Add right-side purchase/preorder panel**

  On desktop, make the purchase panel read like the reference right rail:
  - price and rewards/points only if real/demo-supported,
  - no duplicate purchase-status card,
  - official Pay Later amount message directly under the price,
  - quantity stepper for purchasable released products only if existing add-to-cart quantity support can accept it,
  - primary Add to cart / Pre-order action,
  - secondary wishlist or notify action only if it is implemented, disabled, or clearly demo-safe,
  - official delivery express actions inside a rounded `Secured by PayPal` frame,
  - trust grid below actions.

  The `Secured by PayPal` frame uses an unclosed rounded fieldset/legend
  treatment. If Pay Later button eligibility is false or still unavailable,
  PayPal fills the frame. If Pay Later is eligible, desktop uses PayPal left
  and Pay Later right; mobile stacks PayPal above Pay Later.

  On mobile, the purchase rail becomes a normal stacked section with primary action reachable before secondary content. Sticky purchase bars are allowed only if they do not cover content and reserve bottom padding.

  2026-06-19 mobile sub-slice status: complete for the current released PDP. `ProductDetailPage` now renders title/status, price, Pay Later, express, and the primary purchase action in a `.product-purchase-panel` before intro/details/review content; single-image PDPs omit the redundant thumbnail rail so the first mobile viewport is not consumed by duplicate imagery. The broader desktop right-rail, release facts panel, trust grid, tabs, and real-data rails remain open in this task.

  2026-06-19 supported right-rail status: price, direct official amount-aware Pay Later message slot, Add to cart, the secured PayPal/Pay Later express frame, and trust grid now render in the purchase panel. Quantity, wishlist/notify, rewards, deposit, remaining balance, estimated-release economics, and duplicate purchase-status panels remain intentionally absent until backed by real demo data or implemented behavior.

  2026-06-19 blind-box commerce status: purchasable blind-box PDPs now support wired `Random 1PC` and `Whole Box - 12PC no duplicates` purchase options. Selecting the whole-box option updates the displayed amount, official Pay Later message amount, add-to-cart selection, and cart quantity. The purchase panel also shows demo-safe scarcity/viewing signals above the primary action and uses container-responsive PayPal/Pay Later frame sizing instead of a fixed desktop/mobile split.

  2026-06-23 status: the local Add to cart control now uses the shadcn `Button` primitive while official PayPal/Pay Later SDK surfaces remain SDK-rendered inside the isolated payment frame.

- [x] **Step 6: Add trust strip and tabbed details**

  Below the CTA row, render trust items:
  - PayPal checkout
  - Delivery express
  - Pay Later where eligible
  - Order recovery

  Render semantic detail tabs for:
  - Description
  - Product facts
  - Gallery
  - Reviews
  - Shipping and returns
  - Q&A

  Reviews stay hidden for unreleased products. Q&A can render as an empty/informational section only if it does not pretend to contain real buyer questions.

  2026-06-19 status: complete for supported V1 content. The PDP now renders PayPal checkout, delivery express, Pay Later, and order recovery trust cells; lower detail tabs cover collector details, product facts, gallery, customer reviews for released products only, shipping/returns caveat copy, and an empty Q&A state that does not fake buyer questions.

- [x] **Step 7: Add lower PDP commerce rails**

  Add lower-page rails only when backed by real or existing demo data:
  - Customer reviews summary/histogram from real review data, or omit histogram.
  - You may also like from existing category/series/home product data, or omit.
  - Recently viewed only if there is actual recently-viewed state, or omit.

  Do not hardcode unrelated fake products just to match the reference screenshot.

  2026-06-23 status: complete for supported V1 data. Blind-box PDPs render collector story content, icon-style product facts, a demo lineup with secret odds, real review/demo social-proof cards when available, and a `You may also like` rail from existing generated catalog asset paths. Recently viewed and customer-review histogram remain intentionally omitted because there is no recently-viewed state or histogram data. Real multi-angle photos, package exterior imagery, hidden-silhouette media, and material-detail video assets remain open under the product-gallery asset-generation task; text-only media placeholder cards are intentionally omitted from runtime PDP UI, especially mobile, until real assets exist.

- [x] **Step 8: Verify PDP**

  Run:

  ```bash
  npm run test -- web/src/features/catalog/ProductDetailPage.test.tsx
  npm run test -- web/src/app/App.test.tsx
  npm run typecheck
  ```

  Expected: released PDP shows Pay Later and express surfaces, unreleased PDP blocks purchase/reviews, no pickup hint appears.

  2026-06-23 status: complete for supported V1 data. Focused verification passed `npm test -- web/src/features/catalog/ProductDetailPage.test.tsx web/src/app/App.interactions.test.tsx web/src/styles/global.test.ts`, and live browser QA captured API-down fallback PDP `blind-boxes-2` at 1440px, 375px, and 320px with no horizontal overflow, profile-scoped `By POP MART` vendor copy, separate series/category chip row, shadcn `Button` primary CTA, secured PayPal frame, and compressed mobile gallery/purchase-option density. Evidence screenshots: `/Users/tengtao/Development/demo-projects/demos/paypal-retail-demo/pdp-vendor-chip-desktop-1440.png`, `/Users/tengtao/Development/demo-projects/demos/paypal-retail-demo/pdp-vendor-chip-mobile-375.png`, and `/Users/tengtao/Development/demo-projects/demos/paypal-retail-demo/pdp-vendor-chip-mobile-320.png`. A future sticky mobile purchase bar remains an optional polish if the demo needs the CTA visible in the first viewport without further shrinking collectible media.

### Task 5: Cart, Minicart, And Checkout Polish

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/features/cart/CartPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/cart/MinicartShell.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Modify related tests beside each file.
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`

- [ ] **Step 1: Add cart/checkout reference assertions**

  Extend the existing Cart, Minicart, and Checkout tests to assert:

  ```ts
  expect(html).toContain("Order Summary");
  expect(html).toContain("Subtotal");
  expect(html).toContain("Shipping");
  expect(html).toContain("Tax");
  expect(html).toContain("Checkout");
  expect(html).toContain("Pay Later");
  expect(html).toContain("Prefer pickup? Choose store pickup during checkout.");
  expect(html).not.toContain("Pickup checkout button");
  ```

  Use page-specific tests for exact wording so the assertion does not become brittle across unrelated pages.

- [ ] **Step 2: Cart summary hierarchy**

  Full cart must show merchandise subtotal, promo/tax/shipping placeholder or selected value, Pay Later amount message, official delivery express buttons, primary Checkout action, and pickup hint. Keep Checkout reachable on mobile without covering content.

- [ ] **Step 3: Cart reference layout**

  Match the cart reference anatomy:
  - breadcrumb above page title,
  - item row/table layout with image, title, status/detail, unit price, quantity stepper, line total, remove action, and save-for-later action only if implemented,
  - summary card with subtotal, shipping, tax, total, primary checkout action, and official PayPal delivery express surface,
  - trust badges below the summary,
  - free-shipping or promo progress banner only when backed by a real threshold or clearly labeled demo promo data.

  On mobile, cart rows become vertical cards. Do not force a wide table that creates horizontal page scroll.

- [x] **Step 4: Minicart density**

  Drawer action order must be:
  - primary Checkout
  - secondary View cart
  - compact Pay Later message
  - official PayPal/Pay Later delivery express surfaces
  - pickup hint

  Collapse duplicated SDK loading copy into one method-labeled pending state.

  On mobile, the minicart may become a full-height drawer or bottom sheet. The item list scrolls independently from the sticky action area.

  2026-06-23 status: minicart density and drawer separation are implemented for the supported M16 scope. The shadcn Sheet stays `side="right"`, uses a minicart-specific overlay class, keeps outside-click dismissal, anchors to the right edge on desktop, becomes full-width on mobile, and uses panel elevation plus one restrained brand accent rail without altering PayPal-rendered surfaces.

- [x] **Step 5: Checkout reference layout**

  Match the checkout reference anatomy:
  - breadcrumb and secure-checkout label,
  - left column step cards for shipping address, shipping method, and payment method,
  - right column order summary with item thumbnails, quantity, item total, coupon/promo entry if supported, subtotal, shipping, tax, total, and primary Place Order/payment action,
  - bottom trust strip,
  - mobile layout keeps order-summary/payment context available without hiding form fields.

  At mobile widths, long forms should keep the active step clear, use appropriate mobile keyboards, and avoid sticky payment controls that cover fields or validation messages.

  Payment method examples in the reference must not create fake card networks or fake Apple Pay. Render only methods supported by the existing payment eligibility mapper.

- [x] **Step 6: Checkout empty/payment states**

  Payment rows must explain locked or unavailable states. Long forms must not hide the next action on mobile. Official PayPal surfaces remain stable and readable.

  2026-06-23 status: checkout reference layout, empty/payment placeholders, and Pickup store-ticket surfaces are implemented for the supported M16 scope. Pickup store cards now use compact ticket styling in the inline Store selection step and the store-picker modal, including address, phone, distance/status badge, full/partial `data-inventory-state`, available/unavailable counts, and partial-inventory notes. Broader cart/minicart/checkout accent polish remains tracked separately in `tracking/todos.md`.

- [x] **Step 7: Verify cart/minicart/checkout**

  Run:

  ```bash
  npm run test -- web/src/features/cart/CartPage.test.tsx web/src/features/cart/MinicartShell.test.tsx web/src/features/checkout/CheckoutPage.test.tsx
  npm run typecheck
  ```

  Expected: existing payment/fulfillment tests pass and no pickup button appears in PDP/cart/minicart express areas.

  2026-06-23 status: cart/minicart/checkout merchant-owned accent polish is implemented for the supported M16 scope. Cart and checkout now expose explicit visual-accent markers, use warm summary/card accents and text-backed state chips, and preserve existing PayPal frame/message/payment-slot styling. Vite-only browser QA verified cart and checkout at 1440px and 375px with no framework overlay or horizontal overflow. API-backed populated-cart SDK rendering was not rerun in this shell because the local Express server requires missing environment variables; the separate PayPal button/message layout-shift and sandbox capture rows remain open for that proof.

### Task 6: Order Confirmation And Account Polish

**Files:**

- Modify: `demos/paypal-retail-demo/web/src/features/checkout/ExpressReviewPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/ExpressReviewPage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/account/AccountPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/account/AccountPage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/account/AuthModalShell.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/account/AuthModalShell.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`

- [x] **Step 1: Add confirmation reference assertions**

  Extend Express Review captured-state tests to assert:

  ```ts
  expect(html).toContain("Thank you");
  expect(html).toContain("Order details");
  expect(html).toContain("View order");
  expect(html).toContain("Continue shopping");
  expect(html).toContain("Save order");
  expect(html).not.toContain("Confirm and pay");
  ```

  Keep pre-capture tests asserting `Review and Confirm` and `Confirm and pay` still appear before capture.

- [x] **Step 2: Upgrade captured confirmation state**

  When `captureState.status === "captured"`, shift from review mode to confirmation mode:
  - success icon/check,
  - "Thank you" hierarchy,
  - buyer-safe merchant order number,
  - confirmation/capture status card,
  - order details grid using existing express review data,
  - recommended products only if existing product data is available; otherwise omit rather than adding static fake recommendations,
  - View order and Continue shopping actions,
  - guest account-link prompt remains visible/reachable.

- [x] **Step 3: Add account/sign-up reference assertions**

  Extend Account/Auth tests to assert the account entry or sign-up surface includes:

  ```ts
  expect(html).toContain("Create account");
  expect(html).toContain("Faster checkout");
  expect(html).toContain("Order updates");
  expect(html).toContain("Wishlist");
  expect(html).toContain("Terms");
  ```

  If OAuth buttons are rendered without implementation, assert they are disabled or marked unavailable.

- [x] **Step 4: Upgrade account/signup visual hierarchy**

  Match the account reference anatomy using existing auth/account flows:
  - split layout with product/character art or generated POP MART asset on one side,
  - benefits list for faster checkout, order updates, wishlist/rewards only if implemented or clearly demo-safe,
  - tabbed sign-up/login state where the current modal/page supports both flows,
  - labeled inputs with stable password visibility controls,
  - terms checkbox before account creation,
  - disabled/demo-safe social alternatives unless OAuth is implemented,
  - existing-account link.

  On mobile, stack the form before or immediately after benefits. Social auth alternatives must not squeeze form controls or terms copy.

- [x] **Step 5: Verify confirmation/account**

  Run:

  ```bash
  npm test -- web/src/features/checkout/ExpressReviewPage.test.tsx web/src/features/account/AuthModalShell.test.tsx web/src/app/App.interactions.test.tsx
  npm run typecheck
  ```

  Expected: captured state reads as confirmation, pre-capture state remains review/confirm, account/sign-up flows stay buyer-safe and do not imply unsupported OAuth.

### Task 7: Browser And Computer Use Evidence

**Files:**

- Update: `demos/paypal-retail-demo/tracking/progress.md`
- Update: `demos/paypal-retail-demo/tracking/test-cases.md`
- Update: `demos/paypal-retail-demo/tracking/todos.md`

- [x] **Step 1: Run code verification**

  Run from `demos/paypal-retail-demo`:

  ```bash
  npm run verify
  ```

  Expected: all tests pass.

  2026-06-23 status: full local verification passed with `npm run verify`
  after formatting drift was normalized in the touched PayPal/cart files. The
  suite covered 65 test files and 455 tests, plus typecheck, lint, and
  Prettier format check.

- [x] **Step 2: Run desktop and mobile visual QA**

  Use Computer Use or Playwright/browser verification for:
  - Home at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Category at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - PDP at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Cart at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Open minicart at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Checkout payment step at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Captured order confirmation at 1440px, 1024px, 768px, 414px, 375px, and 320px
  - Account/sign-up surface at 1440px, 1024px, 768px, 414px, 375px, and 320px

  Required checks:
  - no old mock image flash,
  - generated product PNGs render,
  - official PayPal message nodes render where configured,
  - no visible layout overlap,
  - no horizontal page scroll at mobile widths,
  - touch targets are usable on mobile,
  - header/footer feel production-ready,
  - PDP purchase CTA is reachable on mobile without excessive scrolling,
  - category products appear before full filters on mobile,
  - checkout forms and order summary stay balanced on desktop and reachable on mobile,
  - captured confirmation shows success hierarchy and next actions,
  - account/sign-up form fields, benefits, and terms controls fit without awkward wrapping.

  2026-06-23 status: the Vite-only responsive Browser gate is complete for
  Home, Category, PDP, Cart, open Minicart, Checkout, Express Review/order
  confirmation, and Account at 1440px, 1024px, 768px, 414px, 375px, and
  320px. The pass found no blank pages, no framework overlays, and no
  horizontal page scroll. Merchant-owned mobile controls now meet 44px touch
  sizing, with the only remaining scanner notes being native PDP radio glyphs
  inside 124px by 190px clickable purchase-option labels. This does not close
  the API-backed/PayPal SDK part of this step.

  2026-06-23 API-backed status: official PayPal message/button rendering and
  layout-shift checks passed for Category, PDP, Cart, open Minicart, and the
  unlocked Checkout payment step at 375px with no horizontal overflow. Cart
  PayPal express created sandbox PayPal orders and opened the sandbox login
  modal. Full sandbox buyer login, approval return, and capture remain open.

  2026-06-23 accessibility/visual gate status: a refreshed API-backed mobile
  Browser pass after the header polish found no horizontal overflow, no visible
  text clipping, no bad product/category/banner image alt text, and no sticky
  header overlap on Home, Category, PDP, Cart, open Minicart, and the checkout
  top view at 375px. The checkout payment-step sticky action remains covered by
  the earlier API-backed payment evidence and does not overlap the footer.

- [x] **Step 3: Capture evidence and update trackers**

  Add a dated `tracking/progress.md` entry listing screenshots and verification commands. Mark only the completed page slices in `tracking/todos.md` and `IMPLEMENTATION_TASKS.md`; leave untouched slices open.

  2026-06-23 status: runbook, README, plan router, milestone checklist, todos,
  test cases, progress, and learnings were aligned with the completed M16
  evidence. Full sandbox buyer approval/capture, final richer media/LQIP,
  generic asset safety, local Supabase Docker verification, and M15 Admin Portal
  remain open.

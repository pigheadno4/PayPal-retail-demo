# Category And PDP Reference Polish V5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for independent Category/PDP implementation slices, or `superpowers:executing-plans` for inline execution with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Category/PLP and PDP pages closer to the Sakura-reference retail quality level while preserving POP MART demo truth, official PayPal surfaces, and the shadcn component foundation.

**Architecture:** `DESIGN.md` owns the visual/UX contract, this plan owns the detailed implementation handoff, `IMPLEMENTATION_TASKS.md` owns canonical milestone status, and `tracking/*` owns acceptance and progress evidence. Category and PDP are separate implementation streams with review gates between them so a partial slice cannot be mistaken for complete V5.

**Tech Stack:** Vite React, TypeScript, shadcn/Radix primitives, Lucide icons, app-owned CSS in `web/src/styles/global.css`, existing catalog/PDP/cart/payment React modules, official PayPal SDK-rendered buttons/messages.

## Global Constraints

- Preserve official PayPal SDK surfaces: do not restyle the `paypal-message`, official PayPal buttons, Pay Later buttons, card fields, or SDK iframes/custom elements directly.
- Do not add fake ratings, fake review counts, fake preorder economics, fake loyalty benefits, fake authenticity claims, or unsupported shipping guarantees.
- All coming-soon/unreleased states must be text-labeled and not rely on grayscale/color alone.
- Mobile acceptance widths are `320`, `375`, `390`, and `414` where practical; final V5 GUI gate must include `1440`, `1280`, `1024`, `768`, `390`, and `320`.
- No page-level horizontal overflow is allowed on Category or PDP at any verified width.
- Use shadcn primitives where they improve behavior and consistency, but do not replace custom ecommerce page composition with generic blocks.
- Every task must update tests, tracking, and progress notes before it can be marked complete.

---

## Files And Responsibilities

- `DESIGN.md`: V5 Category/PDP UX contract and inspection standards.
- `IMPLEMENTATION_TASKS.md`: canonical open Milestone 16 V5 checklist.
- `tracking/todos.md`: near-term execution queue and slice ordering.
- `tracking/test-cases.md`: acceptance rows for each V5 behavior and final GUI gate.
- `tracking/progress.md`: timestamped planning and implementation evidence.
- `web/src/features/catalog/CategoryPage.tsx`: Category layout, filter/sort controls, product-card states, Pay Later slot.
- `web/src/features/catalog/ProductDetailPage.tsx`: PDP gallery/purchase rail, coming-soon gating, detail navigation, reviews, sticky mobile purchase bar.
- `web/src/features/catalog/HomePage.tsx`: only touched if shared product-card primitives require harmless reuse; no homepage V4 regression changes.
- `web/src/features/payments/*`: only touched for placement/container use; official PayPal content remains SDK-rendered.
- `web/src/components/ui/*`: use existing shadcn primitives; add only missing primitives after checking component inventory.
- `web/src/styles/global.css`: retail styling, responsive behavior, tabs/accordion/sticky bar/card state CSS.
- Focused tests: `web/src/features/catalog/*.test.tsx`, `web/src/app/App*.test.tsx`, `web/src/styles/global.test.ts`, plus payment tests only if PayPal placement code changes.

---

## Task 1: Baseline, Review Gate, And Acceptance Lock

**Files:**
- Modify: `tracking/progress.md`
- Modify only if gaps are found: `tracking/todos.md`
- Evidence: `/private/tmp/paypal-retail-category-pdp-v5-preaudit-YYYYMMDD/`

**Interfaces:**
- Consumes: live Render Category `/products`, released PDP `/products/blind-boxes-2`, unreleased PDP `/products/blind-boxes-1`.
- Produces: baseline screenshots/metrics used to judge V5 improvement.

- [ ] Capture live baseline screenshots at `1440`, `1280`, `1024`, `768`, `390`, and `320` for Category, released PDP, and unreleased PDP.
  - Inspection standard: screenshots show current filter depth, Pay Later placement, coming-soon cards, PDP purchase rail, PDP details/reviews/tabs, and unreleased product actions.
- [ ] Record DOM metrics for first product depth on mobile Category, PDP detail-tab `clientWidth/scrollWidth/clientHeight/scrollHeight`, PDP support-card footprint, and page-level horizontal overflow.
  - Inspection standard: metrics are saved as JSON and referenced in `tracking/progress.md`.
- [ ] Run `ui-ux-pro-max` review against Category filter/product-card UX and PDP tab/review/mobile purchase UX.
  - Inspection standard: findings are mapped to Task 2-7 below; no new finding remains only in chat.
- [ ] Decide execution mode before runtime edits.
  - Inspection standard: use subagent review for either Category and PDP separately, or document why inline execution is safer for this repo state.

---

## Task 2: Category Pay Later Integration

**Files:**
- Modify: `web/src/features/catalog/CategoryPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/CategoryPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

**Interfaces:**
- Consumes: existing amount-free storefront Pay Later message component/path.
- Produces: a Category Pay Later section that visually belongs to the page without interfering with official message content.

- [ ] Wrap the Category Pay Later area in a restrained retail section that centers the official message and aligns with page tokens.
  - Inspection standard: the wrapper provides spacing, label/context, and surface alignment, but the `paypal-message` element itself is not restyled, transformed, clipped, or covered.
- [ ] Move the Pay Later slot so it supports product discovery rather than interrupting the filter/grid rhythm.
  - Inspection standard: on mobile, first product cards remain visible in the first browsing pass; Pay Later does not push products below a long filter stack.
- [ ] Add a buyer-safe fallback state only when SDK config/content is unavailable.
  - Inspection standard: fallback text never appears while the official `paypal-message` is ready; no blank Pay Later chrome ships.
- [ ] Add focused tests for official-message mounted state and fallback/no-fallback branching.
  - Inspection standard: tests query merchant-owned container labels and preserve the SDK-rendered element boundary.
- [ ] Browser verify Category Pay Later at `1440`, `390`, and `320`.
  - Inspection standard: one visible Pay Later section, no duplicate fallback, no page-level horizontal overflow, no console errors from merchant code.

---

## Task 3: Category Filter And Sort System

**Files:**
- Modify: `web/src/features/catalog/CategoryPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/CategoryPage.test.tsx`
- Test: `web/src/app/App.interactions.test.tsx` if route/query behavior changes

**Interfaces:**
- Consumes: existing category, release status, availability, price, pickup context, sort, and `q` query behavior.
- Produces: compact top filter/sort controls plus mobile sheet/drawer behavior.

- [ ] Replace the large mixed filter list with a cleaner top control system above the product grid.
  - Inspection standard: desktop shows primary controls near the grid header, selected filters remain visible as chips, and secondary filters are available through a compact `All filters` sheet/popover.
- [ ] On mobile, collapse filters into a single shadcn `Sheet` trigger plus active-chip `ScrollArea`.
  - Inspection standard: trigger is at least 44px tall, active chips are readable at 320px, and applying/resetting filters never creates horizontal page overflow.
- [ ] Keep sort separate from filters and scannable.
  - Inspection standard: sort selection is visible without opening the filter sheet, but does not consume a full row of oversized controls on mobile.
- [ ] Preserve route/query semantics for category, release status, price, availability, pickup context, sort, and `q`.
  - Inspection standard: back/forward navigation, reset, and direct URLs still reproduce the visible filter state.
- [ ] Add accessibility labels and selected-state semantics.
  - Inspection standard: filters expose selected state through text/ARIA, not color alone; disabled pickup filter includes a concise reason.
- [ ] Run interaction tests for filter apply/reset, query preservation, and mobile sheet close/apply behavior.
  - Inspection standard: tests pass without relying on visual text that may be hidden in mobile-only CSS.

---

## Task 4: Category Product Card State Polish

**Files:**
- Modify: `web/src/features/catalog/CategoryPage.tsx`
- Modify: shared product-card helper if one exists
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/CategoryPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

**Interfaces:**
- Consumes: product `release_status`, `is_purchasable`, price/current/regular price, sale state, image data, category labels.
- Produces: visually distinct released, sale, coming-soon, and unavailable cards.

- [ ] Add a top-right text `Coming soon` or `Not released` badge for unreleased product cards.
  - Inspection standard: badge does not overlap sale badges, wishlist controls, or product title at `320px`.
- [ ] Desaturate or mute unreleased product imagery while preserving product shape.
  - Inspection standard: unreleased state is also labeled in text; grayscale/muted image is not the only indicator.
- [ ] Hide or disable cart/payment-like actions for unreleased cards with a clear reason.
  - Inspection standard: unreleased cards cannot start checkout; primary action is view/details or disabled coming-soon copy.
- [ ] Keep sale cards visually attractive without clutter.
  - Inspection standard: sale badge, current price, and regular price remain readable and do not create card-height jumps.
- [ ] Stabilize media and skeleton behavior.
  - Inspection standard: product cards reserve image height, lazy images do not flash old mock media, and shadcn `Skeleton` appears for non-image pending content.
- [ ] Browser verify card states with at least one sale product and one coming-soon product.
  - Inspection standard: released, sale, and coming-soon states are distinguishable in a screenshot without reading debug data.

---

## Task 5: PDP Coming-Soon Checkout Gating

**Files:**
- Modify: `web/src/features/catalog/ProductDetailPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/ProductDetailPage.test.tsx`
- Test: `web/src/app/App.interactions.test.tsx` if route/cart behavior changes

**Interfaces:**
- Consumes: PDP `is_purchasable`, `release_status`, release date, review visibility, checkout visibility.
- Produces: unreleased PDP state that blocks purchase and hides official payment actions.

- [ ] For unreleased PDPs, hide Add to cart, PayPal, Pay Later, and delivery express payment frames.
  - Inspection standard: no official payment button/message containers render for `is_purchasable=false`; no blank payment frame remains.
- [ ] Render a disabled `Coming soon` or `Not released` primary action with release context.
  - Inspection standard: button is visibly disabled, has an accessible disabled state, and includes nearby explanatory copy.
- [ ] Hide reviews and review summary for unreleased products.
  - Inspection standard: no fake rating/review preview appears; buyer sees release/status context instead.
- [ ] Keep PDP navigation and product inspection available.
  - Inspection standard: image, title, facts, story, and shipping/return information remain accessible even when purchase is blocked.
- [ ] Add tests for released versus unreleased PDP behavior.
  - Inspection standard: test proves released product shows official payment zone and unreleased product does not.

---

## Task 6: PDP Purchase Rail, Support Cards, Reviews, And Detail Navigation

**Files:**
- Modify: `web/src/features/catalog/ProductDetailPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/ProductDetailPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

**Interfaces:**
- Consumes: real review data, product facts/story/lineup, existing trust/support copy, Pay Later message placement.
- Produces: denser desktop PDP purchase/support hierarchy and discoverable real reviews.

- [ ] Compact the four support cards under the purchase rail into a smaller trust/support band or collapsible section.
  - Inspection standard: desktop gallery-left blank space is reduced; support info no longer makes the right column feel like a second tall page.
- [ ] Keep the official amount-aware Pay Later message directly under the price for purchasable products.
  - Inspection standard: Pay Later message is neither boxed with heavy chrome nor separated from price by unrelated trust cards.
- [ ] Add visible rating/review summary near title when real review data exists.
  - Inspection standard: star/score/count derive from actual review records; if no review data exists, omit rather than invent.
- [ ] Add a review preview/summary block in the details area for released products.
  - Inspection standard: Customer reviews are discoverable without hunting through an empty-looking tab; review cards remain backed by seeded/submitted review data.
- [ ] Optimize detail navigation.
  - Inspection standard: desktop uses refined shadcn/Radix tabs with visible active state, no vertical scrollbar artifact, and 44px+ triggers; mobile uses either an accordion or a clearly scrollable tab rail with no clipped/right-hidden inaccessible tabs.
- [ ] Verify tab interaction by keyboard and click.
  - Inspection standard: each tab/accordion section activates, updates selected/expanded state, and exposes the right panel without leaving inactive panels visible to the a11y tree.

---

## Task 7: PDP Mobile Sticky Purchase Bar

**Files:**
- Modify: `web/src/features/catalog/ProductDetailPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/ProductDetailPage.test.tsx`
- Test: `web/src/app/App.interactions.test.tsx` if add-to-cart flow changes

**Interfaces:**
- Consumes: selected purchase option, quantity/selected pack, current price, add-to-cart handler, purchasable state.
- Produces: mobile sticky purchase bar that appears only when useful.

- [ ] Add intersection/visibility logic for the main PDP CTA.
  - Inspection standard: sticky bar appears only when the primary Add to cart action is scrolled out of view and disappears when the main CTA is visible again.
- [ ] Released products: sticky bar includes selected option, quantity or pack count, price, and Add to cart.
  - Inspection standard: sticky action uses the same handler and selected quantity as the main PDP controls; it cannot add the wrong pack quantity.
- [ ] Unreleased products: sticky bar is hidden or shows a disabled coming-soon state only if it improves clarity.
  - Inspection standard: no mobile sticky payment/paypal action appears for unreleased products.
- [ ] Reserve bottom padding and avoid covering tabs, PayPal messages, footer links, or browser safe-area.
  - Inspection standard: at `320px` and `390px`, the sticky bar does not obscure last visible content and respects `env(safe-area-inset-bottom)`.
- [ ] Add tests for visibility trigger and add-to-cart reuse.
  - Inspection standard: test simulates CTA hidden/visible state and confirms no duplicate cart action dispatch.

---

## Task 8: Final V5 Verification And Tracking Close

**Files:**
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `tracking/todos.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/progress.md`
- Optional evidence: `/private/tmp/paypal-retail-category-pdp-v5-final-YYYYMMDD/`

**Interfaces:**
- Consumes: completed Task 2-7 implementations.
- Produces: auditable V5 completion claim.

- [ ] Run focused unit/interaction/style tests for Category, PDP, App routing/cart integration, and payment placement touched by V5.
  - Inspection standard: test command names and pass counts are recorded in `tracking/progress.md`.
- [ ] Run `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check`.
  - Inspection standard: all pass before V5 task rows are marked complete.
- [ ] Run browser GUI at `1440`, `1280`, `1024`, `768`, `390`, and `320` for Category, released PDP, and unreleased PDP.
  - Inspection standard: evidence confirms no page-level horizontal overflow, no clipped tabs/filter controls, no sticky overlap, official PayPal surfaces present only where eligible, and no merchant-console errors.
- [ ] Run a second review gate after each implementation milestone.
  - Inspection standard: Category implementation gets a review before PDP begins; PDP implementation gets review before final close; review comments are either fixed or tracked explicitly.
- [ ] Update all tracking rows together.
  - Inspection standard: `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` agree on what is complete, what remains open, and what evidence proves it.

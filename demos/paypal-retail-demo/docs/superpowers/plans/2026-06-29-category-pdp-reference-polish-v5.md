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

## Requirement Coverage From The Last Review

This section exists to prevent the previous V2/V3 problem where a slice was directionally right but still missed user-visible requirements after deploy.

Category requirements:

- Pay Later message: center it and place it in a restrained wrapper/card that matches the page design tokens, while preserving the official `paypal-message` element untouched.
- Filters: simplify the current dense filter list, move primary category/filter/sort controls above the product grid, and avoid a long full filter sidebar consuming mobile viewport.
- Active filters: keep applied state visible after filtering, with reset controls that do not require reopening the filter sheet.
- Coming soon products: show a top-right text badge and visually separate their media, for example muted/desaturated image treatment, without relying on color alone.
- Unreleased product actions: do not expose cart/payment-start affordances for coming-soon products.
- Mobile Category: product cards must appear quickly; filter/sort controls must be touch-friendly and cannot clip at `320px`.
- PayPal safety: the wrapper may style only merchant-owned surrounding chrome, not the PayPal-rendered message.

PDP requirements:

- Coming soon PDP: hide buy button, Add to cart, PayPal, Pay Later, and delivery express frames; show a disabled gray/coming-soon action with clear release context.
- Purchase support cards: optimize the `PayPal checkout`, `Delivery choices`, `Order recovery`, and `Demo policies` card arrangement because the current grid creates too much empty space below the image.
- Detail navigation: mobile tab list is constrained by width and right-side tabs can become inaccessible; improve the UX with a mobile accordion or a clearly scrollable constrained tab rail.
- Tab styling: current tabs feel rough; selected, hover, focus, and active panel states need more polished treatment.
- Reviews: show product reviews and star/rating summary for released products when real review data exists; do not fake stars/counts when absent.
- Sticky mobile CTA: when the primary Add to cart is out of view on mobile, show a sticky bottom action with selected option, quantity/pack, price, and Add to cart.
- Sticky safety: sticky CTA cannot cover PayPal messages, detail tabs, footer links, browser safe-area, or form controls.
- Released vs unreleased split: released PDP and unreleased PDP must be QAed separately.

Review-process requirements:

- Run a pre-implementation baseline before runtime edits.
- Keep Category and PDP as separate reviewable milestones.
- Use a subagent or independent checklist review after Category and after PDP implementation.
- Final close requires screenshots/metrics at the required six widths plus focused tests and tracking updates.

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

- [ ] Capture live baseline screenshots on `https://retail-demo.onrender.com` for these routes: `/products`, `/products?category=blind-boxes`, `/products?q=molly`, `/products/blind-boxes-2`, and `/products/blind-boxes-1`.
  - Inspection standard: every route has `1440`, `1280`, `1024`, `768`, `390`, and `320` screenshots, named by page/route/width.
- [ ] Record Category metrics in JSON: header/nav height, first product card top, filter/control block height, active-chip row width, Pay Later wrapper top/height, product-grid column count, coming-soon card count, sale-card count, document width, viewport width, and horizontal overflow boolean.
  - Inspection standard: metrics identify whether mobile products appear before a long filter stack and whether Pay Later interrupts the grid rhythm.
- [ ] Record released PDP metrics in JSON: gallery height, purchase panel top/height, support-card grid top/height, Pay Later message top/height, details nav `clientWidth`, `scrollWidth`, `clientHeight`, `scrollHeight`, review-card count, review-summary presence, sticky CTA presence, document width, viewport width, and horizontal overflow boolean.
  - Inspection standard: metrics quantify the current blank gap below the gallery and tab clipping/scrollbar risk.
- [ ] Record unreleased PDP metrics in JSON: Add to cart button presence, PayPal frame presence, Pay Later message presence, review-card count, disabled coming-soon action presence, release-context text presence, document width, viewport width, and horizontal overflow boolean.
  - Inspection standard: unreleased products are measured separately; released-product acceptance cannot be used to close unreleased-product gating.
- [ ] Capture interaction notes: open Category filters on mobile, apply a release-status/category filter, reset filters, activate every PDP detail tab/accordion section, and scroll released PDP until the main CTA leaves view.
  - Inspection standard: interaction notes list any broken control, missing focus state, clipped label, blocked scroll, or inaccessible tab before implementation begins.
- [ ] Run `ui-ux-pro-max` review against Category filter/product-card UX and PDP tab/review/mobile purchase UX.
  - Inspection standard: each recommendation is mapped to a task ID and either implemented, explicitly deferred, or rejected with a reason.
- [ ] Decide execution mode before runtime edits.
  - Inspection standard: use subagent review for Category and PDP separately when possible; if inline execution is used, add a written checklist review after each slice before continuing.

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

- [ ] Locate the Category Pay Later section in the grid header/control area, not as a disconnected full-width text line.
  - Inspection standard: on desktop, it sits visually with the product controls/grid column; on mobile, it appears after the compact filter/sort row and before or near product cards without consuming a large standalone viewport block.
- [ ] Build merchant-owned wrapper chrome with a restrained shadcn `Card` or card-like section.
  - Inspection standard: wrapper uses page tokens, warm border/background, compact padding, optional short label such as `Flexible Pay Later options`, and a max height that does not crowd the first mobile product pass.
- [ ] Center the official Pay Later message inside the wrapper.
  - Inspection standard: the wrapper can use flex/grid alignment around the message, but CSS selectors must not target `paypal-message`, PayPal shadow DOM, SDK iframes, SDK custom elements, or PayPal button internals.
- [ ] Preserve amount-free presentment on Category.
  - Inspection standard: Category does not pass product/cart amount into this message unless a supported category-level amount strategy is later documented; PDP/cart/minicart/checkout remain amount-aware where already implemented.
- [ ] Add loading, ready, unavailable, and failure states.
  - Inspection standard: loading reserves stable height; ready shows one `paypal-message`; unavailable/failure shows one buyer-safe fallback; no state shows both official content and fallback at the same time.
- [ ] Add timeout diagnostics if PayPal content fails.
  - Inspection standard: logs include placement, route, amount-free flag, buyer country/currency when available, and provider status; logs do not include credentials, cart secrets, or buyer PII.
- [ ] Add focused tests for wrapper rendering, official-message ready state, fallback-only state, and no duplicate fallback.
  - Inspection standard: tests query merchant-owned labels/wrappers and assert PayPal SDK content remains externally rendered.
- [ ] Browser verify Category Pay Later at `1440`, `1280`, `768`, `390`, and `320`.
  - Inspection standard: one visible Pay Later section, centered message/fallback, no wrapper overflow, no page-level horizontal overflow, no merchant-console errors, and product card top does not regress materially from preaudit.

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

- [ ] Define the Category control hierarchy before coding: page title/result count, quick category chips, sort control, `All filters` trigger, active filter chips, reset action, then product grid.
  - Inspection standard: implementation follows this order in DOM and visual layout unless existing semantics require a small deviation documented in `tracking/progress.md`.
- [ ] Move primary category options into quick chips above the grid.
  - Inspection standard: `All`, `Blind Boxes`, `Figures`, `Plush`, and other implemented categories are visible as compact chips/segmented options, update route/query state, and do not duplicate unsupported filters.
- [ ] Move secondary filters into shadcn `Sheet` on mobile and `Popover`/compact panel on desktop/tablet.
  - Inspection standard: secondary filters include only supported filters: release status, availability, price, pickup availability when location context exists, and category where not already covered by quick chips.
- [ ] Keep active filters visible without reopening the sheet.
  - Inspection standard: active chips show readable label and remove affordance; reset clears all supported filters and preserves `q` only if the buyer explicitly searched.
- [ ] Keep sort separate and always reachable.
  - Inspection standard: sort is a compact select/trigger in the toolbar; changing sort updates visible order and route/query state without closing unrelated filter UI unexpectedly.
- [ ] Implement mobile sheet behavior.
  - Inspection standard: sheet has accessible title/description, focus trap, X close, apply/reset buttons, 44px+ tap rows, selected checkmarks/chips, body scroll lock while open, and returns focus to trigger on close.
- [ ] Preserve route/query semantics for category, release status, price, availability, pickup context, sort, and `q`.
  - Inspection standard: direct URL load, back/forward navigation, filter apply, chip remove, reset, and header search results all reproduce the expected visible state.
- [ ] Add empty and loading states for filtered results.
  - Inspection standard: empty state shows applied filters, reset action, and link to all products; loading state uses shadcn `Skeleton` and never flashes old fixture products.
- [ ] Add accessibility labels and selected-state semantics.
  - Inspection standard: filters expose selected state through text/ARIA, disabled pickup filter includes a concise reason, and color is not the only indicator.
- [ ] Run interaction tests for filter apply/reset, query preservation, active-chip removal, mobile sheet open/apply/close, empty filtered state, and sort changes.
  - Inspection standard: tests cover both live catalog path and fallback/API-down behavior where current tests support it.

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

- [ ] Define card state mapping in code before styling.
  - Inspection standard: every card derives one primary commerce state from data: `released/purchasable`, `released/unavailable`, `coming soon`, `not released`, or `sold out/unavailable` if supported by current data.
- [ ] Add top-right status badge rules.
  - Inspection standard: `Sale` appears for discounted released products; `Coming soon` or `Not released` appears for unreleased products; if both sale and unreleased ever occur, unreleased status wins because buyer action gating is more important.
- [ ] Apply unreleased media treatment.
  - Inspection standard: unreleased media is muted/desaturated through merchant CSS on the image container, product shape remains visible, alt text remains unchanged, and text badge/status copy makes the state understandable without color.
- [ ] Remove or disable purchase-start affordances for unreleased cards.
  - Inspection standard: card cannot add to cart, start checkout, show express payment, or expose a misleading cart icon; primary affordance is `View details`/card link or disabled coming-soon copy.
- [ ] Keep wishlist behavior honest.
  - Inspection standard: if wishlist is not implemented, hide it or keep existing disabled/coming-soon reason; do not leave an inert heart icon without accessible explanation.
- [ ] Keep sale cards visually attractive without clutter.
  - Inspection standard: current price, regular price, sale badge, and product title remain readable at `320px`; line wrapping does not resize card media or push action controls unpredictably.
- [ ] Stabilize media and skeleton behavior.
  - Inspection standard: image containers keep fixed ratio, lazy-loaded images do not flash old mock media, pending product-card surfaces use shadcn `Skeleton`, and loaded/fallback image dimensions do not cause layout jump.
- [ ] Preserve card navigation.
  - Inspection standard: full-card/product-name links navigate to PDP for released and unreleased products; coming-soon status does not block product inspection.
- [ ] Add tests for state mapping, badge priority, unreleased action suppression, sale display, and image/skeleton class contracts.
  - Inspection standard: at least one released sale card and one coming-soon/unreleased card are covered by tests.
- [ ] Browser verify card states with at least one sale product and one coming-soon product at `1440`, `390`, and `320`.
  - Inspection standard: released, sale, and coming-soon states are distinguishable in screenshots without reading debug data, badges do not overlap, and grid height remains stable.

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

- [ ] Implement an explicit released/unreleased purchase-state branch in PDP rendering.
  - Inspection standard: purchasable products follow the existing purchase/PayPal flow; unreleased products use a separate blocked-purchase layout instead of partially disabling controls inside the purchasable layout.
- [ ] For unreleased PDPs, remove purchase and payment surfaces from DOM.
  - Inspection standard: no Add to cart button, PayPal frame, PayPal button, Pay Later button, Pay Later message, express delivery frame, or sticky mobile purchase/payment bar renders for `is_purchasable=false`.
- [ ] Render a disabled `Coming soon` or `Not released` action.
  - Inspection standard: disabled action uses gray/neutral styling, `disabled`/`aria-disabled` semantics where appropriate, and nearby copy explains release status/date using existing data only.
- [ ] Preserve product inspection.
  - Inspection standard: breadcrumb, gallery, product title, status badge, vendor/profile label, facts, story, shipping/returns info, and Q&A/detail content remain reachable.
- [ ] Hide reviews and review summary for unreleased products.
  - Inspection standard: no star rating, review count, review cards, review histogram, or write-review affordance renders before release.
- [ ] Remove fake notify behavior unless implemented.
  - Inspection standard: do not add an enabled `Notify me` or email capture unless a real route/state is wired; a disabled `Coming soon` action is acceptable.
- [ ] Add released vs unreleased tests.
  - Inspection standard: tests prove released product shows Add to cart/payment/reviews where eligible, and unreleased product hides payment/reviews while keeping inspection content.
- [ ] Browser verify `/products/blind-boxes-1` at `1440`, `390`, and `320`.
  - Inspection standard: screenshot shows disabled coming-soon action, no blank payment frame, no review section, no sticky purchase bar, and no horizontal overflow.

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

- [ ] Audit the existing purchase rail modules before moving them.
  - Inspection standard: identify each current module (`PayPal checkout`, `Delivery choices`, `Order recovery`, `Demo policies`) as keep, merge, move to details, or remove; no module is deleted unless its copy is unsupported, duplicate, or tracked as intentionally deferred.
- [ ] Compact support modules into a lower-footprint pattern.
  - Inspection standard: use one of these patterns: inline trust chips below the payment frame, a compact two-row support band, or a `Delivery & support` accordion; avoid a 2x2 card grid that makes the right column much taller than the gallery.
- [ ] Keep official Pay Later directly under price for purchasable products.
  - Inspection standard: price, Pay Later message, purchase options, Add to cart, PayPal frame, and compact support copy stay in that order unless a testable layout constraint requires a documented deviation.
- [ ] Preserve the secured PayPal frame behavior.
  - Inspection standard: when Pay Later is eligible, desktop/tablet can show PayPal and Pay Later side by side if width allows, mobile stacks them, and no custom styling is applied to SDK-rendered buttons.
- [ ] Add visible rating/review summary near title when real review data exists.
  - Inspection standard: show star/score/count only from seeded/submitted review records; if average/count is zero or unavailable, omit rating summary and do not show placeholder stars.
- [ ] Add a review preview/summary block in the details area for released products.
  - Inspection standard: section includes at least summary stats and the existing real review cards when data exists; if there are no reviews, show a concise empty state only for released products and never for unreleased products.
- [ ] Refine desktop detail tabs.
  - Inspection standard: selected trigger has stronger active styling, focus ring is visible, triggers are 44px+ high, tab list height equals scroll height, no vertical scrollbar appears, and inactive panels are hidden from sight and accessibility tree.
- [ ] Refine mobile detail navigation.
  - Inspection standard: either replace mobile tabs with shadcn `Accordion`/`Collapsible` sections or add a constrained `ScrollArea` tab rail with edge affordance; right-side tabs cannot be clipped without a clear scroll affordance.
- [ ] Preserve all current detail sections.
  - Inspection standard: `Collector details`, `Product facts`, `Gallery`, `Customer reviews`, `Shipping and returns`, and `Q&A` remain accessible for released products unless a section has no real data and is intentionally hidden with tracking.
- [ ] Add tests for support-card compaction, review summary rendering, no fake review rendering, desktop tab activation, mobile detail navigation state, and a11y visibility of inactive panels.
  - Inspection standard: tests cover both mouse/click and keyboard activation where the component supports it.
- [ ] Browser verify released PDP at `1440`, `1280`, `768`, `390`, and `320`.
  - Inspection standard: no desktop blank-gap regression, Customer reviews are visibly discoverable, tabs/details interact correctly, no clipped mobile tabs/accordion controls, no internal scrollbar artifact, and no page-level horizontal overflow.

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
  - Inspection standard: sticky bar appears only below the mobile breakpoint and only when the primary Add to cart action is scrolled out of view; it disappears when the main CTA returns to view.
- [ ] Define sticky bar content for released products.
  - Inspection standard: bar includes short product title or option label, selected purchase option (`Random 1PC` or `Whole Box` when applicable), selected quantity/pack count, current price for the selected option, and one Add to cart action.
- [ ] Reuse the main add-to-cart state and handler.
  - Inspection standard: sticky action cannot add the wrong product, option, or quantity; whole-box option still adds the intended whole-box quantity; loading/error states match the main CTA.
- [ ] Keep PayPal out of the sticky bar.
  - Inspection standard: sticky bar does not render PayPal, Pay Later, card, wallet, or express-payment buttons; it is an Add to cart shortcut only.
- [ ] Handle unreleased products.
  - Inspection standard: sticky bar is hidden for unreleased products unless the final design explicitly chooses a disabled coming-soon bar; in either case, no sticky payment or Add to cart action appears.
- [ ] Reserve layout space and safe-area padding.
  - Inspection standard: body/main bottom padding prevents footer/detail content from being hidden, bar uses `env(safe-area-inset-bottom)`, and the bar does not cover PayPal messages, detail tabs, footer links, or form controls at `320px` and `390px`.
- [ ] Add keyboard and screen-reader affordances.
  - Inspection standard: sticky Add to cart has accessible name including selected option or quantity, focus styles are visible, and the bar does not trap focus.
- [ ] Add tests for visibility trigger, selected option sync, whole-box quantity, hidden unreleased state, loading/error copy, and no duplicate cart dispatch.
  - Inspection standard: tests simulate CTA hidden/visible state and verify exactly one cart add handler call per sticky click.
- [ ] Browser verify released and unreleased PDP sticky behavior at `390` and `320`.
  - Inspection standard: released sticky bar appears/disappears correctly during scroll; unreleased PDP has no active sticky purchase action; no content is covered at the bottom of the page.

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

- [ ] Run Category focused tests after Task 2-4.
  - Inspection standard: record exact command names and pass counts for Category Pay Later wrapper, filters/sort/query state, mobile sheet behavior, active chips, card states, unreleased action suppression, sale badges, skeleton/media contracts, and fallback/API-down behavior where covered.
- [ ] Run Category browser GUI before PDP implementation begins.
  - Inspection standard: verify `/products`, `/products?category=blind-boxes`, and `/products?q=molly` at `1440`, `1280`, `768`, `390`, and `320`; no page-level horizontal overflow; product cards appear early on mobile; Pay Later wrapper/message is integrated; filters apply/reset; coming-soon and sale cards are distinguishable.
- [ ] Run Category review gate.
  - Inspection standard: independent reviewer/subagent/checklist either approves the Category slice or creates explicit open rows; do not start PDP runtime edits until Category review findings are resolved or tracked.
- [ ] Run PDP focused tests after Task 5-7.
  - Inspection standard: record exact command names and pass counts for released/unreleased state branching, payment-frame gating, review summary, support-card compaction, tab/accordion activation, inactive-panel a11y state, sticky CTA visibility, selected option sync, whole-box quantity, and no duplicate add-to-cart dispatch.
- [ ] Run PDP browser GUI before final close.
  - Inspection standard: verify `/products/blind-boxes-2` and `/products/blind-boxes-1` at `1440`, `1280`, `768`, `390`, and `320`; released PDP shows payment/reviews/sticky CTA correctly; unreleased PDP hides purchase/payment/reviews; tabs/accordion controls are usable; no page-level horizontal overflow.
- [ ] Run full quality gate.
  - Inspection standard: `npm run typecheck`, `npm run lint`, `npm run format:check`, `git diff --check`, and any affected focused test suites pass before V5 rows are marked complete.
- [ ] Capture final evidence package.
  - Inspection standard: `/private/tmp/paypal-retail-category-pdp-v5-final-YYYYMMDD/` includes screenshots, metrics JSON, console log summary, test command summary, and before/after notes for Category and PDP.
- [ ] Run final review gate.
  - Inspection standard: second reviewer/subagent/checklist reviews the final evidence and code diff; findings are fixed or tracked explicitly before completion is claimed.
- [ ] Update all tracking rows together.
  - Inspection standard: `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` agree on completed rows, remaining open rows, evidence path, pass commands, and deferred scope.
- [ ] Do not close V5 if any hard-blocker remains.
  - Inspection standard: hard blockers include missing Pay Later message/fallback, unreleased PDP with active payment/add-to-cart action, mobile horizontal overflow, clipped inaccessible tabs/filter controls, fake review/rating data, sticky CTA covering content, or missing final evidence.

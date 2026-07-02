# Category And PDP Refinement V6 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` for independent implementation slices, or `superpowers:executing-plans` for inline execution with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved 2026-07-02 Category `A+B` and PDP `A with simpler B wording` polish while preserving POP MART retail tone, real catalog/review data, and official PayPal SDK-rendered surfaces.

**Architecture:** `DESIGN.md` owns the visual contract. This plan owns file-level implementation sequence, acceptance criteria, and inspection standards. `IMPLEMENTATION_TASKS.md` owns canonical milestone status. `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` own execution queue, QA gates, and evidence notes.

**Tech Stack:** Vite React, TypeScript, shadcn/Radix `Sheet`, `Tabs`, `Card`, `Separator`, `Button`, Lucide icons, app-owned CSS in `web/src/styles/global.css`, official PayPal SDK v6 buttons/messages.

## Approved Direction

- Category uses the approved `A+B` direction: product-first layout, no bulky `All products` hero block, compact desktop controls, quiet Pay Later divider/strip, and a mobile floating circular filter action.
- PDP uses approved `A` structure with simple `B` wording: purchase rail remains commercial only, and the four support tiles move into lower details between `Collector details` and `Series lineup`.
- Footer adds verified payment marks for PayPal, Visa, Mastercard, and any already-supported checkout options only after asset-source verification.

## Source Inputs

- Visual contract: `demos/paypal-retail-demo/DESIGN.md`, section `Category + PDP Refinement V6`.
- Selected companion mockup: `.superpowers/brainstorm/8488-1782991077/content/category-pdp-polish-v3-selected.html`.
- Read-only UX review: sub-agent `019f22a4-6297-7222-8166-46ff59ffdda9`, using `ui-ux-pro-max`.
- Existing runtime surfaces:
  - `web/src/features/catalog/CategoryPage.tsx`
  - `web/src/features/catalog/ProductDetailPage.tsx`
  - `web/src/app/App.tsx`
  - `web/src/styles/global.css`

## Sub-Agent Review Findings To Preserve

- V6 direction is strong, but the current code still reflects V5: prominent `catalog-hero`, text mobile filter rail, card-like Category Pay Later, and PDP support tiles under the PayPal frame.
- The mockup is not implementation-complete. The mobile filter FAB needs a real button/shadcn trigger, Lucide icon, accessible label, focus ring, safe-area offsets, and z-index rules.
- Do not copy the mockup's `overflow: hidden` tab simplification. Preserve the existing shadcn/Radix scroll-affordance and accessibility fixes.
- Existing tests encode old V5 behavior and must be updated, especially `CategoryPage.test.tsx` expectations for `catalog-paylater__card` and text mobile filter controls, plus `ProductDetailPage.test.tsx` expectations that support tiles follow the PayPal frame.

## Global Constraints

- Do not restyle, recolor, fake, or decorate PayPal SDK internals, SDK iframes, official buttons, `paypal-message`, card fields, wallet buttons, or Pay Later buttons. Merchant CSS may reserve layout space and set display/full-width/min-height on SDK custom elements only.
- Category Pay Later remains amount-free. PDP, cart, minicart, and checkout keep their existing amount-aware behavior.
- Do not add fake ratings, fake review counts, fake delivery guarantees, fake authenticity claims, unsupported return policy claims, unsupported wallet capability claims, or fake preorder economics.
- Product imagery is the primary storefront signal. Controls, Pay Later strips, and support tiles must not dominate first viewport.
- Use SVG/Lucide icons, not emoji icons. Verify brand SVGs from the approved local logo source before adding footer marks.
- Touch targets must be at least `44px` where merchant-owned UI controls are interactive.
- No page-level horizontal overflow is allowed at `320`, `390`, `768`, `1024`, `1280`, or `1440`.
- Hover/focus states must not shift layout.
- Keep shadcn components as behavior primitives. Do not replace ecommerce page composition with generic shadcn page blocks.

## Files And Responsibilities

- `DESIGN.md`: V6 visual contract and acceptance standards.
- `PLAN.md`: active router. It must point future workers to this V6 plan, not the closed V5 plan.
- `IMPLEMENTATION_TASKS.md`: canonical Milestone 16 checklist rows for V6.
- `tracking/todos.md`: near-term execution queue and remaining open work.
- `tracking/test-cases.md`: acceptance rows and final QA checklist.
- `tracking/progress.md`: planning and implementation evidence.
- `web/src/features/catalog/CategoryPage.tsx`: Category structure, compact context, Pay Later strip, filter FAB trigger wiring, route-state preservation.
- `web/src/features/catalog/ProductDetailPage.tsx`: PDP support-tile relocation, support wording, tab label/review summary changes.
- `web/src/app/App.tsx`: footer payment marks and any shell-level payment-mark tests.
- `web/src/styles/global.css`: Category compact rhythm, floating filter action, Pay Later strip, PDP support tiles, review typography, footer payment marks, responsive/focus rules.
- Focused tests:
  - `web/src/features/catalog/CategoryPage.test.tsx`
  - `web/src/features/catalog/ProductDetailPage.test.tsx`
  - `web/src/app/App.test.tsx`
  - `web/src/app/App.interactions.test.tsx` only if route/filter or footer behavior needs integration coverage
  - `web/src/styles/global.test.ts`

---

## Task 1: Planning Lock And Baseline Review

**Status:** Planning handoff task. Complete before runtime edits.

- [x] Spawn a read-only `ui-ux-pro-max` sub-agent to review the selected mockup and V6 plan direction.
- [x] Reconcile sub-agent findings into this plan, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md`.
- [ ] Before runtime edits, capture a small baseline if the current local UI has drifted since V5:
  - `/products`
  - `/products?category=blind-boxes`
  - `/products?q=molly`
  - `/products/blind-boxes-2`
  - `/products/blind-boxes-1`
- [ ] Record current metrics for each route at `390` and `320` first, then desktop if the UI has drifted:
  - document width
  - viewport width
  - horizontal overflow boolean
  - first product media top and visible pixels
  - Category control block height
  - Category Pay Later strip height
  - mobile filter trigger bounding box
  - PDP purchase rail support-tile presence
  - PDP lower-details support-tile position

Inspection standard:

- The implementation starts from this V6 plan, not the closed V5 plan.
- Any drift from the selected mockup or V6 design section is recorded before code changes.
- Future workers can see which old V5 tests must be rewritten.

---

## Task 2: Category Product-First Structure

**Files:**

- Modify: `web/src/features/catalog/CategoryPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/CategoryPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

Steps:

- [ ] Remove or collapse the large `catalog-hero` presentation from the primary browsing path.
  - The old large `Shop`, `All products`, subtitle, and pill result count must not consume mobile first viewport.
  - Keep compact utility context where useful, for example a small `Shop` label and count, but not as a hero block.
- [ ] Preserve route-aware state for category, query `q`, sort, availability, release status, price, and pickup filter behavior.
- [ ] Keep desktop controls to one compact row or two compact lines maximum:
  - quick category chips
  - sort
  - `All filters`
  - active filter chips
  - reset
- [ ] Keep product grid as the first dominant visual signal after header/search and compact controls.
- [ ] Remove old explanatory subtitle rendering from runtime if any remains.

Acceptance criteria:

- At `320` and `390`, at least one product image/media box intersects the initial viewport by at least `96px` after data settles.
- On mobile, the buyer does not need to scroll past a large `All products` title/result block or full filter panel before seeing product imagery.
- On desktop, the controls read as a toolbar, not a large dashboard card.
- Direct URLs for `/products`, `/products?category=blind-boxes`, and `/products?q=molly` still render the expected active state.

Inspection standard:

- Screenshot and metrics prove `document.documentElement.scrollWidth <= window.innerWidth`.
- DOM tests assert the old hero/subtitle block is absent or compacted.
- Product grid ordering remains before any secondary filter taxonomy.

---

## Task 3: Category Pay Later Strip And Mobile Filter FAB

**Files:**

- Modify: `web/src/features/catalog/CategoryPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/CategoryPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

Steps:

- [ ] Convert Category Pay Later from a card/copy block to a quiet strip/divider treatment.
  - Use a merchant-owned wrapper with top/bottom border or shadcn `Separator`-like styling.
  - Center the official amount-free PayPal message slot.
  - Remove large merchant copy such as `Flexible checkout` and explanatory paragraphs from the strip.
- [ ] Preserve loading, ready, timeout, and fallback behavior with stable height.
- [ ] Replace the mobile text filter rail with a floating circular Sheet trigger.
  - Use a real Lucide icon such as `SlidersHorizontal` or `ListFilter`.
  - Use `Button`/`SheetTrigger` semantics.
  - Provide `aria-label`, visible focus, and 44px minimum target size.
  - Position lower right with safe-area padding and no overlap with card CTAs.
- [ ] Keep the existing shadcn `Sheet` filter body, selected indicators, reset/apply behavior, and focus return.
- [ ] Ensure the floating action is hidden or restyled appropriately on desktop/tablet.

Acceptance criteria:

- Category Pay Later renders one official message or one buyer-safe fallback. It never renders both at once.
- Category Pay Later section stays visually compact in fallback/timeout states and does not add unsupported marketing copy.
- Mobile FAB is a circular icon button, not a text pill.
- The FAB opens the existing filter sheet and returns focus after close.
- FAB target is at least `44px x 44px`; preferred visual size is `52px-56px`.

Inspection standard:

- Tests no longer expect `catalog-paylater__card` or text `Filter & sort` rail behavior.
- CSS tests or DOM assertions pin safe-area offsets, focus-visible style, and default hidden/visible breakpoint rules.
- Browser metrics at `320` and `390` prove FAB does not overlap product-card primary text/CTA zones.

---

## Task 4: PDP Support Tiles, Tabs, And Reviews

**Files:**

- Modify: `web/src/features/catalog/ProductDetailPage.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/features/catalog/ProductDetailPage.test.tsx`
- Test: `web/src/styles/global.test.ts`

Steps:

- [ ] Remove `product-support-band` from the released PDP purchase rail below the PayPal frame.
- [ ] Render support tiles only in the lower details content between the collector story card and `Series lineup`.
- [ ] Use exact approved labels and body copy:
  - `PayPal checkout`: `Official surfaces when eligible.`
  - `Delivery express`: `Start delivery checkout here.`
  - `Pay Later`: `Shown for eligible products.`
  - `Order recovery`: `Track or recover after checkout.`
- [ ] Style tiles as flat/tiled support cards or compact cells, not a nested panel and not a second purchase module.
- [ ] Keep unreleased PDPs hiding purchase, PayPal, Pay Later, reviews, social-proof cards, and sticky purchase surfaces.
- [ ] Keep tab mechanics accessible:
  - visible concise labels may use `Reviews (1)` where tight
  - accessible label/name still communicates `Customer reviews`
  - no clipped triggers
  - no vertical scrollbar artifact
  - inactive panels remain hidden from assistive tech
- [ ] Replace visual rating copy with compact SVG/icon stars only when real review data exists.
  - Example visual: five yellow star icons plus `(1)`
  - Accessible label: `5.0 out of 5 from 1 collector review`
  - Review cards show SVG/icon stars, not `5 out of 5`, while retaining accessible rating semantics.

Acceptance criteria:

- Released PDP purchase rail order is price, amount-aware Pay Later, options/quantity, Add to cart, official PayPal/Pay Later frame. No support tile grid appears after the PayPal frame.
- Lower details order is collector story, support tiles, series lineup.
- Support tile labels and body copy match this plan exactly.
- `Customer reviews` tab or accessible label includes the review count when real reviews exist.
- No review summary, star icons, review card, or social proof appears for unreleased products or released products with no real review data.

Inspection standard:

- Tests assert support tile index is greater than collector story index and less than series lineup index.
- Tests assert support tile index is not greater than PayPal frame index inside the purchase rail.
- Tests assert old `5.0 / 5 Based on 1 collector review` visual copy is replaced while the accessible label remains.
- Browser checks at `320`, `390`, `768`, `1024`, `1280`, and `1440` show no page-level horizontal overflow and no clipped tab text.

---

## Task 5: Footer Payment Marks

**Files:**

- Modify: `web/src/app/App.tsx`
- Modify: `web/src/styles/global.css`
- Test: `web/src/app/App.test.tsx`
- Test: `web/src/styles/global.test.ts`
- Create or reuse: local SVG assets under an approved public asset folder after source verification

Steps:

- [ ] Locate the approved local logo source in the payment wiki or wiki logo repository before adding assets.
- [ ] Add PayPal, Visa, Mastercard, and only already-supported checkout option marks.
  - Apple Pay, Google Pay, and Venmo may appear only if the demo already supports/gates those methods and copy stays conservative.
  - Do not imply every method is available for every buyer, market, amount, browser, or product.
- [ ] Use accessible text labels or image alt labels for every mark.
- [ ] Keep footer copy conservative, for example `Checkout options vary by eligibility and market.` if explanatory copy is needed.
- [ ] Do not hotlink external logo files at runtime.

Acceptance criteria:

- Footer shows verified SVG/payment marks in a compact row that does not dominate the footer.
- Marks are readable at desktop and mobile widths.
- Logo assets are local, not guessed, and not copied from an unverified source.
- No unsupported capability claim is added.

Inspection standard:

- Tests assert the payment mark region exists and includes accessible labels for PayPal, Visa, and Mastercard.
- Browser screenshots at `390` and `1440` show no footer overlap, clipped mark, or contrast problem.
- If official assets cannot be verified, implementation pauses this task and records the blocker instead of inventing logos.

---

## Task 6: Final Verification And Tracking Close

**Files:**

- Modify: `tracking/todos.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/progress.md`
- Modify: `IMPLEMENTATION_TASKS.md`

Required commands:

```bash
npm test -- web/src/features/catalog/CategoryPage.test.tsx web/src/features/catalog/ProductDetailPage.test.tsx web/src/app/App.test.tsx web/src/styles/global.test.ts
npm run typecheck
npm run lint
npm run format:check
git diff --check
```

Run additional focused tests if route, cart, payment, or interaction logic changes:

```bash
npm test -- web/src/app/App.interactions.test.tsx
```

Browser QA matrix:

- Category routes:
  - `/products`
  - `/products?category=blind-boxes`
  - `/products?q=molly`
- PDP routes:
  - released `/products/blind-boxes-2`
  - unreleased `/products/blind-boxes-1`
- Widths:
  - `1440`
  - `1280`
  - `1024`
  - `768`
  - `390`
  - `320`

Final acceptance criteria:

- Category first viewport at `320` and `390` shows product imagery without scrolling past a bulky title, result count, filter panel, or Pay Later card.
- Category Pay Later is quiet, centered, amount-free, and stable during SDK loading/timeout/fallback.
- Category mobile filter FAB is accessible, circular, icon-led, 44px+, and opens/closes the shadcn Sheet correctly.
- PDP purchase rail has no support tile grid under the PayPal frame.
- PDP support tiles appear between collector story and series lineup with exact approved wording.
- PDP review/rating display is compact, real-data-only, accessible, and omitted when no real review data exists.
- Footer payment marks use verified local SVGs and conservative eligibility copy.
- No page-level horizontal overflow on Category/PDP/footer at every verified width.
- Tracking files include evidence path, command output summary, remaining open items, and any deferred hosted smoke.

## Handoff Notes

- Implement Category and PDP as separate reviewable commits or slices if possible.
- Do not mark the V6 row complete based only on static screenshots. The final gate needs focused tests plus browser metrics.
- The selected mockup is a direction reference, not a CSS source of truth. Preserve existing shadcn/Radix accessibility fixes even if the mockup is simpler.

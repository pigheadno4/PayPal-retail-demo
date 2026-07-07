# Checkout Round 3 Pickup And Drawer Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the pickup store-picker flow, simplify mobile checkout order details into a single bottom drawer, make billing/promo transitions truthful and fast, and normalize selected payment button sizing without changing PayPal or BOPIS payment semantics.

**Architecture:** Keep checkout state ownership inside `CheckoutPage.tsx`, but split the highest-risk mobile and pickup behaviors into testable helpers/components if the file becomes harder to reason about. Use shadcn `Sheet`/`Dialog` semantics for modal and drawer layers instead of custom fixed panels where practical. Backend promo APIs remain the source of truth; the frontend must either call real evaluate/apply/remove APIs or show truthful no-promo status.

**Tech Stack:** Vite React, TypeScript, shadcn/Radix primitives, Express checkout/promo APIs, Supabase-backed checkout draft data, Playwright evidence helpers, Vitest/Testing Library.

## Global Constraints

- Do not change PayPal Create Order payload semantics, BOPIS capture-at-checkout semantics, promo calculation order, tax calculation order, cart lifecycle, or payment capture behavior without explicit approval.
- Do not restyle PayPal SDK internals, iframes, shadow DOM, official buttons, or `paypal-message` content.
- Mobile checkout Option A is approved: task-first checkout content, order details owned by a bottom drawer/sheet, no duplicated mobile order summary card in the main page, and sticky collapsed drawer limited to total, promo, and current payment action.
- Pickup store search results must not render under the sticky site header, and canceling the picker must return the buyer to Pickup location for re-submit instead of exposing inline store cards.
- Promo UI must not fake activation. A visible discount must come from the backend promo evaluation/apply path and must render as a signed amount line, for example `-$3.99 promo`.
- Payment CTA width must be normalized across PayPal and Pay Later in the mobile drawer/sticky action slot while preserving provider-owned rendering.

---

## File Structure

- Modify `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`: pickup store-picker state transitions, mobile order drawer state, billing optimistic progression, promo application calls, and payment action slot wiring.
- Modify or create `demos/paypal-retail-demo/web/src/features/checkout/CheckoutMobileOrderDrawer.tsx`: extracted mobile drawer component if `CheckoutPage.tsx` needs separation.
- Modify or create `demos/paypal-retail-demo/web/src/features/checkout/promoActivation.ts`: small frontend helper for real promo evaluate/apply/remove orchestration if the logic is more than a few lines.
- Modify `demos/paypal-retail-demo/web/src/features/checkout/checkoutDraftApi.ts`: expose typed promo evaluate/apply/remove calls if they are not already available to checkout UI.
- Modify `demos/paypal-retail-demo/web/src/app/App.checkout-paypal-capture.test.tsx`: App-level create-order request/callback regression proof for selected PayPal/Pay Later and blocked states.
- Modify `demos/paypal-retail-demo/web/src/app/App.interactions.test.tsx`: App-level overlay/drawer/menu interaction regression proof where checkout actions are owned at App scope.
- Modify `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.test.tsx`: component tests for picker layering state, cancel fallback, drawer duplication removal, CTA width slots, and promo UI.
- Modify `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.interactions.test.tsx`: interaction tests for pickup search/cancel/select, billing submit latency, and drawer open/close.
- Modify `demos/paypal-retail-demo/web/src/features/checkout/checkoutDraftApi.test.ts`: API mapping tests for promo evaluate/apply/remove and discount display labels.
- Modify `demos/paypal-retail-demo/web/src/styles/global.css`: z-index/layering, mobile drawer/sticky CTA sizing, duplicate summary mobile hiding, and safe-area reserves.
- Modify `demos/paypal-retail-demo/web/src/styles/global.test.ts`: CSS contract tests for modal layer above header, no mobile duplicate summary, consistent CTA slot width, and safe-area reserves.
- Modify or create `demos/paypal-retail-demo/tools/round3-checkout-pickup-drawer-evidence.playwright.js`: API-backed local/hosted visual evidence helper for the accepted states.
- Modify `demos/paypal-retail-demo/package.json`: add `evidence:round3:checkout-pickup-drawer` script if the helper is created.
- Update `demos/paypal-retail-demo/CART_CHECKOUT_A_PLUS_SPEC.md`, `demos/paypal-retail-demo/DESIGN.md`, `demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md`, `demos/paypal-retail-demo/tracking/todos.md`, `demos/paypal-retail-demo/tracking/test-cases.md`, and `demos/paypal-retail-demo/tracking/progress.md` as each task is completed.

## Task 1: Pickup Store Picker Layering And Cancel Fallback

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.interactions.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.test.ts`

**Interfaces:**
- Consumes: existing pickup location submit flow, `pickupStoreModalOpen`, `suppressInlineStoreCards`, checkout step state, active fulfillment mode.
- Produces: a picker close reason flow: `confirm`, `cancel`, `dismiss`; a reset helper that reopens Pickup location and suppresses inline store cards after cancel.

- [x] **Step 1: Write failing interaction tests for pickup cancel fallback**

  Cover the buyer path: switch to Pickup, enter ZIP, submit, picker opens, buyer cancels, Pickup location is the active editable section again, Store selection is not expanded with inline cards, and no selected store is committed.

  Run: `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx`

  Expected before implementation: FAIL because cancel leaves Store selection visible or inline cards mounted.

- [x] **Step 2: Write failing style tests for modal layering**

  Assert the pickup picker layer token is above `.site-header` and shadcn Dialog/Sheet layers are not below the header.

  Run: `npm test -- web/src/styles/global.test.ts`

  Expected before implementation: FAIL because `.checkout-modal` uses a lower layer than `.site-header`.

- [x] **Step 3: Implement explicit picker close reasons**

  Replace generic close behavior with `handlePickupStorePickerClose(reason)`. On `cancel` or outside dismiss before store confirmation:
  - close the picker
  - clear pending modal selection only
  - set Pickup location as active/editing
  - collapse or lock Store selection back to dormant
  - keep inline store cards suppressed until a confirmed store exists or the buyer submits ZIP again
  - keep cart and draft data intact

- [x] **Step 4: Fix layer ownership**

  Prefer shadcn `Dialog` or `Sheet` for the picker if it can be adopted locally without broad rewrites. If the custom modal remains, raise its layer above the sticky site header and ensure the scroll container top/bottom padding prevents header overlap at 320, 390/414, and 1440 widths.

- [x] **Step 5: Verify Task 1**

  Run: `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx web/src/styles/global.test.ts`

  Result: PASS on 2026-07-07, with tests proving cancel fallback and modal/header layer order. Browser width proof remains in the Round 3 evidence helper task.

## Task 2: Mobile Order Summary Drawer Owns Details

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Create or modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutMobileOrderDrawer.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.test.ts`

**Interfaces:**
- Consumes: existing order summary data, selected payment method, payment readiness, provider action slots, sticky summary state.
- Produces: mobile-only bottom drawer/sheet that is the only place mobile order detail rows appear after the main checkout task content.

- [x] **Step 1: Write failing tests for duplicate mobile order detail removal**

  At mobile width, assert the main checkout page does not render the full order summary card/details while the collapsed drawer exists. The desktop summary must still render.

  Run: `npm test -- web/src/features/checkout/CheckoutPage.test.tsx`

  Result: FAIL confirmed on 2026-07-07 before implementation. The new test found the mobile page still rendered `role="complementary" aria-label="Order summary"` alongside the collapsed drawer.

- [x] **Step 2: Revalidate drawer interaction tests**

  Assert the collapsed drawer trigger opens shadcn bottom `Sheet`, click/scrim/Escape close it, focus returns to the trigger, and the expanded sheet contains item row, subtotal, promo, shipping, tax, total, and current payment action when ready.

  Run: `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx`

  Result: Existing focused coverage already exercised this Round 2 drawer behavior, and the Task 2 verification rerun kept it green. No new drawer runtime behavior was added in this slice.

- [x] **Step 3: Keep the existing mobile drawer contract**

  Keep the collapsed surface minimal:
  - left side: total label and amount
  - directly below amount: signed promo line when discount exists
  - right side: `Choose payment` disabled state, selected PayPal action, selected Pay Later action, or no sticky provider action for card
  - top edge: a neutral handle integrated into the drawer surface, no arrow or caret badge

  Expanded sheet contains order details and the same current payment action. Background checkout content is inert through Radix semantics.

  Result: Existing `CheckoutMobileStickySummary`/shadcn `Sheet` contract was preserved.

- [x] **Step 4: Hide duplicate mobile summary**

  Hide or unmount the full `.checkout-summary` on mobile when the sticky drawer is active, while keeping it present on desktop/tablet. Do not reorder `.checkout-summary` before `.checkout-workflow`.

- [x] **Step 5: Verify Task 2**

  Run: `npm test -- web/src/features/checkout/CheckoutPage.test.tsx web/src/features/checkout/CheckoutPage.interactions.test.tsx web/src/styles/global.test.ts`

  Result: PASS on 2026-07-07 (`75` tests). Mobile no longer renders the duplicate full order summary card when the sticky drawer is active; desktop/tablet summary remains covered by the existing reference summary tests; and the mobile fallback summary path remains covered when the sticky drawer is intentionally suppressed. Browser-matrix proof remains in the Round 3 evidence helper task.

## Task 3: Billing Submit Progression And Loading Feedback

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.interactions.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.test.tsx`

**Interfaces:**
- Consumes: existing `saveStepAndEditNext`, draft update queue, payment readiness, shipping method/pickup date next-step logic.
- Produces: optimistic next-section opening for billing steps with skeleton or pending totals state while backend recalculation settles.

- [x] **Step 1: Write failing latency tests**

  Simulate a slow billing draft update. Delivery billing submit should open Shipping method within 250ms after client validation. Pickup billing submit should open Pickup date within 250ms after client validation. Payment remains disabled until latest draft response applies.

  Run: `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx`

  Result: FAIL confirmed before implementation because Delivery billing did not open Shipping options and Pickup billing did not open Pickup date while the slow billing draft update was still pending. The final tests cover both slow Delivery and slow Pickup billing saves plus blocked Payment method state.

- [x] **Step 2: Implement billing optimistic progression**

  Extend the existing optimistic progression behavior beyond shipping-address:
  - delivery `billing-address` opens `shipping-method` shell within 250ms
  - pickup `pickup-billing-address` opens `pickup-date` shell within 250ms
  - show recalculating/pending totals copy while the request is in flight
  - keep selected provider actions hidden/disabled until totals are current
  - on failure, return focus and inline error to Billing address

- [x] **Step 3: Verify Task 3**

  Run: `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx web/src/features/checkout/CheckoutPage.test.tsx`

  Result: PASS on 2026-07-07. `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx` passed `24` tests, including slow-response, literal focus return, and failure rollback paths for Delivery and Pickup billing. `npm test -- web/src/features/checkout/CheckoutPage.interactions.test.tsx web/src/features/checkout/CheckoutPage.test.tsx` passed `60` checkout tests. Browser/API-backed timing evidence remains open in Task 7.

## Task 4: Real Promo Activation Path

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/checkoutDraftApi.ts`
- Modify or create: `demos/paypal-retail-demo/web/src/features/checkout/promoActivation.ts`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/checkoutDraftApi.test.ts`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.test.tsx`

**Interfaces:**
- Consumes: backend `POST /api/checkout/drafts/:id/promos/evaluate`, `POST /api/checkout/drafts/:id/promos/apply`, and `DELETE /api/checkout/drafts/:id/promos/:code`.
- Produces: buyer-visible promo state that is either truthful no-promo, real auto/recommended discount, or real manual-code result if manual entry remains enabled.

- [x] **Step 1: Write failing API mapping tests**

  Assert evaluate/apply/remove clients map backend success, rejected promo, and network failure into typed frontend states without inventing discounts.

  Run: `npm test -- web/src/features/checkout/checkoutDraftApi.test.ts`

  Expected before implementation: FAIL if checkout UI has no typed evaluate/apply/remove path.

- [x] **Step 2: Write failing UI tests for real discount activation**

  With a mocked backend discount response, assert the collapsed drawer, expanded drawer, and desktop summary show the signed discount amount under total. With no selected discount, assert `No promo applied` or equivalent truthful status. No fake inert input may render.

  Run: `npm test -- web/src/features/checkout/CheckoutPage.test.tsx`

  Expected before implementation: FAIL where promo never activates or only code text appears.

- [x] **Step 3: Implement real promo orchestration**

  On draft readiness after shipping/pickup inputs are sufficient, call evaluate/apply only through the real backend path selected for this demo. If auto-apply is used, write copy such as `Best offer applied` only after the backend returns a selected evaluation with `discount_minor > 0`. If no automatic apply is chosen, show truthful no-promo status and keep manual promo entry hidden unless it is fully wired.

- [x] **Step 4: Verify Task 4**

  Run: `npm test -- web/src/features/checkout/checkoutDraftApi.test.ts web/src/features/checkout/CheckoutPage.test.tsx`

  Expected: PASS, with no fake promo path and signed discount display when backend returns a real discount.

  Result: PASS on 2026-07-07 for the focused implemented surface. `npm test -- web/src/features/checkout/CheckoutPage.test.tsx` passed `36` tests with explicit signed-promo assertions in the collapsed mobile drawer and expanded order-details sheet. `npm test -- web/src/features/checkout/checkoutDraftApi.test.ts web/src/features/checkout/CheckoutPage.test.tsx web/src/app/App.interactions.test.tsx` passed `109` tests after the failing-first promo route/orchestration tests went red/green. Coverage proves typed evaluate/apply/remove calls, zero-discount/rejected evaluation no-apply behavior, network-failure no-fake-discount behavior, collapsed/expanded drawer amount-first display, and App-level delivery draft recalculation calling backend evaluate/apply before showing `-$4.00 promo (SAVE10)`.

## Task 5: Payment CTA Width Normalization

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.css`
- Modify: `demos/paypal-retail-demo/web/src/styles/global.test.ts`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.test.tsx`

**Interfaces:**
- Consumes: selected PayPal/Pay Later provider action slots and official SDK custom element sizing.
- Produces: a stable payment action slot width for PayPal and Pay Later, including mobile drawer/sticky and expanded drawer.

- [ ] **Step 1: Write failing CSS tests**

  Assert the mobile selected payment action slot uses one stable track or full-width row for PayPal and Pay Later, and official custom elements fill the slot without intrinsic/autofit width.

  Run: `npm test -- web/src/styles/global.test.ts`

  Expected before implementation: FAIL if PayPal and Pay Later rely on different slot widths.

- [ ] **Step 2: Normalize action slot sizing**

  Use a shared wrapper class for selected non-card provider actions. Keep merchant styling on the wrapper only. Ensure `paypal-button`, `paypal-pay-later-button`, and their checkout wrappers fill the same width.

- [ ] **Step 3: Verify Task 5**

  Run: `npm test -- web/src/styles/global.test.ts web/src/features/checkout/CheckoutPage.test.tsx`

  Expected: PASS, with selected PayPal and Pay Later sharing the same action slot contract.

## Task 6: App-Level Payment Readiness Regression Proof

**Files:**
- Modify: `demos/paypal-retail-demo/web/src/app/App.checkout-paypal-capture.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/app/App.interactions.test.tsx`
- Modify: `demos/paypal-retail-demo/web/src/features/checkout/CheckoutPage.tsx`

**Interfaces:**
- Consumes: selected payment method, mobile drawer state, pickup picker state, checkout readiness, provider create-order callbacks, and app-level request instrumentation.
- Produces: proof that Round 3 drawer/picker/promo changes do not reopen blocked create-order paths.

- [ ] **Step 1: Write failing App-level blocked-state tests**

  Prove zero PayPal create-order requests and zero SDK create-order callbacks for no-method, recalculating, failed, focused input, open pickup picker, open expanded order drawer, open mobile menu, open minicart Sheet, open sign-in dialog, selected Card, and stale/missing draft states.

  Run: `npm test -- web/src/app/App.checkout-paypal-capture.test.tsx web/src/app/App.interactions.test.tsx`

  Expected before implementation: FAIL if any new drawer/picker state allows a provider action to remain active.

- [ ] **Step 2: Write selected-provider activation tests**

  Prove selected PayPal and selected Pay Later with settled/current totals each produce exactly one method-attributed create-order request and one matching SDK callback when activated from the collapsed drawer, and exactly one when activated from the expanded drawer. Opening and closing the drawer without activating payment must keep counts at zero.

- [ ] **Step 3: Implement or adjust App-level guards**

  If tests expose a leak, ensure picker open, drawer open-without-payment, overlays, focused inputs, stale totals, failed totals, and selected Card states suppress sticky/drawer provider callbacks. Preserve existing selected PayPal/Pay Later success paths.

- [ ] **Step 4: Verify Task 6**

  Run: `npm test -- web/src/app/App.checkout-paypal-capture.test.tsx web/src/app/App.interactions.test.tsx`

  Expected: PASS, with zero/one request and callback counts matching the Round 2 contract.

## Task 7: Round 3 Evidence Helper And Documentation Closure

**Files:**
- Create or modify: `demos/paypal-retail-demo/tools/round3-checkout-pickup-drawer-evidence.playwright.js`
- Modify: `demos/paypal-retail-demo/package.json`
- Modify: `demos/paypal-retail-demo/CART_CHECKOUT_A_PLUS_SPEC.md`
- Modify: `demos/paypal-retail-demo/DESIGN.md`
- Modify: `demos/paypal-retail-demo/IMPLEMENTATION_TASKS.md`
- Modify: `demos/paypal-retail-demo/tracking/todos.md`
- Modify: `demos/paypal-retail-demo/tracking/test-cases.md`
- Modify: `demos/paypal-retail-demo/tracking/progress.md`

**Interfaces:**
- Consumes: implemented checkout UI and API-backed local/hosted route.
- Produces: repeatable evidence for local and hosted deploy quality.

- [ ] **Step 1: Build the evidence helper**

  Capture and measure:
  - Pickup ZIP submit opens store picker above header at 320, 390/414, and 1440
  - pickup cancel returns to Pickup location with no inline store cards
  - pickup confirm advances to store summary/date without header overlap
  - mobile checkout first viewport has no duplicated full order details
  - collapsed drawer shows total and signed promo line
  - expanded drawer opens/closes by trigger, Escape, and scrim
  - selected PayPal and Pay Later action slots have matching width
  - billing submit opens next step within 250ms while totals remain disabled until current
  - real promo discount appears only after backend evaluate/apply succeeds

- [ ] **Step 2: Add package script**

  Add `evidence:round3:checkout-pickup-drawer` to run the helper against the current Playwright page origin or a supplied hosted origin, following the Round 2 helper pattern.

- [ ] **Step 3: Run verification**

  Run:
  - `npm test -- web/src/app/App.checkout-paypal-capture.test.tsx web/src/app/App.interactions.test.tsx`
  - `npm test -- web/src/features/checkout/CheckoutPage.test.tsx web/src/features/checkout/CheckoutPage.interactions.test.tsx web/src/features/checkout/checkoutDraftApi.test.ts web/src/styles/global.test.ts`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run format:check`
  - `npm run evidence:round3:checkout-pickup-drawer`
  - `git diff --check`

  Expected: all pass. If hosted deploy is not available yet, record local evidence as local-only and leave hosted smoke open.

- [ ] **Step 4: Update tracking**

  Mark each Round 3 row complete only after the exact evidence exists. Include evidence paths and any remaining hosted/wallet/card caveats in `tracking/progress.md`.

## Acceptance Criteria

- Pickup store picker appears above the site header and navigation at 320, 390/414, and 1440 widths; its content is not clipped under the sticky header.
- Canceling or dismissing the picker before store confirmation returns the buyer to Pickup location for re-submit, with Store selection dormant and inline store cards hidden.
- Confirming a store commits only the selected store and advances through the approved Pickup flow without exposing duplicate background store lists.
- Mobile checkout main content no longer duplicates the order detail summary when the bottom drawer is active; desktop/tablet summary remains visible.
- Collapsed mobile drawer shows only total, signed promo amount when present, and the current payment action state.
- Expanded drawer uses shadcn bottom `Sheet` semantics, closes by trigger/Escape/scrim, traps focus, returns focus to the trigger, and keeps payment action reachable.
- Billing submit opens the next task shell within 250ms after client validation for Delivery and Pickup; failed billing returns focus/error to Billing; payment remains disabled until active totals are current.
- Promo activation is real: no fake/inert promo input, no code-only discount display when discount amount exists, and no buyer-visible discount unless backend evaluation/apply returns one.
- Selected PayPal and selected Pay Later payment buttons use the same action slot width in mobile collapsed drawer, expanded drawer, and desktop/tablet summary where applicable.
- Provider actions still obey Round 2 readiness gates: no create-order call while cart/draft/eligibility/shipping/tax/promo/totals are missing, stale, failed, loading, or recalculating.
- App-level tests prove blocked states produce zero create-order requests/callbacks, and selected PayPal/Pay Later with settled/current totals produce exactly one method-attributed request/callback when activated from collapsed and expanded drawer states.
- Evidence helper records screenshot path, viewport, route/state, console/response issues, horizontal overflow, header overlap, sticky/drawer overlap, selected method, provider surface counts, create-order request/callback counts, displayed total/promo/shipping/tax labels, picker state, drawer state, and billing transition timing.

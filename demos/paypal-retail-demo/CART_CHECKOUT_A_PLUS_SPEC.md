# Cart + Checkout A+ Polish Spec

Date: 2026-07-03
Round 2 update: 2026-07-04

Status: A+ base polish closed; Round 2 cart/checkout density and mobile checkout disclosure refinement is the active implementation target.

Approved direction: **A+ Compact Retail Flow**. This builds on the Superpowers visual companion mockup `A Compact Retail Flow` at `.superpowers/brainstorm/15937-1783086876/content/cart-checkout-polish-options.html`, the user-selected browser event for Variant A, and the `ui-ux-pro-max` review that confirmed A as the safest conversion-first direction.

Round 2 approved direction: **v5 grabber-only mobile order details**. This builds on the 2026-07-04 Superpowers visual companion iterations and user comments: remove arrow/caret badges, use a neutral grabber strip integrated with the sticky summary, keep the collapsed state to total + promo + payment action only, and use a bottom order-details sheet after the buyer taps the grabber/review area.

Round 3 approved direction: **Option A pickup and drawer repair**. This builds on the 2026-07-07 `ui-ux-pro-max` retrieval pass, the Superpowers visual companion mockup, and the user's approval of Option A: use a task-first mobile checkout, move mobile order details into a single bottom drawer/sheet, prevent pickup picker/header overlap, make picker cancel fall back to Pickup location re-submit, verify real promo activation, speed billing progression, and normalize selected PayPal/Pay Later action width. The execution handoff is `ROUND3_CHECKOUT_PICKUP_DRAWER_PLAN.md`.

## Goal

Polish the full cart-to-checkout flow so buyers see product value first, understand the next step, and reach official PayPal payment surfaces only when they are actionable. Cart stays retail/product-first. Checkout stays calm, form-first, and payment-safe. PayPal and Pay Later remain official provider-owned surfaces inside stable merchant-owned slots.

## Non-Goals

- Do not add new PSP capabilities, unsupported payment marks, unsupported wallet eligibility, or new PayPal behavior.
- Do not restyle PayPal SDK internals, iframes, shadow DOM, official button internals, or `paypal-message` content.
- Do not add new manual promo-code entry unless backend promo application already supports it. Existing real promo apply/remove behavior may stay visible, but this slice must not fake manual promo capability.
- Do not add save-for-later, rewards, social login, fake trust claims, or fake shipping guarantees.
- Do not change capture, BOPIS payload, wallet eligibility, or checkout draft API semantics.

## Design Principles

- **Product first:** cart mobile and desktop must show item imagery, names, quantities, and prices before payment education.
- **One obvious path:** full checkout is the primary cart action; delivery express PayPal/Pay Later is secondary.
- **Payment appears only when useful:** checkout order summary and mobile sticky payment action must stay payment-neutral until the payment section is active and a method is selected.
- **Small, sophisticated typography:** cart and checkout should use the lighter V4/V6 typography direction. Dense utility surfaces should not use oversized hero-scale headings.
- **Mobile form progress:** mobile checkout should always answer where the buyer is, what was saved, and what comes next.
- **Provider-safe PayPal UI:** merchant CSS controls only wrapper spacing, stable boxes, labels, and fallback copy.

## Cart Contract

- Replace any oversized cart hero treatment with a compact bag header: `Bag`, live item count, and optional subtotal context.
- Cart item rows/cards include image, product name, category/status, current and regular price when relevant, line amount, quantity controls, remove/decrement action, and inline unavailable/retry copy when needed.
- Quantity controls keep 44px minimum touch targets at 320px and do not cause horizontal page scroll.
- The order summary reads as a complete checkout summary: merchandise subtotal, promo state, shipping/tax calculated-later copy, and total/subtotal context where available.
- Use specific neutral placeholder copy: `Calculated after Delivery/Pickup` or `Calculated in checkout`, not vague labels such as `Next`.
- `Go to checkout` is the dominant cart CTA.
- Pay Later messaging sits with the amount/summary context and uses official PayPal message rendering or a buyer-safe fallback only.
- Delivery express PayPal/Pay Later sits below the primary checkout CTA in a quieter section labelled as delivery express. It remains inside the shared `Secured by PayPal` frame and calls only the delivery express create-order path.
- Empty cart hides checkout, Pay Later message, PayPal express, and Pay Later express controls.
- `Go to checkout` refreshes or restores the active server cart binding before checkout state is used, preserves cart count/minicart contents, and initializes checkout summary from the restored cart before any payment selection is possible.

## Checkout Contract

- Preserve the existing `/checkout` Delivery/Pickup tabs and separate accordion state machines.
- Add compact progress context near the active checkout panel, for example `Delivery - Billing - 2 of 4` or `Pickup - Store selection - 1 of 5`.
- Only one section is expanded in the active tab at a time.
- Submitted sections collapse immediately into concise buyer-readable summaries with one icon-only edit action. Avoid repeating raw field labels such as `Full name` or state labels such as `Saved`.
- Order Summary includes product thumbnails, product names, quantity, item amount, `+N more` when capped, promo state, shipping/tax state, and total.
- Order Summary is payment-neutral before payment selection: no reserved PayPal panel, no provider placeholder, no empty payment box.
- Payment action appears only after the payment section is active and a method radio is selected.
- A+ supersedes older placeholder-polish language: before the payment section is active and a method is selected, do not render explanatory payment placeholder panels or reserved provider slots.
- If the buyer edits an upstream checkout section after selecting a payment method, selected provider actions clear, hide, or become clearly pending until backend reconciliation completes and the active total is current.
- Compact progress context updates after submit, edit, backtracking, and fulfillment-tab switches. It must not describe stale step position.
- The bottom trust strip becomes compact and utility-oriented. It uses only implemented capabilities: official provider-owned payment surfaces, recalculated totals, Delivery/Pickup choice, and order recovery.
- Checkout forms keep visible labels, required markers, autocomplete, input modes, inline errors, submit feedback, and predictable focus movement.

## Mobile Contract

- Cart mobile first pass must keep product imagery visible before payment surfaces or long explanatory copy.
- Mobile cart can use a compact sticky total/checkout bar only when it does not cover content, uses `env(safe-area-inset-bottom)`, and reserves matching bottom padding.
- Mobile checkout keeps order context reachable while forms are active through a compact summary, sticky total/action, or summary disclosure.
- Sticky payment action appears only for selected non-card methods. It shows exactly one selected provider action.
- Mobile sticky cart/checkout/payment actions are hidden, disabled, or repositioned so they do not compete with open dialogs/sheets, the pickup store modal, focused form fields, validation targets, or mobile safe-area/keyboard space.
- Pay Later selected on mobile reserves enough stable space for the official Pay Later button and the official message or fallback copy without clipping.
- Card payment never moves into the sticky bar; card fields and card pay action stay inside the expanded payment section.
- Mobile QA must include 320, 375, 390/414, 768, 1024, 1280, and 1440 widths where practical for the touched areas.

## Round 2 Cart + Checkout Refinement Contract

Design-system retrieval for this slice favored an ecommerce-clean typography direction (`Rubik` headings with `Nunito Sans` body as the reference pairing), mobile-first form behavior, shadcn `Tabs` for related mode switching, and shadcn `Sheet` for slide-out disclosure surfaces. Because the current demo already has an installed typography system, implementation may keep the existing font if adding a new Google Font would introduce dependency or loading risk, but the deployed UI must still reduce oversized hero-scale type and heavy weights on cart/checkout utility surfaces.

Measurable density target: cart/checkout utility surfaces must not use hero-scale typography. On mobile, cart and checkout transactional headers should stay compact enough that the first product row or first checkout task is visible without scrolling after data settles. Use headings at or below the existing utility scale rather than storefront hero scale; no form panel, sticky summary, order-details sheet, or cart item card should rely on oversized 40px+ heading text.

Cart Round 2:

- Remove or collapse the oversized cart title treatment into one compact row that communicates `Bag` or `Shopping cart`, item count, and optional subtotal without pushing item imagery below the first mobile viewport.
- Runtime markup and CSS must remove the old cart hero shell: no `.cart-hero` selector or `class="cart-hero"` may remain for the cart utility header. The compact header uses a status-row pattern such as `.cart-status`.
- Native number input spinner controls must be hidden in Chromium/Safari/Firefox because the buyer already has merchant-owned decrement/increment controls.
- Quantity decrement, quantity input, increment, remove, checkout, and express controls keep 44px minimum targets and visible focus states at 320px.

Checkout mobile-first flow:

- The first mobile checkout viewport must prioritize the checkout task: fulfillment mode, active step/progress, and the shipping address form or summary. It must not repeat the cart order summary as the dominant first-viewport content.
- Runtime markup and CSS must remove the old checkout hero shell: no `.checkout-hero` selector or `class="checkout-hero"` may remain for the checkout utility header. Mobile CSS must not reorder `.checkout-summary` ahead of the workflow.
- Delivery/Pickup must be a real shadcn-style segmented `Tabs` switch with active state, keyboard support, and independent Delivery/Pickup state preservation. It must not be a passive status chip.
- Delivery shipping address collection must support first name, last name, street address, optional apartment/suite/building, city, state select, ZIP/postcode, and phone number.
- For the active US demo market, first name, last name, street address, city, state, ZIP, and phone are required; apartment/suite/building is optional. If a future market makes country visible, the country field must derive from the active market rather than silently mixing US and non-US address rules.
- Mobile address fields use visible labels, `autocomplete`, and market-appropriate `inputMode`: US ZIP fields use a numeric keyboard, phone uses a telephone keyboard, and explicitly alphanumeric postcode fields remain text. Errors are readable inline, and compact two-column pairs appear only when the viewport supports them without clipping. At narrow widths, fields stack cleanly.
- Shipping method must appear between billing address and payment method in the Delivery flow, both before and after payment is selected.
- Saving shipping should advance the buyer to billing within 250ms after client validation without waiting for the network round trip. If backend shipping, tax, or promo is still settling, the saved shipping summary and totals show recalculating/pending copy while Billing is already open. Payment remains disabled until active totals are current. If the save fails, focus and inline error copy return to Shipping address and stale totals/provider actions remain blocked.

Settled/current totals definition:

- Payment totals are current only when the active fulfillment mode has a checkout draft ID, the latest successful draft update/recalculation response for that mode has been applied to the displayed summary, no checkout step is in `saving` or `recalculating`, no draft update request is pending, and `paymentReadiness` is absent or `paymentReadiness.state === "ready"`.
- Evidence should record the active fulfillment mode, checkout draft ID, displayed total/promo/shipping/tax labels, payment readiness state, and any available response timestamp/revision/version. If the backend does not expose a revision, tests must still prove the displayed summary came from the latest mocked or intercepted response before provider actions are allowed.

Sticky summary and order-details sheet:

- Collapsed mobile sticky summary contains only the estimated total, the promo discount directly under the total when present, and the current payment action state. It must not include item thumbnails, item descriptions, trust copy, or explanatory payment text.
- The order-details trigger is a neutral grabber strip integrated into the sticky summary top edge. It uses a standard two-line/handle affordance, no arrow/caret badge, a measured 44px minimum interactive hit target, and an accessible name such as `Review order details`. The visible handle may stay visually compact, but the clickable/focusable element itself must meet the 44px target. Optional visible `Order details` copy may be included only if discoverability testing needs it.
- Before a payment method is selected, the sticky action is disabled or neutral (`Choose payment`) and no official PayPal create-order path can fire.
- After a non-card payment method is selected and totals are ready, the sticky action becomes the selected official provider action or its stable mounted slot. Card payment stays inline in the payment section and never moves into the sticky bar. The collapsed sticky state must not add separate selected-method label rows or merchant Pay Later explanation rows; required Pay Later message content belongs in the expanded order-details sheet or inline payment section unless a provider-owned component requires it inside the action slot.
- Expanded order details use the existing shadcn `Sheet` with `side="bottom"` for the first implementation. The sheet includes item rows, subtotal, promo, shipping method/cost, estimated tax, total, and the same payment action when ready.
- The expanded sheet must trap focus, mark background checkout content inert through the overlay/dialog semantics, close on Escape/scrim/handle tap, return focus to the grabber trigger, respect `prefers-reduced-motion`, and remain scrollable within a max-height that keeps the payment action reachable. The visible handle may stay visually slim, but the handle button itself must expose a measurable 44px minimum hit target and the accessible name `Close order details`.
- True drag-to-close is deferred unless a Drawer/Vaul-style dependency is explicitly approved; the first pass should not fake drag behavior.
- 2026-07-04 local evidence update: focused tests now prove stable sticky trigger `aria-expanded`/`aria-controls`, shadcn `Sheet side="bottom"` semantics, handle/Escape/scrim close, focus return, amount-first promo labels, backend `payment_readiness` mapping, no-method zero create-order, selected PayPal/Pay Later one create-order, selected Card inline/no sticky provider action, recalculating/failed readiness zero create-order, focused upstream input zero create-order, open mobile menu/minicart/sign-in zero sticky create-order, expanded Sheet pay action one create-order, and Sheet open/close without pay zero create-order. Playwright MCP measured the rendered 390px checkout grabber at `112 x 44`.
- 2026-07-05 API-backed visual checkpoint: screenshots under `/private/tmp/paypal-retail-cart-checkout-round2-api-backed-20260705/` cover populated `/cart` at 320/390/1440, `/checkout` Delivery initial at 320/390/1440, and 390px checkout billing-active, shipping-method-visible, payment-ready/no-method, selected PayPal, expanded order details, collapsed-again, selected Pay Later, selected Pay Later with mobile menu/minicart/sign-in overlays, selected Card, and focused billing input states. `metrics.json` records no page-level horizontal overflow and zero create-order requests before provider activation for the 390px states; overlay rows record no checkout sticky summary while the mobile menu, minicart Sheet, or sign-in dialog is open. This pass also found the Shipping/Billing draft-update race now covered by queued same-mode draft updates. This is a checkpoint, not deploy closure; the later focused rerun closes API-backed discount visual proof, but final acceptance still requires hosted smoke, richer selected-method/readiness/request-callback metrics, recalculation/failure visual rows, and rect-based sticky/fixed overlap proof.
- 2026-07-05 focused API-backed rerun: the helper now seeds from `/cart`, records provider nodes by surface, stores request bodies for payment-method attribution, and records browser create-order callback signals from the app's `console.info` SDK callback logs. The selected PayPal activation row proves exactly one `paypal` delivery create-order request delta and one PayPal callback delta; the selected Pay Later activation row proves exactly one `paylater` delivery create-order request delta and one Pay Later callback delta. No-method/card/overlay/focused-input rows stay blocked at zero request/callback deltas, selected Card is counted under the inline card surface, minicart provider nodes are counted under the minicart surface, and checkout sticky summary is absent while mobile menu/minicart/sign-in overlays own the mobile surface. Follow-up helper evidence now applies real backend promo evaluation/apply for seeded `BUNDLE8`, records selected `AUTO10 + BUNDLE8`, and proves `-$8.55 promo (AUTO10 + BUNDLE8)` under the sticky total, in the order summary, and in expanded order details. A later sticky-clearance rerun of the same evidence path records `stickyOverlapTargets[].occludedByStickyCount === 0` across all tracked rows, including selected Card inline form content and the focused billing street input. The rerun does not close deploy acceptance because it still lacks hosted smoke and recalculation/failure visual rows. The selected Pay Later pre-activation timeout fallback is not a warning-class blocker after the 2026-07-06 fix: timeout fallback now emits structured `console.info` with `reason: "timeout"` while SDK/fetch/content-application failures remain errors.
- 2026-07-06 helper-owned readiness evidence: committed `tools/round2-checkout-readiness-evidence.playwright.js` plus `npm run evidence:round2:checkout-readiness` create route-intercepted browser rows without buyer-visible QA flags. Local evidence under `/private/tmp/paypal-retail-round2-checkout-readiness-evidence/` records `checkout-recalculating-readiness-390`, `checkout-failed-readiness-390`, and `checkout-shipping-save-failed-390` screenshots plus `metrics.json`. The readiness rows assert visible recalculating/failed copy, expected displayed total/promo/shipping/tax labels, zero surface-scoped provider nodes, zero create-order request/callback deltas, zero horizontal overflow, zero sticky occlusion, and no row-scoped console warnings/errors. The save-failure row asserts the retryable Shipping address alert, expected displayed labels, zero create-order request/callback deltas, zero provider nodes, zero horizontal overflow, zero sticky occlusion, exactly one intercepted shipping-address `500`, exactly one matching checkout-draft app failure log, and zero unrelated console errors. This closes local helper-owned recalculation/failure visual rows, not hosted deploy smoke.
- 2026-07-06 hosted-smoke helper evidence: committed `tools/round2-hosted-checkout-smoke.playwright.js` plus `npm run evidence:round2:hosted-smoke`. The helper targets the current Playwright page origin, so it can run against local Vite/API before deploy or Render after deploy. It records `/cart` and `/checkout` rows at `320`, `375`, `390`, `768`, `1024`, `1280`, and `1440`, plus 390px checkout billing, shipping method, payment-ready no-method, selected PayPal, expanded order details, collapsed focus return, selected Pay Later, selected Card, focused input, footer clearance, mobile menu, minicart, and sign-in dialog states. Metrics include screenshot path, route, viewport, route-scoped console/response issues, horizontal overflow, sticky overlap, provider counts by surface, create-order request/callback baselines/deltas/cumulative counts, sticky grabber ARIA/rects, order-sheet state, focused element, and overlay suppression. Local working-tree evidence on `http://127.0.0.1:5173` passed with `rowCount: 27`, `failedRows: []`, output prefix `/private/tmp/paypal-retail-round2-local-smoke-evidence`, zero footer sticky occlusion, PayPal provider nodes only in the selected sticky or order-sheet surface, card provider nodes only inline, and no checkout sticky while mobile menu, minicart, or sign-in dialog overlays are open.
- 2026-07-06 current hosted pre-deploy comparison: Render health returned `200` with debug ID `dbg_ba8fd084a906`, and the live index still served `/assets/index-CuNnoNV5.js` plus `/assets/index-CajkqOhp.css`. Running the new hosted smoke against that current deployed build failed before deploy closure: `cart-first-pass-320` recorded a hosted cart-restore fetch console error, and `checkout-footer-clearance-390` recorded `sticky occluded 7 independent targets`. The working-tree fix adds footer bottom reserve while `.checkout-sticky-summary` exists and the helper now checks buyer-visible footer content nodes rather than treating the padded footer container itself as an occlusion target. This pre-deploy failure is resolved by the post-deploy hosted closure entry below.
- 2026-07-06 post-deploy hosted closure: after deployment, Render health returned `200` with debug ID `dbg_d40682632c40`, and the live index served `/assets/index-uhOMu6vW.js` plus `/assets/index-DdbX4s-t.css`. Hosted smoke evidence at `/private/tmp/paypal-retail-round2-hosted-smoke-after-deploy.json` passed with `rowCount: 27` and `failedRows: []`. The previous cart-restore console error and footer sticky overlap are gone: `cart-first-pass-320` has no console warnings/errors or response issues, `checkout-footer-clearance-390` records `occludedByStickyCount: 0`, and mobile menu, minicart, and sign-in overlay rows record no checkout sticky summary while their overlays are open. This closes the Round 2 hosted smoke and required-state sticky/fixed overlap deploy gate.

Deploy-quality evidence matrix:

- The final Round 2 deploy gate must record a row for each required state: `/cart` first mobile pass, `/checkout` Delivery initial, saved shipping, billing active, shipping method visible, payment-ready no method, selected PayPal, selected Pay Later, selected Card, expanded order details, collapsed-again focus return, recalculating totals, failed totals/save, focused input with sticky visible/suspended, and open menu/dialog/sheet overlap smoke. Pickup smoke is required if a shared checkout shell or sticky behavior changes.
- For each checkout payment state, record fulfillment mode, `checkoutDraftId`, payment readiness state/reason, displayed total, promo, shipping, tax, selected method, provider count by provider type, create-order request count, create-order callback count, and whether the displayed summary is from the latest applied draft response. Browser metrics must make per-row baselines explicit: record baseline count, row delta, and cumulative count for create-order requests and callbacks so evidence after an earlier activation cannot be misread. If the backend does not expose a response revision, the test must prove this by intercepting/mocking the latest draft response and comparing displayed labels before provider actions unlock.
- Blocked states must prove zero provider create-order requests and zero create-order callbacks. Allowed selected PayPal and selected Pay Later states with settled/current totals must prove exactly one create-order request and callback when the buyer activates the provider action. Selected Card must prove no mobile sticky provider action and must keep card entry/pay action inline.
- Visual evidence must include screenshots or saved browser artifacts for `320`, `375`, `390/414`, `768`, `1024`, `1280`, and `1440` where the touched layout applies. At minimum, hosted/API-backed evidence must include `320`, `390/414`, and `1440` for `/cart` and `/checkout`; local fallback-only evidence cannot close deploy quality.
- Sticky and fixed-position evidence must record horizontal overflow, sticky overlap, safe-area bottom reserve, active/focused input rects, Sheet controls, footer, PayPal messages, mobile menu, minicart Sheet, sign-in dialog, and expanded order-details Sheet. The sticky bar must not obscure focused fields, provider buttons/messages, Sheet controls, footer content, validation errors, or dialog controls; when another mobile overlay owns the surface, the checkout sticky summary should unmount rather than sit behind it.
- Console errors are deploy blockers unless the row is intentionally exercising a failed API path and records the buyer-safe recovery state. Console warnings must be triaged with route, viewport, state, and reason. PayPal sandbox/network warnings may be accepted only when official provider fallback behavior is visible and the warning does not hide or duplicate a payment action. Local diagnostic note: the latest focused 2026-07-05 rerun removed the earlier homepage/seeding route noise, the selected Pay Later timeout fallback was moved to info-level telemetry on 2026-07-06, and the helper-owned readiness rows now scope console/request baselines to the tested checkout action. Hosted smoke still needs its own route-specific console warning/error triage.

Promo and payment truthfulness:

- Promo presentation must reflect implemented behavior only. If no active backend discount exists, show truthful `No promo applied` or offer-status copy in the expanded order details, not a fake manual promo activation path.
- Manual promo entry may be visible only when it is fully wired to backend evaluate/apply/remove behavior, has loading/error/success states, and is covered by tests. Otherwise Round 2 hides manual promo activation and shows only truthful offer status.
- When a discount exists, the collapsed sticky summary shows the discount as a text-labelled green line directly under total, for example `-$3.99 promo`; the same amount appears in the expanded order-details totals. If the backend also returns a selected promo code, the buyer-facing summary may append the code after the amount, but code-only display such as `SAVE10` fails Round 2 acceptance whenever `discount_minor > 0`.
- Selected provider actions stay hidden or disabled while cart binding, checkout draft, eligibility, shipping, tax, promo, or totals are loading, stale, failed, missing, or recalculating.

## Round 3 Pickup And Drawer Repair Contract

Round 3 keeps the Round 2 density, readiness, and provider-safety contracts, but reopens five defects found in deployed/mobile QA:

- Pickup store picker layering: the ZIP/postcode store picker must appear above the sticky site header/navigation at mobile and desktop widths. Store cards, picker header, picker footer/actions, and scrollbars must not be hidden beneath the header.
- Pickup cancel fallback: canceling or dismissing the picker before a store is confirmed must return the buyer to the Pickup location section for re-submit. It must not reveal the ranked store list inline in Store selection, and it must not commit a pending store.
- Mobile order details ownership: the mobile bottom drawer/sheet owns order details. The main mobile checkout page must not duplicate the same item/totals detail card while the collapsed drawer is present. Desktop/tablet can keep the side summary.
- Drawer interaction: collapsed mobile drawer shows only total, directly stacked signed promo line when present, and the current action state. The drawer opens from the summary surface/passive handle; do not render a separate expand button that competes with payment actions. Expanded drawer uses shadcn bottom `Sheet` semantics with item rows, subtotal, promo, shipping, tax, total, focus trap, Escape/scrim/handle close, focus return, and reachable selected payment action.
- Billing progression: Delivery billing submit opens Shipping method within 250ms after client validation; Pickup billing submit opens Pickup date within 250ms after client validation. Pending totals show recalculating/current-state copy, and payment remains blocked until the latest draft response is applied.
- Promo activation: visible discounts must be backed by the real backend promo evaluate/apply/remove path. If automatic application is implemented, the UI may show a concise applied-offer state only after the backend returns a selected evaluation with `discount_minor > 0`. If no discount is selected, the UI shows truthful no-promo status.
- Payment action sizing: selected PayPal, Pay Later, Apple Pay, Google Pay, and Venmo use the same action-slot width and height in the collapsed mobile drawer, expanded drawer, and desktop/tablet summary where applicable. Merchant CSS may size wrappers and custom elements, but must not style provider internals. Compact sticky/order-sheet action slots must not let Pay Later financing-message copy make Pay Later taller than the wallet/provider action buttons.

Round 3 implementation tasks:

1. Pickup picker layer and cancel fallback.
   - Raise or replace the custom picker layer with shadcn Dialog/Sheet semantics so it sits above `.site-header`.
   - Add explicit close reasons: confirm, cancel, and dismiss.
   - On cancel/dismiss before confirmation, reopen Pickup location, collapse/dormant Store selection, clear pending modal selection only, and keep inline store cards suppressed.
   - When Pickup already has a selected store, start the buyer at Billing and keep Store selection as an editable summary only; do not show a redundant `Continue with this store` action.
   - Acceptance: mobile and desktop screenshots show no header overlap; tests prove cancel returns to Pickup location and no inline store cards mount.

2. Mobile drawer owns order details.
   - Hide/unmount duplicate mobile `.checkout-summary` detail content when the drawer is active; keep desktop/tablet summary visible.
   - Keep `.checkout-workflow` before `.checkout-summary` in DOM and mobile visual order.
   - Acceptance: mobile tests find one order-details owner only; desktop tests still find the complementary summary.

3. Billing progression.
   - Extend the existing optimistic progression model to billing steps.
   - Show the next task shell within 250ms while backend totals settle.
   - On failure, return focus/error to Billing and keep provider actions blocked.
   - Acceptance: interaction tests simulate slow and failed billing saves for Delivery and Pickup.

4. Real promo activation.
   - Wire typed frontend calls to the existing backend promo evaluate/apply/remove APIs or keep manual promo hidden and show no-promo status.
   - If a real discount is selected, render signed amount text under total in collapsed and expanded drawer states.
   - Acceptance: API/UI tests prove no fake promo path, no code-only discount display, and real discount display after backend success.
   - 2026-07-07 local implementation: App checkout draft updates now call typed frontend promo evaluate/apply helpers and display signed promo text only from the apply response. Zero-discount/rejected evaluations stay no-promo, and activation failures do not invent discounts. Focused local tests now prove the collapsed mobile drawer, expanded order-details sheet, and App order summary surfaces; browser/API-backed visual rows remain part of the Round 3 evidence helper.

5. Payment CTA width.
   - Normalize selected PayPal, Pay Later, Apple Pay, Google Pay, and Venmo action slot dimensions.
   - Keep official provider surfaces full-width inside the shared slot.
   - Acceptance: CSS tests and browser metrics compare selected PayPal, Pay Later, Apple Pay, Google Pay, and Venmo action rects.
   - 2026-07-07 local implementation: checkout selected-payment slots now share merchant-owned width/fill rules for the desktop summary slot, collapsed sticky action, expanded order-sheet payment slot, direct PayPal provider scope, PayPal/Pay Later standalone action wrappers, and wallet action wrappers. Compact sticky/order-sheet slots suppress Pay Later financing-message height so Pay Later matches Venmo/Apple Pay/Google Pay action geometry. Focused CSS and CheckoutPage tests passed; browser rect comparison remains part of the Round 3 evidence helper.

6. Evidence helper and hosted smoke.
   - Add a Round 3 helper that captures pickup picker, cancel fallback, mobile drawer, billing latency, promo discount, and payment-width states.
   - Acceptance: local API-backed evidence passes before runtime close; hosted evidence stays open until deployment if not immediately available.

Round 3 acceptance criteria:

- Pickup picker content is never covered by the sticky header at 320, 390/414, and 1440 widths.
- Cancel/dismiss before store confirmation returns to Pickup location for re-submit and hides inline store cards.
- Confirmed store selection advances normally and preserves BOPIS payment semantics.
- Mobile checkout does not duplicate order detail content outside the drawer; desktop/tablet still have a summary.
- Collapsed drawer contains only total, signed promo, and current action state; the summary surface/passive handle opens details with no separate expand button.
- Expanded drawer closes by Escape, scrim, and handle; returns focus to trigger; traps focus while open.
- Billing submit opens the next task within 250ms after client validation for both Delivery and Pickup.
- Payment remains disabled until active totals are settled/current after billing, promo, shipping, tax, and pickup recalculation.
- Promo discounts appear only from real backend promo state and render as signed amount text.
- PayPal, Pay Later, Apple Pay, Google Pay, and Venmo selected action slots have matching width/height and no intrinsic/autofit regression.
- Preselected Pickup store summaries omit redundant continuation CTAs and keep Billing as the next active buyer task.
- All Round 2 readiness/create-order guards still pass.

Round 3 inspection standard:

- Required mobile evidence states: Pickup ZIP submitted with picker open, picker canceled, picker confirmed, preselected Pickup store summary, mobile checkout initial, billing slow-save pending, billing failure, selected PayPal collapsed drawer, selected Pay Later collapsed drawer, selected Apple Pay collapsed drawer, selected Google Pay collapsed drawer, selected Venmo collapsed drawer, expanded drawer, collapsed focus-return, real promo discount, and selected Card inline/no drawer provider action.
- Required widths: 320, 390/414, and 1440 for pickup picker and checkout drawer; add 768/1024/1280 if shared shell CSS changes.
- Metrics must record route/state, viewport, screenshot path, header overlap, horizontal overflow, drawer/sticky overlap, active section, selected method, selected provider action rects, provider counts by surface, create-order request/callback deltas, displayed total/promo/shipping/tax labels, picker close reason, store summary continuation absence, drawer trigger/expanded state, and billing transition timing.
- Console errors are blockers unless the row intentionally exercises a buyer-visible failed save path with scoped recovery evidence. Warnings must be route/action scoped.

## Payment And PayPal Contract

- Cart and minicart express actions remain delivery express only.
- Full checkout PayPal, Pay Later, Apple Pay, Google Pay, Venmo, and card surfaces remain driven by existing runtime eligibility and selected method state.
- Ineligible wallet rows are hidden. They do not leave payment actions, reserved slots, or stale selected state behind.
- Official PayPal and Pay Later SDK custom elements keep explicit full-width sizing and stable minimum heights inside merchant-owned frames.
- Pay Later message fallback appears only for SDK config, fetch, timeout, or presentment-empty failures. It must disappear when official content applies.
- Missing cart/draft binding blocks create-order with visible buyer-safe syncing/retry copy.
- If cart binding, checkout draft, payment eligibility, or active totals are loading, stale, missing, failed, or recalculating, selected provider actions are hidden or disabled with buyer-safe retry/sync copy and no PayPal create-order call is made.
- Pay Later amount, eligibility, official message, and fallback copy refresh after cart quantity, fulfillment, shipping, pickup store, pickup date, promo, tax, or selected-payment changes.

## Accessibility Contract

- Every input has a visible label and programmatic association.
- Icon-only controls have accessible names: remove, edit, close, quantity increment/decrement, mobile sticky actions, and modal controls.
- Focus rings are visible on keyboard navigation.
- Validation errors use inline copy and assertive live-region announcement where the current checkout validation system expects it.
- Focus moves to the first invalid step/field on validation failure and to the next actionable step after successful submit.
- Color is not the only indicator for active tabs, selected payment, inventory status, promo state, or errors.
- Meaningful item images use descriptive alt text.

## Acceptance Criteria

- Round 2 planning is recorded in this spec, `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, and `tracking/test-cases.md` before runtime edits begin.
- Variant A is recorded as the approved visual direction and A+ refinements are reflected in `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, and `tracking/test-cases.md`.
- Cart header/title density is reduced so mobile product imagery appears before any large title, summary, PayPal, Pay Later, or trust block at 320 and 390/414 widths.
- Cart and checkout utility headers do not render or style through `.cart-hero` or `.checkout-hero`; focused tests fail if those class names/selectors return.
- Cart quantity native number spinners are hidden across Chromium/Safari/Firefox, while merchant decrement/input/increment controls remain accessible, keyboard usable, and 44px+.
- Checkout mobile initial state shows fulfillment switch plus the active buyer task before any expanded order summary or cart repetition.
- Mobile checkout CSS does not set `.checkout-summary` to render before `.checkout-workflow`; the first mobile viewport remains task-first.
- Delivery/Pickup uses real tab/segmented-switch semantics with default value, active styling, keyboard behavior, and independent tab state preservation.
- Delivery shipping form includes first name, last name, street, optional apt/suite/building, city, state select, ZIP/postcode, and phone, with visible labels, autocomplete, market-appropriate input modes (`numeric` for active US ZIP and `tel` for phone), announced errors, and no 320px clipping.
- Delivery flow includes a shipping-method section between billing and payment in initial, saved, payment-ready, and selected-payment states.
- Shipping submit advances to the next buyer task within 250ms after client validation and shows recalculating/pending totals when backend totals are still settling; payment actions stay disabled until settled/current totals definition passes.
- Collapsed mobile sticky summary uses the v5 grabber-only disclosure: no arrow/caret badge, no item copy, no thumbnails, no trust copy, measured 44px trigger hit target, total plus directly stacked promo amount line, and one current action state.
- Before payment selection, collapsed sticky action is neutral/disabled and cannot trigger PayPal create-order.
- After non-card payment selection and settled totals, collapsed sticky action shows exactly one selected provider action; card remains inline and never appears in the sticky bar.
- Expanded mobile order details use shadcn `Sheet side="bottom"` with item rows, subtotal, promo, shipping, tax, total, focus trap, overlay/inert behavior, Escape/scrim/handle close, focus return to the grabber trigger, reduced-motion handling, and a reachable payment action when ready. Tests or browser inspection must prove `aria-expanded`/`aria-controls`, Escape close, scrim close, handle close, focus return, and a 44px close-handle hit target rather than relying only on component inheritance.
- Promo states are truthful: no fake manual promo activation, no inert promo input, no color-only discount communication, and real discounts appear under the total in both collapsed and expanded mobile summary states. A selected promo code alone is not sufficient when a real discount amount exists.
- Readiness/create-order tests prove blocked states with both provider counts and request/callback counts: no-method, recalculating, failed, focused input, open dialog/menu, open sheet, selected card, and stale/missing draft states produce zero PayPal create-order calls; selected PayPal or Pay Later with settled/current totals produces exactly one create-order call when the buyer activates the provider action.
- Cart desktop and mobile show item imagery and item context before PayPal express surfaces.
- Cart summary shows complete subtotal/promo/shipping/tax/total context with buyer-safe calculated-later copy.
- `Go to checkout` remains visually dominant over delivery express payment actions.
- Delivery express PayPal/Pay Later buttons render only inside the shared `Secured by PayPal` frame and use official SDK output.
- Checkout initial state renders no official payment action, no payment placeholder panel, and no empty PayPal reserved box.
- Delivery and Pickup tabs preserve separate states and only one active-tab section is expanded.
- Collapsed checkout sections show concise summaries and an accessible edit action.
- Order Summary contains product thumbnails and caps long item lists with `+N more`.
- Selected non-card payment renders exactly one desktop/tablet summary action or one mobile sticky action.
- Card fields and card pay action remain inline in the payment section on all breakpoints.
- Sticky header and sticky checkout/payment bars do not cover form fields, PayPal messages, footer content, or modal controls.
- No page-level horizontal overflow appears at 320, 375, 390/414, 768, 1024, 1280, or 1440.
- Forms expose visible labels, autocomplete/inputmode metadata, announced errors, and focus movement.
- Tests and browser evidence prove official PayPal/Pay Later content is stable, readable, and undistorted.
- Payment readiness tests prove no create-order call occurs while cart/draft binding, eligibility, or totals are stale/loading/missing/failed.
- Cart-to-checkout continuity tests prove checkout entry preserves restored cart count, minicart contents, checkout summary items, and current totals before payment selection.
- Editing upstream checkout sections after payment selection clears, hides, or suspends selected provider action rendering until backend reconciliation finishes.
- Mobile sticky actions do not compete with open dialogs/sheets, focused form fields, validation targets, or mobile safe-area/keyboard space.
- Pay Later amount and fallback behavior refresh after cart quantity, fulfillment, shipping, pickup store, pickup date, promo, tax, and selected-payment changes.

## Inspection Standard

Before closing this slice, collect focused component/app tests plus browser evidence for:

- `/cart` or the active full-cart route at 1440, 1024, 390, and 320.
- `/checkout` Delivery initial state, Delivery billing/shipping/payment progression, and selected PayPal or Pay Later at 1440, 390, and 320.
- `/checkout` mobile Round 2 states at 320 and 390/414: initial shipping task, saved shipping with billing active, saved billing with shipping method visible, payment-ready with no selected method, selected PayPal or Pay Later with sticky payment action, selected card with no sticky provider action, expanded order-details sheet, and collapsed-again sheet focus return.
- `/checkout` Pickup guest location/store/billing/date/payment progression, including partial-inventory summary if seeded data supports it.
- Open minicart only if this slice touches shared cart/minicart action styling.
- Empty cart and cart-syncing/create-order blocked state if touched.
- Hosted smoke after runtime implementation: `/cart` and `/checkout` at 320, 390/414, and 1440. Console errors are hard failures; warnings must be triaged and recorded.

Measurement definitions:

- Page-level horizontal overflow passes when `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Sticky overlap passes when sticky header, cart, checkout, and payment action rectangles do not intersect focused fields, validation targets, PayPal messages/buttons, footer links, modal controls, or open sheet/dialog controls after scrolling to top, mid-form, payment section, and page bottom. Focus return to the sticky grabber after closing the order sheet may intersect the sticky summary itself and should be recorded as a focus-return metric caveat, not an overlap defect.
- First mobile cart pass passes when, after data settles at 320 and 390/414, at least one cart item image/title/quantity/price row appears before any PayPal button/message frame in both DOM order and visual top position.
- Official provider element checks record counts and state by surface, not only as one page-level total: checkout sticky provider action, expanded order-sheet provider action, inline card surface, minicart surface, and provider-owned message slots must be reported separately. Passing evidence shows zero checkout provider actions before payment unlock, exactly one selected non-card checkout provider action after selection, no stale previous-method action after method or fulfillment switch, and no false failure from provider nodes that belong to minicart or message-only surfaces.
- Round 2 grabber-only disclosure passes when the visible handle is integrated with the sticky summary edge, the focusable/clickable trigger rect is at least 44px tall and 44px wide, exposes an accessible name plus `aria-expanded` and `aria-controls`, opens the bottom sheet, closes by Escape/scrim/handle, returns focus to the trigger, and does not show arrow/caret badges.
- Expanded sheet handle proof passes when the `Close order details` handle remains visually restrained but its button rect/CSS is at least 44px by 44px and closes the Sheet without implying drag support.
- Mobile first-checkout-viewport passes when the active fulfillment switch and shipping task are visible before an expanded order summary at 320 and 390/414 after data settles.
- Header-density regression passes only when rendered markup and global CSS contain `.cart-status` and `.checkout-status`, contain no `.cart-hero` or `.checkout-hero`, and mobile CSS contains no `.checkout-summary` ordering rule that moves the summary ahead of the workflow.
- Shipping address form coverage passes only when first name, last name, street, optional apt/suite/building, city, state select, ZIP/postcode, and phone are all present, labelled, autocomplete-tagged, keyboard-appropriate for the active market (`numeric` for US ZIP, `tel` for phone, text for alphanumeric postcodes), and unclipped at 320.
- Sticky payment readiness passes when disabled/no-method, non-card selected, card selected, recalculating, failed, open sheet, focused input, and open dialog/menu states each have recorded surface-scoped provider counts, readiness reason, active draft/total state, and create-order request/callback counts. Blocked states must record zero create-order requests/callbacks; selected PayPal or Pay Later with settled/current totals must record exactly one create-order request/callback on buyer activation in a real browser row, not only in component tests.
- Recalculation/failure visual rows should be produced by helper-owned browser route interception or mocked API responses, not buyer-visible `?qa=` toggles or hidden runtime switches. Passing rows must show the recalculating/failed readiness copy, surface-scoped provider counts, zero create-order request/callback deltas, and latest displayed total/promo/shipping/tax labels for the intercepted response.
- Draft-update ordering passes when rapid same-mode checkout updates serialize through the latest applied draft data, so Billing/Shipping method updates cannot overwrite or bypass a still-saving Shipping address response.
- Promo truthfulness passes only when a real discount renders as a signed amount line directly under total in collapsed sticky state and inside expanded order details. If a promo code is displayed, it must be secondary to the amount; code-only discount display fails when the backend exposes a discount amount.
- shadcn component usage passes when Delivery/Pickup uses real `Tabs` semantics with a default value and keyboard behavior, and order details use `Sheet side="bottom"` dialog semantics rather than a custom fixed panel.
- Quantity-spinner proof passes only when Chromium, WebKit/Safari, and Firefox evidence or automated CSS assertions show native spin buttons hidden without removing the merchant-owned quantity controls.

Evidence must record: screenshot path, route, viewport, route-specific console errors/warnings, page-level horizontal overflow result, sticky overlap result, official PayPal element presence/absence where expected, surface-scoped provider element counts, and whether first mobile cart pass shows item media before payment surfaces. Console triage must identify the source route/action for every error; unrelated pre-seed, homepage, favicon, or provider-timeout noise cannot be summarized as a clean checkout pass unless it is either eliminated by the script or explicitly scoped out with evidence.

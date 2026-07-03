# Cart + Checkout A+ Polish Spec

Date: 2026-07-03

Status: approved design direction, implementation not started.

Approved direction: **A+ Compact Retail Flow**. This builds on the Superpowers visual companion mockup `A Compact Retail Flow` at `.superpowers/brainstorm/15937-1783086876/content/cart-checkout-polish-options.html`, the user-selected browser event for Variant A, and the `ui-ux-pro-max` review that confirmed A as the safest conversion-first direction.

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

- Variant A is recorded as the approved visual direction and A+ refinements are reflected in `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, and `tracking/test-cases.md`.
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
- `/checkout` Pickup guest location/store/billing/date/payment progression, including partial-inventory summary if seeded data supports it.
- Open minicart only if this slice touches shared cart/minicart action styling.
- Empty cart and cart-syncing/create-order blocked state if touched.

Measurement definitions:

- Page-level horizontal overflow passes when `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
- Sticky overlap passes when sticky header, cart, checkout, and payment action rectangles do not intersect focused fields, validation targets, PayPal messages/buttons, footer links, modal controls, or open sheet/dialog controls after scrolling to top, mid-form, payment section, and page bottom.
- First mobile cart pass passes when, after data settles at 320 and 390/414, at least one cart item image/title/quantity/price row appears before any PayPal button/message frame in both DOM order and visual top position.
- Official provider element checks record counts and state: zero provider elements before payment unlock, exactly one selected non-card provider action after selection, and no stale previous-method action after method or fulfillment switch.

Evidence must record: screenshot path, route, viewport, console errors/warnings, page-level horizontal overflow result, sticky overlap result, official PayPal element presence/absence where expected, provider element counts, and whether first mobile cart pass shows item media before payment surfaces.

# Round 4 Auth, Minicart, And Checkout Surface Polish Plan

> **For agentic workers:** REQUIRED DESIGN RETRIEVAL: use `ui-ux-pro-max` design-system search first, then targeted UX, typography, shadcn, and React searches before implementation. REQUIRED IMPLEMENTATION FLOW: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` task by task, with review checkpoints before closing deploy quality.

**Goal:** Apply the accepted soft mobile-commerce polish to Auth, Password, Minicart, and selected Checkout surfaces while preserving PayPal/BOPIS/payment semantics. This slice is visual and interaction polish only; it must not change PayPal Create Order payloads, capture timing, promo calculation semantics, tax/shipping order, cart lifecycle, or account authentication rules.

**Approved visual direction:** Round 4 uses a calmer transactional layer inspired by the provided mobile food-commerce reference: rounded white surfaces, quiet labels, compact body copy, full-width centered CTAs, softer form rhythm, and product-first cart rows. POP MART brand accents remain present, but checkout/auth/minicart should stop using oversized/heavy copy where it competes with buyer tasks.

**Reference mockup:** `mockups/round4-auth-minicart-checkout-polish.html`

**Live visual companion:** use the latest Superpowers visual companion screen for the same reference board. The mockup is an acceptance target, not a production implementation.

## Global Constraints

- Do not restyle PayPal SDK internals, iframes, shadow DOM, `paypal-button`, `paypal-pay-later-button`, wallet custom elements, or official `paypal-message` content.
- Do not change authentication semantics, account lookup, cart merge behavior, guest checkout behavior, or Supabase Auth rules.
- Do not add fake social login, fake payment methods, fake promo activation, fake store availability, or unsupported wallet availability claims.
- Keep shadcn `Dialog` and `Sheet` semantics for Auth and Minicart. Preserve focus trap, outside-click behavior, Escape behavior, and focus return.
- Use Lucide or inline SVG icons for password visibility and close/edit affordances. No emoji icons.
- Use implementation copy only when buyer-facing; remove engineering copy from visible surfaces.
- All touched surfaces must pass 320, 375, 390/414, 768, 1024, and 1440 width checks where the surface is available.

## Design Retrieval Summary

- `ui-ux-pro-max --design-system` returned **Minimal Single Column** with centered large CTA, high-contrast text, and soft rounded typography.
- Targeted form retrieval emphasized password visibility, real labels, submit feedback, and mobile-first behavior.
- Targeted minicart retrieval emphasized sticky/fixed elements not obscuring content, mobile-first layouts, confirmation feedback, and predictable drawer behavior.
- Typography retrieval supports **Varela Round + Nunito Sans** for a soft UI. For this demo, use **Rubik + Nunito Sans** or keep existing Rubik heading tokens while lowering weights for transactional surfaces. Do not replace the whole site font in one uncontrolled pass.

## File Ownership

- Modify `web/src/styles/global.css`: font/token refinements, auth modal layout, password input icon slot, minicart layout, checkout inventory/order-sheet/safeguards polish, favicon link if handled in HTML.
- Modify `web/src/features/account/AuthModalShell.tsx`: password eye toggle placement, email edit row, copy, button layout, loading labels.
- Modify `web/src/features/account/AuthModalShell.test.tsx`: email/password modal behavior and accessibility coverage.
- Modify `web/src/features/cart/MinicartShell.tsx`: hierarchy, optional row metadata, action order if needed.
- Modify `web/src/features/cart/MinicartShell.test.tsx`: drawer hierarchy, product rows, quantity controls, action visibility.
- Modify `web/src/features/checkout/CheckoutPage.tsx`: visible helper copy, pickup inventory row markup if needed, order-sheet handle semantics if needed, checkout safeguards density if needed.
- Modify `web/src/features/checkout/CheckoutPage.test.tsx` and `CheckoutPage.interactions.test.tsx`: payment helper, inventory row, order sheet, safeguards, focus behavior.
- Modify `web/index.html` or `web/public/favicon.svg`/`web/public/favicon.ico`: favicon 404 prevention.
- Modify `web/src/styles/global.test.ts`: CSS contracts for layout, touch target, typography weights, native spinner hiding if touched, z-index/safe-area if touched.
- Update this plan, `DESIGN.md`, `IMPLEMENTATION_TASKS.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` as tasks close.

## Task 0: Mockup And Plan Approval Gate

**Files:**
- Add: `mockups/round4-auth-minicart-checkout-polish.html`
- Add: `ROUND4_AUTH_MINICART_CHECKOUT_POLISH_PLAN.md`
- Modify: `DESIGN.md`
- Modify: `IMPLEMENTATION_TASKS.md`
- Modify: `tracking/todos.md`
- Modify: `tracking/test-cases.md`
- Modify: `tracking/progress.md`

**Acceptance Criteria:**
- [x] The mockup shows Email sign-in, Password sign-in, Register, Minicart, Checkout payment/order sheet, and Pickup inventory card targets.
- [x] The mockup uses no emoji icons, no fake PayPal internals, and no unsupported payment claims.
- [x] The plan lists file ownership, implementation tasks, and measurable AC for every touched page/modal.
- [x] Tracking files include open Round 4 rows before runtime work starts.
- [x] User approval is recorded before production code changes.

## Task 1: Typography And Transactional Token Foundation

**Intent:** Make auth, minicart, and checkout surfaces feel closer to the accepted reference: softer, readable, compact, and less heavy.

**Implementation Notes:**
- Prefer a scoped token change over a whole-site uncontrolled font swap.
- Keep POP MART expressive typography for brand/nav/product merchandising where already approved.
- For transaction surfaces, target body weight `500-650`, headings `650-780`, and avoid 900-heavy labels except very small badges.
- If adding a new font package is needed, avoid network hotlinking in production. Prefer package-managed font assets or existing fontsource pattern.

**Acceptance Criteria:**
- [x] Auth modal, password modal, minicart, checkout payment steps, pickup store cards, and order sheet use the softer transaction font/token layer locally through scoped `--transaction-*` CSS contracts.
- [x] No touched modal heading renders at hero scale or oversized 900-weight in the scoped CSS contract.
- [x] Body/helper copy remains at least 4.5:1 contrast against background.
- [x] Button labels fit at 320px without wrapping unless intentionally multi-line.
- [x] Existing Home/Category/PDP approved typography does not regress from this foundation slice because the transaction layer is scoped away from those page contracts.
- [x] Style tests cover transaction-surface heading/body weight ranges or the specific class contracts that enforce them.

## Task 2: Favicon And Console Evidence Hygiene

**Intent:** Prevent `/favicon.ico` 404 noise from polluting visual QA evidence.

**Acceptance Criteria:**
- [x] The app links a valid local favicon asset or explicitly suppresses the missing default request.
- [x] Browser evidence for Auth, Minicart, and Checkout has no favicon 404 in console/response logs.
- [x] The favicon asset is lightweight, local, and does not introduce external requests.
- [x] The favicon has a safe accessible brand description in any SVG title where applicable.

## Task 3: Email Sign-In Modal Polish

**Intent:** Replace the simple right-aligned CTA layout with a calm, centered, form-first modal.

**Implementation Notes:**
- Keep shadcn `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, and `DialogDescription`.
- Modal target: desktop width around `420-460px`; mobile width `calc(100vw - 32px)`.
- Keep label above input. Do not rely on placeholder-only labels.
- Make `Continue` full width and aligned exactly with the email input.
- Copy target:
  - Title: `Sign in`
  - Description: `Use your email to continue checkout.`
  - Button: `Continue`

**Acceptance Criteria:**
- [x] The email modal has one primary action and it is centered/full-width under the email field.
- [x] The primary button width equals the email input width at 320, 390, and desktop.
- [x] Close button remains icon-only with accessible name and 44px touch target.
- [x] Invalid email shows `aria-invalid`, a `FieldError`, and no route transition.
- [x] Submit shows loading feedback such as `Checking...`.
- [x] Enter key submits the email form.
- [x] Focus starts in the email field when the modal opens and returns to the actual opener after close, including the post-purchase guest-account trigger.
- [x] Existing guest and logged-out checkout entry flows still open this modal without sticky checkout bars overlapping it.

## Task 4: Password Modal Polish

**Intent:** Move password visibility into the password input and demote email correction to a small edit affordance.

**Decision:** Keep the ability to change email, but do not keep it as a competing footer button. Rename or present it as `Edit email` beside the read-only email row.

**Implementation Notes:**
- Replace the full-width `Show password` button with an icon button inside the password input.
- Use Lucide `Eye` and `EyeOff`, or equivalent inline SVG.
- The icon button must have `aria-label="Show password"` and `aria-label="Hide password"` depending on state.
- Show email as a read-only compact row or pill. Provide `Edit email` as low-emphasis text/action.
- Make `Sign in` full-width and visually match the Email `Continue` button.

**Acceptance Criteria:**
- [x] No visible standalone `Show password` / `Hide password` button remains.
- [x] Password visibility toggles between `type="password"` and `type="text"`.
- [x] Eye toggle is inside the password input, 44px touch target, keyboard reachable, and does not cover typed text.
- [x] `Edit email` clears password, returns to email state, and preserves current email for correction.
- [x] `Sign in` width/height matches Email `Continue`.
- [x] Empty password shows `aria-invalid`, a `FieldError`, and does not submit.
- [x] Loading copy is specific: `Signing in...` instead of generic `Submitting...`.
- [x] Existing account sign-in tests still prove session persistence and cart merge.

## Task 5: Register Modal Safety Check

**Intent:** Ensure the auth polish does not regress account creation.

**Acceptance Criteria:**
- [x] Register state keeps terms checkbox, validation, and no fake enabled social auth.
- [x] Password eye toggle also works in register state with new-password autocomplete.
- [x] Create account CTA follows the same full-width transaction-button style inside the form column.
- [x] Register opens with focus on the first required field and returns focus to the actual opener on close.
- [x] Terms/password errors use `aria-invalid`, buyer-readable `FieldError`/alert semantics, and do not submit before validation passes.
- [x] Create account width equals the input column width at 320, 390, and desktop.
- [x] Register loading copy is specific, such as `Creating account...`, and no generic `Submitting...` copy appears.
- [x] The split benefits/form layout remains usable on desktop and collapses cleanly on mobile.
- [x] Existing register tests remain green.

## Task 6: Minicart Drawer Polish

**Intent:** Make the minicart a compact product-first checkout drawer, not a crowded mixed payment panel.

**Implementation Notes:**
- Keep shadcn `Sheet side="right"` and outside-click dismissal.
- Header target: `Cart (n)` or `Cart` + item count with compact close button.
- Product row target: stable image, product name line-clamped to two lines, category or status chip, unit/line price, quantity stepper.
- Quantity steppers must remain 44px minimum, use merchant-owned `-` and `+`, and hide native number spinners.
- Sticky action panel target: subtotal/discount summary, primary `Checkout`, secondary `View cart`, Pay Later message below or after the primary action group so it does not dominate the first drawer viewport.

**Local Implementation Status (2026-07-09):**
- [x] `MinicartShell` keeps shadcn `Sheet side="right"` semantics, overlay/outside-click dismissal, and close-button accessibility.
- [x] Product rows now expose a `product-first` drawer row contract, a two-line-clamped product-name element, compact category/amount meta, and product-specific quantity names.
- [x] Empty carts keep the buyer in a browse path and do not render checkout, Pay Later, or express-payment controls.
- [x] Checkout remains the primary action, `View cart` remains a framed secondary action, and Pay Later/express content is styled as secondary content after the product/action hierarchy.
- [x] Sub-agent review found a focus-return gap after close/Escape/outside-click dismissal; app-level focus restoration now returns to the header cart trigger, with focused App interaction coverage.
- [x] Focused code proof: `npm test -- web/src/features/cart/MinicartShell.test.tsx web/src/app/App.interactions.test.tsx web/src/styles/global.test.ts`.

**Acceptance Criteria:**
- [x] Open minicart panel visually separates from background with overlay/elevation/accent rail.
- [x] At 320 and 390px, first drawer viewport shows header, at least one item row, and Checkout action without product details being hidden behind payment copy.
- [x] Product names line-clamp to two lines with no horizontal overflow.
- [x] Quantity controls keep 44px+ touch targets and no native spinners.
- [x] Quantity increase/decrease controls expose product-specific accessible names such as `Increase Molly Blind Boxes 2 quantity` and `Decrease Molly Blind Boxes 2 quantity`; the evidence helper hard-fails unnamed or generic controls.
- [x] Checkout is the dominant full-width action; View cart is secondary and still framed as a button.
- [x] Pay Later messaging remains official/fallback-controlled and does not duplicate copy.
- [x] Empty minicart hides payment controls and shows a clear browse action.
- [x] Outside click, Escape, close button, and route navigation close the Sheet and return focus predictably.
- [x] No checkout sticky summary is visible while the minicart Sheet is open.

## Task 7: Checkout Payment Helper, Safeguards, And Order Sheet Polish

**Intent:** Close the accepted checkout polish findings without changing payment behavior.

**Implementation Notes:**
- Keep payment helper copy buyer-facing or omit it where the heading is enough; the local runtime currently uses `Choose a payment method.`
- Do not reintroduce engineering placeholders, `demo`, or implementation-state helper phrases in checkout payment copy.
- Keep the bottom order sheet as shadcn `Sheet side="bottom"`.
- Add/tighten a neutral passive grabber and reduce blank top padding.
- Checkout safeguards should become a compact trust row below payment on mobile/late checkout, or collapse below the payment task.
- 2026-07-09 local implementation: the trust strip now uses buyer-facing labels, compacts to badge-only chips on mobile, and the expanded bottom Sheet uses an absolute neutral grabber with contained scrolling and reduced title padding.

**Acceptance Criteria:**
- [x] No buyer-visible engineering copy remains in payment method sections, fixtures, snapshots, or tests.
- [x] Payment method helper copy is concise, buyer-facing, and absent when redundant.
- [x] Expanded order sheet has a visible neutral grabber, top padding under 24px before the title block, and no large blank header region.
- [x] Order sheet still closes by Escape, scrim, and handle, with focus returning to the collapsed summary trigger.
- [x] Checkout safeguards no longer visually compete with payment selection/action in the mobile payment-ready state.
- [x] PayPal, Pay Later, Apple Pay, Google Pay, Venmo, and card selected action slot sizing from Round 3 does not regress.
- [x] Blocked readiness states still produce zero PayPal create-order requests/callbacks.
- [x] Selected PayPal and selected Pay Later each produce exactly one method-attributed create-order request and one matching SDK callback after explicit activation with settled/current totals.
- [x] Runtime evidence proves selected PayPal, Pay Later, wallet, and card surfaces use official SDK/custom elements or approved merchant-owned wrappers; no merchant CSS targets provider iframes, shadow DOM, or internal button/message content.

**Local Proof:**
- `npm test -- web/src/features/checkout/CheckoutPage.test.tsx web/src/styles/global.test.ts`
- `npm test -- web/src/app/App.checkout-paypal-capture.test.tsx web/src/app/App.interactions.test.tsx web/src/features/checkout/CheckoutPage.test.tsx web/src/styles/global.test.ts`

## Task 8: Pickup Inventory Card Mobile Wrap Repair

**Intent:** Make item-level inventory cards compact and scannable on narrow screens.

**Implementation Notes:**
- For each inventory line, use a compact grid/flex row:
  - left: item name + requested quantity, line-clamped to two lines
  - right: status/availability, right-aligned
  - narrow widths: move long status such as `Only 1 available` below or onto a second row without forcing the item name into a narrow vertical stack
- Preserve color-independent inventory status with text labels and ticket rail.

**Local Acceptance Criteria:**
- [x] Shared pickup inventory markup exposes dedicated item-name and status classes for both the store picker and inline preselected summary through `PickupStoreInventoryRows`.
- [x] Desktop/tablet CSS uses `minmax(0, 1fr) auto`, keeps status right-aligned, and prevents the item-name column from forcing horizontal overflow.
- [x] Mobile CSS below `520px` moves status below the item name and keeps the name line-clamped to two lines without `word-break: anywhere` behavior.
- [x] Draft reconciliation maps full, partial, and zero-available stores to the text labels `Full inventory`, `Partial inventory`, and `Sold out`; item rows retain `In stock`, limited, or sold-out text.
- [x] Focused component, mapper, and CSS tests cover the shared row contract and all three store inventory labels.

**Browser Evidence Criteria:**
- [x] `Molly Blind Boxes 2 x 2` and similar long names do not stack one or two words per line at 320/390px.
- [x] Availability/status remains readable and right-aligned on desktop/tablet.
- [x] Narrow mobile stacks availability below the item row while the item name occupies no more than two lines.
- [x] Store picker and inline preselected summary have no horizontal overflow and preserve text-labelled full/partial/sold-out states.

**Local Proof:**
- `npm test -- web/src/features/checkout/checkoutDraftApi.test.ts web/src/features/checkout/CheckoutPage.test.tsx web/src/styles/global.test.ts`

## Task 9: Evidence Helper And Deploy Quality Gate

**Intent:** Add repeatable verification that compares runtime UI against the Round 4 mockup targets.

**Recommended Evidence Rows:**
- `auth-email-modal-390`
- `auth-password-modal-390`
- `auth-register-modal-390`
- `auth-email-modal-320`
- `auth-password-modal-320`
- `auth-register-modal-320`
- `auth-email-modal-1440`
- `auth-password-modal-1440`
- `auth-register-modal-1440`
- `minicart-open-320`
- `minicart-open-390`
- `minicart-open-1440`
- `checkout-payment-method-390`
- `checkout-payment-method-768`
- `checkout-selected-paypal-390`
- `checkout-selected-paypal-768`
- `checkout-selected-paypal-1440`
- `checkout-selected-paylater-390`
- `checkout-selected-card-390`
- `checkout-recalculating-readiness-390`
- `checkout-failed-readiness-390`
- `checkout-expanded-order-sheet-390`
- `checkout-expanded-order-sheet-320`
- `pickup-store-picker-inventory-390`
- `pickup-store-picker-inventory-320`
- `pickup-store-picker-inventory-1440`
- `pickup-preselected-inventory-320`
- `pickup-preselected-inventory-390`
- `pickup-preselected-inventory-1440`
- `checkout-safeguards-payment-ready-390`
- `desktop-auth-minicart-checkout-1440`

**Required Surface/Width Matrix:**

| Surface | Required widths | Required proof |
| --- | --- | --- |
| Email sign-in modal | 320, 390/414, 1440 | screenshot, focused element, dialog role/name, close/focus return, invalid-email error, input/button width delta |
| Password modal | 320, 390/414, 1440 | screenshot, inline eye toggle rect/label, `type` toggle, `Edit email`, close/focus return, input/button width delta |
| Register modal | 320, 390/414, 1440 | screenshot, first-field focus, terms/password error announcement, `new-password` autocomplete, create-account/input width delta |
| Minicart Sheet | 320, 390/414, 1440 | screenshot, first viewport content, product-row line clamp, quantity rects/accessibility labels, Checkout/View cart hierarchy, no checkout sticky summary |
| Checkout payment readiness | 390/414, 768, 1440 | screenshot, provider buckets by surface, selected-action rects, no-method/selected PayPal/selected Pay Later/selected Card states |
| Expanded order Sheet | 320, 390/414 | screenshot, shadcn Sheet role, passive handle rect, top padding, Escape/scrim/handle close, focus return |
| Pickup inventory rows | 320, 390/414, 1440 | screenshot, full/partial/sold-out labels, two-line clamp, no vertical word stacks, no horizontal overflow, no header overlap |

If a width is intentionally omitted for a surface, the evidence report must mark it `not applicable` and include a reason.

**Mockup Comparison Metrics:**

- Email, password, and register input/button width delta is `0-2px` at measured widths.
- Interactive controls touched by this slice have 44px minimum hit targets unless native provider surfaces control their own dimensions.
- Selected PayPal and Pay Later rows require `data-paypal-sdk-status="ready"`, a nonzero official-element rectangle, and a nonzero visible shadow-control rectangle in the active sticky/summary placement; attached-only custom elements fail.
- Card proof measures the actual `paypal-hosted-card-field` controls, not only their merchant-owned 50px containers, and requires each field to be at least 44px tall.
- Checkout rows require at least one visible checkout-scoped contrast sample; `null` or an empty sample set fails the row.
- Payment wordmark rows expose one visible method name, and the 320px pickup footer measures one-line `Confirm pickup store` plus 44px Cancel/Confirm targets.
- Expanded order sheet top padding before title content remains under `24px`.
- Minicart first viewport contains header, at least one product row, and the Checkout action before Pay Later or express copy dominates.
- Page-level horizontal overflow is `0` at required mobile widths.
- Sticky/fixed overlap counts are `0` for focused fields, modal controls, sheet controls, provider buttons/messages, and footer targets.
- Runtime evidence records the focused element after close for Auth dialogs and order/minicart sheets.

**Acceptance Criteria:**
- [x] Focused tests pass for AuthModalShell, MinicartShell, CheckoutPage, App interactions, and global CSS contracts touched by this slice.
- [x] `npm run typecheck`, `npm run lint`, `npm run format:check`, and `git diff --check` pass.
- [x] Browser evidence records route, viewport, screenshot path, console errors/warnings, response errors, horizontal overflow, focused element, modal/sheet open state, sticky/fixed overlap checks, provider counts, official provider nodes, contrast samples, and explicit width-coverage rationale where payment surfaces are present.
- [x] Console errors are hard failures. Warnings must be triaged with route, viewport, state, and reason.
- [x] No `/favicon.ico` 404 appears in the evidence logs.
- [ ] Hosted smoke remains open until the patched build is deployed and the same rows pass on Render.
- [ ] Hosted closure additionally requires visible hydrated provider geometry, nonempty checkout contrast samples, measured target rectangles, one-line 320px pickup confirmation, and deployed asset identifiers in the persisted report.

**Local Evidence Result (2026-07-11):**

- `npm run evidence:round4:auth-minicart-checkout` produced `31` required rows and `40` quality-95 JPEG screenshots: one primary screenshot per row plus dedicated full/partial/sold-out Pickup screenshots at 320/390/1440. `/private/tmp/paypal-retail-round4-local-auth-minicart-checkout-evidence/metrics.json` reports `missingRows: []`, `failedRows: []`, and no console, response, horizontal-overflow, sticky-overlap, suspicious-pixel, or row-failure issue rows. A review-visible ignored copy is under `.playwright-cli/round4-local-auth-minicart-checkout-evidence/`.
- Parsed transaction body/helper contrast uses real CSS colors with canvas conversion for non-RGB syntax; `65` visible samples cover Auth, Checkout, Minicart, and Pickup with a minimum ratio of `4.60:1`.
- Every evidence JPEG is decoded and measured; suspicious near-black coverage retries up to three times and then hard-fails. The final maximum near-black ratio is `0.0027`, with no suspicious rows.
- Each Minicart row measures six 44px+ quantity controls, requires product-specific accessible names, and owns exactly one PayPal plus one Pay Later express action.
- Pickup picker evidence proves true store-level `full`, `partial`, and `empty` states at `320`, `390`, and `1440`, with a dedicated visible, pixel-clean screenshot for each state and width rather than relying on off-screen DOM state.
- Official runtime proof is placement-scoped: selected PayPal owns exactly one sticky `paypal-button` at 390 and one desktop-summary node at 768/1440, selected Pay Later owns exactly one sticky `paypal-pay-later-button`, and selected Card owns exactly three inline `paypal-hosted-card-field` elements. Hidden or wrong-placement nodes cannot satisfy the gate.
- Email, password, and register rows assert initial focus against their real input IDs in addition to recording close-time focus return.
- Order-sheet evidence records a visible `rgb(184, 174, 168)` passive grabber and successful Escape, handle, and scrim close with focus returned to `Review order details` at `320` and `390`.
- Width coverage includes `320`, `390`, `768`, and `1440`. The report records `375`, `414`, and `1024` as not applicable with branch-specific reasons; it does not silently omit them.
- Positive selected PayPal/Pay Later exactly-once create-order request/callback proof remains inherited from the closed Round 2 API-backed browser evidence and current App-level regression tests. Round 4 does not create duplicate pending sandbox orders merely to re-prove unchanged payment semantics.

## Task 10: Sub-Agent Review Before Runtime Close

**Intent:** Prevent the same gap pattern where mockup agreements fail to appear in implementation AC.

**Acceptance Criteria:**
- [x] Spawn a read-only review sub-agent after implementation but before final close.
- [x] The review prompt includes this plan, the mockup path, changed files, screenshots/metrics, and exact user requirements.
- [x] Review findings are classified P0/P1/P2 and reconciled into code, tests, or explicit deferred rows.
- [x] No Round 4 task is marked complete while a P0/P1 finding remains unresolved.

**Final Review Result (2026-07-11):** read-only `ui-ux-pro-max` reviewer `Pasteur` (`019f4e7a-a903-70e3-898f-78f0942faa86`) first inspected the 31-row evidence set and found no open findings. Pre-release reviewer `Dewey` (`019f4ec7-922e-7ca2-9748-2fb41aa21609`) then identified placement-scoping, visible Pickup-state capture, Auth initial-focus assertion, and router-drift gaps. After the helper, tests, evidence, and router were corrected, Dewey inspected all 40 workspace-visible JPEGs and the final metrics report and returned no P0, P1, or P2 findings. The diff is safe to commit/push; hosted Render smoke remains the separate post-deploy gate.

**Hosted Review Correction (2026-07-11):** the first Render review kept the hosted gate open after finding an attached-but-unpainted PayPal action, empty checkout contrast samples, hardcoded rather than measured touch-target reporting, a wrapped 320px pickup confirmation, and duplicated visible PayPal branding. The correction adds a visible SDK-loading fallback, single visible wordmark labels, 44px hosted Card Fields, ready/shadow-control provider waits and geometry, checkout-scoped contrast sampling, real target rectangles, one-line pickup action proof, and a Node evidence runner that persists `metrics.json`. The follow-up reviewer then found one P1 timing gap: the fallback disappeared after configuration but before runtime hydration. Runtime now keeps the fallback through `pending`, replaces it atomically only at `data-paypal-sdk-runtime-status="resolved"`, and the helper requires that state. It also directly samples sticky total/promo and sheet breakdown/item text. A fresh local 31-row/40-image matrix passes with no missing or failed rows, and reviewer `Mendel` (`019f5019-d909-7340-9d66-e96b40ad94c6`) reports no unresolved P0/P1/P2 findings. At 320px the expanded provider may require contained sheet scrolling, but it must be runtime-resolved, hydrated, 44px+, and reachable. Deployment plus a fresh hosted reviewer verdict remain required.

**Hosted Visual Follow-Up Design (2026-07-12):** the first review of the refreshed hosted matrix found three presentation gaps. The selected correction keeps scope inside Round 4: Auth and Minicart product art use a shared buyer-safe fallback when an asset genuinely fails, while the evidence helper waits for every visible image to be complete, nonzero, and decoded before capture; selected Card keeps its single inline `Pay by card` action and replaces the mobile sticky `Choose payment` control with concise guidance back to the Card section; password/register email summaries stay on one line with ellipsis while `Edit email` remains a 44px target. Regression tests must fail before each runtime/helper correction, fresh local evidence must cover the affected rows, and a new read-only reviewer must return no P0/P1 findings before deployment is considered ready.

**Hosted Visual Follow-Up Local Result (2026-07-12):** the exact current-code local matrix at metrics SHA1 `cf77b82d3bd99ced8a57967e7a4c1d7d44298c48` passes `31/31` required rows and `40/40` JPEGs with no missing or failed rows, `4.60:1` minimum contrast, 44px minimum measured target, and `0.0027` maximum near-black ratio. Fresh read-only `ui-ux-pro-max` review inspected every image and returned PASS with no P0/P1/P2 findings. Commit/deploy plus a new Render matrix and hosted review remain the external closure gate.

## Hard Blockers

- Engineering copy remains visible in buyer-facing payment method sections.
- Auth email/password primary buttons do not align with input width on mobile.
- Password visibility is still a separate large button instead of an inline eye toggle.
- Minicart product rows or quantity controls overflow at 320px.
- Pickup inventory item names stack vertically or force horizontal scrolling.
- Expanded order sheet keeps a large blank top area or loses close/focus-return behavior.
- Safeguards compete with the payment task in mobile payment-ready checkout.
- Evidence contains `/favicon.ico` 404, console errors, horizontal overflow, sticky/modal overlap, or untriaged warning noise.

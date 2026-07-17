# PayPal Retail Demo Agent Rules

## Role

This file contains long-lived guardrails for this demo. During the targeted workflow backfill, the authority transition is atomic. The named Workflow Authority Handover Gate passes only when the user approves the requirement register, traceability matrix, design links and artifact index, and a passing deterministic coverage validator together. Before that gate passes, existing canonical documents and `IMPLEMENTATION_TASKS.md` retain their current milestone roles; after it passes, `REQUIREMENTS.md` becomes the only product-requirement authority and task/tracking files become derived execution views.

## Guardrails

- Preserve the confirmed POP MART-style retail demo purpose and mixed business/technical audience.
- Keep buyer UI retail-first; PayPal branding belongs in official payment surfaces, not hero/nav marketing.
- Before the design-system handover, frontend work follows the existing `DESIGN.md` contracts. After handover, `DESIGN.md` is the approved-direction router and frontend work follows its linked design-system, typography, component, board, page, mockup, and state contracts.
- Before planning Home, Category, PDP, Cart, Minicart, Checkout, Account, or order-confirmation polish, run `ui-ux-pro-max` as retrieval: design-system first, then targeted UX/style/typography/shadcn or React searches, then 2-3 synthesized options or mockups for user selection before implementation tasks. When reviewing an implementation plan or GUI, produce a priority-ranked design review packet with `P0`/`P1`/`P2` findings, affected component/page, rationale, recommended fix, and measurable inspection standard; do not replace the retrieval output with generic UI/UX opinion.
- Treat POP MART assets as customer-specific and not reusable outside this demo.
- Keep the generic MochiToy Studio profile public-safe and fictional.
- Use TypeScript for web, server, shared modules, tests, and seed tooling.
- Ask before changing payment-flow semantics, BOPIS payload semantics, vaulting behavior, promo/tax rules, or cart/order lifecycle rules.
- Update the applicable requirement, payment evidence, design decision, API/architecture contract, test case, and evidence record when payment behavior changes.
- Verify affected behavior before reporting completion.

## Milestone Close Gates

- Do not close PDP, cart, minicart, checkout, or payment UI milestones based only on rendered layout.
- Do not close customer-facing frontend slices unless the touched page/component matches the applicable design decision plus linked tokens, typography, component, page, mockup/state, responsive, and interaction contracts.
- Every visible buyer action must be wired to demo state/API behavior, disabled with a buyer-facing reason, or explicitly listed as deferred in tracking.
- Checkout/payment milestones require buyer-flow interaction evidence: editable fields, submit/collapse behavior, option selection, payment-method switching, and selected payment surface rendering.
- Payment SDK surfaces require live browser evidence of the hydrated official provider/button/message on each promised placement; static labels or local HTML buttons do not count.
- API-backed checkout steps require tested loading, success, and failure states against the real backend contract; a route transition alone does not prove payment or recalculation behavior.
- Before the workflow handover gate, treat `IMPLEMENTATION_TASKS.md` as the current milestone-completion authority. After handover, reconcile the complete `REQUIREMENTS.md` register and active slice charter first; task lists cannot close, defer, or remove a requirement. At either stage, list unresolved current and previous work with an explicit disposition.
- Search for implementation placeholders before closing a milestone: unchecked tasks, disabled action buttons, shell-only routes, and copy/code containing `deferred`, `placeholder`, `handled in`, or similar later-slice language. Any match must be fixed or explicitly listed as deferred backlog with a reason and next trigger.
- Before moving to the next milestone, confirm the currently applicable authority, active slice, task list, `PLAN.md`, and tracking files agree on what is done versus still shell-only.

## Payment Rules

- Do not invent PSP capabilities.
- Confirm PayPal JS SDK v6, npm v9.x, Pay Later, card fields, Apple Pay, Google Pay, Venmo, and vaulting behavior via the payment wiki (`KNOWLEDGE_SOURCES.md`) before implementation.
- Delivery express buttons from PDP/cart/minicart are delivery-only.
- BOPIS orders are created only from Pickup checkout.
- BOPIS v1 uses capture-at-checkout with store pickup shipping semantics. Do not replace it with authorize-at-checkout/capture-at-pickup unless the user explicitly requests that alternate flow.
- Before handover, the exact BOPIS Create Order payload remains specified in `API_CONTRACT.md` and the existing `DESIGN.md`. After handover, an approved requirement owns the behavioral promise and links to `API_CONTRACT.md`; do not change payload semantics without updating the applicable authority and getting approval.
- Shipping fee is excluded from promo and tax calculations.

## Tracking

Maintain the standard tracking files (see `demos/AGENTS.md` for the canonical list). Update them task by task.

## Code Graph

- If `graphify-out/` exists, use Graphify for code navigation before broad manual searches. Run from this demo folder with `graphify ...`, or `/Users/tengtao/.local/bin/graphify ...` when user-local binaries are not on `PATH`.
- Treat `graphify-out/` as generated local context, not a source of truth. Refresh with `graphify update .` after meaningful code changes.

## Ask Before Changing

- Fulfillment mode binding.
- Payment session creation timing.
- PayPal Create Order payload fields.
- Promo stacking/selection rules.
- Tax calculation order.
- Cart sync and pending order resume semantics.
- Saved payment/vaulting semantics.
- Admin Portal access/control model.

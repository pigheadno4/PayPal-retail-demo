# PayPal Retail Demo Agent Rules

## Role
This file contains long-lived guardrails for this demo. Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.

## Guardrails
- Preserve the confirmed POP MART-style retail demo purpose and mixed business/technical audience.
- Keep buyer UI retail-first; PayPal branding belongs in official payment surfaces, not hero/nav marketing.
- Treat POP MART assets as customer-specific and not reusable outside this demo.
- Keep the generic MochiToy Studio profile public-safe and fictional.
- Use TypeScript for web, server, shared modules, tests, and seed tooling.
- Ask before changing payment-flow semantics, BOPIS payload semantics, vaulting behavior, promo/tax rules, or cart/order lifecycle rules.
- Update `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, and `tracking/test-cases.md` when payment behavior changes.
- Verify affected behavior before reporting completion.

## Milestone Close Gates
- Do not close PDP, cart, minicart, checkout, or payment UI milestones based only on rendered layout.
- Every visible buyer action must be wired to demo state/API behavior, disabled with a buyer-facing reason, or explicitly listed as deferred in tracking.
- Checkout/payment milestones require buyer-flow interaction evidence: editable fields, submit/collapse behavior, option selection, payment-method switching, and selected payment surface rendering.
- Before moving to the next milestone, confirm `IMPLEMENTATION_TASKS.md`, `PLAN.md`, `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` agree on what is done versus still shell-only.

## Payment Rules
- Do not invent PSP capabilities.
- Confirm PayPal JS SDK v6, npm v9.x, Pay Later, card fields, Apple Pay, Google Pay, Venmo, and vaulting behavior via the payment wiki (`KNOWLEDGE_SOURCES.md`) before implementation.
- Delivery express buttons from PDP/cart/minicart are delivery-only.
- BOPIS orders are created only from Pickup checkout.
- BOPIS v1 uses capture-at-checkout with store pickup shipping semantics. Do not replace it with authorize-at-checkout/capture-at-pickup unless the user explicitly requests that alternate flow.
- The exact BOPIS Create Order payload (intent, shipping preference, pickup shipping type, store address, receiver name) is specified in `API_CONTRACT.md` and `DESIGN.md`. Those are the source of truth; do not change payload semantics without updating them and getting approval.
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

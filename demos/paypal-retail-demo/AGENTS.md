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

## Payment Rules
- Do not invent PSP capabilities.
- Confirm PayPal JS SDK v6, npm v9.x, Pay Later, card fields, Apple Pay, Google Pay, Venmo, and vaulting behavior from `/Users/tengtao/Development/wiki-v2` before implementation.
- Delivery express buttons from PDP/cart/minicart are delivery-only.
- BOPIS orders are created only from Pickup checkout.
- BOPIS v1 uses capture-at-checkout with store pickup shipping semantics unless the user approves a change.
- BOPIS v1 Create Order must use `intent: "CAPTURE"`, PayPal `shipping_preference: "SET_PROVIDED_ADDRESS"`, `purchase_units[].shipping.type: "PICKUP_IN_STORE"`, the selected store address, and receiver name `s2s ${storeName}`.
- Do not replace the v1 BOPIS flow with authorize-at-checkout/capture-at-pickup unless the user explicitly requests that alternate flow.
- Shipping fee is excluded from promo and tax calculations.

## Tracking
Maintain:
- `tracking/todos.md`
- `tracking/progress.md`
- `tracking/debug.md`
- `tracking/test-cases.md`
- `tracking/learnings.md`

Update tracking files task by task.

## Ask Before Changing
- Fulfillment mode binding.
- Payment session creation timing.
- PayPal Create Order payload fields.
- Promo stacking/selection rules.
- Tax calculation order.
- Cart sync and pending order resume semantics.
- Saved payment/vaulting semantics.
- Admin Portal access/control model.

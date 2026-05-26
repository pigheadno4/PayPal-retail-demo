# {{DEMO_NAME}} Agent Rules

## Role
This file contains long-lived guardrails for this demo. Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.

## Guardrails
- Preserve the confirmed demo purpose and audience.
- Ask before changing payment-flow semantics.
- Update `DEMO.md`, `DESIGN.md`, and `tracking/test-cases.md` when payment behavior changes.
- Verify affected behavior before reporting completion.

## Ask Before Changing
- Subscription lifecycle.
- Vaulting semantics.
- Saved-payment semantics.
- Auto-charge behavior.
- Retry, cancellation, refund, capture, authorization, or settlement behavior.
- Platform parity between web, iOS, and Android.

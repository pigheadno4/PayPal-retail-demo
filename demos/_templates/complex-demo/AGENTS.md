# {{DEMO_NAME}} Agent Rules

## Role
This file contains long-lived guardrails for this demo. Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.

## Guardrails
- Preserve the confirmed demo purpose and audience.
- Ask before changing payment-flow semantics.
- Update `DEMO.md`, `DESIGN.md`, and `tracking/test-cases.md` when payment behavior changes.
- Frontend work must follow the implementation-grade UI/UX contracts in `DESIGN.md`; do not extend a generic shell when page specs require a specific design language.
- Verify affected behavior before reporting completion.

## Milestone Close Gates
- Rendered UI is only shell progress; it does not prove the promised user behavior works.
- Before marking a user-facing milestone done, every visible action must be wired, disabled with a clear reason, or explicitly deferred in tracking.
- Broad task labels do not close user-visible promises; each promise needs a task, test, and evidence type or an explicit deferral.
- Pair render/snapshot tests with interaction tests or manual verification for the primary user journey.
- For PSP or wallet UI, verify the hydrated official SDK/provider surface in a browser for each promised placement; branded local buttons or static text are shell progress only.
- For API-backed UI, verify loading, success, and failure states against the backend contract before marking the interaction complete.
- For multi-step UI, keep a state contract or mockup aligned with implementation, tests, and tracking.
- For customer-facing frontend slices, verify the touched page/component against `DESIGN.md` tokens, component contracts, page specs, UX-flow contracts, and responsive/interaction acceptance rows.
- For payment, checkout, webhook, vaulting, or account milestones, verify both buyer-visible behavior and stored/backend state when applicable.
- Reconcile the implementation plan with `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` before moving phases.

## Ask Before Changing
- Subscription lifecycle.
- Vaulting semantics.
- Saved-payment semantics.
- Auto-charge behavior.
- Retry, cancellation, refund, capture, authorization, or settlement behavior.
- Platform parity between web, iOS, and Android.

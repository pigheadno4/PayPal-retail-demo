# {{DEMO_NAME}} Agent Rules

## Role
This file contains long-lived guardrails for this demo. Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.

## Guardrails
- Preserve the confirmed demo purpose and audience.
- Ask before changing payment-flow semantics.
- Update `DEMO.md`, `DESIGN.md`, and `tracking/test-cases.md` when payment behavior changes.
- Verify affected behavior before reporting completion.

## Milestone Close Gates
- Rendered UI is only shell progress; it does not prove the promised user behavior works.
- Before marking a user-facing milestone done, every visible action must be wired, disabled with a clear reason, or explicitly deferred in tracking.
- Broad task labels should be decomposed when they hide user-visible promises; keep missing behavior open or explicitly deferred.
- Pair render/snapshot tests with interaction tests or manual verification for the primary user journey.
- For PSP or wallet UI, verify the hydrated official SDK/provider surface in a browser for each promised placement; branded local buttons or static text are shell progress only.
- For API-backed UI, verify loading, success, and failure states against the backend contract before marking the interaction complete.
- For multi-step UI, keep a state contract or mockup aligned with implementation, tests, and tracking.
- Reconcile the implementation plan with `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` before moving phases.

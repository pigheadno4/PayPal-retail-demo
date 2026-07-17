# {{DEMO_NAME}} Agent Rules

## Role

This file contains long-lived guardrails for this demo. Product requirements belong only in `REQUIREMENTS.md`; scenario, design, architecture, task, and tracking files are derived views with the authority defined in `demos/NEW_DEMO_PROTOCOL.md`.

## Guardrails

- Preserve the confirmed demo purpose and audience.
- Ask before changing payment-flow semantics.
- Update the requirement, payment evidence, design decision, architecture/API contract, test, and evidence links when payment behavior changes.
- Frontend work must follow the `DESIGN.md` decision router and its linked implementation-grade contracts; do not extend a generic shell when approved page specs require a specific design language.
- Verify affected behavior before reporting completion.

## Milestone Close Gates

- Rendered UI is only shell progress; it does not prove the promised user behavior works.
- Before marking a user-facing milestone done, every visible action must be wired, disabled with a clear reason, or explicitly deferred in tracking.
- Broad task labels should be decomposed when they hide user-visible promises; keep missing behavior open or explicitly deferred.
- Pair render/snapshot tests with interaction tests or manual verification for the primary user journey.
- For PSP or wallet UI, verify the hydrated official SDK/provider surface in a browser for each promised placement; branded local buttons or static text are shell progress only.
- For API-backed UI, verify loading, success, and failure states against the backend contract before marking the interaction complete.
- For multi-step UI, keep a state contract or mockup aligned with implementation, tests, and tracking.
- For customer-facing frontend slices, verify the touched page/component against the approved design decision and linked tokens, typography, component, board, page, mockup/state, responsive, and interaction contracts.
- Reconcile `REQUIREMENTS.md` and the active slice charter with the implementation plan, tasks, and tracking files before moving phases.

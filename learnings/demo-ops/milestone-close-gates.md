# Milestone Close Gates For Demo Work

## Lesson

Rendered UI is not the same as completed user behavior. A demo milestone should not be marked done until the promised action can be verified from the user's perspective, or the action is clearly disabled/deferred in tracking.

## Rule

- Every visible user action must be wired, disabled with a reason, or explicitly deferred.
- Render/snapshot tests prove the shell exists; they do not prove the flow works.
- User-facing milestones need interaction tests or manual verification notes for the promised journey.
- Payment and checkout milestones should also verify backend/database state when applicable.
- Before moving phases, reconcile the implementation plan with `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md`.

## Source

- [[../../demos/paypal-retail-demo/tracking/debug.md]]
- [[../../demos/paypal-retail-demo/tracking/learnings.md]]
- [[../../demos/AGENTS.md]]

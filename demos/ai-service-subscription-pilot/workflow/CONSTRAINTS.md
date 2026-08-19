# AI Service Subscription Pilot Delivery Constraints

Load this file after repository and demo `AGENTS.md` and before loop state, plans, or role dispatch.

## Canonical Authority

- `REQUIREMENTS.md` owns product promises.
- `DESIGN.md` and its linked contracts own approved design decisions.
- `IMPLEMENTATION_PLAN.md` owns architecture and traceability.
- The active approved slice owns the implementation boundary.
- Task plans, roadmap, knowledge, and loop tracking are derived and cannot override those files.

Stop for reconciliation when these sources disagree.

## Hard Denials

- Do not dispatch a task with more than five acceptance criteria.
- Do not invent, narrow, defer, or expand requirements, design behavior, PSP semantics, or provider evidence.
- Do not start frontend implementation without its applicable approved visual evidence.
- Do not skip planned tests, required evidence, either independent review lane, or user approval to save time or budget.
- Do not expose credentials, private customer data, raw provider errors, or reusable tokens in code, logs, screenshots, or reports.
- Do not let Link, Fastlane, PayPal, Stripe, or another provider profile become the application identity system; Supabase owns application identity.
- Do not label a reusable payment method ready from a generic success or capture response when the approved route requires correlated vault-created evidence.
- Do not begin mobile implementation while the approved web-first and later mobile research gates remain open.
- Do not create or merge a pull request without the applicable user approval.
- Only the orchestrator may write loop state, budget, or event-log files.

## Simplicity Standard

- Implement the smallest complete solution for the approved task.
- Every new service, table, abstraction, configuration, fallback, or review gate must trace to a requirement, acceptance criterion, or verified recurring defect.
- Record adjacent ideas as future findings; do not build them inside the current task.
- Stop when the requested outcome and required evidence pass.

## Inspection Standard

Before advancing a task, verify:

1. exact requirement, design, slice, task, test, and evidence links
2. at most five acceptance criteria
3. explicit non-goals and PSP boundary
4. justified frontend and payment routes
5. red/green or approved manual-verification evidence
6. two independent reviewer decisions on the same candidate commit
7. user acceptance at the defined gate
8. budget remaining for the minimum complete path

If any item fails, keep the task blocked or return it to its previous state. Never infer approval from silence or chat history alone.

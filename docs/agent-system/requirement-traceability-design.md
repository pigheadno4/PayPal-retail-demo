# Requirement Traceability Guardrails

## Purpose

Future complex demos must preserve rich kickoff requirements all the way into implementation tasks, tests, browser evidence, and milestone close decisions.

The failure pattern to prevent is:

`kickoff promise -> broad task label -> render-only test -> milestone marked done -> missing behavior discovered later`

The intended pattern is:

`kickoff promise -> source doc section -> explicit task -> test case -> evidence type -> milestone close gate`

## Scope

Apply the full guardrail package to complex demos.

Apply a lighter version to standard demos.

Do not expand simple demo templates beyond their current basic test-case checklist unless the simple demo has multi-step UI or PSP SDK behavior.

## Guardrail A: Requirement Traceability Matrix

After brainstorming and before implementation planning, complex demos must create a short traceability matrix.

Each row should capture one buyer-visible, operator-visible, or payment-critical promise:

| Promise | Source Doc Section | Implementation Task | Test Case | Evidence Type |
| --- | --- | --- | --- | --- |
| Buyer can edit minicart quantities | `DESIGN.md` cart/minicart UX | Cart/minicart quantity task | `tracking/test-cases.md` row | UI interaction + backend cart reconcile |
| Pay Later button renders only when eligible | `IMPLEMENTATION_PLAN.md` payment evidence | Pay Later eligibility task | `tracking/test-cases.md` row | Browser SDK evidence |

Broad labels such as "checkout UI", "cart sync", or "payment integration" are not enough. If a task contains multiple visible promises, split it or list sub-checks that can be independently verified.

## Guardrail B: UX State Contracts And Virtual Mockups

For multi-step UI, create a state contract or virtual mockup before coding.

Use this for:

- checkout and payment flows
- cart and minicart interactions
- account, guest lookup, and order history flows
- admin lifecycle flows
- PSP SDK surface placement
- any UI where only one section, modal, step, or payment action should be active at a time

The state contract should define:

- initial state
- allowed transitions
- submit/save/loading/error states
- collapsed versus expanded sections
- edit/retry behavior
- payment surface gating
- mobile sticky behavior when applicable
- what happens when backend or SDK data is unavailable

Virtual mockups are especially useful during planning because they expose missing details before implementation. Mockups do not replace tests; they become reference material that tests and milestone close gates must agree with.

## Guardrail C: Evidence Ladder Per Milestone

Each complex-demo milestone must define what proves completion at every relevant layer:

- Shell evidence: the screen or component renders.
- Interaction evidence: visible controls mutate state, navigate, submit, collapse, expand, or retry correctly.
- Backend/database evidence: server state, snapshots, inventory, payment sessions, orders, webhooks, or saved records update as expected.
- PSP/browser evidence: official SDK/provider surfaces hydrate in the browser for every promised placement.
- Failure evidence: loading, error, retry, blocked, or ineligible states are visible and buyer-safe.

Not every milestone needs every rung, but payment, checkout, account, admin, webhook, and multi-step UI milestones should explicitly say which rungs apply.

## Guardrail D: Milestone Close Diff Review

Before marking a milestone done, compare:

- active implementation plan or `IMPLEMENTATION_TASKS.md`
- `tracking/todos.md`
- `tracking/test-cases.md`
- `tracking/progress.md`
- relevant UX state contract or mockup

The close review must answer:

- Are all kickoff promises represented as tasks or explicit deferrals?
- Are all visible actions wired, disabled with buyer-facing reason, or deferred?
- Do tests prove interaction, not only render?
- Do PSP surfaces have browser evidence when promised?
- Do backend-backed actions prove loading, success, and failure states?
- Do tracking files agree on what is complete versus shell-only?

If the answer is no, keep the milestone open and record the gap as a task.

## Template Update Plan

Update `demos/NEW_DEMO_PROTOCOL.md` to require the traceability pass after brainstorming and before implementation planning.

Update `demos/AGENTS.md` with one short rule: broad task labels do not satisfy user-visible promises unless they are decomposed into explicit tasks, tests, and evidence.

Update standard and complex demo templates:

- `IMPLEMENTATION_PLAN.md`: add requirement traceability and evidence ladder sections.
- `DESIGN.md`: add UX state contract and virtual mockup guidance.
- `tracking/test-cases.md`: add traceability and evidence ladder checks.
- `tracking/todos.md`: add a planning task to complete traceability before coding.
- template `AGENTS.md`: add a compact local guardrail.

Complex templates should make these required. Standard templates should keep the same concepts but use lighter wording.

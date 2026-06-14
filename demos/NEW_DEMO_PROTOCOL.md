# New Demo Protocol

This is the canonical lifecycle for creating a new demo. Other instruction files point here; do not restate these steps elsewhere.

When the user starts a new demo:

1. Do not create code immediately.
2. Use brainstorming to clarify the demo purpose, audience, business scenario, PSP products, target platforms, and initial UI direction.
3. Classify the demo as simple, standard, or complex, and record it in `DEMO.md` as a `Complexity:` line.
4. For PayPal or Stripe details, use the payment wiki per `KNOWLEDGE_SOURCES.md` (read that wiki's local `AGENTS.md` first).
5. Select the matching template from `demos/_templates/`.
6. Create the new demo directory under `demos/<demo-name>/`.
7. Fill `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md` from confirmed decisions. These demo docs are canonical — when superpowers brainstorming or writing-plans runs, write outputs here, not into `docs/superpowers/specs/`.
8. Generate the local `AGENTS.md` only after stable guardrails are known.
9. For customer-facing or sales-facing demos, run a UI/UX review before implementation and fold the results into `DESIGN.md` and `tracking/test-cases.md`.
10. If the user explicitly asks for subagents, dispatch focused planning/review subagents and merge their findings into one `IMPLEMENTATION_PLAN.md`.
11. For standard and complex demos, run a requirement traceability pass before implementation planning. Map every important buyer-visible, operator-visible, or payment-critical promise to its source doc section, implementation task, test case, and evidence type. Complex demos must keep this matrix in `IMPLEMENTATION_PLAN.md`; standard demos may use a shorter checklist.
12. Create tracking files before implementation (see `demos/AGENTS.md` for the canonical list).
13. Add TDD and verification strategy before coding. For each milestone, define what proves shell rendering, user interaction, backend/database state, and manual sandbox or PSP behavior when applicable. For multi-step UI or payment flows, define a state contract or mockup before implementation and keep it aligned with tests/tracking.
14. Implement task by task.
15. Update tracking files after each task.
16. Before closing a milestone, confirm every visible user action is wired, disabled with a reason, or explicitly deferred; rendered UI alone is shell progress, not completed behavior. PSP or wallet milestones also need browser evidence that the official hydrated SDK/provider surface appears in every promised placement.
17. At milestones, promote reusable lessons into `learnings/` and update `learnings/INDEX.md`.

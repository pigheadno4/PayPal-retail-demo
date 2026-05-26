# New Demo Protocol

When the user starts a new demo:

1. Do not create code immediately.
2. Use brainstorming to clarify the demo purpose, audience, business scenario, PSP products, target platforms, and initial UI direction.
3. Classify the demo as simple, standard, or complex.
4. For PayPal or Stripe details, consult `/Users/tengtao/Development/wiki-v2` after reading that wiki's local `AGENTS.md`.
5. Select the matching template from `demos/_templates/`.
6. Create the new demo directory under `demos/<demo-name>/`.
7. Fill `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md` from confirmed decisions.
8. Generate the local `AGENTS.md` only after stable guardrails are known.
9. Create tracking files before implementation.
10. Add TDD and verification strategy before coding.
11. Implement task by task.
12. Update tracking files after each task.
13. At milestones, promote reusable lessons into `learnings/` and update `learnings/INDEX.md`.

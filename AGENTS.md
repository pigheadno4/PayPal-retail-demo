# Payment Demo Pool Agent Rules

## Repository Purpose

This repository is a payment demo pool for creating customer-facing, sales-facing, and internal comparison demos.

## Agent Operating Contract

- Understand the demo goal, audience, payment products, target platforms, and success criteria before making substantial changes.
- Prefer small, scoped, reversible changes over broad rewrites.
- Ask before assuming PSP behavior, compliance meaning, pricing, settlement timing, risk logic, or product capability.
- Keep implementation aligned with the current plan and tracking files.
- Verify affected behavior before reporting completion. If verification is blocked, document the blocker clearly.
- Preserve working demos. Do not refactor unrelated demos while working on one demo.

## Payment Safety Rules

- Do not invent PayPal, Stripe, Klarna, Afterpay, Apple Pay, Google Pay, or other PSP capabilities.
- Do not make unsupported compliance, pricing, settlement, risk, or contractual claims.
- Do not copy secrets, merchant credentials, or private customer data into demo code or docs.
- Clearly separate demo assumptions from PSP-confirmed behavior.

## Knowledge Sources

- For PayPal or Stripe integration details, use the payment wiki. Its location and usage rules live in `KNOWLEDGE_SOURCES.md` (the one place the absolute path is recorded).
- Extract relevant conclusions into a demo's `REQUIREMENTS.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, payment-evidence map, or a learning entry. Do not paste large wiki sections into AGENTS.md.

## Planning Artifacts

- For standard and complex demos, `REQUIREMENTS.md` is the only product-requirement authority. `DEMO.md` summarizes the scenario, `DESIGN.md` routes design decisions and contracts, and `IMPLEMENTATION_PLAN.md` owns architecture and traceability.
- Task lists, slice plans, `PLAN.md`, and tracking files are derived execution views. They cannot narrow, remove, or replace an approved requirement.
- When superpowers brainstorming or writing-plans runs for a demo, write outputs into those demo docs — not into `docs/superpowers/specs/`.
- The canonical new-demo lifecycle is `demos/NEW_DEMO_PROTOCOL.md`. Do not restate its steps elsewhere.

## Instruction Maintenance

- Keep AGENTS.md short and high-signal.
- Add a root rule only when removing it would likely cause repeated agent mistakes.
- If a rule is local to demos, put it under `demos/AGENTS.md`.
- If a rule is local to one demo, put it under that demo's AGENTS.md after planning.
- Treat instruction files like code: review, prune, and update them when behavior proves a rule is missing or stale.
- After changing the instruction structure, run `scripts/check-agent-system.sh` (a committed pre-commit hook in `scripts/git-hooks/` runs it automatically).

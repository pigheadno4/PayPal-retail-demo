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
- When PayPal or Stripe integration details matter, consult `/Users/tengtao/Development/wiki-v2`.
- Before using `wiki-v2`, read and follow `/Users/tengtao/Development/wiki-v2/AGENTS.md`.
- Extract relevant conclusions into `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, or learning entries. Do not paste large wiki sections into AGENTS.md.

## Instruction Maintenance
- Keep AGENTS.md short and high-signal.
- Add a root rule only when removing it would likely cause repeated agent mistakes.
- If a rule is local to demos, put it under `demos/AGENTS.md`.
- If a rule is local to one demo, put it under that demo's AGENTS.md after planning.
- Treat instruction files like code: review, prune, and update them when behavior proves a rule is missing or stale.

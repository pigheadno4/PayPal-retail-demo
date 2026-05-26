# Demo Development Rules

## Purpose
This directory contains runnable payment demos and their supporting documentation.

## Demo Complexity Levels

### Simple Demo
Single HTML, small script, or narrow PSP behavior demo. Requires `DEMO.md` and `tracking/test-cases.md`.

### Standard Demo
Web plus backend, one PSP flow, or meaningful state. Requires `AGENTS.md`, `CLAUDE.md`, `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, and tracking files.

### Complex Demo
Multiple PSPs, multiple platforms, subscriptions, vaulting, webhooks, Supabase, mobile apps, or customer-facing flows. Requires the full lifecycle in `NEW_DEMO_PROTOCOL.md`.

## Complex Demo Lifecycle
- Start with brainstorming. Do not code immediately.
- Clarify purpose, audience, payment products, platforms, and success criteria.
- Consult `/Users/tengtao/Development/wiki-v2` for PayPal or Stripe details when relevant.
- Create or update `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.
- Add TDD and verification strategy before implementation.
- Run UI/UX review for customer-facing demos.
- Create tracking files before implementation starts.
- Extract long-lived guardrails into the demo-level `AGENTS.md` after planning.
- Implement task by task and update tracking files after each completed task.
- Promote reusable lessons into the root `learnings/` pool at milestones.

## TDD Rules
- Define expected behavior before implementation.
- Add or update `tracking/test-cases.md` for each meaningful task.
- Write automated tests first when practical.
- If automation is not practical, define manual verification before coding.
- Do not report completion until verification is run or the blocker is documented.

## Tracking Rules
Each standard or complex demo should maintain:
- `tracking/todos.md`
- `tracking/progress.md`
- `tracking/debug.md`
- `tracking/test-cases.md`
- `tracking/learnings.md`

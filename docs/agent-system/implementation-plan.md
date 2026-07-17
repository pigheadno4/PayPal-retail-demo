# Demo Agent System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status (2026-06-02): historical build record.** This plan's embedded file contents are a snapshot of the original scaffolding and are now stale in places (wiki path, lifecycle wording). The canonical live sources are the actual repo files — root `AGENTS.md`, `KNOWLEDGE_SOURCES.md`, `demos/AGENTS.md`, `demos/NEW_DEMO_PROTOCOL.md`, `learnings/`. Do not copy content out of this document; edit the live files instead.

**Goal:** Build a reusable AGENTS.md, template, tracking, and learning-pool system for payment demo development.

**Architecture:** `AGENTS.md` is the canonical rule source. `CLAUDE.md` files are thin wrappers. Demo-specific requirements live in demo docs and plans; long-lived guardrails live in local AGENTS.md files. Reusable knowledge is promoted from demo tracking files into a root learning pool.

**Tech Stack:** Markdown, AGENTS.md, CLAUDE.md wrapper files, shell verification, optional future hooks or validation scripts.

---

## Files To Create

```text
AGENTS.md
CLAUDE.md

demos/AGENTS.md
demos/CLAUDE.md
demos/NEW_DEMO_PROTOCOL.md

demos/_templates/simple-demo/DEMO.md
demos/_templates/simple-demo/tracking/test-cases.md

demos/_templates/standard-demo/AGENTS.md
demos/_templates/standard-demo/CLAUDE.md
demos/_templates/standard-demo/DEMO.md
demos/_templates/standard-demo/DESIGN.md
demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md
demos/_templates/standard-demo/tracking/todos.md
demos/_templates/standard-demo/tracking/progress.md
demos/_templates/standard-demo/tracking/debug.md
demos/_templates/standard-demo/tracking/test-cases.md
demos/_templates/standard-demo/tracking/learnings.md

demos/_templates/complex-demo/AGENTS.md
demos/_templates/complex-demo/CLAUDE.md
demos/_templates/complex-demo/DEMO.md
demos/_templates/complex-demo/DESIGN.md
demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md
demos/_templates/complex-demo/tracking/todos.md
demos/_templates/complex-demo/tracking/progress.md
demos/_templates/complex-demo/tracking/debug.md
demos/_templates/complex-demo/tracking/test-cases.md
demos/_templates/complex-demo/tracking/learnings.md

learnings/AGENTS.md
learnings/CLAUDE.md
learnings/INDEX.md
learnings/_template.md
learnings/payment/.gitkeep
learnings/frontend/.gitkeep
learnings/backend/.gitkeep
learnings/mobile/.gitkeep
learnings/demo-ops/.gitkeep

scripts/check-agent-system.sh
```

## Task 1: Create Root Agent Rules

**Files:**

- Create: `AGENTS.md`
- Create: `CLAUDE.md`

- [ ] **Step 1: Create `AGENTS.md` with repo-wide rules**

Use this content:

```md
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

- When PayPal or Stripe integration details matter, resolve the payment wiki through repository-root `KNOWLEDGE_SOURCES.md`.
- Before using the payment wiki, read and follow the local instructions identified by `KNOWLEDGE_SOURCES.md`.
- Extract relevant conclusions into `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, or learning entries. Do not paste large wiki sections into AGENTS.md.

## Instruction Maintenance

- Keep AGENTS.md short and high-signal.
- Add a root rule only when removing it would likely cause repeated agent mistakes.
- If a rule is local to demos, put it under `demos/AGENTS.md`.
- If a rule is local to one demo, put it under that demo's AGENTS.md after planning.
- Treat instruction files like code: review, prune, and update them when behavior proves a rule is missing or stale.
```

- [ ] **Step 2: Create Claude wrapper**

Create `CLAUDE.md`:

```md
See @AGENTS.md for shared agent instructions.
```

- [ ] **Step 3: Verify root files**

Run:

```bash
test -f AGENTS.md && test -f CLAUDE.md && grep -q "Payment Demo Pool Agent Rules" AGENTS.md && grep -q "@AGENTS.md" CLAUDE.md
```

Expected: command exits with status `0`.

## Task 2: Create Demo Lifecycle Rules

**Files:**

- Create: `demos/AGENTS.md`
- Create: `demos/CLAUDE.md`
- Create: `demos/NEW_DEMO_PROTOCOL.md`

- [ ] **Step 1: Create `demos/AGENTS.md`**

Use this content:

```md
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
- Resolve the payment wiki through repository-root `KNOWLEDGE_SOURCES.md` for PayPal or Stripe details when relevant.
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
```

- [ ] **Step 2: Create `demos/CLAUDE.md`**

Use this content:

```md
See @AGENTS.md for shared demo-development instructions.
```

- [ ] **Step 3: Create `demos/NEW_DEMO_PROTOCOL.md`**

Use this content:

```md
# New Demo Protocol

When the user starts a new demo:

1. Do not create code immediately.
2. Use brainstorming to clarify the demo purpose, audience, business scenario, PSP products, target platforms, and initial UI direction.
3. Classify the demo as simple, standard, or complex.
4. For PayPal or Stripe details, resolve the payment wiki through repository-root `KNOWLEDGE_SOURCES.md` after reading that wiki's local instructions.
5. Select the matching template from `demos/_templates/`.
6. Create the new demo directory under `demos/<demo-name>/`.
7. Fill `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md` from confirmed decisions.
8. Generate the local `AGENTS.md` only after stable guardrails are known.
9. Create tracking files before implementation.
10. Add TDD and verification strategy before coding.
11. Implement task by task.
12. Update tracking files after each task.
13. At milestones, promote reusable lessons into `learnings/` and update `learnings/INDEX.md`.
```

- [ ] **Step 4: Verify demo lifecycle files**

Run:

```bash
test -f demos/AGENTS.md && test -f demos/CLAUDE.md && test -f demos/NEW_DEMO_PROTOCOL.md && grep -q "Complex Demo Lifecycle" demos/AGENTS.md
```

Expected: command exits with status `0`.

## Task 3: Create Demo Templates

**Files:**

- Create all files under `demos/_templates/simple-demo/`
- Create all files under `demos/_templates/standard-demo/`
- Create all files under `demos/_templates/complex-demo/`

- [ ] **Step 1: Create simple demo template**

Create `demos/_templates/simple-demo/DEMO.md`:

```md
# {{DEMO_NAME}}

## Audience

{{PRIMARY_AUDIENCE}}

## Purpose

{{DEMO_PURPOSE}}

## Payment Products

{{PAYMENT_PRODUCTS}}

## Run Instructions

Open the demo HTML file in a browser, or follow the local run command documented in this demo after creation.

## Verification

See `tracking/test-cases.md`.
```

Create `demos/_templates/simple-demo/tracking/test-cases.md`:

```md
# Test Cases

## Manual Verification

- [ ] Open the demo successfully.
- [ ] Complete the primary demo scenario.
- [ ] Confirm customer-facing text is accurate and does not make unsupported PSP claims.
```

- [ ] **Step 2: Create standard demo template**

Create these files:

```text
demos/_templates/standard-demo/AGENTS.md
demos/_templates/standard-demo/CLAUDE.md
demos/_templates/standard-demo/DEMO.md
demos/_templates/standard-demo/DESIGN.md
demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md
demos/_templates/standard-demo/tracking/todos.md
demos/_templates/standard-demo/tracking/progress.md
demos/_templates/standard-demo/tracking/debug.md
demos/_templates/standard-demo/tracking/test-cases.md
demos/_templates/standard-demo/tracking/learnings.md
```

Create `demos/_templates/standard-demo/AGENTS.md`:

```md
# {{DEMO_NAME}} Agent Rules

## Role

This file contains long-lived guardrails for this demo. Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.

## Guardrails

- Preserve the confirmed demo purpose and audience.
- Ask before changing payment-flow semantics.
- Update `DEMO.md`, `DESIGN.md`, and `tracking/test-cases.md` when payment behavior changes.
- Verify affected behavior before reporting completion.
```

Create `demos/_templates/standard-demo/CLAUDE.md`:

```md
See @AGENTS.md for this demo's shared agent instructions.
```

Create `demos/_templates/standard-demo/DEMO.md`:

```md
# {{DEMO_NAME}}

## Audience

{{PRIMARY_AUDIENCE}}

## Business Scenario

{{BUSINESS_SCENARIO}}

## Payment Products

{{PAYMENT_PRODUCTS}}

## Supported Flows

{{SUPPORTED_FLOWS}}

## Demo Boundaries

- This is a demo, not a production compliance reference.
- Product behavior should be verified against current PSP documentation before customer delivery.

## Runbook

{{RUNBOOK}}

## Verification Checklist

{{VERIFICATION_CHECKLIST}}
```

Create `demos/_templates/standard-demo/DESIGN.md`:

```md
# {{DEMO_NAME}} Design

## UX Goal

{{UX_GOAL}}

## Main Screens

{{MAIN_SCREENS}}

## Interaction Model

{{INTERACTION_MODEL}}

## Visual Direction

{{VISUAL_DIRECTION}}

## Architecture

{{ARCHITECTURE}}

## Open Decisions

Decisions should be resolved before implementation starts.
```

Create `demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md`:

```md
# {{DEMO_NAME}} Implementation Plan

## Goal

{{IMPLEMENTATION_GOAL}}

## Scope

{{IMPLEMENTATION_SCOPE}}

## Test Strategy

- Unit tests: {{UNIT_TEST_STRATEGY}}
- Integration tests: {{INTEGRATION_TEST_STRATEGY}}
- UI tests: {{UI_TEST_STRATEGY}}
- Manual sandbox verification: {{MANUAL_VERIFICATION_STRATEGY}}

## Tasks

Tasks should be written as checkbox steps before implementation starts.
```

Create tracking files:

```md
# Todos

- [ ] Confirm implementation plan.
- [ ] Confirm test strategy.
```

```md
# Progress

## Milestones

- Project created from standard demo template.
```

```md
# Debug Log

Record bugs, root cause, fix, and verification.
```

```md
# Test Cases

## Acceptance Criteria

- [ ] Demo can run locally.
- [ ] Primary payment scenario can be verified.
- [ ] Customer-facing text avoids unsupported PSP claims.
```

```md
# Learnings

Record local lessons during development. Promote reusable lessons to the root `learnings/` pool at milestones.
```

- [ ] **Step 3: Create complex demo template**

Copy the standard template structure, then extend these files:

`demos/_templates/complex-demo/DEMO.md` must include:

```md
## Payment Flow Map

### {{PAYMENT_FLOW_NAME}}

Entry point: {{FLOW_ENTRY_POINT}}
Frontend SDK or UI layer: {{FRONTEND_PAYMENT_LAYER}}
Backend APIs: {{BACKEND_PAYMENT_APIS}}
Stored state: {{STORED_STATE}}
Verification: {{FLOW_VERIFICATION}}
```

`demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md` must include:

```md
## Platform Plan

- Web: {{WEB_PLAN}}
- Backend: {{BACKEND_PLAN}}
- Database: {{DATABASE_PLAN}}
- iOS: {{IOS_PLAN}}
- Android: {{ANDROID_PLAN}}

## Subagent Expansion Areas

- Frontend review
- Backend/payment review
- Database review
- Mobile review
- UX review
- Test-case review
```

`demos/_templates/complex-demo/AGENTS.md` must include:

```md
## Ask Before Changing

- Subscription lifecycle.
- Vaulting semantics.
- Saved-payment semantics.
- Auto-charge behavior.
- Retry, cancellation, refund, capture, authorization, or settlement behavior.
- Platform parity between web, iOS, and Android.
```

- [ ] **Step 4: Verify template files**

Run:

```bash
test -f demos/_templates/simple-demo/DEMO.md && test -f demos/_templates/standard-demo/DEMO.md && test -f demos/_templates/complex-demo/DEMO.md && grep -q "Payment Flow Map" demos/_templates/complex-demo/DEMO.md
```

Expected: command exits with status `0`.

## Task 4: Create Learning Pool

**Files:**

- Create: `learnings/AGENTS.md`
- Create: `learnings/CLAUDE.md`
- Create: `learnings/INDEX.md`
- Create: `learnings/_template.md`
- Create category directories under `learnings/`

- [ ] **Step 1: Create `learnings/AGENTS.md`**

Use this content:

```md
# Learning Pool Rules

## Purpose

This directory stores reusable lessons learned from payment demo development. Raw notes belong in each demo's `tracking/learnings.md`. Only reusable, reviewed lessons belong here.

## Search Rules

- Before solving a difficult payment, PSP, architecture, mobile, or demo-ops problem, search `learnings/INDEX.md`.
- Then search this directory with relevant keywords.
- Follow `[[source]]` links when the origin matters.

## Add Rules

- Add a learning only when it is reusable across demos or important for future maintenance.
- Include source links using `[[...]]`.
- Prefer one focused lesson per file.
- Do not add secrets, merchant credentials, private customer data, or unsupported PSP claims.

## Category Rules

- Use the existing categories when they fit: `payment`, `frontend`, `backend`, `mobile`, and `demo-ops`.
- If a reusable learning does not fit any existing category, create a clear new category folder.
- Update `INDEX.md` whenever a new category is created.
- Avoid a permanent `misc` category. If the lesson is too unclear to categorize, keep it in the source demo's `tracking/learnings.md` until it becomes clearer.
- Update `scripts/check-agent-system.sh` only when a new category becomes a required baseline category for this repo.

## Update Rules

- Update an existing learning when new information refines the same lesson.
- Keep source links current.
- If the old lesson is no longer correct, mark it as superseded instead of silently deleting it.

## Delete Rules

- Do not delete learning entries casually.
- Prefer marking entries as `Deprecated` or `Superseded`.
- Delete only duplicate, empty, or clearly incorrect entries after preserving useful source links.

## Index Rules

- Every learning entry must be listed in `INDEX.md`.
- Use concise summaries and clear categories.
```

- [ ] **Step 2: Create `learnings/CLAUDE.md`**

Use this content:

```md
See @AGENTS.md for shared learning-pool instructions.
```

- [ ] **Step 3: Create `learnings/INDEX.md`**

Use this content:

```md
# Learning Pool Index

## Payment

Reusable payment-flow, PSP, vaulting, saved-payment, authorization, capture, webhook, subscription, and checkout lessons.

## Frontend

Reusable web UI, checkout UI, shadcn, React, accessibility, and browser verification lessons.

## Backend

Reusable Node.js, API, webhook, environment, logging, and server verification lessons.

## Mobile

Reusable iOS, Android, React Native, simulator, emulator, and mobile payment verification lessons.

## Demo Operations

Reusable planning, customer-facing presentation, sales enablement, tracking, and demo maintenance lessons.

## Category Growth

If a reusable lesson does not fit the current categories, create a clear new category folder and add a matching heading here. Avoid a permanent `misc` category; unclear or temporary lessons should stay in the source demo's `tracking/learnings.md` until they are ready to promote.
```

- [ ] **Step 4: Create `learnings/_template.md`**

Use this content:

```md
# {{LEARNING_TITLE}}

## Summary

{{SUMMARY}}

## Applies To

- {{APPLIES_TO}}

## Lesson

{{LESSON}}

## Source

- [[{{SOURCE_PATH}}]]

## Related

- [[{{RELATED_PATH}}]]

## Status

Active
```

- [ ] **Step 5: Create category directories**

Run:

```bash
mkdir -p learnings/payment learnings/frontend learnings/backend learnings/mobile learnings/demo-ops
touch learnings/payment/.gitkeep learnings/frontend/.gitkeep learnings/backend/.gitkeep learnings/mobile/.gitkeep learnings/demo-ops/.gitkeep
```

Expected: directories and `.gitkeep` files exist.

## Task 5: Add Structural Verification Script

**Files:**

- Create: `scripts/check-agent-system.sh`

- [ ] **Step 1: Create script directory**

Run:

```bash
mkdir -p scripts
```

- [ ] **Step 2: Create `scripts/check-agent-system.sh`**

Use this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "AGENTS.md"
  "CLAUDE.md"
  "demos/AGENTS.md"
  "demos/CLAUDE.md"
  "demos/NEW_DEMO_PROTOCOL.md"
  "demos/_templates/simple-demo/DEMO.md"
  "demos/_templates/simple-demo/tracking/test-cases.md"
  "demos/_templates/standard-demo/AGENTS.md"
  "demos/_templates/standard-demo/CLAUDE.md"
  "demos/_templates/standard-demo/DEMO.md"
  "demos/_templates/standard-demo/DESIGN.md"
  "demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md"
  "demos/_templates/standard-demo/tracking/todos.md"
  "demos/_templates/standard-demo/tracking/progress.md"
  "demos/_templates/standard-demo/tracking/debug.md"
  "demos/_templates/standard-demo/tracking/test-cases.md"
  "demos/_templates/standard-demo/tracking/learnings.md"
  "demos/_templates/complex-demo/AGENTS.md"
  "demos/_templates/complex-demo/CLAUDE.md"
  "demos/_templates/complex-demo/DEMO.md"
  "demos/_templates/complex-demo/DESIGN.md"
  "demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md"
  "demos/_templates/complex-demo/tracking/todos.md"
  "demos/_templates/complex-demo/tracking/progress.md"
  "demos/_templates/complex-demo/tracking/debug.md"
  "demos/_templates/complex-demo/tracking/test-cases.md"
  "demos/_templates/complex-demo/tracking/learnings.md"
  "learnings/AGENTS.md"
  "learnings/CLAUDE.md"
  "learnings/INDEX.md"
  "learnings/_template.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

grep -q "@AGENTS.md" CLAUDE.md
grep -q "@AGENTS.md" demos/CLAUDE.md
grep -q "@AGENTS.md" learnings/CLAUDE.md
grep -q "Payment Flow Map" demos/_templates/complex-demo/DEMO.md
grep -q "Learning Pool Rules" learnings/AGENTS.md

echo "Agent system structure looks good."
```

- [ ] **Step 3: Make script executable**

Run:

```bash
chmod +x scripts/check-agent-system.sh
```

- [ ] **Step 4: Run verification**

Run:

```bash
./scripts/check-agent-system.sh
```

Expected output:

```text
Agent system structure looks good.
```

## Task 6: Review With Team

**Files:**

- Read: `docs/agent-system/design-plan.md`
- Read: `docs/agent-system/implementation-plan.md`

- [ ] **Step 1: Review design decisions**

Confirm the team agrees with:

- `AGENTS.md` as canonical source.
- `CLAUDE.md` as wrapper.
- Hybrid demo organization.
- Simple, standard, complex demo levels.
- `wiki-v2` as a knowledge source.
- TDD before implementation.
- Learning pool with `INDEX.md` and `[[link]]` sources.

- [ ] **Step 2: Review operational weight**

Confirm whether every complex demo should require:

- `DEMO.md`
- `DESIGN.md`
- `IMPLEMENTATION_PLAN.md`
- local `AGENTS.md`
- tracking files
- learning promotion at milestones

- [ ] **Step 3: Accept or revise**

If the team accepts the plan, implement Tasks 1 through 5.

If the team wants changes, update `docs/agent-system/design-plan.md` first, then revise this implementation plan to match.

## Self-Review

- Spec coverage: The plan covers root rules, Claude wrapper strategy, demo lifecycle, templates, wiki-v2 usage, TDD, tracking files, learning pool, and verification.
- Placeholder scan: Template tokens use `{{...}}` intentionally because they are template fields for future demo creation.
- Scope check: This plan implements the agent system scaffolding only. It does not create a real payment demo.

# Payment Demo Agent System Design Plan

Date: 2026-05-24

> **Status (2026-06-02): historical design rationale, not a source of truth.** The canonical instruction sources are the live files in the repo: root `AGENTS.md`, `KNOWLEDGE_SOURCES.md`, `demos/AGENTS.md`, `demos/NEW_DEMO_PROTOCOL.md` (canonical new-demo lifecycle), `learnings/AGENTS.md`, and `learnings/INDEX.md`. Where this document restates lifecycle steps, the wiki path, or rule text, the live files win. Kept for the design reasoning.

## Purpose

This document proposes a shared AGENTS.md strategy for a payment demo pool. The repo will be used by an integration engineer to create, compare, and present payment solution demos for customers, sales teams, and internal solution exploration.

The system is designed for demos that range from single HTML pages to complex multi-surface products with web, backend, Supabase, iOS, Android, and multiple PSP integrations.

## Design Goal

The goal is to improve future agent accuracy by giving agents a clear, layered operating system:

- Short durable rules at the root.
- Local rules only where they matter.
- Templates for new demos, so future agents do not rely on memory.
- Tracking files for long-running development.
- A learning pool for reusable lessons across demos.
- A single canonical instruction source shared by Codex, Claude Code, and future agents.

## Core Principle

Do not create one giant instruction file.

Use a hierarchy:

```text
root AGENTS.md
  -> repo-wide identity, operating contract, payment safety rules

demos/AGENTS.md
  -> demo lifecycle, new demo protocol, TDD, tracking rules

demos/<demo-name>/AGENTS.md
  -> long-lived guardrails extracted after planning

demos/<demo-name>/<surface>/AGENTS.md
  -> platform-specific implementation rules when needed

learnings/AGENTS.md
  -> learning pool add, update, deprecate, index, and search rules
```

## Canonical Instruction Strategy

`AGENTS.md` is the canonical source.

`CLAUDE.md` is only a compatibility wrapper for Claude Code:

```md
See @AGENTS.md for shared agent instructions.
```

This keeps Codex, Claude Code, and other agents aligned without maintaining multiple rule sets.

Preferred approach: wrapper files, not symlinks. Wrapper files are easier to inspect, portable across tools, and less surprising for colleagues.

## Root Agent Contract

The root `AGENTS.md` should stay short. It should define durable behavior that applies to every demo.

Recommended sections:

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
- When PayPal or Stripe integration details matter, consult `/Users/tengtao/Development/wiki-v2`.
- Before using `wiki-v2`, read and follow `/Users/tengtao/Development/wiki-v2/AGENTS.md`.
- Extract relevant conclusions into `DEMO.md`, `DESIGN.md`, `IMPLEMENTATION_PLAN.md`, or learning entries. Do not paste large wiki sections into AGENTS.md.

## Instruction Maintenance
- Keep AGENTS.md short and high-signal.
- Add a root rule only when removing it would likely cause repeated agent mistakes.
- If a rule is local to demos, put it under `demos/AGENTS.md`.
- If a rule is local to one demo, put it under that demo's AGENTS.md after planning.
- Treat instruction files like code: review, prune, and update them when behavior proves a rule is missing or stale.
```

This incorporates the practical guidance commonly associated with Karpathy-style and Boris/Anthropic-style agent instruction practices: understand first, plan before major changes, keep rules short, verify before claiming done, and promote repeated mistakes into durable rules.

## Demo Directory Strategy

Recommended initial structure:

```text
demo-projects/
  AGENTS.md
  CLAUDE.md

  docs/
    agent-system/
      design-plan.md
      implementation-plan.md

  demos/
    AGENTS.md
    CLAUDE.md
    NEW_DEMO_PROTOCOL.md
    _templates/
      simple-demo/
      standard-demo/
      complex-demo/

  learnings/
    AGENTS.md
    CLAUDE.md
    INDEX.md
    _template.md
    payment/
    frontend/
    backend/
    mobile/
    demo-ops/
```

## Demo Complexity Levels

### Simple Demo

Use for a single HTML file, a small script, or a narrow PSP behavior demo.

Required files:

- `DEMO.md`
- `tracking/test-cases.md`

### Standard Demo

Use for web plus backend, one PSP flow, or a demo with meaningful state.

Required files:

- `AGENTS.md`
- `CLAUDE.md`
- `DEMO.md`
- `DESIGN.md`
- `IMPLEMENTATION_PLAN.md`
- `tracking/todos.md`
- `tracking/progress.md`
- `tracking/debug.md`
- `tracking/test-cases.md`
- `tracking/learnings.md`

### Complex Demo

Use for multiple PSPs, multiple products, multiple platforms, customer-facing demos, mobile apps, Supabase, subscriptions, vaulting, webhooks, or long-running development.

Required files:

- Everything from standard demo.
- Payment flow map in `DEMO.md`.
- TDD and verification strategy in `IMPLEMENTATION_PLAN.md`.
- Demo-specific guardrails in local `AGENTS.md`, generated after planning.

## New Demo Lifecycle

For complex demos, the intended workflow is:

```text
1. Brainstorm requirements with the user.
2. Clarify purpose, audience, payment products, platforms, and design direction.
3. Consult wiki-v2 for PayPal or Stripe integration details when relevant.
4. Create or update DEMO.md.
5. Create or update DESIGN.md.
6. Create IMPLEMENTATION_PLAN.md.
7. If the user explicitly asks for subagents, dispatch focused planning/review subagents and merge their findings.
8. Run UI/UX review for customer-facing experiences.
9. Add TDD and verification strategy.
10. Create tracking files.
11. Extract long-lived guardrails into demo-level AGENTS.md.
12. Implement task by task.
13. Update tracking files after each completed task.
14. Promote reusable lessons to the root learning pool at milestones.
```

## Requirement Documents vs Agent Rules

Feature requirements belong in:

- `DEMO.md`
- `DESIGN.md`
- `IMPLEMENTATION_PLAN.md`
- `tracking/todos.md`

Agent rules belong in:

- root `AGENTS.md`
- `demos/AGENTS.md`
- `demos/<demo-name>/AGENTS.md`
- `learnings/AGENTS.md`

Demo-level `AGENTS.md` should not be the first place where requirements are written. It should be created or refined after brainstorming and planning, then contain the stable guardrails that future agents must preserve.

Example distinction:

```md
Requirement:
- The demo supports PayPal vaulting and Stripe saved-card payments.

Guardrail:
- Do not mix PayPal vaulting semantics with Stripe saved-card semantics.
```

## Template Strategy

Templates are required because future agents should not rely on memory of this conversation.

Recommended template folders:

```text
demos/_templates/simple-demo/
demos/_templates/standard-demo/
demos/_templates/complex-demo/
```

Each template should contain ready-to-fill Markdown files. Template fields should use double braces, for example:

```md
{{DEMO_NAME}}
{{PRIMARY_AUDIENCE}}
{{PAYMENT_PRODUCTS}}
{{TARGET_PLATFORMS}}
```

These template tokens are intentional and should be resolved when a real demo is created.

## TDD Strategy

TDD should enter after design and planning, before implementation.

For each implementation task:

```text
1. Define expected behavior.
2. Add or update a test case in tracking/test-cases.md.
3. Write an automated test first when practical.
4. If automation is not practical, define a manual verification step before coding.
5. Implement the smallest change needed.
6. Run the relevant verification.
7. Update tracking/todos.md, tracking/progress.md, tracking/debug.md, tracking/test-cases.md, and tracking/learnings.md when relevant.
```

Payment demos often require both automated and manual verification. Manual sandbox verification should be treated as a valid test when automation is impractical.

## Subagent Strategy

Subagents are useful for complex demos, but should be invoked only when the user explicitly asks for them or when the environment allows delegated agent work.

Good subagent roles:

- Frontend plan expansion.
- Backend and payment API review.
- Supabase schema review.
- iOS or Android implementation review.
- UX review.
- Edge-case and payment-risk review.
- Test-case review.

The main agent remains responsible for merging outputs into one coherent `IMPLEMENTATION_PLAN.md`.

## UI/UX Review Strategy

For customer-facing or sales-facing demos, UI/UX review should happen before implementation begins.

UX review outputs should update:

- `DESIGN.md`
- `IMPLEMENTATION_PLAN.md`
- `tracking/test-cases.md` when visual or interaction behavior needs verification

UX review should not only judge visual style. It should also check whether the demo communicates the intended payment story clearly to the target audience.

## Knowledge Source Strategy

The user's payment wiki is a reference source:

```text
/Users/tengtao/Development/wiki-v2
```

Rules:

- Use wiki-v2 during discovery, planning, and payment-flow changes.
- Read wiki-v2's local `AGENTS.md` before using wiki files.
- Prefer wiki concepts and analyses over raw scraped files when available.
- Treat wiki content as reference material, not as code to copy blindly.
- For current PSP behavior, verify against official PSP docs when accuracy is high-stakes or likely to have changed.

## Learning Pool Strategy

Each demo records raw lessons locally:

```text
demos/<demo-name>/tracking/learnings.md
```

Reusable lessons are promoted to root:

```text
learnings/
```

The learning pool should have:

- `learnings/AGENTS.md` for add, update, deprecate, delete, search, and index rules.
- `learnings/INDEX.md` as the human and agent entry point.
- One focused learning per file.
- `[[link]]` references back to the source demo, tracking note, wiki page, or related learning.

Starter categories:

```text
learnings/payment/
learnings/frontend/
learnings/backend/
learnings/mobile/
learnings/demo-ops/
```

These categories are not a closed taxonomy. If a reusable learning does not fit any existing category, create a new clear category such as `security`, `analytics`, `performance`, `compliance`, or `ai`, then add that category to `learnings/INDEX.md`.

Avoid a permanent `misc` folder. If a lesson is too unclear to categorize, keep it in the source demo's `tracking/learnings.md` until it becomes clearer. Update `scripts/check-agent-system.sh` only when a new category becomes a required baseline category for the repo.

Example learning entry:

```md
# PayPal Vaulting Requires Clear Separation From One-Time Checkout

## Summary
PayPal vaulting demos should keep saved-payment semantics separate from one-time checkout semantics.

## Applies To
- PayPal vaulting
- Subscription demos
- Auto-charge demos

## Lesson
When a demo supports both one-time checkout and vaulting, the UI, backend routes, and database records should make the distinction explicit.

## Source
- [[demos/ai-subscription/tracking/debug.md]]
- [[demos/ai-subscription/DEMO.md]]
- [[/Users/tengtao/Development/wiki-v2/wiki/concepts/paypal-vault.md]]

## Status
Active
```

## Learning Promotion Flow

```text
tracking/debug.md
  -> tracking/learnings.md
    -> learnings/<category>/<lesson>.md
      -> learnings/INDEX.md
        -> AGENTS.md rule only if repeated mistakes justify a durable guardrail
```

This prevents AGENTS.md from becoming bloated while still preserving institutional memory.

## Why This Should Improve Agent Results

This system improves accuracy by reducing ambiguity:

- Root rules are short and stable.
- Local rules are loaded only when relevant.
- Detailed knowledge lives in wiki-v2, docs, templates, and learning files instead of bloating AGENTS.md.
- New demo creation is template-driven.
- TDD and verification are part of the lifecycle, not an afterthought.
- Learnings become searchable and traceable.

## External References

- OpenAI AGENTS.md project: https://github.com/openai/agents.md
- Anthropic Claude Code best practices: https://code.claude.com/docs/en/best-practices
- Claude Help Center on CLAUDE.md: https://support.claude.com/en/articles/14553240-give-claude-context-claude-md-and-better-prompts

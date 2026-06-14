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

## New Demo Lifecycle
The canonical step-by-step lifecycle lives in `NEW_DEMO_PROTOCOL.md`. Start there. The core rule: start with brainstorming, do not code immediately.

## TDD Rules
- Define expected behavior before implementation.
- Add or update `tracking/test-cases.md` for each meaningful task.
- Write automated tests first when practical.
- If automation is not practical, define manual verification before coding.
- Do not report completion until verification is run or the blocker is documented.

## Milestone Close Gates
- For user-facing UI, rendered screens or component shells are not enough to mark a milestone complete.
- Before checking a milestone item as done, every visible user action must be wired to real state/API behavior, disabled with a clear reason, or explicitly recorded as deferred.
- Verify the promised user journey with interaction tests or a manual verification note; render/snapshot tests only prove the shell exists.
- For PSP or wallet UI, verify the hydrated official SDK/provider surface in a browser for each promised placement; branded local buttons or static text are shell progress only.
- For API-backed UI, verify loading, success, and failure states against the backend contract before marking the interaction complete.
- Before moving phases, reconcile `IMPLEMENTATION_TASKS.md` or the active implementation plan with `tracking/test-cases.md`, `tracking/todos.md`, and `tracking/progress.md`.
- If only the visual shell is complete, record it as shell progress and keep the behavior item open.

## Tracking Rules
Each standard or complex demo should maintain (this is the canonical tracking-file list; other files point here):
- `tracking/todos.md`
- `tracking/progress.md`
- `tracking/debug.md`
- `tracking/test-cases.md`
- `tracking/learnings.md`

## Reusable Learnings
- Before solving a difficult payment, PSP, architecture, mobile, or demo-ops problem, search `learnings/INDEX.md` and the `learnings/` pool first.
- Record raw lessons in a demo's `tracking/learnings.md`; promote reusable ones into `learnings/` at milestones. Curation rules live in `learnings/AGENTS.md`.

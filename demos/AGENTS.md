# Demo Development Rules

## Purpose

This directory contains runnable payment demos and their supporting documentation.

## Demo Complexity Levels

### Simple Demo

Single HTML, small script, or narrow PSP behavior demo. Requires `DEMO.md` and `tracking/test-cases.md`.

### Standard Demo

Web plus backend, one PSP flow, or meaningful state. Requires `AGENTS.md`, `CLAUDE.md`, `DEMO.md`, `REQUIREMENTS.md`, `DESIGN.md`, design-system contracts when UI-facing, `IMPLEMENTATION_PLAN.md`, `PLAN.md`, slice charters, and tracking files.

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

## Artifact Authority

- `REQUIREMENTS.md` is the only product-requirement authority for standard and complex demos.
- `DEMO.md` is a derived scenario and supported-flow summary.
- `DESIGN.md` contains the taste brief, approved direction, decision ledger, and links to design-system, page, research, mockup, and state-board contracts.
- `IMPLEMENTATION_PLAN.md` owns architecture, interfaces, traceability, and test/evidence strategy.
- `IMPLEMENTATION_TASKS.md`, slice charters, `PLAN.md`, and tracking files are derived execution views and cannot redefine scope.
- Follow `NEW_DEMO_PROTOCOL.md` for stable identifiers, requirement state/disposition, reviewer independence, skill/model routing, payment knowledge, evidence, and close gates.

## Milestone Close Gates

- For user-facing UI, rendered screens or component shells are not enough to mark a milestone complete.
- For customer-facing or sales-facing UI, the `DESIGN.md` router and linked design-system, typography, component, board, page, mockup/state, responsive, accessibility, and visual-QA contracts must be approved before coding.
- For customer-facing UI polish or redesign, use `ui-ux-pro-max` as a real design retrieval workflow before implementation planning: run the design-system search first, run targeted UX/style/typography/stack searches, and synthesize options or mockups before coding. A valid review must include a priority-ranked design packet (`P0` must fix, `P1` high-impact polish, `P2` refinement) with concrete findings, affected surfaces, recommendations, and inspection criteria; do not satisfy this rule with a generic taste-based paragraph.
- Before closing a frontend slice, verify the touched UI against the design decisions and linked contracts; if the implementation only follows generic styling or shell layout, keep the requirement open.
- Before checking a milestone item as done, every visible user action must be wired to real state/API behavior, disabled with a clear reason, or explicitly recorded as deferred.
- Before moving phases, list every unchecked item in the active and previous milestone and give each one a disposition: complete, deferred, blocked, or removed.
- Deferred milestone items need a reason and next trigger in the active plan or tracking files; they must not disappear just because a later milestone becomes active.
- Verify the promised user journey with interaction tests or a manual verification note; render/snapshot tests only prove the shell exists.
- For PSP or wallet UI, verify the hydrated official SDK/provider surface in a browser for each promised placement; branded local buttons or static text are shell progress only.
- For API-backed UI, verify loading, success, and failure states against the backend contract before marking the interaction complete.
- Broad task labels such as "checkout UI", "cart sync", or "payment integration" do not satisfy user-visible promises unless those promises are decomposed into explicit tasks, tests, and evidence.
- Before moving phases, reconcile `REQUIREMENTS.md` and the active slice charter with implementation tasks, `PLAN.md`, `tracking/test-cases.md`, `tracking/todos.md`, and `tracking/progress.md`.
- If only the visual shell is complete, record it as shell progress and keep the behavior item open.

## Tracking Rules

Each standard or complex demo should maintain (this is the canonical tracking-file list; other files point here):

- `tracking/todos.md`
- `tracking/progress.md`
- `tracking/debug.md`
- `tracking/test-cases.md`
- `tracking/learnings.md`

Tracking status must reference stable requirement, slice, task, test, and evidence identifiers. It never becomes a second requirements register.

## Reusable Learnings

- Before solving a difficult payment, PSP, architecture, mobile, or demo-ops problem, search `learnings/INDEX.md` and the `learnings/` pool first.
- Record raw lessons in a demo's `tracking/learnings.md`; promote reusable ones into `learnings/` at milestones. Curation rules live in `learnings/AGENTS.md`.

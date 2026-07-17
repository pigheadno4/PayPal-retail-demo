# {{DEMO_NAME}} Implementation Plan

## Goal

{{IMPLEMENTATION_GOAL}}

## Scope

{{IMPLEMENTATION_SCOPE}}

Detailed behavioral promises live in `REQUIREMENTS.md`; this section summarizes architecture scope and exclusions without redefining them.

## Test Strategy

- Unit tests: {{UNIT_TEST_STRATEGY}}
- Integration tests: {{INTEGRATION_TEST_STRATEGY}}
- UI tests: {{UI_TEST_STRATEGY}}
- Manual sandbox verification: {{MANUAL_VERIFICATION_STRATEGY}}

## Requirement Traceability Matrix

Complex demos must complete this before implementation starts.

| Requirement | Slice | Design decisions | Implementation tasks | Test cases | Evidence |
| ----------- | ----- | ---------------- | -------------------- | ---------- | -------- |

Broad task labels such as "checkout UI", "cart sync", or "payment integration" are not enough. Split promises in `REQUIREMENTS.md`; tasks only implement inherited requirements from an approved slice.

Future-slice requirements need a valid target slice but no speculative task/test/evidence links before that slice is approved. Active-slice requirements require concrete links in every column.

## Platform Plan

- Web: {{WEB_PLAN}}
- Backend: {{BACKEND_PLAN}}
- Database: {{DATABASE_PLAN}}
- iOS: {{IOS_PLAN}}
- Android: {{ANDROID_PLAN}}

## Agent And Reviewer Strategy

The active slice charter assigns implementers, models, effort, escalation conditions, and independent requirements/design/engineering reviewers. Payment-domain review is a required engineering sub-review for PSP work.

## Milestone Close Gate

- Do not mark rendered UI as completed behavior unless the related user action is verified.
- For each milestone, define which checks prove shell rendering, user interaction, backend/database state, and manual sandbox behavior.
- Evidence ladder: each milestone must name the applicable proof for shell rendering, user interaction, backend/database state, PSP/browser SDK evidence, and failure-state evidence.
- If a promised behavior lacks an evidence rung, keep that task open or mark it explicitly deferred.
- For PSP/wallet UI, include browser evidence for official hydrated SDK/provider surfaces in each promised placement.
- For API-backed UI, include loading, success, and failure-state verification against the backend contract.
- For multi-step UI, keep a state contract or mockup aligned with implementation and test cases.
- Require zero unresolved Critical or Important review findings; every Minor finding needs an explicit accepted disposition.
- Payment and checkout milestones must verify buyer-visible behavior and stored state when applicable.
- Keep `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` aligned before moving phases.

## Tasks

Tasks should be written as checkbox steps before implementation starts.

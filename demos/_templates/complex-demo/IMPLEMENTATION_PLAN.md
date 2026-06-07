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

## Milestone Close Gate
- Do not mark rendered UI as completed behavior unless the related user action is verified.
- For each milestone, define which checks prove shell rendering, user interaction, backend/database state, and manual sandbox behavior.
- Payment and checkout milestones must verify buyer-visible behavior and stored state when applicable.
- Keep `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` aligned before moving phases.

## Tasks
Tasks should be written as checkbox steps before implementation starts.

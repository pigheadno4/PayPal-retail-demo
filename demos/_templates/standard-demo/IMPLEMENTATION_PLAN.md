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

## Requirement Traceability Checklist

Before implementation starts, confirm each important buyer-visible, operator-visible, or payment-critical promise has:

- a source doc section
- an implementation task
- a test case or manual verification row
- an evidence type

Use a full traceability matrix if the demo grows into complex-demo scope.

## Milestone Close Gate
- Do not mark rendered UI as completed behavior unless the related user action is verified.
- For each milestone, define which checks prove shell rendering, user interaction, backend state, and manual sandbox behavior.
- For PSP/wallet UI, include browser evidence for official hydrated SDK/provider surfaces in each promised placement.
- For API-backed UI, include loading, success, and failure-state verification against the backend contract.
- For multi-step UI, keep a state contract or mockup aligned with implementation and test cases.
- Keep `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` aligned before moving phases.

## Tasks
Tasks should be written as checkbox steps before implementation starts.

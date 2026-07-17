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

Before implementation starts, every active-slice requirement must have concrete links. Future-slice requirements need a valid target slice but no speculative task/test/evidence links.

| Requirement | Slice | Design decisions | Tasks | Test cases | Evidence |
| ----------- | ----- | ---------------- | ----- | ---------- | -------- |

Use a full traceability matrix if the demo grows into complex-demo scope.

## Milestone Close Gate

- Do not mark rendered UI as completed behavior unless the related user action is verified.
- For each milestone, define which checks prove shell rendering, user interaction, backend state, and manual sandbox behavior.
- For PSP/wallet UI, include browser evidence for official hydrated SDK/provider surfaces in each promised placement.
- For API-backed UI, include loading, success, and failure-state verification against the backend contract.
- For multi-step UI, keep the registered page/state/mockup contracts aligned with implementation and test cases.
- Require independent requirements, design-fidelity when applicable, and engineering review assignments from the active slice charter.
- Payment-domain review is part of the engineering lane for PSP work.
- Keep `tracking/todos.md`, `tracking/test-cases.md`, and `tracking/progress.md` aligned before moving phases.

## Tasks

Tasks should be written as checkbox steps before implementation starts.

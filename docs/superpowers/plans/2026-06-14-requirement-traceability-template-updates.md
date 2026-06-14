# Requirement Traceability Template Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the demo protocol, demo agent rules, and standard/complex demo templates so future projects preserve kickoff requirements as explicit tasks, tests, evidence, and close gates.

**Architecture:** Keep the durable rule in `demos/NEW_DEMO_PROTOCOL.md`, the short behavioral reminder in `demos/AGENTS.md`, and executable blanks in standard/complex templates. Complex demos get required traceability language; standard demos get lighter guidance. Simple templates remain unchanged.

**Tech Stack:** Markdown documentation, existing demo templates, `scripts/check-agent-system.sh`, `rg`, and git.

---

### Task 1: Update Protocol And Demo-Wide Agent Rule

**Files:**
- Modify: `demos/NEW_DEMO_PROTOCOL.md`
- Modify: `demos/AGENTS.md`
- Reference: `docs/agent-system/requirement-traceability-design.md`

- [ ] **Step 1: Add traceability to the new-demo lifecycle**

  In `demos/NEW_DEMO_PROTOCOL.md`, add a required step after the source docs are filled and before tracking/test strategy. Use this wording:

  ```markdown
  For standard and complex demos, run a requirement traceability pass before implementation planning. Map every important buyer-visible, operator-visible, or payment-critical promise to its source doc section, implementation task, test case, and evidence type. Complex demos must keep this matrix in `IMPLEMENTATION_PLAN.md`; standard demos may use a shorter checklist.
  ```

- [ ] **Step 2: Keep numbering coherent**

  Renumber the lifecycle so the traceability step sits before TDD/verification strategy. The later implementation/tracking/milestone-close steps must still appear in order.

- [ ] **Step 3: Add one short rule to `demos/AGENTS.md`**

  In the `Milestone Close Gates` section, add:

  ```markdown
  - Broad task labels such as "checkout UI", "cart sync", or "payment integration" do not satisfy user-visible promises unless those promises are decomposed into explicit tasks, tests, and evidence.
  ```

- [ ] **Step 4: Verify protocol wording**

  Run:

  ```bash
  rg -n "requirement traceability|Broad task labels|source doc section|evidence type" demos/NEW_DEMO_PROTOCOL.md demos/AGENTS.md
  ```

  Expected: matches in both files, with no duplicate or contradictory lifecycle text.

### Task 2: Update Complex Demo Template

**Files:**
- Modify: `demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md`
- Modify: `demos/_templates/complex-demo/DESIGN.md`
- Modify: `demos/_templates/complex-demo/tracking/test-cases.md`
- Modify: `demos/_templates/complex-demo/tracking/todos.md`
- Modify: `demos/_templates/complex-demo/AGENTS.md`

- [ ] **Step 1: Add required traceability matrix to complex implementation plan**

  In `demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md`, add this section after `## Test Strategy`:

  ```markdown
  ## Requirement Traceability Matrix

  Complex demos must complete this before implementation starts.

  | Promise | Source Doc Section | Implementation Task | Test Case | Evidence Type |
  | --- | --- | --- | --- | --- |
  | Primary buyer-visible promise | `DEMO.md` or `DESIGN.md` section | Milestone/task checkbox | `tracking/test-cases.md` row | Shell, interaction, backend, PSP/browser, or failure evidence |

  Broad task labels such as "checkout UI", "cart sync", or "payment integration" are not enough. Split them into independently verifiable promises or list explicit sub-checks.
  ```

- [ ] **Step 2: Add evidence ladder to complex implementation plan**

  In the existing `## Milestone Close Gate` section of `demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md`, add:

  ```markdown
  - Each milestone must name the applicable evidence ladder: shell rendering, user interaction, backend/database state, PSP/browser SDK evidence, and failure-state evidence.
  - If a promised behavior lacks an evidence rung, keep that task open or mark it explicitly deferred.
  ```

- [ ] **Step 3: Add UX state contract guidance to complex design template**

  In `demos/_templates/complex-demo/DESIGN.md`, add this section after `## Interaction Model`:

  ```markdown
  ## UX State Contracts And Mockups

  Required for multi-step UI, payment flows, cart/minicart interactions, account flows, admin lifecycle flows, or PSP SDK surface placement.

  Capture:

  - initial state
  - allowed transitions
  - loading, success, failure, retry, blocked, and ineligible states
  - expanded versus collapsed sections
  - edit behavior
  - backend or SDK unavailable behavior
  - mobile sticky or responsive behavior when applicable

  Use virtual mockups during planning when the interaction is easier to understand visually. Keep mockups aligned with `IMPLEMENTATION_PLAN.md` and `tracking/test-cases.md`.
  ```

- [ ] **Step 4: Add traceability checks to complex test template**

  In `demos/_templates/complex-demo/tracking/test-cases.md`, add these acceptance criteria:

  ```markdown
  - [ ] Requirement traceability matrix maps each important promise to a source doc, implementation task, test case, and evidence type.
  - [ ] Each milestone identifies the applicable evidence ladder: shell, interaction, backend/database, PSP/browser, and failure-state evidence.
  - [ ] Multi-step UI state contracts or virtual mockups are linked from the related test cases.
  ```

- [ ] **Step 5: Add traceability planning todo to complex todo template**

  In `demos/_templates/complex-demo/tracking/todos.md`, add:

  ```markdown
  - [ ] Complete requirement traceability matrix before implementation planning.
  - [ ] Complete UX state contract or virtual mockup for each multi-step UI/payment flow before coding it.
  - [ ] Define evidence ladder for each milestone before implementation starts.
  ```

- [ ] **Step 6: Add local complex template guardrail**

  In `demos/_templates/complex-demo/AGENTS.md`, add:

  ```markdown
  - Broad task labels do not close user-visible promises; each promise needs a task, test, and evidence type or an explicit deferral.
  ```

- [ ] **Step 7: Verify complex template coverage**

  Run:

  ```bash
  rg -n "Requirement Traceability Matrix|Evidence ladder|UX State Contracts|Broad task labels|virtual mockup" demos/_templates/complex-demo
  ```

  Expected: matches in `IMPLEMENTATION_PLAN.md`, `DESIGN.md`, `tracking/test-cases.md`, `tracking/todos.md`, and `AGENTS.md`.

### Task 3: Update Standard Demo Template With Lighter Guidance

**Files:**
- Modify: `demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md`
- Modify: `demos/_templates/standard-demo/DESIGN.md`
- Modify: `demos/_templates/standard-demo/tracking/test-cases.md`
- Modify: `demos/_templates/standard-demo/tracking/todos.md`
- Modify: `demos/_templates/standard-demo/AGENTS.md`

- [ ] **Step 1: Add lightweight traceability checklist to standard implementation plan**

  In `demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md`, add this section after `## Test Strategy`:

  ```markdown
  ## Requirement Traceability Checklist

  Before implementation starts, confirm each important buyer-visible, operator-visible, or payment-critical promise has:

  - a source doc section
  - an implementation task
  - a test case or manual verification row
  - an evidence type

  Use a full traceability matrix if the demo grows into complex-demo scope.
  ```

- [ ] **Step 2: Add lightweight UX state guidance to standard design template**

  In `demos/_templates/standard-demo/DESIGN.md`, add this section after `## Interaction Model`:

  ```markdown
  ## UX State Contracts And Mockups

  For multi-step UI or PSP SDK placement, define the expected states before coding: initial, loading, success, failure, retry, blocked, and completion states.

  Use virtual mockups when the interaction is easier to validate visually, and keep them aligned with tests.
  ```

- [ ] **Step 3: Add standard test criteria**

  In `demos/_templates/standard-demo/tracking/test-cases.md`, add:

  ```markdown
  - [ ] Important promises are mapped to a task, test or manual verification row, and evidence type.
  - [ ] Multi-step UI or PSP SDK placement has state guidance or mockup coverage before implementation.
  ```

- [ ] **Step 4: Add standard planning todos**

  In `demos/_templates/standard-demo/tracking/todos.md`, add:

  ```markdown
  - [ ] Confirm requirement traceability checklist before coding.
  - [ ] Define UX state guidance or mockup coverage for multi-step UI or PSP SDK placement.
  ```

- [ ] **Step 5: Add local standard template guardrail**

  In `demos/_templates/standard-demo/AGENTS.md`, add:

  ```markdown
  - Broad task labels should be decomposed when they hide user-visible promises; keep missing behavior open or explicitly deferred.
  ```

- [ ] **Step 6: Verify standard template coverage**

  Run:

  ```bash
  rg -n "Requirement Traceability|traceability checklist|UX State Contracts|Broad task labels|virtual mockups" demos/_templates/standard-demo
  ```

  Expected: matches in `IMPLEMENTATION_PLAN.md`, `DESIGN.md`, `tracking/test-cases.md`, `tracking/todos.md`, and `AGENTS.md`.

### Task 4: Final Validation And Commit

**Files:**
- Verify: all files modified by Tasks 1-3

- [ ] **Step 1: Run whitespace and instruction validation**

  Run:

  ```bash
  git diff --check
  scripts/check-agent-system.sh
  ```

  Expected:

  ```text
  Agent system structure looks good.
  ```

- [ ] **Step 2: Confirm simple templates remain unchanged**

  Run:

  ```bash
  git diff -- demos/_templates/simple-demo
  ```

  Expected: no output.

- [ ] **Step 3: Review final diff**

  Run:

  ```bash
  git diff -- demos/NEW_DEMO_PROTOCOL.md demos/AGENTS.md demos/_templates/standard-demo demos/_templates/complex-demo
  ```

  Expected: only protocol, standard-template, complex-template, and demo-agent-rule updates matching the approved traceability design.

- [ ] **Step 4: Commit the template updates**

  Run:

  ```bash
  git add demos/NEW_DEMO_PROTOCOL.md demos/AGENTS.md demos/_templates/standard-demo demos/_templates/complex-demo
  git commit -m "Add requirement traceability to demo templates"
  ```

  Expected: a commit containing only the protocol, demo rule, and template updates.

---

## Self-Review

- Spec coverage: The plan implements all three approved layers: protocol, templates, and agent rules. It covers full complex-demo guidance, lighter standard-demo guidance, and leaves simple demos unchanged.
- Unresolved-marker scan: Executable snippets are concrete and complete.
- Scope check: This is a single docs/template update plan; it does not touch PayPal recovery implementation code.

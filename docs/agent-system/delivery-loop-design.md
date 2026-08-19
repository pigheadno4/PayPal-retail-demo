# Reusable Demo Delivery Loop Design

Date: 2026-08-16

Status: approved for implementation by the user, 2026-08-16

## Purpose

Define a reusable, budget-bounded delivery loop for future payment demos. The loop turns an approved slice into small tasks, plans and critiques each task, implements it, independently reviews it, and stops at user-controlled milestones.

This design extends `demos/NEW_DEMO_PROTOCOL.md`. It does not replace that protocol or restructure the approved requirements, design decisions, mockups, plans, slices, tracking history, or implementation already present in a demo.

## Boundary

The first version is intentionally small:

- six reusable role skills
- one orchestrator-owned state machine
- task plans with no more than five acceptance criteria
- two independent reviewer agents covering the existing review concerns
- bounded plan and implementation revision loops
- conditional visual evidence for frontend work
- explicit user gates before implementation, slice acceptance, pull-request creation, and merge

It does not introduce a workflow service, database, dashboard, autonomous merge, or replacement project-management system.

## Authority Model

The loop is an execution mechanism, not a new product authority.

Authority remains:

1. `REQUIREMENTS.md` owns product promises.
2. `DESIGN.md` and its linked design-system, page-contract, research, and mockup records own approved design decisions.
3. `IMPLEMENTATION_PLAN.md` owns architecture, interfaces, traceability, tests, and evidence strategy.
4. Approved slice charters own the bounded milestone.
5. Task plans and loop tracking are derived execution views.
6. Knowledge and learning files retain findings but cannot override the payment wiki, current official provider evidence, or approved requirements.

When derived files disagree with a canonical artifact, the orchestrator stops and requests reconciliation. It must not silently choose the weaker or newer file.

## Reusable And Demo-Local Files

### Repository-wide reusable engine

```text
.agents/skills/
  orchestrator/SKILL.md
  planner/SKILL.md
  plan-critic/SKILL.md
  executor/SKILL.md
  reviewer/SKILL.md
  budget-guard/SKILL.md
```

The skills contain only reusable role behavior and structured input/output contracts. Detailed schemas or examples may live one level below their skill in `references/` when needed.

### Demo-local configuration and state

```text
<demo>/
  workflow/
    CONFIG.yaml
    CONSTRAINTS.md
  ROADMAP.md
  knowledge/
    INDEX.md
    findings/
    fixes/
  tracking/
    loop-state.json
    loop-budget.json
    loop-log.jsonl
    tasks/
      TASK-NNNN/
        plan.md
        execution.md
        review-spec.md
        review-quality.md
```

Demo-local files configure the reusable engine without changing it for every project. Existing canonical tracking Markdown files remain authoritative for their current concerns. The loop files add machine-readable execution state and link back to stable `REQ-*`, `DESIGN-*`, `SLICE-*`, `TASK-*`, `TC-*`, and `EVID-*` identifiers.

`ROADMAP.md` is a derived goal and milestone view. It must link to requirements and slices and must not become a second requirement register.

## Constraints-First Startup

At the beginning of every loop run, the orchestrator loads, in order:

1. repository and demo `AGENTS.md`
2. `<demo>/workflow/CONSTRAINTS.md`
3. `<demo>/workflow/CONFIG.yaml`
4. canonical requirements, design, implementation plan, and active slice charter
5. loop state and budget
6. applicable task, evidence, and knowledge records

`CONSTRAINTS.md` contains hard denials and inspection standards that must be visible before delegation. Examples include no secret exposure, no invented PSP behavior, no unapproved scope change, no destructive migration, and no completion claim without required evidence.

## Task Size Rule

Each task has at most five independently testable acceptance criteria.

The planner must split a proposed task when:

- it needs more than five acceptance criteria
- it crosses unrelated frontend, backend, database, or provider ownership boundaries
- it cannot be implemented and independently reviewed as one coherent change
- it mixes a discovery decision with implementation
- its evidence cannot be attributed to one result

Splitting is not allowed to narrow or defer a requirement. Every child task retains links to its governing requirement, owning slice, tests, evidence, design decisions, and explicit non-goals.

## Roles

### Orchestrator

- loads constraints first
- is the only role allowed to update loop state or budget state
- prepares bounded role briefs and dispatches agents sequentially
- verifies structured role outputs before accepting them
- enforces user gates, round limits, same-commit review, and canonical reconciliation
- never self-approves a role result on behalf of the assigned independent reviewer

### Planner

- plans one approved task without changing its scope
- writes no production code
- returns no more than five acceptance criteria, exact files/interfaces, test-first steps, evidence, dependencies, non-goals, risks, and skill routing
- detects missing design, payment evidence, or requirement authority and returns `blocked` instead of inventing it

### Plan Critic

- reviews the task plan against canonical requirements, the active slice, constraints, architecture, testability, and bounded scope
- uses a decline-oriented posture
- returns `approved` or `needs_revision` with concrete findings
- cannot rewrite product requirements or approve deferrals

### Executor

- implements only an approved task plan
- follows the prescribed test-first or explicit manual-verification cycle
- updates the task execution report with files changed, tests, evidence, concerns, and candidate commit
- returns `needs_review` only after required verification is run or a blocker is recorded

### Reviewer

One reusable reviewer skill supports two independent lanes. Each lane is assigned to a different agent that did not implement the task.

- `spec` lane: requirement coverage, scope, approved flow, negative cases, and conditional design fidelity
- `quality` lane: correctness, tests, regression risk, accessibility, security, data integrity, maintainability, and PSP boundaries; the existing payment-domain review is included when required

Both lanes must approve the same final candidate commit. One lane cannot compensate for a rejection from the other.

### Budget Guard

- calculates used and remaining role turns
- warns and restricts optional work at the configured soft limit
- pauses the loop at the hard limit
- recommends split, escalation, user decision, or accepted residual risk
- cannot lower review requirements or fabricate approval to save budget

## Loop State Machine

```text
draft
  -> planning
  -> plan_review
  -> needs_plan_revision -> planning
  -> awaiting_plan_approval
  -> ready_to_implement
  -> implementing
  -> needs_review
  -> spec_review
  -> needs_implementation_revision -> implementing
  -> quality_review
  -> needs_implementation_revision -> implementing
  -> reviewed
  -> awaiting_task_acceptance
  -> complete
```

When one task reaches `complete`, the orchestrator selects the next approved task and starts its planning loop. When all slice tasks are complete, the slice becomes eligible for the pull-request gate. Terminal exceptional task states are `blocked` and `budget_paused`. Only the orchestrator transitions state, and every transition appends an event to `loop-log.jsonl`.

## Planning Loop

1. Orchestrator verifies the task is linked to an approved requirement and slice.
2. Planner produces `plan.md` with no more than five acceptance criteria.
3. Plan critic reviews it.
4. If rejected, the orchestrator records findings and returns the same task to the planner.
5. The cycle repeats up to the configured plan-round limit.
6. After critic approval, the orchestrator stops for user approval of the task plan.
7. Only user approval moves the task to `ready_to_implement`.

The default plan-round limit is three. Reaching it pauses the task for a split, stronger model, clarified authority, or user decision. The orchestrator must not repeat the same failed prompt unchanged.

## Conditional Frontend Visual Evidence

The planner records whether the task changes a customer-facing or sales-facing interface.

| Change | Visual route |
| --- | --- |
| New page, checkout flow, navigation, or material interaction | UI/UX Pro Max plus an inspectable visual mockup |
| Material direction is unsettled or several distinct solutions are viable | UI/UX Pro Max, then gstack design-shotgun |
| Extension of an approved pattern | UI/UX Pro Max targeted check plus one focused HTML state mockup |
| Copy, small spacing, icon, or straightforward visual defect | Reuse the approved design; no new visual exploration unless ambiguity remains |

For applicable work:

1. UI/UX Pro Max starts with design-system retrieval, then only the necessary UX, accessibility, typography, responsive, React, and shadcn searches.
2. Existing approved `design-system/MASTER.md` and page overrides remain authoritative; retrieval does not silently overwrite them.
3. Design Shotgun is used once for a materially new direction or unresolved visual choice, not for every frontend task.
4. Raw Design Shotgun exploration remains under `~/.gstack` as required by that skill.
5. The selected direction and rationale are recorded under a stable `DESIGN-*` decision.
6. When durable implementation guidance is needed, the approved direction is expressed through the demo's project-owned HTML mockup/state-board and registered in `mockups/INDEX.md`.
7. The user approves the visual evidence before frontend implementation begins.

Task plans record:

```yaml
visual_design:
  required: true
  mode: reuse | focused-mockup | design-shotgun
  design_links: [DESIGN-NNNN]
  approved_mockup: mockups/example.html
  approval_reference: user:<task-id>:<date>:<decision>
```

For `focused-mockup` and `design-shotgun`, `approved_mockup` may remain absent
while the task is in `plan_review` or `needs_plan_revision`. If it is supplied
in either state, it must already identify a real regular file under the demo's
`mockups/` directory. From `awaiting_plan_approval` onward, that durable mockup
file is required. Evidence paths are relative to the demo, cannot escape it
lexically or through symlinks, and cannot identify directories. The `reuse`
and `not_applicable` routes retain their existing behavior. Required evidence
roots such as `mockups/` must be physical demo subdirectories rather than
symlink aliases to another demo-local location.

Research output is not approval evidence. A mockup is design evidence but does not replace runtime evidence for responsive layout, accessibility, real state, official PSP rendering, or light/dark behavior.

## Implementation And Review Loop

1. Executor implements the approved plan and produces a candidate commit.
2. Specification reviewer performs a full first review.
3. If approved, quality reviewer independently performs a full first review.
4. A rejection returns findings to the executor.
5. The executor produces a new candidate commit and targeted verification.
6. Reviewers who have already reviewed the task perform a scoped re-review by default.
7. Both reviewers must approve the same final commit before the task becomes `reviewed`.
8. The orchestrator stops for user acceptance of the reviewed task before it marks the task complete and advances to the next task.

The default implementation-revision limit is three. At the limit, the loop pauses for a task split, stronger executor, requirement/design clarification, or user decision.

## Scoped Re-review

Round one is always a full review. A later review may be scoped only when the reviewer receives:

- the prior reviewed commit
- the new candidate commit
- prior findings
- the exact fix diff
- changed files and interfaces
- targeted tests and evidence

The reviewer verifies that every finding is closed, the fix does not create a local regression, the relevant tests pass, and the change stayed inside the declared fix scope.

A scoped re-review automatically escalates to full review when the fix:

- changes files unrelated to the findings
- changes a public interface or approved architecture
- changes database schema, payment lifecycle, authentication, authorization, security, entitlement, or stored-value behavior
- changes an approved design contract
- introduces a broad refactor or unclear blast radius
- introduces new failures

Any new candidate commit makes earlier verdicts stale. A prior reviewer may re-confirm through a scoped review, but no task closes with approvals attached to different commits.

Review reports record:

```yaml
review_mode: full | scoped
base_commit: <sha-or-none>
candidate_commit: <sha>
prior_findings: []
files_reviewed: []
tests_and_evidence: []
escalated_to_full: false
verdict: approved | rejected
```

## Budget Rules

Initial defaults are configurable per demo:

```yaml
budget:
  max_plan_rounds: 3
  max_implementation_rounds: 3
  max_role_turns_per_task: 15
  soft_limit_percent: 80
  hard_limit_percent: 100
```

Every delegated planner, critic, visual-design, executor, and reviewer turn counts toward the task budget. At the soft limit, the orchestrator stops optional exploration, reuses approved evidence where valid, and allows only work required to reach a safe decision. At the hard limit, it moves the task to `budget_paused` and asks the user to split, increase the budget, accept a documented residual risk, or stop.

The role-turn counter cannot be lower than the delegated-role results durably recorded for the active task.

If a plan or implementation result is rejected at its configured revision limit, the task cannot re-enter `planning` or `implementing`; it moves to `budget_paused` until the user changes the bounded course.

Budget limits never remove mandatory PSP evidence, tests, or independent approvals.

## Tracking Logic

`loop-state.json` stores the current snapshot only:

```json
{
  "slice_id": "SLICE-NNN",
  "task_id": "TASK-NNNN",
  "state": "planning",
  "round": { "plan": 1, "implementation": 0 },
  "role_results": {
    "planner": {
      "task_id": "TASK-NNNN",
      "plan_hash": "<hash>",
      "acceptance_criteria": ["AC-1"]
    },
    "plan_critic": { "task_id": "TASK-NNNN", "plan_hash": "<hash>" },
    "executor": null
  },
  "visual_design": {
    "required": false,
    "mode": "not_applicable",
    "design_links": [],
    "approved_mockup": null,
    "approval_reference": null
  },
  "candidate_commit": null,
  "approvals": { "plan": null, "spec": null, "quality": null },
  "updated_at": "<ISO-8601>"
}
```

Role results and approvals carry the active `task_id` and applicable `plan_hash` or candidate commit so stale results cannot advance another task. Executor identity is fixed before review so reviewer independence is verifiable. `loop-budget.json` stores the active task, status, limits, and counters. `loop-log.jsonl` is append-only and records every transition, role result, user gate, budget event, and invalidated approval; each task starts from an initial transition, transitions remain continuous, control events are recorded by the orchestrator, and the snapshot must match the latest transition and supporting result/gate/budget events. Task Markdown files retain human-readable plans, execution evidence, and reviewer findings.

When an executor result is required, its evidence report must be the real
regular file `tracking/tasks/<active-task-id>/execution.md`. The validator does
not accept another task's report, an alternate filename, an absolute path, a
missing path, a directory, or a path that escapes the demo through traversal or
symlinks. The active task directory must itself be a physical subtree under
`tracking/tasks/`, not a symlink to another task.

Accepted residual risk (user-approved 2026-08-17): the first version verifies
that required supporting events exist and that transition history is
continuous, but it does not reconstruct strict chronological authorization for
every state change. A manually malformed append-only log could therefore place
a supporting role or user-gate event after the transition it was intended to
authorize. Building a general event-ordering engine is deferred until actual
use demonstrates that this protection is necessary; this acceptance does not
weaken the existing transition, ownership, continuity, snapshot, or evidence
checks.

Role agents never edit these three loop-control files. They return structured results to the orchestrator, which validates and writes the transition. This prevents competing agents from advancing the same task or overwriting each other's decisions.

After context loss or a new session, the orchestrator reconstructs work from canonical artifacts, the snapshot, and the append-only log. Conversation memory is never the sole proof that a task was planned, approved, implemented, or reviewed.

## User Approval Gates

The loop stops at these boundaries:

1. **Task plan ready:** user approves the bounded task plan before implementation.
2. **Task implementation reviewed:** after both reviewers approve the same candidate commit, the user accepts that task result before the orchestrator advances to the next task.
3. **Pull request creation:** after every slice task is accepted, the user authorizes creating the slice-level pull request.
4. **Merge:** user approves merge after the pull request and checks are visible.

There are no extra taste or implementation-choice gates inside an approved task unless an agent discovers a scope change, missing authority, destructive action, payment uncertainty, or material design decision.

## Pull Request Boundary

One pull request is created per approved slice or milestone, not per small task. Task candidate commits remain independently reviewable and are included in the slice pull request after the slice acceptance gate.

The orchestrator never creates or merges a pull request merely because agents approved the code.

## Knowledge Files

Demo-local knowledge captures future value without becoming authority:

- `knowledge/findings/`: investigated behaviors, comparison notes, and unresolved questions
- `knowledge/fixes/`: reproducible bug symptoms, root causes, fixes, and verification
- `knowledge/INDEX.md`: concise routing index

Payment conclusions cite the payment wiki and, when volatile or high-stakes, current official evidence. Raw provider payloads and secrets are sanitized. Useful reusable lessons may later be promoted through the existing repository learning process.

## Existing Demo Adoption

Adoption is additive:

1. Read the existing canonical artifacts and active status.
2. Reconcile inconsistencies before choosing an active task.
3. Add loop configuration and state for future work only.
4. Do not renumber requirements, recreate approved mockups, rewrite historical progress, or reopen completed work without a concrete reason and user approval.
5. Start the loop at the next approved task or explicitly approved recovery point.

For the AI Service Subscription Pilot, the first adoption must reconcile the current `PLAN.md`, local `AGENTS.md`, task tracking, implementation evidence, and remote verification state before dispatching new implementation work.

## Acceptance Criteria For The Reusable Loop

The first implementation is acceptable when:

1. The six named skill folders validate and expose concise role contracts.
2. A demo can configure constraints, budgets, and skill routing without modifying reusable skills.
3. The orchestrator rejects a task with more than five acceptance criteria and routes it back for splitting.
4. State cannot advance without required role results and user gates.
5. Two independent reviewers approve the same final candidate commit, with scoped re-review and automatic full-review escalation working as defined.
6. Frontend tasks select the correct visual route and retain approved design and runtime evidence without invoking Design Shotgun for trivial edits.
7. Budget limits pause rather than silently weakening verification.
8. Existing canonical requirements, design decisions, and history remain unchanged during adoption.

## Deferred Until Proven Necessary

- graphical workflow dashboard
- remote orchestration service
- automatic GitHub issue or project-board synchronization
- autonomous pull-request creation or merge
- per-agent token billing integration
- more reviewer roles than the two-agent mapping defined here
- strict chronological authorization reconstruction for every logged transition

These may be reconsidered only after real use exposes a repeated problem that the lean loop cannot solve.

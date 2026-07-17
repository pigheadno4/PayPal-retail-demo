# New Demo Protocol

This is the canonical lifecycle for creating and evolving payment demos. Other instruction files may point here, but must not restate this workflow.

Status: approved workflow design, 2026-07-17.

## Outcomes

The protocol prevents three recurring failures:

- approved requirements disappearing when work is divided into slices
- implementation task lists becoming a weaker substitute for product requirements
- customer-facing UI reaching code before its visual direction, typography, states, and acceptance evidence are approved

The workflow applies in full to the next standard or complex pilot. Existing demos adopt it through an explicit, targeted backfill rather than a historical rewrite.

## Authority And Ownership

### User And Product Owner

The user approves requirements, visual direction, slice boundaries, and every scope removal or deferral. Agent or reviewer agreement does not replace user approval for these decisions.

### Slice Steward

The active primary/root agent is the Slice Steward. The steward owns completeness across the full requirement register and remains accountable when planning or implementation is delegated.

The Slice Steward must:

1. read the complete approved requirement register and unresolved requirement queue
2. propose slice membership without silently narrowing requirements
3. gather applicable design, payment-knowledge, test, and evidence contracts
4. prepare the slice charter and obtain user approval
5. assign tasks and model effort after the slice is locked
6. resolve reviewer findings and reconcile the finished slice against its charter

An implementation subagent cannot redefine requirements, approve a deferral, or close a slice.

### Specialist Roles

- The engineering planner decomposes an approved slice into tasks and tests without changing scope.
- Implementers execute bounded task briefs and report evidence and concerns.
- A requirement-coverage reviewer searches for omissions and unsupported narrowing.
- A design-fidelity reviewer compares rendered behavior with approved design artifacts.
- An engineering reviewer checks correctness, regressions, accessibility, security, data integrity, and PSP boundaries.

Reviewers verify the decision system; they do not become new sources of product truth.

## Canonical Artifacts

Each artifact owns one concern. History and execution convenience must not replace approved requirements.

| Artifact | Authority |
| --- | --- |
| `DEMO.md` | Audience, business scenario, supported flows, demo boundaries, and success criteria |
| `REQUIREMENTS.md` | Approved promises, stable `REQ-*` identifiers, acceptance criteria, status, dependencies, exclusions, and target slice |
| `DESIGN.md` | Slim design router, approved visual direction, design decisions, and links to detailed design-system and page contracts |
| `design-system/MASTER.md` | Color, spacing, geometry, elevation, motion, responsive, and accessibility foundations |
| `design-system/TYPOGRAPHY.md` | Actual font files, roles, scales, weights, line heights, fallbacks, loading, and verification |
| `design-system/COMPONENTS.md` | Customized component primitives, semantic variants, interaction states, and usage examples |
| `design-system/pages/*.md` | Page-specific layout, state, responsive, content, and accessibility contracts; exceptions override the master only where stated |
| `IMPLEMENTATION_PLAN.md` | Architecture, interfaces, platform plan, traceability, test strategy, and evidence strategy |
| `IMPLEMENTATION_TASKS.md` | Complex-demo execution tasks linked to `REQ-*`, `DESIGN-*`, `TC-*`, and `EVID-*`; never the product source of truth |
| `slices/<SLICE-ID>.md` | Approved slice charter and its close record |
| `PLAN.md` | Small active-slice router; it does not redefine requirements or milestone status |
| `tracking/test-cases.md` | `TC-*` acceptance and evidence rows linked to requirements |
| `tracking/todos.md` | Near-term operational queue derived from the active slice |
| `tracking/progress.md` | Append-only execution history |
| `tracking/debug.md` | Investigation and diagnostic record |
| `tracking/learnings.md` | Demo-local lessons awaiting promotion |

Simple demos may keep atomic requirements and tasks inside `DEMO.md`. Standard demos require `REQUIREMENTS.md`, but may keep task steps in `IMPLEMENTATION_PLAN.md`. Complex demos use the complete structure above.

`AGENTS.md` contains stable guardrails only. Feature requirements, slice decisions, and transient task detail do not belong there.

## Stable Identifiers And Status

Use stable identifiers throughout the lifecycle:

- `REQ-*` for product, behavior, payment, operator, and design requirements
- `DESIGN-*` for approved design decisions
- `SLICE-*` for independently closable implementation slices
- `TASK-*` for implementation work
- `TC-*` for test and acceptance cases
- `EVID-*` for evidence obligations and captured proof

Requirement status follows this path:

`draft -> approved -> in_progress -> implemented -> verified`

`deferred` and `removed` are separate decisions. Both require a reason, a next trigger when applicable, and user approval. `implemented` never means `verified`.

Every approved requirement must remain visible in the traceability matrix until it is verified, explicitly deferred, or explicitly removed. Moving it to a future slice is an assignment, not a deferral.

## Lifecycle

### 1. Discovery Before Code

When the user starts a demo or introduces a material feature:

1. Do not create runtime code immediately.
2. Use brainstorming to clarify purpose, audience, business scenario, PSP products, platforms, success criteria, non-goals, and initial UI direction.
3. Classify the demo as simple, standard, or complex and record `Complexity:` in `DEMO.md`.
4. Search `learnings/INDEX.md` before solving a difficult payment, architecture, mobile, or demo-operations problem.
5. Run the Payment Knowledge Gate for payment-domain claims.
6. Select the matching template from `demos/_templates/` and fill canonical artifacts from confirmed decisions.
7. Generate a local `AGENTS.md` only after stable guardrails are known.

When Superpowers brainstorming or writing-plans runs for a demo, its durable output goes into these canonical demo artifacts, not `docs/superpowers/specs/` or `docs/superpowers/plans/`.

### 2. Requirements Before Tasks

Create atomic `REQ-*` rows before implementation planning. Each requirement records:

- concise promise and audience
- source conversation or canonical document section
- acceptance criteria and relevant negative cases
- dependencies and cross-cutting constraints
- affected platforms, pages, APIs, data, and PSP surfaces
- required test and evidence types
- status and target slice
- explicit exclusions

Broad labels such as "checkout UI", "cart sync", "vaulting", or "payment integration" are themes, not acceptable atomic requirements.

Before a slice is proposed, classify every unresolved approved requirement as:

- included in this slice
- assigned to an explicitly named future slice
- blocked by a documented dependency
- proposed for deferral and awaiting user approval

No approved requirement may disappear because a new plan, milestone, worktree, agent, or conversation started.

### 3. Design Before Frontend Planning

Customer-facing and sales-facing work requires the following design sequence.

#### Taste Brief

Record the desired personality, audience, references, density, typography goals, imagery approach, and explicit reject list. User-provided drafts and references are binding input unless the user changes them.

#### UI/UX Pro Max Retrieval

Run the design-system search first. Then run only the targeted style, typography, UX, accessibility, React, and shadcn searches needed for the surface.

Record:

- queries used
- recommendations accepted
- recommendations rejected and why
- conflicts with existing project patterns or user taste

Retrieval output is research, not design authority. The Slice Steward or design specialist must synthesize it into project-specific options.

#### Visual Direction

Use gstack design-shotgun when the project needs a new identity, a material typography or layout decision, or recovery from repeated subjective polish. Generate genuinely distinct options with different typography, palette, layout rhythm, density, and character. Use it once per major identity decision, not for every page.

Use the Superpowers visual companion when responsive layouts, flows, or UI states are clearer to approve visually. Produce inspectable desktop and mobile references for representative critical surfaces and their loading, empty, error, selected, disabled, and expanded states.

The user selects the direction. Selected and rejected decisions are recorded as `DESIGN-*` entries so later agents do not restart visual discovery.

#### Typography Gate

Compare real, locally loaded font candidates using actual product content, including navigation, product names and prices, form labels and errors, payment rows, Admin filters and tables, and long mobile content.

The approved typography contract must name:

- font files and license/source
- roles, weights, sizes, line heights, and fallbacks
- preload and loading strategy
- responsive behavior
- `document.fonts` or equivalent runtime verification

Written font intent without installed and verified files does not pass this gate.

#### Customized Component Foundation

For React pilots, shadcn/ui is the default primitive foundation when compatible with the stack. It is not the visual identity.

- Install only required primitives.
- Map primitives to project tokens and semantic CVA variants.
- Define project-specific sizes and interaction states.
- Preserve `className` extension and source ownership.
- Add domain wrappers only for repeated product patterns.
- Keep official PSP-rendered components isolated from merchant styling.

Prefer shared tokens and variants before page-local CSS. Page exceptions must be documented in the relevant page contract.

#### Design Approval Gate

Before frontend tasks start, the user approves:

- the design-system/component board
- typography in representative real content
- representative storefront surfaces
- transaction and payment surfaces
- post-purchase Account or Admin surfaces when in scope
- mobile and required interaction states

Implementation begins from these approved artifacts, not from fresh styling choices inside each slice.

### 4. Slice Charter Before Implementation

The Slice Steward writes `slices/<SLICE-ID>.md` before task decomposition. The charter contains:

- goal and buyer/operator outcome
- inherited `REQ-*` and applicable `DESIGN-*`
- linked design-system sections, approved mockups, and state boards
- dependencies and cross-cutting requirements pulled into the slice
- explicit non-goals
- proposed deferrals with reason, next trigger, and approval state
- required `TASK-*`, `TC-*`, and `EVID-*` coverage
- payment Knowledge Evidence when applicable
- skill routing and agent/model-effort routing
- entry criteria, exit criteria, and review lanes

The user approves the charter before implementation. A slice may elaborate approved requirements but cannot silently narrow, reinterpret, or postpone them.

### 5. Planning And Execution

Use writing-plans only after the requirements, design, and slice charter are approved. Each task must:

- reference its governing `REQ-*` and `DESIGN-*`
- name exact files and interfaces
- define its test cycle and evidence obligation
- state non-goals and PSP boundaries
- produce an independently reviewable result

Use subagent-driven development when planned tasks are sufficiently independent. A fresh implementer receives a bounded task package rather than the complete conversation:

- exact requirements and global constraints
- interfaces and files in scope
- tests and evidence required
- explicit non-goals
- task and report-file locations

The Slice Steward keeps a durable progress ledger and checks it after context compaction or session handoff. Completed tasks must not be redispatched from conversational memory.

### 6. Review And Verification

Every slice passes three independent review lanes:

1. **Requirements coverage:** a decline-oriented reviewer compares the charter and diff with `REQUIREMENTS.md`, looking for omissions, narrowed promises, extra behavior, and unapproved deferrals.
2. **Design fidelity:** a reviewer compares rendered screenshots and interactions with approved design-system, typography, mockup, state, and page contracts. User taste approval remains a separate gate.
3. **Engineering quality:** a reviewer checks behavior, tests, accessibility, security, data integrity, regressions, maintainability, and PSP boundaries.

A passed lane cannot compensate for a failed lane. Critical and important findings are corrected and re-reviewed before the task or slice closes.

### 7. Close And Learn

Before closing a slice or milestone:

- reconcile `REQUIREMENTS.md`, the slice charter, implementation tasks, `PLAN.md`, and tracking files
- list every unresolved inherited requirement and give it a valid disposition
- confirm every visible action is working, disabled with a clear reason, or explicitly deferred
- confirm `implemented` requirements have not been mislabeled `verified`
- confirm required evidence exists and reviewer findings are closed
- append the result to `tracking/progress.md`
- promote reusable lessons into `learnings/` and update `learnings/INDEX.md`

Rendered UI or passing unit tests alone cannot close a user-visible or PSP-critical promise.

## Skill And Model-Effort Routing

Skills are stage-specific methods. Their raw output never replaces canonical requirements or approved design decisions.

| Stage | Skill route | Model and effort guidance |
| --- | --- | --- |
| New or changed requirements | Superpowers brainstorming | strongest suitable model, high effort |
| UI research | UI/UX Pro Max design-system then targeted retrieval | lower-cost retrieval; strong synthesis |
| Major visual direction | gstack design-shotgun | strong visual judgment, high effort |
| Responsive and state design | Superpowers visual companion | strong design agent, medium/high effort |
| Slice planning | Superpowers writing-plans | Slice Steward, high effort |
| Mechanical implementation | Superpowers subagent-driven development and TDD | fast/lower-cost model only with an exact bounded brief |
| Integration, PSP, or ambiguous implementation | Superpowers execution workflow | standard or strongest model according to risk |
| Visual correction | read-only fidelity review first; gstack design-review for the correction loop | standard/high design judgment |
| Final closure | independent reviews and verification-before-completion | strongest suitable reviewer |

The Slice Steward records required skills, conditional skills and triggers, non-applicable skills and reasons, assigned model class, effort, and escalation conditions in the slice charter.

Low-cost agents must not approve requirements, scope changes, deferrals, visual direction, PSP semantics, security-sensitive behavior, or milestone closure.

Escalate when an agent reports missing context, repeatedly fails, discovers cross-task integration, or reaches a decision beyond its authority. Improve the brief, split the task, use a stronger model, or ask the user; do not repeat the same failed dispatch unchanged.

## Payment Knowledge Gate

Run this gate during discovery, before approving a payment-related slice, whenever a new payment question emerges, and during payment-domain review.

It applies to PSP capabilities, eligibility, SDKs, APIs, webhooks, request fields, error behavior, wallet prerequisites, vaulting, subscriptions, shipping updates, taxes, promos, payment lifecycle, pricing, settlement, disputes, risk, compliance, and regional restrictions.

The assigned agent must:

1. locate the payment wiki through the repository-root `KNOWLEDGE_SOURCES.md`
2. read the wiki's local `AGENTS.md`, authoritative `CLAUDE.md`, and applicable workflow rule
3. follow `rules/query-and-synthesis.md` for questions and comparisons
4. search the root and PSP indexes before selecting source, company, concept, or analysis pages
5. use concept pages as indexes, not final authority for exact or volatile claims
6. read source summaries and raw files for exact parameters, limits, endpoints, sandbox behavior, edge cases, gaps, or contradictions
7. sweep for relevant unlinked raw evidence when the answer may otherwise be incomplete
8. verify high-stakes or likely-changed behavior against current official PSP documentation
9. record the conclusion and affected requirements in the demo's canonical artifacts

Each payment-related slice charter contains a Knowledge Evidence block with:

- question investigated and search terms
- wiki pages, source summaries, and raw files read
- confirmed conclusions and confidence
- contradictions, staleness, assumptions, and unresolved gaps
- official documentation verification when required
- affected `REQ-*`, `DESIGN-*`, `TASK-*`, `TC-*`, and `EVID-*`

A lower-cost agent may retrieve and inventory evidence. A standard or high-effort payment specialist synthesizes ambiguous or conflicting evidence. If evidence is insufficient, record a knowledge gap and stop the affected decision; never fill it by assumption.

## Evidence Ladder

Each requirement declares the applicable evidence rungs:

1. static or component rendering
2. user interaction and state transitions
3. backend, database, and stored-state correctness
4. loading, empty, error, retry, blocked, and recovery behavior
5. responsive screenshots and geometry for representative viewports
6. accessibility, keyboard, focus, and reduced-motion behavior
7. computed typography and actual font loading
8. official hydrated PSP component or provider state
9. live sandbox, webhook, HTTPS-domain, or hosted evidence when required

Dynamic PSP UI must not be replaced with fake buttons to make evidence deterministic. Verify merchant-owned wrapper geometry, official provider nodes and state, loading and failure behavior, and stable surrounding regions. Avoid brittle whole-page pixel comparison for provider-controlled dynamic content.

## Automated Coverage Gate

The agent-system implementation must provide a deterministic requirement-coverage validator. It fails when:

- an approved requirement has no task, test, or required evidence link
- a verified requirement has missing or failed evidence
- a slice closes with unresolved inherited requirements
- a deferral lacks a reason, next trigger, or user approval
- tasks, tests, evidence, or design decisions reference unknown identifiers
- the active slice, `PLAN.md`, and tracking status disagree

Automated checks verify structure and linkage. They do not replace semantic review by the Slice Steward and independent reviewers.

## Change Management

Later UX feedback creates or refines an affected `DESIGN-*` decision or `REQ-*` requirement and reopens only the relevant component, page, and evidence contracts.

Do not create a generic "Round N polish" slice without:

- diagnosed root cause
- affected requirement and design identifiers
- surfaces and states in scope
- objective exit criteria

When similar problems appear across pages, repair typography, tokens, primitives, or shared components first. If an approved mockup cannot represent real data or interaction truthfully, revise and reapprove the design before changing runtime code.

## Existing-Demo Adoption

Do not rewrite the complete history of a mature demo merely to adopt this protocol. A targeted adoption plan must:

- preserve verified completed behavior and user-owned evidence
- build an approved requirement register from unresolved promises and still-relevant original requirements
- identify missing design-system, test, payment-knowledge, and evidence contracts
- choose representative critical surfaces rather than restyling every page at once
- create future slice charters from the new register
- leave historical progress append-only

The adoption plan itself requires user approval before backfill implementation begins.

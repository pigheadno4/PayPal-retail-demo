# SLICE-006 — Integration Lab

- Status: proposed
- User approval reference: none
- Slice Steward: primary Codex agent
- Payment-domain sub-review required: yes

## Goal And Outcome

Build the operator-first Scenario Builder, Matched Compare, Capability Matrix, merchant summary, technical evidence, and immutable finding workflow.

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| ----------- | --------- | ----------- | ------------------------ |
| REQ-0012 | approved | future_slice | Preserve normalized conclusions alongside immutable raw provider provenance. |
| REQ-0013 | approved | future_slice | Connect Scenario Builder, Matched Compare, and Capability Matrix through shared context. |
| REQ-0014 | approved | future_slice | Run guided scenarios with inspectable process traces. |
| REQ-0015 | approved | future_slice | Compare equivalent outcomes through independently evidenced lanes. |
| REQ-0016 | approved | future_slice | Separate provider capability from demo proof. |
| REQ-0017 | approved | future_slice | Provide merchant-first and progressive integration-detail views. |
| REQ-0018 | approved | future_slice | Model platform and integration route as separate dimensions. |

## Design And State Links

- Design decisions: no decision ID is linked in this routing-only charter
- Design-system contracts: selected during the dedicated design review for this slice
- Page contracts: selected during the dedicated design review for this slice
- Mockups/state boards: selected during the dedicated design review for this slice

## Dependencies And Cross-Cutting Requirements

This routing charter depends on closure of every earlier slice named by its requirement dependencies, fresh provider or policy evidence where applicable, and a separately approved detailed charter before implementation.

## Explicit Non-Goals

This proposed routing charter creates no implementation plan, task, test, evidence identifier, schema, dependency, PSP configuration, or runtime code. It does not pull behavior from another named slice into this slice.

## Deferrals And Removals

| Requirement | Proposed disposition | Reason | Next trigger | User approval reference |
| ----------- | -------------------- | ------ | ------------ | ----------------------- |

No requirement is deferred or removed by this routing charter.

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| ----------- | ----- | ---------- | -------- |
| REQ-0012 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0013 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0014 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0015 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0016 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0017 | not created before charter approval | not created before charter approval | not created before charter approval |
| REQ-0018 | not created before charter approval | not created before charter approval | not created before charter approval |

## Knowledge Evidence

Required for this payment-domain slice.

- Question and search terms: scenario evidence, matched business outcomes, capability status, proof level, raw logs, immutable findings, platform, and integration route
- Wiki pages/source summaries/raw files: route-specific PayPal and Stripe sources in `payment wiki root (see KNOWLEDGE_SOURCES.md)/wiki/sources/` plus `design-system/pages/integration-lab.md` evidence boundaries
- Confirmed conclusions and confidence: the lab compares locked merchant outcomes and exposes provider capability separately from current demo proof; research lanes cannot fabricate runnable results
- Contradictions, staleness, assumptions, or gaps: exact runnable scenario fixtures, provider configuration, evidence retention, freshness review, and hosted execution remain closure gates
- Official verification and retrieval date: use the current official documentation and record the retrieval date during this slice's dedicated charter review; older project evidence is historical context only
- Affected identifiers: REQ-0012, REQ-0013, REQ-0014, REQ-0015, REQ-0016, REQ-0017, REQ-0018, SLICE-006

## Skill And Model Routing

| Work | Required or conditional skill | Trigger or non-applicable reason | Assigned agent | Model | Effort | Escalation condition |
| ---- | ----------------------------- | -------------------------------- | -------------- | ----- | ------ | -------------------- |
| Detailed charter review | superpowers brainstorming and applicable domain skills | required before expanding this routing charter | assigned during dedicated charter review | strongest suitable | high | any scope, provider, policy, security, or design ambiguity returns to user approval |

## Reviewer Assignments

| Lane | Reviewer/agent | Independent from implementer | Model and effort | Required inputs | Decision authority |
| ---- | -------------- | ---------------------------- | ---------------- | --------------- | ------------------ |
| Requirements coverage | assigned during dedicated charter review | yes | strongest suitable, high | requirements, disposition map, detailed charter | accept or reject requirement coverage |
| Design fidelity | assigned during dedicated charter review | yes | strongest suitable design model, high | approved decisions and artifacts | accept or reject design fidelity |
| Engineering quality | assigned during dedicated charter review | yes | strongest suitable, high | approved charter, diff, tests, evidence | accept or reject engineering quality |
| Payment-domain engineering sub-review | assigned during dedicated charter review | yes | strongest suitable payment model, high | current sources, diff, tests, evidence | accept or reject PSP semantics |

## Entry Criteria

- [ ] Requirements and dispositions are valid.
- [ ] Design and state artifacts are approved when applicable.
- [ ] Knowledge Evidence is sufficient when applicable.
- [ ] Coverage, skills, models, and independent reviewers are assigned.
- [ ] User approved this charter.

## Exit Criteria

- [ ] Every inherited requirement has its promised task, test, and evidence result.
- [ ] No unresolved Critical or Important findings remain.
- [ ] Every Minor finding has an explicit accepted disposition.
- [ ] Required hosted, sandbox, PSP, accessibility, typography, responsive, and platform evidence passes.
- [ ] Requirement register, active plan, tasks, tests, evidence, and tracking agree.
- [ ] User approved required visual/taste outcomes.

## Close Record

- Closed by: none
- Closed at: none
- Requirements review decision: pending
- Design review decision: pending
- Engineering review decision: pending
- Payment-domain sub-review decision: pending
- Critical/Important findings: pending
- Minor findings disposition: pending
- Evidence summary: none
- Progress-log reference: none

# SLICE-009 — US iOS H5 Subscription Pilot

- Status: proposed
- User approval reference: none
- Slice Steward: primary Codex agent
- Payment-domain sub-review required: yes

## Goal And Outcome

After web and the H5 credit pilot are verified, evaluate and implement the evidence-supported US iOS app-to-web subscription route.

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| ----------- | --------- | ----------- | ------------------------ |
| REQ-0019 | approved | future_slice | Limit the first app-to-web subscription pilot to the approved US iOS storefront scope. |

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
| REQ-0019 | not created before charter approval | not created before charter approval | not created before charter approval |

## Knowledge Evidence

Required for this payment-domain slice.

- Question and search terms: US iOS external subscription acquisition, storefront policy, H5 checkout, reusable payment method, app return, entitlement refresh, and disclosure
- Wiki pages/source summaries/raw files: current Apple policy evidence required by REQ-0019 plus exact PayPal or Stripe subscription-acquisition sources selected through `KNOWLEDGE_SOURCES.md`
- Confirmed conclusions and confidence: mobile implementation follows complete web and the H5 credit pilot; H5 route proof does not establish native or React Native SDK scope
- Contradictions, staleness, assumptions, or gaps: policy drift, storefront eligibility, PSP route support, reusable-method proof, app review treatment, and hosted return behavior require fresh evidence
- Official verification and retrieval date: use the current official documentation and record the retrieval date during this slice's dedicated charter review; older project evidence is historical context only
- Affected identifiers: REQ-0019, SLICE-009

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

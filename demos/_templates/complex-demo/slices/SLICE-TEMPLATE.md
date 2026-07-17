# SLICE-001 — {{SLICE_NAME}}

- Status: proposed
- User approval reference: none
- Slice Steward: {{PRIMARY_AGENT}}

## Goal And Outcome

{{BUYER_OR_OPERATOR_OUTCOME}}

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| ----------- | --------- | ----------- | ------------------------ |

## Design And State Links

- Design decisions: {{DESIGN_LINKS}}
- Design-system contracts: {{SYSTEM_LINKS}}
- Page contracts: {{PAGE_LINKS}}
- Mockups/state boards: {{MOCKUP_LINKS}}

## Dependencies And Cross-Cutting Requirements

{{DEPENDENCIES}}

## Explicit Non-Goals

{{NON_GOALS}}

## Deferrals And Removals

| Requirement | Proposed disposition | Reason | Next trigger | User approval reference |
| ----------- | -------------------- | ------ | ------------ | ----------------------- |

Unapproved proposals do not change requirement status.

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| ----------- | ----- | ---------- | -------- |

## Knowledge Evidence

Required for payment-domain work.

- Question and search terms: none
- Wiki pages/source summaries/raw files: none
- Confirmed conclusions and confidence: none
- Contradictions, staleness, assumptions, or gaps: none
- Official verification and retrieval date: none
- Affected identifiers: none

## Skill And Model Routing

| Work | Required or conditional skill | Trigger or non-applicable reason | Assigned agent | Model | Effort | Escalation condition |
| ---- | ----------------------------- | -------------------------------- | -------------- | ----- | ------ | -------------------- |

Requirements approval, design synthesis/fidelity, PSP semantics/conflicting evidence, and final closure use the strongest suitable high-effort model. Lower-cost agents are limited to retrieval, inventory, and bounded mechanical work.

## Reviewer Assignments

| Lane                  | Reviewer/agent     | Independent from implementer | Model and effort                              | Required inputs                            | Decision authority                    |
| --------------------- | ------------------ | ---------------------------- | --------------------------------------------- | ------------------------------------------ | ------------------------------------- |
| Requirements coverage | {{REVIEWER}}       | yes                          | strongest suitable, high                      | requirement register, charter, diff        | accept or reject requirement coverage |
| Design fidelity       | {{REVIEWER_OR_NA}} | yes                          | strongest suitable design model, high         | decisions, contracts, mockups, screenshots | accept or reject design fidelity      |
| Engineering quality   | {{REVIEWER}}       | yes                          | risk-scaled; strongest for PSP/security/final | charter, diff, tests, evidence             | accept or reject engineering quality  |

For payment slices, the engineering lane includes an explicitly assigned payment-domain sub-review using the Knowledge Evidence block.

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
- Review decisions: none
- Evidence summary: none
- Progress-log reference: none

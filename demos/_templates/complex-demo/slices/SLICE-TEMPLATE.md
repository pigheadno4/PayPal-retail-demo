# SLICE-001 — {{SLICE_NAME}}

- Status: proposed
- User approval reference: none
- Slice Steward: {{PRIMARY_AGENT}}
- Payment-domain sub-review required: yes | no

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

Unapproved proposals do not change requirement lifecycle status. Each row's proposed disposition matches `REQUIREMENTS.md`: `deferral_proposed` has concrete reason/trigger and `pending` approval; `deferred` adds durable user approval; `removed` has concrete reason and durable approval.

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| ----------- | ----- | ---------- | -------- |

Inherited Requirements and Coverage are keyed only by their `Requirement` column. Use one row per requirement; prose mentions and duplicate rows are invalid. Inherited lifecycle and disposition values mirror `REQUIREMENTS.md` exactly. An active or blocked slice may inherit only requirements whose disposition is `active_slice` and whose target is this exact slice. Approved future-slice execution records also require inheritance and coverage here. Coverage and exact record ownership remain reconciled after closure; verified/complete work cannot drop its task, test, or evidence links. Requirement design links propagate to this slice and its linked tasks, and task-specific design decisions also appear here. Every linked task, test case, and evidence record names exactly one `SLICE-NNN` owner: this slice. The payment-domain flag equals the inherited requirements' requirement-owned applicability. An `approved`, `active`, `blocked`, or `closed` charter requires a durable user approval reference and concrete Slice Steward.

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

Requirements approval, design synthesis/fidelity, PSP semantics/conflicting evidence, and final closure use the strongest suitable high-effort model. Lower-cost agents are limited to retrieval, inventory, and bounded mechanical work. Execution rows use an explicit implementation/build/execution work label so reviewer independence can be checked against assigned implementers.

## Reviewer Assignments

| Lane                                  | Reviewer/agent                         | Independent from implementer | Model and effort                                     | Required inputs                              | Decision authority                                     |
| ------------------------------------- | -------------------------------------- | ---------------------------- | ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| Requirements coverage                 | {{REVIEWER}}                           | yes                          | strongest suitable, high                             | requirement register, charter, diff          | accept or reject requirement coverage                  |
| Design fidelity                       | {{REVIEWER_OR_NA}}                     | yes                          | strongest suitable design model, high                | decisions, contracts, mockups, screenshots   | accept or reject design fidelity                       |
| Engineering quality                   | {{REVIEWER}}                           | yes                          | risk-scaled; strongest for PSP/security/final        | charter, diff, tests, evidence               | accept or reject engineering quality                   |
| Payment-domain engineering sub-review | {{PAYMENT_REVIEWER_OR_NA_WITH_REASON}} | yes                          | strongest suitable payment model, high when required | Knowledge Evidence, PSP sources, diff, tests | accept or reject PSP semantics inside engineering lane |

When payment-domain sub-review is `no`, its row records `not applicable: <concrete reason>`. When it is `yes`, every row field names the independent strongest/high reviewer, model/effort, inputs, and decision authority. Design fidelity may be `not applicable: <concrete reason>` only when the slice has no design-decision links; otherwise it requires a strongest/high reviewer and closure requires `Design review decision: approved`. Requirements coverage and final engineering closure also use strongest/high review. No reviewer may be an agent assigned implementation work. Qualified placeholders such as `pending:`, `not applicable: unavailable`, `unknown`, `unavailable`, `tbd`, and `unassigned` do not satisfy a required field. Column meaning follows the header, so reordering columns never changes the gate.

## Entry Criteria

All items are checked before status becomes `approved`, `active`, `blocked`, or `closed`.

- [ ] Requirements and dispositions are valid.
- [ ] Design and state artifacts are approved when applicable.
- [ ] Knowledge Evidence is sufficient when applicable.
- [ ] Coverage, skills, models, and independent reviewers are assigned.
- [ ] User approved this charter.

## Exit Criteria

All items are checked before status becomes `closed`.

- [ ] Every inherited requirement has its promised task, test, and evidence result.
- [ ] No unresolved Critical or Important findings remain.
- [ ] Every Minor finding has an explicit accepted disposition.
- [ ] Required hosted, sandbox, PSP, accessibility, typography, responsive, and platform evidence passes.
- [ ] Requirement register, active plan, tasks, tests, evidence, and tracking agree.
- [ ] User approved required visual/taste outcomes.

## Close Record

Use `none` only when a finding class is empty. Otherwise use `resolved: <REVIEW-* or FINDING-* reference>` for Critical/Important findings and `accepted: <FINDING-*>=<disposition>` for Minors. Placeholder vocabulary anywhere in a payload does not close a finding, and every `not applicable:` decision requires a concrete reason.

`Evidence summary` names passing `EVID-*` records. `Progress-log reference` uses `tracking/progress.md#<existing-heading-anchor>`.

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

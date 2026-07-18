import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDemoWorkflow } from "../validate-demo-workflow.mjs";

const requirementRegisterHeader =
  "| ID | Title | Lifecycle | Disposition | Target slice | Source |";
const requirementRegisterSeparator = "| --- | --- | --- | --- | --- | --- |";
const requirementRegisterRow =
  "| REQ-0001 | Complete checkout | approved | active_slice | SLICE-001 | user:workflow-test:2026-07-17:checkout |";
const taskRegisterHeader =
  "| Task | Slice | Requirements | Design decisions | Tests | Evidence | Status |";
const taskRegisterSeparator = "| --- | --- | --- | --- | --- | --- | --- |";
const taskRegisterRow =
  "| TASK-0001 | SLICE-001 | REQ-0001 | none | TC-0001 | EVID-0001 | planned |";
const testRegisterHeader =
  "| Test ID | Requirements | Slice | Evidence | Status |";
const testRegisterSeparator = "| --- | --- | --- | --- | --- |";
const testRegisterRow =
  "| TC-0001 | REQ-0001 | SLICE-001 | EVID-0001 | planned |";
const evidenceRegisterHeader =
  "| Evidence | Requirements | Slice | Type | Status | Artifact |";
const evidenceRegisterSeparator = "| --- | --- | --- | --- | --- | --- |";
const evidenceRegisterRow =
  "| EVID-0001 | REQ-0001 | SLICE-001 | integration | planned | pending |";

const validFiles = {
  "REQUIREMENTS.md": `# Requirements

## Requirement Register

${requirementRegisterHeader}
${requirementRegisterSeparator}
${requirementRegisterRow}

## Active Requirement Records

### REQ-0001 — Complete checkout

- Audience: buyer
- Source: user:workflow-test:2026-07-17:checkout
- Lifecycle status: approved
- Planning disposition: active_slice
- Target slice: SLICE-001
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: none
- Approval reference: user:workflow-test:2026-07-17:approval
- Acceptance:
  - Buyer completes checkout.
- Negative cases:
  - Failure remains recoverable.
- Dependencies: none
- Affected surfaces: web checkout, order API, order data
- Required test types: integration
- Required evidence types: integration
- Exclusions: subscription billing
- Payment-domain review required: no
- Payment-domain review reason: fixture has no provider-specific behavior
- Design links: none
- Task links: TASK-0001
- Test links: TC-0001
- Evidence links: EVID-0001

## Tombstone Register

| ID | Title | Removal reason | Approval reference |
| --- | --- | --- | --- |

## Tombstones
`,
  "DESIGN.md": `# Design

## Taste Brief

- Audience: buyers
- Product personality: clear and trustworthy
- Density: comfortable
- Typography goals: readable hierarchy
- Imagery direction: product-led
- References: design-system/MASTER.md
- Explicit reject list: fake payment controls

## Approved Direction

Checkout uses the approved system when design decisions are linked.

## Design Decision Ledger

| ID | Decision | Status | Requirement links | Artifact links | Approval reference |
| --- | --- | --- | --- | --- | --- |

## Artifact Index

- Master system: design-system/MASTER.md
- Typography: design-system/TYPOGRAPHY.md
- Components: design-system/COMPONENTS.md
- Component board: design-system/BOARD.md
- Research records: design-system/research/
- Page contracts: design-system/pages/
- Mockup and state-board registry: mockups/INDEX.md

## Main Screens

Checkout is the representative critical surface.

## UX Flow Links

Checkout flow is owned by SLICE-001.

## Design Approval Record

- Component board: pending
- Typography proof: pending
- Representative desktop surfaces: pending
- Representative mobile surfaces: pending
- Required interaction states: pending
- User approval reference: none
`,
  "IMPLEMENTATION_PLAN.md": `# Implementation Plan

## Task Register

${taskRegisterHeader}
${taskRegisterSeparator}
${taskRegisterRow}

### TASK-0001 — Implement checkout

- Slice: SLICE-001
- Requirements: REQ-0001
- Design decisions: none
- Files: exact paths
- Interfaces: checkout contract
- Test cases: TC-0001
- Evidence: EVID-0001
- Non-goals: none
- Model/effort: bounded implementation
- Status: planned
`,
  "PLAN.md": `# Active Plan

- Active slice: SLICE-001
`,
  "slices/SLICE-001.md": `# SLICE-001 — Checkout

- Status: active
- User approval reference: user:workflow-test:2026-07-18:slice-001-approval
- Slice Steward: slice-steward
- Payment-domain sub-review required: no

## Goal And Outcome

Buyer completes checkout with recoverable failure handling.

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| --- | --- | --- | --- |
| REQ-0001 | approved | active_slice | Buyer completes checkout |

## Design And State Links

- Design decisions: none
- Design-system contracts: none
- Page contracts: none
- Mockups/state boards: none

## Dependencies And Cross-Cutting Requirements

Checkout depends on the documented order contract.

## Explicit Non-Goals

Subscription billing is excluded.

## Deferrals And Removals

| Requirement | Proposed disposition | Reason | Next trigger | User approval reference |
| --- | --- | --- | --- | --- |

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| --- | --- | --- | --- |
| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |

## Knowledge Evidence

- Question and search terms: none
- Wiki pages/source summaries/raw files: none
- Confirmed conclusions and confidence: none
- Contradictions, staleness, assumptions, or gaps: none
- Official verification and retrieval date: none
- Affected identifiers: none

## Skill And Model Routing

| Work | Required or conditional skill | Trigger or non-applicable reason | Assigned agent | Model | Effort | Escalation condition |
| --- | --- | --- | --- | --- | --- | --- |
| Implementation | test-driven development | executable checkout change | implementer-a | coding model | medium | PSP behavior changes |

## Reviewer Assignments

| Lane | Reviewer/agent | Independent from implementer | Model and effort | Required inputs | Decision authority |
| --- | --- | --- | --- | --- | --- |
| Requirements coverage | reviewer-a | yes | strongest, high | register, charter, diff | accept or reject coverage |
| Design fidelity | not applicable: no user-facing design in this slice | yes | not applicable | not applicable | not applicable |
| Engineering quality | reviewer-b | yes | risk-scaled | charter, diff, tests | accept or reject quality |
| Payment-domain engineering sub-review | not applicable: no payment behavior in this slice | yes | not applicable | not applicable | not applicable |

## Entry Criteria

- [x] Requirements and dispositions are valid.
- [x] Coverage and reviewers are assigned.

## Exit Criteria

- [ ] Required tests and evidence pass.
- [ ] Independent review decisions are approved.

## Close Record

- Closed by: pending
- Closed at: pending
- Requirements review decision: pending
- Design review decision: pending
- Engineering review decision: pending
- Payment-domain sub-review decision: pending
- Critical/Important findings: pending
- Minor findings disposition: pending
- Evidence summary: pending
- Progress-log reference: pending
`,
  "tracking/test-cases.md": `# Test Cases

## Test Case Register

${testRegisterHeader}
${testRegisterSeparator}
${testRegisterRow}

### TC-0001 — Complete checkout

- Requirements: REQ-0001
- Slice: SLICE-001
- Evidence: EVID-0001
- Layer: integration
- Preconditions: valid cart
- Action: submit checkout
- Expected: order created
- Negative case: recoverable failure
- Status: planned
`,
  "tracking/evidence.md": `# Evidence

## Evidence Index

${evidenceRegisterHeader}
${evidenceRegisterSeparator}
${evidenceRegisterRow}

### EVID-0001 — Checkout integration proof

- Requirements: REQ-0001
- Slice: SLICE-001
- Type: integration
- Status: planned
- Artifact: pending
- Captured at: pending
- Verified by: pending
- Result: pending
`,
  "tracking/todos.md": `# Todos

- Active slice: SLICE-001
`,
  "tracking/progress.md": `# Progress

- Active slice: SLICE-001
`,
};

async function makeDemo(changes = {}) {
  const demoDir = await mkdtemp(path.join(os.tmpdir(), "demo-workflow-"));
  const files = { ...validFiles };

  for (const [file, change] of Object.entries(changes)) {
    files[file] = typeof change === "function" ? change(files[file]) : change;
  }

  for (const [file, content] of Object.entries(files)) {
    const target = path.join(demoDir, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  return demoDir;
}

async function errorsFor(changes = {}) {
  const demoDir = await makeDemo(changes);
  try {
    return (await validateDemoWorkflow(demoDir)).errors;
  } finally {
    await rm(demoDir, { recursive: true, force: true });
  }
}

function verifiedClosedChanges(
  criticalImportant = "none",
  minorDisposition = "none",
) {
  return {
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          requirementRegisterRow
            .replace("| approved |", "| verified |")
            .replace("| active_slice |", "| complete |")
            .replace("| SLICE-001 |", "| none |"),
        )
        .replace("Lifecycle status: approved", "Lifecycle status: verified")
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: complete",
        )
        .replace("Target slice: SLICE-001", "Target slice: none"),
    "IMPLEMENTATION_PLAN.md": (text) =>
      text
        .replace(
          taskRegisterRow,
          taskRegisterRow.replace("| planned |", "| reviewed |"),
        )
        .replace("Status: planned", "Status: reviewed"),
    "tracking/test-cases.md": (text) =>
      text
        .replace(
          testRegisterRow,
          testRegisterRow.replace("| planned |", "| passing |"),
        )
        .replace("Status: planned", "Status: passing"),
    "tracking/evidence.md": (text) =>
      text
        .replace(
          evidenceRegisterRow,
          evidenceRegisterRow
            .replace("| planned |", "| passing |")
            .replace("| pending |", "| evidence/checkout.json |"),
        )
        .replace("Status: planned", "Status: passing")
        .replace("Artifact: pending", "Artifact: evidence/checkout.json")
        .replace("Captured at: pending", "Captured at: 2026-07-17T12:00:00Z")
        .replace("Verified by: pending", "Verified by: reviewer-b")
        .replace("Result: pending", "Result: passed"),
    "evidence/checkout.json": "{}\n",
    "slices/SLICE-001.md": (text) =>
      text
        .replace("Status: active", "Status: closed")
        .replace(
          "| Engineering quality | reviewer-b | yes | risk-scaled |",
          "| Engineering quality | reviewer-b | yes | strongest, high |",
        )
        .replace(
          "| REQ-0001 | approved | active_slice |",
          "| REQ-0001 | verified | complete |",
        )
        .replace(
          "Requirements review decision: pending",
          "Requirements review decision: approved",
        )
        .replace(
          "Design review decision: pending",
          "Design review decision: not applicable: no user-facing design in this slice",
        )
        .replace(
          "Engineering review decision: pending",
          "Engineering review decision: approved",
        )
        .replace(
          "Payment-domain sub-review decision: pending",
          "Payment-domain sub-review decision: not applicable: no payment behavior in this slice",
        )
        .replace(
          "Critical/Important findings: pending",
          `Critical/Important findings: ${criticalImportant}`,
        )
        .replace(
          "Minor findings disposition: pending",
          `Minor findings disposition: ${minorDisposition}`,
        )
        .replace("Closed by: pending", "Closed by: slice-steward")
        .replace("Closed at: pending", "Closed at: 2026-07-18T12:00:00Z")
        .replace(
          "Evidence summary: pending",
          "Evidence summary: EVID-0001 passed",
        )
        .replace(
          "Progress-log reference: pending",
          "Progress-log reference: tracking/progress.md#slice-001",
        )
        .replaceAll("- [ ]", "- [x]"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) =>
      `${text.replace("SLICE-001", "none")}\n## SLICE-001\n\nClosed with EVID-0001 passing.\n`,
  };
}

function proposedSliceText(id, title) {
  return `# ${id} — ${title}

- Status: proposed
- User approval reference: none
- Slice Steward: slice-steward
- Payment-domain sub-review required: no

## Goal And Outcome

${title} delivers its approved buyer or operator outcome.

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| --- | --- | --- | --- |

## Design And State Links

- Design decisions: none
- Design-system contracts: none
- Page contracts: none
- Mockups/state boards: none

## Dependencies And Cross-Cutting Requirements

Dependencies will be resolved before approval.

## Explicit Non-Goals

Unrelated payment flows are excluded.

## Deferrals And Removals

| Requirement | Proposed disposition | Reason | Next trigger | User approval reference |
| --- | --- | --- | --- | --- |

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| --- | --- | --- | --- |

## Knowledge Evidence

- Question and search terms: none
- Wiki pages/source summaries/raw files: none
- Confirmed conclusions and confidence: none
- Contradictions, staleness, assumptions, or gaps: none
- Official verification and retrieval date: none
- Affected identifiers: none

## Skill And Model Routing

| Work | Required or conditional skill | Trigger or non-applicable reason | Assigned agent | Model | Effort | Escalation condition |
| --- | --- | --- | --- | --- | --- | --- |
| Planning | writing plans | after approval | slice-steward | planning model | medium | requirement ambiguity |

## Reviewer Assignments

| Lane | Reviewer/agent | Independent from implementer | Model and effort | Required inputs | Decision authority |
| --- | --- | --- | --- | --- | --- |

## Entry Criteria

- [ ] Requirements and dispositions are valid.

## Exit Criteria

- [ ] Required tests and evidence pass.

## Close Record

- Closed by: pending
- Closed at: pending
- Requirements review decision: pending
- Design review decision: pending
- Engineering review decision: pending
- Payment-domain sub-review decision: pending
- Critical/Important findings: pending
- Minor findings disposition: pending
- Evidence summary: pending
- Progress-log reference: pending
`;
}

test("accepts a valid active-slice workflow", async () => {
  assert.deepEqual(await errorsFor(), []);
  assert.deepEqual(
    await errorsFor({
      "REQUIREMENTS.md": (text) =>
        text.replace(
          "Failure remains recoverable.",
          "When the PSP is unavailable, checkout shows a recoverable error.",
        ),
    }),
    [],
  );
});

test("rejects invalid lifecycle and disposition combinations", async () => {
  const errors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("Lifecycle status: approved", "Lifecycle status: verified"),
  });
  assert.match(errors.join("\n"), /invalid lifecycle\/disposition combination/);

  const emptyPromiseErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace("  - Buyer completes checkout.", "  - none")
        .replace("  - Failure remains recoverable.", "  - none"),
  });
  assert.match(
    emptyPromiseErrors.join("\n"),
    /REQ-0001 requires concrete acceptance/,
  );
  assert.match(
    emptyPromiseErrors.join("\n"),
    /REQ-0001 requires concrete negative_cases/,
  );

  const missingRequiredProofTypeErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Required test types: integration",
          "Required test types: accessibility",
        )
        .replace(
          "Required evidence types: integration",
          "Required evidence types: hosted, responsive",
        ),
  });
  assert.match(
    missingRequiredProofTypeErrors.join("\n"),
    /REQ-0001 required test type accessibility has no linked test case/,
  );
  assert.match(
    missingRequiredProofTypeErrors.join("\n"),
    /REQ-0001 required evidence type hosted has no linked evidence/,
  );
  assert.match(
    missingRequiredProofTypeErrors.join("\n"),
    /REQ-0001 required evidence type responsive has no linked evidence/,
  );
});

test("rejects missing targets and conditional planning fields", async () => {
  const missingApprovalErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        /Approval reference: user:[^\n]+/,
        "Approval reference: none",
      ),
  });
  assert.match(
    missingApprovalErrors.join("\n"),
    /approved requirement REQ-0001 requires a durable user approval reference/,
  );

  const activeErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("Target slice: SLICE-001", "Target slice: none"),
  });
  assert.match(
    activeErrors.join("\n"),
    /active_slice requires a valid target slice/,
  );

  const blockedErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: blocked",
        )
        .replace("Target slice: SLICE-001", "Target slice: none"),
  });
  assert.match(blockedErrors.join("\n"), /blocked requires blocker/);

  const deferredErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferred",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace(
          "Deferral reason: none",
          "Deferral reason: dependency unavailable",
        )
        .replace("Next trigger: none", "Next trigger: dependency launch")
        .replace(/Approval reference: user:[^\n]+/, "Approval reference: none"),
  });
  assert.match(
    deferredErrors.join("\n"),
    /deferred requires a user approval reference/,
  );

  const verbalDeferredErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferred",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace(
          "Deferral reason: none",
          "Deferral reason: dependency unavailable",
        )
        .replace("Next trigger: none", "Next trigger: dependency launch")
        .replace(
          /Approval reference: user:[^\n]+/,
          "Approval reference: verbal approval",
        ),
  });
  assert.match(
    verbalDeferredErrors.join("\n"),
    /deferred requires a user approval reference/,
  );

  const proposedErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferral_proposed",
        )
        .replace("Target slice: SLICE-001", "Target slice: none"),
  });
  assert.match(
    proposedErrors.join("\n"),
    /deferral_proposed requires deferral_reason and next_trigger/,
  );

  const removedErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace("Lifecycle status: approved", "Lifecycle status: removed")
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: removed",
        )
        .replace("Target slice: SLICE-001", "Target slice: none"),
  });
  assert.match(removedErrors.join("\n"), /removed requires removal_reason/);

  const removedApprovalErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace("Lifecycle status: approved", "Lifecycle status: removed")
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: removed",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace("Removal reason: none", "Removal reason: explicitly withdrawn")
        .replace(/Approval reference: user:[^\n]+/, "Approval reference: none"),
  });
  assert.match(
    removedApprovalErrors.join("\n"),
    /removed requires a user approval reference/,
  );
});

test("rejects malformed, duplicate, and unknown identifiers", async () => {
  const malformedErrors = await errorsFor({
    "REQUIREMENTS.md": (text) => text.replace("REQ-0001 —", "REQ-01 —"),
  });
  assert.match(malformedErrors.join("\n"), /malformed requirement identifier/);

  const malformedRegisterErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterRow,
        requirementRegisterRow.replace("REQ-0001", "REQ-01"),
      ),
  });
  assert.match(
    malformedRegisterErrors.join("\n"),
    /malformed identifier REQ-01/,
  );

  const duplicateErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      `${text}\n${text.slice(text.indexOf("### REQ-0001"))}`,
  });
  assert.match(duplicateErrors.join("\n"), /duplicate identifier REQ-0001/);

  const duplicateFieldErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace(
        "- Slice: SLICE-001",
        "- Slice: SLICE-002\n- Slice: SLICE-001",
      ),
    "slices/SLICE-002.md": proposedSliceText("SLICE-002", "Duplicate owner"),
  });
  assert.match(
    duplicateFieldErrors.join("\n"),
    /TASK-0001 has duplicate field slice/,
  );

  const unknownErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("Task links: TASK-0001", "Task links: TASK-9999"),
  });
  assert.match(unknownErrors.join("\n"), /unknown task TASK-9999/);

  const reverseUnknownErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Requirements: REQ-0001", "Requirements: REQ-9999"),
  });
  assert.match(
    reverseUnknownErrors.join("\n"),
    /TASK-0001 references unknown requirement REQ-9999/,
  );

  const lowercaseHeadingErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace(
        "### TASK-0001 — Implement checkout",
        "### task-0002 — Hidden work\n\n- Slice: SLICE-001\n- Requirements: REQ-0001\n\n### TASK-0001 — Implement checkout",
      ),
  });
  assert.match(
    lowercaseHeadingErrors.join("\n"),
    /malformed task identifier task-0002/,
  );
});

test("rejects register/record drift and non-reciprocal links", async () => {
  const registerErrors = await errorsFor({
    "REQUIREMENTS.md": (text) => text.replace(requirementRegisterRow, ""),
  });
  assert.match(
    registerErrors.join("\n"),
    /REQ-0001 is missing from Requirement Register/,
  );

  const wrongColumnErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterRow,
        "| none | Complete checkout mentions REQ-0001 | approved | active_slice | SLICE-001 | user:workflow-test:2026-07-17:checkout |",
      ),
  });
  assert.match(
    wrongColumnErrors.join("\n"),
    /REQ-0001 is missing from Requirement Register/,
  );

  const duplicateRegisterErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterRow,
        `${requirementRegisterRow}\n| REQ-0001 | Duplicate row | approved | active_slice | SLICE-001 | user:workflow-test:2026-07-17:checkout |`,
      ),
  });
  assert.match(
    duplicateRegisterErrors.join("\n"),
    /Requirement Register has duplicate ID REQ-0001/,
  );

  const missingKeyHeaderErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterHeader,
        requirementRegisterHeader.replace("| ID |", "| Key |"),
      ),
  });
  assert.match(
    missingKeyHeaderErrors.join("\n"),
    /Requirement Register must have exactly one ID key column/,
  );

  const duplicateKeyHeaderErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterHeader,
        requirementRegisterHeader.replace("| ID | Title |", "| ID | ID |"),
      ),
  });
  assert.match(
    duplicateKeyHeaderErrors.join("\n"),
    /Requirement Register must have exactly one ID key column/,
  );

  const multipleKeyErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterRow,
        requirementRegisterRow.replace("REQ-0001 |", "REQ-0001 REQ-0002 |"),
      ),
  });
  assert.match(
    multipleKeyErrors.join("\n"),
    /Requirement Register has invalid ID key REQ-0001 REQ-0002/,
  );

  for (const [file, row, expected] of [
    [
      "IMPLEMENTATION_PLAN.md",
      taskRegisterRow,
      /Task Register has duplicate ID TASK-0001/,
    ],
    [
      "tracking/test-cases.md",
      testRegisterRow,
      /Test Case Register has duplicate ID TC-0001/,
    ],
    [
      "tracking/evidence.md",
      evidenceRegisterRow,
      /Evidence Index has duplicate ID EVID-0001/,
    ],
  ]) {
    const duplicateIndexErrors = await errorsFor({
      [file]: (text) => text.replace(row, `${row}\n${row}`),
    });
    assert.match(duplicateIndexErrors.join("\n"), expected);
  }

  for (const [file, row, replacement, expected] of [
    [
      "IMPLEMENTATION_PLAN.md",
      taskRegisterRow,
      "| none | SLICE-001 mentions TASK-0001 | REQ-0001 | none | TC-0001 | EVID-0001 | planned |",
      /TASK-0001 is missing from Task Register/,
    ],
    [
      "tracking/test-cases.md",
      testRegisterRow,
      "| none | REQ-0001 mentions TC-0001 | SLICE-001 | EVID-0001 | planned |",
      /TC-0001 is missing from Test Case Register/,
    ],
    [
      "tracking/evidence.md",
      evidenceRegisterRow,
      "| none | REQ-0001 mentions EVID-0001 | SLICE-001 | integration | planned | pending |",
      /EVID-0001 is missing from Evidence Index/,
    ],
  ]) {
    const wrongIndexColumnErrors = await errorsFor({
      [file]: (text) => text.replace(row, replacement),
    });
    assert.match(wrongIndexColumnErrors.join("\n"), expected);
  }

  const reciprocalErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Requirements: REQ-0001", "Requirements: none"),
  });
  assert.match(
    reciprocalErrors.join("\n"),
    /TASK-0001 does not link back to REQ-0001/,
  );

  const taskRegisterDriftErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace(
        taskRegisterRow,
        taskRegisterRow.replace("| SLICE-001 |", "| SLICE-002 |"),
      ),
  });
  assert.match(
    taskRegisterDriftErrors.join("\n"),
    /Task Register TASK-0001 Slice disagrees with record/,
  );

  const requirementRegisterDriftErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        requirementRegisterRow,
        requirementRegisterRow.replace("| approved |", "| verified |"),
      ),
  });
  assert.match(
    requirementRegisterDriftErrors.join("\n"),
    /Requirement Register REQ-0001 Lifecycle disagrees with record/,
  );

  const testRegisterDriftErrors = await errorsFor({
    "tracking/test-cases.md": (text) =>
      text.replace(
        testRegisterRow,
        testRegisterRow.replace("| SLICE-001 |", "| SLICE-002 |"),
      ),
  });
  assert.match(
    testRegisterDriftErrors.join("\n"),
    /Test Case Register TC-0001 Slice disagrees with record/,
  );

  const evidenceRegisterDriftErrors = await errorsFor({
    "tracking/evidence.md": (text) =>
      text.replace(
        evidenceRegisterRow,
        evidenceRegisterRow.replace("| planned |", "| captured |"),
      ),
  });
  assert.match(
    evidenceRegisterDriftErrors.join("\n"),
    /Evidence Index EVID-0001 Status disagrees with record/,
  );

  const missingParityColumnsErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text
        .replace(taskRegisterHeader, "| Task |")
        .replace(taskRegisterSeparator, "| --- |")
        .replace(taskRegisterRow, "| TASK-0001 |"),
  });
  assert.match(
    missingParityColumnsErrors.join("\n"),
    /Task Register must have exactly one Slice column/,
  );

  const orphanTaskErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text
        .replace(
          taskRegisterRow,
          `${taskRegisterRow}\n| TASK-0002 | SLICE-001 | none | none | none | none | planned |`,
        )
        .replace(
          "### TASK-0001 — Implement checkout",
          `### TASK-0002 — Unapproved extra behavior

- Slice: SLICE-001
- Requirements: none
- Design decisions: none
- Files: exact paths
- Interfaces: extra behavior
- Test cases: none
- Evidence: none
- Non-goals: none
- Model/effort: bounded implementation
- Status: planned

### TASK-0001 — Implement checkout`,
        ),
  });
  assert.match(
    orphanTaskErrors.join("\n"),
    /TASK-0002 requires at least one governing requirement/,
  );
});

test("requires canonical keyed tables even when they have no rows", async () => {
  const missingTombstoneTableErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(/\n## Tombstone Register[\s\S]*$/, ""),
  });
  assert.match(
    missingTombstoneTableErrors.join("\n"),
    /Tombstone Register must have exactly one ID key column/,
  );

  const missingSliceTablesErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(/## Inherited Requirements[\s\S]*?(?=## Coverage)/, "")
        .replace(/## Coverage[\s\S]*?(?=## Reviewer Assignments)/, ""),
  });
  assert.match(
    missingSliceTablesErrors.join("\n"),
    /Inherited Requirements must have exactly one Requirement key column/,
  );
  assert.match(
    missingSliceTablesErrors.join("\n"),
    /Coverage must have exactly one Requirement key column/,
  );

  const incompleteCoverageSchemaErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| Requirement | Tasks | Test cases | Evidence |\n| --- | --- | --- | --- |\n| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |",
        "| Requirement |\n| --- |\n| REQ-0001 |",
      ),
  });
  for (const column of ["Tasks", "Test cases", "Evidence"]) {
    assert.match(
      incompleteCoverageSchemaErrors.join("\n"),
      new RegExp(`Coverage must have exactly one ${column} column`),
    );
  }

  const missingCharterSectionErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        /## Goal And Outcome[\s\S]*?(?=## Inherited Requirements)/,
        "",
      ),
  });
  assert.match(
    missingCharterSectionErrors.join("\n"),
    /Goal And Outcome must appear exactly once/,
  );

  const missingStewardErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace("- Slice Steward: slice-steward\n", ""),
  });
  assert.match(
    missingStewardErrors.join("\n"),
    /SLICE-001 Slice Steward must appear exactly once/,
  );

  const missingDesignAuthorityErrors = await errorsFor({
    "DESIGN.md": (text) =>
      text.replace(/## Taste Brief[\s\S]*?(?=## Approved Direction)/, ""),
  });
  assert.match(
    missingDesignAuthorityErrors.join("\n"),
    /DESIGN.md: Taste Brief must appear exactly once/,
  );

  const invalidDeferralRowErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| --- | --- | --- | --- | --- |\n\n## Coverage",
        "| --- | --- | --- | --- | --- |\n| REQ-0001 | deferred | none | none | none |\n\n## Coverage",
      ),
  });
  assert.match(
    invalidDeferralRowErrors.join("\n"),
    /Deferrals And Removals REQ-0001 disposition deferred disagrees with REQUIREMENTS.md/,
  );
  assert.match(
    invalidDeferralRowErrors.join("\n"),
    /Deferrals And Removals REQ-0001 deferred requires concrete reason and next trigger/,
  );

  const approvedProposalRowErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          requirementRegisterRow
            .replace("| active_slice |", "| deferral_proposed |")
            .replace("| SLICE-001 |", "| none |"),
        )
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferral_proposed",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace("Deferral reason: none", "Deferral reason: dependency pause")
        .replace("Next trigger: none", "Next trigger: dependency launch"),
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| --- | --- | --- | --- | --- |\n\n## Coverage",
        "| --- | --- | --- | --- | --- |\n| REQ-0001 | deferral_proposed | dependency pause | dependency launch | user:workflow-test:2026-07-18:premature-deferral-approval |\n\n## Coverage",
      ),
  });
  assert.match(
    approvedProposalRowErrors.join("\n"),
    /deferral_proposed requires pending user approval/,
  );
});

test("rejects incomplete active-slice coverage", async () => {
  for (const [line, expected] of [
    ["Task links: TASK-0001", "task_links"],
    ["Test links: TC-0001", "test_links"],
    ["Evidence links: EVID-0001", "evidence_links"],
  ]) {
    const errors = await errorsFor({
      "REQUIREMENTS.md": (text) =>
        text.replace(line, `${line.split(":")[0]}: none`),
    });
    assert.match(
      errors.join("\n"),
      new RegExp(`active-slice requirement REQ-0001 requires ${expected}`),
    );
  }

  const misplacedErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |",
          "| REQ-0001 | none | none | none |",
        )
        .replace(
          "## Reviewer Assignments",
          "TASK-0001 TC-0001 EVID-0001\n\n## Reviewer Assignments",
        ),
  });
  assert.match(
    misplacedErrors.join("\n"),
    /coverage row for REQ-0001 is missing TASK-0001/,
  );

  const inheritedProseErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "| REQ-0001 | approved | active_slice | Buyer completes checkout |",
          "",
        )
        .replace(
          "## Coverage",
          "REQ-0001 appears only in prose.\n\n## Coverage",
        ),
  });
  assert.match(
    inheritedProseErrors.join("\n"),
    /active-slice requirement REQ-0001 is not inherited by SLICE-001/,
  );

  const duplicateCoverageErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |",
        "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |\n| REQ-0001 | none | none | none |",
      ),
  });
  assert.match(
    duplicateCoverageErrors.join("\n"),
    /Coverage has duplicate requirement row REQ-0001/,
  );

  const duplicateInheritedErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | approved | active_slice | Buyer completes checkout |",
        "| REQ-0001 | approved | active_slice | Buyer completes checkout |\n| REQ-0001 | approved | active_slice | Conflicting duplicate |",
      ),
  });
  assert.match(
    duplicateInheritedErrors.join("\n"),
    /Inherited Requirements has duplicate requirement row REQ-0001/,
  );

  const inheritedStateDriftErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | approved | active_slice | Buyer completes checkout |",
        "| REQ-0001 | verified | complete | Buyer completes checkout |",
      ),
  });
  assert.match(
    inheritedStateDriftErrors.join("\n"),
    /Inherited Requirements REQ-0001 Lifecycle disagrees with REQUIREMENTS.md/,
  );
  assert.match(
    inheritedStateDriftErrors.join("\n"),
    /Inherited Requirements REQ-0001 Disposition disagrees with REQUIREMENTS.md/,
  );

  const emptyInheritedAcceptanceErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | approved | active_slice | Buyer completes checkout |",
        "| REQ-0001 | approved | active_slice | none |",
      ),
  });
  assert.match(
    emptyInheritedAcceptanceErrors.join("\n"),
    /Inherited Requirements REQ-0001 requires concrete Acceptance in this slice/,
  );

  const extraCoverageRequirementErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          `${requirementRegisterRow}\n| REQ-0002 | Optional wishlist | draft | unassigned | none | user:workflow-test:2026-07-18:wishlist |`,
        )
        .replace(
          "## Tombstone Register",
          `### REQ-0002 — Optional wishlist

- Audience: buyer
- Source: user:workflow-test:2026-07-18:wishlist
- Lifecycle status: draft
- Planning disposition: unassigned
- Target slice: none
- Blocker: none
- Deferral reason: none
- Removal reason: none
- Next trigger: none
- Approval reference: none
- Acceptance: none
- Negative cases: none
- Dependencies: none
- Affected surfaces: none
- Required test types: none
- Required evidence types: none
- Exclusions: none
- Payment-domain review required: no
- Payment-domain review reason: draft scope has no provider behavior
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none

## Tombstone Register`,
        ),
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |",
        "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |\n| REQ-0002 | none | none | none |",
      ),
  });
  assert.match(
    extraCoverageRequirementErrors.join("\n"),
    /coverage requirement REQ-0002 is not inherited by SLICE-001/,
  );

  const deferredExecutionErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          requirementRegisterRow
            .replace("| active_slice |", "| deferred |")
            .replace("| SLICE-001 |", "| none |"),
        )
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferred",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace(
          "Deferral reason: none",
          "Deferral reason: approved future work",
        )
        .replace("Next trigger: none", "Next trigger: dependency launch"),
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| REQ-0001 | approved | active_slice |",
        "| REQ-0001 | approved | deferred |",
      ),
  });
  assert.match(
    deferredExecutionErrors.join("\n"),
    /active slice SLICE-001 cannot inherit REQ-0001 with disposition deferred/,
  );

  const deferredExecutableWorkErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          requirementRegisterRow
            .replace("| active_slice |", "| deferred |")
            .replace("| SLICE-001 |", "| none |"),
        )
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: deferred",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace(
          "Deferral reason: none",
          "Deferral reason: user-approved pause",
        )
        .replace("Next trigger: none", "Next trigger: dependency launch"),
    "slices/SLICE-001.md": () =>
      proposedSliceText("SLICE-001", "Deferred work owner"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    deferredExecutableWorkErrors.join("\n"),
    /non-retired TASK-0001 is incompatible with REQ-0001 disposition deferred/,
  );

  for (const [file, row, detail] of [
    ["IMPLEMENTATION_PLAN.md", taskRegisterRow, "Status: planned"],
    ["tracking/test-cases.md", testRegisterRow, "Status: planned"],
    ["tracking/evidence.md", evidenceRegisterRow, "Status: planned"],
  ]) {
    const retiredCoverageErrors = await errorsFor({
      [file]: (text) =>
        text
          .replace(row, row.replace("| planned |", "| retired |"))
          .replace(detail, "Status: retired"),
    });
    assert.match(
      retiredCoverageErrors.join("\n"),
      /retired and cannot cover active-slice requirement REQ-0001/,
    );
  }
});

test("rejects cross-slice ownership and premature future-slice links", async () => {
  const secondSlice = proposedSliceText("SLICE-002", "Future work");
  const crossSliceErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replaceAll("Slice: SLICE-001", "Slice: SLICE-002"),
    "tracking/test-cases.md": (text) =>
      text.replaceAll("Slice: SLICE-001", "Slice: SLICE-002"),
    "tracking/evidence.md": (text) =>
      text.replaceAll("Slice: SLICE-001", "Slice: SLICE-002"),
    "slices/SLICE-002.md": secondSlice,
  });
  assert.match(
    crossSliceErrors.join("\n"),
    /TASK-0001 must belong to target slice SLICE-001/,
  );
  assert.match(
    crossSliceErrors.join("\n"),
    /TC-0001 must belong to target slice SLICE-001/,
  );
  assert.match(
    crossSliceErrors.join("\n"),
    /EVID-0001 must belong to target slice SLICE-001/,
  );

  const multiSliceErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Slice: SLICE-001", "Slice: SLICE-001, SLICE-002"),
    "tracking/test-cases.md": (text) =>
      text.replace("Slice: SLICE-001", "Slice: SLICE-001, SLICE-002"),
    "tracking/evidence.md": (text) =>
      text.replace("Slice: SLICE-001", "Slice: SLICE-001, SLICE-002"),
    "slices/SLICE-002.md": secondSlice,
  });
  assert.match(
    multiSliceErrors.join("\n"),
    /TASK-0001 must belong only to target slice SLICE-001/,
  );
  assert.match(
    multiSliceErrors.join("\n"),
    /TC-0001 must belong only to target slice SLICE-001/,
  );
  assert.match(
    multiSliceErrors.join("\n"),
    /EVID-0001 must belong only to target slice SLICE-001/,
  );

  for (const invalidSlice of [
    "SLICE-001, SLICE-001",
    "none",
    "owned by SLICE-001",
  ]) {
    const exactOwnershipErrors = await errorsFor({
      "IMPLEMENTATION_PLAN.md": (text) =>
        text.replace("Slice: SLICE-001", `Slice: ${invalidSlice}`),
      "tracking/test-cases.md": (text) =>
        text.replace("Slice: SLICE-001", `Slice: ${invalidSlice}`),
      "tracking/evidence.md": (text) =>
        text.replace("Slice: SLICE-001", `Slice: ${invalidSlice}`),
    });
    for (const id of ["TASK-0001", "TC-0001", "EVID-0001"]) {
      assert.match(
        exactOwnershipErrors.join("\n"),
        new RegExp(`${id} must belong to exactly one slice`),
      );
    }
  }

  const futureErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace(
        "Planning disposition: active_slice",
        "Planning disposition: future_slice",
      ),
    "slices/SLICE-001.md": (text) =>
      text.replace("Status: active", "Status: proposed"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    futureErrors.join("\n"),
    /future_slice targeting proposed SLICE-001 cannot have speculative task, test, or evidence links/,
  );

  const omittedApprovedFutureCoverageErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          requirementRegisterRow,
          requirementRegisterRow.replace(
            "| active_slice |",
            "| future_slice |",
          ),
        )
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: future_slice",
        ),
    "slices/SLICE-001.md": (text) =>
      text
        .replace("Status: active", "Status: approved")
        .replace(
          "| REQ-0001 | approved | active_slice | Buyer completes checkout |",
          "",
        )
        .replace("| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |", ""),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    omittedApprovedFutureCoverageErrors.join("\n"),
    /non-retired TASK-0001 is incompatible with REQ-0001 disposition future_slice and owner SLICE-001 status approved/,
  );
});

test("rejects verified requirements without passing proof", async () => {
  const errors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace("Lifecycle status: approved", "Lifecycle status: verified")
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: complete",
        )
        .replace("Target slice: SLICE-001", "Target slice: none"),
    "tracking/evidence.md": (text) =>
      text.replace("Status: planned", "Status: failed"),
  });
  assert.match(
    errors.join("\n"),
    /verified requirement REQ-0001 requires passing evidence EVID-0001/,
  );

  const missingProofErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace("Lifecycle status: approved", "Lifecycle status: verified")
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: complete",
        )
        .replace("Target slice: SLICE-001", "Target slice: none")
        .replace("Test links: TC-0001", "Test links: none")
        .replace("Evidence links: EVID-0001", "Evidence links: none"),
  });
  assert.match(
    missingProofErrors.join("\n"),
    /verified requirement REQ-0001 requires at least one test link/,
  );
  assert.match(
    missingProofErrors.join("\n"),
    /verified requirement REQ-0001 requires at least one evidence link/,
  );

  const placeholderEvidenceErrors = await errorsFor({
    "tracking/evidence.md": (text) =>
      text
        .replace(
          evidenceRegisterRow,
          evidenceRegisterRow
            .replace("| planned |", "| passing |")
            .replace("| pending |", "| unavailable |"),
        )
        .replace("Status: planned", "Status: passing")
        .replace("Artifact: pending", "Artifact: unavailable")
        .replace("Captured at: pending", "Captured at: not recorded")
        .replace("Verified by: pending", "Verified by: unassigned reviewer")
        .replace("Result: pending", "Result: unknown"),
  });
  for (const field of ["artifact", "captured_at", "verified_by", "result"]) {
    assert.match(
      placeholderEvidenceErrors.join("\n"),
      new RegExp(`passing evidence EVID-0001 requires ${field}`),
    );
  }

  const failedResultEvidenceErrors = await errorsFor({
    "tracking/evidence.md": (text) =>
      text
        .replace(
          evidenceRegisterRow,
          evidenceRegisterRow
            .replace("| planned |", "| passing |")
            .replace("| pending |", "| evidence/checkout.json |"),
        )
        .replace("Status: planned", "Status: passing")
        .replace("Artifact: pending", "Artifact: evidence/checkout.json")
        .replace("Captured at: pending", "Captured at: 2026-07-18T10:00:00Z")
        .replace("Verified by: pending", "Verified by: reviewer-b")
        .replace("Result: pending", "Result: failed"),
  });
  assert.match(
    failedResultEvidenceErrors.join("\n"),
    /passing evidence EVID-0001 result must indicate success/,
  );

  const placeholderPassingTestErrors = await errorsFor({
    "tracking/test-cases.md": (text) =>
      text
        .replace(
          testRegisterRow,
          testRegisterRow.replace("| planned |", "| passing |"),
        )
        .replace("Preconditions: valid cart", "Preconditions: none")
        .replace("Action: submit checkout", "Action: none")
        .replace("Expected: order created", "Expected: none")
        .replace("Negative case: recoverable failure", "Negative case: none")
        .replace("Status: planned", "Status: passing"),
  });
  for (const field of [
    "preconditions",
    "action",
    "expected",
    "negative_case",
  ]) {
    assert.match(
      placeholderPassingTestErrors.join("\n"),
      new RegExp(`passing test TC-0001 requires ${field}`),
    );
  }

  const invalidCalendarEvidenceChanges = verifiedClosedChanges();
  const invalidTimestampChange =
    invalidCalendarEvidenceChanges["tracking/evidence.md"];
  invalidCalendarEvidenceChanges["tracking/evidence.md"] = (text) =>
    invalidTimestampChange(text).replace(
      "2026-07-17T12:00:00Z",
      "2026-02-31T12:00:00Z",
    );
  const invalidCalendarEvidenceErrors = await errorsFor(
    invalidCalendarEvidenceChanges,
  );
  assert.match(
    invalidCalendarEvidenceErrors.join("\n"),
    /passing evidence EVID-0001 requires captured_at as a real ISO timestamp/,
  );

  const missingArtifactChanges = verifiedClosedChanges();
  const missingArtifactChange = missingArtifactChanges["tracking/evidence.md"];
  missingArtifactChanges["tracking/evidence.md"] = (text) =>
    missingArtifactChange(text).replaceAll(
      "evidence/checkout.json",
      "evidence/missing.json",
    );
  const missingArtifactErrors = await errorsFor(missingArtifactChanges);
  assert.match(
    missingArtifactErrors.join("\n"),
    /passing evidence EVID-0001 local artifact does not exist: evidence\/missing.json/,
  );
});

test("accepts a fully verified and reviewed closed slice", async () => {
  assert.deepEqual(await errorsFor(verifiedClosedChanges()), []);
  assert.deepEqual(
    await errorsFor(
      verifiedClosedChanges(
        "resolved: REVIEW-2026-07-18-01",
        "accepted: FINDING-03=accepted risk documented",
      ),
    ),
    [],
  );

  const plannedTaskChanges = verifiedClosedChanges();
  const implementationChange = plannedTaskChanges["IMPLEMENTATION_PLAN.md"];
  plannedTaskChanges["IMPLEMENTATION_PLAN.md"] = (text) =>
    implementationChange(text)
      .replace("| reviewed |", "| planned |")
      .replace("Status: reviewed", "Status: planned");
  const plannedTaskErrors = await errorsFor(plannedTaskChanges);
  assert.match(
    plannedTaskErrors.join("\n"),
    /verified requirement REQ-0001 requires completed task TASK-0001/,
  );

  const incompleteReviewedTaskChanges = verifiedClosedChanges();
  const reviewedTaskChange =
    incompleteReviewedTaskChanges["IMPLEMENTATION_PLAN.md"];
  incompleteReviewedTaskChanges["IMPLEMENTATION_PLAN.md"] = (text) =>
    reviewedTaskChange(text)
      .replace("Files: exact paths", "Files: none")
      .replace("Interfaces: checkout contract", "Interfaces: none")
      .replace("Model/effort: bounded implementation", "Model/effort: none");
  const incompleteReviewedTaskErrors = await errorsFor(
    incompleteReviewedTaskChanges,
  );
  for (const field of ["files", "interfaces", "model/effort"]) {
    assert.match(
      incompleteReviewedTaskErrors.join("\n"),
      new RegExp(`TASK-0001 requires concrete ${field}`),
    );
  }

  const unverifiedReviewedTaskChanges = verifiedClosedChanges();
  const linkedTaskChange =
    unverifiedReviewedTaskChanges["IMPLEMENTATION_PLAN.md"];
  unverifiedReviewedTaskChanges["IMPLEMENTATION_PLAN.md"] = (text) =>
    linkedTaskChange(text)
      .replace("Test cases: TC-0001", "Test cases: none")
      .replace("Evidence: EVID-0001", "Evidence: none");
  const unverifiedReviewedTaskErrors = await errorsFor(
    unverifiedReviewedTaskChanges,
  );
  assert.match(
    unverifiedReviewedTaskErrors.join("\n"),
    /TASK-0001 requires at least one test case/,
  );
  assert.match(
    unverifiedReviewedTaskErrors.join("\n"),
    /TASK-0001 requires at least one evidence link/,
  );

  const missingClosedCoverageChanges = verifiedClosedChanges();
  const closedCoverageChange =
    missingClosedCoverageChanges["slices/SLICE-001.md"];
  missingClosedCoverageChanges["slices/SLICE-001.md"] = (text) =>
    closedCoverageChange(text).replace(
      "| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |",
      "| REQ-0001 | none | none | none |",
    );
  const missingClosedCoverageErrors = await errorsFor(
    missingClosedCoverageChanges,
  );
  for (const id of ["TASK-0001", "TC-0001", "EVID-0001"]) {
    assert.match(
      missingClosedCoverageErrors.join("\n"),
      new RegExp(`coverage row for REQ-0001 is missing ${id}`),
    );
  }

  const wrongClosedOwnerChanges = verifiedClosedChanges();
  wrongClosedOwnerChanges["IMPLEMENTATION_PLAN.md"] = (text) =>
    verifiedClosedChanges()
      ["IMPLEMENTATION_PLAN.md"](text)
      .replaceAll("SLICE-001", "SLICE-002");
  wrongClosedOwnerChanges["tracking/test-cases.md"] = (text) =>
    verifiedClosedChanges()
      ["tracking/test-cases.md"](text)
      .replaceAll("SLICE-001", "SLICE-002");
  wrongClosedOwnerChanges["tracking/evidence.md"] = (text) =>
    verifiedClosedChanges()
      ["tracking/evidence.md"](text)
      .replaceAll("SLICE-001", "SLICE-002");
  wrongClosedOwnerChanges["slices/SLICE-002.md"] = proposedSliceText(
    "SLICE-002",
    "Unrelated work",
  );
  const wrongClosedOwnerErrors = await errorsFor(wrongClosedOwnerChanges);
  for (const id of ["TASK-0001", "TC-0001", "EVID-0001"]) {
    assert.match(
      wrongClosedOwnerErrors.join("\n"),
      new RegExp(`${id} must belong to inherited slice SLICE-001`),
    );
  }

  const proposedOwnerChanges = verifiedClosedChanges();
  proposedOwnerChanges["slices/SLICE-001.md"] = () =>
    proposedSliceText("SLICE-001", "Unapproved proof owner");
  const proposedOwnerErrors = await errorsFor(proposedOwnerChanges);
  assert.match(
    proposedOwnerErrors.join("\n"),
    /verified requirement REQ-0001 requires a closed owner slice/,
  );
});

test("rejects slice closure with unresolved requirements or review decisions", async () => {
  const unresolvedErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace("Status: active", "Status: closed"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    unresolvedErrors.join("\n"),
    /closed slice SLICE-001 has unresolved requirement REQ-0001/,
  );
  assert.match(
    unresolvedErrors.join("\n"),
    /closed slice SLICE-001 requires approved requirements review decision/,
  );
  assert.match(
    unresolvedErrors.join("\n"),
    /closed slice SLICE-001 has unresolved Critical\/Important findings/,
  );
  assert.match(
    unresolvedErrors.join("\n"),
    /closed slice SLICE-001 requires explicit accepted Minor dispositions/,
  );

  for (const field of [
    "Closed by",
    "Closed at",
    "Evidence summary",
    "Progress-log reference",
  ]) {
    const missingTraceChanges = verifiedClosedChanges();
    const traceSliceChange = missingTraceChanges["slices/SLICE-001.md"];
    missingTraceChanges["slices/SLICE-001.md"] = (text) =>
      traceSliceChange(text).replace(new RegExp(`^- ${field}:.*\\n`, "m"), "");
    const missingTraceErrors = await errorsFor(missingTraceChanges);
    assert.match(
      missingTraceErrors.join("\n"),
      new RegExp(`Close Record is missing field ${field}`),
    );
  }

  const unresolvedCloseTraceChanges = verifiedClosedChanges();
  const unresolvedTraceSliceChange =
    unresolvedCloseTraceChanges["slices/SLICE-001.md"];
  unresolvedCloseTraceChanges["slices/SLICE-001.md"] = (text) =>
    unresolvedTraceSliceChange(text)
      .replace(
        "Evidence summary: EVID-0001 passed",
        "Evidence summary: EVID-9999 passed",
      )
      .replace(
        "Progress-log reference: tracking/progress.md#slice-001",
        "Progress-log reference: tracking/progress.md#does-not-exist",
      );
  const unresolvedCloseTraceErrors = await errorsFor(
    unresolvedCloseTraceChanges,
  );
  assert.match(
    unresolvedCloseTraceErrors.join("\n"),
    /Evidence summary must reference passing evidence/,
  );
  assert.match(
    unresolvedCloseTraceErrors.join("\n"),
    /Progress-log reference must resolve to tracking\/progress.md/,
  );

  const uncheckedExitChanges = verifiedClosedChanges();
  const checkedExitSliceChange = uncheckedExitChanges["slices/SLICE-001.md"];
  uncheckedExitChanges["slices/SLICE-001.md"] = (text) =>
    checkedExitSliceChange(text).replace(
      "- [x] Required tests and evidence pass.",
      "- [ ] Required tests and evidence pass.",
    );
  const uncheckedExitErrors = await errorsFor(uncheckedExitChanges);
  assert.match(
    uncheckedExitErrors.join("\n"),
    /closed slice SLICE-001 requires all Exit Criteria checked/,
  );

  const disguisedPendingErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace("Status: active", "Status: closed")
        .replace(
          "Requirements review decision: pending",
          "Requirements review decision: approved",
        )
        .replace(
          "Design review decision: pending",
          "Design review decision: not applicable: no user-facing design",
        )
        .replace(
          "Engineering review decision: pending",
          "Engineering review decision: approved",
        )
        .replace(
          "Payment-domain sub-review decision: pending",
          "Payment-domain sub-review decision: not applicable: no payment behavior",
        )
        .replace(
          "Critical/Important findings: pending",
          "Critical/Important findings: resolved: pending",
        )
        .replace(
          "Minor findings disposition: pending",
          "Minor findings disposition: accepted: pending",
        ),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    disguisedPendingErrors.join("\n"),
    /closed slice SLICE-001 has unresolved Critical\/Important findings/,
  );
  assert.match(
    disguisedPendingErrors.join("\n"),
    /closed slice SLICE-001 requires explicit accepted Minor dispositions/,
  );

  for (const [criticalValue, minorValue] of [
    ["resolved: unresolved", "none"],
    ["resolved: none", "none"],
    ["resolved: unknown status owner", "none"],
    ["none", "accepted: tbd"],
    ["none", "accepted: not applicable because no owner"],
    ["none", "accepted: REVIEW-123"],
    ["none", "accepted: FINDING-03"],
  ]) {
    const invalidPayloadErrors = await errorsFor({
      "slices/SLICE-001.md": (text) =>
        text
          .replace("Status: active", "Status: closed")
          .replace(
            "Requirements review decision: pending",
            "Requirements review decision: approved",
          )
          .replace(
            "Design review decision: pending",
            "Design review decision: not applicable: no user-facing design",
          )
          .replace(
            "Engineering review decision: pending",
            "Engineering review decision: approved",
          )
          .replace(
            "Payment-domain sub-review decision: pending",
            "Payment-domain sub-review decision: not applicable: no payment behavior",
          )
          .replace(
            "Critical/Important findings: pending",
            `Critical/Important findings: ${criticalValue}`,
          )
          .replace(
            "Minor findings disposition: pending",
            `Minor findings disposition: ${minorValue}`,
          ),
      "PLAN.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
    });
    const expected =
      criticalValue === "none"
        ? /Minor dispositions/
        : /Critical\/Important findings/;
    assert.match(invalidPayloadErrors.join("\n"), expected);
  }

  const invalidNonApplicabilityErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace("Status: active", "Status: closed")
        .replace(
          "Requirements review decision: pending",
          "Requirements review decision: approved",
        )
        .replace(
          "Design review decision: pending",
          "Design review decision: not applicable: pending",
        )
        .replace(
          "Engineering review decision: pending",
          "Engineering review decision: approved",
        )
        .replace(
          "Payment-domain sub-review decision: pending",
          "Payment-domain sub-review decision: not applicable: pending",
        )
        .replace(
          "Critical/Important findings: pending",
          "Critical/Important findings: none",
        )
        .replace(
          "Minor findings disposition: pending",
          "Minor findings disposition: none",
        ),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    invalidNonApplicabilityErrors.join("\n"),
    /approved or explicitly non-applicable design review decision/,
  );
  assert.match(
    invalidNonApplicabilityErrors.join("\n"),
    /invalid payment-domain sub-review decision/,
  );

  const duplicateCloseChanges = verifiedClosedChanges();
  const closeSliceChange = duplicateCloseChanges["slices/SLICE-001.md"];
  duplicateCloseChanges["slices/SLICE-001.md"] = (text) =>
    closeSliceChange(text).replace(
      "- Engineering review decision: approved",
      "- Engineering review decision: approved\n- Engineering review decision: pending",
    );
  const duplicateCloseErrors = await errorsFor(duplicateCloseChanges);
  assert.match(
    duplicateCloseErrors.join("\n"),
    /Close Record has duplicate field Engineering review decision/,
  );
});

test("rejects non-independent or missing required reviewers", async () => {
  const hiddenPaymentRequirementErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Payment-domain review required: no",
          "Payment-domain review required: yes",
        )
        .replace(
          "Payment-domain review reason: fixture has no provider-specific behavior",
          "Payment-domain review reason: PayPal order semantics require wiki evidence",
        ),
  });
  assert.match(
    hiddenPaymentRequirementErrors.join("\n"),
    /SLICE-001 payment-domain sub-review no disagrees with inherited requirements \(yes\)/,
  );

  assert.deepEqual(
    await errorsFor({
      "slices/SLICE-001.md": (text) =>
        text.replace(
          "| Implementation | test-driven development | executable checkout change | implementer-a | coding model | medium | PSP behavior changes |",
          "| Implementation | test-driven development | executable checkout change | implementer-a | coding model | medium | PSP behavior changes |\n| Requirements review | requesting code review | before closure | reviewer-a | strongest review model | high | coverage ambiguity |",
        ),
    }),
    [],
  );

  const implementerReviewerErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| Requirements coverage | reviewer-a | yes | strongest, high |",
        "| Requirements coverage | implementer-a | yes | fast, low |",
      ),
  });
  assert.match(
    implementerReviewerErrors.join("\n"),
    /Requirements coverage reviewer implementer-a is assigned implementation work/,
  );
  assert.match(
    implementerReviewerErrors.join("\n"),
    /Requirements coverage reviewer requires strongest high-effort review/,
  );

  const lowEffortClosureChanges = verifiedClosedChanges();
  const strongClosureSliceChange =
    lowEffortClosureChanges["slices/SLICE-001.md"];
  lowEffortClosureChanges["slices/SLICE-001.md"] = (text) =>
    strongClosureSliceChange(text).replace(
      "| Engineering quality | reviewer-b | yes | strongest, high |",
      "| Engineering quality | reviewer-b | yes | fast, low |",
    );
  const lowEffortClosureErrors = await errorsFor(lowEffortClosureChanges);
  assert.match(
    lowEffortClosureErrors.join("\n"),
    /Engineering quality reviewer requires strongest high-effort review/,
  );

  const independenceErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| Engineering quality | reviewer-b | yes |",
        "| Engineering quality | reviewer-b | no |",
      ),
  });
  assert.match(
    independenceErrors.join("\n"),
    /Engineering quality reviewer must be independent/,
  );

  const incompleteErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| Engineering quality | reviewer-b |",
        "| Engineering quality | none |",
      ),
  });
  assert.match(
    incompleteErrors.join("\n"),
    /complete engineering quality reviewer assignment/,
  );

  const paymentErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "Payment-domain sub-review required: no",
          "Payment-domain sub-review required: yes",
        )
        .replace(/^\| Payment-domain engineering sub-review.*\n/m, ""),
  });
  assert.match(
    paymentErrors.join("\n"),
    /payment-domain engineering sub-review assignment/,
  );

  const paymentIdentityErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "Payment-domain sub-review required: no",
          "Payment-domain sub-review required: yes",
        )
        .replace(
          "| Payment-domain engineering sub-review | not applicable: no payment behavior in this slice | yes | not applicable | not applicable | not applicable |",
          "| Payment-domain engineering sub-review | none | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
        ),
  });
  assert.match(
    paymentIdentityErrors.join("\n"),
    /payment-domain engineering sub-review assignment/,
  );

  const missingPaymentKnowledgeErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "Payment-domain sub-review required: no",
          "Payment-domain sub-review required: yes",
        )
        .replace(
          "| Payment-domain engineering sub-review | not applicable: no payment behavior in this slice | yes | not applicable | not applicable | not applicable |",
          "| Payment-domain engineering sub-review | reviewer-payments | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
        ),
  });
  assert.match(
    missingPaymentKnowledgeErrors.join("\n"),
    /payment slice SLICE-001 requires concrete Knowledge Evidence field Question and search terms/,
  );

  for (const invalidRow of [
    "| Payment-domain engineering sub-review | not applicable: unavailable | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | pending: assignment | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | pending assignment | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | not applicable: unavailable | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | tbd | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | unknown model owner | Knowledge Evidence and diff | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | strongest payment, high | unknown | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | strongest payment, high | unknown inputs owner | accept or reject PSP semantics |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | strongest payment, high | Knowledge Evidence and diff | unassigned: authority |",
    "| Payment-domain engineering sub-review | reviewer-payments | yes | strongest payment, high | Knowledge Evidence and diff | unassigned authority owner |",
    "| Payment-domain engineering sub-review | unavailable | yes | strongest payment, high | Knowledge Evidence and diff | accept or reject PSP semantics |",
  ]) {
    const qualifiedPlaceholderErrors = await errorsFor({
      "slices/SLICE-001.md": (text) =>
        text
          .replace(
            "Payment-domain sub-review required: no",
            "Payment-domain sub-review required: yes",
          )
          .replace(
            "| Payment-domain engineering sub-review | not applicable: no payment behavior in this slice | yes | not applicable | not applicable | not applicable |",
            invalidRow,
          ),
    });
    assert.match(
      qualifiedPlaceholderErrors.join("\n"),
      /payment-domain engineering sub-review assignment/,
    );
  }

  const noReasonErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "not applicable: no payment behavior in this slice",
        "not applicable",
      ),
  });
  assert.match(
    noReasonErrors.join("\n"),
    /payment-domain sub-review non-applicability reason/,
  );

  const duplicateReviewerErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "| Engineering quality | reviewer-b | yes | risk-scaled | charter, diff, tests | accept or reject quality |",
        "| Engineering quality | reviewer-b | yes | risk-scaled | charter, diff, tests | accept or reject quality |\n| Engineering quality | reviewer-c | yes | strongest, high | charter, diff, tests | accept or reject quality |",
      ),
  });
  assert.match(
    duplicateReviewerErrors.join("\n"),
    /Reviewer Assignments has duplicate lane engineering quality/,
  );

  const reorderedReviewerErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text
        .replace(
          "Independent from implementer | Model and effort",
          "Model and effort | Independent from implementer",
        )
        .replace(
          "| Engineering quality | reviewer-b | yes | risk-scaled |",
          "| Engineering quality | reviewer-b | yes | no |",
        ),
  });
  assert.match(
    reorderedReviewerErrors.join("\n"),
    /Engineering quality reviewer must be independent/,
  );
});

test("rejects active-plan and tracking disagreement", async () => {
  const errors = await errorsFor({
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(errors.join("\n"), /active slice disagreement/);

  const duplicateActiveSliceErrors = await errorsFor({
    "PLAN.md": (text) =>
      text.replace(
        "- Active slice: SLICE-001",
        "- Active slice: SLICE-001\n- Active slice: none",
      ),
  });
  assert.match(
    duplicateActiveSliceErrors.join("\n"),
    /PLAN.md: Active slice must appear exactly once/,
  );
});

test("rejects non-durable user sources and invalid target-slice state", async () => {
  const sourceErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replaceAll(
        "user:workflow-test:2026-07-17:checkout",
        "user:checkout",
      ),
  });
  assert.match(sourceErrors.join("\n"), /durable user source/);

  const missingSourceErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replaceAll("user:workflow-test:2026-07-17:checkout", "none"),
  });
  assert.match(missingSourceErrors.join("\n"), /requires a durable source/);

  assert.deepEqual(
    await errorsFor({
      "REQUIREMENTS.md": (text) =>
        text.replaceAll(
          "user:workflow-test:2026-07-17:checkout",
          "repo:demos/example/REQUIREMENTS.md#checkout@2026-07-18",
        ),
    }),
    [],
  );

  const targetErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace("Status: active", "Status: closed"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    targetErrors.join("\n"),
    /active_slice target SLICE-001 must be approved, active, or blocked/,
  );

  assert.deepEqual(
    await errorsFor({
      "slices/SLICE-001.md": (text) =>
        text.replace("Status: active", "Status: blocked"),
      "PLAN.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
    }),
    [],
  );

  const unreviewedBlockedSliceErrors = await errorsFor({
    "slices/SLICE-002.md": proposedSliceText(
      "SLICE-002",
      "Blocked unreviewed work",
    )
      .replace("Status: proposed", "Status: blocked")
      .replace(
        "User approval reference: none",
        "User approval reference: user:workflow-test:2026-07-18:blocked-slice",
      ),
  });
  assert.match(
    unreviewedBlockedSliceErrors.join("\n"),
    /SLICE-002 requires a complete requirements coverage reviewer assignment/,
  );

  const futureErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text
        .replace(
          "Planning disposition: active_slice",
          "Planning disposition: future_slice",
        )
        .replace("Task links: TASK-0001", "Task links: none")
        .replace("Test links: TC-0001", "Test links: none")
        .replace("Evidence links: EVID-0001", "Evidence links: none"),
  });
  assert.match(
    futureErrors.join("\n"),
    /future_slice target SLICE-001 must be proposed or approved/,
  );

  const duplicateSliceStatusErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace("- Status: active", "- Status: active\n- Status: closed"),
  });
  assert.match(
    duplicateSliceStatusErrors.join("\n"),
    /SLICE-001 Status must appear exactly once/,
  );

  const malformedSliceFileErrors = await errorsFor({
    "slices/SLICE-02.md": proposedSliceText(
      "SLICE-002",
      "Malformed hidden slice",
    ).replaceAll("SLICE-002", "SLICE-02"),
  });
  assert.match(
    malformedSliceFileErrors.join("\n"),
    /malformed slice filename SLICE-02.md/,
  );

  const missingSliceApprovalErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        /User approval reference: user:[^\n]+/,
        "User approval reference: none",
      ),
  });
  assert.match(
    missingSliceApprovalErrors.join("\n"),
    /active slice SLICE-001 requires a durable user approval reference/,
  );
});

test("resolves design links only through the Design Decision Ledger", async () => {
  const proseOnlyErrors = await errorsFor({
    "DESIGN.md": (text) => `${text}\nDESIGN-9999 appears only in prose.\n`,
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Design decisions: none", "Design decisions: DESIGN-9999"),
  });
  assert.match(
    proseOnlyErrors.join("\n"),
    /TASK-0001 references unknown design decision DESIGN-9999/,
  );

  const unknownTaskErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Design decisions: none", "Design decisions: DESIGN-8888"),
  });
  assert.match(
    unknownTaskErrors.join("\n"),
    /TASK-0001 references unknown design decision DESIGN-8888/,
  );

  const nonIdCellErrors = await errorsFor({
    "DESIGN.md": `# Design

## Design Decision Ledger

| ID | Decision |
| --- | --- |
| DESIGN-0002 | Copy mentions DESIGN-9999 only as text |
`,
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Design decisions: none", "Design decisions: DESIGN-9999"),
  });
  assert.match(
    nonIdCellErrors.join("\n"),
    /TASK-0001 references unknown design decision DESIGN-9999/,
  );

  const duplicateLedgerErrors = await errorsFor({
    "DESIGN.md": `# Design

## Design Decision Ledger

| ID | Decision |
| --- | --- |
| DESIGN-0002 | First decision |
| DESIGN-0002 | Conflicting duplicate |
`,
  });
  assert.match(
    duplicateLedgerErrors.join("\n"),
    /Design Decision Ledger has duplicate ID DESIGN-0002/,
  );

  const approvedDesign = `# Design

## Taste Brief

- Audience: buyers
- Product personality: clear and trustworthy
- Density: comfortable
- Typography goals: readable hierarchy
- Imagery direction: product-led
- References: design-system/MASTER.md
- Explicit reject list: fake payment controls

## Approved Direction

Use the approved checkout design system and state contracts.

## Design Decision Ledger

| ID | Decision | Status | Requirement links | Artifact links | Approval reference |
| --- | --- | --- | --- | --- | --- |
| DESIGN-0002 | Approved checkout surface | approved | REQ-0001 | design-system/pages/checkout.md | user:workflow-test:2026-07-18:design-approval |

## Artifact Index

- Master system: design-system/MASTER.md
- Typography: design-system/TYPOGRAPHY.md
- Components: design-system/COMPONENTS.md
- Component board: design-system/BOARD.md
- Research records: design-system/research/
- Page contracts: design-system/pages/
- Mockup and state-board registry: mockups/INDEX.md

## Main Screens

Checkout is the representative critical surface.

## UX Flow Links

Checkout design is implemented by SLICE-001.

## Design Approval Record

- Component board: design-system/BOARD.md
- Typography proof: design-system/TYPOGRAPHY.md
- Representative desktop surfaces: mockups/checkout-desktop.png
- Representative mobile surfaces: mockups/checkout-mobile.png
- Required interaction states: design-system/BOARD.md#states
- User approval reference: user:workflow-test:2026-07-18:design-record-approval
`;
  const propagatedApprovedDesignChanges = {
    "DESIGN.md": approvedDesign,
    "design-system/MASTER.md": "# Master design system\n",
    "design-system/TYPOGRAPHY.md": "# Approved typography proof\n",
    "design-system/COMPONENTS.md": "# Approved components\n",
    "design-system/BOARD.md": "# Component board\n\n## States\n",
    "design-system/research/INDEX.md": "# Research records\n",
    "design-system/pages/checkout.md": "# Approved checkout page contract\n",
    "mockups/INDEX.md": "# Mockup registry\n",
    "mockups/checkout-desktop.png": "desktop proof\n",
    "mockups/checkout-mobile.png": "mobile proof\n",
    "REQUIREMENTS.md": (text) =>
      text.replace("Design links: none", "Design links: DESIGN-0002"),
    "IMPLEMENTATION_PLAN.md": (text) =>
      text
        .replace(
          taskRegisterRow,
          taskRegisterRow.replace(
            "| none | TC-0001 |",
            "| DESIGN-0002 | TC-0001 |",
          ),
        )
        .replace("Design decisions: none", "Design decisions: DESIGN-0002"),
    "slices/SLICE-001.md": (text) =>
      text
        .replace("- Design decisions: none", "- Design decisions: DESIGN-0002")
        .replace(
          "- Design-system contracts: none",
          "- Design-system contracts: design-system/MASTER.md",
        )
        .replace(
          "- Page contracts: none",
          "- Page contracts: design-system/pages/checkout.md",
        )
        .replace(
          "- Mockups/state boards: none",
          "- Mockups/state boards: design-system/BOARD.md",
        )
        .replace(
          "| Design fidelity | not applicable: no user-facing design in this slice | yes | not applicable | not applicable | not applicable |",
          "| Design fidelity | reviewer-c | yes | strongest, high | design ledger, artifacts, diff | accept or reject fidelity |",
        ),
  };
  assert.deepEqual(await errorsFor(propagatedApprovedDesignChanges), []);

  const hiddenRequirementDesignErrors = await errorsFor({
    "DESIGN.md": approvedDesign,
    "REQUIREMENTS.md": (text) =>
      text.replace("Design links: none", "Design links: DESIGN-0002"),
  });
  assert.match(
    hiddenRequirementDesignErrors.join("\n"),
    /SLICE-001 is missing inherited design decision DESIGN-0002 for REQ-0001/,
  );
  assert.match(
    hiddenRequirementDesignErrors.join("\n"),
    /TASK-0001 is missing inherited design decision DESIGN-0002 for REQ-0001/,
  );
  assert.match(
    hiddenRequirementDesignErrors.join("\n"),
    /SLICE-001 requires a complete design fidelity reviewer assignment/,
  );

  const missingArtifactErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace(
      "design-system/pages/checkout.md",
      "none",
    ),
  });
  assert.match(
    missingArtifactErrors.join("\n"),
    /approved design decision DESIGN-0002 requires concrete artifact links/,
  );

  const emptyDecisionErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace("Approved checkout surface", "none"),
  });
  assert.match(
    emptyDecisionErrors.join("\n"),
    /approved design decision DESIGN-0002 requires concrete decision content/,
  );

  const missingDesignArtifactFileErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace(
      "design-system/pages/checkout.md",
      "mockups/does-not-exist.png",
    ),
  });
  assert.match(
    missingDesignArtifactFileErrors.join("\n"),
    /approved design decision DESIGN-0002 local artifact does not exist: mockups\/does-not-exist.png/,
  );

  const pendingDesignApprovalErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace(
      "## Design Approval Record\n\n- Component board: design-system/BOARD.md",
      "## Design Approval Record\n\n- Component board: pending",
    ),
  });
  assert.match(
    pendingDesignApprovalErrors.join("\n"),
    /approved design decisions require concrete Design Approval Record field Component board/,
  );

  const proseOnlyDesignApprovalErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace(
      "Representative desktop surfaces: mockups/checkout-desktop.png",
      "Representative desktop surfaces: looks good",
    ),
  });
  assert.match(
    proseOnlyDesignApprovalErrors.join("\n"),
    /Design Approval Record Representative desktop surfaces requires a resolvable local or HTTPS artifact/,
  );

  const directoryOnlyDesignApprovalErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace(
      "Representative desktop surfaces: mockups/checkout-desktop.png",
      "Representative desktop surfaces: design-system/",
    ),
  });
  assert.match(
    directoryOnlyDesignApprovalErrors.join("\n"),
    /Design Approval Record Representative desktop surfaces artifact does not exist: design-system\//,
  );

  const proseOnlySliceDesignLinks = {
    ...propagatedApprovedDesignChanges,
  };
  const inspectableSliceDesignChange =
    proseOnlySliceDesignLinks["slices/SLICE-001.md"];
  proseOnlySliceDesignLinks["slices/SLICE-001.md"] = (text) =>
    inspectableSliceDesignChange(text)
      .replace(
        "Design-system contracts: design-system/MASTER.md",
        "Design-system contracts: covered",
      )
      .replace(
        "Page contracts: design-system/pages/checkout.md",
        "Page contracts: approved",
      )
      .replace(
        "Mockups/state boards: design-system/BOARD.md",
        "Mockups/state boards: looks good",
      );
  const proseOnlySliceDesignErrors = await errorsFor(proseOnlySliceDesignLinks);
  for (const label of [
    "Design-system contracts",
    "Page contracts",
    "Mockups/state boards",
  ]) {
    assert.match(
      proseOnlySliceDesignErrors.join("\n"),
      new RegExp(`${label} requires a resolvable local or HTTPS artifact`),
    );
  }

  const missingReciprocalDesignErrors = await errorsFor({
    ...propagatedApprovedDesignChanges,
    "DESIGN.md": approvedDesign.replace("| REQ-0001 |", "| none |"),
  });
  assert.match(
    missingReciprocalDesignErrors.join("\n"),
    /REQ-0001 design decision DESIGN-0002 must link back from DESIGN.md/,
  );
  assert.match(
    missingReciprocalDesignErrors.join("\n"),
    /approved design decision DESIGN-0002 requires at least one requirement link/,
  );

  const missingDesignReviewerErrors = await errorsFor({
    "DESIGN.md": approvedDesign,
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "- Design decisions: none",
        "- Design decisions: DESIGN-0002",
      ),
  });
  assert.match(
    missingDesignReviewerErrors.join("\n"),
    /SLICE-001 requires a complete design fidelity reviewer assignment/,
  );

  const linkedDesignCloseChanges = verifiedClosedChanges();
  const linkedDesignImplementationChange =
    linkedDesignCloseChanges["IMPLEMENTATION_PLAN.md"];
  linkedDesignCloseChanges["DESIGN.md"] = approvedDesign;
  linkedDesignCloseChanges["IMPLEMENTATION_PLAN.md"] = (text) =>
    linkedDesignImplementationChange(text)
      .replace(
        taskRegisterRow.replace("| planned |", "| reviewed |"),
        taskRegisterRow
          .replace("| none | TC-0001 |", "| DESIGN-0002 | TC-0001 |")
          .replace("| planned |", "| reviewed |"),
      )
      .replace("Design decisions: none", "Design decisions: DESIGN-0002");
  const linkedDesignSliceChange =
    linkedDesignCloseChanges["slices/SLICE-001.md"];
  linkedDesignCloseChanges["slices/SLICE-001.md"] = (text) =>
    linkedDesignSliceChange(text)
      .replace("- Design decisions: none", "- Design decisions: DESIGN-0002")
      .replace(
        "| Design fidelity | not applicable: no user-facing design in this slice | yes | not applicable | not applicable | not applicable |",
        "| Design fidelity | reviewer-c | yes | strongest, high | design ledger, artifacts, diff | accept or reject fidelity |",
      );
  const linkedDesignCloseErrors = await errorsFor(linkedDesignCloseChanges);
  assert.match(
    linkedDesignCloseErrors.join("\n"),
    /closed slice SLICE-001 requires approved design review decision/,
  );

  for (const status of ["proposed", "rejected", "superseded"]) {
    const nonApprovedDesignErrors = await errorsFor({
      "DESIGN.md": approvedDesign.replace("| approved |", `| ${status} |`),
      "IMPLEMENTATION_PLAN.md": (text) =>
        text.replace("Design decisions: none", "Design decisions: DESIGN-0002"),
    });
    assert.match(
      nonApprovedDesignErrors.join("\n"),
      new RegExp(
        `TASK-0001 references non-approved design decision DESIGN-0002 \\(${status}\\)`,
      ),
    );
  }

  const sliceDesignErrors = await errorsFor({
    "DESIGN.md": approvedDesign.replace("| approved |", "| proposed |"),
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "- Design decisions: none",
        "- Design decisions: DESIGN-0002",
      ),
  });
  assert.match(
    sliceDesignErrors.join("\n"),
    /SLICE-001 references non-approved design decision DESIGN-0002 \(proposed\)/,
  );

  const unknownSliceDesignErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace(
        "- Design decisions: none",
        "- Design decisions: DESIGN-9999",
      ),
  });
  assert.match(
    unknownSliceDesignErrors.join("\n"),
    /SLICE-001 references unknown design decision DESIGN-9999/,
  );

  const missingApprovalErrors = await errorsFor({
    "DESIGN.md": approvedDesign.replace(
      "user:workflow-test:2026-07-18:design-approval",
      "none",
    ),
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Design decisions: none", "Design decisions: DESIGN-0002"),
  });
  assert.match(
    missingApprovalErrors.join("\n"),
    /approved design decision DESIGN-0002 requires a durable approval reference/,
  );

  const invalidApprovalErrors = await errorsFor({
    "DESIGN.md": approvedDesign.replace(
      "user:workflow-test:2026-07-18:design-approval",
      "user:none:2026-99-99:none",
    ),
  });
  assert.match(
    invalidApprovalErrors.join("\n"),
    /approved design decision DESIGN-0002 requires a durable approval reference/,
  );

  const missingLedgerColumnErrors = await errorsFor({
    "DESIGN.md": approvedDesign
      .replace(" | Approval reference", "")
      .replace(" | --- |\n| DESIGN", " |\n| DESIGN")
      .replace(" | user:workflow-test:2026-07-18:design-approval |", " |"),
  });
  assert.match(
    missingLedgerColumnErrors.join("\n"),
    /Design Decision Ledger must have exactly one Approval reference column/,
  );

  const invalidDesignStatusErrors = await errorsFor({
    "DESIGN.md": approvedDesign.replace("| approved |", "| ready |"),
  });
  assert.match(
    invalidDesignStatusErrors.join("\n"),
    /DESIGN-0002 has invalid status ready/,
  );

  const duplicateLedgerSectionErrors = await errorsFor({
    "DESIGN.md": `${approvedDesign}\n## Design Decision Ledger\n\n| ID | Decision | Status | Requirement links | Artifact links | Approval reference |\n| --- | --- | --- | --- | --- | --- |\n| DESIGN-0003 | Conflicting second ledger | rejected | none | none | none |\n`,
  });
  assert.match(
    duplicateLedgerSectionErrors.join("\n"),
    /Design Decision Ledger must appear exactly once/,
  );
});

test("requires full removed records in the Tombstones section and index", async () => {
  const tombstoneRequirements = `# Requirements

## Requirement Register

${requirementRegisterHeader}
${requirementRegisterSeparator}

## Active Requirement Records

## Tombstone Register

| ID | Title | Removal reason | Approval reference |
| --- | --- | --- | --- |
| REQ-0001 | Removed checkout | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |

## Tombstones

### REQ-0001 — Removed checkout

- Audience: buyer
- Source: user:workflow-test:2026-07-17:checkout
- Lifecycle status: removed
- Planning disposition: removed
- Target slice: none
- Blocker: none
- Deferral reason: none
- Removal reason: explicitly withdrawn
- Next trigger: none
- Approval reference: user:workflow-test:2026-07-17:removal
- Acceptance:
  - Historical promise retained.
- Negative cases:
  - Historical exclusion retained.
- Dependencies: none
- Affected surfaces: retired checkout behavior
- Required test types: historical regression
- Required evidence types: removal record
- Exclusions: replacement behavior
- Payment-domain review required: no
- Payment-domain review reason: removed scope has no provider behavior
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none
`;
  const noTasks = `# Implementation Plan

## Task Register

${taskRegisterHeader}
${taskRegisterSeparator}
`;
  const noTests = `# Test Cases

## Test Case Register

${testRegisterHeader}
${testRegisterSeparator}
`;
  const noEvidence = `# Evidence

## Evidence Index

${evidenceRegisterHeader}
${evidenceRegisterSeparator}
`;
  const proposedSlice = proposedSliceText("SLICE-001", "Proposed work");
  const tombstoneChanges = {
    "REQUIREMENTS.md": tombstoneRequirements,
    "IMPLEMENTATION_PLAN.md": noTasks,
    "tracking/test-cases.md": noTests,
    "tracking/evidence.md": noEvidence,
    "slices/SLICE-001.md": proposedSlice,
    "PLAN.md": "# Active Plan\n\n- Active slice: none\n",
    "tracking/todos.md": "# Todos\n\n- Active slice: none\n",
    "tracking/progress.md": "# Progress\n\n- Active slice: none\n",
  };

  assert.deepEqual(await errorsFor(tombstoneChanges), []);

  const duplicateTombstoneIndexErrors = await errorsFor({
    ...tombstoneChanges,
    "REQUIREMENTS.md": tombstoneRequirements.replace(
      "| REQ-0001 | Removed checkout | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |",
      "| REQ-0001 | Removed checkout | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |\n| REQ-0001 | Duplicate tombstone | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |",
    ),
  });
  assert.match(
    duplicateTombstoneIndexErrors.join("\n"),
    /Tombstone Register has duplicate ID REQ-0001/,
  );

  const wrongTombstoneColumnErrors = await errorsFor({
    ...tombstoneChanges,
    "REQUIREMENTS.md": tombstoneRequirements.replace(
      "| REQ-0001 | Removed checkout | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |",
      "| none | Removed checkout mentions REQ-0001 | Explicitly withdrawn | user:workflow-test:2026-07-17:removal |",
    ),
  });
  assert.match(
    wrongTombstoneColumnErrors.join("\n"),
    /REQ-0001 is missing from Tombstone Register/,
  );

  const wrongSectionErrors = await errorsFor({
    ...tombstoneChanges,
    "REQUIREMENTS.md": tombstoneRequirements.replace(
      "## Tombstones\n\n### REQ-0001",
      "## Active Requirement Records\n\n### REQ-0001",
    ),
  });
  assert.match(
    wrongSectionErrors.join("\n"),
    /removed requirement REQ-0001 must be in the Tombstones section/,
  );
});

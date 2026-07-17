import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDemoWorkflow } from "../validate-demo-workflow.mjs";

const validFiles = {
  "REQUIREMENTS.md": `# Requirements

## Requirement Register

| ID | Title |
| --- | --- |
| REQ-0001 | Complete checkout |

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
- Design links: none
- Task links: TASK-0001
- Test links: TC-0001
- Evidence links: EVID-0001
`,
  "DESIGN.md": `# Design

## Design Decision Ledger

| ID | Decision |
| --- | --- |
`,
  "IMPLEMENTATION_PLAN.md": `# Implementation Plan

## Task Register

| Task | Slice |
| --- | --- |
| TASK-0001 | SLICE-001 |

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
- Payment-domain sub-review required: no

## Inherited Requirements

| Requirement | Lifecycle | Disposition | Acceptance in this slice |
| --- | --- | --- | --- |
| REQ-0001 | approved | active_slice | Buyer completes checkout |

## Coverage

| Requirement | Tasks | Test cases | Evidence |
| --- | --- | --- | --- |
| REQ-0001 | TASK-0001 | TC-0001 | EVID-0001 |

## Reviewer Assignments

| Lane | Reviewer/agent | Independent from implementer | Model and effort | Required inputs | Decision authority |
| --- | --- | --- | --- | --- | --- |
| Requirements coverage | reviewer-a | yes | strongest, high | register, charter, diff | accept or reject coverage |
| Design fidelity | not applicable: no user-facing design in this slice | yes | not applicable | not applicable | not applicable |
| Engineering quality | reviewer-b | yes | risk-scaled | charter, diff, tests | accept or reject quality |
| Payment-domain engineering sub-review | not applicable: no payment behavior in this slice | yes | not applicable | not applicable | not applicable |

## Close Record

- Requirements review decision: pending
- Design review decision: pending
- Engineering review decision: pending
- Payment-domain sub-review decision: pending
- Critical/Important findings: pending
- Minor findings disposition: pending
`,
  "tracking/test-cases.md": `# Test Cases

## Test Case Register

| Test ID | Requirements |
| --- | --- |
| TC-0001 | REQ-0001 |

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

| Evidence | Requirements |
| --- | --- |
| EVID-0001 | REQ-0001 |

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

test("accepts a valid active-slice workflow", async () => {
  assert.deepEqual(await errorsFor(), []);
});

test("rejects invalid lifecycle and disposition combinations", async () => {
  const errors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("Lifecycle status: approved", "Lifecycle status: verified"),
  });
  assert.match(errors.join("\n"), /invalid lifecycle\/disposition combination/);
});

test("rejects missing targets and conditional planning fields", async () => {
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
        "| REQ-0001 | Complete checkout |",
        "| REQ-01 | Complete checkout |",
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
});

test("rejects register/record drift and non-reciprocal links", async () => {
  const registerErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("| REQ-0001 | Complete checkout |", ""),
  });
  assert.match(
    registerErrors.join("\n"),
    /REQ-0001 is missing from Requirement Register/,
  );

  const reciprocalErrors = await errorsFor({
    "IMPLEMENTATION_PLAN.md": (text) =>
      text.replace("Requirements: REQ-0001", "Requirements: none"),
  });
  assert.match(
    reciprocalErrors.join("\n"),
    /TASK-0001 does not link back to REQ-0001/,
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
});

test("rejects cross-slice ownership and premature future-slice links", async () => {
  const secondSlice = `# SLICE-002 — Future work

- Status: proposed
- Payment-domain sub-review required: no
`;
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
});

test("accepts a fully verified and reviewed closed slice", async () => {
  assert.deepEqual(
    await errorsFor({
      "REQUIREMENTS.md": (text) =>
        text
          .replace("Lifecycle status: approved", "Lifecycle status: verified")
          .replace(
            "Planning disposition: active_slice",
            "Planning disposition: complete",
          )
          .replace("Target slice: SLICE-001", "Target slice: none"),
      "tracking/test-cases.md": (text) =>
        text.replace("Status: planned", "Status: passing"),
      "tracking/evidence.md": (text) =>
        text
          .replace("Status: planned", "Status: passing")
          .replace("Artifact: pending", "Artifact: evidence/checkout.json")
          .replace("Captured at: pending", "Captured at: 2026-07-17T12:00:00Z")
          .replace("Verified by: pending", "Verified by: reviewer-b")
          .replace("Result: pending", "Result: passed"),
      "slices/SLICE-001.md": (text) =>
        text
          .replace("Status: active", "Status: closed")
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
            "Critical/Important findings: none",
          )
          .replace(
            "Minor findings disposition: pending",
            "Minor findings disposition: none",
          ),
      "PLAN.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
      "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
    }),
    [],
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
});

test("rejects non-independent or missing required reviewers", async () => {
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
});

test("rejects active-plan and tracking disagreement", async () => {
  const errors = await errorsFor({
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(errors.join("\n"), /active slice disagreement/);
});

test("rejects non-durable user sources and invalid target-slice state", async () => {
  const sourceErrors = await errorsFor({
    "REQUIREMENTS.md": (text) =>
      text.replace("user:workflow-test:2026-07-17:checkout", "user:checkout"),
  });
  assert.match(sourceErrors.join("\n"), /durable user source/);

  const targetErrors = await errorsFor({
    "slices/SLICE-001.md": (text) =>
      text.replace("Status: active", "Status: closed"),
    "PLAN.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/todos.md": (text) => text.replace("SLICE-001", "none"),
    "tracking/progress.md": (text) => text.replace("SLICE-001", "none"),
  });
  assert.match(
    targetErrors.join("\n"),
    /active_slice target SLICE-001 must be approved or active/,
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
});

test("requires full removed records in the Tombstones section and index", async () => {
  const tombstoneRequirements = `# Requirements

## Requirement Register

| ID | Title |
| --- | --- |

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
- Design links: none
- Task links: none
- Test links: none
- Evidence links: none
`;
  const noTasks = `# Implementation Plan

## Task Register

| Task | Slice |
| --- | --- |
`;
  const noTests = `# Test Cases

## Test Case Register

| Test ID | Requirements |
| --- | --- |
`;
  const noEvidence = `# Evidence

## Evidence Index

| Evidence | Requirements |
| --- | --- |
`;
  const proposedSlice = `# SLICE-001 — Proposed work

- Status: proposed
- Payment-domain sub-review required: no
`;
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

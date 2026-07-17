#!/usr/bin/env node

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const lifecycleDispositionMatrix = new Map([
  ["draft", new Set(["unassigned"])],
  [
    "approved",
    new Set([
      "unassigned",
      "active_slice",
      "future_slice",
      "blocked",
      "deferral_proposed",
      "deferred",
    ]),
  ],
  ["in_progress", new Set(["active_slice"])],
  ["implemented", new Set(["active_slice"])],
  ["verified", new Set(["complete"])],
  ["removed", new Set(["removed"])],
]);

const requiredRequirementFields = [
  "audience",
  "source",
  "lifecycle_status",
  "planning_disposition",
  "target_slice",
  "blocker",
  "deferral_reason",
  "removal_reason",
  "next_trigger",
  "approval_reference",
  "acceptance",
  "negative_cases",
  "dependencies",
  "design_links",
  "task_links",
  "test_links",
  "evidence_links",
];

const requiredTaskFields = [
  "slice",
  "requirements",
  "design_decisions",
  "files",
  "interfaces",
  "test_cases",
  "evidence",
  "non_goals",
  "model/effort",
  "status",
];

const requiredTestFields = [
  "requirements",
  "slice",
  "evidence",
  "layer",
  "preconditions",
  "action",
  "expected",
  "negative_case",
  "status",
];

const requiredEvidenceFields = [
  "requirements",
  "slice",
  "type",
  "status",
  "artifact",
  "captured_at",
  "verified_by",
  "result",
];

function stripFencedCode(text) {
  const kept = [];
  let insideFence = false;

  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      insideFence = !insideFence;
      continue;
    }
    if (!insideFence) kept.push(line);
  }

  return kept.join("\n");
}

function normalizeField(label) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function parseFields(section) {
  const fields = new Map();
  let currentField = null;

  for (const line of section.split("\n")) {
    const fieldMatch = line.match(/^- ([^:]+):\s*(.*)$/);
    if (fieldMatch) {
      currentField = normalizeField(fieldMatch[1]);
      fields.set(currentField, fieldMatch[2].trim());
      continue;
    }

    const nestedMatch = line.match(/^\s{2,}-\s+(.+)$/);
    if (nestedMatch && currentField) {
      const previous = fields.get(currentField) ?? "";
      fields.set(
        currentField,
        [previous, nestedMatch[1].trim()].filter(Boolean).join(" | "),
      );
    }
  }

  return fields;
}

function parseRecords(text, prefix, digits, file, errors) {
  const stripped = stripFencedCode(text);
  const headingPattern = new RegExp(`^###\\s+(${prefix}-[^\\s—]+)`, "gm");
  const validIdPattern = new RegExp(`^${prefix}-\\d{${digits}}$`);

  for (const match of stripped.matchAll(headingPattern)) {
    if (!validIdPattern.test(match[1])) {
      const kind = prefix === "REQ" ? "requirement" : prefix.toLowerCase();
      errors.push(`${file}: malformed ${kind} identifier ${match[1]}`);
    }
  }

  const recordPattern = new RegExp(
    `^###\\s+(${prefix}-\\d{${digits}})\\s+[—-]\\s+(.+)$`,
    "gm",
  );
  const matches = [...stripped.matchAll(recordPattern)];
  const records = [];
  const seen = new Set();

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = match.index + match[0].length;
    const end = matches[index + 1]?.index ?? stripped.length;
    const record = {
      id: match[1],
      title: match[2].trim(),
      fields: parseFields(stripped.slice(start, end)),
      file,
    };

    if (seen.has(record.id)) {
      errors.push(`${file}: duplicate identifier ${record.id}`);
    }
    seen.add(record.id);
    records.push(record);
  }

  return records;
}

function isNone(value) {
  return !value || value.trim().toLowerCase() === "none";
}

function idsIn(value, prefix, digits) {
  if (!value) return [];
  return [
    ...new Set(value.match(new RegExp(`${prefix}-\\d{${digits}}`, "g")) ?? []),
  ];
}

function validateIdentifierShapes(text, file, errors) {
  const stripped = stripFencedCode(text);
  for (const [prefix, digits] of [
    ["REQ", 4],
    ["DESIGN", 4],
    ["SLICE", 3],
    ["TASK", 4],
    ["TC", 4],
    ["EVID", 4],
  ]) {
    const valid = new RegExp(`^${prefix}-\\d{${digits}}$`);
    for (const match of stripped.matchAll(
      new RegExp(`\\b(${prefix}-[A-Za-z0-9_-]+)\\b`, "g"),
    )) {
      if (!valid.test(match[1])) {
        errors.push(`${file}: malformed identifier ${match[1]}`);
      }
    }
  }
}

function requireFields(record, requiredFields, errors) {
  for (const field of requiredFields) {
    if (!record.fields.has(field)) {
      errors.push(
        `${record.file}: ${record.id} is missing required field ${field}`,
      );
    }
  }
}

function section(text, heading) {
  const lines = stripFencedCode(text).split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";

  const content = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{2,3} /.test(lines[index])) break;
    content.push(lines[index]);
  }
  return content.join("\n");
}

function topField(text, label) {
  const stripped = stripFencedCode(text);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    stripped.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, "mi"))?.[1]?.trim() ??
    "none"
  );
}

function tableRows(sectionText) {
  return sectionText
    .split("\n")
    .filter((line) => /^\|.+\|\s*$/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter(
      (cells) => cells.length > 0 && !cells.every((cell) => /^-+$/.test(cell)),
    )
    .slice(1);
}

async function readRequired(demoDir, relativePath, errors) {
  try {
    return await readFile(path.join(demoDir, relativePath), "utf8");
  } catch {
    errors.push(`${relativePath}: missing required workflow artifact`);
    return "";
  }
}

async function readOptional(demoDir, relativePath) {
  try {
    return await readFile(path.join(demoDir, relativePath), "utf8");
  } catch {
    return "";
  }
}

function indexRecords(records) {
  return new Map(records.map((record) => [record.id, record]));
}

function validateReferences(
  record,
  field,
  prefix,
  digits,
  known,
  label,
  errors,
) {
  for (const id of idsIn(record.fields.get(field), prefix, digits)) {
    if (!known.has(id)) {
      errors.push(
        `${record.file}: ${record.id} references unknown ${label} ${id}`,
      );
    }
  }
}

function validateRecordIndex(
  text,
  heading,
  prefix,
  digits,
  records,
  file,
  errors,
) {
  const indexedIds = idsIn(
    tableRows(section(text, heading)).flat().join(" "),
    prefix,
    digits,
  );

  for (const record of records.values()) {
    if (!indexedIds.includes(record.id)) {
      errors.push(`${file}: ${record.id} is missing from ${heading}`);
    }
  }
  for (const id of indexedIds) {
    if (!records.has(id)) {
      errors.push(`${file}: ${heading} references unknown record ${id}`);
    }
  }
}

function validateRequirement(requirement, known, slices, errors) {
  requireFields(requirement, requiredRequirementFields, errors);

  const lifecycle = requirement.fields.get("lifecycle_status");
  const disposition = requirement.fields.get("planning_disposition");
  const allowedDispositions = lifecycleDispositionMatrix.get(lifecycle);
  if (!allowedDispositions?.has(disposition)) {
    errors.push(
      `${requirement.file}: ${requirement.id} has invalid lifecycle/disposition combination ${lifecycle}/${disposition}`,
    );
  }

  const targetSlice = requirement.fields.get("target_slice");
  if (["active_slice", "future_slice"].includes(disposition)) {
    if (
      isNone(targetSlice) ||
      !/^SLICE-\d{3}$/.test(targetSlice) ||
      !slices.has(targetSlice)
    ) {
      errors.push(
        `${requirement.file}: ${requirement.id} ${disposition} requires a valid target slice`,
      );
    }
  }
  const target = slices.get(targetSlice);
  if (
    disposition === "active_slice" &&
    target &&
    !["approved", "active"].includes(target.status)
  ) {
    errors.push(
      `${requirement.file}: ${requirement.id} active_slice target ${targetSlice} must be approved or active`,
    );
  }
  if (
    disposition === "future_slice" &&
    target &&
    !["proposed", "approved"].includes(target.status)
  ) {
    errors.push(
      `${requirement.file}: ${requirement.id} future_slice target ${targetSlice} must be proposed or approved`,
    );
  }

  const source = requirement.fields.get("source") ?? "";
  if (
    source.startsWith("user:") &&
    !/^user:[^:]+:\d{4}-\d{2}-\d{2}:[^:]+$/.test(source)
  ) {
    errors.push(
      `${requirement.file}: ${requirement.id} requires a durable user source`,
    );
  }

  if (disposition === "blocked") {
    const missing = ["blocker", "next_trigger"].filter((field) =>
      isNone(requirement.fields.get(field)),
    );
    if (missing.length > 0) {
      errors.push(
        `${requirement.file}: ${requirement.id} blocked requires blocker and next_trigger`,
      );
    }
  }

  if (disposition === "deferral_proposed") {
    const missing = ["deferral_reason", "next_trigger"].filter((field) =>
      isNone(requirement.fields.get(field)),
    );
    if (missing.length > 0) {
      errors.push(
        `${requirement.file}: ${requirement.id} deferral_proposed requires deferral_reason and next_trigger`,
      );
    }
  }

  if (disposition === "deferred") {
    const missing = ["deferral_reason", "next_trigger"].filter((field) =>
      isNone(requirement.fields.get(field)),
    );
    if (missing.length > 0) {
      errors.push(
        `${requirement.file}: ${requirement.id} deferred requires deferral_reason and next_trigger`,
      );
    }
    if (isNone(requirement.fields.get("approval_reference"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} deferred requires a user approval reference`,
      );
    }
  }

  if (disposition === "removed") {
    if (isNone(requirement.fields.get("removal_reason"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} removed requires removal_reason`,
      );
    }
    if (isNone(requirement.fields.get("approval_reference"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} removed requires a user approval reference`,
      );
    }
  }

  const referenceTypes = [
    ["design_links", "DESIGN", 4, known.design, "design decision"],
    ["task_links", "TASK", 4, known.tasks, "task"],
    ["test_links", "TC", 4, known.tests, "test case"],
    ["evidence_links", "EVID", 4, known.evidence, "evidence"],
  ];
  for (const [field, prefix, digits, records, label] of referenceTypes) {
    validateReferences(
      requirement,
      field,
      prefix,
      digits,
      records,
      label,
      errors,
    );
  }

  for (const [field, prefix, records] of [
    ["task_links", "TASK", known.tasks],
    ["test_links", "TC", known.tests],
    ["evidence_links", "EVID", known.evidence],
  ]) {
    for (const id of idsIn(requirement.fields.get(field), prefix, 4)) {
      const linkedRecord = records.get(id);
      if (
        linkedRecord &&
        !idsIn(linkedRecord.fields.get("requirements"), "REQ", 4).includes(
          requirement.id,
        )
      ) {
        errors.push(
          `${linkedRecord.file}: ${id} does not link back to ${requirement.id}`,
        );
      }
    }
  }

  if (disposition === "active_slice") {
    for (const [field, prefix] of [
      ["task_links", "TASK"],
      ["test_links", "TC"],
      ["evidence_links", "EVID"],
    ]) {
      if (idsIn(requirement.fields.get(field), prefix, 4).length === 0) {
        errors.push(
          `${requirement.file}: active-slice requirement ${requirement.id} requires ${field}`,
        );
      }
    }

    const slice = slices.get(targetSlice);
    if (slice) {
      const inheritedIds = idsIn(
        section(slice.text, "Inherited Requirements"),
        "REQ",
        4,
      );
      if (!inheritedIds.includes(requirement.id)) {
        errors.push(
          `${slice.file}: active-slice requirement ${requirement.id} is not inherited by ${targetSlice}`,
        );
      }
      const coverage = section(slice.text, "Coverage");
      for (const field of ["task_links", "test_links", "evidence_links"]) {
        for (const id of idsIn(
          requirement.fields.get(field),
          field === "task_links"
            ? "TASK"
            : field === "test_links"
              ? "TC"
              : "EVID",
          4,
        )) {
          if (!coverage.includes(id)) {
            errors.push(
              `${slice.file}: ${targetSlice} coverage is missing ${id} for ${requirement.id}`,
            );
          }
        }
      }
    }
  }

  if (lifecycle === "verified") {
    const evidenceIds = idsIn(
      requirement.fields.get("evidence_links"),
      "EVID",
      4,
    );
    const testIds = idsIn(requirement.fields.get("test_links"), "TC", 4);
    if (testIds.length === 0) {
      errors.push(
        `${requirement.file}: verified requirement ${requirement.id} requires at least one test link`,
      );
    }
    if (evidenceIds.length === 0) {
      errors.push(
        `${requirement.file}: verified requirement ${requirement.id} requires at least one evidence link`,
      );
    }
    for (const evidenceId of evidenceIds) {
      if (known.evidence.get(evidenceId)?.fields.get("status") !== "passing") {
        errors.push(
          `${requirement.file}: verified requirement ${requirement.id} requires passing evidence ${evidenceId}`,
        );
      }
    }
    for (const testId of testIds) {
      if (known.tests.get(testId)?.fields.get("status") !== "passing") {
        errors.push(
          `${requirement.file}: verified requirement ${requirement.id} requires passing test ${testId}`,
        );
      }
    }
  }
}

function validateReviewers(slice, errors) {
  if (!["approved", "active", "closed"].includes(slice.status)) return;

  const rows = tableRows(section(slice.text, "Reviewer Assignments"));
  const byLane = new Map(rows.map((cells) => [cells[0]?.toLowerCase(), cells]));

  for (const lane of [
    "requirements coverage",
    "design fidelity",
    "engineering quality",
  ]) {
    const row = byLane.get(lane);
    if (!row || row.length < 6) {
      errors.push(
        `${slice.file}: ${slice.id} requires a complete ${lane} reviewer assignment`,
      );
      continue;
    }
    if (row[2]?.toLowerCase() !== "yes") {
      const label = lane[0].toUpperCase() + lane.slice(1);
      errors.push(`${slice.file}: ${label} reviewer must be independent`);
    }
    const reviewer = row[1]?.toLowerCase() ?? "";
    if (lane === "design fidelity" && reviewer.startsWith("not applicable:"))
      continue;
    const incomplete = [row[1], row[3], row[4], row[5]].some(
      (value) =>
        !value ||
        ["none", "pending", "not applicable", "n/a"].includes(
          value.toLowerCase(),
        ) ||
        value.includes("{{"),
    );
    if (incomplete) {
      errors.push(
        `${slice.file}: ${slice.id} requires a complete ${lane} reviewer assignment`,
      );
    }
  }

  const paymentRow = byLane.get("payment-domain engineering sub-review");
  if (slice.paymentReviewRequired === "yes") {
    const row = paymentRow;
    const incomplete =
      !row ||
      row.length < 6 ||
      row[1]?.toLowerCase() === "not applicable" ||
      row[2]?.toLowerCase() !== "yes" ||
      row
        .slice(3, 6)
        .some(
          (value) => isNone(value) || value.toLowerCase() === "not applicable",
        );
    if (incomplete) {
      errors.push(
        `${slice.file}: ${slice.id} requires a complete payment-domain engineering sub-review assignment`,
      );
    }
  } else if (
    slice.paymentReviewRequired === "no" &&
    (!paymentRow || !paymentRow[1]?.toLowerCase().startsWith("not applicable:"))
  ) {
    errors.push(
      `${slice.file}: ${slice.id} requires a payment-domain sub-review non-applicability reason`,
    );
  }
}

function validateSlice(slice, requirements, known, errors) {
  if (
    !["proposed", "approved", "active", "blocked", "closed"].includes(
      slice.status,
    )
  ) {
    errors.push(
      `${slice.file}: ${slice.id} has invalid status ${slice.status}`,
    );
  }
  if (!["yes", "no"].includes(slice.paymentReviewRequired)) {
    errors.push(
      `${slice.file}: ${slice.id} must declare whether payment-domain sub-review is required`,
    );
  }
  const inheritedIds = idsIn(
    section(slice.text, "Inherited Requirements"),
    "REQ",
    4,
  );
  for (const requirementId of inheritedIds) {
    if (!requirements.has(requirementId)) {
      errors.push(
        `${slice.file}: ${slice.id} inherits unknown requirement ${requirementId}`,
      );
    }
  }

  const coverage = section(slice.text, "Coverage");
  for (const [prefix, digits, records, label] of [
    ["REQ", 4, requirements, "requirement"],
    ["TASK", 4, known.tasks, "task"],
    ["TC", 4, known.tests, "test case"],
    ["EVID", 4, known.evidence, "evidence"],
  ]) {
    for (const id of idsIn(coverage, prefix, digits)) {
      if (!records.has(id))
        errors.push(
          `${slice.file}: ${slice.id} coverage references unknown ${label} ${id}`,
        );
    }
  }

  validateReviewers(slice, errors);

  if (slice.status === "closed") {
    for (const requirementId of inheritedIds) {
      if (
        requirements.get(requirementId)?.fields.get("lifecycle_status") !==
        "verified"
      ) {
        errors.push(
          `${slice.file}: closed slice ${slice.id} has unresolved requirement ${requirementId}`,
        );
      }
    }
    if (
      isNone(topField(section(slice.text, "Close Record"), "Review decisions"))
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires review decisions`,
      );
    }
  }
}

function validateOwnedRecord(record, requiredFields, known, errors) {
  requireFields(record, requiredFields, errors);
  validateReferences(
    record,
    "requirements",
    "REQ",
    4,
    known.requirements,
    "requirement",
    errors,
  );
  validateReferences(
    record,
    "slice",
    "SLICE",
    3,
    known.slices,
    "slice",
    errors,
  );
  validateReferences(
    record,
    "test_cases",
    "TC",
    4,
    known.tests,
    "test case",
    errors,
  );
  validateReferences(
    record,
    "evidence",
    "EVID",
    4,
    known.evidence,
    "evidence",
    errors,
  );

  const reverseField = record.id.startsWith("TASK-")
    ? "task_links"
    : record.id.startsWith("TC-")
      ? "test_links"
      : record.id.startsWith("EVID-")
        ? "evidence_links"
        : null;
  if (!reverseField) return;

  const prefix = record.id.split("-")[0];
  for (const requirementId of idsIn(
    record.fields.get("requirements"),
    "REQ",
    4,
  )) {
    const requirement = known.requirements.get(requirementId);
    if (
      requirement &&
      !idsIn(requirement.fields.get(reverseField), prefix, 4).includes(
        record.id,
      )
    ) {
      errors.push(
        `${record.file}: ${record.id} is not linked from ${requirementId} ${reverseField}`,
      );
    }
  }
}

function validateRecordStatus(record, allowedStatuses, errors) {
  const status = record.fields.get("status");
  if (status && !allowedStatuses.has(status)) {
    errors.push(`${record.file}: ${record.id} has invalid status ${status}`);
  }
}

function activeSliceValue(text) {
  return topField(text, "Active slice");
}

export async function validateDemoWorkflow(demoPath) {
  const demoDir = path.resolve(demoPath);
  const errors = [];

  const requirementsText = await readRequired(
    demoDir,
    "REQUIREMENTS.md",
    errors,
  );
  const designText = await readRequired(demoDir, "DESIGN.md", errors);
  const implementationTasksText = await readOptional(
    demoDir,
    "IMPLEMENTATION_TASKS.md",
  );
  const implementationPlanText = await readRequired(
    demoDir,
    "IMPLEMENTATION_PLAN.md",
    errors,
  );
  const planText = await readRequired(demoDir, "PLAN.md", errors);
  const testsText = await readRequired(
    demoDir,
    "tracking/test-cases.md",
    errors,
  );
  const evidenceText = await readRequired(
    demoDir,
    "tracking/evidence.md",
    errors,
  );
  const todosText = await readRequired(demoDir, "tracking/todos.md", errors);
  const progressText = await readRequired(
    demoDir,
    "tracking/progress.md",
    errors,
  );

  const slices = new Map();
  try {
    const entries = await readdir(path.join(demoDir, "slices"), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || !/^SLICE-\d{3}\.md$/.test(entry.name)) continue;
      const id = entry.name.replace(/\.md$/, "");
      const relativePath = `slices/${entry.name}`;
      const text = await readRequired(demoDir, relativePath, errors);
      const headingId = stripFencedCode(text).match(/^# (SLICE-[^\s—]+)/m)?.[1];
      if (headingId !== id)
        errors.push(
          `${relativePath}: slice heading ${headingId ?? "missing"} does not match ${id}`,
        );
      slices.set(id, {
        id,
        file: relativePath,
        text,
        status: topField(text, "Status").toLowerCase(),
        paymentReviewRequired: topField(
          text,
          "Payment-domain sub-review required",
        ).toLowerCase(),
      });
      validateIdentifierShapes(text, relativePath, errors);
    }
  } catch {
    errors.push("slices/: missing required workflow artifact");
  }

  const requirements = parseRecords(
    requirementsText,
    "REQ",
    4,
    "REQUIREMENTS.md",
    errors,
  );
  const tasks = parseRecords(
    implementationTasksText || implementationPlanText,
    "TASK",
    4,
    implementationTasksText
      ? "IMPLEMENTATION_TASKS.md"
      : "IMPLEMENTATION_PLAN.md",
    errors,
  );
  const tests = parseRecords(
    testsText,
    "TC",
    4,
    "tracking/test-cases.md",
    errors,
  );
  const evidence = parseRecords(
    evidenceText,
    "EVID",
    4,
    "tracking/evidence.md",
    errors,
  );

  for (const [file, text] of [
    ["REQUIREMENTS.md", requirementsText],
    ["DESIGN.md", designText],
    [
      implementationTasksText
        ? "IMPLEMENTATION_TASKS.md"
        : "IMPLEMENTATION_PLAN.md",
      implementationTasksText || implementationPlanText,
    ],
    ["PLAN.md", planText],
    ["tracking/test-cases.md", testsText],
    ["tracking/evidence.md", evidenceText],
    ["tracking/todos.md", todosText],
    ["tracking/progress.md", progressText],
  ]) {
    validateIdentifierShapes(text, file, errors);
  }

  const known = {
    requirements: indexRecords(requirements),
    tasks: indexRecords(tasks),
    tests: indexRecords(tests),
    evidence: indexRecords(evidence),
    slices,
    design: new Map(
      idsIn(stripFencedCode(designText), "DESIGN", 4).map((id) => [id, true]),
    ),
  };

  validateRecordIndex(
    requirementsText,
    "Requirement Register",
    "REQ",
    4,
    known.requirements,
    "REQUIREMENTS.md",
    errors,
  );
  validateRecordIndex(
    implementationTasksText || implementationPlanText,
    "Task Register",
    "TASK",
    4,
    known.tasks,
    implementationTasksText
      ? "IMPLEMENTATION_TASKS.md"
      : "IMPLEMENTATION_PLAN.md",
    errors,
  );
  validateRecordIndex(
    testsText,
    "Test Case Register",
    "TC",
    4,
    known.tests,
    "tracking/test-cases.md",
    errors,
  );
  validateRecordIndex(
    evidenceText,
    "Evidence Index",
    "EVID",
    4,
    known.evidence,
    "tracking/evidence.md",
    errors,
  );

  for (const requirement of requirements)
    validateRequirement(requirement, known, slices, errors);
  for (const task of tasks)
    validateOwnedRecord(task, requiredTaskFields, known, errors);
  for (const testCase of tests)
    validateOwnedRecord(testCase, requiredTestFields, known, errors);
  for (const evidenceRecord of evidence)
    validateOwnedRecord(evidenceRecord, requiredEvidenceFields, known, errors);
  for (const task of tasks) {
    validateRecordStatus(
      task,
      new Set([
        "planned",
        "in_progress",
        "implemented",
        "reviewed",
        "blocked",
        "retired",
      ]),
      errors,
    );
  }
  for (const testCase of tests) {
    validateRecordStatus(
      testCase,
      new Set(["planned", "failing", "passing", "blocked", "retired"]),
      errors,
    );
  }
  for (const evidenceRecord of evidence) {
    validateRecordStatus(
      evidenceRecord,
      new Set([
        "planned",
        "captured",
        "passing",
        "failed",
        "blocked",
        "retired",
      ]),
      errors,
    );
    if (evidenceRecord.fields.get("status") === "passing") {
      for (const field of [
        "artifact",
        "captured_at",
        "verified_by",
        "result",
      ]) {
        const value = evidenceRecord.fields.get(field)?.toLowerCase();
        if (!value || ["none", "pending"].includes(value)) {
          errors.push(
            `${evidenceRecord.file}: passing evidence ${evidenceRecord.id} requires ${field}`,
          );
        }
      }
    }
  }
  for (const slice of slices.values())
    validateSlice(slice, known.requirements, known, errors);

  const activeSlices = [...slices.values()]
    .filter((slice) => slice.status === "active")
    .map((slice) => slice.id);
  if (activeSlices.length > 1)
    errors.push(`slices/: multiple active slices: ${activeSlices.join(", ")}`);
  const expectedActiveSlice = activeSlices[0] ?? "none";
  const activeSources = [
    ["PLAN.md", activeSliceValue(planText)],
    ["tracking/todos.md", activeSliceValue(todosText)],
    ["tracking/progress.md", activeSliceValue(progressText)],
  ];
  for (const [file, value] of activeSources) {
    if (value !== expectedActiveSlice) {
      errors.push(
        `${file}: active slice disagreement; expected ${expectedActiveSlice}, found ${value}`,
      );
    }
  }

  return { demoDir, errors: [...new Set(errors)] };
}

async function main() {
  const demoPath = process.argv[2];
  if (!demoPath) {
    console.error(
      "Usage: node scripts/validate-demo-workflow.mjs <demo-directory>",
    );
    process.exitCode = 2;
    return;
  }

  const result = await validateDemoWorkflow(demoPath);
  if (result.errors.length > 0) {
    console.error(`Workflow validation failed for ${result.demoDir}:`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Workflow validation passed: ${result.demoDir}`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}

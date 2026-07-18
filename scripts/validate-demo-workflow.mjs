#!/usr/bin/env node

import { access, readFile, readdir, stat } from "node:fs/promises";
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
  "affected_surfaces",
  "required_test_types",
  "required_evidence_types",
  "exclusions",
  "payment_domain_review_required",
  "payment_domain_review_reason",
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
  const duplicateFields = new Set();
  let currentField = null;

  for (const line of section.split("\n")) {
    const fieldMatch = line.match(/^- ([^:]+):\s*(.*)$/);
    if (fieldMatch) {
      currentField = normalizeField(fieldMatch[1]);
      if (fields.has(currentField)) duplicateFields.add(currentField);
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

  return { fields, duplicateFields };
}

function parseRecords(text, prefix, digits, file, errors) {
  const stripped = stripFencedCode(text);
  const headingPattern = new RegExp(`^###\\s+(${prefix}-[^\\s—]+)`, "gmi");
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
    const precedingSections = [
      ...stripped.slice(0, match.index).matchAll(/^## ([^#].*)$/gm),
    ];
    const parsedFields = parseFields(stripped.slice(start, end));
    const record = {
      id: match[1],
      title: match[2].trim(),
      fields: parsedFields.fields,
      file,
      sectionHeading:
        precedingSections[precedingSections.length - 1]?.[1]?.trim() ?? "none",
    };

    for (const field of parsedFields.duplicateFields) {
      errors.push(`${file}: ${record.id} has duplicate field ${field}`);
    }

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

function isPlaceholder(value) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (value.includes("{{")) return true;
  return normalized
    .split("|")
    .some((item) =>
      /^(?:none|pending|not applicable|n\/a|tbd|unassigned|unknown|unavailable|not recorded|not assigned|to be assigned|to be determined|vacant)(?:\b|:)/.test(
        item.trim(),
      ),
    );
}

function containsPlaceholderVocabulary(value) {
  return /\b(?:none|pending|not applicable|n\/a|tbd|unassigned|unknown|unavailable|not recorded|not assigned|to be assigned|to be determined|vacant)\b/i.test(
    value,
  );
}

function structuredPayload(value, prefix) {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith(`${prefix}:`)) return "";

  const payload = normalized.slice(prefix.length + 1).trim();
  if (
    containsPlaceholderVocabulary(payload) ||
    /\b(unresolved|blocked|declined)\b/.test(payload)
  ) {
    return "";
  }
  return payload;
}

function hasCriticalResolution(value) {
  const payload = structuredPayload(value, "resolved");
  return /\b(?:finding|review)-[a-z0-9][a-z0-9._-]*\b/.test(payload);
}

function hasMinorDisposition(value) {
  const payload = structuredPayload(value, "accepted");
  const match = payload.match(/\bfinding-[a-z0-9][a-z0-9._-]*\s*=\s*(.+)$/);
  return Boolean(match?.[1] && !isPlaceholder(match[1]));
}

function hasNonApplicabilityReason(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized.startsWith("not applicable:")) return false;

  const reason = normalized.slice("not applicable:".length).trim();
  return (
    !isPlaceholder(reason) &&
    !/\b(pending|unknown|unresolved|tbd|none|unassigned)\b/.test(reason)
  );
}

function idsIn(value, prefix, digits) {
  if (!value) return [];
  return [
    ...new Set(value.match(new RegExp(`${prefix}-\\d{${digits}}`, "g")) ?? []),
  ];
}

function declaredTypes(value) {
  return [
    ...new Set(
      (value ?? "")
        .split(/[,|]/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function artifactReferences(value) {
  return (
    value?.match(
      /https:\/\/[^\s,]+|(?:[A-Za-z0-9._-]+\/)+(?:[A-Za-z0-9._-]+)?(?:#[A-Za-z0-9._-]+)?/g,
    ) ?? []
  );
}

async function validateInspectableArtifacts(
  value,
  { demoDir, context, errors, requireFile = false },
) {
  const references = artifactReferences(value);
  if (references.length === 0) {
    errors.push(`${context} requires a resolvable local or HTTPS artifact`);
    return;
  }
  for (const reference of references) {
    if (/^https:\/\//i.test(reference)) continue;
    const localReference = reference.split("#")[0];
    const artifactPath = path.resolve(demoDir, localReference);
    const relativeArtifact = path.relative(demoDir, artifactPath);
    try {
      if (
        relativeArtifact.startsWith("..") ||
        path.isAbsolute(relativeArtifact)
      )
        throw new Error("outside demo");
      await access(artifactPath);
      if (requireFile && !(await stat(artifactPath)).isFile()) {
        throw new Error("not a file");
      }
    } catch {
      errors.push(`${context} artifact does not exist: ${localReference}`);
    }
  }
}

function isImplementationRoutingWork(value) {
  return /\b(?:implementation|implement|coding|development|build|execution|task-\d+)\b/i.test(
    value,
  );
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

function sectionHeadingCount(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    ...stripFencedCode(text).matchAll(new RegExp(`^## ${escaped}\\s*$`, "gm")),
  ].length;
}

function requireSectionsOnce(text, headings, file, errors) {
  for (const heading of headings) {
    if (sectionHeadingCount(text, heading) !== 1) {
      errors.push(`${file}: ${heading} must appear exactly once`);
    }
  }
}

function topField(text, label) {
  const stripped = stripFencedCode(text);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    stripped.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, "mi"))?.[1]?.trim() ??
    "none"
  );
}

function topFieldCount(text, label) {
  const stripped = stripFencedCode(text);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...stripped.matchAll(new RegExp(`^- ${escaped}:`, "gmi"))].length;
}

function parseTable(sectionText) {
  const parsedRows = sectionText
    .split("\n")
    .filter((line) => /^\|.+\|\s*$/.test(line))
    .map((line) =>
      line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim()),
    )
    .filter((cells) => cells.length > 0);

  const headers = parsedRows[0] ?? [];
  const rows = parsedRows
    .slice(1)
    .filter(
      (cells) =>
        !cells.every((cell) => /^:?-+:?$/.test(cell.replaceAll(" ", ""))),
    );
  return { headers, rows };
}

function tableRows(sectionText) {
  return parseTable(sectionText).rows;
}

function tableColumnIndex(table, column) {
  const normalizedColumn = normalizeField(column);
  return table.headers.findIndex(
    (header) => normalizeField(header) === normalizedColumn,
  );
}

function tableColumnValues(sectionText, column) {
  const table = parseTable(sectionText);
  const index = tableColumnIndex(table, column);
  if (index === -1) return [];
  return table.rows.map((row) => row[index] ?? "");
}

function validateTableColumns(table, columns, { heading, file, errors }) {
  for (const column of columns) {
    const normalizedColumn = normalizeField(column);
    const count = table.headers.filter(
      (header) => normalizeField(header) === normalizedColumn,
    ).length;
    if (count !== 1) {
      errors.push(`${file}: ${heading} must have exactly one ${column} column`);
    }
  }
}

function keyedTableRows(
  sectionText,
  column,
  prefix,
  digits,
  { heading, file, errors, duplicateLabel = "ID" } = {},
) {
  const table = parseTable(sectionText);
  const normalizedColumn = normalizeField(column);
  const matchingColumns = table.headers
    .map((header, index) => ({ header, index }))
    .filter(({ header }) => normalizeField(header) === normalizedColumn);
  if (matchingColumns.length !== 1) {
    if (errors) {
      errors.push(
        `${file}: ${heading} must have exactly one ${column} key column`,
      );
    }
    return [];
  }
  const index = matchingColumns[0].index;

  const exactId = new RegExp(`^${prefix}-\\d{${digits}}$`);
  const keyedRows = [];
  const seen = new Set();
  for (const cells of table.rows) {
    const id = (cells[index] ?? "").trim();
    if (!exactId.test(id)) {
      if (errors) {
        errors.push(
          `${file}: ${heading} has invalid ${column} key ${id || "<empty>"}`,
        );
      }
      continue;
    }
    if (seen.has(id) && errors) {
      errors.push(`${file}: ${heading} has duplicate ${duplicateLabel} ${id}`);
    }
    seen.add(id);
    keyedRows.push({ id, cells });
  }
  return keyedRows;
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

function validateApprovedDesignReferences(record, field, knownDesign, errors) {
  for (const id of idsIn(record.fields.get(field), "DESIGN", 4)) {
    const decision = knownDesign.get(id);
    if (decision && decision.status !== "approved") {
      errors.push(
        `${record.file}: ${record.id} references non-approved design decision ${id} (${decision.status})`,
      );
    }
  }
}

function isDurableUserReference(value) {
  const match = (value ?? "").match(
    /^user:([^:]+):(\d{4})-(\d{2})-(\d{2}):([^:]+)$/,
  );
  if (!match || isPlaceholder(match[1]) || isPlaceholder(match[5])) {
    return false;
  }

  const year = Number(match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isRealIsoDate(value) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isRealTimestamp(value) {
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/,
  );
  if (!match || !isRealIsoDate(match[1])) return false;
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  const second = Number(match[4]);
  const offsetHour = Number(match[6] ?? 0);
  const offsetMinute = Number(match[7] ?? 0);
  return (
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59 &&
    !Number.isNaN(Date.parse(value))
  );
}

function markdownHasAnchor(text, anchor) {
  const normalizedAnchor = anchor.trim().toLowerCase();
  return [...stripFencedCode(text).matchAll(/^#{1,6}\s+(.+)$/gm)].some(
    (match) =>
      match[1]
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") === normalizedAnchor,
  );
}

function isDurableRequirementSource(value) {
  if (isPlaceholder(value)) return false;
  if (value.startsWith("user:")) return isDurableUserReference(value);

  const match = value.match(/^(repo|wiki|official):(.+)@(\d{4}-\d{2}-\d{2})$/);
  if (!match || isPlaceholder(match[2]) || !isRealIsoDate(match[3])) {
    return false;
  }
  if (match[1] === "official") return /^https:\/\//.test(match[2]);
  return match[2].includes("#");
}

const registerColumnMappings = {
  "Requirement Register": [
    ["Title", "title"],
    ["Lifecycle", "lifecycle_status"],
    ["Disposition", "planning_disposition"],
    ["Target slice", "target_slice"],
    ["Source", "source"],
  ],
  "Tombstone Register": [
    ["Title", "title"],
    ["Removal reason", "removal_reason"],
    ["Approval reference", "approval_reference"],
  ],
  "Task Register": [
    ["Slice", "slice"],
    ["Requirements", "requirements", "REQ", 4],
    ["Design decisions", "design_decisions", "DESIGN", 4],
    ["Tests", "test_cases", "TC", 4],
    ["Evidence", "evidence", "EVID", 4],
    ["Status", "status"],
  ],
  "Test Case Register": [
    ["Requirements", "requirements", "REQ", 4],
    ["Slice", "slice"],
    ["Evidence", "evidence", "EVID", 4],
    ["Status", "status"],
  ],
  "Evidence Index": [
    ["Requirements", "requirements", "REQ", 4],
    ["Slice", "slice"],
    ["Type", "type"],
    ["Status", "status"],
    ["Artifact", "artifact"],
  ],
};

function registerValueMatches(actual, expected, prefix, digits) {
  if (prefix) {
    const actualIds = idsIn(actual, prefix, digits).sort();
    const expectedIds = idsIn(expected, prefix, digits).sort();
    if (actualIds.length === 0 || expectedIds.length === 0) {
      return isNone(actual) && isNone(expected);
    }
    return actualIds.join(",") === expectedIds.join(",");
  }
  return (
    (actual ?? "").trim().toLowerCase().replace(/\s+/g, " ") ===
    (expected ?? "").trim().toLowerCase().replace(/\s+/g, " ")
  );
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
  const indexSection = section(text, heading);
  const idColumn =
    {
      "Requirement Register": "ID",
      "Tombstone Register": "ID",
      "Task Register": "Task",
      "Test Case Register": "Test ID",
      "Evidence Index": "Evidence",
    }[heading] ?? "ID";
  const indexTable = parseTable(indexSection);
  validateTableColumns(
    indexTable,
    [
      idColumn,
      ...(registerColumnMappings[heading] ?? []).map(([column]) => column),
    ],
    { heading, file, errors },
  );
  const indexedRows = keyedTableRows(indexSection, idColumn, prefix, digits, {
    heading,
    file,
    errors,
  });
  const indexedIds = indexedRows.map((row) => row.id);

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

  for (const { id, cells } of indexedRows) {
    const record = records.get(id);
    if (!record) continue;
    for (const [
      column,
      field,
      valuePrefix,
      valueDigits,
    ] of registerColumnMappings[heading] ?? []) {
      const columnIndex = tableColumnIndex(indexTable, column);
      if (columnIndex === -1) continue;
      const expected =
        field === "title" ? record.title : record.fields.get(field);
      if (
        !registerValueMatches(
          cells[columnIndex] ?? "",
          expected ?? "",
          valuePrefix,
          valueDigits,
        )
      ) {
        errors.push(
          `${file}: ${heading} ${id} ${column} disagrees with record`,
        );
      }
    }
  }
}

function validateRequirement(requirement, known, slices, errors) {
  requireFields(requirement, requiredRequirementFields, errors);

  const lifecycle = requirement.fields.get("lifecycle_status");
  const disposition = requirement.fields.get("planning_disposition");
  if (
    ["approved", "in_progress", "implemented", "verified"].includes(lifecycle)
  ) {
    for (const field of [
      "acceptance",
      "negative_cases",
      "affected_surfaces",
      "required_test_types",
      "required_evidence_types",
      "exclusions",
    ]) {
      if (isPlaceholder(requirement.fields.get(field))) {
        errors.push(
          `${requirement.file}: ${requirement.id} requires concrete ${field}`,
        );
      }
    }
    if (
      !["yes", "no"].includes(
        requirement.fields.get("payment_domain_review_required"),
      )
    ) {
      errors.push(
        `${requirement.file}: ${requirement.id} Payment-domain review required must be yes or no`,
      );
    }
    if (isPlaceholder(requirement.fields.get("payment_domain_review_reason"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} requires concrete payment-domain review reason`,
      );
    }
  }
  if (
    ["approved", "in_progress", "implemented", "verified"].includes(
      lifecycle,
    ) &&
    !isDurableUserReference(requirement.fields.get("approval_reference"))
  ) {
    errors.push(
      `${requirement.file}: ${lifecycle} requirement ${requirement.id} requires a durable user approval reference`,
    );
  }
  if (lifecycle === "removed" && requirement.sectionHeading !== "Tombstones") {
    errors.push(
      `${requirement.file}: removed requirement ${requirement.id} must be in the Tombstones section`,
    );
  } else if (
    lifecycle !== "removed" &&
    requirement.sectionHeading !== "Active Requirement Records"
  ) {
    errors.push(
      `${requirement.file}: active requirement ${requirement.id} must be in Active Requirement Records`,
    );
  }
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
    !["approved", "active", "blocked"].includes(target.status)
  ) {
    errors.push(
      `${requirement.file}: ${requirement.id} active_slice target ${targetSlice} must be approved, active, or blocked`,
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
  if (!isDurableRequirementSource(source)) {
    const sourceKind = source.startsWith("user:") ? "user source" : "source";
    errors.push(
      `${requirement.file}: ${requirement.id} requires a durable ${sourceKind}`,
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
    if (!isDurableUserReference(requirement.fields.get("approval_reference"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} deferred requires a user approval reference in durable user:<id>:<date>:<locator> form`,
      );
    }
  }

  if (disposition === "removed") {
    if (isNone(requirement.fields.get("removal_reason"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} removed requires removal_reason`,
      );
    }
    if (!isDurableUserReference(requirement.fields.get("approval_reference"))) {
      errors.push(
        `${requirement.file}: ${requirement.id} removed requires a user approval reference in durable user:<id>:<date>:<locator> form`,
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
  validateApprovedDesignReferences(
    requirement,
    "design_links",
    known.design,
    errors,
  );
  if (
    ["approved", "in_progress", "implemented", "verified"].includes(
      lifecycle,
    ) &&
    (disposition === "active_slice" ||
      lifecycle === "verified" ||
      (disposition === "future_slice" && target?.status === "approved"))
  ) {
    for (const requiredType of declaredTypes(
      requirement.fields.get("required_test_types"),
    )) {
      const hasLinkedType = idsIn(
        requirement.fields.get("test_links"),
        "TC",
        4,
      ).some((id) =>
        declaredTypes(known.tests.get(id)?.fields.get("layer")).includes(
          requiredType,
        ),
      );
      if (!hasLinkedType) {
        errors.push(
          `${requirement.file}: ${requirement.id} required test type ${requiredType} has no linked test case`,
        );
      }
    }
    for (const requiredType of declaredTypes(
      requirement.fields.get("required_evidence_types"),
    )) {
      const hasLinkedType = idsIn(
        requirement.fields.get("evidence_links"),
        "EVID",
        4,
      ).some((id) =>
        declaredTypes(known.evidence.get(id)?.fields.get("type")).includes(
          requiredType,
        ),
      );
      if (!hasLinkedType) {
        errors.push(
          `${requirement.file}: ${requirement.id} required evidence type ${requiredType} has no linked evidence`,
        );
      }
    }
  }
  for (const designId of idsIn(
    requirement.fields.get("design_links"),
    "DESIGN",
    4,
  )) {
    const design = known.design.get(designId);
    if (
      design?.status === "approved" &&
      !idsIn(design.requirementLinks, "REQ", 4).includes(requirement.id)
    ) {
      errors.push(
        `${requirement.file}: ${requirement.id} design decision ${designId} must link back from DESIGN.md`,
      );
    }
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

  if (disposition === "future_slice" && target?.status === "proposed") {
    const hasSpeculativeLinks = [
      ["task_links", "TASK"],
      ["test_links", "TC"],
      ["evidence_links", "EVID"],
    ].some(
      ([field, prefix]) =>
        idsIn(requirement.fields.get(field), prefix, 4).length > 0,
    );
    if (hasSpeculativeLinks) {
      errors.push(
        `${requirement.file}: ${requirement.id} future_slice targeting proposed ${targetSlice} cannot have speculative task, test, or evidence links`,
      );
    }
  }

  if (["active_slice", "future_slice"].includes(disposition) && target) {
    for (const [field, prefix, records] of [
      ["task_links", "TASK", known.tasks],
      ["test_links", "TC", known.tests],
      ["evidence_links", "EVID", known.evidence],
    ]) {
      for (const id of idsIn(requirement.fields.get(field), prefix, 4)) {
        const record = records.get(id);
        const recordSlices = idsIn(record?.fields.get("slice"), "SLICE", 3);
        if (record && recordSlices.length !== 1) {
          errors.push(
            `${record.file}: ${id} must belong only to target slice ${targetSlice} for ${requirement.id}`,
          );
        } else if (record && recordSlices[0] !== targetSlice) {
          errors.push(
            `${record.file}: ${id} must belong to target slice ${targetSlice} for ${requirement.id}`,
          );
        }
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

    for (const [field, prefix, records] of [
      ["task_links", "TASK", known.tasks],
      ["test_links", "TC", known.tests],
      ["evidence_links", "EVID", known.evidence],
    ]) {
      for (const id of idsIn(requirement.fields.get(field), prefix, 4)) {
        if (records.get(id)?.fields.get("status") === "retired") {
          errors.push(
            `${records.get(id).file}: ${id} is retired and cannot cover active-slice requirement ${requirement.id}`,
          );
        }
      }
    }

    const slice = slices.get(targetSlice);
    if (slice) {
      const inheritedIds = keyedTableRows(
        section(slice.text, "Inherited Requirements"),
        "Requirement",
        "REQ",
        4,
      ).map((row) => row.id);
      if (!inheritedIds.includes(requirement.id)) {
        errors.push(
          `${slice.file}: active-slice requirement ${requirement.id} is not inherited by ${targetSlice}`,
        );
      }
      const coverageSection = section(slice.text, "Coverage");
      const coverageRow = keyedTableRows(
        coverageSection,
        "Requirement",
        "REQ",
        4,
      ).find((row) => row.id === requirement.id)?.cells;
      if (!coverageRow) {
        errors.push(
          `${slice.file}: ${targetSlice} has no coverage row for ${requirement.id}`,
        );
      }
      const coverageTable = parseTable(coverageSection);
      for (const [field, prefix, columnName] of [
        ["task_links", "TASK", "Tasks"],
        ["test_links", "TC", "Test cases"],
        ["evidence_links", "EVID", "Evidence"],
      ]) {
        const column = tableColumnIndex(coverageTable, columnName);
        for (const id of idsIn(requirement.fields.get(field), prefix, 4)) {
          if (
            column === -1 ||
            !idsIn(coverageRow?.[column], prefix, 4).includes(id)
          ) {
            errors.push(
              `${slice.file}: coverage row for ${requirement.id} is missing ${id}`,
            );
          }
        }
      }
    }
  }

  if (lifecycle === "verified") {
    const taskIds = idsIn(requirement.fields.get("task_links"), "TASK", 4);
    const evidenceIds = idsIn(
      requirement.fields.get("evidence_links"),
      "EVID",
      4,
    );
    const testIds = idsIn(requirement.fields.get("test_links"), "TC", 4);
    if (taskIds.length === 0) {
      errors.push(
        `${requirement.file}: verified requirement ${requirement.id} requires at least one task link`,
      );
    }
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
    for (const taskId of taskIds) {
      if (
        !["implemented", "reviewed"].includes(
          known.tasks.get(taskId)?.fields.get("status"),
        )
      ) {
        errors.push(
          `${requirement.file}: verified requirement ${requirement.id} requires completed task ${taskId}`,
        );
      }
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
    const linkedRecords = [
      ...taskIds.map((id) => known.tasks.get(id)),
      ...testIds.map((id) => known.tests.get(id)),
      ...evidenceIds.map((id) => known.evidence.get(id)),
    ].filter(Boolean);
    const ownerSliceIds = new Set(
      linkedRecords.map((record) => record.fields.get("slice")),
    );
    const ownerSliceId =
      ownerSliceIds.size === 1 ? [...ownerSliceIds][0] : "none";
    const ownerSlice = slices.get(ownerSliceId);
    const inheritedByOwner = ownerSlice
      ? keyedTableRows(
          section(ownerSlice.text, "Inherited Requirements"),
          "Requirement",
          "REQ",
          4,
        ).some((row) => row.id === requirement.id)
      : false;
    if (
      ownerSliceIds.size !== 1 ||
      ownerSlice?.status !== "closed" ||
      !inheritedByOwner
    ) {
      errors.push(
        `${requirement.file}: verified requirement ${requirement.id} requires a closed owner slice that inherits it`,
      );
    }
  }
}

function validateReviewers(
  slice,
  designReviewRequired,
  assignedImplementationAgents,
  errors,
) {
  if (!["approved", "active", "blocked", "closed"].includes(slice.status))
    return;

  const reviewerSection = section(slice.text, "Reviewer Assignments");
  const reviewerTable = parseTable(reviewerSection);
  validateTableColumns(
    reviewerTable,
    [
      "Lane",
      "Reviewer/agent",
      "Independent from implementer",
      "Model and effort",
      "Required inputs",
      "Decision authority",
    ],
    {
      heading: "Reviewer Assignments",
      file: slice.file,
      errors,
    },
  );
  const rows = reviewerTable.rows;
  const cell = (row, column) => {
    const index = tableColumnIndex(reviewerTable, column);
    return index === -1 ? "" : (row[index] ?? "");
  };
  const seenLanes = new Set();
  for (const cells of rows) {
    const lane = cell(cells, "Lane").toLowerCase();
    if (!lane) continue;
    if (seenLanes.has(lane)) {
      errors.push(
        `${slice.file}: Reviewer Assignments has duplicate lane ${lane}`,
      );
    }
    seenLanes.add(lane);
  }
  const byLane = new Map(
    rows.map((cells) => [cell(cells, "Lane").toLowerCase(), cells]),
  );

  for (const lane of [
    "requirements coverage",
    "design fidelity",
    "engineering quality",
  ]) {
    const row = byLane.get(lane);
    if (!row) {
      errors.push(
        `${slice.file}: ${slice.id} requires a complete ${lane} reviewer assignment`,
      );
      continue;
    }
    if (cell(row, "Independent from implementer").toLowerCase() !== "yes") {
      const label = lane[0].toUpperCase() + lane.slice(1);
      errors.push(`${slice.file}: ${label} reviewer must be independent`);
    }
    const reviewer = cell(row, "Reviewer/agent");
    if (
      lane === "design fidelity" &&
      !designReviewRequired &&
      hasNonApplicabilityReason(reviewer)
    )
      continue;
    if (assignedImplementationAgents.has(reviewer.toLowerCase())) {
      const label = lane[0].toUpperCase() + lane.slice(1);
      errors.push(
        `${slice.file}: ${label} reviewer ${reviewer} is assigned implementation work`,
      );
    }
    if (
      (lane === "requirements coverage" ||
        (lane === "design fidelity" && designReviewRequired) ||
        (lane === "engineering quality" && slice.status === "closed")) &&
      !(
        /\bstrongest\b/i.test(cell(row, "Model and effort")) &&
        /\bhigh\b/i.test(cell(row, "Model and effort"))
      )
    ) {
      const label = lane[0].toUpperCase() + lane.slice(1);
      errors.push(
        `${slice.file}: ${label} reviewer requires strongest high-effort review`,
      );
    }
    const incomplete = [
      reviewer,
      cell(row, "Model and effort"),
      cell(row, "Required inputs"),
      cell(row, "Decision authority"),
    ].some((value) => isPlaceholder(value));
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
      isPlaceholder(cell(row, "Reviewer/agent")) ||
      cell(row, "Independent from implementer").toLowerCase() !== "yes" ||
      [
        cell(row, "Model and effort"),
        cell(row, "Required inputs"),
        cell(row, "Decision authority"),
      ].some((value) => isPlaceholder(value));
    if (incomplete) {
      errors.push(
        `${slice.file}: ${slice.id} requires a complete payment-domain engineering sub-review assignment`,
      );
    }
    if (
      row &&
      assignedImplementationAgents.has(
        cell(row, "Reviewer/agent").toLowerCase(),
      )
    ) {
      errors.push(
        `${slice.file}: Payment-domain reviewer ${cell(row, "Reviewer/agent")} is assigned implementation work`,
      );
    }
    if (
      row &&
      !(
        /\bstrongest\b/i.test(cell(row, "Model and effort")) &&
        /\bhigh\b/i.test(cell(row, "Model and effort"))
      )
    ) {
      errors.push(
        `${slice.file}: Payment-domain reviewer requires strongest high-effort review`,
      );
    }
  } else if (
    slice.paymentReviewRequired === "no" &&
    (!paymentRow ||
      !hasNonApplicabilityReason(cell(paymentRow, "Reviewer/agent")))
  ) {
    errors.push(
      `${slice.file}: ${slice.id} requires a payment-domain sub-review non-applicability reason`,
    );
  }
}

async function validateSlice(slice, requirements, known, demoDir, errors) {
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
  if (
    ["approved", "active", "blocked", "closed"].includes(slice.status) &&
    !isDurableUserReference(slice.userApprovalReference)
  ) {
    errors.push(
      `${slice.file}: ${slice.status} slice ${slice.id} requires a durable user approval reference`,
    );
  }
  if (
    ["approved", "active", "blocked", "closed"].includes(slice.status) &&
    isPlaceholder(slice.steward)
  ) {
    errors.push(`${slice.file}: ${slice.id} requires a concrete Slice Steward`);
  }
  for (const [heading, label] of [
    ["Goal And Outcome", "goal and outcome"],
    ["Explicit Non-Goals", "explicit non-goals"],
  ]) {
    if (
      ["approved", "active", "blocked", "closed"].includes(slice.status) &&
      isPlaceholder(section(slice.text, heading).trim())
    ) {
      errors.push(`${slice.file}: ${slice.id} requires concrete ${label}`);
    }
  }
  for (const heading of ["Entry Criteria", "Exit Criteria"]) {
    const checklistItems = [
      ...section(slice.text, heading).matchAll(/^- \[([ xX])\]\s+\S.*$/gm),
    ];
    if (checklistItems.length === 0) {
      errors.push(`${slice.file}: ${slice.id} requires checklist ${heading}`);
    } else if (
      heading === "Entry Criteria" &&
      ["approved", "active", "blocked", "closed"].includes(slice.status) &&
      checklistItems.some((item) => item[1].toLowerCase() !== "x")
    ) {
      errors.push(
        `${slice.file}: ${slice.status} slice ${slice.id} requires all Entry Criteria checked`,
      );
    } else if (
      heading === "Exit Criteria" &&
      slice.status === "closed" &&
      checklistItems.some((item) => item[1].toLowerCase() !== "x")
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires all Exit Criteria checked`,
      );
    }
  }

  const deferrals = section(slice.text, "Deferrals And Removals");
  const deferralsTable = parseTable(deferrals);
  validateTableColumns(
    deferralsTable,
    [
      "Requirement",
      "Proposed disposition",
      "Reason",
      "Next trigger",
      "User approval reference",
    ],
    { heading: "Deferrals And Removals", file: slice.file, errors },
  );
  const deferralRows = keyedTableRows(deferrals, "Requirement", "REQ", 4, {
    heading: "Deferrals And Removals",
    file: slice.file,
    errors,
    duplicateLabel: "requirement row",
  });
  for (const { id } of deferralRows) {
    if (!requirements.has(id)) {
      errors.push(
        `${slice.file}: Deferrals And Removals references unknown requirement ${id}`,
      );
    }
  }
  const deferralDispositionColumn = tableColumnIndex(
    deferralsTable,
    "Proposed disposition",
  );
  const deferralReasonColumn = tableColumnIndex(deferralsTable, "Reason");
  const deferralTriggerColumn = tableColumnIndex(
    deferralsTable,
    "Next trigger",
  );
  const deferralApprovalColumn = tableColumnIndex(
    deferralsTable,
    "User approval reference",
  );
  for (const { id, cells } of deferralRows) {
    const disposition = (cells[deferralDispositionColumn] ?? "").toLowerCase();
    const requirementDisposition = requirements
      .get(id)
      ?.fields.get("planning_disposition");
    if (disposition !== requirementDisposition) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} disposition ${disposition} disagrees with REQUIREMENTS.md`,
      );
    }
    if (!["deferral_proposed", "deferred", "removed"].includes(disposition)) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} has invalid disposition ${disposition}`,
      );
    }
    const reason = cells[deferralReasonColumn] ?? "";
    const nextTrigger = cells[deferralTriggerColumn] ?? "";
    if (
      ["deferral_proposed", "deferred"].includes(disposition) &&
      (isPlaceholder(reason) || isPlaceholder(nextTrigger))
    ) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} ${disposition} requires concrete reason and next trigger`,
      );
    }
    if (disposition === "removed" && isPlaceholder(reason)) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} removed requires concrete reason`,
      );
    }
    if (
      ["deferred", "removed"].includes(disposition) &&
      !isDurableUserReference(cells[deferralApprovalColumn] ?? "")
    ) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} ${disposition} requires durable user approval`,
      );
    }
    if (
      disposition === "deferral_proposed" &&
      !/^pending(?:\s*:\s*.+)?$/i.test(
        (cells[deferralApprovalColumn] ?? "").trim(),
      )
    ) {
      errors.push(
        `${slice.file}: Deferrals And Removals ${id} deferral_proposed requires pending user approval`,
      );
    }
  }

  const routing = section(slice.text, "Skill And Model Routing");
  const routingTable = parseTable(routing);
  validateTableColumns(
    routingTable,
    [
      "Work",
      "Required or conditional skill",
      "Trigger or non-applicable reason",
      "Assigned agent",
      "Model",
      "Effort",
      "Escalation condition",
    ],
    { heading: "Skill And Model Routing", file: slice.file, errors },
  );
  if (
    ["approved", "active", "blocked", "closed"].includes(slice.status) &&
    (routingTable.rows.length === 0 ||
      routingTable.rows.some((row) => row.some((cell) => isPlaceholder(cell))))
  ) {
    errors.push(
      `${slice.file}: ${slice.id} requires concrete skill and model routing`,
    );
  }
  const routingWorkColumn = tableColumnIndex(routingTable, "Work");
  const assignedAgentColumn = tableColumnIndex(routingTable, "Assigned agent");
  const assignedImplementationAgents = new Set(
    routingTable.rows
      .filter((row) =>
        isImplementationRoutingWork(row[routingWorkColumn] ?? ""),
      )
      .map((row) => (row[assignedAgentColumn] ?? "").trim().toLowerCase())
      .filter(Boolean),
  );

  const knowledgeEvidence = section(slice.text, "Knowledge Evidence");
  if (slice.paymentReviewRequired === "yes") {
    for (const label of [
      "Question and search terms",
      "Wiki pages/source summaries/raw files",
      "Confirmed conclusions and confidence",
      "Contradictions, staleness, assumptions, or gaps",
      "Official verification and retrieval date",
      "Affected identifiers",
    ]) {
      if (
        topFieldCount(knowledgeEvidence, label) !== 1 ||
        isPlaceholder(topField(knowledgeEvidence, label))
      ) {
        errors.push(
          `${slice.file}: payment slice ${slice.id} requires concrete Knowledge Evidence field ${label}`,
        );
      }
    }
  }
  const inheritedSection = section(slice.text, "Inherited Requirements");
  const inheritedTable = parseTable(inheritedSection);
  validateTableColumns(
    inheritedTable,
    ["Requirement", "Lifecycle", "Disposition", "Acceptance in this slice"],
    {
      heading: "Inherited Requirements",
      file: slice.file,
      errors,
    },
  );
  const inheritedRows = keyedTableRows(
    inheritedSection,
    "Requirement",
    "REQ",
    4,
    {
      heading: "Inherited Requirements",
      file: slice.file,
      errors,
      duplicateLabel: "requirement row",
    },
  );
  const inheritedIds = inheritedRows.map((row) => row.id);
  const expectedPaymentReview = inheritedRows.some(
    ({ id }) =>
      requirements.get(id)?.fields.get("payment_domain_review_required") ===
      "yes",
  )
    ? "yes"
    : "no";
  if (slice.paymentReviewRequired !== expectedPaymentReview) {
    errors.push(
      `${slice.file}: ${slice.id} payment-domain sub-review ${slice.paymentReviewRequired} disagrees with inherited requirements (${expectedPaymentReview})`,
    );
  }
  const inheritedLifecycleColumn = tableColumnIndex(
    inheritedTable,
    "Lifecycle",
  );
  const inheritedDispositionColumn = tableColumnIndex(
    inheritedTable,
    "Disposition",
  );
  const inheritedAcceptanceColumn = tableColumnIndex(
    inheritedTable,
    "Acceptance in this slice",
  );
  for (const { id: requirementId, cells } of inheritedRows) {
    const requirement = requirements.get(requirementId);
    if (!requirement) {
      errors.push(
        `${slice.file}: ${slice.id} inherits unknown requirement ${requirementId}`,
      );
      continue;
    }
    for (const [column, field, index] of [
      ["Lifecycle", "lifecycle_status", inheritedLifecycleColumn],
      ["Disposition", "planning_disposition", inheritedDispositionColumn],
    ]) {
      if (
        index === -1 ||
        (cells[index] ?? "").trim().toLowerCase() !==
          (requirement.fields.get(field) ?? "").trim().toLowerCase()
      ) {
        errors.push(
          `${slice.file}: Inherited Requirements ${requirementId} ${column} disagrees with REQUIREMENTS.md`,
        );
      }
    }
    if (
      ["approved", "active", "blocked", "closed"].includes(slice.status) &&
      (inheritedAcceptanceColumn === -1 ||
        isPlaceholder(cells[inheritedAcceptanceColumn]))
    ) {
      errors.push(
        `${slice.file}: Inherited Requirements ${requirementId} requires concrete Acceptance in this slice`,
      );
    }
    if (["active", "blocked"].includes(slice.status)) {
      const disposition = requirement.fields.get("planning_disposition");
      if (disposition !== "active_slice") {
        errors.push(
          `${slice.file}: ${slice.status} slice ${slice.id} cannot inherit ${requirementId} with disposition ${disposition}`,
        );
      } else if (requirement.fields.get("target_slice") !== slice.id) {
        errors.push(
          `${slice.file}: ${slice.status} slice ${slice.id} cannot inherit ${requirementId} targeted to ${requirement.fields.get("target_slice")}`,
        );
      }
    }
  }

  const coverage = section(slice.text, "Coverage");
  const coverageTable = parseTable(coverage);
  validateTableColumns(
    coverageTable,
    ["Requirement", "Tasks", "Test cases", "Evidence"],
    { heading: "Coverage", file: slice.file, errors },
  );
  const coverageRequirementRows = keyedTableRows(
    coverage,
    "Requirement",
    "REQ",
    4,
    {
      heading: "Coverage",
      file: slice.file,
      errors,
      duplicateLabel: "requirement row",
    },
  );
  for (const { id } of coverageRequirementRows) {
    if (!requirements.has(id)) {
      errors.push(
        `${slice.file}: ${slice.id} coverage references unknown requirement ${id}`,
      );
    } else if (!inheritedIds.includes(id)) {
      errors.push(
        `${slice.file}: coverage requirement ${id} is not inherited by ${slice.id}`,
      );
    }
  }
  for (const [column, prefix, digits, records, label] of [
    ["Tasks", "TASK", 4, known.tasks, "task"],
    ["Test cases", "TC", 4, known.tests, "test case"],
    ["Evidence", "EVID", 4, known.evidence, "evidence"],
  ]) {
    for (const id of idsIn(
      tableColumnValues(coverage, column).join(" "),
      prefix,
      digits,
    )) {
      if (!records.has(id))
        errors.push(
          `${slice.file}: ${slice.id} coverage references unknown ${label} ${id}`,
        );
    }
  }

  const designLinksSection = section(slice.text, "Design And State Links");
  for (const label of [
    "Design decisions",
    "Design-system contracts",
    "Page contracts",
    "Mockups/state boards",
  ]) {
    if (topFieldCount(designLinksSection, label) !== 1) {
      errors.push(
        `${slice.file}: ${slice.id} ${label} must appear exactly once`,
      );
    }
  }
  const sliceDesignRecord = {
    id: slice.id,
    file: slice.file,
    fields: new Map([
      ["design_links", topField(designLinksSection, "Design decisions")],
    ]),
  };
  validateReferences(
    sliceDesignRecord,
    "design_links",
    "DESIGN",
    4,
    known.design,
    "design decision",
    errors,
  );
  validateApprovedDesignReferences(
    sliceDesignRecord,
    "design_links",
    known.design,
    errors,
  );
  const sliceDesignIds = new Set(
    idsIn(sliceDesignRecord.fields.get("design_links"), "DESIGN", 4),
  );
  const applicableDesignIds = new Set(sliceDesignIds);
  const coverageRowsByRequirement = new Map(
    coverageRequirementRows.map((row) => [row.id, row.cells]),
  );

  for (const requirementId of inheritedIds) {
    const requirement = requirements.get(requirementId);
    if (!requirement) continue;

    const coverageRow = coverageRowsByRequirement.get(requirementId);
    if (!coverageRow) {
      errors.push(
        `${slice.file}: ${slice.id} has no coverage row for ${requirementId}`,
      );
    }
    for (const [field, prefix, columnName, records] of [
      ["task_links", "TASK", "Tasks", known.tasks],
      ["test_links", "TC", "Test cases", known.tests],
      ["evidence_links", "EVID", "Evidence", known.evidence],
    ]) {
      const column = tableColumnIndex(coverageTable, columnName);
      const expectedIds = idsIn(requirement.fields.get(field), prefix, 4);
      const actualIds =
        column === -1 ? [] : idsIn(coverageRow?.[column], prefix, 4);
      for (const id of expectedIds) {
        if (column === -1 || !actualIds.includes(id)) {
          errors.push(
            `${slice.file}: coverage row for ${requirementId} is missing ${id}`,
          );
        }
        const record = records.get(id);
        if (record && record.fields.get("slice") !== slice.id) {
          errors.push(
            `${record.file}: ${id} must belong to inherited slice ${slice.id} for ${requirementId}`,
          );
        }
      }
      for (const id of actualIds) {
        if (!expectedIds.includes(id)) {
          errors.push(
            `${slice.file}: coverage row for ${requirementId} has unexpected ${id}`,
          );
        }
      }
    }

    const requirementDesignIds = idsIn(
      requirement.fields.get("design_links"),
      "DESIGN",
      4,
    );
    for (const designId of requirementDesignIds) {
      applicableDesignIds.add(designId);
      if (!sliceDesignIds.has(designId)) {
        errors.push(
          `${slice.file}: ${slice.id} is missing inherited design decision ${designId} for ${requirementId}`,
        );
      }
      for (const taskId of idsIn(
        requirement.fields.get("task_links"),
        "TASK",
        4,
      )) {
        const task = known.tasks.get(taskId);
        if (
          task &&
          !idsIn(task.fields.get("design_decisions"), "DESIGN", 4).includes(
            designId,
          )
        ) {
          errors.push(
            `${task.file}: ${taskId} is missing inherited design decision ${designId} for ${requirementId}`,
          );
        }
      }
    }
  }

  for (const taskId of idsIn(
    tableColumnValues(coverage, "Tasks").join(" "),
    "TASK",
    4,
  )) {
    for (const designId of idsIn(
      known.tasks.get(taskId)?.fields.get("design_decisions"),
      "DESIGN",
      4,
    )) {
      applicableDesignIds.add(designId);
      if (!sliceDesignIds.has(designId)) {
        errors.push(
          `${slice.file}: ${slice.id} is missing task design decision ${designId} from ${taskId}`,
        );
      }
    }
  }
  const designReviewRequired = applicableDesignIds.size > 0;
  if (designReviewRequired) {
    for (const label of [
      "Design-system contracts",
      "Page contracts",
      "Mockups/state boards",
    ]) {
      if (isPlaceholder(topField(designLinksSection, label))) {
        errors.push(
          `${slice.file}: design-linked slice ${slice.id} requires concrete ${label}`,
        );
      } else {
        await validateInspectableArtifacts(
          topField(designLinksSection, label),
          {
            demoDir,
            context: `${slice.file}: design-linked slice ${slice.id} ${label}`,
            errors,
            requireFile: true,
          },
        );
      }
    }
  }

  validateReviewers(
    slice,
    designReviewRequired,
    assignedImplementationAgents,
    errors,
  );

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
    const closeRecord = section(slice.text, "Close Record");
    for (const label of [
      "Closed by",
      "Closed at",
      "Requirements review decision",
      "Design review decision",
      "Engineering review decision",
      "Payment-domain sub-review decision",
      "Critical/Important findings",
      "Minor findings disposition",
      "Evidence summary",
      "Progress-log reference",
    ]) {
      const count = topFieldCount(closeRecord, label);
      if (count > 1) {
        errors.push(`${slice.file}: Close Record has duplicate field ${label}`);
      } else if (count === 0) {
        errors.push(`${slice.file}: Close Record is missing field ${label}`);
      }
    }
    for (const label of [
      "Closed by",
      "Evidence summary",
      "Progress-log reference",
    ]) {
      if (isPlaceholder(topField(closeRecord, label))) {
        errors.push(
          `${slice.file}: closed slice ${slice.id} requires concrete ${label}`,
        );
      }
    }
    const closedAt = topField(closeRecord, "Closed at");
    if (!isRealTimestamp(closedAt)) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires Closed at as a real ISO timestamp`,
      );
    }
    const requirementsDecision = topField(
      closeRecord,
      "Requirements review decision",
    ).toLowerCase();
    if (requirementsDecision !== "approved") {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires approved requirements review decision`,
      );
    }
    const designDecision = topField(
      closeRecord,
      "Design review decision",
    ).toLowerCase();
    if (designReviewRequired && designDecision !== "approved") {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires approved design review decision`,
      );
    } else if (
      !designReviewRequired &&
      designDecision !== "approved" &&
      !hasNonApplicabilityReason(designDecision)
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires an approved or explicitly non-applicable design review decision`,
      );
    }
    const engineeringDecision = topField(
      closeRecord,
      "Engineering review decision",
    ).toLowerCase();
    if (engineeringDecision !== "approved") {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires approved engineering review decision`,
      );
    }
    const paymentDecision = topField(
      closeRecord,
      "Payment-domain sub-review decision",
    ).toLowerCase();
    const paymentDecisionValid =
      slice.paymentReviewRequired === "yes"
        ? paymentDecision === "approved"
        : hasNonApplicabilityReason(paymentDecision);
    if (!paymentDecisionValid) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} has invalid payment-domain sub-review decision`,
      );
    }
    const criticalImportant = topField(
      closeRecord,
      "Critical/Important findings",
    ).toLowerCase();
    if (
      criticalImportant !== "none" &&
      !hasCriticalResolution(criticalImportant)
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} has unresolved Critical/Important findings`,
      );
    }
    const minorDisposition = topField(
      closeRecord,
      "Minor findings disposition",
    ).toLowerCase();
    if (minorDisposition !== "none" && !hasMinorDisposition(minorDisposition)) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} requires explicit accepted Minor dispositions`,
      );
    }
    const evidenceSummary = topField(closeRecord, "Evidence summary");
    const summaryEvidenceIds = idsIn(evidenceSummary, "EVID", 4);
    if (
      summaryEvidenceIds.length === 0 ||
      summaryEvidenceIds.some(
        (id) => known.evidence.get(id)?.fields.get("status") !== "passing",
      )
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} Evidence summary must reference passing evidence`,
      );
    }
    const progressReference = topField(closeRecord, "Progress-log reference");
    const progressMatch = progressReference.match(
      /^tracking\/progress\.md#([a-z0-9][a-z0-9-]*)$/,
    );
    if (
      !progressMatch ||
      !markdownHasAnchor(known.progressText, progressMatch[1])
    ) {
      errors.push(
        `${slice.file}: closed slice ${slice.id} Progress-log reference must resolve to tracking/progress.md`,
      );
    }
  }
}

function validateOwnedRecord(record, requiredFields, known, errors) {
  requireFields(record, requiredFields, errors);
  if (
    record.id.startsWith("TASK-") &&
    record.fields.get("status") !== "retired"
  ) {
    for (const field of ["files", "interfaces", "model/effort"]) {
      if (isPlaceholder(record.fields.get(field))) {
        errors.push(`${record.file}: ${record.id} requires concrete ${field}`);
      }
    }
    if (idsIn(record.fields.get("test_cases"), "TC", 4).length === 0) {
      errors.push(
        `${record.file}: ${record.id} requires at least one test case`,
      );
    }
    if (idsIn(record.fields.get("evidence"), "EVID", 4).length === 0) {
      errors.push(
        `${record.file}: ${record.id} requires at least one evidence link`,
      );
    }
  }
  if (
    record.fields.get("status") !== "retired" &&
    idsIn(record.fields.get("requirements"), "REQ", 4).length === 0
  ) {
    errors.push(
      `${record.file}: ${record.id} requires at least one governing requirement`,
    );
  }
  if (!/^SLICE-\d{3}$/.test(record.fields.get("slice")?.trim() ?? "")) {
    errors.push(
      `${record.file}: ${record.id} must belong to exactly one slice using an exact SLICE-NNN value`,
    );
  }
  if (record.fields.get("status") !== "retired") {
    const ownerId = record.fields.get("slice")?.trim() ?? "";
    const owner = known.slices.get(ownerId);
    for (const requirementId of idsIn(
      record.fields.get("requirements"),
      "REQ",
      4,
    )) {
      const requirement = known.requirements.get(requirementId);
      if (!requirement || !owner) continue;
      const disposition = requirement.fields.get("planning_disposition");
      const ownerInheritsRequirement = keyedTableRows(
        section(owner.text, "Inherited Requirements"),
        "Requirement",
        "REQ",
        4,
      ).some((row) => row.id === requirementId);
      const compatible =
        ((disposition === "active_slice" || disposition === "future_slice") &&
          requirement.fields.get("target_slice") === ownerId &&
          ["approved", "active", "blocked"].includes(owner.status) &&
          ownerInheritsRequirement) ||
        (disposition === "complete" &&
          owner.status === "closed" &&
          ownerInheritsRequirement);
      if (!compatible) {
        errors.push(
          `${record.file}: non-retired ${record.id} is incompatible with ${requirementId} disposition ${disposition} and owner ${ownerId} status ${owner.status}`,
        );
      }
    }
  }
  validateReferences(
    record,
    "requirements",
    "REQ",
    4,
    known.requirements,
    "requirement",
    errors,
  );
  validateApprovedDesignReferences(
    record,
    "design_decisions",
    known.design,
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
    "design_decisions",
    "DESIGN",
    4,
    known.design,
    "design decision",
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

  requireSectionsOnce(
    requirementsText,
    [
      "Requirement Register",
      "Active Requirement Records",
      "Tombstone Register",
      "Tombstones",
    ],
    "REQUIREMENTS.md",
    errors,
  );
  requireSectionsOnce(
    designText,
    [
      "Taste Brief",
      "Approved Direction",
      "Design Decision Ledger",
      "Artifact Index",
      "Main Screens",
      "UX Flow Links",
      "Design Approval Record",
    ],
    "DESIGN.md",
    errors,
  );
  requireSectionsOnce(
    implementationTasksText || implementationPlanText,
    ["Task Register"],
    implementationTasksText
      ? "IMPLEMENTATION_TASKS.md"
      : "IMPLEMENTATION_PLAN.md",
    errors,
  );
  requireSectionsOnce(
    testsText,
    ["Test Case Register"],
    "tracking/test-cases.md",
    errors,
  );
  requireSectionsOnce(
    evidenceText,
    ["Evidence Index"],
    "tracking/evidence.md",
    errors,
  );

  const slices = new Map();
  try {
    const entries = await readdir(path.join(demoDir, "slices"), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!/^SLICE-\d{3}\.md$/.test(entry.name)) {
        if (/^slice-.*\.md$/i.test(entry.name)) {
          errors.push(`slices/: malformed slice filename ${entry.name}`);
        }
        continue;
      }
      const id = entry.name.replace(/\.md$/, "");
      const relativePath = `slices/${entry.name}`;
      const text = await readRequired(demoDir, relativePath, errors);
      const headingId = stripFencedCode(text).match(/^# (SLICE-[^\s—]+)/m)?.[1];
      if (headingId !== id)
        errors.push(
          `${relativePath}: slice heading ${headingId ?? "missing"} does not match ${id}`,
        );
      requireSectionsOnce(
        text,
        [
          "Goal And Outcome",
          "Inherited Requirements",
          "Design And State Links",
          "Dependencies And Cross-Cutting Requirements",
          "Explicit Non-Goals",
          "Deferrals And Removals",
          "Coverage",
          "Knowledge Evidence",
          "Skill And Model Routing",
          "Reviewer Assignments",
          "Entry Criteria",
          "Exit Criteria",
          "Close Record",
        ],
        relativePath,
        errors,
      );
      for (const label of [
        "Status",
        "User approval reference",
        "Slice Steward",
        "Payment-domain sub-review required",
      ]) {
        if (topFieldCount(text, label) !== 1) {
          errors.push(
            `${relativePath}: ${id} ${label} must appear exactly once`,
          );
        }
      }
      slices.set(id, {
        id,
        file: relativePath,
        text,
        status: topField(text, "Status").toLowerCase(),
        userApprovalReference: topField(text, "User approval reference"),
        steward: topField(text, "Slice Steward"),
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

  const designLedgerSection = section(designText, "Design Decision Ledger");
  const designLedgerTable = parseTable(designLedgerSection);
  validateTableColumns(
    designLedgerTable,
    [
      "ID",
      "Decision",
      "Status",
      "Requirement links",
      "Artifact links",
      "Approval reference",
    ],
    {
      heading: "Design Decision Ledger",
      file: "DESIGN.md",
      errors,
    },
  );
  const designStatusColumn = tableColumnIndex(designLedgerTable, "Status");
  const designDecisionColumn = tableColumnIndex(designLedgerTable, "Decision");
  const designRequirementColumn = tableColumnIndex(
    designLedgerTable,
    "Requirement links",
  );
  const designApprovalColumn = tableColumnIndex(
    designLedgerTable,
    "Approval reference",
  );
  const designArtifactColumn = tableColumnIndex(
    designLedgerTable,
    "Artifact links",
  );
  const designRows = keyedTableRows(designLedgerSection, "ID", "DESIGN", 4, {
    heading: "Design Decision Ledger",
    file: "DESIGN.md",
    errors,
  });

  const known = {
    requirements: indexRecords(requirements),
    tasks: indexRecords(tasks),
    tests: indexRecords(tests),
    evidence: indexRecords(evidence),
    slices,
    progressText,
    design: new Map(
      designRows.map(({ id, cells }) => [
        id,
        {
          decision:
            designDecisionColumn === -1
              ? "none"
              : (cells[designDecisionColumn] ?? "none").trim(),
          status:
            designStatusColumn === -1
              ? "missing"
              : (cells[designStatusColumn] ?? "missing").trim().toLowerCase(),
          requirementLinks:
            designRequirementColumn === -1
              ? "none"
              : (cells[designRequirementColumn] ?? "none").trim(),
          approvalReference:
            designApprovalColumn === -1
              ? "none"
              : (cells[designApprovalColumn] ?? "none").trim(),
          artifactLinks:
            designArtifactColumn === -1
              ? "none"
              : (cells[designArtifactColumn] ?? "none").trim(),
        },
      ]),
    ),
  };

  for (const [id, decision] of known.design) {
    if (
      !["proposed", "approved", "rejected", "superseded"].includes(
        decision.status,
      )
    ) {
      errors.push(`DESIGN.md: ${id} has invalid status ${decision.status}`);
    }
    if (
      decision.status === "approved" &&
      !isDurableUserReference(decision.approvalReference)
    ) {
      errors.push(
        `DESIGN.md: approved design decision ${id} requires a durable approval reference`,
      );
    }
    if (decision.status === "approved" && isPlaceholder(decision.decision)) {
      errors.push(
        `DESIGN.md: approved design decision ${id} requires concrete decision content`,
      );
    }
    if (
      decision.status === "approved" &&
      isPlaceholder(decision.artifactLinks)
    ) {
      errors.push(
        `DESIGN.md: approved design decision ${id} requires concrete artifact links`,
      );
    }
    if (
      decision.status === "approved" &&
      idsIn(decision.requirementLinks, "REQ", 4).length === 0
    ) {
      errors.push(
        `DESIGN.md: approved design decision ${id} requires at least one requirement link`,
      );
    }
    if (
      decision.status === "approved" &&
      !isPlaceholder(decision.artifactLinks)
    ) {
      for (const artifact of decision.artifactLinks
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)) {
        if (/^https:\/\//i.test(artifact)) continue;
        const artifactPath = path.resolve(demoDir, artifact);
        const relativeArtifact = path.relative(demoDir, artifactPath);
        try {
          if (
            relativeArtifact.startsWith("..") ||
            path.isAbsolute(relativeArtifact)
          )
            throw new Error("outside demo");
          await access(artifactPath);
        } catch {
          errors.push(
            `DESIGN.md: approved design decision ${id} local artifact does not exist: ${artifact}`,
          );
        }
      }
    }
    for (const requirementId of idsIn(decision.requirementLinks, "REQ", 4)) {
      const requirement = known.requirements.get(requirementId);
      if (!requirement) {
        errors.push(
          `DESIGN.md: ${id} references unknown requirement ${requirementId}`,
        );
      } else if (
        decision.status === "approved" &&
        !idsIn(requirement.fields.get("design_links"), "DESIGN", 4).includes(id)
      ) {
        errors.push(
          `DESIGN.md: approved design decision ${id} does not link reciprocally with ${requirementId}`,
        );
      }
    }
  }

  if (
    [...known.design.values()].some(
      (decision) => decision.status === "approved",
    )
  ) {
    const approvalRecord = section(designText, "Design Approval Record");
    for (const label of [
      "Component board",
      "Typography proof",
      "Representative desktop surfaces",
      "Representative mobile surfaces",
      "Required interaction states",
    ]) {
      if (
        topFieldCount(approvalRecord, label) !== 1 ||
        isPlaceholder(topField(approvalRecord, label))
      ) {
        errors.push(
          `DESIGN.md: approved design decisions require concrete Design Approval Record field ${label}`,
        );
      } else {
        await validateInspectableArtifacts(topField(approvalRecord, label), {
          demoDir,
          context: `DESIGN.md: Design Approval Record ${label}`,
          errors,
          requireFile: true,
        });
      }
    }
    if (
      topFieldCount(approvalRecord, "User approval reference") !== 1 ||
      !isDurableUserReference(
        topField(approvalRecord, "User approval reference"),
      )
    ) {
      errors.push(
        "DESIGN.md: approved design decisions require a durable Design Approval Record user approval reference",
      );
    }

    const artifactIndex = section(designText, "Artifact Index");
    for (const label of [
      "Master system",
      "Typography",
      "Components",
      "Component board",
      "Research records",
      "Page contracts",
      "Mockup and state-board registry",
    ]) {
      if (topFieldCount(artifactIndex, label) !== 1) {
        errors.push(`DESIGN.md: Artifact Index is missing field ${label}`);
      } else {
        await validateInspectableArtifacts(topField(artifactIndex, label), {
          demoDir,
          context: `DESIGN.md: Artifact Index ${label}`,
          errors,
        });
      }
    }
  }

  const activeRequirements = new Map(
    [...known.requirements].filter(
      ([, record]) => record.fields.get("lifecycle_status") !== "removed",
    ),
  );
  const tombstones = new Map(
    [...known.requirements].filter(
      ([, record]) => record.fields.get("lifecycle_status") === "removed",
    ),
  );

  validateRecordIndex(
    requirementsText,
    "Requirement Register",
    "REQ",
    4,
    activeRequirements,
    "REQUIREMENTS.md",
    errors,
  );
  validateRecordIndex(
    requirementsText,
    "Tombstone Register",
    "REQ",
    4,
    tombstones,
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
    if (testCase.fields.get("status") === "passing") {
      for (const field of [
        "preconditions",
        "action",
        "expected",
        "negative_case",
      ]) {
        if (isPlaceholder(testCase.fields.get(field))) {
          errors.push(
            `${testCase.file}: passing test ${testCase.id} requires ${field}`,
          );
        }
      }
    }
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
        const value = evidenceRecord.fields.get(field)?.trim() ?? "";
        if (isPlaceholder(value)) {
          errors.push(
            `${evidenceRecord.file}: passing evidence ${evidenceRecord.id} requires ${field}`,
          );
        }
      }
      const capturedAt = evidenceRecord.fields.get("captured_at")?.trim() ?? "";
      if (!isPlaceholder(capturedAt) && !isRealTimestamp(capturedAt)) {
        errors.push(
          `${evidenceRecord.file}: passing evidence ${evidenceRecord.id} requires captured_at as a real ISO timestamp`,
        );
      }
      const result = evidenceRecord.fields.get("result")?.trim() ?? "";
      if (
        !isPlaceholder(result) &&
        !/^(?:passed|success|successful|completed|ok)(?::|$)/i.test(result)
      ) {
        errors.push(
          `${evidenceRecord.file}: passing evidence ${evidenceRecord.id} result must indicate success`,
        );
      }
      const artifact = evidenceRecord.fields.get("artifact")?.trim() ?? "";
      if (!isPlaceholder(artifact) && !/^https:\/\//i.test(artifact)) {
        const artifactPath = path.resolve(demoDir, artifact);
        const relativeArtifact = path.relative(demoDir, artifactPath);
        const escapesDemo =
          relativeArtifact.startsWith("..") ||
          path.isAbsolute(relativeArtifact);
        try {
          if (escapesDemo) throw new Error("outside demo");
          await access(artifactPath);
        } catch {
          errors.push(
            `${evidenceRecord.file}: passing evidence ${evidenceRecord.id} local artifact does not exist: ${artifact}`,
          );
        }
      }
    }
  }
  for (const slice of slices.values())
    await validateSlice(slice, known.requirements, known, demoDir, errors);

  const activeSlices = [...slices.values()]
    .filter((slice) => slice.status === "active")
    .map((slice) => slice.id);
  if (activeSlices.length > 1)
    errors.push(`slices/: multiple active slices: ${activeSlices.join(", ")}`);
  const expectedActiveSlice = activeSlices[0] ?? "none";
  const activeSourceDocuments = [
    ["PLAN.md", planText],
    ["tracking/todos.md", todosText],
    ["tracking/progress.md", progressText],
  ];
  for (const [file, text] of activeSourceDocuments) {
    if (topFieldCount(text, "Active slice") !== 1) {
      errors.push(`${file}: Active slice must appear exactly once`);
    }
  }
  const activeSources = activeSourceDocuments.map(([file, text]) => [
    file,
    activeSliceValue(text),
  ]);
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

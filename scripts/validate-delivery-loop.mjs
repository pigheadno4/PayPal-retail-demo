#!/usr/bin/env node

import { access, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const roles = [
  "orchestrator",
  "planner",
  "plan-critic",
  "executor",
  "reviewer",
  "budget-guard",
];

const allowedStates = new Set([
  "draft",
  "planning",
  "plan_review",
  "needs_plan_revision",
  "awaiting_plan_approval",
  "ready_to_implement",
  "implementing",
  "needs_review",
  "spec_review",
  "quality_review",
  "needs_implementation_revision",
  "reviewed",
  "awaiting_task_acceptance",
  "complete",
  "blocked",
  "budget_paused",
]);

const reviewedStates = new Set([
  "reviewed",
  "awaiting_task_acceptance",
  "complete",
]);

const planApprovedStates = new Set([
  "ready_to_implement",
  "implementing",
  "needs_review",
  "spec_review",
  "quality_review",
  "needs_implementation_revision",
  "reviewed",
  "awaiting_task_acceptance",
  "complete",
]);

const planReadyStates = new Set([
  "plan_review",
  "needs_plan_revision",
  "awaiting_plan_approval",
  ...planApprovedStates,
]);

const allowedVisualModes = new Set([
  "reuse",
  "focused-mockup",
  "design-shotgun",
  "undetermined",
  "not_applicable",
]);

const transitionTargets = new Map([
  [null, new Set(["draft", "blocked"])],
  ["draft", new Set(["planning"])],
  ["planning", new Set(["plan_review"])],
  ["plan_review", new Set(["needs_plan_revision", "awaiting_plan_approval"])],
  ["needs_plan_revision", new Set(["planning"])],
  ["awaiting_plan_approval", new Set(["ready_to_implement"])],
  ["ready_to_implement", new Set(["implementing"])],
  ["implementing", new Set(["needs_review"])],
  ["needs_review", new Set(["spec_review"])],
  ["spec_review", new Set(["needs_implementation_revision", "quality_review"])],
  ["quality_review", new Set(["needs_implementation_revision", "reviewed"])],
  ["needs_implementation_revision", new Set(["implementing"])],
  ["reviewed", new Set(["awaiting_task_acceptance"])],
  ["awaiting_task_acceptance", new Set(["complete"])],
  ["blocked", new Set(["draft", "planning"])],
  ["budget_paused", new Set(["planning", "implementing"])],
]);

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file, errors) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    errors.push(`${path.relative(process.cwd(), file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

async function validateDemoFile(
  demo,
  value,
  label,
  errors,
  { expectedPath = null, requiredDirectory = null } = {},
) {
  if (typeof value !== "string" || !value) return false;
  if (path.isAbsolute(value)) {
    errors.push(`${label} must be a relative demo-local path`);
    return false;
  }

  const candidate = path.resolve(demo, value);
  if (!isPathWithin(demo, candidate)) {
    errors.push(`${label} escapes the demo directory`);
    return false;
  }
  if (expectedPath && candidate !== path.resolve(demo, expectedPath)) {
    errors.push(`${label} must resolve exactly to ${expectedPath}`);
    return false;
  }
  if (
    requiredDirectory &&
    !isPathWithin(path.resolve(demo, requiredDirectory), candidate)
  ) {
    errors.push(`${label} must be stored under ${requiredDirectory}/`);
    return false;
  }

  let demoRealPath;
  let candidateRealPath;
  let requiredDirectoryRealPath;
  try {
    [demoRealPath, candidateRealPath, requiredDirectoryRealPath] = await Promise.all([
      realpath(demo),
      realpath(candidate),
      requiredDirectory
        ? realpath(path.resolve(demo, requiredDirectory))
        : Promise.resolve(null),
    ]);
  } catch (error) {
    if (new Set(["ENOENT", "ENOTDIR"]).has(error.code)) {
      errors.push(`${label} does not exist: ${value}`);
    } else {
      errors.push(`${label} cannot be resolved: ${value}`);
    }
    return false;
  }
  if (!isPathWithin(demoRealPath, candidateRealPath)) {
    errors.push(`${label} resolves outside the demo directory`);
    return false;
  }
  if (
    requiredDirectoryRealPath &&
    requiredDirectoryRealPath !== path.resolve(demoRealPath, requiredDirectory)
  ) {
    errors.push(`${label} required directory must resolve without symlinks`);
    return false;
  }
  if (
    requiredDirectoryRealPath &&
    !isPathWithin(requiredDirectoryRealPath, candidateRealPath)
  ) {
    errors.push(`${label} resolves outside ${requiredDirectory}/`);
    return false;
  }
  if (!(await stat(candidateRealPath)).isFile()) {
    errors.push(`${label} must reference a regular file`);
    return false;
  }
  return true;
}

function yamlNumber(config, key) {
  const match = config.match(new RegExp(`^\\s*${key}:\\s*(\\d+)\\s*$`, "mu"));
  return match ? Number(match[1]) : null;
}

function isUserApproval(approval) {
  return (
    approval?.verdict === "approved" &&
    approval.actor === "user" &&
    isDurableUserReference(approval.approval_reference)
  );
}

function userReferenceSubject(reference) {
  return typeof reference === "string"
    ? reference.match(/^user:([^:\s]+):/u)?.[1] ?? null
    : null;
}

function isTaskBoundUserApproval(approval, state, artifactKey, artifactValue) {
  return (
    isUserApproval(approval) &&
    approval.task_id === state.task_id &&
    userReferenceSubject(approval.approval_reference) === state.task_id &&
    approval?.[artifactKey] === artifactValue
  );
}

function isDurableUserReference(reference) {
  if (typeof reference !== "string") return false;
  const match = reference.match(
    /^user:([^:\s]+):(\d{4}-\d{2}-\d{2}):([^:\s].*)$/u,
  );
  if (!match) return false;
  const parsed = new Date(`${match[2]}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === match[2];
}

function validateReviewApproval(approval, lane, state, logEvents, errors) {
  if (approval?.task_id !== state.task_id) {
    errors.push(`${lane} approval must belong to the active task`);
  }
  if (typeof approval?.reviewer !== "string" || !approval.reviewer) {
    errors.push(`${lane} approval requires reviewer identity`);
  }
  if (approval?.independent_from_executor !== true) {
    errors.push(`${lane} reviewer must be independent from the executor`);
  }
  if (state.executor && approval?.reviewer === state.executor) {
    errors.push(`${lane} reviewer cannot be the executor`);
  }
  if (!new Set(["full", "scoped"]).has(approval?.review_mode)) {
    errors.push(`${lane} approval requires full or scoped review_mode`);
  }
  if (
    approval?.verdict === "approved" &&
    !logEvents.some(
      (event) =>
        event.event === "review_completed" &&
        event.actor === "orchestrator" &&
        event.task_id === state.task_id &&
        event.lane === lane &&
        event.reviewer === approval.reviewer &&
        event.candidate_commit === approval.candidate_commit &&
        event.verdict === "approved",
    )
  ) {
    errors.push(`${lane} approval requires a matching durable review event`);
  }
  if (approval?.review_mode === "scoped") {
    const hasScopedInputs =
      typeof approval.base_commit === "string" &&
      approval.base_commit.length > 0 &&
      Array.isArray(approval.prior_findings) &&
      approval.prior_findings.length > 0 &&
      typeof approval.fix_diff === "string" &&
      approval.fix_diff.length > 0 &&
      Array.isArray(approval.changed_files) &&
      approval.changed_files.length > 0 &&
      Array.isArray(approval.tests_and_evidence) &&
      approval.tests_and_evidence.length > 0 &&
      Array.isArray(approval.full_review_triggers) &&
      typeof approval.prior_full_review_event === "string" &&
      approval.prior_full_review_event.length > 0;
    if (Array.isArray(approval.full_review_triggers) && approval.full_review_triggers.length > 0) {
      errors.push(`${lane} scoped review must escalate to full when a full-review trigger is present`);
    }
    if (!hasScopedInputs) {
      errors.push(`${lane} scoped review requires fix-round evidence and trigger assessment`);
    } else if (approval.full_review_triggers.length === 0) {
      const priorFullReview = logEvents.find(
        (event) => event.event_id === approval.prior_full_review_event,
      );
      if (priorFullReview && priorFullReview.actor !== "orchestrator") {
        errors.push(`${lane} scoped review prior full event must be orchestrator-recorded`);
      }
      const continuousReviewer =
        priorFullReview?.event === "review_completed" &&
        priorFullReview.actor === "orchestrator" &&
        priorFullReview.task_id === state.task_id &&
        priorFullReview.lane === lane &&
        priorFullReview.review_mode === "full" &&
        priorFullReview.reviewer === approval.reviewer &&
        priorFullReview.candidate_commit === approval.base_commit;
      if (!continuousReviewer) {
        errors.push(`${lane} scoped review requires the same reviewer as the prior full review`);
      }
    }
  }
}

async function validateVisualDesign(state, demo, errors) {
  const visual = state.visual_design;
  if (!visual || !allowedVisualModes.has(visual.mode)) {
    errors.push(`${state.state} requires a permitted visual_design route`);
    return;
  }
  if (visual.mode === "undetermined") {
    if (!new Set(["plan_review", "needs_plan_revision"]).has(state.state)) {
      errors.push("visual_design must be determined before user plan approval");
    }
    return;
  }
  if (visual.mode === "not_applicable") {
    if (visual.required !== false) {
      errors.push("not_applicable visual_design must set required to false");
    }
    return;
  }
  if (visual.required !== true) {
    errors.push(`${visual.mode} visual_design must set required to true`);
  }
  if (!Array.isArray(visual.design_links) || visual.design_links.length === 0) {
    errors.push(`${visual.mode} visual_design requires an approved design link`);
  }
  if (new Set(["focused-mockup", "design-shotgun"]).has(visual.mode)) {
    const mayOmitMockup = new Set([
      "plan_review",
      "needs_plan_revision",
    ]).has(state.state);
    if (
      !mayOmitMockup &&
      (typeof visual.approved_mockup !== "string" || !visual.approved_mockup)
    ) {
      errors.push(`${visual.mode} visual_design requires an approved mockup path`);
    } else if (
      typeof visual.approved_mockup === "string" &&
      visual.approved_mockup
    ) {
      await validateDemoFile(
        demo,
        visual.approved_mockup,
        `${visual.mode} approved mockup`,
        errors,
        { requiredDirectory: "mockups" },
      );
    }
  }
  if (
    planApprovedStates.has(state.state) &&
    (typeof visual.approval_reference !== "string" ||
      !isDurableUserReference(visual.approval_reference) ||
      userReferenceSubject(visual.approval_reference) !== state.task_id)
  ) {
    errors.push(`${visual.mode} visual_design requires durable user approval for the active task`);
  }
}

function isAllowedTransition(from, to) {
  if (to === "blocked" || to === "budget_paused") return true;
  return transitionTargets.get(from)?.has(to) ?? false;
}

function hasOrchestratorEvent(logEvents, predicate) {
  return logEvents.some(
    (event) => event.actor === "orchestrator" && predicate(event),
  );
}

export async function validateDeliveryLoop(repositoryRoot, demoDirectory) {
  const root = path.resolve(repositoryRoot);
  const demo = path.resolve(demoDirectory);
  const errors = [];

  for (const role of roles) {
    const skillDir = path.join(root, ".agents/skills", role);
    const skillFile = path.join(skillDir, "SKILL.md");
    const metadataFile = path.join(skillDir, "agents/openai.yaml");

    if (!(await exists(skillFile))) {
      errors.push(`missing required skill: .agents/skills/${role}/SKILL.md`);
      continue;
    }
    if (!(await exists(metadataFile))) {
      errors.push(`missing required skill metadata: .agents/skills/${role}/agents/openai.yaml`);
      continue;
    }

    const skill = await readFile(skillFile, "utf8");
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/u)?.[1] ?? "";
    if (!frontmatter.includes(`name: ${role}`)) {
      errors.push(`${role}/SKILL.md has the wrong or missing name`);
    }
    if (!/^description: Use when .+/mu.test(frontmatter)) {
      errors.push(`${role}/SKILL.md description must start with "Use when"`);
    }
    if (/\b(?:TODO|TBD|FIXME)\b/u.test(skill)) {
      errors.push(`${role}/SKILL.md contains an unresolved placeholder`);
    }

    const metadata = await readFile(metadataFile, "utf8");
    if (!metadata.includes(`$${role}`)) {
      errors.push(`${role}/agents/openai.yaml default prompt must mention $${role}`);
    }
  }

  const requiredDemoPaths = [
    "workflow/CONFIG.yaml",
    "workflow/CONSTRAINTS.md",
    "ROADMAP.md",
    "knowledge/INDEX.md",
    "knowledge/findings",
    "knowledge/fixes",
    "tracking/loop-state.json",
    "tracking/loop-budget.json",
    "tracking/loop-log.jsonl",
    "tracking/tasks",
  ];

  for (const relative of requiredDemoPaths) {
    if (!(await exists(path.join(demo, relative)))) {
      errors.push(`missing demo loop path: ${relative}`);
    }
  }

  const configPath = path.join(demo, "workflow/CONFIG.yaml");
  let configuredBudget = null;
  if (await exists(configPath)) {
    const config = await readFile(configPath, "utf8");
    if (!/^\s*max_acceptance_criteria:\s*5\s*$/mu.test(config)) {
      errors.push("max_acceptance_criteria must be 5");
    }
    if (!config.includes("require_same_candidate_commit: true")) {
      errors.push("review must require the same candidate commit");
    }
    if (!config.includes("scoped_re_review_default: true")) {
      errors.push("scoped re-review must remain enabled");
    }
    if (!config.includes("require_user_approval_to_create: true")) {
      errors.push("pull-request creation must require user approval");
    }
    if (!config.includes("require_user_approval_to_merge: true")) {
      errors.push("merge must require user approval");
    }
    for (const mode of allowedVisualModes) {
      if (!config.includes(`- ${mode}`)) {
        errors.push(`CONFIG.yaml is missing the ${mode} visual route`);
      }
    }

    configuredBudget = {
      max_plan_rounds: yamlNumber(config, "max_plan_rounds"),
      max_implementation_rounds: yamlNumber(config, "max_implementation_rounds"),
      max_role_turns_per_task: yamlNumber(config, "max_role_turns_per_task"),
      soft_limit_percent: yamlNumber(config, "soft_limit_percent"),
      hard_limit_percent: yamlNumber(config, "hard_limit_percent"),
    };
    if (
      configuredBudget.max_plan_rounds < 1 ||
      configuredBudget.max_implementation_rounds < 1 ||
      configuredBudget.max_role_turns_per_task < 1
    ) {
      errors.push("budget round and role-turn limits must be positive integers");
    }
    if (
      configuredBudget.soft_limit_percent < 1 ||
      configuredBudget.hard_limit_percent > 100 ||
      configuredBudget.soft_limit_percent >= configuredBudget.hard_limit_percent
    ) {
      errors.push("budget percentage limits require 0 < soft < hard <= 100");
    }
    for (const role of roles) {
      const key = role.replaceAll("-", "_");
      if (!config.includes(`${key}: .agents/skills/${role}/SKILL.md`)) {
        errors.push(`CONFIG.yaml is missing the ${role} skill route`);
      }
    }
  }

  const logPath = path.join(demo, "tracking/loop-log.jsonl");
  const logEvents = [];
  if (await exists(logPath)) {
    const lines = (await readFile(logPath, "utf8"))
      .split("\n")
      .filter((line) => line.trim());
    for (const [index, line] of lines.entries()) {
      try {
        logEvents.push(JSON.parse(line));
      } catch {
        errors.push(`loop-log.jsonl line ${index + 1} is not valid JSON`);
      }
    }
  }

  const statePath = path.join(demo, "tracking/loop-state.json");
  const state = (await exists(statePath)) ? await readJson(statePath, errors) : null;
  if (state) {
    if (!allowedStates.has(state.state)) {
      errors.push(`unknown loop state: ${state.state}`);
    }
    if (state.state !== "blocked" && !/^TASK-\d{4,}$/u.test(state.task_id ?? "")) {
      errors.push(`${state.state} requires a concrete TASK-NNNN task_id`);
    }
    const plannerResult = state.role_results?.planner;
    const criticResult = state.role_results?.plan_critic;
    const executorResult = state.role_results?.executor;
    const plannerReady =
      plannerResult?.status === "ready_for_critique" &&
      plannerResult.task_id === state.task_id &&
      typeof plannerResult.plan_hash === "string" &&
      plannerResult.plan_hash.length > 0 &&
      Array.isArray(plannerResult.acceptance_criteria) &&
      plannerResult.acceptance_criteria.length > 0 &&
      plannerResult.acceptance_criteria.length <= 5;
    const criticApproved =
      criticResult?.verdict === "approved" &&
      criticResult.task_id === state.task_id &&
      criticResult.plan_hash === plannerResult?.plan_hash;
    if (
      planReadyStates.has(state.state) &&
      Array.isArray(plannerResult?.acceptance_criteria) &&
      plannerResult.acceptance_criteria.length > 5
    ) {
      errors.push("active task plan must have no more than five acceptance criteria");
    }
    if (state.state === "plan_review" && !plannerReady) {
      errors.push("plan_review requires a ready planner result");
    }
    if (
      planReadyStates.has(state.state) &&
      plannerResult &&
      !hasOrchestratorEvent(
        logEvents,
        (event) =>
          event.event === "role_result" &&
          event.role === "planner" &&
          event.task_id === state.task_id &&
          event.plan_hash === plannerResult.plan_hash &&
          event.status === plannerResult.status,
      )
    ) {
      errors.push("planner result requires a matching durable role event");
    }
    if (
      new Set([
        "awaiting_plan_approval",
        ...planApprovedStates,
      ]).has(state.state)
    ) {
      if (!plannerReady) errors.push(`${state.state} requires a ready planner result`);
      if (!criticApproved) errors.push(`${state.state} requires plan-critic approval of the same plan`);
    }
    if (
      criticResult &&
      planReadyStates.has(state.state) &&
      !hasOrchestratorEvent(
        logEvents,
        (event) =>
          event.event === "role_result" &&
          event.role === "plan-critic" &&
          event.task_id === state.task_id &&
          event.plan_hash === criticResult.plan_hash &&
          event.verdict === criticResult.verdict,
      )
    ) {
      errors.push("plan-critic result requires a matching durable role event");
    }
    if (
      state.state === "needs_plan_revision" &&
      !(
        plannerReady &&
        criticResult?.verdict === "needs_revision" &&
        criticResult.task_id === state.task_id &&
        criticResult.plan_hash === plannerResult.plan_hash
      )
    ) {
      errors.push("needs_plan_revision requires planner output and critic revision findings");
    }
    if (planReadyStates.has(state.state)) {
      await validateVisualDesign(state, demo, errors);
    }
    if (
      planApprovedStates.has(state.state) &&
      !isTaskBoundUserApproval(
        state.approvals?.plan,
        state,
        "plan_hash",
        plannerResult?.plan_hash,
      )
    ) {
      errors.push(`${state.state} requires recorded user plan approval`);
      if (
        state.approvals?.plan &&
        (state.approvals.plan.task_id !== state.task_id ||
          userReferenceSubject(state.approvals.plan.approval_reference) !== state.task_id)
      ) {
        errors.push("plan approval must belong to the active task");
      }
      if (
        state.approvals?.plan &&
        !isDurableUserReference(state.approvals.plan.approval_reference)
      ) {
        errors.push("plan approval requires a durable user approval reference");
      }
    }
    if (
      planApprovedStates.has(state.state) &&
      state.approvals?.plan &&
      !hasOrchestratorEvent(
        logEvents,
        (event) =>
          event.event === "user_gate" &&
          event.gate === "plan" &&
          event.task_id === state.task_id &&
          event.plan_hash === state.approvals.plan.plan_hash &&
          event.approval_reference === state.approvals.plan.approval_reference &&
          event.verdict === "approved",
      )
    ) {
      errors.push("plan approval requires a matching durable user-gate event");
    }
    const executorRequiredStates = new Set([
      "needs_review",
      "spec_review",
      "quality_review",
      "needs_implementation_revision",
      ...reviewedStates,
    ]);
    if (executorRequiredStates.has(state.state)) {
      if (typeof state.executor !== "string" || !state.executor) {
        errors.push(`${state.state} requires task-bound executor identity`);
      }
      const validExecutorResult =
        executorResult?.status === "needs_review" &&
        executorResult.executor === state.executor &&
        executorResult.task_id === state.task_id &&
        executorResult.plan_hash === plannerResult?.plan_hash &&
        typeof executorResult.report_path === "string" &&
        executorResult.report_path.length > 0 &&
        executorResult.candidate_commit === state.candidate_commit &&
        typeof state.candidate_commit === "string" &&
        state.candidate_commit.length > 0;
      if (!validExecutorResult) {
        errors.push(`${state.state} requires an executor result for the candidate commit`);
      }
      if (
        typeof executorResult?.report_path === "string" &&
        executorResult.report_path
      ) {
        await validateDemoFile(
          demo,
          executorResult.report_path,
          "executor report",
          errors,
          {
            expectedPath: `tracking/tasks/${state.task_id}/execution.md`,
            requiredDirectory: `tracking/tasks/${state.task_id}`,
          },
        );
      }
      if (
        executorResult &&
        !hasOrchestratorEvent(
          logEvents,
          (event) =>
            event.event === "role_result" &&
            event.role === "executor" &&
            event.executor === state.executor &&
            event.task_id === state.task_id &&
            event.plan_hash === executorResult.plan_hash &&
            event.candidate_commit === executorResult.candidate_commit &&
            event.status === executorResult.status,
        )
      ) {
        errors.push("executor result requires a matching durable role event");
      }
    }
    if (state.state === "quality_review") {
      const spec = state.approvals?.spec;
      if (
        spec?.verdict !== "approved" ||
        spec.candidate_commit !== state.candidate_commit
      ) {
        errors.push("quality_review requires specification approval of the candidate commit");
      }
      validateReviewApproval(spec, "spec", state, logEvents, errors);
    }
    if (reviewedStates.has(state.state)) {
      const candidate = state.candidate_commit;
      const spec = state.approvals?.spec;
      const quality = state.approvals?.quality;
      const matchingApprovals =
        candidate &&
        spec?.verdict === "approved" &&
        quality?.verdict === "approved" &&
        spec.candidate_commit === candidate &&
        quality.candidate_commit === candidate;
      if (!matchingApprovals) {
        errors.push("reviewed task states require both approvals on the same candidate commit");
      }
      if (typeof state.executor !== "string" || !state.executor) {
        errors.push("reviewed task states require executor identity");
      }
      validateReviewApproval(spec, "spec", state, logEvents, errors);
      validateReviewApproval(quality, "quality", state, logEvents, errors);
      if (spec?.reviewer && spec.reviewer === quality?.reviewer) {
        errors.push("reviewed task states require different independent reviewers");
      }
    }
    if (
      state.state === "complete" &&
      !isTaskBoundUserApproval(
        state.approvals?.task_acceptance,
        state,
        "candidate_commit",
        state.candidate_commit,
      )
    ) {
      errors.push("complete state requires recorded user task acceptance");
      if (
        state.approvals?.task_acceptance &&
        !isDurableUserReference(state.approvals.task_acceptance.approval_reference)
      ) {
        errors.push("task acceptance requires a durable user approval reference");
      }
    }
    if (
      state.state === "complete" &&
      state.approvals?.task_acceptance &&
      !hasOrchestratorEvent(
        logEvents,
        (event) =>
          event.event === "user_gate" &&
          event.gate === "task_acceptance" &&
          event.task_id === state.task_id &&
          event.candidate_commit === state.candidate_commit &&
          event.approval_reference ===
            state.approvals.task_acceptance.approval_reference &&
          event.verdict === "approved",
      )
    ) {
      errors.push("task acceptance requires a matching durable user-gate event");
    }

    const transitionEvents = logEvents.filter(
      (event) => Object.hasOwn(event, "from") && typeof event.to === "string",
    );
    const previousByTask = new Map();
    for (const event of transitionEvents) {
      const taskKey = `${event.slice_id ?? "missing"}:${event.task_id ?? "none"}`;
      if (event.actor !== "orchestrator") {
        errors.push(`loop-log.jsonl transition ${taskKey} must be recorded by orchestrator`);
      }
      if (!isAllowedTransition(event.from, event.to)) {
        errors.push(`loop-log.jsonl contains an invalid ${event.from ?? "initial"} -> ${event.to} transition`);
      }
      if (previousByTask.has(taskKey) && previousByTask.get(taskKey) !== event.from) {
        errors.push(`loop-log.jsonl transition history is discontinuous for ${taskKey}`);
      }
      if (!previousByTask.has(taskKey) && event.from !== null) {
        errors.push(`loop-log.jsonl task history must start from an initial transition for ${taskKey}`);
      }
      previousByTask.set(taskKey, event.to);
    }
    const latestTransition = transitionEvents.at(-1);
    if (
      !latestTransition ||
      latestTransition.slice_id !== state.slice_id ||
      latestTransition.task_id !== state.task_id ||
      latestTransition.to !== state.state
    ) {
      errors.push("loop-state.json must match the latest logged transition");
    }
  }

  const budgetPath = path.join(demo, "tracking/loop-budget.json");
  const budget = (await exists(budgetPath)) ? await readJson(budgetPath, errors) : null;
  if (budget && configuredBudget) {
    for (const [key, value] of Object.entries(configuredBudget)) {
      if (budget.limits?.[key] !== value) {
        errors.push(`loop-budget.json ${key} must match CONFIG.yaml`);
      }
    }
    const usageKeys = ["plan_rounds", "implementation_rounds", "role_turns"];
    for (const key of usageKeys) {
      if (!Number.isInteger(budget.usage?.[key]) || budget.usage[key] < 0) {
        errors.push(`loop-budget.json ${key} must be a nonnegative integer`);
      }
    }
    if (state && budget.task_id !== state.task_id) {
      errors.push("loop-budget.json must belong to the active task");
    }
    if (
      state?.task_id &&
      !hasOrchestratorEvent(
        logEvents,
        (event) =>
          event.event === "budget_updated" &&
          event.task_id === state.task_id &&
          event.status === budget.status &&
          event.usage?.plan_rounds === budget.usage?.plan_rounds &&
          event.usage?.implementation_rounds === budget.usage?.implementation_rounds &&
          event.usage?.role_turns === budget.usage?.role_turns,
      )
    ) {
      errors.push("loop budget requires a matching durable budget event");
    }
    if (state?.task_id && Number.isInteger(budget.usage?.role_turns)) {
      const delegatedTurns = logEvents.filter(
        (event) =>
          event.actor === "orchestrator" &&
          event.task_id === state.task_id &&
          ((event.event === "role_result" &&
            new Set(["planner", "plan-critic", "executor", "visual-design"]).has(
              event.role,
            )) ||
            event.event === "review_completed"),
      ).length;
      if (budget.usage.role_turns < delegatedTurns) {
        errors.push("role-turn usage cannot be lower than durable delegated-role events");
      }
    }
    if (
      state &&
      (state.round?.plan !== budget.usage?.plan_rounds ||
        state.round?.implementation !== budget.usage?.implementation_rounds)
    ) {
      errors.push("loop budget round counters must match the state snapshot");
    }
    if (!new Set(["not_started", "active", "restricted", "budget_paused"]).has(budget.status)) {
      errors.push("loop-budget.json has an unknown status");
    }
    if (state?.state === "budget_paused" && budget.status !== "budget_paused") {
      errors.push("budget_paused state requires a budget_paused budget status");
    }
    if (budget.status === "budget_paused" && state?.state !== "budget_paused") {
      errors.push("budget_paused budget status requires a budget_paused loop state");
    }
    const hardRoleTurnLimit = Math.ceil(
      configuredBudget.max_role_turns_per_task *
        (configuredBudget.hard_limit_percent / 100),
    );
    const softRoleTurnLimit = Math.ceil(
      configuredBudget.max_role_turns_per_task *
        (configuredBudget.soft_limit_percent / 100),
    );
    const noFurtherRoleTurnNeeded = new Set([
      "reviewed",
      "awaiting_task_acceptance",
      "complete",
      "blocked",
      "budget_paused",
    ]);
    if (
      state &&
      budget.usage?.role_turns >= hardRoleTurnLimit &&
      !noFurtherRoleTurnNeeded.has(state.state)
    ) {
      errors.push("hard role-turn limit requires budget_paused before more delegated work");
    } else if (
      state &&
      budget.usage?.role_turns >= softRoleTurnLimit &&
      budget.usage?.role_turns < hardRoleTurnLimit &&
      !noFurtherRoleTurnNeeded.has(state.state) &&
      budget.status !== "restricted"
    ) {
      errors.push("soft role-turn limit requires restricted budget status");
    }
    if (
      new Set(["needs_plan_revision", "planning"]).has(state?.state) &&
      budget.usage?.plan_rounds >= configuredBudget.max_plan_rounds
    ) {
      errors.push("plan revision limit requires budget_paused before another plan round");
    }
    if (
      new Set(["needs_implementation_revision", "implementing"]).has(state?.state) &&
      budget.usage?.implementation_rounds >= configuredBudget.max_implementation_rounds
    ) {
      errors.push("implementation revision limit requires budget_paused before another implementation round");
    }
  }

  return errors;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  const demoDirectory = process.argv[2];
  if (!demoDirectory) {
    console.error("Usage: node scripts/validate-delivery-loop.mjs <demo-directory>");
    process.exit(2);
  }

  const errors = await validateDeliveryLoop(process.cwd(), demoDirectory);
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Delivery loop validation passed: ${path.resolve(demoDirectory)}`);
}

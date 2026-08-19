import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { validateDeliveryLoop } from "../validate-delivery-loop.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "../..");
const sourceDemo = path.join(
  repositoryRoot,
  "demos/ai-service-subscription-pilot",
);

async function makeFixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "delivery-loop-"));
  const demo = path.join(root, "demo");

  await cp(path.join(repositoryRoot, ".agents"), path.join(root, ".agents"), {
    recursive: true,
  });
  await cp(path.join(sourceDemo, "workflow"), path.join(demo, "workflow"), {
    recursive: true,
  });
  await cp(path.join(sourceDemo, "knowledge"), path.join(demo, "knowledge"), {
    recursive: true,
  });
  await cp(
    path.join(sourceDemo, "tracking/loop-state.json"),
    path.join(demo, "tracking/loop-state.json"),
  );
  await cp(
    path.join(sourceDemo, "tracking/loop-budget.json"),
    path.join(demo, "tracking/loop-budget.json"),
  );
  await cp(
    path.join(sourceDemo, "tracking/loop-log.jsonl"),
    path.join(demo, "tracking/loop-log.jsonl"),
  );
  await cp(
    path.join(sourceDemo, "tracking/tasks"),
    path.join(demo, "tracking/tasks"),
    { recursive: true },
  );
  await writeFile(path.join(demo, "ROADMAP.md"), "# Roadmap\n");

  return { root, demo };
}

function visualRoute(mode = "not_applicable") {
  if (mode === "not_applicable") {
    return {
      required: false,
      mode,
      design_links: [],
      approved_mockup: null,
      approval_reference: null,
    };
  }
  return {
    required: true,
    mode,
    design_links: ["DESIGN-0001"],
    approved_mockup: new Set(["focused-mockup", "design-shotgun"]).has(mode)
      ? "mockups/example.html"
      : null,
    approval_reference: "user:TASK-0002:2026-08-16:visual-approved",
  };
}

async function writeReadyFixture(
  fixture,
  {
    criteria = ["AC-1"],
    visual = visualRoute(),
    roleTurns = 5,
    budgetStatus = "active",
  } = {},
) {
  const taskId = "TASK-0002";
  const planHash = "plan-a";
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.task_id = taskId;
  state.state = "ready_to_implement";
  state.blocker = null;
  state.round = { plan: 1, implementation: 0 };
  state.role_results = {
    planner: {
      status: "ready_for_critique",
      task_id: taskId,
      plan_hash: planHash,
      acceptance_criteria: criteria,
    },
    plan_critic: { verdict: "approved", task_id: taskId, plan_hash: planHash },
    executor: null,
  };
  state.visual_design = visual;
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    task_id: taskId,
    plan_hash: planHash,
    approval_reference: `user:${taskId}:2026-08-16:plan-approved`,
  };
  state.updated_at = "2026-08-16T00:00:05Z";
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const budgetPath = path.join(fixture.demo, "tracking/loop-budget.json");
  const budget = JSON.parse(await readFile(budgetPath, "utf8"));
  budget.task_id = taskId;
  budget.status = budgetStatus;
  budget.usage = { plan_rounds: 1, implementation_rounds: 0, role_turns: roleTurns };
  budget.updated_at = state.updated_at;
  await writeFile(budgetPath, `${JSON.stringify(budget, null, 2)}\n`);

  const transitions = [
    [null, "draft"],
    ["draft", "planning"],
    ["planning", "plan_review"],
    ["plan_review", "awaiting_plan_approval"],
    ["awaiting_plan_approval", "ready_to_implement"],
  ].map(([from, to], index) => ({
    timestamp: `2026-08-16T00:00:0${index + 1}Z`,
    event: "state_transition",
    slice_id: state.slice_id,
    task_id: taskId,
    from,
    to,
    actor: "orchestrator",
  }));
  const events = [
    transitions[0],
    transitions[1],
    {
      timestamp: "2026-08-16T00:00:02Z",
      event: "role_result",
      actor: "orchestrator",
      role: "planner",
      slice_id: state.slice_id,
      task_id: taskId,
      plan_hash: planHash,
      status: "ready_for_critique",
    },
    transitions[2],
    {
      timestamp: "2026-08-16T00:00:03Z",
      event: "role_result",
      actor: "orchestrator",
      role: "plan-critic",
      slice_id: state.slice_id,
      task_id: taskId,
      plan_hash: planHash,
      verdict: "approved",
    },
    transitions[3],
    {
      timestamp: "2026-08-16T00:00:04Z",
      event: "user_gate",
      actor: "orchestrator",
      gate: "plan",
      slice_id: state.slice_id,
      task_id: taskId,
      plan_hash: planHash,
      verdict: "approved",
      approval_reference: `user:${taskId}:2026-08-16:plan-approved`,
    },
    transitions[4],
    {
      timestamp: "2026-08-16T00:00:05Z",
      event: "budget_updated",
      actor: "orchestrator",
      slice_id: state.slice_id,
      task_id: taskId,
      status: budgetStatus,
      usage: budget.usage,
    },
  ];
  await writeFile(
    path.join(fixture.demo, "tracking/loop-log.jsonl"),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );

  return state;
}

async function writePlanReviewFixture(
  fixture,
  { stateName = "plan_review", approvedMockup = null } = {},
) {
  const state = await writeReadyFixture(fixture, {
    visual: {
      ...visualRoute("focused-mockup"),
      approved_mockup: approvedMockup,
    },
  });
  state.state = stateName;
  state.approvals.plan = null;
  state.role_results.plan_critic =
    stateName === "needs_plan_revision"
      ? { verdict: "needs_revision", task_id: state.task_id, plan_hash: "plan-a" }
      : null;
  await writeFile(
    path.join(fixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );

  const originalEvents = (await readFile(
    path.join(fixture.demo, "tracking/loop-log.jsonl"),
    "utf8",
  ))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  const events = originalEvents.filter(
    (event) =>
      (event.event === "state_transition" &&
        new Set(["draft", "planning", "plan_review"]).has(event.to)) ||
      (event.event === "role_result" && event.role === "planner") ||
      event.event === "budget_updated",
  );
  if (stateName === "needs_plan_revision") {
    events.push(
      {
        timestamp: "2026-08-16T00:00:03Z",
        event: "role_result",
        actor: "orchestrator",
        role: "plan-critic",
        slice_id: state.slice_id,
        task_id: state.task_id,
        plan_hash: "plan-a",
        verdict: "needs_revision",
      },
      {
        timestamp: "2026-08-16T00:00:04Z",
        event: "state_transition",
        actor: "orchestrator",
        slice_id: state.slice_id,
        task_id: state.task_id,
        from: "plan_review",
        to: "needs_plan_revision",
      },
    );
  }
  await writeFile(
    path.join(fixture.demo, "tracking/loop-log.jsonl"),
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  return state;
}

async function writeNeedsReviewFixture(fixture, { reportPath } = {}) {
  const state = await writeReadyFixture(fixture);
  const candidateCommit = "candidate-a";
  const executor = "executor-agent";
  state.state = "needs_review";
  state.executor = executor;
  state.candidate_commit = candidateCommit;
  state.role_results.executor = {
    status: "needs_review",
    executor,
    task_id: state.task_id,
    plan_hash: "plan-a",
    candidate_commit: candidateCommit,
    report_path:
      reportPath ?? `tracking/tasks/${state.task_id}/execution.md`,
  };
  await writeFile(
    path.join(fixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );

  const logPath = path.join(fixture.demo, "tracking/loop-log.jsonl");
  const events = (await readFile(logPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  events.push(
    {
      timestamp: "2026-08-16T00:00:06Z",
      event: "state_transition",
      actor: "orchestrator",
      slice_id: state.slice_id,
      task_id: state.task_id,
      from: "ready_to_implement",
      to: "implementing",
    },
    {
      timestamp: "2026-08-16T00:00:07Z",
      event: "role_result",
      actor: "orchestrator",
      role: "executor",
      executor,
      slice_id: state.slice_id,
      task_id: state.task_id,
      plan_hash: "plan-a",
      candidate_commit: candidateCommit,
      status: "needs_review",
    },
    {
      timestamp: "2026-08-16T00:00:08Z",
      event: "state_transition",
      actor: "orchestrator",
      slice_id: state.slice_id,
      task_id: state.task_id,
      from: "implementing",
      to: "needs_review",
    },
  );
  await writeFile(
    logPath,
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  return state;
}

test("accepts the approved reusable skills and demo-local scaffold", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));

  assert.deepEqual(await validateDeliveryLoop(fixture.root, fixture.demo), []);
});

test("accepts a task-bound ready state with a valid non-UI route", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await writeReadyFixture(fixture);

  assert.deepEqual(await validateDeliveryLoop(fixture.root, fixture.demo), []);
});

test("rejects active planning without a concrete task identity", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const state = await writeReadyFixture(fixture);
  state.task_id = null;
  await writeFile(
    path.join(fixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("concrete TASK-NNNN task_id")));
});

test("rejects a missing required role skill", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await unlink(path.join(fixture.root, ".agents/skills/reviewer/SKILL.md"));

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("reviewer/SKILL.md")));
});

test("rejects task acceptance-criteria limits above five", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const configPath = path.join(fixture.demo, "workflow/CONFIG.yaml");
  const config = await readFile(configPath, "utf8");
  await writeFile(configPath, config.replace("max_acceptance_criteria: 5", "max_acceptance_criteria: 6"));

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("max_acceptance_criteria must be 5")));
});

test("rejects an active task plan with more than five acceptance criteria", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await writeReadyFixture(fixture, {
    criteria: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6"],
  });

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("no more than five acceptance criteria")));
});

test("enforces each frontend visual route before implementation", async (t) => {
  const cases = [
    {
      name: "material direction",
      visual: { ...visualRoute("design-shotgun"), approved_mockup: null },
      expected: "design-shotgun visual_design requires an approved mockup path",
    },
    {
      name: "focused interaction",
      visual: { ...visualRoute("focused-mockup"), approved_mockup: null },
      expected: "focused-mockup visual_design requires an approved mockup path",
    },
    {
      name: "trivial approved-pattern reuse",
      visual: { ...visualRoute("reuse"), design_links: [] },
      expected: "reuse visual_design requires an approved design link",
    },
    {
      name: "undetermined route",
      visual: visualRoute("undetermined"),
      expected: "visual_design must be determined before user plan approval",
    },
    {
      name: "non-UI route",
      visual: { ...visualRoute("not_applicable"), required: true },
      expected: "not_applicable visual_design must set required to false",
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fixture = await makeFixture();
      t.after(() => rm(fixture.root, { recursive: true, force: true }));
      await writeReadyFixture(fixture, { visual: testCase.visual });
      const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
      assert(errors.some((error) => error.includes(testCase.expected)));
    });
  }
});

test("accepts optional early mockups and valid durable visual evidence", async (t) => {
  for (const stateName of ["plan_review", "needs_plan_revision"]) {
    await t.test(`${stateName} may omit a mockup`, async () => {
      const fixture = await makeFixture();
      t.after(() => rm(fixture.root, { recursive: true, force: true }));
      await writePlanReviewFixture(fixture, { stateName });

      assert.deepEqual(await validateDeliveryLoop(fixture.root, fixture.demo), []);
    });
  }

  const reviewFixture = await makeFixture();
  t.after(() => rm(reviewFixture.root, { recursive: true, force: true }));
  await mkdir(path.join(reviewFixture.demo, "mockups"));
  await writeFile(
    path.join(reviewFixture.demo, "mockups/example.html"),
    "<!doctype html><title>Approved mockup</title>\n",
  );
  await writePlanReviewFixture(reviewFixture, {
    approvedMockup: "mockups/example.html",
  });
  assert.deepEqual(
    await validateDeliveryLoop(reviewFixture.root, reviewFixture.demo),
    [],
  );

  const readyFixture = await makeFixture();
  t.after(() => rm(readyFixture.root, { recursive: true, force: true }));
  await mkdir(path.join(readyFixture.demo, "mockups"));
  await writeFile(
    path.join(readyFixture.demo, "mockups/example.html"),
    "<!doctype html><title>Approved mockup</title>\n",
  );
  await writeReadyFixture(readyFixture, {
    visual: visualRoute("design-shotgun"),
  });
  assert.deepEqual(
    await validateDeliveryLoop(readyFixture.root, readyFixture.demo),
    [],
  );
});

test("rejects unsafe or non-file mockup evidence paths", async (t) => {
  const cases = [
    {
      name: "absolute path",
      setup: async (fixture) => {
        const outside = path.join(fixture.root, "absolute.html");
        await writeFile(outside, "outside\n");
        return outside;
      },
      expected: "must be a relative demo-local path",
    },
    {
      name: "lexical escape",
      setup: async (fixture) => {
        await writeFile(path.join(fixture.root, "outside.html"), "outside\n");
        return "../outside.html";
      },
      expected: "escapes the demo directory",
    },
    {
      name: "symlink escape",
      setup: async (fixture) => {
        await mkdir(path.join(fixture.demo, "mockups"));
        const outside = path.join(fixture.root, "outside.html");
        await writeFile(outside, "outside\n");
        await symlink(outside, path.join(fixture.demo, "mockups/linked.html"));
        return "mockups/linked.html";
      },
      expected: "resolves outside the demo directory",
    },
    {
      name: "missing file",
      setup: async () => "mockups/missing.html",
      expected: "does not exist",
    },
    {
      name: "demo-local file outside mockups",
      setup: async (fixture) => {
        await writeFile(path.join(fixture.demo, "elsewhere.html"), "elsewhere\n");
        return "elsewhere.html";
      },
      expected: "must be stored under mockups/",
    },
    {
      name: "directory",
      setup: async (fixture) => {
        await mkdir(path.join(fixture.demo, "mockups/directory"), {
          recursive: true,
        });
        return "mockups/directory";
      },
      expected: "must reference a regular file",
    },
  ];

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fixture = await makeFixture();
      t.after(() => rm(fixture.root, { recursive: true, force: true }));
      const approvedMockup = await testCase.setup(fixture);
      await writePlanReviewFixture(fixture, { approvedMockup });

      const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
      assert(
        errors.some((error) => error.includes(testCase.expected)),
        `expected ${JSON.stringify(testCase.expected)} in ${JSON.stringify(errors)}`,
      );
    });
  }
});

test("rejects a mockup symlink that canonically escapes mockups", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await mkdir(path.join(fixture.demo, "mockups"));
  await writeFile(path.join(fixture.demo, "elsewhere.html"), "elsewhere\n");
  await symlink("../elsewhere.html", path.join(fixture.demo, "mockups/linked.html"));
  await writePlanReviewFixture(fixture, {
    approvedMockup: "mockups/linked.html",
  });

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(
    errors.some((error) => error.includes("resolves outside mockups/")),
    `expected canonical mockups containment error in ${JSON.stringify(errors)}`,
  );
});

test("rejects a symlinked mockups root", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await mkdir(path.join(fixture.demo, "alternate-mockups"));
  await writeFile(
    path.join(fixture.demo, "alternate-mockups/example.html"),
    "<!doctype html><title>Impersonated mockup root</title>\n",
  );
  await symlink("alternate-mockups", path.join(fixture.demo, "mockups"));
  await writePlanReviewFixture(fixture, {
    approvedMockup: "mockups/example.html",
  });

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(
    errors.some((error) =>
      error.includes("required directory must resolve without symlinks"),
    ),
    `expected symlinked mockups root error in ${JSON.stringify(errors)}`,
  );
});

test("requires the active task executor report to exist at its exact path", async (t) => {
  const validFixture = await makeFixture();
  t.after(() => rm(validFixture.root, { recursive: true, force: true }));
  await mkdir(
    path.join(validFixture.demo, "tracking/tasks/TASK-0002"),
    { recursive: true },
  );
  await writeFile(
    path.join(validFixture.demo, "tracking/tasks/TASK-0002/execution.md"),
    "# Execution evidence\n",
  );
  await writeNeedsReviewFixture(validFixture);
  assert.deepEqual(
    await validateDeliveryLoop(validFixture.root, validFixture.demo),
    [],
  );

  const wrongTaskFixture = await makeFixture();
  t.after(() => rm(wrongTaskFixture.root, { recursive: true, force: true }));
  await mkdir(
    path.join(wrongTaskFixture.demo, "tracking/tasks/TASK-0001"),
    { recursive: true },
  );
  await writeFile(
    path.join(wrongTaskFixture.demo, "tracking/tasks/TASK-0001/execution.md"),
    "# Wrong task evidence\n",
  );
  await writeNeedsReviewFixture(wrongTaskFixture, {
    reportPath: "tracking/tasks/TASK-0001/execution.md",
  });
  let errors = await validateDeliveryLoop(
    wrongTaskFixture.root,
    wrongTaskFixture.demo,
  );
  assert(
    errors.some((error) => error.includes("must resolve exactly to tracking/tasks/TASK-0002/execution.md")),
  );

  const missingFixture = await makeFixture();
  t.after(() => rm(missingFixture.root, { recursive: true, force: true }));
  await writeNeedsReviewFixture(missingFixture);
  errors = await validateDeliveryLoop(missingFixture.root, missingFixture.demo);
  assert(errors.some((error) => error.includes("executor report does not exist")));
});

test("rejects an executor report symlink to another task report", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await mkdir(path.join(fixture.demo, "tracking/tasks/TASK-0001"), {
    recursive: true,
  });
  await mkdir(path.join(fixture.demo, "tracking/tasks/TASK-0002"), {
    recursive: true,
  });
  await writeFile(
    path.join(fixture.demo, "tracking/tasks/TASK-0001/execution.md"),
    "# Another task's report\n",
  );
  await symlink(
    "../TASK-0001/execution.md",
    path.join(fixture.demo, "tracking/tasks/TASK-0002/execution.md"),
  );
  await writeNeedsReviewFixture(fixture);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(
    errors.some((error) =>
      error.includes("resolves outside tracking/tasks/TASK-0002/"),
    ),
    `expected canonical task containment error in ${JSON.stringify(errors)}`,
  );
});

test("rejects an active task directory symlinked to another task", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await mkdir(path.join(fixture.demo, "tracking/tasks/TASK-0001"), {
    recursive: true,
  });
  await writeFile(
    path.join(fixture.demo, "tracking/tasks/TASK-0001/execution.md"),
    "# Another task's report\n",
  );
  await symlink(
    "TASK-0001",
    path.join(fixture.demo, "tracking/tasks/TASK-0002"),
  );
  await writeNeedsReviewFixture(fixture);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(
    errors.some((error) =>
      error.includes("required directory must resolve without symlinks"),
    ),
    `expected symlinked active task root error in ${JSON.stringify(errors)}`,
  );
});

test("enforces hard, soft, and revision budget limits", async (t) => {
  const hardFixture = await makeFixture();
  t.after(() => rm(hardFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(hardFixture, { roleTurns: 15 });
  let errors = await validateDeliveryLoop(hardFixture.root, hardFixture.demo);
  assert(errors.some((error) => error.includes("hard role-turn limit")));

  const softFixture = await makeFixture();
  t.after(() => rm(softFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(softFixture, { roleTurns: 12 });
  errors = await validateDeliveryLoop(softFixture.root, softFixture.demo);
  assert(errors.some((error) => error.includes("soft role-turn limit")));

  const planFixture = await makeFixture();
  t.after(() => rm(planFixture.root, { recursive: true, force: true }));
  const planState = await writeReadyFixture(planFixture);
  planState.state = "planning";
  planState.round.plan = 3;
  planState.role_results.plan_critic.verdict = "needs_revision";
  await writeFile(
    path.join(planFixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(planState, null, 2)}\n`,
  );
  const planBudgetPath = path.join(planFixture.demo, "tracking/loop-budget.json");
  const planBudget = JSON.parse(await readFile(planBudgetPath, "utf8"));
  planBudget.usage.plan_rounds = 3;
  await writeFile(planBudgetPath, `${JSON.stringify(planBudget, null, 2)}\n`);
  errors = await validateDeliveryLoop(planFixture.root, planFixture.demo);
  assert(errors.some((error) => error.includes("plan revision limit")));

  const implementationFixture = await makeFixture();
  t.after(() => rm(implementationFixture.root, { recursive: true, force: true }));
  const implementationState = await writeReadyFixture(implementationFixture);
  implementationState.state = "implementing";
  implementationState.round.implementation = 3;
  await writeFile(
    path.join(implementationFixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(implementationState, null, 2)}\n`,
  );
  const implementationBudgetPath = path.join(
    implementationFixture.demo,
    "tracking/loop-budget.json",
  );
  const implementationBudget = JSON.parse(
    await readFile(implementationBudgetPath, "utf8"),
  );
  implementationBudget.usage.implementation_rounds = 3;
  await writeFile(
    implementationBudgetPath,
    `${JSON.stringify(implementationBudget, null, 2)}\n`,
  );
  errors = await validateDeliveryLoop(
    implementationFixture.root,
    implementationFixture.demo,
  );
  assert(errors.some((error) => error.includes("implementation revision limit")));
});

test("rejects role-turn usage below durable delegated work", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  await writeReadyFixture(fixture, { roleTurns: 0 });

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("lower than durable delegated-role events")));
});

test("requires complete orchestrator-owned role and transition evidence", async (t) => {
  const roleFixture = await makeFixture();
  t.after(() => rm(roleFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(roleFixture);
  const roleLogPath = path.join(roleFixture.demo, "tracking/loop-log.jsonl");
  const roleEvents = (await readFile(roleLogPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter((event) => !(event.event === "role_result" && event.role === "planner"));
  await writeFile(
    roleLogPath,
    `${roleEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  let errors = await validateDeliveryLoop(roleFixture.root, roleFixture.demo);
  assert(errors.some((error) => error.includes("planner result requires a matching durable role event")));

  const actorFixture = await makeFixture();
  t.after(() => rm(actorFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(actorFixture);
  const actorLogPath = path.join(actorFixture.demo, "tracking/loop-log.jsonl");
  const actorEvents = (await readFile(actorLogPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  actorEvents.find((event) => Object.hasOwn(event, "from")).actor = "executor";
  await writeFile(
    actorLogPath,
    `${actorEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  errors = await validateDeliveryLoop(actorFixture.root, actorFixture.demo);
  assert(errors.some((error) => error.includes("must be recorded by orchestrator")));

  const historyFixture = await makeFixture();
  t.after(() => rm(historyFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(historyFixture);
  const historyLogPath = path.join(historyFixture.demo, "tracking/loop-log.jsonl");
  const historyEvents = (await readFile(historyLogPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line))
    .filter(
      (event) =>
        !Object.hasOwn(event, "from") || event.to === "ready_to_implement",
    );
  await writeFile(
    historyLogPath,
    `${historyEvents.map((event) => JSON.stringify(event)).join("\n")}\n`,
  );
  errors = await validateDeliveryLoop(historyFixture.root, historyFixture.demo);
  assert(errors.some((error) => error.includes("must start from an initial transition")));
});

test("rejects stale task approvals and state not backed by the transition log", async (t) => {
  const staleFixture = await makeFixture();
  t.after(() => rm(staleFixture.root, { recursive: true, force: true }));
  const staleState = await writeReadyFixture(staleFixture);
  staleState.approvals.plan.task_id = "TASK-9999";
  staleState.approvals.plan.approval_reference =
    "user:TASK-9999:2026-08-16:plan-approved";
  await writeFile(
    path.join(staleFixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(staleState, null, 2)}\n`,
  );
  let errors = await validateDeliveryLoop(staleFixture.root, staleFixture.demo);
  assert(errors.some((error) => error.includes("plan approval must belong to the active task")));

  const logFixture = await makeFixture();
  t.after(() => rm(logFixture.root, { recursive: true, force: true }));
  await writeReadyFixture(logFixture);
  await writeFile(
    path.join(logFixture.demo, "tracking/loop-log.jsonl"),
    `${JSON.stringify({
      timestamp: "2026-08-16T00:00:00Z",
      event: "state_transition",
      slice_id: "SLICE-001",
      task_id: "TASK-0002",
      from: null,
      to: "blocked",
      actor: "orchestrator",
    })}\n`,
  );
  errors = await validateDeliveryLoop(logFixture.root, logFixture.demo);
  assert(errors.some((error) => error.includes("latest logged transition")));
});

test("rejects reviewed state when reviewer approvals target different commits", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.candidate_commit = "commit-b";
  state.approvals.spec = { verdict: "approved", candidate_commit: "commit-a" };
  state.approvals.quality = { verdict: "approved", candidate_commit: "commit-b" };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("same candidate commit")));
});

test("rejects implementation-ready state without user plan approval", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "ready_to_implement";
  state.blocker = null;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("user plan approval")));
});

test("rejects plan-approval state without planner and critic results", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "awaiting_plan_approval";
  state.blocker = null;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("planner result")));
  assert(errors.some((error) => error.includes("plan-critic approval")));
});

test("rejects quality review without executor result and specification approval", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "quality_review";
  state.blocker = null;
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:workflow-test:2026-08-16:plan-approved",
  };
  state.role_results = {
    planner: { status: "ready_for_critique", plan_hash: "plan-a" },
    plan_critic: { verdict: "approved", plan_hash: "plan-a" },
    executor: null,
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("executor result")));
  assert(errors.some((error) => error.includes("executor identity")));
  assert(errors.some((error) => error.includes("specification approval")));
});

test("rejects a specification reviewer who is the task executor before quality review", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const state = await writeReadyFixture(fixture);
  state.state = "quality_review";
  state.executor = "same-agent";
  state.candidate_commit = "commit-b";
  state.role_results.executor = {
    status: "needs_review",
    executor: "same-agent",
    task_id: state.task_id,
    plan_hash: "plan-a",
    candidate_commit: "commit-b",
    report_path: "tracking/tasks/TASK-0002/execution.md",
  };
  state.approvals.spec = {
    verdict: "approved",
    task_id: state.task_id,
    candidate_commit: "commit-b",
    reviewer: "same-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  await writeFile(
    path.join(fixture.demo, "tracking/loop-state.json"),
    `${JSON.stringify(state, null, 2)}\n`,
  );

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("spec reviewer cannot be the executor")));
});

test("rejects quality review when specification approval lacks reviewer metadata", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "quality_review";
  state.task_id = "TASK-0002";
  state.blocker = null;
  state.executor = "executor-agent";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:workflow-test:2026-08-16:plan-approved",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
  };
  state.role_results = {
    planner: { status: "ready_for_critique", plan_hash: "plan-a" },
    plan_critic: { verdict: "approved", plan_hash: "plan-a" },
    executor: {
      status: "needs_review",
      candidate_commit: "commit-b",
      report_path: "tracking/tasks/TASK-0002/execution.md",
    },
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("spec approval requires reviewer identity")));
  assert(errors.some((error) => error.includes("spec approval requires full or scoped review_mode")));
});

test("rejects malformed user approval references", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "ready_to_implement";
  state.blocker = null;
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "yes",
  };
  state.role_results = {
    planner: { status: "ready_for_critique", plan_hash: "plan-a" },
    plan_critic: { verdict: "approved", plan_hash: "plan-a" },
    executor: null,
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("durable user approval reference")));
});

test("rejects complete state without user task acceptance", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "complete";
  state.blocker = null;
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:test:plan",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "spec-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "quality-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("user task acceptance")));
});

test("rejects reviewer approvals that are not independent", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:test:plan",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "same-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "same-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("different independent reviewers")));
});

test("rejects scoped review without its fix-round evidence", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:test:plan",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "spec-agent",
    independent_from_executor: true,
    review_mode: "scoped",
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "quality-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("scoped review requires")));
});

test("rejects scoped review when a full-review trigger is present", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:test:plan",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "spec-agent",
    independent_from_executor: true,
    review_mode: "scoped",
    base_commit: "commit-a",
    prior_findings: ["FINDING-001"],
    fix_diff: "commit-a..commit-b",
    changed_files: ["src/example.ts"],
    tests_and_evidence: ["example test passed"],
    full_review_triggers: ["database_schema"],
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "quality-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("must escalate to full")));
});

test("rejects scoped review by a different reviewer than the prior full review", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const logPath = path.join(fixture.demo, "tracking/loop-log.jsonl");
  await writeFile(
    logPath,
    `${JSON.stringify({
      timestamp: "2026-08-16T00:00:00Z",
      event_id: "review-spec-full-a",
      event: "review_completed",
      actor: "orchestrator",
      task_id: "TASK-0002",
      lane: "spec",
      review_mode: "full",
      reviewer: "original-spec-agent",
      candidate_commit: "commit-a",
    })}\n`,
  );
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.executor = "executor-agent";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:workflow-test:2026-08-16:plan-approved",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "brand-new-spec-agent",
    independent_from_executor: true,
    review_mode: "scoped",
    base_commit: "commit-a",
    prior_findings: ["FINDING-001"],
    fix_diff: "commit-a..commit-b",
    changed_files: ["src/example.ts"],
    tests_and_evidence: ["example test passed"],
    full_review_triggers: [],
    prior_full_review_event: "review-spec-full-a",
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "quality-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  state.role_results = {
    planner: { status: "ready_for_critique", plan_hash: "plan-a" },
    plan_critic: { verdict: "approved", plan_hash: "plan-a" },
    executor: {
      status: "needs_review",
      candidate_commit: "commit-b",
      report_path: "tracking/tasks/TASK-0001/execution.md",
    },
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("same reviewer as the prior full review")));
});

test("rejects scoped continuity backed by a non-orchestrator review event", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const logPath = path.join(fixture.demo, "tracking/loop-log.jsonl");
  await writeFile(
    logPath,
    `${JSON.stringify({
      timestamp: "2026-08-16T00:00:00Z",
      event_id: "review-spec-full-a",
      event: "review_completed",
      actor: "executor",
      task_id: "TASK-0002",
      lane: "spec",
      review_mode: "full",
      reviewer: "spec-agent",
      candidate_commit: "commit-a",
    })}\n`,
  );
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.task_id = "TASK-0002";
  state.executor = "executor-agent";
  state.candidate_commit = "commit-b";
  state.approvals.spec = {
    verdict: "approved",
    task_id: "TASK-0002",
    candidate_commit: "commit-b",
    reviewer: "spec-agent",
    independent_from_executor: true,
    review_mode: "scoped",
    base_commit: "commit-a",
    prior_findings: ["FINDING-001"],
    fix_diff: "commit-a..commit-b",
    changed_files: ["src/example.ts"],
    tests_and_evidence: ["example test passed"],
    full_review_triggers: [],
    prior_full_review_event: "review-spec-full-a",
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("must be orchestrator-recorded")));
});

test("rejects scoped review when the prior full review belongs to another task", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const logPath = path.join(fixture.demo, "tracking/loop-log.jsonl");
  await writeFile(
    logPath,
    `${JSON.stringify({
      timestamp: "2026-08-16T00:00:00Z",
      event_id: "review-spec-full-a",
      event: "review_completed",
      actor: "orchestrator",
      task_id: "TASK-9999",
      lane: "spec",
      review_mode: "full",
      reviewer: "spec-agent",
      candidate_commit: "commit-a",
    })}\n`,
  );
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "reviewed";
  state.task_id = "TASK-0002";
  state.executor = "executor-agent";
  state.candidate_commit = "commit-b";
  state.approvals.plan = {
    verdict: "approved",
    actor: "user",
    approval_reference: "user:workflow-test:2026-08-16:plan-approved",
  };
  state.approvals.spec = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "spec-agent",
    independent_from_executor: true,
    review_mode: "scoped",
    base_commit: "commit-a",
    prior_findings: ["FINDING-001"],
    fix_diff: "commit-a..commit-b",
    changed_files: ["src/example.ts"],
    tests_and_evidence: ["example test passed"],
    full_review_triggers: [],
    prior_full_review_event: "review-spec-full-a",
  };
  state.approvals.quality = {
    verdict: "approved",
    candidate_commit: "commit-b",
    reviewer: "quality-agent",
    independent_from_executor: true,
    review_mode: "full",
  };
  state.role_results = {
    planner: { status: "ready_for_critique", plan_hash: "plan-a" },
    plan_critic: { verdict: "approved", plan_hash: "plan-a" },
    executor: {
      status: "needs_review",
      candidate_commit: "commit-b",
      report_path: "tracking/tasks/TASK-0002/execution.md",
    },
  };
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("same reviewer as the prior full review")));
});

test("rejects disabled pull-request, merge, or scoped re-review gates", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const configPath = path.join(fixture.demo, "workflow/CONFIG.yaml");
  const config = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    config
      .replace("scoped_re_review_default: true", "scoped_re_review_default: false")
      .replace("require_user_approval_to_create: true", "require_user_approval_to_create: false")
      .replace("require_user_approval_to_merge: true", "require_user_approval_to_merge: false"),
  );

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("scoped re-review must remain enabled")));
  assert(errors.some((error) => error.includes("pull-request creation must require user approval")));
  assert(errors.some((error) => error.includes("merge must require user approval")));
});

test("accepts demo-configured budget limits when state matches configuration", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const configPath = path.join(fixture.demo, "workflow/CONFIG.yaml");
  const config = await readFile(configPath, "utf8");
  await writeFile(
    configPath,
    config.replace("max_role_turns_per_task: 15", "max_role_turns_per_task: 20"),
  );
  const budgetPath = path.join(fixture.demo, "tracking/loop-budget.json");
  const budget = JSON.parse(await readFile(budgetPath, "utf8"));
  budget.limits.max_role_turns_per_task = 20;
  await writeFile(budgetPath, `${JSON.stringify(budget, null, 2)}\n`);

  assert.deepEqual(await validateDeliveryLoop(fixture.root, fixture.demo), []);
});

test("rejects unknown loop states", async (t) => {
  const fixture = await makeFixture();
  t.after(() => rm(fixture.root, { recursive: true, force: true }));
  const statePath = path.join(fixture.demo, "tracking/loop-state.json");
  const state = JSON.parse(await readFile(statePath, "utf8"));
  state.state = "almost_done";
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`);

  const errors = await validateDeliveryLoop(fixture.root, fixture.demo);
  assert(errors.some((error) => error.includes("unknown loop state")));
});

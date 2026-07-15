/* global process, setTimeout */
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";

const helperPath = "tools/post-purchase-operations-evidence.playwright.js";
const sessionOption = `-s=p${process.pid.toString(36)}${randomUUID().slice(0, 4)}`;
const baseUrl = (
  process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL ?? "http://127.0.0.1:5173"
).replace(/\/$/, "");
const passcode = process.env.ADMIN_PASSCODE?.trim();
const requestedEvidenceRunId = process.env.PAYPAL_RETAIL_EVIDENCE_RUN_ID;

if (!passcode) {
  throw new Error(
    "ADMIN_PASSCODE is required for post-purchase operations evidence.",
  );
}

try {
  await runEvidence();
} finally {
  spawnSync("playwright-cli", [sessionOption, "close"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

async function runEvidence() {
  const adminUrl = `${baseUrl}/admin/orders`;
  const browserNavigation = spawnSync(
    "playwright-cli",
    [sessionOption, "open", adminUrl],
    {
      cwd: process.cwd(),
      encoding: "utf8",
    },
  );

  if (browserNavigation.status !== 0) {
    process.stdout.write(browserNavigation.stdout);
    process.stderr.write(browserNavigation.stderr);
    throw new Error("Could not open the post-purchase evidence browser.");
  }

  await waitForBrowserSelector(".app-shell");
  await unlockAdminSession();

  const child = spawn(
    "playwright-cli",
    [sessionOption, "--raw", "run-code", `--filename=${helperPath}`],
    { cwd: process.cwd(), stdio: ["ignore", "pipe", "pipe"] },
  );
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });

  if (exitCode !== 0) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    throw new Error("Post-purchase Playwright helper exited unsuccessfully.");
  }

  if (stdout.trimStart().startsWith("### Error")) {
    process.stderr.write(stdout);
    process.stderr.write(stderr);
    throw new Error(
      "Post-purchase Playwright helper failed before producing a report.",
    );
  }

  let report;
  try {
    report = JSON.parse(stdout.trim());
  } catch (error) {
    process.stderr.write(stdout);
    process.stderr.write(stderr);
    throw new Error(
      `Post-purchase evidence runner could not parse helper output: ${String(error)}`,
    );
  }

  const artifact = resolveEvidenceMetricsArtifact(
    report.outputPrefix,
    requestedEvidenceRunId,
  );
  report.evidenceRunId = artifact.runId;
  report.metricsPath = artifact.metricsPath;
  writeFileSync(
    artifact.metricsPath,
    `${JSON.stringify(report, null, 2)}\n`,
    artifact.runId ? { flag: "wx" } : undefined,
  );
  process.stdout.write(`${JSON.stringify(report)}\n`);

  if (
    report.summary.missingRows.length > 0 ||
    report.summary.failedRows.length > 0
  ) {
    process.stderr.write(
      `Post-purchase operations evidence failed: ${JSON.stringify(report.summary)}\n`,
    );
    process.exitCode = 1;
  }
}

function resolveEvidenceMetricsArtifact(outputPrefix, requestedRunId) {
  const runId = requestedRunId?.trim();
  if (!runId) {
    return {
      runId: null,
      metricsPath: `${outputPrefix}-metrics.json`,
    };
  }
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(runId)) {
    throw new Error(
      "PAYPAL_RETAIL_EVIDENCE_RUN_ID must be 1-64 letters, numbers, dots, underscores, or hyphens and start with a letter or number.",
    );
  }
  return {
    runId,
    metricsPath: `${outputPrefix}-${runId}-metrics.json`,
  };
}

async function unlockAdminSession() {
  const locked = spawnSync(
    "playwright-cli",
    [
      sessionOption,
      "--raw",
      "eval",
      "() => Boolean(document.querySelector('#admin-passcode'))",
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  if (locked.status !== 0) {
    throw new Error("Could not inspect the Admin authentication state.");
  }
  if (locked.stdout.trim() !== "true") {
    await waitForBrowserSelector("nav[aria-label='Admin sections']");
    return;
  }

  const authDirectory = mkdtempSync(
    join(tmpdir(), "paypal-retail-admin-evidence-auth-"),
  );
  const authHelperPath = join(authDirectory, "unlock-admin.playwright.js");
  const authHelperSource = `async function unlockAdmin(page) {
  await page.locator("#admin-passcode").fill(${JSON.stringify(passcode)});
  await page.getByRole("button", { name: "Open Admin Portal" }).click();
}`;

  try {
    writeFileSync(authHelperPath, authHelperSource, { mode: 0o600 });
    const unlock = spawnSync(
      "playwright-cli",
      [sessionOption, "--raw", "run-code", `--filename=${authHelperPath}`],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    if (unlock.status !== 0) {
      throw new Error("Could not unlock the Admin evidence session.");
    }
  } finally {
    rmSync(authDirectory, { recursive: true, force: true });
  }

  await waitForBrowserSelector("nav[aria-label='Admin sections']");
}

async function waitForBrowserSelector(selector) {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const readiness = spawnSync(
      "playwright-cli",
      [
        sessionOption,
        "--raw",
        "eval",
        `() => Boolean(document.querySelector(${JSON.stringify(selector)}))`,
      ],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    if (readiness.status === 0 && readiness.stdout.trim() === "true") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Browser did not render ${selector} within 30000ms.`);
}

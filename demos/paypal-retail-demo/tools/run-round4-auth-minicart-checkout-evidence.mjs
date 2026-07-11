/* global process */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const helperPath = "tools/round4-auth-minicart-checkout-evidence.playwright.js";
const browserList = spawnSync("playwright-cli", ["list"], {
  cwd: process.cwd(),
  encoding: "utf8",
});

if (!browserList.stdout.includes("status: open")) {
  const baseUrl =
    process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL ?? "http://127.0.0.1:5173";
  const openBrowser = spawnSync("playwright-cli", ["open", baseUrl], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  if (openBrowser.status !== 0) {
    process.stdout.write(openBrowser.stdout);
    process.stderr.write(openBrowser.stderr);
    process.exit(openBrowser.status ?? 1);
  }
}

const child = spawn(
  "playwright-cli",
  ["--raw", "run-code", `--filename=${helperPath}`],
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
  process.exit(exitCode);
}

let report;
try {
  report = JSON.parse(stdout.trim());
} catch (error) {
  process.stderr.write(stderr);
  throw new Error(
    `Round 4 evidence runner could not parse helper output: ${String(error)}`,
  );
}

mkdirSync(report.outputPrefix, { recursive: true });
writeFileSync(
  `${report.outputPrefix}/metrics.json`,
  `${JSON.stringify(report, null, 2)}\n`,
);
process.stdout.write(`${JSON.stringify(report)}\n`);

if (
  report.summary.missingRows.length > 0 ||
  report.summary.failedRows.length > 0
) {
  process.stderr.write(
    `Round 4 evidence failed: ${JSON.stringify(report.summary)}\n`,
  );
  process.exit(1);
}

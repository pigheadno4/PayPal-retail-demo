/* global fetch, process, setTimeout */
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const helperPath = "tools/round4-auth-minicart-checkout-evidence.playwright.js";
const browserList = spawnSync("playwright-cli", ["list"], {
  cwd: process.cwd(),
  encoding: "utf8",
});
const baseUrl =
  process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL ?? "http://127.0.0.1:5173";
const isHostedRender = isRenderHostedBaseUrl(baseUrl);
const browserIsOpen = browserList.stdout.includes("status: open");
const browserNavigation = browserIsOpen
  ? spawnSync("playwright-cli", ["goto", baseUrl], {
      cwd: process.cwd(),
      encoding: "utf8",
    })
  : spawnSync("playwright-cli", ["open", baseUrl], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

if (browserNavigation.status !== 0) {
  process.stdout.write(browserNavigation.stdout);
  process.stderr.write(browserNavigation.stderr);
  process.exit(browserNavigation.status ?? 1);
}

await assertHostedStaticAssets();
await waitForBrowserAppShell();

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

if (stdout.trimStart().startsWith("### Error")) {
  process.stderr.write(stdout);
  process.stderr.write(stderr);
  throw new Error(
    "Playwright helper failed before producing an evidence report.",
  );
}

let report;
try {
  report = JSON.parse(stdout.trim());
} catch (error) {
  process.stderr.write(stdout);
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

async function waitForBrowserAppShell() {
  const timeout = isHostedRender ? 120000 : 30000;
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const readiness = spawnSync(
      "playwright-cli",
      ["--raw", "eval", "() => Boolean(document.querySelector('.app-shell'))"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    if (readiness.status === 0 && readiness.stdout.trim() === "true") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Round 4 evidence browser did not render .app-shell within ${timeout}ms at ${baseUrl}.`,
  );
}

function isRenderHostedBaseUrl(candidate) {
  return /^https:\/\/[^/]+\.onrender\.com(?:[/?#]|$)/i.test(candidate);
}

async function assertHostedStaticAssets() {
  if (!isHostedRender) return;

  const requiredAssetPaths = [
    "/assets/paypal-logos/applepay-default.svg",
    "/assets/popmart/products/blind-boxes-1-1.png",
  ];
  const baseOrigin = baseUrl.replace(/\/+$/, "");

  for (const assetPath of requiredAssetPaths) {
    const response = await fetch(`${baseOrigin}${assetPath}`, {
      method: "HEAD",
      redirect: "error",
    });
    if (!response.ok) {
      throw new Error(
        `Round 4 hosted asset preflight failed for ${assetPath}: ${response.status}.`,
      );
    }
  }
}

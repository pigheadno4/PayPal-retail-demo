import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  cleanupTask0004Fixture,
  seedTask0004Fixture,
  task0004Identity,
} from "./support/task0004-fixture.js";

const captureEvidence = process.env.TASK0004_CAPTURE_EVIDENCE === "1";
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0004");
if (captureEvidence) mkdirSync(evidenceDirectory, { recursive: true });

function screenshotPath(testInfo: TestInfo, name: string) {
  return captureEvidence
    ? resolve(evidenceDirectory, `${testInfo.project.name}-${name}.png`)
    : testInfo.outputPath(`${name}.png`);
}

async function installSession(page: Page, token: string) {
  const projectRef = new URL(process.env.VITE_SUPABASE_URL!).hostname.split(".")[0]!;
  await page.addInitScript(({ storageKey, accessToken }) => {
    localStorage.setItem(storageKey, JSON.stringify({
      access_token: accessToken,
      refresh_token: "task0004-nonreusable-refresh",
      expires_at: 4_102_444_800,
      expires_in: 86_400,
      token_type: "bearer",
      user: { id: "fixture-user", aud: "authenticated", role: "authenticated", email: "fixture@example.test" },
    }));
  }, { storageKey: `sb-${projectRef}-auth-token`, accessToken: token });
}

async function setTheme(page: Page, theme: "light" | "dark") {
  const current = await page.locator("html").getAttribute("data-theme");
  if (current !== theme) await page.locator(".icon-button").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

function collectUnexpectedConsoleErrors(page: Page) {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedResponses.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });
  return { errors, failedResponses };
}

function expectOnlyBootstrapSummaryMiss(browserErrors: ReturnType<typeof collectUnexpectedConsoleErrors>) {
  expect(browserErrors.failedResponses).toEqual(["404 /api/v1/me/summary"]);
  expect(browserErrors.errors).toEqual([
    "Failed to load resource: the server responded with a status of 404 (Not Found)",
  ]);
}

test.describe("TASK-0004 local E2E from accepted handoff", () => {
  test.afterEach(async ({ page }) => {
    await page.close();
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
    await cleanupTask0004Fixture();
  });

  test("TC-0009 commits exactly 10 and restores the persisted result", async ({ page }, testInfo) => {
    await cleanupTask0004Fixture();
    await seedTask0004Fixture("success");
    await installSession(page, task0004Identity.success.token);
    const browserErrors = collectUnexpectedConsoleErrors(page);
    const taskApiRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/me/") || request.url().includes("/api/v1/usage/")) {
        taskApiRequests.push(new URL(request.url()).pathname);
      }
    });

    await page.goto("/workspace");
    await expect(page.getByRole("heading", { name: "#Generate Answer" })).toBeVisible();
    await expect(page.getByText("100 units available")).toBeVisible();
    await page.getByRole("button", { name: "How can an AI SaaS reduce failed-renewal churn?" }).click();
    await expect(page.getByText("100 units available")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate · 10 units" })).toBeVisible();
    await expect(page.getByText("90 units after success")).toBeVisible();
    await page.getByRole("button", { name: "Generate · 10 units" }).click();
    await expect(page.getByRole("button", { name: "Generate · 10 units" })).toBeDisabled();
    await expect(page.getByText("Drafting answer…")).toBeVisible();
    await expect(page.getByText("Simulated AI")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Renewal recovery playbook" })).toBeVisible();
    await expect(page.getByText("90 units available")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Renewal recovery playbook" })).toBeVisible();
    await expect(page.getByText("90 units available")).toBeVisible();
    await setTheme(page, "dark");
    await page.screenshot({ path: screenshotPath(testInfo, "success-return-dark"), fullPage: true });
    expect(taskApiRequests).toContain("/api/v1/me/activation");
    expect(taskApiRequests).toContain("/api/v1/me/summary");
    expect(taskApiRequests).toContain("/api/v1/usage/generate-answer");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expectOnlyBootstrapSummaryMiss(browserErrors);
  });

  test("TC-0010 releases deterministic failure and shows no answer", async ({ page }, testInfo) => {
    await cleanupTask0004Fixture();
    await seedTask0004Fixture("failure");
    await installSession(page, task0004Identity.failure.token);
    const browserErrors = collectUnexpectedConsoleErrors(page);
    await page.goto("/workspace");
    await page.getByRole("button", { name: "Explain usage-based AI credits to a new customer." }).click();
    await page.getByRole("button", { name: "Generate · 10 units" }).click();
    await expect(page.getByText("Drafting answer…")).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("reservation was released");
    await expect(page.getByText("100 units available")).toBeVisible();
    await expect(page.getByRole("heading", { name: "How AI credits work" })).toHaveCount(0);
    await setTheme(page, "light");
    await page.screenshot({ path: screenshotPath(testInfo, "released-light"), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expectOnlyBootstrapSummaryMiss(browserErrors);
  });
});

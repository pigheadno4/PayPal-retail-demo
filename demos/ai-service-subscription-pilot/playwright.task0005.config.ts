import { defineConfig, devices } from "@playwright/test";

// Playwright 1.62 otherwise writes a failure-time accessibility snapshot,
// which can contain the identity form even when screenshots/trace are off.
process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "hosted-identity.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 15 * 60_000,
  reporter: "line",
  outputDir: "/private/tmp/task0005-playwright-results",
  use: {
    baseURL: process.env.TASK0005_BASE_URL,
    trace: "off",
    video: "off",
    screenshot: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {
      launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    } : {}),
  },
  projects: [{ name: "hosted-chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig } from "@playwright/test";

process.env.PLAYWRIGHT_NO_COPY_PROMPT = "1";

// This is deliberately not a hosted launcher. No env files, app server or DB.
if (process.env.PLAYWRIGHT_BASE_URL || process.env.TASK0009_BASE_URL) {
  throw new Error("task0009_target_override_forbidden");
}

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "hosted-slice.spec.ts",
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: "line",
  captureGitInfo: { commit: false, diff: false },
  outputDir: "test-results/task0009-local",
  use: {
    baseURL: "http://127.0.0.1:4199",
    trace: "off", screenshot: "off", video: "off",
    serviceWorkers: "block", ignoreHTTPSErrors: false,
    channel: "chrome",
  },
  projects: [
    { name: "local-laptop", use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } } },
    { name: "local-390", use: { browserName: "chromium", viewport: { width: 390, height: 844 } } },
  ],
});

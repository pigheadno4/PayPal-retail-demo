import { defineConfig } from "@playwright/test";
if (process.env.PLAYWRIGHT_BASE_URL) throw new Error("task0012_external_target_forbidden");
export default defineConfig({
  testDir: "./tests/e2e", testMatch: "paypal-checkout.spec.ts", workers: 1, retries: 0,
  outputDir: "task0012-test-results", timeout: 30_000, reporter: "line",
  use: { baseURL: "http://127.0.0.1:3112", channel: "chrome", serviceWorkers: "block", trace: "off",
    launchOptions: { args: ["--proxy-server=http://127.0.0.1:3112", "--proxy-bypass-list=127.0.0.1;localhost;[::1]"] } },
  projects: [{ name: "chromium", use: { viewport: { width: 1440, height: 1000 } } }, { name: "mobile-chromium", use: { viewport: { width: 390, height: 844 } } }],
  webServer: { command: "node node_modules/tsx/dist/cli.mjs tests/e2e/support/task0012-server.ts", url: "http://127.0.0.1:3112/api/v1/health", reuseExistingServer: false },
});

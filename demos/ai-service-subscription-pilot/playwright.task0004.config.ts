import { defineConfig, devices } from "@playwright/test";

const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
process.env.VITE_SUPABASE_URL ??= process.env.NEXT_PUBLIC_SUPABASE_URL;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "generate-answer.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:3104",
    trace: "retain-on-failure",
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : { channel: "chrome" }),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: "npm run build && node --env-file=.env.local node_modules/tsx/dist/cli.mjs tests/e2e/support/task0004-server.ts",
    url: "http://127.0.0.1:3104/api/v1/health",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      TASK0004_PORT: "3104",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://task0004.supabase.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY
        ?? "task0004-publishable-placeholder",
    },
  },
});

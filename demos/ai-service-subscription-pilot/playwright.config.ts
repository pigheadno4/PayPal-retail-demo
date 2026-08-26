import { defineConfig, devices } from "@playwright/test";

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const captureEvidence = process.env.TASK0003_CAPTURE_EVIDENCE === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: hostedBaseUrl ?? "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: hostedBaseUrl ? undefined : {
    command: captureEvidence
      ? "npm run start -- --hostname 127.0.0.1"
      : "npm run dev -- --hostname 127.0.0.1",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: captureEvidence ? false : !process.env.CI,
    env: {
      ...process.env,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "local-e2e-placeholder",
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "local-e2e-placeholder",
    },
  },
});

import { defineConfig, devices } from "@playwright/test";

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

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
    command: "npm run build && npm run start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      APP_URL: process.env.APP_URL ?? "http://127.0.0.1:3000",
      PORT: process.env.PORT ?? "3000",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://local:local@127.0.0.1:1/postgres",
      SUPABASE_URL: process.env.SUPABASE_URL ?? "https://task0007.supabase.test",
      SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_e2e_placeholder",
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY ?? "sb_secret_e2e_placeholder",
      DEMO_SESSION_SIGNING_SECRET: process.env.DEMO_SESSION_SIGNING_SECRET ?? "task-0007-e2e-signing-secret-at-least-32-characters",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "https://task0007.supabase.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_e2e_placeholder",
    },
  },
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/headers", () => ({ cookies }));

import { createServerSupabaseClient } from "./server";

const runtimeEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "paypal-client-id",
  DATABASE_URL: "postgresql://example:example@localhost:5432/postgres",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  SUPABASE_SEND_EMAIL_HOOK_SECRET: "v1,whsec_example",
  DEMO_SESSION_SIGNING_SECRET: "a-demo-session-secret-with-32-characters",
  PAYPAL_CLIENT_SECRET: "paypal-client-secret",
  PAYPAL_WEBHOOK_ID: "paypal-webhook-id",
  PAYPAL_ENVIRONMENT: "sandbox",
  RESEND_API_KEY: "re_example",
  EMAIL_FROM_ADDRESS: "AI Service Demo <demo@example.test>",
  APP_URL: "http://127.0.0.1:3000",
} as const;

describe("createServerSupabaseClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    Object.entries(runtimeEnvironment).forEach(([name, value]) => vi.stubEnv(name, value));
    cookies.mockResolvedValue({ getAll: vi.fn(), set: vi.fn() });
    createServerClient.mockReturnValue({ auth: {} });
  });

  it("uses secure production cookie options and leaves refresh writes to the proxy", async () => {
    await createServerSupabaseClient();

    const options = createServerClient.mock.calls[0]?.[2];

    expect(options.cookieOptions).toMatchObject({ sameSite: "lax", secure: true });
    expect(options.cookies.setAll).toBeUndefined();
  });
});

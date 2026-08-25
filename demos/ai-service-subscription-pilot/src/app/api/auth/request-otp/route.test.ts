import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, requestOtp } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn(() => ({ value: "signed-demo-session" })) },
  requestOtp: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@/server/auth/service", () => ({ requestOtp }));

import { POST } from "./route";

describe("POST /api/auth/request-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_example");
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "paypal-client-id");
    vi.stubEnv("DATABASE_URL", "postgresql://example:example@localhost:5432/postgres");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_example");
    vi.stubEnv("SUPABASE_SEND_EMAIL_HOOK_SECRET", "v1,whsec_example");
    vi.stubEnv("DEMO_SESSION_SIGNING_SECRET", "a-demo-session-secret-with-32-characters");
    vi.stubEnv("PAYPAL_CLIENT_SECRET", "paypal-client-secret");
    vi.stubEnv("PAYPAL_MERCHANT_ID", "MERCHANT123");
    vi.stubEnv("PAYPAL_WEBHOOK_ID", "paypal-webhook-id");
    vi.stubEnv("PAYPAL_ENVIRONMENT", "sandbox");
    vi.stubEnv("RESEND_API_KEY", "re_example");
    vi.stubEnv("EMAIL_FROM_ADDRESS", "AI Service Demo <demo@example.test>");
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
  });

  it("returns the same generic 202 response when the provider request fails", async () => {
    requestOtp.mockRejectedValueOnce(new Error("provider unavailable"));
    const response = await POST(new Request("http://example.test/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: "11111111-1111-4111-8111-111111111111", identityRoute: "persistent", email: "person@example.com" }),
    }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ accepted: true });
  });
});

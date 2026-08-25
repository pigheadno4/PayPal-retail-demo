import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeVerifiedIdentity, createRouteHandlerSupabaseClient, cookieStore, applyToResponse, verifyOtp } = vi.hoisted(() => ({
  completeVerifiedIdentity: vi.fn(),
  createRouteHandlerSupabaseClient: vi.fn(),
  cookieStore: { get: vi.fn(() => ({ value: "signed-demo-session" })) },
  applyToResponse: vi.fn((response: Response) => {
    response.headers.append("Set-Cookie", "sb-session=redacted; Path=/; HttpOnly; SameSite=Lax");
    return response;
  }),
  verifyOtp: vi.fn(async () => ({ data: { user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" } }, error: null })),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock("@/lib/supabase/server", () => ({ createRouteHandlerSupabaseClient }));
vi.mock("@/server/auth/service", () => ({ completeVerifiedIdentity }));

import { POST } from "./route";

const review = {
  intentId: "11111111-1111-4111-8111-111111111111", quoteId: "22222222-2222-4222-8222-222222222222", tier: "go", cadence: "monthly",
  base: { currency: "USD", cents: 1000 }, promotion: { currency: "USD", cents: -500 }, taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055, tax: { currency: "USD", cents: 53 }, dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2027-07-15T19:15:00.000Z", renewsAt: "2027-08-15T19:00:00.000Z", allowanceResetsAt: "2027-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles", pricingVersion: "go-monthly-intro-v1", taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

describe("POST /api/auth/verify-otp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createRouteHandlerSupabaseClient.mockResolvedValue({ client: { auth: { verifyOtp } }, applyToResponse });
    completeVerifiedIdentity.mockImplementation(async (_input, _cookie, _secret, dependencies) => {
      const verified = await dependencies.verifyEmailOtp("person@example.com", "385104");
      expect(verified).toEqual({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
      return review;
    });
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

  it("returns the owned review with the Supabase verification session cookie", async () => {
    const response = await POST(new Request("http://example.test/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intentId: review.intentId, identityRoute: "persistent", email: "person@example.com", token: "385104" }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("sb-session=redacted");
    expect(applyToResponse).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual(review);
  });
});

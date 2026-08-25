import { describe, expect, it } from "vitest";

import { parseRuntimeEnv } from "./env";

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "paypal-client-id",
  DATABASE_URL: "postgresql://example:example@localhost:5432/postgres",
  SUPABASE_SECRET_KEY: "sb_secret_example",
  SUPABASE_SEND_EMAIL_HOOK_SECRET: "v1,whsec_example",
  DEMO_SESSION_SIGNING_SECRET: "a-demo-session-secret-with-32-characters",
  PAYPAL_CLIENT_SECRET: "paypal-client-secret",
  PAYPAL_MERCHANT_ID: "MERCHANT123",
  PAYPAL_WEBHOOK_ID: "paypal-webhook-id",
  PAYPAL_ENVIRONMENT: "sandbox",
  RESEND_API_KEY: "re_example",
  EMAIL_FROM_ADDRESS: "AI Service Demo <demo@example.test>",
  APP_URL: "http://127.0.0.1:3000",
} as const;

describe("parseRuntimeEnv", () => {
  it("rejects provider secrets exposed through a NEXT_PUBLIC variable", () => {
    expect(() =>
      parseRuntimeEnv({
        ...validEnvironment,
        NEXT_PUBLIC_PAYPAL_CLIENT_SECRET: "must-not-ship",
      }),
    ).toThrow(/NEXT_PUBLIC_PAYPAL_CLIENT_SECRET/);
  });

  it.each([
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_RESEND_API_KEY",
    "NEXT_PUBLIC_INTERNAL_ACCESS_TOKEN",
  ])("rejects every non-allowlisted browser environment variable: %s", (secretName) => {
    expect(() =>
      parseRuntimeEnv({
        ...validEnvironment,
        [secretName]: "must-not-ship",
      }),
    ).toThrow(new RegExp(secretName));
  });

  it("reports required server-owned settings instead of accepting an empty environment", () => {
    expect(() => parseRuntimeEnv({})).toThrow(/DATABASE_URL/);
  });

  it("returns a typed configuration for a complete valid environment", () => {
    expect(parseRuntimeEnv(validEnvironment)).toMatchObject({
      paypalEnvironment: "sandbox",
      paypalMerchantId: "MERCHANT123",
      appUrl: "http://127.0.0.1:3000",
      public: {
        supabaseUrl: "https://example.supabase.co",
        paypalClientId: "paypal-client-id",
      },
    });
  });
});

import { describe, expect, it } from "vitest";

import { parseServerEnv, type RawServerEnv } from "../src/config/env.js";

const validEnv: RawServerEnv = {
  PORT: "4000",
  APP_BASE_URL: "http://localhost:5173",
  ADMIN_PASSCODE: "local-admin-passcode",
  SUPABASE_URL: "https://demo.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
  PAYPAL_ENVIRONMENT: "sandbox",
  PAYPAL_CLIENT_ID: "paypal-client-id",
  PAYPAL_CLIENT_SECRET: "paypal-client-secret",
  PAYPAL_WEBHOOK_ID: "paypal-webhook-id",
  PAYPAL_BN_CODE: "",
  PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY: "US",
  PUBLIC_HTTPS_ORIGIN: "",
  PAYPAL_APPLE_PAY_DOMAIN: "",
  PAYPAL_GOOGLE_PAY_MERCHANT_ID: "",
};

describe("server env validation", () => {
  it("parses required server env vars and normalizes optional blanks", () => {
    expect(parseServerEnv(validEnv)).toEqual({
      port: 4000,
      appBaseUrl: "http://localhost:5173",
      adminPasscode: "local-admin-passcode",
      supabaseUrl: "https://demo.supabase.co",
      supabaseServiceRoleKey: "service-role-value",
      paypalEnvironment: "sandbox",
      paypalClientId: "paypal-client-id",
      paypalClientSecret: "paypal-client-secret",
      paypalWebhookId: "paypal-webhook-id",
      paypalBnCode: null,
      paypalDefaultSandboxTestBuyerCountry: "US",
      publicHttpsOrigin: null,
      paypalApplePayDomain: null,
      paypalGooglePayMerchantId: null,
    });
  });

  it("defaults the port and rejects invalid PayPal environments", () => {
    expect(parseServerEnv({ ...validEnv, PORT: undefined }).port).toBe(3000);

    expect(() =>
      parseServerEnv({ ...validEnv, PAYPAL_ENVIRONMENT: "demo" }),
    ).toThrow("PAYPAL_ENVIRONMENT must be sandbox or production");
  });

  it("rejects missing required vars without echoing secret values", () => {
    const invalidEnv = {
      ...validEnv,
      SUPABASE_URL: "",
      PAYPAL_CLIENT_SECRET: "",
    };

    expect(() => parseServerEnv(invalidEnv)).toThrow(
      "Missing required server environment variables: SUPABASE_URL, PAYPAL_CLIENT_SECRET",
    );

    try {
      parseServerEnv({ ...validEnv, ADMIN_PASSCODE: "" });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("ADMIN_PASSCODE");
      expect((error as Error).message).not.toContain("service-role-value");
      expect((error as Error).message).not.toContain("paypal-client-secret");
    }
  });
});

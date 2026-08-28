import { describe, expect, it } from "vitest";

import {
  parseBaseServerConfig,
  requireEmailHookConfig,
  requirePayPalConfig,
} from "./env";
import {
  ConfigurationError,
  IntegrationNotConfiguredError,
} from "../http/errors";

const testEnvironment = (
  values: Record<string, string> = {},
): NodeJS.ProcessEnv => ({ NODE_ENV: "test", ...values });

const completeBaseEnvironment = (): NodeJS.ProcessEnv => testEnvironment({
  APP_URL: "https://demo.example.test",
  PORT: "3000",
  DATABASE_URL: "postgresql://database.example.test/demo",
  SUPABASE_URL: "https://project.example.test",
  SUPABASE_PUBLISHABLE_KEY: "public-test-value",
  SUPABASE_SECRET_KEY: "server-secret-value",
  DEMO_SESSION_SIGNING_SECRET: "a-demo-session-secret-with-32-characters",
});

describe("parseBaseServerConfig", () => {
  it("returns the complete base configuration without requiring provider capabilities", () => {
    expect(parseBaseServerConfig(completeBaseEnvironment())).toEqual({
      appUrl: "https://demo.example.test",
      port: 3000,
      databaseUrl: "postgresql://database.example.test/demo",
      supabaseUrl: "https://project.example.test",
      supabasePublishableKey: "public-test-value",
      supabaseSecretKey: "server-secret-value",
      demoSessionSigningSecret: "a-demo-session-secret-with-32-characters",
    });
  });

  it.each([
    "APP_URL",
    "PORT",
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "DEMO_SESSION_SIGNING_SECRET",
  ])("rejects a missing %s without exposing the key name", (key) => {
    const environment = completeBaseEnvironment();
    delete environment[key];

    expect(() => parseBaseServerConfig(environment)).toThrowError(
      new ConfigurationError(),
    );
    expect(() => parseBaseServerConfig(environment)).not.toThrow(key);
  });

  it.each([
    ["APP_URL", "not-a-url"],
    ["DATABASE_URL", "not-a-database-url"],
    ["SUPABASE_URL", "not-a-url"],
    ["PORT", "0"],
    ["PORT", "65536"],
    ["PORT", "30.5"],
    ["DEMO_SESSION_SIGNING_SECRET", "too-short"],
  ])("rejects invalid %s values with sanitized metadata", (key, value) => {
    const environment = completeBaseEnvironment();
    environment[key] = value;

    expect(() => parseBaseServerConfig(environment)).toThrowError(
      new ConfigurationError(),
    );

    try {
      parseBaseServerConfig(environment);
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain(key);
      expect(JSON.stringify(error)).not.toContain(value);
    }
  });
});

describe("requirePayPalConfig", () => {
  it("rejects an absent capability only when it is requested", () => {
    expect(() => requirePayPalConfig(testEnvironment())).toThrowError(
      new IntegrationNotConfiguredError(),
    );
  });

  it("rejects a partial capability without exposing its key or value", () => {
    const environment = testEnvironment({
      PAYPAL_CLIENT_ID: "sensitive-client-id",
    });

    expect(() => requirePayPalConfig(environment)).toThrowError(
      new IntegrationNotConfiguredError(),
    );

    try {
      requirePayPalConfig(environment);
    } catch (error) {
      expect(JSON.stringify(error)).not.toContain("PAYPAL_CLIENT_ID");
      expect(JSON.stringify(error)).not.toContain("sensitive-client-id");
    }
  });

  it("returns a complete sandbox capability", () => {
    expect(
      requirePayPalConfig(testEnvironment({
        PAYPAL_CLIENT_ID: "client-id",
        PAYPAL_CLIENT_SECRET: "client-secret",
        PAYPAL_MERCHANT_ID: "merchant-id",
        PAYPAL_WEBHOOK_ID: "webhook-id",
        PAYPAL_ENVIRONMENT: "sandbox",
      })),
    ).toEqual({
      clientId: "client-id",
      clientSecret: "client-secret",
      merchantId: "merchant-id",
      webhookId: "webhook-id",
      environment: "sandbox",
    });
  });

  it("rejects an unsupported PayPal environment", () => {
    expect(() =>
      requirePayPalConfig(testEnvironment({
        PAYPAL_CLIENT_ID: "client-id",
        PAYPAL_CLIENT_SECRET: "client-secret",
        PAYPAL_MERCHANT_ID: "merchant-id",
        PAYPAL_WEBHOOK_ID: "webhook-id",
        PAYPAL_ENVIRONMENT: "staging",
      })),
    ).toThrowError(new IntegrationNotConfiguredError());
  });
});

describe("requireEmailHookConfig", () => {
  it("rejects absent and partial email capabilities only when requested", () => {
    expect(() => requireEmailHookConfig(testEnvironment())).toThrowError(
      new IntegrationNotConfiguredError(),
    );
    expect(() =>
      requireEmailHookConfig(
        testEnvironment({ RESEND_API_KEY: "sensitive-resend-key" }),
      ),
    ).toThrowError(new IntegrationNotConfiguredError());
  });

  it("returns a complete email capability", () => {
    expect(
      requireEmailHookConfig(testEnvironment({
        SUPABASE_SEND_EMAIL_HOOK_SECRET: "hook-secret",
        RESEND_API_KEY: "resend-key",
        EMAIL_FROM_ADDRESS: "Demo <demo@example.test>",
      })),
    ).toEqual({
      sendEmailHookSecret: "hook-secret",
      resendApiKey: "resend-key",
      fromAddress: "Demo <demo@example.test>",
    });
  });
});

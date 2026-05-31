import { describe, expect, it } from "vitest";

import type { ServerEnv } from "../src/config/env.js";
import {
  buildSupabaseServerClientOptions,
  createSupabaseServerClient,
} from "../src/db/supabase.js";

const serverEnv: ServerEnv = {
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
};

describe("Supabase server client", () => {
  it("uses the private app schema and disables browser session persistence", () => {
    expect(buildSupabaseServerClientOptions()).toEqual({
      db: {
        schema: "app",
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "X-Client-Info": "paypal-retail-demo-server",
        },
      },
    });
  });

  it("creates the server client with the Supabase URL and service role key only on the server", () => {
    const fakeClient = { kind: "fake-supabase-client" };
    const calls: unknown[] = [];

    const client = createSupabaseServerClient(serverEnv, (url, key, options) => {
      calls.push({ url, key, options });
      return fakeClient;
    });

    expect(client).toBe(fakeClient);
    expect(calls).toEqual([
      {
        url: "https://demo.supabase.co",
        key: "service-role-value",
        options: buildSupabaseServerClientOptions(),
      },
    ]);
  });
});

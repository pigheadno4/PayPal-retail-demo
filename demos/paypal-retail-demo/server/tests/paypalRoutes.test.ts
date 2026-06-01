import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  PayPalClientTokenGateway,
  PayPalClientTokenGatewayInput,
} from "../src/paypal/client.js";
import { requestApp } from "./helpers/requestApp.js";

describe("PayPal routes", () => {
  it("returns browser-safe SDK config for the active market", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(
      app,
      "GET",
      "/api/paypal/sdk-config?market=gb&page_type=checkout&flow=vaulting&method=card",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        client_id: "PAYPAL_PUBLIC_CLIENT_ID",
        environment: "sandbox",
        sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
        currency_code: "GBP",
        locale: "en-GB",
        buyer_country: "GB",
        paylater_buyer_country: "GB",
        sandbox_test_buyer_country: "GB",
        components: [
          "applepay-payments",
          "card-fields",
          "googlepay-payments",
          "paypal-messages",
          "paypal-payments",
          "venmo-payments",
        ],
        page_type: "checkout",
        provider_key:
          "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:GB:GBP:en-GB:GB:GB:GB:1:applepay-payments,card-fields,googlepay-payments,paypal-messages,paypal-payments,venmo-payments",
        needs_client_token: true,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(JSON.stringify(response.json)).not.toContain("PAYPAL_SECRET");
    expect(JSON.stringify(response.json)).not.toContain("access_token");
    expect(gateway.calls).toEqual([]);
  });

  it("validates unsupported SDK config query values before building config", async () => {
    const app = createPayPalApp(createClientTokenGateway());

    const response = await requestApp(
      app,
      "GET",
      "/api/paypal/sdk-config?market=ca&page_type=checkout&flow=standard&method=paypal",
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_PAYPAL_SDK_CONFIG_REQUEST",
        message:
          "A supported market, page type, flow, and payment method are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("rejects guest client-token requests before calling PayPal", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(app, "POST", "/api/paypal/client-token", {
      json: {
        flow: "vaulting",
        method: "card",
      },
    });

    expect(response.status).toBe(403);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "GUEST_VAULTING_NOT_ALLOWED",
        message: "Sign in to save a payment method.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(gateway.calls).toEqual([]);
  });

  it("generates a browser-safe client token for logged-in vaulting flows", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(app, "POST", "/api/paypal/client-token", {
      headers: {
        authorization: "Bearer buyer-token",
      },
      json: {
        flow: "vaulting",
        method: "paypal",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        client_token: "browser-safe-client-token",
        expires_in_seconds: 900,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(JSON.stringify(response.json)).not.toContain("access_token");
    expect(JSON.stringify(response.json)).not.toContain("PAYPAL_SECRET");
    expect(gateway.calls).toEqual([
      {
        domains: ["https://checkout.example.test"],
        targetCustomerId: null,
      },
    ]);
  });
});

function createPayPalApp(gateway: FakeClientTokenGateway) {
  return createApp({
    paypal: {
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      defaultClientTokenDomains: ["https://checkout.example.test"],
      clientTokenGateway: gateway,
      authVerifier: createAuthVerifier(),
    },
  });
}

function createAuthVerifier(): SupabaseAuthVerifier {
  return {
    auth: {
      async getUser(token) {
        if (token !== "buyer-token") {
          return {
            data: { user: null },
            error: { message: "invalid token" },
          };
        }

        return {
          data: {
            user: {
              id: "user_123",
              email: "buyer@example.test",
            },
          },
          error: null,
        };
      },
    },
  };
}

interface FakeClientTokenGateway extends PayPalClientTokenGateway {
  readonly calls: PayPalClientTokenGatewayInput[];
}

function createClientTokenGateway(): FakeClientTokenGateway {
  const calls: PayPalClientTokenGatewayInput[] = [];

  return {
    calls,
    async generateClientToken(input) {
      calls.push(input);
      return {
        clientToken: "browser-safe-client-token",
        expiresInSeconds: 900,
      };
    },
  };
}

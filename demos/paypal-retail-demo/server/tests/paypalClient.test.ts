import { describe, expect, it } from "vitest";

import { createPayPalClientTokenGateway } from "../src/paypal/client.js";

describe("PayPal client token gateway", () => {
  it("requests a browser-safe client token with domain-bound OAuth form fields", async () => {
    const fetchCalls: FetchCall[] = [];
    const gateway = createPayPalClientTokenGateway({
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      fetch: createFetch(async (url, init) => {
        fetchCalls.push({ url, init });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "browser-safe-client-token",
            expires_in: 900,
          }),
        };
      }),
    });

    const response = await gateway.generateClientToken({
      domains: ["https://checkout.example.test", "https://admin.example.test"],
      targetCustomerId: "paypal_customer_123",
    });

    expect(response).toEqual({
      clientToken: "browser-safe-client-token",
      expiresInSeconds: 900,
    });
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]?.url).toBe(
      "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    );
    expect(fetchCalls[0]?.init.method).toBe("POST");
    expect(fetchCalls[0]?.init.headers).toEqual({
      authorization: `Basic ${Buffer.from(
        "PAYPAL_PUBLIC_CLIENT_ID:PAYPAL_SECRET_VALUE",
      ).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    });

    const body = fetchCalls[0]?.init.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).get("grant_type")).toBe(
      "client_credentials",
    );
    expect((body as URLSearchParams).get("response_type")).toBe(
      "client_token",
    );
    expect((body as URLSearchParams).get("domains[]")).toBe(
      "https://checkout.example.test,https://admin.example.test",
    );
    expect((body as URLSearchParams).get("target_customer_id")).toBe(
      "paypal_customer_123",
    );
  });

  it("throws a sanitized error for failed PayPal token responses", async () => {
    const gateway = createPayPalClientTokenGateway({
      environment: "production",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      fetch: createFetch(async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          name: "invalid_domain",
          message: "domain rejected",
          access_token: "should-not-leak",
        }),
      })),
    });

    await expect(
      gateway.generateClientToken({
        domains: ["http://localhost:5173"],
        targetCustomerId: null,
      }),
    ).rejects.toThrow("PayPal client token request failed: invalid_domain");

    try {
      await gateway.generateClientToken({
        domains: ["http://localhost:5173"],
        targetCustomerId: null,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).not.toContain("PAYPAL_SECRET_VALUE");
      expect((error as Error).message).not.toContain("should-not-leak");
    }
  });
});

interface FetchCall {
  readonly url: string;
  readonly init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: URLSearchParams;
  };
}

interface FakeFetchResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly json: () => Promise<unknown>;
}

function createFetch(
  handler: (url: string, init: FetchCall["init"]) => Promise<FakeFetchResponse>,
) {
  return async (url: string | URL, init?: RequestInit): Promise<Response> => {
    return (await handler(String(url), {
      method: String(init?.method ?? "GET"),
      headers: init?.headers as Record<string, string>,
      body: init?.body as URLSearchParams,
    })) as Response;
  };
}

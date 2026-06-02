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
    expect((body as URLSearchParams).get("response_type")).toBe("client_token");
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

describe("PayPal create order gateway", () => {
  it("uses OAuth access token and PayPal-Request-Id to create an order", async () => {
    const fetchCalls: FetchCall[] = [];
    const gateway = createPayPalClientTokenGateway({
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      bnCode: "DEMO_BN_CODE",
      fetch: createFetch(async (url, init) => {
        fetchCalls.push({ url, init });
        if (url.endsWith("/v1/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: "server-access-token",
              expires_in: 31668,
            }),
          };
        }

        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: "PAYPAL_ORDER_123",
            status: "CREATED",
            links: [
              {
                rel: "payer-action",
                href: "https://www.sandbox.paypal.com/checkoutnow?token=123",
              },
            ],
          }),
        };
      }),
    });

    const response = await gateway.createOrder({
      paypalRequestId: "request-id-123",
      payload: {
        intent: "CAPTURE",
        purchase_units: [
          {
            invoice_id: "DO-20260601-000001",
            items: [
              {
                name: "Labubu",
                quantity: "1",
                category: "PHYSICAL_GOODS",
                unit_amount: {
                  currency_code: "USD",
                  value: "10.00",
                },
              },
            ],
            amount: {
              currency_code: "USD",
              value: "10.00",
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "10.00",
                },
                tax_total: {
                  currency_code: "USD",
                  value: "0.00",
                },
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      },
    });

    expect(response).toEqual({
      paypalOrderId: "PAYPAL_ORDER_123",
      status: "CREATED",
      approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=123",
      rawResponse: {
        id: "PAYPAL_ORDER_123",
        status: "CREATED",
        links: [
          {
            rel: "payer-action",
            href: "https://www.sandbox.paypal.com/checkoutnow?token=123",
          },
        ],
      },
    });
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[1]?.url).toBe(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders",
    );
    expect(fetchCalls[1]?.init.headers).toMatchObject({
      authorization: "Bearer server-access-token",
      "content-type": "application/json",
      "paypal-request-id": "request-id-123",
      "paypal-partner-attribution-id": "DEMO_BN_CODE",
    });
    expect(fetchCalls[1]?.init.body).toBe(
      JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            invoice_id: "DO-20260601-000001",
            items: [
              {
                name: "Labubu",
                quantity: "1",
                category: "PHYSICAL_GOODS",
                unit_amount: {
                  currency_code: "USD",
                  value: "10.00",
                },
              },
            ],
            amount: {
              currency_code: "USD",
              value: "10.00",
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "10.00",
                },
                tax_total: {
                  currency_code: "USD",
                  value: "0.00",
                },
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "NO_SHIPPING",
            },
          },
        },
      }),
    );
  });

  it("throws sanitized errors for failed PayPal create order responses", async () => {
    const gateway = createPayPalClientTokenGateway({
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      fetch: createFetch(async (url) => {
        if (url.endsWith("/v1/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: "server-access-token",
              expires_in: 31668,
            }),
          };
        }
        return {
          ok: false,
          status: 422,
          json: async () => ({
            name: "UNPROCESSABLE_ENTITY",
            message: "bad payload",
            access_token: "should-not-leak",
          }),
        };
      }),
    });

    await expect(
      gateway.createOrder({
        paypalRequestId: "request-id-123",
        payload: {
          intent: "CAPTURE",
          purchase_units: [],
          payment_source: {
            paypal: {
              experience_context: {
                shipping_preference: "NO_SHIPPING",
              },
            },
          },
        },
      }),
    ).rejects.toThrow(
      "PayPal create order request failed: UNPROCESSABLE_ENTITY",
    );
  });
});

describe("PayPal capture order gateway", () => {
  it("uses OAuth access token and PayPal-Request-Id to capture an order", async () => {
    const fetchCalls: FetchCall[] = [];
    const gateway = createPayPalClientTokenGateway({
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      bnCode: "DEMO_BN_CODE",
      fetch: createFetch(async (url, init) => {
        fetchCalls.push({ url, init });
        if (url.endsWith("/v1/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: "server-access-token",
              expires_in: 31668,
            }),
          };
        }

        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: "PAYPAL_ORDER_123",
            status: "COMPLETED",
            purchase_units: [
              {
                payments: {
                  captures: [
                    {
                      id: "PAYPAL_CAPTURE_123",
                      status: "COMPLETED",
                      amount: {
                        currency_code: "USD",
                        value: "10.00",
                      },
                    },
                  ],
                },
              },
            ],
          }),
        };
      }),
    });

    const response = await gateway.captureOrder({
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalRequestId: "request-capture-123",
    });

    expect(response).toEqual({
      paypalOrderId: "PAYPAL_ORDER_123",
      status: "COMPLETED",
      captureId: "PAYPAL_CAPTURE_123",
      captureStatus: "COMPLETED",
      rawResponse: {
        id: "PAYPAL_ORDER_123",
        status: "COMPLETED",
        purchase_units: [
          {
            payments: {
              captures: [
                {
                  id: "PAYPAL_CAPTURE_123",
                  status: "COMPLETED",
                  amount: {
                    currency_code: "USD",
                    value: "10.00",
                  },
                },
              ],
            },
          },
        ],
      },
    });
    expect(fetchCalls).toHaveLength(2);
    expect(fetchCalls[1]?.url).toBe(
      "https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL_ORDER_123/capture",
    );
    expect(fetchCalls[1]?.init).toEqual({
      method: "POST",
      headers: {
        authorization: "Bearer server-access-token",
        "content-type": "application/json",
        "paypal-request-id": "request-capture-123",
        "paypal-partner-attribution-id": "DEMO_BN_CODE",
      },
      body: null,
    });
  });

  it("throws sanitized errors for failed PayPal capture responses", async () => {
    const gateway = createPayPalClientTokenGateway({
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      clientSecret: "PAYPAL_SECRET_VALUE",
      fetch: createFetch(async (url) => {
        if (url.endsWith("/v1/oauth2/token")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              access_token: "server-access-token",
              expires_in: 31668,
            }),
          };
        }
        return {
          ok: false,
          status: 422,
          json: async () => ({
            name: "UNPROCESSABLE_ENTITY",
            message: "bad capture",
            access_token: "should-not-leak",
          }),
        };
      }),
    });

    await expect(
      gateway.captureOrder({
        paypalOrderId: "PAYPAL_ORDER_123",
        paypalRequestId: "request-capture-123",
      }),
    ).rejects.toThrow(
      "PayPal capture order request failed: UNPROCESSABLE_ENTITY",
    );
  });
});

interface FetchCall {
  readonly url: string;
  readonly init: {
    readonly method: string;
    readonly headers: Record<string, string>;
    readonly body: BodyInit | null;
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
      body: (init?.body ?? null) as BodyInit | null,
    })) as Response;
  };
}

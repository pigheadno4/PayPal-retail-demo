import { describe, expect, it, vi } from "vitest";
import { HttpPayPalGateway } from "./http-gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";
import { buildInitialPayPalOrder } from "./payload.js";

describe("TASK-0012 initial-create safe diagnostics", () => {
  const input = { payload: buildInitialPayPalOrder({ intentId: "11111111-1111-4111-8111-111111111111", quoteId: "22222222-2222-4222-8222-222222222222", tier: "go", cadence: "monthly", base: {currency: "USD", cents: 1000}, promotion: {currency: "USD", cents: -500}, taxableSubtotal: {currency: "USD", cents: 500}, tax: {currency: "USD", cents: 53}, dueToday: {currency: "USD", cents: 553}, taxBasisPoints: 1055, expiresAt: "2026-10-07T00:00:00Z", renewsAt: "2026-11-07T00:00:00Z", allowanceResetsAt: "2026-11-07T00:00:00Z", timeZone: "America/Los_Angeles", pricingVersion: "fixture", taxVersion: "fixture" }), requestId: "private-request-canary", clientMetadataId: "1234567890abcdef1234567890abcdef" };
  it.each([
    ["oauth", [new Error("private-token-canary")], "oauth", "transport"],
    ["create transport", [new Response(JSON.stringify({ access_token: "private-token-canary" })), new Error("private-provider-canary")], "create_request", "transport"],
    ["HTTP rejection", [new Response(JSON.stringify({ access_token: "private-token-canary" })), new Response(JSON.stringify({ name: "PRIVATE-CANARY" }), { status: 422 })], "create_response", "http"],
    ["malformed JSON", [new Response(JSON.stringify({ access_token: "private-token-canary" })), new Response("private-canary")], "json_parse", "exception"],
    ["missing ID", [new Response(JSON.stringify({ access_token: "private-token-canary" })), new Response(JSON.stringify({ private: "private-canary" }))], "id_projection", "exception"],
  ] as const)("identifies %s without retry or private payload logs", async (_name, responses, stage, category) => {
    const request = vi.fn();
    for (const response of responses) {
      if (response instanceof Error) request.mockRejectedValueOnce(response);
      else request.mockResolvedValueOnce(response);
    }
    const diagnostic = vi.fn();
    const gateway = new HttpPayPalGateway({ clientId: "fixture", clientSecret: "private-secret-canary", environment: "sandbox", fetch: request, diagnostic });
    await expect(gateway.createOrder(input)).rejects.toThrow();
    expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ stage, outcome: "failure", category }));
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("private");
    expect(request).toHaveBeenCalledTimes(responses.length);
    for (const [record] of diagnostic.mock.calls) expect(Object.keys(record).every((key) => ["stage", "outcome", "category", "httpStatus"].includes(key))).toBe(true);
  });
});

describe("payment token removal", () => {
  function setup(status: number | Error) {
    const request = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "fixture-oauth" })));
    if (status instanceof Error) request.mockRejectedValueOnce(status);
    else request.mockResolvedValueOnce(new Response(null, { status }));
    return { request, gateway: new HttpPayPalGateway({ clientId: "fixture", clientSecret: "fixture", environment: "sandbox", fetch: request }) };
  }
  it("accepts an empty 204, uses DELETE and never parses JSON or sends a payment/idempotency request", async () => {
    const { gateway, request } = setup(204);
    expect(typeof gateway.deletePaymentToken).toBe("function");
    await gateway.deletePaymentToken({ paymentTokenId: "fixture/token" });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][0]).toBe("https://api-m.sandbox.paypal.com/v3/vault/payment-tokens/fixture%2Ftoken");
    expect(request.mock.calls[1][1]).toMatchObject({ method: "DELETE", cache: "no-store" });
    expect(request.mock.calls[1][1].headers).not.toHaveProperty("PayPal-Request-Id");
    expect(request.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each([400, 403])("classifies %i as rejection without retry", async (status) => {
    const { gateway, request } = setup(status);
    expect(typeof gateway.deletePaymentToken).toBe("function");
    await expect(gateway.deletePaymentToken({ paymentTokenId: "fixture" })).rejects.toBeInstanceOf(PayPalDefinitiveError);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it.each([200, 202, 404, 408, 429, 500, 503, new Error("private provider failure")])("keeps unconfirmed outcomes uncertain without retry: %s", async (status) => {
    const { gateway, request } = setup(status);
    expect(typeof gateway.deletePaymentToken).toBe("function");
    await expect(gateway.deletePaymentToken({ paymentTokenId: "fixture" })).rejects.toThrow("paypal_unavailable");
    expect(request).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from "vitest";
import { HttpPayPalGateway } from "./http-gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";

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

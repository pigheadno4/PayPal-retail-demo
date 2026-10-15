import { describe, expect, it, vi } from "vitest";
import { HttpPayPalGateway } from "./http-gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";
import { buildInitialPayPalOrder } from "./payload.js";

describe("captured-order operator read", () => {
  it("requests payment_source with one authenticated GET and no financial mutation", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(new Response('{"id":"saved/order"}'));
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request });
    expect(typeof gateway.readCapturedOrder).toBe("function");
    expect(await gateway.readCapturedOrder("saved/order")).toEqual({ id: "saved/order" });
    expect(request.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["https://api-m.sandbox.paypal.com/v1/oauth2/token", "POST"],
      ["https://api-m.sandbox.paypal.com/v2/checkout/orders/saved%2Forder?fields=payment_source", "GET"],
    ]);
    expect(request.mock.calls[1][1]).toMatchObject({ cache: "no-store", headers: { Authorization: "Bearer synthetic" }, signal: expect.any(AbortSignal) });
    expect(request.mock.calls[1][1].signal).toBe(request.mock.calls[0][1].signal);
  });
  it.each([400, 403, 404, 422, 500, 503])("fails closed without a retry for HTTP %i", async (status) => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(new Response('private', { status }));
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request });
    await expect(gateway.readCapturedOrder("order")).rejects.toThrow("paypal_unavailable");
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("TASK-0012 initial-create safe diagnostics", () => {
  const input = { payload: buildInitialPayPalOrder({ intentId: "11111111-1111-4111-8111-111111111111", quoteId: "22222222-2222-4222-8222-222222222222", tier: "go", cadence: "monthly", base: {currency: "USD", cents: 1000}, promotion: {currency: "USD", cents: -500}, taxableSubtotal: {currency: "USD", cents: 500}, tax: {currency: "USD", cents: 53}, dueToday: {currency: "USD", cents: 553}, taxBasisPoints: 1055, expiresAt: "2026-10-07T00:00:00Z", renewsAt: "2026-11-07T00:00:00Z", allowanceResetsAt: "2026-11-07T00:00:00Z", timeZone: "America/Los_Angeles", pricingVersion: "fixture", taxVersion: "fixture" }, "https://checkout.example.test"), requestId: "private-request-canary", clientMetadataId: "1234567890abcdef1234567890abcdef" };
  it.each([
    [{ name: "private-canary", debug_id: "private-canary", message: "private-canary", details: [{ issue: "RETURN_URL_REQUIRED", field: "private-canary", description: "private-canary" }, { issue: "CANCEL_URL_REQUIRED", value: "private-canary" }, { issue: "RETURN_URL_REQUIRED" }] }, ["RETURN_URL_REQUIRED", "CANCEL_URL_REQUIRED"], false, "recognized"],
    [{ details: [{ issue: "AMOUNT_MISMATCH" }] }, ["AMOUNT_MISMATCH"], false, "recognized"],
    [{ name: "private-canary", debug_id: "private-canary", message: "private-canary", details: [{ issue: "BILLING_ITEM_AMOUNT_MISMATCH", value: "private-canary", description: "private-canary" }, { issue: "BILLING_ITEM_AMOUNT_MISMATCH" }] }, ["BILLING_ITEM_AMOUNT_MISMATCH"], false, "recognized"],
    [{ details: [{ issue: "INSTRUMENT_DECLINED" }] }, ["INSTRUMENT_DECLINED"], true, "recognized"],
    [{ details: [{ issue: "NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE" }] }, ["NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE"], false, "recognized"],
    [{ details: [{ issue: "INSTRUMENT_DECLINED" }, { issue: "AMOUNT_MISMATCH" }, { issue: "AMOUNT_MISMATCH" }, { issue: "private-canary\nSECRET" }, { issue: 2 }] }, ["INSTRUMENT_DECLINED", "AMOUNT_MISMATCH", "unknown_issue"], false, "unrecognized_issue"],
    [{ details: [{ issue: "AMOUNT_MISMATCH" }, null] }, ["AMOUNT_MISMATCH", "unknown_issue"], false, "unrecognized_issue"],
    [{ details: [{ issue: "private-canary" }] }, ["unknown_issue"], false, "unrecognized_issue"],
    [{ details: [] }, ["unknown_issue"], false, "details_missing"],
    [{ details: "private-canary" }, ["unknown_issue"], false, "details_missing"],
    [{ details: [null, {}, { issue: ["AMOUNT_MISMATCH"] }, { issue: "" }, { issue: "   " }] }, ["unknown_issue"], false, "details_missing"],
    [{}, ["unknown_issue"], false, "details_missing"],
    [null, ["unknown_issue"], false, "details_missing"],
    [42, ["unknown_issue"], false, "details_missing"],
    ["malformed-private-canary", ["unknown_issue"], false, "json_parse_failed"],
  ] as const)("logs fixed rejection enums once without changing payment classification %#", async (body, issues, definitive, issueDiagnostic) => {
    const response = new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 422 });
    const json = vi.spyOn(response, "json");
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(response);
    const diagnostic = vi.fn();
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic });
    if (definitive) await expect(gateway.createOrder(input)).rejects.toBeInstanceOf(PayPalDefinitiveError);
    else await expect(gateway.createOrder(input)).rejects.toThrow("paypal_unavailable");
    const records = diagnostic.mock.calls.map(([record]) => record).filter(record => record.stage === "create_response");
    expect(records).toEqual([{ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues, issueDiagnostic }]);
    expect(json).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1].body).toBe(JSON.stringify(input.payload));
    expect(request.mock.calls[1]).toEqual(["https://api-m.sandbox.paypal.com/v2/checkout/orders", { method: "POST", headers: { Authorization: "Bearer synthetic", "Content-Type": "application/json", "PayPal-Request-Id": input.requestId, "PayPal-Client-Metadata-Id": input.clientMetadataId, Prefer: "return=representation" }, body: JSON.stringify(input.payload), cache: "no-store" }]);
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("private-canary");
  });
  it("throwing diagnostic sink cannot change rejection policy", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(new Response('{"details":[{"issue":"AMOUNT_MISMATCH"}]}', { status: 422 }));
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic: () => { throw new Error("private-sink-canary"); } });
    await expect(gateway.createOrder(input)).rejects.toThrow("paypal_unavailable");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("throwing sink preserves billing mismatch uncertainty without retry", async () => {
    const response = new Response('{"details":[{"issue":"BILLING_ITEM_AMOUNT_MISMATCH"}]}', { status: 422 });
    const json = vi.spyOn(response, "json");
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(response);
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic: () => { throw new Error("private-sink-canary"); } });
    await expect(gateway.createOrder(input)).rejects.toThrow("paypal_unavailable");
    expect(json).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("throwing sink preserves vault URL uncertainty with one response read and no retry", async () => {
    const response = new Response('{"details":[{"issue":"RETURN_URL_REQUIRED"},{"issue":"CANCEL_URL_REQUIRED"}]}', { status: 422 });
    const json = vi.spyOn(response, "json");
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(response);
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic: () => { throw new Error("private-sink-canary"); } });
    await expect(gateway.createOrder(input)).rejects.toThrow("paypal_unavailable");
    expect(json).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[1][1].body).toBe(JSON.stringify(input.payload));
  });
  it.each(["NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE", "MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE", "MISMATCHED_VAULT_SETUP_TOKEN_TO_PAYMENT_SOURCE", "INVALID_VAULT_ID", "NOT_ENABLED_FOR_PAYMENT_SOURCE", "AGREEMENT_ALREADY_CANCELLED", "BILLING_AGREEMENT_NOT_FOUND", "DUPLICATE_INVOICE_ID", "PAYER_ACCOUNT_LOCKED_OR_CLOSED", "PAYER_ACCOUNT_RESTRICTED", "PAYER_CANNOT_PAY"])("new observational label %s never changes create or capture policy", async issue => {
    for (const capture of [false, true]) {
      const diagnostic = vi.fn();
      const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(new Response(JSON.stringify({ details: [{ issue }, { issue: "INSTRUMENT_DECLINED" }] }), { status: 422 }));
      const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic });
      const operation = capture ? gateway.captureOrder({ orderId: "synthetic", requestId: "synthetic" }) : gateway.createOrder(input);
      await expect(operation).rejects.toThrow("paypal_unavailable");
      expect(request).toHaveBeenCalledTimes(2);
      if (capture) expect(diagnostic).not.toHaveBeenCalled();
      else expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({ issues: [issue, "INSTRUMENT_DECLINED"], issueDiagnostic: "recognized" }));
    }
  });
  it.each(["success", "definitive", "unknown", "malformed"])("throwing sink preserves %s result without retry", async outcome => {
    const response = outcome === "success" ? new Response('{"id":"synthetic-order"}')
      : outcome === "malformed" ? new Response("private-canary", { status: 422 })
      : new Response(JSON.stringify({ details: [{ issue: outcome === "definitive" ? "INSTRUMENT_DECLINED" : "private-canary" }] }), { status: 422 });
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(response);
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic: () => { throw new Error("private-sink-canary"); } });
    const operation = gateway.createOrder(input);
    if (outcome === "success") await expect(operation).resolves.toEqual({ orderId: "synthetic-order" });
    else if (outcome === "definitive") await expect(operation).rejects.toBeInstanceOf(PayPalDefinitiveError);
    else await expect(operation).rejects.toThrow("paypal_unavailable");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("retains only the fixed issue and reason from a raw rejection full of private canaries", async () => {
    const response = new Response(JSON.stringify({ name: "private-name", message: "private-message", debug_id: "private-id", links: [{ href: "https://private-url.invalid" }], details: [{ issue: "INVALID_VAULT_ID", field: "private-field", value: "private-value", description: "private-description" }] }), { status: 422 });
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"private-oauth"}')).mockResolvedValueOnce(response);
    const diagnostic = vi.fn();
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "private-secret", environment: "sandbox", fetch: request, diagnostic });
    await expect(gateway.createOrder(input)).rejects.toThrow("paypal_unavailable");
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("private");
    expect(diagnostic).toHaveBeenCalledWith({ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues: ["INVALID_VAULT_ID"], issueDiagnostic: "recognized" });
  });
  it("success and unrelated diagnostics never acquire rejection enrichment", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(new Response('{"id":"synthetic"}'));
    const diagnostic = vi.fn();
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic });
    await expect(gateway.createOrder(input)).resolves.toEqual({ orderId: "synthetic" });
    for (const [record] of diagnostic.mock.calls) {
      expect(record).not.toHaveProperty("issues");
      expect(record).not.toHaveProperty("issueDiagnostic");
    }
  });
  it.each(["INSTRUMENT_DECLINED", "AMOUNT_MISMATCH"])("capture preserves %s policy without initial-create diagnostics", async (issue) => {
    const response = new Response(JSON.stringify({ details: [{ issue }] }), { status: 422 });
    const json = vi.spyOn(response, "json");
    const request = vi.fn().mockResolvedValueOnce(new Response('{"access_token":"synthetic"}')).mockResolvedValueOnce(response);
    const diagnostic = vi.fn();
    const gateway = new HttpPayPalGateway({ clientId: "synthetic", clientSecret: "synthetic", environment: "sandbox", fetch: request, diagnostic });
    const operation = gateway.captureOrder({ orderId: "synthetic", requestId: "synthetic" });
    if (issue === "INSTRUMENT_DECLINED") await expect(operation).rejects.toBeInstanceOf(PayPalDefinitiveError);
    else await expect(operation).rejects.toThrow("paypal_unavailable");
    expect(json).toHaveBeenCalledOnce(); expect(request).toHaveBeenCalledTimes(2);
    expect(diagnostic).not.toHaveBeenCalled();
  });
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
    for (const [record] of diagnostic.mock.calls) expect(Object.keys(record).every((key) => ["stage", "outcome", "category", "httpStatus", "issues", "issueDiagnostic"].includes(key))).toBe(true);
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

import { beforeEach, describe, expect, it, vi } from "vitest";

const { createPayPalOrder } = vi.hoisted(() => ({ createPayPalOrder: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({ requireCurrentUser: vi.fn(async () => ({ id: "auth-user-id" })) }));
vi.mock("@/server/checkout/repository", () => ({ findAccountIdByAuthUser: vi.fn(async () => 2n) }));
vi.mock("@/server/config/env", () => ({
  parseRuntimeEnv: vi.fn(() => ({
    public: { paypalClientId: "paypal-client-id" },
    paypalClientSecret: "paypal-client-secret",
    paypalMerchantId: "MERCHANT123",
    paypalEnvironment: "sandbox",
  })),
}));
vi.mock("@/server/paypal/http-gateway", () => ({ HttpPayPalGateway: class {} }));
vi.mock("@/server/paypal/service", () => ({ createPayPalOrder, PostgresPayPalRepository: class {} }));
vi.mock("@/server/quote/repository", () => ({ PostgresQuoteRepository: class {} }));
vi.mock("@/server/quote/service", () => ({ requireCurrentQuoteForPayment: vi.fn() }));

import { POST } from "./route";

const requestBody = {
  intentId: "11111111-1111-4111-8111-111111111111",
  quoteId: "22222222-2222-4222-8222-222222222222",
  operationId: "33333333-3333-4333-8333-333333333333",
  clientMetadataId: "1234567890abcdef1234567890abcdef",
};

function request() {
  return new Request("http://example.test/api/paypal/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

describe("POST /api/paypal/orders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns unresolved owner state as the sanitized pending contract", async () => {
    createPayPalOrder.mockResolvedValue({
      status: "in_progress",
      operationId: requestBody.operationId,
      retryable: true,
    });

    const response = await POST(request());

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      status: "in_progress",
      operationId: requestBody.operationId,
      retryable: true,
    });
  });

  it("keeps a definitive create rejection terminal and sanitized", async () => {
    createPayPalOrder.mockRejectedValue(new Error("payment_unavailable"));

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "payment_not_available" });
  });
});

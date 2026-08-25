import { beforeEach, describe, expect, it, vi } from "vitest";

const { reconcilePayPalWebhook } = vi.hoisted(() => ({ reconcilePayPalWebhook: vi.fn() }));

vi.mock("@/server/config/env", () => ({
  parseRuntimeEnv: vi.fn(() => ({
    public: { paypalClientId: "paypal-client-id" },
    paypalClientSecret: "paypal-client-secret",
    paypalMerchantId: "MERCHANT123",
    paypalEnvironment: "sandbox",
    paypalWebhookId: "WEBHOOK-REDACTED",
  })),
}));
vi.mock("@/server/paypal/http-gateway", () => ({ HttpPayPalGateway: class {} }));
vi.mock("@/server/paypal/webhook", () => ({
  PostgresPayPalWebhookRepository: class {},
  reconcilePayPalWebhook,
}));

import { POST } from "./route";

describe("POST /api/webhooks/paypal", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [false, "rejected", 400],
    [true, "rejected", 200],
    [true, "matched", 200],
    [true, "duplicate", 200],
  ] as const)("acknowledges accepted=%s disposition=%s with %s", async (accepted, disposition, status) => {
    reconcilePayPalWebhook.mockResolvedValue({ accepted, disposition });
    const rawBody = '{"id":"WH-REDACTED"}';
    const response = await POST(new Request("http://example.test/api/webhooks/paypal", {
      method: "POST",
      headers: { "paypal-transmission-id": "redacted" },
      body: rawBody,
    }));

    expect(response.status).toBe(status);
    expect(reconcilePayPalWebhook.mock.calls[0]?.[0]).toBe(rawBody);
    await expect(response.json()).resolves.toEqual({ accepted, disposition });
  });
});

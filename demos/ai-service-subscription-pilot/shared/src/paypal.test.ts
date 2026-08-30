import { describe, expect, it } from "vitest";

import {
  createPayPalOrderRequestSchema,
  paypalIdTokenResponseSchema,
  paypalCheckoutStatusSchema,
} from "./paypal.js";

describe("TASK-0008 shared PayPal boundary", () => {
  it("accepts only the client-safe bootstrap and rejects provider identity projection", () => {
    expect(paypalIdTokenResponseSchema.parse({
      idToken: "short-lived-token",
      fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true },
    })).toEqual({
      idToken: "short-lived-token",
      fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true },
    });

    expect(() => paypalIdTokenResponseSchema.parse({
      idToken: "short-lived-token",
      fraudNet: {
        sourceId: "AI_SERVICE_STUDIO_CHECKOUT",
        sandbox: true,
        merchantId: "must-not-cross-the-boundary",
      },
    })).toThrow();
  });

  it("requires exact UUID ownership inputs and a 32-character FraudNet attempt", () => {
    expect(createPayPalOrderRequestSchema.parse({
      intentId: "11111111-1111-4111-8111-111111111111",
      quoteId: "22222222-2222-4222-8222-222222222222",
      operationId: "33333333-3333-4333-8333-333333333333",
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    })).toBeTruthy();
    expect(() => createPayPalOrderRequestSchema.parse({
      intentId: "11111111-1111-4111-8111-111111111111",
      quoteId: "22222222-2222-4222-8222-222222222222",
      operationId: "33333333-3333-4333-8333-333333333333",
      clientMetadataId: "short",
    })).toThrow();
  });

  it("keeps funding and reusable readiness separate without activation fields", () => {
    const result = paypalCheckoutStatusSchema.parse({
      operationId: "33333333-3333-4333-8333-333333333333",
      funding: "verified",
      reusableReadiness: "pending",
      customerMessage: "Payment verified. Reusable payment setup is finishing.",
    });
    expect(result).toMatchObject({ funding: "verified", reusableReadiness: "pending" });
    expect(result).not.toHaveProperty("allowance");
    expect(result).not.toHaveProperty("entitlement");
  });
});

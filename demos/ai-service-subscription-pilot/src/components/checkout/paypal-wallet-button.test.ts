import { describe, expect, it } from "vitest";

import {
  buildPayPalScriptOptions,
  classifyCaptureStatus,
  classifyCreateOrderResponse,
} from "@/components/checkout/paypal-wallet-button";

describe("PayPalWalletButton payment boundary", () => {
  it("passes the request nonce through the supported PayPal SDK data option", () => {
    expect(buildPayPalScriptOptions({
      clientId: "paypal-client-id",
      idToken: "ID-TOKEN-REDACTED",
      nonce: "request-nonce",
    })).toMatchObject({
      clientId: "paypal-client-id",
      dataUserIdToken: "ID-TOKEN-REDACTED",
      dataCspNonce: "request-nonce",
    });
  });

  it.each([
    ["verified", "complete"],
    ["pending", "pending"],
    ["failed", "failed"],
  ] as const)("routes %s funding to %s customer state", (funding, expected) => {
    expect(classifyCaptureStatus({
      operationId: "33333333-3333-4333-8333-333333333333",
      funding,
      reusableReadiness: funding === "verified" ? "ready" : funding,
      customerMessage: "sanitized",
    })).toBe(expected);
  });

  it("maps unresolved create ownership to the existing non-terminal payment status", () => {
    expect(classifyCreateOrderResponse({
      status: "in_progress",
      operationId: "33333333-3333-4333-8333-333333333333",
      retryable: true,
    })).toEqual({
      kind: "pending",
      status: {
        operationId: "33333333-3333-4333-8333-333333333333",
        funding: "pending",
        reusableReadiness: "pending",
        customerMessage: "Payment verification is still in progress.",
      },
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  buildPayPalScriptOptions,
  classifyCaptureError,
  classifyCaptureStatus,
  classifyCreateOrderError,
  classifyCreateOrderResponse,
} from "./paypal-wallet-button.js";
import { ApiRequestError } from "../../lib/api.js";

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

  it.each([
    [new TypeError("network interruption"), "pending"],
    [new SyntaxError("malformed response"), "pending"],
    [new ApiRequestError(503, "internal_error"), "pending"],
    [new ApiRequestError(503, "payment_not_available"), "pending"],
    [new ApiRequestError(409, "payment_not_available"), "failed"],
  ] as const)("classifies capture exception %s as %s", (error, expected) => {
    expect(classifyCaptureError(error)).toBe(expected);
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

  it.each([
    [new TypeError("network interruption"), "pending"],
    [new SyntaxError("malformed response"), "pending"],
    [new ApiRequestError(503, "internal_error"), "pending"],
    [new ApiRequestError(200, null), "pending"],
    [new ApiRequestError(409, "payment_not_available"), "failed"],
  ] as const)("classifies create exception %s as %s", (error, expected) => {
    expect(classifyCreateOrderError(error)).toBe(expected);
  });
});

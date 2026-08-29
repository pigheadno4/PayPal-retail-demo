import { describe, expect, it } from "vitest";

import {
  parseRequestOtpRequest,
  type CreateCheckoutIntentResponse,
} from "./identity.js";

describe("shared identity contract", () => {
  it("catches a client trying to select temporary identity authority", () => {
    expect(() => parseRequestOtpRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      identityRoute: "temporary",
      email: "chosen-by-client@test",
    })).toThrow();
  });

  it("accepts only the approved persistent and temporary request shapes", () => {
    expect(parseRequestOtpRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      identityRoute: "persistent",
      email: "customer@example.com",
    })).toEqual({
      intentId: "11111111-1111-4111-8111-111111111111",
      identityRoute: "persistent",
      email: "customer@example.com",
    });
    expect(parseRequestOtpRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      identityRoute: "temporary",
    })).toEqual({
      intentId: "11111111-1111-4111-8111-111111111111",
      identityRoute: "temporary",
    });
  });

  it("keeps the selection response client-safe", () => {
    const response: CreateCheckoutIntentResponse = {
      intentId: "11111111-1111-4111-8111-111111111111",
      tier: "go",
      cadence: "monthly",
      state: "selected",
    };

    expect(Object.keys(response).sort()).toEqual([
      "cadence",
      "intentId",
      "state",
      "tier",
    ]);
  });
});

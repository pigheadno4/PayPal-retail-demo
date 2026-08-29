import { describe, expect, it } from "vitest";

import { parseReplaceQuoteRequest } from "./checkout.js";

describe("shared checkout contract", () => {
  it("catches caller-controlled commercial input", () => {
    expect(() => parseReplaceQuoteRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
      taxBasisPoints: 0,
    })).toThrow();
  });

  it("accepts only the two opaque ownership identifiers", () => {
    expect(parseReplaceQuoteRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
    })).toEqual({
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
    });
  });
});

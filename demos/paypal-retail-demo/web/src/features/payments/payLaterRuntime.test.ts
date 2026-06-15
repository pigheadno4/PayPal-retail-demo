import { describe, expect, it } from "vitest";

import {
  normalizePayLaterMessageAmount,
  resolvePayLaterButtonEligibility,
} from "./payLaterRuntime.js";

describe("payLaterRuntime", () => {
  it("normalizes display totals into SDK eligibility/message amounts", () => {
    expect(normalizePayLaterMessageAmount("$25.98")).toBe("25.98");
    expect(normalizePayLaterMessageAmount("£12.99")).toBe("12.99");
  });

  it("keeps the official Pay Later button hidden while eligibility is loading", () => {
    expect(
      resolvePayLaterButtonEligibility({
        eligiblePaymentMethods: null,
        error: null,
        isLoading: true,
      }),
    ).toEqual({
      status: "loading",
      statusLabel: "Pay Later eligibility pending.",
    });
  });

  it("keeps the official Pay Later button hidden when runtime eligibility is false", () => {
    expect(
      resolvePayLaterButtonEligibility({
        eligiblePaymentMethods: eligibleMethods({
          details: {
            countryCode: "US",
            productCode: "PAYLATER",
          },
          eligible: false,
        }),
        error: null,
        isLoading: false,
      }),
    ).toEqual({
      status: "ineligible",
      statusLabel: "Pay Later is unavailable for this cart.",
    });
  });

  it("keeps the official Pay Later button hidden when SDK details are missing", () => {
    expect(
      resolvePayLaterButtonEligibility({
        eligiblePaymentMethods: eligibleMethods({
          details: {
            countryCode: "",
            productCode: "PAYLATER",
          },
          eligible: true,
        }),
        error: null,
        isLoading: false,
      }),
    ).toEqual({
      status: "details_missing",
      statusLabel: "Pay Later details are unavailable.",
    });
  });

  it("allows the official Pay Later button only after eligible details exist", () => {
    expect(
      resolvePayLaterButtonEligibility({
        eligiblePaymentMethods: eligibleMethods({
          details: {
            countryCode: "US",
            productCode: "PAYLATER",
          },
          eligible: true,
        }),
        error: null,
        isLoading: false,
      }),
    ).toEqual({
      details: {
        countryCode: "US",
        productCode: "PAYLATER",
      },
      status: "eligible",
      statusLabel: "Pay Later payment button ready.",
    });
  });
});

function eligibleMethods({
  details,
  eligible,
}: {
  readonly details: {
    readonly countryCode: string;
    readonly productCode: string;
  };
  readonly eligible: boolean;
}) {
  return {
    getDetails: (method: string) => {
      if (method !== "paylater") {
        throw new Error(`Unexpected method ${method}`);
      }

      return details;
    },
    isEligible: (method: string) => method === "paylater" && eligible,
  };
}

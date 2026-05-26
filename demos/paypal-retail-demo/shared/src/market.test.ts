import { describe, expect, it } from "vitest";
import {
  buildPayPalProviderKey,
  getMarketConfig,
  normalizePaymentComponents,
} from "./market.js";

describe("market helpers", () => {
  it("returns locked US and GB checkout configuration", () => {
    expect(getMarketConfig("US")).toMatchObject({
      code: "US",
      currencyCode: "USD",
      locale: "en-US",
      buyerCountry: "US",
      payLaterBuyerCountry: "US",
      sandboxTestBuyerCountry: "US",
      marketVersion: 1,
    });
    expect(getMarketConfig("GB")).toMatchObject({
      code: "GB",
      currencyCode: "GBP",
      locale: "en-GB",
      buyerCountry: "GB",
      payLaterBuyerCountry: "GB",
      sandboxTestBuyerCountry: "GB",
      marketVersion: 1,
    });
  });

  it("normalizes payment components for stable provider keys", () => {
    expect(
      normalizePaymentComponents(["paypal-payments", "card-fields"]),
    ).toEqual(["card-fields", "paypal-payments"]);
    expect(normalizePaymentComponents(["card-fields", "card-fields"])).toEqual([
      "card-fields",
    ]);
  });

  it("changes the PayPal provider key when market inputs change", () => {
    const us = getMarketConfig("US");
    const gb = getMarketConfig("GB");
    const base = buildPayPalProviderKey({
      clientId: "client-demo",
      environment: "sandbox",
      market: us,
      components: ["paypal-payments", "card-fields"],
    });

    expect(
      buildPayPalProviderKey({
        clientId: "client-demo",
        environment: "sandbox",
        market: us,
        components: ["card-fields", "paypal-payments"],
      }),
    ).toBe(base);
    expect(
      buildPayPalProviderKey({
        clientId: "client-demo",
        environment: "sandbox",
        market: gb,
        components: ["paypal-payments", "card-fields"],
      }),
    ).not.toBe(base);
    expect(
      buildPayPalProviderKey({
        clientId: "client-demo",
        environment: "sandbox",
        market: { ...us, sandboxTestBuyerCountry: "GB" },
        components: ["paypal-payments", "card-fields"],
      }),
    ).not.toBe(base);
  });
});

import { describe, expect, it } from "vitest";
import {
  calculateEstimatedTax,
  selectTaxRate,
  type TaxRateRow,
} from "./tax.js";

const rates: TaxRateRow[] = [
  {
    id: "us-base",
    marketId: "market-us",
    countryCode: "US",
    state: null,
    county: null,
    postalCodePrefix: null,
    rateBps: 600,
    isActive: true,
  },
  {
    id: "ca",
    marketId: "market-us",
    countryCode: "US",
    state: "CA",
    county: null,
    postalCodePrefix: null,
    rateBps: 850,
    isActive: true,
  },
  {
    id: "la",
    marketId: "market-us",
    countryCode: "US",
    state: "CA",
    county: "Los Angeles",
    postalCodePrefix: "900",
    rateBps: 950,
    isActive: true,
  },
];

describe("tax helpers", () => {
  it("selects the most specific active tax rate for the destination", () => {
    expect(
      selectTaxRate(rates, {
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: "Los Angeles",
        postalCode: "90046",
      }),
    ).toMatchObject({ id: "la", rateBps: 950 });
  });

  it("calculates tax after promo and excludes shipping", () => {
    const result = calculateEstimatedTax({
      merchandiseSubtotalMinor: 10_000,
      promoDiscountMinor: 2300,
      shippingMinor: 1295,
      rateBps: 950,
    });

    expect(result.taxableSubtotalMinor).toBe(7700);
    expect(result.taxMinor).toBe(732);
    expect(result.shippingMinor).toBe(1295);
  });
});

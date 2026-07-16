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

  it("uses a matching postal-scoped rate when the provider omits county", () => {
    expect(
      selectTaxRate(
        rates,
        {
          marketId: "market-us",
          countryCode: "US",
          state: "CA",
          county: null,
          postalCode: "90046",
        },
        {
          allowPostalCountyFallback: true,
        },
      ),
    ).toMatchObject({ id: "la", rateBps: 950 });
  });

  it("does not use the provider missing-county fallback for ordinary checkout", () => {
    expect(
      selectTaxRate(rates, {
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: null,
        postalCode: "90046",
      }),
    ).toMatchObject({ id: "ca", rateBps: 850 });
  });

  it("rejects a county-scoped fallback whose postal prefix does not match", () => {
    expect(
      selectTaxRate(
        rates,
        {
          marketId: "market-us",
          countryCode: "US",
          state: "CA",
          county: null,
          postalCode: "94105",
        },
        { allowPostalCountyFallback: true },
      ),
    ).toMatchObject({ id: "ca", rateBps: 850 });
  });

  it("prefers a longer verified postal prefix over an unverified county", () => {
    expect(
      selectTaxRate(
        [
          ...rates,
          {
            id: "sf-postal",
            marketId: "market-us",
            countryCode: "US",
            state: "CA",
            county: null,
            postalCodePrefix: "941",
            rateBps: 863,
            isActive: true,
          },
          {
            id: "unknown-county-short-postal",
            marketId: "market-us",
            countryCode: "US",
            state: "CA",
            county: "Unknown County",
            postalCodePrefix: "9",
            rateBps: 999,
            isActive: true,
          },
        ],
        {
          marketId: "market-us",
          countryCode: "US",
          state: "CA",
          county: null,
          postalCode: "94105",
        },
        { allowPostalCountyFallback: true },
      ),
    ).toMatchObject({ id: "sf-postal", rateBps: 863 });
  });

  it("falls back to the verified state rate for conflicting county rows", () => {
    const conflictingRates: readonly TaxRateRow[] = [
      rates[0]!,
      rates[1]!,
      {
        id: "county-a",
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: "County A",
        postalCodePrefix: "941",
        rateBps: 863,
        isActive: true,
      },
      {
        id: "county-b",
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: "County B",
        postalCodePrefix: "941",
        rateBps: 925,
        isActive: true,
      },
    ];

    expect(
      selectTaxRate(
        conflictingRates,
        {
          marketId: "market-us",
          countryCode: "US",
          state: "CA",
          county: null,
          postalCode: "94105",
        },
        { allowPostalCountyFallback: true },
      ),
    ).toMatchObject({ id: "ca", rateBps: 850 });
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

import { describe, expect, it } from "vitest";
import {
  selectDefaultShippingOption,
  selectEligibleShippingOptions,
  type ShippingOptionRow,
} from "./shipping.js";

const options: ShippingOptionRow[] = [
  {
    id: "ca-express",
    marketId: "market-us",
    countryCode: "US",
    state: "CA",
    county: null,
    serviceCode: "express",
    displayName: "Express Delivery",
    amountMinor: 1295,
    estimatedDaysMin: 2,
    estimatedDaysMax: 3,
    isActive: true,
  },
  {
    id: "ca-standard",
    marketId: "market-us",
    countryCode: "US",
    state: "CA",
    county: null,
    serviceCode: "standard",
    displayName: "Standard Delivery",
    amountMinor: 595,
    estimatedDaysMin: 4,
    estimatedDaysMax: 6,
    isActive: true,
  },
  {
    id: "ny-standard",
    marketId: "market-us",
    countryCode: "US",
    state: "NY",
    county: null,
    serviceCode: "standard",
    displayName: "Standard Delivery",
    amountMinor: 695,
    estimatedDaysMin: 4,
    estimatedDaysMax: 6,
    isActive: true,
  },
  {
    id: "inactive",
    marketId: "market-us",
    countryCode: "US",
    state: "CA",
    county: null,
    serviceCode: "same-day",
    displayName: "Same Day",
    amountMinor: 1995,
    estimatedDaysMin: 0,
    estimatedDaysMax: 1,
    isActive: false,
  },
];

describe("shipping helpers", () => {
  it("returns active shipping options for the destination only", () => {
    expect(
      selectEligibleShippingOptions(options, {
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: "Los Angeles",
      }).map((option) => option.id),
    ).toEqual(["ca-standard", "ca-express"]);
  });

  it("defaults to the cheapest eligible shipping option", () => {
    expect(
      selectDefaultShippingOption(options, {
        marketId: "market-us",
        countryCode: "US",
        state: "CA",
        county: "Los Angeles",
      }),
    ).toMatchObject({
      id: "ca-standard",
      amountMinor: 595,
    });
  });
});

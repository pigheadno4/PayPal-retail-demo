import { describe, expect, it } from "vitest";
import {
  evaluatePromos,
  type PromoCompatibilityRow,
  type PromoEvaluationInput,
  type PromoRuleRow,
} from "./promos.js";

const rules: PromoRuleRow[] = [
  {
    id: "big20",
    code: "BIG20",
    promoType: "manual",
    discountType: "percent",
    discountValue: 2000,
    minMerchandiseSubtotalMinor: 6000,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2027-01-01T00:00:00.000Z",
    isStackable: false,
    priority: 5,
    isActive: true,
  },
  {
    id: "state15",
    code: "STATE15",
    promoType: "auto",
    discountType: "fixed_amount",
    discountValue: 1500,
    minMerchandiseSubtotalMinor: 2500,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2027-01-01T00:00:00.000Z",
    isStackable: true,
    priority: 20,
    isActive: true,
  },
  {
    id: "bundle8",
    code: "BUNDLE8",
    promoType: "manual",
    discountType: "percent",
    discountValue: 800,
    minMerchandiseSubtotalMinor: 4500,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: "2027-01-01T00:00:00.000Z",
    isStackable: true,
    priority: 30,
    isActive: true,
  },
  {
    id: "expired",
    code: "EXPIRED20",
    promoType: "manual",
    discountType: "percent",
    discountValue: 2000,
    minMerchandiseSubtotalMinor: 1000,
    startsAt: "2025-01-01T00:00:00.000Z",
    endsAt: "2025-12-31T00:00:00.000Z",
    isStackable: true,
    priority: 1,
    isActive: true,
  },
];

const compatibility: PromoCompatibilityRow[] = [
  {
    promoRuleId: "state15",
    compatiblePromoRuleId: "bundle8",
    compatibility: "compatible",
  },
  {
    promoRuleId: "big20",
    compatiblePromoRuleId: "state15",
    compatibility: "exclusive",
  },
  {
    promoRuleId: "big20",
    compatiblePromoRuleId: "bundle8",
    compatibility: "exclusive",
  },
];

const baseInput: PromoEvaluationInput = {
  at: "2026-05-26T00:00:00.000Z",
  merchandiseSubtotalMinor: 10_000,
  shippingMinor: 1_295,
  manualCodes: ["BIG20", "BUNDLE8", "EXPIRED20"],
  destination: {
    countryCode: "US",
    state: "CA",
    county: "Los Angeles",
    postalCode: "90046",
  },
  lines: [
    {
      productId: "blind-box-1",
      categoryId: "blind-boxes",
      subtotalMinor: 10_000,
    },
  ],
  rules,
  regionScopes: [
    {
      promoRuleId: "state15",
      countryCode: "US",
      state: "CA",
      county: null,
      postalCodePrefix: "9",
      includeExclude: "include",
    },
  ],
  productScopes: [
    {
      promoRuleId: "bundle8",
      productId: null,
      categoryId: "blind-boxes",
      includeExclude: "include",
    },
  ],
  compatibility,
};

describe("promo evaluation", () => {
  it("recommends the best compatible set, not the largest single promo", () => {
    const result = evaluatePromos(baseInput);

    expect(result.recommendedSet).toEqual(["STATE15", "BUNDLE8"]);
    expect(result.merchandiseDiscountMinor).toBe(2300);
    expect(result.taxableSubtotalMinor).toBe(7700);
    expect(result.finalTotalMinor).toBe(7700);
    expect(result.candidateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          codes: ["BIG20"],
          discountMinor: 2000,
        }),
        expect.objectContaining({
          codes: ["STATE15", "BUNDLE8"],
          discountMinor: 2300,
          recommended: true,
        }),
      ]),
    );
  });

  it("records rejected promos with buyer-safe reasons", () => {
    const result = evaluatePromos({
      ...baseInput,
      destination: {
        countryCode: "US",
        state: "NY",
        county: "New York",
        postalCode: "10012",
      },
    });

    expect(result.rejectedPromos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EXPIRED20",
          reason: "expired",
        }),
        expect.objectContaining({
          code: "STATE15",
          reason: "region_not_match",
        }),
      ]),
    );
  });

  it("preserves a valid buyer-selected set separately from the recommendation", () => {
    const result = evaluatePromos({
      ...baseInput,
      selectedCodes: ["BIG20"],
    });

    expect(result.recommendedSet).toEqual(["STATE15", "BUNDLE8"]);
    expect(result.selectedSet).toEqual(["BIG20"]);
    expect(result.merchandiseDiscountMinor).toBe(2000);
    expect(result.taxableSubtotalMinor).toBe(8000);
  });

  it("uses product/category scope as the discount base", () => {
    const result = evaluatePromos({
      ...baseInput,
      merchandiseSubtotalMinor: 12_000,
      lines: [
        {
          productId: "blind-box-1",
          categoryId: "blind-boxes",
          subtotalMinor: 5_000,
        },
        {
          productId: "plush-1",
          categoryId: "plush",
          subtotalMinor: 7_000,
        },
      ],
    });

    expect(
      result.candidateSets.find((candidate) =>
        candidate.codes.includes("BUNDLE8"),
      ),
    ).toMatchObject({
      codes: ["STATE15", "BUNDLE8"],
      discountMinor: 1900,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  buildReleaseCalendarEntry,
  getProductPurchaseState,
  requireActiveProductPrice,
  selectActiveProductPrice,
  type CatalogProduct,
  type ProductPriceRow,
} from "./catalog.js";

const product: CatalogProduct = {
  id: "product-1",
  profileId: "profile-popmart",
  slug: "blind-box-1",
  name: "Blind Box 1",
  releaseStatus: "released",
  releaseDate: "2026-05-01",
  isActive: true,
};

const prices: ProductPriceRow[] = [
  {
    id: "inactive-price",
    profileId: "profile-popmart",
    marketId: "market-us",
    productId: "product-1",
    currencyCode: "USD",
    regularPriceMinor: 2000,
    currentPriceMinor: 1800,
    startsAt: null,
    endsAt: null,
    isActive: false,
  },
  {
    id: "us-price",
    profileId: "profile-popmart",
    marketId: "market-us",
    productId: "product-1",
    currencyCode: "USD",
    regularPriceMinor: 2000,
    currentPriceMinor: 1700,
    startsAt: "2026-01-01T00:00:00.000Z",
    endsAt: null,
    isActive: true,
  },
  {
    id: "gb-price",
    profileId: "profile-popmart",
    marketId: "market-gb",
    productId: "product-1",
    currencyCode: "GBP",
    regularPriceMinor: 1600,
    currentPriceMinor: 1600,
    startsAt: null,
    endsAt: null,
    isActive: true,
  },
  {
    id: "other-profile-price",
    profileId: "profile-generic",
    marketId: "market-us",
    productId: "product-1",
    currencyCode: "USD",
    regularPriceMinor: 999,
    currentPriceMinor: 999,
    startsAt: null,
    endsAt: null,
    isActive: true,
  },
];

describe("catalog price helpers", () => {
  it("selects the active price for the product profile and market only", () => {
    expect(
      selectActiveProductPrice(prices, {
        profileId: "profile-popmart",
        marketId: "market-us",
        productId: "product-1",
        at: "2026-05-26T00:00:00.000Z",
      }),
    ).toMatchObject({
      id: "us-price",
      currencyCode: "USD",
      activePriceMinor: 1700,
      regularPriceMinor: 2000,
      isOnSale: true,
      saleDiscountMinor: 300,
    });
  });

  it("keeps market prices separate without currency conversion", () => {
    expect(
      requireActiveProductPrice(prices, {
        profileId: "profile-popmart",
        marketId: "market-gb",
        productId: "product-1",
      }),
    ).toMatchObject({
      id: "gb-price",
      currencyCode: "GBP",
      activePriceMinor: 1600,
      isOnSale: false,
    });
  });

  it("returns undefined when no active in-window price exists", () => {
    expect(
      selectActiveProductPrice(
        [
          {
            ...prices[1]!,
            id: "future-price",
            startsAt: "2026-06-01T00:00:00.000Z",
          },
        ],
        {
          profileId: "profile-popmart",
          marketId: "market-us",
          productId: "product-1",
          at: "2026-05-26T00:00:00.000Z",
        },
      ),
    ).toBeUndefined();
  });
});

describe("catalog release helpers", () => {
  it("allows checkout and reviews for active released products", () => {
    expect(getProductPurchaseState(product, "2026-05-26")).toEqual({
      isReleased: true,
      isPurchasable: true,
      canShowReviews: true,
      checkoutBlockedReason: null,
    });
  });

  it("blocks checkout and reviews before the release date", () => {
    expect(
      getProductPurchaseState(
        { ...product, releaseDate: "2026-06-01" },
        "2026-05-26",
      ),
    ).toEqual({
      isReleased: false,
      isPurchasable: false,
      canShowReviews: false,
      checkoutBlockedReason: "release_pending",
    });
  });

  it("blocks checkout and reviews for unreleased products", () => {
    expect(
      getProductPurchaseState(
        { ...product, releaseStatus: "unreleased" },
        "2026-05-26",
      ),
    ).toMatchObject({
      isPurchasable: false,
      canShowReviews: false,
      checkoutBlockedReason: "not_released",
    });
  });

  it("builds outlined release calendar entries that link to the PDP", () => {
    expect(buildReleaseCalendarEntry(product, "2026-05-26")).toEqual({
      productId: "product-1",
      productSlug: "blind-box-1",
      eventDate: "2026-05-01",
      markerStyle: "outlined-circle",
      state: "released",
      linksToPdp: true,
    });
    expect(
      buildReleaseCalendarEntry(
        { ...product, releaseStatus: "coming_soon", releaseDate: "2026-06-01" },
        "2026-05-26",
      ),
    ).toMatchObject({
      markerStyle: "outlined-circle",
      state: "future",
      linksToPdp: true,
    });
  });
});

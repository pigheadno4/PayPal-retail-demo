import { describe, expect, it } from "vitest";
import {
  buildBrowserCartBinding,
  mergeCartLines,
  refreshCartLines,
  requiresCartRefreshBefore,
  type CartLine,
  type CartLineRule,
} from "./cart.js";

const userCartLines: CartLine[] = [
  {
    productId: "labubu",
    optionKey: "default",
    quantity: 2,
    unitPriceMinorSnapshot: 1599,
    currencyCode: "USD",
    updatedAt: "2026-05-30T09:00:00.000Z",
  },
  {
    productId: "hirono",
    optionKey: "default",
    quantity: 1,
    unitPriceMinorSnapshot: 2299,
    currencyCode: "USD",
    updatedAt: "2026-05-30T09:10:00.000Z",
  },
];

const sessionCartLines: CartLine[] = [
  {
    productId: "labubu",
    optionKey: "default",
    quantity: 3,
    unitPriceMinorSnapshot: 1499,
    currencyCode: "USD",
    updatedAt: "2026-05-30T10:00:00.000Z",
  },
  {
    productId: "molly",
    optionKey: "default",
    quantity: 1,
    unitPriceMinorSnapshot: 2499,
    currencyCode: "USD",
    updatedAt: "2026-05-30T10:05:00.000Z",
  },
];

const cartRules: CartLineRule[] = [
  {
    productId: "labubu",
    optionKey: "default",
    maxQuantity: 4,
    currentPriceMinor: 1499,
    currencyCode: "USD",
    isPurchasable: true,
  },
  {
    productId: "hirono",
    optionKey: "default",
    maxQuantity: 3,
    currentPriceMinor: 2299,
    currencyCode: "USD",
    isPurchasable: true,
  },
  {
    productId: "molly",
    optionKey: "default",
    maxQuantity: 2,
    currentPriceMinor: 2499,
    currencyCode: "USD",
    isPurchasable: true,
  },
];

describe("cart merge", () => {
  it("adds same product/options, caps quantity, appends new items, and keeps latest intent metadata", () => {
    const result = mergeCartLines({
      targetContext: {
        profileId: "popmart",
        marketId: "US",
        currencyCode: "USD",
      },
      incomingContext: {
        profileId: "popmart",
        marketId: "US",
        currencyCode: "USD",
      },
      targetLines: userCartLines,
      incomingLines: sessionCartLines,
      rules: cartRules,
    });

    expect(result.lines).toEqual([
      {
        productId: "labubu",
        optionKey: "default",
        quantity: 4,
        unitPriceMinorSnapshot: 1499,
        currencyCode: "USD",
        updatedAt: "2026-05-30T10:00:00.000Z",
      },
      userCartLines[1],
      sessionCartLines[1],
    ]);
    expect(result.adjustments).toEqual([
      {
        type: "merged",
        productId: "labubu",
        optionKey: "default",
        targetQuantity: 2,
        incomingQuantity: 3,
        finalQuantity: 4,
      },
      {
        type: "quantity_capped",
        productId: "labubu",
        optionKey: "default",
        requestedQuantity: 5,
        finalQuantity: 4,
        maxQuantity: 4,
      },
      {
        type: "appended",
        productId: "molly",
        optionKey: "default",
        finalQuantity: 1,
      },
    ]);
  });

  it("does not merge carts across profile, market, or currency boundaries", () => {
    expect(() =>
      mergeCartLines({
        targetContext: {
          profileId: "popmart",
          marketId: "US",
          currencyCode: "USD",
        },
        incomingContext: {
          profileId: "popmart",
          marketId: "GB",
          currencyCode: "GBP",
        },
        targetLines: userCartLines,
        incomingLines: sessionCartLines,
        rules: cartRules,
      }),
    ).toThrow("cannot merge carts across profile, market, or currency");
  });
});

describe("cart refresh", () => {
  it("refreshes price and quantity from canonical server rules while keeping blocked items visible", () => {
    const result = refreshCartLines({
      lines: [
        {
          productId: "labubu",
          optionKey: "default",
          quantity: 6,
          unitPriceMinorSnapshot: 1599,
          currencyCode: "USD",
          updatedAt: "2026-05-30T09:00:00.000Z",
        },
        {
          productId: "crybaby",
          optionKey: "default",
          quantity: 1,
          unitPriceMinorSnapshot: 1999,
          currencyCode: "USD",
          updatedAt: "2026-05-30T09:20:00.000Z",
        },
      ],
      rules: [
        {
          productId: "labubu",
          optionKey: "default",
          maxQuantity: 3,
          currentPriceMinor: 1499,
          currencyCode: "USD",
          isPurchasable: true,
        },
        {
          productId: "crybaby",
          optionKey: "default",
          maxQuantity: 0,
          currentPriceMinor: 1999,
          currencyCode: "USD",
          isPurchasable: false,
        },
      ],
      refreshedAt: "2026-05-30T11:00:00.000Z",
    });

    expect(result.lines).toEqual([
      {
        productId: "labubu",
        optionKey: "default",
        quantity: 3,
        unitPriceMinorSnapshot: 1499,
        currencyCode: "USD",
        updatedAt: "2026-05-30T11:00:00.000Z",
        isCheckoutEligible: true,
      },
      {
        productId: "crybaby",
        optionKey: "default",
        quantity: 1,
        unitPriceMinorSnapshot: 1999,
        currencyCode: "USD",
        updatedAt: "2026-05-30T11:00:00.000Z",
        isCheckoutEligible: false,
      },
    ]);
    expect(result.adjustments).toEqual([
      {
        type: "quantity_capped",
        productId: "labubu",
        optionKey: "default",
        requestedQuantity: 6,
        finalQuantity: 3,
        maxQuantity: 3,
      },
      {
        type: "price_refreshed",
        productId: "labubu",
        optionKey: "default",
        previousPriceMinor: 1599,
        currentPriceMinor: 1499,
      },
      {
        type: "checkout_blocked",
        productId: "crybaby",
        optionKey: "default",
        reason: "not_purchasable",
      },
    ]);
    expect(result.hasCheckoutBlockers).toBe(true);
  });

  it("requires server cart refresh before every stale-cart risk trigger", () => {
    expect(requiresCartRefreshBefore("minicart_open")).toBe(true);
    expect(requiresCartRefreshBefore("cart_open")).toBe(true);
    expect(requiresCartRefreshBefore("checkout_start")).toBe(true);
    expect(requiresCartRefreshBefore("express_payment_start")).toBe(true);
    expect(requiresCartRefreshBefore("login_register")).toBe(true);
    expect(requiresCartRefreshBefore("pending_resume")).toBe(true);
  });
});

describe("browser cart binding", () => {
  it("stores only server cart identity and secret locally, not cart contents", () => {
    const binding = buildBrowserCartBinding({
      profileId: "popmart",
      marketId: "US",
      cartPublicId: "cart_pub_123",
      cartClientSecret: "client_secret_demo",
    });

    expect(binding).toEqual({
      profileId: "popmart",
      marketId: "US",
      cartPublicId: "cart_pub_123",
      cartClientSecret: "client_secret_demo",
    });
    expect("lines" in binding).toBe(false);
    expect("items" in binding).toBe(false);
  });
});

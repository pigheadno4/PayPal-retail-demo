import { describe, expect, it } from "vitest";
import {
  buildPayPalProviderKey,
  getMarketConfig,
  normalizePaymentComponents,
  planMarketSwitch,
  type MarketScopedCartSnapshot,
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

describe("market switch semantics", () => {
  const currentCart: MarketScopedCartSnapshot = {
    profileId: "popmart",
    marketId: "US",
    currencyCode: "USD",
    lineCurrencyCodes: ["USD"],
  };

  it("clears active browser context and fetches a new cart when market changes", () => {
    const us = getMarketConfig("US");
    const gb = getMarketConfig("GB");
    const result = planMarketSwitch({
      currentProfileId: "popmart",
      currentMarket: us,
      nextProfileId: "popmart",
      nextMarket: gb,
      activeCartBinding: {
        profileId: "popmart",
        marketId: "US",
        cartPublicId: "cart_us_123",
        cartClientSecret: "secret_us",
      },
      currentCart,
      currentProviderKey: buildPayPalProviderKey({
        clientId: "client-demo",
        environment: "sandbox",
        market: us,
      }),
      nextProviderKey: buildPayPalProviderKey({
        clientId: "client-demo",
        environment: "sandbox",
        market: gb,
      }),
    });

    expect(result).toEqual({
      kind: "switch",
      nextProfileId: "popmart",
      nextMarketId: "GB",
      activeCartBinding: null,
      cartAction: {
        type: "fetch_or_create",
        profileId: "popmart",
        marketId: "GB",
      },
      checkoutDraftAction: "clear",
      paymentSessionAction: "clear",
      refreshTargets: ["config", "catalog", "cart", "paypal_sdk_config"],
      preservedResources: [
        "orders",
        "inventory",
        "users",
        "saved_payments",
        "reviews",
        "webhooks",
      ],
      currentCartPolicy: "preserve_without_conversion",
      currentCartSnapshot: currentCart,
      shouldRemountPayPalProvider: true,
      requiresWholeAppReload: false,
    });
  });

  it("refreshes profile-scoped data without remounting PayPal when only profile changes", () => {
    const us = getMarketConfig("US");
    const providerKey = buildPayPalProviderKey({
      clientId: "client-demo",
      environment: "sandbox",
      market: us,
    });

    const result = planMarketSwitch({
      currentProfileId: "popmart",
      currentMarket: us,
      nextProfileId: "mochitoy",
      nextMarket: us,
      activeCartBinding: {
        profileId: "popmart",
        marketId: "US",
        cartPublicId: "cart_us_123",
        cartClientSecret: "secret_us",
      },
      currentCart,
      currentProviderKey: providerKey,
      nextProviderKey: providerKey,
    });

    expect(result).toMatchObject({
      kind: "switch",
      activeCartBinding: null,
      cartAction: {
        type: "fetch_or_create",
        profileId: "mochitoy",
        marketId: "US",
      },
      shouldRemountPayPalProvider: false,
      requiresWholeAppReload: false,
    });
    expect(result.refreshTargets).toEqual([
      "config",
      "catalog",
      "cart",
      "paypal_sdk_config",
    ]);
  });

  it("keeps current context when profile and market do not change", () => {
    const us = getMarketConfig("US");
    const activeCartBinding = {
      profileId: "popmart",
      marketId: "US",
      cartPublicId: "cart_us_123",
      cartClientSecret: "secret_us",
    };
    const providerKey = buildPayPalProviderKey({
      clientId: "client-demo",
      environment: "sandbox",
      market: us,
    });

    expect(
      planMarketSwitch({
        currentProfileId: "popmart",
        currentMarket: us,
        nextProfileId: "popmart",
        nextMarket: us,
        activeCartBinding,
        currentCart,
        currentProviderKey: providerKey,
        nextProviderKey: providerKey,
      }),
    ).toEqual({
      kind: "no_change",
      nextProfileId: "popmart",
      nextMarketId: "US",
      activeCartBinding,
      cartAction: {
        type: "keep_current",
      },
      checkoutDraftAction: "keep",
      paymentSessionAction: "keep",
      refreshTargets: [],
      preservedResources: [
        "orders",
        "inventory",
        "users",
        "saved_payments",
        "reviews",
        "webhooks",
      ],
      currentCartPolicy: "preserve_without_conversion",
      currentCartSnapshot: currentCart,
      shouldRemountPayPalProvider: false,
      requiresWholeAppReload: false,
    });
  });

  it("rejects cart snapshots whose currency no longer matches their original market", () => {
    const us = getMarketConfig("US");
    const gb = getMarketConfig("GB");

    expect(() =>
      planMarketSwitch({
        currentProfileId: "popmart",
        currentMarket: us,
        nextProfileId: "popmart",
        nextMarket: gb,
        activeCartBinding: null,
        currentCart: {
          ...currentCart,
          currencyCode: "GBP",
        },
        currentProviderKey: "paypal:sandbox:client-demo:US",
        nextProviderKey: "paypal:sandbox:client-demo:GB",
      }),
    ).toThrow("current cart currency must match its locked market currency");
  });
});

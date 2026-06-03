import { describe, expect, it } from "vitest";

import {
  applyRuntimeConfig,
  createInitialStorefrontState,
  type StorefrontRuntimeConfig,
} from "./storefrontState.js";

describe("storefront shell state", () => {
  it("scopes provider-key changes to the PayPal subtree", () => {
    const initial = createInitialStorefrontState();
    const firstConfig = runtimeConfig("paypal:key:us:v1");
    const first = applyRuntimeConfig(initial, firstConfig);
    const same = applyRuntimeConfig(first.state, firstConfig);
    const openPanels = {
      ...same.state,
      panels: {
        authModal: "email" as const,
        minicart: "open" as const,
      },
    };
    const providerOnlyChanged = applyRuntimeConfig(
      openPanels,
      runtimeConfig("paypal:key:us:v2"),
    );
    const marketChanged = applyRuntimeConfig(
      providerOnlyChanged.state,
      runtimeConfig("paypal:key:gb:v1"),
    );

    expect(initial.activeConfig).toBeNull();
    expect(first.effects).toEqual({
      remountPayPalProvider: true,
      refreshStorefrontData: true,
      closeTransientPanels: true,
    });
    expect(same.effects).toEqual({
      remountPayPalProvider: false,
      refreshStorefrontData: false,
      closeTransientPanels: false,
    });
    expect(providerOnlyChanged.effects).toEqual({
      remountPayPalProvider: true,
      refreshStorefrontData: false,
      closeTransientPanels: false,
    });
    expect(providerOnlyChanged.state.panels).toEqual({
      authModal: "email",
      minicart: "open",
    });
    expect(marketChanged.effects).toEqual({
      remountPayPalProvider: true,
      refreshStorefrontData: true,
      closeTransientPanels: true,
    });
    expect(marketChanged.state.panels).toEqual({
      authModal: "closed",
      minicart: "closed",
    });
  });
});

function runtimeConfig(providerKey: string): StorefrontRuntimeConfig {
  return {
    profile: {
      slug: providerKey.includes(":gb:") ? "generic" : "popmart",
      displayName: providerKey.includes(":gb:")
        ? "MochiToy Studio"
        : "POP MART",
      brandMode: providerKey.includes(":gb:") ? "generic" : "popmart",
    },
    market: {
      code: providerKey.includes(":gb:") ? "GB" : "US",
      currencyCode: providerKey.includes(":gb:") ? "GBP" : "USD",
      locale: providerKey.includes(":gb:") ? "en-GB" : "en-US",
    },
    paypal: {
      providerKey,
    },
  };
}

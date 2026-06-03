import { describe, expect, it } from "vitest";

import {
  applyRuntimeConfig,
  createInitialStorefrontState,
  type StorefrontRuntimeConfig,
} from "./storefrontState.js";

describe("storefront shell state", () => {
  it("tracks provider-key changes without resetting the whole app", () => {
    const initial = createInitialStorefrontState();
    const firstConfig = runtimeConfig("paypal:key:us:v1");
    const first = applyRuntimeConfig(initial, firstConfig);
    const same = applyRuntimeConfig(first.state, firstConfig);
    const changed = applyRuntimeConfig(
      same.state,
      runtimeConfig("paypal:key:gb:v2"),
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
    expect(changed.effects).toEqual({
      remountPayPalProvider: true,
      refreshStorefrontData: true,
      closeTransientPanels: true,
    });
    expect(changed.state.panels).toEqual({
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

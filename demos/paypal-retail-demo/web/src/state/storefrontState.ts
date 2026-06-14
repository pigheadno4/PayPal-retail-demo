import type {
  StorefrontBrandMode,
  StorefrontProfileInput,
} from "../app/profileAssets.js";

export interface StorefrontRuntimeConfig {
  readonly profile: StorefrontProfileInput;
  readonly market: {
    readonly code: "US" | "GB" | string;
    readonly currencyCode: "USD" | "GBP" | string;
    readonly locale: string;
  };
  readonly paypal: {
    readonly providerKey: string;
  };
}

export interface StorefrontShellPanels {
  readonly authModal: "closed" | "email" | "password" | "register";
  readonly minicart: "closed" | "open";
}

export interface StorefrontShellState {
  readonly activeConfig: StorefrontRuntimeConfig | null;
  readonly panels: StorefrontShellPanels;
}

export interface StorefrontConfigEffects {
  readonly remountPayPalProvider: boolean;
  readonly refreshStorefrontData: boolean;
  readonly closeTransientPanels: boolean;
}

export function createInitialStorefrontState(): StorefrontShellState {
  return {
    activeConfig: null,
    panels: {
      authModal: "closed",
      minicart: "closed",
    },
  };
}

export function defaultRuntimeConfig(): StorefrontRuntimeConfig {
  return {
    profile: {
      slug: "popmart",
      displayName: "POP MART",
      brandMode: "popmart" satisfies StorefrontBrandMode,
    },
    market: {
      code: "US",
      currencyCode: "USD",
      locale: "en-US",
    },
    paypal: {
      providerKey: "paypal:pending",
    },
  };
}

export function applyRuntimeConfig(
  state: StorefrontShellState,
  config: StorefrontRuntimeConfig,
): {
  readonly state: StorefrontShellState;
  readonly effects: StorefrontConfigEffects;
} {
  const previousConfig = state.activeConfig;
  const providerKeyChanged =
    previousConfig?.paypal.providerKey !== config.paypal.providerKey;
  const profileOrMarketChanged =
    previousConfig?.profile.slug !== config.profile.slug ||
    previousConfig?.market.code !== config.market.code;
  const shouldRefresh = !previousConfig || profileOrMarketChanged;

  return {
    state: {
      activeConfig: config,
      panels: shouldRefresh
        ? {
            authModal: "closed",
            minicart: "closed",
          }
        : state.panels,
    },
    effects: {
      remountPayPalProvider: providerKeyChanged,
      refreshStorefrontData: shouldRefresh,
      closeTransientPanels: shouldRefresh,
    },
  };
}

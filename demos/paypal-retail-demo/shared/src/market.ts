import type { BrowserCartBinding } from "./cart.js";

export type MarketCode = "US" | "GB";
export type PayPalEnvironment = "sandbox" | "production";

export type PaymentComponent =
  | "paypal-payments"
  | "paypal-messages"
  | "card-fields"
  | "venmo-payments"
  | "applepay-payments"
  | "googlepay-payments";

export interface MarketConfig {
  readonly code: MarketCode;
  readonly currencyCode: "USD" | "GBP";
  readonly locale: string;
  readonly languageCode: string;
  readonly buyerCountry: MarketCode;
  readonly payLaterBuyerCountry: MarketCode;
  readonly sandboxTestBuyerCountry: MarketCode;
  readonly marketVersion: number;
  readonly paymentComponents: readonly PaymentComponent[];
}

export interface PayPalProviderKeyInput {
  readonly clientId: string;
  readonly environment: PayPalEnvironment;
  readonly market: MarketConfig;
  readonly components?: readonly PaymentComponent[];
}

export type MarketSwitchRefreshTarget =
  | "config"
  | "catalog"
  | "cart"
  | "paypal_sdk_config";

export type MarketSwitchPreservedResource =
  | "orders"
  | "inventory"
  | "users"
  | "saved_payments"
  | "reviews"
  | "webhooks";

export interface MarketScopedCartSnapshot {
  readonly profileId: string;
  readonly marketId: MarketCode;
  readonly currencyCode: MarketConfig["currencyCode"];
  readonly lineCurrencyCodes: readonly MarketConfig["currencyCode"][];
}

export type MarketSwitchCartAction =
  | {
      readonly type: "fetch_or_create";
      readonly profileId: string;
      readonly marketId: MarketCode;
    }
  | {
      readonly type: "keep_current";
    };

export interface PlanMarketSwitchInput {
  readonly currentProfileId: string;
  readonly currentMarket: MarketConfig;
  readonly nextProfileId: string;
  readonly nextMarket: MarketConfig;
  readonly activeCartBinding: BrowserCartBinding | null;
  readonly currentCart?: MarketScopedCartSnapshot | null;
  readonly currentProviderKey: string;
  readonly nextProviderKey: string;
}

export interface MarketSwitchPlan {
  readonly kind: "switch" | "no_change";
  readonly nextProfileId: string;
  readonly nextMarketId: MarketCode;
  readonly activeCartBinding: BrowserCartBinding | null;
  readonly cartAction: MarketSwitchCartAction;
  readonly checkoutDraftAction: "clear" | "keep";
  readonly paymentSessionAction: "clear" | "keep";
  readonly refreshTargets: readonly MarketSwitchRefreshTarget[];
  readonly preservedResources: readonly MarketSwitchPreservedResource[];
  readonly currentCartPolicy: "preserve_without_conversion";
  readonly currentCartSnapshot: MarketScopedCartSnapshot | null;
  readonly shouldRemountPayPalProvider: boolean;
  readonly requiresWholeAppReload: false;
}

const defaultPaymentComponents: readonly PaymentComponent[] = [
  "paypal-payments",
  "paypal-messages",
  "card-fields",
  "venmo-payments",
  "applepay-payments",
  "googlepay-payments",
];

const marketSwitchRefreshTargets: readonly MarketSwitchRefreshTarget[] = [
  "config",
  "catalog",
  "cart",
  "paypal_sdk_config",
];

const preservedMarketSwitchResources: readonly MarketSwitchPreservedResource[] =
  ["orders", "inventory", "users", "saved_payments", "reviews", "webhooks"];

const marketConfigs: Record<MarketCode, MarketConfig> = {
  US: {
    code: "US",
    currencyCode: "USD",
    locale: "en-US",
    languageCode: "en",
    buyerCountry: "US",
    payLaterBuyerCountry: "US",
    sandboxTestBuyerCountry: "US",
    marketVersion: 1,
    paymentComponents: defaultPaymentComponents,
  },
  GB: {
    code: "GB",
    currencyCode: "GBP",
    locale: "en-GB",
    languageCode: "en",
    buyerCountry: "GB",
    payLaterBuyerCountry: "GB",
    sandboxTestBuyerCountry: "GB",
    marketVersion: 1,
    paymentComponents: defaultPaymentComponents,
  },
};

export function getMarketConfig(code: MarketCode): MarketConfig {
  return marketConfigs[code];
}

export function normalizePaymentComponents(
  components: readonly PaymentComponent[],
): PaymentComponent[] {
  return Array.from(new Set(components)).sort();
}

export function buildPayPalProviderKey(input: PayPalProviderKeyInput): string {
  const market = input.market;
  const components = normalizePaymentComponents(
    input.components ?? market.paymentComponents,
  );
  return [
    "paypal",
    input.environment,
    input.clientId,
    market.code,
    market.currencyCode,
    market.locale,
    market.buyerCountry,
    market.payLaterBuyerCountry,
    market.sandboxTestBuyerCountry,
    market.marketVersion,
    components.join(","),
  ].join(":");
}

export function planMarketSwitch(
  input: PlanMarketSwitchInput,
): MarketSwitchPlan {
  const currentCartSnapshot = input.currentCart ?? null;
  validateCurrentCartSnapshot(
    currentCartSnapshot,
    input.currentProfileId,
    input.currentMarket,
  );

  const hasContextChange =
    input.currentProfileId !== input.nextProfileId ||
    input.currentMarket.code !== input.nextMarket.code;

  if (!hasContextChange) {
    return {
      kind: "no_change",
      nextProfileId: input.nextProfileId,
      nextMarketId: input.nextMarket.code,
      activeCartBinding: input.activeCartBinding,
      cartAction: {
        type: "keep_current",
      },
      checkoutDraftAction: "keep",
      paymentSessionAction: "keep",
      refreshTargets: [],
      preservedResources: preservedMarketSwitchResources,
      currentCartPolicy: "preserve_without_conversion",
      currentCartSnapshot,
      shouldRemountPayPalProvider:
        input.currentProviderKey !== input.nextProviderKey,
      requiresWholeAppReload: false,
    };
  }

  return {
    kind: "switch",
    nextProfileId: input.nextProfileId,
    nextMarketId: input.nextMarket.code,
    activeCartBinding: null,
    cartAction: {
      type: "fetch_or_create",
      profileId: input.nextProfileId,
      marketId: input.nextMarket.code,
    },
    checkoutDraftAction: "clear",
    paymentSessionAction: "clear",
    refreshTargets: marketSwitchRefreshTargets,
    preservedResources: preservedMarketSwitchResources,
    currentCartPolicy: "preserve_without_conversion",
    currentCartSnapshot,
    shouldRemountPayPalProvider:
      input.currentProviderKey !== input.nextProviderKey,
    requiresWholeAppReload: false,
  };
}

function validateCurrentCartSnapshot(
  cart: MarketScopedCartSnapshot | null,
  currentProfileId: string,
  currentMarket: MarketConfig,
): void {
  if (!cart) {
    return;
  }
  if (
    cart.profileId !== currentProfileId ||
    cart.marketId !== currentMarket.code
  ) {
    throw new Error("current cart must match its locked profile and market");
  }
  if (cart.currencyCode !== currentMarket.currencyCode) {
    throw new Error(
      "current cart currency must match its locked market currency",
    );
  }
  if (
    cart.lineCurrencyCodes.some(
      (currencyCode) => currencyCode !== cart.currencyCode,
    )
  ) {
    throw new Error("current cart line currency must match cart currency");
  }
}

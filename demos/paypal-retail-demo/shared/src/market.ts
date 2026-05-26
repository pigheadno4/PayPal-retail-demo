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

const defaultPaymentComponents: readonly PaymentComponent[] = [
  "paypal-payments",
  "paypal-messages",
  "card-fields",
  "venmo-payments",
  "applepay-payments",
  "googlepay-payments",
];

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

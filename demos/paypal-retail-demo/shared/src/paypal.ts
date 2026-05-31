import {
  addMinor,
  assertMinorUnit,
  multiplyMinor,
  subtractMinor,
  type MinorUnit,
} from "./money.js";
import { buildPayPalInvoiceId } from "./orderNumbers.js";
import {
  buildPayPalProviderKey,
  normalizePaymentComponents,
  type MarketConfig,
  type PayPalEnvironment,
  type PaymentComponent,
} from "./market.js";

export type PayPalCurrencyCode = "USD" | "GBP";
export type PayPalShippingPreference =
  | "GET_FROM_FILE"
  | "SET_PROVIDED_ADDRESS"
  | "NO_SHIPPING";
export type PayPalShippingCallbackEvent =
  | "SHIPPING_ADDRESS"
  | "SHIPPING_OPTIONS";
export type PayPalShippingType = "PICKUP_IN_STORE";
export type PayPalSdkPageType =
  | "home"
  | "product-details"
  | "cart"
  | "mini-cart"
  | "checkout"
  | "admin";
export type PayPalSdkFlow = "standard" | "vaulting";
export type PayPalPaymentMethod =
  | "paypal"
  | "paylater"
  | "card"
  | "apple_pay"
  | "google_pay"
  | "venmo";
export type PayPalVaultingPaymentMethod = "paypal" | "card";
export type PayPalClientTokenErrorCode =
  | "GUEST_VAULTING_NOT_ALLOWED"
  | "UNSUPPORTED_VAULTING_METHOD"
  | "CLIENT_TOKEN_DOMAIN_REQUIRED";
export type PayPalRequestMetadataAction = "generate" | "reuse";
export type PayPalRequestMetadataReason =
  | "fresh_payment_session"
  | "same_payload_retry"
  | "payload_changed";

export interface PayPalMoney {
  readonly currency_code: PayPalCurrencyCode;
  readonly value: string;
}

export interface PayPalOrderLineItemInput {
  readonly name: string;
  readonly quantity: number;
  readonly unitAmountMinor: number;
  readonly sku?: string | null;
  readonly description?: string | null;
  readonly url?: string | null;
  readonly imageUrl?: string | null;
}

export interface PayPalDeliveryAddressInput {
  readonly fullName: string;
  readonly addressLine1: string;
  readonly addressLine2?: string | null;
  readonly adminArea2: string;
  readonly adminArea1?: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
}

export interface PayPalPickupStoreInput {
  readonly storeName: string;
  readonly addressLine1: string;
  readonly addressLine2?: string | null;
  readonly adminArea2: string;
  readonly adminArea1?: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
}

export interface BuildPayPalDeliveryCreateOrderInput {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly shippingAddress: PayPalDeliveryAddressInput;
}

export interface BuildPayPalExpressDeliveryCreateOrderInput {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly shippingCallbackUrl: string;
  readonly callbackEvents?: readonly PayPalShippingCallbackEvent[];
}

export interface BuildPayPalBopisCreateOrderInput {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly pickupStore: PayPalPickupStoreInput;
}

export interface BuildPayPalSdkConfigInput {
  readonly clientId: string;
  readonly environment: PayPalEnvironment;
  readonly market: MarketConfig;
  readonly pageType: PayPalSdkPageType;
  readonly flow: PayPalSdkFlow;
  readonly method: PayPalPaymentMethod;
  readonly components?: readonly PaymentComponent[];
}

export interface PayPalSdkConfig {
  readonly client_id: string;
  readonly environment: PayPalEnvironment;
  readonly sdk_url: string;
  readonly currency_code: PayPalCurrencyCode;
  readonly locale: string;
  readonly buyer_country: MarketConfig["buyerCountry"];
  readonly paylater_buyer_country: MarketConfig["payLaterBuyerCountry"];
  readonly sandbox_test_buyer_country:
    | MarketConfig["sandboxTestBuyerCountry"]
    | null;
  readonly components: readonly PaymentComponent[];
  readonly page_type: PayPalSdkPageType;
  readonly provider_key: string;
  readonly needs_client_token: boolean;
}

export type PayPalClientTokenBuyer =
  | {
      readonly kind: "guest";
    }
  | {
      readonly kind: "authenticated";
      readonly userId: string;
      readonly paypalCustomerId?: string | null;
    };

export interface PlanPayPalClientTokenRequestInput {
  readonly flow: PayPalSdkFlow;
  readonly method: PayPalPaymentMethod;
  readonly buyer: PayPalClientTokenBuyer;
  readonly domains: readonly string[];
}

export type PayPalClientTokenRequestPlan =
  | {
      readonly action: "not_required";
      readonly reason: "standard_flow_uses_client_id";
      readonly needs_client_token: false;
    }
  | {
      readonly action: "reject";
      readonly http_status: 400 | 403;
      readonly error_code: PayPalClientTokenErrorCode;
      readonly message: string;
      readonly needs_client_token: true;
    }
  | {
      readonly action: "generate";
      readonly method: PayPalVaultingPaymentMethod;
      readonly buyer_user_id: string;
      readonly paypal_customer_id?: string;
      readonly domains: readonly string[];
      readonly paypal_oauth_form: {
        readonly grant_type: "client_credentials";
        readonly response_type: "client_token";
        readonly domains: readonly string[];
        readonly target_customer_id?: string;
      };
      readonly expires_in_seconds: 900;
      readonly needs_client_token: true;
    };

export interface PreviousPayPalRequestMetadata {
  readonly paypalInvoiceId: string;
  readonly paypalRequestId: string;
  readonly attemptNumber: number;
  readonly payloadFingerprint: string;
}

export interface PlanPayPalRequestMetadataInput {
  readonly orderNumber: string;
  readonly attemptNumber: number;
  readonly payloadFingerprint: string;
  readonly nextPayPalRequestId: string;
  readonly previousRequest?: PreviousPayPalRequestMetadata | null;
}

export interface PayPalRequestMetadataPlan {
  readonly action: PayPalRequestMetadataAction;
  readonly reason: PayPalRequestMetadataReason;
  readonly paypal_invoice_id: string;
  readonly paypal_request_id: string;
  readonly attempt_number: number;
  readonly payload_fingerprint: string;
}

export interface PayPalCreateOrderPayload {
  readonly intent: "CAPTURE";
  readonly purchase_units: readonly PayPalPurchaseUnit[];
  readonly payment_source: {
    readonly paypal: {
      readonly experience_context: {
        readonly shipping_preference: PayPalShippingPreference;
        readonly order_update_callback_config?: PayPalOrderUpdateCallbackConfig;
      };
    };
  };
}

export interface PayPalOrderUpdateCallbackConfig {
  readonly callback_events: readonly PayPalShippingCallbackEvent[];
  readonly callback_url: string;
}

export interface PayPalPurchaseUnit {
  readonly invoice_id: string;
  readonly items: readonly PayPalOrderLineItem[];
  readonly amount: {
    readonly currency_code: PayPalCurrencyCode;
    readonly value: string;
    readonly breakdown: PayPalAmountBreakdown;
  };
  readonly shipping?: PayPalShipping;
}

export interface PayPalOrderLineItem {
  readonly name: string;
  readonly quantity: string;
  readonly sku?: string;
  readonly description?: string;
  readonly url?: string;
  readonly image_url?: string;
  readonly category: "PHYSICAL_GOODS";
  readonly unit_amount: PayPalMoney;
}

export interface PayPalAmountBreakdown {
  readonly item_total: PayPalMoney;
  readonly shipping?: PayPalMoney;
  readonly tax_total: PayPalMoney;
  readonly discount?: PayPalMoney;
}

export interface PayPalShipping {
  readonly type?: PayPalShippingType;
  readonly name: {
    readonly full_name: string;
  };
  readonly address: {
    readonly address_line_1: string;
    readonly address_line_2?: string;
    readonly admin_area_2: string;
    readonly admin_area_1?: string;
    readonly postal_code: string;
    readonly country_code: string;
  };
}

export function buildPayPalDeliveryCreateOrderPayload(
  input: BuildPayPalDeliveryCreateOrderInput,
): PayPalCreateOrderPayload {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        ...buildPayPalPurchaseUnitBase(input),
        shipping: buildPayPalShipping(input.shippingAddress),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "SET_PROVIDED_ADDRESS",
        },
      },
    },
  };
}

export function buildPayPalExpressDeliveryCreateOrderPayload(
  input: BuildPayPalExpressDeliveryCreateOrderInput,
): PayPalCreateOrderPayload {
  return {
    intent: "CAPTURE",
    purchase_units: [buildPayPalPurchaseUnitBase(input)],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "GET_FROM_FILE",
          order_update_callback_config: buildShippingCallbackConfig(input),
        },
      },
    },
  };
}

export function buildPayPalBopisCreateOrderPayload(
  input: BuildPayPalBopisCreateOrderInput,
): PayPalCreateOrderPayload {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        ...buildPayPalPurchaseUnitBase({
          ...input,
          shippingAmountMinor: 0,
          includeShippingBreakdown: false,
        }),
        shipping: buildPayPalPickupStoreShipping(input.pickupStore),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "SET_PROVIDED_ADDRESS",
        },
      },
    },
  };
}

export function buildPayPalSdkConfig(
  input: BuildPayPalSdkConfigInput,
): PayPalSdkConfig {
  const clientId = assertNonEmptyString(input.clientId, "PayPal client ID");
  const components = normalizePaymentComponents(
    input.components ?? input.market.paymentComponents,
  );

  return {
    client_id: clientId,
    environment: input.environment,
    sdk_url: getPayPalSdkUrl(input.environment),
    currency_code: input.market.currencyCode,
    locale: input.market.locale,
    buyer_country: input.market.buyerCountry,
    paylater_buyer_country: input.market.payLaterBuyerCountry,
    sandbox_test_buyer_country:
      input.environment === "sandbox"
        ? input.market.sandboxTestBuyerCountry
        : null,
    components,
    page_type: input.pageType,
    provider_key: buildPayPalProviderKey({
      clientId,
      environment: input.environment,
      market: input.market,
      components,
    }),
    needs_client_token: input.flow === "vaulting",
  };
}

export function planPayPalClientTokenRequest(
  input: PlanPayPalClientTokenRequestInput,
): PayPalClientTokenRequestPlan {
  if (input.flow === "standard") {
    return {
      action: "not_required",
      reason: "standard_flow_uses_client_id",
      needs_client_token: false,
    };
  }

  if (input.buyer.kind === "guest") {
    return {
      action: "reject",
      http_status: 403,
      error_code: "GUEST_VAULTING_NOT_ALLOWED",
      message: "Sign in to save a payment method.",
      needs_client_token: true,
    };
  }

  if (!isVaultingPaymentMethod(input.method)) {
    return {
      action: "reject",
      http_status: 400,
      error_code: "UNSUPPORTED_VAULTING_METHOD",
      message: "Client token vaulting is supported for card and PayPal only.",
      needs_client_token: true,
    };
  }

  const domains = normalizeClientTokenDomains(input.domains);
  if (domains.length === 0) {
    return {
      action: "reject",
      http_status: 400,
      error_code: "CLIENT_TOKEN_DOMAIN_REQUIRED",
      message: "At least one client-token domain is required.",
      needs_client_token: true,
    };
  }

  const paypalCustomerId = input.buyer.paypalCustomerId?.trim();

  return {
    action: "generate",
    method: input.method,
    buyer_user_id: input.buyer.userId,
    ...(paypalCustomerId ? { paypal_customer_id: paypalCustomerId } : {}),
    domains,
    paypal_oauth_form: {
      grant_type: "client_credentials",
      response_type: "client_token",
      domains,
      ...(paypalCustomerId ? { target_customer_id: paypalCustomerId } : {}),
    },
    expires_in_seconds: 900,
    needs_client_token: true,
  };
}

export function planPayPalRequestMetadata(
  input: PlanPayPalRequestMetadataInput,
): PayPalRequestMetadataPlan {
  const payloadFingerprint = assertNonEmptyString(
    input.payloadFingerprint,
    "payload fingerprint",
  );
  const previousRequest = input.previousRequest ?? null;

  if (
    previousRequest &&
    previousRequest.payloadFingerprint.trim() === payloadFingerprint
  ) {
    return {
      action: "reuse",
      reason: "same_payload_retry",
      paypal_invoice_id: previousRequest.paypalInvoiceId,
      paypal_request_id: previousRequest.paypalRequestId,
      attempt_number: previousRequest.attemptNumber,
      payload_fingerprint: payloadFingerprint,
    };
  }

  const paypalRequestId = assertNonEmptyString(
    input.nextPayPalRequestId,
    "PayPal request ID",
  );

  return {
    action: "generate",
    reason: previousRequest ? "payload_changed" : "fresh_payment_session",
    paypal_invoice_id: buildPayPalInvoiceId(
      input.orderNumber,
      input.attemptNumber,
    ),
    paypal_request_id: paypalRequestId,
    attempt_number: input.attemptNumber,
    payload_fingerprint: payloadFingerprint,
  };
}

function buildPayPalPurchaseUnitBase(input: {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly includeShippingBreakdown?: boolean;
}): PayPalPurchaseUnit {
  const items = input.items.map((item) =>
    buildPayPalLineItem(item, input.currencyCode),
  );
  const itemTotalMinor = calculateItemTotalMinor(input.items);
  const shippingMinor = assertMinorUnit(
    input.shippingAmountMinor,
    "shipping amount",
  );
  const taxMinor = assertMinorUnit(input.taxAmountMinor, "tax amount");
  const discountMinor = assertMinorUnit(
    input.discountAmountMinor,
    "discount amount",
  );
  const totalBeforeDiscount = addMinor([
    itemTotalMinor,
    shippingMinor,
    taxMinor,
  ]);
  const orderTotalMinor = subtractMinor(totalBeforeDiscount, discountMinor);
  const includeShippingBreakdown = input.includeShippingBreakdown ?? true;
  const breakdown: PayPalAmountBreakdown = {
    item_total: toPayPalMoney(input.currencyCode, itemTotalMinor),
    ...(includeShippingBreakdown
      ? { shipping: toPayPalMoney(input.currencyCode, shippingMinor) }
      : {}),
    tax_total: toPayPalMoney(input.currencyCode, taxMinor),
    ...(discountMinor > 0
      ? { discount: toPayPalMoney(input.currencyCode, discountMinor) }
      : {}),
  };

  return {
    invoice_id: input.orderNumber,
    items,
    amount: {
      currency_code: input.currencyCode,
      value: formatMinorUnit(orderTotalMinor),
      breakdown,
    },
  };
}

function buildShippingCallbackConfig(
  input: BuildPayPalExpressDeliveryCreateOrderInput,
): PayPalOrderUpdateCallbackConfig {
  assertHttpsUrl(input.shippingCallbackUrl);
  const callbackEvents = input.callbackEvents ?? ["SHIPPING_ADDRESS"];
  if (callbackEvents.length === 0) {
    throw new Error("at least one shipping callback event is required");
  }
  for (const callbackEvent of callbackEvents) {
    if (
      callbackEvent !== "SHIPPING_ADDRESS" &&
      callbackEvent !== "SHIPPING_OPTIONS"
    ) {
      throw new Error(`unsupported shipping callback event: ${callbackEvent}`);
    }
  }

  return {
    callback_events: [...new Set(callbackEvents)],
    callback_url: input.shippingCallbackUrl,
  };
}

function buildPayPalLineItem(
  item: PayPalOrderLineItemInput,
  currencyCode: PayPalCurrencyCode,
): PayPalOrderLineItem {
  const quantity = assertPositiveQuantity(item.quantity, "quantity");
  const unitAmountMinor = assertMinorUnit(item.unitAmountMinor, "unit amount");
  return {
    name: item.name,
    quantity: String(quantity),
    ...(item.sku ? { sku: item.sku } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.url ? { url: item.url } : {}),
    ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
    category: "PHYSICAL_GOODS",
    unit_amount: toPayPalMoney(currencyCode, unitAmountMinor),
  };
}

function calculateItemTotalMinor(
  items: readonly PayPalOrderLineItemInput[],
): MinorUnit {
  if (items.length === 0) {
    throw new Error("at least one PayPal line item is required");
  }
  return addMinor(
    items.map((item) =>
      multiplyMinor(
        assertMinorUnit(item.unitAmountMinor, "unit amount"),
        assertPositiveQuantity(item.quantity, "quantity"),
      ),
    ),
  );
}

function buildPayPalShipping(
  address: PayPalDeliveryAddressInput,
): PayPalShipping {
  return {
    name: {
      full_name: address.fullName,
    },
    address: {
      address_line_1: address.addressLine1,
      ...(address.addressLine2 ? { address_line_2: address.addressLine2 } : {}),
      admin_area_2: address.adminArea2,
      ...(address.adminArea1 ? { admin_area_1: address.adminArea1 } : {}),
      postal_code: address.postalCode,
      country_code: address.countryCode,
    },
  };
}

function buildPayPalPickupStoreShipping(
  pickupStore: PayPalPickupStoreInput,
): PayPalShipping {
  return {
    type: "PICKUP_IN_STORE",
    name: {
      full_name: `s2s ${pickupStore.storeName}`,
    },
    address: {
      address_line_1: pickupStore.addressLine1,
      ...(pickupStore.addressLine2
        ? { address_line_2: pickupStore.addressLine2 }
        : {}),
      admin_area_2: pickupStore.adminArea2,
      ...(pickupStore.adminArea1
        ? { admin_area_1: pickupStore.adminArea1 }
        : {}),
      postal_code: pickupStore.postalCode,
      country_code: pickupStore.countryCode,
    },
  };
}

function toPayPalMoney(
  currencyCode: PayPalCurrencyCode,
  amountMinor: number,
): PayPalMoney {
  return {
    currency_code: currencyCode,
    value: formatMinorUnit(assertMinorUnit(amountMinor)),
  };
}

function formatMinorUnit(amountMinor: number): string {
  const amount = assertMinorUnit(amountMinor);
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function assertPositiveQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function assertHttpsUrl(value: string): void {
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol === "https:") {
      return;
    }
  } catch {
    // Fall through to the shared validation error.
  }
  throw new Error("shipping callback URL must use https");
}

function getPayPalSdkUrl(environment: PayPalEnvironment): string {
  return environment === "sandbox"
    ? "https://www.sandbox.paypal.com/web-sdk/v6/core"
    : "https://www.paypal.com/web-sdk/v6/core";
}

function assertNonEmptyString(value: string, label: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${label} is required`);
  }
  return trimmedValue;
}

function normalizeClientTokenDomains(domains: readonly string[]): string[] {
  return Array.from(
    new Set(
      domains
        .map((domain) => domain.trim())
        .filter((domain) => domain.length > 0),
    ),
  );
}

function isVaultingPaymentMethod(
  method: PayPalPaymentMethod,
): method is PayPalVaultingPaymentMethod {
  return method === "card" || method === "paypal";
}

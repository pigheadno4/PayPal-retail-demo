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
export type PayPalPaymentEligibilityKey =
  | "paypal"
  | "paylater"
  | "advanced_cards"
  | "applepay"
  | "googlepay"
  | "venmo";
export type PayPalPaymentEligibilitySource =
  | "findEligibleMethods"
  | "applepay_config"
  | "googlepay_config";
export type PayPalPaymentMethodActionSurface = "order_summary" | "card_box";
export type PayPalPaymentMethodButtonElement =
  | "paypal-button"
  | "paypal-pay-later-button"
  | "card-fields"
  | "apple_pay_button"
  | "google_pay_button"
  | "venmo-button";
export type PayPalPaymentSessionMethod =
  | "createPayPalOneTimePaymentSession"
  | "createPayLaterOneTimePaymentSession"
  | "createCardFieldsOneTimePaymentSession"
  | "createApplePayOneTimePaymentSession"
  | "createGooglePayOneTimePaymentSession"
  | "createVenmoOneTimePaymentSession";
export type PayPalPaymentMethodHiddenReason =
  | "market_unsupported"
  | "sdk_component_missing"
  | "runtime_ineligible"
  | "runtime_details_missing";
export type PayPalPaymentSaveCheckboxPlacement =
  | "under_button"
  | "inside_card_box";
export type PayPalPayLaterMessageMode = "none" | "amount_aware";
export type PayPalVaultAttributeAction = "include" | "omit" | "reject";
export type PayPalVaultAttributeReason =
  | "logged_in_save_requested"
  | "not_requested"
  | "guest_vaulting_not_allowed"
  | "unsupported_vaulting_method";
export type PayPalVaultStoreInVault = "ON_SUCCESS";
export type PayPalVaultUsageType = "MERCHANT" | "PLATFORM";
export type PayPalVaultCustomerType = "CONSUMER";
export type PayPalCardVerificationMethod = "SCA_WHEN_REQUIRED" | "SCA_ALWAYS";

export interface PayPalMoney {
  readonly currency_code: PayPalCurrencyCode;
  readonly value: string;
}

export interface PayPalOrderLineItemInput {
  readonly name: string;
  readonly quantity: number;
  readonly unitAmountMinor: number;
  readonly lineTaxAmountMinor?: number | null;
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
  readonly shippingCallbackUrl: string | null;
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

export interface PayPalRuntimeEligibility {
  readonly key: PayPalPaymentEligibilityKey;
  readonly isEligible: boolean;
  readonly details?: {
    readonly productCode?: string | null;
    readonly countryCode?: string | null;
  } | null;
}

export interface PlanPayPalPaymentMethodsInput {
  readonly market: MarketConfig;
  readonly components: readonly PaymentComponent[];
  readonly runtimeEligibility: readonly PayPalRuntimeEligibility[];
  readonly selectedMethod?: PayPalPaymentMethod | null;
}

export interface PayPalPaymentMethodPayLaterDetails {
  readonly product_code: string;
  readonly country_code: string;
}

export interface PayPalPaymentMethodRow {
  readonly method: PayPalPaymentMethod;
  readonly label: string;
  readonly eligibility_key: PayPalPaymentEligibilityKey;
  readonly eligibility_source: PayPalPaymentEligibilitySource;
  readonly required_components: readonly PaymentComponent[];
  readonly sdk_session_method: PayPalPaymentSessionMethod;
  readonly button_element: PayPalPaymentMethodButtonElement;
  readonly action_surface: PayPalPaymentMethodActionSurface;
  readonly mobile_sticky_eligible: boolean;
  readonly paylater_message: PayPalPayLaterMessageMode;
  readonly paylater_details: PayPalPaymentMethodPayLaterDetails | null;
  readonly supports_save_for_future: boolean;
  readonly save_checkbox_placement: PayPalPaymentSaveCheckboxPlacement | null;
}

export interface PayPalHiddenPaymentMethod {
  readonly method: PayPalPaymentMethod;
  readonly reason: PayPalPaymentMethodHiddenReason;
  readonly eligibility_key: PayPalPaymentEligibilityKey;
}

export interface PayPalPaymentMethodPlan {
  readonly selected_method: PayPalPaymentMethod | null;
  readonly default_method: PayPalPaymentMethod | null;
  readonly required_components: readonly PaymentComponent[];
  readonly rows: readonly PayPalPaymentMethodRow[];
  readonly hidden_methods: readonly PayPalHiddenPaymentMethod[];
}

export interface PlanPayPalVaultAttributesInput {
  readonly method: PayPalPaymentMethod;
  readonly saveForFutureRequested: boolean;
  readonly buyer: PayPalClientTokenBuyer;
}

export interface PayPalWalletVaultAttributes {
  readonly vault: {
    readonly store_in_vault: PayPalVaultStoreInVault;
    readonly usage_type: "MERCHANT";
    readonly customer_type: PayPalVaultCustomerType;
  };
}

export interface PayPalCardVaultAttributes {
  readonly customer?: {
    readonly id: string;
  };
  readonly vault: {
    readonly store_in_vault: PayPalVaultStoreInVault;
  };
  readonly verification: {
    readonly method: PayPalCardVerificationMethod;
  };
}

export interface PayPalVaultPaymentSourceAttributes {
  readonly paypal?: {
    readonly attributes: PayPalWalletVaultAttributes;
  };
  readonly card?: {
    readonly attributes: PayPalCardVaultAttributes;
  };
}

export interface PayPalVaultAttributePlan {
  readonly action: PayPalVaultAttributeAction;
  readonly reason: PayPalVaultAttributeReason;
  readonly method: PayPalPaymentMethod;
  readonly vault_requested: boolean;
  readonly requires_client_token: boolean;
  readonly target_customer_id: string | null;
  readonly payment_source: PayPalVaultPaymentSourceAttributes | null;
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
  readonly tax?: PayPalMoney;
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

export type PayPalAmountMismatchReason =
  | "item_total_mismatch"
  | "tax_total_mismatch"
  | "amount_total_mismatch";
export type PayPalCaptureAmountGuardAction = "allow_capture" | "block_capture";
export type PayPalCaptureAmountGuardStatus = "matched" | "mismatch";
export type PayPalCaptureAmountMismatchReason =
  | "currency_code_mismatch"
  | "item_total_mismatch"
  | "shipping_mismatch"
  | "tax_total_mismatch"
  | "discount_mismatch"
  | "total_mismatch";

export interface PayPalAmountMismatch {
  readonly purchase_unit_index: number;
  readonly reason: PayPalAmountMismatchReason;
  readonly expected_minor: number;
  readonly actual_minor: number;
}

export interface PayPalAmountConsistencyCheckResult {
  readonly status: "matched" | "mismatch";
  readonly mismatches: readonly PayPalAmountMismatch[];
}

export interface PayPalCaptureAmountSnapshot {
  readonly currencyCode: PayPalCurrencyCode;
  readonly itemTotalMinor: number;
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly discountMinor: number;
  readonly totalMinor: number;
}

export interface GuardPayPalCaptureAmountConsistencyInput {
  readonly merchantSnapshot: PayPalCaptureAmountSnapshot;
  readonly providerSnapshot: PayPalCaptureAmountSnapshot;
  readonly toleranceMinor?: number;
}

export interface PayPalCaptureAmountMismatch {
  readonly reason: PayPalCaptureAmountMismatchReason;
  readonly expected_minor: number | null;
  readonly actual_minor: number | null;
  readonly expected_currency_code: PayPalCurrencyCode;
  readonly actual_currency_code: PayPalCurrencyCode;
}

export interface PayPalCaptureAmountGuardResult {
  readonly action: PayPalCaptureAmountGuardAction;
  readonly status: PayPalCaptureAmountGuardStatus;
  readonly can_capture: boolean;
  readonly tolerance_minor: number;
  readonly mismatches: readonly PayPalCaptureAmountMismatch[];
}

export type PayPalSnapshotJson =
  | null
  | boolean
  | number
  | string
  | readonly PayPalSnapshotJson[]
  | { readonly [key: string]: PayPalSnapshotJson };

export interface BuildSanitizedPayPalOrderSnapshotInput {
  readonly paymentSessionId: string;
  readonly paypalInvoiceId: string;
  readonly paypalRequestId: string;
  readonly request: unknown;
  readonly response: unknown;
  readonly merchantSnapshot: PayPalCaptureAmountSnapshot;
}

export interface SanitizedPayPalOrderSnapshot {
  readonly payment_session_id: string;
  readonly paypal_invoice_id: string;
  readonly paypal_request_id: string;
  readonly request_json: PayPalSnapshotJson;
  readonly response_json: PayPalSnapshotJson;
  readonly merchant_snapshot_json: {
    readonly currency_code: PayPalCurrencyCode;
    readonly item_total_minor: number;
    readonly shipping_minor: number;
    readonly tax_minor: number;
    readonly discount_minor: number;
    readonly total_minor: number;
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
  const shippingCallbackConfig = buildShippingCallbackConfig(input);

  return {
    intent: "CAPTURE",
    purchase_units: [buildPayPalPurchaseUnitBase(input)],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "GET_FROM_FILE",
          ...(shippingCallbackConfig
            ? { order_update_callback_config: shippingCallbackConfig }
            : {}),
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

export function planPayPalPaymentMethods(
  input: PlanPayPalPaymentMethodsInput,
): PayPalPaymentMethodPlan {
  const availableComponents = new Set(
    normalizePaymentComponents(input.components),
  );
  const runtimeEligibility = new Map(
    input.runtimeEligibility.map((eligibility) => [
      eligibility.key,
      eligibility,
    ]),
  );
  const rows: PayPalPaymentMethodRow[] = [];
  const hiddenMethods: PayPalHiddenPaymentMethod[] = [];

  for (const definition of paypalPaymentMethodDefinitions) {
    const hiddenReason = getPaymentMethodHiddenReason(
      definition,
      input.market,
      availableComponents,
      runtimeEligibility,
    );

    if (hiddenReason) {
      hiddenMethods.push({
        method: definition.method,
        reason: hiddenReason,
        eligibility_key: definition.eligibilityKey,
      });
      continue;
    }

    rows.push(buildPaymentMethodRow(definition, runtimeEligibility));
  }

  const defaultMethod = rows[0]?.method ?? null;
  const selectedMethod =
    rows.some((row) => row.method === input.selectedMethod) &&
    input.selectedMethod
      ? input.selectedMethod
      : defaultMethod;

  return {
    selected_method: selectedMethod,
    default_method: defaultMethod,
    required_components: normalizePaymentComponents(
      rows.flatMap((row) => row.required_components),
    ),
    rows,
    hidden_methods: hiddenMethods,
  };
}

export function planPayPalVaultAttributes(
  input: PlanPayPalVaultAttributesInput,
): PayPalVaultAttributePlan {
  if (!input.saveForFutureRequested) {
    return buildVaultAttributePlan({
      action: "omit",
      reason: "not_requested",
      method: input.method,
      vaultRequested: false,
    });
  }

  if (input.buyer.kind === "guest") {
    return buildVaultAttributePlan({
      action: "reject",
      reason: "guest_vaulting_not_allowed",
      method: input.method,
      vaultRequested: true,
    });
  }

  if (!isVaultingPaymentMethod(input.method)) {
    return buildVaultAttributePlan({
      action: "reject",
      reason: "unsupported_vaulting_method",
      method: input.method,
      vaultRequested: true,
    });
  }

  const targetCustomerId = normalizeOptionalString(
    input.buyer.paypalCustomerId,
  );

  return buildVaultAttributePlan({
    action: "include",
    reason: "logged_in_save_requested",
    method: input.method,
    vaultRequested: true,
    requiresClientToken: true,
    targetCustomerId,
    paymentSource:
      input.method === "paypal"
        ? buildPayPalWalletVaultPaymentSource()
        : buildCardVaultPaymentSource(targetCustomerId),
  });
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

interface PayPalPaymentMethodDefinition {
  readonly method: PayPalPaymentMethod;
  readonly label: string;
  readonly eligibilityKey: PayPalPaymentEligibilityKey;
  readonly eligibilitySource: PayPalPaymentEligibilitySource;
  readonly requiredComponents: readonly PaymentComponent[];
  readonly sdkSessionMethod: PayPalPaymentSessionMethod;
  readonly buttonElement: PayPalPaymentMethodButtonElement;
  readonly actionSurface: PayPalPaymentMethodActionSurface;
  readonly mobileStickyEligible: boolean;
  readonly payLaterMessage: PayPalPayLaterMessageMode;
  readonly supportsSaveForFuture: boolean;
  readonly saveCheckboxPlacement: PayPalPaymentSaveCheckboxPlacement | null;
}

const paypalPaymentMethodDefinitions: readonly PayPalPaymentMethodDefinition[] =
  [
    {
      method: "paypal",
      label: "PayPal",
      eligibilityKey: "paypal",
      eligibilitySource: "findEligibleMethods",
      requiredComponents: ["paypal-payments"],
      sdkSessionMethod: "createPayPalOneTimePaymentSession",
      buttonElement: "paypal-button",
      actionSurface: "order_summary",
      mobileStickyEligible: true,
      payLaterMessage: "none",
      supportsSaveForFuture: true,
      saveCheckboxPlacement: "under_button",
    },
    {
      method: "paylater",
      label: "Pay Later",
      eligibilityKey: "paylater",
      eligibilitySource: "findEligibleMethods",
      requiredComponents: ["paypal-payments", "paypal-messages"],
      sdkSessionMethod: "createPayLaterOneTimePaymentSession",
      buttonElement: "paypal-pay-later-button",
      actionSurface: "order_summary",
      mobileStickyEligible: true,
      payLaterMessage: "amount_aware",
      supportsSaveForFuture: false,
      saveCheckboxPlacement: null,
    },
    {
      method: "card",
      label: "Credit or debit card",
      eligibilityKey: "advanced_cards",
      eligibilitySource: "findEligibleMethods",
      requiredComponents: ["card-fields"],
      sdkSessionMethod: "createCardFieldsOneTimePaymentSession",
      buttonElement: "card-fields",
      actionSurface: "card_box",
      mobileStickyEligible: false,
      payLaterMessage: "none",
      supportsSaveForFuture: true,
      saveCheckboxPlacement: "inside_card_box",
    },
    {
      method: "apple_pay",
      label: "Apple Pay",
      eligibilityKey: "applepay",
      eligibilitySource: "applepay_config",
      requiredComponents: ["applepay-payments"],
      sdkSessionMethod: "createApplePayOneTimePaymentSession",
      buttonElement: "apple_pay_button",
      actionSurface: "order_summary",
      mobileStickyEligible: true,
      payLaterMessage: "none",
      supportsSaveForFuture: false,
      saveCheckboxPlacement: null,
    },
    {
      method: "google_pay",
      label: "Google Pay",
      eligibilityKey: "googlepay",
      eligibilitySource: "googlepay_config",
      requiredComponents: ["googlepay-payments"],
      sdkSessionMethod: "createGooglePayOneTimePaymentSession",
      buttonElement: "google_pay_button",
      actionSurface: "order_summary",
      mobileStickyEligible: true,
      payLaterMessage: "none",
      supportsSaveForFuture: false,
      saveCheckboxPlacement: null,
    },
    {
      method: "venmo",
      label: "Venmo",
      eligibilityKey: "venmo",
      eligibilitySource: "findEligibleMethods",
      requiredComponents: ["venmo-payments"],
      sdkSessionMethod: "createVenmoOneTimePaymentSession",
      buttonElement: "venmo-button",
      actionSurface: "order_summary",
      mobileStickyEligible: true,
      payLaterMessage: "none",
      supportsSaveForFuture: false,
      saveCheckboxPlacement: null,
    },
  ];

function getPaymentMethodHiddenReason(
  definition: PayPalPaymentMethodDefinition,
  market: MarketConfig,
  availableComponents: ReadonlySet<PaymentComponent>,
  runtimeEligibility: ReadonlyMap<
    PayPalPaymentEligibilityKey,
    PayPalRuntimeEligibility
  >,
): PayPalPaymentMethodHiddenReason | null {
  if (
    definition.method === "venmo" &&
    (market.code !== "US" || market.currencyCode !== "USD")
  ) {
    return "market_unsupported";
  }

  if (
    definition.requiredComponents.some(
      (component) => !availableComponents.has(component),
    )
  ) {
    return "sdk_component_missing";
  }

  const eligibility = runtimeEligibility.get(definition.eligibilityKey);
  if (!eligibility?.isEligible) {
    return "runtime_ineligible";
  }

  if (
    definition.method === "paylater" &&
    !getPayLaterDetails(runtimeEligibility)
  ) {
    return "runtime_details_missing";
  }

  return null;
}

function buildPaymentMethodRow(
  definition: PayPalPaymentMethodDefinition,
  runtimeEligibility: ReadonlyMap<
    PayPalPaymentEligibilityKey,
    PayPalRuntimeEligibility
  >,
): PayPalPaymentMethodRow {
  return {
    method: definition.method,
    label: definition.label,
    eligibility_key: definition.eligibilityKey,
    eligibility_source: definition.eligibilitySource,
    required_components: normalizePaymentComponents(
      definition.requiredComponents,
    ),
    sdk_session_method: definition.sdkSessionMethod,
    button_element: definition.buttonElement,
    action_surface: definition.actionSurface,
    mobile_sticky_eligible: definition.mobileStickyEligible,
    paylater_message: definition.payLaterMessage,
    paylater_details:
      definition.method === "paylater"
        ? getPayLaterDetails(runtimeEligibility)
        : null,
    supports_save_for_future: definition.supportsSaveForFuture,
    save_checkbox_placement: definition.saveCheckboxPlacement,
  };
}

function getPayLaterDetails(
  runtimeEligibility: ReadonlyMap<
    PayPalPaymentEligibilityKey,
    PayPalRuntimeEligibility
  >,
): PayPalPaymentMethodPayLaterDetails | null {
  const details = runtimeEligibility.get("paylater")?.details;
  const productCode = details?.productCode?.trim();
  const countryCode = details?.countryCode?.trim();

  if (!productCode || !countryCode) {
    return null;
  }

  return {
    product_code: productCode,
    country_code: countryCode,
  };
}

function buildVaultAttributePlan(input: {
  readonly action: PayPalVaultAttributeAction;
  readonly reason: PayPalVaultAttributeReason;
  readonly method: PayPalPaymentMethod;
  readonly vaultRequested: boolean;
  readonly requiresClientToken?: boolean;
  readonly targetCustomerId?: string | null;
  readonly paymentSource?: PayPalVaultPaymentSourceAttributes | null;
}): PayPalVaultAttributePlan {
  return {
    action: input.action,
    reason: input.reason,
    method: input.method,
    vault_requested: input.vaultRequested,
    requires_client_token: input.requiresClientToken ?? false,
    target_customer_id: input.targetCustomerId ?? null,
    payment_source: input.paymentSource ?? null,
  };
}

function buildPayPalWalletVaultPaymentSource(): PayPalVaultPaymentSourceAttributes {
  return {
    paypal: {
      attributes: {
        vault: {
          store_in_vault: "ON_SUCCESS",
          usage_type: "MERCHANT",
          customer_type: "CONSUMER",
        },
      },
    },
  };
}

function buildCardVaultPaymentSource(
  targetCustomerId: string | null,
): PayPalVaultPaymentSourceAttributes {
  return {
    card: {
      attributes: {
        ...(targetCustomerId ? { customer: { id: targetCustomerId } } : {}),
        vault: {
          store_in_vault: "ON_SUCCESS",
        },
        verification: {
          method: "SCA_WHEN_REQUIRED",
        },
      },
    },
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

export function checkPayPalCreateOrderAmountConsistency(
  payload: PayPalCreateOrderPayload,
  toleranceMinor = 0,
): PayPalAmountConsistencyCheckResult {
  const tolerance = assertMinorUnit(toleranceMinor, "amount tolerance");
  const mismatches = payload.purchase_units.flatMap((purchaseUnit, index) =>
    checkPurchaseUnitAmountConsistency(purchaseUnit, index, tolerance),
  );

  return {
    status: mismatches.length === 0 ? "matched" : "mismatch",
    mismatches,
  };
}

export function extractPayPalPurchaseUnitAmountSnapshot(
  purchaseUnit: PayPalPurchaseUnit,
): PayPalCaptureAmountSnapshot {
  const breakdown = purchaseUnit.amount.breakdown;

  return {
    currencyCode: purchaseUnit.amount.currency_code,
    itemTotalMinor: parsePayPalMoneyMinor(breakdown.item_total),
    shippingMinor: breakdown.shipping
      ? parsePayPalMoneyMinor(breakdown.shipping)
      : 0,
    taxMinor: parsePayPalMoneyMinor(breakdown.tax_total),
    discountMinor: breakdown.discount
      ? parsePayPalMoneyMinor(breakdown.discount)
      : 0,
    totalMinor: parsePayPalMoneyMinor(purchaseUnit.amount),
  };
}

export function guardPayPalCaptureAmountConsistency(
  input: GuardPayPalCaptureAmountConsistencyInput,
): PayPalCaptureAmountGuardResult {
  const toleranceMinor = assertMinorUnit(
    input.toleranceMinor ?? 0,
    "amount tolerance",
  );
  const merchantSnapshot = normalizeCaptureAmountSnapshot(
    input.merchantSnapshot,
    "merchant",
  );
  const providerSnapshot = normalizeCaptureAmountSnapshot(
    input.providerSnapshot,
    "provider",
  );
  const mismatches: PayPalCaptureAmountMismatch[] = [];

  if (merchantSnapshot.currencyCode !== providerSnapshot.currencyCode) {
    mismatches.push({
      reason: "currency_code_mismatch",
      expected_minor: null,
      actual_minor: null,
      expected_currency_code: merchantSnapshot.currencyCode,
      actual_currency_code: providerSnapshot.currencyCode,
    });
  }

  pushCaptureAmountMismatch(
    mismatches,
    "item_total_mismatch",
    merchantSnapshot.itemTotalMinor,
    providerSnapshot.itemTotalMinor,
    merchantSnapshot.currencyCode,
    providerSnapshot.currencyCode,
    toleranceMinor,
  );
  pushCaptureAmountMismatch(
    mismatches,
    "shipping_mismatch",
    merchantSnapshot.shippingMinor,
    providerSnapshot.shippingMinor,
    merchantSnapshot.currencyCode,
    providerSnapshot.currencyCode,
    toleranceMinor,
  );
  pushCaptureAmountMismatch(
    mismatches,
    "tax_total_mismatch",
    merchantSnapshot.taxMinor,
    providerSnapshot.taxMinor,
    merchantSnapshot.currencyCode,
    providerSnapshot.currencyCode,
    toleranceMinor,
  );
  pushCaptureAmountMismatch(
    mismatches,
    "discount_mismatch",
    merchantSnapshot.discountMinor,
    providerSnapshot.discountMinor,
    merchantSnapshot.currencyCode,
    providerSnapshot.currencyCode,
    toleranceMinor,
  );
  pushCaptureAmountMismatch(
    mismatches,
    "total_mismatch",
    merchantSnapshot.totalMinor,
    providerSnapshot.totalMinor,
    merchantSnapshot.currencyCode,
    providerSnapshot.currencyCode,
    toleranceMinor,
  );

  const status = mismatches.length === 0 ? "matched" : "mismatch";

  return {
    action: status === "matched" ? "allow_capture" : "block_capture",
    status,
    can_capture: status === "matched",
    tolerance_minor: toleranceMinor,
    mismatches,
  };
}

export function buildSanitizedPayPalOrderSnapshot(
  input: BuildSanitizedPayPalOrderSnapshotInput,
): SanitizedPayPalOrderSnapshot {
  const merchantSnapshot = normalizeCaptureAmountSnapshot(
    input.merchantSnapshot,
    "merchant",
  );

  return {
    payment_session_id: assertNonEmptyString(
      input.paymentSessionId,
      "payment session ID",
    ),
    paypal_invoice_id: assertNonEmptyString(
      input.paypalInvoiceId,
      "PayPal invoice ID",
    ),
    paypal_request_id: assertNonEmptyString(
      input.paypalRequestId,
      "PayPal request ID",
    ),
    request_json: sanitizePayPalSnapshotValue(input.request),
    response_json: sanitizePayPalSnapshotValue(input.response),
    merchant_snapshot_json: {
      currency_code: merchantSnapshot.currencyCode,
      item_total_minor: merchantSnapshot.itemTotalMinor,
      shipping_minor: merchantSnapshot.shippingMinor,
      tax_minor: merchantSnapshot.taxMinor,
      discount_minor: merchantSnapshot.discountMinor,
      total_minor: merchantSnapshot.totalMinor,
    },
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
  const itemTotalMinor = calculateItemTotalMinor(input.items);
  const shippingMinor = assertMinorUnit(
    input.shippingAmountMinor,
    "shipping amount",
  );
  const taxMinor = assertMinorUnit(input.taxAmountMinor, "tax amount");
  const items = buildPayPalLineItems(input.items, input.currencyCode, taxMinor);
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
): PayPalOrderUpdateCallbackConfig | undefined {
  const shippingCallbackUrl = input.shippingCallbackUrl?.trim();
  if (!shippingCallbackUrl) {
    return undefined;
  }

  assertHttpsUrl(shippingCallbackUrl);
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
    callback_url: shippingCallbackUrl,
  };
}

function buildPayPalLineItem(
  item: PayPalOrderLineItemInput,
  currencyCode: PayPalCurrencyCode,
  options?: {
    readonly quantity?: number;
    readonly unitTaxAmountMinor?: number;
  },
): PayPalOrderLineItem {
  const quantity = assertPositiveQuantity(
    options?.quantity ?? item.quantity,
    "quantity",
  );
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
    ...(options?.unitTaxAmountMinor !== undefined
      ? {
          tax: toPayPalMoney(currencyCode, options.unitTaxAmountMinor),
        }
      : {}),
  };
}

function buildPayPalLineItems(
  items: readonly PayPalOrderLineItemInput[],
  currencyCode: PayPalCurrencyCode,
  taxAmountMinor: number,
): PayPalOrderLineItem[] {
  const hasLineTax = items.some((item) => item.lineTaxAmountMinor != null);
  if (!hasLineTax) {
    return items.map((item) => buildPayPalLineItem(item, currencyCode));
  }

  if (items.some((item) => item.lineTaxAmountMinor == null)) {
    throw new Error(
      "line tax must be provided for every PayPal line item or omitted for all",
    );
  }

  const lineTaxTotalMinor = addMinor(
    items.map((item) =>
      assertMinorUnit(item.lineTaxAmountMinor ?? 0, "line tax amount"),
    ),
  );
  if (lineTaxTotalMinor !== taxAmountMinor) {
    throw new Error("line item tax total must equal purchase-unit tax total");
  }

  return items.flatMap((item) => buildTaxedPayPalLineItems(item, currencyCode));
}

function buildTaxedPayPalLineItems(
  item: PayPalOrderLineItemInput,
  currencyCode: PayPalCurrencyCode,
): PayPalOrderLineItem[] {
  const quantity = assertPositiveQuantity(item.quantity, "quantity");
  const lineTaxAmountMinor = assertMinorUnit(
    item.lineTaxAmountMinor ?? 0,
    "line tax amount",
  );
  const baseUnitTaxMinor = Math.floor(lineTaxAmountMinor / quantity);
  const remainderQuantity = lineTaxAmountMinor % quantity;
  const groupedItems: PayPalOrderLineItem[] = [];

  if (remainderQuantity > 0) {
    groupedItems.push(
      buildPayPalLineItem(item, currencyCode, {
        quantity: remainderQuantity,
        unitTaxAmountMinor: baseUnitTaxMinor + 1,
      }),
    );
  }

  const baseQuantity = quantity - remainderQuantity;
  if (baseQuantity > 0) {
    groupedItems.push(
      buildPayPalLineItem(item, currencyCode, {
        quantity: baseQuantity,
        unitTaxAmountMinor: baseUnitTaxMinor,
      }),
    );
  }

  return groupedItems;
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

function normalizeOptionalString(value?: string | null): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

const redactedSnapshotValue = "[redacted]";

const sensitivePayPalSnapshotKeys = new Set([
  "access_token",
  "authorization",
  "client_secret",
  "cvc",
  "cvv",
  "email_address",
  "id_token",
  "national_number",
  "password",
  "paypal_auth_assertion",
  "phone",
  "phone_number",
  "refresh_token",
  "security_code",
]);

function sanitizePayPalSnapshotValue(value: unknown): PayPalSnapshotJson {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "boolean" ||
    typeof value === "number"
  ) {
    return typeof value === "number" && !Number.isFinite(value) ? null : value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePayPalSnapshotValue(item));
  }

  if (typeof value === "object") {
    const sanitized: Record<string, PayPalSnapshotJson> = {};
    for (const [key, childValue] of Object.entries(
      value as Record<string, unknown>,
    )) {
      if (childValue === undefined) {
        continue;
      }
      sanitized[key] = isSensitivePayPalSnapshotKey(key)
        ? redactedSnapshotValue
        : sanitizePayPalSnapshotValue(childValue);
    }
    return sanitized;
  }

  return String(value);
}

function isSensitivePayPalSnapshotKey(key: string): boolean {
  return sensitivePayPalSnapshotKeys.has(normalizePayPalSnapshotKey(key));
}

function normalizePayPalSnapshotKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
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

function checkPurchaseUnitAmountConsistency(
  purchaseUnit: PayPalPurchaseUnit,
  purchaseUnitIndex: number,
  toleranceMinor: number,
): PayPalAmountMismatch[] {
  const mismatches: PayPalAmountMismatch[] = [];
  const itemTotalMinor = addMinor(
    purchaseUnit.items.map((item) =>
      multiplyMinor(
        parsePayPalMoneyMinor(item.unit_amount),
        parsePayPalQuantity(item.quantity),
      ),
    ),
  );
  const declaredItemTotalMinor = parsePayPalMoneyMinor(
    purchaseUnit.amount.breakdown.item_total,
  );
  pushAmountMismatch(
    mismatches,
    purchaseUnitIndex,
    "item_total_mismatch",
    itemTotalMinor,
    declaredItemTotalMinor,
    toleranceMinor,
  );

  const hasItemTax = purchaseUnit.items.some((item) => item.tax !== undefined);
  if (hasItemTax) {
    const itemTaxTotalMinor = addMinor(
      purchaseUnit.items.map((item) =>
        multiplyMinor(
          item.tax ? parsePayPalMoneyMinor(item.tax) : 0,
          parsePayPalQuantity(item.quantity),
        ),
      ),
    );
    pushAmountMismatch(
      mismatches,
      purchaseUnitIndex,
      "tax_total_mismatch",
      itemTaxTotalMinor,
      parsePayPalMoneyMinor(purchaseUnit.amount.breakdown.tax_total),
      toleranceMinor,
    );
  }

  const shippingMinor = purchaseUnit.amount.breakdown.shipping
    ? parsePayPalMoneyMinor(purchaseUnit.amount.breakdown.shipping)
    : 0;
  const taxMinor = parsePayPalMoneyMinor(
    purchaseUnit.amount.breakdown.tax_total,
  );
  const discountMinor = purchaseUnit.amount.breakdown.discount
    ? parsePayPalMoneyMinor(purchaseUnit.amount.breakdown.discount)
    : 0;
  const expectedTotalMinor = subtractMinor(
    addMinor([declaredItemTotalMinor, shippingMinor, taxMinor]),
    discountMinor,
  );

  pushAmountMismatch(
    mismatches,
    purchaseUnitIndex,
    "amount_total_mismatch",
    expectedTotalMinor,
    parsePayPalMoneyMinor(purchaseUnit.amount),
    toleranceMinor,
  );

  return mismatches;
}

function normalizeCaptureAmountSnapshot(
  snapshot: PayPalCaptureAmountSnapshot,
  label: string,
): PayPalCaptureAmountSnapshot {
  return {
    currencyCode: snapshot.currencyCode,
    itemTotalMinor: assertMinorUnit(
      snapshot.itemTotalMinor,
      `${label} item total`,
    ),
    shippingMinor: assertMinorUnit(
      snapshot.shippingMinor,
      `${label} shipping amount`,
    ),
    taxMinor: assertMinorUnit(snapshot.taxMinor, `${label} tax total`),
    discountMinor: assertMinorUnit(
      snapshot.discountMinor,
      `${label} discount amount`,
    ),
    totalMinor: assertMinorUnit(snapshot.totalMinor, `${label} total`),
  };
}

function pushCaptureAmountMismatch(
  mismatches: PayPalCaptureAmountMismatch[],
  reason: PayPalCaptureAmountMismatchReason,
  expectedMinor: number,
  actualMinor: number,
  expectedCurrencyCode: PayPalCurrencyCode,
  actualCurrencyCode: PayPalCurrencyCode,
  toleranceMinor: number,
): void {
  if (Math.abs(expectedMinor - actualMinor) > toleranceMinor) {
    mismatches.push({
      reason,
      expected_minor: expectedMinor,
      actual_minor: actualMinor,
      expected_currency_code: expectedCurrencyCode,
      actual_currency_code: actualCurrencyCode,
    });
  }
}

function pushAmountMismatch(
  mismatches: PayPalAmountMismatch[],
  purchaseUnitIndex: number,
  reason: PayPalAmountMismatchReason,
  expectedMinor: number,
  actualMinor: number,
  toleranceMinor: number,
): void {
  if (Math.abs(expectedMinor - actualMinor) > toleranceMinor) {
    mismatches.push({
      purchase_unit_index: purchaseUnitIndex,
      reason,
      expected_minor: expectedMinor,
      actual_minor: actualMinor,
    });
  }
}

function parsePayPalQuantity(value: string): number {
  const quantity = Number(value);
  return assertPositiveQuantity(quantity, "PayPal item quantity");
}

function parsePayPalMoneyMinor(money: PayPalMoney): MinorUnit {
  if (!/^\d+\.\d{2}$/.test(money.value)) {
    throw new Error(`invalid PayPal money value: ${money.value}`);
  }
  const [majorPart, minorPart] = money.value.split(".");
  return assertMinorUnit(
    Number(majorPart) * 100 + Number(minorPart),
    "PayPal money value",
  );
}

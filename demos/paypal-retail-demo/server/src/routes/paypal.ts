import { Router, type Request, type RequestHandler } from "express";

import {
  getMarketConfig,
  type MarketCode,
  type PayPalEnvironment,
} from "../../../shared/src/market.js";
import {
  buildPayPalBopisCreateOrderPayload,
  buildPayPalDeliveryCreateOrderPayload,
  buildPayPalExpressDeliveryCreateOrderPayload,
  buildPayPalSdkConfig,
  checkPayPalCreateOrderAmountConsistency,
  extractPayPalPurchaseUnitAmountSnapshot,
  planPayPalClientTokenRequest,
  type BuildPayPalBopisCreateOrderInput,
  type BuildPayPalDeliveryCreateOrderInput,
  type BuildPayPalExpressDeliveryCreateOrderInput,
  type PayPalCaptureAmountSnapshot,
  type PayPalCreateOrderPayload,
  type PayPalCurrencyCode,
  type PayPalPaymentMethod,
  type PayPalSdkFlow,
  type PayPalSdkPageType,
} from "../../../shared/src/paypal.js";
import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { BuyerRequest } from "../middleware/auth.js";
import type {
  PayPalClientTokenGateway,
  PayPalCreateOrderGateway,
  PayPalCreateOrderGatewayResponse,
} from "../paypal/client.js";
import type {
  GuestCartContext,
  GuestCartRequest,
} from "../middleware/guestCart.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { BuyerContext } from "../middleware/auth.js";
import type { StorefrontContext } from "./catalog.js";

export type PayPalOrderKind = "delivery" | "express_delivery" | "bopis";

export interface PayPalCreateOrderOperationContext {
  readonly storefrontContext: StorefrontContext;
  readonly buyer: BuyerContext;
  readonly guestCart: GuestCartContext | null;
}

export interface PreparePayPalCreateOrderInput {
  readonly kind: PayPalOrderKind;
  readonly method: PayPalPaymentMethod;
  readonly checkoutDraftId?: string;
  readonly cartId?: string;
}

interface PreparedPayPalCreateOrderBase {
  readonly orderNumber: string;
  readonly paymentSessionId: string;
  readonly paypalInvoiceId: string;
  readonly paypalRequestId: string;
  readonly method: PayPalPaymentMethod;
}

export type PreparedPayPalCreateOrder =
  | (PreparedPayPalCreateOrderBase &
      Omit<BuildPayPalDeliveryCreateOrderInput, "orderNumber"> & {
        readonly kind: "delivery";
      })
  | (PreparedPayPalCreateOrderBase &
      Omit<BuildPayPalExpressDeliveryCreateOrderInput, "orderNumber"> & {
        readonly kind: "express_delivery";
      })
  | (PreparedPayPalCreateOrderBase &
      Omit<BuildPayPalBopisCreateOrderInput, "orderNumber"> & {
        readonly kind: "bopis";
      });

export interface RecordPayPalCreateOrderResultInput {
  readonly paymentSessionId: string;
  readonly paypalOrderId: string;
  readonly paypalOrderStatus: string;
  readonly paypalInvoiceId: string;
  readonly paypalRequestId: string;
  readonly requestPayload: PayPalCreateOrderPayload;
  readonly response: PayPalCreateOrderGatewayResponse;
  readonly merchantSnapshot: PayPalCaptureAmountSnapshot;
}

export interface PayPalShippingCallbackAddress {
  readonly countryCode: string;
  readonly adminArea1: string | null;
  readonly adminArea2: string | null;
  readonly postalCode: string | null;
}

export interface HandlePayPalShippingCallbackInput {
  readonly callbackContextId: string;
  readonly paypalOrderId: string | null;
  readonly shippingAddress: PayPalShippingCallbackAddress;
  readonly selectedShippingOptionId: string | null;
  readonly rawCallbackRequest: unknown;
}

export type PayPalShippingCallbackDeclineIssue =
  | "ADDRESS_ERROR"
  | "COUNTRY_ERROR"
  | "STATE_ERROR"
  | "ZIP_ERROR"
  | "METHOD_UNAVAILABLE"
  | "STORE_UNAVAILABLE";

export interface PayPalShippingCallbackMoney {
  readonly currency_code: PayPalCurrencyCode;
  readonly value: string;
}

export interface PayPalShippingCallbackOption {
  readonly id: string;
  readonly amount: PayPalShippingCallbackMoney;
  readonly type: "SHIPPING";
  readonly label: string;
  readonly selected: boolean;
}

export interface PayPalShippingCallbackSuccessResponse {
  readonly id: string;
  readonly purchase_units: readonly {
    readonly reference_id: string;
    readonly amount: {
      readonly currency_code: PayPalCurrencyCode;
      readonly value: string;
      readonly breakdown: {
        readonly item_total: PayPalShippingCallbackMoney;
        readonly tax_total: PayPalShippingCallbackMoney;
        readonly shipping: PayPalShippingCallbackMoney;
      };
    };
    readonly shipping_options: readonly PayPalShippingCallbackOption[];
  }[];
}

export interface PayPalShippingCallbackDeclineResponse {
  readonly name: "UNPROCESSABLE_ENTITY";
  readonly details: readonly {
    readonly issue: PayPalShippingCallbackDeclineIssue;
  }[];
}

export type PayPalShippingCallbackResult =
  | {
      readonly action: "success";
      readonly response: PayPalShippingCallbackSuccessResponse;
    }
  | {
      readonly action: "decline";
      readonly statusCode: 422;
      readonly response: PayPalShippingCallbackDeclineResponse;
    };

export interface PayPalOrderPreparationRepository {
  readonly prepareCreateOrder: (
    context: PayPalCreateOrderOperationContext,
    input: PreparePayPalCreateOrderInput,
  ) => Promise<PreparedPayPalCreateOrder>;
  readonly recordCreateOrderResult: (
    context: PayPalCreateOrderOperationContext,
    input: RecordPayPalCreateOrderResultInput,
  ) => Promise<void>;
  readonly handleExpressShippingCallback: (
    input: HandlePayPalShippingCallbackInput,
  ) => Promise<PayPalShippingCallbackResult>;
}

export interface CreatePayPalRouterInput {
  readonly environment: PayPalEnvironment;
  readonly clientId: string;
  readonly defaultClientTokenDomains: readonly string[];
  readonly clientTokenGateway: PayPalClientTokenGateway;
  readonly orderGateway?: PayPalCreateOrderGateway;
  readonly orderRepository?: PayPalOrderPreparationRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
}

const supportedPageTypes: readonly PayPalSdkPageType[] = [
  "home",
  "product-details",
  "cart",
  "mini-cart",
  "checkout",
  "admin",
];

const supportedFlows: readonly PayPalSdkFlow[] = ["standard", "vaulting"];

const supportedPaymentMethods: readonly PayPalPaymentMethod[] = [
  "paypal",
  "paylater",
  "card",
  "apple_pay",
  "google_pay",
  "venmo",
];

const supportedMarketCodes: readonly MarketCode[] = ["US", "GB"];

export function createPayPalRouter(input: CreatePayPalRouterInput): Router {
  const router = Router();

  router.get(
    "/paypal/sdk-config",
    asyncRoute(async (request, response) => {
      const sdkConfigInput = parseSdkConfigRequest(
        request,
        input.activeStorefrontContextStore,
      );

      if (!sdkConfigInput) {
        sendApiError(response, 400, {
          code: "INVALID_PAYPAL_SDK_CONFIG_REQUEST",
          message:
            "A supported market, page type, flow, and payment method are required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        buildPayPalSdkConfig({
          clientId: input.clientId,
          environment: input.environment,
          market: getMarketConfig(sdkConfigInput.marketCode),
          pageType: sdkConfigInput.pageType,
          flow: sdkConfigInput.flow,
          method: sdkConfigInput.method,
        }),
      );
    }),
  );

  router.post(
    "/paypal/client-token",
    asyncRoute(async (request, response) => {
      const body = request.body as Record<string, unknown> | undefined;
      const flow = parseSupportedValue(body?.flow, supportedFlows, "standard");
      const method = parseSupportedValue(body?.method, supportedPaymentMethods);
      const requestDomains = parseClientTokenDomains(body?.domains);

      if (!flow || !method || requestDomains === "invalid") {
        sendApiError(response, 400, {
          code: "INVALID_PAYPAL_CLIENT_TOKEN_REQUEST",
          message:
            "A supported flow, payment method, and domain list are required.",
        });
        return;
      }

      const buyer = (request as BuyerRequest).buyer ?? { kind: "guest" };
      const plan = planPayPalClientTokenRequest({
        flow,
        method,
        buyer,
        domains: requestDomains ?? input.defaultClientTokenDomains,
      });

      if (plan.action === "not_required") {
        sendApiError(response, 400, {
          code: "CLIENT_TOKEN_NOT_REQUIRED",
          message: "Standard PayPal flows use the browser-safe client ID.",
        });
        return;
      }

      if (plan.action === "reject") {
        sendApiError(response, plan.http_status, {
          code: plan.error_code,
          message: plan.message,
        });
        return;
      }

      const clientToken = await input.clientTokenGateway.generateClientToken({
        domains: plan.paypal_oauth_form.domains,
        targetCustomerId: plan.paypal_oauth_form.target_customer_id ?? null,
      });

      sendApiSuccess(response, {
        client_token: clientToken.clientToken,
        expires_in_seconds: clientToken.expiresInSeconds,
      });
    }),
  );

  router.post(
    "/paypal/orders/delivery",
    asyncRoute(async (request, response) => {
      await handleCreateOrderRoute(request, response, input, "delivery");
    }),
  );

  router.post(
    "/paypal/orders/express-delivery",
    asyncRoute(async (request, response) => {
      await handleCreateOrderRoute(
        request,
        response,
        input,
        "express_delivery",
      );
    }),
  );

  router.post(
    "/paypal/orders/bopis",
    asyncRoute(async (request, response) => {
      await handleCreateOrderRoute(request, response, input, "bopis");
    }),
  );

  router.post(
    "/paypal/orders/:callbackContextId/shipping-callback",
    asyncRoute(async (request, response) => {
      const orderRepository = input.orderRepository;
      if (!orderRepository) {
        response
          .status(422)
          .json(buildPayPalShippingCallbackDecline("METHOD_UNAVAILABLE"));
        return;
      }

      const callbackInput = parseShippingCallbackInput(request);
      if (!callbackInput) {
        response
          .status(422)
          .json(buildPayPalShippingCallbackDecline("ADDRESS_ERROR"));
        return;
      }

      const result =
        await orderRepository.handleExpressShippingCallback(callbackInput);
      response
        .status(result.action === "decline" ? result.statusCode : 200)
        .json(result.response);
    }),
  );

  return router;
}

async function handleCreateOrderRoute(
  request: Request,
  response: Parameters<typeof sendApiSuccess>[0],
  input: CreatePayPalRouterInput,
  kind: PayPalOrderKind,
): Promise<void> {
  const orderGateway = input.orderGateway;
  const orderRepository = input.orderRepository;

  if (!orderGateway || !orderRepository) {
    sendApiError(response, 503, {
      code: "PAYPAL_ORDER_CREATE_UNAVAILABLE",
      message: "PayPal order creation is not configured.",
    });
    return;
  }

  const createOrderInput = parseCreateOrderInput(request, kind);

  if (!createOrderInput) {
    sendApiError(response, 400, {
      code: "INVALID_PAYPAL_CREATE_ORDER_REQUEST",
      message:
        "A supported payment method and checkout/cart source are required.",
    });
    return;
  }

  const context = resolveCreateOrderContext(
    request,
    input.activeStorefrontContextStore,
  );
  const preparedOrder = await orderRepository.prepareCreateOrder(
    context,
    createOrderInput,
  );
  const payload = buildCreateOrderPayload(preparedOrder);
  const amountConsistency = checkPayPalCreateOrderAmountConsistency(payload);

  if (amountConsistency.status !== "matched") {
    sendApiError(response, 409, {
      code: "PAYPAL_ORDER_AMOUNT_MISMATCH",
      message: "Merchant-calculated PayPal order amounts did not reconcile.",
      details: {
        mismatches: amountConsistency.mismatches.map((mismatch) => ({
          purchase_unit_index: mismatch.purchase_unit_index,
          reason: mismatch.reason,
          expected_minor: mismatch.expected_minor,
          actual_minor: mismatch.actual_minor,
        })),
      },
    });
    return;
  }

  const createOrderResponse = await orderGateway.createOrder({
    paypalRequestId: preparedOrder.paypalRequestId,
    payload,
  });
  const merchantSnapshot = extractPayPalPurchaseUnitAmountSnapshot(
    payload.purchase_units[0]!,
  );

  await orderRepository.recordCreateOrderResult(context, {
    paymentSessionId: preparedOrder.paymentSessionId,
    paypalOrderId: createOrderResponse.paypalOrderId,
    paypalOrderStatus: createOrderResponse.status,
    paypalInvoiceId: preparedOrder.paypalInvoiceId,
    paypalRequestId: preparedOrder.paypalRequestId,
    requestPayload: payload,
    response: createOrderResponse,
    merchantSnapshot,
  });

  sendApiSuccess(response, {
    order_number: preparedOrder.orderNumber,
    payment_session_id: preparedOrder.paymentSessionId,
    paypal_order_id: createOrderResponse.paypalOrderId,
    paypal_order_status: createOrderResponse.status,
    paypal_invoice_id: preparedOrder.paypalInvoiceId,
    paypal_request_id: preparedOrder.paypalRequestId,
    approval_url: createOrderResponse.approvalUrl,
  });
}

function parseCreateOrderInput(
  request: Request,
  kind: PayPalOrderKind,
): PreparePayPalCreateOrderInput | null {
  const body = request.body as Record<string, unknown> | undefined;
  const method = parseSupportedValue(body?.method, supportedPaymentMethods);
  const checkoutDraftId = normalizeBodyString(body?.checkout_draft_id);
  const cartId = normalizeBodyString(body?.cart_id);

  if (!method) {
    return null;
  }

  if (kind === "delivery" || kind === "bopis") {
    return checkoutDraftId
      ? {
          kind,
          method,
          checkoutDraftId,
        }
      : null;
  }

  return cartId
    ? {
        kind,
        method,
        cartId,
      }
    : null;
}

function parseShippingCallbackInput(
  request: Request,
): HandlePayPalShippingCallbackInput | null {
  const callbackContextId = normalizeBodyString(
    request.params.callbackContextId,
  );
  const body = request.body as Record<string, unknown> | undefined;
  const shippingAddress = parsePayPalShippingCallbackAddress(
    getObjectProperty(body, "shipping_address"),
  );

  if (!callbackContextId || !shippingAddress) {
    return null;
  }

  return {
    callbackContextId,
    paypalOrderId: normalizeBodyString(getObjectProperty(body, "id")),
    shippingAddress,
    selectedShippingOptionId: normalizeBodyString(
      getObjectProperty(getObjectProperty(body, "shipping_option"), "id"),
    ),
    rawCallbackRequest: body ?? {},
  };
}

function parsePayPalShippingCallbackAddress(
  value: unknown,
): PayPalShippingCallbackAddress | null {
  const countryCode = normalizeBodyString(
    getObjectProperty(value, "country_code"),
  )?.toUpperCase();
  if (!countryCode) {
    return null;
  }

  return {
    countryCode,
    adminArea1: normalizeBodyString(getObjectProperty(value, "admin_area_1")),
    adminArea2: normalizeBodyString(getObjectProperty(value, "admin_area_2")),
    postalCode: normalizeBodyString(getObjectProperty(value, "postal_code")),
  };
}

function buildPayPalShippingCallbackDecline(
  issue: PayPalShippingCallbackDeclineIssue,
): PayPalShippingCallbackDeclineResponse {
  return {
    name: "UNPROCESSABLE_ENTITY",
    details: [{ issue }],
  };
}

function buildCreateOrderPayload(
  input: PreparedPayPalCreateOrder,
): PayPalCreateOrderPayload {
  if (input.kind === "delivery") {
    return buildPayPalDeliveryCreateOrderPayload({
      orderNumber: input.paypalInvoiceId,
      currencyCode: input.currencyCode,
      items: input.items,
      shippingAmountMinor: input.shippingAmountMinor,
      taxAmountMinor: input.taxAmountMinor,
      discountAmountMinor: input.discountAmountMinor,
      shippingAddress: input.shippingAddress,
    });
  }

  if (input.kind === "express_delivery") {
    return buildPayPalExpressDeliveryCreateOrderPayload({
      orderNumber: input.paypalInvoiceId,
      currencyCode: input.currencyCode,
      items: input.items,
      shippingAmountMinor: input.shippingAmountMinor,
      taxAmountMinor: input.taxAmountMinor,
      discountAmountMinor: input.discountAmountMinor,
      shippingCallbackUrl: input.shippingCallbackUrl,
      ...(input.callbackEvents ? { callbackEvents: input.callbackEvents } : {}),
    });
  }

  return buildPayPalBopisCreateOrderPayload({
    orderNumber: input.paypalInvoiceId,
    currencyCode: input.currencyCode,
    items: input.items,
    taxAmountMinor: input.taxAmountMinor,
    discountAmountMinor: input.discountAmountMinor,
    pickupStore: input.pickupStore,
  });
}

function resolveCreateOrderContext(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): PayPalCreateOrderOperationContext {
  const activeContext = activeStorefrontContextStore?.get() ?? {
    profileSlug: "popmart",
    marketCode: "US",
  };

  return {
    storefrontContext: {
      profileSlug:
        firstQueryValue(request, "profile") ?? activeContext.profileSlug,
      marketCode: (
        firstQueryValue(request, "market") ?? activeContext.marketCode
      ).toUpperCase(),
    },
    buyer: (request as BuyerRequest).buyer ?? { kind: "guest" },
    guestCart: (request as GuestCartRequest).guestCart ?? null,
  };
}

function parseSdkConfigRequest(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): {
  readonly marketCode: MarketCode;
  readonly pageType: PayPalSdkPageType;
  readonly flow: PayPalSdkFlow;
  readonly method: PayPalPaymentMethod;
} | null {
  const activeContext = activeStorefrontContextStore?.get() ?? {
    profileSlug: "popmart",
    marketCode: "US",
  };
  const marketCode = parseMarketCode(
    firstQueryValue(request, "market") ?? activeContext.marketCode,
  );
  const pageType = parseSupportedValue(
    firstQueryValue(request, "page_type"),
    supportedPageTypes,
    "checkout",
  );
  const flow = parseSupportedValue(
    firstQueryValue(request, "flow"),
    supportedFlows,
    "standard",
  );
  const method = parseSupportedValue(
    firstQueryValue(request, "method"),
    supportedPaymentMethods,
    "paypal",
  );

  if (!marketCode || !pageType || !flow || !method) {
    return null;
  }

  return {
    marketCode,
    pageType,
    flow,
    method,
  };
}

function parseMarketCode(value: string | null): MarketCode | null {
  const marketCode = value?.trim().toUpperCase();
  if (!marketCode) {
    return null;
  }
  return isSupportedValue(marketCode, supportedMarketCodes) ? marketCode : null;
}

function parseSupportedValue<TValue extends string>(
  value: unknown,
  supportedValues: readonly TValue[],
  fallback?: TValue,
): TValue | null {
  if (value === undefined || value === null || value === "") {
    return fallback ?? null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const normalizedValue = value.trim();
  return isSupportedValue(normalizedValue, supportedValues)
    ? normalizedValue
    : null;
}

function isSupportedValue<TValue extends string>(
  value: string,
  supportedValues: readonly TValue[],
): value is TValue {
  return supportedValues.some((supportedValue) => supportedValue === value);
}

function parseClientTokenDomains(
  value: unknown,
): readonly string[] | "invalid" | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return "invalid";
  }
  if (value.some((domain) => typeof domain !== "string")) {
    return "invalid";
  }
  return value;
}

function normalizeBodyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

function getObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

function firstQueryValue(request: Request, key: string): string | null {
  const value = request.query[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

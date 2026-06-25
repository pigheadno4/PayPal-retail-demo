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
  type PayPalCaptureAmountGuardResult,
  type PayPalSnapshotJson,
} from "../../../shared/src/paypal.js";
import {
  getResponseDebugId,
  sendApiError,
  sendApiSuccess,
} from "../http/responses.js";
import type { BuyerRequest } from "../middleware/auth.js";
import type {
  PayPalClientTokenGateway,
  PayPalCaptureOrderGateway,
  PayPalCaptureOrderGatewayResponse,
  PayPalCreateOrderGateway,
  PayPalCreateOrderGatewayResponse,
  PayPalWebhookVerificationGateway,
} from "../paypal/client.js";
import type {
  GuestCartContext,
  GuestCartRequest,
} from "../middleware/guestCart.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { BuyerContext } from "../middleware/auth.js";
import type { DebugLogger } from "../debug/logger.js";
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

interface PreparedPayPalCaptureBase {
  readonly orderNumber: string;
  readonly paymentSessionId: string;
  readonly paypalOrderId: string;
  readonly merchantSnapshot: PayPalCaptureAmountSnapshot;
  readonly amountGuard: PayPalCaptureAmountGuardResult;
}

export type PreparedPayPalCapture =
  | (PreparedPayPalCaptureBase & {
      readonly action: "capture";
      readonly paypalRequestId: string;
    })
  | (PreparedPayPalCaptureBase & {
      readonly action: "block";
    });

export interface RecordPayPalCaptureResultInput {
  readonly paymentSessionId: string;
  readonly paypalOrderId: string;
  readonly paypalCaptureId: string;
  readonly paypalOrderStatus: string;
  readonly paypalCaptureStatus: string;
  readonly paypalRequestId: string;
  readonly response: PayPalCaptureOrderGatewayResponse;
  readonly merchantSnapshot: PayPalCaptureAmountSnapshot;
  readonly amountGuard: PayPalCaptureAmountGuardResult;
}

export interface PayPalShippingCallbackAddress {
  readonly fullName?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
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
        readonly discount?: PayPalShippingCallbackMoney;
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

export interface GetPayPalExpressReviewSnapshotInput {
  readonly paypalOrderId: string | null;
  readonly paymentSessionId: string | null;
}

export interface PayPalExpressReviewSnapshot {
  readonly source_label: string;
  readonly order_number: string;
  readonly payment_session_id: string;
  readonly paypal_order_id: string;
  readonly payment_method_label: string;
  readonly status_label: string;
  readonly shipping_address: {
    readonly name: string;
    readonly address_line1: string;
    readonly address_line2: string;
    readonly country_code: string;
  };
  readonly shipping_option: {
    readonly label: string;
    readonly detail: string;
    readonly amount_minor: number;
    readonly currency_code: PayPalCurrencyCode;
  };
  readonly items: readonly {
    readonly id: string;
    readonly name: string;
    readonly detail: string;
    readonly amount_minor: number;
    readonly currency_code: PayPalCurrencyCode;
  }[];
  readonly totals: {
    readonly merchandise_subtotal_minor: number;
    readonly shipping_minor: number;
    readonly promo_discount_minor: number;
    readonly tax_minor: number;
    readonly total_minor: number;
    readonly currency_code: PayPalCurrencyCode;
  };
  readonly amount_guard: PayPalCaptureAmountGuardResult;
}

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
  readonly getExpressReviewSnapshot: (
    input: GetPayPalExpressReviewSnapshotInput,
  ) => Promise<PayPalExpressReviewSnapshot | null>;
  readonly prepareCapture: (input: {
    readonly paypalOrderId: string;
  }) => Promise<PreparedPayPalCapture>;
  readonly recordCaptureResult: (
    input: RecordPayPalCaptureResultInput,
  ) => Promise<void>;
}

export interface PayPalWebhookHeaders {
  readonly auth_algorithm: string;
  readonly cert_url: string;
  readonly transmission_id: string;
  readonly transmission_signature: string;
  readonly transmission_time: string;
}

export type PayPalWebhookVerificationStatus = "valid" | "invalid" | "error";
export type PayPalWebhookProcessingStatus =
  | "received"
  | "processed"
  | "ignored"
  | "failed";

export interface PayPalWebhookProcessingInput {
  readonly verificationStatus: PayPalWebhookVerificationStatus;
  readonly headers: PayPalWebhookHeaders;
  readonly event: PayPalSnapshotJson;
}

export interface PayPalWebhookProcessingResult {
  readonly eventId: string;
  readonly eventType: string;
  readonly verificationStatus: PayPalWebhookVerificationStatus;
  readonly processingStatus: PayPalWebhookProcessingStatus;
  readonly linkedOrderId: string | null;
  readonly linkedPaymentSessionId: string | null;
  readonly savedPaymentMethodId: string | null;
}

export interface PayPalWebhookProcessingRepository {
  readonly processWebhook: (
    input: PayPalWebhookProcessingInput,
  ) => Promise<PayPalWebhookProcessingResult>;
}

export interface CreatePayPalRouterInput {
  readonly environment: PayPalEnvironment;
  readonly clientId: string;
  readonly webhookId?: string;
  readonly defaultClientTokenDomains: readonly string[];
  readonly clientTokenGateway: PayPalClientTokenGateway;
  readonly orderGateway?: PayPalCreateOrderGateway & PayPalCaptureOrderGateway;
  readonly webhookGateway?: PayPalWebhookVerificationGateway;
  readonly orderRepository?: PayPalOrderPreparationRepository;
  readonly webhookRepository?: PayPalWebhookProcessingRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  readonly debugLogger?: DebugLogger;
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
        logPayPalRouteWarn(input, "paypal_sdk_config_rejected", {
          debug_id: getResponseDebugId(response),
          reason: "invalid_request",
          query_market: firstQueryValue(request, "market"),
          query_page_type: firstQueryValue(request, "page_type"),
          query_flow: firstQueryValue(request, "flow"),
          query_method: firstQueryValue(request, "method"),
        });
        sendApiError(response, 400, {
          code: "INVALID_PAYPAL_SDK_CONFIG_REQUEST",
          message:
            "A supported market, page type, flow, and payment method are required.",
        });
        return;
      }

      logPayPalRouteInfo(input, "paypal_sdk_config_returned", {
        debug_id: getResponseDebugId(response),
        environment: input.environment,
        market: sdkConfigInput.marketCode,
        page_type: sdkConfigInput.pageType,
        flow: sdkConfigInput.flow,
        method: sdkConfigInput.method,
      });

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
        logPayPalRouteWarn(input, "paypal_client_token_rejected", {
          debug_id: getResponseDebugId(response),
          reason: "invalid_request",
          has_domains: Boolean(requestDomains),
          flow: typeof body?.flow === "string" ? body.flow : null,
          method: typeof body?.method === "string" ? body.method : null,
        });
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

      logPayPalRouteInfo(input, "paypal_client_token_planned", {
        debug_id: getResponseDebugId(response),
        action: plan.action,
        buyer_kind: buyer.kind,
        domain_count:
          plan.action === "generate"
            ? plan.paypal_oauth_form.domains.length
            : (requestDomains ?? input.defaultClientTokenDomains).length,
        flow,
        method,
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

      let clientToken;
      try {
        clientToken = await input.clientTokenGateway.generateClientToken({
          domains: plan.paypal_oauth_form.domains,
          targetCustomerId: plan.paypal_oauth_form.target_customer_id ?? null,
        });
      } catch (error) {
        logPayPalRouteError(input, "paypal_client_token_failed", {
          debug_id: getResponseDebugId(response),
          error_name: error instanceof Error ? error.name : "UnknownError",
          error_message: error instanceof Error ? error.message : String(error),
          flow,
          method,
        });
        throw error;
      }

      logPayPalRouteInfo(input, "paypal_client_token_generated", {
        debug_id: getResponseDebugId(response),
        expires_in_seconds: clientToken.expiresInSeconds,
        flow,
        method,
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
    "/paypal/orders/:paypalOrderId/capture",
    asyncRoute(async (request, response) => {
      await handleCaptureOrderRoute(request, response, input);
    }),
  );

  router.get(
    "/paypal/orders/express-review",
    asyncRoute(async (request, response) => {
      await handleExpressReviewSnapshotRoute(request, response, input);
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

  router.post(
    "/paypal/webhooks",
    asyncRoute(async (request, response) => {
      await handlePayPalWebhookRoute(request, response, input);
    }),
  );

  return router;
}

async function handlePayPalWebhookRoute(
  request: Request,
  response: Parameters<typeof sendApiSuccess>[0],
  input: CreatePayPalRouterInput,
): Promise<void> {
  if (!input.webhookId || !input.webhookGateway || !input.webhookRepository) {
    sendApiError(response, 503, {
      code: "PAYPAL_WEBHOOKS_UNAVAILABLE",
      message: "PayPal webhook processing is not configured.",
    });
    return;
  }

  const event = parsePayPalWebhookEvent(request.body);
  const headers = parsePayPalWebhookHeaders(request);
  if (!event || !headers) {
    sendApiError(response, 400, {
      code: "INVALID_PAYPAL_WEBHOOK_REQUEST",
      message:
        "A PayPal webhook event and required verification headers are required.",
    });
    return;
  }

  const verification = await input.webhookGateway.verifyWebhookSignature({
    webhookId: input.webhookId,
    transmissionId: headers.transmission_id,
    transmissionTime: headers.transmission_time,
    transmissionSignature: headers.transmission_signature,
    certUrl: headers.cert_url,
    authAlgorithm: headers.auth_algorithm,
    event,
  });
  const verificationStatus =
    verification.verificationStatus === "SUCCESS" ? "valid" : "invalid";
  const result = await input.webhookRepository.processWebhook({
    verificationStatus,
    headers,
    event,
  });

  if (verificationStatus !== "valid") {
    sendApiError(response, 400, {
      code: "INVALID_PAYPAL_WEBHOOK_SIGNATURE",
      message: "PayPal webhook signature verification failed.",
      details: {
        event_id: result.eventId,
        event_type: result.eventType,
        processing_status: result.processingStatus,
      },
    });
    return;
  }

  sendApiSuccess(response, mapWebhookProcessingResult(result));
}

async function handleCreateOrderRoute(
  request: Request,
  response: Parameters<typeof sendApiSuccess>[0],
  input: CreatePayPalRouterInput,
  kind: PayPalOrderKind,
): Promise<void> {
  const debugId = getResponseDebugId(response);
  const orderGateway = input.orderGateway;
  const orderRepository = input.orderRepository;

  if (!orderGateway || !orderRepository) {
    logPayPalRouteWarn(input, "paypal_create_order_unavailable", {
      debug_id: debugId,
      has_order_gateway: Boolean(orderGateway),
      has_order_repository: Boolean(orderRepository),
      kind,
    });
    sendApiError(response, 503, {
      code: "PAYPAL_ORDER_CREATE_UNAVAILABLE",
      message: "PayPal order creation is not configured.",
    });
    return;
  }

  const createOrderInput = parseCreateOrderInput(request, kind);

  if (!createOrderInput) {
    logPayPalRouteWarn(input, "paypal_create_order_rejected", {
      debug_id: debugId,
      kind,
      reason: "invalid_request",
    });
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
  const routeLogContext = {
    buyer_kind: context.buyer.kind,
    cart_id: createOrderInput.cartId ?? null,
    checkout_draft_id: createOrderInput.checkoutDraftId ?? null,
    debug_id: debugId,
    has_guest_cart_secret: Boolean(context.guestCart?.cartClientSecret),
    kind,
    market: context.storefrontContext.marketCode,
    method: createOrderInput.method,
  };
  let stage:
    | "prepare"
    | "build_payload"
    | "amount_consistency"
    | "gateway_create"
    | "record_result" = "prepare";

  logPayPalRouteInfo(input, "paypal_create_order_starting", routeLogContext);

  try {
    const preparedOrder = await orderRepository.prepareCreateOrder(
      context,
      createOrderInput,
    );
    stage = "build_payload";
    const payload = buildCreateOrderPayload(preparedOrder);
    const merchantSnapshot = extractPayPalPurchaseUnitAmountSnapshot(
      payload.purchase_units[0]!,
    );
    logPayPalRouteInfo(input, "paypal_create_order_prepared", {
      ...routeLogContext,
      amount_currency_code: merchantSnapshot.currencyCode,
      amount_total_minor: merchantSnapshot.totalMinor,
      order_number: preparedOrder.orderNumber,
      paypal_invoice_id: preparedOrder.paypalInvoiceId,
      paypal_request_id: preparedOrder.paypalRequestId,
      payment_session_id: preparedOrder.paymentSessionId,
    });
    stage = "amount_consistency";
    const amountConsistency = checkPayPalCreateOrderAmountConsistency(payload);

    if (amountConsistency.status !== "matched") {
      logPayPalRouteWarn(input, "paypal_create_order_amount_mismatch", {
        ...routeLogContext,
        mismatch_count: amountConsistency.mismatches.length,
        order_number: preparedOrder.orderNumber,
        payment_session_id: preparedOrder.paymentSessionId,
      });
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

    stage = "gateway_create";
    const createOrderResponse = await orderGateway.createOrder({
      paypalRequestId: preparedOrder.paypalRequestId,
      payload,
    });
    logPayPalRouteInfo(input, "paypal_create_order_gateway_created", {
      ...routeLogContext,
      approval_url_present: Boolean(createOrderResponse.approvalUrl),
      paypal_order_id: createOrderResponse.paypalOrderId,
      paypal_order_status: createOrderResponse.status,
      payment_session_id: preparedOrder.paymentSessionId,
    });

    stage = "record_result";
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
    logPayPalRouteInfo(input, "paypal_create_order_recorded", {
      ...routeLogContext,
      order_number: preparedOrder.orderNumber,
      paypal_order_id: createOrderResponse.paypalOrderId,
      payment_session_id: preparedOrder.paymentSessionId,
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
  } catch (error) {
    logPayPalRouteError(input, "paypal_create_order_failed", {
      ...routeLogContext,
      error_message: error instanceof Error ? error.message : String(error),
      error_name: error instanceof Error ? error.name : "UnknownError",
      stage,
    });
    throw error;
  }
}

async function handleCaptureOrderRoute(
  request: Request,
  response: Parameters<typeof sendApiSuccess>[0],
  input: CreatePayPalRouterInput,
): Promise<void> {
  const orderGateway = input.orderGateway;
  const orderRepository = input.orderRepository;
  const debugId = getResponseDebugId(response);

  if (!orderGateway || !orderRepository) {
    logPayPalRouteWarn(input, "paypal_capture_unavailable", {
      debug_id: debugId,
      has_order_gateway: Boolean(orderGateway),
      has_order_repository: Boolean(orderRepository),
    });
    sendApiError(response, 503, {
      code: "PAYPAL_CAPTURE_UNAVAILABLE",
      message: "PayPal capture is not configured.",
    });
    return;
  }

  const paypalOrderId = normalizeBodyString(request.params.paypalOrderId);
  if (!paypalOrderId) {
    logPayPalRouteWarn(input, "paypal_capture_rejected", {
      debug_id: debugId,
      reason: "invalid_request",
    });
    sendApiError(response, 400, {
      code: "INVALID_PAYPAL_CAPTURE_REQUEST",
      message: "A PayPal order ID is required.",
    });
    return;
  }

  let stage: "prepare" | "gateway_capture" | "record_result" = "prepare";
  logPayPalRouteInfo(input, "paypal_capture_starting", {
    debug_id: debugId,
    paypal_order_id: paypalOrderId,
  });

  try {
    const preparedCapture = await orderRepository.prepareCapture({
      paypalOrderId,
    });

    logPayPalRouteInfo(input, "paypal_capture_prepared", {
      debug_id: debugId,
      action: preparedCapture.action,
      amount_guard_status: preparedCapture.amountGuard.status,
      amount_total_minor: preparedCapture.merchantSnapshot.totalMinor,
      order_number: preparedCapture.orderNumber,
      paypal_order_id: preparedCapture.paypalOrderId,
      payment_session_id: preparedCapture.paymentSessionId,
    });

    if (preparedCapture.action === "block") {
      logPayPalRouteWarn(input, "paypal_capture_amount_mismatch", {
        debug_id: debugId,
        mismatch_count: preparedCapture.amountGuard.mismatches.length,
        order_number: preparedCapture.orderNumber,
        paypal_order_id: preparedCapture.paypalOrderId,
        payment_session_id: preparedCapture.paymentSessionId,
      });
      sendApiError(response, 409, {
        code: "PAYPAL_CAPTURE_AMOUNT_MISMATCH",
        message: "PayPal capture blocked because order amounts do not match.",
        details: {
          amount_guard: preparedCapture.amountGuard,
        },
      });
      return;
    }

    stage = "gateway_capture";
    const captureResponse = await orderGateway.captureOrder({
      paypalOrderId: preparedCapture.paypalOrderId,
      paypalRequestId: preparedCapture.paypalRequestId,
    });
    logPayPalRouteInfo(input, "paypal_capture_gateway_captured", {
      debug_id: debugId,
      capture_status: captureResponse.captureStatus,
      order_number: preparedCapture.orderNumber,
      paypal_capture_id: captureResponse.captureId,
      paypal_order_id: captureResponse.paypalOrderId,
      paypal_order_status: captureResponse.status,
      payment_session_id: preparedCapture.paymentSessionId,
    });

    stage = "record_result";
    await orderRepository.recordCaptureResult({
      paymentSessionId: preparedCapture.paymentSessionId,
      paypalOrderId: preparedCapture.paypalOrderId,
      paypalCaptureId: captureResponse.captureId,
      paypalOrderStatus: captureResponse.status,
      paypalCaptureStatus: captureResponse.captureStatus,
      paypalRequestId: preparedCapture.paypalRequestId,
      response: captureResponse,
      merchantSnapshot: preparedCapture.merchantSnapshot,
      amountGuard: preparedCapture.amountGuard,
    });
    logPayPalRouteInfo(input, "paypal_capture_recorded", {
      debug_id: debugId,
      order_number: preparedCapture.orderNumber,
      paypal_capture_id: captureResponse.captureId,
      paypal_order_id: captureResponse.paypalOrderId,
      payment_session_id: preparedCapture.paymentSessionId,
    });

    sendApiSuccess(response, {
      order_number: preparedCapture.orderNumber,
      payment_session_id: preparedCapture.paymentSessionId,
      paypal_order_id: captureResponse.paypalOrderId,
      paypal_capture_id: captureResponse.captureId,
      paypal_order_status: captureResponse.status,
      paypal_capture_status: captureResponse.captureStatus,
      paypal_request_id: preparedCapture.paypalRequestId,
      amount_guard: preparedCapture.amountGuard,
    });
  } catch (error) {
    logPayPalRouteError(input, "paypal_capture_failed", {
      debug_id: debugId,
      error_message: error instanceof Error ? error.message : String(error),
      error_name: error instanceof Error ? error.name : "UnknownError",
      paypal_order_id: paypalOrderId,
      stage,
    });
    throw error;
  }
}

async function handleExpressReviewSnapshotRoute(
  request: Request,
  response: Parameters<typeof sendApiSuccess>[0],
  input: CreatePayPalRouterInput,
): Promise<void> {
  const orderRepository = input.orderRepository;
  const debugId = getResponseDebugId(response);

  if (!orderRepository) {
    logPayPalRouteWarn(input, "paypal_express_review_unavailable", {
      debug_id: debugId,
    });
    sendApiError(response, 503, {
      code: "PAYPAL_EXPRESS_REVIEW_UNAVAILABLE",
      message: "PayPal express review loading is not configured.",
    });
    return;
  }

  const paypalOrderId = normalizeBodyString(request.query.paypal_order_id);
  const paymentSessionId = normalizeBodyString(
    request.query.payment_session_id,
  );

  if (!paypalOrderId && !paymentSessionId) {
    logPayPalRouteWarn(input, "paypal_express_review_rejected", {
      debug_id: debugId,
      reason: "missing_lookup",
    });
    sendApiError(response, 400, {
      code: "INVALID_PAYPAL_EXPRESS_REVIEW_REQUEST",
      message: "A PayPal order ID or payment session ID is required.",
    });
    return;
  }

  logPayPalRouteInfo(input, "paypal_express_review_lookup_starting", {
    debug_id: debugId,
    has_paypal_order_id: Boolean(paypalOrderId),
    has_payment_session_id: Boolean(paymentSessionId),
    paypal_order_id: paypalOrderId ?? null,
    payment_session_id: paymentSessionId ?? null,
  });

  const snapshot = await orderRepository.getExpressReviewSnapshot({
    paypalOrderId: paypalOrderId ?? null,
    paymentSessionId: paymentSessionId ?? null,
  });

  if (!snapshot) {
    logPayPalRouteWarn(input, "paypal_express_review_not_found", {
      debug_id: debugId,
      paypal_order_id: paypalOrderId ?? null,
      payment_session_id: paymentSessionId ?? null,
    });
    sendApiError(response, 404, {
      code: "PAYPAL_EXPRESS_REVIEW_NOT_FOUND",
      message: "The synchronized PayPal express review snapshot was not found.",
    });
    return;
  }

  logPayPalRouteInfo(input, "paypal_express_review_found", {
    debug_id: debugId,
    amount_guard_status: snapshot.amount_guard.status,
    item_count: snapshot.items.length,
    order_number: snapshot.order_number,
    paypal_order_id: snapshot.paypal_order_id,
    payment_session_id: snapshot.payment_session_id,
    status_label: snapshot.status_label,
    total_minor: snapshot.totals.total_minor,
  });

  sendApiSuccess(response, snapshot);
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
    fullName: normalizeBodyString(getObjectProperty(value, "name")) ?? null,
    addressLine1:
      normalizeBodyString(getObjectProperty(value, "address_line_1")) ?? null,
    addressLine2:
      normalizeBodyString(getObjectProperty(value, "address_line_2")) ?? null,
    countryCode,
    adminArea1: normalizeBodyString(getObjectProperty(value, "admin_area_1")),
    adminArea2: normalizeBodyString(getObjectProperty(value, "admin_area_2")),
    postalCode: normalizeBodyString(getObjectProperty(value, "postal_code")),
  };
}

function parsePayPalWebhookEvent(value: unknown): PayPalSnapshotJson | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const id = getObjectProperty(value, "id");
  const eventType = getObjectProperty(value, "event_type");
  if (typeof id !== "string" || !id.trim()) {
    return null;
  }
  if (typeof eventType !== "string" || !eventType.trim()) {
    return null;
  }

  return value as PayPalSnapshotJson;
}

function parsePayPalWebhookHeaders(
  request: Request,
): PayPalWebhookHeaders | null {
  const authAlgorithm = firstHeaderValue(request, "paypal-auth-algo");
  const certUrl = firstHeaderValue(request, "paypal-cert-url");
  const transmissionId = firstHeaderValue(request, "paypal-transmission-id");
  const transmissionSignature = firstHeaderValue(
    request,
    "paypal-transmission-sig",
  );
  const transmissionTime = firstHeaderValue(
    request,
    "paypal-transmission-time",
  );

  if (
    !authAlgorithm ||
    !certUrl ||
    !transmissionId ||
    !transmissionSignature ||
    !transmissionTime
  ) {
    return null;
  }

  return {
    auth_algorithm: authAlgorithm,
    cert_url: certUrl,
    transmission_id: transmissionId,
    transmission_signature: transmissionSignature,
    transmission_time: transmissionTime,
  };
}

function mapWebhookProcessingResult(result: PayPalWebhookProcessingResult) {
  return {
    event_id: result.eventId,
    event_type: result.eventType,
    verification_status: result.verificationStatus,
    processing_status: result.processingStatus,
    linked_order_id: result.linkedOrderId,
    linked_payment_session_id: result.linkedPaymentSessionId,
    saved_payment_method_id: result.savedPaymentMethodId,
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

function firstHeaderValue(request: Request, key: string): string | null {
  const value = request.headers[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
}

function logPayPalRouteInfo(
  input: CreatePayPalRouterInput,
  message: string,
  context?: unknown,
): void {
  input.debugLogger?.info(message, context);
}

function logPayPalRouteWarn(
  input: CreatePayPalRouterInput,
  message: string,
  context?: unknown,
): void {
  input.debugLogger?.warn(message, context);
}

function logPayPalRouteError(
  input: CreatePayPalRouterInput,
  message: string,
  context?: unknown,
): void {
  input.debugLogger?.error(message, context);
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

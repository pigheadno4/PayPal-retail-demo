import { Router, type Request, type RequestHandler } from "express";

import {
  getMarketConfig,
  type MarketCode,
  type PayPalEnvironment,
} from "../../../shared/src/market.js";
import {
  buildPayPalSdkConfig,
  planPayPalClientTokenRequest,
  type PayPalPaymentMethod,
  type PayPalSdkFlow,
  type PayPalSdkPageType,
} from "../../../shared/src/paypal.js";
import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { BuyerRequest } from "../middleware/auth.js";
import type { PayPalClientTokenGateway } from "../paypal/client.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";

export interface CreatePayPalRouterInput {
  readonly environment: PayPalEnvironment;
  readonly clientId: string;
  readonly defaultClientTokenDomains: readonly string[];
  readonly clientTokenGateway: PayPalClientTokenGateway;
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

  return router;
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

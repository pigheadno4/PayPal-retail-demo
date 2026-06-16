import {
  type ApiQueryParams,
  type ApiRequestOptions,
} from "../../api/client.js";

export type DeliveryExpressPaymentMethod = "paypal" | "paylater";

export type DeliveryExpressSource = "product_detail" | "cart" | "minicart";

export interface DeliveryExpressStartContext {
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
}

export interface DeliveryExpressCreateOrderRequest {
  readonly path: "/api/paypal/orders/express-delivery";
  readonly body: {
    readonly cart_id: string;
    readonly method: DeliveryExpressPaymentMethod;
  };
  readonly query: ApiQueryParams;
  readonly options?: ApiRequestOptions;
}

export function buildDeliveryExpressCreateOrderRequest({
  cartClientSecret,
  cartPublicId,
  market,
  method,
  requestOptions,
}: {
  readonly cartClientSecret?: string | null | undefined;
  readonly cartPublicId: string;
  readonly market: string;
  readonly method: DeliveryExpressPaymentMethod;
  readonly requestOptions?: ApiRequestOptions | undefined;
}): DeliveryExpressCreateOrderRequest {
  const normalizedCartPublicId = cartPublicId.trim();
  const normalizedCartClientSecret = cartClientSecret?.trim() ?? "";

  if (!normalizedCartPublicId) {
    throw new Error("Delivery express checkout needs a synced cart.");
  }
  if (!normalizedCartClientSecret && !hasAuthorizationHeader(requestOptions)) {
    throw new Error("Delivery express checkout needs a cart owner context.");
  }

  const options = buildDeliveryExpressRequestOptions({
    cartClientSecret: normalizedCartClientSecret,
    cartPublicId: normalizedCartPublicId,
    requestOptions,
  });

  return {
    path: "/api/paypal/orders/express-delivery",
    body: {
      cart_id: normalizedCartPublicId,
      method,
    },
    query: {
      market,
    },
    options,
  };
}

function buildDeliveryExpressRequestOptions({
  cartClientSecret,
  cartPublicId,
  requestOptions,
}: {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
  readonly requestOptions?: ApiRequestOptions | undefined;
}): ApiRequestOptions {
  return {
    ...requestOptions,
    headers: {
      ...requestOptions?.headers,
      ...(cartClientSecret
        ? {
            "x-cart-id": cartPublicId,
            "x-cart-secret": cartClientSecret,
          }
        : {}),
    },
  };
}

function hasAuthorizationHeader(
  requestOptions?: ApiRequestOptions | undefined,
): boolean {
  const authorization = requestOptions?.headers?.authorization;

  return typeof authorization === "string" && authorization.trim().length > 0;
}

export function formatDeliveryExpressMethod(
  method: DeliveryExpressPaymentMethod,
): string {
  return method === "paylater" ? "Pay Later" : "PayPal";
}

export function formatDeliveryExpressSource(
  source: DeliveryExpressSource,
): string {
  if (source === "product_detail") {
    return "Delivery express from product detail";
  }

  return source === "minicart"
    ? "Delivery express from minicart"
    : "Delivery express from cart";
}

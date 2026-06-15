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
}: {
  readonly cartClientSecret?: string;
  readonly cartPublicId: string;
  readonly market: string;
  readonly method: DeliveryExpressPaymentMethod;
}): DeliveryExpressCreateOrderRequest {
  const options = cartClientSecret
    ? {
        headers: {
          "x-cart-id": cartPublicId,
          "x-cart-secret": cartClientSecret,
        },
      }
    : undefined;

  return {
    path: "/api/paypal/orders/express-delivery",
    body: {
      cart_id: cartPublicId,
      method,
    },
    query: {
      market,
    },
    ...(options ? { options } : {}),
  };
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

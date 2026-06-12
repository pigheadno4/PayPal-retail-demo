export type DeliveryExpressPaymentMethod = "paypal" | "paylater";

export type DeliveryExpressSource = "product_detail" | "cart" | "minicart";

export interface DeliveryExpressStartContext {
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
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

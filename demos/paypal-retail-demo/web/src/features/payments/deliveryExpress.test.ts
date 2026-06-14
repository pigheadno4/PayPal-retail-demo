import { describe, expect, it } from "vitest";

import { buildDeliveryExpressCreateOrderRequest } from "./deliveryExpress.js";

describe("deliveryExpress", () => {
  it("builds the PayPal express delivery create-order request from the active cart binding", () => {
    expect(
      buildDeliveryExpressCreateOrderRequest({
        cartPublicId: "cart_public_guest",
        market: "US",
        method: "paypal",
      }),
    ).toEqual({
      path: "/api/paypal/orders/express-delivery",
      body: {
        cart_id: "cart_public_guest",
        method: "paypal",
      },
      query: {
        market: "US",
      },
    });
  });

  it("builds the Pay Later express delivery create-order request from the active cart binding", () => {
    expect(
      buildDeliveryExpressCreateOrderRequest({
        cartPublicId: "cart_public_guest",
        market: "US",
        method: "paylater",
      }),
    ).toEqual({
      path: "/api/paypal/orders/express-delivery",
      body: {
        cart_id: "cart_public_guest",
        method: "paylater",
      },
      query: {
        market: "US",
      },
    });
  });
});

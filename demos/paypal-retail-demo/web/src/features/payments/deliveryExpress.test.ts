import { describe, expect, it } from "vitest";

import { buildDeliveryExpressCreateOrderRequest } from "./deliveryExpress.js";

describe("deliveryExpress", () => {
  it("builds the PayPal express delivery create-order request from the active cart binding", () => {
    expect(
      buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: "cart_secret_guest",
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
      options: {
        headers: {
          "x-cart-id": "cart_public_guest",
          "x-cart-secret": "cart_secret_guest",
        },
      },
    });
  });

  it("builds the Pay Later express delivery create-order request from the active cart binding", () => {
    expect(
      buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: "cart_secret_guest",
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
      options: {
        headers: {
          "x-cart-id": "cart_public_guest",
          "x-cart-secret": "cart_secret_guest",
        },
      },
    });
  });

  it("adds paired guest cart headers when the active cart has a client secret", () => {
    expect(
      buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: "cart_secret_guest",
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
      options: {
        headers: {
          "x-cart-id": "cart_public_guest",
          "x-cart-secret": "cart_secret_guest",
        },
      },
    });
  });

  it("blocks express create-order requests without a cart public ID", () => {
    expect(() =>
      buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: "cart_secret_guest",
        cartPublicId: "",
        market: "US",
        method: "paypal",
      }),
    ).toThrow("Delivery express checkout needs a synced cart.");
  });

  it("blocks express create-order requests without guest or signed-in owner context", () => {
    expect(() =>
      buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: "",
        cartPublicId: "cart_public_guest",
        market: "US",
        method: "paypal",
      }),
    ).toThrow("Delivery express checkout needs a cart owner context.");
  });
});

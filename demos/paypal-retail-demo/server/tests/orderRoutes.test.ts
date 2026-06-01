import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type {
  GuestOrderLookupInput,
  OrderRepository,
} from "../src/routes/orders.js";
import { requestApp } from "./helpers/requestApp.js";

describe("order routes", () => {
  it("looks up a guest order by normalized order number and email", async () => {
    const repository = createOrderRepository();
    const app = createOrderApp(repository);

    const response = await requestApp(
      app,
      "GET",
      "/api/guest-orders/do-20260526-000003?email=%20Guest.Collector%40Example.Test%20",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: guestOrderResponse(),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([
      {
        orderNumber: "DO-20260526-000003",
        email: "guest.collector@example.test",
      },
    ]);
  });

  it("returns buyer-safe validation errors before repository lookup", async () => {
    const repository = createOrderRepository();
    const app = createOrderApp(repository);

    const invalidOrderNumber = await requestApp(
      app,
      "GET",
      "/api/guest-orders/order-123?email=guest@example.test",
    );
    const missingEmail = await requestApp(
      app,
      "GET",
      "/api/guest-orders/DO-20260526-000003",
    );

    expect(invalidOrderNumber.status).toBe(400);
    expect(invalidOrderNumber.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_GUEST_ORDER_LOOKUP_REQUEST",
        message: "A valid order number and email are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(missingEmail.status).toBe(400);
    expect(repository.calls).toEqual([]);
  });

  it("uses a generic not-found response when order number and email do not match", async () => {
    const repository = createOrderRepository(null);
    const app = createOrderApp(repository);

    const response = await requestApp(
      app,
      "GET",
      "/api/guest-orders/DO-20260526-000003?email=wrong@example.test",
    );

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "GUEST_ORDER_NOT_FOUND",
        message: "No guest order matched the provided order number and email.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

function createOrderApp(
  repository: OrderRepository & { readonly calls: readonly unknown[] },
) {
  return createApp({
    orders: {
      orderRepository: repository,
    },
  });
}

function createOrderRepository(
  lookupResponse = guestOrderResponse(),
): OrderRepository & {
  readonly calls: GuestOrderLookupInput[];
} {
  const calls: GuestOrderLookupInput[] = [];

  return {
    calls,
    async lookupGuestOrder(input) {
      calls.push(input);
      return lookupResponse;
    },
  };
}

function guestOrderResponse() {
  return {
    order: {
      order_number: "DO-20260526-000003",
      fulfillment_mode: "delivery",
      status: "delivered",
      payment_status: "captured",
      currency_code: "USD",
      review_eligible: true,
      totals: {
        subtotal_minor: 2599,
        discount_minor: 500,
        tax_minor: 242,
        shipping_minor: 595,
        total_minor: 2936,
      },
      items: [
        {
          product_name: "Labubu Macaron Vinyl Face",
          quantity: 1,
          line_total_minor: 2341,
        },
      ],
      addresses: [
        {
          address_type: "shipping",
          city: "Miami",
          country_code: "US",
        },
      ],
    },
  };
}

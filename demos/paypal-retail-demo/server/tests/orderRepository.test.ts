import { describe, expect, it } from "vitest";

import {
  createSupabaseOrderRepository,
  type GuestOrderAccessRow,
  type OrderAddressRow,
  type OrderDataSource,
  type OrderItemRow,
  type OrderRow,
} from "../src/repositories/orderRepository.js";

describe("Supabase-backed order repository", () => {
  it("looks up guest orders with normalized email hash and hides internal IDs", async () => {
    const dataSource = createOrderDataSource();
    const repository = createRepository(dataSource);

    const response = await repository.lookupGuestOrder({
      orderNumber: "DO-20260526-000003",
      email: " Guest.Collector@Example.Test ",
    });

    expect(response).toEqual({
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
            product_sku: "POP-LABUBU-009",
            product_name: "Labubu Macaron Vinyl Face",
            product_url: "/popmart/products/labubu-macaron-vinyl-face",
            product_image_url:
              "/popmart/products/labubu-macaron-vinyl-face-1.webp",
            unit_price_minor: 2599,
            quantity: 1,
            fulfillable_quantity: 1,
            unavailable_quantity: 0,
            line_subtotal_minor: 2599,
            line_discount_minor: 500,
            line_tax_minor: 242,
            line_total_minor: 2341,
          },
        ],
        addresses: [
          {
            address_type: "shipping",
            recipient_name: "Guest Collector",
            city: "Miami",
            state: "FL",
            postal_code: "33127",
            country_code: "US",
          },
        ],
      },
    });
    expect(JSON.stringify(response)).not.toContain("order_guest_delivered");
    expect(dataSource.guestOrderAccess[0]).toMatchObject({
      lookup_attempt_count: 1,
      last_lookup_at: "2026-06-01T11:00:00.000Z",
    });
  });

  it("returns null for an email mismatch without exposing which field failed", async () => {
    const dataSource = createOrderDataSource();
    const repository = createRepository(dataSource);

    await expect(
      repository.lookupGuestOrder({
        orderNumber: "DO-20260526-000003",
        email: "wrong@example.test",
      }),
    ).resolves.toBeNull();
    expect(dataSource.guestOrderAccess[0]).toMatchObject({
      lookup_attempt_count: 1,
      last_lookup_at: "2026-06-01T11:00:00.000Z",
    });
  });
});

function createRepository(dataSource: FakeOrderDataSource) {
  return createSupabaseOrderRepository({
    dataSource,
    now: "2026-06-01T11:00:00.000Z",
    hashGuestEmail: (email) => `hash:${email.trim().toLowerCase()}`,
  });
}

function createOrderDataSource(): FakeOrderDataSource {
  return new FakeOrderDataSource();
}

class FakeOrderDataSource implements OrderDataSource {
  readonly orders: OrderRow[] = [
    {
      id: "order_guest_delivered",
      order_number: "DO-20260526-000003",
      fulfillment_mode: "delivery",
      status: "delivered",
      payment_status: "captured",
      currency_code: "USD",
      subtotal_minor: 2599,
      discount_minor: 500,
      tax_minor: 242,
      shipping_minor: 595,
      total_minor: 2936,
    },
  ];

  readonly guestOrderAccess: GuestOrderAccessRow[] = [
    {
      id: "guest_access_1",
      order_id: "order_guest_delivered",
      guest_email_hash: "hash:guest.collector@example.test",
      lookup_attempt_count: 0,
      last_lookup_at: null,
    },
  ];

  readonly orderItems: OrderItemRow[] = [
    {
      id: "order_item_1",
      order_id: "order_guest_delivered",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 2599,
      quantity: 1,
      fulfillable_quantity: 1,
      unavailable_quantity: 0,
      line_subtotal_minor: 2599,
      line_discount_minor: 500,
      line_tax_minor: 242,
      line_total_minor: 2341,
    },
  ];

  readonly orderAddresses: OrderAddressRow[] = [
    {
      id: "order_address_1",
      order_id: "order_guest_delivered",
      address_type: "shipping",
      recipient_name: "Guest Collector",
      phone: "+1 305 555 0144",
      address_line1: "100 NW 25th St",
      address_line2: null,
      city: "Miami",
      state: "FL",
      postal_code: "33127",
      country_code: "US",
    },
  ];

  async getOrderByNumber(orderNumber: string): Promise<OrderRow | null> {
    return (
      this.orders.find((order) => order.order_number === orderNumber) ?? null
    );
  }

  async getGuestOrderAccessByOrderId(
    orderId: string,
  ): Promise<GuestOrderAccessRow | null> {
    return (
      this.guestOrderAccess.find((access) => access.order_id === orderId) ??
      null
    );
  }

  async updateGuestOrderAccess(input: {
    readonly id: string;
    readonly lookupAttemptCount: number;
    readonly lastLookupAt: string;
  }): Promise<void> {
    const access = this.guestOrderAccess.find((row) => row.id === input.id);
    if (!access) {
      throw new Error(`Missing guest order access ${input.id}`);
    }
    access.lookup_attempt_count = input.lookupAttemptCount;
    access.last_lookup_at = input.lastLookupAt;
  }

  async listOrderItems(orderId: string): Promise<readonly OrderItemRow[]> {
    return this.orderItems.filter((item) => item.order_id === orderId);
  }

  async listOrderAddresses(
    orderId: string,
  ): Promise<readonly OrderAddressRow[]> {
    return this.orderAddresses.filter(
      (address) => address.order_id === orderId,
    );
  }
}

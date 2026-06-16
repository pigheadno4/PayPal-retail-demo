import { describe, expect, it } from "vitest";

import {
  createSupabaseAccountRepository,
  type AccountAddressRow,
  type AccountDataSource,
  type AccountOrderAddressRow,
  type AccountOrderItemRow,
  type AccountOrderLifecycleEventRow,
  type AccountOrderReviewRow,
  type AccountOrderRow,
  type AccountSavedPaymentMethodRow,
  type AccountUserProfileRow,
} from "../src/repositories/accountRepository.js";

describe("Account repository", () => {
  it("blocks deleting the only default shipping and billing address", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.deleteAddress({
      authUserId: "user_123",
      addressId: "address_default",
    });

    expect(result).toEqual({
      status: "blocked",
      reason:
        "Choose another default shipping and billing address before deleting this address.",
      addresses: [defaultAddressDto()],
    });
    expect(dataSource.deletedAddressIds).toEqual([]);
  });

  it("promotes an address by clearing existing shipping and billing defaults first", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow(), secondaryAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.updateAddress({
      authUserId: "user_123",
      addressId: "address_secondary",
      patch: {
        is_default_shipping: true,
        is_default_billing: true,
      },
    });

    expect(dataSource.clearDefaultShippingCalls).toEqual(["user_123"]);
    expect(dataSource.clearDefaultBillingCalls).toEqual(["user_123"]);
    expect(dataSource.updatedAddresses).toEqual([
      {
        id: "address_secondary",
        patch: {
          is_default_shipping: true,
          is_default_billing: true,
          updated_at: "2026-06-16T00:00:00.000Z",
        },
      },
    ]);
    expect(result).toEqual([
      {
        ...defaultAddressDto(),
        is_default_shipping: false,
        is_default_billing: false,
      },
      {
        ...secondaryAddressDto(),
        is_default_shipping: true,
        is_default_billing: true,
      },
    ]);
  });

  it("does not clear defaults or update when the address is not owned by the buyer", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow(), secondaryAddressRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.updateAddress({
      authUserId: "user_123",
      addressId: "address_other_buyer",
      patch: {
        is_default_shipping: true,
        is_default_billing: true,
      },
    });

    expect(dataSource.clearDefaultShippingCalls).toEqual([]);
    expect(dataSource.clearDefaultBillingCalls).toEqual([]);
    expect(dataSource.updatedAddresses).toEqual([]);
    expect(result).toEqual([defaultAddressDto(), secondaryAddressDto()]);
  });

  it("lists account orders with buyer-safe timeline and review eligibility", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pickedUpOrderRow(), pendingOrderRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.listOrders("user_123");

    expect(result).toEqual([pickedUpOrderDto(), pendingOrderDto()]);
    expect(JSON.stringify(result)).not.toContain("order_internal");
    expect(JSON.stringify(result)).not.toContain("payment_session");
  });

  it("returns null when account order detail is not owned by the buyer", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pickedUpOrderRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    await expect(
      repository.getOrder({
        authUserId: "user_123",
        orderNumber: "DO-20260609-000999",
      }),
    ).resolves.toBeNull();
  });
});

interface FakeAccountDataSource extends AccountDataSource {
  readonly clearDefaultBillingCalls: string[];
  readonly clearDefaultShippingCalls: string[];
  readonly deletedAddressIds: string[];
  readonly updatedAddresses: Array<{
    readonly id: string;
    readonly patch: Partial<AccountAddressRow>;
  }>;
}

function createAccountDataSource(input: {
  readonly addresses: readonly AccountAddressRow[];
  readonly orders?: readonly AccountOrderRow[];
}): FakeAccountDataSource {
  let addresses = [...input.addresses];
  const orders = [...(input.orders ?? [])];
  const clearDefaultBillingCalls: string[] = [];
  const clearDefaultShippingCalls: string[] = [];
  const deletedAddressIds: string[] = [];
  const updatedAddresses: FakeAccountDataSource["updatedAddresses"] = [];

  return {
    clearDefaultBillingCalls,
    clearDefaultShippingCalls,
    deletedAddressIds,
    updatedAddresses,
    async findUserProfileByEmail(): Promise<AccountUserProfileRow | null> {
      return null;
    },
    async listSavedPaymentMethods(): Promise<
      readonly AccountSavedPaymentMethodRow[]
    > {
      return [];
    },
    async getSavedPaymentMethodForUser(): Promise<AccountSavedPaymentMethodRow | null> {
      return null;
    },
    async updateSavedPaymentMethod(): Promise<AccountSavedPaymentMethodRow> {
      throw new Error("not used");
    },
    async listAddresses(authUserId) {
      return addresses.filter((address) => address.auth_user_id === authUserId);
    },
    async listOrders(authUserId) {
      return orders.filter((order) => order.auth_user_id === authUserId);
    },
    async getOrderByNumberForUser(input) {
      return (
        orders.find(
          (order) =>
            order.auth_user_id === input.authUserId &&
            order.order_number === input.orderNumber,
        ) ?? null
      );
    },
    async listOrderItems(orderId) {
      return orderItems().filter((item) => item.order_id === orderId);
    },
    async listOrderAddresses(orderId) {
      return orderAddresses().filter((address) => address.order_id === orderId);
    },
    async listOrderLifecycleEvents(orderId) {
      return orderLifecycleEvents().filter(
        (event) => event.order_id === orderId,
      );
    },
    async listOrderReviews(orderId) {
      return orderReviews().filter((review) => review.order_id === orderId);
    },
    async createAddress(address) {
      const row = {
        ...address,
        id: "address_created",
        created_at: "2026-06-16T00:00:00.000Z",
        updated_at: "2026-06-16T00:00:00.000Z",
      } satisfies AccountAddressRow;
      addresses = [...addresses, row];
      return row;
    },
    async getAddressForUser(input) {
      return (
        addresses.find(
          (address) =>
            address.id === input.addressId &&
            address.auth_user_id === input.authUserId,
        ) ?? null
      );
    },
    async updateAddress(id, patch) {
      updatedAddresses.push({ id, patch });
      let updatedAddress: AccountAddressRow | null = null;
      addresses = addresses.map((address) => {
        if (address.id !== id) {
          return address;
        }
        updatedAddress = {
          ...address,
          ...patch,
        };
        return updatedAddress;
      });
      if (!updatedAddress) {
        throw new Error(`Address ${id} not found`);
      }
      return updatedAddress;
    },
    async clearDefaultShipping(authUserId) {
      clearDefaultShippingCalls.push(authUserId);
      addresses = addresses.map((address) =>
        address.auth_user_id === authUserId
          ? { ...address, is_default_shipping: false }
          : address,
      );
    },
    async clearDefaultBilling(authUserId) {
      clearDefaultBillingCalls.push(authUserId);
      addresses = addresses.map((address) =>
        address.auth_user_id === authUserId
          ? { ...address, is_default_billing: false }
          : address,
      );
    },
    async deleteAddress(id) {
      deletedAddressIds.push(id);
      addresses = addresses.filter((address) => address.id !== id);
    },
  };
}

function defaultAddressRow(): AccountAddressRow {
  return {
    id: "address_default",
    auth_user_id: "user_123",
    label: "Home",
    recipient_name: "Buyer One",
    phone: "555-0101",
    address_line1: "742 N Fairfax Ave",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    postal_code: "90046",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
    created_at: "2026-06-15T00:00:00.000Z",
    updated_at: "2026-06-15T00:00:00.000Z",
  };
}

function secondaryAddressRow(): AccountAddressRow {
  return {
    ...defaultAddressRow(),
    id: "address_secondary",
    label: "Studio",
    address_line1: "1 Market St",
    city: "San Francisco",
    postal_code: "94105",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function defaultAddressDto() {
  return {
    id: "address_default",
    label: "Home",
    recipient_name: "Buyer One",
    phone: "555-0101",
    address_line1: "742 N Fairfax Ave",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    postal_code: "90046",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function secondaryAddressDto() {
  return {
    ...defaultAddressDto(),
    id: "address_secondary",
    label: "Studio",
    address_line1: "1 Market St",
    city: "San Francisco",
    postal_code: "94105",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function pickedUpOrderRow(): AccountOrderRow {
  return {
    id: "order_internal_pickup",
    order_number: "PO-20260602-000118",
    auth_user_id: "user_123",
    fulfillment_mode: "pickup",
    status: "picked_up",
    payment_status: "captured",
    currency_code: "USD",
    subtotal_minor: 2998,
    discount_minor: 300,
    tax_minor: 118,
    shipping_minor: 0,
    total_minor: 2816,
    created_at: "2026-06-02T18:30:00.000Z",
  };
}

function pendingOrderRow(): AccountOrderRow {
  return {
    id: "order_internal_pending",
    order_number: "DO-20260607-000123",
    auth_user_id: "user_123",
    fulfillment_mode: "delivery",
    status: "pending",
    payment_status: "started",
    currency_code: "USD",
    subtotal_minor: 3997,
    discount_minor: 400,
    tax_minor: 110,
    shipping_minor: 400,
    total_minor: 4107,
    created_at: "2026-06-07T20:15:00.000Z",
  };
}

function orderItems(): readonly AccountOrderItemRow[] {
  return [
    {
      id: "order_item_internal_skullpanda",
      order_id: "order_internal_pickup",
      product_name_snapshot: "Skullpanda Future Drop",
      product_url_snapshot: "/products/skullpanda-future-drop",
      product_image_url_snapshot:
        "/assets/popmart/products/skullpanda-future-drop-1.svg",
      unit_price_minor: 1599,
      quantity: 1,
      line_total_minor: 1599,
    },
    {
      id: "order_item_internal_labubu",
      order_id: "order_internal_pending",
      product_name_snapshot: "Labubu Have a Seat",
      product_url_snapshot: "/products/labubu-have-a-seat",
      product_image_url_snapshot:
        "/assets/popmart/products/labubu-have-a-seat-1.svg",
      unit_price_minor: 1399,
      quantity: 1,
      line_total_minor: 1399,
    },
  ];
}

function orderAddresses(): readonly AccountOrderAddressRow[] {
  return [
    {
      id: "order_address_internal_pickup",
      order_id: "order_internal_pickup",
      address_type: "pickup_store",
      recipient_name: "S2S POP MART Soho",
      city: "New York",
      state: "NY",
      postal_code: "10012",
      country_code: "US",
    },
    {
      id: "order_address_internal_delivery",
      order_id: "order_internal_pending",
      address_type: "shipping",
      recipient_name: "Buyer One",
      city: "Los Angeles",
      state: "CA",
      postal_code: "90046",
      country_code: "US",
    },
  ];
}

function orderLifecycleEvents(): readonly AccountOrderLifecycleEventRow[] {
  return [
    {
      id: "event_internal_pickup_placed",
      order_id: "order_internal_pickup",
      from_status: null,
      to_status: "paid",
      note: "Pickup order was created and paid.",
      created_at: "2026-06-02T18:30:00.000Z",
    },
    {
      id: "event_internal_pickup_ready",
      order_id: "order_internal_pickup",
      from_status: "paid",
      to_status: "ready_for_pickup",
      note: "Store team confirmed inventory for pickup.",
      created_at: "2026-06-03T16:00:00.000Z",
    },
    {
      id: "event_internal_pickup_done",
      order_id: "order_internal_pickup",
      from_status: "ready_for_pickup",
      to_status: "picked_up",
      note: "Buyer collected the order in store.",
      created_at: "2026-06-04T16:00:00.000Z",
    },
    {
      id: "event_internal_pending",
      order_id: "order_internal_pending",
      from_status: null,
      to_status: "pending",
      note: "Order snapshot saved for resume.",
      created_at: "2026-06-07T20:15:00.000Z",
    },
  ];
}

function orderReviews(): readonly AccountOrderReviewRow[] {
  return [
    {
      id: "review_internal_deleted",
      order_id: "order_internal_pickup",
      order_item_id: "order_item_internal_skullpanda",
      status: "deleted",
    },
  ];
}

function pickedUpOrderDto() {
  return {
    order_number: "PO-20260602-000118",
    placed_at: "2026-06-02T18:30:00.000Z",
    fulfillment_mode: "pickup",
    status: "picked_up",
    payment_status: "captured",
    currency_code: "USD",
    review_eligible: true,
    fulfillment_label: "Pickup at POP MART Soho",
    totals: {
      subtotal_minor: 2998,
      discount_minor: 300,
      tax_minor: 118,
      shipping_minor: 0,
      total_minor: 2816,
    },
    items: [
      {
        id: "line_1",
        product_name: "Skullpanda Future Drop",
        product_url: "/products/skullpanda-future-drop",
        product_image_url:
          "/assets/popmart/products/skullpanda-future-drop-1.svg",
        unit_price_minor: 1599,
        quantity: 1,
        line_total_minor: 1599,
        review_eligible: true,
        review_submitted: false,
      },
    ],
    timeline: [
      {
        label: "Paid",
        description: "Pickup order was created and paid.",
        status: "complete",
        occurred_at: "2026-06-02T18:30:00.000Z",
      },
      {
        label: "Ready for pickup",
        description: "Store team confirmed inventory for pickup.",
        status: "complete",
        occurred_at: "2026-06-03T16:00:00.000Z",
      },
      {
        label: "Picked up",
        description: "Buyer collected the order in store.",
        status: "current",
        occurred_at: "2026-06-04T16:00:00.000Z",
      },
    ],
    addresses: [
      {
        address_type: "pickup_store",
        recipient_name: "S2S POP MART Soho",
        city: "New York",
        state: "NY",
        postal_code: "10012",
        country_code: "US",
      },
    ],
  };
}

function pendingOrderDto() {
  return {
    order_number: "DO-20260607-000123",
    placed_at: "2026-06-07T20:15:00.000Z",
    fulfillment_mode: "delivery",
    status: "pending",
    payment_status: "started",
    currency_code: "USD",
    review_eligible: false,
    fulfillment_label: "Delivery order",
    totals: {
      subtotal_minor: 3997,
      discount_minor: 400,
      tax_minor: 110,
      shipping_minor: 400,
      total_minor: 4107,
    },
    items: [
      {
        id: "line_1",
        product_name: "Labubu Have a Seat",
        product_url: "/products/labubu-have-a-seat",
        product_image_url: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        unit_price_minor: 1399,
        quantity: 1,
        line_total_minor: 1399,
        review_eligible: false,
        review_submitted: false,
      },
    ],
    timeline: [
      {
        label: "Pending payment",
        description: "Order snapshot saved for resume.",
        status: "current",
        occurred_at: "2026-06-07T20:15:00.000Z",
      },
    ],
    addresses: [
      {
        address_type: "shipping",
        recipient_name: "Buyer One",
        city: "Los Angeles",
        state: "CA",
        postal_code: "90046",
        country_code: "US",
      },
    ],
  };
}

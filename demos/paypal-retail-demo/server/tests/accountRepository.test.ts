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
  type GuestOrderAccessRow,
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

  it("replaces unsafe lifecycle notes before returning the Account timeline", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pickedUpOrderRow()],
      lifecycleEvents: [
        {
          id: "event_internal_pickup_done",
          order_id: "order_internal_pickup",
          from_status: "ready_for_pickup",
          to_status: "picked_up",
          note: "payment_session_1",
          created_at: "2026-06-04T16:00:00.000Z",
        },
      ],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.getOrder({
      authUserId: "user_123",
      orderNumber: "PO-20260602-000118",
    });

    expect(result?.timeline).toEqual([
      expect.objectContaining({
        description: "Order status updated.",
      }),
    ]);
    expect(JSON.stringify(result)).not.toMatch(/payment_session_1/i);
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

  it("links unowned guest orders with a matching authenticated email hash", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      guestOrderAccess: [
        {
          id: "guest_access_1",
          order_id: "order_guest_match",
          guest_email_hash: "hash:buyer@example.test",
        },
        {
          id: "guest_access_2",
          order_id: "order_guest_other",
          guest_email_hash: "hash:other@example.test",
        },
      ],
      orders: [
        {
          ...pickedUpOrderRow(),
          auth_user_id: null,
          id: "order_guest_match",
          order_number: "DO-20260612-000221",
        },
        {
          ...pendingOrderRow(),
          auth_user_id: null,
          id: "order_guest_other",
          order_number: "DO-20260612-000222",
        },
      ],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      hashGuestEmail: (email) => `hash:${email.trim().toLowerCase()}`,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.linkGuestOrders({
      authUserId: "user_123",
      email: " Buyer@Example.Test ",
    });

    expect(result).toEqual({
      linked_order_count: 1,
    });
    expect(dataSource.linkedOrderIds).toEqual(["order_guest_match"]);
    await expect(dataSource.listOrders("user_123")).resolves.toEqual([
      expect.objectContaining({
        id: "order_guest_match",
        auth_user_id: "user_123",
      }),
    ]);
  });

  it("submits one active review for a completed order item", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pickedUpOrderRow()],
      reviews: [],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.submitOrderItemReview({
      authUserId: "user_123",
      orderNumber: "PO-20260602-000118",
      itemId: "line_1",
      review: {
        rating: 5,
        title: "Tiny display shelf star",
        body: "The paint details look great beside my other figures.",
      },
    });

    expect(result).toEqual({
      status: "updated",
      order: reviewedPickedUpOrderDto(),
    });
    expect(dataSource.createdReviews).toEqual([
      {
        profile_id: "profile_popmart",
        product_id: "product_skullpanda",
        order_id: "order_internal_pickup",
        order_item_id: "order_item_internal_skullpanda",
        auth_user_id: "user_123",
        rating: 5,
        title: "Tiny display shelf star",
        body: "The paint details look great beside my other figures.",
        status: "active",
      },
    ]);
  });

  it("blocks review submission for pending orders", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pendingOrderRow()],
      reviews: [],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const result = await repository.submitOrderItemReview({
      authUserId: "user_123",
      orderNumber: "DO-20260607-000123",
      itemId: "line_1",
      review: {
        rating: 5,
        title: "Too early",
        body: "This should not be accepted before fulfillment completes.",
      },
    });

    expect(result).toEqual({
      status: "not_eligible",
      reason: "Reviews open after delivery or pickup is complete.",
    });
    expect(dataSource.createdReviews).toEqual([]);
  });

  it("edits and deletes the active review for an owned completed order item", async () => {
    const dataSource = createAccountDataSource({
      addresses: [defaultAddressRow()],
      orders: [pickedUpOrderRow()],
      reviews: [activeOrderReviewRow()],
    });
    const repository = createSupabaseAccountRepository({
      dataSource,
      now: "2026-06-16T00:00:00.000Z",
    });

    const updateResult = await repository.updateOrderItemReview({
      authUserId: "user_123",
      orderNumber: "PO-20260602-000118",
      itemId: "line_1",
      review: {
        rating: 4,
        title: "Still a favorite",
        body: "Updated after unboxing the stand accessories.",
      },
    });
    const deleteResult = await repository.deleteOrderItemReview({
      authUserId: "user_123",
      orderNumber: "PO-20260602-000118",
      itemId: "line_1",
    });

    expect(updateResult).toEqual({
      status: "updated",
      order: updatedReviewPickedUpOrderDto(),
    });
    expect(deleteResult).toEqual({
      status: "updated",
      order: pickedUpOrderDto(),
    });
    expect(dataSource.updatedReviews).toEqual([
      {
        id: "review_internal_active",
        patch: {
          rating: 4,
          title: "Still a favorite",
          body: "Updated after unboxing the stand accessories.",
          updated_at: "2026-06-16T00:00:00.000Z",
        },
      },
      {
        id: "review_internal_active",
        patch: {
          status: "deleted",
          updated_at: "2026-06-16T00:00:00.000Z",
        },
      },
    ]);
  });
});

interface FakeAccountDataSource extends AccountDataSource {
  readonly clearDefaultBillingCalls: string[];
  readonly clearDefaultShippingCalls: string[];
  readonly createdReviews: Array<{
    readonly profile_id: string;
    readonly product_id: string;
    readonly order_id: string;
    readonly order_item_id: string;
    readonly auth_user_id: string;
    readonly rating: number;
    readonly title: string | null;
    readonly body: string;
    readonly status: "active";
  }>;
  readonly deletedAddressIds: string[];
  readonly linkedOrderIds: string[];
  readonly updatedAddresses: Array<{
    readonly id: string;
    readonly patch: Partial<AccountAddressRow>;
  }>;
  readonly updatedReviews: Array<{
    readonly id: string;
    readonly patch: Partial<AccountOrderReviewRow>;
  }>;
}

function createAccountDataSource(input: {
  readonly addresses: readonly AccountAddressRow[];
  readonly guestOrderAccess?: readonly GuestOrderAccessRow[];
  readonly lifecycleEvents?: readonly AccountOrderLifecycleEventRow[];
  readonly orders?: readonly AccountOrderRow[];
  readonly reviews?: readonly AccountOrderReviewRow[];
}): FakeAccountDataSource {
  let addresses = [...input.addresses];
  let orders = [...(input.orders ?? [])];
  let reviews = [...(input.reviews ?? orderReviews())];
  const guestOrderAccess = [...(input.guestOrderAccess ?? [])];
  const lifecycleEvents = [
    ...(input.lifecycleEvents ?? orderLifecycleEvents()),
  ];
  const clearDefaultBillingCalls: string[] = [];
  const clearDefaultShippingCalls: string[] = [];
  const createdReviews: FakeAccountDataSource["createdReviews"] = [];
  const deletedAddressIds: string[] = [];
  const linkedOrderIds: string[] = [];
  const updatedAddresses: FakeAccountDataSource["updatedAddresses"] = [];
  const updatedReviews: FakeAccountDataSource["updatedReviews"] = [];

  return {
    clearDefaultBillingCalls,
    clearDefaultShippingCalls,
    createdReviews,
    deletedAddressIds,
    linkedOrderIds,
    updatedAddresses,
    updatedReviews,
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
    async listGuestOrderAccessByEmailHash(guestEmailHash) {
      return guestOrderAccess.filter(
        (access) => access.guest_email_hash === guestEmailHash,
      );
    },
    async claimGuestOrderForUser(input) {
      const order = orders.find(
        (candidate) =>
          candidate.id === input.orderId && candidate.auth_user_id === null,
      );
      if (!order) {
        return null;
      }
      linkedOrderIds.push(input.orderId);
      orders = orders.map((candidate) =>
        candidate.id === input.orderId
          ? {
              ...candidate,
              auth_user_id: input.authUserId,
            }
          : candidate,
      );
      return orders.find((candidate) => candidate.id === input.orderId) ?? null;
    },
    async listOrderItems(orderId) {
      return orderItems().filter((item) => item.order_id === orderId);
    },
    async listOrderAddresses(orderId) {
      return orderAddresses().filter((address) => address.order_id === orderId);
    },
    async listOrderLifecycleEvents(orderId) {
      return lifecycleEvents.filter((event) => event.order_id === orderId);
    },
    async listOrderReviews(orderId) {
      return reviews.filter((review) => review.order_id === orderId);
    },
    async createOrderReview(review) {
      createdReviews.push(review);
      const row = {
        ...review,
        id: "review_created",
        created_at: "2026-06-16T00:00:00.000Z",
        updated_at: "2026-06-16T00:00:00.000Z",
      } satisfies AccountOrderReviewRow;
      reviews = [...reviews, row];
      return row;
    },
    async getActiveReviewForOrderItem(input) {
      return (
        reviews.find(
          (review) =>
            review.auth_user_id === input.authUserId &&
            review.order_id === input.orderId &&
            review.order_item_id === input.orderItemId &&
            review.status === "active",
        ) ?? null
      );
    },
    async updateOrderReview(id, patch) {
      updatedReviews.push({ id, patch });
      let updatedReview: AccountOrderReviewRow | null = null;
      reviews = reviews.map((review) => {
        if (review.id !== id) {
          return review;
        }
        updatedReview = {
          ...review,
          ...patch,
        };
        return updatedReview;
      });
      if (!updatedReview) {
        throw new Error(`Review ${id} not found`);
      }
      return updatedReview;
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
    profile_id: "profile_popmart",
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
    profile_id: "profile_popmart",
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
      product_id: "product_skullpanda",
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
      product_id: "product_labubu",
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
      profile_id: "profile_popmart",
      product_id: "product_skullpanda",
      order_id: "order_internal_pickup",
      order_item_id: "order_item_internal_skullpanda",
      auth_user_id: "user_123",
      rating: 3,
      title: "Archived review",
      body: "This deleted review should not block a new one.",
      status: "deleted",
      created_at: "2026-06-05T16:00:00.000Z",
      updated_at: "2026-06-05T16:00:00.000Z",
    },
  ];
}

function activeOrderReviewRow(): AccountOrderReviewRow {
  return {
    id: "review_internal_active",
    profile_id: "profile_popmart",
    product_id: "product_skullpanda",
    order_id: "order_internal_pickup",
    order_item_id: "order_item_internal_skullpanda",
    auth_user_id: "user_123",
    rating: 5,
    title: "Tiny display shelf star",
    body: "The paint details look great beside my other figures.",
    status: "active",
    created_at: "2026-06-05T16:00:00.000Z",
    updated_at: "2026-06-05T16:00:00.000Z",
  };
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
        review: null,
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

function reviewedPickedUpOrderDto() {
  const order = pickedUpOrderDto();
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      review_eligible: false,
      review_submitted: true,
      review: {
        rating: 5,
        title: "Tiny display shelf star",
        body: "The paint details look great beside my other figures.",
      },
    })),
  };
}

function updatedReviewPickedUpOrderDto() {
  const order = pickedUpOrderDto();
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      review_eligible: false,
      review_submitted: true,
      review: {
        rating: 4,
        title: "Still a favorite",
        body: "Updated after unboxing the stand accessories.",
      },
    })),
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
        review: null,
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

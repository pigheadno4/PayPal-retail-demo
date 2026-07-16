import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  AccountPendingOrderResumeRepository,
  AccountPendingOrderResumeResult,
  AccountAddress,
  AccountAddressInput,
  AccountAddressPatch,
  AccountAddressDeleteResult,
  AccountOrder,
  AccountRepository,
  AccountReviewInput,
  AccountSavedPaymentMethod,
  PreparedSavedPaymentDelete,
} from "../src/routes/account.js";
import type {
  PayPalPaymentTokenDeleteGateway,
  PayPalPaymentTokenDeleteGatewayInput,
} from "../src/paypal/client.js";
import { requestApp } from "./helpers/requestApp.js";

describe("Account routes", () => {
  it("looks up an existing account email for the email-first auth modal", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(app, "POST", "/api/account/auth/lookup", {
      json: {
        email: " Alice.LA@Example.Test ",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        email: "alice.la@example.test",
        status: "existing",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.lookupCalls).toEqual(["alice.la@example.test"]);
  });

  it("returns a new-account branch for unknown account email lookup", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(app, "POST", "/api/account/auth/lookup", {
      json: {
        email: "new.collector@example.test",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        email: "new.collector@example.test",
        status: "new",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.lookupCalls).toEqual([
      "new.collector@example.test",
    ]);
  });

  it("lists saved payments for the authenticated buyer", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "GET",
      "/api/account/saved-payments",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        saved_payments: [activeSavedPayment()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.listCalls).toEqual(["user_123"]);
  });

  it("lists account addresses for the authenticated buyer", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(app, "GET", "/api/account/addresses", {
      headers: {
        authorization: "Bearer buyer-token",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        addresses: [defaultAddress()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.listAddressCalls).toEqual(["user_123"]);
  });

  it("lists buyer-safe account orders for the authenticated buyer", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(app, "GET", "/api/account/orders", {
      headers: {
        authorization: "Bearer buyer-token",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        orders: [accountOrder()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.listOrderCalls).toEqual(["user_123"]);
    expect(JSON.stringify(response.json)).not.toContain("order_internal");
    expect(JSON.stringify(response.json)).not.toContain("payment_session");
  });

  it("returns buyer-safe account order detail for the authenticated buyer", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "GET",
      "/api/account/orders/PO-20260602-000118",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order: accountOrder(),
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.getOrderCalls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "PO-20260602-000118",
      },
    ]);
  });

  it("prepares an authenticated pending order for resume through Checkout", async () => {
    const resumeRepository = createPendingOrderResumeRepository({
      status: "ready",
      checkout: pendingResumeCheckoutResponse(),
    });
    const app = createAccountApp(
      createAccountRepository(),
      createPaymentTokenGateway(),
      resumeRepository,
    );

    const response = await requestApp(
      app,
      "POST",
      "/api/account/orders/DO-20260715-000001/resume",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json.data).toEqual(pendingResumeCheckoutResponse());
    expect(resumeRepository.calls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "DO-20260715-000001",
      },
    ]);
  });

  it("rejects guest, missing, and non-pending resume attempts", async () => {
    const guestRepository = createPendingOrderResumeRepository({
      status: "ready",
      checkout: pendingResumeCheckoutResponse(),
    });
    const guestApp = createAccountApp(
      createAccountRepository(),
      createPaymentTokenGateway(),
      guestRepository,
    );
    const guestResponse = await requestApp(
      guestApp,
      "POST",
      "/api/account/orders/DO-20260715-000001/resume",
    );
    expect(guestResponse.status).toBe(401);
    expect(guestRepository.calls).toEqual([]);

    const notFoundApp = createAccountApp(
      createAccountRepository(),
      createPaymentTokenGateway(),
      createPendingOrderResumeRepository({ status: "not_found" }),
    );
    const notFoundResponse = await requestApp(
      notFoundApp,
      "POST",
      "/api/account/orders/DO-20260715-000404/resume",
      { headers: { authorization: "Bearer buyer-token" } },
    );
    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.json.error.code).toBe("ACCOUNT_ORDER_NOT_FOUND");

    const notPendingApp = createAccountApp(
      createAccountRepository(),
      createPaymentTokenGateway(),
      createPendingOrderResumeRepository({ status: "not_pending" }),
    );
    const notPendingResponse = await requestApp(
      notPendingApp,
      "POST",
      "/api/account/orders/DO-20260715-000002/resume",
      { headers: { authorization: "Bearer buyer-token" } },
    );
    expect(notPendingResponse.status).toBe(409);
    expect(notPendingResponse.json.error.code).toBe("ORDER_NOT_RESUMABLE");
  });

  it("returns the canonical advanced lifecycle timeline without Diagnostics data", async () => {
    const baseOrder = accountOrder();
    const advancedOrder: AccountOrder = {
      ...baseOrder,
      status: "ready_for_pickup",
      review_eligible: false,
      timeline: [
        ...baseOrder.timeline.slice(0, 1),
        {
          label: "Ready for pickup",
          description: "Moved to ready for pickup by the merchant.",
          status: "current",
          occurred_at: "2026-07-13T02:00:00.000Z",
        },
      ],
    };
    const accountRepository = createAccountRepository({ order: advancedOrder });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "GET",
      "/api/account/orders/PO-20260602-000118",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json.data.order).toEqual(
      expect.objectContaining({
        status: "ready_for_pickup",
        timeline: expect.arrayContaining([
          expect.objectContaining({
            label: "Ready for pickup",
            status: "current",
          }),
        ]),
      }),
    );
    expect(JSON.stringify(response.json.data.order)).not.toMatch(
      /diagnostic|debug|webhook|payment_session/i,
    );
    expect(accountRepository.getOrderCalls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "PO-20260602-000118",
      },
    ]);
  });

  it("links matching guest orders to the authenticated buyer email", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/account/guest-orders/link",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        linked_order_count: 1,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.linkGuestOrderCalls).toEqual([
      {
        authUserId: "user_123",
        email: "buyer@example.test",
      },
    ]);
  });

  it("submits a review for a completed account order item", async () => {
    const accountRepository = createAccountRepository({
      refreshedReviewOrder: reviewedAccountOrder(),
    });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/account/orders/PO-20260602-000118/items/line_1/review",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
        json: {
          rating: 5,
          title: "Tiny display shelf star",
          body: "The paint details look great beside my other figures.",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order: reviewedAccountOrder(),
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.submitReviewCalls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "PO-20260602-000118",
        itemId: "line_1",
        review: {
          rating: 5,
          title: "Tiny display shelf star",
          body: "The paint details look great beside my other figures.",
        },
      },
    ]);
  });

  it("edits an existing review for a completed account order item", async () => {
    const accountRepository = createAccountRepository({
      refreshedReviewOrder: updatedReviewAccountOrder(),
    });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "PATCH",
      "/api/account/orders/PO-20260602-000118/items/line_1/review",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
        json: {
          rating: 4,
          title: "Still a favorite",
          body: "Updated after unboxing the stand accessories.",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order: updatedReviewAccountOrder(),
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.updateReviewCalls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "PO-20260602-000118",
        itemId: "line_1",
        review: {
          rating: 4,
          title: "Still a favorite",
          body: "Updated after unboxing the stand accessories.",
        },
      },
    ]);
  });

  it("deletes an existing review and reopens item eligibility", async () => {
    const accountRepository = createAccountRepository({
      refreshedReviewOrder: accountOrder(),
    });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "DELETE",
      "/api/account/orders/PO-20260602-000118/items/line_1/review",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order: accountOrder(),
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.deleteReviewCalls).toEqual([
      {
        authUserId: "user_123",
        orderNumber: "PO-20260602-000118",
        itemId: "line_1",
      },
    ]);
  });

  it("creates account addresses with normalized input", async () => {
    const accountRepository = createAccountRepository();
    const app = createAccountApp(accountRepository);

    const response = await requestApp(app, "POST", "/api/account/addresses", {
      headers: {
        authorization: "Bearer buyer-token",
      },
      json: {
        label: " Home ",
        recipient_name: " Buyer One ",
        phone: " 555-0101 ",
        address_line1: " 1 Market St ",
        address_line2: " Apt 4 ",
        city: " San Francisco ",
        state: " CA ",
        postal_code: " 94105 ",
        country_code: " us ",
        is_default_shipping: true,
        is_default_billing: true,
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        addresses: [createdAddress()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.createAddressCalls).toEqual([
      {
        authUserId: "user_123",
        address: {
          label: "Home",
          recipient_name: "Buyer One",
          phone: "555-0101",
          address_line1: "1 Market St",
          address_line2: "Apt 4",
          city: "San Francisco",
          state: "CA",
          postal_code: "94105",
          country_code: "US",
          is_default_shipping: true,
          is_default_billing: true,
        },
      },
    ]);
  });

  it("updates account addresses and can promote a new default", async () => {
    const accountRepository = createAccountRepository({
      refreshedAddresses: [promotedAddress(), nonDefaultAddress()],
    });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "PATCH",
      "/api/account/addresses/address_secondary",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
        json: {
          is_default_shipping: true,
          is_default_billing: true,
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        addresses: [promotedAddress(), nonDefaultAddress()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.updateAddressCalls).toEqual([
      {
        authUserId: "user_123",
        addressId: "address_secondary",
        patch: {
          is_default_shipping: true,
          is_default_billing: true,
        },
      },
    ]);
  });

  it("returns a buyer-safe conflict when deleting the only default address", async () => {
    const accountRepository = createAccountRepository({
      deleteAddressResult: {
        status: "blocked",
        reason:
          "Choose another default shipping and billing address before deleting this address.",
        addresses: [defaultAddress()],
      },
    });
    const app = createAccountApp(accountRepository);

    const response = await requestApp(
      app,
      "DELETE",
      "/api/account/addresses/address_default",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(409);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADDRESS_DELETE_BLOCKED",
        message:
          "Choose another default shipping and billing address before deleting this address.",
        details: {
          addresses: [defaultAddress()],
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.deleteAddressCalls).toEqual([
      {
        authUserId: "user_123",
        addressId: "address_default",
      },
    ]);
  });

  it("deletes a saved payment through PayPal before marking the local token deleted", async () => {
    const accountRepository = createAccountRepository({
      refreshedSavedPayments: [deletedSavedPayment()],
    });
    const paymentTokenGateway = createPaymentTokenGateway();
    const app = createAccountApp(accountRepository, paymentTokenGateway);

    const response = await requestApp(
      app,
      "DELETE",
      "/api/account/saved-payments/saved_payment_123",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        saved_payments: [deletedSavedPayment()],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(accountRepository.prepareDeleteCalls).toEqual([
      {
        authUserId: "user_123",
        savedPaymentId: "saved_payment_123",
      },
    ]);
    expect(paymentTokenGateway.deleteCalls).toEqual([
      {
        vaultId: "vault_card_123",
      },
    ]);
    expect(accountRepository.completeDeleteCalls).toEqual([
      {
        authUserId: "user_123",
        savedPaymentId: "saved_payment_123",
      },
    ]);
  });

  it("rejects guest saved payment access", async () => {
    const app = createAccountApp(createAccountRepository());

    const response = await requestApp(
      app,
      "GET",
      "/api/account/saved-payments",
    );

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "A valid buyer session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

interface FakeAccountRepository extends AccountRepository {
  readonly lookupCalls: string[];
  readonly listCalls: string[];
  readonly listAddressCalls: string[];
  readonly listOrderCalls: string[];
  readonly getOrderCalls: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }[];
  readonly linkGuestOrderCalls: {
    readonly authUserId: string;
    readonly email: string;
  }[];
  readonly createAddressCalls: {
    readonly authUserId: string;
    readonly address: AccountAddressInput;
  }[];
  readonly updateAddressCalls: {
    readonly authUserId: string;
    readonly addressId: string;
    readonly patch: AccountAddressPatch;
  }[];
  readonly deleteAddressCalls: {
    readonly authUserId: string;
    readonly addressId: string;
  }[];
  readonly prepareDeleteCalls: {
    readonly authUserId: string;
    readonly savedPaymentId: string;
  }[];
  readonly completeDeleteCalls: {
    readonly authUserId: string;
    readonly savedPaymentId: string;
  }[];
  readonly submitReviewCalls: {
    readonly authUserId: string;
    readonly orderNumber: string;
    readonly itemId: string;
    readonly review: AccountReviewInput;
  }[];
  readonly updateReviewCalls: {
    readonly authUserId: string;
    readonly orderNumber: string;
    readonly itemId: string;
    readonly review: AccountReviewInput;
  }[];
  readonly deleteReviewCalls: {
    readonly authUserId: string;
    readonly orderNumber: string;
    readonly itemId: string;
  }[];
}

function createAccountRepository(
  options: {
    readonly deleteAddressResult?: AccountAddressDeleteResult;
    readonly order?: AccountOrder;
    readonly refreshedAddresses?: readonly AccountAddress[];
    readonly refreshedReviewOrder?: AccountOrder;
    readonly refreshedSavedPayments?: readonly AccountSavedPaymentMethod[];
  } = {},
): FakeAccountRepository {
  const lookupCalls: string[] = [];
  const listCalls: string[] = [];
  const listAddressCalls: string[] = [];
  const listOrderCalls: string[] = [];
  const getOrderCalls: FakeAccountRepository["getOrderCalls"] = [];
  const linkGuestOrderCalls: FakeAccountRepository["linkGuestOrderCalls"] = [];
  const createAddressCalls: FakeAccountRepository["createAddressCalls"] = [];
  const updateAddressCalls: FakeAccountRepository["updateAddressCalls"] = [];
  const deleteAddressCalls: FakeAccountRepository["deleteAddressCalls"] = [];
  const prepareDeleteCalls: FakeAccountRepository["prepareDeleteCalls"] = [];
  const completeDeleteCalls: FakeAccountRepository["completeDeleteCalls"] = [];
  const submitReviewCalls: FakeAccountRepository["submitReviewCalls"] = [];
  const updateReviewCalls: FakeAccountRepository["updateReviewCalls"] = [];
  const deleteReviewCalls: FakeAccountRepository["deleteReviewCalls"] = [];

  return {
    lookupCalls,
    listCalls,
    listAddressCalls,
    listOrderCalls,
    getOrderCalls,
    linkGuestOrderCalls,
    createAddressCalls,
    updateAddressCalls,
    deleteAddressCalls,
    prepareDeleteCalls,
    completeDeleteCalls,
    submitReviewCalls,
    updateReviewCalls,
    deleteReviewCalls,
    async lookupAuthEmail(email) {
      lookupCalls.push(email);
      return email === "alice.la@example.test"
        ? {
            email: "alice.la@example.test",
            status: "existing",
          }
        : {
            email,
            status: "new",
          };
    },
    async listSavedPayments(authUserId) {
      listCalls.push(authUserId);
      return [activeSavedPayment()];
    },
    async listAddresses(authUserId) {
      listAddressCalls.push(authUserId);
      return [defaultAddress()];
    },
    async listOrders(authUserId) {
      listOrderCalls.push(authUserId);
      return [options.order ?? accountOrder()];
    },
    async getOrder(input) {
      getOrderCalls.push(input);
      return input.orderNumber === "PO-20260602-000118"
        ? (options.order ?? accountOrder())
        : null;
    },
    async linkGuestOrders(input) {
      linkGuestOrderCalls.push(input);
      return {
        linked_order_count: 1,
      };
    },
    async createAddress(input) {
      createAddressCalls.push(input);
      return options.refreshedAddresses ?? [createdAddress()];
    },
    async updateAddress(input) {
      updateAddressCalls.push(input);
      return options.refreshedAddresses ?? [updatedAddress()];
    },
    async deleteAddress(input) {
      deleteAddressCalls.push(input);
      return (
        options.deleteAddressResult ?? {
          status: "deleted",
          addresses: [nonDefaultAddress()],
        }
      );
    },
    async prepareSavedPaymentDelete(
      input,
    ): Promise<PreparedSavedPaymentDelete | null> {
      prepareDeleteCalls.push(input);
      return input.savedPaymentId === "saved_payment_123"
        ? {
            savedPaymentId: "saved_payment_123",
            vaultId: "vault_card_123",
          }
        : null;
    },
    async completeSavedPaymentDelete(input) {
      completeDeleteCalls.push(input);
      return options.refreshedSavedPayments ?? [deletedSavedPayment()];
    },
    async submitOrderItemReview(input) {
      submitReviewCalls.push(input);
      return {
        status: "updated",
        order: options.refreshedReviewOrder ?? reviewedAccountOrder(),
      };
    },
    async updateOrderItemReview(input) {
      updateReviewCalls.push(input);
      return {
        status: "updated",
        order: options.refreshedReviewOrder ?? updatedReviewAccountOrder(),
      };
    },
    async deleteOrderItemReview(input) {
      deleteReviewCalls.push(input);
      return {
        status: "updated",
        order: options.refreshedReviewOrder ?? accountOrder(),
      };
    },
  };
}

interface FakePaymentTokenGateway extends PayPalPaymentTokenDeleteGateway {
  readonly deleteCalls: PayPalPaymentTokenDeleteGatewayInput[];
}

function createPaymentTokenGateway(): FakePaymentTokenGateway {
  const deleteCalls: PayPalPaymentTokenDeleteGatewayInput[] = [];
  return {
    deleteCalls,
    async deletePaymentToken(input) {
      deleteCalls.push(input);
    },
  };
}

function createAccountApp(
  accountRepository: FakeAccountRepository,
  paymentTokenGateway: FakePaymentTokenGateway = createPaymentTokenGateway(),
  pendingOrderResumeRepository: FakePendingOrderResumeRepository = createPendingOrderResumeRepository(
    { status: "not_found" },
  ),
) {
  return createApp({
    account: {
      accountRepository,
      paymentTokenGateway,
      pendingOrderResumeRepository,
      authVerifier: createAuthVerifier(),
    },
  });
}

interface FakePendingOrderResumeRepository extends AccountPendingOrderResumeRepository {
  readonly calls: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }[];
}

function createPendingOrderResumeRepository(
  result: AccountPendingOrderResumeResult,
): FakePendingOrderResumeRepository {
  const calls: FakePendingOrderResumeRepository["calls"] = [];
  return {
    calls,
    async resumePendingOrder(input) {
      calls.push(input);
      return result;
    },
  };
}

function pendingResumeCheckoutResponse() {
  return {
    draft: {
      id: "checkout_draft_pending",
      cart_id: "cart_original",
      fulfillment_mode: "delivery",
      status: "payment_started",
      active_step: "payment_method",
      summary: {
        item_count: 2,
        merchandise_subtotal_minor: 3198,
        discount_minor: 500,
        tax_minor: 236,
        shipping_minor: 500,
        total_minor: 3434,
        currency_code: "USD",
      },
    },
  };
}

function activeSavedPayment(): AccountSavedPaymentMethod {
  return {
    id: "saved_payment_123",
    method_type: "card",
    status: "active",
    brand: "VISA",
    last4: "1111",
    expiry_month: 2,
    expiry_year: 2027,
    label: "Visa ending in 1111",
  };
}

function deletedSavedPayment(): AccountSavedPaymentMethod {
  return {
    ...activeSavedPayment(),
    status: "deleted",
  };
}

function defaultAddress(): AccountAddress {
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

function createdAddress(): AccountAddress {
  return {
    id: "address_created",
    label: "Home",
    recipient_name: "Buyer One",
    phone: "555-0101",
    address_line1: "1 Market St",
    address_line2: "Apt 4",
    city: "San Francisco",
    state: "CA",
    postal_code: "94105",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function updatedAddress(): AccountAddress {
  return {
    ...defaultAddress(),
    label: "Updated home",
  };
}

function nonDefaultAddress(): AccountAddress {
  return {
    ...defaultAddress(),
    id: "address_secondary",
    label: "Studio",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function promotedAddress(): AccountAddress {
  return {
    ...nonDefaultAddress(),
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function accountOrder(): AccountOrder {
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
        id: "order_item_skullpanda",
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
        label: "Order placed",
        description: "Pickup order was created and paid.",
        status: "complete",
        occurred_at: "2026-06-02T18:30:00.000Z",
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

function reviewedAccountOrder(): AccountOrder {
  const order = accountOrder();
  return {
    ...order,
    items: order.items.map((item) =>
      item.id === "order_item_skullpanda"
        ? {
            ...item,
            review_eligible: false,
            review_submitted: true,
            review: {
              rating: 5,
              title: "Tiny display shelf star",
              body: "The paint details look great beside my other figures.",
            },
          }
        : item,
    ),
  };
}

function updatedReviewAccountOrder(): AccountOrder {
  const order = accountOrder();
  return {
    ...order,
    items: order.items.map((item) =>
      item.id === "order_item_skullpanda"
        ? {
            ...item,
            review_eligible: false,
            review_submitted: true,
            review: {
              rating: 4,
              title: "Still a favorite",
              body: "Updated after unboxing the stand accessories.",
            },
          }
        : item,
    ),
  };
}

function createAuthVerifier(): SupabaseAuthVerifier {
  return {
    auth: {
      async getUser(token) {
        if (token !== "buyer-token") {
          return {
            data: { user: null },
            error: { message: "invalid token" },
          };
        }

        return {
          data: {
            user: {
              id: "user_123",
              email: "buyer@example.test",
            },
          },
          error: null,
        };
      },
    },
  };
}

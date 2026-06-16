import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  AccountAddress,
  AccountAddressInput,
  AccountAddressPatch,
  AccountAddressDeleteResult,
  AccountOrder,
  AccountRepository,
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
}

function createAccountRepository(
  options: {
    readonly deleteAddressResult?: AccountAddressDeleteResult;
    readonly refreshedAddresses?: readonly AccountAddress[];
    readonly refreshedSavedPayments?: readonly AccountSavedPaymentMethod[];
  } = {},
): FakeAccountRepository {
  const lookupCalls: string[] = [];
  const listCalls: string[] = [];
  const listAddressCalls: string[] = [];
  const listOrderCalls: string[] = [];
  const getOrderCalls: FakeAccountRepository["getOrderCalls"] = [];
  const createAddressCalls: FakeAccountRepository["createAddressCalls"] = [];
  const updateAddressCalls: FakeAccountRepository["updateAddressCalls"] = [];
  const deleteAddressCalls: FakeAccountRepository["deleteAddressCalls"] = [];
  const prepareDeleteCalls: FakeAccountRepository["prepareDeleteCalls"] = [];
  const completeDeleteCalls: FakeAccountRepository["completeDeleteCalls"] = [];

  return {
    lookupCalls,
    listCalls,
    listAddressCalls,
    listOrderCalls,
    getOrderCalls,
    createAddressCalls,
    updateAddressCalls,
    deleteAddressCalls,
    prepareDeleteCalls,
    completeDeleteCalls,
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
      return [accountOrder()];
    },
    async getOrder(input) {
      getOrderCalls.push(input);
      return input.orderNumber === "PO-20260602-000118" ? accountOrder() : null;
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
) {
  return createApp({
    account: {
      accountRepository,
      paymentTokenGateway,
      authVerifier: createAuthVerifier(),
    },
  });
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

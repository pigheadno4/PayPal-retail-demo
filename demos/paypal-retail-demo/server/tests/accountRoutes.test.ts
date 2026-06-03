import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
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
  readonly listCalls: string[];
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
    readonly refreshedSavedPayments?: readonly AccountSavedPaymentMethod[];
  } = {},
): FakeAccountRepository {
  const listCalls: string[] = [];
  const prepareDeleteCalls: FakeAccountRepository["prepareDeleteCalls"] = [];
  const completeDeleteCalls: FakeAccountRepository["completeDeleteCalls"] = [];

  return {
    listCalls,
    prepareDeleteCalls,
    completeDeleteCalls,
    async listSavedPayments(authUserId) {
      listCalls.push(authUserId);
      return [activeSavedPayment()];
    },
    async prepareSavedPaymentDelete(input): Promise<PreparedSavedPaymentDelete | null> {
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

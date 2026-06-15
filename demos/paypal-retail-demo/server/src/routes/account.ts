import { Router, type Request, type RequestHandler } from "express";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { BuyerRequest } from "../middleware/auth.js";
import type { PayPalPaymentTokenDeleteGateway } from "../paypal/client.js";

export interface AccountSavedPaymentMethod {
  readonly id: string;
  readonly method_type: "paypal_wallet" | "card";
  readonly status: "active" | "pending" | "disabled" | "deleted";
  readonly brand: string | null;
  readonly last4: string | null;
  readonly expiry_month: number | null;
  readonly expiry_year: number | null;
  readonly label: string | null;
}

export type AccountAuthEmailLookupStatus = "existing" | "new";

export interface AccountAuthEmailLookupResult {
  readonly email: string;
  readonly status: AccountAuthEmailLookupStatus;
}

export interface PreparedSavedPaymentDelete {
  readonly savedPaymentId: string;
  readonly vaultId: string | null;
}

export interface AccountRepository {
  readonly lookupAuthEmail: (
    email: string,
  ) => Promise<AccountAuthEmailLookupResult>;
  readonly listSavedPayments: (
    authUserId: string,
  ) => Promise<readonly AccountSavedPaymentMethod[]>;
  readonly prepareSavedPaymentDelete: (input: {
    readonly authUserId: string;
    readonly savedPaymentId: string;
  }) => Promise<PreparedSavedPaymentDelete | null>;
  readonly completeSavedPaymentDelete: (input: {
    readonly authUserId: string;
    readonly savedPaymentId: string;
  }) => Promise<readonly AccountSavedPaymentMethod[]>;
}

export interface CreateAccountRouterInput {
  readonly accountRepository: AccountRepository;
  readonly paymentTokenGateway: PayPalPaymentTokenDeleteGateway;
}

export function createAccountRouter(input: CreateAccountRouterInput): Router {
  const router = Router();

  router.post(
    "/account/auth/lookup",
    asyncRoute(async (request, response) => {
      const email = normalizeAuthEmail(
        typeof request.body?.email === "string" ? request.body.email : "",
      );

      if (!email) {
        sendApiError(response, 400, {
          code: "INVALID_AUTH_LOOKUP_REQUEST",
          message: "A valid email is required.",
        });
        return;
      }

      const lookupResult = await input.accountRepository.lookupAuthEmail(email);
      sendApiSuccess(response, lookupResult);
    }),
  );

  router.get(
    "/account/saved-payments",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const savedPayments =
        await input.accountRepository.listSavedPayments(authUserId);
      sendApiSuccess(response, {
        saved_payments: savedPayments,
      });
    }),
  );

  router.delete(
    "/account/saved-payments/:savedPaymentId",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const savedPaymentId = firstRouteParamValue(request, "savedPaymentId");
      if (!savedPaymentId) {
        sendApiError(response, 400, {
          code: "INVALID_SAVED_PAYMENT_REQUEST",
          message: "A saved payment ID is required.",
        });
        return;
      }

      const preparedDelete =
        await input.accountRepository.prepareSavedPaymentDelete({
          authUserId,
          savedPaymentId,
        });
      if (!preparedDelete) {
        sendApiError(response, 404, {
          code: "SAVED_PAYMENT_NOT_FOUND",
          message: "No saved payment matched the current buyer.",
        });
        return;
      }

      if (preparedDelete.vaultId) {
        await input.paymentTokenGateway.deletePaymentToken({
          vaultId: preparedDelete.vaultId,
        });
      }

      const savedPayments =
        await input.accountRepository.completeSavedPaymentDelete({
          authUserId,
          savedPaymentId,
        });
      sendApiSuccess(response, {
        saved_payments: savedPayments,
      });
    }),
  );

  return router;
}

function requireAuthenticatedBuyerId(
  request: Request,
  response: Parameters<typeof sendApiError>[0],
): string | null {
  const buyer = (request as BuyerRequest).buyer;
  if (!buyer || buyer.kind !== "authenticated") {
    sendApiError(response, 401, {
      code: "UNAUTHENTICATED",
      message: "A valid buyer session is required.",
    });
    return null;
  }

  return buyer.userId;
}

function firstRouteParamValue(request: Request, key: string): string | null {
  const value = request.params[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeAuthEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  const atIndex = email.indexOf("@");
  const dotIndex = email.lastIndexOf(".");

  if (
    atIndex <= 0 ||
    atIndex !== email.lastIndexOf("@") ||
    dotIndex <= atIndex + 1 ||
    dotIndex >= email.length - 1
  ) {
    return null;
  }

  return email;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

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

export interface AccountAddress {
  readonly id: string;
  readonly label: string | null;
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly is_default_shipping: boolean;
  readonly is_default_billing: boolean;
}

export type AccountAddressInput = Omit<AccountAddress, "id">;

export type AccountAddressPatch = Partial<AccountAddressInput>;

export type AccountOrderFulfillmentMode = "delivery" | "pickup";
export type AccountOrderStatus =
  | "cancelled"
  | "delivered"
  | "paid"
  | "pending"
  | "picked_up"
  | "preparing_pickup"
  | "processing"
  | "ready_for_pickup"
  | "shipped";
export type AccountOrderPaymentStatus =
  | "approved"
  | "cancelled"
  | "captured"
  | "failed"
  | "not_started"
  | "started";

export interface AccountOrderTotals {
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
}

export interface AccountOrderItem {
  readonly id: string;
  readonly product_name: string;
  readonly product_url: string | null;
  readonly product_image_url: string | null;
  readonly unit_price_minor: number;
  readonly quantity: number;
  readonly line_total_minor: number;
  readonly review_eligible: boolean;
  readonly review_submitted: boolean;
}

export interface AccountOrderTimelineEvent {
  readonly label: string;
  readonly description: string;
  readonly status: "complete" | "current" | "pending";
  readonly occurred_at: string | null;
}

export interface AccountOrderAddress {
  readonly address_type: "billing" | "pickup_store" | "shipping";
  readonly recipient_name: string;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
}

export interface AccountOrder {
  readonly order_number: string;
  readonly placed_at: string;
  readonly fulfillment_mode: AccountOrderFulfillmentMode;
  readonly status: AccountOrderStatus;
  readonly payment_status: AccountOrderPaymentStatus;
  readonly currency_code: string;
  readonly review_eligible: boolean;
  readonly fulfillment_label: string;
  readonly totals: AccountOrderTotals;
  readonly items: readonly AccountOrderItem[];
  readonly timeline: readonly AccountOrderTimelineEvent[];
  readonly addresses: readonly AccountOrderAddress[];
}

export type AccountAddressDeleteResult =
  | {
      readonly status: "deleted";
      readonly addresses: readonly AccountAddress[];
    }
  | {
      readonly status: "blocked";
      readonly reason: string;
      readonly addresses: readonly AccountAddress[];
    };

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
  readonly listAddresses: (
    authUserId: string,
  ) => Promise<readonly AccountAddress[]>;
  readonly listOrders: (authUserId: string) => Promise<readonly AccountOrder[]>;
  readonly getOrder: (input: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }) => Promise<AccountOrder | null>;
  readonly createAddress: (input: {
    readonly authUserId: string;
    readonly address: AccountAddressInput;
  }) => Promise<readonly AccountAddress[]>;
  readonly updateAddress: (input: {
    readonly authUserId: string;
    readonly addressId: string;
    readonly patch: AccountAddressPatch;
  }) => Promise<readonly AccountAddress[]>;
  readonly deleteAddress: (input: {
    readonly authUserId: string;
    readonly addressId: string;
  }) => Promise<AccountAddressDeleteResult>;
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
    "/account/addresses",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const addresses = await input.accountRepository.listAddresses(authUserId);
      sendApiSuccess(response, {
        addresses,
      });
    }),
  );

  router.post(
    "/account/addresses",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const address = parseAddressInputBody(request.body);
      if (!address) {
        sendApiError(response, 400, {
          code: "INVALID_ADDRESS_REQUEST",
          message: "A complete address is required.",
        });
        return;
      }

      const addresses = await input.accountRepository.createAddress({
        authUserId,
        address,
      });
      sendApiSuccess(response, {
        addresses,
      });
    }),
  );

  router.patch(
    "/account/addresses/:addressId",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const addressId = firstRouteParamValue(request, "addressId");
      const patch = parseAddressPatchBody(request.body);
      if (!addressId || !patch) {
        sendApiError(response, 400, {
          code: "INVALID_ADDRESS_REQUEST",
          message: "A valid address update is required.",
        });
        return;
      }

      const addresses = await input.accountRepository.updateAddress({
        authUserId,
        addressId,
        patch,
      });
      sendApiSuccess(response, {
        addresses,
      });
    }),
  );

  router.delete(
    "/account/addresses/:addressId",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const addressId = firstRouteParamValue(request, "addressId");
      if (!addressId) {
        sendApiError(response, 400, {
          code: "INVALID_ADDRESS_REQUEST",
          message: "An address ID is required.",
        });
        return;
      }

      const result = await input.accountRepository.deleteAddress({
        authUserId,
        addressId,
      });
      if (result.status === "blocked") {
        sendApiError(response, 409, {
          code: "ADDRESS_DELETE_BLOCKED",
          message: result.reason,
          details: {
            addresses: result.addresses,
          },
        });
        return;
      }

      sendApiSuccess(response, {
        addresses: result.addresses,
      });
    }),
  );

  router.get(
    "/account/orders",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const orders = await input.accountRepository.listOrders(authUserId);
      sendApiSuccess(response, {
        orders,
      });
    }),
  );

  router.get(
    "/account/orders/:orderNumber",
    asyncRoute(async (request, response) => {
      const authUserId = requireAuthenticatedBuyerId(request, response);
      if (!authUserId) {
        return;
      }

      const orderNumber = firstRouteParamValue(request, "orderNumber");
      if (!orderNumber) {
        sendApiError(response, 400, {
          code: "INVALID_ACCOUNT_ORDER_REQUEST",
          message: "An order number is required.",
        });
        return;
      }

      const order = await input.accountRepository.getOrder({
        authUserId,
        orderNumber,
      });
      if (!order) {
        sendApiError(response, 404, {
          code: "ACCOUNT_ORDER_NOT_FOUND",
          message: "No order matched the current buyer.",
        });
        return;
      }

      sendApiSuccess(response, {
        order,
      });
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

function parseAddressInputBody(body: unknown): AccountAddressInput | null {
  const bodyRecord = getBodyRecord(body);
  if (!bodyRecord) {
    return null;
  }

  const recipientName = normalizeBodyString(bodyRecord.recipient_name);
  const addressLine1 = normalizeBodyString(bodyRecord.address_line1);
  const city = normalizeBodyString(bodyRecord.city);
  const postalCode = normalizeBodyString(bodyRecord.postal_code);
  const countryCode = normalizeCountryCode(bodyRecord.country_code);

  if (!recipientName || !addressLine1 || !city || !postalCode || !countryCode) {
    return null;
  }

  return {
    label: normalizeOptionalBodyString(bodyRecord.label),
    recipient_name: recipientName,
    phone: normalizeOptionalBodyString(bodyRecord.phone),
    address_line1: addressLine1,
    address_line2: normalizeOptionalBodyString(bodyRecord.address_line2),
    city,
    state: normalizeOptionalBodyString(bodyRecord.state),
    postal_code: postalCode,
    country_code: countryCode,
    is_default_shipping: bodyRecord.is_default_shipping === true,
    is_default_billing: bodyRecord.is_default_billing === true,
  };
}

function parseAddressPatchBody(body: unknown): AccountAddressPatch | null {
  const bodyRecord = getBodyRecord(body);
  if (!bodyRecord) {
    return null;
  }

  const patch: Record<string, unknown> = {};
  const optionalStringKeys = [
    "label",
    "phone",
    "address_line2",
    "state",
  ] as const;
  const requiredStringKeys = [
    "recipient_name",
    "address_line1",
    "city",
    "postal_code",
  ] as const;

  for (const key of optionalStringKeys) {
    if (Object.hasOwn(bodyRecord, key)) {
      patch[key] = normalizeOptionalBodyString(bodyRecord[key]);
    }
  }

  for (const key of requiredStringKeys) {
    if (Object.hasOwn(bodyRecord, key)) {
      const value = normalizeBodyString(bodyRecord[key]);
      if (!value) {
        return null;
      }
      patch[key] = value;
    }
  }

  if (Object.hasOwn(bodyRecord, "country_code")) {
    const countryCode = normalizeCountryCode(bodyRecord.country_code);
    if (!countryCode) {
      return null;
    }
    patch.country_code = countryCode;
  }

  if (typeof bodyRecord.is_default_shipping === "boolean") {
    patch.is_default_shipping = bodyRecord.is_default_shipping;
  }

  if (typeof bodyRecord.is_default_billing === "boolean") {
    patch.is_default_billing = bodyRecord.is_default_billing;
  }

  return Object.keys(patch).length ? (patch as AccountAddressPatch) : null;
}

function getBodyRecord(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object"
    ? (body as Record<string, unknown>)
    : null;
}

function normalizeBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeCountryCode(value: unknown): string | null {
  const countryCode = normalizeBodyString(value)?.toUpperCase() ?? null;
  return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

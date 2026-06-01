import { Router, type Request, type RequestHandler } from "express";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { CatalogJson } from "./catalog.js";

export type OrderApiResponse = CatalogJson;

export interface GuestOrderLookupInput {
  readonly orderNumber: string;
  readonly email: string;
}

export interface OrderRepository {
  readonly lookupGuestOrder: (
    input: GuestOrderLookupInput,
  ) => Promise<OrderApiResponse | null>;
}

export interface CreateOrderRouterInput {
  readonly orderRepository: OrderRepository;
}

export function createOrderRouter(input: CreateOrderRouterInput): Router {
  const router = Router();

  router.get(
    "/guest-orders/:orderNumber",
    asyncRoute(async (request, response) => {
      const orderNumber = normalizeOrderNumber(
        firstRouteParamValue(request, "orderNumber"),
      );
      const email = normalizeEmail(firstQueryValue(request, "email"));

      if (!orderNumber || !email) {
        sendApiError(response, 400, {
          code: "INVALID_GUEST_ORDER_LOOKUP_REQUEST",
          message: "A valid order number and email are required.",
        });
        return;
      }

      const order = await input.orderRepository.lookupGuestOrder({
        orderNumber,
        email,
      });

      if (!order) {
        sendApiError(response, 404, {
          code: "GUEST_ORDER_NOT_FOUND",
          message:
            "No guest order matched the provided order number and email.",
        });
        return;
      }

      sendApiSuccess(response, order);
    }),
  );

  return router;
}

function normalizeOrderNumber(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const orderNumber = value.trim().toUpperCase();
  return /^(DO|PO)-\d{8}-\d{6}$/.test(orderNumber) ? orderNumber : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function firstQueryValue(request: Request, key: string): string | null {
  const value = request.query[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
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

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

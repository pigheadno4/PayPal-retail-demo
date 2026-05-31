import type { Request, RequestHandler, Response } from "express";

import { sendApiError } from "../http/responses.js";

export interface GuestCartContext {
  readonly cartPublicId: string;
  readonly cartClientSecret: string;
}

export type GuestCartRequest = Request & {
  guestCart?: GuestCartContext | null;
};

export const guestCartMiddleware: RequestHandler = (
  request,
  response,
  next,
) => {
  const guestCartRequest = request as GuestCartRequest;
  const cartPublicId = normalizeHeaderValue(request, "x-cart-id");
  const cartClientSecret = normalizeHeaderValue(request, "x-cart-secret");

  if (!cartPublicId && !cartClientSecret) {
    guestCartRequest.guestCart = null;
    next();
    return;
  }

  if (!cartPublicId || !cartClientSecret) {
    sendIncompleteGuestCartHeaders(response);
    return;
  }

  guestCartRequest.guestCart = {
    cartPublicId,
    cartClientSecret,
  };
  next();
};

function normalizeHeaderValue(
  request: Request,
  headerName: string,
): string | null {
  const rawValue = request.headers[headerName];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function sendIncompleteGuestCartHeaders(response: Response): void {
  sendApiError(response, 400, {
    code: "GUEST_CART_HEADERS_INCOMPLETE",
    message: "Guest cart ID and secret must be sent together.",
  });
}

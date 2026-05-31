import { Router, type Request, type RequestHandler } from "express";

import type { CartRefreshTrigger } from "../../../shared/src/cart.js";
import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { BuyerContext, BuyerRequest } from "../middleware/auth.js";
import type {
  GuestCartContext,
  GuestCartRequest,
} from "../middleware/guestCart.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { CatalogJson, StorefrontContext } from "./catalog.js";

export type CartApiResponse = CatalogJson;

export interface CartOperationContext {
  readonly storefrontContext: StorefrontContext;
  readonly buyer: BuyerContext;
  readonly guestCart: GuestCartContext | null;
}

export interface AddCartItemInput {
  readonly productId: string;
  readonly quantity: number;
}

export interface UpdateCartItemInput {
  readonly itemId: string;
  readonly quantity: number;
}

export interface RemoveCartItemInput {
  readonly itemId: string;
}

export interface RefreshCartInput {
  readonly trigger: CartRefreshTrigger;
}

export interface CartRepository {
  readonly getActiveCart: (
    context: CartOperationContext,
  ) => Promise<CartApiResponse>;
  readonly addItem: (
    context: CartOperationContext,
    input: AddCartItemInput,
  ) => Promise<CartApiResponse>;
  readonly updateItem: (
    context: CartOperationContext,
    input: UpdateCartItemInput,
  ) => Promise<CartApiResponse>;
  readonly removeItem: (
    context: CartOperationContext,
    input: RemoveCartItemInput,
  ) => Promise<CartApiResponse>;
  readonly merge: (context: CartOperationContext) => Promise<CartApiResponse>;
  readonly refresh: (
    context: CartOperationContext,
    input: RefreshCartInput,
  ) => Promise<CartApiResponse>;
}

export interface CreateCartRouterInput {
  readonly cartRepository: CartRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
}

const supportedRefreshTriggers: readonly CartRefreshTrigger[] = [
  "minicart_open",
  "cart_open",
  "checkout_start",
  "express_payment_start",
  "login_register",
  "pending_resume",
];

export function createCartRouter(input: CreateCartRouterInput): Router {
  const router = Router();

  router.get(
    "/cart",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.cartRepository.getActiveCart(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
        ),
      );
    }),
  );

  router.post(
    "/cart/items",
    asyncRoute(async (request, response) => {
      const body = parseCartItemBody(request);

      if (!body) {
        sendApiError(response, 400, {
          code: "INVALID_CART_ITEM_REQUEST",
          message: "A valid product_id and positive quantity are required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.cartRepository.addItem(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          body,
        ),
      );
    }),
  );

  router.patch(
    "/cart/items/:id",
    asyncRoute(async (request, response) => {
      const quantity = parsePositiveInteger(
        (request.body as { quantity?: unknown }).quantity,
      );
      const itemId = firstRouteParamValue(request, "id");

      if (!itemId || quantity === null) {
        sendApiError(response, 400, {
          code: "INVALID_CART_ITEM_REQUEST",
          message: "A valid cart item ID and positive quantity are required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.cartRepository.updateItem(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          {
            itemId,
            quantity,
          },
        ),
      );
    }),
  );

  router.delete(
    "/cart/items/:id",
    asyncRoute(async (request, response) => {
      const itemId = firstRouteParamValue(request, "id");

      if (!itemId) {
        sendApiError(response, 400, {
          code: "INVALID_CART_ITEM_REQUEST",
          message: "A valid cart item ID is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.cartRepository.removeItem(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { itemId },
        ),
      );
    }),
  );

  router.post(
    "/cart/merge",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.cartRepository.merge(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
        ),
      );
    }),
  );

  router.post(
    "/cart/refresh",
    asyncRoute(async (request, response) => {
      const trigger = parseRefreshTrigger(
        (request.body as { trigger?: unknown }).trigger,
      );

      if (!trigger) {
        sendApiError(response, 400, {
          code: "INVALID_CART_REFRESH_REQUEST",
          message: "A supported cart refresh trigger is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.cartRepository.refresh(
          resolveCartOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { trigger },
        ),
      );
    }),
  );

  return router;
}

function resolveCartOperationContext(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): CartOperationContext {
  return {
    storefrontContext: resolveStorefrontContext(
      request,
      activeStorefrontContextStore,
    ),
    buyer: (request as BuyerRequest).buyer ?? { kind: "guest" },
    guestCart: (request as GuestCartRequest).guestCart ?? null,
  };
}

function resolveStorefrontContext(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): StorefrontContext {
  const activeContext = activeStorefrontContextStore?.get() ?? {
    profileSlug: "popmart",
    marketCode: "US",
  };

  return {
    profileSlug:
      firstQueryValue(request, "profile") ?? activeContext.profileSlug,
    marketCode: (
      firstQueryValue(request, "market") ?? activeContext.marketCode
    ).toUpperCase(),
  };
}

function parseCartItemBody(request: Request): AddCartItemInput | null {
  const body = request.body as Record<string, unknown> | undefined;
  const productId = normalizeBodyString(body?.product_id);
  const quantity = parsePositiveInteger(body?.quantity);

  return productId && quantity !== null ? { productId, quantity } : null;
}

function parseRefreshTrigger(value: unknown): CartRefreshTrigger | null {
  return typeof value === "string" &&
    supportedRefreshTriggers.includes(value as CartRefreshTrigger)
    ? (value as CartRefreshTrigger)
    : null;
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    return null;
  }
  return value;
}

function normalizeBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

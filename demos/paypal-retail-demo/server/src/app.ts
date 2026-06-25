import express from "express";

import {
  createDebugId,
  getResponseDebugId,
  sendApiError,
  sendApiSuccess,
} from "./http/responses.js";
import type { DebugLogger } from "./debug/logger.js";
import {
  createBuyerAuthMiddleware,
  type SupabaseAuthVerifier,
} from "./middleware/auth.js";
import { createAdminSessionGuard } from "./middleware/admin.js";
import { guestCartMiddleware } from "./middleware/guestCart.js";
import {
  createAccountRouter,
  type AccountRepository,
} from "./routes/account.js";
import type {
  AdminInventoryRepository,
  AdminOrderRepository,
  AdminPaymentDebugRepository,
  AdminProfileMarketRepository,
  AdminRuntimeDebugLogRepository,
  AdminWebhookRepository,
} from "./repositories/adminRepository.js";
import { createAdminRouter } from "./routes/admin.js";
import { createCartRouter, type CartRepository } from "./routes/cart.js";
import {
  createCheckoutRouter,
  type CheckoutRepository,
} from "./routes/checkout.js";
import {
  createCatalogRouter,
  type CatalogRepository,
} from "./routes/catalog.js";
import { createOrderRouter, type OrderRepository } from "./routes/orders.js";
import {
  createPayPalRouter,
  type PayPalOrderPreparationRepository,
  type PayPalWebhookProcessingRepository,
} from "./routes/paypal.js";
import type {
  PayPalCaptureOrderGateway,
  PayPalClientTokenGateway,
  PayPalCreateOrderGateway,
  PayPalPaymentTokenDeleteGateway,
  PayPalWebhookVerificationGateway,
} from "./paypal/client.js";
import type { PayPalEnvironment } from "../../shared/src/market.js";
import type { ActiveStorefrontContextStore } from "./state/storefrontContext.js";

export interface CreateAppInput {
  readonly allowedCorsOrigins?: readonly string[];
  readonly debugLogger?: DebugLogger;
  readonly staticAssetDirectory?: string;
  readonly catalogRepository?: CatalogRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  readonly admin?: {
    readonly adminPasscode: string;
    readonly profileMarketRepository: AdminProfileMarketRepository;
    readonly orderRepository?: AdminOrderRepository;
    readonly inventoryRepository?: AdminInventoryRepository;
    readonly webhookRepository?: AdminWebhookRepository;
    readonly debugRepository?: AdminPaymentDebugRepository;
    readonly runtimeDebugLogRepository?: AdminRuntimeDebugLogRepository;
    readonly activeStorefrontContextStore: ActiveStorefrontContextStore;
  };
  readonly cart?: {
    readonly cartRepository: CartRepository;
    readonly authVerifier: SupabaseAuthVerifier;
    readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  };
  readonly checkout?: {
    readonly checkoutRepository: CheckoutRepository;
    readonly authVerifier: SupabaseAuthVerifier;
    readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  };
  readonly orders?: {
    readonly orderRepository: OrderRepository;
  };
  readonly account?: {
    readonly accountRepository: AccountRepository;
    readonly paymentTokenGateway: PayPalPaymentTokenDeleteGateway;
    readonly authVerifier: SupabaseAuthVerifier;
  };
  readonly paypal?: {
    readonly environment: PayPalEnvironment;
    readonly clientId: string;
    readonly webhookId?: string;
    readonly defaultClientTokenDomains: readonly string[];
    readonly clientTokenGateway: PayPalClientTokenGateway;
    readonly orderGateway?: PayPalCreateOrderGateway &
      PayPalCaptureOrderGateway;
    readonly webhookGateway?: PayPalWebhookVerificationGateway;
    readonly orderRepository?: PayPalOrderPreparationRepository;
    readonly webhookRepository?: PayPalWebhookProcessingRepository;
    readonly authVerifier: SupabaseAuthVerifier;
    readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  };
}

export function createApp(input: CreateAppInput = {}) {
  const app = express();
  const allowedCorsOrigins = expandAllowedCorsOrigins(
    input.allowedCorsOrigins ?? [],
  );

  app.disable("x-powered-by");
  app.use(createCorsMiddleware(allowedCorsOrigins));
  app.use(express.json({ limit: "1mb" }));
  app.use((_request, response, next) => {
    response.locals.debugId = createDebugId();
    next();
  });
  app.use((request, response, next) => {
    if (!input.debugLogger) {
      next();
      return;
    }

    const startedAt = Date.now();
    response.on("finish", () => {
      input.debugLogger?.info("api_request_completed", {
        debug_id: getResponseDebugId(response),
        method: request.method,
        path: request.originalUrl,
        status_code: response.statusCode,
        duration_ms: Date.now() - startedAt,
      });
    });
    next();
  });

  app.get("/api/health", (_request, response) => {
    sendApiSuccess(response, {
      service: "paypal-retail-demo",
      status: "ok",
    });
  });

  app.get("/health", (_request, response) => {
    sendApiSuccess(response, {
      service: "paypal-retail-demo",
      status: "ok",
    });
  });

  if (input.catalogRepository) {
    const activeStorefrontContextStore =
      input.activeStorefrontContextStore ??
      input.admin?.activeStorefrontContextStore;
    app.use(
      "/api",
      createCatalogRouter({
        catalogRepository: input.catalogRepository,
        ...(activeStorefrontContextStore
          ? { activeStorefrontContextStore }
          : {}),
      }),
    );
  }

  if (input.catalogRepository && input.admin) {
    app.use(
      "/api",
      createAdminRouter({
        adminSessionGuard: createAdminSessionGuard({
          adminPasscode: input.admin.adminPasscode,
        }),
        adminPasscode: input.admin.adminPasscode,
        catalogRepository: input.catalogRepository,
        profileMarketRepository: input.admin.profileMarketRepository,
        ...(input.admin.orderRepository
          ? { orderRepository: input.admin.orderRepository }
          : {}),
        ...(input.admin.inventoryRepository
          ? { inventoryRepository: input.admin.inventoryRepository }
          : {}),
        ...(input.admin.webhookRepository
          ? { webhookRepository: input.admin.webhookRepository }
          : {}),
        ...(input.admin.debugRepository
          ? { debugRepository: input.admin.debugRepository }
          : {}),
        ...(input.admin.runtimeDebugLogRepository
          ? { runtimeDebugLogRepository: input.admin.runtimeDebugLogRepository }
          : {}),
        activeStorefrontContextStore: input.admin.activeStorefrontContextStore,
      }),
    );
  }

  if (input.cart) {
    app.use(
      "/api",
      createBuyerAuthMiddleware({ supabase: input.cart.authVerifier }),
      guestCartMiddleware,
      createCartRouter({
        cartRepository: input.cart.cartRepository,
        ...(input.cart.activeStorefrontContextStore
          ? {
              activeStorefrontContextStore:
                input.cart.activeStorefrontContextStore,
            }
          : {}),
      }),
    );
  }

  if (input.checkout) {
    app.use(
      "/api",
      createBuyerAuthMiddleware({ supabase: input.checkout.authVerifier }),
      guestCartMiddleware,
      createCheckoutRouter({
        checkoutRepository: input.checkout.checkoutRepository,
        ...(input.checkout.activeStorefrontContextStore
          ? {
              activeStorefrontContextStore:
                input.checkout.activeStorefrontContextStore,
            }
          : {}),
      }),
    );
  }

  if (input.orders) {
    app.use(
      "/api",
      createOrderRouter({
        orderRepository: input.orders.orderRepository,
      }),
    );
  }

  if (input.account) {
    app.use(
      "/api",
      createBuyerAuthMiddleware({ supabase: input.account.authVerifier }),
      createAccountRouter({
        accountRepository: input.account.accountRepository,
        paymentTokenGateway: input.account.paymentTokenGateway,
      }),
    );
  }

  if (input.paypal) {
    app.use(
      "/api",
      createBuyerAuthMiddleware({ supabase: input.paypal.authVerifier }),
      guestCartMiddleware,
      createPayPalRouter({
        environment: input.paypal.environment,
        clientId: input.paypal.clientId,
        ...(input.paypal.webhookId
          ? { webhookId: input.paypal.webhookId }
          : {}),
        defaultClientTokenDomains: input.paypal.defaultClientTokenDomains,
        clientTokenGateway: input.paypal.clientTokenGateway,
        ...(input.paypal.orderGateway
          ? { orderGateway: input.paypal.orderGateway }
          : {}),
        ...(input.paypal.webhookGateway
          ? { webhookGateway: input.paypal.webhookGateway }
          : {}),
        ...(input.paypal.orderRepository
          ? { orderRepository: input.paypal.orderRepository }
          : {}),
        ...(input.paypal.webhookRepository
          ? { webhookRepository: input.paypal.webhookRepository }
          : {}),
        ...(input.paypal.activeStorefrontContextStore
          ? {
              activeStorefrontContextStore:
                input.paypal.activeStorefrontContextStore,
            }
          : {}),
        ...(input.debugLogger ? { debugLogger: input.debugLogger } : {}),
      }),
    );
  }

  app.use("/api", (request, response) => {
    sendApiError(response, 404, {
      code: "NOT_FOUND",
      message: "The requested API route was not found.",
      details: {
        path: request.originalUrl,
      },
    });
  });
  app.use("/api", createApiErrorMiddleware(input.debugLogger));

  if (input.staticAssetDirectory) {
    app.use(
      express.static(input.staticAssetDirectory, {
        index: false,
      }),
    );
    app.use((request, response, next) => {
      if (!["GET", "HEAD"].includes(request.method)) {
        next();
        return;
      }

      if (request.path.startsWith("/api") || request.path.includes(".")) {
        next();
        return;
      }

      response.sendFile("index.html", {
        root: input.staticAssetDirectory,
      });
    });
  }

  return app;
}

function createApiErrorMiddleware(
  debugLogger?: DebugLogger,
): express.ErrorRequestHandler {
  return (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const debugId = getResponseDebugId(response);
    debugLogger?.error("api_request_failed", {
      debug_id: debugId,
      error_name: error instanceof Error ? error.name : typeof error,
      method: request.method,
      path: request.originalUrl,
    });
    console.error("[paypal-retail-demo] API request failed", {
      debugId,
      errorName: error instanceof Error ? error.name : typeof error,
      method: request.method,
      path: request.originalUrl,
    });

    sendApiError(response, 500, {
      code: "INTERNAL_SERVER_ERROR",
      message: "The API request could not be completed.",
    });
  };
}

function createCorsMiddleware(
  allowedOrigins: ReadonlySet<string>,
): express.RequestHandler {
  return (request, response, next) => {
    const origin = normalizeOriginHeader(request.headers.origin);

    if (origin && allowedOrigins.has(origin)) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader(
        "vary",
        appendHeaderValue(response.getHeader("vary"), "Origin"),
      );
      response.setHeader(
        "access-control-allow-headers",
        "authorization, content-type, x-admin-session, x-cart-id, x-cart-secret",
      );
      response.setHeader(
        "access-control-allow-methods",
        "GET, POST, PATCH, DELETE, OPTIONS",
      );
    }

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }

    next();
  };
}

function expandAllowedCorsOrigins(
  origins: readonly string[],
): ReadonlySet<string> {
  const expandedOrigins = new Set<string>();

  for (const origin of origins) {
    const normalizedOrigin = normalizeConfiguredOrigin(origin);
    if (!normalizedOrigin) {
      continue;
    }

    expandedOrigins.add(normalizedOrigin);
    const aliasOrigin = buildLoopbackOriginAlias(normalizedOrigin);
    if (aliasOrigin) {
      expandedOrigins.add(aliasOrigin);
    }
  }

  return expandedOrigins;
}

function normalizeConfiguredOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
}

function normalizeOriginHeader(origin: unknown): string | null {
  return typeof origin === "string" && origin.trim() ? origin.trim() : null;
}

function buildLoopbackOriginAlias(origin: string): string | null {
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    return url.origin;
  }
  if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    return url.origin;
  }

  return null;
}

function appendHeaderValue(
  currentValue: number | string | string[] | undefined,
  nextValue: string,
): string {
  const values = Array.isArray(currentValue)
    ? currentValue.map(String)
    : currentValue
      ? String(currentValue)
          .split(",")
          .map((value) => value.trim())
      : [];

  return values.includes(nextValue)
    ? values.join(", ")
    : [...values, nextValue].join(", ");
}

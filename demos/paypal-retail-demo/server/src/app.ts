import express from "express";

import {
  createDebugId,
  sendApiError,
  sendApiSuccess,
} from "./http/responses.js";
import {
  createBuyerAuthMiddleware,
  type SupabaseAuthVerifier,
} from "./middleware/auth.js";
import { createAdminSessionGuard } from "./middleware/admin.js";
import { guestCartMiddleware } from "./middleware/guestCart.js";
import type { AdminProfileMarketRepository } from "./repositories/adminRepository.js";
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
} from "./routes/paypal.js";
import type {
  PayPalCaptureOrderGateway,
  PayPalClientTokenGateway,
  PayPalCreateOrderGateway,
} from "./paypal/client.js";
import type { PayPalEnvironment } from "../../shared/src/market.js";
import type { ActiveStorefrontContextStore } from "./state/storefrontContext.js";

export interface CreateAppInput {
  readonly catalogRepository?: CatalogRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  readonly admin?: {
    readonly adminPasscode: string;
    readonly profileMarketRepository: AdminProfileMarketRepository;
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
  readonly paypal?: {
    readonly environment: PayPalEnvironment;
    readonly clientId: string;
    readonly defaultClientTokenDomains: readonly string[];
    readonly clientTokenGateway: PayPalClientTokenGateway;
    readonly orderGateway?: PayPalCreateOrderGateway &
      PayPalCaptureOrderGateway;
    readonly orderRepository?: PayPalOrderPreparationRepository;
    readonly authVerifier: SupabaseAuthVerifier;
    readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
  };
}

export function createApp(input: CreateAppInput = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((_request, response, next) => {
    response.locals.debugId = createDebugId();
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
        catalogRepository: input.catalogRepository,
        profileMarketRepository: input.admin.profileMarketRepository,
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

  if (input.paypal) {
    app.use(
      "/api",
      createBuyerAuthMiddleware({ supabase: input.paypal.authVerifier }),
      guestCartMiddleware,
      createPayPalRouter({
        environment: input.paypal.environment,
        clientId: input.paypal.clientId,
        defaultClientTokenDomains: input.paypal.defaultClientTokenDomains,
        clientTokenGateway: input.paypal.clientTokenGateway,
        ...(input.paypal.orderGateway
          ? { orderGateway: input.paypal.orderGateway }
          : {}),
        ...(input.paypal.orderRepository
          ? { orderRepository: input.paypal.orderRepository }
          : {}),
        ...(input.paypal.activeStorefrontContextStore
          ? {
              activeStorefrontContextStore:
                input.paypal.activeStorefrontContextStore,
            }
          : {}),
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

  return app;
}

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { parseServerEnv, type RawServerEnv } from "./config/env.js";
import { createInMemoryRuntimeDebugLogStore } from "./debug/logger.js";
import { createSupabaseServerClient } from "./db/supabase.js";
import type { SupabaseAuthVerifier } from "./middleware/auth.js";
import { createPayPalClientTokenGateway } from "./paypal/client.js";
import {
  createSupabaseAccountDataSource,
  createSupabaseAccountRepository,
  type SupabaseAccountClient,
} from "./repositories/accountRepository.js";
import {
  createAdminRuntimeDebugLogRepositoryWithFallback,
  createSupabaseAdminInventoryRepository,
  createSupabaseAdminOrderRepository,
  createSupabaseAdminPaymentDebugRepository,
  createSupabaseAdminProfileMarketRepository,
  createSupabaseAdminRuntimeDebugLogRepository,
  createSupabaseAdminWebhookRepository,
  type SupabaseAdminClient,
} from "./repositories/adminRepository.js";
import {
  createSupabaseCartDataSource,
  createSupabaseCartRepository,
  type SupabaseCartClient,
} from "./repositories/cartRepository.js";
import {
  createSupabaseCatalogDataSource,
  createSupabaseCatalogRepository,
  type SupabaseCatalogClient,
} from "./repositories/catalogRepository.js";
import {
  createSupabaseCheckoutDataSource,
  createSupabaseCheckoutRepository,
  type SupabaseCheckoutClient,
} from "./repositories/checkoutRepository.js";
import {
  createSupabaseOrderDataSource,
  createSupabaseOrderRepository,
  type SupabaseOrderClient,
} from "./repositories/orderRepository.js";
import {
  createSupabasePayPalOrderDataSource,
  createSupabasePayPalOrderRepository,
  type SupabasePayPalOrderClient,
} from "./repositories/paypalOrderRepository.js";
import {
  createSupabasePayPalWebhookDataSource,
  createSupabasePayPalWebhookRepository,
  type SupabasePayPalWebhookClient,
} from "./repositories/paypalWebhookRepository.js";
import { createInMemoryActiveStorefrontContextStore } from "./state/storefrontContext.js";

type SupabaseRuntimeClient = SupabaseCatalogClient &
  SupabaseAdminClient &
  SupabaseCartClient &
  SupabaseCheckoutClient &
  SupabaseOrderClient &
  SupabasePayPalOrderClient &
  SupabasePayPalWebhookClient &
  SupabaseAccountClient &
  SupabaseAuthVerifier;

export function startServer(env: RawServerEnv = process.env) {
  const config = parseServerEnv(env);
  const supabase = createSupabaseServerClient<SupabaseRuntimeClient>(config);
  const persistentRuntimeDebugLogRepository =
    createSupabaseAdminRuntimeDebugLogRepository(supabase);
  let runtimeDebugLogPersistenceDegraded = false;
  const runtimeDebugLogStore = createInMemoryRuntimeDebugLogStore({
    onPersistenceInsertFailure() {
      runtimeDebugLogPersistenceDegraded = true;
    },
    persistenceRepository: persistentRuntimeDebugLogRepository,
  });
  const runtimeDebugLogRepository =
    createAdminRuntimeDebugLogRepositoryWithFallback({
      primary: persistentRuntimeDebugLogRepository,
      fallback: runtimeDebugLogStore,
      isPersistentReadDegraded: () => runtimeDebugLogPersistenceDegraded,
    });
  runtimeDebugLogStore.logger.info("server_starting", {
    app_base_url: config.appBaseUrl,
    environment: config.paypalEnvironment,
    has_paypal_bn_code: Boolean(config.paypalBnCode),
    has_public_https_origin: Boolean(config.publicHttpsOrigin),
    node_env:
      (env as RawServerEnv & { readonly NODE_ENV?: string }).NODE_ENV ?? null,
    port: config.port,
    public_https_origin: config.publicHttpsOrigin,
    static_asset_directory: resolve(process.cwd(), "web/dist"),
    supabase_service_configured: Boolean(config.supabaseServiceRoleKey),
  });
  const activeStorefrontContextStore =
    createInMemoryActiveStorefrontContextStore();
  const catalogRepository = createSupabaseCatalogRepository({
    dataSource: createSupabaseCatalogDataSource(supabase),
  });
  const cartRepository = createSupabaseCartRepository({
    dataSource: createSupabaseCartDataSource(supabase),
  });
  const checkoutRepository = createSupabaseCheckoutRepository({
    dataSource: createSupabaseCheckoutDataSource(supabase),
  });
  const orderRepository = createSupabaseOrderRepository({
    dataSource: createSupabaseOrderDataSource(supabase),
  });
  const accountRepository = createSupabaseAccountRepository({
    dataSource: createSupabaseAccountDataSource(supabase),
  });
  const paypalOrderRepository = createSupabasePayPalOrderRepository({
    dataSource: createSupabasePayPalOrderDataSource(supabase),
    publicApiBaseUrl: config.publicHttpsOrigin ?? config.appBaseUrl,
  });
  const paypalWebhookRepository = createSupabasePayPalWebhookRepository({
    dataSource: createSupabasePayPalWebhookDataSource(supabase),
  });
  const paypalClientTokenGateway = createPayPalClientTokenGateway({
    environment: config.paypalEnvironment,
    clientId: config.paypalClientId,
    clientSecret: config.paypalClientSecret,
  });
  const app = createApp({
    allowedCorsOrigins: [
      config.appBaseUrl,
      ...(config.publicHttpsOrigin ? [config.publicHttpsOrigin] : []),
    ],
    staticAssetDirectory: resolve(process.cwd(), "web/dist"),
    debugLogger: runtimeDebugLogStore.logger,
    catalogRepository,
    activeStorefrontContextStore,
    admin: {
      adminPasscode: config.adminPasscode,
      profileMarketRepository:
        createSupabaseAdminProfileMarketRepository(supabase),
      orderRepository: createSupabaseAdminOrderRepository(supabase),
      inventoryRepository: createSupabaseAdminInventoryRepository(supabase),
      webhookRepository: createSupabaseAdminWebhookRepository(supabase),
      debugRepository: createSupabaseAdminPaymentDebugRepository(supabase),
      runtimeDebugLogRepository,
      activeStorefrontContextStore,
    },
    cart: {
      cartRepository,
      authVerifier: supabase,
      activeStorefrontContextStore,
    },
    checkout: {
      checkoutRepository,
      authVerifier: supabase,
      activeStorefrontContextStore,
    },
    orders: {
      orderRepository,
    },
    account: {
      accountRepository,
      paymentTokenGateway: paypalClientTokenGateway,
      authVerifier: supabase,
    },
    paypal: {
      environment: config.paypalEnvironment,
      clientId: config.paypalClientId,
      webhookId: config.paypalWebhookId,
      defaultClientTokenDomains: [
        config.publicHttpsOrigin ?? config.appBaseUrl,
      ],
      clientTokenGateway: paypalClientTokenGateway,
      orderGateway: paypalClientTokenGateway,
      webhookGateway: paypalClientTokenGateway,
      orderRepository: paypalOrderRepository,
      webhookRepository: paypalWebhookRepository,
      authVerifier: supabase,
      activeStorefrontContextStore,
    },
  });

  return app.listen(config.port, "0.0.0.0", () => {
    runtimeDebugLogStore.logger.info("server_started", {
      bind_host: "0.0.0.0",
      port: config.port,
    });
    console.log(`PayPal retail demo API listening on 0.0.0.0:${config.port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}

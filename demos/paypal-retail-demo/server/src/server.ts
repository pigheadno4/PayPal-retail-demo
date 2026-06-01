import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { parseServerEnv, type RawServerEnv } from "./config/env.js";
import { createSupabaseServerClient } from "./db/supabase.js";
import type { SupabaseAuthVerifier } from "./middleware/auth.js";
import { createSupabaseAdminProfileMarketRepository } from "./repositories/adminRepository.js";
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
import { createInMemoryActiveStorefrontContextStore } from "./state/storefrontContext.js";

type SupabaseRuntimeClient = SupabaseCatalogClient &
  SupabaseCartClient &
  SupabaseCheckoutClient &
  SupabaseOrderClient &
  SupabaseAuthVerifier;

export function startServer(env: RawServerEnv = process.env) {
  const config = parseServerEnv(env);
  const supabase = createSupabaseServerClient<SupabaseRuntimeClient>(config);
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
  const app = createApp({
    catalogRepository,
    activeStorefrontContextStore,
    admin: {
      adminPasscode: config.adminPasscode,
      profileMarketRepository:
        createSupabaseAdminProfileMarketRepository(supabase),
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
  });

  return app.listen(config.port, () => {
    console.log(`PayPal retail demo API listening on ${config.port}`);
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  startServer();
}

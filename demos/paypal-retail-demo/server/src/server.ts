import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { parseServerEnv, type RawServerEnv } from "./config/env.js";
import { createSupabaseServerClient } from "./db/supabase.js";
import { createSupabaseAdminProfileMarketRepository } from "./repositories/adminRepository.js";
import {
  createSupabaseCatalogDataSource,
  createSupabaseCatalogRepository,
  type SupabaseCatalogClient,
} from "./repositories/catalogRepository.js";
import { createInMemoryActiveStorefrontContextStore } from "./state/storefrontContext.js";

export function startServer(env: RawServerEnv = process.env) {
  const config = parseServerEnv(env);
  const supabase = createSupabaseServerClient<SupabaseCatalogClient>(config);
  const activeStorefrontContextStore =
    createInMemoryActiveStorefrontContextStore();
  const catalogRepository = createSupabaseCatalogRepository({
    dataSource: createSupabaseCatalogDataSource(supabase),
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

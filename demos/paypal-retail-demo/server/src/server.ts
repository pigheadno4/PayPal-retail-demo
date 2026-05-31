import { pathToFileURL } from "node:url";

import { createApp } from "./app.js";
import { parseServerEnv, type RawServerEnv } from "./config/env.js";
import { createSupabaseServerClient } from "./db/supabase.js";
import {
  createSupabaseCatalogDataSource,
  createSupabaseCatalogRepository,
  type SupabaseCatalogClient,
} from "./repositories/catalogRepository.js";

export function startServer(env: RawServerEnv = process.env) {
  const config = parseServerEnv(env);
  const supabase = createSupabaseServerClient<SupabaseCatalogClient>(config);
  const app = createApp({
    catalogRepository: createSupabaseCatalogRepository({
      dataSource: createSupabaseCatalogDataSource(supabase),
    }),
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

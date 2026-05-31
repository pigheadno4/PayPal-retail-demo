import {
  createClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";

import type { ServerEnv } from "../config/env.js";

export type SupabaseAppSchemaName = "app";
export type SupabaseServerClientOptions =
  SupabaseClientOptions<SupabaseAppSchemaName>;

export type SupabaseServerClientFactory<TClient> = (
  supabaseUrl: string,
  supabaseKey: string,
  options: SupabaseServerClientOptions,
) => TClient;

export function buildSupabaseServerClientOptions(): SupabaseServerClientOptions {
  return {
    db: {
      schema: "app",
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "paypal-retail-demo-server",
      },
    },
  };
}

export function createSupabaseServerClient<TClient = unknown>(
  env: Pick<ServerEnv, "supabaseUrl" | "supabaseServiceRoleKey">,
  factory: SupabaseServerClientFactory<TClient> = createClient as SupabaseServerClientFactory<TClient>,
): TClient {
  return factory(
    env.supabaseUrl,
    env.supabaseServiceRoleKey,
    buildSupabaseServerClientOptions(),
  );
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { parseRuntimeEnv } from "@/server/config/env";

export async function createServerSupabaseClient() {
  const runtimeEnv = parseRuntimeEnv(process.env);
  const cookieStore = await cookies();

  return createServerClient(
    runtimeEnv.public.supabaseUrl,
    runtimeEnv.public.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Route handlers refresh sessions; Server Components cannot mutate cookies.
          }
        },
      },
    },
  );
}

export async function requireCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication required");
  }

  return data.user;
}

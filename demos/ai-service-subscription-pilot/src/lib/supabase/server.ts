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
      cookieOptions: {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // The proxy is the sole refresh writer because it can also emit the required no-store headers.
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

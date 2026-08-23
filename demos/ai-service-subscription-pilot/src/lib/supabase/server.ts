import "server-only";

import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

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

export async function createRouteHandlerSupabaseClient() {
  const runtimeEnv = parseRuntimeEnv(process.env);
  const cookieStore = await cookies();
  let pendingCookies: Parameters<SetAllCookies>[0] = [];
  let pendingHeaders: Record<string, string> = {};
  const client = createServerClient(
    runtimeEnv.public.supabaseUrl,
    runtimeEnv.public.supabasePublishableKey,
    {
      cookieOptions: { sameSite: "lax", secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet, headers) {
          pendingCookies = cookiesToSet;
          pendingHeaders = headers;
        },
      },
    },
  );
  return {
    client,
    applyToResponse(response: NextResponse) {
      pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      Object.entries(pendingHeaders).forEach(([name, value]) => response.headers.set(name, value));
      return response;
    },
  };
}

export async function requireCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication required");
  }

  return data.user;
}

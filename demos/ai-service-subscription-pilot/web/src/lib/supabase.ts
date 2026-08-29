import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) throw new Error("identity_not_configured");
  browserClient = createClient(url, publishableKey);
  return browserClient;
}

export async function verifyEmailOtp(email: string, token: string): Promise<string> {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error || !data.session?.access_token) throw new Error("verification_failed");
  return data.session.access_token;
}

export async function currentAccessToken(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession();
  return data.session?.access_token ?? null;
}

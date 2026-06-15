export interface BuyerAuthSubmitInput {
  readonly email: string;
  readonly password: string;
}

export interface BuyerAuthSession {
  readonly accessToken: string;
  readonly email: string | null;
  readonly userId: string;
}

export interface BuyerAuthClient {
  readonly getSession: () => Promise<BuyerAuthSession | null>;
  readonly signInWithPassword: (
    input: BuyerAuthSubmitInput,
  ) => Promise<BuyerAuthSession>;
  readonly signUpWithPassword: (
    input: BuyerAuthSubmitInput,
  ) => Promise<BuyerAuthSession>;
}

interface SupabaseAuthSessionLike {
  readonly access_token?: string | null;
  readonly user?: {
    readonly id?: string | null;
    readonly email?: string | null;
  } | null;
}

interface SupabaseAuthResponse<TData> {
  readonly data: TData;
  readonly error: { readonly message: string } | null;
}

interface SupabaseBrowserAuthApi {
  readonly auth: {
    readonly getSession: () => Promise<
      SupabaseAuthResponse<{ readonly session: SupabaseAuthSessionLike | null }>
    >;
    readonly signInWithPassword: (
      input: BuyerAuthSubmitInput,
    ) => Promise<
      SupabaseAuthResponse<{ readonly session: SupabaseAuthSessionLike | null }>
    >;
    readonly signUp: (
      input: BuyerAuthSubmitInput,
    ) => Promise<
      SupabaseAuthResponse<{ readonly session: SupabaseAuthSessionLike | null }>
    >;
  };
}

export function createSupabaseBrowserAuthClient(): BuyerAuthClient {
  if (import.meta.env.MODE === "test") {
    return createDisabledAuthClient();
  }

  const supabaseUrl = normalizeEnvValue(import.meta.env.VITE_SUPABASE_URL);
  const publishableKey = normalizeEnvValue(
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!supabaseUrl || !publishableKey) {
    return createDisabledAuthClient();
  }

  const resolvedSupabaseUrl = supabaseUrl;
  const resolvedPublishableKey = publishableKey;
  let supabasePromise: Promise<SupabaseBrowserAuthApi> | null = null;

  function getSupabase() {
    supabasePromise ??= import("@supabase/supabase-js").then(
      ({ createClient }) =>
        createClient(resolvedSupabaseUrl, resolvedPublishableKey, {
          auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
          },
          global: {
            headers: {
              "X-Client-Info": "paypal-retail-demo-web",
            },
          },
        }) as SupabaseBrowserAuthApi,
    );
    return supabasePromise;
  }

  return {
    async getSession() {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[paypal-retail-demo] Supabase session load failed", {
          message: error.message,
        });
        return null;
      }
      return mapSupabaseSession(data.session);
    },
    async signInWithPassword(input) {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signInWithPassword(input);
      return requireSupabaseSession(data.session, error?.message);
    },
    async signUpWithPassword(input) {
      const supabase = await getSupabase();
      const { data, error } = await supabase.auth.signUp(input);
      return requireSupabaseSession(
        data.session,
        error?.message ??
          "Registration requires email verification before sign-in.",
      );
    },
  };
}

function createDisabledAuthClient(): BuyerAuthClient {
  return {
    async getSession() {
      return null;
    },
    async signInWithPassword() {
      throw new Error("Supabase Auth is not configured for this browser.");
    },
    async signUpWithPassword() {
      throw new Error("Supabase Auth is not configured for this browser.");
    },
  };
}

function requireSupabaseSession(
  session: SupabaseAuthSessionLike | null,
  errorMessage: string | undefined,
): BuyerAuthSession {
  const mappedSession = mapSupabaseSession(session);
  if (mappedSession) {
    return mappedSession;
  }

  throw new Error(errorMessage ?? "Supabase Auth did not return a session.");
}

function mapSupabaseSession(
  session: SupabaseAuthSessionLike | null,
): BuyerAuthSession | null {
  const accessToken = normalizeEnvValue(session?.access_token ?? undefined);
  const userId = normalizeEnvValue(session?.user?.id ?? undefined);

  if (!accessToken || !userId) {
    return null;
  }

  return {
    accessToken,
    userId,
    email: session?.user?.email ?? null,
  };
}

function normalizeEnvValue(value: string | undefined): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

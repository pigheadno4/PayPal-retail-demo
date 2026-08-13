import "server-only";

import { z } from "zod";

const runtimeEnvironmentSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  SUPABASE_SEND_EMAIL_HOOK_SECRET: z.string().min(1),
  DEMO_SESSION_SIGNING_SECRET: z.string().min(32),
  PAYPAL_CLIENT_SECRET: z.string().min(1),
  PAYPAL_WEBHOOK_ID: z.string().min(1),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "live"]),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().min(1),
  APP_URL: z.url(),
});

export type RuntimeEnv = Readonly<{
  public: Readonly<{
    supabaseUrl: string;
    supabasePublishableKey: string;
    paypalClientId: string;
  }>;
  databaseUrl: string;
  supabaseSecretKey: string;
  supabaseSendEmailHookSecret: string;
  demoSessionSigningSecret: string;
  paypalClientSecret: string;
  paypalWebhookId: string;
  paypalEnvironment: "sandbox" | "live";
  resendApiKey: string;
  emailFromAddress: string;
  appUrl: string;
}>;

const allowedPublicEnvironmentNames = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
]);

export function parseRuntimeEnv(
  environment: Record<string, string | undefined>,
): RuntimeEnv {
  const exposedPublicEnvironmentVariable = Object.keys(environment).find(
    (name) => name.startsWith("NEXT_PUBLIC_") && !allowedPublicEnvironmentNames.has(name),
  );

  if (exposedPublicEnvironmentVariable) {
    throw new Error(`${exposedPublicEnvironmentVariable} is not an approved browser environment variable`);
  }

  const parsed = runtimeEnvironmentSchema.parse(environment);

  return {
    public: {
      supabaseUrl: parsed.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: parsed.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      paypalClientId: parsed.NEXT_PUBLIC_PAYPAL_CLIENT_ID,
    },
    databaseUrl: parsed.DATABASE_URL,
    supabaseSecretKey: parsed.SUPABASE_SECRET_KEY,
    supabaseSendEmailHookSecret: parsed.SUPABASE_SEND_EMAIL_HOOK_SECRET,
    demoSessionSigningSecret: parsed.DEMO_SESSION_SIGNING_SECRET,
    paypalClientSecret: parsed.PAYPAL_CLIENT_SECRET,
    paypalWebhookId: parsed.PAYPAL_WEBHOOK_ID,
    paypalEnvironment: parsed.PAYPAL_ENVIRONMENT,
    resendApiKey: parsed.RESEND_API_KEY,
    emailFromAddress: parsed.EMAIL_FROM_ADDRESS,
    appUrl: parsed.APP_URL,
  };
}

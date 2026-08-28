import {
  ConfigurationError,
  IntegrationNotConfiguredError,
} from "../http/errors.js";

export type BaseServerConfig = Readonly<{
  appUrl: string;
  port: number;
  databaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  supabaseSecretKey: string;
  demoSessionSigningSecret: string;
}>;

export type PayPalCapabilityConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  merchantId: string;
  webhookId: string;
  environment: "sandbox" | "live";
}>;

export type EmailHookCapabilityConfig = Readonly<{
  sendEmailHookSecret: string;
  resendApiKey: string;
  fromAddress: string;
}>;

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) {
    throw new ConfigurationError();
  }
  return value;
}

function validUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ConfigurationError();
    }
    return value;
  } catch {
    throw new ConfigurationError();
  }
}

function validPort(value: string): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new ConfigurationError();
  }
  return port;
}

function validDatabaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new ConfigurationError();
    }
    return value;
  } catch {
    throw new ConfigurationError();
  }
}

export function parseBaseServerConfig(
  environment: NodeJS.ProcessEnv,
): BaseServerConfig {
  const demoSessionSigningSecret = required(
    environment,
    "DEMO_SESSION_SIGNING_SECRET",
  );
  if (demoSessionSigningSecret.length < 32) {
    throw new ConfigurationError();
  }

  return {
    appUrl: validUrl(required(environment, "APP_URL")),
    port: validPort(required(environment, "PORT")),
    databaseUrl: validDatabaseUrl(required(environment, "DATABASE_URL")),
    supabaseUrl: validUrl(required(environment, "SUPABASE_URL")),
    supabasePublishableKey: required(environment, "SUPABASE_PUBLISHABLE_KEY"),
    supabaseSecretKey: required(environment, "SUPABASE_SECRET_KEY"),
    demoSessionSigningSecret,
  };
}

export function requirePayPalConfig(
  environment: NodeJS.ProcessEnv,
): PayPalCapabilityConfig {
  const clientId = environment.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = environment.PAYPAL_CLIENT_SECRET?.trim();
  const merchantId = environment.PAYPAL_MERCHANT_ID?.trim();
  const webhookId = environment.PAYPAL_WEBHOOK_ID?.trim();
  const paypalEnvironment = environment.PAYPAL_ENVIRONMENT?.trim();

  if (
    !clientId ||
    !clientSecret ||
    !merchantId ||
    !webhookId ||
    (paypalEnvironment !== "sandbox" && paypalEnvironment !== "live")
  ) {
    throw new IntegrationNotConfiguredError();
  }

  return {
    clientId,
    clientSecret,
    merchantId,
    webhookId,
    environment: paypalEnvironment,
  };
}

export function requireEmailHookConfig(
  environment: NodeJS.ProcessEnv,
): EmailHookCapabilityConfig {
  const sendEmailHookSecret =
    environment.SUPABASE_SEND_EMAIL_HOOK_SECRET?.trim();
  const resendApiKey = environment.RESEND_API_KEY?.trim();
  const fromAddress = environment.EMAIL_FROM_ADDRESS?.trim();

  if (!sendEmailHookSecret || !resendApiKey || !fromAddress) {
    throw new IntegrationNotConfiguredError();
  }

  return { sendEmailHookSecret, resendApiKey, fromAddress };
}

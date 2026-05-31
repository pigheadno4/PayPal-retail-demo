export type PayPalServerEnvironment = "sandbox" | "production";

export interface RawServerEnv {
  readonly PORT?: string;
  readonly APP_BASE_URL?: string;
  readonly ADMIN_PASSCODE?: string;
  readonly SUPABASE_URL?: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly PAYPAL_ENVIRONMENT?: string;
  readonly PAYPAL_CLIENT_ID?: string;
  readonly PAYPAL_CLIENT_SECRET?: string;
  readonly PAYPAL_WEBHOOK_ID?: string;
  readonly PAYPAL_BN_CODE?: string;
  readonly PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY?: string;
  readonly PUBLIC_HTTPS_ORIGIN?: string;
  readonly PAYPAL_APPLE_PAY_DOMAIN?: string;
  readonly PAYPAL_GOOGLE_PAY_MERCHANT_ID?: string;
}

export interface ServerEnv {
  readonly port: number;
  readonly appBaseUrl: string;
  readonly adminPasscode: string;
  readonly supabaseUrl: string;
  readonly supabaseServiceRoleKey: string;
  readonly paypalEnvironment: PayPalServerEnvironment;
  readonly paypalClientId: string;
  readonly paypalClientSecret: string;
  readonly paypalWebhookId: string;
  readonly paypalBnCode: string | null;
  readonly paypalDefaultSandboxTestBuyerCountry: string;
  readonly publicHttpsOrigin: string | null;
  readonly paypalApplePayDomain: string | null;
  readonly paypalGooglePayMerchantId: string | null;
}

const requiredServerEnvKeys = [
  "APP_BASE_URL",
  "ADMIN_PASSCODE",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYPAL_ENVIRONMENT",
  "PAYPAL_CLIENT_ID",
  "PAYPAL_CLIENT_SECRET",
  "PAYPAL_WEBHOOK_ID",
  "PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY",
] as const;

export function parseServerEnv(env: RawServerEnv = process.env): ServerEnv {
  const missingKeys = requiredServerEnvKeys.filter(
    (key) => normalizeOptionalEnvValue(env[key]) === null,
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required server environment variables: ${missingKeys.join(", ")}`,
    );
  }

  const paypalEnvironment = parsePayPalEnvironment(
    getRequiredEnvValue(env, "PAYPAL_ENVIRONMENT"),
  );

  return {
    port: parsePort(env.PORT),
    appBaseUrl: parseUrl(
      getRequiredEnvValue(env, "APP_BASE_URL"),
      "APP_BASE_URL",
    ),
    adminPasscode: getRequiredEnvValue(env, "ADMIN_PASSCODE"),
    supabaseUrl: parseUrl(
      getRequiredEnvValue(env, "SUPABASE_URL"),
      "SUPABASE_URL",
    ),
    supabaseServiceRoleKey: getRequiredEnvValue(
      env,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
    paypalEnvironment,
    paypalClientId: getRequiredEnvValue(env, "PAYPAL_CLIENT_ID"),
    paypalClientSecret: getRequiredEnvValue(env, "PAYPAL_CLIENT_SECRET"),
    paypalWebhookId: getRequiredEnvValue(env, "PAYPAL_WEBHOOK_ID"),
    paypalBnCode: normalizeOptionalEnvValue(env.PAYPAL_BN_CODE),
    paypalDefaultSandboxTestBuyerCountry: parseCountryCode(
      getRequiredEnvValue(env, "PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY"),
      "PAYPAL_DEFAULT_SANDBOX_TEST_BUYER_COUNTRY",
    ),
    publicHttpsOrigin: normalizeOptionalUrl(
      env.PUBLIC_HTTPS_ORIGIN,
      "PUBLIC_HTTPS_ORIGIN",
    ),
    paypalApplePayDomain: normalizeOptionalEnvValue(
      env.PAYPAL_APPLE_PAY_DOMAIN,
    ),
    paypalGooglePayMerchantId: normalizeOptionalEnvValue(
      env.PAYPAL_GOOGLE_PAY_MERCHANT_ID,
    ),
  };
}

function getRequiredEnvValue(
  env: RawServerEnv,
  key: keyof RawServerEnv,
): string {
  const value = normalizeOptionalEnvValue(env[key]);
  if (value === null) {
    throw new Error(`Missing required server environment variable: ${key}`);
  }
  return value;
}

function normalizeOptionalEnvValue(value?: string): string | null {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function normalizeOptionalUrl(
  value: string | undefined,
  key: string,
): string | null {
  const normalizedValue = normalizeOptionalEnvValue(value);
  return normalizedValue ? parseUrl(normalizedValue, key) : null;
}

function parseUrl(value: string, key: string): string {
  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
}

function parsePayPalEnvironment(value: string): PayPalServerEnvironment {
  if (value === "sandbox" || value === "production") {
    return value;
  }
  throw new Error("PAYPAL_ENVIRONMENT must be sandbox or production");
}

function parsePort(value?: string): number {
  const normalizedValue = normalizeOptionalEnvValue(value);
  if (normalizedValue === null) {
    return 3000;
  }

  const port = Number.parseInt(normalizedValue, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
}

function parseCountryCode(value: string, key: string): string {
  const countryCode = value.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    throw new Error(`${key} must be a two-letter country code`);
  }
  return countryCode;
}

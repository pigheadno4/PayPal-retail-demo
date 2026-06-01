import type { PayPalEnvironment } from "../../../shared/src/market.js";

export interface PayPalClientTokenGatewayInput {
  readonly domains: readonly string[];
  readonly targetCustomerId: string | null;
}

export interface PayPalClientTokenGatewayResponse {
  readonly clientToken: string;
  readonly expiresInSeconds: number;
}

export interface PayPalClientTokenGateway {
  readonly generateClientToken: (
    input: PayPalClientTokenGatewayInput,
  ) => Promise<PayPalClientTokenGatewayResponse>;
}

export interface CreatePayPalClientTokenGatewayInput {
  readonly environment: PayPalEnvironment;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly fetch?: typeof fetch;
}

interface PayPalOAuthResponseBody {
  readonly access_token?: unknown;
  readonly expires_in?: unknown;
  readonly name?: unknown;
  readonly error?: unknown;
}

export function createPayPalClientTokenGateway(
  input: CreatePayPalClientTokenGatewayInput,
): PayPalClientTokenGateway {
  const fetchClient = input.fetch ?? globalThis.fetch;

  return {
    async generateClientToken(tokenInput) {
      const body = new URLSearchParams();
      body.set("grant_type", "client_credentials");
      body.set("response_type", "client_token");
      body.set("domains[]", tokenInput.domains.join(","));
      if (tokenInput.targetCustomerId) {
        body.set("target_customer_id", tokenInput.targetCustomerId);
      }

      const response = await fetchClient(
        `${getPayPalApiBaseUrl(input.environment)}/v1/oauth2/token`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(
              `${input.clientId}:${input.clientSecret}`,
            ).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        },
      );
      const responseBody = (await response.json()) as PayPalOAuthResponseBody;

      if (!response.ok) {
        throw new Error(
          `PayPal client token request failed: ${extractPayPalErrorName(
            responseBody,
          )}`,
        );
      }

      if (typeof responseBody.access_token !== "string") {
        throw new Error("PayPal client token response is missing access_token");
      }
      if (typeof responseBody.expires_in !== "number") {
        throw new Error("PayPal client token response is missing expires_in");
      }

      return {
        clientToken: responseBody.access_token,
        expiresInSeconds: responseBody.expires_in,
      };
    },
  };
}

function getPayPalApiBaseUrl(environment: PayPalEnvironment): string {
  return environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function extractPayPalErrorName(body: PayPalOAuthResponseBody): string {
  if (typeof body.name === "string" && body.name.trim()) {
    return body.name.trim();
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }
  return "unknown";
}

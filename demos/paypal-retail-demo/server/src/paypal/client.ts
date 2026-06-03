import type { PayPalEnvironment } from "../../../shared/src/market.js";
import type {
  PayPalCreateOrderPayload,
  PayPalSnapshotJson,
} from "../../../shared/src/paypal.js";

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

export interface PayPalCreateOrderGatewayInput {
  readonly paypalRequestId: string;
  readonly payload: PayPalCreateOrderPayload;
}

export interface PayPalCreateOrderGatewayResponse {
  readonly paypalOrderId: string;
  readonly status: string;
  readonly approvalUrl: string | null;
  readonly rawResponse: PayPalSnapshotJson;
}

export interface PayPalCreateOrderGateway {
  readonly createOrder: (
    input: PayPalCreateOrderGatewayInput,
  ) => Promise<PayPalCreateOrderGatewayResponse>;
}

export interface PayPalCaptureOrderGatewayInput {
  readonly paypalOrderId: string;
  readonly paypalRequestId: string;
}

export interface PayPalCaptureOrderGatewayResponse {
  readonly paypalOrderId: string;
  readonly status: string;
  readonly captureId: string;
  readonly captureStatus: string;
  readonly rawResponse: PayPalSnapshotJson;
}

export interface PayPalCaptureOrderGateway {
  readonly captureOrder: (
    input: PayPalCaptureOrderGatewayInput,
  ) => Promise<PayPalCaptureOrderGatewayResponse>;
}

export interface PayPalWebhookVerificationGatewayInput {
  readonly webhookId: string;
  readonly transmissionId: string;
  readonly transmissionTime: string;
  readonly transmissionSignature: string;
  readonly certUrl: string;
  readonly authAlgorithm: string;
  readonly event: PayPalSnapshotJson;
}

export interface PayPalWebhookVerificationGatewayResponse {
  readonly verificationStatus: "SUCCESS" | "FAILURE";
}

export interface PayPalWebhookVerificationGateway {
  readonly verifyWebhookSignature: (
    input: PayPalWebhookVerificationGatewayInput,
  ) => Promise<PayPalWebhookVerificationGatewayResponse>;
}

export interface PayPalPaymentTokenDeleteGatewayInput {
  readonly vaultId: string;
}

export interface PayPalPaymentTokenDeleteGateway {
  readonly deletePaymentToken: (
    input: PayPalPaymentTokenDeleteGatewayInput,
  ) => Promise<void>;
}

export type PayPalGateway = PayPalClientTokenGateway &
  PayPalCreateOrderGateway &
  PayPalCaptureOrderGateway &
  PayPalWebhookVerificationGateway &
  PayPalPaymentTokenDeleteGateway;

export interface CreatePayPalClientTokenGatewayInput {
  readonly environment: PayPalEnvironment;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly bnCode?: string | null;
  readonly fetch?: typeof fetch;
}

interface PayPalOAuthResponseBody {
  readonly access_token?: unknown;
  readonly expires_in?: unknown;
  readonly name?: unknown;
  readonly error?: unknown;
}

interface PayPalCreateOrderResponseBody {
  readonly id?: unknown;
  readonly status?: unknown;
  readonly name?: unknown;
  readonly error?: unknown;
  readonly links?: unknown;
}

interface PayPalCaptureOrderResponseBody {
  readonly id?: unknown;
  readonly status?: unknown;
  readonly name?: unknown;
  readonly error?: unknown;
  readonly purchase_units?: unknown;
}

interface PayPalWebhookVerificationResponseBody {
  readonly verification_status?: unknown;
  readonly name?: unknown;
  readonly error?: unknown;
}

export function createPayPalClientTokenGateway(
  input: CreatePayPalClientTokenGatewayInput,
): PayPalGateway {
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
    async createOrder(orderInput) {
      const accessToken = await requestAccessToken(input, fetchClient);
      const response = await fetchClient(
        `${getPayPalApiBaseUrl(input.environment)}/v2/checkout/orders`,
        {
          method: "POST",
          headers: buildPayPalJsonHeaders({
            accessToken,
            paypalRequestId: orderInput.paypalRequestId,
            bnCode: input.bnCode ?? null,
          }),
          body: JSON.stringify(orderInput.payload),
        },
      );
      const responseBody =
        (await response.json()) as PayPalCreateOrderResponseBody;

      if (!response.ok) {
        throw new Error(
          `PayPal create order request failed: ${extractPayPalErrorName(
            responseBody,
          )}`,
        );
      }

      if (typeof responseBody.id !== "string") {
        throw new Error("PayPal create order response is missing id");
      }

      return {
        paypalOrderId: responseBody.id,
        status:
          typeof responseBody.status === "string"
            ? responseBody.status
            : "UNKNOWN",
        approvalUrl: extractApprovalUrl(responseBody.links),
        rawResponse: sanitizeJsonCompatible(responseBody),
      };
    },
    async captureOrder(captureInput) {
      const accessToken = await requestAccessToken(input, fetchClient);
      const response = await fetchClient(
        `${getPayPalApiBaseUrl(input.environment)}/v2/checkout/orders/${encodeURIComponent(
          captureInput.paypalOrderId,
        )}/capture`,
        {
          method: "POST",
          headers: buildPayPalJsonHeaders({
            accessToken,
            paypalRequestId: captureInput.paypalRequestId,
            bnCode: input.bnCode ?? null,
          }),
        },
      );
      const responseBody =
        (await response.json()) as PayPalCaptureOrderResponseBody;

      if (!response.ok) {
        throw new Error(
          `PayPal capture order request failed: ${extractPayPalErrorName(
            responseBody,
          )}`,
        );
      }

      if (typeof responseBody.id !== "string") {
        throw new Error("PayPal capture order response is missing id");
      }

      const capture = extractFirstCapture(responseBody.purchase_units);
      if (!capture) {
        throw new Error("PayPal capture order response is missing capture");
      }

      return {
        paypalOrderId: responseBody.id,
        status:
          typeof responseBody.status === "string"
            ? responseBody.status
            : "UNKNOWN",
        captureId: capture.id,
        captureStatus: capture.status,
        rawResponse: sanitizeJsonCompatible(responseBody),
      };
    },
    async verifyWebhookSignature(webhookInput) {
      const accessToken = await requestAccessToken(input, fetchClient);
      const response = await fetchClient(
        `${getPayPalApiBaseUrl(
          input.environment,
        )}/v1/notifications/verify-webhook-signature`,
        {
          method: "POST",
          headers: buildPayPalServerJsonHeaders(accessToken),
          body: JSON.stringify({
            auth_algo: webhookInput.authAlgorithm,
            cert_url: webhookInput.certUrl,
            transmission_id: webhookInput.transmissionId,
            transmission_sig: webhookInput.transmissionSignature,
            transmission_time: webhookInput.transmissionTime,
            webhook_id: webhookInput.webhookId,
            webhook_event: webhookInput.event,
          }),
        },
      );
      const responseBody =
        (await response.json()) as PayPalWebhookVerificationResponseBody;

      if (!response.ok) {
        throw new Error(
          `PayPal webhook verification request failed: ${extractPayPalErrorName(
            responseBody,
          )}`,
        );
      }

      if (
        responseBody.verification_status !== "SUCCESS" &&
        responseBody.verification_status !== "FAILURE"
      ) {
        throw new Error(
          "PayPal webhook verification response is missing verification_status",
        );
      }

      return {
        verificationStatus: responseBody.verification_status,
      };
    },
    async deletePaymentToken(tokenInput) {
      const accessToken = await requestAccessToken(input, fetchClient);
      const response = await fetchClient(
        `${getPayPalApiBaseUrl(input.environment)}/v3/vault/payment-tokens/${encodeURIComponent(
          tokenInput.vaultId,
        )}`,
        {
          method: "DELETE",
          headers: buildPayPalServerJsonHeaders(accessToken),
        },
      );

      if (!response.ok) {
        const responseBody =
          (await response.json()) as PayPalWebhookVerificationResponseBody;
        throw new Error(
          `PayPal payment token delete failed: ${extractPayPalErrorName(
            responseBody,
          )}`,
        );
      }
    },
  };
}

async function requestAccessToken(
  input: CreatePayPalClientTokenGatewayInput,
  fetchClient: typeof fetch,
): Promise<string> {
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
      body: new URLSearchParams({
        grant_type: "client_credentials",
      }),
    },
  );
  const responseBody = (await response.json()) as PayPalOAuthResponseBody;

  if (!response.ok) {
    throw new Error(
      `PayPal OAuth request failed: ${extractPayPalErrorName(responseBody)}`,
    );
  }
  if (typeof responseBody.access_token !== "string") {
    throw new Error("PayPal OAuth response is missing access_token");
  }

  return responseBody.access_token;
}

function buildPayPalJsonHeaders(input: {
  readonly accessToken: string;
  readonly paypalRequestId: string;
  readonly bnCode: string | null;
}): Record<string, string> {
  return {
    authorization: `Bearer ${input.accessToken}`,
    "content-type": "application/json",
    "paypal-request-id": input.paypalRequestId,
    ...(input.bnCode ? { "paypal-partner-attribution-id": input.bnCode } : {}),
  };
}

function buildPayPalServerJsonHeaders(
  accessToken: string,
): Record<string, string> {
  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };
}

function getPayPalApiBaseUrl(environment: PayPalEnvironment): string {
  return environment === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function extractPayPalErrorName(body: {
  readonly name?: unknown;
  readonly error?: unknown;
}): string {
  if (typeof body.name === "string" && body.name.trim()) {
    return body.name.trim();
  }
  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }
  return "unknown";
}

function extractFirstCapture(
  purchaseUnits: unknown,
): { readonly id: string; readonly status: string } | null {
  if (!Array.isArray(purchaseUnits)) {
    return null;
  }

  for (const purchaseUnit of purchaseUnits) {
    const payments = getObjectProperty(purchaseUnit, "payments");
    const captures = getObjectProperty(payments, "captures");
    if (!Array.isArray(captures)) {
      continue;
    }

    for (const capture of captures) {
      const id = getObjectProperty(capture, "id");
      if (typeof id !== "string" || !id.trim()) {
        continue;
      }
      const status = getObjectProperty(capture, "status");
      return {
        id,
        status: typeof status === "string" ? status : "UNKNOWN",
      };
    }
  }

  return null;
}

function getObjectProperty(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
}

function extractApprovalUrl(links: unknown): string | null {
  if (!Array.isArray(links)) {
    return null;
  }

  const payerActionLink = links.find(
    (link): link is { readonly rel: string; readonly href: string } =>
      typeof link === "object" &&
      link !== null &&
      "rel" in link &&
      "href" in link &&
      (link as { readonly rel?: unknown }).rel === "payer-action" &&
      typeof (link as { readonly href?: unknown }).href === "string",
  );

  return payerActionLink?.href ?? null;
}

function sanitizeJsonCompatible(value: unknown): PayPalSnapshotJson {
  if (value === null) {
    return null;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeJsonCompatible);
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [
        key,
        sanitizeJsonCompatible(entryValue),
      ]),
    );
  }
  return null;
}

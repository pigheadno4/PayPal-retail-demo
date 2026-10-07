import type {
  PayPalCaptureEvidence,
  PayPalEnvironment,
  PayPalGateway,
  PayPalOrderPayload,
  PayPalTransmissionHeaders,
  SavedWalletFundingEvidence,
} from "./gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";

function throwForProviderResponse(response: Response): never {
  if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
    throw new PayPalDefinitiveError();
  }
  throw new Error("paypal_unavailable");
}

type MutationEndpoint = "create_order" | "capture_order";

const definitiveMutationIssues: Readonly<Record<MutationEndpoint, ReadonlySet<string>>> = Object.freeze({
  create_order: new Set(["INSTRUMENT_DECLINED"]),
  capture_order: new Set(["INSTRUMENT_DECLINED"]),
});

async function throwForMutationResponse(response: Response, endpoint: MutationEndpoint): Promise<never> {
  let body: JsonRecord | null = null;
  try {
    body = record(await response.json());
  } catch {
    throw new Error("paypal_unavailable");
  }
  const issues = array(body?.details)
    .map((detail) => nonEmptyString(record(detail)?.issue))
    .filter((issue): issue is string => issue !== undefined);
  if (issues.length > 0 && issues.every((issue) => definitiveMutationIssues[endpoint].has(issue))) {
    throw new PayPalDefinitiveError();
  }
  throw new Error("paypal_unavailable");
}

type JsonRecord = Record<string, unknown>;

export function projectSavedWalletFundingEvidence(raw:unknown, orderId:string, reference:string):SavedWalletFundingEvidence {
  const body=record(raw);const units=array(body?.purchase_units);
  if(!body||body.id!==orderId||body.status!=="COMPLETED"||units.length!==1)throw new Error("invalid_funding_evidence");
  const unit=record(units[0]);const captures=array(record(unit?.payments)?.captures);
  const capture=record(captures[0]);const amount=record(capture?.amount);
  const captureId=nonEmptyString(capture?.id);const capturedAt=nonEmptyString(capture?.create_time);
  const merchant=nonEmptyString(record(unit?.payee)?.merchant_id)??nonEmptyString(record(capture?.payee)?.merchant_id);
  const gross=cents(amount?.value);
  if(captures.length!==1||!capture||capture.status!=="COMPLETED"||!captureId||!capturedAt||!Number.isFinite(Date.parse(capturedAt))
    ||(capture.update_time!==undefined&&capture.update_time!==capturedAt)||!merchant||gross===null||amount?.currency_code!=="USD"
    ||unit?.reference_id!==reference||unit.custom_id!==reference)throw new Error("invalid_funding_evidence");
  return {orderId,captureId,captureStatus:"COMPLETED",amount:{currency:"USD",cents:gross},payeeMerchantId:merchant,capturedAt:new Date(capturedAt).toISOString(),operationReference:reference};
}

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as JsonRecord : null;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function cents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+\.\d{2}$/.test(value)) return null;
  const [whole, fractional] = value.split(".");
  const parsed = Number(whole) * 100 + Number(fractional);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function projectPayPalCaptureEvidence(raw: unknown, storedOrderId: string): PayPalCaptureEvidence {
  const body = record(raw);
  if (!body || body.id !== storedOrderId) throw new Error("invalid_capture_evidence");

  const candidates = array(body.purchase_units).flatMap((unitValue) => {
    const unit = record(unitValue);
    const captures = array(record(unit?.payments)?.captures);
    return captures.map((captureValue) => ({ unit, capture: record(captureValue) }));
  });
  if (candidates.length !== 1 || !candidates[0]?.capture) throw new Error("invalid_capture_evidence");

  const { unit, capture } = candidates[0];
  const amount = record(capture.amount);
  const capturedCents = cents(amount?.value);
  const captureId = nonEmptyString(capture.id);
  const capturedAt = nonEmptyString(capture.update_time) ?? nonEmptyString(capture.create_time);
  const paypal = record(record(body.payment_source)?.paypal);
  const vault = record(record(paypal?.attributes)?.vault);
  const vaultStatus = vault?.status;
  const paypalCustomerId = nonEmptyString(record(vault?.customer)?.id);
  const vaultId = nonEmptyString(vault?.id);
  const payeeMerchantId = nonEmptyString(record(unit?.payee)?.merchant_id)
    ?? nonEmptyString(record(capture.payee)?.merchant_id);

  if (
    !captureId
    || capture.status !== "COMPLETED"
    || amount?.currency_code !== "USD"
    || capturedCents === null
    || !capturedAt
    || !Number.isFinite(Date.parse(capturedAt))
    || (vaultStatus !== "VAULTED" && vaultStatus !== "APPROVED")
  ) throw new Error("invalid_capture_evidence");

  return Object.freeze({
    orderId: storedOrderId,
    captureId,
    captureStatus: "COMPLETED",
    amount: { currency: "USD" as const, cents: capturedCents },
    payeeMerchantId,
    capturedAt: new Date(capturedAt).toISOString(),
    vaultStatus,
    paypalCustomerId,
    vaultId,
  });
}

import { emitCreationDiagnostic, observeCreation, type CreationDiagnosticSink } from "./creation-diagnostics.js";

type HttpGatewayConfig = Readonly<{
  clientId: string;
  clientSecret: string;
  environment: PayPalEnvironment;
  fetch?: typeof globalThis.fetch;
  diagnostic?: CreationDiagnosticSink;
}>;

export class HttpPayPalGateway implements PayPalGateway {
  private readonly request: typeof globalThis.fetch;
  private readonly apiBase: string;

  async createSavedWalletOrder(input:{payload:PayPalOrderPayload;requestId:string;clientMetadataId:string}):Promise<unknown>{
    const signal=AbortSignal.timeout(15_000);const {accessToken}=await this.oauthToken(undefined,undefined,signal);
    const response=await this.request(`${this.apiBase}/v2/checkout/orders`,{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json","PayPal-Request-Id":input.requestId,"PayPal-Client-Metadata-Id":input.clientMetadataId,Prefer:"return=representation"},body:JSON.stringify(input.payload),cache:"no-store",signal});
    if(!response.ok)await throwForMutationResponse(response,"create_order");return response.json();
  }
  async readSavedWalletOrder(orderId:string):Promise<unknown>{
    const signal=AbortSignal.timeout(15_000);const {accessToken}=await this.oauthToken(undefined,undefined,signal);
    const response=await this.request(`${this.apiBase}/v2/checkout/orders/${encodeURIComponent(orderId)}`,{method:"GET",headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store",signal});
    if(!response.ok)throw new Error("paypal_unavailable");return response.json();
  }

  constructor(private readonly config: HttpGatewayConfig) {
    this.request = config.fetch ?? globalThis.fetch;
    this.apiBase = config.environment === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
  }

  private async oauthToken(responseType?: "id_token", targetCustomerId?: string, signal?: AbortSignal) {
    const body = new URLSearchParams({ grant_type: "client_credentials" });
    if (responseType) body.set("response_type", responseType);
    if (targetCustomerId) body.set("target_customer_id", targetCustomerId);
    const response = await this.request(`${this.apiBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      cache: "no-store",
      signal,
    });
    if (!response.ok) throwForProviderResponse(response);
    const result = record(await response.json());
    const accessToken = nonEmptyString(result?.access_token);
    const idToken = nonEmptyString(result?.id_token);
    if (!accessToken || (responseType && !idToken)) throw new Error("paypal_unavailable");
    return { accessToken, idToken };
  }

  async createUserIdToken(input: { merchantCustomerReference: string; targetCustomerId?: string }) {
    if (!input.merchantCustomerReference) throw new Error("paypal_unavailable");
    const result = await this.oauthToken("id_token", input.targetCustomerId);
    return result.idToken!;
  }

  async deletePaymentToken(input: { paymentTokenId: string }): Promise<void> {
    const signal = AbortSignal.timeout(15_000);
    // OAuth and DELETE share one bounded operation; never retry an uncertain deletion.
    let accessToken: string;
    try {
      accessToken = (await this.oauthToken(undefined, undefined, signal)).accessToken;
    } catch {
      throw new Error("paypal_unavailable");
    }
    let response: Response;
    try {
      response = await this.request(`${this.apiBase}/v3/vault/payment-tokens/${encodeURIComponent(input.paymentTokenId)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store", signal,
      });
    } catch {
      throw new Error("paypal_unavailable");
    }
    if (response.status === 204) return;
    if (response.status === 400 || response.status === 403) throw new PayPalDefinitiveError();
    throw new Error("paypal_unavailable");
  }

  async createOrder(input: { payload: PayPalOrderPayload; requestId: string; clientMetadataId: string }) {
    const diagnostic = this.config.diagnostic;
    const { accessToken } = await observeCreation(diagnostic, "oauth", () => this.oauthToken(), "transport");
    const response = await observeCreation(diagnostic, "create_request", () => this.request(`${this.apiBase}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.requestId,
        "PayPal-Client-Metadata-Id": input.clientMetadataId,
        Prefer: "return=representation",
      },
      body: JSON.stringify(input.payload),
      cache: "no-store",
    }), "transport");
    emitCreationDiagnostic(diagnostic, { stage: "create_response", outcome: response.ok ? "success" : "failure", category: response.ok ? "none" : "http", httpStatus: response.status });
    if (!response.ok) await throwForMutationResponse(response, "create_order");
    const body = await observeCreation(diagnostic, "json_parse", () => response.json());
    const orderId = await observeCreation(diagnostic, "id_projection", async () => {
      const id = nonEmptyString(record(body)?.id);
      if (!id) throw new Error("paypal_unavailable");
      return id;
    });
    return { orderId };
  }

  async captureOrder(input: { orderId: string; requestId: string }) {
    const { accessToken } = await this.oauthToken();
    const response = await this.request(`${this.apiBase}/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": input.requestId,
        Prefer: "return=representation",
      },
      body: "{}",
      cache: "no-store",
    });
    if (!response.ok) await throwForMutationResponse(response, "capture_order");
    return projectPayPalCaptureEvidence(await response.json(), input.orderId);
  }

  async verifyWebhook(input: { rawBody: string; transmissionHeaders: PayPalTransmissionHeaders; webhookId: string }) {
    const authAlgo = input.transmissionHeaders["paypal-auth-algo"];
    const certUrl = input.transmissionHeaders["paypal-cert-url"];
    const transmissionId = input.transmissionHeaders["paypal-transmission-id"];
    const transmissionSig = input.transmissionHeaders["paypal-transmission-sig"];
    const transmissionTime = input.transmissionHeaders["paypal-transmission-time"];
    if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) return false;

    let webhookEvent: unknown;
    try { webhookEvent = JSON.parse(input.rawBody); } catch { return false; }
    const { accessToken } = await this.oauthToken();
    const response = await this.request(`${this.apiBase}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: input.webhookId,
        webhook_event: webhookEvent,
      }),
      cache: "no-store",
    });
    if (!response.ok) return false;
    return record(await response.json())?.verification_status === "SUCCESS";
  }
}

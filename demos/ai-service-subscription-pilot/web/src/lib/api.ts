import type { CheckoutReview, ReplaceQuoteResponse } from "../../../shared/src/checkout.js";
import type {
  CreateCheckoutIntentResponse,
  DemoOtpResponse,
  DemoSessionResponse,
  RequestOtpRequest,
} from "../../../shared/src/identity.js";
import type {
  CapturePayPalOrderRequest,
  CreatePayPalOrderRequest,
  CreatePayPalOrderResponse,
  PayPalCheckoutStatus,
  PayPalIdTokenResponse,
} from "../../../shared/src/paypal.js";
import type {
  AccountUsageSummary,
  GenerateAnswerOutcome,
  GenerateAnswerRequest,
} from "../../../shared/src/usage.js";

export class ApiRequestError extends Error {
  constructor(readonly status: number, readonly code: string | null = null) {
    super(`request_failed_${status}`);
  }
}

async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const body = await response.json() as unknown;
    if (typeof body !== "object" || body === null || !("error" in body)) return null;
    const error = body.error;
    if (typeof error !== "object" || error === null || !("code" in error)) return null;
    return typeof error.code === "string" ? error.code : null;
  } catch {
    return null;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!response.ok) throw new ApiRequestError(response.status, await readErrorCode(response));
  return response.json() as Promise<T>;
}

function bearer(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export const demoApi = {
  createIntent: () => requestJson<CreateCheckoutIntentResponse>("/api/v1/checkout-intents", {
    method: "POST",
  }),
  createDemoSession: () => requestJson<DemoSessionResponse>("/api/v1/demo-sessions", {
    method: "POST",
  }),
  requestOtp: (body: RequestOtpRequest) => requestJson<{ accepted: true }>(
    "/api/v1/auth/request-otp",
    { method: "POST", body: JSON.stringify(body) },
  ),
  retrieveDemoOtp: () => requestJson<DemoOtpResponse>("/api/v1/demo-sessions/otp"),
  resume: (intentId: string, token: string) => requestJson<CheckoutReview>(
    `/api/v1/checkout-intents/${encodeURIComponent(intentId)}/resume`,
    { method: "POST", headers: bearer(token) },
  ),
  readQuote: (intentId: string, token: string) => requestJson<CheckoutReview>(
    `/api/v1/quotes?intentId=${encodeURIComponent(intentId)}`,
    { headers: bearer(token) },
  ),
  replaceQuote: (intentId: string, currentQuoteId: string, token: string) =>
    requestJson<ReplaceQuoteResponse>("/api/v1/quotes", {
      method: "POST",
      headers: bearer(token),
      body: JSON.stringify({ intentId, currentQuoteId }),
    }),
  paypalIdToken: (intentId: string, quoteId: string, token: string) =>
    requestJson<PayPalIdTokenResponse>("/api/v1/paypal/id-token", {
      method: "POST",
      headers: bearer(token),
      body: JSON.stringify({ intentId, quoteId }),
    }),
  createPayPalOrder: (body: CreatePayPalOrderRequest, token: string) =>
    requestJson<CreatePayPalOrderResponse>("/api/v1/paypal/orders", {
      method: "POST",
      headers: bearer(token),
      body: JSON.stringify(body),
    }),
  capturePayPalOrder: (orderId: string, body: CapturePayPalOrderRequest, token: string) =>
    requestJson<PayPalCheckoutStatus>(`/api/v1/paypal/orders/${encodeURIComponent(orderId)}/capture`, {
      method: "POST",
      headers: bearer(token),
      body: JSON.stringify(body),
    }),
  activateGo: (token: string) => requestJson<AccountUsageSummary>("/api/v1/me/activation", {
    method: "POST",
    headers: bearer(token),
  }),
  readUsageSummary: (token: string) => requestJson<AccountUsageSummary>("/api/v1/me/summary", {
    headers: bearer(token),
  }),
  generateAnswer: (body: GenerateAnswerRequest, token: string) =>
    requestJson<GenerateAnswerOutcome>("/api/v1/usage/generate-answer", {
      method: "POST",
      headers: bearer(token),
      body: JSON.stringify(body),
    }),
};

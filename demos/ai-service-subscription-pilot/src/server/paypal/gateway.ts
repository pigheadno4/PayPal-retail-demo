import type { Money } from "@/contracts/checkout";

export type PayPalEnvironment = "sandbox" | "live";
export type PayPalOrderPayload = Readonly<Record<string, unknown>>;

export type PayPalCaptureEvidence = Readonly<{
  orderId: string;
  captureId: string;
  captureStatus: "COMPLETED";
  amount: Money;
  payeeMerchantId?: string;
  capturedAt: string;
  vaultStatus: "VAULTED" | "APPROVED";
  paypalCustomerId?: string;
  vaultId?: string;
}>;

export type PayPalTransmissionHeaders = Readonly<Record<string, string>>;

export class PayPalDefinitiveError extends Error {
  constructor() { super("paypal_definitive_failure"); }
}

export interface PayPalGateway {
  createUserIdToken(input: Readonly<{
    merchantCustomerReference: string;
    targetCustomerId?: string;
  }>): Promise<string>;
  createOrder(input: Readonly<{
    payload: PayPalOrderPayload;
    requestId: string;
    clientMetadataId: string;
  }>): Promise<{ orderId: string }>;
  captureOrder(input: Readonly<{
    orderId: string;
    requestId: string;
  }>): Promise<PayPalCaptureEvidence>;
  verifyWebhook(input: Readonly<{
    rawBody: string;
    transmissionHeaders: PayPalTransmissionHeaders;
    webhookId: string;
  }>): Promise<boolean>;
}

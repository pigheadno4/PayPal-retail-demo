import type { Money } from "../../../../shared/src/checkout.js";

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

export type SavedWalletFundingEvidence = Readonly<{orderId:string;captureId:string;captureStatus:"COMPLETED";amount:Money;payeeMerchantId:string;capturedAt:string;operationReference:string}>;
export interface SavedWalletGateway {
  createSavedWalletOrder(input:Readonly<{payload:PayPalOrderPayload;requestId:string;clientMetadataId:string}>):Promise<unknown>;
  readSavedWalletOrder(orderId:string):Promise<unknown>;
}

export class PayPalDefinitiveError extends Error {
  constructor() { super("paypal_definitive_failure"); }
}

export interface PayPalGateway {
  deletePaymentToken(input: Readonly<{ paymentTokenId: string }>): Promise<void>;
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

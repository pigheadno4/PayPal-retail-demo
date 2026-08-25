import { z } from "zod";

const uuid = z.uuid();

export const paypalIdTokenRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
}).strict();

export const createPayPalOrderRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
  operationId: uuid,
  clientMetadataId: z.string().min(1).max(32),
}).strict();

export const capturePayPalOrderRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
  operationId: uuid,
}).strict();

export type PayPalIdTokenRequest = Readonly<z.infer<typeof paypalIdTokenRequestSchema>>;
export type CreatePayPalOrderRequest = Readonly<z.infer<typeof createPayPalOrderRequestSchema>>;
export type CapturePayPalOrderRequest = Readonly<z.infer<typeof capturePayPalOrderRequestSchema>>;

export type FraudNetBootstrap = Readonly<{ sourceId: string; sandbox: boolean }>;
export type PayPalIdTokenResponse = Readonly<{ idToken: string; fraudNet: FraudNetBootstrap }>;
export type CreatePayPalOrderResponse = Readonly<
  | { status: "ready"; operationId: string; orderId: string }
  | { status: "in_progress"; operationId: string; retryable: true }
>;
export type PayPalCheckoutStatus = Readonly<{
  operationId: string;
  funding: "pending" | "verified" | "failed";
  reusableReadiness: "pending" | "ready" | "failed";
  customerMessage: string;
}>;

import { z } from "zod";

const uuid = z.uuid();

export const removePayPalWalletRequestSchema = z.object({ confirmed: z.literal(true) }).strict();
export const paypalWalletSchema = z.object({
  methodId: uuid,
  brand: z.literal("PayPal Wallet"),
  lastFour: z.string().regex(/^\d{4}$/).optional(),
  state: z.enum(["ready", "removing", "removed", "rejected", "unknown"]),
  renewalReady: z.boolean(),
  paidThrough: z.iso.datetime(),
}).strict().refine((wallet) => wallet.state === "ready" || !wallet.renewalReady);
export const paypalWalletResponseSchema = z.object({ wallet: paypalWalletSchema.nullable() }).strict();
export type PayPalWallet = Readonly<z.infer<typeof paypalWalletSchema>>;
export type PayPalWalletResponse = Readonly<z.infer<typeof paypalWalletResponseSchema>>;

export const paypalIdTokenRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
}).strict();

export const createPayPalOrderRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
  operationId: uuid,
  clientMetadataId: z.string().length(32).regex(/^[A-Za-z0-9_-]+$/),
}).strict();

export const capturePayPalOrderRequestSchema = z.object({
  intentId: uuid,
  quoteId: uuid,
  operationId: uuid,
}).strict();

export type PayPalIdTokenRequest = Readonly<z.infer<typeof paypalIdTokenRequestSchema>>;
export type CreatePayPalOrderRequest = Readonly<z.infer<typeof createPayPalOrderRequestSchema>>;
export type CapturePayPalOrderRequest = Readonly<z.infer<typeof capturePayPalOrderRequestSchema>>;

export const fraudNetBootstrapSchema = z.object({
  sourceId: z.literal("AI_SERVICE_STUDIO_CHECKOUT"),
  sandbox: z.boolean(),
}).strict();

export const paypalIdTokenResponseSchema = z.object({
  idToken: z.string().min(1),
  fraudNet: fraudNetBootstrapSchema,
}).strict();

export const createPayPalOrderResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("ready"), operationId: uuid, orderId: z.string().min(1) }).strict(),
  z.object({ status: z.literal("in_progress"), operationId: uuid, retryable: z.literal(true) }).strict(),
]);

export const paypalCheckoutStatusSchema = z.object({
  operationId: uuid,
  funding: z.enum(["pending", "verified", "failed"]),
  reusableReadiness: z.enum(["pending", "ready", "failed"]),
  customerMessage: z.string().min(1),
}).strict();

export type FraudNetBootstrap = Readonly<z.infer<typeof fraudNetBootstrapSchema>>;
export type PayPalIdTokenResponse = Readonly<z.infer<typeof paypalIdTokenResponseSchema>>;
export type CreatePayPalOrderResponse = Readonly<z.infer<typeof createPayPalOrderResponseSchema>>;
export type PayPalCheckoutStatus = Readonly<z.infer<typeof paypalCheckoutStatusSchema>>;

export const paypalOperationStatusSchema = z.object({
  operationId: uuid,
  stage: z.enum(["creation_unconfirmed", "order_created", "capture_pending", "funded", "failed"]),
  funding: z.enum(["pending", "verified", "failed"]),
  reusableReadiness: z.enum(["not_requested", "pending", "ready", "failed"]),
  customerMessage: z.string().min(1),
}).strict().refine((status) => {
  if (status.stage === "creation_unconfirmed" || status.stage === "order_created") {
    return status.funding === "pending" && status.reusableReadiness === "not_requested";
  }
  if (status.stage === "capture_pending") return status.funding === "pending" && status.reusableReadiness === "pending";
  if (status.stage === "failed") return status.funding === "failed" && status.reusableReadiness === "failed";
  return status.funding === "verified" && status.reusableReadiness !== "not_requested";
});
export type PayPalOperationStatus = Readonly<z.infer<typeof paypalOperationStatusSchema>>;

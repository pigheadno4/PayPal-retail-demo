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

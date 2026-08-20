import { z } from "zod";

export type CreateCheckoutIntentResponse = Readonly<{
  intentId: string;
  tier: "go";
  cadence: "monthly";
  state: "selected";
}>;

export type RequestOtpRequest =
  | Readonly<{ intentId: string; identityRoute: "persistent"; email: string }>
  | Readonly<{ intentId: string; identityRoute: "temporary" }>;

export type VerifyOtpRequest =
  | Readonly<{ intentId: string; identityRoute: "persistent"; email: string; token: string }>
  | Readonly<{ intentId: string; identityRoute: "temporary"; token: string }>;

export type DemoSessionResponse = Readonly<{ email: string; expiresAt: string }>;
export type DemoOtpResponse = Readonly<{ otp: string; expiresAt: string }>;

const intentId = z.uuid();
const email = z.email();
const token = z.string().regex(/^\d{6}$/);

export const requestOtpSchema = z.discriminatedUnion("identityRoute", [
  z.object({ intentId, identityRoute: z.literal("persistent"), email }).strict(),
  z.object({ intentId, identityRoute: z.literal("temporary") }).strict(),
]);

export const verifyOtpSchema = z.discriminatedUnion("identityRoute", [
  z.object({ intentId, identityRoute: z.literal("persistent"), email, token }).strict(),
  z.object({ intentId, identityRoute: z.literal("temporary"), token }).strict(),
]);

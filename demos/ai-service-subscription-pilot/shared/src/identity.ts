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

export type DemoSessionResponse = Readonly<{ email: string; expiresAt: string }>;
export type DemoOtpResponse = Readonly<{ otp: string; expiresAt: string }>;

const requestOtpSchema = z.discriminatedUnion("identityRoute", [
  z.object({
    intentId: z.uuid(),
    identityRoute: z.literal("persistent"),
    email: z.email(),
  }).strict(),
  z.object({
    intentId: z.uuid(),
    identityRoute: z.literal("temporary"),
  }).strict(),
]);

export function parseRequestOtpRequest(value: unknown): RequestOtpRequest {
  return requestOtpSchema.parse(value);
}

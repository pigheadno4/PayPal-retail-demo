import { z } from "zod";

export type Money = Readonly<{ currency: "USD"; cents: number }>;

export type CheckoutReview = Readonly<{
  intentId: string;
  quoteId: string;
  tier: "go";
  cadence: "monthly";
  base: Money;
  promotion: Money;
  taxableSubtotal: Money;
  taxBasisPoints: 1055;
  tax: Money;
  dueToday: Money;
  expiresAt: string;
  renewsAt: string;
  allowanceResetsAt: string;
  timeZone: "America/Los_Angeles";
  pricingVersion: string;
  taxVersion: string;
}>;

export type ReplaceQuoteRequest = Readonly<{
  intentId: string;
  currentQuoteId: string;
}>;

export type ReplaceQuoteResponse = Readonly<{
  review: CheckoutReview;
  replacementCreated: boolean;
}>;

const replaceQuoteSchema = z.object({
  intentId: z.uuid(),
  currentQuoteId: z.uuid(),
}).strict();

export function parseReplaceQuoteRequest(value: unknown): ReplaceQuoteRequest {
  return replaceQuoteSchema.parse(value);
}

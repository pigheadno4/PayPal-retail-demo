import type { CheckoutReview, ReplaceQuoteResponse } from "@/contracts/checkout";
import { createGoMonthlyQuote, type GoMonthlyQuoteDraft } from "@/server/quote/go-monthly-seattle";

export type StoredQuote = GoMonthlyQuoteDraft & Readonly<{
  internalId: bigint;
  intentInternalId: bigint;
  accountId: bigint;
  intentId: string;
  quoteId: string;
  supersedesInternalId: bigint | null;
}>;

export interface QuoteRepository {
  findOwnedQuote(accountId: bigint, intentId: string, quoteId: string): Promise<StoredQuote | null>;
  findReplacementOf(internalId: bigint): Promise<StoredQuote | null>;
  insertReplacement(current: StoredQuote, draft: GoMonthlyQuoteDraft): Promise<StoredQuote>;
}

export class QuoteNotFoundError extends Error {
  constructor() { super("quote_not_found"); }
}

export class QuoteConflictError extends Error {
  constructor() { super("stale_quote"); }
}

function toReview(quote: StoredQuote): CheckoutReview {
  const money = (cents: number) => ({ currency: "USD" as const, cents });
  return Object.freeze({
    intentId: quote.intentId,
    quoteId: quote.quoteId,
    tier: "go" as const,
    cadence: "monthly" as const,
    base: money(quote.baseCents),
    promotion: money(quote.promotionCents),
    taxableSubtotal: money(quote.taxableSubtotalCents),
    taxBasisPoints: quote.taxBasisPoints,
    tax: money(quote.taxCents),
    dueToday: money(quote.totalCents),
    expiresAt: quote.expiresAt,
    renewsAt: quote.renewsAt,
    allowanceResetsAt: quote.allowanceResetsAt,
    timeZone: quote.timeZone,
    pricingVersion: quote.pricingVersion,
    taxVersion: quote.taxVersion,
  });
}

function requiresReplacement(current: StoredQuote, draft: GoMonthlyQuoteDraft, now: Date): boolean {
  return current.baseCents !== draft.baseCents
    || current.promotionCents !== draft.promotionCents
    || current.taxableSubtotalCents !== draft.taxableSubtotalCents
    || current.pricingVersion !== draft.pricingVersion
    || current.taxBasisPoints !== draft.taxBasisPoints
    || current.taxCents !== draft.taxCents
    || current.totalCents !== draft.totalCents
    || current.taxVersion !== draft.taxVersion
    || current.locationKey !== draft.locationKey
    || current.timeZone !== draft.timeZone
    || Date.parse(current.expiresAt) <= now.getTime();
}

export async function replaceCurrentQuote(input: Readonly<{
  accountId: bigint;
  intentId: string;
  currentQuoteId: string;
  clock: () => Date;
  repository: QuoteRepository;
}>): Promise<ReplaceQuoteResponse> {
  const current = await input.repository.findOwnedQuote(input.accountId, input.intentId, input.currentQuoteId);
  if (!current) throw new QuoteNotFoundError();
  if (await input.repository.findReplacementOf(current.internalId)) throw new QuoteConflictError();

  const now = input.clock();
  const draft = createGoMonthlyQuote(() => now);
  if (!requiresReplacement(current, draft, now)) {
    return { review: toReview(current), replacementCreated: false };
  }

  const replacement = await input.repository.insertReplacement(current, draft);
  return { review: toReview(replacement), replacementCreated: true };
}

export async function requireCurrentQuoteForPayment(input: Readonly<{
  accountId: bigint;
  intentId: string;
  quoteId: string;
  now: Date;
  repository: QuoteRepository;
}>): Promise<CheckoutReview> {
  const current = await input.repository.findOwnedQuote(input.accountId, input.intentId, input.quoteId);
  if (!current) throw new QuoteNotFoundError();
  if (await input.repository.findReplacementOf(current.internalId)) throw new QuoteConflictError();
  if (Date.parse(current.expiresAt) <= input.now.getTime()) throw new QuoteConflictError();
  return toReview(current);
}

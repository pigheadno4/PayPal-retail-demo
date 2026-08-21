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
  replaceOwnedQuoteAtomically(input: Readonly<{
    accountId: bigint;
    intentId: string;
    currentQuoteId: string;
    draft: GoMonthlyQuoteDraft;
    now: Date;
  }>): Promise<
    | Readonly<{ kind: "not_found" }>
    | Readonly<{ kind: "conflict" }>
    | Readonly<{ kind: "current"; quote: StoredQuote }>
    | Readonly<{ kind: "replaced"; quote: StoredQuote }>
  >;
}

export class QuoteNotFoundError extends Error {
  constructor() { super("quote_not_found"); }
}

export class QuoteConflictError extends Error {
  constructor() { super("stale_quote"); }
}

export function toCheckoutReview(quote: StoredQuote): CheckoutReview {
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

export function quoteRequiresReplacement(current: StoredQuote, draft: GoMonthlyQuoteDraft, now: Date): boolean {
  const issuedAt = new Date(current.issuedAt);
  const expectedExpiry = new Date(issuedAt.getTime() + 15 * 60_000);
  const expectedRenewal = new Date(issuedAt);
  expectedRenewal.setUTCMonth(expectedRenewal.getUTCMonth() + 1);
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
    || !Number.isFinite(issuedAt.getTime())
    || current.expiresAt !== expectedExpiry.toISOString()
    || current.renewsAt !== expectedRenewal.toISOString()
    || current.allowanceResetsAt !== expectedRenewal.toISOString()
    || Date.parse(current.expiresAt) <= now.getTime();
}

export async function replaceCurrentQuote(input: Readonly<{
  accountId: bigint;
  intentId: string;
  currentQuoteId: string;
  clock: () => Date;
  repository: QuoteRepository;
}>): Promise<ReplaceQuoteResponse> {
  const now = input.clock();
  const draft = createGoMonthlyQuote(() => now);
  const result = await input.repository.replaceOwnedQuoteAtomically({
    accountId: input.accountId,
    intentId: input.intentId,
    currentQuoteId: input.currentQuoteId,
    draft,
    now,
  });
  if (result.kind === "not_found") throw new QuoteNotFoundError();
  if (result.kind === "conflict") throw new QuoteConflictError();
  return { review: toCheckoutReview(result.quote), replacementCreated: result.kind === "replaced" };
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
  return toCheckoutReview(current);
}

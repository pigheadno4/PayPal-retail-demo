import { describe, expect, it } from "vitest";

import { parseReplaceQuoteRequest } from "@/contracts/checkout";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import {
  QuoteConflictError,
  QuoteNotFoundError,
  replaceCurrentQuote,
  requireCurrentQuoteForPayment,
  type QuoteRepository,
  type StoredQuote,
} from "@/server/quote/service";

const NOW = new Date("2026-07-15T19:00:00.000Z");

function storedQuote(overrides: Partial<StoredQuote> = {}): StoredQuote {
  const draft = createGoMonthlyQuote(() => NOW);
  return {
    internalId: 11n,
    intentInternalId: 7n,
    accountId: 3n,
    intentId: "11111111-1111-4111-8111-111111111111",
    quoteId: "22222222-2222-4222-8222-222222222222",
    supersedesInternalId: null,
    ...draft,
    ...overrides,
  };
}

class MemoryQuoteRepository implements QuoteRepository {
  readonly quotes: StoredQuote[];

  constructor(initial: StoredQuote[]) {
    this.quotes = [...initial];
  }

  async findOwnedQuote(accountId: bigint, intentId: string, quoteId: string) {
    return this.quotes.find(
      (quote) => quote.accountId === accountId && quote.intentId === intentId && quote.quoteId === quoteId,
    ) ?? null;
  }

  async findReplacementOf(internalId: bigint) {
    return this.quotes.find((quote) => quote.supersedesInternalId === internalId) ?? null;
  }

  async insertReplacement(current: StoredQuote, draft: ReturnType<typeof createGoMonthlyQuote>) {
    const replacement: StoredQuote = {
      ...current,
      ...draft,
      internalId: BigInt(20 + this.quotes.length),
      quoteId: `33333333-3333-4333-8333-${String(this.quotes.length).padStart(12, "0")}`,
      supersedesInternalId: current.internalId,
    };
    this.quotes.push(replacement);
    return replacement;
  }
}

describe("TC-0004 exact immutable quote", () => {
  it("calculates the approved Seattle review in integer cents", () => {
    expect(createGoMonthlyQuote(() => NOW)).toEqual({
      baseCents: 1000,
      promotionCents: -500,
      taxableSubtotalCents: 500,
      taxBasisPoints: 1055,
      taxCents: 53,
      totalCents: 553,
      pricingVersion: "go-monthly-intro-v1",
      taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
      issuedAt: "2026-07-15T19:00:00.000Z",
      expiresAt: "2026-07-15T19:15:00.000Z",
      renewsAt: "2026-08-15T19:00:00.000Z",
      allowanceResetsAt: "2026-08-15T19:00:00.000Z",
      timeZone: "America/Los_Angeles",
      locationKey: "us-wa-seattle",
    });
  });

  it("strictly rejects missing and client-supplied commercial fields", () => {
    expect(() => parseReplaceQuoteRequest({ intentId: "x" })).toThrow();
    expect(() => parseReplaceQuoteRequest({
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
      taxBasisPoints: 0,
    })).toThrow();
  });

  it("returns the same unexpired review without inserting", async () => {
    const repository = new MemoryQuoteRepository([storedQuote()]);
    const result = await replaceCurrentQuote({
      accountId: 3n,
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
      clock: () => NOW,
      repository,
    });

    expect(result.replacementCreated).toBe(false);
    expect(result.review.quoteId).toBe("22222222-2222-4222-8222-222222222222");
    expect(repository.quotes).toHaveLength(1);
  });

  it.each([
    ["pricing", { baseCents: 900 }],
    ["tax mapping", { taxVersion: "older-seattle-mapping" }],
    ["effective time", { expiresAt: "2026-07-15T18:59:59.000Z" }],
  ])("creates one linked replacement for changed %s provenance", async (_group, mutation) => {
    const repository = new MemoryQuoteRepository([storedQuote(mutation)]);
    const result = await replaceCurrentQuote({
      accountId: 3n,
      intentId: "11111111-1111-4111-8111-111111111111",
      currentQuoteId: "22222222-2222-4222-8222-222222222222",
      clock: () => NOW,
      repository,
    });

    expect(result.replacementCreated).toBe(true);
    expect(repository.quotes).toHaveLength(2);
    expect(repository.quotes[1]?.supersedesInternalId).toBe(11n);
  });

  it("rejects an already superseded quote without another insert", async () => {
    const original = storedQuote({ expiresAt: "2026-07-15T18:59:59.000Z" });
    const repository = new MemoryQuoteRepository([
      original,
      storedQuote({ internalId: 12n, quoteId: "33333333-3333-4333-8333-333333333333", supersedesInternalId: 11n }),
    ]);

    await expect(replaceCurrentQuote({
      accountId: 3n,
      intentId: original.intentId,
      currentQuoteId: original.quoteId,
      clock: () => NOW,
      repository,
    })).rejects.toBeInstanceOf(QuoteConflictError);
    expect(repository.quotes).toHaveLength(2);
  });

  it("uses one not-found result for unknown, mismatched, and unowned pairs", async () => {
    const repository = new MemoryQuoteRepository([storedQuote()]);
    for (const input of [
      { accountId: 99n, intentId: "11111111-1111-4111-8111-111111111111", currentQuoteId: "22222222-2222-4222-8222-222222222222" },
      { accountId: 3n, intentId: "99999999-9999-4999-8999-999999999999", currentQuoteId: "22222222-2222-4222-8222-222222222222" },
      { accountId: 3n, intentId: "11111111-1111-4111-8111-111111111111", currentQuoteId: "99999999-9999-4999-8999-999999999999" },
    ]) {
      await expect(replaceCurrentQuote({ ...input, clock: () => NOW, repository })).rejects.toBeInstanceOf(QuoteNotFoundError);
    }
  });

  it("rejects superseded quotes at the future payment gate", async () => {
    const original = storedQuote();
    const repository = new MemoryQuoteRepository([
      original,
      storedQuote({ internalId: 12n, quoteId: "33333333-3333-4333-8333-333333333333", supersedesInternalId: 11n }),
    ]);

    await expect(requireCurrentQuoteForPayment({
      accountId: 3n,
      intentId: original.intentId,
      quoteId: original.quoteId,
      now: NOW,
      repository,
    })).rejects.toBeInstanceOf(QuoteConflictError);
  });
});

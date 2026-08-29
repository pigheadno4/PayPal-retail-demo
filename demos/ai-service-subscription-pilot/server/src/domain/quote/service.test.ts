import { describe, expect, it } from "vitest";

import { createGoMonthlyQuote } from "./go-monthly-seattle";
import {
  QuoteConflictError,
  quoteRequiresReplacement,
  replaceCurrentQuote,
  requireCurrentQuoteForPayment,
  type QuoteRepository,
  type StoredQuote,
} from "./service";

const NOW = new Date("2026-07-15T19:00:00.000Z");

function storedQuote(overrides: Partial<StoredQuote> = {}): StoredQuote {
  return {
    internalId: 11n,
    intentInternalId: 7n,
    accountId: 3n,
    intentId: "11111111-1111-4111-8111-111111111111",
    quoteId: "22222222-2222-4222-8222-222222222222",
    supersedesInternalId: null,
    ...createGoMonthlyQuote(() => NOW),
    ...overrides,
  };
}

class MemoryQuoteRepository implements QuoteRepository {
  readonly quotes: StoredQuote[];
  private queue = Promise.resolve();

  constructor(quotes: StoredQuote[]) {
    this.quotes = [...quotes];
  }

  async findOwnedQuote(accountId: bigint, intentId: string, quoteId: string) {
    return this.quotes.find((quote) =>
      quote.accountId === accountId && quote.intentId === intentId && quote.quoteId === quoteId,
    ) ?? null;
  }

  async findReplacementOf(internalId: bigint) {
    return this.quotes.find((quote) => quote.supersedesInternalId === internalId) ?? null;
  }

  async replaceOwnedQuoteAtomically(input: Parameters<QuoteRepository["replaceOwnedQuoteAtomically"]>[0]) {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const current = await this.findOwnedQuote(input.accountId, input.intentId, input.currentQuoteId);
      if (!current) return { kind: "not_found" as const };
      if (await this.findReplacementOf(current.internalId)) return { kind: "conflict" as const };
      if (!quoteRequiresReplacement(current, input.draft, input.now)) {
        return { kind: "current" as const, quote: current };
      }
      const quote: StoredQuote = {
        ...current,
        ...input.draft,
        internalId: 12n,
        quoteId: "33333333-3333-4333-8333-333333333333",
        supersedesInternalId: current.internalId,
      };
      this.quotes.push(quote);
      return { kind: "replaced" as const, quote };
    } finally {
      release();
    }
  }
}

describe("TC-0004 exact immutable quote", () => {
  it("catches any drift from the hand-calculated Seattle fixture", () => {
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

  it("returns one current quote unchanged and exactly one successor after expiry", async () => {
    const currentRepository = new MemoryQuoteRepository([storedQuote()]);
    await expect(replaceCurrentQuote({
      accountId: 3n,
      intentId: storedQuote().intentId,
      currentQuoteId: storedQuote().quoteId,
      clock: () => NOW,
      repository: currentRepository,
    })).resolves.toMatchObject({ replacementCreated: false });
    expect(currentRepository.quotes).toHaveLength(1);

    const stale = storedQuote({ expiresAt: "2026-07-15T18:59:59.000Z" });
    const repository = new MemoryQuoteRepository([stale]);
    const results = await Promise.allSettled([0, 1].map(() => replaceCurrentQuote({
      accountId: 3n,
      intentId: stale.intentId,
      currentQuoteId: stale.quoteId,
      clock: () => NOW,
      repository,
    })));
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected" && result.reason instanceof QuoteConflictError)).toHaveLength(1);
    expect(repository.quotes.filter((quote) => quote.supersedesInternalId === 11n)).toHaveLength(1);
  });

  it("catches a superseded or expired quote reaching the payment boundary", async () => {
    const original = storedQuote();
    const replacement = storedQuote({ internalId: 12n, supersedesInternalId: 11n });
    const repository = new MemoryQuoteRepository([original, replacement]);

    await expect(requireCurrentQuoteForPayment({
      accountId: 3n,
      intentId: original.intentId,
      quoteId: original.quoteId,
      now: NOW,
      repository,
    })).rejects.toBeInstanceOf(QuoteConflictError);
  });
});

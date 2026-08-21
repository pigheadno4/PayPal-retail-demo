import { describe, expect, it } from "vitest";

import { parseReplaceQuoteRequest } from "@/contracts/checkout";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import {
  QuoteConflictError,
  QuoteNotFoundError,
  quoteRequiresReplacement,
  replaceCurrentQuote,
  requireCurrentQuoteForPayment,
  type QuoteRepository,
  type StoredQuote,
} from "@/server/quote/service";
import { mapQuoteRow } from "@/server/quote/repository";

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
  private queue: Promise<void> = Promise.resolve();

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

  async replaceOwnedQuoteAtomically(input: Readonly<{
    accountId: bigint;
    intentId: string;
    currentQuoteId: string;
    draft: ReturnType<typeof createGoMonthlyQuote>;
    now: Date;
  }>) {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      const current = await this.findOwnedQuote(input.accountId, input.intentId, input.currentQuoteId);
      if (!current) return { kind: "not_found" as const };
      if (await this.findReplacementOf(current.internalId)) return { kind: "conflict" as const };
      if (!quoteRequiresReplacement(current, input.draft, input.now)) return { kind: "current" as const, quote: current };
      return { kind: "replaced" as const, quote: await this.insertReplacement(current, input.draft) };
    } finally {
      release();
    }
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
    ["effective time expiry", { expiresAt: "2026-07-15T18:59:59.000Z" }],
    ["effective time issue window", { issuedAt: "2026-07-15T18:59:00.000Z" }],
    ["effective time renewal", { renewsAt: "2026-08-16T19:00:00.000Z" }],
    ["effective time allowance reset", { allowanceResetsAt: "2026-08-16T19:00:00.000Z" }],
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

  it("allows only one successor when replacement requests race", async () => {
    const original = storedQuote({ expiresAt: "2026-07-15T18:59:59.000Z" });
    const repository = new MemoryQuoteRepository([original]);
    const request = () => replaceCurrentQuote({
      accountId: 3n,
      intentId: original.intentId,
      currentQuoteId: original.quoteId,
      clock: () => NOW,
      repository,
    });

    const results = await Promise.allSettled([request(), request()]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected" && result.reason instanceof QuoteConflictError)).toHaveLength(1);
    expect(repository.quotes.filter((quote) => quote.supersedesInternalId === original.internalId)).toHaveLength(1);
  });

  it("maps retained basis points and display-zone provenance from the stored row", () => {
    const quote = mapQuoteRow({
      id: "11", checkout_intent_id: "7", account_id: "3",
      intent_public_id: "11111111-1111-4111-8111-111111111111",
      public_id: "22222222-2222-4222-8222-222222222222", supersedes_quote_id: null,
      base_cents: "1000", promotion_cents: "-500", taxable_subtotal_cents: "500",
      tax_basis_points: 1055, tax_cents: "53", total_cents: "553",
      pricing_version: "go-monthly-intro-v1", tax_version: "us-wa-seattle-digital-ai-q3-2026-v1",
      issued_at: NOW, expires_at: "2026-07-15T19:15:00.000Z",
      renews_at: "2026-08-15T19:00:00.000Z", allowance_resets_at: "2026-08-15T19:00:00.000Z",
      time_zone: "America/Los_Angeles",
    });

    expect(quote.taxBasisPoints).toBe(1055);
    expect(quote.timeZone).toBe("America/Los_Angeles");
    expect(quote.locationKey).toBe("us-wa-seattle");
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

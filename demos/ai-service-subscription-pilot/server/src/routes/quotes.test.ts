import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import {
  QuoteConflictError,
  QuoteNotFoundError,
} from "../domain/quote/service";
import { createQuotesRouter } from "./quotes";

const intentId = "11111111-1111-4111-8111-111111111111";
const quoteId = "22222222-2222-4222-8222-222222222222";
const review = {
  intentId,
  quoteId,
  tier: "go" as const,
  cadence: "monthly" as const,
  base: { currency: "USD" as const, cents: 1000 },
  promotion: { currency: "USD" as const, cents: -500 },
  taxableSubtotal: { currency: "USD" as const, cents: 500 },
  taxBasisPoints: 1055 as const,
  tax: { currency: "USD" as const, cents: 53 },
  dueToday: { currency: "USD" as const, cents: 553 },
  expiresAt: "2026-07-15T19:15:00.000Z",
  renewsAt: "2026-08-15T19:00:00.000Z",
  allowanceResetsAt: "2026-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles" as const,
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

function app(overrides: Record<string, unknown> = {}) {
  const dependencies = {
    verifyToken: vi.fn().mockResolvedValue({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "customer@example.com",
    }),
    readQuote: vi.fn().mockResolvedValue(review),
    replaceQuote: vi.fn().mockResolvedValue({ review, replacementCreated: false }),
    ...overrides,
  };
  const server = express();
  server.use(express.json(), createQuotesRouter(dependencies));
  return { server, dependencies };
}

describe("quote routes", () => {
  it("catches reading or replacing quote state without verified bearer ownership", async () => {
    const { server } = app();
    const read = await request(server).get(`/quotes?intentId=${intentId}`);
    const replace = await request(server).post("/quotes").send({ intentId, currentQuoteId: quoteId });
    expect(read.status).toBe(401);
    expect(replace.status).toBe(401);
  });

  it("returns the exact no-store review and strict replacement result", async () => {
    const { server, dependencies } = app();
    const authorization = "Bearer verified";
    const read = await request(server)
      .get(`/quotes?intentId=${intentId}`)
      .set("Authorization", authorization);
    const replace = await request(server)
      .post("/quotes")
      .set("Authorization", authorization)
      .send({ intentId, currentQuoteId: quoteId });

    expect(read.status).toBe(200);
    expect(read.body.dueToday.cents).toBe(553);
    expect(read.headers["cache-control"]).toBe("private, no-store");
    expect(replace.status).toBe(200);
    expect(replace.body).toEqual({ review, replacementCreated: false });
    expect(dependencies.replaceQuote).toHaveBeenCalledWith(
      { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "customer@example.com" },
      { intentId, currentQuoteId: quoteId },
    );
  });

  it("maps invalid, unowned, and stale input without private details", async () => {
    const authorization = "Bearer verified";
    const invalid = await request(app().server)
      .post("/quotes")
      .set("Authorization", authorization)
      .send({ intentId, currentQuoteId: quoteId, taxBasisPoints: 0 });
    const missing = await request(app({ replaceQuote: vi.fn().mockRejectedValue(new QuoteNotFoundError()) }).server)
      .post("/quotes")
      .set("Authorization", authorization)
      .send({ intentId, currentQuoteId: quoteId });
    const stale = await request(app({ replaceQuote: vi.fn().mockRejectedValue(new QuoteConflictError()) }).server)
      .post("/quotes")
      .set("Authorization", authorization)
      .send({ intentId, currentQuoteId: quoteId });

    expect(invalid.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(stale.status).toBe(409);
  });
});

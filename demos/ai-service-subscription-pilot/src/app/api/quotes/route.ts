import { NextResponse } from "next/server";

import { parseReplaceQuoteRequest } from "@/contracts/checkout";
import { requireCurrentUser } from "@/lib/supabase/server";
import { findAccountIdByAuthUser } from "@/server/checkout/repository";
import { findCurrentOwnedQuote, PostgresQuoteRepository } from "@/server/quote/repository";
import { QuoteConflictError, QuoteNotFoundError, replaceCurrentQuote, requireCurrentQuoteForPayment } from "@/server/quote/service";

const headers = { "Cache-Control": "private, no-store" };

async function accountId() {
  const user = await requireCurrentUser();
  const id = await findAccountIdByAuthUser(user.id);
  if (!id) throw new QuoteNotFoundError();
  return id;
}

export async function GET(request: Request) {
  try {
    const intentId = new URL(request.url).searchParams.get("intentId") ?? "";
    const id = await accountId();
    const current = await findCurrentOwnedQuote(id, intentId);
    if (!current) throw new QuoteNotFoundError();
    const review = await requireCurrentQuoteForPayment({ accountId: id, intentId, quoteId: current.quoteId, now: new Date(), repository: new PostgresQuoteRepository() });
    return NextResponse.json(review, { headers });
  } catch {
    return NextResponse.json({ error: "quote_not_found" }, { status: 404, headers });
  }
}

export async function POST(request: Request) {
  try {
    const input = parseReplaceQuoteRequest(await request.json());
    const result = await replaceCurrentQuote({ accountId: await accountId(), intentId: input.intentId, currentQuoteId: input.currentQuoteId, clock: () => new Date(), repository: new PostgresQuoteRepository() });
    return NextResponse.json(result, { headers });
  } catch (error) {
    if (error instanceof QuoteConflictError) return NextResponse.json({ error: "stale_quote" }, { status: 409, headers });
    if (error instanceof QuoteNotFoundError) return NextResponse.json({ error: "quote_not_found" }, { status: 404, headers });
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
}

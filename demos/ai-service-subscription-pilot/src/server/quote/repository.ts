import { randomUUID } from "node:crypto";

import type { GoMonthlyQuoteDraft } from "@/server/quote/go-monthly-seattle";
import type { QuoteRepository, StoredQuote } from "@/server/quote/service";

async function database() { return (await import("@/server/db/client")).sql; }

type QuoteRow = Record<string, unknown> & {
  id: string | number;
  checkout_intent_id: string | number;
  account_id: string | number;
  intent_public_id: string;
  public_id: string;
  supersedes_quote_id: string | number | null;
  base_cents: string | number;
  promotion_cents: string | number;
  taxable_subtotal_cents: string | number;
  tax_cents: string | number;
  total_cents: string | number;
  pricing_version: string;
  tax_version: string;
  issued_at: string | Date;
  expires_at: string | Date;
  renews_at: string | Date;
  allowance_resets_at: string | Date;
};

function map(row: QuoteRow): StoredQuote {
  return {
    internalId: BigInt(row.id), intentInternalId: BigInt(row.checkout_intent_id), accountId: BigInt(row.account_id),
    intentId: row.intent_public_id, quoteId: row.public_id, supersedesInternalId: row.supersedes_quote_id ? BigInt(row.supersedes_quote_id) : null,
    baseCents: Number(row.base_cents), promotionCents: Number(row.promotion_cents), taxableSubtotalCents: Number(row.taxable_subtotal_cents),
    taxBasisPoints: 1055, taxCents: Number(row.tax_cents), totalCents: Number(row.total_cents), pricingVersion: row.pricing_version,
    taxVersion: row.tax_version, issuedAt: new Date(row.issued_at).toISOString(), expiresAt: new Date(row.expires_at).toISOString(),
    renewsAt: new Date(row.renews_at).toISOString(), allowanceResetsAt: new Date(row.allowance_resets_at).toISOString(),
    timeZone: "America/Los_Angeles", locationKey: "us-wa-seattle",
  };
}

export class PostgresQuoteRepository implements QuoteRepository {
  async findOwnedQuote(accountId: bigint, intentId: string, quoteId: string) {
    const sql = await database();
    const rows = await sql<QuoteRow[]>`
      select q.*, i.public_id as intent_public_id, i.account_id
      from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
      where i.account_id = ${accountId.toString()} and i.public_id = ${intentId} and q.public_id = ${quoteId} limit 1
    `;
    return rows[0] ? map(rows[0]) : null;
  }
  async findReplacementOf(internalId: bigint) {
    const sql = await database();
    const rows = await sql<QuoteRow[]>`
      select q.*, i.public_id as intent_public_id, i.account_id
      from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
      where q.supersedes_quote_id = ${internalId.toString()} limit 1
    `;
    return rows[0] ? map(rows[0]) : null;
  }
  async insertReplacement(current: StoredQuote, draft: GoMonthlyQuoteDraft) {
    const sql = await database();
    const rows = await sql<QuoteRow[]>`
      insert into app_private.quotes
        (public_id, checkout_intent_id, currency, base_cents, promotion_cents, taxable_subtotal_cents, tax_basis_points,
         tax_cents, total_cents, pricing_version, tax_version, issued_at, expires_at, renews_at, allowance_resets_at,
         time_zone, supersedes_quote_id)
      values
        (${randomUUID()}, ${current.intentInternalId.toString()}, 'USD', ${draft.baseCents}, ${draft.promotionCents}, ${draft.taxableSubtotalCents},
         ${draft.taxBasisPoints}, ${draft.taxCents}, ${draft.totalCents}, ${draft.pricingVersion}, ${draft.taxVersion},
         ${new Date(draft.issuedAt)}, ${new Date(draft.expiresAt)}, ${new Date(draft.renewsAt)}, ${new Date(draft.allowanceResetsAt)},
         ${draft.timeZone}, ${current.internalId.toString()})
      returning *, ${current.intentId}::uuid as intent_public_id, ${current.accountId.toString()}::bigint as account_id
    `;
    return map(rows[0]);
  }
}

export async function findCurrentOwnedQuote(accountId: bigint, intentId: string): Promise<StoredQuote | null> {
  const sql = await database();
  const rows = await sql<QuoteRow[]>`
    select q.*, i.public_id as intent_public_id, i.account_id
    from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
    where i.account_id = ${accountId.toString()} and i.public_id = ${intentId}
      and not exists (select 1 from app_private.quotes r where r.supersedes_quote_id = q.id)
    order by q.id desc limit 1
  `;
  return rows[0] ? map(rows[0]) : null;
}

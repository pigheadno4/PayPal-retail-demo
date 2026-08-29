import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "../../db/client.js";
import {
  GO_MONTHLY_SEATTLE_FIXTURE,
  type GoMonthlyQuoteDraft,
} from "./go-monthly-seattle.js";
import {
  quoteRequiresReplacement,
  type QuoteRepository,
  type StoredQuote,
} from "./service.js";

export type QuoteRow = Record<string, unknown> & {
  id: string | number;
  checkout_intent_id: string | number;
  account_id: string | number;
  intent_public_id: string;
  public_id: string;
  supersedes_quote_id: string | number | null;
  base_cents: string | number;
  promotion_cents: string | number;
  taxable_subtotal_cents: string | number;
  tax_basis_points: string | number;
  tax_cents: string | number;
  total_cents: string | number;
  pricing_version: string;
  tax_version: string;
  issued_at: string | Date;
  expires_at: string | Date;
  renews_at: string | Date;
  allowance_resets_at: string | Date;
  time_zone: string;
};

export function mapQuoteRow(row: QuoteRow): StoredQuote {
  return {
    internalId: BigInt(row.id),
    intentInternalId: BigInt(row.checkout_intent_id),
    accountId: BigInt(row.account_id),
    intentId: row.intent_public_id,
    quoteId: row.public_id,
    supersedesInternalId: row.supersedes_quote_id ? BigInt(row.supersedes_quote_id) : null,
    baseCents: Number(row.base_cents),
    promotionCents: Number(row.promotion_cents),
    taxableSubtotalCents: Number(row.taxable_subtotal_cents),
    taxBasisPoints: Number(row.tax_basis_points) as 1055,
    taxCents: Number(row.tax_cents),
    totalCents: Number(row.total_cents),
    pricingVersion: row.pricing_version,
    taxVersion: row.tax_version,
    issuedAt: new Date(row.issued_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    renewsAt: new Date(row.renews_at).toISOString(),
    allowanceResetsAt: new Date(row.allowance_resets_at).toISOString(),
    timeZone: row.time_zone as "America/Los_Angeles",
    locationKey: GO_MONTHLY_SEATTLE_FIXTURE.locationKey,
  };
}

export class PostgresQuoteRepository implements QuoteRepository {
  constructor(private readonly sql: DatabaseClient) {}

  async findOwnedQuote(accountId: bigint, intentId: string, quoteId: string) {
    const rows = await this.sql<QuoteRow[]>`
      select q.*, i.public_id as intent_public_id, i.account_id
      from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
      where i.account_id = ${accountId.toString()} and i.public_id = ${intentId}
        and q.public_id = ${quoteId} limit 1
    `;
    return rows[0] ? mapQuoteRow(rows[0]) : null;
  }

  async findReplacementOf(internalId: bigint) {
    const rows = await this.sql<QuoteRow[]>`
      select q.*, i.public_id as intent_public_id, i.account_id
      from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
      where q.supersedes_quote_id = ${internalId.toString()} limit 1
    `;
    return rows[0] ? mapQuoteRow(rows[0]) : null;
  }

  async findCurrentOwnedQuote(accountId: bigint, intentId: string): Promise<StoredQuote | null> {
    const rows = await this.sql<QuoteRow[]>`
      select q.*, i.public_id as intent_public_id, i.account_id
      from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
      where i.account_id = ${accountId.toString()} and i.public_id = ${intentId}
        and not exists (select 1 from app_private.quotes r where r.supersedes_quote_id = q.id)
      order by q.id desc limit 1
    `;
    return rows[0] ? mapQuoteRow(rows[0]) : null;
  }

  async replaceOwnedQuoteAtomically(input: Readonly<{
    accountId: bigint;
    intentId: string;
    currentQuoteId: string;
    draft: GoMonthlyQuoteDraft;
    now: Date;
  }>) {
    return this.sql.begin(async (tx) => {
      const currentRows = await tx<QuoteRow[]>`
        select q.*, i.public_id as intent_public_id, i.account_id
        from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
        where i.account_id = ${input.accountId.toString()} and i.public_id = ${input.intentId}
          and q.public_id = ${input.currentQuoteId}
        limit 1 for update of q
      `;
      if (!currentRows[0]) return { kind: "not_found" as const };
      const current = mapQuoteRow(currentRows[0]);
      const successors = await tx<{ id: string }[]>`
        select id from app_private.quotes where supersedes_quote_id = ${current.internalId.toString()} limit 1
      `;
      if (successors.length) return { kind: "conflict" as const };
      if (!quoteRequiresReplacement(current, input.draft, input.now)) {
        return { kind: "current" as const, quote: current };
      }
      const rows = await tx<QuoteRow[]>`
        insert into app_private.quotes
          (public_id, checkout_intent_id, currency, base_cents, promotion_cents,
           taxable_subtotal_cents, tax_basis_points, tax_cents, total_cents,
           pricing_version, tax_version, issued_at, expires_at, renews_at,
           allowance_resets_at, time_zone, supersedes_quote_id)
        values
          (${randomUUID()}, ${current.intentInternalId.toString()}, 'USD', ${input.draft.baseCents},
           ${input.draft.promotionCents}, ${input.draft.taxableSubtotalCents},
           ${input.draft.taxBasisPoints}, ${input.draft.taxCents}, ${input.draft.totalCents},
           ${input.draft.pricingVersion}, ${input.draft.taxVersion}, ${new Date(input.draft.issuedAt)},
           ${new Date(input.draft.expiresAt)}, ${new Date(input.draft.renewsAt)},
           ${new Date(input.draft.allowanceResetsAt)}, ${input.draft.timeZone},
           ${current.internalId.toString()})
        returning *, ${current.intentId}::uuid as intent_public_id,
                  ${current.accountId.toString()}::bigint as account_id
      `;
      return { kind: "replaced" as const, quote: mapQuoteRow(rows[0]!) };
    });
  }
}

import { randomBytes, randomUUID } from "node:crypto";

import type { DatabaseClient } from "../../db/client.js";
import type {
  DemoSessionRecord,
  DemoSessionRepository,
} from "../auth/send-email-hook.js";
import type { GoMonthlyQuoteDraft } from "../quote/go-monthly-seattle.js";
import { mapQuoteRow, type QuoteRow } from "../quote/repository.js";

type DemoSessionRow = {
  public_id: string;
  token_hash: string;
  test_alias: string | null;
  expires_at: string | Date;
  otp_ciphertext: string | null;
  otp_expires_at: string | Date | null;
  consumed_at: string | Date | null;
};

function mapDemoSession(row: DemoSessionRow): DemoSessionRecord {
  return {
    publicId: row.public_id,
    tokenHash: row.token_hash,
    testAlias: row.test_alias,
    expiresAt: new Date(row.expires_at),
    otpCiphertext: row.otp_ciphertext,
    otpExpiresAt: row.otp_expires_at ? new Date(row.otp_expires_at) : null,
    consumedAt: row.consumed_at ? new Date(row.consumed_at) : null,
  };
}

export class PostgresCheckoutRepository implements DemoSessionRepository {
  constructor(private readonly sql: DatabaseClient) {}

  async insertPendingIntent(sessionTokenHash: string, now: Date): Promise<string> {
    const publicId = randomUUID();
    const rows = await this.sql<{ public_id: string }[]>`
      insert into app_private.checkout_intents
        (public_id, anonymous_session_token_hash, tier, cadence, state, expires_at, created_at, updated_at)
      values
        (${publicId}, ${Buffer.from(sessionTokenHash, "hex")}, 'go', 'monthly', 'selected',
         ${new Date(now.getTime() + 24 * 60 * 60_000)}, ${now}, ${now})
      returning public_id
    `;
    return rows[0]!.public_id;
  }

  async intentBelongsToSession(intentId: string, tokenHash: string, now: Date): Promise<boolean> {
    const rows = await this.sql<{ present: boolean }[]>`
      select exists(
        select 1 from app_private.checkout_intents
        where public_id = ${intentId}
          and anonymous_session_token_hash = ${Buffer.from(tokenHash, "hex")}
          and account_id is null
          and state = 'selected'
          and expires_at > ${now}
      ) as present
    `;
    return rows[0]?.present === true;
  }

  async findByPublicId(publicId: string): Promise<DemoSessionRecord | null> {
    const rows = await this.sql<DemoSessionRow[]>`
      select public_id, encode(token_hash, 'hex') as token_hash, test_alias, expires_at,
             otp_ciphertext, otp_expires_at, consumed_at
      from app_private.demo_sessions where public_id = ${publicId} limit 1
    `;
    return rows[0] ? mapDemoSession(rows[0]) : null;
  }

  async findByAlias(alias: string): Promise<DemoSessionRecord | null> {
    const rows = await this.sql<DemoSessionRow[]>`
      select public_id, encode(token_hash, 'hex') as token_hash, test_alias, expires_at,
             otp_ciphertext, otp_expires_at, consumed_at
      from app_private.demo_sessions where test_alias = ${alias} limit 1
    `;
    return rows[0] ? mapDemoSession(rows[0]) : null;
  }

  async storeOtp(publicId: string, ciphertext: string, expiresAt: Date): Promise<boolean> {
    const rows = await this.sql<{ public_id: string }[]>`
      update app_private.demo_sessions
      set otp_ciphertext = ${ciphertext},
          otp_expires_at = least(${expiresAt}, created_at + interval '5 minutes')
      where public_id = ${publicId} and consumed_at is null and expires_at > now()
      returning public_id
    `;
    return rows.length === 1;
  }

  async clearOtp(publicId: string, consumedAt?: Date): Promise<void> {
    await this.sql`
      update app_private.demo_sessions
      set otp_ciphertext = null,
          otp_expires_at = null,
          consumed_at = coalesce(${consumedAt ?? null}, consumed_at)
      where public_id = ${publicId}
    `;
  }

  async createOrReadTemporarySession(input: Readonly<{
    publicId: string;
    tokenHash: string;
    expiresAt: Date;
  }>): Promise<{ email: string; expiresAt: string }> {
    const alias = `demo-${randomBytes(16).toString("hex")}@test`;
    const rows = await this.sql<{ test_alias: string; expires_at: Date }[]>`
      insert into app_private.demo_sessions (public_id, token_hash, test_alias, expires_at)
      values (${input.publicId}, ${Buffer.from(input.tokenHash, "hex")}, ${alias}, ${input.expiresAt})
      on conflict (public_id) do update set public_id = excluded.public_id
      returning test_alias, expires_at
    `;
    return {
      email: rows[0]!.test_alias,
      expiresAt: new Date(rows[0]!.expires_at).toISOString(),
    };
  }

  async getTemporaryAlias(publicId: string): Promise<string | null> {
    return (await this.findByPublicId(publicId))?.testAlias ?? null;
  }

  async bindVerifiedIdentityAndQuote(input: Readonly<{
    authUserId: string;
    identityKind: "persistent" | "temporary";
    temporaryExpiresAt: Date | null;
    intentId: string;
    sessionTokenHash: string;
    demoSessionPublicId: string;
    quote: GoMonthlyQuoteDraft;
  }>) {
    return this.sql.begin(async (tx) => {
      const accounts = await tx<{ id: string }[]>`
        insert into app_private.accounts
          (public_id, auth_user_id, identity_kind, temporary_demo_expires_at)
        values
          (${randomUUID()}, ${input.authUserId}, ${input.identityKind}, ${input.temporaryExpiresAt})
        on conflict (auth_user_id) do update set updated_at = now()
        returning id
      `;
      const accountId = BigInt(accounts[0]!.id);
      const intents = await tx<{ id: string; public_id: string }[]>`
        select id, public_id from app_private.checkout_intents
        where public_id = ${input.intentId}
          and anonymous_session_token_hash = ${Buffer.from(input.sessionTokenHash, "hex")}
          and (account_id is null or account_id = ${accountId.toString()})
        order by id for update
      `;
      const intent = intents[0];
      if (!intent) throw new Error("intent_not_found");
      await tx`
        update app_private.checkout_intents
        set account_id = ${accountId.toString()}, state = 'identity_verified', updated_at = now()
        where id = ${intent.id}
      `;
      let quoteRows = await tx<QuoteRow[]>`
        select q.*, i.public_id as intent_public_id, i.account_id
        from app_private.quotes q join app_private.checkout_intents i on i.id = q.checkout_intent_id
        where q.checkout_intent_id = ${intent.id}
        order by q.id desc limit 1
      `;
      if (!quoteRows[0]) {
        quoteRows = await tx<QuoteRow[]>`
          insert into app_private.quotes
            (public_id, checkout_intent_id, currency, base_cents, promotion_cents,
             taxable_subtotal_cents, tax_basis_points, tax_cents, total_cents,
             pricing_version, tax_version, issued_at, expires_at, renews_at,
             allowance_resets_at, time_zone)
          values
            (${randomUUID()}, ${intent.id}, 'USD', ${input.quote.baseCents},
             ${input.quote.promotionCents}, ${input.quote.taxableSubtotalCents},
             ${input.quote.taxBasisPoints}, ${input.quote.taxCents}, ${input.quote.totalCents},
             ${input.quote.pricingVersion}, ${input.quote.taxVersion},
             ${new Date(input.quote.issuedAt)}, ${new Date(input.quote.expiresAt)},
             ${new Date(input.quote.renewsAt)}, ${new Date(input.quote.allowanceResetsAt)},
             ${input.quote.timeZone})
          returning *, ${intent.public_id}::uuid as intent_public_id,
                    ${accountId.toString()}::bigint as account_id
        `;
      }
      if (input.identityKind === "temporary") {
        await tx`
          update app_private.demo_sessions
          set otp_ciphertext = null, otp_expires_at = null, consumed_at = now()
          where public_id = ${input.demoSessionPublicId}
            and token_hash = ${Buffer.from(input.sessionTokenHash, "hex")}
            and test_alias is not null
            and consumed_at is null
        `;
      }
      return { accountId, quote: mapQuoteRow(quoteRows[0]!) };
    });
  }

  async findAccountIdByAuthUser(authUserId: string): Promise<bigint | null> {
    const rows = await this.sql<{ id: string }[]>`
      select id from app_private.accounts where auth_user_id = ${authUserId} limit 1
    `;
    return rows[0] ? BigInt(rows[0].id) : null;
  }
}

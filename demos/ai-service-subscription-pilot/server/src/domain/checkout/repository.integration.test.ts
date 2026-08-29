import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createDatabaseClient, type DatabaseClient } from "../../db/client.js";
import { createPendingGoMonthlyIntent } from "./service.js";
import { PostgresCheckoutRepository } from "./repository.js";
import { createGoMonthlyQuote } from "../quote/go-monthly-seattle.js";
import { PostgresQuoteRepository } from "../quote/repository.js";

const databaseUrl = process.env.DATABASE_URL;

type Counts = Record<
  | "checkout_intents"
  | "accounts"
  | "demo_sessions"
  | "quotes"
  | "payment_operations"
  | "billing_arrangements"
  | "allowance_windows",
  number
>;

async function counts(sql: DatabaseClient): Promise<Counts> {
  const rows = await sql<{ table_name: keyof Counts; count: number }[]>`
    select 'checkout_intents' as table_name, count(*)::int as count from app_private.checkout_intents
    union all select 'accounts', count(*)::int from app_private.accounts
    union all select 'demo_sessions', count(*)::int from app_private.demo_sessions
    union all select 'quotes', count(*)::int from app_private.quotes
    union all select 'payment_operations', count(*)::int from app_private.payment_operations
    union all select 'billing_arrangements', count(*)::int from app_private.billing_arrangements
    union all select 'allowance_windows', count(*)::int from app_private.allowance_windows
  `;
  return Object.fromEntries(rows.map((row) => [row.table_name, row.count])) as Counts;
}

function delta(after: Counts, before: Counts): Counts {
  return Object.fromEntries(
    Object.keys(before).map((key) => [key, after[key as keyof Counts] - before[key as keyof Counts]]),
  ) as Counts;
}

describe.skipIf(!databaseUrl)("TASK-0007 Express repository on actual Postgres", () => {
  it("keeps selection side-effect-free, resumes idempotently, isolates OTP state, and creates one successor", async () => {
    const sql = createDatabaseClient(databaseUrl!);
    const checkoutRepository = new PostgresCheckoutRepository(sql);
    const quoteRepository = new PostgresQuoteRepository(sql);
    const authUserId = randomUUID();
    const demoSessionPublicId = randomUUID();
    const now = new Date();
    let intentId = "";
    let accountId: bigint | null = null;
    const before = await counts(sql);

    try {
      const selected = await createPendingGoMonthlyIntent({
        signingSecret: "task-0007-test-signing-secret-at-least-32-characters",
        insertPendingIntent: (tokenHash, selectedAt) =>
          checkoutRepository.insertPendingIntent(tokenHash, selectedAt),
        now,
      });
      intentId = selected.response.intentId;
      expect(delta(await counts(sql), before)).toEqual({
        checkout_intents: 1,
        accounts: 0,
        demo_sessions: 0,
        quotes: 0,
        payment_operations: 0,
        billing_arrangements: 0,
        allowance_windows: 0,
      });

      const proof = {
        publicId: demoSessionPublicId,
        tokenHash: "ab".repeat(32),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60_000),
      };
      const temporary = await checkoutRepository.createOrReadTemporarySession(proof);
      expect(temporary.email).toMatch(/^demo-[a-f0-9]{32}@test$/);
      await expect(checkoutRepository.storeOtp(
        demoSessionPublicId,
        "encrypted-only",
        new Date(now.getTime() + 5 * 60_000),
      )).resolves.toBe(true);
      expect((await checkoutRepository.findByAlias(temporary.email))?.otpCiphertext).toBe("encrypted-only");
      await checkoutRepository.clearOtp(demoSessionPublicId, new Date());
      expect(await checkoutRepository.findByAlias(temporary.email)).toMatchObject({
        otpCiphertext: null,
        otpExpiresAt: null,
      });

      await sql`insert into auth.users (id) values (${authUserId})`;
      const bindInput = {
        authUserId,
        identityKind: "persistent" as const,
        temporaryExpiresAt: null,
        intentId,
        sessionTokenHash: selected.cookieValue.split(".")[0]!,
        demoSessionPublicId,
        quote: createGoMonthlyQuote(() => now),
      };
      // The signed-cookie token is not exposed by the service result; obtain only its stored hash.
      const storedHash = await sql<{ hash: string }[]>`
        select encode(anonymous_session_token_hash, 'hex') as hash
        from app_private.checkout_intents where public_id = ${intentId}
      `;
      const first = await checkoutRepository.bindVerifiedIdentityAndQuote({
        ...bindInput,
        sessionTokenHash: storedHash[0]!.hash,
      });
      accountId = first.accountId;
      const retry = await checkoutRepository.bindVerifiedIdentityAndQuote({
        ...bindInput,
        sessionTokenHash: storedHash[0]!.hash,
      });
      expect(retry.accountId).toBe(first.accountId);
      expect(retry.quote.quoteId).toBe(first.quote.quoteId);

      const replacementAt = new Date(now.getTime() + 16 * 60_000);
      const replacementInput = {
        accountId: first.accountId,
        intentId,
        currentQuoteId: first.quote.quoteId,
        draft: createGoMonthlyQuote(() => replacementAt),
        now: replacementAt,
      };
      const [left, right] = await Promise.all([
        quoteRepository.replaceOwnedQuoteAtomically(replacementInput),
        quoteRepository.replaceOwnedQuoteAtomically(replacementInput),
      ]);
      expect([left.kind, right.kind].sort()).toEqual(["conflict", "replaced"]);
      const successorCount = await sql<{ count: number }[]>`
        select count(*)::int as count from app_private.quotes
        where supersedes_quote_id = ${first.quote.internalId.toString()}
      `;
      expect(successorCount[0]?.count).toBe(1);
      expect(delta(await counts(sql), before)).toEqual({
        checkout_intents: 1,
        accounts: 1,
        demo_sessions: 1,
        quotes: 2,
        payment_operations: 0,
        billing_arrangements: 0,
        allowance_windows: 0,
      });
    } finally {
      if (intentId) {
        await sql.begin(async (tx) => {
          await tx`delete from app_private.quotes where checkout_intent_id in (
            select id from app_private.checkout_intents where public_id = ${intentId}
          )`;
          await tx`delete from app_private.checkout_intents where public_id = ${intentId}`;
          if (accountId) await tx`delete from app_private.accounts where id = ${accountId.toString()}`;
          await tx`delete from app_private.demo_sessions where public_id = ${demoSessionPublicId}`;
          await tx`delete from auth.users where id = ${authUserId}`;
        });
      }
      expect(await counts(sql)).toEqual(before);
      await sql.end();
    }
  }, 60_000);
});

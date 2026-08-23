import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import { bindVerifiedIdentityAndQuote, insertPendingIntent } from "@/server/checkout/repository";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import { PostgresQuoteRepository } from "@/server/quote/repository";

const databaseUrl = process.env.DATABASE_URL;
const NOW = new Date("2026-07-15T19:00:00.000Z");

type Counts = Record<"checkout_intents" | "accounts" | "quotes" | "payment_operations" | "billing_arrangements" | "allowance_windows", number>;

async function counts(sql: ReturnType<typeof postgres>): Promise<Counts> {
  const rows = await sql<{ table_name: keyof Counts; count: number }[]>`
    select 'checkout_intents' as table_name, count(*)::int as count from app_private.checkout_intents
    union all select 'accounts', count(*)::int from app_private.accounts
    union all select 'quotes', count(*)::int from app_private.quotes
    union all select 'payment_operations', count(*)::int from app_private.payment_operations
    union all select 'billing_arrangements', count(*)::int from app_private.billing_arrangements
    union all select 'allowance_windows', count(*)::int from app_private.allowance_windows
  `;
  return Object.fromEntries(rows.map((row) => [row.table_name, row.count])) as Counts;
}

describe.skipIf(!databaseUrl)("TASK-0002 production Postgres repository", () => {
  it("proves intent-only selection, canonical bind retry, and exactly one racing successor", async () => {
    const runtimeFixture = {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      NEXT_PUBLIC_PAYPAL_CLIENT_ID: "paypal-client-id", SUPABASE_SECRET_KEY: "sb_secret_example",
      SUPABASE_SEND_EMAIL_HOOK_SECRET: "v1,whsec_example", DEMO_SESSION_SIGNING_SECRET: "a-demo-session-secret-with-32-characters",
      PAYPAL_CLIENT_SECRET: "paypal-client-secret", PAYPAL_WEBHOOK_ID: "paypal-webhook-id", PAYPAL_ENVIRONMENT: "sandbox",
      RESEND_API_KEY: "re_example", EMAIL_FROM_ADDRESS: "AI Service Demo <demo@example.test>", APP_URL: "http://127.0.0.1:3000",
    };
    Object.entries(runtimeFixture).forEach(([name, value]) => vi.stubEnv(name, value));
    const fixtureSql = postgres(databaseUrl!, { max: 2, prepare: false });
    const authUserId = randomUUID();
    const sessionHash = randomUUID().replaceAll("-", "").padEnd(64, "0");
    let intentId = "";
    const before = await counts(fixtureSql);

    try {
      intentId = await insertPendingIntent(sessionHash, NOW);
      const afterSelection = await counts(fixtureSql);
      expect(Object.fromEntries(Object.keys(before).map((key) => [key, afterSelection[key as keyof Counts] - before[key as keyof Counts]]))).toEqual({
        checkout_intents: 1,
        accounts: 0,
        quotes: 0,
        payment_operations: 0,
        billing_arrangements: 0,
        allowance_windows: 0,
      });

      await fixtureSql`insert into auth.users (id) values (${authUserId})`;
      const bindInput = {
        authUserId,
        identityKind: "persistent" as const,
        temporaryExpiresAt: null,
        intentId,
        sessionTokenHash: sessionHash,
        demoSessionPublicId: randomUUID(),
        quote: createGoMonthlyQuote(() => NOW),
      };
      const first = await bindVerifiedIdentityAndQuote(bindInput);
      const retry = await bindVerifiedIdentityAndQuote(bindInput);
      expect(retry.accountId).toBe(first.accountId);
      expect(retry.quote.quoteId).toBe(first.quote.quoteId);

      const replacementNow = new Date(NOW.getTime() + 16 * 60_000);
      const replacementInput = {
        accountId: first.accountId,
        intentId,
        currentQuoteId: first.quote.quoteId,
        draft: createGoMonthlyQuote(() => replacementNow),
        now: replacementNow,
      };
      const [left, right] = await Promise.all([
        new PostgresQuoteRepository().replaceOwnedQuoteAtomically(replacementInput),
        new PostgresQuoteRepository().replaceOwnedQuoteAtomically(replacementInput),
      ]);
      expect([left.kind, right.kind].sort()).toEqual(["conflict", "replaced"]);
      const successors = await fixtureSql<{ count: number }[]>`
        select count(*)::int as count from app_private.quotes
        where supersedes_quote_id = ${first.quote.internalId.toString()}
      `;
      expect(successors[0]?.count).toBe(1);
    } finally {
      if (intentId) {
        await fixtureSql.begin(async (tx) => {
          await tx`delete from app_private.quotes where checkout_intent_id in (select id from app_private.checkout_intents where public_id = ${intentId})`;
          await tx`delete from app_private.checkout_intents where public_id = ${intentId}`;
          await tx`delete from app_private.accounts where auth_user_id = ${authUserId}`;
          await tx`delete from auth.users where id = ${authUserId}`;
        });
      }
      const afterCleanup = await counts(fixtureSql);
      await fixtureSql.end();
      const { sql: repositorySql } = await import("@/server/db/client");
      await repositorySql.end();
      expect(afterCleanup).toEqual(before);
    }
  }, 30_000);
});

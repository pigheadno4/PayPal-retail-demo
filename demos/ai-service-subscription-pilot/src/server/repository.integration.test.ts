import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import { bindVerifiedIdentityAndQuote, insertPendingIntent } from "@/server/checkout/repository";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import { PostgresQuoteRepository } from "@/server/quote/repository";
import { PostgresPayPalRepository } from "@/server/paypal/service";

const databaseUrl = process.env.DATABASE_URL;
const NOW = new Date("2026-07-15T19:00:00.000Z");

type Counts = Record<"checkout_intents" | "accounts" | "quotes" | "payment_operations" | "billing_arrangements" | "allowance_windows", number>;
type PaymentCounts = Counts & Record<"provider_customers" | "provider_events" | "payment_methods" | "usage_operations", number>;

async function paymentCounts(sql: ReturnType<typeof postgres>): Promise<PaymentCounts> {
  const rows = await sql<{ table_name: keyof PaymentCounts; count: number }[]>`
    select 'checkout_intents' as table_name, count(*)::int as count from app_private.checkout_intents
    union all select 'accounts', count(*)::int from app_private.accounts
    union all select 'quotes', count(*)::int from app_private.quotes
    union all select 'payment_operations', count(*)::int from app_private.payment_operations
    union all select 'provider_customers', count(*)::int from app_private.provider_customers
    union all select 'provider_events', count(*)::int from app_private.provider_events
    union all select 'payment_methods', count(*)::int from app_private.payment_methods
    union all select 'billing_arrangements', count(*)::int from app_private.billing_arrangements
    union all select 'allowance_windows', count(*)::int from app_private.allowance_windows
    union all select 'usage_operations', count(*)::int from app_private.usage_operations
  `;
  return Object.fromEntries(rows.map((row) => [row.table_name, row.count])) as PaymentCounts;
}

const runtimeFixture = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: "paypal-client-id", SUPABASE_SECRET_KEY: "sb_secret_example",
  SUPABASE_SEND_EMAIL_HOOK_SECRET: "v1,whsec_example", DEMO_SESSION_SIGNING_SECRET: "a-demo-session-secret-with-32-characters",
  PAYPAL_CLIENT_SECRET: "paypal-client-secret", PAYPAL_MERCHANT_ID: "MERCHANT123", PAYPAL_WEBHOOK_ID: "paypal-webhook-id", PAYPAL_ENVIRONMENT: "sandbox",
  RESEND_API_KEY: "re_example", EMAIL_FROM_ADDRESS: "AI Service Demo <demo@example.test>", APP_URL: "http://127.0.0.1:3000",
};

describe.skipIf(!databaseUrl)("TASK-0003 production PayPal repository", () => {
  it("persists funded arrangements, separates vault readiness, rejects duplicate pending correlation, and grants zero units", async () => {
    Object.entries(runtimeFixture).forEach(([name, value]) => vi.stubEnv(name, value));
    const fixtureSql = postgres(databaseUrl!, { max: 2, prepare: false });
    const authUserId = randomUUID();
    const sessionHash = randomUUID().replaceAll("-", "").padEnd(64, "0");
    let intentId = "";
    const before = await paymentCounts(fixtureSql);
    try {
      intentId = await insertPendingIntent(sessionHash, NOW);
      await fixtureSql`insert into auth.users (id) values (${authUserId})`;
      const bound = await bindVerifiedIdentityAndQuote({ authUserId, identityKind: "persistent", temporaryExpiresAt: null, intentId, sessionTokenHash: sessionHash, demoSessionPublicId: randomUUID(), quote: createGoMonthlyQuote(() => NOW) });
      const repository = new PostgresPayPalRepository();

      async function fund(vaultStatus: "VAULTED" | "APPROVED", suffix: string) {
        const operationId = randomUUID();
        const orderId = `ORDER-${suffix}`;
        const create = await repository.claimCreateOperation({ accountId: bound.accountId, intentId, quoteId: bound.quote.quoteId, operationId, merchantId: "MERCHANT123", environment: "sandbox" });
        expect(create.kind).toBe("owner");
        if (create.kind !== "owner") throw new Error("unexpected claim");
        await repository.storeCreatedOrder(operationId, orderId);
        const capture = await repository.claimCaptureOperation({ accountId: bound.accountId, intentId, quoteId: bound.quote.quoteId, operationId, orderId, merchantId: "MERCHANT123", environment: "sandbox" });
        expect(capture.kind).toBe("owner");
        if (capture.kind !== "owner") throw new Error("unexpected capture claim");
        return repository.applyCaptureEvidence(capture.operation, {
          orderId, captureId: `CAPTURE-${suffix}`, captureStatus: "COMPLETED", amount: { currency: "USD", cents: 553 },
          payeeMerchantId: "MERCHANT123", capturedAt: new Date(NOW.getTime() + 60_000).toISOString(), vaultStatus,
          paypalCustomerId: "CUSTOMER-REDACTED", ...(vaultStatus === "VAULTED" ? { vaultId: "VAULT-REDACTED" } : {}),
        });
      }

      expect(await fund("VAULTED", "ONE")).toMatchObject({ funding: "verified", reusableReadiness: "ready" });
      expect(await fund("APPROVED", "TWO")).toMatchObject({ funding: "verified", reusableReadiness: "pending" });
      await expect(fund("APPROVED", "THREE")).rejects.toThrow();

      const state = await fixtureSql<{ arrangements: number; methods: number; allowances: number; usage: number }[]>`
        select
          (select count(*)::int from app_private.billing_arrangements b where b.account_id = ${bound.accountId.toString()}) as arrangements,
          (select count(*)::int from app_private.payment_methods m join app_private.provider_customers c on c.id = m.provider_customer_id where c.account_id = ${bound.accountId.toString()}) as methods,
          (select count(*)::int from app_private.allowance_windows a join app_private.billing_arrangements b on b.id = a.billing_arrangement_id where b.account_id = ${bound.accountId.toString()}) as allowances,
          (select count(*)::int from app_private.usage_operations u join app_private.allowance_windows a on a.id = u.allowance_window_id join app_private.billing_arrangements b on b.id = a.billing_arrangement_id where b.account_id = ${bound.accountId.toString()}) as usage
      `;
      expect(state[0]).toEqual({ arrangements: 2, methods: 1, allowances: 0, usage: 0 });
    } finally {
      if (intentId) await fixtureSql.begin(async (tx) => {
        const accountRows = await tx<{ id: string }[]>`select id from app_private.accounts where auth_user_id = ${authUserId}`;
        const accountId = accountRows[0]?.id;
        if (accountId) {
          await tx`delete from app_private.provider_events where payment_operation_id in (select id from app_private.payment_operations where account_id = ${accountId})`;
          await tx`delete from app_private.billing_arrangements where account_id = ${accountId}`;
          await tx`delete from app_private.payment_methods where provider_customer_id in (select id from app_private.provider_customers where account_id = ${accountId})`;
          await tx`delete from app_private.provider_customers where account_id = ${accountId}`;
          await tx`delete from app_private.payment_operations where account_id = ${accountId}`;
          await tx`delete from app_private.quotes where checkout_intent_id in (select id from app_private.checkout_intents where public_id = ${intentId})`;
          await tx`delete from app_private.checkout_intents where public_id = ${intentId}`;
          await tx`delete from app_private.accounts where id = ${accountId}`;
        }
        await tx`delete from auth.users where id = ${authUserId}`;
      });
      expect(await paymentCounts(fixtureSql)).toEqual(before);
      await fixtureSql.end();
    }
  }, 120_000);
});

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

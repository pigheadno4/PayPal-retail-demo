import { randomUUID } from "node:crypto";

import postgres from "postgres";
import { describe, expect, it, vi } from "vitest";

import { bindVerifiedIdentityAndQuote, insertPendingIntent } from "@/server/checkout/repository";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import { PostgresQuoteRepository } from "@/server/quote/repository";
import { FakePayPalGateway } from "@/server/paypal/fake-gateway";
import { PostgresPayPalRepository } from "@/server/paypal/service";
import { PostgresPayPalWebhookRepository, reconcilePayPalWebhook } from "@/server/paypal/webhook";

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
  it("owns one payment per intent and durably reconciles every webhook disposition without granting units", async () => {
    Object.entries(runtimeFixture).forEach(([name, value]) => vi.stubEnv(name, value));
    const fixtureSql = postgres(databaseUrl!, { max: 4, prepare: false });
    const authUserId = randomUUID();
    const intentIds: string[] = [];
    const eventIds: string[] = [];
    const before = await paymentCounts(fixtureSql);
    try {
      const sessionHash = randomUUID().replaceAll("-", "").padEnd(64, "0");
      const intentId = await insertPendingIntent(sessionHash, NOW);
      intentIds.push(intentId);
      await fixtureSql`insert into auth.users (id) values (${authUserId})`;
      const bound = await bindVerifiedIdentityAndQuote({ authUserId, identityKind: "persistent", temporaryExpiresAt: null, intentId, sessionTokenHash: sessionHash, demoSessionPublicId: randomUUID(), quote: createGoMonthlyQuote(() => NOW) });
      const repository = new PostgresPayPalRepository();

      const firstOperationIds = [randomUUID(), randomUUID()];
      const firstClaims = await Promise.all(firstOperationIds.map((operationId) => repository.claimCreateOperation({
        accountId: bound.accountId,
        intentId,
        quoteId: bound.quote.quoteId,
        operationId,
        merchantId: "MERCHANT123",
        environment: "sandbox",
      })));
      expect(firstClaims.map((claim) => claim.kind).sort()).toEqual(["in_progress", "owner"]);
      const firstOwner = firstClaims.find((claim) => claim.kind === "owner");
      const firstFollower = firstClaims.find((claim) => claim.kind === "in_progress");
      if (!firstOwner || firstOwner.kind !== "owner" || !firstFollower) throw new Error("unexpected create claims");
      expect(firstFollower.operation.operationId).toBe(firstOwner.operation.operationId);

      const firstOrderId = "ORDER-TASK0003-FIRST";
      await repository.storeCreatedOrder(firstOwner.operation.operationId, firstOrderId);
      const reentry = await repository.claimCreateOperation({
        accountId: bound.accountId,
        intentId,
        quoteId: bound.quote.quoteId,
        operationId: randomUUID(),
        merchantId: "MERCHANT123",
        environment: "sandbox",
      });
      expect(reentry).toMatchObject({ kind: "ready", operation: { operationId: firstOwner.operation.operationId }, orderId: firstOrderId });
      const firstCapture = await repository.claimCaptureOperation({
        accountId: bound.accountId,
        intentId,
        quoteId: bound.quote.quoteId,
        operationId: firstOwner.operation.operationId,
        orderId: firstOrderId,
        merchantId: "MERCHANT123",
        environment: "sandbox",
      });
      if (firstCapture.kind !== "owner") throw new Error("unexpected first capture claim");
      expect(await repository.applyCaptureEvidence(firstCapture.operation, {
        orderId: firstOrderId,
        captureId: "CAPTURE-TASK0003-FIRST",
        captureStatus: "COMPLETED",
        amount: { currency: "USD", cents: 553 },
        payeeMerchantId: "MERCHANT123",
        capturedAt: new Date(NOW.getTime() + 60_000).toISOString(),
        vaultStatus: "APPROVED",
        paypalCustomerId: "CUSTOMER-TASK0003-SHARED",
      })).toMatchObject({ funding: "verified", reusableReadiness: "pending" });
      await expect(repository.claimCreateOperation({
        accountId: bound.accountId,
        intentId,
        quoteId: bound.quote.quoteId,
        operationId: randomUUID(),
        merchantId: "MERCHANT123",
        environment: "sandbox",
      })).resolves.toMatchObject({ kind: "failed", operation: { operationId: firstOwner.operation.operationId } });

      const webhookRepository = new PostgresPayPalWebhookRepository();
      const webhookDependencies = (signatureValid: boolean) => ({
        repository: webhookRepository,
        gateway: new FakePayPalGateway({ webhookVerified: signatureValid }),
        merchantId: "MERCHANT123",
        environment: "sandbox" as const,
        webhookId: "WEBHOOK-REDACTED",
        clock: () => new Date(NOW.getTime() + 120_000),
      });
      const event = (id: string, customerId: string, vaultId: string, eventType = "VAULT.PAYMENT-TOKEN.CREATED") => JSON.stringify({
        id,
        event_type: eventType,
        create_time: new Date(NOW.getTime() + 120_000).toISOString(),
        resource: { id: vaultId, customer: { id: customerId } },
      });
      const invalidId = `TASK0003-INVALID-${randomUUID()}`;
      const malformedId = `TASK0003-MALFORMED-${randomUUID()}`;
      const unmatchedId = `TASK0003-UNMATCHED-${randomUUID()}`;
      eventIds.push(invalidId, malformedId, unmatchedId);
      await expect(reconcilePayPalWebhook(event(invalidId, "CUSTOMER-UNKNOWN", "VAULT-INVALID"), {}, webhookDependencies(false))).resolves.toEqual({ accepted: false, disposition: "rejected" });
      await expect(reconcilePayPalWebhook(event(malformedId, "CUSTOMER-TASK0003-SHARED", "VAULT-MALFORMED", "CHECKOUT.ORDER.APPROVED"), {}, webhookDependencies(true))).resolves.toEqual({ accepted: true, disposition: "rejected" });
      await expect(reconcilePayPalWebhook(event(unmatchedId, "CUSTOMER-UNKNOWN", "VAULT-UNMATCHED"), {}, webhookDependencies(true))).resolves.toEqual({ accepted: true, disposition: "unmatched" });

      const ambiguousId = `TASK0003-AMBIGUOUS-${randomUUID()}`;
      eventIds.push(ambiguousId);
      await webhookRepository.recordDisposition({
        eventId: ambiguousId,
        eventType: "VAULT.PAYMENT-TOKEN.CREATED",
        rawPayload: JSON.parse(event(ambiguousId, "CUSTOMER-TASK0003-SHARED", "VAULT-AMBIGUOUS")),
        signatureValid: true,
        disposition: "ambiguous",
        merchantId: "MERCHANT123",
        environment: "sandbox",
      });

      const matchedId = `TASK0003-MATCHED-${randomUUID()}`;
      eventIds.push(matchedId);
      const matchedBody = event(matchedId, "CUSTOMER-TASK0003-SHARED", "VAULT-TASK0003-MATCHED");
      await expect(reconcilePayPalWebhook(matchedBody, {}, webhookDependencies(true))).resolves.toEqual({ accepted: true, disposition: "matched" });
      await expect(reconcilePayPalWebhook(matchedBody, {}, webhookDependencies(true))).resolves.toEqual({ accepted: true, disposition: "duplicate" });

      const dispositions = await fixtureSql<{ provider_event_id: string; correlation_result: string; signature_valid: boolean; complete_timestamps: boolean }[]>`
        select provider_event_id, correlation_result, signature_valid,
               (received_at is not null and processed_at is not null) as complete_timestamps
        from app_private.provider_events where provider_event_id = any(${eventIds})
      `;
      expect(dispositions.map((row) => ({ ...row })).sort((left, right) => left.provider_event_id.localeCompare(right.provider_event_id))).toEqual([
        { provider_event_id: ambiguousId, correlation_result: "ambiguous", signature_valid: true, complete_timestamps: true },
        { provider_event_id: invalidId, correlation_result: "rejected", signature_valid: false, complete_timestamps: true },
        { provider_event_id: malformedId, correlation_result: "rejected", signature_valid: true, complete_timestamps: true },
        { provider_event_id: matchedId, correlation_result: "matched", signature_valid: true, complete_timestamps: true },
        { provider_event_id: unmatchedId, correlation_result: "unmatched", signature_valid: true, complete_timestamps: true },
      ].sort((left, right) => left.provider_event_id.localeCompare(right.provider_event_id)));

      const state = await fixtureSql<{ first_operations: number; first_arrangements: number; matched_events: number; first_readiness: string; allowances: number; usage: number }[]>`
        select
          (select count(*)::int from app_private.payment_operations o join app_private.checkout_intents i on i.id = o.checkout_intent_id where i.public_id = ${intentId}) as first_operations,
          (select count(*)::int from app_private.billing_arrangements b join app_private.checkout_intents i on i.id = b.checkout_intent_id where i.public_id = ${intentId}) as first_arrangements,
          (select count(*)::int from app_private.provider_events where provider_event_id = ${matchedId}) as matched_events,
          (select b.reusable_readiness from app_private.billing_arrangements b join app_private.checkout_intents i on i.id = b.checkout_intent_id where i.public_id = ${intentId}) as first_readiness,
          (select count(*)::int from app_private.allowance_windows a join app_private.billing_arrangements b on b.id = a.billing_arrangement_id where b.account_id = ${bound.accountId.toString()}) as allowances,
          (select count(*)::int from app_private.usage_operations u join app_private.allowance_windows a on a.id = u.allowance_window_id join app_private.billing_arrangements b on b.id = a.billing_arrangement_id where b.account_id = ${bound.accountId.toString()}) as usage
      `;
      expect(state[0]).toEqual({ first_operations: 1, first_arrangements: 1, matched_events: 1, first_readiness: "ready", allowances: 0, usage: 0 });
    } finally {
      if (intentIds.length) await fixtureSql.begin(async (tx) => {
        const accountRows = await tx<{ id: string }[]>`select id from app_private.accounts where auth_user_id = ${authUserId}`;
        const accountId = accountRows[0]?.id;
        if (eventIds.length) await tx`delete from app_private.provider_events where provider_event_id = any(${eventIds})`;
        if (accountId) {
          await tx`delete from app_private.provider_events where payment_operation_id in (select id from app_private.payment_operations where account_id = ${accountId})`;
          await tx`delete from app_private.billing_arrangements where account_id = ${accountId}`;
          await tx`delete from app_private.payment_methods where provider_customer_id in (select id from app_private.provider_customers where account_id = ${accountId})`;
          await tx`delete from app_private.provider_customers where account_id = ${accountId}`;
          await tx`delete from app_private.payment_operations where account_id = ${accountId}`;
          await tx`delete from app_private.quotes where checkout_intent_id in (select id from app_private.checkout_intents where public_id = any(${intentIds}))`;
          await tx`delete from app_private.checkout_intents where public_id = any(${intentIds})`;
          await tx`delete from app_private.accounts where id = ${accountId}`;
        }
        await tx`delete from auth.users where id = ${authUserId}`;
      });
      expect(await paymentCounts(fixtureSql)).toEqual(before);
      await fixtureSql.end();
    }
  }, 180_000);
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

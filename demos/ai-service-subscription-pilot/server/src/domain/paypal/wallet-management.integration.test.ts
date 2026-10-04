import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { PostgresCheckoutRepository } from "../checkout/repository.js";
import { createGoMonthlyQuote } from "../quote/go-monthly-seattle.js";
import { PostgresUsageRepository } from "../usage/repository.js";
import { FakePayPalGateway } from "./fake-gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";
import { PostgresPayPalRepository, type PayPalOperationRecord } from "./service.js";
import { PostgresPayPalWebhookRepository } from "./webhook.js";
import { PostgresPayPalWalletRepository, removePayPalWallet } from "./wallet-management.js";

// This write-test suite refuses non-loopback DBs, regardless of shell/.env configuration.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && !["127.0.0.1", "localhost", "[::1]"].includes(new URL(databaseUrl).hostname)) throw new Error("TASK0010_requires_disposable_local_database");

async function fixture() {
  const sql = postgres(databaseUrl!, { max: 5, prepare: false });
  const suffix = randomUUID();
  const now = new Date();
  const authUserId = randomUUID();
  const customerId = `fixture-customer-${suffix}`;
  const vaultId = `fixture-vault-${suffix}`;
  const merchantId = `fixture-merchant-${suffix}`;
  const checkout = new PostgresCheckoutRepository(sql);
  const capture = new PostgresPayPalRepository(sql);
  const wallets = new PostgresPayPalWalletRepository(sql);
  await sql`insert into auth.users(id) values (${authUserId})`;
  let accountId = 0n;
  async function newOperation() {
    const hash = randomUUID().replaceAll("-", "").padEnd(64, "0");
    const intentId = await checkout.insertPendingIntent(hash, now);
    const bound = await checkout.bindVerifiedIdentityAndQuote({ authUserId, identityKind: "persistent", temporaryExpiresAt: null, intentId, sessionTokenHash: hash, demoSessionPublicId: randomUUID(), quote: createGoMonthlyQuote(() => now) });
    accountId = bound.accountId;
    const operationId = randomUUID();
    const orderId = `fixture-order-${randomUUID()}`;
    const input = { accountId, intentId, quoteId: bound.quote.quoteId, operationId, merchantId, environment: "sandbox" as const };
    await capture.claimCreateOperation(input);
    await capture.storeCreatedOrder(operationId, orderId);
    const claim = await capture.claimCaptureOperation({ ...input, orderId });
    if (claim.kind !== "owner") throw new Error("fixture_claim_failure");
    return claim.operation;
  }
  function evidence(operation: PayPalOperationRecord, vaulted = true) {
    return { orderId: operation.orderId!, captureId: `fixture-capture-${randomUUID()}`, captureStatus: "COMPLETED" as const, amount: { currency: "USD" as const, cents: 553 }, payeeMerchantId: merchantId, capturedAt: now.toISOString(), vaultStatus: vaulted ? "VAULTED" as const : "APPROVED" as const, paypalCustomerId: customerId, ...(vaulted ? { vaultId } : {}) };
  }
  const operation = await newOperation();
  await capture.applyCaptureEvidence(operation, evidence(operation));
  const scope = { accountId, merchantId, environment: "sandbox" as const };
  const usage = new PostgresUsageRepository(sql);
  await usage.activate(authUserId, now);
  const wallet = (await wallets.readOwnedWallet(scope))!;
  async function invariant() {
    const rows = await sql`
      select b.funding_status, b.entitlement_status, b.renewal_at, b.allowance_resets_at, b.payment_method_id,
        (select jsonb_agg(to_jsonb(w) order by w.id) from app_private.allowance_windows w where w.billing_arrangement_id=b.id) as allowance,
        (select count(*)::int from app_private.provider_customers c where c.account_id=b.account_id) as customers,
        (select count(*)::int from app_private.provider_events e join app_private.payment_operations o on o.id=e.payment_operation_id where o.account_id=b.account_id) as events
      from app_private.billing_arrangements b where b.account_id=${accountId.toString()} order by b.id
    `;
    return rows.map((row) => ({ ...row }));
  }
  async function cleanup() {
    await sql.begin(async (tx) => {
      await tx`delete from app_private.usage_operations where account_id=${accountId.toString()}`;
      await tx`delete from app_private.allowance_windows where billing_arrangement_id in (select id from app_private.billing_arrangements where account_id=${accountId.toString()})`;
      await tx`delete from app_private.provider_events where merchant_id=${merchantId}`;
      await tx`delete from app_private.billing_arrangements where account_id=${accountId.toString()}`;
      await tx`delete from app_private.payment_methods where merchant_id=${merchantId}`;
      await tx`delete from app_private.provider_customers where account_id=${accountId.toString()}`;
      await tx`delete from app_private.payment_operations where account_id=${accountId.toString()}`;
      await tx`delete from app_private.quotes where checkout_intent_id in (select id from app_private.checkout_intents where account_id=${accountId.toString()})`;
      await tx`delete from app_private.checkout_intents where account_id=${accountId.toString()}`;
      await tx`delete from app_private.accounts where id=${accountId.toString()}`;
      await tx`delete from auth.users where id=${authUserId}`;
    });
    await sql.end();
  }
  return { sql, scope, wallets, wallet, invariant, cleanup, newOperation, evidence, capture, customerId, vaultId, usage, authUserId, now };
}

describe.skipIf(!databaseUrl)("TASK-0010 real-schema wallet removal", () => {
  it.each(["removed", "rejected", "unknown"] as const)("commits one claim before provider call, preserves paid rights and persists %s", async (outcome) => {
    const f = await fixture();
    try {
      const before = await f.invariant();
      let calls = 0;
      const gateway = { deletePaymentToken: async () => {
        calls += 1;
        // Separate pooled connection observes the COMMITTED claim, not an uncommitted transaction.
        expect(await f.wallets.readOwnedWallet(f.scope)).toMatchObject({ state: "removing", renewalReady: false });
        const rows = await f.sql`select readiness, is_primary from app_private.payment_methods where public_id=${f.wallet.methodId}`;
        expect(rows[0]).toMatchObject({ readiness: "failed", is_primary: false });
        if (outcome === "rejected") throw new PayPalDefinitiveError();
        if (outcome === "unknown") throw new Error("fixture_transport_failure");
      } };
      const results = await Promise.all([1, 2].map(() => removePayPalWallet(f.scope, f.wallet.methodId, { repository: f.wallets, gateway })));
      expect(calls).toBe(1);
      expect(results.some((wallet) => wallet.state === outcome)).toBe(true);
      expect(await f.wallets.readOwnedWallet(f.scope)).toMatchObject({ state: outcome, renewalReady: false });
      await removePayPalWallet(f.scope, f.wallet.methodId, { repository: f.wallets, gateway });
      expect(calls).toBe(1);
      expect(await f.invariant()).toEqual(before);
      expect(await f.usage.readSummary(f.authUserId, f.now)).toMatchObject({ allowance: { granted: 100, available: 100 } });
      await expect(f.sql`update app_private.payment_methods set readiness='ready', is_primary=true where public_id=${f.wallet.methodId}`).rejects.toMatchObject({ code: "23514" });
    } finally { await f.cleanup(); }
  });
  it("denies cross-account, merchant, environment and unknown methods before provider calls", async () => {
    const f = await fixture();
    try {
      const gateway = new FakePayPalGateway();
      for (const scope of [{ ...f.scope, accountId: f.scope.accountId + 1000n }, { ...f.scope, merchantId: "other" }, { ...f.scope, environment: "live" as const }]) {
        expect(await f.wallets.readOwnedWallet(scope)).toBeNull();
        await expect(removePayPalWallet(scope, f.wallet.methodId, { repository: f.wallets, gateway })).rejects.toThrow("payment_not_found");
      }
      await expect(removePayPalWallet(f.scope, randomUUID(), { repository: f.wallets, gateway })).rejects.toThrow("payment_not_found");
      expect(gateway.deleteInputs).toEqual([]);
      expect(await f.wallets.readOwnedWallet(f.scope)).toMatchObject({ state: "ready", renewalReady: true });
    } finally { await f.cleanup(); }
  });
  it("retains an interrupted claim and never repeats cleanup", async () => {
    const f = await fixture();
    try {
      await f.wallets.claimRemoval(f.scope, f.wallet.methodId);
      const gateway = new FakePayPalGateway();
      expect(await removePayPalWallet(f.scope, f.wallet.methodId, { repository: f.wallets, gateway })).toMatchObject({ state: "removing" });
      expect(gateway.deleteInputs).toEqual([]);
    } finally { await f.cleanup(); }
  });
  it.each(["removing", "removed", "rejected", "unknown"] as const)("late capture cannot revive %s token but retains new funding evidence", async (state) => {
    const f = await fixture();
    try {
      const claim = await f.wallets.claimRemoval(f.scope, f.wallet.methodId);
      if (claim.kind !== "owner") throw new Error("fixture_claim_failure");
      if (state !== "removing") await f.wallets.finishRemoval(claim, state);
      const operation = await f.newOperation();
      const captured = await f.capture.applyCaptureEvidence(operation, f.evidence(operation));
      expect(captured).toMatchObject({ funding: "verified", reusableReadiness: "failed" });
      expect(await f.wallets.readOwnedWallet(f.scope)).toMatchObject({ state, renewalReady: false });
      expect(await f.sql`select funding_status from app_private.payment_operations where public_id=${operation.operationId}`).toMatchObject([{ funding_status: "completed" }]);
    } finally { await f.cleanup(); }
  });
  it.each(["removing", "removed", "rejected", "unknown"] as const)("late vault-created promotion cannot revive %s token", async (state) => {
    const f = await fixture();
    try {
      const claim = await f.wallets.claimRemoval(f.scope, f.wallet.methodId);
      if (claim.kind !== "owner") throw new Error("fixture_claim_failure");
      if (state !== "removing") await f.wallets.finishRemoval(claim, state);
      const operation = await f.newOperation();
      await f.capture.applyCaptureEvidence(operation, f.evidence(operation, false));
      const repository = new PostgresPayPalWebhookRepository(f.sql);
      const result = await repository.promoteReadiness({ eventId: `fixture-event-${randomUUID()}`, vaultId: f.vaultId, customerId: f.customerId, merchantId: f.scope.merchantId, environment: "sandbox", operation: { operationInternalId: operation.internalId, operationId: operation.operationId }, occurredAt: f.now.toISOString(), rawPayload: {} });
      expect(result).toBe("rejected");
      expect(await f.wallets.readOwnedWallet(f.scope)).toMatchObject({ state, renewalReady: false });
    } finally { await f.cleanup(); }
  });
});

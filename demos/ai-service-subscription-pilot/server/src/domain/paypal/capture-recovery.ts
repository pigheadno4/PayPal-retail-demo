import type { CheckoutReview } from "../../../../shared/src/checkout.js";
import type { DatabaseClient } from "../../db/client.js";
import { PostgresQuoteRepository } from "../quote/repository.js";
import { toCheckoutReview } from "../quote/service.js";
import type { PayPalCaptureEvidence } from "./gateway.js";
import { projectPayPalCaptureEvidence } from "./http-gateway.js";
import { assertCaptureMatches, mapOperation, PostgresPayPalRepository, type PayPalOperationRecord } from "./service.js";
export type CaptureRecoveryContext = { purpose: string; operation: PayPalOperationRecord; review: CheckoutReview };
export type RecoveryTarget = Readonly<{ operationId: string; checkoutId: string; apply?: boolean }>;
export type RecoveryDependencies = Readonly<{
  merchantId: string; environment: string;
  readContext(input: RecoveryTarget): Promise<CaptureRecoveryContext>;
  readCapturedOrder(orderId: string): Promise<unknown>;
  inspectEvidence(context: CaptureRecoveryContext, evidence: PayPalCaptureEvidence): Promise<"pending" | "complete">;
  apply(context: CaptureRecoveryContext, evidence: PayPalCaptureEvidence): Promise<unknown>;
}>;
export function validRecoveryUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function fail(): never { throw new Error("recovery_blocked"); }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
function one(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1) return fail();
  return object(value[0]);
}
function assertContext(ctx: CaptureRecoveryContext, input: RecoveryTarget, merchantId: string) {
  const op = ctx.operation;
  if (ctx.purpose !== "initial" || op.operationId !== input.operationId || op.intentId !== input.checkoutId
    || ctx.review.intentId !== op.intentId || ctx.review.quoteId !== op.quoteId || op.environment !== "sandbox"
    || op.merchantId !== merchantId || !op.orderId || op.accountId <= 0n
    || !["approved", "completed"].includes(op.fundingStatus)) fail();
}
function checkedEvidence(raw: unknown, ctx: CaptureRecoveryContext) {
  const body = object(raw); const unit = one(body.purchase_units); const payments = object(unit.payments); const capture = one(payments.captures);
  const unitPayee = unit.payee === undefined ? undefined : object(unit.payee).merchant_id;
  const capturePayee = capture.payee === undefined ? undefined : object(capture.payee).merchant_id;
  const amount = object(unit.amount);
  if (body.intent !== "CAPTURE" || body.status !== "COMPLETED" || unit.reference_id !== ctx.operation.quoteId
    || capture.final_capture !== true || (payments.refunds !== undefined && (!Array.isArray(payments.refunds) || payments.refunds.length !== 0))
    || (unitPayee !== undefined && unitPayee !== ctx.operation.merchantId)
    || (capturePayee !== undefined && capturePayee !== ctx.operation.merchantId)
    || (unitPayee === undefined && capturePayee === undefined)
    || amount.currency_code !== "USD" || amount.value !== (ctx.review.dueToday.cents / 100).toFixed(2)
    || typeof capture.create_time !== "string" || !Number.isFinite(Date.parse(capture.create_time))
    || (capture.update_time !== undefined && (typeof capture.update_time !== "string" || Date.parse(capture.update_time) !== Date.parse(capture.create_time)))) fail();
  const evidence = projectPayPalCaptureEvidence(raw, ctx.operation.orderId!);
  assertCaptureMatches(evidence, ctx.operation, ctx.review);
  if (evidence.vaultStatus !== "VAULTED" || !evidence.vaultId || !evidence.paypalCustomerId
    || evidence.payeeMerchantId !== ctx.operation.merchantId) fail();
  return evidence;
}

/** Historical reconciliation only: never calls create/capture, refreshes quotes or grants access. */
export async function recoverCapturedPayment(input: RecoveryTarget, deps: RecoveryDependencies) {
  const base = { operationId: input.operationId, mode: input.apply ? "apply" as const : "dry_run" as const };
  try {
    if (!validRecoveryUuid(input.operationId) || !validRecoveryUuid(input.checkoutId) || deps.environment !== "sandbox" || !deps.merchantId) fail();
    const ctx = await deps.readContext(input); assertContext(ctx, input, deps.merchantId);
    const evidence = checkedEvidence(await deps.readCapturedOrder(ctx.operation.orderId!), ctx);
    let code: "eligible" | "already_recovered" | "applied" = "eligible";
    const state = await deps.inspectEvidence(ctx, evidence);
    if (ctx.operation.fundingStatus === "completed" && state !== "complete") fail();
    if (state === "complete") code = "already_recovered";
    else if (input.apply) {
      try { await deps.apply(ctx, evidence); code = "applied"; }
      catch (error) {
        if (!(error instanceof Error) || error.message !== "payment_state_conflict") throw error;
        const fresh = await deps.readContext(input); assertContext(fresh, input, deps.merchantId);
        if (await deps.inspectEvidence(fresh, evidence) !== "complete") fail();
        code = "already_recovered";
      }
    }
    return Object.freeze({ ...base, code, amount: evidence.amount, fundingEligible: true, vaultEligible: true });
  } catch { return Object.freeze({ ...base, code: "recovery_blocked" as const, fundingEligible: false, vaultEligible: false }); }
}

async function loadContext(sql: DatabaseClient, target: RecoveryTarget, lock = false): Promise<CaptureRecoveryContext> {
  type Row = Parameters<typeof mapOperation>[0] & { purpose: string; removal_state: string | null };
  // Selecting the removal columns is intentional: missing schema fails before any provider call/write.
  const query = sql<Row[]>`
    select o.*, i.public_id as intent_public_id, q.public_id as quote_public_id, i.purpose
    from app_private.payment_operations o
    join app_private.checkout_intents i on i.id=o.checkout_intent_id and i.account_id=o.account_id
    join app_private.accounts a on a.id=o.account_id
    join app_private.quotes q on q.id=o.quote_id and q.checkout_intent_id=i.id
    where o.public_id=${target.operationId} and i.public_id=${target.checkoutId}
      and o.reactivation_arrangement_id is null and i.reactivation_arrangement_id is null
  `;
  const rows = lock ? await sql<Row[]>`${query} for update of o, i, q` : await query;
  if (rows.length !== 1) fail();
  await sql`select removal_state, removal_started_at, removed_at from app_private.payment_methods limit 0`;
  const op = mapOperation(rows[0]!);
  const quote = await new PostgresQuoteRepository(sql).findOwnedQuote(op.accountId, op.intentId, op.quoteId);
  if (!quote || quote.internalId.toString() !== String((rows[0] as Row & {quote_id: string}).quote_id)) fail();
  return { operation: op, purpose: rows[0]!.purpose, review: toCheckoutReview(quote) };
}

async function inspect(sql: DatabaseClient, ctx: CaptureRecoveryContext, evidence: PayPalCaptureEvidence, lock = false): Promise<"pending" | "complete"> {
  const op = ctx.operation;
  const customers = await sql<{ id: string; account_id: string; provider_customer_id: string }[]>`
    select id, account_id, provider_customer_id from app_private.provider_customers
    where provider='paypal' and merchant_id=${op.merchantId} and environment=${op.environment}
      and (account_id=${op.accountId.toString()} or provider_customer_id=${evidence.paypalCustomerId!})
  `;
  if (customers.length > 1 || customers.some(c => BigInt(c.account_id) !== op.accountId || c.provider_customer_id !== evidence.paypalCustomerId)) fail();
  const methodQuery = sql<{ id: string; provider_customer_id: string; removal_state: string; readiness: string }[]>`
    select id, provider_customer_id, removal_state, readiness from app_private.payment_methods
    where merchant_id=${op.merchantId} and environment=${op.environment} and provider_vault_id=${evidence.vaultId!}
  `;
  const methods = lock ? await sql<typeof methodQuery extends PromiseLike<infer R> ? R : never>`${methodQuery} for update` : await methodQuery;
  const method = methods[0];
  if (methods.length > 1 || (method && (method.removal_state !== "none" || !customers[0] || method.provider_customer_id !== customers[0].id))) fail();
  const events = await sql<{ payment_operation_id: string; provider: string; provider_event_id: string; event_type: string; merchant_id: string; environment: string; raw_payload: PayPalCaptureEvidence; signature_valid: boolean; correlation_result: string }[]>`
    select payment_operation_id,provider,provider_event_id,event_type,merchant_id,environment,raw_payload,signature_valid,correlation_result
    from app_private.provider_events where provider_event_id=${evidence.captureId}
      or (payment_operation_id=${op.internalId.toString()} and event_type='PAYPAL.ORDER.CAPTURED')
  `;
  const arrangements = await sql<{ id: string; account_id: string; checkout_id: string; quote_id: string; payment_method_id: string; funding_status: string; reusable_readiness: string; renewal_at: Date; allowance_resets_at: Date }[]>`
    select b.id,b.account_id,i.public_id as checkout_id,q.public_id as quote_id,b.payment_method_id,b.funding_status,b.reusable_readiness,b.renewal_at,b.allowance_resets_at
    from app_private.billing_arrangements b join app_private.checkout_intents i on i.id=b.checkout_intent_id join app_private.quotes q on q.id=b.quote_id
    where b.payment_operation_id=${op.internalId.toString()}
  `;
  if (op.fundingStatus !== "completed") { if (events.length || arrangements.length) fail(); return "pending"; }
  const ev = events[0]; const arrangement = arrangements[0];
  const stamp = await sql<{ funding_verified_at: Date | null; vault_verified_at: Date | null; provider_effective_at: Date | null; paypal_customer_id: string | null }[]>`
    select funding_verified_at,vault_verified_at,provider_effective_at,paypal_customer_id from app_private.payment_operations where id=${op.internalId.toString()}
  `;
  const times = stamp[0];
  if (events.length !== 1 || !ev || arrangements.length !== 1 || !arrangement || !method || method.readiness !== "ready"
    || op.vaultStatus !== "vaulted" || BigInt(ev.payment_operation_id) !== op.internalId || ev.provider !== "paypal" || ev.provider_event_id !== evidence.captureId || ev.event_type !== "PAYPAL.ORDER.CAPTURED"
    || ev.merchant_id !== op.merchantId || ev.environment !== op.environment || !ev.signature_valid || ev.correlation_result !== "matched"
    || !times || times.paypal_customer_id !== evidence.paypalCustomerId
    || [times.funding_verified_at,times.vault_verified_at,times.provider_effective_at].some(t => !t || t.toISOString() !== evidence.capturedAt)
    || ev.raw_payload.amount?.currency !== evidence.amount.currency || ev.raw_payload.amount?.cents !== evidence.amount.cents
    || Object.keys(evidence).filter(key => key !== "amount").some(key => ev.raw_payload[key as keyof PayPalCaptureEvidence] !== evidence[key as keyof PayPalCaptureEvidence])
    || BigInt(arrangement.account_id) !== op.accountId || arrangement.checkout_id !== op.intentId || arrangement.quote_id !== op.quoteId
    || arrangement.payment_method_id !== method.id || arrangement.funding_status !== "verified" || arrangement.reusable_readiness !== "ready"
    || arrangement.renewal_at.toISOString() !== ctx.review.renewsAt || arrangement.allowance_resets_at.toISOString() !== ctx.review.allowanceResetsAt) fail();
  return "complete";
}

export class PostgresCaptureRecoveryRepository {
  constructor(private readonly sql: DatabaseClient) {}
  async readContext(target: RecoveryTarget) {
    return this.sql.begin("isolation level repeatable read read only", tx => loadContext(tx as unknown as DatabaseClient, target));
  }
  async inspectEvidence(ctx: CaptureRecoveryContext, evidence: PayPalCaptureEvidence) {
    return this.sql.begin("isolation level repeatable read read only", async tx => {
      const db=tx as unknown as DatabaseClient;
      const target={operationId:ctx.operation.operationId,checkoutId:ctx.operation.intentId};
      const fresh=await loadContext(db,target);
      assertContext(fresh,target,ctx.operation.merchantId);
      if(fresh.operation.accountId!==ctx.operation.accountId || fresh.operation.orderId!==ctx.operation.orderId || JSON.stringify(fresh.review)!==JSON.stringify(ctx.review))fail();
      return inspect(db,fresh,evidence);
    });
  }
  async apply(ctx: CaptureRecoveryContext, evidence: PayPalCaptureEvidence) {
    // Wrap the existing transaction boundary, preserving its implementation and locks.
    const guarded = { begin: (callback: (tx: unknown) => Promise<unknown>) => this.sql.begin(async tx => {
      const db = tx as unknown as DatabaseClient;
      const current = await loadContext(db, {operationId: ctx.operation.operationId, checkoutId: ctx.operation.intentId}, true);
      assertContext(current, {operationId: ctx.operation.operationId, checkoutId: ctx.operation.intentId}, ctx.operation.merchantId);
      if (current.operation.accountId !== ctx.operation.accountId || current.operation.internalId !== ctx.operation.internalId
        || JSON.stringify(current.review) !== JSON.stringify(ctx.review) || current.operation.orderId !== evidence.orderId) fail();
      if (await inspect(db, current, evidence, true) === "complete") throw new Error("payment_state_conflict");
      return callback(tx);
    }) } as unknown as DatabaseClient;
    return new PostgresPayPalRepository(guarded).applyCaptureEvidence(ctx.operation, evidence);
  }
}

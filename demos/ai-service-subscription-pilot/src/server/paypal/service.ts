import { randomUUID } from "node:crypto";

import type { CheckoutReview } from "@/contracts/checkout";
import type { PayPalCheckoutStatus } from "@/contracts/paypal";
import type {
  PayPalCaptureEvidence,
  PayPalEnvironment,
  PayPalGateway,
} from "@/server/paypal/gateway";
import { PayPalDefinitiveError } from "@/server/paypal/gateway";
import { buildFraudNetBootstrap, buildInitialPayPalOrder, validateClientMetadataId } from "@/server/paypal/payload";

type FundingStatus = "created" | "approved" | "completed" | "failed" | "canceled";
type VaultStatus = "not_requested" | "pending" | "approved" | "vaulted" | "failed";

export type PayPalOperationRecord = Readonly<{
  internalId: bigint;
  operationId: string;
  accountId: bigint;
  intentId: string;
  quoteId: string;
  merchantId: string;
  environment: PayPalEnvironment;
  orderId: string | null;
  createRequestId: string;
  captureRequestId: string;
  fundingStatus: FundingStatus;
  vaultStatus: VaultStatus;
}>;

type CreateClaim =
  | Readonly<{ kind: "owner" | "in_progress"; operation: PayPalOperationRecord }>
  | Readonly<{ kind: "ready"; operation: PayPalOperationRecord; orderId: string }>
  | Readonly<{ kind: "failed"; operation: PayPalOperationRecord }>;

type CaptureClaim =
  | Readonly<{ kind: "owner" | "in_progress"; operation: PayPalOperationRecord }>
  | Readonly<{ kind: "complete"; operation: PayPalOperationRecord; status: PayPalCheckoutStatus }>
  | Readonly<{ kind: "failed"; operation: PayPalOperationRecord }>;

export type FundingVerifiedTransition = Readonly<{
  paymentOperationId: string;
  billingArrangementId: string;
  fundedAt: string;
}>;

export interface PayPalRepository {
  findProviderCustomerId(input: Readonly<{
    accountId: bigint;
    merchantId: string;
    environment: PayPalEnvironment;
  }>): Promise<string | null>;
  claimCreateOperation(input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    merchantId: string;
    environment: PayPalEnvironment;
  }>): Promise<CreateClaim>;
  storeCreatedOrder(operationId: string, orderId: string): Promise<void>;
  markCreateFailed(operationId: string): Promise<void>;
  claimCaptureOperation(input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    orderId: string;
    merchantId: string;
    environment: PayPalEnvironment;
  }>): Promise<CaptureClaim>;
  applyCaptureEvidence(
    operation: PayPalOperationRecord,
    evidence: PayPalCaptureEvidence,
  ): Promise<FundingVerifiedTransition & PayPalCheckoutStatus>;
  markCaptureFailed(operationId: string): Promise<void>;
}

type ServiceDependencies = Readonly<{
  repository: PayPalRepository;
  gateway: PayPalGateway;
  merchantId: string;
  environment: PayPalEnvironment;
  requireReview(input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    now: Date;
  }>): Promise<CheckoutReview>;
  clock?: () => Date;
}>;

export async function issuePayPalUserIdToken(
  input: Readonly<{
    accountId: bigint;
    merchantCustomerReference: string;
    intentId: string;
    quoteId: string;
  }>,
  dependencies: ServiceDependencies,
) {
  const fraudNet = buildFraudNetBootstrap(dependencies.merchantId, dependencies.environment);
  await dependencies.requireReview({ ...input, now: dependencies.clock?.() ?? new Date() });
  const targetCustomerId = await dependencies.repository.findProviderCustomerId({
    accountId: input.accountId,
    merchantId: dependencies.merchantId,
    environment: dependencies.environment,
  });
  const idToken = await dependencies.gateway.createUserIdToken({
    merchantCustomerReference: input.merchantCustomerReference,
    ...(targetCustomerId ? { targetCustomerId } : {}),
  });
  return Object.freeze({ idToken, fraudNet });
}

export async function createPayPalOrder(
  input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    clientMetadataId: string;
  }>,
  dependencies: ServiceDependencies,
) {
  const clientMetadataId = validateClientMetadataId(input.clientMetadataId);
  buildFraudNetBootstrap(dependencies.merchantId, dependencies.environment);
  const review = await dependencies.requireReview({
    accountId: input.accountId,
    intentId: input.intentId,
    quoteId: input.quoteId,
    now: dependencies.clock?.() ?? new Date(),
  });
  const claim = await dependencies.repository.claimCreateOperation({
    accountId: input.accountId,
    intentId: input.intentId,
    quoteId: input.quoteId,
    operationId: input.operationId,
    merchantId: dependencies.merchantId,
    environment: dependencies.environment,
  });
  if (claim.kind === "ready") {
    return Object.freeze({ status: "ready" as const, operationId: claim.operation.operationId, orderId: claim.orderId });
  }
  if (claim.kind === "in_progress") {
    return Object.freeze({ status: "in_progress" as const, operationId: claim.operation.operationId, retryable: true as const });
  }
  if (claim.kind === "failed") throw new Error("payment_unavailable");

  try {
    const created = await dependencies.gateway.createOrder({
      payload: buildInitialPayPalOrder(review),
      requestId: claim.operation.createRequestId,
      clientMetadataId,
    });
    await dependencies.repository.storeCreatedOrder(input.operationId, created.orderId);
    return Object.freeze({ status: "ready" as const, operationId: input.operationId, orderId: created.orderId });
  } catch (error) {
    if (error instanceof PayPalDefinitiveError) await dependencies.repository.markCreateFailed(input.operationId);
    throw new Error("payment_unavailable");
  }
}

function assertCaptureMatches(
  evidence: PayPalCaptureEvidence,
  operation: PayPalOperationRecord,
  review: CheckoutReview,
) {
  if (
    evidence.orderId !== operation.orderId
    || evidence.captureStatus !== "COMPLETED"
    || evidence.amount.currency !== "USD"
    || evidence.amount.cents !== review.dueToday.cents
    || (evidence.payeeMerchantId !== undefined && evidence.payeeMerchantId !== operation.merchantId)
    || !Number.isFinite(Date.parse(evidence.capturedAt))
    || !evidence.paypalCustomerId
    || (evidence.vaultStatus === "VAULTED" && !evidence.vaultId)
    || (evidence.vaultStatus === "APPROVED" && evidence.vaultId !== undefined)
  ) throw new Error("capture_mismatch");
}

export async function captureAndReconcilePayPalOrder(
  input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    orderId: string;
  }>,
  dependencies: ServiceDependencies,
): Promise<PayPalCheckoutStatus & Partial<FundingVerifiedTransition>> {
  const review = await dependencies.requireReview({
    accountId: input.accountId,
    intentId: input.intentId,
    quoteId: input.quoteId,
    now: dependencies.clock?.() ?? new Date(),
  });
  const claim = await dependencies.repository.claimCaptureOperation({
    ...input,
    merchantId: dependencies.merchantId,
    environment: dependencies.environment,
  });
  if (claim.kind === "complete") return claim.status;
  if (claim.kind === "in_progress") {
    return Object.freeze({
      operationId: input.operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
  }
  if (claim.kind === "failed") throw new Error("payment_unavailable");

  try {
    const evidence = await dependencies.gateway.captureOrder({
      orderId: input.orderId,
      requestId: claim.operation.captureRequestId,
    });
    assertCaptureMatches(evidence, claim.operation, review);
    return await dependencies.repository.applyCaptureEvidence(claim.operation, evidence);
  } catch (error) {
    if (
      error instanceof PayPalDefinitiveError
      || (error instanceof Error && (error.message === "capture_mismatch" || error.message === "invalid_capture_evidence"))
    ) {
      await dependencies.repository.markCaptureFailed(input.operationId);
      throw new Error("payment_unavailable");
    }
    return Object.freeze({
      operationId: input.operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
  }
}

type OperationRow = {
  id: string | number | bigint;
  public_id: string;
  account_id: string | number | bigint;
  intent_public_id: string;
  quote_public_id: string;
  merchant_id: string;
  environment: PayPalEnvironment;
  paypal_order_id: string | null;
  create_request_id: string;
  capture_request_id: string;
  funding_status: FundingStatus;
  vault_status: VaultStatus;
};

function mapOperation(row: OperationRow): PayPalOperationRecord {
  return Object.freeze({
    internalId: BigInt(row.id),
    operationId: row.public_id,
    accountId: BigInt(row.account_id),
    intentId: row.intent_public_id,
    quoteId: row.quote_public_id,
    merchantId: row.merchant_id,
    environment: row.environment,
    orderId: row.paypal_order_id,
    createRequestId: row.create_request_id,
    captureRequestId: row.capture_request_id,
    fundingStatus: row.funding_status,
    vaultStatus: row.vault_status,
  });
}

async function database() {
  return (await import("@/server/db/client")).sql;
}

function sameOperation(
  operation: PayPalOperationRecord,
  input: Readonly<{
    accountId: bigint;
    intentId: string;
    quoteId: string;
    merchantId: string;
    environment: PayPalEnvironment;
  }>,
) {
  return operation.accountId === input.accountId
    && operation.intentId === input.intentId
    && operation.quoteId === input.quoteId
    && operation.merchantId === input.merchantId
    && operation.environment === input.environment;
}

export class PostgresPayPalRepository implements PayPalRepository {
  async findAccountPublicId(accountId: bigint) {
    const sql = await database();
    const rows = await sql<{ public_id: string }[]>`select public_id from app_private.accounts where id = ${accountId.toString()} limit 1`;
    return rows[0]?.public_id ?? null;
  }
  async findProviderCustomerId(input: { accountId: bigint; merchantId: string; environment: PayPalEnvironment }) {
    const sql = await database();
    const rows = await sql<{ provider_customer_id: string }[]>`
      select provider_customer_id from app_private.provider_customers
      where account_id = ${input.accountId.toString()} and provider = 'paypal'
        and merchant_id = ${input.merchantId} and environment = ${input.environment}
      limit 1
    `;
    return rows[0]?.provider_customer_id ?? null;
  }

  async claimCreateOperation(input: {
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    merchantId: string;
    environment: PayPalEnvironment;
  }): Promise<CreateClaim> {
    const sql = await database();
    return sql.begin(async (tx) => {
      const purchases = await tx<{ intent_id: string; quote_id: string; state: string }[]>`
        select i.id as intent_id, q.id as quote_id, i.state
        from app_private.checkout_intents i
        join app_private.quotes q on q.checkout_intent_id = i.id
        where i.public_id = ${input.intentId} and i.account_id = ${input.accountId.toString()}
          and q.public_id = ${input.quoteId}
        for update of i, q
      `;
      const purchase = purchases[0];
      if (!purchase) throw new Error("payment_not_found");
      const successors = await tx<{ exists: boolean }[]>`
        select exists(select 1 from app_private.quotes where supersedes_quote_id = ${purchase.quote_id}) as exists
      `;
      if (successors[0]?.exists) throw new Error("payment_not_found");

      const rows = await tx<OperationRow[]>`
        select o.*, ${input.intentId}::uuid as intent_public_id, ${input.quoteId}::uuid as quote_public_id
        from app_private.payment_operations o
        where o.checkout_intent_id = ${purchase.intent_id} and o.quote_id = ${purchase.quote_id}
        order by o.id
        for update of o
      `;
      const operations = rows.map(mapOperation);
      const requested = operations.find((operation) => operation.operationId === input.operationId);
      if (requested && !sameOperation(requested, input)) throw new Error("payment_not_found");
      const active = operations.filter((operation) => ["created", "approved", "completed"].includes(operation.fundingStatus));
      if (active.length > 1) throw new Error("payment_state_conflict");
      const owning = active[0];
      if (owning && !sameOperation(owning, input)) throw new Error("payment_state_conflict");
      if (purchase.state === "funded" || owning?.fundingStatus === "completed") {
        if (!owning) throw new Error("payment_state_conflict");
        return { kind: "failed" as const, operation: owning };
      }
      if (owning) {
        if (owning.orderId) return { kind: "ready" as const, operation: owning, orderId: owning.orderId };
        return { kind: "in_progress" as const, operation: owning };
      }
      if (requested) return { kind: "failed" as const, operation: requested };
      if (purchase.state !== "identity_verified" && purchase.state !== "payment_pending") throw new Error("payment_not_found");

      const inserted = await tx<OperationRow[]>`
        insert into app_private.payment_operations
          (public_id, checkout_intent_id, quote_id, account_id, merchant_id, environment,
           create_request_id, capture_request_id, funding_status, vault_status)
        values
          (${input.operationId}, ${purchase.intent_id}, ${purchase.quote_id}, ${input.accountId.toString()},
           ${input.merchantId}, ${input.environment}, ${randomUUID()}, ${randomUUID()}, 'created', 'not_requested')
        returning *, ${input.intentId}::uuid as intent_public_id, ${input.quoteId}::uuid as quote_public_id
      `;
      await tx`
        update app_private.checkout_intents set state = 'payment_pending', updated_at = now()
        where id = ${purchase.intent_id} and state = 'identity_verified'
      `;
      return { kind: "owner" as const, operation: mapOperation(inserted[0]!) };
    });
  }

  async storeCreatedOrder(operationId: string, orderId: string) {
    const sql = await database();
    const rows = await sql<{ public_id: string }[]>`
      update app_private.payment_operations
      set paypal_order_id = ${orderId}, updated_at = now()
      where public_id = ${operationId} and funding_status = 'created'
        and (paypal_order_id is null or paypal_order_id = ${orderId})
      returning public_id
    `;
    if (rows.length !== 1) throw new Error("payment_state_conflict");
  }

  async markCreateFailed(operationId: string) {
    const sql = await database();
    await sql`
      update app_private.payment_operations set funding_status = 'failed', vault_status = 'failed', updated_at = now()
      where public_id = ${operationId} and funding_status = 'created' and paypal_order_id is null
    `;
  }

  async claimCaptureOperation(input: {
    accountId: bigint;
    intentId: string;
    quoteId: string;
    operationId: string;
    orderId: string;
    merchantId: string;
    environment: PayPalEnvironment;
  }): Promise<CaptureClaim> {
    const sql = await database();
    return sql.begin(async (tx) => {
      const rows = await tx<OperationRow[]>`
        select o.*, i.public_id as intent_public_id, q.public_id as quote_public_id
        from app_private.payment_operations o
        join app_private.checkout_intents i on i.id = o.checkout_intent_id
        join app_private.quotes q on q.id = o.quote_id
        where o.public_id = ${input.operationId}
        for update of o
      `;
      const operation = rows[0] ? mapOperation(rows[0]) : null;
      if (!operation || !sameOperation(operation, input) || operation.orderId !== input.orderId) throw new Error("payment_not_found");
      if (operation.fundingStatus === "completed") {
        const arrangements = await tx<{ public_id: string; reusable_readiness: "pending" | "ready" | "failed" }[]>`
          select public_id, reusable_readiness from app_private.billing_arrangements
          where payment_operation_id = ${operation.internalId.toString()} limit 1
        `;
        const arrangement = arrangements[0];
        if (!arrangement) throw new Error("payment_state_conflict");
        return {
          kind: "complete" as const,
          operation,
          status: Object.freeze({
            operationId: operation.operationId,
            funding: "verified" as const,
            reusableReadiness: arrangement.reusable_readiness,
            customerMessage: arrangement.reusable_readiness === "ready"
              ? "vault token verified; future-charge path documented"
              : "Payment verified. Reusable payment setup is finishing.",
          }),
        };
      }
      if (operation.fundingStatus === "failed" || operation.fundingStatus === "canceled") return { kind: "failed" as const, operation };
      if (operation.fundingStatus === "approved") return { kind: "in_progress" as const, operation };
      const updated = await tx<OperationRow[]>`
        update app_private.payment_operations set funding_status = 'approved', updated_at = now()
        where id = ${operation.internalId.toString()} and funding_status = 'created'
        returning *, ${operation.intentId}::uuid as intent_public_id, ${operation.quoteId}::uuid as quote_public_id
      `;
      if (!updated[0]) return { kind: "in_progress" as const, operation };
      return { kind: "owner" as const, operation: mapOperation(updated[0]) };
    });
  }

  async applyCaptureEvidence(operation: PayPalOperationRecord, evidence: PayPalCaptureEvidence) {
    const sql = await database();
    return sql.begin(async (tx) => {
      const operationRows = await tx<OperationRow[]>`
        select o.*, i.public_id as intent_public_id, q.public_id as quote_public_id
        from app_private.payment_operations o
        join app_private.checkout_intents i on i.id = o.checkout_intent_id
        join app_private.quotes q on q.id = o.quote_id
        where o.id = ${operation.internalId.toString()}
        for update of o
      `;
      const locked = operationRows[0] ? mapOperation(operationRows[0]) : null;
      if (!locked || locked.orderId !== evidence.orderId || locked.fundingStatus !== "approved") {
        throw new Error("payment_state_conflict");
      }
      if (!evidence.paypalCustomerId) throw new Error("capture_mismatch");

      await tx`
        insert into app_private.provider_customers
          (public_id, account_id, provider, merchant_id, environment, provider_customer_id)
        values
          (${randomUUID()}, ${locked.accountId.toString()}, 'paypal', ${locked.merchantId}, ${locked.environment}, ${evidence.paypalCustomerId})
        on conflict do nothing
      `;
      const customers = await tx<{ id: string; provider_customer_id: string }[]>`
        select id, provider_customer_id from app_private.provider_customers
        where account_id = ${locked.accountId.toString()} and provider = 'paypal'
          and merchant_id = ${locked.merchantId} and environment = ${locked.environment}
        for update
      `;
      const customer = customers[0];
      if (!customer || customer.provider_customer_id !== evidence.paypalCustomerId) throw new Error("provider_customer_conflict");

      let paymentMethodId: string | null = null;
      if (evidence.vaultStatus === "VAULTED") {
        if (!evidence.vaultId) throw new Error("capture_mismatch");
        await tx`
          update app_private.payment_methods set is_primary = false, updated_at = now()
          where provider_customer_id = ${customer.id} and is_primary
        `;
        const methods = await tx<{ id: string }[]>`
          insert into app_private.payment_methods
            (public_id, provider_customer_id, merchant_id, environment, provider_vault_id, display_brand, readiness, is_primary)
          values
            (${randomUUID()}, ${customer.id}, ${locked.merchantId}, ${locked.environment}, ${evidence.vaultId}, 'PayPal Wallet', 'ready', true)
          on conflict on constraint payment_methods_vault_owner_unique do update
            set readiness = 'ready', is_primary = true, updated_at = now()
            where app_private.payment_methods.provider_customer_id = excluded.provider_customer_id
          returning id
        `;
        if (!methods[0]) throw new Error("vault_ownership_conflict");
        paymentMethodId = methods[0].id;
      }

      await tx`
        insert into app_private.provider_events
          (public_id, provider, merchant_id, environment, provider_event_id, event_type, raw_payload,
           signature_valid, correlation_result, payment_operation_id, received_at, processed_at)
        values
          (${randomUUID()}, 'paypal', ${locked.merchantId}, ${locked.environment}, ${evidence.captureId},
           'PAYPAL.ORDER.CAPTURED', ${tx.json(evidence)}, true, 'matched', ${locked.internalId.toString()},
           ${new Date(evidence.capturedAt)}, ${new Date(evidence.capturedAt)})
        on conflict (provider_event_id) do nothing
      `;
      const captureEvents = await tx<{ payment_operation_id: string }[]>`
        select payment_operation_id from app_private.provider_events where provider_event_id = ${evidence.captureId}
      `;
      if (captureEvents[0] && BigInt(captureEvents[0].payment_operation_id) !== locked.internalId) throw new Error("capture_ownership_conflict");

      await tx`
        update app_private.payment_operations
        set paypal_customer_id = ${evidence.paypalCustomerId}, funding_status = 'completed',
            vault_status = ${evidence.vaultStatus === "VAULTED" ? "vaulted" : "pending"},
            provider_effective_at = ${new Date(evidence.capturedAt)}, funding_verified_at = ${new Date(evidence.capturedAt)},
            vault_verified_at = ${evidence.vaultStatus === "VAULTED" ? new Date(evidence.capturedAt) : null}, updated_at = now()
        where id = ${locked.internalId.toString()} and funding_status = 'approved'
      `;
      await tx`
        update app_private.checkout_intents set state = 'funded', updated_at = now()
        where public_id = ${locked.intentId} and account_id = ${locked.accountId.toString()}
      `;
      const arrangements = await tx<{ public_id: string }[]>`
        insert into app_private.billing_arrangements
          (public_id, account_id, checkout_intent_id, quote_id, payment_operation_id, payment_method_id,
           tier, cadence, funding_status, reusable_readiness, entitlement_status, renewal_at, allowance_resets_at)
        select ${randomUUID()}, ${locked.accountId.toString()}, o.checkout_intent_id, o.quote_id, o.id,
               ${paymentMethodId}, 'go', 'monthly', 'verified',
               ${evidence.vaultStatus === "VAULTED" ? "ready" : "pending"}, 'pending', q.renews_at, q.allowance_resets_at
        from app_private.payment_operations o join app_private.quotes q on q.id = o.quote_id
        where o.id = ${locked.internalId.toString()}
        on conflict (payment_operation_id) do update
          set payment_method_id = coalesce(excluded.payment_method_id, app_private.billing_arrangements.payment_method_id),
              reusable_readiness = excluded.reusable_readiness, updated_at = now()
        returning public_id
      `;
      const billingArrangementId = arrangements[0]?.public_id;
      if (!billingArrangementId) throw new Error("payment_state_conflict");
      const readiness = evidence.vaultStatus === "VAULTED" ? "ready" as const : "pending" as const;
      return Object.freeze({
        operationId: locked.operationId,
        paymentOperationId: locked.operationId,
        billingArrangementId,
        fundedAt: evidence.capturedAt,
        funding: "verified" as const,
        reusableReadiness: readiness,
        customerMessage: readiness === "ready"
          ? "vault token verified; future-charge path documented"
          : "Payment verified. Reusable payment setup is finishing.",
      });
    });
  }

  async markCaptureFailed(operationId: string) {
    const sql = await database();
    await sql`
      update app_private.payment_operations set funding_status = 'failed', vault_status = 'failed', updated_at = now()
      where public_id = ${operationId} and funding_status = 'approved'
    `;
  }
}

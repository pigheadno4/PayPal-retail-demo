import { randomUUID } from "node:crypto";

import type { DatabaseClient } from "../../db/client.js";
import type { PayPalEnvironment, PayPalGateway, PayPalTransmissionHeaders } from "./gateway.js";

type Candidate = Readonly<{ operationInternalId: bigint; operationId: string }>;
type Disposition = "matched" | "duplicate" | "unmatched" | "ambiguous" | "rejected";
type PromotionResult = "matched" | "duplicate" | "rejected";

export interface PayPalWebhookRepository {
  hasProviderEvent(eventId: string): Promise<boolean>;
  findPendingOperations(input: Readonly<{ merchantId: string; environment: PayPalEnvironment; customerId: string }>): Promise<readonly Candidate[]>;
  isVaultOwned(input: Readonly<{ merchantId: string; environment: PayPalEnvironment; vaultId: string; operationInternalId: bigint }>): Promise<boolean>;
  recordDisposition(input: Readonly<{ eventId: string; eventType: string; rawPayload: unknown; signatureValid: boolean; disposition: Disposition; merchantId: string; environment: PayPalEnvironment; operationInternalId?: bigint }>): Promise<boolean>;
  recordDuplicateDelivery(input: Readonly<{ eventId: string; receivedAt: string }>): Promise<boolean>;
  promoteReadiness(input: Readonly<{ eventId: string; vaultId: string; customerId: string; merchantId: string; environment: PayPalEnvironment; operation: Candidate; occurredAt: string; rawPayload: unknown }>): Promise<PromotionResult>;
}

type Dependencies = Readonly<{
  repository: PayPalWebhookRepository;
  gateway: PayPalGateway;
  merchantId: string;
  environment: PayPalEnvironment;
  webhookId: string;
  clock?: () => Date;
}>;

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export async function reconcilePayPalWebhook(rawBody: string, headers: PayPalTransmissionHeaders, dependencies: Dependencies) {
  const signatureValid = await dependencies.gateway.verifyWebhook({ webhookId: dependencies.webhookId, rawBody, transmissionHeaders: headers });
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch { payload = { malformed: true }; }
  const root = object(payload);
  const eventId = typeof root?.id === "string" && root.id ? root.id : `malformed-${randomUUID()}`;
  const eventType = typeof root?.event_type === "string" ? root.event_type : "MALFORMED";
  const receivedAt = (dependencies.clock?.() ?? new Date()).toISOString();
  const recordDuplicate = async () => {
    if (!await dependencies.repository.recordDuplicateDelivery({ eventId, receivedAt })) {
      throw new Error("paypal_duplicate_event_missing");
    }
    return Object.freeze({ accepted: true, disposition: "duplicate" as const });
  };
  const record = async (disposition: Disposition, operationInternalId?: bigint, claimEventId = eventId) => {
    const claimed = await dependencies.repository.recordDisposition({ eventId: claimEventId, eventType, rawPayload: payload, signatureValid, disposition, merchantId: dependencies.merchantId, environment: dependencies.environment, ...(operationInternalId === undefined ? {} : { operationInternalId }) });
    if (signatureValid && !claimed) return recordDuplicate();
    return Object.freeze({ accepted: signatureValid, disposition });
  };

  if (!signatureValid) return record("rejected", undefined, `unverified-${randomUUID()}`);
  if (await dependencies.repository.hasProviderEvent(eventId)) return recordDuplicate();
  const resource = object(root?.resource);
  const customer = object(resource?.customer);
  const vaultId = typeof resource?.id === "string" ? resource.id : "";
  const customerId = typeof customer?.id === "string" ? customer.id : "";
  const occurredAt = typeof root?.create_time === "string" ? root.create_time : receivedAt;
  if (eventType !== "VAULT.PAYMENT-TOKEN.CREATED" || !vaultId || !customerId || !Number.isFinite(Date.parse(occurredAt))) return record("rejected");
  const candidates = await dependencies.repository.findPendingOperations({ merchantId: dependencies.merchantId, environment: dependencies.environment, customerId });
  if (candidates.length === 0) return record("unmatched");
  if (candidates.length !== 1) return record("ambiguous");
  const operation = candidates[0]!;
  if (await dependencies.repository.isVaultOwned({ merchantId: dependencies.merchantId, environment: dependencies.environment, vaultId, operationInternalId: operation.operationInternalId })) return record("rejected", operation.operationInternalId);
  const promoted = await dependencies.repository.promoteReadiness({ eventId, vaultId, customerId, merchantId: dependencies.merchantId, environment: dependencies.environment, operation, occurredAt, rawPayload: payload });
  if (promoted === "duplicate") return recordDuplicate();
  if (promoted === "rejected") return record("rejected", operation.operationInternalId);
  return Object.freeze({ accepted: true, disposition: "matched" as const });
}

export class PostgresPayPalWebhookRepository implements PayPalWebhookRepository {
  constructor(private readonly sql: DatabaseClient) {}

  async hasProviderEvent(eventId: string) {
    const sql = this.sql;
    const rows = await sql<{ exists: boolean }[]>`select exists(select 1 from app_private.provider_events where provider_event_id = ${eventId} and signature_valid) as exists`;
    return rows[0]?.exists ?? false;
  }
  async findPendingOperations(input: { merchantId: string; environment: PayPalEnvironment; customerId: string }) {
    const sql = this.sql;
    const rows = await sql<{ id: string; public_id: string }[]>`
      select o.id, o.public_id from app_private.payment_operations o
      join app_private.billing_arrangements b on b.payment_operation_id = o.id
      where o.merchant_id = ${input.merchantId} and o.environment = ${input.environment}
        and o.paypal_customer_id = ${input.customerId} and o.funding_status = 'completed'
        and o.vault_status = 'pending' and b.reusable_readiness = 'pending'
    `;
    return rows.map((row) => ({ operationInternalId: BigInt(row.id), operationId: row.public_id }));
  }
  async isVaultOwned(input: { merchantId: string; environment: PayPalEnvironment; vaultId: string; operationInternalId: bigint }) {
    const sql = this.sql;
    const rows = await sql<{ owned: boolean }[]>`
      select exists(
        select 1 from app_private.payment_methods m
        join app_private.provider_customers c on c.id = m.provider_customer_id
        join app_private.payment_operations o on o.account_id = c.account_id
        where m.merchant_id = ${input.merchantId} and m.environment = ${input.environment}
          and m.provider_vault_id = ${input.vaultId} and o.id <> ${input.operationInternalId.toString()}
      ) as owned
    `;
    return rows[0]?.owned ?? false;
  }
  async recordDisposition(input: { eventId: string; eventType: string; rawPayload: unknown; signatureValid: boolean; disposition: Disposition; merchantId: string; environment: PayPalEnvironment; operationInternalId?: bigint }) {
    const sql = this.sql;
    const rows = await sql<{ provider_event_id: string }[]>`
      insert into app_private.provider_events
        (public_id, provider, merchant_id, environment, provider_event_id, event_type, raw_payload, signature_valid, correlation_result, payment_operation_id, received_at, processed_at)
      values (${randomUUID()}, 'paypal', ${input.merchantId}, ${input.environment}, ${input.eventId}, ${input.eventType}, ${sql.json(input.rawPayload as never)}, ${input.signatureValid}, ${input.disposition}, ${input.operationInternalId?.toString() ?? null}, now(), now())
      on conflict (provider_event_id) do nothing returning provider_event_id
    `;
    return rows.length === 1;
  }
  async recordDuplicateDelivery(input: { eventId: string; receivedAt: string }) {
    const sql = this.sql;
    const rows = await sql<{ provider_event_id: string }[]>`
      update app_private.provider_events
      set duplicate_delivery_count = duplicate_delivery_count + 1,
          last_duplicate_received_at = ${new Date(input.receivedAt)}
      where provider_event_id = ${input.eventId} and signature_valid
      returning provider_event_id
    `;
    return rows.length === 1;
  }
  async promoteReadiness(input: { eventId: string; vaultId: string; customerId: string; merchantId: string; environment: PayPalEnvironment; operation: Candidate; occurredAt: string; rawPayload: unknown }) {
    const sql = this.sql;
    try {
      return await sql.begin(async (tx) => {
        const events = await tx<{ id: string }[]>`
          insert into app_private.provider_events
            (public_id, provider, merchant_id, environment, provider_event_id, event_type, raw_payload, signature_valid, correlation_result, payment_operation_id, received_at, processed_at)
          values (${randomUUID()}, 'paypal', ${input.merchantId}, ${input.environment}, ${input.eventId}, 'VAULT.PAYMENT-TOKEN.CREATED', ${tx.json(input.rawPayload as never)}, true, 'matched', ${input.operation.operationInternalId.toString()}, ${new Date(input.occurredAt)}, now())
          on conflict (provider_event_id) do nothing returning id
        `;
        if (!events[0]) return "duplicate" as const;
        const rows = await tx<{ account_id: string; provider_customer_id: string }[]>`
          select o.account_id, c.id as provider_customer_id from app_private.payment_operations o
          join app_private.provider_customers c on c.account_id = o.account_id and c.provider = 'paypal'
            and c.merchant_id = o.merchant_id and c.environment = o.environment and c.provider_customer_id = ${input.customerId}
          where o.id = ${input.operation.operationInternalId.toString()} and o.vault_status = 'pending'
          for update of o
        `;
        if (!rows[0]) throw new Error("paypal_promotion_conflict");
        await tx`update app_private.payment_methods set is_primary = false, updated_at = now() where provider_customer_id = ${rows[0].provider_customer_id} and is_primary`;
        const methods = await tx<{ id: string }[]>`
          insert into app_private.payment_methods (public_id, provider_customer_id, merchant_id, environment, provider_vault_id, display_brand, readiness, is_primary)
          values (${randomUUID()}, ${rows[0].provider_customer_id}, ${input.merchantId}, ${input.environment}, ${input.vaultId}, 'PayPal Wallet', 'ready', true)
          on conflict on constraint payment_methods_vault_owner_unique do update set readiness = 'ready', is_primary = true, updated_at = now()
          where app_private.payment_methods.provider_customer_id = excluded.provider_customer_id returning id
        `;
        if (!methods[0]) throw new Error("paypal_promotion_conflict");
        await tx`update app_private.payment_operations set vault_status = 'vaulted', vault_verified_at = ${new Date(input.occurredAt)}, updated_at = now() where id = ${input.operation.operationInternalId.toString()} and vault_status = 'pending'`;
        const arrangements = await tx`
          update app_private.billing_arrangements set payment_method_id = ${methods[0].id}, reusable_readiness = 'ready', updated_at = now()
          where payment_operation_id = ${input.operation.operationInternalId.toString()} and reusable_readiness = 'pending' returning id
        `;
        if (arrangements.length !== 1) throw new Error("paypal_promotion_conflict");
        return "matched" as const;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "paypal_promotion_conflict") return "rejected";
      throw error;
    }
  }
}

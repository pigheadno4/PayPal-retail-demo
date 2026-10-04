import { paypalWalletSchema, type PayPalWallet } from "../../../../shared/src/paypal.js";
import type { DatabaseClient } from "../../db/client.js";
import { PayPalDefinitiveError, type PayPalEnvironment, type PayPalGateway } from "./gateway.js";

export type WalletScope = Readonly<{ accountId: bigint; merchantId: string; environment: PayPalEnvironment }>;
type RemovalOutcome = "removed" | "rejected" | "unknown";
export type RemovalClaim = Readonly<{ kind: "owner"; scope: WalletScope; wallet: PayPalWallet; paymentTokenId: string }>;
export interface PayPalWalletRepository {
  readOwnedWallet(scope: WalletScope): Promise<PayPalWallet | null>;
  claimRemoval(scope: WalletScope, methodPublicId: string): Promise<RemovalClaim | Readonly<{ kind: "existing"; wallet: PayPalWallet }>>;
  finishRemoval(claim: RemovalClaim, outcome: RemovalOutcome): Promise<PayPalWallet>;
}

export async function removePayPalWallet(scope: WalletScope, methodPublicId: string, dependencies: Readonly<{
  repository: PayPalWalletRepository; gateway: Pick<PayPalGateway, "deletePaymentToken">;
}>): Promise<PayPalWallet> {
  // Repository resolution means the transaction committed, not merely that UPDATE ran.
  const claim = await dependencies.repository.claimRemoval(scope, methodPublicId);
  if (claim.kind !== "owner") return claim.wallet;
  let outcome: RemovalOutcome = "removed";
  try {
    await dependencies.gateway.deletePaymentToken({ paymentTokenId: claim.paymentTokenId });
  } catch (error) {
    outcome = error instanceof PayPalDefinitiveError ? "rejected" : "unknown";
  }
  try {
    return await dependencies.repository.finishRemoval(claim, outcome);
  } catch {
    // Do not retry DELETE or claim provider-confirmed removal without persisted evidence.
    return claim.wallet;
  }
}

type WalletRow = {
  id: string; public_id: string; provider_vault_id: string; display_last_four: string | null;
  removal_state: "none" | "removing" | RemovalOutcome; readiness: string; is_primary: boolean;
  renewal_at: Date; reusable_readiness: string;
};
function project(row: WalletRow): PayPalWallet {
  return paypalWalletSchema.parse({
    methodId: row.public_id, brand: "PayPal Wallet",
    ...(row.display_last_four ? { lastFour: row.display_last_four } : {}),
    state: row.removal_state === "none" ? "ready" : row.removal_state,
    renewalReady: row.removal_state === "none" && row.readiness === "ready" && row.is_primary && row.reusable_readiness === "ready",
    paidThrough: row.renewal_at.toISOString(),
  });
}

export class PostgresPayPalWalletRepository implements PayPalWalletRepository {
  constructor(private readonly sql: DatabaseClient) {}

  async readOwnedWallet(scope: WalletScope): Promise<PayPalWallet | null> {
    const sql = this.sql;
    const rows = await sql<WalletRow[]>`
      select m.*, b.renewal_at, b.reusable_readiness
      from app_private.billing_arrangements b
      join app_private.payment_methods m on m.id = b.payment_method_id
      join app_private.provider_customers c on c.id = m.provider_customer_id
      join app_private.payment_operations o on o.id = b.payment_operation_id
      where b.account_id = ${scope.accountId.toString()} and c.account_id = b.account_id
        and o.account_id = b.account_id and c.provider = 'paypal'
        and c.merchant_id = ${scope.merchantId} and m.merchant_id = c.merchant_id and o.merchant_id = c.merchant_id
        and c.environment = ${scope.environment} and m.environment = c.environment and o.environment = c.environment
        and b.funding_status = 'verified' and b.entitlement_status in ('active', 'pending') and b.renewal_at > now()
        and (m.removal_state <> 'none' or (m.readiness = 'ready' and m.is_primary))
      order by b.id desc limit 1
    `;
    return rows[0] ? project(rows[0]) : null;
  }

  async claimRemoval(scope: WalletScope, methodPublicId: string) {
    return this.sql.begin(async (tx) => {
      const rows = await tx<WalletRow[]>`
        select m.* from app_private.payment_methods m
        join app_private.provider_customers c on c.id = m.provider_customer_id
        where m.public_id = ${methodPublicId} and c.account_id = ${scope.accountId.toString()}
          and c.provider = 'paypal' and c.merchant_id = ${scope.merchantId} and m.merchant_id = c.merchant_id
          and c.environment = ${scope.environment} and m.environment = c.environment
        for update of m
      `;
      const method = rows[0];
      if (!method) throw new Error("payment_not_found");
      // Method then arrangements, matching promotion paths. Lock every reference in stable order.
      const arrangements = await tx<{ id: string; account_id: string; renewal_at: Date; reusable_readiness: string; funding_status: string; entitlement_status: string; current: boolean; merchant_id: string; environment: string; operation_account_id: string }[]>`
        select b.*, b.renewal_at > now() as current, o.merchant_id, o.environment, o.account_id as operation_account_id
        from app_private.billing_arrangements b join app_private.payment_operations o on o.id = b.payment_operation_id
        where b.payment_method_id = ${method.id} order by b.id for update of b
      `;
      if (arrangements.some((b) => b.account_id !== scope.accountId.toString() || b.operation_account_id !== scope.accountId.toString() || b.merchant_id !== scope.merchantId || b.environment !== scope.environment)) throw new Error("payment_not_found");
      const arrangement = arrangements.filter((b) => b.current && b.funding_status === "verified" && ["active", "pending"].includes(b.entitlement_status)).at(-1);
      if (!arrangement) throw new Error("payment_not_found");
      const wallet = project({ ...method, renewal_at: arrangement.renewal_at, reusable_readiness: arrangement.reusable_readiness });
      if (method.removal_state !== "none") return { kind: "existing" as const, wallet };
      if (method.readiness !== "ready" || !method.is_primary) throw new Error("payment_not_found");
      await tx`update app_private.payment_methods set removal_state = 'removing', removal_started_at = now(), readiness = 'failed', is_primary = false, updated_at = now() where id = ${method.id}`;
      await tx`update app_private.billing_arrangements set reusable_readiness = 'failed', updated_at = now() where payment_method_id = ${method.id}`;
      return { kind: "owner" as const, scope, paymentTokenId: method.provider_vault_id, wallet: { ...wallet, state: "removing" as const, renewalReady: false } };
    });
  }

  async finishRemoval(claim: RemovalClaim, outcome: RemovalOutcome): Promise<PayPalWallet> {
    return this.sql.begin(async (tx) => {
      const rows = await tx<{ public_id: string }[]>`
        update app_private.payment_methods m
        set removal_state = ${outcome}, removed_at = ${outcome === "removed" ? new Date() : null}, updated_at = now()
        from app_private.provider_customers c
        where m.public_id = ${claim.wallet.methodId} and m.provider_vault_id = ${claim.paymentTokenId}
          and m.provider_customer_id = c.id and c.account_id = ${claim.scope.accountId.toString()} and c.provider = 'paypal'
          and c.merchant_id = ${claim.scope.merchantId} and m.merchant_id = c.merchant_id
          and c.environment = ${claim.scope.environment} and m.environment = c.environment
          and m.removal_state = 'removing'
        returning m.public_id
      `;
      if (rows.length !== 1) throw new Error("payment_state_conflict");
      return { ...claim.wallet, state: outcome, renewalReady: false };
    });
  }
}

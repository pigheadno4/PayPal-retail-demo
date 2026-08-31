import { randomUUID } from "node:crypto";

import postgres from "postgres";

type FixtureKind = "success" | "failure";

export const task0004Identity = {
  success: {
    userId: "a1000000-0000-4000-8000-000000000004",
    token: "task0004_success_opaque_browser_token_7f31",
  },
  failure: {
    userId: "a2000000-0000-4000-8000-000000000004",
    token: "task0004_failure_opaque_browser_token_91c4",
  },
} as const;

let beforeCounts: { allowances: number; usage: number } | null = null;

function databaseUrl() {
  if (!process.env.DATABASE_URL) throw new Error("TASK-0004 configured Postgres is required");
  return process.env.DATABASE_URL;
}

async function counts(sql: ReturnType<typeof postgres>) {
  const rows = await sql<{ allowances: number; usage: number }[]>`
    select
      (select count(*)::int from app_private.allowance_windows) as allowances,
      (select count(*)::int from app_private.usage_operations) as usage
  `;
  return rows[0]!;
}

async function deleteFixtureRows(sql: ReturnType<typeof postgres>) {
  const userIds = [task0004Identity.success.userId, task0004Identity.failure.userId];
  await sql.begin(async (tx) => {
    const accounts = await tx<{ id: string }[]>`
      select id from app_private.accounts where auth_user_id = any(${userIds})
    `;
    const accountIds = accounts.map((row) => row.id);
    if (accountIds.length) {
      await tx`delete from app_private.usage_operations where account_id = any(${accountIds})`;
      await tx`delete from app_private.allowance_windows where billing_arrangement_id in (
        select id from app_private.billing_arrangements where account_id = any(${accountIds})
      )`;
      await tx`delete from app_private.billing_arrangements where account_id = any(${accountIds})`;
      await tx`delete from app_private.provider_events where payment_operation_id in (
        select id from app_private.payment_operations where account_id = any(${accountIds})
      )`;
      await tx`delete from app_private.payment_methods where provider_customer_id in (
        select id from app_private.provider_customers where account_id = any(${accountIds})
      )`;
      await tx`delete from app_private.provider_customers where account_id = any(${accountIds})`;
      await tx`delete from app_private.payment_operations where account_id = any(${accountIds})`;
      await tx`delete from app_private.quotes where checkout_intent_id in (
        select id from app_private.checkout_intents where account_id = any(${accountIds})
      )`;
      await tx`delete from app_private.checkout_intents where account_id = any(${accountIds})`;
      await tx`delete from app_private.accounts where id = any(${accountIds})`;
    }
    await tx`delete from auth.users where id = any(${userIds})`;
  });
}

export async function cleanupTask0004Fixture() {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  try {
    await deleteFixtureRows(sql);
    if (beforeCounts) {
      const after = await counts(sql);
      if (after.allowances !== beforeCounts.allowances || after.usage !== beforeCounts.usage) {
        throw new Error("TASK-0004 fixture count restoration failed");
      }
      beforeCounts = null;
    }
  } finally {
    await sql.end();
  }
}

export async function seedTask0004Fixture(kind: FixtureKind) {
  const sql = postgres(databaseUrl(), { max: 1, prepare: false });
  const identity = task0004Identity[kind];
  const now = new Date();
  const resetsAt = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
  try {
    beforeCounts = await counts(sql);
    await sql`insert into auth.users (id) values (${identity.userId})`;
    const accounts = await sql<{ id: string }[]>`
      insert into app_private.accounts (public_id, auth_user_id, identity_kind)
      values (${randomUUID()}, ${identity.userId}, 'persistent') returning id
    `;
    const accountId = accounts[0]!.id;
    const intents = await sql<{ id: string }[]>`
      insert into app_private.checkout_intents
        (public_id, anonymous_session_token_hash, account_id, tier, cadence, state)
      values (${randomUUID()}, ${Buffer.alloc(32, kind === "success" ? 4 : 5)},
        ${accountId}, 'go', 'monthly', 'funded') returning id
    `;
    const quotes = await sql<{ id: string }[]>`
      insert into app_private.quotes
        (public_id, checkout_intent_id, currency, base_cents, promotion_cents,
         taxable_subtotal_cents, tax_basis_points, tax_cents, total_cents,
         pricing_version, tax_version, issued_at, expires_at, renews_at,
         allowance_resets_at, time_zone)
      values (${randomUUID()}, ${intents[0]!.id}, 'USD', 1000, -500, 500, 0, 0, 500,
        'task0004-e2e', 'task0004-e2e', ${new Date(now.getTime() - 120_000)},
        ${new Date(now.getTime() - 60_000)}, ${resetsAt}, ${resetsAt},
        'America/Los_Angeles') returning id
    `;
    const payments = await sql<{ id: string }[]>`
      insert into app_private.payment_operations
        (public_id, checkout_intent_id, quote_id, account_id, merchant_id, environment,
         create_request_id, capture_request_id, funding_status, vault_status,
         provider_effective_at, funding_verified_at)
      values (${randomUUID()}, ${intents[0]!.id}, ${quotes[0]!.id}, ${accountId},
        'TASK0004-E2E', 'sandbox', ${`create-${randomUUID()}`}, ${`capture-${randomUUID()}`},
        'completed', 'approved', ${now}, ${now}) returning id
    `;
    await sql`
      insert into app_private.billing_arrangements
        (public_id, account_id, checkout_intent_id, quote_id, payment_operation_id,
         tier, cadence, funding_status, reusable_readiness, entitlement_status,
         renewal_at, allowance_resets_at)
      values (${randomUUID()}, ${accountId}, ${intents[0]!.id}, ${quotes[0]!.id},
        ${payments[0]!.id}, 'go', 'monthly', 'verified', 'pending', 'pending',
        ${resetsAt}, ${resetsAt})
    `;
  } catch (error) {
    await deleteFixtureRows(sql);
    beforeCounts = null;
    throw error;
  } finally {
    await sql.end();
  }
}

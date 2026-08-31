import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "../../db/client.js";
import { PostgresUsageRepository } from "./repository.js";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("TASK-0004 usage repository on actual Postgres", () => {
  it("activates once, commits once, releases failure once, and preserves return state", async () => {
    const sql = createDatabaseClient(databaseUrl!);
    const authUserId = randomUUID();
    const accountPublicId = randomUUID();
    const intentPublicId = randomUUID();
    const quotePublicId = randomUUID();
    const operationPublicId = randomUUID();
    const arrangementPublicId = randomUUID();
    const now = new Date();
    const resetsAt = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
    const repository = new PostgresUsageRepository(sql);
    let accountId = "";
    try {
      await sql`insert into auth.users (id) values (${authUserId})`;
      const accounts = await sql<{ id: string }[]>`
        insert into app_private.accounts (public_id, auth_user_id, identity_kind)
        values (${accountPublicId}, ${authUserId}, 'persistent') returning id
      `;
      accountId = accounts[0]!.id;
      const intents = await sql<{ id: string }[]>`
        insert into app_private.checkout_intents
          (public_id, anonymous_session_token_hash, account_id, tier, cadence, state)
        values (${intentPublicId}, ${Buffer.alloc(32, 1)}, ${accountId}, 'go', 'monthly', 'funded')
        returning id
      `;
      const quotes = await sql<{ id: string }[]>`
        insert into app_private.quotes
          (public_id, checkout_intent_id, currency, base_cents, promotion_cents,
           taxable_subtotal_cents, tax_basis_points, tax_cents, total_cents,
           pricing_version, tax_version, issued_at, expires_at, renews_at,
           allowance_resets_at, time_zone)
        values (${quotePublicId}, ${intents[0]!.id}, 'USD', 1000, -500, 500,
          0, 0, 500, 'task0004', 'task0004', ${new Date(now.getTime() - 120_000)},
          ${new Date(now.getTime() - 60_000)}, ${resetsAt}, ${resetsAt}, 'America/Los_Angeles')
        returning id
      `;
      const paymentOperations = await sql<{ id: string }[]>`
        insert into app_private.payment_operations
          (public_id, checkout_intent_id, quote_id, account_id, merchant_id, environment,
           create_request_id, capture_request_id, funding_status, vault_status,
           provider_effective_at, funding_verified_at)
        values (${operationPublicId}, ${intents[0]!.id}, ${quotes[0]!.id}, ${accountId},
          'TASK0004', 'sandbox', ${`create-${randomUUID()}`}, ${`capture-${randomUUID()}`},
          'completed', 'approved', ${now}, ${now}) returning id
      `;
      await sql`
        insert into app_private.billing_arrangements
          (public_id, account_id, checkout_intent_id, quote_id, payment_operation_id,
           tier, cadence, funding_status, reusable_readiness, entitlement_status,
           renewal_at, allowance_resets_at)
        values (${arrangementPublicId}, ${accountId}, ${intents[0]!.id}, ${quotes[0]!.id},
          ${paymentOperations[0]!.id}, 'go', 'monthly', 'verified', 'pending', 'pending',
          ${resetsAt}, ${resetsAt})
      `;

      const activated = await Promise.all([
        repository.activate(authUserId, now),
        repository.activate(authUserId, now),
      ]);
      expect(activated.map((item) => item.allowance.available)).toEqual([100, 100]);
      const windows = await sql<{ count: number }[]>`
        select count(*)::int as count from app_private.allowance_windows w
        join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
        where b.account_id = ${accountId}
      `;
      expect(windows[0]!.count).toBe(1);

      const answer = { label: "Simulated AI" as const, title: "Renewal recovery playbook", body: ["Fixture"] };
      const failedOperationId = randomUUID();
      await repository.reserve(authUserId, { clientOperationId: failedOperationId, promptKey: "usage-credits", confirmed: true }, now);
      const [released, lateCompletion] = await Promise.all([
        repository.release(authUserId, failedOperationId, now),
        new Promise((resolveDelay) => setTimeout(resolveDelay, 250)).then(() =>
          repository.commit(authUserId, failedOperationId, answer, now)),
      ]);
      expect(released.state).toBe("released");
      expect(lateCompletion.state).toBe("released");
      expect(released.summary.allowance).toEqual({ granted: 100, reserved: 0, committed: 0, available: 100 });

      const clientOperationId = randomUUID();
      const reservations = await Promise.all([
        repository.reserve(authUserId, { clientOperationId, promptKey: "renewal-recovery", confirmed: true }, now),
        repository.reserve(authUserId, { clientOperationId, promptKey: "renewal-recovery", confirmed: true }, now),
      ]);
      expect(reservations.filter((result) => result.ownsRunner)).toHaveLength(1);
      expect(reservations.every((result) => result.outcome.summary.allowance.available === 90)).toBe(true);
      expect((await repository.commit(authUserId, clientOperationId, answer, now)).summary.allowance.available).toBe(90);
      expect((await repository.commit(authUserId, clientOperationId, answer, now)).summary.allowance.available).toBe(90);
      expect((await repository.release(authUserId, clientOperationId, now)).state).toBe("committed");
      expect((await repository.readSummary(authUserId, now)).allowance.available).toBe(90);
    } finally {
      if (accountId) await sql.begin(async (tx) => {
        await tx`delete from app_private.usage_operations where account_id = ${accountId}`;
        await tx`delete from app_private.allowance_windows where billing_arrangement_id in (
          select id from app_private.billing_arrangements where account_id = ${accountId}
        )`;
        await tx`delete from app_private.billing_arrangements where account_id = ${accountId}`;
        await tx`delete from app_private.payment_operations where account_id = ${accountId}`;
        await tx`delete from app_private.quotes where checkout_intent_id in (
          select id from app_private.checkout_intents where account_id = ${accountId}
        )`;
        await tx`delete from app_private.checkout_intents where account_id = ${accountId}`;
        await tx`delete from app_private.accounts where id = ${accountId}`;
        await tx`delete from auth.users where id = ${authUserId}`;
      });
      await sql.end();
    }
  }, 60_000);
});

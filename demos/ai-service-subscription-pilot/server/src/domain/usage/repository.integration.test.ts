import { randomUUID } from "node:crypto";

import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createDatabaseClient } from "../../db/client.js";
import { createUsageRouter } from "../../routes/usage.js";
import { PostgresUsageRepository } from "./repository.js";
import {
  cleanupTask0004Fixture,
  seedTask0004Fixture,
  task0004Identity,
} from "../../../../tests/e2e/support/task0004-fixture.js";
import type { AccountUsageSummary } from "../../../../shared/src/usage.js";
import type { DatabaseClient } from "../../db/client.js";

const databaseUrl = process.env.DATABASE_URL;

function afterFirstAllowanceRead(
  sql: DatabaseClient,
  callback: () => Promise<unknown>,
): DatabaseClient {
  let handled = false;
  const wrap = (client: DatabaseClient): DatabaseClient => new Proxy(client, {
    apply(target, thisArg, argumentsList) {
      const template = argumentsList[0] as TemplateStringsArray;
      const query = Reflect.apply(target, thisArg, argumentsList) as Promise<unknown>;
      if (handled || !template.raw.join(" ").includes("from app_private.allowance_windows w")) {
        return query;
      }
      handled = true;
      return Promise.resolve(query).then(async (rows) => {
        await callback();
        return rows;
      });
    },
    get(target, property, receiver) {
      if (property !== "begin") return Reflect.get(target, property, receiver);
      return (optionsOrCallback: string | ((tx: DatabaseClient) => unknown), maybeCallback?: (tx: DatabaseClient) => unknown) => {
        if (typeof optionsOrCallback === "string") {
          return target.begin(optionsOrCallback, (tx) => maybeCallback!(wrap(tx as unknown as DatabaseClient)));
        }
        return target.begin((tx) => optionsOrCallback(wrap(tx as unknown as DatabaseClient)));
      };
    },
  }) as DatabaseClient;
  return wrap(sql);
}

function expectInternallyCoherent(summary: AccountUsageSummary) {
  const observed = summary.operations.reduce((totals, operation) => {
    if (operation.state === "reserved") totals.reserved += operation.units;
    if (operation.state === "committed") totals.committed += operation.units;
    return totals;
  }, { reserved: 0, committed: 0 });
  expect(summary.allowance.reserved).toBe(observed.reserved);
  expect(summary.allowance.committed).toBe(observed.committed);
  expect(summary.allowance.available).toBe(
    summary.allowance.granted - observed.reserved - observed.committed,
  );
}

describe.skipIf(!databaseUrl)("TASK-0004 usage repository on actual Postgres", () => {
  it("rejects authenticated activation without an owned verified-funded arrangement", async () => {
    const sql = createDatabaseClient(databaseUrl!);
    const now = new Date();
    const resetsAt = new Date(now.getTime() + 30 * 24 * 60 * 60_000);
    const repository = new PostgresUsageRepository(sql);
    const fixtures: Array<Readonly<{
      authUserId: string;
      accountId: string;
    }>> = [];

    try {
      for (const state of ["authentication-only", "browser-approved", "failed"] as const) {
        const authUserId = randomUUID();
        await sql`insert into auth.users (id) values (${authUserId})`;
        const accounts = await sql<{ id: string }[]>`
          insert into app_private.accounts (public_id, auth_user_id, identity_kind)
          values (${randomUUID()}, ${authUserId}, 'persistent') returning id
        `;
        const accountId = accounts[0]!.id;
        fixtures.push({ authUserId, accountId });

        if (state !== "authentication-only") {
          const intents = await sql<{ id: string }[]>`
            insert into app_private.checkout_intents
              (public_id, anonymous_session_token_hash, account_id, tier, cadence, state)
            values (${randomUUID()}, ${Buffer.alloc(32, state === "browser-approved" ? 6 : 7)},
              ${accountId}, 'go', 'monthly', ${state === "browser-approved" ? "payment_pending" : "canceled"})
            returning id
          `;
          const quotes = await sql<{ id: string }[]>`
            insert into app_private.quotes
              (public_id, checkout_intent_id, currency, base_cents, promotion_cents,
               taxable_subtotal_cents, tax_basis_points, tax_cents, total_cents,
               pricing_version, tax_version, issued_at, expires_at, renews_at,
               allowance_resets_at, time_zone)
            values (${randomUUID()}, ${intents[0]!.id}, 'USD', 1000, -500, 500,
              0, 0, 500, 'task0004-negative', 'task0004-negative',
              ${new Date(now.getTime() - 120_000)}, ${new Date(now.getTime() - 60_000)},
              ${resetsAt}, ${resetsAt}, 'America/Los_Angeles') returning id
          `;
          const paymentOperations = await sql<{ id: string }[]>`
            insert into app_private.payment_operations
              (public_id, checkout_intent_id, quote_id, account_id, merchant_id, environment,
               create_request_id, capture_request_id, funding_status, vault_status,
               provider_effective_at, funding_verified_at)
            values (${randomUUID()}, ${intents[0]!.id}, ${quotes[0]!.id}, ${accountId},
              'TASK0004-NEGATIVE', 'sandbox', ${`create-${randomUUID()}`},
              ${`capture-${randomUUID()}`},
              ${state === "browser-approved" ? "approved" : "failed"},
              ${state === "browser-approved" ? "approved" : "failed"}, ${now}, null)
            returning id
          `;
          await sql`
            insert into app_private.billing_arrangements
              (public_id, account_id, checkout_intent_id, quote_id, payment_operation_id,
               tier, cadence, funding_status, reusable_readiness, entitlement_status,
               renewal_at, allowance_resets_at)
            values (${randomUUID()}, ${accountId}, ${intents[0]!.id}, ${quotes[0]!.id},
              ${paymentOperations[0]!.id}, 'go', 'monthly',
              ${state === "browser-approved" ? "pending" : "failed"},
              ${state === "browser-approved" ? "pending" : "failed"}, 'pending',
              ${resetsAt}, ${resetsAt})
          `;
        }

        const server = express().use(express.json()).use(createUsageRouter({
          verifyToken: async (token) => token === `token-${state}`
            ? { userId: authUserId, email: "redacted@example.test" }
            : null,
          activate: (identity) => repository.activate(identity.userId, now),
          readSummary: (identity) => repository.readSummary(identity.userId, now),
          generateAnswer: async () => { throw new Error("not_used"); },
        }));
        const response = await request(server)
          .post("/me/activation")
          .set("Authorization", `Bearer token-${state}`);
        expect(response.status, state).toBe(409);
        expect(response.body, state).toEqual({ error: { code: "usage_not_available" } });

        const rows = await sql<{ allowance_count: number; entitlement_status: string | null }[]>`
          select
            (select count(*)::int from app_private.allowance_windows w
              join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
              where b.account_id = ${accountId}) as allowance_count,
            (select entitlement_status from app_private.billing_arrangements
              where account_id = ${accountId} limit 1) as entitlement_status
        `;
        expect(rows[0]!.allowance_count, state).toBe(0);
        expect(rows[0]!.entitlement_status, state).toBe(
          state === "authentication-only" ? null : "pending",
        );
      }
    } finally {
      for (const fixture of fixtures.reverse()) {
        await sql.begin(async (tx) => {
          await tx`delete from app_private.allowance_windows where billing_arrangement_id in (
            select id from app_private.billing_arrangements where account_id = ${fixture.accountId}
          )`;
          await tx`delete from app_private.billing_arrangements where account_id = ${fixture.accountId}`;
          await tx`delete from app_private.payment_operations where account_id = ${fixture.accountId}`;
          await tx`delete from app_private.quotes where checkout_intent_id in (
            select id from app_private.checkout_intents where account_id = ${fixture.accountId}
          )`;
          await tx`delete from app_private.checkout_intents where account_id = ${fixture.accountId}`;
          await tx`delete from app_private.accounts where id = ${fixture.accountId}`;
          await tx`delete from auth.users where id = ${fixture.authUserId}`;
        });
      }
      await sql.end();
    }
  }, 60_000);

  it("projects PayPal Wallet only from the owned accepted funding relationship", async () => {
    await cleanupTask0004Fixture();
    await seedTask0004Fixture("success");
    const sql = createDatabaseClient(databaseUrl!);
    const repository = new PostgresUsageRepository(sql);
    const now = new Date();
    try {
      await repository.activate(task0004Identity.success.userId, now);
      const clientOperationId = randomUUID();
      await repository.reserve(task0004Identity.success.userId, {
        clientOperationId,
        promptKey: "renewal-recovery",
        confirmed: true,
      }, now);
      await repository.commit(task0004Identity.success.userId, clientOperationId, {
        label: "Simulated AI",
        title: "Renewal recovery playbook",
        body: ["Fixture"],
      }, now);

      const attributed = await repository.readSummary(task0004Identity.success.userId, now);
      expect(attributed.operations.find((operation) => operation.clientOperationId === clientOperationId))
        .toMatchObject({ fundingSource: "PayPal Wallet" });

      await sql`
        update app_private.payment_operations
        set funding_status = 'failed'
        where account_id = (
          select id from app_private.accounts
          where auth_user_id = ${task0004Identity.success.userId}
        )
      `;
      await expect(repository.readSummary(task0004Identity.success.userId, now))
        .rejects.toThrow("usage_not_found");
    } finally {
      await sql.end();
      await cleanupTask0004Fixture();
    }
  }, 60_000);

  it("returns one coherent summary snapshot while reserve and commit change the ledger", async () => {
    await cleanupTask0004Fixture();
    await seedTask0004Fixture("success");
    const sql = createDatabaseClient(databaseUrl!);
    const writer = new PostgresUsageRepository(sql);
    const now = new Date();
    const clientOperationId = randomUUID();
    const requestInput = {
      clientOperationId,
      promptKey: "renewal-recovery" as const,
      confirmed: true as const,
    };
    const answer = {
      label: "Simulated AI" as const,
      title: "Renewal recovery playbook",
      body: ["Fixture"],
    };
    try {
      await writer.activate(task0004Identity.success.userId, now);

      const duringReserve = await new PostgresUsageRepository(afterFirstAllowanceRead(
        sql,
        () => writer.reserve(task0004Identity.success.userId, requestInput, now),
      )).readSummary(task0004Identity.success.userId, now);
      expectInternallyCoherent(duringReserve);
      expect(duringReserve.allowance).toEqual({
        granted: 100,
        reserved: 0,
        committed: 0,
        available: 100,
      });
      expect(duringReserve.operations).toEqual([]);

      const duringCommit = await new PostgresUsageRepository(afterFirstAllowanceRead(
        sql,
        () => writer.commit(task0004Identity.success.userId, clientOperationId, answer, now),
      )).readSummary(task0004Identity.success.userId, now);
      expectInternallyCoherent(duringCommit);
      expect(duringCommit.allowance).toEqual({
        granted: 100,
        reserved: 10,
        committed: 0,
        available: 90,
      });
      expect(duringCommit.operations).toHaveLength(1);
      expect(duringCommit.operations[0]!.state).toBe("reserved");

      const terminal = await writer.readSummary(task0004Identity.success.userId, now);
      expectInternallyCoherent(terminal);
      expect(terminal.allowance).toEqual({
        granted: 100,
        reserved: 0,
        committed: 10,
        available: 90,
      });
    } finally {
      await sql.end();
      await cleanupTask0004Fixture();
    }
  }, 60_000);

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

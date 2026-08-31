import { randomUUID } from "node:crypto";

import type {
  AccountUsageSummary,
  GenerateAnswerOutcome,
  GenerateAnswerRequest,
  PromptKey,
} from "../../../../shared/src/usage.js";
import type { DatabaseClient } from "../../db/client.js";
import { fixtureAnswer, type SimulatedAnswer } from "./fixtures.js";
import {
  UsageNotAvailableError,
  UsageNotFoundError,
  type UsageRepository,
} from "./service.js";

type AllowanceRow = {
  id: string;
  granted_units: string | number;
  reserved_units: string | number;
  committed_units: string | number;
  window_ends_at: Date | string;
};

type OperationRow = {
  client_operation_id: string;
  allowance_window_public_id: string;
  fixture_key: PromptKey;
  units: number | string;
  state: "reserved" | "committed" | "released";
  reserved_at: Date | string;
  completed_at: Date | string | null;
};

type OperationHistoryRow = OperationRow & {
  funding_source: "PayPal Wallet" | null;
};

function totals(row: AllowanceRow) {
  const granted = Number(row.granted_units);
  const reserved = Number(row.reserved_units);
  const committed = Number(row.committed_units);
  return { granted, reserved, committed, available: granted - reserved - committed };
}

function operationDto(row: OperationHistoryRow) {
  if (row.funding_source !== "PayPal Wallet") throw new UsageNotFoundError();
  return {
    clientOperationId: row.client_operation_id,
    allowanceWindowId: row.allowance_window_public_id,
    action: "generate-answer" as const,
    fixtureKey: row.fixture_key,
    units: 10 as const,
    state: row.state,
    fundingSource: row.funding_source,
    reservedAt: new Date(row.reserved_at).toISOString(),
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

export class PostgresUsageRepository implements UsageRepository {
  constructor(private readonly sql: DatabaseClient) {}

  async activate(authUserId: string, now: Date): Promise<AccountUsageSummary> {
    await this.sql.begin(async (tx) => {
      const arrangements = await tx<{
        id: string;
        funding_verified_at: Date | string;
        allowance_resets_at: Date | string;
      }[]>`
        select b.id, p.funding_verified_at, b.allowance_resets_at
        from app_private.billing_arrangements b
        join app_private.accounts a on a.id = b.account_id
        join app_private.payment_operations p on p.id = b.payment_operation_id
        where a.auth_user_id = ${authUserId}
          and b.tier = 'go' and b.cadence = 'monthly'
          and b.funding_status = 'verified'
          and p.funding_status = 'completed'
          and p.funding_verified_at is not null
          and p.funding_verified_at < b.allowance_resets_at
        order by b.id desc
        limit 1
        for update of b
      `;
      const arrangement = arrangements[0];
      if (!arrangement) throw new UsageNotAvailableError();
      await tx`
        insert into app_private.allowance_windows
          (public_id, billing_arrangement_id, window_starts_at, window_ends_at,
           granted_units, reserved_units, committed_units)
        values (${randomUUID()}, ${arrangement.id}, ${arrangement.funding_verified_at},
          ${arrangement.allowance_resets_at}, 100, 0, 0)
        on conflict (billing_arrangement_id, window_starts_at, window_ends_at)
        do update set updated_at = app_private.allowance_windows.updated_at
      `;
      await tx`
        update app_private.billing_arrangements
        set entitlement_status = 'active', updated_at = ${now}
        where id = ${arrangement.id} and funding_status = 'verified'
      `;
    });
    return this.readSummary(authUserId, now);
  }

  async readSummary(authUserId: string, now: Date): Promise<AccountUsageSummary> {
    const allowances = await this.sql<AllowanceRow[]>`
      select w.id, w.granted_units, w.reserved_units, w.committed_units, w.window_ends_at
      from app_private.allowance_windows w
      join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
      join app_private.accounts a on a.id = b.account_id
      where a.auth_user_id = ${authUserId}
        and b.entitlement_status = 'active'
        and w.window_starts_at <= ${now} and w.window_ends_at > ${now}
      order by w.window_starts_at desc, w.id desc limit 1
    `;
    const allowance = allowances[0];
    if (!allowance) throw new UsageNotFoundError();
    const operations = await this.sql<OperationHistoryRow[]>`
      select u.client_operation_id, w.public_id as allowance_window_public_id,
             u.fixture_key, u.units, u.state,
             u.reserved_at, u.completed_at,
             case
               when b.funding_status = 'verified'
                and p.funding_status = 'completed'
                and p.funding_verified_at is not null
                and p.account_id = b.account_id
                and p.checkout_intent_id = b.checkout_intent_id
                and p.quote_id = b.quote_id
               then 'PayPal Wallet'
               else null
             end as funding_source
      from app_private.usage_operations u
      join app_private.allowance_windows w on w.id = u.allowance_window_id
      join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
      join app_private.accounts a on a.id = b.account_id and a.id = u.account_id
      left join app_private.payment_operations p on p.id = b.payment_operation_id
      where u.allowance_window_id = ${allowance.id}
        and a.auth_user_id = ${authUserId}
      order by u.created_at desc, u.id desc limit 20
    `;
    return {
      tier: "go",
      allowance: totals(allowance),
      resetsAt: new Date(allowance.window_ends_at).toISOString(),
      operations: operations.map(operationDto),
    };
  }

  async reserve(
    authUserId: string,
    input: GenerateAnswerRequest,
    now: Date,
  ): Promise<Readonly<{ ownsRunner: boolean; outcome: GenerateAnswerOutcome }>> {
    const existing = await this.sql<{ allowance_window_id: string }[]>`
      select u.allowance_window_id
      from app_private.usage_operations u
      join app_private.accounts a on a.id = u.account_id
      where a.auth_user_id = ${authUserId}
        and u.client_operation_id = ${input.clientOperationId}
      limit 1
    `;
    let ownsRunner = false;
    await this.sql.begin(async (tx) => {
      const allowances = existing[0]
        ? await tx<AllowanceRow[]>`
            select w.id, w.granted_units, w.reserved_units, w.committed_units, w.window_ends_at
            from app_private.allowance_windows w
            join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
            join app_private.accounts a on a.id = b.account_id
            where w.id = ${existing[0].allowance_window_id}
              and a.auth_user_id = ${authUserId}
            for update of w
          `
        : await tx<AllowanceRow[]>`
            select w.id, w.granted_units, w.reserved_units, w.committed_units, w.window_ends_at
            from app_private.allowance_windows w
            join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
            join app_private.accounts a on a.id = b.account_id
            where a.auth_user_id = ${authUserId}
              and b.entitlement_status = 'active'
              and w.window_starts_at <= ${now} and w.window_ends_at > ${now}
            order by w.window_starts_at desc, w.id desc limit 1
            for update of w
          `;
      const allowance = allowances[0];
      if (!allowance) throw new UsageNotFoundError();
      const inserted = await tx<{ id: string }[]>`
        insert into app_private.usage_operations
          (public_id, account_id, allowance_window_id, client_operation_id,
           units, state, fixture_key, reserved_at)
        select ${randomUUID()}, a.id, ${allowance.id}, ${input.clientOperationId},
          10, 'reserved', ${input.promptKey}, ${now}
        from app_private.accounts a where a.auth_user_id = ${authUserId}
        on conflict (account_id, client_operation_id) do nothing
        returning id
      `;
      const operations = await tx<(OperationRow & { allowance_window_id: string })[]>`
        select u.client_operation_id, u.allowance_window_id,
               w.public_id as allowance_window_public_id, u.fixture_key, u.units,
               u.state, u.reserved_at, u.completed_at
        from app_private.usage_operations u
        join app_private.allowance_windows w on w.id = u.allowance_window_id
        join app_private.accounts a on a.id = u.account_id
        where a.auth_user_id = ${authUserId}
          and u.client_operation_id = ${input.clientOperationId}
        for update of u
      `;
      const operation = operations[0];
      if (!operation || operation.allowance_window_id !== allowance.id) {
        throw new UsageNotFoundError();
      }
      ownsRunner = inserted.length === 1;
      if (ownsRunner) {
        if (totals(allowance).available < 10) throw new UsageNotAvailableError();
        await tx`
          update app_private.allowance_windows
          set reserved_units = reserved_units + 10, updated_at = ${now}
          where id = ${allowance.id}
        `;
      }
    });
    return {
      ownsRunner,
      outcome: await this.outcome(authUserId, input.clientOperationId, now),
    };
  }

  async commit(
    authUserId: string,
    clientOperationId: string,
    _answer: SimulatedAnswer,
    now: Date,
  ): Promise<GenerateAnswerOutcome> {
    await this.transition(authUserId, clientOperationId, "committed", now);
    return this.outcome(authUserId, clientOperationId, now);
  }

  async release(
    authUserId: string,
    clientOperationId: string,
    now: Date,
  ): Promise<GenerateAnswerOutcome> {
    await this.transition(authUserId, clientOperationId, "released", now);
    return this.outcome(authUserId, clientOperationId, now);
  }

  private async transition(
    authUserId: string,
    clientOperationId: string,
    terminal: "committed" | "released",
    now: Date,
  ): Promise<void> {
    const resolved = await this.sql<{ allowance_window_id: string }[]>`
      select u.allowance_window_id
      from app_private.usage_operations u
      join app_private.accounts a on a.id = u.account_id
      where a.auth_user_id = ${authUserId}
        and u.client_operation_id = ${clientOperationId}
      limit 1
    `;
    if (!resolved[0]) throw new UsageNotFoundError();
    await this.sql.begin(async (tx) => {
      const allowances = await tx<AllowanceRow[]>`
        select w.id, w.granted_units, w.reserved_units, w.committed_units, w.window_ends_at
        from app_private.allowance_windows w
        join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
        join app_private.accounts a on a.id = b.account_id
        where w.id = ${resolved[0]!.allowance_window_id}
          and a.auth_user_id = ${authUserId}
        for update of w
      `;
      if (!allowances[0]) throw new UsageNotFoundError();
      const operations = await tx<(OperationRow & { id: string })[]>`
        select u.id, u.client_operation_id, w.public_id as allowance_window_public_id,
               u.fixture_key, u.units, u.state,
               u.reserved_at, u.completed_at
        from app_private.usage_operations u
        join app_private.allowance_windows w on w.id = u.allowance_window_id
        join app_private.accounts a on a.id = u.account_id
        where a.auth_user_id = ${authUserId}
          and u.client_operation_id = ${clientOperationId}
        for update of u
      `;
      const operation = operations[0];
      if (!operation) throw new UsageNotFoundError();
      if (operation.state !== "reserved") return;
      await tx`
        update app_private.allowance_windows
        set reserved_units = reserved_units - 10,
            committed_units = committed_units + ${terminal === "committed" ? 10 : 0},
            updated_at = ${now}
        where id = ${resolved[0]!.allowance_window_id}
          and reserved_units >= 10
      `;
      await tx`
        update app_private.usage_operations
        set state = ${terminal}, completed_at = ${now}, updated_at = ${now}
        where id = ${operation.id} and state = 'reserved'
      `;
    });
  }

  private async outcome(
    authUserId: string,
    clientOperationId: string,
    now: Date,
  ): Promise<GenerateAnswerOutcome> {
    const summary = await this.readSummary(authUserId, now);
    const operation = summary.operations.find((item) => item.clientOperationId === clientOperationId);
    if (!operation) throw new UsageNotFoundError();
    if (operation.state === "committed") {
      return { state: "committed", answer: fixtureAnswer(operation.fixtureKey), summary };
    }
    return { state: operation.state, summary };
  }
}

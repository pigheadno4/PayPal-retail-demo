import postgres from "postgres";
import { accountUsageSummarySchema } from "../../shared/src/usage";

export interface AllowanceBaseline { subject: string; accountId: string; records: string[] }
const failure = () => new Error("task0005_allowance_baseline_failed");

export function assertUnchangedAllowance(before: AllowanceBaseline | undefined, after: AllowanceBaseline, subject: string): void {
  if (!before || !before.accountId || !subject || before.subject !== subject || after.subject !== subject
    || before.accountId !== after.accountId || JSON.stringify(before.records) !== JSON.stringify(after.records)) throw failure();
}

export function validateBaselineConfiguration(environment: Record<string, string | undefined>): { issuer: string; databaseUrl: string } {
  try {
    const databaseUrl = environment.DATABASE_URL;
    const supplied = [environment.SUPABASE_URL, environment.VITE_SUPABASE_URL, environment.NEXT_PUBLIC_SUPABASE_URL].filter(Boolean);
    if (!databaseUrl || !supplied.length || supplied.some((value) => value !== supplied[0])) throw failure();
    const auth = new URL(supplied[0]!);
    if (auth.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(auth.hostname)
      || auth.pathname !== "/" || auth.search || auth.hash || auth.username || auth.password) throw failure();
    const project = auth.hostname.split(".")[0];
    const database = new URL(databaseUrl);
    if (!["postgres:", "postgresql:"].includes(database.protocol) || database.pathname !== "/postgres") throw failure();
    const direct = database.hostname === `db.${project}.supabase.co` && database.username === "postgres";
    const pooler = /^[a-z0-9-]+\.pooler\.supabase\.com$/.test(database.hostname) && database.username === `postgres.${project}`;
    if ((!direct && !pooler) || database.search || database.hash) throw failure();
    return { issuer: `${auth.origin}/auth/v1`, databaseUrl };
  } catch { throw failure(); }
}

export function validatePersistentSummary(status: number, body: unknown): void {
  if (status === 200 && accountUsageSummarySchema.safeParse(body).success) return;
  if (status === 404 && JSON.stringify(body) === '{"error":{"code":"not_found"}}') return;
  throw failure();
}

// Only SELECTs in an explicitly read-only snapshot. No auth tokens or OTP are read.
// row_security=off fails instead of silently returning an RLS-filtered empty baseline.
export async function readAllowanceBaseline(email: string, environment: Record<string, string | undefined> = process.env): Promise<AllowanceBaseline> {
  const { databaseUrl } = validateBaselineConfiguration(environment);
  let sql: ReturnType<typeof postgres> | undefined;
  try {
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw failure();
    sql = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 1,
      ssl: "verify-full", onnotice: () => undefined,
      connection: { statement_timeout: 10000, lock_timeout: 5000, idle_in_transaction_session_timeout: 15000 } });
    const snapshot = await sql.begin("isolation level repeatable read read only", async (tx) => {
      await tx`set local row_security = off`;
      const accounts = await tx<{ subject: string; account_id: string }[]>`
        select u.id::text as subject, a.id::text as account_id
        from auth.users u join app_private.accounts a on a.auth_user_id = u.id
        where lower(u.email) = lower(${email}) and a.identity_kind = 'persistent'
        limit 2`;
      if (accounts.length !== 1) throw failure();
      const account = accounts[0]!;
      const rows = await tx<{ record: string }[]>`
        select 'billing:' || to_jsonb(b)::text as record from app_private.billing_arrangements b
        where b.account_id = ${account.account_id}
        union all
        select 'allowance:' || to_jsonb(w)::text as record from app_private.allowance_windows w
        join app_private.billing_arrangements b on b.id = w.billing_arrangement_id
        where b.account_id = ${account.account_id}
        order by record`;
      return { subject: account.subject, accountId: account.account_id, records: rows.map((row) => row.record) };
    });
    return snapshot;
  } catch { throw failure(); }
  finally { if (sql) await sql.end({ timeout: 5 }).catch(() => { throw failure(); }); }
}

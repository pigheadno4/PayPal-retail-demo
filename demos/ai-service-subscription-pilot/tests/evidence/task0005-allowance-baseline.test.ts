import { describe, expect, it, vi } from "vitest";
import postgres from "postgres";
import { assertUnchangedAllowance, readAllowanceBaseline, validateBaselineConfiguration, validatePersistentSummary } from "./task0005-allowance-baseline";

vi.mock("postgres", () => ({ default: vi.fn() }));

const subject = "00000000-0000-4000-8000-000000000001";
const baseline = { subject, accountId: "1", records: ["billing:1:active", "allowance:1:100:0:0"] };
const config = { DATABASE_URL: "postgres://postgres.project:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres", SUPABASE_URL: "https://project.supabase.co" };
const summary = { tier: "go", allowance: { granted: 100, reserved: 0, committed: 0, available: 100 }, resetsAt: "2026-10-01T00:00:00.000Z", operations: [] };

describe("TASK-0005 persistent allowance baseline", () => {
  it("sanitizes database query failures and closes the connection", async () => {
    const end = vi.fn().mockResolvedValue(undefined);
    const begin = vi.fn().mockRejectedValue(new Error("private-account raw-provider-error"));
    vi.mocked(postgres).mockReturnValue({ begin, end } as unknown as ReturnType<typeof postgres>);
    await expect(readAllowanceBaseline("fixture@example.com", config)).rejects.toThrow(/^task0005_allowance_baseline_failed$/);
    expect(begin).toHaveBeenCalledWith("isolation level repeatable read read only", expect.any(Function));
    expect(end).toHaveBeenCalledWith({ timeout: 5 });
  });
  it("accepts unchanged existing allowance instead of requiring a virgin account", () => {
    expect(() => assertUnchangedAllowance(baseline, structuredClone(baseline), subject)).not.toThrow();
  });
  it("accepts an account with no allowance records", () => {
    expect(() => assertUnchangedAllowance({ ...baseline, records: [] }, { ...baseline, records: [] }, subject)).not.toThrow();
  });
  it.each([
    [...baseline.records, "allowance:2:100:0:0"],
    ["billing:1:active", "allowance:1:100:0:10"],
    ["billing:1:suspended", baseline.records[1]],
    [baseline.records[0]],
  ])("rejects added, changed or deleted entitlement/allowance records", (...records) => {
    expect(() => assertUnchangedAllowance(baseline, { ...baseline, records: records as string[] }, subject)).toThrow("task0005_allowance_baseline_failed");
  });
  it.each([undefined, { ...baseline, subject: "wrong" }, { ...baseline, accountId: "" }])("rejects missing or wrong baseline identity", (before) => {
    expect(() => assertUnchangedAllowance(before, baseline, subject)).toThrow("task0005_allowance_baseline_failed");
  });
  it("rejects changed account and wrong verified subject without disclosing data", () => {
    for (const action of [
      () => assertUnchangedAllowance(baseline, { ...baseline, accountId: "private-other-account" }, subject),
      () => assertUnchangedAllowance(baseline, baseline, "private-subject"),
    ]) {
      try { action(); throw new Error("unexpected_success"); }
      catch (error) { expect((error as Error).message).toBe("task0005_allowance_baseline_failed"); }
    }
  });
  it("accepts valid existing summary or generic absence", () => {
    expect(() => validatePersistentSummary(200, summary)).not.toThrow();
    expect(() => validatePersistentSummary(404, { error: { code: "not_found" } })).not.toThrow();
  });
  it.each([[500, summary], [200, { secret: "raw-provider" }], [404, { error: { code: "not_found", secret: "raw-provider" } }]])("rejects unexpected summary status/body safely", (status, body) => {
    expect(() => validatePersistentSummary(status as number, body)).toThrow("task0005_allowance_baseline_failed");
  });
  it("accepts matching direct and pooler project configuration", () => {
    expect(validateBaselineConfiguration(config).issuer).toBe("https://project.supabase.co/auth/v1");
    expect(() => validateBaselineConfiguration({ ...config, DATABASE_URL: "postgres://postgres:secret@db.project.supabase.co:5432/postgres" })).not.toThrow();
  });
  it.each([{}, { ...config, SUPABASE_URL: "https://wrong.supabase.co" }, { ...config, DATABASE_URL: "postgres://postgres.project:secret@untrusted.example/postgres" }])("fails closed on missing or mismatched database configuration", (environment) => {
    expect(() => validateBaselineConfiguration(environment)).toThrow("task0005_allowance_baseline_failed");
  });
});

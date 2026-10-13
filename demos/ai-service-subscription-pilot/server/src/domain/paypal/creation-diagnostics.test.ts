import { describe, expect, it, vi } from "vitest";
import { emitCreationDiagnostic, safeCreationIssues, type CreationDiagnostic } from "./creation-diagnostics.js";

describe("initial creation issue output filtering", () => {
  const additions = ["NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE", "MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE", "MISMATCHED_VAULT_SETUP_TOKEN_TO_PAYMENT_SOURCE", "INVALID_VAULT_ID", "NOT_ENABLED_FOR_PAYMENT_SOURCE", "AGREEMENT_ALREADY_CANCELLED", "BILLING_AGREEMENT_NOT_FOUND", "DUPLICATE_INVOICE_ID", "PAYER_ACCOUNT_LOCKED_OR_CLOSED", "PAYER_ACCOUNT_RESTRICTED", "PAYER_CANNOT_PAY"];
  it.each(additions)("retains documented Create order label %s", issue => {
    expect(safeCreationIssues([issue, issue])).toEqual([issue]);
  });
  it("keeps first-seen order and immutable bounded output", () => {
    const result = safeCreationIssues([...additions, ...additions, ...Array.from({ length: 1000 }, (_, i) => `private-${i}`)]);
    expect(result).toEqual([...additions, "unknown_issue"]);
    expect(result.length).toBeLessThanOrEqual(49);
    expect(Object.isFrozen(result)).toBe(true);
  });
  it.each(["recognized", "json_parse_failed", "details_missing", "unrecognized_issue"])("permits fixed reason %s only on failed create response", issueDiagnostic => {
    const sink = vi.fn();
    for (const [stage, outcome] of [["create_response", "failure"], ["create_response", "success"], ["oauth", "failure"]] as const) {
      emitCreationDiagnostic(sink, { stage, outcome, category: "http", issueDiagnostic } as CreationDiagnostic);
    }
    expect(sink.mock.calls[0][0]).toHaveProperty("issueDiagnostic", issueDiagnostic);
    expect(sink.mock.calls[1][0]).not.toHaveProperty("issueDiagnostic");
    expect(sink.mock.calls[2][0]).not.toHaveProperty("issueDiagnostic");
  });
  it.each(["private-secret", " recognized", null, 1, {}, ["recognized"]])("strips hostile runtime reason %#", issueDiagnostic => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", issueDiagnostic } as unknown as CreationDiagnostic);
    expect(sink.mock.calls[0][0]).toEqual({ stage: "create_response", outcome: "failure", category: "http" });
  });
  it("filters hostile values and deduplicates at the sink boundary", () => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", httpStatus: 422,
      issues: ["AMOUNT_MISMATCH", "AMOUNT_MISMATCH", "PRIVATE\nCANARY", "INSTRUMENT_DECLINED", "unknown_issue", "INSTRUMENT_DECLINED"] });
    expect(sink.mock.calls).toEqual([[{ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues: ["AMOUNT_MISMATCH", "unknown_issue", "INSTRUMENT_DECLINED"] }]]);
  });
  it("bounds output by fixed enum count, not attacker input cardinality", () => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", issues: Array.from({ length: 1000 }, (_, index) => `private-${index}`) });
    expect(sink.mock.calls[0][0].issues).toEqual(["unknown_issue"]);
  });
  it("recognizes billing item mismatch while redacting hostile lookalikes at the sink", () => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", httpStatus: 422,
      issues: ["BILLING_ITEM_AMOUNT_MISMATCH", "BILLING_ITEM_AMOUNT_MISMATCH", "BILLING_ITEM_AMOUNT_MISMATCH\nprivate-canary", { issue: "BILLING_ITEM_AMOUNT_MISMATCH" }] } as unknown as CreationDiagnostic);
    expect(sink.mock.calls).toEqual([[{ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues: ["BILLING_ITEM_AMOUNT_MISMATCH", "unknown_issue"] }]]);
    expect(Object.isFrozen(sink.mock.calls[0][0].issues)).toBe(true);
  });
  it("excludes issue enrichment on success and unrelated stages", () => {
    const sink = vi.fn();
    for (const record of [
      { stage: "create_response", outcome: "success", category: "none", issues: ["AMOUNT_MISMATCH"] },
      { stage: "review", outcome: "failure", category: "exception", issues: ["AMOUNT_MISMATCH"] },
    ] as const) emitCreationDiagnostic(sink, record);
    expect(sink.mock.calls.map(([record]) => Object.keys(record))).toEqual([["stage", "outcome", "category"], ["stage", "outcome", "category"]]);
  });
  it("does not pass extra raw fields through or fail payment if the sink throws", () => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", httpStatus: 422,
      issues: [null, 2, ["AMOUNT_MISMATCH"], "private-secret"], debug_id: "private-id", body: "private-body" } as unknown as CreationDiagnostic);
    expect(sink.mock.calls[0][0]).toEqual({ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues: ["unknown_issue"] });
    expect(() => emitCreationDiagnostic(() => { throw new Error("private-sink"); }, sink.mock.calls[0][0])).not.toThrow();
  });
});

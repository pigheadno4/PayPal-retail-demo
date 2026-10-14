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
    expect(result.length).toBeLessThanOrEqual(51);
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
  it("recognizes only literal vault URL issues and redacts hostile fields", () => {
    const sink = vi.fn();
    emitCreationDiagnostic(sink, { stage: "create_response", outcome: "failure", category: "http", httpStatus: 422,
      issues: ["RETURN_URL_REQUIRED", "CANCEL_URL_REQUIRED", "RETURN_URL_REQUIRED", "RETURN_URL_REQUIRED\nprivate-token", { issue: "CANCEL_URL_REQUIRED" }],
      debug_id: "private-id", url: "https://private.invalid/token", details: "private-details" } as unknown as CreationDiagnostic);
    expect(sink.mock.calls).toEqual([[{ stage: "create_response", outcome: "failure", category: "http", httpStatus: 422, issues: ["RETURN_URL_REQUIRED", "CANCEL_URL_REQUIRED", "unknown_issue"] }]]);
    expect(Object.isFrozen(sink.mock.calls[0][0].issues)).toBe(true);
  });
  it("retains the complete fixed safe label set plus only one unknown marker", () => {
    const labels = [
      "PREVIOUS_REQUEST_IN_PROGRESS", "INVALID_ACCOUNT_STATUS", "INVALID_ARRAY_MAX_ITEMS", "INVALID_ARRAY_MIN_ITEMS",
      "INVALID_COUNTRY_CODE", "INVALID_PARAMETER_SYNTAX", "INVALID_STRING_LENGTH", "INVALID_PARAMETER_VALUE",
      "MISSING_REQUIRED_PARAMETER", "NOT_SUPPORTED", "PAYPAL_REQUEST_ID_REQUIRED", "MALFORMED_REQUEST_JSON",
      "PERMISSION_DENIED", "MALFORMED_REQUEST", "PAYEE_NOT_CONSENTED", "AMOUNT_MISMATCH",
      "BILLING_AGREEMENTS_CANNOT_BE_USED_FOR_SUBSCRIPTIONS", "DECIMAL_PRECISION", "INVALID_CURRENCY_CODE",
      "ITEM_TOTAL_MISMATCH", "ITEM_TOTAL_REQUIRED", "PAYMENT_DENIED", "PAYEE_ACCOUNT_INVALID",
      "PAYEE_ACCOUNT_LOCKED_OR_CLOSED", "PAYEE_ACCOUNT_RESTRICTED", "PAYMENT_ORIGIN_NOT_ENABLED",
      "UNSUPPORTED_PAYMENT_SOURCE_FOR_SUBSCRIPTIONS", "TAX_TOTAL_MISMATCH", "TAX_TOTAL_REQUIRED",
      "UNSUPPORTED_INTENT", "INSTRUMENT_DECLINED", "INCOMPATIBLE_PARAMETER_VALUE",
      "VAULT_INSTRUCTION_DUPLICATED", "VAULT_INSTRUCTION_REQUIRED", "MISMATCHED_VAULT_OWNER_ID", "VAULT_OWNER_ID_NOT_SUPPORTED",
      ...additions, "BILLING_ITEM_AMOUNT_MISMATCH", "RETURN_URL_REQUIRED", "CANCEL_URL_REQUIRED",
    ];
    const result = safeCreationIssues([...labels, ...labels, ...Array.from({ length: 1000 }, (_, index) => `private-${index}`)]);
    expect(result).toEqual([...labels, "unknown_issue"]);
    expect(result).toHaveLength(51);
    expect(Object.isFrozen(result)).toBe(true);
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

import { describe, expect, it, vi } from "vitest";
import { emitCreationDiagnostic, type CreationDiagnostic } from "./creation-diagnostics.js";

describe("initial creation issue output filtering", () => {
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

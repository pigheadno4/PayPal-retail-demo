import { describe, expect, it } from "vitest";

import {
  accountUsageSummarySchema,
  generateAnswerRequestSchema,
  generateAnswerOutcomeSchema,
} from "./usage.js";

describe("usage contracts", () => {
  it("accepts only a confirmed curated prompt and no caller-owned cost", () => {
    expect(generateAnswerRequestSchema.parse({
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
    })).toEqual({
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
    });
    expect(() => generateAnswerRequestSchema.parse({
      clientOperationId: "11111111-1111-4111-8111-111111111111",
      promptKey: "renewal-recovery",
      confirmed: true,
      units: 1,
    })).toThrow();
  });

  it("keeps released results answer-free and summaries client-safe", () => {
    const released = generateAnswerOutcomeSchema.parse({
      state: "released",
      summary: {
        tier: "go",
        allowance: { granted: 100, reserved: 0, committed: 0, available: 100 },
        resetsAt: "2026-09-30T00:00:00.000Z",
        operations: [],
      },
    });
    expect(released).not.toHaveProperty("answer");
    expect(() => generateAnswerOutcomeSchema.parse({ ...released, answer: "must not leak" })).toThrow();
    expect(accountUsageSummarySchema.parse(released.summary).allowance.available).toBe(100);
  });

  it("retains the sanitized allowance-window reference in usage history", () => {
    const parsed = accountUsageSummarySchema.parse({
      tier: "go",
      allowance: { granted: 100, reserved: 0, committed: 10, available: 90 },
      resetsAt: "2026-09-30T00:00:00.000Z",
      operations: [{
        clientOperationId: "11111111-1111-4111-8111-111111111111",
        allowanceWindowId: "22222222-2222-4222-8222-222222222222",
        action: "generate-answer",
        fixtureKey: "renewal-recovery",
        units: 10,
        state: "committed",
        fundingSource: "PayPal Wallet",
        reservedAt: "2026-08-31T00:00:00.000Z",
        completedAt: "2026-08-31T00:00:04.000Z",
      }],
    });
    expect(parsed.operations[0]!.allowanceWindowId).toBe("22222222-2222-4222-8222-222222222222");
  });
});

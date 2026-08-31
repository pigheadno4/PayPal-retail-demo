import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import type { AccountUsageSummary } from "../../../shared/src/usage.js";
import { createUsageRouter } from "./usage.js";

const summary: AccountUsageSummary = {
  tier: "go",
  allowance: { granted: 100, reserved: 0, committed: 0, available: 100 },
  resetsAt: "2026-09-30T00:00:00.000Z",
  operations: [],
};

function app(overrides: Partial<Parameters<typeof createUsageRouter>[0]> = {}) {
  const dependencies = {
    verifyToken: vi.fn(async (token: string) => token === "verified"
      ? { userId: "11111111-1111-4111-8111-111111111111", email: "redacted@example.test" }
      : null),
    activate: vi.fn().mockResolvedValue(summary),
    readSummary: vi.fn().mockResolvedValue(summary),
    generateAnswer: vi.fn().mockResolvedValue({ state: "reserved", summary }),
    ...overrides,
  };
  const server = express().use(express.json()).use(createUsageRouter(dependencies));
  return { server, dependencies };
}

describe("usage routes", () => {
  it("requires bearer auth and keeps activation and summary private/no-store", async () => {
    expect((await request(app().server).post("/me/activation")).status).toBe(401);
    const activation = await request(app().server).post("/me/activation").set("Authorization", "Bearer verified");
    const read = await request(app().server).get("/me/summary").set("Authorization", "Bearer verified");
    expect(activation.status).toBe(200);
    expect(read.status).toBe(200);
    expect(activation.headers["cache-control"]).toBe("private, no-store");
    expect(activation.body.allowance.available).toBe(100);
  });

  it("rejects caller-controlled cost and maps a reserved duplicate to 202", async () => {
    const { server, dependencies } = app();
    const invalid = await request(server).post("/usage/generate-answer")
      .set("Authorization", "Bearer verified")
      .send({
        clientOperationId: "22222222-2222-4222-8222-222222222222",
        promptKey: "renewal-recovery",
        confirmed: true,
        units: 1,
      });
    const reserved = await request(server).post("/usage/generate-answer")
      .set("Authorization", "Bearer verified")
      .send({
        clientOperationId: "22222222-2222-4222-8222-222222222222",
        promptKey: "renewal-recovery",
        confirmed: true,
      });
    expect(invalid.status).toBe(400);
    expect(reserved.status).toBe(202);
    expect(dependencies.generateAnswer).toHaveBeenCalledOnce();
  });

  it("maps unknown and unavailable state without enumeration", async () => {
    const missing = app({ activate: vi.fn().mockRejectedValue(new Error("usage_not_found")) });
    const unavailable = app({ activate: vi.fn().mockRejectedValue(new Error("usage_not_available")) });
    expect((await request(missing.server).post("/me/activation").set("Authorization", "Bearer verified")).body)
      .toEqual({ error: { code: "not_found" } });
    expect((await request(unavailable.server).post("/me/activation").set("Authorization", "Bearer verified")).body)
      .toEqual({ error: { code: "usage_not_available" } });
  });
});

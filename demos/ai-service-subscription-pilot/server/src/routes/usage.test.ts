import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  afterEach(() => vi.restoreAllMocks());

  for (const [method, path, dependency, operation] of [
    ["get", "/me/summary", "readSummary", "summary"],
    ["post", "/me/activation", "activate", "activation"],
  ] as const) {
    for (const fixture of [
      { name: "success", status: 200, code: "ok", value: summary },
      { name: "missing", status: 404, code: "not_found", error: new Error("usage_not_found") },
      { name: "unavailable", status: 409, code: "usage_not_available", error: new Error("usage_not_available") },
      { name: "unsafe failure", status: 500, code: "internal_error", error: new Error("fixture-secret alice@example.test SELECT provider-private") },
      { name: "invalid schema", status: 500, code: "internal_error", value: { tier: "fixture-secret" } },
      { name: "unauthorized", status: 401, code: "authentication_required", value: summary },
    ]) {
      it(`${operation}: reports ${fixture.name} once without leaking private input`, async () => {
        const log = vi.spyOn(console, "info").mockImplementation(() => {});
        const service = fixture.error
          ? vi.fn().mockRejectedValue(fixture.error)
          : vi.fn().mockResolvedValue(fixture.value);
        const server = app({ [dependency]: service }).server;
        const pending = request(server)[method](path)
          .set("X-Request-Id", "caller-private-marker")
          .set("Cookie", "private-cookie=fixture-secret")
          .send({ privateBody: "fixture-secret" });
        if (fixture.status !== 401) pending.set("Authorization", "Bearer verified");
        const response = await pending;
        expect(response.status).toBe(fixture.status);
        expect(response.body).toEqual(fixture.status === 200 ? summary : { error: { code: fixture.code } });
        expect(response.headers["cache-control"]).toBe("private, no-store");
        expect(response.headers["x-request-id"]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(log).toHaveBeenCalledOnce();
        expect(log.mock.calls[0]).toHaveLength(1);
        const diagnostic = JSON.parse(log.mock.calls[0]![0] as string);
        expect(diagnostic).toEqual({
          event: "workspace_request", correlationId: response.headers["x-request-id"],
          operation, status: fixture.status, elapsedMs: expect.any(Number), code: fixture.code,
        });
        expect(diagnostic.elapsedMs).toBeGreaterThanOrEqual(0);
        const serialized = JSON.stringify(log.mock.calls);
        for (const unsafe of ["fixture-secret", "alice@example.test", "redacted@example.test", "11111111", "verified", "private-cookie", "caller-private-marker", "SELECT", "provider-private"]) {
          expect(serialized).not.toContain(unsafe);
        }
      });
    }
  }

  it("does not instrument other paths or wrong methods", async () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => {});
    const server = app().server;
    for (const path of ["/me/summary/extra", "/me/activation", "/usage/generate-answer"]) {
      await request(server).get(path);
    }
    await request(server).post("/usage/generate-answer");
    expect(log).not.toHaveBeenCalled();
  });
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

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createIdentityRouter, DEMO_SESSION_COOKIE } from "./identity";
import type { OtpTiming } from "../domain/auth/otp-timing";

const intentId = "11111111-1111-4111-8111-111111111111";
const review = {
  intentId,
  quoteId: "22222222-2222-4222-8222-222222222222",
  tier: "go" as const,
  cadence: "monthly" as const,
  base: { currency: "USD" as const, cents: 1000 },
  promotion: { currency: "USD" as const, cents: -500 },
  taxableSubtotal: { currency: "USD" as const, cents: 500 },
  taxBasisPoints: 1055 as const,
  tax: { currency: "USD" as const, cents: 53 },
  dueToday: { currency: "USD" as const, cents: 553 },
  expiresAt: "2026-07-15T19:15:00.000Z",
  renewsAt: "2026-08-15T19:00:00.000Z",
  allowanceResetsAt: "2026-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles" as const,
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

function app(overrides: Record<string, unknown> = {}) {
  const dependencies = {
    createIntent: vi.fn().mockResolvedValue({
      response: { intentId, tier: "go", cadence: "monthly", state: "selected" },
      cookieValue: "signed-origin",
      cookieExpiresAt: new Date("2026-07-16T19:00:00.000Z"),
    }),
    createDemoSession: vi.fn().mockResolvedValue({
      email: "demo-redacted@test",
      expiresAt: "2026-07-16T19:00:00.000Z",
    }),
    requestOtp: vi.fn().mockResolvedValue({ accepted: true }),
    retrieveOtp: vi.fn().mockResolvedValue({
      otp: "385104",
      expiresAt: "2026-07-15T19:05:00.000Z",
    }),
    resume: vi.fn().mockResolvedValue(review),
    verifyToken: vi.fn().mockResolvedValue({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "customer@example.com",
    }),
    ...overrides,
  };
  const server = express();
  server.use(express.json(), createIdentityRouter(dependencies));
  return { server, dependencies };
}

describe("identity routes", () => {
  it.each(["normal", "unavailable", "missing"])("reports request finish and close for %s without private data", async (mode) => {
    const rows: Record<string, unknown>[] = [];
    const { server } = app({
      otpTimingSink: (row: Record<string, unknown>) => { rows.push(row); },
      retrieveOtp: async (_cookie: string, timing: OtpTiming) => {
        timing("lookup_start");
        timing("lookup_end");
        if (mode === "unavailable") throw new Error("private-error-fixture");
        return { otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" };
      },
    });
    const call = request(server).get("/demo-sessions/otp?private=fixture")
      .set("X-Request-Id", "client-marker-fixture");
    if (mode !== "missing") call.set("Cookie", `${DEMO_SESSION_COOKIE}=private-cookie-fixture`);
    const response = await call;
    expect(response.status).toBe(mode === "normal" ? 200 : 404);
    expect(response.body).toEqual(mode === "normal"
      ? { otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" }
      : { error: { code: "not_found" } });
    expect(rows.map((row) => row.stage)).toEqual(mode === "missing"
      ? ["request_entry", "response_finish", "response_close"]
      : ["request_entry", "lookup_start", "lookup_end", "response_finish", "response_close"]);
    expect(new Set(rows.map((row) => row.requestMarker)).size).toBe(1);
    expect(JSON.stringify(rows)).not.toMatch(/fixture|385104|2026-07|not_found/);
  });

  it.each([false, true])("keeps response behavior when logging rejects, unavailable=%s", async (unavailable) => {
    const { server } = app({
      otpTimingSink: async () => { throw new Error("private-logger-error"); },
      retrieveOtp: async () => {
        if (unavailable) throw new Error("private-service-error");
        return { otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" };
      },
    });
    const response = await request(server).get("/demo-sessions/otp")
      .set("Cookie", `${DEMO_SESSION_COOKIE}=signed-origin`);
    expect(response.status).toBe(unavailable ? 404 : 200);
  });

  it("retains OTP acceptance even when diagnostic output throws", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => { throw new Error("logger unavailable"); });
    try {
      const { server } = app({ requestOtp: async () => { throw new Error("provider unavailable"); } });
      const response = await request(server).post("/auth/request-otp")
        .set("Cookie", `${DEMO_SESSION_COOKIE}=signed-origin`)
        .send({ intentId, identityRoute: "persistent", email: "customer@example.com" });
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ accepted: true });
    } finally { output.mockRestore(); }
  });
  it("logs swallowed OTP failure without changing constant acceptance or leaking data", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      const { server } = app({ requestOtp: async () => { throw new Error("secret@example.test OTP=123456"); } });
      const response = await request(server).post("/auth/request-otp")
        .set("Cookie", `${DEMO_SESSION_COOKIE}=signed-origin`)
        .send({ intentId, identityRoute: "persistent", email: "customer@example.com" });
      expect(response.status).toBe(202);
      expect(response.body).toEqual({ accepted: true });
      expect(output.mock.calls.map(([line]) => JSON.parse(line as string))).toContainEqual({
        correlationId: expect.any(String), stage: "otp_request", status: 202, code: "otp_request_failed",
      });
      expect(JSON.stringify(output.mock.calls)).not.toMatch(/secret@example|123456|signed-origin/);
    } finally { output.mockRestore(); }
  });
  it.each([true, false])("enforces the server cookie policy, secure=%s", async (secureCookies) => {
    const { server } = app({ secureCookies });
    const response = await request(server).post("/checkout-intents")
      .set("X-Forwarded-Proto", secureCookies ? "http" : "https")
      .send({ secureCookies: !secureCookies });
    const cookie = response.headers["set-cookie"]?.[0] ?? "";
    expect(cookie.includes("; Secure")).toBe(secureCookies);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Expires=");
    expect(response.headers["cache-control"]).toBe("private, no-store");
  });

  it("catches exposing anything beyond one selection and exact cookie attributes", async () => {
    const { server } = app();
    const response = await request(server).post("/checkout-intents");

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ intentId, tier: "go", cadence: "monthly", state: "selected" });
    expect(response.headers["set-cookie"]?.[0]).toContain(`${DEMO_SESSION_COOKIE}=`);
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
    expect(response.headers["set-cookie"]?.[0]).toContain("Path=/");
  });

  it("keeps temporary session and OTP retrieval bound to the signed cookie", async () => {
    const { server, dependencies } = app();
    const cookie = `${DEMO_SESSION_COOKIE}=signed-origin`;

    const session = await request(server).post("/demo-sessions").set("Cookie", cookie);
    const otp = await request(server).get("/demo-sessions/otp").set("Cookie", cookie);

    expect(session.status).toBe(201);
    expect(session.body.email).toBe("demo-redacted@test");
    expect(otp.status).toBe(200);
    expect(otp.headers["cache-control"]).toBe("private, no-store");
    expect(dependencies.createDemoSession).toHaveBeenCalledWith("signed-origin");
    expect(dependencies.retrieveOtp).toHaveBeenCalledWith("signed-origin", expect.any(Function));
  });

  it("returns constant OTP acceptance and requires both bearer and origin to resume", async () => {
    const { server, dependencies } = app();
    const cookie = `${DEMO_SESSION_COOKIE}=signed-origin`;
    const requestResponse = await request(server)
      .post("/auth/request-otp")
      .set("Cookie", cookie)
      .send({ intentId, identityRoute: "persistent", email: "customer@example.com" });
    const missingBearer = await request(server)
      .post(`/checkout-intents/${intentId}/resume`)
      .set("Cookie", cookie);
    const resumed = await request(server)
      .post(`/checkout-intents/${intentId}/resume`)
      .set("Cookie", cookie)
      .set("Authorization", "Bearer verified");

    expect(requestResponse.status).toBe(202);
    expect(requestResponse.body).toEqual({ accepted: true });
    expect(missingBearer.status).toBe(401);
    expect(resumed.status).toBe(200);
    expect(resumed.body.dueToday.cents).toBe(553);
    expect(dependencies.resume).toHaveBeenCalledWith(expect.objectContaining({
      intentId,
      cookieValue: "signed-origin",
      verifiedUser: { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "customer@example.com" },
    }));
  });

  it("uses one non-enumerating response for unavailable demo origins", async () => {
    const { server } = app({
      createDemoSession: vi.fn().mockRejectedValue(new Error("private-detail")),
      retrieveOtp: vi.fn().mockRejectedValue(new Error("private-detail")),
    });

    const session = await request(server).post("/demo-sessions");
    const otp = await request(server).get("/demo-sessions/otp");

    expect(session.status).toBe(404);
    expect(otp.status).toBe(404);
    expect(session.body).toEqual({ error: { code: "not_found" } });
    expect(otp.body).toEqual({ error: { code: "not_found" } });
    expect(session.text).not.toContain("private-detail");
  });
});

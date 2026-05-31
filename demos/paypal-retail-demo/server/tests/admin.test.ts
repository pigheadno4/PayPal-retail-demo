import type { NextFunction, Response } from "express";
import { describe, expect, it } from "vitest";

import {
  type AdminRequest,
  createAdminSessionGuard,
  createAdminSessionToken,
} from "../src/middleware/admin.js";

describe("admin session guard", () => {
  it("accepts a signed admin session token and stores admin context", () => {
    const token = createAdminSessionToken({
      adminPasscode: "local-admin-passcode",
      sessionId: "session_123",
      expiresAt: "2026-05-31T10:00:00.000Z",
    });
    const { request, response, next } = createMiddlewareHarness({
      "x-admin-session": token,
    });

    createAdminSessionGuard({
      adminPasscode: "local-admin-passcode",
      now: "2026-05-31T09:00:00.000Z",
    })(request, response, next);

    expect(request.admin).toEqual({
      sessionId: "session_123",
      expiresAt: "2026-05-31T10:00:00.000Z",
    });
    expect(next.calls).toBe(1);
    expect(response.statusCode).toBeUndefined();
  });

  it("rejects missing, invalid, or expired admin sessions with a standard 401", () => {
    const invalid = createMiddlewareHarness({
      "x-admin-session": "adm_invalid",
    });

    createAdminSessionGuard({
      adminPasscode: "local-admin-passcode",
      now: "2026-05-31T09:00:00.000Z",
    })(invalid.request, invalid.response, invalid.next);

    expect(invalid.next.calls).toBe(0);
    expect(invalid.response.statusCode).toBe(401);
    expect(invalid.response.body).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });

    const expiredToken = createAdminSessionToken({
      adminPasscode: "local-admin-passcode",
      sessionId: "session_123",
      expiresAt: "2026-05-31T08:59:59.000Z",
    });
    const expired = createMiddlewareHarness({
      "x-admin-session": expiredToken,
    });

    createAdminSessionGuard({
      adminPasscode: "local-admin-passcode",
      now: "2026-05-31T09:00:00.000Z",
    })(expired.request, expired.response, expired.next);

    expect(expired.next.calls).toBe(0);
    expect(expired.response.statusCode).toBe(401);
    expect(expired.response.body).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

function createMiddlewareHarness(headers: Record<string, string> = {}): {
  readonly request: AdminRequest;
  readonly response: Response & {
    statusCode?: number;
    body?: unknown;
  };
  readonly next: NextFunction & { calls: number };
} {
  const request = {
    headers,
  } as AdminRequest;
  const response = {
    locals: {},
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  } as Response & { statusCode?: number; body?: unknown };
  const next = (() => {
    next.calls += 1;
  }) as NextFunction & { calls: number };
  next.calls = 0;

  return { request, response, next };
}

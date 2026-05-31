import type { NextFunction, Response } from "express";
import { describe, expect, it } from "vitest";

import {
  createBuyerAuthMiddleware,
  type BuyerRequest,
  type SupabaseAuthVerifier,
} from "../src/middleware/auth.js";

describe("buyer auth middleware", () => {
  it("sets guest buyer context when no Authorization header exists", async () => {
    const { request, response, next } = createMiddlewareHarness();
    const middleware = createBuyerAuthMiddleware({
      supabase: createAuthVerifier(),
    });

    await middleware(request, response, next);

    expect(request.buyer).toEqual({ kind: "guest" });
    expect(next.calls).toBe(1);
    expect(response.statusCode).toBeUndefined();
  });

  it("sets authenticated buyer context from a verified Supabase bearer token", async () => {
    const { request, response, next } = createMiddlewareHarness({
      authorization: "Bearer buyer-token",
    });
    const verifierCalls: string[] = [];
    const middleware = createBuyerAuthMiddleware({
      supabase: createAuthVerifier(async (token) => {
        verifierCalls.push(token);
        return {
          data: {
            user: {
              id: "user_123",
              email: "buyer@example.com",
            },
          },
          error: null,
        };
      }),
    });

    await middleware(request, response, next);

    expect(verifierCalls).toEqual(["buyer-token"]);
    expect(request.buyer).toEqual({
      kind: "authenticated",
      userId: "user_123",
      email: "buyer@example.com",
    });
    expect(next.calls).toBe(1);
    expect(response.statusCode).toBeUndefined();
  });

  it("returns a standard 401 response for malformed or invalid bearer tokens", async () => {
    const malformed = createMiddlewareHarness({
      authorization: "Basic buyer-token",
    });

    await createBuyerAuthMiddleware({
      supabase: createAuthVerifier(),
    })(malformed.request, malformed.response, malformed.next);

    expect(malformed.next.calls).toBe(0);
    expect(malformed.response.statusCode).toBe(401);
    expect(malformed.response.body).toEqual({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "A valid buyer session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });

    const invalid = createMiddlewareHarness({
      authorization: "Bearer invalid-token",
    });

    await createBuyerAuthMiddleware({
      supabase: createAuthVerifier(async () => ({
        data: { user: null },
        error: { message: "JWT expired" },
      })),
    })(invalid.request, invalid.response, invalid.next);

    expect(invalid.next.calls).toBe(0);
    expect(invalid.response.statusCode).toBe(401);
    expect(invalid.response.body).toEqual({
      ok: false,
      error: {
        code: "UNAUTHENTICATED",
        message: "A valid buyer session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

function createAuthVerifier(
  getUser: SupabaseAuthVerifier["auth"]["getUser"] = async () => ({
    data: { user: null },
    error: null,
  }),
): SupabaseAuthVerifier {
  return {
    auth: {
      getUser,
    },
  };
}

function createMiddlewareHarness(headers: Record<string, string> = {}): {
  readonly request: BuyerRequest;
  readonly response: Response & {
    statusCode?: number;
    body?: unknown;
  };
  readonly next: NextFunction & { calls: number };
} {
  const request = {
    headers,
  } as BuyerRequest;
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

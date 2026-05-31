import type { NextFunction, Response } from "express";
import { describe, expect, it } from "vitest";

import {
  guestCartMiddleware,
  type GuestCartRequest,
} from "../src/middleware/guestCart.js";

describe("guest cart middleware", () => {
  it("sets null guest cart context when no guest cart headers exist", () => {
    const { request, response, next } = createMiddlewareHarness();

    guestCartMiddleware(request, response, next);

    expect(request.guestCart).toBeNull();
    expect(next.calls).toBe(1);
    expect(response.statusCode).toBeUndefined();
  });

  it("sets guest cart context from normalized cart headers", () => {
    const { request, response, next } = createMiddlewareHarness({
      "x-cart-id": " cart_public_123 ",
      "x-cart-secret": " cart_secret_456 ",
    });

    guestCartMiddleware(request, response, next);

    expect(request.guestCart).toEqual({
      cartPublicId: "cart_public_123",
      cartClientSecret: "cart_secret_456",
    });
    expect(next.calls).toBe(1);
    expect(response.statusCode).toBeUndefined();
  });

  it("rejects incomplete guest cart headers with the standard API error shape", () => {
    const { request, response, next } = createMiddlewareHarness({
      "x-cart-id": "cart_public_123",
    });

    guestCartMiddleware(request, response, next);

    expect(next.calls).toBe(0);
    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      ok: false,
      error: {
        code: "GUEST_CART_HEADERS_INCOMPLETE",
        message: "Guest cart ID and secret must be sent together.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

function createMiddlewareHarness(headers: Record<string, string> = {}): {
  readonly request: GuestCartRequest;
  readonly response: Response & {
    statusCode?: number;
    body?: unknown;
  };
  readonly next: NextFunction & { calls: number };
} {
  const request = {
    headers,
  } as GuestCartRequest;
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

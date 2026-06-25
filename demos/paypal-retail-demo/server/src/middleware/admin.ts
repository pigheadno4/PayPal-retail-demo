import { createHmac, timingSafeEqual } from "node:crypto";

import type { Request, RequestHandler, Response } from "express";

import { sendApiError } from "../http/responses.js";

export interface AdminContext {
  readonly sessionId: string;
  readonly expiresAt: string;
}

export type AdminRequest = Request & {
  admin?: AdminContext;
};

export interface CreateAdminSessionTokenInput {
  readonly adminPasscode: string;
  readonly sessionId: string;
  readonly expiresAt: Date | string;
}

export interface CreateAdminSessionGuardInput {
  readonly adminPasscode: string;
  readonly now?: Date | string;
}

export interface AdminSessionLookupInput {
  readonly request: Request;
  readonly adminPasscode: string;
  readonly now?: Date | string;
}

interface AdminSessionPayload {
  readonly sid: string;
  readonly exp: string;
}

export function createAdminSessionToken(
  input: CreateAdminSessionTokenInput,
): string {
  const adminPasscode = assertNonEmpty(input.adminPasscode, "admin passcode");
  const payload = {
    sid: assertNonEmpty(input.sessionId, "admin session ID"),
    exp: toDate(input.expiresAt).toISOString(),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signAdminSessionPayload(encodedPayload, adminPasscode);

  return `adm_${encodedPayload}.${signature}`;
}

export function createAdminSessionGuard(
  input: CreateAdminSessionGuardInput,
): RequestHandler {
  const adminPasscode = assertNonEmpty(input.adminPasscode, "admin passcode");
  const now = input.now ? toDate(input.now) : null;

  return (request, response, next) => {
    const adminRequest = request as AdminRequest;
    const resolvedSession = resolveAdminSessionFromRequest({
      request,
      adminPasscode,
      ...(now ? { now } : {}),
    });

    if (!resolvedSession) {
      sendAdminSessionRequired(response);
      return;
    }

    adminRequest.admin = resolvedSession;
    next();
  };
}

export function resolveAdminSessionFromRequest(
  input: AdminSessionLookupInput,
): AdminContext | null {
  const adminPasscode = assertNonEmpty(input.adminPasscode, "admin passcode");
  const now = input.now ? toDate(input.now) : new Date();
  const token = normalizeHeaderValue(input.request, "x-admin-session");

  const payload = token
    ? verifyAdminSessionToken(token, adminPasscode, now)
    : null;

  return payload
    ? {
        sessionId: payload.sid,
        expiresAt: payload.exp,
      }
    : null;
}

function verifyAdminSessionToken(
  token: string,
  adminPasscode: string,
  now: Date,
): AdminSessionPayload | null {
  if (!token.startsWith("adm_")) {
    return null;
  }

  const [encodedPayload, signature] = token.slice(4).split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signAdminSessionPayload(
    encodedPayload,
    adminPasscode,
  );
  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  const payload = parseAdminSessionPayload(encodedPayload);
  if (!payload || toDate(payload.exp).getTime() <= now.getTime()) {
    return null;
  }

  return payload;
}

function parseAdminSessionPayload(
  encodedPayload: string,
): AdminSessionPayload | null {
  try {
    const parsedPayload = JSON.parse(fromBase64Url(encodedPayload));
    if (
      typeof parsedPayload?.sid !== "string" ||
      parsedPayload.sid.trim().length === 0 ||
      typeof parsedPayload.exp !== "string"
    ) {
      return null;
    }
    return {
      sid: parsedPayload.sid,
      exp: toDate(parsedPayload.exp).toISOString(),
    };
  } catch {
    return null;
  }
}

function signAdminSessionPayload(
  encodedPayload: string,
  adminPasscode: string,
): string {
  return createHmac("sha256", adminPasscode)
    .update(encodedPayload)
    .digest("base64url");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function normalizeHeaderValue(
  request: Request,
  headerName: string,
): string | null {
  const rawValue = request.headers[headerName];
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : null;
}

function sendAdminSessionRequired(response: Response): void {
  sendApiError(response, 401, {
    code: "ADMIN_SESSION_REQUIRED",
    message: "A valid admin session is required.",
  });
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("invalid admin session date");
  }
  return date;
}

function assertNonEmpty(value: string, label: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${label} is required`);
  }
  return trimmedValue;
}

import { randomUUID } from "node:crypto";

import type { Response } from "express";

export interface ApiErrorBody {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export function createDebugId(): string {
  return `dbg_${randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

export function sendApiSuccess<TData>(
  response: Response,
  data: TData,
  statusCode = 200,
): void {
  response.status(statusCode).json({
    ok: true,
    data,
    debug_id: getResponseDebugId(response),
  });
}

export function sendApiError(
  response: Response,
  statusCode: number,
  error: ApiErrorBody,
): void {
  response.status(statusCode).json({
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.details ?? {},
    },
    debug_id: getResponseDebugId(response),
  });
}

export function getResponseDebugId(response: Response): string {
  const existingDebugId = response.locals.debugId;

  if (typeof existingDebugId === "string" && existingDebugId.length > 0) {
    return existingDebugId;
  }

  const debugId = createDebugId();
  response.locals.debugId = debugId;
  return debugId;
}

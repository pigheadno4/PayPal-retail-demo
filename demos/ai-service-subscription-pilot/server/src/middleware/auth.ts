import { createClient } from "@supabase/supabase-js";
import type { NextFunction, Request, RequestHandler, Response } from "express";

import type { BaseServerConfig } from "../config/env.js";

export type VerifiedIdentity = Readonly<{
  userId: string;
  email: string;
}>;

export type VerifyToken = (token: string) => Promise<VerifiedIdentity | null>;

export class AuthenticationError extends Error {
  constructor() {
    super("authentication_required");
  }
}

export async function verifyBearerAuthorization(
  authorization: string | undefined,
  verifyToken: VerifyToken,
): Promise<VerifiedIdentity> {
  const match = authorization?.match(/^Bearer ([^\s]+)$/);
  if (!match) {
    throw new AuthenticationError();
  }
  const identity = await verifyToken(match[1]!);
  if (!identity) {
    throw new AuthenticationError();
  }
  return identity;
}

export function createSupabaseTokenVerifier(
  config: Pick<BaseServerConfig, "supabaseUrl" | "supabasePublishableKey">,
): VerifyToken {
  const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  return async (token) => {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.email) {
      return null;
    }
    return { userId: data.user.id, email: data.user.email };
  };
}

export function requireBearerAuth(verifyToken: VerifyToken): RequestHandler {
  return (request: Request, response: Response, next: NextFunction) => {
    void verifyBearerAuthorization(request.header("authorization"), verifyToken)
      .then((identity) => {
        response.locals.auth = identity;
        next();
      })
      .catch(() => {
        response.status(401).json({ error: { code: "authentication_required" } });
      });
  };
}

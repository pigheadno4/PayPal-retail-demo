import type { Request, RequestHandler, Response } from "express";

import { sendApiError } from "../http/responses.js";

export type BuyerContext =
  | {
      readonly kind: "guest";
    }
  | {
      readonly kind: "authenticated";
      readonly userId: string;
      readonly email: string | null;
    };

export type BuyerRequest = Request & {
  buyer?: BuyerContext;
};

export interface SupabaseAuthUser {
  readonly id: string;
  readonly email?: string | null;
}

export interface SupabaseAuthVerifier {
  readonly auth: {
    readonly getUser: (token: string) => Promise<{
      readonly data: {
        readonly user: SupabaseAuthUser | null;
      };
      readonly error: { readonly message: string } | null;
    }>;
  };
}

export function createBuyerAuthMiddleware(input: {
  readonly supabase: SupabaseAuthVerifier;
}): RequestHandler {
  return async (request, response, next) => {
    const buyerRequest = request as BuyerRequest;
    const authorizationHeader = getAuthorizationHeader(request);

    if (!authorizationHeader) {
      buyerRequest.buyer = { kind: "guest" };
      next();
      return;
    }

    const token = parseBearerToken(authorizationHeader);
    if (!token) {
      sendUnauthenticated(response);
      return;
    }

    const { data, error } = await input.supabase.auth.getUser(token);
    if (error || !data.user) {
      sendUnauthenticated(response);
      return;
    }

    buyerRequest.buyer = {
      kind: "authenticated",
      userId: data.user.id,
      email: data.user.email ?? null,
    };
    next();
  };
}

function getAuthorizationHeader(request: Request): string | null {
  const value = request.headers.authorization;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parseBearerToken(authorizationHeader: string): string | null {
  const match = authorizationHeader.trim().match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token ? token : null;
}

function sendUnauthenticated(response: Response): void {
  sendApiError(response, 401, {
    code: "UNAUTHENTICATED",
    message: "A valid buyer session is required.",
  });
}

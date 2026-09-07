import { Router } from "express";
import { z } from "zod";
import { createAuthDiagnostic } from "../domain/auth/diagnostics.js";

import type { CheckoutReview } from "../../../shared/src/checkout.js";
import {
  parseRequestOtpRequest,
  type CreateCheckoutIntentResponse,
  type DemoOtpResponse,
  type DemoSessionResponse,
} from "../../../shared/src/identity.js";
import {
  requireBearerAuth,
  type VerifiedIdentity,
  type VerifyToken,
} from "../middleware/auth.js";

export const DEMO_SESSION_COOKIE = "ai_demo_session";

type IdentityRouterDependencies = Readonly<{
  secureCookies?: boolean;
  createIntent: () => Promise<{
    response: CreateCheckoutIntentResponse;
    cookieValue: string;
    cookieExpiresAt: Date;
  }>;
  createDemoSession: (cookieValue: string) => Promise<DemoSessionResponse>;
  requestOtp: (input: ReturnType<typeof parseRequestOtpRequest>, cookieValue: string) => Promise<{ accepted: true }>;
  retrieveOtp: (cookieValue: string) => Promise<DemoOtpResponse>;
  resume: (input: Readonly<{
    intentId: string;
    verifiedUser: VerifiedIdentity;
    cookieValue: string;
  }>) => Promise<CheckoutReview>;
  verifyToken: VerifyToken;
}>;

function cookieValue(header: string | undefined): string | null {
  const match = header?.split(";").map((part) => part.trim()).find((part) =>
    part.startsWith(`${DEMO_SESSION_COOKIE}=`),
  );
  if (!match) return null;
  const value = match.slice(DEMO_SESSION_COOKIE.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function privateNoStore(response: Parameters<Parameters<Router["get"]>[1]>[1]) {
  response.set("Cache-Control", "private, no-store");
}

export function createIdentityRouter(dependencies: IdentityRouterDependencies): Router {
  const router = Router();

  router.post("/checkout-intents", async (_request, response) => {
    try {
      const result = await dependencies.createIntent();
      response.cookie(DEMO_SESSION_COOKIE, result.cookieValue, {
        expires: result.cookieExpiresAt,
        httpOnly: true,
        secure: dependencies.secureCookies ?? false,
        sameSite: "lax",
        path: "/",
      });
      privateNoStore(response);
      response.status(201).json(result.response);
    } catch {
      response.status(500).json({ error: { code: "internal_error" } });
    }
  });

  router.post("/demo-sessions", async (request, response) => {
    const origin = cookieValue(request.header("cookie"));
    if (!origin) {
      response.status(404).json({ error: { code: "not_found" } });
      return;
    }
    try {
      const result = await dependencies.createDemoSession(origin);
      privateNoStore(response);
      response.status(201).json(result);
    } catch {
      response.status(404).json({ error: { code: "not_found" } });
    }
  });

  router.get("/demo-sessions/otp", async (request, response) => {
    const origin = cookieValue(request.header("cookie"));
    if (!origin) {
      response.status(404).json({ error: { code: "not_found" } });
      return;
    }
    try {
      const result = await dependencies.retrieveOtp(origin);
      privateNoStore(response);
      response.json(result);
    } catch {
      response.status(404).json({ error: { code: "not_found" } });
    }
  });

  router.post("/auth/request-otp", async (request, response) => {
    let input: ReturnType<typeof parseRequestOtpRequest>;
    try {
      input = parseRequestOtpRequest(request.body);
    } catch {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    const origin = cookieValue(request.header("cookie"));
    if (origin) {
      await dependencies.requestOtp(input, origin).catch(() => {
        createAuthDiagnostic()("otp_request_failed");
      });
    }
    privateNoStore(response);
    response.status(202).json({ accepted: true });
  });

  router.post(
    "/checkout-intents/:intentId/resume",
    requireBearerAuth(dependencies.verifyToken),
    async (request, response) => {
      const origin = cookieValue(request.header("cookie"));
      const parsedIntent = z.uuid().safeParse(request.params.intentId);
      if (!origin || !parsedIntent.success || !response.locals.auth) {
        response.status(404).json({ error: { code: "not_found" } });
        return;
      }
      try {
        const result = await dependencies.resume({
          intentId: parsedIntent.data,
          verifiedUser: response.locals.auth,
          cookieValue: origin,
        });
        privateNoStore(response);
        response.json(result);
      } catch {
        response.status(404).json({ error: { code: "not_found" } });
      }
    },
  );

  return router;
}

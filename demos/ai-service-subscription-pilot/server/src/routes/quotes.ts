import { Router } from "express";
import { z } from "zod";

import {
  parseReplaceQuoteRequest,
  type CheckoutReview,
  type ReplaceQuoteRequest,
  type ReplaceQuoteResponse,
} from "../../../shared/src/checkout.js";
import {
  QuoteConflictError,
  QuoteNotFoundError,
} from "../domain/quote/service.js";
import {
  requireBearerAuth,
  type VerifiedIdentity,
  type VerifyToken,
} from "../middleware/auth.js";

type QuotesRouterDependencies = Readonly<{
  verifyToken: VerifyToken;
  readQuote: (identity: VerifiedIdentity, intentId: string) => Promise<CheckoutReview>;
  replaceQuote: (identity: VerifiedIdentity, input: ReplaceQuoteRequest) => Promise<ReplaceQuoteResponse>;
}>;

export function createQuotesRouter(dependencies: QuotesRouterDependencies): Router {
  const router = Router();
  const authenticated = requireBearerAuth(dependencies.verifyToken);

  router.get("/quotes", authenticated, async (request, response) => {
    const intentId = z.uuid().safeParse(request.query.intentId);
    if (!intentId.success || !response.locals.auth) {
      response.status(404).json({ error: { code: "not_found" } });
      return;
    }
    try {
      const review = await dependencies.readQuote(response.locals.auth, intentId.data);
      response.set("Cache-Control", "private, no-store").json(review);
    } catch {
      response.status(404).json({ error: { code: "not_found" } });
    }
  });

  router.post("/quotes", authenticated, async (request, response) => {
    if (!response.locals.auth) {
      response.status(401).json({ error: { code: "authentication_required" } });
      return;
    }
    let input: ReplaceQuoteRequest;
    try {
      input = parseReplaceQuoteRequest(request.body);
    } catch {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    try {
      const result = await dependencies.replaceQuote(response.locals.auth, input);
      response.set("Cache-Control", "private, no-store").json(result);
    } catch (error) {
      if (error instanceof QuoteNotFoundError) {
        response.status(404).json({ error: { code: "not_found" } });
        return;
      }
      if (error instanceof QuoteConflictError) {
        response.status(409).json({ error: { code: "stale_quote" } });
        return;
      }
      response.status(500).json({ error: { code: "internal_error" } });
    }
  });

  return router;
}

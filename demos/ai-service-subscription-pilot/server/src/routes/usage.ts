import { Router, type Response } from "express";

import {
  accountUsageSummarySchema,
  generateAnswerOutcomeSchema,
  generateAnswerRequestSchema,
  type AccountUsageSummary,
  type GenerateAnswerOutcome,
  type GenerateAnswerRequest,
} from "../../../shared/src/usage.js";
import {
  requireBearerAuth,
  type VerifiedIdentity,
  type VerifyToken,
} from "../middleware/auth.js";

type UsageRouterDependencies = Readonly<{
  verifyToken: VerifyToken;
  activate(identity: VerifiedIdentity): Promise<AccountUsageSummary>;
  readSummary(identity: VerifiedIdentity): Promise<AccountUsageSummary>;
  generateAnswer(identity: VerifiedIdentity, input: GenerateAnswerRequest): Promise<GenerateAnswerOutcome>;
}>;

function errorStatus(error: unknown): Readonly<{ status: number; code: string }> {
  const message = error instanceof Error ? error.message : "";
  if (message === "usage_not_found") return { status: 404, code: "not_found" };
  if (message === "usage_not_available") return { status: 409, code: "usage_not_available" };
  return { status: 500, code: "internal_error" };
}

export function createUsageRouter(dependencies: UsageRouterDependencies): Router {
  const router = Router();
  const authenticated = requireBearerAuth(dependencies.verifyToken);

  router.use((_request, response, next) => {
    response.set("Cache-Control", "private, no-store");
    next();
  });

  const run = async <T>(
    response: Response,
    operation: () => Promise<T>,
    parse: (value: T) => unknown,
    status: (value: T) => number = () => 200,
  ) => {
    try {
      const result = await operation();
      response.status(status(result)).json(parse(result));
    } catch (error) {
      const mapped = errorStatus(error);
      response.status(mapped.status).json({ error: { code: mapped.code } });
    }
  };

  router.post("/me/activation", authenticated, (_request, response) => {
    if (!response.locals.auth) return;
    void run(
      response,
      () => dependencies.activate(response.locals.auth),
      (value) => accountUsageSummarySchema.parse(value),
    );
  });

  router.get("/me/summary", authenticated, (_request, response) => {
    if (!response.locals.auth) return;
    void run(
      response,
      () => dependencies.readSummary(response.locals.auth),
      (value) => accountUsageSummarySchema.parse(value),
    );
  });

  router.post("/usage/generate-answer", authenticated, (request, response) => {
    const input = generateAnswerRequestSchema.safeParse(request.body);
    if (!input.success || !response.locals.auth) {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    void run(
      response,
      () => dependencies.generateAnswer(response.locals.auth, input.data),
      (value) => generateAnswerOutcomeSchema.parse(value),
      (value) => value.state === "reserved" ? 202 : 200,
    );
  });

  return router;
}

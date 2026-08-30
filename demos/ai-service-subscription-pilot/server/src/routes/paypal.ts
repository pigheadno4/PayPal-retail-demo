import { Router, type Response } from "express";

import {
  capturePayPalOrderRequestSchema,
  createPayPalOrderRequestSchema,
  createPayPalOrderResponseSchema,
  paypalCheckoutStatusSchema,
  paypalIdTokenRequestSchema,
  paypalIdTokenResponseSchema,
  type CapturePayPalOrderRequest,
  type CreatePayPalOrderRequest,
  type CreatePayPalOrderResponse,
  type PayPalCheckoutStatus,
  type PayPalIdTokenRequest,
  type PayPalIdTokenResponse,
} from "../../../shared/src/paypal.js";
import {
  requireBearerAuth,
  type VerifiedIdentity,
  type VerifyToken,
} from "../middleware/auth.js";

type PayPalRouterDependencies = Readonly<{
  verifyToken: VerifyToken;
  issueIdToken(identity: VerifiedIdentity, input: PayPalIdTokenRequest): Promise<PayPalIdTokenResponse>;
  createOrder(identity: VerifiedIdentity, input: CreatePayPalOrderRequest): Promise<CreatePayPalOrderResponse>;
  captureOrder(
    identity: VerifiedIdentity,
    input: CapturePayPalOrderRequest & Readonly<{ orderId: string }>,
  ): Promise<PayPalCheckoutStatus>;
}>;

function errorStatus(error: unknown): Readonly<{ status: number; code: string }> {
  const message = error instanceof Error ? error.message : "";
  const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
  if (message === "integration_not_configured" || code === "integration_not_configured") {
    return { status: 503, code: "integration_not_configured" };
  }
  if (message === "stale_quote") return { status: 409, code: "stale_quote" };
  if (message === "payment_not_found" || message === "quote_not_found") return { status: 404, code: "not_found" };
  if (message === "payment_unavailable") return { status: 409, code: "payment_not_available" };
  return { status: 500, code: "internal_error" };
}

export function createPayPalRouter(dependencies: PayPalRouterDependencies): Router {
  const router = Router();
  const authenticated = requireBearerAuth(dependencies.verifyToken);

  router.use((_request, response, next) => {
    response.set("Cache-Control", "private, no-store");
    next();
  });

  const run = async <T>(
    response: Response,
    operation: () => Promise<T>,
    status: (value: T) => number = () => 200,
  ) => {
    try {
      const result = await operation();
      response.status(status(result)).json(result);
    } catch (error) {
      const mapped = errorStatus(error);
      response.status(mapped.status).json({ error: { code: mapped.code } });
    }
  };

  router.post("/paypal/id-token", authenticated, (request, response) => {
    const input = paypalIdTokenRequestSchema.safeParse(request.body);
    if (!input.success || !response.locals.auth) {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    void run(response, async () => paypalIdTokenResponseSchema.parse(
      await dependencies.issueIdToken(response.locals.auth, input.data),
    ));
  });

  router.post("/paypal/orders", authenticated, (request, response) => {
    const input = createPayPalOrderRequestSchema.safeParse(request.body);
    if (!input.success || !response.locals.auth) {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    void run(
      response,
      async () => createPayPalOrderResponseSchema.parse(
        await dependencies.createOrder(response.locals.auth, input.data),
      ),
      (result) => result.status === "in_progress" ? 202 : 200,
    );
  });

  router.post("/paypal/orders/:orderId/capture", authenticated, (request, response) => {
    const input = capturePayPalOrderRequestSchema.safeParse(request.body);
    const orderId = typeof request.params.orderId === "string" && request.params.orderId.length > 0
      ? request.params.orderId
      : null;
    if (!input.success || !orderId || !response.locals.auth) {
      response.status(400).json({ error: { code: "invalid_request" } });
      return;
    }
    void run(
      response,
      async () => {
        const result = await dependencies.captureOrder(response.locals.auth, { ...input.data, orderId });
        return paypalCheckoutStatusSchema.parse({
          operationId: result.operationId,
          funding: result.funding,
          reusableReadiness: result.reusableReadiness,
          customerMessage: result.customerMessage,
        });
      },
      (result) => result.funding === "pending" ? 202 : 200,
    );
  });

  return router;
}

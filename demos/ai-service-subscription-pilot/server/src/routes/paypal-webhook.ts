import express, { Router } from "express";

import type { PayPalTransmissionHeaders } from "../domain/paypal/gateway.js";

const allowedHeaders = [
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
] as const;

type PayPalWebhookRouterDependencies = Readonly<{
  processWebhook(
    rawBody: string,
    headers: PayPalTransmissionHeaders,
  ): Promise<Readonly<{ accepted: boolean; disposition: string }>>;
}>;

export function createPayPalWebhookRouter(
  dependencies: PayPalWebhookRouterDependencies,
): Router {
  const router = Router();

  router.post(
    "/paypal",
    express.text({ type: "application/json", limit: "256kb" }),
    async (request, response) => {
      const headers: Record<string, string> = {};
      for (const name of allowedHeaders) {
        const value = request.header(name);
        if (value) headers[name] = value;
      }
      try {
        const result = await dependencies.processWebhook(
          typeof request.body === "string" ? request.body : "",
          headers,
        );
        if (!result.accepted) {
          response.status(400).json({ error: { code: "hook_rejected" } });
          return;
        }
        response.status(200).json({ accepted: true, disposition: result.disposition });
      } catch (error) {
        const integrationUnavailable = (error instanceof Error
          && error.message === "integration_not_configured")
          || (typeof error === "object" && error !== null && "code" in error
            && error.code === "integration_not_configured");
        response.status(integrationUnavailable ? 503 : 500).json({
          error: { code: integrationUnavailable ? "integration_not_configured" : "internal_error" },
        });
      }
    },
  );

  return router;
}

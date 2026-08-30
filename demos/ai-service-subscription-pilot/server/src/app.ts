import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
  type Router,
} from "express";
import { existsSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { extname, join } from "node:path";

import type { ApiErrorResponse } from "../../shared/src/http.js";
import type { BaseServerConfig } from "./config/env.js";
import { IntegrationNotConfiguredError } from "./http/errors.js";
import { createApiRouter } from "./routes/api.js";
import { createWebhookRouter } from "./routes/webhooks.js";

export type CreateAppOptions = Readonly<{
  config: BaseServerConfig;
  webDistPath: string;
  apiRouter?: Router;
  webhookRouter?: Router;
}>;

const errorBody = (
  code: ApiErrorResponse["error"]["code"],
): ApiErrorResponse => ({ error: { code } });

const notFound: RequestHandler = (_request, response) => {
  response.status(404).json(errorBody("not_found"));
};

function isPayPalJsonParseError(error: unknown, requestPath: string): boolean {
  return (
    (requestPath === "/api/v1/paypal" ||
      requestPath.startsWith("/api/v1/paypal/")) &&
    error instanceof SyntaxError &&
    (error as { type?: unknown }).type === "entity.parse.failed"
  );
}

function isBrowserHistoryRequest(
  method: string,
  path: string,
  acceptsHtml: boolean,
): boolean {
  let decodedPath: string;

  try {
    decodedPath = decodeURIComponent(path);
  } catch {
    return false;
  }

  return (
    method === "GET" &&
    acceptsHtml &&
    decodedPath !== "/assets" &&
    !decodedPath.startsWith("/assets/") &&
    decodedPath !== "/api" &&
    !decodedPath.startsWith("/api/") &&
    decodedPath !== "/webhooks" &&
    !decodedPath.startsWith("/webhooks/") &&
    extname(decodedPath) === ""
  );
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const indexPath = join(options.webDistPath, "index.html");

  // API JSON parsing is intentionally scoped away from raw provider webhooks.
  app.use("/api/v1/paypal", (_request, response, next) => {
    response.set("Cache-Control", "private, no-store");
    next();
  });
  app.use("/api/v1", express.json(), createApiRouter());
  if (options.apiRouter) {
    app.use("/api/v1", options.apiRouter);
  }
  app.use("/api/v1", notFound);

  app.use("/webhooks", createWebhookRouter());
  if (options.webhookRouter) {
    app.use("/webhooks", options.webhookRouter);
  }
  app.use("/webhooks", notFound);

  // Legacy API paths stay isolated from the browser-history fallback.
  app.use("/api", notFound);

  app.use(express.static(options.webDistPath, { index: false }));

  app.use((request, response, next) => {
    const acceptsHtml = Boolean(request.accepts("html"));
    if (
      !isBrowserHistoryRequest(request.method, request.path, acceptsHtml) ||
      !existsSync(indexPath)
    ) {
      next();
      return;
    }

    try {
      const nonce = randomBytes(16).toString("base64");
      const policy = [
        "default-src 'self'",
        `script-src 'self' 'nonce-${nonce}' https://www.paypal.com https://www.paypalobjects.com https://c.paypal.com`,
        `style-src 'self' 'nonce-${nonce}' https://www.paypal.com https://www.paypalobjects.com`,
        "img-src 'self' data: https://www.paypal.com https://www.paypalobjects.com https://c.paypal.com https://b.stats.paypal.com",
        "frame-src https://www.paypal.com https://c.paypal.com",
        "connect-src 'self' https://www.paypal.com https://www.paypalobjects.com https://c.paypal.com",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; ");
      const html = readFileSync(indexPath, "utf8").replaceAll("__CSP_NONCE__", nonce);
      response
        .set("Content-Security-Policy", policy)
        .set("Cache-Control", "no-store")
        .type("html")
        .send(html);
    } catch (error) {
      next(error);
    }
  });

  app.use(notFound);

  const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    if (isPayPalJsonParseError(error, request.path)) {
      response.status(400).json(errorBody("invalid_request"));
      return;
    }

    if (error instanceof IntegrationNotConfiguredError) {
      response
        .status(503)
        .json(errorBody("integration_not_configured"));
      return;
    }

    response.status(500).json(errorBody("internal_error"));
  };

  app.use(errorHandler);

  return app;
}

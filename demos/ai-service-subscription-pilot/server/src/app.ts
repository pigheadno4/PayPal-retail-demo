import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
  type Router,
} from "express";
import { existsSync } from "node:fs";
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

function isBrowserHistoryRequest(
  method: string,
  path: string,
  acceptsHtml: boolean,
): boolean {
  return (
    method === "GET" &&
    acceptsHtml &&
    path !== "/assets" &&
    !path.startsWith("/assets/") &&
    extname(path) === ""
  );
}

export function createApp(options: CreateAppOptions): Express {
  const app = express();
  const indexPath = join(options.webDistPath, "index.html");

  // API JSON parsing is intentionally scoped away from raw provider webhooks.
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

    response.sendFile(indexPath, (error) => {
      if (error) {
        next(error);
      }
    });
  });

  app.use(notFound);

  const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
    if (response.headersSent) {
      next(error);
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

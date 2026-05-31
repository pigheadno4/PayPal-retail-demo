import express from "express";

import {
  createDebugId,
  sendApiError,
  sendApiSuccess,
} from "./http/responses.js";
import {
  createCatalogRouter,
  type CatalogRepository,
} from "./routes/catalog.js";

export interface CreateAppInput {
  readonly catalogRepository?: CatalogRepository;
}

export function createApp(input: CreateAppInput = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use((_request, response, next) => {
    response.locals.debugId = createDebugId();
    next();
  });

  app.get("/api/health", (_request, response) => {
    sendApiSuccess(response, {
      service: "paypal-retail-demo",
      status: "ok",
    });
  });

  app.get("/health", (_request, response) => {
    sendApiSuccess(response, {
      service: "paypal-retail-demo",
      status: "ok",
    });
  });

  if (input.catalogRepository) {
    app.use(
      "/api",
      createCatalogRouter({ catalogRepository: input.catalogRepository }),
    );
  }

  app.use("/api", (request, response) => {
    sendApiError(response, 404, {
      code: "NOT_FOUND",
      message: "The requested API route was not found.",
      details: {
        path: request.originalUrl,
      },
    });
  });

  return app;
}

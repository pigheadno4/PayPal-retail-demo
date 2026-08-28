import { Router } from "express";

import type { HealthResponse } from "../../../shared/src/http.js";

export function createApiRouter(): Router {
  const router = Router();

  router.get("/health", (_request, response) => {
    const body: HealthResponse = { status: "ready" };
    response.json(body);
  });

  return router;
}

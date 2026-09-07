import express, { Router } from "express";
import { HookRejectedError } from "../domain/auth/send-email-hook.js";

type SupabaseHookDependencies = Readonly<{
  processHook: (
    rawBody: string,
    headers: Record<"webhook-id" | "webhook-timestamp" | "webhook-signature", string>,
  ) => Promise<void>;
}>;

export function createSupabaseHookRouter(
  dependencies: SupabaseHookDependencies,
): Router {
  const router = Router();
  router.post(
    "/supabase/send-email",
    express.text({ type: "application/json", limit: "64kb" }),
    async (request, response, next) => {
      const headers = {
        "webhook-id": request.header("webhook-id") ?? "",
        "webhook-timestamp": request.header("webhook-timestamp") ?? "",
        "webhook-signature": request.header("webhook-signature") ?? "",
      };
      try {
        await dependencies.processHook(
          typeof request.body === "string" ? request.body : "",
          headers,
        );
        response.status(200).json({});
      } catch (error) {
        if (error instanceof HookRejectedError) {
          response.status(401).json({ error: { code: "hook_rejected" } });
          return;
        }
        next(error);
      }
    },
  );
  return router;
}

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseHookRouter } from "./supabase-hook";
import { HookRejectedError } from "../domain/auth/send-email-hook";

describe("Supabase Send Email Hook route", () => {
  it("returns empty JSON only after hook processing completes", async () => {
    let processed = false;
    let processedWhenHeadersSent = false;
    const app = express();
    app.use((_request, response, next) => {
      const originalWriteHead = response.writeHead;
      response.writeHead = function (...args: Parameters<typeof originalWriteHead>) {
        processedWhenHeadersSent = processed;
        return originalWriteHead.apply(this, args);
      };
      next();
    });
    app.use(createSupabaseHookRouter({ processHook: async () => {
      await Promise.resolve();
      processed = true;
    } }));
    const response = await request(app).post("/supabase/send-email")
      .set("Content-Type", "application/json").send("{}");
    expect(response.status).toBe(200);
    expect(response.headers["content-type"] ?? "").toMatch(/^application\/json(?:;|$)/);
    expect(response.text).toBe("{}");
    expect(response.body).toEqual({});
    expect(processedWhenHeadersSent).toBe(true);
  });

  it("catches JSON parsing before signature verification", async () => {
    const processHook = vi.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(createSupabaseHookRouter({ processHook }));
    const rawBody = '{ "email_data": { "token": "redacted" } }';

    const response = await request(app)
      .post("/supabase/send-email")
      .set("Content-Type", "application/json")
      .set("webhook-id", "fixture")
      .set("webhook-timestamp", "123")
      .set("webhook-signature", "v1,fixture")
      .send(rawBody);

    expect(response.status).toBe(200);
    expect(processHook).toHaveBeenCalledWith(rawBody, {
      "webhook-id": "fixture",
      "webhook-timestamp": "123",
      "webhook-signature": "v1,fixture",
    });
  });

  it("returns one generic rejection without the raw failure", async () => {
    const app = express();
    app.use(createSupabaseHookRouter({
      processHook: vi.fn().mockRejectedValue(new HookRejectedError()),
    }));

    const response = await request(app)
      .post("/supabase/send-email")
      .set("Content-Type", "application/json")
      .send("{}");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: "hook_rejected" } });
    expect(response.text).not.toContain("private-hook-detail");
  });
});

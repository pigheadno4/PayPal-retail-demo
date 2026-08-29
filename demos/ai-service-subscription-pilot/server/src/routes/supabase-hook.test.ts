import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createSupabaseHookRouter } from "./supabase-hook";

describe("Supabase Send Email Hook route", () => {
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
      processHook: vi.fn().mockRejectedValue(new Error("private-hook-detail")),
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

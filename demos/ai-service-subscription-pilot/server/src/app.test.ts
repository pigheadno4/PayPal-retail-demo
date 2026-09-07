import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from "vitest";
import express from "express";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";

import { createApp } from "./app";
import type { BaseServerConfig } from "./config/env";
import { IntegrationNotConfiguredError } from "./http/errors";
import { createSupabaseHookRouter } from "./routes/supabase-hook";

const config: BaseServerConfig = {
  appUrl: "https://app-secret.example.test",
  port: 3000,
  databaseUrl: "postgresql://database-secret.example.test/demo",
  supabaseUrl: "https://supabase-secret.example.test",
  supabasePublishableKey: "publishable-secret-fixture",
  supabaseSecretKey: "supabase-secret-fixture",
  demoSessionSigningSecret: "demo-session-secret-fixture-32-chars",
};

describe("createApp", () => {
  let webDistPath: string;

  it.each([
    [new IntegrationNotConfiguredError(), 503, "integration_not_configured"],
    [new Error("private-provider-payload"), 500, "internal_error"],
  ] as const)("contains email failure without disabling unrelated routes", async (error, status, code) => {
    const app = createApp({ config, webDistPath, webhookRouter: createSupabaseHookRouter({
      processHook: async () => { throw error; },
    }) });
    const hook = await request(app).post("/webhooks/supabase/send-email")
      .set("Content-Type", "application/json").send("{}");
    expect(hook.status).toBe(status);
    expect(hook.body).toEqual({ error: { code } });
    expect(hook.text).not.toContain("private-provider-payload");
    const health = await request(app).get("/api/v1/health");
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ready" });
    expect((await request(app).get("/checkout/history").set("Accept", "text/html")).status).toBe(200);
    expect((await request(app).get("/api/v1/missing")).body).toEqual({ error: { code: "not_found" } });
  });

  beforeAll(() => {
    webDistPath = mkdtempSync(join(tmpdir(), "task0006-web-"));
    mkdirSync(join(webDistPath, "assets"));
    writeFileSync(
      join(webDistPath, "index.html"),
      "<!doctype html><html><head><meta name=\"csp-nonce\" content=\"__CSP_NONCE__\"></head><body><main>Foundation shell</main></body></html>",
    );
    writeFileSync(join(webDistPath, "assets", "main.js"), "export {};\n");
  });

  afterAll(() => {
    rmSync(webDistPath, { recursive: true, force: true });
  });

  it("returns a constant readiness response without configuration values", async () => {
    const response = await request(createApp({ config, webDistPath })).get(
      "/api/v1/health",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: "ready" });
    expect(response.text).not.toContain("secret");
  });

  it.each(["/api/v1/missing", "/webhooks/missing", "/api/missing"])(
    "isolates the %s boundary with a sanitized JSON 404",
    async (path) => {
      const response = await request(createApp({ config, webDistPath })).get(path);

      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toMatch(/^application\/json/);
      expect(response.body).toEqual({ error: { code: "not_found" } });
    },
  );

  it("serves a compiled asset with its content type", async () => {
    const response = await request(createApp({ config, webDistPath })).get(
      "/assets/main.js",
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/javascript/);
    expect(response.text).toBe("export {};\n");
  });

  it.each(["/", "/foundation/deep-link"])(
    "serves the compiled shell for eligible browser GET %s",
    async (path) => {
      const response = await request(createApp({ config, webDistPath }))
        .get(path)
        .set("Accept", "text/html");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/^text\/html/);
      expect(response.text).toContain("Foundation shell");
    },
  );

  it("uses one fresh 128-bit nonce in both CSP directives and the document", async () => {
    const app = createApp({ config, webDistPath });
    const first = await request(app).get("/").set("Accept", "text/html");
    const second = await request(app).get("/").set("Accept", "text/html");
    const nonce = first.text.match(/name="csp-nonce" content="([^"]+)"/)?.[1];

    expect(nonce).toBeTruthy();
    expect(Buffer.from(nonce!, "base64")).toHaveLength(16);
    expect(first.headers["content-security-policy"]).toContain(`script-src 'self' 'nonce-${nonce}'`);
    expect(first.headers["content-security-policy"]).toContain(`style-src 'self' 'nonce-${nonce}'`);
    expect(first.headers["content-security-policy"]).toContain(
      "frame-src https://www.paypal.com https://c.paypal.com",
    );
    expect(first.headers["content-security-policy"].match(/frame-src [^;]+/)?.[0]).toBe(
      "frame-src https://www.paypal.com https://c.paypal.com",
    );
    expect(first.headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(second.text).not.toContain(`content="${nonce}"`);
  });

  it("allows only the configured Supabase origin in connect-src", async () => {
    const cspConfig = {
      ...config,
      supabaseUrl: "https://supabase-origin.example.test/project/path?token=url-secret#fragment",
    };
    const response = await request(createApp({ config: cspConfig, webDistPath }))
      .get("/")
      .set("Accept", "text/html");
    const connectDirective = response.headers["content-security-policy"]
      .match(/connect-src [^;]+/)?.[0];

    expect(connectDirective).toBe(
      "connect-src 'self' https://www.paypal.com https://www.paypalobjects.com https://c.paypal.com https://supabase-origin.example.test",
    );
    expect(connectDirective).not.toContain("/project/path");
    expect(connectDirective).not.toContain("url-secret");
    expect(response.headers["content-security-policy"]).not.toContain(
      config.supabasePublishableKey,
    );
    expect(response.headers["content-security-policy"]).not.toContain(
      config.supabaseSecretKey,
    );
  });

  it.each([
    ["get", "/assets/missing.js"],
    ["get", "/assets/missing"],
    ["get", "/missing%2Ejs"],
    ["get", "/assets%2Fmissing"],
    ["get", "/api%2Fv1%2Fhealth"],
    ["get", "/webhooks%2Fmissing"],
    ["get", "/malformed%2"],
    ["post", "/foundation/deep-link"],
  ] as const)("does not send index.html for %s %s", async (method, path) => {
    const response = await request(createApp({ config, webDistPath }))[method](
      path,
    ).set("Accept", "text/html");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/^application\/json/);
    expect(response.body).toEqual({ error: { code: "not_found" } });
    expect(response.text).not.toContain("Foundation shell");
  });

  it("returns a sanitized 404 when the compiled index is absent", async () => {
    const emptyWebDistPath = mkdtempSync(join(tmpdir(), "task0006-empty-web-"));

    try {
      const response = await request(
        createApp({ config, webDistPath: emptyWebDistPath }),
      )
        .get("/foundation/deep-link")
        .set("Accept", "text/html");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: "not_found" } });
    } finally {
      rmSync(emptyWebDistPath, { recursive: true, force: true });
    }
  });

  it("mounts an injected API router before the API fallback and parses JSON there", async () => {
    const apiRouter = express.Router();
    apiRouter.post("/fixture", (request, response) => {
      response.json({ received: request.body });
    });

    const response = await request(
      createApp({ config, webDistPath, apiRouter }),
    )
      .post("/api/v1/fixture")
      .send({ enabled: true });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: { enabled: true } });
  });

  it.each([
    "/api/v1/paypal/id-token",
    "/api/v1/paypal/orders",
    "/api/v1/paypal/orders/ORDER-TEST-123/capture",
  ])(
    "rejects malformed PayPal JSON at %s before application handlers run",
    async (path) => {
      let applicationHandlerInvocations = 0;
      const apiRouter = express.Router();
      apiRouter.use("/paypal", (_request, _response, next) => {
        applicationHandlerInvocations += 1;
        next();
      });
      apiRouter.post("/paypal/id-token", (_request, response) => {
        response.sendStatus(204);
      });
      apiRouter.post("/paypal/orders", (_request, response) => {
        response.sendStatus(204);
      });
      apiRouter.post("/paypal/orders/:orderId/capture", (_request, response) => {
        response.sendStatus(204);
      });

      const response = await request(
        createApp({ config, webDistPath, apiRouter }),
      )
        .post(path)
        .set("Content-Type", "application/json")
        .send('{"malformed":');

      expect(response.status).toBe(400);
      expect(response.headers["cache-control"]).toBe("private, no-store");
      expect(response.body).toEqual({ error: { code: "invalid_request" } });
      expect(applicationHandlerInvocations).toBe(0);
    },
  );

  it("does not parse webhook JSON before an injected webhook router", async () => {
    const webhookRouter = express.Router();
    webhookRouter.post("/fixture", (request, response) => {
      response.json({ bodyWasParsed: request.body !== undefined });
    });

    const response = await request(
      createApp({ config, webDistPath, webhookRouter }),
    )
      .post("/webhooks/fixture")
      .set("Content-Type", "application/json")
      .send({ provider: "fixture" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ bodyWasParsed: false });
  });

  it("maps a missing capability error to a sanitized 503", async () => {
    const apiRouter = express.Router();
    apiRouter.get("/capability", () => {
      throw new IntegrationNotConfiguredError();
    });

    const response = await request(
      createApp({ config, webDistPath, apiRouter }),
    ).get("/api/v1/capability");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: "integration_not_configured" },
    });
    expect(response.text).not.toContain("PAYPAL_CLIENT_SECRET");
  });

  it("maps unexpected errors to a sanitized 500", async () => {
    const apiRouter = express.Router();
    apiRouter.get("/failure", () => {
      throw new Error("supabase-secret-fixture");
    });

    const response = await request(
      createApp({ config, webDistPath, apiRouter }),
    ).get("/api/v1/failure");

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { code: "internal_error" } });
    expect(response.text).not.toContain("supabase-secret-fixture");
  });
});

import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createPayPalWebhookRouter } from "./paypal-webhook.js";

describe("PayPal raw webhook route", () => {
  it("preserves the raw body and allowlists only PayPal verification headers", async () => {
    const processWebhook = vi.fn().mockResolvedValue({ accepted: true, disposition: "matched" });
    const server = express();
    server.use(createPayPalWebhookRouter({ processWebhook }));
    const rawBody = '{"id":"EVENT-REDACTED","event_type":"VAULT.PAYMENT-TOKEN.CREATED"}';

    const response = await request(server)
      .post("/paypal")
      .set("Content-Type", "application/json")
      .set("PayPal-Auth-Algo", "SHA256withRSA")
      .set("PayPal-Cert-Url", "https://api.paypal.com/cert")
      .set("PayPal-Transmission-Id", "transmission-redacted")
      .set("PayPal-Transmission-Sig", "signature-redacted")
      .set("PayPal-Transmission-Time", "2026-07-15T19:00:00Z")
      .set("X-Untrusted-Header", "must-not-pass")
      .send(rawBody);

    expect(response.status).toBe(200);
    expect(processWebhook).toHaveBeenCalledWith(rawBody, {
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.paypal.com/cert",
      "paypal-transmission-id": "transmission-redacted",
      "paypal-transmission-sig": "signature-redacted",
      "paypal-transmission-time": "2026-07-15T19:00:00Z",
    });
  });

  it("sanitizes invalid delivery and integration configuration failures", async () => {
    const rejected = express();
    rejected.use(createPayPalWebhookRouter({
      processWebhook: vi.fn().mockResolvedValue({ accepted: false, disposition: "rejected" }),
    }));
    const unavailable = express();
    unavailable.use(createPayPalWebhookRouter({
      processWebhook: vi.fn().mockRejectedValue(new Error("integration_not_configured")),
    }));

    expect((await request(rejected).post("/paypal").set("Content-Type", "application/json").send("{}")).status).toBe(400);
    expect((await request(unavailable).post("/paypal").set("Content-Type", "application/json").send("{}")).status).toBe(503);
  });
});

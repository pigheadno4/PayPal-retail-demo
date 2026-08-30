import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createPayPalRouter } from "./paypal.js";
import { IntegrationNotConfiguredError } from "../http/errors.js";

const intentId = "11111111-1111-4111-8111-111111111111";
const quoteId = "22222222-2222-4222-8222-222222222222";
const operationId = "33333333-3333-4333-8333-333333333333";

function app(overrides: Record<string, unknown> = {}) {
  const dependencies = {
    verifyToken: vi.fn().mockResolvedValue({
      userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      email: "customer@example.com",
    }),
    issueIdToken: vi.fn().mockResolvedValue({
      idToken: "ID-TOKEN-REDACTED",
      fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true },
    }),
    createOrder: vi.fn().mockResolvedValue({ status: "ready", operationId, orderId: "ORDER-REDACTED" }),
    captureOrder: vi.fn().mockResolvedValue({
      operationId,
      funding: "verified",
      reusableReadiness: "pending",
      customerMessage: "Payment verified. Reusable payment setup is finishing.",
    }),
    ...overrides,
  };
  const server = express();
  server.use(express.json(), createPayPalRouter(dependencies));
  return { server, dependencies };
}

describe("PayPal API routes", () => {
  it("fails before a use-case call without bearer auth or strict input", async () => {
    const { server, dependencies } = app();
    const unauthenticated = await request(server).post("/paypal/id-token").send({ intentId, quoteId });
    const malformed = await request(server).post("/paypal/orders").set("Authorization", "Bearer verified").send({
      intentId,
      quoteId,
      operationId,
      clientMetadataId: "short",
    });

    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(dependencies.issueIdToken).not.toHaveBeenCalled();
    expect(dependencies.createOrder).not.toHaveBeenCalled();
  });

  it("returns only no-store client-safe token bootstrap", async () => {
    const { server, dependencies } = app();
    const response = await request(server).post("/paypal/id-token").set("Authorization", "Bearer verified").send({ intentId, quoteId });

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.body).toEqual({
      idToken: "ID-TOKEN-REDACTED",
      fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true },
    });
    expect(JSON.stringify(response.body)).not.toContain("merchantId");
    expect(dependencies.issueIdToken).toHaveBeenCalledWith(
      { userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "customer@example.com" },
      { intentId, quoteId },
    );
  });

  it("maps ready create to 200 and unresolved create/capture to 202", async () => {
    const authorization = "Bearer verified";
    const input = { intentId, quoteId, operationId, clientMetadataId: "1234567890abcdef1234567890abcdef" };
    const ready = await request(app().server).post("/paypal/orders").set("Authorization", authorization).send(input);
    const pendingCreate = await request(app({
      createOrder: vi.fn().mockResolvedValue({ status: "in_progress", operationId, retryable: true }),
    }).server).post("/paypal/orders").set("Authorization", authorization).send(input);
    const pendingCapture = await request(app({
      captureOrder: vi.fn().mockResolvedValue({
        operationId,
        funding: "pending",
        reusableReadiness: "pending",
        customerMessage: "Payment verification is still in progress.",
      }),
    }).server).post("/paypal/orders/ORDER-REDACTED/capture").set("Authorization", authorization).send({ intentId, quoteId, operationId });

    expect(ready.status).toBe(200);
    expect(pendingCreate.status).toBe(202);
    expect(pendingCapture.status).toBe(202);
  });

  it("projects capture to the shared DTO without internal transition identifiers", async () => {
    const { server } = app({
      captureOrder: vi.fn().mockResolvedValue({
        operationId,
        funding: "verified",
        reusableReadiness: "ready",
        customerMessage: "PayPal Wallet is ready for future recurring payments.",
        paymentOperationId: operationId,
        billingArrangementId: "44444444-4444-4444-8444-444444444444",
        fundedAt: "2026-07-15T19:05:00.000Z",
      }),
    });
    const response = await request(server)
      .post("/paypal/orders/ORDER-REDACTED/capture")
      .set("Authorization", "Bearer verified")
      .send({ intentId, quoteId, operationId });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      operationId,
      funding: "verified",
      reusableReadiness: "ready",
      customerMessage: "PayPal Wallet is ready for future recurring payments.",
    });
  });

  it("sanitizes ownership, stale-quote, and definitive payment errors", async () => {
    const authorization = "Bearer verified";
    const input = { intentId, quoteId, operationId, clientMetadataId: "1234567890abcdef1234567890abcdef" };
    const missing = await request(app({ createOrder: vi.fn().mockRejectedValue(new Error("payment_not_found")) }).server)
      .post("/paypal/orders").set("Authorization", authorization).send(input);
    const stale = await request(app({ createOrder: vi.fn().mockRejectedValue(new Error("stale_quote")) }).server)
      .post("/paypal/orders").set("Authorization", authorization).send(input);
    const failed = await request(app({ createOrder: vi.fn().mockRejectedValue(new Error("payment_unavailable")) }).server)
      .post("/paypal/orders").set("Authorization", authorization).send(input);
    const unconfigured = await request(app({ createOrder: vi.fn().mockRejectedValue(new IntegrationNotConfiguredError()) }).server)
      .post("/paypal/orders").set("Authorization", authorization).send(input);

    expect(missing.status).toBe(404);
    expect(missing.body).toEqual({ error: { code: "not_found" } });
    expect(stale.status).toBe(409);
    expect(failed.status).toBe(409);
    expect(unconfigured.status).toBe(503);
  });
});

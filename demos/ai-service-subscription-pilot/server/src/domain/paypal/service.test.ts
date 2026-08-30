import { describe, expect, it } from "vitest";

import type { CheckoutReview } from "../../../../shared/src/checkout.js";
import type {
  PayPalCaptureEvidence,
  PayPalGateway,
  PayPalOrderPayload,
} from "./gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";
import { FakePayPalGateway } from "./fake-gateway.js";
import { HttpPayPalGateway, projectPayPalCaptureEvidence } from "./http-gateway.js";
import {
  captureAndReconcilePayPalOrder,
  createPayPalOrder,
  issuePayPalUserIdToken,
  type PayPalOperationRecord,
  type PayPalRepository,
} from "./service.js";
import captureApproved from "../../../../tests/fixtures/paypal/capture-approved.json";
import captureVaulted from "../../../../tests/fixtures/paypal/capture-vaulted.json";

const review: CheckoutReview = {
  intentId: "11111111-1111-4111-8111-111111111111",
  quoteId: "22222222-2222-4222-8222-222222222222",
  tier: "go",
  cadence: "monthly",
  base: { currency: "USD", cents: 1_000 },
  promotion: { currency: "USD", cents: -500 },
  taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1_055,
  tax: { currency: "USD", cents: 53 },
  dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2026-07-15T19:15:00.000Z",
  renewsAt: "2026-08-15T19:00:00.000Z",
  allowanceResetsAt: "2026-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles",
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

const vaultedEvidence: PayPalCaptureEvidence = {
  orderId: "ORDER-REDACTED",
  captureId: "CAPTURE-REDACTED",
  captureStatus: "COMPLETED",
  amount: { currency: "USD", cents: 553 },
  payeeMerchantId: "MERCHANT123",
  capturedAt: "2026-07-15T19:05:00.000Z",
  vaultStatus: "VAULTED",
  paypalCustomerId: "CUSTOMER-REDACTED",
  vaultId: "VAULT-REDACTED",
};

class MemoryPayPalRepository implements PayPalRepository {
  providerCustomerId: string | null = null;
  claimCreateResult: Awaited<ReturnType<PayPalRepository["claimCreateOperation"]>> = {
    kind: "owner",
    operation: operation(),
  };
  claimCaptureResult: Awaited<ReturnType<PayPalRepository["claimCaptureOperation"]>> = {
    kind: "owner",
    operation: operation({ orderId: vaultedEvidence.orderId }),
  };
  storedOrder: string | null = null;
  funded: PayPalCaptureEvidence[] = [];
  failed: string[] = [];
  createInputs: unknown[] = [];

  async findProviderCustomerId() { return this.providerCustomerId; }
  async claimCreateOperation(input: unknown) { this.createInputs.push(input); return this.claimCreateResult; }
  async storeCreatedOrder(_operationId: string, orderId: string) { this.storedOrder = orderId; }
  async markCreateFailed() { this.failed.push("create"); }
  async claimCaptureOperation() { return this.claimCaptureResult; }
  async applyCaptureEvidence(_operation: PayPalOperationRecord, evidence: PayPalCaptureEvidence) {
    this.funded.push(evidence);
    return {
      operationId: "33333333-3333-4333-8333-333333333333",
      paymentOperationId: "33333333-3333-4333-8333-333333333333",
      billingArrangementId: "44444444-4444-4444-8444-444444444444",
      fundedAt: evidence.capturedAt,
      funding: "verified" as const,
      reusableReadiness: evidence.vaultStatus === "VAULTED" ? "ready" as const : "pending" as const,
      customerMessage: evidence.vaultStatus === "VAULTED"
        ? "PayPal Wallet is ready for future recurring payments."
        : "Payment verified. Reusable payment setup is finishing.",
    };
  }
  async markCaptureFailed() { this.failed.push("capture"); }
}

function operation(overrides: Partial<PayPalOperationRecord> = {}): PayPalOperationRecord {
  return {
    internalId: 1n,
    operationId: "33333333-3333-4333-8333-333333333333",
    accountId: 2n,
    intentId: review.intentId,
    quoteId: review.quoteId,
    merchantId: "MERCHANT123",
    environment: "sandbox",
    orderId: null,
    createRequestId: "create-33333333-3333-4333-8333-333333333333",
    captureRequestId: "capture-33333333-3333-4333-8333-333333333333",
    fundingStatus: "created",
    vaultStatus: "not_requested",
    ...overrides,
  };
}

function dependencies(repository = new MemoryPayPalRepository(), gateway: PayPalGateway = new FakePayPalGateway()) {
  return {
    repository,
    gateway,
    merchantId: "MERCHANT123",
    environment: "sandbox" as const,
    requireReview: async () => review,
    clock: () => new Date("2026-07-15T19:00:00.000Z"),
  };
}

function mutationGateway(errorStatus: number, errorBody: unknown) {
  const responses = [
    new Response(JSON.stringify({ access_token: "ACCESS-TOKEN-REDACTED" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
    new Response(JSON.stringify(errorBody), {
      status: errorStatus,
      headers: { "Content-Type": "application/json" },
    }),
  ];
  return new HttpPayPalGateway({
    clientId: "client-id",
    clientSecret: "client-secret",
    environment: "sandbox",
    fetch: async () => responses.shift() ?? (() => { throw new Error("unexpected_request"); })(),
  });
}

function providerError(name: string, issue: string) {
  return {
    name,
    details: [{ issue, description: "Provider description is not exposed to the customer." }],
    message: "Provider message is not exposed to the customer.",
    debug_id: "DEBUG-ID-REDACTED",
    links: [{ href: "https://developer.paypal.com/api/orders/v2/error-messages/", rel: "information_link", method: "GET" }],
  };
}

describe("TC-0005 user token and create ownership", () => {
  it("omits target customer for first-time payers and uses only the stored scoped mapping for returns", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    const input = { accountId: 2n, merchantCustomerReference: "account-public-id", intentId: review.intentId, quoteId: review.quoteId };

    await issuePayPalUserIdToken(input, dependencies(repository, gateway));
    repository.providerCustomerId = "CUSTOMER-REDACTED";
    await issuePayPalUserIdToken(input, dependencies(repository, gateway));

    expect(gateway.userTokenInputs).toEqual([
      { merchantCustomerReference: "account-public-id" },
      { merchantCustomerReference: "account-public-id", targetCustomerId: "CUSTOMER-REDACTED" },
    ]);
  });

  it("allows only the operation owner to call Orders and forwards metadata only to the gateway", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    const clientMetadataId = "1234567890abcdef1234567890abcdef";
    const input = { accountId: 2n, intentId: review.intentId, quoteId: review.quoteId, operationId: operation().operationId, clientMetadataId };

    const result = await createPayPalOrder(input, dependencies(repository, gateway));

    expect(result.status).toBe("ready");
    expect(gateway.createInputs[0]).toMatchObject({
      requestId: operation().createRequestId,
      clientMetadataId,
    });
    expect(repository.createInputs).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ clientMetadataId }),
    ]));
    expect(repository.storedOrder).toBe(gateway.createdOrderId);
  });

  it("returns in_progress to a concurrent non-owner without another provider call", async () => {
    const repository = new MemoryPayPalRepository();
    repository.claimCreateResult = { kind: "in_progress", operation: operation() };
    const gateway = new FakePayPalGateway();

    const result = await createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, gateway));

    expect(result).toEqual({ status: "in_progress", operationId: operation().operationId, retryable: true });
    expect(gateway.createInputs).toEqual([]);
  });

  it("restores the owning operation identifier when a new browser attempt finds its stored order", async () => {
    const repository = new MemoryPayPalRepository();
    repository.claimCreateResult = {
      kind: "ready",
      operation: operation(),
      orderId: vaultedEvidence.orderId,
    };
    const gateway = new FakePayPalGateway();

    const result = await createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: "55555555-5555-4555-8555-555555555555",
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, gateway));

    expect(result).toEqual({
      status: "ready",
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    });
    expect(gateway.createInputs).toEqual([]);
  });

  it("keeps an interrupted provider create unresolved for safe stored-request retry", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    let providerCalls = 0;
    gateway.createOrder = async () => {
      providerCalls += 1;
      throw new Error("network_interrupted");
    };
    const result = await createPayPalOrder({ accountId: 2n, intentId: review.intentId, quoteId: review.quoteId, operationId: operation().operationId, clientMetadataId: "1234567890abcdef1234567890abcdef" }, dependencies(repository, gateway));

    expect(result).toEqual({ status: "in_progress", operationId: operation().operationId, retryable: true });
    expect(repository.failed).toEqual([]);
    expect(providerCalls).toBe(1);
  });

  it("marks only a definitive provider create rejection failed", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    gateway.createOrder = async () => { throw new PayPalDefinitiveError(); };

    await expect(createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, gateway))).rejects.toThrow("payment_unavailable");

    expect(repository.failed).toEqual(["create"]);
  });

  it("uses a fresh operation and request ID after the prior operation is definitively failed", async () => {
    const repository = new MemoryPayPalRepository();
    const original = operation({ fundingStatus: "failed", vaultStatus: "failed" });
    const replacement = operation({
      internalId: 2n,
      operationId: "55555555-5555-4555-8555-555555555555",
      createRequestId: "create-55555555-5555-4555-8555-555555555555",
      captureRequestId: "capture-55555555-5555-4555-8555-555555555555",
    });
    repository.claimCreateResult = { kind: "owner", operation: replacement };
    const gateway = new FakePayPalGateway();

    const result = await createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: replacement.operationId,
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, gateway));

    expect(result).toMatchObject({ status: "ready", operationId: replacement.operationId });
    expect(repository.createInputs).toEqual([expect.objectContaining({ operationId: replacement.operationId })]);
    expect(gateway.createInputs).toEqual([expect.objectContaining({ requestId: replacement.createRequestId })]);
    expect(replacement.operationId).not.toBe(original.operationId);
    expect(replacement.createRequestId).not.toBe(original.createRequestId);
  });

  it.each([
    [409, "RESOURCE_CONFLICT", "PREVIOUS_REQUEST_IN_PROGRESS"],
    [422, "UNPROCESSABLE_ENTITY", "UNRECOGNIZED_CREATE_ISSUE"],
  ])("keeps unclear create mutation %i/%s/%s unresolved", async (status, name, issue) => {
    const repository = new MemoryPayPalRepository();
    const result = await createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, mutationGateway(status, providerError(name, issue))));

    expect(result).toEqual({ status: "in_progress", operationId: operation().operationId, retryable: true });
    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual([]);
  });

  it("terminalizes only an unambiguous provider create rejection", async () => {
    const repository = new MemoryPayPalRepository();

    await expect(createPayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      clientMetadataId: "1234567890abcdef1234567890abcdef",
    }, dependencies(repository, mutationGateway(422, providerError("UNPROCESSABLE_ENTITY", "INSTRUMENT_DECLINED"))))).rejects.toThrow("payment_unavailable");

    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual(["create"]);
  });
});

describe("TC-0006 verified capture funding and reusable readiness", () => {
  it("projects only one authoritative nested completed capture and provider vault fields", () => {
    expect(projectPayPalCaptureEvidence(captureVaulted, vaultedEvidence.orderId)).toEqual(vaultedEvidence);
    expect(projectPayPalCaptureEvidence(captureApproved, vaultedEvidence.orderId)).toEqual({
      ...vaultedEvidence,
      payeeMerchantId: undefined,
      vaultStatus: "APPROVED",
      vaultId: undefined,
    });
  });

  it("rejects top-level-only completion, missing captures, and multiple nested captures", () => {
    expect(() => projectPayPalCaptureEvidence({ id: vaultedEvidence.orderId, status: "COMPLETED", purchase_units: [] }, vaultedEvidence.orderId)).toThrow("invalid_capture_evidence");
    const duplicated = structuredClone(captureVaulted);
    duplicated.purchase_units[0]!.payments.captures.push(structuredClone(duplicated.purchase_units[0]!.payments.captures[0]!));
    expect(() => projectPayPalCaptureEvidence(duplicated, vaultedEvidence.orderId)).toThrow("invalid_capture_evidence");
    const missingCaptureId = structuredClone(captureVaulted);
    Reflect.deleteProperty(missingCaptureId.purchase_units[0]!.payments.captures[0]!, "id");
    expect(() => projectPayPalCaptureEvidence(missingCaptureId, vaultedEvidence.orderId)).toThrow("invalid_capture_evidence");
  });

  it.each([
    ["VAULTED", "ready"],
    ["APPROVED", "pending"],
  ] as const)("keeps funding verified and maps %s readiness to %s", async (vaultStatus, expectedReadiness) => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway({ captureEvidence: {
      ...vaultedEvidence,
      vaultStatus,
      ...(vaultStatus === "APPROVED" ? { vaultId: undefined } : {}),
    } });

    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway));

    expect(result).toMatchObject({ funding: "verified", reusableReadiness: expectedReadiness });
    expect(repository.funded).toHaveLength(1);
  });

  it.each([
    ["order ID", { ...vaultedEvidence, orderId: "WRONG" }],
    ["capture status", { ...vaultedEvidence, captureStatus: "PENDING" as "COMPLETED" }],
    ["amount", { ...vaultedEvidence, amount: { currency: "USD", cents: 552 } }],
    ["currency", { ...vaultedEvidence, amount: { currency: "EUR" as "USD", cents: 553 } }],
    ["payee", { ...vaultedEvidence, payeeMerchantId: "WRONG" }],
    ["capture time", { ...vaultedEvidence, capturedAt: "not-a-time" }],
    ["VAULTED vault ID", { ...vaultedEvidence, vaultId: undefined }],
    ["PayPal customer ID", { ...vaultedEvidence, paypalCustomerId: undefined }],
    ["APPROVED unexpected vault ID", { ...vaultedEvidence, vaultStatus: "APPROVED", vaultId: "VAULT-UNEXPECTED" }],
  ] satisfies ReadonlyArray<readonly [string, PayPalCaptureEvidence]>)
  ("keeps a %s mismatch unresolved before any normalized mutation", async (_field, evidence) => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway({ captureEvidence: evidence });
    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway));
    expect(result).toEqual({
      operationId: operation().operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual([]);
  });

  it.each([
    ["top-level-only completion", () => ({ id: vaultedEvidence.orderId, status: "COMPLETED", purchase_units: [] })],
    ["missing nested capture ID", () => {
      const raw = structuredClone(captureVaulted);
      Reflect.deleteProperty(raw.purchase_units[0]!.payments.captures[0]!, "id");
      return raw;
    }],
    ["multiple nested captures", () => {
      const raw = structuredClone(captureVaulted);
      raw.purchase_units[0]!.payments.captures.push(structuredClone(raw.purchase_units[0]!.payments.captures[0]!));
      return raw;
    }],
  ] as const)("keeps %s unresolved through projection and service reconciliation", async (_name, rawCapture) => {
    const repository = new MemoryPayPalRepository();

    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, mutationGateway(200, rawCapture())));

    expect(result).toEqual({
      operationId: operation().operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual([]);
  });

  it("keeps invalid projected capture evidence unresolved without a normalized mutation", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    gateway.captureOrder = async () => { throw new Error("invalid_capture_evidence"); };

    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway));

    expect(result).toMatchObject({ funding: "pending", reusableReadiness: "pending" });
    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual([]);
  });

  it("uses the stable capture request ID and returns in_progress to concurrent non-owners", async () => {
    const repository = new MemoryPayPalRepository();
    repository.claimCaptureResult = { kind: "in_progress", operation: operation({ orderId: vaultedEvidence.orderId }) };
    const gateway = new FakePayPalGateway();

    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway));

    expect(result).toMatchObject({ funding: "pending", reusableReadiness: "pending" });
    expect(gateway.captureInputs).toEqual([]);
  });

  it("marks a definitive provider capture rejection failed", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    gateway.captureOrder = async () => { throw new PayPalDefinitiveError(); };

    await expect(captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway))).rejects.toThrow("payment_unavailable");

    expect(repository.failed).toEqual(["capture"]);
  });

  it("keeps an uncertain capture transport failure unresolved", async () => {
    const repository = new MemoryPayPalRepository();
    const gateway = new FakePayPalGateway();
    gateway.captureOrder = async () => { throw new Error("network_interrupted"); };

    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, gateway));

    expect(result).toEqual({
      operationId: operation().operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
    expect(repository.failed).toEqual([]);
  });

  it.each([
    [409, "RESOURCE_CONFLICT", "PREVIOUS_REQUEST_IN_PROGRESS"],
    [422, "UNPROCESSABLE_ENTITY", "ORDER_COMPLETION_IN_PROGRESS"],
    [422, "UNPROCESSABLE_ENTITY", "ORDER_ALREADY_CAPTURED"],
    [422, "UNPROCESSABLE_ENTITY", "UNRECOGNIZED_CAPTURE_ISSUE"],
  ])("keeps unclear capture mutation %i/%s/%s unresolved", async (status, name, issue) => {
    const repository = new MemoryPayPalRepository();
    const result = await captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, mutationGateway(status, providerError(name, issue))));

    expect(result).toEqual({
      operationId: operation().operationId,
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    });
    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual([]);
  });

  it("terminalizes only an unambiguous provider capture rejection", async () => {
    const repository = new MemoryPayPalRepository();

    await expect(captureAndReconcilePayPalOrder({
      accountId: 2n,
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: operation().operationId,
      orderId: vaultedEvidence.orderId,
    }, dependencies(repository, mutationGateway(422, providerError("UNPROCESSABLE_ENTITY", "INSTRUMENT_DECLINED"))))).rejects.toThrow("payment_unavailable");

    expect(repository.funded).toEqual([]);
    expect(repository.failed).toEqual(["capture"]);
  });
});

// Compile-time fixture coverage: the fake mirrors the production gateway's complete order input.
const _payloadBoundary: PayPalOrderPayload | undefined = undefined;
void _payloadBoundary;

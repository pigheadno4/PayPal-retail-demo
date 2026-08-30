import { describe, expect, it } from "vitest";

import { FakePayPalGateway } from "./fake-gateway.js";
import {
  reconcilePayPalWebhook,
  type PayPalWebhookRepository,
} from "./webhook.js";

const event = {
  id: "WH-REDACTED",
  event_type: "VAULT.PAYMENT-TOKEN.CREATED",
  create_time: "2026-07-15T19:06:00.000Z",
  resource: {
    id: "VAULT-REDACTED",
    customer: { id: "CUSTOMER-REDACTED" },
  },
};

class MemoryWebhookRepository implements PayPalWebhookRepository {
  candidates = [{ operationInternalId: 1n, operationId: "33333333-3333-4333-8333-333333333333" }];
  existing = false;
  vaultOwned = false;
  dispositions: string[] = [];
  dispositionInputs: Array<{ eventId: string; rawPayload: unknown; signatureValid: boolean; disposition: string }> = [];
  duplicateDeliveries: string[] = [];
  promotions = 0;
  promotionResult: "matched" | "duplicate" | "rejected" = "matched";
  dispositionClaimed = true;

  async hasProviderEvent() { return this.existing; }
  async findPendingOperations() { return this.candidates; }
  async isVaultOwned() { return this.vaultOwned; }
  async recordDisposition(input: { eventId: string; rawPayload: unknown; signatureValid: boolean; disposition: string }) {
    this.dispositions.push(input.disposition);
    this.dispositionInputs.push(input);
    return this.dispositionClaimed;
  }
  async recordDuplicateDelivery(input: { eventId: string }) { this.duplicateDeliveries.push(input.eventId); return true; }
  async promoteReadiness() { this.promotions += 1; return this.promotionResult; }
}

function dependencies(repository = new MemoryWebhookRepository(), signatureValid = true) {
  return {
    repository,
    gateway: new FakePayPalGateway({ webhookVerified: signatureValid }),
    merchantId: "MERCHANT123",
    environment: "sandbox" as const,
    webhookId: "WEBHOOK-REDACTED",
    clock: () => new Date("2026-07-15T19:07:00.000Z"),
  };
}

describe("TC-0007 delayed vault reconciliation", () => {
  it("promotes exactly one matching verified pending operation", async () => {
    const repository = new MemoryWebhookRepository();
    const result = await reconcilePayPalWebhook(JSON.stringify(event), { "paypal-transmission-id": "redacted" }, dependencies(repository));
    expect(result).toEqual({ accepted: true, disposition: "matched" });
    expect(repository.promotions).toBe(1);
    expect(repository.dispositions).toEqual([]);
  });

  it("returns duplicate when the atomic event claim loses a concurrent race", async () => {
    const repository = new MemoryWebhookRepository();
    repository.promotionResult = "duplicate";
    const result = await reconcilePayPalWebhook(JSON.stringify(event), {}, dependencies(repository));
    expect(result).toEqual({ accepted: true, disposition: "duplicate" });
    expect(repository.dispositions).toEqual([]);
    expect(repository.duplicateDeliveries).toEqual([event.id]);
  });

  it("returns duplicate when a verified quarantined disposition loses the atomic event claim", async () => {
    const repository = new MemoryWebhookRepository();
    repository.candidates = [];
    repository.dispositionClaimed = false;

    const result = await reconcilePayPalWebhook(
      JSON.stringify(event),
      {},
      dependencies(repository),
    );

    expect(result).toEqual({ accepted: true, disposition: "duplicate" });
    expect(repository.promotions).toBe(0);
    expect(repository.duplicateDeliveries).toEqual([event.id]);
  });

  it("does not let invalid-signature evidence claim the authoritative verified event ID", async () => {
    const repository = new MemoryWebhookRepository();

    await expect(reconcilePayPalWebhook(JSON.stringify(event), {}, dependencies(repository, false)))
      .resolves.toEqual({ accepted: false, disposition: "rejected" });
    await expect(reconcilePayPalWebhook(JSON.stringify(event), {}, dependencies(repository, true)))
      .resolves.toEqual({ accepted: true, disposition: "matched" });

    expect(repository.dispositionInputs[0]).toMatchObject({
      rawPayload: { id: event.id },
      signatureValid: false,
      disposition: "rejected",
    });
    expect(repository.dispositionInputs[0]?.eventId).not.toBe(event.id);
    expect(repository.promotions).toBe(1);
  });

  it.each([
    ["invalid signature", (repo: MemoryWebhookRepository) => repo, false, "rejected", ["rejected"]],
    ["duplicate event", (repo: MemoryWebhookRepository) => { repo.existing = true; return repo; }, true, "duplicate", []],
    ["unmatched customer", (repo: MemoryWebhookRepository) => { repo.candidates = []; return repo; }, true, "unmatched", ["unmatched"]],
    ["ambiguous customer", (repo: MemoryWebhookRepository) => { repo.candidates = [{ operationInternalId: 1n, operationId: "a" }, { operationInternalId: 2n, operationId: "b" }]; return repo; }, true, "ambiguous", ["ambiguous"]],
    ["owned vault", (repo: MemoryWebhookRepository) => { repo.vaultOwned = true; return repo; }, true, "rejected", ["rejected"]],
  ] as const)("fails closed for %s", async (_name, configure, signatureValid, disposition, recorded) => {
    const repository = configure(new MemoryWebhookRepository());
    const result = await reconcilePayPalWebhook(JSON.stringify(event), {}, dependencies(repository, signatureValid));
    expect(result.disposition).toBe(disposition);
    expect(repository.promotions).toBe(0);
    expect(repository.dispositions).toEqual(recorded);
    if (_name === "duplicate event") expect(repository.duplicateDeliveries).toEqual([event.id]);
  });

  it.each([
    { ...event, event_type: "CHECKOUT.ORDER.APPROVED" },
    { ...event, resource: { ...event.resource, id: "" } },
    { ...event, resource: { ...event.resource, customer: { id: "" } } },
  ])("quarantines unsupported or malformed transition input", async (payload) => {
    const repository = new MemoryWebhookRepository();
    const result = await reconcilePayPalWebhook(JSON.stringify(payload), {}, dependencies(repository));
    expect(result.disposition).toBe("rejected");
    expect(repository.promotions).toBe(0);
    expect(repository.dispositions).toEqual(["rejected"]);
  });

  it("rejects invalid JSON only after signature verification and records no transition", async () => {
    const repository = new MemoryWebhookRepository();
    const result = await reconcilePayPalWebhook("not-json", {}, dependencies(repository));
    expect(result.disposition).toBe("rejected");
    expect(repository.promotions).toBe(0);
  });
});

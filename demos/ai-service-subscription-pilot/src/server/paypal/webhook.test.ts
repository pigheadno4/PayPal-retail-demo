import { describe, expect, it } from "vitest";

import { FakePayPalGateway } from "@/server/paypal/fake-gateway";
import {
  reconcilePayPalWebhook,
  type PayPalWebhookRepository,
} from "@/server/paypal/webhook";

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
  promotions = 0;

  async hasProviderEvent() { return this.existing; }
  async findPendingOperations() { return this.candidates; }
  async isVaultOwned() { return this.vaultOwned; }
  async recordDisposition(input: { disposition: string }) { this.dispositions.push(input.disposition); }
  async promoteReadiness() { this.promotions += 1; return true; }
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
    expect(repository.dispositions).toEqual(["matched"]);
  });

  it.each([
    ["invalid signature", (repo: MemoryWebhookRepository) => repo, false, "rejected"],
    ["duplicate event", (repo: MemoryWebhookRepository) => { repo.existing = true; return repo; }, true, "duplicate"],
    ["unmatched customer", (repo: MemoryWebhookRepository) => { repo.candidates = []; return repo; }, true, "unmatched"],
    ["ambiguous customer", (repo: MemoryWebhookRepository) => { repo.candidates = [{ operationInternalId: 1n, operationId: "a" }, { operationInternalId: 2n, operationId: "b" }]; return repo; }, true, "ambiguous"],
    ["owned vault", (repo: MemoryWebhookRepository) => { repo.vaultOwned = true; return repo; }, true, "rejected"],
  ] as const)("fails closed for %s", async (_name, configure, signatureValid, disposition) => {
    const repository = configure(new MemoryWebhookRepository());
    const result = await reconcilePayPalWebhook(JSON.stringify(event), {}, dependencies(repository, signatureValid));
    expect(result.disposition).toBe(disposition);
    expect(repository.promotions).toBe(0);
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
  });

  it("rejects invalid JSON only after signature verification and records no transition", async () => {
    const repository = new MemoryWebhookRepository();
    const result = await reconcilePayPalWebhook("not-json", {}, dependencies(repository));
    expect(result.disposition).toBe("rejected");
    expect(repository.promotions).toBe(0);
  });
});

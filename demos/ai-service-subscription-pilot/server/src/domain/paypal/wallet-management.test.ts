import { describe, expect, it, vi } from "vitest";
import { FakePayPalGateway } from "./fake-gateway.js";
import { PayPalDefinitiveError } from "./gateway.js";
import type { PayPalWallet } from "../../../../shared/src/paypal.js";

const scope = { accountId: 1n, merchantId: "fixture-merchant", environment: "sandbox" as const };
const wallet: PayPalWallet = { methodId: "11111111-1111-4111-8111-111111111111", brand: "PayPal Wallet", state: "removing", renewalReady: false, paidThrough: "2026-11-01T00:00:00.000Z" };
const subject = () => import("./wallet-management.js").catch(() => ({})) as Promise<typeof import("./wallet-management.js")>;

describe("wallet removal service", () => {
  it.each(["removed", "rejected", "unknown"] as const)("commits a claim before DELETE, then persists %s without payment", async (outcome) => {
    const { removePayPalWallet } = await subject();
    expect(typeof removePayPalWallet).toBe("function");
    let committed = false;
    const gateway = new FakePayPalGateway();
    const deletion = vi.spyOn(gateway, "deletePaymentToken").mockImplementation(async () => {
      expect(committed).toBe(true);
      if (outcome === "rejected") throw new PayPalDefinitiveError();
      if (outcome === "unknown") throw new Error("private");
    });
    const repository = {
      readOwnedWallet: vi.fn(),
      claimRemoval: vi.fn(async () => { committed = true; return { kind: "owner" as const, scope, wallet, paymentTokenId: "private-fixture-token" }; }),
      finishRemoval: vi.fn(async (_claim, result) => ({ ...wallet, state: result })),
    };
    const result = await removePayPalWallet(scope, wallet.methodId, { repository, gateway });
    expect(result).toEqual({ ...wallet, state: outcome });
    expect(repository.finishRemoval.mock.calls[0][1]).toBe(outcome);
    expect(deletion).toHaveBeenCalledOnce();
    expect(gateway.createInputs).toEqual([]);
    expect(gateway.captureInputs).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("private-fixture-token");
  });
  it.each(["removing", "removed", "rejected", "unknown"] as const)("never retries persisted %s", async (state) => {
    const { removePayPalWallet } = await subject();
    expect(typeof removePayPalWallet).toBe("function");
    const gateway = new FakePayPalGateway();
    const repository = { readOwnedWallet: vi.fn(), claimRemoval: vi.fn(async () => ({ kind: "existing" as const, wallet: { ...wallet, state } })), finishRemoval: vi.fn() };
    expect(await removePayPalWallet(scope, wallet.methodId, { repository, gateway })).toEqual({ ...wallet, state });
    expect(gateway.deleteInputs).toEqual([]);
    expect(repository.finishRemoval).not.toHaveBeenCalled();
  });
  it("does not contact provider when claim/ownership validation fails", async () => {
    const { removePayPalWallet } = await subject();
    expect(typeof removePayPalWallet).toBe("function");
    const gateway = new FakePayPalGateway();
    const repository = { readOwnedWallet: vi.fn(), claimRemoval: vi.fn().mockRejectedValue(new Error("payment_not_found")), finishRemoval: vi.fn() };
    await expect(removePayPalWallet(scope, wallet.methodId, { repository, gateway })).rejects.toThrow("payment_not_found");
    expect(gateway.deleteInputs).toEqual([]);
  });
  it("leaves removing visible when final persistence fails after provider success", async () => {
    const { removePayPalWallet } = await subject();
    expect(typeof removePayPalWallet).toBe("function");
    const gateway = new FakePayPalGateway();
    const repository = { readOwnedWallet: vi.fn(), claimRemoval: vi.fn(async () => ({ kind: "owner" as const, scope, wallet, paymentTokenId: "private" })), finishRemoval: vi.fn().mockRejectedValue(new Error("database_unavailable")) };
    await expect(removePayPalWallet(scope, wallet.methodId, { repository, gateway })).resolves.toEqual(wallet);
    expect(gateway.deleteInputs).toHaveLength(1);
  });
});

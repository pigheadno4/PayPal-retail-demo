import { afterEach, describe, expect, it, vi } from "vitest";
import { demoApi } from "./api.js";
const operationId = "33333333-3333-4333-8333-333333333333";
const status = { operationId, stage: "creation_unconfirmed", funding: "pending", reusableReadiness: "not_requested", customerMessage: "Creation unconfirmed." };
afterEach(() => vi.unstubAllGlobals());
describe("TASK-0012 operation status reader", () => {
  it("performs one authenticated no-store GET and validates its projection", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(status)));
    vi.stubGlobal("fetch", request);
    expect(await demoApi.readPayPalOperationStatus(operationId, "synthetic-token")).toEqual(status);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(`/api/v1/paypal/operations/${operationId}/status`, expect.objectContaining({ method: "GET", cache: "no-store", credentials: "same-origin", headers: { Authorization: "Bearer synthetic-token" } }));
  });
  it.each([{ ...status, orderId: "private" }, { ...status, operationId: "44444444-4444-4444-8444-444444444444" }])("rejects unsafe or different-operation status without replay", async (body) => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify(body)));
    vi.stubGlobal("fetch", request);
    await expect(demoApi.readPayPalOperationStatus(operationId, "synthetic-token")).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

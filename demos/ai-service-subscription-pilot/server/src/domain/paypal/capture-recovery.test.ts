import { describe, expect, it, vi } from "vitest";
import { recoverCapturedPayment, type CaptureRecoveryContext } from "./capture-recovery.js";

const operationId = "11111111-1111-4111-8111-111111111111";
const intentId = "22222222-2222-4222-8222-222222222222";
const quoteId = "33333333-3333-4333-8333-333333333333";
function context(): CaptureRecoveryContext {
  return { purpose: "initial", checkoutState: "payment_pending", operation: { internalId: 1n, operationId, accountId: 2n, intentId, quoteId, merchantId: "MERCHANT", environment: "sandbox", orderId: "PRIVATE-ORDER", createRequestId: "create", captureRequestId: "capture", fundingStatus: "approved", vaultStatus: "not_requested" }, review: { intentId, quoteId, tier: "go", cadence: "monthly", base: {currency: "USD", cents: 1000}, promotion: {currency: "USD", cents: -500}, taxableSubtotal: {currency: "USD", cents: 500}, tax: {currency: "USD", cents: 53}, dueToday: {currency: "USD", cents: 553}, taxBasisPoints: 1055, expiresAt: "2026-10-01T00:15:00Z", renewsAt: "2026-11-01T00:00:00Z", allowanceResetsAt: "2026-11-01T00:00:00Z", timeZone: "America/Los_Angeles", pricingVersion: "fixture", taxVersion: "fixture" } };
}
function raw() {
  return { id: "PRIVATE-ORDER", intent: "CAPTURE", status: "COMPLETED", payment_source: { paypal: { attributes: { vault: { status: "VAULTED", id: "PRIVATE-VAULT", customer: { id: "PRIVATE-CUSTOMER" } } } } }, purchase_units: [{ reference_id: quoteId, amount: { currency_code: "USD", value: "5.53" }, payee: { merchant_id: "MERCHANT" }, payments: { captures: [{ id: "PRIVATE-CAPTURE", status: "COMPLETED", final_capture: true, amount: { currency_code: "USD", value: "5.53" }, create_time: "2026-10-01T00:05:00Z", update_time: "2026-10-01T00:05:00Z" }] } }] };
}
function fixture() {
  const ctx = context(); const body = raw();
  const readContext = vi.fn(async () => ctx);
  const readCapturedOrder = vi.fn(async () => body);
  const inspectEvidence = vi.fn(async () => "pending" as "pending" | "complete");
  const apply = vi.fn(async () => undefined);
  return { ctx, body, readContext, readCapturedOrder, inspectEvidence, apply, dependencies: { merchantId: "MERCHANT", environment: "sandbox", readContext, readCapturedOrder, inspectEvidence, apply } };
}
const input = { operationId, checkoutId: intentId };

describe("one-operation capture recovery", () => {
  it("defaults to read-only eligibility despite expired quote and exposes no reusable IDs", async () => {
    const f = fixture();
    expect(await recoverCapturedPayment(input, f.dependencies)).toEqual({ operationId, mode: "dry_run", code: "eligible", amount: { currency: "USD", cents: 553 }, fundingEligible: true, vaultEligible: true });
    expect(f.apply).not.toHaveBeenCalled();
    expect(f.readCapturedOrder).toHaveBeenCalledExactlyOnceWith("PRIVATE-ORDER");
  });
  it("applies once using the original provider timestamp and unchanged quote", async () => {
    const f = fixture(); const before = structuredClone(f.ctx);
    expect(await recoverCapturedPayment({ ...input, apply: true }, f.dependencies)).toMatchObject({ code: "applied" });
    expect(f.apply).toHaveBeenCalledExactlyOnceWith(f.ctx, expect.objectContaining({ captureId: "PRIVATE-CAPTURE", capturedAt: "2026-10-01T00:05:00.000Z", amount: { currency: "USD", cents: 553 } }));
    expect(f.ctx).toEqual(before);
  });
  it("accepts a completed operation only after exact correlated readback and performs no write", async () => {
    const f = fixture(); f.ctx.operation = { ...f.ctx.operation, fundingStatus: "completed" };
    f.ctx.checkoutState = "funded";
    f.inspectEvidence.mockResolvedValue("complete");
    expect(await recoverCapturedPayment({ ...input, apply: true }, f.dependencies)).toMatchObject({ code: "already_recovered" });
    expect(f.apply).not.toHaveBeenCalled();
  });
  it("concurrent commit is a no-op only after a fresh consistent readback", async () => {
    const f = fixture(); f.apply.mockRejectedValue(new Error("payment_state_conflict"));
    f.readContext.mockResolvedValueOnce(f.ctx).mockResolvedValueOnce({...f.ctx,checkoutState:"funded",operation:{...f.ctx.operation,fundingStatus:"completed"}});
    f.inspectEvidence.mockResolvedValueOnce("pending").mockResolvedValueOnce("complete");
    expect(await recoverCapturedPayment({ ...input, apply: true }, f.dependencies)).toMatchObject({ code: "already_recovered" });
    expect(f.readContext).toHaveBeenCalledTimes(2); expect(f.inspectEvidence).toHaveBeenCalledTimes(2);
    expect(f.apply).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["approved","selected"],["approved","identity_verified"],["approved","funded"],["approved","expired"],["approved","canceled"],
    ["completed","selected"],["completed","identity_verified"],["completed","payment_pending"],["completed","expired"],["completed","canceled"],
  ] as const)("blocks %s operation with %s checkout in both modes before provider read or writes",async(fundingStatus,checkoutState)=>{
    for(const apply of [false,true]){
      const f=fixture();f.ctx.operation={...f.ctx.operation,fundingStatus};f.ctx.checkoutState=checkoutState;
      f.inspectEvidence.mockResolvedValue(fundingStatus==="completed"?"complete":"pending");
      expect(await recoverCapturedPayment({...input,apply},f.dependencies)).toMatchObject({code:"recovery_blocked",fundingEligible:false,vaultEligible:false});
      expect(f.readCapturedOrder).not.toHaveBeenCalled();expect(f.apply).not.toHaveBeenCalled();
    }
  });
  it("rejects a canceled completed checkout on fresh conflict readback instead of reporting a no-op",async()=>{
    const f=fixture();f.apply.mockRejectedValue(new Error("payment_state_conflict"));
    f.readContext.mockResolvedValueOnce(f.ctx).mockResolvedValueOnce({...f.ctx,checkoutState:"canceled",operation:{...f.ctx.operation,fundingStatus:"completed"}});
    f.inspectEvidence.mockResolvedValueOnce("pending").mockResolvedValueOnce("complete");
    expect(await recoverCapturedPayment({...input,apply:true},f.dependencies)).toMatchObject({code:"recovery_blocked"});
    expect(f.apply).toHaveBeenCalledTimes(1);expect(f.inspectEvidence).toHaveBeenCalledTimes(1);
  });
  const corruptions: [string, (f: ReturnType<typeof fixture>) => void][] = [
    ["wrong order", f => { f.body.id = "OTHER"; }], ["incomplete order", f => { f.body.status = "APPROVED"; }],
    ["wrong intent", f => { f.body.intent = "AUTHORIZE"; }], ["wrong reference", f => { f.body.purchase_units[0]!.reference_id = "OTHER"; }],
    ["merchant missing", f => { f.body.purchase_units[0]!.payee.merchant_id = ""; }], ["merchant mismatch", f => { f.body.purchase_units[0]!.payee.merchant_id = "OTHER"; }],
    ["amount mismatch", f => { f.body.purchase_units[0]!.payments.captures[0]!.amount.value = "10.53"; }],
    ["currency mismatch", f => { f.body.purchase_units[0]!.payments.captures[0]!.amount.currency_code = "EUR"; }],
    ["unit amount mismatch", f => { f.body.purchase_units[0]!.amount.value = "10.53"; }],
    ["not final", f => { f.body.purchase_units[0]!.payments.captures[0]!.final_capture = false; }],
    ["refunded", f => { f.body.purchase_units[0]!.payments.captures[0]!.status = "REFUNDED"; }],
    ["reversed", f => { f.body.purchase_units[0]!.payments.captures[0]!.status = "REVERSED"; }],
    ["pending", f => { f.body.purchase_units[0]!.payments.captures[0]!.status = "PENDING"; }],
    ["multiple captures", f => { f.body.purchase_units[0]!.payments.captures.push(f.body.purchase_units[0]!.payments.captures[0]!); }],
    ["multiple units", f => { f.body.purchase_units.push(f.body.purchase_units[0]!); }],
    ["bad timestamp", f => { f.body.purchase_units[0]!.payments.captures[0]!.update_time = "private-invalid"; }],
    ["changed capture timestamp", f => { f.body.purchase_units[0]!.payments.captures[0]!.update_time = "2026-10-02T00:05:00Z"; }],
    ["vault not durable", f => { f.body.payment_source.paypal.attributes.vault.status = "APPROVED"; }],
    ["vault missing", f => { f.body.payment_source.paypal.attributes.vault.id = ""; }],
    ["customer missing", f => { f.body.payment_source.paypal.attributes.vault.customer.id = ""; }],
    ["wrong scope", f => { f.ctx.operation = { ...f.ctx.operation, environment: "live" }; }],
    ["wrong owner", f => { f.ctx.review = { ...f.ctx.review, intentId: "OTHER" }; }],
    ["wrong operation", f => { f.ctx.operation = { ...f.ctx.operation, operationId: "OTHER" }; }],
    ["wrong merchant context", f => { f.ctx.operation = { ...f.ctx.operation, merchantId: "OTHER" }; }],
    ["wrong purpose", f => { f.ctx.purpose = "reactivation"; }],
    ["wrong state", f => { f.ctx.operation = { ...f.ctx.operation, fundingStatus: "failed" }; }],
    ["DB ownership conflict", f => { f.inspectEvidence.mockRejectedValue(new Error("private-sql-credential")); }],
    ["transport failed", f => { f.readCapturedOrder.mockRejectedValue(new Error("private-token")); }],
  ];
  it.each(corruptions)("blocks %s with zero application writes and no private output", async (_name, corrupt) => {
    const f = fixture(); corrupt(f);
    expect(await recoverCapturedPayment({ ...input, apply: true }, f.dependencies)).toEqual({ operationId, mode: "apply", code: "recovery_blocked", fundingEligible: false, vaultEligible: false });
    expect(f.apply).not.toHaveBeenCalled();
  });
  it("does not turn SQL failure into a success or retry", async () => {
    const f = fixture(); f.apply.mockRejectedValue(new Error("private-sql"));
    expect(await recoverCapturedPayment({ ...input, apply: true }, f.dependencies)).toMatchObject({ code: "recovery_blocked" });
    expect(f.apply).toHaveBeenCalledTimes(1);
  });
  it.each([null, {}, {purchase_units:[]}, {purchase_units:[null]}])("rejects incomplete provider GET %#", async raw => {
    const f=fixture();f.readCapturedOrder.mockResolvedValue(raw as ReturnType<typeof fixture>["body"]);
    expect(await recoverCapturedPayment({...input,apply:true},f.dependencies)).toMatchObject({code:"recovery_blocked"});expect(f.apply).not.toHaveBeenCalled();
  });
  it("blocks mismatched merchant on the capture even when the unit merchant matches", async()=>{
    const f=fixture();Object.assign(f.body.purchase_units[0]!.payments.captures[0]!,{payee:{merchant_id:"OTHER"}});
    expect(await recoverCapturedPayment({...input,apply:true},f.dependencies)).toMatchObject({code:"recovery_blocked"});expect(f.apply).not.toHaveBeenCalled();
  });
  it("blocks refund evidence even if capture status remains completed",async()=>{
    const f=fixture();Object.assign(f.body.purchase_units[0]!.payments,{refunds:[{status:"COMPLETED"}]});
    expect(await recoverCapturedPayment({...input,apply:true},f.dependencies)).toMatchObject({code:"recovery_blocked"});expect(f.apply).not.toHaveBeenCalled();
  });
});

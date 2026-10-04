import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PayPalWallet } from "../../../../shared/src/paypal.js";

describe("wallet removal presentation", () => {
  it.each(["ready", "removing", "removed", "rejected", "unknown"] as const)("truthfully renders %s without leaking provider data", async (state) => {
    const subject = await import("./payment-method.js").catch(() => ({})) as typeof import("./payment-method.js");
    expect(typeof subject.PaymentMethodView).toBe("function");
    const wallet: PayPalWallet = { methodId: "11111111-1111-4111-8111-111111111111", brand: "PayPal Wallet", state, renewalReady: state === "ready", paidThrough: "2026-11-01T00:00:00.000Z" };
    const html = renderToStaticMarkup(<subject.PaymentMethodView wallet={wallet} loading={false} error={null} busy={false} onConfirm={vi.fn()} />);
    expect(html).toContain("Payment method");
    expect(html).toContain("Your subscription and already-paid service period stay unchanged");
    expect(html).toContain("Confirm removal");
    if (state === "ready") expect(html).toContain("Remove wallet");
    else expect(html).not.toContain(">Remove wallet<");
    if (state === "removed") expect(html).toContain("PayPal confirmed removal");
    if (state === "unknown") expect(html).toContain("could not be confirmed");
    if (state === "rejected") expect(html).toContain("declined the cleanup");
    expect(html).not.toContain(wallet.methodId);
  });
  it("keeps fetch errors and no-wallet states separate from paid usage", async () => {
    const subject = await import("./payment-method.js").catch(() => ({})) as typeof import("./payment-method.js");
    expect(typeof subject.PaymentMethodView).toBe("function");
    const html = renderToStaticMarkup(<subject.PaymentMethodView wallet={null} loading={false} error="Wallet information is unavailable. Your paid workspace remains available." busy={false} onConfirm={vi.fn()} />);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain(">Remove wallet<");
  });
});

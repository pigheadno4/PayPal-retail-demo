import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { CheckoutReview } from "../../../shared/src/checkout.js";
import { CheckoutRouteView } from "./checkout.js";

const review: CheckoutReview = {
  intentId: "11111111-1111-4111-8111-111111111111",
  quoteId: "22222222-2222-4222-8222-222222222222",
  tier: "go",
  cadence: "monthly",
  base: { currency: "USD", cents: 1000 },
  promotion: { currency: "USD", cents: -500 },
  taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055,
  tax: { currency: "USD", cents: 53 },
  dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2026-08-29T04:15:00.000Z",
  renewsAt: "2026-09-29T04:00:00.000Z",
  allowanceResetsAt: "2026-09-29T04:00:00.000Z",
  timeZone: "America/Los_Angeles",
  pricingVersion: "go-monthly-v1",
  taxVersion: "us-wa-seattle-q3-2026",
};

describe("CheckoutRouteView", () => {
  it.each([
    { busy: false }, { busy: true }, { busy: false, error: "The code could not be requested." },
    { busy: false, requested: true }, { busy: true, requested: true },
    { busy: false, requested: true, error: "That code could not be verified." },
  ])("offers only email OTP while preserving identity state %#", (identity) => {
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "identity", ...identity }}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    expect(html).toContain(identity.requested ? "Verification code" : "Email address");
    expect(html).toContain(identity.busy ? (identity.requested ? "Verifying…" : "Requesting…")
      : (identity.requested ? "Verify and review" : "Send verification code"));
    expect(html).not.toMatch(/24-hour demo address|Retrieve this browser|identity-route|type="radio"|high-entropy/);
    if (identity.busy) expect(html).toContain('disabled=""');
    if (identity.error) expect(html).toContain(identity.error);
    expect(html).not.toMatch(/paypal|stripe|activate|allowance balance/i);
  });

  it("renders the exact immutable review and a visible stop before payment", () => {
    vi.useFakeTimers();
    vi.stubEnv("VITE_PAYPAL_CLIENT_ID", "synthetic-client");
    vi.setSystemTime(new Date("2026-08-29T04:00:00.000Z"));
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "review", review, stale: false, busy: false, accessToken: "TOKEN-REDACTED" }}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    for (const value of ["$10.00", "−$5.00", "$5.00", "10.55%", "$0.53", "$5.53"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain("America/Los_Angeles");
    expect(html).not.toContain('type="checkbox"');
    expect(html).toContain("Your recurring-payment terms");
    expect(html).toContain("$10.00 monthly plus then-applicable tax");
    expect(html).toContain("Preparing secure PayPal checkout");
    expect(html).not.toMatch(/stripe|activate|allowance balance/i);
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("makes stale state explicit and exposes only quote replacement", () => {
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "review", review, stale: true, busy: false, accessToken: "TOKEN-REDACTED" }}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    expect(html).toContain("Review expired");
    expect(html).toContain("Refresh review");
    expect(html).not.toMatch(/pay now|paypal/i);
  });
});

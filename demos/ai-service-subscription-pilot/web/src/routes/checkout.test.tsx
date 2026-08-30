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
  it("offers persistent and originating-browser temporary identity without provider UI", () => {
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "identity", route: "persistent", busy: false }}
        onIdentityRoute={vi.fn()}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onRevealDemoOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    expect(html).toContain("Use my email");
    expect(html).toContain("24-hour demo address");
    expect(html).toContain("Send verification code");
    expect(html).not.toMatch(/paypal|stripe|activate|allowance balance/i);
  });

  it("renders the exact immutable review and a visible stop before payment", () => {
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "review", review, stale: false, busy: false, accessToken: "TOKEN-REDACTED" }}
        onIdentityRoute={vi.fn()}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onRevealDemoOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    for (const value of ["$10.00", "−$5.00", "$5.00", "10.55%", "$0.53", "$5.53"]) {
      expect(html).toContain(value);
    }
    expect(html).toContain("America/Los_Angeles");
    expect(html).toContain("Save my PayPal Wallet for future recurring Go payments");
    expect(html).toContain("official PayPal control");
    expect(html).not.toMatch(/stripe|activate|allowance balance/i);
  });

  it("makes stale state explicit and exposes only quote replacement", () => {
    const html = renderToStaticMarkup(
      <CheckoutRouteView
        state={{ phase: "review", review, stale: true, busy: false, accessToken: "TOKEN-REDACTED" }}
        onIdentityRoute={vi.fn()}
        onRequestOtp={vi.fn()}
        onVerifyOtp={vi.fn()}
        onRevealDemoOtp={vi.fn()}
        onReplaceQuote={vi.fn()}
      />,
    );

    expect(html).toContain("Review expired");
    expect(html).toContain("Refresh review");
    expect(html).not.toMatch(/pay now|paypal/i);
  });
});

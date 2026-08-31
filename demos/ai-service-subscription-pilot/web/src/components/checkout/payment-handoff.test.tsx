import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PaymentHandoff } from "./payment-handoff.js";
import { operationIdAfterRetry } from "./quote-review.js";

describe("PaymentHandoff", () => {
  it.each([
    ["verified", "Verified", "Preparing your Go workspace"],
    ["pending", "Pending", "Confirming your payment"],
    ["failed", "Failed", "Payment was not completed"],
  ] as const)("renders %s funding without overstating the handoff", (funding, label, heading) => {
    const html = renderToStaticMarkup(createElement(PaymentHandoff, {
      status: {
        operationId: "33333333-3333-4333-8333-333333333333",
        funding,
        reusableReadiness: funding === "verified" ? "ready" : funding,
        customerMessage: "sanitized status",
      },
    }));

    expect(html).toContain(`<h2>${heading}</h2>`);
    expect(html).toContain(`<strong>${label}</strong>`);
    if (funding === "verified") {
      expect(html).toContain("Open Go workspace");
      expect(html).not.toContain("Not granted yet");
    } else {
      expect(html).toContain("Not granted yet");
    }
    if (funding !== "verified") expect(html).not.toContain("Preparing your Go workspace");
  });

  it("reuses a pending operation but creates a fresh operation after definitive failure", () => {
    const current = "33333333-3333-4333-8333-333333333333";
    const replacement = "55555555-5555-4555-8555-555555555555";

    expect(operationIdAfterRetry("pending", current, () => replacement)).toBe(current);
    expect(operationIdAfterRetry("failed", current, () => replacement)).toBe(replacement);
  });
});

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ActivationState } from "@/components/checkout/activation-state";

describe("ActivationState", () => {
  it.each([
    ["verified", "Verified", "Preparing your Go workspace"],
    ["pending", "Pending", "Confirming your payment"],
    ["failed", "Failed", "Payment was not completed"],
  ] as const)("renders %s funding without overstating the handoff", (funding, label, heading) => {
    const html = renderToStaticMarkup(createElement(ActivationState, {
      status: {
        operationId: "33333333-3333-4333-8333-333333333333",
        funding,
        reusableReadiness: funding === "verified" ? "ready" : funding,
        customerMessage: "sanitized status",
      },
    }));

    expect(html).toContain(`<h2>${heading}</h2>`);
    expect(html).toContain(`<strong>${label}</strong>`);
    expect(html).toContain("Not granted yet");
    if (funding !== "verified") expect(html).not.toContain("Preparing your Go workspace");
  });
});

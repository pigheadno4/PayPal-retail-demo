// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  ExpressReviewPage,
  type ExpressReviewPageData,
} from "./ExpressReviewPage.js";

afterEach(() => {
  cleanup();
});

describe("ExpressReviewPage", () => {
  it("renders the synchronized express delivery review snapshot", () => {
    const html = renderToStaticMarkup(
      <ExpressReviewPage data={expressReviewData()} />,
    );

    expect(html).toContain("Review and Confirm");
    expect(html).toContain("Delivery express from cart");
    expect(html).toContain("Merchant order DO-20260607-000123");
    expect(html).toContain("PayPal order 9AB12345CD6789012");
    expect(html).toContain("Payment session synchronized");
    expect(html).toContain("Taylor Chen");
    expect(html).toContain("88 Spring Street");
    expect(html).toContain("Standard shipping");
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("Hirono Little Mischief");
    expect(html).toContain("Merchandise subtotal");
    expect(html).toContain("$25.98");
    expect(html).toContain("Shipping");
    expect(html).toContain("$5.00");
    expect(html).toContain("Promo");
    expect(html).toContain("-$3.00");
    expect(html).toContain("Tax");
    expect(html).toContain("$2.02");
    expect(html).toContain("Total");
    expect(html).toContain("$30.00");
    expect(html).toContain("Confirm and pay");
    expect(html).toContain('data-amount-consistency="verified"');
    expect(
      (html.match(/data-slot="card"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      (html.match(/data-slot="card-header"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      (html.match(/data-slot="card-title"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      (html.match(/data-slot="card-content"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(5);
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="separator"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain('data-variant="default"');
  });

  it("keeps capture blocked when the amount guard is not verified", () => {
    const html = renderToStaticMarkup(
      <ExpressReviewPage
        data={{
          ...expressReviewData(),
          amountGuard: {
            status: "blocked",
            label: "Amount mismatch detected",
            body: "Merchant total and PayPal amount must match before capture.",
          },
        }}
      />,
    );

    expect(html).toContain("Amount mismatch detected");
    expect(html).toContain(
      "Merchant total and PayPal amount must match before capture.",
    );
    expect(html).toContain("disabled");
  });

  it("promotes the guest account CTA after capture without a disabled confirm button", () => {
    const html = renderToStaticMarkup(
      <ExpressReviewPage
        accountLinkPrompt={{ status: "idle", onCreateAccount: () => {} }}
        captureState={{
          status: "captured",
          message: "Payment captured",
          captureId: "PAYPAL_CAPTURE_EXPRESS",
        }}
        data={expressReviewData()}
      />,
    );

    expect(html).toContain('aria-label="Captured payment receipt"');
    expect(html).toContain("Capture status");
    expect(html).toContain("PayPal capture ID");
    expect(html).toContain("Save order");
    expect(html).toMatch(
      /data-slot="card"[^>]*class="[^"]*express-review-capture-status/,
    );
    expect(html).toMatch(
      /data-slot="card"[^>]*class="[^"]*express-review-account-link/,
    );
    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain('data-variant="outline"');
    expect(html).not.toContain("Confirm and pay");
  });

  it("renders captured express orders as an order-confirmation page", () => {
    const html = renderToStaticMarkup(
      <ExpressReviewPage
        accountLinkPrompt={{ status: "idle", onCreateAccount: () => {} }}
        captureState={{
          status: "captured",
          message: "Payment captured",
          captureId: "PAYPAL_CAPTURE_EXPRESS",
        }}
        data={expressReviewData()}
      />,
    );

    expect(html).toContain('aria-label="Order confirmation"');
    expect(html).toContain("Thank you!");
    expect(html).toContain("Order DO-20260607-000123");
    expect(html).toContain("A confirmation receipt is ready.");
    expect(html).toContain("View Order");
    expect(html).toContain('href="/guest-orders"');
    expect(html).toContain("Continue Shopping");
    expect(html).toContain('href="/products"');
    expect(html).toContain("Order Details");
    expect(html).toContain("Payment Status");
    expect(html).toContain("Payment captured");
    expect(html).toContain("Shipping Method");
    expect(html).toContain("Estimated Delivery");
    expect(html).not.toContain("Review and Confirm");
    expect(html).not.toContain("PayPal order 9AB12345CD6789012");
  });

  it("renders recommended products only when real product data is supplied", () => {
    const withoutRecommendations = renderToStaticMarkup(
      <ExpressReviewPage
        captureState={{
          status: "captured",
          message: "Payment captured",
          captureId: "PAYPAL_CAPTURE_EXPRESS",
        }}
        data={expressReviewData()}
      />,
    );

    expect(withoutRecommendations).not.toContain("You may also like");
    expect(withoutRecommendations).not.toContain("Protective Showcase");

    const withRecommendations = renderToStaticMarkup(
      <ExpressReviewPage
        captureState={{
          status: "captured",
          message: "Payment captured",
          captureId: "PAYPAL_CAPTURE_EXPRESS",
        }}
        data={{
          ...expressReviewData(),
          recommendations: [
            {
              id: "rec-showcase",
              name: "Protective Showcase",
              eyebrow: "Accessories",
              priceLabel: "$9.99",
              href: "/products/accessories-21",
              imagePath: "/assets/popmart/products/accessories-21-1.png",
              imageAlt: "Protective Showcase generated product",
            },
          ],
        }}
      />,
    );

    expect(withRecommendations).toContain("You may also like");
    expect(withRecommendations).toContain("Protective Showcase");
    expect(withRecommendations).toContain('href="/products/accessories-21"');
    expect(withRecommendations).toContain(
      'src="/assets/popmart/products/accessories-21-1.png"',
    );
    expect(withRecommendations).toContain('data-slot="card"');
  });

  it("focuses the save-order prompt when guest capture completes", async () => {
    render(
      <ExpressReviewPage
        accountLinkPrompt={{ status: "idle", onCreateAccount: () => {} }}
        captureState={{
          status: "captured",
          message: "Payment captured",
          captureId: "PAYPAL_CAPTURE_EXPRESS",
        }}
        data={expressReviewData()}
      />,
    );

    const prompt = screen.getByLabelText("Save guest order");
    await waitFor(() => {
      expect(document.activeElement).toBe(prompt);
    });
  });
});

function expressReviewData(): ExpressReviewPageData {
  return {
    sourceLabel: "Delivery express from cart",
    merchantOrderNumber: "DO-20260607-000123",
    paypalOrderId: "9AB12345CD6789012",
    paymentMethodLabel: "PayPal",
    statusLabel: "Payment session synchronized",
    shippingAddress: {
      name: "Taylor Chen",
      line1: "88 Spring Street",
      line2: "New York, NY 10012",
      country: "United States",
    },
    shippingOption: {
      label: "Standard shipping",
      detail: "Arrives in 4-6 business days",
      amountLabel: "$5.00",
    },
    items: [
      {
        id: "line-1",
        name: "Labubu Have a Seat",
        detail: "Blind Boxes - Qty 1",
        amountLabel: "$12.99",
      },
      {
        id: "line-2",
        name: "Hirono Little Mischief",
        detail: "Plush - Qty 1",
        amountLabel: "$12.99",
      },
    ],
    totals: [
      {
        label: "Merchandise subtotal",
        amountLabel: "$25.98",
      },
      {
        label: "Shipping",
        amountLabel: "$5.00",
      },
      {
        label: "Promo",
        amountLabel: "-$3.00",
      },
      {
        label: "Tax",
        amountLabel: "$2.02",
      },
      {
        label: "Total",
        amountLabel: "$30.00",
        emphasis: true,
      },
    ],
    amountGuard: {
      status: "verified",
      label: "Amount verified",
      body: "Merchant total matches the synchronized PayPal order amount.",
    },
  };
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ExpressReviewPage,
  type ExpressReviewPageData,
} from "./ExpressReviewPage.js";

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

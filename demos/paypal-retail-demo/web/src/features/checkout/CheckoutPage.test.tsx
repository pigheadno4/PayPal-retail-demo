import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CheckoutPage, type CheckoutPageData } from "./CheckoutPage.js";

describe("CheckoutPage", () => {
  it("renders Delivery and Pickup tabs with separate preserved step state shells", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Delivery");
    expect(html).toContain("Pickup");
    expect(html).toContain("Shipping address");
    expect(html).toContain("Billing address");
    expect(html).toContain("Shipping options");
    expect(html).toContain("Payment method");
    expect(html).toContain("Pickup location");
    expect(html).toContain("Store selection");
    expect(html).toContain("Pickup date");
    expect(html).toContain("Idle");
    expect(html).toContain("Saving");
    expect(html).toContain("Saved");
    expect(html).toContain("Editing");
    expect(html).toContain("Recalculating totals");
    expect(html).toContain("Blocked");
    expect(html).toContain("Locked");
  });

  it("updates order summary context for the active fulfillment mode", () => {
    const deliveryHtml = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ activeMode: "delivery" })} />,
    );
    const pickupHtml = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ activeMode: "pickup" })} />,
    );

    expect(deliveryHtml).toContain("Delivery order");
    expect(deliveryHtml).toContain("Ground delivery");
    expect(deliveryHtml).not.toContain("Ready for pickup");

    expect(pickupHtml).toContain("Pickup order");
    expect(pickupHtml).toContain("Ready for pickup");
    expect(pickupHtml).toContain("Not available at this store");
    expect(pickupHtml).toContain(
      "Unavailable items stay in the original cart.",
    );
  });

  it("locks fulfillment mode after payment session starts", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          modeLocked: true,
        })}
      />,
    );

    expect(html).toContain("Payment session started");
    expect(html).toContain(
      "Switching requires abandoning this payment attempt.",
    );
    expect(html).toContain('aria-disabled="true"');
  });
});

function checkoutData(
  overrides: Partial<Pick<CheckoutPageData, "activeMode" | "modeLocked">> = {},
): CheckoutPageData {
  return {
    activeMode: overrides.activeMode ?? "delivery",
    modeLocked: overrides.modeLocked ?? false,
    lockedReason: "Switching requires abandoning this payment attempt.",
    delivery: {
      label: "Delivery",
      summary: {
        title: "Delivery order",
        contextLabel: "Ground delivery",
        subtotalLabel: "$25.98",
        promoLabel: "Auto promo calculating",
        totalLabel: "$25.98",
        selectedPaymentLabel: "PayPal selected",
      },
      steps: [
        {
          id: "shipping-address",
          title: "Shipping address",
          state: "idle",
          body: "Use saved shipping address or enter a new delivery address.",
        },
        {
          id: "billing-address",
          title: "Billing address",
          state: "saving",
          body: "Same as shipping is checked by default.",
        },
        {
          id: "shipping-options",
          title: "Shipping options",
          state: "saved",
          body: "Cheapest eligible option is selected by default.",
        },
        {
          id: "payment-method",
          title: "Payment method",
          state: "editing",
          body: "Radio-first payment method wall renders here.",
        },
      ],
    },
    pickup: {
      label: "Pickup",
      summary: {
        title: "Pickup order",
        contextLabel: "POP MART Soho",
        subtotalLabel: "$12.99",
        promoLabel: "Pickup promo recalculating",
        totalLabel: "$12.99",
        selectedPaymentLabel: "PayPal selected",
        readyItemsLabel: "Ready for pickup: 1 item",
        unavailableItemsLabel: "Not available at this store: 1 item",
        partialInventoryNote: "Unavailable items stay in the original cart.",
      },
      steps: [
        {
          id: "pickup-location",
          title: "Pickup location",
          state: "recalculating",
          body: "Use ZIP or default address to rank nearby stores.",
        },
        {
          id: "store-selection",
          title: "Store selection",
          state: "blocked",
          body: "Store card shows available and unavailable item counts.",
        },
        {
          id: "pickup-billing-address",
          title: "Billing address",
          state: "locked",
          body: "Billing address is locked after payment session starts.",
        },
        {
          id: "pickup-date",
          title: "Pickup date",
          state: "idle",
          body: "Store-specific pickup calendar renders here.",
        },
        {
          id: "pickup-payment-method",
          title: "Payment method",
          state: "idle",
          body: "Pickup payment method wall renders here.",
        },
      ],
    },
  };
}

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckoutPage,
  type CheckoutPageData,
  type CheckoutValidationState,
} from "./CheckoutPage.js";

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

  it("renders detailed Delivery accordion content and default choices", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain("Full name");
    expect(html).toContain("Street address");
    expect(html).toContain("City");
    expect(html).toContain("State");
    expect(html).toContain("ZIP code");
    expect(html).toContain("Submit shipping address");
    expect(html).toContain("Same as shipping");
    expect(html).toContain("Save billing address");
    expect(html).toContain("Standard shipping");
    expect(html).toContain("Cheapest option");
    expect(html).toContain("Express shipping");
    expect(html).toContain("Submit shipping option");
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain("Credit or debit card");
    expect(html).toContain("Apple Pay");
    expect(html).toContain("Google Pay");
  });

  it("renders detailed Pickup accordion content and partial store counts before store submit", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ activeMode: "pickup" })} />,
    );

    expect(html).toContain("ZIP or postcode");
    expect(html).toContain("Use default address");
    expect(html).toContain("POP MART Soho");
    expect(html).toContain("1.2 mi");
    expect(html).toContain("Available: 1 item");
    expect(html).toContain("Unavailable: 1 item");
    expect(html).toContain("Partial inventory");
    expect(html).toContain("Submit pickup store");
    expect(html).toContain("Billing street address");
    expect(html).toContain("Save billing address");
    expect(html).toContain("June 12");
    expect(html).toContain("June 13");
    expect(html).toContain("Submit pickup date");
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
  });

  it("announces checkout validation errors and marks the first invalid field as the focus target", () => {
    const validation: CheckoutValidationState = {
      summaryMessage: "Shipping address needs attention.",
      focusStepId: "shipping-address",
      messages: [
        {
          id: "shipping-address-city-error",
          stepId: "shipping-address",
          fieldLabel: "City",
          message: "City is required before shipping options can be quoted.",
        },
      ],
    };

    const html = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ validation })} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("Shipping address needs attention.");
    expect(html).toContain('data-focus-target="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('aria-describedby="shipping-address-city-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain(
      "City is required before shipping options can be quoted.",
    );
  });

  it("renders the selected payment action inside Order Summary with active draft context", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({ activeMode: "pickup" })}
        renderPaymentAction={(context) => (
          <div
            data-payment-action-placement="order-summary"
            data-payment-checkout-draft-id={context.checkoutDraftId}
            data-payment-fulfillment-mode={context.fulfillmentMode}
            data-payment-method={context.selectedPaymentMethod}
          >
            Payment action
          </div>
        )}
      />,
    );

    expect(html).toContain('aria-label="Selected payment method"');
    expect(html).toContain('data-payment-action-placement="order-summary"');
    expect(html).toContain('data-payment-checkout-draft-id="draft_pickup_123"');
    expect(html).toContain('data-payment-fulfillment-mode="pickup"');
    expect(html).toContain('data-payment-method="paypal"');
  });

  it("renders the Pay Later row message for the active checkout draft", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({ activeMode: "delivery" })}
        renderPayLaterRowMessage={(context) => (
          <div
            data-paylater-message-placement="payment-row"
            data-paylater-message-amount-label={context.totalLabel}
            data-paylater-message-checkout-draft-id={context.checkoutDraftId}
            data-paylater-message-fulfillment-mode={context.fulfillmentMode}
          >
            Pay Later row message
          </div>
        )}
      />,
    );

    expect(html).toContain('data-payment-method-row="paylater"');
    expect(html).toContain('data-paylater-message-placement="payment-row"');
    expect(html).toContain('data-paylater-message-amount-label="$25.98"');
    expect(html).toContain(
      'data-paylater-message-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).toContain('data-paylater-message-fulfillment-mode="delivery"');
  });
});

function checkoutData(
  overrides: Partial<
    Pick<CheckoutPageData, "activeMode" | "modeLocked" | "validation">
  > = {},
): CheckoutPageData {
  const data: CheckoutPageData = {
    activeMode: overrides.activeMode ?? "delivery",
    modeLocked: overrides.modeLocked ?? false,
    lockedReason: "Switching requires abandoning this payment attempt.",
    delivery: {
      label: "Delivery",
      checkoutDraftId: "draft_delivery_123",
      summary: {
        title: "Delivery order",
        contextLabel: "Ground delivery",
        subtotalLabel: "$25.98",
        promoLabel: "Auto promo calculating",
        totalLabel: "$25.98",
        selectedPaymentLabel: "PayPal selected",
        selectedPaymentMethod: "paypal",
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
      checkoutDraftId: "draft_pickup_123",
      summary: {
        title: "Pickup order",
        contextLabel: "POP MART Soho",
        subtotalLabel: "$12.99",
        promoLabel: "Pickup promo recalculating",
        totalLabel: "$12.99",
        selectedPaymentLabel: "PayPal selected",
        selectedPaymentMethod: "paypal",
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

  return overrides.validation
    ? { ...data, validation: overrides.validation }
    : data;
}

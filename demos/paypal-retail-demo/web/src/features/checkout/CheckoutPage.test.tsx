import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  CheckoutPage,
  type CheckoutChoice,
  type CheckoutPageData,
  type CheckoutSelectedPaymentMethod,
  type CheckoutStep,
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
    expect(html).toContain("Editing");
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

  it("renders only the active Delivery shipping section before accordion progression", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain("Full name");
    expect(html).toContain("Street address");
    expect(html).toContain("City");
    expect(html).toContain("State");
    expect(html).toContain("ZIP code");
    expect(html).toContain("Submit shipping address");
    expect(html).not.toContain("Save billing address");
    expect(html).not.toContain("Standard shipping");
    expect(html).not.toContain("Cheapest option");
    expect(html).not.toContain("Express shipping");
    expect(html).not.toContain("Submit shipping option");
    expect(html).not.toContain("Credit or debit card");
    expect(html).not.toContain("Apple Pay");
    expect(html).not.toContain("Google Pay");
    expect(html).not.toContain("Venmo");
  });

  it("renders only the active Pickup location section before store selection", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ activeMode: "pickup" })} />,
    );

    expect(html).toContain("ZIP or postcode");
    expect(html).toContain("Use default address");
    expect(html).toContain("Store selection");
    expect(html).not.toContain("1.2 mi");
    expect(html).not.toContain("Available: 1 item");
    expect(html).not.toContain("Unavailable: 1 item");
    expect(html).not.toContain("Partial inventory");
    expect(html).not.toContain("Submit pickup store");
    expect(html).not.toContain("Billing street address");
    expect(html).not.toContain("Save billing address");
    expect(html).not.toContain("June 12");
    expect(html).not.toContain("June 13");
    expect(html).not.toContain("Submit pickup date");
  });

  it("renders detailed Pickup store cards when store selection is the active section", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          activePickupStepId: "store-selection",
        })}
      />,
    );

    expect(html).toContain("POP MART Soho");
    expect(html).toContain("1.2 mi");
    expect(html).toContain("Available: 1 item");
    expect(html).toContain("Unavailable: 1 item");
    expect(html).toContain("Partial inventory");
    expect(html).toContain("Submit pickup store");
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

  it("reserves Order Summary payment space without mounting the official action before the payment step is active", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData()}
        renderPaymentAction={(context) => (
          <div
            data-payment-action-placement="order-summary"
            data-payment-method={context.selectedPaymentMethod}
          >
            Payment action
          </div>
        )}
      />,
    );

    expect(html).toContain('data-payment-action-reserved-space="true"');
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('class="checkout-sticky-action"');
  });

  it("renders the selected payment action inside Order Summary with active draft context", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          activePickupStepId: "pickup-payment-method",
        })}
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
    expect(html).toContain('data-payment-action-reserved-space="true"');
  });

  it("renders the Pay Later row message for the active checkout draft", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          activeMode: "delivery",
        })}
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

  it("expands selected card fields inside the payment step without a sticky payment action", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: "card",
        })}
        renderCardPaymentBox={(context) => (
          <div
            data-card-payment-box="true"
            data-payment-checkout-draft-id={context.checkoutDraftId}
            data-payment-fulfillment-mode={context.fulfillmentMode}
            data-payment-method={context.selectedPaymentMethod}
          >
            Card fields
          </div>
        )}
        renderPaymentAction={(context) => (
          <div data-payment-action-placement="order-summary">
            {context.selectedPaymentMethod}
          </div>
        )}
      />,
    );

    expect(html).toContain('data-payment-method-row="card"');
    expect(html).toContain('data-card-payment-box="true"');
    expect(html).toContain(
      'data-payment-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).toContain('data-payment-fulfillment-mode="delivery"');
    expect(html).toContain('data-payment-method="card"');
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('class="checkout-sticky-action"');
  });

  it("passes save-for-future eligibility only for supported selected methods", () => {
    const paypalHtml = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          saveForFutureEligible: true,
          selectedPaymentMethod: "paypal",
        })}
        renderPaymentAction={(context) => (
          <div data-save-for-future-eligible={context.saveForFutureEligible}>
            PayPal action
          </div>
        )}
      />,
    );
    const payLaterHtml = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          saveForFutureEligible: true,
          selectedPaymentMethod: "paylater",
        })}
        renderPaymentAction={(context) => (
          <div data-save-for-future-eligible={context.saveForFutureEligible}>
            Pay Later action
          </div>
        )}
      />,
    );
    const cardHtml = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          saveForFutureEligible: true,
          selectedPaymentMethod: "card",
        })}
        renderCardPaymentBox={(context) => (
          <div data-save-for-future-eligible={context.saveForFutureEligible}>
            Card box
          </div>
        )}
      />,
    );
    const walletHtml = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          saveForFutureEligible: true,
          selectedPaymentMethod: "venmo",
        })}
        renderPaymentAction={(context) => (
          <div data-save-for-future-eligible={context.saveForFutureEligible}>
            Wallet action
          </div>
        )}
      />,
    );

    expect(paypalHtml).toContain('data-save-for-future-eligible="true"');
    expect(cardHtml).toContain('data-save-for-future-eligible="true"');
    expect(payLaterHtml).toContain('data-save-for-future-eligible="false"');
    expect(walletHtml).toContain('data-save-for-future-eligible="false"');
  });

  it("hides ineligible wallet rows and withholds the selected payment action", () => {
    const paymentChoices: readonly (CheckoutChoice & {
      readonly eligible: boolean;
      readonly ineligibleReasonLabel?: string;
    })[] = [
      {
        label: "PayPal",
        method: "paypal",
        eligible: true,
      },
      {
        label: "Apple Pay",
        method: "apple_pay",
        eligible: false,
        ineligibleReasonLabel: "Apple Pay is unavailable in this browser.",
      },
      {
        label: "Venmo",
        method: "venmo",
        eligible: true,
      },
    ];
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          paymentChoices,
          selectedPaymentMethod: "apple_pay",
        })}
        renderPaymentAction={() => (
          <div data-payment-action-placement="order-summary">
            Payment action
          </div>
        )}
      />,
    );

    expect(html).toContain('data-payment-method-row="paypal"');
    expect(html).toContain('data-payment-method-row="venmo"');
    expect(html).not.toContain('data-payment-method-row="apple_pay"');
    expect(html).not.toContain("Apple Pay is unavailable in this browser.");
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('class="checkout-sticky-action"');
  });

  it("passes eligible selected wallet context to the order summary action", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: "venmo",
        })}
        renderPaymentAction={(context) => (
          <div
            data-payment-action-placement="order-summary"
            data-payment-checkout-draft-id={context.checkoutDraftId}
            data-payment-fulfillment-mode={context.fulfillmentMode}
            data-payment-method={context.selectedPaymentMethod}
          >
            Wallet action
          </div>
        )}
      />,
    );

    expect(html).toContain('data-payment-method-row="venmo"');
    expect(html).toContain('data-payment-action-placement="order-summary"');
    expect(html).toContain(
      'data-payment-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).toContain('data-payment-fulfillment-mode="delivery"');
    expect(html).toContain('data-payment-method="venmo"');
  });
});

function checkoutData(
  overrides: Partial<
    Pick<CheckoutPageData, "activeMode" | "modeLocked" | "validation"> & {
      readonly activeDeliveryStepId: string;
      readonly activePickupStepId: string;
      readonly paymentChoices: readonly CheckoutChoice[];
      readonly saveForFutureEligible: boolean;
      readonly selectedPaymentMethod: CheckoutSelectedPaymentMethod;
    }
  > = {},
): CheckoutPageData {
  const selectedPaymentMethod = overrides.selectedPaymentMethod ?? "paypal";
  const selectedPaymentLabel =
    selectedPaymentMethod === "paylater"
      ? "Pay Later selected"
      : selectedPaymentMethod === "card"
        ? "Credit or debit card selected"
        : selectedPaymentMethod === "apple_pay"
          ? "Apple Pay selected"
          : selectedPaymentMethod === "google_pay"
            ? "Google Pay selected"
            : selectedPaymentMethod === "venmo"
              ? "Venmo selected"
              : "PayPal selected";

  const deliverySteps: readonly CheckoutStep[] = [
    {
      id: "shipping-address",
      title: "Shipping address",
      state: "editing",
      body: "Use saved shipping address or enter a new delivery address.",
    },
    {
      id: "billing-address",
      title: "Billing address",
      state: "idle",
      body: "Same as shipping is checked by default.",
    },
    {
      id: "shipping-options",
      title: "Shipping options",
      state: "idle",
      body: "Cheapest eligible option is selected by default.",
    },
    {
      id: "payment-method",
      title: "Payment method",
      state: "idle",
      body: "Radio-first payment method wall renders here.",
      ...(overrides.paymentChoices
        ? { choices: overrides.paymentChoices }
        : {}),
    },
  ];
  const pickupSteps: readonly CheckoutStep[] = [
    {
      id: "pickup-location",
      title: "Pickup location",
      state: "editing",
      body: "Use ZIP or default address to rank nearby stores.",
    },
    {
      id: "store-selection",
      title: "Store selection",
      state: "idle",
      body: "Store card shows available and unavailable item counts.",
    },
    {
      id: "pickup-billing-address",
      title: "Billing address",
      state: "idle",
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
      ...(overrides.paymentChoices
        ? { choices: overrides.paymentChoices }
        : {}),
    },
  ];

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
        selectedPaymentLabel,
        selectedPaymentMethod,
        ...(overrides.saveForFutureEligible === undefined
          ? {}
          : { saveForFutureEligible: overrides.saveForFutureEligible }),
      },
      steps: moveStepFirst(deliverySteps, overrides.activeDeliveryStepId),
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
        selectedPaymentLabel,
        selectedPaymentMethod,
        ...(overrides.saveForFutureEligible === undefined
          ? {}
          : { saveForFutureEligible: overrides.saveForFutureEligible }),
        readyItemsLabel: "Ready for pickup: 1 item",
        unavailableItemsLabel: "Not available at this store: 1 item",
        partialInventoryNote: "Unavailable items stay in the original cart.",
      },
      steps: moveStepFirst(pickupSteps, overrides.activePickupStepId),
    },
  };

  return overrides.validation
    ? { ...data, validation: overrides.validation }
    : data;
}

function moveStepFirst(
  steps: readonly CheckoutStep[],
  activeStepId: string | undefined,
): readonly CheckoutStep[] {
  if (!activeStepId) {
    return steps;
  }

  const activeStep = steps.find((step) => step.id === activeStepId);

  return activeStep
    ? [activeStep, ...steps.filter((step) => step.id !== activeStepId)]
    : steps;
}

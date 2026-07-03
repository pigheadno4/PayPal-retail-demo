// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CheckoutPage,
  type CheckoutChoice,
  type CheckoutPageData,
  type CheckoutPaymentReadiness,
  type CheckoutSelectedPaymentMethod,
  type CheckoutStep,
  type CheckoutValidationState,
} from "./CheckoutPage.js";

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe("CheckoutPage", () => {
  it("renders Delivery and Pickup tabs with separate preserved step state shells", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain('data-slot="tabs"');
    expect(html).toContain('data-visual-accent-scope="checkout"');
    expect(html).toContain('data-slot="tabs-list"');
    expect(html).toContain('data-slot="tabs-trigger"');
    expect(html).toContain('data-slot="tabs-content"');
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-visual-accent="checkout-step"');
    expect(html).toContain('data-step-state="editing"');
    expect(html).toContain('data-step-state="idle"');
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
    expect(html).not.toContain("Idle");
    expect(html).not.toContain("Editing");
  });

  it("renders compact active checkout progress for the selected fulfillment flow", () => {
    const deliveryHtml = renderToStaticMarkup(
      <CheckoutPage data={checkoutData({ activeMode: "delivery" })} />,
    );
    const pickupHtml = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          activePickupStepId: "pickup-date",
        })}
      />,
    );

    expect(deliveryHtml).toContain('data-checkout-progress="delivery"');
    expect(deliveryHtml).toContain("Delivery - Shipping address - 1 of 4");
    expect(pickupHtml).toContain('data-checkout-progress="pickup"');
    expect(pickupHtml).toContain("Pickup - Pickup date - 4 of 5");
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
    expect(pickupHtml).toContain("Choose a pickup store");
    expect(pickupHtml).not.toContain("Ready for pickup");
    expect(pickupHtml).not.toContain("Not available at this store");
    expect(pickupHtml).not.toContain(
      "Unavailable items stay in the original cart.",
    );
  });

  it("renders reference-level checkout summary, promo status, and trust strip", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain('aria-label="Checkout breadcrumb"');
    expect(html).toContain("Secure checkout");
    expect(html).toContain("Confirm fulfillment, review totals");
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("Hirono Little Mischief");
    expect(html).toContain("Qty 1");
    expect(html).toContain("Offer status");
    expect(html).toContain(
      "Eligible promos appear here after checkout details match.",
    );
    expect(html).not.toContain("Promo calculating");
    expect(html).toContain("Estimated tax");
    expect(html).toContain("Calculated before payment");
    expect(html).toContain("Official payment surfaces");
    expect(html).toContain("Totals reconciled");
    expect(html).toContain("Delivery or pickup");
    expect(html).toContain("Order recovery");
    expect(html).toContain('data-visual-accent="commerce-summary"');
    expect(html).toContain('data-visual-accent="trust-strip"');
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('data-slot="separator"');
  });

  it("keeps logged-in Pickup summary preselected when the page data requests it", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          pickupStoreMode: "preselected",
        })}
      />,
    );

    expect(html).toContain("Pickup order");
    expect(html).toContain("POP MART Soho");
    expect(html).toContain("Ready for pickup");
    expect(html).toContain("Not available at this store");
    expect(html).toContain("Unavailable items stay in the original cart.");
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
    expect(html).not.toContain("W1F 7JL");
    expect(html).not.toContain("Use default address");
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
    expect(html).toContain('data-pickup-store-ticket="true"');
    expect(html).toContain(
      'aria-label="Pickup store ticket for POP MART Soho"',
    );
    expect(html).toContain("checkout-store-card--ticket");
    expect(html).toContain("checkout-store-card__badge");
    expect(html).toContain('data-inventory-state="partial"');
    expect(html).toContain('data-inventory-state="full"');
    expect(html).toContain("checkout-store-card__inventory-lines");
    expect(html).toContain('aria-label="Pickup inventory for POP MART Soho"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("Hirono Little Mischief");
    expect(html).toContain("In stock");
    expect(html).toContain("Sold out");
    expect(html).toContain("Partial inventory");
    expect(html).toContain("Full inventory");
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

  it("withholds the Order Summary payment action before the payment step is active", () => {
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

    expect(html).not.toContain('data-payment-action-reserved-space="true"');
    expect(html).not.toContain('data-payment-placeholder-state="locked"');
    expect(html).not.toContain("Choose payment method");
    expect(html).not.toContain("Payment methods unlock after required steps.");
    expect(html).not.toContain("PayPal selected");
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('class="checkout-sticky-action"');
  });

  it("renders checkout form fields through shadcn field slots with mobile metadata", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain('data-slot="field-group"');
    expect(html).toContain('data-slot="field"');
    expect(html).toContain('data-slot="field-label"');
    expect(html).toContain('data-slot="input"');
    expect(html).toContain('autoComplete="name"');
    expect(html).toContain('autoComplete="postal-code"');
    expect(html).toContain('required=""');
    expect(html).toContain("Required to continue this checkout step.");
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

  it("withholds selected provider actions while checkout readiness is missing", () => {
    const renderPaymentAction = vi.fn((context) => (
      <div
        data-payment-action-placement="order-summary"
        data-payment-checkout-draft-id={context.checkoutDraftId ?? ""}
      >
        Payment action
      </div>
    ));
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          deliveryCheckoutDraftId: null,
          selectedPaymentMethod: "paypal",
        })}
        renderPaymentAction={renderPaymentAction}
      />,
    );

    expect(renderPaymentAction).not.toHaveBeenCalled();
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('data-payment-action-reserved-space="true"');
    expect(html).toContain("Payment is syncing");
    expect(html).toContain("Refresh checkout details before continuing.");
  });

  it.each([
    [
      "syncing",
      "Payment is syncing",
      "Refresh checkout details before continuing.",
    ],
    [
      "recalculating",
      "Payment is recalculating",
      "Updated totals are syncing before payment.",
    ],
    [
      "stale",
      "Payment needs review",
      "Review the updated checkout details before payment.",
    ],
  ] as const)(
    "withholds selected provider actions while checkout readiness is %s",
    (state, title, body) => {
      const renderPaymentAction = vi.fn((context) => (
        <div
          data-payment-action-placement="order-summary"
          data-payment-checkout-draft-id={context.checkoutDraftId ?? ""}
        >
          Payment action
        </div>
      ));
      const html = renderToStaticMarkup(
        <CheckoutPage
          data={checkoutData({
            activeDeliveryStepId: "payment-method",
            deliveryPaymentReadiness: {
              state,
            },
            selectedPaymentMethod: "paypal",
          })}
          renderPaymentAction={renderPaymentAction}
        />,
      );

      expect(renderPaymentAction).not.toHaveBeenCalled();
      expect(html).not.toContain(
        'data-payment-action-placement="order-summary"',
      );
      expect(html).toContain(title);
      expect(html).toContain(body);
    },
  );

  it("withholds card fields while checkout payment readiness has failed", () => {
    const renderCardPaymentBox = vi.fn((context) => (
      <div
        data-card-payment-box="true"
        data-payment-checkout-draft-id={context.checkoutDraftId}
      >
        Card fields
      </div>
    ));
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          deliveryPaymentReadiness: {
            state: "failed",
            title: "Payment needs refresh",
            body: "Retry checkout details before payment.",
          },
          selectedPaymentMethod: "card",
        })}
        renderCardPaymentBox={renderCardPaymentBox}
      />,
    );

    expect(renderCardPaymentBox).not.toHaveBeenCalled();
    expect(html).not.toContain('data-card-payment-box="true"');
    expect(html).toContain("Payment needs refresh");
    expect(html).toContain("Retry checkout details before payment.");
  });

  it("renders selected non-card payment only in the mobile sticky action", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          addEventListener: () => undefined,
          addListener: () => undefined,
          dispatchEvent: () => false,
          matches: query === "(max-width: 760px)",
          media: query,
          onchange: null,
          removeEventListener: () => undefined,
          removeListener: () => undefined,
        }) as MediaQueryList,
    );

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: "paypal",
        })}
        renderPaymentAction={(context) => (
          <div
            data-payment-action-placement="selected-provider"
            data-payment-method={context.selectedPaymentMethod}
          >
            Payment action
          </div>
        )}
      />,
    );

    expect(screen.queryByLabelText("Selected payment method")).toBeNull();

    const stickyAction = screen.getByLabelText("Selected payment action");
    expect(within(stickyAction).getByText("Payment action")).toBeTruthy();
    expect(within(stickyAction).getByText("Secure checkout")).toBeTruthy();
    expect(within(stickyAction).getByText("$25.98")).toBeTruthy();
  });

  it("keeps the Pay Later row compact and leaves messaging beside the payment action", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          activeMode: "delivery",
        })}
      />,
    );

    expect(html).toContain('data-payment-method-row="paylater"');
    expect(html).toContain(
      'src="/assets/paypal-logos/paylater-rebrand-mark.svg"',
    );
    expect(html).toContain('src="/assets/paypal-logos/applepay-black.svg"');
    expect(html).not.toContain('data-paylater-message-placement="payment-row"');
    expect(html).not.toContain("Pay Later row message");
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
    expect(html).toContain("Card fields");
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

  it("starts draft updates immediately when a checkout step is submitted", async () => {
    const user = userEvent.setup();
    const onDraftUpdate = vi.fn(
      () => new Promise<CheckoutPageData>(() => undefined),
    );

    render(
      <CheckoutPage data={checkoutData()} onDraftUpdate={onDraftUpdate} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Submit shipping address" }),
    );

    expect(onDraftUpdate).toHaveBeenCalledTimes(1);
    expect(onDraftUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "delivery_shipping_address",
      }),
      expect.any(Object),
    );
  });

  it("reflects the selected shipping option in the order summary before submit", async () => {
    const user = userEvent.setup();

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "shipping-options",
          deliveryShippingLabel: "$5.00",
          deliveryTotalLabel: "$30.98",
        })}
      />,
    );

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getByText("$5.00")).toBeTruthy();
    expect(within(orderSummary).getByText("$30.98")).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: /Express shipping/ }));

    await waitFor(() => {
      expect(within(orderSummary).getByText("$12.00")).toBeTruthy();
      expect(within(orderSummary).getByText("$37.98")).toBeTruthy();
    });
  });

  it("updates compact progress after submit and fulfillment tab changes", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage data={checkoutData()} />);

    expect(
      screen.getByText("Delivery - Shipping address - 1 of 4"),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Submit shipping address" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Delivery - Billing address - 2 of 4"),
      ).toBeTruthy();
    });

    await user.click(screen.getByRole("tab", { name: "Pickup" }));

    expect(screen.getByText("Pickup - Pickup location - 1 of 5")).toBeTruthy();
  });

  it("suspends selected provider actions when an upstream checkout section is edited", async () => {
    const user = userEvent.setup();

    render(
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

    await user.click(
      screen.getByRole("button", { name: "Submit shipping address" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Save billing address" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Submit shipping option" }),
    );

    expect(await screen.findByText("Payment action")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Edit shipping address" }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Payment action")).toBeNull();
      expect(
        screen.getByText("Delivery - Shipping address - 1 of 4"),
      ).toBeTruthy();
    });
  });
});

function checkoutData(
  overrides: Partial<
    Pick<CheckoutPageData, "activeMode" | "modeLocked" | "validation"> & {
      readonly activeDeliveryStepId: string;
      readonly activePickupStepId: string;
      readonly deliveryCheckoutDraftId: string | null;
      readonly deliveryPaymentReadiness: CheckoutPaymentReadiness;
      readonly deliveryShippingLabel: string;
      readonly deliveryTotalLabel: string;
      readonly paymentChoices: readonly CheckoutChoice[];
      readonly pickupStoreMode: "guest" | "preselected";
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
    ...(overrides.pickupStoreMode
      ? { pickupStoreMode: overrides.pickupStoreMode }
      : {}),
    delivery: {
      label: "Delivery",
      ...(overrides.deliveryPaymentReadiness
        ? { paymentReadiness: overrides.deliveryPaymentReadiness }
        : {}),
      ...(overrides.deliveryCheckoutDraftId === undefined
        ? { checkoutDraftId: "draft_delivery_123" }
        : overrides.deliveryCheckoutDraftId === null
          ? {}
          : { checkoutDraftId: overrides.deliveryCheckoutDraftId }),
      summary: {
        title: "Delivery order",
        contextLabel: "Ground delivery",
        items: [
          {
            id: "checkout-test-item-labubu",
            name: "Labubu Have a Seat",
            detailLabel: "Blind Boxes",
            imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
            imageAlt: "Labubu Have a Seat collectible",
            quantity: 1,
            amountLabel: "$12.99",
          },
          {
            id: "checkout-test-item-hirono",
            name: "Hirono Little Mischief",
            detailLabel: "Plush",
            imagePath: "/assets/popmart/products/plush-11-1.png",
            imageAlt: "Hirono Little Mischief collectible",
            quantity: 1,
            amountLabel: "$12.99",
          },
        ],
        subtotalLabel: "$25.98",
        promoLabel: "No promo applied",
        promoHelpLabel:
          "Eligible promos appear here after checkout details match.",
        ...(overrides.deliveryShippingLabel
          ? { shippingLabel: overrides.deliveryShippingLabel }
          : {}),
        taxLabel: "Calculated before payment",
        totalLabel: overrides.deliveryTotalLabel ?? "$25.98",
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
        contextLabel:
          overrides.pickupStoreMode === "preselected"
            ? "POP MART Soho"
            : "Choose a pickup store",
        items: [
          {
            id: "checkout-test-pickup-item-labubu",
            name: "Labubu Have a Seat",
            detailLabel: "Blind Boxes",
            imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
            imageAlt: "Labubu Have a Seat collectible",
            quantity: 1,
            amountLabel: "$12.99",
          },
        ],
        subtotalLabel: "$12.99",
        promoLabel: "No promo applied",
        promoHelpLabel:
          "Eligible pickup promos appear after a store is selected.",
        taxLabel: "Calculated before payment",
        totalLabel: "$12.99",
        selectedPaymentLabel,
        selectedPaymentMethod,
        ...(overrides.saveForFutureEligible === undefined
          ? {}
          : { saveForFutureEligible: overrides.saveForFutureEligible }),
        ...(overrides.pickupStoreMode === "preselected"
          ? {
              readyItemsLabel: "Ready for pickup: 1 item",
              unavailableItemsLabel: "Not available at this store: 1 item",
              partialInventoryNote:
                "Unavailable items stay in the original cart.",
            }
          : {}),
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

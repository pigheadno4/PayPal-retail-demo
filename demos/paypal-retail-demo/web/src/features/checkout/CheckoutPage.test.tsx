// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect, useState, type ComponentType } from "react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CheckoutPage,
  type CheckoutChoice,
  type CheckoutDraftUpdateRequest,
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
  it("keeps Apple Pay and Google Pay rows absent until preselection eligibility is true", () => {
    const CheckoutPageWithEligibility =
      CheckoutPage as unknown as ComponentType<{
        readonly data: CheckoutPageData;
        readonly paymentMethodEligibility: Readonly<
          Partial<Record<"apple_pay" | "google_pay", boolean>>
        >;
      }>;
    const data = checkoutData({ activeDeliveryStepId: "payment-method" });
    const pendingHtml = renderToStaticMarkup(
      <CheckoutPageWithEligibility
        data={data}
        paymentMethodEligibility={{
          apple_pay: false,
          google_pay: false,
        }}
      />,
    );
    const appleEligibleHtml = renderToStaticMarkup(
      <CheckoutPageWithEligibility
        data={data}
        paymentMethodEligibility={{
          apple_pay: true,
          google_pay: false,
        }}
      />,
    );
    const googleEligibleHtml = renderToStaticMarkup(
      <CheckoutPageWithEligibility
        data={data}
        paymentMethodEligibility={{
          apple_pay: false,
          google_pay: true,
        }}
      />,
    );

    expect(pendingHtml).not.toContain('data-payment-method-row="apple_pay"');
    expect(pendingHtml).not.toContain('data-payment-method-row="google_pay"');
    expect(appleEligibleHtml).toContain('data-payment-method-row="apple_pay"');
    expect(appleEligibleHtml).not.toContain(
      'data-payment-method-row="google_pay"',
    );
    expect(googleEligibleHtml).not.toContain(
      'data-payment-method-row="apple_pay"',
    );
    expect(googleEligibleHtml).toContain(
      'data-payment-method-row="google_pay"',
    );
  });

  it("renders Delivery and Pickup tabs with separate preserved step state shells", () => {
    const html = renderToStaticMarkup(<CheckoutPage data={checkoutData()} />);

    expect(html).toContain('class="checkout-status"');
    expect(html).not.toContain('class="checkout-hero"');
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
    expect(html).toContain("Delivery or Pickup");
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
    expect(html).toContain("Secure payments");
    expect(html).toContain("Final totals");
    expect(html).toContain("Delivery or pickup");
    expect(html).toContain("Order recovery");
    expect(html).not.toContain("Official payment surfaces");
    expect(html).not.toContain("Totals reconciled");
    expect(html).not.toContain("Radio-first payment method wall");
    expect(html).toContain('data-visual-accent="commerce-summary"');
    expect(html).toContain('data-visual-accent="trust-strip"');
    expect(html).toContain('data-density="mobile-compact"');
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

    expect(html).toContain("First name");
    expect(html).toContain("Last name");
    expect(html).toContain("Street address");
    expect(html).toContain("Apt, suite, or building");
    expect(html).toContain("City");
    expect(html).toContain("State");
    expect(html).toContain("ZIP code");
    expect(html).toContain("Phone number");
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
    expect(html).toContain("checkout-store-card__inventory-name");
    expect(html).toContain("checkout-store-card__inventory-status");
    expect(html).toContain('data-inventory-kind="available"');
    expect(html).toContain('data-inventory-kind="unavailable"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("Hirono Little Mischief");
    expect(html).toContain("In stock");
    expect(html).toContain("Sold out");
    expect(html).toContain("Partial inventory");
    expect(html).toContain("Full inventory");
    expect(html).toContain("Submit pickup store");
  });

  it("starts preselected Pickup at billing without a redundant store continue button", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          pickupStoreMode: "preselected",
        })}
      />,
    );

    expect(html).toContain("POP MART Soho");
    expect(html).toContain("Partial inventory");
    expect(html).toContain('aria-label="Pickup inventory for POP MART Soho"');
    expect(html).toContain("checkout-step__selected-store");
    expect(html).toContain("checkout-store-card__inventory-name");
    expect(html).toContain("Labubu Have a Seat x 1");
    expect(html).toContain("Hirono Little Mischief x 1");
    expect(html).toContain("In stock");
    expect(html).toContain("Sold out");
    expect(html).toContain("Billing address");
    expect(html).toContain("Billing street address");
    expect(html).toContain("Save billing address");
    expect(html).toContain('aria-label="Change store"');
    expect(html).not.toContain("Continue with this store");
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

  it("scrolls the mobile validation focus target above the sticky summary", async () => {
    mockMobileCheckoutViewport();
    const { restore, scrollIntoView } = mockElementScrollIntoView();
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

    try {
      render(<CheckoutPage data={checkoutData({ validation })} />);

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "end",
          inline: "nearest",
        });
      });
    } finally {
      restore();
    }
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
    expect(html).toContain("First name");
    expect(html).toContain('autoComplete="given-name"');
    expect(html).toContain("Last name");
    expect(html).toContain('autoComplete="family-name"');
    expect(html).toContain("Street address");
    expect(html).toContain('autoComplete="address-line1"');
    expect(html).toContain("Apt, suite, or building");
    expect(html).toContain('autoComplete="address-line2"');
    expect(html).toContain("City");
    expect(html).toContain('autoComplete="address-level2"');
    expect(html).toContain("State");
    expect(html).toContain('data-slot="select"');
    expect(html).toContain('data-slot="select-trigger"');
    expect(html).toContain("ZIP code");
    expect(html).toContain('autoComplete="postal-code"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain("Phone number");
    expect(html).toContain('autoComplete="tel"');
    expect(html).toContain('inputMode="tel"');
    expect(html).toContain('required=""');
    expect(html).toContain("Required to continue this checkout step.");
  });

  it("shows each branded payment method name once in the visible choice row", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          paymentChoices: [
            { label: "PayPal", method: "paypal" },
            { label: "Pay Later", method: "paylater" },
            { label: "Credit or debit card", method: "card" },
            { label: "Apple Pay", method: "apple_pay" },
            { label: "Google Pay", method: "google_pay" },
            { label: "Venmo", method: "venmo" },
          ],
        })}
        paymentMethodEligibility={{
          apple_pay: true,
          google_pay: true,
        }}
      />,
    );

    for (const method of ["paypal", "paylater", "apple_pay", "venmo"]) {
      expect(html).toContain(
        `data-payment-method-label-visibility="logo" data-payment-method-row="${method}"`,
      );
    }
    expect(html).toContain(
      'data-payment-method-label-visibility="text" data-payment-method-row="card"',
    );
    expect(html).toContain(
      'data-payment-method-label-visibility="text" data-payment-method-row="google_pay"',
    );
  });

  it("renders the selected payment action inside Order Summary with active draft context", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeMode: "pickup",
          activePickupStepId: "pickup-payment-method",
          selectedPaymentMethod: "paypal",
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

  it("keeps the mobile sticky summary neutral until the buyer selects a payment method", () => {
    mockMobileCheckoutViewport();
    const renderPaymentAction = vi.fn(() => (
      <div data-payment-action-placement="selected-provider">
        Payment action
      </div>
    ));

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: null,
        })}
        renderPaymentAction={renderPaymentAction}
      />,
    );

    expect(renderPaymentAction).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Selected payment method")).toBeNull();

    const stickySummary = screen.getByLabelText("Checkout summary");
    expect(
      within(stickySummary).getByRole("button", {
        name: "Review order details",
      }),
    ).toBeTruthy();
    expect(within(stickySummary).getByText("Total")).toBeTruthy();
    expect(within(stickySummary).getByText("$25.98")).toBeTruthy();
    expect(
      within(stickySummary)
        .getByRole("button", { name: "Choose payment" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(within(stickySummary).queryByText("Labubu Have a Seat")).toBeNull();
  });

  it("guides selected Card buyers back to the single inline payment action", () => {
    mockMobileCheckoutViewport();
    const renderCardPaymentBox = vi.fn(() => (
      <div data-card-payment-box="true">
        <button type="button">Pay by card</button>
      </div>
    ));

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: "card",
        })}
        renderCardPaymentBox={renderCardPaymentBox}
      />,
    );

    expect(renderCardPaymentBox).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Pay by card" })).toBeTruthy();
    const stickySummary = screen.getByLabelText("Checkout summary");
    expect(
      within(stickySummary).getByLabelText("Card payment guidance"),
    ).toBeTruthy();
    expect(
      within(stickySummary).getByText("Complete card details above."),
    ).toBeTruthy();
    expect(
      within(stickySummary).queryByText(
        "Use Pay by card when the hosted fields are complete.",
      ),
    ).toBeNull();
    expect(
      within(stickySummary).queryByRole("button", { name: "Choose payment" }),
    ).toBeNull();
  });

  it("keeps mobile payment readiness copy visible in the collapsed and expanded drawer", async () => {
    mockMobileCheckoutViewport();
    const user = userEvent.setup();
    const renderPaymentAction = vi.fn(() => (
      <div data-payment-action-placement="selected-provider">
        Payment action
      </div>
    ));

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          deliveryPaymentReadiness: {
            state: "recalculating",
            title: "Payment is recalculating",
            body: "Updated totals are syncing before payment.",
          },
          selectedPaymentMethod: "paypal",
        })}
        renderPaymentAction={renderPaymentAction}
      />,
    );

    expect(renderPaymentAction).not.toHaveBeenCalled();
    const stickySummary = screen.getByLabelText("Checkout summary");
    expect(
      within(stickySummary).getByText("Payment is recalculating"),
    ).toBeTruthy();
    expect(
      within(stickySummary).getByText(
        "Updated totals are syncing before payment.",
      ),
    ).toBeTruthy();
    expect(
      within(stickySummary).queryByRole("button", { name: "Choose payment" }),
    ).toBeNull();

    await user.click(
      within(stickySummary).getByRole("button", {
        name: "Review order details",
      }),
    );
    const orderSheet = screen.getByRole("dialog", { name: "Order details" });
    expect(
      within(orderSheet).getByText("Payment is recalculating"),
    ).toBeTruthy();
    expect(
      within(orderSheet).getByText(
        "Updated totals are syncing before payment.",
      ),
    ).toBeTruthy();
  });

  it("makes the mobile bottom drawer the only order detail surface", () => {
    mockMobileCheckoutViewport();

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: null,
        })}
      />,
    );

    expect(
      screen.queryByRole("complementary", { name: "Order summary" }),
    ).toBeNull();

    const stickySummary = screen.getByLabelText("Checkout summary");
    expect(
      within(stickySummary).getByRole("button", {
        name: "Review order details",
      }),
    ).toBeTruthy();
    expect(within(stickySummary).getByText("Total")).toBeTruthy();
    expect(within(stickySummary).getByText("$25.98")).toBeTruthy();
    expect(within(stickySummary).queryByText("Labubu Have a Seat")).toBeNull();
    expect(
      within(stickySummary).queryByText("Merchandise subtotal"),
    ).toBeNull();
  });

  it("keeps the full mobile order summary when the sticky drawer is suppressed", () => {
    mockMobileCheckoutViewport();

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          selectedPaymentMethod: null,
        })}
        suppressMobileStickySummary
      />,
    );

    expect(screen.queryByLabelText("Checkout summary")).toBeNull();

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getByText("Labubu Have a Seat")).toBeTruthy();
    expect(within(orderSummary).getByText("Merchandise subtotal")).toBeTruthy();
  });

  it("renders selected non-card payment only in the mobile sticky summary", () => {
    mockMobileCheckoutViewport();

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          deliveryPromoLabel: "-$4.00 promo (SAVE10)",
          deliveryTotalLabel: "$31.25",
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

    const stickySummary = screen.getByLabelText("Checkout summary");
    expect(within(stickySummary).getByText("Payment action")).toBeTruthy();
    expect(within(stickySummary).getByText("Total")).toBeTruthy();
    expect(within(stickySummary).getByText("$31.25")).toBeTruthy();
    expect(
      within(stickySummary).getByText("-$4.00 promo (SAVE10)"),
    ).toBeTruthy();
    expect(
      within(stickySummary).getByRole("button", {
        name: "Review order details",
      }),
    ).toBeTruthy();
  });

  it("opens mobile order details in a shadcn bottom sheet from the sticky grabber", async () => {
    mockMobileCheckoutViewport();
    const user = userEvent.setup();

    render(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          deliveryPromoLabel: "-$4.00 promo (SAVE10)",
          deliveryShippingLabel: "$5.00",
          deliveryTotalLabel: "$41.50",
          selectedPaymentMethod: "paypal",
        })}
        renderPaymentAction={() => (
          <div data-payment-action-placement="selected-provider">
            Pay with PayPal
          </div>
        )}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Review order details",
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe(
      "checkout-order-details-sheet",
    );

    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Order details",
    });
    const closeHandle = within(dialog).getByRole("button", {
      name: "Close order details",
    });

    expect(dialog.getAttribute("data-slot")).toBe("sheet-content");
    expect(dialog.getAttribute("data-side")).toBe("bottom");
    expect(dialog.id).toBe("checkout-order-details-sheet");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(dialog.id);
    expect(closeHandle.getAttribute("data-slot")).toBe("sheet-close");
    expect(closeHandle.textContent).toBe("");
    expect(
      dialog.querySelector(".checkout-order-sheet__handle span"),
    ).not.toBeNull();
    expect(within(dialog).getByText("Labubu Have a Seat")).toBeTruthy();
    expect(within(dialog).getByText("Merchandise subtotal")).toBeTruthy();
    expect(within(dialog).getAllByText("-$4.00 promo (SAVE10)")).toHaveLength(
      2,
    );
    expect(within(dialog).getByText("Shipping")).toBeTruthy();
    expect(within(dialog).getByText("$5.00")).toBeTruthy();
    expect(within(dialog).getByText("Total")).toBeTruthy();
    expect(within(dialog).getByText("$41.50")).toBeTruthy();
    expect(within(dialog).getByText("Pay with PayPal")).toBeTruthy();

    await user.click(closeHandle);
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Order details" }),
      ).toBeNull();
    });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Order details" });
    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Order details" }),
      ).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    await screen.findByRole("dialog", { name: "Order details" });
    const overlay = document.querySelector<HTMLElement>(
      '[data-slot="sheet-overlay"]',
    );
    expect(overlay).not.toBeNull();
    await user.click(overlay as HTMLElement);
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Order details" }),
      ).toBeNull();
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the Pay Later row compact and leaves messaging beside the payment action", () => {
    const html = renderToStaticMarkup(
      <CheckoutPage
        data={checkoutData({
          activeDeliveryStepId: "payment-method",
          activeMode: "delivery",
          selectedPaymentMethod: null,
        })}
        paymentMethodEligibility={{
          apple_pay: true,
          google_pay: true,
        }}
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

  it("scrolls focused billing inputs above the mobile sticky summary", async () => {
    mockMobileCheckoutViewport();
    const { restore, scrollIntoView } = mockElementScrollIntoView();
    const user = userEvent.setup();

    try {
      render(
        <CheckoutPage
          data={checkoutData({ activeDeliveryStepId: "billing-address" })}
        />,
      );

      await user.click(screen.getByLabelText("Same as shipping"));
      const billingStreetInput = screen.getByLabelText(
        "Billing street address",
      );
      scrollIntoView.mockClear();

      billingStreetInput.focus();

      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "end",
          inline: "nearest",
        });
      });
    } finally {
      restore();
    }
  });

  it("scrolls selected card fields above the mobile sticky summary after render", async () => {
    mockMobileCheckoutViewport();
    const { restore, scrollBy, scrollIntoView } = mockElementScrollIntoView();
    const restoreRects = mockCheckoutStickyOverlapRects();
    const user = userEvent.setup();

    try {
      render(
        <CheckoutPage
          data={checkoutData({
            activeDeliveryStepId: "payment-method",
            selectedPaymentMethod: null,
          })}
          renderCardPaymentBox={() => <AsyncCardPaymentBox />}
        />,
      );

      await user.click(
        screen.getByRole("radio", {
          name: /Credit or debit card/,
        }),
      );

      expect(screen.getByText("Card number")).toBeTruthy();
      await waitFor(() => {
        expect(scrollIntoView).toHaveBeenCalledWith({
          block: "end",
          inline: "nearest",
        });
      });
      expect(scrollBy).toHaveBeenCalledWith({
        behavior: "auto",
        left: 0,
        top: 67,
      });
    } finally {
      restoreRects();
      restore();
    }
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

  it("blocks dependent billing submit until shipping save settles", async () => {
    const user = userEvent.setup();
    let resolveShippingUpdate: ((value: CheckoutPageData) => void) | undefined;
    const shippingUpdatedData = checkoutData({
      activeDeliveryStepId: "billing-address",
      deliveryTotalLabel: "$75.63",
    });
    const billingUpdatedData = checkoutData({
      activeDeliveryStepId: "shipping-options",
      deliveryTotalLabel: "$75.63",
    });
    const onDraftUpdate = vi.fn(
      (request: CheckoutDraftUpdateRequest, _currentData: CheckoutPageData) => {
        if (request.type === "delivery_shipping_address") {
          return new Promise<CheckoutPageData>((resolve) => {
            resolveShippingUpdate = resolve;
          });
        }

        return Promise.resolve(billingUpdatedData);
      },
    );

    render(
      <CheckoutPage data={checkoutData()} onDraftUpdate={onDraftUpdate} />,
    );

    await user.click(
      screen.getByRole("button", { name: "Submit shipping address" }),
    );
    expect(onDraftUpdate).toHaveBeenCalledTimes(1);

    const pendingBillingButton = (await screen.findByRole("button", {
      name: "Save billing address",
    })) as HTMLButtonElement;
    expect(pendingBillingButton).toHaveProperty("disabled", true);
    await user.click(pendingBillingButton);
    expect(onDraftUpdate).toHaveBeenCalledTimes(1);

    resolveShippingUpdate?.(shippingUpdatedData);

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Save billing address",
        }) as HTMLButtonElement,
      ).toHaveProperty("disabled", false);
    });
    await user.click(
      screen.getByRole("button", { name: "Save billing address" }),
    );

    await waitFor(() => {
      expect(onDraftUpdate).toHaveBeenCalledTimes(2);
    });
    expect(onDraftUpdate.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({ type: "delivery_billing_address" }),
    );
    expect(onDraftUpdate.mock.calls[1]?.[1]).toBe(shippingUpdatedData);
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
        data={checkoutData({ selectedPaymentMethod: "paypal" })}
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
      readonly deliveryPromoHelpLabel: string;
      readonly deliveryPromoLabel: string;
      readonly deliveryShippingLabel: string;
      readonly deliveryTotalLabel: string;
      readonly paymentChoices: readonly CheckoutChoice[];
      readonly pickupStoreMode: "guest" | "preselected";
      readonly saveForFutureEligible: boolean;
      readonly selectedPaymentMethod: CheckoutSelectedPaymentMethod | null;
    }
  > = {},
): CheckoutPageData {
  const selectedPaymentMethod =
    overrides.selectedPaymentMethod === null
      ? undefined
      : overrides.selectedPaymentMethod;
  const selectedPaymentLabel =
    selectedPaymentMethod === undefined
      ? "Choose payment method"
      : selectedPaymentMethod === "paylater"
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
      body: "Choose a payment method.",
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
      body: "Choose a payment method.",
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
        promoLabel: overrides.deliveryPromoLabel ?? "No promo applied",
        promoHelpLabel:
          overrides.deliveryPromoHelpLabel ??
          "Eligible promos appear here after checkout details match.",
        ...(overrides.deliveryShippingLabel
          ? { shippingLabel: overrides.deliveryShippingLabel }
          : {}),
        taxLabel: "Calculated before payment",
        totalLabel: overrides.deliveryTotalLabel ?? "$25.98",
        selectedPaymentLabel,
        ...(selectedPaymentMethod ? { selectedPaymentMethod } : {}),
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
        ...(selectedPaymentMethod ? { selectedPaymentMethod } : {}),
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

function mockMobileCheckoutViewport() {
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
}

function AsyncCardPaymentBox() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return <div data-card-loading="true">Loading card fields</div>;
  }

  return (
    <form className="card-fields-checkout-action">
      <label>
        Card number
        <input />
      </label>
    </form>
  );
}

function mockElementScrollIntoView(): {
  readonly restore: () => void;
  readonly scrollBy: ReturnType<typeof vi.fn>;
  readonly scrollIntoView: ReturnType<typeof vi.fn>;
} {
  const originalScrollBy = window.scrollBy;
  const originalScrollIntoView = window.Element.prototype.scrollIntoView;
  const scrollBy = vi.fn();
  const scrollIntoView = vi.fn();

  Object.defineProperty(window, "scrollBy", {
    configurable: true,
    value: scrollBy,
  });
  Object.defineProperty(window.Element.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });

  return {
    restore: () => {
      if (originalScrollBy) {
        Object.defineProperty(window, "scrollBy", {
          configurable: true,
          value: originalScrollBy,
        });
      } else {
        Reflect.deleteProperty(window, "scrollBy");
      }

      if (originalScrollIntoView) {
        Object.defineProperty(window.Element.prototype, "scrollIntoView", {
          configurable: true,
          value: originalScrollIntoView,
        });
      } else {
        Reflect.deleteProperty(window.Element.prototype, "scrollIntoView");
      }
    },
    scrollBy,
    scrollIntoView,
  };
}

function mockCheckoutStickyOverlapRects(): () => void {
  const originalGetBoundingClientRect =
    window.Element.prototype.getBoundingClientRect;
  Object.defineProperty(window.Element.prototype, "getBoundingClientRect", {
    configurable: true,
    value: function getMockedBoundingClientRect(this: Element) {
      if (this instanceof Element) {
        if (this.classList.contains("checkout-sticky-summary")) {
          return rectFromBounds({
            bottom: 844,
            height: 115,
            left: 0,
            right: 390,
            top: 729,
            width: 390,
          });
        }

        if (this.classList.contains("card-fields-checkout-action")) {
          return rectFromBounds({
            bottom: 780,
            height: 305,
            left: 57,
            right: 333,
            top: 475,
            width: 276,
          });
        }
      }

      return originalGetBoundingClientRect.call(this);
    },
  });

  return () => {
    Object.defineProperty(window.Element.prototype, "getBoundingClientRect", {
      configurable: true,
      value: originalGetBoundingClientRect,
    });
  };
}

function rectFromBounds(
  rect: Pick<DOMRect, "bottom" | "height" | "left" | "right" | "top" | "width">,
) {
  return {
    ...rect,
    x: rect.left,
    y: rect.top,
    toJSON: () => rect,
  };
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

// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { CheckoutPage } from "./CheckoutPage.js";

afterEach(() => {
  cleanup();
});

describe("CheckoutPage interactions", () => {
  it("saves and collapses the delivery shipping address before editing billing", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const shippingStep = getStep("Shipping address");
    const fullName = within(shippingStep).getByLabelText(
      "Full name",
    ) as HTMLInputElement;

    await user.clear(fullName);
    await user.type(fullName, "Jordan Li");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    expect(shippingStep.getAttribute("data-step-state")).toBe("saved");
    expect(within(shippingStep).queryByLabelText("Full name")).toBeNull();
    expect(within(shippingStep).getByText("Jordan Li")).toBeTruthy();

    const billingStep = getStep("Billing address");
    expect(billingStep.getAttribute("data-step-state")).toBe("editing");
    expect(within(billingStep).getByLabelText("Same as shipping")).toBeTruthy();

    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Edit shipping address",
      }),
    );

    expect(shippingStep.getAttribute("data-step-state")).toBe("editing");
    expect(within(shippingStep).getByLabelText("Full name")).toBeTruthy();
    expect(
      within(shippingStep).queryByRole("button", {
        name: "Edit shipping address",
      }),
    ).toBeNull();
  });

  it("advances delivery billing and shipping option sections with expand and shrink states", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const shippingStep = getStep("Shipping address");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    const billingStep = getStep("Billing address");
    await user.click(within(billingStep).getByLabelText("Same as shipping"));
    await user.type(
      within(billingStep).getByLabelText("Billing street address"),
      "42 Billing Avenue",
    );
    await user.type(
      within(billingStep).getByLabelText("Billing city"),
      "Boston",
    );
    await user.type(
      within(billingStep).getByLabelText("Billing ZIP code"),
      "02108",
    );
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );

    expect(billingStep.getAttribute("data-step-state")).toBe("saved");
    expect(
      within(billingStep).queryByLabelText("Billing street address"),
    ).toBeNull();
    expect(within(billingStep).getByText("42 Billing Avenue")).toBeTruthy();

    const shippingOptionsStep = getStep("Shipping options");
    expect(shippingOptionsStep.getAttribute("data-step-state")).toBe("editing");
    await user.click(
      within(shippingOptionsStep).getByRole("radio", {
        name: /Express shipping/,
      }),
    );
    await user.click(
      within(shippingOptionsStep).getByRole("button", {
        name: "Submit shipping option",
      }),
    );

    expect(shippingOptionsStep.getAttribute("data-step-state")).toBe("saved");
    expect(
      within(shippingOptionsStep).getByText("Express shipping"),
    ).toBeTruthy();
    expect(within(shippingOptionsStep).getByText("$12.00")).toBeTruthy();
    expect(
      within(shippingOptionsStep).queryByRole("radio", {
        name: /Express shipping/,
      }),
    ).toBeNull();

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
  });

  it("switches selected payment surfaces from the payment radio wall", async () => {
    const user = userEvent.setup();

    render(
      <CheckoutPage
        renderCardPaymentBox={(context) => (
          <div>Card fields for {context.selectedPaymentMethod}</div>
        )}
        renderPaymentAction={(context) => (
          <div>Selected {context.selectedPaymentMethod}</div>
        )}
        renderPayLaterRowMessage={() => <div>Pay Later row message</div>}
      />,
    );

    const paymentStep = getStep("Payment method");
    expect(screen.getByText("Selected paypal")).toBeTruthy();

    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Pay Later/,
      }),
    );

    expect(screen.getByText("Selected paylater")).toBeTruthy();
    expect(within(paymentStep).getByText("Pay Later row message")).toBeTruthy();

    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Credit or debit card/,
      }),
    );

    expect(within(paymentStep).getByText("Card fields for card")).toBeTruthy();
    expect(screen.queryByText("Selected card")).toBeNull();
  });
});

function getStep(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const step = heading.closest("article");

  if (!step) {
    throw new Error(`Could not find checkout step for ${title}`);
  }

  return step;
}

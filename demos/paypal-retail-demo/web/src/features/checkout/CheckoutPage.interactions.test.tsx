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
});

function getStep(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const step = heading.closest("article");

  if (!step) {
    throw new Error(`Could not find checkout step for ${title}`);
  }

  return step;
}

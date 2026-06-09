// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import {
  CheckoutPage,
  defaultCheckoutPageData,
  type CheckoutPageData,
} from "./CheckoutPage.js";

afterEach(() => {
  cleanup();
});

describe("CheckoutPage interactions", () => {
  it("keeps only one delivery checkout section expanded at a time", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const shippingStep = getStep("Shipping address");
    const billingStep = getStep("Billing address");
    const shippingOptionsStep = getStep("Shipping options");
    const paymentStep = getStep("Payment method");

    expect(within(shippingStep).getByLabelText("Full name")).toBeTruthy();
    expect(within(billingStep).queryByLabelText("Same as shipping")).toBeNull();
    expect(
      within(shippingOptionsStep).queryByRole("radio", {
        name: /Standard shipping/,
      }),
    ).toBeNull();
    expect(
      within(paymentStep).queryByRole("radio", {
        name: /PayPal/,
      }),
    ).toBeNull();

    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    expect(within(shippingStep).queryByLabelText("Full name")).toBeNull();
    expect(within(billingStep).getByLabelText("Same as shipping")).toBeTruthy();
    expect(
      within(shippingOptionsStep).queryByRole("radio", {
        name: /Standard shipping/,
      }),
    ).toBeNull();
    expect(
      within(paymentStep).queryByRole("radio", {
        name: /PayPal/,
      }),
    ).toBeNull();

    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Edit shipping address",
      }),
    );

    expect(within(shippingStep).getByLabelText("Full name")).toBeTruthy();
    expect(within(billingStep).queryByLabelText("Same as shipping")).toBeNull();
  });

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

    await advanceDeliveryToPayment(user);

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

  it("opens a ranked Pickup store modal from guest ZIP and saves the selected store summary", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    await user.click(screen.getByRole("tab", { name: "Pickup" }));

    const pickupLocationStep = getStep("Pickup location");
    const postcode = within(pickupLocationStep).getByLabelText(
      "ZIP or postcode",
    ) as HTMLInputElement;

    await user.clear(postcode);
    await user.type(postcode, "SW1A 1AA");
    await user.click(
      within(pickupLocationStep).getByRole("button", {
        name: "Find pickup stores",
      }),
    );

    const storeDialog = screen.getByRole("dialog", {
      name: "Choose pickup store",
    });
    expect(within(storeDialog).getByText("POP MART Soho")).toBeTruthy();
    expect(
      within(storeDialog).getByText("POP MART Covent Garden"),
    ).toBeTruthy();

    await user.click(
      within(storeDialog).getByRole("radio", {
        name: /POP MART Covent Garden/,
      }),
    );
    await user.click(
      within(storeDialog).getByRole("button", {
        name: "Confirm pickup store",
      }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(within(pickupLocationStep).queryByLabelText("ZIP or postcode")).toBe(
      null,
    );
    expect(within(pickupLocationStep).getByText("SW1A 1AA")).toBeTruthy();

    const storeSelectionStep = getStep("Store selection");
    expect(
      within(storeSelectionStep).getByText("POP MART Covent Garden"),
    ).toBeTruthy();
    expect(within(storeSelectionStep).getByText("Full inventory")).toBeTruthy();
    expect(
      within(storeSelectionStep).getByRole("button", {
        name: "Change store",
      }),
    ).toBeTruthy();

    const billingStep = getStep("Billing address");
    expect(billingStep.getAttribute("data-step-state")).toBe("editing");
    expect(
      within(billingStep).getByLabelText("Billing street address"),
    ).toBeTruthy();
  });

  it("starts logged-in Pickup with a preselected store and returns focus after closing Change store", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage data={loggedInPickupData()} />);

    const pickupLocationStep = getStep("Pickup location");
    expect(
      within(pickupLocationStep).queryByLabelText("ZIP or postcode"),
    ).toBeNull();

    const storeSelectionStep = getStep("Store selection");
    expect(within(storeSelectionStep).getByText("POP MART Soho")).toBeTruthy();
    expect(
      within(storeSelectionStep).getByText("Partial inventory"),
    ).toBeTruthy();

    const changeStoreButton = within(storeSelectionStep).getByRole("button", {
      name: "Change store",
    });

    await user.click(changeStoreButton);

    const storeDialog = screen.getByRole("dialog", {
      name: "Choose pickup store",
    });
    const selectedStore = within(storeDialog).getByRole("radio", {
      name: /POP MART Soho/,
    });

    expect(document.activeElement).toBe(selectedStore);

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(changeStoreButton);
  });

  it("updates Pickup Order Summary ready and unavailable lines when store inventory changes", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    await openPickupStoreModalFromGuestZip(user, "SW1A 1AA");

    await choosePickupStore(user, "POP MART Covent Garden");

    let orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(
      within(orderSummary).getByText("POP MART Covent Garden"),
    ).toBeTruthy();
    expect(
      within(orderSummary).getByText("Ready for pickup: 2 items"),
    ).toBeTruthy();
    expect(
      within(orderSummary).getByText("Not available at this store: 0 items"),
    ).toBeTruthy();
    expect(
      within(orderSummary).queryByText(
        "Unavailable items stay in the original cart.",
      ),
    ).toBeNull();

    const storeSelectionStep = getStep("Store selection");
    await user.click(
      within(storeSelectionStep).getByRole("button", {
        name: "Change store",
      }),
    );
    await choosePickupStore(user, "POP MART Soho");

    orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getByText("POP MART Soho")).toBeTruthy();
    expect(
      within(orderSummary).getByText("Ready for pickup: 1 item"),
    ).toBeTruthy();
    expect(
      within(orderSummary).getByText("Not available at this store: 1 item"),
    ).toBeTruthy();
    expect(
      within(orderSummary).getByText(
        "Unavailable items stay in the original cart.",
      ),
    ).toBeTruthy();
  });
});

async function advanceDeliveryToPayment(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    within(getStep("Shipping address")).getByRole("button", {
      name: "Submit shipping address",
    }),
  );
  await user.click(
    within(getStep("Billing address")).getByRole("button", {
      name: "Save billing address",
    }),
  );
  await user.click(
    within(getStep("Shipping options")).getByRole("button", {
      name: "Submit shipping option",
    }),
  );
}

async function openPickupStoreModalFromGuestZip(
  user: ReturnType<typeof userEvent.setup>,
  postcode: string,
) {
  const pickupLocationStep = getStep("Pickup location");
  const postcodeInput = within(pickupLocationStep).getByLabelText(
    "ZIP or postcode",
  ) as HTMLInputElement;

  await user.clear(postcodeInput);
  await user.type(postcodeInput, postcode);
  await user.click(
    within(pickupLocationStep).getByRole("button", {
      name: "Find pickup stores",
    }),
  );
}

async function choosePickupStore(
  user: ReturnType<typeof userEvent.setup>,
  storeName: string,
) {
  const storeDialog = screen.getByRole("dialog", {
    name: "Choose pickup store",
  });

  await user.click(
    within(storeDialog).getByRole("radio", {
      name: new RegExp(storeName),
    }),
  );
  await user.click(
    within(storeDialog).getByRole("button", {
      name: "Confirm pickup store",
    }),
  );
}

function getStep(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const step = heading.closest("article");

  if (!step) {
    throw new Error(`Could not find checkout step for ${title}`);
  }

  return step;
}

function loggedInPickupData(): CheckoutPageData {
  return {
    ...defaultCheckoutPageData,
    activeMode: "pickup",
    pickupStoreMode: "preselected",
  };
}

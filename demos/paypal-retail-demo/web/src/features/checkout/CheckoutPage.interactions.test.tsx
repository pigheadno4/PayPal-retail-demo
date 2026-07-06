// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CheckoutPage,
  defaultCheckoutPageData,
  type CheckoutPageData,
} from "./CheckoutPage.js";

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("CheckoutPage interactions", () => {
  it("keeps only one fulfillment panel visible in the accessibility tree", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const deliveryTab = screen.getByRole("tab", { name: "Delivery" });
    const pickupTab = screen.getByRole("tab", { name: "Pickup" });
    const deliveryPanelId = deliveryTab.getAttribute("aria-controls");
    const pickupPanelId = pickupTab.getAttribute("aria-controls");

    expect(deliveryPanelId).toBeTruthy();
    expect(pickupPanelId).toBeTruthy();
    expect(deliveryPanelId).not.toBe(pickupPanelId);

    const deliveryPanel = deliveryPanelId
      ? document.getElementById(deliveryPanelId)
      : null;
    const pickupPanel = pickupPanelId
      ? document.getElementById(pickupPanelId)
      : null;
    expect(deliveryPanel).not.toBeNull();
    expect(pickupPanel).not.toBeNull();
    expect(pickupPanel?.hasAttribute("hidden")).toBe(true);
    expect(pickupPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(deliveryPanel?.hasAttribute("hidden")).toBe(false);
    expect(deliveryPanel?.getAttribute("aria-hidden")).toBe("false");

    await user.click(pickupTab);
    expect(deliveryPanel?.hasAttribute("hidden")).toBe(true);
    expect(deliveryPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(pickupPanel?.hasAttribute("hidden")).toBe(false);
    expect(pickupPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(pickupTab.getAttribute("aria-selected")).toBe("true");
    expect(deliveryTab.getAttribute("aria-selected")).toBe("false");
  });

  it("applies returned delivery draft recalculation data before moving to the next section", async () => {
    const user = userEvent.setup();
    const draftUpdates: TestDraftUpdateRequest[] = [];

    render(
      createElement(CheckoutPage, {
        onDraftUpdate: async (request: TestDraftUpdateRequest) => {
          draftUpdates.push(request);

          return checkoutDataWithDeliveryTotal("$31.25", "SAVE10 applied");
        },
      } as Record<string, unknown>),
    );

    const shippingStep = getStep("Shipping address");
    await user.clear(within(shippingStep).getByLabelText("First name"));
    await user.type(
      within(shippingStep).getByLabelText("First name"),
      "Jordan",
    );
    await user.clear(within(shippingStep).getByLabelText("Last name"));
    await user.type(within(shippingStep).getByLabelText("Last name"), "Li");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitFor(() => {
      expect(draftUpdates).toContainEqual(
        expect.objectContaining({
          draftId: "draft_delivery_123",
          fulfillmentMode: "delivery",
          type: "delivery_shipping_address",
        }),
      );
    });
    expect(draftUpdates[0]?.fields).toContainEqual(
      expect.objectContaining({
        label: "First name",
        value: "Jordan",
      }),
    );
    expect(draftUpdates[0]?.fields).toContainEqual(
      expect.objectContaining({
        label: "Last name",
        value: "Li",
      }),
    );
    await waitForStepState(shippingStep, "saved");

    const billingStep = getStep("Billing address");
    expect(billingStep.getAttribute("data-step-state")).toBe("editing");

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getAllByText("SAVE10 applied")).toHaveLength(2);
    expect(within(orderSummary).getByText("$31.25")).toBeTruthy();
  });

  it("applies returned Pickup draft recalculation data after location and store changes", async () => {
    const user = userEvent.setup();
    const draftUpdates: TestDraftUpdateRequest[] = [];

    render(
      createElement(CheckoutPage, {
        onDraftUpdate: async (request: TestDraftUpdateRequest) => {
          draftUpdates.push(request);

          return checkoutDataWithPickupTotal("$13.49", "Pickup promo applied");
        },
      } as Record<string, unknown>),
    );

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    await openPickupStoreModalFromGuestZip(user, "SW1A 1AA");

    await waitFor(() => {
      expect(draftUpdates).toContainEqual(
        expect.objectContaining({
          draftId: "draft_pickup_123",
          fulfillmentMode: "pickup",
          type: "pickup_location",
        }),
      );
    });

    await choosePickupStore(user, "POP MART Covent Garden");

    await waitFor(() => {
      expect(draftUpdates).toContainEqual(
        expect.objectContaining({
          draftId: "draft_pickup_123",
          fulfillmentMode: "pickup",
          selectedStoreName: "POP MART Covent Garden",
          type: "pickup_store",
        }),
      );
    });

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(
      within(orderSummary).getAllByText("Pickup promo applied"),
    ).toHaveLength(2);
    expect(within(orderSummary).getByText("$13.49")).toBeTruthy();
  });

  it("suppresses inline pickup store tickets while the store picker modal is open", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    await openPickupStoreModalFromGuestZip(user, "SW1A 1AA");

    const storeDialog = screen.getByRole("dialog", {
      name: "Choose pickup store",
    });

    expect(
      within(storeDialog).getByRole("radio", {
        name: /POP MART Soho/,
      }),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText("Pickup store ticket for POP MART Soho"),
    ).toBeNull();
  });

  it("shrinks a submitted section while saving and recalculating in the background", async () => {
    vi.useFakeTimers();

    try {
      let resolveDraftUpdate!: (data: CheckoutPageData) => void;
      const draftUpdatePromise = new Promise<CheckoutPageData>((resolve) => {
        resolveDraftUpdate = resolve;
      });

      render(<CheckoutPage onDraftUpdate={() => draftUpdatePromise} />);

      const shippingStep = getStep("Shipping address");
      const billingStep = getStep("Billing address");

      fireEvent.click(
        within(shippingStep).getByRole("button", {
          name: "Submit shipping address",
        }),
      );

      expect(shippingStep.getAttribute("data-step-state")).toBe("saving");
      expect(within(shippingStep).queryByText("Saving")).toBeNull();
      expect(within(shippingStep).getByText("Taylor Chen")).toBeTruthy();
      expect(within(shippingStep).queryByLabelText("First name")).toBeNull();
      const editShippingButton = within(shippingStep).getByRole("button", {
        name: "Edit shipping address",
      }) as HTMLButtonElement;
      expect(editShippingButton.disabled).toBe(true);
      expect(
        within(billingStep).queryByLabelText("Same as shipping"),
      ).toBeNull();

      act(() => {
        vi.advanceTimersByTime(50);
      });

      expect(shippingStep.getAttribute("data-step-state")).toBe(
        "recalculating",
      );
      expect(
        within(shippingStep).queryByText("Recalculating totals"),
      ).toBeNull();

      await act(async () => {
        resolveDraftUpdate(defaultCheckoutPageData);
        await draftUpdatePromise;
      });

      expect(shippingStep.getAttribute("data-step-state")).toBe("saved");
      expect(within(shippingStep).queryByLabelText("First name")).toBeNull();
      expect(billingStep.getAttribute("data-step-state")).toBe("editing");
      expect(
        within(billingStep).getByLabelText("Same as shipping"),
      ).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens Billing within 250ms while a slow shipping draft update continues", () => {
    vi.useFakeTimers();

    try {
      const draftUpdatePromise = new Promise<CheckoutPageData>(() => undefined);
      const onDraftUpdate = vi.fn(
        (_request: TestDraftUpdateRequest): Promise<CheckoutPageData> =>
          draftUpdatePromise,
      );

      render(<CheckoutPage onDraftUpdate={onDraftUpdate} />);

      const shippingStep = getStep("Shipping address");
      const billingStep = getStep("Billing address");

      fireEvent.change(within(shippingStep).getByLabelText("First name"), {
        target: { value: "Jordan" },
      });
      fireEvent.change(within(shippingStep).getByLabelText("Last name"), {
        target: { value: "Li" },
      });
      fireEvent.change(within(shippingStep).getByLabelText("Phone number"), {
        target: { value: "(212) 555-0188" },
      });
      fireEvent.click(
        within(shippingStep).getByRole("button", {
          name: "Submit shipping address",
        }),
      );

      expect(onDraftUpdate).toHaveBeenCalledTimes(1);
      expect(onDraftUpdate.mock.calls[0]?.[0]).toEqual(
        expect.objectContaining({
          fields: expect.arrayContaining([
            expect.objectContaining({ label: "First name", value: "Jordan" }),
            expect.objectContaining({ label: "Last name", value: "Li" }),
            expect.objectContaining({
              label: "Phone number",
              value: "(212) 555-0188",
            }),
          ]),
          type: "delivery_shipping_address",
        }),
      );
      expect(shippingStep.getAttribute("data-step-state")).toBe("saving");
      expect(billingStep.getAttribute("data-step-state")).toBe("idle");

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(shippingStep.getAttribute("data-step-state")).toBe(
        "recalculating",
      );
      expect(billingStep.getAttribute("data-step-state")).toBe("editing");
      expect(
        within(billingStep).getByLabelText("Same as shipping"),
      ).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("opens the shipping state dropdown with shadcn select options", async () => {
    const user = userEvent.setup();
    const elementPrototype = window.Element
      .prototype as typeof window.Element.prototype & {
      hasPointerCapture?: (pointerId: number) => boolean;
      scrollIntoView?: () => void;
    };
    const originalHasPointerCapture = elementPrototype.hasPointerCapture;
    const originalScrollIntoView = elementPrototype.scrollIntoView;
    elementPrototype.hasPointerCapture = () => false;
    elementPrototype.scrollIntoView = () => undefined;

    try {
      render(<CheckoutPage />);

      const shippingStep = getStep("Shipping address");
      const stateSelect = within(shippingStep).getByRole("combobox", {
        name: "State",
      });

      expect(stateSelect.getAttribute("data-slot")).toBe("select-trigger");

      await user.click(stateSelect);

      expect(
        await screen.findByRole("option", {
          name: "NY",
        }),
      ).toBeTruthy();
      expect(
        screen.getByRole("option", {
          name: "CA",
        }),
      ).toBeTruthy();
    } finally {
      if (originalHasPointerCapture) {
        elementPrototype.hasPointerCapture = originalHasPointerCapture;
      } else {
        Reflect.deleteProperty(elementPrototype, "hasPointerCapture");
      }
      if (originalScrollIntoView) {
        elementPrototype.scrollIntoView = originalScrollIntoView;
      } else {
        Reflect.deleteProperty(elementPrototype, "scrollIntoView");
      }
    }
  });

  it("keeps a submitted section expanded with an announced error when draft save fails", async () => {
    const user = userEvent.setup();

    render(
      createElement(CheckoutPage, {
        onDraftUpdate: async () => {
          throw new Error("checkout draft unavailable");
        },
      } as Record<string, unknown>),
    );

    const shippingStep = getStep("Shipping address");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitForStepState(shippingStep, "blocked");
    expect(within(shippingStep).getByLabelText("First name")).toBeTruthy();
    expect(within(shippingStep).getByRole("alert").textContent).toContain(
      "We could not save Shipping address. Please try again.",
    );
    expect(getStep("Billing address").getAttribute("data-step-state")).toBe(
      "idle",
    );
  });

  it("keeps only one delivery checkout section expanded at a time", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const shippingStep = getStep("Shipping address");
    const billingStep = getStep("Billing address");
    const shippingOptionsStep = getStep("Shipping options");
    const paymentStep = getStep("Payment method");

    expect(within(shippingStep).getByLabelText("First name")).toBeTruthy();
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
    await waitForStepState(shippingStep, "saved");

    expect(within(shippingStep).queryByLabelText("First name")).toBeNull();
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

    expect(within(shippingStep).getByLabelText("First name")).toBeTruthy();
    expect(within(billingStep).queryByLabelText("Same as shipping")).toBeNull();
  });

  it("saves and collapses the delivery shipping address before editing billing", async () => {
    const user = userEvent.setup();

    render(<CheckoutPage />);

    const shippingStep = getStep("Shipping address");
    const firstName = within(shippingStep).getByLabelText(
      "First name",
    ) as HTMLInputElement;
    const lastName = within(shippingStep).getByLabelText(
      "Last name",
    ) as HTMLInputElement;

    await user.clear(firstName);
    await user.type(firstName, "Jordan");
    await user.clear(lastName);
    await user.type(lastName, "Li");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );
    await waitForStepState(shippingStep, "saved");

    expect(shippingStep.getAttribute("data-step-state")).toBe("saved");
    expect(within(shippingStep).queryByLabelText("First name")).toBeNull();
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
    expect(within(shippingStep).getByLabelText("First name")).toBeTruthy();
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
    await waitForStepState(shippingStep, "saved");

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
    await waitForStepState(billingStep, "saved");

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
    await waitForStepState(shippingOptionsStep, "saved");

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
      />,
    );

    await advanceDeliveryToPayment(user);

    const paymentStep = getStep("Payment method");
    expect(screen.queryByText("Selected paypal")).toBeNull();
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );
    expect(screen.getByText("Selected paypal")).toBeTruthy();

    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Pay Later/,
      }),
    );

    expect(screen.getByText("Selected paylater")).toBeTruthy();
    expect(
      paymentStep.querySelector(
        'img.checkout-choice__logo[src="/assets/paypal-logos/paylater-rebrand-mark.svg"]',
      ),
    ).toBeTruthy();
    expect(within(paymentStep).queryByText("Pay Later row message")).toBeNull();

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
    const initialOrderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(
      within(initialOrderSummary).getByText("Choose a pickup store"),
    ).toBeTruthy();
    expect(within(initialOrderSummary).queryByText("POP MART Soho")).toBeNull();
    expect(
      within(initialOrderSummary).queryByText("Ready for pickup: 1 item"),
    ).toBeNull();

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

  it("lets logged-in Pickup continue from the preselected store into billing and payment", async () => {
    const user = userEvent.setup();

    render(
      <CheckoutPage
        data={loggedInPickupData()}
        renderPaymentAction={(context) => (
          <div>Selected {context.selectedPaymentMethod}</div>
        )}
      />,
    );

    const storeSelectionStep = getStep("Store selection");
    expect(within(storeSelectionStep).getByText("POP MART Soho")).toBeTruthy();
    expect(
      within(getStep("Billing address")).queryByLabelText(
        "Billing street address",
      ),
    ).toBeNull();

    await user.click(
      within(storeSelectionStep).getByRole("button", {
        name: "Continue with this store",
      }),
    );
    await waitForStepState(storeSelectionStep, "saved");

    expect(screen.queryByRole("dialog")).toBeNull();

    const billingStep = getStep("Billing address");
    expect(billingStep.getAttribute("data-step-state")).toBe("editing");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    const pickupDateStep = getStep("Pickup date");
    expect(pickupDateStep.getAttribute("data-step-state")).toBe("editing");
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );
    await waitForStepState(pickupDateStep, "saved");

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );
    expect(screen.getByText("Selected paypal")).toBeTruthy();
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

  it("advances Pickup billing and pickup date sections before payment selection", async () => {
    const user = userEvent.setup();

    render(
      <CheckoutPage
        renderPaymentAction={(context) => (
          <div>Selected {context.selectedPaymentMethod}</div>
        )}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    await openPickupStoreModalFromGuestZip(user, "SW1A 1AA");
    await choosePickupStore(user, "POP MART Covent Garden");

    const billingStep = getStep("Billing address");
    expect(billingStep.getAttribute("data-step-state")).toBe("editing");

    await user.clear(
      within(billingStep).getByLabelText("Billing street address"),
    );
    await user.type(
      within(billingStep).getByLabelText("Billing street address"),
      "88 Sakura Lane",
    );
    await user.clear(within(billingStep).getByLabelText("City"));
    await user.type(within(billingStep).getByLabelText("City"), "London");
    await user.clear(within(billingStep).getByLabelText("ZIP code"));
    await user.type(within(billingStep).getByLabelText("ZIP code"), "WC2E 9DD");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    expect(billingStep.getAttribute("data-step-state")).toBe("saved");
    expect(
      within(billingStep).queryByLabelText("Billing street address"),
    ).toBeNull();
    expect(within(billingStep).getByText("88 Sakura Lane")).toBeTruthy();

    const pickupDateStep = getStep("Pickup date");
    expect(pickupDateStep.getAttribute("data-step-state")).toBe("editing");
    const selectedDateLabel = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "long",
    }).format(new Date());
    expect(within(pickupDateStep).getByText(selectedDateLabel)).toBeTruthy();
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );
    await waitForStepState(pickupDateStep, "saved");

    expect(pickupDateStep.getAttribute("data-step-state")).toBe("saved");
    expect(within(pickupDateStep).getByText(selectedDateLabel)).toBeTruthy();
    expect(
      pickupDateStep.querySelector(".checkout-pickup-calendar"),
    ).toBeNull();

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );
    expect(screen.getByText("Selected paypal")).toBeTruthy();

    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Pay Later/,
      }),
    );

    expect(screen.getByText("Selected paylater")).toBeTruthy();
    expect(
      paymentStep.querySelector(
        'img.checkout-choice__logo[src="/assets/paypal-logos/paylater-rebrand-mark.svg"]',
      ),
    ).toBeTruthy();
    expect(within(paymentStep).queryByText("Pay Later row message")).toBeNull();
  });

  it("submits the default selected pickup calendar date", async () => {
    const user = userEvent.setup();
    const draftUpdates: TestDraftUpdateRequest[] = [];
    const selectedDateValue = formatLocalDateValue(new Date());

    render(
      <CheckoutPage
        onDraftUpdate={(request) => {
          draftUpdates.push(request as TestDraftUpdateRequest);
          return undefined;
        }}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    await openPickupStoreModalFromGuestZip(user, "SW1A 1AA");
    await choosePickupStore(user, "POP MART Covent Garden");

    const billingStep = getStep("Billing address");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    const pickupDateStep = getStep("Pickup date");
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );

    expect(draftUpdates).toContainEqual(
      expect.objectContaining({
        fulfillmentMode: "pickup",
        selectedChoiceValue: selectedDateValue,
        type: "pickup_date",
      }),
    );
  });
});

async function advanceDeliveryToPayment(
  user: ReturnType<typeof userEvent.setup>,
) {
  const shippingStep = getStep("Shipping address");
  await user.click(
    within(shippingStep).getByRole("button", {
      name: "Submit shipping address",
    }),
  );
  await waitForStepState(shippingStep, "saved");

  const billingStep = getStep("Billing address");
  await user.click(
    within(billingStep).getByRole("button", {
      name: "Save billing address",
    }),
  );
  await waitForStepState(billingStep, "saved");

  const shippingOptionsStep = getStep("Shipping options");
  await user.click(
    within(shippingOptionsStep).getByRole("button", {
      name: "Submit shipping option",
    }),
  );
  await waitForStepState(shippingOptionsStep, "saved");
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

async function waitForStepState(step: HTMLElement, state: string) {
  await waitFor(() => {
    expect(step.getAttribute("data-step-state")).toBe(state);
  });
}

function formatLocalDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function loggedInPickupData(): CheckoutPageData {
  return {
    ...defaultCheckoutPageData,
    activeMode: "pickup",
    pickupStoreMode: "preselected",
  };
}

interface TestDraftUpdateRequest {
  readonly type: string;
  readonly fulfillmentMode: string;
  readonly draftId: string | null;
  readonly fields?: readonly {
    readonly label: string;
    readonly value: string | boolean;
  }[];
  readonly selectedChoiceLabel?: string;
  readonly selectedChoiceValue?: string;
  readonly selectedStoreName?: string | null;
}

function checkoutDataWithDeliveryTotal(
  totalLabel: string,
  promoLabel: string,
): CheckoutPageData {
  return {
    ...defaultCheckoutPageData,
    delivery: {
      ...defaultCheckoutPageData.delivery,
      summary: {
        ...defaultCheckoutPageData.delivery.summary,
        promoLabel,
        totalLabel,
      },
    },
  };
}

function checkoutDataWithPickupTotal(
  totalLabel: string,
  promoLabel: string,
): CheckoutPageData {
  return {
    ...defaultCheckoutPageData,
    activeMode: "pickup",
    pickup: {
      ...defaultCheckoutPageData.pickup,
      summary: {
        ...defaultCheckoutPageData.pickup.summary,
        promoLabel,
        totalLabel,
      },
    },
  };
}

// @vitest-environment jsdom

import {
  act,
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
  AccountPage,
  type AccountAddressView,
  type AccountOrderView,
  type AccountSavedPaymentMethodView,
} from "./AccountPage.js";
import * as AccountPageModule from "./AccountPage.js";

afterEach(() => {
  cleanup();
});

describe("AccountPage", () => {
  it("renders the buyer account hub with navigation, profile, address, and payment cards", () => {
    const html = renderToStaticMarkup(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="settings"
      />,
    );

    expect(html).toContain("Account settings");
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain("Orders");
    expect(html).toContain("Addresses");
    expect(html).toContain("Payments");
    expect(html).toContain("Profile");
    expect(html).toContain("alice@example.test");
    expect(html).toContain("Default shipping");
    expect(html).toContain("Default billing");
    expect(html).toContain("Cannot delete until another default is set.");
    expect(html).toContain("Visa ending in 4242");
    expect(html).toContain("Active");
  });

  it("shows buyer-friendly loading, empty, and error states", () => {
    const html = renderToStaticMarkup(
      <AccountPage
        addresses={[]}
        addressesStatus="loading"
        email={null}
        savedPayments={[]}
        savedPaymentsStatus="error"
        section="settings"
      />,
    );

    expect(html).toContain("Finding your saved addresses");
    expect(html).toContain("Saved payments could not be loaded.");
    expect(html).toContain("Try refreshing this page before checkout.");
  });

  it("renders account edit forms with shadcn fields and mobile-friendly metadata", async () => {
    const user = userEvent.setup();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="settings"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add address" }));

    const recipientInput = screen.getByLabelText(
      "Recipient name",
    ) as HTMLInputElement;
    const phoneInput = screen.getByLabelText("Phone") as HTMLInputElement;
    const postalInput = screen.getByLabelText(
      "ZIP/postal code",
    ) as HTMLInputElement;
    const countryInput = screen.getByLabelText(
      "Country code",
    ) as HTMLInputElement;

    expect(recipientInput.closest('[data-slot="field"]')).toBeTruthy();
    expect(recipientInput.getAttribute("data-slot")).toBe("input");
    expect(recipientInput.getAttribute("autocomplete")).toBe("name");
    expect(recipientInput.required).toBe(true);
    expect(phoneInput.getAttribute("autocomplete")).toBe("tel");
    expect(phoneInput.getAttribute("inputmode")).toBe("tel");
    expect(postalInput.getAttribute("autocomplete")).toBe("postal-code");
    expect(postalInput.required).toBe(true);
    expect(countryInput.getAttribute("autocomplete")).toBe("country");
    expect(countryInput.getAttribute("maxlength")).toBe("2");
  });

  it("renders retail order-history cards with pending resume and completed review affordances", () => {
    const html = renderToStaticMarkup(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
      />,
    );

    expect(html).toContain("Order history");
    expect(html).toContain("DO-20260607-000123");
    expect(html).toContain("Pending payment");
    expect(html).toContain("Resume payment");
    expect(html).toContain("Totals and offers refresh before payment.");
    expect(html).toContain("PO-20260602-000118");
    expect(html).toContain("Picked up");
    expect(html).toContain("Review items");
    expect(html).toContain("View details");
    expect(html).not.toContain("paypal_order_id");
    expect(html).not.toContain("payment_session");
  });

  it("resumes a pending order with scoped loading feedback", async () => {
    const user = userEvent.setup();
    let resolveResume: (() => void) | undefined;
    const onResumeOrder = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveResume = resolve;
        }),
    );

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        onResumeOrder={onResumeOrder}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resume payment" }));

    expect(onResumeOrder).toHaveBeenCalledWith("DO-20260607-000123");
    expect(
      (
        screen.getByRole("button", {
          name: "Preparing checkout...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await act(async () => {
      resolveResume?.();
    });
    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Resume payment",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
  });

  it("keeps a failed pending-order resume retryable", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const onResumeOrder = vi.fn().mockRejectedValue(new Error("resume failed"));

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        onResumeOrder={onResumeOrder}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Resume payment" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We could not prepare this order. Review its latest details and try again.",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Resume payment",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    expect(consoleError).toHaveBeenCalledWith(
      "[paypal-retail-demo] Pending order resume failed",
      expect.objectContaining({
        orderNumber: "DO-20260607-000123",
      }),
    );
  });

  it("maps account order filters to in-progress, completed, and cancelled states", () => {
    const orders = accountOrdersWithFilters();
    const matcher = (
      AccountPageModule as typeof AccountPageModule & {
        readonly matchesAccountOrderFilter?: (
          order: AccountOrderView,
          filter: "all" | "in_progress" | "completed",
        ) => boolean;
      }
    ).matchesAccountOrderFilter;

    expect(typeof matcher).toBe("function");
    if (!matcher) {
      return;
    }

    const matchingOrderNumbers = (
      filter: "all" | "in_progress" | "completed",
    ) =>
      orders
        .filter((order) => matcher(order, filter))
        .map((order) => order.orderNumber);

    expect(matchingOrderNumbers("all")).toEqual([
      "DO-20260607-000123",
      "PO-20260602-000118",
      "DO-20260605-000119",
      "DO-20260604-000117",
      "DO-20260603-000116",
    ]);
    expect(matchingOrderNumbers("in_progress")).toEqual([
      "DO-20260607-000123",
      "DO-20260604-000117",
    ]);
    expect(matchingOrderNumbers("completed")).toEqual([
      "PO-20260602-000118",
      "DO-20260605-000119",
    ]);
  });

  it("renders derived filter counts and keeps cancelled orders only under All", async () => {
    const user = userEvent.setup();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrdersWithFilters()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
      />,
    );

    const filters = screen.getByRole("group", { name: "Filter orders" });
    expect(
      within(filters)
        .getByRole("button", { name: "All 5" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      within(filters).getByRole("button", { name: "In progress 2" }),
    ).toBeTruthy();
    expect(
      within(filters).getByRole("button", { name: "Completed 2" }),
    ).toBeTruthy();
    expect(screen.getByText("DO-20260603-000116")).toBeTruthy();
    expect(screen.getByText("Cancelled")).toBeTruthy();

    await user.click(
      within(filters).getByRole("button", { name: "Completed 2" }),
    );

    expect(screen.getByText("Showing Completed orders")).toBeTruthy();
    expect(screen.getByText("PO-20260602-000118")).toBeTruthy();
    expect(screen.getByText("DO-20260605-000119")).toBeTruthy();
    expect(screen.queryByText("DO-20260607-000123")).toBeNull();
    expect(screen.queryByText("DO-20260603-000116")).toBeNull();

    await user.click(
      within(filters).getByRole("button", { name: "In progress 2" }),
    );

    expect(screen.getByText("Showing In progress orders")).toBeTruthy();
    expect(screen.getByText("DO-20260607-000123")).toBeTruthy();
    expect(screen.getByText("DO-20260604-000117")).toBeTruthy();
    expect(screen.queryByText("PO-20260602-000118")).toBeNull();
    expect(screen.queryByText("DO-20260603-000116")).toBeNull();
  });

  it("announces refresh failure, preserves last-updated copy, and retries", async () => {
    const user = userEvent.setup();
    let rejectRefresh: ((reason?: unknown) => void) | undefined;
    const onRefreshOrders = vi
      .fn<() => Promise<void>>()
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectRefresh = reject;
          }),
      )
      .mockResolvedValueOnce();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        ordersLastUpdatedAt="2026-07-13T09:41:00.000Z"
        onRefreshOrders={onRefreshOrders}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
      />,
    );

    expect(screen.getByText(/Last updated at/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Refresh orders" }));
    expect(
      (
        screen.getByRole("button", {
          name: "Refreshing orders...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await act(async () => {
      rejectRefresh?.(new Error("account request failed"));
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Orders could not be refreshed.",
    );
    expect(screen.getByText(/Last updated at/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRefreshOrders).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("renders buyer-safe order detail with timeline, totals, and item review state", () => {
    const html = renderToStaticMarkup(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
      />,
    );

    expect(html).toContain("Order detail");
    expect(html).toContain("Back to order history");
    expect(html).toContain("Pickup at POP MART Soho");
    expect(html).toContain("Timeline");
    expect(html).toContain("Order placed");
    expect(html).toContain("Ready for pickup");
    expect(html).toContain("Picked up");
    expect(html).toContain("Items in this order");
    expect(html).toContain("Skullpanda Future Drop");
    expect(html).toContain("Review item");
    expect(html).toContain("Already reviewed");
    expect(html).not.toContain("Review form is handled in the review slice.");
    expect(html).toContain("Totals");
    expect(html).toContain("$28.16");
    expect(html).not.toContain("paypal_order_id");
    expect(html).not.toContain("payment_session");
  });

  it("puts the current stage before fulfillment detail and the buyer-safe timeline", () => {
    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
      />,
    );

    const currentStage = screen.getByRole("region", { name: "Current stage" });
    const pickupDetail = screen.getByRole("region", { name: "Pickup detail" });
    const timeline = screen.getByRole("region", { name: "Order timeline" });

    expect(
      within(currentStage).getByRole("heading", { name: "Picked up" }),
    ).toBeTruthy();
    expect(within(currentStage).getByText("Jun 4, 2026, 4:00 PM")).toBeTruthy();
    expect(
      currentStage.compareDocumentPosition(pickupDetail) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      pickupDetail.compareDocumentPosition(timeline) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    cleanup();
    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="DO-20260607-000123"
      />,
    );

    expect(
      screen.getByRole("region", { name: "Delivery detail" }),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("region", { name: "Current stage" })).getByRole(
        "heading",
        { name: "Awaiting payment" },
      ),
    ).toBeTruthy();
  });

  it("shows canonical Delivery and Pickup recipient locality", () => {
    const orders = accountOrders();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={orders}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="DO-20260607-000123"
      />,
    );

    const deliveryDetail = screen.getByRole("region", {
      name: "Delivery detail",
    });
    expect(within(deliveryDetail).getByText("Shipping to")).toBeTruthy();
    expect(within(deliveryDetail).getByText("Alice Lee")).toBeTruthy();
    expect(
      within(deliveryDetail).getByText("Los Angeles, CA 90046"),
    ).toBeTruthy();
    cleanup();
    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={orders}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
      />,
    );

    const pickupDetail = screen.getByRole("region", { name: "Pickup detail" });
    expect(within(pickupDetail).getByText("Pickup store")).toBeTruthy();
    expect(within(pickupDetail).getByText("S2S POP MART Soho")).toBeTruthy();
    expect(within(pickupDetail).getByText("New York, NY 10012")).toBeTruthy();
  });

  it("labels complete, current, and pending timeline states with text", () => {
    const [, pickupOrder] = accountOrders();
    if (!pickupOrder) {
      throw new Error("Expected the seeded pickup Account order fixture.");
    }

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={[
          {
            ...pickupOrder,
            timeline: [
              ...pickupOrder.timeline,
              {
                description: "A future buyer action remains available.",
                label: "Review eligible",
                status: "pending",
              },
            ],
          },
        ]}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
      />,
    );

    const timeline = screen.getByRole("region", { name: "Order timeline" });
    expect(within(timeline).getAllByText("Completed")).toHaveLength(2);
    expect(within(timeline).getByText("Current stage")).toBeTruthy();
    expect(within(timeline).getByText("Upcoming")).toBeTruthy();
  });

  it("submits a completed-order item review from order detail", async () => {
    const user = userEvent.setup();
    const onSubmitReview = vi.fn();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
        onSubmitReview={onSubmitReview}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Review item Skullpanda Future Drop",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Rating"), "5");
    await user.type(screen.getByLabelText("Review title"), "Tiny shelf star");
    await user.type(
      screen.getByLabelText("Review body"),
      "The paint details look great beside my other figures.",
    );
    await user.click(screen.getByRole("button", { name: "Submit review" }));

    expect(onSubmitReview).toHaveBeenCalledWith(
      "PO-20260602-000118",
      "line_1",
      {
        rating: 5,
        title: "Tiny shelf star",
        body: "The paint details look great beside my other figures.",
      },
    );
  });

  it("edits and deletes an existing order item review", async () => {
    const user = userEvent.setup();
    const onUpdateReview = vi.fn();
    const onDeleteReview = vi.fn();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        orders={accountOrders()}
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="orders"
        selectedOrderNumber="PO-20260602-000118"
        onDeleteReview={onDeleteReview}
        onUpdateReview={onUpdateReview}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Edit review Labubu Have a Seat",
      }),
    );
    await user.clear(screen.getByLabelText("Review title"));
    await user.type(screen.getByLabelText("Review title"), "Still a favorite");
    await user.clear(screen.getByLabelText("Review body"));
    await user.type(
      screen.getByLabelText("Review body"),
      "Updated after unboxing the stand accessories.",
    );
    await user.click(screen.getByRole("button", { name: "Save review" }));

    expect(onUpdateReview).toHaveBeenCalledWith(
      "PO-20260602-000118",
      "line_2",
      {
        rating: 5,
        title: "Still a favorite",
        body: "Updated after unboxing the stand accessories.",
      },
    );

    await user.click(
      screen.getByRole("button", {
        name: "Delete review Labubu Have a Seat",
      }),
    );

    expect(onDeleteReview).toHaveBeenCalledWith("PO-20260602-000118", "line_2");
  });

  it("confirms saved-payment deletion inline before calling the delete handler", async () => {
    const user = userEvent.setup();
    const onDeleteSavedPayment = vi.fn();

    render(
      <AccountPage
        addresses={addresses()}
        addressesStatus="ready"
        email="alice@example.test"
        savedPayments={savedPayments()}
        savedPaymentsStatus="ready"
        section="settings"
        onDeleteSavedPayment={onDeleteSavedPayment}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Delete saved payment Visa ending in 4242",
      }),
    );

    expect(onDeleteSavedPayment).not.toHaveBeenCalled();
    expect(screen.getByText("Remove this saved payment?")).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Confirm delete saved payment Visa ending in 4242",
      }),
    );

    expect(onDeleteSavedPayment).toHaveBeenCalledWith("payment_card");
  });
});

function addresses(): readonly AccountAddressView[] {
  return [
    {
      id: "address_default",
      label: "Home",
      recipient_name: "Alice Lee",
      phone: "555-0100",
      address_line1: "742 N Fairfax Ave",
      address_line2: null,
      city: "Los Angeles",
      state: "CA",
      postal_code: "90046",
      country_code: "US",
      is_default_shipping: true,
      is_default_billing: true,
    },
  ];
}

function savedPayments(): readonly AccountSavedPaymentMethodView[] {
  return [
    {
      id: "payment_card",
      methodType: "card",
      status: "active",
      brand: "Visa",
      expiryMonth: 12,
      expiryYear: 2030,
      label: null,
      last4: "4242",
    },
  ];
}

function accountOrders(): readonly AccountOrderView[] {
  return [
    {
      orderNumber: "DO-20260607-000123",
      placedDateLabel: "Placed Jun 7, 2026",
      fulfillmentMode: "delivery",
      status: "pending",
      fulfillmentLabel: "Delivery order",
      paymentStatusLabel: "Payment pending",
      totalLabel: "$41.07",
      note: "Totals and offers refresh before payment.",
      fulfillmentAddresses: [
        {
          addressType: "shipping",
          city: "Los Angeles",
          countryCode: "US",
          postalCode: "90046",
          recipientName: "Alice Lee",
          state: "CA",
        },
      ],
      items: [
        {
          id: "line_1",
          imageAlt: "Labubu Have a Seat blind box",
          imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          lineTotalLabel: "$13.99",
          name: "Labubu Have a Seat",
          quantity: 1,
          reviewEligible: false,
          reviewSubmitted: false,
          review: null,
        },
      ],
      timeline: [
        {
          description: "Order snapshot saved for resume.",
          label: "Order placed",
          status: "complete",
        },
        {
          description: "Prices, inventory, tax, and promos refresh before pay.",
          label: "Awaiting payment",
          status: "current",
        },
      ],
      totals: [
        { label: "Merchandise", value: "$39.97" },
        { label: "Promo", value: "-$4.00" },
        { label: "Tax", value: "$1.10" },
        { label: "Shipping", value: "$4.00" },
        { label: "Total", value: "$41.07" },
      ],
    },
    {
      orderNumber: "PO-20260602-000118",
      placedDateLabel: "Placed Jun 2, 2026",
      fulfillmentMode: "pickup",
      status: "picked_up",
      fulfillmentLabel: "Pickup at POP MART Soho",
      paymentStatusLabel: "Paid with PayPal",
      totalLabel: "$28.16",
      note: "Picked up Jun 4 in the afternoon window.",
      fulfillmentAddresses: [
        {
          addressType: "pickup_store",
          city: "New York",
          countryCode: "US",
          postalCode: "10012",
          recipientName: "S2S POP MART Soho",
          state: "NY",
        },
      ],
      items: [
        {
          id: "line_1",
          imageAlt: "Skullpanda Future Drop blind box",
          imagePath: "/assets/popmart/products/skullpanda-future-drop-1.svg",
          lineTotalLabel: "$15.99",
          name: "Skullpanda Future Drop",
          quantity: 1,
          reviewEligible: true,
          reviewSubmitted: false,
          review: null,
        },
        {
          id: "line_2",
          imageAlt: "Labubu Have a Seat blind box",
          imagePath: "/assets/popmart/products/labubu-have-a-seat-2.svg",
          lineTotalLabel: "$13.99",
          name: "Labubu Have a Seat",
          quantity: 1,
          reviewEligible: true,
          reviewSubmitted: true,
          review: {
            rating: 5,
            title: "Unboxed beautifully",
            body: "The tiny chair accessory made this one worth keeping on display.",
          },
        },
      ],
      timeline: [
        {
          description: "Pickup order was created and paid.",
          label: "Order placed",
          status: "complete",
        },
        {
          description: "Store team confirmed inventory for pickup.",
          label: "Ready for pickup",
          status: "complete",
        },
        {
          description: "Buyer collected the order in store.",
          label: "Picked up",
          occurredAtLabel: "Jun 4, 2026, 4:00 PM",
          status: "current",
        },
      ],
      totals: [
        { label: "Merchandise", value: "$29.98" },
        { label: "Promo", value: "-$3.00" },
        { label: "Tax", value: "$1.18" },
        { label: "Shipping", value: "$0.00" },
        { label: "Total", value: "$28.16" },
      ],
    },
  ];
}

function accountOrdersWithFilters(): readonly AccountOrderView[] {
  const [pendingOrder, pickedUpOrder] = accountOrders();
  if (!pendingOrder || !pickedUpOrder) {
    throw new Error("Expected seeded Account order fixtures.");
  }

  return [
    pendingOrder,
    pickedUpOrder,
    {
      ...pendingOrder,
      orderNumber: "DO-20260605-000119",
      status: "delivered",
      fulfillmentLabel: "Delivered to Los Angeles",
      note: "Delivered to your address.",
      timeline: [
        {
          description: "Package arrived at your address.",
          label: "Delivered",
          status: "current",
        },
      ],
    },
    {
      ...pendingOrder,
      orderNumber: "DO-20260604-000117",
      status: "shipped",
      fulfillmentLabel: "Delivery in transit",
      note: "Your package is moving through the carrier network.",
      timeline: [
        {
          description: "Package left the fulfillment center.",
          label: "Shipped",
          status: "current",
        },
      ],
    },
    {
      ...pendingOrder,
      orderNumber: "DO-20260603-000116",
      status: "cancelled",
      fulfillmentLabel: "Cancelled delivery order",
      note: "This order was cancelled.",
      timeline: [
        {
          description: "This order will not be fulfilled.",
          label: "Cancelled",
          status: "current",
        },
      ],
    },
  ];
}

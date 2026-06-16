// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountPage,
  type AccountAddressView,
  type AccountOrderView,
  type AccountSavedPaymentMethodView,
} from "./AccountPage.js";

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
    expect(html).toContain("Totals");
    expect(html).toContain("$28.16");
    expect(html).not.toContain("paypal_order_id");
    expect(html).not.toContain("payment_session");
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

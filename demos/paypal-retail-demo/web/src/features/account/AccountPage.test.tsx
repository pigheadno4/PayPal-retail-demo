// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  AccountPage,
  type AccountAddressView,
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

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import { DeliveryExpressAction } from "./DeliveryExpressAction.js";
import { PayLaterStandaloneAction } from "./PayLaterStandaloneAction.js";
import { PayPalStandaloneAction } from "./PayPalStandaloneAction.js";

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayLaterOneTimePaymentButton: MockPayPalButton,
  PayPalOneTimePaymentButton: MockPayPalButton,
  useEligibleMethods: () => ({
    eligiblePaymentMethods: {
      getDetails: () => ({
        countryCode: "US",
        productCode: "PAY_LATER",
      }),
      isEligible: (method: string) => method === "paylater",
    },
    error: null,
    isLoading: false,
  }),
  usePayPalMessages: () => ({
    error: null,
  }),
}));

afterEach(() => {
  cleanup();
});

describe("payment action failure handling", () => {
  it("keeps checkout PayPal create-order failures visible with a debug reference and retry affordance", async () => {
    const user = userEvent.setup();

    render(
      <AppProviders apiClient={createFailingApiClient()}>
        <PayPalStandaloneAction
          checkoutDraftId="draft_delivery_123"
          fulfillmentMode="delivery"
          market="US"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We could not start PayPal.");
    expect(alert.textContent).toContain("Reference ID: dbg_paypal_down");
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mock PayPal" })).toBeTruthy();
  });

  it("keeps checkout Pay Later create-order failures visible with a debug reference", async () => {
    const user = userEvent.setup();

    render(
      <AppProviders apiClient={createFailingApiClient()}>
        <PayLaterStandaloneAction
          buyerCountry="US"
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("We could not start Pay Later.");
    expect(alert.textContent).toContain("Reference ID: dbg_paypal_down");
  });

  it("keeps delivery express create-order failures visible with a debug reference", async () => {
    const user = userEvent.setup();

    render(
      <AppProviders apiClient={createFailingApiClient()}>
        <DeliveryExpressAction
          cartClientSecret="cart_secret_guest"
          cartPublicId="cart_public_guest"
          currencyCode="USD"
          market="US"
          method="paypal"
          source="cart"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "We could not start PayPal delivery express.",
    );
    expect(alert.textContent).toContain("Reference ID: dbg_paypal_down");
  });

  it("keeps delivery express pre-create refresh failures visible with a debug reference", async () => {
    const user = userEvent.setup();

    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
        <DeliveryExpressAction
          cartClientSecret="cart_secret_guest"
          cartPublicId="cart_public_guest"
          currencyCode="USD"
          market="US"
          method="paypal"
          onBeforeCreateOrder={async () => {
            throw new ApiClientError({
              code: "CART_REFRESH_FAILED",
              debugId: "dbg_cart_refresh",
              details: {},
              message: "The cart could not be refreshed.",
              status: 500,
            });
          }}
          source="cart"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(
      "We could not start PayPal delivery express.",
    );
    expect(alert.textContent).toContain("Reference ID: dbg_cart_refresh");
  });

  it("clears the failure notice when the buyer retries", async () => {
    const user = userEvent.setup();

    render(
      <AppProviders apiClient={createFailingApiClient()}>
        <PayPalStandaloneAction
          checkoutDraftId="draft_delivery_123"
          fulfillmentMode="delivery"
          market="US"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));
    expect(await screen.findByRole("alert")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

function MockPayPalButton({
  createOrder,
  onError,
}: {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly onError?: (error: {
    readonly code: string;
    readonly isRecoverable: boolean;
    readonly message: string;
  }) => void;
}) {
  return (
    <button
      onClick={() => {
        void createOrder().catch((error: unknown) => {
          onError?.({
            code: "CREATE_ORDER_FAILED",
            isRecoverable: true,
            message: error instanceof Error ? error.message : "Unknown error",
          });
        });
      }}
      type="button"
    >
      Mock PayPal
    </button>
  );
}

function createFailingApiClient() {
  return createApiClient({
    baseUrl: "https://demo.example.test",
    fetch: async () =>
      ({
        status: 503,
        json: async () => ({
          ok: false,
          error: {
            code: "PAYPAL_ORDER_CREATE_UNAVAILABLE",
            message: "PayPal order creation is not configured.",
          },
          debug_id: "dbg_paypal_down",
        }),
      }) as Response,
  });
}

function createSuccessfulApiClient() {
  return createApiClient({
    baseUrl: "https://demo.example.test",
    fetch: async () =>
      ({
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            paypal_order_id: "PAYPAL-ORDER-123",
          },
          debug_id: "dbg_success",
        }),
      }) as Response,
  });
}

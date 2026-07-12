// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import { WalletCheckoutAction } from "./WalletCheckoutAction.js";

const googleSessionState = vi.hoisted(() => ({
  props: null as null | {
    readonly createOrder: () => Promise<{ readonly orderId: string }>;
    readonly googlePayConfig: unknown;
    readonly environment: "TEST" | "PRODUCTION";
    readonly onApprove: (data: {
      readonly id: string;
      readonly status: string;
    }) => Promise<void> | void;
    readonly transactionInfo: {
      readonly countryCode: string;
      readonly currencyCode: string;
      readonly totalPrice: string;
      readonly totalPriceStatus: string;
    };
  },
}));

const appleButtonState = vi.hoisted(() => ({
  props: null as null | {
    readonly createOrder: () => Promise<{ readonly orderId: string }>;
    readonly onApprove: (data: {
      readonly approveApplePayPayment: {
        readonly id: string;
        readonly status: string;
      };
    }) => Promise<void> | void;
    readonly onApproveCompleted?: (data: {
      readonly approveApplePayPayment: {
        readonly id: string;
        readonly status: string;
      };
    }) => Promise<void> | void;
  },
}));

vi.mock("./PayPalSdkProviderScope.js", () => ({
  usePayPalSdkConfig: () => ({ environment: "production" }),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  ApplePayOneTimePaymentButton: (
    props: NonNullable<typeof appleButtonState.props>,
  ) => {
    appleButtonState.props = props;
    return <div data-testid="apple-pay-button" />;
  },
  VenmoOneTimePaymentButton: () => <div data-testid="venmo-button" />,
  useEligibleMethods: () => ({
    eligiblePaymentMethods: {
      getDetails: (method: string) => ({
        config:
          method === "applepay"
            ? { countryCode: "US", merchantCapabilities: ["supports3DS"] }
            : { merchantInfo: { merchantName: "POP MART" } },
      }),
      isEligible: (method: string) =>
        method === "applepay" || method === "googlepay",
    },
    error: null,
    isLoading: false,
  }),
  useGooglePayOneTimePaymentSession: (
    props: NonNullable<typeof googleSessionState.props>,
  ) => {
    googleSessionState.props = props;

    return {
      createGooglePayButton: async (options: { onClick: () => void }) => {
        const button = document.createElement("button");
        button.dataset.testid = "official-google-pay-button";
        button.textContent = "Official Google Pay";
        button.addEventListener("click", options.onClick);
        return button;
      },
      handleClick: async () => {
        const { orderId } = await props.createOrder();
        await props.onApprove({ id: orderId, status: "APPROVED" });
      },
      handleDestroy: vi.fn(),
      isPending: false,
    };
  },
}));

afterEach(() => {
  cleanup();
  googleSessionState.props = null;
  appleButtonState.props = null;
});

describe("WalletCheckoutAction Google Pay runtime", () => {
  it("renders the official Google Pay component and forwards approved order context", async () => {
    const onApproved = vi.fn();
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              paypal_order_id: "GOOGLE_ORDER_123",
              payment_session_id: "GOOGLE_SESSION_123",
              merchant_order_id: "DO-20260712-000001",
            },
            debug_id: "dbg_google_pay",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });

    render(
      <AppProviders apiClient={apiClient}>
        <WalletCheckoutAction
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          method="google_pay"
          onApproved={onApproved}
          storeDisplayName="POP MART"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await userEvent.click(
      await screen.findByTestId("official-google-pay-button"),
    );

    await waitFor(() =>
      expect(onApproved).toHaveBeenCalledWith({
        fulfillmentMode: "delivery",
        method: "google_pay",
        paypalOrderId: "GOOGLE_ORDER_123",
        paymentSessionId: "GOOGLE_SESSION_123",
      }),
    );
    expect(googleSessionState.props?.googlePayConfig).toEqual({
      merchantInfo: { merchantName: "POP MART" },
    });
    expect(googleSessionState.props?.environment).toBe("PRODUCTION");
    expect(googleSessionState.props?.transactionInfo).toEqual({
      countryCode: "US",
      currencyCode: "USD",
      totalPrice: "25.98",
      totalPriceStatus: "FINAL",
    });
    expect(
      document.querySelector(".wallet-checkout-action__google-pay-button"),
    ).toBeNull();
  });

  it("waits until Apple Pay session completion before starting merchant capture work", async () => {
    const onApproved = vi.fn();
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        new Response(
          JSON.stringify({
            ok: true,
            data: {
              paypal_order_id: "APPLE_ORDER_123",
              payment_session_id: "APPLE_SESSION_123",
            },
            debug_id: "dbg_apple_pay",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
    });
    const approval = {
      approveApplePayPayment: {
        id: "APPLE_ORDER_123",
        status: "APPROVED",
      },
    };

    render(
      <AppProviders apiClient={apiClient}>
        <WalletCheckoutAction
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          method="apple_pay"
          onApproved={onApproved}
          storeDisplayName="POP MART"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    expect(await screen.findByTestId("apple-pay-button")).toBeTruthy();
    await appleButtonState.props?.createOrder();
    await appleButtonState.props?.onApprove(approval);
    expect(onApproved).not.toHaveBeenCalled();

    await appleButtonState.props?.onApproveCompleted?.(approval);
    expect(onApproved).toHaveBeenCalledWith({
      fulfillmentMode: "delivery",
      method: "apple_pay",
      paypalOrderId: "APPLE_ORDER_123",
      paymentSessionId: "APPLE_SESSION_123",
    });
  });
});

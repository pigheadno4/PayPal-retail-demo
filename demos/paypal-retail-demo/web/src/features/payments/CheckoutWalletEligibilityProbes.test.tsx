// @vitest-environment jsdom

import { cleanup, render, waitFor } from "@testing-library/react";
import { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ApplePayPreselectionProbe,
  CheckoutWalletEligibilityProbes,
  GooglePayPreselectionProbe,
} from "./CheckoutWalletEligibilityProbes.js";

const paypalMockState = vi.hoisted(() => ({
  eligible: true,
  eligibilityError: null as Error | null,
  eligibilityLoading: false,
  googleError: null as Error | null,
  googleReady: true,
  googleSessionPending: false,
  googleIsReadyToPay: vi.fn(),
  handleDestroy: vi.fn(),
  useEligibleMethods: vi.fn(),
}));

vi.mock("./PayPalSdkProviderScope.js", () => ({
  PayPalSdkProviderScope: ({
    children,
    configRequest,
  }: {
    readonly children: ReactNode;
    readonly configRequest: { readonly method: string };
  }) => <div data-testid={`provider-${configRequest.method}`}>{children}</div>,
  usePayPalSdkConfig: () => ({ environment: "production" }),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  useEligibleMethods: (options: unknown) => {
    paypalMockState.useEligibleMethods(options);

    return {
      eligiblePaymentMethods: {
        getDetails: (method: string) => ({
          config:
            method === "applepay"
              ? { countryCode: "US", merchantCapabilities: ["supports3DS"] }
              : { merchantInfo: { merchantName: "POP MART" } },
        }),
        isEligible: () => paypalMockState.eligible,
      },
      error: paypalMockState.eligibilityError,
      isLoading: paypalMockState.eligibilityLoading,
    };
  },
  useGooglePayOneTimePaymentSession: () => ({
    error: paypalMockState.googleError,
    formattedConfig: {
      allowedPaymentMethods: [{ type: "CARD" }],
      apiVersion: 2,
      apiVersionMinor: 0,
      merchantInfo: { merchantName: "POP MART" },
    },
    handleDestroy: paypalMockState.handleDestroy,
    isPending: paypalMockState.googleSessionPending,
    paymentsClient: {
      isReadyToPay: paypalMockState.googleIsReadyToPay,
    },
  }),
}));

beforeEach(() => {
  paypalMockState.eligible = true;
  paypalMockState.eligibilityError = null;
  paypalMockState.eligibilityLoading = false;
  paypalMockState.googleError = null;
  paypalMockState.googleReady = true;
  paypalMockState.googleSessionPending = false;
  paypalMockState.googleIsReadyToPay.mockReset();
  paypalMockState.googleIsReadyToPay.mockImplementation(async () => ({
    result: paypalMockState.googleReady,
  }));
  paypalMockState.handleDestroy.mockReset();
  paypalMockState.useEligibleMethods.mockReset();
  setApplePayAvailability(true);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, "ApplePaySession");
});

describe("CheckoutWalletEligibilityProbes", () => {
  it("mounts method-scoped providers without rendering buyer-facing content", () => {
    const { container, getByTestId } = render(
      <CheckoutWalletEligibilityProbes
        currencyCode="USD"
        market="US"
        onEligibilityChange={vi.fn()}
        providerKey="paypal:sandbox:test"
        totalLabel="$25.98"
      />,
    );

    expect(getByTestId("provider-apple_pay")).toBeTruthy();
    expect(getByTestId("provider-google_pay")).toBeTruthy();
    expect(container.textContent).toBe("");
    expect(paypalMockState.useEligibleMethods).toHaveBeenCalledTimes(2);
    expect(paypalMockState.useEligibleMethods).toHaveBeenNthCalledWith(1, {
      payload: {
        amount: "25.98",
        currencyCode: "USD",
        paymentFlow: "ONE_TIME_PAYMENT",
      },
    });
    expect(paypalMockState.useEligibleMethods).toHaveBeenNthCalledWith(2, {
      payload: {
        amount: "25.98",
        currencyCode: "USD",
        paymentFlow: "ONE_TIME_PAYMENT",
      },
    });
  });

  it("requires both PayPal and browser eligibility for Apple Pay", async () => {
    const onEligibilityChange = vi.fn();
    setApplePayAvailability(false);

    const { unmount } = render(
      <ApplePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("ineligible"),
    );

    unmount();
    setApplePayAvailability(true);
    render(
      <ApplePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("eligible"),
    );
  });

  it("resolves Apple Pay provider failures to ineligible", async () => {
    paypalMockState.eligibilityError = new Error("provider failed");
    const onEligibilityChange = vi.fn();

    render(
      <ApplePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("ineligible"),
    );
  });

  it("requires Google isReadyToPay after PayPal eligibility", async () => {
    paypalMockState.googleReady = false;
    const onEligibilityChange = vi.fn();

    const { unmount } = render(
      <GooglePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("ineligible"),
    );
    expect(paypalMockState.googleIsReadyToPay).toHaveBeenCalledWith({
      allowedPaymentMethods: [{ type: "CARD" }],
      apiVersion: 2,
      apiVersionMinor: 0,
    });

    unmount();
    paypalMockState.googleReady = true;
    render(
      <GooglePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("eligible"),
    );
  });

  it("does not restart Google readiness when reporting state rerenders the route boundary", async () => {
    render(<StatefulGoogleProbeHarness />);

    await waitFor(() =>
      expect(document.body.textContent).toContain("eligible"),
    );
    expect(paypalMockState.googleIsReadyToPay).toHaveBeenCalledTimes(1);
  });

  it("destroys the old Google session and waits for fresh methods when the amount changes", async () => {
    const onEligibilityChange = vi.fn();
    const { rerender } = render(
      <CheckoutWalletEligibilityProbes
        key="25.98"
        currencyCode="USD"
        market="US"
        onEligibilityChange={onEligibilityChange}
        providerKey="paypal:sandbox:test"
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenCalledWith(
        "google_pay",
        "eligible",
      ),
    );
    expect(paypalMockState.googleIsReadyToPay).toHaveBeenCalledTimes(1);

    paypalMockState.eligibilityLoading = true;
    rerender(
      <CheckoutWalletEligibilityProbes
        key="31.25"
        currencyCode="USD"
        market="US"
        onEligibilityChange={onEligibilityChange}
        providerKey="paypal:sandbox:test"
        totalLabel="$31.25"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenCalledWith("google_pay", "pending"),
    );
    expect(paypalMockState.handleDestroy).toHaveBeenCalledTimes(1);
    expect(paypalMockState.googleIsReadyToPay).toHaveBeenCalledTimes(1);
  });

  it("resolves Google Pay provider and runtime failures to ineligible", async () => {
    paypalMockState.googleError = new Error("Google runtime failed");
    const onEligibilityChange = vi.fn();

    const { unmount } = render(
      <GooglePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={onEligibilityChange}
        totalLabel="$25.98"
      />,
    );

    await waitFor(() =>
      expect(onEligibilityChange).toHaveBeenLastCalledWith("ineligible"),
    );
    unmount();
    expect(paypalMockState.handleDestroy).toHaveBeenCalledTimes(1);
  });
});

function setApplePayAvailability(canMakePayments: boolean) {
  Object.defineProperty(window, "ApplePaySession", {
    configurable: true,
    value: {
      canMakePayments: () => canMakePayments,
    },
  });
}

function StatefulGoogleProbeHarness() {
  const [state, setState] = useState<"eligible" | "ineligible" | "pending">(
    "pending",
  );

  return (
    <>
      <GooglePayPreselectionProbe
        currencyCode="USD"
        onEligibilityChange={setState}
        totalLabel="$25.98"
      />
      <span>{state}</span>
    </>
  );
}

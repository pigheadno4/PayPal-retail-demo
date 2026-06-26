// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError, createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import { DeliveryExpressAction } from "./DeliveryExpressAction.js";
import {
  PayLaterAmountMessage,
  PayLaterStandaloneAction,
} from "./PayLaterStandaloneAction.js";
import { PayPalStandaloneAction } from "./PayPalStandaloneAction.js";

const paypalSdkMockState = vi.hoisted(() => ({
  payLaterMessageFetchCalls: 0,
  payLaterMessageContent: null as Record<string, unknown> | null,
  payLaterMessageError: null as Error | null,
  payLaterMessageReady: false,
}));

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
    error: paypalSdkMockState.payLaterMessageError,
    handleCreateLearnMore: vi.fn(),
    handleFetchContent: vi.fn(
      (options: { onReady?: (content: unknown) => void }) => {
        paypalSdkMockState.payLaterMessageFetchCalls += 1;
        const content = paypalSdkMockState.payLaterMessageContent;

        if (content) {
          options.onReady?.(content);
        }

        return Promise.resolve(content);
      },
    ),
    isReady: paypalSdkMockState.payLaterMessageReady,
  }),
}));

beforeEach(() => {
  paypalSdkMockState.payLaterMessageFetchCalls = 0;
  paypalSdkMockState.payLaterMessageContent = null;
  paypalSdkMockState.payLaterMessageError = null;
  paypalSdkMockState.payLaterMessageReady = false;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  delete (HTMLElement.prototype as HTMLElement & { setContent?: unknown })
    .setContent;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("payment action failure handling", () => {
  it("logs structured delivery express diagnostics when create-order fails", async () => {
    const user = userEvent.setup();
    const infoSpy = vi.spyOn(console, "info");
    const errorSpy = vi.spyOn(console, "error");

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
    expect(await screen.findByRole("alert")).toBeTruthy();

    expect(infoSpy).toHaveBeenCalledWith(
      "[paypal-retail-demo] Delivery express create-order starting",
      {
        cartPublicId: "cart_public_guest",
        currencyCode: "USD",
        hasAuthHeader: false,
        hasCartClientSecret: true,
        market: "US",
        method: "paypal",
        source: "cart",
        totalLabel: "$25.98",
      },
    );
    expect(errorSpy).toHaveBeenCalledWith(
      "[paypal-retail-demo] Delivery express create-order failed",
      expect.objectContaining({
        cartPublicId: "cart_public_guest",
        code: "PAYPAL_ORDER_CREATE_UNAVAILABLE",
        debugId: "dbg_paypal_down",
        method: "paypal",
        source: "cart",
        stage: "api_create_order",
      }),
    );
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain(
      "cart_secret_guest",
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      "cart_secret_guest",
    );
  });

  it("uses modal presentation for PayPal and Pay Later buyer actions so demo flows do not depend on popups", () => {
    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
        <PayPalStandaloneAction
          checkoutDraftId="draft_delivery_123"
          fulfillmentMode="delivery"
          market="US"
        />
        <PayLaterStandaloneAction
          buyerCountry="US"
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          totalLabel="$25.98"
        />
        <DeliveryExpressAction
          cartClientSecret="cart_secret_guest"
          cartPublicId="cart_public_guest"
          currencyCode="USD"
          market="US"
          method="paypal"
          source="cart"
          totalLabel="$25.98"
        />
        <DeliveryExpressAction
          cartClientSecret="cart_secret_guest"
          cartPublicId="cart_public_guest"
          currencyCode="USD"
          market="US"
          method="paylater"
          source="cart"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    const paymentButtons = screen.getAllByRole("button", {
      name: "Mock PayPal",
    });

    expect(paymentButtons).toHaveLength(4);
    paymentButtons.forEach((button) => {
      expect(button.getAttribute("data-presentation-mode")).toBe("modal");
    });
  });

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

  it("uses refreshed cart binding returned before delivery express create-order", async () => {
    const user = userEvent.setup();
    const requests: Array<{
      readonly body: unknown;
      readonly headers: Record<string, string>;
    }> = [];

    render(
      <AppProviders apiClient={createRecordingCreateOrderApiClient(requests)}>
        <DeliveryExpressAction
          cartClientSecret="cart_secret_stale"
          cartPublicId="cart_public_stale"
          currencyCode="USD"
          market="US"
          method="paypal"
          onBeforeCreateOrder={async () => ({
            cartClientSecret: "cart_secret_fresh",
            cartPublicId: "cart_public_fresh",
          })}
          source="cart"
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));

    expect(requests).toEqual([
      {
        body: {
          cart_id: "cart_public_fresh",
          method: "paypal",
        },
        headers: {
          "content-type": "application/json",
          "x-cart-id": "cart_public_fresh",
          "x-cart-secret": "cart_secret_fresh",
        },
      },
    ]);
    expect(screen.queryByRole("alert")).toBeNull();
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

  it("notifies the checkout PayPal approval handler with the created payment session", async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();

    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
        <PayPalStandaloneAction
          checkoutDraftId="draft_delivery_123"
          fulfillmentMode="delivery"
          market="US"
          onApproved={onApproved}
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));
    await waitFor(() => {
      expect(onApproved).toHaveBeenCalledWith({
        fulfillmentMode: "delivery",
        method: "paypal",
        paypalOrderId: "PAYPAL-ORDER-123",
        paymentSessionId: "payment_session_123",
      });
    });
  });

  it("notifies the checkout Pay Later approval handler with the created payment session", async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();

    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
        <PayLaterStandaloneAction
          buyerCountry="US"
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          onApproved={onApproved}
          totalLabel="$25.98"
        />
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Mock PayPal" }));
    await waitFor(() => {
      expect(onApproved).toHaveBeenCalledWith({
        fulfillmentMode: "delivery",
        method: "paylater",
        paypalOrderId: "PAYPAL-ORDER-123",
        paymentSessionId: "payment_session_123",
      });
    });
  });

  it("keeps fallback Pay Later messaging visible when official message content fails", () => {
    paypalSdkMockState.payLaterMessageError = new Error(
      "presentment unavailable",
    );

    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
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

    expect(document.querySelector("paypal-message")).toBeTruthy();
    expect(
      document.querySelector(".paylater-amount-message__fallback")?.textContent,
    ).toBe(
      "Pay Later messaging is temporarily unavailable for $25.98. Select Pay Later to review PayPal-hosted options and terms.",
    );
    expect(
      screen.getAllByText(
        "Pay Later messaging is temporarily unavailable for $25.98. Select Pay Later to review PayPal-hosted options and terms.",
      ).length,
    ).toBeTruthy();
  });

  it("keeps the official Pay Later message when content applies before readable DOM paints", async () => {
    vi.useFakeTimers();
    const setContent = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "setContent", {
      configurable: true,
      value: setContent,
    });
    paypalSdkMockState.payLaterMessageContent = {
      message: "official content",
    };
    paypalSdkMockState.payLaterMessageReady = true;

    render(
      <AppProviders apiClient={createSuccessfulApiClient()}>
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

    await act(async () => {
      await Promise.resolve();
    });
    expect(setContent).toHaveBeenCalledWith({
      message: "official content",
    });
    act(() => {
      vi.advanceTimersByTime(1201);
    });

    expect(
      document.querySelector(".paylater-amount-message__fallback")?.textContent,
    ).toBeUndefined();
  });

  it("applies official Pay Later content for storefront message placements", async () => {
    paypalSdkMockState.payLaterMessageReady = true;
    paypalSdkMockState.payLaterMessageContent = {
      message: "official content",
    };
    const setContent = vi.fn();
    Object.defineProperty(HTMLElement.prototype, "setContent", {
      configurable: true,
      value: setContent,
    });

    render(
      <PayLaterAmountMessage
        amountLabel="$69.68"
        buyerCountry="US"
        currencyCode="USD"
        placement="minicart-summary"
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(paypalSdkMockState.payLaterMessageFetchCalls).toBe(1);
    expect(setContent).toHaveBeenCalledWith({
      message: "official content",
    });
    expect(document.querySelector("paypal-message")).toBeTruthy();
    expect(
      document.querySelector(".paylater-amount-message__fallback"),
    ).toBeNull();
  });
});

function MockPayPalButton({
  createOrder,
  onApprove,
  onError,
  presentationMode,
}: {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly onApprove?: (data: {
    readonly orderId: string;
    readonly payerId: string;
  }) => Promise<void> | void;
  readonly onError?: (error: {
    readonly code: string;
    readonly isRecoverable: boolean;
    readonly message: string;
  }) => void;
  readonly presentationMode?: string;
}) {
  return (
    <button
      data-presentation-mode={presentationMode}
      onClick={() => {
        void createOrder()
          .then(async ({ orderId }) => {
            await onApprove?.({
              orderId,
              payerId: "PAYER-123",
            });
          })
          .catch((error: unknown) => {
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
            payment_session_id: "payment_session_123",
          },
          debug_id: "dbg_success",
        }),
      }) as Response,
  });
}

function createRecordingCreateOrderApiClient(
  requests: Array<{
    readonly body: unknown;
    readonly headers: Record<string, string>;
  }>,
) {
  return createApiClient({
    baseUrl: "https://demo.example.test",
    fetch: async (_url, init) => {
      requests.push({
        body:
          typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
      });

      return {
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            paypal_order_id: "PAYPAL-ORDER-123",
          },
          debug_id: "dbg_success",
        }),
      } as Response;
    },
  });
}

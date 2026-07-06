// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  ApiClient,
  ApiQueryParams,
  ApiRequestOptions,
} from "../api/client.js";
import type { BuyerAuthClient } from "../features/account/authClient.js";
import type { CartData } from "../features/cart/cartModel.js";
import {
  defaultCheckoutPageData,
  type CheckoutPageData,
  type CheckoutPaymentReadiness,
} from "../features/checkout/CheckoutPage.js";
import { App } from "./App.js";

const cardFieldsMockState = vi.hoisted(() => ({
  submit: vi.fn<(orderId: string) => Promise<void>>(() => Promise.resolve()),
}));
const paypalButtonMockState = vi.hoisted(() => ({
  createOrderCallbacks: vi.fn<() => void>(),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  function MockPayPalButton({
    createOrder,
    onApprove,
    presentationMode,
  }: {
    readonly createOrder: () => Promise<{ readonly orderId: string }>;
    readonly onApprove?: (data: {
      readonly orderId: string;
      readonly payerId: string;
    }) => Promise<void> | void;
    readonly presentationMode?: string;
  }) {
    return (
      <button
        data-presentation-mode={presentationMode}
        onClick={() => {
          paypalButtonMockState.createOrderCallbacks();
          void createOrder().then(async ({ orderId }) => {
            await onApprove?.({
              orderId,
              payerId: "PAYER-CHECKOUT",
            });
          });
        }}
        type="button"
      >
        Mock PayPal
      </button>
    );
  }

  return {
    INSTANCE_LOADING_STATE: {
      PENDING: "pending",
      REJECTED: "rejected",
    },
    PayLaterOneTimePaymentButton: MockPayPalButton,
    PayPalCardCvvField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-cvv" />,
    PayPalCardExpiryField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-expiry" />,
    PayPalCardFieldsProvider: ({
      children,
    }: {
      readonly children: ReactNode;
    }) => <div data-testid="card-fields-provider">{children}</div>,
    PayPalCardNumberField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-number" />,
    PayPalOneTimePaymentButton: MockPayPalButton,
    PayPalProvider: ({ children }: { readonly children: ReactNode }) => (
      <div data-testid="mock-paypal-provider">{children}</div>
    ),
    usePayPalCardFieldsOneTimePaymentSession: () => {
      const [submitResponse, setSubmitResponse] = React.useState<{
        readonly state: "succeeded";
        readonly data: {
          readonly orderId: string;
          readonly liabilityShift?: string | null;
          readonly message?: string | null;
        };
      } | null>(null);

      return {
        error: null,
        submit: async (orderId: string) => {
          await cardFieldsMockState.submit(orderId);
          setSubmitResponse({
            state: "succeeded",
            data: {
              orderId,
              liabilityShift: "NO",
            },
          });
        },
        submitResponse,
      };
    },
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
    usePayPal: () => ({
      loadingStatus: "resolved",
    }),
    usePayPalMessages: () => ({
      error: null,
    }),
  };
});

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

beforeAll(() => {
  globalThis.ResizeObserver =
    TestResizeObserver as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  cardFieldsMockState.submit.mockReset();
  cardFieldsMockState.submit.mockResolvedValue(undefined);
  paypalButtonMockState.createOrderCallbacks.mockReset();
  setCheckoutMobileViewport(false);
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  cleanup();
});

describe("App checkout PayPal capture", () => {
  it("keeps payment-ready checkout neutral until a method is selected", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
    expect(
      (
        within(paymentStep).getByRole("radio", {
          name: /PayPal/,
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(screen.queryByRole("button", { name: "Mock PayPal" })).toBeNull();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("captures approved checkout PayPal orders and shows confirmation", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/paypal/orders/express-review": expressReviewApiResponse(),
      },
      getResponses: [
        cartApiResponse({ quantity: 1 }),
        emptyCartApiResponse({
          cartClientSecret: "cart_secret_after_capture",
          cartPublicId: "cart_public_after_capture",
        }),
      ],
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000009",
          payment_session_id: "payment_session_checkout",
          paypal_order_id: "PAYPAL_ORDER_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-checkout",
        },
        "/api/paypal/orders/PAYPAL_ORDER_CHECKOUT/capture":
          captureApiResponse(),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    await user.click(screen.getByRole("radio", { name: /PayPal/ }));

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    const paypalButton = await within(orderSummary).findByRole("button", {
      name: "Mock PayPal",
    });

    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();

    await user.click(paypalButton);

    await waitFor(() => {
      expect(paypalButtonMockState.createOrderCallbacks).toHaveBeenCalledTimes(
        1,
      );
      expect(
        countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
      ).toBe(1);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            checkout_draft_id: "11111111-1111-4111-8111-111111111111",
            method: "paypal",
          },
          method: "post",
          path: "/api/paypal/orders/delivery",
          query: {
            market: "US",
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/paypal/orders/express-review",
          query: expect.objectContaining({
            market: "US",
            paypal_order_id: "PAYPAL_ORDER_CHECKOUT",
            payment_session_id: "payment_session_checkout",
          }),
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/paypal/orders/PAYPAL_ORDER_CHECKOUT/capture",
          query: {
            market: "US",
          },
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
    expect(screen.getByText("PAYPAL_CAPTURE_CHECKOUT")).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/checkout/express-review");
    expect(
      screen.getByRole("button", { name: "Open minicart" }).textContent,
    ).toContain("0");
  });

  it("creates exactly one selected Pay Later order from the current checkout draft", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/paypal/orders/express-review": expressReviewApiResponse({
          paymentMethodLabel: "Pay Later",
          paymentSessionId: "payment_session_paylater_checkout",
          paypalOrderId: "PAYPAL_ORDER_PAYLATER_CHECKOUT",
        }),
      },
      getResponses: [
        cartApiResponse({ quantity: 1 }),
        emptyCartApiResponse({
          cartClientSecret: "cart_secret_after_paylater_capture",
          cartPublicId: "cart_public_after_paylater_capture",
        }),
      ],
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000011",
          payment_session_id: "payment_session_paylater_checkout",
          paypal_order_id: "PAYPAL_ORDER_PAYLATER_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-paylater-checkout",
        },
        "/api/paypal/orders/PAYPAL_ORDER_PAYLATER_CHECKOUT/capture":
          captureApiResponse({
            paymentSessionId: "payment_session_paylater_checkout",
            paypalOrderId: "PAYPAL_ORDER_PAYLATER_CHECKOUT",
          }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Pay Later/,
      }),
    );

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    const payLaterButton = await within(orderSummary).findByRole("button", {
      name: "Mock PayPal",
    });

    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();

    await user.click(payLaterButton);

    await waitFor(() => {
      expect(paypalButtonMockState.createOrderCallbacks).toHaveBeenCalledTimes(
        1,
      );
      expect(
        countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
      ).toBe(1);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            checkout_draft_id: "11111111-1111-4111-8111-111111111111",
            method: "paylater",
          },
          method: "post",
          path: "/api/paypal/orders/delivery",
          query: {
            market: "US",
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/paypal/orders/PAYPAL_ORDER_PAYLATER_CHECKOUT/capture",
          query: {
            market: "US",
          },
        }),
      );
    });
  });

  it.each([
    [
      "recalculating",
      "Payment is recalculating",
      "Updated totals are syncing before payment.",
    ],
    [
      "failed",
      "Payment needs refresh",
      "Refresh checkout details before continuing.",
    ],
  ] as const)(
    "withholds checkout provider requests and callbacks while mapped readiness is %s",
    async (state, title, body) => {
      const user = userEvent.setup();
      const apiClient = createRecordingApiClient({
        postResponseByPath: {
          "/api/paypal/orders/delivery": {
            merchant_order_id: "DO-20260624-000017",
            payment_session_id: "payment_session_readiness_blocked_checkout",
            paypal_order_id: "PAYPAL_ORDER_READINESS_BLOCKED_CHECKOUT",
            paypal_order_status: "CREATED",
            paypal_request_id: "request-create-readiness-blocked-checkout",
          },
        },
      });

      render(
        <App
          apiClient={apiClient}
          authClient={createNullAuthClient()}
          initialCart={singleItemCart({ quantity: 1 })}
          initialPathname="/checkout"
          initialCheckout={checkoutWithOpenPaymentReadiness({
            state,
          })}
        />,
      );

      const paymentStep = getStep("Payment method");
      const paypalRadio = within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }) as HTMLInputElement;
      await user.click(paypalRadio);
      const orderSummary = screen.getByRole("complementary", {
        name: "Order summary",
      });

      await waitFor(() => {
        expect(paypalRadio.checked).toBe(true);
        expect(within(orderSummary).getByText(title)).toBeTruthy();
        expect(within(orderSummary).getByText(body)).toBeTruthy();
      });
      expect(screen.queryByRole("button", { name: "Mock PayPal" })).toBeNull();
      expect(queryCheckoutStickyPaymentAction()).toBeNull();
      expect(
        countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
      ).toBe(0);
      expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
    },
  );

  it("suspends mobile sticky provider requests and callbacks while an upstream input is focused", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000018",
          payment_session_id: "payment_session_focused_input_checkout",
          paypal_order_id: "PAYPAL_ORDER_FOCUSED_INPUT_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-focused-input-checkout",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();

    const billingStep = getStep("Billing address");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Edit billing address",
      }),
    );
    await user.click(within(billingStep).getByLabelText("Same as shipping"));
    const billingStreetInput = within(billingStep).getByLabelText(
      "Billing street address",
    );
    await user.click(billingStreetInput);

    expect(document.activeElement).toBe(billingStreetInput);
    expect(queryCheckoutStickyPaymentAction()).toBeNull();
    expect(getCheckoutStickyChoosePaymentButton().disabled).toBe(true);
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("suspends the mobile sticky provider action while the mobile menu is open", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000012",
          payment_session_id: "payment_session_suspended_checkout",
          paypal_order_id: "PAYPAL_ORDER_SUSPENDED_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-suspended-checkout",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Open mobile menu" }));

    expect(
      screen.getByRole("navigation", { name: "Mobile menu" }),
    ).toBeTruthy();
    expect(queryCheckoutStickySummary()).toBeNull();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("suspends the mobile sticky provider action while the minicart sheet is open", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000013",
          payment_session_id: "payment_session_minicart_suspended_checkout",
          paypal_order_id: "PAYPAL_ORDER_MINICART_SUSPENDED_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-minicart-suspended-checkout",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Open minicart" }));

    expect(screen.getByLabelText("Minicart")).toBeTruthy();
    expect(queryCheckoutStickySummary()).toBeNull();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("suspends the mobile sticky provider action while the sign-in dialog is open", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000014",
          payment_session_id: "payment_session_auth_suspended_checkout",
          paypal_order_id: "PAYPAL_ORDER_AUTH_SUSPENDED_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-auth-suspended-checkout",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("dialog", { name: "Sign in" })).toBeTruthy();
    expect(queryCheckoutStickySummary()).toBeNull();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("creates one mobile sheet order only after reviewing details and tapping the provider action", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/paypal/orders/express-review": expressReviewApiResponse({
          paymentSessionId: "payment_session_sheet_checkout",
          paypalOrderId: "PAYPAL_ORDER_SHEET_CHECKOUT",
        }),
      },
      getResponses: [
        cartApiResponse({ quantity: 1 }),
        emptyCartApiResponse({
          cartClientSecret: "cart_secret_after_sheet_capture",
          cartPublicId: "cart_public_after_sheet_capture",
        }),
      ],
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000015",
          payment_session_id: "payment_session_sheet_checkout",
          paypal_order_id: "PAYPAL_ORDER_SHEET_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-sheet-checkout",
        },
        "/api/paypal/orders/PAYPAL_ORDER_SHEET_CHECKOUT/capture":
          captureApiResponse({
            paymentSessionId: "payment_session_sheet_checkout",
            paypalOrderId: "PAYPAL_ORDER_SHEET_CHECKOUT",
          }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);

    await user.click(
      within(getCheckoutStickySummary()).getByRole("button", {
        name: "Review order details",
      }),
    );

    const orderDetailsSheet = await screen.findByRole("dialog", {
      name: "Order details",
    });
    expect(queryCheckoutStickyPaymentAction()).toBeNull();
    expect(orderDetailsSheet.textContent).toContain("1 item - Ground delivery");
    const sheetPayPalButton = await within(orderDetailsSheet).findByRole(
      "button",
      {
        name: "Mock PayPal",
      },
    );
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();

    await user.click(sheetPayPalButton);

    await waitFor(() => {
      expect(paypalButtonMockState.createOrderCallbacks).toHaveBeenCalledTimes(
        1,
      );
      expect(
        countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
      ).toBe(1);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            checkout_draft_id: "11111111-1111-4111-8111-111111111111",
            method: "paypal",
          },
          method: "post",
          path: "/api/paypal/orders/delivery",
          query: {
            market: "US",
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/paypal/orders/PAYPAL_ORDER_SHEET_CHECKOUT/capture",
          query: {
            market: "US",
          },
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
  });

  it("does not create mobile provider orders when the reviewed sheet is opened and closed without payment", async () => {
    setCheckoutMobileViewport(true);
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000016",
          payment_session_id: "payment_session_sheet_closed_checkout",
          paypal_order_id: "PAYPAL_ORDER_SHEET_CLOSED_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-sheet-closed-checkout",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);
    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /PayPal/,
      }),
    );

    await user.click(
      within(getCheckoutStickySummary()).getByRole("button", {
        name: "Review order details",
      }),
    );
    const orderDetailsSheet = await screen.findByRole("dialog", {
      name: "Order details",
    });

    await user.click(
      within(orderDetailsSheet).getByRole("button", {
        name: "Close order details",
      }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Order details" }),
      ).toBeNull();
    });
    expect(queryCheckoutStickyPaymentAction()).toBeTruthy();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
  });

  it("captures approved checkout card field orders and shows confirmation", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/paypal/orders/express-review": expressReviewApiResponse({
          paymentMethodLabel: "card payment",
          paymentSessionId: "payment_session_card_checkout",
          paypalOrderId: "PAYPAL_ORDER_CARD_CHECKOUT",
        }),
      },
      getResponses: [
        cartApiResponse({ quantity: 1 }),
        emptyCartApiResponse({
          cartClientSecret: "cart_secret_after_card_capture",
          cartPublicId: "cart_public_after_card_capture",
        }),
      ],
      patchResponse: checkoutDraftApiResponse(),
      postResponseByPath: {
        "/api/checkout/drafts": checkoutDraftApiResponse(),
        "/api/paypal/orders/delivery": {
          merchant_order_id: "DO-20260624-000010",
          payment_session_id: "payment_session_card_checkout",
          paypal_order_id: "PAYPAL_ORDER_CARD_CHECKOUT",
          paypal_order_status: "CREATED",
          paypal_request_id: "request-create-card-checkout",
        },
        "/api/paypal/orders/PAYPAL_ORDER_CARD_CHECKOUT/capture":
          captureApiResponse({
            paymentSessionId: "payment_session_card_checkout",
            paypalOrderId: "PAYPAL_ORDER_CARD_CHECKOUT",
          }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={createNullAuthClient()}
        initialCart={singleItemCart({ quantity: 1 })}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);

    const paymentStep = getStep("Payment method");
    await user.click(
      within(paymentStep).getByRole("radio", {
        name: /Credit or debit card/,
      }),
    );
    expect(
      document.querySelector(".checkout-sticky-summary [data-payment-method]"),
    ).toBeNull();
    expect(
      within(paymentStep).getByRole("button", {
        name: "Pay by card",
      }),
    ).toBeTruthy();
    expect(
      countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
    ).toBe(0);
    expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();

    await user.click(
      await within(paymentStep).findByRole("button", {
        name: "Pay by card",
      }),
    );

    await waitFor(() => {
      expect(cardFieldsMockState.submit).toHaveBeenCalledWith(
        "PAYPAL_ORDER_CARD_CHECKOUT",
      );
      expect(paypalButtonMockState.createOrderCallbacks).not.toHaveBeenCalled();
      expect(
        countCreateOrderRequests(apiClient, "/api/paypal/orders/delivery"),
      ).toBe(1);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: expect.objectContaining({
            checkout_draft_id: "11111111-1111-4111-8111-111111111111",
            method: "card",
          }),
          method: "post",
          path: "/api/paypal/orders/delivery",
          query: {
            market: "US",
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/paypal/orders/express-review",
          query: expect.objectContaining({
            market: "US",
            paypal_order_id: "PAYPAL_ORDER_CARD_CHECKOUT",
            payment_session_id: "payment_session_card_checkout",
          }),
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/paypal/orders/PAYPAL_ORDER_CARD_CHECKOUT/capture",
          query: {
            market: "US",
          },
        }),
      );
    });

    expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
    expect(screen.getByText("PAYPAL_CAPTURE_CHECKOUT")).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/checkout/express-review");
    expect(
      screen.getByRole("button", { name: "Open minicart" }).textContent,
    ).toContain("0");
  });
});

async function advanceDeliveryCheckoutToPayment(
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

function getStep(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const step = heading.closest("article");

  if (!step) {
    throw new Error(`Could not find checkout step for ${title}`);
  }

  return step;
}

function getCheckoutStickySummary(): HTMLElement {
  const summary = queryCheckoutStickySummary();

  if (!summary) {
    throw new Error("Expected checkout sticky summary to be mounted");
  }

  return summary as HTMLElement;
}

function queryCheckoutStickySummary(): Element | null {
  return document.querySelector(".checkout-sticky-summary");
}

function queryCheckoutStickyPaymentAction(): Element | null {
  return document.querySelector(
    ".checkout-sticky-summary [data-payment-method]",
  );
}

function getCheckoutStickyChoosePaymentButton(): HTMLButtonElement {
  const button = document.querySelector(
    ".checkout-sticky-summary__choose-payment",
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error("Expected checkout sticky summary to show Choose payment");
  }

  return button;
}

async function waitForStepState(step: HTMLElement, state: string) {
  await waitFor(() => {
    expect(step.getAttribute("data-step-state")).toBe(state);
  });
}

function setCheckoutMobileViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) =>
      ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }) as MediaQueryList,
  });
}

function countCreateOrderRequests(
  apiClient: { readonly calls: readonly RecordingApiCall[] },
  path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis",
) {
  return apiClient.calls.filter(
    (call) => call.method === "post" && call.path === path,
  ).length;
}

function createRecordingApiClient(
  input: RecordingApiClientInput = {},
): ApiClient & { readonly calls: RecordingApiCall[] } {
  const calls: RecordingApiCall[] = [];
  let getResponseIndex = 0;

  return {
    calls,
    async delete<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "delete", path, query, options });
      return {} as TData;
    },
    async get<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "get", path, query, options });
      if (path === "/api/paypal/sdk-config") {
        return sdkConfigApiResponse(query) as TData;
      }
      if (input.getResponseByPath && path in input.getResponseByPath) {
        return input.getResponseByPath[path] as TData;
      }
      if (input.getResponses?.length) {
        const response =
          input.getResponses[
            Math.min(getResponseIndex, input.getResponses.length - 1)
          ];
        getResponseIndex += 1;
        return response as TData;
      }
      return {} as TData;
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "patch", path, body, query, options });
      return (input.patchResponse ?? {}) as TData;
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "post", path, body, query, options });
      if (input.postResponseByPath && path in input.postResponseByPath) {
        return input.postResponseByPath[path] as TData;
      }
      return (input.postResponse ?? {}) as TData;
    },
  };
}

interface RecordingApiCall {
  readonly method: "delete" | "get" | "patch" | "post";
  readonly path: string;
  readonly body?: unknown;
  readonly query?: ApiQueryParams | undefined;
  readonly options?: ApiRequestOptions | undefined;
}

interface RecordingApiClientInput {
  readonly getResponseByPath?: Readonly<Record<string, unknown>>;
  readonly getResponses?: readonly unknown[];
  readonly patchResponse?: unknown;
  readonly postResponse?: unknown;
  readonly postResponseByPath?: Readonly<Record<string, unknown>>;
}

function createNullAuthClient(): BuyerAuthClient {
  return {
    async getSession() {
      return null;
    },
    async signInWithPassword() {
      throw new Error("sign-in not used in this test");
    },
    async signUpWithPassword() {
      throw new Error("sign-up not used in this test");
    },
  };
}

function singleItemCart({
  cartClientSecret = "cart_secret_existing",
  quantity,
}: {
  readonly cartClientSecret?: string | null;
  readonly quantity: number;
}): CartData {
  return {
    cartPublicId: "cart_public_existing",
    ...(cartClientSecret ? { cartClientSecret } : {}),
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: "USD",
    locale: "en-US",
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [
      {
        id: "cart_item_labubu",
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        unitPriceCents: 1399,
        currentPriceLabel: "$13.99",
        regularPriceLabel: "$15.99",
        quantity,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
      },
    ],
  };
}

function sdkConfigApiResponse(query?: ApiQueryParams) {
  const method = String(query?.method ?? "paypal");
  const components =
    method === "paylater"
      ? ["paypal-payments", "paypal-messages"]
      : method === "card"
        ? ["card-fields"]
        : ["paypal-payments"];

  return {
    client_id: "PAYPAL_PUBLIC_CLIENT_ID",
    environment: "sandbox",
    sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    paylater_buyer_country: "US",
    sandbox_test_buyer_country: "US",
    components,
    page_type: "checkout",
    provider_key: `paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:${components.join(",")}`,
    needs_client_token: false,
  };
}

function cartApiResponse({ quantity }: { readonly quantity: number }) {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: "cart_public_existing",
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: "guest",
      status: "active",
      currency_code: "USD",
      items: [
        {
          id: "cart_item_labubu",
          product_id: "product_labubu",
          slug: "labubu-have-a-seat",
          name: "Labubu Have a Seat",
          image_path: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          quantity,
          unit_price_minor: 1399,
          line_subtotal_minor: 1399 * quantity,
          checkout_eligible: true,
        },
      ],
      totals: {
        item_count: quantity,
        subtotal_minor: 1399 * quantity,
        currency_code: "USD",
      },
      binding: {
        cart_public_id: "cart_public_existing",
        cart_client_secret: "cart_secret_existing",
      },
    },
    adjustments: [],
  };
}

function emptyCartApiResponse({
  cartClientSecret,
  cartPublicId,
}: {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
}) {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: cartPublicId,
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: "guest",
      status: "active",
      currency_code: "USD",
      items: [],
      totals: {
        item_count: 0,
        subtotal_minor: 0,
        currency_code: "USD",
      },
      binding: {
        cart_public_id: cartPublicId,
        cart_client_secret: cartClientSecret,
      },
    },
    adjustments: [],
  };
}

function checkoutWithOpenPaymentReadiness(
  paymentReadiness: CheckoutPaymentReadiness,
): CheckoutPageData {
  const paymentStep = defaultCheckoutPageData.delivery.steps.find(
    (step) => step.id === "payment-method",
  );

  if (!paymentStep) {
    throw new Error("Default checkout data is missing the payment step");
  }

  return {
    ...defaultCheckoutPageData,
    delivery: {
      ...defaultCheckoutPageData.delivery,
      checkoutDraftId: "11111111-1111-4111-8111-111111111111",
      paymentReadiness,
      steps: [
        {
          ...paymentStep,
          state: "editing",
        },
        ...defaultCheckoutPageData.delivery.steps.filter(
          (step) => step.id !== "payment-method",
        ),
      ],
    },
  };
}

function checkoutDraftApiResponse({
  paymentReadiness,
}: {
  readonly paymentReadiness?: {
    readonly state: "ready" | "syncing" | "recalculating" | "stale" | "failed";
    readonly title?: string;
    readonly body?: string;
  };
} = {}) {
  return {
    draft: {
      id: "11111111-1111-4111-8111-111111111111",
      cart_id: "cart_guest_us",
      fulfillment_mode: "delivery",
      status: "draft",
      active_step: "shipping_option",
      ...(paymentReadiness ? { payment_readiness: paymentReadiness } : {}),
      delivery: {
        shipping_address: null,
        billing_address: null,
        same_as_shipping: true,
        shipping_options: [
          {
            id: "ship_standard",
            service_code: "standard",
            display_name: "Standard shipping",
            amount_minor: 500,
            estimated_days_min: 4,
            estimated_days_max: 6,
          },
        ],
        selected_shipping_option_id: "ship_standard",
      },
      summary: {
        item_count: 1,
        merchandise_subtotal_minor: 1399,
        discount_minor: 0,
        tax_minor: 115,
        shipping_minor: 500,
        total_minor: 2014,
        currency_code: "USD",
      },
      promo: {
        status: "none",
        recommended_codes: [],
        selected_codes: [],
      },
    },
  };
}

function expressReviewApiResponse(
  input: {
    readonly paymentMethodLabel?: string;
    readonly paymentSessionId?: string;
    readonly paypalOrderId?: string;
  } = {},
) {
  return {
    source_label: "Delivery checkout",
    order_number: "DO-20260624-000009",
    payment_session_id: input.paymentSessionId ?? "payment_session_checkout",
    paypal_order_id: input.paypalOrderId ?? "PAYPAL_ORDER_CHECKOUT",
    payment_method_label: input.paymentMethodLabel ?? "PayPal",
    status_label: "Payment session synchronized",
    shipping_address: {
      name: "Taylor Chen",
      address_line1: "100 Market St",
      address_line2: "Unit 8, San Francisco, CA 94105",
      country_code: "US",
    },
    shipping_option: {
      label: "Standard shipping",
      detail: "Arrives in 4-6 business days",
      amount_minor: 500,
      currency_code: "USD",
    },
    items: [
      {
        id: "order_item_checkout_1",
        name: "Labubu Have a Seat",
        detail: "POP-LABUBU-001 - Qty 1",
        amount_minor: 1399,
        currency_code: "USD",
      },
    ],
    totals: {
      merchandise_subtotal_minor: 1399,
      shipping_minor: 500,
      promo_discount_minor: 0,
      tax_minor: 115,
      total_minor: 2014,
      currency_code: "USD",
    },
    amount_guard: {
      action: "allow_capture",
      status: "matched",
      can_capture: true,
      tolerance_minor: 0,
      mismatches: [],
    },
  };
}

function captureApiResponse(
  input: {
    readonly paymentSessionId?: string;
    readonly paypalOrderId?: string;
  } = {},
) {
  return {
    order_number: "DO-20260624-000009",
    payment_session_id: input.paymentSessionId ?? "payment_session_checkout",
    paypal_order_id: input.paypalOrderId ?? "PAYPAL_ORDER_CHECKOUT",
    paypal_capture_id: "PAYPAL_CAPTURE_CHECKOUT",
    paypal_order_status: "COMPLETED",
    paypal_capture_status: "COMPLETED",
    paypal_request_id: "request-capture-checkout",
    amount_guard: {
      action: "allow_capture",
      status: "matched",
      can_capture: true,
      tolerance_minor: 0,
      mismatches: [],
    },
  };
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();

  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

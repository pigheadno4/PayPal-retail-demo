// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import {
  PayPalSdkProviderScope,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";
import {
  CardFieldsCheckoutAction,
  buildCardFieldsCreateOrderRequest,
} from "./CardFieldsCheckoutAction.js";

const cardFieldsMockState = vi.hoisted(() => ({
  error: null as Error | null,
  submit: vi.fn<(orderId: string) => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    INSTANCE_LOADING_STATE: {
      PENDING: "pending",
      REJECTED: "rejected",
      RESOLVED: "resolved",
    },
    PayPalProvider: ({ children }: { readonly children: React.ReactNode }) => (
      <div data-testid="paypal-provider">{children}</div>
    ),
    PayPalCardFieldsProvider: ({
      children,
    }: {
      readonly children: React.ReactNode;
    }) => <div data-testid="card-fields-provider">{children}</div>,
    PayPalCardNumberField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-number" />,
    PayPalCardExpiryField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-expiry" />,
    PayPalCardCvvField: ({
      containerClassName,
    }: {
      readonly containerClassName?: string;
    }) => <div className={containerClassName} data-testid="card-cvv" />,
    usePayPalCardFieldsOneTimePaymentSession: () => {
      const [submitResponse, setSubmitResponse] = React.useState<{
        readonly state: "succeeded" | "failed" | "canceled";
        readonly data: {
          readonly orderId: string;
          readonly liabilityShift?: string | null;
          readonly message?: string | null;
        };
      } | null>(null);

      return {
        error: cardFieldsMockState.error,
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
    usePayPal: () => ({
      loadingStatus: "resolved",
    }),
  };
});

beforeEach(() => {
  cardFieldsMockState.error = null;
  cardFieldsMockState.submit.mockReset();
  cardFieldsMockState.submit.mockResolvedValue(undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CardFieldsCheckoutAction", () => {
  it("builds the delivery create-order request used by card fields", () => {
    expect(
      buildCardFieldsCreateOrderRequest({
        checkoutDraftId: "draft_delivery_123",
        fulfillmentMode: "delivery",
        market: "US",
        vaultRequested: false,
      }),
    ).toEqual({
      path: "/api/paypal/orders/delivery",
      body: {
        checkout_draft_id: "draft_delivery_123",
        method: "card",
        vault_requested: false,
      },
      query: {
        market: "US",
      },
    });
  });

  it("builds the pickup create-order request used by card fields with save-for-future opt-in", () => {
    expect(
      buildCardFieldsCreateOrderRequest({
        checkoutDraftId: "draft_pickup_123",
        fulfillmentMode: "pickup",
        market: "GB",
        vaultRequested: true,
      }),
    ).toEqual({
      path: "/api/paypal/orders/bopis",
      body: {
        checkout_draft_id: "draft_pickup_123",
        method: "card",
        vault_requested: true,
      },
      query: {
        market: "GB",
      },
    });
  });

  it("renders hosted card fields with the save checkbox and pay button inside the card box", () => {
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        ({
          status: 200,
          json: async () => ({ ok: true, data: {}, debug_id: "dbg_test" }),
        }) as Response,
    });

    const html = renderToStaticMarkup(
      <AppProviders apiClient={apiClient}>
        <PayPalSdkProviderScope
          providerKey={sdkConfig().provider_key}
          configRequest={{
            market: "US",
            pageType: "checkout",
            flow: "standard",
            method: "card",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <CardFieldsCheckoutAction
            canSavePaymentMethod
            checkoutDraftId="draft_delivery_123"
            fulfillmentMode="delivery"
            market="US"
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    expect(html).toContain('class="card-fields-checkout-action"');
    expect(html).toContain('data-payment-action-placement="card-box"');
    expect(html).toContain('data-payment-method="card"');
    expect(html).toContain('data-payment-fulfillment-mode="delivery"');
    expect(html).toContain(
      'data-payment-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).toContain("Card number");
    expect(html).toContain("Expiration date");
    expect(html).toContain("Security code");
    expect(html).toContain("Save card for future purchases");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("Pay by card");
    expect(html).toContain("Card payment fields ready.");
  });

  it("hides the save checkbox when card vaulting is not eligible", () => {
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        ({
          status: 200,
          json: async () => ({ ok: true, data: {}, debug_id: "dbg_test" }),
        }) as Response,
    });

    const html = renderToStaticMarkup(
      <AppProviders apiClient={apiClient}>
        <PayPalSdkProviderScope
          providerKey={sdkConfig().provider_key}
          configRequest={{
            market: "US",
            pageType: "checkout",
            flow: "standard",
            method: "card",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <CardFieldsCheckoutAction
            checkoutDraftId="draft_delivery_123"
            fulfillmentMode="delivery"
            market="US"
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    expect(html).not.toContain("Save card for future purchases");
    expect(html).toContain("Pay by card");
  });

  it("hands successful hosted card approval to checkout capture handling", async () => {
    const user = userEvent.setup();
    const onApproved = vi.fn();
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        ({
          status: 200,
          json: async () => ({
            ok: true,
            data: {
              merchant_order_id: "merchant_order_card_123",
              payment_session_id: "payment_session_card_123",
              paypal_order_id: "PAYPAL_ORDER_CARD_123",
            },
            debug_id: "dbg_card_order",
          }),
        }) as Response,
    });

    render(
      <AppProviders apiClient={apiClient}>
        <PayPalSdkProviderScope
          providerKey={sdkConfig().provider_key}
          configRequest={{
            market: "US",
            pageType: "checkout",
            flow: "standard",
            method: "card",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <CardFieldsCheckoutAction
            checkoutDraftId="draft_delivery_123"
            fulfillmentMode="delivery"
            market="US"
            onApproved={onApproved}
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    await user.click(screen.getByRole("button", { name: "Pay by card" }));

    await waitFor(() => {
      expect(cardFieldsMockState.submit).toHaveBeenCalledWith(
        "PAYPAL_ORDER_CARD_123",
      );
      expect(onApproved).toHaveBeenCalledWith({
        fulfillmentMode: "delivery",
        method: "card",
        paymentSessionId: "payment_session_card_123",
        paypalOrderId: "PAYPAL_ORDER_CARD_123",
      });
    });
  });
});

function sdkConfig(): PayPalSdkConfigResponse {
  return {
    client_id: "PAYPAL_PUBLIC_CLIENT_ID",
    environment: "sandbox",
    sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    paylater_buyer_country: "US",
    sandbox_test_buyer_country: "US",
    components: ["card-fields"],
    page_type: "checkout",
    provider_key:
      "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:card-fields",
    needs_client_token: false,
  };
}

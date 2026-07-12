import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Components } from "@paypal/paypal-js/sdk-v6";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import {
  PayPalSdkProviderScope,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";
import {
  WalletCheckoutAction,
  buildWalletCreateOrderRequest,
  type WalletPaymentMethod,
} from "./WalletCheckoutAction.js";

describe("WalletCheckoutAction", () => {
  it.each([
    ["apple_pay", "applepay-payments"],
    ["google_pay", "googlepay-payments"],
    ["venmo", "venmo-payments"],
  ] as const)(
    "builds the delivery create-order request used by %s",
    (method, _expectedComponent) => {
      expect(
        buildWalletCreateOrderRequest({
          checkoutDraftId: "draft_delivery_123",
          fulfillmentMode: "delivery",
          market: "US",
          method,
        }),
      ).toEqual({
        path: "/api/paypal/orders/delivery",
        body: {
          checkout_draft_id: "draft_delivery_123",
          method,
        },
        query: {
          market: "US",
        },
      });
    },
  );

  it("builds the pickup create-order request used by a wallet button", () => {
    expect(
      buildWalletCreateOrderRequest({
        checkoutDraftId: "draft_pickup_123",
        fulfillmentMode: "pickup",
        market: "GB",
        method: "venmo",
      }),
    ).toEqual({
      path: "/api/paypal/orders/bopis",
      body: {
        checkout_draft_id: "draft_pickup_123",
        method: "venmo",
      },
      query: {
        market: "GB",
      },
    });
  });

  it.each([
    ["apple_pay", "applepay-payments", "Apple Pay eligibility pending."],
    ["google_pay", "googlepay-payments", "Google Pay eligibility pending."],
    ["venmo", "venmo-payments", "Venmo payment button ready."],
  ] as const)(
    "renders the %s checkout wallet surface",
    (method, expectedComponent, expectedStatus) => {
      const html = renderWalletAction(method);

      expect(html).toContain('class="wallet-checkout-action"');
      expect(html).toContain('data-payment-action-placement="order-summary"');
      expect(html).toContain(`data-wallet-method="${method}"`);
      expect(html).toContain(
        'data-payment-checkout-draft-id="draft_delivery_123"',
      );
      expect(html).toContain('data-payment-fulfillment-mode="delivery"');
      expect(html).toContain(expectedComponent);
      expect(html).toContain(expectedStatus);
    },
  );
});

function renderWalletAction(method: WalletPaymentMethod): string {
  const apiClient = createApiClient({
    baseUrl: "https://demo.example.test",
    fetch: async () =>
      ({
        status: 200,
        json: async () => ({ ok: true, data: {}, debug_id: "dbg_test" }),
      }) as Response,
  });

  return renderToStaticMarkup(
    <AppProviders apiClient={apiClient}>
      <PayPalSdkProviderScope
        providerKey={sdkConfig(method).provider_key}
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method,
        }}
        initialSdkConfig={sdkConfig(method)}
      >
        <WalletCheckoutAction
          checkoutDraftId="draft_delivery_123"
          currencyCode="USD"
          fulfillmentMode="delivery"
          market="US"
          method={method}
          storeDisplayName="POP MART"
          totalLabel="$25.98"
        />
      </PayPalSdkProviderScope>
    </AppProviders>,
  );
}

function sdkConfig(method: WalletPaymentMethod): PayPalSdkConfigResponse {
  const componentByMethod: Record<WalletPaymentMethod, Components> = {
    apple_pay: "applepay-payments",
    google_pay: "googlepay-payments",
    venmo: "venmo-payments",
  };
  const component = componentByMethod[method];

  return {
    client_id: "PAYPAL_PUBLIC_CLIENT_ID",
    environment: "sandbox",
    sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    paylater_buyer_country: "US",
    sandbox_test_buyer_country: "US",
    components: [component],
    page_type: "checkout",
    provider_key: `paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:${component}`,
    needs_client_token: false,
  };
}

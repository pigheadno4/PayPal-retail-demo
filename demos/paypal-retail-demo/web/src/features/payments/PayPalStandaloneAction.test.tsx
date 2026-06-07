import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import {
  PayPalSdkProviderScope,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";
import {
  PayPalStandaloneAction,
  buildPayPalCreateOrderRequest,
} from "./PayPalStandaloneAction.js";

describe("PayPalStandaloneAction", () => {
  it("builds the delivery create-order request used by the PayPal button", () => {
    expect(
      buildPayPalCreateOrderRequest({
        checkoutDraftId: "draft_delivery_123",
        fulfillmentMode: "delivery",
        market: "US",
      }),
    ).toEqual({
      path: "/api/paypal/orders/delivery",
      body: {
        checkout_draft_id: "draft_delivery_123",
        method: "paypal",
      },
      query: {
        market: "US",
      },
    });
  });

  it("builds the delivery create-order request with save-for-future opt-in", () => {
    expect(
      buildPayPalCreateOrderRequest({
        checkoutDraftId: "draft_delivery_123",
        fulfillmentMode: "delivery",
        market: "US",
        vaultRequested: true,
      }),
    ).toEqual({
      path: "/api/paypal/orders/delivery",
      body: {
        checkout_draft_id: "draft_delivery_123",
        method: "paypal",
        vault_requested: true,
      },
      query: {
        market: "US",
      },
    });
  });

  it("builds the pickup create-order request used by the PayPal button", () => {
    expect(
      buildPayPalCreateOrderRequest({
        checkoutDraftId: "draft_pickup_123",
        fulfillmentMode: "pickup",
        market: "GB",
      }),
    ).toEqual({
      path: "/api/paypal/orders/bopis",
      body: {
        checkout_draft_id: "draft_pickup_123",
        method: "paypal",
      },
      query: {
        market: "GB",
      },
    });
  });

  it("renders a scoped official PayPal standalone action surface", () => {
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
            method: "paypal",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <PayPalStandaloneAction
            checkoutDraftId="draft_delivery_123"
            fulfillmentMode="delivery"
            market="US"
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    expect(html).toContain('class="paypal-standalone-action"');
    expect(html).toContain('data-payment-action-placement="order-summary"');
    expect(html).toContain('data-payment-method="paypal"');
    expect(html).toContain('data-payment-fulfillment-mode="delivery"');
    expect(html).toContain(
      'data-payment-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).not.toContain("Save PayPal for future purchases");
    expect(html).toContain("PayPal payment button ready.");
  });

  it("renders the save-for-future checkbox only when eligible", () => {
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
            method: "paypal",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <PayPalStandaloneAction
            canSavePaymentMethod
            checkoutDraftId="draft_delivery_123"
            fulfillmentMode="delivery"
            market="US"
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    expect(html).toContain("Save PayPal for future purchases");
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain("checked");
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
    components: ["paypal-payments"],
    page_type: "checkout",
    provider_key:
      "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:paypal-payments",
    needs_client_token: false,
  };
}

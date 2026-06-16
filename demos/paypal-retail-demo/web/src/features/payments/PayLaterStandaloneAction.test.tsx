import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import {
  PayPalSdkProviderScope,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";
import {
  PayLaterStandaloneAction,
  buildPayLaterCreateOrderRequest,
} from "./PayLaterStandaloneAction.js";
import { normalizePayLaterMessageAmount } from "./payLaterRuntime.js";

describe("PayLaterStandaloneAction", () => {
  it("normalizes display totals into Pay Later message amounts", () => {
    expect(normalizePayLaterMessageAmount("$25.98")).toBe("25.98");
    expect(normalizePayLaterMessageAmount("£12.99")).toBe("12.99");
  });

  it("builds the delivery create-order request used by the Pay Later button", () => {
    expect(
      buildPayLaterCreateOrderRequest({
        checkoutDraftId: "draft_delivery_123",
        fulfillmentMode: "delivery",
        market: "US",
      }),
    ).toEqual({
      path: "/api/paypal/orders/delivery",
      body: {
        checkout_draft_id: "draft_delivery_123",
        method: "paylater",
      },
      query: {
        market: "US",
      },
    });
  });

  it("builds the pickup create-order request used by the Pay Later button", () => {
    expect(
      buildPayLaterCreateOrderRequest({
        checkoutDraftId: "draft_pickup_123",
        fulfillmentMode: "pickup",
        market: "GB",
      }),
    ).toEqual({
      path: "/api/paypal/orders/bopis",
      body: {
        checkout_draft_id: "draft_pickup_123",
        method: "paylater",
      },
      query: {
        market: "GB",
      },
    });
  });

  it("preserves authenticated request options for checkout create-order calls", () => {
    const request = buildPayLaterCreateOrderRequest({
      checkoutDraftId: "draft_delivery_123",
      fulfillmentMode: "delivery",
      market: "US",
      requestOptions: {
        headers: {
          authorization: "Bearer access_token_existing",
        },
      },
    } as Parameters<typeof buildPayLaterCreateOrderRequest>[0] & {
      readonly requestOptions: {
        readonly headers: {
          readonly authorization: string;
        };
      };
    });

    expect(request).toEqual({
      path: "/api/paypal/orders/delivery",
      body: {
        checkout_draft_id: "draft_delivery_123",
        method: "paylater",
      },
      query: {
        market: "US",
      },
      options: {
        headers: {
          authorization: "Bearer access_token_existing",
        },
      },
    });
  });

  it("renders a scoped Pay Later action and waits for eligible details before the official button", () => {
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
            method: "paylater",
          }}
          initialSdkConfig={sdkConfig()}
        >
          <PayLaterStandaloneAction
            buyerCountry="US"
            checkoutDraftId="draft_delivery_123"
            currencyCode="USD"
            fulfillmentMode="delivery"
            market="US"
            totalLabel="$25.98"
          />
        </PayPalSdkProviderScope>
      </AppProviders>,
    );

    expect(html).toContain('class="paylater-standalone-action"');
    expect(html).toContain('data-payment-action-placement="order-summary"');
    expect(html).toContain('data-payment-method="paylater"');
    expect(html).toContain('data-payment-fulfillment-mode="delivery"');
    expect(html).toContain(
      'data-payment-checkout-draft-id="draft_delivery_123"',
    );
    expect(html).toContain('data-paylater-message-placement="order-summary"');
    expect(html).toContain('data-paylater-message-amount="25.98"');
    expect(html).toContain('buyer-country="US"');
    expect(html).toContain('currency-code="USD"');
    expect(html).toContain("Pay Later eligibility pending.");
    expect(html).not.toContain("Pay Later payment button ready.");
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
    components: ["paypal-payments", "paypal-messages"],
    page_type: "checkout",
    provider_key:
      "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:paypal-messages,paypal-payments",
    needs_client_token: false,
  };
}

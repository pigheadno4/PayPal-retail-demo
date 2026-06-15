import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../../api/client.js";
import { AppProviders } from "../../state/appProviders.js";
import {
  PayPalSdkProviderScope,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";
import { DeliveryExpressAction } from "./DeliveryExpressAction.js";

describe("DeliveryExpressAction", () => {
  it("renders a scoped official PayPal express action for the active cart binding", () => {
    const html = renderExpressAction("paypal");

    expect(html).toContain('class="delivery-express-action"');
    expect(html).toContain('data-delivery-express-method="paypal"');
    expect(html).toContain('data-delivery-express-source="cart"');
    expect(html).toContain('data-delivery-express-cart-id="cart_public_guest"');
    expect(html).toContain("PayPal delivery express button ready.");
    expect(html).not.toContain("data-payment-checkout-draft-id");
  });

  it("renders a scoped official Pay Later express action for the active cart binding", () => {
    const html = renderExpressAction("paylater");

    expect(html).toContain('class="delivery-express-action"');
    expect(html).toContain('data-delivery-express-method="paylater"');
    expect(html).toContain('data-delivery-express-source="cart"');
    expect(html).toContain('data-delivery-express-cart-id="cart_public_guest"');
    expect(html).toContain("Pay Later eligibility pending.");
    expect(html).not.toContain("Pay Later delivery express button ready.");
    expect(html).not.toContain("data-payment-checkout-draft-id");
  });
});

function renderExpressAction(method: "paypal" | "paylater"): string {
  const apiClient = createApiClient({
    baseUrl: "https://demo.example.test",
    fetch: async () =>
      ({
        status: 200,
        json: async () => ({ ok: true, data: {}, debug_id: "dbg_test" }),
      }) as Response,
  });
  const config = sdkConfig(method);

  return renderToStaticMarkup(
    <AppProviders apiClient={apiClient}>
      <PayPalSdkProviderScope
        providerKey={config.provider_key}
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method,
        }}
        initialSdkConfig={config}
      >
        <DeliveryExpressAction
          cartClientSecret="cart_secret_guest"
          cartPublicId="cart_public_guest"
          currencyCode="USD"
          market="US"
          method={method}
          source="cart"
          totalLabel="$25.98"
        />
      </PayPalSdkProviderScope>
    </AppProviders>,
  );
}

function sdkConfig(method: "paypal" | "paylater"): PayPalSdkConfigResponse {
  const components =
    method === "paylater"
      ? (["paypal-payments", "paypal-messages"] as const)
      : (["paypal-payments"] as const);

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

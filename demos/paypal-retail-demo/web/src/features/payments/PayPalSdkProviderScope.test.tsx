import type { CreateInstanceOptions } from "@paypal/paypal-js/sdk-v6";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  PayPalSdkProviderScope,
  buildPayPalProviderOptions,
  buildPayPalSdkConfigQuery,
  type PayPalSdkConfigResponse,
} from "./PayPalSdkProviderScope.js";

describe("PayPalSdkProviderScope", () => {
  it("builds the backend SDK config query from the active payment surface", () => {
    expect(
      buildPayPalSdkConfigQuery({
        market: "GB",
        pageType: "checkout",
        flow: "standard",
        method: "paypal",
      }),
    ).toEqual({
      market: "GB",
      page_type: "checkout",
      flow: "standard",
      method: "paypal",
    });
  });

  it("maps sandbox SDK config to v6 provider options with test buyer country", () => {
    const options = buildPayPalProviderOptions(sdkConfig());

    expect(options).toEqual({
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "sandbox",
      components: ["paypal-messages", "paypal-payments", "venmo-payments"],
      locale: "en-GB",
      pageType: "checkout",
      testBuyerCountry: "GB",
    });
  });

  it("omits sandbox-only test buyer country for production SDK config", () => {
    const options = buildPayPalProviderOptions(
      sdkConfig({
        environment: "production",
        sandbox_test_buyer_country: null,
      }),
    );

    expect(options).not.toHaveProperty("testBuyerCountry");
    expect(options).toMatchObject({
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "production",
      locale: "en-GB",
      pageType: "checkout",
    });
  });

  it("compiles against the installed SDK v6 testBuyerCountry option", () => {
    const installedSdkTypeCheck: CreateInstanceOptions<
      readonly ["paypal-payments"]
    > = {
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      components: ["paypal-payments"],
      testBuyerCountry: "US",
    };

    expect(installedSdkTypeCheck.testBuyerCountry).toBe("US");
  });

  it("renders loading state until backend SDK config is available", () => {
    const html = renderToStaticMarkup(
      <PayPalSdkProviderScope
        providerKey="paypal:sandbox:pending"
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method: "paypal",
        }}
      >
        <span>Payment subtree</span>
      </PayPalSdkProviderScope>,
    );

    expect(html).toContain('class="paypal-provider-scope"');
    expect(html).toContain('data-paypal-provider-key="paypal:sandbox:pending"');
    expect(html).toContain('data-paypal-sdk-status="loading"');
    expect(html).toContain("Loading PayPal payment options.");
    expect(html).not.toContain("Payment subtree");
  });

  it("renders ready metadata when initial backend SDK config is supplied", () => {
    const html = renderToStaticMarkup(
      <PayPalSdkProviderScope
        providerKey={sdkConfig().provider_key}
        configRequest={{
          market: "GB",
          pageType: "checkout",
          flow: "standard",
          method: "paypal",
        }}
        initialSdkConfig={sdkConfig()}
      >
        <span>Payment subtree</span>
      </PayPalSdkProviderScope>,
    );

    expect(html).toContain('data-paypal-sdk-status="ready"');
    expect(html).toContain('data-paypal-currency="GBP"');
    expect(html).toContain('data-paypal-buyer-country="GB"');
    expect(html).toContain('data-paypal-paylater-buyer-country="GB"');
    expect(html).toContain('data-paypal-test-buyer-country="GB"');
    expect(html).toContain("Payment subtree");
  });
});

function sdkConfig(
  overrides: Partial<PayPalSdkConfigResponse> = {},
): PayPalSdkConfigResponse {
  return {
    client_id: "PAYPAL_PUBLIC_CLIENT_ID",
    environment: "sandbox",
    sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
    currency_code: "GBP",
    locale: "en-GB",
    buyer_country: "GB",
    paylater_buyer_country: "GB",
    sandbox_test_buyer_country: "GB",
    components: ["paypal-messages", "paypal-payments", "venmo-payments"],
    page_type: "checkout",
    provider_key:
      "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:GB:GBP:en-GB:GB:GB:GB:1:paypal-messages,paypal-payments,venmo-payments",
    needs_client_token: false,
    ...overrides,
  };
}

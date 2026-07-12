// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { CreateInstanceOptions } from "@paypal/paypal-js/sdk-v6";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const sdkMockState = vi.hoisted(() => ({
  loadingStatus: "resolved",
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
    usePayPal: () => ({ loadingStatus: sdkMockState.loadingStatus }),
  };
});

import type { ApiClient, ApiQueryParams } from "../../api/client.js";
import {
  PayPalSdkProviderScope,
  buildPayPalProviderOptions,
  buildPayPalSdkConfigQuery,
  type PayPalSdkConfigResponse,
  usePayPalSdkConfig,
} from "./PayPalSdkProviderScope.js";

afterEach(() => {
  sdkMockState.loadingStatus = "resolved";
  cleanup();
});

describe("PayPalSdkProviderScope", () => {
  it("renders an actionable visual fallback while checkout SDK config loads", () => {
    const html = renderToStaticMarkup(
      <PayPalSdkProviderScope
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method: "paypal",
        }}
        fallback={
          <button data-payment-loading-fallback="paypal" disabled type="button">
            Loading PayPal
          </button>
        }
        providerKey="paypal:sandbox:pending"
      >
        <span>Ready action</span>
      </PayPalSdkProviderScope>,
    );

    expect(html).toContain('data-payment-loading-fallback="paypal"');
    expect(html).toContain("Loading PayPal");
    expect(html).not.toContain("Ready action");
  });

  it("keeps the visual fallback mounted until the PayPal runtime resolves", () => {
    sdkMockState.loadingStatus = "pending";
    const renderScope = () => (
      <PayPalSdkProviderScope
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method: "paypal",
        }}
        fallback={
          <button data-payment-loading-fallback="paypal" disabled type="button">
            Preparing PayPal
          </button>
        }
        initialSdkConfig={sdkConfig()}
        providerKey={sdkConfig().provider_key}
      >
        <span data-testid="ready-action">Ready action</span>
      </PayPalSdkProviderScope>
    );

    const { rerender } = render(renderScope());

    expect(
      document.querySelector('[data-paypal-sdk-runtime-status="pending"]'),
    ).not.toBeNull();
    expect(screen.queryByText("Preparing PayPal")).not.toBeNull();
    expect(screen.queryByTestId("ready-action")).toBeNull();

    sdkMockState.loadingStatus = "resolved";
    rerender(renderScope());

    expect(
      document.querySelector('[data-paypal-sdk-runtime-status="resolved"]'),
    ).not.toBeNull();
    expect(screen.queryByText("Preparing PayPal")).toBeNull();
    expect(screen.queryByTestId("ready-action")).not.toBeNull();
  });
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
    expect(html).toContain("Loading PayPal payment option.");
    expect(html).not.toContain("Payment subtree");
  });

  it("labels SDK loading status by payment method so adjacent scopes do not repeat generic copy", () => {
    const html = renderToStaticMarkup(
      <PayPalSdkProviderScope
        providerKey="paypal:sandbox:pending"
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method: "paylater",
        }}
      >
        <span>Payment subtree</span>
      </PayPalSdkProviderScope>,
    );

    expect(html).toContain("Loading Pay Later payment option.");
    expect(html).toContain(
      'id="paypal-sdk-paypal-sandbox-pending-checkout-standard-paylater-config-status"',
    );
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

  it("provides the resolved SDK environment to wallet components", () => {
    const config = sdkConfig({
      environment: "production",
      provider_key: "paypal:production:PAYPAL_PUBLIC_CLIENT_ID:GB:GBP",
      sandbox_test_buyer_country: null,
    });

    render(
      <PayPalSdkProviderScope
        providerKey={config.provider_key}
        configRequest={{
          market: "GB",
          pageType: "checkout",
          flow: "standard",
          method: "google_pay",
        }}
        initialSdkConfig={config}
      >
        <SdkEnvironmentProbe />
      </PayPalSdkProviderScope>,
    );

    expect(screen.getByTestId("sdk-environment").textContent).toBe(
      "production",
    );
  });

  it("does not refetch SDK config when an equivalent config request object is rerendered", async () => {
    const requests: Array<ApiQueryParams | undefined> = [];
    const apiClient: ApiClient = {
      delete: async () => {
        throw new Error("Unexpected API delete in SDK config test.");
      },
      get: async <TData = unknown,>(_path: string, query?: ApiQueryParams) => {
        requests.push(query);
        return new Promise<PayPalSdkConfigResponse>(
          () => undefined,
        ) as Promise<TData>;
      },
      patch: async () => {
        throw new Error("Unexpected API patch in SDK config test.");
      },
      post: async () => {
        throw new Error("Unexpected API post in SDK config test.");
      },
    };
    const renderScope = () => (
      <PayPalSdkProviderScope
        apiClient={apiClient}
        providerKey="paypal:sandbox:pending"
        configRequest={{
          market: "US",
          pageType: "checkout",
          flow: "standard",
          method: "paypal",
        }}
      >
        <span>Payment subtree</span>
      </PayPalSdkProviderScope>
    );

    const { rerender } = render(renderScope());
    await waitFor(() => expect(requests).toHaveLength(1));

    rerender(renderScope());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toHaveLength(1);
  });
});

function SdkEnvironmentProbe() {
  const config = usePayPalSdkConfig();

  return <span data-testid="sdk-environment">{config.environment}</span>;
}

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

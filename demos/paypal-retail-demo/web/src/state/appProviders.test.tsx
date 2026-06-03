import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createApiClient } from "../api/client.js";
import {
  AppProviders,
  PayPalProviderBoundary,
  useApiClient,
  useStorefrontRuntime,
} from "./appProviders.js";
import type { StorefrontRuntimeConfig } from "./storefrontState.js";

describe("app providers", () => {
  it("provides API and runtime config state without keying the whole shell", () => {
    const apiClient = createApiClient({
      baseUrl: "https://demo.example.test",
      fetch: async () =>
        ({
          status: 200,
          json: async () => ({ ok: true, data: {}, debug_id: "dbg_test" }),
        }) as Response,
    });

    function Probe() {
      const providedApiClient = useApiClient();
      const runtime = useStorefrontRuntime();

      return (
        <section data-profile={runtime.config.profile.slug}>
          <span
            data-api-client={providedApiClient === apiClient ? "yes" : "no"}
          >
            API ready
          </span>
          <PayPalProviderBoundary
            providerKey={runtime.config.paypal.providerKey}
          >
            Payment subtree
          </PayPalProviderBoundary>
        </section>
      );
    }

    const html = renderToStaticMarkup(
      <AppProviders initialConfig={runtimeConfig()} apiClient={apiClient}>
        <Probe />
      </AppProviders>,
    );

    expect(html).toContain('data-profile="popmart"');
    expect(html).toContain('data-api-client="yes"');
    expect(html).toContain('class="paypal-provider-boundary"');
    expect(html).toContain(
      'data-paypal-provider-key="paypal:sandbox:popmart:us:v1"',
    );
  });
});

function runtimeConfig(): StorefrontRuntimeConfig {
  return {
    profile: {
      slug: "popmart",
      displayName: "POP MART",
      brandMode: "popmart",
    },
    market: {
      code: "US",
      currencyCode: "USD",
      locale: "en-US",
    },
    paypal: {
      providerKey: "paypal:sandbox:popmart:us:v1",
    },
  };
}

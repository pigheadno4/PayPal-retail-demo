import {
  INSTANCE_LOADING_STATE,
  PayPalProvider,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Components, PageTypes } from "@paypal/paypal-js/sdk-v6";

import {
  createApiClient,
  type ApiClient,
  type ApiQueryParams,
} from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";

export type PayPalSdkFlow = "standard" | "vaulting";
export type PayPalPaymentMethod =
  | "paypal"
  | "paylater"
  | "card"
  | "apple_pay"
  | "google_pay"
  | "venmo";

export interface PayPalSdkConfigRequest {
  readonly market: string;
  readonly pageType: PageTypes;
  readonly flow: PayPalSdkFlow;
  readonly method: PayPalPaymentMethod;
}

export interface PayPalSdkConfigResponse {
  readonly client_id: string;
  readonly environment: "sandbox" | "production";
  readonly sdk_url: string;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly paylater_buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
  readonly components: readonly Components[];
  readonly page_type: PageTypes;
  readonly provider_key: string;
  readonly needs_client_token: boolean;
}

export interface PayPalProviderOptions {
  readonly clientId: string;
  readonly environment: "sandbox" | "production";
  readonly components: Components[];
  readonly locale: string;
  readonly pageType: PageTypes;
  readonly testBuyerCountry?: string;
}

export interface PayPalSdkProviderScopeProps {
  readonly providerKey: string;
  readonly configRequest: PayPalSdkConfigRequest;
  readonly initialSdkConfig?: PayPalSdkConfigResponse;
  readonly apiClient?: ApiClient;
  readonly children: ReactNode;
}

type PayPalSdkLoadState =
  | {
      readonly status: "loading";
      readonly config: null;
      readonly error: null;
    }
  | {
      readonly status: "ready";
      readonly config: PayPalSdkConfigResponse;
      readonly error: null;
    }
  | {
      readonly status: "error";
      readonly config: null;
      readonly error: Error;
    };

export function PayPalSdkProviderScope({
  providerKey,
  configRequest,
  initialSdkConfig,
  apiClient,
  children,
}: PayPalSdkProviderScopeProps) {
  const resolvedApiClient = useMemo(
    () => apiClient ?? createApiClient(),
    [apiClient],
  );
  const requestQuery = useMemo(
    () => buildPayPalSdkConfigQuery(configRequest),
    [configRequest],
  );
  const requestKey = useMemo(
    () => JSON.stringify(requestQuery),
    [requestQuery],
  );
  const [loadState, setLoadState] = useState<PayPalSdkLoadState>(() =>
    initialSdkConfig?.provider_key === providerKey
      ? {
          status: "ready",
          config: initialSdkConfig,
          error: null,
        }
      : {
          status: "loading",
          config: null,
          error: null,
        },
  );

  useEffect(() => {
    if (initialSdkConfig?.provider_key === providerKey) {
      setLoadState({
        status: "ready",
        config: initialSdkConfig,
        error: null,
      });
      return;
    }

    let isCurrent = true;
    setLoadState({
      status: "loading",
      config: null,
      error: null,
    });

    resolvedApiClient
      .get<PayPalSdkConfigResponse>("/api/paypal/sdk-config", requestQuery)
      .then((config) => {
        if (isCurrent) {
          setLoadState({
            status: "ready",
            config,
            error: null,
          });
        }
      })
      .catch((error: unknown) => {
        if (isCurrent) {
          setLoadState({
            status: "error",
            config: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    initialSdkConfig,
    providerKey,
    requestKey,
    requestQuery,
    resolvedApiClient,
  ]);

  return (
    <section
      className="paypal-provider-scope"
      data-paypal-buyer-country={loadState.config?.buyer_country}
      data-paypal-currency={loadState.config?.currency_code}
      data-paypal-paylater-buyer-country={
        loadState.config?.paylater_buyer_country
      }
      data-paypal-provider-key={providerKey}
      data-paypal-sdk-page-type={configRequest.pageType}
      data-paypal-sdk-status={loadState.status}
      data-paypal-sdk-url={loadState.config?.sdk_url}
      data-paypal-test-buyer-country={
        loadState.config?.sandbox_test_buyer_country ?? undefined
      }
    >
      {loadState.status === "loading" ? (
        <StatusRegion id="paypal-sdk-config-status" className="sr-only">
          Loading PayPal payment options.
        </StatusRegion>
      ) : null}
      {loadState.status === "error" ? (
        <StatusRegion id="paypal-sdk-config-status" tone="assertive">
          PayPal payment options are temporarily unavailable.
        </StatusRegion>
      ) : null}
      {loadState.status === "ready" ? (
        <PayPalProvider
          key={loadState.config.provider_key}
          {...buildPayPalProviderOptions(loadState.config)}
        >
          <PayPalSdkStatusRegion />
          {children}
        </PayPalProvider>
      ) : null}
    </section>
  );
}

export function buildPayPalSdkConfigQuery(
  request: PayPalSdkConfigRequest,
): ApiQueryParams {
  return {
    market: request.market,
    page_type: request.pageType,
    flow: request.flow,
    method: request.method,
  };
}

export function buildPayPalProviderOptions(
  config: PayPalSdkConfigResponse,
): PayPalProviderOptions {
  const options: Omit<PayPalProviderOptions, "testBuyerCountry"> = {
    clientId: config.client_id,
    environment: config.environment,
    components: Array.from(config.components),
    locale: config.locale,
    pageType: config.page_type,
  };

  return config.environment === "sandbox" && config.sandbox_test_buyer_country
    ? {
        ...options,
        testBuyerCountry: config.sandbox_test_buyer_country,
      }
    : options;
}

function PayPalSdkStatusRegion() {
  const paypal = usePayPal();
  const isLoading = paypal.loadingStatus === INSTANCE_LOADING_STATE.PENDING;
  const isRejected = paypal.loadingStatus === INSTANCE_LOADING_STATE.REJECTED;

  if (isRejected) {
    return (
      <StatusRegion id="paypal-sdk-status" tone="assertive">
        PayPal SDK failed to initialize.
      </StatusRegion>
    );
  }

  return (
    <StatusRegion id="paypal-sdk-status" className="sr-only">
      {isLoading
        ? "PayPal payment options loading."
        : "PayPal payment options ready."}
    </StatusRegion>
  );
}

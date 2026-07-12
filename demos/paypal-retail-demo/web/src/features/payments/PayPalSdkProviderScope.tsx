import {
  INSTANCE_LOADING_STATE,
  PayPalProvider,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Components, PageTypes } from "@paypal/paypal-js/sdk-v6";

import {
  createApiClient,
  type ApiClient,
  type ApiQueryParams,
} from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useOptionalApiClient } from "../../state/appProviders.js";

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
  readonly fallback?: ReactNode;
  readonly children: ReactNode;
}

const PayPalSdkConfigContext = createContext<PayPalSdkConfigResponse | null>(
  null,
);

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
  fallback,
  children,
}: PayPalSdkProviderScopeProps) {
  const contextApiClient = useOptionalApiClient();
  const resolvedApiClient = useMemo(
    () => apiClient ?? contextApiClient ?? createApiClient(),
    [apiClient, contextApiClient],
  );
  const requestQuery = useMemo(
    () => buildPayPalSdkConfigQuery(configRequest),
    [
      configRequest.flow,
      configRequest.market,
      configRequest.method,
      configRequest.pageType,
    ],
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
  const methodLabel = formatPayPalPaymentMethod(configRequest.method);
  const statusIdBase = buildPayPalStatusIdBase(providerKey, configRequest);

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
      data-paypal-sdk-flow={configRequest.flow}
      data-paypal-sdk-method={configRequest.method}
      data-paypal-sdk-page-type={configRequest.pageType}
      data-paypal-sdk-status={loadState.status}
      data-paypal-sdk-url={loadState.config?.sdk_url}
      data-paypal-test-buyer-country={
        loadState.config?.sandbox_test_buyer_country ?? undefined
      }
    >
      {loadState.status === "loading" ? (
        <StatusRegion id={`${statusIdBase}-config-status`} className="sr-only">
          Loading {methodLabel} payment option.
        </StatusRegion>
      ) : null}
      {loadState.status === "error" ? (
        <StatusRegion id={`${statusIdBase}-config-status`} tone="assertive">
          {methodLabel} payment option is temporarily unavailable.
        </StatusRegion>
      ) : null}
      {loadState.status !== "ready" && fallback ? fallback : null}
      {loadState.status === "ready" ? (
        <PayPalProvider
          key={loadState.config.provider_key}
          {...buildPayPalProviderOptions(loadState.config)}
        >
          <PayPalSdkConfigContext.Provider value={loadState.config}>
            <PayPalSdkRuntimeBoundary
              fallback={fallback}
              methodLabel={methodLabel}
              statusId={`${statusIdBase}-runtime-status`}
            >
              {children}
            </PayPalSdkRuntimeBoundary>
          </PayPalSdkConfigContext.Provider>
        </PayPalProvider>
      ) : null}
    </section>
  );
}

export function usePayPalSdkConfig(): PayPalSdkConfigResponse {
  const config = useContext(PayPalSdkConfigContext);

  if (!config) {
    throw new Error(
      "usePayPalSdkConfig must be used within a ready PayPalSdkProviderScope",
    );
  }

  return config;
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

function PayPalSdkRuntimeBoundary({
  children,
  fallback,
  methodLabel,
  statusId,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
  readonly methodLabel: string;
  readonly statusId: string;
}) {
  const paypal = usePayPal();
  const isRejected = paypal.loadingStatus === INSTANCE_LOADING_STATE.REJECTED;
  const isResolved = paypal.loadingStatus === INSTANCE_LOADING_STATE.RESOLVED;
  const runtimeStatus = isRejected
    ? "rejected"
    : isResolved
      ? "resolved"
      : "pending";

  if (isRejected) {
    return (
      <div data-paypal-sdk-runtime-status={runtimeStatus}>
        <StatusRegion id={statusId} tone="assertive">
          {methodLabel} payment option failed to initialize.
        </StatusRegion>
      </div>
    );
  }

  return (
    <div
      className="paypal-provider-runtime"
      data-paypal-sdk-runtime-status={runtimeStatus}
    >
      <StatusRegion id={statusId} className="sr-only">
        {isResolved
          ? `${methodLabel} payment option ready.`
          : `${methodLabel} payment option loading.`}
      </StatusRegion>
      {isResolved || !fallback ? children : fallback}
    </div>
  );
}

function formatPayPalPaymentMethod(method: PayPalPaymentMethod): string {
  switch (method) {
    case "apple_pay":
      return "Apple Pay";
    case "card":
      return "card";
    case "google_pay":
      return "Google Pay";
    case "paylater":
      return "Pay Later";
    case "paypal":
      return "PayPal";
    case "venmo":
      return "Venmo";
  }
}

function buildPayPalStatusIdBase(
  providerKey: string,
  request: PayPalSdkConfigRequest,
): string {
  const suffix =
    `${providerKey}-${request.pageType}-${request.flow}-${request.method}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 96);

  return `paypal-sdk-${suffix || request.method}`;
}

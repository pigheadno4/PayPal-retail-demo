import { createContext, useContext, useMemo, type ReactNode } from "react";

import { createApiClient, type ApiClient } from "../api/client.js";
import {
  applyRuntimeConfig,
  createInitialStorefrontState,
  defaultRuntimeConfig,
  type StorefrontConfigEffects,
  type StorefrontRuntimeConfig,
  type StorefrontShellState,
} from "./storefrontState.js";

export interface StorefrontRuntimeValue {
  readonly config: StorefrontRuntimeConfig;
  readonly shellState: StorefrontShellState;
  readonly configEffects: StorefrontConfigEffects;
}

export interface AppProvidersProps {
  readonly initialConfig?: StorefrontRuntimeConfig;
  readonly apiClient?: ApiClient;
  readonly children: ReactNode;
}

const ApiClientContext = createContext<ApiClient | null>(null);
const StorefrontRuntimeContext = createContext<StorefrontRuntimeValue | null>(
  null,
);

export function AppProviders({
  initialConfig = defaultRuntimeConfig(),
  apiClient,
  children,
}: AppProvidersProps) {
  const resolvedApiClient = useMemo(
    () => apiClient ?? createApiClient(),
    [apiClient],
  );
  const runtime = useMemo<StorefrontRuntimeValue>(() => {
    const appliedConfig = applyRuntimeConfig(
      createInitialStorefrontState(),
      initialConfig,
    );

    return {
      config: initialConfig,
      shellState: appliedConfig.state,
      configEffects: appliedConfig.effects,
    };
  }, [initialConfig]);

  return (
    <ApiClientContext.Provider value={resolvedApiClient}>
      <StorefrontRuntimeContext.Provider value={runtime}>
        {children}
      </StorefrontRuntimeContext.Provider>
    </ApiClientContext.Provider>
  );
}

export function useApiClient(): ApiClient {
  const apiClient = useContext(ApiClientContext);

  if (!apiClient) {
    throw new Error("useApiClient must be used inside AppProviders.");
  }

  return apiClient;
}

export function useStorefrontRuntime(): StorefrontRuntimeValue {
  const runtime = useContext(StorefrontRuntimeContext);

  if (!runtime) {
    throw new Error("useStorefrontRuntime must be used inside AppProviders.");
  }

  return runtime;
}

export interface PayPalProviderBoundaryProps {
  readonly providerKey: string;
  readonly children: ReactNode;
}

export function PayPalProviderBoundary({
  providerKey,
  children,
}: PayPalProviderBoundaryProps) {
  return (
    <div
      className="paypal-provider-boundary"
      data-paypal-provider-key={providerKey}
    >
      {children}
    </div>
  );
}

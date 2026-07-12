import {
  useEligibleMethods,
  useGooglePayOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { GooglePayConfigFromFindEligibleMethods } from "@paypal/paypal-js/sdk-v6";

import type { CheckoutPreselectionWalletMethod } from "../checkout/CheckoutPage.js";
import {
  PayPalSdkProviderScope,
  usePayPalSdkConfig,
} from "./PayPalSdkProviderScope.js";
import { normalizePayLaterMessageAmount } from "./payLaterRuntime.js";

export type CheckoutWalletEligibilityState =
  | "eligible"
  | "ineligible"
  | "pending";

export interface CheckoutWalletEligibilityProbesProps {
  readonly currencyCode: string;
  readonly market: string;
  readonly onEligibilityChange: (
    method: CheckoutPreselectionWalletMethod,
    state: CheckoutWalletEligibilityState,
  ) => void;
  readonly providerKey: string;
  readonly totalLabel: string;
}

export function CheckoutWalletEligibilityProbes({
  currencyCode,
  market,
  onEligibilityChange,
  providerKey,
  totalLabel,
}: CheckoutWalletEligibilityProbesProps) {
  const handleAppleEligibilityChange = useCallback(
    (state: CheckoutWalletEligibilityState) => {
      onEligibilityChange("apple_pay", state);
    },
    [onEligibilityChange],
  );
  const handleGoogleEligibilityChange = useCallback(
    (state: CheckoutWalletEligibilityState) => {
      onEligibilityChange("google_pay", state);
    },
    [onEligibilityChange],
  );

  return (
    <div aria-hidden="true" data-wallet-eligibility-probes hidden>
      <PayPalSdkProviderScope
        providerKey={providerKey}
        configRequest={{
          flow: "standard",
          market,
          method: "apple_pay",
          pageType: "checkout",
        }}
      >
        <ApplePayPreselectionProbe
          currencyCode={currencyCode}
          onEligibilityChange={handleAppleEligibilityChange}
          totalLabel={totalLabel}
        />
      </PayPalSdkProviderScope>
      <PayPalSdkProviderScope
        providerKey={providerKey}
        configRequest={{
          flow: "standard",
          market,
          method: "google_pay",
          pageType: "checkout",
        }}
      >
        <GooglePayPreselectionProbe
          currencyCode={currencyCode}
          onEligibilityChange={handleGoogleEligibilityChange}
          totalLabel={totalLabel}
        />
      </PayPalSdkProviderScope>
    </div>
  );
}

export function ApplePayPreselectionProbe({
  currencyCode,
  onEligibilityChange,
  totalLabel,
}: {
  readonly currencyCode: string;
  readonly onEligibilityChange: (state: CheckoutWalletEligibilityState) => void;
  readonly totalLabel: string;
}) {
  const amount = normalizePayLaterMessageAmount(totalLabel);
  const { eligiblePaymentMethods, error, isLoading } = useEligibleMethods({
    payload: {
      amount,
      currencyCode,
      paymentFlow: "ONE_TIME_PAYMENT",
    },
  });
  const isProviderEligible =
    eligiblePaymentMethods?.isEligible("applepay") === true;

  useEffect(() => {
    if (isLoading) {
      onEligibilityChange("pending");
      return;
    }

    if (error || !isProviderEligible) {
      onEligibilityChange("ineligible");
      return;
    }

    try {
      const canMakePayments =
        typeof window.ApplePaySession?.canMakePayments === "function" &&
        window.ApplePaySession.canMakePayments();

      onEligibilityChange(canMakePayments ? "eligible" : "ineligible");
    } catch {
      onEligibilityChange("ineligible");
    }
  }, [error, isLoading, isProviderEligible, onEligibilityChange]);

  return null;
}

export function GooglePayPreselectionProbe({
  currencyCode,
  onEligibilityChange,
  totalLabel,
}: {
  readonly currencyCode: string;
  readonly onEligibilityChange: (state: CheckoutWalletEligibilityState) => void;
  readonly totalLabel: string;
}) {
  const amount = normalizePayLaterMessageAmount(totalLabel);
  const { eligiblePaymentMethods, error, isLoading } = useEligibleMethods({
    payload: {
      amount,
      currencyCode,
      paymentFlow: "ONE_TIME_PAYMENT",
    },
  });
  const rawGooglePayConfig =
    eligiblePaymentMethods?.isEligible("googlepay") === true
      ? eligiblePaymentMethods.getDetails("googlepay").config
      : null;
  const googlePayConfigKey = rawGooglePayConfig
    ? JSON.stringify(rawGooglePayConfig)
    : null;
  const googlePayConfig =
    useMemo<GooglePayConfigFromFindEligibleMethods | null>(
      () =>
        googlePayConfigKey
          ? (JSON.parse(
              googlePayConfigKey,
            ) as GooglePayConfigFromFindEligibleMethods)
          : null,
      [googlePayConfigKey],
    );

  useEffect(() => {
    if (isLoading) {
      onEligibilityChange("pending");
    } else if (error || !googlePayConfig) {
      onEligibilityChange("ineligible");
    }
  }, [error, googlePayConfig, isLoading, onEligibilityChange]);

  return googlePayConfig ? (
    <GooglePaySessionReadinessProbe
      key={`${currencyCode}:${amount}`}
      amount={amount}
      currencyCode={currencyCode}
      googlePayConfig={googlePayConfig}
      onEligibilityChange={onEligibilityChange}
    />
  ) : null;
}

function GooglePaySessionReadinessProbe({
  amount,
  currencyCode,
  googlePayConfig,
  onEligibilityChange,
}: {
  readonly amount: string;
  readonly currencyCode: string;
  readonly googlePayConfig: GooglePayConfigFromFindEligibleMethods;
  readonly onEligibilityChange: (state: CheckoutWalletEligibilityState) => void;
}) {
  const { environment } = usePayPalSdkConfig();
  const transactionInfo = useMemo(
    () => ({
      countryCode: googlePayConfig.merchantCountry,
      currencyCode,
      totalPrice: amount,
      totalPriceStatus: "FINAL" as const,
    }),
    [amount, currencyCode, googlePayConfig.merchantCountry],
  );
  const handleGooglePaySessionError = useCallback(() => {
    onEligibilityChange("ineligible");
  }, [onEligibilityChange]);
  const { error, formattedConfig, handleDestroy, isPending, paymentsClient } =
    useGooglePayOneTimePaymentSession({
      createOrder: rejectProbeOrderCreation,
      environment: environment === "production" ? "PRODUCTION" : "TEST",
      googlePayConfig,
      onApprove: ignoreProbeApproval,
      onCancel: ignoreProbeCancellation,
      onError: handleGooglePaySessionError,
      transactionInfo,
    });
  const readinessRequestKey = formattedConfig
    ? JSON.stringify({
        allowedPaymentMethods: formattedConfig.allowedPaymentMethods,
        apiVersion: formattedConfig.apiVersion,
        apiVersionMinor: formattedConfig.apiVersionMinor,
      })
    : null;
  const readinessRequest = useMemo(
    () => (readinessRequestKey ? JSON.parse(readinessRequestKey) : null),
    [readinessRequestKey],
  );
  const paymentsClientRef = useRef(paymentsClient);
  const handleDestroyRef = useRef(handleDestroy);
  paymentsClientRef.current = paymentsClient;
  handleDestroyRef.current = handleDestroy;
  const hasPaymentsClient = paymentsClient !== null;

  useEffect(() => {
    if (error) {
      onEligibilityChange("ineligible");
      return;
    }

    const currentPaymentsClient = paymentsClientRef.current;
    if (
      isPending ||
      !hasPaymentsClient ||
      !currentPaymentsClient ||
      !readinessRequest
    ) {
      onEligibilityChange("pending");
      return;
    }

    let isCurrent = true;
    onEligibilityChange("pending");
    void currentPaymentsClient
      .isReadyToPay(readinessRequest)
      .then((response) => {
        if (isCurrent) {
          onEligibilityChange(
            response.result === true ? "eligible" : "ineligible",
          );
        }
      })
      .catch(() => {
        if (isCurrent) {
          onEligibilityChange("ineligible");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [
    error,
    hasPaymentsClient,
    isPending,
    onEligibilityChange,
    readinessRequest,
  ]);

  useEffect(
    () => () => {
      handleDestroyRef.current();
    },
    [],
  );

  return null;
}

async function rejectProbeOrderCreation(): Promise<{
  readonly orderId: string;
}> {
  throw new Error("Wallet eligibility probes cannot create PayPal orders.");
}

function ignoreProbeApproval() {}

function ignoreProbeCancellation() {}

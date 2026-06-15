import {
  ApplePayOneTimePaymentButton,
  VenmoOneTimePaymentButton,
  useEligibleMethods,
  usePayPal,
} from "@paypal/react-paypal-js/sdk-v6";
import {
  useCallback,
  useMemo,
  type ReactEventHandler,
  type ReactNode,
} from "react";
import type {
  ConfirmOrderResponse,
  OnApproveDataOneTimePayments,
  OnCancelDataOneTimePayments,
  OnErrorData,
} from "@paypal/paypal-js/sdk-v6";

import { type ApiQueryParams } from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";
import { normalizePayLaterMessageAmount } from "./payLaterRuntime.js";

export type WalletPaymentMethod = "apple_pay" | "google_pay" | "venmo";

export interface WalletCheckoutActionProps {
  readonly checkoutDraftId: string;
  readonly currencyCode: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly method: WalletPaymentMethod;
  readonly storeDisplayName: string;
  readonly totalLabel: string;
}

export interface WalletCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: WalletPaymentMethod;
  };
  readonly query: ApiQueryParams;
}

const requiredComponentByMethod = {
  apple_pay: "applepay-payments",
  google_pay: "googlepay-payments",
  venmo: "venmo-payments",
} satisfies Record<WalletPaymentMethod, string>;

const handleApplePayErrorForSdk = handleApplePayError as ((
  error: Error,
) => void) &
  ReactEventHandler<HTMLElement>;

export function WalletCheckoutAction(props: WalletCheckoutActionProps) {
  const createOrder = useWalletCreateOrder(props);
  const commonProps = {
    checkoutDraftId: props.checkoutDraftId,
    fulfillmentMode: props.fulfillmentMode,
    method: props.method,
  };

  if (props.method === "apple_pay") {
    return <ApplePayWalletAction {...props} createOrder={createOrder} />;
  }

  if (props.method === "google_pay") {
    return (
      <WalletActionShell
        {...commonProps}
        statusLabel="Google Pay runtime pending."
      >
        <GooglePayRuntimeSurface
          createOrder={createOrder}
          currencyCode={props.currencyCode}
          market={props.market}
          storeDisplayName={props.storeDisplayName}
          totalLabel={props.totalLabel}
        />
      </WalletActionShell>
    );
  }

  return (
    <WalletActionShell
      {...commonProps}
      statusLabel="Venmo payment button ready."
    >
      <VenmoOneTimePaymentButton
        createOrder={createOrder}
        onApprove={handleVenmoApprove}
        onCancel={handleVenmoCancel}
        onError={handleVenmoError}
        presentationMode="auto"
        type="pay"
      />
    </WalletActionShell>
  );
}

export function buildWalletCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
  method,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly method: WalletPaymentMethod;
}): WalletCreateOrderRequest {
  return {
    path:
      fulfillmentMode === "pickup"
        ? "/api/paypal/orders/bopis"
        : "/api/paypal/orders/delivery",
    body: {
      checkout_draft_id: checkoutDraftId,
      method,
    },
    query: {
      market,
    },
  };
}

function WalletActionShell({
  children,
  checkoutDraftId,
  fulfillmentMode,
  method,
  statusLabel,
}: {
  readonly children: ReactNode;
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly method: WalletPaymentMethod;
  readonly statusLabel: string;
}) {
  return (
    <div
      className="wallet-checkout-action"
      data-payment-action-placement="order-summary"
      data-payment-checkout-draft-id={checkoutDraftId}
      data-payment-fulfillment-mode={fulfillmentMode}
      data-payment-method={method}
      data-wallet-method={method}
      data-wallet-required-component={requiredComponentByMethod[method]}
    >
      <StatusRegion
        id={`${method}-${fulfillmentMode}-button-status`}
        className="sr-only"
      >
        {statusLabel}
      </StatusRegion>
      {children}
    </div>
  );
}

function GooglePayRuntimeSurface({
  createOrder,
  currencyCode,
  market,
  storeDisplayName,
  totalLabel,
}: {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly currencyCode: string;
  readonly market: string;
  readonly storeDisplayName: string;
  readonly totalLabel: string;
}) {
  const paypal = usePayPal();
  const hasGooglePaySession =
    typeof paypal.sdkInstance?.createGooglePayOneTimePaymentSession ===
    "function";
  const hasGooglePaymentsClient =
    typeof globalThis.window !== "undefined" &&
    typeof globalThis.window.google?.payments?.api?.PaymentsClient ===
      "function";
  const readinessLabel =
    hasGooglePaySession && hasGooglePaymentsClient
      ? "Google Pay runtime ready."
      : "Google Pay runtime pending.";
  const debugPayload = useMemo(
    () => ({
      amount: normalizePayLaterMessageAmount(totalLabel),
      currencyCode,
      googlePaymentsClientAvailable: hasGooglePaymentsClient,
      market,
      paypalGooglePaySessionAvailable: hasGooglePaySession,
      storeDisplayName,
    }),
    [
      currencyCode,
      hasGooglePaySession,
      hasGooglePaymentsClient,
      market,
      storeDisplayName,
      totalLabel,
    ],
  );

  return (
    <div
      className="wallet-checkout-action__google-pay"
      data-google-pay-runtime-status={
        hasGooglePaySession && hasGooglePaymentsClient ? "ready" : "pending"
      }
    >
      <StatusRegion id="google-pay-runtime-status" className="sr-only">
        {readinessLabel}
      </StatusRegion>
      <button
        className="wallet-checkout-action__google-pay-button"
        disabled={!hasGooglePaySession || !hasGooglePaymentsClient}
        onClick={() => {
          console.info("[paypal-retail-demo] Google Pay runtime requested", {
            ...debugPayload,
          });
          void createOrder();
        }}
        type="button"
      >
        Google Pay
      </button>
    </div>
  );
}

function ApplePayWalletAction({
  checkoutDraftId,
  createOrder,
  currencyCode,
  fulfillmentMode,
  market,
  method,
  storeDisplayName,
  totalLabel,
}: WalletCheckoutActionProps & {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
}) {
  const amount = normalizePayLaterMessageAmount(totalLabel);
  const { eligiblePaymentMethods, error, isLoading } = useEligibleMethods({
    payload: {
      amount,
      currencyCode,
      paymentFlow: "ONE_TIME_PAYMENT",
    },
  });
  const applePayConfig =
    eligiblePaymentMethods?.isEligible("applepay") === true
      ? eligiblePaymentMethods.getDetails("applepay").config
      : null;
  const statusLabel = error
    ? "Apple Pay eligibility could not be checked."
    : isLoading || !applePayConfig
      ? "Apple Pay eligibility pending."
      : "Apple Pay button ready.";

  return (
    <WalletActionShell
      checkoutDraftId={checkoutDraftId}
      fulfillmentMode={fulfillmentMode}
      method={method}
      statusLabel={statusLabel}
    >
      {applePayConfig ? (
        <ApplePayOneTimePaymentButton
          applePayConfig={applePayConfig}
          applePaySessionVersion={4}
          buttonstyle="black"
          className="wallet-checkout-action__apple-pay-button"
          createOrder={createOrder}
          displayName={storeDisplayName}
          locale={market === "GB" ? "en-GB" : "en-US"}
          onApprove={handleApplePayApprove}
          onCancel={handleApplePayCancel}
          onError={handleApplePayErrorForSdk}
          paymentRequest={{
            countryCode: market,
            currencyCode,
            total: {
              amount,
              label: storeDisplayName,
              type: "final",
            },
          }}
          type="buy"
        />
      ) : null}
    </WalletActionShell>
  );
}

function useWalletCreateOrder({
  checkoutDraftId,
  fulfillmentMode,
  market,
  method,
}: WalletCheckoutActionProps) {
  const apiClient = useApiClient();

  return useCallback(async () => {
    const request = buildWalletCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
      method,
    });
    const order = await apiClient.post<PayPalCreateOrderResponse>(
      request.path,
      request.body,
      request.query,
    );

    console.info("[paypal-retail-demo] Wallet order created", {
      merchantOrderId: order.merchant_order_id ?? null,
      method,
      paymentSessionId: order.payment_session_id ?? null,
      paypalOrderId: order.paypal_order_id,
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [apiClient, checkoutDraftId, fulfillmentMode, market, method]);
}

function handleApplePayApprove(data: ConfirmOrderResponse) {
  console.info("[paypal-retail-demo] Apple Pay order approved", {
    paypalOrderId: data.approveApplePayPayment.id,
    status: data.approveApplePayPayment.status,
  });
}

function handleApplePayCancel() {
  console.info("[paypal-retail-demo] Apple Pay order canceled");
}

function handleApplePayError(error: Error) {
  console.error("[paypal-retail-demo] Apple Pay order error", {
    message: error.message,
  });
}

async function handleVenmoApprove(data: OnApproveDataOneTimePayments) {
  console.info("[paypal-retail-demo] Venmo order approved", {
    payerId: data.payerId ?? null,
    paypalOrderId: data.orderId,
  });
}

function handleVenmoCancel(data: OnCancelDataOneTimePayments) {
  console.info("[paypal-retail-demo] Venmo order canceled", {
    paypalOrderId: data.orderId ?? null,
  });
}

function handleVenmoError(error: OnErrorData) {
  console.error("[paypal-retail-demo] Venmo order error", {
    code: error.code,
    message: error.message,
    recoverable: error.isRecoverable,
  });
}

declare global {
  interface Window {
    readonly google?: {
      readonly payments?: {
        readonly api?: {
          readonly PaymentsClient?: unknown;
        };
      };
    };
  }
}

import {
  ApplePayOneTimePaymentButton,
  VenmoOneTimePaymentButton,
  useEligibleMethods,
  useGooglePayOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";
import {
  useCallback,
  useEffect,
  useRef,
  type ReactEventHandler,
  type ReactNode,
} from "react";
import type {
  ConfirmOrderResponse,
  GooglePayApprovePaymentResponse,
  GooglePayConfigFromFindEligibleMethods,
  OnApproveDataOneTimePayments,
  OnCancelDataOneTimePayments,
  OnErrorData,
} from "@paypal/paypal-js/sdk-v6";

import {
  type ApiQueryParams,
  type ApiRequestOptions,
} from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";
import { usePayPalSdkConfig } from "./PayPalSdkProviderScope.js";
import { normalizePayLaterMessageAmount } from "./payLaterRuntime.js";

export type WalletPaymentMethod = "apple_pay" | "google_pay" | "venmo";

export interface WalletCheckoutActionProps {
  readonly checkoutDraftId: string;
  readonly currencyCode: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly method: WalletPaymentMethod;
  readonly onApproved?: (
    context: WalletCheckoutApprovedContext,
  ) => Promise<void> | void;
  readonly requestOptions?: ApiRequestOptions | undefined;
  readonly storeDisplayName: string;
  readonly totalLabel: string;
}

export interface WalletCheckoutApprovedContext {
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly method: WalletPaymentMethod;
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface WalletCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: WalletPaymentMethod;
  };
  readonly query: ApiQueryParams;
  readonly options?: ApiRequestOptions | undefined;
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
  const { createOrder, lastCreatedOrder } = useWalletCreateOrder(props);
  const handleApproved = useCallback(
    async (paypalOrderId: string) => {
      await props.onApproved?.({
        fulfillmentMode: props.fulfillmentMode,
        method: props.method,
        paypalOrderId,
        ...(lastCreatedOrder.current?.payment_session_id
          ? { paymentSessionId: lastCreatedOrder.current.payment_session_id }
          : {}),
      });
    },
    [props.fulfillmentMode, props.method, props.onApproved],
  );
  const commonProps = {
    checkoutDraftId: props.checkoutDraftId,
    fulfillmentMode: props.fulfillmentMode,
    method: props.method,
  };

  if (props.method === "apple_pay") {
    return (
      <ApplePayWalletAction
        {...props}
        createOrder={createOrder}
        onWalletApproved={handleApproved}
      />
    );
  }

  if (props.method === "google_pay") {
    return (
      <GooglePayWalletAction
        {...props}
        createOrder={createOrder}
        onWalletApproved={handleApproved}
      />
    );
  }

  return (
    <WalletActionShell
      {...commonProps}
      statusLabel="Venmo payment button ready."
    >
      <VenmoOneTimePaymentButton
        createOrder={createOrder}
        onApprove={async (data) => {
          handleVenmoApprove(data);
          await handleApproved(data.orderId);
        }}
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
  requestOptions,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly method: WalletPaymentMethod;
  readonly requestOptions?: ApiRequestOptions | undefined;
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
    ...(requestOptions ? { options: requestOptions } : {}),
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

function GooglePayWalletAction({
  checkoutDraftId,
  createOrder,
  currencyCode,
  fulfillmentMode,
  market,
  method,
  onWalletApproved,
  totalLabel,
}: WalletCheckoutActionProps & {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly onWalletApproved: (paypalOrderId: string) => Promise<void>;
}) {
  const amount = normalizePayLaterMessageAmount(totalLabel);
  const { environment } = usePayPalSdkConfig();
  const { eligiblePaymentMethods, error, isLoading } = useEligibleMethods({
    payload: {
      amount,
      currencyCode,
      paymentFlow: "ONE_TIME_PAYMENT",
    },
  });
  const googlePayConfig =
    eligiblePaymentMethods?.isEligible("googlepay") === true
      ? eligiblePaymentMethods.getDetails("googlepay").config
      : null;
  const statusLabel = error
    ? "Google Pay eligibility could not be checked."
    : isLoading || !googlePayConfig
      ? "Google Pay eligibility pending."
      : "Google Pay button ready.";

  return (
    <WalletActionShell
      checkoutDraftId={checkoutDraftId}
      fulfillmentMode={fulfillmentMode}
      method={method}
      statusLabel={statusLabel}
    >
      {googlePayConfig ? (
        <GooglePayButtonHost
          createOrder={createOrder}
          environment={environment === "production" ? "PRODUCTION" : "TEST"}
          googlePayConfig={googlePayConfig}
          onApprove={async (data) => {
            handleGooglePayApprove(data);
            await onWalletApproved(data.id);
          }}
          transactionInfo={{
            countryCode: market,
            currencyCode,
            totalPrice: amount,
            totalPriceStatus: "FINAL",
          }}
        />
      ) : null}
    </WalletActionShell>
  );
}

function GooglePayButtonHost({
  createOrder,
  environment,
  googlePayConfig,
  onApprove,
  transactionInfo,
}: {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly environment: "TEST" | "PRODUCTION";
  readonly googlePayConfig: GooglePayConfigFromFindEligibleMethods;
  readonly onApprove: (
    data: GooglePayApprovePaymentResponse,
  ) => Promise<void> | void;
  readonly transactionInfo: {
    readonly countryCode: string;
    readonly currencyCode: string;
    readonly totalPrice: string;
    readonly totalPriceStatus: "FINAL";
  };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { createGooglePayButton, handleClick, handleDestroy, isPending } =
    useGooglePayOneTimePaymentSession({
      createOrder,
      environment,
      googlePayConfig,
      onApprove,
      onCancel: handleGooglePayCancel,
      onError: handleGooglePayError,
      transactionInfo,
    });
  const handleClickRef = useRef(handleClick);
  handleClickRef.current = handleClick;

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (isPending) {
      container.replaceChildren();
      return;
    }

    let isCurrent = true;
    void createGooglePayButton({
      buttonColor: "black",
      buttonSizeMode: "fill",
      buttonType: "pay",
      onClick: () => {
        void handleClickRef.current();
      },
    }).then((button) => {
      if (isCurrent && button) {
        container.replaceChildren(button);
      }
    });

    return () => {
      isCurrent = false;
      container.replaceChildren();
    };
  }, [createGooglePayButton, isPending]);

  useEffect(
    () => () => {
      handleDestroy();
    },
    [handleDestroy],
  );

  return (
    <div
      ref={containerRef}
      className="wallet-checkout-action__google-pay"
      data-google-pay-runtime-status={isPending ? "pending" : "ready"}
    />
  );
}

function ApplePayWalletAction({
  checkoutDraftId,
  createOrder,
  currencyCode,
  fulfillmentMode,
  market,
  method,
  onWalletApproved,
  storeDisplayName,
  totalLabel,
}: WalletCheckoutActionProps & {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly onWalletApproved: (paypalOrderId: string) => Promise<void>;
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
          onApproveCompleted={async (data) => {
            await onWalletApproved(data.approveApplePayPayment.id);
          }}
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
  requestOptions,
}: WalletCheckoutActionProps) {
  const apiClient = useApiClient();
  const lastCreatedOrder = useRef<PayPalCreateOrderResponse | null>(null);

  const createOrder = useCallback(async () => {
    const request = buildWalletCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
      method,
      requestOptions,
    });
    const order = await apiClient.post<PayPalCreateOrderResponse>(
      request.path,
      request.body,
      request.query,
      request.options,
    );
    lastCreatedOrder.current = order;

    console.info("[paypal-retail-demo] Wallet order created", {
      merchantOrderId: order.merchant_order_id ?? null,
      method,
      paymentSessionId: order.payment_session_id ?? null,
      paypalOrderId: order.paypal_order_id,
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [
    apiClient,
    checkoutDraftId,
    fulfillmentMode,
    market,
    method,
    requestOptions,
  ]);

  return {
    createOrder,
    lastCreatedOrder,
  };
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

function handleGooglePayApprove(data: GooglePayApprovePaymentResponse) {
  console.info("[paypal-retail-demo] Google Pay order approved", {
    paypalOrderId: data.id,
    status: data.status,
  });
}

function handleGooglePayCancel() {
  console.info("[paypal-retail-demo] Google Pay order canceled");
}

function handleGooglePayError(error: Error) {
  console.error("[paypal-retail-demo] Google Pay order error", {
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

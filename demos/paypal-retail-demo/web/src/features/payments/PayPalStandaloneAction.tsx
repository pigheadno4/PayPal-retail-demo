import { PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useState } from "react";
import type {
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
import {
  PaymentActionFailureNotice,
  usePaymentActionFailure,
} from "./paymentActionFailure.js";

export interface PayPalCreateOrderResponse {
  readonly paypal_order_id: string;
  readonly payment_session_id?: string;
  readonly merchant_order_id?: string;
  readonly paypal_order_status?: string;
  readonly paypal_request_id?: string;
  readonly approval_url?: string | null;
}

export interface PayPalStandaloneActionProps {
  readonly canSavePaymentMethod?: boolean;
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly requestOptions?: ApiRequestOptions | undefined;
}

export interface PayPalCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "paypal";
    readonly vault_requested?: true;
  };
  readonly query: ApiQueryParams;
  readonly options?: ApiRequestOptions | undefined;
}

export function PayPalStandaloneAction({
  canSavePaymentMethod = false,
  checkoutDraftId,
  fulfillmentMode,
  market,
  requestOptions,
}: PayPalStandaloneActionProps) {
  const apiClient = useApiClient();
  const [vaultRequested, setVaultRequested] = useState(false);
  const effectiveVaultRequested = canSavePaymentMethod && vaultRequested;
  const {
    captureCreateOrderFailure,
    captureSdkFailure,
    clearFailure,
    failure,
  } = usePaymentActionFailure("PayPal");
  const createOrder = useCallback(async () => {
    clearFailure();
    const request = buildPayPalCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
      requestOptions,
      vaultRequested: effectiveVaultRequested,
    });
    let order: PayPalCreateOrderResponse;

    try {
      order = await apiClient.post<PayPalCreateOrderResponse>(
        request.path,
        request.body,
        request.query,
        request.options,
      );
    } catch (error) {
      const actionFailure = captureCreateOrderFailure(error);
      console.error("[paypal-retail-demo] PayPal create-order failed", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
      });
      throw error;
    }

    console.info("[paypal-retail-demo] PayPal order created", {
      paypalOrderId: order.paypal_order_id,
      paymentSessionId: order.payment_session_id ?? null,
      merchantOrderId: order.merchant_order_id ?? null,
      vaultRequested: effectiveVaultRequested,
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [
    apiClient,
    captureCreateOrderFailure,
    checkoutDraftId,
    clearFailure,
    effectiveVaultRequested,
    fulfillmentMode,
    market,
    requestOptions,
  ]);

  const handleApprove = useCallback(
    async (data: OnApproveDataOneTimePayments) => {
      console.info("[paypal-retail-demo] PayPal order approved", {
        paypalOrderId: data.orderId,
        payerId: data.payerId ?? null,
      });
    },
    [],
  );

  return (
    <div
      className="paypal-standalone-action"
      data-payment-action-placement="order-summary"
      data-payment-checkout-draft-id={checkoutDraftId}
      data-payment-fulfillment-mode={fulfillmentMode}
      data-payment-method="paypal"
    >
      <StatusRegion
        id={`paypal-${fulfillmentMode}-button-status`}
        className="sr-only"
      >
        PayPal payment button ready.
      </StatusRegion>
      <PayPalOneTimePaymentButton
        createOrder={createOrder}
        onApprove={handleApprove}
        onCancel={handleCancel}
        onError={(error) => {
          captureSdkFailure(error);
          handleError(error);
        }}
        presentationMode="auto"
        type="pay"
      />
      <PaymentActionFailureNotice failure={failure} onRetry={clearFailure} />
      {canSavePaymentMethod ? (
        <label className="paypal-standalone-action__save">
          <input
            checked={vaultRequested}
            onChange={(event) => setVaultRequested(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Save PayPal for future purchases</span>
        </label>
      ) : null}
    </div>
  );
}

export function buildPayPalCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
  requestOptions,
  vaultRequested,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly requestOptions?: ApiRequestOptions | undefined;
  readonly vaultRequested?: boolean;
}): PayPalCreateOrderRequest {
  return {
    path:
      fulfillmentMode === "pickup"
        ? "/api/paypal/orders/bopis"
        : "/api/paypal/orders/delivery",
    body: {
      checkout_draft_id: checkoutDraftId,
      method: "paypal",
      ...(vaultRequested ? { vault_requested: true } : {}),
    },
    query: {
      market,
    },
    ...(requestOptions ? { options: requestOptions } : {}),
  };
}

function handleCancel(data: OnCancelDataOneTimePayments) {
  console.info("[paypal-retail-demo] PayPal order canceled", {
    paypalOrderId: data.orderId ?? null,
  });
}

function handleError(error: OnErrorData) {
  console.error("[paypal-retail-demo] PayPal order error", {
    code: error.code,
    message: error.message,
    recoverable: error.isRecoverable,
  });
}

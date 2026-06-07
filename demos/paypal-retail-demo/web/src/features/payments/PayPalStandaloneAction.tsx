import { PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useState } from "react";
import type {
  OnApproveDataOneTimePayments,
  OnCancelDataOneTimePayments,
  OnErrorData,
} from "@paypal/paypal-js/sdk-v6";

import { type ApiQueryParams } from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";

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
}

export interface PayPalCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "paypal";
    readonly vault_requested?: true;
  };
  readonly query: ApiQueryParams;
}

export function PayPalStandaloneAction({
  canSavePaymentMethod = false,
  checkoutDraftId,
  fulfillmentMode,
  market,
}: PayPalStandaloneActionProps) {
  const apiClient = useApiClient();
  const [vaultRequested, setVaultRequested] = useState(false);
  const effectiveVaultRequested = canSavePaymentMethod && vaultRequested;
  const createOrder = useCallback(async () => {
    const request = buildPayPalCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
      vaultRequested: effectiveVaultRequested,
    });
    const order = await apiClient.post<PayPalCreateOrderResponse>(
      request.path,
      request.body,
      request.query,
    );

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
    checkoutDraftId,
    effectiveVaultRequested,
    fulfillmentMode,
    market,
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
        onError={handleError}
        presentationMode="auto"
        type="pay"
      />
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
  vaultRequested,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
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

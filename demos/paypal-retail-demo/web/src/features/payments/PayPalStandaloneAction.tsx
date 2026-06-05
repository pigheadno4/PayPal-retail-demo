import { PayPalOneTimePaymentButton } from "@paypal/react-paypal-js/sdk-v6";
import { useCallback } from "react";
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
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
}

export interface PayPalCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "paypal";
  };
  readonly query: ApiQueryParams;
}

export function PayPalStandaloneAction({
  checkoutDraftId,
  fulfillmentMode,
  market,
}: PayPalStandaloneActionProps) {
  const apiClient = useApiClient();
  const createOrder = useCallback(async () => {
    const request = buildPayPalCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
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
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [apiClient, checkoutDraftId, fulfillmentMode, market]);

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
    </div>
  );
}

export function buildPayPalCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
}): PayPalCreateOrderRequest {
  return {
    path:
      fulfillmentMode === "pickup"
        ? "/api/paypal/orders/bopis"
        : "/api/paypal/orders/delivery",
    body: {
      checkout_draft_id: checkoutDraftId,
      method: "paypal",
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

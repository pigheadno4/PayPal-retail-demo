import {
  PayLaterOneTimePaymentButton,
  PayPalOneTimePaymentButton,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useRef } from "react";
import type {
  OnApproveDataOneTimePayments,
  OnCancelDataOneTimePayments,
  OnErrorData,
} from "@paypal/paypal-js/sdk-v6";

import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import {
  buildDeliveryExpressCreateOrderRequest,
  formatDeliveryExpressMethod,
  formatDeliveryExpressSource,
  type DeliveryExpressPaymentMethod,
  type DeliveryExpressSource,
} from "./deliveryExpress.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";

export interface DeliveryExpressApprovedContext {
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface DeliveryExpressActionProps {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
  readonly market: string;
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
  readonly onBeforeCreateOrder?: () => void | Promise<void>;
  readonly onApproved?: (
    context: DeliveryExpressApprovedContext,
  ) => void | Promise<void>;
}

export function DeliveryExpressAction({
  cartClientSecret,
  cartPublicId,
  market,
  method,
  source,
  onBeforeCreateOrder,
  onApproved,
}: DeliveryExpressActionProps) {
  const apiClient = useApiClient();
  const lastCreatedOrder = useRef<PayPalCreateOrderResponse | null>(null);
  const methodLabel = formatDeliveryExpressMethod(method);
  const createOrder = useCallback(async () => {
    await onBeforeCreateOrder?.();
    const request = buildDeliveryExpressCreateOrderRequest({
      cartClientSecret,
      cartPublicId,
      market,
      method,
    });
    const order = await apiClient.post<PayPalCreateOrderResponse>(
      request.path,
      request.body,
      request.query,
      request.options,
    );

    lastCreatedOrder.current = order;
    console.info("[paypal-retail-demo] Delivery express order created", {
      paypalOrderId: order.paypal_order_id,
      paymentSessionId: order.payment_session_id ?? null,
      merchantOrderId: order.merchant_order_id ?? null,
      method,
      source,
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [
    apiClient,
    cartClientSecret,
    cartPublicId,
    market,
    method,
    onBeforeCreateOrder,
    source,
  ]);

  const handleApprove = useCallback(
    async (data: OnApproveDataOneTimePayments) => {
      console.info("[paypal-retail-demo] Delivery express order approved", {
        paypalOrderId: data.orderId,
        payerId: data.payerId ?? null,
        method,
        source,
      });

      await onApproved?.({
        method,
        source,
        paypalOrderId: data.orderId,
        ...(lastCreatedOrder.current?.payment_session_id
          ? { paymentSessionId: lastCreatedOrder.current.payment_session_id }
          : {}),
      });
    },
    [method, onApproved, source],
  );

  return (
    <div
      className="delivery-express-action"
      data-delivery-express-cart-id={cartPublicId}
      data-delivery-express-method={method}
      data-delivery-express-source={source}
      data-delivery-express-source-label={formatDeliveryExpressSource(source)}
    >
      <StatusRegion
        id={`delivery-express-${source}-${method}-status`}
        className="sr-only"
      >
        {methodLabel} delivery express button ready.
      </StatusRegion>
      {method === "paylater" ? (
        <PayLaterOneTimePaymentButton
          createOrder={createOrder}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onError={handleError}
          presentationMode="auto"
        />
      ) : (
        <PayPalOneTimePaymentButton
          createOrder={createOrder}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onError={handleError}
          presentationMode="auto"
          type="pay"
        />
      )}
    </div>
  );
}

function handleCancel(data: OnCancelDataOneTimePayments) {
  console.info("[paypal-retail-demo] Delivery express order canceled", {
    paypalOrderId: data.orderId ?? null,
  });
}

function handleError(error: OnErrorData) {
  console.error("[paypal-retail-demo] Delivery express order error", {
    code: error.code,
    message: error.message,
    recoverable: error.isRecoverable,
  });
}

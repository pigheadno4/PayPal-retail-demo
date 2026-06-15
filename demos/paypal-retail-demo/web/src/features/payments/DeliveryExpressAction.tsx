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
import { usePayLaterButtonEligibility } from "./payLaterRuntime.js";
import {
  PaymentActionFailureNotice,
  usePaymentActionFailure,
} from "./paymentActionFailure.js";

export interface DeliveryExpressApprovedContext {
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface DeliveryExpressActionProps {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
  readonly currencyCode: string;
  readonly market: string;
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
  readonly totalLabel: string;
  readonly onBeforeCreateOrder?: () => void | Promise<void>;
  readonly onApproved?: (
    context: DeliveryExpressApprovedContext,
  ) => void | Promise<void>;
}

export function DeliveryExpressAction({
  cartClientSecret,
  cartPublicId,
  currencyCode,
  market,
  method,
  source,
  totalLabel,
  onBeforeCreateOrder,
  onApproved,
}: DeliveryExpressActionProps) {
  const apiClient = useApiClient();
  const lastCreatedOrder = useRef<PayPalCreateOrderResponse | null>(null);
  const methodLabel = formatDeliveryExpressMethod(method);
  const {
    captureCreateOrderFailure,
    captureSdkFailure,
    clearFailure,
    failure,
  } = usePaymentActionFailure(`${methodLabel} delivery express`);
  const createOrder = useCallback(async () => {
    clearFailure();
    let order: PayPalCreateOrderResponse;

    try {
      await onBeforeCreateOrder?.();
      const request = buildDeliveryExpressCreateOrderRequest({
        cartClientSecret,
        cartPublicId,
        market,
        method,
      });
      order = await apiClient.post<PayPalCreateOrderResponse>(
        request.path,
        request.body,
        request.query,
        request.options,
      );
    } catch (error) {
      const actionFailure = captureCreateOrderFailure(error);
      console.error(
        "[paypal-retail-demo] Delivery express create-order failed",
        {
          code: actionFailure.code,
          debugId: actionFailure.debugId ?? null,
          method,
          source,
        },
      );
      throw error;
    }

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
    captureCreateOrderFailure,
    cartClientSecret,
    cartPublicId,
    clearFailure,
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
      {method === "paylater" ? (
        <DeliveryExpressPayLaterButton
          createOrder={createOrder}
          onError={(error) => {
            captureSdkFailure(error);
            handleError(error);
          }}
          currencyCode={currencyCode}
          methodLabel={methodLabel}
          onApprove={handleApprove}
          source={source}
          totalLabel={totalLabel}
        />
      ) : (
        <>
          <StatusRegion
            id={`delivery-express-${source}-${method}-status`}
            className="sr-only"
          >
            {methodLabel} delivery express button ready.
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
        </>
      )}
      <PaymentActionFailureNotice failure={failure} onRetry={clearFailure} />
    </div>
  );
}

function DeliveryExpressPayLaterButton({
  createOrder,
  currencyCode,
  methodLabel,
  onError,
  onApprove,
  source,
  totalLabel,
}: {
  readonly createOrder: () => Promise<{ readonly orderId: string }>;
  readonly currencyCode: string;
  readonly methodLabel: string;
  readonly onError: (error: OnErrorData) => void;
  readonly onApprove: (data: OnApproveDataOneTimePayments) => Promise<void>;
  readonly source: DeliveryExpressSource;
  readonly totalLabel: string;
}) {
  const eligibility = usePayLaterButtonEligibility({
    currencyCode,
    totalLabel,
  });

  return (
    <>
      <StatusRegion
        id={`delivery-express-${source}-paylater-status`}
        className="sr-only"
      >
        {eligibility.status === "eligible"
          ? `${methodLabel} delivery express button ready.`
          : eligibility.statusLabel}
      </StatusRegion>
      {eligibility.status === "eligible" ? (
        <PayLaterOneTimePaymentButton
          createOrder={createOrder}
          onApprove={onApprove}
          onCancel={handleCancel}
          onError={onError}
          presentationMode="auto"
        />
      ) : null}
    </>
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

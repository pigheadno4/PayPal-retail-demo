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

import { type ApiRequestOptions } from "../../api/client.js";
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
import { PAYPAL_DEMO_PRESENTATION_MODE } from "./paymentPresentation.js";

export interface DeliveryExpressApprovedContext {
  readonly method: DeliveryExpressPaymentMethod;
  readonly source: DeliveryExpressSource;
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface DeliveryExpressCreateOrderCartContext {
  readonly cartClientSecret?: string | null | undefined;
  readonly cartPublicId: string;
  readonly requestOptions?: ApiRequestOptions | undefined;
}

export interface DeliveryExpressActionProps {
  readonly cartClientSecret?: string | null | undefined;
  readonly cartPublicId: string;
  readonly currencyCode: string;
  readonly market: string;
  readonly method: DeliveryExpressPaymentMethod;
  readonly requestOptions?: ApiRequestOptions | undefined;
  readonly source: DeliveryExpressSource;
  readonly totalLabel: string;
  readonly onBeforeCreateOrder?: () =>
    | DeliveryExpressCreateOrderCartContext
    | Promise<DeliveryExpressCreateOrderCartContext | void>
    | void;
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
  requestOptions,
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
    console.info(
      "[paypal-retail-demo] Delivery express create-order starting",
      {
        cartPublicId,
        currencyCode,
        hasAuthHeader: hasAuthorizationHeader(requestOptions),
        hasCartClientSecret: Boolean(cartClientSecret?.trim()),
        market,
        method,
        source,
        totalLabel,
      },
    );
    let order: PayPalCreateOrderResponse;
    let createOrderCart: DeliveryExpressCreateOrderCartContext = {
      cartClientSecret,
      cartPublicId,
      requestOptions,
    };
    let stage: "pre_create_refresh" | "build_request" | "api_create_order" =
      "pre_create_refresh";

    try {
      const refreshedCart = await onBeforeCreateOrder?.();
      createOrderCart = refreshedCart ?? createOrderCart;
      stage = "build_request";
      const request = buildDeliveryExpressCreateOrderRequest({
        cartClientSecret: createOrderCart.cartClientSecret,
        cartPublicId: createOrderCart.cartPublicId,
        market,
        method,
        requestOptions: createOrderCart.requestOptions,
      });
      stage = "api_create_order";
      console.info(
        "[paypal-retail-demo] Delivery express create-order request prepared",
        {
          cartPublicId: createOrderCart.cartPublicId,
          hasAuthHeader: hasAuthorizationHeader(request.options),
          hasCartClientSecret: Boolean(
            createOrderCart.cartClientSecret?.trim(),
          ),
          market,
          method,
          path: request.path,
          source,
          totalLabel,
        },
      );
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
          cartPublicId: createOrderCart.cartPublicId,
          code: actionFailure.code,
          debugId: actionFailure.debugId ?? null,
          method,
          source,
          stage,
          totalLabel,
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
    currencyCode,
    market,
    method,
    onBeforeCreateOrder,
    requestOptions,
    source,
    totalLabel,
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
            presentationMode={PAYPAL_DEMO_PRESENTATION_MODE}
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
  const eligibilityStatus =
    eligibility.status === "loading" ? "pending" : eligibility.status;

  return (
    <div data-paylater-button-eligibility={eligibilityStatus}>
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
          presentationMode={PAYPAL_DEMO_PRESENTATION_MODE}
        />
      ) : null}
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

function hasAuthorizationHeader(
  requestOptions: ApiRequestOptions | undefined,
): boolean {
  return Object.entries(requestOptions?.headers ?? {}).some(
    ([name, value]) =>
      name.toLowerCase() === "authorization" && value.trim().length > 0,
  );
}

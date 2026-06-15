import {
  PayLaterOneTimePaymentButton,
  usePayPalMessages,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect } from "react";
import type {
  OnApproveDataOneTimePayments,
  OnCancelDataOneTimePayments,
  OnErrorData,
} from "@paypal/paypal-js/sdk-v6";

import { type ApiQueryParams } from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";
import {
  normalizePayLaterMessageAmount,
  usePayLaterButtonEligibility,
} from "./payLaterRuntime.js";
import {
  PaymentActionFailureNotice,
  usePaymentActionFailure,
} from "./paymentActionFailure.js";

export interface PayLaterStandaloneActionProps {
  readonly buyerCountry: string;
  readonly checkoutDraftId: string;
  readonly currencyCode: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly totalLabel: string;
}

export interface PayLaterAmountMessageProps {
  readonly amountLabel: string;
  readonly buyerCountry: string;
  readonly currencyCode: string;
  readonly placement: "payment-row" | "order-summary";
}

export interface PayLaterCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "paylater";
  };
  readonly query: ApiQueryParams;
}

export function PayLaterStandaloneAction({
  buyerCountry,
  checkoutDraftId,
  currencyCode,
  fulfillmentMode,
  market,
  totalLabel,
}: PayLaterStandaloneActionProps) {
  const apiClient = useApiClient();
  const eligibility = usePayLaterButtonEligibility({
    currencyCode,
    totalLabel,
  });
  const {
    captureCreateOrderFailure,
    captureSdkFailure,
    clearFailure,
    failure,
  } = usePaymentActionFailure("Pay Later");
  const createOrder = useCallback(async () => {
    clearFailure();
    const request = buildPayLaterCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
    });
    let order: PayPalCreateOrderResponse;

    try {
      order = await apiClient.post<PayPalCreateOrderResponse>(
        request.path,
        request.body,
        request.query,
      );
    } catch (error) {
      const actionFailure = captureCreateOrderFailure(error);
      console.error("[paypal-retail-demo] Pay Later create-order failed", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
      });
      throw error;
    }

    console.info("[paypal-retail-demo] Pay Later order created", {
      paypalOrderId: order.paypal_order_id,
      paymentSessionId: order.payment_session_id ?? null,
      merchantOrderId: order.merchant_order_id ?? null,
    });

    return {
      orderId: order.paypal_order_id,
    };
  }, [
    apiClient,
    captureCreateOrderFailure,
    checkoutDraftId,
    clearFailure,
    fulfillmentMode,
    market,
  ]);

  const handleApprove = useCallback(
    async (data: OnApproveDataOneTimePayments) => {
      console.info("[paypal-retail-demo] Pay Later order approved", {
        paypalOrderId: data.orderId,
        payerId: data.payerId ?? null,
      });
    },
    [],
  );

  return (
    <div
      className="paylater-standalone-action"
      data-payment-action-placement="order-summary"
      data-payment-checkout-draft-id={checkoutDraftId}
      data-payment-fulfillment-mode={fulfillmentMode}
      data-payment-method="paylater"
    >
      <PayLaterAmountMessage
        amountLabel={totalLabel}
        buyerCountry={buyerCountry}
        currencyCode={currencyCode}
        placement="order-summary"
      />
      <StatusRegion
        id={`paylater-${fulfillmentMode}-button-status`}
        className="sr-only"
      >
        {eligibility.statusLabel}
      </StatusRegion>
      {eligibility.status === "eligible" ? (
        <PayLaterOneTimePaymentButton
          createOrder={createOrder}
          onApprove={handleApprove}
          onCancel={handleCancel}
          onError={(error) => {
            captureSdkFailure(error);
            handleError(error);
          }}
          presentationMode="auto"
        />
      ) : null}
      <PaymentActionFailureNotice failure={failure} onRetry={clearFailure} />
    </div>
  );
}

export function PayLaterAmountMessage({
  amountLabel,
  buyerCountry,
  currencyCode,
  placement,
}: PayLaterAmountMessageProps) {
  const amount = normalizePayLaterMessageAmount(amountLabel);
  const { error } = usePayPalMessages({
    buyerCountry,
    currencyCode,
  });

  useEffect(() => {
    if (error) {
      console.error("[paypal-retail-demo] Pay Later message error", {
        message: error.message,
      });
    }
  }, [error]);

  return (
    <div
      className="paylater-amount-message"
      data-paylater-message-amount={amount}
      data-paylater-message-buyer-country={buyerCountry}
      data-paylater-message-currency-code={currencyCode}
      data-paylater-message-placement={placement}
    >
      <StatusRegion
        id={`paylater-${placement}-message-status`}
        className="sr-only"
      >
        Pay Later message ready for {amountLabel}.
      </StatusRegion>
      <paypal-message
        amount={amount}
        auto-bootstrap={true}
        buyer-country={buyerCountry}
        currency-code={currencyCode}
        logo-position="INLINE"
        logo-type="WORDMARK"
        text-color="BLACK"
      />
    </div>
  );
}

export function buildPayLaterCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
}): PayLaterCreateOrderRequest {
  return {
    path:
      fulfillmentMode === "pickup"
        ? "/api/paypal/orders/bopis"
        : "/api/paypal/orders/delivery",
    body: {
      checkout_draft_id: checkoutDraftId,
      method: "paylater",
    },
    query: {
      market,
    },
  };
}

function handleCancel(data: OnCancelDataOneTimePayments) {
  console.info("[paypal-retail-demo] Pay Later order canceled", {
    paypalOrderId: data.orderId ?? null,
  });
}

function handleError(error: OnErrorData) {
  console.error("[paypal-retail-demo] Pay Later order error", {
    code: error.code,
    message: error.message,
    recoverable: error.isRecoverable,
  });
}

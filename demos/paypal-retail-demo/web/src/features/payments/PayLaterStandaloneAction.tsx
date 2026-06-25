import {
  PayLaterOneTimePaymentButton,
  usePayPalMessages,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";
import {
  normalizePayLaterMessageAmount,
  usePayLaterButtonEligibility,
} from "./payLaterRuntime.js";
import {
  PaymentActionFailureNotice,
  usePaymentActionFailure,
} from "./paymentActionFailure.js";
import { PAYPAL_DEMO_PRESENTATION_MODE } from "./paymentPresentation.js";

export interface PayLaterStandaloneActionProps {
  readonly buyerCountry: string;
  readonly checkoutDraftId: string;
  readonly currencyCode: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly onApproved?: (
    context: PayLaterStandaloneApprovedContext,
  ) => Promise<void> | void;
  readonly requestOptions?: ApiRequestOptions | undefined;
  readonly totalLabel: string;
}

export interface PayLaterStandaloneApprovedContext {
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly method: "paylater";
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface PayLaterAmountMessageProps {
  readonly amountLabel?: string;
  readonly buyerCountry: string;
  readonly currencyCode: string;
  readonly placement:
    | "cart-summary"
    | "catalog-promo"
    | "minicart-summary"
    | "order-summary"
    | "payment-row"
    | "product-detail";
}

export interface PayLaterCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "paylater";
  };
  readonly query: ApiQueryParams;
  readonly options?: ApiRequestOptions | undefined;
}

type PayLaterMessageRenderState = "loading" | "ready" | "fallback";

type PayPalMessageElement = HTMLElement & {
  readonly setContent?: (content: Record<string, unknown>) => void;
};

const payLaterMessageLoadingFallbackDelayMs = 2200;
const payLaterMessageEmptyFallbackDelayMs = 1200;

export function PayLaterStandaloneAction({
  buyerCountry,
  checkoutDraftId,
  currencyCode,
  fulfillmentMode,
  market,
  onApproved,
  requestOptions,
  totalLabel,
}: PayLaterStandaloneActionProps) {
  const apiClient = useApiClient();
  const lastCreatedOrder = useRef<PayPalCreateOrderResponse | null>(null);
  const eligibility = usePayLaterButtonEligibility({
    currencyCode,
    totalLabel,
  });
  const {
    captureApprovalFailure,
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
      requestOptions,
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
      console.error("[paypal-retail-demo] Pay Later create-order failed", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
      });
      throw error;
    }

    lastCreatedOrder.current = order;
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
    requestOptions,
  ]);

  const handleApprove = useCallback(
    async (data: OnApproveDataOneTimePayments) => {
      console.info("[paypal-retail-demo] Pay Later order approved", {
        paypalOrderId: data.orderId,
        payerId: data.payerId ?? null,
      });

      try {
        await onApproved?.({
          fulfillmentMode,
          method: "paylater",
          paypalOrderId: data.orderId,
          ...(lastCreatedOrder.current?.payment_session_id
            ? { paymentSessionId: lastCreatedOrder.current.payment_session_id }
            : {}),
        });
      } catch (error) {
        const actionFailure = captureApprovalFailure(error);
        console.error(
          "[paypal-retail-demo] Pay Later approval handling failed",
          {
            code: actionFailure.code,
            debugId: actionFailure.debugId ?? null,
            paypalOrderId: data.orderId,
          },
        );
        throw error;
      }
    },
    [captureApprovalFailure, fulfillmentMode, onApproved],
  );

  return (
    <div
      className="paylater-standalone-action"
      data-payment-action-placement="order-summary"
      data-payment-checkout-draft-id={checkoutDraftId}
      data-payment-fulfillment-mode={fulfillmentMode}
      data-payment-method="paylater"
    >
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
          presentationMode={PAYPAL_DEMO_PRESENTATION_MODE}
        />
      ) : null}
      <PayLaterAmountMessage
        amountLabel={totalLabel}
        buyerCountry={buyerCountry}
        currencyCode={currencyCode}
        placement="order-summary"
      />
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
  const messageElementRef = useRef<PayPalMessageElement | null>(null);
  const lastMessageRequestKey = useRef<string | null>(null);
  const [renderState, setRenderState] =
    useState<PayLaterMessageRenderState>("loading");
  const amount = amountLabel
    ? normalizePayLaterMessageAmount(amountLabel)
    : undefined;
  const { error, handleFetchContent, isReady } = usePayPalMessages({
    buyerCountry,
    currencyCode,
  });
  const fetchContentRef = useRef(handleFetchContent);
  const fallbackMessage = buildPayLaterMessageFallback(amountLabel);
  const shouldShowFallback = Boolean(error) || renderState === "fallback";
  const messageRequestKey = [
    placement,
    buyerCountry,
    currencyCode,
    amount ?? "no-amount",
  ].join(":");

  useEffect(() => {
    fetchContentRef.current = handleFetchContent;
  }, [handleFetchContent]);

  useEffect(() => {
    if (error) {
      console.error("[paypal-retail-demo] Pay Later message error", {
        buyerCountry,
        currencyCode,
        placement,
        message: error.message,
      });
    }
  }, [buyerCountry, currencyCode, error, placement]);

  useEffect(() => {
    if (error || renderState !== "loading") {
      return undefined;
    }

    const timerId = setTimeout(() => {
      setRenderState((currentState) => {
        if (currentState !== "loading") {
          return currentState;
        }
        console.warn("[paypal-retail-demo] Pay Later message timed out", {
          amount: amount ?? null,
          buyerCountry,
          currencyCode,
          placement,
        });
        return "fallback";
      });
    }, payLaterMessageLoadingFallbackDelayMs);

    return () => {
      clearTimeout(timerId);
    };
  }, [amount, buyerCountry, currencyCode, error, placement, renderState]);

  const applyMessageContent = useCallback(
    (content: Record<string, unknown>) => {
      const messageElement = messageElementRef.current;

      if (typeof messageElement?.setContent !== "function") {
        setRenderState("fallback");
        console.error(
          "[paypal-retail-demo] Pay Later message element unavailable",
          {
            amount: amount ?? null,
            buyerCountry,
            currencyCode,
            placement,
          },
        );
        return;
      }

      try {
        messageElement.setContent(content);
        setRenderState("ready");
      } catch (setContentError) {
        setRenderState("fallback");
        console.error(
          "[paypal-retail-demo] Pay Later message content apply failed",
          {
            amount: amount ?? null,
            buyerCountry,
            currencyCode,
            message:
              setContentError instanceof Error
                ? setContentError.message
                : String(setContentError),
            placement,
          },
        );
      }
    },
    [amount, buyerCountry, currencyCode, placement],
  );

  useEffect(() => {
    if (!isReady || lastMessageRequestKey.current === messageRequestKey) {
      return;
    }

    let isCurrent = true;
    let didApplyContent = false;
    lastMessageRequestKey.current = messageRequestKey;
    setRenderState("loading");

    void fetchContentRef
      .current({
        ...(amount ? { amount } : {}),
        buyerCountry,
        currencyCode,
        logoPosition: "INLINE",
        logoType: "WORDMARK",
        onReady: (content) => {
          if (!isCurrent) {
            return;
          }
          didApplyContent = true;
          applyMessageContent(content);
        },
        textColor: "BLACK",
      })
      .then((content) => {
        if (!isCurrent || didApplyContent || !content) {
          return;
        }
        didApplyContent = true;
        applyMessageContent(content);
      })
      .catch((fetchError: unknown) => {
        if (!isCurrent) {
          return;
        }
        setRenderState("fallback");
        console.error("[paypal-retail-demo] Pay Later message fetch failed", {
          amount: amount ?? null,
          buyerCountry,
          currencyCode,
          message:
            fetchError instanceof Error
              ? fetchError.message
              : String(fetchError),
          placement,
        });
      });

    return () => {
      isCurrent = false;
    };
  }, [
    amount,
    applyMessageContent,
    buyerCountry,
    currencyCode,
    isReady,
    messageRequestKey,
    placement,
  ]);

  useEffect(() => {
    if (renderState !== "ready") {
      return undefined;
    }

    const timerId = setTimeout(() => {
      if (hasRenderedPayLaterMessageContent(messageElementRef.current)) {
        return;
      }
      setRenderState("fallback");
      console.warn("[paypal-retail-demo] Pay Later message rendered empty", {
        amount: amount ?? null,
        buyerCountry,
        currencyCode,
        placement,
      });
    }, payLaterMessageEmptyFallbackDelayMs);

    return () => {
      clearTimeout(timerId);
    };
  }, [amount, buyerCountry, currencyCode, placement, renderState]);

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
        {shouldShowFallback
          ? fallbackMessage
          : renderState === "loading"
            ? "Pay Later message loading."
            : amountLabel
              ? `Pay Later message ready for ${amountLabel}.`
              : "Pay Later message ready."}
      </StatusRegion>
      <paypal-message
        ref={(element) => {
          messageElementRef.current = element as PayPalMessageElement | null;
        }}
        {...(amount ? { amount } : {})}
        buyer-country={buyerCountry}
        currency-code={currencyCode}
        logo-position="INLINE"
        logo-type="WORDMARK"
        text-color="BLACK"
      />
      {shouldShowFallback ? (
        <p className="paylater-amount-message__fallback" role="status">
          {fallbackMessage}
        </p>
      ) : null}
    </div>
  );
}

function hasRenderedPayLaterMessageContent(
  element: PayPalMessageElement | null,
): boolean {
  if (!element) {
    return false;
  }

  const lightDomText = element.textContent?.trim();

  if (lightDomText || element.childElementCount > 0) {
    return true;
  }

  return Boolean(
    element.shadowRoot?.textContent?.trim() ||
    element.shadowRoot?.childElementCount,
  );
}

export function buildPayLaterMessageFallback(amountLabel?: string): string {
  return amountLabel
    ? `Pay Later messaging is temporarily unavailable for ${amountLabel}. Select Pay Later to review PayPal-hosted options and terms.`
    : "Pay Later messaging is temporarily unavailable. Select Pay Later at checkout to review PayPal-hosted options and terms.";
}

export function buildPayLaterCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
  requestOptions,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly requestOptions?: ApiRequestOptions | undefined;
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
    ...(requestOptions ? { options: requestOptions } : {}),
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

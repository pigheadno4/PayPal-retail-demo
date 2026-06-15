import { useCallback, useState } from "react";
import type { OnErrorData } from "@paypal/paypal-js/sdk-v6";

import { ApiClientError } from "../../api/client.js";

export interface PaymentActionFailure {
  readonly code: string;
  readonly debugId?: string;
  readonly message: string;
  readonly title: string;
}

export function usePaymentActionFailure(methodLabel: string) {
  const [failure, setFailure] = useState<PaymentActionFailure | null>(null);

  const clearFailure = useCallback(() => {
    setFailure(null);
  }, []);

  const captureCreateOrderFailure = useCallback(
    (error: unknown) => {
      const nextFailure = formatPaymentActionFailure(error, methodLabel);
      setFailure(nextFailure);
      return nextFailure;
    },
    [methodLabel],
  );

  const captureSdkFailure = useCallback(
    (error: OnErrorData) => {
      const nextFailure = formatPayPalSdkFailure(error, methodLabel);
      setFailure((currentFailure) => currentFailure ?? nextFailure);
      return nextFailure;
    },
    [methodLabel],
  );

  return {
    captureCreateOrderFailure,
    captureSdkFailure,
    clearFailure,
    failure,
  };
}

export function PaymentActionFailureNotice({
  failure,
  onRetry,
}: {
  readonly failure: PaymentActionFailure | null;
  readonly onRetry: () => void;
}) {
  if (!failure) {
    return null;
  }

  return (
    <div
      className="payment-action-failure"
      data-payment-action-failure-code={failure.code}
      role="alert"
    >
      <strong>{failure.title}</strong>
      <p>{failure.message}</p>
      {failure.debugId ? (
        <p>
          Reference ID: <code>{failure.debugId}</code>
        </p>
      ) : null}
      <button onClick={onRetry} type="button">
        Try again
      </button>
    </div>
  );
}

export function formatPaymentActionFailure(
  error: unknown,
  methodLabel: string,
): PaymentActionFailure {
  if (error instanceof ApiClientError) {
    return {
      code: error.code,
      debugId: error.debugId,
      message:
        "The payment session did not open. Your cart is unchanged. Try again, or share the reference with the demo operator.",
      title: `We could not start ${methodLabel}.`,
    };
  }

  return {
    code: "PAYMENT_ACTION_CREATE_ORDER_FAILED",
    message:
      "The payment session did not open. Your cart is unchanged. Try again.",
    title: `We could not start ${methodLabel}.`,
  };
}

function formatPayPalSdkFailure(
  error: OnErrorData,
  methodLabel: string,
): PaymentActionFailure {
  return {
    code: error.code || "PAYPAL_SDK_PAYMENT_ERROR",
    message:
      "PayPal reported a payment window error. Your cart is unchanged. Try again.",
    title: `We could not start ${methodLabel}.`,
  };
}

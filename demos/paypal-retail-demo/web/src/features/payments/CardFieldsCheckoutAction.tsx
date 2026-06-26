import {
  PayPalCardCvvField,
  PayPalCardExpiryField,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  usePayPalCardFieldsOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type ApiQueryParams,
  type ApiRequestOptions,
} from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";
import {
  PaymentActionFailureNotice,
  usePaymentActionFailure,
} from "./paymentActionFailure.js";

export interface CardFieldsCheckoutActionProps {
  readonly canSavePaymentMethod?: boolean;
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
  readonly onApproved?:
    | ((context: CardFieldsApprovedContext) => Promise<void> | void)
    | undefined;
  readonly requestOptions?: ApiRequestOptions | undefined;
}

export interface CardFieldsApprovedContext {
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly method: "card";
  readonly paypalOrderId: string;
  readonly paymentSessionId?: string;
}

export interface CardFieldsCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "card";
    readonly vault_requested: boolean;
  };
  readonly query: ApiQueryParams;
  readonly options?: ApiRequestOptions | undefined;
}

export function CardFieldsCheckoutAction({
  canSavePaymentMethod = false,
  checkoutDraftId,
  fulfillmentMode,
  market,
  onApproved,
  requestOptions,
}: CardFieldsCheckoutActionProps) {
  return (
    <PayPalCardFieldsProvider>
      <CardFieldsCheckoutForm
        canSavePaymentMethod={canSavePaymentMethod}
        checkoutDraftId={checkoutDraftId}
        fulfillmentMode={fulfillmentMode}
        market={market}
        onApproved={onApproved}
        requestOptions={requestOptions}
      />
    </PayPalCardFieldsProvider>
  );
}

function CardFieldsCheckoutForm({
  canSavePaymentMethod = false,
  checkoutDraftId,
  fulfillmentMode,
  market,
  onApproved,
  requestOptions,
}: CardFieldsCheckoutActionProps) {
  const apiClient = useApiClient();
  const [vaultRequested, setVaultRequested] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(
    "Card payment fields ready.",
  );
  const lastCreatedOrder = useRef<PayPalCreateOrderResponse | null>(null);
  const approvedOrderIds = useRef(new Set<string>());
  const { error, submit, submitResponse } =
    usePayPalCardFieldsOneTimePaymentSession();
  const effectiveVaultRequested = canSavePaymentMethod && vaultRequested;
  const {
    captureApprovalFailure,
    captureCreateOrderFailure,
    clearFailure,
    failure,
  } = usePaymentActionFailure("card payment");

  const createOrder = useCallback(async () => {
    clearFailure();
    const request = buildCardFieldsCreateOrderRequest({
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
      console.error("[paypal-retail-demo] Card create-order failed", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
      });
      setSubmitStatus("Card payment could not start. Try again.");
      throw error;
    }

    lastCreatedOrder.current = order;
    console.info("[paypal-retail-demo] Card order created", {
      paypalOrderId: order.paypal_order_id,
      paymentSessionId: order.payment_session_id ?? null,
      merchantOrderId: order.merchant_order_id ?? null,
      vaultRequested: effectiveVaultRequested,
    });

    return order.paypal_order_id;
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

  const handleSubmit = useCallback(async () => {
    clearFailure();
    setSubmitStatus("Submitting card payment.");
    let orderId: string;

    try {
      orderId = await createOrder();
    } catch {
      return;
    }

    try {
      await submit(orderId);
    } catch (error) {
      const actionFailure = captureApprovalFailure(error);
      console.error("[paypal-retail-demo] Card fields submit failed", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
        paypalOrderId: orderId,
      });
      setSubmitStatus("Card payment could not be submitted. Try again.");
    }
  }, [captureApprovalFailure, clearFailure, createOrder, submit]);

  useEffect(() => {
    if (error) {
      const actionFailure = captureApprovalFailure(error);
      console.error("[paypal-retail-demo] Card fields error", {
        code: actionFailure.code,
        debugId: actionFailure.debugId ?? null,
        message: error.message,
      });
      setSubmitStatus("Card payment could not be submitted. Try again.");
    }
  }, [error]);

  useEffect(() => {
    if (!submitResponse) {
      return;
    }

    console.info("[paypal-retail-demo] Card fields submit response", {
      state: submitResponse.state,
      paypalOrderId: submitResponse.data.orderId,
      liabilityShift: submitResponse.data.liabilityShift ?? null,
      message: submitResponse.data.message ?? null,
    });

    setSubmitStatus(
      submitResponse.state === "succeeded"
        ? "Card payment approved. Confirming order."
        : "Card payment needs attention. Try again.",
    );

    if (submitResponse.state !== "succeeded") {
      return;
    }

    const paypalOrderId = submitResponse.data.orderId;
    if (approvedOrderIds.current.has(paypalOrderId)) {
      return;
    }
    approvedOrderIds.current.add(paypalOrderId);

    void (async () => {
      try {
        await onApproved?.({
          fulfillmentMode,
          method: "card",
          paypalOrderId,
          ...(lastCreatedOrder.current?.payment_session_id
            ? { paymentSessionId: lastCreatedOrder.current.payment_session_id }
            : {}),
        });
      } catch (error) {
        const actionFailure = captureApprovalFailure(error);
        console.error("[paypal-retail-demo] Card approval handling failed", {
          code: actionFailure.code,
          debugId: actionFailure.debugId ?? null,
          paypalOrderId,
        });
        setSubmitStatus(
          "Card payment was approved but could not be confirmed.",
        );
      }
    })();
  }, [captureApprovalFailure, fulfillmentMode, onApproved, submitResponse]);

  return (
    <form
      className="card-fields-checkout-action"
      data-payment-action-placement="card-box"
      data-payment-checkout-draft-id={checkoutDraftId}
      data-payment-fulfillment-mode={fulfillmentMode}
      data-payment-method="card"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <StatusRegion
        id={`card-fields-${fulfillmentMode}-status`}
        className="sr-only"
      >
        {submitStatus}
      </StatusRegion>
      <label className="card-fields-checkout-action__field">
        <span>Card number</span>
        <PayPalCardNumberField
          ariaLabel="Card number"
          containerClassName="card-fields-checkout-action__hosted-field"
          placeholder="1234 1234 1234 1234"
        />
      </label>
      <div className="card-fields-checkout-action__row">
        <label className="card-fields-checkout-action__field">
          <span>Expiration date</span>
          <PayPalCardExpiryField
            ariaLabel="Expiration date"
            containerClassName="card-fields-checkout-action__hosted-field"
            placeholder="MM / YY"
          />
        </label>
        <label className="card-fields-checkout-action__field">
          <span>Security code</span>
          <PayPalCardCvvField
            ariaLabel="Security code"
            containerClassName="card-fields-checkout-action__hosted-field"
            placeholder="CVV"
          />
        </label>
      </div>
      {canSavePaymentMethod ? (
        <label className="card-fields-checkout-action__save">
          <input
            checked={vaultRequested}
            onChange={(event) => setVaultRequested(event.currentTarget.checked)}
            type="checkbox"
          />
          <span>Save card for future purchases</span>
        </label>
      ) : null}
      <button className="card-fields-checkout-action__submit" type="submit">
        Pay by card
      </button>
      <PaymentActionFailureNotice failure={failure} onRetry={clearFailure} />
    </form>
  );
}

export function buildCardFieldsCreateOrderRequest({
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
  readonly vaultRequested: boolean;
}): CardFieldsCreateOrderRequest {
  return {
    path:
      fulfillmentMode === "pickup"
        ? "/api/paypal/orders/bopis"
        : "/api/paypal/orders/delivery",
    body: {
      checkout_draft_id: checkoutDraftId,
      method: "card",
      vault_requested: vaultRequested,
    },
    query: {
      market,
    },
    ...(requestOptions ? { options: requestOptions } : {}),
  };
}

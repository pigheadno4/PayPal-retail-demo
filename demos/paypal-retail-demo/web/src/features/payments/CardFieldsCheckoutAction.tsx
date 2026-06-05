import {
  PayPalCardCvvField,
  PayPalCardExpiryField,
  PayPalCardFieldsProvider,
  PayPalCardNumberField,
  usePayPalCardFieldsOneTimePaymentSession,
} from "@paypal/react-paypal-js/sdk-v6";
import { useCallback, useEffect, useState } from "react";

import { type ApiQueryParams } from "../../api/client.js";
import { StatusRegion } from "../../components/accessibility.js";
import { useApiClient } from "../../state/appProviders.js";
import { type CheckoutFulfillmentMode } from "../checkout/CheckoutPage.js";
import { type PayPalCreateOrderResponse } from "./PayPalStandaloneAction.js";

export interface CardFieldsCheckoutActionProps {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
}

export interface CardFieldsCreateOrderRequest {
  readonly path: "/api/paypal/orders/delivery" | "/api/paypal/orders/bopis";
  readonly body: {
    readonly checkout_draft_id: string;
    readonly method: "card";
    readonly vault_requested: boolean;
  };
  readonly query: ApiQueryParams;
}

export function CardFieldsCheckoutAction({
  checkoutDraftId,
  fulfillmentMode,
  market,
}: CardFieldsCheckoutActionProps) {
  return (
    <PayPalCardFieldsProvider>
      <CardFieldsCheckoutForm
        checkoutDraftId={checkoutDraftId}
        fulfillmentMode={fulfillmentMode}
        market={market}
      />
    </PayPalCardFieldsProvider>
  );
}

function CardFieldsCheckoutForm({
  checkoutDraftId,
  fulfillmentMode,
  market,
}: CardFieldsCheckoutActionProps) {
  const apiClient = useApiClient();
  const [vaultRequested, setVaultRequested] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(
    "Card payment fields ready.",
  );
  const { error, submit, submitResponse } =
    usePayPalCardFieldsOneTimePaymentSession();

  const createOrder = useCallback(async () => {
    const request = buildCardFieldsCreateOrderRequest({
      checkoutDraftId,
      fulfillmentMode,
      market,
      vaultRequested,
    });
    const order = await apiClient.post<PayPalCreateOrderResponse>(
      request.path,
      request.body,
      request.query,
    );

    console.info("[paypal-retail-demo] Card order created", {
      paypalOrderId: order.paypal_order_id,
      paymentSessionId: order.payment_session_id ?? null,
      merchantOrderId: order.merchant_order_id ?? null,
      vaultRequested,
    });

    return order.paypal_order_id;
  }, [apiClient, checkoutDraftId, fulfillmentMode, market, vaultRequested]);

  const handleSubmit = useCallback(async () => {
    setSubmitStatus("Submitting card payment.");
    const orderId = await createOrder();
    await submit(orderId);
  }, [createOrder, submit]);

  useEffect(() => {
    if (error) {
      console.error("[paypal-retail-demo] Card fields error", {
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
  }, [submitResponse]);

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
      <label className="card-fields-checkout-action__save">
        <input
          checked={vaultRequested}
          onChange={(event) => setVaultRequested(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>Save card for future purchases</span>
      </label>
      <button className="card-fields-checkout-action__submit" type="submit">
        Pay by card
      </button>
    </form>
  );
}

export function buildCardFieldsCreateOrderRequest({
  checkoutDraftId,
  fulfillmentMode,
  market,
  vaultRequested,
}: {
  readonly checkoutDraftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly market: string;
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
  };
}

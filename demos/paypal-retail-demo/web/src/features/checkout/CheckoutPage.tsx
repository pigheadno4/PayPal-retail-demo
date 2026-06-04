import { useState } from "react";

export type CheckoutFulfillmentMode = "delivery" | "pickup";

export type CheckoutStepState =
  | "idle"
  | "saving"
  | "saved"
  | "editing"
  | "recalculating"
  | "blocked"
  | "locked";

export interface CheckoutStep {
  readonly id: string;
  readonly title: string;
  readonly state: CheckoutStepState;
  readonly body: string;
}

export interface CheckoutOrderSummary {
  readonly title: string;
  readonly contextLabel: string;
  readonly subtotalLabel: string;
  readonly promoLabel: string;
  readonly totalLabel: string;
  readonly selectedPaymentLabel: string;
  readonly readyItemsLabel?: string;
  readonly unavailableItemsLabel?: string;
  readonly partialInventoryNote?: string;
}

export interface CheckoutFulfillmentDraft {
  readonly label: string;
  readonly steps: readonly CheckoutStep[];
  readonly summary: CheckoutOrderSummary;
}

export interface CheckoutPageData {
  readonly activeMode: CheckoutFulfillmentMode;
  readonly modeLocked: boolean;
  readonly lockedReason: string;
  readonly delivery: CheckoutFulfillmentDraft;
  readonly pickup: CheckoutFulfillmentDraft;
}

export interface CheckoutPageProps {
  readonly data?: CheckoutPageData;
}

const stepStateLabels = {
  idle: "Idle",
  saving: "Saving",
  saved: "Saved",
  editing: "Editing",
  recalculating: "Recalculating totals",
  blocked: "Blocked",
  locked: "Locked",
} satisfies Record<CheckoutStepState, string>;

export function CheckoutPage({
  data = defaultCheckoutPageData,
}: CheckoutPageProps) {
  const [activeMode, setActiveMode] = useState<CheckoutFulfillmentMode>(
    data.activeMode,
  );
  const activeDraft = activeMode === "delivery" ? data.delivery : data.pickup;

  function selectMode(mode: CheckoutFulfillmentMode) {
    if (!data.modeLocked) {
      setActiveMode(mode);
    }
  }

  return (
    <div className="checkout-page">
      <header className="checkout-hero">
        <p className="homepage-eyebrow">Checkout</p>
        <h1>Delivery or Pickup</h1>
        {data.modeLocked ? (
          <p className="checkout-lock-notice">
            <strong>Payment session started.</strong> {data.lockedReason}
          </p>
        ) : null}
      </header>

      <div className="checkout-layout">
        <section className="checkout-workflow" aria-label="Checkout flow">
          <div
            className="checkout-tabs"
            role="tablist"
            aria-label="Fulfillment mode"
          >
            <button
              id="checkout-tab-delivery"
              type="button"
              role="tab"
              aria-controls="checkout-panel-delivery"
              aria-selected={activeMode === "delivery"}
              aria-disabled={data.modeLocked && activeMode !== "delivery"}
              onClick={() => selectMode("delivery")}
            >
              {data.delivery.label}
            </button>
            <button
              id="checkout-tab-pickup"
              type="button"
              role="tab"
              aria-controls="checkout-panel-pickup"
              aria-selected={activeMode === "pickup"}
              aria-disabled={data.modeLocked && activeMode !== "pickup"}
              onClick={() => selectMode("pickup")}
            >
              {data.pickup.label}
            </button>
          </div>

          <CheckoutModePanel
            draft={data.delivery}
            mode="delivery"
            active={activeMode === "delivery"}
          />
          <CheckoutModePanel
            draft={data.pickup}
            mode="pickup"
            active={activeMode === "pickup"}
          />
        </section>

        <CheckoutSummary summary={activeDraft.summary} />
      </div>

      <div
        className="checkout-sticky-action"
        aria-label="Selected payment action"
      >
        <span>{activeDraft.summary.selectedPaymentLabel}</span>
        <strong>{activeDraft.summary.totalLabel}</strong>
        <button type="button">Continue</button>
      </div>
    </div>
  );
}

function CheckoutModePanel({
  draft,
  mode,
  active,
}: {
  readonly draft: CheckoutFulfillmentDraft;
  readonly mode: CheckoutFulfillmentMode;
  readonly active: boolean;
}) {
  return (
    <section
      className="checkout-panel"
      id={`checkout-panel-${mode}`}
      role="tabpanel"
      aria-labelledby={`checkout-tab-${mode}`}
      hidden={!active}
    >
      <div className="checkout-steps">
        {draft.steps.map((step) => (
          <article
            className="checkout-step"
            data-step-state={step.state}
            key={step.id}
          >
            <header>
              <h2>{step.title}</h2>
              <span>{stepStateLabels[step.state]}</span>
            </header>
            <p>{step.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckoutSummary({
  summary,
}: {
  readonly summary: CheckoutOrderSummary;
}) {
  return (
    <aside className="checkout-summary" aria-label="Order summary">
      <h2>{summary.title}</h2>
      <p>{summary.contextLabel}</p>
      {summary.readyItemsLabel ? (
        <div className="checkout-summary__split">
          <strong>{summary.readyItemsLabel}</strong>
          <span>{summary.unavailableItemsLabel}</span>
          {summary.partialInventoryNote ? (
            <p>{summary.partialInventoryNote}</p>
          ) : null}
        </div>
      ) : null}
      <dl>
        <div>
          <dt>Merchandise subtotal</dt>
          <dd>{summary.subtotalLabel}</dd>
        </div>
        <div>
          <dt>Promo</dt>
          <dd>{summary.promoLabel}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{summary.totalLabel}</dd>
        </div>
      </dl>
      <section
        className="checkout-summary__payment"
        aria-label="Selected payment method"
      >
        <span>{summary.selectedPaymentLabel}</span>
        <div className="checkout-summary__slot" />
      </section>
    </aside>
  );
}

export const defaultCheckoutPageData: CheckoutPageData = {
  activeMode: "delivery",
  modeLocked: false,
  lockedReason: "Switching requires abandoning this payment attempt.",
  delivery: {
    label: "Delivery",
    summary: {
      title: "Delivery order",
      contextLabel: "Ground delivery",
      subtotalLabel: "$25.98",
      promoLabel: "Auto promo calculating",
      totalLabel: "$25.98",
      selectedPaymentLabel: "PayPal selected",
    },
    steps: [
      {
        id: "shipping-address",
        title: "Shipping address",
        state: "idle",
        body: "Use saved shipping address or enter a new delivery address.",
      },
      {
        id: "billing-address",
        title: "Billing address",
        state: "saving",
        body: "Same as shipping is checked by default.",
      },
      {
        id: "shipping-options",
        title: "Shipping options",
        state: "saved",
        body: "Cheapest eligible option is selected by default.",
      },
      {
        id: "payment-method",
        title: "Payment method",
        state: "editing",
        body: "Radio-first payment method wall renders here.",
      },
    ],
  },
  pickup: {
    label: "Pickup",
    summary: {
      title: "Pickup order",
      contextLabel: "POP MART Soho",
      subtotalLabel: "$12.99",
      promoLabel: "Pickup promo recalculating",
      totalLabel: "$12.99",
      selectedPaymentLabel: "PayPal selected",
      readyItemsLabel: "Ready for pickup: 1 item",
      unavailableItemsLabel: "Not available at this store: 1 item",
      partialInventoryNote: "Unavailable items stay in the original cart.",
    },
    steps: [
      {
        id: "pickup-location",
        title: "Pickup location",
        state: "recalculating",
        body: "Use ZIP or default address to rank nearby stores.",
      },
      {
        id: "store-selection",
        title: "Store selection",
        state: "blocked",
        body: "Store card shows available and unavailable item counts.",
      },
      {
        id: "pickup-billing-address",
        title: "Billing address",
        state: "locked",
        body: "Billing address is locked after payment session starts.",
      },
      {
        id: "pickup-date",
        title: "Pickup date",
        state: "idle",
        body: "Store-specific pickup calendar renders here.",
      },
      {
        id: "pickup-payment-method",
        title: "Payment method",
        state: "idle",
        body: "Pickup payment method wall renders here.",
      },
    ],
  },
};

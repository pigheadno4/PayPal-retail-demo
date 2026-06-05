import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import {
  FieldError,
  StatusRegion,
  mergeDescribedByIds,
} from "../../components/accessibility.js";

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
  readonly fields?: readonly CheckoutField[];
  readonly choices?: readonly CheckoutChoice[];
  readonly storeCards?: readonly CheckoutStoreCard[];
  readonly primaryActionLabel?: string;
}

export interface CheckoutField {
  readonly label: string;
  readonly type: "text" | "checkbox";
  readonly value?: string;
  readonly placeholder?: string;
  readonly checked?: boolean;
}

export interface CheckoutChoice {
  readonly label: string;
  readonly method?: CheckoutSelectedPaymentMethod;
  readonly description?: string;
  readonly amountLabel?: string;
  readonly badgeLabel?: string;
  readonly selected?: boolean;
}

export interface CheckoutStoreCard {
  readonly name: string;
  readonly address: string;
  readonly distanceLabel: string;
  readonly phoneLabel: string;
  readonly availableItemsLabel: string;
  readonly unavailableItemsLabel: string;
  readonly statusLabel?: string;
  readonly partialInventoryNote?: string;
  readonly selected?: boolean;
}

export interface CheckoutOrderSummary {
  readonly title: string;
  readonly contextLabel: string;
  readonly subtotalLabel: string;
  readonly promoLabel: string;
  readonly totalLabel: string;
  readonly selectedPaymentLabel: string;
  readonly selectedPaymentMethod?: CheckoutSelectedPaymentMethod;
  readonly readyItemsLabel?: string;
  readonly unavailableItemsLabel?: string;
  readonly partialInventoryNote?: string;
}

export interface CheckoutValidationMessage {
  readonly id: string;
  readonly stepId: string;
  readonly fieldLabel?: string;
  readonly message: string;
}

export interface CheckoutValidationState {
  readonly summaryMessage: string;
  readonly focusStepId: string;
  readonly messages: readonly CheckoutValidationMessage[];
}

export interface CheckoutFulfillmentDraft {
  readonly label: string;
  readonly checkoutDraftId?: string;
  readonly steps: readonly CheckoutStep[];
  readonly summary: CheckoutOrderSummary;
}

export type CheckoutSelectedPaymentMethod =
  | "paypal"
  | "paylater"
  | "card"
  | "apple_pay"
  | "google_pay"
  | "venmo";

export interface CheckoutPaymentActionContext {
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly checkoutDraftId: string | null;
  readonly selectedPaymentMethod: CheckoutSelectedPaymentMethod;
  readonly totalLabel: string;
}

export type CheckoutPayLaterRowMessageContext = CheckoutPaymentActionContext;

export interface CheckoutPageData {
  readonly activeMode: CheckoutFulfillmentMode;
  readonly modeLocked: boolean;
  readonly lockedReason: string;
  readonly delivery: CheckoutFulfillmentDraft;
  readonly pickup: CheckoutFulfillmentDraft;
  readonly validation?: CheckoutValidationState;
}

export interface CheckoutPageProps {
  readonly data?: CheckoutPageData;
  readonly renderPaymentAction?: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderPayLaterRowMessage?: (
    context: CheckoutPayLaterRowMessageContext,
  ) => ReactNode;
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
  renderPaymentAction,
  renderPayLaterRowMessage,
}: CheckoutPageProps) {
  const [activeMode, setActiveMode] = useState<CheckoutFulfillmentMode>(
    data.activeMode,
  );
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const activeDraft = activeMode === "delivery" ? data.delivery : data.pickup;
  const paymentAction = renderPaymentAction?.({
    fulfillmentMode: activeMode,
    checkoutDraftId: activeDraft.checkoutDraftId ?? null,
    selectedPaymentMethod:
      activeDraft.summary.selectedPaymentMethod ?? "paypal",
    totalLabel: activeDraft.summary.totalLabel,
  });
  const payLaterRowMessage = renderPayLaterRowMessage?.({
    fulfillmentMode: activeMode,
    checkoutDraftId: activeDraft.checkoutDraftId ?? null,
    selectedPaymentMethod:
      activeDraft.summary.selectedPaymentMethod ?? "paypal",
    totalLabel: activeDraft.summary.totalLabel,
  });

  useEffect(() => {
    if (data.validation?.focusStepId) {
      focusTargetRef.current?.focus();
    }
  }, [activeMode, data.validation?.focusStepId]);

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
        {data.validation ? (
          <StatusRegion
            id="checkout-validation-summary"
            tone="assertive"
            className="checkout-validation-summary"
          >
            {data.validation.summaryMessage}
          </StatusRegion>
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
            validation={data.validation}
            focusTargetRef={focusTargetRef}
            payLaterRowMessage={
              activeMode === "delivery" ? payLaterRowMessage : null
            }
          />
          <CheckoutModePanel
            draft={data.pickup}
            mode="pickup"
            active={activeMode === "pickup"}
            validation={data.validation}
            focusTargetRef={focusTargetRef}
            payLaterRowMessage={
              activeMode === "pickup" ? payLaterRowMessage : null
            }
          />
        </section>

        <CheckoutSummary
          summary={activeDraft.summary}
          paymentAction={paymentAction}
        />
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
  validation,
  focusTargetRef,
  payLaterRowMessage,
}: {
  readonly draft: CheckoutFulfillmentDraft;
  readonly mode: CheckoutFulfillmentMode;
  readonly active: boolean;
  readonly validation: CheckoutValidationState | undefined;
  readonly focusTargetRef: RefObject<HTMLElement | null>;
  readonly payLaterRowMessage?: ReactNode;
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
        {draft.steps.map((step) => {
          const stepWithDetails = withDefaultStepDetails(step);
          const validationMessages = getValidationMessagesForStep(
            validation,
            step.id,
          );
          const describedById = mergeDescribedByIds(
            ...validationMessages.map((message) => message.id),
          );
          const isFocusTarget = validation?.focusStepId === step.id;

          return (
            <article
              aria-describedby={describedById}
              className="checkout-step"
              data-focus-target={isFocusTarget ? "true" : undefined}
              data-step-state={step.state}
              key={step.id}
              ref={isFocusTarget ? focusTargetRef : undefined}
              tabIndex={isFocusTarget ? -1 : undefined}
            >
              <header>
                <h2>{step.title}</h2>
                <span>{stepStateLabels[step.state]}</span>
              </header>
              <p>{step.body}</p>
              <CheckoutStepDetails
                step={stepWithDetails}
                payLaterRowMessage={payLaterRowMessage}
                validationMessages={validationMessages}
              />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function getValidationMessagesForStep(
  validation: CheckoutValidationState | undefined,
  stepId: string,
): readonly CheckoutValidationMessage[] {
  return (
    validation?.messages.filter((message) => message.stepId === stepId) ?? []
  );
}

function CheckoutStepDetails({
  step,
  payLaterRowMessage,
  validationMessages,
}: {
  readonly step: CheckoutStep;
  readonly payLaterRowMessage?: ReactNode;
  readonly validationMessages: readonly CheckoutValidationMessage[];
}) {
  const hasDetails =
    step.fields?.length ||
    step.choices?.length ||
    step.storeCards?.length ||
    step.primaryActionLabel ||
    validationMessages.length;

  if (!hasDetails) {
    return null;
  }

  return (
    <div className="checkout-step__details">
      {step.fields?.length ? (
        <div className="checkout-fields">
          {step.fields.map((field) => {
            const validationMessage = validationMessages.find(
              (message) => message.fieldLabel === field.label,
            );

            return (
              <label
                className={
                  field.type === "checkbox"
                    ? "checkout-field checkout-field--checkbox"
                    : "checkout-field"
                }
                key={field.label}
              >
                <span>{field.label}</span>
                <input
                  aria-describedby={validationMessage?.id}
                  aria-invalid={validationMessage ? true : undefined}
                  checked={
                    field.type === "checkbox" ? field.checked : undefined
                  }
                  placeholder={field.placeholder}
                  readOnly
                  type={field.type}
                  value={
                    field.type === "text" ? (field.value ?? "") : undefined
                  }
                />
                {validationMessage ? (
                  <FieldError id={validationMessage.id}>
                    {validationMessage.message}
                  </FieldError>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}

      {validationMessages.some((message) => !message.fieldLabel) ? (
        <div className="checkout-step__errors">
          {validationMessages
            .filter((message) => !message.fieldLabel)
            .map((message) => (
              <FieldError id={message.id} key={message.id}>
                {message.message}
              </FieldError>
            ))}
        </div>
      ) : null}

      {step.choices?.length ? (
        <div className="checkout-choices">
          {step.choices.map((choice) => (
            <label
              className="checkout-choice"
              data-payment-method-row={choice.method}
              key={choice.label}
            >
              <input checked={choice.selected ?? false} readOnly type="radio" />
              <span>
                <strong>{choice.label}</strong>
                {choice.description ? (
                  <small>{choice.description}</small>
                ) : null}
              </span>
              {choice.method === "paylater" && payLaterRowMessage ? (
                <div className="checkout-choice__message">
                  {payLaterRowMessage}
                </div>
              ) : null}
              {choice.badgeLabel ? <em>{choice.badgeLabel}</em> : null}
              {choice.amountLabel ? <b>{choice.amountLabel}</b> : null}
            </label>
          ))}
        </div>
      ) : null}

      {step.storeCards?.length ? (
        <div className="checkout-store-grid">
          {step.storeCards.map((store) => (
            <article
              className="checkout-store-card"
              data-selected={store.selected ? "true" : "false"}
              key={store.name}
            >
              <header>
                <h3>{store.name}</h3>
                <span>{store.distanceLabel}</span>
              </header>
              <p>{store.address}</p>
              <dl>
                <div>
                  <dt>Store phone</dt>
                  <dd>{store.phoneLabel}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{store.availableItemsLabel}</dd>
                </div>
                <div>
                  <dt>Unavailable</dt>
                  <dd>{store.unavailableItemsLabel}</dd>
                </div>
              </dl>
              {store.statusLabel ? <strong>{store.statusLabel}</strong> : null}
              {store.partialInventoryNote ? (
                <p>{store.partialInventoryNote}</p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {step.primaryActionLabel ? (
        <button className="checkout-step__action" type="button">
          {step.primaryActionLabel}
        </button>
      ) : null}
    </div>
  );
}

function CheckoutSummary({
  summary,
  paymentAction,
}: {
  readonly summary: CheckoutOrderSummary;
  readonly paymentAction?: ReactNode;
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
        <div className="checkout-summary__slot">{paymentAction}</div>
      </section>
    </aside>
  );
}

function withDefaultStepDetails(step: CheckoutStep): CheckoutStep {
  const defaults = defaultStepDetailsById[step.id];

  if (!defaults) {
    return step;
  }

  let stepWithDetails: CheckoutStep = {
    ...step,
  };
  const fields = step.fields ?? defaults.fields;
  const choices = step.choices ?? defaults.choices;
  const storeCards = step.storeCards ?? defaults.storeCards;
  const primaryActionLabel =
    step.primaryActionLabel ?? defaults.primaryActionLabel;

  if (fields) {
    stepWithDetails = {
      ...stepWithDetails,
      fields,
    };
  }

  if (choices) {
    stepWithDetails = {
      ...stepWithDetails,
      choices,
    };
  }

  if (storeCards) {
    stepWithDetails = {
      ...stepWithDetails,
      storeCards,
    };
  }

  if (primaryActionLabel) {
    stepWithDetails = {
      ...stepWithDetails,
      primaryActionLabel,
    };
  }

  return stepWithDetails;
}

const defaultStepDetailsById: Record<string, Partial<CheckoutStep>> = {
  "shipping-address": {
    fields: [
      {
        label: "Full name",
        type: "text",
        value: "Taylor Chen",
      },
      {
        label: "Street address",
        type: "text",
        value: "88 Spring Street",
      },
      {
        label: "City",
        type: "text",
        value: "New York",
      },
      {
        label: "State",
        type: "text",
        value: "NY",
      },
      {
        label: "ZIP code",
        type: "text",
        value: "10012",
      },
    ],
    primaryActionLabel: "Submit shipping address",
  },
  "billing-address": {
    fields: [
      {
        label: "Same as shipping",
        type: "checkbox",
        checked: true,
      },
    ],
    primaryActionLabel: "Save billing address",
  },
  "shipping-options": {
    choices: [
      {
        label: "Standard shipping",
        description: "Arrives in 4-6 business days",
        amountLabel: "$5.00",
        badgeLabel: "Cheapest option",
        selected: true,
      },
      {
        label: "Express shipping",
        description: "Arrives in 2 business days",
        amountLabel: "$12.00",
      },
    ],
    primaryActionLabel: "Submit shipping option",
  },
  "payment-method": {
    choices: [
      {
        label: "PayPal",
        method: "paypal",
        selected: true,
      },
      {
        label: "Pay Later",
        method: "paylater",
        description: "Pay Later message renders in the eligible row.",
      },
      {
        label: "Credit or debit card",
        method: "card",
        description: "Card fields expand inside this step.",
      },
      {
        label: "Apple Pay",
        method: "apple_pay",
      },
      {
        label: "Google Pay",
        method: "google_pay",
      },
    ],
  },
  "pickup-location": {
    fields: [
      {
        label: "ZIP or postcode",
        type: "text",
        value: "W1F 7JL",
      },
      {
        label: "Use default address",
        type: "checkbox",
        checked: true,
      },
    ],
  },
  "store-selection": {
    storeCards: [
      {
        name: "POP MART Soho",
        address: "3 Peter Street, London W1F 0AA",
        distanceLabel: "1.2 mi",
        phoneLabel: "+44 20 5555 0135",
        availableItemsLabel: "Available: 1 item",
        unavailableItemsLabel: "Unavailable: 1 item",
        statusLabel: "Partial inventory",
        partialInventoryNote: "Unavailable items stay in the original cart.",
        selected: true,
      },
      {
        name: "POP MART Covent Garden",
        address: "12 Long Acre, London WC2E 9LA",
        distanceLabel: "1.8 mi",
        phoneLabel: "+44 20 5555 0199",
        availableItemsLabel: "Available: 2 items",
        unavailableItemsLabel: "Unavailable: 0 items",
        statusLabel: "Full inventory",
      },
    ],
    primaryActionLabel: "Submit pickup store",
  },
  "pickup-billing-address": {
    fields: [
      {
        label: "Billing street address",
        type: "text",
        value: "88 Spring Street",
      },
      {
        label: "City",
        type: "text",
        value: "New York",
      },
      {
        label: "ZIP code",
        type: "text",
        value: "10012",
      },
    ],
    primaryActionLabel: "Save billing address",
  },
  "pickup-date": {
    choices: [
      {
        label: "June 12",
        description: "10:00 AM - 1:00 PM",
        selected: true,
      },
      {
        label: "June 13",
        description: "2:00 PM - 5:00 PM",
      },
    ],
    primaryActionLabel: "Submit pickup date",
  },
  "pickup-payment-method": {
    choices: [
      {
        label: "PayPal",
        method: "paypal",
        selected: true,
      },
      {
        label: "Pay Later",
        method: "paylater",
      },
      {
        label: "Credit or debit card",
        method: "card",
      },
    ],
  },
};

export const defaultCheckoutPageData: CheckoutPageData = {
  activeMode: "delivery",
  modeLocked: false,
  lockedReason: "Switching requires abandoning this payment attempt.",
  delivery: {
    label: "Delivery",
    checkoutDraftId: "draft_delivery_123",
    summary: {
      title: "Delivery order",
      contextLabel: "Ground delivery",
      subtotalLabel: "$25.98",
      promoLabel: "Auto promo calculating",
      totalLabel: "$25.98",
      selectedPaymentLabel: "PayPal selected",
      selectedPaymentMethod: "paypal",
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
    checkoutDraftId: "draft_pickup_123",
    summary: {
      title: "Pickup order",
      contextLabel: "POP MART Soho",
      subtotalLabel: "$12.99",
      promoLabel: "Pickup promo recalculating",
      totalLabel: "$12.99",
      selectedPaymentLabel: "PayPal selected",
      selectedPaymentMethod: "paypal",
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

import {
  useEffect,
  useRef,
  useState,
  type HTMLInputTypeAttribute,
  type InputHTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";
import { PencilIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError as FormFieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
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
  readonly value?: string;
  readonly method?: CheckoutSelectedPaymentMethod;
  readonly description?: string;
  readonly amountLabel?: string;
  readonly badgeLabel?: string;
  readonly eligible?: boolean;
  readonly ineligibleReasonLabel?: string;
  readonly selected?: boolean;
}

export interface CheckoutStoreCard {
  readonly id?: string;
  readonly name: string;
  readonly address: string;
  readonly distanceLabel: string;
  readonly phoneLabel: string;
  readonly availableItemsLabel: string;
  readonly unavailableItemsLabel: string;
  readonly inventoryLines?: readonly CheckoutStoreInventoryLine[];
  readonly statusLabel?: string;
  readonly partialInventoryNote?: string;
  readonly selected?: boolean;
}

export interface CheckoutStoreInventoryLine {
  readonly itemName: string;
  readonly requestedQuantity: number;
  readonly fulfillableQuantity: number;
  readonly status: "available" | "limited" | "unavailable";
  readonly statusLabel: string;
}

export interface CheckoutSummaryItem {
  readonly id: string;
  readonly name: string;
  readonly detailLabel: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly quantity: number;
  readonly amountLabel: string;
}

export interface CheckoutOrderSummary {
  readonly title: string;
  readonly contextLabel: string;
  readonly items?: readonly CheckoutSummaryItem[];
  readonly subtotalLabel: string;
  readonly promoLabel: string;
  readonly promoHelpLabel?: string;
  readonly shippingLabel?: string;
  readonly taxLabel?: string;
  readonly totalLabel: string;
  readonly selectedPaymentLabel: string;
  readonly selectedPaymentMethod?: CheckoutSelectedPaymentMethod;
  readonly saveForFutureEligible?: boolean;
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
  readonly saveForFutureEligible: boolean;
  readonly selectedPaymentEligible: boolean;
  readonly selectedPaymentMethod: CheckoutSelectedPaymentMethod;
  readonly totalLabel: string;
}

export type CheckoutPayLaterRowMessageContext = CheckoutPaymentActionContext;

export interface CheckoutPageData {
  readonly activeMode: CheckoutFulfillmentMode;
  readonly modeLocked: boolean;
  readonly lockedReason: string;
  readonly pickupStoreMode?: "guest" | "preselected";
  readonly delivery: CheckoutFulfillmentDraft;
  readonly pickup: CheckoutFulfillmentDraft;
  readonly validation?: CheckoutValidationState;
}

export interface CheckoutPageProps {
  readonly data?: CheckoutPageData;
  readonly onDraftUpdate?: (
    request: CheckoutDraftUpdateRequest,
    currentData: CheckoutPageData,
  ) => Promise<CheckoutPageData | void> | CheckoutPageData | void;
  readonly renderPaymentAction?: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderCardPaymentBox?: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderPayLaterRowMessage?: (
    context: CheckoutPayLaterRowMessageContext,
  ) => ReactNode;
}

export type CheckoutDraftUpdateType =
  | "delivery_shipping_address"
  | "delivery_billing_address"
  | "delivery_shipping_option"
  | "pickup_location"
  | "pickup_store"
  | "pickup_billing_address"
  | "pickup_date";

export interface CheckoutDraftUpdateRequest {
  readonly type: CheckoutDraftUpdateType;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
  readonly draftId: string | null;
  readonly fields: readonly CheckoutSubmittedField[];
  readonly selectedChoiceLabel?: string;
  readonly selectedChoiceValue?: string;
  readonly selectedStoreId?: string | null;
  readonly selectedStoreName?: string | null;
}

export interface CheckoutSubmittedField {
  readonly label: string;
  readonly value: string | boolean;
}

const paymentMethodLabels = {
  paypal: "PayPal",
  paylater: "Pay Later",
  card: "Credit or debit card",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  venmo: "Venmo",
} satisfies Record<CheckoutSelectedPaymentMethod, string>;

const paymentMethodLogoByMethod: Partial<
  Record<
    CheckoutSelectedPaymentMethod,
    { readonly alt: string; readonly src: string }
  >
> = {
  paypal: {
    alt: "PayPal",
    src: "/assets/paypal-logos/paypal-rebrand-default.svg",
  },
  paylater: {
    alt: "Pay Later",
    src: "/assets/paypal-logos/paylater-rebrand-mark.svg",
  },
  card: {
    alt: "Credit or debit card",
    src: "/assets/paypal-logos/card-rebrand-default.svg",
  },
  apple_pay: {
    alt: "Apple Pay",
    src: "/assets/paypal-logos/applepay-default.svg",
  },
  venmo: {
    alt: "Venmo",
    src: "/assets/paypal-logos/venmo-rebrand-default.svg",
  },
};

const checkoutSubmitTransitionDelayMs = 50;
const checkoutMobilePaymentQuery = "(max-width: 760px)";

type CheckoutFieldValue = string | boolean;

export function CheckoutPage({
  data = defaultCheckoutPageData,
  onDraftUpdate,
  renderPaymentAction,
  renderCardPaymentBox,
}: CheckoutPageProps) {
  const [currentData, setCurrentData] = useState(data);
  const pageData = currentData;
  const pickupStartsWithPreselectedStore =
    pageData.pickupStoreMode === "preselected";
  const [activeMode, setActiveMode] = useState<CheckoutFulfillmentMode>(
    pageData.activeMode,
  );
  const [fieldValues, setFieldValues] = useState<
    Readonly<Record<string, CheckoutFieldValue>>
  >({});
  const [stepStateOverrides, setStepStateOverrides] = useState<
    Readonly<Record<string, CheckoutStepState>>
  >(() =>
    pickupStartsWithPreselectedStore
      ? {
          "pickup-location": "saved",
          "store-selection": "saved",
        }
      : {},
  );
  const [submitErrorMessages, setSubmitErrorMessages] = useState<
    Readonly<Record<string, string>>
  >({});
  const [choiceSelections, setChoiceSelections] = useState<
    Readonly<Record<string, string>>
  >({});
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<
    Readonly<
      Partial<Record<CheckoutFulfillmentMode, CheckoutSelectedPaymentMethod>>
    >
  >({});
  const [pickupStoreModalOpen, setPickupStoreModalOpen] = useState(false);
  const [selectedPickupStoreName, setSelectedPickupStoreName] = useState<
    string | null
  >(() =>
    pickupStartsWithPreselectedStore
      ? getDefaultPickupStoreName(data.pickup)
      : null,
  );
  const [pendingPickupStoreName, setPendingPickupStoreName] = useState<
    string | null
  >(() =>
    pickupStartsWithPreselectedStore
      ? getDefaultPickupStoreName(data.pickup)
      : null,
  );
  const [expandedStepIds, setExpandedStepIds] = useState<
    Readonly<Record<CheckoutFulfillmentMode, string | null>>
  >(() => ({
    delivery: data.delivery.steps[0]?.id ?? null,
    pickup: pickupStartsWithPreselectedStore
      ? null
      : (data.pickup.steps[0]?.id ?? null),
  }));
  const [collapsedStepIds, setCollapsedStepIds] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        pickupStartsWithPreselectedStore
          ? ["pickup-location", "store-selection"]
          : [],
      ),
  );
  const focusTargetRef = useRef<HTMLElement | null>(null);
  const pickupStoreTriggerRef = useRef<HTMLElement | null>(null);
  const submitTransitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeDraft =
    activeMode === "delivery" ? pageData.delivery : pageData.pickup;
  const deliverySelectedPaymentMethod = getSelectedPaymentMethodForMode(
    "delivery",
    pageData.delivery,
    selectedPaymentMethods,
  );
  const pickupSelectedPaymentMethod = getSelectedPaymentMethodForMode(
    "pickup",
    pageData.pickup,
    selectedPaymentMethods,
  );
  const activeSelectedPaymentMethod =
    activeMode === "delivery"
      ? deliverySelectedPaymentMethod
      : pickupSelectedPaymentMethod;
  const activePaymentStepExpanded = isPaymentStepExpanded(
    activeMode,
    expandedStepIds,
  );
  const activeBaseSummary = activePaymentStepExpanded
    ? withSelectedPaymentSummary(
        activeDraft.summary,
        activeSelectedPaymentMethod,
      )
    : withPendingPaymentSummary(activeDraft.summary);
  const activeSummary =
    activeMode === "delivery"
      ? withSelectedDeliveryShippingSummary(
          activeBaseSummary,
          getSelectedDeliveryShippingChoice(
            pageData.delivery,
            choiceSelections,
            activeBaseSummary,
          ),
        )
      : activeBaseSummary;
  const activeSelectedPaymentEligible = isSelectedPaymentMethodEligible(
    activeDraft,
    activeSelectedPaymentMethod,
  );
  const activePaymentContext: CheckoutPaymentActionContext = {
    fulfillmentMode: activeMode,
    checkoutDraftId: activeDraft.checkoutDraftId ?? null,
    saveForFutureEligible:
      activeSelectedPaymentEligible &&
      isSaveForFutureEligible(activeSummary, activeSelectedPaymentMethod),
    selectedPaymentEligible: activeSelectedPaymentEligible,
    selectedPaymentMethod: activeSelectedPaymentMethod,
    totalLabel: activeSummary.totalLabel,
  };
  const paymentAction =
    !activePaymentStepExpanded ||
    activePaymentContext.selectedPaymentMethod === "card" ||
    !activePaymentContext.selectedPaymentEligible
      ? null
      : renderPaymentAction?.(activePaymentContext);
  const isMobilePaymentBar = useCheckoutMobilePaymentBar();
  const summaryPaymentAction = isMobilePaymentBar ? null : paymentAction;
  const stickyPaymentAction = isMobilePaymentBar ? paymentAction : null;
  const cardPaymentBox =
    activePaymentStepExpanded &&
    activePaymentContext.selectedPaymentMethod === "card"
      ? renderCardPaymentBox?.(activePaymentContext)
      : null;
  const pickupStoreCards = getPickupStoreCards(pageData.pickup);
  const selectedPickupStore = getPickupStoreByName(
    pickupStoreCards,
    selectedPickupStoreName,
  );
  const displayedSummary =
    activeMode === "pickup"
      ? withSelectedPickupStoreSummary(activeSummary, selectedPickupStore)
      : activeSummary;

  useEffect(() => {
    setCurrentData(data);
  }, [data]);

  useEffect(() => {
    if (pageData.validation?.focusStepId) {
      focusTargetRef.current?.focus();
    }
  }, [activeMode, pageData.validation?.focusStepId]);

  useEffect(
    () => () => {
      submitTransitionTimersRef.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
    },
    [],
  );

  function selectMode(mode: CheckoutFulfillmentMode) {
    if (!data.modeLocked) {
      setActiveMode(mode);
    }
  }

  function updateFieldValue(
    stepId: string,
    label: string,
    value: CheckoutFieldValue,
  ) {
    setFieldValues((currentValues) => ({
      ...currentValues,
      [fieldValueKey(stepId, label)]: value,
    }));
  }

  function submitStep(step: CheckoutStep) {
    if (step.id === "shipping-address") {
      saveStepAndEditNext(
        "delivery",
        step.id,
        step.title,
        "billing-address",
        buildDraftUpdateRequest(
          "delivery_shipping_address",
          "delivery",
          pageData.delivery.checkoutDraftId ?? null,
          step,
        ),
      );
      return;
    }

    if (step.id === "billing-address") {
      saveStepAndEditNext(
        "delivery",
        step.id,
        step.title,
        "shipping-options",
        buildDraftUpdateRequest(
          "delivery_billing_address",
          "delivery",
          pageData.delivery.checkoutDraftId ?? null,
          step,
        ),
      );
      return;
    }

    if (step.id === "shipping-options") {
      saveStepAndEditNext(
        "delivery",
        step.id,
        step.title,
        "payment-method",
        buildDraftUpdateRequest(
          "delivery_shipping_option",
          "delivery",
          pageData.delivery.checkoutDraftId ?? null,
          step,
        ),
      );
      return;
    }

    if (step.id === "pickup-location") {
      void savePickupLocationAndOpenStoreModal(
        step,
        buildDraftUpdateRequest(
          "pickup_location",
          "pickup",
          pageData.pickup.checkoutDraftId ?? null,
          step,
        ),
      );
      return;
    }

    if (step.id === "store-selection") {
      savePickupStoreAndEditBilling();
      return;
    }

    if (step.id === "pickup-billing-address") {
      saveStepAndEditNext(
        "pickup",
        step.id,
        step.title,
        "pickup-date",
        buildDraftUpdateRequest(
          "pickup_billing_address",
          "pickup",
          pageData.pickup.checkoutDraftId ?? null,
          step,
        ),
      );
      return;
    }

    if (step.id === "pickup-date") {
      saveStepAndEditNext(
        "pickup",
        step.id,
        step.title,
        "pickup-payment-method",
        buildDraftUpdateRequest(
          "pickup_date",
          "pickup",
          pageData.pickup.checkoutDraftId ?? null,
          step,
        ),
      );
    }
  }

  async function applyDraftUpdate(
    request: CheckoutDraftUpdateRequest,
  ): Promise<CheckoutPageData | undefined> {
    const updatedData = await onDraftUpdate?.(request, currentData);

    if (updatedData) {
      setCurrentData(updatedData);
      return updatedData;
    }

    return undefined;
  }

  async function savePickupLocationAndOpenStoreModal(
    step: CheckoutStep,
    updateRequest: CheckoutDraftUpdateRequest,
  ) {
    const stepId = step.id;
    setSubmitErrorMessages((currentMessages) => {
      const { [stepId]: _removedMessage, ...nextMessages } = currentMessages;
      return nextMessages;
    });
    setStepStateOverrides((currentStates) => ({
      ...currentStates,
      [stepId]: "saving",
    }));
    setExpandedStepIds((currentStepIds) => ({
      ...currentStepIds,
      pickup: null,
    }));
    setCollapsedStepIds((currentStepIds) => {
      const nextStepIds = new Set(currentStepIds);
      nextStepIds.add(stepId);
      return nextStepIds;
    });

    const recalculatingTimerId = setTimeout(() => {
      setStepStateOverrides((currentStates) => ({
        ...currentStates,
        [stepId]: "recalculating",
      }));
    }, checkoutSubmitTransitionDelayMs);
    submitTransitionTimersRef.current.push(recalculatingTimerId);

    try {
      const updatedData = await applyDraftUpdate(updateRequest);
      clearTimeout(recalculatingTimerId);
      setStepStateOverrides((currentStates) => ({
        ...currentStates,
        [stepId]: "saved",
        "store-selection": "editing",
      }));
      setExpandedStepIds((currentStepIds) => ({
        ...currentStepIds,
        pickup: "store-selection",
      }));
      setCollapsedStepIds((currentStepIds) => {
        const nextStepIds = new Set(currentStepIds);
        nextStepIds.add(stepId);
        return nextStepIds;
      });
      openPickupStoreModal(updatedData?.pickup ?? pageData.pickup);
    } catch {
      clearTimeout(recalculatingTimerId);
      setStepStateOverrides((currentStates) => ({
        ...currentStates,
        [stepId]: "blocked",
      }));
      setExpandedStepIds((currentStepIds) => ({
        ...currentStepIds,
        pickup: stepId,
      }));
      setCollapsedStepIds((currentStepIds) => {
        const nextStepIds = new Set(currentStepIds);
        nextStepIds.delete(stepId);
        return nextStepIds;
      });
      setSubmitErrorMessages((currentMessages) => ({
        ...currentMessages,
        [stepId]: `We could not save ${step.title}. Please try again.`,
      }));
    }
  }

  function saveStepAndEditNext(
    mode: CheckoutFulfillmentMode,
    stepId: string,
    stepTitle: string,
    nextStepId: string,
    updateRequest?: CheckoutDraftUpdateRequest,
  ) {
    setSubmitErrorMessages((currentMessages) => {
      const { [stepId]: _removedMessage, ...nextMessages } = currentMessages;
      return nextMessages;
    });
    setStepStateOverrides((currentStates) => ({
      ...currentStates,
      [stepId]: "saving",
    }));

    setExpandedStepIds((currentStepIds) => ({
      ...currentStepIds,
      [mode]: null,
    }));
    setCollapsedStepIds((currentStepIds) => {
      const nextStepIds = new Set(currentStepIds);
      nextStepIds.add(stepId);

      return nextStepIds;
    });

    const recalculatingTimerId = setTimeout(() => {
      setStepStateOverrides((currentStates) => ({
        ...currentStates,
        [stepId]: "recalculating",
      }));
    }, checkoutSubmitTransitionDelayMs);
    submitTransitionTimersRef.current.push(recalculatingTimerId);

    void (async () => {
      try {
        if (updateRequest && onDraftUpdate) {
          await applyDraftUpdate(updateRequest);
        }
        clearTimeout(recalculatingTimerId);

        setStepStateOverrides((currentStates) => ({
          ...currentStates,
          [nextStepId]: "editing",
          [stepId]: "saved",
        }));
        setExpandedStepIds((currentStepIds) => ({
          ...currentStepIds,
          [mode]: nextStepId,
        }));
        setCollapsedStepIds((currentStepIds) => {
          const nextStepIds = new Set(currentStepIds);
          nextStepIds.add(stepId);

          return nextStepIds;
        });
      } catch {
        clearTimeout(recalculatingTimerId);
        setStepStateOverrides((currentStates) => ({
          ...currentStates,
          [stepId]: "blocked",
        }));
        setExpandedStepIds((currentStepIds) => ({
          ...currentStepIds,
          [mode]: stepId,
        }));
        setCollapsedStepIds((currentStepIds) => {
          const nextStepIds = new Set(currentStepIds);
          nextStepIds.delete(stepId);

          return nextStepIds;
        });
        setSubmitErrorMessages((currentMessages) => ({
          ...currentMessages,
          [stepId]: `We could not save ${stepTitle}. Please try again.`,
        }));
      }
    })();
  }

  function updateChoiceSelection(
    stepId: string,
    label: string,
    method?: CheckoutSelectedPaymentMethod,
  ) {
    setChoiceSelections((currentSelections) => ({
      ...currentSelections,
      [stepId]: label,
    }));

    if (method && isPaymentStepId(stepId)) {
      setSelectedPaymentMethods((currentMethods) => ({
        ...currentMethods,
        [stepId === "pickup-payment-method" ? "pickup" : "delivery"]: method,
      }));
    }
  }

  function editStep(step: CheckoutStep, mode: CheckoutFulfillmentMode) {
    if (mode === "pickup" && step.id === "store-selection") {
      openPickupStoreModal();
      return;
    }

    setStepStateOverrides((currentStates) => ({
      ...currentStates,
      [step.id]: "editing",
    }));
    setExpandedStepIds((currentStepIds) => ({
      ...currentStepIds,
      [mode]: step.id,
    }));
    setCollapsedStepIds((currentStepIds) => {
      const nextStepIds = new Set(currentStepIds);
      nextStepIds.delete(step.id);

      return nextStepIds;
    });
  }

  function openPickupStoreModal(pickupDraft = pageData.pickup) {
    if (
      typeof document !== "undefined" &&
      document.activeElement instanceof HTMLElement
    ) {
      pickupStoreTriggerRef.current = document.activeElement;
    }

    setPendingPickupStoreName(
      selectedPickupStoreName ?? getDefaultPickupStoreName(pickupDraft),
    );
    setPickupStoreModalOpen(true);
  }

  function closePickupStoreModal() {
    setPickupStoreModalOpen(false);
    pickupStoreTriggerRef.current?.focus();
  }

  function savePickupStoreAndEditBilling(storeNameOverride?: string) {
    const nextStoreName =
      storeNameOverride ??
      pendingPickupStoreName ??
      selectedPickupStoreName ??
      pickupStoreCards[0]?.name;
    const nextStore = getPickupStoreByName(
      pickupStoreCards,
      nextStoreName ?? null,
    );

    if (nextStoreName) {
      setSelectedPickupStoreName(nextStoreName);
    }

    void applyDraftUpdate({
      draftId: pageData.pickup.checkoutDraftId ?? null,
      fields: [],
      fulfillmentMode: "pickup",
      selectedStoreId: nextStore?.id ?? null,
      selectedStoreName: nextStoreName ?? null,
      type: "pickup_store",
    });

    setPickupStoreModalOpen(false);
    setStepStateOverrides((currentStates) => ({
      ...currentStates,
      "pickup-billing-address": "editing",
      "pickup-location": "saved",
      "store-selection": "saved",
    }));
    setExpandedStepIds((currentStepIds) => ({
      ...currentStepIds,
      pickup: "pickup-billing-address",
    }));
    setCollapsedStepIds((currentStepIds) => {
      const nextStepIds = new Set(currentStepIds);
      nextStepIds.add("pickup-location");
      nextStepIds.add("store-selection");

      return nextStepIds;
    });
  }

  return (
    <div className="checkout-page" data-visual-accent-scope="checkout">
      <header className="checkout-hero">
        <nav aria-label="Checkout breadcrumb" className="checkout-breadcrumb">
          <a href="/">Home</a>
          <span aria-hidden="true">/</span>
          <span>Secure checkout</span>
        </nav>
        <p className="homepage-eyebrow">Secure checkout</p>
        <div className="checkout-hero__headline">
          <h1>Delivery or Pickup</h1>
          <p>
            Confirm fulfillment, review totals, then continue with the eligible
            PayPal payment surface.
          </p>
        </div>
        {pageData.modeLocked ? (
          <p className="checkout-lock-notice">
            <strong>Payment session started.</strong> {pageData.lockedReason}
          </p>
        ) : null}
        {pageData.validation ? (
          <StatusRegion
            id="checkout-validation-summary"
            tone="assertive"
            className="checkout-validation-summary"
          >
            {pageData.validation.summaryMessage}
          </StatusRegion>
        ) : null}
      </header>

      <div className="checkout-layout">
        <section className="checkout-workflow" aria-label="Checkout flow">
          <Tabs
            value={activeMode}
            onValueChange={(value) =>
              selectMode(value as CheckoutFulfillmentMode)
            }
            className="checkout-fulfillment-tabs"
          >
            <TabsList className="checkout-tabs" aria-label="Fulfillment mode">
              <TabsTrigger
                id="checkout-tab-delivery"
                value="delivery"
                aria-disabled={pageData.modeLocked && activeMode !== "delivery"}
                disabled={pageData.modeLocked && activeMode !== "delivery"}
              >
                {data.delivery.label}
              </TabsTrigger>
              <TabsTrigger
                id="checkout-tab-pickup"
                value="pickup"
                aria-disabled={pageData.modeLocked && activeMode !== "pickup"}
                disabled={pageData.modeLocked && activeMode !== "pickup"}
              >
                {data.pickup.label}
              </TabsTrigger>
            </TabsList>

            <CheckoutModePanel
              draft={pageData.delivery}
              mode="delivery"
              active={activeMode === "delivery"}
              validation={pageData.validation}
              focusTargetRef={focusTargetRef}
              fieldValues={fieldValues}
              submitErrorMessages={submitErrorMessages}
              stepStateOverrides={stepStateOverrides}
              expandedStepId={expandedStepIds.delivery}
              collapsedStepIds={collapsedStepIds}
              choiceSelections={choiceSelections}
              selectedPickupStoreName={selectedPickupStoreName}
              selectedPaymentMethod={deliverySelectedPaymentMethod}
              onFieldChange={updateFieldValue}
              onChoiceChange={updateChoiceSelection}
              onStepEdit={editStep}
              onStepSubmit={submitStep}
              cardPaymentBox={activeMode === "delivery" ? cardPaymentBox : null}
            />
            <CheckoutModePanel
              draft={pageData.pickup}
              mode="pickup"
              active={activeMode === "pickup"}
              validation={pageData.validation}
              focusTargetRef={focusTargetRef}
              fieldValues={fieldValues}
              submitErrorMessages={submitErrorMessages}
              stepStateOverrides={stepStateOverrides}
              expandedStepId={expandedStepIds.pickup}
              collapsedStepIds={collapsedStepIds}
              choiceSelections={choiceSelections}
              selectedPickupStoreName={selectedPickupStoreName}
              selectedPaymentMethod={pickupSelectedPaymentMethod}
              onFieldChange={updateFieldValue}
              onChoiceChange={updateChoiceSelection}
              onStepEdit={editStep}
              onStepSubmit={submitStep}
              cardPaymentBox={activeMode === "pickup" ? cardPaymentBox : null}
            />
          </Tabs>
        </section>

        <CheckoutSummary
          summary={displayedSummary}
          paymentAction={summaryPaymentAction}
        />
      </div>

      <CheckoutTrustStrip />

      {pickupStoreModalOpen ? (
        <PickupStoreModal
          stores={pickupStoreCards}
          selectedStoreName={
            pendingPickupStoreName ??
            selectedPickupStoreName ??
            pickupStoreCards[0]?.name ??
            null
          }
          onClose={closePickupStoreModal}
          onChoose={savePickupStoreAndEditBilling}
          onConfirm={() => savePickupStoreAndEditBilling()}
          onSelect={setPendingPickupStoreName}
        />
      ) : null}

      {stickyPaymentAction ? (
        <div
          className="checkout-sticky-action"
          aria-label="Selected payment action"
        >
          <div className="checkout-sticky-action__meta">
            <span>Secure checkout</span>
            <strong>{activeSummary.totalLabel}</strong>
          </div>
          <div className="checkout-sticky-action__slot">
            {stickyPaymentAction}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function useCheckoutMobilePaymentBar(): boolean {
  const [matches, setMatches] = useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }

    return window.matchMedia(checkoutMobilePaymentQuery).matches;
  });

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return undefined;
    }

    const mediaQuery = window.matchMedia(checkoutMobilePaymentQuery);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);

    return () => {
      mediaQuery.removeEventListener("change", updateMatches);
    };
  }, []);

  return matches;
}

function CheckoutModePanel({
  draft,
  mode,
  active,
  validation,
  focusTargetRef,
  fieldValues,
  submitErrorMessages,
  stepStateOverrides,
  expandedStepId,
  collapsedStepIds,
  choiceSelections,
  selectedPickupStoreName,
  selectedPaymentMethod,
  onFieldChange,
  onChoiceChange,
  onStepEdit,
  onStepSubmit,
  cardPaymentBox,
}: {
  readonly draft: CheckoutFulfillmentDraft;
  readonly mode: CheckoutFulfillmentMode;
  readonly active: boolean;
  readonly validation: CheckoutValidationState | undefined;
  readonly focusTargetRef: RefObject<HTMLElement | null>;
  readonly fieldValues: Readonly<Record<string, CheckoutFieldValue>>;
  readonly submitErrorMessages: Readonly<Record<string, string>>;
  readonly stepStateOverrides: Readonly<Record<string, CheckoutStepState>>;
  readonly expandedStepId: string | null;
  readonly collapsedStepIds: ReadonlySet<string>;
  readonly choiceSelections: Readonly<Record<string, string>>;
  readonly selectedPickupStoreName: string | null;
  readonly selectedPaymentMethod: CheckoutSelectedPaymentMethod;
  readonly onFieldChange: (
    stepId: string,
    label: string,
    value: CheckoutFieldValue,
  ) => void;
  readonly onChoiceChange: (
    stepId: string,
    label: string,
    method?: CheckoutSelectedPaymentMethod,
  ) => void;
  readonly onStepEdit: (
    step: CheckoutStep,
    mode: CheckoutFulfillmentMode,
  ) => void;
  readonly onStepSubmit: (step: CheckoutStep) => void;
  readonly cardPaymentBox?: ReactNode;
}) {
  return (
    <TabsContent
      className="checkout-panel"
      value={mode}
      forceMount
      hidden={!active}
      aria-hidden={!active}
    >
      <div className="checkout-steps">
        {draft.steps.map((step) => {
          const stepState = stepStateOverrides[step.id] ?? step.state;
          const stepWithDetails = withSelectedPickupStore(
            withEditableFieldValues(
              withInteractiveChoiceSelection(
                withInteractiveStepFields(
                  withDefaultStepDetails(
                    {
                      ...step,
                      state: stepState,
                    },
                    selectedPaymentMethod,
                  ),
                  fieldValues,
                ),
                choiceSelections,
              ),
              fieldValues,
            ),
            selectedPickupStoreName,
          );
          const isExpanded = step.id === expandedStepId;
          const isSubmitted = collapsedStepIds.has(step.id);
          const validationMessages = getValidationMessagesForStep(
            validation,
            step.id,
          );
          const submitErrorMessage = submitErrorMessages[step.id];
          const submitErrorId = submitErrorMessage
            ? `${step.id}-submit-error`
            : undefined;
          const describedById = mergeDescribedByIds(
            ...validationMessages.map((message) => message.id),
            submitErrorId,
          );
          const isFocusTarget = validation?.focusStepId === step.id;

          return (
            <article
              aria-describedby={describedById}
              data-focus-target={isFocusTarget ? "true" : undefined}
              data-step-state={stepState}
              key={step.id}
              ref={isFocusTarget ? focusTargetRef : undefined}
              tabIndex={isFocusTarget ? -1 : undefined}
            >
              <Card
                className="checkout-step"
                data-visual-accent="checkout-step"
                data-focus-target={isFocusTarget ? "true" : undefined}
                data-step-state={stepState}
              >
                <CardHeader className="checkout-step__header">
                  <CardTitle className="checkout-step__title">
                    <h2>{step.title}</h2>
                  </CardTitle>
                  {isExpanded ? (
                    <CardDescription className="checkout-step__description">
                      {step.body}
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="checkout-step__content">
                  {isExpanded ? (
                    <CheckoutStepDetails
                      step={stepWithDetails}
                      cardPaymentBox={cardPaymentBox}
                      submitErrorMessage={submitErrorMessage}
                      submitErrorId={submitErrorId}
                      validationMessages={validationMessages}
                      onFieldChange={onFieldChange}
                      onChoiceChange={onChoiceChange}
                      onStepSubmit={onStepSubmit}
                    />
                  ) : isSubmitted ? (
                    <CheckoutStepSummary
                      step={stepWithDetails}
                      mode={mode}
                      onStepEdit={onStepEdit}
                      onStepSubmit={onStepSubmit}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </article>
          );
        })}
      </div>
    </TabsContent>
  );
}

function withInteractiveStepFields(
  step: CheckoutStep,
  fieldValues: Readonly<Record<string, CheckoutFieldValue>>,
): CheckoutStep {
  if (step.id !== "billing-address") {
    return step;
  }

  const sameAsShippingValue =
    fieldValues[fieldValueKey(step.id, "Same as shipping")];
  const sameAsShipping =
    sameAsShippingValue === undefined ? true : sameAsShippingValue === true;
  const fields = (step.fields ?? []).map((field) =>
    field.type === "checkbox" && field.label === "Same as shipping"
      ? { ...field, checked: sameAsShipping }
      : field,
  );

  if (sameAsShipping) {
    return {
      ...step,
      fields,
    };
  }

  return {
    ...step,
    fields: [...fields, ...deliveryBillingAddressFields],
  };
}

function withInteractiveChoiceSelection(
  step: CheckoutStep,
  choiceSelections: Readonly<Record<string, string>>,
): CheckoutStep {
  const selectedChoiceLabel = choiceSelections[step.id];

  if (!step.choices || !selectedChoiceLabel) {
    return step;
  }

  return {
    ...step,
    choices: step.choices.map((choice) => ({
      ...choice,
      selected: choice.label === selectedChoiceLabel,
    })),
  };
}

function withEditableFieldValues(
  step: CheckoutStep,
  fieldValues: Readonly<Record<string, CheckoutFieldValue>>,
): CheckoutStep {
  if (!step.fields) {
    return step;
  }

  return {
    ...step,
    fields: step.fields.map((field) => {
      const value = fieldValues[fieldValueKey(step.id, field.label)];

      if (value === undefined) {
        return field;
      }

      return field.type === "checkbox"
        ? {
            ...field,
            checked: value === true,
          }
        : {
            ...field,
            value: String(value),
          };
    }),
  };
}

function withSelectedPickupStore(
  step: CheckoutStep,
  selectedStoreName: string | null,
): CheckoutStep {
  if (step.id !== "store-selection" || !step.storeCards || !selectedStoreName) {
    return step;
  }

  return {
    ...step,
    storeCards: step.storeCards.map((store) => ({
      ...store,
      selected: store.name === selectedStoreName,
    })),
  };
}

function fieldValueKey(stepId: string, label: string): string {
  return `${stepId}:${label}`;
}

function buildDraftUpdateRequest(
  type: CheckoutDraftUpdateType,
  fulfillmentMode: CheckoutFulfillmentMode,
  draftId: string | null,
  step: CheckoutStep,
): CheckoutDraftUpdateRequest {
  const selectedChoice = getSelectedCheckoutChoiceForSubmit(step);

  return {
    draftId,
    fields: (step.fields ?? []).map((field) => ({
      label: field.label,
      value:
        field.type === "checkbox"
          ? field.checked === true
          : (field.value ?? ""),
    })),
    fulfillmentMode,
    ...(selectedChoice?.label
      ? { selectedChoiceLabel: selectedChoice.label }
      : {}),
    ...(selectedChoice?.value
      ? { selectedChoiceValue: selectedChoice.value }
      : {}),
    type,
  };
}

function getSelectedCheckoutChoiceForSubmit(
  step: CheckoutStep,
): CheckoutChoice | undefined {
  const selectedChoice = step.choices?.find(
    (choice) => choice.selected === true,
  );

  if (selectedChoice || step.id !== "pickup-date") {
    return selectedChoice;
  }

  return step.choices?.find((choice) => isDefinedString(choice.value));
}

function getSelectedPaymentMethodForMode(
  mode: CheckoutFulfillmentMode,
  draft: CheckoutFulfillmentDraft,
  selectedPaymentMethods: Readonly<
    Partial<Record<CheckoutFulfillmentMode, CheckoutSelectedPaymentMethod>>
  >,
): CheckoutSelectedPaymentMethod {
  return (
    selectedPaymentMethods[mode] ??
    draft.summary.selectedPaymentMethod ??
    "paypal"
  );
}

function withSelectedPaymentSummary(
  summary: CheckoutOrderSummary,
  selectedPaymentMethod: CheckoutSelectedPaymentMethod,
): CheckoutOrderSummary {
  return {
    ...summary,
    selectedPaymentLabel: paymentMethodLabels[selectedPaymentMethod],
    selectedPaymentMethod,
  };
}

function withPendingPaymentSummary(
  summary: CheckoutOrderSummary,
): CheckoutOrderSummary {
  const { selectedPaymentMethod: _selectedPaymentMethod, ...baseSummary } =
    summary;

  return {
    ...baseSummary,
    selectedPaymentLabel: "Choose payment method",
  };
}

function getSelectedDeliveryShippingChoice(
  draft: CheckoutFulfillmentDraft,
  choiceSelections: Readonly<Record<string, string>>,
  summary: CheckoutOrderSummary,
): CheckoutChoice | null {
  const shippingStep = draft.steps.find(
    (step) => step.id === "shipping-options",
  );
  const choices =
    shippingStep?.choices ??
    defaultStepDetailsById["shipping-options"]?.choices;
  const selectedLabel = choiceSelections["shipping-options"];

  if (!selectedLabel && !summary.shippingLabel) {
    return null;
  }

  return (
    choices?.find((choice) =>
      selectedLabel ? choice.label === selectedLabel : choice.selected === true,
    ) ?? null
  );
}

function withSelectedDeliveryShippingSummary(
  summary: CheckoutOrderSummary,
  selectedShippingChoice: CheckoutChoice | null,
): CheckoutOrderSummary {
  if (!selectedShippingChoice?.amountLabel) {
    return summary;
  }

  const nextTotalLabel = addShippingDeltaToTotal({
    currentShippingLabel: summary.shippingLabel,
    nextShippingLabel: selectedShippingChoice.amountLabel,
    totalLabel: summary.totalLabel,
  });

  return {
    ...summary,
    shippingLabel: selectedShippingChoice.amountLabel,
    ...(nextTotalLabel ? { totalLabel: nextTotalLabel } : {}),
  };
}

function addShippingDeltaToTotal({
  currentShippingLabel,
  nextShippingLabel,
  totalLabel,
}: {
  readonly currentShippingLabel?: string | undefined;
  readonly nextShippingLabel: string;
  readonly totalLabel: string;
}): string | null {
  const currentShipping = currentShippingLabel
    ? parseMoneyLabel(currentShippingLabel)
    : null;
  const nextShipping = parseMoneyLabel(nextShippingLabel);
  const total = parseMoneyLabel(totalLabel);

  if (!nextShipping || !total) {
    return null;
  }
  if (currentShipping && currentShipping.prefix !== nextShipping.prefix) {
    return null;
  }
  if (total.prefix !== nextShipping.prefix) {
    return null;
  }

  const currentShippingMinor = currentShipping?.minor ?? 0;

  return formatMoneyLabel(
    total.prefix,
    total.minor - currentShippingMinor + nextShipping.minor,
  );
}

function parseMoneyLabel(
  label: string,
): { readonly prefix: string; readonly minor: number } | null {
  const match = label.trim().match(/^([^0-9-]*)(-?\d+(?:\.\d{1,2})?)/);

  if (!match) {
    return null;
  }

  const [, prefix = "", amount = "0"] = match;

  return {
    prefix,
    minor: Math.round(Number(amount) * 100),
  };
}

function formatMoneyLabel(prefix: string, minor: number): string {
  return `${prefix}${(minor / 100).toFixed(2)}`;
}

function withSelectedPickupStoreSummary(
  summary: CheckoutOrderSummary,
  selectedStore: CheckoutStoreCard | null,
): CheckoutOrderSummary {
  if (!selectedStore) {
    return summary;
  }

  const unavailableCount = parseInventoryCount(
    selectedStore.unavailableItemsLabel,
  );
  const partialInventoryNote =
    unavailableCount > 0 ? selectedStore.partialInventoryNote : undefined;
  const {
    partialInventoryNote: _previousPartialInventoryNote,
    ...baseSummary
  } = summary;

  return {
    ...baseSummary,
    contextLabel: selectedStore.name,
    ...(partialInventoryNote ? { partialInventoryNote } : {}),
    readyItemsLabel: selectedStore.availableItemsLabel.replace(
      /^Available:/,
      "Ready for pickup:",
    ),
    unavailableItemsLabel: selectedStore.unavailableItemsLabel.replace(
      /^Unavailable:/,
      "Not available at this store:",
    ),
  };
}

function parseInventoryCount(label: string): number {
  return Number(label.match(/\d+/)?.[0] ?? 0);
}

function getPickupStoreInventoryState(
  store: CheckoutStoreCard,
): "empty" | "full" | "partial" {
  const availableCount = parseInventoryCount(store.availableItemsLabel);
  const unavailableCount = parseInventoryCount(store.unavailableItemsLabel);

  if (availableCount <= 0) {
    return "empty";
  }

  return unavailableCount > 0 ? "partial" : "full";
}

function isPaymentStepId(stepId: string): boolean {
  return stepId === "payment-method" || stepId === "pickup-payment-method";
}

function isPaymentStepExpanded(
  activeMode: CheckoutFulfillmentMode,
  expandedStepIds: Readonly<Record<CheckoutFulfillmentMode, string | null>>,
): boolean {
  return activeMode === "delivery"
    ? expandedStepIds.delivery === "payment-method"
    : expandedStepIds.pickup === "pickup-payment-method";
}

function getValidationMessagesForStep(
  validation: CheckoutValidationState | undefined,
  stepId: string,
): readonly CheckoutValidationMessage[] {
  return (
    validation?.messages.filter((message) => message.stepId === stepId) ?? []
  );
}

function CheckoutStepSummary({
  step,
  mode,
  onStepEdit,
  onStepSubmit,
}: {
  readonly step: CheckoutStep;
  readonly mode: CheckoutFulfillmentMode;
  readonly onStepEdit: (
    step: CheckoutStep,
    mode: CheckoutFulfillmentMode,
  ) => void;
  readonly onStepSubmit: (step: CheckoutStep) => void;
}) {
  const summaryFields =
    step.fields?.filter(
      (field) => field.type === "text" && Boolean(field.value),
    ) ?? [];
  const summaryLines = getCheckoutStepSummaryLines(step, summaryFields);
  const selectedChoices =
    step.choices?.filter((choice) => choice.selected === true) ?? [];
  const selectedStores =
    step.storeCards?.filter((store) => store.selected === true) ?? [];

  if (
    !summaryLines.length &&
    !selectedChoices.length &&
    !selectedStores.length
  ) {
    return null;
  }

  const editLabel =
    step.id === "store-selection"
      ? "Change store"
      : `Edit ${step.title.toLowerCase()}`;

  return (
    <div className="checkout-step__summary">
      {summaryLines.length ? (
        <address className="checkout-step__summary-lines">
          {summaryLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </address>
      ) : null}
      {selectedChoices.length ? (
        <ul>
          {selectedChoices.map((choice) => (
            <li key={choice.label}>
              <strong>{choice.label}</strong>
              {choice.amountLabel ? <span>{choice.amountLabel}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {selectedStores.length ? (
        <ul>
          {selectedStores.map((store) => (
            <li key={store.name}>
              <strong>{store.name}</strong>
              <span>{store.statusLabel ?? store.distanceLabel}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        aria-label={editLabel}
        className="checkout-step__edit"
        disabled={step.state === "saving" || step.state === "recalculating"}
        type="button"
        onClick={() => onStepEdit(step, mode)}
        variant="ghost"
      >
        <PencilIcon aria-hidden="true" />
      </Button>
      {mode === "pickup" &&
      step.id === "store-selection" &&
      selectedStores.length ? (
        <Button
          className="checkout-step__summary-action"
          onClick={() => onStepSubmit(step)}
          type="button"
          variant="secondary"
        >
          Continue with this store
        </Button>
      ) : null}
    </div>
  );
}

function getCheckoutStepSummaryLines(
  step: CheckoutStep,
  summaryFields: readonly CheckoutField[],
): readonly string[] {
  const fieldValueByLabel = new Map(
    summaryFields.map((field) => [field.label, field.value ?? ""]),
  );

  if (step.id === "shipping-address") {
    return compactSummaryLines([
      fieldValueByLabel.get("Full name"),
      fieldValueByLabel.get("Street address"),
      compactSummaryLines([
        fieldValueByLabel.get("City"),
        fieldValueByLabel.get("State"),
        fieldValueByLabel.get("ZIP code"),
      ]).join(", "),
    ]);
  }

  if (step.id === "billing-address") {
    const sameAsShipping = step.fields?.find(
      (field) =>
        field.type === "checkbox" && field.label === "Same as shipping",
    );

    if (sameAsShipping?.checked !== false) {
      return ["Same as shipping address"];
    }

    return compactSummaryLines([
      fieldValueByLabel.get("Billing street address"),
      compactSummaryLines([
        fieldValueByLabel.get("Billing city"),
        fieldValueByLabel.get("Billing ZIP code"),
      ]).join(", "),
    ]);
  }

  if (step.id === "pickup-billing-address") {
    return compactSummaryLines([
      fieldValueByLabel.get("Billing street address"),
      compactSummaryLines([
        fieldValueByLabel.get("City"),
        fieldValueByLabel.get("ZIP code"),
      ]).join(", "),
    ]);
  }

  return compactSummaryLines(summaryFields.map((field) => field.value));
}

function compactSummaryLines(
  lines: readonly (string | undefined)[],
): readonly string[] {
  return lines
    .map((line) => line?.trim() ?? "")
    .filter((line) => line.length > 0);
}

function PickupStoreTicketDetails({
  store,
}: {
  readonly store: CheckoutStoreCard;
}) {
  const availableCount = parseInventoryCount(store.availableItemsLabel);
  const unavailableCount = parseInventoryCount(store.unavailableItemsLabel);
  const inventoryState = getPickupStoreInventoryState(store);
  const inventoryLines = store.inventoryLines ?? [];

  return (
    <>
      <div className="checkout-store-card__route">
        <span className="checkout-store-card__address">{store.address}</span>
        <span className="checkout-store-card__phone">{store.phoneLabel}</span>
      </div>
      {inventoryLines.length ? (
        <ul
          aria-label={`Pickup inventory for ${store.name}`}
          className="checkout-store-card__inventory-lines"
        >
          {inventoryLines.map((line) => (
            <li data-inventory-kind={line.status} key={line.itemName}>
              <span>
                {line.itemName} x {line.requestedQuantity}
              </span>
              <strong>{line.statusLabel}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <div
          aria-label={`Pickup inventory for ${store.name}`}
          className="checkout-store-card__availability"
          data-inventory-state={inventoryState}
        >
          <span data-inventory-kind="available">
            <strong>{availableCount}</strong>
            <small>{store.availableItemsLabel}</small>
          </span>
          <span data-inventory-kind="unavailable">
            <strong>{unavailableCount}</strong>
            <small>{store.unavailableItemsLabel}</small>
          </span>
        </div>
      )}
      {store.statusLabel || store.partialInventoryNote ? (
        <div className="checkout-store-card__footer">
          {store.statusLabel ? (
            <Badge
              className="checkout-store-card__badge"
              variant={inventoryState === "partial" ? "outline" : "secondary"}
            >
              {store.statusLabel}
            </Badge>
          ) : null}
          {store.partialInventoryNote ? (
            <p className="checkout-store-card__note">
              {store.partialInventoryNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function PickupStoreModal({
  stores,
  selectedStoreName,
  onClose,
  onChoose,
  onConfirm,
  onSelect,
}: {
  readonly stores: readonly CheckoutStoreCard[];
  readonly selectedStoreName: string | null;
  readonly onClose: () => void;
  readonly onChoose: (storeName: string) => void;
  readonly onConfirm: () => void;
  readonly onSelect: (storeName: string) => void;
}) {
  const selectedStoreRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    selectedStoreRef.current?.focus();
  }, []);

  return (
    <div
      aria-labelledby="pickup-store-modal-title"
      aria-modal="true"
      className="checkout-modal"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
      role="dialog"
    >
      <div className="checkout-modal__panel">
        <header className="checkout-modal__header">
          <div>
            <p className="homepage-eyebrow">Pickup nearby</p>
            <h2 id="pickup-store-modal-title">Choose pickup store</h2>
          </div>
          <button
            type="button"
            aria-label="Close pickup store picker"
            className="checkout-modal__close"
            onClick={onClose}
          >
            <XIcon aria-hidden="true" />
          </button>
        </header>
        <div className="checkout-store-grid checkout-store-grid--modal">
          {stores.map((store) => {
            const inventoryState = getPickupStoreInventoryState(store);

            return (
              <div
                className="checkout-store-card checkout-store-card--ticket checkout-store-card--selectable"
                data-inventory-state={inventoryState}
                data-pickup-store-ticket="true"
                data-selected={
                  store.name === selectedStoreName ? "true" : "false"
                }
                key={store.name}
              >
                <input
                  aria-label={store.name}
                  checked={store.name === selectedStoreName}
                  name="pickup-store-options"
                  onChange={() => onSelect(store.name)}
                  ref={
                    store.name === selectedStoreName ? selectedStoreRef : null
                  }
                  type="radio"
                />
                <span className="checkout-store-card__body">
                  <span className="checkout-store-card__heading">
                    <strong>{store.name}</strong>
                    <Badge
                      className="checkout-store-card__distance"
                      variant="outline"
                    >
                      {store.distanceLabel}
                    </Badge>
                  </span>
                  <PickupStoreTicketDetails store={store} />
                  <Button
                    className="checkout-store-card__select"
                    onClick={(event) => {
                      event.preventDefault();
                      onChoose(store.name);
                    }}
                    type="button"
                    variant={
                      store.name === selectedStoreName ? "default" : "outline"
                    }
                  >
                    {store.name === selectedStoreName
                      ? "Use selected store"
                      : "Select this store"}
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
        <footer className="checkout-modal__actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Confirm pickup store
          </button>
        </footer>
      </div>
    </div>
  );
}

function getCheckoutFieldInputId(stepId: string, label: string): string {
  const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `${stepId}-${labelSlug}`.replace(/-+$/g, "");
}

function isCheckoutFieldRequired(
  stepId: string,
  field: CheckoutField,
): boolean {
  if (field.type === "checkbox") {
    return false;
  }

  if (
    stepId === "billing-address" &&
    (field.label === "Same as shipping" ||
      field.label === "Billing street address" ||
      field.label === "Billing city" ||
      field.label === "Billing ZIP code")
  ) {
    return field.label !== "Same as shipping";
  }

  return !/address line 2|apt|suite/i.test(field.label);
}

function getCheckoutFieldAutocomplete(label: string): string | undefined {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("full name")) {
    return "name";
  }

  if (normalizedLabel.includes("street") || normalizedLabel.includes("apt")) {
    return normalizedLabel.includes("apt") ? "address-line2" : "address-line1";
  }

  if (normalizedLabel.includes("city")) {
    return "address-level2";
  }

  if (normalizedLabel.includes("state")) {
    return "address-level1";
  }

  if (
    normalizedLabel.includes("zip") ||
    normalizedLabel.includes("postal") ||
    normalizedLabel.includes("postcode")
  ) {
    return "postal-code";
  }

  if (normalizedLabel.includes("email")) {
    return "email";
  }

  if (normalizedLabel.includes("phone")) {
    return "tel";
  }

  return undefined;
}

function getCheckoutFieldInputMode(
  label: string,
): InputHTMLAttributes<HTMLInputElement>["inputMode"] {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("email")) {
    return "email";
  }

  if (normalizedLabel.includes("phone")) {
    return "tel";
  }

  if (
    normalizedLabel.includes("zip") ||
    normalizedLabel.includes("postal") ||
    normalizedLabel.includes("postcode")
  ) {
    return "text";
  }

  return "text";
}

function getCheckoutFieldType(label: string): HTMLInputTypeAttribute {
  const normalizedLabel = label.toLowerCase();

  if (normalizedLabel.includes("email")) {
    return "email";
  }

  if (normalizedLabel.includes("phone")) {
    return "tel";
  }

  return "text";
}

function getCheckoutFieldDescription(
  stepId: string,
  field: CheckoutField,
): string | null {
  if (field.type === "checkbox") {
    return null;
  }

  if (stepId === "pickup-location" && /zip|postcode/i.test(field.label)) {
    return "Used only to rank nearby pickup stores.";
  }

  if (isCheckoutFieldRequired(stepId, field)) {
    return "Required to continue this checkout step.";
  }

  return null;
}

function CheckoutPickupDateCalendar({
  step,
  onChoiceChange,
}: {
  readonly step: CheckoutStep;
  readonly onChoiceChange: (
    stepId: string,
    label: string,
    method?: CheckoutSelectedPaymentMethod,
  ) => void;
}) {
  const choices = step.choices ?? [];
  const selectedChoice =
    choices.find((choice) => choice.selected === true) ?? choices[0];
  const selectedDate = parseCheckoutDateValue(selectedChoice?.value);
  const defaultMonth =
    selectedDate ?? parseCheckoutDateValue(choices[0]?.value);
  const availableDates = new Set(
    choices.map((choice) => choice.value).filter(isDefinedString),
  );

  return (
    <div className="checkout-pickup-calendar">
      <Calendar
        mode="single"
        {...(selectedDate ? { selected: selectedDate } : {})}
        {...(defaultMonth ? { defaultMonth } : {})}
        disabled={(date) => !availableDates.has(formatCheckoutDateValue(date))}
        onSelect={(date) => {
          if (!date) {
            return;
          }
          const selectedValue = formatCheckoutDateValue(date);
          const choice = choices.find((item) => item.value === selectedValue);

          if (choice) {
            onChoiceChange(step.id, choice.label, choice.method);
          }
        }}
      />
      {selectedChoice ? (
        <p className="checkout-pickup-calendar__selected">
          <strong>{selectedChoice.label}</strong>
          {selectedChoice.description ? (
            <span>{selectedChoice.description}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function isDefinedString(value: string | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function parseCheckoutDateValue(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const parsedDate = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  return Number.isNaN(parsedDate.valueOf()) ? null : parsedDate;
}

function formatCheckoutDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function CheckoutStepDetails({
  step,
  cardPaymentBox,
  submitErrorMessage,
  submitErrorId,
  validationMessages,
  onFieldChange,
  onChoiceChange,
  onStepSubmit,
}: {
  readonly step: CheckoutStep;
  readonly cardPaymentBox?: ReactNode;
  readonly submitErrorMessage?: string | undefined;
  readonly submitErrorId?: string | undefined;
  readonly validationMessages: readonly CheckoutValidationMessage[];
  readonly onFieldChange: (
    stepId: string,
    label: string,
    value: CheckoutFieldValue,
  ) => void;
  readonly onChoiceChange: (
    stepId: string,
    label: string,
    method?: CheckoutSelectedPaymentMethod,
  ) => void;
  readonly onStepSubmit: (step: CheckoutStep) => void;
}) {
  const hasDetails =
    step.fields?.length ||
    step.choices?.length ||
    step.storeCards?.length ||
    step.primaryActionLabel ||
    submitErrorMessage ||
    validationMessages.length;

  if (!hasDetails) {
    return null;
  }

  return (
    <div className="checkout-step__details">
      {step.fields?.length ? (
        <FieldGroup className="checkout-fields">
          {step.fields.map((field) => {
            const validationMessage = validationMessages.find(
              (message) => message.fieldLabel === field.label,
            );
            const fieldId = getCheckoutFieldInputId(step.id, field.label);
            const fieldRequired = isCheckoutFieldRequired(step.id, field);
            const fieldDescription = getCheckoutFieldDescription(
              step.id,
              field,
            );

            if (field.type === "checkbox") {
              return (
                <Field
                  className="checkout-field checkout-field--checkbox"
                  key={field.label}
                  orientation="horizontal"
                >
                  <Checkbox
                    id={fieldId}
                    checked={field.checked ?? false}
                    onCheckedChange={(checked) => {
                      onFieldChange(step.id, field.label, checked === true);
                    }}
                  />
                  <FieldLabel htmlFor={fieldId}>{field.label}</FieldLabel>
                </Field>
              );
            }

            return (
              <Field
                className="checkout-field"
                data-invalid={validationMessage ? "true" : undefined}
                key={field.label}
              >
                <FieldLabel
                  className={
                    fieldRequired
                      ? "checkout-field-label checkout-field-label--required"
                      : "checkout-field-label"
                  }
                  htmlFor={fieldId}
                >
                  {field.label}
                </FieldLabel>
                <Input
                  id={fieldId}
                  aria-describedby={validationMessage?.id}
                  aria-invalid={validationMessage ? true : undefined}
                  autoComplete={getCheckoutFieldAutocomplete(field.label)}
                  inputMode={getCheckoutFieldInputMode(field.label)}
                  onChange={(event) => {
                    onFieldChange(
                      step.id,
                      field.label,
                      event.currentTarget.value,
                    );
                  }}
                  placeholder={field.placeholder}
                  required={fieldRequired}
                  type={getCheckoutFieldType(field.label)}
                  value={field.value ?? ""}
                />
                {fieldDescription ? (
                  <FieldDescription>{fieldDescription}</FieldDescription>
                ) : null}
                {validationMessage ? (
                  <FormFieldError id={validationMessage.id}>
                    {validationMessage.message}
                  </FormFieldError>
                ) : null}
              </Field>
            );
          })}
        </FieldGroup>
      ) : null}

      {validationMessages.some((message) => !message.fieldLabel) ? (
        <div className="checkout-step__errors">
          {validationMessages
            .filter((message) => !message.fieldLabel)
            .map((message) => (
              <FormFieldError id={message.id} key={message.id}>
                {message.message}
              </FormFieldError>
            ))}
        </div>
      ) : null}

      {submitErrorMessage && submitErrorId ? (
        <FormFieldError id={submitErrorId}>{submitErrorMessage}</FormFieldError>
      ) : null}

      {step.id === "pickup-date" && step.choices?.length ? (
        <CheckoutPickupDateCalendar
          step={step}
          onChoiceChange={onChoiceChange}
        />
      ) : step.choices?.length ? (
        <div className="checkout-choices">
          {step.choices.map((choice) => {
            const paymentLogo = choice.method
              ? paymentMethodLogoByMethod[choice.method]
              : null;

            return (
              <label
                className="checkout-choice"
                data-payment-method-row={choice.method}
                key={choice.label}
              >
                <input
                  checked={choice.selected ?? false}
                  name={step.id}
                  onChange={() =>
                    onChoiceChange(step.id, choice.label, choice.method)
                  }
                  type="radio"
                />
                <span className="checkout-choice__label">
                  {paymentLogo ? (
                    <img
                      alt={paymentLogo.alt}
                      className="checkout-choice__logo"
                      src={paymentLogo.src}
                    />
                  ) : null}
                  <span className="checkout-choice__copy">
                    <strong>{choice.label}</strong>
                    {choice.description ? (
                      <small>{choice.description}</small>
                    ) : null}
                  </span>
                </span>
                {choice.method === "card" &&
                choice.selected &&
                cardPaymentBox ? (
                  <div className="checkout-choice__card-box">
                    {cardPaymentBox}
                  </div>
                ) : null}
                {choice.badgeLabel ? <em>{choice.badgeLabel}</em> : null}
                {choice.amountLabel ? <b>{choice.amountLabel}</b> : null}
              </label>
            );
          })}
        </div>
      ) : null}

      {step.storeCards?.length ? (
        <div className="checkout-store-grid">
          {step.storeCards.map((store) => {
            const inventoryState = getPickupStoreInventoryState(store);

            return (
              <Card
                aria-label={`Pickup store ticket for ${store.name}`}
                className="checkout-store-card checkout-store-card--ticket"
                data-inventory-state={inventoryState}
                data-pickup-store-ticket="true"
                data-selected={store.selected ? "true" : "false"}
                key={store.name}
              >
                <CardHeader className="checkout-store-card__header">
                  <CardTitle>
                    <span className="checkout-store-card__title">
                      <h3>{store.name}</h3>
                      {store.selected ? (
                        <Badge
                          className="checkout-store-card__badge"
                          variant="secondary"
                        >
                          Selected
                        </Badge>
                      ) : null}
                    </span>
                  </CardTitle>
                  <CardAction>
                    <Badge
                      className="checkout-store-card__distance"
                      variant="outline"
                    >
                      {store.distanceLabel}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="checkout-store-card__content">
                  <PickupStoreTicketDetails store={store} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {step.primaryActionLabel ? (
        <Button
          className="checkout-step__action"
          type="button"
          onClick={() => onStepSubmit(step)}
        >
          {step.primaryActionLabel}
        </Button>
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
  const visibleItems = summary.items?.slice(0, 3) ?? [];
  const hiddenItemCount = Math.max((summary.items?.length ?? 0) - 3, 0);

  return (
    <Card
      className="checkout-summary"
      data-visual-accent="commerce-summary"
      aria-label="Order summary"
      role="complementary"
    >
      <CardHeader>
        <CardTitle>
          <h2>{summary.title}</h2>
        </CardTitle>
        <CardDescription className="checkout-summary__description">
          {summary.contextLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="checkout-summary__content">
        {visibleItems.length ? (
          <div className="checkout-summary__items" aria-label="Checkout items">
            {visibleItems.map((item) => (
              <div className="checkout-summary__item" key={item.id}>
                <img src={item.imagePath} alt={item.imageAlt} loading="lazy" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.detailLabel}</span>
                  <Badge variant="secondary">Qty {item.quantity}</Badge>
                </div>
                <b>{item.amountLabel}</b>
              </div>
            ))}
            {hiddenItemCount > 0 ? (
              <p className="checkout-summary__more-items">
                +{hiddenItemCount} more checkout item
                {hiddenItemCount === 1 ? "" : "s"}
              </p>
            ) : null}
          </div>
        ) : null}
        {summary.readyItemsLabel ? (
          <div className="checkout-summary__split">
            <strong>{summary.readyItemsLabel}</strong>
            <span>{summary.unavailableItemsLabel}</span>
            {summary.partialInventoryNote ? (
              <p>{summary.partialInventoryNote}</p>
            ) : null}
          </div>
        ) : null}
        <div className="checkout-summary__promo-panel">
          <div>
            <Badge variant="outline">Offer status</Badge>
            <strong>{summary.promoLabel}</strong>
          </div>
          <p>
            {summary.promoHelpLabel ??
              "Offers are checked against saved fulfillment details before payment."}
          </p>
        </div>
        <Separator className="checkout-summary__separator" />
        <dl>
          <div>
            <dt>Merchandise subtotal</dt>
            <dd>{summary.subtotalLabel}</dd>
          </div>
          <div>
            <dt>Promo</dt>
            <dd>{summary.promoLabel}</dd>
          </div>
          {summary.shippingLabel ? (
            <div>
              <dt>Shipping</dt>
              <dd>{summary.shippingLabel}</dd>
            </div>
          ) : null}
          {summary.taxLabel ? (
            <div>
              <dt>Estimated tax</dt>
              <dd>{summary.taxLabel}</dd>
            </div>
          ) : null}
          <div className="checkout-summary__total-row">
            <dt>Total</dt>
            <dd>{summary.totalLabel}</dd>
          </div>
        </dl>
      </CardContent>
      {paymentAction ? (
        <CardFooter
          className="checkout-summary__payment"
          aria-label="Selected payment method"
        >
          <div
            className="checkout-summary__slot"
            data-payment-action-reserved-space="true"
          >
            {paymentAction}
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}

function CheckoutTrustStrip() {
  const highlights = [
    {
      label: "Official payment surfaces",
      body: "PayPal, Pay Later, card, and wallets render only from eligible provider flows.",
    },
    {
      label: "Totals reconciled",
      body: "Shipping, promo, and tax-sensitive totals update before payment.",
    },
    {
      label: "Delivery or pickup",
      body: "Choose fulfillment first; pickup-unavailable items stay in cart.",
    },
    {
      label: "Order recovery",
      body: "Started payment sessions can be reviewed or recovered.",
    },
  ];

  return (
    <section
      className="checkout-trust-strip"
      data-visual-accent="trust-strip"
      aria-label="Checkout safeguards"
    >
      {highlights.map((highlight) => (
        <div className="checkout-trust-strip__item" key={highlight.label}>
          <Badge variant="secondary">{highlight.label}</Badge>
          <p>{highlight.body}</p>
        </div>
      ))}
    </section>
  );
}

function withDefaultStepDetails(
  step: CheckoutStep,
  selectedPaymentMethod: CheckoutSelectedPaymentMethod,
): CheckoutStep {
  const defaults = defaultStepDetailsById[step.id];

  if (!defaults) {
    return step;
  }

  let stepWithDetails: CheckoutStep = {
    ...step,
  };
  const fields = step.fields ?? defaults.fields;
  const choices = normalizePaymentChoices(
    step.id,
    step.choices ?? defaults.choices,
    selectedPaymentMethod,
  );
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

function normalizePaymentChoices(
  stepId: string,
  choices: readonly CheckoutChoice[] | undefined,
  selectedPaymentMethod: CheckoutSelectedPaymentMethod,
): readonly CheckoutChoice[] | undefined {
  if (
    !choices ||
    (stepId !== "payment-method" && stepId !== "pickup-payment-method")
  ) {
    return choices;
  }

  return choices
    .filter((choice) => choice.eligible !== false)
    .map((choice) =>
      choice.method
        ? {
            ...choice,
            selected: choice.method === selectedPaymentMethod,
          }
        : choice,
    );
}

function isSelectedPaymentMethodEligible(
  draft: CheckoutFulfillmentDraft,
  selectedPaymentMethod: CheckoutSelectedPaymentMethod,
): boolean {
  const paymentStep = draft.steps.find(
    (step) =>
      step.id === "payment-method" || step.id === "pickup-payment-method",
  );

  if (!paymentStep) {
    return false;
  }

  const stepWithDetails = withDefaultStepDetails(
    paymentStep,
    selectedPaymentMethod,
  );
  const selectedChoice = stepWithDetails.choices?.find(
    (choice) => choice.method === selectedPaymentMethod,
  );

  return selectedChoice?.eligible !== false && selectedChoice !== undefined;
}

function isSaveForFutureEligible(
  summary: CheckoutOrderSummary,
  selectedPaymentMethod: CheckoutSelectedPaymentMethod,
): boolean {
  return (
    summary.saveForFutureEligible === true &&
    (selectedPaymentMethod === "paypal" || selectedPaymentMethod === "card")
  );
}

function getPickupStoreCards(
  draft: CheckoutFulfillmentDraft,
): readonly CheckoutStoreCard[] {
  const storeStep = draft.steps.find((step) => step.id === "store-selection");
  const defaultStoreCards = defaultStepDetailsById["store-selection"]
    ?.storeCards as readonly CheckoutStoreCard[] | undefined;

  return storeStep?.storeCards ?? defaultStoreCards ?? [];
}

function getPickupStoreByName(
  stores: readonly CheckoutStoreCard[],
  storeName: string | null,
): CheckoutStoreCard | null {
  if (!storeName) {
    return null;
  }

  return stores.find((store) => store.name === storeName) ?? null;
}

function getDefaultPickupStoreName(
  draft: CheckoutFulfillmentDraft,
): string | null {
  const storeCards = getPickupStoreCards(draft);

  return (
    storeCards.find((store) => store.selected === true)?.name ??
    storeCards[0]?.name ??
    null
  );
}

function buildDefaultPickupDateChoices(
  baseDate = new Date(),
): readonly CheckoutChoice[] {
  const startDate = new Date(baseDate);
  startDate.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, index) => {
    const pickupDate = new Date(startDate);
    pickupDate.setDate(startDate.getDate() + index);

    return {
      label: new Intl.DateTimeFormat("en-US", {
        day: "numeric",
        month: "long",
      }).format(pickupDate),
      value: formatCheckoutDateValue(pickupDate),
      ...(index === 0 ? { selected: true } : {}),
    };
  });
}

const deliveryBillingAddressFields: readonly CheckoutField[] = [
  {
    label: "Billing street address",
    type: "text",
    value: "",
  },
  {
    label: "Billing city",
    type: "text",
    value: "",
  },
  {
    label: "Billing ZIP code",
    type: "text",
    value: "",
  },
];

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
        value: "ship_standard",
        description: "Arrives in 4-6 business days",
        amountLabel: "$5.00",
        badgeLabel: "Cheapest option",
        selected: true,
      },
      {
        label: "Express shipping",
        value: "ship_express",
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
      },
      {
        label: "Credit or debit card",
        method: "card",
      },
      {
        label: "Apple Pay",
        method: "apple_pay",
      },
      {
        label: "Google Pay",
        method: "google_pay",
      },
      {
        label: "Venmo",
        method: "venmo",
      },
    ],
  },
  "pickup-location": {
    fields: [
      {
        label: "ZIP or postcode",
        type: "text",
        value: "",
      },
    ],
    primaryActionLabel: "Find pickup stores",
  },
  "store-selection": {
    storeCards: [
      {
        id: "store_popmart_soho",
        name: "POP MART Soho",
        address: "3 Peter Street, London W1F 0AA",
        distanceLabel: "1.2 mi",
        phoneLabel: "+44 20 5555 0135",
        availableItemsLabel: "Available: 1 item",
        unavailableItemsLabel: "Unavailable: 1 item",
        inventoryLines: [
          {
            itemName: "Labubu Have a Seat",
            requestedQuantity: 1,
            fulfillableQuantity: 1,
            status: "available",
            statusLabel: "In stock",
          },
          {
            itemName: "Hirono Little Mischief",
            requestedQuantity: 1,
            fulfillableQuantity: 0,
            status: "unavailable",
            statusLabel: "Sold out",
          },
        ],
        statusLabel: "Partial inventory",
        partialInventoryNote: "Unavailable items stay in the original cart.",
        selected: true,
      },
      {
        id: "store_popmart_covent_garden",
        name: "POP MART Covent Garden",
        address: "12 Long Acre, London WC2E 9LA",
        distanceLabel: "1.8 mi",
        phoneLabel: "+44 20 5555 0199",
        availableItemsLabel: "Available: 2 items",
        unavailableItemsLabel: "Unavailable: 0 items",
        inventoryLines: [
          {
            itemName: "Labubu Have a Seat",
            requestedQuantity: 1,
            fulfillableQuantity: 1,
            status: "available",
            statusLabel: "In stock",
          },
          {
            itemName: "Hirono Little Mischief",
            requestedQuantity: 1,
            fulfillableQuantity: 1,
            status: "available",
            statusLabel: "In stock",
          },
        ],
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
    choices: buildDefaultPickupDateChoices(),
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
      {
        label: "Apple Pay",
        method: "apple_pay",
      },
      {
        label: "Google Pay",
        method: "google_pay",
      },
      {
        label: "Venmo",
        method: "venmo",
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
      items: [
        {
          id: "checkout-item-labubu",
          name: "Labubu Have a Seat",
          detailLabel: "Blind Boxes",
          imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
          imageAlt: "Labubu Have a Seat collectible",
          quantity: 1,
          amountLabel: "$12.99",
        },
        {
          id: "checkout-item-hirono",
          name: "Hirono Little Mischief",
          detailLabel: "Plush",
          imagePath: "/assets/popmart/products/plush-11-1.png",
          imageAlt: "Hirono Little Mischief collectible",
          quantity: 1,
          amountLabel: "$12.99",
        },
      ],
      subtotalLabel: "$25.98",
      promoLabel: "No promo applied",
      promoHelpLabel:
        "Eligible promos appear here after checkout details match.",
      taxLabel: "Calculated before payment",
      totalLabel: "$25.98",
      selectedPaymentLabel: "PayPal selected",
      selectedPaymentMethod: "paypal",
    },
    steps: [
      {
        id: "shipping-address",
        title: "Shipping address",
        state: "editing",
        body: "Use saved shipping address or enter a new delivery address.",
      },
      {
        id: "billing-address",
        title: "Billing address",
        state: "idle",
        body: "Same as shipping is checked by default.",
      },
      {
        id: "shipping-options",
        title: "Shipping options",
        state: "idle",
        body: "Cheapest eligible option is selected by default.",
      },
      {
        id: "payment-method",
        title: "Payment method",
        state: "idle",
        body: "Radio-first payment method wall renders here.",
      },
    ],
  },
  pickup: {
    label: "Pickup",
    checkoutDraftId: "draft_pickup_123",
    summary: {
      title: "Pickup order",
      contextLabel: "Choose a pickup store",
      items: [
        {
          id: "checkout-pickup-item-labubu",
          name: "Labubu Have a Seat",
          detailLabel: "Blind Boxes",
          imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
          imageAlt: "Labubu Have a Seat collectible",
          quantity: 1,
          amountLabel: "$12.99",
        },
      ],
      subtotalLabel: "$12.99",
      promoLabel: "No promo applied",
      promoHelpLabel:
        "Eligible pickup promos appear after a store is selected.",
      taxLabel: "Calculated before payment",
      totalLabel: "$12.99",
      selectedPaymentLabel: "PayPal selected",
      selectedPaymentMethod: "paypal",
    },
    steps: [
      {
        id: "pickup-location",
        title: "Pickup location",
        state: "editing",
        body: "Use ZIP or default address to rank nearby stores.",
      },
      {
        id: "store-selection",
        title: "Store selection",
        state: "idle",
        body: "Store card shows available and unavailable item counts.",
      },
      {
        id: "pickup-billing-address",
        title: "Billing address",
        state: "idle",
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

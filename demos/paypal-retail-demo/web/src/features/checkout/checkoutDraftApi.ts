import type {
  CheckoutChoice,
  CheckoutField,
  CheckoutFulfillmentDraft,
  CheckoutOrderSummary,
  CheckoutPageData,
  CheckoutStep,
} from "./CheckoutPage.js";

export interface CheckoutDraftApiResponse {
  readonly draft?: CheckoutDraftDto;
}

export interface CheckoutDraftDto {
  readonly id: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly active_step?: string;
  readonly delivery?: CheckoutDeliveryDraftDto;
  readonly pickup?: CheckoutPickupDraftDto;
  readonly summary?: CheckoutSummaryDto;
  readonly promo?: CheckoutPromoDto;
}

export interface CheckoutDeliveryDraftDto {
  readonly shipping_address?: CheckoutAddressDto | null;
  readonly billing_address?: CheckoutAddressDto | null;
  readonly same_as_shipping?: boolean;
  readonly shipping_options?: readonly CheckoutShippingOptionDto[];
  readonly selected_shipping_option_id?: string | null;
}

export interface CheckoutAddressDto {
  readonly recipient_name?: string | null;
  readonly address_line1?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postal_code?: string | null;
  readonly country_code?: string | null;
}

export interface CheckoutShippingOptionDto {
  readonly id: string;
  readonly display_name: string;
  readonly amount_minor: number;
  readonly estimated_days_min?: number;
  readonly estimated_days_max?: number;
}

export interface CheckoutPickupDraftDto {
  readonly inventory?: CheckoutPickupInventoryDto;
  readonly pickup_dates?: readonly CheckoutPickupDateDto[];
  readonly selected_pickup_date?: string | null;
}

export interface CheckoutPickupInventoryDto {
  readonly ready_items?: readonly CheckoutPickupInventoryItemDto[];
  readonly unavailable_items?: readonly CheckoutPickupInventoryItemDto[];
}

export interface CheckoutPickupInventoryItemDto {
  readonly fulfillable_quantity?: number;
  readonly unavailable_quantity?: number;
}

export interface CheckoutPickupDateDto {
  readonly pickup_date: string;
  readonly is_available: boolean;
}

export interface CheckoutSummaryDto {
  readonly merchandise_subtotal_minor: number;
  readonly discount_minor: number;
  readonly total_minor: number;
  readonly currency_code: string;
}

export interface CheckoutPromoDto {
  readonly selected_codes?: readonly string[];
  readonly recommended_codes?: readonly string[];
  readonly status?: string;
}

export function reconcileCheckoutDataFromDraftResponse(
  currentData: CheckoutPageData,
  response: CheckoutDraftApiResponse,
): CheckoutPageData {
  const draft = response.draft;

  if (!draft) {
    return currentData;
  }

  if (draft.fulfillment_mode === "pickup") {
    return {
      ...currentData,
      activeMode: "pickup",
      pickup: reconcilePickupDraft(currentData.pickup, draft),
    };
  }

  return {
    ...currentData,
    activeMode: "delivery",
    delivery: reconcileDeliveryDraft(currentData.delivery, draft),
  };
}

function reconcileDeliveryDraft(
  currentDraft: CheckoutFulfillmentDraft,
  draft: CheckoutDraftDto,
): CheckoutFulfillmentDraft {
  return {
    ...currentDraft,
    checkoutDraftId: draft.id,
    summary: draft.summary
      ? reconcileSummary(currentDraft.summary, draft.summary, draft.promo)
      : currentDraft.summary,
    steps: reconcileDeliverySteps(
      currentDraft.steps,
      draft.delivery,
      draft.summary?.currency_code ?? "USD",
    ),
  };
}

function reconcilePickupDraft(
  currentDraft: CheckoutFulfillmentDraft,
  draft: CheckoutDraftDto,
): CheckoutFulfillmentDraft {
  return {
    ...currentDraft,
    checkoutDraftId: draft.id,
    summary: reconcilePickupSummary(
      draft.summary
        ? reconcileSummary(currentDraft.summary, draft.summary, draft.promo)
        : currentDraft.summary,
      draft.pickup?.inventory,
    ),
    steps: reconcilePickupSteps(currentDraft.steps, draft.pickup),
  };
}

function reconcileSummary(
  currentSummary: CheckoutOrderSummary,
  summary: CheckoutSummaryDto,
  promo: CheckoutPromoDto | undefined,
): CheckoutOrderSummary {
  return {
    ...currentSummary,
    subtotalLabel: formatMinor(summary.merchandise_subtotal_minor, summary),
    promoLabel: formatPromoLabel(summary, promo),
    totalLabel: formatMinor(summary.total_minor, summary),
  };
}

function reconcilePickupSummary(
  summary: CheckoutOrderSummary,
  inventory: CheckoutPickupInventoryDto | undefined,
): CheckoutOrderSummary {
  if (!inventory) {
    return summary;
  }

  const readyCount = sumInventoryCount(inventory.ready_items, "fulfillable");
  const unavailableCount = sumInventoryCount(
    inventory.unavailable_items,
    "unavailable",
  );

  const nextSummary: CheckoutOrderSummary = {
    ...summary,
    readyItemsLabel: `Ready for pickup: ${formatItemCount(readyCount)}`,
    unavailableItemsLabel: `Not available at this store: ${formatItemCount(
      unavailableCount,
    )}`,
  };

  return unavailableCount > 0
    ? {
        ...nextSummary,
        partialInventoryNote: "Unavailable items stay in the original cart.",
      }
    : omitPartialInventoryNote(nextSummary);
}

function reconcileDeliverySteps(
  steps: readonly CheckoutStep[],
  delivery: CheckoutDeliveryDraftDto | undefined,
  currencyCode: string,
): readonly CheckoutStep[] {
  if (!delivery) {
    return steps;
  }

  return steps.map((step) => {
    if (step.id === "shipping-address" && delivery.shipping_address) {
      return {
        ...step,
        fields: mapAddressFields(delivery.shipping_address),
      };
    }

    if (step.id === "shipping-options" && delivery.shipping_options?.length) {
      return {
        ...step,
        choices: delivery.shipping_options.map((option) =>
          mapShippingChoice(
            option,
            delivery.selected_shipping_option_id,
            currencyCode,
          ),
        ),
      };
    }

    return step;
  });
}

function reconcilePickupSteps(
  steps: readonly CheckoutStep[],
  pickup: CheckoutPickupDraftDto | undefined,
): readonly CheckoutStep[] {
  const pickupDates = pickup?.pickup_dates;

  if (!pickupDates?.length) {
    return steps;
  }
  const selectedPickupDate = pickup?.selected_pickup_date;

  return steps.map((step) =>
    step.id === "pickup-date"
      ? {
          ...step,
          choices: pickupDates
            .filter((date) => date.is_available)
            .map((date) => ({
              label: formatDateLabel(date.pickup_date),
              value: date.pickup_date,
              selected: date.pickup_date === selectedPickupDate,
            })),
        }
      : step,
  );
}

function mapAddressFields(
  address: CheckoutAddressDto,
): readonly CheckoutField[] {
  return [
    {
      label: "Full name",
      type: "text",
      value: address.recipient_name ?? "",
    },
    {
      label: "Street address",
      type: "text",
      value: address.address_line1 ?? "",
    },
    {
      label: "City",
      type: "text",
      value: address.city ?? "",
    },
    {
      label: "State",
      type: "text",
      value: address.state ?? "",
    },
    {
      label: "ZIP code",
      type: "text",
      value: address.postal_code ?? "",
    },
  ];
}

function mapShippingChoice(
  option: CheckoutShippingOptionDto,
  selectedOptionId: string | null | undefined,
  currencyCode: string,
): CheckoutChoice {
  const choice: CheckoutChoice = {
    label: option.display_name,
    value: option.id,
    amountLabel: formatMinor(option.amount_minor, {
      currency_code: currencyCode,
    }),
    selected: option.id === selectedOptionId,
  };

  return option.estimated_days_min && option.estimated_days_max
    ? {
        ...choice,
        description: `Arrives in ${option.estimated_days_min}-${option.estimated_days_max} business days`,
      }
    : choice;
}

function formatPromoLabel(
  summary: CheckoutSummaryDto,
  promo: CheckoutPromoDto | undefined,
): string {
  const selectedCodes = promo?.selected_codes ?? [];

  if (selectedCodes.length) {
    return selectedCodes.join(" + ");
  }

  if (summary.discount_minor > 0) {
    return `-${formatMinor(summary.discount_minor, summary)}`;
  }

  return promo?.status === "pending" ? "Promo calculating" : "No promo applied";
}

function formatMinor(
  minor: number,
  summary: Pick<CheckoutSummaryDto, "currency_code">,
): string {
  return new Intl.NumberFormat("en-US", {
    currency: summary.currency_code,
    style: "currency",
  }).format(minor / 100);
}

function sumInventoryCount(
  items: readonly CheckoutPickupInventoryItemDto[] | undefined,
  kind: "fulfillable" | "unavailable",
): number {
  return (items ?? []).reduce(
    (sum, item) =>
      sum +
      (kind === "fulfillable"
        ? (item.fulfillable_quantity ?? 0)
        : (item.unavailable_quantity ?? 0)),
    0,
  );
}

function formatItemCount(count: number): string {
  return `${count} ${count === 1 ? "item" : "items"}`;
}

function omitPartialInventoryNote(
  summary: CheckoutOrderSummary,
): CheckoutOrderSummary {
  const { partialInventoryNote: _partialInventoryNote, ...rest } = summary;
  return rest;
}

function formatDateLabel(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsedDate.valueOf())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(parsedDate);
}

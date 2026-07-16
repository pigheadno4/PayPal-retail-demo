import type {
  CheckoutChoice,
  CheckoutField,
  CheckoutFulfillmentDraft,
  CheckoutOrderSummary,
  CheckoutPageData,
  CheckoutPaymentReadiness,
  CheckoutPaymentReadinessState,
  CheckoutStep,
  CheckoutStoreCard,
  CheckoutStoreInventoryLine,
} from "./CheckoutPage.js";

export interface CheckoutDraftApiResponse {
  readonly draft?: CheckoutDraftDto;
}

export interface CheckoutDraftDto {
  readonly id: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly items?: readonly CheckoutDraftItemDto[];
  readonly active_step?: string;
  readonly delivery?: CheckoutDeliveryDraftDto;
  readonly payment_readiness?: CheckoutPaymentReadinessDto | null;
  readonly pickup?: CheckoutPickupDraftDto;
  readonly summary?: CheckoutSummaryDto;
  readonly promo?: CheckoutPromoDto;
  readonly resume_context?: CheckoutResumeContextDto;
}

export interface CheckoutResumeContextDto {
  readonly order_number: string;
  readonly market_code: string;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly paylater_buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
}

export interface CheckoutDraftItemDto {
  readonly id: string;
  readonly product_name: string;
  readonly image_path?: string | null;
  readonly quantity: number;
  readonly unit_price_minor: number;
  readonly line_subtotal_minor: number;
}

export interface CheckoutPaymentReadinessDto {
  readonly state: CheckoutPaymentReadinessState;
  readonly title?: string | null;
  readonly body?: string | null;
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
  readonly address_line2?: string | null;
  readonly city?: string | null;
  readonly state?: string | null;
  readonly postal_code?: string | null;
  readonly country_code?: string | null;
  readonly phone?: string | null;
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
  readonly stores?: readonly CheckoutPickupStoreDto[];
  readonly selected_store_id?: string | null;
}

export interface CheckoutPickupStoreDto {
  readonly id: string;
  readonly name: string;
  readonly address_line1: string;
  readonly address_line2?: string | null;
  readonly city: string;
  readonly state?: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly phone?: string | null;
  readonly distance_label?: string | null;
  readonly available_items_count: number;
  readonly unavailable_items_count: number;
  readonly inventory_lines?: readonly CheckoutPickupStoreInventoryLineDto[];
  readonly selected?: boolean;
}

export interface CheckoutPickupStoreInventoryLineDto {
  readonly product_id?: string;
  readonly product_name?: string | null;
  readonly requested_quantity?: number;
  readonly fulfillable_quantity?: number;
  readonly unavailable_quantity?: number;
  readonly status?: "available" | "limited" | "unavailable" | string;
  readonly status_label?: string | null;
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
  readonly shipping_minor?: number;
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
      ...reconcileResumeContext(currentData, draft),
      pickup: reconcilePickupDraft(currentData.pickup, draft),
    };
  }

  return {
    ...currentData,
    activeMode: "delivery",
    ...reconcileResumeContext(currentData, draft),
    delivery: reconcileDeliveryDraft(currentData.delivery, draft),
  };
}

function reconcileResumeContext(
  currentData: CheckoutPageData,
  draft: CheckoutDraftDto,
): Pick<
  CheckoutPageData,
  "lockedReason" | "modeLocked" | "resumePaymentContext"
> {
  if (!draft.resume_context) {
    const { lockedReason, modeLocked, resumePaymentContext } = currentData;
    return {
      lockedReason,
      modeLocked,
      ...(resumePaymentContext ? { resumePaymentContext } : {}),
    };
  }

  return {
    modeLocked: true,
    lockedReason: `This resumed order keeps its original ${
      draft.fulfillment_mode === "delivery" ? "Delivery" : "Pickup"
    } method.`,
    resumePaymentContext: {
      orderNumber: draft.resume_context.order_number,
      marketCode: draft.resume_context.market_code,
      currencyCode: draft.resume_context.currency_code,
      locale: draft.resume_context.locale,
      buyerCountry: draft.resume_context.buyer_country,
      payLaterBuyerCountry: draft.resume_context.paylater_buyer_country,
      sandboxTestBuyerCountry: draft.resume_context.sandbox_test_buyer_country,
    },
  };
}

function reconcileDeliveryDraft(
  currentDraft: CheckoutFulfillmentDraft,
  draft: CheckoutDraftDto,
): CheckoutFulfillmentDraft {
  const paymentReadiness = reconcilePaymentReadiness(
    currentDraft.paymentReadiness,
    draft.payment_readiness,
  );
  const { paymentReadiness: _currentPaymentReadiness, ...baseDraft } =
    currentDraft;

  return {
    ...baseDraft,
    checkoutDraftId: draft.id,
    ...(paymentReadiness ? { paymentReadiness } : {}),
    summary: draft.summary
      ? reconcileSummary(
          currentDraft.summary,
          draft.summary,
          draft.promo,
          draft.items,
        )
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
  const paymentReadiness = reconcilePaymentReadiness(
    currentDraft.paymentReadiness,
    draft.payment_readiness,
  );
  const { paymentReadiness: _currentPaymentReadiness, ...baseDraft } =
    currentDraft;

  return {
    ...baseDraft,
    checkoutDraftId: draft.id,
    ...(paymentReadiness ? { paymentReadiness } : {}),
    summary: reconcilePickupSummary(
      draft.summary
        ? reconcileSummary(
            currentDraft.summary,
            draft.summary,
            draft.promo,
            draft.items,
          )
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
  items: readonly CheckoutDraftItemDto[] | undefined,
): CheckoutOrderSummary {
  return {
    ...currentSummary,
    ...(items
      ? {
          items: items.map((item) => ({
            id: item.id,
            name: item.product_name,
            detailLabel: `Qty ${item.quantity}`,
            imagePath:
              item.image_path ?? "/assets/generic/products/placeholder.svg",
            imageAlt: `${item.product_name} collectible`,
            quantity: item.quantity,
            amountLabel: formatMinor(item.line_subtotal_minor, summary),
          })),
        }
      : {}),
    subtotalLabel: formatMinor(summary.merchandise_subtotal_minor, summary),
    promoLabel: formatPromoLabel(summary, promo),
    ...(typeof summary.shipping_minor === "number"
      ? { shippingLabel: formatMinor(summary.shipping_minor, summary) }
      : {}),
    totalLabel: formatMinor(summary.total_minor, summary),
  };
}

function reconcilePaymentReadiness(
  currentReadiness: CheckoutPaymentReadiness | undefined,
  readiness: CheckoutPaymentReadinessDto | null | undefined,
): CheckoutPaymentReadiness | undefined {
  if (readiness === undefined) {
    return currentReadiness;
  }

  if (!readiness) {
    return undefined;
  }

  return {
    state: readiness.state,
    ...(readiness.title ? { title: readiness.title } : {}),
    ...(readiness.body ? { body: readiness.body } : {}),
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
  const pickupStores = pickup?.stores;

  if (!pickupDates?.length && !pickupStores?.length) {
    return steps;
  }
  const selectedPickupDate = pickup?.selected_pickup_date;
  const selectedStoreId = pickup?.selected_store_id;

  return steps.map((step) => {
    if (step.id === "store-selection" && pickupStores?.length) {
      return {
        ...step,
        storeCards: pickupStores.map((store) =>
          mapPickupStoreCard(store, selectedStoreId),
        ),
      };
    }

    if (step.id === "pickup-date" && pickupDates?.length) {
      return {
        ...step,
        choices: pickupDates
          .filter((date) => date.is_available)
          .map((date) => ({
            label: formatDateLabel(date.pickup_date),
            value: date.pickup_date,
            selected: date.pickup_date === selectedPickupDate,
          })),
      };
    }

    return step;
  });
}

function mapAddressFields(
  address: CheckoutAddressDto,
): readonly CheckoutField[] {
  const nameParts = splitRecipientName(address.recipient_name ?? "");
  const stateValue = address.state ?? "";

  return [
    {
      label: "First name",
      type: "text",
      value: nameParts.firstName,
    },
    {
      label: "Last name",
      type: "text",
      value: nameParts.lastName,
    },
    {
      label: "Street address",
      type: "text",
      value: address.address_line1 ?? "",
    },
    {
      label: "Apt, suite, or building",
      type: "text",
      value: address.address_line2 ?? "",
    },
    {
      label: "City",
      type: "text",
      value: address.city ?? "",
    },
    {
      label: "State",
      options: getStateOptionsWithFallback(stateValue),
      type: "select",
      value: stateValue,
    },
    {
      label: "ZIP code",
      type: "text",
      value: address.postal_code ?? "",
    },
    {
      label: "Phone number",
      type: "text",
      value: address.phone ?? "",
    },
  ];
}

function splitRecipientName(name: string): {
  readonly firstName: string;
  readonly lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] ?? "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function getStateOptionsWithFallback(
  stateValue: string,
): readonly { readonly label: string; readonly value: string }[] {
  const options = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DC",
    "FL",
    "GA",
    "IL",
    "MA",
    "NJ",
    "NY",
    "PA",
    "TX",
    "WA",
  ].map((state) => ({ label: state, value: state }));

  return stateValue && !options.some((option) => option.value === stateValue)
    ? [{ label: stateValue, value: stateValue }, ...options]
    : options;
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

function mapPickupStoreCard(
  store: CheckoutPickupStoreDto,
  selectedStoreId: string | null | undefined,
): CheckoutStoreCard {
  const availableItemsCount = store.available_items_count;
  const unavailableItemsCount = store.unavailable_items_count;
  const inventoryLines = mapPickupStoreInventoryLines(store.inventory_lines);
  const baseStoreCard: CheckoutStoreCard = {
    id: store.id,
    name: store.name,
    address: formatPickupStoreAddress(store),
    distanceLabel: store.distance_label ?? "Available nearby",
    phoneLabel: store.phone ?? "Phone not listed",
    availableItemsLabel: `Available: ${formatItemCount(
      store.available_items_count,
    )}`,
    unavailableItemsLabel: `Unavailable: ${formatItemCount(
      unavailableItemsCount,
    )}`,
    ...(inventoryLines ? { inventoryLines } : {}),
    selected: store.selected === true || store.id === selectedStoreId,
  };

  if (availableItemsCount <= 0) {
    return {
      ...baseStoreCard,
      partialInventoryNote: "Unavailable items stay in the original cart.",
      statusLabel: "Sold out",
    };
  }

  return unavailableItemsCount > 0
    ? {
        ...baseStoreCard,
        partialInventoryNote: "Unavailable items stay in the original cart.",
        statusLabel: "Partial inventory",
      }
    : {
        ...baseStoreCard,
        statusLabel: "Full inventory",
      };
}

function formatPickupStoreAddress(store: CheckoutPickupStoreDto): string {
  const locality = [store.city, store.state, store.postal_code]
    .filter(Boolean)
    .join(", ");
  return [
    store.address_line1,
    store.address_line2,
    locality,
    store.country_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPromoLabel(
  summary: CheckoutSummaryDto,
  promo: CheckoutPromoDto | undefined,
): string {
  const selectedCodes = promo?.selected_codes ?? [];

  if (summary.discount_minor > 0) {
    const discountLabel = `-${formatMinor(summary.discount_minor, summary)} promo`;
    return selectedCodes.length
      ? `${discountLabel} (${selectedCodes.join(" + ")})`
      : discountLabel;
  }

  if (selectedCodes.length) {
    return selectedCodes.join(" + ");
  }

  return "No promo applied";
}

function mapPickupStoreInventoryLines(
  lines: readonly CheckoutPickupStoreInventoryLineDto[] | undefined,
): readonly CheckoutStoreInventoryLine[] | undefined {
  if (!lines?.length) {
    return undefined;
  }

  return lines.map((line) => {
    const requestedQuantity = line.requested_quantity ?? 0;
    const fulfillableQuantity = line.fulfillable_quantity ?? 0;
    const status = normalizePickupStoreInventoryStatus(line.status);

    return {
      itemName: line.product_name?.trim() || "Cart item",
      requestedQuantity,
      fulfillableQuantity,
      status,
      statusLabel:
        line.status_label?.trim() ||
        formatPickupStoreInventoryStatus(status, fulfillableQuantity),
    };
  });
}

function normalizePickupStoreInventoryStatus(
  status: string | undefined,
): CheckoutStoreInventoryLine["status"] {
  return status === "available" || status === "limited"
    ? status
    : status === "unavailable"
      ? "unavailable"
      : "available";
}

function formatPickupStoreInventoryStatus(
  status: CheckoutStoreInventoryLine["status"],
  fulfillableQuantity: number,
): string {
  if (status === "available") {
    return "In stock";
  }

  if (status === "limited") {
    return `Only ${fulfillableQuantity} available`;
  }

  return "Sold out";
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

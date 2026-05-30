import {
  addMinor,
  assertMinorUnit,
  multiplyMinor,
  subtractMinor,
  type MinorUnit,
} from "./money.js";

export type PayPalCurrencyCode = "USD" | "GBP";
export type PayPalShippingPreference =
  | "GET_FROM_FILE"
  | "SET_PROVIDED_ADDRESS"
  | "NO_SHIPPING";
export type PayPalShippingCallbackEvent =
  | "SHIPPING_ADDRESS"
  | "SHIPPING_OPTIONS";

export interface PayPalMoney {
  readonly currency_code: PayPalCurrencyCode;
  readonly value: string;
}

export interface PayPalOrderLineItemInput {
  readonly name: string;
  readonly quantity: number;
  readonly unitAmountMinor: number;
  readonly sku?: string | null;
  readonly description?: string | null;
  readonly url?: string | null;
  readonly imageUrl?: string | null;
}

export interface PayPalDeliveryAddressInput {
  readonly fullName: string;
  readonly addressLine1: string;
  readonly addressLine2?: string | null;
  readonly adminArea2: string;
  readonly adminArea1?: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
}

export interface BuildPayPalDeliveryCreateOrderInput {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly shippingAddress: PayPalDeliveryAddressInput;
}

export interface BuildPayPalExpressDeliveryCreateOrderInput {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
  readonly shippingCallbackUrl: string;
  readonly callbackEvents?: readonly PayPalShippingCallbackEvent[];
}

export interface PayPalCreateOrderPayload {
  readonly intent: "CAPTURE";
  readonly purchase_units: readonly PayPalPurchaseUnit[];
  readonly payment_source: {
    readonly paypal: {
      readonly experience_context: {
        readonly shipping_preference: PayPalShippingPreference;
        readonly order_update_callback_config?: PayPalOrderUpdateCallbackConfig;
      };
    };
  };
}

export interface PayPalOrderUpdateCallbackConfig {
  readonly callback_events: readonly PayPalShippingCallbackEvent[];
  readonly callback_url: string;
}

export interface PayPalPurchaseUnit {
  readonly invoice_id: string;
  readonly items: readonly PayPalOrderLineItem[];
  readonly amount: {
    readonly currency_code: PayPalCurrencyCode;
    readonly value: string;
    readonly breakdown: PayPalAmountBreakdown;
  };
  readonly shipping?: PayPalShipping;
}

export interface PayPalOrderLineItem {
  readonly name: string;
  readonly quantity: string;
  readonly sku?: string;
  readonly description?: string;
  readonly url?: string;
  readonly image_url?: string;
  readonly category: "PHYSICAL_GOODS";
  readonly unit_amount: PayPalMoney;
}

export interface PayPalAmountBreakdown {
  readonly item_total: PayPalMoney;
  readonly shipping: PayPalMoney;
  readonly tax_total: PayPalMoney;
  readonly discount?: PayPalMoney;
}

export interface PayPalShipping {
  readonly name: {
    readonly full_name: string;
  };
  readonly address: {
    readonly address_line_1: string;
    readonly address_line_2?: string;
    readonly admin_area_2: string;
    readonly admin_area_1?: string;
    readonly postal_code: string;
    readonly country_code: string;
  };
}

export function buildPayPalDeliveryCreateOrderPayload(
  input: BuildPayPalDeliveryCreateOrderInput,
): PayPalCreateOrderPayload {
  return {
    intent: "CAPTURE",
    purchase_units: [
      {
        ...buildPayPalPurchaseUnitBase(input),
        shipping: buildPayPalShipping(input.shippingAddress),
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "SET_PROVIDED_ADDRESS",
        },
      },
    },
  };
}

export function buildPayPalExpressDeliveryCreateOrderPayload(
  input: BuildPayPalExpressDeliveryCreateOrderInput,
): PayPalCreateOrderPayload {
  return {
    intent: "CAPTURE",
    purchase_units: [buildPayPalPurchaseUnitBase(input)],
    payment_source: {
      paypal: {
        experience_context: {
          shipping_preference: "GET_FROM_FILE",
          order_update_callback_config: buildShippingCallbackConfig(input),
        },
      },
    },
  };
}

function buildPayPalPurchaseUnitBase(input: {
  readonly orderNumber: string;
  readonly currencyCode: PayPalCurrencyCode;
  readonly items: readonly PayPalOrderLineItemInput[];
  readonly shippingAmountMinor: number;
  readonly taxAmountMinor: number;
  readonly discountAmountMinor: number;
}): PayPalPurchaseUnit {
  const items = input.items.map((item) =>
    buildPayPalLineItem(item, input.currencyCode),
  );
  const itemTotalMinor = calculateItemTotalMinor(input.items);
  const shippingMinor = assertMinorUnit(
    input.shippingAmountMinor,
    "shipping amount",
  );
  const taxMinor = assertMinorUnit(input.taxAmountMinor, "tax amount");
  const discountMinor = assertMinorUnit(
    input.discountAmountMinor,
    "discount amount",
  );
  const totalBeforeDiscount = addMinor([
    itemTotalMinor,
    shippingMinor,
    taxMinor,
  ]);
  const orderTotalMinor = subtractMinor(totalBeforeDiscount, discountMinor);
  const breakdown: PayPalAmountBreakdown = {
    item_total: toPayPalMoney(input.currencyCode, itemTotalMinor),
    shipping: toPayPalMoney(input.currencyCode, shippingMinor),
    tax_total: toPayPalMoney(input.currencyCode, taxMinor),
    ...(discountMinor > 0
      ? { discount: toPayPalMoney(input.currencyCode, discountMinor) }
      : {}),
  };

  return {
    invoice_id: input.orderNumber,
    items,
    amount: {
      currency_code: input.currencyCode,
      value: formatMinorUnit(orderTotalMinor),
      breakdown,
    },
  };
}

function buildShippingCallbackConfig(
  input: BuildPayPalExpressDeliveryCreateOrderInput,
): PayPalOrderUpdateCallbackConfig {
  assertHttpsUrl(input.shippingCallbackUrl);
  const callbackEvents = input.callbackEvents ?? ["SHIPPING_ADDRESS"];
  if (callbackEvents.length === 0) {
    throw new Error("at least one shipping callback event is required");
  }
  for (const callbackEvent of callbackEvents) {
    if (
      callbackEvent !== "SHIPPING_ADDRESS" &&
      callbackEvent !== "SHIPPING_OPTIONS"
    ) {
      throw new Error(`unsupported shipping callback event: ${callbackEvent}`);
    }
  }

  return {
    callback_events: [...new Set(callbackEvents)],
    callback_url: input.shippingCallbackUrl,
  };
}

function buildPayPalLineItem(
  item: PayPalOrderLineItemInput,
  currencyCode: PayPalCurrencyCode,
): PayPalOrderLineItem {
  const quantity = assertPositiveQuantity(item.quantity, "quantity");
  const unitAmountMinor = assertMinorUnit(item.unitAmountMinor, "unit amount");
  return {
    name: item.name,
    quantity: String(quantity),
    ...(item.sku ? { sku: item.sku } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.url ? { url: item.url } : {}),
    ...(item.imageUrl ? { image_url: item.imageUrl } : {}),
    category: "PHYSICAL_GOODS",
    unit_amount: toPayPalMoney(currencyCode, unitAmountMinor),
  };
}

function calculateItemTotalMinor(
  items: readonly PayPalOrderLineItemInput[],
): MinorUnit {
  if (items.length === 0) {
    throw new Error("at least one PayPal line item is required");
  }
  return addMinor(
    items.map((item) =>
      multiplyMinor(
        assertMinorUnit(item.unitAmountMinor, "unit amount"),
        assertPositiveQuantity(item.quantity, "quantity"),
      ),
    ),
  );
}

function buildPayPalShipping(
  address: PayPalDeliveryAddressInput,
): PayPalShipping {
  return {
    name: {
      full_name: address.fullName,
    },
    address: {
      address_line_1: address.addressLine1,
      ...(address.addressLine2 ? { address_line_2: address.addressLine2 } : {}),
      admin_area_2: address.adminArea2,
      ...(address.adminArea1 ? { admin_area_1: address.adminArea1 } : {}),
      postal_code: address.postalCode,
      country_code: address.countryCode,
    },
  };
}

function toPayPalMoney(
  currencyCode: PayPalCurrencyCode,
  amountMinor: number,
): PayPalMoney {
  return {
    currency_code: currencyCode,
    value: formatMinorUnit(assertMinorUnit(amountMinor)),
  };
}

function formatMinorUnit(amountMinor: number): string {
  const amount = assertMinorUnit(amountMinor);
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function assertPositiveQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function assertHttpsUrl(value: string): void {
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol === "https:") {
      return;
    }
  } catch {
    // Fall through to the shared validation error.
  }
  throw new Error("shipping callback URL must use https");
}

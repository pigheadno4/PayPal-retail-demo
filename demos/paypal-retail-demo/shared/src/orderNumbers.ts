export type FulfillmentMode = "delivery" | "pickup";
export type OrderNumberPrefix = "DO" | "PO";

export interface FormatOrderNumberInput {
  readonly fulfillmentMode: FulfillmentMode;
  readonly date: Date | string;
  readonly sequence: number;
}

const orderNumberPattern = /^(DO|PO)-[0-9]{8}-[0-9]{6}$/;

export function orderNumberPrefixForFulfillment(
  fulfillmentMode: FulfillmentMode,
): OrderNumberPrefix {
  return fulfillmentMode === "delivery" ? "DO" : "PO";
}

export function formatOrderNumber(input: FormatOrderNumberInput): string {
  const prefix = orderNumberPrefixForFulfillment(input.fulfillmentMode);
  return `${prefix}-${formatOrderDate(input.date)}-${formatSequence(
    input.sequence,
  )}`;
}

export function buildPayPalInvoiceId(
  orderNumber: string,
  attemptNumber: number,
): string {
  if (!orderNumberPattern.test(orderNumber)) {
    throw new Error("order number must match DO/PO order number format");
  }
  if (!Number.isSafeInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("attempt number must be a positive integer");
  }
  return attemptNumber === 1 ? orderNumber : `${orderNumber}-A${attemptNumber}`;
}

function formatOrderDate(date: Date | string): string {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : date;
  if (Number.isNaN(value.getTime())) {
    throw new Error("date must be a valid Date or YYYY-MM-DD string");
  }
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatSequence(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > 999_999) {
    throw new Error("sequence must be an integer between 1 and 999999");
  }
  return String(sequence).padStart(6, "0");
}

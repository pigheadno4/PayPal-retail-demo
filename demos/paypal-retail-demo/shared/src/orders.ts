import type { FulfillmentMode } from "./orderNumbers.js";
import { buildPayPalInvoiceId } from "./orderNumbers.js";
import type { MarketCode, MarketConfig } from "./market.js";
import { assertMinorUnit } from "./money.js";

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "preparing_pickup"
  | "ready_for_pickup"
  | "picked_up"
  | "cancelled";

export type ResumePaymentSessionStatus =
  | "created"
  | "approved"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired";

export type PendingOrderRevalidationAction =
  | "items"
  | "prices"
  | "inventory"
  | "shipping_or_pickup"
  | "pickup_date"
  | "tax"
  | "promos"
  | "total_snapshot";

export interface PendingOrderItemSnapshot {
  readonly productId: string;
  readonly productNameSnapshot: string;
  readonly quantity: number;
  readonly unitPriceMinorSnapshot: number;
  readonly currencyCode: MarketConfig["currencyCode"];
}

export interface PendingOrderSnapshot {
  readonly id: string;
  readonly orderNumber: string;
  readonly status: OrderStatus;
  readonly fulfillmentMode: FulfillmentMode;
  readonly profileId: string;
  readonly market: MarketConfig;
  readonly currencyCode: MarketConfig["currencyCode"];
  readonly locale: string;
  readonly buyerCountry: MarketCode;
  readonly payLaterBuyerCountry: MarketCode;
  readonly sandboxTestBuyerCountry: MarketCode;
  readonly itemSnapshots: readonly PendingOrderItemSnapshot[];
  readonly pickupDate?: string | null;
}

export interface ResumePaymentSessionSnapshot {
  readonly id: string;
  readonly attemptNumber: number;
  readonly status: ResumePaymentSessionStatus;
  readonly paypalInvoiceId: string;
  readonly expiresAt?: string | null;
}

export interface PendingOrderResumeActiveContext {
  readonly profileId: string;
  readonly market: MarketConfig;
}

export interface PlanPendingOrderResumeInput {
  readonly order: PendingOrderSnapshot;
  readonly paymentSessions: readonly ResumePaymentSessionSnapshot[];
  readonly activeContext?: PendingOrderResumeActiveContext | null;
  readonly now: Date | string;
}

export type PendingOrderPaymentSessionAction =
  | {
      readonly type: "reuse_existing";
      readonly paymentSessionId: string;
      readonly attemptNumber: number;
      readonly paypalInvoiceId: string;
    }
  | {
      readonly type: "create_fresh";
      readonly reason:
        | "missing_payment_session"
        | "expired_payment_session"
        | "invalid_payment_session";
      readonly attemptNumber: number;
      readonly paypalInvoiceId: string;
    };

export interface PendingOrderResumePlan {
  readonly orderId: string;
  readonly orderNumber: string;
  readonly lockedContext: {
    readonly profileId: string;
    readonly marketId: MarketCode;
    readonly currencyCode: MarketConfig["currencyCode"];
    readonly locale: string;
    readonly buyerCountry: MarketCode;
    readonly payLaterBuyerCountry: MarketCode;
    readonly sandboxTestBuyerCountry: MarketCode;
  };
  readonly cartSource: "order_snapshot";
  readonly itemPriceSource: "order_item_snapshot";
  readonly itemSnapshots: readonly PendingOrderItemSnapshot[];
  readonly activeContextIgnored: boolean;
  readonly revalidationActions: readonly PendingOrderRevalidationAction[];
  readonly pickupDateAction: "keep" | "rebook_required" | null;
  readonly paymentSessionAction: PendingOrderPaymentSessionAction;
}

const baseResumeRevalidationActions: readonly PendingOrderRevalidationAction[] =
  [
    "items",
    "prices",
    "inventory",
    "shipping_or_pickup",
    "tax",
    "promos",
    "total_snapshot",
  ];

export function planPendingOrderResume(
  input: PlanPendingOrderResumeInput,
): PendingOrderResumePlan {
  const now = toDate(input.now);
  validatePendingOrderSnapshot(input.order);

  const pickupDateAction = getPickupDateAction(input.order, now);
  const revalidationActions =
    pickupDateAction === "rebook_required"
      ? insertPickupDateRevalidation(baseResumeRevalidationActions)
      : baseResumeRevalidationActions;

  return {
    orderId: input.order.id,
    orderNumber: input.order.orderNumber,
    lockedContext: {
      profileId: input.order.profileId,
      marketId: input.order.market.code,
      currencyCode: input.order.currencyCode,
      locale: input.order.locale,
      buyerCountry: input.order.buyerCountry,
      payLaterBuyerCountry: input.order.payLaterBuyerCountry,
      sandboxTestBuyerCountry: input.order.sandboxTestBuyerCountry,
    },
    cartSource: "order_snapshot",
    itemPriceSource: "order_item_snapshot",
    itemSnapshots: input.order.itemSnapshots,
    activeContextIgnored: shouldIgnoreActiveContext(input),
    revalidationActions,
    pickupDateAction,
    paymentSessionAction: planPaymentSessionAction(
      input.order.orderNumber,
      input.paymentSessions,
      now,
    ),
  };
}

function validatePendingOrderSnapshot(order: PendingOrderSnapshot): void {
  if (order.status !== "pending") {
    throw new Error("only pending orders can be resumed");
  }
  if (order.currencyCode !== order.market.currencyCode) {
    throw new Error("order currency must match locked market currency");
  }
  if (order.locale !== order.market.locale) {
    throw new Error("order locale must match locked market locale");
  }
  if (
    order.buyerCountry !== order.market.buyerCountry ||
    order.payLaterBuyerCountry !== order.market.payLaterBuyerCountry ||
    order.sandboxTestBuyerCountry !== order.market.sandboxTestBuyerCountry
  ) {
    throw new Error("order buyer country settings must match locked market");
  }
  for (const item of order.itemSnapshots) {
    if (item.currencyCode !== order.currencyCode) {
      throw new Error("order item currency must match order currency");
    }
    assertPositiveQuantity(item.quantity, "order item quantity");
    assertMinorUnit(item.unitPriceMinorSnapshot, "order item price snapshot");
  }
}

function shouldIgnoreActiveContext(
  input: PlanPendingOrderResumeInput,
): boolean {
  const activeContext = input.activeContext;
  if (!activeContext) {
    return false;
  }
  return (
    activeContext.profileId !== input.order.profileId ||
    activeContext.market.code !== input.order.market.code
  );
}

function getPickupDateAction(
  order: PendingOrderSnapshot,
  now: Date,
): "keep" | "rebook_required" | null {
  if (order.fulfillmentMode !== "pickup") {
    return null;
  }
  if (!order.pickupDate) {
    return "rebook_required";
  }
  return compareDateOnly(order.pickupDate, now) < 0
    ? "rebook_required"
    : "keep";
}

function insertPickupDateRevalidation(
  actions: readonly PendingOrderRevalidationAction[],
): PendingOrderRevalidationAction[] {
  return actions.includes("pickup_date")
    ? [...actions]
    : [
        "items",
        "prices",
        "inventory",
        "shipping_or_pickup",
        "pickup_date",
        "tax",
        "promos",
        "total_snapshot",
      ];
}

function planPaymentSessionAction(
  orderNumber: string,
  paymentSessions: readonly ResumePaymentSessionSnapshot[],
  now: Date,
): PendingOrderPaymentSessionAction {
  const latestSession = latestPaymentSession(paymentSessions);
  if (!latestSession) {
    return freshPaymentSession(orderNumber, 1, "missing_payment_session");
  }
  validatePaymentSession(latestSession);
  if (isReusablePaymentSession(latestSession, now)) {
    return {
      type: "reuse_existing",
      paymentSessionId: latestSession.id,
      attemptNumber: latestSession.attemptNumber,
      paypalInvoiceId: latestSession.paypalInvoiceId,
    };
  }

  const reason =
    latestSession.status === "created" || latestSession.status === "approved"
      ? "expired_payment_session"
      : "invalid_payment_session";
  return freshPaymentSession(
    orderNumber,
    latestSession.attemptNumber + 1,
    reason,
  );
}

function freshPaymentSession(
  orderNumber: string,
  attemptNumber: number,
  reason:
    | "missing_payment_session"
    | "expired_payment_session"
    | "invalid_payment_session",
): PendingOrderPaymentSessionAction {
  return {
    type: "create_fresh",
    reason,
    attemptNumber,
    paypalInvoiceId: buildPayPalInvoiceId(orderNumber, attemptNumber),
  };
}

function latestPaymentSession(
  paymentSessions: readonly ResumePaymentSessionSnapshot[],
): ResumePaymentSessionSnapshot | undefined {
  return [...paymentSessions].sort(
    (left, right) => right.attemptNumber - left.attemptNumber,
  )[0];
}

function validatePaymentSession(session: ResumePaymentSessionSnapshot): void {
  if (
    !Number.isSafeInteger(session.attemptNumber) ||
    session.attemptNumber < 1
  ) {
    throw new Error("payment session attempt number must be positive");
  }
  if (session.expiresAt) {
    toDate(session.expiresAt);
  }
}

function isReusablePaymentSession(
  session: ResumePaymentSessionSnapshot,
  now: Date,
): boolean {
  const hasReusableStatus =
    session.status === "created" || session.status === "approved";
  if (!hasReusableStatus) {
    return false;
  }
  return session.expiresAt ? toDate(session.expiresAt) > now : true;
}

function compareDateOnly(left: Date | string, right: Date | string): number {
  return dateOnlyTimestamp(left) - dateOnlyTimestamp(right);
}

function dateOnlyTimestamp(value: Date | string): number {
  const date = toDate(
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00.000Z`
      : value,
  );
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toDate(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be valid");
  }
  return date;
}

function assertPositiveQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

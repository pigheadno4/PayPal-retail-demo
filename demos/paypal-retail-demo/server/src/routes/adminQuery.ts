import type { OrderStatus } from "../../../shared/src/orders.js";
import type {
  AdminOrderPaymentStatus,
  AdminOrderFulfillmentMode,
} from "../repositories/adminRepository.js";

export interface AdminCursorPage<T> {
  readonly items: readonly T[];
  readonly page_info: AdminPageInfo;
}

export interface AdminPageInfo {
  readonly total_count: number;
  readonly next_cursor: string | null;
  readonly timezone: string;
}

export interface AdminCursorValue {
  readonly kind: AdminCursorKind;
  readonly value: string;
  readonly id: string;
}

export type AdminCursorKind =
  | "orders-created"
  | "lifecycle-updated"
  | "inventory-updated"
  | "pickup-date"
  | "webhooks-received"
  | "payment-updated"
  | "runtime-timestamp";

interface AdminBaseQuery {
  readonly cursor?: string;
  readonly limit: number;
  readonly timezone: string;
}

export interface AdminOrdersQuery extends AdminBaseQuery {
  readonly orderNumber?: string;
  readonly status?: OrderStatus;
  readonly fulfillment?: AdminOrderFulfillmentMode;
  readonly paymentStatus?: AdminOrderPaymentStatus;
  readonly createdFrom?: string;
  readonly createdTo?: string;
}

export interface AdminLifecycleQuery extends AdminBaseQuery {
  readonly orderNumber?: string;
  readonly fulfillment?: AdminOrderFulfillmentMode;
  readonly status?: OrderStatus;
  readonly nextAction?: AdminLifecycleNextAction;
  readonly actionableOnly?: boolean;
  readonly updatedFrom?: string;
  readonly updatedTo?: string;
}

export interface AdminInventoryQuery extends AdminBaseQuery {
  readonly search?: string;
  readonly scope?: "central" | "store";
  readonly storeId?: string;
  readonly stockCondition?: "in_stock" | "low_stock" | "out_of_stock";
  readonly availability?: "available" | "unavailable";
  readonly changedFrom?: string;
  readonly changedTo?: string;
}

export interface AdminWebhooksQuery extends AdminBaseQuery {
  readonly eventId?: string;
  readonly eventType?: string;
  readonly verificationStatus?: "valid" | "invalid" | "error";
  readonly processingStatus?: "received" | "processed" | "ignored" | "failed";
  readonly linkedState?: "linked" | "unlinked";
  readonly receivedFrom?: string;
  readonly receivedTo?: string;
}

export interface AdminPaymentDiagnosticsQuery extends AdminBaseQuery {
  readonly lookup?: string;
  readonly method?: AdminPaymentMethod;
  readonly status?: AdminPaymentSessionStatus;
  readonly amountConsistency?: AdminAmountConsistencyStatus;
  readonly updatedFrom?: string;
  readonly updatedTo?: string;
}

export interface AdminRuntimeLogsQuery extends AdminBaseQuery {
  readonly lookup?: string;
  readonly level?: "info" | "warn" | "error";
  readonly category?: string;
  readonly event?: string;
  readonly loggedFrom?: string;
  readonly loggedTo?: string;
}

export type AdminLifecycleNextAction =
  | "processing"
  | "shipped"
  | "delivered"
  | "preparing_pickup"
  | "ready_for_pickup"
  | "picked_up";

export type AdminPaymentMethod =
  | "paypal"
  | "paylater"
  | "card"
  | "apple_pay"
  | "google_pay"
  | "venmo";

export type AdminPaymentSessionStatus =
  | "created"
  | "approved"
  | "captured"
  | "failed"
  | "cancelled"
  | "expired";

export type AdminAmountConsistencyStatus =
  | "not_checked"
  | "matched"
  | "mismatch"
  | "tolerance";

export interface AdminFilterError {
  readonly code: "INVALID_ADMIN_FILTERS";
  readonly message: "One or more Admin filters are invalid.";
  readonly details: {
    readonly invalid_fields: readonly string[];
  };
}

export type AdminQueryParseResult<TQuery> =
  | { readonly ok: true; readonly query: TQuery }
  | { readonly ok: false; readonly error: AdminFilterError };

export interface AdminQueryParserOptions {
  readonly now?: Date;
}

type AdminQuerySource = Readonly<Record<string, unknown>>;

interface ParsedCommonQuery {
  readonly cursor?: string;
  readonly limit: number;
  readonly timezone: string;
}

interface ParsedTimeRange {
  readonly from?: string;
  readonly to?: string;
}

const defaultLimit = 25;
const maximumLimit = 100;
const maximumInventoryCursorOffset = 1_000_000;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

const orderStatuses: readonly OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "preparing_pickup",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
];

const fulfillmentModes: readonly AdminOrderFulfillmentMode[] = [
  "delivery",
  "pickup",
];

const orderPaymentStatuses: readonly AdminOrderPaymentStatus[] = [
  "not_started",
  "started",
  "approved",
  "captured",
  "failed",
  "cancelled",
];

const lifecycleNextActions: readonly AdminLifecycleNextAction[] = [
  "processing",
  "shipped",
  "delivered",
  "preparing_pickup",
  "ready_for_pickup",
  "picked_up",
];

const paymentMethods: readonly AdminPaymentMethod[] = [
  "paypal",
  "paylater",
  "card",
  "apple_pay",
  "google_pay",
  "venmo",
];

const paymentSessionStatuses: readonly AdminPaymentSessionStatus[] = [
  "created",
  "approved",
  "captured",
  "failed",
  "cancelled",
  "expired",
];

const amountConsistencyStatuses: readonly AdminAmountConsistencyStatus[] = [
  "not_checked",
  "matched",
  "mismatch",
  "tolerance",
];

export function parseAdminOrdersQuery(
  source: AdminQuerySource,
): AdminQueryParseResult<AdminOrdersQuery> {
  const invalidFields: string[] = [];
  const orderNumber = parseOptionalText(source, "order_number");
  const status = parseAllowedValue(
    source,
    "status",
    orderStatuses,
    invalidFields,
  );
  const fulfillment = parseAllowedValue(
    source,
    "fulfillment",
    fulfillmentModes,
    invalidFields,
  );
  const paymentStatus = parseAllowedValue(
    source,
    "payment_status",
    orderPaymentStatuses,
    invalidFields,
  );
  const range = parseTimeRange(
    source,
    "created_from",
    "created_to",
    invalidFields,
  );
  const common = parseCommonQuery(source, invalidFields, "orders-created");

  return finishParse(invalidFields, {
    ...(orderNumber ? { orderNumber } : {}),
    ...(status ? { status } : {}),
    ...(fulfillment ? { fulfillment } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(range.from ? { createdFrom: range.from } : {}),
    ...(range.to ? { createdTo: range.to } : {}),
    ...common,
  });
}

export function parseAdminLifecycleQuery(
  source: AdminQuerySource,
): AdminQueryParseResult<AdminLifecycleQuery> {
  const invalidFields: string[] = [];
  const orderNumber = parseOptionalText(source, "order_number");
  const fulfillment = parseAllowedValue(
    source,
    "fulfillment",
    fulfillmentModes,
    invalidFields,
  );
  const status = parseAllowedValue(
    source,
    "status",
    orderStatuses,
    invalidFields,
  );
  const nextAction = parseAllowedValue(
    source,
    "next_action",
    lifecycleNextActions,
    invalidFields,
  );
  const actionableOnly = parseOptionalBoolean(
    source,
    "actionable",
    invalidFields,
  );
  const range = parseTimeRange(
    source,
    "updated_from",
    "updated_to",
    invalidFields,
  );
  const common = parseCommonQuery(source, invalidFields, "lifecycle-updated");

  return finishParse(invalidFields, {
    ...(orderNumber ? { orderNumber } : {}),
    ...(fulfillment ? { fulfillment } : {}),
    ...(status ? { status } : {}),
    ...(nextAction ? { nextAction } : {}),
    ...(typeof actionableOnly === "boolean" ? { actionableOnly } : {}),
    ...(range.from ? { updatedFrom: range.from } : {}),
    ...(range.to ? { updatedTo: range.to } : {}),
    ...common,
  });
}

export function parseAdminInventoryQuery(
  source: AdminQuerySource,
): AdminQueryParseResult<AdminInventoryQuery> {
  return parseAdminInventoryLikeQuery(source, "inventory-updated");
}

export function parseAdminPickupDatesQuery(
  source: AdminQuerySource,
): AdminQueryParseResult<AdminInventoryQuery> {
  return parseAdminInventoryLikeQuery(source, "pickup-date");
}

function parseAdminInventoryLikeQuery(
  source: AdminQuerySource,
  cursorKind: "inventory-updated" | "pickup-date",
): AdminQueryParseResult<AdminInventoryQuery> {
  const invalidFields: string[] = [];
  const search = parseOptionalText(source, "q");
  const scope = parseAllowedValue(
    source,
    "scope",
    ["central", "store"] as const,
    invalidFields,
  );
  const storeId = parseOptionalText(source, "store_id");
  const stockCondition = parseAllowedValue(
    source,
    "stock_condition",
    ["in_stock", "low_stock", "out_of_stock"] as const,
    invalidFields,
  );
  const availability = parseAllowedValue(
    source,
    "availability",
    ["available", "unavailable"] as const,
    invalidFields,
  );
  const range = parseTimeRange(
    source,
    "changed_from",
    "changed_to",
    invalidFields,
  );
  const common = parseCommonQuery(source, invalidFields, cursorKind);

  return finishParse(invalidFields, {
    ...(search ? { search } : {}),
    ...(scope ? { scope } : {}),
    ...(storeId ? { storeId } : {}),
    ...(stockCondition ? { stockCondition } : {}),
    ...(availability ? { availability } : {}),
    ...(range.from ? { changedFrom: range.from } : {}),
    ...(range.to ? { changedTo: range.to } : {}),
    ...common,
  });
}

export function parseAdminWebhooksQuery(
  source: AdminQuerySource,
  options: AdminQueryParserOptions = {},
): AdminQueryParseResult<AdminWebhooksQuery> {
  const invalidFields: string[] = [];
  const eventId = parseOptionalText(source, "event_id");
  const eventType = parseOptionalText(source, "event_type");
  const verificationStatus = parseAllowedValue(
    source,
    "verification_status",
    ["valid", "invalid", "error"] as const,
    invalidFields,
  );
  const processingStatus = parseAllowedValue(
    source,
    "processing_status",
    ["received", "processed", "ignored", "failed"] as const,
    invalidFields,
  );
  const linkedState = parseAllowedValue(
    source,
    "linked_state",
    ["linked", "unlinked"] as const,
    invalidFields,
  );
  const range = parseTimeRange(
    source,
    "received_from",
    "received_to",
    invalidFields,
    defaultLastDay(options.now),
  );
  const common = parseCommonQuery(source, invalidFields, "webhooks-received");

  return finishParse(invalidFields, {
    ...(eventId ? { eventId } : {}),
    ...(eventType ? { eventType } : {}),
    ...(verificationStatus ? { verificationStatus } : {}),
    ...(processingStatus ? { processingStatus } : {}),
    ...(linkedState ? { linkedState } : {}),
    ...(range.from ? { receivedFrom: range.from } : {}),
    ...(range.to ? { receivedTo: range.to } : {}),
    ...common,
  });
}

export function parseAdminPaymentDiagnosticsQuery(
  source: AdminQuerySource,
): AdminQueryParseResult<AdminPaymentDiagnosticsQuery> {
  const invalidFields: string[] = [];
  const lookup = parseOptionalText(source, "lookup");
  const method = parseAllowedValue(
    source,
    "method",
    paymentMethods,
    invalidFields,
  );
  const status = parseAllowedValue(
    source,
    "status",
    paymentSessionStatuses,
    invalidFields,
  );
  const amountConsistency = parseAllowedValue(
    source,
    "amount_consistency",
    amountConsistencyStatuses,
    invalidFields,
  );
  const range = parseTimeRange(
    source,
    "updated_from",
    "updated_to",
    invalidFields,
  );
  const common = parseCommonQuery(source, invalidFields, "payment-updated");

  return finishParse(invalidFields, {
    ...(lookup ? { lookup } : {}),
    ...(method ? { method } : {}),
    ...(status ? { status } : {}),
    ...(amountConsistency ? { amountConsistency } : {}),
    ...(range.from ? { updatedFrom: range.from } : {}),
    ...(range.to ? { updatedTo: range.to } : {}),
    ...common,
  });
}

export function parseAdminRuntimeLogsQuery(
  source: AdminQuerySource,
  options: AdminQueryParserOptions = {},
): AdminQueryParseResult<AdminRuntimeLogsQuery> {
  const invalidFields: string[] = [];
  const lookup = parseOptionalText(source, "lookup");
  const level = parseAllowedValue(
    source,
    "level",
    ["info", "warn", "error"] as const,
    invalidFields,
  );
  const category = parseOptionalText(source, "category");
  const event = parseOptionalText(source, "event");
  const range = parseTimeRange(
    source,
    "logged_from",
    "logged_to",
    invalidFields,
    defaultLastDay(options.now),
  );
  const common = parseCommonQuery(source, invalidFields, "runtime-timestamp");

  return finishParse(invalidFields, {
    ...(lookup ? { lookup } : {}),
    ...(level ? { level } : {}),
    ...(category ? { category } : {}),
    ...(event ? { event } : {}),
    ...(range.from ? { loggedFrom: range.from } : {}),
    ...(range.to ? { loggedTo: range.to } : {}),
    ...common,
  });
}

export function encodeAdminCursor(cursor: AdminCursorValue): string {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      kind: cursor.kind,
      value: cursor.value,
      id: cursor.id,
    }),
    "utf8",
  ).toString("base64url");
}

export function decodeAdminCursor(
  value: string,
  expectedKind?: AdminCursorKind,
): AdminCursorValue | null {
  if (
    value.length === 0 ||
    value.length > 1024 ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value) {
      return null;
    }
    const parsed = JSON.parse(decoded.toString("utf8")) as Record<
      string,
      unknown
    >;

    if (
      parsed.version !== 1 ||
      !isAdminCursorKind(parsed.kind) ||
      (expectedKind && parsed.kind !== expectedKind) ||
      typeof parsed.value !== "string" ||
      !isValidCursorSortValue(parsed.kind, parsed.value) ||
      typeof parsed.id !== "string" ||
      !/^[A-Za-z0-9._:-]+$/.test(parsed.id)
    ) {
      return null;
    }

    return {
      kind: parsed.kind,
      value: parsed.value,
      id: parsed.id,
    };
  } catch {
    return null;
  }
}

function isAdminCursorKind(value: unknown): value is AdminCursorKind {
  return (
    value === "orders-created" ||
    value === "lifecycle-updated" ||
    value === "inventory-updated" ||
    value === "pickup-date" ||
    value === "webhooks-received" ||
    value === "payment-updated" ||
    value === "runtime-timestamp"
  );
}

function isValidCursorSortValue(kind: AdminCursorKind, value: string): boolean {
  if (kind === "inventory-updated") {
    const match = value.match(/^offset:(\d+)$/);
    const offset = match ? Number(match[1]) : Number.NaN;
    return (
      Number.isSafeInteger(offset) && offset <= maximumInventoryCursorOffset
    );
  }

  if (kind !== "pickup-date") {
    return Boolean(parseIsoTimestamp(value));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const timestamp = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(timestamp.getTime()) &&
    timestamp.toISOString().startsWith(value)
  );
}

function parseCommonQuery(
  source: AdminQuerySource,
  invalidFields: string[],
  cursorKind: AdminCursorKind,
): ParsedCommonQuery {
  const timezoneValue = firstQueryString(source.timezone);
  const timezone = timezoneValue || "UTC";
  if (!isValidTimezone(timezone)) {
    invalidFields.push("timezone");
  }

  const cursor = firstQueryString(source.cursor);
  if (cursor && !decodeAdminCursor(cursor, cursorKind)) {
    invalidFields.push("cursor");
  }

  const rawLimit = firstQueryString(source.limit);
  let limit = defaultLimit;
  if (rawLimit !== null) {
    if (!/^-?\d+$/.test(rawLimit)) {
      invalidFields.push("limit");
    } else {
      limit = Math.min(maximumLimit, Math.max(1, Number(rawLimit)));
    }
  }

  return {
    ...(cursor ? { cursor } : {}),
    limit,
    timezone,
  };
}

function parseOptionalText(
  source: AdminQuerySource,
  field: string,
): string | undefined {
  return firstQueryString(source[field])?.trim() || undefined;
}

function parseAllowedValue<TValue extends string>(
  source: AdminQuerySource,
  field: string,
  allowed: readonly TValue[],
  invalidFields: string[],
): TValue | undefined {
  const value = firstQueryString(source[field]);
  if (value === null) {
    return undefined;
  }
  if (!allowed.includes(value as TValue)) {
    invalidFields.push(field);
    return undefined;
  }
  return value as TValue;
}

function parseOptionalBoolean(
  source: AdminQuerySource,
  field: string,
  invalidFields: string[],
): boolean | undefined {
  const value = firstQueryString(source[field]);
  if (value === null) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  invalidFields.push(field);
  return undefined;
}

function parseTimeRange(
  source: AdminQuerySource,
  fromField: string,
  toField: string,
  invalidFields: string[],
  fallback?: Required<ParsedTimeRange>,
): ParsedTimeRange {
  const rawFrom = firstQueryString(source[fromField]);
  const rawTo = firstQueryString(source[toField]);
  const from = rawFrom === null ? undefined : parseIsoTimestamp(rawFrom);
  const to = rawTo === null ? undefined : parseIsoTimestamp(rawTo);

  if (rawFrom !== null && !from) {
    invalidFields.push(fromField);
  }
  if (rawTo !== null && !to) {
    invalidFields.push(toField);
  }
  if (from && to && from > to) {
    invalidFields.push(fromField, toField);
  }

  if (rawFrom === null && rawTo === null && fallback) {
    return fallback;
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };
}

function parseIsoTimestamp(value: string): string | null {
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return null;
  }

  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? null : timestamp.toISOString();
}

function defaultLastDay(now = new Date()): Required<ParsedTimeRange> {
  return {
    from: new Date(now.getTime() - millisecondsPerDay).toISOString(),
    to: now.toISOString(),
  };
}

function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

function firstQueryString(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return (
      value.find((entry): entry is string => typeof entry === "string") ?? null
    );
  }
  return null;
}

function finishParse<TQuery>(
  invalidFields: string[],
  query: TQuery,
): AdminQueryParseResult<TQuery> {
  if (invalidFields.length > 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: {
          invalid_fields: [...new Set(invalidFields)],
        },
      },
    };
  }

  return { ok: true, query };
}

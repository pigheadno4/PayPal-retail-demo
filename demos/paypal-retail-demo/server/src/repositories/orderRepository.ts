import { createHash } from "node:crypto";

import type { OrderApiResponse, OrderRepository } from "../routes/orders.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface OrderRow {
  readonly id: string;
  readonly order_number: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "preparing_pickup"
    | "ready_for_pickup"
    | "picked_up"
    | "cancelled";
  readonly payment_status:
    | "not_started"
    | "started"
    | "approved"
    | "captured"
    | "failed"
    | "cancelled";
  readonly currency_code: string;
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
}

export interface GuestOrderAccessRow {
  readonly id: string;
  readonly order_id: string;
  readonly guest_email_hash: string;
  lookup_attempt_count: number;
  last_lookup_at: string | null;
}

export interface OrderItemRow {
  readonly id: string;
  readonly order_id: string;
  readonly product_sku_snapshot: string;
  readonly product_name_snapshot: string;
  readonly product_url_snapshot: string | null;
  readonly product_image_url_snapshot: string | null;
  readonly unit_price_minor: number;
  readonly quantity: number;
  readonly fulfillable_quantity: number;
  readonly unavailable_quantity: number;
  readonly line_subtotal_minor: number;
  readonly line_discount_minor: number;
  readonly line_tax_minor: number;
  readonly line_total_minor: number;
}

export interface OrderAddressRow {
  readonly id: string;
  readonly order_id: string;
  readonly address_type: "shipping" | "billing" | "pickup_store";
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
}

export interface OrderDataSource {
  readonly getOrderByNumber: (orderNumber: string) => Promise<OrderRow | null>;
  readonly getGuestOrderAccessByOrderId: (
    orderId: string,
  ) => Promise<GuestOrderAccessRow | null>;
  readonly updateGuestOrderAccess: (input: {
    readonly id: string;
    readonly lookupAttemptCount: number;
    readonly lastLookupAt: string;
  }) => Promise<void>;
  readonly listOrderItems: (
    orderId: string,
  ) => Promise<readonly OrderItemRow[]>;
  readonly listOrderAddresses: (
    orderId: string,
  ) => Promise<readonly OrderAddressRow[]>;
}

export interface CreateSupabaseOrderRepositoryInput {
  readonly dataSource: OrderDataSource;
  readonly now?: RepositoryNow;
  readonly hashGuestEmail?: (email: string) => string;
}

export function createSupabaseOrderRepository(
  input: CreateSupabaseOrderRepositoryInput,
): OrderRepository {
  const dependencies = {
    ...input,
    hashGuestEmail: input.hashGuestEmail ?? defaultGuestEmailHash,
  };

  return {
    async lookupGuestOrder(lookupInput) {
      const order = await dependencies.dataSource.getOrderByNumber(
        lookupInput.orderNumber,
      );
      if (!order) {
        return null;
      }

      const guestAccess =
        await dependencies.dataSource.getGuestOrderAccessByOrderId(order.id);
      if (!guestAccess) {
        return null;
      }

      await dependencies.dataSource.updateGuestOrderAccess({
        id: guestAccess.id,
        lookupAttemptCount: guestAccess.lookup_attempt_count + 1,
        lastLookupAt: resolveNow(dependencies.now),
      });

      if (
        guestAccess.guest_email_hash !==
        dependencies.hashGuestEmail(lookupInput.email)
      ) {
        return null;
      }

      const [items, addresses] = await Promise.all([
        dependencies.dataSource.listOrderItems(order.id),
        dependencies.dataSource.listOrderAddresses(order.id),
      ]);

      return mapGuestOrderResponse(order, items, addresses);
    },
  };
}

function mapGuestOrderResponse(
  order: OrderRow,
  items: readonly OrderItemRow[],
  addresses: readonly OrderAddressRow[],
): OrderApiResponse {
  return {
    order: {
      order_number: order.order_number,
      fulfillment_mode: order.fulfillment_mode,
      status: order.status,
      payment_status: order.payment_status,
      currency_code: order.currency_code,
      review_eligible: isReviewEligible(order),
      totals: {
        subtotal_minor: order.subtotal_minor,
        discount_minor: order.discount_minor,
        tax_minor: order.tax_minor,
        shipping_minor: order.shipping_minor,
        total_minor: order.total_minor,
      },
      items: items.map(mapOrderItemDto),
      addresses: addresses.map(mapOrderAddressDto),
    },
  };
}

function mapOrderItemDto(item: OrderItemRow) {
  return {
    product_sku: item.product_sku_snapshot,
    product_name: item.product_name_snapshot,
    product_url: item.product_url_snapshot,
    product_image_url: item.product_image_url_snapshot,
    unit_price_minor: item.unit_price_minor,
    quantity: item.quantity,
    fulfillable_quantity: item.fulfillable_quantity,
    unavailable_quantity: item.unavailable_quantity,
    line_subtotal_minor: item.line_subtotal_minor,
    line_discount_minor: item.line_discount_minor,
    line_tax_minor: item.line_tax_minor,
    line_total_minor: item.line_total_minor,
  };
}

function mapOrderAddressDto(address: OrderAddressRow) {
  return {
    address_type: address.address_type,
    recipient_name: address.recipient_name,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
  };
}

function isReviewEligible(order: OrderRow): boolean {
  return order.status === "delivered" || order.status === "picked_up";
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

function defaultGuestEmailHash(email: string): string {
  return `sha256:${createHash("sha256")
    .update(`paypal-retail-demo-v1:${email.trim().toLowerCase()}`)
    .digest("hex")}`;
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabaseOrderError {
  readonly message: string;
}

interface SupabaseOrderResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseOrderError | null;
}

interface SupabaseOrderQuery extends PromiseLike<SupabaseOrderResult<unknown>> {
  readonly select: (columns: string) => SupabaseOrderQuery;
  readonly eq: (column: string, value: SupabasePrimitive) => SupabaseOrderQuery;
  readonly update: (values: Record<string, unknown>) => SupabaseOrderQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseOrderResult<unknown>>;
  readonly single: () => PromiseLike<SupabaseOrderResult<unknown>>;
}

export interface SupabaseOrderClient {
  readonly from: (table: string) => SupabaseOrderQuery;
}

const orderColumns = [
  "id",
  "order_number",
  "fulfillment_mode",
  "status",
  "payment_status",
  "currency_code",
  "subtotal_minor",
  "discount_minor",
  "tax_minor",
  "shipping_minor",
  "total_minor",
].join(", ");

export function createSupabaseOrderDataSource(
  supabase: SupabaseOrderClient,
): OrderDataSource {
  return {
    async getOrderByNumber(orderNumber) {
      return queryOne<OrderRow>(
        supabase
          .from("orders")
          .select(orderColumns)
          .eq("order_number", orderNumber)
          .maybeSingle(),
        `Load order ${orderNumber}`,
      );
    },
    async getGuestOrderAccessByOrderId(orderId) {
      return queryOne<GuestOrderAccessRow>(
        supabase
          .from("guest_order_access")
          .select(
            "id, order_id, guest_email_hash, lookup_attempt_count, last_lookup_at",
          )
          .eq("order_id", orderId)
          .maybeSingle(),
        `Load guest order access ${orderId}`,
      );
    },
    async updateGuestOrderAccess(input) {
      await queryRequired<GuestOrderAccessRow>(
        supabase
          .from("guest_order_access")
          .update({
            lookup_attempt_count: input.lookupAttemptCount,
            last_lookup_at: input.lastLookupAt,
          })
          .eq("id", input.id)
          .select(
            "id, order_id, guest_email_hash, lookup_attempt_count, last_lookup_at",
          )
          .single(),
        `Update guest order access ${input.id}`,
      );
    },
    async listOrderItems(orderId) {
      return queryMany<OrderItemRow>(
        supabase
          .from("order_items")
          .select(
            [
              "id",
              "order_id",
              "product_sku_snapshot",
              "product_name_snapshot",
              "product_url_snapshot",
              "product_image_url_snapshot",
              "unit_price_minor",
              "quantity",
              "fulfillable_quantity",
              "unavailable_quantity",
              "line_subtotal_minor",
              "line_discount_minor",
              "line_tax_minor",
              "line_total_minor",
            ].join(", "),
          )
          .eq("order_id", orderId),
        `List order items ${orderId}`,
      );
    },
    async listOrderAddresses(orderId) {
      return queryMany<OrderAddressRow>(
        supabase
          .from("order_addresses")
          .select(
            [
              "id",
              "order_id",
              "address_type",
              "recipient_name",
              "phone",
              "address_line1",
              "address_line2",
              "city",
              "state",
              "postal_code",
              "country_code",
            ].join(", "),
          )
          .eq("order_id", orderId),
        `List order addresses ${orderId}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseOrderResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabaseOrderResult<unknown>>,
  description: string,
): Promise<TRow> {
  const row = await queryOne<TRow>(query, description);
  if (!row) {
    throw new Error(`${description}: expected row`);
  }
  return row;
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseOrderResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    return [];
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`${description}: expected list data`);
  }
  return result.data as TRow[];
}

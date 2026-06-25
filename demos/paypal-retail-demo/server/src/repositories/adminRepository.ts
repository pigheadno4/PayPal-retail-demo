import type {
  CatalogMarketRow,
  CatalogProfileRow,
  SupabaseCatalogClient,
} from "./catalogRepository.js";
import type { OrderStatus } from "../../../shared/src/orders.js";

interface SupabaseAdminError {
  readonly message: string;
}

interface SupabaseAdminResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseAdminError | null;
}

type SupabaseAdminPrimitive = string | number | boolean | null;

interface SupabaseAdminQuery extends PromiseLike<SupabaseAdminResult<unknown>> {
  readonly delete: () => SupabaseAdminQuery;
  readonly eq: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly in: (
    column: string,
    values: readonly SupabaseAdminPrimitive[],
  ) => SupabaseAdminQuery;
  readonly insert: (
    value: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabaseAdminQuery;
  readonly limit: (count: number) => SupabaseAdminQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseAdminResult<unknown>>;
  readonly order: (
    column: string,
    options?: { readonly ascending?: boolean },
  ) => SupabaseAdminQuery;
  readonly select: (columns: string) => SupabaseAdminQuery;
  readonly single: () => PromiseLike<SupabaseAdminResult<unknown>>;
  readonly update: (values: Record<string, unknown>) => SupabaseAdminQuery;
}

export interface SupabaseAdminClient {
  readonly from: (table: string) => SupabaseAdminQuery;
}

export type AdminOrderFulfillmentMode = "delivery" | "pickup";

export type AdminOrderPaymentStatus =
  | "not_started"
  | "started"
  | "approved"
  | "captured"
  | "failed"
  | "cancelled";

export interface AdminOrderRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly order_number: string;
  readonly fulfillment_mode: AdminOrderFulfillmentMode;
  readonly status: OrderStatus;
  readonly payment_status: AdminOrderPaymentStatus;
  readonly currency_code: string;
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminOrderItemRow {
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

export interface AdminOrderAddressRow {
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

export interface AdminOrderLifecycleEventRow {
  readonly id: string;
  readonly order_id: string;
  readonly from_status: OrderStatus | null;
  readonly to_status: OrderStatus;
  readonly actor_type: "system" | "admin" | "webhook";
  readonly note: string | null;
  readonly created_at: string;
}

export interface AdminPaymentSessionRow {
  readonly id: string;
  readonly order_id: string;
  readonly provider: "paypal";
  readonly method:
    | "paypal"
    | "paylater"
    | "card"
    | "apple_pay"
    | "google_pay"
    | "venmo";
  readonly status:
    | "created"
    | "approved"
    | "captured"
    | "failed"
    | "cancelled"
    | "expired";
  readonly attempt_number: number;
  readonly paypal_order_id: string | null;
  readonly paypal_capture_id: string | null;
  readonly paypal_invoice_id: string | null;
  readonly paypal_request_id: string | null;
  readonly vault_requested: boolean;
  readonly merchant_total_minor: number;
  readonly provider_total_minor: number | null;
  readonly amount_consistency_status:
    | "not_checked"
    | "matched"
    | "mismatch"
    | "tolerance";
  readonly currency_code: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminTotalSnapshotRow {
  readonly id: string;
  readonly order_id: string | null;
  readonly payment_session_id: string | null;
  readonly fulfillment_mode: AdminOrderFulfillmentMode;
  readonly calculation_stage: string;
  readonly currency_code: string;
  readonly merchandise_subtotal_minor: number;
  readonly product_discount_minor: number;
  readonly promo_discount_minor: number;
  readonly taxable_subtotal_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
  readonly promo_evaluation_id: string | null;
  readonly created_at: string;
}

export interface AdminPayPalOrderSnapshotRow {
  readonly id: string;
  readonly payment_session_id: string;
  readonly paypal_invoice_id: string | null;
  readonly paypal_request_id: string | null;
  readonly request_json: unknown;
  readonly response_json: unknown;
  readonly merchant_snapshot_json: unknown;
  readonly created_at: string;
}

export interface AdminPromoEvaluationRow {
  readonly id: string;
  readonly order_id: string | null;
  readonly merchandise_discount_minor: number;
  readonly taxable_subtotal_minor: number;
  readonly final_total_minor: number;
  readonly created_at: string;
}

export interface AdminPromoEvaluationLineRow {
  readonly id: string;
  readonly promo_evaluation_id: string;
  readonly code_snapshot: string;
  readonly evaluation_status:
    | "candidate"
    | "recommended"
    | "selected"
    | "applied"
    | "rejected";
  readonly rejection_reason: string | null;
  readonly stack_group: string | null;
  readonly discount_minor: number;
  readonly taxable_subtotal_effect_minor: number;
  readonly final_total_effect_minor: number;
  readonly explanation: string | null;
  readonly sort_order: number;
  readonly created_at: string;
}

export interface AdminWebhookEventRow {
  readonly id: string;
  readonly event_id: string;
  readonly event_type: string;
  readonly verification_status: "valid" | "invalid" | "error";
  readonly linked_order_id: string | null;
  readonly linked_payment_session_id: string | null;
  readonly processing_status: "received" | "processed" | "ignored" | "failed";
  readonly received_at: string;
  readonly processed_at: string | null;
}

export interface AdminCentralInventoryRow {
  readonly profile_id: string;
  readonly market_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
  readonly updated_at: string;
}

export interface AdminStoreInventoryRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly store_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
  readonly updated_at: string;
}

export interface AdminPickupDateRow {
  readonly id: string;
  readonly market_id: string;
  readonly store_id: string;
  readonly pickup_date: string;
  readonly capacity: number;
  readonly is_available: boolean;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface AdminInventoryProductRow {
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly slug: string;
}

export interface AdminInventoryStoreRow {
  readonly id: string;
  readonly market_id: string;
  readonly slug: string;
  readonly name: string;
}

export interface AdminInventorySnapshot {
  readonly centralInventory: readonly AdminCentralInventoryRow[];
  readonly storeInventory: readonly AdminStoreInventoryRow[];
  readonly products: readonly AdminInventoryProductRow[];
  readonly stores: readonly AdminInventoryStoreRow[];
}

export interface AdminPickupDateSnapshot {
  readonly pickupDates: readonly AdminPickupDateRow[];
  readonly stores: readonly AdminInventoryStoreRow[];
}

export interface AdminOrderDetail {
  readonly order: AdminOrderRow;
  readonly items: readonly AdminOrderItemRow[];
  readonly addresses: readonly AdminOrderAddressRow[];
  readonly timeline: readonly AdminOrderLifecycleEventRow[];
  readonly paymentSessions: readonly AdminPaymentSessionRow[];
  readonly totalSnapshots: readonly AdminTotalSnapshotRow[];
  readonly paypalSnapshots: readonly AdminPayPalOrderSnapshotRow[];
  readonly promoEvaluations: readonly AdminPromoEvaluationRow[];
  readonly promoEvaluationLines: readonly AdminPromoEvaluationLineRow[];
  readonly linkedWebhooks: readonly AdminWebhookEventRow[];
}

export interface AdminPaymentDebugEntry {
  readonly session: AdminPaymentSessionRow;
  readonly order: AdminOrderRow | null;
  readonly totalSnapshots: readonly AdminTotalSnapshotRow[];
  readonly paypalSnapshots: readonly AdminPayPalOrderSnapshotRow[];
  readonly linkedWebhooks: readonly AdminWebhookEventRow[];
}

export interface AdminProfileMarketRepository {
  readonly getProfileById: (id: string) => Promise<CatalogProfileRow | null>;
  readonly getMarketById: (
    id: string,
  ) => Promise<Pick<CatalogMarketRow, "id" | "code"> | null>;
}

export interface AdminOrderRepository {
  readonly listOrders: () => Promise<readonly AdminOrderRow[]>;
  readonly getOrder: (orderId: string) => Promise<AdminOrderDetail | null>;
  readonly updateOrderStatus: (input: {
    readonly orderId: string;
    readonly status: OrderStatus;
    readonly updatedAt: string;
  }) => Promise<AdminOrderRow | null>;
  readonly createLifecycleEvent: (input: {
    readonly orderId: string;
    readonly fromStatus: OrderStatus;
    readonly toStatus: OrderStatus;
    readonly actorType: "admin";
    readonly note: string | null;
    readonly createdAt: string;
  }) => Promise<AdminOrderLifecycleEventRow>;
}

export interface AdminInventoryRepository {
  readonly listInventory: () => Promise<AdminInventorySnapshot>;
  readonly updateCentralInventory: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productId: string;
    readonly availableQuantity: number;
    readonly updatedAt: string;
  }) => Promise<AdminCentralInventoryRow | null>;
  readonly updateStoreInventory: (input: {
    readonly inventoryId: string;
    readonly availableQuantity: number;
    readonly updatedAt: string;
  }) => Promise<AdminStoreInventoryRow | null>;
  readonly listPickupDates: () => Promise<AdminPickupDateSnapshot>;
  readonly updatePickupDate: (input: {
    readonly pickupDateId: string;
    readonly capacity?: number;
    readonly isAvailable?: boolean;
    readonly updatedAt: string;
  }) => Promise<AdminPickupDateRow | null>;
}

export interface AdminWebhookRepository {
  readonly listWebhooks: () => Promise<readonly AdminWebhookEventRow[]>;
}

export interface AdminPaymentDebugRepository {
  readonly listPaymentDebug: () => Promise<readonly AdminPaymentDebugEntry[]>;
}

export function createSupabaseAdminProfileMarketRepository(
  supabase: SupabaseCatalogClient,
): AdminProfileMarketRepository {
  return {
    async getProfileById(id) {
      return queryOne<CatalogProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug, display_name, brand_mode")
          .eq("id", id)
          .maybeSingle(),
        `Load admin profile ${id}`,
      );
    },
    async getMarketById(id) {
      return queryOne<Pick<CatalogMarketRow, "id" | "code">>(
        supabase.from("markets").select("id, code").eq("id", id).maybeSingle(),
        `Load admin market ${id}`,
      );
    },
  };
}

export function createSupabaseAdminOrderRepository(
  supabase: SupabaseAdminClient,
): AdminOrderRepository {
  return {
    async listOrders() {
      return queryMany<AdminOrderRow>(
        supabase
          .from("orders")
          .select(adminOrderColumns)
          .order("created_at", { ascending: false })
          .limit(50),
        "List admin orders",
      );
    },
    async getOrder(orderId) {
      const order = await queryOne<AdminOrderRow>(
        supabase
          .from("orders")
          .select(adminOrderColumns)
          .eq("id", orderId)
          .maybeSingle(),
        `Load admin order ${orderId}`,
      );

      if (!order) {
        return null;
      }

      const [items, addresses, timeline, paymentSessions, totalSnapshots] =
        await Promise.all([
          queryMany<AdminOrderItemRow>(
            supabase
              .from("order_items")
              .select(adminOrderItemColumns)
              .eq("order_id", orderId),
            `List admin order items ${orderId}`,
          ),
          queryMany<AdminOrderAddressRow>(
            supabase
              .from("order_addresses")
              .select(adminOrderAddressColumns)
              .eq("order_id", orderId),
            `List admin order addresses ${orderId}`,
          ),
          queryMany<AdminOrderLifecycleEventRow>(
            supabase
              .from("order_lifecycle_events")
              .select(adminOrderLifecycleEventColumns)
              .eq("order_id", orderId)
              .order("created_at", { ascending: true }),
            `List admin order lifecycle events ${orderId}`,
          ),
          queryMany<AdminPaymentSessionRow>(
            supabase
              .from("payment_sessions")
              .select(adminPaymentSessionColumns)
              .eq("order_id", orderId)
              .order("attempt_number", { ascending: false }),
            `List admin payment sessions ${orderId}`,
          ),
          queryMany<AdminTotalSnapshotRow>(
            supabase
              .from("total_snapshots")
              .select(adminTotalSnapshotColumns)
              .eq("order_id", orderId)
              .order("created_at", { ascending: false }),
            `List admin total snapshots ${orderId}`,
          ),
        ]);
      const paymentSessionIds = paymentSessions.map((session) => session.id);
      const promoEvaluationIds = totalSnapshots.flatMap((snapshot) =>
        snapshot.promo_evaluation_id ? [snapshot.promo_evaluation_id] : [],
      );
      const [paypalSnapshots, promoEvaluations, promoEvaluationLines] =
        await Promise.all([
          paymentSessionIds.length > 0
            ? queryMany<AdminPayPalOrderSnapshotRow>(
                supabase
                  .from("paypal_order_snapshots")
                  .select(adminPayPalOrderSnapshotColumns)
                  .in("payment_session_id", paymentSessionIds)
                  .order("created_at", { ascending: false }),
                `List admin PayPal snapshots ${orderId}`,
              )
            : [],
          queryMany<AdminPromoEvaluationRow>(
            supabase
              .from("promo_evaluations")
              .select(adminPromoEvaluationColumns)
              .eq("order_id", orderId)
              .order("created_at", { ascending: false }),
            `List admin promo evaluations ${orderId}`,
          ),
          promoEvaluationIds.length > 0
            ? queryMany<AdminPromoEvaluationLineRow>(
                supabase
                  .from("promo_evaluation_lines")
                  .select(adminPromoEvaluationLineColumns)
                  .in("promo_evaluation_id", promoEvaluationIds)
                  .order("sort_order", { ascending: true }),
                `List admin promo evaluation lines ${orderId}`,
              )
            : [],
        ]);
      const linkedWebhooks = mergeWebhookEvents(
        await Promise.all([
          queryMany<AdminWebhookEventRow>(
            supabase
              .from("webhook_events")
              .select(adminWebhookEventColumns)
              .eq("linked_order_id", orderId)
              .order("received_at", { ascending: false }),
            `List admin order webhooks ${orderId}`,
          ),
          paymentSessionIds.length > 0
            ? queryMany<AdminWebhookEventRow>(
                supabase
                  .from("webhook_events")
                  .select(adminWebhookEventColumns)
                  .in("linked_payment_session_id", paymentSessionIds)
                  .order("received_at", { ascending: false }),
                `List admin payment webhooks ${orderId}`,
              )
            : [],
        ]),
      );

      return {
        order,
        items,
        addresses,
        timeline,
        paymentSessions,
        totalSnapshots,
        paypalSnapshots,
        promoEvaluations,
        promoEvaluationLines,
        linkedWebhooks,
      };
    },
    async updateOrderStatus(input) {
      return queryOne<AdminOrderRow>(
        supabase
          .from("orders")
          .update({
            status: input.status,
            updated_at: input.updatedAt,
          })
          .eq("id", input.orderId)
          .select(adminOrderColumns)
          .maybeSingle(),
        `Update admin order ${input.orderId}`,
      );
    },
    async createLifecycleEvent(input) {
      return queryRequired<AdminOrderLifecycleEventRow>(
        supabase
          .from("order_lifecycle_events")
          .insert({
            order_id: input.orderId,
            from_status: input.fromStatus,
            to_status: input.toStatus,
            actor_type: input.actorType,
            note: input.note,
            created_at: input.createdAt,
          })
          .select(adminOrderLifecycleEventColumns)
          .single(),
        `Create admin lifecycle event ${input.orderId}`,
      );
    },
  };
}

export function createSupabaseAdminInventoryRepository(
  supabase: SupabaseAdminClient,
): AdminInventoryRepository {
  return {
    async listInventory() {
      const [centralInventory, storeInventory] = await Promise.all([
        queryMany<AdminCentralInventoryRow>(
          supabase
            .from("central_inventory")
            .select(adminCentralInventoryColumns)
            .order("updated_at", { ascending: false })
            .limit(75),
          "List admin central inventory",
        ),
        queryMany<AdminStoreInventoryRow>(
          supabase
            .from("store_inventory")
            .select(adminStoreInventoryColumns)
            .order("updated_at", { ascending: false })
            .limit(75),
          "List admin store inventory",
        ),
      ]);
      const products = await listInventoryProducts(supabase, [
        ...centralInventory.map((row) => row.product_id),
        ...storeInventory.map((row) => row.product_id),
      ]);
      const stores = await listInventoryStores(
        supabase,
        storeInventory.map((row) => row.store_id),
      );

      return {
        centralInventory,
        storeInventory,
        products,
        stores,
      };
    },
    async updateCentralInventory(input) {
      return queryOne<AdminCentralInventoryRow>(
        supabase
          .from("central_inventory")
          .update({
            available_quantity: input.availableQuantity,
            updated_at: input.updatedAt,
          })
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId)
          .eq("product_id", input.productId)
          .select(adminCentralInventoryColumns)
          .maybeSingle(),
        `Update admin central inventory ${input.productId}`,
      );
    },
    async updateStoreInventory(input) {
      return queryOne<AdminStoreInventoryRow>(
        supabase
          .from("store_inventory")
          .update({
            available_quantity: input.availableQuantity,
            updated_at: input.updatedAt,
          })
          .eq("id", input.inventoryId)
          .select(adminStoreInventoryColumns)
          .maybeSingle(),
        `Update admin store inventory ${input.inventoryId}`,
      );
    },
    async listPickupDates() {
      const pickupDates = await queryMany<AdminPickupDateRow>(
        supabase
          .from("store_pickup_dates")
          .select(adminPickupDateColumns)
          .order("pickup_date", { ascending: true })
          .limit(75),
        "List admin pickup dates",
      );
      const stores = await listInventoryStores(
        supabase,
        pickupDates.map((row) => row.store_id),
      );

      return {
        pickupDates,
        stores,
      };
    },
    async updatePickupDate(input) {
      return queryOne<AdminPickupDateRow>(
        supabase
          .from("store_pickup_dates")
          .update({
            ...(typeof input.capacity === "number"
              ? { capacity: input.capacity }
              : {}),
            ...(typeof input.isAvailable === "boolean"
              ? { is_available: input.isAvailable }
              : {}),
            updated_at: input.updatedAt,
          })
          .eq("id", input.pickupDateId)
          .select(adminPickupDateColumns)
          .maybeSingle(),
        `Update admin pickup date ${input.pickupDateId}`,
      );
    },
  };
}

export function createSupabaseAdminWebhookRepository(
  supabase: SupabaseAdminClient,
): AdminWebhookRepository {
  return {
    async listWebhooks() {
      return queryMany<AdminWebhookEventRow>(
        supabase
          .from("webhook_events")
          .select(adminWebhookEventColumns)
          .order("received_at", { ascending: false })
          .limit(75),
        "List admin webhooks",
      );
    },
  };
}

export function createSupabaseAdminPaymentDebugRepository(
  supabase: SupabaseAdminClient,
): AdminPaymentDebugRepository {
  return {
    async listPaymentDebug() {
      const sessions = await queryMany<AdminPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(adminPaymentSessionColumns)
          .order("updated_at", { ascending: false })
          .limit(75),
        "List admin payment debug sessions",
      );

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = uniqueStrings(sessions.map((session) => session.id));
      const orderIds = uniqueStrings(
        sessions.map((session) => session.order_id),
      );
      const [orders, totalSnapshots, paypalSnapshots, linkedWebhooks] =
        await Promise.all([
          queryMany<AdminOrderRow>(
            supabase
              .from("orders")
              .select(adminOrderColumns)
              .in("id", orderIds),
            "List admin payment debug orders",
          ),
          queryMany<AdminTotalSnapshotRow>(
            supabase
              .from("total_snapshots")
              .select(adminTotalSnapshotColumns)
              .in("payment_session_id", sessionIds)
              .order("created_at", { ascending: false }),
            "List admin payment debug total snapshots",
          ),
          queryMany<AdminPayPalOrderSnapshotRow>(
            supabase
              .from("paypal_order_snapshots")
              .select(adminPayPalOrderSnapshotColumns)
              .in("payment_session_id", sessionIds)
              .order("created_at", { ascending: false }),
            "List admin payment debug PayPal snapshots",
          ),
          queryMany<AdminWebhookEventRow>(
            supabase
              .from("webhook_events")
              .select(adminWebhookEventColumns)
              .in("linked_payment_session_id", sessionIds)
              .order("received_at", { ascending: false }),
            "List admin payment debug webhooks",
          ),
        ]);
      const ordersById = mapRowsById(orders);
      const totalSnapshotsBySessionId = groupRowsByString(
        totalSnapshots,
        (snapshot) => snapshot.payment_session_id,
      );
      const paypalSnapshotsBySessionId = groupRowsByString(
        paypalSnapshots,
        (snapshot) => snapshot.payment_session_id,
      );
      const webhooksBySessionId = groupRowsByString(
        linkedWebhooks,
        (webhook) => webhook.linked_payment_session_id,
      );

      return sessions.map((session) => ({
        session,
        order: ordersById.get(session.order_id) ?? null,
        totalSnapshots: totalSnapshotsBySessionId.get(session.id) ?? [],
        paypalSnapshots: paypalSnapshotsBySessionId.get(session.id) ?? [],
        linkedWebhooks: webhooksBySessionId.get(session.id) ?? [],
      }));
    },
  };
}

const adminOrderColumns = [
  "id",
  "profile_id",
  "market_id",
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
  "created_at",
  "updated_at",
].join(", ");

const adminOrderItemColumns = [
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
].join(", ");

const adminOrderAddressColumns = [
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
].join(", ");

const adminOrderLifecycleEventColumns = [
  "id",
  "order_id",
  "from_status",
  "to_status",
  "actor_type",
  "note",
  "created_at",
].join(", ");

const adminPaymentSessionColumns = [
  "id",
  "order_id",
  "provider",
  "method",
  "status",
  "attempt_number",
  "paypal_order_id",
  "paypal_capture_id",
  "paypal_invoice_id",
  "paypal_request_id",
  "vault_requested",
  "merchant_total_minor",
  "provider_total_minor",
  "amount_consistency_status",
  "currency_code",
  "created_at",
  "updated_at",
].join(", ");

const adminTotalSnapshotColumns = [
  "id",
  "order_id",
  "payment_session_id",
  "fulfillment_mode",
  "calculation_stage",
  "currency_code",
  "merchandise_subtotal_minor",
  "product_discount_minor",
  "promo_discount_minor",
  "taxable_subtotal_minor",
  "tax_minor",
  "shipping_minor",
  "total_minor",
  "promo_evaluation_id",
  "created_at",
].join(", ");

const adminPayPalOrderSnapshotColumns = [
  "id",
  "payment_session_id",
  "paypal_invoice_id",
  "paypal_request_id",
  "request_json",
  "response_json",
  "merchant_snapshot_json",
  "created_at",
].join(", ");

const adminPromoEvaluationColumns = [
  "id",
  "order_id",
  "merchandise_discount_minor",
  "taxable_subtotal_minor",
  "final_total_minor",
  "created_at",
].join(", ");

const adminPromoEvaluationLineColumns = [
  "id",
  "promo_evaluation_id",
  "code_snapshot",
  "evaluation_status",
  "rejection_reason",
  "stack_group",
  "discount_minor",
  "taxable_subtotal_effect_minor",
  "final_total_effect_minor",
  "explanation",
  "sort_order",
  "created_at",
].join(", ");

const adminWebhookEventColumns = [
  "id",
  "event_id",
  "event_type",
  "verification_status",
  "linked_order_id",
  "linked_payment_session_id",
  "processing_status",
  "received_at",
  "processed_at",
].join(", ");

const adminCentralInventoryColumns = [
  "profile_id",
  "market_id",
  "product_id",
  "available_quantity",
  "updated_at",
].join(", ");

const adminStoreInventoryColumns = [
  "id",
  "profile_id",
  "market_id",
  "store_id",
  "product_id",
  "available_quantity",
  "updated_at",
].join(", ");

const adminPickupDateColumns = [
  "id",
  "market_id",
  "store_id",
  "pickup_date",
  "capacity",
  "is_available",
  "created_at",
  "updated_at",
].join(", ");

const adminInventoryProductColumns = ["id", "sku", "name", "slug"].join(", ");

const adminInventoryStoreColumns = ["id", "market_id", "slug", "name"].join(
  ", ",
);

function mergeWebhookEvents(
  webhookGroups: readonly (readonly AdminWebhookEventRow[])[],
): readonly AdminWebhookEventRow[] {
  const seen = new Set<string>();
  const merged: AdminWebhookEventRow[] = [];

  for (const webhook of webhookGroups.flat()) {
    if (seen.has(webhook.id)) {
      continue;
    }

    seen.add(webhook.id);
    merged.push(webhook);
  }

  return merged.sort(
    (left, right) =>
      new Date(right.received_at).getTime() -
      new Date(left.received_at).getTime(),
  );
}

async function listInventoryProducts(
  supabase: SupabaseAdminClient,
  productIds: readonly string[],
): Promise<readonly AdminInventoryProductRow[]> {
  const ids = uniqueStrings(productIds);

  if (ids.length === 0) {
    return [];
  }

  return queryMany<AdminInventoryProductRow>(
    supabase
      .from("products")
      .select(adminInventoryProductColumns)
      .in("id", ids),
    "List admin inventory products",
  );
}

async function listInventoryStores(
  supabase: SupabaseAdminClient,
  storeIds: readonly string[],
): Promise<readonly AdminInventoryStoreRow[]> {
  const ids = uniqueStrings(storeIds);

  if (ids.length === 0) {
    return [];
  }

  return queryMany<AdminInventoryStoreRow>(
    supabase.from("stores").select(adminInventoryStoreColumns).in("id", ids),
    "List admin inventory stores",
  );
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function mapRowsById<TRow extends { readonly id: string }>(
  rows: readonly TRow[],
): ReadonlyMap<string, TRow> {
  return new Map(rows.map((row) => [row.id, row]));
}

function groupRowsByString<TRow>(
  rows: readonly TRow[],
  getKey: (row: TRow) => string | null,
): ReadonlyMap<string, readonly TRow[]> {
  const groupedRows = new Map<string, TRow[]>();

  for (const row of rows) {
    const key = getKey(row);

    if (!key) {
      continue;
    }

    const existingRows = groupedRows.get(key) ?? [];
    existingRows.push(row);
    groupedRows.set(key, existingRows);
  }

  return groupedRows;
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<TRow> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    throw new Error(`${description}: no row returned`);
  }
  return result.data as TRow;
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return Array.isArray(result.data) ? (result.data as readonly TRow[]) : [];
}

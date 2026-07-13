import type {
  CatalogMarketRow,
  CatalogProfileRow,
  SupabaseCatalogClient,
} from "./catalogRepository.js";
import type { OrderStatus } from "../../../shared/src/orders.js";
import {
  allowlistRuntimeDebugLogEntry,
  type DebugLogEntry,
  sanitizeDebugLogContext,
  type RuntimeDebugLogEntry,
  type RuntimeDebugLogRepository,
  type RuntimeDebugLogPersistenceRepository,
} from "../debug/logger.js";
import {
  decodeAdminCursor,
  encodeAdminCursor,
  type AdminCursorKind,
  type AdminCursorPage,
  type AdminInventoryQuery,
  type AdminLifecycleNextAction,
  type AdminLifecycleQuery,
  type AdminOrdersQuery,
  type AdminPaymentDiagnosticsQuery,
  type AdminRuntimeLogsQuery,
  type AdminWebhooksQuery,
} from "../routes/adminQuery.js";

interface SupabaseAdminError {
  readonly message: string;
}

interface SupabaseAdminResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseAdminError | null;
  readonly count?: number | null;
}

type SupabaseAdminPrimitive = string | number | boolean | null;

interface SupabaseAdminQuery extends PromiseLike<SupabaseAdminResult<unknown>> {
  readonly delete: () => SupabaseAdminQuery;
  readonly eq: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly gte: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly gt: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly ilike: (column: string, pattern: string) => SupabaseAdminQuery;
  readonly in: (
    column: string,
    values: readonly SupabaseAdminPrimitive[],
  ) => SupabaseAdminQuery;
  readonly insert: (
    value: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabaseAdminQuery;
  readonly limit: (count: number) => SupabaseAdminQuery;
  readonly lt: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly lte: (
    column: string,
    value: SupabaseAdminPrimitive,
  ) => SupabaseAdminQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseAdminResult<unknown>>;
  readonly order: (
    column: string,
    options?: { readonly ascending?: boolean },
  ) => SupabaseAdminQuery;
  readonly or: (filters: string) => SupabaseAdminQuery;
  readonly range: (from: number, to: number) => SupabaseAdminQuery;
  readonly select: (
    columns: string,
    options?: {
      readonly count?: "exact";
      readonly head?: boolean;
    },
  ) => SupabaseAdminQuery;
  readonly single: () => PromiseLike<SupabaseAdminResult<unknown>>;
  readonly update: (values: Record<string, unknown>) => SupabaseAdminQuery;
}

export interface SupabaseAdminClient {
  readonly from: (table: string) => SupabaseAdminQuery;
  readonly rpc: (
    functionName: string,
    args: Readonly<Record<string, unknown>>,
  ) => SupabaseAdminQuery;
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
  readonly id: string;
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

export type AdminInventoryRecord =
  | {
      readonly type: "central";
      readonly row: AdminCentralInventoryRow;
    }
  | {
      readonly type: "store";
      readonly row: AdminStoreInventoryRow;
    };

export interface AdminInventoryPage extends AdminCursorPage<AdminInventoryRecord> {
  readonly products: readonly AdminInventoryProductRow[];
  readonly stores: readonly AdminInventoryStoreRow[];
}

export interface AdminPickupDateSnapshot {
  readonly pickupDates: readonly AdminPickupDateRow[];
  readonly stores: readonly AdminInventoryStoreRow[];
}

export interface AdminPickupDatePage extends AdminCursorPage<AdminPickupDateRow> {
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

export type AdminLifecycleTransitionResult =
  | { readonly status: "updated"; readonly order: AdminOrderRow }
  | { readonly status: "stale"; readonly currentStatus: OrderStatus }
  | { readonly status: "not_found" };

interface AdminLifecycleTransitionRpcRow {
  readonly transition_status: "updated" | "stale" | "not_found";
  readonly current_status: OrderStatus | null;
  readonly order_data: AdminOrderRow | null;
}

export interface AdminProfileMarketRepository {
  readonly getProfileById: (id: string) => Promise<CatalogProfileRow | null>;
  readonly getMarketById: (
    id: string,
  ) => Promise<Pick<CatalogMarketRow, "id" | "code"> | null>;
}

export interface AdminOrderRepository {
  readonly listOrders: (
    query?: AdminOrdersQuery,
  ) => Promise<AdminCursorPage<AdminOrderRow>>;
  readonly listLifecycle: (
    query?: AdminLifecycleQuery,
  ) => Promise<AdminCursorPage<AdminOrderRow>>;
  readonly getOrder: (orderId: string) => Promise<AdminOrderDetail | null>;
  readonly transitionOrderLifecycle: (input: {
    readonly orderId: string;
    readonly expectedStatus: OrderStatus;
    readonly nextStatus: OrderStatus;
    readonly note: string | null;
    readonly occurredAt: string;
  }) => Promise<AdminLifecycleTransitionResult>;
}

export interface AdminInventoryRepository {
  readonly listInventory: (
    query?: AdminInventoryQuery,
  ) => Promise<AdminInventoryPage>;
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
  readonly listPickupDates: (
    query?: AdminInventoryQuery,
  ) => Promise<AdminPickupDatePage>;
  readonly updatePickupDate: (input: {
    readonly pickupDateId: string;
    readonly capacity?: number;
    readonly isAvailable?: boolean;
    readonly updatedAt: string;
  }) => Promise<AdminPickupDateRow | null>;
}

export interface AdminWebhookRepository {
  readonly listWebhooks: (
    query?: AdminWebhooksQuery,
  ) => Promise<AdminCursorPage<AdminWebhookEventRow>>;
}

export interface AdminPaymentDebugRepository {
  readonly listPaymentDebug: (
    query?: AdminPaymentDiagnosticsQuery,
  ) => Promise<AdminCursorPage<AdminPaymentDebugEntry>>;
}

export type AdminRuntimeDebugLogEntry = RuntimeDebugLogEntry;

export interface AdminRuntimeDebugLogRepository {
  readonly listRuntimeDebugLogs: (
    query?: AdminRuntimeLogsQuery,
  ) => Promise<AdminCursorPage<AdminRuntimeDebugLogEntry>>;
}

export interface SupabaseAdminRuntimeDebugLogRepository
  extends
    AdminRuntimeDebugLogRepository,
    RuntimeDebugLogPersistenceRepository {}

export function createAdminRuntimeDebugLogRepositoryWithFallback(input: {
  readonly primary: AdminRuntimeDebugLogRepository;
  readonly fallback: RuntimeDebugLogRepository;
}): AdminRuntimeDebugLogRepository {
  return {
    async listRuntimeDebugLogs(rawQuery) {
      const query = rawQuery ?? defaultAdminRuntimeLogsQuery;
      try {
        return await input.primary.listRuntimeDebugLogs(query);
      } catch {
        return paginateRuntimeDebugLogEntries(
          await input.fallback.listRuntimeDebugLogs(),
          query,
        );
      }
    },
  };
}

interface AdminRuntimeDebugLogRow {
  readonly id: string;
  readonly profile_id: string | null;
  readonly order_id: string | null;
  readonly payment_session_id: string | null;
  readonly level: "info" | "warn" | "error";
  readonly category: string;
  readonly message: string;
  readonly context_json: unknown;
  readonly created_at: string;
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
    async listOrders(rawQuery) {
      const query = rawQuery ?? defaultAdminOrdersQuery;
      return listAdminOrdersPage({
        kind: "orders",
        supabase,
        query,
        sortColumn: "created_at",
        description: "List admin orders",
      });
    },
    async listLifecycle(rawQuery) {
      const query = rawQuery ?? defaultAdminLifecycleQuery;
      return listAdminOrdersPage({
        kind: "lifecycle",
        supabase,
        query,
        sortColumn: "updated_at",
        description: "List admin lifecycle orders",
      });
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
    async transitionOrderLifecycle(input) {
      const row = await queryRequired<AdminLifecycleTransitionRpcRow>(
        supabase
          .rpc("transition_admin_order_lifecycle", {
            p_order_id: input.orderId,
            p_expected_status: input.expectedStatus,
            p_next_status: input.nextStatus,
            p_note: input.note,
            p_occurred_at: input.occurredAt,
          })
          .single(),
        `Transition admin order lifecycle ${input.orderId}`,
      );

      if (row.transition_status === "updated" && row.order_data) {
        return { status: "updated", order: row.order_data };
      }
      if (row.transition_status === "stale" && row.current_status) {
        return { status: "stale", currentStatus: row.current_status };
      }
      if (row.transition_status === "not_found") {
        return { status: "not_found" };
      }

      throw new Error(
        `Transition admin order lifecycle ${input.orderId}: invalid RPC result`,
      );
    },
  };
}

export function createSupabaseAdminInventoryRepository(
  supabase: SupabaseAdminClient,
): AdminInventoryRepository {
  return {
    async listInventory(rawQuery) {
      const query = rawQuery ?? defaultAdminInventoryQuery;
      const matchingProducts = query.search
        ? await queryMany<AdminInventoryProductRow>(
            supabase
              .from("products")
              .select(adminInventoryProductColumns)
              .or(
                `sku.ilike.${postgrestIlikeValue(
                  query.search,
                )},name.ilike.${postgrestIlikeValue(query.search)}`,
              ),
            "Search admin inventory products",
          )
        : null;
      const productIds = matchingProducts?.map((product) => product.id);

      if (productIds && productIds.length === 0) {
        return {
          items: [],
          products: [],
          stores: [],
          page_info: {
            total_count: 0,
            next_cursor: null,
            timezone: query.timezone,
          },
        };
      }

      const includeCentral = query.scope !== "store";
      const includeStore = query.scope !== "central";
      const [centralResult, storeResult] = await Promise.all([
        includeCentral
          ? listAdminInventoryRows<AdminCentralInventoryRow>({
              supabase,
              table: "central_inventory",
              columns: adminCentralInventoryColumns,
              query,
              ...(productIds ? { productIds } : {}),
              recordType: "central",
              description: "List admin central inventory",
            })
          : emptyAdminRowPage<AdminCentralInventoryRow>(),
        includeStore
          ? listAdminInventoryRows<AdminStoreInventoryRow>({
              supabase,
              table: "store_inventory",
              columns: adminStoreInventoryColumns,
              query,
              ...(productIds ? { productIds } : {}),
              recordType: "store",
              description: "List admin store inventory",
              applyScopeFilters(currentQuery) {
                return query.storeId
                  ? currentQuery.eq("store_id", query.storeId)
                  : currentQuery;
              },
            })
          : emptyAdminRowPage<AdminStoreInventoryRow>(),
      ]);
      const merged = [
        ...centralResult.rows.map(
          (row): AdminInventoryRecord => ({ type: "central", row }),
        ),
        ...storeResult.rows.map(
          (row): AdminInventoryRecord => ({ type: "store", row }),
        ),
      ].sort(compareAdminInventoryRecords);
      const pageItems = merged.slice(0, query.limit);
      const totalCount = centralResult.totalCount + storeResult.totalCount;
      const hasMore = merged.length > pageItems.length;
      const productIdsOnPage = pageItems.map((item) => item.row.product_id);
      const products = matchingProducts
        ? matchingProducts.filter((product) =>
            productIdsOnPage.includes(product.id),
          )
        : await listInventoryProducts(supabase, productIdsOnPage);
      const stores = await listInventoryStores(
        supabase,
        pageItems.flatMap((item) =>
          item.type === "store" ? [item.row.store_id] : [],
        ),
      );

      return {
        items: pageItems,
        products,
        stores,
        page_info: {
          total_count: totalCount,
          next_cursor: hasMore
            ? encodeInventoryCursor(pageItems.at(-1) ?? null)
            : null,
          timezone: query.timezone,
        },
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
    async listPickupDates(rawQuery) {
      const query = rawQuery ?? defaultAdminInventoryQuery;
      const countQuery = applyPickupDateFilters(
        supabase
          .from("store_pickup_dates")
          .select("id", { count: "exact", head: true }),
        query,
      );
      let dataQuery = applyPickupDateFilters(
        supabase.from("store_pickup_dates").select(adminPickupDateColumns),
        query,
      )
        .order("pickup_date", { ascending: true })
        .order("id", { ascending: true });
      dataQuery = applyAdminCursor(
        dataQuery,
        query.cursor,
        "pickup-date",
        "pickup_date",
        "id",
        "ascending",
      );
      const [pickupDatesWithExtra, totalCount] = await Promise.all([
        queryMany<AdminPickupDateRow>(
          dataQuery.limit(query.limit + 1),
          "List admin pickup dates",
        ),
        queryCount(countQuery, "Count admin pickup dates"),
      ]);
      const pickupDates = pickupDatesWithExtra.slice(0, query.limit);
      const stores = await listInventoryStores(
        supabase,
        pickupDates.map((row) => row.store_id),
      );

      return {
        items: pickupDates,
        stores,
        page_info: createAdminPageInfo({
          cursorKind: "pickup-date",
          rowsWithExtra: pickupDatesWithExtra,
          items: pickupDates,
          totalCount,
          timezone: query.timezone,
          getCursorValue: (row) => row.pickup_date,
          getCursorId: (row) => row.id,
        }),
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
    async listWebhooks(rawQuery) {
      const query = rawQuery ?? defaultAdminWebhooksQuery;
      const countQuery = applyWebhookFilters(
        supabase
          .from("webhook_events")
          .select("id", { count: "exact", head: true }),
        query,
      );
      let dataQuery = applyWebhookFilters(
        supabase.from("webhook_events").select(adminWebhookEventColumns),
        query,
      )
        .order("received_at", { ascending: false })
        .order("id", { ascending: false });
      dataQuery = applyAdminCursor(
        dataQuery,
        query.cursor,
        "webhooks-received",
        "received_at",
        "id",
      );
      const [rowsWithExtra, totalCount] = await Promise.all([
        queryMany<AdminWebhookEventRow>(
          dataQuery.limit(query.limit + 1),
          "List admin webhooks",
        ),
        queryCount(countQuery, "Count admin webhooks"),
      ]);
      const items = rowsWithExtra.slice(0, query.limit);

      return {
        items,
        page_info: createAdminPageInfo({
          cursorKind: "webhooks-received",
          rowsWithExtra,
          items,
          totalCount,
          timezone: query.timezone,
          getCursorValue: (row) => row.received_at,
          getCursorId: (row) => row.id,
        }),
      };
    },
  };
}

export function createSupabaseAdminPaymentDebugRepository(
  supabase: SupabaseAdminClient,
): AdminPaymentDebugRepository {
  return {
    async listPaymentDebug(rawQuery) {
      const query = rawQuery ?? defaultAdminPaymentDiagnosticsQuery;
      const matchingOrderIds = query.lookup?.match(/^(?:DO|PO)-/i)
        ? (
            await queryMany<Pick<AdminOrderRow, "id">>(
              supabase
                .from("orders")
                .select("id")
                .ilike("order_number", `%${query.lookup}%`),
              "Find admin payment debug orders",
            )
          ).map((order) => order.id)
        : [];
      const countQuery = applyPaymentDebugFilters(
        supabase
          .from("payment_sessions")
          .select("id", { count: "exact", head: true }),
        query,
        matchingOrderIds,
      );
      let dataQuery = applyPaymentDebugFilters(
        supabase.from("payment_sessions").select(adminPaymentSessionColumns),
        query,
        matchingOrderIds,
      )
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false });
      dataQuery = applyAdminCursor(
        dataQuery,
        query.cursor,
        "payment-updated",
        "updated_at",
        "id",
      );
      const [sessionsWithExtra, totalCount] = await Promise.all([
        queryMany<AdminPaymentSessionRow>(
          dataQuery.limit(query.limit + 1),
          "List admin payment debug sessions",
        ),
        queryCount(countQuery, "Count admin payment debug sessions"),
      ]);
      const sessions = sessionsWithExtra.slice(0, query.limit);

      if (sessions.length === 0) {
        return {
          items: [],
          page_info: {
            total_count: totalCount,
            next_cursor: null,
            timezone: query.timezone,
          },
        };
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

      const items = sessions.map((session) => ({
        session,
        order: ordersById.get(session.order_id) ?? null,
        totalSnapshots: totalSnapshotsBySessionId.get(session.id) ?? [],
        paypalSnapshots: paypalSnapshotsBySessionId.get(session.id) ?? [],
        linkedWebhooks: webhooksBySessionId.get(session.id) ?? [],
      }));

      return {
        items,
        page_info: createAdminPageInfo({
          cursorKind: "payment-updated",
          rowsWithExtra: sessionsWithExtra,
          items: sessions,
          totalCount,
          timezone: query.timezone,
          getCursorValue: (row) => row.updated_at,
          getCursorId: (row) => row.id,
        }),
      };
    },
  };
}

export function createSupabaseAdminRuntimeDebugLogRepository(
  supabase: SupabaseAdminClient,
): SupabaseAdminRuntimeDebugLogRepository {
  return {
    async listRuntimeDebugLogs(rawQuery) {
      const query = rawQuery ?? defaultAdminRuntimeLogsQuery;
      const countQuery = applyRuntimeDebugLogFilters(
        supabase
          .from("runtime_debug_logs")
          .select("id", { count: "exact", head: true }),
        query,
      );
      let dataQuery = applyRuntimeDebugLogFilters(
        supabase.from("runtime_debug_logs").select(adminRuntimeDebugLogColumns),
        query,
      )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false });
      dataQuery = applyAdminCursor(
        dataQuery,
        query.cursor,
        "runtime-timestamp",
        "created_at",
        "id",
      );
      const [rowsWithExtra, totalCount] = await Promise.all([
        queryMany<AdminRuntimeDebugLogRow>(
          dataQuery.limit(query.limit + 1),
          "List admin runtime debug logs",
        ),
        queryCount(countQuery, "Count admin runtime debug logs"),
      ]);
      const allowlistedRowsWithExtra = rowsWithExtra.flatMap((row) => {
        const entry = allowlistRuntimeDebugLogEntry({
          timestamp: row.created_at,
          level: row.level,
          message: row.message,
          context: sanitizeDebugLogContext(row.context_json),
        });
        return entry ? [{ ...entry, id: row.id }] : [];
      });
      const items = allowlistedRowsWithExtra.slice(0, query.limit);

      return {
        items,
        page_info: createAdminPageInfo({
          cursorKind: "runtime-timestamp",
          rowsWithExtra: allowlistedRowsWithExtra,
          items,
          totalCount,
          timezone: query.timezone,
          getCursorValue: (entry) => entry.timestamp,
          getCursorId: (entry) => entry.id,
        }),
      };
    },
    async insertRuntimeDebugLog(entry) {
      const allowlistedEntry = allowlistRuntimeDebugLogEntry(entry);
      if (!allowlistedEntry) {
        return;
      }
      const context = runtimeDebugLogContextObject(allowlistedEntry);

      await queryVoid(
        supabase.from("runtime_debug_logs").insert({
          profile_id: readRuntimeDebugContextString(context, "profile_id"),
          order_id: readRuntimeDebugContextString(context, "order_id"),
          payment_session_id: readRuntimeDebugContextString(
            context,
            "payment_session_id",
          ),
          level: allowlistedEntry.level,
          category:
            readRuntimeDebugContextString(context, "source") ?? "runtime",
          message: allowlistedEntry.message,
          context_json: allowlistedEntry.context,
          created_at: allowlistedEntry.timestamp,
        }),
        "Persist runtime debug log",
      );
    },
    async deleteRuntimeDebugLogsBefore(cutoff) {
      await queryVoid(
        supabase.from("runtime_debug_logs").delete().lt("created_at", cutoff),
        "Delete expired runtime debug logs",
      );
    },
  };
}

const defaultAdminOrdersQuery: AdminOrdersQuery = {
  limit: 50,
  timezone: "UTC",
};

const defaultAdminLifecycleQuery: AdminLifecycleQuery = {
  limit: 50,
  timezone: "UTC",
};

const defaultAdminInventoryQuery: AdminInventoryQuery = {
  limit: 75,
  timezone: "UTC",
};

const defaultAdminWebhooksQuery: AdminWebhooksQuery = {
  limit: 75,
  timezone: "UTC",
};

const defaultAdminPaymentDiagnosticsQuery: AdminPaymentDiagnosticsQuery = {
  limit: 75,
  timezone: "UTC",
};

const defaultAdminRuntimeLogsQuery: AdminRuntimeLogsQuery = {
  limit: 75,
  timezone: "UTC",
};

const actionableAdminOrderStatuses: readonly OrderStatus[] = [
  "paid",
  "processing",
  "shipped",
  "preparing_pickup",
  "ready_for_pickup",
];

const lowStockMaximum = 5;

type ListAdminOrdersPageInput =
  | {
      readonly kind: "orders";
      readonly supabase: SupabaseAdminClient;
      readonly query: AdminOrdersQuery;
      readonly sortColumn: "created_at";
      readonly description: string;
    }
  | {
      readonly kind: "lifecycle";
      readonly supabase: SupabaseAdminClient;
      readonly query: AdminLifecycleQuery;
      readonly sortColumn: "updated_at";
      readonly description: string;
    };

async function listAdminOrdersPage(
  input: ListAdminOrdersPageInput,
): Promise<AdminCursorPage<AdminOrderRow>> {
  const applyFilters = (query: SupabaseAdminQuery) =>
    input.kind === "orders"
      ? applyAdminOrdersFilters(query, input.query)
      : applyAdminLifecycleFilters(query, input.query);
  const countQuery = applyFilters(
    input.supabase.from("orders").select("id", { count: "exact", head: true }),
  );
  let dataQuery = applyFilters(
    input.supabase.from("orders").select(adminOrderColumns),
  )
    .order(input.sortColumn, { ascending: false })
    .order("id", { ascending: false });
  dataQuery = applyAdminCursor(
    dataQuery,
    input.query.cursor,
    input.kind === "orders" ? "orders-created" : "lifecycle-updated",
    input.sortColumn,
    "id",
  );
  const [rowsWithExtra, totalCount] = await Promise.all([
    queryMany<AdminOrderRow>(
      dataQuery.limit(input.query.limit + 1),
      input.description,
    ),
    queryCount(countQuery, `Count ${input.description.toLowerCase()}`),
  ]);
  const items = rowsWithExtra.slice(0, input.query.limit);

  return {
    items,
    page_info: createAdminPageInfo({
      cursorKind:
        input.kind === "orders" ? "orders-created" : "lifecycle-updated",
      rowsWithExtra,
      items,
      totalCount,
      timezone: input.query.timezone,
      getCursorValue: (row) => row[input.sortColumn],
      getCursorId: (row) => row.id,
    }),
  };
}

function applyAdminOrdersFilters(
  query: SupabaseAdminQuery,
  filters: AdminOrdersQuery,
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.orderNumber) {
    nextQuery = nextQuery.ilike("order_number", `%${filters.orderNumber}%`);
  }

  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }
  if (filters.fulfillment) {
    nextQuery = nextQuery.eq("fulfillment_mode", filters.fulfillment);
  }
  if (filters.paymentStatus) {
    nextQuery = nextQuery.eq("payment_status", filters.paymentStatus);
  }
  if (filters.createdFrom) {
    nextQuery = nextQuery.gte("created_at", filters.createdFrom);
  }
  if (filters.createdTo) {
    nextQuery = nextQuery.lte("created_at", filters.createdTo);
  }

  return nextQuery;
}

function applyAdminLifecycleFilters(
  query: SupabaseAdminQuery,
  filters: AdminLifecycleQuery,
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.orderNumber) {
    nextQuery = nextQuery.ilike("order_number", `%${filters.orderNumber}%`);
  }

  const nextActionTarget = filters.nextAction
    ? adminLifecycleTargetByAction[filters.nextAction]
    : null;
  const fulfillment = nextActionTarget?.fulfillment ?? filters.fulfillment;
  const status = nextActionTarget?.status ?? filters.status;

  if (fulfillment) {
    nextQuery = nextQuery.eq("fulfillment_mode", fulfillment);
  }
  if (status) {
    nextQuery = nextQuery.eq("status", status);
  } else if (filters.actionableOnly) {
    nextQuery = nextQuery.in("status", actionableAdminOrderStatuses);
  }
  if (filters.updatedFrom) {
    nextQuery = nextQuery.gte("updated_at", filters.updatedFrom);
  }
  if (filters.updatedTo) {
    nextQuery = nextQuery.lte("updated_at", filters.updatedTo);
  }

  return nextQuery;
}

const adminLifecycleTargetByAction: Readonly<
  Record<
    AdminLifecycleNextAction,
    {
      readonly fulfillment: AdminOrderFulfillmentMode;
      readonly status: OrderStatus;
    }
  >
> = {
  processing: { fulfillment: "delivery", status: "paid" },
  shipped: { fulfillment: "delivery", status: "processing" },
  delivered: { fulfillment: "delivery", status: "shipped" },
  preparing_pickup: { fulfillment: "pickup", status: "paid" },
  ready_for_pickup: {
    fulfillment: "pickup",
    status: "preparing_pickup",
  },
  picked_up: { fulfillment: "pickup", status: "ready_for_pickup" },
};

async function listAdminInventoryRows<
  TRow extends {
    readonly id: string;
    readonly product_id: string;
    readonly updated_at: string;
  },
>(input: {
  readonly supabase: SupabaseAdminClient;
  readonly table: string;
  readonly columns: string;
  readonly query: AdminInventoryQuery;
  readonly productIds?: readonly string[];
  readonly recordType: AdminInventoryRecord["type"];
  readonly description: string;
  readonly applyScopeFilters?: (
    query: SupabaseAdminQuery,
  ) => SupabaseAdminQuery;
}): Promise<{ readonly rows: readonly TRow[]; readonly totalCount: number }> {
  const applyFilters = (query: SupabaseAdminQuery) => {
    let nextQuery = applyAdminInventoryFilters(
      query,
      input.query,
      input.productIds,
    );
    if (input.applyScopeFilters) {
      nextQuery = input.applyScopeFilters(nextQuery);
    }
    return nextQuery;
  };
  const countQuery = applyFilters(
    input.supabase
      .from(input.table)
      .select("id", { count: "exact", head: true }),
  );
  let dataQuery = applyFilters(
    input.supabase.from(input.table).select(input.columns),
  )
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false });
  dataQuery = applyAdminInventoryCursor(
    dataQuery,
    input.query.cursor,
    input.recordType,
  );
  const [rows, totalCount] = await Promise.all([
    queryMany<TRow>(dataQuery.limit(input.query.limit + 1), input.description),
    queryCount(countQuery, `Count ${input.description.toLowerCase()}`),
  ]);

  return { rows, totalCount };
}

function applyAdminInventoryFilters(
  query: SupabaseAdminQuery,
  filters: AdminInventoryQuery,
  productIds?: readonly string[],
): SupabaseAdminQuery {
  let nextQuery = query;

  if (productIds) {
    nextQuery = nextQuery.in("product_id", productIds);
  }
  if (filters.stockCondition === "out_of_stock") {
    nextQuery = nextQuery.eq("available_quantity", 0);
  } else if (filters.stockCondition === "low_stock") {
    nextQuery = nextQuery
      .gte("available_quantity", 1)
      .lte("available_quantity", lowStockMaximum);
  } else if (filters.stockCondition === "in_stock") {
    nextQuery = nextQuery.gte("available_quantity", lowStockMaximum + 1);
  } else if (filters.availability === "available") {
    nextQuery = nextQuery.gte("available_quantity", 1);
  } else if (filters.availability === "unavailable") {
    nextQuery = nextQuery.eq("available_quantity", 0);
  }
  if (filters.changedFrom) {
    nextQuery = nextQuery.gte("updated_at", filters.changedFrom);
  }
  if (filters.changedTo) {
    nextQuery = nextQuery.lte("updated_at", filters.changedTo);
  }

  return nextQuery;
}

function applyPickupDateFilters(
  query: SupabaseAdminQuery,
  filters: AdminInventoryQuery,
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.storeId) {
    nextQuery = nextQuery.eq("store_id", filters.storeId);
  }
  if (filters.availability === "available") {
    nextQuery = nextQuery.eq("is_available", true);
  } else if (filters.availability === "unavailable") {
    nextQuery = nextQuery.eq("is_available", false);
  }
  if (filters.changedFrom) {
    nextQuery = nextQuery.gte("updated_at", filters.changedFrom);
  }
  if (filters.changedTo) {
    nextQuery = nextQuery.lte("updated_at", filters.changedTo);
  }

  return nextQuery;
}

function applyWebhookFilters(
  query: SupabaseAdminQuery,
  filters: AdminWebhooksQuery,
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.eventId) {
    nextQuery = nextQuery.ilike("event_id", `%${filters.eventId}%`);
  }
  if (filters.eventType) {
    nextQuery = nextQuery.eq("event_type", filters.eventType);
  }
  if (filters.verificationStatus) {
    nextQuery = nextQuery.eq("verification_status", filters.verificationStatus);
  }
  if (filters.processingStatus) {
    nextQuery = nextQuery.eq("processing_status", filters.processingStatus);
  }
  if (filters.linkedState === "linked") {
    nextQuery = nextQuery.or(
      "linked_order_id.not.is.null,linked_payment_session_id.not.is.null",
    );
  } else if (filters.linkedState === "unlinked") {
    nextQuery = nextQuery.or(
      "and(linked_order_id.is.null,linked_payment_session_id.is.null)",
    );
  }
  if (filters.receivedFrom) {
    nextQuery = nextQuery.gte("received_at", filters.receivedFrom);
  }
  if (filters.receivedTo) {
    nextQuery = nextQuery.lte("received_at", filters.receivedTo);
  }

  return nextQuery;
}

function applyPaymentDebugFilters(
  query: SupabaseAdminQuery,
  filters: AdminPaymentDiagnosticsQuery,
  matchingOrderIds: readonly string[],
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.lookup) {
    const lookup = postgrestIlikeValue(filters.lookup);
    const lookupFilters = [
      `id.ilike.${lookup}`,
      `paypal_order_id.ilike.${lookup}`,
      `paypal_capture_id.ilike.${lookup}`,
      `paypal_invoice_id.ilike.${lookup}`,
      `paypal_request_id.ilike.${lookup}`,
      ...(matchingOrderIds.length > 0
        ? [`order_id.in.(${matchingOrderIds.join(",")})`]
        : []),
    ];
    nextQuery = nextQuery.or(lookupFilters.join(","));
  }
  if (filters.method) {
    nextQuery = nextQuery.eq("method", filters.method);
  }
  if (filters.status) {
    nextQuery = nextQuery.eq("status", filters.status);
  }
  if (filters.amountConsistency) {
    nextQuery = nextQuery.eq(
      "amount_consistency_status",
      filters.amountConsistency,
    );
  }
  if (filters.updatedFrom) {
    nextQuery = nextQuery.gte("updated_at", filters.updatedFrom);
  }
  if (filters.updatedTo) {
    nextQuery = nextQuery.lte("updated_at", filters.updatedTo);
  }

  return nextQuery;
}

function applyRuntimeDebugLogFilters(
  query: SupabaseAdminQuery,
  filters: AdminRuntimeLogsQuery,
): SupabaseAdminQuery {
  let nextQuery = query;

  if (filters.lookup) {
    const lookup = postgrestIlikeValue(filters.lookup);
    nextQuery = nextQuery.or(
      [
        `message.ilike.${lookup}`,
        `context_json->>debug_id.ilike.${lookup}`,
        `context_json->>order_id.ilike.${lookup}`,
        `context_json->>order_number.ilike.${lookup}`,
        `context_json->>payment_session_id.ilike.${lookup}`,
        `context_json->>paypal_order_id.ilike.${lookup}`,
        `context_json->>paypal_capture_id.ilike.${lookup}`,
        `context_json->>event_id.ilike.${lookup}`,
      ].join(","),
    );
  }
  if (filters.level) {
    nextQuery = nextQuery.eq("level", filters.level);
  }
  if (filters.category) {
    nextQuery = nextQuery.eq("category", filters.category);
  }
  if (filters.event) {
    nextQuery = nextQuery.eq("context_json->>event", filters.event);
  }
  if (filters.loggedFrom) {
    nextQuery = nextQuery.gte("created_at", filters.loggedFrom);
  }
  if (filters.loggedTo) {
    nextQuery = nextQuery.lte("created_at", filters.loggedTo);
  }

  return nextQuery;
}

function paginateRuntimeDebugLogEntries(
  entries: readonly RuntimeDebugLogEntry[],
  query: AdminRuntimeLogsQuery,
): AdminCursorPage<AdminRuntimeDebugLogEntry> {
  const filtered = entries
    .flatMap((entry) => {
      const allowlisted = allowlistRuntimeDebugLogEntry(entry);
      return allowlisted ? [{ ...allowlisted, id: entry.id }] : [];
    })
    .filter((entry) => {
      const context = runtimeDebugLogContextObject(entry);
      const source = readRuntimeDebugContextString(context, "source");
      const event = readRuntimeDebugContextString(context, "event");
      const lookupText = [entry.message, ...Object.values(context)]
        .filter(
          (value): value is string | number | boolean =>
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean",
        )
        .join(" ")
        .toLowerCase();

      return (
        (!query.lookup || lookupText.includes(query.lookup.toLowerCase())) &&
        (!query.level || entry.level === query.level) &&
        (!query.category || source === query.category) &&
        (!query.event || event === query.event) &&
        (!query.loggedFrom || entry.timestamp >= query.loggedFrom) &&
        (!query.loggedTo || entry.timestamp <= query.loggedTo)
      );
    })
    .sort((left, right) => {
      const timeDifference = right.timestamp.localeCompare(left.timestamp);
      return timeDifference || right.id.localeCompare(left.id);
    });
  const decodedCursor = query.cursor
    ? decodeAdminCursor(query.cursor, "runtime-timestamp")
    : null;
  const afterCursor = decodedCursor
    ? filtered.filter(
        (entry) =>
          entry.timestamp < decodedCursor.value ||
          (entry.timestamp === decodedCursor.value &&
            entry.id < decodedCursor.id),
      )
    : filtered;
  const rowsWithExtra = afterCursor.slice(0, query.limit + 1);
  const items = rowsWithExtra.slice(0, query.limit);

  return {
    items,
    page_info: createAdminPageInfo({
      cursorKind: "runtime-timestamp",
      rowsWithExtra,
      items,
      totalCount: filtered.length,
      timezone: query.timezone,
      getCursorValue: (entry) => entry.timestamp,
      getCursorId: (entry) => entry.id,
    }),
  };
}

function postgrestIlikeValue(value: string): string {
  const pattern = `%${value}%`;
  if (!/[",()\\]/.test(pattern)) {
    return pattern;
  }

  return `"${pattern.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function applyAdminCursor(
  query: SupabaseAdminQuery,
  cursor: string | undefined,
  cursorKind: AdminCursorKind,
  valueColumn: string,
  idColumn: string,
  direction: "ascending" | "descending" = "descending",
): SupabaseAdminQuery {
  const decoded = cursor ? decodeAdminCursor(cursor, cursorKind) : null;
  if (!decoded) {
    return query;
  }

  const operator = direction === "ascending" ? "gt" : "lt";
  return query.or(
    `${valueColumn}.${operator}.${decoded.value},and(${valueColumn}.eq.${decoded.value},${idColumn}.${operator}.${decoded.id})`,
  );
}

function createAdminPageInfo<TRow>(input: {
  readonly cursorKind: AdminCursorKind;
  readonly rowsWithExtra: readonly TRow[];
  readonly items: readonly TRow[];
  readonly totalCount: number;
  readonly timezone: string;
  readonly getCursorValue: (row: TRow) => string;
  readonly getCursorId: (row: TRow) => string;
}) {
  const lastItem = input.items.at(-1);

  return {
    total_count: input.totalCount,
    next_cursor:
      input.rowsWithExtra.length > input.items.length && lastItem
        ? encodeAdminCursor({
            kind: input.cursorKind,
            value: input.getCursorValue(lastItem),
            id: input.getCursorId(lastItem),
          })
        : null,
    timezone: input.timezone,
  };
}

function compareAdminInventoryRecords(
  left: AdminInventoryRecord,
  right: AdminInventoryRecord,
): number {
  const timeDifference = right.row.updated_at.localeCompare(
    left.row.updated_at,
  );
  return (
    timeDifference ||
    inventoryRecordId(right).localeCompare(inventoryRecordId(left))
  );
}

function inventoryRecordId(record: AdminInventoryRecord): string {
  return `${record.type}:${record.row.id}`;
}

function encodeInventoryCursor(record: AdminInventoryRecord | null) {
  return record
    ? encodeAdminCursor({
        kind: "inventory-updated",
        value: record.row.updated_at,
        id: inventoryRecordId(record),
      })
    : null;
}

function applyAdminInventoryCursor(
  query: SupabaseAdminQuery,
  cursor: string | undefined,
  recordType: AdminInventoryRecord["type"],
): SupabaseAdminQuery {
  const decoded = cursor
    ? decodeAdminCursor(cursor, "inventory-updated")
    : null;
  if (!decoded) {
    return query;
  }

  const separatorIndex = decoded.id.indexOf(":");
  const cursorType = decoded.id.slice(0, separatorIndex);
  const cursorId = decoded.id.slice(separatorIndex + 1);

  if (cursorType === recordType) {
    return query.or(
      `updated_at.lt.${decoded.value},and(updated_at.eq.${decoded.value},id.lt.${cursorId})`,
    );
  }

  return recordType === "central"
    ? query.lte("updated_at", decoded.value)
    : query.lt("updated_at", decoded.value);
}

function emptyAdminRowPage<TRow>(): {
  readonly rows: readonly TRow[];
  readonly totalCount: number;
} {
  return { rows: [], totalCount: 0 };
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

const adminRuntimeDebugLogColumns = [
  "id",
  "profile_id",
  "order_id",
  "payment_session_id",
  "level",
  "category",
  "message",
  "context_json",
  "created_at",
].join(", ");

const adminCentralInventoryColumns = [
  "id",
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

async function queryCount(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<number> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return typeof result.count === "number" ? result.count : 0;
}

async function queryVoid(
  query: PromiseLike<SupabaseAdminResult<unknown>>,
  description: string,
): Promise<void> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
}

function runtimeDebugLogContextObject(
  entry: DebugLogEntry,
): Readonly<Record<string, unknown>> {
  return isRuntimeDebugLogContextObject(entry.context) ? entry.context : {};
}

function isRuntimeDebugLogContextObject(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRuntimeDebugContextString(
  context: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const value = context[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

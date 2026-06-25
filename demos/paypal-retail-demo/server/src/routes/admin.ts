import { Router, type Request, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import { sanitizeDebugLogContext, type DebugLogJson } from "../debug/logger.js";
import type {
  AdminCentralInventoryRow,
  AdminInventoryProductRow,
  AdminInventoryRepository,
  AdminInventorySnapshot,
  AdminInventoryStoreRow,
  AdminOrderDetail,
  AdminOrderRepository,
  AdminOrderRow,
  AdminPaymentDebugEntry,
  AdminPaymentDebugRepository,
  AdminPickupDateRow,
  AdminPickupDateSnapshot,
  AdminProfileMarketRepository,
  AdminRuntimeDebugLogEntry,
  AdminRuntimeDebugLogRepository,
  AdminStoreInventoryRow,
  AdminWebhookEventRow,
  AdminWebhookRepository,
} from "../repositories/adminRepository.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { CatalogRepository, StorefrontContext } from "./catalog.js";

import {
  type AdminRequest,
  createAdminSessionToken,
  resolveAdminSessionFromRequest,
} from "../middleware/admin.js";
import {
  canTransitionOrderStatus,
  planOrderStatusTransition,
  type OrderStatus,
} from "../../../shared/src/orders.js";

export interface CreateAdminRouterInput {
  readonly adminSessionGuard: RequestHandler;
  readonly adminPasscode: string;
  readonly catalogRepository: CatalogRepository;
  readonly profileMarketRepository: AdminProfileMarketRepository;
  readonly orderRepository?: AdminOrderRepository;
  readonly inventoryRepository?: AdminInventoryRepository;
  readonly webhookRepository?: AdminWebhookRepository;
  readonly debugRepository?: AdminPaymentDebugRepository;
  readonly runtimeDebugLogRepository?: AdminRuntimeDebugLogRepository;
  readonly activeStorefrontContextStore: ActiveStorefrontContextStore;
}

const ADMIN_SESSION_TTL_MINUTES = 120;

export function createAdminRouter(input: CreateAdminRouterInput): Router {
  const router = Router();

  router.post(
    "/admin/login",
    asyncRoute(async (request, response) => {
      const passcode = normalizeBodyString(request.body?.passcode);

      if (!passcode) {
        sendApiError(response, 400, {
          code: "INVALID_ADMIN_LOGIN_REQUEST",
          message: "passcode is required.",
        });
        return;
      }

      if (passcode !== input.adminPasscode) {
        sendApiError(response, 403, {
          code: "ADMIN_LOGIN_DENIED",
          message: "The provided admin passcode is not valid.",
        });
        return;
      }

      const issuedAt = new Date();
      const expiresAt = new Date(
        issuedAt.getTime() + ADMIN_SESSION_TTL_MINUTES * 60 * 1000,
      );
      const session = {
        session_id: randomUUID(),
        expires_at: expiresAt.toISOString(),
      };
      const token = createAdminSessionToken({
        adminPasscode: input.adminPasscode,
        sessionId: session.session_id,
        expiresAt: session.expires_at,
      });

      sendApiSuccess(response, {
        status: "authenticated",
        token,
        expires_in_seconds: ADMIN_SESSION_TTL_MINUTES * 60,
        session,
      });
    }),
  );

  router.post(
    "/admin/logout",
    asyncRoute(async (request, response) => {
      const resolvedSession = resolveAdminSessionFromRequest({
        request,
        adminPasscode: input.adminPasscode,
      });

      sendApiSuccess(response, {
        status: "logged_out",
        ...(resolvedSession
          ? {
              session: {
                session_id: resolvedSession.sessionId,
                expires_at: resolvedSession.expiresAt,
              },
            }
          : {}),
      });
    }),
  );

  router.get(
    "/admin/state",
    asyncRoute(async (request, response) => {
      const resolvedSession = resolveAdminSessionFromRequest({
        request,
        adminPasscode: input.adminPasscode,
      });

      if (!resolvedSession) {
        sendApiSuccess(response, {
          authenticated: false,
        });
        return;
      }

      sendApiSuccess(response, {
        authenticated: true,
        session: {
          session_id: resolvedSession.sessionId,
          expires_at: resolvedSession.expiresAt,
        },
      });
    }),
  );

  router.patch(
    "/admin/profile-market",
    input.adminSessionGuard,
    asyncRoute(async (request, response) => {
      const body = parseProfileMarketBody(request);

      if (!body) {
        sendApiError(response, 400, {
          code: "INVALID_ADMIN_PROFILE_MARKET_REQUEST",
          message: "profile_id and market_id are required.",
        });
        return;
      }

      const [profile, market] = await Promise.all([
        input.profileMarketRepository.getProfileById(body.profileId),
        input.profileMarketRepository.getMarketById(body.marketId),
      ]);

      if (!profile || !market) {
        sendApiError(response, 404, {
          code: "ADMIN_PROFILE_MARKET_NOT_FOUND",
          message: "The requested admin profile or market was not found.",
          details: {
            profile_id: body.profileId,
            market_id: body.marketId,
          },
        });
        return;
      }

      const nextContext: StorefrontContext = {
        profileSlug: profile.slug,
        marketCode: market.code.toUpperCase(),
      };
      input.activeStorefrontContextStore.set(nextContext);

      sendApiSuccess(
        response,
        await input.catalogRepository.getConfig(nextContext),
      );
    }),
  );

  if (input.orderRepository) {
    router.get(
      "/admin/orders",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const orders = await input.orderRepository?.listOrders();

        sendApiSuccess(response, {
          orders: (orders ?? []).map(mapAdminOrderSummary),
        });
      }),
    );

    router.get(
      "/admin/orders/:id",
      input.adminSessionGuard,
      asyncRoute(async (request, response) => {
        const orderId = normalizeBodyString(request.params.id);

        if (!orderId) {
          sendApiError(response, 400, {
            code: "INVALID_ADMIN_ORDER_REQUEST",
            message: "order id is required.",
          });
          return;
        }

        const order = await input.orderRepository?.getOrder(orderId);

        if (!order) {
          sendAdminOrderNotFound(response, orderId);
          return;
        }

        sendApiSuccess(response, mapAdminOrderDetail(order));
      }),
    );

    router.post(
      "/admin/orders/:id/lifecycle",
      input.adminSessionGuard,
      asyncRoute(async (request, response) => {
        const orderId = normalizeBodyString(request.params.id);
        const body = parseOrderLifecycleBody(request);

        if (!orderId || !body) {
          sendApiError(response, 400, {
            code: "INVALID_ADMIN_ORDER_LIFECYCLE_REQUEST",
            message: "order id and next_status are required.",
          });
          return;
        }

        const order = await input.orderRepository?.getOrder(orderId);

        if (!order) {
          sendAdminOrderNotFound(response, orderId);
          return;
        }

        const plan = planAdminLifecycleTransition({
          request,
          order: order.order,
          nextStatus: body.nextStatus,
          note: body.note,
        });

        if (!plan) {
          sendApiError(response, 409, {
            code: "ADMIN_ORDER_LIFECYCLE_INVALID",
            message: "The requested lifecycle transition is not allowed.",
            details: {
              fulfillment_mode: order.order.fulfillment_mode,
              current_status: order.order.status,
              next_status: body.nextStatus,
              allowed_next_statuses: getAllowedAdminNextStatuses(order.order),
            },
          });
          return;
        }

        const updatedOrder = await input.orderRepository?.updateOrderStatus({
          orderId,
          status: plan.toStatus,
          updatedAt: plan.occurredAt,
        });

        if (!updatedOrder) {
          sendAdminOrderNotFound(response, orderId);
          return;
        }

        await input.orderRepository?.createLifecycleEvent({
          orderId,
          fromStatus: plan.fromStatus,
          toStatus: plan.toStatus,
          actorType: "admin",
          note: plan.timelineEvent.note,
          createdAt: plan.occurredAt,
        });

        const updatedDetail = await input.orderRepository?.getOrder(orderId);

        if (!updatedDetail) {
          sendAdminOrderNotFound(response, orderId);
          return;
        }

        sendApiSuccess(response, mapAdminOrderDetail(updatedDetail));
      }),
    );
  }

  if (input.inventoryRepository) {
    router.get(
      "/admin/inventory",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const inventory = await input.inventoryRepository?.listInventory();

        sendApiSuccess(response, mapAdminInventorySnapshot(inventory));
      }),
    );

    router.patch(
      "/admin/inventory/:id",
      input.adminSessionGuard,
      asyncRoute(async (request, response) => {
        const inventoryId = parseAdminInventoryId(request.params.id);
        const body = parseInventoryBody(request);

        if (!inventoryId || !body) {
          sendApiError(response, 400, {
            code: "INVALID_ADMIN_INVENTORY_REQUEST",
            message:
              "inventory id and non-negative available_quantity are required.",
          });
          return;
        }

        const updatedAt = new Date().toISOString();
        const updatedInventory =
          inventoryId.type === "central"
            ? await input.inventoryRepository?.updateCentralInventory({
                profileId: inventoryId.profileId,
                marketId: inventoryId.marketId,
                productId: inventoryId.productId,
                availableQuantity: body.availableQuantity,
                updatedAt,
              })
            : await input.inventoryRepository?.updateStoreInventory({
                inventoryId: inventoryId.inventoryId,
                availableQuantity: body.availableQuantity,
                updatedAt,
              });

        if (!updatedInventory) {
          sendApiError(response, 404, {
            code: "ADMIN_INVENTORY_NOT_FOUND",
            message: "The requested inventory row was not found.",
            details: {
              inventory_id: request.params.id,
            },
          });
          return;
        }

        sendApiSuccess(response, {
          inventory: mapUpdatedAdminInventory(inventoryId, updatedInventory),
        });
      }),
    );

    router.get(
      "/admin/pickup-dates",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const pickupDates = await input.inventoryRepository?.listPickupDates();

        sendApiSuccess(response, mapAdminPickupDateSnapshot(pickupDates));
      }),
    );

    router.patch(
      "/admin/pickup-dates/:id",
      input.adminSessionGuard,
      asyncRoute(async (request, response) => {
        const pickupDateId = normalizeBodyString(request.params.id);
        const body = parsePickupDateBody(request);

        if (!pickupDateId || !body) {
          sendApiError(response, 400, {
            code: "INVALID_ADMIN_PICKUP_DATE_REQUEST",
            message:
              "pickup date id and at least one valid capacity or is_available value are required.",
          });
          return;
        }

        const pickupDate = await input.inventoryRepository?.updatePickupDate({
          pickupDateId,
          ...body,
          updatedAt: new Date().toISOString(),
        });

        if (!pickupDate) {
          sendApiError(response, 404, {
            code: "ADMIN_PICKUP_DATE_NOT_FOUND",
            message: "The requested pickup date row was not found.",
            details: {
              pickup_date_id: pickupDateId,
            },
          });
          return;
        }

        sendApiSuccess(response, {
          pickup_date: mapAdminPickupDate(pickupDate, []),
        });
      }),
    );
  }

  if (input.webhookRepository) {
    router.get(
      "/admin/webhooks",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const webhooks = await input.webhookRepository?.listWebhooks();

        sendApiSuccess(response, {
          webhooks: (webhooks ?? []).map(mapAdminWebhookEvent),
        });
      }),
    );
  }

  if (input.debugRepository) {
    router.get(
      "/admin/payment-debug",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const paymentDebug = await input.debugRepository?.listPaymentDebug();

        sendApiSuccess(response, {
          payment_sessions: (paymentDebug ?? []).map(mapAdminPaymentDebugEntry),
        });
      }),
    );
  }

  if (input.runtimeDebugLogRepository) {
    router.get(
      "/admin/debug-logs",
      input.adminSessionGuard,
      asyncRoute(async (_request, response) => {
        const debugLogs =
          await input.runtimeDebugLogRepository?.listRuntimeDebugLogs();

        sendApiSuccess(response, {
          debug_logs: (debugLogs ?? []).map(mapAdminRuntimeDebugLogEntry),
        });
      }),
    );
  }

  return router;
}

function parseProfileMarketBody(request: Request): {
  readonly profileId: string;
  readonly marketId: string;
} | null {
  const body = request.body as Record<string, unknown> | undefined;
  const profileId = normalizeBodyString(body?.profile_id);
  const marketId = normalizeBodyString(body?.market_id);

  return profileId && marketId ? { profileId, marketId } : null;
}

function parseOrderLifecycleBody(request: Request): {
  readonly nextStatus: OrderStatus;
  readonly note: string | null;
} | null {
  const body = request.body as Record<string, unknown> | undefined;
  const nextStatus = normalizeOrderStatus(body?.next_status);

  if (!nextStatus) {
    return null;
  }

  return {
    nextStatus,
    note: normalizeOptionalBodyString(body?.note),
  };
}

function parseInventoryBody(request: Request): {
  readonly availableQuantity: number;
} | null {
  const body = request.body as Record<string, unknown> | undefined;
  const availableQuantity = normalizeNonNegativeInteger(
    body?.available_quantity,
  );

  return typeof availableQuantity === "number" ? { availableQuantity } : null;
}

function parsePickupDateBody(request: Request): {
  readonly capacity?: number;
  readonly isAvailable?: boolean;
} | null {
  const body = request.body as Record<string, unknown> | undefined;
  const capacity = normalizeNonNegativeInteger(body?.capacity);
  const isAvailable = normalizeBodyBoolean(body?.is_available);
  const patch: {
    capacity?: number;
    isAvailable?: boolean;
  } = {};

  if (typeof capacity === "number") {
    patch.capacity = capacity;
  }
  if (typeof isAvailable === "boolean") {
    patch.isAvailable = isAvailable;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

type ParsedAdminInventoryId =
  | {
      readonly type: "central";
      readonly profileId: string;
      readonly marketId: string;
      readonly productId: string;
    }
  | {
      readonly type: "store";
      readonly inventoryId: string;
    };

function parseAdminInventoryId(value: unknown): ParsedAdminInventoryId | null {
  const normalizedValue = normalizeBodyString(value);

  if (!normalizedValue) {
    return null;
  }

  const [type, ...parts] = normalizedValue.split(":");

  if (type === "central" && parts.length === 3 && parts.every(Boolean)) {
    const [profileId, marketId, productId] = parts as [string, string, string];

    return {
      type,
      profileId,
      marketId,
      productId,
    };
  }

  if (type === "store" && parts.length === 1 && parts[0]) {
    const [inventoryId] = parts as [string];

    return {
      type,
      inventoryId,
    };
  }

  return null;
}

function normalizeOrderStatus(value: unknown): OrderStatus | null {
  if (
    value === "pending" ||
    value === "paid" ||
    value === "processing" ||
    value === "shipped" ||
    value === "delivered" ||
    value === "preparing_pickup" ||
    value === "ready_for_pickup" ||
    value === "picked_up" ||
    value === "cancelled"
  ) {
    return value;
  }

  return null;
}

function normalizeBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function normalizeBodyBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function sendAdminOrderNotFound(
  response: Parameters<typeof sendApiError>[0],
  orderId: string | null,
): void {
  sendApiError(response, 404, {
    code: "ADMIN_ORDER_NOT_FOUND",
    message: "The requested admin order was not found.",
    details: {
      order_id: orderId,
    },
  });
}

function planAdminLifecycleTransition(input: {
  readonly request: Request;
  readonly order: AdminOrderRow;
  readonly nextStatus: OrderStatus;
  readonly note: string | null;
}) {
  try {
    return planOrderStatusTransition({
      actorId: (input.request as AdminRequest).admin?.sessionId ?? "admin",
      actorType: "admin",
      currentStatus: input.order.status,
      fulfillmentMode: input.order.fulfillment_mode,
      nextStatus: input.nextStatus,
      note: input.note,
      occurredAt: new Date(),
      reason: "admin_lifecycle",
    });
  } catch {
    return null;
  }
}

const adminLifecycleCandidateStatuses: readonly OrderStatus[] = [
  "processing",
  "shipped",
  "delivered",
  "preparing_pickup",
  "ready_for_pickup",
  "picked_up",
];

function getAllowedAdminNextStatuses(
  order: Pick<AdminOrderRow, "fulfillment_mode" | "status">,
): readonly OrderStatus[] {
  return adminLifecycleCandidateStatuses.filter((nextStatus) =>
    canTransitionOrderStatus({
      currentStatus: order.status,
      fulfillmentMode: order.fulfillment_mode,
      nextStatus,
    }),
  );
}

function mapAdminOrderSummary(order: AdminOrderRow) {
  return {
    id: order.id,
    profile_id: order.profile_id,
    market_id: order.market_id,
    order_number: order.order_number,
    fulfillment_mode: order.fulfillment_mode,
    status: order.status,
    payment_status: order.payment_status,
    currency_code: order.currency_code,
    total_minor: order.total_minor,
    placed_at: order.created_at,
    updated_at: order.updated_at,
    next_statuses: getAllowedAdminNextStatuses(order),
  };
}

function mapAdminOrderDetail(detail: AdminOrderDetail) {
  return {
    order: {
      ...mapAdminOrderSummary(detail.order),
      totals: {
        subtotal_minor: detail.order.subtotal_minor,
        discount_minor: detail.order.discount_minor,
        tax_minor: detail.order.tax_minor,
        shipping_minor: detail.order.shipping_minor,
        total_minor: detail.order.total_minor,
      },
      items: detail.items.map((item) => ({
        id: item.id,
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
      })),
      addresses: detail.addresses.map((address) => ({
        id: address.id,
        address_type: address.address_type,
        recipient_name: address.recipient_name,
        phone: address.phone,
        address_line1: address.address_line1,
        address_line2: address.address_line2,
        city: address.city,
        state: address.state,
        postal_code: address.postal_code,
        country_code: address.country_code,
      })),
      timeline: detail.timeline.map((event) => ({
        id: event.id,
        from_status: event.from_status,
        to_status: event.to_status,
        actor_type: event.actor_type,
        note: event.note,
        created_at: event.created_at,
      })),
      payment_sessions: detail.paymentSessions.map((session) => ({
        id: session.id,
        provider: session.provider,
        method: session.method,
        status: session.status,
        attempt_number: session.attempt_number,
        paypal_order_id: session.paypal_order_id,
        paypal_capture_id: session.paypal_capture_id,
        paypal_invoice_id: session.paypal_invoice_id,
        paypal_request_id: session.paypal_request_id,
        vault_requested: session.vault_requested,
        merchant_total_minor: session.merchant_total_minor,
        provider_total_minor: session.provider_total_minor,
        amount_consistency_status: session.amount_consistency_status,
        currency_code: session.currency_code,
        created_at: session.created_at,
        updated_at: session.updated_at,
      })),
      total_snapshots: detail.totalSnapshots.map((snapshot) => ({
        id: snapshot.id,
        payment_session_id: snapshot.payment_session_id,
        fulfillment_mode: snapshot.fulfillment_mode,
        calculation_stage: snapshot.calculation_stage,
        currency_code: snapshot.currency_code,
        merchandise_subtotal_minor: snapshot.merchandise_subtotal_minor,
        product_discount_minor: snapshot.product_discount_minor,
        promo_discount_minor: snapshot.promo_discount_minor,
        taxable_subtotal_minor: snapshot.taxable_subtotal_minor,
        tax_minor: snapshot.tax_minor,
        shipping_minor: snapshot.shipping_minor,
        total_minor: snapshot.total_minor,
        promo_evaluation_id: snapshot.promo_evaluation_id,
        created_at: snapshot.created_at,
      })),
      paypal_snapshots: detail.paypalSnapshots.map((snapshot) => ({
        id: snapshot.id,
        payment_session_id: snapshot.payment_session_id,
        paypal_invoice_id: snapshot.paypal_invoice_id,
        paypal_request_id: snapshot.paypal_request_id,
        request_json: snapshot.request_json,
        response_json: snapshot.response_json,
        merchant_snapshot_json: snapshot.merchant_snapshot_json,
        created_at: snapshot.created_at,
      })),
      promo_evaluations: detail.promoEvaluations.map((evaluation) => ({
        id: evaluation.id,
        merchandise_discount_minor: evaluation.merchandise_discount_minor,
        taxable_subtotal_minor: evaluation.taxable_subtotal_minor,
        final_total_minor: evaluation.final_total_minor,
        created_at: evaluation.created_at,
      })),
      promo_evaluation_lines: detail.promoEvaluationLines.map((line) => ({
        id: line.id,
        promo_evaluation_id: line.promo_evaluation_id,
        code_snapshot: line.code_snapshot,
        evaluation_status: line.evaluation_status,
        rejection_reason: line.rejection_reason,
        stack_group: line.stack_group,
        discount_minor: line.discount_minor,
        taxable_subtotal_effect_minor: line.taxable_subtotal_effect_minor,
        final_total_effect_minor: line.final_total_effect_minor,
        explanation: line.explanation,
        sort_order: line.sort_order,
        created_at: line.created_at,
      })),
      inventory_effects: detail.items.map((item) => ({
        order_item_id: item.id,
        product_sku: item.product_sku_snapshot,
        product_name: item.product_name_snapshot,
        fulfillment_mode: detail.order.fulfillment_mode,
        requested_quantity: item.quantity,
        fulfillable_quantity: item.fulfillable_quantity,
        unavailable_quantity: item.unavailable_quantity,
      })),
      linked_webhooks: detail.linkedWebhooks.map(mapAdminWebhookEvent),
    },
  };
}

function mapAdminWebhookEvent(webhook: AdminWebhookEventRow) {
  return {
    id: webhook.id,
    event_id: webhook.event_id,
    event_type: webhook.event_type,
    verification_status: webhook.verification_status,
    linked_order_id: webhook.linked_order_id,
    linked_payment_session_id: webhook.linked_payment_session_id,
    processing_status: webhook.processing_status,
    received_at: webhook.received_at,
    processed_at: webhook.processed_at,
  };
}

function mapAdminPaymentDebugEntry(entry: AdminPaymentDebugEntry) {
  const session = entry.session;

  return {
    id: session.id,
    order_id: session.order_id,
    order: entry.order ? mapAdminOrderSummary(entry.order) : null,
    provider: session.provider,
    method: session.method,
    status: session.status,
    attempt_number: session.attempt_number,
    paypal_order_id: session.paypal_order_id,
    paypal_capture_id: session.paypal_capture_id,
    paypal_invoice_id: session.paypal_invoice_id,
    paypal_request_id: session.paypal_request_id,
    vault_requested: session.vault_requested,
    merchant_total_minor: session.merchant_total_minor,
    provider_total_minor: session.provider_total_minor,
    amount_consistency_status: session.amount_consistency_status,
    currency_code: session.currency_code,
    created_at: session.created_at,
    updated_at: session.updated_at,
    total_snapshots: entry.totalSnapshots.map((snapshot) => ({
      id: snapshot.id,
      order_id: snapshot.order_id,
      payment_session_id: snapshot.payment_session_id,
      fulfillment_mode: snapshot.fulfillment_mode,
      calculation_stage: snapshot.calculation_stage,
      currency_code: snapshot.currency_code,
      merchandise_subtotal_minor: snapshot.merchandise_subtotal_minor,
      product_discount_minor: snapshot.product_discount_minor,
      promo_discount_minor: snapshot.promo_discount_minor,
      taxable_subtotal_minor: snapshot.taxable_subtotal_minor,
      tax_minor: snapshot.tax_minor,
      shipping_minor: snapshot.shipping_minor,
      total_minor: snapshot.total_minor,
      promo_evaluation_id: snapshot.promo_evaluation_id,
      created_at: snapshot.created_at,
    })),
    paypal_snapshots: entry.paypalSnapshots.map((snapshot) => ({
      id: snapshot.id,
      payment_session_id: snapshot.payment_session_id,
      paypal_invoice_id: snapshot.paypal_invoice_id,
      paypal_request_id: snapshot.paypal_request_id,
      request_json: snapshot.request_json,
      response_json: snapshot.response_json,
      merchant_snapshot_json: snapshot.merchant_snapshot_json,
      created_at: snapshot.created_at,
    })),
    linked_webhooks: entry.linkedWebhooks.map(mapAdminWebhookEvent),
  };
}

function mapAdminRuntimeDebugLogEntry(entry: AdminRuntimeDebugLogEntry) {
  const context = sanitizeDebugLogContext(entry.context);

  return {
    timestamp: entry.timestamp,
    level: entry.level,
    message: entry.message,
    debug_id: readDebugContextString(context, ["debug_id", "debugId"]),
    source: readDebugContextString(context, ["source"]),
    request_path: readDebugContextString(context, [
      "request_path",
      "path",
      "route",
    ]),
    context,
  };
}

function readDebugContextString(
  context: DebugLogJson,
  keys: readonly string[],
): string | null {
  if (!isDebugLogObject(context)) {
    return null;
  }

  for (const key of keys) {
    const value = context[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function isDebugLogObject(
  context: DebugLogJson,
): context is { readonly [key: string]: DebugLogJson } {
  return (
    typeof context === "object" && context !== null && !Array.isArray(context)
  );
}

function mapAdminInventorySnapshot(
  snapshot: AdminInventorySnapshot | undefined,
) {
  if (!snapshot) {
    return {
      inventory: [],
    };
  }

  const productsById = mapById(snapshot.products);
  const storesById = mapById(snapshot.stores);

  return {
    inventory: [
      ...snapshot.centralInventory.map((row) =>
        mapAdminCentralInventory(row, productsById),
      ),
      ...snapshot.storeInventory.map((row) =>
        mapAdminStoreInventory(row, productsById, storesById),
      ),
    ],
  };
}

function mapUpdatedAdminInventory(
  inventoryId: ParsedAdminInventoryId,
  row: AdminCentralInventoryRow | AdminStoreInventoryRow,
) {
  if (inventoryId.type === "central") {
    return mapAdminCentralInventory(row as AdminCentralInventoryRow, new Map());
  }

  return mapAdminStoreInventory(
    row as AdminStoreInventoryRow,
    new Map(),
    new Map(),
  );
}

function mapAdminCentralInventory(
  row: AdminCentralInventoryRow,
  productsById: ReadonlyMap<string, AdminInventoryProductRow>,
) {
  const product = productsById.get(row.product_id);

  return {
    id: createCentralInventoryId(row),
    inventory_type: "central",
    profile_id: row.profile_id,
    market_id: row.market_id,
    product_id: row.product_id,
    product_sku: product?.sku ?? row.product_id,
    product_name: product?.name ?? row.product_id,
    available_quantity: row.available_quantity,
    updated_at: row.updated_at,
  };
}

function mapAdminStoreInventory(
  row: AdminStoreInventoryRow,
  productsById: ReadonlyMap<string, AdminInventoryProductRow>,
  storesById: ReadonlyMap<string, AdminInventoryStoreRow>,
) {
  const product = productsById.get(row.product_id);
  const store = storesById.get(row.store_id);

  return {
    id: createStoreInventoryId(row),
    inventory_type: "store",
    profile_id: row.profile_id,
    market_id: row.market_id,
    store_id: row.store_id,
    store_name: store?.name ?? row.store_id,
    product_id: row.product_id,
    product_sku: product?.sku ?? row.product_id,
    product_name: product?.name ?? row.product_id,
    available_quantity: row.available_quantity,
    updated_at: row.updated_at,
  };
}

function mapAdminPickupDateSnapshot(
  snapshot: AdminPickupDateSnapshot | undefined,
) {
  if (!snapshot) {
    return {
      pickup_dates: [],
    };
  }

  return {
    pickup_dates: snapshot.pickupDates.map((row) =>
      mapAdminPickupDate(row, snapshot.stores),
    ),
  };
}

function mapAdminPickupDate(
  row: AdminPickupDateRow,
  stores: readonly AdminInventoryStoreRow[],
) {
  const store = stores.find((storeRow) => storeRow.id === row.store_id);

  return {
    id: row.id,
    market_id: row.market_id,
    store_id: row.store_id,
    store_name: store?.name ?? row.store_id,
    pickup_date: row.pickup_date,
    capacity: row.capacity,
    is_available: row.is_available,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function createCentralInventoryId(row: AdminCentralInventoryRow): string {
  return `central:${row.profile_id}:${row.market_id}:${row.product_id}`;
}

function createStoreInventoryId(
  row: Pick<AdminStoreInventoryRow, "id">,
): string {
  return `store:${row.id}`;
}

function mapById<TRow extends { readonly id: string }>(
  rows: readonly TRow[],
): ReadonlyMap<string, TRow> {
  return new Map(rows.map((row) => [row.id, row]));
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

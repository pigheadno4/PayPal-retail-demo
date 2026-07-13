import { describe, expect, it, vi } from "vitest";

import {
  createInMemoryRuntimeDebugLogStore,
  runtimeDebugLogLookupContextKeys,
} from "../src/debug/logger.js";
import {
  createAdminRuntimeDebugLogRepositoryWithFallback,
  createSupabaseAdminInventoryRepository,
  createSupabaseAdminOrderRepository,
  createSupabaseAdminPaymentDebugRepository,
  createSupabaseAdminRuntimeDebugLogRepository,
  createSupabaseAdminWebhookRepository,
  type AdminOrderRow,
  type SupabaseAdminClient,
} from "../src/repositories/adminRepository.js";
import {
  decodeAdminCursor,
  encodeAdminCursor,
} from "../src/routes/adminQuery.js";

describe("Supabase Admin repository filtering and pagination", () => {
  it("transitions an order and writes its Admin lifecycle event through one RPC", async () => {
    const transitionedOrder = {
      ...adminOrderRow("order_1", "2026-07-13T02:00:00.000Z"),
      status: "shipped" as const,
    };
    const client = new RecordingSupabaseAdminClient(
      {},
      {
        transition_admin_order_lifecycle: {
          rows: [
            {
              transition_status: "updated",
              current_status: "shipped",
              order_data: transitionedOrder,
            },
          ],
        },
      },
    );
    const repository = createSupabaseAdminOrderRepository(client);

    const result = await repository.transitionOrderLifecycle({
      orderId: "order_1",
      expectedStatus: "processing",
      nextStatus: "shipped",
      note: "Carrier handoff complete.",
      occurredAt: "2026-07-13T02:00:00.000Z",
    });

    expect(result).toEqual({
      status: "updated",
      order: transitionedOrder,
    });
    expect(client.rpcCalls).toEqual([
      {
        functionName: "transition_admin_order_lifecycle",
        args: {
          p_order_id: "order_1",
          p_expected_status: "processing",
          p_next_status: "shipped",
          p_note: "Carrier handoff complete.",
          p_occurred_at: "2026-07-13T02:00:00.000Z",
        },
      },
    ]);
    expect(client.queries.map((query) => query.table)).toEqual([
      "rpc:transition_admin_order_lifecycle",
    ]);
    expect(
      client.rpcQuery("transition_admin_order_lifecycle").operations,
    ).toEqual([operation("single")]);
  });

  it("maps stale and missing lifecycle RPC outcomes without a second mutation", async () => {
    const staleClient = new RecordingSupabaseAdminClient(
      {},
      {
        transition_admin_order_lifecycle: {
          rows: [
            {
              transition_status: "stale",
              current_status: "shipped",
              order_data: null,
            },
          ],
        },
      },
    );
    const missingClient = new RecordingSupabaseAdminClient(
      {},
      {
        transition_admin_order_lifecycle: {
          rows: [
            {
              transition_status: "not_found",
              current_status: null,
              order_data: null,
            },
          ],
        },
      },
    );

    await expect(
      createSupabaseAdminOrderRepository(staleClient).transitionOrderLifecycle({
        orderId: "order_1",
        expectedStatus: "processing",
        nextStatus: "shipped",
        note: null,
        occurredAt: "2026-07-13T02:00:00.000Z",
      }),
    ).resolves.toEqual({ status: "stale", currentStatus: "shipped" });
    await expect(
      createSupabaseAdminOrderRepository(
        missingClient,
      ).transitionOrderLifecycle({
        orderId: "order_missing",
        expectedStatus: "processing",
        nextStatus: "shipped",
        note: null,
        occurredAt: "2026-07-13T02:00:00.000Z",
      }),
    ).resolves.toEqual({ status: "not_found" });
    expect(staleClient.rpcCalls).toHaveLength(1);
    expect(missingClient.rpcCalls).toHaveLength(1);
  });

  it("applies Orders filters and an ordered cursor before fetching limit + 1", async () => {
    const client = new RecordingSupabaseAdminClient({
      orders: {
        count: 8,
        rows: [
          adminOrderRow("order_3", "2026-07-09T12:00:00.000Z"),
          adminOrderRow("order_2", "2026-07-09T11:00:00.000Z"),
          adminOrderRow("order_1", "2026-07-09T10:00:00.000Z"),
        ],
      },
    });
    const repository = createSupabaseAdminOrderRepository(client);
    const cursor = encodeAdminCursor({
      kind: "orders-created",
      value: "2026-07-10T10:00:00.000Z",
      id: "order_cursor",
    });

    const page = await repository.listOrders({
      orderNumber: "DO-2026",
      status: "processing",
      fulfillment: "delivery",
      paymentStatus: "captured",
      createdFrom: "2026-07-01T00:00:00.000Z",
      createdTo: "2026-07-12T23:59:59.999Z",
      cursor,
      limit: 2,
      timezone: "Asia/Shanghai",
    });

    expect(page.items.map((order) => order.id)).toEqual(["order_3", "order_2"]);
    expect(page.page_info).toEqual({
      total_count: 8,
      next_cursor: expect.any(String),
      timezone: "Asia/Shanghai",
    });
    expect(decodeAdminCursor(page.page_info.next_cursor ?? "")).toEqual({
      kind: "orders-created",
      value: "2026-07-09T11:00:00.000Z",
      id: "order_2",
    });

    const query = client.dataQuery("orders");
    expect(query.operations).toEqual(
      expect.arrayContaining([
        operation("ilike", "order_number", "%DO-2026%"),
        operation("eq", "status", "processing"),
        operation("eq", "fulfillment_mode", "delivery"),
        operation("eq", "payment_status", "captured"),
        operation("gte", "created_at", "2026-07-01T00:00:00.000Z"),
        operation("lte", "created_at", "2026-07-12T23:59:59.999Z"),
        operation(
          "or",
          "created_at.lt.2026-07-10T10:00:00.000Z,and(created_at.eq.2026-07-10T10:00:00.000Z,id.lt.order_cursor)",
        ),
        operation("order", "created_at", { ascending: false }),
        operation("order", "id", { ascending: false }),
        operation("limit", 3),
      ]),
    );
  });

  it("maps Lifecycle next-action filters to canonical fulfillment and current status", async () => {
    const client = new RecordingSupabaseAdminClient({
      orders: {
        count: 1,
        rows: [adminOrderRow("order_2", "2026-07-09T11:00:00.000Z")],
      },
    });
    const repository = createSupabaseAdminOrderRepository(client);

    const page = await repository.listLifecycle({
      nextAction: "shipped",
      actionableOnly: true,
      updatedFrom: "2026-07-01T00:00:00.000Z",
      updatedTo: "2026-07-12T23:59:59.999Z",
      limit: 25,
      timezone: "UTC",
    });

    expect(page.items).toHaveLength(1);
    expect(client.dataQuery("orders").operations).toEqual(
      expect.arrayContaining([
        operation("eq", "fulfillment_mode", "delivery"),
        operation("eq", "status", "processing"),
        operation("gte", "updated_at", "2026-07-01T00:00:00.000Z"),
        operation("lte", "updated_at", "2026-07-12T23:59:59.999Z"),
        operation("limit", 26),
      ]),
    );
  });

  it("applies Inventory search, scope, store, stock, and changed filters in Supabase", async () => {
    const client = new RecordingSupabaseAdminClient({
      products: {
        rows: [
          {
            id: "product_molly",
            sku: "MOLLY-BB-001",
            name: "Molly Blind Box",
            slug: "molly-blind-box",
          },
        ],
      },
      store_inventory: {
        count: 1,
        rows: [
          {
            id: "store_inventory_1",
            profile_id: "profile_popmart",
            market_id: "market_us",
            store_id: "store_san_jose",
            product_id: "product_molly",
            available_quantity: 3,
            updated_at: "2026-07-09T11:00:00.000Z",
          },
        ],
      },
      stores: {
        rows: [
          {
            id: "store_san_jose",
            market_id: "market_us",
            slug: "san-jose",
            name: "San Jose POP MART",
          },
        ],
      },
    });
    const repository = createSupabaseAdminInventoryRepository(client);

    const page = await repository.listInventory({
      search: "MOLLY, LABUBU",
      scope: "store",
      storeId: "store_san_jose",
      stockCondition: "low_stock",
      changedFrom: "2026-07-01T00:00:00.000Z",
      changedTo: "2026-07-12T23:59:59.999Z",
      limit: 10,
      timezone: "UTC",
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        type: "store",
        row: expect.objectContaining({ id: "store_inventory_1" }),
      }),
    ]);
    expect(page.page_info.total_count).toBe(1);
    expect(client.dataQuery("products").operations).toContainEqual(
      operation(
        "or",
        'sku.ilike."%MOLLY, LABUBU%",name.ilike."%MOLLY, LABUBU%"',
      ),
    );
    expect(client.dataQuery("store_inventory").operations).toEqual(
      expect.arrayContaining([
        operation("in", "product_id", ["product_molly"]),
        operation("eq", "store_id", "store_san_jose"),
        operation("gte", "available_quantity", 1),
        operation("lte", "available_quantity", 5),
        operation("gte", "updated_at", "2026-07-01T00:00:00.000Z"),
        operation("lte", "updated_at", "2026-07-12T23:59:59.999Z"),
        operation("limit", 11),
      ]),
    );
  });

  it("keyset-paginates equal-timestamp Inventory rows without a growing offset", async () => {
    const client = new RecordingSupabaseAdminClient({
      store_inventory: {
        count: 5,
        rows: [
          storeInventoryRow("store_inventory_3", "2026-07-09T12:00:00.000Z"),
          storeInventoryRow("store_inventory_2", "2026-07-09T12:00:00.000Z"),
        ],
      },
      products: {
        rows: [
          {
            id: "product_molly",
            sku: "MOLLY-BB-001",
            name: "Molly Blind Box",
            slug: "molly-blind-box",
          },
        ],
      },
      stores: {
        rows: [
          {
            id: "store_san_jose",
            market_id: "market_us",
            slug: "san-jose",
            name: "San Jose POP MART",
          },
        ],
      },
    });
    const repository = createSupabaseAdminInventoryRepository(client);
    const cursor = encodeAdminCursor({
      kind: "inventory-updated",
      value: "2026-07-09T12:00:00.000Z",
      id: "store:store_inventory_4",
    });

    const page = await repository.listInventory({
      scope: "store",
      cursor,
      limit: 1,
      timezone: "UTC",
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        type: "store",
        row: expect.objectContaining({ id: "store_inventory_3" }),
      }),
    ]);
    expect(decodeAdminCursor(page.page_info.next_cursor ?? "")).toEqual({
      kind: "inventory-updated",
      value: "2026-07-09T12:00:00.000Z",
      id: "store:store_inventory_3",
    });
    expect(client.dataQuery("store_inventory").operations).toEqual(
      expect.arrayContaining([
        operation(
          "or",
          "updated_at.lt.2026-07-09T12:00:00.000Z,and(updated_at.eq.2026-07-09T12:00:00.000Z,id.lt.store_inventory_4)",
        ),
        operation("limit", 2),
      ]),
    );
  });

  it("keeps the Central stream behind a Store cursor at the same timestamp", async () => {
    const timestamp = "2026-07-09T12:00:00.000Z";
    const client = new RecordingSupabaseAdminClient({
      central_inventory: {
        count: 1,
        rows: [centralInventoryRow("central_inventory_1", timestamp)],
      },
      store_inventory: {
        count: 1,
        rows: [storeInventoryRow("store_inventory_3", timestamp)],
      },
      products: { rows: [] },
      stores: { rows: [] },
    });
    const repository = createSupabaseAdminInventoryRepository(client);
    const cursor = encodeAdminCursor({
      kind: "inventory-updated",
      value: timestamp,
      id: "store:store_inventory_4",
    });

    const page = await repository.listInventory({
      cursor,
      limit: 1,
      timezone: "UTC",
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        type: "store",
        row: expect.objectContaining({ id: "store_inventory_3" }),
      }),
    ]);
    expect(decodeAdminCursor(page.page_info.next_cursor ?? "")).toEqual({
      kind: "inventory-updated",
      value: timestamp,
      id: "store:store_inventory_3",
    });
    expect(client.dataQuery("central_inventory").operations).toContainEqual(
      operation("lte", "updated_at", timestamp),
    );
    expect(client.dataQuery("store_inventory").operations).toContainEqual(
      operation(
        "or",
        `updated_at.lt.${timestamp},and(updated_at.eq.${timestamp},id.lt.store_inventory_4)`,
      ),
    );
  });

  it("advances ascending Pickup dates with a greater-than cursor", async () => {
    const client = new RecordingSupabaseAdminClient({
      store_pickup_dates: {
        count: 3,
        rows: [
          pickupDateRow("pickup_2", "2026-07-14"),
          pickupDateRow("pickup_3", "2026-07-15"),
        ],
      },
      stores: {
        rows: [
          {
            id: "store_san_jose",
            market_id: "market_us",
            slug: "san-jose",
            name: "San Jose POP MART",
          },
        ],
      },
    });
    const repository = createSupabaseAdminInventoryRepository(client);
    const cursor = encodeAdminCursor({
      kind: "pickup-date",
      value: "2026-07-13",
      id: "pickup_1",
    });

    const page = await repository.listPickupDates({
      cursor,
      limit: 1,
      timezone: "UTC",
    });

    expect(page.items.map((row) => row.id)).toEqual(["pickup_2"]);
    expect(client.dataQuery("store_pickup_dates").operations).toContainEqual(
      operation(
        "or",
        "pickup_date.gt.2026-07-13,and(pickup_date.eq.2026-07-13,id.gt.pickup_1)",
      ),
    );
  });

  it("applies genuine Webhook filters and returns an exact count envelope", async () => {
    const client = new RecordingSupabaseAdminClient({
      webhook_events: {
        count: 1,
        rows: [
          {
            id: "webhook_1",
            event_id: "WH-1",
            event_type: "CHECKOUT.ORDER.APPROVED",
            verification_status: "valid",
            linked_order_id: "order_1",
            linked_payment_session_id: "payment_1",
            processing_status: "processed",
            received_at: "2026-07-12T10:00:00.000Z",
            processed_at: "2026-07-12T10:00:01.000Z",
          },
        ],
      },
    });
    const repository = createSupabaseAdminWebhookRepository(client);

    const page = await repository.listWebhooks({
      eventId: "WH-1",
      eventType: "CHECKOUT.ORDER.APPROVED",
      verificationStatus: "valid",
      processingStatus: "processed",
      linkedState: "linked",
      receivedFrom: "2026-07-12T00:00:00.000Z",
      receivedTo: "2026-07-13T00:00:00.000Z",
      limit: 25,
      timezone: "UTC",
    });

    expect(page.page_info.total_count).toBe(1);
    expect(client.dataQuery("webhook_events").operations).toEqual(
      expect.arrayContaining([
        operation("ilike", "event_id", "%WH-1%"),
        operation("eq", "event_type", "CHECKOUT.ORDER.APPROVED"),
        operation("eq", "verification_status", "valid"),
        operation("eq", "processing_status", "processed"),
        operation(
          "or",
          "linked_order_id.not.is.null,linked_payment_session_id.not.is.null",
        ),
        operation("gte", "received_at", "2026-07-12T00:00:00.000Z"),
        operation("lte", "received_at", "2026-07-13T00:00:00.000Z"),
        operation("limit", 26),
      ]),
    );
  });

  it("filters Payment Diagnostics before joining canonical evidence", async () => {
    const client = new RecordingSupabaseAdminClient({
      payment_sessions: {
        count: 1,
        rows: [
          {
            id: "payment_1",
            order_id: "order_1",
            provider: "paypal",
            method: "paypal",
            status: "captured",
            attempt_number: 1,
            paypal_order_id: "PAYPAL_ORDER_1",
            paypal_capture_id: "PAYPAL_CAPTURE_1",
            paypal_invoice_id: "DO-1-01",
            paypal_request_id: "request_1",
            vault_requested: false,
            merchant_total_minor: 2633,
            provider_total_minor: 2633,
            amount_consistency_status: "matched",
            currency_code: "USD",
            created_at: "2026-07-12T09:00:00.000Z",
            updated_at: "2026-07-12T10:00:00.000Z",
          },
        ],
      },
      orders: { rows: [adminOrderRow("order_1", "2026-07-12T08:00:00.000Z")] },
      total_snapshots: { rows: [] },
      paypal_order_snapshots: { rows: [] },
      webhook_events: { rows: [] },
    });
    const repository = createSupabaseAdminPaymentDebugRepository(client);

    const page = await repository.listPaymentDebug({
      lookup: "PAYPAL_ORDER_1",
      method: "paypal",
      status: "captured",
      amountConsistency: "matched",
      updatedFrom: "2026-07-12T00:00:00.000Z",
      updatedTo: "2026-07-13T00:00:00.000Z",
      limit: 10,
      timezone: "UTC",
    });

    expect(page.items).toEqual([
      expect.objectContaining({
        session: expect.objectContaining({ id: "payment_1" }),
        order: expect.objectContaining({ id: "order_1" }),
      }),
    ]);
    expect(page.page_info.total_count).toBe(1);
    expect(client.dataQuery("payment_sessions").operations).toEqual(
      expect.arrayContaining([
        operation(
          "or",
          "id.ilike.%PAYPAL_ORDER_1%,paypal_order_id.ilike.%PAYPAL_ORDER_1%,paypal_capture_id.ilike.%PAYPAL_ORDER_1%,paypal_invoice_id.ilike.%PAYPAL_ORDER_1%,paypal_request_id.ilike.%PAYPAL_ORDER_1%",
        ),
        operation("eq", "method", "paypal"),
        operation("eq", "status", "captured"),
        operation("eq", "amount_consistency_status", "matched"),
        operation("gte", "updated_at", "2026-07-12T00:00:00.000Z"),
        operation("lte", "updated_at", "2026-07-13T00:00:00.000Z"),
        operation("limit", 11),
      ]),
    );
  });

  it("maps allowlisted runtime entries to the existing persistence schema", async () => {
    const client = new RecordingSupabaseAdminClient({
      runtime_debug_logs: { rows: [] },
    });
    const repository = createSupabaseAdminRuntimeDebugLogRepository(client);
    const context = {
      source: "payment_amount_guard",
      event: "paypal_capture_prepared",
      debug_id: "dbg_capture_1",
      profile_id: "profile-uuid-1",
      order_id: "order-uuid-1",
      order_number: "DO-20260713-000001",
      payment_session_id: "payment-session-uuid-1",
      paypal_order_id: "PAYPAL-ORDER-1",
      amount_guard_status: "matched",
      amount_total_minor: 4337,
    } as const;

    await repository.insertRuntimeDebugLog({
      timestamp: "2026-07-13T03:00:00.000Z",
      level: "info",
      message: "paypal_capture_prepared",
      context,
    });
    await repository.deleteRuntimeDebugLogsBefore("2026-07-06T03:00:00.000Z");

    const runtimeQueries = client.queries.filter(
      (query) => query.table === "runtime_debug_logs",
    );
    expect(runtimeQueries).toHaveLength(2);
    expect(runtimeQueries[0]?.operations).toEqual([
      operation("insert", {
        profile_id: "profile-uuid-1",
        order_id: "order-uuid-1",
        payment_session_id: "payment-session-uuid-1",
        level: "info",
        category: "payment_amount_guard",
        message: "paypal_capture_prepared",
        context_json: context,
        created_at: "2026-07-13T03:00:00.000Z",
      }),
    ]);
    expect(runtimeQueries[1]?.operations).toEqual([
      operation("delete"),
      operation("lt", "created_at", "2026-07-06T03:00:00.000Z"),
    ]);
  });

  it("applies runtime lookup, event, date boundaries, and cursor in Supabase", async () => {
    const client = new RecordingSupabaseAdminClient({
      runtime_debug_logs: {
        count: 5,
        rows: [
          runtimeDebugLogRow("runtime-log-3", "2026-07-13T02:30:00.000Z"),
          runtimeDebugLogRow("runtime-log-2", "2026-07-13T02:00:00.000Z"),
          runtimeDebugLogRow("runtime-log-1", "2026-07-13T01:30:00.000Z"),
        ],
      },
    });
    const repository = createSupabaseAdminRuntimeDebugLogRepository(client);
    const cursor = encodeAdminCursor({
      kind: "runtime-timestamp",
      value: "2026-07-13T03:00:00.000Z",
      id: "runtime-log-cursor",
    });

    const page = await repository.listRuntimeDebugLogs({
      lookup: "dbg_capture_1",
      level: "warn",
      category: "payment_amount_guard",
      event: "paypal_capture_prepared",
      loggedFrom: "2026-07-06T03:00:00.000Z",
      loggedTo: "2026-07-13T03:00:00.000Z",
      cursor,
      limit: 2,
      timezone: "Asia/Shanghai",
    });

    expect(page.items.map((entry) => entry.id)).toEqual([
      "runtime-log-3",
      "runtime-log-2",
    ]);
    expect(page.page_info).toEqual({
      total_count: 5,
      next_cursor: expect.any(String),
      timezone: "Asia/Shanghai",
    });
    expect(decodeAdminCursor(page.page_info.next_cursor ?? "")).toEqual({
      kind: "runtime-timestamp",
      value: "2026-07-13T02:00:00.000Z",
      id: "runtime-log-2",
    });
    const expectedLookupPattern = '"%dbg\\\\_capture\\\\_1%"';
    expect(client.dataQuery("runtime_debug_logs").operations).toEqual(
      expect.arrayContaining([
        operation(
          "or",
          [
            `message.ilike.${expectedLookupPattern}`,
            ...runtimeDebugLogLookupContextKeys.map(
              (field) =>
                `context_json->>${field}.ilike.${expectedLookupPattern}`,
            ),
          ].join(","),
        ),
        operation("eq", "level", "warn"),
        operation("eq", "category", "payment_amount_guard"),
        operation("eq", "context_json->>event", "paypal_capture_prepared"),
        operation("gte", "created_at", "2026-07-06T03:00:00.000Z"),
        operation("lte", "created_at", "2026-07-13T03:00:00.000Z"),
        operation(
          "or",
          "created_at.lt.2026-07-13T03:00:00.000Z,and(created_at.eq.2026-07-13T03:00:00.000Z,id.lt.runtime-log-cursor)",
        ),
        operation("order", "created_at", { ascending: false }),
        operation("order", "id", { ascending: false }),
        operation("limit", 3),
      ]),
    );
  });

  it("pages and counts only the database-constrained approved runtime population", async () => {
    const validNewest = runtimeDebugLogRow(
      "runtime-log-valid-3",
      "2026-07-13T03:00:00.000Z",
    );
    const validMiddle = runtimeDebugLogRow(
      "runtime-log-valid-2",
      "2026-07-13T02:00:00.000Z",
    );
    const validOldest = runtimeDebugLogRow(
      "runtime-log-valid-1",
      "2026-07-13T01:00:00.000Z",
    );
    const disallowedNewer = {
      ...runtimeDebugLogRow(
        "runtime-log-disallowed-2",
        "2026-07-13T02:30:00.000Z",
      ),
      category: "runtime",
      message: "server_started",
      context_json: { event: "server_started", source: "runtime" },
    };
    const disallowedOlder = {
      ...runtimeDebugLogRow(
        "runtime-log-disallowed-1",
        "2026-07-13T01:30:00.000Z",
      ),
      category: "webhook",
      message: "paypal_webhook_failed",
      context_json: {
        event: "paypal_webhook_failed",
        source: "webhook",
      },
    };
    const client = new RecordingSupabaseAdminClient({
      runtime_debug_logs: {
        count: 5,
        rows: [
          validNewest,
          disallowedNewer,
          validMiddle,
          disallowedOlder,
          validOldest,
        ],
        safeCount: 3,
        safeRows: [validNewest, validMiddle, validOldest],
      },
    });
    const repository = createSupabaseAdminRuntimeDebugLogRepository(client);

    const page = await repository.listRuntimeDebugLogs({
      limit: 2,
      timezone: "UTC",
    });

    expect(page.items.map((entry) => entry.id)).toEqual([
      "runtime-log-valid-3",
      "runtime-log-valid-2",
    ]);
    expect(page.page_info).toEqual({
      total_count: 3,
      next_cursor: expect.any(String),
      timezone: "UTC",
    });
    expect(decodeAdminCursor(page.page_info.next_cursor ?? "")).toEqual({
      kind: "runtime-timestamp",
      value: "2026-07-13T02:00:00.000Z",
      id: "runtime-log-valid-2",
    });

    const runtimeQueries = client.queries.filter(
      (query) => query.table === "runtime_debug_logs",
    );
    const approvedPopulationFilters = runtimeQueries.map((query) =>
      query.operations.find(
        ({ method, args }) =>
          method === "or" &&
          typeof args[0] === "string" &&
          args[0].includes("context_json->>source.eq.") &&
          args[0].includes("context_json->>event.eq."),
      ),
    );
    expect(approvedPopulationFilters).toHaveLength(2);
    expect(approvedPopulationFilters.every(Boolean)).toBe(true);
    expect(approvedPopulationFilters[0]).toEqual(
      approvedPopulationFilters[1],
    );
  });

  it("starts best-effort retention cleanup no more than once per 24 hours", async () => {
    let now = new Date("2026-07-13T03:00:00.000Z");
    const cleanupCutoffs: string[] = [];
    const store = createInMemoryRuntimeDebugLogStore({
      clock: () => now,
      downstreamSink: () => undefined,
      persistenceRepository: {
        async insertRuntimeDebugLog() {},
        async deleteRuntimeDebugLogsBefore(cutoff) {
          cleanupCutoffs.push(cutoff);
        },
      },
    });
    const logApprovedEvent = () =>
      store.logger.warn("paypal_capture_amount_mismatch", {
        debug_id: "dbg_capture_1",
        mismatch_count: 1,
        paypal_order_id: "PAYPAL-ORDER-1",
      });

    logApprovedEvent();
    logApprovedEvent();
    await vi.waitFor(() => expect(cleanupCutoffs).toHaveLength(1));
    expect(cleanupCutoffs).toEqual(["2026-07-06T03:00:00.000Z"]);

    now = new Date("2026-07-14T02:59:59.999Z");
    logApprovedEvent();
    await Promise.resolve();
    expect(cleanupCutoffs).toHaveLength(1);

    now = new Date("2026-07-14T03:00:00.000Z");
    logApprovedEvent();
    await vi.waitFor(() => expect(cleanupCutoffs).toHaveLength(2));
    expect(cleanupCutoffs[1]).toBe("2026-07-07T03:00:00.000Z");
  });

  it("uses the bounded allowlisted buffer when persistent runtime reads fail", async () => {
    let fallbackReads = 0;
    const repository = createAdminRuntimeDebugLogRepositoryWithFallback({
      primary: {
        async listRuntimeDebugLogs() {
          throw new Error("persistent runtime logs unavailable");
        },
      },
      fallback: {
        async listRuntimeDebugLogs() {
          fallbackReads += 1;
          return [
            {
              id: "runtime-log-2",
              timestamp: "2026-07-13T02:00:00.000Z",
              level: "warn" as const,
              message: "paypal_capture_prepared",
              context: {
                source: "payment_amount_guard",
                event: "paypal_capture_prepared",
                debug_id: "dbg_capture_2",
                amount_guard_status: "mismatch",
              },
            },
            {
              id: "runtime-log-1",
              timestamp: "2026-07-13T01:00:00.000Z",
              level: "info" as const,
              message: "paypal_capture_prepared",
              context: {
                source: "payment_amount_guard",
                event: "paypal_capture_prepared",
                debug_id: "dbg_capture_1",
                amount_guard_status: "matched",
              },
            },
          ];
        },
      },
    });

    const page = await repository.listRuntimeDebugLogs({
      category: "payment_amount_guard",
      event: "paypal_capture_prepared",
      loggedFrom: "2026-07-06T03:00:00.000Z",
      loggedTo: "2026-07-13T03:00:00.000Z",
      limit: 1,
      timezone: "UTC",
    });

    expect(fallbackReads).toBe(1);
    expect(page.items.map((entry) => entry.id)).toEqual(["runtime-log-2"]);
    expect(page.page_info).toEqual({
      total_count: 2,
      next_cursor: expect.any(String),
      timezone: "UTC",
    });
  });

  it("keeps a failed insert visible when later persistent reads succeed", async () => {
    let persistenceDegraded = false;
    let primaryReads = 0;
    const store = createInMemoryRuntimeDebugLogStore({
      downstreamSink: () => undefined,
      onPersistenceInsertFailure() {
        persistenceDegraded = true;
      },
      persistenceRepository: {
        async insertRuntimeDebugLog() {
          throw new Error("runtime insert unavailable");
        },
        async deleteRuntimeDebugLogsBefore() {},
      },
    });
    const repository = createAdminRuntimeDebugLogRepositoryWithFallback({
      primary: {
        async listRuntimeDebugLogs(query) {
          primaryReads += 1;
          return {
            items: [],
            page_info: {
              total_count: 0,
              next_cursor: null,
              timezone: query?.timezone ?? "UTC",
            },
          };
        },
      },
      fallback: store,
      isPersistentReadDegraded: () => persistenceDegraded,
    });

    store.logger.warn("paypal_capture_amount_mismatch", {
      debug_id: "dbg_failed_insert",
      mismatch_count: 1,
      paypal_order_id: "PAYPAL-ORDER-FAILED-INSERT",
    });
    await vi.waitFor(() => expect(persistenceDegraded).toBe(true));

    const query = {
      lookup: "dbg_failed_insert",
      limit: 10,
      timezone: "UTC",
    } as const;
    const firstPage = await repository.listRuntimeDebugLogs(query);
    const secondPage = await repository.listRuntimeDebugLogs(query);

    expect(primaryReads).toBe(0);
    expect(firstPage.items).toEqual([
      expect.objectContaining({
        message: "paypal_capture_amount_mismatch",
        context: expect.objectContaining({ debug_id: "dbg_failed_insert" }),
      }),
    ]);
    expect(secondPage.items).toEqual(firstPage.items);
  });

  it("uses one correlation lookup field set for persistent and fallback reads", async () => {
    const lookupFields = [
      "debug_id",
      "order_id",
      "order_number",
      "payment_session_id",
      "linked_order_id",
      "linked_payment_session_id",
      "paypal_order_id",
      "paypal_capture_id",
      "webhook_event_id",
      "event_id",
      "event_type",
      "profile_id",
      "market_id",
      "market",
      "method",
      "path",
      "route",
      "request_path",
      "status",
      "status_code",
      "duration_ms",
    ] as const;
    const persistentClient = new RecordingSupabaseAdminClient({
      runtime_debug_logs: { count: 0, rows: [] },
    });
    const persistentRepository =
      createSupabaseAdminRuntimeDebugLogRepository(persistentClient);
    await persistentRepository.listRuntimeDebugLogs({
      lookup: "needle",
      limit: 10,
      timezone: "UTC",
    });
    const persistentLookupFilter = persistentClient
      .dataQuery("runtime_debug_logs")
      .operations.find(
        ({ method, args }) =>
          method === "or" &&
          typeof args[0] === "string" &&
          args[0].startsWith("message.ilike."),
      );
    expect(persistentLookupFilter).toEqual(
      operation(
        "or",
        [
          "message.ilike.%needle%",
          ...lookupFields.map(
            (field) => `context_json->>${field}.ilike.%needle%`,
          ),
        ].join(","),
      ),
    );

    const fallbackEntries = lookupFields.map((field, index) => {
      const value =
        field === "status_code"
          ? 207
          : field === "duration_ms"
            ? 1_234
            : `needle-${index}-value`;
      return {
        id: `runtime-lookup-${index}`,
        timestamp: `2026-07-13T${String(20 - index).padStart(2, "0")}:00:00.000Z`,
        level: "info" as const,
        message: "paypal_webhook_processing_outcome",
        context: {
          source: "webhook",
          event: "paypal_webhook_processing_outcome",
          [field]: value,
        },
      };
    });
    const fallbackOnlyEntry = {
      id: "runtime-fallback-extra",
      timestamp: "2026-07-12T00:00:00.000Z",
      level: "info" as const,
      message: "paypal_webhook_processing_outcome",
      context: {
        source: "webhook",
        event: "paypal_webhook_processing_outcome",
        processing_status: "fallback-only-needle",
      },
    };
    const fallbackRepository =
      createAdminRuntimeDebugLogRepositoryWithFallback({
        primary: {
          async listRuntimeDebugLogs() {
            throw new Error("force bounded fallback");
          },
        },
        fallback: {
          async listRuntimeDebugLogs() {
            return [...fallbackEntries, fallbackOnlyEntry];
          },
        },
      });

    for (const [index, field] of lookupFields.entries()) {
      const lookup =
        field === "status_code"
          ? "207"
          : field === "duration_ms"
            ? "1234"
            : `needle-${index}-value`;
      const page = await fallbackRepository.listRuntimeDebugLogs({
        lookup,
        limit: 10,
        timezone: "UTC",
      });
      expect(page.items.map((entry) => entry.id), field).toEqual([
        `runtime-lookup-${index}`,
      ]);
    }

    const excludedPage = await fallbackRepository.listRuntimeDebugLogs({
      lookup: "fallback-only-needle",
      limit: 10,
      timezone: "UTC",
    });
    expect(excludedPage.items).toEqual([]);
  });

  it("treats runtime wildcard lookup as a literal case-insensitive substring", async () => {
    const lookup = 'dbg_id%100,("x\\y)';
    const persistentClient = new RecordingSupabaseAdminClient({
      runtime_debug_logs: { count: 0, rows: [] },
    });
    const persistentRepository =
      createSupabaseAdminRuntimeDebugLogRepository(persistentClient);

    await persistentRepository.listRuntimeDebugLogs({
      lookup,
      limit: 10,
      timezone: "UTC",
    });

    const persistentLookupFilter = persistentClient
      .dataQuery("runtime_debug_logs")
      .operations.find(
        ({ method, args }) =>
          method === "or" &&
          typeof args[0] === "string" &&
          args[0].startsWith("message.ilike."),
      );
    const expectedPattern = '"%dbg\\\\_id\\\\%100,(\\"x\\\\\\\\y)%"';
    expect(persistentLookupFilter).toEqual(
      operation(
        "or",
        [
          `message.ilike.${expectedPattern}`,
          ...runtimeDebugLogLookupContextKeys.map(
            (field) => `context_json->>${field}.ilike.${expectedPattern}`,
          ),
        ].join(","),
      ),
    );

    const fallbackRepository =
      createAdminRuntimeDebugLogRepositoryWithFallback({
        primary: {
          async listRuntimeDebugLogs() {
            throw new Error("force bounded fallback");
          },
        },
        fallback: {
          async listRuntimeDebugLogs() {
            return [
              runtimeDebugLogEntry(
                "runtime-literal-match",
                `prefix-${lookup.toUpperCase()}-suffix`,
              ),
              runtimeDebugLogEntry(
                "runtime-underscore-wildcard-only",
                lookup.replace("_", "X"),
              ),
              runtimeDebugLogEntry(
                "runtime-percent-wildcard-only",
                lookup.replace("%", "ANY"),
              ),
            ];
          },
        },
      });

    const page = await fallbackRepository.listRuntimeDebugLogs({
      lookup,
      limit: 10,
      timezone: "UTC",
    });

    expect(page.items.map((entry) => entry.id)).toEqual([
      "runtime-literal-match",
    ]);
  });
});

function runtimeDebugLogEntry(id: string, debugId: string) {
  return {
    id,
    timestamp: "2026-07-13T03:00:00.000Z",
    level: "info" as const,
    message: "paypal_webhook_processing_outcome",
    context: {
      source: "webhook",
      event: "paypal_webhook_processing_outcome",
      debug_id: debugId,
    },
  };
}

interface FakeTableResult {
  readonly rows?: readonly unknown[];
  readonly count?: number;
  readonly safeRows?: readonly unknown[];
  readonly safeCount?: number;
}

interface RecordedRpcCall {
  readonly functionName: string;
  readonly args: Readonly<Record<string, unknown>>;
}

interface RecordedOperation {
  readonly method: string;
  readonly args: readonly unknown[];
}

class RecordingSupabaseAdminClient implements SupabaseAdminClient {
  readonly queries: RecordingSupabaseAdminQuery[] = [];
  readonly rpcCalls: RecordedRpcCall[] = [];

  constructor(
    private readonly results: Readonly<Record<string, FakeTableResult>>,
    private readonly rpcResults: Readonly<Record<string, FakeTableResult>> = {},
  ) {}

  from(table: string) {
    const query = new RecordingSupabaseAdminQuery(
      table,
      this.results[table] ?? {},
    );
    this.queries.push(query);
    return query;
  }

  rpc(functionName: string, args: Readonly<Record<string, unknown>>) {
    this.rpcCalls.push({ functionName, args });
    const query = new RecordingSupabaseAdminQuery(
      `rpc:${functionName}`,
      this.rpcResults[functionName] ?? {},
    );
    this.queries.push(query);
    return query;
  }

  dataQuery(table: string): RecordingSupabaseAdminQuery {
    const query = this.queries.find(
      (candidate) => candidate.table === table && !candidate.isCountQuery,
    );
    if (!query) {
      throw new Error(`Missing data query for ${table}`);
    }
    return query;
  }

  rpcQuery(functionName: string): RecordingSupabaseAdminQuery {
    const query = this.queries.find(
      (candidate) => candidate.table === `rpc:${functionName}`,
    );
    if (!query) {
      throw new Error(`Missing RPC query for ${functionName}`);
    }
    return query;
  }
}

class RecordingSupabaseAdminQuery implements PromiseLike<{
  readonly data: unknown;
  readonly error: null;
  readonly count?: number;
}> {
  readonly operations: RecordedOperation[] = [];
  isCountQuery = false;

  constructor(
    readonly table: string,
    private readonly result: FakeTableResult,
  ) {}

  delete() {
    return this.record("delete");
  }

  eq(column: string, value: unknown) {
    return this.record("eq", column, value);
  }

  gte(column: string, value: unknown) {
    return this.record("gte", column, value);
  }

  gt(column: string, value: unknown) {
    return this.record("gt", column, value);
  }

  ilike(column: string, value: string) {
    return this.record("ilike", column, value);
  }

  in(column: string, values: readonly unknown[]) {
    return this.record("in", column, values);
  }

  insert(value: unknown) {
    return this.record("insert", value);
  }

  limit(count: number) {
    return this.record("limit", count);
  }

  lt(column: string, value: unknown) {
    return this.record("lt", column, value);
  }

  lte(column: string, value: unknown) {
    return this.record("lte", column, value);
  }

  maybeSingle() {
    this.record("maybeSingle");
    return this;
  }

  or(filters: string) {
    return this.record("or", filters);
  }

  order(column: string, options?: unknown) {
    return this.record("order", column, options);
  }

  range(from: number, to: number) {
    return this.record("range", from, to);
  }

  select(columns: string, options?: { readonly head?: boolean }) {
    if (options?.head) {
      this.isCountQuery = true;
    }
    return this.record("select", columns, options);
  }

  single() {
    this.record("single");
    return this;
  }

  update(values: unknown) {
    return this.record("update", values);
  }

  then<
    TResult1 = {
      readonly data: unknown;
      readonly error: null;
      readonly count?: number;
    },
    TResult2 = never,
  >(
    onfulfilled?:
      | ((value: {
          readonly data: unknown;
          readonly error: null;
          readonly count?: number;
        }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const hasApprovedRuntimePopulationFilter =
      this.table === "runtime_debug_logs" &&
      this.operations.some(
        ({ method, args }) =>
          method === "or" &&
          typeof args[0] === "string" &&
          args[0].includes("context_json->>source.eq.") &&
          args[0].includes("context_json->>event.eq."),
      );
    const limit = [...this.operations]
      .reverse()
      .find(({ method }) => method === "limit")?.args[0];
    const rows = [
      ...(hasApprovedRuntimePopulationFilter && this.result.safeRows
        ? this.result.safeRows
        : (this.result.rows ?? [])),
    ].slice(
      0,
      typeof limit === "number" ? limit : undefined,
    );
    const isSingleRow = this.operations.some(
      ({ method }) => method === "single" || method === "maybeSingle",
    );
    const response = this.isCountQuery
      ? {
          data: null,
          error: null as const,
          count:
            hasApprovedRuntimePopulationFilter &&
            this.result.safeCount !== undefined
              ? this.result.safeCount
              : (this.result.count ?? 0),
        }
      : {
          data: isSingleRow ? (rows[0] ?? null) : rows,
          error: null as const,
        };
    return Promise.resolve(response).then(onfulfilled, onrejected);
  }

  private record(method: string, ...args: readonly unknown[]) {
    this.operations.push({ method, args });
    return this;
  }
}

function operation(
  method: string,
  ...args: readonly unknown[]
): RecordedOperation {
  return { method, args };
}

function adminOrderRow(id: string, createdAt: string): AdminOrderRow {
  return {
    id,
    profile_id: "profile_popmart",
    market_id: "market_us",
    order_number: `DO-${id}`,
    fulfillment_mode: "delivery",
    status: "processing",
    payment_status: "captured",
    currency_code: "USD",
    subtotal_minor: 1969,
    discount_minor: 0,
    tax_minor: 165,
    shipping_minor: 499,
    total_minor: 2633,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function storeInventoryRow(id: string, updatedAt: string) {
  return {
    id,
    profile_id: "profile_popmart",
    market_id: "market_us",
    store_id: "store_san_jose",
    product_id: "product_molly",
    available_quantity: 3,
    updated_at: updatedAt,
  };
}

function centralInventoryRow(id: string, updatedAt: string) {
  return {
    id,
    profile_id: "profile_popmart",
    market_id: "market_us",
    product_id: "product_molly",
    available_quantity: 12,
    updated_at: updatedAt,
  };
}

function pickupDateRow(id: string, pickupDate: string) {
  return {
    id,
    market_id: "market_us",
    store_id: "store_san_jose",
    pickup_date: pickupDate,
    capacity: 10,
    is_available: true,
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z",
  };
}

function runtimeDebugLogRow(id: string, createdAt: string) {
  return {
    id,
    profile_id: "profile-uuid-1",
    order_id: "order-uuid-1",
    payment_session_id: "payment-session-uuid-1",
    level: "warn",
    category: "payment_amount_guard",
    message: "paypal_capture_prepared",
    context_json: {
      source: "payment_amount_guard",
      event: "paypal_capture_prepared",
      debug_id: "dbg_capture_1",
      order_number: "DO-20260713-000001",
      paypal_order_id: "PAYPAL-ORDER-1",
      amount_guard_status: "mismatch",
    },
    created_at: createdAt,
  };
}

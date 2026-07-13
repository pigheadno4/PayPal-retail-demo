import { describe, expect, it } from "vitest";

import {
  createSupabaseAdminInventoryRepository,
  createSupabaseAdminOrderRepository,
  createSupabaseAdminPaymentDebugRepository,
  createSupabaseAdminWebhookRepository,
  type AdminOrderRow,
  type SupabaseAdminClient,
} from "../src/repositories/adminRepository.js";
import {
  decodeAdminCursor,
  encodeAdminCursor,
} from "../src/routes/adminQuery.js";

describe("Supabase Admin repository filtering and pagination", () => {
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
});

interface FakeTableResult {
  readonly rows?: readonly unknown[];
  readonly count?: number;
}

interface RecordedOperation {
  readonly method: string;
  readonly args: readonly unknown[];
}

class RecordingSupabaseAdminClient implements SupabaseAdminClient {
  readonly queries: RecordingSupabaseAdminQuery[] = [];

  constructor(
    private readonly results: Readonly<Record<string, FakeTableResult>>,
  ) {}

  from(table: string) {
    const query = new RecordingSupabaseAdminQuery(
      table,
      this.results[table] ?? {},
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
    const limit = [...this.operations]
      .reverse()
      .find(({ method }) => method === "limit")?.args[0];
    const rows = [...(this.result.rows ?? [])].slice(
      0,
      typeof limit === "number" ? limit : undefined,
    );
    const response = this.isCountQuery
      ? { data: null, error: null as const, count: this.result.count ?? 0 }
      : { data: rows, error: null as const };
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

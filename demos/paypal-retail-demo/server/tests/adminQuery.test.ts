import { describe, expect, it } from "vitest";

import {
  encodeAdminCursor,
  parseAdminInventoryQuery,
  parseAdminLifecycleQuery,
  parseAdminOrdersQuery,
  parseAdminPaymentDiagnosticsQuery,
  parseAdminPickupDatesQuery,
  parseAdminRuntimeLogsQuery,
  parseAdminWebhooksQuery,
} from "../src/routes/adminQuery.js";

describe("Admin query parsers", () => {
  it("normalizes allowed Orders filters, ISO boundaries, timezone, and cursor", () => {
    const cursor = encodeAdminCursor({
      kind: "orders-created",
      value: "2026-07-12T10:00:00.000Z",
      id: "order_1",
    });

    expect(
      parseAdminOrdersQuery({
        order_number: " DO-20260712 ",
        status: "processing",
        fulfillment: "delivery",
        payment_status: "captured",
        created_from: "2026-07-01T00:00:00+08:00",
        created_to: "2026-07-12T23:59:59.999Z",
        timezone: "Asia/Shanghai",
        cursor,
        limit: "40",
      }),
    ).toEqual({
      ok: true,
      query: {
        orderNumber: "DO-20260712",
        status: "processing",
        fulfillment: "delivery",
        paymentStatus: "captured",
        createdFrom: "2026-06-30T16:00:00.000Z",
        createdTo: "2026-07-12T23:59:59.999Z",
        timezone: "Asia/Shanghai",
        cursor,
        limit: 40,
      },
    });
  });

  it("clamps limits to 1..100 and echoes UTC by default", () => {
    const minimum = parseAdminOrdersQuery({ limit: "0" });
    const maximum = parseAdminOrdersQuery({ limit: "999" });

    expect(minimum).toEqual({
      ok: true,
      query: {
        timezone: "UTC",
        limit: 1,
      },
    });
    expect(maximum).toEqual({
      ok: true,
      query: {
        timezone: "UTC",
        limit: 100,
      },
    });
  });

  it("rejects invalid allowed values, non-ISO boundaries, and malformed cursors", () => {
    expect(
      parseAdminOrdersQuery({
        status: "complete",
        fulfillment: "ship",
        payment_status: "settled",
        created_from: "2026-07-01",
        timezone: "Mars/Olympus",
        cursor: "not-a-cursor",
        limit: "many",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: {
          invalid_fields: [
            "status",
            "fulfillment",
            "payment_status",
            "created_from",
            "timezone",
            "cursor",
            "limit",
          ],
        },
      },
    });
  });

  it("rejects reversed time boundaries", () => {
    expect(
      parseAdminOrdersQuery({
        created_from: "2026-07-12T10:00:00.000Z",
        created_to: "2026-07-12T09:00:00.000Z",
      }),
    ).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: {
          invalid_fields: ["created_from", "created_to"],
        },
      },
    });
  });

  it("rejects structurally valid cursors with unsafe sort values or IDs", () => {
    const cursor = encodeAdminCursor({
      kind: "orders-created",
      value: "not-an-iso-timestamp",
      id: "order_1),status.eq.paid",
    });

    expect(parseAdminOrdersQuery({ cursor })).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: {
          invalid_fields: ["cursor"],
        },
      },
    });
  });

  it("rejects non-canonical and cross-resource cursors", () => {
    const ordersCursor = encodeAdminCursor({
      kind: "orders-created",
      value: "2026-07-12T10:00:00.000Z",
      id: "order_1",
    });

    expect(parseAdminOrdersQuery({ cursor: `${ordersCursor}!!!` })).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: { invalid_fields: ["cursor"] },
      },
    });
    expect(parseAdminLifecycleQuery({ cursor: ordersCursor })).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: { invalid_fields: ["cursor"] },
      },
    });

    const inventoryCursor = encodeAdminCursor({
      kind: "inventory-updated",
      value: "2026-07-14T10:00:00.000Z",
      id: "store:store_inventory_10",
    });
    const offsetInventoryCursor = encodeAdminCursor({
      kind: "inventory-updated",
      value: "offset:10",
      id: "inventory",
    });
    const pickupCursor = encodeAdminCursor({
      kind: "pickup-date",
      value: "2026-07-14",
      id: "pickup_1",
    });
    const pickupTimestampCursor = encodeAdminCursor({
      kind: "pickup-date",
      value: "2026-07-14T00:00:00.000Z",
      id: "pickup_1",
    });
    const ordersDateCursor = encodeAdminCursor({
      kind: "orders-created",
      value: "2026-07-14",
      id: "order_1",
    });
    expect(parseAdminPickupDatesQuery({ cursor: inventoryCursor }).ok).toBe(
      false,
    );
    expect(
      parseAdminPickupDatesQuery({ cursor: pickupTimestampCursor }).ok,
    ).toBe(false);
    expect(parseAdminInventoryQuery({ cursor: pickupCursor }).ok).toBe(false);
    expect(parseAdminInventoryQuery({ cursor: offsetInventoryCursor }).ok).toBe(
      false,
    );
    expect(parseAdminOrdersQuery({ cursor: ordersDateCursor }).ok).toBe(false);
  });

  it("normalizes Lifecycle, Inventory, and Payment Diagnostics filters", () => {
    expect(
      parseAdminLifecycleQuery({
        order_number: "DO-42",
        fulfillment: "pickup",
        status: "preparing_pickup",
        next_action: "ready_for_pickup",
        actionable: "true",
        updated_from: "2026-07-12T00:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      query: {
        orderNumber: "DO-42",
        fulfillment: "pickup",
        status: "preparing_pickup",
        nextAction: "ready_for_pickup",
        actionableOnly: true,
        updatedFrom: "2026-07-12T00:00:00.000Z",
        timezone: "UTC",
        limit: 25,
      },
    });

    expect(
      parseAdminInventoryQuery({
        q: " MOLLY ",
        scope: "store",
        store_id: "store_san_jose",
        stock_condition: "low_stock",
        availability: "available",
        changed_to: "2026-07-12T23:59:59.999Z",
      }),
    ).toEqual({
      ok: true,
      query: {
        search: "MOLLY",
        scope: "store",
        storeId: "store_san_jose",
        stockCondition: "low_stock",
        availability: "available",
        changedTo: "2026-07-12T23:59:59.999Z",
        timezone: "UTC",
        limit: 25,
      },
    });

    expect(
      parseAdminPaymentDiagnosticsQuery({
        lookup: "PAYPAL-ORDER-1",
        method: "paypal",
        status: "captured",
        amount_consistency: "matched",
        updated_from: "2026-07-12T00:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      query: {
        lookup: "PAYPAL-ORDER-1",
        method: "paypal",
        status: "captured",
        amountConsistency: "matched",
        updatedFrom: "2026-07-12T00:00:00.000Z",
        timezone: "UTC",
        limit: 25,
      },
    });
  });

  it("defaults Webhooks and Runtime Logs to the last 24 hours with explicit timezone echo", () => {
    const now = new Date("2026-07-13T12:00:00.000Z");

    expect(
      parseAdminWebhooksQuery(
        {
          event_id: "WH-1",
          event_type: "CHECKOUT.ORDER.APPROVED",
          verification_status: "valid",
          processing_status: "processed",
          linked_state: "linked",
          timezone: "Asia/Shanghai",
        },
        { now },
      ),
    ).toEqual({
      ok: true,
      query: {
        eventId: "WH-1",
        eventType: "CHECKOUT.ORDER.APPROVED",
        verificationStatus: "valid",
        processingStatus: "processed",
        linkedState: "linked",
        receivedFrom: "2026-07-12T12:00:00.000Z",
        receivedTo: "2026-07-13T12:00:00.000Z",
        timezone: "Asia/Shanghai",
        limit: 25,
      },
    });

    expect(
      parseAdminRuntimeLogsQuery(
        {
          lookup: "dbg_123",
          level: "error",
          category: "paypal",
          event: "create_order_failed",
          timezone: "UTC",
        },
        { now },
      ),
    ).toEqual({
      ok: true,
      query: {
        lookup: "dbg_123",
        level: "error",
        category: "paypal",
        event: "create_order_failed",
        loggedFrom: "2026-07-12T12:00:00.000Z",
        loggedTo: "2026-07-13T12:00:00.000Z",
        timezone: "UTC",
        limit: 25,
      },
    });
  });

  it("rejects the PostgREST wildcard alias only for Runtime Logs lookup", () => {
    expect(parseAdminRuntimeLogsQuery({ lookup: "dbg_*_1" })).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_FILTERS",
        message: "One or more Admin filters are invalid.",
        details: {
          invalid_fields: ["lookup"],
        },
      },
    });
    expect(parseAdminPaymentDiagnosticsQuery({ lookup: "dbg_*_1" })).toEqual({
      ok: true,
      query: {
        lookup: "dbg_*_1",
        timezone: "UTC",
        limit: 25,
      },
    });
  });
});

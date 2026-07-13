import { describe, expect, it } from "vitest";

import { buildAdminQuery } from "./adminQuery";

describe("Admin URL query builder", () => {
  it("maps Orders URL parameters one-to-one to the backend and drops unrelated keys", () => {
    expect(
      buildAdminQuery(
        {
          pathname: "/admin/orders",
          search:
            "?order_number=DO-42&status=processing&fulfillment=delivery&payment_status=captured&created_from=2026-07-01T00%3A00%3A00.000Z&created_to=2026-07-12T00%3A00%3A00.000Z&timezone=Asia%2FShanghai&cursor=cursor-1&limit=40&debug_id=ignored",
        },
        "orders",
      ),
    ).toEqual({
      requestPaths: [
        "/api/admin/orders?order_number=DO-42&status=processing&fulfillment=delivery&payment_status=captured&created_from=2026-07-01T00%3A00%3A00.000Z&created_to=2026-07-12T00%3A00%3A00.000Z&timezone=Asia%2FShanghai&cursor=cursor-1&limit=40",
      ],
      clearPath: "/admin/orders",
      activeParameters: [
        ["order_number", "DO-42"],
        ["status", "processing"],
        ["fulfillment", "delivery"],
        ["payment_status", "captured"],
        ["created_from", "2026-07-01T00:00:00.000Z"],
        ["created_to", "2026-07-12T00:00:00.000Z"],
        ["timezone", "Asia/Shanghai"],
      ],
    });
  });

  it("builds distinct Lifecycle, Inventory, Webhooks, and Diagnostics requests", () => {
    expect(
      buildAdminQuery(
        {
          pathname: "/admin/lifecycle",
          search: "?next_action=shipped&actionable=true&updated_from=from",
        },
        "lifecycle",
      ),
    ).toEqual({
      requestPaths: [
        "/api/admin/lifecycle?next_action=shipped&actionable=true&updated_from=from",
      ],
      clearPath: "/admin/lifecycle",
      activeParameters: [
        ["next_action", "shipped"],
        ["actionable", "true"],
        ["updated_from", "from"],
      ],
    });

    expect(
      buildAdminQuery(
        {
          pathname: "/admin/inventory",
          search:
            "?q=MOLLY&scope=store&stock_condition=low_stock&availability=available&stock_cursor=stock-cursor&pickup_cursor=pickup-cursor",
        },
        "inventory",
      ).requestPaths,
    ).toEqual([
      "/api/admin/inventory?q=MOLLY&scope=store&stock_condition=low_stock&availability=available&cursor=stock-cursor",
      "/api/admin/pickup-dates?availability=available&cursor=pickup-cursor",
    ]);

    expect(
      buildAdminQuery(
        {
          pathname: "/admin/webhooks",
          search:
            "?event_type=CHECKOUT.ORDER.APPROVED&linked_state=linked&received_from=from",
        },
        "webhooks",
      ).requestPaths,
    ).toEqual([
      "/api/admin/webhooks?event_type=CHECKOUT.ORDER.APPROVED&linked_state=linked&received_from=from",
    ]);

    expect(
      buildAdminQuery(
        {
          pathname: "/admin/diagnostics",
          search:
            "?lookup=dbg_123&method=paypal&level=error&category=paypal&logged_from=from&payment_cursor=payment-cursor&runtime_cursor=runtime-cursor",
        },
        "diagnostics",
      ),
    ).toEqual({
      requestPaths: [
        "/api/admin/payment-debug?lookup=dbg_123&method=paypal&cursor=payment-cursor",
        "/api/admin/debug-logs?lookup=dbg_123&level=error&category=paypal&logged_from=from&cursor=runtime-cursor",
      ],
      clearPath: "/admin/diagnostics",
      activeParameters: [
        ["lookup", "dbg_123"],
        ["method", "paypal"],
        ["level", "error"],
        ["category", "paypal"],
        ["logged_from", "from"],
      ],
    });
  });

  it("returns a section pathname with no query string for Clear all", () => {
    expect(
      buildAdminQuery(
        { pathname: "/admin/unknown", search: "?status=paid" },
        "orders",
      ).clearPath,
    ).toBe("/admin/orders");
  });
});

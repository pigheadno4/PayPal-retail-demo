import { describe, expect, it, vi } from "vitest";

import {
  createDebugLogger,
  createInMemoryRuntimeDebugLogStore,
} from "../src/debug/logger.js";

describe("sanitized debug logger", () => {
  it("assigns immutable unique IDs when runtime entries enter the store", async () => {
    const store = createInMemoryRuntimeDebugLogStore({
      downstreamSink: () => undefined,
    });
    const entry = {
      id: "caller-supplied-id",
      timestamp: "2026-07-12T11:00:00.000Z",
      level: "error" as const,
      message: "paypal_capture_amount_mismatch",
      context: {
        debug_id: "dbg_capture_1",
        paypal_order_id: "PAYPAL-ORDER-1",
        payment_session_id: "payment-session-1",
      },
    };

    store.sink(entry);
    store.sink(entry);

    const stored = await store.listRuntimeDebugLogs();
    expect(stored).toHaveLength(2);
    expect(stored[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored[1]?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(stored[0]?.id).not.toBe(stored[1]?.id);
    expect(stored.map(({ id }) => id)).not.toContain("caller-supplied-id");
  });

  it("redacts secrets and preserves safe debug context", () => {
    const entries: unknown[] = [];
    const logger = createDebugLogger({
      clock: () => new Date("2026-05-31T09:30:00.000Z"),
      sink: (entry) => entries.push(entry),
    });

    logger.info("paypal_create_order", {
      debug_id: "dbg_123",
      payment_session_id: "payment_session_123",
      amount_minor: 4337,
      access_token: "secret-access-token",
      authorization: "Bearer secret-access-token",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
      nested: {
        client_secret: "paypal-client-secret",
        client_token: "browser-client-token",
        cart_client_secret: "cart-secret-value",
        card_number: "4111111111111111",
        safe_status: "created",
      },
    });

    expect(entries).toEqual([
      {
        timestamp: "2026-05-31T09:30:00.000Z",
        level: "info",
        message: "paypal_create_order",
        context: {
          debug_id: "dbg_123",
          payment_session_id: "payment_session_123",
          amount_minor: 4337,
          access_token: "[redacted]",
          authorization: "[redacted]",
          SUPABASE_SERVICE_ROLE_KEY: "[redacted]",
          nested: {
            client_secret: "[redacted]",
            client_token: "[redacted]",
            cart_client_secret: "[redacted]",
            card_number: "[redacted]",
            safe_status: "created",
          },
        },
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain("secret-access-token");
    expect(JSON.stringify(entries)).not.toContain("service-role-value");
    expect(JSON.stringify(entries)).not.toContain("4111111111111111");
    expect(JSON.stringify(entries)).not.toContain("browser-client-token");
    expect(JSON.stringify(entries)).not.toContain("cart-secret-value");
  });

  it("persists only event-allowlisted context after recursive redaction", async () => {
    const persistedEntries: unknown[] = [];
    const store = createInMemoryRuntimeDebugLogStore({
      clock: () => new Date("2026-07-13T03:00:00.000Z"),
      downstreamSink: () => undefined,
      persistenceRepository: {
        async insertRuntimeDebugLog(entry) {
          persistedEntries.push(entry);
        },
        async deleteRuntimeDebugLogsBefore() {},
      },
    });

    store.logger.warn("paypal_capture_prepared", {
      action: "block",
      amount_guard_status: "mismatch",
      amount_total_minor: 4337,
      buyer_email: "buyer@example.test",
      debug_id: "dbg_capture_1",
      order_number: "DO-20260713-000001",
      paypal_order_id: "PAYPAL-ORDER-1",
      payment_session_id: "payment-session-1",
      admin_session: "admin-session-secret",
      nested: {
        OAuthToken: "oauth-secret",
        paypal_client_secret: "paypal-secret",
      },
    });
    store.logger.info("paypal_create_order_amount_guard_outcome", {
      amount_currency_code: "USD",
      amount_guard_status: "matched",
      amount_total_minor: 4337,
      debug_id: "dbg_create_1",
      kind: "delivery",
      mismatch_count: 0,
      order_number: "DO-20260713-000002",
      payment_session_id: "payment-session-2",
    });
    store.logger.info("server_started", {
      debug_id: "dbg_server_1",
      port: 3000,
    });

    await vi.waitFor(() => expect(persistedEntries).toHaveLength(2));
    expect(persistedEntries).toEqual([
      {
        timestamp: "2026-07-13T03:00:00.000Z",
        level: "warn",
        message: "paypal_capture_prepared",
        context: {
          source: "payment_amount_guard",
          event: "paypal_capture_prepared",
          debug_id: "dbg_capture_1",
          order_number: "DO-20260713-000001",
          payment_session_id: "payment-session-1",
          paypal_order_id: "PAYPAL-ORDER-1",
          action: "block",
          amount_guard_status: "mismatch",
          amount_total_minor: 4337,
        },
      },
      {
        timestamp: "2026-07-13T03:00:00.000Z",
        level: "info",
        message: "paypal_create_order_amount_guard_outcome",
        context: {
          source: "payment_amount_guard",
          event: "paypal_create_order_amount_guard_outcome",
          debug_id: "dbg_create_1",
          order_number: "DO-20260713-000002",
          payment_session_id: "payment-session-2",
          amount_guard_status: "matched",
          amount_total_minor: 4337,
          amount_currency_code: "USD",
          kind: "delivery",
          mismatch_count: 0,
        },
      },
    ]);
    expect(JSON.stringify(persistedEntries)).not.toContain(
      "buyer@example.test",
    );
    expect(JSON.stringify(persistedEntries)).not.toContain(
      "admin-session-secret",
    );
    expect(JSON.stringify(persistedEntries)).not.toContain("oauth-secret");
    expect(JSON.stringify(persistedEntries)).not.toContain("paypal-secret");
  });

  it("classifies approved API outcomes with route-specific context allowlists", async () => {
    const persistedEntries: unknown[] = [];
    const store = createInMemoryRuntimeDebugLogStore({
      downstreamSink: () => undefined,
      persistenceRepository: {
        async insertRuntimeDebugLog(entry) {
          persistedEntries.push(entry);
        },
        async deleteRuntimeDebugLogsBefore() {},
      },
    });

    store.logger.info("api_request_completed", {
      debug_id: "dbg_inventory_1",
      method: "PATCH",
      path: "/api/admin/inventory/store:inventory-1",
      status_code: 200,
      duration_ms: 18,
      authorization: "Bearer admin-secret",
      buyer_phone: "+1-555-0100",
    });

    await vi.waitFor(() => expect(persistedEntries).toHaveLength(1));
    expect(persistedEntries).toEqual([
      {
        timestamp: expect.any(String),
        level: "info",
        message: "api_request_completed",
        context: {
          source: "inventory",
          event: "inventory_request_completed",
          debug_id: "dbg_inventory_1",
          method: "PATCH",
          path: "/api/admin/inventory/store:inventory-1",
          status_code: 200,
          duration_ms: 18,
        },
      },
    ]);
  });

  it("classifies lifecycle, pickup-capacity, webhook, and Account outcomes", async () => {
    const persistedEntries: Array<{
      readonly context: unknown;
      readonly message: string;
    }> = [];
    const store = createInMemoryRuntimeDebugLogStore({
      downstreamSink: () => undefined,
      persistenceRepository: {
        async insertRuntimeDebugLog(entry) {
          persistedEntries.push(entry);
        },
        async deleteRuntimeDebugLogsBefore() {},
      },
    });

    store.logger.info("api_request_completed", {
      debug_id: "dbg_lifecycle_1",
      duration_ms: 20,
      method: "PATCH",
      path: "/api/admin/orders/order-1/lifecycle?admin_session=secret",
      status_code: 200,
    });
    store.logger.info("api_request_completed", {
      debug_id: "dbg_pickup_1",
      duration_ms: 12,
      method: "PATCH",
      path: "/api/admin/pickup-dates/pickup-1",
      status_code: 200,
    });
    store.logger.error("api_request_failed", {
      debug_id: "dbg_webhook_1",
      error_message: "provider payload contained a secret",
      error_name: "WebhookRepositoryError",
      method: "POST",
      path: "/api/paypal/webhooks",
    });
    store.logger.error("api_request_failed", {
      debug_id: "dbg_account_1",
      error_message: "buyer@example.test could not load",
      error_name: "AccountRepositoryError",
      method: "GET",
      path: "/api/account/orders",
    });

    await vi.waitFor(() => expect(persistedEntries).toHaveLength(4));
    expect(
      persistedEntries.map((entry) => ({
        message: entry.message,
        context: entry.context,
      })),
    ).toEqual([
      {
        message: "api_request_completed",
        context: expect.objectContaining({
          source: "lifecycle",
          event: "lifecycle_request_completed",
          path: "/api/admin/orders/order-1/lifecycle",
        }),
      },
      {
        message: "api_request_completed",
        context: expect.objectContaining({
          source: "pickup_capacity",
          event: "pickup_capacity_request_completed",
        }),
      },
      {
        message: "api_request_failed",
        context: expect.objectContaining({
          source: "webhook",
          event: "webhook_request_failed",
          error_name: "WebhookRepositoryError",
        }),
      },
      {
        message: "api_request_failed",
        context: expect.objectContaining({
          source: "account",
          event: "account_orders_load_failed",
          error_name: "AccountRepositoryError",
        }),
      },
    ]);
    expect(JSON.stringify(persistedEntries)).not.toContain("admin_session");
    expect(JSON.stringify(persistedEntries)).not.toContain(
      "provider payload contained a secret",
    );
    expect(JSON.stringify(persistedEntries)).not.toContain(
      "buyer@example.test",
    );
  });

  it("swallows asynchronous persistence failures without recursive logging", async () => {
    const consoleEntries: unknown[] = [];
    const store = createInMemoryRuntimeDebugLogStore({
      clock: () => new Date("2026-07-13T03:00:00.000Z"),
      downstreamSink: (entry) => consoleEntries.push(entry),
      persistenceRepository: {
        async insertRuntimeDebugLog() {
          throw new Error("insert failed with service-role-secret");
        },
        async deleteRuntimeDebugLogsBefore() {
          throw new Error("cleanup failed with service-role-secret");
        },
      },
    });

    expect(() =>
      store.logger.error("account_orders_load_failed", {
        debug_id: "dbg_account_1",
        error_name: "DatabaseUnavailableError",
        method: "GET",
        path: "/api/account/orders",
      }),
    ).not.toThrow();

    await vi.waitFor(async () => {
      expect(await store.listRuntimeDebugLogs()).toHaveLength(1);
    });
    expect(consoleEntries).toHaveLength(1);
    expect(JSON.stringify(consoleEntries)).not.toContain("insert failed");
    expect(JSON.stringify(consoleEntries)).not.toContain("cleanup failed");
    expect(JSON.stringify(consoleEntries)).not.toContain("service-role-secret");
  });

  it("does not wait for persistence before resolving the business call", async () => {
    const insertStarted = vi.fn();
    const store = createInMemoryRuntimeDebugLogStore({
      downstreamSink: () => undefined,
      persistenceRepository: {
        async insertRuntimeDebugLog() {
          insertStarted();
          await new Promise<void>(() => undefined);
        },
        async deleteRuntimeDebugLogsBefore() {},
      },
    });

    const businessCall = async () => {
      store.logger.info("paypal_create_order_amount_mismatch", {
        debug_id: "dbg_amount_1",
        mismatch_count: 1,
        order_number: "DO-20260713-000002",
        payment_session_id: "payment-session-2",
      });
      return "business-result";
    };

    await expect(businessCall()).resolves.toBe("business-result");
    await vi.waitFor(() => expect(insertStarted).toHaveBeenCalledOnce());
  });
});

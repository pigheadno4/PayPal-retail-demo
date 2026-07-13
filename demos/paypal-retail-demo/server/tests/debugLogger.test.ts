import { describe, expect, it } from "vitest";

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
      message: "Repeated runtime failure",
      context: { source: "paypal" },
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
});

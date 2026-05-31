import { describe, expect, it } from "vitest";

import { createDebugLogger } from "../src/debug/logger.js";

describe("sanitized debug logger", () => {
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
            card_number: "[redacted]",
            safe_status: "created",
          },
        },
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain("secret-access-token");
    expect(JSON.stringify(entries)).not.toContain("service-role-value");
    expect(JSON.stringify(entries)).not.toContain("4111111111111111");
  });
});

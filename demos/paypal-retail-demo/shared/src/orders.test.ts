import { describe, expect, it } from "vitest";
import { getMarketConfig } from "./market.js";
import {
  planPendingOrderResume,
  type PendingOrderSnapshot,
  type ResumePaymentSessionSnapshot,
} from "./orders.js";

const usMarket = getMarketConfig("US");
const gbMarket = getMarketConfig("GB");

const pendingDeliveryOrder: PendingOrderSnapshot = {
  id: "order_1",
  orderNumber: "DO-20260526-000001",
  status: "pending",
  fulfillmentMode: "delivery",
  profileId: "popmart",
  market: usMarket,
  currencyCode: "USD",
  locale: "en-US",
  buyerCountry: "US",
  payLaterBuyerCountry: "US",
  sandboxTestBuyerCountry: "US",
  itemSnapshots: [
    {
      productId: "labubu",
      productNameSnapshot: "Labubu Have a Seat",
      quantity: 2,
      unitPriceMinorSnapshot: 1599,
      currencyCode: "USD",
    },
  ],
  pickupDate: null,
};

const failedSession: ResumePaymentSessionSnapshot = {
  id: "session_1",
  attemptNumber: 1,
  status: "failed",
  paypalInvoiceId: "DO-20260526-000001",
  expiresAt: "2026-05-30T09:00:00.000Z",
};

describe("pending order resume", () => {
  it("uses the order's locked market and item price snapshots instead of active context", () => {
    const plan = planPendingOrderResume({
      order: pendingDeliveryOrder,
      paymentSessions: [failedSession],
      activeContext: {
        profileId: "generic",
        market: gbMarket,
      },
      now: "2026-05-30T10:00:00.000Z",
    });

    expect(plan.lockedContext).toEqual({
      profileId: "popmart",
      marketId: "US",
      currencyCode: "USD",
      locale: "en-US",
      buyerCountry: "US",
      payLaterBuyerCountry: "US",
      sandboxTestBuyerCountry: "US",
    });
    expect(plan.cartSource).toBe("order_snapshot");
    expect(plan.itemPriceSource).toBe("order_item_snapshot");
    expect(plan.itemSnapshots).toEqual(pendingDeliveryOrder.itemSnapshots);
    expect(plan.activeContextIgnored).toBe(true);
    expect(plan.revalidationActions).toEqual([
      "items",
      "prices",
      "inventory",
      "shipping_or_pickup",
      "tax",
      "promos",
      "total_snapshot",
    ]);
  });

  it("keeps the buyer-facing order number stable and creates a fresh invoice ID when prior session is invalid", () => {
    const plan = planPendingOrderResume({
      order: pendingDeliveryOrder,
      paymentSessions: [
        failedSession,
        {
          id: "session_2",
          attemptNumber: 2,
          status: "cancelled",
          paypalInvoiceId: "DO-20260526-000001-A2",
          expiresAt: "2026-05-30T09:30:00.000Z",
        },
      ],
      now: "2026-05-30T10:00:00.000Z",
    });

    expect(plan.orderNumber).toBe("DO-20260526-000001");
    expect(plan.paymentSessionAction).toEqual({
      type: "create_fresh",
      reason: "invalid_payment_session",
      attemptNumber: 3,
      paypalInvoiceId: "DO-20260526-000001-A3",
    });
  });

  it("creates a fresh invoice ID when the latest reusable-status session is expired", () => {
    const plan = planPendingOrderResume({
      order: pendingDeliveryOrder,
      paymentSessions: [
        {
          id: "session_1",
          attemptNumber: 1,
          status: "created",
          paypalInvoiceId: "DO-20260526-000001",
          expiresAt: "2026-05-30T09:59:59.000Z",
        },
      ],
      now: "2026-05-30T10:00:00.000Z",
    });

    expect(plan.paymentSessionAction).toEqual({
      type: "create_fresh",
      reason: "expired_payment_session",
      attemptNumber: 2,
      paypalInvoiceId: "DO-20260526-000001-A2",
    });
  });

  it("reuses an existing created or approved payment session that has not expired", () => {
    const plan = planPendingOrderResume({
      order: pendingDeliveryOrder,
      paymentSessions: [
        {
          id: "session_1",
          attemptNumber: 1,
          status: "created",
          paypalInvoiceId: "DO-20260526-000001",
          expiresAt: "2026-05-30T10:30:00.000Z",
        },
      ],
      now: "2026-05-30T10:00:00.000Z",
    });

    expect(plan.paymentSessionAction).toEqual({
      type: "reuse_existing",
      paymentSessionId: "session_1",
      attemptNumber: 1,
      paypalInvoiceId: "DO-20260526-000001",
    });
  });

  it("requires pickup date rebooking when a pending pickup order date has passed", () => {
    const plan = planPendingOrderResume({
      order: {
        ...pendingDeliveryOrder,
        id: "order_pickup_1",
        orderNumber: "PO-20260526-000001",
        fulfillmentMode: "pickup",
        pickupDate: "2026-05-29",
      },
      paymentSessions: [
        {
          id: "session_1",
          attemptNumber: 1,
          status: "expired",
          paypalInvoiceId: "PO-20260526-000001",
          expiresAt: "2026-05-29T10:00:00.000Z",
        },
      ],
      now: "2026-05-30T10:00:00.000Z",
    });

    expect(plan.pickupDateAction).toBe("rebook_required");
    expect(plan.revalidationActions).toContain("pickup_date");
    expect(plan.paymentSessionAction).toMatchObject({
      type: "create_fresh",
      attemptNumber: 2,
      paypalInvoiceId: "PO-20260526-000001-A2",
    });
  });

  it("rejects resume for non-pending orders and inconsistent locked market snapshots", () => {
    expect(() =>
      planPendingOrderResume({
        order: {
          ...pendingDeliveryOrder,
          status: "paid",
        },
        paymentSessions: [],
        now: "2026-05-30T10:00:00.000Z",
      }),
    ).toThrow("only pending orders can be resumed");

    expect(() =>
      planPendingOrderResume({
        order: {
          ...pendingDeliveryOrder,
          currencyCode: "GBP",
        },
        paymentSessions: [],
        now: "2026-05-30T10:00:00.000Z",
      }),
    ).toThrow("order currency must match locked market currency");
  });
});

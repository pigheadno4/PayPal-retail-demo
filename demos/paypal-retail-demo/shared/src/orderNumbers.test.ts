import { describe, expect, it } from "vitest";
import {
  buildPayPalInvoiceId,
  formatOrderNumber,
  orderNumberPrefixForFulfillment,
} from "./orderNumbers.js";

describe("order number helpers", () => {
  it("formats delivery and pickup order numbers", () => {
    expect(
      formatOrderNumber({
        fulfillmentMode: "delivery",
        date: "2026-05-26",
        sequence: 1,
      }),
    ).toBe("DO-20260526-000001");
    expect(
      formatOrderNumber({
        fulfillmentMode: "pickup",
        date: new Date("2026-05-26T23:30:00.000Z"),
        sequence: 42,
      }),
    ).toBe("PO-20260526-000042");
  });

  it("maps fulfillment mode to stable order prefixes", () => {
    expect(orderNumberPrefixForFulfillment("delivery")).toBe("DO");
    expect(orderNumberPrefixForFulfillment("pickup")).toBe("PO");
  });

  it("keeps the first PayPal invoice ID stable and suffixes fresh attempts", () => {
    const orderNumber = "DO-20260526-000001";

    expect(buildPayPalInvoiceId(orderNumber, 1)).toBe(orderNumber);
    expect(buildPayPalInvoiceId(orderNumber, 2)).toBe("DO-20260526-000001-A2");
  });

  it("rejects invalid sequences, attempts, and order number formats", () => {
    expect(() =>
      formatOrderNumber({
        fulfillmentMode: "delivery",
        date: "2026-05-26",
        sequence: 0,
      }),
    ).toThrow("sequence");
    expect(() => buildPayPalInvoiceId("BAD-1", 1)).toThrow("order number");
    expect(() => buildPayPalInvoiceId("DO-20260526-000001", 0)).toThrow(
      "attempt",
    );
  });
});

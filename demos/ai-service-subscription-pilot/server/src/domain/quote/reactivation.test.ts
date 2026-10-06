import { expect, it } from "vitest";
import { createGoMonthlyReactivationQuote } from "./go-monthly-seattle.js";
it("charges normal service plus effective Q4 tax with no provisional schedule", () => {
  expect(createGoMonthlyReactivationQuote(() => new Date("2026-10-06T12:00:00Z"))).toMatchObject({ baseCents:1000,promotionCents:0,taxableSubtotalCents:1000,taxCents:106,totalCents:1106,pricingVersion:"go-monthly-reactivation-v1",renewsAt:null,allowanceResetsAt:null });
});
it("caps recovery review at tax boundary and rejects unsupported future mapping", () => {
  expect(createGoMonthlyReactivationQuote(() => new Date("2027-01-01T07:59:00Z")).expiresAt).toBe("2027-01-01T08:00:00.000Z");
  expect(() => createGoMonthlyReactivationQuote(() => new Date("2027-01-01T08:00:00Z"))).toThrow("stale_quote");
});

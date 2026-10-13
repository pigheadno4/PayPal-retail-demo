import { describe, expect, it } from "vitest";

import type { CheckoutReview } from "../../../../shared/src/checkout.js";
import { createPayPalOrderRequestSchema } from "../../../../shared/src/paypal.js";
import {
  buildFraudNetBootstrap,
  buildInitialPayPalOrder,
  validateClientMetadataId,
} from "./payload.js";

const review: CheckoutReview = {
  intentId: "11111111-1111-4111-8111-111111111111",
  quoteId: "22222222-2222-4222-8222-222222222222",
  tier: "go",
  cadence: "monthly",
  base: { currency: "USD", cents: 1_000 },
  promotion: { currency: "USD", cents: -500 },
  taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1_055,
  tax: { currency: "USD", cents: 53 },
  dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2026-07-15T19:15:00.000Z",
  renewsAt: "2026-08-15T19:00:00.000Z",
  allowanceResetsAt: "2026-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles",
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

describe("TC-0005 initial PayPal order", () => {
  it("builds the exact Wallet save-with-purchase and recurring-plan payload from the trusted review", () => {
    const payload = buildInitialPayPalOrder(review);

    expect(payload).toEqual({
      intent: "CAPTURE",
      payment_source: {
        paypal: {
          attributes: {
            vault: {
              store_in_vault: "ON_SUCCESS",
              usage_type: "MERCHANT",
              usage_pattern: "SUBSCRIPTION_PREPAID",
            },
          },
        },
      },
      purchase_units: [{
        reference_id: review.quoteId,
        amount: {
          currency_code: "USD",
          value: "5.53",
          breakdown: {
            item_total: { currency_code: "USD", value: "5.00" },
            tax_total: { currency_code: "USD", value: "0.53" },
          },
        },
        items: [{
          name: "Billing Plan",
          quantity: "1",
          category: "DIGITAL_GOODS",
          unit_amount: { currency_code: "USD", value: "5.00" },
          billing_plan: {
            name: "Go Monthly",
            billing_cycles: [{
              sequence: 1,
              tenure_type: "TRIAL",
              total_cycles: 1,
              frequency: { interval_unit: "MONTH", interval_count: 1 },
              pricing_scheme: {
                pricing_model: "FIXED",
                price: { currency_code: "USD", value: "5.00" },
              },
            }, {
              sequence: 2,
              start_date: "2026-08-15",
              tenure_type: "REGULAR",
              total_cycles: 0,
              frequency: { interval_unit: "MONTH", interval_count: 1 },
              pricing_scheme: {
                pricing_model: "FIXED",
                price: { currency_code: "USD", value: "10.00" },
              },
            }],
          },
        }],
      }],
    });
    expect(JSON.stringify(payload)).not.toContain("discount");
    expect(JSON.stringify(payload)).not.toContain("fixed_price");
    expect(JSON.stringify(payload)).not.toContain("stored_credential");
  });

  it.each([
    ["2026-11-01T00:30:00Z", "2026-10-31"],
    ["2028-03-01T00:30:00Z", "2028-02-29"],
    ["2026-05-01T06:30:00Z", "2026-04-30"],
    ["2027-01-01T07:30:00Z", "2026-12-31"],
    ["2026-03-08T09:59:59Z", "2026-03-08"],
    ["2026-03-08T10:00:00Z", "2026-03-08"],
    ["2026-11-01T08:59:59Z", "2026-11-01"],
    ["2026-11-01T09:00:00Z", "2026-11-01"],
  ])("projects renewal %s into the review time zone as %s without changing money or input", (renewsAt, date) => {
    const input = { ...review, renewsAt };
    const before = structuredClone(input);
    const payload = buildInitialPayPalOrder(input);
    const units = payload.purchase_units as Array<{ amount: unknown; items: Array<{ unit_amount: unknown; billing_plan: { billing_cycles: Array<Record<string, unknown>> } }> }>;
    const cycles = units[0].items[0].billing_plan.billing_cycles;
    expect(cycles[0]).not.toHaveProperty("start_date");
    expect(cycles[1]).toHaveProperty("start_date", date);
    expect(units[0].amount).toEqual({ currency_code: "USD", value: "5.53", breakdown: { item_total: { currency_code: "USD", value: "5.00" }, tax_total: { currency_code: "USD", value: "0.53" } } });
    expect(units[0].items[0].unit_amount).toEqual({ currency_code: "USD", value: "5.00" });
    expect(cycles.map(cycle => cycle.pricing_scheme)).toEqual([
      { pricing_model: "FIXED", price: { currency_code: "USD", value: "5.00" } },
      { pricing_model: "FIXED", price: { currency_code: "USD", value: "10.00" } },
    ]);
    expect(buildInitialPayPalOrder(input)).toEqual(payload);
    expect(input).toEqual(before);
  });
});

describe("TC-0005 FraudNet contract", () => {
  it("uses the exact public application flow source and environment without merchant identity", () => {
    expect(buildFraudNetBootstrap("sandbox")).toEqual({
      sourceId: "AI_SERVICE_STUDIO_CHECKOUT",
      sandbox: true,
    });
    expect(buildFraudNetBootstrap("live")).toEqual({
      sourceId: "AI_SERVICE_STUDIO_CHECKOUT",
      sandbox: false,
    });
    expect(JSON.stringify(buildFraudNetBootstrap("sandbox"))).not.toContain("MERCHANT");
  });

  it("accepts only one non-empty client metadata identifier of at most 32 characters", () => {
    const exact = "1234567890abcdef1234567890abcdef";
    expect(validateClientMetadataId(exact)).toBe(exact);
    expect(() => validateClientMetadataId("")).toThrow("invalid_client_metadata_id");
    expect(() => validateClientMetadataId(`${exact}x`)).toThrow("invalid_client_metadata_id");
  });

  it("rejects unknown public request fields and malformed identifiers", () => {
    expect(() => createPayPalOrderRequestSchema.parse({
      intentId: review.intentId,
      quoteId: review.quoteId,
      operationId: "33333333-3333-4333-8333-333333333333",
      clientMetadataId: "1234567890abcdef1234567890abcdef",
      vaultId: "must-not-be-accepted",
    })).toThrow();
  });
});

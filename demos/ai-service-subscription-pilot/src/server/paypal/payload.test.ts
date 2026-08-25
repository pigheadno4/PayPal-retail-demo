import { describe, expect, it } from "vitest";

import type { CheckoutReview } from "@/contracts/checkout";
import { createPayPalOrderRequestSchema } from "@/contracts/paypal";
import {
  buildFraudNetBootstrap,
  buildInitialPayPalOrder,
  validateClientMetadataId,
} from "@/server/paypal/payload";

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
          name: "Go Monthly",
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
                fixed_price: { currency_code: "USD", value: "5.00" },
              },
            }, {
              sequence: 2,
              tenure_type: "REGULAR",
              total_cycles: 0,
              frequency: { interval_unit: "MONTH", interval_count: 1 },
              pricing_scheme: {
                pricing_model: "FIXED",
                fixed_price: { currency_code: "USD", value: "10.00" },
              },
            }],
          },
        }],
      }],
    });
    expect(JSON.stringify(payload)).not.toContain("discount");
    expect(JSON.stringify(payload)).not.toContain("stored_credential");
  });
});

describe("TC-0005 FraudNet contract", () => {
  it("uses the exact non-hashed merchant source and environment", () => {
    expect(buildFraudNetBootstrap("MERCHANT123", "sandbox")).toEqual({
      sourceId: "MERCHANT123_checkout-page",
      sandbox: true,
    });
    expect(buildFraudNetBootstrap("MERCHANT123", "live")).toEqual({
      sourceId: "MERCHANT123_checkout-page",
      sandbox: false,
    });
  });

  it("rejects empty and over-32 exact sources rather than truncating or hashing", () => {
    expect(() => buildFraudNetBootstrap("", "sandbox")).toThrow("invalid_paypal_merchant_id");
    expect(() => buildFraudNetBootstrap("12345678901234567890", "sandbox")).toThrow("invalid_fraudnet_source_id");
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

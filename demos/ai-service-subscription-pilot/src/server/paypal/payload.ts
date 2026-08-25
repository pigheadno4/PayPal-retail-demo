import type { CheckoutReview } from "@/contracts/checkout";
import type { PayPalEnvironment, PayPalOrderPayload } from "@/server/paypal/gateway";

function decimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function buildInitialPayPalOrder(review: CheckoutReview): PayPalOrderPayload {
  return Object.freeze({
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
        value: decimal(review.dueToday.cents),
        breakdown: {
          item_total: { currency_code: "USD", value: decimal(review.taxableSubtotal.cents) },
          tax_total: { currency_code: "USD", value: decimal(review.tax.cents) },
        },
      },
      items: [{
        name: "Go Monthly",
        quantity: "1",
        category: "DIGITAL_GOODS",
        unit_amount: { currency_code: "USD", value: decimal(review.taxableSubtotal.cents) },
        billing_plan: {
          name: "Go Monthly",
          billing_cycles: [{
            sequence: 1,
            tenure_type: "TRIAL",
            total_cycles: 1,
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            pricing_scheme: {
              pricing_model: "FIXED",
              fixed_price: { currency_code: "USD", value: decimal(review.taxableSubtotal.cents) },
            },
          }, {
            sequence: 2,
            tenure_type: "REGULAR",
            total_cycles: 0,
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            pricing_scheme: {
              pricing_model: "FIXED",
              fixed_price: { currency_code: "USD", value: decimal(review.base.cents) },
            },
          }],
        },
      }],
    }],
  });
}

export function buildFraudNetBootstrap(merchantId: string, environment: PayPalEnvironment) {
  if (!merchantId) throw new Error("invalid_paypal_merchant_id");
  const sourceId = `${merchantId}_checkout-page`;
  if (sourceId.length > 32) throw new Error("invalid_fraudnet_source_id");
  return Object.freeze({ sourceId, sandbox: environment === "sandbox" });
}

export function validateClientMetadataId(value: string): string {
  if (!value || value.length > 32) throw new Error("invalid_client_metadata_id");
  return value;
}

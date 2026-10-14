import type { CheckoutReview } from "../../../../shared/src/checkout.js";
import type { PayPalEnvironment, PayPalOrderPayload } from "./gateway.js";

function decimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function renewalDate(review: CheckoutReview): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: review.timeZone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(review.renewsAt));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function buildSavedWalletOrder(review: Pick<CheckoutReview,"quoteId"|"dueToday"|"taxableSubtotal"|"tax">,token:string,reference:string):PayPalOrderPayload {
  return Object.freeze({intent:"CAPTURE",payment_source:{paypal:{vault_id:token,stored_credential:{payment_initiator:"CUSTOMER",usage:"SUBSEQUENT"}}},purchase_units:[{reference_id:reference,custom_id:reference,amount:{currency_code:"USD",value:decimal(review.dueToday.cents),breakdown:{item_total:{currency_code:"USD",value:decimal(review.taxableSubtotal.cents)},tax_total:{currency_code:"USD",value:decimal(review.tax.cents)}}},items:[{name:"Go Monthly recovery",quantity:"1",category:"DIGITAL_GOODS",unit_amount:{currency_code:"USD",value:decimal(review.taxableSubtotal.cents)}}]}]});
}

export function buildInitialPayPalOrder(review: CheckoutReview, appUrl: string): PayPalOrderPayload {
  const checkoutUrl = new URL(`/checkout/${encodeURIComponent(review.intentId)}`, new URL(appUrl).origin).toString();
  return Object.freeze({
    intent: "CAPTURE",
    payment_source: {
      paypal: {
        experience_context: {
          return_url: checkoutUrl,
          cancel_url: checkoutUrl,
        },
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
        name: "Billing Plan",
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
              price: { currency_code: "USD", value: decimal(review.taxableSubtotal.cents) },
            },
          }, {
            sequence: 2,
            start_date: renewalDate(review),
            tenure_type: "REGULAR",
            total_cycles: 0,
            frequency: { interval_unit: "MONTH", interval_count: 1 },
            pricing_scheme: {
              pricing_model: "FIXED",
              price: { currency_code: "USD", value: decimal(review.base.cents) },
            },
          }],
        },
      }],
    }],
  });
}

export function buildFraudNetBootstrap(environment: PayPalEnvironment) {
  return Object.freeze({
    sourceId: "AI_SERVICE_STUDIO_CHECKOUT" as const,
    sandbox: environment === "sandbox",
  });
}

export function validateClientMetadataId(value: string): string {
  if (!/^[A-Za-z0-9_-]{32}$/.test(value)) throw new Error("invalid_client_metadata_id");
  return value;
}

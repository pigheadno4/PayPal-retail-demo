import { describe, expect, it } from "vitest";

import { defaultCheckoutPageData } from "./CheckoutPage.js";
import { reconcileCheckoutDataFromDraftResponse } from "./checkoutDraftApi.js";

describe("checkoutDraftApi", () => {
  it("formats selected promo discounts amount-first when a selected code exists", () => {
    const nextData = reconcileCheckoutDataFromDraftResponse(
      defaultCheckoutPageData,
      {
        draft: {
          id: "draft_delivery_amount_first",
          fulfillment_mode: "delivery",
          promo: {
            selected_codes: ["SAVE10"],
          },
          summary: {
            currency_code: "USD",
            discount_minor: 399,
            merchandise_subtotal_minor: 3949,
            shipping_minor: 650,
            total_minor: 4211,
          },
        },
      },
    );

    expect(nextData.delivery.summary.promoLabel).toBe("-$3.99 promo (SAVE10)");
    expect(nextData.delivery.summary.promoLabel).not.toBe("SAVE10");
  });

  it("formats real discounts as signed promo amounts without requiring a code", () => {
    const nextData = reconcileCheckoutDataFromDraftResponse(
      defaultCheckoutPageData,
      {
        draft: {
          id: "draft_delivery_auto_promo",
          fulfillment_mode: "delivery",
          summary: {
            currency_code: "USD",
            discount_minor: 399,
            merchandise_subtotal_minor: 3949,
            shipping_minor: 650,
            total_minor: 4211,
          },
        },
      },
    );

    expect(nextData.delivery.summary.promoLabel).toBe("-$3.99 promo");
  });

  it("preserves backend payment readiness on delivery draft reconciliation", () => {
    const nextData = reconcileCheckoutDataFromDraftResponse(
      defaultCheckoutPageData,
      {
        draft: {
          id: "draft_delivery_payment_recalculating",
          fulfillment_mode: "delivery",
          payment_readiness: {
            state: "recalculating",
            title: "Totals are updating",
            body: "Wait for checkout totals before payment.",
          },
        },
      },
    );

    expect(nextData.delivery.paymentReadiness).toEqual({
      state: "recalculating",
      title: "Totals are updating",
      body: "Wait for checkout totals before payment.",
    });
  });
});

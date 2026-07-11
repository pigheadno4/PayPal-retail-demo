import { describe, expect, it } from "vitest";

import type { ApiClient, ApiQueryParams } from "../../api/client.js";
import type { ApiRequestOptions } from "../../api/client.js";

import { defaultCheckoutPageData } from "./CheckoutPage.js";
import { reconcileCheckoutDataFromDraftResponse } from "./checkoutDraftApi.js";
import {
  activateRecommendedCheckoutPromos,
  applyCheckoutPromos,
  evaluateCheckoutPromos,
  removeCheckoutPromo,
} from "./promoActivation.js";

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

  it("maps pickup stores to text-labelled full partial and sold-out states", () => {
    const store = (
      id: string,
      availableItemsCount: number,
      unavailableItemsCount: number,
    ) => ({
      id,
      name: `Store ${id}`,
      address_line1: "100 Broadway",
      city: "New York",
      state: "NY",
      postal_code: "10012",
      country_code: "US",
      available_items_count: availableItemsCount,
      unavailable_items_count: unavailableItemsCount,
    });
    const nextData = reconcileCheckoutDataFromDraftResponse(
      defaultCheckoutPageData,
      {
        draft: {
          id: "draft_pickup_inventory_states",
          fulfillment_mode: "pickup",
          pickup: {
            stores: [
              store("full", 2, 0),
              store("partial", 1, 1),
              store("sold-out", 0, 2),
            ],
          },
        },
      },
    );
    const storeSelectionStep = nextData.pickup.steps.find(
      (step) => step.id === "store-selection",
    );

    expect(
      storeSelectionStep?.storeCards?.map((card) => card.statusLabel),
    ).toEqual(["Full inventory", "Partial inventory", "Sold out"]);
  });

  it("maps checkout promo evaluate, apply, and remove calls to backend draft routes", async () => {
    const { apiClient, calls } = createPromoRecordingApiClient({
      deleteResponseByPath: {
        "/api/checkout/drafts/draft%2Fpromo/promos/SAVE10": {
          draft: {
            id: "draft/promo",
            fulfillment_mode: "delivery",
            promo: {
              selected_codes: [],
            },
          },
        },
      },
      postResponseByPath: {
        "/api/checkout/drafts/draft%2Fpromo/promos/apply": {
          draft: {
            id: "draft/promo",
            fulfillment_mode: "delivery",
            promo: {
              selected_codes: ["SAVE10"],
            },
            summary: {
              currency_code: "USD",
              discount_minor: 399,
              merchandise_subtotal_minor: 3999,
              shipping_minor: 0,
              total_minor: 3600,
            },
          },
        },
        "/api/checkout/drafts/draft%2Fpromo/promos/evaluate": {
          promo: {
            merchandise_discount_minor: 399,
            recommended_set: ["SAVE10"],
            rejected: [],
            selected_set: [],
          },
        },
      },
    });
    const query = { market: "US" };
    const options = {
      headers: {
        "x-cart-client-secret": "secret",
        "x-cart-public-id": "public",
      },
    };

    await expect(
      evaluateCheckoutPromos(apiClient, "draft/promo", query, options, [
        "manual10",
      ]),
    ).resolves.toEqual({
      promo: {
        merchandise_discount_minor: 399,
        recommended_set: ["SAVE10"],
        rejected: [],
        selected_set: [],
      },
    });
    await expect(
      applyCheckoutPromos(
        apiClient,
        "draft/promo",
        ["SAVE10"],
        [],
        query,
        options,
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        draft: expect.objectContaining({
          id: "draft/promo",
          promo: {
            selected_codes: ["SAVE10"],
          },
        }),
      }),
    );
    await expect(
      removeCheckoutPromo(apiClient, "draft/promo", "SAVE10", query, options),
    ).resolves.toEqual(
      expect.objectContaining({
        draft: expect.objectContaining({
          id: "draft/promo",
        }),
      }),
    );

    expect(calls).toEqual([
      {
        body: {
          manual_codes: ["MANUAL10"],
        },
        method: "post",
        options,
        path: "/api/checkout/drafts/draft%2Fpromo/promos/evaluate",
        query,
      },
      {
        body: {
          manual_codes: [],
          selected_codes: ["SAVE10"],
        },
        method: "post",
        options,
        path: "/api/checkout/drafts/draft%2Fpromo/promos/apply",
        query,
      },
      {
        method: "delete",
        options,
        path: "/api/checkout/drafts/draft%2Fpromo/promos/SAVE10",
        query,
      },
    ]);
  });

  it("does not apply rejected or zero-discount promo evaluations", async () => {
    const { apiClient, calls } = createPromoRecordingApiClient({
      postResponseByPath: {
        "/api/checkout/drafts/draft_zero/promos/evaluate": {
          promo: {
            merchandise_discount_minor: 0,
            recommended_set: ["SAVE10"],
            rejected: [
              {
                code: "SAVE10",
                reason: "minimum_subtotal_not_met",
              },
            ],
            selected_set: [],
          },
        },
      },
    });

    await expect(
      activateRecommendedCheckoutPromos({
        apiClient,
        draftId: "draft_zero",
        query: { market: "US" },
      }),
    ).resolves.toEqual({
      evaluation: {
        promo: {
          merchandise_discount_minor: 0,
          recommended_set: ["SAVE10"],
          rejected: [
            {
              code: "SAVE10",
              reason: "minimum_subtotal_not_met",
            },
          ],
          selected_set: [],
        },
      },
      status: "not_applicable",
    });
    expect(calls).toEqual([
      expect.objectContaining({
        method: "post",
        path: "/api/checkout/drafts/draft_zero/promos/evaluate",
      }),
    ]);
  });

  it("surfaces promo activation failure without returning a fake discount", async () => {
    const error = new Error("network down");
    const { apiClient } = createPromoRecordingApiClient({
      postErrorByPath: {
        "/api/checkout/drafts/draft_network/promos/evaluate": error,
      },
    });

    await expect(
      activateRecommendedCheckoutPromos({
        apiClient,
        draftId: "draft_network",
        query: { market: "US" },
      }),
    ).resolves.toEqual({
      error,
      status: "failed",
    });
  });
});

interface PromoRecordingApiCall {
  readonly body?: unknown;
  readonly method: "delete" | "get" | "patch" | "post";
  readonly options?: unknown | undefined;
  readonly path: string;
  readonly query?: ApiQueryParams | undefined;
}

function createPromoRecordingApiClient({
  deleteResponseByPath = {},
  postErrorByPath = {},
  postResponseByPath = {},
}: {
  readonly deleteResponseByPath?: Readonly<Record<string, unknown>>;
  readonly postErrorByPath?: Readonly<Record<string, Error>>;
  readonly postResponseByPath?: Readonly<Record<string, unknown>>;
} = {}): {
  readonly apiClient: ApiClient;
  readonly calls: PromoRecordingApiCall[];
} {
  const calls: PromoRecordingApiCall[] = [];
  const apiClient: ApiClient = {
    async delete<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "delete", options, path, query });
      return (deleteResponseByPath[path] ?? {}) as TData;
    },
    async get<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "get", options, path, query });
      return {} as TData;
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ body, method: "patch", options, path, query });
      return {} as TData;
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ body, method: "post", options, path, query });
      if (postErrorByPath[path]) {
        throw postErrorByPath[path];
      }
      return (postResponseByPath[path] ?? {}) as TData;
    },
  };

  return { apiClient, calls };
}

import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  CheckoutApiResponse,
  CheckoutOperationContext,
  CheckoutRepository,
} from "../src/routes/checkout.js";
import { requestApp } from "./helpers/requestApp.js";

describe("checkout draft routes", () => {
  it("creates or refreshes a checkout draft from the active cart", async () => {
    const repository = createCheckoutRepository();
    const app = createCheckoutApp(repository);

    const response = await requestApp(
      app,
      "POST",
      "/api/checkout/drafts?profile=generic&market=gb",
      {
        headers: {
          "x-cart-id": "cart_public_guest",
          "x-cart-secret": "cart_secret_guest",
        },
        json: {
          fulfillment_mode: "pickup",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: draftResponse({ fulfillmentMode: "pickup" }),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([
      {
        method: "createDraft",
        context: {
          storefrontContext: { profileSlug: "generic", marketCode: "GB" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_guest",
            cartClientSecret: "cart_secret_guest",
          },
        },
        input: {
          fulfillmentMode: "pickup",
        },
      },
    ]);
  });

  it("updates delivery checkout steps with normalized address and option input", async () => {
    const repository = createCheckoutRepository();
    const app = createCheckoutApp(repository);
    const headers = {
      authorization: "Bearer buyer-token",
      "x-cart-id": "cart_public_guest",
      "x-cart-secret": "cart_secret_guest",
    };

    const fulfillment = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/fulfillment",
      {
        headers,
        json: {
          fulfillment_mode: "delivery",
        },
      },
    );
    const shippingAddress = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/shipping-address",
      {
        headers,
        json: addressBody(),
      },
    );
    const billingAddress = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/billing-address",
      {
        headers,
        json: {
          same_as_shipping: false,
          address: addressBody({ recipient_name: "Billing Buyer" }),
        },
      },
    );
    const shippingOption = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/shipping-option",
      {
        headers,
        json: {
          shipping_option_id: "ship_standard_ca",
        },
      },
    );

    expect(fulfillment.status).toBe(200);
    expect(shippingAddress.status).toBe(200);
    expect(billingAddress.status).toBe(200);
    expect(shippingOption.status).toBe(200);
    expect(repository.calls).toEqual([
      {
        method: "selectFulfillment",
        context: authenticatedContext(),
        input: {
          draftId: "draft_123",
          fulfillmentMode: "delivery",
        },
      },
      {
        method: "updateShippingAddress",
        context: authenticatedContext(),
        input: {
          draftId: "draft_123",
          address: normalizedAddress(),
          saveToAddressBook: true,
        },
      },
      {
        method: "updateBillingAddress",
        context: authenticatedContext(),
        input: {
          draftId: "draft_123",
          sameAsShipping: false,
          address: normalizedAddress({ recipient_name: "Billing Buyer" }),
          saveToAddressBook: true,
        },
      },
      {
        method: "selectShippingOption",
        context: authenticatedContext(),
        input: {
          draftId: "draft_123",
          shippingOptionId: "ship_standard_ca",
        },
      },
    ]);
  });

  it("updates pickup checkout steps with location, store, and pickup date input", async () => {
    const repository = createCheckoutRepository();
    const app = createCheckoutApp(repository);

    const pickupLocation = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/pickup-location",
      {
        json: {
          country_code: "us",
          state: "CA",
          postal_code: "94105",
        },
      },
    );
    const pickupStore = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/pickup-store",
      {
        json: {
          store_id: "store_san_francisco",
        },
      },
    );
    const pickupDate = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/pickup-date",
      {
        json: {
          pickup_date: "2026-06-05",
        },
      },
    );

    expect(pickupLocation.status).toBe(200);
    expect(pickupStore.status).toBe(200);
    expect(pickupDate.status).toBe(200);
    expect(repository.calls).toEqual([
      {
        method: "updatePickupLocation",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          location: {
            countryCode: "US",
            state: "CA",
            county: null,
            postalCode: "94105",
          },
        },
      },
      {
        method: "selectPickupStore",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          storeId: "store_san_francisco",
        },
      },
      {
        method: "selectPickupDate",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          pickupDate: "2026-06-05",
        },
      },
    ]);
  });

  it("evaluates, applies, and removes promo codes for a checkout draft", async () => {
    const repository = createCheckoutRepository();
    const app = createCheckoutApp(repository);

    const evaluate = await requestApp(
      app,
      "POST",
      "/api/checkout/drafts/draft_123/promos/evaluate",
      {
        json: {
          manual_codes: [" bundle8 ", "state15"],
        },
      },
    );
    const apply = await requestApp(
      app,
      "POST",
      "/api/checkout/drafts/draft_123/promos/apply",
      {
        json: {
          selected_codes: ["state15", " bundle8 "],
          manual_codes: ["bundle8"],
        },
      },
    );
    const remove = await requestApp(
      app,
      "DELETE",
      "/api/checkout/drafts/draft_123/promos/bundle8",
    );

    expect(evaluate.status).toBe(200);
    expect(apply.status).toBe(200);
    expect(remove.status).toBe(200);
    expect(repository.calls).toEqual([
      {
        method: "evaluatePromos",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          manualCodes: ["BUNDLE8", "STATE15"],
        },
      },
      {
        method: "applyPromos",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          selectedCodes: ["STATE15", "BUNDLE8"],
          manualCodes: ["BUNDLE8"],
        },
      },
      {
        method: "removePromo",
        context: guestContext(),
        input: {
          draftId: "draft_123",
          code: "BUNDLE8",
        },
      },
    ]);
  });

  it("returns buyer-safe validation errors before repository calls", async () => {
    const repository = createCheckoutRepository();
    const app = createCheckoutApp(repository);

    const invalidFulfillment = await requestApp(
      app,
      "POST",
      "/api/checkout/drafts",
      {
        json: {
          fulfillment_mode: "ship",
        },
      },
    );
    const invalidAddress = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/shipping-address",
      {
        json: {
          address_line1: "1 Market St",
        },
      },
    );
    const invalidPickupDate = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/pickup-date",
      {
        json: {
          pickup_date: "06/05/2026",
        },
      },
    );
    const invalidPromoCodes = await requestApp(
      app,
      "POST",
      "/api/checkout/drafts/draft_123/promos/apply",
      {
        json: {
          selected_codes: ["ok", 123],
        },
      },
    );

    expect(invalidFulfillment.status).toBe(400);
    expect(invalidFulfillment.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CHECKOUT_DRAFT_REQUEST",
        message: "A supported checkout fulfillment mode is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(invalidAddress.status).toBe(400);
    expect(invalidAddress.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CHECKOUT_ADDRESS_REQUEST",
        message: "A complete checkout address is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(invalidPickupDate.status).toBe(400);
    expect(invalidPickupDate.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CHECKOUT_PICKUP_DATE_REQUEST",
        message: "A pickup date in YYYY-MM-DD format is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(invalidPromoCodes.status).toBe(400);
    expect(invalidPromoCodes.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CHECKOUT_PROMO_REQUEST",
        message: "Promo codes must be non-empty strings.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([]);
  });

  it("returns a conflict when a resumed draft tries to switch fulfillment mode", async () => {
    const baseRepository = createCheckoutRepository();
    const repository: TestCheckoutRepository = {
      ...baseRepository,
      async selectFulfillment() {
        throw Object.assign(
          new Error("Resumed checkout fulfillment mode is locked."),
          { code: "CHECKOUT_RESUME_FULFILLMENT_LOCKED" },
        );
      },
    };
    const app = createCheckoutApp(repository);

    const response = await requestApp(
      app,
      "PATCH",
      "/api/checkout/drafts/draft_123/fulfillment",
      {
        headers: { authorization: "Bearer buyer-token" },
        json: { fulfillment_mode: "pickup" },
      },
    );

    expect(response.status).toBe(409);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "CHECKOUT_RESUME_FULFILLMENT_LOCKED",
        message:
          "This resumed order must keep its original fulfillment method.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

type TestCheckoutRepository = CheckoutRepository & {
  readonly calls: unknown[];
  readonly evaluatePromos: CheckoutRepository["evaluatePromos"];
  readonly applyPromos: CheckoutRepository["applyPromos"];
  readonly removePromo: CheckoutRepository["removePromo"];
};

function createCheckoutApp(repository: TestCheckoutRepository) {
  return createApp({
    checkout: {
      checkoutRepository: repository,
      authVerifier: createAuthVerifier(),
    },
  });
}

function createCheckoutRepository(): TestCheckoutRepository {
  const calls: unknown[] = [];

  return {
    calls,
    async createDraft(context, input) {
      calls.push({ method: "createDraft", context, input });
      return draftResponse({ fulfillmentMode: input.fulfillmentMode });
    },
    async selectFulfillment(context, input) {
      calls.push({ method: "selectFulfillment", context, input });
      return draftResponse({ fulfillmentMode: input.fulfillmentMode });
    },
    async updateShippingAddress(context, input) {
      calls.push({ method: "updateShippingAddress", context, input });
      return draftResponse({ activeStep: "shipping_option" });
    },
    async updateBillingAddress(context, input) {
      calls.push({ method: "updateBillingAddress", context, input });
      return draftResponse({ activeStep: "billing_address" });
    },
    async selectShippingOption(context, input) {
      calls.push({ method: "selectShippingOption", context, input });
      return draftResponse({ activeStep: "payment_method" });
    },
    async updatePickupLocation(context, input) {
      calls.push({ method: "updatePickupLocation", context, input });
      return draftResponse({ fulfillmentMode: "pickup", activeStep: "store" });
    },
    async selectPickupStore(context, input) {
      calls.push({ method: "selectPickupStore", context, input });
      return draftResponse({
        fulfillmentMode: "pickup",
        activeStep: "pickup_date",
      });
    },
    async selectPickupDate(context, input) {
      calls.push({ method: "selectPickupDate", context, input });
      return draftResponse({
        fulfillmentMode: "pickup",
        activeStep: "payment_method",
      });
    },
    async evaluatePromos(context, input) {
      calls.push({ method: "evaluatePromos", context, input });
      return promoEvaluationResponse();
    },
    async applyPromos(context, input) {
      calls.push({ method: "applyPromos", context, input });
      return draftResponse({ activeStep: "payment_method" });
    },
    async removePromo(context, input) {
      calls.push({ method: "removePromo", context, input });
      return draftResponse({ activeStep: "payment_method" });
    },
  };
}

function createAuthVerifier(): SupabaseAuthVerifier {
  return {
    auth: {
      async getUser(token) {
        return token === "buyer-token"
          ? {
              data: {
                user: {
                  id: "user_buyer_123",
                  email: "buyer@example.com",
                },
              },
              error: null,
            }
          : {
              data: { user: null },
              error: { message: "JWT invalid" },
            };
      },
    },
  };
}

function authenticatedContext(): CheckoutOperationContext {
  return {
    storefrontContext: { profileSlug: "popmart", marketCode: "US" },
    buyer: {
      kind: "authenticated",
      userId: "user_buyer_123",
      email: "buyer@example.com",
    },
    guestCart: {
      cartPublicId: "cart_public_guest",
      cartClientSecret: "cart_secret_guest",
    },
  };
}

function guestContext(): CheckoutOperationContext {
  return {
    storefrontContext: { profileSlug: "popmart", marketCode: "US" },
    buyer: { kind: "guest" },
    guestCart: null,
  };
}

function addressBody(
  overrides: Partial<Record<string, string | boolean>> = {},
) {
  return {
    recipient_name: "Demo Buyer",
    phone: "+1 415 555 0100",
    address_line1: "1 Market St",
    address_line2: "Suite 200",
    city: "San Francisco",
    state: "CA",
    county: "San Francisco",
    postal_code: "94105",
    country_code: "us",
    save_to_address_book: true,
    ...overrides,
  };
}

function normalizedAddress(
  overrides: Partial<Record<string, string | null>> = {},
) {
  return {
    recipientName: "Demo Buyer",
    phone: "+1 415 555 0100",
    addressLine1: "1 Market St",
    addressLine2: "Suite 200",
    city: "San Francisco",
    state: "CA",
    county: "San Francisco",
    postalCode: "94105",
    countryCode: "US",
    ...Object.fromEntries(
      Object.entries(overrides).map(([key, value]) => [
        key === "recipient_name" ? "recipientName" : key,
        value,
      ]),
    ),
  };
}

function draftResponse(input: {
  readonly fulfillmentMode?: "delivery" | "pickup";
  readonly activeStep?: string;
}): CheckoutApiResponse {
  const fulfillmentMode = input.fulfillmentMode ?? "delivery";

  return {
    draft: {
      id: "draft_123",
      cart_id: "cart_guest_us",
      fulfillment_mode: fulfillmentMode,
      status: "draft",
      active_step: input.activeStep ?? "shipping_address",
      delivery: {
        shipping_address: null,
        billing_address: null,
        same_as_shipping: true,
        shipping_options: [],
        selected_shipping_option_id: null,
      },
      pickup: {
        location: null,
        selected_store_id: null,
        pickup_dates: [],
        selected_pickup_date: null,
      },
      summary: {
        item_count: 0,
        merchandise_subtotal_minor: 0,
        discount_minor: 0,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 0,
        currency_code: "USD",
      },
      promo: {
        status: "pending",
        recommended_codes: [],
      },
    },
  };
}

function promoEvaluationResponse(): CheckoutApiResponse {
  return {
    promo: {
      recommended_set: ["STATE15", "BUNDLE8"],
      candidate_sets: [
        {
          codes: ["STATE15", "BUNDLE8"],
          discount_minor: 2300,
          final_total_minor: 7700,
          recommended: true,
        },
      ],
      rejected: [],
    },
  };
}

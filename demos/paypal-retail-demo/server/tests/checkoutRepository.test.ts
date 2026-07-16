import { describe, expect, it, vi } from "vitest";

import {
  createSupabaseCheckoutRepository,
  type CheckoutCartItemRow,
  type CheckoutCartRow,
  type CheckoutDataSource,
  type CheckoutDraftRow,
  type CheckoutMarketRow,
  type CheckoutPickupDateRow,
  type CheckoutPromoCompatibilityRow,
  type CheckoutPromoEvaluationLineRow,
  type CheckoutPromoEvaluationRow,
  type CheckoutPromoRuleProductRow,
  type CheckoutPromoRuleRegionRow,
  type CheckoutPromoRuleRow,
  type CheckoutProfileRow,
  type CheckoutResumeOrderItemRow,
  type CheckoutResumeOrderRow,
  type CheckoutResumePaymentSessionRow,
  type CheckoutCentralInventoryRow,
  type CheckoutShippingOptionRow,
  type CheckoutStoreInventoryRow,
  type CheckoutStoreRow,
  type CheckoutTaxRateRow,
} from "../src/repositories/checkoutRepository.js";

describe("Supabase-backed checkout repository", () => {
  it("creates a draft from the verified guest cart and returns a cart summary", async () => {
    const dataSource = createCheckoutDataSource();
    const repository = createRepository(dataSource);

    await expect(
      repository.createDraft(
        {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_guest",
            cartClientSecret: "cart_secret_guest",
          },
        },
        { fulfillmentMode: "delivery" },
      ),
    ).resolves.toEqual({
      draft: {
        id: "draft_new",
        cart_id: "cart_guest",
        fulfillment_mode: "delivery",
        status: "draft",
        active_step: "shipping_address",
        delivery: {
          shipping_address: null,
          billing_address: null,
          same_as_shipping: true,
          shipping_options: [],
          selected_shipping_option_id: null,
        },
        pickup: {
          location: null,
          stores: [],
          selected_store_id: null,
          pickup_dates: [],
          selected_pickup_date: null,
          inventory: {
            ready_items: [],
            unavailable_items: [],
            unavailable_subtotal_minor: 0,
          },
        },
        items: [
          {
            id: "cart_item_labubu",
            product_name: "Labubu Have a Seat",
            image_path: null,
            quantity: 2,
            unit_price_minor: 1399,
            line_subtotal_minor: 2798,
          },
          {
            id: "cart_item_dimoo",
            product_name: "Dimoo Animal Kingdom",
            image_path: null,
            quantity: 1,
            unit_price_minor: 1299,
            line_subtotal_minor: 1299,
          },
        ],
        summary: {
          item_count: 3,
          merchandise_subtotal_minor: 4097,
          discount_minor: 0,
          tax_minor: 0,
          shipping_minor: 0,
          total_minor: 4097,
          currency_code: "USD",
        },
        promo: {
          status: "pending",
          recommended_codes: [],
          selected_codes: [],
        },
      },
    });
    expect(dataSource.drafts).toContainEqual({
      id: "draft_new",
      profile_id: "profile_popmart",
      market_id: "market_us",
      cart_id: "cart_guest",
      auth_user_id: null,
      guest_email: null,
      fulfillment_mode: "delivery",
      delivery_state_json: {},
      pickup_state_json: {},
      selected_promo_evaluation_id: null,
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      status: "draft",
      updated_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("persists delivery shipping address, defaults cheapest shipping, and excludes shipping from tax", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push(existingDraft({ fulfillmentMode: "delivery" }));
    const repository = createRepository(dataSource);

    const shippingAddressResponse = await repository.updateShippingAddress(
      authenticatedContext(),
      {
        draftId: "draft_delivery",
        address: addressInput(),
        saveToAddressBook: true,
      },
    );
    const shippingOptionResponse = await repository.selectShippingOption(
      authenticatedContext(),
      {
        draftId: "draft_delivery",
        shippingOptionId: "ship_express_ca",
      },
    );

    expect(shippingAddressResponse).toMatchObject({
      draft: {
        id: "draft_delivery",
        active_step: "shipping_option",
        delivery: {
          shipping_address: addressDto(),
          same_as_shipping: true,
          shipping_options: [
            {
              id: "ship_ground_ca",
              service_code: "ground",
              amount_minor: 500,
            },
            {
              id: "ship_express_ca",
              service_code: "express",
              amount_minor: 1500,
            },
          ],
          selected_shipping_option_id: "ship_ground_ca",
        },
        summary: {
          merchandise_subtotal_minor: 4097,
          tax_minor: 358,
          shipping_minor: 500,
          total_minor: 4955,
        },
      },
    });
    expect(shippingOptionResponse).toMatchObject({
      draft: {
        active_step: "payment_method",
        delivery: {
          selected_shipping_option_id: "ship_express_ca",
        },
        summary: {
          tax_minor: 358,
          shipping_minor: 1500,
          total_minor: 5955,
        },
      },
    });
    expect(
      dataSource.drafts.find((draft) => draft.id === "draft_delivery")
        ?.delivery_state_json,
    ).toMatchObject({
      shipping_address: addressDto(),
      selected_shipping_option_id: "ship_express_ca",
    });
  });

  it("reuses shipping-address recalculation inputs instead of repeating slow draft reads", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push(existingDraft({ fulfillmentMode: "delivery" }));
    const listCartItems = vi.spyOn(dataSource, "listCartItems");
    const listShippingOptions = vi.spyOn(dataSource, "listShippingOptions");
    const repository = createRepository(dataSource);

    await repository.updateShippingAddress(authenticatedContext(), {
      draftId: "draft_delivery",
      address: addressInput(),
      saveToAddressBook: true,
    });

    expect(listCartItems).toHaveBeenCalledTimes(1);
    expect(listShippingOptions).toHaveBeenCalledTimes(1);
  });

  it("reuses cart rows while recalculating billing-address totals", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      delivery_state_json: {
        billing_address: null,
        same_as_shipping: true,
        selected_shipping_option_id: "ship_ground_ca",
        shipping_address: addressDto(),
      },
    });
    const listCartItems = vi.spyOn(dataSource, "listCartItems");
    const listShippingOptions = vi.spyOn(dataSource, "listShippingOptions");
    const repository = createRepository(dataSource);

    await repository.updateBillingAddress(authenticatedContext(), {
      draftId: "draft_delivery",
      sameAsShipping: true,
      address: null,
      saveToAddressBook: true,
    });

    expect(listCartItems).toHaveBeenCalledTimes(1);
    expect(listShippingOptions).toHaveBeenCalledTimes(1);
  });

  it("persists pickup store and date with ready/unavailable item split", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push(existingDraft({ fulfillmentMode: "pickup" }));
    const repository = createRepository(dataSource);

    const storeResponse = await repository.selectPickupStore(guestContext(), {
      draftId: "draft_delivery",
      storeId: "store_sf",
    });
    const dateResponse = await repository.selectPickupDate(guestContext(), {
      draftId: "draft_delivery",
      pickupDate: "2026-06-05",
    });

    expect(storeResponse).toMatchObject({
      draft: {
        fulfillment_mode: "pickup",
        active_step: "pickup_date",
        pickup: {
          selected_store_id: "store_sf",
          pickup_dates: [
            {
              pickup_date: "2026-06-05",
              is_available: true,
            },
          ],
          inventory: {
            ready_items: [
              {
                product_id: "product_labubu",
                fulfillable_quantity: 1,
                unavailable_quantity: 1,
                payable_subtotal_minor: 1399,
              },
              {
                product_id: "product_dimoo",
                fulfillable_quantity: 1,
                unavailable_quantity: 0,
                payable_subtotal_minor: 1299,
              },
            ],
            unavailable_items: [
              {
                product_id: "product_labubu",
                unavailable_quantity: 1,
                unavailable_subtotal_minor: 1399,
              },
            ],
            unavailable_subtotal_minor: 1399,
          },
        },
        summary: {
          merchandise_subtotal_minor: 2698,
          total_minor: 2698,
        },
      },
    });
    expect(dateResponse).toMatchObject({
      draft: {
        active_step: "payment_method",
        pickup: {
          selected_store_id: "store_sf",
          selected_pickup_date: "2026-06-05",
        },
      },
    });
  });

  it("rolls stale pickup date windows forward from the current checkout date", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.pickupDates[0] = {
      ...dataSource.pickupDates[0],
      pickup_date: "2026-05-28",
    };
    dataSource.drafts.push(existingDraft({ fulfillmentMode: "pickup" }));
    const repository = createRepository(dataSource, "2026-06-25T10:00:00.000Z");

    const storeResponse = await repository.selectPickupStore(guestContext(), {
      draftId: "draft_delivery",
      storeId: "store_sf",
    });
    const dateResponse = await repository.selectPickupDate(guestContext(), {
      draftId: "draft_delivery",
      pickupDate: "2026-06-25",
    });

    expect(storeResponse.draft.pickup).toMatchObject({
      pickup_dates: [
        {
          id: "pickup_date_sf",
          pickup_date: "2026-06-25",
          is_available: true,
        },
      ],
    });
    expect(dateResponse.draft.pickup).toMatchObject({
      selected_pickup_date: "2026-06-25",
    });
  });

  it("returns market-scoped pickup stores after the guest submits a pickup location", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.stores.push({
      id: "store_london",
      market_id: "market_gb",
      name: "POP MART London",
      phone: "+44 20 5555 0101",
      address_line1: "1 Oxford Street",
      address_line2: null,
      city: "London",
      state: null,
      postal_code: "W1F 7JL",
      country_code: "GB",
      is_active: true,
    });
    dataSource.drafts.push(existingDraft({ fulfillmentMode: "pickup" }));
    const repository = createRepository(dataSource);

    const response = await repository.updatePickupLocation(guestContext(), {
      draftId: "draft_delivery",
      location: {
        countryCode: "US",
        county: null,
        postalCode: "10012",
        state: "NY",
      },
    });

    expect(response).toMatchObject({
      draft: {
        active_step: "store",
        pickup: {
          stores: [
            expect.objectContaining({
              id: "store_sf",
              country_code: "US",
              name: "POP MART San Francisco",
            }),
          ],
        },
      },
    });
    expect(
      (
        response.draft?.pickup as
          | { readonly stores?: readonly { readonly id: string }[] }
          | undefined
      )?.stores?.map((store) => store.id),
    ).not.toContain("store_london");
  });

  it("rejects shipping options that are not eligible for the submitted address", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      delivery_state_json: {
        shipping_address: addressDto(),
        selected_shipping_option_id: "ship_ground_ca",
      },
    });
    const repository = createRepository(dataSource);

    await expect(
      repository.selectShippingOption(authenticatedContext(), {
        draftId: "draft_delivery",
        shippingOptionId: "ship_gb_standard",
      }),
    ).rejects.toThrow("Shipping option ship_gb_standard is not eligible");
  });

  it("rejects unavailable pickup dates for the selected store", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "pickup" }),
      pickup_state_json: {
        selected_store_id: "store_sf",
      },
    });
    const repository = createRepository(dataSource);

    await expect(
      repository.selectPickupDate(guestContext(), {
        draftId: "draft_delivery",
        pickupDate: "2026-06-30",
      }),
    ).rejects.toThrow("Pickup date 2026-06-30 is not available");
  });

  it("evaluates, applies, and removes checkout promos with recalculated totals", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      delivery_state_json: {
        shipping_address: addressDto(),
        selected_shipping_option_id: "ship_ground_ca",
      },
    });
    const repository = createRepository(dataSource);

    const evaluationResponse = await repository.evaluatePromos(
      authenticatedContext(),
      {
        draftId: "draft_delivery",
        manualCodes: ["BUNDLE10", "BIG20", "EXPIRED20"],
      },
    );
    expect(
      dataSource.drafts.find((draft) => draft.id === "draft_delivery")
        ?.selected_promo_evaluation_id,
    ).toBeNull();

    const applyResponse = await repository.applyPromos(authenticatedContext(), {
      draftId: "draft_delivery",
      selectedCodes: ["AUTO5", "BUNDLE10"],
      manualCodes: ["BUNDLE10", "BIG20"],
    });
    const removeResponse = await repository.removePromo(
      authenticatedContext(),
      {
        draftId: "draft_delivery",
        code: "BUNDLE10",
      },
    );

    expect(evaluationResponse).toMatchObject({
      promo: {
        evaluation_id: "promo_eval_1",
        recommended_set: ["AUTO5", "BUNDLE10"],
        selected_set: ["AUTO5", "BUNDLE10"],
        candidate_sets: expect.arrayContaining([
          expect.objectContaining({
            codes: ["AUTO5", "BUNDLE10"],
            discount_minor: 910,
            final_total_minor: 3187,
            recommended: true,
          }),
          expect.objectContaining({
            codes: ["BIG20"],
            discount_minor: 800,
            final_total_minor: 3297,
            recommended: false,
          }),
        ]),
        rejected: expect.arrayContaining([
          {
            code: "EXPIRED20",
            reason: "expired",
          },
        ]),
      },
    });
    expect(applyResponse).toMatchObject({
      draft: {
        promo: {
          status: "selected",
          evaluation_id: "promo_eval_2",
          selected_codes: ["AUTO5", "BUNDLE10"],
          recommended_codes: ["AUTO5", "BUNDLE10"],
        },
        summary: {
          merchandise_subtotal_minor: 4097,
          discount_minor: 910,
          tax_minor: 279,
          shipping_minor: 500,
          total_minor: 3966,
        },
      },
    });
    expect(removeResponse).toMatchObject({
      draft: {
        promo: {
          status: "selected",
          evaluation_id: "promo_eval_3",
          selected_codes: ["AUTO5"],
          recommended_codes: ["AUTO5"],
        },
        summary: {
          discount_minor: 500,
          tax_minor: 315,
          shipping_minor: 500,
          total_minor: 4412,
        },
      },
    });
    expect(dataSource.promoEvaluations).toHaveLength(3);
    expect(dataSource.promoEvaluationLines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          promo_evaluation_id: "promo_eval_2",
          code_snapshot: "AUTO5",
          evaluation_status: "selected",
          discount_minor: 500,
        }),
        expect.objectContaining({
          promo_evaluation_id: "promo_eval_2",
          code_snapshot: "EXPIRED20",
          evaluation_status: "rejected",
          rejection_reason: "expired",
        }),
      ]),
    );
  });

  it("rejects applying a selected promo set that is no longer eligible", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      delivery_state_json: {
        shipping_address: addressDto(),
        selected_shipping_option_id: "ship_ground_ca",
      },
    });
    const repository = createRepository(dataSource);

    await expect(
      repository.applyPromos(authenticatedContext(), {
        draftId: "draft_delivery",
        selectedCodes: ["EXPIRED20"],
        manualCodes: ["EXPIRED20"],
      }),
    ).rejects.toThrow("Selected promo set is not eligible");
    expect(dataSource.promoEvaluations).toHaveLength(0);
  });

  it("resumes from saved order item prices and locked context without reading the active cart", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      status: "payment_started",
      delivery_state_json: {
        billing_address: addressDto(),
        same_as_shipping: true,
        selected_shipping_option_id: "shipping_option_removed",
        shipping_address: addressDto(),
      },
    });
    dataSource.resumeOrders.push(pendingResumeOrder());
    dataSource.resumeOrderItems.push({
      id: "order_item_labubu",
      order_id: "order_pending",
      product_id: "product_labubu",
      product_name_snapshot: "Labubu Snapshot",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor: 1599,
    });
    dataSource.centralInventory.push({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 5,
    });
    dataSource.cartItems[0] = {
      ...dataSource.cartItems[0]!,
      unit_price_minor_snapshot: 9999,
    };
    const listCartItems = vi.spyOn(dataSource, "listCartItems");
    const repository = createRepository(dataSource, "2026-07-15T10:00:00.000Z");

    const result = await repository.resumePendingOrder({
      authUserId: "user_buyer_123",
      orderNumber: "DO-20260715-000001",
    });

    expect(result).toMatchObject({
      status: "ready",
      checkout: {
        draft: {
          id: "draft_delivery",
          fulfillment_mode: "delivery",
          resume_context: {
            order_number: "DO-20260715-000001",
            market_code: "US",
            currency_code: "USD",
            locale: "en-US",
            buyer_country: "US",
            paylater_buyer_country: "US",
            sandbox_test_buyer_country: "US",
          },
          delivery: {
            selected_shipping_option_id: "ship_ground_ca",
          },
          summary: {
            merchandise_subtotal_minor: 3198,
            discount_minor: 500,
            tax_minor: 236,
            shipping_minor: 500,
            total_minor: 3434,
            currency_code: "USD",
          },
          items: [
            {
              id: "order_item_labubu",
              product_name: "Labubu Snapshot",
              quantity: 2,
              unit_price_minor: 1599,
              line_subtotal_minor: 3198,
            },
          ],
          promo: {
            selected_codes: ["AUTO5"],
          },
        },
      },
    });
    expect(listCartItems).not.toHaveBeenCalled();
    expect(
      dataSource.drafts.find((draft) => draft.id === "draft_delivery")
        ?.delivery_state_json,
    ).toMatchObject({
      pending_order_resume_id: "order_pending",
      selected_shipping_option_id: "ship_ground_ca",
    });
  });

  it("blocks delivery resume before payment when saved quantities exceed central inventory", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      status: "payment_started",
      delivery_state_json: {
        shipping_address: addressDto(),
      },
    });
    dataSource.resumeOrders.push(pendingResumeOrder());
    dataSource.resumeOrderItems.push({
      id: "order_item_labubu",
      order_id: "order_pending",
      product_id: "product_labubu",
      product_name_snapshot: "Labubu Snapshot",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor: 1599,
    });
    dataSource.centralInventory.push({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 1,
    });
    const repository = createRepository(dataSource, "2026-07-15T10:00:00.000Z");

    await expect(
      repository.resumePendingOrder({
        authUserId: "user_buyer_123",
        orderNumber: "DO-20260715-000001",
      }),
    ).resolves.toEqual({
      status: "blocked",
      code: "DELIVERY_INVENTORY_UNAVAILABLE",
      message:
        "One or more items are no longer available for delivery. Review your cart before trying again.",
    });
  });

  it("resumes a delivery order without an address into an explicit address-required state", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      status: "payment_started",
      delivery_state_json: {
        selected_shipping_option_id: "shipping_option_stale",
      },
    });
    dataSource.resumeOrders.push(pendingResumeOrder());
    dataSource.resumeOrderItems.push({
      id: "order_item_labubu",
      order_id: "order_pending",
      product_id: "product_labubu",
      product_name_snapshot: "Labubu Snapshot",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor: 1599,
    });
    dataSource.centralInventory.push({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 5,
    });
    const repository = createRepository(dataSource, "2026-07-15T10:00:00.000Z");

    const result = await repository.resumePendingOrder({
      authUserId: "user_buyer_123",
      orderNumber: "DO-20260715-000001",
    });

    expect(result).toMatchObject({
      status: "ready",
      checkout: {
        draft: {
          active_step: "shipping_address",
          fulfillment_mode: "delivery",
          payment_readiness: {
            state: "blocked",
            title: "Add a shipping address",
            body: "Add your delivery address before choosing a payment method.",
          },
          delivery: {
            shipping_address: null,
            selected_shipping_option_id: null,
          },
        },
      },
    });

    const repaired = await repository.updateShippingAddress(
      authenticatedContext(),
      {
        draftId: "draft_delivery",
        address: addressInput(),
        saveToAddressBook: true,
      },
    );

    expect(repaired).toMatchObject({
      draft: {
        active_step: "shipping_option",
        payment_readiness: null,
      },
    });
  });

  it("clears an expired pickup date and returns an explicit rebooking state", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "pickup" }),
      auth_user_id: "user_buyer_123",
      status: "payment_started",
      pickup_state_json: {
        location: {
          country_code: "US",
          state: "CA",
          county: null,
          postal_code: "94105",
        },
        selected_store_id: "store_sf",
        selected_pickup_date: "2026-06-05",
      },
    });
    dataSource.resumeOrders.push({
      ...pendingResumeOrder(),
      fulfillment_mode: "pickup",
    });
    dataSource.resumeOrderItems.push({
      id: "order_item_labubu",
      order_id: "order_pending",
      product_id: "product_labubu",
      product_name_snapshot: "Labubu Snapshot",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor: 1599,
    });
    const repository = createRepository(dataSource, "2026-07-15T10:00:00.000Z");

    const result = await repository.resumePendingOrder({
      authUserId: "user_buyer_123",
      orderNumber: "DO-20260715-000001",
    });

    expect(result).toMatchObject({
      status: "ready",
      checkout: {
        draft: {
          active_step: "pickup_date",
          fulfillment_mode: "pickup",
          payment_readiness: {
            state: "blocked",
            title: "Choose a new pickup date",
            body: "Your previous pickup date is no longer available.",
          },
          pickup: {
            selected_store_id: "store_sf",
            selected_pickup_date: null,
          },
        },
      },
    });
  });

  it("rejects a server-side fulfillment change for a marked resumed draft", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      auth_user_id: "user_buyer_123",
      delivery_state_json: {
        shipping_address: addressDto(),
        pending_order_resume_id: "order_pending",
      },
    });
    dataSource.resumeOrders.push(pendingResumeOrder());
    const repository = createRepository(dataSource);

    await expect(
      repository.selectFulfillment(authenticatedContext(), {
        draftId: "draft_delivery",
        fulfillmentMode: "pickup",
      }),
    ).rejects.toMatchObject({
      code: "CHECKOUT_RESUME_FULFILLMENT_LOCKED",
    });
    expect(
      dataSource.drafts.find((draft) => draft.id === "draft_delivery"),
    ).toMatchObject({
      fulfillment_mode: "delivery",
      delivery_state_json: {
        pending_order_resume_id: "order_pending",
      },
    });
  });

  it("holds a conditional resume claim while draft and promo state are written", async () => {
    const dataSource = createCheckoutDataSource();
    dataSource.drafts.push({
      ...existingDraft({ fulfillmentMode: "delivery" }),
      auth_user_id: "user_buyer_123",
      status: "payment_started",
      delivery_state_json: {},
    });
    dataSource.resumeOrders.push(pendingResumeOrder());
    dataSource.resumeOrderItems.push({
      id: "order_item_labubu",
      order_id: "order_pending",
      product_id: "product_labubu",
      product_name_snapshot: "Labubu Snapshot",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor: 1599,
    });
    dataSource.centralInventory.push({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 5,
    });
    let captureSucceeded: boolean | null = null;
    dataSource.beforeNextDraftUpdate = () => {
      captureSucceeded = dataSource.tryCapturePendingOrder("order_pending");
    };
    const repository = createRepository(dataSource);

    const result = await repository.resumePendingOrder({
      authUserId: "user_buyer_123",
      orderNumber: "DO-20260715-000001",
    });

    expect(result).toMatchObject({ status: "ready" });
    expect(captureSucceeded).toBe(false);
    expect(dataSource.resumeOrders[0]?.status).toBe("pending");
    expect(dataSource.resumeOperationLocks.size).toBe(0);
    expect(dataSource.tryCapturePendingOrder("order_pending")).toBe(true);
  });
});

function pendingResumeOrder(): CheckoutResumeOrderRow {
  return {
    id: "order_pending",
    profile_id: "profile_popmart",
    market_id: "market_us",
    order_number: "DO-20260715-000001",
    auth_user_id: "user_buyer_123",
    checkout_draft_id: "draft_delivery",
    fulfillment_mode: "delivery",
    status: "pending",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    sandbox_test_buyer_country: "US",
  };
}

function createRepository(
  dataSource: FakeCheckoutDataSource,
  now: string = "2026-06-01T10:00:00.000Z",
) {
  let promoEvaluationLineSequence = 0;

  return createSupabaseCheckoutRepository({
    dataSource,
    now,
    createDraftId: () => "draft_new",
    createPromoEvaluationId: () =>
      `promo_eval_${dataSource.promoEvaluations.length + 1}`,
    createPromoEvaluationLineId: () => {
      promoEvaluationLineSequence += 1;
      return `promo_line_${promoEvaluationLineSequence}`;
    },
    hashCartClientSecret: (secret) => `hash:${secret}`,
  });
}

function createCheckoutDataSource(): FakeCheckoutDataSource {
  return new FakeCheckoutDataSource();
}

function authenticatedContext() {
  return {
    storefrontContext: { profileSlug: "popmart", marketCode: "US" },
    buyer: {
      kind: "authenticated" as const,
      userId: "user_buyer_123",
      email: "buyer@example.com",
    },
    guestCart: null,
  };
}

function guestContext() {
  return {
    storefrontContext: { profileSlug: "popmart", marketCode: "US" },
    buyer: { kind: "guest" as const },
    guestCart: {
      cartPublicId: "cart_public_guest",
      cartClientSecret: "cart_secret_guest",
    },
  };
}

function existingDraft(input: {
  readonly fulfillmentMode: "delivery" | "pickup";
}): CheckoutDraftRow {
  return {
    id: "draft_delivery",
    profile_id: "profile_popmart",
    market_id: "market_us",
    cart_id: "cart_guest",
    auth_user_id:
      input.fulfillmentMode === "delivery" ? "user_buyer_123" : null,
    guest_email: null,
    fulfillment_mode: input.fulfillmentMode,
    delivery_state_json: {},
    pickup_state_json: {},
    selected_promo_evaluation_id: null,
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    sandbox_test_buyer_country: "US",
    status: "draft",
    updated_at: "2026-05-31T08:00:00.000Z",
  };
}

function addressInput() {
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
  };
}

function addressDto() {
  return {
    recipient_name: "Demo Buyer",
    phone: "+1 415 555 0100",
    address_line1: "1 Market St",
    address_line2: "Suite 200",
    city: "San Francisco",
    state: "CA",
    county: "San Francisco",
    postal_code: "94105",
    country_code: "US",
  };
}

class FakeCheckoutDataSource implements CheckoutDataSource {
  readonly profiles: CheckoutProfileRow[] = [
    {
      id: "profile_popmart",
      slug: "popmart",
    },
  ];

  readonly markets: CheckoutMarketRow[] = [
    {
      id: "market_us",
      code: "US",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
    },
  ];

  readonly carts: CheckoutCartRow[] = [
    {
      id: "cart_guest",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: null,
      cart_public_id: "cart_public_guest",
      cart_secret_hash: "hash:cart_secret_guest",
      status: "active",
    },
    {
      id: "cart_user",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: "user_buyer_123",
      cart_public_id: "cart_public_user",
      cart_secret_hash: null,
      status: "active",
    },
  ];

  readonly cartItems: CheckoutCartItemRow[] = [
    {
      id: "cart_item_labubu",
      cart_id: "cart_guest",
      product_id: "product_labubu",
      product_name: "Labubu Have a Seat",
      category_id: "category_blind_box",
      quantity: 2,
      unit_price_minor_snapshot: 1399,
    },
    {
      id: "cart_item_dimoo",
      cart_id: "cart_guest",
      product_id: "product_dimoo",
      product_name: "Dimoo Animal Kingdom",
      category_id: "category_blind_box",
      quantity: 1,
      unit_price_minor_snapshot: 1299,
    },
  ];

  readonly drafts: CheckoutDraftRow[] = [];

  readonly shippingOptions: CheckoutShippingOptionRow[] = [
    {
      id: "ship_ground_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      service_code: "ground",
      display_name: "Ground",
      amount_minor: 500,
      estimated_days_min: 4,
      estimated_days_max: 6,
      is_active: true,
    },
    {
      id: "ship_express_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      service_code: "express",
      display_name: "Express",
      amount_minor: 1500,
      estimated_days_min: 1,
      estimated_days_max: 2,
      is_active: true,
    },
    {
      id: "ship_gb_standard",
      market_id: "market_us",
      country_code: "GB",
      state: null,
      county: null,
      service_code: "standard",
      display_name: "GB Standard",
      amount_minor: 700,
      estimated_days_min: 3,
      estimated_days_max: 5,
      is_active: true,
    },
  ];

  readonly taxRates: CheckoutTaxRateRow[] = [
    {
      id: "tax_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      postal_code_prefix: null,
      rate_bps: 875,
      is_active: true,
    },
  ];

  readonly stores: CheckoutStoreRow[] = [
    {
      id: "store_sf",
      market_id: "market_us",
      name: "POP MART San Francisco",
      phone: "+1 415 555 0199",
      address_line1: "865 Market St",
      address_line2: null,
      city: "San Francisco",
      state: "CA",
      postal_code: "94103",
      country_code: "US",
      is_active: true,
    },
  ];

  readonly pickupDates: CheckoutPickupDateRow[] = [
    {
      id: "pickup_date_sf",
      market_id: "market_us",
      store_id: "store_sf",
      pickup_date: "2026-06-05",
      capacity: 10,
      is_available: true,
    },
  ];

  readonly storeInventory: CheckoutStoreInventoryRow[] = [
    {
      store_id: "store_sf",
      product_id: "product_labubu",
      available_quantity: 1,
    },
    {
      store_id: "store_sf",
      product_id: "product_dimoo",
      available_quantity: 2,
    },
  ];

  readonly promoRules: CheckoutPromoRuleRow[] = [
    {
      id: "promo_auto5",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "AUTO5",
      promo_type: "auto",
      discount_type: "fixed_amount",
      discount_value: 500,
      min_merchandise_subtotal_minor: 2000,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: "2027-01-01T00:00:00.000Z",
      is_stackable: true,
      priority: 10,
      is_active: true,
    },
    {
      id: "promo_bundle10",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "BUNDLE10",
      promo_type: "manual",
      discount_type: "percent",
      discount_value: 1000,
      min_merchandise_subtotal_minor: 3000,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: "2027-01-01T00:00:00.000Z",
      is_stackable: true,
      priority: 20,
      is_active: true,
    },
    {
      id: "promo_big20",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "BIG20",
      promo_type: "manual",
      discount_type: "fixed_amount",
      discount_value: 800,
      min_merchandise_subtotal_minor: 3000,
      starts_at: "2026-01-01T00:00:00.000Z",
      ends_at: "2027-01-01T00:00:00.000Z",
      is_stackable: false,
      priority: 30,
      is_active: true,
    },
    {
      id: "promo_expired20",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "EXPIRED20",
      promo_type: "manual",
      discount_type: "percent",
      discount_value: 2000,
      min_merchandise_subtotal_minor: 1000,
      starts_at: "2025-01-01T00:00:00.000Z",
      ends_at: "2025-12-31T00:00:00.000Z",
      is_stackable: true,
      priority: 40,
      is_active: true,
    },
  ];

  readonly promoRuleRegions: CheckoutPromoRuleRegionRow[] = [
    {
      promo_rule_id: "promo_auto5",
      country_code: "US",
      state: "CA",
      county: null,
      postal_code_prefix: "94",
      include_exclude: "include",
    },
  ];

  readonly promoRuleProducts: CheckoutPromoRuleProductRow[] = [
    {
      promo_rule_id: "promo_bundle10",
      product_id: null,
      category_id: "category_blind_box",
      include_exclude: "include",
    },
  ];

  readonly promoCompatibility: CheckoutPromoCompatibilityRow[] = [
    {
      promo_rule_id: "promo_auto5",
      compatible_promo_rule_id: "promo_bundle10",
      compatibility: "compatible",
    },
    {
      promo_rule_id: "promo_big20",
      compatible_promo_rule_id: "promo_auto5",
      compatibility: "exclusive",
    },
    {
      promo_rule_id: "promo_big20",
      compatible_promo_rule_id: "promo_bundle10",
      compatibility: "exclusive",
    },
  ];

  readonly promoEvaluations: CheckoutPromoEvaluationRow[] = [];

  readonly promoEvaluationLines: CheckoutPromoEvaluationLineRow[] = [];

  readonly resumeOrders: CheckoutResumeOrderRow[] = [];

  readonly resumeOrderItems: CheckoutResumeOrderItemRow[] = [];

  readonly resumePaymentSessions: CheckoutResumePaymentSessionRow[] = [];

  readonly centralInventory: CheckoutCentralInventoryRow[] = [];

  readonly resumeOperationLocks = new Map<string, string>();

  beforeNextDraftUpdate: (() => void) | null = null;

  async getProfileBySlug(slug: string): Promise<CheckoutProfileRow | null> {
    return this.profiles.find((profile) => profile.slug === slug) ?? null;
  }

  async getMarketByCode(code: string): Promise<CheckoutMarketRow | null> {
    return this.markets.find((market) => market.code === code) ?? null;
  }

  async getMarketById(id: string): Promise<CheckoutMarketRow | null> {
    return this.markets.find((market) => market.id === id) ?? null;
  }

  async findActiveGuestCart(
    cartPublicId: string,
  ): Promise<CheckoutCartRow | null> {
    return (
      this.carts.find(
        (cart) =>
          cart.cart_public_id === cartPublicId && cart.status === "active",
      ) ?? null
    );
  }

  async findActiveSignedInCart(input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly authUserId: string;
  }): Promise<CheckoutCartRow | null> {
    return (
      this.carts.find(
        (cart) =>
          cart.profile_id === input.profileId &&
          cart.market_id === input.marketId &&
          cart.auth_user_id === input.authUserId &&
          cart.status === "active",
      ) ?? null
    );
  }

  async findDraftByCartId(cartId: string): Promise<CheckoutDraftRow | null> {
    return (
      this.drafts.find(
        (draft) => draft.cart_id === cartId && draft.status === "draft",
      ) ?? null
    );
  }

  async getDraftById(id: string): Promise<CheckoutDraftRow | null> {
    return this.drafts.find((draft) => draft.id === id) ?? null;
  }

  async createDraft(draft: CheckoutDraftRow): Promise<CheckoutDraftRow> {
    this.drafts.push(draft);
    return draft;
  }

  async updateDraft(
    draftId: string,
    patch: Partial<CheckoutDraftRow>,
  ): Promise<CheckoutDraftRow> {
    const beforeUpdate = this.beforeNextDraftUpdate;
    this.beforeNextDraftUpdate = null;
    beforeUpdate?.();
    const index = this.drafts.findIndex((draft) => draft.id === draftId);
    if (index < 0) {
      throw new Error(`Missing draft ${draftId}`);
    }
    const updatedDraft = {
      ...this.drafts[index],
      ...patch,
    } as CheckoutDraftRow;
    this.drafts[index] = updatedDraft;
    return updatedDraft;
  }

  async listCartItems(cartId: string): Promise<readonly CheckoutCartItemRow[]> {
    return this.cartItems.filter((item) => item.cart_id === cartId);
  }

  async getResumeOrderForUser(input: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }): Promise<CheckoutResumeOrderRow | null> {
    return (
      this.resumeOrders.find(
        (order) =>
          order.auth_user_id === input.authUserId &&
          order.order_number === input.orderNumber,
      ) ?? null
    );
  }

  async claimPendingOrderResume(input: {
    readonly orderId: string;
    readonly authUserId: string;
    readonly lockToken: string;
    readonly lockExpiresAt: string;
  }): Promise<CheckoutResumeOrderRow | null> {
    const order = this.resumeOrders.find(
      (candidate) =>
        candidate.id === input.orderId &&
        candidate.auth_user_id === input.authUserId &&
        candidate.status === "pending",
    );
    if (!order || this.resumeOperationLocks.has(order.id)) {
      return null;
    }
    this.resumeOperationLocks.set(order.id, input.lockToken);
    return order;
  }

  async releasePendingOrderResume(input: {
    readonly orderId: string;
    readonly lockToken: string;
  }): Promise<void> {
    if (this.resumeOperationLocks.get(input.orderId) === input.lockToken) {
      this.resumeOperationLocks.delete(input.orderId);
    }
  }

  tryCapturePendingOrder(orderId: string): boolean {
    const order = this.resumeOrders.find(
      (candidate) => candidate.id === orderId && candidate.status === "pending",
    );
    if (!order || this.resumeOperationLocks.has(orderId)) {
      return false;
    }
    const index = this.resumeOrders.indexOf(order);
    this.resumeOrders[index] = { ...order, status: "paid" };
    return true;
  }

  async getPendingResumeOrderByCheckoutDraftId(
    checkoutDraftId: string,
  ): Promise<CheckoutResumeOrderRow | null> {
    return (
      this.resumeOrders.find(
        (order) =>
          order.checkout_draft_id === checkoutDraftId &&
          order.status === "pending",
      ) ?? null
    );
  }

  async listResumeOrderItems(
    orderId: string,
  ): Promise<readonly CheckoutResumeOrderItemRow[]> {
    return this.resumeOrderItems.filter((item) => item.order_id === orderId);
  }

  async listResumePaymentSessions(
    orderId: string,
  ): Promise<readonly CheckoutResumePaymentSessionRow[]> {
    return this.resumePaymentSessions.filter(
      (session) => session.order_id === orderId,
    );
  }

  async listCentralInventory(input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productIds: readonly string[];
  }): Promise<readonly CheckoutCentralInventoryRow[]> {
    return this.centralInventory.filter(
      (row) =>
        row.profile_id === input.profileId &&
        row.market_id === input.marketId &&
        input.productIds.includes(row.product_id),
    );
  }

  async listShippingOptions(
    marketId: string,
  ): Promise<readonly CheckoutShippingOptionRow[]> {
    return this.shippingOptions.filter(
      (option) => option.market_id === marketId,
    );
  }

  async listTaxRates(marketId: string): Promise<readonly CheckoutTaxRateRow[]> {
    return this.taxRates.filter((rate) => rate.market_id === marketId);
  }

  async listStoresByMarket(
    marketId: string,
  ): Promise<readonly CheckoutStoreRow[]> {
    return this.stores.filter(
      (store) => store.market_id === marketId && store.is_active,
    );
  }

  async getStoreById(storeId: string): Promise<CheckoutStoreRow | null> {
    return this.stores.find((store) => store.id === storeId) ?? null;
  }

  async listPickupDates(
    storeId: string,
  ): Promise<readonly CheckoutPickupDateRow[]> {
    return this.pickupDates.filter((date) => date.store_id === storeId);
  }

  async listStoreInventory(
    storeId: string,
  ): Promise<readonly CheckoutStoreInventoryRow[]> {
    return this.storeInventory.filter((row) => row.store_id === storeId);
  }

  async listPromoRules(input: {
    readonly profileId: string;
    readonly marketId: string;
  }): Promise<readonly CheckoutPromoRuleRow[]> {
    return this.promoRules.filter(
      (rule) =>
        rule.profile_id === input.profileId &&
        rule.market_id === input.marketId,
    );
  }

  async listPromoRuleRegions(input: {
    readonly profileId: string;
    readonly marketId: string;
  }): Promise<readonly CheckoutPromoRuleRegionRow[]> {
    return this.promoRuleRegions.filter((region) =>
      this.promoRules.some(
        (rule) =>
          rule.id === region.promo_rule_id &&
          rule.profile_id === input.profileId &&
          rule.market_id === input.marketId,
      ),
    );
  }

  async listPromoRuleProducts(input: {
    readonly profileId: string;
    readonly marketId: string;
  }): Promise<readonly CheckoutPromoRuleProductRow[]> {
    return this.promoRuleProducts.filter((product) =>
      this.promoRules.some(
        (rule) =>
          rule.id === product.promo_rule_id &&
          rule.profile_id === input.profileId &&
          rule.market_id === input.marketId,
      ),
    );
  }

  async listPromoCompatibility(input: {
    readonly profileId: string;
    readonly marketId: string;
  }): Promise<readonly CheckoutPromoCompatibilityRow[]> {
    return this.promoCompatibility.filter((compatibility) =>
      this.promoRules.some(
        (rule) =>
          rule.id === compatibility.promo_rule_id &&
          rule.profile_id === input.profileId &&
          rule.market_id === input.marketId,
      ),
    );
  }

  async getPromoEvaluationById(
    id: string,
  ): Promise<CheckoutPromoEvaluationRow | null> {
    return (
      this.promoEvaluations.find((evaluation) => evaluation.id === id) ?? null
    );
  }

  async createPromoEvaluation(
    evaluation: CheckoutPromoEvaluationRow,
    lines: readonly CheckoutPromoEvaluationLineRow[],
  ): Promise<CheckoutPromoEvaluationRow> {
    this.promoEvaluations.push(evaluation);
    this.promoEvaluationLines.push(...lines);
    return evaluation;
  }
}

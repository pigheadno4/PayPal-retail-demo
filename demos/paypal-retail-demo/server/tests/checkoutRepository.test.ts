import { describe, expect, it } from "vitest";

import {
  createSupabaseCheckoutRepository,
  type CheckoutCartItemRow,
  type CheckoutCartRow,
  type CheckoutDataSource,
  type CheckoutDraftRow,
  type CheckoutMarketRow,
  type CheckoutPickupDateRow,
  type CheckoutProfileRow,
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
});

function createRepository(dataSource: FakeCheckoutDataSource) {
  return createSupabaseCheckoutRepository({
    dataSource,
    now: "2026-06-01T10:00:00.000Z",
    createDraftId: () => "draft_new",
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
      quantity: 2,
      unit_price_minor_snapshot: 1399,
    },
    {
      id: "cart_item_dimoo",
      cart_id: "cart_guest",
      product_id: "product_dimoo",
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

  async getProfileBySlug(slug: string): Promise<CheckoutProfileRow | null> {
    return this.profiles.find((profile) => profile.slug === slug) ?? null;
  }

  async getMarketByCode(code: string): Promise<CheckoutMarketRow | null> {
    return this.markets.find((market) => market.code === code) ?? null;
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
}

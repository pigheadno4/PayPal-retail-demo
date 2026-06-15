import { describe, expect, it } from "vitest";

import {
  createSupabaseCartRepository,
  mapCartItemWriteToSupabaseInsert,
  type CartDataSource,
  type CartItemRow,
  type CartMarketRow,
  type CartProductRuleRow,
  type CartProfileRow,
  type CartRow,
} from "../src/repositories/cartRepository.js";

describe("Supabase-backed cart repository", () => {
  it("omits stale cart item IDs from Supabase replace inserts", () => {
    expect(
      mapCartItemWriteToSupabaseInsert("cart_guest", {
        id: "item_labubu",
        product_id: "product_labubu",
        quantity: 2,
        unit_price_minor_snapshot: 1399,
        updated_at: "2026-06-01T10:00:00.000Z",
      }),
    ).toEqual({
      cart_id: "cart_guest",
      product_id: "product_labubu",
      quantity: 2,
      unit_price_minor_snapshot: 1399,
      updated_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("creates an empty guest cart with an opaque browser binding", async () => {
    const dataSource = createCartDataSource();
    const repository = createRepository(dataSource);

    await expect(
      repository.getActiveCart({
        storefrontContext: { profileSlug: "popmart", marketCode: "US" },
        buyer: { kind: "guest" },
        guestCart: null,
      }),
    ).resolves.toEqual({
      cart: {
        id: "cart_new",
        cart_public_id: "cart_public_new",
        profile_id: "profile_popmart",
        market_id: "market_us",
        buyer_kind: "guest",
        status: "active",
        currency_code: "USD",
        items: [],
        totals: {
          item_count: 0,
          subtotal_minor: 0,
          currency_code: "USD",
        },
        binding: {
          cart_public_id: "cart_public_new",
          cart_client_secret: "cart_secret_new",
        },
      },
      adjustments: [],
    });
    expect(dataSource.carts).toContainEqual({
      id: "cart_new",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: null,
      cart_public_id: "cart_public_new",
      cart_secret_hash: "hash:cart_secret_new",
      status: "active",
      last_seen_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("adds released products to an existing guest cart with current prices and caps", async () => {
    const dataSource = createCartDataSource();
    dataSource.items.splice(
      0,
      dataSource.items.length,
      ...dataSource.items.filter((item) => item.product_id !== "product_dimoo"),
    );
    const repository = createRepository(dataSource);

    await expect(
      repository.addItem(
        {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_guest",
            cartClientSecret: "cart_secret_guest",
          },
        },
        {
          productId: "product_labubu",
          quantity: 3,
        },
      ),
    ).resolves.toEqual({
      cart: {
        id: "cart_guest",
        cart_public_id: "cart_public_guest",
        profile_id: "profile_popmart",
        market_id: "market_us",
        buyer_kind: "guest",
        status: "active",
        currency_code: "USD",
        items: [
          {
            id: "item_labubu",
            product_id: "product_labubu",
            slug: "labubu-have-a-seat",
            name: "Labubu Have a Seat",
            image_path: "/popmart/products/labubu-have-a-seat-1.webp",
            quantity: 5,
            unit_price_minor: 1399,
            line_subtotal_minor: 6995,
            checkout_eligible: true,
          },
        ],
        totals: {
          item_count: 5,
          subtotal_minor: 6995,
          currency_code: "USD",
        },
        binding: null,
      },
      adjustments: [
        {
          type: "quantity_capped",
          product_id: "product_labubu",
          option_key: null,
          requested_quantity: 7,
          final_quantity: 5,
          max_quantity: 5,
        },
      ],
    });
    expect(dataSource.items).toContainEqual({
      id: "item_labubu",
      cart_id: "cart_guest",
      product_id: "product_labubu",
      quantity: 5,
      unit_price_minor_snapshot: 1399,
      updated_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("merges a guest cart into the authenticated cart and marks the guest cart merged", async () => {
    const dataSource = createCartDataSource();
    const repository = createRepository(dataSource);

    await expect(
      repository.merge({
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
      }),
    ).resolves.toMatchObject({
      cart: {
        id: "cart_user",
        buyer_kind: "authenticated",
        items: [
          {
            product_id: "product_labubu",
            quantity: 5,
            unit_price_minor: 1399,
            checkout_eligible: true,
          },
          {
            product_id: "product_dimoo",
            quantity: 1,
            unit_price_minor: 1299,
            checkout_eligible: true,
          },
        ],
        totals: {
          item_count: 6,
          subtotal_minor: 8294,
          currency_code: "USD",
        },
        binding: null,
      },
      adjustments: [
        {
          type: "merged",
          product_id: "product_labubu",
          option_key: null,
          target_quantity: 2,
          incoming_quantity: 4,
          final_quantity: 5,
        },
        {
          type: "quantity_capped",
          product_id: "product_labubu",
          option_key: null,
          requested_quantity: 6,
          final_quantity: 5,
          max_quantity: 5,
        },
        {
          type: "appended",
          product_id: "product_dimoo",
          option_key: null,
          final_quantity: 1,
        },
        {
          type: "price_refreshed",
          product_id: "product_labubu",
          option_key: null,
          previous_price_minor: 1599,
          current_price_minor: 1399,
        },
      ],
    });
    expect(
      dataSource.carts.find((cart) => cart.id === "cart_guest")?.status,
    ).toBe("merged");
  });

  it("refreshes stale prices and keeps unreleased items blocked in the cart", async () => {
    const dataSource = createCartDataSource();
    dataSource.items.push({
      id: "item_future",
      cart_id: "cart_user",
      product_id: "product_future",
      quantity: 1,
      unit_price_minor_snapshot: 2499,
      updated_at: "2026-05-31T09:00:00.000Z",
    });
    const repository = createRepository(dataSource);

    await expect(
      repository.refresh(
        {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: {
            kind: "authenticated",
            userId: "user_buyer_123",
            email: "buyer@example.com",
          },
          guestCart: null,
        },
        {
          trigger: "checkout_start",
        },
      ),
    ).resolves.toMatchObject({
      cart: {
        id: "cart_user",
        items: [
          {
            product_id: "product_labubu",
            quantity: 2,
            unit_price_minor: 1399,
            line_subtotal_minor: 2798,
            checkout_eligible: true,
          },
          {
            product_id: "product_future",
            quantity: 1,
            unit_price_minor: 2499,
            line_subtotal_minor: 2499,
            checkout_eligible: false,
          },
        ],
        totals: {
          item_count: 3,
          subtotal_minor: 5297,
          currency_code: "USD",
        },
      },
      adjustments: [
        {
          type: "price_refreshed",
          product_id: "product_labubu",
          option_key: null,
          previous_price_minor: 1599,
          current_price_minor: 1399,
        },
        {
          type: "checkout_blocked",
          product_id: "product_future",
          option_key: null,
          reason: "not_purchasable",
        },
      ],
    });
    expect(
      dataSource.items.find((item) => item.id === "item_user_labubu")
        ?.unit_price_minor_snapshot,
    ).toBe(1399);
  });
});

function createRepository(dataSource: FakeCartDataSource) {
  return createSupabaseCartRepository({
    dataSource,
    now: "2026-06-01T10:00:00.000Z",
    createCartPublicId: () => "cart_public_new",
    createCartClientSecret: () => "cart_secret_new",
    hashCartClientSecret: (secret) => `hash:${secret}`,
  });
}

function createCartDataSource(): FakeCartDataSource {
  return new FakeCartDataSource();
}

class FakeCartDataSource implements CartDataSource {
  readonly profiles: CartProfileRow[] = [
    {
      id: "profile_popmart",
      slug: "popmart",
    },
  ];

  readonly markets: CartMarketRow[] = [
    {
      id: "market_us",
      code: "US",
      currency_code: "USD",
    },
  ];

  readonly carts: CartRow[] = [
    {
      id: "cart_guest",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: null,
      cart_public_id: "cart_public_guest",
      cart_secret_hash: "hash:cart_secret_guest",
      status: "active",
      last_seen_at: "2026-05-31T09:00:00.000Z",
    },
    {
      id: "cart_user",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: "user_buyer_123",
      cart_public_id: "cart_public_user",
      cart_secret_hash: null,
      status: "active",
      last_seen_at: "2026-05-31T09:00:00.000Z",
    },
  ];

  readonly items: CartItemRow[] = [
    {
      id: "item_labubu",
      cart_id: "cart_guest",
      product_id: "product_labubu",
      quantity: 4,
      unit_price_minor_snapshot: 1599,
      updated_at: "2026-05-31T09:00:00.000Z",
    },
    {
      id: "item_user_labubu",
      cart_id: "cart_user",
      product_id: "product_labubu",
      quantity: 2,
      unit_price_minor_snapshot: 1599,
      updated_at: "2026-05-31T08:00:00.000Z",
    },
    {
      id: "item_dimoo",
      cart_id: "cart_guest",
      product_id: "product_dimoo",
      quantity: 1,
      unit_price_minor_snapshot: 1299,
      updated_at: "2026-05-31T09:10:00.000Z",
    },
  ];

  readonly rules: CartProductRuleRow[] = [
    {
      product_id: "product_labubu",
      slug: "labubu-have-a-seat",
      name: "Labubu Have a Seat",
      image_path: "/popmart/products/labubu-have-a-seat-1.webp",
      currency_code: "USD",
      current_price_minor: 1399,
      max_quantity_per_order: 5,
      is_purchasable: true,
    },
    {
      product_id: "product_dimoo",
      slug: "dimoo-world",
      name: "DIMOO World",
      image_path: "/popmart/products/dimoo-world-1.webp",
      currency_code: "USD",
      current_price_minor: 1299,
      max_quantity_per_order: 2,
      is_purchasable: true,
    },
    {
      product_id: "product_future",
      slug: "skullpanda-future-drop",
      name: "SKULLPANDA Future Drop",
      image_path: "/popmart/products/skullpanda-future-drop-1.webp",
      currency_code: "USD",
      current_price_minor: 2499,
      max_quantity_per_order: 5,
      is_purchasable: false,
    },
  ];

  async getProfileBySlug(slug: string): Promise<CartProfileRow | null> {
    return this.profiles.find((profile) => profile.slug === slug) ?? null;
  }

  async getMarketByCode(code: string): Promise<CartMarketRow | null> {
    return this.markets.find((market) => market.code === code) ?? null;
  }

  async findActiveGuestCart(cartPublicId: string): Promise<CartRow | null> {
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
  }): Promise<CartRow | null> {
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

  async createCart(input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly authUserId: string | null;
    readonly cartPublicId: string;
    readonly cartSecretHash: string | null;
    readonly now: string;
  }): Promise<CartRow> {
    const cart: CartRow = {
      id: input.cartPublicId === "cart_public_new" ? "cart_new" : "cart_extra",
      profile_id: input.profileId,
      market_id: input.marketId,
      auth_user_id: input.authUserId,
      cart_public_id: input.cartPublicId,
      cart_secret_hash: input.cartSecretHash,
      status: "active",
      last_seen_at: input.now,
    };
    this.carts.push(cart);
    return cart;
  }

  async touchCart(cartId: string, now: string): Promise<void> {
    const cart = this.carts.find((row) => row.id === cartId);
    if (cart) {
      cart.last_seen_at = now;
    }
  }

  async listCartItems(cartId: string): Promise<readonly CartItemRow[]> {
    return this.items.filter((item) => item.cart_id === cartId);
  }

  async listProductRules(input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productIds: readonly string[];
  }): Promise<readonly CartProductRuleRow[]> {
    return this.rules.filter((rule) =>
      input.productIds.includes(rule.product_id),
    );
  }

  async replaceCartItems(
    cartId: string,
    items: readonly Omit<CartItemRow, "id" | "cart_id">[],
  ): Promise<readonly CartItemRow[]> {
    const existingItems = this.items.filter((item) => item.cart_id === cartId);
    this.items.splice(
      0,
      this.items.length,
      ...this.items.filter((item) => item.cart_id !== cartId),
    );
    const replacementItems = items.map((item) => {
      const existing = existingItems.find(
        (existingItem) => existingItem.product_id === item.product_id,
      );
      return {
        ...item,
        id: existing?.id ?? `item_${item.product_id}`,
        cart_id: cartId,
      };
    });
    this.items.push(...replacementItems);
    return replacementItems;
  }

  async markCartMerged(cartId: string): Promise<void> {
    const cart = this.carts.find((row) => row.id === cartId);
    if (cart) {
      cart.status = "merged";
    }
  }
}

import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import {
  createInMemoryActiveStorefrontContextStore,
  type ActiveStorefrontContextStore,
} from "../src/state/storefrontContext.js";
import type {
  CartApiResponse,
  CartOperationContext,
  CartRepository,
} from "../src/routes/cart.js";
import { requestApp } from "./helpers/requestApp.js";

describe("cart routes", () => {
  it("returns or creates the active guest cart for the active storefront context", async () => {
    const repository = createCartRepository();
    const app = createCartApp(repository);

    const response = await requestApp(app, "GET", "/api/cart");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: emptyCartResponse(),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([
      {
        method: "getActiveCart",
        context: {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: { kind: "guest" },
          guestCart: null,
        },
      },
    ]);
  });

  it("adds, updates, and deletes cart items with guest cart binding headers", async () => {
    const repository = createCartRepository();
    const app = createCartApp(repository);
    const guestHeaders = {
      "x-cart-id": "cart_public_existing",
      "x-cart-secret": "cart_secret_existing",
    };

    const addResponse = await requestApp(
      app,
      "POST",
      "/api/cart/items?market=gb",
      {
        headers: guestHeaders,
        json: {
          product_id: "product_labubu",
          quantity: 2,
        },
      },
    );
    const updateResponse = await requestApp(
      app,
      "PATCH",
      "/api/cart/items/cart_item_1",
      {
        headers: guestHeaders,
        json: {
          quantity: 3,
        },
      },
    );
    const deleteResponse = await requestApp(
      app,
      "DELETE",
      "/api/cart/items/cart_item_1",
      {
        headers: guestHeaders,
      },
    );

    expect(addResponse.status).toBe(200);
    expect(addResponse.json).toEqual({
      ok: true,
      data: cartWithItemResponse(2),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.json).toEqual({
      ok: true,
      data: cartWithItemResponse(3),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.json).toEqual({
      ok: true,
      data: emptyCartResponse(),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([
      {
        method: "addItem",
        context: {
          storefrontContext: { profileSlug: "popmart", marketCode: "GB" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_existing",
            cartClientSecret: "cart_secret_existing",
          },
        },
        input: {
          productId: "product_labubu",
          quantity: 2,
        },
      },
      {
        method: "updateItem",
        context: {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_existing",
            cartClientSecret: "cart_secret_existing",
          },
        },
        input: {
          itemId: "cart_item_1",
          quantity: 3,
        },
      },
      {
        method: "removeItem",
        context: {
          storefrontContext: { profileSlug: "popmart", marketCode: "US" },
          buyer: { kind: "guest" },
          guestCart: {
            cartPublicId: "cart_public_existing",
            cartClientSecret: "cart_secret_existing",
          },
        },
        input: {
          itemId: "cart_item_1",
        },
      },
    ]);
  });

  it("merges and refreshes carts for authenticated buyers", async () => {
    const repository = createCartRepository();
    const app = createCartApp(repository);
    const headers = {
      authorization: "Bearer buyer-token",
      "x-cart-id": "cart_public_guest",
      "x-cart-secret": "cart_secret_guest",
    };

    const mergeResponse = await requestApp(app, "POST", "/api/cart/merge", {
      headers,
    });
    const refreshResponse = await requestApp(app, "POST", "/api/cart/refresh", {
      headers,
      json: {
        trigger: "checkout_start",
      },
    });

    expect(mergeResponse.status).toBe(200);
    expect(mergeResponse.json).toEqual({
      ok: true,
      data: {
        ...cartWithItemResponse(4),
        adjustments: [
          {
            type: "merged",
            product_id: "product_labubu",
            final_quantity: 4,
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.json).toEqual({
      ok: true,
      data: {
        ...cartWithItemResponse(4),
        adjustments: [
          {
            type: "price_refreshed",
            product_id: "product_labubu",
            current_price_minor: 1399,
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([
      {
        method: "merge",
        context: authenticatedContext(),
      },
      {
        method: "refresh",
        context: authenticatedContext(),
        input: {
          trigger: "checkout_start",
        },
      },
    ]);
  });

  it("returns buyer-safe validation errors for invalid quantity or refresh trigger", async () => {
    const repository = createCartRepository();
    const app = createCartApp(repository);

    const invalidQuantity = await requestApp(app, "POST", "/api/cart/items", {
      json: {
        product_id: "product_labubu",
        quantity: 0,
      },
    });
    const invalidTrigger = await requestApp(app, "POST", "/api/cart/refresh", {
      json: {
        trigger: "random_stage",
      },
    });

    expect(invalidQuantity.status).toBe(400);
    expect(invalidQuantity.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CART_ITEM_REQUEST",
        message: "A valid product_id and positive quantity are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(invalidTrigger.status).toBe(400);
    expect(invalidTrigger.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_CART_REFRESH_REQUEST",
        message: "A supported cart refresh trigger is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.calls).toEqual([]);
  });
});

function createCartApp(
  repository: CartRepository & { readonly calls: unknown[] },
  activeStorefrontContextStore: ActiveStorefrontContextStore = createInMemoryActiveStorefrontContextStore(),
) {
  return createApp({
    cart: {
      cartRepository: repository,
      authVerifier: createAuthVerifier(),
      activeStorefrontContextStore,
    },
  });
}

function createCartRepository(): CartRepository & { readonly calls: unknown[] } {
  const calls: unknown[] = [];

  return {
    calls,
    async getActiveCart(context) {
      calls.push({ method: "getActiveCart", context });
      return emptyCartResponse();
    },
    async addItem(context, input) {
      calls.push({ method: "addItem", context, input });
      return cartWithItemResponse(input.quantity);
    },
    async updateItem(context, input) {
      calls.push({ method: "updateItem", context, input });
      return cartWithItemResponse(input.quantity);
    },
    async removeItem(context, input) {
      calls.push({ method: "removeItem", context, input });
      return emptyCartResponse();
    },
    async merge(context) {
      calls.push({ method: "merge", context });
      return {
        ...cartWithItemResponse(4),
        adjustments: [
          {
            type: "merged",
            product_id: "product_labubu",
            final_quantity: 4,
          },
        ],
      };
    },
    async refresh(context, input) {
      calls.push({ method: "refresh", context, input });
      return {
        ...cartWithItemResponse(4),
        adjustments: [
          {
            type: "price_refreshed",
            product_id: "product_labubu",
            current_price_minor: 1399,
          },
        ],
      };
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

function authenticatedContext(): {
  readonly context: CartOperationContext;
  readonly method: string;
}["context"] {
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

function emptyCartResponse(): CartApiResponse {
  return {
    cart: {
      id: "cart_guest_us",
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
  };
}

function cartWithItemResponse(quantity: number): CartApiResponse {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: "cart_public_existing",
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: "guest",
      status: "active",
      currency_code: "USD",
      items: [
        {
          id: "cart_item_1",
          product_id: "product_labubu",
          slug: "labubu-have-a-seat",
          name: "Labubu Have a Seat",
          image_path: "/popmart/products/labubu-have-a-seat-1.webp",
          quantity,
          unit_price_minor: 1399,
          line_subtotal_minor: 1399 * quantity,
          checkout_eligible: true,
        },
      ],
      totals: {
        item_count: quantity,
        subtotal_minor: 1399 * quantity,
        currency_code: "USD",
      },
      binding: null,
    },
    adjustments: [],
  };
}

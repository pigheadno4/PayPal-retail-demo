import { describe, expect, it } from "vitest";

import {
  addProductToCartQuantity,
  buildCartPayLaterMessage,
  calculateCartMerchandiseTotalCents,
  reconcileCartDataFromApiResponse,
  type CartData,
} from "./cartModel.js";

describe("cartModel", () => {
  it("calculates merchandise totals from item quantities without shipping", () => {
    const cart = cartData();

    expect(calculateCartMerchandiseTotalCents(cart)).toBe(2598);
    expect(
      calculateCartMerchandiseTotalCents(cart, {
        "labubu-have-a-seat": 3,
      }),
    ).toBe(5196);
  });

  it("builds amount-aware Pay Later copy from the current cart amount", () => {
    const cart = cartData();

    expect(buildCartPayLaterMessage(cart)).toContain("$25.98");
    expect(
      buildCartPayLaterMessage(cart, {
        "hirono-little-mischief": 3,
      }),
    ).toContain("$51.96");
  });

  it("adds API PDP products that are not already in the cart", () => {
    const nextCart = addProductToCartQuantity(
      cartData(),
      {
        slug: "blind-boxes-2",
        name: "Molly Blind Boxes 2",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 collectible",
        unitPriceCents: 1969,
        currentPriceLabel: "$19.69",
        regularPriceLabel: "$19.69",
        maxQuantity: 12,
        href: "/products/blind-boxes-2",
      },
      12,
    );

    const addedItem = nextCart.items.find(
      (item) => item.slug === "blind-boxes-2",
    );

    expect(addedItem).toMatchObject({
      name: "Molly Blind Boxes 2",
      quantity: 12,
      unitPriceCents: 1969,
      imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
    });
    expect(buildCartPayLaterMessage(nextCart)).toContain("$262.26");
  });

  it("lets whole-box PDP options exceed a stale server cart max quantity", () => {
    const nextCart = addProductToCartQuantity(
      {
        ...cartData(),
        items: [
          {
            id: "cart_item_molly",
            productId: "product_molly",
            slug: "blind-boxes-2",
            name: "Molly Blind Boxes 2",
            categoryName: "Blind Boxes",
            imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
            imageAlt: "Molly Blind Boxes 2 collectible",
            unitPriceCents: 1969,
            currentPriceLabel: "$19.69",
            regularPriceLabel: "$19.69",
            quantity: 1,
            maxQuantity: 5,
            href: "/products/blind-boxes-2",
          },
        ],
      },
      {
        slug: "blind-boxes-2",
        name: "Molly Blind Boxes 2",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 collectible",
        unitPriceCents: 1969,
        currentPriceLabel: "$19.69",
        regularPriceLabel: "$19.69",
        maxQuantity: 12,
        href: "/products/blind-boxes-2",
      },
      12,
    );

    expect(nextCart.items[0]).toMatchObject({
      quantity: 13,
      maxQuantity: 13,
    });
    expect(buildCartPayLaterMessage(nextCart)).toContain("$255.97");
  });

  it("maps backend cart response items into buyer cart data", () => {
    const cart = cartData();

    const reconciled = reconcileCartDataFromApiResponse(cart, {
      cart: {
        cart_public_id: "cart_public_guest",
        currency_code: "USD",
        binding: {
          cart_public_id: "cart_public_guest",
          cart_client_secret: "cart_secret_guest",
        },
        items: [
          {
            id: "cart_item_1",
            product_id: "product_labubu",
            slug: "labubu-have-a-seat",
            name: "Labubu Have a Seat",
            image_path: "/assets/popmart/products/labubu-refreshed.webp",
            quantity: 3,
            unit_price_minor: 1099,
            line_subtotal_minor: 3297,
            checkout_eligible: false,
          },
        ],
      },
      adjustments: [
        {
          type: "checkout_blocked",
          product_id: "product_labubu",
          reason: "not_purchasable",
        },
      ],
    });

    expect(reconciled.cartPublicId).toBe("cart_public_guest");
    expect(reconciled.cartClientSecret).toBe("cart_secret_guest");
    expect(reconciled.items).toEqual([
      {
        id: "cart_item_1",
        productId: "product_labubu",
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-refreshed.webp",
        imageAlt: "Labubu Have a Seat collectible",
        unitPriceCents: 1099,
        currentPriceLabel: "$10.99",
        regularPriceLabel: "$10.99",
        quantity: 3,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
        checkoutEligible: false,
        unavailableReason: "This item is not available for checkout yet.",
      },
    ]);
    expect(buildCartPayLaterMessage(reconciled)).toContain("$32.97");
  });

  it("drops guest cart secrets when the backend returns an authenticated cart", () => {
    const cart = {
      ...cartData(),
      cartPublicId: "cart_public_guest",
      cartClientSecret: "cart_secret_guest",
    };

    const reconciled = reconcileCartDataFromApiResponse(cart, {
      cart: {
        cart_public_id: "cart_public_user",
        buyer_kind: "authenticated",
        currency_code: "USD",
        binding: null,
        items: [],
      },
      adjustments: [],
    });

    expect(reconciled.cartPublicId).toBe("cart_public_user");
    expect(reconciled.cartClientSecret).toBeUndefined();
  });

  it("drops a guest cart secret when the API switches cart IDs without returning a new binding", () => {
    const cart = {
      ...cartData(),
      cartPublicId: "cart_public_old",
      cartClientSecret: "cart_secret_old",
    };

    const reconciled = reconcileCartDataFromApiResponse(cart, {
      cart: {
        cart_public_id: "cart_public_new",
        buyer_kind: "guest",
        currency_code: "USD",
        binding: null,
        items: [],
      },
      adjustments: [],
    });

    expect(reconciled.cartPublicId).toBe("cart_public_new");
    expect(reconciled.cartClientSecret).toBeUndefined();
  });
});

function cartData(): CartData {
  return {
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: "USD",
    locale: "en-US",
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [
      {
        id: "cart_item_1",
        productId: "product_labubu",
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        unitPriceCents: 1299,
        currentPriceLabel: "$12.99",
        regularPriceLabel: "$13.99",
        quantity: 1,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
      },
      {
        id: "cart_item_2",
        productId: "product_hirono",
        slug: "hirono-little-mischief",
        name: "Hirono Little Mischief",
        categoryName: "Plush",
        imagePath: "/assets/popmart/products/hirono-little-mischief-1.svg",
        imageAlt: "Hirono Little Mischief collectible",
        unitPriceCents: 1299,
        currentPriceLabel: "$12.99",
        regularPriceLabel: "$12.99",
        quantity: 1,
        maxQuantity: 3,
        href: "/products/hirono-little-mischief",
      },
    ],
  };
}

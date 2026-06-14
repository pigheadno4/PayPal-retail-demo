import { describe, expect, it } from "vitest";

import {
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

  it("maps backend cart response items into buyer cart data", () => {
    const cart = cartData();

    const reconciled = reconcileCartDataFromApiResponse(cart, {
      cart: {
        cart_public_id: "cart_public_guest",
        currency_code: "USD",
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
        regularPriceLabel: "$13.99",
        quantity: 3,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
        checkoutEligible: false,
        unavailableReason: "This item is not available for checkout yet.",
      },
    ]);
    expect(buildCartPayLaterMessage(reconciled)).toContain("$32.97");
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

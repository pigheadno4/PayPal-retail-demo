import { describe, expect, it } from "vitest";

import {
  buildCartPayLaterMessage,
  calculateCartMerchandiseTotalCents,
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

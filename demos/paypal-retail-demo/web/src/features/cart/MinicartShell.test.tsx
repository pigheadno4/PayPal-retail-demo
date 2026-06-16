// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { MinicartShell } from "./MinicartShell.js";
import type { CartData } from "./cartModel.js";

describe("MinicartShell", () => {
  it("renders item summary, amount-aware Pay Later, cart/checkout actions, delivery express, and pickup hint", () => {
    const html = renderToStaticMarkup(
      <MinicartShell state="open" cart={cartData()} />,
    );

    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("2 items");
    expect(html).toContain(
      "Flexible payment options may be available for $25.98",
    );
    expect(html).toContain('href="/cart"');
    expect(html).toContain('href="/checkout"');
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain('data-fulfillment-mode="delivery"');
    expect(html).toContain(
      "Prefer pickup? Choose store pickup during checkout.",
    );
    expect(html).not.toContain("Choose pickup store");
  });

  it("sends minicart quantity changes through the shared quantity callback", async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();

    render(
      <MinicartShell
        state="open"
        cart={cartData()}
        onQuantityChange={onQuantityChange}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );

    expect(onQuantityChange).toHaveBeenCalledWith(
      "labubu-have-a-seat",
      2,
      "labubu-have-a-seat",
    );
  });

  it("makes the offscreen closed minicart inert", () => {
    const html = renderToStaticMarkup(
      <MinicartShell state="closed" cart={cartData()} />,
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("inert");
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

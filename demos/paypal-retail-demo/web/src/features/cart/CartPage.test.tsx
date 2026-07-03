import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CartPage } from "./CartPage.js";
import type { CartData } from "./cartModel.js";

describe("CartPage", () => {
  it("renders full cart items, quantity controls, amount-aware Pay Later, delivery express, checkout action, and pickup hint", () => {
    const html = renderToStaticMarkup(<CartPage data={cartData()} />);

    expect(html).toContain("<h1>Bag</h1>");
    expect(html).toContain("2 items");
    expect(html).toContain("$25.98 subtotal");
    expect(html).toContain('data-visual-accent-scope="cart"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain('aria-label="Decrease Labubu Have a Seat quantity"');
    expect(html).toContain('aria-label="Increase Labubu Have a Seat quantity"');
    expect(html).toContain('aria-label="Labubu Have a Seat quantity"');
    expect(html).toContain("Line total $12.99");
    expect(html).toMatch(
      /<div[^>]*data-slot="card"[^>]*class="[^"]*cart-summary/,
    );
    expect(html).toContain('data-visual-accent="commerce-summary"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-slot="card-footer"');
    expect(html).toContain('data-slot="separator"');
    expect(html).toMatch(
      /<span[^>]*data-slot="badge"[^>]*data-variant="secondary"[^>]*>Blind Boxes<\/span>/,
    );
    expect(html).toContain("Shipping");
    expect(html).toContain("Calculated after Delivery/Pickup");
    expect(html).toContain("Promo / estimated tax");
    expect(html).toContain("Calculated in checkout");
    expect(html).toContain("Cart subtotal");
    expect(html).toContain(
      "Checkout total updates after Delivery/Pickup, promo, and tax are confirmed.",
    );
    expect(html).toContain(
      "Flexible payment options may be available for $25.98",
    );
    expect(html).toContain('href="/checkout"');
    expect(html).toMatch(
      /<a href="\/checkout"[^>]*data-slot="button"[^>]*data-variant="default"[^>]*data-size="default"/,
    );
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain('data-slot="field-set"');
    expect(html).toMatch(
      /<fieldset[^>]*data-slot="field-set"[^>]*class="[^"]*cart-paypal-frame/,
    );
    expect(html).toContain('data-slot="field-legend"');
    expect(html).toContain("Secured by PayPal");
    expect(html).toContain('data-fulfillment-mode="delivery"');
    expect(html).toContain('data-slot="button"');
    expect(html).toContain(
      "Prefer pickup? Choose store pickup during checkout.",
    );
    expect(html).not.toContain("Choose pickup store");
  });

  it("suppresses checkout and PayPal controls when the cart is empty", () => {
    const html = renderToStaticMarkup(
      <CartPage data={{ ...cartData(), items: [] }} />,
    );

    expect(html).toContain("0 items");
    expect(html).toContain("Your cart is empty");
    expect(html).toContain("Shipping");
    expect(html).toContain("Calculated after Delivery/Pickup");
    expect(html).toContain('href="/products"');
    expect(html).toMatch(
      /<a href="\/products"[^>]*data-slot="button"[^>]*data-variant="outline"/,
    );
    expect(html).not.toContain("Pay Later with PayPal");
    expect(html).not.toContain("Secured by PayPal");
    expect(html).not.toContain('href="/checkout"');
    expect(html).not.toContain('data-fulfillment-mode="delivery"');
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

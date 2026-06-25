// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { MinicartShell } from "./MinicartShell.js";
import type { CartData } from "./cartModel.js";

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

describe("MinicartShell", () => {
  beforeAll(() => {
    globalThis.ResizeObserver =
      TestResizeObserver as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the open minicart as a controlled shadcn sheet", () => {
    render(<MinicartShell state="open" cart={cartData()} onClose={() => {}} />);

    const minicart = screen.getByLabelText("Minicart");

    expect(minicart.getAttribute("data-slot")).toBe("sheet-content");
    expect(minicart.getAttribute("data-side")).toBe("right");
    expect(minicart.getAttribute("data-panel-state")).toBe("open");
    expect(minicart.getAttribute("data-visual-separation")).toBe(
      "minicart-drawer",
    );
    expect(minicart.className).toContain("minicart-shell");
    expect(
      minicart.querySelector('[data-slot="sheet-title"]')?.textContent,
    ).toBe("Cart");
    expect(
      minicart.querySelector('[data-slot="sheet-description"]')?.textContent,
    ).toBe("2 items");
    expect(
      within(minicart).getByRole("button", { name: "Close minicart" }),
    ).toBeTruthy();
    expect(
      within(minicart).getByRole("button", { name: "Close minicart" })
        .textContent,
    ).not.toContain("Close");
    expect(
      within(minicart)
        .getByRole("button", { name: "Close minicart" })
        .querySelector("svg"),
    ).toBeTruthy();
  });

  it("closes the minicart when the buyer clicks outside the drawer", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<MinicartShell state="open" cart={cartData()} onClose={onClose} />);

    const overlay = document.querySelector('[data-slot="sheet-overlay"]');
    expect(overlay).toBeTruthy();
    expect((overlay as HTMLElement).className).toContain(
      "minicart-shell__overlay",
    );

    await user.click(overlay as HTMLElement);

    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders item summary, amount-aware Pay Later, cart/checkout actions, delivery express, and pickup hint", () => {
    render(<MinicartShell state="open" cart={cartData()} />);

    const minicart = screen.getByLabelText("Minicart");
    const html = minicart.outerHTML;

    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain('data-slot="sheet-content"');
    expect(html).toContain('data-slot="scroll-area"');
    expect(html).toContain('aria-label="Minicart items"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("2 items");
    expect(
      minicart.querySelector('[data-slot="badge"][data-variant="secondary"]')
        ?.textContent,
    ).toBe("Blind Boxes");
    expect(html).toContain(
      "Flexible payment options may be available for $25.98",
    );
    expect(html).toContain('aria-label="Minicart checkout"');
    expect(html).toContain('aria-label="Minicart summary"');
    expect(html).toContain("Shipping");
    expect(html).toContain("Selected at checkout");
    expect(html).toContain("Promo / estimated tax");
    expect(html).toContain("Cart subtotal");
    expect(html).toContain('href="/cart"');
    expect(html).toContain('href="/checkout"');
    expect(html).toMatch(
      /<a href="\/checkout"[^>]*data-slot="button"[^>]*data-variant="default"[^>]*data-size="default"/,
    );
    expect(html.indexOf('href="/checkout"')).toBeLessThan(
      html.indexOf('href="/cart"'),
    );
    expect(html).toMatch(
      /<a href="\/cart"[^>]*data-slot="button"[^>]*data-variant="outline"[^>]*data-size="default"/,
    );
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain('data-slot="field-set"');
    expect(html).toMatch(
      /<fieldset[^>]*data-slot="field-set"[^>]*class="[^"]*cart-paypal-frame[^"]*cart-paypal-frame--mini/,
    );
    expect(html).toContain('data-slot="field-legend"');
    expect(html).toContain("Secured by PayPal");
    expect(html).toContain('data-fulfillment-mode="delivery"');
    expect(html).toContain(
      'class="cart-express-actions cart-express-actions--stacked"',
    );
    expect(html).toContain(
      "Prefer pickup? Choose store pickup during checkout.",
    );
    expect(html).not.toContain("Choose pickup store");
  });

  it("keeps empty minicarts out of checkout and express payment flows", () => {
    render(<MinicartShell state="open" cart={{ ...cartData(), items: [] }} />);

    const minicart = screen.getByLabelText("Minicart");
    const html = minicart.outerHTML;

    expect(html).toContain("0 items");
    expect(html).toContain("Your cart is empty");
    expect(html).toContain('data-slot="scroll-area"');
    expect(html).toContain('aria-label="Minicart items"');
    expect(html).toContain('href="/products"');
    expect(html).toMatch(
      /<a href="\/products"[^>]*data-slot="button"[^>]*data-variant="outline"/,
    );
    expect(html).not.toContain("Pay Later with PayPal");
    expect(html).not.toContain('aria-label="Minicart checkout"');
    expect(html).not.toContain("Secured by PayPal");
    expect(html).not.toContain('href="/checkout"');
    expect(html).not.toContain('data-fulfillment-mode="delivery"');
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

  it("keeps closed minicarts unmounted from the accessible drawer surface", () => {
    render(<MinicartShell state="closed" cart={cartData()} />);

    expect(document.querySelector(".minicart-shell")).toBeNull();
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

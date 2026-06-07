// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { CartData } from "../features/cart/cartModel.js";
import type { ProductDetailPageData } from "../features/catalog/ProductDetailPage.js";
import { App } from "./App.js";

afterEach(() => {
  cleanup();
});

describe("App buyer interactions", () => {
  it("adds a PDP item to the shared cart state and opens the minicart", async () => {
    const user = userEvent.setup();

    render(
      <App
        initialPathname="/products/labubu-have-a-seat"
        initialCart={singleItemCart({ quantity: 1 })}
        initialProductPages={{
          "labubu-have-a-seat": releasedProduct(),
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    const minicart = screen.getByLabelText("Minicart");
    expect(minicart.getAttribute("data-panel-state")).toBe("open");
    expect(within(minicart).getByText("2 items")).toBeTruthy();
    expect(within(minicart).getByText("Qty 2 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $27.98 at checkout.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("status").textContent).toContain(
      "Added Labubu Have a Seat to cart.",
    );
  });

  it("shares full-cart quantity changes with the minicart and Pay Later amount", async () => {
    const user = userEvent.setup();

    render(
      <App
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Open minicart" }));

    const minicart = screen.getByLabelText("Minicart");
    expect(minicart.getAttribute("data-panel-state")).toBe("open");
    expect(within(minicart).getByText("2 items")).toBeTruthy();
    expect(within(minicart).getByText("Qty 2 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $27.98 at checkout.",
      ),
    ).toBeTruthy();
  });
});

function singleItemCart({ quantity }: { readonly quantity: number }): CartData {
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
        unitPriceCents: 1399,
        currentPriceLabel: "$13.99",
        regularPriceLabel: "$15.99",
        quantity,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
      },
    ],
  };
}

function releasedProduct(): ProductDetailPageData {
  return {
    slug: "labubu-have-a-seat",
    name: "Labubu Have a Seat",
    categoryName: "Blind Boxes",
    seriesName: "THE MONSTERS",
    statusLabel: "Released",
    purchasable: true,
    currentPriceLabel: "$13.99",
    regularPriceLabel: "$15.99",
    introduction:
      "A cozy seated Labubu blind box with soft shelf presence and collectible surprise energy.",
    details: [
      {
        label: "Material",
        value: "PVC / ABS",
      },
    ],
    gallery: [
      {
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat front view",
      },
    ],
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available for $13.99 at checkout.",
    },
    reviews: [],
  };
}

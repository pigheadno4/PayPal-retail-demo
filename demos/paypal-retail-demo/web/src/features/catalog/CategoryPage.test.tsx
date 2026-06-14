import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CategoryPage, type CategoryPageData } from "./CategoryPage.js";

describe("CategoryPage", () => {
  it("renders catalog filters, category switcher, applied filter count, and reset action", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );

    expect(html).toContain("All products");
    expect(html).toContain("All options");
    expect(html).toContain("2 filters applied");
    expect(html).toContain("Reset filters");
    expect(html).toContain("Price");
    expect(html).toContain("Availability");
    expect(html).toContain("Series");
    expect(html).toContain("Release status");
    expect(html).toContain("Pickup");
    expect(html).not.toContain("Search products");
  });

  it("keeps category Pay Later promotion amount-free", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const payLaterSection =
      html.match(/<section class="catalog-paylater"[\s\S]*?<\/section>/)?.[0] ??
      "";

    expect(payLaterSection).toContain("Pay Later with PayPal");
    expect(payLaterSection).not.toContain("$");
    expect(payLaterSection).not.toContain("£");
    expect(payLaterSection).not.toContain("interest-free installments of");
  });

  it("shows a pickup filter hint when no buyer location is available", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );

    expect(html).toContain("Add a ZIP or sign in to check pickup filters.");
    expect(html).toContain('aria-disabled="true"');
  });

  it("renders filtered products with PDP links, status, pickup, and descriptive image alt text", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );

    expect(html).toContain('href="/products/labubu-have-a-seat"');
    expect(html).toContain('alt="Labubu Have a Seat collectible"');
    expect(html).toContain("Released");
    expect(html).toContain("Pickup eligible");
    expect(html).toContain("$13.99");
  });
});

function categoryPageData(): CategoryPageData {
  return {
    title: "All products",
    subtitle: "Filter collectible drops by series, status, and availability.",
    resultCountLabel: "3 products",
    appliedFilterCount: 2,
    resetHref: "/products",
    categorySwitcher: {
      label: "Category",
      options: [
        {
          label: "All options",
          href: "/products",
          active: true,
          countLabel: "25",
        },
        {
          label: "Blind Boxes",
          href: "/products?category=blind-boxes",
          active: false,
          countLabel: "12",
        },
      ],
    },
    filters: [
      {
        label: "Price",
        options: [
          {
            label: "Under $20",
            href: "/products?price=under-20",
            active: true,
            countLabel: "8",
          },
        ],
      },
      {
        label: "Availability",
        options: [
          {
            label: "In stock",
            href: "/products?availability=in-stock",
            active: true,
            countLabel: "10",
          },
        ],
      },
      {
        label: "Series",
        options: [
          {
            label: "THE MONSTERS",
            href: "/products?series=the-monsters",
            active: false,
            countLabel: "9",
          },
        ],
      },
      {
        label: "Release status",
        options: [
          {
            label: "Released",
            href: "/products?release_status=released",
            active: false,
            countLabel: "17",
          },
        ],
      },
      {
        label: "Pickup",
        disabledReason: "Add a ZIP or sign in to check pickup filters.",
        options: [
          {
            label: "Pickup eligible",
            href: "/products?pickup_available=true",
            active: false,
            countLabel: "6",
          },
        ],
      },
    ],
    payLaterPromo: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available at checkout.",
    },
    products: [
      {
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        priceLabel: "$13.99",
        regularPriceLabel: "$13.99",
        statusLabel: "Released",
        pickupLabel: "Pickup eligible",
        href: "/products/labubu-have-a-seat",
      },
    ],
  };
}

// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { CategoryPage, type CategoryPageData } from "./CategoryPage.js";

describe("CategoryPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders catalog filters, category switcher, applied filter count, and reset action", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );

    expect(html).toContain("All products");
    expect(html).not.toContain(
      "Filter collectible drops by series, status, and availability.",
    );
    expect(html).toContain("All options");
    expect(html).toContain("2 filters applied");
    expect(html).toContain("Reset filters");
    expect(html).toContain("Price");
    expect(html).toContain("Availability");
    expect(html).not.toContain("Search products");
    expect(html).not.toContain('class="catalog-filters"');
  });

  it("renders reference-level applied filter chips and sort controls above products", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const controlsIndex = html.indexOf('class="catalog-shop-controls"');
    const payLaterIndex = html.indexOf('class="catalog-paylater"');
    const productGridIndex = html.indexOf('class="catalog-product-section"');

    expect(controlsIndex).toBeGreaterThan(-1);
    expect(payLaterIndex).toBeGreaterThan(-1);
    expect(productGridIndex).toBeGreaterThan(-1);
    expect(controlsIndex).toBeLessThan(payLaterIndex);
    expect(controlsIndex).toBeLessThan(productGridIndex);
    expect(html).toContain("Applied filters");
    expect(html).toContain("Price: Under $20");
    expect(html).toContain("Availability: In stock");
    expect(html).toContain("Sort by");
    expect(html).toContain("Price low to high");
    expect(html).toContain('href="/products?sort=price_asc"');
    expect(html).toContain('data-slot="badge"');
    expect(html).not.toContain("Series: THE MONSTERS");
  });

  it("renders the V5 category control hierarchy above the product grid", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const contextIndex = html.indexOf('class="catalog-shop-context"');
    const quickFiltersIndex = html.indexOf(
      'class="catalog-category-quick-filters"',
    );
    const sortIndex = html.indexOf('class="catalog-sort-control"');
    const allFiltersIndex = html.indexOf('class="catalog-all-filters-trigger"');
    const appliedIndex = html.indexOf('class="catalog-applied-filters"');
    const productGridIndex = html.indexOf('class="catalog-product-section"');

    expect(contextIndex).toBeGreaterThan(-1);
    expect(quickFiltersIndex).toBeGreaterThan(contextIndex);
    expect(sortIndex).toBeGreaterThan(quickFiltersIndex);
    expect(allFiltersIndex).toBeGreaterThan(sortIndex);
    expect(appliedIndex).toBeGreaterThan(allFiltersIndex);
    expect(productGridIndex).toBeGreaterThan(appliedIndex);
    expect(html).toContain('aria-label="Category quick filters"');
    expect(html).toContain('class="catalog-category-chip"');
    expect(html).toContain('data-slot="sheet-trigger"');
    expect(html).toContain("<span>All filters</span>");
  });

  it("opens desktop secondary filters inside a shadcn sheet", async () => {
    const user = userEvent.setup();

    render(<CategoryPage data={categoryPageData()} />);

    await user.click(
      screen.getByRole("button", { name: "All filters, 2 filters applied" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "All filters" });

    expect(dialog.getAttribute("data-slot")).toBe("sheet-content");
    expect(within(dialog).getByText("Category")).toBeTruthy();
    expect(within(dialog).getByText("Release status")).toBeTruthy();
    expect(within(dialog).getByText("Pickup")).toBeTruthy();
    expect(dialog.querySelector("#toolbar-filter-price")).toBeTruthy();
    expect(dialog.querySelector("#toolbar-filter-release-status")).toBeTruthy();
  });

  it("renders a compact mobile filter control before the product grid", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const mobileFiltersIndex = html.indexOf(
      'class="catalog-mobile-filter-rail"',
    );
    const productGridIndex = html.indexOf('class="catalog-product-section"');

    expect(mobileFiltersIndex).toBeGreaterThan(-1);
    expect(productGridIndex).toBeGreaterThan(-1);
    expect(mobileFiltersIndex).toBeLessThan(productGridIndex);
    expect(html).toContain('data-slot="sheet-trigger"');
    expect(html).toContain('aria-label="Filters, 2 filters applied"');
    expect(html).toContain("<span>Filter &amp; sort</span>");
    expect(html).toContain("<strong>2 filters applied</strong>");
    expect(html).toContain('class="catalog-mobile-reset"');
    expect(html).not.toContain('id="filter-price"');
    expect(html).not.toContain("<details");
    expect(html).not.toContain("<summary");
  });

  it("opens mobile filters inside a shadcn sheet", async () => {
    const user = userEvent.setup();

    render(<CategoryPage data={categoryPageData()} />);

    await user.click(
      screen.getByRole("button", { name: "Filters, 2 filters applied" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: "Filter and sort",
    });

    expect(dialog.getAttribute("data-slot")).toBe("sheet-content");
    expect(
      within(dialog).getByText(
        "2 filters applied. Select one option to update this product list.",
      ),
    ).toBeTruthy();
    expect(within(dialog).getByText("Category")).toBeTruthy();
    expect(within(dialog).getByText("Price")).toBeTruthy();
    expect(within(dialog).getByText("Sort by")).toBeTruthy();
    expect(dialog.querySelector("#mobile-filter-price")).toBeTruthy();
    expect(dialog.querySelector("#mobile-filter-sort")).toBeTruthy();
    expect(dialog.querySelector(".filter-option--sheet")).toBeTruthy();
  });

  it("does not expose unsupported series filter metadata", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );

    expect(html).not.toContain('href="/products?series=');
    expect(html).not.toContain("THE MONSTERS");
  });

  it("keeps category Pay Later promotion amount-free", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const payLaterSection =
      html.match(/<section class="catalog-paylater"[\s\S]*?<\/section>/)?.[0] ??
      "";

    expect(payLaterSection).toContain("Pay Later with PayPal");
    expect(payLaterSection).toContain("catalog-paylater__card");
    expect(payLaterSection).toContain("catalog-paylater__message");
    expect(payLaterSection).toContain('data-slot="card"');
    expect(payLaterSection).not.toContain("$");
    expect(payLaterSection).not.toContain("£");
    expect(payLaterSection).not.toContain("interest-free installments of");
  });

  it("shows a pickup filter hint when no buyer location is available", async () => {
    const user = userEvent.setup();

    render(<CategoryPage data={categoryPageData()} />);

    await user.click(
      screen.getByRole("button", { name: "All filters, 2 filters applied" }),
    );

    const dialog = await screen.findByRole("dialog", { name: "All filters" });

    expect(
      within(dialog).getByText("Add a ZIP or sign in to check pickup filters."),
    ).toBeTruthy();
    expect(
      dialog.querySelector(
        '[aria-disabled="true"][aria-labelledby="toolbar-filter-pickup"]',
      ),
    ).toBeTruthy();
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
    expect(html).toContain("catalog-product-card__sale-badge");
    expect(html).toContain("Sale");
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-footer"');
  });

  it("visually separates coming-soon products from released products", () => {
    const html = renderToStaticMarkup(
      <CategoryPage data={categoryPageData()} />,
    );
    const comingSoonCard =
      html.match(
        /<div[^>]*data-release-state="coming-soon"[\s\S]*?<\/div><\/a><\/div>/,
      )?.[0] ?? "";

    expect(comingSoonCard).toContain("Dimoo Painter Lab");
    expect(comingSoonCard).toContain("catalog-product-card__coming-soon-badge");
    expect(comingSoonCard).toContain("Coming soon");
    expect(comingSoonCard).toContain('data-purchasable="false"');
    expect(comingSoonCard).toContain('data-muted-media="true"');
    expect(comingSoonCard).not.toContain("catalog-product-card__sale-badge");
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
    sortOptions: [
      {
        label: "Featured",
        href: "/products",
        active: false,
      },
      {
        label: "Price low to high",
        href: "/products?sort=price_asc",
        active: true,
      },
      {
        label: "Price high to low",
        href: "/products?sort=price_desc",
        active: false,
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
        regularPriceLabel: "$15.99",
        statusLabel: "Released",
        pickupLabel: "Pickup eligible",
        href: "/products/labubu-have-a-seat",
      },
      {
        slug: "dimoo-painter-lab",
        name: "Dimoo Painter Lab",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/dimoo-painter-lab-1.svg",
        imageAlt: "Dimoo Painter Lab collectible",
        priceLabel: "$21.99",
        regularPriceLabel: "$21.99",
        statusLabel: "Not released",
        pickupLabel: "Pickup soon",
        href: "/products/dimoo-painter-lab",
      },
    ],
  };
}

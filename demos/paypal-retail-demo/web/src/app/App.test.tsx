import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CategoryPageData } from "../features/catalog/CategoryPage.js";
import type { ProductDetailPageData } from "../features/catalog/ProductDetailPage.js";
import { App } from "./App.js";

describe("App shell", () => {
  it("renders the buyer shell without exposing an Admin navigation link", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/"
        initialHomePage={{
          hero: {
            eyebrow: "New arrival",
            title: "THE MONSTERS Labubu",
            subtitle: "Fresh collectible drops.",
            imagePath: "/assets/popmart/homepage/labubu-hero.webp",
            imageAlt: "Labubu character blind box hero",
            primaryCta: {
              href: "/products",
              label: "Shop now",
            },
            secondaryCta: {
              href: "/products?sort=newest",
              label: "New arrivals",
            },
          },
          hotSales: [],
          categories: [],
          calendar: {
            monthLabel: "June 2026",
            weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            days: [],
            selectedProducts: [],
          },
          payLaterPromo: {
            title: "Pay Later with PayPal",
            body: "Flexible payment options may be available at checkout.",
          },
          promoCards: [],
          popularSeries: [],
        }}
        initialConfig={{
          profile: {
            slug: "popmart",
            displayName: "POP MART",
            brandMode: "popmart",
          },
          market: {
            code: "US",
            currencyCode: "USD",
            locale: "en-US",
          },
          paypal: {
            providerKey: "paypal:sandbox:popmart:us:v1",
          },
        }}
      />,
    );

    expect(html).toContain("POP MART");
    expect(html).toContain("THE MONSTERS Labubu");
    expect(html).toContain('data-route-page="home"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Open minicart"');
    expect(html).toContain('class="paypal-provider-boundary"');
    expect(html).toContain(
      'data-paypal-provider-key="paypal:sandbox:popmart:us:v1"',
    );
    expect(html).not.toContain('href="/admin"');
  });

  it("renders the admin shell only for manual admin routes", () => {
    const html = renderToStaticMarkup(<App initialPathname="/admin/orders" />);

    expect(html).toContain("Admin Portal");
    expect(html).toContain('data-route-scope="admin"');
    expect(html).not.toContain('aria-label="Open minicart"');
  });

  it("renders the category page for product listing routes", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products"
        initialCategoryPage={categoryPageData()}
      />,
    );

    expect(html).toContain('data-route-page="catalog"');
    expect(html).toContain("All products");
    expect(html).toContain("All options");
    expect(html).toContain("Reset filters");
    expect(html).toContain("Pay Later with PayPal");
    expect(html).toContain('href="/products/labubu-have-a-seat"');
    expect(html).not.toContain('href="/admin"');
  });

  it("renders a released PDP from product routes", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products/labubu-have-a-seat"
        initialProductPages={productPages()}
      />,
    );

    expect(html).toContain('data-route-page="product"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain(
      "Flexible payment options may be available for $13.99",
    );
    expect(html).toContain("Collector reviews");
    expect(html).not.toContain("Pickup");
  });

  it("renders an unreleased PDP without purchasable actions or reviews", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products/skullpanda-future-drop"
        initialProductPages={productPages()}
      />,
    );

    expect(html).toContain("Skullpanda Future Drop");
    expect(html).toContain("Checkout opens after release.");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Collector reviews");
    expect(html).not.toContain(
      "Flexible payment options may be available for $15.99",
    );
  });
});

function categoryPageData(): CategoryPageData {
  return {
    title: "All products",
    subtitle: "Filter collectible drops by series, status, and availability.",
    resultCountLabel: "1 product",
    appliedFilterCount: 0,
    resetHref: "/products",
    categorySwitcher: {
      label: "Category",
      options: [
        {
          label: "All options",
          href: "/products",
          active: true,
          countLabel: "1",
        },
      ],
    },
    filters: [],
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

function productPages(): Readonly<Record<string, ProductDetailPageData>> {
  return {
    "labubu-have-a-seat": {
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
      details: [],
      gallery: [
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          imageAlt: "Labubu Have a Seat front view",
        },
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-2.svg",
          imageAlt: "Labubu Have a Seat box view",
        },
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-3.svg",
          imageAlt: "Labubu Have a Seat side view",
        },
      ],
      payLaterMessage: {
        title: "Pay Later with PayPal",
        body: "Flexible payment options may be available for $13.99 at checkout.",
      },
      reviews: [
        {
          id: "review-1",
          authorName: "Mina",
          ratingLabel: "5 out of 5",
          title: "Cute desk companion",
          body: "Arrived safely and looks great next to my monitor.",
        },
      ],
    },
    "skullpanda-future-drop": {
      slug: "skullpanda-future-drop",
      name: "Skullpanda Future Drop",
      categoryName: "Figures",
      seriesName: "Skullpanda",
      statusLabel: "Not released",
      purchasable: false,
      unavailableReason: "Checkout opens after release.",
      currentPriceLabel: "$15.99",
      regularPriceLabel: "$17.99",
      introduction:
        "A coming-soon Skullpanda release page for previewing product details before checkout opens.",
      details: [],
      gallery: [
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-1.svg",
          imageAlt: "Skullpanda Future Drop front view",
        },
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-2.svg",
          imageAlt: "Skullpanda Future Drop box view",
        },
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-3.svg",
          imageAlt: "Skullpanda Future Drop side view",
        },
      ],
      payLaterMessage: {
        title: "Pay Later with PayPal",
        body: "Flexible payment options may be available for $15.99 at checkout.",
      },
      reviews: [],
    },
  };
}

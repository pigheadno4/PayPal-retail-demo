import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomePage, type HomePageData } from "./HomePage.js";

describe("HomePage", () => {
  it("renders the merchandising sections required for the storefront homepage", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);

    expect(html).toContain("THE MONSTERS Labubu");
    expect(html).toContain("Hot sales");
    expect(html).toContain("Shop by category");
    expect(html).toContain("New arrivals calendar");
    expect(html).toContain("Pay Later with PayPal");
    expect(html).toContain("Limited drops");
    expect(html).toContain("Popular series");
    expect(html).toContain("Stay in the loop");
    expect(html).toContain('alt="Labubu character blind box hero"');
    expect(html).toContain('alt="Blind box category"');
  });

  it("uses amount-free Pay Later promotion copy on the homepage", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);
    const payLaterSection =
      html.match(
        /<section class="homepage-paylater"[\s\S]*?<\/section>/,
      )?.[0] ?? "";

    expect(payLaterSection).toContain("Pay Later with PayPal");
    expect(payLaterSection).not.toContain("$");
    expect(payLaterSection).not.toContain("£");
    expect(payLaterSection).not.toContain("interest-free installments of");
  });

  it("renders calendar release dates as outlined markers with product links and text labels", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);

    expect(html).toContain('data-release-marker="outlined"');
    expect(html).toContain('aria-label="June 12, Release date"');
    expect(html).toContain('href="/products/labubu-have-a-seat"');
    expect(html).toContain("Release date");
    expect(html).toContain("New arrival");
  });
});

function homePageData(): HomePageData {
  return {
    hero: {
      eyebrow: "New arrival",
      title: "THE MONSTERS Labubu",
      subtitle:
        "Fresh character collectibles with delivery, pickup, and flexible PayPal checkout.",
      imagePath: "/assets/popmart/homepage/labubu-hero.svg",
      imageAlt: "Labubu character blind box hero",
      primaryCta: {
        href: "/products?sort=newest",
        label: "Shop new arrivals",
      },
      secondaryCta: {
        href: "/products",
        label: "Browse all",
      },
    },
    hotSales: [
      {
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        eyebrow: "Hot sale",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        priceLabel: "$13.99",
        statusLabel: "Released",
        href: "/products/labubu-have-a-seat",
      },
    ],
    categories: [
      {
        slug: "blind-boxes",
        name: "Blind Boxes",
        description: "Mystery character collectibles.",
        imagePath: "/assets/popmart/categories/blind-boxes.svg",
        imageAlt: "Blind box category",
        href: "/products?category=blind-boxes",
      },
    ],
    calendar: {
      monthLabel: "June 2026",
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      days: [
        {
          isoDate: "2026-06-12",
          dayNumber: 12,
          releaseLabel: "Release date",
          hasRelease: true,
          selected: true,
        },
        {
          isoDate: "2026-06-14",
          dayNumber: 14,
          releaseLabel: "New arrival",
          hasRelease: true,
          selected: false,
        },
      ],
      selectedProducts: [
        {
          slug: "labubu-have-a-seat",
          name: "Labubu Have a Seat",
          statusLabel: "Release date",
          href: "/products/labubu-have-a-seat",
        },
      ],
    },
    payLaterPromo: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available at checkout.",
    },
    promoCards: [
      {
        title: "Limited drops",
        body: "Collector favorites returning this week.",
        href: "/products?sort=newest",
      },
    ],
    popularSeries: [
      {
        name: "THE MONSTERS",
        imagePath: "/assets/popmart/series/the-monsters.svg",
        imageAlt: "THE MONSTERS series artwork",
        href: "/products?series=the-monsters",
      },
    ],
  };
}

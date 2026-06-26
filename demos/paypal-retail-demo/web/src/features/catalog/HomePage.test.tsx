import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  defaultHomePageData,
  HomePage,
  type HomePageData,
} from "./HomePage.js";

describe("HomePage", () => {
  it("renders the merchandising sections required for the storefront homepage", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);

    expect(html).toContain("THE MONSTERS Labubu");
    expect(html).toContain("Hot sales");
    expect(html).toContain("Shop by category");
    expect(html).toContain("New arrivals calendar");
    expect(html).toContain("PayPal checkout");
    expect(html).toContain("Generated demo catalog");
    expect(html).toContain("Limited drops");
    expect(html).toContain("Popular series");
    expect(html).not.toContain("Stay in the loop");
    expect(html).toContain('alt="Labubu character blind box hero"');
    expect(html).toContain('class="homepage-hero__visual-link"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('alt="Blind box category"');
    expect(
      (html.match(/data-slot="card"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(8);
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-slot="card-footer"');
  });

  it("renders the reference-level home merchandising modules in order", () => {
    const html = renderToStaticMarkup(<HomePage data={defaultHomePageData} />);

    const heroIndex = html.indexOf("Blind-box drops");
    const trustIndex = html.indexOf("PayPal checkout");
    const calendarIndex = html.indexOf("New arrivals calendar");
    const categoryIndex = html.indexOf("Shop by category");
    const promoIndex = html.indexOf("Limited drops");
    const seriesIndex = html.indexOf("Popular series");

    expect(html).toContain('class="homepage-trust-strip"');
    expect(html).toContain("Generated demo catalog");
    expect(heroIndex).toBeGreaterThan(-1);
    expect(trustIndex).toBeGreaterThan(heroIndex);
    expect(calendarIndex).toBeGreaterThan(trustIndex);
    expect(categoryIndex).toBeGreaterThan(calendarIndex);
    expect(promoIndex).toBeGreaterThan(categoryIndex);
    expect(seriesIndex).toBeGreaterThan(promoIndex);
  });

  it("uses amount-free Pay Later promotion copy on the homepage", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);
    const payLaterSection =
      html.match(
        /<section class="homepage-paylater-promo"[\s\S]*?<\/section>/,
      )?.[0] ?? "";

    expect(payLaterSection).toContain("Pay Later with PayPal");
    expect(payLaterSection).toContain("Pay Later");
    expect(payLaterSection).not.toContain("$");
    expect(payLaterSection).not.toContain("£");
    expect(payLaterSection).not.toContain("interest-free installments of");
  });

  it("renders the official Pay Later promo slot when provided", () => {
    const html = renderToStaticMarkup(
      <HomePage
        data={homePageData()}
        renderPayLaterPromoMessage={(promo) => (
          <div data-testid="home-paylater-message">{promo.body}</div>
        )}
      />,
    );

    expect(html).toContain('class="homepage-paylater-promo"');
    expect(html).toContain('data-testid="home-paylater-message"');
    expect(html).toContain("Flexible payment options may be available");
  });

  it("keeps default fallback merchandising on generated assets instead of old mock character fixtures", () => {
    const html = renderToStaticMarkup(<HomePage data={defaultHomePageData} />);
    const lowerHtml = html.toLowerCase();

    expect(html).toContain("Blind-box drops, ready to collect");
    expect(html).toContain("/assets/popmart/products/blind-boxes-2-1.png");
    expect(html).toContain("Molly Blind Boxes 2");
    expect(html).toContain('href="/products/blind-boxes-2"');
    expect(html).toContain('href="/products?category=blind-boxes"');
    expect(lowerHtml).not.toContain("labubu");
    expect(lowerHtml).not.toContain("skullpanda");
    expect(lowerHtml).not.toContain("hirono");
    expect(lowerHtml).not.toContain("the-monsters");
    expect(lowerHtml).not.toContain("series=");
  });

  it("renders calendar release dates as outlined markers with product links and text labels", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);

    expect(html).toContain('data-slot="calendar"');
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

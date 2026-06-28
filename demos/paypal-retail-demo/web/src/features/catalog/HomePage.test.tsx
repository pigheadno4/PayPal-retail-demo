// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import {
  defaultHomePageData,
  HomePage,
  type HomePageData,
} from "./HomePage.js";

beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: query.includes("min-width: 1181px"),
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("HomePage", () => {
  it("renders the merchandising sections required for the storefront homepage", () => {
    const html = renderToStaticMarkup(<HomePage data={homePageData()} />);

    expect(html).toContain("THE MONSTERS Labubu");
    expect(html).toContain("Pre-order now");
    expect(html).toContain("Shop by category");
    expect(html).toContain("New arrivals calendar");
    expect(html).toContain("Featured releases");
    expect(html).toContain("release-calendar__full-trigger");
    expect(html).toContain("release-calendar__full-content");
    expect(html).toContain("Secure PayPal checkout");
    expect(html).toContain("Demo-authentic catalog");
    expect(html).toContain("Limited drops");
    expect(html).toContain("Popular series");
    expect(html).toContain("View item");
    expect(html).toContain("Event pick");
    expect(html).toContain("Series");
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
    expect(html).toContain('data-slot="badge"');
    expect(html).toContain('class="homepage-trust-card__icon"');
    expect(html).toContain('class="category-pill__arrow"');
  });

  it("renders the reference-level home merchandising modules in order", () => {
    const html = renderToStaticMarkup(<HomePage data={defaultHomePageData} />);

    const heroIndex = html.indexOf("Blind-box drops");
    const trustIndex = html.indexOf("Secure PayPal checkout");
    const calendarIndex = html.indexOf("New arrivals calendar");
    const categoryIndex = html.indexOf("Shop by category");
    const promoIndex = html.indexOf("Limited drops");
    const seriesIndex = html.indexOf("Popular series");
    const payLaterIndex = html.indexOf("Pay Later with PayPal");

    expect(html).toContain('class="homepage-trust-strip"');
    expect(html).toContain("Demo-authentic catalog");
    expect(heroIndex).toBeGreaterThan(-1);
    expect(trustIndex).toBeGreaterThan(heroIndex);
    expect(calendarIndex).toBeGreaterThan(trustIndex);
    expect(categoryIndex).toBeGreaterThan(calendarIndex);
    expect(promoIndex).toBeGreaterThan(categoryIndex);
    expect(seriesIndex).toBeGreaterThan(promoIndex);
    expect(payLaterIndex).toBeGreaterThan(seriesIndex);
  });

  it("renders dense V4 merchandise modules without unsupported promo claims", () => {
    const html = renderToStaticMarkup(<HomePage data={defaultHomePageData} />);

    expect(html).toContain("product-card__series");
    expect(html).toContain("product-card__status");
    expect(html).toContain("product-card__pickup");
    expect(html).toContain("Blind Boxes · Molly");
    expect(html).toContain("Pickup eligible");
    expect(html).toContain("category-strip__scroll");
    expect(html).toContain("series-grid__scroll");
    expect(
      (html.match(/data-slot="scroll-area"/g) ?? []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(html).toContain('alt="New arrivals promo collectible"');
    expect(html).toContain('alt="Limited drops promo collectible"');
    expect(html).toContain('alt="Pickup nearby promo collectible"');
    expect(html).toContain("New arrivals");
    expect(html).toContain("Pickup nearby");
    expect(html).not.toContain("Member rewards");
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
    expect(html).toContain('class="release-calendar__date-rail"');
    expect(html).toContain('aria-current="date"');
    expect(html).toContain('class="release-calendar__compact-legend"');
    expect(html).toContain('data-release-marker="outlined"');
    expect(html).toContain('aria-label="June 12, Release date"');
    expect(html).toContain('href="/products/labubu-have-a-seat"');
    expect(html).toContain("Release date");
    expect(html).toContain("New arrival");
  });

  it("updates the release summary and product shelf when a release date is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(<HomePage data={homePageData()} />);
    const releaseShelf = container.querySelector(
      '[aria-labelledby="hot-sales-title"]',
    );

    expect(screen.getByText("June 12 · Release date")).toBeTruthy();
    expect(
      screen.getByText("Showing 1 release pick for June 12."),
    ).toBeTruthy();
    expect(
      within(releaseShelf as HTMLElement).getAllByText("Labubu Have a Seat")[0],
    ).toBeTruthy();

    const newArrivalButton = screen.getByRole("button", {
      name: "June 14, New arrival. Show release products.",
    });
    await user.click(newArrivalButton);

    expect(newArrivalButton.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("June 14 · New arrival")).toBeTruthy();
    expect(
      screen.getByText("Showing 1 release pick for June 14."),
    ).toBeTruthy();
    expect(
      within(releaseShelf as HTMLElement).getAllByText(
        "Dimoo Calendar Drop",
      )[0],
    ).toBeTruthy();
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
      {
        slug: "dimoo-calendar-drop",
        name: "Dimoo Calendar Drop",
        eyebrow: "New arrival",
        imagePath: "/assets/popmart/products/dimoo-blind-boxes-3-1.png",
        imageAlt: "Dimoo Calendar Drop collectible",
        priceLabel: "$21.99",
        statusLabel: "New arrival",
        href: "/products/dimoo-calendar-drop",
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
          productSlugs: ["labubu-have-a-seat"],
        },
        {
          isoDate: "2026-06-14",
          dayNumber: 14,
          releaseLabel: "New arrival",
          hasRelease: true,
          selected: false,
          productSlugs: ["dimoo-calendar-drop"],
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

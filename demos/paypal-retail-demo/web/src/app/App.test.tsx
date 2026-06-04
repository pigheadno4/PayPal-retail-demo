import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

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
});

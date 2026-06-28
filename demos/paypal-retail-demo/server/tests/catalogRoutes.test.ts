import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type {
  CatalogProductListFilters,
  CatalogRepository,
  StorefrontContext,
} from "../src/routes/catalog.js";
import { requestApp } from "./helpers/requestApp.js";

describe("catalog storefront routes", () => {
  it("returns active config and homepage content for the requested profile and market", async () => {
    const repository = createCatalogRepository();
    const app = createApp({ catalogRepository: repository });

    const config = await requestApp(
      app,
      "GET",
      "/api/config?profile=generic&market=gb",
    );
    const home = await requestApp(
      app,
      "GET",
      "/api/catalog/home?profile=generic&market=gb",
    );
    const categories = await requestApp(
      app,
      "GET",
      "/api/catalog/categories?profile=generic&market=gb",
    );

    expect(config.status).toBe(200);
    expect(config.json).toEqual({
      ok: true,
      data: {
        profile: {
          id: "profile_generic",
          slug: "generic",
          display_name: "MochiToy Studio",
          brand_mode: "generic",
        },
        market: {
          id: "market_gb",
          code: "GB",
          currency_code: "GBP",
          locale: "en-GB",
          language_code: "en",
          buyer_country: "GB",
          paypal_page_type: "checkout",
          paylater_enabled: true,
          paylater_buyer_country: "GB",
          sandbox_test_buyer_country: "GB",
          market_version: 1,
        },
        features: {
          delivery: true,
          pickup: true,
          vaulting: true,
          apple_pay: true,
          google_pay: true,
          venmo: false,
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(home.status).toBe(200);
    expect(home.json).toEqual({
      ok: true,
      data: {
        sections: [
          {
            section_key: "hero",
            title: "Small Joy, Big Shelf Energy",
            subtitle:
              "Fresh drops, store pickup, and flexible PayPal checkout.",
            content: {
              image_path: "/generic/homepage/hero.webp",
              cta_primary: "Shop new arrivals",
            },
          },
          {
            section_key: "paylater_promo",
            title: "Pay Later with PayPal",
            subtitle: "Flexible payment options may be available at checkout.",
            content: {
              placement: "homepage-brief",
              amount_aware: false,
            },
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(categories.status).toBe(200);
    expect(categories.json).toEqual({
      ok: true,
      data: {
        categories: [
          {
            id: "category_blind-boxes",
            slug: "blind-boxes",
            name: "Blind Boxes",
            description: "Mystery collectible figures.",
            image_path: "/generic/categories/blind-boxes.webp",
          },
          {
            id: "category-plush",
            slug: "plush",
            name: "Plush",
            description: "Soft character collectibles.",
            image_path: "/generic/categories/plush.webp",
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.contexts).toEqual([
      { profileSlug: "generic", marketCode: "GB" },
      { profileSlug: "generic", marketCode: "GB" },
      { profileSlug: "generic", marketCode: "GB" },
    ]);
  });

  it("passes product list filters and returns market-scoped product cards", async () => {
    const repository = createCatalogRepository();
    const app = createApp({ catalogRepository: repository });

    const response = await requestApp(
      app,
      "GET",
      "/api/catalog/products?category=blind-boxes&release_status=released&pickup_available=true&price_min=1000&price_max=3000&sort=price_asc&q=labubu&profile=popmart&market=US",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        products: [
          {
            id: "product_labubu",
            slug: "labubu-have-a-seat",
            name: "Labubu Have a Seat",
            category_slug: "blind-boxes",
            image_path: "/popmart/products/labubu-have-a-seat-1.webp",
            release_status: "released",
            release_date: "2026-05-15",
            purchasable: true,
            checkout_block_reason: null,
            price: {
              currency_code: "USD",
              regular_price_minor: 1599,
              current_price_minor: 1399,
              is_on_sale: true,
            },
            inventory: {
              delivery_available: true,
              pickup_available: true,
            },
          },
        ],
        filter_counts: {
          total: 1,
          released: 1,
          coming_soon: 0,
          pickup_available: 1,
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(repository.productFilters).toEqual([
      {
        categorySlug: "blind-boxes",
        releaseStatus: "released",
        pickupAvailable: true,
        priceMinMinor: 1000,
        priceMaxMinor: 3000,
        availability: null,
        sort: "price_asc",
        query: "labubu",
      },
    ]);
  });

  it("returns released and unreleased PDP data with checkout/review behavior", async () => {
    const app = createApp({ catalogRepository: createCatalogRepository() });

    const released = await requestApp(
      app,
      "GET",
      "/api/catalog/products/labubu-have-a-seat",
    );
    const unreleased = await requestApp(
      app,
      "GET",
      "/api/catalog/products/skullpanda-future-drop",
    );
    const missing = await requestApp(
      app,
      "GET",
      "/api/catalog/products/not-a-product",
    );

    expect(released.status).toBe(200);
    expect(released.json).toMatchObject({
      ok: true,
      data: {
        product: {
          slug: "labubu-have-a-seat",
          release_status: "released",
          purchasable: true,
          checkout_block_reason: null,
          reviews: {
            visible: true,
            items: [
              {
                rating: 5,
                title: "Shelf superstar",
              },
            ],
          },
        },
      },
    });
    expect(unreleased.status).toBe(200);
    expect(unreleased.json).toMatchObject({
      ok: true,
      data: {
        product: {
          slug: "skullpanda-future-drop",
          release_status: "coming_soon",
          purchasable: false,
          checkout_block_reason: "not_released",
          reviews: {
            visible: false,
            items: [],
          },
        },
      },
    });
    expect(missing.status).toBe(404);
    expect(missing.json).toEqual({
      ok: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product was not found for the active storefront.",
        details: {
          slug: "not-a-product",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns release events linked to PDPs with outlined calendar markers", async () => {
    const app = createApp({ catalogRepository: createCatalogRepository() });

    const response = await requestApp(
      app,
      "GET",
      "/api/catalog/release-events?from=2026-06-01&to=2026-06-30",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        events: [
          {
            id: "release_event_1",
            product_slug: "skullpanda-future-drop",
            product_name: "SKULLPANDA Future Drop",
            event_date: "2026-06-18",
            event_type: "release",
            calendar_label: "Release date",
            marker_style: "outlined-circle",
            state: "future",
            links_to_pdp: true,
            pdp_href: "/products/skullpanda-future-drop",
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

function createCatalogRepository(): CatalogRepository & {
  readonly contexts: StorefrontContext[];
  readonly productFilters: CatalogProductListFilters[];
} {
  const contexts: StorefrontContext[] = [];
  const productFilters: CatalogProductListFilters[] = [];

  return {
    contexts,
    productFilters,
    async getConfig(context) {
      contexts.push(context);
      return {
        profile: {
          id: `profile_${context.profileSlug}`,
          slug: context.profileSlug,
          display_name:
            context.profileSlug === "generic"
              ? "MochiToy Studio"
              : "POP MART Demo",
          brand_mode: context.profileSlug === "generic" ? "generic" : "popmart",
        },
        market: {
          id: `market_${context.marketCode.toLowerCase()}`,
          code: context.marketCode,
          currency_code: context.marketCode === "GB" ? "GBP" : "USD",
          locale: context.marketCode === "GB" ? "en-GB" : "en-US",
          language_code: "en",
          buyer_country: context.marketCode,
          paypal_page_type: "checkout",
          paylater_enabled: true,
          paylater_buyer_country: context.marketCode,
          sandbox_test_buyer_country: context.marketCode,
          market_version: 1,
        },
        features: {
          delivery: true,
          pickup: true,
          vaulting: true,
          apple_pay: true,
          google_pay: true,
          venmo: context.marketCode === "US",
        },
      };
    },
    async getHome(context) {
      contexts.push(context);
      return {
        sections: [
          {
            section_key: "hero",
            title:
              context.profileSlug === "generic"
                ? "Small Joy, Big Shelf Energy"
                : "The Monsters Are Back",
            subtitle:
              "Fresh drops, store pickup, and flexible PayPal checkout.",
            content: {
              image_path: `/${context.profileSlug}/homepage/hero.webp`,
              cta_primary: "Shop new arrivals",
            },
          },
          {
            section_key: "paylater_promo",
            title: "Pay Later with PayPal",
            subtitle: "Flexible payment options may be available at checkout.",
            content: {
              placement: "homepage-brief",
              amount_aware: false,
            },
          },
        ],
      };
    },
    async getCategories(context) {
      contexts.push(context);
      return {
        categories: [
          {
            id: "category_blind-boxes",
            slug: "blind-boxes",
            name: "Blind Boxes",
            description: "Mystery collectible figures.",
            image_path: `/${context.profileSlug}/categories/blind-boxes.webp`,
          },
          {
            id: "category-plush",
            slug: "plush",
            name: "Plush",
            description: "Soft character collectibles.",
            image_path: `/${context.profileSlug}/categories/plush.webp`,
          },
        ],
      };
    },
    async getProducts(_context, filters) {
      productFilters.push(filters);
      return {
        products: [
          {
            id: "product_labubu",
            slug: "labubu-have-a-seat",
            name: "Labubu Have a Seat",
            category_slug: "blind-boxes",
            image_path: "/popmart/products/labubu-have-a-seat-1.webp",
            release_status: "released",
            release_date: "2026-05-15",
            purchasable: true,
            checkout_block_reason: null,
            price: {
              currency_code: "USD",
              regular_price_minor: 1599,
              current_price_minor: 1399,
              is_on_sale: true,
            },
            inventory: {
              delivery_available: true,
              pickup_available: true,
            },
          },
        ],
        filter_counts: {
          total: 1,
          released: 1,
          coming_soon: 0,
          pickup_available: 1,
        },
      };
    },
    async getProductBySlug(_context, slug) {
      if (slug === "not-a-product") {
        return null;
      }
      const released = slug === "labubu-have-a-seat";
      return {
        product: {
          id: released ? "product_labubu" : "product_future",
          slug,
          sku: released ? "PM-LABUBU-HAS" : "PM-SKULLPANDA-FUTURE",
          name: released ? "Labubu Have a Seat" : "SKULLPANDA Future Drop",
          series_name: released ? "The Monsters" : "SKULLPANDA",
          description: "Collector figure with demo-safe product data.",
          category_slug: "blind-boxes",
          release_status: released ? "released" : "coming_soon",
          release_date: released ? "2026-05-15" : "2026-06-18",
          purchasable: released,
          checkout_block_reason: released ? null : "not_released",
          max_quantity_per_order: 5,
          price: {
            currency_code: "USD",
            regular_price_minor: 1599,
            current_price_minor: 1399,
            is_on_sale: true,
          },
          images: [
            {
              image_path: `/${slug}-1.webp`,
              alt_text: `${slug} view 1`,
            },
          ],
          inventory: {
            delivery_available: released,
            pickup_available: released,
          },
          reviews: {
            visible: released,
            summary: released
              ? {
                  average_rating: 5,
                  review_count: 1,
                }
              : {
                  average_rating: 0,
                  review_count: 0,
                },
            items: released
              ? [
                  {
                    rating: 5,
                    title: "Shelf superstar",
                    body: "Looks great in the display case.",
                  },
                ]
              : [],
          },
        },
      };
    },
    async getReleaseEvents() {
      return {
        events: [
          {
            id: "release_event_1",
            product_slug: "skullpanda-future-drop",
            product_name: "SKULLPANDA Future Drop",
            event_date: "2026-06-18",
            event_type: "release",
            calendar_label: "Release date",
            marker_style: "outlined-circle",
            state: "future",
            links_to_pdp: true,
            pdp_href: "/products/skullpanda-future-drop",
          },
        ],
      };
    },
  };
}

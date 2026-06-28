import { describe, expect, it } from "vitest";

import {
  createSupabaseCatalogRepository,
  type CatalogDataSource,
  type CatalogHomepageSectionRow,
  type CatalogMarketRow,
  type CatalogProductDetailRow,
  type CatalogProductListRow,
  type CatalogProfileRow,
  type CatalogReleaseEventRow,
  type StorefrontCategoryRow,
} from "../src/repositories/catalogRepository.js";

describe("Supabase-backed catalog repository", () => {
  it("maps profile and market config from app schema rows", async () => {
    const repository = createSupabaseCatalogRepository({
      dataSource: createCatalogDataSource(),
      now: "2026-05-31T00:00:00.000Z",
    });

    await expect(
      repository.getConfig({ profileSlug: "popmart", marketCode: "US" }),
    ).resolves.toEqual({
      profile: {
        id: "profile_popmart",
        slug: "popmart",
        display_name: "POP MART Demo",
        brand_mode: "popmart",
      },
      market: {
        id: "market_us",
        code: "US",
        currency_code: "USD",
        locale: "en-US",
        language_code: "en",
        buyer_country: "US",
        paypal_page_type: "checkout",
        paylater_enabled: true,
        paylater_buyer_country: "US",
        sandbox_test_buyer_country: "US",
        market_version: 1,
      },
      features: {
        delivery: true,
        pickup: true,
        vaulting: true,
        apple_pay: true,
        google_pay: true,
        venmo: true,
      },
    });
  });

  it("returns homepage sections and categories in storefront order", async () => {
    const repository = createSupabaseCatalogRepository({
      dataSource: createCatalogDataSource(),
      now: "2026-05-31T00:00:00.000Z",
    });

    await expect(
      repository.getHome({ profileSlug: "popmart", marketCode: "US" }),
    ).resolves.toEqual({
      sections: [
        {
          section_key: "hero",
          title: "The Monsters Are Back",
          subtitle: "Fresh drops, store pickup, and flexible PayPal checkout.",
          content: {
            image_path: "/popmart/homepage/hero.webp",
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
    });
    await expect(
      repository.getCategories({ profileSlug: "popmart", marketCode: "US" }),
    ).resolves.toEqual({
      categories: [
        {
          id: "category_blind-boxes",
          slug: "blind-boxes",
          name: "Blind Boxes",
          description: "Mystery collectible figures.",
          image_path: "/popmart/categories/blind-boxes.webp",
        },
      ],
    });
  });

  it("filters product cards by keyword alongside category filters", async () => {
    const repository = createSupabaseCatalogRepository({
      dataSource: createCatalogDataSource(),
      now: "2026-05-31T00:00:00.000Z",
    });

    await expect(
      repository.getProducts(
        { profileSlug: "popmart", marketCode: "US" },
        {
          categorySlug: "blind-boxes",
          releaseStatus: null,
          pickupAvailable: null,
          priceMinMinor: null,
          priceMaxMinor: null,
          availability: null,
          sort: "price_asc",
          query: "labubu",
        },
      ),
    ).resolves.toEqual({
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
    });
  });

  it("returns PDP details with checkout blocked and reviews hidden for unreleased products", async () => {
    const repository = createSupabaseCatalogRepository({
      dataSource: createCatalogDataSource(),
      now: "2026-05-31T00:00:00.000Z",
    });

    await expect(
      repository.getProductBySlug(
        { profileSlug: "popmart", marketCode: "US" },
        "skullpanda-future-drop",
      ),
    ).resolves.toEqual({
      product: {
        id: "product_future",
        slug: "skullpanda-future-drop",
        sku: "PM-SKULLPANDA-FUTURE",
        name: "SKULLPANDA Future Drop",
        series_name: "SKULLPANDA",
        description: "Future release figure.",
        category_slug: "blind-boxes",
        release_status: "coming_soon",
        release_date: "2026-06-18",
        purchasable: false,
        checkout_block_reason: "not_released",
        max_quantity_per_order: 5,
        price: {
          currency_code: "USD",
          regular_price_minor: 2499,
          current_price_minor: 2499,
          is_on_sale: false,
        },
        images: [
          {
            image_path: "/popmart/products/skullpanda-future-drop-1.webp",
            alt_text: "SKULLPANDA Future Drop view 1",
          },
        ],
        inventory: {
          delivery_available: false,
          pickup_available: false,
        },
        reviews: {
          visible: false,
          summary: {
            average_rating: 0,
            review_count: 0,
          },
          items: [],
        },
      },
    });
    await expect(
      repository.getProductBySlug(
        { profileSlug: "popmart", marketCode: "US" },
        "missing",
      ),
    ).resolves.toBeNull();
  });

  it("returns release events with PDP links and outlined calendar markers", async () => {
    const repository = createSupabaseCatalogRepository({
      dataSource: createCatalogDataSource(),
      now: "2026-05-31T00:00:00.000Z",
    });

    await expect(
      repository.getReleaseEvents(
        { profileSlug: "popmart", marketCode: "US" },
        { from: "2026-06-01", to: "2026-06-30" },
      ),
    ).resolves.toEqual({
      events: [
        {
          id: "release_event_future",
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
    });
  });
});

function createCatalogDataSource(): CatalogDataSource {
  return {
    async getProfileBySlug() {
      return profileRow;
    },
    async getMarketByCode() {
      return marketRow;
    },
    async listHomepageSections() {
      return homepageSections;
    },
    async listCategories() {
      return categoryRows;
    },
    async listProductCards() {
      return productRows;
    },
    async getProductDetailBySlug(_profileId, _marketId, slug) {
      return productDetails.find((product) => product.slug === slug) ?? null;
    },
    async listReleaseEvents() {
      return releaseEvents;
    },
  };
}

const profileRow: CatalogProfileRow = {
  id: "profile_popmart",
  slug: "popmart",
  display_name: "POP MART Demo",
  brand_mode: "popmart",
};

const marketRow: CatalogMarketRow = {
  id: "market_us",
  code: "US",
  currency_code: "USD",
  locale: "en-US",
  language_code: "en",
  buyer_country: "US",
  paypal_page_type: "checkout",
  paylater_enabled: true,
  paylater_buyer_country: "US",
  sandbox_test_buyer_country: "US",
  payment_method_flags_json: {
    paypal: true,
    paylater: true,
    card: true,
    apple_pay: true,
    google_pay: true,
    venmo: true,
  },
  market_version: 1,
};

const homepageSections: CatalogHomepageSectionRow[] = [
  {
    section_key: "hero",
    title: "The Monsters Are Back",
    subtitle: "Fresh drops, store pickup, and flexible PayPal checkout.",
    content_json: {
      image_path: "/popmart/homepage/hero.webp",
      cta_primary: "Shop new arrivals",
    },
    sort_order: 1,
  },
  {
    section_key: "paylater_promo",
    title: "Pay Later with PayPal",
    subtitle: "Flexible payment options may be available at checkout.",
    content_json: {
      placement: "homepage-brief",
      amount_aware: false,
    },
    sort_order: 2,
  },
];

const categoryRows: StorefrontCategoryRow[] = [
  {
    id: "category_blind-boxes",
    slug: "blind-boxes",
    name: "Blind Boxes",
    description: "Mystery collectible figures.",
    image_path: "/popmart/categories/blind-boxes.webp",
    sort_order: 1,
  },
];

const productRows: CatalogProductListRow[] = [
  {
    id: "product_future",
    slug: "skullpanda-future-drop",
    name: "SKULLPANDA Future Drop",
    category_slug: "blind-boxes",
    image_path: "/popmart/products/skullpanda-future-drop-1.webp",
    release_status: "coming_soon",
    release_date: "2026-06-18",
    currency_code: "USD",
    regular_price_minor: 2499,
    current_price_minor: 2499,
    delivery_available_quantity: 0,
    pickup_available_quantity: 0,
  },
  {
    id: "product_labubu",
    slug: "labubu-have-a-seat",
    name: "Labubu Have a Seat",
    category_slug: "blind-boxes",
    image_path: "/popmart/products/labubu-have-a-seat-1.webp",
    release_status: "released",
    release_date: "2026-05-15",
    currency_code: "USD",
    regular_price_minor: 1599,
    current_price_minor: 1399,
    delivery_available_quantity: 12,
    pickup_available_quantity: 4,
  },
];

const productDetails: CatalogProductDetailRow[] = [
  {
    ...productRows[1]!,
    sku: "PM-LABUBU-HAS",
    series_name: "The Monsters",
    description: "Released collectible figure.",
    max_quantity_per_order: 5,
    images: [
      {
        image_path: "/popmart/products/labubu-have-a-seat-1.webp",
        alt_text: "Labubu Have a Seat view 1",
        sort_order: 1,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: "Shelf superstar",
        body: "Looks great in the display case.",
        created_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
  {
    ...productRows[0]!,
    sku: "PM-SKULLPANDA-FUTURE",
    series_name: "SKULLPANDA",
    description: "Future release figure.",
    max_quantity_per_order: 5,
    images: [
      {
        image_path: "/popmart/products/skullpanda-future-drop-1.webp",
        alt_text: "SKULLPANDA Future Drop view 1",
        sort_order: 1,
      },
    ],
    reviews: [
      {
        rating: 5,
        title: "Should stay hidden",
        body: "Unreleased products do not show reviews.",
        created_at: "2026-05-20T00:00:00.000Z",
      },
    ],
  },
];

const releaseEvents: CatalogReleaseEventRow[] = [
  {
    id: "release_event_future",
    product_id: "product_future",
    product_slug: "skullpanda-future-drop",
    product_name: "SKULLPANDA Future Drop",
    product_release_status: "coming_soon",
    product_release_date: "2026-06-18",
    event_date: "2026-06-18",
    event_type: "release",
    calendar_label: "Release date",
  },
];

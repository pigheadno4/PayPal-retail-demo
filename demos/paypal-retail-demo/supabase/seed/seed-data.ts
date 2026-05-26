import { createHash } from "node:crypto";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface SeedRow {
  readonly [column: string]: string | number | boolean | null | JsonValue;
}

export interface SeedTable {
  readonly name: string;
  readonly columns: readonly string[];
  readonly conflictColumns: readonly string[];
  readonly rows: readonly SeedRow[];
}

export interface SeedDataset {
  readonly tables: readonly SeedTable[];
  readonly summary: Record<string, number>;
}

interface ProductSeedRow extends SeedRow {
  readonly id: string;
  readonly profile_id: string;
  readonly category_id: string;
  readonly slug: string;
  readonly sku: string;
  readonly name: string;
  readonly series_name: string;
  readonly description: string;
  readonly short_description: string;
  readonly release_status: "released" | "coming_soon" | "unreleased";
  readonly release_date: string;
  readonly is_hot_sale: boolean;
  readonly is_featured: boolean;
  readonly is_active: boolean;
  readonly max_quantity_per_order: number;
}

interface ProfileSeed {
  readonly slug: "popmart" | "generic";
  readonly displayName: string;
  readonly brandMode: "popmart" | "generic";
  readonly productPrefix: string;
}

interface MarketSeed {
  readonly code: "US" | "GB";
  readonly currencyCode: "USD" | "GBP";
  readonly locale: string;
  readonly languageCode: string;
  readonly buyerCountry: string;
  readonly paylaterBuyerCountry: string;
  readonly sandboxTestBuyerCountry: string;
  readonly isDefault: boolean;
}

interface CategorySeed {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
}

interface StoreSeed {
  readonly marketCode: "US" | "GB";
  readonly slug: string;
  readonly name: string;
  readonly phone: string;
  readonly addressLine1: string;
  readonly city: string;
  readonly state: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
  readonly latitude: number;
  readonly longitude: number;
}

const seedNamespace = "paypal-retail-demo-v1";

const profiles: readonly ProfileSeed[] = [
  {
    slug: "popmart",
    displayName: "POP MART Demo",
    brandMode: "popmart",
    productPrefix: "POP",
  },
  {
    slug: "generic",
    displayName: "MochiToy Studio",
    brandMode: "generic",
    productPrefix: "MTS",
  },
];

const markets: readonly MarketSeed[] = [
  {
    code: "US",
    currencyCode: "USD",
    locale: "en-US",
    languageCode: "en",
    buyerCountry: "US",
    paylaterBuyerCountry: "US",
    sandboxTestBuyerCountry: "US",
    isDefault: true,
  },
  {
    code: "GB",
    currencyCode: "GBP",
    locale: "en-GB",
    languageCode: "en",
    buyerCountry: "GB",
    paylaterBuyerCountry: "GB",
    sandboxTestBuyerCountry: "GB",
    isDefault: false,
  },
];

const categorySeeds: readonly CategorySeed[] = [
  {
    slug: "blind-boxes",
    name: "Blind Boxes",
    description: "Sealed surprise figures and collectible series.",
  },
  {
    slug: "vinyl-figures",
    name: "Vinyl Figures",
    description: "Display-ready designer vinyl collectibles.",
  },
  {
    slug: "plush",
    name: "Plush",
    description: "Soft character companions and mascot plushies.",
  },
  {
    slug: "mega-collection",
    name: "Mega Collection",
    description: "Large-format figures and premium display pieces.",
  },
  {
    slug: "accessories",
    name: "Accessories",
    description: "Charms, bags, stands, and collector add-ons.",
  },
];

const popmartSeries = [
  "The Monsters",
  "Molly",
  "Dimoo",
  "Skullpanda",
  "Hirono",
  "Crybaby",
  "Pucky",
  "Sweet Bean",
  "Zsiga",
  "Azura",
];

const genericSeries = [
  "Mochi Planet",
  "Luna Pets",
  "Pocket Bakery",
  "Pixel Garden",
  "Star Arcade",
  "Cloud Parade",
  "Tiny Quest",
  "Dream Harbor",
  "Muse Club",
  "Bloom Lab",
];

const stores: readonly StoreSeed[] = [
  {
    marketCode: "US",
    slug: "los-angeles-melrose",
    name: "Los Angeles Melrose",
    phone: "+1 323 555 0101",
    addressLine1: "8100 Melrose Ave",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90046",
    countryCode: "US",
    latitude: 34.0837,
    longitude: -118.3614,
  },
  {
    marketCode: "US",
    slug: "san-francisco-union",
    name: "San Francisco Union Square",
    phone: "+1 415 555 0102",
    addressLine1: "150 Powell St",
    city: "San Francisco",
    state: "CA",
    postalCode: "94102",
    countryCode: "US",
    latitude: 37.7858,
    longitude: -122.4078,
  },
  {
    marketCode: "US",
    slug: "new-york-soho",
    name: "New York SoHo",
    phone: "+1 212 555 0103",
    addressLine1: "95 Spring St",
    city: "New York",
    state: "NY",
    postalCode: "10012",
    countryCode: "US",
    latitude: 40.7247,
    longitude: -74.0007,
  },
  {
    marketCode: "US",
    slug: "brooklyn-williamsburg",
    name: "Brooklyn Williamsburg",
    phone: "+1 718 555 0104",
    addressLine1: "120 N 6th St",
    city: "Brooklyn",
    state: "NY",
    postalCode: "11249",
    countryCode: "US",
    latitude: 40.7181,
    longitude: -73.9584,
  },
  {
    marketCode: "US",
    slug: "seattle-capitol-hill",
    name: "Seattle Capitol Hill",
    phone: "+1 206 555 0105",
    addressLine1: "1600 E Pine St",
    city: "Seattle",
    state: "WA",
    postalCode: "98122",
    countryCode: "US",
    latitude: 47.6155,
    longitude: -122.3116,
  },
  {
    marketCode: "US",
    slug: "las-vegas-fashion",
    name: "Las Vegas Fashion Show",
    phone: "+1 702 555 0106",
    addressLine1: "3200 Las Vegas Blvd S",
    city: "Las Vegas",
    state: "NV",
    postalCode: "89109",
    countryCode: "US",
    latitude: 36.1275,
    longitude: -115.1718,
  },
  {
    marketCode: "US",
    slug: "chicago-river-north",
    name: "Chicago River North",
    phone: "+1 312 555 0107",
    addressLine1: "520 N Michigan Ave",
    city: "Chicago",
    state: "IL",
    postalCode: "60611",
    countryCode: "US",
    latitude: 41.8916,
    longitude: -87.6243,
  },
  {
    marketCode: "US",
    slug: "austin-domain",
    name: "Austin Domain",
    phone: "+1 512 555 0108",
    addressLine1: "11410 Century Oaks Ter",
    city: "Austin",
    state: "TX",
    postalCode: "78758",
    countryCode: "US",
    latitude: 30.4017,
    longitude: -97.7265,
  },
  {
    marketCode: "US",
    slug: "miami-wynwood",
    name: "Miami Wynwood",
    phone: "+1 305 555 0109",
    addressLine1: "250 NW 24th St",
    city: "Miami",
    state: "FL",
    postalCode: "33127",
    countryCode: "US",
    latitude: 25.8005,
    longitude: -80.2006,
  },
  {
    marketCode: "GB",
    slug: "london-carnaby",
    name: "London Carnaby",
    phone: "+44 20 7946 0101",
    addressLine1: "38 Carnaby St",
    city: "London",
    state: null,
    postalCode: "W1F 7DS",
    countryCode: "GB",
    latitude: 51.5136,
    longitude: -0.1396,
  },
  {
    marketCode: "GB",
    slug: "london-covent-garden",
    name: "London Covent Garden",
    phone: "+44 20 7946 0102",
    addressLine1: "12 Neal St",
    city: "London",
    state: null,
    postalCode: "WC2H 9PU",
    countryCode: "GB",
    latitude: 51.5148,
    longitude: -0.1267,
  },
  {
    marketCode: "GB",
    slug: "manchester-arndale",
    name: "Manchester Arndale",
    phone: "+44 161 555 0103",
    addressLine1: "Market St",
    city: "Manchester",
    state: null,
    postalCode: "M4 3AD",
    countryCode: "GB",
    latitude: 53.483,
    longitude: -2.2417,
  },
  {
    marketCode: "GB",
    slug: "birmingham-bullring",
    name: "Birmingham Bullring",
    phone: "+44 121 555 0104",
    addressLine1: "Moor St",
    city: "Birmingham",
    state: null,
    postalCode: "B5 4BU",
    countryCode: "GB",
    latitude: 52.4775,
    longitude: -1.8936,
  },
  {
    marketCode: "GB",
    slug: "leeds-trinity",
    name: "Leeds Trinity",
    phone: "+44 113 555 0105",
    addressLine1: "Albion St",
    city: "Leeds",
    state: null,
    postalCode: "LS1 5AT",
    countryCode: "GB",
    latitude: 53.7974,
    longitude: -1.5442,
  },
  {
    marketCode: "GB",
    slug: "glasgow-buchanan",
    name: "Glasgow Buchanan",
    phone: "+44 141 555 0106",
    addressLine1: "220 Buchanan St",
    city: "Glasgow",
    state: null,
    postalCode: "G1 2FF",
    countryCode: "GB",
    latitude: 55.8629,
    longitude: -4.252,
  },
  {
    marketCode: "GB",
    slug: "edinburgh-princes",
    name: "Edinburgh Princes",
    phone: "+44 131 555 0107",
    addressLine1: "110 Princes St",
    city: "Edinburgh",
    state: null,
    postalCode: "EH2 3AA",
    countryCode: "GB",
    latitude: 55.9522,
    longitude: -3.1965,
  },
  {
    marketCode: "GB",
    slug: "bristol-cabot",
    name: "Bristol Cabot Circus",
    phone: "+44 117 555 0108",
    addressLine1: "Glass House",
    city: "Bristol",
    state: null,
    postalCode: "BS1 3BX",
    countryCode: "GB",
    latitude: 51.4585,
    longitude: -2.5854,
  },
  {
    marketCode: "GB",
    slug: "cardiff-st-david",
    name: "Cardiff St David's",
    phone: "+44 29 2055 0109",
    addressLine1: "The Hayes",
    city: "Cardiff",
    state: null,
    postalCode: "CF10 2ER",
    countryCode: "GB",
    latitude: 51.4797,
    longitude: -3.1756,
  },
];

export function stableUuid(key: string): string {
  const hash = createHash("sha1").update(`${seedNamespace}:${key}`).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildSeedDataset(): SeedDataset {
  const rows = createRows();
  const tables: SeedTable[] = [
    table(
      "app.profiles",
      ["id", "slug", "display_name", "brand_mode", "is_default"],
      rows.profiles,
    ),
    table(
      "app.markets",
      [
        "id",
        "code",
        "currency_code",
        "locale",
        "language_code",
        "buyer_country",
        "paypal_page_type",
        "paylater_enabled",
        "paylater_buyer_country",
        "sandbox_test_buyer_country",
        "paypal_components_json",
        "payment_method_flags_json",
        "market_version",
        "is_default",
      ],
      rows.markets,
    ),
    table(
      "app.categories",
      [
        "id",
        "profile_id",
        "slug",
        "name",
        "description",
        "image_path",
        "sort_order",
        "is_active",
      ],
      rows.categories,
    ),
    table(
      "app.products",
      [
        "id",
        "profile_id",
        "category_id",
        "slug",
        "sku",
        "name",
        "series_name",
        "description",
        "short_description",
        "release_status",
        "release_date",
        "is_hot_sale",
        "is_featured",
        "is_active",
        "max_quantity_per_order",
      ],
      rows.products,
    ),
    table(
      "app.product_prices",
      [
        "id",
        "profile_id",
        "market_id",
        "product_id",
        "currency_code",
        "regular_price_minor",
        "current_price_minor",
        "starts_at",
        "ends_at",
        "is_active",
      ],
      rows.productPrices,
    ),
    table(
      "app.product_images",
      ["id", "product_id", "image_path", "alt_text", "sort_order"],
      rows.productImages,
    ),
    table(
      "app.release_events",
      [
        "id",
        "profile_id",
        "market_id",
        "product_id",
        "event_date",
        "event_type",
        "calendar_label",
      ],
      rows.releaseEvents,
    ),
    table(
      "app.homepage_sections",
      [
        "id",
        "profile_id",
        "market_id",
        "section_key",
        "title",
        "subtitle",
        "content_json",
        "sort_order",
        "is_active",
      ],
      rows.homepageSections,
    ),
    table(
      "app.stores",
      [
        "id",
        "market_id",
        "slug",
        "name",
        "phone",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country_code",
        "latitude",
        "longitude",
        "is_active",
      ],
      rows.stores,
    ),
    table(
      "app.store_pickup_dates",
      [
        "id",
        "market_id",
        "store_id",
        "pickup_date",
        "capacity",
        "is_available",
      ],
      rows.storePickupDates,
    ),
    table(
      "app.central_inventory",
      ["id", "profile_id", "market_id", "product_id", "available_quantity"],
      rows.centralInventory,
    ),
    table(
      "app.store_inventory",
      [
        "id",
        "profile_id",
        "market_id",
        "store_id",
        "product_id",
        "available_quantity",
      ],
      rows.storeInventory,
    ),
    table(
      "app.tax_rates",
      [
        "id",
        "market_id",
        "country_code",
        "state",
        "county",
        "postal_code_prefix",
        "rate_bps",
        "is_active",
      ],
      rows.taxRates,
    ),
    table(
      "app.shipping_options",
      [
        "id",
        "market_id",
        "country_code",
        "state",
        "county",
        "service_code",
        "display_name",
        "amount_minor",
        "estimated_days_min",
        "estimated_days_max",
        "is_active",
      ],
      rows.shippingOptions,
    ),
    table(
      "app.promo_rules",
      [
        "id",
        "profile_id",
        "market_id",
        "code",
        "title",
        "description",
        "promo_type",
        "discount_type",
        "discount_value",
        "min_merchandise_subtotal_minor",
        "starts_at",
        "ends_at",
        "is_stackable",
        "priority",
        "is_active",
      ],
      rows.promoRules,
    ),
    table(
      "app.promo_rule_regions",
      [
        "id",
        "profile_id",
        "market_id",
        "promo_rule_id",
        "country_code",
        "state",
        "county",
        "postal_code_prefix",
        "include_exclude",
      ],
      rows.promoRuleRegions,
    ),
    table(
      "app.promo_rule_products",
      [
        "id",
        "profile_id",
        "market_id",
        "promo_rule_id",
        "product_id",
        "category_id",
        "include_exclude",
      ],
      rows.promoRuleProducts,
    ),
    table(
      "app.promo_compatibility",
      [
        "id",
        "profile_id",
        "market_id",
        "promo_rule_id",
        "compatible_promo_rule_id",
        "compatibility",
      ],
      rows.promoCompatibility,
    ),
  ];

  return {
    tables,
    summary: Object.fromEntries(
      Object.entries(rows).map(([name, value]) => [name, value.length]),
    ),
  };
}

function createRows() {
  const profileRows = profiles.map((profile, index) => ({
    id: profileId(profile.slug),
    slug: profile.slug,
    display_name: profile.displayName,
    brand_mode: profile.brandMode,
    is_default: index === 0,
  }));

  const marketRows = markets.map((market) => ({
    id: marketId(market.code),
    code: market.code,
    currency_code: market.currencyCode,
    locale: market.locale,
    language_code: market.languageCode,
    buyer_country: market.buyerCountry,
    paypal_page_type: "checkout",
    paylater_enabled: true,
    paylater_buyer_country: market.paylaterBuyerCountry,
    sandbox_test_buyer_country: market.sandboxTestBuyerCountry,
    paypal_components_json: [
      "paypal-payments",
      "paypal-messages",
      "card-fields",
      "venmo-payments",
      "applepay-payments",
      "googlepay-payments",
    ],
    payment_method_flags_json: {
      paypal: true,
      paylater: true,
      card: true,
      venmo: market.code === "US",
      apple_pay: true,
      google_pay: true,
    },
    market_version: 1,
    is_default: market.isDefault,
  }));

  const categoryRows: SeedRow[] = [];
  const productRows: ProductSeedRow[] = [];
  const productPriceRows: SeedRow[] = [];
  const productImageRows: SeedRow[] = [];
  const releaseEventRows: SeedRow[] = [];
  const homepageSectionRows: SeedRow[] = [];
  const centralInventoryRows: SeedRow[] = [];
  const storeInventoryRows: SeedRow[] = [];
  const promoRuleProductRows: SeedRow[] = [];

  for (const profile of profiles) {
    categorySeeds.forEach((category, categoryIndex) => {
      categoryRows.push({
        id: categoryId(profile.slug, category.slug),
        profile_id: profileId(profile.slug),
        slug: category.slug,
        name: category.name,
        description: category.description,
        image_path: `/${profile.slug}/categories/${category.slug}.webp`,
        sort_order: categoryIndex + 1,
        is_active: true,
      });
    });

    createProductsForProfile(profile).forEach((product, productIndex) => {
      productRows.push(product);

      for (const market of markets) {
        const regularUsd = 1499 + productIndex * 350 + (productIndex % 5) * 120;
        const regular =
          market.code === "GB" ? Math.round(regularUsd * 0.78) : regularUsd;
        const current =
          productIndex % 4 === 0 ? Math.round(regular * 0.85) : regular;

        productPriceRows.push({
          id: productPriceId(profile.slug, market.code, product.slug as string),
          profile_id: profileId(profile.slug),
          market_id: marketId(market.code),
          product_id: product.id,
          currency_code: market.currencyCode,
          regular_price_minor: regular,
          current_price_minor: current,
          starts_at: null,
          ends_at: null,
          is_active: true,
        });

        centralInventoryRows.push({
          id: stableUuid(
            `central-inventory:${profile.slug}:${market.code}:${product.slug}`,
          ),
          profile_id: profileId(profile.slug),
          market_id: marketId(market.code),
          product_id: product.id,
          available_quantity:
            product.release_status === "released"
              ? 48 + (productIndex % 7) * 6
              : 0,
        });
      }

      for (let imageIndex = 1; imageIndex <= 3; imageIndex += 1) {
        productImageRows.push({
          id: stableUuid(
            `product-image:${profile.slug}:${product.slug}:${imageIndex}`,
          ),
          product_id: product.id,
          image_path: `/${profile.slug}/products/${product.slug}-${imageIndex}.webp`,
          alt_text: `${product.name} view ${imageIndex}`,
          sort_order: imageIndex,
        });
      }

      if (product.release_date) {
        for (const market of markets) {
          releaseEventRows.push({
            id: stableUuid(
              `release-event:${profile.slug}:${market.code}:${product.slug}`,
            ),
            profile_id: profileId(profile.slug),
            market_id: marketId(market.code),
            product_id: product.id,
            event_date: product.release_date,
            event_type:
              product.release_status === "released" ? "new_arrival" : "release",
            calendar_label:
              product.release_status === "released"
                ? "New arrival"
                : "Release date",
          });
        }
      }
    });

    for (const market of markets) {
      homepageSectionRows.push(...createHomepageSections(profile, market));
      promoRuleProductRows.push(...createPromoProductScopes(profile, market));
    }
  }

  const storeRows = stores.map((store) => ({
    id: storeId(store.marketCode, store.slug),
    market_id: marketId(store.marketCode),
    slug: store.slug,
    name: store.name,
    phone: store.phone,
    address_line1: store.addressLine1,
    address_line2: null,
    city: store.city,
    state: store.state,
    postal_code: store.postalCode,
    country_code: store.countryCode,
    latitude: store.latitude,
    longitude: store.longitude,
    is_active: true,
  }));

  const storePickupDateRows = stores.flatMap((store) => {
    return Array.from({ length: 7 }, (_, index) => ({
      id: stableUuid(`pickup-date:${store.marketCode}:${store.slug}:${index}`),
      market_id: marketId(store.marketCode),
      store_id: storeId(store.marketCode, store.slug),
      pickup_date: addDays("2026-05-27", index + 1),
      capacity: 12 + (index % 3) * 4,
      is_available: true,
    }));
  });

  for (const profile of profiles) {
    for (const market of markets) {
      const profileProducts = productRows.filter(
        (product) => product.profile_id === profileId(profile.slug),
      );
      const marketStores = stores.filter(
        (store) => store.marketCode === market.code,
      );
      profileProducts.forEach((product, productIndex) => {
        marketStores.forEach((store, storeIndex) => {
          const released = product.release_status === "released";
          const partialPattern = (productIndex + storeIndex) % 7;
          const quantity = !released
            ? 0
            : partialPattern === 0
              ? 0
              : partialPattern <= 2
                ? 1
                : 8 + ((productIndex + storeIndex) % 5);
          storeInventoryRows.push({
            id: stableUuid(
              `store-inventory:${profile.slug}:${market.code}:${store.slug}:${product.slug}`,
            ),
            profile_id: profileId(profile.slug),
            market_id: marketId(market.code),
            store_id: storeId(market.code, store.slug),
            product_id: product.id,
            available_quantity: quantity,
          });
        });
      });
    }
  }

  const taxRateRows = createTaxRates();
  const shippingOptionRows = createShippingOptions();
  const promoRows = createPromoRules();
  const promoRegionRows = createPromoRegions();
  const promoCompatibilityRows = createPromoCompatibility();

  return {
    profiles: profileRows,
    markets: marketRows,
    categories: categoryRows,
    products: productRows,
    productPrices: productPriceRows,
    productImages: productImageRows,
    releaseEvents: releaseEventRows,
    homepageSections: homepageSectionRows,
    stores: storeRows,
    storePickupDates: storePickupDateRows,
    centralInventory: centralInventoryRows,
    storeInventory: storeInventoryRows,
    taxRates: taxRateRows,
    shippingOptions: shippingOptionRows,
    promoRules: promoRows,
    promoRuleRegions: promoRegionRows,
    promoRuleProducts: promoRuleProductRows,
    promoCompatibility: promoCompatibilityRows,
  };
}

function createProductsForProfile(profile: ProfileSeed): ProductSeedRow[] {
  const series = profile.slug === "popmart" ? popmartSeries : genericSeries;
  return categorySeeds.flatMap((category, categoryIndex) => {
    return Array.from({ length: 5 }, (_, index) => {
      const globalIndex = categoryIndex * 5 + index;
      const seriesName =
        series[globalIndex % series.length] ?? series[0] ?? "Collector Series";
      const slug = `${category.slug}-${globalIndex + 1}`;
      const releaseStatus: ProductSeedRow["release_status"] =
        globalIndex % 11 === 0
          ? "unreleased"
          : globalIndex % 7 === 0
            ? "coming_soon"
            : "released";
      const releaseDate =
        releaseStatus === "released"
          ? addDays("2026-05-01", globalIndex % 20)
          : addDays("2026-06-05", globalIndex * 3);

      return {
        id: productId(profile.slug, slug),
        profile_id: profileId(profile.slug),
        category_id: categoryId(profile.slug, category.slug),
        slug,
        sku: `${profile.productPrefix}-${String(globalIndex + 1).padStart(3, "0")}`,
        name: `${seriesName} ${category.name} ${index + 1}`,
        series_name: seriesName,
        description: `${seriesName} collectible for the ${category.name.toLowerCase()} collection.`,
        short_description: `${seriesName} collectible figure.`,
        release_status: releaseStatus,
        release_date: releaseDate,
        is_hot_sale: globalIndex % 5 === 0,
        is_featured: globalIndex % 6 === 0,
        is_active: true,
        max_quantity_per_order: releaseStatus === "released" ? 5 : 1,
      };
    });
  });
}

function createHomepageSections(
  profile: ProfileSeed,
  market: MarketSeed,
): SeedRow[] {
  const prefix = `${profile.slug}:${market.code}`;
  return [
    {
      id: stableUuid(`homepage:${prefix}:hero`),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      section_key: "hero",
      title:
        profile.slug === "popmart"
          ? "The Monsters Are Back"
          : "Small Joy, Big Shelf Energy",
      subtitle: "Fresh drops, store pickup, and flexible PayPal checkout.",
      content_json: {
        image_path: `/${profile.slug}/homepage/hero.webp`,
        cta_primary: "Shop new arrivals",
        cta_secondary: "See release calendar",
      },
      sort_order: 1,
      is_active: true,
    },
    {
      id: stableUuid(`homepage:${prefix}:hot-sales`),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      section_key: "hot_sales",
      title: "Hot Sales",
      subtitle: "Fast-moving figures ready for delivery or pickup.",
      content_json: { product_limit: 8 },
      sort_order: 2,
      is_active: true,
    },
    {
      id: stableUuid(`homepage:${prefix}:release-calendar`),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      section_key: "release_calendar",
      title: "New Arrivals Calendar",
      subtitle: "Track release dates before they sell through.",
      content_json: { month: "2026-06" },
      sort_order: 3,
      is_active: true,
    },
    {
      id: stableUuid(`homepage:${prefix}:paylater`),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      section_key: "paylater_promo",
      title: "Pay Later with PayPal",
      subtitle: "Flexible payment options may be available at checkout.",
      content_json: { placement: "homepage-brief", amount_aware: false },
      sort_order: 4,
      is_active: true,
    },
    {
      id: stableUuid(`homepage:${prefix}:popular-series`),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      section_key: "popular_series",
      title: "Popular Series",
      subtitle: "Fan favorites across the collection.",
      content_json: {
        series:
          profile.slug === "popmart"
            ? popmartSeries.slice(0, 6)
            : genericSeries.slice(0, 6),
      },
      sort_order: 5,
      is_active: true,
    },
  ];
}

function createTaxRates(): SeedRow[] {
  return [
    taxRate("US", "US", "CA", "Los Angeles", "900", 950),
    taxRate("US", "US", "CA", "San Francisco", "941", 863),
    taxRate("US", "US", "NY", "New York", "100", 888),
    taxRate("US", "US", "WA", "King", "981", 1025),
    taxRate("US", "US", "NV", "Clark", "891", 838),
    taxRate("US", "US", "TX", "Travis", "787", 825),
    taxRate("US", "US", "FL", "Miami-Dade", "331", 700),
    taxRate("GB", "GB", null, null, null, 2000),
  ];
}

function createShippingOptions(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (const state of ["CA", "NY", "WA", "NV", "IL", "TX", "FL"]) {
    rows.push(
      shippingOption(
        "US",
        "US",
        state,
        "standard",
        "Standard Delivery",
        595,
        4,
        6,
      ),
    );
    rows.push(
      shippingOption(
        "US",
        "US",
        state,
        "express",
        "Express Delivery",
        1295,
        2,
        3,
      ),
    );
  }
  rows.push(
    shippingOption(
      "GB",
      "GB",
      null,
      "standard",
      "Standard Delivery",
      395,
      3,
      5,
    ),
  );
  rows.push(
    shippingOption("GB", "GB", null, "express", "Express Delivery", 895, 1, 2),
  );
  return rows;
}

function createPromoRules(): SeedRow[] {
  return profiles.flatMap((profile) =>
    markets.flatMap((market) => {
      const base = `${profile.slug}:${market.code}`;
      return [
        promoRule(
          base,
          profile,
          market,
          "AUTO10",
          "Auto 10% Off",
          "Automatic merchandise discount.",
          "auto",
          "percent",
          1000,
          3000,
          true,
          10,
        ),
        promoRule(
          base,
          profile,
          market,
          "STATE5",
          "Regional Collector Bonus",
          "Regional fixed merchandise discount.",
          "auto",
          "fixed_amount",
          market.code === "GB" ? 400 : 500,
          2500,
          true,
          20,
        ),
        promoRule(
          base,
          profile,
          market,
          "BIG20",
          "Single Best 20% Off",
          "Exclusive high-value promotion.",
          "manual",
          "percent",
          2000,
          6000,
          false,
          5,
        ),
        promoRule(
          base,
          profile,
          market,
          "BUNDLE8",
          "Category Bundle",
          "Stackable category bundle discount.",
          "manual",
          "percent",
          800,
          4500,
          true,
          30,
        ),
      ];
    }),
  );
}

function createPromoRegions(): SeedRow[] {
  return profiles.flatMap((profile) =>
    markets.flatMap((market) => {
      const countryCode = market.code === "GB" ? "GB" : "US";
      const state = market.code === "US" ? "CA" : null;
      const postalPrefix = market.code === "US" ? "9" : "W";
      return [
        {
          id: stableUuid(`promo-region:${profile.slug}:${market.code}:STATE5`),
          profile_id: profileId(profile.slug),
          market_id: marketId(market.code),
          promo_rule_id: promoRuleId(profile.slug, market.code, "STATE5"),
          country_code: countryCode,
          state,
          county: null,
          postal_code_prefix: postalPrefix,
          include_exclude: "include",
        },
      ];
    }),
  );
}

function createPromoProductScopes(
  profile: ProfileSeed,
  market: MarketSeed,
): SeedRow[] {
  return [
    {
      id: stableUuid(
        `promo-product:${profile.slug}:${market.code}:BUNDLE8:blind-boxes`,
      ),
      profile_id: profileId(profile.slug),
      market_id: marketId(market.code),
      promo_rule_id: promoRuleId(profile.slug, market.code, "BUNDLE8"),
      product_id: null,
      category_id: categoryId(profile.slug, "blind-boxes"),
      include_exclude: "include",
    },
  ];
}

function createPromoCompatibility(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (const profile of profiles) {
    for (const market of markets) {
      const auto10 = promoRuleId(profile.slug, market.code, "AUTO10");
      const state5 = promoRuleId(profile.slug, market.code, "STATE5");
      const big20 = promoRuleId(profile.slug, market.code, "BIG20");
      const bundle8 = promoRuleId(profile.slug, market.code, "BUNDLE8");
      rows.push(compat(profile, market, auto10, state5, "compatible"));
      rows.push(compat(profile, market, state5, auto10, "compatible"));
      rows.push(compat(profile, market, auto10, bundle8, "compatible"));
      rows.push(compat(profile, market, bundle8, auto10, "compatible"));
      rows.push(compat(profile, market, big20, auto10, "exclusive"));
      rows.push(compat(profile, market, big20, state5, "exclusive"));
      rows.push(compat(profile, market, big20, bundle8, "exclusive"));
    }
  }
  return rows;
}

function table(
  name: string,
  columns: readonly string[],
  rows: readonly SeedRow[],
): SeedTable {
  return { name, columns, conflictColumns: ["id"], rows };
}

function profileId(profileSlug: string): string {
  return stableUuid(`profile:${profileSlug}`);
}

function marketId(marketCode: string): string {
  return stableUuid(`market:${marketCode}`);
}

function categoryId(profileSlug: string, categorySlug: string): string {
  return stableUuid(`category:${profileSlug}:${categorySlug}`);
}

function productId(profileSlug: string, productSlug: string): string {
  return stableUuid(`product:${profileSlug}:${productSlug}`);
}

function productPriceId(
  profileSlug: string,
  marketCode: string,
  productSlug: string,
): string {
  return stableUuid(
    `product-price:${profileSlug}:${marketCode}:${productSlug}`,
  );
}

function storeId(marketCode: string, storeSlug: string): string {
  return stableUuid(`store:${marketCode}:${storeSlug}`);
}

function promoRuleId(
  profileSlug: string,
  marketCode: string,
  code: string,
): string {
  return stableUuid(`promo-rule:${profileSlug}:${marketCode}:${code}`);
}

function promoRule(
  base: string,
  profile: ProfileSeed,
  market: MarketSeed,
  code: string,
  title: string,
  description: string,
  promoType: "auto" | "manual",
  discountType: "percent" | "fixed_amount",
  discountValue: number,
  minSubtotal: number,
  isStackable: boolean,
  priority: number,
): SeedRow {
  return {
    id: stableUuid(`promo-rule:${base}:${code}`),
    profile_id: profileId(profile.slug),
    market_id: marketId(market.code),
    code,
    title,
    description,
    promo_type: promoType,
    discount_type: discountType,
    discount_value: discountValue,
    min_merchandise_subtotal_minor: minSubtotal,
    starts_at: "2026-01-01T00:00:00.000Z",
    ends_at: "2027-01-01T00:00:00.000Z",
    is_stackable: isStackable,
    priority,
    is_active: true,
  };
}

function compat(
  profile: ProfileSeed,
  market: MarketSeed,
  left: string,
  right: string,
  compatibility: "compatible" | "exclusive",
): SeedRow {
  return {
    id: stableUuid(
      `promo-compat:${profile.slug}:${market.code}:${left}:${right}`,
    ),
    profile_id: profileId(profile.slug),
    market_id: marketId(market.code),
    promo_rule_id: left,
    compatible_promo_rule_id: right,
    compatibility,
  };
}

function taxRate(
  marketCode: "US" | "GB",
  countryCode: string,
  state: string | null,
  county: string | null,
  postalPrefix: string | null,
  rateBps: number,
): SeedRow {
  return {
    id: stableUuid(
      `tax-rate:${marketCode}:${countryCode}:${state ?? "all"}:${county ?? "all"}:${postalPrefix ?? "all"}`,
    ),
    market_id: marketId(marketCode),
    country_code: countryCode,
    state,
    county,
    postal_code_prefix: postalPrefix,
    rate_bps: rateBps,
    is_active: true,
  };
}

function shippingOption(
  marketCode: "US" | "GB",
  countryCode: string,
  state: string | null,
  serviceCode: string,
  displayName: string,
  amountMinor: number,
  minDays: number,
  maxDays: number,
): SeedRow {
  return {
    id: stableUuid(
      `shipping:${marketCode}:${countryCode}:${state ?? "all"}:${serviceCode}`,
    ),
    market_id: marketId(marketCode),
    country_code: countryCode,
    state,
    county: null,
    service_code: serviceCode,
    display_name: displayName,
    amount_minor: amountMinor,
    estimated_days_min: minDays,
    estimated_days_max: maxDays,
    is_active: true,
  };
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

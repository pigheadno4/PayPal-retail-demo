import { createHash } from "node:crypto";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export interface SqlExpression {
  readonly sql: string;
}

export interface SeedRow {
  readonly [column: string]:
    | string
    | number
    | boolean
    | null
    | JsonValue
    | SqlExpression;
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

interface DemoUserSeed {
  readonly slug: string;
  readonly email: string;
  readonly displayName: string;
  readonly phone: string;
  readonly defaultProfile: "popmart" | "generic";
  readonly defaultMarket: "US" | "GB";
  readonly address: {
    readonly label: string;
    readonly recipientName: string;
    readonly phone: string;
    readonly addressLine1: string;
    readonly city: string;
    readonly state: string | null;
    readonly postalCode: string;
    readonly countryCode: "US" | "GB";
  };
}

interface OrderScenario {
  readonly key: string;
  readonly profileSlug: "popmart" | "generic";
  readonly marketCode: "US" | "GB";
  readonly userSlug: string | null;
  readonly guestEmail: string | null;
  readonly fulfillmentMode: "delivery" | "pickup";
  readonly status: "pending" | "delivered" | "picked_up";
  readonly paymentStatus: "started" | "failed" | "captured";
  readonly paymentMethod: "paypal" | "paylater" | "card";
  readonly orderNumber: string;
  readonly orderNumberPrefix: "DO" | "PO";
  readonly orderNumberSequence: number;
  readonly shippingMinor: number;
  readonly storeSlug?: string;
  readonly pickupDate?: string;
  readonly lines: readonly {
    readonly productOrdinal: number;
    readonly quantity: number;
    readonly fulfillableQuantity?: number;
    readonly lineDiscountMinor?: number;
    readonly lineTaxMinor: number;
  }[];
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

const demoUsers: readonly DemoUserSeed[] = [
  {
    slug: "alice-la",
    email: "alice.la@example.test",
    displayName: "Alice Lee",
    phone: "+1 323 555 0201",
    defaultProfile: "popmart",
    defaultMarket: "US",
    address: {
      label: "Home",
      recipientName: "Alice Lee",
      phone: "+1 323 555 0201",
      addressLine1: "742 N Fairfax Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90046",
      countryCode: "US",
    },
  },
  {
    slug: "ben-brooklyn",
    email: "ben.brooklyn@example.test",
    displayName: "Ben Carter",
    phone: "+1 718 555 0202",
    defaultProfile: "generic",
    defaultMarket: "US",
    address: {
      label: "Apartment",
      recipientName: "Ben Carter",
      phone: "+1 718 555 0202",
      addressLine1: "88 Bedford Ave",
      city: "Brooklyn",
      state: "NY",
      postalCode: "11249",
      countryCode: "US",
    },
  },
  {
    slug: "clara-london",
    email: "clara.london@example.test",
    displayName: "Clara Hughes",
    phone: "+44 20 7946 0203",
    defaultProfile: "generic",
    defaultMarket: "GB",
    address: {
      label: "Flat",
      recipientName: "Clara Hughes",
      phone: "+44 20 7946 0203",
      addressLine1: "24 Wardour St",
      city: "London",
      state: null,
      postalCode: "W1D 6QJ",
      countryCode: "GB",
    },
  },
  {
    slug: "dylan-manchester",
    email: "dylan.manchester@example.test",
    displayName: "Dylan Reed",
    phone: "+44 161 555 0204",
    defaultProfile: "popmart",
    defaultMarket: "GB",
    address: {
      label: "Home",
      recipientName: "Dylan Reed",
      phone: "+44 161 555 0204",
      addressLine1: "10 Oldham St",
      city: "Manchester",
      state: null,
      postalCode: "M1 1JQ",
      countryCode: "GB",
    },
  },
  {
    slug: "erin-sf",
    email: "erin.sf@example.test",
    displayName: "Erin Park",
    phone: "+1 415 555 0205",
    defaultProfile: "popmart",
    defaultMarket: "US",
    address: {
      label: "Condo",
      recipientName: "Erin Park",
      phone: "+1 415 555 0205",
      addressLine1: "300 Post St",
      city: "San Francisco",
      state: "CA",
      postalCode: "94108",
      countryCode: "US",
    },
  },
];

export function stableUuid(key: string): string {
  const hash = createHash("sha1").update(`${seedNamespace}:${key}`).digest();
  hash[6] = (hash[6]! & 0x0f) | 0x50;
  hash[8] = (hash[8]! & 0x3f) | 0x80;
  const hex = hash.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sqlExpression(sql: string): SqlExpression {
  return { sql };
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
    table(
      "auth.users",
      [
        "id",
        "instance_id",
        "aud",
        "role",
        "email",
        "phone",
        "encrypted_password",
        "email_confirmed_at",
        "confirmation_token",
        "recovery_token",
        "email_change",
        "email_change_token_new",
        "raw_app_meta_data",
        "raw_user_meta_data",
        "created_at",
        "updated_at",
      ],
      rows.authUsers,
    ),
    table(
      "auth.identities",
      [
        "id",
        "user_id",
        "provider_id",
        "identity_data",
        "provider",
        "last_sign_in_at",
        "created_at",
        "updated_at",
      ],
      rows.authIdentities,
    ),
    table(
      "app.user_profiles",
      ["id", "auth_user_id", "email", "display_name"],
      rows.userProfiles,
    ),
    table(
      "app.addresses",
      [
        "id",
        "auth_user_id",
        "label",
        "recipient_name",
        "phone",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country_code",
        "is_default_shipping",
        "is_default_billing",
      ],
      rows.addresses,
    ),
    table(
      "app.saved_payment_methods",
      [
        "id",
        "auth_user_id",
        "provider",
        "method_type",
        "status",
        "vault_id",
        "paypal_customer_id",
        "brand",
        "last4",
        "expiry_month",
        "expiry_year",
        "label",
      ],
      rows.savedPaymentMethods,
    ),
    table(
      "app.carts",
      [
        "id",
        "profile_id",
        "market_id",
        "auth_user_id",
        "cart_public_id",
        "cart_secret_hash",
        "status",
        "last_seen_at",
      ],
      rows.carts,
    ),
    table(
      "app.cart_items",
      ["id", "cart_id", "product_id", "quantity", "unit_price_minor_snapshot"],
      rows.cartItems,
    ),
    table(
      "app.checkout_drafts",
      [
        "id",
        "profile_id",
        "market_id",
        "cart_id",
        "auth_user_id",
        "guest_email",
        "fulfillment_mode",
        "delivery_state_json",
        "pickup_state_json",
        "currency_code",
        "locale",
        "buyer_country",
        "sandbox_test_buyer_country",
        "status",
      ],
      rows.checkoutDrafts,
    ),
    table(
      "app.orders",
      [
        "id",
        "profile_id",
        "market_id",
        "order_number",
        "order_number_prefix",
        "order_number_sequence",
        "auth_user_id",
        "guest_email",
        "cart_id",
        "checkout_draft_id",
        "fulfillment_mode",
        "status",
        "payment_status",
        "currency_code",
        "locale",
        "buyer_country",
        "sandbox_test_buyer_country",
        "subtotal_minor",
        "discount_minor",
        "tax_minor",
        "shipping_minor",
        "total_minor",
      ],
      rows.orders,
    ),
    table(
      "app.order_items",
      [
        "id",
        "order_id",
        "product_id",
        "product_sku_snapshot",
        "product_name_snapshot",
        "product_description_snapshot",
        "product_url_snapshot",
        "product_image_url_snapshot",
        "unit_price_minor",
        "quantity",
        "fulfillable_quantity",
        "unavailable_quantity",
        "line_subtotal_minor",
        "line_discount_minor",
        "line_tax_minor",
        "line_total_minor",
      ],
      rows.orderItems,
    ),
    table(
      "app.order_addresses",
      [
        "id",
        "order_id",
        "address_type",
        "recipient_name",
        "phone",
        "address_line1",
        "address_line2",
        "city",
        "state",
        "postal_code",
        "country_code",
      ],
      rows.orderAddresses,
    ),
    table(
      "app.guest_order_access",
      [
        "id",
        "order_id",
        "guest_email_hash",
        "lookup_token_hash",
        "lookup_attempt_count",
        "last_lookup_at",
      ],
      rows.guestOrderAccess,
    ),
    table(
      "app.payment_sessions",
      [
        "id",
        "order_id",
        "provider",
        "method",
        "status",
        "attempt_number",
        "paypal_order_id",
        "paypal_capture_id",
        "paypal_invoice_id",
        "paypal_request_id",
        "vault_requested",
        "merchant_total_minor",
        "provider_total_minor",
        "amount_consistency_status",
        "currency_code",
        "locale",
        "buyer_country",
        "sandbox_test_buyer_country",
        "paypal_config_snapshot_json",
      ],
      rows.paymentSessions,
    ),
    table(
      "app.promo_evaluations",
      [
        "id",
        "profile_id",
        "market_id",
        "checkout_draft_id",
        "order_id",
        "evaluation_context_json",
        "matched_promos_json",
        "rejected_promos_json",
        "candidate_sets_json",
        "recommended_set_json",
        "selected_set_json",
        "merchandise_discount_minor",
        "taxable_subtotal_minor",
        "final_total_minor",
      ],
      rows.promoEvaluations,
    ),
    table(
      "app.promo_evaluation_lines",
      [
        "id",
        "promo_evaluation_id",
        "promo_rule_id",
        "code_snapshot",
        "evaluation_status",
        "rejection_reason",
        "stack_group",
        "discount_minor",
        "taxable_subtotal_effect_minor",
        "final_total_effect_minor",
        "explanation",
        "sort_order",
      ],
      rows.promoEvaluationLines,
    ),
    table(
      "app.total_snapshots",
      [
        "id",
        "checkout_draft_id",
        "order_id",
        "payment_session_id",
        "fulfillment_mode",
        "calculation_stage",
        "currency_code",
        "merchandise_subtotal_minor",
        "product_discount_minor",
        "promo_discount_minor",
        "taxable_subtotal_minor",
        "tax_minor",
        "shipping_minor",
        "total_minor",
        "promo_evaluation_id",
        "calculation_context_json",
      ],
      rows.totalSnapshots,
    ),
    table(
      "app.paypal_order_snapshots",
      [
        "id",
        "payment_session_id",
        "paypal_invoice_id",
        "paypal_request_id",
        "request_json",
        "response_json",
        "merchant_snapshot_json",
      ],
      rows.paypalOrderSnapshots,
    ),
    table(
      "app.webhook_events",
      [
        "id",
        "provider",
        "event_id",
        "event_type",
        "verification_status",
        "headers_json",
        "payload_json",
        "linked_order_id",
        "linked_payment_session_id",
        "processing_status",
        "processed_at",
      ],
      rows.webhookEvents,
    ),
    table(
      "app.order_lifecycle_events",
      ["id", "order_id", "from_status", "to_status", "actor_type", "note"],
      rows.orderLifecycleEvents,
    ),
    table(
      "app.reviews",
      [
        "id",
        "profile_id",
        "product_id",
        "order_id",
        "order_item_id",
        "auth_user_id",
        "rating",
        "title",
        "body",
        "status",
      ],
      rows.reviews,
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

      const productImageCount = profile.slug === "popmart" ? 1 : 3;
      for (
        let imageIndex = 1;
        imageIndex <= productImageCount;
        imageIndex += 1
      ) {
        productImageRows.push({
          id: stableUuid(
            `product-image:${profile.slug}:${product.slug}:${imageIndex}`,
          ),
          product_id: product.id,
          image_path: productImagePath(profile, product.slug, imageIndex),
          alt_text: productImageAltText(profile, product, imageIndex),
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
  const guardedRows = createGuardedRows(productRows);

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
    ...guardedRows,
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

function createGuardedRows(productRows: readonly ProductSeedRow[]) {
  const authUserRows = demoUsers.map((user) => ({
    id: authUserId(user.slug),
    instance_id: "00000000-0000-0000-0000-000000000000",
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    phone: user.phone,
    encrypted_password: sqlExpression(
      "crypt('RetailDemo2026!', gen_salt('bf'))",
    ),
    email_confirmed_at: "2026-05-01T09:00:00.000Z",
    confirmation_token: "",
    recovery_token: "",
    email_change: "",
    email_change_token_new: "",
    raw_app_meta_data: {
      provider: "email",
      providers: ["email"],
      demo_seed: true,
    },
    raw_user_meta_data: {
      display_name: user.displayName,
      default_profile: user.defaultProfile,
      default_market: user.defaultMarket,
    },
    created_at: "2026-05-01T09:00:00.000Z",
    updated_at: "2026-05-01T09:00:00.000Z",
  }));

  const authIdentityRows = demoUsers.map((user) => ({
    id: stableUuid(`auth-identity:${user.slug}`),
    user_id: authUserId(user.slug),
    provider_id: authUserId(user.slug),
    identity_data: {
      sub: authUserId(user.slug),
      email: user.email,
      email_verified: true,
      phone_verified: true,
      name: user.displayName,
    },
    provider: "email",
    last_sign_in_at: null,
    created_at: "2026-05-01T09:00:00.000Z",
    updated_at: "2026-05-01T09:00:00.000Z",
  }));

  const userProfileRows = demoUsers.map((user) => ({
    id: stableUuid(`user-profile:${user.slug}`),
    auth_user_id: authUserId(user.slug),
    email: user.email,
    display_name: user.displayName,
  }));

  const addressRows = demoUsers.map((user) => ({
    id: addressId(user.slug),
    auth_user_id: authUserId(user.slug),
    label: user.address.label,
    recipient_name: user.address.recipientName,
    phone: user.address.phone,
    address_line1: user.address.addressLine1,
    address_line2: null,
    city: user.address.city,
    state: user.address.state,
    postal_code: user.address.postalCode,
    country_code: user.address.countryCode,
    is_default_shipping: true,
    is_default_billing: true,
  }));

  const savedPaymentRows = [
    savedPaymentMethod("alice-la", "paypal_wallet", "PayPal wallet", {
      vaultId: "demo-vault-paypal-alice-la",
      paypalCustomerId: "demo-customer-alice-la",
    }),
    savedPaymentMethod("ben-brooklyn", "card", "Visa ending 4242", {
      brand: "Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2030,
    }),
    savedPaymentMethod("clara-london", "paypal_wallet", "PayPal wallet", {
      vaultId: "demo-vault-paypal-clara-london",
      paypalCustomerId: "demo-customer-clara-london",
    }),
    savedPaymentMethod("dylan-manchester", "card", "Mastercard ending 5454", {
      brand: "Mastercard",
      last4: "5454",
      expiryMonth: 9,
      expiryYear: 2031,
    }),
  ];

  const cartRows: SeedRow[] = [];
  const cartItemRows: SeedRow[] = [];
  demoUsers.forEach((user, userIndex) => {
    const product = productByOrdinal(
      user.defaultProfile,
      2 + (userIndex % 5),
      productRows,
    );
    const secondProduct = productByOrdinal(
      user.defaultProfile,
      9 + (userIndex % 4),
      productRows,
    );
    cartRows.push({
      id: cartId(user.slug),
      profile_id: profileId(user.defaultProfile),
      market_id: marketId(user.defaultMarket),
      auth_user_id: authUserId(user.slug),
      cart_public_id: `cart_demo_${user.slug.replaceAll("-", "_")}`,
      cart_secret_hash: null,
      status: "active",
      last_seen_at: "2026-05-26T09:00:00.000Z",
    });
    cartItemRows.push(
      cartItem(user, product, user.defaultMarket, 1, "primary"),
    );
    if (userIndex < 2) {
      cartItemRows.push(
        cartItem(user, secondProduct, user.defaultMarket, 2, "secondary"),
      );
    }
  });

  const checkoutDraftRows: SeedRow[] = [];
  const orderRows: SeedRow[] = [];
  const orderItemRows: SeedRow[] = [];
  const orderAddressRows: SeedRow[] = [];
  const guestOrderAccessRows: SeedRow[] = [];
  const paymentSessionRows: SeedRow[] = [];
  const promoEvaluationRows: SeedRow[] = [];
  const promoEvaluationLineRows: SeedRow[] = [];
  const totalSnapshotRows: SeedRow[] = [];
  const paypalOrderSnapshotRows: SeedRow[] = [];
  const webhookEventRows: SeedRow[] = [];
  const orderLifecycleEventRows: SeedRow[] = [];
  const reviewRows: SeedRow[] = [];

  for (const scenario of orderScenarios()) {
    const orderDetails = buildOrderDetails(scenario, productRows);
    const market = marketSeed(scenario.marketCode);
    const user = scenario.userSlug ? demoUser(scenario.userSlug) : null;
    const orderKey = scenario.key;
    const currentOrderId = orderId(orderKey);
    const currentCheckoutDraftId =
      scenario.status === "pending" && user ? checkoutDraftId(orderKey) : null;
    const currentPaymentSessionId = paymentSessionId(orderKey);
    const currentPromoEvaluationId = promoEvaluationId(orderKey);

    if (currentCheckoutDraftId && user) {
      checkoutDraftRows.push({
        id: currentCheckoutDraftId,
        profile_id: profileId(scenario.profileSlug),
        market_id: marketId(scenario.marketCode),
        cart_id: cartId(user.slug),
        auth_user_id: authUserId(user.slug),
        guest_email: null,
        fulfillment_mode: scenario.fulfillmentMode,
        delivery_state_json:
          scenario.fulfillmentMode === "delivery"
            ? {
                address_id: addressId(user.slug),
                submitted: true,
                shipping_option: "standard",
              }
            : {},
        pickup_state_json:
          scenario.fulfillmentMode === "pickup"
            ? {
                store_id: storeId(scenario.marketCode, scenario.storeSlug!),
                pickup_date: scenario.pickupDate ?? null,
                submitted: true,
              }
            : {},
        currency_code: market.currencyCode,
        locale: market.locale,
        buyer_country: market.buyerCountry,
        sandbox_test_buyer_country: market.sandboxTestBuyerCountry,
        status: "payment_started",
      });
    }

    orderRows.push({
      id: currentOrderId,
      profile_id: profileId(scenario.profileSlug),
      market_id: marketId(scenario.marketCode),
      order_number: scenario.orderNumber,
      order_number_prefix: scenario.orderNumberPrefix,
      order_number_sequence: scenario.orderNumberSequence,
      auth_user_id: user ? authUserId(user.slug) : null,
      guest_email: scenario.guestEmail,
      cart_id: user && scenario.status === "pending" ? cartId(user.slug) : null,
      checkout_draft_id: currentCheckoutDraftId,
      fulfillment_mode: scenario.fulfillmentMode,
      status: scenario.status,
      payment_status: scenario.paymentStatus,
      currency_code: market.currencyCode,
      locale: market.locale,
      buyer_country: market.buyerCountry,
      sandbox_test_buyer_country: market.sandboxTestBuyerCountry,
      subtotal_minor: orderDetails.subtotalMinor,
      discount_minor: orderDetails.discountMinor,
      tax_minor: orderDetails.taxMinor,
      shipping_minor: scenario.shippingMinor,
      total_minor: orderDetails.totalMinor,
    });

    orderDetails.lines.forEach((line, index) => {
      orderItemRows.push({
        id: orderItemId(orderKey, index),
        order_id: currentOrderId,
        product_id: line.product.id,
        product_sku_snapshot: line.product.sku,
        product_name_snapshot: line.product.name,
        product_description_snapshot: line.product.short_description,
        product_url_snapshot: `/${scenario.profileSlug}/products/${line.product.slug}`,
        product_image_url_snapshot: productImagePath(
          profileForSlug(scenario.profileSlug),
          line.product.slug,
          1,
        ),
        unit_price_minor: line.unitPriceMinor,
        quantity: line.quantity,
        fulfillable_quantity: line.fulfillableQuantity,
        unavailable_quantity: line.quantity - line.fulfillableQuantity,
        line_subtotal_minor: line.lineSubtotalMinor,
        line_discount_minor: line.lineDiscountMinor,
        line_tax_minor: line.lineTaxMinor,
        line_total_minor: line.lineTotalMinor,
      });
    });

    orderAddressRows.push(
      ...orderAddressesForScenario(scenario, currentOrderId, user),
    );

    if (scenario.guestEmail) {
      guestOrderAccessRows.push({
        id: stableUuid(`guest-order-access:${orderKey}`),
        order_id: currentOrderId,
        guest_email_hash: stableHash(scenario.guestEmail),
        lookup_token_hash: stableHash(`${scenario.orderNumber}:guest-lookup`),
        lookup_attempt_count: 0,
        last_lookup_at: null,
      });
    }

    paymentSessionRows.push({
      id: currentPaymentSessionId,
      order_id: currentOrderId,
      provider: "paypal",
      method: scenario.paymentMethod,
      status:
        scenario.paymentStatus === "captured"
          ? "captured"
          : scenario.paymentStatus === "failed"
            ? "failed"
            : "created",
      attempt_number: 1,
      paypal_order_id: `DEMO-PAYPAL-ORDER-${scenario.orderNumber}`,
      paypal_capture_id:
        scenario.paymentStatus === "captured"
          ? `DEMO-CAPTURE-${scenario.orderNumber}`
          : null,
      paypal_invoice_id: `${scenario.orderNumber}-A1`,
      paypal_request_id: stableHash(`paypal-request:${orderKey}`),
      vault_requested: false,
      merchant_total_minor: orderDetails.totalMinor,
      provider_total_minor:
        scenario.paymentStatus === "captured" ? orderDetails.totalMinor : null,
      amount_consistency_status:
        scenario.paymentStatus === "captured" ? "matched" : "not_checked",
      currency_code: market.currencyCode,
      locale: market.locale,
      buyer_country: market.buyerCountry,
      sandbox_test_buyer_country: market.sandboxTestBuyerCountry,
      paypal_config_snapshot_json: {
        environment: "sandbox",
        profile: scenario.profileSlug,
        market: scenario.marketCode,
        currency_code: market.currencyCode,
        buyer_country: market.buyerCountry,
        sandbox_test_buyer_country: market.sandboxTestBuyerCountry,
      },
    });

    promoEvaluationRows.push({
      id: currentPromoEvaluationId,
      profile_id: profileId(scenario.profileSlug),
      market_id: marketId(scenario.marketCode),
      checkout_draft_id: currentCheckoutDraftId,
      order_id: currentOrderId,
      evaluation_context_json: {
        fulfillment_mode: scenario.fulfillmentMode,
        order_number: scenario.orderNumber,
        excludes_shipping_from_discount_base: true,
      },
      matched_promos_json:
        orderDetails.discountMinor > 0
          ? [
              {
                code:
                  scenario.fulfillmentMode === "pickup" ? "BUNDLE8" : "AUTO10",
              },
            ]
          : [],
      rejected_promos_json: [
        {
          code: "BIG20",
          reason: "Exclusive promo was not the best compatible set.",
        },
      ],
      candidate_sets_json: [
        ["BIG20"],
        scenario.fulfillmentMode === "pickup"
          ? ["BUNDLE8", "AUTO10"]
          : ["AUTO10", "STATE5"],
      ],
      recommended_set_json:
        orderDetails.discountMinor > 0
          ? [scenario.fulfillmentMode === "pickup" ? "BUNDLE8" : "AUTO10"]
          : [],
      selected_set_json:
        orderDetails.discountMinor > 0
          ? [scenario.fulfillmentMode === "pickup" ? "BUNDLE8" : "AUTO10"]
          : [],
      merchandise_discount_minor: orderDetails.discountMinor,
      taxable_subtotal_minor:
        orderDetails.subtotalMinor - orderDetails.discountMinor,
      final_total_minor: orderDetails.totalMinor,
    });

    promoEvaluationLineRows.push(
      promoEvaluationLine(
        orderKey,
        scenario,
        currentPromoEvaluationId,
        "selected",
        orderDetails.discountMinor,
        1,
      ),
      promoEvaluationLine(
        orderKey,
        scenario,
        currentPromoEvaluationId,
        "rejected",
        0,
        2,
      ),
    );

    totalSnapshotRows.push({
      id: stableUuid(`total-snapshot:${orderKey}`),
      checkout_draft_id: currentCheckoutDraftId,
      order_id: currentOrderId,
      payment_session_id: currentPaymentSessionId,
      fulfillment_mode: scenario.fulfillmentMode,
      calculation_stage:
        scenario.status === "pending" ? "pending_resume" : "capture",
      currency_code: market.currencyCode,
      merchandise_subtotal_minor: orderDetails.subtotalMinor,
      product_discount_minor: 0,
      promo_discount_minor: orderDetails.discountMinor,
      taxable_subtotal_minor:
        orderDetails.subtotalMinor - orderDetails.discountMinor,
      tax_minor: orderDetails.taxMinor,
      shipping_minor: scenario.shippingMinor,
      total_minor: orderDetails.totalMinor,
      promo_evaluation_id: currentPromoEvaluationId,
      calculation_context_json: {
        tax_excludes_shipping: true,
        promo_excludes_shipping: true,
        source: scenario.status === "pending" ? "resume_seed" : "capture_seed",
      },
    });

    paypalOrderSnapshotRows.push({
      id: stableUuid(`paypal-order-snapshot:${orderKey}`),
      payment_session_id: currentPaymentSessionId,
      paypal_invoice_id: `${scenario.orderNumber}-A1`,
      paypal_request_id: stableHash(`paypal-request:${orderKey}`),
      request_json: {
        intent: "CAPTURE",
        invoice_id: `${scenario.orderNumber}-A1`,
        fulfillment_mode: scenario.fulfillmentMode,
        demo_snapshot: true,
      },
      response_json:
        scenario.paymentStatus === "captured"
          ? {
              id: `DEMO-PAYPAL-ORDER-${scenario.orderNumber}`,
              status: "COMPLETED",
            }
          : {
              id: `DEMO-PAYPAL-ORDER-${scenario.orderNumber}`,
              status:
                scenario.paymentStatus === "failed" ? "FAILED" : "CREATED",
            },
      merchant_snapshot_json: {
        order_number: scenario.orderNumber,
        amount_minor: orderDetails.totalMinor,
        currency_code: market.currencyCode,
      },
    });

    if (scenario.paymentStatus === "captured" && user) {
      webhookEventRows.push({
        id: stableUuid(`webhook:${orderKey}:capture-completed`),
        provider: "paypal",
        event_id: `WH-DEMO-${scenario.orderNumber}`,
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        verification_status: "valid",
        headers_json: { demo: true },
        payload_json: {
          resource: {
            id: `DEMO-CAPTURE-${scenario.orderNumber}`,
            invoice_id: `${scenario.orderNumber}-A1`,
          },
        },
        linked_order_id: currentOrderId,
        linked_payment_session_id: currentPaymentSessionId,
        processing_status: "processed",
        processed_at: "2026-05-26T12:00:00.000Z",
      });
    }

    orderLifecycleEventRows.push(
      ...lifecycleEventsForScenario(orderKey, scenario, currentOrderId),
    );

    if (
      scenario.paymentStatus === "captured" &&
      user &&
      (scenario.status === "delivered" || scenario.status === "picked_up")
    ) {
      reviewRows.push({
        id: stableUuid(`review:${orderKey}:0`),
        profile_id: profileId(scenario.profileSlug),
        product_id: orderDetails.lines[0]!.product.id,
        order_id: currentOrderId,
        order_item_id: orderItemId(orderKey, 0),
        auth_user_id: authUserId(user.slug),
        rating: scenario.status === "picked_up" ? 5 : 4,
        title:
          scenario.status === "picked_up"
            ? "Pickup was smooth"
            : "Lovely shelf piece",
        body:
          scenario.status === "picked_up"
            ? "The pickup flow was quick and the item was ready at the store."
            : "Good packaging and the figure looks great in person.",
        status: "active",
      });
    }
  }

  return {
    authUsers: authUserRows,
    authIdentities: authIdentityRows,
    userProfiles: userProfileRows,
    addresses: addressRows,
    savedPaymentMethods: savedPaymentRows,
    carts: cartRows,
    cartItems: cartItemRows,
    checkoutDrafts: checkoutDraftRows,
    orders: orderRows,
    orderItems: orderItemRows,
    orderAddresses: orderAddressRows,
    guestOrderAccess: guestOrderAccessRows,
    paymentSessions: paymentSessionRows,
    promoEvaluations: promoEvaluationRows,
    promoEvaluationLines: promoEvaluationLineRows,
    totalSnapshots: totalSnapshotRows,
    paypalOrderSnapshots: paypalOrderSnapshotRows,
    webhookEvents: webhookEventRows,
    orderLifecycleEvents: orderLifecycleEventRows,
    reviews: reviewRows,
  };
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

function orderScenarios(): readonly OrderScenario[] {
  return [
    {
      key: "alice-pending-delivery",
      profileSlug: "popmart",
      marketCode: "US",
      userSlug: "alice-la",
      guestEmail: null,
      fulfillmentMode: "delivery",
      status: "pending",
      paymentStatus: "started",
      paymentMethod: "paypal",
      orderNumber: "DO-20260526-000001",
      orderNumberPrefix: "DO",
      orderNumberSequence: 1,
      shippingMinor: 595,
      lines: [
        {
          productOrdinal: 2,
          quantity: 1,
          lineDiscountMinor: 197,
          lineTaxMinor: 168,
        },
        {
          productOrdinal: 3,
          quantity: 2,
          lineDiscountMinor: 488,
          lineTaxMinor: 417,
        },
      ],
    },
    {
      key: "ben-pending-pickup",
      profileSlug: "generic",
      marketCode: "US",
      userSlug: "ben-brooklyn",
      guestEmail: null,
      fulfillmentMode: "pickup",
      status: "pending",
      paymentStatus: "failed",
      paymentMethod: "paylater",
      orderNumber: "PO-20260526-000001",
      orderNumberPrefix: "PO",
      orderNumberSequence: 1,
      shippingMinor: 0,
      storeSlug: "brooklyn-williamsburg",
      pickupDate: "2026-05-20",
      lines: [
        {
          productOrdinal: 4,
          quantity: 2,
          fulfillableQuantity: 1,
          lineDiscountMinor: 233,
          lineTaxMinor: 238,
        },
        {
          productOrdinal: 5,
          quantity: 1,
          lineDiscountMinor: 229,
          lineTaxMinor: 234,
        },
      ],
    },
    {
      key: "clara-delivered",
      profileSlug: "generic",
      marketCode: "GB",
      userSlug: "clara-london",
      guestEmail: null,
      fulfillmentMode: "delivery",
      status: "delivered",
      paymentStatus: "captured",
      paymentMethod: "card",
      orderNumber: "DO-20260526-000002",
      orderNumberPrefix: "DO",
      orderNumberSequence: 2,
      shippingMinor: 395,
      lines: [{ productOrdinal: 6, quantity: 1, lineTaxMinor: 507 }],
    },
    {
      key: "dylan-picked-up",
      profileSlug: "popmart",
      marketCode: "GB",
      userSlug: "dylan-manchester",
      guestEmail: null,
      fulfillmentMode: "pickup",
      status: "picked_up",
      paymentStatus: "captured",
      paymentMethod: "paypal",
      orderNumber: "PO-20260526-000002",
      orderNumberPrefix: "PO",
      orderNumberSequence: 2,
      shippingMinor: 0,
      storeSlug: "manchester-arndale",
      pickupDate: "2026-05-24",
      lines: [{ productOrdinal: 7, quantity: 1, lineTaxMinor: 580 }],
    },
    {
      key: "guest-delivered",
      profileSlug: "popmart",
      marketCode: "US",
      userSlug: null,
      guestEmail: "guest.collector@example.test",
      fulfillmentMode: "delivery",
      status: "delivered",
      paymentStatus: "captured",
      paymentMethod: "paypal",
      orderNumber: "DO-20260526-000003",
      orderNumberPrefix: "DO",
      orderNumberSequence: 3,
      shippingMinor: 595,
      lines: [
        {
          productOrdinal: 9,
          quantity: 1,
          lineDiscountMinor: 500,
          lineTaxMinor: 242,
        },
      ],
    },
  ];
}

function buildOrderDetails(
  scenario: OrderScenario,
  productRows: readonly ProductSeedRow[],
) {
  const lines = scenario.lines.map((line) => {
    const product = productByOrdinal(
      scenario.profileSlug,
      line.productOrdinal,
      productRows,
    );
    const unitPriceMinor = productPriceMinor(product, scenario.marketCode);
    const fulfillableQuantity = line.fulfillableQuantity ?? line.quantity;
    const lineSubtotalMinor = unitPriceMinor * fulfillableQuantity;
    const lineDiscountMinor = line.lineDiscountMinor ?? 0;
    const lineTaxMinor = line.lineTaxMinor;
    return {
      product,
      unitPriceMinor,
      quantity: line.quantity,
      fulfillableQuantity,
      lineSubtotalMinor,
      lineDiscountMinor,
      lineTaxMinor,
      lineTotalMinor: lineSubtotalMinor - lineDiscountMinor + lineTaxMinor,
    };
  });
  const subtotalMinor = lines.reduce(
    (total, line) => total + line.lineSubtotalMinor,
    0,
  );
  const discountMinor = lines.reduce(
    (total, line) => total + line.lineDiscountMinor,
    0,
  );
  const taxMinor = lines.reduce((total, line) => total + line.lineTaxMinor, 0);

  return {
    lines,
    subtotalMinor,
    discountMinor,
    taxMinor,
    totalMinor:
      subtotalMinor - discountMinor + taxMinor + scenario.shippingMinor,
  };
}

function savedPaymentMethod(
  userSlug: string,
  methodType: "paypal_wallet" | "card",
  label: string,
  options: {
    readonly vaultId?: string;
    readonly paypalCustomerId?: string;
    readonly brand?: string;
    readonly last4?: string;
    readonly expiryMonth?: number;
    readonly expiryYear?: number;
  },
): SeedRow {
  return {
    id: stableUuid(`saved-payment:${userSlug}:${methodType}`),
    auth_user_id: authUserId(userSlug),
    provider: "paypal",
    method_type: methodType,
    status: "active",
    vault_id: options.vaultId ?? null,
    paypal_customer_id: options.paypalCustomerId ?? null,
    brand: options.brand ?? null,
    last4: options.last4 ?? null,
    expiry_month: options.expiryMonth ?? null,
    expiry_year: options.expiryYear ?? null,
    label,
  };
}

function cartItem(
  user: DemoUserSeed,
  product: ProductSeedRow,
  marketCode: "US" | "GB",
  quantity: number,
  slot: string,
): SeedRow {
  return {
    id: stableUuid(`cart-item:${user.slug}:${slot}`),
    cart_id: cartId(user.slug),
    product_id: product.id,
    quantity,
    unit_price_minor_snapshot: productPriceMinor(product, marketCode),
  };
}

function orderAddressesForScenario(
  scenario: OrderScenario,
  currentOrderId: string,
  user: DemoUserSeed | null,
): SeedRow[] {
  const billingAddress = user?.address ?? guestAddress();
  const rows: SeedRow[] = [];

  if (scenario.fulfillmentMode === "pickup") {
    const store = storeSeed(scenario.marketCode, scenario.storeSlug!);
    rows.push({
      id: stableUuid(`order-address:${scenario.key}:pickup-store`),
      order_id: currentOrderId,
      address_type: "pickup_store",
      recipient_name: `s2s ${store.name}`,
      phone: store.phone,
      address_line1: store.addressLine1,
      address_line2: null,
      city: store.city,
      state: store.state,
      postal_code: store.postalCode,
      country_code: store.countryCode,
    });
  } else {
    const shippingAddress = user?.address ?? guestAddress();
    rows.push({
      id: stableUuid(`order-address:${scenario.key}:shipping`),
      order_id: currentOrderId,
      address_type: "shipping",
      recipient_name: shippingAddress.recipientName,
      phone: shippingAddress.phone,
      address_line1: shippingAddress.addressLine1,
      address_line2: null,
      city: shippingAddress.city,
      state: shippingAddress.state,
      postal_code: shippingAddress.postalCode,
      country_code: shippingAddress.countryCode,
    });
  }

  rows.push({
    id: stableUuid(`order-address:${scenario.key}:billing`),
    order_id: currentOrderId,
    address_type: "billing",
    recipient_name: billingAddress.recipientName,
    phone: billingAddress.phone,
    address_line1: billingAddress.addressLine1,
    address_line2: null,
    city: billingAddress.city,
    state: billingAddress.state,
    postal_code: billingAddress.postalCode,
    country_code: billingAddress.countryCode,
  });

  return rows;
}

function promoEvaluationLine(
  orderKey: string,
  scenario: OrderScenario,
  promoEvaluationIdValue: string,
  status: "selected" | "rejected",
  discountMinor: number,
  sortOrder: number,
): SeedRow {
  const code =
    status === "rejected"
      ? "BIG20"
      : scenario.fulfillmentMode === "pickup"
        ? "BUNDLE8"
        : "AUTO10";
  return {
    id: stableUuid(`promo-evaluation-line:${orderKey}:${status}`),
    promo_evaluation_id: promoEvaluationIdValue,
    promo_rule_id: promoRuleId(scenario.profileSlug, scenario.marketCode, code),
    code_snapshot: code,
    evaluation_status: status,
    rejection_reason:
      status === "rejected"
        ? "Exclusive promo was not selected for this demo snapshot."
        : null,
    stack_group: status === "rejected" ? "exclusive" : "recommended",
    discount_minor: status === "selected" ? discountMinor : 0,
    taxable_subtotal_effect_minor: status === "selected" ? discountMinor : 0,
    final_total_effect_minor: status === "selected" ? discountMinor : 0,
    explanation:
      status === "selected"
        ? "Selected promo result stored for Admin explanation."
        : "Rejected promo result stored for Admin explanation.",
    sort_order: sortOrder,
  };
}

function lifecycleEventsForScenario(
  orderKey: string,
  scenario: OrderScenario,
  currentOrderId: string,
): SeedRow[] {
  const transitions =
    scenario.status === "pending"
      ? [
          {
            from: null,
            to: "pending",
            actor: "system",
            note:
              scenario.paymentStatus === "failed"
                ? "Payment session failed; order remains resumable."
                : "Payment session started; order remains pending.",
          },
        ]
      : scenario.status === "delivered"
        ? [
            {
              from: null,
              to: "paid",
              actor: "webhook",
              note: "Demo capture webhook marked the order paid.",
            },
            {
              from: "paid",
              to: "processing",
              actor: "admin",
              note: "Admin moved delivery order to processing.",
            },
            {
              from: "processing",
              to: "shipped",
              actor: "admin",
              note: "Admin marked delivery order shipped.",
            },
            {
              from: "shipped",
              to: "delivered",
              actor: "admin",
              note: "Admin marked delivery order delivered.",
            },
          ]
        : [
            {
              from: null,
              to: "paid",
              actor: "webhook",
              note: "Demo capture webhook marked pickup order paid.",
            },
            {
              from: "paid",
              to: "preparing_pickup",
              actor: "admin",
              note: "Store started preparing pickup.",
            },
            {
              from: "preparing_pickup",
              to: "ready_for_pickup",
              actor: "admin",
              note: "Store marked pickup ready.",
            },
            {
              from: "ready_for_pickup",
              to: "picked_up",
              actor: "admin",
              note: "Admin marked pickup collected.",
            },
          ];

  return transitions.map((transition, index) => ({
    id: stableUuid(`order-lifecycle:${orderKey}:${index}`),
    order_id: currentOrderId,
    from_status: transition.from,
    to_status: transition.to,
    actor_type: transition.actor,
    note: transition.note,
  }));
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

function authUserId(userSlug: string): string {
  return stableUuid(`auth-user:${userSlug}`);
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

function productImagePath(
  profile: ProfileSeed,
  productSlug: string,
  imageIndex: number,
): string {
  if (profile.slug === "popmart") {
    return `/assets/popmart/products/${productSlug}-${imageIndex}.png`;
  }

  return `/${profile.slug}/products/${productSlug}-${imageIndex}.webp`;
}

function productImageAltText(
  profile: ProfileSeed,
  product: ProductSeedRow,
  imageIndex: number,
): string {
  if (profile.slug !== "popmart") {
    return `${product.name} view ${imageIndex}`;
  }

  const categorySlug = categorySlugForProduct(product);
  const collectibleType =
    categorySlug === "blind-boxes"
      ? "surprise collectible figure"
      : categorySlug === "vinyl-figures"
        ? "designer vinyl figure"
        : categorySlug === "plush"
          ? "soft plush collectible"
          : categorySlug === "mega-collection"
            ? "large-format display collectible"
            : "collector accessory set";

  return `${product.name} ${collectibleType} on a pastel display.`;
}

function categorySlugForProduct(product: ProductSeedRow): string {
  const category = categorySeeds.find((candidate) =>
    product.slug.startsWith(`${candidate.slug}-`),
  );

  return category?.slug ?? "accessories";
}

function profileForSlug(profileSlug: ProfileSeed["slug"]): ProfileSeed {
  const profile = profiles.find((candidate) => candidate.slug === profileSlug);
  if (!profile) {
    throw new Error(`Unknown profile slug: ${profileSlug}`);
  }

  return profile;
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

function addressId(userSlug: string): string {
  return stableUuid(`address:${userSlug}:default`);
}

function cartId(userSlug: string): string {
  return stableUuid(`cart:${userSlug}:active`);
}

function checkoutDraftId(orderKey: string): string {
  return stableUuid(`checkout-draft:${orderKey}`);
}

function orderId(orderKey: string): string {
  return stableUuid(`order:${orderKey}`);
}

function orderItemId(orderKey: string, index: number): string {
  return stableUuid(`order-item:${orderKey}:${index}`);
}

function paymentSessionId(orderKey: string): string {
  return stableUuid(`payment-session:${orderKey}`);
}

function promoEvaluationId(orderKey: string): string {
  return stableUuid(`promo-evaluation:${orderKey}`);
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

function productByOrdinal(
  profileSlug: "popmart" | "generic",
  ordinal: number,
  productRows: readonly ProductSeedRow[],
): ProductSeedRow {
  const category = categorySeeds[Math.floor((ordinal - 1) / 5)];
  if (!category) {
    throw new Error(`No seed category for product ordinal ${ordinal}`);
  }
  const productSlug = `${category.slug}-${ordinal}`;
  const product = productRows.find(
    (row) =>
      row.profile_id === profileId(profileSlug) && row.slug === productSlug,
  );
  if (!product) {
    throw new Error(`No seed product for ${profileSlug}/${productSlug}`);
  }
  return product;
}

function productPriceMinor(
  product: ProductSeedRow,
  marketCode: "US" | "GB",
): number {
  const ordinal = Number(String(product.slug).split("-").at(-1));
  if (!Number.isInteger(ordinal) || ordinal <= 0) {
    throw new Error(`Cannot infer product ordinal from slug ${product.slug}`);
  }
  const productIndex = ordinal - 1;
  const regularUsd = 1499 + productIndex * 350 + (productIndex % 5) * 120;
  const regular =
    marketCode === "GB" ? Math.round(regularUsd * 0.78) : regularUsd;
  return productIndex % 4 === 0 ? Math.round(regular * 0.85) : regular;
}

function demoUser(userSlug: string): DemoUserSeed {
  const user = demoUsers.find((candidate) => candidate.slug === userSlug);
  if (!user) {
    throw new Error(`No demo user for slug ${userSlug}`);
  }
  return user;
}

function marketSeed(marketCode: "US" | "GB"): MarketSeed {
  const market = markets.find((candidate) => candidate.code === marketCode);
  if (!market) {
    throw new Error(`No market seed for ${marketCode}`);
  }
  return market;
}

function storeSeed(marketCode: "US" | "GB", storeSlug: string): StoreSeed {
  const store = stores.find(
    (candidate) =>
      candidate.marketCode === marketCode && candidate.slug === storeSlug,
  );
  if (!store) {
    throw new Error(`No store seed for ${marketCode}/${storeSlug}`);
  }
  return store;
}

function guestAddress(): DemoUserSeed["address"] {
  return {
    label: "Guest",
    recipientName: "Mia Guest",
    phone: "+1 305 555 0301",
    addressLine1: "250 NW 24th St",
    city: "Miami",
    state: "FL",
    postalCode: "33127",
    countryCode: "US",
  };
}

function stableHash(value: string): string {
  return `sha256:${createHash("sha256")
    .update(`${seedNamespace}:${value.toLowerCase()}`)
    .digest("hex")}`;
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

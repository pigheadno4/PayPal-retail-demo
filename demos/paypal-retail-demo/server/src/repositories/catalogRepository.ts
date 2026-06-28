import {
  buildReleaseCalendarEntry,
  getProductPurchaseState,
  type CatalogProduct,
  type ProductReleaseStatus,
} from "../../../shared/src/catalog.js";
import type {
  CatalogJson,
  CatalogProductListFilters,
  CatalogReleaseEventFilters,
  CatalogRepository,
  StorefrontContext,
} from "../routes/catalog.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface CatalogProfileRow {
  readonly id: string;
  readonly slug: string;
  readonly display_name: string;
  readonly brand_mode: string;
}

export interface CatalogMarketRow {
  readonly id: string;
  readonly code: string;
  readonly currency_code: string;
  readonly locale: string;
  readonly language_code: string;
  readonly buyer_country: string;
  readonly paypal_page_type: string;
  readonly paylater_enabled: boolean;
  readonly paylater_buyer_country: string | null;
  readonly sandbox_test_buyer_country: string | null;
  readonly payment_method_flags_json: Record<string, unknown>;
  readonly market_version: number;
}

export interface CatalogHomepageSectionRow {
  readonly section_key: string;
  readonly title: string | null;
  readonly subtitle: string | null;
  readonly content_json: CatalogJson;
  readonly sort_order: number;
}

export interface StorefrontCategoryRow {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string | null;
  readonly image_path: string | null;
  readonly sort_order: number;
}

export interface CatalogProductListRow {
  readonly id: string;
  readonly profile_id?: string;
  readonly slug: string;
  readonly name: string;
  readonly category_slug: string;
  readonly image_path: string | null;
  readonly release_status: ProductReleaseStatus;
  readonly release_date: string | null;
  readonly is_active?: boolean;
  readonly currency_code: string;
  readonly regular_price_minor: number;
  readonly current_price_minor: number;
  readonly delivery_available_quantity: number;
  readonly pickup_available_quantity: number;
}

export interface CatalogProductDetailRow extends CatalogProductListRow {
  readonly sku: string;
  readonly series_name: string | null;
  readonly description: string;
  readonly max_quantity_per_order: number;
  readonly images: readonly CatalogProductImageRow[];
  readonly reviews: readonly CatalogProductReviewRow[];
}

export interface CatalogProductImageRow {
  readonly image_path: string;
  readonly alt_text: string;
  readonly sort_order: number;
}

export interface CatalogProductReviewRow {
  readonly rating: number;
  readonly title: string | null;
  readonly body: string | null;
  readonly created_at: string;
}

export interface CatalogReleaseEventRow {
  readonly id: string;
  readonly product_id: string;
  readonly product_slug: string;
  readonly product_name: string;
  readonly product_release_status: ProductReleaseStatus;
  readonly product_release_date: string | null;
  readonly event_date: string;
  readonly event_type: string;
  readonly calendar_label: string | null;
}

export interface CatalogDataSource {
  readonly getProfileBySlug: (
    slug: string,
  ) => Promise<CatalogProfileRow | null>;
  readonly getMarketByCode: (code: string) => Promise<CatalogMarketRow | null>;
  readonly listHomepageSections: (
    profileId: string,
    marketId: string,
  ) => Promise<readonly CatalogHomepageSectionRow[]>;
  readonly listCategories: (
    profileId: string,
  ) => Promise<readonly StorefrontCategoryRow[]>;
  readonly listProductCards: (
    profileId: string,
    marketId: string,
  ) => Promise<readonly CatalogProductListRow[]>;
  readonly getProductDetailBySlug: (
    profileId: string,
    marketId: string,
    slug: string,
  ) => Promise<CatalogProductDetailRow | null>;
  readonly listReleaseEvents: (
    profileId: string,
    marketId: string,
    filters: CatalogReleaseEventFilters,
  ) => Promise<readonly CatalogReleaseEventRow[]>;
}

export interface CreateSupabaseCatalogRepositoryInput {
  readonly dataSource: CatalogDataSource;
  readonly now?: RepositoryNow;
}

export function createSupabaseCatalogRepository(
  input: CreateSupabaseCatalogRepositoryInput,
): CatalogRepository {
  return {
    async getConfig(context) {
      const { profile, market } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );

      return {
        profile: mapProfile(profile),
        market: mapMarket(market),
        features: {
          delivery: featureFlag(market, "delivery", true),
          pickup: featureFlag(market, "pickup", true),
          vaulting: featureFlag(market, "vaulting", true),
          apple_pay: featureFlag(market, "apple_pay", false),
          google_pay: featureFlag(market, "google_pay", false),
          venmo: featureFlag(market, "venmo", false),
        },
      };
    },
    async getHome(context) {
      const { profile, market } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );
      const rows = await input.dataSource.listHomepageSections(
        profile.id,
        market.id,
      );

      return {
        sections: rows
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((row) => ({
            section_key: row.section_key,
            title: row.title,
            subtitle: row.subtitle,
            content: row.content_json,
          })),
      };
    },
    async getCategories(context) {
      const { profile } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );
      const rows = await input.dataSource.listCategories(profile.id);

      return {
        categories: rows
          .slice()
          .sort((left, right) => left.sort_order - right.sort_order)
          .map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            description: row.description,
            image_path: row.image_path,
          })),
      };
    },
    async getProducts(context, filters) {
      const { profile, market } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );
      const at = resolveNow(input.now);
      const rows = await input.dataSource.listProductCards(
        profile.id,
        market.id,
      );
      const products = rows
        .map((row) => mapProductCard(row, profile.id, at))
        .filter((product) => productMatchesFilters(product, filters))
        .sort((left, right) => compareProductCards(left, right, filters.sort));

      return {
        products,
        filter_counts: {
          total: products.length,
          released: products.filter(
            (product) => product.release_status === "released",
          ).length,
          coming_soon: products.filter(
            (product) => product.release_status === "coming_soon",
          ).length,
          pickup_available: products.filter(
            (product) => product.inventory.pickup_available,
          ).length,
        },
      };
    },
    async getProductBySlug(context, slug) {
      const { profile, market } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );
      const row = await input.dataSource.getProductDetailBySlug(
        profile.id,
        market.id,
        slug,
      );

      if (!row) {
        return null;
      }

      return {
        product: mapProductDetail(row, profile.id, resolveNow(input.now)),
      };
    },
    async getReleaseEvents(context, filters) {
      const { profile, market } = await resolveStorefrontRows(
        input.dataSource,
        context,
      );
      const rows = await input.dataSource.listReleaseEvents(
        profile.id,
        market.id,
        filters,
      );
      const at = resolveNow(input.now);

      return {
        events: rows
          .filter((row) => eventMatchesFilters(row, filters))
          .map((row) => mapReleaseEvent(row, profile.id, at))
          .filter((event): event is CatalogJsonObject => event !== null),
      };
    },
  };
}

type CatalogJsonObject = { readonly [key: string]: CatalogJson };

interface StorefrontRows {
  readonly profile: CatalogProfileRow;
  readonly market: CatalogMarketRow;
}

async function resolveStorefrontRows(
  dataSource: CatalogDataSource,
  context: StorefrontContext,
): Promise<StorefrontRows> {
  const [profile, market] = await Promise.all([
    dataSource.getProfileBySlug(context.profileSlug),
    dataSource.getMarketByCode(context.marketCode),
  ]);

  if (!profile || !market) {
    throw new Error(
      `Storefront context not found for profile ${context.profileSlug} and market ${context.marketCode}`,
    );
  }

  return { profile, market };
}

function mapProfile(row: CatalogProfileRow): CatalogJson {
  return {
    id: row.id,
    slug: row.slug,
    display_name: row.display_name,
    brand_mode: row.brand_mode,
  };
}

function mapMarket(row: CatalogMarketRow): CatalogJson {
  return {
    id: row.id,
    code: row.code,
    currency_code: row.currency_code,
    locale: row.locale,
    language_code: row.language_code,
    buyer_country: row.buyer_country,
    paypal_page_type: row.paypal_page_type,
    paylater_enabled: row.paylater_enabled,
    paylater_buyer_country: row.paylater_buyer_country,
    sandbox_test_buyer_country: row.sandbox_test_buyer_country,
    market_version: row.market_version,
  };
}

function featureFlag(
  market: CatalogMarketRow,
  key: string,
  fallback: boolean,
): boolean {
  const value = market.payment_method_flags_json[key];
  return typeof value === "boolean" ? value : fallback;
}

type ProductCardDto = ReturnType<typeof mapProductCard>;

function mapProductCard(
  row: CatalogProductListRow,
  profileId: string,
  at: Date | string,
) {
  const purchaseState = getProductPurchaseState(
    mapCatalogProduct(row, profileId),
    at,
  );

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category_slug: row.category_slug,
    image_path: row.image_path,
    release_status: row.release_status,
    release_date: row.release_date,
    purchasable: purchaseState.isPurchasable,
    checkout_block_reason: purchaseState.checkoutBlockedReason,
    price: {
      currency_code: row.currency_code,
      regular_price_minor: row.regular_price_minor,
      current_price_minor: row.current_price_minor,
      is_on_sale: row.current_price_minor < row.regular_price_minor,
    },
    inventory: {
      delivery_available:
        purchaseState.isPurchasable && row.delivery_available_quantity > 0,
      pickup_available:
        purchaseState.isPurchasable && row.pickup_available_quantity > 0,
    },
  };
}

function mapProductDetail(
  row: CatalogProductDetailRow,
  profileId: string,
  at: Date | string,
) {
  const purchaseState = getProductPurchaseState(
    mapCatalogProduct(row, profileId),
    at,
  );
  const reviews = purchaseState.canShowReviews
    ? mapVisibleReviews(row.reviews)
    : {
        visible: false,
        summary: {
          average_rating: 0,
          review_count: 0,
        },
        items: [],
      };

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    series_name: row.series_name,
    description: row.description,
    category_slug: row.category_slug,
    release_status: row.release_status,
    release_date: row.release_date,
    purchasable: purchaseState.isPurchasable,
    checkout_block_reason: purchaseState.checkoutBlockedReason,
    max_quantity_per_order: row.max_quantity_per_order,
    price: {
      currency_code: row.currency_code,
      regular_price_minor: row.regular_price_minor,
      current_price_minor: row.current_price_minor,
      is_on_sale: row.current_price_minor < row.regular_price_minor,
    },
    images: row.images
      .slice()
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((image) => ({
        image_path: image.image_path,
        alt_text: image.alt_text,
      })),
    inventory: {
      delivery_available:
        purchaseState.isPurchasable && row.delivery_available_quantity > 0,
      pickup_available:
        purchaseState.isPurchasable && row.pickup_available_quantity > 0,
    },
    reviews,
  };
}

function mapVisibleReviews(reviews: readonly CatalogProductReviewRow[]) {
  const activeReviews = reviews.slice();
  const reviewCount = activeReviews.length;
  const averageRating =
    reviewCount === 0
      ? 0
      : Number(
          (
            activeReviews.reduce((sum, review) => sum + review.rating, 0) /
            reviewCount
          ).toFixed(1),
        );

  return {
    visible: true,
    summary: {
      average_rating: averageRating,
      review_count: reviewCount,
    },
    items: activeReviews.map((review) => ({
      rating: review.rating,
      title: review.title,
      body: review.body,
      created_at: review.created_at,
    })),
  };
}

function mapCatalogProduct(
  row: CatalogProductListRow,
  profileId: string,
): CatalogProduct {
  return {
    id: row.id,
    profileId: row.profile_id ?? profileId,
    slug: row.slug,
    name: row.name,
    releaseStatus: row.release_status,
    releaseDate: row.release_date,
    isActive: row.is_active ?? true,
  };
}

function productMatchesFilters(
  product: ProductCardDto,
  filters: CatalogProductListFilters,
): boolean {
  if (filters.query && !productMatchesSearch(product, filters.query)) {
    return false;
  }
  if (filters.categorySlug && product.category_slug !== filters.categorySlug) {
    return false;
  }
  if (
    filters.releaseStatus &&
    product.release_status !== filters.releaseStatus
  ) {
    return false;
  }
  if (
    filters.pickupAvailable !== null &&
    product.inventory.pickup_available !== filters.pickupAvailable
  ) {
    return false;
  }
  if (
    filters.priceMinMinor !== null &&
    product.price.current_price_minor < filters.priceMinMinor
  ) {
    return false;
  }
  if (
    filters.priceMaxMinor !== null &&
    product.price.current_price_minor > filters.priceMaxMinor
  ) {
    return false;
  }
  if (filters.availability === "delivery") {
    return product.inventory.delivery_available;
  }
  if (filters.availability === "pickup") {
    return product.inventory.pickup_available;
  }
  if (filters.availability === "available") {
    return (
      product.inventory.delivery_available || product.inventory.pickup_available
    );
  }
  return true;
}

function productMatchesSearch(product: ProductCardDto, query: string): boolean {
  const haystack = normalizeSearchText(
    [
      product.name,
      product.slug,
      product.category_slug,
      product.release_status,
    ].join(" "),
  );

  return normalizedSearchTerms(query).every((term) => haystack.includes(term));
}

function normalizedSearchTerms(query: string): readonly string[] {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareProductCards(
  left: ProductCardDto,
  right: ProductCardDto,
  sort: string | null,
): number {
  if (sort === "price_asc") {
    return left.price.current_price_minor - right.price.current_price_minor;
  }
  if (sort === "price_desc") {
    return right.price.current_price_minor - left.price.current_price_minor;
  }
  return 0;
}

function eventMatchesFilters(
  row: CatalogReleaseEventRow,
  filters: CatalogReleaseEventFilters,
): boolean {
  if (filters.from && row.event_date < filters.from) {
    return false;
  }
  if (filters.to && row.event_date > filters.to) {
    return false;
  }
  return true;
}

function mapReleaseEvent(
  row: CatalogReleaseEventRow,
  profileId: string,
  at: Date | string,
): CatalogJsonObject | null {
  const calendarEntry = buildReleaseCalendarEntry(
    {
      id: row.product_id,
      profileId,
      slug: row.product_slug,
      name: row.product_name,
      releaseStatus: row.product_release_status,
      releaseDate: row.product_release_date ?? row.event_date,
      isActive: true,
    },
    at,
  );

  if (!calendarEntry) {
    return null;
  }

  return {
    id: row.id,
    product_slug: row.product_slug,
    product_name: row.product_name,
    event_date: row.event_date,
    event_type: row.event_type,
    calendar_label: row.calendar_label,
    marker_style: calendarEntry.markerStyle,
    state: calendarEntry.state,
    links_to_pdp: calendarEntry.linksToPdp,
    pdp_href: `/products/${row.product_slug}`,
  };
}

function resolveNow(now: RepositoryNow | undefined): Date | string {
  if (typeof now === "function") {
    return now();
  }
  return now ?? new Date();
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabaseCatalogError {
  readonly message: string;
}

interface SupabaseCatalogResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseCatalogError | null;
}

interface SupabaseOrderOptions {
  readonly ascending?: boolean;
}

interface SupabaseCatalogQuery extends PromiseLike<
  SupabaseCatalogResult<unknown>
> {
  readonly select: (columns: string) => SupabaseCatalogQuery;
  readonly eq: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabaseCatalogQuery;
  readonly gte: (
    column: string,
    value: string | number,
  ) => SupabaseCatalogQuery;
  readonly lte: (
    column: string,
    value: string | number,
  ) => SupabaseCatalogQuery;
  readonly in: (
    column: string,
    values: readonly SupabasePrimitive[],
  ) => SupabaseCatalogQuery;
  readonly order: (
    column: string,
    options?: SupabaseOrderOptions,
  ) => SupabaseCatalogQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseCatalogResult<unknown>>;
}

export interface SupabaseCatalogClient {
  readonly from: (table: string) => SupabaseCatalogQuery;
}

interface SupabaseProductRow {
  readonly id: string;
  readonly profile_id: string;
  readonly category_id: string;
  readonly slug: string;
  readonly sku: string;
  readonly name: string;
  readonly series_name: string | null;
  readonly description: string;
  readonly release_status: ProductReleaseStatus;
  readonly release_date: string | null;
  readonly is_active: boolean;
  readonly max_quantity_per_order: number;
}

interface SupabaseProductPriceRow {
  readonly product_id: string;
  readonly currency_code: string;
  readonly regular_price_minor: number;
  readonly current_price_minor: number;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
}

interface SupabaseProductImageRow {
  readonly product_id: string;
  readonly image_path: string;
  readonly alt_text: string;
  readonly sort_order: number;
}

interface SupabaseInventoryRow {
  readonly product_id: string;
  readonly available_quantity: number;
}

interface SupabaseReleaseEventRow {
  readonly id: string;
  readonly product_id: string;
  readonly event_date: string;
  readonly event_type: string;
  readonly calendar_label: string | null;
}

export function createSupabaseCatalogDataSource(
  supabase: SupabaseCatalogClient,
): CatalogDataSource {
  return {
    async getProfileBySlug(slug) {
      return queryOne<CatalogProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug, display_name, brand_mode")
          .eq("slug", slug)
          .maybeSingle(),
        `Load profile ${slug}`,
      );
    },
    async getMarketByCode(code) {
      return queryOne<CatalogMarketRow>(
        supabase
          .from("markets")
          .select(
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
              "payment_method_flags_json",
              "market_version",
            ].join(", "),
          )
          .eq("code", code)
          .maybeSingle(),
        `Load market ${code}`,
      );
    },
    async listHomepageSections(profileId, marketId) {
      return queryMany<CatalogHomepageSectionRow>(
        supabase
          .from("homepage_sections")
          .select("section_key, title, subtitle, content_json, sort_order")
          .eq("profile_id", profileId)
          .eq("market_id", marketId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        "List homepage sections",
      );
    },
    async listCategories(profileId) {
      return queryMany<StorefrontCategoryRow>(
        supabase
          .from("categories")
          .select("id, slug, name, description, image_path, sort_order")
          .eq("profile_id", profileId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        "List categories",
      );
    },
    async listProductCards(profileId, marketId) {
      const [products, categories, prices, images, deliveryRows, pickupRows] =
        await Promise.all([
          listProducts(supabase, profileId),
          queryMany<StorefrontCategoryRow>(
            supabase
              .from("categories")
              .select("id, slug, name, description, image_path, sort_order")
              .eq("profile_id", profileId)
              .eq("is_active", true),
            "Load product categories",
          ),
          listProductPrices(supabase, profileId, marketId),
          listProductImages(supabase, []),
          listDeliveryInventory(supabase, profileId, marketId),
          listPickupInventory(supabase, profileId, marketId),
        ]);
      const productIds = products.map((product) => product.id);
      const scopedImages = productIds.length
        ? images.filter((image) => productIds.includes(image.product_id))
        : [];

      return mapProductRows({
        products,
        categories,
        prices,
        images: scopedImages,
        deliveryRows,
        pickupRows,
      });
    },
    async getProductDetailBySlug(profileId, marketId, slug) {
      const product = await queryOne<SupabaseProductRow>(
        supabase
          .from("products")
          .select(
            [
              "id",
              "profile_id",
              "category_id",
              "slug",
              "sku",
              "name",
              "series_name",
              "description",
              "release_status",
              "release_date",
              "is_active",
              "max_quantity_per_order",
            ].join(", "),
          )
          .eq("profile_id", profileId)
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle(),
        `Load product ${slug}`,
      );

      if (!product) {
        return null;
      }

      const [category, prices, images, deliveryRows, pickupRows, reviews] =
        await Promise.all([
          queryOne<StorefrontCategoryRow>(
            supabase
              .from("categories")
              .select("id, slug, name, description, image_path, sort_order")
              .eq("id", product.category_id)
              .eq("profile_id", profileId)
              .maybeSingle(),
            `Load category for product ${slug}`,
          ),
          listProductPrices(supabase, profileId, marketId),
          listProductImages(supabase, [product.id]),
          listDeliveryInventory(supabase, profileId, marketId),
          listPickupInventory(supabase, profileId, marketId),
          queryMany<CatalogProductReviewRow>(
            supabase
              .from("reviews")
              .select("rating, title, body, created_at")
              .eq("profile_id", profileId)
              .eq("product_id", product.id)
              .eq("status", "active")
              .order("created_at", { ascending: false }),
            `Load reviews for product ${slug}`,
          ),
        ]);
      const row = mapProductRows({
        products: [product],
        categories: category ? [category] : [],
        prices,
        images,
        deliveryRows,
        pickupRows,
      })[0];

      if (!row) {
        throw new Error(`Product ${slug} has no active market price`);
      }

      return {
        ...row,
        sku: product.sku,
        series_name: product.series_name,
        description: product.description,
        max_quantity_per_order: product.max_quantity_per_order,
        images: images.map((image) => ({
          image_path: image.image_path,
          alt_text: image.alt_text,
          sort_order: image.sort_order,
        })),
        reviews,
      };
    },
    async listReleaseEvents(profileId, marketId, filters) {
      let query = supabase
        .from("release_events")
        .select("id, product_id, event_date, event_type, calendar_label")
        .eq("profile_id", profileId)
        .eq("market_id", marketId);

      if (filters.from) {
        query = query.gte("event_date", filters.from);
      }
      if (filters.to) {
        query = query.lte("event_date", filters.to);
      }

      const releaseRows = await queryMany<SupabaseReleaseEventRow>(
        query.order("event_date", { ascending: true }),
        "List release events",
      );
      const productIds = releaseRows.map((row) => row.product_id);
      const products = productIds.length
        ? await queryMany<SupabaseProductRow>(
            supabase
              .from("products")
              .select(
                [
                  "id",
                  "profile_id",
                  "category_id",
                  "slug",
                  "sku",
                  "name",
                  "series_name",
                  "description",
                  "release_status",
                  "release_date",
                  "is_active",
                  "max_quantity_per_order",
                ].join(", "),
              )
              .eq("profile_id", profileId)
              .in("id", productIds),
            "Load release event products",
          )
        : [];
      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      return releaseRows.flatMap((row) => {
        const product = productsById.get(row.product_id);
        if (!product) {
          return [];
        }
        return [
          {
            id: row.id,
            product_id: row.product_id,
            product_slug: product.slug,
            product_name: product.name,
            product_release_status: product.release_status,
            product_release_date: product.release_date,
            event_date: row.event_date,
            event_type: row.event_type,
            calendar_label: row.calendar_label,
          },
        ];
      });
    },
  };
}

interface ProductRowsInput {
  readonly products: readonly SupabaseProductRow[];
  readonly categories: readonly StorefrontCategoryRow[];
  readonly prices: readonly SupabaseProductPriceRow[];
  readonly images: readonly SupabaseProductImageRow[];
  readonly deliveryRows: readonly SupabaseInventoryRow[];
  readonly pickupRows: readonly SupabaseInventoryRow[];
}

function mapProductRows(input: ProductRowsInput): CatalogProductListRow[] {
  const categorySlugById = new Map(
    input.categories.map((category) => [category.id, category.slug]),
  );
  const firstImageByProductId = firstImageMap(input.images);
  const deliveryQuantityByProductId = quantityMap(input.deliveryRows);
  const pickupQuantityByProductId = quantityMap(input.pickupRows);
  const priceByProductId = new Map(
    input.prices.map((price) => [price.product_id, price]),
  );

  return input.products.flatMap((product) => {
    const price = priceByProductId.get(product.id);
    const categorySlug = categorySlugById.get(product.category_id);

    if (!price || !categorySlug) {
      return [];
    }

    return [
      {
        id: product.id,
        profile_id: product.profile_id,
        slug: product.slug,
        name: product.name,
        category_slug: categorySlug,
        image_path: firstImageByProductId.get(product.id)?.image_path ?? null,
        release_status: product.release_status,
        release_date: product.release_date,
        is_active: product.is_active,
        currency_code: price.currency_code,
        regular_price_minor: price.regular_price_minor,
        current_price_minor: price.current_price_minor,
        delivery_available_quantity:
          deliveryQuantityByProductId.get(product.id) ?? 0,
        pickup_available_quantity:
          pickupQuantityByProductId.get(product.id) ?? 0,
      },
    ];
  });
}

function firstImageMap(
  images: readonly SupabaseProductImageRow[],
): Map<string, SupabaseProductImageRow> {
  const imageMap = new Map<string, SupabaseProductImageRow>();

  for (const image of images) {
    const existing = imageMap.get(image.product_id);
    if (!existing || image.sort_order < existing.sort_order) {
      imageMap.set(image.product_id, image);
    }
  }

  return imageMap;
}

function quantityMap(
  rows: readonly SupabaseInventoryRow[],
): Map<string, number> {
  const quantityByProductId = new Map<string, number>();

  for (const row of rows) {
    quantityByProductId.set(
      row.product_id,
      (quantityByProductId.get(row.product_id) ?? 0) + row.available_quantity,
    );
  }

  return quantityByProductId;
}

async function listProducts(
  supabase: SupabaseCatalogClient,
  profileId: string,
): Promise<readonly SupabaseProductRow[]> {
  return queryMany<SupabaseProductRow>(
    supabase
      .from("products")
      .select(
        [
          "id",
          "profile_id",
          "category_id",
          "slug",
          "sku",
          "name",
          "series_name",
          "description",
          "release_status",
          "release_date",
          "is_active",
          "max_quantity_per_order",
        ].join(", "),
      )
      .eq("profile_id", profileId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    "List products",
  );
}

async function listProductPrices(
  supabase: SupabaseCatalogClient,
  profileId: string,
  marketId: string,
): Promise<readonly SupabaseProductPriceRow[]> {
  return queryMany<SupabaseProductPriceRow>(
    supabase
      .from("product_prices")
      .select(
        [
          "product_id",
          "currency_code",
          "regular_price_minor",
          "current_price_minor",
          "starts_at",
          "ends_at",
        ].join(", "),
      )
      .eq("profile_id", profileId)
      .eq("market_id", marketId)
      .eq("is_active", true),
    "List product prices",
  );
}

async function listProductImages(
  supabase: SupabaseCatalogClient,
  productIds: readonly string[],
): Promise<readonly SupabaseProductImageRow[]> {
  const query = supabase
    .from("product_images")
    .select("product_id, image_path, alt_text, sort_order")
    .order("sort_order", { ascending: true });

  return queryMany<SupabaseProductImageRow>(
    productIds.length ? query.in("product_id", productIds) : query,
    "List product images",
  );
}

async function listDeliveryInventory(
  supabase: SupabaseCatalogClient,
  profileId: string,
  marketId: string,
): Promise<readonly SupabaseInventoryRow[]> {
  return queryMany<SupabaseInventoryRow>(
    supabase
      .from("central_inventory")
      .select("product_id, available_quantity")
      .eq("profile_id", profileId)
      .eq("market_id", marketId),
    "List delivery inventory",
  );
}

async function listPickupInventory(
  supabase: SupabaseCatalogClient,
  profileId: string,
  marketId: string,
): Promise<readonly SupabaseInventoryRow[]> {
  return queryMany<SupabaseInventoryRow>(
    supabase
      .from("store_inventory")
      .select("product_id, available_quantity")
      .eq("profile_id", profileId)
      .eq("market_id", marketId),
    "List pickup inventory",
  );
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseCatalogResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseCatalogResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    return [];
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`${description}: expected list data`);
  }
  return result.data as TRow[];
}

import { assertMinorUnit, subtractMinor, type MinorUnit } from "./money.js";

export type ProductReleaseStatus = "released" | "coming_soon" | "unreleased";
export type CalendarMarkerStyle = "outlined-circle";
export type ReleaseCalendarState = "released" | "future" | "blocked";
export type CheckoutBlockedReason =
  | "inactive"
  | "not_released"
  | "release_pending";

export interface CatalogProduct {
  readonly id: string;
  readonly profileId: string;
  readonly slug: string;
  readonly name: string;
  readonly releaseStatus: ProductReleaseStatus;
  readonly releaseDate: string | null;
  readonly isActive: boolean;
}

export interface ProductPriceRow {
  readonly id: string;
  readonly profileId: string;
  readonly marketId: string;
  readonly productId: string;
  readonly currencyCode: string;
  readonly regularPriceMinor: number;
  readonly currentPriceMinor: number;
  readonly startsAt: string | null;
  readonly endsAt: string | null;
  readonly isActive: boolean;
}

export interface ProductPriceLookup {
  readonly profileId: string;
  readonly marketId: string;
  readonly productId: string;
  readonly at?: Date | string;
}

export interface ActiveProductPrice {
  readonly id: string;
  readonly profileId: string;
  readonly marketId: string;
  readonly productId: string;
  readonly currencyCode: string;
  readonly regularPriceMinor: MinorUnit;
  readonly activePriceMinor: MinorUnit;
  readonly isOnSale: boolean;
  readonly saleDiscountMinor: MinorUnit;
}

export interface ProductPurchaseState {
  readonly isReleased: boolean;
  readonly isPurchasable: boolean;
  readonly canShowReviews: boolean;
  readonly checkoutBlockedReason: CheckoutBlockedReason | null;
}

export interface ReleaseCalendarEntry {
  readonly productId: string;
  readonly productSlug: string;
  readonly eventDate: string;
  readonly markerStyle: CalendarMarkerStyle;
  readonly state: ReleaseCalendarState;
  readonly linksToPdp: boolean;
}

export function selectActiveProductPrice(
  prices: readonly ProductPriceRow[],
  lookup: ProductPriceLookup,
): ActiveProductPrice | undefined {
  const at = toDate(lookup.at ?? new Date());
  const price = prices.find(
    (candidate) =>
      candidate.isActive &&
      candidate.profileId === lookup.profileId &&
      candidate.marketId === lookup.marketId &&
      candidate.productId === lookup.productId &&
      isInPriceWindow(candidate, at),
  );
  return price ? toActiveProductPrice(price) : undefined;
}

export function requireActiveProductPrice(
  prices: readonly ProductPriceRow[],
  lookup: ProductPriceLookup,
): ActiveProductPrice {
  const price = selectActiveProductPrice(prices, lookup);
  if (!price) {
    throw new Error(
      `No active product price for product ${lookup.productId} in market ${lookup.marketId}`,
    );
  }
  return price;
}

export function getProductPurchaseState(
  product: CatalogProduct,
  at: Date | string = new Date(),
): ProductPurchaseState {
  if (!product.isActive) {
    return blockedState("inactive");
  }
  if (product.releaseStatus !== "released") {
    return blockedState("not_released");
  }
  if (product.releaseDate && compareDateOnly(product.releaseDate, at) > 0) {
    return blockedState("release_pending");
  }
  return {
    isReleased: true,
    isPurchasable: true,
    canShowReviews: true,
    checkoutBlockedReason: null,
  };
}

export function buildReleaseCalendarEntry(
  product: CatalogProduct,
  at: Date | string = new Date(),
): ReleaseCalendarEntry | null {
  if (!product.releaseDate) {
    return null;
  }
  const purchaseState = getProductPurchaseState(product, at);
  return {
    productId: product.id,
    productSlug: product.slug,
    eventDate: product.releaseDate,
    markerStyle: "outlined-circle",
    state: purchaseState.isReleased
      ? "released"
      : compareDateOnly(product.releaseDate, at) > 0
        ? "future"
        : "blocked",
    linksToPdp: true,
  };
}

function toActiveProductPrice(price: ProductPriceRow): ActiveProductPrice {
  const regularPriceMinor = assertMinorUnit(
    price.regularPriceMinor,
    "regular price",
  );
  const activePriceMinor = assertMinorUnit(
    price.currentPriceMinor,
    "current price",
  );
  if (activePriceMinor > regularPriceMinor) {
    throw new Error("current price cannot exceed regular price");
  }
  return {
    id: price.id,
    profileId: price.profileId,
    marketId: price.marketId,
    productId: price.productId,
    currencyCode: price.currencyCode,
    regularPriceMinor,
    activePriceMinor,
    isOnSale: activePriceMinor < regularPriceMinor,
    saleDiscountMinor: subtractMinor(regularPriceMinor, activePriceMinor),
  };
}

function isInPriceWindow(price: ProductPriceRow, at: Date): boolean {
  const startsAt = price.startsAt ? toDate(price.startsAt) : null;
  const endsAt = price.endsAt ? toDate(price.endsAt) : null;
  return (!startsAt || startsAt <= at) && (!endsAt || endsAt > at);
}

function blockedState(reason: CheckoutBlockedReason): ProductPurchaseState {
  return {
    isReleased: false,
    isPurchasable: false,
    canShowReviews: false,
    checkoutBlockedReason: reason,
  };
}

function compareDateOnly(left: Date | string, right: Date | string): number {
  return dateOnlyTimestamp(left) - dateOnlyTimestamp(right);
}

function dateOnlyTimestamp(value: Date | string): number {
  const date = toDate(
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00.000Z`
      : value,
  );
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toDate(value: Date | string): Date {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be valid");
  }
  return date;
}

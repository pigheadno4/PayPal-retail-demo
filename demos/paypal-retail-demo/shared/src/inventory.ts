import { assertMinorUnit, multiplyMinor, type MinorUnit } from "./money.js";

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

export interface PickupStoreRow extends GeoPoint {
  readonly id: string;
  readonly marketId: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface PickupStoreInventoryRow {
  readonly storeId: string;
  readonly productId: string;
  readonly availableQuantity: number;
}

export interface PickupCartLine {
  readonly productId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
}

export interface RankPickupStoresInput {
  readonly stores: readonly PickupStoreRow[];
  readonly inventory: readonly PickupStoreInventoryRow[];
  readonly cartLines: readonly PickupCartLine[];
  readonly buyerLocation?: GeoPoint | null;
  readonly fallbackStoreId?: string | null;
}

export interface RankedPickupStore {
  readonly storeId: string;
  readonly storeName: string;
  readonly distanceKm: number | null;
  readonly readyQuantity: number;
  readonly unavailableQuantity: number;
  readonly hasFullInventory: boolean;
  readonly rankReason: "distance" | "fallback_full_inventory";
}

export interface PickupReadyItem {
  readonly productId: string;
  readonly requestedQuantity: number;
  readonly fulfillableQuantity: number;
  readonly unavailableQuantity: number;
  readonly unitPriceMinor: MinorUnit;
  readonly payableSubtotalMinor: MinorUnit;
}

export interface PickupUnavailableItem {
  readonly productId: string;
  readonly requestedQuantity: number;
  readonly fulfillableQuantity: number;
  readonly unavailableQuantity: number;
  readonly unitPriceMinor: MinorUnit;
  readonly unavailableSubtotalMinor: MinorUnit;
}

export interface PickupInventorySplit {
  readonly readyItems: readonly PickupReadyItem[];
  readonly unavailableItems: readonly PickupUnavailableItem[];
  readonly payableSubtotalMinor: MinorUnit;
  readonly unavailableSubtotalMinor: MinorUnit;
}

export interface PickupInventorySplitInput {
  readonly cartLines: readonly PickupCartLine[];
  readonly inventory: readonly PickupStoreInventoryRow[];
}

const earthRadiusKm = 6371;

export function haversineDistanceKm(left: GeoPoint, right: GeoPoint): number {
  validateGeoPoint(left);
  validateGeoPoint(right);
  const deltaLatitude = toRadians(right.latitude - left.latitude);
  const deltaLongitude = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(deltaLongitude / 2) ** 2;
  return (
    earthRadiusKm *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function rankPickupStores(
  input: RankPickupStoresInput,
): RankedPickupStore[] {
  const activeStores = input.stores.filter((store) => store.isActive);
  const ranked = activeStores.map((store) => {
    const split = calculatePickupInventorySplit({
      cartLines: input.cartLines,
      inventory: input.inventory.filter((row) => row.storeId === store.id),
    });
    return {
      storeId: store.id,
      storeName: store.name,
      distanceKm: input.buyerLocation
        ? haversineDistanceKm(input.buyerLocation, store)
        : null,
      readyQuantity: split.readyItems.reduce(
        (total, item) => total + item.fulfillableQuantity,
        0,
      ),
      unavailableQuantity: split.readyItems.reduce(
        (total, item) => total + item.unavailableQuantity,
        0,
      ),
      hasFullInventory: split.unavailableItems.length === 0,
      rankReason: "distance" as const,
    };
  });

  if (!input.buyerLocation && input.fallbackStoreId) {
    const fallbackStoreId = input.fallbackStoreId;
    return ranked
      .sort((left, right) => {
        const leftFallbackScore = fallbackScore(left, fallbackStoreId);
        const rightFallbackScore = fallbackScore(right, fallbackStoreId);
        if (leftFallbackScore !== rightFallbackScore) {
          return rightFallbackScore - leftFallbackScore;
        }
        return right.readyQuantity - left.readyQuantity;
      })
      .map((store, index) =>
        index === 0 &&
        store.storeId === fallbackStoreId &&
        store.hasFullInventory
          ? { ...store, rankReason: "fallback_full_inventory" as const }
          : store,
      );
  }

  return ranked.sort((left, right) => {
    const distanceDiff =
      (left.distanceKm ?? Infinity) - (right.distanceKm ?? Infinity);
    if (distanceDiff !== 0) {
      return distanceDiff;
    }
    return right.readyQuantity - left.readyQuantity;
  });
}

export function calculatePickupInventorySplit(
  input: PickupInventorySplitInput,
): PickupInventorySplit {
  const readyItems: PickupReadyItem[] = [];
  const unavailableItems: PickupUnavailableItem[] = [];

  for (const line of input.cartLines) {
    const requestedQuantity = assertQuantity(
      line.quantity,
      "requested quantity",
    );
    const unitPriceMinor = assertMinorUnit(line.unitPriceMinor, "unit price");
    const availableQuantity = availableQuantityForProduct(
      input.inventory,
      line.productId,
    );
    const fulfillableQuantity = Math.min(requestedQuantity, availableQuantity);
    const unavailableQuantity = requestedQuantity - fulfillableQuantity;
    const payableSubtotalMinor = multiplyMinor(
      unitPriceMinor,
      fulfillableQuantity,
    );

    readyItems.push({
      productId: line.productId,
      requestedQuantity,
      fulfillableQuantity,
      unavailableQuantity,
      unitPriceMinor,
      payableSubtotalMinor,
    });

    if (unavailableQuantity > 0) {
      unavailableItems.push({
        productId: line.productId,
        requestedQuantity,
        fulfillableQuantity,
        unavailableQuantity,
        unitPriceMinor,
        unavailableSubtotalMinor: multiplyMinor(
          unitPriceMinor,
          unavailableQuantity,
        ),
      });
    }
  }

  return {
    readyItems,
    unavailableItems,
    payableSubtotalMinor: readyItems.reduce(
      (total, item) => total + item.payableSubtotalMinor,
      0,
    ),
    unavailableSubtotalMinor: unavailableItems.reduce(
      (total, item) => total + item.unavailableSubtotalMinor,
      0,
    ),
  };
}

function fallbackScore(
  store: RankedPickupStore,
  fallbackStoreId: string,
): number {
  return store.storeId === fallbackStoreId && store.hasFullInventory ? 1 : 0;
}

function availableQuantityForProduct(
  inventory: readonly PickupStoreInventoryRow[],
  productId: string,
): number {
  return inventory
    .filter((row) => row.productId === productId)
    .reduce(
      (total, row) =>
        total + assertQuantity(row.availableQuantity, "available quantity"),
      0,
    );
}

function assertQuantity(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function validateGeoPoint(point: GeoPoint): void {
  if (point.latitude < -90 || point.latitude > 90) {
    throw new Error("latitude must be between -90 and 90");
  }
  if (point.longitude < -180 || point.longitude > 180) {
    throw new Error("longitude must be between -180 and 180");
  }
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

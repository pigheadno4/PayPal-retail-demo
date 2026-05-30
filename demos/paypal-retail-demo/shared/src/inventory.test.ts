import { describe, expect, it } from "vitest";
import {
  calculatePickupInventorySplit,
  haversineDistanceKm,
  rankPickupStores,
  type PickupCartLine,
  type PickupStoreInventoryRow,
  type PickupStoreRow,
} from "./inventory.js";

const stores: PickupStoreRow[] = [
  {
    id: "melrose",
    marketId: "US",
    name: "Los Angeles Melrose",
    latitude: 34.0837,
    longitude: -118.3614,
    isActive: true,
  },
  {
    id: "union-square",
    marketId: "US",
    name: "San Francisco Union Square",
    latitude: 37.7858,
    longitude: -122.4078,
    isActive: true,
  },
  {
    id: "soho",
    marketId: "US",
    name: "New York SoHo",
    latitude: 40.7247,
    longitude: -74.0007,
    isActive: true,
  },
  {
    id: "inactive",
    marketId: "US",
    name: "Inactive Store",
    latitude: 34,
    longitude: -118,
    isActive: false,
  },
];

const cartLines: PickupCartLine[] = [
  {
    productId: "labubu",
    quantity: 2,
    unitPriceMinor: 1599,
  },
  {
    productId: "molly",
    quantity: 1,
    unitPriceMinor: 2499,
  },
];

const inventory: PickupStoreInventoryRow[] = [
  {
    storeId: "melrose",
    productId: "labubu",
    availableQuantity: 1,
  },
  {
    storeId: "melrose",
    productId: "molly",
    availableQuantity: 1,
  },
  {
    storeId: "union-square",
    productId: "labubu",
    availableQuantity: 5,
  },
  {
    storeId: "union-square",
    productId: "molly",
    availableQuantity: 5,
  },
  {
    storeId: "soho",
    productId: "labubu",
    availableQuantity: 5,
  },
  {
    storeId: "soho",
    productId: "molly",
    availableQuantity: 5,
  },
];

describe("pickup store ranking", () => {
  it("calculates deterministic Haversine distance in kilometers", () => {
    expect(
      Math.round(
        haversineDistanceKm(
          { latitude: 34.0522, longitude: -118.2437 },
          { latitude: 37.7749, longitude: -122.4194 },
        ),
      ),
    ).toBe(559);
  });

  it("preselects the nearest active store even when inventory is partial", () => {
    const ranked = rankPickupStores({
      stores,
      inventory,
      cartLines,
      buyerLocation: {
        latitude: 34.0522,
        longitude: -118.2437,
      },
    });

    expect(ranked[0]).toMatchObject({
      storeId: "melrose",
      hasFullInventory: false,
      readyQuantity: 2,
      unavailableQuantity: 1,
    });
    expect(ranked.map((store) => store.storeId)).toEqual([
      "melrose",
      "union-square",
      "soho",
    ]);
  });

  it("uses a full-inventory fallback store when buyer location is unavailable", () => {
    const ranked = rankPickupStores({
      stores,
      inventory,
      cartLines,
      fallbackStoreId: "union-square",
    });

    expect(ranked[0]).toMatchObject({
      storeId: "union-square",
      distanceKm: null,
      hasFullInventory: true,
      rankReason: "fallback_full_inventory",
    });
  });
});

describe("partial pickup inventory split", () => {
  it("excludes unavailable quantities from the pickup payment amount", () => {
    const split = calculatePickupInventorySplit({
      cartLines,
      inventory: inventory.filter((row) => row.storeId === "melrose"),
    });

    expect(split.readyItems).toEqual([
      {
        productId: "labubu",
        requestedQuantity: 2,
        fulfillableQuantity: 1,
        unavailableQuantity: 1,
        unitPriceMinor: 1599,
        payableSubtotalMinor: 1599,
      },
      {
        productId: "molly",
        requestedQuantity: 1,
        fulfillableQuantity: 1,
        unavailableQuantity: 0,
        unitPriceMinor: 2499,
        payableSubtotalMinor: 2499,
      },
    ]);
    expect(split.unavailableItems).toEqual([
      {
        productId: "labubu",
        requestedQuantity: 2,
        fulfillableQuantity: 1,
        unavailableQuantity: 1,
        unitPriceMinor: 1599,
        unavailableSubtotalMinor: 1599,
      },
    ]);
    expect(split.payableSubtotalMinor).toBe(4098);
    expect(split.unavailableSubtotalMinor).toBe(1599);
  });
});

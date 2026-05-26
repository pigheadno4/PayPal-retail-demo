import { describe, expect, it } from "vitest";
import { buildSeedDataset, stableUuid } from "./seed-data.js";
import { buildSeedSql } from "./seed-sql.js";

describe("retail demo seed data", () => {
  it("creates the agreed catalog and store shape", () => {
    const dataset = buildSeedDataset();

    expect(dataset.summary.profiles).toBe(2);
    expect(dataset.summary.markets).toBe(2);
    expect(dataset.summary.categories).toBe(10);
    expect(dataset.summary.products).toBe(50);
    expect(dataset.summary.productPrices).toBe(100);
    expect(dataset.summary.productImages).toBe(150);
    expect(dataset.summary.stores).toBe(18);
    expect(dataset.summary.storePickupDates).toBe(126);
    expect(dataset.summary.centralInventory).toBe(100);
    expect(dataset.summary.storeInventory).toBe(900);
    expect(dataset.summary.promoRules).toBe(16);
  });

  it("uses stable UUIDs so repeated seeds are idempotent", () => {
    expect(stableUuid("profile:popmart")).toBe(stableUuid("profile:popmart"));
    expect(stableUuid("profile:popmart")).not.toBe(
      stableUuid("profile:generic"),
    );
  });

  it("does not generate duplicate row IDs within a table", () => {
    const dataset = buildSeedDataset();

    for (const table of dataset.tables) {
      const ids = table.rows.map((row) => row.id);
      expect(new Set(ids).size, table.name).toBe(ids.length);
    }
  });

  it("generates upsert SQL for the private app schema", () => {
    const sql = buildSeedSql(buildSeedDataset());

    expect(sql).toContain("insert into app.profiles");
    expect(sql).toContain("insert into app.products");
    expect(sql).toContain('on conflict ("id") do update set');
    expect(sql).toContain("commit;");
  });
});

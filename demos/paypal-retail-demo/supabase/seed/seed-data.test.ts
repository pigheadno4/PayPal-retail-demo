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

  it("creates guarded buyer, account, and order scenarios", () => {
    const dataset = buildSeedDataset();

    expect(dataset.summary.authUsers).toBe(5);
    expect(dataset.summary.authIdentities).toBe(5);
    expect(dataset.summary.userProfiles).toBe(5);
    expect(dataset.summary.addresses).toBe(5);
    expect(dataset.summary.savedPaymentMethods).toBe(4);
    expect(dataset.summary.carts).toBe(5);
    expect(dataset.summary.orders).toBe(5);
    expect(dataset.summary.orderItems).toBe(7);
    expect(dataset.summary.orderAddresses).toBe(10);
    expect(dataset.summary.guestOrderAccess).toBe(1);
    expect(dataset.summary.paymentSessions).toBe(5);
    expect(dataset.summary.promoEvaluations).toBe(5);
    expect(dataset.summary.totalSnapshots).toBe(5);
    expect(dataset.summary.reviews).toBe(2);
    expect(dataset.summary.webhookEvents).toBe(2);
  });

  it("includes pending resume and completed review scenarios", () => {
    const dataset = buildSeedDataset();
    const orders = dataset.tables.find((table) => table.name === "app.orders");
    const reviews = dataset.tables.find(
      (table) => table.name === "app.reviews",
    );

    expect(orders?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fulfillment_mode: "delivery",
          status: "pending",
          payment_status: "started",
        }),
        expect.objectContaining({
          fulfillment_mode: "pickup",
          status: "pending",
          payment_status: "failed",
        }),
        expect.objectContaining({
          fulfillment_mode: "delivery",
          status: "delivered",
          payment_status: "captured",
        }),
        expect.objectContaining({
          fulfillment_mode: "pickup",
          status: "picked_up",
          payment_status: "captured",
        }),
      ]),
    );
    expect(reviews?.rows.every((row) => row.status === "active")).toBe(true);
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

  it("does not insert Supabase generated auth columns", () => {
    const sql = buildSeedSql(buildSeedDataset());
    const authUsersInsert = sql.slice(
      sql.indexOf("insert into auth.users"),
      sql.indexOf("insert into auth.identities"),
    );
    const authIdentitiesInsert = sql.slice(
      sql.indexOf("insert into auth.identities"),
      sql.indexOf("insert into app.user_profiles"),
    );
    const authIdentitiesColumns = authIdentitiesInsert.slice(
      0,
      authIdentitiesInsert.indexOf("\nvalues"),
    );

    expect(authUsersInsert).toContain('"email_confirmed_at"');
    expect(authUsersInsert).not.toContain('"confirmed_at"');
    expect(authIdentitiesColumns).toContain('"identity_data"');
    expect(authIdentitiesColumns).not.toContain('"email"');
  });

  it("seeds Supabase Auth password users with token string fields Auth can read", () => {
    const dataset = buildSeedDataset();
    const authUsers = dataset.tables.find(
      (table) => table.name === "auth.users",
    );

    expect(authUsers?.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          confirmation_token: "",
          recovery_token: "",
          email_change: "",
          email_change_token_new: "",
        }),
      ]),
    );
    const authUserCount = dataset.summary.authUsers;
    expect(authUserCount).toBeDefined();
    expect(authUsers?.rows).toHaveLength(authUserCount ?? 0);
  });
});

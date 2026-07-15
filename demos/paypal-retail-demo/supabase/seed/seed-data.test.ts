import { existsSync } from "node:fs";

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
    expect(dataset.summary.productImages).toBe(50);
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
    expect(dataset.summary.orders).toBe(6);
    expect(dataset.summary.orderItems).toBe(8);
    expect(dataset.summary.orderAddresses).toBe(12);
    expect(dataset.summary.guestOrderAccess).toBe(1);
    expect(dataset.summary.paymentSessions).toBe(6);
    expect(dataset.summary.promoEvaluations).toBe(6);
    expect(dataset.summary.totalSnapshots).toBe(6);
    expect(dataset.summary.reviews).toBe(2);
    expect(dataset.summary.webhookEvents).toBe(3);
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

  it("seeds an Account-owned actionable delivery order for lifecycle evidence", () => {
    const dataset = buildSeedDataset();
    const orders = dataset.tables.find((table) => table.name === "app.orders");
    const lifecycleEvents = dataset.tables.find(
      (table) => table.name === "app.order_lifecycle_events",
    );
    const aliceAuthUserId = stableUuid("auth-user:alice-la");
    const evidenceOrder = orders?.rows.find(
      (row) => row.order_number === "DO-20260714-900001",
    );

    expect(evidenceOrder).toEqual(
      expect.objectContaining({
        auth_user_id: aliceAuthUserId,
        fulfillment_mode: "delivery",
        status: "paid",
        payment_status: "captured",
      }),
    );
    expect(
      lifecycleEvents?.rows.some(
        (row) =>
          row.order_id === evidenceOrder?.id &&
          row.from_status === null &&
          row.to_status === "paid" &&
          row.actor_type === "webhook",
      ),
    ).toBe(true);
  });

  it("seeds a real active review for the primary Molly PDP", () => {
    const dataset = buildSeedDataset();
    const products = dataset.tables.find(
      (table) => table.name === "app.products",
    );
    const reviews = dataset.tables.find(
      (table) => table.name === "app.reviews",
    );
    const mollyBlindBox = products?.rows.find(
      (row) =>
        row.profile_id === stableUuid("profile:popmart") &&
        row.slug === "blind-boxes-2",
    );

    expect(mollyBlindBox).toBeTruthy();
    expect(
      reviews?.rows.some(
        (row) =>
          row.product_id === mollyBlindBox?.id && row.status === "active",
      ),
    ).toBe(true);
  });

  it("uses stable UUIDs so repeated seeds are idempotent", () => {
    expect(stableUuid("profile:popmart")).toBe(stableUuid("profile:popmart"));
    expect(stableUuid("profile:popmart")).not.toBe(
      stableUuid("profile:generic"),
    );
  });

  it("points POP MART primary product images at generated local PNG assets", () => {
    const dataset = buildSeedDataset();
    const productTable = dataset.tables.find(
      (table) => table.name === "app.products",
    );
    const productImageTable = dataset.tables.find(
      (table) => table.name === "app.product_images",
    );
    const popmartProductIds = new Set(
      productTable?.rows
        .filter((row) => row.profile_id === stableUuid("profile:popmart"))
        .map((row) => row.id),
    );

    const popmartImages =
      productImageTable?.rows.filter((row) =>
        popmartProductIds.has(String(row.product_id)),
      ) ?? [];

    expect(popmartImages).toHaveLength(25);
    for (const image of popmartImages) {
      expect(image.sort_order).toBe(1);
      expect(image.image_path).toMatch(
        /^\/assets\/popmart\/products\/[a-z0-9-]+-1\.png$/,
      );
      expect(
        existsSync(
          new URL(`../../web/public${image.image_path}`, import.meta.url),
        ),
        String(image.image_path),
      ).toBe(true);
    }
  });

  it("uses descriptive POP MART product image alt text instead of generic view labels", () => {
    const dataset = buildSeedDataset();
    const productTable = dataset.tables.find(
      (table) => table.name === "app.products",
    );
    const productImageTable = dataset.tables.find(
      (table) => table.name === "app.product_images",
    );
    const popmartProducts = new Map(
      productTable?.rows
        .filter((row) => row.profile_id === stableUuid("profile:popmart"))
        .map((row) => [String(row.id), row]) ?? [],
    );

    const popmartImages =
      productImageTable?.rows.filter((row) =>
        popmartProducts.has(String(row.product_id)),
      ) ?? [];

    expect(popmartImages).toHaveLength(25);
    for (const image of popmartImages) {
      const product = popmartProducts.get(String(image.product_id));
      expect(image.alt_text).toContain(String(product?.name));
      expect(image.alt_text).toContain("pastel display");
      expect(String(image.alt_text)).not.toMatch(/\bview\s+\d+\b/i);
    }
  });

  it("uses generated POP MART PNGs in seeded order item image snapshots", () => {
    const dataset = buildSeedDataset();
    const orderItems = dataset.tables.find(
      (table) => table.name === "app.order_items",
    );

    const popmartImageSnapshots =
      orderItems?.rows
        .filter((row) =>
          String(row.product_url_snapshot).startsWith("/popmart/products/"),
        )
        .map((row) => row.product_image_url_snapshot) ?? [];

    expect(popmartImageSnapshots.length).toBeGreaterThan(0);
    for (const imagePath of popmartImageSnapshots) {
      expect(imagePath).toMatch(
        /^\/assets\/popmart\/products\/[a-z0-9-]+-1\.png$/,
      );
      expect(
        existsSync(new URL(`../../web/public${imagePath}`, import.meta.url)),
        String(imagePath),
      ).toBe(true);
    }
  });

  it("uses one existing public-safe placeholder image for generic products", () => {
    const dataset = buildSeedDataset();
    const productTable = dataset.tables.find(
      (table) => table.name === "app.products",
    );
    const productImageTable = dataset.tables.find(
      (table) => table.name === "app.product_images",
    );
    const genericProducts = new Map(
      productTable?.rows
        .filter((row) => row.profile_id === stableUuid("profile:generic"))
        .map((row) => [String(row.id), row]) ?? [],
    );

    const genericImages =
      productImageTable?.rows.filter((row) =>
        genericProducts.has(String(row.product_id)),
      ) ?? [];

    expect(genericImages).toHaveLength(25);
    for (const image of genericImages) {
      const product = genericProducts.get(String(image.product_id));
      expect(image.sort_order).toBe(1);
      expect(image.image_path).toBe("/assets/generic/products/placeholder.svg");
      expect(image.alt_text).toContain(String(product?.name));
      expect(String(image.alt_text)).not.toMatch(/\bview\s+\d+\b/i);
      expect(String(image.alt_text)).not.toMatch(
        /pop mart|labubu|molly|dimoo|skullpanda|hirono|crybaby|pucky|sweet bean|zsiga|azura|the monsters/i,
      );
      expect(
        existsSync(
          new URL(`../../web/public${image.image_path}`, import.meta.url),
        ),
        String(image.image_path),
      ).toBe(true);
    }
  });

  it("uses the public-safe generic placeholder in generic order item image snapshots", () => {
    const dataset = buildSeedDataset();
    const orderItems = dataset.tables.find(
      (table) => table.name === "app.order_items",
    );

    const genericImageSnapshots =
      orderItems?.rows
        .filter((row) =>
          String(row.product_url_snapshot).startsWith("/generic/products/"),
        )
        .map((row) => row.product_image_url_snapshot) ?? [];

    expect(genericImageSnapshots.length).toBeGreaterThan(0);
    for (const imagePath of genericImageSnapshots) {
      expect(imagePath).toBe("/assets/generic/products/placeholder.svg");
      expect(
        existsSync(new URL(`../../web/public${imagePath}`, import.meta.url)),
        String(imagePath),
      ).toBe(true);
    }
  });

  it("uses existing public-safe generic assets for generic homepage and category imagery", () => {
    const dataset = buildSeedDataset();
    const categories = dataset.tables.find(
      (table) => table.name === "app.categories",
    );
    const homepageSections = dataset.tables.find(
      (table) => table.name === "app.homepage_sections",
    );
    const genericCategoryImagePaths =
      categories?.rows
        .filter((row) => row.profile_id === stableUuid("profile:generic"))
        .map((row) => row.image_path) ?? [];
    const genericHomepageImagePaths =
      homepageSections?.rows
        .filter((row) => row.profile_id === stableUuid("profile:generic"))
        .flatMap((row) => {
          const content = row.content_json as Record<string, unknown>;
          return typeof content.image_path === "string"
            ? [content.image_path]
            : [];
        }) ?? [];

    expect(genericCategoryImagePaths.length).toBeGreaterThan(0);
    expect(genericHomepageImagePaths.length).toBeGreaterThan(0);
    for (const imagePath of [
      ...genericCategoryImagePaths,
      ...genericHomepageImagePaths,
    ]) {
      expect(imagePath).toMatch(/^\/assets\/generic\//);
      expect(String(imagePath)).not.toMatch(
        /popmart|pop-mart|labubu|molly|dimoo|skullpanda|hirono|crybaby|pucky|sweet-bean|zsiga|azura|the-monsters/i,
      );
      expect(
        existsSync(new URL(`../../web/public${imagePath}`, import.meta.url)),
        String(imagePath),
      ).toBe(true);
    }
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

  it("reconciles mutable seeded cart rows before cart item upserts", () => {
    const sql = buildSeedSql(buildSeedDataset());
    const reconciliationIndex = sql.indexOf("delete from app.cart_items");
    const cartItemUpsertIndex = sql.indexOf("insert into app.cart_items");

    expect(reconciliationIndex).toBeGreaterThan(0);
    expect(reconciliationIndex).toBeLessThan(cartItemUpsertIndex);
    expect(sql).toContain("where cart_id in");
  });

  it("reconciles mutable seeded lifecycle rows before lifecycle event upserts", () => {
    const sql = buildSeedSql(buildSeedDataset());
    const reconciliationIndex = sql.indexOf(
      "delete from app.order_lifecycle_events",
    );
    const lifecycleEventUpsertIndex = sql.indexOf(
      "insert into app.order_lifecycle_events",
    );

    expect(reconciliationIndex).toBeGreaterThan(0);
    expect(reconciliationIndex).toBeLessThan(lifecycleEventUpsertIndex);
    expect(sql).toContain("where order_id in");
    expect(sql).toContain(stableUuid("order:alice-paid-delivery-evidence"));
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

import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { createAdminSessionToken } from "../src/middleware/admin.js";
import type {
  AdminCentralInventoryRow,
  AdminInventoryProductRow,
  AdminInventoryRepository,
  AdminInventoryStoreRow,
  AdminOrderDetail,
  AdminOrderLifecycleEventRow,
  AdminOrderRepository,
  AdminOrderRow,
  AdminPaymentDebugRepository,
  AdminPickupDateRow,
  AdminRuntimeDebugLogRepository,
  AdminStoreInventoryRow,
  AdminWebhookRepository,
} from "../src/repositories/adminRepository.js";
import type { CatalogJson, CatalogRepository } from "../src/routes/catalog.js";
import type { StorefrontContext } from "../src/routes/catalog.js";
import { requestApp } from "./helpers/requestApp.js";

describe("admin profile and market routes", () => {
  it("creates a short-lived admin session with a signed token", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const loginResponse = await requestApp(app, "POST", "/api/admin/login", {
      json: {
        passcode: "local-admin-passcode",
      },
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.json).toEqual({
      ok: true,
      data: {
        status: "authenticated",
        token: expect.stringMatching(/^adm_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
        expires_in_seconds: 7200,
        session: {
          session_id: expect.stringMatching(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
          ),
          expires_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T.+Z/),
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });

    const stateResponse = await requestApp(app, "GET", "/api/admin/state", {
      headers: {
        "x-admin-session": loginResponse.json.data.token,
      },
    });

    expect(stateResponse.status).toBe(200);
    expect(stateResponse.json).toEqual({
      ok: true,
      data: {
        authenticated: true,
        session: {
          session_id: loginResponse.json.data.session.session_id,
          expires_at: loginResponse.json.data.session.expires_at,
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns an explicit state of unauthenticated for missing or invalid session", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const stateResponse = await requestApp(app, "GET", "/api/admin/state");

    expect(stateResponse.status).toBe(200);
    expect(stateResponse.json).toEqual({
      ok: true,
      data: {
        authenticated: false,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });

    const invalidStateResponse = await requestApp(
      app,
      "GET",
      "/api/admin/state",
      {
        headers: {
          "x-admin-session": "adm_invalid",
        },
      },
    );

    expect(invalidStateResponse.status).toBe(200);
    expect(invalidStateResponse.json).toEqual({
      ok: true,
      data: {
        authenticated: false,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("rejects bad admin login requests", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const missingPasscodeResponse = await requestApp(
      app,
      "POST",
      "/api/admin/login",
      {
        json: {},
      },
    );

    expect(missingPasscodeResponse.status).toBe(400);
    expect(missingPasscodeResponse.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_LOGIN_REQUEST",
        message: "passcode is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });

    const deniedResponse = await requestApp(app, "POST", "/api/admin/login", {
      json: {
        passcode: "wrong-passcode",
      },
    });

    expect(deniedResponse.status).toBe(403);
    expect(deniedResponse.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_LOGIN_DENIED",
        message: "The provided admin passcode is not valid.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("switches the active storefront context and returns refreshed config", async () => {
    const activeStorefrontContextStore = createActiveStorefrontContextStore({
      profileSlug: "popmart",
      marketCode: "US",
    });
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore,
      },
    });

    const switchResponse = await requestApp(
      app,
      "PATCH",
      "/api/admin/profile-market",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          profile_id: "profile_generic",
          market_id: "market_gb",
        },
      },
    );
    const configResponse = await requestApp(app, "GET", "/api/config");
    const queryOverrideResponse = await requestApp(
      app,
      "GET",
      "/api/config?profile=popmart&market=US",
    );

    expect(switchResponse.status).toBe(200);
    expect(switchResponse.json).toEqual({
      ok: true,
      data: configFor({ profileSlug: "generic", marketCode: "GB" }),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(configResponse.status).toBe(200);
    expect(configResponse.json).toEqual({
      ok: true,
      data: configFor({ profileSlug: "generic", marketCode: "GB" }),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(queryOverrideResponse.status).toBe(200);
    expect(queryOverrideResponse.json).toEqual({
      ok: true,
      data: configFor({ profileSlug: "popmart", marketCode: "US" }),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("requires a valid admin session before switching profile and market", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(
      app,
      "PATCH",
      "/api/admin/profile-market",
      {
        json: {
          profile_id: "profile_generic",
          market_id: "market_gb",
        },
      },
    );

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns a buyer-safe error for missing profile or market IDs", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(
      app,
      "PATCH",
      "/api/admin/profile-market",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          profile_id: "profile_missing",
          market_id: "market_gb",
        },
      },
    );

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_PROFILE_MARKET_NOT_FOUND",
        message: "The requested admin profile or market was not found.",
        details: {
          profile_id: "profile_missing",
          market_id: "market_gb",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

describe("admin order lifecycle routes", () => {
  it("requires a valid admin session before listing orders", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        orderRepository: createAdminOrderRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/orders");

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists and loads order detail with Admin-safe lifecycle actions", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        orderRepository: createAdminOrderRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const listResponse = await requestApp(app, "GET", "/api/admin/orders", {
      headers: {
        "x-admin-session": createAdminToken(),
      },
    });
    const detailResponse = await requestApp(
      app,
      "GET",
      "/api/admin/orders/order_1",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
      },
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.json.data.orders).toEqual([
      expect.objectContaining({
        id: "order_1",
        order_number: "DO-20260624-000001",
        fulfillment_mode: "delivery",
        status: "paid",
        payment_status: "captured",
        next_statuses: ["processing"],
      }),
    ]);
    expect(detailResponse.status).toBe(200);
    expect(detailResponse.json.data.order).toEqual(
      expect.objectContaining({
        id: "order_1",
        order_number: "DO-20260624-000001",
        status: "paid",
        totals: {
          subtotal_minor: 1969,
          discount_minor: 0,
          tax_minor: 165,
          shipping_minor: 499,
          total_minor: 2633,
        },
        items: [
          expect.objectContaining({
            product_name: "Molly Imaginary Travel Blind Box",
            quantity: 1,
          }),
        ],
        timeline: [
          expect.objectContaining({
            from_status: "pending",
            to_status: "paid",
            actor_type: "system",
          }),
        ],
        payment_sessions: [
          expect.objectContaining({
            id: "payment_session_1",
            paypal_order_id: "PAYPAL_ORDER_1",
            amount_consistency_status: "matched",
          }),
        ],
        total_snapshots: [
          expect.objectContaining({
            calculation_stage: "capture",
            total_minor: 2633,
          }),
        ],
        paypal_snapshots: [
          expect.objectContaining({
            paypal_invoice_id: "DO-20260624-000001-01",
          }),
        ],
        promo_evaluation_lines: [
          expect.objectContaining({
            code_snapshot: "POP15",
            evaluation_status: "selected",
          }),
        ],
        inventory_effects: [
          expect.objectContaining({
            product_sku: "MOLLY-BB-001",
            requested_quantity: 1,
            fulfillable_quantity: 1,
          }),
        ],
        linked_webhooks: [
          expect.objectContaining({
            event_id: "WH-ORDER-1",
            processing_status: "processed",
          }),
        ],
      }),
    );
  });

  it("advances delivery lifecycle and writes an admin timeline event", async () => {
    const orderRepository = createAdminOrderRepository();
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        orderRepository,
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(
      app,
      "POST",
      "/api/admin/orders/order_1/lifecycle",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          next_status: "processing",
          note: "Packed at warehouse station A.",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json.data.order).toEqual(
      expect.objectContaining({
        id: "order_1",
        status: "processing",
        next_statuses: ["shipped"],
      }),
    );
    expect(response.json.data.order.timeline).toEqual([
      expect.objectContaining({
        from_status: "pending",
        to_status: "paid",
      }),
      expect.objectContaining({
        from_status: "paid",
        to_status: "processing",
        actor_type: "admin",
        note: "Packed at warehouse station A.",
      }),
    ]);
    expect(orderRepository.lifecycleEvents).toEqual([
      expect.objectContaining({
        order_id: "order_1",
        from_status: "paid",
        to_status: "processing",
        actor_type: "admin",
        note: "Packed at warehouse station A.",
      }),
    ]);
  });

  it("rejects invalid manual lifecycle transitions", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        orderRepository: createAdminOrderRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(
      app,
      "POST",
      "/api/admin/orders/order_1/lifecycle",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          next_status: "delivered",
        },
      },
    );

    expect(response.status).toBe(409);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_ORDER_LIFECYCLE_INVALID",
        message: "The requested lifecycle transition is not allowed.",
        details: {
          fulfillment_mode: "delivery",
          current_status: "paid",
          next_status: "delivered",
          allowed_next_statuses: ["processing"],
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

describe("admin inventory and pickup date routes", () => {
  it("requires a valid admin session before listing inventory", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        inventoryRepository: createAdminInventoryRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/inventory");

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists and updates central and store inventory rows", async () => {
    const inventoryRepository = createAdminInventoryRepository();
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        inventoryRepository,
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const listResponse = await requestApp(app, "GET", "/api/admin/inventory", {
      headers: {
        "x-admin-session": createAdminToken(),
      },
    });
    const centralPatchResponse = await requestApp(
      app,
      "PATCH",
      "/api/admin/inventory/central:profile_popmart:market_us:product_molly",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          available_quantity: 9,
        },
      },
    );
    const storePatchResponse = await requestApp(
      app,
      "PATCH",
      "/api/admin/inventory/store:store_inventory_1",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          available_quantity: 4,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.json.data.inventory).toEqual([
      expect.objectContaining({
        id: "central:profile_popmart:market_us:product_molly",
        inventory_type: "central",
        product_sku: "MOLLY-BB-001",
        product_name: "Molly Imaginary Travel Blind Box",
        available_quantity: 12,
      }),
      expect.objectContaining({
        id: "store:store_inventory_1",
        inventory_type: "store",
        store_name: "San Jose POP MART",
        available_quantity: 3,
      }),
    ]);
    expect(centralPatchResponse.status).toBe(200);
    expect(centralPatchResponse.json.data.inventory).toEqual(
      expect.objectContaining({
        id: "central:profile_popmart:market_us:product_molly",
        available_quantity: 9,
      }),
    );
    expect(storePatchResponse.status).toBe(200);
    expect(storePatchResponse.json.data.inventory).toEqual(
      expect.objectContaining({
        id: "store:store_inventory_1",
        available_quantity: 4,
      }),
    );
    expect(inventoryRepository.centralInventory[0].available_quantity).toBe(9);
    expect(inventoryRepository.storeInventory[0].available_quantity).toBe(4);
  });

  it("rejects invalid inventory update requests", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        inventoryRepository: createAdminInventoryRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(
      app,
      "PATCH",
      "/api/admin/inventory/store:store_inventory_1",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          available_quantity: -1,
        },
      },
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_ADMIN_INVENTORY_REQUEST",
        message:
          "inventory id and non-negative available_quantity are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists and updates pickup date capacity and availability", async () => {
    const inventoryRepository = createAdminInventoryRepository();
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        inventoryRepository,
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const listResponse = await requestApp(
      app,
      "GET",
      "/api/admin/pickup-dates",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
      },
    );
    const patchResponse = await requestApp(
      app,
      "PATCH",
      "/api/admin/pickup-dates/pickup_date_1",
      {
        headers: {
          "x-admin-session": createAdminToken(),
        },
        json: {
          capacity: 18,
          is_available: false,
        },
      },
    );

    expect(listResponse.status).toBe(200);
    expect(listResponse.json.data.pickup_dates).toEqual([
      expect.objectContaining({
        id: "pickup_date_1",
        store_name: "San Jose POP MART",
        pickup_date: "2026-06-28",
        capacity: 10,
        is_available: true,
      }),
    ]);
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.json.data.pickup_date).toEqual(
      expect.objectContaining({
        id: "pickup_date_1",
        capacity: 18,
        is_available: false,
      }),
    );
    expect(inventoryRepository.pickupDates[0].capacity).toBe(18);
    expect(inventoryRepository.pickupDates[0].is_available).toBe(false);
  });
});

describe("admin webhook routes", () => {
  it("requires a signed admin session before listing webhook events", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        webhookRepository: createAdminWebhookRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/webhooks");

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists recent webhook events for admin debugging", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        webhookRepository: createAdminWebhookRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/webhooks", {
      headers: {
        "x-admin-session": createAdminToken(),
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        webhooks: [
          {
            id: "webhook_invalid_1",
            event_id: "WH-INVALID-1",
            event_type: "BILLING.SUBSCRIPTION.CREATED",
            verification_status: "invalid",
            linked_order_id: null,
            linked_payment_session_id: null,
            processing_status: "ignored",
            received_at: "2026-06-24T10:25:00.000Z",
            processed_at: null,
          },
          {
            id: "webhook_valid_1",
            event_id: "WH-ORDER-1",
            event_type: "CHECKOUT.ORDER.APPROVED",
            verification_status: "valid",
            linked_order_id: "order_1",
            linked_payment_session_id: "payment_session_1",
            processing_status: "processed",
            received_at: "2026-06-24T10:18:00.000Z",
            processed_at: "2026-06-24T10:18:05.000Z",
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

describe("admin payment/order debug routes", () => {
  it("requires a signed admin session before listing payment debug sessions", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        debugRepository: createAdminPaymentDebugRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/payment-debug");

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists payment sessions with order, amount, snapshot, and webhook context", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        debugRepository: createAdminPaymentDebugRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/payment-debug", {
      headers: {
        "x-admin-session": createAdminToken(),
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        payment_sessions: [
          expect.objectContaining({
            id: "payment_session_1",
            order: expect.objectContaining({
              id: "order_1",
              order_number: "DO-20260624-000001",
              status: "paid",
              payment_status: "captured",
              total_minor: 2633,
            }),
            method: "paypal",
            status: "captured",
            paypal_order_id: "PAYPAL_ORDER_1",
            paypal_capture_id: "PAYPAL_CAPTURE_1",
            merchant_total_minor: 2633,
            provider_total_minor: 2633,
            amount_consistency_status: "matched",
            total_snapshots: [
              expect.objectContaining({
                calculation_stage: "capture",
                total_minor: 2633,
              }),
            ],
            paypal_snapshots: [
              expect.objectContaining({
                paypal_invoice_id: "DO-20260624-000001-01",
                paypal_request_id: "request_1",
                response_json: {
                  status: "COMPLETED",
                },
              }),
            ],
            linked_webhooks: [
              expect.objectContaining({
                event_id: "WH-ORDER-1",
                processing_status: "processed",
              }),
            ],
          }),
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

describe("admin runtime debug log routes", () => {
  it("requires a signed admin session before listing runtime debug logs", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        runtimeDebugLogRepository: createAdminRuntimeDebugLogRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/debug-logs");

    expect(response.status).toBe(401);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "ADMIN_SESSION_REQUIRED",
        message: "A valid admin session is required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("lists sanitized runtime debug logs without exposing secret values", async () => {
    const app = createApp({
      catalogRepository: createCatalogRepository(),
      admin: {
        adminPasscode: "local-admin-passcode",
        profileMarketRepository: createProfileMarketRepository(),
        runtimeDebugLogRepository: createAdminRuntimeDebugLogRepository(),
        activeStorefrontContextStore: createActiveStorefrontContextStore({
          profileSlug: "popmart",
          marketCode: "US",
        }),
      },
    });

    const response = await requestApp(app, "GET", "/api/admin/debug-logs", {
      headers: {
        "x-admin-session": createAdminToken(),
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        debug_logs: [
          {
            timestamp: "2026-06-24T10:30:00.000Z",
            level: "error",
            message: "PayPal create order failed",
            debug_id: "dbg_runtime_1",
            source: "paypal",
            request_path: "/api/paypal/orders/delivery",
            context: {
              debug_id: "dbg_runtime_1",
              source: "paypal",
              path: "/api/paypal/orders/delivery",
              payment_session_id: "payment_session_1",
              access_token: "[redacted]",
              nested: {
                client_secret: "[redacted]",
              },
            },
          },
        ],
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(JSON.stringify(response.json)).not.toContain("secret-access-token");
    expect(JSON.stringify(response.json)).not.toContain("paypal-client-secret");
  });
});

function createAdminToken(): string {
  return createAdminSessionToken({
    adminPasscode: "local-admin-passcode",
    sessionId: "session_123",
    expiresAt: "2099-05-31T10:00:00.000Z",
  });
}

function createCatalogRepository(): CatalogRepository {
  return {
    async getConfig(context) {
      return configFor(context);
    },
    async getHome() {
      return {};
    },
    async getCategories() {
      return {};
    },
    async getProducts() {
      return {};
    },
    async getProductBySlug() {
      return null;
    },
    async getReleaseEvents() {
      return {};
    },
  };
}

function createProfileMarketRepository() {
  return {
    async getProfileById(id: string) {
      return (
        [
          {
            id: "profile_popmart",
            slug: "popmart",
            display_name: "POP MART Demo",
            brand_mode: "popmart",
          },
          {
            id: "profile_generic",
            slug: "generic",
            display_name: "MochiToy Studio",
            brand_mode: "generic",
          },
        ].find((profile) => profile.id === id) ?? null
      );
    },
    async getMarketById(id: string) {
      return (
        [
          {
            id: "market_us",
            code: "US",
          },
          {
            id: "market_gb",
            code: "GB",
          },
        ].find((market) => market.id === id) ?? null
      );
    },
  };
}

function createAdminOrderRepository(
  orderPatch: Partial<AdminOrderRow> = {},
): AdminOrderRepository & {
  readonly lifecycleEvents: readonly AdminOrderLifecycleEventRow[];
} {
  let order: AdminOrderRow = {
    id: "order_1",
    profile_id: "profile_popmart",
    market_id: "market_us",
    order_number: "DO-20260624-000001",
    fulfillment_mode: "delivery",
    status: "paid",
    payment_status: "captured",
    currency_code: "USD",
    subtotal_minor: 1969,
    discount_minor: 0,
    tax_minor: 165,
    shipping_minor: 499,
    total_minor: 2633,
    created_at: "2026-06-24T10:15:00.000Z",
    updated_at: "2026-06-24T10:20:00.000Z",
    ...orderPatch,
  };
  const lifecycleEvents: AdminOrderLifecycleEventRow[] = [];
  const baseTimeline: AdminOrderLifecycleEventRow[] = [
    {
      id: "lifecycle_paid",
      order_id: "order_1",
      from_status: "pending",
      to_status: "paid",
      actor_type: "system",
      note: "Payment captured.",
      created_at: "2026-06-24T10:20:00.000Z",
    },
  ];

  return {
    lifecycleEvents,
    async listOrders() {
      return [order];
    },
    async getOrder(orderId) {
      if (orderId !== order.id) {
        return null;
      }

      return {
        order,
        items: [
          {
            id: "order_item_1",
            order_id: order.id,
            product_sku_snapshot: "MOLLY-BB-001",
            product_name_snapshot: "Molly Imaginary Travel Blind Box",
            product_url_snapshot: "/products/blind-boxes-2",
            product_image_url_snapshot:
              "/assets/popmart/products/blind-boxes-2-1.png",
            unit_price_minor: 1969,
            quantity: 1,
            fulfillable_quantity: 1,
            unavailable_quantity: 0,
            line_subtotal_minor: 1969,
            line_discount_minor: 0,
            line_tax_minor: 165,
            line_total_minor: 2134,
          },
        ],
        addresses: [
          {
            id: "order_address_1",
            order_id: order.id,
            address_type: "shipping",
            recipient_name: "Sandbox Buyer",
            phone: null,
            address_line1: "221 Demo Street",
            address_line2: null,
            city: "San Jose",
            state: "CA",
            postal_code: "95131",
            country_code: "US",
          },
        ],
        timeline: [...baseTimeline, ...lifecycleEvents],
        paymentSessions: [
          {
            id: "payment_session_1",
            order_id: order.id,
            provider: "paypal",
            method: "paypal",
            status: "captured",
            attempt_number: 1,
            paypal_order_id: "PAYPAL_ORDER_1",
            paypal_capture_id: "PAYPAL_CAPTURE_1",
            paypal_invoice_id: "DO-20260624-000001-01",
            paypal_request_id: "request_1",
            vault_requested: false,
            merchant_total_minor: 2633,
            provider_total_minor: 2633,
            amount_consistency_status: "matched",
            currency_code: "USD",
            created_at: "2026-06-24T10:16:00.000Z",
            updated_at: "2026-06-24T10:20:00.000Z",
          },
        ],
        totalSnapshots: [
          {
            id: "total_snapshot_1",
            order_id: order.id,
            payment_session_id: "payment_session_1",
            fulfillment_mode: "delivery",
            calculation_stage: "capture",
            currency_code: "USD",
            merchandise_subtotal_minor: 1969,
            product_discount_minor: 0,
            promo_discount_minor: 0,
            taxable_subtotal_minor: 1969,
            tax_minor: 165,
            shipping_minor: 499,
            total_minor: 2633,
            promo_evaluation_id: "promo_evaluation_1",
            created_at: "2026-06-24T10:20:00.000Z",
          },
        ],
        paypalSnapshots: [
          {
            id: "paypal_snapshot_1",
            payment_session_id: "payment_session_1",
            paypal_invoice_id: "DO-20260624-000001-01",
            paypal_request_id: "request_1",
            request_json: { intent: "CAPTURE" },
            response_json: { status: "COMPLETED" },
            merchant_snapshot_json: { total_minor: 2633 },
            created_at: "2026-06-24T10:20:00.000Z",
          },
        ],
        promoEvaluations: [
          {
            id: "promo_evaluation_1",
            order_id: order.id,
            merchandise_discount_minor: 0,
            taxable_subtotal_minor: 1969,
            final_total_minor: 2633,
            created_at: "2026-06-24T10:19:00.000Z",
          },
        ],
        promoEvaluationLines: [
          {
            id: "promo_line_1",
            promo_evaluation_id: "promo_evaluation_1",
            code_snapshot: "POP15",
            evaluation_status: "selected",
            rejection_reason: null,
            stack_group: "cart",
            discount_minor: 0,
            taxable_subtotal_effect_minor: 1969,
            final_total_effect_minor: 2633,
            explanation: "Selected for Admin demo visibility.",
            sort_order: 1,
            created_at: "2026-06-24T10:19:00.000Z",
          },
        ],
        linkedWebhooks: [
          {
            id: "webhook_1",
            event_id: "WH-ORDER-1",
            event_type: "CHECKOUT.ORDER.APPROVED",
            verification_status: "valid",
            linked_order_id: order.id,
            linked_payment_session_id: "payment_session_1",
            processing_status: "processed",
            received_at: "2026-06-24T10:18:00.000Z",
            processed_at: "2026-06-24T10:18:05.000Z",
          },
        ],
      } satisfies AdminOrderDetail;
    },
    async updateOrderStatus(input) {
      if (input.orderId !== order.id) {
        return null;
      }

      order = {
        ...order,
        status: input.status,
        updated_at: input.updatedAt,
      };
      return order;
    },
    async createLifecycleEvent(input) {
      const event: AdminOrderLifecycleEventRow = {
        id: `lifecycle_${lifecycleEvents.length + 1}`,
        order_id: input.orderId,
        from_status: input.fromStatus,
        to_status: input.toStatus,
        actor_type: input.actorType,
        note: input.note,
        created_at: input.createdAt,
      };

      lifecycleEvents.push(event);
      return event;
    },
  };
}

function createAdminInventoryRepository(): AdminInventoryRepository & {
  readonly centralInventory: AdminCentralInventoryRow[];
  readonly storeInventory: AdminStoreInventoryRow[];
  readonly pickupDates: AdminPickupDateRow[];
} {
  const centralInventory: AdminCentralInventoryRow[] = [
    {
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_molly",
      available_quantity: 12,
      updated_at: "2026-06-24T10:00:00.000Z",
    },
  ];
  const storeInventory: AdminStoreInventoryRow[] = [
    {
      id: "store_inventory_1",
      profile_id: "profile_popmart",
      market_id: "market_us",
      store_id: "store_san_jose",
      product_id: "product_molly",
      available_quantity: 3,
      updated_at: "2026-06-24T10:00:00.000Z",
    },
  ];
  const pickupDates: AdminPickupDateRow[] = [
    {
      id: "pickup_date_1",
      market_id: "market_us",
      store_id: "store_san_jose",
      pickup_date: "2026-06-28",
      capacity: 10,
      is_available: true,
      created_at: "2026-06-24T10:00:00.000Z",
      updated_at: "2026-06-24T10:00:00.000Z",
    },
  ];
  const products: AdminInventoryProductRow[] = [
    {
      id: "product_molly",
      sku: "MOLLY-BB-001",
      name: "Molly Imaginary Travel Blind Box",
      slug: "blind-boxes-2",
    },
  ];
  const stores: AdminInventoryStoreRow[] = [
    {
      id: "store_san_jose",
      market_id: "market_us",
      slug: "san-jose",
      name: "San Jose POP MART",
    },
  ];

  return {
    centralInventory,
    storeInventory,
    pickupDates,
    async listInventory() {
      return {
        centralInventory,
        storeInventory,
        products,
        stores,
      };
    },
    async updateCentralInventory(input) {
      const rowIndex = centralInventory.findIndex(
        (inventory) =>
          inventory.profile_id === input.profileId &&
          inventory.market_id === input.marketId &&
          inventory.product_id === input.productId,
      );

      if (rowIndex < 0) {
        return null;
      }

      const row = {
        ...centralInventory[rowIndex],
        available_quantity: input.availableQuantity,
        updated_at: input.updatedAt,
      };
      centralInventory[rowIndex] = row;
      return row;
    },
    async updateStoreInventory(input) {
      const rowIndex = storeInventory.findIndex(
        (inventory) => inventory.id === input.inventoryId,
      );

      if (rowIndex < 0) {
        return null;
      }

      const row = {
        ...storeInventory[rowIndex],
        available_quantity: input.availableQuantity,
        updated_at: input.updatedAt,
      };
      storeInventory[rowIndex] = row;
      return row;
    },
    async listPickupDates() {
      return {
        pickupDates,
        stores,
      };
    },
    async updatePickupDate(input) {
      const rowIndex = pickupDates.findIndex(
        (pickupDate) => pickupDate.id === input.pickupDateId,
      );

      if (rowIndex < 0) {
        return null;
      }

      const currentRow = pickupDates[rowIndex];
      const row = {
        ...currentRow,
        ...(typeof input.capacity === "number"
          ? { capacity: input.capacity }
          : {}),
        ...(typeof input.isAvailable === "boolean"
          ? { is_available: input.isAvailable }
          : {}),
        updated_at: input.updatedAt,
      };
      pickupDates[rowIndex] = row;
      return row;
    },
  };
}

function createAdminWebhookRepository(): AdminWebhookRepository {
  return {
    async listWebhooks() {
      return [
        {
          id: "webhook_invalid_1",
          event_id: "WH-INVALID-1",
          event_type: "BILLING.SUBSCRIPTION.CREATED",
          verification_status: "invalid",
          linked_order_id: null,
          linked_payment_session_id: null,
          processing_status: "ignored",
          received_at: "2026-06-24T10:25:00.000Z",
          processed_at: null,
        },
        {
          id: "webhook_valid_1",
          event_id: "WH-ORDER-1",
          event_type: "CHECKOUT.ORDER.APPROVED",
          verification_status: "valid",
          linked_order_id: "order_1",
          linked_payment_session_id: "payment_session_1",
          processing_status: "processed",
          received_at: "2026-06-24T10:18:00.000Z",
          processed_at: "2026-06-24T10:18:05.000Z",
        },
      ];
    },
  };
}

function createAdminPaymentDebugRepository(): AdminPaymentDebugRepository {
  const order = createAdminOrderRepository().listOrders();

  return {
    async listPaymentDebug() {
      const [orderRow] = await order;
      return [
        {
          session: {
            id: "payment_session_1",
            order_id: "order_1",
            provider: "paypal",
            method: "paypal",
            status: "captured",
            attempt_number: 1,
            paypal_order_id: "PAYPAL_ORDER_1",
            paypal_capture_id: "PAYPAL_CAPTURE_1",
            paypal_invoice_id: "DO-20260624-000001-01",
            paypal_request_id: "request_1",
            vault_requested: false,
            merchant_total_minor: 2633,
            provider_total_minor: 2633,
            amount_consistency_status: "matched",
            currency_code: "USD",
            created_at: "2026-06-24T10:16:00.000Z",
            updated_at: "2026-06-24T10:20:00.000Z",
          },
          order: orderRow ?? null,
          totalSnapshots: [
            {
              id: "total_snapshot_1",
              order_id: "order_1",
              payment_session_id: "payment_session_1",
              fulfillment_mode: "delivery",
              calculation_stage: "capture",
              currency_code: "USD",
              merchandise_subtotal_minor: 1969,
              product_discount_minor: 0,
              promo_discount_minor: 0,
              taxable_subtotal_minor: 1969,
              tax_minor: 165,
              shipping_minor: 499,
              total_minor: 2633,
              promo_evaluation_id: "promo_evaluation_1",
              created_at: "2026-06-24T10:20:00.000Z",
            },
          ],
          paypalSnapshots: [
            {
              id: "paypal_snapshot_1",
              payment_session_id: "payment_session_1",
              paypal_invoice_id: "DO-20260624-000001-01",
              paypal_request_id: "request_1",
              request_json: { intent: "CAPTURE" },
              response_json: { status: "COMPLETED" },
              merchant_snapshot_json: { total_minor: 2633 },
              created_at: "2026-06-24T10:20:00.000Z",
            },
          ],
          linkedWebhooks: [
            {
              id: "webhook_1",
              event_id: "WH-ORDER-1",
              event_type: "CHECKOUT.ORDER.APPROVED",
              verification_status: "valid",
              linked_order_id: "order_1",
              linked_payment_session_id: "payment_session_1",
              processing_status: "processed",
              received_at: "2026-06-24T10:18:00.000Z",
              processed_at: "2026-06-24T10:18:05.000Z",
            },
          ],
        },
      ];
    },
  };
}

function createAdminRuntimeDebugLogRepository(): AdminRuntimeDebugLogRepository {
  return {
    async listRuntimeDebugLogs() {
      return [
        {
          timestamp: "2026-06-24T10:30:00.000Z",
          level: "error",
          message: "PayPal create order failed",
          context: {
            debug_id: "dbg_runtime_1",
            source: "paypal",
            path: "/api/paypal/orders/delivery",
            payment_session_id: "payment_session_1",
            access_token: "secret-access-token",
            nested: {
              client_secret: "paypal-client-secret",
            },
          },
        },
      ];
    },
  };
}

function createActiveStorefrontContextStore(initial: StorefrontContext) {
  let context = initial;

  return {
    get() {
      return context;
    },
    set(nextContext: StorefrontContext) {
      context = nextContext;
    },
  };
}

function configFor(context: StorefrontContext): CatalogJson {
  return {
    profile: {
      id: `profile_${context.profileSlug}`,
      slug: context.profileSlug,
      display_name:
        context.profileSlug === "generic" ? "MochiToy Studio" : "POP MART Demo",
      brand_mode: context.profileSlug === "generic" ? "generic" : "popmart",
    },
    market: {
      id: `market_${context.marketCode.toLowerCase()}`,
      code: context.marketCode,
      currency_code: context.marketCode === "GB" ? "GBP" : "USD",
      locale: context.marketCode === "GB" ? "en-GB" : "en-US",
      language_code: "en",
      buyer_country: context.marketCode,
      paypal_page_type: "checkout",
      paylater_enabled: true,
      paylater_buyer_country: context.marketCode,
      sandbox_test_buyer_country: context.marketCode,
      market_version: 1,
    },
    features: {
      delivery: true,
      pickup: true,
      vaulting: true,
      apple_pay: true,
      google_pay: true,
      venmo: context.marketCode === "US",
    },
  };
}

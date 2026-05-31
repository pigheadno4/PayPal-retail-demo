import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { createAdminSessionToken } from "../src/middleware/admin.js";
import type { CatalogJson, CatalogRepository } from "../src/routes/catalog.js";
import type { StorefrontContext } from "../src/routes/catalog.js";
import { requestApp } from "./helpers/requestApp.js";

describe("admin profile and market routes", () => {
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

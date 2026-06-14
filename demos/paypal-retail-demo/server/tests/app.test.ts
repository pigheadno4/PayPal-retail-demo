import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import type {
  CatalogProductListFilters,
  CatalogRepository,
  StorefrontContext,
} from "../src/routes/catalog.js";
import { requestApp } from "./helpers/requestApp.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Express app shell", () => {
  it("allows configured app origins and local loopback aliases", async () => {
    const app = createApp({
      allowedCorsOrigins: ["http://localhost:5173"],
    });

    const response = await requestApp(app, "GET", "/api/health", {
      headers: {
        origin: "http://127.0.0.1:5173",
      },
    });

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://127.0.0.1:5173",
    );
    expect(response.headers.vary).toContain("Origin");
  });

  it("returns the standard API success shape from the health endpoint", async () => {
    const response = await requestApp(createApp(), "GET", "/api/health");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        service: "paypal-retail-demo",
        status: "ok",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns the standard API error shape for unknown routes", async () => {
    const response = await requestApp(createApp(), "GET", "/api/missing-route");

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested API route was not found.",
        details: {
          path: "/api/missing-route",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns the standard API error shape when a route dependency throws", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await requestApp(
      createApp({ catalogRepository: createThrowingCatalogRepository() }),
      "GET",
      "/api/config",
    );

    expect(response.status).toBe(500);
    expect(String(response.headers["content-type"])).toContain(
      "application/json",
    );
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "The API request could not be completed.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    consoleError.mockRestore();
  });
});

function createThrowingCatalogRepository(): CatalogRepository {
  const fail = async () => {
    throw new Error("database unavailable");
  };

  return {
    getCategories: fail,
    getConfig: fail,
    getHome: fail,
    getProductBySlug: async (
      _context: StorefrontContext,
      _slug: string,
    ) => {
      throw new Error("database unavailable");
    },
    getProducts: async (
      _context: StorefrontContext,
      _filters: CatalogProductListFilters,
    ) => {
      throw new Error("database unavailable");
    },
    getReleaseEvents: fail,
  };
}

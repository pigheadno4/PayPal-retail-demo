import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { createDebugLogger, type DebugLogEntry } from "../src/debug/logger.js";
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
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const entries: DebugLogEntry[] = [];
    const debugLogger = createDebugLogger({
      sink(entry) {
        entries.push(entry);
      },
    });

    const response = await requestApp(
      createApp({
        catalogRepository: createThrowingCatalogRepository(),
        debugLogger,
      }),
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
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "error",
          message: "api_request_failed",
          context: expect.objectContaining({
            debug_id: response.json?.debug_id,
            error_message: "database unavailable",
            error_name: "Error",
            method: "GET",
            path: "/api/config",
          }),
        }),
      ]),
    );
    expect(consoleError).toHaveBeenCalledWith(
      "[paypal-retail-demo] API request failed",
      expect.objectContaining({
        debugId: response.json?.debug_id,
        errorMessage: "database unavailable",
        errorName: "Error",
        method: "GET",
        path: "/api/config",
      }),
    );
    consoleError.mockRestore();
  });

  it("serves built storefront assets and SPA routes without replacing API responses", async () => {
    const staticAssetDirectory = await mkdtemp(
      join(tmpdir(), "paypal-retail-static-"),
    );

    try {
      await mkdir(join(staticAssetDirectory, "assets"));
      await mkdir(join(staticAssetDirectory, ".well-known"));
      await writeFile(
        join(staticAssetDirectory, "index.html"),
        '<div id="root"></div><script type="module" src="/assets/app.js"></script>',
      );
      await writeFile(
        join(staticAssetDirectory, "assets", "app.js"),
        'console.log("storefront");',
      );
      await writeFile(
        join(
          staticAssetDirectory,
          ".well-known",
          "apple-developer-merchantid-domain-association",
        ),
        "PAYPAL_APPLE_DOMAIN_ASSOCIATION",
      );

      const app = createApp({ staticAssetDirectory });
      const productRouteResponse = await requestApp(
        app,
        "GET",
        "/products/blind-boxes-2",
      );
      const assetResponse = await requestApp(app, "GET", "/assets/app.js");
      const apiResponse = await requestApp(app, "GET", "/api/missing-route");
      const appleDomainResponse = await requestApp(
        app,
        "GET",
        "/.well-known/apple-developer-merchantid-domain-association",
      );

      expect(productRouteResponse.status).toBe(200);
      expect(String(productRouteResponse.headers["content-type"])).toContain(
        "text/html",
      );
      expect(productRouteResponse.text).toContain('<div id="root"></div>');
      expect(productRouteResponse.json).toBeNull();

      expect(assetResponse.status).toBe(200);
      expect(String(assetResponse.headers["content-type"])).toContain(
        "text/javascript",
      );
      expect(assetResponse.text).toContain('console.log("storefront");');

      expect(appleDomainResponse.status).toBe(200);
      expect(appleDomainResponse.text).toBe("PAYPAL_APPLE_DOMAIN_ASSOCIATION");

      expect(apiResponse.status).toBe(404);
      expect(apiResponse.json).toEqual({
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
    } finally {
      await rm(staticAssetDirectory, { force: true, recursive: true });
    }
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
    getProductBySlug: async (_context: StorefrontContext, _slug: string) => {
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

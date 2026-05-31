import { Router, type Request, type RequestHandler } from "express";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";

export type StorefrontProfileSlug = "popmart" | "generic" | string;
export type StorefrontMarketCode = "US" | "GB" | string;
export type CatalogJson =
  | null
  | boolean
  | number
  | string
  | readonly CatalogJson[]
  | { readonly [key: string]: CatalogJson };

export interface StorefrontContext {
  readonly profileSlug: StorefrontProfileSlug;
  readonly marketCode: StorefrontMarketCode;
}

export interface CatalogProductListFilters {
  readonly categorySlug: string | null;
  readonly priceMinMinor: number | null;
  readonly priceMaxMinor: number | null;
  readonly availability: string | null;
  readonly releaseStatus: string | null;
  readonly pickupAvailable: boolean | null;
  readonly sort: string | null;
}

export interface CatalogReleaseEventFilters {
  readonly from: string | null;
  readonly to: string | null;
}

export interface CatalogRepository {
  readonly getConfig: (context: StorefrontContext) => Promise<CatalogJson>;
  readonly getHome: (context: StorefrontContext) => Promise<CatalogJson>;
  readonly getCategories: (context: StorefrontContext) => Promise<CatalogJson>;
  readonly getProducts: (
    context: StorefrontContext,
    filters: CatalogProductListFilters,
  ) => Promise<CatalogJson>;
  readonly getProductBySlug: (
    context: StorefrontContext,
    slug: string,
  ) => Promise<CatalogJson | null>;
  readonly getReleaseEvents: (
    context: StorefrontContext,
    filters: CatalogReleaseEventFilters,
  ) => Promise<CatalogJson>;
}

export function createCatalogRouter(input: {
  readonly catalogRepository: CatalogRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
}): Router {
  const router = Router();

  router.get(
    "/config",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.catalogRepository.getConfig(
          resolveStorefrontContext(request, input.activeStorefrontContextStore),
        ),
      );
    }),
  );

  router.get(
    "/catalog/home",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.catalogRepository.getHome(
          resolveStorefrontContext(request, input.activeStorefrontContextStore),
        ),
      );
    }),
  );

  router.get(
    "/catalog/categories",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.catalogRepository.getCategories(
          resolveStorefrontContext(request, input.activeStorefrontContextStore),
        ),
      );
    }),
  );

  router.get(
    "/catalog/products",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.catalogRepository.getProducts(
          resolveStorefrontContext(request, input.activeStorefrontContextStore),
          parseProductListFilters(request),
        ),
      );
    }),
  );

  router.get(
    "/catalog/products/:slug",
    asyncRoute(async (request, response) => {
      const slug = firstRouteParamValue(request, "slug") ?? "";
      const product = await input.catalogRepository.getProductBySlug(
        resolveStorefrontContext(request, input.activeStorefrontContextStore),
        slug,
      );

      if (!product) {
        sendApiError(response, 404, {
          code: "PRODUCT_NOT_FOUND",
          message: "Product was not found for the active storefront.",
          details: {
            slug,
          },
        });
        return;
      }

      sendApiSuccess(response, product);
    }),
  );

  router.get(
    "/catalog/release-events",
    asyncRoute(async (request, response) => {
      sendApiSuccess(
        response,
        await input.catalogRepository.getReleaseEvents(
          resolveStorefrontContext(request, input.activeStorefrontContextStore),
          {
            from: firstQueryValue(request, "from"),
            to: firstQueryValue(request, "to"),
          },
        ),
      );
    }),
  );

  return router;
}

function resolveStorefrontContext(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): StorefrontContext {
  const activeContext = activeStorefrontContextStore?.get() ?? {
    profileSlug: "popmart",
    marketCode: "US",
  };

  return {
    profileSlug:
      firstQueryValue(request, "profile") ?? activeContext.profileSlug,
    marketCode: (
      firstQueryValue(request, "market") ?? activeContext.marketCode
    ).toUpperCase(),
  };
}

function parseProductListFilters(request: Request): CatalogProductListFilters {
  return {
    categorySlug: firstQueryValue(request, "category"),
    priceMinMinor: parseOptionalMinor(firstQueryValue(request, "price_min")),
    priceMaxMinor: parseOptionalMinor(firstQueryValue(request, "price_max")),
    availability: firstQueryValue(request, "availability"),
    releaseStatus: firstQueryValue(request, "release_status"),
    pickupAvailable: parseOptionalBoolean(
      firstQueryValue(request, "pickup_available"),
    ),
    sort: firstQueryValue(request, "sort"),
  };
}

function firstQueryValue(request: Request, key: string): string | null {
  const value = request.query[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
}

function firstRouteParamValue(request: Request, key: string): string | null {
  const value = request.params[key];
  const firstValue = Array.isArray(value) ? value[0] : value;

  if (typeof firstValue !== "string") {
    return null;
  }

  const trimmedValue = firstValue.trim();
  return trimmedValue ? trimmedValue : null;
}

function parseOptionalMinor(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue >= 0 ? parsedValue : null;
}

function parseOptionalBoolean(value: string | null): boolean | null {
  if (value === null) {
    return null;
  }

  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

import { Router, type Request, type RequestHandler } from "express";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { AdminProfileMarketRepository } from "../repositories/adminRepository.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { CatalogRepository, StorefrontContext } from "./catalog.js";

export interface CreateAdminRouterInput {
  readonly adminSessionGuard: RequestHandler;
  readonly catalogRepository: CatalogRepository;
  readonly profileMarketRepository: AdminProfileMarketRepository;
  readonly activeStorefrontContextStore: ActiveStorefrontContextStore;
}

export function createAdminRouter(input: CreateAdminRouterInput): Router {
  const router = Router();

  router.patch(
    "/admin/profile-market",
    input.adminSessionGuard,
    asyncRoute(async (request, response) => {
      const body = parseProfileMarketBody(request);

      if (!body) {
        sendApiError(response, 400, {
          code: "INVALID_ADMIN_PROFILE_MARKET_REQUEST",
          message: "profile_id and market_id are required.",
        });
        return;
      }

      const [profile, market] = await Promise.all([
        input.profileMarketRepository.getProfileById(body.profileId),
        input.profileMarketRepository.getMarketById(body.marketId),
      ]);

      if (!profile || !market) {
        sendApiError(response, 404, {
          code: "ADMIN_PROFILE_MARKET_NOT_FOUND",
          message: "The requested admin profile or market was not found.",
          details: {
            profile_id: body.profileId,
            market_id: body.marketId,
          },
        });
        return;
      }

      const nextContext: StorefrontContext = {
        profileSlug: profile.slug,
        marketCode: market.code.toUpperCase(),
      };
      input.activeStorefrontContextStore.set(nextContext);

      sendApiSuccess(
        response,
        await input.catalogRepository.getConfig(nextContext),
      );
    }),
  );

  return router;
}

function parseProfileMarketBody(request: Request): {
  readonly profileId: string;
  readonly marketId: string;
} | null {
  const body = request.body as Record<string, unknown> | undefined;
  const profileId = normalizeBodyString(body?.profile_id);
  const marketId = normalizeBodyString(body?.market_id);

  return profileId && marketId ? { profileId, marketId } : null;
}

function normalizeBodyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

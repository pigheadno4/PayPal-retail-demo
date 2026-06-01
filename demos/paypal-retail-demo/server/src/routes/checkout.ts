import { Router, type Request, type RequestHandler } from "express";

import { sendApiError, sendApiSuccess } from "../http/responses.js";
import type { BuyerContext, BuyerRequest } from "../middleware/auth.js";
import type {
  GuestCartContext,
  GuestCartRequest,
} from "../middleware/guestCart.js";
import type { ActiveStorefrontContextStore } from "../state/storefrontContext.js";
import type { CatalogJson, StorefrontContext } from "./catalog.js";

export type CheckoutApiResponse = CatalogJson;
export type CheckoutFulfillmentMode = "delivery" | "pickup";

export interface CheckoutOperationContext {
  readonly storefrontContext: StorefrontContext;
  readonly buyer: BuyerContext;
  readonly guestCart: GuestCartContext | null;
}

export interface CheckoutAddressInput {
  readonly recipientName: string;
  readonly phone: string | null;
  readonly addressLine1: string;
  readonly addressLine2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postalCode: string;
  readonly countryCode: string;
}

export interface CheckoutPickupLocationInput {
  readonly countryCode: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postalCode: string;
}

export interface CreateCheckoutDraftInput {
  readonly fulfillmentMode: CheckoutFulfillmentMode;
}

export interface CheckoutDraftFulfillmentInput {
  readonly draftId: string;
  readonly fulfillmentMode: CheckoutFulfillmentMode;
}

export interface CheckoutShippingAddressInput {
  readonly draftId: string;
  readonly address: CheckoutAddressInput;
  readonly saveToAddressBook: boolean;
}

export interface CheckoutBillingAddressInput {
  readonly draftId: string;
  readonly sameAsShipping: boolean;
  readonly address: CheckoutAddressInput | null;
  readonly saveToAddressBook: boolean;
}

export interface CheckoutShippingOptionInput {
  readonly draftId: string;
  readonly shippingOptionId: string;
}

export interface CheckoutPickupLocationUpdateInput {
  readonly draftId: string;
  readonly location: CheckoutPickupLocationInput;
}

export interface CheckoutPickupStoreInput {
  readonly draftId: string;
  readonly storeId: string;
}

export interface CheckoutPickupDateInput {
  readonly draftId: string;
  readonly pickupDate: string;
}

export interface CheckoutPromoEvaluateInput {
  readonly draftId: string;
  readonly manualCodes: readonly string[];
}

export interface CheckoutPromoApplyInput {
  readonly draftId: string;
  readonly selectedCodes: readonly string[];
  readonly manualCodes: readonly string[];
}

export interface CheckoutPromoRemoveInput {
  readonly draftId: string;
  readonly code: string;
}

export interface CheckoutRepository {
  readonly createDraft: (
    context: CheckoutOperationContext,
    input: CreateCheckoutDraftInput,
  ) => Promise<CheckoutApiResponse>;
  readonly selectFulfillment: (
    context: CheckoutOperationContext,
    input: CheckoutDraftFulfillmentInput,
  ) => Promise<CheckoutApiResponse>;
  readonly updateShippingAddress: (
    context: CheckoutOperationContext,
    input: CheckoutShippingAddressInput,
  ) => Promise<CheckoutApiResponse>;
  readonly updateBillingAddress: (
    context: CheckoutOperationContext,
    input: CheckoutBillingAddressInput,
  ) => Promise<CheckoutApiResponse>;
  readonly selectShippingOption: (
    context: CheckoutOperationContext,
    input: CheckoutShippingOptionInput,
  ) => Promise<CheckoutApiResponse>;
  readonly updatePickupLocation: (
    context: CheckoutOperationContext,
    input: CheckoutPickupLocationUpdateInput,
  ) => Promise<CheckoutApiResponse>;
  readonly selectPickupStore: (
    context: CheckoutOperationContext,
    input: CheckoutPickupStoreInput,
  ) => Promise<CheckoutApiResponse>;
  readonly selectPickupDate: (
    context: CheckoutOperationContext,
    input: CheckoutPickupDateInput,
  ) => Promise<CheckoutApiResponse>;
  readonly evaluatePromos: (
    context: CheckoutOperationContext,
    input: CheckoutPromoEvaluateInput,
  ) => Promise<CheckoutApiResponse>;
  readonly applyPromos: (
    context: CheckoutOperationContext,
    input: CheckoutPromoApplyInput,
  ) => Promise<CheckoutApiResponse>;
  readonly removePromo: (
    context: CheckoutOperationContext,
    input: CheckoutPromoRemoveInput,
  ) => Promise<CheckoutApiResponse>;
}

export interface CreateCheckoutRouterInput {
  readonly checkoutRepository: CheckoutRepository;
  readonly activeStorefrontContextStore?: ActiveStorefrontContextStore;
}

export function createCheckoutRouter(input: CreateCheckoutRouterInput): Router {
  const router = Router();

  router.post(
    "/checkout/drafts",
    asyncRoute(async (request, response) => {
      const fulfillmentMode = parseFulfillmentMode(
        (request.body as { fulfillment_mode?: unknown }).fulfillment_mode,
        "delivery",
      );

      if (!fulfillmentMode) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_DRAFT_REQUEST",
          message: "A supported checkout fulfillment mode is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.createDraft(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { fulfillmentMode },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/fulfillment",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const fulfillmentMode = parseFulfillmentMode(
        (request.body as { fulfillment_mode?: unknown }).fulfillment_mode,
      );

      if (!draftId || !fulfillmentMode) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_DRAFT_REQUEST",
          message: "A supported checkout fulfillment mode is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.selectFulfillment(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, fulfillmentMode },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/shipping-address",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const address = parseAddressBody(request.body);

      if (!draftId || !address) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_ADDRESS_REQUEST",
          message: "A complete checkout address is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.updateShippingAddress(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          {
            draftId,
            address,
            saveToAddressBook: parseOptionalBoolean(
              (request.body as { save_to_address_book?: unknown })
                .save_to_address_book,
              true,
            ),
          },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/billing-address",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const body = request.body as Record<string, unknown> | undefined;
      const sameAsShipping = parseOptionalBoolean(
        body?.same_as_shipping,
        false,
      );
      const address =
        sameAsShipping === true ? null : parseAddressBody(body?.address);

      if (!draftId || (sameAsShipping === false && !address)) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_ADDRESS_REQUEST",
          message: "A complete checkout address is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.updateBillingAddress(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          {
            draftId,
            sameAsShipping,
            address,
            saveToAddressBook: parseOptionalBoolean(
              body?.save_to_address_book,
              true,
            ),
          },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/shipping-option",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const shippingOptionId = normalizeBodyString(
        (request.body as { shipping_option_id?: unknown }).shipping_option_id,
      );

      if (!draftId || !shippingOptionId) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_SHIPPING_OPTION_REQUEST",
          message: "A shipping option ID is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.selectShippingOption(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, shippingOptionId },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/pickup-location",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const location = parsePickupLocationBody(request.body);

      if (!draftId || !location) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PICKUP_LOCATION_REQUEST",
          message: "A pickup location is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.updatePickupLocation(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, location },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/pickup-store",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const storeId = normalizeBodyString(
        (request.body as { store_id?: unknown }).store_id,
      );

      if (!draftId || !storeId) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PICKUP_STORE_REQUEST",
          message: "A pickup store ID is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.selectPickupStore(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, storeId },
        ),
      );
    }),
  );

  router.patch(
    "/checkout/drafts/:id/pickup-date",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const pickupDate = parseDateOnly(
        (request.body as { pickup_date?: unknown }).pickup_date,
      );

      if (!draftId || !pickupDate) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PICKUP_DATE_REQUEST",
          message: "A pickup date in YYYY-MM-DD format is required.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.selectPickupDate(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, pickupDate },
        ),
      );
    }),
  );

  router.post(
    "/checkout/drafts/:id/promos/evaluate",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const manualCodes = parsePromoCodeArray(
        (request.body as { manual_codes?: unknown } | undefined)?.manual_codes,
        true,
      );

      if (!draftId || !manualCodes) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PROMO_REQUEST",
          message: "Promo codes must be non-empty strings.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.evaluatePromos(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, manualCodes },
        ),
      );
    }),
  );

  router.post(
    "/checkout/drafts/:id/promos/apply",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const body = request.body as
        | { selected_codes?: unknown; manual_codes?: unknown }
        | undefined;
      const selectedCodes = parsePromoCodeArray(body?.selected_codes, false);
      const manualCodes = parsePromoCodeArray(body?.manual_codes, true);

      if (!draftId || !selectedCodes || !manualCodes) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PROMO_REQUEST",
          message: "Promo codes must be non-empty strings.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.applyPromos(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, selectedCodes, manualCodes },
        ),
      );
    }),
  );

  router.delete(
    "/checkout/drafts/:id/promos/:code",
    asyncRoute(async (request, response) => {
      const draftId = firstRouteParamValue(request, "id");
      const code = normalizePromoCode(firstRouteParamValue(request, "code"));

      if (!draftId || !code) {
        sendApiError(response, 400, {
          code: "INVALID_CHECKOUT_PROMO_REQUEST",
          message: "Promo codes must be non-empty strings.",
        });
        return;
      }

      sendApiSuccess(
        response,
        await input.checkoutRepository.removePromo(
          resolveCheckoutOperationContext(
            request,
            input.activeStorefrontContextStore,
          ),
          { draftId, code },
        ),
      );
    }),
  );

  return router;
}

function resolveCheckoutOperationContext(
  request: Request,
  activeStorefrontContextStore: ActiveStorefrontContextStore | undefined,
): CheckoutOperationContext {
  return {
    storefrontContext: resolveStorefrontContext(
      request,
      activeStorefrontContextStore,
    ),
    buyer: (request as BuyerRequest).buyer ?? { kind: "guest" },
    guestCart: (request as GuestCartRequest).guestCart ?? null,
  };
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

function parseFulfillmentMode(
  value: unknown,
  defaultValue?: CheckoutFulfillmentMode,
): CheckoutFulfillmentMode | null {
  if (value === undefined || value === null) {
    return defaultValue ?? null;
  }
  return value === "delivery" || value === "pickup" ? value : null;
}

function parseAddressBody(value: unknown): CheckoutAddressInput | null {
  const body = value as Record<string, unknown> | undefined;
  const recipientName = normalizeBodyString(body?.recipient_name);
  const addressLine1 = normalizeBodyString(body?.address_line1);
  const city = normalizeBodyString(body?.city);
  const postalCode = normalizeBodyString(body?.postal_code);
  const countryCode = normalizeCountryCode(body?.country_code);

  if (!recipientName || !addressLine1 || !city || !postalCode || !countryCode) {
    return null;
  }

  return {
    recipientName,
    phone: normalizeBodyString(body?.phone),
    addressLine1,
    addressLine2: normalizeBodyString(body?.address_line2),
    city,
    state: normalizeBodyString(body?.state),
    county: normalizeBodyString(body?.county),
    postalCode,
    countryCode,
  };
}

function parsePickupLocationBody(
  value: unknown,
): CheckoutPickupLocationInput | null {
  const body = value as Record<string, unknown> | undefined;
  const countryCode = normalizeCountryCode(body?.country_code);
  const postalCode = normalizeBodyString(body?.postal_code);

  if (!countryCode || !postalCode) {
    return null;
  }

  return {
    countryCode,
    state: normalizeBodyString(body?.state),
    county: normalizeBodyString(body?.county),
    postalCode,
  };
}

function parseDateOnly(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue) ? trimmedValue : null;
}

function parseOptionalBoolean(value: unknown, defaultValue: boolean): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

function parsePromoCodeArray(
  value: unknown,
  allowMissing: boolean,
): readonly string[] | null {
  if (value === undefined || value === null) {
    return allowMissing ? [] : null;
  }
  if (!Array.isArray(value)) {
    return null;
  }

  const codes = value.map(normalizePromoCode);
  return codes.every((code): code is string => Boolean(code)) ? codes : null;
}

function normalizePromoCode(value: unknown): string | null {
  const code = normalizeBodyString(value)?.toUpperCase();
  return code && /^[A-Z0-9_-]+$/.test(code) ? code : null;
}

function normalizeCountryCode(value: unknown): string | null {
  const countryCode = normalizeBodyString(value)?.toUpperCase();
  return countryCode && /^[A-Z]{2}$/.test(countryCode) ? countryCode : null;
}

function normalizeBodyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
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

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

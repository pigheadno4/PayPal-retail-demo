import { createHash, randomUUID } from "node:crypto";

import {
  calculatePickupInventorySplit,
  type PickupInventorySplit,
} from "../../../shared/src/inventory.js";
import {
  selectDefaultShippingOption,
  selectEligibleShippingOptions,
  type Destination,
  type ShippingOptionRow,
} from "../../../shared/src/shipping.js";
import {
  calculateEstimatedTax,
  selectTaxRate,
  type TaxRateRow,
} from "../../../shared/src/tax.js";
import type {
  CheckoutAddressInput,
  CheckoutApiResponse,
  CheckoutFulfillmentMode,
  CheckoutOperationContext,
  CheckoutPickupLocationInput,
  CheckoutRepository,
} from "../routes/checkout.js";
import type { CatalogJson } from "../routes/catalog.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface CheckoutProfileRow {
  readonly id: string;
  readonly slug: string;
}

export interface CheckoutMarketRow {
  readonly id: string;
  readonly code: string;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
}

export interface CheckoutCartRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly auth_user_id: string | null;
  readonly cart_public_id: string;
  readonly cart_secret_hash: string | null;
  readonly status: "active" | "merged" | "abandoned" | "converted";
}

export interface CheckoutCartItemRow {
  readonly id: string;
  readonly cart_id: string;
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_price_minor_snapshot: number;
}

export interface CheckoutAddressJson {
  readonly [key: string]: CatalogJson;
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code: string;
  readonly country_code: string;
}

export interface CheckoutPickupLocationJson {
  readonly [key: string]: CatalogJson;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code: string;
}

export interface CheckoutDeliveryStateJson {
  readonly shipping_address?: CheckoutAddressJson | null;
  readonly billing_address?: CheckoutAddressJson | null;
  readonly same_as_shipping?: boolean;
  readonly selected_shipping_option_id?: string | null;
}

export interface CheckoutPickupStateJson {
  readonly location?: CheckoutPickupLocationJson | null;
  readonly billing_address?: CheckoutAddressJson | null;
  readonly selected_store_id?: string | null;
  readonly selected_pickup_date?: string | null;
}

export interface CheckoutDraftRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly cart_id: string;
  readonly auth_user_id: string | null;
  readonly guest_email: string | null;
  readonly fulfillment_mode: CheckoutFulfillmentMode;
  readonly delivery_state_json: CheckoutDeliveryStateJson;
  readonly pickup_state_json: CheckoutPickupStateJson;
  readonly selected_promo_evaluation_id: string | null;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
  readonly status: "draft" | "payment_started" | "converted" | "abandoned";
  readonly updated_at: string;
}

export interface CheckoutShippingOptionRow {
  readonly id: string;
  readonly market_id: string;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly service_code: string;
  readonly display_name: string;
  readonly amount_minor: number;
  readonly estimated_days_min: number;
  readonly estimated_days_max: number;
  readonly is_active: boolean;
}

export interface CheckoutTaxRateRow {
  readonly id: string;
  readonly market_id: string;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code_prefix: string | null;
  readonly rate_bps: number;
  readonly is_active: boolean;
}

export interface CheckoutStoreRow {
  readonly id: string;
  readonly market_id: string;
  readonly name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly is_active: boolean;
}

export interface CheckoutPickupDateRow {
  readonly id: string;
  readonly market_id: string;
  readonly store_id: string;
  readonly pickup_date: string;
  readonly capacity: number;
  readonly is_available: boolean;
}

export interface CheckoutStoreInventoryRow {
  readonly store_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
}

export interface CheckoutDataSource {
  readonly getProfileBySlug: (
    slug: string,
  ) => Promise<CheckoutProfileRow | null>;
  readonly getMarketByCode: (code: string) => Promise<CheckoutMarketRow | null>;
  readonly findActiveGuestCart: (
    cartPublicId: string,
  ) => Promise<CheckoutCartRow | null>;
  readonly findActiveSignedInCart: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly authUserId: string;
  }) => Promise<CheckoutCartRow | null>;
  readonly findDraftByCartId: (
    cartId: string,
  ) => Promise<CheckoutDraftRow | null>;
  readonly getDraftById: (id: string) => Promise<CheckoutDraftRow | null>;
  readonly createDraft: (draft: CheckoutDraftRow) => Promise<CheckoutDraftRow>;
  readonly updateDraft: (
    draftId: string,
    patch: Partial<CheckoutDraftRow>,
  ) => Promise<CheckoutDraftRow>;
  readonly listCartItems: (
    cartId: string,
  ) => Promise<readonly CheckoutCartItemRow[]>;
  readonly listShippingOptions: (
    marketId: string,
  ) => Promise<readonly CheckoutShippingOptionRow[]>;
  readonly listTaxRates: (
    marketId: string,
  ) => Promise<readonly CheckoutTaxRateRow[]>;
  readonly getStoreById: (storeId: string) => Promise<CheckoutStoreRow | null>;
  readonly listPickupDates: (
    storeId: string,
  ) => Promise<readonly CheckoutPickupDateRow[]>;
  readonly listStoreInventory: (
    storeId: string,
  ) => Promise<readonly CheckoutStoreInventoryRow[]>;
}

export interface CreateSupabaseCheckoutRepositoryInput {
  readonly dataSource: CheckoutDataSource;
  readonly now?: RepositoryNow;
  readonly createDraftId?: () => string;
  readonly hashCartClientSecret?: (secret: string) => string;
}

interface CheckoutRepositoryDependencies {
  readonly dataSource: CheckoutDataSource;
  readonly now?: RepositoryNow;
  readonly createDraftId: () => string;
  readonly hashCartClientSecret: (secret: string) => string;
}

interface StorefrontRows {
  readonly profile: CheckoutProfileRow;
  readonly market: CheckoutMarketRow;
}

export function createSupabaseCheckoutRepository(
  input: CreateSupabaseCheckoutRepositoryInput,
): CheckoutRepository {
  const dependencies = {
    ...input,
    createDraftId: input.createDraftId ?? defaultCheckoutDraftId,
    hashCartClientSecret:
      input.hashCartClientSecret ?? defaultCartClientSecretHash,
  };

  return {
    async createDraft(context, draftInput) {
      const storefrontRows = await resolveStorefrontRows(dependencies, context);
      const cart = await resolveActiveCart(
        dependencies,
        context,
        storefrontRows,
      );
      const existingDraft = await dependencies.dataSource.findDraftByCartId(
        cart.id,
      );
      const draft = existingDraft
        ? await dependencies.dataSource.updateDraft(existingDraft.id, {
            fulfillment_mode: draftInput.fulfillmentMode,
            updated_at: resolveNow(dependencies.now),
          })
        : await dependencies.dataSource.createDraft(
            buildNewDraft(dependencies, {
              storefrontRows,
              cart,
              context,
              fulfillmentMode: draftInput.fulfillmentMode,
            }),
          );

      return buildDraftResponse(dependencies, draft);
    },
    async selectFulfillment(context, fulfillmentInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        fulfillmentInput.draftId,
      );
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        fulfillment_mode: fulfillmentInput.fulfillmentMode,
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft);
    },
    async updateShippingAddress(context, addressInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        addressInput.draftId,
      );
      const shippingOptions = await listEligibleShippingOptions(
        dependencies,
        draft,
        addressInput.address,
      );
      const defaultOption =
        selectDefaultShippingOption(
          shippingOptions.map(mapShippingOptionForShared),
          destinationFromAddress(draft.market_id, addressInput.address),
        ) ?? null;
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        delivery_state_json: {
          ...draft.delivery_state_json,
          shipping_address: mapAddressInput(addressInput.address),
          same_as_shipping: true,
          selected_shipping_option_id: defaultOption?.id ?? null,
        },
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "shipping_option");
    },
    async updateBillingAddress(context, billingInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        billingInput.draftId,
      );
      const address = billingInput.address
        ? mapAddressInput(billingInput.address)
        : null;
      const patch =
        draft.fulfillment_mode === "pickup"
          ? {
              pickup_state_json: {
                ...draft.pickup_state_json,
                billing_address: address,
              },
            }
          : {
              delivery_state_json: {
                ...draft.delivery_state_json,
                billing_address: address,
                same_as_shipping: billingInput.sameAsShipping,
              },
            };
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        ...patch,
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "billing_address");
    },
    async selectShippingOption(context, optionInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        optionInput.draftId,
      );
      const shippingAddress = draft.delivery_state_json.shipping_address;

      if (!shippingAddress) {
        throw new Error("Shipping address is required before shipping option");
      }

      const eligibleOptions = await listEligibleShippingOptions(
        dependencies,
        draft,
        addressJsonToInput(shippingAddress),
      );
      const isEligible = eligibleOptions.some(
        (option) => option.id === optionInput.shippingOptionId,
      );

      if (!isEligible) {
        throw new Error(
          `Shipping option ${optionInput.shippingOptionId} is not eligible`,
        );
      }

      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        delivery_state_json: {
          ...draft.delivery_state_json,
          selected_shipping_option_id: optionInput.shippingOptionId,
        },
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "payment_method");
    },
    async updatePickupLocation(context, locationInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        locationInput.draftId,
      );
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        pickup_state_json: {
          ...draft.pickup_state_json,
          location: mapPickupLocationInput(locationInput.location),
        },
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "store");
    },
    async selectPickupStore(context, storeInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        storeInput.draftId,
      );
      const store = await dependencies.dataSource.getStoreById(
        storeInput.storeId,
      );

      if (!store || store.market_id !== draft.market_id || !store.is_active) {
        throw new Error(`Pickup store ${storeInput.storeId} was not found`);
      }

      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        pickup_state_json: {
          ...draft.pickup_state_json,
          selected_store_id: storeInput.storeId,
          selected_pickup_date: null,
        },
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "pickup_date");
    },
    async selectPickupDate(context, dateInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        dateInput.draftId,
      );
      const selectedStoreId = draft.pickup_state_json.selected_store_id;

      if (!selectedStoreId) {
        throw new Error("Pickup store is required before pickup date");
      }

      const pickupDates =
        await dependencies.dataSource.listPickupDates(selectedStoreId);
      const isAvailable = pickupDates.some(
        (date) =>
          date.pickup_date === dateInput.pickupDate && date.is_available,
      );

      if (!isAvailable) {
        throw new Error(`Pickup date ${dateInput.pickupDate} is not available`);
      }

      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        pickup_state_json: {
          ...draft.pickup_state_json,
          selected_pickup_date: dateInput.pickupDate,
        },
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "payment_method");
    },
  };
}

async function resolveStorefrontRows(
  input: CheckoutRepositoryDependencies,
  context: CheckoutOperationContext,
): Promise<StorefrontRows> {
  const [profile, market] = await Promise.all([
    input.dataSource.getProfileBySlug(context.storefrontContext.profileSlug),
    input.dataSource.getMarketByCode(context.storefrontContext.marketCode),
  ]);

  if (!profile || !market) {
    throw new Error(
      `Storefront context not found for profile ${context.storefrontContext.profileSlug} and market ${context.storefrontContext.marketCode}`,
    );
  }

  return { profile, market };
}

async function resolveActiveCart(
  input: CheckoutRepositoryDependencies,
  context: CheckoutOperationContext,
  storefrontRows: StorefrontRows,
): Promise<CheckoutCartRow> {
  if (context.buyer.kind === "authenticated") {
    const cart = await input.dataSource.findActiveSignedInCart({
      profileId: storefrontRows.profile.id,
      marketId: storefrontRows.market.id,
      authUserId: context.buyer.userId,
    });

    if (!cart) {
      throw new Error("Active signed-in cart was not found");
    }

    return cart;
  }

  if (!context.guestCart) {
    throw new Error("Guest checkout requires an active cart binding");
  }

  const cart = await input.dataSource.findActiveGuestCart(
    context.guestCart.cartPublicId,
  );

  if (!cart) {
    throw new Error("Guest cart was not found");
  }

  verifyGuestCartSecret(input, cart, context.guestCart.cartClientSecret);

  if (
    cart.profile_id !== storefrontRows.profile.id ||
    cart.market_id !== storefrontRows.market.id
  ) {
    throw new Error("Guest cart does not match the active storefront context");
  }

  return cart;
}

async function resolveDraft(
  input: CheckoutRepositoryDependencies,
  context: CheckoutOperationContext,
  draftId: string,
): Promise<CheckoutDraftRow> {
  const draft = await input.dataSource.getDraftById(draftId);

  if (!draft) {
    throw new Error(`Checkout draft ${draftId} was not found`);
  }

  if (context.buyer.kind === "authenticated") {
    if (draft.auth_user_id !== context.buyer.userId) {
      throw new Error("Checkout draft does not belong to the signed-in buyer");
    }
    return draft;
  }

  if (!context.guestCart) {
    throw new Error("Guest checkout requires an active cart binding");
  }

  const cart = await input.dataSource.findActiveGuestCart(
    context.guestCart.cartPublicId,
  );

  if (!cart || cart.id !== draft.cart_id) {
    throw new Error("Guest cart does not match checkout draft");
  }

  verifyGuestCartSecret(input, cart, context.guestCart.cartClientSecret);

  return draft;
}

function buildNewDraft(
  input: CheckoutRepositoryDependencies,
  options: {
    readonly storefrontRows: StorefrontRows;
    readonly cart: CheckoutCartRow;
    readonly context: CheckoutOperationContext;
    readonly fulfillmentMode: CheckoutFulfillmentMode;
  },
): CheckoutDraftRow {
  return {
    id: input.createDraftId(),
    profile_id: options.storefrontRows.profile.id,
    market_id: options.storefrontRows.market.id,
    cart_id: options.cart.id,
    auth_user_id:
      options.context.buyer.kind === "authenticated"
        ? options.context.buyer.userId
        : null,
    guest_email: null,
    fulfillment_mode: options.fulfillmentMode,
    delivery_state_json: {},
    pickup_state_json: {},
    selected_promo_evaluation_id: null,
    currency_code: options.storefrontRows.market.currency_code,
    locale: options.storefrontRows.market.locale,
    buyer_country: options.storefrontRows.market.buyer_country,
    sandbox_test_buyer_country:
      options.storefrontRows.market.sandbox_test_buyer_country,
    status: "draft",
    updated_at: resolveNow(input.now),
  };
}

async function buildDraftResponse(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  activeStep?: string,
): Promise<CheckoutApiResponse> {
  const cartItems = await input.dataSource.listCartItems(draft.cart_id);
  const delivery = await buildDeliveryDto(input, draft);
  const pickup = await buildPickupDto(input, draft, cartItems);
  const summary = buildSummary({
    draft,
    cartItems,
    shippingMinor: delivery.selectedShippingAmountMinor,
    taxMinor: delivery.taxMinor,
    pickupSplit: pickup.split,
  });

  return {
    draft: {
      id: draft.id,
      cart_id: draft.cart_id,
      fulfillment_mode: draft.fulfillment_mode,
      status: draft.status,
      active_step: activeStep ?? inferActiveStep(draft),
      delivery: delivery.dto,
      pickup: pickup.dto,
      summary,
      promo: {
        status: draft.selected_promo_evaluation_id ? "selected" : "pending",
        recommended_codes: [],
      },
    },
  } as CheckoutApiResponse;
}

async function buildDeliveryDto(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
): Promise<{
  readonly dto: CatalogJson;
  readonly selectedShippingAmountMinor: number;
  readonly taxMinor: number;
}> {
  const state = draft.delivery_state_json;
  const shippingAddress = state.shipping_address ?? null;
  const shippingOptions = shippingAddress
    ? await listEligibleShippingOptions(
        input,
        draft,
        addressJsonToInput(shippingAddress),
      )
    : [];
  const selectedShippingOption =
    shippingOptions.find(
      (option) => option.id === state.selected_shipping_option_id,
    ) ?? null;
  const taxMinor = shippingAddress
    ? await calculateTaxMinor(input, draft, shippingAddress)
    : 0;

  return {
    dto: {
      shipping_address: shippingAddress,
      billing_address: state.billing_address ?? null,
      same_as_shipping: state.same_as_shipping ?? true,
      shipping_options: shippingOptions.map(mapShippingOptionDto),
      selected_shipping_option_id: selectedShippingOption?.id ?? null,
    },
    selectedShippingAmountMinor: selectedShippingOption?.amount_minor ?? 0,
    taxMinor,
  };
}

async function buildPickupDto(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  cartItems: readonly CheckoutCartItemRow[],
): Promise<{
  readonly dto: CatalogJson;
  readonly split: PickupInventorySplit | null;
}> {
  const state = draft.pickup_state_json;
  const selectedStoreId = state.selected_store_id ?? null;
  const pickupDates = selectedStoreId
    ? await input.dataSource.listPickupDates(selectedStoreId)
    : [];
  const inventory = selectedStoreId
    ? await input.dataSource.listStoreInventory(selectedStoreId)
    : [];
  const split = selectedStoreId
    ? calculatePickupInventorySplit({
        cartLines: cartItems.map((item) => ({
          productId: item.product_id,
          quantity: item.quantity,
          unitPriceMinor: item.unit_price_minor_snapshot,
        })),
        inventory: inventory.map((row) => ({
          storeId: row.store_id,
          productId: row.product_id,
          availableQuantity: row.available_quantity,
        })),
      })
    : null;

  return {
    dto: {
      location: state.location ?? null,
      stores: [],
      selected_store_id: selectedStoreId,
      pickup_dates: pickupDates.map(mapPickupDateDto),
      selected_pickup_date: state.selected_pickup_date ?? null,
      inventory: split
        ? mapPickupSplitDto(split)
        : {
            ready_items: [],
            unavailable_items: [],
            unavailable_subtotal_minor: 0,
          },
    },
    split,
  };
}

function buildSummary(input: {
  readonly draft: CheckoutDraftRow;
  readonly cartItems: readonly CheckoutCartItemRow[];
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly pickupSplit: PickupInventorySplit | null;
}): CatalogJson {
  const itemCount = input.cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const merchandiseSubtotalMinor =
    input.draft.fulfillment_mode === "pickup" && input.pickupSplit
      ? input.pickupSplit.payableSubtotalMinor
      : input.cartItems.reduce(
          (sum, item) => sum + item.unit_price_minor_snapshot * item.quantity,
          0,
        );
  const discountMinor = 0;
  const totalMinor =
    merchandiseSubtotalMinor -
    discountMinor +
    input.taxMinor +
    input.shippingMinor;

  return {
    item_count: itemCount,
    merchandise_subtotal_minor: merchandiseSubtotalMinor,
    discount_minor: discountMinor,
    tax_minor: input.taxMinor,
    shipping_minor: input.shippingMinor,
    total_minor: totalMinor,
    currency_code: input.draft.currency_code,
  };
}

async function listEligibleShippingOptions(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  address: CheckoutAddressInput,
): Promise<readonly CheckoutShippingOptionRow[]> {
  const options = await input.dataSource.listShippingOptions(draft.market_id);
  const eligibleIds = new Set(
    selectEligibleShippingOptions(
      options.map(mapShippingOptionForShared),
      destinationFromAddress(draft.market_id, address),
    ).map((option) => option.id),
  );

  return options
    .filter((option) => eligibleIds.has(option.id))
    .sort((left, right) => left.amount_minor - right.amount_minor);
}

async function calculateTaxMinor(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  address: CheckoutAddressJson,
): Promise<number> {
  const [cartItems, taxRates] = await Promise.all([
    input.dataSource.listCartItems(draft.cart_id),
    input.dataSource.listTaxRates(draft.market_id),
  ]);
  const taxRate = selectTaxRate(
    taxRates.map(mapTaxRateForShared),
    destinationFromAddress(draft.market_id, addressJsonToInput(address)),
  );

  if (!taxRate) {
    return 0;
  }

  return calculateEstimatedTax({
    merchandiseSubtotalMinor: cartItems.reduce(
      (sum, item) => sum + item.unit_price_minor_snapshot * item.quantity,
      0,
    ),
    promoDiscountMinor: 0,
    shippingMinor: 0,
    rateBps: taxRate.rateBps,
  }).taxMinor;
}

function mapAddressInput(address: CheckoutAddressInput): CheckoutAddressJson {
  return {
    recipient_name: address.recipientName,
    phone: address.phone,
    address_line1: address.addressLine1,
    address_line2: address.addressLine2,
    city: address.city,
    state: address.state,
    county: address.county,
    postal_code: address.postalCode,
    country_code: address.countryCode,
  };
}

function mapPickupLocationInput(
  location: CheckoutPickupLocationInput,
): CheckoutPickupLocationJson {
  return {
    country_code: location.countryCode,
    state: location.state,
    county: location.county,
    postal_code: location.postalCode,
  };
}

function addressJsonToInput(
  address: CheckoutAddressJson,
): CheckoutAddressInput {
  return {
    recipientName: address.recipient_name,
    phone: address.phone,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2,
    city: address.city,
    state: address.state,
    county: address.county,
    postalCode: address.postal_code,
    countryCode: address.country_code,
  };
}

function destinationFromAddress(
  marketId: string,
  address: CheckoutAddressInput,
): Destination {
  return {
    marketId,
    countryCode: address.countryCode,
    state: address.state,
    county: address.county,
    postalCode: address.postalCode,
  };
}

function mapShippingOptionForShared(
  option: CheckoutShippingOptionRow,
): ShippingOptionRow {
  return {
    id: option.id,
    marketId: option.market_id,
    countryCode: option.country_code,
    state: option.state,
    county: option.county,
    serviceCode: option.service_code,
    displayName: option.display_name,
    amountMinor: option.amount_minor,
    estimatedDaysMin: option.estimated_days_min,
    estimatedDaysMax: option.estimated_days_max,
    isActive: option.is_active,
  };
}

function mapTaxRateForShared(rate: CheckoutTaxRateRow): TaxRateRow {
  return {
    id: rate.id,
    marketId: rate.market_id,
    countryCode: rate.country_code,
    state: rate.state,
    county: rate.county,
    postalCodePrefix: rate.postal_code_prefix,
    rateBps: rate.rate_bps,
    isActive: rate.is_active,
  };
}

function mapShippingOptionDto(option: CheckoutShippingOptionRow): CatalogJson {
  return {
    id: option.id,
    service_code: option.service_code,
    display_name: option.display_name,
    amount_minor: option.amount_minor,
    estimated_days_min: option.estimated_days_min,
    estimated_days_max: option.estimated_days_max,
  };
}

function mapPickupDateDto(row: CheckoutPickupDateRow): CatalogJson {
  return {
    id: row.id,
    pickup_date: row.pickup_date,
    capacity: row.capacity,
    is_available: row.is_available,
  };
}

function mapPickupSplitDto(split: PickupInventorySplit): CatalogJson {
  return {
    ready_items: split.readyItems.map((item) => ({
      product_id: item.productId,
      requested_quantity: item.requestedQuantity,
      fulfillable_quantity: item.fulfillableQuantity,
      unavailable_quantity: item.unavailableQuantity,
      unit_price_minor: item.unitPriceMinor,
      payable_subtotal_minor: item.payableSubtotalMinor,
    })),
    unavailable_items: split.unavailableItems.map((item) => ({
      product_id: item.productId,
      requested_quantity: item.requestedQuantity,
      fulfillable_quantity: item.fulfillableQuantity,
      unavailable_quantity: item.unavailableQuantity,
      unit_price_minor: item.unitPriceMinor,
      unavailable_subtotal_minor: item.unavailableSubtotalMinor,
    })),
    unavailable_subtotal_minor: split.unavailableSubtotalMinor,
  };
}

function inferActiveStep(draft: CheckoutDraftRow): string {
  if (draft.fulfillment_mode === "pickup") {
    if (!draft.pickup_state_json.selected_store_id) {
      return "store";
    }
    if (!draft.pickup_state_json.selected_pickup_date) {
      return "pickup_date";
    }
    return "payment_method";
  }

  if (!draft.delivery_state_json.shipping_address) {
    return "shipping_address";
  }
  if (!draft.delivery_state_json.selected_shipping_option_id) {
    return "shipping_option";
  }
  return "payment_method";
}

function verifyGuestCartSecret(
  input: CheckoutRepositoryDependencies,
  cart: CheckoutCartRow,
  cartClientSecret: string,
): void {
  if (
    !cart.cart_secret_hash ||
    cart.cart_secret_hash !== input.hashCartClientSecret(cartClientSecret)
  ) {
    throw new Error("Guest cart secret does not match");
  }
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

function defaultCheckoutDraftId(): string {
  return randomUUID();
}

function defaultCartClientSecretHash(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabaseCheckoutError {
  readonly message: string;
}

interface SupabaseCheckoutResult<TData> {
  readonly data: TData | null;
  readonly error: SupabaseCheckoutError | null;
}

interface SupabaseOrderOptions {
  readonly ascending?: boolean;
}

interface SupabaseCheckoutQuery extends PromiseLike<
  SupabaseCheckoutResult<unknown>
> {
  readonly select: (columns: string) => SupabaseCheckoutQuery;
  readonly eq: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabaseCheckoutQuery;
  readonly order: (
    column: string,
    options?: SupabaseOrderOptions,
  ) => SupabaseCheckoutQuery;
  readonly insert: (
    values: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabaseCheckoutQuery;
  readonly update: (values: Record<string, unknown>) => SupabaseCheckoutQuery;
  readonly maybeSingle: () => PromiseLike<SupabaseCheckoutResult<unknown>>;
  readonly single: () => PromiseLike<SupabaseCheckoutResult<unknown>>;
}

export interface SupabaseCheckoutClient {
  readonly from: (table: string) => SupabaseCheckoutQuery;
}

const cartColumns = [
  "id",
  "profile_id",
  "market_id",
  "auth_user_id",
  "cart_public_id",
  "cart_secret_hash",
  "status",
].join(", ");

const draftColumns = [
  "id",
  "profile_id",
  "market_id",
  "cart_id",
  "auth_user_id",
  "guest_email",
  "fulfillment_mode",
  "delivery_state_json",
  "pickup_state_json",
  "selected_promo_evaluation_id",
  "currency_code",
  "locale",
  "buyer_country",
  "sandbox_test_buyer_country",
  "status",
  "updated_at",
].join(", ");

export function createSupabaseCheckoutDataSource(
  supabase: SupabaseCheckoutClient,
): CheckoutDataSource {
  return {
    async getProfileBySlug(slug) {
      return queryOne<CheckoutProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug")
          .eq("slug", slug)
          .maybeSingle(),
        `Load profile ${slug}`,
      );
    },
    async getMarketByCode(code) {
      return queryOne<CheckoutMarketRow>(
        supabase
          .from("markets")
          .select(
            "id, code, currency_code, locale, buyer_country, sandbox_test_buyer_country",
          )
          .eq("code", code)
          .maybeSingle(),
        `Load market ${code}`,
      );
    },
    async findActiveGuestCart(cartPublicId) {
      return queryOne<CheckoutCartRow>(
        supabase
          .from("carts")
          .select(cartColumns)
          .eq("cart_public_id", cartPublicId)
          .eq("status", "active")
          .maybeSingle(),
        `Load guest cart ${cartPublicId}`,
      );
    },
    async findActiveSignedInCart(input) {
      return queryOne<CheckoutCartRow>(
        supabase
          .from("carts")
          .select(cartColumns)
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId)
          .eq("auth_user_id", input.authUserId)
          .eq("status", "active")
          .maybeSingle(),
        "Load signed-in cart",
      );
    },
    async findDraftByCartId(cartId) {
      return queryOne<CheckoutDraftRow>(
        supabase
          .from("checkout_drafts")
          .select(draftColumns)
          .eq("cart_id", cartId)
          .eq("status", "draft")
          .maybeSingle(),
        `Load checkout draft for cart ${cartId}`,
      );
    },
    async getDraftById(id) {
      return queryOne<CheckoutDraftRow>(
        supabase
          .from("checkout_drafts")
          .select(draftColumns)
          .eq("id", id)
          .maybeSingle(),
        `Load checkout draft ${id}`,
      );
    },
    async createDraft(draft) {
      return queryRequired<CheckoutDraftRow>(
        supabase
          .from("checkout_drafts")
          .insert({
            id: draft.id,
            profile_id: draft.profile_id,
            market_id: draft.market_id,
            cart_id: draft.cart_id,
            auth_user_id: draft.auth_user_id,
            guest_email: draft.guest_email,
            fulfillment_mode: draft.fulfillment_mode,
            delivery_state_json: draft.delivery_state_json,
            pickup_state_json: draft.pickup_state_json,
            selected_promo_evaluation_id: draft.selected_promo_evaluation_id,
            currency_code: draft.currency_code,
            locale: draft.locale,
            buyer_country: draft.buyer_country,
            sandbox_test_buyer_country: draft.sandbox_test_buyer_country,
            status: draft.status,
            updated_at: draft.updated_at,
          })
          .select(draftColumns)
          .single(),
        "Create checkout draft",
      );
    },
    async updateDraft(draftId, patch) {
      return queryRequired<CheckoutDraftRow>(
        supabase
          .from("checkout_drafts")
          .update(patch as Record<string, unknown>)
          .eq("id", draftId)
          .select(draftColumns)
          .single(),
        `Update checkout draft ${draftId}`,
      );
    },
    async listCartItems(cartId) {
      return queryMany<CheckoutCartItemRow>(
        supabase
          .from("cart_items")
          .select(
            "id, cart_id, product_id, quantity, unit_price_minor_snapshot",
          )
          .eq("cart_id", cartId),
        `List checkout cart items ${cartId}`,
      );
    },
    async listShippingOptions(marketId) {
      return queryMany<CheckoutShippingOptionRow>(
        supabase
          .from("shipping_options")
          .select(
            [
              "id",
              "market_id",
              "country_code",
              "state",
              "county",
              "service_code",
              "display_name",
              "amount_minor",
              "estimated_days_min",
              "estimated_days_max",
              "is_active",
            ].join(", "),
          )
          .eq("market_id", marketId),
        `List shipping options ${marketId}`,
      );
    },
    async listTaxRates(marketId) {
      return queryMany<CheckoutTaxRateRow>(
        supabase
          .from("tax_rates")
          .select(
            "id, market_id, country_code, state, county, postal_code_prefix, rate_bps, is_active",
          )
          .eq("market_id", marketId),
        `List tax rates ${marketId}`,
      );
    },
    async getStoreById(storeId) {
      return queryOne<CheckoutStoreRow>(
        supabase
          .from("stores")
          .select(
            [
              "id",
              "market_id",
              "name",
              "phone",
              "address_line1",
              "address_line2",
              "city",
              "state",
              "postal_code",
              "country_code",
              "is_active",
            ].join(", "),
          )
          .eq("id", storeId)
          .maybeSingle(),
        `Load pickup store ${storeId}`,
      );
    },
    async listPickupDates(storeId) {
      return queryMany<CheckoutPickupDateRow>(
        supabase
          .from("store_pickup_dates")
          .select(
            "id, market_id, store_id, pickup_date, capacity, is_available",
          )
          .eq("store_id", storeId)
          .eq("is_available", true)
          .order("pickup_date", { ascending: true }),
        `List pickup dates ${storeId}`,
      );
    },
    async listStoreInventory(storeId) {
      return queryMany<CheckoutStoreInventoryRow>(
        supabase
          .from("store_inventory")
          .select("store_id, product_id, available_quantity")
          .eq("store_id", storeId),
        `List store inventory ${storeId}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabaseCheckoutResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabaseCheckoutResult<unknown>>,
  description: string,
): Promise<TRow> {
  const row = await queryOne<TRow>(query, description);
  if (!row) {
    throw new Error(`${description}: expected row`);
  }
  return row;
}

async function queryMany<TRow>(
  query: PromiseLike<SupabaseCheckoutResult<unknown>>,
  description: string,
): Promise<readonly TRow[]> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  if (result.data === null) {
    return [];
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`${description}: expected list data`);
  }
  return result.data as TRow[];
}

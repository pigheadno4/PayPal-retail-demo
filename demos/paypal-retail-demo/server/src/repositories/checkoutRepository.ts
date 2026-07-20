import { createHash, randomUUID } from "node:crypto";

import {
  calculatePickupInventorySplit,
  type PickupInventorySplit,
} from "../../../shared/src/inventory.js";
import {
  getMarketConfig,
  type MarketCode,
} from "../../../shared/src/market.js";
import { multiplyMinor } from "../../../shared/src/money.js";
import {
  planPendingOrderResume,
  type OrderStatus,
  type ResumePaymentSessionStatus,
} from "../../../shared/src/orders.js";
import {
  evaluatePromos,
  type PromoCandidateSet,
  type PromoCompatibilityRow,
  type PromoEvaluationInput,
  type PromoEvaluationResult,
  type PromoLineInput,
  type PromoRejectedResult,
  type PromoRuleProductRow,
  type PromoRuleRegionRow,
  type PromoRuleRow,
} from "../../../shared/src/promos.js";
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
import {
  CheckoutResumeFulfillmentLockedError,
  type CheckoutAddressInput,
  type CheckoutApiResponse,
  type CheckoutFulfillmentMode,
  type CheckoutOperationContext,
  type CheckoutPickupLocationInput,
  type CheckoutRepository,
} from "../routes/checkout.js";
import type { CatalogJson } from "../routes/catalog.js";

type RepositoryNow = Date | string | (() => Date | string);
const ORDER_OPERATION_LOCK_TTL_MS = 5 * 60 * 1000;

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
  readonly product_name: string;
  readonly product_image_path?: string | null;
  readonly category_id: string;
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
  readonly pending_order_resume_id?: string | null;
}

export interface CheckoutPickupStateJson {
  readonly location?: CheckoutPickupLocationJson | null;
  readonly billing_address?: CheckoutAddressJson | null;
  readonly selected_store_id?: string | null;
  readonly selected_pickup_date?: string | null;
  readonly pending_order_resume_id?: string | null;
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

export interface CheckoutCentralInventoryRow {
  readonly profile_id: string;
  readonly market_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
}

export interface CheckoutResumeOrderRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly order_number: string;
  readonly auth_user_id: string | null;
  readonly checkout_draft_id: string | null;
  readonly fulfillment_mode: CheckoutFulfillmentMode;
  readonly status: OrderStatus;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
}

export interface CheckoutResumeOrderItemRow {
  readonly id: string;
  readonly order_id: string;
  readonly product_id: string;
  readonly product_name_snapshot: string;
  readonly product_image_url_snapshot?: string | null;
  readonly category_id: string;
  readonly quantity: number;
  readonly unit_price_minor: number;
}

export interface CheckoutResumePaymentSessionRow {
  readonly id: string;
  readonly order_id: string;
  readonly status: ResumePaymentSessionStatus;
  readonly attempt_number: number;
  readonly paypal_invoice_id: string | null;
}

export interface CheckoutPromoRuleRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly code: string;
  readonly promo_type: "auto" | "manual";
  readonly discount_type: "percent" | "fixed_amount";
  readonly discount_value: number;
  readonly min_merchandise_subtotal_minor: number;
  readonly starts_at: string | null;
  readonly ends_at: string | null;
  readonly is_stackable: boolean;
  readonly priority: number;
  readonly is_active: boolean;
}

export interface CheckoutPromoRuleRegionRow {
  readonly promo_rule_id: string;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code_prefix: string | null;
  readonly include_exclude: "include" | "exclude";
}

export interface CheckoutPromoRuleProductRow {
  readonly promo_rule_id: string;
  readonly product_id: string | null;
  readonly category_id: string | null;
  readonly include_exclude: "include" | "exclude";
}

export interface CheckoutPromoCompatibilityRow {
  readonly promo_rule_id: string;
  readonly compatible_promo_rule_id: string;
  readonly compatibility: "compatible" | "exclusive";
}

export interface CheckoutPromoEvaluationRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly checkout_draft_id: string | null;
  readonly order_id: string | null;
  readonly evaluation_context_json: CatalogJson;
  readonly matched_promos_json: readonly string[];
  readonly rejected_promos_json: readonly CatalogJson[];
  readonly candidate_sets_json: readonly CatalogJson[];
  readonly recommended_set_json: readonly string[];
  readonly selected_set_json: readonly string[];
  readonly merchandise_discount_minor: number;
  readonly taxable_subtotal_minor: number;
  readonly final_total_minor: number;
  readonly created_at: string;
}

export interface CheckoutPromoEvaluationLineRow {
  readonly id: string;
  readonly promo_evaluation_id: string;
  readonly promo_rule_id: string | null;
  readonly code_snapshot: string;
  readonly evaluation_status:
    | "candidate"
    | "recommended"
    | "selected"
    | "applied"
    | "rejected";
  readonly rejection_reason: string | null;
  readonly stack_group: string | null;
  readonly discount_minor: number;
  readonly taxable_subtotal_effect_minor: number;
  readonly final_total_effect_minor: number;
  readonly explanation: string | null;
  readonly sort_order: number;
}

export interface CheckoutDataSource {
  readonly getProfileBySlug: (
    slug: string,
  ) => Promise<CheckoutProfileRow | null>;
  readonly getMarketByCode: (code: string) => Promise<CheckoutMarketRow | null>;
  readonly getMarketById: (id: string) => Promise<CheckoutMarketRow | null>;
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
  readonly getResumeOrderForUser: (input: {
    readonly authUserId: string;
    readonly orderNumber: string;
  }) => Promise<CheckoutResumeOrderRow | null>;
  readonly claimPendingOrderResume: (input: {
    readonly orderId: string;
    readonly authUserId: string;
    readonly lockToken: string;
    readonly lockAcquiredAt: string;
    readonly lockExpiresAt: string;
  }) => Promise<CheckoutResumeOrderRow | null>;
  readonly releasePendingOrderResume: (input: {
    readonly orderId: string;
    readonly lockToken: string;
  }) => Promise<void>;
  readonly getPendingResumeOrderByCheckoutDraftId: (
    checkoutDraftId: string,
  ) => Promise<CheckoutResumeOrderRow | null>;
  readonly listResumeOrderItems: (
    orderId: string,
  ) => Promise<readonly CheckoutResumeOrderItemRow[]>;
  readonly listResumePaymentSessions: (
    orderId: string,
  ) => Promise<readonly CheckoutResumePaymentSessionRow[]>;
  readonly listCentralInventory: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productIds: readonly string[];
  }) => Promise<readonly CheckoutCentralInventoryRow[]>;
  readonly listShippingOptions: (
    marketId: string,
  ) => Promise<readonly CheckoutShippingOptionRow[]>;
  readonly listTaxRates: (
    marketId: string,
  ) => Promise<readonly CheckoutTaxRateRow[]>;
  readonly listStoresByMarket: (
    marketId: string,
  ) => Promise<readonly CheckoutStoreRow[]>;
  readonly getStoreById: (storeId: string) => Promise<CheckoutStoreRow | null>;
  readonly listPickupDates: (
    storeId: string,
  ) => Promise<readonly CheckoutPickupDateRow[]>;
  readonly listStoreInventory: (
    storeId: string,
  ) => Promise<readonly CheckoutStoreInventoryRow[]>;
  readonly listPromoRules: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly CheckoutPromoRuleRow[]>;
  readonly listPromoRuleRegions: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly CheckoutPromoRuleRegionRow[]>;
  readonly listPromoRuleProducts: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly CheckoutPromoRuleProductRow[]>;
  readonly listPromoCompatibility: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly CheckoutPromoCompatibilityRow[]>;
  readonly getPromoEvaluationById: (
    id: string,
  ) => Promise<CheckoutPromoEvaluationRow | null>;
  readonly createPromoEvaluation: (
    evaluation: CheckoutPromoEvaluationRow,
    lines: readonly CheckoutPromoEvaluationLineRow[],
  ) => Promise<CheckoutPromoEvaluationRow>;
}

export interface CreateSupabaseCheckoutRepositoryInput {
  readonly dataSource: CheckoutDataSource;
  readonly now?: RepositoryNow;
  readonly createDraftId?: () => string;
  readonly createPromoEvaluationId?: () => string;
  readonly createPromoEvaluationLineId?: () => string;
  readonly hashCartClientSecret?: (secret: string) => string;
  readonly createResumeLockToken?: () => string;
}

interface CheckoutRepositoryDependencies {
  readonly dataSource: CheckoutDataSource;
  readonly now?: RepositoryNow;
  readonly createDraftId: () => string;
  readonly createPromoEvaluationId: () => string;
  readonly createPromoEvaluationLineId: () => string;
  readonly hashCartClientSecret: (secret: string) => string;
  readonly createResumeLockToken: () => string;
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
    createPromoEvaluationId:
      input.createPromoEvaluationId ?? defaultPromoEvaluationId,
    createPromoEvaluationLineId:
      input.createPromoEvaluationLineId ?? defaultPromoEvaluationLineId,
    hashCartClientSecret:
      input.hashCartClientSecret ?? defaultCartClientSecretHash,
    createResumeLockToken: input.createResumeLockToken ?? randomUUID,
  };

  return {
    async resumePendingOrder(resumeInput) {
      let order =
        await dependencies.dataSource.getResumeOrderForUser(resumeInput);
      if (!order) {
        return { status: "not_found" };
      }
      if (order.status !== "pending") {
        return { status: "not_pending" };
      }
      if (!order.checkout_draft_id) {
        return {
          status: "blocked",
          code: "ORDER_RESUME_STATE_INVALID",
          message:
            "This pending order no longer has a checkout draft to resume.",
        };
      }
      const checkoutDraftId = order.checkout_draft_id;

      const resumeLockToken = dependencies.createResumeLockToken();
      const lockAcquiredAt = resolveNow(dependencies.now);
      const claimedOrder =
        await dependencies.dataSource.claimPendingOrderResume({
          orderId: order.id,
          authUserId: resumeInput.authUserId,
          lockToken: resumeLockToken,
          lockAcquiredAt,
          lockExpiresAt: addMillisecondsToIso(
            lockAcquiredAt,
            ORDER_OPERATION_LOCK_TTL_MS,
          ),
        });
      if (!claimedOrder) {
        const currentOrder =
          await dependencies.dataSource.getResumeOrderForUser(resumeInput);
        if (!currentOrder || currentOrder.status !== "pending") {
          return { status: "not_pending" };
        }
        return {
          status: "blocked",
          code: "ORDER_RESUME_IN_PROGRESS",
          message: "This order is already being resumed. Please try again.",
        };
      }
      order = claimedOrder;

      try {
        const [draft, market, orderItems, paymentSessions] = await Promise.all([
          dependencies.dataSource.getDraftById(checkoutDraftId),
          dependencies.dataSource.getMarketById(order.market_id),
          dependencies.dataSource.listResumeOrderItems(order.id),
          dependencies.dataSource.listResumePaymentSessions(order.id),
        ]);
        if (
          !draft ||
          !market ||
          draft.auth_user_id !== resumeInput.authUserId ||
          draft.profile_id !== order.profile_id ||
          draft.market_id !== order.market_id ||
          draft.fulfillment_mode !== order.fulfillment_mode ||
          orderItems.length === 0 ||
          (market.code !== "US" && market.code !== "GB")
        ) {
          return {
            status: "blocked",
            code: "ORDER_RESUME_STATE_INVALID",
            message:
              "This pending order cannot be resumed from its saved state.",
          };
        }

        const marketConfig = getMarketConfig(market.code as MarketCode);
        if (
          order.currency_code !== marketConfig.currencyCode ||
          order.locale !== marketConfig.locale ||
          order.buyer_country !== marketConfig.buyerCountry ||
          order.sandbox_test_buyer_country !==
            marketConfig.sandboxTestBuyerCountry
        ) {
          return {
            status: "blocked",
            code: "ORDER_RESUME_STATE_INVALID",
            message:
              "This pending order's locked market state is inconsistent.",
          };
        }

        const plan = planPendingOrderResume({
          order: {
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            fulfillmentMode: order.fulfillment_mode,
            profileId: order.profile_id,
            market: marketConfig,
            currencyCode: marketConfig.currencyCode,
            locale: order.locale,
            buyerCountry: marketConfig.buyerCountry,
            payLaterBuyerCountry: marketConfig.payLaterBuyerCountry,
            sandboxTestBuyerCountry: marketConfig.sandboxTestBuyerCountry,
            itemSnapshots: orderItems.map((item) => ({
              productId: item.product_id,
              productNameSnapshot: item.product_name_snapshot,
              quantity: item.quantity,
              unitPriceMinorSnapshot: item.unit_price_minor,
              currencyCode: marketConfig.currencyCode,
            })),
            pickupDate: draft.pickup_state_json.selected_pickup_date ?? null,
          },
          paymentSessions: paymentSessions.map((session) => ({
            id: session.id,
            attemptNumber: session.attempt_number,
            status: session.status,
            paypalInvoiceId: session.paypal_invoice_id ?? order.order_number,
          })),
          activeContext: null,
          now: resolveNow(dependencies.now),
        });
        const draftItems = mapResumeOrderItemsToDraftItems(draft, orderItems);

        let revalidatedDraft = draft;
        let deliveryShippingOptions:
          | readonly CheckoutShippingOptionRow[]
          | undefined;
        let resumePaymentReadiness: CatalogJson | null | undefined;
        if (order.fulfillment_mode === "delivery") {
          const centralInventory =
            await dependencies.dataSource.listCentralInventory({
              profileId: order.profile_id,
              marketId: order.market_id,
              productIds: orderItems.map((item) => item.product_id),
            });
          const availableByProductId = new Map(
            centralInventory.map((row) => [
              row.product_id,
              row.available_quantity,
            ]),
          );
          const inventoryUnavailable = orderItems.some(
            (item) =>
              (availableByProductId.get(item.product_id) ?? 0) < item.quantity,
          );
          if (inventoryUnavailable) {
            return {
              status: "blocked",
              code: "DELIVERY_INVENTORY_UNAVAILABLE",
              message:
                "One or more items are no longer available for delivery. Review your cart before trying again.",
            };
          }

          const shippingAddress = draft.delivery_state_json.shipping_address;
          if (!shippingAddress) {
            deliveryShippingOptions = [];
            resumePaymentReadiness = {
              state: "blocked",
              title: "Add a shipping address",
              body: "Add your delivery address before choosing a payment method.",
            };
            revalidatedDraft = await dependencies.dataSource.updateDraft(
              draft.id,
              {
                delivery_state_json: {
                  ...draft.delivery_state_json,
                  pending_order_resume_id: order.id,
                  selected_shipping_option_id: null,
                },
                status: "draft",
                updated_at: resolveNow(dependencies.now),
              },
            );
          } else {
            deliveryShippingOptions = await listEligibleShippingOptions(
              dependencies,
              draft,
              addressJsonToInput(shippingAddress),
            );
            const selectedShippingOption =
              deliveryShippingOptions.find(
                (option) =>
                  option.id ===
                  draft.delivery_state_json.selected_shipping_option_id,
              ) ??
              selectDefaultShippingOption(
                deliveryShippingOptions.map(mapShippingOptionForShared),
                destinationFromAddress(
                  draft.market_id,
                  addressJsonToInput(shippingAddress),
                ),
              );
            if (!selectedShippingOption) {
              return {
                status: "blocked",
                code: "SHIPPING_UNAVAILABLE",
                message:
                  "No delivery option is currently available for this order.",
              };
            }
            revalidatedDraft = await dependencies.dataSource.updateDraft(
              draft.id,
              {
                delivery_state_json: {
                  ...draft.delivery_state_json,
                  pending_order_resume_id: order.id,
                  selected_shipping_option_id: selectedShippingOption.id,
                },
                status: "draft",
                updated_at: resolveNow(dependencies.now),
              },
            );
          }
        } else {
          const selectedStoreId = draft.pickup_state_json.selected_store_id;
          const selectedStore = selectedStoreId
            ? await dependencies.dataSource.getStoreById(selectedStoreId)
            : null;
          const storeIsValid = Boolean(
            selectedStore &&
            selectedStore.is_active &&
            selectedStore.market_id === order.market_id,
          );
          const selectedPickupDate =
            draft.pickup_state_json.selected_pickup_date ?? null;
          const pickupDates = storeIsValid
            ? await dependencies.dataSource.listPickupDates(selectedStoreId!)
            : [];
          const dateIsValid = Boolean(
            plan.pickupDateAction === "keep" &&
            selectedPickupDate &&
            pickupDates.some(
              (row) =>
                row.pickup_date === selectedPickupDate && row.is_available,
            ),
          );
          resumePaymentReadiness = !storeIsValid
            ? {
                state: "blocked",
                title: "Choose a new pickup store",
                body: "Your previous pickup store is no longer available.",
              }
            : !dateIsValid
              ? {
                  state: "blocked",
                  title: "Choose a new pickup date",
                  body: "Your previous pickup date is no longer available.",
                }
              : undefined;
          revalidatedDraft = await dependencies.dataSource.updateDraft(
            draft.id,
            {
              pickup_state_json: {
                ...draft.pickup_state_json,
                pending_order_resume_id: order.id,
                selected_store_id: storeIsValid
                  ? (selectedStoreId ?? null)
                  : null,
                selected_pickup_date: dateIsValid ? selectedPickupDate : null,
              },
              status: "draft",
              updated_at: resolveNow(dependencies.now),
            },
          );
        }

        const previousPromoEvaluation = await resolveSelectedPromoEvaluation(
          dependencies,
          revalidatedDraft,
        );
        const promoEvaluation = await createPromoEvaluationSnapshot(
          dependencies,
          revalidatedDraft,
          {
            manualCodes: previousPromoEvaluation?.selected_set_json ?? [],
            cartItems: draftItems,
            orderId: order.id,
          },
        );
        revalidatedDraft = await dependencies.dataSource.updateDraft(
          revalidatedDraft.id,
          {
            selected_promo_evaluation_id: promoEvaluation.id,
            updated_at: resolveNow(dependencies.now),
          },
        );

        return {
          status: "ready",
          checkout: await buildDraftResponse(
            dependencies,
            revalidatedDraft,
            undefined,
            {
              cartItems: draftItems,
              ...(deliveryShippingOptions ? { deliveryShippingOptions } : {}),
              ...(resumePaymentReadiness !== undefined
                ? { paymentReadiness: resumePaymentReadiness }
                : {}),
              resumeContext: {
                order_number: order.order_number,
                market_code: marketConfig.code,
                currency_code: marketConfig.currencyCode,
                locale: marketConfig.locale,
                buyer_country: marketConfig.buyerCountry,
                paylater_buyer_country: marketConfig.payLaterBuyerCountry,
                sandbox_test_buyer_country:
                  marketConfig.sandboxTestBuyerCountry,
              },
            },
          ),
        };
      } finally {
        await dependencies.dataSource.releasePendingOrderResume({
          orderId: order.id,
          lockToken: resumeLockToken,
        });
      }
    },
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
      const pendingResumeOrder = await resolveMarkedPendingResumeOrder(
        dependencies,
        draft,
      );
      if (
        pendingResumeOrder &&
        fulfillmentInput.fulfillmentMode !== pendingResumeOrder.fulfillment_mode
      ) {
        throw new CheckoutResumeFulfillmentLockedError();
      }
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

      return buildDraftResponse(dependencies, updatedDraft, "shipping_option", {
        deliveryShippingOptions: shippingOptions,
      });
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

      return buildDraftResponse(dependencies, updatedDraft, "payment_method", {
        deliveryShippingOptions: eligibleOptions,
      });
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

      const pickupDates = normalizePickupDatesForCheckout(
        await dependencies.dataSource.listPickupDates(selectedStoreId),
        dependencies.now,
      );
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
    async evaluatePromos(context, promoInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        promoInput.draftId,
      );
      const evaluation = await createPromoEvaluationSnapshot(
        dependencies,
        draft,
        {
          manualCodes: promoInput.manualCodes,
        },
      );

      return {
        promo: mapPromoEvaluationDto(evaluation),
      } as CheckoutApiResponse;
    },
    async applyPromos(context, promoInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        promoInput.draftId,
      );
      const evaluation = await createPromoEvaluationSnapshot(
        dependencies,
        draft,
        {
          manualCodes: promoInput.manualCodes,
          selectedCodes: promoInput.selectedCodes,
        },
      );
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        selected_promo_evaluation_id: evaluation.id,
        updated_at: resolveNow(dependencies.now),
      });

      return buildDraftResponse(dependencies, updatedDraft, "payment_method");
    },
    async removePromo(context, promoInput) {
      const draft = await resolveDraft(
        dependencies,
        context,
        promoInput.draftId,
      );
      const currentEvaluation = draft.selected_promo_evaluation_id
        ? await dependencies.dataSource.getPromoEvaluationById(
            draft.selected_promo_evaluation_id,
          )
        : null;
      const nextSelectedCodes = currentEvaluation
        ? currentEvaluation.selected_set_json.filter(
            (code) => code !== promoInput.code,
          )
        : [];
      const evaluation = await createPromoEvaluationSnapshot(
        dependencies,
        draft,
        {
          manualCodes: nextSelectedCodes,
          selectedCodes: nextSelectedCodes,
        },
      );
      const updatedDraft = await dependencies.dataSource.updateDraft(draft.id, {
        selected_promo_evaluation_id: evaluation.id,
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
  options: {
    readonly cartItems?: readonly CheckoutCartItemRow[];
    readonly deliveryShippingOptions?: readonly CheckoutShippingOptionRow[];
    readonly paymentReadiness?: CatalogJson | null;
    readonly resumeContext?: CatalogJson;
  } = {},
): Promise<CheckoutApiResponse> {
  const [cartItems, selectedPromoEvaluation] = await Promise.all([
    options.cartItems ?? resolveDraftItems(input, draft),
    resolveSelectedPromoEvaluation(input, draft),
  ]);
  const promoDiscountMinor =
    selectedPromoEvaluation?.merchandise_discount_minor ?? 0;
  const [delivery, pickup] = await Promise.all([
    buildDeliveryDto(input, {
      cartItems,
      draft,
      promoDiscountMinor,
      shippingOptions: options.deliveryShippingOptions,
    }),
    buildPickupDto(input, draft, cartItems),
  ]);
  const summary = buildSummary({
    draft,
    cartItems,
    shippingMinor: delivery.selectedShippingAmountMinor,
    taxMinor: delivery.taxMinor,
    pickupSplit: pickup.split,
    discountMinor: promoDiscountMinor,
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
      items: cartItems.map((item) => ({
        id: item.id,
        product_name: item.product_name,
        image_path: item.product_image_path ?? null,
        quantity: item.quantity,
        unit_price_minor: item.unit_price_minor_snapshot,
        line_subtotal_minor: multiplyMinor(
          item.unit_price_minor_snapshot,
          item.quantity,
        ),
      })),
      summary,
      promo: mapDraftPromoDto(selectedPromoEvaluation),
      ...(options.resumeContext
        ? { resume_context: options.resumeContext }
        : {}),
      ...(options.paymentReadiness !== undefined ||
      hasPendingOrderResumeMarker(draft)
        ? { payment_readiness: options.paymentReadiness ?? null }
        : {}),
    },
  } as CheckoutApiResponse;
}

function hasPendingOrderResumeMarker(draft: CheckoutDraftRow): boolean {
  const orderId =
    draft.fulfillment_mode === "delivery"
      ? draft.delivery_state_json.pending_order_resume_id
      : draft.pickup_state_json.pending_order_resume_id;

  return typeof orderId === "string" && orderId.length > 0;
}

async function buildDeliveryDto(
  input: CheckoutRepositoryDependencies,
  {
    cartItems,
    draft,
    promoDiscountMinor,
    shippingOptions: prefetchedShippingOptions,
  }: {
    readonly cartItems: readonly CheckoutCartItemRow[];
    readonly draft: CheckoutDraftRow;
    readonly promoDiscountMinor: number;
    readonly shippingOptions: readonly CheckoutShippingOptionRow[] | undefined;
  },
): Promise<{
  readonly dto: CatalogJson;
  readonly selectedShippingAmountMinor: number;
  readonly taxMinor: number;
}> {
  const state = draft.delivery_state_json;
  const shippingAddress = state.shipping_address ?? null;
  const shippingOptions = shippingAddress
    ? (prefetchedShippingOptions ??
      (await listEligibleShippingOptions(
        input,
        draft,
        addressJsonToInput(shippingAddress),
      )))
    : [];
  const selectedShippingOption =
    shippingOptions.find(
      (option) => option.id === state.selected_shipping_option_id,
    ) ?? null;
  const taxMinor = shippingAddress
    ? await calculateTaxMinor(
        input,
        draft,
        shippingAddress,
        promoDiscountMinor,
        cartItems,
      )
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
  const cartLines = cartItems.map((item) => ({
    productId: item.product_id,
    productName: item.product_name,
    quantity: item.quantity,
    unitPriceMinor: item.unit_price_minor_snapshot,
  }));
  const stores =
    state.location || selectedStoreId
      ? await buildPickupStoreDtos(input, draft, cartLines, selectedStoreId)
      : [];
  const pickupDates = selectedStoreId
    ? normalizePickupDatesForCheckout(
        await input.dataSource.listPickupDates(selectedStoreId),
        input.now,
      )
    : [];
  const inventory = selectedStoreId
    ? await input.dataSource.listStoreInventory(selectedStoreId)
    : [];
  const split = selectedStoreId
    ? calculatePickupInventorySplit({
        cartLines,
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
      stores,
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

async function buildPickupStoreDtos(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  cartLines: readonly {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
    readonly unitPriceMinor: number;
  }[],
  selectedStoreId: string | null,
): Promise<readonly CatalogJson[]> {
  const stores = await input.dataSource.listStoresByMarket(draft.market_id);

  return Promise.all(
    stores.map(async (store) => {
      const inventory = await input.dataSource.listStoreInventory(store.id);
      const split = calculatePickupInventorySplit({
        cartLines,
        inventory: inventory.map((row) => ({
          storeId: row.store_id,
          productId: row.product_id,
          availableQuantity: row.available_quantity,
        })),
      });
      const availableItemsCount = split.readyItems.reduce(
        (sum, item) => sum + item.fulfillableQuantity,
        0,
      );
      const unavailableItemsCount = split.unavailableItems.reduce(
        (sum, item) => sum + item.unavailableQuantity,
        0,
      );

      return {
        id: store.id,
        name: store.name,
        address_line1: store.address_line1,
        address_line2: store.address_line2,
        city: store.city,
        state: store.state,
        postal_code: store.postal_code,
        country_code: store.country_code,
        phone: store.phone,
        distance_label: "Available nearby",
        available_items_count: availableItemsCount,
        unavailable_items_count: unavailableItemsCount,
        inventory_lines: cartLines.map((line) =>
          mapPickupStoreInventoryLine(line, split),
        ),
        selected: store.id === selectedStoreId,
      };
    }),
  );
}

function mapPickupStoreInventoryLine(
  line: {
    readonly productId: string;
    readonly productName: string;
    readonly quantity: number;
  },
  split: PickupInventorySplit,
): CatalogJson {
  const readyItem = split.readyItems.find(
    (item) => item.productId === line.productId,
  );
  const unavailableItem = split.unavailableItems.find(
    (item) => item.productId === line.productId,
  );
  const fulfillableQuantity = readyItem?.fulfillableQuantity ?? 0;
  const unavailableQuantity =
    unavailableItem?.unavailableQuantity ??
    Math.max(line.quantity - fulfillableQuantity, 0);
  const status =
    fulfillableQuantity >= line.quantity
      ? "available"
      : fulfillableQuantity > 0
        ? "limited"
        : "unavailable";

  return {
    product_id: line.productId,
    product_name: line.productName,
    requested_quantity: line.quantity,
    fulfillable_quantity: fulfillableQuantity,
    unavailable_quantity: unavailableQuantity,
    status,
    status_label:
      status === "available"
        ? "In stock"
        : status === "limited"
          ? `Only ${fulfillableQuantity} available`
          : "Sold out",
  };
}

function buildSummary(input: {
  readonly draft: CheckoutDraftRow;
  readonly cartItems: readonly CheckoutCartItemRow[];
  readonly shippingMinor: number;
  readonly taxMinor: number;
  readonly pickupSplit: PickupInventorySplit | null;
  readonly discountMinor: number;
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
  const discountMinor = Math.min(input.discountMinor, merchandiseSubtotalMinor);
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

async function resolveSelectedPromoEvaluation(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
): Promise<CheckoutPromoEvaluationRow | null> {
  if (!draft.selected_promo_evaluation_id) {
    return null;
  }

  const evaluation = await input.dataSource.getPromoEvaluationById(
    draft.selected_promo_evaluation_id,
  );
  return evaluation?.checkout_draft_id === draft.id ? evaluation : null;
}

async function createPromoEvaluationSnapshot(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  options: {
    readonly manualCodes: readonly string[];
    readonly selectedCodes?: readonly string[];
    readonly cartItems?: readonly CheckoutCartItemRow[];
    readonly orderId?: string | null;
  },
): Promise<CheckoutPromoEvaluationRow> {
  const [
    cartItems,
    promoRules,
    regionScopes,
    productScopes,
    compatibility,
    shippingAmountMinor,
  ] = await Promise.all([
    options.cartItems ?? resolveDraftItems(input, draft),
    input.dataSource.listPromoRules({
      profileId: draft.profile_id,
      marketId: draft.market_id,
    }),
    input.dataSource.listPromoRuleRegions({
      profileId: draft.profile_id,
      marketId: draft.market_id,
    }),
    input.dataSource.listPromoRuleProducts({
      profileId: draft.profile_id,
      marketId: draft.market_id,
    }),
    input.dataSource.listPromoCompatibility({
      profileId: draft.profile_id,
      marketId: draft.market_id,
    }),
    resolveSelectedShippingAmountMinor(input, draft),
  ]);
  const promoLines = await buildPromoLines(input, draft, cartItems);
  const merchandiseSubtotalMinor = promoLines.reduce(
    (sum, line) => sum + line.subtotalMinor,
    0,
  );
  const evaluationInput: PromoEvaluationInput = {
    at: resolveNow(input.now),
    merchandiseSubtotalMinor,
    shippingMinor: shippingAmountMinor,
    manualCodes: options.manualCodes,
    destination: resolvePromoDestination(draft),
    lines: promoLines,
    rules: promoRules.map(mapPromoRuleForShared),
    regionScopes: regionScopes.map(mapPromoRegionForShared),
    productScopes: productScopes.map(mapPromoProductForShared),
    compatibility: compatibility.map(mapPromoCompatibilityForShared),
  };
  const result = evaluatePromos(
    options.selectedCodes
      ? { ...evaluationInput, selectedCodes: options.selectedCodes }
      : evaluationInput,
  );

  if (
    options.selectedCodes &&
    normalizePromoCodes(options.selectedCodes).join("|") !==
      normalizePromoCodes(result.selectedSet).join("|")
  ) {
    throw new Error("Selected promo set is not eligible");
  }

  const createdAt = resolveNow(input.now);
  const evaluation: CheckoutPromoEvaluationRow = {
    id: input.createPromoEvaluationId(),
    profile_id: draft.profile_id,
    market_id: draft.market_id,
    checkout_draft_id: draft.id,
    order_id: options.orderId ?? null,
    evaluation_context_json: {
      fulfillment_mode: draft.fulfillment_mode,
      manual_codes: options.manualCodes,
      selected_codes: options.selectedCodes ?? [],
      destination: resolvePromoDestination(draft),
      merchandise_subtotal_minor: merchandiseSubtotalMinor,
      shipping_minor: shippingAmountMinor,
    },
    matched_promos_json: result.matchedPromos,
    rejected_promos_json: result.rejectedPromos.map(mapRejectedPromoDto),
    candidate_sets_json: result.candidateSets.map(mapCandidateSetDto),
    recommended_set_json: result.recommendedSet,
    selected_set_json: result.selectedSet,
    merchandise_discount_minor: result.merchandiseDiscountMinor,
    taxable_subtotal_minor: result.taxableSubtotalMinor,
    final_total_minor: result.finalTotalMinor,
    created_at: createdAt,
  };
  const lines = buildPromoEvaluationLines(input, {
    evaluationId: evaluation.id,
    result,
    promoRules,
    productScopes,
    promoLines,
  });

  return input.dataSource.createPromoEvaluation(evaluation, lines);
}

async function resolveDraftItems(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
): Promise<readonly CheckoutCartItemRow[]> {
  const pendingOrder = await resolveMarkedPendingResumeOrder(input, draft);
  if (!pendingOrder) {
    return input.dataSource.listCartItems(draft.cart_id);
  }
  return mapResumeOrderItemsToDraftItems(
    draft,
    await input.dataSource.listResumeOrderItems(pendingOrder.id),
  );
}

async function resolveMarkedPendingResumeOrder(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
): Promise<CheckoutResumeOrderRow | null> {
  const pendingOrder =
    await input.dataSource.getPendingResumeOrderByCheckoutDraftId(draft.id);
  if (!pendingOrder) {
    return null;
  }
  const resumeMarkers = [
    draft.delivery_state_json.pending_order_resume_id,
    draft.pickup_state_json.pending_order_resume_id,
  ];
  return resumeMarkers.includes(pendingOrder.id) ? pendingOrder : null;
}

function mapResumeOrderItemsToDraftItems(
  draft: CheckoutDraftRow,
  items: readonly CheckoutResumeOrderItemRow[],
): readonly CheckoutCartItemRow[] {
  return items.map((item) => ({
    id: item.id,
    cart_id: draft.cart_id,
    product_id: item.product_id,
    product_name: item.product_name_snapshot,
    product_image_path: item.product_image_url_snapshot ?? null,
    category_id: item.category_id,
    quantity: item.quantity,
    unit_price_minor_snapshot: item.unit_price_minor,
  }));
}

async function resolveSelectedShippingAmountMinor(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
): Promise<number> {
  if (
    draft.fulfillment_mode !== "delivery" ||
    !draft.delivery_state_json.shipping_address ||
    !draft.delivery_state_json.selected_shipping_option_id
  ) {
    return 0;
  }
  const shippingOptions = await listEligibleShippingOptions(
    input,
    draft,
    addressJsonToInput(draft.delivery_state_json.shipping_address),
  );
  return (
    shippingOptions.find(
      (option) =>
        option.id === draft.delivery_state_json.selected_shipping_option_id,
    )?.amount_minor ?? 0
  );
}

async function buildPromoLines(
  input: CheckoutRepositoryDependencies,
  draft: CheckoutDraftRow,
  cartItems: readonly CheckoutCartItemRow[],
): Promise<readonly PromoLineInput[]> {
  if (
    draft.fulfillment_mode !== "pickup" ||
    !draft.pickup_state_json.selected_store_id
  ) {
    return cartItems.map((item) => ({
      productId: item.product_id,
      categoryId: item.category_id,
      subtotalMinor: multiplyMinor(
        item.unit_price_minor_snapshot,
        item.quantity,
      ),
    }));
  }

  const inventory = await input.dataSource.listStoreInventory(
    draft.pickup_state_json.selected_store_id,
  );
  const split = calculatePickupInventorySplit({
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
  });
  const cartItemByProductId = new Map(
    cartItems.map((item) => [item.product_id, item]),
  );

  return split.readyItems
    .filter((item) => item.fulfillableQuantity > 0)
    .map((item) => {
      const cartItem = cartItemByProductId.get(item.productId);
      if (!cartItem) {
        throw new Error(`Pickup promo item ${item.productId} was not found`);
      }
      return {
        productId: item.productId,
        categoryId: cartItem.category_id,
        subtotalMinor: item.payableSubtotalMinor,
      };
    });
}

function resolvePromoDestination(draft: CheckoutDraftRow): {
  readonly countryCode: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postalCode: string | null;
} {
  if (draft.fulfillment_mode === "pickup") {
    const pickupLocation = draft.pickup_state_json.location;
    const billingAddress = draft.pickup_state_json.billing_address;
    return {
      countryCode:
        pickupLocation?.country_code ??
        billingAddress?.country_code ??
        draft.buyer_country,
      state: pickupLocation?.state ?? billingAddress?.state ?? null,
      county: pickupLocation?.county ?? billingAddress?.county ?? null,
      postalCode:
        pickupLocation?.postal_code ?? billingAddress?.postal_code ?? null,
    };
  }

  const shippingAddress = draft.delivery_state_json.shipping_address;
  return {
    countryCode: shippingAddress?.country_code ?? draft.buyer_country,
    state: shippingAddress?.state ?? null,
    county: shippingAddress?.county ?? null,
    postalCode: shippingAddress?.postal_code ?? null,
  };
}

function buildPromoEvaluationLines(
  input: CheckoutRepositoryDependencies,
  options: {
    readonly evaluationId: string;
    readonly result: PromoEvaluationResult;
    readonly promoRules: readonly CheckoutPromoRuleRow[];
    readonly productScopes: readonly CheckoutPromoRuleProductRow[];
    readonly promoLines: readonly PromoLineInput[];
  },
): readonly CheckoutPromoEvaluationLineRow[] {
  const rows: CheckoutPromoEvaluationLineRow[] = [];
  const selectedCodes = new Set(options.result.selectedSet);
  const recommendedCodes = new Set(options.result.recommendedSet);
  const ruleByCode = new Map(
    options.promoRules.map((rule) => [rule.code, rule]),
  );
  const pushLine = (
    code: string,
    status: CheckoutPromoEvaluationLineRow["evaluation_status"],
    rejectionReason: string | null,
    sortOrder: number,
  ) => {
    const rule = ruleByCode.get(code) ?? null;
    const discountMinor =
      rule && status !== "rejected"
        ? calculateRuleDiscountMinor(
            rule,
            options.productScopes,
            options.promoLines,
          )
        : 0;
    rows.push({
      id: input.createPromoEvaluationLineId(),
      promo_evaluation_id: options.evaluationId,
      promo_rule_id: rule?.id ?? null,
      code_snapshot: code,
      evaluation_status: status,
      rejection_reason: rejectionReason,
      stack_group:
        status === "selected" ? options.result.selectedSet.join("+") : null,
      discount_minor: discountMinor,
      taxable_subtotal_effect_minor: discountMinor,
      final_total_effect_minor: discountMinor,
      explanation:
        status === "rejected"
          ? `Rejected because ${rejectionReason ?? "not eligible"}`
          : `Promo ${code} is ${status}`,
      sort_order: sortOrder,
    });
  };

  options.result.selectedSet.forEach((code, index) => {
    pushLine(code, "selected", null, index);
  });
  options.result.recommendedSet
    .filter((code) => !selectedCodes.has(code))
    .forEach((code, index) => {
      pushLine(code, "recommended", null, rows.length + index);
    });
  options.result.matchedPromos
    .filter((code) => !selectedCodes.has(code) && !recommendedCodes.has(code))
    .forEach((code, index) => {
      pushLine(code, "candidate", null, rows.length + index);
    });
  options.result.rejectedPromos.forEach((promo, index) => {
    pushLine(promo.code, "rejected", promo.reason, rows.length + index);
  });

  return rows;
}

function calculateRuleDiscountMinor(
  rule: CheckoutPromoRuleRow,
  productScopes: readonly CheckoutPromoRuleProductRow[],
  promoLines: readonly PromoLineInput[],
): number {
  const includeScopes = productScopes.filter(
    (scope) =>
      scope.promo_rule_id === rule.id && scope.include_exclude === "include",
  );
  const discountBaseMinor =
    includeScopes.length === 0
      ? promoLines.reduce((sum, line) => sum + line.subtotalMinor, 0)
      : promoLines.reduce(
          (sum, line) =>
            includeScopes.some(
              (scope) =>
                scope.product_id === line.productId ||
                scope.category_id === line.categoryId,
            )
              ? sum + line.subtotalMinor
              : sum,
          0,
        );

  return rule.discount_type === "percent"
    ? Math.round((discountBaseMinor * rule.discount_value) / 10_000)
    : Math.min(rule.discount_value, discountBaseMinor);
}

function normalizePromoCodes(codes: readonly string[]): string[] {
  return codes.map((code) => code.toUpperCase()).sort();
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
  promoDiscountMinor: number,
  cartItems: readonly CheckoutCartItemRow[],
): Promise<number> {
  const taxRates = await input.dataSource.listTaxRates(draft.market_id);
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
    promoDiscountMinor,
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

function mapPromoRuleForShared(rule: CheckoutPromoRuleRow): PromoRuleRow {
  return {
    id: rule.id,
    code: rule.code,
    promoType: rule.promo_type,
    discountType: rule.discount_type,
    discountValue: rule.discount_value,
    minMerchandiseSubtotalMinor: rule.min_merchandise_subtotal_minor,
    startsAt: rule.starts_at,
    endsAt: rule.ends_at,
    isStackable: rule.is_stackable,
    priority: rule.priority,
    isActive: rule.is_active,
  };
}

function mapPromoRegionForShared(
  region: CheckoutPromoRuleRegionRow,
): PromoRuleRegionRow {
  return {
    promoRuleId: region.promo_rule_id,
    countryCode: region.country_code,
    state: region.state,
    county: region.county,
    postalCodePrefix: region.postal_code_prefix,
    includeExclude: region.include_exclude,
  };
}

function mapPromoProductForShared(
  product: CheckoutPromoRuleProductRow,
): PromoRuleProductRow {
  return {
    promoRuleId: product.promo_rule_id,
    productId: product.product_id,
    categoryId: product.category_id,
    includeExclude: product.include_exclude,
  };
}

function mapPromoCompatibilityForShared(
  compatibility: CheckoutPromoCompatibilityRow,
): PromoCompatibilityRow {
  return {
    promoRuleId: compatibility.promo_rule_id,
    compatiblePromoRuleId: compatibility.compatible_promo_rule_id,
    compatibility: compatibility.compatibility,
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

function mapDraftPromoDto(
  evaluation: CheckoutPromoEvaluationRow | null,
): CatalogJson {
  if (!evaluation) {
    return {
      status: "pending",
      recommended_codes: [],
      selected_codes: [],
    };
  }
  const evaluationDto = mapPromoEvaluationDto(evaluation) as {
    readonly [key: string]: CatalogJson;
  };

  return {
    status: "selected",
    ...evaluationDto,
    recommended_codes: evaluation.recommended_set_json,
    selected_codes: evaluation.selected_set_json,
  };
}

function mapPromoEvaluationDto(
  evaluation: CheckoutPromoEvaluationRow,
): CatalogJson {
  return {
    evaluation_id: evaluation.id,
    recommended_set: evaluation.recommended_set_json,
    selected_set: evaluation.selected_set_json,
    candidate_sets: evaluation.candidate_sets_json,
    rejected: evaluation.rejected_promos_json,
    merchandise_discount_minor: evaluation.merchandise_discount_minor,
    taxable_subtotal_minor: evaluation.taxable_subtotal_minor,
    final_total_minor: evaluation.final_total_minor,
  };
}

function mapCandidateSetDto(candidate: PromoCandidateSet): CatalogJson {
  return {
    codes: candidate.codes,
    discount_minor: candidate.discountMinor,
    taxable_subtotal_minor: candidate.taxableSubtotalMinor,
    final_total_minor: candidate.finalTotalMinor,
    recommended: candidate.recommended,
  };
}

function mapRejectedPromoDto(rejected: PromoRejectedResult): CatalogJson {
  return {
    code: rejected.code,
    reason: rejected.reason,
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

function normalizePickupDatesForCheckout(
  rows: readonly CheckoutPickupDateRow[],
  now: RepositoryNow | undefined,
): readonly CheckoutPickupDateRow[] {
  if (!rows.length) {
    return rows;
  }

  const today = formatDateOnly(resolveNow(now));
  const currentOrFutureRows = rows.filter((row) => row.pickup_date >= today);

  if (currentOrFutureRows.length) {
    return currentOrFutureRows;
  }

  return rows.map((row, index) => ({
    ...row,
    pickup_date: addDaysDateOnly(today, index),
  }));
}

function formatDateOnly(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function addDaysDateOnly(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function addMillisecondsToIso(value: string, milliseconds: number): string {
  return new Date(new Date(value).getTime() + milliseconds).toISOString();
}

function defaultCheckoutDraftId(): string {
  return randomUUID();
}

function defaultPromoEvaluationId(): string {
  return randomUUID();
}

function defaultPromoEvaluationLineId(): string {
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
  readonly in: (
    column: string,
    values: readonly SupabasePrimitive[],
  ) => SupabaseCheckoutQuery;
  readonly or: (filters: string) => SupabaseCheckoutQuery;
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

const resumeOrderColumns = [
  "id",
  "profile_id",
  "market_id",
  "order_number",
  "auth_user_id",
  "checkout_draft_id",
  "fulfillment_mode",
  "status",
  "currency_code",
  "locale",
  "buyer_country",
  "sandbox_test_buyer_country",
].join(", ");

const resumePaymentSessionColumns = [
  "id",
  "order_id",
  "status",
  "attempt_number",
  "paypal_invoice_id",
].join(", ");

const promoEvaluationColumns = [
  "id",
  "profile_id",
  "market_id",
  "checkout_draft_id",
  "order_id",
  "evaluation_context_json",
  "matched_promos_json",
  "rejected_promos_json",
  "candidate_sets_json",
  "recommended_set_json",
  "selected_set_json",
  "merchandise_discount_minor",
  "taxable_subtotal_minor",
  "final_total_minor",
  "created_at",
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
    async getMarketById(id) {
      return queryOne<CheckoutMarketRow>(
        supabase
          .from("markets")
          .select(
            "id, code, currency_code, locale, buyer_country, sandbox_test_buyer_country",
          )
          .eq("id", id)
          .maybeSingle(),
        `Load market ${id}`,
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
      const cartItems = await queryMany<
        Omit<CheckoutCartItemRow, "category_id" | "product_name">
      >(
        supabase
          .from("cart_items")
          .select(
            "id, cart_id, product_id, quantity, unit_price_minor_snapshot",
          )
          .eq("cart_id", cartId),
        `List checkout cart items ${cartId}`,
      );
      if (cartItems.length === 0) {
        return [];
      }
      const productRows = await queryMany<{
        readonly id: string;
        readonly category_id: string;
        readonly name: string;
      }>(
        supabase
          .from("products")
          .select("id, category_id, name")
          .in(
            "id",
            cartItems.map((item) => item.product_id),
          ),
        `List checkout cart product categories ${cartId}`,
      );
      const productImageRows = await queryMany<{
        readonly product_id: string;
        readonly image_path: string;
        readonly sort_order: number;
      }>(
        supabase
          .from("product_images")
          .select("product_id, image_path, sort_order")
          .in(
            "product_id",
            cartItems.map((item) => item.product_id),
          )
          .order("sort_order", { ascending: true }),
        `List checkout cart product images ${cartId}`,
      );
      const productById = new Map(
        productRows.map((product) => [product.id, product]),
      );
      const firstImageByProductId = new Map<
        string,
        (typeof productImageRows)[number]
      >();
      for (const image of productImageRows) {
        const existing = firstImageByProductId.get(image.product_id);
        if (!existing || image.sort_order < existing.sort_order) {
          firstImageByProductId.set(image.product_id, image);
        }
      }

      return cartItems.map((item) => ({
        ...item,
        category_id: productById.get(item.product_id)?.category_id ?? "",
        product_name: productById.get(item.product_id)?.name ?? "Cart item",
        product_image_path:
          firstImageByProductId.get(item.product_id)?.image_path ?? null,
      }));
    },
    async getResumeOrderForUser(input) {
      return queryOne<CheckoutResumeOrderRow>(
        supabase
          .from("orders")
          .select(resumeOrderColumns)
          .eq("auth_user_id", input.authUserId)
          .eq("order_number", input.orderNumber)
          .maybeSingle(),
        `Load pending order ${input.orderNumber} for resume`,
      );
    },
    async claimPendingOrderResume(input) {
      return queryOne<CheckoutResumeOrderRow>(
        supabase
          .from("orders")
          .update({
            operation_lock_kind: "resume",
            operation_lock_token: input.lockToken,
            operation_lock_expires_at: input.lockExpiresAt,
          })
          .eq("id", input.orderId)
          .eq("auth_user_id", input.authUserId)
          .eq("status", "pending")
          .or(
            `operation_lock_token.is.null,operation_lock_expires_at.lt.${input.lockAcquiredAt}`,
          )
          .select(resumeOrderColumns)
          .maybeSingle(),
        `Claim pending order ${input.orderId} for resume`,
      );
    },
    async releasePendingOrderResume(input) {
      await queryMany<{ readonly id: string }>(
        supabase
          .from("orders")
          .update({
            operation_lock_kind: null,
            operation_lock_token: null,
            operation_lock_expires_at: null,
          })
          .eq("id", input.orderId)
          .eq("operation_lock_kind", "resume")
          .eq("operation_lock_token", input.lockToken)
          .select("id"),
        `Release pending order ${input.orderId} resume claim`,
      );
    },
    async getPendingResumeOrderByCheckoutDraftId(checkoutDraftId) {
      return queryOne<CheckoutResumeOrderRow>(
        supabase
          .from("orders")
          .select(resumeOrderColumns)
          .eq("checkout_draft_id", checkoutDraftId)
          .eq("status", "pending")
          .maybeSingle(),
        `Load pending order for checkout draft ${checkoutDraftId}`,
      );
    },
    async listResumeOrderItems(orderId) {
      const orderItems = await queryMany<
        Omit<CheckoutResumeOrderItemRow, "category_id">
      >(
        supabase
          .from("order_items")
          .select(
            "id, order_id, product_id, product_name_snapshot, product_image_url_snapshot, quantity, unit_price_minor",
          )
          .eq("order_id", orderId),
        `List resume order items ${orderId}`,
      );
      if (orderItems.length === 0) {
        return [];
      }
      const productRows = await queryMany<{
        readonly id: string;
        readonly category_id: string;
      }>(
        supabase
          .from("products")
          .select("id, category_id")
          .in(
            "id",
            orderItems.map((item) => item.product_id),
          ),
        `List resume order product categories ${orderId}`,
      );
      const categoryByProductId = new Map(
        productRows.map((product) => [product.id, product.category_id]),
      );
      return orderItems.map((item) => ({
        ...item,
        category_id: categoryByProductId.get(item.product_id) ?? "",
      }));
    },
    async listResumePaymentSessions(orderId) {
      return queryMany<CheckoutResumePaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(resumePaymentSessionColumns)
          .eq("order_id", orderId),
        `List resume payment sessions ${orderId}`,
      );
    },
    async listCentralInventory(input) {
      if (input.productIds.length === 0) {
        return [];
      }
      return queryMany<CheckoutCentralInventoryRow>(
        supabase
          .from("central_inventory")
          .select("profile_id, market_id, product_id, available_quantity")
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId)
          .in("product_id", input.productIds),
        "List central inventory for pending resume",
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
    async listStoresByMarket(marketId) {
      return queryMany<CheckoutStoreRow>(
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
          .eq("market_id", marketId)
          .eq("is_active", true)
          .order("name", { ascending: true }),
        `List pickup stores ${marketId}`,
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
    async listPromoRules(input) {
      return queryMany<CheckoutPromoRuleRow>(
        supabase
          .from("promo_rules")
          .select(
            [
              "id",
              "profile_id",
              "market_id",
              "code",
              "promo_type",
              "discount_type",
              "discount_value",
              "min_merchandise_subtotal_minor",
              "starts_at",
              "ends_at",
              "is_stackable",
              "priority",
              "is_active",
            ].join(", "),
          )
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List promo rules",
      );
    },
    async listPromoRuleRegions(input) {
      return queryMany<CheckoutPromoRuleRegionRow>(
        supabase
          .from("promo_rule_regions")
          .select(
            "promo_rule_id, country_code, state, county, postal_code_prefix, include_exclude",
          )
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List promo rule regions",
      );
    },
    async listPromoRuleProducts(input) {
      return queryMany<CheckoutPromoRuleProductRow>(
        supabase
          .from("promo_rule_products")
          .select("promo_rule_id, product_id, category_id, include_exclude")
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List promo rule products",
      );
    },
    async listPromoCompatibility(input) {
      return queryMany<CheckoutPromoCompatibilityRow>(
        supabase
          .from("promo_compatibility")
          .select("promo_rule_id, compatible_promo_rule_id, compatibility")
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List promo compatibility",
      );
    },
    async getPromoEvaluationById(id) {
      return queryOne<CheckoutPromoEvaluationRow>(
        supabase
          .from("promo_evaluations")
          .select(promoEvaluationColumns)
          .eq("id", id)
          .maybeSingle(),
        `Load promo evaluation ${id}`,
      );
    },
    async createPromoEvaluation(evaluation, lines) {
      const createdEvaluation = await queryRequired<CheckoutPromoEvaluationRow>(
        supabase
          .from("promo_evaluations")
          .insert({
            id: evaluation.id,
            profile_id: evaluation.profile_id,
            market_id: evaluation.market_id,
            checkout_draft_id: evaluation.checkout_draft_id,
            order_id: evaluation.order_id,
            evaluation_context_json: evaluation.evaluation_context_json,
            matched_promos_json: evaluation.matched_promos_json,
            rejected_promos_json: evaluation.rejected_promos_json,
            candidate_sets_json: evaluation.candidate_sets_json,
            recommended_set_json: evaluation.recommended_set_json,
            selected_set_json: evaluation.selected_set_json,
            merchandise_discount_minor: evaluation.merchandise_discount_minor,
            taxable_subtotal_minor: evaluation.taxable_subtotal_minor,
            final_total_minor: evaluation.final_total_minor,
            created_at: evaluation.created_at,
          })
          .select(promoEvaluationColumns)
          .single(),
        "Create promo evaluation",
      );

      if (lines.length > 0) {
        await queryMany<CheckoutPromoEvaluationLineRow>(
          supabase
            .from("promo_evaluation_lines")
            .insert(
              lines.map((line) => ({
                id: line.id,
                promo_evaluation_id: line.promo_evaluation_id,
                promo_rule_id: line.promo_rule_id,
                code_snapshot: line.code_snapshot,
                evaluation_status: line.evaluation_status,
                rejection_reason: line.rejection_reason,
                stack_group: line.stack_group,
                discount_minor: line.discount_minor,
                taxable_subtotal_effect_minor:
                  line.taxable_subtotal_effect_minor,
                final_total_effect_minor: line.final_total_effect_minor,
                explanation: line.explanation,
                sort_order: line.sort_order,
              })),
            )
            .select("id"),
          "Create promo evaluation lines",
        );
      }

      return createdEvaluation;
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

import { createHash, randomUUID } from "node:crypto";

import { calculatePickupInventorySplit } from "../../../shared/src/inventory.js";
import {
  addMinor,
  assertMinorUnit,
  multiplyMinor,
  subtractMinor,
} from "../../../shared/src/money.js";
import {
  formatOrderNumber,
  orderNumberPrefixForFulfillment,
  type FulfillmentMode,
  type OrderNumberPrefix,
} from "../../../shared/src/orderNumbers.js";
import {
  buildSanitizedPayPalOrderSnapshot,
  guardPayPalCaptureAmountConsistency,
  planPayPalRequestMetadata,
  type PayPalCaptureAmountGuardResult,
  type PayPalCaptureAmountSnapshot,
  type PayPalCurrencyCode,
  type PayPalOrderLineItemInput,
  type PayPalPaymentMethod,
  type PreviousPayPalRequestMetadata,
} from "../../../shared/src/paypal.js";
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
  HandlePayPalShippingCallbackInput,
  PayPalCreateOrderOperationContext,
  PayPalShippingCallbackDeclineIssue,
  PayPalShippingCallbackResult,
  PayPalOrderPreparationRepository,
  PayPalOrderKind,
  PreparePayPalCreateOrderInput,
  RecordPayPalCaptureResultInput,
  PreparedPayPalCapture,
} from "../routes/paypal.js";
import type { CatalogJson } from "../routes/catalog.js";

type RepositoryNow = Date | string | (() => Date | string);

export interface PayPalOrderProfileRow {
  readonly id: string;
  readonly slug: string;
}

export interface PayPalOrderMarketRow {
  readonly id: string;
  readonly code: string;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
}

export interface PayPalOrderCartRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly auth_user_id: string | null;
  readonly cart_public_id: string;
  readonly cart_secret_hash: string | null;
  readonly status: "active" | "merged" | "abandoned" | "converted";
}

export interface PayPalOrderCartItemRow {
  readonly id: string;
  readonly cart_id: string;
  readonly product_id: string;
  readonly quantity: number;
  readonly unit_price_minor_snapshot: number;
}

export interface PayPalOrderAddressJson {
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

export interface PayPalOrderDeliveryStateJson {
  readonly shipping_address?: PayPalOrderAddressJson | null;
  readonly billing_address?: PayPalOrderAddressJson | null;
  readonly same_as_shipping?: boolean;
  readonly selected_shipping_option_id?: string | null;
}

export interface PayPalOrderPickupStateJson {
  readonly billing_address?: PayPalOrderAddressJson | null;
  readonly selected_store_id?: string | null;
  readonly selected_pickup_date?: string | null;
}

export interface PayPalOrderCheckoutDraftRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly cart_id: string;
  readonly auth_user_id: string | null;
  readonly guest_email: string | null;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly delivery_state_json: PayPalOrderDeliveryStateJson;
  readonly pickup_state_json: PayPalOrderPickupStateJson;
  readonly selected_promo_evaluation_id: string | null;
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
  readonly status: "draft" | "payment_started" | "converted" | "abandoned";
}

export interface PayPalOrderProductSnapshotRow {
  readonly id: string;
  readonly slug: string;
  readonly sku: string;
  readonly category_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly image_path: string | null;
}

export interface PayPalOrderShippingOptionRow {
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

export interface PayPalOrderTaxRateRow {
  readonly id: string;
  readonly market_id: string;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code_prefix: string | null;
  readonly rate_bps: number;
  readonly is_active: boolean;
}

export interface PayPalOrderStoreRow {
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

export interface PayPalOrderStoreInventoryRow {
  readonly store_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
}

export interface PayPalOrderCentralInventoryRow {
  readonly profile_id: string;
  readonly market_id: string;
  readonly product_id: string;
  readonly available_quantity: number;
}

export interface PayPalOrderPromoEvaluationRow {
  readonly id: string;
  readonly merchandise_discount_minor: number;
  readonly selected_set_json: readonly string[];
}

export interface PayPalOrderPromoRuleRow {
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

export interface PayPalOrderPromoRuleRegionRow {
  readonly promo_rule_id: string;
  readonly country_code: string;
  readonly state: string | null;
  readonly county: string | null;
  readonly postal_code_prefix: string | null;
  readonly include_exclude: "include" | "exclude";
}

export interface PayPalOrderPromoRuleProductRow {
  readonly promo_rule_id: string;
  readonly product_id: string | null;
  readonly category_id: string | null;
  readonly include_exclude: "include" | "exclude";
}

export interface PayPalOrderPromoCompatibilityRow {
  readonly promo_rule_id: string;
  readonly compatible_promo_rule_id: string;
  readonly compatibility: "compatible" | "exclusive";
}

export interface PayPalOrderPromoEvaluationWriteRow extends PayPalOrderPromoEvaluationRow {
  readonly profile_id: string;
  readonly market_id: string;
  readonly checkout_draft_id: string | null;
  readonly order_id: string | null;
  readonly evaluation_context_json: CatalogJson;
  readonly matched_promos_json: readonly string[];
  readonly rejected_promos_json: readonly CatalogJson[];
  readonly candidate_sets_json: readonly CatalogJson[];
  readonly recommended_set_json: readonly string[];
  readonly taxable_subtotal_minor: number;
  readonly final_total_minor: number;
  readonly created_at: string;
}

export interface PayPalOrderPromoEvaluationLineRow {
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

export interface PayPalOrderRow {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly order_number: string;
  readonly order_number_prefix: OrderNumberPrefix;
  readonly order_number_sequence: number;
  readonly auth_user_id: string | null;
  readonly guest_email: string | null;
  readonly cart_id: string | null;
  readonly checkout_draft_id: string | null;
  readonly fulfillment_mode: FulfillmentMode;
  readonly status:
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "preparing_pickup"
    | "ready_for_pickup"
    | "picked_up"
    | "cancelled";
  readonly payment_status:
    | "not_started"
    | "started"
    | "approved"
    | "captured"
    | "failed"
    | "cancelled";
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
}

export interface PayPalOrderItemWriteInput {
  readonly id: string;
  readonly order_id: string;
  readonly product_id: string;
  readonly product_sku_snapshot: string;
  readonly product_name_snapshot: string;
  readonly product_description_snapshot: string | null;
  readonly product_url_snapshot: string | null;
  readonly product_image_url_snapshot: string | null;
  readonly unit_price_minor: number;
  readonly quantity: number;
  readonly fulfillable_quantity: number;
  readonly unavailable_quantity: number;
  readonly line_subtotal_minor: number;
  readonly line_discount_minor: number;
  readonly line_tax_minor: number;
  readonly line_total_minor: number;
}

export interface PayPalOrderAddressWriteInput {
  readonly id: string;
  readonly order_id: string;
  readonly address_type: "shipping" | "billing" | "pickup_store";
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
}

export interface PayPalOrderPaymentSessionRow {
  readonly id: string;
  readonly order_id: string;
  readonly provider: "paypal";
  readonly method: PayPalPaymentMethod;
  readonly status:
    | "created"
    | "approved"
    | "captured"
    | "failed"
    | "cancelled"
    | "expired";
  readonly attempt_number: number;
  readonly paypal_order_id: string | null;
  readonly paypal_capture_id: string | null;
  readonly paypal_invoice_id: string | null;
  readonly paypal_request_id: string | null;
  readonly vault_requested: boolean;
  readonly merchant_total_minor: number;
  readonly provider_total_minor: number | null;
  readonly amount_consistency_status:
    | "not_checked"
    | "matched"
    | "mismatch"
    | "tolerance";
  readonly currency_code: string;
  readonly locale: string;
  readonly buyer_country: string;
  readonly sandbox_test_buyer_country: string | null;
  readonly paypal_config_snapshot_json: CatalogJson;
}

export interface PayPalOrderTotalSnapshotRow {
  readonly id: string;
  readonly checkout_draft_id: string | null;
  readonly order_id: string;
  readonly payment_session_id: string | null;
  readonly fulfillment_mode: FulfillmentMode;
  readonly calculation_stage:
    | "checkout_draft"
    | "paypal_shipping_update"
    | "review_confirm"
    | "capture"
    | "pending_resume";
  readonly currency_code: string;
  readonly merchandise_subtotal_minor: number;
  readonly product_discount_minor: number;
  readonly promo_discount_minor: number;
  readonly taxable_subtotal_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
  readonly promo_evaluation_id: string | null;
  readonly calculation_context_json: CatalogJson;
}

export interface PayPalOrderLifecycleEventRow {
  readonly id: string;
  readonly order_id: string;
  readonly from_status: PayPalOrderRow["status"] | null;
  readonly to_status: PayPalOrderRow["status"];
  readonly actor_type: "system" | "admin" | "webhook";
  readonly note: string | null;
  readonly created_at: string;
}

export interface UpdateCheckoutDraftStatusInput {
  readonly draftId: string;
  readonly status: "payment_started";
  readonly updatedAt: string;
}

export interface PayPalOrderDataSource {
  readonly getProfileBySlug: (
    slug: string,
  ) => Promise<PayPalOrderProfileRow | null>;
  readonly getProfileById: (
    id: string,
  ) => Promise<PayPalOrderProfileRow | null>;
  readonly getMarketByCode: (
    code: string,
  ) => Promise<PayPalOrderMarketRow | null>;
  readonly getMarketById: (id: string) => Promise<PayPalOrderMarketRow | null>;
  readonly getCheckoutDraftById: (
    id: string,
  ) => Promise<PayPalOrderCheckoutDraftRow | null>;
  readonly findActiveGuestCart: (
    cartPublicId: string,
  ) => Promise<PayPalOrderCartRow | null>;
  readonly findActiveSignedInCart: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly authUserId: string;
  }) => Promise<PayPalOrderCartRow | null>;
  readonly listCartItems: (
    cartId: string,
  ) => Promise<readonly PayPalOrderCartItemRow[]>;
  readonly listProductSnapshots: (
    profileId: string,
    productIds: readonly string[],
  ) => Promise<readonly PayPalOrderProductSnapshotRow[]>;
  readonly listShippingOptions: (
    marketId: string,
  ) => Promise<readonly PayPalOrderShippingOptionRow[]>;
  readonly listTaxRates: (
    marketId: string,
  ) => Promise<readonly PayPalOrderTaxRateRow[]>;
  readonly getStoreById: (
    storeId: string,
  ) => Promise<PayPalOrderStoreRow | null>;
  readonly listStoreInventory: (
    storeId: string,
  ) => Promise<readonly PayPalOrderStoreInventoryRow[]>;
  readonly getPromoEvaluationById: (
    id: string,
  ) => Promise<PayPalOrderPromoEvaluationRow | null>;
  readonly listPromoRules: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly PayPalOrderPromoRuleRow[]>;
  readonly listPromoRuleRegions: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly PayPalOrderPromoRuleRegionRow[]>;
  readonly listPromoRuleProducts: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly PayPalOrderPromoRuleProductRow[]>;
  readonly listPromoCompatibility: (input: {
    readonly profileId: string;
    readonly marketId: string;
  }) => Promise<readonly PayPalOrderPromoCompatibilityRow[]>;
  readonly createPromoEvaluation: (
    evaluation: PayPalOrderPromoEvaluationWriteRow,
    lines: readonly PayPalOrderPromoEvaluationLineRow[],
  ) => Promise<PayPalOrderPromoEvaluationWriteRow>;
  readonly findPendingOrderByCheckoutDraftId: (
    checkoutDraftId: string,
    fulfillmentMode: FulfillmentMode,
  ) => Promise<PayPalOrderRow | null>;
  readonly findPendingOrderByCartId: (
    cartId: string,
    fulfillmentMode: FulfillmentMode,
  ) => Promise<PayPalOrderRow | null>;
  readonly getOrderById: (id: string) => Promise<PayPalOrderRow | null>;
  readonly listOrderItems: (
    orderId: string,
  ) => Promise<readonly PayPalOrderItemWriteInput[]>;
  readonly getNextOrderSequence: (input: {
    readonly prefix: OrderNumberPrefix;
    readonly date: string;
  }) => Promise<number>;
  readonly createOrder: (order: PayPalOrderRow) => Promise<PayPalOrderRow>;
  readonly updateOrder: (
    orderId: string,
    patch: Partial<PayPalOrderRow>,
  ) => Promise<PayPalOrderRow>;
  readonly replaceOrderItems: (
    orderId: string,
    items: readonly PayPalOrderItemWriteInput[],
  ) => Promise<void>;
  readonly replaceOrderAddresses: (
    orderId: string,
    addresses: readonly PayPalOrderAddressWriteInput[],
  ) => Promise<void>;
  readonly createPaymentSession: (
    session: PayPalOrderPaymentSessionRow,
  ) => Promise<PayPalOrderPaymentSessionRow>;
  readonly listPaymentSessions: (
    orderId: string,
  ) => Promise<readonly PayPalOrderPaymentSessionRow[]>;
  readonly getPaymentSessionById: (
    id: string,
  ) => Promise<PayPalOrderPaymentSessionRow | null>;
  readonly getPaymentSessionByPayPalOrderId: (
    paypalOrderId: string,
  ) => Promise<PayPalOrderPaymentSessionRow | null>;
  readonly updatePaymentSession: (
    paymentSessionId: string,
    patch: Partial<PayPalOrderPaymentSessionRow>,
  ) => Promise<PayPalOrderPaymentSessionRow>;
  readonly createTotalSnapshot: (
    snapshot: PayPalOrderTotalSnapshotRow,
  ) => Promise<void>;
  readonly createPayPalOrderSnapshot: (
    snapshot: ReturnType<typeof buildSanitizedPayPalOrderSnapshot>,
  ) => Promise<void>;
  readonly createOrderLifecycleEvent: (
    event: PayPalOrderLifecycleEventRow,
  ) => Promise<void>;
  readonly deleteCartItemsByProductIds: (input: {
    readonly cartId: string;
    readonly productIds: readonly string[];
  }) => Promise<void>;
  readonly decrementCentralInventory: (input: {
    readonly profileId: string;
    readonly marketId: string;
    readonly productId: string;
    readonly quantity: number;
  }) => Promise<void>;
  readonly decrementStoreInventory: (input: {
    readonly storeId: string;
    readonly productId: string;
    readonly quantity: number;
  }) => Promise<void>;
  readonly updateCheckoutDraftStatus: (
    input: UpdateCheckoutDraftStatusInput,
  ) => Promise<void>;
}

export interface CreateSupabasePayPalOrderRepositoryInput {
  readonly dataSource: PayPalOrderDataSource;
  readonly publicApiBaseUrl: string;
  readonly now?: RepositoryNow;
  readonly createOrderId?: () => string;
  readonly createPaymentSessionId?: () => string;
  readonly createOrderItemId?: () => string;
  readonly createOrderAddressId?: () => string;
  readonly createTotalSnapshotId?: () => string;
  readonly createPromoEvaluationId?: () => string;
  readonly createPromoEvaluationLineId?: () => string;
  readonly createOrderLifecycleEventId?: () => string;
  readonly createPayPalRequestId?: () => string;
  readonly hashCartClientSecret?: (secret: string) => string;
}

interface PayPalOrderRepositoryDependencies {
  readonly dataSource: PayPalOrderDataSource;
  readonly publicApiBaseUrl: string;
  readonly now?: RepositoryNow;
  readonly createOrderId: () => string;
  readonly createPaymentSessionId: () => string;
  readonly createOrderItemId: () => string;
  readonly createOrderAddressId: () => string;
  readonly createTotalSnapshotId: () => string;
  readonly createPromoEvaluationId: () => string;
  readonly createPromoEvaluationLineId: () => string;
  readonly createOrderLifecycleEventId: () => string;
  readonly createPayPalRequestId: () => string;
  readonly hashCartClientSecret: (secret: string) => string;
}

interface StorefrontRows {
  readonly profile: PayPalOrderProfileRow;
  readonly market: PayPalOrderMarketRow;
}

interface PreparedOrderDraft {
  readonly kind: PayPalOrderKind;
  readonly method: PayPalPaymentMethod;
  readonly order: PayPalOrderRow;
  readonly cart: PayPalOrderCartRow;
  readonly checkoutDraft: PayPalOrderCheckoutDraftRow | null;
  readonly paymentSession: PayPalOrderPaymentSessionRow;
  readonly profileSlug: string;
  readonly lines: readonly MerchantOrderLine[];
  readonly addresses: readonly PayPalOrderAddressWriteInput[];
  readonly totals: MerchantTotals;
  readonly selectedPromoEvaluationId: string | null;
  readonly calculationStage: PayPalOrderTotalSnapshotRow["calculation_stage"];
  readonly deliveryAddress?: PayPalOrderAddressJson;
  readonly pickupStore?: PayPalOrderStoreRow;
}

interface MerchantOrderLine {
  readonly productId: string;
  readonly snapshot: PayPalOrderProductSnapshotRow;
  readonly requestedQuantity: number;
  readonly fulfillableQuantity: number;
  readonly unavailableQuantity: number;
  readonly unitPriceMinor: number;
  readonly lineSubtotalMinor: number;
  readonly lineDiscountMinor: number;
  readonly lineTaxMinor: number;
  readonly lineTotalMinor: number;
}

interface MerchantTotals {
  readonly subtotalMinor: number;
  readonly discountMinor: number;
  readonly taxableSubtotalMinor: number;
  readonly taxMinor: number;
  readonly shippingMinor: number;
  readonly totalMinor: number;
}

export function createSupabasePayPalOrderRepository(
  input: CreateSupabasePayPalOrderRepositoryInput,
): PayPalOrderPreparationRepository {
  const dependencies = {
    ...input,
    publicApiBaseUrl: normalizeBaseUrl(input.publicApiBaseUrl),
    createOrderId: input.createOrderId ?? randomUUID,
    createPaymentSessionId: input.createPaymentSessionId ?? randomUUID,
    createOrderItemId: input.createOrderItemId ?? randomUUID,
    createOrderAddressId: input.createOrderAddressId ?? randomUUID,
    createTotalSnapshotId: input.createTotalSnapshotId ?? randomUUID,
    createPromoEvaluationId: input.createPromoEvaluationId ?? randomUUID,
    createPromoEvaluationLineId:
      input.createPromoEvaluationLineId ?? randomUUID,
    createOrderLifecycleEventId:
      input.createOrderLifecycleEventId ?? randomUUID,
    createPayPalRequestId: input.createPayPalRequestId ?? randomUUID,
    hashCartClientSecret:
      input.hashCartClientSecret ?? defaultCartClientSecretHash,
  };

  return {
    async prepareCreateOrder(context, createOrderInput) {
      const storefrontRows = await resolveStorefrontRows(dependencies, context);
      const draft = await buildPreparedOrderDraft(
        dependencies,
        storefrontRows,
        context,
        createOrderInput,
      );

      await persistPreparedOrderDraft(dependencies, draft);

      if (draft.kind === "delivery") {
        if (!draft.deliveryAddress) {
          throw new Error("Delivery shipping address is required");
        }
        return {
          kind: "delivery",
          orderNumber: draft.order.order_number,
          paymentSessionId: draft.paymentSession.id,
          paypalInvoiceId: requireString(
            draft.paymentSession.paypal_invoice_id,
            "PayPal invoice ID",
          ),
          paypalRequestId: requireString(
            draft.paymentSession.paypal_request_id,
            "PayPal request ID",
          ),
          method: draft.method,
          currencyCode: toPayPalCurrencyCode(draft.order.currency_code),
          items: mapPayPalLineItems(
            storefrontRows.profile,
            draft.lines,
            draft.totals.taxMinor,
          ),
          shippingAmountMinor: draft.totals.shippingMinor,
          taxAmountMinor: draft.totals.taxMinor,
          discountAmountMinor: draft.totals.discountMinor,
          shippingAddress: mapDeliveryAddressForPayPal(draft.deliveryAddress),
        };
      }

      if (draft.kind === "bopis") {
        if (!draft.pickupStore) {
          throw new Error("Pickup store is required");
        }
        return {
          kind: "bopis",
          orderNumber: draft.order.order_number,
          paymentSessionId: draft.paymentSession.id,
          paypalInvoiceId: requireString(
            draft.paymentSession.paypal_invoice_id,
            "PayPal invoice ID",
          ),
          paypalRequestId: requireString(
            draft.paymentSession.paypal_request_id,
            "PayPal request ID",
          ),
          method: draft.method,
          currencyCode: toPayPalCurrencyCode(draft.order.currency_code),
          items: mapPayPalLineItems(
            storefrontRows.profile,
            draft.lines,
            draft.totals.taxMinor,
          ),
          taxAmountMinor: draft.totals.taxMinor,
          discountAmountMinor: draft.totals.discountMinor,
          pickupStore: mapPickupStoreForPayPal(draft.pickupStore),
        };
      }

      return {
        kind: "express_delivery",
        orderNumber: draft.order.order_number,
        paymentSessionId: draft.paymentSession.id,
        paypalInvoiceId: requireString(
          draft.paymentSession.paypal_invoice_id,
          "PayPal invoice ID",
        ),
        paypalRequestId: requireString(
          draft.paymentSession.paypal_request_id,
          "PayPal request ID",
        ),
        method: draft.method,
        currencyCode: toPayPalCurrencyCode(draft.order.currency_code),
        items: mapPayPalLineItems(
          storefrontRows.profile,
          draft.lines,
          draft.totals.taxMinor,
        ),
        shippingAmountMinor: draft.totals.shippingMinor,
        taxAmountMinor: draft.totals.taxMinor,
        discountAmountMinor: draft.totals.discountMinor,
        shippingCallbackUrl: `${dependencies.publicApiBaseUrl}/api/paypal/orders/${draft.order.id}/shipping-callback`,
      };
    },
    async recordCreateOrderResult(_context, resultInput) {
      await dependencies.dataSource.updatePaymentSession(
        resultInput.paymentSessionId,
        {
          paypal_order_id: resultInput.paypalOrderId,
          provider_total_minor: resultInput.merchantSnapshot.totalMinor,
          amount_consistency_status: "matched",
        },
      );
      await dependencies.dataSource.createPayPalOrderSnapshot(
        buildSanitizedPayPalOrderSnapshot({
          paymentSessionId: resultInput.paymentSessionId,
          paypalInvoiceId: resultInput.paypalInvoiceId,
          paypalRequestId: resultInput.paypalRequestId,
          request: resultInput.requestPayload,
          response: resultInput.response.rawResponse,
          merchantSnapshot: resultInput.merchantSnapshot,
        }),
      );
    },
    async handleExpressShippingCallback(callbackInput) {
      return handleExpressShippingCallback(dependencies, callbackInput);
    },
    async prepareCapture(captureInput) {
      return preparePayPalCapture(dependencies, captureInput.paypalOrderId);
    },
    async recordCaptureResult(captureResultInput) {
      await recordPayPalCaptureResult(dependencies, captureResultInput);
    },
  };
}

async function preparePayPalCapture(
  input: PayPalOrderRepositoryDependencies,
  paypalOrderId: string,
): Promise<PreparedPayPalCapture> {
  const paymentSession =
    await input.dataSource.getPaymentSessionByPayPalOrderId(paypalOrderId);
  if (!paymentSession) {
    throw new Error(
      `Payment session for PayPal order ${paypalOrderId} was not found`,
    );
  }

  const order = await input.dataSource.getOrderById(paymentSession.order_id);
  if (!order) {
    throw new Error(`Order ${paymentSession.order_id} was not found`);
  }
  if (order.status !== "pending") {
    throw new Error(`Order ${order.order_number} is not pending capture`);
  }

  const merchantSnapshot = merchantCaptureSnapshot(order);
  const providerSnapshot = {
    ...merchantSnapshot,
    totalMinor:
      paymentSession.provider_total_minor ??
      paymentSession.merchant_total_minor,
  };
  const amountGuard = guardPayPalCaptureAmountConsistency({
    merchantSnapshot,
    providerSnapshot,
  });

  if (amountGuard.action === "block_capture") {
    await input.dataSource.updatePaymentSession(paymentSession.id, {
      provider_total_minor: providerSnapshot.totalMinor,
      amount_consistency_status: "mismatch",
    });
    return {
      action: "block",
      orderNumber: order.order_number,
      paymentSessionId: paymentSession.id,
      paypalOrderId,
      merchantSnapshot,
      amountGuard,
    };
  }

  await input.dataSource.updatePaymentSession(paymentSession.id, {
    provider_total_minor: providerSnapshot.totalMinor,
    amount_consistency_status: "matched",
  });

  return {
    action: "capture",
    orderNumber: order.order_number,
    paymentSessionId: paymentSession.id,
    paypalOrderId,
    paypalRequestId: input.createPayPalRequestId(),
    merchantSnapshot,
    amountGuard,
  };
}

async function recordPayPalCaptureResult(
  input: PayPalOrderRepositoryDependencies,
  captureInput: RecordPayPalCaptureResultInput,
): Promise<void> {
  const paymentSession = await input.dataSource.getPaymentSessionById(
    captureInput.paymentSessionId,
  );
  if (!paymentSession) {
    throw new Error(
      `Payment session ${captureInput.paymentSessionId} was not found`,
    );
  }

  const order = await input.dataSource.getOrderById(paymentSession.order_id);
  if (!order) {
    throw new Error(`Order ${paymentSession.order_id} was not found`);
  }

  const invoiceId = requireString(
    paymentSession.paypal_invoice_id,
    "PayPal invoice ID",
  );
  const orderItems = await input.dataSource.listOrderItems(order.id);
  const amountConsistencyStatus =
    captureInput.amountGuard.status === "matched" ? "matched" : "mismatch";

  await input.dataSource.updateOrder(order.id, {
    status: "paid",
    payment_status: "captured",
  });
  await input.dataSource.updatePaymentSession(paymentSession.id, {
    status: "captured",
    paypal_order_id: captureInput.paypalOrderId,
    paypal_capture_id: captureInput.paypalCaptureId,
    paypal_request_id: captureInput.paypalRequestId,
    provider_total_minor: captureInput.merchantSnapshot.totalMinor,
    amount_consistency_status: amountConsistencyStatus,
  });
  await input.dataSource.createPayPalOrderSnapshot(
    buildSanitizedPayPalOrderSnapshot({
      paymentSessionId: paymentSession.id,
      paypalInvoiceId: invoiceId,
      paypalRequestId: captureInput.paypalRequestId,
      request: {
        operation: "capture",
        paypal_order_id: captureInput.paypalOrderId,
        paypal_capture_id: captureInput.paypalCaptureId,
        amount_guard: mapCaptureAmountGuardJson(captureInput.amountGuard),
      },
      response: captureInput.response.rawResponse,
      merchantSnapshot: captureInput.merchantSnapshot,
    }),
  );
  await input.dataSource.createTotalSnapshot({
    id: input.createTotalSnapshotId(),
    checkout_draft_id: order.checkout_draft_id,
    order_id: order.id,
    payment_session_id: paymentSession.id,
    fulfillment_mode: order.fulfillment_mode,
    calculation_stage: "capture",
    currency_code: order.currency_code,
    merchandise_subtotal_minor: order.subtotal_minor,
    product_discount_minor: 0,
    promo_discount_minor: order.discount_minor,
    taxable_subtotal_minor: subtractMinor(
      order.subtotal_minor,
      order.discount_minor,
    ),
    tax_minor: order.tax_minor,
    shipping_minor: order.shipping_minor,
    total_minor: order.total_minor,
    promo_evaluation_id: null,
    calculation_context_json: {
      paypal_order_id: captureInput.paypalOrderId,
      paypal_capture_id: captureInput.paypalCaptureId,
      paypal_order_status: captureInput.paypalOrderStatus,
      paypal_capture_status: captureInput.paypalCaptureStatus,
      amount_guard: mapCaptureAmountGuardJson(captureInput.amountGuard),
    },
  });
  await input.dataSource.createOrderLifecycleEvent({
    id: input.createOrderLifecycleEventId(),
    order_id: order.id,
    from_status: order.status,
    to_status: "paid",
    actor_type: "system",
    note: `PayPal capture completed: ${captureInput.paypalCaptureId}`,
    created_at: resolveNow(input.now),
  });

  await decrementCapturedOrderInventory(input, order, orderItems);
  if (order.cart_id) {
    await input.dataSource.deleteCartItemsByProductIds({
      cartId: order.cart_id,
      productIds: uniqueStrings(orderItems.map((item) => item.product_id)),
    });
  }
}

async function decrementCapturedOrderInventory(
  input: PayPalOrderRepositoryDependencies,
  order: PayPalOrderRow,
  orderItems: readonly PayPalOrderItemWriteInput[],
): Promise<void> {
  if (order.fulfillment_mode === "delivery") {
    for (const item of orderItems) {
      if (item.fulfillable_quantity > 0) {
        await input.dataSource.decrementCentralInventory({
          profileId: order.profile_id,
          marketId: order.market_id,
          productId: item.product_id,
          quantity: item.fulfillable_quantity,
        });
      }
    }
    return;
  }

  const checkoutDraft = order.checkout_draft_id
    ? await input.dataSource.getCheckoutDraftById(order.checkout_draft_id)
    : null;
  const storeId = checkoutDraft?.pickup_state_json.selected_store_id ?? null;
  if (!storeId) {
    throw new Error(`Pickup order ${order.order_number} is missing store`);
  }

  for (const item of orderItems) {
    if (item.fulfillable_quantity > 0) {
      await input.dataSource.decrementStoreInventory({
        storeId,
        productId: item.product_id,
        quantity: item.fulfillable_quantity,
      });
    }
  }
}

async function handleExpressShippingCallback(
  input: PayPalOrderRepositoryDependencies,
  callbackInput: HandlePayPalShippingCallbackInput,
): Promise<PayPalShippingCallbackResult> {
  const order = await input.dataSource.getOrderById(
    callbackInput.callbackContextId,
  );

  if (
    !order ||
    order.fulfillment_mode !== "delivery" ||
    order.status !== "pending" ||
    !order.cart_id
  ) {
    return declineShippingCallback("METHOD_UNAVAILABLE");
  }

  const [profile, market] = await Promise.all([
    input.dataSource.getProfileById(order.profile_id),
    input.dataSource.getMarketById(order.market_id),
  ]);

  if (!profile || !market) {
    return declineShippingCallback("METHOD_UNAVAILABLE");
  }

  const paymentSession = await resolveShippingCallbackPaymentSession(
    input,
    order,
    callbackInput.paypalOrderId,
  );
  if (!paymentSession) {
    return declineShippingCallback("METHOD_UNAVAILABLE");
  }

  const destination = shippingCallbackDestination(
    order.market_id,
    callbackInput.shippingAddress,
  );
  const shippingOptions = await input.dataSource.listShippingOptions(
    order.market_id,
  );
  const eligibleOptions = selectEligibleShippingOptions(
    shippingOptions.map(mapShippingOptionForShared),
    destination,
  );
  if (eligibleOptions.length === 0) {
    return declineShippingCallback(
      shippingCallbackAddressDeclineIssue(
        market,
        callbackInput.shippingAddress,
      ),
    );
  }

  const selectedSharedOption = callbackInput.selectedShippingOptionId
    ? eligibleOptions.find(
        (option) => option.id === callbackInput.selectedShippingOptionId,
      )
    : eligibleOptions[0];
  if (!selectedSharedOption) {
    return declineShippingCallback("METHOD_UNAVAILABLE");
  }

  const selectedShippingOption = shippingOptions.find(
    (option) => option.id === selectedSharedOption.id,
  );
  if (!selectedShippingOption) {
    return declineShippingCallback("METHOD_UNAVAILABLE");
  }

  const cartItems = await input.dataSource.listCartItems(order.cart_id);
  const paypalOrderId =
    callbackInput.paypalOrderId ??
    paymentSession.paypal_order_id ??
    callbackInput.callbackContextId;
  const promoEvaluation = await createPayPalOrderPromoEvaluationSnapshot(
    input,
    { profile, market },
    order,
    {
      cartItems,
      shippingAmountMinor: selectedShippingOption.amount_minor,
      destination,
      source: "paypal_shipping_update",
      paypalOrderId,
    },
  );
  const lines = await buildMerchantLines(
    input,
    { profile, market },
    {
      cartItems,
      discountMinor: promoEvaluation.merchandise_discount_minor,
      taxDestination: destination,
      shippingMinor: selectedShippingOption.amount_minor,
      pickupStoreInventory: null,
    },
  );
  const totals = buildMerchantTotals(lines, {
    shippingMinor: selectedShippingOption.amount_minor,
  });

  await Promise.all([
    input.dataSource.updateOrder(order.id, {
      payment_status: "started",
      subtotal_minor: totals.subtotalMinor,
      discount_minor: totals.discountMinor,
      tax_minor: totals.taxMinor,
      shipping_minor: totals.shippingMinor,
      total_minor: totals.totalMinor,
    }),
    input.dataSource.updatePaymentSession(paymentSession.id, {
      paypal_order_id: paypalOrderId,
      merchant_total_minor: totals.totalMinor,
      provider_total_minor: totals.totalMinor,
      amount_consistency_status: "matched",
    }),
    input.dataSource.replaceOrderItems(
      order.id,
      lines.map((line) =>
        mapOrderItemWrite(input, order.id, profile.slug, line),
      ),
    ),
    input.dataSource.createTotalSnapshot({
      id: input.createTotalSnapshotId(),
      checkout_draft_id: order.checkout_draft_id,
      order_id: order.id,
      payment_session_id: paymentSession.id,
      fulfillment_mode: order.fulfillment_mode,
      calculation_stage: "paypal_shipping_update",
      currency_code: order.currency_code,
      merchandise_subtotal_minor: totals.subtotalMinor,
      product_discount_minor: 0,
      promo_discount_minor: totals.discountMinor,
      taxable_subtotal_minor: totals.taxableSubtotalMinor,
      tax_minor: totals.taxMinor,
      shipping_minor: totals.shippingMinor,
      total_minor: totals.totalMinor,
      promo_evaluation_id: promoEvaluation.id,
      calculation_context_json: {
        kind: "express_delivery",
        paypal_order_id: paypalOrderId,
        selected_shipping_option_id: selectedShippingOption.id,
        shipping_address: {
          country_code: callbackInput.shippingAddress.countryCode,
          admin_area_1: callbackInput.shippingAddress.adminArea1,
          admin_area_2: callbackInput.shippingAddress.adminArea2,
          postal_code: callbackInput.shippingAddress.postalCode,
        },
      },
    }),
  ]);

  return {
    action: "success",
    response: {
      id: paypalOrderId,
      purchase_units: [
        {
          reference_id: order.order_number,
          amount: {
            currency_code: toPayPalCurrencyCode(order.currency_code),
            value: formatMinorUnit(totals.totalMinor),
            breakdown: {
              item_total: toPayPalMoney(
                order.currency_code,
                totals.subtotalMinor,
              ),
              tax_total: toPayPalMoney(order.currency_code, totals.taxMinor),
              shipping: toPayPalMoney(
                order.currency_code,
                totals.shippingMinor,
              ),
              ...(totals.discountMinor > 0
                ? {
                    discount: toPayPalMoney(
                      order.currency_code,
                      totals.discountMinor,
                    ),
                  }
                : {}),
            },
          },
          shipping_options: eligibleOptions.map((option) => ({
            id: option.id,
            type: "SHIPPING",
            label: option.displayName,
            selected: option.id === selectedShippingOption.id,
            amount: toPayPalMoney(order.currency_code, option.amountMinor),
          })),
        },
      ],
    },
  };
}

async function createPayPalOrderPromoEvaluationSnapshot(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  order: PayPalOrderRow,
  options: {
    readonly cartItems: readonly PayPalOrderCartItemRow[];
    readonly shippingAmountMinor: number;
    readonly destination: Destination;
    readonly source: "paypal_shipping_update" | "pending_resume";
    readonly paypalOrderId: string | null;
  },
): Promise<PayPalOrderPromoEvaluationWriteRow> {
  const [promoRules, regionScopes, productScopes, compatibility, promoLines] =
    await Promise.all([
      input.dataSource.listPromoRules({
        profileId: order.profile_id,
        marketId: order.market_id,
      }),
      input.dataSource.listPromoRuleRegions({
        profileId: order.profile_id,
        marketId: order.market_id,
      }),
      input.dataSource.listPromoRuleProducts({
        profileId: order.profile_id,
        marketId: order.market_id,
      }),
      input.dataSource.listPromoCompatibility({
        profileId: order.profile_id,
        marketId: order.market_id,
      }),
      buildPayPalPromoLines(input, storefrontRows, options.cartItems),
    ]);
  const merchandiseSubtotalMinor = addMinor(
    promoLines.map((line) => line.subtotalMinor),
  );
  const evaluationInput: PromoEvaluationInput = {
    at: resolveNow(input.now),
    merchandiseSubtotalMinor,
    shippingMinor: options.shippingAmountMinor,
    manualCodes: [],
    destination: {
      countryCode: options.destination.countryCode,
      state: options.destination.state ?? null,
      county: options.destination.county ?? null,
      postalCode: options.destination.postalCode ?? null,
    },
    lines: promoLines,
    rules: promoRules.map(mapPromoRuleForShared),
    regionScopes: regionScopes.map(mapPromoRegionForShared),
    productScopes: productScopes.map(mapPromoProductForShared),
    compatibility: compatibility.map(mapPromoCompatibilityForShared),
  };
  const result = evaluatePromos(evaluationInput);
  const createdAt = resolveNow(input.now);
  const evaluation: PayPalOrderPromoEvaluationWriteRow = {
    id: input.createPromoEvaluationId(),
    profile_id: order.profile_id,
    market_id: order.market_id,
    checkout_draft_id: order.checkout_draft_id,
    order_id: order.id,
    evaluation_context_json: {
      fulfillment_mode: order.fulfillment_mode,
      source: options.source,
      manual_codes: [],
      selected_codes: [],
      destination: evaluationInput.destination,
      merchandise_subtotal_minor: merchandiseSubtotalMinor,
      shipping_minor: options.shippingAmountMinor,
      ...(options.paypalOrderId
        ? { paypal_order_id: options.paypalOrderId }
        : {}),
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
  const lines = buildPayPalPromoEvaluationLines(input, {
    evaluationId: evaluation.id,
    result,
    promoRules,
    productScopes,
    promoLines,
  });

  return input.dataSource.createPromoEvaluation(evaluation, lines);
}

async function buildPayPalPromoLines(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  cartItems: readonly PayPalOrderCartItemRow[],
): Promise<readonly PromoLineInput[]> {
  if (cartItems.length === 0) {
    return [];
  }

  const productSnapshots = await input.dataSource.listProductSnapshots(
    storefrontRows.profile.id,
    uniqueStrings(cartItems.map((item) => item.product_id)),
  );
  const productById = new Map(
    productSnapshots.map((product) => [product.id, product]),
  );

  return cartItems.map((item) => {
    const product = productById.get(item.product_id);
    if (!product) {
      throw new Error(`Promo product ${item.product_id} was not found`);
    }

    return {
      productId: item.product_id,
      categoryId: product.category_id,
      subtotalMinor: multiplyMinor(
        item.unit_price_minor_snapshot,
        item.quantity,
      ),
    };
  });
}

function buildPayPalPromoEvaluationLines(
  input: PayPalOrderRepositoryDependencies,
  options: {
    readonly evaluationId: string;
    readonly result: PromoEvaluationResult;
    readonly promoRules: readonly PayPalOrderPromoRuleRow[];
    readonly productScopes: readonly PayPalOrderPromoRuleProductRow[];
    readonly promoLines: readonly PromoLineInput[];
  },
): readonly PayPalOrderPromoEvaluationLineRow[] {
  const rows: PayPalOrderPromoEvaluationLineRow[] = [];
  const selectedCodes = new Set(options.result.selectedSet);
  const recommendedCodes = new Set(options.result.recommendedSet);
  const ruleByCode = new Map(
    options.promoRules.map((rule) => [rule.code, rule]),
  );
  const pushLine = (
    code: string,
    status: PayPalOrderPromoEvaluationLineRow["evaluation_status"],
    rejectionReason: string | null,
    sortOrder: number,
  ) => {
    const rule = ruleByCode.get(code) ?? null;
    const discountMinor =
      rule && status !== "rejected"
        ? calculatePromoRuleDiscountMinor(
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

function calculatePromoRuleDiscountMinor(
  rule: PayPalOrderPromoRuleRow,
  productScopes: readonly PayPalOrderPromoRuleProductRow[],
  promoLines: readonly PromoLineInput[],
): number {
  const includeScopes = productScopes.filter(
    (scope) =>
      scope.promo_rule_id === rule.id && scope.include_exclude === "include",
  );
  const discountBaseMinor =
    includeScopes.length === 0
      ? addMinor(promoLines.map((line) => line.subtotalMinor))
      : addMinor(
          promoLines
            .filter((line) =>
              includeScopes.some(
                (scope) =>
                  scope.product_id === line.productId ||
                  scope.category_id === line.categoryId,
              ),
            )
            .map((line) => line.subtotalMinor),
        );

  return rule.discount_type === "percent"
    ? Math.round((discountBaseMinor * rule.discount_value) / 10_000)
    : Math.min(rule.discount_value, discountBaseMinor);
}

async function resolveShippingCallbackPaymentSession(
  input: PayPalOrderRepositoryDependencies,
  order: PayPalOrderRow,
  paypalOrderId: string | null,
): Promise<PayPalOrderPaymentSessionRow | null> {
  const sessions = [
    ...(await input.dataSource.listPaymentSessions(order.id)),
  ].sort((left, right) => right.attempt_number - left.attempt_number);

  if (paypalOrderId) {
    const matchingPayPalSession = sessions.find(
      (session) => session.paypal_order_id === paypalOrderId,
    );
    if (matchingPayPalSession) {
      return matchingPayPalSession;
    }
  }

  return sessions.find((session) => session.status === "created") ?? null;
}

function declineShippingCallback(
  issue: PayPalShippingCallbackDeclineIssue,
): PayPalShippingCallbackResult {
  return {
    action: "decline",
    statusCode: 422,
    response: {
      name: "UNPROCESSABLE_ENTITY",
      details: [{ issue }],
    },
  };
}

function shippingCallbackAddressDeclineIssue(
  market: PayPalOrderMarketRow,
  address: HandlePayPalShippingCallbackInput["shippingAddress"],
): PayPalShippingCallbackDeclineIssue {
  if (address.countryCode !== market.buyer_country) {
    return "COUNTRY_ERROR";
  }
  if (!address.adminArea1) {
    return "STATE_ERROR";
  }
  if (!address.postalCode) {
    return "ZIP_ERROR";
  }
  return "ADDRESS_ERROR";
}

async function resolveStorefrontRows(
  input: PayPalOrderRepositoryDependencies,
  context: PayPalCreateOrderOperationContext,
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

async function buildPreparedOrderDraft(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  createOrderInput: PreparePayPalCreateOrderInput,
): Promise<PreparedOrderDraft> {
  if (createOrderInput.kind === "delivery") {
    return buildDeliveryOrderDraft(input, storefrontRows, context, {
      checkoutDraftId: requireString(
        createOrderInput.checkoutDraftId,
        "checkout draft ID",
      ),
      method: createOrderInput.method,
    });
  }

  if (createOrderInput.kind === "bopis") {
    return buildBopisOrderDraft(input, storefrontRows, context, {
      checkoutDraftId: requireString(
        createOrderInput.checkoutDraftId,
        "checkout draft ID",
      ),
      method: createOrderInput.method,
    });
  }

  return buildExpressDeliveryOrderDraft(input, storefrontRows, context, {
    cartId: requireString(createOrderInput.cartId, "cart ID"),
    method: createOrderInput.method,
  });
}

async function buildDeliveryOrderDraft(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  createOrderInput: {
    readonly checkoutDraftId: string;
    readonly method: PayPalPaymentMethod;
  },
): Promise<PreparedOrderDraft> {
  const checkoutDraft = await resolveCheckoutDraft(
    input,
    storefrontRows,
    context,
    createOrderInput.checkoutDraftId,
    "delivery",
  );
  const cart = await resolveDraftCart(input, context, checkoutDraft);
  const cartItems = await input.dataSource.listCartItems(cart.id);
  const shippingAddress = checkoutDraft.delivery_state_json.shipping_address;

  if (!shippingAddress) {
    throw new Error("Shipping address is required before Delivery payment");
  }

  const selectedShippingOption = await resolveSelectedShippingOption(
    input,
    checkoutDraft,
    shippingAddress,
  );
  const pendingOrder = await input.dataSource.findPendingOrderByCheckoutDraftId(
    checkoutDraft.id,
    "delivery",
  );
  const pendingResumePromo = pendingOrder
    ? await createPayPalOrderPromoEvaluationSnapshot(
        input,
        storefrontRows,
        pendingOrder,
        {
          cartItems,
          shippingAmountMinor: selectedShippingOption.amount_minor,
          destination: addressDestination(
            checkoutDraft.market_id,
            shippingAddress,
          ),
          source: "pending_resume",
          paypalOrderId: null,
        },
      )
    : null;
  const discountMinor = pendingResumePromo
    ? pendingResumePromo.merchandise_discount_minor
    : await resolveSelectedPromoDiscount(
        input,
        checkoutDraft.selected_promo_evaluation_id,
      );
  const merchantLines = await buildMerchantLines(input, storefrontRows, {
    cartItems,
    discountMinor,
    taxDestination: addressDestination(
      checkoutDraft.market_id,
      shippingAddress,
    ),
    shippingMinor: selectedShippingOption.amount_minor,
    pickupStoreInventory: null,
  });
  const totals = buildMerchantTotals(merchantLines, {
    shippingMinor: selectedShippingOption.amount_minor,
  });
  const order = await resolveOrder(input, storefrontRows, context, {
    cart,
    checkoutDraft,
    fulfillmentMode: "delivery",
    totals,
  });
  const paymentSession = await resolvePaymentSession(input, {
    kind: "delivery",
    method: createOrderInput.method,
    order,
    totals,
    sourceFingerprint: fingerprintSource({
      kind: "delivery",
      method: createOrderInput.method,
      shippingAddress,
      selectedShippingOptionId: selectedShippingOption.id,
      lines: merchantLines,
      totals,
    }),
    storefrontRows,
  });

  return {
    kind: "delivery",
    method: createOrderInput.method,
    order,
    cart,
    checkoutDraft,
    paymentSession,
    profileSlug: storefrontRows.profile.slug,
    lines: merchantLines,
    addresses: buildDeliveryAddresses(input, order.id, checkoutDraft),
    totals,
    selectedPromoEvaluationId:
      pendingResumePromo?.id ?? checkoutDraft.selected_promo_evaluation_id,
    calculationStage: pendingResumePromo ? "pending_resume" : "review_confirm",
    deliveryAddress: shippingAddress,
  };
}

async function buildBopisOrderDraft(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  createOrderInput: {
    readonly checkoutDraftId: string;
    readonly method: PayPalPaymentMethod;
  },
): Promise<PreparedOrderDraft> {
  const checkoutDraft = await resolveCheckoutDraft(
    input,
    storefrontRows,
    context,
    createOrderInput.checkoutDraftId,
    "pickup",
  );
  const cart = await resolveDraftCart(input, context, checkoutDraft);
  const cartItems = await input.dataSource.listCartItems(cart.id);
  const selectedStoreId = checkoutDraft.pickup_state_json.selected_store_id;

  if (!selectedStoreId) {
    throw new Error("Pickup store is required before BOPIS payment");
  }

  if (!checkoutDraft.pickup_state_json.selected_pickup_date) {
    throw new Error("Pickup date is required before BOPIS payment");
  }

  const pickupStore = await input.dataSource.getStoreById(selectedStoreId);
  if (
    !pickupStore ||
    pickupStore.market_id !== checkoutDraft.market_id ||
    !pickupStore.is_active
  ) {
    throw new Error(`Pickup store ${selectedStoreId} was not found`);
  }

  const pendingOrder = await input.dataSource.findPendingOrderByCheckoutDraftId(
    checkoutDraft.id,
    "pickup",
  );
  const pendingResumePromo = pendingOrder
    ? await createPayPalOrderPromoEvaluationSnapshot(
        input,
        storefrontRows,
        pendingOrder,
        {
          cartItems,
          shippingAmountMinor: 0,
          destination: storeDestination(pickupStore),
          source: "pending_resume",
          paypalOrderId: null,
        },
      )
    : null;
  const discountMinor = pendingResumePromo
    ? pendingResumePromo.merchandise_discount_minor
    : await resolveSelectedPromoDiscount(
        input,
        checkoutDraft.selected_promo_evaluation_id,
      );
  const merchantLines = await buildMerchantLines(input, storefrontRows, {
    cartItems,
    discountMinor,
    taxDestination: storeDestination(pickupStore),
    shippingMinor: 0,
    pickupStoreInventory: await input.dataSource.listStoreInventory(
      pickupStore.id,
    ),
  });
  const totals = buildMerchantTotals(merchantLines, { shippingMinor: 0 });
  const order = await resolveOrder(input, storefrontRows, context, {
    cart,
    checkoutDraft,
    fulfillmentMode: "pickup",
    totals,
  });
  const paymentSession = await resolvePaymentSession(input, {
    kind: "bopis",
    method: createOrderInput.method,
    order,
    totals,
    sourceFingerprint: fingerprintSource({
      kind: "bopis",
      method: createOrderInput.method,
      pickupStoreId: pickupStore.id,
      pickupDate: checkoutDraft.pickup_state_json.selected_pickup_date,
      lines: merchantLines,
      totals,
    }),
    storefrontRows,
  });

  return {
    kind: "bopis",
    method: createOrderInput.method,
    order,
    cart,
    checkoutDraft,
    paymentSession,
    profileSlug: storefrontRows.profile.slug,
    lines: merchantLines,
    addresses: buildPickupAddresses(
      input,
      order.id,
      checkoutDraft,
      pickupStore,
    ),
    totals,
    selectedPromoEvaluationId:
      pendingResumePromo?.id ?? checkoutDraft.selected_promo_evaluation_id,
    calculationStage: pendingResumePromo ? "pending_resume" : "review_confirm",
    pickupStore,
  };
}

async function buildExpressDeliveryOrderDraft(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  createOrderInput: {
    readonly cartId: string;
    readonly method: PayPalPaymentMethod;
  },
): Promise<PreparedOrderDraft> {
  const cart = await resolveExpressCart(
    input,
    storefrontRows,
    context,
    createOrderInput.cartId,
  );
  const cartItems = await input.dataSource.listCartItems(cart.id);
  const merchantLines = await buildMerchantLines(input, storefrontRows, {
    cartItems,
    discountMinor: 0,
    taxDestination: null,
    shippingMinor: 0,
    pickupStoreInventory: null,
  });
  const totals = buildMerchantTotals(merchantLines, { shippingMinor: 0 });
  const order = await resolveOrder(input, storefrontRows, context, {
    cart,
    checkoutDraft: null,
    fulfillmentMode: "delivery",
    totals,
  });
  const paymentSession = await resolvePaymentSession(input, {
    kind: "express_delivery",
    method: createOrderInput.method,
    order,
    totals,
    sourceFingerprint: fingerprintSource({
      kind: "express_delivery",
      method: createOrderInput.method,
      cartId: cart.id,
      lines: merchantLines,
      totals,
    }),
    storefrontRows,
  });

  return {
    kind: "express_delivery",
    method: createOrderInput.method,
    order,
    cart,
    checkoutDraft: null,
    paymentSession,
    profileSlug: storefrontRows.profile.slug,
    lines: merchantLines,
    addresses: [],
    totals,
    selectedPromoEvaluationId: null,
    calculationStage: "review_confirm",
  };
}

async function resolveCheckoutDraft(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  checkoutDraftId: string,
  fulfillmentMode: FulfillmentMode,
): Promise<PayPalOrderCheckoutDraftRow> {
  const checkoutDraft =
    await input.dataSource.getCheckoutDraftById(checkoutDraftId);

  if (!checkoutDraft) {
    throw new Error(`Checkout draft ${checkoutDraftId} was not found`);
  }

  if (
    checkoutDraft.profile_id !== storefrontRows.profile.id ||
    checkoutDraft.market_id !== storefrontRows.market.id
  ) {
    throw new Error("Checkout draft does not match the active storefront");
  }

  if (checkoutDraft.fulfillment_mode !== fulfillmentMode) {
    throw new Error(
      `Checkout draft ${checkoutDraftId} is not a ${fulfillmentMode} draft`,
    );
  }

  if (
    checkoutDraft.status === "converted" ||
    checkoutDraft.status === "abandoned"
  ) {
    throw new Error(`Checkout draft ${checkoutDraftId} is not payable`);
  }

  if (context.buyer.kind === "authenticated") {
    if (checkoutDraft.auth_user_id !== context.buyer.userId) {
      throw new Error("Checkout draft does not belong to the signed-in buyer");
    }
    return checkoutDraft;
  }

  if (!context.guestCart) {
    throw new Error("Guest checkout requires an active cart binding");
  }

  const cart = await input.dataSource.findActiveGuestCart(
    context.guestCart.cartPublicId,
  );
  if (!cart || cart.id !== checkoutDraft.cart_id) {
    throw new Error("Guest cart does not match checkout draft");
  }
  verifyGuestCartSecret(input, cart, context.guestCart.cartClientSecret);

  return checkoutDraft;
}

async function resolveDraftCart(
  input: PayPalOrderRepositoryDependencies,
  context: PayPalCreateOrderOperationContext,
  checkoutDraft: PayPalOrderCheckoutDraftRow,
): Promise<PayPalOrderCartRow> {
  if (context.buyer.kind === "authenticated") {
    const cart = await input.dataSource.findActiveSignedInCart({
      profileId: checkoutDraft.profile_id,
      marketId: checkoutDraft.market_id,
      authUserId: context.buyer.userId,
    });
    if (!cart || cart.id !== checkoutDraft.cart_id) {
      throw new Error("Active signed-in cart does not match checkout draft");
    }
    return cart;
  }

  if (!context.guestCart) {
    throw new Error("Guest checkout requires an active cart binding");
  }
  const cart = await input.dataSource.findActiveGuestCart(
    context.guestCart.cartPublicId,
  );
  if (!cart || cart.id !== checkoutDraft.cart_id) {
    throw new Error("Guest cart does not match checkout draft");
  }
  verifyGuestCartSecret(input, cart, context.guestCart.cartClientSecret);
  return cart;
}

async function resolveExpressCart(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  cartId: string,
): Promise<PayPalOrderCartRow> {
  if (context.buyer.kind === "authenticated") {
    const cart = await input.dataSource.findActiveSignedInCart({
      profileId: storefrontRows.profile.id,
      marketId: storefrontRows.market.id,
      authUserId: context.buyer.userId,
    });
    if (!cart || (cart.id !== cartId && cart.cart_public_id !== cartId)) {
      throw new Error("Active signed-in cart was not found");
    }
    return cart;
  }

  if (!context.guestCart || context.guestCart.cartPublicId !== cartId) {
    throw new Error("Guest express checkout requires the active cart binding");
  }

  const cart = await input.dataSource.findActiveGuestCart(
    context.guestCart.cartPublicId,
  );
  if (!cart) {
    throw new Error("Guest cart was not found");
  }
  if (
    cart.profile_id !== storefrontRows.profile.id ||
    cart.market_id !== storefrontRows.market.id
  ) {
    throw new Error("Guest cart does not match the active storefront context");
  }
  verifyGuestCartSecret(input, cart, context.guestCart.cartClientSecret);
  return cart;
}

async function resolveSelectedShippingOption(
  input: PayPalOrderRepositoryDependencies,
  checkoutDraft: PayPalOrderCheckoutDraftRow,
  shippingAddress: PayPalOrderAddressJson,
): Promise<PayPalOrderShippingOptionRow> {
  const selectedShippingOptionId =
    checkoutDraft.delivery_state_json.selected_shipping_option_id;
  if (!selectedShippingOptionId) {
    throw new Error("Shipping option is required before Delivery payment");
  }

  const shippingOptions = await input.dataSource.listShippingOptions(
    checkoutDraft.market_id,
  );
  const eligibleOption = selectEligibleShippingOptions(
    shippingOptions.map(mapShippingOptionForShared),
    addressDestination(checkoutDraft.market_id, shippingAddress),
  ).find((option) => option.id === selectedShippingOptionId);

  if (!eligibleOption) {
    throw new Error(
      `Shipping option ${selectedShippingOptionId} is not eligible`,
    );
  }

  return shippingOptions.find((option) => option.id === eligibleOption.id)!;
}

async function resolveSelectedPromoDiscount(
  input: PayPalOrderRepositoryDependencies,
  selectedPromoEvaluationId: string | null,
): Promise<number> {
  if (!selectedPromoEvaluationId) {
    return 0;
  }

  const promoEvaluation = await input.dataSource.getPromoEvaluationById(
    selectedPromoEvaluationId,
  );
  return promoEvaluation?.merchandise_discount_minor ?? 0;
}

async function buildMerchantLines(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  options: {
    readonly cartItems: readonly PayPalOrderCartItemRow[];
    readonly discountMinor: number;
    readonly taxDestination: Destination | null;
    readonly shippingMinor: number;
    readonly pickupStoreInventory:
      | readonly PayPalOrderStoreInventoryRow[]
      | null;
  },
): Promise<readonly MerchantOrderLine[]> {
  if (options.cartItems.length === 0) {
    throw new Error("Cannot start payment for an empty cart");
  }

  const productSnapshots = await input.dataSource.listProductSnapshots(
    storefrontRows.profile.id,
    uniqueStrings(options.cartItems.map((item) => item.product_id)),
  );
  const productById = new Map(
    productSnapshots.map((product) => [product.id, product]),
  );
  const fulfillableQuantityByProductId = resolveFulfillableQuantities(options);
  const baseLines = options.cartItems.flatMap((item) => {
    const snapshot = productById.get(item.product_id);
    if (!snapshot) {
      throw new Error(`Product ${item.product_id} was not found`);
    }
    const fulfillableQuantity =
      fulfillableQuantityByProductId.get(item.product_id) ?? item.quantity;
    if (fulfillableQuantity < 1) {
      return [];
    }
    const lineSubtotalMinor = multiplyMinor(
      item.unit_price_minor_snapshot,
      fulfillableQuantity,
    );
    return [
      {
        productId: item.product_id,
        snapshot,
        requestedQuantity: item.quantity,
        fulfillableQuantity,
        unavailableQuantity: item.quantity - fulfillableQuantity,
        unitPriceMinor: item.unit_price_minor_snapshot,
        lineSubtotalMinor,
      },
    ];
  });
  const subtotalMinor = addMinor(
    baseLines.map((line) => line.lineSubtotalMinor),
  );
  const discountMinor = Math.min(options.discountMinor, subtotalMinor);
  const taxMinor = await calculateTaxMinor(input, {
    marketId: storefrontRows.market.id,
    destination: options.taxDestination,
    subtotalMinor,
    discountMinor,
    shippingMinor: options.shippingMinor,
  });
  const discounts = allocateAmountByWeight(
    discountMinor,
    baseLines.map((line) => line.lineSubtotalMinor),
  );
  const taxableWeights = baseLines.map((line, index) =>
    subtractMinor(line.lineSubtotalMinor, discounts[index] ?? 0),
  );
  const taxes = allocateAmountByWeight(taxMinor, taxableWeights);

  return baseLines.map((line, index) => {
    const lineDiscountMinor = discounts[index] ?? 0;
    const lineTaxMinor = taxes[index] ?? 0;
    return {
      ...line,
      lineDiscountMinor,
      lineTaxMinor,
      lineTotalMinor: line.lineSubtotalMinor - lineDiscountMinor + lineTaxMinor,
    };
  });
}

function resolveFulfillableQuantities(options: {
  readonly cartItems: readonly PayPalOrderCartItemRow[];
  readonly pickupStoreInventory: readonly PayPalOrderStoreInventoryRow[] | null;
}): ReadonlyMap<string, number> {
  if (!options.pickupStoreInventory) {
    return new Map(
      options.cartItems.map((item) => [item.product_id, item.quantity]),
    );
  }

  const split = calculatePickupInventorySplit({
    cartLines: options.cartItems.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      unitPriceMinor: item.unit_price_minor_snapshot,
    })),
    inventory: options.pickupStoreInventory.map((row) => ({
      storeId: row.store_id,
      productId: row.product_id,
      availableQuantity: row.available_quantity,
    })),
  });

  return new Map(
    split.readyItems.map((item) => [item.productId, item.fulfillableQuantity]),
  );
}

async function calculateTaxMinor(
  input: PayPalOrderRepositoryDependencies,
  options: {
    readonly marketId: string;
    readonly destination: Destination | null;
    readonly subtotalMinor: number;
    readonly discountMinor: number;
    readonly shippingMinor: number;
  },
): Promise<number> {
  if (!options.destination) {
    return 0;
  }

  const taxRates = await input.dataSource.listTaxRates(options.marketId);
  const selectedRate = selectTaxRate(
    taxRates.map(mapTaxRateForShared),
    options.destination,
  );
  if (!selectedRate) {
    return 0;
  }

  return calculateEstimatedTax({
    merchandiseSubtotalMinor: options.subtotalMinor,
    promoDiscountMinor: options.discountMinor,
    shippingMinor: options.shippingMinor,
    rateBps: selectedRate.rateBps,
  }).taxMinor;
}

function buildMerchantTotals(
  lines: readonly MerchantOrderLine[],
  options: { readonly shippingMinor: number },
): MerchantTotals {
  const subtotalMinor = addMinor(lines.map((line) => line.lineSubtotalMinor));
  const discountMinor = addMinor(lines.map((line) => line.lineDiscountMinor));
  const taxMinor = addMinor(lines.map((line) => line.lineTaxMinor));
  const taxableSubtotalMinor = subtractMinor(subtotalMinor, discountMinor);
  const totalMinor =
    subtotalMinor - discountMinor + taxMinor + options.shippingMinor;

  return {
    subtotalMinor,
    discountMinor,
    taxableSubtotalMinor,
    taxMinor,
    shippingMinor: options.shippingMinor,
    totalMinor,
  };
}

function merchantCaptureSnapshot(
  order: PayPalOrderRow,
): PayPalCaptureAmountSnapshot {
  return {
    currencyCode: toPayPalCurrencyCode(order.currency_code),
    itemTotalMinor: order.subtotal_minor,
    shippingMinor: order.shipping_minor,
    taxMinor: order.tax_minor,
    discountMinor: order.discount_minor,
    totalMinor: order.total_minor,
  };
}

function mapCaptureAmountGuardJson(
  guard: PayPalCaptureAmountGuardResult,
): CatalogJson {
  return {
    action: guard.action,
    status: guard.status,
    can_capture: guard.can_capture,
    tolerance_minor: guard.tolerance_minor,
    mismatches: guard.mismatches.map((mismatch) => ({
      reason: mismatch.reason,
      expected_minor: mismatch.expected_minor,
      actual_minor: mismatch.actual_minor,
      expected_currency_code: mismatch.expected_currency_code,
      actual_currency_code: mismatch.actual_currency_code,
    })),
  };
}

async function resolveOrder(
  input: PayPalOrderRepositoryDependencies,
  storefrontRows: StorefrontRows,
  context: PayPalCreateOrderOperationContext,
  options: {
    readonly cart: PayPalOrderCartRow;
    readonly checkoutDraft: PayPalOrderCheckoutDraftRow | null;
    readonly fulfillmentMode: FulfillmentMode;
    readonly totals: MerchantTotals;
  },
): Promise<PayPalOrderRow> {
  const existingOrder = options.checkoutDraft
    ? await input.dataSource.findPendingOrderByCheckoutDraftId(
        options.checkoutDraft.id,
        options.fulfillmentMode,
      )
    : await input.dataSource.findPendingOrderByCartId(
        options.cart.id,
        options.fulfillmentMode,
      );

  if (existingOrder) {
    return input.dataSource.updateOrder(existingOrder.id, {
      payment_status: "started",
      subtotal_minor: options.totals.subtotalMinor,
      discount_minor: options.totals.discountMinor,
      tax_minor: options.totals.taxMinor,
      shipping_minor: options.totals.shippingMinor,
      total_minor: options.totals.totalMinor,
    });
  }

  const sequenceDate = formatOrderSequenceDate(resolveNow(input.now));
  const prefix = orderNumberPrefixForFulfillment(options.fulfillmentMode);
  const sequence = await input.dataSource.getNextOrderSequence({
    prefix,
    date: sequenceDate,
  });
  const orderNumber = formatOrderNumber({
    fulfillmentMode: options.fulfillmentMode,
    date: resolveNow(input.now).slice(0, 10),
    sequence,
  });

  return input.dataSource.createOrder({
    id: input.createOrderId(),
    profile_id: storefrontRows.profile.id,
    market_id: storefrontRows.market.id,
    order_number: orderNumber,
    order_number_prefix: prefix,
    order_number_sequence: sequence,
    auth_user_id:
      context.buyer.kind === "authenticated" ? context.buyer.userId : null,
    guest_email: null,
    cart_id: options.cart.id,
    checkout_draft_id: options.checkoutDraft?.id ?? null,
    fulfillment_mode: options.fulfillmentMode,
    status: "pending",
    payment_status: "started",
    currency_code: storefrontRows.market.currency_code,
    locale: storefrontRows.market.locale,
    buyer_country: storefrontRows.market.buyer_country,
    sandbox_test_buyer_country:
      storefrontRows.market.sandbox_test_buyer_country,
    subtotal_minor: options.totals.subtotalMinor,
    discount_minor: options.totals.discountMinor,
    tax_minor: options.totals.taxMinor,
    shipping_minor: options.totals.shippingMinor,
    total_minor: options.totals.totalMinor,
  });
}

async function resolvePaymentSession(
  input: PayPalOrderRepositoryDependencies,
  options: {
    readonly kind: PayPalOrderKind;
    readonly method: PayPalPaymentMethod;
    readonly order: PayPalOrderRow;
    readonly totals: MerchantTotals;
    readonly sourceFingerprint: string;
    readonly storefrontRows: StorefrontRows;
  },
): Promise<PayPalOrderPaymentSessionRow> {
  const sessions = [
    ...(await input.dataSource.listPaymentSessions(options.order.id)),
  ].sort((left, right) => right.attempt_number - left.attempt_number);
  const reusableSession = sessions.find(
    (session) =>
      session.paypal_order_id === null &&
      session.method === options.method &&
      sourceFingerprintFromSession(session) === options.sourceFingerprint,
  );

  if (reusableSession) {
    return reusableSession;
  }

  const attemptNumber =
    sessions.reduce(
      (max, session) => Math.max(max, session.attempt_number),
      0,
    ) + 1;
  const previousRequest = latestPreviousRequest(sessions);
  const metadata = planPayPalRequestMetadata({
    orderNumber: options.order.order_number,
    attemptNumber,
    payloadFingerprint: options.sourceFingerprint,
    nextPayPalRequestId: input.createPayPalRequestId(),
    ...(previousRequest ? { previousRequest } : {}),
  });

  return input.dataSource.createPaymentSession({
    id: input.createPaymentSessionId(),
    order_id: options.order.id,
    provider: "paypal",
    method: options.method,
    status: "created",
    attempt_number: metadata.attempt_number,
    paypal_order_id: null,
    paypal_capture_id: null,
    paypal_invoice_id: metadata.paypal_invoice_id,
    paypal_request_id: metadata.paypal_request_id,
    vault_requested: false,
    merchant_total_minor: options.totals.totalMinor,
    provider_total_minor: null,
    amount_consistency_status: "not_checked",
    currency_code: options.order.currency_code,
    locale: options.order.locale,
    buyer_country: options.order.buyer_country,
    sandbox_test_buyer_country: options.order.sandbox_test_buyer_country,
    paypal_config_snapshot_json: {
      kind: options.kind,
      source_fingerprint: options.sourceFingerprint,
      profile_slug: options.storefrontRows.profile.slug,
      market_code: options.storefrontRows.market.code,
    },
  });
}

async function persistPreparedOrderDraft(
  input: PayPalOrderRepositoryDependencies,
  draft: PreparedOrderDraft,
): Promise<void> {
  await Promise.all([
    input.dataSource.replaceOrderItems(
      draft.order.id,
      draft.lines.map((line) =>
        mapOrderItemWrite(input, draft.order.id, draft.profileSlug, line),
      ),
    ),
    input.dataSource.replaceOrderAddresses(draft.order.id, draft.addresses),
    input.dataSource.createTotalSnapshot({
      id: input.createTotalSnapshotId(),
      checkout_draft_id: draft.checkoutDraft?.id ?? null,
      order_id: draft.order.id,
      payment_session_id: draft.paymentSession.id,
      fulfillment_mode: draft.order.fulfillment_mode,
      calculation_stage: draft.calculationStage,
      currency_code: draft.order.currency_code,
      merchandise_subtotal_minor: draft.totals.subtotalMinor,
      product_discount_minor: 0,
      promo_discount_minor: draft.totals.discountMinor,
      taxable_subtotal_minor: draft.totals.taxableSubtotalMinor,
      tax_minor: draft.totals.taxMinor,
      shipping_minor: draft.totals.shippingMinor,
      total_minor: draft.totals.totalMinor,
      promo_evaluation_id: draft.selectedPromoEvaluationId,
      calculation_context_json: {
        kind: draft.kind,
        payment_method: draft.method,
      },
    }),
    draft.checkoutDraft
      ? input.dataSource.updateCheckoutDraftStatus({
          draftId: draft.checkoutDraft.id,
          status: "payment_started",
          updatedAt: resolveNow(input.now),
        })
      : Promise.resolve(),
  ]);
}

function mapOrderItemWrite(
  input: PayPalOrderRepositoryDependencies,
  orderId: string,
  profileSlug: string,
  line: MerchantOrderLine,
): PayPalOrderItemWriteInput {
  return {
    id: input.createOrderItemId(),
    order_id: orderId,
    product_id: line.productId,
    product_sku_snapshot: line.snapshot.sku,
    product_name_snapshot: line.snapshot.name,
    product_description_snapshot: line.snapshot.description,
    product_url_snapshot: `/${profileSlug}/products/${line.snapshot.slug}`,
    product_image_url_snapshot: line.snapshot.image_path,
    unit_price_minor: line.unitPriceMinor,
    quantity: line.requestedQuantity,
    fulfillable_quantity: line.fulfillableQuantity,
    unavailable_quantity: line.unavailableQuantity,
    line_subtotal_minor: line.lineSubtotalMinor,
    line_discount_minor: line.lineDiscountMinor,
    line_tax_minor: line.lineTaxMinor,
    line_total_minor: line.lineTotalMinor,
  };
}

function buildDeliveryAddresses(
  input: PayPalOrderRepositoryDependencies,
  orderId: string,
  checkoutDraft: PayPalOrderCheckoutDraftRow,
): readonly PayPalOrderAddressWriteInput[] {
  const shippingAddress = checkoutDraft.delivery_state_json.shipping_address;
  if (!shippingAddress) {
    return [];
  }
  const billingAddress =
    checkoutDraft.delivery_state_json.same_as_shipping === false
      ? checkoutDraft.delivery_state_json.billing_address
      : shippingAddress;
  const addresses = [
    mapOrderAddressWrite(input, orderId, "shipping", shippingAddress),
  ];
  if (billingAddress) {
    addresses.push(
      mapOrderAddressWrite(input, orderId, "billing", billingAddress),
    );
  }
  return addresses;
}

function buildPickupAddresses(
  input: PayPalOrderRepositoryDependencies,
  orderId: string,
  checkoutDraft: PayPalOrderCheckoutDraftRow,
  pickupStore: PayPalOrderStoreRow,
): readonly PayPalOrderAddressWriteInput[] {
  const addresses = [mapStoreAddressWrite(input, orderId, pickupStore)];
  const billingAddress = checkoutDraft.pickup_state_json.billing_address;
  if (billingAddress) {
    addresses.push(
      mapOrderAddressWrite(input, orderId, "billing", billingAddress),
    );
  }
  return addresses;
}

function mapOrderAddressWrite(
  input: PayPalOrderRepositoryDependencies,
  orderId: string,
  addressType: "shipping" | "billing",
  address: PayPalOrderAddressJson,
): PayPalOrderAddressWriteInput {
  return {
    id: input.createOrderAddressId(),
    order_id: orderId,
    address_type: addressType,
    recipient_name: address.recipient_name,
    phone: address.phone,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
  };
}

function mapStoreAddressWrite(
  input: PayPalOrderRepositoryDependencies,
  orderId: string,
  store: PayPalOrderStoreRow,
): PayPalOrderAddressWriteInput {
  return {
    id: input.createOrderAddressId(),
    order_id: orderId,
    address_type: "pickup_store",
    recipient_name: `s2s ${store.name}`,
    phone: store.phone,
    address_line1: store.address_line1,
    address_line2: store.address_line2,
    city: store.city,
    state: store.state,
    postal_code: store.postal_code,
    country_code: store.country_code,
  };
}

function mapPayPalLineItems(
  profile: PayPalOrderProfileRow,
  lines: readonly MerchantOrderLine[],
  taxAmountMinor: number,
): readonly PayPalOrderLineItemInput[] {
  return lines.map((line) => ({
    name: line.snapshot.name,
    quantity: line.fulfillableQuantity,
    unitAmountMinor: line.unitPriceMinor,
    lineTaxAmountMinor: taxAmountMinor > 0 ? line.lineTaxMinor : null,
    sku: line.snapshot.sku,
    description: line.snapshot.description,
    url: `/${profile.slug}/products/${line.snapshot.slug}`,
    imageUrl: line.snapshot.image_path,
  }));
}

function mapDeliveryAddressForPayPal(address: PayPalOrderAddressJson) {
  return {
    fullName: address.recipient_name,
    addressLine1: address.address_line1,
    addressLine2: address.address_line2,
    adminArea2: address.city,
    adminArea1: address.state,
    postalCode: address.postal_code,
    countryCode: address.country_code,
  };
}

function mapPickupStoreForPayPal(store: PayPalOrderStoreRow) {
  return {
    storeName: store.name,
    addressLine1: store.address_line1,
    addressLine2: store.address_line2,
    adminArea2: store.city,
    adminArea1: store.state,
    postalCode: store.postal_code,
    countryCode: store.country_code,
  };
}

function mapShippingOptionForShared(
  row: PayPalOrderShippingOptionRow,
): ShippingOptionRow {
  return {
    id: row.id,
    marketId: row.market_id,
    countryCode: row.country_code,
    state: row.state,
    county: row.county,
    serviceCode: row.service_code,
    displayName: row.display_name,
    amountMinor: row.amount_minor,
    estimatedDaysMin: row.estimated_days_min,
    estimatedDaysMax: row.estimated_days_max,
    isActive: row.is_active,
  };
}

function mapTaxRateForShared(row: PayPalOrderTaxRateRow): TaxRateRow {
  return {
    id: row.id,
    marketId: row.market_id,
    countryCode: row.country_code,
    state: row.state,
    county: row.county,
    postalCodePrefix: row.postal_code_prefix,
    rateBps: row.rate_bps,
    isActive: row.is_active,
  };
}

function mapPromoRuleForShared(rule: PayPalOrderPromoRuleRow): PromoRuleRow {
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
  region: PayPalOrderPromoRuleRegionRow,
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
  product: PayPalOrderPromoRuleProductRow,
): PromoRuleProductRow {
  return {
    promoRuleId: product.promo_rule_id,
    productId: product.product_id,
    categoryId: product.category_id,
    includeExclude: product.include_exclude,
  };
}

function mapPromoCompatibilityForShared(
  compatibility: PayPalOrderPromoCompatibilityRow,
): PromoCompatibilityRow {
  return {
    promoRuleId: compatibility.promo_rule_id,
    compatiblePromoRuleId: compatibility.compatible_promo_rule_id,
    compatibility: compatibility.compatibility,
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

function addressDestination(
  marketId: string,
  address: PayPalOrderAddressJson,
): Destination {
  return {
    marketId,
    countryCode: address.country_code,
    state: address.state,
    county: address.county,
    postalCode: address.postal_code,
  };
}

function shippingCallbackDestination(
  marketId: string,
  address: HandlePayPalShippingCallbackInput["shippingAddress"],
): Destination {
  return {
    marketId,
    countryCode: address.countryCode,
    state: address.adminArea1,
    postalCode: address.postalCode,
  };
}

function storeDestination(store: PayPalOrderStoreRow): Destination {
  return {
    marketId: store.market_id,
    countryCode: store.country_code,
    state: store.state,
    postalCode: store.postal_code,
  };
}

function allocateAmountByWeight(
  totalAmountMinor: number,
  weights: readonly number[],
): readonly number[] {
  if (weights.length === 0) {
    return [];
  }
  const totalWeight = addMinor(weights);
  if (totalAmountMinor === 0 || totalWeight === 0) {
    return weights.map(() => 0);
  }

  let allocatedTotal = 0;
  const allocations = weights.map((weight) => {
    const amount = Math.floor((totalAmountMinor * weight) / totalWeight);
    allocatedTotal += amount;
    return amount;
  });
  let remainder = totalAmountMinor - allocatedTotal;
  for (let index = 0; remainder > 0; index += 1) {
    allocations[index % allocations.length]! += 1;
    remainder -= 1;
  }
  return allocations;
}

function sourceFingerprintFromSession(
  session: PayPalOrderPaymentSessionRow,
): string | null {
  const snapshot = session.paypal_config_snapshot_json;
  if (
    snapshot &&
    typeof snapshot === "object" &&
    !Array.isArray(snapshot) &&
    "source_fingerprint" in snapshot &&
    typeof snapshot.source_fingerprint === "string"
  ) {
    return snapshot.source_fingerprint;
  }
  return null;
}

function latestPreviousRequest(
  sessions: readonly PayPalOrderPaymentSessionRow[],
): PreviousPayPalRequestMetadata | null {
  const previous = sessions.find(
    (session) => session.paypal_invoice_id && session.paypal_request_id,
  );
  const payloadFingerprint = previous
    ? sourceFingerprintFromSession(previous)
    : null;

  if (
    !previous ||
    !previous.paypal_invoice_id ||
    !previous.paypal_request_id ||
    !payloadFingerprint
  ) {
    return null;
  }

  return {
    paypalInvoiceId: previous.paypal_invoice_id,
    paypalRequestId: previous.paypal_request_id,
    attemptNumber: previous.attempt_number,
    payloadFingerprint,
  };
}

function fingerprintSource(value: unknown): string {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(normalizeFingerprintValue(value)))
    .digest("hex")}`;
}

function normalizeFingerprintValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeFingerprintValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, childValue]) => [
          key,
          normalizeFingerprintValue(childValue),
        ]),
    );
  }
  return value;
}

function verifyGuestCartSecret(
  input: PayPalOrderRepositoryDependencies,
  cart: PayPalOrderCartRow,
  cartClientSecret: string,
): void {
  if (cart.cart_secret_hash !== input.hashCartClientSecret(cartClientSecret)) {
    throw new Error("Guest cart secret does not match");
  }
}

function toPayPalCurrencyCode(currencyCode: string): PayPalCurrencyCode {
  if (currencyCode === "USD" || currencyCode === "GBP") {
    return currencyCode;
  }
  throw new Error(`Unsupported PayPal currency ${currencyCode}`);
}

function toPayPalMoney(currencyCode: string, amountMinor: number) {
  return {
    currency_code: toPayPalCurrencyCode(currencyCode),
    value: formatMinorUnit(amountMinor),
  };
}

function formatMinorUnit(amountMinor: number): string {
  const amount = assertMinorUnit(amountMinor);
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function formatOrderSequenceDate(now: string): string {
  return now.slice(0, 10).replaceAll("-", "");
}

function resolveNow(now: RepositoryNow | undefined): string {
  const value = typeof now === "function" ? now() : now;
  const date =
    typeof value === "string" || value instanceof Date ? value : new Date();
  return date instanceof Date ? date.toISOString() : date;
}

function normalizeBaseUrl(value: string): string {
  const url = new URL(value);
  return url.toString().replace(/\/$/, "");
}

function requireString(
  value: string | null | undefined,
  label: string,
): string {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`${label} is required`);
  }
  return trimmedValue;
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

function defaultCartClientSecretHash(secret: string): string {
  return `sha256:${createHash("sha256")
    .update(`paypal-retail-demo-v1:${secret}`)
    .digest("hex")}`;
}

type SupabasePrimitive = string | number | boolean | null;

interface SupabasePayPalOrderError {
  readonly message: string;
}

interface SupabasePayPalOrderResult<TData> {
  readonly data: TData | null;
  readonly error: SupabasePayPalOrderError | null;
}

interface SupabasePayPalOrderQuery extends PromiseLike<
  SupabasePayPalOrderResult<unknown>
> {
  readonly select: (columns: string) => SupabasePayPalOrderQuery;
  readonly eq: (
    column: string,
    value: SupabasePrimitive,
  ) => SupabasePayPalOrderQuery;
  readonly in: (
    column: string,
    values: readonly SupabasePrimitive[],
  ) => SupabasePayPalOrderQuery;
  readonly like: (column: string, value: string) => SupabasePayPalOrderQuery;
  readonly order: (
    column: string,
    options?: { readonly ascending?: boolean },
  ) => SupabasePayPalOrderQuery;
  readonly limit: (count: number) => SupabasePayPalOrderQuery;
  readonly insert: (
    values: Record<string, unknown> | readonly Record<string, unknown>[],
  ) => SupabasePayPalOrderQuery;
  readonly update: (
    values: Record<string, unknown>,
  ) => SupabasePayPalOrderQuery;
  readonly delete: () => SupabasePayPalOrderQuery;
  readonly maybeSingle: () => PromiseLike<SupabasePayPalOrderResult<unknown>>;
  readonly single: () => PromiseLike<SupabasePayPalOrderResult<unknown>>;
}

export interface SupabasePayPalOrderClient {
  readonly from: (table: string) => SupabasePayPalOrderQuery;
}

const checkoutDraftColumns = [
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
].join(", ");

const cartColumns = [
  "id",
  "profile_id",
  "market_id",
  "auth_user_id",
  "cart_public_id",
  "cart_secret_hash",
  "status",
].join(", ");

const orderColumns = [
  "id",
  "profile_id",
  "market_id",
  "order_number",
  "order_number_prefix",
  "order_number_sequence",
  "auth_user_id",
  "guest_email",
  "cart_id",
  "checkout_draft_id",
  "fulfillment_mode",
  "status",
  "payment_status",
  "currency_code",
  "locale",
  "buyer_country",
  "sandbox_test_buyer_country",
  "subtotal_minor",
  "discount_minor",
  "tax_minor",
  "shipping_minor",
  "total_minor",
].join(", ");

const paymentSessionColumns = [
  "id",
  "order_id",
  "provider",
  "method",
  "status",
  "attempt_number",
  "paypal_order_id",
  "paypal_capture_id",
  "paypal_invoice_id",
  "paypal_request_id",
  "vault_requested",
  "merchant_total_minor",
  "provider_total_minor",
  "amount_consistency_status",
  "currency_code",
  "locale",
  "buyer_country",
  "sandbox_test_buyer_country",
  "paypal_config_snapshot_json",
].join(", ");

const orderItemColumns = [
  "id",
  "order_id",
  "product_id",
  "product_sku_snapshot",
  "product_name_snapshot",
  "product_description_snapshot",
  "product_url_snapshot",
  "product_image_url_snapshot",
  "unit_price_minor",
  "quantity",
  "fulfillable_quantity",
  "unavailable_quantity",
  "line_subtotal_minor",
  "line_discount_minor",
  "line_tax_minor",
  "line_total_minor",
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

export function createSupabasePayPalOrderDataSource(
  supabase: SupabasePayPalOrderClient,
): PayPalOrderDataSource {
  return {
    async getProfileBySlug(slug) {
      return queryOne<PayPalOrderProfileRow>(
        supabase
          .from("profiles")
          .select("id, slug")
          .eq("slug", slug)
          .maybeSingle(),
        `Load profile ${slug}`,
      );
    },
    async getProfileById(id) {
      return queryOne<PayPalOrderProfileRow>(
        supabase.from("profiles").select("id, slug").eq("id", id).maybeSingle(),
        `Load profile ${id}`,
      );
    },
    async getMarketByCode(code) {
      return queryOne<PayPalOrderMarketRow>(
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
      return queryOne<PayPalOrderMarketRow>(
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
    async getCheckoutDraftById(id) {
      return queryOne<PayPalOrderCheckoutDraftRow>(
        supabase
          .from("checkout_drafts")
          .select(checkoutDraftColumns)
          .eq("id", id)
          .maybeSingle(),
        `Load checkout draft ${id}`,
      );
    },
    async findActiveGuestCart(cartPublicId) {
      return queryOne<PayPalOrderCartRow>(
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
      return queryOne<PayPalOrderCartRow>(
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
    async listCartItems(cartId) {
      return queryMany<PayPalOrderCartItemRow>(
        supabase
          .from("cart_items")
          .select(
            "id, cart_id, product_id, quantity, unit_price_minor_snapshot",
          )
          .eq("cart_id", cartId),
        `List cart items ${cartId}`,
      );
    },
    async listProductSnapshots(profileId, productIds) {
      if (productIds.length === 0) {
        return [];
      }
      const products = await queryMany<
        Omit<PayPalOrderProductSnapshotRow, "image_path">
      >(
        supabase
          .from("products")
          .select("id, slug, sku, category_id, name, description")
          .eq("profile_id", profileId)
          .in("id", productIds),
        "List PayPal product snapshots",
      );
      const images = await queryMany<{
        readonly product_id: string;
        readonly image_path: string;
      }>(
        supabase
          .from("product_images")
          .select("product_id, image_path")
          .in("product_id", productIds)
          .order("sort_order", { ascending: true }),
        "List PayPal product images",
      );
      const firstImageByProductId = new Map<string, string>();
      for (const image of images) {
        if (!firstImageByProductId.has(image.product_id)) {
          firstImageByProductId.set(image.product_id, image.image_path);
        }
      }

      return products.map((product) => ({
        ...product,
        image_path: firstImageByProductId.get(product.id) ?? null,
      }));
    },
    async listShippingOptions(marketId) {
      return queryMany<PayPalOrderShippingOptionRow>(
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
      return queryMany<PayPalOrderTaxRateRow>(
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
      return queryOne<PayPalOrderStoreRow>(
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
    async listStoreInventory(storeId) {
      return queryMany<PayPalOrderStoreInventoryRow>(
        supabase
          .from("store_inventory")
          .select("store_id, product_id, available_quantity")
          .eq("store_id", storeId),
        `List store inventory ${storeId}`,
      );
    },
    async getPromoEvaluationById(id) {
      return queryOne<PayPalOrderPromoEvaluationRow>(
        supabase
          .from("promo_evaluations")
          .select("id, merchandise_discount_minor, selected_set_json")
          .eq("id", id)
          .maybeSingle(),
        `Load promo evaluation ${id}`,
      );
    },
    async listPromoRules(input) {
      return queryMany<PayPalOrderPromoRuleRow>(
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
        "List PayPal promo rules",
      );
    },
    async listPromoRuleRegions(input) {
      return queryMany<PayPalOrderPromoRuleRegionRow>(
        supabase
          .from("promo_rule_regions")
          .select(
            "promo_rule_id, country_code, state, county, postal_code_prefix, include_exclude",
          )
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List PayPal promo rule regions",
      );
    },
    async listPromoRuleProducts(input) {
      return queryMany<PayPalOrderPromoRuleProductRow>(
        supabase
          .from("promo_rule_products")
          .select("promo_rule_id, product_id, category_id, include_exclude")
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List PayPal promo rule products",
      );
    },
    async listPromoCompatibility(input) {
      return queryMany<PayPalOrderPromoCompatibilityRow>(
        supabase
          .from("promo_compatibility")
          .select("promo_rule_id, compatible_promo_rule_id, compatibility")
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId),
        "List PayPal promo compatibility",
      );
    },
    async createPromoEvaluation(evaluation, lines) {
      const createdEvaluation =
        await queryRequired<PayPalOrderPromoEvaluationWriteRow>(
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
          "Create PayPal promo evaluation",
        );

      if (lines.length > 0) {
        await queryMany<PayPalOrderPromoEvaluationLineRow>(
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
          "Create PayPal promo evaluation lines",
        );
      }

      return createdEvaluation;
    },
    async findPendingOrderByCheckoutDraftId(checkoutDraftId, fulfillmentMode) {
      return queryOne<PayPalOrderRow>(
        supabase
          .from("orders")
          .select(orderColumns)
          .eq("checkout_draft_id", checkoutDraftId)
          .eq("fulfillment_mode", fulfillmentMode)
          .eq("status", "pending")
          .maybeSingle(),
        `Load pending order for checkout draft ${checkoutDraftId}`,
      );
    },
    async findPendingOrderByCartId(cartId, fulfillmentMode) {
      return queryOne<PayPalOrderRow>(
        supabase
          .from("orders")
          .select(orderColumns)
          .eq("cart_id", cartId)
          .eq("fulfillment_mode", fulfillmentMode)
          .eq("status", "pending")
          .maybeSingle(),
        `Load pending order for cart ${cartId}`,
      );
    },
    async getOrderById(id) {
      return queryOne<PayPalOrderRow>(
        supabase.from("orders").select(orderColumns).eq("id", id).maybeSingle(),
        `Load order ${id}`,
      );
    },
    async listOrderItems(orderId) {
      return queryMany<PayPalOrderItemWriteInput>(
        supabase
          .from("order_items")
          .select(orderItemColumns)
          .eq("order_id", orderId),
        `List order items ${orderId}`,
      );
    },
    async getNextOrderSequence(input) {
      const latest = await queryOne<{ readonly order_number_sequence: number }>(
        supabase
          .from("orders")
          .select("order_number_sequence")
          .eq("order_number_prefix", input.prefix)
          .like("order_number", `${input.prefix}-${input.date}-%`)
          .order("order_number_sequence", { ascending: false })
          .limit(1)
          .maybeSingle(),
        "Load next order sequence",
      );
      return (latest?.order_number_sequence ?? 0) + 1;
    },
    async createOrder(order) {
      return queryRequired<PayPalOrderRow>(
        supabase
          .from("orders")
          .insert(order as unknown as Record<string, unknown>)
          .select(orderColumns)
          .single(),
        "Create PayPal pending order",
      );
    },
    async updateOrder(orderId, patch) {
      return queryRequired<PayPalOrderRow>(
        supabase
          .from("orders")
          .update(patch as Record<string, unknown>)
          .eq("id", orderId)
          .select(orderColumns)
          .single(),
        `Update PayPal pending order ${orderId}`,
      );
    },
    async replaceOrderItems(orderId, items) {
      await queryMany<unknown>(
        supabase.from("order_items").delete().eq("order_id", orderId),
        `Delete order items ${orderId}`,
      );
      if (items.length > 0) {
        await queryMany<unknown>(
          supabase
            .from("order_items")
            .insert(items as unknown as readonly Record<string, unknown>[])
            .select("id"),
          `Create order items ${orderId}`,
        );
      }
    },
    async replaceOrderAddresses(orderId, addresses) {
      await queryMany<unknown>(
        supabase.from("order_addresses").delete().eq("order_id", orderId),
        `Delete order addresses ${orderId}`,
      );
      if (addresses.length > 0) {
        await queryMany<unknown>(
          supabase
            .from("order_addresses")
            .insert(addresses as unknown as readonly Record<string, unknown>[])
            .select("id"),
          `Create order addresses ${orderId}`,
        );
      }
    },
    async createPaymentSession(session) {
      return queryRequired<PayPalOrderPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .insert(session as unknown as Record<string, unknown>)
          .select(paymentSessionColumns)
          .single(),
        "Create PayPal payment session",
      );
    },
    async listPaymentSessions(orderId) {
      return queryMany<PayPalOrderPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(paymentSessionColumns)
          .eq("order_id", orderId)
          .order("attempt_number", { ascending: false }),
        `List payment sessions ${orderId}`,
      );
    },
    async getPaymentSessionById(id) {
      return queryOne<PayPalOrderPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(paymentSessionColumns)
          .eq("id", id)
          .maybeSingle(),
        `Load payment session ${id}`,
      );
    },
    async getPaymentSessionByPayPalOrderId(paypalOrderId) {
      return queryOne<PayPalOrderPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .select(paymentSessionColumns)
          .eq("paypal_order_id", paypalOrderId)
          .maybeSingle(),
        `Load payment session for PayPal order ${paypalOrderId}`,
      );
    },
    async updatePaymentSession(paymentSessionId, patch) {
      return queryRequired<PayPalOrderPaymentSessionRow>(
        supabase
          .from("payment_sessions")
          .update(patch as Record<string, unknown>)
          .eq("id", paymentSessionId)
          .select(paymentSessionColumns)
          .single(),
        `Update payment session ${paymentSessionId}`,
      );
    },
    async createTotalSnapshot(snapshot) {
      await queryRequired<{ readonly id: string }>(
        supabase
          .from("total_snapshots")
          .insert(snapshot as unknown as Record<string, unknown>)
          .select("id")
          .single(),
        "Create PayPal total snapshot",
      );
    },
    async createPayPalOrderSnapshot(snapshot) {
      await queryRequired<{ readonly payment_session_id: string }>(
        supabase
          .from("paypal_order_snapshots")
          .insert(snapshot as unknown as Record<string, unknown>)
          .select("payment_session_id")
          .single(),
        "Create PayPal order snapshot",
      );
    },
    async createOrderLifecycleEvent(event) {
      await queryRequired<{ readonly id: string }>(
        supabase
          .from("order_lifecycle_events")
          .insert(event as unknown as Record<string, unknown>)
          .select("id")
          .single(),
        `Create order lifecycle event ${event.order_id}`,
      );
    },
    async deleteCartItemsByProductIds(input) {
      if (input.productIds.length === 0) {
        return;
      }
      await queryMany<unknown>(
        supabase
          .from("cart_items")
          .delete()
          .eq("cart_id", input.cartId)
          .in("product_id", input.productIds),
        `Delete captured cart items ${input.cartId}`,
      );
    },
    async decrementCentralInventory(input) {
      const currentInventory =
        await queryRequired<PayPalOrderCentralInventoryRow>(
          supabase
            .from("central_inventory")
            .select("profile_id, market_id, product_id, available_quantity")
            .eq("profile_id", input.profileId)
            .eq("market_id", input.marketId)
            .eq("product_id", input.productId)
            .single(),
          `Load central inventory ${input.productId}`,
        );
      const nextQuantity = subtractMinor(
        currentInventory.available_quantity,
        input.quantity,
      );

      await queryRequired<{ readonly product_id: string }>(
        supabase
          .from("central_inventory")
          .update({ available_quantity: nextQuantity })
          .eq("profile_id", input.profileId)
          .eq("market_id", input.marketId)
          .eq("product_id", input.productId)
          .select("product_id")
          .single(),
        `Decrement central inventory ${input.productId}`,
      );
    },
    async decrementStoreInventory(input) {
      const currentInventory =
        await queryRequired<PayPalOrderStoreInventoryRow>(
          supabase
            .from("store_inventory")
            .select("store_id, product_id, available_quantity")
            .eq("store_id", input.storeId)
            .eq("product_id", input.productId)
            .single(),
          `Load store inventory ${input.productId}`,
        );
      const nextQuantity = subtractMinor(
        currentInventory.available_quantity,
        input.quantity,
      );

      await queryRequired<{ readonly product_id: string }>(
        supabase
          .from("store_inventory")
          .update({ available_quantity: nextQuantity })
          .eq("store_id", input.storeId)
          .eq("product_id", input.productId)
          .select("product_id")
          .single(),
        `Decrement store inventory ${input.productId}`,
      );
    },
    async updateCheckoutDraftStatus(input) {
      await queryRequired<{ readonly id: string }>(
        supabase
          .from("checkout_drafts")
          .update({
            status: input.status,
            updated_at: input.updatedAt,
          })
          .eq("id", input.draftId)
          .select("id")
          .single(),
        `Update checkout draft status ${input.draftId}`,
      );
    },
  };
}

async function queryOne<TRow>(
  query: PromiseLike<SupabasePayPalOrderResult<unknown>>,
  description: string,
): Promise<TRow | null> {
  const result = await query;
  if (result.error) {
    throw new Error(`${description}: ${result.error.message}`);
  }
  return result.data === null ? null : (result.data as TRow);
}

async function queryRequired<TRow>(
  query: PromiseLike<SupabasePayPalOrderResult<unknown>>,
  description: string,
): Promise<TRow> {
  const row = await queryOne<TRow>(query, description);
  if (!row) {
    throw new Error(`${description}: expected row`);
  }
  return row;
}

async function queryMany<TRow>(
  query: PromiseLike<SupabasePayPalOrderResult<unknown>>,
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
    return [];
  }
  return result.data as TRow[];
}

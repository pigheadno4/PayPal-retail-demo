import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createSupabasePayPalOrderRepository,
  type PayPalOrderCartItemRow,
  type PayPalOrderCartRow,
  type PayPalOrderCheckoutDraftRow,
  type PayPalOrderDataSource,
  type PayPalOrderMarketRow,
  type PayPalOrderPaymentSessionRow,
  type PayPalOrderPromoCompatibilityRow,
  type PayPalOrderProductSnapshotRow,
  type PayPalOrderPromoEvaluationLineRow,
  type PayPalOrderProfileRow,
  type PayPalOrderPromoEvaluationWriteRow,
  type PayPalOrderPromoEvaluationRow,
  type PayPalOrderPromoRuleProductRow,
  type PayPalOrderPromoRuleRegionRow,
  type PayPalOrderPromoRuleRow,
  type PayPalOrderRow,
  type PayPalOrderSavedPaymentMethodRow,
  type PayPalOrderShippingOptionRow,
  type PayPalOrderStoreInventoryRow,
  type PayPalOrderStoreRow,
  type PayPalOrderTaxRateRow,
  type PayPalOrderTotalSnapshotRow,
} from "../src/repositories/paypalOrderRepository.js";
import type { PayPalCreateOrderOperationContext } from "../src/routes/paypal.js";

interface FakeCentralInventoryRow {
  readonly profile_id: string;
  readonly market_id: string;
  readonly product_id: string;
  available_quantity: number;
}

interface FakeOrderLifecycleEventRow {
  readonly id: string;
  readonly order_id: string;
  readonly from_status: PayPalOrderRow["status"] | null;
  readonly to_status: PayPalOrderRow["status"];
  readonly actor_type: "system" | "admin" | "webhook";
  readonly note: string | null;
  readonly created_at: string;
}

describe("Supabase-backed PayPal order repository", () => {
  it("creates a pending delivery order and payment session from a checkout draft", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      authenticatedContext(),
      {
        kind: "delivery",
        method: "paypal",
        checkoutDraftId: "draft_delivery",
      },
    );

    expect(preparedOrder).toMatchObject({
      kind: "delivery",
      orderNumber: "DO-20260601-000007",
      paymentSessionId: "payment_session_new_1",
      paypalInvoiceId: "DO-20260601-000007",
      paypalRequestId: "request_new_1",
      method: "paypal",
      currencyCode: "USD",
      shippingAmountMinor: 595,
      taxAmountMinor: 219,
      discountAmountMinor: 500,
      shippingAddress: {
        fullName: "Delivery Buyer",
        addressLine1: "100 Market St",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
      items: [
        {
          name: "Labubu Macaron Vinyl Face",
          quantity: 1,
          unitAmountMinor: 2999,
          lineTaxAmountMinor: 219,
          sku: "POP-LABUBU-009",
          description: "A smiling vinyl face blind box.",
          url: "https://api.example.test/popmart/products/labubu-macaron-vinyl-face",
          imageUrl:
            "https://api.example.test/popmart/products/labubu-macaron-vinyl-face-1.webp",
        },
      ],
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_new_1",
        order_number: "DO-20260601-000007",
        order_number_prefix: "DO",
        order_number_sequence: 7,
        auth_user_id: "user_123",
        cart_id: "cart_user",
        checkout_draft_id: "draft_delivery",
        fulfillment_mode: "delivery",
        status: "pending",
        payment_status: "started",
        subtotal_minor: 2999,
        discount_minor: 500,
        tax_minor: 219,
        shipping_minor: 595,
        total_minor: 3313,
      }),
    );
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_new_1",
        order_id: "order_new_1",
        method: "paypal",
        status: "created",
        attempt_number: 1,
        paypal_invoice_id: "DO-20260601-000007",
        paypal_request_id: "request_new_1",
        merchant_total_minor: 3313,
        currency_code: "USD",
      }),
    );
    expect(dataSource.orderItems).toContainEqual(
      expect.objectContaining({
        product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
        product_image_url_snapshot:
          "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      }),
    );
    expect(dataSource.checkoutDraftStatusUpdates).toEqual([
      {
        draftId: "draft_delivery",
        status: "payment_started",
        updatedAt: "2026-06-01T10:00:00.000Z",
      },
    ]);
  });

  it("re-evaluates auto promos when resuming a pending delivery order", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.orders.push({
      id: "order_resume_delivery",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000005",
      order_number_prefix: "DO",
      order_number_sequence: 5,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_delivery",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 1000,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 1000,
    });
    markDeliveryDraftForResume(dataSource, "order_resume_delivery");
    dataSource.orderItems.push({
      id: "order_item_resume_delivery",
      order_id: "order_resume_delivery",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 2999,
      quantity: 1,
      fulfillable_quantity: 1,
      unavailable_quantity: 0,
      line_subtotal_minor: 2999,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 2999,
    });
    dataSource.paymentSessions.push({
      id: "payment_session_resume_old",
      order_id: "order_resume_delivery",
      provider: "paypal",
      method: "paypal",
      status: "expired",
      attempt_number: 1,
      paypal_order_id: "OLD_PAYPAL_ORDER",
      paypal_capture_id: null,
      paypal_invoice_id: "DO-20260601-000005",
      paypal_request_id: "request_resume_old",
      vault_requested: false,
      merchant_total_minor: 1000,
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      paypal_config_snapshot_json: {
        source_fingerprint: "stale",
      },
    });
    dataSource.promoRules.push({
      id: "promo_resume_auto800",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "AUTO800",
      promo_type: "auto",
      discount_type: "fixed_amount",
      discount_value: 800,
      min_merchandise_subtotal_minor: 2000,
      starts_at: "2026-05-01T00:00:00.000Z",
      ends_at: "2026-07-01T00:00:00.000Z",
      is_stackable: true,
      priority: 10,
      is_active: true,
    });
    dataSource.promoRuleRegions.push({
      promo_rule_id: "promo_resume_auto800",
      country_code: "US",
      state: "CA",
      county: null,
      postal_code_prefix: null,
      include_exclude: "include",
    });
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      authenticatedContext(),
      {
        kind: "delivery",
        method: "paypal",
        checkoutDraftId: "draft_delivery",
      },
    );

    expect(preparedOrder).toMatchObject({
      kind: "delivery",
      orderNumber: "DO-20260601-000005",
      paymentSessionId: "payment_session_new_1",
      paypalInvoiceId: "DO-20260601-000005-A2",
      shippingAmountMinor: 595,
      taxAmountMinor: 192,
      discountAmountMinor: 800,
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_resume_delivery",
        subtotal_minor: 2999,
        discount_minor: 800,
        tax_minor: 192,
        shipping_minor: 595,
        total_minor: 2986,
      }),
    );
    expect(dataSource.promoEvaluations).toContainEqual(
      expect.objectContaining({
        id: "promo_eval_new_1",
        checkout_draft_id: "draft_delivery",
        order_id: "order_resume_delivery",
        matched_promos_json: ["AUTO800"],
        recommended_set_json: ["AUTO800"],
        selected_set_json: ["AUTO800"],
        merchandise_discount_minor: 800,
        taxable_subtotal_minor: 2199,
        final_total_minor: 2199,
        evaluation_context_json: expect.objectContaining({
          fulfillment_mode: "delivery",
          source: "pending_resume",
          shipping_minor: 595,
          merchandise_subtotal_minor: 2999,
        }),
      }),
    );
    expect(dataSource.totalSnapshots).toContainEqual(
      expect.objectContaining({
        checkout_draft_id: "draft_delivery",
        order_id: "order_resume_delivery",
        payment_session_id: "payment_session_new_1",
        calculation_stage: "pending_resume",
        promo_discount_minor: 800,
        taxable_subtotal_minor: 2199,
        tax_minor: 192,
        shipping_minor: 595,
        total_minor: 2986,
        promo_evaluation_id: "promo_eval_new_1",
      }),
    );
  });

  it("creates a resumed delivery payment from saved order items and never reuses invalid sessions", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.orders.push({
      id: "order_resume_snapshot",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000008",
      order_number_prefix: "DO",
      order_number_sequence: 8,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_delivery",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 3198,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 3198,
    });
    markDeliveryDraftForResume(dataSource, "order_resume_snapshot");
    dataSource.orderItems.push({
      id: "order_item_resume_snapshot",
      order_id: "order_resume_snapshot",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 1599,
      quantity: 2,
      fulfillable_quantity: 2,
      unavailable_quantity: 0,
      line_subtotal_minor: 3198,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 3198,
    });
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      authenticatedContext(),
      {
        kind: "delivery",
        method: "paypal",
        checkoutDraftId: "draft_delivery",
      },
    );

    expect(preparedOrder).toMatchObject({
      orderNumber: "DO-20260601-000008",
      items: [
        expect.objectContaining({
          quantity: 2,
          unitAmountMinor: 1599,
        }),
      ],
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_resume_snapshot",
        subtotal_minor: 3198,
      }),
    );
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        order_id: "order_resume_snapshot",
        paypal_config_snapshot_json: expect.objectContaining({
          order_source: "pending_resume",
        }),
      }),
    );
    expect(dataSource.orderItems).toContainEqual(
      expect.objectContaining({
        order_id: "order_resume_snapshot",
        unit_price_minor: 1599,
        quantity: 2,
      }),
    );

    let previousSessionId = preparedOrder.paymentSessionId;
    for (const status of ["failed", "cancelled", "expired"] as const) {
      const sessionIndex = dataSource.paymentSessions.findIndex(
        (session) => session.id === previousSessionId,
      );
      dataSource.paymentSessions[sessionIndex] = {
        ...dataSource.paymentSessions[sessionIndex]!,
        status,
      };

      const retry = await repository.prepareCreateOrder(
        authenticatedContext(),
        {
          kind: "delivery",
          method: "paypal",
          checkoutDraftId: "draft_delivery",
        },
      );

      expect(retry.paymentSessionId).not.toBe(previousSessionId);
      previousSessionId = retry.paymentSessionId;
    }
  });

  it("prepares an explicitly resumed order from its locked storefront and historical cart", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.orders.push({
      id: "order_resume_locked_context",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000010",
      order_number_prefix: "DO",
      order_number_sequence: 10,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_delivery",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 3198,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 3198,
    });
    markDeliveryDraftForResume(dataSource, "order_resume_locked_context");
    dataSource.orderItems.push({
      id: "order_item_resume_locked_context",
      order_id: "order_resume_locked_context",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 1599,
      quantity: 2,
      fulfillable_quantity: 2,
      unavailable_quantity: 0,
      line_subtotal_minor: 3198,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 3198,
    });
    dataSource.carts[0] = {
      ...dataSource.carts[0]!,
      status: "merged",
    };
    dataSource.carts.push({
      id: "cart_user_new_gb",
      profile_id: "profile_generic",
      market_id: "market_gb",
      auth_user_id: "user_123",
      cart_public_id: "cart_public_user_new_gb",
      cart_secret_hash: null,
      status: "active",
    });
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      {
        storefrontContext: {
          profileSlug: "generic",
          marketCode: "GB",
        },
        buyer: {
          kind: "authenticated",
          userId: "user_123",
          email: "buyer@example.com",
        },
        guestCart: null,
      },
      {
        kind: "delivery",
        method: "paypal",
        checkoutDraftId: "draft_delivery",
      },
    );

    expect(preparedOrder).toMatchObject({
      orderNumber: "DO-20260601-000010",
      currencyCode: "USD",
      items: [
        expect.objectContaining({
          quantity: 2,
          unitAmountMinor: 1599,
        }),
      ],
    });
  });

  it("treats an unmarked pending order as a normal checkout retry and clears captured cart items", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.orders.push({
      id: "order_checkout_retry",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000009",
      order_number_prefix: "DO",
      order_number_sequence: 9,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_delivery",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 3198,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 3198,
    });
    dataSource.orderItems.push({
      id: "order_item_checkout_retry",
      order_id: "order_checkout_retry",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 1599,
      quantity: 2,
      fulfillable_quantity: 2,
      unavailable_quantity: 0,
      line_subtotal_minor: 3198,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 3198,
    });
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      authenticatedContext(),
      {
        kind: "delivery",
        method: "paypal",
        checkoutDraftId: "draft_delivery",
      },
    );

    expect(preparedOrder.items).toEqual([
      expect.objectContaining({
        quantity: 1,
        unitAmountMinor: 2999,
      }),
    ]);
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: preparedOrder.paymentSessionId,
        paypal_config_snapshot_json: expect.objectContaining({
          order_source: "checkout",
        }),
      }),
    );

    const sessionIndex = dataSource.paymentSessions.findIndex(
      (session) => session.id === preparedOrder.paymentSessionId,
    );
    dataSource.paymentSessions[sessionIndex] = {
      ...dataSource.paymentSessions[sessionIndex]!,
      paypal_order_id: "PAYPAL_ORDER_RETRY",
      provider_total_minor: 3313,
      amount_consistency_status: "matched",
    };
    dataSource.orderOperationLocks.set("order_checkout_retry", {
      kind: "capture",
      token: "request_retry_capture",
    });
    await repository.recordCaptureResult({
      paymentSessionId: preparedOrder.paymentSessionId,
      paypalOrderId: "PAYPAL_ORDER_RETRY",
      paypalCaptureId: "PAYPAL_CAPTURE_RETRY",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: "request_retry_capture",
      response: {
        paypalOrderId: "PAYPAL_ORDER_RETRY",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_RETRY",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_RETRY",
          status: "COMPLETED",
        },
      },
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 2999,
        shippingMinor: 595,
        taxMinor: 219,
        discountMinor: 500,
        totalMinor: 3313,
      },
      amountGuard: {
        action: "allow_capture",
        status: "matched",
        can_capture: true,
        tolerance_minor: 0,
        mismatches: [],
      },
    });

    expect(dataSource.cartItems).not.toContainEqual(
      expect.objectContaining({ id: "item_user_labubu" }),
    );
  });

  it("prepares a BOPIS PayPal order with only pickup-available quantities", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(
      authenticatedPickupContext(),
      {
        kind: "bopis",
        method: "paylater",
        checkoutDraftId: "draft_pickup",
      },
    );

    expect(preparedOrder).toMatchObject({
      kind: "bopis",
      orderNumber: "PO-20260601-000004",
      paymentSessionId: "payment_session_new_1",
      paypalInvoiceId: "PO-20260601-000004",
      paypalRequestId: "request_new_1",
      method: "paylater",
      currencyCode: "USD",
      taxAmountMinor: 262,
      discountAmountMinor: 0,
      pickupStore: {
        storeName: "POP MART San Francisco Centre",
        addressLine1: "865 Market Street",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94103",
        countryCode: "US",
      },
      items: [
        {
          name: "Labubu Macaron Vinyl Face",
          quantity: 1,
          unitAmountMinor: 2999,
          lineTaxAmountMinor: 262,
        },
      ],
    });
    expect(dataSource.orderItems).toContainEqual(
      expect.objectContaining({
        order_id: "order_new_1",
        product_id: "product_labubu",
        quantity: 2,
        fulfillable_quantity: 1,
        unavailable_quantity: 1,
        line_subtotal_minor: 2999,
        line_tax_minor: 262,
        line_total_minor: 3261,
      }),
    );
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        order_number: "PO-20260601-000004",
        order_number_prefix: "PO",
        order_number_sequence: 4,
        fulfillment_mode: "pickup",
        shipping_minor: 0,
        total_minor: 3261,
      }),
    );
  });

  it("prepares express delivery from a verified guest cart with a shipping callback URL", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(guestContext(), {
      kind: "express_delivery",
      method: "venmo",
      cartId: "cart_public_guest",
    });

    expect(preparedOrder).toMatchObject({
      kind: "express_delivery",
      orderNumber: "DO-20260601-000007",
      paymentSessionId: "payment_session_new_1",
      paypalInvoiceId: "DO-20260601-000007",
      paypalRequestId: "request_new_1",
      method: "venmo",
      currencyCode: "USD",
      shippingAmountMinor: 0,
      taxAmountMinor: 0,
      discountAmountMinor: 0,
      shippingCallbackUrl:
        "https://api.example.test/api/paypal/orders/order_new_1/shipping-callback",
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_new_1",
        auth_user_id: null,
        cart_id: "cart_guest",
        fulfillment_mode: "delivery",
        total_minor: 2999,
      }),
    );
  });

  it("reuses the latest cart-scoped express pending order when previous attempts exist", async () => {
    const dataSource = createPayPalOrderDataSource();
    const expressOrder = dataSource.orders.find(
      (order) => order.id === "order_express",
    );
    if (!expressOrder) {
      throw new Error("Missing express order fixture");
    }
    dataSource.orders.push(
      {
        ...expressOrder,
        id: "order_guest_express_older",
        order_number: "DO-20260601-000008",
        order_number_sequence: 8,
        cart_id: "cart_guest",
        checkout_draft_id: null,
        total_minor: 2999,
      },
      {
        ...expressOrder,
        id: "order_guest_express_latest",
        order_number: "DO-20260601-000009",
        order_number_sequence: 9,
        cart_id: "cart_guest",
        checkout_draft_id: null,
        total_minor: 2999,
      },
    );
    const repository = createRepository(dataSource);

    const preparedOrder = await repository.prepareCreateOrder(guestContext(), {
      kind: "express_delivery",
      method: "paypal",
      cartId: "cart_public_guest",
    });

    expect(preparedOrder).toMatchObject({
      kind: "express_delivery",
      orderNumber: "DO-20260601-000009",
      paymentSessionId: "payment_session_new_1",
      paypalInvoiceId: "DO-20260601-000009",
      paypalRequestId: "request_new_1",
    });
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_new_1",
        order_id: "order_guest_express_latest",
        attempt_number: 1,
      }),
    );
  });

  it("creates a new express payment-session attempt after a provider order was already created", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    const firstPreparedOrder = await repository.prepareCreateOrder(
      guestContext(),
      {
        kind: "express_delivery",
        method: "paypal",
        cartId: "cart_public_guest",
      },
    );
    const firstSessionIndex = dataSource.paymentSessions.findIndex(
      (session) => session.id === firstPreparedOrder.paymentSessionId,
    );
    if (firstSessionIndex < 0) {
      throw new Error("Missing first payment session");
    }
    dataSource.paymentSessions[firstSessionIndex] = {
      ...dataSource.paymentSessions[firstSessionIndex]!,
      paypal_order_id: "PAYPAL_ORDER_CREATED_1",
      provider_total_minor: 2999,
      amount_consistency_status: "matched",
    };

    const secondPreparedOrder = await repository.prepareCreateOrder(
      guestContext(),
      {
        kind: "express_delivery",
        method: "paypal",
        cartId: "cart_public_guest",
      },
    );

    expect(secondPreparedOrder).toMatchObject({
      kind: "express_delivery",
      orderNumber: firstPreparedOrder.orderNumber,
      paymentSessionId: "payment_session_new_2",
      paypalInvoiceId: `${firstPreparedOrder.orderNumber}-A2`,
      paypalRequestId: "request_new_2",
    });
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_new_2",
        attempt_number: 2,
        paypal_invoice_id: `${firstPreparedOrder.orderNumber}-A2`,
        paypal_request_id: "request_new_2",
      }),
    );
  });

  it("recalculates and persists express shipping callback totals", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.taxRates.splice(0, dataSource.taxRates.length, {
      id: "tax_sf_postal",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: "San Francisco",
      postal_code_prefix: "941",
      rate_bps: 875,
      is_active: true,
    });
    const repository = createRepository(dataSource);

    const result = await repository.handleExpressShippingCallback({
      callbackContextId: "order_express",
      paypalOrderId: "PAYPAL_ORDER_EXPRESS",
      shippingAddress: {
        countryCode: "US",
        adminArea1: "CA",
        adminArea2: "San Francisco",
        postalCode: "94105",
      },
      selectedShippingOptionId: "ship_express_ca",
      rawCallbackRequest: {
        id: "PAYPAL_ORDER_EXPRESS",
        shipping_address: {
          country_code: "US",
          admin_area_1: "CA",
          admin_area_2: "San Francisco",
          postal_code: "94105",
        },
        shipping_option: {
          id: "ship_express_ca",
        },
      },
    });

    expect(result).toEqual({
      action: "success",
      response: {
        id: "PAYPAL_ORDER_EXPRESS",
        purchase_units: [
          {
            reference_id: "DO-20260601-000002",
            amount: {
              currency_code: "USD",
              value: "47.61",
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "29.99",
                },
                tax_total: {
                  currency_code: "USD",
                  value: "2.62",
                },
                shipping: {
                  currency_code: "USD",
                  value: "15.00",
                },
              },
            },
            shipping_options: [
              {
                id: "ship_ground_ca",
                type: "SHIPPING",
                label: "Ground",
                selected: false,
                amount: {
                  currency_code: "USD",
                  value: "5.95",
                },
              },
              {
                id: "ship_express_ca",
                type: "SHIPPING",
                label: "Express",
                selected: true,
                amount: {
                  currency_code: "USD",
                  value: "15.00",
                },
              },
            ],
          },
        ],
      },
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_express",
        subtotal_minor: 2999,
        discount_minor: 0,
        tax_minor: 262,
        shipping_minor: 1500,
        total_minor: 4761,
      }),
    );
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_express_existing",
        paypal_order_id: "PAYPAL_ORDER_EXPRESS",
        merchant_total_minor: 4761,
        provider_total_minor: 4761,
        amount_consistency_status: "matched",
      }),
    );
    expect(dataSource.orderItems).toContainEqual(
      expect.objectContaining({
        order_id: "order_express",
        product_id: "product_labubu",
        quantity: 1,
        line_tax_minor: 262,
        line_total_minor: 3261,
      }),
    );
    expect(dataSource.totalSnapshots).toContainEqual(
      expect.objectContaining({
        order_id: "order_express",
        payment_session_id: "payment_session_express_existing",
        calculation_stage: "paypal_shipping_update",
        merchandise_subtotal_minor: 2999,
        promo_discount_minor: 0,
        taxable_subtotal_minor: 2999,
        tax_minor: 262,
        shipping_minor: 1500,
        total_minor: 4761,
        calculation_context_json: {
          kind: "express_delivery",
          paypal_order_id: "PAYPAL_ORDER_EXPRESS",
          selected_shipping_option_id: "ship_express_ca",
          shipping_address: expect.objectContaining({
            country_code: "US",
            admin_area_1: "CA",
            admin_area_2: "San Francisco",
            postal_code: "94105",
          }),
        },
      }),
    );
  });

  it("declines a provider-shaped callback order ID that does not match its payment session", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);
    const totalSnapshotCount = dataSource.totalSnapshots.length;

    const result = await repository.handleExpressShippingCallback({
      callbackContextId: "order_express",
      paypalOrderId: "MALICIOUS_ORDER_123",
      shippingAddress: {
        countryCode: "US",
        adminArea1: "CA",
        adminArea2: "San Francisco",
        postalCode: "94105",
      },
      selectedShippingOptionId: "ship_ground_ca",
      rawCallbackRequest: {
        id: "MALICIOUS_ORDER_123",
      },
    });

    expect(result).toEqual({
      action: "decline",
      statusCode: 422,
      response: {
        name: "UNPROCESSABLE_ENTITY",
        details: [{ issue: "METHOD_UNAVAILABLE" }],
      },
    });
    expect(
      dataSource.paymentSessions.find(
        (session) => session.id === "payment_session_express_existing",
      )?.paypal_order_id,
    ).toBe("PAYPAL_ORDER_EXPRESS");
    expect(dataSource.totalSnapshots).toHaveLength(totalSnapshotCount);
  });

  it("builds an express review snapshot from the latest PayPal shipping update totals", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    await repository.handleExpressShippingCallback({
      callbackContextId: "order_express",
      paypalOrderId: "PAYPAL_ORDER_EXPRESS",
      shippingAddress: {
        fullName: "Taylor Chen",
        addressLine1: "100 Market St",
        addressLine2: "Unit 8",
        countryCode: "US",
        adminArea1: "CA",
        adminArea2: "San Francisco",
        postalCode: "94105",
      },
      selectedShippingOptionId: "ship_ground_ca",
      rawCallbackRequest: {
        id: "PAYPAL_ORDER_EXPRESS",
        shipping_address: {
          name: "Taylor Chen",
          address_line_1: "100 Market St",
          address_line_2: "Unit 8",
          country_code: "US",
          admin_area_1: "CA",
          admin_area_2: "San Francisco",
          postal_code: "94105",
        },
      },
    });

    const reviewSnapshot = await repository.getExpressReviewSnapshot({
      paypalOrderId: "PAYPAL_ORDER_EXPRESS",
      paymentSessionId: null,
    });

    expect(reviewSnapshot).toEqual({
      source_label: "Delivery express",
      order_number: "DO-20260601-000002",
      payment_session_id: "payment_session_express_existing",
      paypal_order_id: "PAYPAL_ORDER_EXPRESS",
      payment_method_label: "PayPal",
      status_label: "Payment session synchronized",
      shipping_address: {
        name: "Taylor Chen",
        address_line1: "100 Market St",
        address_line2: "Unit 8, San Francisco, CA 94105",
        country_code: "US",
      },
      shipping_option: {
        label: "Ground",
        detail: "Arrives in 3-5 business days",
        amount_minor: 595,
        currency_code: "USD",
      },
      items: [
        {
          id: "order_item_new_1",
          name: "Labubu Macaron Vinyl Face",
          detail: "POP-LABUBU-009 - Qty 1",
          amount_minor: 3261,
          currency_code: "USD",
        },
      ],
      totals: {
        merchandise_subtotal_minor: 2999,
        shipping_minor: 595,
        promo_discount_minor: 0,
        tax_minor: 262,
        total_minor: 3856,
        currency_code: "USD",
      },
      amount_guard: {
        action: "allow_capture",
        status: "matched",
        can_capture: true,
        tolerance_minor: 0,
        mismatches: [],
      },
    });
  });

  it("prepares express delivery with the shared default guest cart secret hash", async () => {
    const dataSource = createPayPalOrderDataSource();
    const guestCart = await dataSource.findActiveGuestCart("cart_public_guest");
    if (!guestCart) {
      throw new Error("Guest test cart was not found");
    }
    (guestCart as { cart_secret_hash: string }).cart_secret_hash = createHash(
      "sha256",
    )
      .update("cart_secret_guest")
      .digest("hex");
    const repository = createRepository(dataSource, {
      useDefaultCartSecretHash: true,
    });

    const preparedOrder = await repository.prepareCreateOrder(guestContext(), {
      kind: "express_delivery",
      method: "paypal",
      cartId: "cart_public_guest",
    });

    expect(preparedOrder).toMatchObject({
      kind: "express_delivery",
      orderNumber: "DO-20260601-000007",
      paymentSessionId: "payment_session_new_1",
      method: "paypal",
    });
  });

  it("prepares local express delivery without an HTTPS shipping callback URL", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource, {
      publicApiBaseUrl: "http://127.0.0.1:3000",
    });

    const preparedOrder = await repository.prepareCreateOrder(guestContext(), {
      kind: "express_delivery",
      method: "paypal",
      cartId: "cart_public_guest",
    });

    expect(preparedOrder).toMatchObject({
      kind: "express_delivery",
      shippingCallbackUrl: null,
    });
    expect(preparedOrder.items[0]).toEqual(
      expect.objectContaining({
        imageUrl: null,
        url: null,
      }),
    );
  });

  it("builds an express review snapshot from local review-confirm totals when no PayPal shipping callback exists", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource, {
      publicApiBaseUrl: "http://127.0.0.1:3000",
    });

    const preparedOrder = await repository.prepareCreateOrder(guestContext(), {
      kind: "express_delivery",
      method: "paypal",
      cartId: "cart_public_guest",
    });

    await repository.recordCreateOrderResult(guestContext(), {
      paymentSessionId: preparedOrder.paymentSessionId,
      paypalOrderId: "PAYPAL_ORDER_LOCAL_EXPRESS",
      paypalOrderStatus: "PAYER_ACTION_REQUIRED",
      paypalInvoiceId: preparedOrder.paypalInvoiceId,
      paypalRequestId: preparedOrder.paypalRequestId,
      requestPayload: {
        intent: "CAPTURE",
        purchase_units: [
          {
            invoice_id: preparedOrder.paypalInvoiceId,
            items: [],
            amount: {
              currency_code: "USD",
              value: "29.99",
              breakdown: {
                item_total: { currency_code: "USD", value: "29.99" },
                shipping: { currency_code: "USD", value: "0.00" },
                tax_total: { currency_code: "USD", value: "0.00" },
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "GET_FROM_FILE",
            },
          },
        },
      },
      response: {
        paypalOrderId: "PAYPAL_ORDER_LOCAL_EXPRESS",
        status: "PAYER_ACTION_REQUIRED",
        approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=abc",
        rawResponse: {
          id: "PAYPAL_ORDER_LOCAL_EXPRESS",
          status: "PAYER_ACTION_REQUIRED",
        },
      },
      merchantSnapshot: {
        currencyCode: preparedOrder.currencyCode,
        itemTotalMinor: 2999,
        shippingMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 2999,
      },
    });

    const reviewSnapshot = await repository.getExpressReviewSnapshot({
      paypalOrderId: "PAYPAL_ORDER_LOCAL_EXPRESS",
      paymentSessionId: null,
    });

    expect(reviewSnapshot).toEqual(
      expect.objectContaining({
        source_label: "Delivery express",
        order_number: preparedOrder.orderNumber,
        payment_session_id: preparedOrder.paymentSessionId,
        paypal_order_id: "PAYPAL_ORDER_LOCAL_EXPRESS",
        shipping_address: {
          name: "PayPal buyer",
          address_line1: "Address supplied by PayPal",
          address_line2: "",
          country_code: "US",
        },
        shipping_option: {
          label: "Selected shipping",
          detail: "Shipping option selected in PayPal",
          amount_minor: 0,
          currency_code: "USD",
        },
        totals: {
          merchandise_subtotal_minor: 2999,
          shipping_minor: 0,
          promo_discount_minor: 0,
          tax_minor: 0,
          total_minor: 2999,
          currency_code: "USD",
        },
        amount_guard: {
          action: "allow_capture",
          status: "matched",
          can_capture: true,
          tolerance_minor: 0,
          mismatches: [],
        },
      }),
    );
  });

  it("auto-applies promos during express shipping callback recalculation", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.promoRules.push({
      id: "promo_auto500",
      profile_id: "profile_popmart",
      market_id: "market_us",
      code: "AUTO500",
      promo_type: "auto",
      discount_type: "fixed_amount",
      discount_value: 500,
      min_merchandise_subtotal_minor: 2000,
      starts_at: "2026-05-01T00:00:00.000Z",
      ends_at: "2026-07-01T00:00:00.000Z",
      is_stackable: true,
      priority: 10,
      is_active: true,
    });
    dataSource.promoRuleRegions.push({
      promo_rule_id: "promo_auto500",
      country_code: "US",
      state: "CA",
      county: null,
      postal_code_prefix: null,
      include_exclude: "include",
    });
    const repository = createRepository(dataSource);

    const result = await repository.handleExpressShippingCallback({
      callbackContextId: "order_express",
      paypalOrderId: "PAYPAL_ORDER_EXPRESS",
      shippingAddress: {
        countryCode: "US",
        adminArea1: "CA",
        adminArea2: "San Francisco",
        postalCode: "94105",
      },
      selectedShippingOptionId: "ship_express_ca",
      rawCallbackRequest: {
        id: "PAYPAL_ORDER_EXPRESS",
        shipping_address: {
          country_code: "US",
          admin_area_1: "CA",
          admin_area_2: "San Francisco",
          postal_code: "94105",
        },
        shipping_option: {
          id: "ship_express_ca",
        },
      },
    });

    expect(result).toEqual({
      action: "success",
      response: {
        id: "PAYPAL_ORDER_EXPRESS",
        purchase_units: [
          expect.objectContaining({
            amount: {
              currency_code: "USD",
              value: "42.18",
              breakdown: {
                item_total: {
                  currency_code: "USD",
                  value: "29.99",
                },
                tax_total: {
                  currency_code: "USD",
                  value: "2.19",
                },
                shipping: {
                  currency_code: "USD",
                  value: "15.00",
                },
                discount: {
                  currency_code: "USD",
                  value: "5.00",
                },
              },
            },
          }),
        ],
      },
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_express",
        subtotal_minor: 2999,
        discount_minor: 500,
        tax_minor: 219,
        shipping_minor: 1500,
        total_minor: 4218,
      }),
    );
    expect(dataSource.promoEvaluations).toContainEqual(
      expect.objectContaining({
        id: "promo_eval_new_1",
        checkout_draft_id: null,
        order_id: "order_express",
        matched_promos_json: ["AUTO500"],
        recommended_set_json: ["AUTO500"],
        selected_set_json: ["AUTO500"],
        merchandise_discount_minor: 500,
        taxable_subtotal_minor: 2499,
        final_total_minor: 2499,
        evaluation_context_json: expect.objectContaining({
          fulfillment_mode: "delivery",
          source: "paypal_shipping_update",
          shipping_minor: 1500,
          merchandise_subtotal_minor: 2999,
        }),
      }),
    );
    expect(dataSource.promoEvaluationLines).toContainEqual(
      expect.objectContaining({
        id: "promo_line_new_1",
        promo_evaluation_id: "promo_eval_new_1",
        promo_rule_id: "promo_auto500",
        code_snapshot: "AUTO500",
        evaluation_status: "selected",
        discount_minor: 500,
      }),
    );
    expect(dataSource.totalSnapshots).toContainEqual(
      expect.objectContaining({
        order_id: "order_express",
        promo_discount_minor: 500,
        taxable_subtotal_minor: 2499,
        tax_minor: 219,
        shipping_minor: 1500,
        total_minor: 4218,
        promo_evaluation_id: "promo_eval_new_1",
      }),
    );
  });

  it("records the PayPal create-order response and sanitized snapshot", async () => {
    const dataSource = createPayPalOrderDataSource();
    const repository = createRepository(dataSource);

    await repository.recordCreateOrderResult(authenticatedContext(), {
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalOrderStatus: "CREATED",
      paypalInvoiceId: "DO-20260601-000001",
      paypalRequestId: "request_existing",
      requestPayload: {
        intent: "CAPTURE",
        purchase_units: [
          {
            invoice_id: "DO-20260601-000001",
            items: [],
            amount: {
              currency_code: "USD",
              value: "10.00",
              breakdown: {
                item_total: { currency_code: "USD", value: "10.00" },
                tax_total: { currency_code: "USD", value: "0.00" },
              },
            },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              shipping_preference: "SET_PROVIDED_ADDRESS",
            },
          },
        },
      },
      response: {
        paypalOrderId: "PAYPAL_ORDER_123",
        status: "CREATED",
        approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=abc",
        rawResponse: {
          id: "PAYPAL_ORDER_123",
          payer: {
            email_address: "buyer@example.test",
          },
        },
      },
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 1000,
        shippingMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 1000,
      },
    });

    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_existing",
        paypal_order_id: "PAYPAL_ORDER_123",
        provider_total_minor: 1000,
        amount_consistency_status: "matched",
      }),
    );
    expect(dataSource.paypalSnapshots).toContainEqual(
      expect.objectContaining({
        payment_session_id: "payment_session_existing",
        paypal_invoice_id: "DO-20260601-000001",
        paypal_request_id: "request_existing",
        response_json: {
          id: "PAYPAL_ORDER_123",
          payer: {
            email_address: "[redacted]",
          },
        },
        merchant_snapshot_json: {
          currency_code: "USD",
          item_total_minor: 1000,
          shipping_minor: 0,
          tax_minor: 0,
          discount_minor: 0,
          total_minor: 1000,
        },
      }),
    );
  });

  it("does not prepare capture while a pending order is claimed for resume", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      paypal_order_id: "PAYPAL_ORDER_123",
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
    };
    dataSource.orderOperationLocks.set("order_existing", {
      kind: "resume",
      token: "resume-lock-123",
    });
    const repository = createRepository(dataSource);

    await expect(
      repository.prepareCapture({ paypalOrderId: "PAYPAL_ORDER_123" }),
    ).rejects.toThrow(
      "Order DO-20260601-000001 is busy with another operation",
    );
    expect(dataSource.orders[0]?.status).toBe("pending");
    expect(dataSource.orderOperationLocks.get("order_existing")).toEqual({
      kind: "resume",
      token: "resume-lock-123",
    });
  });

  it("prepares capture with an amount guard and records successful finalization", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      paypal_order_id: "PAYPAL_ORDER_123",
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
    };
    const repository = createRepository(dataSource);

    const preparedCapture = await repository.prepareCapture({
      paypalOrderId: "PAYPAL_ORDER_123",
    });

    expect(preparedCapture).toEqual({
      action: "capture",
      orderNumber: "DO-20260601-000001",
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalRequestId: "request_new_1",
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 1000,
        shippingMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 1000,
      },
      amountGuard: {
        action: "allow_capture",
        status: "matched",
        can_capture: true,
        tolerance_minor: 0,
        mismatches: [],
      },
    });
    expect(dataSource.orderOperationLocks.get("order_existing")).toEqual({
      kind: "capture",
      token: "request_new_1",
    });

    await repository.recordCaptureResult({
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_123",
      paypalCaptureId: "PAYPAL_CAPTURE_123",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: "request_new_1",
      response: {
        paypalOrderId: "PAYPAL_ORDER_123",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_123",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_123",
          status: "COMPLETED",
          payer: {
            email_address: "buyer@example.test",
          },
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: "PAYPAL_CAPTURE_123",
                    status: "COMPLETED",
                    amount: {
                      currency_code: "USD",
                      value: "10.00",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      merchantSnapshot: preparedCapture.merchantSnapshot,
      amountGuard: preparedCapture.amountGuard,
    });

    expect(dataSource.orderOperationLocks.has("order_existing")).toBe(false);

    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_existing",
        status: "paid",
        payment_status: "captured",
      }),
    );
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_existing",
        status: "captured",
        paypal_capture_id: "PAYPAL_CAPTURE_123",
        provider_total_minor: 1000,
        amount_consistency_status: "matched",
      }),
    );
    expect(dataSource.paypalSnapshots).toContainEqual(
      expect.objectContaining({
        payment_session_id: "payment_session_existing",
        paypal_request_id: "request_new_1",
        request_json: {
          operation: "capture",
          paypal_order_id: "PAYPAL_ORDER_123",
          paypal_capture_id: "PAYPAL_CAPTURE_123",
          amount_guard: {
            action: "allow_capture",
            status: "matched",
            can_capture: true,
            tolerance_minor: 0,
            mismatches: [],
          },
        },
        response_json: expect.objectContaining({
          id: "PAYPAL_ORDER_123",
          payer: {
            email_address: "[redacted]",
          },
        }),
      }),
    );
    expect(dataSource.totalSnapshots).toContainEqual(
      expect.objectContaining({
        order_id: "order_existing",
        payment_session_id: "payment_session_existing",
        calculation_stage: "capture",
        merchandise_subtotal_minor: 1000,
        promo_discount_minor: 0,
        taxable_subtotal_minor: 1000,
        tax_minor: 0,
        shipping_minor: 0,
        total_minor: 1000,
      }),
    );
    expect(dataSource.lifecycleEvents).toContainEqual({
      id: "order_lifecycle_event_new_1",
      order_id: "order_existing",
      from_status: "pending",
      to_status: "paid",
      actor_type: "system",
      note: "PayPal capture completed: PAYPAL_CAPTURE_123",
      created_at: "2026-06-01T10:00:00.000Z",
    });
    expect(dataSource.cartItems).not.toContainEqual(
      expect.objectContaining({
        id: "item_user_labubu",
      }),
    );
    expect(dataSource.centralInventory).toContainEqual({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 8,
    });
  });

  it("does not delete a newer active cart when a resumed order is captured", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      paypal_order_id: "PAYPAL_ORDER_RESUMED",
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
      paypal_config_snapshot_json: {
        order_source: "pending_resume",
      },
    };
    const repository = createRepository(dataSource);
    dataSource.orderOperationLocks.set("order_existing", {
      kind: "capture",
      token: "request_resumed_capture",
    });

    await repository.recordCaptureResult({
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_RESUMED",
      paypalCaptureId: "PAYPAL_CAPTURE_RESUMED",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: "request_resumed_capture",
      response: {
        paypalOrderId: "PAYPAL_ORDER_RESUMED",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_RESUMED",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_RESUMED",
          status: "COMPLETED",
        },
      },
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 1000,
        shippingMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 1000,
      },
      amountGuard: {
        action: "allow_capture",
        status: "matched",
        can_capture: true,
        tolerance_minor: 0,
        mismatches: [],
      },
    });

    expect(dataSource.cartItems).toContainEqual(
      expect.objectContaining({
        id: "item_user_labubu",
        quantity: 1,
        unit_price_minor_snapshot: 2999,
      }),
    );
    expect(dataSource.centralInventory).toContainEqual({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 8,
    });
  });

  it("creates an active saved payment when capture returns a vaulted card token", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      method: "card",
      paypal_order_id: "PAYPAL_ORDER_VAULTED",
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
      vault_requested: true,
    };
    const repository = createRepository(dataSource);

    const preparedCapture = await repository.prepareCapture({
      paypalOrderId: "PAYPAL_ORDER_VAULTED",
    });
    if (preparedCapture.action !== "capture") {
      throw new Error("Expected capture to be allowed");
    }

    await repository.recordCaptureResult({
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_VAULTED",
      paypalCaptureId: "PAYPAL_CAPTURE_VAULTED",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: preparedCapture.paypalRequestId,
      response: {
        paypalOrderId: "PAYPAL_ORDER_VAULTED",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_VAULTED",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_VAULTED",
          status: "COMPLETED",
          payment_source: {
            card: {
              brand: "VISA",
              last_digits: "1111",
              expiry: "2027-02",
              attributes: {
                customer: {
                  id: "paypal_customer_123",
                },
                vault: {
                  status: "VAULTED",
                  id: "vault_card_123",
                },
              },
            },
          },
        },
      },
      merchantSnapshot: preparedCapture.merchantSnapshot,
      amountGuard: preparedCapture.amountGuard,
    });

    expect(dataSource.savedPaymentMethods).toContainEqual({
      id: "saved_payment_new_1",
      auth_user_id: "user_123",
      provider: "paypal",
      method_type: "card",
      status: "active",
      vault_id: "vault_card_123",
      paypal_customer_id: "paypal_customer_123",
      brand: "VISA",
      last4: "1111",
      expiry_month: 2,
      expiry_year: 2027,
      label: "Visa ending in 1111",
      created_at: "2026-06-01T10:00:00.000Z",
      updated_at: "2026-06-01T10:00:00.000Z",
    });
  });

  it("creates a pending saved payment when capture approves vaulting before token creation", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      method: "card",
      paypal_order_id: "PAYPAL_ORDER_APPROVED_VAULT",
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
      vault_requested: true,
    };
    const repository = createRepository(dataSource);

    const preparedCapture = await repository.prepareCapture({
      paypalOrderId: "PAYPAL_ORDER_APPROVED_VAULT",
    });
    if (preparedCapture.action !== "capture") {
      throw new Error("Expected capture to be allowed");
    }

    await repository.recordCaptureResult({
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_APPROVED_VAULT",
      paypalCaptureId: "PAYPAL_CAPTURE_APPROVED_VAULT",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: preparedCapture.paypalRequestId,
      response: {
        paypalOrderId: "PAYPAL_ORDER_APPROVED_VAULT",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_APPROVED_VAULT",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_APPROVED_VAULT",
          status: "COMPLETED",
          payment_source: {
            card: {
              brand: "MASTERCARD",
              last_digits: "4444",
              expiry: "2028-09",
              attributes: {
                customer: {
                  id: "paypal_customer_456",
                },
                vault: {
                  status: "APPROVED",
                },
              },
            },
          },
        },
      },
      merchantSnapshot: preparedCapture.merchantSnapshot,
      amountGuard: preparedCapture.amountGuard,
    });

    expect(dataSource.savedPaymentMethods).toContainEqual(
      expect.objectContaining({
        id: "saved_payment_new_1",
        auth_user_id: "user_123",
        method_type: "card",
        status: "pending",
        vault_id: null,
        paypal_customer_id: "paypal_customer_456",
        brand: "MASTERCARD",
        last4: "4444",
        expiry_month: 9,
        expiry_year: 2028,
        label: "Mastercard ending in 4444",
      }),
    );
  });

  it("blocks capture preparation when the provider amount no longer matches the merchant total", async () => {
    const dataSource = createPayPalOrderDataSource();
    dataSource.paymentSessions[0] = {
      ...dataSource.paymentSessions[0]!,
      paypal_order_id: "PAYPAL_ORDER_123",
      provider_total_minor: 1001,
      amount_consistency_status: "mismatch",
    };
    const repository = createRepository(dataSource);

    const preparedCapture = await repository.prepareCapture({
      paypalOrderId: "PAYPAL_ORDER_123",
    });

    expect(preparedCapture).toEqual({
      action: "block",
      orderNumber: "DO-20260601-000001",
      paymentSessionId: "payment_session_existing",
      paypalOrderId: "PAYPAL_ORDER_123",
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 1000,
        shippingMinor: 0,
        taxMinor: 0,
        discountMinor: 0,
        totalMinor: 1000,
      },
      amountGuard: {
        action: "block_capture",
        status: "mismatch",
        can_capture: false,
        tolerance_minor: 0,
        mismatches: [
          {
            reason: "total_mismatch",
            expected_minor: 1000,
            actual_minor: 1001,
            expected_currency_code: "USD",
            actual_currency_code: "USD",
          },
        ],
      },
    });
    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_existing",
        status: "pending",
        payment_status: "started",
      }),
    );
    expect(dataSource.paymentSessions).toContainEqual(
      expect.objectContaining({
        id: "payment_session_existing",
        amount_consistency_status: "mismatch",
      }),
    );
  });

  it("records BOPIS capture finalization against the selected store inventory", async () => {
    const dataSource = createPayPalOrderDataSource();
    const pickupOrderIndex = dataSource.orders.findIndex(
      (order) => order.id === "order_existing_pickup",
    );
    dataSource.orders[pickupOrderIndex] = {
      ...dataSource.orders[pickupOrderIndex]!,
      checkout_draft_id: "draft_pickup",
    };
    dataSource.paymentSessions.push({
      id: "payment_session_pickup",
      order_id: "order_existing_pickup",
      provider: "paypal",
      method: "paypal",
      status: "created",
      attempt_number: 1,
      paypal_order_id: "PAYPAL_ORDER_PICKUP",
      paypal_capture_id: null,
      paypal_invoice_id: "PO-20260601-000003",
      paypal_request_id: "request_pickup_existing",
      vault_requested: false,
      merchant_total_minor: 1000,
      provider_total_minor: 1000,
      amount_consistency_status: "matched",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      paypal_config_snapshot_json: {},
    });
    dataSource.orderItems.push({
      id: "order_item_pickup",
      order_id: "order_existing_pickup",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 1000,
      quantity: 1,
      fulfillable_quantity: 1,
      unavailable_quantity: 0,
      line_subtotal_minor: 1000,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 1000,
    });
    const repository = createRepository(dataSource);

    const preparedCapture = await repository.prepareCapture({
      paypalOrderId: "PAYPAL_ORDER_PICKUP",
    });
    if (preparedCapture.action !== "capture") {
      throw new Error("Expected BOPIS capture to be allowed");
    }

    await repository.recordCaptureResult({
      paymentSessionId: "payment_session_pickup",
      paypalOrderId: "PAYPAL_ORDER_PICKUP",
      paypalCaptureId: "PAYPAL_CAPTURE_PICKUP",
      paypalOrderStatus: "COMPLETED",
      paypalCaptureStatus: "COMPLETED",
      paypalRequestId: preparedCapture.paypalRequestId,
      response: {
        paypalOrderId: "PAYPAL_ORDER_PICKUP",
        status: "COMPLETED",
        captureId: "PAYPAL_CAPTURE_PICKUP",
        captureStatus: "COMPLETED",
        rawResponse: {
          id: "PAYPAL_ORDER_PICKUP",
          status: "COMPLETED",
        },
      },
      merchantSnapshot: preparedCapture.merchantSnapshot,
      amountGuard: preparedCapture.amountGuard,
    });

    expect(dataSource.orders).toContainEqual(
      expect.objectContaining({
        id: "order_existing_pickup",
        status: "paid",
        payment_status: "captured",
      }),
    );
    expect(dataSource.storeInventory).toContainEqual({
      store_id: "store_sf",
      product_id: "product_labubu",
      available_quantity: 0,
    });
    expect(dataSource.centralInventory).toContainEqual({
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 9,
    });
  });
});

function createRepository(
  dataSource: FakePayPalOrderDataSource,
  options: {
    readonly publicApiBaseUrl?: string;
    readonly useDefaultCartSecretHash?: boolean;
  } = {},
) {
  let orderId = 0;
  let paymentSessionId = 0;
  let orderItemId = 0;
  let orderAddressId = 0;
  let totalSnapshotId = 0;
  let promoEvaluationId = 0;
  let promoEvaluationLineId = 0;
  let orderLifecycleEventId = 0;
  let requestId = 0;
  let savedPaymentMethodId = 0;

  return createSupabasePayPalOrderRepository({
    dataSource,
    now: "2026-06-01T10:00:00.000Z",
    publicApiBaseUrl: options.publicApiBaseUrl ?? "https://api.example.test",
    createOrderId: () => `order_new_${++orderId}`,
    createPaymentSessionId: () => `payment_session_new_${++paymentSessionId}`,
    createOrderItemId: () => `order_item_new_${++orderItemId}`,
    createOrderAddressId: () => `order_address_new_${++orderAddressId}`,
    createTotalSnapshotId: () => `total_snapshot_new_${++totalSnapshotId}`,
    createPromoEvaluationId: () => `promo_eval_new_${++promoEvaluationId}`,
    createPromoEvaluationLineId: () =>
      `promo_line_new_${++promoEvaluationLineId}`,
    createOrderLifecycleEventId: () =>
      `order_lifecycle_event_new_${++orderLifecycleEventId}`,
    createPayPalRequestId: () => `request_new_${++requestId}`,
    createSavedPaymentMethodId: () =>
      `saved_payment_new_${++savedPaymentMethodId}`,
    ...(options.useDefaultCartSecretHash
      ? {}
      : {
          hashCartClientSecret: (secret: string) => `hash:${secret}`,
        }),
  });
}

interface FakePayPalOrderDataSource extends PayPalOrderDataSource {
  readonly carts: PayPalOrderCartRow[];
  readonly drafts: PayPalOrderCheckoutDraftRow[];
  readonly cartItems: PayPalOrderCartItemRow[];
  readonly centralInventory: FakeCentralInventoryRow[];
  readonly storeInventory: PayPalOrderStoreInventoryRow[];
  readonly orders: PayPalOrderRow[];
  readonly orderItems: unknown[];
  readonly totalSnapshots: PayPalOrderTotalSnapshotRow[];
  readonly lifecycleEvents: FakeOrderLifecycleEventRow[];
  readonly promoRules: PayPalOrderPromoRuleRow[];
  readonly promoRuleRegions: PayPalOrderPromoRuleRegionRow[];
  readonly promoRuleProducts: PayPalOrderPromoRuleProductRow[];
  readonly promoCompatibility: PayPalOrderPromoCompatibilityRow[];
  readonly promoEvaluations: PayPalOrderPromoEvaluationWriteRow[];
  readonly promoEvaluationLines: PayPalOrderPromoEvaluationLineRow[];
  readonly taxRates: PayPalOrderTaxRateRow[];
  readonly paymentSessions: PayPalOrderPaymentSessionRow[];
  readonly savedPaymentMethods: PayPalOrderSavedPaymentMethodRow[];
  readonly paypalSnapshots: unknown[];
  readonly checkoutDraftStatusUpdates: {
    readonly draftId: string;
    readonly status: "payment_started";
    readonly updatedAt: string;
  }[];
  readonly orderOperationLocks: Map<
    string,
    { readonly kind: "resume" | "capture"; readonly token: string }
  >;
}

function createPayPalOrderDataSource(): FakePayPalOrderDataSource {
  const profile: PayPalOrderProfileRow = {
    id: "profile_popmart",
    slug: "popmart",
  };
  const secondaryProfile: PayPalOrderProfileRow = {
    id: "profile_generic",
    slug: "generic",
  };
  const market: PayPalOrderMarketRow = {
    id: "market_us",
    code: "US",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    sandbox_test_buyer_country: "US",
  };
  const secondaryMarket: PayPalOrderMarketRow = {
    id: "market_gb",
    code: "GB",
    currency_code: "GBP",
    locale: "en-GB",
    buyer_country: "GB",
    sandbox_test_buyer_country: "GB",
  };
  const profiles = [profile, secondaryProfile];
  const markets = [market, secondaryMarket];
  const carts: PayPalOrderCartRow[] = [
    {
      id: "cart_user",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: "user_123",
      cart_public_id: "cart_public_user",
      cart_secret_hash: null,
      status: "active",
    },
    {
      id: "cart_guest",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: null,
      cart_public_id: "cart_public_guest",
      cart_secret_hash: "hash:cart_secret_guest",
      status: "active",
    },
    {
      id: "cart_pickup",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: "user_pickup",
      cart_public_id: "cart_public_pickup",
      cart_secret_hash: null,
      status: "active",
    },
    {
      id: "cart_callback",
      profile_id: "profile_popmart",
      market_id: "market_us",
      auth_user_id: null,
      cart_public_id: "cart_public_callback",
      cart_secret_hash: "hash:cart_secret_callback",
      status: "active",
    },
  ];
  const drafts: PayPalOrderCheckoutDraftRow[] = [
    {
      id: "draft_delivery",
      profile_id: "profile_popmart",
      market_id: "market_us",
      cart_id: "cart_user",
      auth_user_id: "user_123",
      guest_email: null,
      fulfillment_mode: "delivery",
      delivery_state_json: {
        shipping_address: addressJson(),
        billing_address: null,
        same_as_shipping: true,
        selected_shipping_option_id: "ship_ground_ca",
      },
      pickup_state_json: {},
      selected_promo_evaluation_id: "promo_eval_delivery",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      status: "draft",
    },
    {
      id: "draft_pickup",
      profile_id: "profile_popmart",
      market_id: "market_us",
      cart_id: "cart_pickup",
      auth_user_id: "user_pickup",
      guest_email: null,
      fulfillment_mode: "pickup",
      delivery_state_json: {},
      pickup_state_json: {
        billing_address: addressJson(),
        selected_store_id: "store_sf",
        selected_pickup_date: "2026-06-05",
      },
      selected_promo_evaluation_id: null,
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      status: "draft",
    },
  ];
  const cartItems: PayPalOrderCartItemRow[] = [
    {
      id: "item_user_labubu",
      cart_id: "cart_user",
      product_id: "product_labubu",
      quantity: 1,
      unit_price_minor_snapshot: 2999,
    },
    {
      id: "item_guest_labubu",
      cart_id: "cart_guest",
      product_id: "product_labubu",
      quantity: 1,
      unit_price_minor_snapshot: 2999,
    },
    {
      id: "item_pickup_labubu",
      cart_id: "cart_pickup",
      product_id: "product_labubu",
      quantity: 2,
      unit_price_minor_snapshot: 2999,
    },
    {
      id: "item_callback_labubu",
      cart_id: "cart_callback",
      product_id: "product_labubu",
      quantity: 1,
      unit_price_minor_snapshot: 2999,
    },
  ];
  const products: PayPalOrderProductSnapshotRow[] = [
    {
      id: "product_labubu",
      slug: "labubu-macaron-vinyl-face",
      sku: "POP-LABUBU-009",
      category_id: "category_blind_boxes",
      name: "Labubu Macaron Vinyl Face",
      description: "A smiling vinyl face blind box.",
      image_path: "/popmart/products/labubu-macaron-vinyl-face-1.webp",
    },
  ];
  const shippingOptions: PayPalOrderShippingOptionRow[] = [
    {
      id: "ship_ground_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      service_code: "ground",
      display_name: "Ground",
      amount_minor: 595,
      estimated_days_min: 3,
      estimated_days_max: 5,
      is_active: true,
    },
    {
      id: "ship_express_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      service_code: "express",
      display_name: "Express",
      amount_minor: 1500,
      estimated_days_min: 1,
      estimated_days_max: 2,
      is_active: true,
    },
  ];
  const taxRates: PayPalOrderTaxRateRow[] = [
    {
      id: "tax_ca",
      market_id: "market_us",
      country_code: "US",
      state: "CA",
      county: null,
      postal_code_prefix: null,
      rate_bps: 875,
      is_active: true,
    },
  ];
  const stores: PayPalOrderStoreRow[] = [
    {
      id: "store_sf",
      market_id: "market_us",
      name: "POP MART San Francisco Centre",
      phone: "415-555-0100",
      address_line1: "865 Market Street",
      address_line2: null,
      city: "San Francisco",
      state: "CA",
      postal_code: "94103",
      country_code: "US",
      is_active: true,
    },
  ];
  const storeInventory: PayPalOrderStoreInventoryRow[] = [
    {
      store_id: "store_sf",
      product_id: "product_labubu",
      available_quantity: 1,
    },
  ];
  const centralInventory: FakeCentralInventoryRow[] = [
    {
      profile_id: "profile_popmart",
      market_id: "market_us",
      product_id: "product_labubu",
      available_quantity: 9,
    },
  ];
  const selectedPromoEvaluations: PayPalOrderPromoEvaluationRow[] = [
    {
      id: "promo_eval_delivery",
      merchandise_discount_minor: 500,
      selected_set_json: ["AUTO500"],
    },
  ];
  const promoRules: PayPalOrderPromoRuleRow[] = [];
  const promoRuleRegions: PayPalOrderPromoRuleRegionRow[] = [];
  const promoRuleProducts: PayPalOrderPromoRuleProductRow[] = [];
  const promoCompatibility: PayPalOrderPromoCompatibilityRow[] = [];
  const promoEvaluations: PayPalOrderPromoEvaluationWriteRow[] = [];
  const promoEvaluationLines: PayPalOrderPromoEvaluationLineRow[] = [];
  const orders: PayPalOrderRow[] = [
    {
      id: "order_existing",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000001",
      order_number_prefix: "DO",
      order_number_sequence: 1,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_existing",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 1000,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 1000,
    },
    {
      id: "order_existing_pickup",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "PO-20260601-000003",
      order_number_prefix: "PO",
      order_number_sequence: 3,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_existing_pickup",
      fulfillment_mode: "pickup",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 1000,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 1000,
    },
    {
      id: "order_existing_later",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000006",
      order_number_prefix: "DO",
      order_number_sequence: 6,
      auth_user_id: "user_123",
      guest_email: null,
      cart_id: "cart_user",
      checkout_draft_id: "draft_existing_later",
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 1000,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 1000,
    },
    {
      id: "order_express",
      profile_id: "profile_popmart",
      market_id: "market_us",
      order_number: "DO-20260601-000002",
      order_number_prefix: "DO",
      order_number_sequence: 2,
      auth_user_id: null,
      guest_email: null,
      cart_id: "cart_callback",
      checkout_draft_id: null,
      fulfillment_mode: "delivery",
      status: "pending",
      payment_status: "started",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      subtotal_minor: 2999,
      discount_minor: 0,
      tax_minor: 0,
      shipping_minor: 0,
      total_minor: 2999,
    },
  ];
  const paymentSessions: PayPalOrderPaymentSessionRow[] = [
    {
      id: "payment_session_existing",
      order_id: "order_existing",
      provider: "paypal",
      method: "paypal",
      status: "created",
      attempt_number: 1,
      paypal_order_id: null,
      paypal_capture_id: null,
      paypal_invoice_id: "DO-20260601-000001",
      paypal_request_id: "request_existing",
      vault_requested: false,
      merchant_total_minor: 1000,
      provider_total_minor: null,
      amount_consistency_status: "not_checked",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      paypal_config_snapshot_json: {},
    },
    {
      id: "payment_session_express_existing",
      order_id: "order_express",
      provider: "paypal",
      method: "paypal",
      status: "created",
      attempt_number: 1,
      paypal_order_id: "PAYPAL_ORDER_EXPRESS",
      paypal_capture_id: null,
      paypal_invoice_id: "DO-20260601-000002",
      paypal_request_id: "request_express_existing",
      vault_requested: false,
      merchant_total_minor: 2999,
      provider_total_minor: 2999,
      amount_consistency_status: "matched",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      sandbox_test_buyer_country: "US",
      paypal_config_snapshot_json: {},
    },
  ];
  const savedPaymentMethods: PayPalOrderSavedPaymentMethodRow[] = [];
  const orderItems: unknown[] = [
    {
      id: "order_item_existing",
      order_id: "order_existing",
      product_id: "product_labubu",
      product_sku_snapshot: "POP-LABUBU-009",
      product_name_snapshot: "Labubu Macaron Vinyl Face",
      product_description_snapshot: "A smiling vinyl face blind box.",
      product_url_snapshot: "/popmart/products/labubu-macaron-vinyl-face",
      product_image_url_snapshot:
        "/popmart/products/labubu-macaron-vinyl-face-1.webp",
      unit_price_minor: 1000,
      quantity: 1,
      fulfillable_quantity: 1,
      unavailable_quantity: 0,
      line_subtotal_minor: 1000,
      line_discount_minor: 0,
      line_tax_minor: 0,
      line_total_minor: 1000,
    },
  ];
  const orderAddresses: unknown[] = [];
  const totalSnapshots: PayPalOrderTotalSnapshotRow[] = [];
  const paypalSnapshots: unknown[] = [];
  const lifecycleEvents: FakeOrderLifecycleEventRow[] = [];
  const checkoutDraftStatusUpdates: FakePayPalOrderDataSource["checkoutDraftStatusUpdates"] =
    [];
  const orderOperationLocks: FakePayPalOrderDataSource["orderOperationLocks"] =
    new Map();

  return {
    carts,
    drafts,
    cartItems,
    centralInventory,
    storeInventory,
    orders,
    orderItems,
    totalSnapshots,
    lifecycleEvents,
    promoRules,
    promoRuleRegions,
    promoRuleProducts,
    promoCompatibility,
    promoEvaluations,
    promoEvaluationLines,
    taxRates,
    paymentSessions,
    savedPaymentMethods,
    paypalSnapshots,
    checkoutDraftStatusUpdates,
    orderOperationLocks,
    async getProfileBySlug(slug) {
      return profiles.find((row) => row.slug === slug) ?? null;
    },
    async getProfileById(id) {
      return profiles.find((row) => row.id === id) ?? null;
    },
    async getMarketByCode(code) {
      return markets.find((row) => row.code === code) ?? null;
    },
    async getMarketById(id) {
      return markets.find((row) => row.id === id) ?? null;
    },
    async getCheckoutDraftById(id) {
      return drafts.find((draft) => draft.id === id) ?? null;
    },
    async getCartById(id) {
      return carts.find((cart) => cart.id === id) ?? null;
    },
    async findActiveGuestCart(cartPublicId) {
      return (
        carts.find(
          (cart) =>
            cart.cart_public_id === cartPublicId && cart.status === "active",
        ) ?? null
      );
    },
    async findActiveSignedInCart(input) {
      return (
        carts.find(
          (cart) =>
            cart.profile_id === input.profileId &&
            cart.market_id === input.marketId &&
            cart.auth_user_id === input.authUserId &&
            cart.status === "active",
        ) ?? null
      );
    },
    async listCartItems(cartId) {
      return cartItems.filter((item) => item.cart_id === cartId);
    },
    async listProductSnapshots(_profileId, productIds) {
      return products.filter((product) => productIds.includes(product.id));
    },
    async listShippingOptions(marketId) {
      return shippingOptions.filter((option) => option.market_id === marketId);
    },
    async listTaxRates(marketId) {
      return taxRates.filter((rate) => rate.market_id === marketId);
    },
    async getStoreById(storeId) {
      return stores.find((store) => store.id === storeId) ?? null;
    },
    async listStoreInventory(storeId) {
      return storeInventory.filter((row) => row.store_id === storeId);
    },
    async getPromoEvaluationById(id) {
      return (
        selectedPromoEvaluations.find((row) => row.id === id) ??
        promoEvaluations.find((row) => row.id === id) ??
        null
      );
    },
    async listPromoRules(input) {
      return promoRules.filter(
        (rule) =>
          rule.profile_id === input.profileId &&
          rule.market_id === input.marketId,
      );
    },
    async listPromoRuleRegions(input) {
      return promoRuleRegions.filter((region) =>
        promoRules.some(
          (rule) =>
            rule.id === region.promo_rule_id &&
            rule.profile_id === input.profileId &&
            rule.market_id === input.marketId,
        ),
      );
    },
    async listPromoRuleProducts(input) {
      return promoRuleProducts.filter((product) =>
        promoRules.some(
          (rule) =>
            rule.id === product.promo_rule_id &&
            rule.profile_id === input.profileId &&
            rule.market_id === input.marketId,
        ),
      );
    },
    async listPromoCompatibility(input) {
      return promoCompatibility.filter((compatibility) =>
        promoRules.some(
          (rule) =>
            rule.id === compatibility.promo_rule_id &&
            rule.profile_id === input.profileId &&
            rule.market_id === input.marketId,
        ),
      );
    },
    async createPromoEvaluation(evaluation, lines) {
      promoEvaluations.push(evaluation);
      promoEvaluationLines.push(...lines);
      return evaluation;
    },
    async getOrderById(id) {
      return orders.find((order) => order.id === id) ?? null;
    },
    async findPendingOrderByCheckoutDraftId(checkoutDraftId, fulfillmentMode) {
      return (
        orders.find(
          (order) =>
            order.checkout_draft_id === checkoutDraftId &&
            order.fulfillment_mode === fulfillmentMode &&
            order.status === "pending",
        ) ?? null
      );
    },
    async findPendingOrderByCartId(cartId, fulfillmentMode) {
      return (
        [...orders]
          .filter(
            (order) =>
              order.cart_id === cartId &&
              order.checkout_draft_id === null &&
              order.fulfillment_mode === fulfillmentMode &&
              order.status === "pending",
          )
          .sort(
            (left, right) =>
              right.order_number_sequence - left.order_number_sequence,
          )[0] ?? null
      );
    },
    async getNextOrderSequence(input) {
      return (
        Math.max(
          0,
          ...orders
            .filter(
              (order) =>
                order.order_number_prefix === input.prefix &&
                order.order_number.startsWith(`${input.prefix}-${input.date}`),
            )
            .map((order) => order.order_number_sequence),
        ) + 1
      );
    },
    async createOrder(order) {
      orders.push(order);
      return order;
    },
    async updateOrder(orderId, patch) {
      const index = orders.findIndex((order) => order.id === orderId);
      if (index < 0) {
        throw new Error(`Order ${orderId} was not found`);
      }
      orders[index] = {
        ...orders[index]!,
        ...patch,
      };
      return orders[index]!;
    },
    async claimPendingOrderCapture(input) {
      const order = orders.find(
        (candidate) =>
          candidate.id === input.orderId && candidate.status === "pending",
      );
      if (!order || orderOperationLocks.has(order.id)) {
        return null;
      }
      orderOperationLocks.set(order.id, {
        kind: "capture",
        token: input.lockToken,
      });
      return order;
    },
    async releasePendingOrderCapture(input) {
      const lock = orderOperationLocks.get(input.orderId);
      if (lock?.kind === "capture" && lock.token === input.lockToken) {
        orderOperationLocks.delete(input.orderId);
      }
    },
    async completePendingOrderCapture(input) {
      const index = orders.findIndex(
        (candidate) =>
          candidate.id === input.orderId && candidate.status === "pending",
      );
      const lock = orderOperationLocks.get(input.orderId);
      if (
        index < 0 ||
        lock?.kind !== "capture" ||
        lock.token !== input.lockToken
      ) {
        return null;
      }
      orders[index] = { ...orders[index]!, ...input.patch };
      orderOperationLocks.delete(input.orderId);
      return orders[index]!;
    },
    async replaceOrderItems(_orderId, items) {
      orderItems.length = 0;
      orderItems.push(...items);
    },
    async replaceOrderAddresses(_orderId, addresses) {
      orderAddresses.length = 0;
      orderAddresses.push(...addresses);
    },
    async createPaymentSession(session) {
      paymentSessions.push(session);
      return session;
    },
    async listPaymentSessions(orderId) {
      return paymentSessions.filter((session) => session.order_id === orderId);
    },
    async getPaymentSessionById(paymentSessionId: string) {
      return (
        paymentSessions.find((session) => session.id === paymentSessionId) ??
        null
      );
    },
    async getPaymentSessionByPayPalOrderId(paypalOrderId: string) {
      return (
        paymentSessions.find(
          (session) => session.paypal_order_id === paypalOrderId,
        ) ?? null
      );
    },
    async updatePaymentSession(paymentSessionId, patch) {
      const index = paymentSessions.findIndex(
        (session) => session.id === paymentSessionId,
      );
      if (index < 0) {
        throw new Error(`Payment session ${paymentSessionId} was not found`);
      }
      paymentSessions[index] = {
        ...paymentSessions[index]!,
        ...patch,
      };
      return paymentSessions[index]!;
    },
    async createSavedPaymentMethod(savedPaymentMethod) {
      savedPaymentMethods.push(savedPaymentMethod);
      return savedPaymentMethod;
    },
    async findSavedPaymentMethodByVaultId(vaultId) {
      return (
        savedPaymentMethods.find(
          (savedPaymentMethod) => savedPaymentMethod.vault_id === vaultId,
        ) ?? null
      );
    },
    async findPendingSavedPaymentMethod(input) {
      return (
        savedPaymentMethods.find(
          (savedPaymentMethod) =>
            savedPaymentMethod.auth_user_id === input.authUserId &&
            savedPaymentMethod.paypal_customer_id === input.paypalCustomerId &&
            savedPaymentMethod.method_type === input.methodType &&
            savedPaymentMethod.status === "pending",
        ) ?? null
      );
    },
    async updateSavedPaymentMethod(id, patch) {
      const index = savedPaymentMethods.findIndex(
        (savedPaymentMethod) => savedPaymentMethod.id === id,
      );
      if (index < 0) {
        throw new Error(`Saved payment method ${id} was not found`);
      }
      savedPaymentMethods[index] = {
        ...savedPaymentMethods[index]!,
        ...patch,
      };
      return savedPaymentMethods[index]!;
    },
    async createTotalSnapshot(snapshot) {
      totalSnapshots.push(snapshot);
    },
    async listTotalSnapshots(orderId: string) {
      return totalSnapshots.filter((snapshot) => snapshot.order_id === orderId);
    },
    async createPayPalOrderSnapshot(snapshot) {
      paypalSnapshots.push(snapshot);
    },
    async listOrderItems(orderId: string) {
      return orderItems.filter(
        (
          item,
        ): item is {
          readonly product_id: string;
          readonly fulfillable_quantity: number;
        } =>
          typeof item === "object" &&
          item !== null &&
          "order_id" in item &&
          (item as { readonly order_id?: unknown }).order_id === orderId &&
          typeof (item as { readonly product_id?: unknown }).product_id ===
            "string" &&
          typeof (item as { readonly fulfillable_quantity?: unknown })
            .fulfillable_quantity === "number",
      );
    },
    async createOrderLifecycleEvent(event: FakeOrderLifecycleEventRow) {
      lifecycleEvents.push(event);
    },
    async deleteCartItemsByProductIds(input: {
      readonly cartId: string;
      readonly productIds: readonly string[];
    }) {
      for (let index = cartItems.length - 1; index >= 0; index -= 1) {
        const item = cartItems[index]!;
        if (
          item.cart_id === input.cartId &&
          input.productIds.includes(item.product_id)
        ) {
          cartItems.splice(index, 1);
        }
      }
    },
    async decrementCentralInventory(input: {
      readonly profileId: string;
      readonly marketId: string;
      readonly productId: string;
      readonly quantity: number;
    }) {
      const inventory = centralInventory.find(
        (row) =>
          row.profile_id === input.profileId &&
          row.market_id === input.marketId &&
          row.product_id === input.productId,
      );
      if (!inventory) {
        throw new Error(`Central inventory ${input.productId} was not found`);
      }
      inventory.available_quantity -= input.quantity;
    },
    async decrementStoreInventory(input: {
      readonly storeId: string;
      readonly productId: string;
      readonly quantity: number;
    }) {
      const inventory = storeInventory.find(
        (row) =>
          row.store_id === input.storeId && row.product_id === input.productId,
      );
      if (!inventory) {
        throw new Error(`Store inventory ${input.productId} was not found`);
      }
      inventory.available_quantity -= input.quantity;
    },
    async updateCheckoutDraftStatus(input) {
      checkoutDraftStatusUpdates.push(input);
    },
  };
}

function markDeliveryDraftForResume(
  dataSource: FakePayPalOrderDataSource,
  orderId: string,
): void {
  const draftIndex = dataSource.drafts.findIndex(
    (draft) => draft.id === "draft_delivery",
  );
  dataSource.drafts[draftIndex] = {
    ...dataSource.drafts[draftIndex]!,
    delivery_state_json: {
      ...dataSource.drafts[draftIndex]!.delivery_state_json,
      pending_order_resume_id: orderId,
    },
  } as PayPalOrderCheckoutDraftRow;
}

function authenticatedContext(): PayPalCreateOrderOperationContext {
  return {
    storefrontContext: {
      profileSlug: "popmart",
      marketCode: "US",
    },
    buyer: {
      kind: "authenticated",
      userId: "user_123",
      email: "buyer@example.test",
    },
    guestCart: null,
  };
}

function authenticatedPickupContext(): PayPalCreateOrderOperationContext {
  return {
    storefrontContext: {
      profileSlug: "popmart",
      marketCode: "US",
    },
    buyer: {
      kind: "authenticated",
      userId: "user_pickup",
      email: "pickup@example.test",
    },
    guestCart: null,
  };
}

function guestContext(): PayPalCreateOrderOperationContext {
  return {
    storefrontContext: {
      profileSlug: "popmart",
      marketCode: "US",
    },
    buyer: {
      kind: "guest",
    },
    guestCart: {
      cartPublicId: "cart_public_guest",
      cartClientSecret: "cart_secret_guest",
    },
  };
}

function addressJson() {
  return {
    recipient_name: "Delivery Buyer",
    phone: "415-555-0101",
    address_line1: "100 Market St",
    address_line2: null,
    city: "San Francisco",
    state: "CA",
    county: null,
    postal_code: "94105",
    country_code: "US",
  };
}

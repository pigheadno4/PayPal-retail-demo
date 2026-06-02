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
  type PayPalOrderShippingOptionRow,
  type PayPalOrderStoreInventoryRow,
  type PayPalOrderStoreRow,
  type PayPalOrderTaxRateRow,
} from "../src/repositories/paypalOrderRepository.js";
import type { PayPalCreateOrderOperationContext } from "../src/routes/paypal.js";

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
          url: "/popmart/products/labubu-macaron-vinyl-face",
          imageUrl: "/popmart/products/labubu-macaron-vinyl-face-1.webp",
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

  it("recalculates and persists express shipping callback totals", async () => {
    const dataSource = createPayPalOrderDataSource();
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
          shipping_address: {
            country_code: "US",
            admin_area_1: "CA",
            admin_area_2: "San Francisco",
            postal_code: "94105",
          },
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
});

function createRepository(dataSource: FakePayPalOrderDataSource) {
  let orderId = 0;
  let paymentSessionId = 0;
  let orderItemId = 0;
  let orderAddressId = 0;
  let totalSnapshotId = 0;
  let promoEvaluationId = 0;
  let promoEvaluationLineId = 0;
  let requestId = 0;

  return createSupabasePayPalOrderRepository({
    dataSource,
    now: "2026-06-01T10:00:00.000Z",
    publicApiBaseUrl: "https://api.example.test",
    createOrderId: () => `order_new_${++orderId}`,
    createPaymentSessionId: () => `payment_session_new_${++paymentSessionId}`,
    createOrderItemId: () => `order_item_new_${++orderItemId}`,
    createOrderAddressId: () => `order_address_new_${++orderAddressId}`,
    createTotalSnapshotId: () => `total_snapshot_new_${++totalSnapshotId}`,
    createPromoEvaluationId: () => `promo_eval_new_${++promoEvaluationId}`,
    createPromoEvaluationLineId: () =>
      `promo_line_new_${++promoEvaluationLineId}`,
    createPayPalRequestId: () => `request_new_${++requestId}`,
    hashCartClientSecret: (secret) => `hash:${secret}`,
  });
}

interface FakePayPalOrderDataSource extends PayPalOrderDataSource {
  readonly orders: PayPalOrderRow[];
  readonly orderItems: unknown[];
  readonly totalSnapshots: unknown[];
  readonly promoRules: PayPalOrderPromoRuleRow[];
  readonly promoRuleRegions: PayPalOrderPromoRuleRegionRow[];
  readonly promoRuleProducts: PayPalOrderPromoRuleProductRow[];
  readonly promoCompatibility: PayPalOrderPromoCompatibilityRow[];
  readonly promoEvaluations: PayPalOrderPromoEvaluationWriteRow[];
  readonly promoEvaluationLines: PayPalOrderPromoEvaluationLineRow[];
  readonly paymentSessions: PayPalOrderPaymentSessionRow[];
  readonly paypalSnapshots: unknown[];
  readonly checkoutDraftStatusUpdates: {
    readonly draftId: string;
    readonly status: "payment_started";
    readonly updatedAt: string;
  }[];
}

function createPayPalOrderDataSource(): FakePayPalOrderDataSource {
  const profile: PayPalOrderProfileRow = {
    id: "profile_popmart",
    slug: "popmart",
  };
  const market: PayPalOrderMarketRow = {
    id: "market_us",
    code: "US",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    sandbox_test_buyer_country: "US",
  };
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
  const orderItems: unknown[] = [];
  const orderAddresses: unknown[] = [];
  const totalSnapshots: unknown[] = [];
  const paypalSnapshots: unknown[] = [];
  const checkoutDraftStatusUpdates: FakePayPalOrderDataSource["checkoutDraftStatusUpdates"] =
    [];

  return {
    orders,
    orderItems,
    totalSnapshots,
    promoRules,
    promoRuleRegions,
    promoRuleProducts,
    promoCompatibility,
    promoEvaluations,
    promoEvaluationLines,
    paymentSessions,
    paypalSnapshots,
    checkoutDraftStatusUpdates,
    async getProfileBySlug(slug) {
      return profile.slug === slug ? profile : null;
    },
    async getProfileById(id) {
      return profile.id === id ? profile : null;
    },
    async getMarketByCode(code) {
      return market.code === code ? market : null;
    },
    async getMarketById(id) {
      return market.id === id ? market : null;
    },
    async getCheckoutDraftById(id) {
      return drafts.find((draft) => draft.id === id) ?? null;
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
        orders.find(
          (order) =>
            order.cart_id === cartId &&
            order.fulfillment_mode === fulfillmentMode &&
            order.status === "pending",
        ) ?? null
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
    async createTotalSnapshot(snapshot) {
      totalSnapshots.push(snapshot);
    },
    async createPayPalOrderSnapshot(snapshot) {
      paypalSnapshots.push(snapshot);
    },
    async updateCheckoutDraftStatus(input) {
      checkoutDraftStatusUpdates.push(input);
    },
  };
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

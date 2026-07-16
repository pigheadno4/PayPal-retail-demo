import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";
import { createDebugLogger, type DebugLogEntry } from "../src/debug/logger.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  PayPalClientTokenGateway,
  PayPalClientTokenGatewayInput,
  PayPalCaptureOrderGatewayInput,
  PayPalCaptureOrderGatewayResponse,
  PayPalCreateOrderGatewayInput,
  PayPalCreateOrderGatewayResponse,
  PayPalWebhookVerificationGatewayInput,
  PayPalWebhookVerificationGatewayResponse,
} from "../src/paypal/client.js";
import type {
  PayPalWebhookProcessingInput,
  PayPalWebhookProcessingRepository,
  PayPalWebhookProcessingResult,
  PayPalExpressReviewSnapshot,
  PreparedPayPalCapture,
  RecordPayPalCaptureResultInput,
  PayPalCreateOrderOperationContext,
  type HandlePayPalShippingCallbackInput,
  PayPalOrderPreparationRepository,
  type PayPalShippingCallbackResult,
  PreparedPayPalCreateOrder,
  RecordPayPalCreateOrderResultInput,
} from "../src/routes/paypal.js";
import { requestApp } from "./helpers/requestApp.js";

describe("PayPal routes", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns browser-safe SDK config for the active market", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(
      app,
      "GET",
      "/api/paypal/sdk-config?market=gb&page_type=checkout&flow=vaulting&method=card",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        client_id: "PAYPAL_PUBLIC_CLIENT_ID",
        environment: "sandbox",
        sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
        currency_code: "GBP",
        locale: "en-GB",
        buyer_country: "GB",
        paylater_buyer_country: "GB",
        sandbox_test_buyer_country: "GB",
        components: [
          "applepay-payments",
          "card-fields",
          "googlepay-payments",
          "paypal-messages",
          "paypal-payments",
          "venmo-payments",
        ],
        page_type: "checkout",
        provider_key:
          "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:GB:GBP:en-GB:GB:GB:GB:1:applepay-payments,card-fields,googlepay-payments,paypal-messages,paypal-payments,venmo-payments",
        needs_client_token: true,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(JSON.stringify(response.json)).not.toContain("PAYPAL_SECRET");
    expect(JSON.stringify(response.json)).not.toContain("access_token");
    expect(gateway.calls).toEqual([]);
  });

  it("validates unsupported SDK config query values before building config", async () => {
    const app = createPayPalApp(createClientTokenGateway());

    const response = await requestApp(
      app,
      "GET",
      "/api/paypal/sdk-config?market=ca&page_type=checkout&flow=standard&method=paypal",
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_PAYPAL_SDK_CONFIG_REQUEST",
        message:
          "A supported market, page type, flow, and payment method are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("rejects guest client-token requests before calling PayPal", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(app, "POST", "/api/paypal/client-token", {
      json: {
        flow: "vaulting",
        method: "card",
      },
    });

    expect(response.status).toBe(403);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "GUEST_VAULTING_NOT_ALLOWED",
        message: "Sign in to save a payment method.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(gateway.calls).toEqual([]);
  });

  it("generates a browser-safe client token for logged-in vaulting flows", async () => {
    const gateway = createClientTokenGateway();
    const app = createPayPalApp(gateway);

    const response = await requestApp(app, "POST", "/api/paypal/client-token", {
      headers: {
        authorization: "Bearer buyer-token",
      },
      json: {
        flow: "vaulting",
        method: "paypal",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        client_token: "browser-safe-client-token",
        expires_in_seconds: 900,
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(JSON.stringify(response.json)).not.toContain("access_token");
    expect(JSON.stringify(response.json)).not.toContain("PAYPAL_SECRET");
    expect(gateway.calls).toEqual([
      {
        domains: ["https://checkout.example.test"],
        targetCustomerId: null,
      },
    ]);
  });

  it("emits safe PayPal route telemetry for hosted debugging", async () => {
    const entries: DebugLogEntry[] = [];
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      gateway,
      orderRepository,
      undefined,
      createDebugLogger({
        sink: (entry) => entries.push(entry),
      }),
    );

    await requestApp(
      app,
      "GET",
      "/api/paypal/sdk-config?market=us&page_type=checkout&flow=standard&method=paypal",
    );
    await requestApp(app, "POST", "/api/paypal/client-token", {
      headers: {
        authorization: "Bearer buyer-token",
      },
      json: {
        flow: "vaulting",
        method: "paypal",
      },
    });
    await requestApp(
      app,
      "GET",
      "/api/paypal/orders/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS",
    );
    await requestApp(
      app,
      "POST",
      "/api/paypal/orders/PAYPAL_ORDER_DELIVERY/capture",
    );

    expect(entries.map((entry) => entry.message)).toEqual(
      expect.arrayContaining([
        "api_request_completed",
        "paypal_sdk_config_returned",
        "paypal_client_token_planned",
        "paypal_client_token_generated",
        "paypal_express_review_lookup_starting",
        "paypal_express_review_found",
        "paypal_capture_starting",
        "paypal_capture_prepared",
        "paypal_capture_gateway_captured",
        "paypal_capture_recorded",
      ]),
    );
    expect(JSON.stringify(entries)).not.toContain("buyer-token");
    expect(JSON.stringify(entries)).not.toContain("browser-safe-client-token");
    expect(JSON.stringify(entries)).not.toContain("cart-secret");
  });

  it("creates a full-checkout delivery PayPal order with provided shipping address", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/delivery?market=us",
      {
        headers: {
          authorization: "Bearer buyer-token",
        },
        json: {
          checkout_draft_id: "draft_delivery_123",
          method: "paypal",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order_number: "DO-20260601-000001",
        payment_session_id: "payment_session_delivery",
        paypal_order_id: "PAYPAL_ORDER_DELIVERY",
        paypal_order_status: "CREATED",
        paypal_invoice_id: "DO-20260601-000001",
        paypal_request_id: "request-delivery",
        approval_url: "https://www.sandbox.paypal.com/checkoutnow?token=1",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(orderRepository.prepareCalls).toEqual([
      {
        context: authenticatedContext(),
        input: {
          kind: "delivery",
          checkoutDraftId: "draft_delivery_123",
          method: "paypal",
        },
      },
    ]);
    expect(gateway.createOrderCalls[0]?.paypalRequestId).toBe(
      "request-delivery",
    );
    expect(gateway.createOrderCalls[0]?.payload).toMatchObject({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: "DO-20260601-000001",
          shipping: {
            name: {
              full_name: "Delivery Buyer",
            },
            address: {
              address_line_1: "100 Market St",
              admin_area_2: "San Francisco",
              admin_area_1: "CA",
              postal_code: "94105",
              country_code: "US",
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
    });
    expect(orderRepository.recordCalls[0]).toMatchObject({
      paymentSessionId: "payment_session_delivery",
      paypalOrderId: "PAYPAL_ORDER_DELIVERY",
      paypalInvoiceId: "DO-20260601-000001",
      paypalRequestId: "request-delivery",
      merchantSnapshot: {
        currencyCode: "USD",
        itemTotalMinor: 2999,
        shippingMinor: 595,
        taxMinor: 268,
        discountMinor: 500,
        totalMinor: 3362,
      },
    });
  });

  it("creates an express delivery PayPal order with shipping callback config", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/express-delivery",
      {
        json: {
          cart_id: "cart_public_guest",
          method: "paypal",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({
      ok: true,
      data: {
        order_number: "DO-20260601-000002",
        payment_session_id: "payment_session_express",
        paypal_order_id: "PAYPAL_ORDER_EXPRESS",
        paypal_invoice_id: "DO-20260601-000002-A2",
        paypal_request_id: "request-express",
      },
    });
    expect(orderRepository.prepareCalls).toEqual([
      {
        context: guestContext(),
        input: {
          kind: "express_delivery",
          cartId: "cart_public_guest",
          method: "paypal",
        },
      },
    ]);
    expect(gateway.createOrderCalls[0]?.payload).toMatchObject({
      purchase_units: [
        {
          invoice_id: "DO-20260601-000002-A2",
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "GET_FROM_FILE",
            order_update_callback_config: {
              callback_events: ["SHIPPING_ADDRESS"],
              callback_url:
                "https://api.example.test/api/paypal/orders/PAYPAL_ORDER_EXPRESS/shipping-callback",
            },
          },
        },
      },
    });
  });

  it("logs structured create-order diagnostics without secrets", async () => {
    const entries: DebugLogEntry[] = [];
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      gateway,
      orderRepository,
      undefined,
      createDebugLogger({
        sink: (entry) => entries.push(entry),
      }),
    );

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/express-delivery?market=us",
      {
        headers: {
          "x-cart-id": "cart_public_guest",
          "x-cart-secret": "cart_secret_guest",
        },
        json: {
          cart_id: "cart_public_guest",
          method: "paypal",
        },
      },
    );

    expect(response.status).toBe(200);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "paypal_create_order_starting",
          context: expect.objectContaining({
            cart_id: "cart_public_guest",
            checkout_draft_id: null,
            debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
            kind: "express_delivery",
            market: "US",
            method: "paypal",
            buyer_kind: "guest",
            has_guest_cart_secret: true,
          }),
        }),
        expect.objectContaining({
          message: "paypal_create_order_prepared",
          context: expect.objectContaining({
            amount_total_minor: 2999,
            debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
            kind: "express_delivery",
            order_number: "DO-20260601-000002",
            paypal_invoice_id: "DO-20260601-000002-A2",
            paypal_request_id: "request-express",
            payment_session_id: "payment_session_express",
          }),
        }),
        expect.objectContaining({
          message: "paypal_create_order_amount_guard_outcome",
          context: expect.objectContaining({
            amount_currency_code: "USD",
            amount_guard_status: "matched",
            amount_total_minor: 2999,
            debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
            kind: "express_delivery",
            mismatch_count: 0,
            order_number: "DO-20260601-000002",
            payment_session_id: "payment_session_express",
          }),
        }),
        expect.objectContaining({
          message: "paypal_create_order_gateway_created",
          context: expect.objectContaining({
            debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
            kind: "express_delivery",
            paypal_order_id: "PAYPAL_ORDER_EXPRESS",
            paypal_order_status: "CREATED",
            payment_session_id: "payment_session_express",
          }),
        }),
      ]),
    );
    expect(JSON.stringify(entries)).not.toContain("cart_secret_guest");
  });

  it("creates a BOPIS PayPal order with pickup-in-store shipping semantics", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(app, "POST", "/api/paypal/orders/bopis", {
      headers: {
        authorization: "Bearer buyer-token",
      },
      json: {
        checkout_draft_id: "draft_pickup_123",
        method: "paypal",
      },
    });

    expect(response.status).toBe(200);
    expect(response.json).toMatchObject({
      ok: true,
      data: {
        order_number: "PO-20260601-000001",
        payment_session_id: "payment_session_bopis",
        paypal_order_id: "PAYPAL_ORDER_BOPIS",
        paypal_invoice_id: "PO-20260601-000001",
        paypal_request_id: "request-bopis",
      },
    });
    expect(gateway.createOrderCalls[0]?.payload).toMatchObject({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: "PO-20260601-000001",
          shipping: {
            type: "PICKUP_IN_STORE",
            name: {
              full_name: "s2s POP MART San Francisco Centre",
            },
            address: {
              address_line_1: "865 Market Street",
              admin_area_2: "San Francisco",
              admin_area_1: "CA",
              postal_code: "94103",
              country_code: "US",
            },
          },
          amount: {
            breakdown: {
              item_total: {
                value: "29.99",
              },
              tax_total: {
                value: "2.68",
              },
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
    });
    const breakdown =
      gateway.createOrderCalls[0]?.payload.purchase_units[0]?.amount.breakdown;
    expect(breakdown).not.toHaveProperty("shipping");
    expect(gateway.createOrderCalls[0]?.payload).not.toHaveProperty(
      "order_update_callback_config",
    );
  });

  it("handles express shipping callbacks with a raw PayPal success response", async () => {
    const callbackContextId = "11111111-1111-4111-8111-111111111111";
    const entries: DebugLogEntry[] = [];
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      gateway,
      orderRepository,
      undefined,
      createDebugLogger({ sink: (entry) => entries.push(entry) }),
    );

    const response = await requestApp(
      app,
      "POST",
      `/api/paypal/orders/${callbackContextId}/shipping-callback`,
      {
        json: {
          id: "PAYPAL_ORDER_EXPRESS",
          shipping_address: {
            country_code: "US",
            admin_area_1: "CA",
            admin_area_2: "San Francisco",
            postal_code: "94105",
          },
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual(paypalShippingCallbackSuccess());
    expect(response.json).not.toHaveProperty("ok");
    expect(orderRepository.shippingCallbackCalls).toEqual([
      {
        callbackContextId,
        paypalOrderId: "PAYPAL_ORDER_EXPRESS",
        shippingAddress: {
          fullName: null,
          addressLine1: null,
          addressLine2: null,
          countryCode: "US",
          adminArea1: "CA",
          adminArea2: "San Francisco",
          postalCode: "94105",
        },
        selectedShippingOptionId: null,
        rawCallbackRequest: {
          id: "PAYPAL_ORDER_EXPRESS",
          shipping_address: {
            country_code: "US",
            admin_area_1: "CA",
            admin_area_2: "San Francisco",
            postal_code: "94105",
          },
        },
      },
    ]);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "paypal_shipping_callback_received",
          context: expect.objectContaining({
            callback_context_id: callbackContextId,
            paypal_order_id: "PAYPAL_ORDER_EXPRESS",
            selected_shipping_option_id: null,
          }),
        }),
        expect.objectContaining({
          message: "paypal_shipping_callback_completed",
          context: expect.objectContaining({
            callback_context_id: callbackContextId,
            duration_ms: expect.any(Number),
            paypal_order_id: "PAYPAL_ORDER_EXPRESS",
            status_code: 200,
          }),
        }),
      ]),
    );
    expect(JSON.stringify(entries)).not.toContain("94105");
    expect(JSON.stringify(entries)).not.toContain("San Francisco");
  });

  it("rejects PII-like callback identifiers before repository persistence", async () => {
    const callbackContextId = "11111111-1111-4111-8111-111111111111";
    const entries: DebugLogEntry[] = [];
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      createPayPalGateway(),
      orderRepository,
      undefined,
      createDebugLogger({ sink: (entry) => entries.push(entry) }),
    );

    const response = await requestApp(
      app,
      "POST",
      `/api/paypal/orders/${callbackContextId}/shipping-callback`,
      {
        json: {
          id: "payer@example.test",
          shipping_address: {
            country_code: "US",
            admin_area_1: "CA",
            postal_code: "94105",
          },
          shipping_option: {
            id: "1 Market Street",
          },
        },
      },
    );

    expect(response.status).toBe(422);
    expect(orderRepository.shippingCallbackCalls).toEqual([]);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "paypal_shipping_callback_declined",
          context: expect.objectContaining({
            callback_context_id: callbackContextId,
            paypal_order_id: null,
            status_code: 422,
          }),
        }),
      ]),
    );
    const serializedEntries = JSON.stringify(entries);
    expect(serializedEntries).not.toContain("payer@example.test");
    expect(serializedEntries).not.toContain("1 Market Street");
  });

  it("declines a PII-like callback context before repository persistence", async () => {
    const entries: DebugLogEntry[] = [];
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      createPayPalGateway(),
      orderRepository,
      undefined,
      createDebugLogger({ sink: (entry) => entries.push(entry) }),
    );

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/buyer%40example.test/shipping-callback",
      {
        json: {
          id: "PAYPAL_ORDER_EXPRESS",
          shipping_address: {
            country_code: "US",
            admin_area_1: "CA",
            postal_code: "94105",
          },
        },
      },
    );

    expect(response.status).toBe(422);
    expect(orderRepository.shippingCallbackCalls).toEqual([]);
    const serializedEntries = JSON.stringify(entries);
    expect(serializedEntries).not.toContain("buyer@example.test");
    expect(serializedEntries).not.toContain("buyer%40example.test");
  });

  it("declines malformed PayPal shipping callbacks with raw PayPal error JSON", async () => {
    const callbackContextId = "11111111-1111-4111-8111-111111111111";
    const entries: DebugLogEntry[] = [];
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(
      gateway,
      orderRepository,
      undefined,
      createDebugLogger({ sink: (entry) => entries.push(entry) }),
    );

    const response = await requestApp(
      app,
      "POST",
      `/api/paypal/orders/${callbackContextId}/shipping-callback`,
      {
        json: {},
      },
    );

    expect(response.status).toBe(422);
    expect(response.json).toEqual({
      name: "UNPROCESSABLE_ENTITY",
      details: [{ issue: "ADDRESS_ERROR" }],
    });
    expect(orderRepository.shippingCallbackCalls).toEqual([]);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warn",
          message: "paypal_shipping_callback_declined",
          context: expect.objectContaining({
            callback_context_id: callbackContextId,
            decline_issue: "ADDRESS_ERROR",
            status_code: 422,
          }),
        }),
      ]),
    );
  });

  it("returns an express Review and Confirm snapshot from synchronized order totals", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "GET",
      "/api/paypal/orders/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: expressReviewSnapshot(),
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(orderRepository.reviewSnapshotCalls).toEqual([
      {
        paypalOrderId: "PAYPAL_ORDER_EXPRESS",
        paymentSessionId: null,
      },
    ]);
  });

  it("captures PayPal orders only after the repository amount guard allows capture", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/PAYPAL_ORDER_DELIVERY/capture",
    );

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        order_number: "DO-20260601-000001",
        payment_session_id: "payment_session_delivery",
        paypal_order_id: "PAYPAL_ORDER_DELIVERY",
        paypal_capture_id: "PAYPAL_CAPTURE_DELIVERY",
        paypal_order_status: "COMPLETED",
        paypal_capture_status: "COMPLETED",
        paypal_request_id: "request-capture-delivery",
        amount_guard: {
          action: "allow_capture",
          status: "matched",
          can_capture: true,
          tolerance_minor: 0,
          mismatches: [],
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(orderRepository.prepareCaptureCalls).toEqual([
      {
        paypalOrderId: "PAYPAL_ORDER_DELIVERY",
      },
    ]);
    expect(gateway.captureOrderCalls).toEqual([
      {
        paypalOrderId: "PAYPAL_ORDER_DELIVERY",
        paypalRequestId: "request-capture-delivery",
      },
    ]);
    expect(orderRepository.recordCaptureCalls).toEqual([
      {
        paymentSessionId: "payment_session_delivery",
        paypalOrderId: "PAYPAL_ORDER_DELIVERY",
        paypalCaptureId: "PAYPAL_CAPTURE_DELIVERY",
        paypalOrderStatus: "COMPLETED",
        paypalCaptureStatus: "COMPLETED",
        paypalRequestId: "request-capture-delivery",
        response: paypalCaptureResponse(),
        merchantSnapshot: {
          currencyCode: "USD",
          itemTotalMinor: 2999,
          shippingMinor: 595,
          taxMinor: 268,
          discountMinor: 500,
          totalMinor: 3362,
        },
        amountGuard: {
          action: "allow_capture",
          status: "matched",
          can_capture: true,
          tolerance_minor: 0,
          mismatches: [],
        },
      },
    ]);
  });

  it("blocks PayPal capture before calling PayPal when the amount guard fails", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/PAYPAL_ORDER_MISMATCH/capture",
    );

    expect(response.status).toBe(409);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "PAYPAL_CAPTURE_AMOUNT_MISMATCH",
        message: "PayPal capture blocked because order amounts do not match.",
        details: {
          amount_guard: {
            action: "block_capture",
            status: "mismatch",
            can_capture: false,
            tolerance_minor: 0,
            mismatches: [
              {
                reason: "total_mismatch",
                expected_minor: 3362,
                actual_minor: 3363,
                expected_currency_code: "USD",
                actual_currency_code: "USD",
              },
            ],
          },
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(gateway.captureOrderCalls).toEqual([]);
    expect(orderRepository.recordCaptureCalls).toEqual([]);
  });

  it("returns a conflict before PayPal capture when resume owns the order lease", async () => {
    const gateway = createPayPalGateway();
    const baseRepository = createOrderRepository();
    const orderRepository: FakeOrderRepository = {
      ...baseRepository,
      async prepareCapture() {
        throw Object.assign(new Error("Order is busy with another operation"), {
          code: "PAYPAL_ORDER_OPERATION_IN_PROGRESS",
        });
      },
    };
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/PAYPAL_ORDER_DELIVERY/capture",
    );

    expect(response.status).toBe(409);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "PAYPAL_ORDER_OPERATION_IN_PROGRESS",
        message:
          "This order is already being updated. Wait a moment and try again.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(gateway.captureOrderCalls).toEqual([]);
    expect(baseRepository.recordCaptureCalls).toEqual([]);
  });

  it("validates create-order requests before repository and PayPal calls", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/delivery",
      {
        json: {
          method: "paylater",
        },
      },
    );

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_PAYPAL_CREATE_ORDER_REQUEST",
        message:
          "A supported payment method and checkout/cart source are required.",
        details: {},
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(orderRepository.prepareCalls).toEqual([]);
    expect(gateway.createOrderCalls).toEqual([]);
  });

  it("rejects invalid PayPal webhook verification after storing an ignored event", async () => {
    const gateway = createPayPalGateway({
      webhookVerificationStatus: "FAILURE",
    });
    const webhookRepository = createWebhookRepository();
    const app = createPayPalApp(gateway, undefined, webhookRepository);

    const event = vaultCreatedEvent();
    const response = await requestApp(app, "POST", "/api/paypal/webhooks", {
      headers: paypalWebhookHeaders(),
      json: event,
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "INVALID_PAYPAL_WEBHOOK_SIGNATURE",
        message: "PayPal webhook signature verification failed.",
        details: {
          event_id: "WH-VAULT-CREATED",
          event_type: "VAULT.PAYMENT-TOKEN.CREATED",
          processing_status: "ignored",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(gateway.webhookVerificationCalls).toEqual([
      {
        webhookId: "PAYPAL_WEBHOOK_ID",
        transmissionId: "transmission-123",
        transmissionTime: "2026-06-01T10:00:00Z",
        transmissionSignature: "signature-123",
        certUrl: "https://api-m.sandbox.paypal.com/certs/cert.pem",
        authAlgorithm: "SHA256withRSA",
        event,
      },
    ]);
    expect(webhookRepository.processingCalls).toEqual([
      {
        verificationStatus: "invalid",
        headers: {
          auth_algorithm: "SHA256withRSA",
          cert_url: "https://api-m.sandbox.paypal.com/certs/cert.pem",
          transmission_id: "transmission-123",
          transmission_signature: "signature-123",
          transmission_time: "2026-06-01T10:00:00Z",
        },
        event,
      },
    ]);
  });

  it("processes valid PayPal vault webhooks and returns a standard success envelope", async () => {
    const entries: DebugLogEntry[] = [];
    const gateway = createPayPalGateway({
      webhookVerificationStatus: "SUCCESS",
    });
    const webhookRepository = createWebhookRepository({
      processingResult: {
        eventId: "WH-VAULT-CREATED",
        eventType: "VAULT.PAYMENT-TOKEN.CREATED",
        verificationStatus: "valid",
        processingStatus: "processed",
        linkedOrderId: "order_existing",
        linkedPaymentSessionId: "payment_session_existing",
        savedPaymentMethodId: "saved_payment_123",
      },
    });
    const app = createPayPalApp(
      gateway,
      undefined,
      webhookRepository,
      createDebugLogger({
        sink: (entry) => entries.push(entry),
      }),
    );

    const response = await requestApp(app, "POST", "/api/paypal/webhooks", {
      headers: paypalWebhookHeaders(),
      json: vaultCreatedEvent(),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        event_id: "WH-VAULT-CREATED",
        event_type: "VAULT.PAYMENT-TOKEN.CREATED",
        verification_status: "valid",
        processing_status: "processed",
        linked_order_id: "order_existing",
        linked_payment_session_id: "payment_session_existing",
        saved_payment_method_id: "saved_payment_123",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
    expect(
      entries
        .filter((entry) => entry.message.startsWith("paypal_webhook_"))
        .map((entry) => entry.message),
    ).toEqual([
      "paypal_webhook_received",
      "paypal_webhook_verification_outcome",
      "paypal_webhook_processing_outcome",
    ]);
    expect(entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "paypal_webhook_received",
          context: expect.objectContaining({
            debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
            event_id: "WH-VAULT-CREATED",
            event_type: "VAULT.PAYMENT-TOKEN.CREATED",
          }),
        }),
        expect.objectContaining({
          message: "paypal_webhook_verification_outcome",
          context: expect.objectContaining({
            event_id: "WH-VAULT-CREATED",
            event_type: "VAULT.PAYMENT-TOKEN.CREATED",
            verification_status: "valid",
          }),
        }),
        expect.objectContaining({
          message: "paypal_webhook_processing_outcome",
          context: expect.objectContaining({
            event_id: "WH-VAULT-CREATED",
            event_type: "VAULT.PAYMENT-TOKEN.CREATED",
            linked_order_id: "order_existing",
            linked_payment_session_id: "payment_session_existing",
            processing_status: "processed",
            verification_status: "valid",
          }),
        }),
      ]),
    );
    expect(JSON.stringify(entries)).not.toContain("vault_card_123");
    expect(JSON.stringify(entries)).not.toContain("paypal_customer_123");
    expect(JSON.stringify(entries)).not.toContain("signature-123");
  });
});

function createPayPalApp(
  gateway: FakePayPalGateway,
  orderRepository?: FakeOrderRepository,
  webhookRepository?: FakeWebhookRepository,
  debugLogger?: ReturnType<typeof createDebugLogger>,
) {
  return createApp({
    ...(debugLogger ? { debugLogger } : {}),
    paypal: {
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      webhookId: "PAYPAL_WEBHOOK_ID",
      defaultClientTokenDomains: ["https://checkout.example.test"],
      clientTokenGateway: gateway,
      orderGateway: gateway,
      webhookGateway: gateway,
      authVerifier: createAuthVerifier(),
      ...(orderRepository ? { orderRepository } : {}),
      ...(webhookRepository ? { webhookRepository } : {}),
    },
  });
}

function createAuthVerifier(): SupabaseAuthVerifier {
  return {
    auth: {
      async getUser(token) {
        if (token !== "buyer-token") {
          return {
            data: { user: null },
            error: { message: "invalid token" },
          };
        }

        return {
          data: {
            user: {
              id: "user_123",
              email: "buyer@example.test",
            },
          },
          error: null,
        };
      },
    },
  };
}

interface FakePayPalGateway extends PayPalClientTokenGateway {
  readonly calls: PayPalClientTokenGatewayInput[];
  readonly createOrderCalls: PayPalCreateOrderGatewayInput[];
  readonly captureOrderCalls: PayPalCaptureOrderGatewayInput[];
  readonly webhookVerificationCalls: PayPalWebhookVerificationGatewayInput[];
}

function createClientTokenGateway(): FakePayPalGateway {
  return createPayPalGateway();
}

function createPayPalGateway(
  options: {
    readonly webhookVerificationStatus?: PayPalWebhookVerificationGatewayResponse["verificationStatus"];
  } = {},
): FakePayPalGateway {
  const calls: PayPalClientTokenGatewayInput[] = [];
  const createOrderCalls: PayPalCreateOrderGatewayInput[] = [];
  const captureOrderCalls: PayPalCaptureOrderGatewayInput[] = [];
  const webhookVerificationCalls: PayPalWebhookVerificationGatewayInput[] = [];

  return {
    calls,
    createOrderCalls,
    captureOrderCalls,
    webhookVerificationCalls,
    async generateClientToken(input) {
      calls.push(input);
      return {
        clientToken: "browser-safe-client-token",
        expiresInSeconds: 900,
      };
    },
    async createOrder(input): Promise<PayPalCreateOrderGatewayResponse> {
      createOrderCalls.push(input);
      const invoiceId = input.payload.purchase_units[0]?.invoice_id ?? "";
      const orderIdByInvoice: Record<string, string> = {
        "DO-20260601-000001": "PAYPAL_ORDER_DELIVERY",
        "DO-20260601-000002-A2": "PAYPAL_ORDER_EXPRESS",
        "PO-20260601-000001": "PAYPAL_ORDER_BOPIS",
      };
      return {
        paypalOrderId: orderIdByInvoice[invoiceId] ?? "PAYPAL_ORDER_UNKNOWN",
        status: "CREATED",
        approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=1",
        rawResponse: {
          id: orderIdByInvoice[invoiceId] ?? "PAYPAL_ORDER_UNKNOWN",
          status: "CREATED",
        },
      };
    },
    async captureOrder(input): Promise<PayPalCaptureOrderGatewayResponse> {
      captureOrderCalls.push(input);
      return paypalCaptureResponse();
    },
    async verifyWebhookSignature(
      input,
    ): Promise<PayPalWebhookVerificationGatewayResponse> {
      webhookVerificationCalls.push(input);
      return {
        verificationStatus: options.webhookVerificationStatus ?? "SUCCESS",
      };
    },
  };
}

interface FakeOrderRepository extends PayPalOrderPreparationRepository {
  readonly prepareCalls: {
    readonly context: PayPalCreateOrderOperationContext;
    readonly input: unknown;
  }[];
  readonly recordCalls: RecordPayPalCreateOrderResultInput[];
  readonly shippingCallbackCalls: HandlePayPalShippingCallbackInput[];
  readonly reviewSnapshotCalls: {
    readonly paypalOrderId: string | null;
    readonly paymentSessionId: string | null;
  }[];
  readonly prepareCaptureCalls: { readonly paypalOrderId: string }[];
  readonly recordCaptureCalls: RecordPayPalCaptureResultInput[];
}

interface FakeWebhookRepository extends PayPalWebhookProcessingRepository {
  readonly processingCalls: PayPalWebhookProcessingInput[];
}

function createWebhookRepository(
  options: {
    readonly processingResult?: PayPalWebhookProcessingResult;
  } = {},
): FakeWebhookRepository {
  const processingCalls: PayPalWebhookProcessingInput[] = [];

  return {
    processingCalls,
    async processWebhook(input) {
      processingCalls.push(input);
      return (
        options.processingResult ?? {
          eventId: "WH-VAULT-CREATED",
          eventType: "VAULT.PAYMENT-TOKEN.CREATED",
          verificationStatus: input.verificationStatus,
          processingStatus:
            input.verificationStatus === "valid" ? "processed" : "ignored",
          linkedOrderId: null,
          linkedPaymentSessionId: null,
          savedPaymentMethodId: null,
        }
      );
    },
  };
}

function paypalWebhookHeaders(): Record<string, string> {
  return {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api-m.sandbox.paypal.com/certs/cert.pem",
    "paypal-transmission-id": "transmission-123",
    "paypal-transmission-sig": "signature-123",
    "paypal-transmission-time": "2026-06-01T10:00:00Z",
  };
}

function vaultCreatedEvent() {
  return {
    id: "WH-VAULT-CREATED",
    event_type: "VAULT.PAYMENT-TOKEN.CREATED",
    resource_type: "payment_token",
    resource: {
      id: "vault_card_123",
      customer: {
        id: "paypal_customer_123",
      },
      payment_source: {
        card: {
          brand: "VISA",
          last_digits: "1111",
          expiry: "2027-02",
        },
      },
    },
  };
}

function createOrderRepository(): FakeOrderRepository {
  const prepareCalls: FakeOrderRepository["prepareCalls"] = [];
  const recordCalls: RecordPayPalCreateOrderResultInput[] = [];
  const shippingCallbackCalls: HandlePayPalShippingCallbackInput[] = [];
  const reviewSnapshotCalls: FakeOrderRepository["reviewSnapshotCalls"] = [];
  const prepareCaptureCalls: { readonly paypalOrderId: string }[] = [];
  const recordCaptureCalls: RecordPayPalCaptureResultInput[] = [];

  return {
    prepareCalls,
    recordCalls,
    shippingCallbackCalls,
    reviewSnapshotCalls,
    prepareCaptureCalls,
    recordCaptureCalls,
    async prepareCreateOrder(context, input) {
      prepareCalls.push({ context, input });
      if (input.kind === "delivery") {
        return preparedDeliveryOrder();
      }
      if (input.kind === "express_delivery") {
        return preparedExpressDeliveryOrder();
      }
      return preparedBopisOrder();
    },
    async recordCreateOrderResult(_context, input) {
      recordCalls.push(input);
    },
    async handleExpressShippingCallback(input) {
      shippingCallbackCalls.push(input);
      return {
        action: "success",
        response: paypalShippingCallbackSuccess(),
      };
    },
    async getExpressReviewSnapshot(input) {
      reviewSnapshotCalls.push(input);
      return expressReviewSnapshot();
    },
    async prepareCapture(input) {
      prepareCaptureCalls.push(input);
      return preparedCapture(input.paypalOrderId);
    },
    async recordCaptureResult(input) {
      recordCaptureCalls.push(input);
    },
  };
}

function expressReviewSnapshot(): PayPalExpressReviewSnapshot {
  return {
    source_label: "Delivery express",
    order_number: "DO-20260601-000002",
    payment_session_id: "payment_session_express",
    paypal_order_id: "PAYPAL_ORDER_EXPRESS",
    payment_method_label: "PayPal",
    status_label: "Payment session synchronized",
    shipping_address: {
      name: "PayPal buyer",
      address_line1: "100 Market St",
      address_line2: "San Francisco, CA 94105",
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
        id: "order_item_labubu",
        name: "Labubu Macaron Vinyl Face",
        detail: "POP-LABUBU-009 - Qty 1",
        amount_minor: 2999,
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
  };
}

function preparedCapture(paypalOrderId: string): PreparedPayPalCapture {
  const merchantSnapshot = {
    currencyCode: "USD" as const,
    itemTotalMinor: 2999,
    shippingMinor: 595,
    taxMinor: 268,
    discountMinor: 500,
    totalMinor: 3362,
  };
  const amountGuard =
    paypalOrderId === "PAYPAL_ORDER_MISMATCH"
      ? {
          action: "block_capture" as const,
          status: "mismatch" as const,
          can_capture: false,
          tolerance_minor: 0,
          mismatches: [
            {
              reason: "total_mismatch" as const,
              expected_minor: 3362,
              actual_minor: 3363,
              expected_currency_code: "USD" as const,
              actual_currency_code: "USD" as const,
            },
          ],
        }
      : {
          action: "allow_capture" as const,
          status: "matched" as const,
          can_capture: true,
          tolerance_minor: 0,
          mismatches: [],
        };

  if (amountGuard.action === "block_capture") {
    return {
      action: "block",
      orderNumber: "DO-20260601-000001",
      paymentSessionId: "payment_session_delivery",
      paypalOrderId,
      merchantSnapshot,
      amountGuard,
    };
  }

  return {
    action: "capture",
    orderNumber: "DO-20260601-000001",
    paymentSessionId: "payment_session_delivery",
    paypalOrderId,
    paypalRequestId: "request-capture-delivery",
    merchantSnapshot,
    amountGuard,
  };
}

function paypalCaptureResponse(): PayPalCaptureOrderGatewayResponse {
  return {
    paypalOrderId: "PAYPAL_ORDER_DELIVERY",
    status: "COMPLETED",
    captureId: "PAYPAL_CAPTURE_DELIVERY",
    captureStatus: "COMPLETED",
    rawResponse: {
      id: "PAYPAL_ORDER_DELIVERY",
      status: "COMPLETED",
      purchase_units: [
        {
          payments: {
            captures: [
              {
                id: "PAYPAL_CAPTURE_DELIVERY",
                status: "COMPLETED",
                amount: {
                  currency_code: "USD",
                  value: "33.62",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

function paypalShippingCallbackSuccess(): PayPalShippingCallbackResult["response"] {
  return {
    id: "PAYPAL_ORDER_EXPRESS",
    purchase_units: [
      {
        reference_id: "DO-20260601-000002",
        amount: {
          currency_code: "USD",
          value: "38.56",
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
              value: "5.95",
            },
          },
        },
        shipping_options: [
          {
            id: "ship_ground_ca",
            type: "SHIPPING",
            label: "Ground",
            selected: true,
            amount: {
              currency_code: "USD",
              value: "5.95",
            },
          },
        ],
      },
    ],
  };
}

function preparedDeliveryOrder(): PreparedPayPalCreateOrder {
  return {
    kind: "delivery",
    orderNumber: "DO-20260601-000001",
    paymentSessionId: "payment_session_delivery",
    paypalInvoiceId: "DO-20260601-000001",
    paypalRequestId: "request-delivery",
    method: "paypal",
    currencyCode: "USD",
    items: [labubuLineItem()],
    shippingAmountMinor: 595,
    taxAmountMinor: 268,
    discountAmountMinor: 500,
    shippingAddress: {
      fullName: "Delivery Buyer",
      addressLine1: "100 Market St",
      adminArea2: "San Francisco",
      adminArea1: "CA",
      postalCode: "94105",
      countryCode: "US",
    },
  };
}

function preparedExpressDeliveryOrder(): PreparedPayPalCreateOrder {
  return {
    kind: "express_delivery",
    orderNumber: "DO-20260601-000002",
    paymentSessionId: "payment_session_express",
    paypalInvoiceId: "DO-20260601-000002-A2",
    paypalRequestId: "request-express",
    method: "paypal",
    currencyCode: "USD",
    items: [labubuLineItem({ lineTaxAmountMinor: null })],
    shippingAmountMinor: 0,
    taxAmountMinor: 0,
    discountAmountMinor: 0,
    shippingCallbackUrl:
      "https://api.example.test/api/paypal/orders/PAYPAL_ORDER_EXPRESS/shipping-callback",
  };
}

function preparedBopisOrder(): PreparedPayPalCreateOrder {
  return {
    kind: "bopis",
    orderNumber: "PO-20260601-000001",
    paymentSessionId: "payment_session_bopis",
    paypalInvoiceId: "PO-20260601-000001",
    paypalRequestId: "request-bopis",
    method: "paypal",
    currencyCode: "USD",
    items: [labubuLineItem()],
    taxAmountMinor: 268,
    discountAmountMinor: 0,
    pickupStore: {
      storeName: "POP MART San Francisco Centre",
      addressLine1: "865 Market Street",
      adminArea2: "San Francisco",
      adminArea1: "CA",
      postalCode: "94103",
      countryCode: "US",
    },
  };
}

function labubuLineItem(
  overrides: Partial<{
    readonly lineTaxAmountMinor: number | null;
  }> = {},
) {
  return {
    name: "Labubu Macaron Vinyl Face",
    quantity: 1,
    unitAmountMinor: 2999,
    lineTaxAmountMinor: Object.hasOwn(overrides, "lineTaxAmountMinor")
      ? overrides.lineTaxAmountMinor
      : 268,
    sku: "POP-LABUBU-009",
    url: "/popmart/products/labubu-macaron-vinyl-face",
    imageUrl: "/popmart/products/labubu-macaron-vinyl-face-1.webp",
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

function guestContext(): PayPalCreateOrderOperationContext {
  return {
    storefrontContext: {
      profileSlug: "popmart",
      marketCode: "US",
    },
    buyer: {
      kind: "guest",
    },
    guestCart: null,
  };
}

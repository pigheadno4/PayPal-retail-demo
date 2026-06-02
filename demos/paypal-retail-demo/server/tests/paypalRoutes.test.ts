import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import type { SupabaseAuthVerifier } from "../src/middleware/auth.js";
import type {
  PayPalClientTokenGateway,
  PayPalClientTokenGatewayInput,
  PayPalCaptureOrderGatewayInput,
  PayPalCaptureOrderGatewayResponse,
  PayPalCreateOrderGatewayInput,
  PayPalCreateOrderGatewayResponse,
} from "../src/paypal/client.js";
import type {
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
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/order_express/shipping-callback",
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
        callbackContextId: "order_express",
        paypalOrderId: "PAYPAL_ORDER_EXPRESS",
        shippingAddress: {
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
  });

  it("declines malformed PayPal shipping callbacks with raw PayPal error JSON", async () => {
    const gateway = createPayPalGateway();
    const orderRepository = createOrderRepository();
    const app = createPayPalApp(gateway, orderRepository);

    const response = await requestApp(
      app,
      "POST",
      "/api/paypal/orders/order_express/shipping-callback",
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
});

function createPayPalApp(
  gateway: FakePayPalGateway,
  orderRepository?: FakeOrderRepository,
) {
  return createApp({
    paypal: {
      environment: "sandbox",
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      defaultClientTokenDomains: ["https://checkout.example.test"],
      clientTokenGateway: gateway,
      orderGateway: gateway,
      authVerifier: createAuthVerifier(),
      ...(orderRepository ? { orderRepository } : {}),
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
}

function createClientTokenGateway(): FakePayPalGateway {
  return createPayPalGateway();
}

function createPayPalGateway(): FakePayPalGateway {
  const calls: PayPalClientTokenGatewayInput[] = [];
  const createOrderCalls: PayPalCreateOrderGatewayInput[] = [];
  const captureOrderCalls: PayPalCaptureOrderGatewayInput[] = [];

  return {
    calls,
    createOrderCalls,
    captureOrderCalls,
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
  };
}

interface FakeOrderRepository extends PayPalOrderPreparationRepository {
  readonly prepareCalls: {
    readonly context: PayPalCreateOrderOperationContext;
    readonly input: unknown;
  }[];
  readonly recordCalls: RecordPayPalCreateOrderResultInput[];
  readonly shippingCallbackCalls: HandlePayPalShippingCallbackInput[];
  readonly prepareCaptureCalls: { readonly paypalOrderId: string }[];
  readonly recordCaptureCalls: RecordPayPalCaptureResultInput[];
}

function createOrderRepository(): FakeOrderRepository {
  const prepareCalls: FakeOrderRepository["prepareCalls"] = [];
  const recordCalls: RecordPayPalCreateOrderResultInput[] = [];
  const shippingCallbackCalls: HandlePayPalShippingCallbackInput[] = [];
  const prepareCaptureCalls: { readonly paypalOrderId: string }[] = [];
  const recordCaptureCalls: RecordPayPalCaptureResultInput[] = [];

  return {
    prepareCalls,
    recordCalls,
    shippingCallbackCalls,
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
    async prepareCapture(input) {
      prepareCaptureCalls.push(input);
      return preparedCapture(input.paypalOrderId);
    },
    async recordCaptureResult(input) {
      recordCaptureCalls.push(input);
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

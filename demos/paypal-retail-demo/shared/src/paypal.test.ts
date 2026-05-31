import { describe, expect, it } from "vitest";
import {
  buildPayPalBopisCreateOrderPayload,
  buildPayPalDeliveryCreateOrderPayload,
  buildPayPalExpressDeliveryCreateOrderPayload,
  buildPayPalSdkConfig,
  checkPayPalCreateOrderAmountConsistency,
  extractPayPalPurchaseUnitAmountSnapshot,
  guardPayPalCaptureAmountConsistency,
  planPayPalPaymentMethods,
  planPayPalVaultAttributes,
  planPayPalClientTokenRequest,
  planPayPalRequestMetadata,
  type PayPalOrderLineItemInput,
} from "./paypal.js";
import { getMarketConfig } from "./market.js";

const deliveryItems: PayPalOrderLineItemInput[] = [
  {
    name: "Labubu Have a Seat",
    quantity: 2,
    unitAmountMinor: 1599,
    sku: "PM-LABUBU-HAS",
    description: "Blind box figure",
    url: "https://demo.example/products/labubu-have-a-seat",
    imageUrl: "https://demo.example/assets/labubu.png",
  },
  {
    name: "Molly Anniversary",
    quantity: 1,
    unitAmountMinor: 1299,
    sku: "PM-MOLLY-ANN",
  },
];

describe("PayPal delivery full-checkout Create Order builder", () => {
  it("builds a CAPTURE order with detailed line items and a provided shipping address", () => {
    const payload = buildPayPalDeliveryCreateOrderPayload({
      orderNumber: "DO-20260530-000001",
      currencyCode: "USD",
      items: deliveryItems,
      shippingAmountMinor: 500,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      shippingAddress: {
        fullName: "Taylor Buyer",
        addressLine1: "221B Market Street",
        addressLine2: "Apt 8",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
    });

    expect(payload).toEqual({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: "DO-20260530-000001",
          items: [
            {
              name: "Labubu Have a Seat",
              quantity: "2",
              sku: "PM-LABUBU-HAS",
              description: "Blind box figure",
              url: "https://demo.example/products/labubu-have-a-seat",
              image_url: "https://demo.example/assets/labubu.png",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "15.99",
              },
            },
            {
              name: "Molly Anniversary",
              quantity: "1",
              sku: "PM-MOLLY-ANN",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "12.99",
              },
            },
          ],
          amount: {
            currency_code: "USD",
            value: "43.37",
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: "44.97",
              },
              shipping: {
                currency_code: "USD",
                value: "5.00",
              },
              tax_total: {
                currency_code: "USD",
                value: "3.40",
              },
              discount: {
                currency_code: "USD",
                value: "10.00",
              },
            },
          },
          shipping: {
            name: {
              full_name: "Taylor Buyer",
            },
            address: {
              address_line_1: "221B Market Street",
              address_line_2: "Apt 8",
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
  });

  it("omits zero discount and optional address line 2 from the delivery payload", () => {
    const payload = buildPayPalDeliveryCreateOrderPayload({
      orderNumber: "DO-20260530-000002",
      currencyCode: "GBP",
      items: [
        {
          name: "Hirono Little Mischief",
          quantity: 1,
          unitAmountMinor: 2199,
        },
      ],
      shippingAmountMinor: 0,
      taxAmountMinor: 440,
      discountAmountMinor: 0,
      shippingAddress: {
        fullName: "Casey Buyer",
        addressLine1: "1 Oxford Street",
        adminArea2: "London",
        postalCode: "W1D 1BS",
        countryCode: "GB",
      },
    });

    expect(payload.purchase_units[0]?.amount.breakdown).toEqual({
      item_total: {
        currency_code: "GBP",
        value: "21.99",
      },
      shipping: {
        currency_code: "GBP",
        value: "0.00",
      },
      tax_total: {
        currency_code: "GBP",
        value: "4.40",
      },
    });
    const shipping = payload.purchase_units[0]?.shipping;
    expect(shipping).toBeDefined();
    expect(shipping?.address).not.toHaveProperty("address_line_2");
  });

  it("rejects invalid quantities and discounts larger than item plus shipping plus tax", () => {
    expect(() =>
      buildPayPalDeliveryCreateOrderPayload({
        orderNumber: "DO-20260530-000003",
        currencyCode: "USD",
        items: [
          {
            name: "Invalid Quantity",
            quantity: 0,
            unitAmountMinor: 1000,
          },
        ],
        shippingAmountMinor: 0,
        taxAmountMinor: 0,
        discountAmountMinor: 0,
        shippingAddress: {
          fullName: "Taylor Buyer",
          addressLine1: "221B Market Street",
          adminArea2: "San Francisco",
          adminArea1: "CA",
          postalCode: "94105",
          countryCode: "US",
        },
      }),
    ).toThrow("quantity must be a positive integer");

    expect(() =>
      buildPayPalDeliveryCreateOrderPayload({
        orderNumber: "DO-20260530-000004",
        currencyCode: "USD",
        items: [
          {
            name: "Labubu Have a Seat",
            quantity: 1,
            unitAmountMinor: 1000,
          },
        ],
        shippingAmountMinor: 0,
        taxAmountMinor: 0,
        discountAmountMinor: 1001,
        shippingAddress: {
          fullName: "Taylor Buyer",
          addressLine1: "221B Market Street",
          adminArea2: "San Francisco",
          adminArea1: "CA",
          postalCode: "94105",
          countryCode: "US",
        },
      }),
    ).toThrow("negative money result is not allowed");
  });

  it("includes item-level tax when order line taxes reconcile with purchase unit tax", () => {
    const payload = buildPayPalDeliveryCreateOrderPayload({
      orderNumber: "DO-20260531-000009",
      currencyCode: "USD",
      items: [
        {
          name: "Labubu Have a Seat",
          quantity: 2,
          unitAmountMinor: 1599,
          lineTaxAmountMinor: 241,
          sku: "PM-LABUBU-HAS",
        },
        {
          name: "Molly Anniversary",
          quantity: 1,
          unitAmountMinor: 1299,
          lineTaxAmountMinor: 99,
          sku: "PM-MOLLY-ANN",
        },
      ],
      shippingAmountMinor: 500,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      shippingAddress: {
        fullName: "Taylor Buyer",
        addressLine1: "221B Market Street",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
    });

    expect(payload.purchase_units[0]?.items).toEqual([
      {
        name: "Labubu Have a Seat",
        quantity: "1",
        sku: "PM-LABUBU-HAS",
        category: "PHYSICAL_GOODS",
        unit_amount: {
          currency_code: "USD",
          value: "15.99",
        },
        tax: {
          currency_code: "USD",
          value: "1.21",
        },
      },
      {
        name: "Labubu Have a Seat",
        quantity: "1",
        sku: "PM-LABUBU-HAS",
        category: "PHYSICAL_GOODS",
        unit_amount: {
          currency_code: "USD",
          value: "15.99",
        },
        tax: {
          currency_code: "USD",
          value: "1.20",
        },
      },
      {
        name: "Molly Anniversary",
        quantity: "1",
        sku: "PM-MOLLY-ANN",
        category: "PHYSICAL_GOODS",
        unit_amount: {
          currency_code: "USD",
          value: "12.99",
        },
        tax: {
          currency_code: "USD",
          value: "0.99",
        },
      },
    ]);
    expect(payload.purchase_units[0]?.amount.breakdown.tax_total).toEqual({
      currency_code: "USD",
      value: "3.40",
    });
  });

  it("rejects incomplete or mismatched item-level tax before calling PayPal", () => {
    const input = {
      orderNumber: "DO-20260531-000010",
      currencyCode: "USD" as const,
      shippingAmountMinor: 0,
      taxAmountMinor: 340,
      discountAmountMinor: 0,
      shippingAddress: {
        fullName: "Taylor Buyer",
        addressLine1: "221B Market Street",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
    };

    expect(() =>
      buildPayPalDeliveryCreateOrderPayload({
        ...input,
        items: [
          {
            name: "Labubu Have a Seat",
            quantity: 2,
            unitAmountMinor: 1599,
            lineTaxAmountMinor: 241,
          },
          {
            name: "Molly Anniversary",
            quantity: 1,
            unitAmountMinor: 1299,
          },
        ],
      }),
    ).toThrow(
      "line tax must be provided for every PayPal line item or omitted for all",
    );

    expect(() =>
      buildPayPalDeliveryCreateOrderPayload({
        ...input,
        items: [
          {
            name: "Labubu Have a Seat",
            quantity: 2,
            unitAmountMinor: 1599,
            lineTaxAmountMinor: 241,
          },
          {
            name: "Molly Anniversary",
            quantity: 1,
            unitAmountMinor: 1299,
            lineTaxAmountMinor: 100,
          },
        ],
      }),
    ).toThrow("line item tax total must equal purchase-unit tax total");
  });

  it("checks PayPal amount consistency before capture guard integration", () => {
    const payload = buildPayPalDeliveryCreateOrderPayload({
      orderNumber: "DO-20260531-000011",
      currencyCode: "USD",
      items: deliveryItems,
      shippingAmountMinor: 500,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      shippingAddress: {
        fullName: "Taylor Buyer",
        addressLine1: "221B Market Street",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
    });

    expect(checkPayPalCreateOrderAmountConsistency(payload)).toEqual({
      status: "matched",
      mismatches: [],
    });

    const tamperedPayload = {
      ...payload,
      purchase_units: [
        {
          ...payload.purchase_units[0]!,
          amount: {
            ...payload.purchase_units[0]!.amount,
            value: "43.38",
          },
        },
      ],
    };

    expect(checkPayPalCreateOrderAmountConsistency(tamperedPayload)).toEqual({
      status: "mismatch",
      mismatches: [
        {
          purchase_unit_index: 0,
          reason: "amount_total_mismatch",
          expected_minor: 4337,
          actual_minor: 4338,
        },
      ],
    });
  });

  it("blocks capture on provider amount mismatch except allowed rounding tolerance", () => {
    const payload = buildPayPalDeliveryCreateOrderPayload({
      orderNumber: "DO-20260531-000012",
      currencyCode: "USD",
      items: deliveryItems,
      shippingAmountMinor: 500,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      shippingAddress: {
        fullName: "Taylor Buyer",
        addressLine1: "221B Market Street",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94105",
        countryCode: "US",
      },
    });
    const merchantSnapshot = {
      currencyCode: "USD" as const,
      itemTotalMinor: 4497,
      shippingMinor: 500,
      taxMinor: 340,
      discountMinor: 1000,
      totalMinor: 4337,
    };
    const providerSnapshot = extractPayPalPurchaseUnitAmountSnapshot(
      payload.purchase_units[0]!,
    );

    expect(
      guardPayPalCaptureAmountConsistency({
        merchantSnapshot,
        providerSnapshot,
      }),
    ).toEqual({
      action: "allow_capture",
      status: "matched",
      can_capture: true,
      tolerance_minor: 0,
      mismatches: [],
    });

    const mismatchedProviderSnapshot = {
      ...providerSnapshot,
      totalMinor: 4338,
    };

    expect(
      guardPayPalCaptureAmountConsistency({
        merchantSnapshot,
        providerSnapshot: mismatchedProviderSnapshot,
      }),
    ).toEqual({
      action: "block_capture",
      status: "mismatch",
      can_capture: false,
      tolerance_minor: 0,
      mismatches: [
        {
          reason: "total_mismatch",
          expected_minor: 4337,
          actual_minor: 4338,
          expected_currency_code: "USD",
          actual_currency_code: "USD",
        },
      ],
    });

    expect(
      guardPayPalCaptureAmountConsistency({
        merchantSnapshot,
        providerSnapshot: mismatchedProviderSnapshot,
        toleranceMinor: 1,
      }),
    ).toEqual({
      action: "allow_capture",
      status: "matched",
      can_capture: true,
      tolerance_minor: 1,
      mismatches: [],
    });
  });
});

describe("PayPal express delivery Create Order builder", () => {
  it("uses wallet shipping with server-side shipping callbacks and detailed line items", () => {
    const payload = buildPayPalExpressDeliveryCreateOrderPayload({
      orderNumber: "DO-20260530-000005",
      currencyCode: "USD",
      items: deliveryItems,
      shippingAmountMinor: 500,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      shippingCallbackUrl:
        "https://demo.example/api/paypal/orders/paypal_order_123/shipping-callback?cart_id=cart_123&session_id=session_456",
    });

    expect(payload).toEqual({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: "DO-20260530-000005",
          items: [
            {
              name: "Labubu Have a Seat",
              quantity: "2",
              sku: "PM-LABUBU-HAS",
              description: "Blind box figure",
              url: "https://demo.example/products/labubu-have-a-seat",
              image_url: "https://demo.example/assets/labubu.png",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "15.99",
              },
            },
            {
              name: "Molly Anniversary",
              quantity: "1",
              sku: "PM-MOLLY-ANN",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "12.99",
              },
            },
          ],
          amount: {
            currency_code: "USD",
            value: "43.37",
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: "44.97",
              },
              shipping: {
                currency_code: "USD",
                value: "5.00",
              },
              tax_total: {
                currency_code: "USD",
                value: "3.40",
              },
              discount: {
                currency_code: "USD",
                value: "10.00",
              },
            },
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "GET_FROM_FILE",
            order_update_callback_config: {
              callback_events: ["SHIPPING_ADDRESS"],
              callback_url:
                "https://demo.example/api/paypal/orders/paypal_order_123/shipping-callback?cart_id=cart_123&session_id=session_456",
            },
          },
        },
      },
    });
    expect(payload.purchase_units[0]).not.toHaveProperty("shipping");
  });

  it("supports explicit shipping option callbacks and rejects invalid callback config", () => {
    const payload = buildPayPalExpressDeliveryCreateOrderPayload({
      orderNumber: "DO-20260530-000006",
      currencyCode: "GBP",
      items: [
        {
          name: "Hirono Little Mischief",
          quantity: 1,
          unitAmountMinor: 2199,
        },
      ],
      shippingAmountMinor: 0,
      taxAmountMinor: 440,
      discountAmountMinor: 0,
      shippingCallbackUrl:
        "https://demo.example/api/paypal/orders/paypal_order_456/shipping-callback",
      callbackEvents: ["SHIPPING_ADDRESS", "SHIPPING_OPTIONS"],
    });

    expect(
      payload.payment_source.paypal.experience_context
        .order_update_callback_config,
    ).toEqual({
      callback_events: ["SHIPPING_ADDRESS", "SHIPPING_OPTIONS"],
      callback_url:
        "https://demo.example/api/paypal/orders/paypal_order_456/shipping-callback",
    });

    expect(() =>
      buildPayPalExpressDeliveryCreateOrderPayload({
        orderNumber: "DO-20260530-000007",
        currencyCode: "USD",
        items: deliveryItems,
        shippingAmountMinor: 0,
        taxAmountMinor: 0,
        discountAmountMinor: 0,
        shippingCallbackUrl: "http://demo.example/callback",
      }),
    ).toThrow("shipping callback URL must use https");

    expect(() =>
      buildPayPalExpressDeliveryCreateOrderPayload({
        orderNumber: "DO-20260530-000008",
        currencyCode: "USD",
        items: deliveryItems,
        shippingAmountMinor: 0,
        taxAmountMinor: 0,
        discountAmountMinor: 0,
        shippingCallbackUrl: "https://demo.example/callback",
        callbackEvents: [],
      }),
    ).toThrow("at least one shipping callback event is required");
  });
});

describe("PayPal BOPIS Create Order builder", () => {
  it("builds a CAPTURE pickup order with selected store shipping semantics", () => {
    const payload = buildPayPalBopisCreateOrderPayload({
      orderNumber: "PO-20260531-000001",
      currencyCode: "USD",
      items: deliveryItems,
      taxAmountMinor: 340,
      discountAmountMinor: 1000,
      pickupStore: {
        storeName: "POP MART San Francisco Centre",
        addressLine1: "865 Market Street",
        addressLine2: "Suite C12",
        adminArea2: "San Francisco",
        adminArea1: "CA",
        postalCode: "94103",
        countryCode: "US",
      },
    });

    expect(payload).toEqual({
      intent: "CAPTURE",
      purchase_units: [
        {
          invoice_id: "PO-20260531-000001",
          items: [
            {
              name: "Labubu Have a Seat",
              quantity: "2",
              sku: "PM-LABUBU-HAS",
              description: "Blind box figure",
              url: "https://demo.example/products/labubu-have-a-seat",
              image_url: "https://demo.example/assets/labubu.png",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "15.99",
              },
            },
            {
              name: "Molly Anniversary",
              quantity: "1",
              sku: "PM-MOLLY-ANN",
              category: "PHYSICAL_GOODS",
              unit_amount: {
                currency_code: "USD",
                value: "12.99",
              },
            },
          ],
          amount: {
            currency_code: "USD",
            value: "38.37",
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: "44.97",
              },
              tax_total: {
                currency_code: "USD",
                value: "3.40",
              },
              discount: {
                currency_code: "USD",
                value: "10.00",
              },
            },
          },
          shipping: {
            type: "PICKUP_IN_STORE",
            name: {
              full_name: "s2s POP MART San Francisco Centre",
            },
            address: {
              address_line_1: "865 Market Street",
              address_line_2: "Suite C12",
              admin_area_2: "San Francisco",
              admin_area_1: "CA",
              postal_code: "94103",
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
  });

  it("omits optional pickup address fields and rejects invalid pickup amounts", () => {
    const payload = buildPayPalBopisCreateOrderPayload({
      orderNumber: "PO-20260531-000002",
      currencyCode: "GBP",
      items: [
        {
          name: "Hirono Little Mischief",
          quantity: 1,
          unitAmountMinor: 2199,
        },
      ],
      taxAmountMinor: 440,
      discountAmountMinor: 0,
      pickupStore: {
        storeName: "POP MART London Soho",
        addressLine1: "30 Brewer Street",
        adminArea2: "London",
        postalCode: "W1F 0SS",
        countryCode: "GB",
      },
    });

    expect(payload.purchase_units[0]?.amount.breakdown).toEqual({
      item_total: {
        currency_code: "GBP",
        value: "21.99",
      },
      tax_total: {
        currency_code: "GBP",
        value: "4.40",
      },
    });
    expect(payload.purchase_units[0]?.shipping?.address).not.toHaveProperty(
      "address_line_2",
    );
    expect(payload.purchase_units[0]?.shipping?.address).not.toHaveProperty(
      "admin_area_1",
    );

    expect(() =>
      buildPayPalBopisCreateOrderPayload({
        orderNumber: "PO-20260531-000003",
        currencyCode: "USD",
        items: [
          {
            name: "Labubu Have a Seat",
            quantity: 1,
            unitAmountMinor: 1000,
          },
        ],
        taxAmountMinor: 0,
        discountAmountMinor: 1001,
        pickupStore: {
          storeName: "POP MART San Francisco Centre",
          addressLine1: "865 Market Street",
          adminArea2: "San Francisco",
          adminArea1: "CA",
          postalCode: "94103",
          countryCode: "US",
        },
      }),
    ).toThrow("negative money result is not allowed");
  });
});

describe("PayPal SDK config builder", () => {
  it("returns browser-safe sandbox config for standard one-time flows", () => {
    const config = buildPayPalSdkConfig({
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "sandbox",
      market: getMarketConfig("US"),
      pageType: "checkout",
      flow: "standard",
      method: "paypal",
    });

    expect(config).toEqual({
      client_id: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "sandbox",
      sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
      currency_code: "USD",
      locale: "en-US",
      buyer_country: "US",
      paylater_buyer_country: "US",
      sandbox_test_buyer_country: "US",
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
        "paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:applepay-payments,card-fields,googlepay-payments,paypal-messages,paypal-payments,venmo-payments",
      needs_client_token: false,
    });
    expect(config).not.toHaveProperty("client_secret");
    expect(config).not.toHaveProperty("access_token");
  });

  it("nulls sandbox-only buyer country in production and requests client token for vaulting", () => {
    const config = buildPayPalSdkConfig({
      clientId: "PAYPAL_LIVE_CLIENT_ID",
      environment: "production",
      market: getMarketConfig("GB"),
      pageType: "product-details",
      flow: "vaulting",
      method: "card",
      components: ["paypal-payments", "card-fields"],
    });

    expect(config).toMatchObject({
      client_id: "PAYPAL_LIVE_CLIENT_ID",
      environment: "production",
      sdk_url: "https://www.paypal.com/web-sdk/v6/core",
      currency_code: "GBP",
      locale: "en-GB",
      buyer_country: "GB",
      paylater_buyer_country: "GB",
      sandbox_test_buyer_country: null,
      components: ["card-fields", "paypal-payments"],
      page_type: "product-details",
      needs_client_token: true,
    });
    expect(config.provider_key).toBe(
      "paypal:production:PAYPAL_LIVE_CLIENT_ID:GB:GBP:en-GB:GB:GB:GB:1:card-fields,paypal-payments",
    );
  });

  it("changes provider key when component set changes and rejects empty browser client ID", () => {
    const market = getMarketConfig("US");
    const paypalOnly = buildPayPalSdkConfig({
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "sandbox",
      market,
      pageType: "cart",
      flow: "standard",
      method: "paypal",
      components: ["paypal-payments"],
    });
    const paypalAndMessages = buildPayPalSdkConfig({
      clientId: "PAYPAL_PUBLIC_CLIENT_ID",
      environment: "sandbox",
      market,
      pageType: "cart",
      flow: "standard",
      method: "paylater",
      components: ["paypal-payments", "paypal-messages"],
    });

    expect(paypalOnly.provider_key).not.toBe(paypalAndMessages.provider_key);

    expect(() =>
      buildPayPalSdkConfig({
        clientId: " ",
        environment: "sandbox",
        market,
        pageType: "checkout",
        flow: "standard",
        method: "paypal",
      }),
    ).toThrow("PayPal client ID is required");
  });
});

describe("PayPal payment method mapper", () => {
  it("maps eligible checkout methods to SDK components, sessions, and UI placements", () => {
    expect(
      planPayPalPaymentMethods({
        market: getMarketConfig("US"),
        components: getMarketConfig("US").paymentComponents,
        runtimeEligibility: [
          { key: "paypal", isEligible: true },
          {
            key: "paylater",
            isEligible: true,
            details: { productCode: "PAY_IN_4", countryCode: "US" },
          },
          { key: "advanced_cards", isEligible: true },
          { key: "applepay", isEligible: true },
          { key: "googlepay", isEligible: true },
          { key: "venmo", isEligible: true },
        ],
      }),
    ).toEqual({
      selected_method: "paypal",
      default_method: "paypal",
      required_components: [
        "applepay-payments",
        "card-fields",
        "googlepay-payments",
        "paypal-messages",
        "paypal-payments",
        "venmo-payments",
      ],
      rows: [
        {
          method: "paypal",
          label: "PayPal",
          eligibility_key: "paypal",
          eligibility_source: "findEligibleMethods",
          required_components: ["paypal-payments"],
          sdk_session_method: "createPayPalOneTimePaymentSession",
          button_element: "paypal-button",
          action_surface: "order_summary",
          mobile_sticky_eligible: true,
          paylater_message: "none",
          paylater_details: null,
          supports_save_for_future: true,
          save_checkbox_placement: "under_button",
        },
        {
          method: "paylater",
          label: "Pay Later",
          eligibility_key: "paylater",
          eligibility_source: "findEligibleMethods",
          required_components: ["paypal-messages", "paypal-payments"],
          sdk_session_method: "createPayLaterOneTimePaymentSession",
          button_element: "paypal-pay-later-button",
          action_surface: "order_summary",
          mobile_sticky_eligible: true,
          paylater_message: "amount_aware",
          paylater_details: {
            product_code: "PAY_IN_4",
            country_code: "US",
          },
          supports_save_for_future: false,
          save_checkbox_placement: null,
        },
        {
          method: "card",
          label: "Credit or debit card",
          eligibility_key: "advanced_cards",
          eligibility_source: "findEligibleMethods",
          required_components: ["card-fields"],
          sdk_session_method: "createCardFieldsOneTimePaymentSession",
          button_element: "card-fields",
          action_surface: "card_box",
          mobile_sticky_eligible: false,
          paylater_message: "none",
          paylater_details: null,
          supports_save_for_future: true,
          save_checkbox_placement: "inside_card_box",
        },
        {
          method: "apple_pay",
          label: "Apple Pay",
          eligibility_key: "applepay",
          eligibility_source: "applepay_config",
          required_components: ["applepay-payments"],
          sdk_session_method: "createApplePayOneTimePaymentSession",
          button_element: "apple_pay_button",
          action_surface: "order_summary",
          mobile_sticky_eligible: true,
          paylater_message: "none",
          paylater_details: null,
          supports_save_for_future: false,
          save_checkbox_placement: null,
        },
        {
          method: "google_pay",
          label: "Google Pay",
          eligibility_key: "googlepay",
          eligibility_source: "googlepay_config",
          required_components: ["googlepay-payments"],
          sdk_session_method: "createGooglePayOneTimePaymentSession",
          button_element: "google_pay_button",
          action_surface: "order_summary",
          mobile_sticky_eligible: true,
          paylater_message: "none",
          paylater_details: null,
          supports_save_for_future: false,
          save_checkbox_placement: null,
        },
        {
          method: "venmo",
          label: "Venmo",
          eligibility_key: "venmo",
          eligibility_source: "findEligibleMethods",
          required_components: ["venmo-payments"],
          sdk_session_method: "createVenmoOneTimePaymentSession",
          button_element: "venmo-button",
          action_surface: "order_summary",
          mobile_sticky_eligible: true,
          paylater_message: "none",
          paylater_details: null,
          supports_save_for_future: false,
          save_checkbox_placement: null,
        },
      ],
      hidden_methods: [],
    });
  });

  it("hides methods when runtime eligibility, component, market, or details are missing", () => {
    expect(
      planPayPalPaymentMethods({
        market: getMarketConfig("GB"),
        components: ["paypal-payments", "paypal-messages", "card-fields"],
        runtimeEligibility: [
          { key: "paypal", isEligible: true },
          { key: "paylater", isEligible: true },
          { key: "advanced_cards", isEligible: true },
          { key: "applepay", isEligible: true },
          { key: "googlepay", isEligible: false },
          { key: "venmo", isEligible: true },
        ],
      }),
    ).toEqual({
      selected_method: "paypal",
      default_method: "paypal",
      required_components: ["card-fields", "paypal-payments"],
      rows: [
        expect.objectContaining({ method: "paypal" }),
        expect.objectContaining({ method: "card" }),
      ],
      hidden_methods: [
        {
          method: "paylater",
          reason: "runtime_details_missing",
          eligibility_key: "paylater",
        },
        {
          method: "apple_pay",
          reason: "sdk_component_missing",
          eligibility_key: "applepay",
        },
        {
          method: "google_pay",
          reason: "sdk_component_missing",
          eligibility_key: "googlepay",
        },
        {
          method: "venmo",
          reason: "market_unsupported",
          eligibility_key: "venmo",
        },
      ],
    });
  });

  it("falls back to the first eligible row when the selected method is hidden", () => {
    expect(
      planPayPalPaymentMethods({
        market: getMarketConfig("US"),
        components: ["paypal-payments", "card-fields"],
        selectedMethod: "paylater",
        runtimeEligibility: [
          { key: "paypal", isEligible: false },
          { key: "advanced_cards", isEligible: true },
        ],
      }),
    ).toMatchObject({
      selected_method: "card",
      default_method: "card",
      rows: [expect.objectContaining({ method: "card" })],
      hidden_methods: expect.arrayContaining([
        {
          method: "paypal",
          reason: "runtime_ineligible",
          eligibility_key: "paypal",
        },
        {
          method: "paylater",
          reason: "sdk_component_missing",
          eligibility_key: "paylater",
        },
      ]),
    });
  });
});

describe("PayPal vault attribute planner", () => {
  it("includes PayPal wallet vault attributes only for logged-in save requests", () => {
    expect(
      planPayPalVaultAttributes({
        method: "paypal",
        saveForFutureRequested: true,
        buyer: {
          kind: "authenticated",
          userId: "user_123",
          paypalCustomerId: "paypal_customer_123",
        },
      }),
    ).toEqual({
      action: "include",
      reason: "logged_in_save_requested",
      method: "paypal",
      vault_requested: true,
      requires_client_token: true,
      target_customer_id: "paypal_customer_123",
      payment_source: {
        paypal: {
          attributes: {
            vault: {
              store_in_vault: "ON_SUCCESS",
              usage_type: "MERCHANT",
              customer_type: "CONSUMER",
            },
          },
        },
      },
    });
  });

  it("includes card vault, customer, and 3DS verification attributes for logged-in card saves", () => {
    expect(
      planPayPalVaultAttributes({
        method: "card",
        saveForFutureRequested: true,
        buyer: {
          kind: "authenticated",
          userId: "user_123",
          paypalCustomerId: "paypal_customer_123",
        },
      }),
    ).toEqual({
      action: "include",
      reason: "logged_in_save_requested",
      method: "card",
      vault_requested: true,
      requires_client_token: true,
      target_customer_id: "paypal_customer_123",
      payment_source: {
        card: {
          attributes: {
            customer: {
              id: "paypal_customer_123",
            },
            vault: {
              store_in_vault: "ON_SUCCESS",
            },
            verification: {
              method: "SCA_WHEN_REQUIRED",
            },
          },
        },
      },
    });
  });

  it("omits vault attributes when save for future is not requested", () => {
    expect(
      planPayPalVaultAttributes({
        method: "paypal",
        saveForFutureRequested: false,
        buyer: { kind: "authenticated", userId: "user_123" },
      }),
    ).toEqual({
      action: "omit",
      reason: "not_requested",
      method: "paypal",
      vault_requested: false,
      requires_client_token: false,
      target_customer_id: null,
      payment_source: null,
    });
  });

  it("rejects guest and unsupported-method vault requests before PayPal calls", () => {
    expect(
      planPayPalVaultAttributes({
        method: "card",
        saveForFutureRequested: true,
        buyer: { kind: "guest" },
      }),
    ).toEqual({
      action: "reject",
      reason: "guest_vaulting_not_allowed",
      method: "card",
      vault_requested: true,
      requires_client_token: false,
      target_customer_id: null,
      payment_source: null,
    });

    expect(
      planPayPalVaultAttributes({
        method: "paylater",
        saveForFutureRequested: true,
        buyer: { kind: "authenticated", userId: "user_123" },
      }),
    ).toEqual({
      action: "reject",
      reason: "unsupported_vaulting_method",
      method: "paylater",
      vault_requested: true,
      requires_client_token: false,
      target_customer_id: null,
      payment_source: null,
    });
  });
});

describe("PayPal client token request planner", () => {
  it("skips client token generation for standard one-time flows", () => {
    expect(
      planPayPalClientTokenRequest({
        flow: "standard",
        method: "paypal",
        buyer: { kind: "guest" },
        domains: ["localhost"],
      }),
    ).toEqual({
      action: "not_required",
      reason: "standard_flow_uses_client_id",
      needs_client_token: false,
    });
  });

  it("rejects guest vaulting before any server-side PayPal token request", () => {
    expect(
      planPayPalClientTokenRequest({
        flow: "vaulting",
        method: "card",
        buyer: { kind: "guest" },
        domains: ["localhost"],
      }),
    ).toEqual({
      action: "reject",
      http_status: 403,
      error_code: "GUEST_VAULTING_NOT_ALLOWED",
      message: "Sign in to save a payment method.",
      needs_client_token: true,
    });
  });

  it("allows logged-in card and PayPal vaulting with normalized client-token form fields", () => {
    expect(
      planPayPalClientTokenRequest({
        flow: "vaulting",
        method: "card",
        buyer: { kind: "authenticated", userId: "user_123" },
        domains: [" localhost ", "checkout.demo.example"],
      }),
    ).toEqual({
      action: "generate",
      method: "card",
      buyer_user_id: "user_123",
      domains: ["localhost", "checkout.demo.example"],
      paypal_oauth_form: {
        grant_type: "client_credentials",
        response_type: "client_token",
        domains: ["localhost", "checkout.demo.example"],
      },
      expires_in_seconds: 900,
      needs_client_token: true,
    });

    expect(
      planPayPalClientTokenRequest({
        flow: "vaulting",
        method: "paypal",
        buyer: {
          kind: "authenticated",
          userId: "user_456",
          paypalCustomerId: "paypal_customer_123",
        },
        domains: ["checkout.demo.example", "checkout.demo.example"],
      }),
    ).toEqual({
      action: "generate",
      method: "paypal",
      buyer_user_id: "user_456",
      paypal_customer_id: "paypal_customer_123",
      domains: ["checkout.demo.example"],
      paypal_oauth_form: {
        grant_type: "client_credentials",
        response_type: "client_token",
        domains: ["checkout.demo.example"],
        target_customer_id: "paypal_customer_123",
      },
      expires_in_seconds: 900,
      needs_client_token: true,
    });
  });

  it("rejects unsupported vaulting methods and missing domains", () => {
    expect(
      planPayPalClientTokenRequest({
        flow: "vaulting",
        method: "paylater",
        buyer: { kind: "authenticated", userId: "user_123" },
        domains: ["localhost"],
      }),
    ).toEqual({
      action: "reject",
      http_status: 400,
      error_code: "UNSUPPORTED_VAULTING_METHOD",
      message: "Client token vaulting is supported for card and PayPal only.",
      needs_client_token: true,
    });

    expect(
      planPayPalClientTokenRequest({
        flow: "vaulting",
        method: "card",
        buyer: { kind: "authenticated", userId: "user_123" },
        domains: [" "],
      }),
    ).toEqual({
      action: "reject",
      http_status: 400,
      error_code: "CLIENT_TOKEN_DOMAIN_REQUIRED",
      message: "At least one client-token domain is required.",
      needs_client_token: true,
    });
  });
});

describe("PayPal request metadata planner", () => {
  it("assigns a fresh PayPal request ID and base invoice ID for the first payment attempt", () => {
    expect(
      planPayPalRequestMetadata({
        orderNumber: "DO-20260531-000001",
        attemptNumber: 1,
        payloadFingerprint: "payload:v1",
        nextPayPalRequestId: "req_create_order_001",
      }),
    ).toEqual({
      action: "generate",
      reason: "fresh_payment_session",
      paypal_invoice_id: "DO-20260531-000001",
      paypal_request_id: "req_create_order_001",
      attempt_number: 1,
      payload_fingerprint: "payload:v1",
    });
  });

  it("reuses PayPal request ID only when retrying the same payload", () => {
    expect(
      planPayPalRequestMetadata({
        orderNumber: "DO-20260531-000001",
        attemptNumber: 1,
        payloadFingerprint: "payload:v1",
        nextPayPalRequestId: "req_create_order_should_not_use",
        previousRequest: {
          paypalInvoiceId: "DO-20260531-000001",
          paypalRequestId: "req_create_order_001",
          attemptNumber: 1,
          payloadFingerprint: "payload:v1",
        },
      }),
    ).toEqual({
      action: "reuse",
      reason: "same_payload_retry",
      paypal_invoice_id: "DO-20260531-000001",
      paypal_request_id: "req_create_order_001",
      attempt_number: 1,
      payload_fingerprint: "payload:v1",
    });
  });

  it("generates new metadata when payload changes or a fresh attempt is created", () => {
    expect(
      planPayPalRequestMetadata({
        orderNumber: "DO-20260531-000001",
        attemptNumber: 2,
        payloadFingerprint: "payload:v2",
        nextPayPalRequestId: "req_create_order_002",
        previousRequest: {
          paypalInvoiceId: "DO-20260531-000001",
          paypalRequestId: "req_create_order_001",
          attemptNumber: 1,
          payloadFingerprint: "payload:v1",
        },
      }),
    ).toEqual({
      action: "generate",
      reason: "payload_changed",
      paypal_invoice_id: "DO-20260531-000001-A2",
      paypal_request_id: "req_create_order_002",
      attempt_number: 2,
      payload_fingerprint: "payload:v2",
    });

    expect(
      planPayPalRequestMetadata({
        orderNumber: "PO-20260531-000002",
        attemptNumber: 3,
        payloadFingerprint: "payload:pickup:v3",
        nextPayPalRequestId: "req_create_order_003",
      }).paypal_invoice_id,
    ).toBe("PO-20260531-000002-A3");
  });

  it("rejects missing fingerprints and request IDs before calling PayPal", () => {
    expect(() =>
      planPayPalRequestMetadata({
        orderNumber: "DO-20260531-000001",
        attemptNumber: 1,
        payloadFingerprint: " ",
        nextPayPalRequestId: "req_create_order_001",
      }),
    ).toThrow("payload fingerprint is required");

    expect(() =>
      planPayPalRequestMetadata({
        orderNumber: "DO-20260531-000001",
        attemptNumber: 1,
        payloadFingerprint: "payload:v1",
        nextPayPalRequestId: " ",
      }),
    ).toThrow("PayPal request ID is required");
  });
});

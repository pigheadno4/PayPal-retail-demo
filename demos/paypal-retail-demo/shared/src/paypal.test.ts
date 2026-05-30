import { describe, expect, it } from "vitest";
import {
  buildPayPalDeliveryCreateOrderPayload,
  type PayPalOrderLineItemInput,
} from "./paypal.js";

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
    expect(payload.purchase_units[0]?.shipping.address).not.toHaveProperty(
      "address_line_2",
    );
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
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { CategoryPageData } from "../features/catalog/CategoryPage.js";
import type { ProductDetailPageData } from "../features/catalog/ProductDetailPage.js";
import type {
  CheckoutChoice,
  CheckoutPageData,
  CheckoutSelectedPaymentMethod,
} from "../features/checkout/CheckoutPage.js";
import type { ExpressReviewPageData } from "../features/checkout/ExpressReviewPage.js";
import type { CartData } from "../features/cart/cartModel.js";
import { App } from "./App.js";

describe("App shell", () => {
  it("renders the buyer shell without exposing an Admin navigation link", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/"
        initialHomePage={{
          hero: {
            eyebrow: "New arrival",
            title: "THE MONSTERS Labubu",
            subtitle: "Fresh collectible drops.",
            imagePath: "/assets/popmart/homepage/labubu-hero.webp",
            imageAlt: "Labubu character blind box hero",
            primaryCta: {
              href: "/products",
              label: "Shop now",
            },
            secondaryCta: {
              href: "/products?sort=newest",
              label: "New arrivals",
            },
          },
          hotSales: [],
          categories: [],
          calendar: {
            monthLabel: "June 2026",
            weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            days: [],
            selectedProducts: [],
          },
          payLaterPromo: {
            title: "Pay Later with PayPal",
            body: "Flexible payment options may be available at checkout.",
          },
          promoCards: [],
          popularSeries: [],
        }}
        initialConfig={{
          profile: {
            slug: "popmart",
            displayName: "POP MART",
            brandMode: "popmart",
          },
          market: {
            code: "US",
            currencyCode: "USD",
            locale: "en-US",
          },
          paypal: {
            providerKey: "paypal:sandbox:popmart:us:v1",
          },
        }}
      />,
    );

    expect(html).toContain("POP MART");
    expect(html).toContain("THE MONSTERS Labubu");
    expect(html).toContain('data-route-page="home"');
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-label="Open minicart"');
    expect(html).not.toContain('class="paypal-provider-scope"');
    expect(html).not.toContain('href="/admin"');
  });

  it("renders the admin shell only for manual admin routes", () => {
    const html = renderToStaticMarkup(<App initialPathname="/admin/orders" />);

    expect(html).toContain("Admin Portal");
    expect(html).toContain('data-route-scope="admin"');
    expect(html).not.toContain('aria-label="Open minicart"');
  });

  it("renders the category page for product listing routes", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products"
        initialCategoryPage={categoryPageData()}
      />,
    );

    expect(html).toContain('data-route-page="catalog"');
    expect(html).toContain("All products");
    expect(html).toContain("All options");
    expect(html).toContain("Reset filters");
    expect(html).toContain("Pay Later with PayPal");
    expect(html).toContain('href="/products/labubu-have-a-seat"');
    expect(html).not.toContain('href="/admin"');
  });

  it("renders a released PDP from product routes", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products/labubu-have-a-seat"
        initialProductPages={productPages()}
      />,
    );

    expect(html).toContain('data-route-page="product"');
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain(
      "Flexible payment options may be available for $13.99",
    );
    expect(html).toContain("Collector reviews");
    expect(html).not.toContain("Pickup");
  });

  it("renders an unreleased PDP without purchasable actions or reviews", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/products/skullpanda-future-drop"
        initialProductPages={productPages()}
      />,
    );

    expect(html).toContain("Skullpanda Future Drop");
    expect(html).toContain("Checkout opens after release.");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Collector reviews");
    expect(html).not.toContain(
      "Flexible payment options may be available for $15.99",
    );
  });

  it("renders the full cart for cart routes", () => {
    const html = renderToStaticMarkup(
      <App initialPathname="/cart" initialCart={cartData()} />,
    );

    expect(html).toContain('data-route-page="cart"');
    expect(html).toContain("Shopping cart");
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain(
      "Flexible payment options may be available for $25.98",
    );
    expect(html).toContain(
      "Prefer pickup? Choose store pickup during checkout.",
    );
    expect(html).not.toContain('href="/admin"');
  });

  it("renders the checkout page for checkout routes", () => {
    const html = renderToStaticMarkup(
      <App initialPathname="/checkout" initialCheckout={checkoutData()} />,
    );

    expect(html).toContain('data-route-page="checkout"');
    expect(html).toContain("Delivery");
    expect(html).toContain("Pickup");
    expect(html).toContain("Shipping address");
    expect(html).toContain("Pickup location");
    expect(html).toContain("Delivery order");
    expect(html).toContain('class="paypal-provider-scope"');
    expect(html).toContain('data-paypal-sdk-page-type="checkout"');
    expect(html).toContain('data-paypal-sdk-status="loading"');
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("Review and Confirm");
  });

  it("renders the express Review and Confirm page for express checkout return routes", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/checkout/express-review"
        initialExpressReview={expressReviewData()}
      />,
    );

    expect(html).toContain('data-route-page="express_review"');
    expect(html).toContain("Review and Confirm");
    expect(html).toContain("Delivery express from minicart");
    expect(html).toContain("DO-20260607-000777");
    expect(html).toContain("PayPal order 4MX98765YA1234567");
    expect(html).toContain("Payment session synchronized");
    expect(html).toContain("Confirm and pay");
    expect(html).not.toContain("Pickup");
    expect(html).not.toContain('class="paypal-provider-scope"');
    expect(html).not.toContain("Delivery or Pickup");
  });

  it("renders the Pay Later checkout provider scope when Pay Later is selected", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/checkout"
        initialCheckout={checkoutData({ selectedPaymentMethod: "paylater" })}
      />,
    );

    expect(html).toContain("Pay Later selected");
    expect(html).toContain('data-paypal-sdk-page-type="checkout"');
    expect(html).toContain('data-paypal-sdk-method="paylater"');
    expect(html).toContain('data-paypal-sdk-status="loading"');
  });

  it("renders the card checkout provider scope inside the payment step when card is selected", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/checkout"
        initialCheckout={checkoutData({ selectedPaymentMethod: "card" })}
      />,
    );

    expect(html).toContain("Credit or debit card selected");
    expect(html).toContain('data-payment-method-row="card"');
    expect(html).toContain('class="checkout-choice__card-box"');
    expect(html).toContain('data-paypal-sdk-page-type="checkout"');
    expect(html).toContain('data-paypal-sdk-method="card"');
    expect(html).toContain('data-paypal-sdk-status="loading"');
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
    expect(html).not.toContain('class="checkout-sticky-action"');
  });

  it.each([
    ["Apple Pay", "apple_pay"],
    ["Google Pay", "google_pay"],
    ["Venmo", "venmo"],
  ] as const)(
    "renders the %s checkout provider scope when selected",
    (_label, selectedPaymentMethod) => {
      const html = renderToStaticMarkup(
        <App
          initialPathname="/checkout"
          initialCheckout={checkoutData({ selectedPaymentMethod })}
        />,
      );

      expect(html).toContain(
        `data-paypal-sdk-method="${selectedPaymentMethod}"`,
      );
      expect(html).toContain('data-paypal-sdk-status="loading"');
    },
  );

  it("does not render an ineligible selected wallet action", () => {
    const html = renderToStaticMarkup(
      <App
        initialPathname="/checkout"
        initialCheckout={checkoutData({
          selectedPaymentMethod: "apple_pay",
          walletEligible: false,
        })}
      />,
    );

    expect(html).not.toContain('data-payment-method-row="apple_pay"');
    expect(html).not.toContain('data-paypal-sdk-method="apple_pay"');
    expect(html).not.toContain('data-wallet-method="apple_pay"');
    expect(html).not.toContain('data-payment-action-placement="order-summary"');
  });
});

function categoryPageData(): CategoryPageData {
  return {
    title: "All products",
    subtitle: "Filter collectible drops by series, status, and availability.",
    resultCountLabel: "1 product",
    appliedFilterCount: 0,
    resetHref: "/products",
    categorySwitcher: {
      label: "Category",
      options: [
        {
          label: "All options",
          href: "/products",
          active: true,
          countLabel: "1",
        },
      ],
    },
    filters: [],
    payLaterPromo: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available at checkout.",
    },
    products: [
      {
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        priceLabel: "$13.99",
        regularPriceLabel: "$13.99",
        statusLabel: "Released",
        pickupLabel: "Pickup eligible",
        href: "/products/labubu-have-a-seat",
      },
    ],
  };
}

function productPages(): Readonly<Record<string, ProductDetailPageData>> {
  return {
    "labubu-have-a-seat": {
      slug: "labubu-have-a-seat",
      name: "Labubu Have a Seat",
      categoryName: "Blind Boxes",
      seriesName: "THE MONSTERS",
      statusLabel: "Released",
      purchasable: true,
      currentPriceLabel: "$13.99",
      regularPriceLabel: "$15.99",
      introduction:
        "A cozy seated Labubu blind box with soft shelf presence and collectible surprise energy.",
      details: [],
      gallery: [
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          imageAlt: "Labubu Have a Seat front view",
        },
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-2.svg",
          imageAlt: "Labubu Have a Seat box view",
        },
        {
          imagePath: "/assets/popmart/products/labubu-have-a-seat-3.svg",
          imageAlt: "Labubu Have a Seat side view",
        },
      ],
      payLaterMessage: {
        title: "Pay Later with PayPal",
        body: "Flexible payment options may be available for $13.99 at checkout.",
      },
      reviews: [
        {
          id: "review-1",
          authorName: "Mina",
          ratingLabel: "5 out of 5",
          title: "Cute desk companion",
          body: "Arrived safely and looks great next to my monitor.",
        },
      ],
    },
    "skullpanda-future-drop": {
      slug: "skullpanda-future-drop",
      name: "Skullpanda Future Drop",
      categoryName: "Figures",
      seriesName: "Skullpanda",
      statusLabel: "Not released",
      purchasable: false,
      unavailableReason: "Checkout opens after release.",
      currentPriceLabel: "$15.99",
      regularPriceLabel: "$17.99",
      introduction:
        "A coming-soon Skullpanda release page for previewing product details before checkout opens.",
      details: [],
      gallery: [
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-1.svg",
          imageAlt: "Skullpanda Future Drop front view",
        },
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-2.svg",
          imageAlt: "Skullpanda Future Drop box view",
        },
        {
          imagePath: "/assets/popmart/products/skullpanda-future-drop-3.svg",
          imageAlt: "Skullpanda Future Drop side view",
        },
      ],
      payLaterMessage: {
        title: "Pay Later with PayPal",
        body: "Flexible payment options may be available for $15.99 at checkout.",
      },
      reviews: [],
    },
  };
}

function cartData(): CartData {
  return {
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: "USD",
    locale: "en-US",
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [
      {
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        unitPriceCents: 1299,
        currentPriceLabel: "$12.99",
        regularPriceLabel: "$13.99",
        quantity: 1,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
      },
      {
        slug: "hirono-little-mischief",
        name: "Hirono Little Mischief",
        categoryName: "Plush",
        imagePath: "/assets/popmart/products/hirono-little-mischief-1.svg",
        imageAlt: "Hirono Little Mischief collectible",
        unitPriceCents: 1299,
        currentPriceLabel: "$12.99",
        regularPriceLabel: "$12.99",
        quantity: 1,
        maxQuantity: 3,
        href: "/products/hirono-little-mischief",
      },
    ],
  };
}

function expressReviewData(): ExpressReviewPageData {
  return {
    sourceLabel: "Delivery express from minicart",
    merchantOrderNumber: "DO-20260607-000777",
    paypalOrderId: "4MX98765YA1234567",
    paymentMethodLabel: "Pay Later",
    statusLabel: "Payment session synchronized",
    shippingAddress: {
      name: "Taylor Chen",
      line1: "88 Spring Street",
      line2: "New York, NY 10012",
      country: "United States",
    },
    shippingOption: {
      label: "Standard shipping",
      detail: "Arrives in 4-6 business days",
      amountLabel: "$5.00",
    },
    items: [
      {
        id: "line-1",
        name: "Labubu Have a Seat",
        detail: "Blind Boxes - Qty 1",
        amountLabel: "$12.99",
      },
    ],
    totals: [
      {
        label: "Merchandise subtotal",
        amountLabel: "$12.99",
      },
      {
        label: "Shipping",
        amountLabel: "$5.00",
      },
      {
        label: "Promo",
        amountLabel: "-$2.00",
      },
      {
        label: "Tax",
        amountLabel: "$1.32",
      },
      {
        label: "Total",
        amountLabel: "$17.31",
        emphasis: true,
      },
    ],
    amountGuard: {
      status: "verified",
      label: "Amount verified",
      body: "Merchant total matches the synchronized PayPal order amount.",
    },
  };
}

function checkoutData({
  selectedPaymentMethod = "paypal",
  walletEligible = true,
}: {
  readonly selectedPaymentMethod?: CheckoutSelectedPaymentMethod;
  readonly walletEligible?: boolean;
} = {}): CheckoutPageData {
  const selectedPaymentLabel =
    selectedPaymentMethod === "paylater"
      ? "Pay Later selected"
      : selectedPaymentMethod === "card"
        ? "Credit or debit card selected"
        : selectedPaymentMethod === "apple_pay"
          ? "Apple Pay selected"
          : selectedPaymentMethod === "google_pay"
            ? "Google Pay selected"
            : selectedPaymentMethod === "venmo"
              ? "Venmo selected"
              : "PayPal selected";
  const paymentChoices: readonly CheckoutChoice[] = [
    {
      label: "PayPal",
      method: "paypal",
    },
    {
      label: "Pay Later",
      method: "paylater",
    },
    {
      label: "Credit or debit card",
      method: "card",
    },
    {
      label: "Apple Pay",
      method: "apple_pay",
      eligible: selectedPaymentMethod === "apple_pay" ? walletEligible : true,
    },
    {
      label: "Google Pay",
      method: "google_pay",
      eligible: selectedPaymentMethod === "google_pay" ? walletEligible : true,
    },
    {
      label: "Venmo",
      method: "venmo",
      eligible: selectedPaymentMethod === "venmo" ? walletEligible : true,
    },
  ];

  return {
    activeMode: "delivery",
    modeLocked: false,
    lockedReason: "Switching requires abandoning this payment attempt.",
    delivery: {
      label: "Delivery",
      checkoutDraftId: "draft_delivery_123",
      summary: {
        title: "Delivery order",
        contextLabel: "Ground delivery",
        subtotalLabel: "$25.98",
        promoLabel: "Auto promo calculating",
        totalLabel: "$25.98",
        selectedPaymentLabel,
        selectedPaymentMethod,
      },
      steps: [
        {
          id: "shipping-address",
          title: "Shipping address",
          state: "idle",
          body: "Use saved shipping address or enter a new delivery address.",
        },
        {
          id: "payment-method",
          title: "Payment method",
          state: "editing",
          body: "Radio-first payment method wall renders here.",
          choices: paymentChoices,
        },
      ],
    },
    pickup: {
      label: "Pickup",
      checkoutDraftId: "draft_pickup_123",
      summary: {
        title: "Pickup order",
        contextLabel: "POP MART Soho",
        subtotalLabel: "$12.99",
        promoLabel: "Pickup promo recalculating",
        totalLabel: "$12.99",
        selectedPaymentLabel,
        selectedPaymentMethod,
        readyItemsLabel: "Ready for pickup: 1 item",
        unavailableItemsLabel: "Not available at this store: 1 item",
        partialInventoryNote: "Unavailable items stay in the original cart.",
      },
      steps: [
        {
          id: "pickup-location",
          title: "Pickup location",
          state: "idle",
          body: "Use ZIP or default address to rank nearby stores.",
        },
        {
          id: "pickup-payment-method",
          title: "Payment method",
          state: "editing",
          body: "Pickup payment method wall renders here.",
          choices: paymentChoices,
        },
      ],
    },
  };
}

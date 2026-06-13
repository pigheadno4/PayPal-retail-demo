// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type { ApiClient, ApiQueryParams } from "../api/client.js";
import type { CartData } from "../features/cart/cartModel.js";
import type { ProductDetailPageData } from "../features/catalog/ProductDetailPage.js";
import { App } from "./App.js";

afterEach(() => {
  cleanup();
});

describe("App buyer interactions", () => {
  it("adds a PDP item to the shared cart state and opens the minicart", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient()}
        initialPathname="/products/labubu-have-a-seat"
        initialCart={singleItemCart({ quantity: 1 })}
        initialProductPages={{
          "labubu-have-a-seat": releasedProduct(),
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    const minicart = screen.getByLabelText("Minicart");
    expect(minicart.getAttribute("data-panel-state")).toBe("open");
    expect(within(minicart).getByText("2 items")).toBeTruthy();
    expect(within(minicart).getByText("Qty 2 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $27.98 at checkout.",
      ),
    ).toBeTruthy();
    expect(getShellStatusText()).toContain("Added Labubu Have a Seat to cart.");
  });

  it("shares full-cart quantity changes with the minicart and Pay Later amount", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient()}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Open minicart" }));

    const minicart = screen.getByLabelText("Minicart");
    expect(minicart.getAttribute("data-panel-state")).toBe("open");
    expect(within(minicart).getByText("2 items")).toBeTruthy();
    expect(within(minicart).getByText("Qty 2 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $27.98 at checkout.",
      ),
    ).toBeTruthy();
  });

  it("syncs cart quantity and refreshes before checkout or express starts", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient();

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "patch",
        path: "/api/cart/items/cart_item_labubu",
        body: { quantity: 2 },
        query: { market: "US" },
      });
    });

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Delivery or Pickup" }),
      ).toBeTruthy();
    });
    expect(apiClient.calls).toContainEqual({
      method: "post",
      path: "/api/cart/refresh",
      body: { trigger: "checkout_start" },
      query: { market: "US" },
    });

    cleanup();
    apiClient.calls.length = 0;

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    await user.click(
      within(orderSummary).getByRole("button", {
        name: "PayPal",
      }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Review and Confirm" }),
      ).toBeTruthy();
    });
    expect(apiClient.calls).toContainEqual({
      method: "post",
      path: "/api/cart/refresh",
      body: { trigger: "express_payment_start" },
      query: { market: "US" },
    });
  });

  it("reconciles server cart responses back into cart and minicart UI", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: cartApiResponse({
        quantity: 3,
        unitPriceMinor: 1099,
      }),
      postResponse: cartApiResponse({
        quantity: 1,
        unitPriceMinor: 999,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("3");
    });
    expect(screen.getByText("$32.97")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const minicart = screen.getByLabelText("Minicart");
    expect(within(minicart).getByText("Qty 3 · $10.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $32.97 at checkout.",
      ),
    ).toBeTruthy();

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Delivery or Pickup" }),
      ).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Open minicart" }).textContent,
    ).toContain("1");
  });

  it("closes minicart and navigates cart checkout actions through app state", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient()}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open minicart" }));

    const openedMinicart = screen.getByLabelText("Minicart");
    expect(openedMinicart.getAttribute("data-panel-state")).toBe("open");

    await user.click(
      within(openedMinicart).getByRole("button", {
        name: "Close minicart",
      }),
    );

    expect(openedMinicart.getAttribute("data-panel-state")).toBe("closed");
    expect(getShellStatusText()).toContain("Minicart closed.");

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const reopenedMinicart = screen.getByLabelText("Minicart");

    await user.click(
      within(reopenedMinicart).getByRole("link", {
        name: "View cart",
      }),
    );

    expect(screen.getByRole("heading", { name: "Shopping cart" })).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/cart");
    expect(reopenedMinicart.getAttribute("data-panel-state")).toBe("closed");
    expect(getShellStatusText()).toContain("Opened cart.");

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    await user.click(
      within(orderSummary).getByRole("link", {
        name: "Go to checkout",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Delivery or Pickup" }),
    ).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/checkout");
    expect(getShellStatusText()).toContain("Opened checkout.");
  });

  it("navigates from minicart checkout directly into checkout", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient()}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const minicart = screen.getByLabelText("Minicart");

    await user.click(
      within(minicart).getByRole("link", {
        name: "Checkout",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Delivery or Pickup" }),
    ).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/checkout");
    expect(minicart.getAttribute("data-panel-state")).toBe("closed");
    expect(getShellStatusText()).toContain("Opened checkout.");
  });

  it("starts delivery express from PDP, cart, and minicart actions into Review and Confirm", async () => {
    const user = userEvent.setup();

    const expressEntries = [
      {
        initialPathname: "/products/labubu-have-a-seat",
        initialProductPages: {
          "labubu-have-a-seat": releasedProduct(),
        },
        trigger: async () => {
          const purchaseActions = screen.getByLabelText("Purchase actions");

          await user.click(
            within(purchaseActions).getByRole("button", {
              name: "PayPal",
            }),
          );
        },
        expectedSource: "Delivery express from product detail",
        expectedMethod: "PayPal",
      },
      {
        initialPathname: "/cart",
        trigger: async () => {
          const orderSummary = screen.getByRole("complementary", {
            name: "Order summary",
          });

          await user.click(
            within(orderSummary).getByRole("button", {
              name: "Pay Later",
            }),
          );
        },
        expectedSource: "Delivery express from cart",
        expectedMethod: "Pay Later",
      },
      {
        initialPathname: "/",
        trigger: async () => {
          await user.click(
            screen.getByRole("button", { name: "Open minicart" }),
          );
          const minicart = screen.getByLabelText("Minicart");

          await user.click(
            within(minicart).getByRole("button", {
              name: "PayPal",
            }),
          );
        },
        expectedSource: "Delivery express from minicart",
        expectedMethod: "PayPal",
      },
    ];

    for (const entry of expressEntries) {
      const rendered = render(
        <App
          apiClient={createRecordingApiClient()}
          initialPathname={entry.initialPathname}
          initialCart={singleItemCart({ quantity: 1 })}
          {...(entry.initialProductPages
            ? { initialProductPages: entry.initialProductPages }
            : {})}
        />,
      );

      await entry.trigger();

      expect(
        screen.getByRole("heading", {
          name: "Review and Confirm",
        }),
      ).toBeTruthy();
      expect(screen.getByText(entry.expectedSource)).toBeTruthy();
      expect(
        screen.getByLabelText(`Payment method ${entry.expectedMethod}`),
      ).toBeTruthy();
      expect(getShellStatusText()).toContain(
        `Started ${entry.expectedMethod} delivery express.`,
      );

      rendered.unmount();
    }
  });

  it("switches eligible checkout wallet radios into the selected order summary action", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient()}
        initialPathname="/checkout"
      />,
    );

    await advanceDeliveryCheckoutToPayment(user);

    const paymentStep = getStep("Payment method");
    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });

    for (const [label, method] of [
      ["Apple Pay", "apple_pay"],
      ["Google Pay", "google_pay"],
      ["Venmo", "venmo"],
    ] as const) {
      await user.click(
        within(paymentStep).getByRole("radio", {
          name: label,
        }),
      );

      expect(
        orderSummary.querySelector(
          `.checkout-summary__slot [data-paypal-sdk-method="${method}"]`,
        ),
      ).toBeTruthy();
      expect(orderSummary.textContent).toContain(`${label} selected`);
    }
  });

  it("updates checkout totals from delivery draft API recalculation", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    const shippingStep = getStep("Shipping address");
    await user.clear(within(shippingStep).getByLabelText("Full name"));
    await user.type(
      within(shippingStep).getByLabelText("Full name"),
      "Jordan Li",
    );
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: "/api/checkout/drafts/draft_delivery_123/shipping-address",
        }),
      );
    });
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        body: expect.objectContaining({
          recipient_name: "Jordan Li",
          address_line1: "88 Spring Street",
          city: "New York",
          country_code: "US",
          postal_code: "10012",
          state: "NY",
        }),
      }),
    );

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    await waitFor(() => {
      expect(within(orderSummary).getByText("$31.25")).toBeTruthy();
    });
    expect(within(orderSummary).getByText("SAVE10")).toBeTruthy();
    await waitForStepState(shippingStep, "saved");

    const billingStep = getStep("Billing address");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        body: {
          same_as_shipping: true,
          save_to_address_book: true,
        },
        method: "patch",
        path: "/api/checkout/drafts/draft_delivery_123/billing-address",
      }),
    );

    const shippingOptionsStep = getStep("Shipping options");
    await user.click(
      within(shippingOptionsStep).getByRole("button", {
        name: "Submit shipping option",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            shipping_option_id: "ship_standard",
          },
          method: "patch",
          path: "/api/checkout/drafts/draft_delivery_123/shipping-option",
        }),
      );
    });
  });

  it("updates checkout totals from pickup draft API recalculation", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "pickup",
        promoLabel: "PICKUP5",
        totalMinor: 1349,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Pickup" }));
    const pickupLocationStep = getStep("Pickup location");
    await user.clear(
      within(pickupLocationStep).getByLabelText("ZIP or postcode"),
    );
    await user.type(
      within(pickupLocationStep).getByLabelText("ZIP or postcode"),
      "SW1A 1AA",
    );
    await user.click(
      within(pickupLocationStep).getByRole("button", {
        name: "Find pickup stores",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            country_code: "US",
            county: null,
            postal_code: "SW1A 1AA",
            state: null,
          },
          method: "patch",
          path: "/api/checkout/drafts/draft_pickup_123/pickup-location",
        }),
      );
    });

    const storeDialog = screen.getByRole("dialog", {
      name: "Choose pickup store",
    });
    await user.click(
      within(storeDialog).getByRole("radio", {
        name: /POP MART Covent Garden/,
      }),
    );
    await user.click(
      within(storeDialog).getByRole("button", {
        name: "Confirm pickup store",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            store_id: "store_popmart_covent_garden",
          },
          method: "patch",
          path: "/api/checkout/drafts/draft_pickup_123/pickup-store",
        }),
      );
    });

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getByText("PICKUP5")).toBeTruthy();
    expect(within(orderSummary).getByText("$13.49")).toBeTruthy();

    const billingStep = getStep("Billing address");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "patch",
        path: "/api/checkout/drafts/draft_pickup_123/billing-address",
      }),
    );

    const pickupDateStep = getStep("Pickup date");
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            pickup_date: "2026-06-12",
          },
          method: "patch",
          path: "/api/checkout/drafts/draft_pickup_123/pickup-date",
        }),
      );
    });
  });

  it("lets a buyer move from PDP add-to-cart through minicart checkout into Delivery payment selection", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient({
          patchResponse: checkoutDraftApiResponse({
            fulfillmentMode: "delivery",
            promoLabel: "SAVE10",
            totalMinor: 3125,
          }),
        })}
        initialPathname="/products/labubu-have-a-seat"
        initialCart={singleItemCart({ quantity: 1 })}
        initialProductPages={{
          "labubu-have-a-seat": releasedProduct(),
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    const minicart = screen.getByLabelText("Minicart");
    await user.click(
      within(minicart).getByRole("link", {
        name: "Checkout",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "Delivery or Pickup" }),
    ).toBeTruthy();

    await advanceDeliveryCheckoutToPayment(user);

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
    expect(
      (
        within(paymentStep).getByRole("radio", {
          name: "PayPal",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      screen.getByRole("complementary", { name: "Order summary" }).textContent,
    ).toContain("PayPal selected");
  });

  it("lets a buyer move from cart checkout into Pickup payment selection", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient({
          patchResponse: checkoutDraftApiResponse({
            fulfillmentMode: "pickup",
            promoLabel: "PICKUP5",
            totalMinor: 1349,
          }),
        })}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));
    await user.click(screen.getByRole("tab", { name: "Pickup" }));

    const pickupLocationStep = getStep("Pickup location");
    await user.clear(
      within(pickupLocationStep).getByLabelText("ZIP or postcode"),
    );
    await user.type(
      within(pickupLocationStep).getByLabelText("ZIP or postcode"),
      "SW1A 1AA",
    );
    await user.click(
      within(pickupLocationStep).getByRole("button", {
        name: "Find pickup stores",
      }),
    );

    const storeDialog = screen.getByRole("dialog", {
      name: "Choose pickup store",
    });
    await user.click(
      within(storeDialog).getByRole("radio", {
        name: /POP MART Covent Garden/,
      }),
    );
    await user.click(
      within(storeDialog).getByRole("button", {
        name: "Confirm pickup store",
      }),
    );

    const billingStep = getStep("Billing address");
    await user.click(
      within(billingStep).getByRole("button", {
        name: "Save billing address",
      }),
    );
    await waitForStepState(billingStep, "saved");

    const pickupDateStep = getStep("Pickup date");
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );
    await waitForStepState(pickupDateStep, "saved");

    const paymentStep = getStep("Payment method");
    expect(paymentStep.getAttribute("data-step-state")).toBe("editing");
    expect(
      (
        within(paymentStep).getByRole("radio", {
          name: "PayPal",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    expect(
      screen.getByRole("complementary", { name: "Order summary" }).textContent,
    ).toContain("PayPal selected");
  });
});

async function advanceDeliveryCheckoutToPayment(
  user: ReturnType<typeof userEvent.setup>,
) {
  const shippingStep = getStep("Shipping address");
  await user.click(
    within(shippingStep).getByRole("button", {
      name: "Submit shipping address",
    }),
  );
  await waitForStepState(shippingStep, "saved");

  const billingStep = getStep("Billing address");
  await user.click(
    within(billingStep).getByRole("button", {
      name: "Save billing address",
    }),
  );
  await waitForStepState(billingStep, "saved");

  const shippingOptionsStep = getStep("Shipping options");
  await user.click(
    within(shippingOptionsStep).getByRole("button", {
      name: "Submit shipping option",
    }),
  );
  await waitForStepState(shippingOptionsStep, "saved");
}

function getStep(title: string): HTMLElement {
  const heading = screen.getByRole("heading", { name: title });
  const step = heading.closest("article");

  if (!step) {
    throw new Error(`Could not find checkout step for ${title}`);
  }

  return step;
}

async function waitForStepState(step: HTMLElement, state: string) {
  await waitFor(() => {
    expect(step.getAttribute("data-step-state")).toBe(state);
  });
}

function getShellStatusText(): string {
  return document.querySelector("#shell-status")?.textContent ?? "";
}

function singleItemCart({ quantity }: { readonly quantity: number }): CartData {
  return {
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: "USD",
    locale: "en-US",
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [
      {
        id: "cart_item_labubu",
        slug: "labubu-have-a-seat",
        name: "Labubu Have a Seat",
        categoryName: "Blind Boxes",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat collectible",
        unitPriceCents: 1399,
        currentPriceLabel: "$13.99",
        regularPriceLabel: "$15.99",
        quantity,
        maxQuantity: 5,
        href: "/products/labubu-have-a-seat",
      },
    ],
  };
}

interface RecordingApiCall {
  readonly method: "get" | "patch" | "post";
  readonly path: string;
  readonly body?: unknown;
  readonly query?: ApiQueryParams | undefined;
}

interface RecordingApiClientInput {
  readonly getResponse?: unknown;
  readonly patchResponse?: unknown;
  readonly postResponse?: unknown;
}

function createRecordingApiClient(
  input: RecordingApiClientInput = {},
): ApiClient & {
  readonly calls: RecordingApiCall[];
} {
  const calls: RecordingApiCall[] = [];

  return {
    calls,
    async get<TData = unknown>(path: string, query?: ApiQueryParams) {
      calls.push({ method: "get", path, query });
      return (input.getResponse ?? {}) as TData;
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
    ) {
      calls.push({ method: "patch", path, body, query });
      return (input.patchResponse ?? {}) as TData;
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
    ) {
      calls.push({ method: "post", path, body, query });
      return (input.postResponse ?? {}) as TData;
    },
  };
}

function cartApiResponse({
  quantity,
  unitPriceMinor,
}: {
  readonly quantity: number;
  readonly unitPriceMinor: number;
}) {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: "cart_public_existing",
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: "guest",
      status: "active",
      currency_code: "USD",
      items: [
        {
          id: "cart_item_labubu",
          product_id: "product_labubu",
          slug: "labubu-have-a-seat",
          name: "Labubu Have a Seat",
          image_path: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          quantity,
          unit_price_minor: unitPriceMinor,
          line_subtotal_minor: unitPriceMinor * quantity,
          checkout_eligible: true,
        },
      ],
      totals: {
        item_count: quantity,
        subtotal_minor: unitPriceMinor * quantity,
        currency_code: "USD",
      },
      binding: null,
    },
    adjustments: [],
  };
}

function checkoutDraftApiResponse({
  fulfillmentMode,
  promoLabel,
  totalMinor,
}: {
  readonly fulfillmentMode: "delivery" | "pickup";
  readonly promoLabel: string;
  readonly totalMinor: number;
}) {
  return {
    draft: {
      id:
        fulfillmentMode === "delivery"
          ? "draft_delivery_123"
          : "draft_pickup_123",
      cart_id: "cart_guest_us",
      fulfillment_mode: fulfillmentMode,
      status: "draft",
      active_step:
        fulfillmentMode === "delivery" ? "shipping_option" : "pickup_date",
      delivery: {
        shipping_address: null,
        billing_address: null,
        same_as_shipping: true,
        shipping_options: [
          {
            id: "ship_standard",
            service_code: "standard",
            display_name: "Standard shipping",
            amount_minor: 500,
            estimated_days_min: 4,
            estimated_days_max: 6,
          },
        ],
        selected_shipping_option_id: "ship_standard",
      },
      pickup: {
        location: null,
        selected_store_id: null,
        pickup_dates: [],
        selected_pickup_date: null,
        inventory: {
          ready_items: [],
          unavailable_items: [],
          unavailable_subtotal_minor: 0,
        },
      },
      summary: {
        item_count: 1,
        merchandise_subtotal_minor: 2598,
        discount_minor: 400,
        tax_minor: 227,
        shipping_minor: 700,
        total_minor: totalMinor,
        currency_code: "USD",
      },
      promo: {
        status: "selected",
        recommended_codes: [promoLabel],
        selected_codes: [promoLabel],
      },
    },
  };
}

function releasedProduct(): ProductDetailPageData {
  return {
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
    details: [
      {
        label: "Material",
        value: "PVC / ABS",
      },
    ],
    gallery: [
      {
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat front view",
      },
    ],
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available for $13.99 at checkout.",
    },
    reviews: [],
  };
}

// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ApiClient,
  ApiQueryParams,
  ApiRequestOptions,
} from "../api/client.js";
import type { CartData } from "../features/cart/cartModel.js";
import type { ProductDetailPageData } from "../features/catalog/ProductDetailPage.js";
import { App } from "./App.js";

const deliveryDraftUuid = "11111111-1111-4111-8111-111111111111";
const pickupDraftUuid = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
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

  it("syncs cart quantity, refreshes before checkout, and mounts express SDK scopes", async () => {
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

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "get",
        path: "/api/paypal/sdk-config",
        query: {
          market: "US",
          page_type: "checkout",
          flow: "standard",
          method: "paypal",
        },
      });
    });
    expect(apiClient.calls).toContainEqual({
      method: "get",
      path: "/api/paypal/sdk-config",
      query: {
        market: "US",
        page_type: "checkout",
        flow: "standard",
        method: "paylater",
      },
    });
  });

  it("syncs minicart quantity changes through the same server-backed cart path", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      patchResponse: cartApiResponse({
        cartClientSecret: "cart_secret_existing",
        quantity: 4,
        unitPriceMinor: 1399,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/"
        initialCart={singleItemCart({
          cartClientSecret: "cart_secret_existing",
          quantity: 1,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const minicart = screen.getByLabelText("Minicart");

    await user.click(
      within(minicart).getByRole("button", {
        name: "Increase Labubu Have a Seat quantity",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "patch",
        path: "/api/cart/items/cart_item_labubu",
        body: { quantity: 2 },
        query: { market: "US" },
        options: {
          headers: {
            "x-cart-id": "cart_public_existing",
            "x-cart-secret": "cart_secret_existing",
          },
        },
      });
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("4");
    });
    expect(within(minicart).getByText("Qty 4 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $55.96 at checkout.",
      ),
    ).toBeTruthy();
  });

  it("keeps active cart count and minicart contents when navigating to checkout", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponse: cartApiResponse({
        cartClientSecret: "cart_secret_existing",
        quantity: 2,
        unitPriceMinor: 1399,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({
          cartClientSecret: "cart_secret_existing",
          quantity: 2,
        })}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Delivery or Pickup" }),
      ).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("2");
    });
    expect(apiClient.calls).toContainEqual({
      method: "post",
      path: "/api/cart/refresh",
      body: { trigger: "checkout_start" },
      query: { market: "US" },
      options: {
        headers: {
          "x-cart-id": "cart_public_existing",
          "x-cart-secret": "cart_secret_existing",
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const minicart = screen.getByLabelText("Minicart");
    expect(within(minicart).getByText("Qty 2 · $13.99")).toBeTruthy();
    expect(
      within(minicart).getByText(
        "Flexible payment options may be available for $27.98 at checkout.",
      ),
    ).toBeTruthy();
  });

  it("attaches guest cart headers to cart refresh and checkout draft updates", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({
          cartClientSecret: "cart_secret_existing",
          quantity: 1,
        })}
      />,
    );

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Delivery or Pickup" }),
      ).toBeTruthy();
    });
    const shippingStep = getStep("Shipping address");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/cart/refresh",
          options: {
            headers: {
              "x-cart-id": "cart_public_existing",
              "x-cart-secret": "cart_secret_existing",
            },
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/checkout/drafts",
          options: {
            headers: {
              "x-cart-id": "cart_public_existing",
              "x-cart-secret": "cart_secret_existing",
            },
          },
        }),
      );
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: `/api/checkout/drafts/${deliveryDraftUuid}/shipping-address`,
          options: {
            headers: {
              "x-cart-id": "cart_public_existing",
              "x-cart-secret": "cart_secret_existing",
            },
          },
        }),
      );
    });
  });

  it("restores the active server cart from persisted guest cart binding on app load", async () => {
    window.localStorage.setItem(
      "paypal-retail-demo:cart-binding:popmart:US",
      JSON.stringify({
        cart_public_id: "cart_public_restored",
        cart_client_secret: "cart_secret_restored",
      }),
    );
    const apiClient = createRecordingApiClient({
      getResponse: cartApiResponse({
        cartClientSecret: "cart_secret_restored",
        cartPublicId: "cart_public_restored",
        quantity: 4,
        unitPriceMinor: 888,
      }),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("4");
    });
    expect(apiClient.calls).toContainEqual({
      method: "get",
      path: "/api/cart",
      query: { market: "US" },
      options: {
        headers: {
          "x-cart-id": "cart_public_restored",
          "x-cart-secret": "cart_secret_restored",
        },
      },
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

  it("renders official delivery express SDK scopes from PDP, cart, and minicart placements", async () => {
    const user = userEvent.setup();

    const expressEntries = [
      {
        initialPathname: "/products/labubu-have-a-seat",
        initialProductPages: {
          "labubu-have-a-seat": releasedProduct(),
        },
        trigger: async () => {
          const purchaseActions = screen.getByLabelText("Purchase actions");
          expectExpressScopes(purchaseActions);
        },
      },
      {
        initialPathname: "/cart",
        trigger: async () => {
          const orderSummary = screen.getByRole("complementary", {
            name: "Order summary",
          });

          expectExpressScopes(orderSummary);
        },
      },
      {
        initialPathname: "/",
        trigger: async () => {
          await user.click(
            screen.getByRole("button", { name: "Open minicart" }),
          );
          const minicart = screen.getByLabelText("Minicart");

          expectExpressScopes(minicart);
        },
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

      rendered.unmount();
    }
  });

  it("loads synchronized express review totals from the PayPal session snapshot", async () => {
    const apiClient = createRecordingApiClient({
      getResponse: expressReviewApiResponse(),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("DO-20260601-000002")).toBeTruthy();
    });

    expect(apiClient.calls).toContainEqual({
      method: "get",
      path: "/api/paypal/orders/express-review",
      query: {
        market: "US",
        paypal_order_id: "PAYPAL_ORDER_EXPRESS",
      },
    });
    expect(screen.getByText("Ground")).toBeTruthy();
    expect(screen.getByText("Taylor Chen")).toBeTruthy();
    expect(screen.getByText("$38.56")).toBeTruthy();
    expect(screen.getByText("Amount verified")).toBeTruthy();
  });

  it("switches eligible checkout wallet radios into the selected order summary action", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
    });

    render(<App apiClient={apiClient} initialPathname="/checkout" />);

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
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
        promoLabel: "SAVE10",
        totalMinor: 3125,
      }),
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
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
      expect(apiClient.calls).toContainEqual({
        body: {
          fulfillment_mode: "delivery",
        },
        method: "post",
        path: "/api/checkout/drafts",
        query: { market: "US" },
      });
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: `/api/checkout/drafts/${deliveryDraftUuid}/shipping-address`,
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
        path: `/api/checkout/drafts/${deliveryDraftUuid}/billing-address`,
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
          path: `/api/checkout/drafts/${deliveryDraftUuid}/shipping-option`,
        }),
      );
    });
    expect(within(orderSummary).getByText("Shipping")).toBeTruthy();
    expect(within(orderSummary).getByText("$5.00")).toBeTruthy();
  });

  it("keeps checkout section open when the App checkout draft API call fails", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const apiClient = createRecordingApiClient({
      patchError: new Error("checkout API unavailable"),
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "delivery",
        id: deliveryDraftUuid,
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
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitForStepState(shippingStep, "blocked");
    expect(within(shippingStep).getByLabelText("Full name")).toBeTruthy();
    expect(within(shippingStep).getByRole("alert").textContent).toContain(
      "We could not save Shipping address. Please try again.",
    );
    expect(getShellStatusText()).toContain(
      "Checkout update failed. Please try again.",
    );
    consoleError.mockRestore();
  });

  it("updates checkout totals from pickup draft API recalculation", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "pickup",
        id: pickupDraftUuid,
        promoLabel: "PICKUP5",
        totalMinor: 1349,
      }),
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "pickup",
        id: pickupDraftUuid,
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
          path: `/api/checkout/drafts/${pickupDraftUuid}/pickup-location`,
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
          path: `/api/checkout/drafts/${pickupDraftUuid}/pickup-store`,
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
        path: `/api/checkout/drafts/${pickupDraftUuid}/billing-address`,
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
          path: `/api/checkout/drafts/${pickupDraftUuid}/pickup-date`,
        }),
      );
    });
  });

  it("lets a buyer move from PDP add-to-cart through minicart checkout into Delivery payment selection", async () => {
    const user = userEvent.setup();

    render(
      <App
        apiClient={createRecordingApiClient({
          postResponse: checkoutDraftApiResponse({
            fulfillmentMode: "delivery",
            id: deliveryDraftUuid,
            promoLabel: "SAVE10",
            totalMinor: 3125,
          }),
          patchResponse: checkoutDraftApiResponse({
            fulfillmentMode: "delivery",
            id: deliveryDraftUuid,
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
          postResponse: checkoutDraftApiResponse({
            fulfillmentMode: "pickup",
            id: pickupDraftUuid,
            promoLabel: "PICKUP5",
            totalMinor: 1349,
          }),
          patchResponse: checkoutDraftApiResponse({
            fulfillmentMode: "pickup",
            id: pickupDraftUuid,
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

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
}

function expectExpressScopes(container: HTMLElement) {
  const methods = Array.from(
    container.querySelectorAll(".paypal-provider-scope"),
  ).map((scope) => scope.getAttribute("data-paypal-sdk-method"));

  expect(methods).toContain("paypal");
  expect(methods).toContain("paylater");
}

function singleItemCart({
  cartClientSecret,
  quantity,
}: {
  readonly cartClientSecret?: string;
  readonly quantity: number;
}): CartData {
  return {
    cartPublicId: "cart_public_existing",
    ...(cartClientSecret ? { cartClientSecret } : {}),
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
  readonly options?: ApiRequestOptions | undefined;
}

interface RecordingApiClientInput {
  readonly getResponse?: unknown;
  readonly patchError?: Error;
  readonly patchResponse?: unknown;
  readonly postError?: Error;
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
    async get<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "get", path, query, options });
      if (path === "/api/paypal/sdk-config") {
        return sdkConfigApiResponse(query) as TData;
      }
      return (input.getResponse ?? {}) as TData;
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "patch", path, body, query, options });
      if (input.patchError) {
        throw input.patchError;
      }
      return (input.patchResponse ?? {}) as TData;
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "post", path, body, query, options });
      if (input.postError) {
        throw input.postError;
      }
      return (input.postResponse ?? {}) as TData;
    },
  };
}

function sdkConfigApiResponse(query?: ApiQueryParams) {
  const method = String(query?.method ?? "paypal");
  const components = sdkComponentsForMethod(method);

  return {
    client_id: "PAYPAL_PUBLIC_CLIENT_ID",
    environment: "sandbox",
    sdk_url: "https://www.sandbox.paypal.com/web-sdk/v6/core",
    currency_code: "USD",
    locale: "en-US",
    buyer_country: "US",
    paylater_buyer_country: "US",
    sandbox_test_buyer_country: "US",
    components,
    page_type: "checkout",
    provider_key: `paypal:sandbox:PAYPAL_PUBLIC_CLIENT_ID:US:USD:en-US:US:US:US:1:${components.join(",")}`,
    needs_client_token: false,
  };
}

function sdkComponentsForMethod(method: string): readonly string[] {
  if (method === "paylater") {
    return ["paypal-payments", "paypal-messages"];
  }

  if (method === "card") {
    return ["card-fields"];
  }

  if (method === "apple_pay") {
    return ["applepay"];
  }

  if (method === "google_pay") {
    return ["googlepay"];
  }

  if (method === "venmo") {
    return ["venmo"];
  }

  return ["paypal-payments"];
}

function cartApiResponse({
  cartClientSecret,
  cartPublicId = "cart_public_existing",
  quantity,
  unitPriceMinor,
}: {
  readonly cartClientSecret?: string;
  readonly cartPublicId?: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
}) {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: cartPublicId,
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
      binding: cartClientSecret
        ? {
            cart_public_id: cartPublicId,
            cart_client_secret: cartClientSecret,
          }
        : null,
    },
    adjustments: [],
  };
}

function checkoutDraftApiResponse({
  fulfillmentMode,
  id,
  promoLabel,
  totalMinor,
}: {
  readonly fulfillmentMode: "delivery" | "pickup";
  readonly id?: string;
  readonly promoLabel: string;
  readonly totalMinor: number;
}) {
  return {
    draft: {
      id:
        id ??
        (fulfillmentMode === "delivery"
          ? "draft_delivery_123"
          : "draft_pickup_123"),
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
        shipping_minor: 500,
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

function expressReviewApiResponse() {
  return {
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
        detail: "POP-LABUBU-009 · Qty 1",
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

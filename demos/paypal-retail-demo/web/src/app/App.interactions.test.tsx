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

function createRecordingApiClient(): ApiClient & {
  readonly calls: RecordingApiCall[];
} {
  const calls: RecordingApiCall[] = [];

  return {
    calls,
    async get<TData = unknown>(path: string, query?: ApiQueryParams) {
      calls.push({ method: "get", path, query });
      return {} as TData;
    },
    async patch<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
    ) {
      calls.push({ method: "patch", path, body, query });
      return {} as TData;
    },
    async post<TData = unknown>(
      path: string,
      body?: unknown,
      query?: ApiQueryParams,
    ) {
      calls.push({ method: "post", path, body, query });
      return {} as TData;
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

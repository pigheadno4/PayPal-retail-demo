// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

beforeAll(() => {
  globalThis.ResizeObserver =
    TestResizeObserver as unknown as typeof ResizeObserver;
});

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: createMemoryStorage(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (query: string) =>
      ({
        addEventListener: () => undefined,
        addListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
        removeListener: () => undefined,
      }) as MediaQueryList,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  cleanup();
});

describe("App buyer interactions", () => {
  it("keeps the header search typeable and routes submitted keywords to catalog", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_header_search",
          cartPublicId: "cart_public_header_search",
        }),
        "/api/catalog/products": {
          products: [],
        },
      },
    });

    render(<App apiClient={apiClient} initialPathname="/" />);

    const searchInput = screen.getByRole("searchbox", {
      name: "Search products",
    });

    await user.click(searchInput);

    expect(document.activeElement).toBe(searchInput);
    expect(
      screen.getByRole("heading", {
        name: "Blind-box drops, ready to collect",
      }),
    ).toBeTruthy();

    await user.type(searchInput, "molly{enter}");

    await screen.findByRole("region", { name: "Products" });
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
          query: {
            market: "US",
            profile: "popmart",
            q: "molly",
          },
        }),
      );
    });
    expect(window.location.pathname + window.location.search).toBe(
      "/products?q=molly",
    );
  });

  it("opens and closes the compact mobile menu from the buyer header", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_mobile_menu",
          cartPublicId: "cart_public_mobile_menu",
        }),
        "/api/catalog/products": {
          products: [],
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products"
        initialCart={singleItemCart({ quantity: 2 })}
      />,
    );

    const menuButton = screen.getByRole("button", {
      name: "Open mobile menu",
    });

    expect(menuButton.getAttribute("aria-controls")).toBe("mobile-menu");
    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: "Mobile menu" })).toBe(
      null,
    );

    await user.click(menuButton);

    const mobileMenu = screen.getByRole("navigation", {
      name: "Mobile menu",
    });

    expect(menuButton.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(mobileMenu).getByRole("link", { name: "BLIND BOXES" }),
    ).toBeTruthy();
    expect(
      within(mobileMenu).getByRole("link", { name: "Track order" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Close mobile menu" }));

    expect(menuButton.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("navigation", { name: "Mobile menu" })).toBe(
      null,
    );
  });

  it("loads homepage merchandising from the catalog API with generated image paths", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_home",
          cartPublicId: "cart_public_home",
        }),
        "/api/catalog/products": {
          products: [
            {
              id: "product_blind_boxes_1",
              slug: "blind-boxes-1",
              name: "The Monsters Blind Boxes 1",
              category_slug: "blind-boxes",
              image_path: "/assets/popmart/products/blind-boxes-1-1.png",
              release_status: "released",
              release_date: "2026-06-05",
              purchasable: true,
              checkout_block_reason: null,
              price: {
                currency_code: "USD",
                regular_price_minor: 1499,
                current_price_minor: 1274,
                is_on_sale: true,
              },
              inventory: {
                delivery_available: true,
                pickup_available: true,
              },
            },
            {
              id: "product_plush_11",
              slug: "plush-11",
              name: "The Monsters Plush 1",
              category_slug: "plush",
              image_path: "/assets/popmart/products/plush-11-1.png",
              release_status: "coming_soon",
              release_date: "2026-07-10",
              purchasable: false,
              checkout_block_reason: "release_pending",
              price: {
                currency_code: "USD",
                regular_price_minor: 4999,
                current_price_minor: 4999,
                is_on_sale: false,
              },
              inventory: {
                delivery_available: false,
                pickup_available: false,
              },
            },
          ],
        },
      },
    });

    render(<App apiClient={apiClient} initialPathname="/" />);

    expect(
      await screen.findAllByText("The Monsters Blind Boxes 1"),
    ).not.toHaveLength(0);
    expect(
      screen.getAllByAltText("The Monsters Blind Boxes 1 collectible"),
    ).not.toHaveLength(0);
    await waitFor(() => {
      expect(screen.queryByText("Labubu Have a Seat")).toBeNull();
    });
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/catalog/products",
        query: {
          market: "US",
          profile: "popmart",
        },
      }),
    );
  });

  it("keeps fallback homepage merchandising when catalog products are unavailable", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_home_fallback",
          cartPublicId: "cart_public_home_fallback",
        }),
      },
    });

    render(<App apiClient={apiClient} initialPathname="/" />);

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
        }),
      );
    });
    expect(
      screen.getByRole("heading", {
        name: "Blind-box drops, ready to collect",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Molly Blind Boxes 2")).not.toHaveLength(0);
    expect(document.body.innerHTML.toLowerCase()).not.toMatch(
      /labubu|skullpanda|hirono|the-monsters|series=/,
    );
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("uses generated fallback homepage merchandising when the catalog request fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const apiClient = createRecordingApiClient({
      getErrorByPath: {
        "/api/catalog/products": new Error("catalog unavailable"),
      },
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_home_error_fallback",
          cartPublicId: "cart_public_home_error_fallback",
        }),
      },
    });

    render(<App apiClient={apiClient} initialPathname="/" />);

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
        }),
      );
    });
    expect(
      screen.getByRole("heading", {
        name: "Blind-box drops, ready to collect",
      }),
    ).toBeTruthy();
    expect(screen.getAllByText("Molly Blind Boxes 2")).not.toHaveLength(0);
    expect(document.body.innerHTML.toLowerCase()).not.toMatch(
      /labubu|skullpanda|hirono|the-monsters|series=/,
    );
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("loads product listing cards from the catalog API with generated image paths", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_catalog",
          cartPublicId: "cart_public_catalog",
        }),
        "/api/catalog/products": {
          products: [
            {
              id: "product_blind_boxes_1",
              slug: "blind-boxes-1",
              name: "The Monsters Blind Boxes 1",
              category_slug: "blind-boxes",
              image_path: "/assets/popmart/products/blind-boxes-1-1.png",
              release_status: "released",
              release_date: "2026-06-05",
              purchasable: true,
              checkout_block_reason: null,
              price: {
                currency_code: "USD",
                regular_price_minor: 1499,
                current_price_minor: 1274,
                is_on_sale: true,
              },
              inventory: {
                delivery_available: true,
                pickup_available: true,
              },
            },
          ],
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
          query: {
            market: "US",
            profile: "popmart",
          },
        }),
      );
    });

    await screen.findByText("The Monsters Blind Boxes 1");
    expect(
      screen
        .getByAltText("The Monsters Blind Boxes 1 collectible")
        .getAttribute("src"),
    ).toBe("/assets/popmart/products/blind-boxes-1-1.png");
  });

  it("uses generated fallback category merchandising when the catalog request fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const apiClient = createRecordingApiClient({
      getErrorByPath: {
        "/api/catalog/products": new Error("catalog unavailable"),
      },
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_category_error_fallback",
          cartPublicId: "cart_public_category_error_fallback",
        }),
      },
    });

    render(<App apiClient={apiClient} initialPathname="/products" />);

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
          query: {
            market: "US",
            profile: "popmart",
          },
        }),
      );
    });

    expect(await screen.findByText("Molly Blind Boxes 2")).toBeTruthy();
    expect(
      screen
        .getByAltText("Molly Blind Boxes 2 collectible")
        .getAttribute("src"),
    ).toBe("/assets/popmart/products/blind-boxes-2-1.png");
    expect(document.body.innerHTML.toLowerCase()).not.toMatch(
      /labubu|skullpanda|hirono|series=/,
    );
    expect(screen.getAllByText("3 products").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Catalog products could not be loaded."),
    ).toBeNull();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("keeps generated fallback category product links navigable when PDP loading fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const categoryApiClient = createRecordingApiClient({
      getErrorByPath: {
        "/api/catalog/products": new Error("catalog unavailable"),
      },
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_category_product_fallback",
          cartPublicId: "cart_public_category_product_fallback",
        }),
      },
    });

    const renderedCategory = render(
      <App apiClient={categoryApiClient} initialPathname="/products" />,
    );

    const fallbackProductName = await screen.findByText("Molly Blind Boxes 2");
    const fallbackProductLink = fallbackProductName.closest("a");

    expect(fallbackProductLink?.getAttribute("href")).toBe(
      "/products/blind-boxes-2",
    );

    renderedCategory.unmount();

    render(
      <App
        apiClient={createRecordingApiClient({
          getErrorByPath: {
            "/api/catalog/products/blind-boxes-2": new Error(
              "product unavailable",
            ),
          },
          getResponseByPath: {
            "/api/cart": emptyCartApiResponse({
              cartClientSecret: "cart_secret_pdp_product_fallback",
              cartPublicId: "cart_public_pdp_product_fallback",
            }),
          },
        })}
        initialPathname="/products/blind-boxes-2"
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Molly Blind Boxes 2" }),
    ).toBeTruthy();
    expect(screen.getByAltText("Molly Blind Boxes 2 front view")).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Page unavailable" }),
    ).toBeNull();
    expect(document.body.innerHTML.toLowerCase()).not.toMatch(
      /labubu|skullpanda|hirono|series=/,
    );
    await waitFor(() => {
      expect(consoleError).toHaveBeenCalledTimes(2);
    });
    consoleError.mockRestore();
  });

  it("does not render fixture product imagery while live route data is pending", async () => {
    const pendingApiResponse = new Promise<unknown>(() => {});
    const liveRoutes = [
      "/",
      "/products",
      "/products?category=blind-boxes",
      "/products/blind-boxes-2",
      "/cart",
      "/checkout",
    ];

    for (const initialPathname of liveRoutes) {
      const rendered = render(
        <App
          apiClient={createRecordingApiClient({
            getResponse: pendingApiResponse,
            getResponseByPath: {
              "/api/cart": pendingApiResponse,
              "/api/catalog/products": pendingApiResponse,
              "/api/catalog/products/blind-boxes-2": pendingApiResponse,
            },
            postResponse: pendingApiResponse,
          })}
          initialPathname={initialPathname}
        />,
      );

      expect(screen.queryByText("Labubu Have a Seat")).toBeNull();
      expect(screen.queryByText("Hirono Little Mischief")).toBeNull();
      expect(screen.queryByText("Skullpanda Future Drop")).toBeNull();
      expect(
        Array.from(document.images).map((image) => image.getAttribute("src")),
      ).not.toContain("/assets/popmart/products/labubu-have-a-seat-1.svg");

      rendered.unmount();
    }
  });

  it("applies category route query state to catalog API requests and filter chrome", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_category_query",
          cartPublicId: "cart_public_category_query",
        }),
        "/api/catalog/products": {
          products: [
            {
              id: "product_blind_boxes_1",
              slug: "blind-boxes-1",
              name: "The Monsters Blind Boxes 1",
              category_slug: "blind-boxes",
              image_path: "/assets/popmart/products/blind-boxes-1-1.png",
              release_status: "released",
              release_date: "2026-06-05",
              purchasable: true,
              checkout_block_reason: null,
              price: {
                currency_code: "USD",
                regular_price_minor: 1499,
                current_price_minor: 1274,
                is_on_sale: true,
              },
              inventory: {
                delivery_available: true,
                pickup_available: true,
              },
            },
          ],
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products?category=blind-boxes"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products",
          query: {
            category: "blind-boxes",
            market: "US",
            profile: "popmart",
          },
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText("1 product").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("1 filter applied").length).toBeGreaterThan(0);
    const categoryQuickFilters = screen.getByRole("navigation", {
      name: "Category quick filters",
    });
    const blindBoxesFilter = within(categoryQuickFilters).getByRole("link", {
      name: "Blind Boxes5",
    });
    expect(
      within(categoryQuickFilters)
        .getByRole("link", { name: "All options25" })
        .getAttribute("data-active"),
    ).toBe("false");
    expect(blindBoxesFilter.getAttribute("data-active")).toBe("true");
    expect(
      screen.getByRole("button", { name: "All filters, 1 filter applied" }),
    ).toBeTruthy();
    expect(screen.getByText("The Monsters Blind Boxes 1")).toBeTruthy();
  });

  it("renders the official PayPal Pay Later message on category pages", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_category_paylater",
          cartPublicId: "cart_public_category_paylater",
        }),
        "/api/catalog/products": {
          products: [
            {
              id: "product_blind_boxes_1",
              slug: "blind-boxes-1",
              name: "The Monsters Blind Boxes 1",
              category_slug: "blind-boxes",
              image_path: "/assets/popmart/products/blind-boxes-1-1.png",
              release_status: "released",
              release_date: "2026-06-05",
              purchasable: true,
              checkout_block_reason: null,
              price: {
                currency_code: "USD",
                regular_price_minor: 1499,
                current_price_minor: 1274,
                is_on_sale: true,
              },
              inventory: {
                delivery_available: true,
                pickup_available: true,
              },
            },
          ],
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products?category=blind-boxes"
      />,
    );

    await screen.findByText("The Monsters Blind Boxes 1");
    await waitFor(() => {
      const catalogMessage = document.querySelector(
        '[data-paylater-message-placement="catalog-promo"]',
      );
      expect(catalogMessage).toBeTruthy();
      expect(catalogMessage?.querySelector("paypal-message")).toBeTruthy();
    });
    const catalogMessageStackText =
      document
        .querySelector('[data-paylater-message-placement="catalog-promo"]')
        ?.closest(".paylater-message-stack")
        ?.textContent?.toLowerCase() ?? "";
    expect(document.querySelector(".paylater-message-fallback")).toBeNull();
    expect(catalogMessageStackText).not.toContain(
      "flexible payment options may be available at checkout",
    );

    expect(apiClient.calls).toContainEqual({
      method: "get",
      path: "/api/paypal/sdk-config",
      query: {
        flow: "standard",
        market: "US",
        method: "paylater",
        page_type: "checkout",
      },
    });
  });

  it("renders official PayPal Pay Later messages on PDP, cart, and minicart", async () => {
    const user = userEvent.setup();
    const payLaterMessageRoutes = [
      {
        initialPathname: "/products/labubu-have-a-seat",
        initialProductPages: {
          "labubu-have-a-seat": releasedProduct(),
        },
        placement: "product-detail",
      },
      {
        initialPathname: "/cart",
        placement: "cart-summary",
      },
      {
        initialPathname: "/",
        openMinicart: true,
        placement: "minicart-summary",
      },
    ];

    for (const route of payLaterMessageRoutes) {
      const rendered = render(
        <App
          apiClient={createRecordingApiClient()}
          initialCart={singleItemCart({ quantity: 1 })}
          initialPathname={route.initialPathname}
          {...(route.initialProductPages
            ? { initialProductPages: route.initialProductPages }
            : {})}
        />,
      );

      if (route.openMinicart) {
        await user.click(screen.getByRole("button", { name: "Open minicart" }));
      }

      await waitFor(() => {
        const message = document.querySelector(
          `[data-paylater-message-placement="${route.placement}"]`,
        );

        expect(message).toBeTruthy();
        expect(message?.querySelector("paypal-message")).toBeTruthy();
      });

      rendered.unmount();
    }
  });

  it("shows a pending PDP state while direct product details load", async () => {
    let resolveProduct!: (value: unknown) => void;
    const productResponse = new Promise<unknown>((resolve) => {
      resolveProduct = resolve;
    });
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_pdp_pending",
          cartPublicId: "cart_public_pdp_pending",
        }),
        "/api/catalog/products/blind-boxes-1": productResponse,
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products/blind-boxes-1"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products/blind-boxes-1",
        }),
      );
    });
    expect(
      screen.getByRole("heading", { name: "Loading product details" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Page unavailable" }),
    ).toBeNull();

    resolveProduct(productDetailApiResponse());
    await screen.findByRole("heading", {
      name: "The Monsters Blind Boxes 1",
    });
  });

  it("loads direct PDP routes from the catalog API with generated gallery images", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_pdp",
          cartPublicId: "cart_public_pdp",
        }),
        "/api/catalog/products/blind-boxes-1": {
          product: {
            id: "product_blind_boxes_1",
            slug: "blind-boxes-1",
            sku: "POP-001",
            name: "The Monsters Blind Boxes 1",
            series_name: "The Monsters",
            description: "The Monsters collectible for the blind boxes series.",
            category_slug: "blind-boxes",
            release_status: "released",
            release_date: "2026-06-05",
            purchasable: true,
            checkout_block_reason: null,
            max_quantity_per_order: 1,
            price: {
              currency_code: "USD",
              regular_price_minor: 1499,
              current_price_minor: 1274,
              is_on_sale: true,
            },
            images: [
              {
                image_path: "/assets/popmart/products/blind-boxes-1-1.png",
                alt_text: "The Monsters Blind Boxes 1 view 1",
              },
            ],
            inventory: {
              delivery_available: true,
              pickup_available: true,
            },
            reviews: {
              visible: false,
              items: [],
            },
          },
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products/blind-boxes-1"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "get",
          path: "/api/catalog/products/blind-boxes-1",
          query: {
            market: "US",
            profile: "popmart",
          },
        }),
      );
    });

    await screen.findByRole("heading", {
      name: "The Monsters Blind Boxes 1",
    });
    expect(await screen.findByText("By POP MART")).toBeTruthy();
    expect(
      screen
        .getByAltText(
          "The Monsters Blind Boxes 1 collectible on a pastel display",
        )
        .getAttribute("src"),
    ).toBe("/assets/popmart/products/blind-boxes-1-1.png");
    expect(
      screen.queryByAltText("The Monsters Blind Boxes 1 view 1"),
    ).toBeNull();
  });

  it("keeps server catalog metadata when preparing the starter guest cart", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_generated",
          cartPublicId: "cart_public_generated",
        }),
      },
      postResponseByPath: {
        "/api/cart/items": generatedStarterCartApiResponse(),
      },
    });

    render(<App apiClient={apiClient} initialPathname="/" />);

    await screen.findByText("Prepared guest cart.");
    await user.click(
      screen.getByRole("button", {
        name: "Open minicart",
      }),
    );

    const minicart = screen
      .getByRole("heading", { name: "Cart" })
      .closest(".minicart-shell");
    expect(minicart).not.toBeNull();

    await within(minicart as HTMLElement).findByText("Molly Blind Boxes 2");
    expect(
      within(minicart as HTMLElement)
        .getByAltText("Molly Blind Boxes 2 collectible")
        .getAttribute("src"),
    ).toBe("/assets/popmart/products/blind-boxes-2-1.png");
    expect(
      within(minicart as HTMLElement)
        .getByAltText("The Monsters Plush 1 collectible")
        .getAttribute("src"),
    ).toBe("/assets/popmart/products/plush-11-1.png");
    expect(
      within(minicart as HTMLElement).queryByText("Labubu Have a Seat"),
    ).toBeNull();
  });

  it("opens email-first auth and branches existing accounts to password entry", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponseByPath: {
        "/api/account/auth/lookup": {
          email: "alice.la@example.test",
          status: "existing",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "alice.la@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            email: "alice.la@example.test",
          },
          method: "post",
          path: "/api/account/auth/lookup",
        }),
      );
    });
    const passwordDialog = screen.getByRole("dialog", {
      name: "Enter password",
    });
    expect(
      within(passwordDialog).getByDisplayValue("alice.la@example.test"),
    ).toBeTruthy();
    expect(within(passwordDialog).getByLabelText("Password")).toBeTruthy();
    expect(
      within(passwordDialog).getByRole("button", { name: "Sign in" }),
    ).toBeTruthy();
  });

  it("branches unknown auth emails to registration", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      postResponseByPath: {
        "/api/account/auth/lookup": {
          email: "new.collector@example.test",
          status: "new",
        },
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            email: "new.collector@example.test",
          },
          method: "post",
          path: "/api/account/auth/lookup",
        }),
      );
    });
    const registerDialog = screen.getByRole("dialog", {
      name: "Create account",
    });
    expect(
      within(registerDialog).getByDisplayValue("new.collector@example.test"),
    ).toBeTruthy();
    expect(within(registerDialog).getByLabelText("Password")).toBeTruthy();
    expect(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    ).toBeTruthy();
  });

  it("signs in an existing account, merges the guest cart, and preserves cart context", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      signInSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      postResponseByPath: {
        "/api/account/auth/lookup": {
          email: "alice.la@example.test",
          status: "existing",
        },
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 3,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "alice.la@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );
    const passwordDialog = await screen.findByRole("dialog", {
      name: "Enter password",
    });
    await user.type(
      within(passwordDialog).getByLabelText("Password"),
      "secret",
    );
    await user.click(
      within(passwordDialog).getByRole("button", { name: "Sign in" }),
    );

    await waitFor(() => {
      expect(authClient.signInCalls).toEqual([
        {
          email: "alice.la@example.test",
          password: "secret",
        },
      ]);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/cart/merge",
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
              "x-cart-id": "cart_public_existing",
              "x-cart-secret": "cart_secret_existing",
            },
          },
        }),
      );
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open minicart" }).textContent,
    ).toContain("Cart (3)");
    expect(getShellStatusText()).toContain("Signed in and merged cart.");
    await waitFor(() => {
      expect(
        screen.queryByText(
          "Cart is refreshing before delivery express checkout.",
        ),
      ).toBeNull();
      expect(
        screen.getByText("PayPal delivery express button ready."),
      ).toBeTruthy();
    });
  });

  it("registers a new account and merges the guest cart into the new buyer session", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      signUpSession: {
        accessToken: "access_token_new",
        email: "new.collector@example.test",
        userId: "user_new",
      },
    });
    const apiClient = createRecordingApiClient({
      postResponseByPath: {
        "/api/account/auth/lookup": {
          email: "new.collector@example.test",
          status: "new",
        },
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_new_user",
          quantity: 2,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "new.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );
    const registerDialog = await screen.findByRole("dialog", {
      name: "Create account",
    });
    await user.type(
      within(registerDialog).getByLabelText("Password"),
      "secret",
    );
    await user.click(
      within(registerDialog).getByLabelText(
        "I agree to the Terms of Service and Privacy Policy.",
      ),
    );
    await user.click(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => {
      expect(authClient.signUpCalls).toEqual([
        {
          email: "new.collector@example.test",
          password: "secret",
        },
      ]);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/cart/merge",
          options: {
            headers: {
              authorization: "Bearer access_token_new",
              "x-cart-id": "cart_public_existing",
              "x-cart-secret": "cart_secret_existing",
            },
          },
        }),
      );
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open minicart" }).textContent,
    ).toContain("Cart (2)");
  });

  it("restores an existing auth session and loads the signed-in cart without guest headers", async () => {
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_restored",
        email: "returning@example.test",
        userId: "user_returning",
      },
    });
    const apiClient = createRecordingApiClient({
      postResponseByPath: {
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_returning",
          quantity: 4,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(authClient.getSessionCalls).toEqual(["getSession"]);
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/cart/merge",
          options: {
            headers: {
              authorization: "Bearer access_token_restored",
            },
          },
        }),
      );
    });
    expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("Cart (4)");
    });
  });

  it("opens signed-in account settings, lists saved payments, and deletes a saved payment", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/account/addresses": {
          addresses: [defaultAccountAddress(), secondaryAccountAddress()],
        },
        "/api/account/saved-payments": {
          saved_payments: [
            {
              id: "saved_payment_paypal",
              method_type: "paypal_wallet",
              status: "active",
              brand: null,
              last4: null,
              expiry_month: null,
              expiry_year: null,
              label: "Alice PayPal wallet",
            },
            {
              id: "saved_payment_card",
              method_type: "card",
              status: "active",
              brand: "Visa",
              last4: "4242",
              expiry_month: 12,
              expiry_year: 2029,
              label: null,
            },
          ],
        },
      },
      deleteResponseByPath: {
        "/api/account/addresses/address_secondary": {
          addresses: [defaultAccountAddress()],
        },
        "/api/account/saved-payments/saved_payment_card": {
          saved_payments: [
            {
              id: "saved_payment_paypal",
              method_type: "paypal_wallet",
              status: "active",
              brand: null,
              last4: null,
              expiry_month: null,
              expiry_year: null,
              label: "Alice PayPal wallet",
            },
          ],
        },
      },
      patchResponseByPath: {
        "/api/account/addresses/address_secondary": {
          addresses: [promotedAccountAddress(), nonDefaultAccountAddress()],
        },
      },
      postResponseByPath: {
        "/api/account/addresses": {
          addresses: [
            defaultAccountAddress(),
            secondaryAccountAddress(),
            createdAccountAddress(),
          ],
        },
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 3,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Account" }));

    expect(
      await screen.findByRole("heading", { name: "Account settings" }),
    ).toBeTruthy();
    expect(screen.getByText("alice.la@example.test")).toBeTruthy();
    expect(screen.getByText("Alice PayPal wallet")).toBeTruthy();
    expect(screen.getByText("Visa ending in 4242")).toBeTruthy();
    const addressBook = screen.getByRole("region", { name: "Address book" });
    expect(within(addressBook).getByText("Home")).toBeTruthy();
    expect(within(addressBook).getByText("742 N Fairfax Ave")).toBeTruthy();
    expect(within(addressBook).getByText("Default shipping")).toBeTruthy();
    expect(within(addressBook).getByText("Default billing")).toBeTruthy();
    expect(within(addressBook).getByText("Studio")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Delete address Home",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/account/saved-payments",
        options: {
          headers: {
            authorization: "Bearer access_token_existing",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/account/addresses",
        options: {
          headers: {
            authorization: "Bearer access_token_existing",
          },
        },
      }),
    );

    await user.click(
      screen.getByRole("button", { name: "Make default address Studio" }),
    );
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: "/api/account/addresses/address_secondary",
          body: {
            is_default_shipping: true,
            is_default_billing: true,
          },
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
            },
          },
        }),
      );
    });

    await user.click(
      screen.getByRole("button", {
        name: "Delete saved payment Visa ending in 4242",
      }),
    );
    expect(screen.getByText("Remove this saved payment?")).toBeTruthy();
    await user.click(
      screen.getByRole("button", {
        name: "Confirm delete saved payment Visa ending in 4242",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "delete",
          path: "/api/account/saved-payments/saved_payment_card",
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
            },
          },
        }),
      );
    });
    expect(screen.queryByText("Visa ending in 4242")).toBeNull();
    expect(screen.getByText("Alice PayPal wallet")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Add address" }));
    await user.clear(screen.getByLabelText("Address label"));
    await user.type(screen.getByLabelText("Address label"), "Office");
    await user.clear(screen.getByLabelText("Recipient name"));
    await user.type(screen.getByLabelText("Recipient name"), "Alice Lane");
    await user.clear(screen.getByLabelText("Phone"));
    await user.type(screen.getByLabelText("Phone"), "555-0102");
    await user.clear(screen.getByLabelText("Street address"));
    await user.type(screen.getByLabelText("Street address"), "1 Market St");
    await user.clear(screen.getByLabelText("Apt, suite, etc."));
    await user.type(screen.getByLabelText("Apt, suite, etc."), "Suite 4");
    await user.clear(screen.getByLabelText("City"));
    await user.type(screen.getByLabelText("City"), "San Francisco");
    await user.clear(screen.getByLabelText("State"));
    await user.type(screen.getByLabelText("State"), "CA");
    await user.clear(screen.getByLabelText("ZIP/postal code"));
    await user.type(screen.getByLabelText("ZIP/postal code"), "94105");
    await user.clear(screen.getByLabelText("Country code"));
    await user.type(screen.getByLabelText("Country code"), "US");
    await user.click(screen.getByRole("button", { name: "Save address" }));

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/account/addresses",
          body: {
            label: "Office",
            recipient_name: "Alice Lane",
            phone: "555-0102",
            address_line1: "1 Market St",
            address_line2: "Suite 4",
            city: "San Francisco",
            state: "CA",
            postal_code: "94105",
            country_code: "US",
            is_default_shipping: false,
            is_default_billing: false,
          },
        }),
      );
    });
  });

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
    expectOfficialPayLaterMessage(minicart, "minicart-summary", "27.98");
    expect(getShellStatusText()).toContain("Added Labubu Have a Seat to cart.");
  });

  it("persists API-loaded PDP Add to cart before checkout navigation reloads the server cart", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": emptyCartApiResponse({
          cartClientSecret: "cart_secret_pdp",
          cartPublicId: "cart_public_pdp",
        }),
        "/api/catalog/products/blind-boxes-1": productDetailApiResponse(),
      },
      postResponseByPath: {
        "/api/cart/items": cartApiResponse({
          cartClientSecret: "cart_secret_pdp",
          cartItemId: "cart_item_blind_boxes_1",
          cartPublicId: "cart_public_pdp",
          name: "The Monsters Blind Boxes 1",
          productId: "product_blind_boxes_1",
          quantity: 1,
          slug: "blind-boxes-1",
          unitPriceMinor: 1274,
        }),
        "/api/cart/refresh": cartApiResponse({
          cartClientSecret: "cart_secret_pdp",
          cartItemId: "cart_item_blind_boxes_1",
          cartPublicId: "cart_public_pdp",
          name: "The Monsters Blind Boxes 1",
          productId: "product_blind_boxes_1",
          quantity: 1,
          slug: "blind-boxes-1",
          unitPriceMinor: 1274,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/products/blind-boxes-1"
        initialCart={emptyInitialCart({
          cartClientSecret: "cart_secret_pdp",
          cartPublicId: "cart_public_pdp",
        })}
      />,
    );

    await screen.findByRole("heading", {
      name: "The Monsters Blind Boxes 1",
    });
    await user.click(screen.getByRole("button", { name: "Add to cart" }));

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            product_id: "product_blind_boxes_1",
            quantity: 1,
          },
          method: "post",
          options: {
            headers: {
              "x-cart-id": "cart_public_pdp",
              "x-cart-secret": "cart_secret_pdp",
            },
          },
          path: "/api/cart/items",
          query: { market: "US" },
        }),
      );
    });
    expect(
      window.localStorage.getItem("paypal-retail-demo:cart-binding:popmart:US"),
    ).toBe(
      JSON.stringify({
        cart_public_id: "cart_public_pdp",
        cart_client_secret: "cart_secret_pdp",
      }),
    );

    const minicart = screen.getByLabelText("Minicart");
    await user.click(within(minicart).getByRole("link", { name: "Checkout" }));

    await screen.findByRole("heading", { name: "Delivery or Pickup" });
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: { trigger: "checkout_start" },
          method: "post",
          path: "/api/cart/refresh",
        }),
      );
    });
    expect(
      screen.getByRole("complementary", { name: "Order summary" }).textContent,
    ).toContain("The Monsters Blind Boxes 1");
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
    expectOfficialPayLaterMessage(minicart, "minicart-summary", "27.98");
  });

  it("consolidates delivery express pending copy while cart access is restoring", () => {
    const pendingApiResponse = new Promise<unknown>(() => {});

    render(
      <App
        apiClient={createRecordingApiClient({
          getResponse: pendingApiResponse,
          postResponse: pendingApiResponse,
        })}
        initialPathname="/cart"
        initialCart={singleItemCart({
          cartClientSecret: null,
          quantity: 1,
        })}
      />,
    );

    expect(
      screen.getAllByText(
        "Cart is refreshing before delivery express checkout.",
      ),
    ).toHaveLength(1);
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
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: "/api/cart/items/cart_item_labubu",
          body: { quantity: 2 },
          query: { market: "US" },
        }),
      );
    });

    await user.click(screen.getByRole("link", { name: "Go to checkout" }));
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Delivery or Pickup" }),
      ).toBeTruthy();
    });
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/cart/refresh",
        body: { trigger: "checkout_start" },
        query: { market: "US" },
      }),
    );

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
      expect(within(minicart).getByText("4 items")).toBeTruthy();
    });
    expect(within(minicart).getByText("Qty 4 · $13.99")).toBeTruthy();
    expectOfficialPayLaterMessage(minicart, "minicart-summary", "55.96");
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
    expectOfficialPayLaterMessage(minicart, "minicart-summary", "27.98");
  });

  it("reconciles the initial checkout summary from the restored active cart", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/cart": cartApiResponse({
          cartClientSecret: "cart_secret_checkout",
          cartPublicId: "cart_public_checkout",
          quantity: 4,
          unitPriceMinor: 1742,
        }),
      },
    });

    render(<App apiClient={apiClient} initialPathname="/checkout" />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("Cart (4)");
    });
    await waitFor(() => {
      expect(screen.getAllByText("$69.68")).not.toHaveLength(0);
    });
    expect(screen.queryByText("$25.98")).toBeNull();
  });

  it("blocks checkout draft creation when the guest cart binding is incomplete", async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const apiClient = createRecordingApiClient({
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
        initialCart={singleItemCart({
          cartClientSecret: null,
          quantity: 1,
        })}
      />,
    );

    const shippingStep = getStep("Shipping address");
    await user.click(
      within(shippingStep).getByRole("button", {
        name: "Submit shipping address",
      }),
    );

    await waitFor(() => {
      expect(getShellStatusText()).toContain(
        "Cart is still syncing. Please try checkout again.",
      );
    });
    expect(apiClient.calls).not.toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/checkout/drafts",
      }),
    );
    consoleError.mockRestore();
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

  it("reacquires a fresh guest cart binding when restore returns a different cart without a new binding", async () => {
    window.localStorage.setItem(
      "paypal-retail-demo:cart-binding:popmart:US",
      JSON.stringify({
        cart_public_id: "cart_public_stale",
        cart_client_secret: "cart_secret_stale",
      }),
    );
    const apiClient = createRecordingApiClient({
      getResponses: [
        cartApiResponse({
          cartClientSecret: null,
          cartPublicId: "cart_public_rotated",
          quantity: 2,
          unitPriceMinor: 888,
        }),
        cartApiResponse({
          cartClientSecret: "cart_secret_fresh",
          cartPublicId: "cart_public_fresh",
          quantity: 2,
          unitPriceMinor: 888,
        }),
      ],
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/cart"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Open minicart" }).textContent,
      ).toContain("2");
    });

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "get",
        path: "/api/cart",
        query: { market: "US" },
        options: {
          headers: {
            "x-cart-id": "cart_public_stale",
            "x-cart-secret": "cart_secret_stale",
          },
        },
      });
    });
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "get",
        path: "/api/cart",
        query: { market: "US" },
        options: undefined,
      });
    });
    expect(
      screen.queryByText(
        "Cart is refreshing before delivery express checkout.",
      ),
    ).toBeNull();
    expect(
      screen.getByText("PayPal delivery express button ready."),
    ).toBeTruthy();
    expect(
      window.localStorage.getItem("paypal-retail-demo:cart-binding:popmart:US"),
    ).toBe(
      JSON.stringify({
        cart_public_id: "cart_public_fresh",
        cart_client_secret: "cart_secret_fresh",
      }),
    );
  });

  it("clears stale guest cart binding and reacquires a fresh binding when restore fails", async () => {
    window.localStorage.setItem(
      "paypal-retail-demo:cart-binding:popmart:US",
      JSON.stringify({
        cart_public_id: "cart_public_stale",
        cart_client_secret: "cart_secret_stale",
      }),
    );
    const apiClient = createRecordingApiClient({
      getErrors: [new Error("Guest cart secret does not match"), undefined],
      getResponses: [
        emptyCartApiResponse({
          cartClientSecret: "cart_secret_fresh",
          cartPublicId: "cart_public_fresh",
        }),
      ],
    });

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
        path: "/api/cart",
        query: { market: "US" },
        options: {
          headers: {
            "x-cart-id": "cart_public_stale",
            "x-cart-secret": "cart_secret_stale",
          },
        },
      });
    });
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual({
        method: "get",
        path: "/api/cart",
        query: { market: "US" },
        options: undefined,
      });
    });
    await waitFor(() => {
      expect(
        window.localStorage.getItem(
          "paypal-retail-demo:cart-binding:popmart:US",
        ),
      ).toBe(
        JSON.stringify({
          cart_public_id: "cart_public_fresh",
          cart_client_secret: "cart_secret_fresh",
        }),
      );
    });
  });

  it("acquires and persists a guest cart binding on fresh browser load before quantity edits", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponse: emptyCartApiResponse({
        cartClientSecret: "cart_secret_fresh",
        cartPublicId: "cart_public_fresh",
      }),
      patchResponse: cartApiResponse({
        cartClientSecret: "cart_secret_fresh",
        cartItemId: "cart_item_server_labubu",
        cartPublicId: "cart_public_fresh",
        name: "Molly Blind Boxes 2",
        productId: "2399a35e-ea68-566d-a6cf-f6ad63425e05",
        quantity: 2,
        slug: "blind-boxes-2",
        unitPriceMinor: 1299,
      }),
      postResponse: cartApiResponse({
        cartClientSecret: "cart_secret_fresh",
        cartItemId: "cart_item_server_labubu",
        cartPublicId: "cart_public_fresh",
        name: "Molly Blind Boxes 2",
        productId: "2399a35e-ea68-566d-a6cf-f6ad63425e05",
        quantity: 1,
        slug: "blind-boxes-2",
        unitPriceMinor: 1299,
      }),
    });

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
        path: "/api/cart",
        query: { market: "US" },
        options: undefined,
      });
    });
    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            product_id: "2399a35e-ea68-566d-a6cf-f6ad63425e05",
            quantity: 1,
          },
          method: "post",
          options: {
            headers: {
              "x-cart-id": "cart_public_fresh",
              "x-cart-secret": "cart_secret_fresh",
            },
          },
          path: "/api/cart/items",
        }),
      );
    });

    await user.click(
      screen.getByRole("button", {
        name: "Increase Molly Blind Boxes 2 quantity",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "patch",
          path: "/api/cart/items/cart_item_server_labubu",
          options: {
            headers: {
              "x-cart-id": "cart_public_fresh",
              "x-cart-secret": "cart_secret_fresh",
            },
          },
        }),
      );
    });
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Increase Molly Blind Boxes 2 quantity",
        }),
      ).toBeTruthy();
    });
    expect(screen.queryByText("Labubu Have a Seat")).toBeNull();
    expect(
      window.localStorage.getItem("paypal-retail-demo:cart-binding:popmart:US"),
    ).toBe(
      JSON.stringify({
        cart_public_id: "cart_public_fresh",
        cart_client_secret: "cart_secret_fresh",
      }),
    );
  });

  it("loads signed-in account order history from the account orders API", async () => {
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/account/orders": {
          orders: [accountOrderApiResponse()],
        },
      },
      postResponseByPath: {
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 1,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/account/orders"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Order history" }),
    ).toBeTruthy();
    expect(await screen.findByText("PO-20260602-000118")).toBeTruthy();
    expect(screen.getByText("Pickup at POP MART Soho")).toBeTruthy();
    expect(screen.getByText("Review items")).toBeTruthy();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/account/orders",
        options: {
          headers: {
            authorization: "Bearer access_token_existing",
          },
        },
      }),
    );
  });

  it("loads signed-in account order detail from the account order API", async () => {
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/account/orders/PO-20260602-000118": {
          order: accountOrderApiResponse(),
        },
      },
      postResponseByPath: {
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 1,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/account/orders/PO-20260602-000118"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "PO-20260602-000118" }),
    ).toBeTruthy();
    expect(screen.getByText("Timeline")).toBeTruthy();
    expect(screen.getByText("Items in this order")).toBeTruthy();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/account/orders/PO-20260602-000118",
        options: {
          headers: {
            authorization: "Bearer access_token_existing",
          },
        },
      }),
    );
  });

  it("submits an account order item review and replaces the order detail from the API response", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/account/orders/PO-20260602-000118": {
          order: accountOrderApiResponse(),
        },
      },
      postResponseByPath: {
        "/api/account/orders/PO-20260602-000118/items/line_1/review": {
          order: reviewedAccountOrderApiResponse(),
        },
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 1,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/account/orders/PO-20260602-000118"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await screen.findByRole("heading", { name: "PO-20260602-000118" });
    await user.click(
      screen.getByRole("button", {
        name: "Review item Skullpanda Future Drop",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Rating"), "5");
    await user.type(screen.getByLabelText("Review title"), "Tiny shelf star");
    await user.type(
      screen.getByLabelText("Review body"),
      "The paint details look great beside my other figures.",
    );
    await user.click(screen.getByRole("button", { name: "Submit review" }));

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            rating: 5,
            title: "Tiny shelf star",
            body: "The paint details look great beside my other figures.",
          },
          method: "post",
          path: "/api/account/orders/PO-20260602-000118/items/line_1/review",
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
            },
          },
        }),
      );
    });
    expect(await screen.findByText("Tiny shelf star")).toBeTruthy();
    expect(screen.getByText("Already reviewed")).toBeTruthy();
  });

  it("edits and deletes an account order item review through the account API", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      deleteResponseByPath: {
        "/api/account/orders/PO-20260602-000118/items/line_1/review": {
          order: accountOrderApiResponse(),
        },
      },
      getResponseByPath: {
        "/api/account/orders/PO-20260602-000118": {
          order: reviewedAccountOrderApiResponse(),
        },
      },
      patchResponseByPath: {
        "/api/account/orders/PO-20260602-000118/items/line_1/review": {
          order: updatedReviewAccountOrderApiResponse(),
        },
      },
      postResponseByPath: {
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_user",
          quantity: 1,
          unitPriceMinor: 1399,
        }),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/account/orders/PO-20260602-000118"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    expect(await screen.findByText("Tiny shelf star")).toBeTruthy();
    await user.click(
      screen.getByRole("button", {
        name: "Edit review Skullpanda Future Drop",
      }),
    );
    await user.selectOptions(screen.getByLabelText("Rating"), "4");
    await user.clear(screen.getByLabelText("Review title"));
    await user.type(screen.getByLabelText("Review title"), "Desk favorite");
    await user.clear(screen.getByLabelText("Review body"));
    await user.type(
      screen.getByLabelText("Review body"),
      "Still charming after a week on my desk.",
    );
    await user.click(screen.getByRole("button", { name: "Save review" }));

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            rating: 4,
            title: "Desk favorite",
            body: "Still charming after a week on my desk.",
          },
          method: "patch",
          path: "/api/account/orders/PO-20260602-000118/items/line_1/review",
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
            },
          },
        }),
      );
    });
    expect(await screen.findByText("Desk favorite")).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Delete review Skullpanda Future Drop",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "delete",
          path: "/api/account/orders/PO-20260602-000118/items/line_1/review",
          options: {
            headers: {
              authorization: "Bearer access_token_existing",
            },
          },
        }),
      );
    });
    expect(
      await screen.findByRole("button", {
        name: "Review item Skullpanda Future Drop",
      }),
    ).toBeTruthy();
  });

  it("looks up a guest order by order number and email without exposing technical IDs", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/guest-orders/DO-20260526-000003": guestOrderApiResponse(),
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/guest-orders"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    expect(
      await screen.findByRole("heading", { name: "Guest order lookup" }),
    ).toBeTruthy();

    await user.type(
      screen.getByLabelText("Order number"),
      "do-20260526-000003",
    );
    await user.type(
      screen.getByLabelText("Email used at checkout"),
      " Guest.Collector@Example.Test ",
    );
    await user.click(screen.getByRole("button", { name: "Find guest order" }));

    expect(await screen.findByText("DO-20260526-000003")).toBeTruthy();
    expect(screen.getByText("Labubu Macaron Vinyl Face")).toBeTruthy();
    expect(screen.getByText("Guest Collector")).toBeTruthy();
    expect(screen.getAllByText("$29.36").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("paypal_order_id")).toBeNull();
    expect(screen.queryByText("payment_session")).toBeNull();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/guest-orders/DO-20260526-000003",
        query: {
          email: "Guest.Collector@Example.Test",
        },
      }),
    );
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
    expectOfficialPayLaterMessage(minicart, "minicart-summary", "32.97");

    await user.click(
      within(minicart).getByRole("button", { name: "Close minicart" }),
    );
    await waitFor(() => {
      expect(screen.queryByLabelText("Minicart")).toBeNull();
    });

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

    expect(screen.queryByLabelText("Minicart")).toBeNull();
    expect(getShellStatusText()).toContain("Minicart closed.");

    await user.click(screen.getByRole("button", { name: "Open minicart" }));
    const reopenedMinicart = screen.getByLabelText("Minicart");

    await user.click(
      within(reopenedMinicart).getByRole("link", {
        name: "View cart",
      }),
    );

    expect(screen.getByRole("heading", { name: "Bag" })).toBeTruthy();
    expect(globalThis.location.pathname).toBe("/cart");
    expect(screen.queryByLabelText("Minicart")).toBeNull();
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
    expect(screen.queryByLabelText("Minicart")).toBeNull();
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
          const purchasePanel = screen.getByLabelText("Purchase panel");
          expectExpressScopes(purchasePanel);
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

  it("does not leave sample express review data visible when snapshot loading fails", async () => {
    const apiClient = createRecordingApiClient({
      getErrorByPath: {
        "/api/paypal/orders/express-review": new Error(
          "express review not found",
        ),
      },
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout/express-review?paypal_order_id=PAYPAL_ORDER_MISSING"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Express review unavailable")).toBeTruthy();
    });

    expect(screen.queryByText("DO-20260607-000123")).toBeNull();
    expect(screen.getByText("PAYPAL_ORDER_MISSING")).toBeTruthy();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirm and pay",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen.getByText("Express review snapshot could not be loaded."),
    ).toBeTruthy();
  });

  it("captures the express review order only after the buyer confirms", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponse: expressReviewApiResponse(),
      postResponse: captureApiResponse(),
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
    expect(apiClient.calls).not.toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/paypal/orders/PAYPAL_ORDER_EXPRESS/capture",
      }),
    );

    await user.click(screen.getByRole("button", { name: "Confirm and pay" }));

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {},
          method: "post",
          path: "/api/paypal/orders/PAYPAL_ORDER_EXPRESS/capture",
          query: {
            market: "US",
          },
        }),
      );
    });
    expect(screen.getAllByText("Payment captured")).toHaveLength(2);
    expect(screen.getByText("PAYPAL_CAPTURE_EXPRESS")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Thank you!" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View Order" }).getAttribute("href"),
    ).toBe("/guest-orders");
    expect(
      screen
        .getByRole("link", { name: "Continue Shopping" })
        .getAttribute("href"),
    ).toBe("/products");
    expect(
      screen.queryByRole("button", { name: "Confirm and pay" }),
    ).toBeNull();
    expect(getShellStatusText()).toContain(
      "Payment captured for order DO-20260601-000002.",
    );
  });

  it("does not offer guest account creation after signed-in express capture", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      existingSession: {
        accessToken: "access_token_existing",
        email: "alice.la@example.test",
        userId: "user_existing",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponse: expressReviewApiResponse(),
      postResponseByPath: {
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_existing",
          quantity: 1,
          unitPriceMinor: 1399,
        }),
        "/api/paypal/orders/PAYPAL_ORDER_EXPRESS/capture": captureApiResponse(),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/checkout/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Account" })).toBeTruthy();
      expect(screen.getByText("DO-20260601-000002")).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: "Confirm and pay" }));
    await screen.findByText("PAYPAL_CAPTURE_EXPRESS");

    expect(
      screen.queryByRole("button", {
        name: "Create account to save this order",
      }),
    ).toBeNull();
  });

  it("offers guest account creation after capture and links matching guest orders after registration", async () => {
    const user = userEvent.setup();
    const authClient = createRecordingAuthClient({
      signUpSession: {
        accessToken: "access_token_guest_link",
        email: "guest.collector@example.test",
        userId: "user_guest_link",
      },
    });
    const apiClient = createRecordingApiClient({
      getResponse: expressReviewApiResponse(),
      postResponseByPath: {
        "/api/account/auth/lookup": {
          email: "guest.collector@example.test",
          status: "new",
        },
        "/api/account/guest-orders/link": {
          linked_order_count: 1,
        },
        "/api/cart/merge": cartApiResponse({
          buyerKind: "authenticated",
          cartClientSecret: null,
          cartPublicId: "cart_public_guest_link",
          quantity: 0,
          unitPriceMinor: 1399,
        }),
        "/api/paypal/orders/PAYPAL_ORDER_EXPRESS/capture": captureApiResponse(),
      },
    });

    render(
      <App
        apiClient={apiClient}
        authClient={authClient}
        initialPathname="/checkout/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("DO-20260601-000002")).toBeTruthy();
    });
    await user.click(screen.getByRole("button", { name: "Confirm and pay" }));
    expect(
      await screen.findByRole("button", {
        name: "Create account to save this order",
      }),
    ).toBeTruthy();

    await user.click(
      screen.getByRole("button", {
        name: "Create account to save this order",
      }),
    );
    const emailDialog = screen.getByRole("dialog", { name: "Sign in" });
    await user.type(
      within(emailDialog).getByLabelText("Email"),
      "guest.collector@example.test",
    );
    await user.click(
      within(emailDialog).getByRole("button", { name: "Continue" }),
    );
    const registerDialog = await screen.findByRole("dialog", {
      name: "Create account",
    });
    await user.type(
      within(registerDialog).getByLabelText("Password"),
      "secret",
    );
    await user.click(
      within(registerDialog).getByLabelText(
        "I agree to the Terms of Service and Privacy Policy.",
      ),
    );
    await user.click(
      within(registerDialog).getByRole("button", { name: "Create account" }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          method: "post",
          path: "/api/account/guest-orders/link",
          options: {
            headers: {
              authorization: "Bearer access_token_guest_link",
            },
          },
        }),
      );
    });
    expect(getShellStatusText()).toContain("Linked 1 guest order to account.");
  });

  it("does not capture from express review when the amount guard blocks payment", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponse: expressReviewApiResponse({
        amountGuard: {
          action: "block_capture",
          canCapture: false,
          mismatches: [
            {
              reason: "final_total_mismatch",
            },
          ],
          status: "mismatch",
          toleranceMinor: 0,
        },
      }),
      postResponse: captureApiResponse(),
    });

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout/express-review?paypal_order_id=PAYPAL_ORDER_EXPRESS"
        initialCart={singleItemCart({ quantity: 1 })}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Amount mismatch detected")).toBeTruthy();
    });

    const confirmButton = screen.getByRole("button", {
      name: "Confirm and pay",
    });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
    await user.click(confirmButton);

    expect(apiClient.calls).not.toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/paypal/orders/PAYPAL_ORDER_EXPRESS/capture",
      }),
    );
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

    render(
      <App
        apiClient={apiClient}
        initialPathname="/checkout"
        initialCart={singleItemCart({ quantity: 1 })}
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
      expect(orderSummary.textContent).not.toContain(`${label} selected`);
      expect(orderSummary.textContent).toContain(`${label} payment option`);
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
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            fulfillment_mode: "delivery",
          },
          method: "post",
          path: "/api/checkout/drafts",
          query: { market: "US" },
        }),
      );
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
    expect(within(orderSummary).getAllByText("SAVE10")).toHaveLength(2);
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
    const pickupStores = [
      {
        id: "store_popmart_nyc",
        name: "POP MART New York",
        address_line1: "100 Broadway",
        city: "New York",
        state: "NY",
        postal_code: "10012",
        country_code: "US",
        phone: "+1 212 555 0101",
        available_items_count: 1,
        unavailable_items_count: 0,
      },
    ];
    const apiClient = createRecordingApiClient({
      postResponse: checkoutDraftApiResponse({
        fulfillmentMode: "pickup",
        id: pickupDraftUuid,
        promoLabel: "PICKUP5",
        totalMinor: 1349,
        pickupStores,
      }),
      patchResponse: checkoutDraftApiResponse({
        fulfillmentMode: "pickup",
        id: pickupDraftUuid,
        promoLabel: "PICKUP5",
        totalMinor: 1349,
        pickupStores,
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
    await waitForStepState(pickupLocationStep, "saved");
    expect(getStep("Store selection").getAttribute("data-step-state")).toBe(
      "editing",
    );
    expect(within(storeDialog).getByText("POP MART New York")).toBeTruthy();
    expect(
      within(storeDialog).queryByText("POP MART Covent Garden"),
    ).toBeNull();
    await user.click(
      within(storeDialog).getByRole("radio", {
        name: /POP MART New York/,
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
            store_id: "store_popmart_nyc",
          },
          method: "patch",
          path: `/api/checkout/drafts/${pickupDraftUuid}/pickup-store`,
        }),
      );
    });

    const orderSummary = screen.getByRole("complementary", {
      name: "Order summary",
    });
    expect(within(orderSummary).getAllByText("PICKUP5")).toHaveLength(2);
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
    const selectedPickupDate = formatLocalDateValue(new Date());
    await user.click(
      within(pickupDateStep).getByRole("button", {
        name: "Submit pickup date",
      }),
    );

    await waitFor(() => {
      expect(apiClient.calls).toContainEqual(
        expect.objectContaining({
          body: {
            pickup_date: selectedPickupDate,
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
    ).toContain("PayPal payment button ready.");
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
    ).toContain("PayPal payment button ready.");
  });
});

describe("App admin interactions", () => {
  it("shows the admin passcode screen for protected admin routes when no session exists", () => {
    const apiClient = createRecordingApiClient();

    render(<App apiClient={apiClient} initialPathname="/admin/orders" />);

    expect(
      screen.getByRole("heading", { name: "Protected Portal" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Admin passcode")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Open Admin Portal" }),
    ).toBeTruthy();
    expect(screen.queryByText("Session", { exact: false })).toBeNull();
  });

  it("unlocks admin shell with a valid passcode and persists session token", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-1",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
      },
      postResponseByPath: {
        "/api/admin/login": {
          status: "ok",
          token: "admin-session-token-1",
          session: {
            session_id: "session-1",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
      },
    });

    render(<App apiClient={apiClient} initialPathname="/admin/orders" />);

    await user.type(screen.getByLabelText("Admin passcode"), "  admin-code  ");
    await user.click(screen.getByRole("button", { name: "Open Admin Portal" }));

    await waitFor(() => {
      expect(
        window.localStorage.getItem("paypal-retail-demo:admin-session"),
      ).toBe("admin-session-token-1");
      expect(
        screen.getByRole("heading", { name: "Admin Portal" }),
      ).toBeTruthy();
    });

    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/admin/login",
        body: {
          passcode: "admin-code",
        },
      }),
    );
  });

  it("restores admin session from local storage and verifies it with server state", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "restore-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/webhooks" />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Admin Portal" }),
      ).toBeTruthy();
      expect(screen.getByRole("link", { name: "Orders" })).toBeTruthy();
      expect(
        window.localStorage.getItem("paypal-retail-demo:admin-session"),
      ).toBe("restore-token");
    });

    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/state",
        options: {
          headers: {
            "x-admin-session": "restore-token",
          },
        },
      }),
    );
  });

  it("switches admin profile and market with the signed admin session", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
      },
      patchResponseByPath: {
        "/api/admin/profile-market": adminConfigApiResponse({
          brandMode: "generic",
          currencyCode: "GBP",
          displayName: "MochiToy Studio",
          locale: "en-GB",
          marketCode: "GB",
          profileSlug: "generic",
        }),
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "switch-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin" />);

    await screen.findByRole("heading", { name: "Admin Portal" });
    await user.selectOptions(
      screen.getByLabelText("Profile"),
      "effee182-44b2-5da7-8630-b642949e8aed",
    );
    await user.selectOptions(
      screen.getByLabelText("Market"),
      "d9a34eb4-f3b0-5531-b53a-65825d600c41",
    );
    await user.click(screen.getByRole("button", { name: "Apply context" }));

    await screen.findByText(
      "MochiToy Studio / GB is active for new storefront requests.",
    );
    expect(
      screen.getByText(/Current: MochiToy Studio\s+\/\s+GB\s+\/\s+GBP/),
    ).toBeTruthy();
    expect(screen.getByText("generic")).toBeTruthy();
    expect(screen.getByText("en-GB")).toBeTruthy();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "patch",
        path: "/api/admin/profile-market",
        body: {
          profile_id: "effee182-44b2-5da7-8630-b642949e8aed",
          market_id: "d9a34eb4-f3b0-5531-b53a-65825d600c41",
        },
        options: {
          headers: {
            "x-admin-session": "switch-token",
          },
        },
      }),
    );
  });

  it("loads admin orders and advances a lifecycle step with the signed session", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
        "/api/admin/orders": adminOrderListApiResponse(),
        "/api/admin/orders/order_1": adminOrderDetailApiResponse(),
      },
      postResponseByPath: {
        "/api/admin/orders/order_1/lifecycle": adminOrderDetailApiResponse({
          status: "processing",
          nextStatuses: ["shipped"],
          timeline: [
            {
              id: "timeline_paid",
              from_status: "pending",
              to_status: "paid",
              actor_type: "system",
              note: "Payment captured.",
              created_at: "2026-06-24T10:20:00.000Z",
            },
            {
              id: "timeline_processing",
              from_status: "paid",
              to_status: "processing",
              actor_type: "admin",
              note: null,
              created_at: "2026-06-24T10:30:00.000Z",
            },
          ],
        }),
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "orders-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/orders" />);

    await screen.findByText("Orders are ready for inspection.");
    await user.click(
      screen.getByRole("button", {
        name: /DO-20260624-000001/,
      }),
    );
    await screen.findByText("Molly Imaginary Travel Blind Box");
    expect(screen.getByText("Payment sessions")).toBeTruthy();
    expect(screen.getByText(/PAYPAL_ORDER_1/)).toBeTruthy();
    expect(screen.getByText("Total snapshots")).toBeTruthy();
    expect(screen.getByText(/POP15/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Mark Processing" }));

    await screen.findByText("DO-20260624-000001 is now Processing.");
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/orders",
        options: {
          headers: {
            "x-admin-session": "orders-token",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/orders/order_1",
        options: {
          headers: {
            "x-admin-session": "orders-token",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/admin/orders/order_1/lifecycle",
        body: {
          next_status: "processing",
        },
        options: {
          headers: {
            "x-admin-session": "orders-token",
          },
        },
      }),
    );
  });

  it("updates admin inventory and pickup date controls with the signed session", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
        "/api/admin/orders": adminOrderListApiResponse(),
        "/api/admin/inventory": adminInventoryListApiResponse(),
        "/api/admin/pickup-dates": adminPickupDateListApiResponse(),
      },
      patchResponseByPath: {
        "/api/admin/inventory/central%3Aprofile_popmart%3Amarket_us%3Aproduct_molly":
          {
            inventory: {
              ...adminInventoryListApiResponse().inventory[0],
              available_quantity: 9,
              updated_at: "2026-06-24T10:40:00.000Z",
            },
          },
        "/api/admin/pickup-dates/pickup_date_1": {
          pickup_date: {
            ...adminPickupDateListApiResponse().pickup_dates[0],
            capacity: 18,
            is_available: false,
            updated_at: "2026-06-24T10:45:00.000Z",
          },
        },
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "inventory-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/inventory" />);

    await screen.findByText("Inventory controls are ready.");
    const inventoryInput = screen.getByLabelText(
      "Available quantity for MOLLY-BB-001 Central warehouse",
    );
    await user.clear(inventoryInput);
    await user.type(inventoryInput, "9");
    await user.click(screen.getByRole("button", { name: "Save stock" }));

    await screen.findByText("MOLLY-BB-001 inventory saved at 9.");
    const pickupInput = screen.getByLabelText(
      "Pickup capacity for San Jose POP MART 2026-06-28",
    );
    await user.clear(pickupInput);
    await user.type(pickupInput, "18");
    await user.click(screen.getByLabelText("Available"));
    await user.click(screen.getByRole("button", { name: "Save date" }));

    await screen.findByText("San Jose POP MART 2026-06-28 saved.");
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/inventory",
        options: {
          headers: {
            "x-admin-session": "inventory-token",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/pickup-dates",
        options: {
          headers: {
            "x-admin-session": "inventory-token",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "patch",
        path: "/api/admin/inventory/central%3Aprofile_popmart%3Amarket_us%3Aproduct_molly",
        body: {
          available_quantity: 9,
        },
        options: {
          headers: {
            "x-admin-session": "inventory-token",
          },
        },
      }),
    );
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "patch",
        path: "/api/admin/pickup-dates/pickup_date_1",
        body: {
          capacity: 18,
          is_available: false,
        },
        options: {
          headers: {
            "x-admin-session": "inventory-token",
          },
        },
      }),
    );
  });

  it("loads admin webhook events with the signed session", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
        "/api/admin/orders": adminOrderListApiResponse(),
        "/api/admin/inventory": adminInventoryListApiResponse(),
        "/api/admin/pickup-dates": adminPickupDateListApiResponse(),
        "/api/admin/webhooks": adminWebhookListApiResponse(),
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "webhooks-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/webhooks" />);

    await screen.findByText("Webhook events are ready.");
    expect(screen.getByText("WH-INVALID-1")).toBeTruthy();
    expect(screen.getByText("Invalid")).toBeTruthy();
    expect(screen.getByText("Ignored")).toBeTruthy();
    expect(screen.getByText("WH-ORDER-1")).toBeTruthy();
    expect(screen.getByText("CHECKOUT.ORDER.APPROVED")).toBeTruthy();
    expect(screen.getAllByText("Processed").length).toBeGreaterThan(0);
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/webhooks",
        options: {
          headers: {
            "x-admin-session": "webhooks-token",
          },
        },
      }),
    );
  });

  it("loads admin payment and order debug sessions with the signed session", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
        "/api/admin/orders": adminOrderListApiResponse(),
        "/api/admin/inventory": adminInventoryListApiResponse(),
        "/api/admin/pickup-dates": adminPickupDateListApiResponse(),
        "/api/admin/webhooks": adminWebhookListApiResponse(),
        "/api/admin/payment-debug": adminPaymentDebugApiResponse(),
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "debug-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/debug" />);

    await screen.findByText("Payment debug sessions are ready.");
    const paymentDebugRegion = screen.getByLabelText(
      "Admin payment debug sessions",
    );
    expect(
      within(paymentDebugRegion).getByText("DO-20260624-000001"),
    ).toBeTruthy();
    expect(within(paymentDebugRegion).getByText("PAYPAL_ORDER_1")).toBeTruthy();
    expect(
      within(paymentDebugRegion).getByText("PAYPAL_CAPTURE_1"),
    ).toBeTruthy();
    expect(within(paymentDebugRegion).getByText("Matched")).toBeTruthy();
    expect(within(paymentDebugRegion).getByText("Capture")).toBeTruthy();
    expect(within(paymentDebugRegion).getByText("WH-ORDER-1")).toBeTruthy();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/payment-debug",
        options: {
          headers: {
            "x-admin-session": "debug-token",
          },
        },
      }),
    );
  });

  it("loads admin runtime debug logs with the signed session and hides secrets", async () => {
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
        "/api/admin/orders": adminOrderListApiResponse(),
        "/api/admin/inventory": adminInventoryListApiResponse(),
        "/api/admin/pickup-dates": adminPickupDateListApiResponse(),
        "/api/admin/webhooks": adminWebhookListApiResponse(),
        "/api/admin/payment-debug": adminPaymentDebugApiResponse(),
        "/api/admin/debug-logs": adminRuntimeDebugLogApiResponse(),
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "debug-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/debug" />);

    await screen.findByText("Runtime debug logs are ready.");
    const runtimeLogRegion = screen.getByLabelText("Admin runtime debug logs");
    expect(
      within(runtimeLogRegion).getByText("PayPal create order failed"),
    ).toBeTruthy();
    expect(within(runtimeLogRegion).getByText("Error")).toBeTruthy();
    expect(within(runtimeLogRegion).getByText("dbg_runtime_1")).toBeTruthy();
    expect(within(runtimeLogRegion).getByText("paypal")).toBeTruthy();
    expect(
      within(runtimeLogRegion).getByText("/api/paypal/orders/delivery"),
    ).toBeTruthy();
    expect(within(runtimeLogRegion).getAllByText("[redacted]").length).toBe(2);
    expect(screen.queryByText("secret-access-token")).toBeNull();
    expect(screen.queryByText("paypal-client-secret")).toBeNull();
    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "get",
        path: "/api/admin/debug-logs",
        options: {
          headers: {
            "x-admin-session": "debug-token",
          },
        },
      }),
    );
  });

  it("logs out and clears the admin session token", async () => {
    const user = userEvent.setup();
    const apiClient = createRecordingApiClient({
      getResponseByPath: {
        "/api/admin/state": {
          authenticated: true,
          session: {
            session_id: "session-restored",
            expires_at: "2026-12-31T23:59:59.000Z",
          },
        },
      },
      postResponse: {
        status: "ok",
      },
    });

    window.localStorage.setItem(
      "paypal-retail-demo:admin-session",
      "logout-token",
    );

    render(<App apiClient={apiClient} initialPathname="/admin/inventory" />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
    });

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Protected Portal" }),
      ).toBeTruthy();
      expect(
        window.localStorage.getItem("paypal-retail-demo:admin-session"),
      ).toBeNull();
    });

    expect(apiClient.calls).toContainEqual(
      expect.objectContaining({
        method: "post",
        path: "/api/admin/logout",
        options: {
          headers: {
            "x-admin-session": "logout-token",
          },
        },
      }),
    );
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

function expectOfficialPayLaterMessage(
  container: Element,
  placement: string,
  amount: string,
) {
  const message = container.querySelector(
    `[data-paylater-message-placement="${placement}"]`,
  );

  expect(message).toBeTruthy();
  expect(message?.getAttribute("data-paylater-message-amount")).toBe(amount);
  expect(message?.querySelector("paypal-message")).toBeTruthy();
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

function defaultAccountAddress() {
  return {
    id: "address_default",
    label: "Home",
    recipient_name: "Alice Lane",
    phone: "555-0101",
    address_line1: "742 N Fairfax Ave",
    address_line2: null,
    city: "Los Angeles",
    state: "CA",
    postal_code: "90046",
    country_code: "US",
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function accountOrderApiResponse() {
  return {
    order_number: "PO-20260602-000118",
    placed_at: "2026-06-02T18:30:00.000Z",
    fulfillment_mode: "pickup",
    status: "picked_up",
    payment_status: "captured",
    currency_code: "USD",
    review_eligible: true,
    fulfillment_label: "Pickup at POP MART Soho",
    totals: {
      subtotal_minor: 2998,
      discount_minor: 300,
      tax_minor: 118,
      shipping_minor: 0,
      total_minor: 2816,
    },
    items: [
      {
        id: "line_1",
        product_name: "Skullpanda Future Drop",
        product_url: "/products/skullpanda-future-drop",
        product_image_url:
          "/assets/popmart/products/skullpanda-future-drop-1.svg",
        unit_price_minor: 1599,
        quantity: 1,
        line_total_minor: 1599,
        review_eligible: true,
        review_submitted: false,
        review: null,
      },
    ],
    timeline: [
      {
        label: "Order placed",
        description: "Pickup order was created and paid.",
        status: "complete",
        occurred_at: "2026-06-02T18:30:00.000Z",
      },
      {
        label: "Picked up",
        description: "Buyer collected the order in store.",
        status: "current",
        occurred_at: "2026-06-04T16:00:00.000Z",
      },
    ],
    addresses: [
      {
        address_type: "pickup_store",
        recipient_name: "S2S POP MART Soho",
        city: "New York",
        state: "NY",
        postal_code: "10012",
        country_code: "US",
      },
    ],
  };
}

function reviewedAccountOrderApiResponse() {
  const order = accountOrderApiResponse();
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      review_eligible: false,
      review_submitted: true,
      review: {
        rating: 5,
        title: "Tiny shelf star",
        body: "The paint details look great beside my other figures.",
      },
    })),
  };
}

function updatedReviewAccountOrderApiResponse() {
  const order = accountOrderApiResponse();
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      review_eligible: false,
      review_submitted: true,
      review: {
        rating: 4,
        title: "Desk favorite",
        body: "Still charming after a week on my desk.",
      },
    })),
  };
}

function guestOrderApiResponse() {
  return {
    order: {
      order_number: "DO-20260526-000003",
      fulfillment_mode: "delivery",
      status: "delivered",
      payment_status: "captured",
      currency_code: "USD",
      review_eligible: true,
      totals: {
        subtotal_minor: 2599,
        discount_minor: 500,
        tax_minor: 242,
        shipping_minor: 595,
        total_minor: 2936,
      },
      items: [
        {
          product_sku: "POP-LABUBU-009",
          product_name: "Labubu Macaron Vinyl Face",
          product_url: "/products/labubu-macaron-vinyl-face",
          product_image_url:
            "/assets/popmart/products/labubu-macaron-vinyl-face-1.svg",
          unit_price_minor: 2599,
          quantity: 1,
          fulfillable_quantity: 1,
          unavailable_quantity: 0,
          line_subtotal_minor: 2599,
          line_discount_minor: 500,
          line_tax_minor: 242,
          line_total_minor: 2341,
        },
      ],
      addresses: [
        {
          address_type: "shipping",
          recipient_name: "Guest Collector",
          city: "Miami",
          state: "FL",
          postal_code: "33127",
          country_code: "US",
        },
      ],
    },
  };
}

function secondaryAccountAddress() {
  return {
    ...defaultAccountAddress(),
    id: "address_secondary",
    label: "Studio",
    address_line1: "1 Market St",
    city: "San Francisco",
    postal_code: "94105",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function promotedAccountAddress() {
  return {
    ...secondaryAccountAddress(),
    is_default_shipping: true,
    is_default_billing: true,
  };
}

function nonDefaultAccountAddress() {
  return {
    ...defaultAccountAddress(),
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function createdAccountAddress() {
  return {
    id: "address_created",
    label: "Office",
    recipient_name: "Alice Lane",
    phone: "555-0102",
    address_line1: "1 Market St",
    address_line2: "Suite 4",
    city: "San Francisco",
    state: "CA",
    postal_code: "94105",
    country_code: "US",
    is_default_shipping: false,
    is_default_billing: false,
  };
}

function singleItemCart({
  cartClientSecret = "cart_secret_existing",
  quantity,
}: {
  readonly cartClientSecret?: string | null;
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

function emptyInitialCart({
  cartClientSecret,
  cartPublicId,
}: {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
}): CartData {
  return {
    cartPublicId,
    cartClientSecret,
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: "USD",
    locale: "en-US",
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [],
  };
}

interface RecordingApiCall {
  readonly method: "delete" | "get" | "patch" | "post";
  readonly path: string;
  readonly body?: unknown;
  readonly query?: ApiQueryParams | undefined;
  readonly options?: ApiRequestOptions | undefined;
}

interface RecordingApiClientInput {
  readonly getError?: Error;
  readonly getErrorByPath?: Readonly<Record<string, Error>>;
  readonly getErrors?: readonly (Error | undefined)[];
  readonly deleteResponseByPath?: Readonly<Record<string, unknown>>;
  readonly getResponse?: unknown;
  readonly getResponseByPath?: Readonly<Record<string, unknown>>;
  readonly getResponses?: readonly unknown[];
  readonly patchError?: Error;
  readonly patchResponseByPath?: Readonly<Record<string, unknown>>;
  readonly patchResponse?: unknown;
  readonly postError?: Error;
  readonly postResponseByPath?: Readonly<Record<string, unknown>>;
  readonly postResponse?: unknown;
}

interface RecordingAuthSession {
  readonly accessToken: string;
  readonly email: string;
  readonly userId: string;
}

interface RecordingAuthCall {
  readonly email: string;
  readonly password: string;
}

interface RecordingAuthClientInput {
  readonly existingSession?: RecordingAuthSession | null;
  readonly signInSession?: RecordingAuthSession;
  readonly signUpSession?: RecordingAuthSession;
}

function createRecordingAuthClient(input: RecordingAuthClientInput = {}): {
  readonly getSessionCalls: string[];
  readonly signInCalls: RecordingAuthCall[];
  readonly signUpCalls: RecordingAuthCall[];
  readonly getSession: () => Promise<RecordingAuthSession | null>;
  readonly signInWithPassword: (
    call: RecordingAuthCall,
  ) => Promise<RecordingAuthSession>;
  readonly signUpWithPassword: (
    call: RecordingAuthCall,
  ) => Promise<RecordingAuthSession>;
} {
  const getSessionCalls: string[] = [];
  const signInCalls: RecordingAuthCall[] = [];
  const signUpCalls: RecordingAuthCall[] = [];

  return {
    getSessionCalls,
    signInCalls,
    signUpCalls,
    async getSession() {
      getSessionCalls.push("getSession");
      return input.existingSession ?? null;
    },
    async signInWithPassword(call) {
      signInCalls.push(call);
      if (!input.signInSession) {
        throw new Error("sign-in failed");
      }
      return input.signInSession;
    },
    async signUpWithPassword(call) {
      signUpCalls.push(call);
      if (!input.signUpSession) {
        throw new Error("sign-up failed");
      }
      return input.signUpSession;
    },
  };
}

function createRecordingApiClient(
  input: RecordingApiClientInput = {},
): ApiClient & {
  readonly calls: RecordingApiCall[];
} {
  const calls: RecordingApiCall[] = [];
  let getErrorIndex = 0;
  let getResponseIndex = 0;

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
      if (input.getErrorByPath && path in input.getErrorByPath) {
        throw input.getErrorByPath[path];
      }
      if (input.getErrors?.length) {
        const error =
          input.getErrors[Math.min(getErrorIndex, input.getErrors.length - 1)];
        getErrorIndex += 1;
        if (error) {
          throw error;
        }
      }
      if (input.getError) {
        throw input.getError;
      }
      if (input.getResponseByPath && path in input.getResponseByPath) {
        return input.getResponseByPath[path] as TData;
      }
      if (input.getResponses?.length) {
        const response =
          input.getResponses[
            Math.min(getResponseIndex, input.getResponses.length - 1)
          ];
        getResponseIndex += 1;
        return response as TData;
      }
      return (input.getResponse ?? {}) as TData;
    },
    async delete<TData = unknown>(
      path: string,
      query?: ApiQueryParams,
      options?: ApiRequestOptions,
    ) {
      calls.push({ method: "delete", path, query, options });
      if (input.deleteResponseByPath && path in input.deleteResponseByPath) {
        return input.deleteResponseByPath[path] as TData;
      }
      return {} as TData;
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
      if (input.patchResponseByPath && path in input.patchResponseByPath) {
        return input.patchResponseByPath[path] as TData;
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
      if (input.postResponseByPath && path in input.postResponseByPath) {
        return input.postResponseByPath[path] as TData;
      }
      return (input.postResponse ?? {}) as TData;
    },
  };
}

function adminOrderListApiResponse({
  status = "paid",
  nextStatuses = ["processing"],
}: {
  readonly status?: string;
  readonly nextStatuses?: readonly string[];
} = {}) {
  return {
    orders: [
      {
        id: "order_1",
        profile_id: "profile_popmart",
        market_id: "market_us",
        order_number: "DO-20260624-000001",
        fulfillment_mode: "delivery",
        status,
        payment_status: "captured",
        currency_code: "USD",
        total_minor: 2633,
        placed_at: "2026-06-24T10:15:00.000Z",
        updated_at: "2026-06-24T10:20:00.000Z",
        next_statuses: nextStatuses,
      },
    ],
  };
}

function adminOrderDetailApiResponse({
  status = "paid",
  nextStatuses = ["processing"],
  timeline = [
    {
      id: "timeline_paid",
      from_status: "pending",
      to_status: "paid",
      actor_type: "system",
      note: "Payment captured.",
      created_at: "2026-06-24T10:20:00.000Z",
    },
  ],
}: {
  readonly status?: string;
  readonly nextStatuses?: readonly string[];
  readonly timeline?: readonly Record<string, unknown>[];
} = {}) {
  return {
    order: {
      ...adminOrderListApiResponse({ status, nextStatuses }).orders[0],
      totals: {
        subtotal_minor: 1969,
        discount_minor: 0,
        tax_minor: 165,
        shipping_minor: 499,
        total_minor: 2633,
      },
      items: [
        {
          id: "order_item_1",
          product_sku: "MOLLY-BB-001",
          product_name: "Molly Imaginary Travel Blind Box",
          product_url: "/products/blind-boxes-2",
          product_image_url: "/assets/popmart/products/blind-boxes-2-1.png",
          unit_price_minor: 1969,
          quantity: 1,
          fulfillable_quantity: 1,
          unavailable_quantity: 0,
          line_subtotal_minor: 1969,
          line_discount_minor: 0,
          line_tax_minor: 165,
          line_total_minor: 2134,
        },
      ],
      addresses: [
        {
          id: "order_address_1",
          address_type: "shipping",
          recipient_name: "Sandbox Buyer",
          phone: null,
          address_line1: "221 Demo Street",
          address_line2: null,
          city: "San Jose",
          state: "CA",
          postal_code: "95131",
          country_code: "US",
        },
      ],
      timeline,
      payment_sessions: [
        {
          id: "payment_session_1",
          provider: "paypal",
          method: "paypal",
          status: "captured",
          attempt_number: 1,
          paypal_order_id: "PAYPAL_ORDER_1",
          paypal_capture_id: "PAYPAL_CAPTURE_1",
          paypal_invoice_id: "DO-20260624-000001-01",
          paypal_request_id: "request_1",
          merchant_total_minor: 2633,
          provider_total_minor: 2633,
          amount_consistency_status: "matched",
          currency_code: "USD",
          created_at: "2026-06-24T10:16:00.000Z",
          updated_at: "2026-06-24T10:20:00.000Z",
        },
      ],
      total_snapshots: [
        {
          id: "total_snapshot_1",
          payment_session_id: "payment_session_1",
          calculation_stage: "capture",
          currency_code: "USD",
          merchandise_subtotal_minor: 1969,
          product_discount_minor: 0,
          promo_discount_minor: 0,
          taxable_subtotal_minor: 1969,
          tax_minor: 165,
          shipping_minor: 499,
          total_minor: 2633,
          promo_evaluation_id: "promo_evaluation_1",
          created_at: "2026-06-24T10:20:00.000Z",
        },
      ],
      paypal_snapshots: [
        {
          id: "paypal_snapshot_1",
          payment_session_id: "payment_session_1",
          paypal_invoice_id: "DO-20260624-000001-01",
          paypal_request_id: "request_1",
          created_at: "2026-06-24T10:20:00.000Z",
        },
      ],
      promo_evaluations: [
        {
          id: "promo_evaluation_1",
          merchandise_discount_minor: 0,
          taxable_subtotal_minor: 1969,
          final_total_minor: 2633,
          created_at: "2026-06-24T10:19:00.000Z",
        },
      ],
      promo_evaluation_lines: [
        {
          id: "promo_line_1",
          promo_evaluation_id: "promo_evaluation_1",
          code_snapshot: "POP15",
          evaluation_status: "selected",
          rejection_reason: null,
          discount_minor: 0,
          explanation: "Selected for Admin demo visibility.",
        },
      ],
      inventory_effects: [
        {
          order_item_id: "order_item_1",
          product_sku: "MOLLY-BB-001",
          product_name: "Molly Imaginary Travel Blind Box",
          fulfillment_mode: "delivery",
          requested_quantity: 1,
          fulfillable_quantity: 1,
          unavailable_quantity: 0,
        },
      ],
      linked_webhooks: [
        {
          id: "webhook_1",
          event_id: "WH-ORDER-1",
          event_type: "CHECKOUT.ORDER.APPROVED",
          verification_status: "valid",
          processing_status: "processed",
          received_at: "2026-06-24T10:18:00.000Z",
          processed_at: "2026-06-24T10:18:05.000Z",
        },
      ],
    },
  };
}

function adminInventoryListApiResponse() {
  return {
    inventory: [
      {
        id: "central:profile_popmart:market_us:product_molly",
        inventory_type: "central",
        profile_id: "profile_popmart",
        market_id: "market_us",
        product_id: "product_molly",
        product_sku: "MOLLY-BB-001",
        product_name: "Molly Imaginary Travel Blind Box",
        available_quantity: 12,
        updated_at: "2026-06-24T10:00:00.000Z",
      },
    ],
  };
}

function adminPickupDateListApiResponse() {
  return {
    pickup_dates: [
      {
        id: "pickup_date_1",
        market_id: "market_us",
        store_id: "store_san_jose",
        store_name: "San Jose POP MART",
        pickup_date: "2026-06-28",
        capacity: 10,
        is_available: true,
        updated_at: "2026-06-24T10:00:00.000Z",
      },
    ],
  };
}

function adminWebhookListApiResponse() {
  return {
    webhooks: [
      {
        id: "webhook_invalid_1",
        event_id: "WH-INVALID-1",
        event_type: "BILLING.SUBSCRIPTION.CREATED",
        verification_status: "invalid",
        linked_order_id: null,
        linked_payment_session_id: null,
        processing_status: "ignored",
        received_at: "2026-06-24T10:25:00.000Z",
        processed_at: null,
      },
      {
        id: "webhook_valid_1",
        event_id: "WH-ORDER-1",
        event_type: "CHECKOUT.ORDER.APPROVED",
        verification_status: "valid",
        linked_order_id: "order_1",
        linked_payment_session_id: "payment_session_1",
        processing_status: "processed",
        received_at: "2026-06-24T10:18:00.000Z",
        processed_at: "2026-06-24T10:18:05.000Z",
      },
    ],
  };
}

function adminPaymentDebugApiResponse() {
  return {
    payment_sessions: [
      {
        id: "payment_session_1",
        order_id: "order_1",
        order: {
          ...adminOrderListApiResponse().orders[0],
        },
        provider: "paypal",
        method: "paypal",
        status: "captured",
        attempt_number: 1,
        paypal_order_id: "PAYPAL_ORDER_1",
        paypal_capture_id: "PAYPAL_CAPTURE_1",
        paypal_invoice_id: "DO-20260624-000001-01",
        paypal_request_id: "request_1",
        vault_requested: false,
        merchant_total_minor: 2633,
        provider_total_minor: 2633,
        amount_consistency_status: "matched",
        currency_code: "USD",
        created_at: "2026-06-24T10:16:00.000Z",
        updated_at: "2026-06-24T10:20:00.000Z",
        total_snapshots: [
          {
            id: "total_snapshot_1",
            order_id: "order_1",
            payment_session_id: "payment_session_1",
            fulfillment_mode: "delivery",
            calculation_stage: "capture",
            currency_code: "USD",
            merchandise_subtotal_minor: 1969,
            product_discount_minor: 0,
            promo_discount_minor: 0,
            taxable_subtotal_minor: 1969,
            tax_minor: 165,
            shipping_minor: 499,
            total_minor: 2633,
            promo_evaluation_id: "promo_evaluation_1",
            created_at: "2026-06-24T10:20:00.000Z",
          },
        ],
        paypal_snapshots: [
          {
            id: "paypal_snapshot_1",
            payment_session_id: "payment_session_1",
            paypal_invoice_id: "DO-20260624-000001-01",
            paypal_request_id: "request_1",
            request_json: {
              intent: "CAPTURE",
            },
            response_json: {
              status: "COMPLETED",
            },
            merchant_snapshot_json: {
              total_minor: 2633,
            },
            created_at: "2026-06-24T10:20:00.000Z",
          },
        ],
        linked_webhooks: [
          {
            id: "webhook_1",
            event_id: "WH-ORDER-1",
            event_type: "CHECKOUT.ORDER.APPROVED",
            verification_status: "valid",
            linked_order_id: "order_1",
            linked_payment_session_id: "payment_session_1",
            processing_status: "processed",
            received_at: "2026-06-24T10:18:00.000Z",
            processed_at: "2026-06-24T10:18:05.000Z",
          },
        ],
      },
    ],
  };
}

function adminRuntimeDebugLogApiResponse() {
  return {
    debug_logs: [
      {
        timestamp: "2026-06-24T10:30:00.000Z",
        level: "error",
        message: "PayPal create order failed",
        debug_id: "dbg_runtime_1",
        source: "paypal",
        request_path: "/api/paypal/orders/delivery",
        context: {
          debug_id: "dbg_runtime_1",
          source: "paypal",
          path: "/api/paypal/orders/delivery",
          payment_session_id: "payment_session_1",
          access_token: "[redacted]",
          nested: {
            client_secret: "[redacted]",
          },
        },
      },
    ],
  };
}

function adminConfigApiResponse({
  brandMode,
  currencyCode,
  displayName,
  locale,
  marketCode,
  profileSlug,
}: {
  readonly brandMode: "generic" | "popmart";
  readonly currencyCode: string;
  readonly displayName: string;
  readonly locale: string;
  readonly marketCode: string;
  readonly profileSlug: string;
}) {
  return {
    profile: {
      slug: profileSlug,
      display_name: displayName,
      brand_mode: brandMode,
    },
    market: {
      code: marketCode,
      currency_code: currencyCode,
      locale,
    },
    features: {
      delivery: true,
      pickup: true,
      vaulting: true,
      apple_pay: true,
      google_pay: true,
      venmo: marketCode === "US",
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
  buyerKind = "guest",
  cartClientSecret,
  cartItemId = "cart_item_labubu",
  cartPublicId = "cart_public_existing",
  name = "Labubu Have a Seat",
  productId = "product_labubu",
  quantity,
  slug = "labubu-have-a-seat",
  unitPriceMinor,
}: {
  readonly buyerKind?: "authenticated" | "guest";
  readonly cartClientSecret?: string | null;
  readonly cartItemId?: string;
  readonly cartPublicId?: string;
  readonly name?: string;
  readonly productId?: string;
  readonly quantity: number;
  readonly slug?: string;
  readonly unitPriceMinor: number;
}) {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: cartPublicId,
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: buyerKind,
      status: "active",
      currency_code: "USD",
      items: [
        {
          id: cartItemId,
          product_id: productId,
          slug,
          name,
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

function productDetailApiResponse() {
  return {
    product: {
      id: "product_blind_boxes_1",
      slug: "blind-boxes-1",
      sku: "POP-001",
      name: "The Monsters Blind Boxes 1",
      series_name: "The Monsters",
      description: "The Monsters collectible for the blind boxes series.",
      category_slug: "blind-boxes",
      release_status: "released",
      release_date: "2026-06-05",
      purchasable: true,
      checkout_block_reason: null,
      max_quantity_per_order: 1,
      price: {
        currency_code: "USD",
        regular_price_minor: 1499,
        current_price_minor: 1274,
        is_on_sale: true,
      },
      images: [
        {
          image_path: "/assets/popmart/products/blind-boxes-1-1.png",
          alt_text: "The Monsters Blind Boxes 1 view 1",
        },
      ],
      inventory: {
        delivery_available: true,
        pickup_available: true,
      },
      reviews: {
        visible: false,
        items: [],
      },
    },
  };
}

function generatedStarterCartApiResponse() {
  return {
    cart: {
      id: "cart_guest_us",
      cart_public_id: "cart_public_generated",
      profile_id: "profile_popmart",
      market_id: "market_us",
      buyer_kind: "guest",
      status: "active",
      currency_code: "USD",
      items: [
        {
          id: "cart_item_blind_boxes_2",
          product_id: "2399a35e-ea68-566d-a6cf-f6ad63425e05",
          slug: "blind-boxes-2",
          name: "Molly Blind Boxes 2",
          image_path: "/assets/popmart/products/blind-boxes-2-1.png",
          quantity: 1,
          unit_price_minor: 1969,
          line_subtotal_minor: 1969,
          checkout_eligible: true,
        },
        {
          id: "cart_item_plush_11",
          product_id: "579f3095-579d-5c95-9260-9ecdb5306b9c",
          slug: "plush-11",
          name: "The Monsters Plush 1",
          image_path: "/assets/popmart/products/plush-11-1.png",
          quantity: 1,
          unit_price_minor: 4999,
          line_subtotal_minor: 4999,
          checkout_eligible: true,
        },
      ],
      totals: {
        item_count: 2,
        subtotal_minor: 6968,
        currency_code: "USD",
      },
      binding: {
        cart_public_id: "cart_public_generated",
        cart_client_secret: "cart_secret_generated",
      },
    },
    adjustments: [],
  };
}

function emptyCartApiResponse({
  cartClientSecret,
  cartPublicId,
}: {
  readonly cartClientSecret: string;
  readonly cartPublicId: string;
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
      items: [],
      totals: {
        item_count: 0,
        subtotal_minor: 0,
        currency_code: "USD",
      },
      binding: {
        cart_public_id: cartPublicId,
        cart_client_secret: cartClientSecret,
      },
    },
    adjustments: [],
  };
}

function checkoutDraftApiResponse({
  fulfillmentMode,
  id,
  pickupStores = [],
  promoLabel,
  totalMinor,
}: {
  readonly fulfillmentMode: "delivery" | "pickup";
  readonly id?: string;
  readonly pickupStores?: readonly {
    readonly id: string;
    readonly name: string;
    readonly address_line1: string;
    readonly city: string;
    readonly state: string | null;
    readonly postal_code: string;
    readonly country_code: string;
    readonly phone: string | null;
    readonly available_items_count: number;
    readonly unavailable_items_count: number;
  }[];
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
        stores: pickupStores,
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

function expressReviewApiResponse({
  amountGuard = {
    action: "allow_capture",
    canCapture: true,
    mismatches: [],
    status: "matched",
    toleranceMinor: 0,
  },
}: {
  readonly amountGuard?: {
    readonly action: "allow_capture" | "block_capture";
    readonly canCapture: boolean;
    readonly mismatches: readonly unknown[];
    readonly status: "matched" | "mismatch";
    readonly toleranceMinor: number;
  };
} = {}) {
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
      action: amountGuard.action,
      status: amountGuard.status,
      can_capture: amountGuard.canCapture,
      tolerance_minor: amountGuard.toleranceMinor,
      mismatches: amountGuard.mismatches,
    },
  };
}

function captureApiResponse() {
  return {
    order_number: "DO-20260601-000002",
    payment_session_id: "payment_session_express_existing",
    paypal_order_id: "PAYPAL_ORDER_EXPRESS",
    paypal_capture_id: "PAYPAL_CAPTURE_EXPRESS",
    paypal_order_status: "COMPLETED",
    paypal_capture_status: "COMPLETED",
    paypal_request_id: "request-capture-express",
    amount_guard: {
      action: "allow_capture",
      status: "matched",
      can_capture: true,
      tolerance_minor: 0,
      mismatches: [],
    },
  };
}

function formatLocalDateValue(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

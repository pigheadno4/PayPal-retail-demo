import { useState, type ReactNode } from "react";

import type { ApiClient, ApiQueryParams } from "../api/client.js";
import { AuthModalShell } from "../features/account/AuthModalShell.js";
import { CartPage } from "../features/cart/CartPage.js";
import { MinicartShell } from "../features/cart/MinicartShell.js";
import {
  calculateCartItemCount,
  defaultCartData,
  incrementCartItemQuantity,
  reconcileCartDataFromApiResponse,
  setCartItemQuantity,
  type CartApiResponse,
  type CartData,
} from "../features/cart/cartModel.js";
import {
  CategoryPage,
  defaultCategoryPageData,
  type CategoryPageData,
} from "../features/catalog/CategoryPage.js";
import {
  defaultHomePageData,
  HomePage,
  type HomePageData,
} from "../features/catalog/HomePage.js";
import {
  defaultProductDetailPages,
  ProductDetailPage,
  type ProductDetailPageData,
} from "../features/catalog/ProductDetailPage.js";
import {
  CheckoutPage,
  defaultCheckoutPageData,
  type CheckoutDraftUpdateRequest,
  type CheckoutPaymentActionContext,
  type CheckoutPageData,
  type CheckoutSubmittedField,
} from "../features/checkout/CheckoutPage.js";
import {
  reconcileCheckoutDataFromDraftResponse,
  type CheckoutDraftApiResponse,
} from "../features/checkout/checkoutDraftApi.js";
import {
  defaultExpressReviewPageData,
  ExpressReviewPage,
  type ExpressReviewPageData,
} from "../features/checkout/ExpressReviewPage.js";
import { CardFieldsCheckoutAction } from "../features/payments/CardFieldsCheckoutAction.js";
import { PayPalSdkProviderScope } from "../features/payments/PayPalSdkProviderScope.js";
import {
  PayLaterAmountMessage,
  PayLaterStandaloneAction,
} from "../features/payments/PayLaterStandaloneAction.js";
import { PayPalStandaloneAction } from "../features/payments/PayPalStandaloneAction.js";
import {
  formatDeliveryExpressMethod,
  formatDeliveryExpressSource,
  type DeliveryExpressStartContext,
} from "../features/payments/deliveryExpress.js";
import {
  WalletCheckoutAction,
  type WalletPaymentMethod,
} from "../features/payments/WalletCheckoutAction.js";
import { StatusRegion } from "../components/accessibility.js";
import { AppProviders, useApiClient } from "../state/appProviders.js";
import {
  createInitialStorefrontState,
  defaultRuntimeConfig,
  type StorefrontRuntimeConfig,
} from "../state/storefrontState.js";
import { resolveAppRoute, type AppRoute } from "./routes.js";
import { resolveProfileAssets } from "./profileAssets.js";

export interface AppProps {
  readonly apiClient?: ApiClient | undefined;
  readonly initialPathname?: string;
  readonly initialConfig?: StorefrontRuntimeConfig;
  readonly initialHomePage?: HomePageData;
  readonly initialCategoryPage?: CategoryPageData;
  readonly initialProductPages?: Readonly<
    Record<string, ProductDetailPageData>
  >;
  readonly initialCart?: CartData;
  readonly initialCheckout?: CheckoutPageData;
  readonly initialExpressReview?: ExpressReviewPageData;
}

interface BuyerNavigationContext {
  readonly pathname: string;
  readonly statusMessage: string;
  readonly refreshTrigger?: CartRefreshTrigger;
}

type CartRefreshTrigger = "checkout_start" | "express_payment_start";

export function App({
  apiClient,
  initialPathname,
  initialConfig,
  initialHomePage,
  initialCategoryPage,
  initialProductPages,
  initialCart,
  initialCheckout,
  initialExpressReview,
}: AppProps = {}) {
  const route = resolveAppRoute(initialPathname ?? browserPathname());
  const shellState = createInitialStorefrontState();
  const config = initialConfig ?? defaultRuntimeConfig();

  if (route.scope === "admin") {
    return <AdminShell route={route} />;
  }

  return (
    <AppProviders initialConfig={config} {...(apiClient ? { apiClient } : {})}>
      <BuyerShell
        route={route}
        config={config}
        homePageData={initialHomePage ?? defaultHomePageData}
        categoryPageData={initialCategoryPage ?? defaultCategoryPageData}
        productPages={initialProductPages ?? defaultProductDetailPages}
        cartData={initialCart ?? defaultCartData}
        checkoutData={initialCheckout ?? defaultCheckoutPageData}
        expressReviewData={initialExpressReview ?? defaultExpressReviewPageData}
        authModalState={shellState.panels.authModal}
        minicartState={shellState.panels.minicart}
      />
    </AppProviders>
  );
}

function BuyerShell({
  route,
  config,
  homePageData,
  categoryPageData,
  productPages,
  cartData,
  checkoutData,
  expressReviewData,
  authModalState,
  minicartState,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly config: StorefrontRuntimeConfig;
  readonly homePageData: HomePageData;
  readonly categoryPageData: CategoryPageData;
  readonly productPages: Readonly<Record<string, ProductDetailPageData>>;
  readonly cartData: CartData;
  readonly checkoutData: CheckoutPageData;
  readonly expressReviewData: ExpressReviewPageData;
  readonly authModalState: ReturnType<
    typeof createInitialStorefrontState
  >["panels"]["authModal"];
  readonly minicartState: ReturnType<
    typeof createInitialStorefrontState
  >["panels"]["minicart"];
}) {
  const apiClient = useApiClient();
  const assets = resolveProfileAssets(config.profile);
  const [currentRoute, setCurrentRoute] = useState(route);
  const [currentCart, setCurrentCart] = useState(cartData);
  const [currentExpressReviewData, setCurrentExpressReviewData] =
    useState(expressReviewData);
  const [currentMinicartState, setCurrentMinicartState] =
    useState(minicartState);
  const [shellStatus, setShellStatus] = useState("Storefront ready.");
  const cartItemCount = calculateCartItemCount(currentCart);

  function openMinicart() {
    setCurrentMinicartState("open");
  }

  function closeMinicart() {
    setCurrentMinicartState("closed");
    setShellStatus("Minicart closed.");
  }

  function cartQuery(): ApiQueryParams {
    return {
      market: config.market.code,
    };
  }

  async function refreshCartBefore(trigger: CartRefreshTrigger) {
    try {
      const response = await apiClient.post<CartApiResponse>(
        "/api/cart/refresh",
        {
          trigger,
        },
        cartQuery(),
      );
      reconcileServerCart(response);
    } catch (error) {
      console.error("[paypal-retail-demo] Cart refresh failed", {
        trigger,
        error,
      });
    }
  }

  function syncCartQuantity(cartItemId: string, nextQuantity: number) {
    void apiClient
      .patch<CartApiResponse>(
        `/api/cart/items/${encodeURIComponent(cartItemId)}`,
        {
          quantity: nextQuantity,
        },
        cartQuery(),
      )
      .then((response) => {
        reconcileServerCart(response);
      })
      .catch((error: unknown) => {
        console.error("[paypal-retail-demo] Cart quantity sync failed", {
          cartItemId,
          nextQuantity,
          error,
        });
      });
  }

  function reconcileServerCart(response: CartApiResponse) {
    setCurrentCart((cart) => reconcileCartDataFromApiResponse(cart, response));
  }

  async function updateCheckoutDraft(
    request: CheckoutDraftUpdateRequest,
    currentData: CheckoutPageData,
  ): Promise<CheckoutPageData> {
    if (!request.draftId) {
      return currentData;
    }

    try {
      const response = await sendCheckoutDraftUpdate(
        apiClient,
        config,
        request,
      );
      return reconcileCheckoutDataFromDraftResponse(currentData, response);
    } catch (error) {
      console.error("[paypal-retail-demo] Checkout draft update failed", {
        error,
        request,
      });
      return currentData;
    }
  }

  async function navigateBuyer({
    pathname,
    statusMessage,
    refreshTrigger,
  }: BuyerNavigationContext) {
    const nextRoute = resolveAppRoute(pathname);

    if (nextRoute.scope !== "buyer") {
      return;
    }

    if (refreshTrigger) {
      await refreshCartBefore(refreshTrigger);
    }

    setCurrentRoute(nextRoute);
    setCurrentMinicartState("closed");
    setShellStatus(statusMessage);
    pushBuyerHistory(pathname);
  }

  function handleAddProductToCart(product: ProductDetailPageData) {
    setCurrentCart((cart) => incrementCartItemQuantity(cart, product.slug));
    setCurrentMinicartState("open");
    setShellStatus(`Added ${product.name} to cart.`);
  }

  function handleCartQuantityChange(
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) {
    setCurrentCart((cart) => setCartItemQuantity(cart, slug, nextQuantity));
    syncCartQuantity(cartItemId, nextQuantity);
  }

  async function handleDeliveryExpressStart(
    context: DeliveryExpressStartContext,
  ) {
    const paymentMethodLabel = formatDeliveryExpressMethod(context.method);

    await refreshCartBefore("express_payment_start");
    setCurrentExpressReviewData((data) => ({
      ...data,
      sourceLabel: formatDeliveryExpressSource(context.source),
      paymentMethodLabel,
    }));
    setCurrentMinicartState("closed");
    setCurrentRoute({
      scope: "buyer",
      page: "express_review",
    });
    setShellStatus(`Started ${paymentMethodLabel} delivery express.`);
  }

  return (
    <div
      className={`app-shell buyer-shell ${assets.themeClassName}`}
      data-route-scope="buyer"
      data-route-page={currentRoute.page}
      data-market={config.market.code}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <a className="site-header__brand" href="/" aria-label={assets.logoText}>
          {assets.logoText}
        </a>
        <nav className="site-header__nav" aria-label="Primary">
          <a href="/">Home</a>
          <a href="/products">All Products</a>
          <a href="/products?sort=newest">New Arrivals</a>
          <a href="/checkout">Checkout</a>
        </nav>
        <div className="site-header__actions">
          <button type="button">Sign in</button>
          <button
            type="button"
            aria-label="Open minicart"
            onClick={openMinicart}
          >
            Cart ({cartItemCount})
          </button>
        </div>
      </header>
      <main className="buyer-shell__main" id="main-content" tabIndex={-1}>
        <RouteStage
          route={currentRoute}
          homePageData={homePageData}
          categoryPageData={categoryPageData}
          productPages={productPages}
          cartData={currentCart}
          checkoutData={checkoutData}
          expressReviewData={currentExpressReviewData}
          onAddProductToCart={handleAddProductToCart}
          onCartQuantityChange={handleCartQuantityChange}
          onCheckoutDraftUpdate={updateCheckoutDraft}
          onDeliveryExpressStart={handleDeliveryExpressStart}
          onNavigate={navigateBuyer}
          renderCardPaymentBox={(context) =>
            renderCardPaymentBox({
              config,
              context,
            })
          }
          renderCheckoutPaymentAction={(context) =>
            renderCheckoutPaymentAction({
              config,
              context,
            })
          }
          renderPayLaterRowMessage={(context) =>
            renderPayLaterRowMessage({
              config,
              context,
            })
          }
        />
      </main>
      <StatusRegion id="shell-status" className="sr-only">
        {shellStatus}
      </StatusRegion>
      <AuthModalShell state={authModalState} />
      <MinicartShell
        state={currentMinicartState}
        cart={currentCart}
        onCartNavigate={() =>
          navigateBuyer({
            pathname: currentCart.cartHref,
            statusMessage: "Opened cart.",
          })
        }
        onCheckoutNavigate={() =>
          navigateBuyer({
            pathname: currentCart.checkoutHref,
            statusMessage: "Opened checkout.",
            refreshTrigger: "checkout_start",
          })
        }
        onClose={closeMinicart}
        onDeliveryExpressStart={(method) =>
          handleDeliveryExpressStart({
            method,
            source: "minicart",
          })
        }
      />
    </div>
  );
}

function RouteStage({
  route,
  homePageData,
  categoryPageData,
  productPages,
  cartData,
  checkoutData,
  expressReviewData,
  onAddProductToCart,
  onCartQuantityChange,
  onCheckoutDraftUpdate,
  onDeliveryExpressStart,
  onNavigate,
  renderCardPaymentBox,
  renderCheckoutPaymentAction,
  renderPayLaterRowMessage,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly homePageData: HomePageData;
  readonly categoryPageData: CategoryPageData;
  readonly productPages: Readonly<Record<string, ProductDetailPageData>>;
  readonly cartData: CartData;
  readonly checkoutData: CheckoutPageData;
  readonly expressReviewData: ExpressReviewPageData;
  readonly onAddProductToCart: (product: ProductDetailPageData) => void;
  readonly onCartQuantityChange: (
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) => void;
  readonly onCheckoutDraftUpdate: (
    request: CheckoutDraftUpdateRequest,
    currentData: CheckoutPageData,
  ) => Promise<CheckoutPageData>;
  readonly onDeliveryExpressStart: (
    context: DeliveryExpressStartContext,
  ) => void | Promise<void>;
  readonly onNavigate: (
    navigation: BuyerNavigationContext,
  ) => void | Promise<void>;
  readonly renderCardPaymentBox: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderCheckoutPaymentAction: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderPayLaterRowMessage: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
}) {
  if (route.page === "checkout") {
    return (
      <CheckoutPage
        data={checkoutData}
        onDraftUpdate={onCheckoutDraftUpdate}
        renderCardPaymentBox={renderCardPaymentBox}
        renderPaymentAction={renderCheckoutPaymentAction}
        renderPayLaterRowMessage={renderPayLaterRowMessage}
      />
    );
  }

  if (route.page === "express_review") {
    return <ExpressReviewPage data={expressReviewData} />;
  }

  if (route.page === "cart") {
    return (
      <CartPage
        data={cartData}
        onCheckoutNavigate={() =>
          onNavigate({
            pathname: cartData.checkoutHref,
            statusMessage: "Opened checkout.",
            refreshTrigger: "checkout_start",
          })
        }
        onDeliveryExpressStart={(method) =>
          onDeliveryExpressStart({
            method,
            source: "cart",
          })
        }
        onQuantityChange={onCartQuantityChange}
      />
    );
  }

  if (route.page === "account") {
    return (
      <section className="route-stage route-stage--account">
        <p className="route-stage__eyebrow">Account</p>
        <h1>{route.section === "orders" ? "Orders" : "Settings"}</h1>
      </section>
    );
  }

  if (route.page === "product") {
    const productPage = productPages[route.productSlug];

    return productPage ? (
      <ProductDetailPage
        data={productPage}
        onAddToCart={onAddProductToCart}
        onDeliveryExpressStart={(method) =>
          onDeliveryExpressStart({
            method,
            source: "product_detail",
          })
        }
      />
    ) : (
      <NotFoundStage />
    );
  }

  if (route.page === "catalog") {
    return <CategoryPage data={categoryPageData} />;
  }

  if (route.page === "not_found") {
    return <NotFoundStage />;
  }

  return <HomePage data={homePageData} />;
}

async function sendCheckoutDraftUpdate(
  apiClient: ApiClient,
  config: StorefrontRuntimeConfig,
  request: CheckoutDraftUpdateRequest,
): Promise<CheckoutDraftApiResponse> {
  const draftPath = `/api/checkout/drafts/${encodeURIComponent(
    request.draftId ?? "",
  )}`;
  const query = {
    market: config.market.code,
  };

  switch (request.type) {
    case "delivery_shipping_address":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/shipping-address`,
        buildAddressBody(request.fields, config, {
          cityLabel: "City",
          nameLabel: "Full name",
          postalCodeLabel: "ZIP code",
          stateLabel: "State",
          streetLabel: "Street address",
        }),
        query,
      );
    case "delivery_billing_address":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/billing-address`,
        buildBillingAddressBody(request.fields, config),
        query,
      );
    case "delivery_shipping_option":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/shipping-option`,
        {
          shipping_option_id:
            request.selectedChoiceValue ??
            slugifyCheckoutValue(request.selectedChoiceLabel ?? ""),
        },
        query,
      );
    case "pickup_location":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/pickup-location`,
        {
          country_code: config.market.code,
          county: null,
          postal_code: getSubmittedFieldValue(
            request.fields,
            "ZIP or postcode",
          ),
          state: null,
        },
        query,
      );
    case "pickup_store":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/pickup-store`,
        {
          store_id:
            request.selectedStoreId ??
            slugifyCheckoutValue(request.selectedStoreName ?? ""),
        },
        query,
      );
    case "pickup_billing_address":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/billing-address`,
        {
          address: buildAddressBody(request.fields, config, {
            cityLabel: "City",
            nameLabel: "Full name",
            postalCodeLabel: "ZIP code",
            stateLabel: "State",
            streetLabel: "Billing street address",
          }),
          same_as_shipping: false,
          save_to_address_book: true,
        },
        query,
      );
    case "pickup_date":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/pickup-date`,
        {
          pickup_date:
            request.selectedChoiceValue ??
            slugifyCheckoutValue(request.selectedChoiceLabel ?? ""),
        },
        query,
      );
  }
}

function buildBillingAddressBody(
  fields: readonly CheckoutSubmittedField[],
  config: StorefrontRuntimeConfig,
) {
  const sameAsShipping = getSubmittedBooleanFieldValue(
    fields,
    "Same as shipping",
    true,
  );

  if (sameAsShipping) {
    return {
      same_as_shipping: true,
      save_to_address_book: true,
    };
  }

  return {
    address: buildAddressBody(fields, config, {
      cityLabel: "Billing city",
      nameLabel: "Full name",
      postalCodeLabel: "Billing ZIP code",
      stateLabel: "State",
      streetLabel: "Billing street address",
    }),
    same_as_shipping: false,
    save_to_address_book: true,
  };
}

function buildAddressBody(
  fields: readonly CheckoutSubmittedField[],
  config: StorefrontRuntimeConfig,
  labels: {
    readonly nameLabel: string;
    readonly streetLabel: string;
    readonly cityLabel: string;
    readonly stateLabel: string;
    readonly postalCodeLabel: string;
  },
) {
  return {
    address_line1: getSubmittedFieldValue(fields, labels.streetLabel),
    address_line2: null,
    city: getSubmittedFieldValue(fields, labels.cityLabel),
    country_code: config.market.code,
    county: null,
    phone: null,
    postal_code: getSubmittedFieldValue(fields, labels.postalCodeLabel),
    recipient_name:
      getSubmittedFieldValue(fields, labels.nameLabel) || "Pickup buyer",
    state: getSubmittedFieldValue(fields, labels.stateLabel) || null,
  };
}

function getSubmittedFieldValue(
  fields: readonly CheckoutSubmittedField[],
  label: string,
): string {
  const value = fields.find((field) => field.label === label)?.value;
  return typeof value === "string" ? value : "";
}

function getSubmittedBooleanFieldValue(
  fields: readonly CheckoutSubmittedField[],
  label: string,
  defaultValue: boolean,
): boolean {
  const value = fields.find((field) => field.label === label)?.value;
  return typeof value === "boolean" ? value : defaultValue;
}

function slugifyCheckoutValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function renderCheckoutPaymentAction({
  config,
  context,
}: {
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
}) {
  if (
    !context.checkoutDraftId ||
    !context.selectedPaymentEligible ||
    (context.selectedPaymentMethod !== "paypal" &&
      context.selectedPaymentMethod !== "paylater" &&
      !isWalletPaymentMethod(context.selectedPaymentMethod))
  ) {
    return null;
  }
  const isPayLater = context.selectedPaymentMethod === "paylater";
  const isWallet = isWalletPaymentMethod(context.selectedPaymentMethod);

  return (
    <PayPalSdkProviderScope
      key={`${config.paypal.providerKey}:${context.fulfillmentMode}:${context.selectedPaymentMethod}`}
      providerKey={config.paypal.providerKey}
      configRequest={{
        market: config.market.code,
        pageType: "checkout",
        flow: "standard",
        method: context.selectedPaymentMethod,
      }}
    >
      {isWallet ? (
        <WalletCheckoutAction
          checkoutDraftId={context.checkoutDraftId}
          currencyCode={config.market.currencyCode}
          fulfillmentMode={context.fulfillmentMode}
          market={config.market.code}
          method={context.selectedPaymentMethod}
          storeDisplayName={config.profile.displayName}
          totalLabel={context.totalLabel}
        />
      ) : isPayLater ? (
        <PayLaterStandaloneAction
          buyerCountry={resolvePayLaterBuyerCountry(config)}
          checkoutDraftId={context.checkoutDraftId}
          currencyCode={config.market.currencyCode}
          fulfillmentMode={context.fulfillmentMode}
          market={config.market.code}
          totalLabel={context.totalLabel}
        />
      ) : (
        <PayPalStandaloneAction
          canSavePaymentMethod={context.saveForFutureEligible}
          checkoutDraftId={context.checkoutDraftId}
          fulfillmentMode={context.fulfillmentMode}
          market={config.market.code}
        />
      )}
    </PayPalSdkProviderScope>
  );
}

function isWalletPaymentMethod(
  method: CheckoutPaymentActionContext["selectedPaymentMethod"],
): method is WalletPaymentMethod {
  return (
    method === "apple_pay" || method === "google_pay" || method === "venmo"
  );
}

function renderCardPaymentBox({
  config,
  context,
}: {
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
}) {
  if (context.selectedPaymentMethod !== "card" || !context.checkoutDraftId) {
    return null;
  }

  return (
    <PayPalSdkProviderScope
      key={`${config.paypal.providerKey}:${context.fulfillmentMode}:card`}
      providerKey={config.paypal.providerKey}
      configRequest={{
        market: config.market.code,
        pageType: "checkout",
        flow: "standard",
        method: "card",
      }}
    >
      <CardFieldsCheckoutAction
        canSavePaymentMethod={context.saveForFutureEligible}
        checkoutDraftId={context.checkoutDraftId}
        fulfillmentMode={context.fulfillmentMode}
        market={config.market.code}
      />
    </PayPalSdkProviderScope>
  );
}

function renderPayLaterRowMessage({
  config,
  context,
}: {
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
}) {
  return (
    <PayPalSdkProviderScope
      key={`${config.paypal.providerKey}:${context.fulfillmentMode}:paylater-row-message`}
      providerKey={config.paypal.providerKey}
      configRequest={{
        market: config.market.code,
        pageType: "checkout",
        flow: "standard",
        method: "paylater",
      }}
    >
      <PayLaterAmountMessage
        amountLabel={context.totalLabel}
        buyerCountry={resolvePayLaterBuyerCountry(config)}
        currencyCode={config.market.currencyCode}
        placement="payment-row"
      />
    </PayPalSdkProviderScope>
  );
}

function resolvePayLaterBuyerCountry(
  config: StorefrontRuntimeConfig,
): "US" | "GB" {
  return config.market.code === "GB" ? "GB" : "US";
}

function NotFoundStage() {
  return (
    <section className="route-stage route-stage--not-found">
      <p className="route-stage__eyebrow">Not Found</p>
      <h1>Page unavailable</h1>
    </section>
  );
}

function AdminShell({
  route,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "admin" }>;
}) {
  return (
    <div
      className="app-shell admin-shell"
      data-route-scope={route.scope}
      data-route-page={route.page}
    >
      <main className="admin-shell__main">
        <section className="admin-shell__panel">
          <p className="admin-shell__eyebrow">Operations</p>
          <h1>Admin Portal</h1>
          <nav aria-label="Admin sections" className="admin-shell__nav">
            <a href="/admin/orders">Orders</a>
            <a href="/admin/inventory">Inventory</a>
            <a href="/admin/webhooks">Webhooks</a>
            <a href="/admin/lifecycle">Lifecycle</a>
          </nav>
        </section>
      </main>
    </div>
  );
}

function browserPathname(): string {
  return globalThis.location?.pathname ?? "/";
}

function pushBuyerHistory(pathname: string) {
  if (globalThis.location?.pathname !== pathname) {
    globalThis.history?.pushState(null, "", pathname);
  }
}

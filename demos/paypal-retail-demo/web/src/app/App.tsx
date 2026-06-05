import { type ReactNode } from "react";

import { AuthModalShell } from "../features/account/AuthModalShell.js";
import { CartPage } from "../features/cart/CartPage.js";
import { MinicartShell } from "../features/cart/MinicartShell.js";
import { defaultCartData, type CartData } from "../features/cart/cartModel.js";
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
  type CheckoutPaymentActionContext,
  type CheckoutPageData,
} from "../features/checkout/CheckoutPage.js";
import { CardFieldsCheckoutAction } from "../features/payments/CardFieldsCheckoutAction.js";
import { PayPalSdkProviderScope } from "../features/payments/PayPalSdkProviderScope.js";
import {
  PayLaterAmountMessage,
  PayLaterStandaloneAction,
} from "../features/payments/PayLaterStandaloneAction.js";
import { PayPalStandaloneAction } from "../features/payments/PayPalStandaloneAction.js";
import { StatusRegion } from "../components/accessibility.js";
import { AppProviders } from "../state/appProviders.js";
import {
  createInitialStorefrontState,
  defaultRuntimeConfig,
  type StorefrontRuntimeConfig,
} from "../state/storefrontState.js";
import { resolveAppRoute, type AppRoute } from "./routes.js";
import { resolveProfileAssets } from "./profileAssets.js";

export interface AppProps {
  readonly initialPathname?: string;
  readonly initialConfig?: StorefrontRuntimeConfig;
  readonly initialHomePage?: HomePageData;
  readonly initialCategoryPage?: CategoryPageData;
  readonly initialProductPages?: Readonly<
    Record<string, ProductDetailPageData>
  >;
  readonly initialCart?: CartData;
  readonly initialCheckout?: CheckoutPageData;
}

export function App({
  initialPathname,
  initialConfig,
  initialHomePage,
  initialCategoryPage,
  initialProductPages,
  initialCart,
  initialCheckout,
}: AppProps = {}) {
  const route = resolveAppRoute(initialPathname ?? browserPathname());
  const shellState = createInitialStorefrontState();
  const config = initialConfig ?? defaultRuntimeConfig();

  if (route.scope === "admin") {
    return <AdminShell route={route} />;
  }

  return (
    <AppProviders initialConfig={config}>
      <BuyerShell
        route={route}
        config={config}
        homePageData={initialHomePage ?? defaultHomePageData}
        categoryPageData={initialCategoryPage ?? defaultCategoryPageData}
        productPages={initialProductPages ?? defaultProductDetailPages}
        cartData={initialCart ?? defaultCartData}
        checkoutData={initialCheckout ?? defaultCheckoutPageData}
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
  readonly authModalState: ReturnType<
    typeof createInitialStorefrontState
  >["panels"]["authModal"];
  readonly minicartState: ReturnType<
    typeof createInitialStorefrontState
  >["panels"]["minicart"];
}) {
  const assets = resolveProfileAssets(config.profile);

  return (
    <div
      className={`app-shell buyer-shell ${assets.themeClassName}`}
      data-route-scope="buyer"
      data-route-page={route.page}
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
          <button type="button" aria-label="Open minicart">
            Cart
          </button>
        </div>
      </header>
      <main className="buyer-shell__main" id="main-content" tabIndex={-1}>
        <RouteStage
          route={route}
          homePageData={homePageData}
          categoryPageData={categoryPageData}
          productPages={productPages}
          cartData={cartData}
          checkoutData={checkoutData}
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
        Storefront ready.
      </StatusRegion>
      <AuthModalShell state={authModalState} />
      <MinicartShell state={minicartState} cart={cartData} />
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
        renderCardPaymentBox={renderCardPaymentBox}
        renderPaymentAction={renderCheckoutPaymentAction}
        renderPayLaterRowMessage={renderPayLaterRowMessage}
      />
    );
  }

  if (route.page === "cart") {
    return <CartPage data={cartData} />;
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
      <ProductDetailPage data={productPage} />
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

function renderCheckoutPaymentAction({
  config,
  context,
}: {
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
}) {
  if (
    (context.selectedPaymentMethod !== "paypal" &&
      context.selectedPaymentMethod !== "paylater") ||
    !context.checkoutDraftId
  ) {
    return null;
  }
  const isPayLater = context.selectedPaymentMethod === "paylater";

  return (
    <PayPalSdkProviderScope
      key={`${config.paypal.providerKey}:${context.fulfillmentMode}:${context.selectedPaymentMethod}`}
      providerKey={config.paypal.providerKey}
      configRequest={{
        market: config.market.code,
        pageType: "checkout",
        flow: "standard",
        method: isPayLater ? "paylater" : "paypal",
      }}
    >
      {isPayLater ? (
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
          checkoutDraftId={context.checkoutDraftId}
          fulfillmentMode={context.fulfillmentMode}
          market={config.market.code}
        />
      )}
    </PayPalSdkProviderScope>
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

import { AuthModalShell } from "../features/account/AuthModalShell.js";
import { MinicartShell } from "../features/cart/MinicartShell.js";
import { StatusRegion } from "../components/accessibility.js";
import { AppProviders, PayPalProviderBoundary } from "../state/appProviders.js";
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
}

export function App({ initialPathname, initialConfig }: AppProps = {}) {
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
        authModalState={shellState.panels.authModal}
        minicartState={shellState.panels.minicart}
      />
    </AppProviders>
  );
}

function BuyerShell({
  route,
  config,
  authModalState,
  minicartState,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly config: StorefrontRuntimeConfig;
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
        <RouteStage route={route} brandName={assets.logoText} />
        <PayPalProviderBoundary
          key={config.paypal.providerKey}
          providerKey={config.paypal.providerKey}
        >
          <PaymentActionSlot />
        </PayPalProviderBoundary>
      </main>
      <StatusRegion id="shell-status" className="sr-only">
        Storefront ready.
      </StatusRegion>
      <AuthModalShell state={authModalState} />
      <MinicartShell state={minicartState} />
    </div>
  );
}

function RouteStage({
  route,
  brandName,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly brandName: string;
}) {
  if (route.page === "checkout") {
    return (
      <section className="route-stage route-stage--checkout">
        <p className="route-stage__eyebrow">Checkout</p>
        <h1>Delivery or Pickup</h1>
      </section>
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
    return (
      <section className="route-stage route-stage--product">
        <p className="route-stage__eyebrow">Product</p>
        <h1>{route.productSlug.replaceAll("-", " ")}</h1>
      </section>
    );
  }

  if (route.page === "catalog") {
    return (
      <section className="route-stage route-stage--catalog">
        <p className="route-stage__eyebrow">Shop</p>
        <h1>All Products</h1>
      </section>
    );
  }

  if (route.page === "not_found") {
    return (
      <section className="route-stage route-stage--not-found">
        <p className="route-stage__eyebrow">Not Found</p>
        <h1>Page unavailable</h1>
      </section>
    );
  }

  return (
    <section className="route-stage route-stage--home">
      <p className="route-stage__eyebrow">New arrivals</p>
      <h1>{brandName}</h1>
      <p>Fresh collectible drops with delivery and pickup checkout.</p>
    </section>
  );
}

function PaymentActionSlot() {
  return (
    <section
      className="payment-action-slot"
      aria-label="Selected payment action"
    />
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

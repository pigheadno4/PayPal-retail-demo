import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  HeartIcon,
  MenuIcon,
  SearchIcon,
  ShoppingCartIcon,
  XIcon,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import {
  ApiClientError,
  createApiClient,
  type ApiClient,
  type ApiQueryParams,
  type ApiRequestOptions,
} from "../api/client.js";
import {
  AccountPage,
  type AccountAddressMutationInput,
  type AccountAddressView,
  type AccountOrderView,
  type AccountReviewInput,
  type AccountSavedPaymentMethodView,
  type AccountSavedPaymentStatus,
  GuestOrderLookupPage,
  type GuestOrderLookupInput,
  type GuestOrderView,
} from "../features/account/AccountPage.js";
import { AuthModalShell } from "../features/account/AuthModalShell.js";
import {
  createSupabaseBrowserAuthClient,
  type BuyerAuthClient,
  type BuyerAuthSession,
} from "../features/account/authClient.js";
import { CartPage } from "../features/cart/CartPage.js";
import { MinicartShell } from "../features/cart/MinicartShell.js";
import {
  addProductToCartQuantity,
  calculateCartItemCount,
  defaultCartData,
  reconcileCartDataFromApiResponse,
  setCartItemQuantity,
  type CartApiResponse,
  type CartData,
  type CartItem,
} from "../features/cart/cartModel.js";
import {
  CategoryPage,
  defaultCategoryPageData,
  type CategoryPageData,
  type CategoryPageProduct,
} from "../features/catalog/CategoryPage.js";
import {
  defaultHomePageData,
  HomePage,
  type HomePageCategoryCard,
  type HomePageData,
  type HomePageProductCard,
  type HomePageSeriesCard,
} from "../features/catalog/HomePage.js";
import {
  defaultProductDetailPages,
  ProductDetailPage,
  type ProductDetailPageData,
  type ProductPurchaseSelection,
} from "../features/catalog/ProductDetailPage.js";
import {
  CheckoutPage,
  defaultCheckoutPageData,
  type CheckoutDraftUpdateRequest,
  type CheckoutPaymentActionContext,
  type CheckoutPageData,
  type CheckoutSubmittedField,
  type CheckoutSummaryItem,
} from "../features/checkout/CheckoutPage.js";
import {
  reconcileCheckoutDataFromDraftResponse,
  type CheckoutDraftApiResponse,
} from "../features/checkout/checkoutDraftApi.js";
import {
  defaultExpressReviewPageData,
  ExpressReviewPage,
  type ExpressReviewAccountLinkPrompt,
  type ExpressReviewCaptureState,
  type ExpressReviewPageData,
} from "../features/checkout/ExpressReviewPage.js";
import {
  mapExpressReviewDataFromApiResponse,
  type ExpressReviewApiResponse,
} from "../features/checkout/expressReviewApi.js";
import {
  CardFieldsCheckoutAction,
  type CardFieldsApprovedContext,
} from "../features/payments/CardFieldsCheckoutAction.js";
import {
  DeliveryExpressAction,
  type DeliveryExpressApprovedContext,
  type DeliveryExpressCreateOrderCartContext,
} from "../features/payments/DeliveryExpressAction.js";
import { PayPalSdkProviderScope } from "../features/payments/PayPalSdkProviderScope.js";
import {
  PayLaterAmountMessage,
  PayLaterStandaloneAction,
  type PayLaterStandaloneApprovedContext,
  type PayLaterAmountMessageProps,
} from "../features/payments/PayLaterStandaloneAction.js";
import {
  PayPalStandaloneAction,
  type PayPalStandaloneApprovedContext,
} from "../features/payments/PayPalStandaloneAction.js";
import {
  formatDeliveryExpressMethod,
  formatDeliveryExpressSource,
  type DeliveryExpressPaymentMethod,
  type DeliveryExpressSource,
} from "../features/payments/deliveryExpress.js";
import {
  WalletCheckoutAction,
  type WalletPaymentMethod,
} from "../features/payments/WalletCheckoutAction.js";
import { StatusRegion } from "../components/accessibility.js";
import { Avatar, AvatarFallback } from "../components/ui/avatar.js";
import { Button } from "../components/ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card.js";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "../components/ui/field.js";
import { Input } from "../components/ui/input.js";
import { AppProviders, useApiClient } from "../state/appProviders.js";
import {
  createInitialStorefrontState,
  defaultRuntimeConfig,
  type StorefrontRuntimeConfig,
} from "../state/storefrontState.js";
import { resolveAppRoute, type AppRoute } from "./routes.js";
import {
  resolveProfileAssets,
  type StorefrontBrandMode,
} from "./profileAssets.js";

export interface AppProps {
  readonly apiClient?: ApiClient | undefined;
  readonly authClient?: BuyerAuthClient | undefined;
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

type ExpressReviewLookup = {
  readonly paypal_order_id?: string;
  readonly payment_session_id?: string;
};

const productImagePlaceholderPath = "/assets/generic/products/placeholder.svg";
const emptyProductPages: Readonly<Record<string, ProductDetailPageData>> = {};
const buyerCategoryNavLinks = [
  { href: "/products?sort=newest", label: "NEW" },
  { href: "/products", label: "COLLECTIONS" },
  { href: "/products?release_status=not-released", label: "PRE-ORDERS" },
  { href: "/products?category=blind-boxes", label: "BLIND BOXES" },
  { href: "/products?category=vinyl-figures", label: "FIGURES" },
  { href: "/products?category=accessories", label: "ACCESSORIES" },
  { href: "/products", label: "BRANDS" },
  { href: "/products?sort=price_asc", label: "SALE", tone: "sale" },
  { href: "#site-footer-title", label: "ABOUT" },
] as const;

const buyerMobileSupportLinks = [
  { href: "/account", label: "Help" },
  { href: "/guest-orders", label: "Track order" },
  { href: "/guest-orders", label: "Order recovery" },
] as const;

const adminSessionStorageKey = "paypal-retail-demo:admin-session";
const adminProfileOptions = [
  {
    id: "19495d9a-4c42-547d-8248-f6d0cbd46e62",
    slug: "popmart",
    label: "POP MART Demo",
  },
  {
    id: "effee182-44b2-5da7-8630-b642949e8aed",
    slug: "generic",
    label: "MochiToy Studio",
  },
] as const;
const adminMarketOptions = [
  {
    id: "ba91eb13-b022-5e59-957f-bf345ea4f708",
    code: "US",
    label: "United States / USD",
  },
  {
    id: "d9a34eb4-f3b0-5531-b53a-65825d600c41",
    code: "GB",
    label: "United Kingdom / GBP",
  },
] as const;

interface AdminSessionInfo {
  readonly session_id: string;
  readonly expires_at: string;
}

interface AdminLoginResponse {
  readonly status: string;
  readonly token: string;
  readonly session: AdminSessionInfo;
}

interface AdminStateResponse {
  readonly authenticated: boolean;
  readonly session?: AdminSessionInfo;
}

interface AdminStorefrontConfigResponse {
  readonly profile: {
    readonly slug: string;
    readonly display_name: string;
    readonly brand_mode: StorefrontBrandMode;
  };
  readonly market: {
    readonly code: string;
    readonly currency_code: string;
    readonly locale: string;
  };
  readonly paypal?: {
    readonly provider_key?: string;
  };
}

type AdminOrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "preparing_pickup"
  | "ready_for_pickup"
  | "picked_up"
  | "cancelled";

interface AdminOrderSummaryResponse {
  readonly id: string;
  readonly profile_id: string;
  readonly market_id: string;
  readonly order_number: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly status: AdminOrderStatus;
  readonly payment_status: string;
  readonly currency_code: string;
  readonly total_minor: number;
  readonly placed_at: string;
  readonly updated_at: string;
  readonly next_statuses: readonly AdminOrderStatus[];
}

interface AdminOrderListResponse {
  readonly orders?: readonly AdminOrderSummaryResponse[];
}

interface AdminOrderDetailResponse {
  readonly order: AdminOrderSummaryResponse & {
    readonly totals: {
      readonly subtotal_minor: number;
      readonly discount_minor: number;
      readonly tax_minor: number;
      readonly shipping_minor: number;
      readonly total_minor: number;
    };
    readonly items: readonly {
      readonly id: string;
      readonly product_sku: string;
      readonly product_name: string;
      readonly product_url: string | null;
      readonly product_image_url: string | null;
      readonly unit_price_minor: number;
      readonly quantity: number;
      readonly fulfillable_quantity: number;
      readonly unavailable_quantity: number;
      readonly line_subtotal_minor: number;
      readonly line_discount_minor: number;
      readonly line_tax_minor: number;
      readonly line_total_minor: number;
    }[];
    readonly addresses: readonly {
      readonly id: string;
      readonly address_type: "shipping" | "billing" | "pickup_store";
      readonly recipient_name: string;
      readonly phone: string | null;
      readonly address_line1: string;
      readonly address_line2: string | null;
      readonly city: string;
      readonly state: string | null;
      readonly postal_code: string;
      readonly country_code: string;
    }[];
    readonly timeline: readonly {
      readonly id: string;
      readonly from_status: AdminOrderStatus | null;
      readonly to_status: AdminOrderStatus;
      readonly actor_type: "system" | "admin" | "webhook";
      readonly note: string | null;
      readonly created_at: string;
    }[];
    readonly payment_sessions?: readonly {
      readonly id: string;
      readonly provider: "paypal";
      readonly method: string;
      readonly status: string;
      readonly attempt_number: number;
      readonly paypal_order_id: string | null;
      readonly paypal_capture_id: string | null;
      readonly paypal_invoice_id: string | null;
      readonly paypal_request_id: string | null;
      readonly merchant_total_minor: number;
      readonly provider_total_minor: number | null;
      readonly amount_consistency_status: string;
      readonly currency_code: string;
      readonly created_at: string;
      readonly updated_at: string;
    }[];
    readonly total_snapshots?: readonly {
      readonly id: string;
      readonly payment_session_id: string | null;
      readonly calculation_stage: string;
      readonly currency_code: string;
      readonly merchandise_subtotal_minor: number;
      readonly product_discount_minor: number;
      readonly promo_discount_minor: number;
      readonly taxable_subtotal_minor: number;
      readonly tax_minor: number;
      readonly shipping_minor: number;
      readonly total_minor: number;
      readonly promo_evaluation_id: string | null;
      readonly created_at: string;
    }[];
    readonly paypal_snapshots?: readonly {
      readonly id: string;
      readonly payment_session_id: string;
      readonly paypal_invoice_id: string | null;
      readonly paypal_request_id: string | null;
      readonly created_at: string;
    }[];
    readonly promo_evaluations?: readonly {
      readonly id: string;
      readonly merchandise_discount_minor: number;
      readonly taxable_subtotal_minor: number;
      readonly final_total_minor: number;
      readonly created_at: string;
    }[];
    readonly promo_evaluation_lines?: readonly {
      readonly id: string;
      readonly promo_evaluation_id: string;
      readonly code_snapshot: string;
      readonly evaluation_status: string;
      readonly rejection_reason: string | null;
      readonly discount_minor: number;
      readonly explanation: string | null;
    }[];
    readonly inventory_effects?: readonly {
      readonly order_item_id: string;
      readonly product_sku: string;
      readonly product_name: string;
      readonly fulfillment_mode: "delivery" | "pickup";
      readonly requested_quantity: number;
      readonly fulfillable_quantity: number;
      readonly unavailable_quantity: number;
    }[];
    readonly linked_webhooks?: readonly {
      readonly id: string;
      readonly event_id: string;
      readonly event_type: string;
      readonly verification_status: string;
      readonly processing_status: string;
      readonly received_at: string;
      readonly processed_at: string | null;
    }[];
  };
}

interface AdminInventoryItemResponse {
  readonly id: string;
  readonly inventory_type: "central" | "store";
  readonly profile_id: string;
  readonly market_id: string;
  readonly store_id?: string;
  readonly store_name?: string;
  readonly product_id: string;
  readonly product_sku: string;
  readonly product_name: string;
  readonly available_quantity: number;
  readonly updated_at: string;
}

interface AdminInventoryListResponse {
  readonly inventory?: readonly AdminInventoryItemResponse[];
}

interface AdminInventoryUpdateResponse {
  readonly inventory: AdminInventoryItemResponse;
}

interface AdminPickupDateResponse {
  readonly id: string;
  readonly market_id: string;
  readonly store_id: string;
  readonly store_name: string;
  readonly pickup_date: string;
  readonly capacity: number;
  readonly is_available: boolean;
  readonly updated_at: string;
}

interface AdminPickupDateListResponse {
  readonly pickup_dates?: readonly AdminPickupDateResponse[];
}

interface AdminPickupDateUpdateResponse {
  readonly pickup_date: AdminPickupDateResponse;
}

interface AdminWebhookEventResponse {
  readonly id: string;
  readonly event_id: string;
  readonly event_type: string;
  readonly verification_status: string;
  readonly linked_order_id: string | null;
  readonly linked_payment_session_id: string | null;
  readonly processing_status: string;
  readonly received_at: string;
  readonly processed_at: string | null;
}

interface AdminWebhookListResponse {
  readonly webhooks?: readonly AdminWebhookEventResponse[];
}

interface AdminPaymentDebugTotalSnapshotResponse {
  readonly id: string;
  readonly order_id: string | null;
  readonly payment_session_id: string | null;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly calculation_stage: string;
  readonly currency_code: string;
  readonly merchandise_subtotal_minor: number;
  readonly product_discount_minor: number;
  readonly promo_discount_minor: number;
  readonly taxable_subtotal_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
  readonly promo_evaluation_id: string | null;
  readonly created_at: string;
}

interface AdminPaymentDebugPayPalSnapshotResponse {
  readonly id: string;
  readonly payment_session_id: string;
  readonly paypal_invoice_id: string | null;
  readonly paypal_request_id: string | null;
  readonly request_json: unknown;
  readonly response_json: unknown;
  readonly merchant_snapshot_json: unknown;
  readonly created_at: string;
}

interface AdminPaymentDebugSessionResponse {
  readonly id: string;
  readonly order_id: string | null;
  readonly order: AdminOrderSummaryResponse | null;
  readonly provider: string;
  readonly method: string;
  readonly status: string;
  readonly attempt_number: number;
  readonly paypal_order_id: string | null;
  readonly paypal_capture_id: string | null;
  readonly paypal_invoice_id: string | null;
  readonly paypal_request_id: string | null;
  readonly vault_requested: boolean;
  readonly merchant_total_minor: number;
  readonly provider_total_minor: number | null;
  readonly amount_consistency_status: string;
  readonly currency_code: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly total_snapshots: readonly AdminPaymentDebugTotalSnapshotResponse[];
  readonly paypal_snapshots: readonly AdminPaymentDebugPayPalSnapshotResponse[];
  readonly linked_webhooks: readonly AdminWebhookEventResponse[];
}

interface AdminPaymentDebugListResponse {
  readonly payment_sessions?: readonly AdminPaymentDebugSessionResponse[];
}

type AdminRuntimeDebugLogContext =
  | null
  | boolean
  | number
  | string
  | readonly AdminRuntimeDebugLogContext[]
  | { readonly [key: string]: AdminRuntimeDebugLogContext };

interface AdminRuntimeDebugLogResponse {
  readonly timestamp: string;
  readonly level: string;
  readonly message: string;
  readonly debug_id: string | null;
  readonly source: string | null;
  readonly request_path: string | null;
  readonly context: AdminRuntimeDebugLogContext;
}

interface AdminRuntimeDebugLogListResponse {
  readonly debug_logs?: readonly AdminRuntimeDebugLogResponse[];
}

const adminRuntimeDebugElevatedContextKeys = new Set([
  "debug_id",
  "debugId",
  "source",
  "path",
  "request_path",
  "route",
]);

const buyerFooterColumns = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/products?sort=newest", label: "New arrivals" },
      { href: "/cart", label: "Cart" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/guest-orders", label: "Track order" },
      { href: "/checkout", label: "Delivery and pickup" },
      { href: "/account", label: "Account" },
    ],
  },
] as const;

const buyerFooterPaymentMarks = [
  {
    label: "PayPal",
    src: "/assets/paypal-logos/paypal-rebrand-default.svg",
  },
  {
    label: "Pay Later",
    src: "/assets/paypal-logos/paylater-rebrand-mark.svg",
  },
  {
    label: "Visa",
    src: "/assets/paypal-logos/visa.svg",
  },
  {
    label: "Mastercard",
    src: "/assets/paypal-logos/mastercard.svg",
  },
  {
    label: "Apple Pay",
    src: "/assets/paypal-logos/applepay-default.svg",
  },
  {
    label: "Venmo",
    src: "/assets/paypal-logos/venmo-rebrand-default.svg",
  },
] as const;

function createPendingHomePageData(): HomePageData {
  return {
    ...defaultHomePageData,
    loading: true,
    hero: {
      eyebrow: "Loading",
      title: "Preparing collectible drops",
      subtitle: "Live product imagery and availability are loading.",
      imagePath: productImagePlaceholderPath,
      imageAlt: "",
      primaryCta: defaultHomePageData.hero.primaryCta,
      secondaryCta: defaultHomePageData.hero.secondaryCta,
    },
    hotSales: [],
    categories: [],
    calendar: {
      ...defaultHomePageData.calendar,
      selectedProducts: [],
    },
    popularSeries: [],
  };
}

function createPendingCategoryPageData(): CategoryPageData {
  return {
    ...defaultCategoryPageData,
    resultCountLabel: "Loading products",
    appliedFilterCount: 0,
    products: [],
  };
}

function createPendingCartData(config: StorefrontRuntimeConfig): CartData {
  return {
    title: "Shopping cart",
    checkoutHref: "/checkout",
    cartHref: "/cart",
    currencyCode: config.market.currencyCode,
    locale: config.market.locale,
    pickupHint: "Prefer pickup? Choose store pickup during checkout.",
    items: [],
  };
}

function createUnavailableExpressReviewData(
  config: StorefrontRuntimeConfig,
  lookup: ExpressReviewLookup,
): ExpressReviewPageData {
  const zeroAmountLabel = formatMinorMoney(
    0,
    config.market.currencyCode,
    config.market.locale,
  );

  return {
    sourceLabel: "Delivery express review unavailable",
    merchantOrderNumber: "Unavailable",
    paypalOrderId:
      lookup.paypal_order_id ?? lookup.payment_session_id ?? "Unavailable",
    paymentMethodLabel: "PayPal",
    statusLabel: "Snapshot unavailable",
    shippingAddress: {
      name: "PayPal buyer",
      line1: "Review snapshot could not be loaded",
      line2: "",
      country: config.market.code,
    },
    shippingOption: {
      label: "Unavailable",
      detail: "Reload the review page or restart the PayPal flow.",
      amountLabel: zeroAmountLabel,
    },
    items: [],
    totals: [
      {
        label: "Merchandise subtotal",
        amountLabel: zeroAmountLabel,
      },
      {
        label: "Shipping",
        amountLabel: zeroAmountLabel,
      },
      {
        label: "Promo",
        amountLabel: zeroAmountLabel,
      },
      {
        label: "Tax",
        amountLabel: zeroAmountLabel,
      },
      {
        label: "Total",
        amountLabel: zeroAmountLabel,
        emphasis: true,
      },
    ],
    amountGuard: {
      status: "blocked",
      label: "Express review unavailable",
      body: "The synchronized PayPal review snapshot must load before capture.",
    },
  };
}

interface BuyerNavigationContext {
  readonly pathname: string;
  readonly statusMessage: string;
  readonly refreshTrigger?: CartRefreshTrigger;
}

interface StorefrontPayLaterMessageContext {
  readonly amountLabel?: string;
  readonly fallbackMessage: string;
  readonly placement: PayLaterAmountMessageProps["placement"];
}

type CartRefreshTrigger = "checkout_start" | "express_payment_start";

type CheckoutApprovedPaymentContext =
  | PayPalStandaloneApprovedContext
  | PayLaterStandaloneApprovedContext
  | CardFieldsApprovedContext;

interface CaptureOrderApiResponse {
  readonly order_number: string;
  readonly payment_session_id: string;
  readonly paypal_order_id: string;
  readonly paypal_capture_id: string;
  readonly paypal_order_status: string;
  readonly paypal_capture_status: string;
  readonly paypal_request_id: string;
  readonly amount_guard: unknown;
}

interface AuthEmailLookupApiResponse {
  readonly email: string;
  readonly status: "existing" | "new";
}

interface AccountGuestOrderLinkApiResponse {
  readonly linked_order_count: number;
}

interface AccountSavedPaymentApiItem {
  readonly id: string;
  readonly method_type: string;
  readonly status: string;
  readonly brand: string | null;
  readonly expiry_month: number | null;
  readonly expiry_year: number | null;
  readonly label: string | null;
  readonly last4: string | null;
}

interface AccountSavedPaymentsApiResponse {
  readonly saved_payments: readonly AccountSavedPaymentApiItem[];
}

interface AccountAddressApiItem {
  readonly id: string;
  readonly label: string | null;
  readonly recipient_name: string;
  readonly phone: string | null;
  readonly address_line1: string;
  readonly address_line2: string | null;
  readonly city: string;
  readonly state: string | null;
  readonly postal_code: string;
  readonly country_code: string;
  readonly is_default_shipping: boolean;
  readonly is_default_billing: boolean;
}

interface AccountAddressesApiResponse {
  readonly addresses: readonly AccountAddressApiItem[];
}

interface AccountOrderApiTotals {
  readonly subtotal_minor: number;
  readonly discount_minor: number;
  readonly tax_minor: number;
  readonly shipping_minor: number;
  readonly total_minor: number;
}

interface AccountOrderApiItem {
  readonly order_number: string;
  readonly placed_at: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly status: string;
  readonly payment_status: string;
  readonly currency_code: string;
  readonly review_eligible: boolean;
  readonly fulfillment_label: string;
  readonly totals: AccountOrderApiTotals;
  readonly items: readonly {
    readonly id: string;
    readonly product_name: string;
    readonly product_url: string | null;
    readonly product_image_url: string | null;
    readonly unit_price_minor: number;
    readonly quantity: number;
    readonly line_total_minor: number;
    readonly review_eligible: boolean;
    readonly review_submitted: boolean;
    readonly review: {
      readonly rating: number;
      readonly title: string | null;
      readonly body: string | null;
    } | null;
  }[];
  readonly timeline: readonly {
    readonly label: string;
    readonly description: string;
    readonly status: "complete" | "current" | "pending";
    readonly occurred_at: string | null;
  }[];
}

interface AccountOrdersApiResponse {
  readonly orders: readonly AccountOrderApiItem[];
}

interface AccountOrderApiResponse {
  readonly order: AccountOrderApiItem;
}

interface GuestOrderApiItem {
  readonly order_number: string;
  readonly fulfillment_mode: "delivery" | "pickup";
  readonly status: string;
  readonly payment_status: string;
  readonly currency_code: string;
  readonly review_eligible: boolean;
  readonly totals: AccountOrderApiTotals;
  readonly items: readonly {
    readonly product_sku?: string;
    readonly product_name: string;
    readonly product_url?: string | null;
    readonly product_image_url?: string | null;
    readonly unit_price_minor?: number;
    readonly quantity: number;
    readonly fulfillable_quantity?: number;
    readonly unavailable_quantity?: number;
    readonly line_subtotal_minor?: number;
    readonly line_discount_minor?: number;
    readonly line_tax_minor?: number;
    readonly line_total_minor: number;
  }[];
  readonly addresses: readonly {
    readonly address_type: string;
    readonly recipient_name?: string | null;
    readonly city: string;
    readonly state?: string | null;
    readonly postal_code?: string | null;
    readonly country_code: string;
  }[];
}

interface GuestOrderApiResponse {
  readonly order: GuestOrderApiItem;
}

interface CatalogProductApiItem {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly category_slug: string;
  readonly image_path: string | null;
  readonly release_status: "coming_soon" | "released" | "unreleased" | string;
  readonly purchasable: boolean;
  readonly checkout_block_reason?: string | null;
  readonly price: {
    readonly currency_code: string;
    readonly regular_price_minor: number;
    readonly current_price_minor: number;
  };
  readonly inventory: {
    readonly delivery_available: boolean;
    readonly pickup_available: boolean;
  };
}

interface CatalogProductsApiResponse {
  readonly products: readonly CatalogProductApiItem[];
}

interface CatalogProductDetailApiResponse {
  readonly product: CatalogProductApiItem & {
    readonly sku: string;
    readonly series_name: string;
    readonly description: string;
    readonly max_quantity_per_order: number;
    readonly images: readonly {
      readonly image_path: string;
      readonly alt_text: string | null;
      readonly low_resolution_image_path?: string | null;
      readonly high_resolution_image_path?: string | null;
    }[];
    readonly reviews: {
      readonly visible: boolean;
      readonly items: readonly {
        readonly id?: string | null;
        readonly author_name?: string | null;
        readonly rating?: number | null;
        readonly title?: string | null;
        readonly body?: string | null;
        readonly created_at?: string | null;
      }[];
    };
  };
}

export function App({
  apiClient,
  authClient,
  initialPathname,
  initialConfig,
  initialHomePage,
  initialCategoryPage,
  initialProductPages,
  initialCart,
  initialCheckout,
  initialExpressReview,
}: AppProps = {}) {
  const initialLocation = initialPathname ?? browserPathname();
  const route = resolveAppRoute(initialLocation);
  const shellState = createInitialStorefrontState();
  const config = initialConfig ?? defaultRuntimeConfig();
  const resolvedApiClient = useMemo(
    () => apiClient ?? createApiClient(),
    [apiClient],
  );
  const pendingCartData = createPendingCartData(config);
  const resolvedAuthClient = useMemo(
    () => authClient ?? createSupabaseBrowserAuthClient(),
    [authClient],
  );

  if (route.scope === "admin") {
    return (
      <AppProviders initialConfig={config} apiClient={resolvedApiClient}>
        <AdminShellGate
          route={route}
          apiClient={resolvedApiClient}
          initialConfig={config}
        />
      </AppProviders>
    );
  }

  return (
    <AppProviders initialConfig={config} apiClient={resolvedApiClient}>
      <BuyerShell
        route={route}
        initialLocation={initialLocation}
        config={config}
        homePageData={initialHomePage ?? createPendingHomePageData()}
        homeFallbackData={initialHomePage ?? defaultHomePageData}
        categoryPageData={
          initialCategoryPage ?? createPendingCategoryPageData()
        }
        categoryFallbackData={initialCategoryPage ?? defaultCategoryPageData}
        productPages={initialProductPages ?? emptyProductPages}
        cartData={initialCart ?? pendingCartData}
        starterCartData={initialCart ?? defaultCartData}
        checkoutData={
          initialCheckout ??
          reconcileCheckoutDataFromCart(
            defaultCheckoutPageData,
            pendingCartData,
          )
        }
        expressReviewData={initialExpressReview ?? defaultExpressReviewPageData}
        authClient={resolvedAuthClient}
        authModalState={shellState.panels.authModal}
        minicartState={shellState.panels.minicart}
      />
    </AppProviders>
  );
}

function AdminShellGate({
  route,
  apiClient,
  initialConfig,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "admin" }>;
  readonly apiClient: ApiClient;
  readonly initialConfig: StorefrontRuntimeConfig;
}) {
  const [adminPasscode, setAdminPasscode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authState, setAuthState] = useState<{
    readonly stage: "idle" | "verifying" | "unlocked";
    readonly token: string | null;
    readonly session: AdminSessionInfo | null;
    readonly error: string | null;
  }>(() => {
    const storedToken = readAdminSessionTokenFromStorage();

    return {
      stage: storedToken ? "verifying" : "idle",
      token: storedToken,
      session: null,
      error: null,
    };
  });

  useEffect(() => {
    if (!authState.token) {
      setAuthState((current) => ({
        ...current,
        stage: "idle",
        session: null,
      }));
      return;
    }

    let isActive = true;
    const token = authState.token;

    const verify = async () => {
      setAuthState((current) => ({
        ...current,
        stage: "verifying",
        error: null,
      }));

      try {
        const response = await apiClient.get<AdminStateResponse>(
          "/api/admin/state",
          undefined,
          {
            headers: {
              "x-admin-session": token,
            },
          },
        );

        if (!isActive) {
          return;
        }

        if (response.authenticated && response.session) {
          setAdminSessionTokenInStorage(token);
          setAuthState({
            stage: "unlocked",
            token,
            session: response.session,
            error: null,
          });
          return;
        }

        setAdminSessionTokenInStorage(null);
        setAuthState((current) => ({
          ...current,
          stage: "idle",
          token: null,
          session: null,
          error: "Session expired. Please sign in again.",
        }));
      } catch {
        if (!isActive) {
          return;
        }

        setAdminSessionTokenInStorage(null);
        setAuthState((current) => ({
          ...current,
          stage: "idle",
          token: null,
          session: null,
          error: "Unable to verify the admin session. Please sign in.",
        }));
      }
    };

    void verify();

    return () => {
      isActive = false;
    };
  }, [apiClient, authState.token]);

  const handleAdminLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedPasscode = adminPasscode.trim();

    if (!normalizedPasscode) {
      setAuthState((current) => ({
        ...current,
        error: "Passcode is required.",
      }));
      return;
    }

    setIsSubmitting(true);
    setAuthState((current) => ({
      ...current,
      error: null,
    }));

    try {
      const response = await apiClient.post<AdminLoginResponse>(
        "/api/admin/login",
        {
          passcode: normalizedPasscode,
        },
      );

      setAdminSessionTokenInStorage(response.token);
      setAdminPasscode("");
      setAuthState({
        stage: "unlocked",
        token: response.token,
        session: response.session,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : "Admin sign-in failed. Please try again.";

      setAdminSessionTokenInStorage(null);
      setAuthState((current) => ({
        ...current,
        stage: "idle",
        token: null,
        session: null,
        error: errorMessage,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminLogout = async () => {
    setIsSubmitting(true);

    if (authState.token) {
      try {
        await apiClient.post("/api/admin/logout", undefined, undefined, {
          headers: {
            "x-admin-session": authState.token,
          },
        });
      } catch {
        // Local logout is still deterministic even if server logout fails.
      }
    }

    setAdminSessionTokenInStorage(null);
    setAuthState({
      stage: "idle",
      token: null,
      session: null,
      error: null,
    });
    setIsSubmitting(false);
  };

  if (authState.stage === "verifying") {
    return (
      <div
        className="app-shell admin-shell"
        data-route-scope={route.scope}
        data-route-page={route.page}
      >
        <main className="admin-shell__main">
          <section className="admin-shell__panel">
            <p className="admin-shell__eyebrow">Admin Access</p>
            <h1>Verifying admin session</h1>
            <p>Checking admin passcode session.</p>
          </section>
        </main>
      </div>
    );
  }

  if (authState.stage === "unlocked" && authState.token) {
    return (
      <AdminShell
        route={route}
        apiClient={apiClient}
        token={authState.token}
        initialConfig={initialConfig}
        session={authState.session}
        onLogout={handleAdminLogout}
        isLoggingOut={isSubmitting}
      />
    );
  }

  return (
    <div
      className="app-shell admin-shell"
      data-route-scope={route.scope}
      data-route-page={route.page}
      data-admin-auth-state="locked"
    >
      <main className="admin-shell__main">
        <section className="admin-shell__panel">
          <p className="admin-shell__eyebrow">Admin Access</p>
          <h1>Protected Portal</h1>
          <form onSubmit={handleAdminLogin} className="admin-shell__panel-form">
            <label htmlFor="admin-passcode" className="admin-shell__label">
              Admin passcode
            </label>
            <input
              id="admin-passcode"
              name="admin-passcode"
              type="password"
              value={adminPasscode}
              onChange={(event) => setAdminPasscode(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={isSubmitting}>
              Open Admin Portal
            </button>
            {authState.error ? (
              <p role="alert" className="admin-shell__feedback">
                {authState.error}
              </p>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}

function BuyerShell({
  route,
  initialLocation,
  config,
  homePageData,
  homeFallbackData,
  categoryPageData,
  categoryFallbackData,
  productPages,
  cartData,
  starterCartData,
  checkoutData,
  expressReviewData,
  authClient,
  authModalState,
  minicartState,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly initialLocation: string;
  readonly config: StorefrontRuntimeConfig;
  readonly homePageData: HomePageData;
  readonly homeFallbackData: HomePageData;
  readonly categoryPageData: CategoryPageData;
  readonly categoryFallbackData: CategoryPageData;
  readonly productPages: Readonly<Record<string, ProductDetailPageData>>;
  readonly cartData: CartData;
  readonly starterCartData: CartData;
  readonly checkoutData: CheckoutPageData;
  readonly expressReviewData: ExpressReviewPageData;
  readonly authClient: BuyerAuthClient;
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
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [currentCart, setCurrentCart] = useState(cartData);
  const [currentHomePageData, setCurrentHomePageData] = useState(homePageData);
  const [currentCategoryPageData, setCurrentCategoryPageData] =
    useState(categoryPageData);
  const [currentProductPages, setCurrentProductPages] = useState(productPages);
  const [missingProductSlugs, setMissingProductSlugs] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [currentCheckoutData, setCurrentCheckoutData] = useState(checkoutData);
  const [currentExpressReviewData, setCurrentExpressReviewData] =
    useState(expressReviewData);
  const [currentExpressCaptureState, setCurrentExpressCaptureState] =
    useState<ExpressReviewCaptureState>({ status: "idle" });
  const [guestOrderLinkStatus, setGuestOrderLinkStatus] =
    useState<ExpressReviewAccountLinkPrompt["status"]>("idle");
  const [linkedGuestOrderCount, setLinkedGuestOrderCount] = useState(0);
  const [currentMinicartState, setCurrentMinicartState] =
    useState(minicartState);
  const [currentAuthModalState, setCurrentAuthModalState] =
    useState(authModalState);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState(
    () =>
      getCatalogQueryValue(getSearchParamsFromLocation(initialLocation), "q") ??
      "",
  );
  const [authModalStatus, setAuthModalStatus] = useState<string | undefined>();
  const [currentAuthSession, setCurrentAuthSession] = useState<
    BuyerAuthSession | null | undefined
  >(undefined);
  const [savedPayments, setSavedPayments] = useState<
    readonly AccountSavedPaymentMethodView[]
  >([]);
  const [savedPaymentsStatus, setSavedPaymentsStatus] = useState<
    "error" | "idle" | "loading" | "ready"
  >("idle");
  const [accountAddresses, setAccountAddresses] = useState<
    readonly AccountAddressView[]
  >([]);
  const [accountAddressesStatus, setAccountAddressesStatus] = useState<
    "error" | "idle" | "loading" | "ready"
  >("idle");
  const [accountOrders, setAccountOrders] = useState<
    readonly AccountOrderView[]
  >([]);
  const [accountOrdersStatus, setAccountOrdersStatus] = useState<
    "empty" | "error" | "loading" | "ready"
  >("empty");
  const [guestOrder, setGuestOrder] = useState<GuestOrderView | null>(null);
  const [guestOrderStatus, setGuestOrderStatus] = useState<
    "error" | "idle" | "loading" | "ready"
  >("idle");
  const [guestOrderError, setGuestOrderError] = useState<string | null>(null);
  const didRunInitialCartRestore = useRef(false);
  const [shellStatus, setShellStatus] = useState("Storefront ready.");
  const cartItemCount = calculateCartItemCount(currentCart);

  useEffect(() => {
    setHeaderSearchQuery(
      getCatalogQueryValue(getSearchParamsFromLocation(currentLocation), "q") ??
        "",
    );
  }, [currentLocation]);

  useEffect(() => {
    let active = true;

    void authClient
      .getSession()
      .then((session) => {
        if (!active) {
          return;
        }

        setCurrentAuthSession(session);
        if (session) {
          setShellStatus("Restored signed-in session.");
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        console.error("[paypal-retail-demo] Auth session restore failed", {
          error,
        });
        setCurrentAuthSession(null);
      });

    return () => {
      active = false;
    };
  }, [authClient]);

  useEffect(() => {
    if (currentAuthSession === undefined || didRunInitialCartRestore.current) {
      return;
    }

    didRunInitialCartRestore.current = true;
    const storedBinding = readStoredCartBinding(config);
    let active = true;
    const requestOptions = buildCartRequestOptions(
      storedBinding ?? {},
      currentAuthSession,
    );
    const cartRequest = currentAuthSession
      ? apiClient.post<CartApiResponse>(
          "/api/cart/merge",
          {},
          {
            market: config.market.code,
          },
          requestOptions,
        )
      : apiClient.get<CartApiResponse>(
          "/api/cart",
          {
            market: config.market.code,
          },
          requestOptions,
        );

    void cartRequest
      .then(async (response) => {
        if (!active) {
          return;
        }
        const starterCart = applyStarterCartProductIds(starterCartData);
        const reconciledCart = reconcileCartDataForStorefront(
          {
            ...starterCart,
            ...(storedBinding ?? {}),
          },
          response,
          starterCart,
        );

        if (
          !currentAuthSession &&
          storedBinding &&
          !hasServerReadyCartBinding(reconciledCart)
        ) {
          clearStoredCartBinding(config);
          const freshResponse = await apiClient.get<CartApiResponse>(
            "/api/cart",
            {
              market: config.market.code,
            },
          );

          if (!active) {
            return;
          }

          const freshCart = reconcileCartDataForStorefront(
            starterCart,
            freshResponse,
            starterCart,
          );
          syncStoredCartBinding(config, freshCart);
          setCurrentCart(freshCart);
          setCurrentCheckoutData((data) =>
            reconcileCheckoutDataFromCart(data, freshCart),
          );
          setShellStatus("Prepared guest cart.");
          return;
        }

        syncStoredCartBinding(config, reconciledCart);

        if (
          !currentAuthSession &&
          !storedBinding &&
          shouldSeedStarterCart(starterCart, response, reconciledCart)
        ) {
          const seededCart = await seedStarterCart({
            apiClient,
            config,
            serverCart: reconciledCart,
            starterCart,
          });

          if (!active) {
            return;
          }

          setCurrentCart(seededCart);
          setCurrentCheckoutData((data) =>
            reconcileCheckoutDataFromCart(data, seededCart),
          );
          syncStoredCartBinding(config, seededCart);
          setShellStatus("Prepared guest cart.");
          return;
        }

        setCurrentCart(reconciledCart);
        setCurrentCheckoutData((data) =>
          reconcileCheckoutDataFromCart(data, reconciledCart),
        );
        setShellStatus(
          currentAuthSession
            ? "Restored signed-in cart."
            : storedBinding
              ? "Restored saved cart."
              : "Prepared guest cart.",
        );
      })
      .catch(async (error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Cart restore failed", {
          error,
        });
        if (currentAuthSession || !storedBinding) {
          return;
        }

        clearStoredCartBinding(config);
        try {
          const starterCart = applyStarterCartProductIds(starterCartData);
          const freshResponse = await apiClient.get<CartApiResponse>(
            "/api/cart",
            {
              market: config.market.code,
            },
          );

          if (!active) {
            return;
          }

          const freshCart = reconcileCartDataForStorefront(
            starterCart,
            freshResponse,
            starterCart,
          );
          setCurrentCart(freshCart);
          setCurrentCheckoutData((data) =>
            reconcileCheckoutDataFromCart(data, freshCart),
          );
          syncStoredCartBinding(config, freshCart);
          setShellStatus("Prepared guest cart.");
        } catch (recoveryError: unknown) {
          console.error("[paypal-retail-demo] Cart restore recovery failed", {
            error: recoveryError,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [apiClient, config, currentAuthSession, starterCartData]);

  useEffect(() => {
    if (currentRoute.page !== "express_review") {
      return;
    }

    const lookup = parseExpressReviewLookup(currentLocation);
    if (!lookup) {
      return;
    }

    let active = true;
    void apiClient
      .get<ExpressReviewApiResponse>("/api/paypal/orders/express-review", {
        market: config.market.code,
        ...lookup,
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setCurrentExpressReviewData(
          mapExpressReviewDataFromApiResponse(response, config.market.locale),
        );
        setCurrentExpressCaptureState({ status: "idle" });
        setShellStatus("Loaded synchronized express review snapshot.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Express review load failed", {
          error,
          lookup,
        });
        setCurrentExpressReviewData(
          createUnavailableExpressReviewData(config, lookup),
        );
        setCurrentExpressCaptureState({
          status: "error",
          message: "Express review snapshot could not be loaded.",
          ...(error instanceof ApiClientError
            ? { debugId: error.debugId }
            : {}),
        });
        setShellStatus("Express review snapshot could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [
    apiClient,
    config.market.code,
    config.market.locale,
    currentLocation,
    currentRoute.page,
  ]);

  useEffect(() => {
    if (
      currentRoute.page !== "account" ||
      currentRoute.section !== "settings" ||
      !currentAuthSession
    ) {
      return;
    }

    let active = true;
    setSavedPaymentsStatus("loading");
    setAccountAddressesStatus("loading");
    const requestOptions = buildAuthRequestOptions(currentAuthSession);
    void Promise.all([
      apiClient.get<AccountSavedPaymentsApiResponse>(
        "/api/account/saved-payments",
        cartQuery(),
        requestOptions,
      ),
      apiClient.get<AccountAddressesApiResponse>(
        "/api/account/addresses",
        cartQuery(),
        requestOptions,
      ),
    ])
      .then(([savedPaymentResponse, addressResponse]) => {
        if (!active) {
          return;
        }
        setSavedPayments(mapAccountSavedPayments(savedPaymentResponse));
        setAccountAddresses(mapAccountAddresses(addressResponse));
        setSavedPaymentsStatus("ready");
        setAccountAddressesStatus("ready");
        setShellStatus("Loaded account settings.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Saved payments load failed", {
          error,
        });
        setSavedPaymentsStatus("error");
        setAccountAddressesStatus("error");
        setShellStatus("Account settings could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [apiClient, config.market.code, currentAuthSession, currentRoute]);

  useEffect(() => {
    if (
      currentRoute.page !== "account" ||
      currentRoute.section !== "orders" ||
      !currentAuthSession
    ) {
      return;
    }

    let active = true;
    setAccountOrdersStatus("loading");
    const requestOptions = buildAuthRequestOptions(currentAuthSession);
    const orderRequest = currentRoute.orderNumber
      ? apiClient
          .get<AccountOrderApiResponse>(
            `/api/account/orders/${encodeURIComponent(currentRoute.orderNumber)}`,
            cartQuery(),
            requestOptions,
          )
          .then((response) => [response.order])
      : apiClient
          .get<AccountOrdersApiResponse>(
            "/api/account/orders",
            cartQuery(),
            requestOptions,
          )
          .then((response) => response.orders);

    void orderRequest
      .then((orders) => {
        if (!active) {
          return;
        }
        const mappedOrders = mapAccountOrders(orders, config.market.locale);
        setAccountOrders(mappedOrders);
        setAccountOrdersStatus(mappedOrders.length > 0 ? "ready" : "empty");
        setShellStatus("Loaded account orders.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Account orders load failed", {
          error,
        });
        setAccountOrders([]);
        setAccountOrdersStatus("error");
        setShellStatus("Account orders could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [
    apiClient,
    config.market.code,
    config.market.locale,
    currentAuthSession,
    currentRoute,
  ]);

  useEffect(() => {
    if (currentRoute.page !== "home") {
      return;
    }

    let active = true;
    void apiClient
      .get<CatalogProductsApiResponse>("/api/catalog/products", {
        market: config.market.code,
        profile: config.profile.slug,
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setCurrentHomePageData(
          mapHomePageFromApiResponse(
            response,
            homeFallbackData,
            config.market.locale,
          ),
        );
        setShellStatus("Loaded live homepage merchandising.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Homepage products load failed", {
          error,
        });
        setCurrentHomePageData(homeFallbackData);
        setShellStatus("Loaded fallback homepage merchandising.");
      });

    return () => {
      active = false;
    };
  }, [
    apiClient,
    config.market.code,
    config.market.locale,
    config.profile.slug,
    currentRoute.page,
    homeFallbackData,
  ]);

  useEffect(() => {
    if (currentRoute.page !== "catalog") {
      return;
    }

    let active = true;
    const catalogQuery = buildCatalogProductsQuery({
      location: currentLocation,
      market: config.market.code,
      profile: config.profile.slug,
    });

    void apiClient
      .get<CatalogProductsApiResponse>("/api/catalog/products", catalogQuery)
      .then((response) => {
        if (!active) {
          return;
        }
        setCurrentCategoryPageData(
          mapCategoryPageFromApiResponse(
            response,
            categoryFallbackData,
            config.market.locale,
            currentLocation,
          ),
        );
        setShellStatus("Loaded live catalog products.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        console.error("[paypal-retail-demo] Catalog products load failed", {
          error,
        });
        setCurrentCategoryPageData(
          mapCategoryPageFallbackData(categoryFallbackData, currentLocation),
        );
        setShellStatus("Loaded fallback catalog merchandising.");
      });

    return () => {
      active = false;
    };
  }, [
    apiClient,
    categoryFallbackData,
    config.market.code,
    config.market.locale,
    config.profile.slug,
    currentLocation,
    currentRoute.page,
  ]);

  useEffect(() => {
    if (
      currentRoute.page !== "product" ||
      currentProductPages[currentRoute.productSlug] ||
      missingProductSlugs.has(currentRoute.productSlug)
    ) {
      return;
    }

    let active = true;
    const requestedProductSlug = currentRoute.productSlug;
    void apiClient
      .get<CatalogProductDetailApiResponse>(
        `/api/catalog/products/${encodeURIComponent(requestedProductSlug)}`,
        {
          market: config.market.code,
          profile: config.profile.slug,
        },
      )
      .then((response) => {
        if (!active) {
          return;
        }
        setCurrentProductPages((pages) => ({
          ...pages,
          [response.product.slug]: mapProductDetailPageFromApiResponse(
            response,
            config.market.locale,
            config.profile.displayName,
          ),
        }));
        setMissingProductSlugs((slugs) => {
          const nextSlugs = new Set(slugs);
          nextSlugs.delete(requestedProductSlug);
          nextSlugs.delete(response.product.slug);
          return nextSlugs;
        });
        setShellStatus("Loaded live product detail.");
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const fallbackProductPage =
          defaultProductDetailPages[requestedProductSlug];

        console.error("[paypal-retail-demo] Product detail load failed", {
          error,
          productSlug: requestedProductSlug,
          fallbackApplied: Boolean(fallbackProductPage),
        });
        if (fallbackProductPage) {
          setCurrentProductPages((pages) => ({
            ...pages,
            [requestedProductSlug]: fallbackProductPage,
          }));
          setMissingProductSlugs((slugs) => {
            const nextSlugs = new Set(slugs);
            nextSlugs.delete(requestedProductSlug);
            return nextSlugs;
          });
          setShellStatus("Loaded fallback product detail.");
          return;
        }
        setMissingProductSlugs((slugs) =>
          new Set(slugs).add(requestedProductSlug),
        );
        setShellStatus("Product detail could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [
    apiClient,
    config.market.code,
    config.market.locale,
    config.profile.slug,
    currentRoute,
    currentProductPages,
    missingProductSlugs,
  ]);

  function openMinicart() {
    setIsMobileMenuOpen(false);
    setCurrentMinicartState("open");
  }

  function closeMinicart() {
    setCurrentMinicartState("closed");
    setShellStatus("Minicart closed.");
  }

  function openAuthModal() {
    setIsMobileMenuOpen(false);
    setCurrentAuthModalState("email");
    setAuthModalStatus("Enter your email to continue.");
    setShellStatus("Opened sign-in dialog.");
  }

  function openGuestAccountPrompt() {
    setIsMobileMenuOpen(false);
    setCurrentAuthModalState("email");
    setAuthModalStatus("Enter the checkout email to save this guest order.");
    setShellStatus("Opened guest order account dialog.");
  }

  function closeAuthModal() {
    setCurrentAuthModalState("closed");
    setAuthModalStatus(undefined);
    setShellStatus("Closed sign-in dialog.");
  }

  function changeAuthEmail() {
    setCurrentAuthModalState("email");
    setAuthModalStatus("Enter your email to continue.");
    setShellStatus("Ready to check another email.");
  }

  async function handleAuthEmailSubmit(email: string) {
    setAuthModalStatus("Checking account...");
    setShellStatus("Checking account email.");

    const response = await apiClient.post<AuthEmailLookupApiResponse>(
      "/api/account/auth/lookup",
      {
        email,
      },
      {
        market: config.market.code,
      },
    );

    setCurrentAuthModalState(
      response.status === "existing" ? "password" : "register",
    );
    setAuthModalStatus(
      response.status === "existing"
        ? "Enter your password to sign in."
        : "Create a password to register.",
    );
    setShellStatus(
      response.status === "existing"
        ? "Existing account found."
        : "Ready to create account.",
    );
  }

  async function handleAuthPasswordSubmit(input: {
    readonly email: string;
    readonly password: string;
  }) {
    setAuthModalStatus("Signing in...");
    setShellStatus("Signing in.");
    const session = await authClient.signInWithPassword(input);
    await completeAuthSession(session);
  }

  async function handleAuthRegisterSubmit(input: {
    readonly email: string;
    readonly password: string;
  }) {
    setAuthModalStatus("Creating account...");
    setShellStatus("Creating account.");
    const session = await authClient.signUpWithPassword(input);
    await completeAuthSession(session);
  }

  async function completeAuthSession(session: BuyerAuthSession) {
    didRunInitialCartRestore.current = true;
    setCurrentAuthSession(session);
    setAuthModalStatus("Merging cart...");

    const response = await apiClient.post<CartApiResponse>(
      "/api/cart/merge",
      {},
      cartQuery(),
      buildCartRequestOptions(currentCart, session),
    );
    reconcileServerCart(response);
    clearStoredCartBinding(config);
    setCurrentAuthModalState("closed");
    setAuthModalStatus(undefined);
    setShellStatus("Signed in and merged cart.");

    if (currentExpressCaptureState.status === "captured") {
      await linkGuestOrdersForSession(session);
    }
  }

  async function linkGuestOrdersForSession(session: BuyerAuthSession) {
    if (!session.email) {
      return;
    }

    setGuestOrderLinkStatus("linking");
    setLinkedGuestOrderCount(0);

    try {
      const response = await apiClient.post<AccountGuestOrderLinkApiResponse>(
        "/api/account/guest-orders/link",
        {},
        cartQuery(),
        buildAuthRequestOptions(session),
      );
      setLinkedGuestOrderCount(response.linked_order_count);
      setGuestOrderLinkStatus("linked");
      setShellStatus(
        `Linked ${response.linked_order_count} guest ${
          response.linked_order_count === 1 ? "order" : "orders"
        } to account.`,
      );
    } catch (error) {
      console.error("[paypal-retail-demo] Guest order link failed", {
        error,
      });
      setGuestOrderLinkStatus("error");
      setShellStatus("Guest order could not be linked to account.");
    }
  }

  function cartQuery(): ApiQueryParams {
    return {
      market: config.market.code,
    };
  }

  async function refreshCartBefore(
    trigger: CartRefreshTrigger,
  ): Promise<DeliveryExpressCreateOrderCartContext | undefined> {
    console.info("[paypal-retail-demo] Cart refresh before payment starting", {
      cartPublicId: currentCart.cartPublicId ?? null,
      hasAuthSession: Boolean(currentAuthSession?.accessToken),
      hasCartClientSecret: Boolean(currentCart.cartClientSecret?.trim()),
      trigger,
    });
    try {
      const response = await apiClient.post<CartApiResponse>(
        "/api/cart/refresh",
        {
          trigger,
        },
        cartQuery(),
        buildCartRequestOptions(currentCart, currentAuthSession),
      );
      const refreshedCart = reconcileCartDataForStorefront(
        currentCart,
        response,
      );
      setCurrentCart(refreshedCart);
      setCurrentCheckoutData((data) =>
        reconcileCheckoutDataFromCart(data, refreshedCart),
      );
      syncStoredCartBinding(config, refreshedCart);
      console.info(
        "[paypal-retail-demo] Cart refresh before payment succeeded",
        {
          cartPublicId: refreshedCart.cartPublicId ?? null,
          hasAuthSession: Boolean(currentAuthSession?.accessToken),
          hasCartClientSecret: Boolean(refreshedCart.cartClientSecret?.trim()),
          itemCount: calculateCartItemCount(refreshedCart),
          trigger,
        },
      );
      if (!refreshedCart.cartPublicId?.trim()) {
        return undefined;
      }
      return {
        ...(refreshedCart.cartClientSecret
          ? { cartClientSecret: refreshedCart.cartClientSecret }
          : {}),
        cartPublicId: refreshedCart.cartPublicId,
        requestOptions: buildCartRequestOptions(
          refreshedCart,
          currentAuthSession,
        ),
      };
    } catch (error) {
      console.error("[paypal-retail-demo] Cart refresh failed", {
        trigger,
        error,
      });
      throw error;
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
        buildCartRequestOptions(currentCart, currentAuthSession),
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
    setCurrentCart((cart) => {
      const nextCart = reconcileCartDataForStorefront(cart, response);
      setCurrentCheckoutData((data) =>
        reconcileCheckoutDataFromCart(data, nextCart),
      );
      syncStoredCartBinding(config, nextCart);
      return nextCart;
    });
  }

  async function updateCheckoutDraft(
    request: CheckoutDraftUpdateRequest,
    currentData: CheckoutPageData,
  ): Promise<CheckoutPageData> {
    try {
      if (!hasCartApiAccess(currentCart, currentAuthSession)) {
        setShellStatus("Cart is still syncing. Please try checkout again.");
        throw new CartBindingIncompleteError();
      }

      const { draftId, nextData } = await ensureCheckoutDraft({
        apiClient,
        config,
        currentData,
        fulfillmentMode: request.fulfillmentMode,
        requestedDraftId: request.draftId,
        cart: currentCart,
        authSession: currentAuthSession,
      });

      if (!draftId) {
        setShellStatus(
          "Checkout draft could not be started. Please try again.",
        );
        throw new Error("Checkout draft could not be started.");
      }

      const response = await sendCheckoutDraftUpdate(
        apiClient,
        config,
        {
          ...request,
          draftId,
        },
        currentCart,
        currentAuthSession,
      );
      const reconciledData = reconcileCheckoutDataFromDraftResponse(
        nextData,
        response,
      );
      setCurrentCheckoutData(reconciledData);
      return reconciledData;
    } catch (error) {
      console.error("[paypal-retail-demo] Checkout draft update failed", {
        error,
        request,
      });
      if (!(error instanceof CartBindingIncompleteError)) {
        setShellStatus("Checkout update failed. Please try again.");
      }
      throw error;
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
    setCurrentLocation(pathname);
    setCurrentMinicartState("closed");
    setIsMobileMenuOpen(false);
    setShellStatus(statusMessage);
    pushBuyerHistory(pathname);
  }

  function handleAccountNavigate() {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    void navigateBuyer({
      pathname: "/account/settings",
      statusMessage: "Opened account settings.",
    });
  }

  function handleHeaderSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitHeaderSearch();
  }

  function handleHeaderSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submitHeaderSearch();
  }

  function submitHeaderSearch() {
    const normalizedQuery = headerSearchQuery.trim();
    setHeaderSearchQuery(normalizedQuery);
    void navigateBuyer({
      pathname: buildCatalogSearchPath(normalizedQuery),
      statusMessage: normalizedQuery
        ? `Showing search results for ${normalizedQuery}.`
        : "Opened all products.",
    });
  }

  async function handleDeleteSavedPayment(savedPaymentId: string) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.delete<AccountSavedPaymentsApiResponse>(
      `/api/account/saved-payments/${encodeURIComponent(savedPaymentId)}`,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    setSavedPayments(mapAccountSavedPayments(response));
    setSavedPaymentsStatus("ready");
    setShellStatus("Deleted saved payment.");
  }

  async function handleCreateAddress(address: AccountAddressMutationInput) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.post<AccountAddressesApiResponse>(
      "/api/account/addresses",
      address,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    setAccountAddresses(mapAccountAddresses(response));
    setAccountAddressesStatus("ready");
    setShellStatus("Saved address.");
  }

  async function handleUpdateAddress(
    addressId: string,
    address: AccountAddressMutationInput,
  ) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.patch<AccountAddressesApiResponse>(
      `/api/account/addresses/${encodeURIComponent(addressId)}`,
      address,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    setAccountAddresses(mapAccountAddresses(response));
    setAccountAddressesStatus("ready");
    setShellStatus("Updated address.");
  }

  async function handleMakeDefaultAddress(addressId: string) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.patch<AccountAddressesApiResponse>(
      `/api/account/addresses/${encodeURIComponent(addressId)}`,
      {
        is_default_shipping: true,
        is_default_billing: true,
      },
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    setAccountAddresses(mapAccountAddresses(response));
    setAccountAddressesStatus("ready");
    setShellStatus("Updated default address.");
  }

  async function handleDeleteAddress(addressId: string) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.delete<AccountAddressesApiResponse>(
      `/api/account/addresses/${encodeURIComponent(addressId)}`,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    setAccountAddresses(mapAccountAddresses(response));
    setAccountAddressesStatus("ready");
    setShellStatus("Deleted address.");
  }

  async function handleSubmitReview(
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.post<AccountOrderApiResponse>(
      `/api/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(itemId)}/review`,
      review,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    applyAccountOrderMutation(response.order, "Submitted review.");
  }

  async function handleUpdateReview(
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.patch<AccountOrderApiResponse>(
      `/api/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(itemId)}/review`,
      review,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    applyAccountOrderMutation(response.order, "Updated review.");
  }

  async function handleDeleteReview(orderNumber: string, itemId: string) {
    if (!currentAuthSession) {
      openAuthModal();
      return;
    }

    const response = await apiClient.delete<AccountOrderApiResponse>(
      `/api/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(itemId)}/review`,
      cartQuery(),
      buildAuthRequestOptions(currentAuthSession),
    );
    applyAccountOrderMutation(response.order, "Deleted review.");
  }

  function applyAccountOrderMutation(
    order: AccountOrderApiItem,
    statusMessage: string,
  ) {
    const mappedOrder = mapAccountOrder(order, config.market.locale);

    setAccountOrders((orders) => {
      const existingOrderIndex = orders.findIndex(
        (existingOrder) =>
          existingOrder.orderNumber === mappedOrder.orderNumber,
      );

      if (existingOrderIndex === -1) {
        return [mappedOrder, ...orders];
      }

      return orders.map((existingOrder, index) =>
        index === existingOrderIndex ? mappedOrder : existingOrder,
      );
    });
    setAccountOrdersStatus("ready");
    invalidateProductPagesForOrder(order);
    setShellStatus(statusMessage);
  }

  function invalidateProductPagesForOrder(order: AccountOrderApiItem) {
    const affectedSlugs = new Set(
      order.items.flatMap((item) => {
        const slug = parseProductSlugFromUrl(item.product_url);
        return slug ? [slug] : [];
      }),
    );

    if (affectedSlugs.size === 0) {
      return;
    }

    setCurrentProductPages((pages) => {
      const nextPages = { ...pages };

      for (const slug of affectedSlugs) {
        delete nextPages[slug];
      }

      return nextPages;
    });
    setMissingProductSlugs((slugs) => {
      const nextSlugs = new Set(slugs);

      for (const slug of affectedSlugs) {
        nextSlugs.delete(slug);
      }

      return nextSlugs;
    });
  }

  async function handleGuestOrderLookup(input: GuestOrderLookupInput) {
    setGuestOrderStatus("loading");
    setGuestOrderError(null);

    try {
      const orderNumber = input.orderNumber.trim().toUpperCase();
      const response = await apiClient.get<GuestOrderApiResponse>(
        `/api/guest-orders/${encodeURIComponent(orderNumber)}`,
        {
          email: input.email.trim(),
        },
      );
      setGuestOrder(mapGuestOrder(response.order, config.market.locale));
      setGuestOrderStatus("ready");
      setShellStatus("Loaded guest order.");
    } catch (error) {
      const debugId = resolveApiClientDebugId(error);

      console.error("[paypal-retail-demo] Guest order lookup failed", {
        error,
      });
      setGuestOrder(null);
      setGuestOrderStatus("error");
      setGuestOrderError(
        debugId
          ? `No guest order matched those details. Debug reference ${debugId}.`
          : "No guest order matched those details.",
      );
      setShellStatus("Guest order lookup failed.");
    }
  }

  function handleAddProductToCart(
    product: ProductDetailPageData,
    selection: ProductPurchaseSelection,
  ) {
    const primaryImage = product.gallery[0];

    setCurrentCart((cart) =>
      addProductToCartQuantity(
        cart,
        {
          ...(product.productId ? { productId: product.productId } : {}),
          slug: product.slug,
          name: product.name,
          categoryName: product.categoryName,
          imagePath:
            primaryImage?.imagePath ??
            "/assets/generic/products/placeholder.svg",
          imageAlt: primaryImage?.imageAlt ?? `${product.name} collectible`,
          unitPriceCents:
            product.unitPriceCents ??
            parseMoneyLabelToMinor(product.currentPriceLabel) ??
            0,
          currentPriceLabel: product.currentPriceLabel,
          regularPriceLabel: product.regularPriceLabel,
          ...(product.maxQuantity ? { maxQuantity: product.maxQuantity } : {}),
          href: `/products/${product.slug}`,
        },
        selection.quantity,
      ),
    );
    setCurrentMinicartState("open");
    setShellStatus(
      selection.quantity > 1
        ? `Added ${selection.label} for ${product.name} to cart.`
        : `Added ${product.name} to cart.`,
    );
    syncProductAddToCart(product, selection);
  }

  function syncProductAddToCart(
    product: ProductDetailPageData,
    selection: ProductPurchaseSelection,
  ) {
    const productId = resolveProductDetailCartProductId(product);

    if (!productId) {
      console.warn("[paypal-retail-demo] PDP Add to cart skipped server sync", {
        productSlug: product.slug,
        reason: "missing_product_id",
      });
      return;
    }

    if (!hasCartApiAccess(currentCart, currentAuthSession)) {
      console.warn("[paypal-retail-demo] PDP Add to cart skipped server sync", {
        hasAuthSession: Boolean(currentAuthSession?.accessToken),
        hasCartClientSecret: Boolean(currentCart.cartClientSecret?.trim()),
        hasCartPublicId: Boolean(currentCart.cartPublicId?.trim()),
        productId,
        productSlug: product.slug,
        reason: "cart_binding_incomplete",
      });
      setShellStatus("Cart is still syncing. Please try Add to cart again.");
      return;
    }

    void apiClient
      .post<CartApiResponse>(
        "/api/cart/items",
        {
          product_id: productId,
          quantity: selection.quantity,
        },
        cartQuery(),
        buildCartRequestOptions(currentCart, currentAuthSession),
      )
      .then((response) => {
        reconcileServerCart(response);
      })
      .catch((error: unknown) => {
        console.error("[paypal-retail-demo] PDP Add to cart sync failed", {
          error,
          productId,
          productSlug: product.slug,
          quantity: selection.quantity,
        });
        setShellStatus("Cart update failed. Please try Add to cart again.");
      });
  }

  function handleCartQuantityChange(
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) {
    setCurrentCart((cart) => setCartItemQuantity(cart, slug, nextQuantity));
    syncCartQuantity(cartItemId, nextQuantity);
  }

  async function handleDeliveryExpressApproved(
    context: DeliveryExpressApprovedContext,
  ) {
    const paymentMethodLabel = formatDeliveryExpressMethod(context.method);
    const reviewPath = buildExpressReviewPath(context);

    setCurrentExpressReviewData((data) => ({
      ...data,
      sourceLabel: formatDeliveryExpressSource(context.source),
      paymentMethodLabel,
      paypalOrderId: context.paypalOrderId,
    }));
    setCurrentExpressCaptureState({ status: "idle" });
    setGuestOrderLinkStatus("idle");
    setLinkedGuestOrderCount(0);
    setCurrentMinicartState("closed");
    setCurrentRoute({
      scope: "buyer",
      page: "express_review",
    });
    setCurrentLocation(reviewPath);
    pushBuyerHistory(reviewPath);
    setShellStatus(`${paymentMethodLabel} delivery express approved.`);
  }

  async function handleCheckoutPaymentApproved(
    context: CheckoutApprovedPaymentContext,
  ) {
    const paymentMethodLabel =
      context.method === "paylater"
        ? "Pay Later"
        : context.method === "card"
          ? "card payment"
          : "PayPal";

    console.info("[paypal-retail-demo] Checkout payment approved", {
      fulfillmentMode: context.fulfillmentMode,
      method: context.method,
      paypalOrderId: context.paypalOrderId,
      paymentSessionId: context.paymentSessionId ?? null,
    });
    setCurrentExpressCaptureState({
      status: "capturing",
      message: "Confirming approved payment...",
    });
    setShellStatus(`${paymentMethodLabel} approved. Confirming order.`);

    try {
      const reviewResponse = await apiClient.get<ExpressReviewApiResponse>(
        "/api/paypal/orders/express-review",
        {
          market: config.market.code,
          paypal_order_id: context.paypalOrderId,
          ...(context.paymentSessionId
            ? { payment_session_id: context.paymentSessionId }
            : {}),
        },
      );
      const reviewData = mapExpressReviewDataFromApiResponse(
        reviewResponse,
        config.market.locale,
      );

      if (reviewData.amountGuard.status === "blocked") {
        setCurrentExpressReviewData(reviewData);
        setCurrentExpressCaptureState({
          status: "error",
          message:
            "Payment cannot be captured until the synchronized amounts match.",
        });
        setShellStatus("Payment capture blocked by amount guard.");
        throw new Error("Checkout payment capture blocked by amount guard.");
      }

      const captureResponse = await apiClient.post<CaptureOrderApiResponse>(
        `/api/paypal/orders/${encodeURIComponent(context.paypalOrderId)}/capture`,
        {},
        {
          market: config.market.code,
        },
      );

      setCurrentExpressReviewData({
        ...reviewData,
        merchantOrderNumber: captureResponse.order_number,
        paymentMethodLabel,
        paypalOrderId: captureResponse.paypal_order_id,
        statusLabel: "Payment captured",
      });
      setCurrentExpressCaptureState({
        status: "captured",
        message: "Payment captured",
        captureId: captureResponse.paypal_capture_id,
      });
      setGuestOrderLinkStatus("idle");
      setLinkedGuestOrderCount(0);
      setCurrentMinicartState("closed");
      setCurrentRoute({
        scope: "buyer",
        page: "express_review",
      });
      setCurrentLocation("/checkout/express-review");
      pushBuyerHistory("/checkout/express-review");
      await reloadCartAfterPaymentCapture();
      setShellStatus(
        `Payment captured for order ${captureResponse.order_number}.`,
      );
    } catch (error) {
      console.error("[paypal-retail-demo] Checkout payment approval failed", {
        error,
        fulfillmentMode: context.fulfillmentMode,
        method: context.method,
        paypalOrderId: context.paypalOrderId,
        paymentSessionId: context.paymentSessionId ?? null,
      });
      setCurrentExpressCaptureState((state) =>
        state.status === "error"
          ? state
          : {
              status: "error",
              message:
                "Payment confirmation failed. Please retry or choose another method.",
            },
      );
      setShellStatus("Payment confirmation failed. Please retry.");
      throw error;
    }
  }

  async function reloadCartAfterPaymentCapture() {
    try {
      const response = await apiClient.get<CartApiResponse>(
        "/api/cart",
        cartQuery(),
        buildCartRequestOptions(currentCart, currentAuthSession),
      );
      reconcileServerCart(response);
    } catch (error) {
      console.error("[paypal-retail-demo] Cart reload after capture failed", {
        error,
      });
    }
  }

  async function handleExpressReviewCapture() {
    const paypalOrderId = currentExpressReviewData.paypalOrderId.trim();

    if (currentExpressReviewData.amountGuard.status === "blocked") {
      setCurrentExpressCaptureState({
        status: "error",
        message:
          "Payment cannot be captured until the synchronized amounts match.",
      });
      setShellStatus("Payment capture blocked by amount guard.");
      return;
    }

    if (!paypalOrderId) {
      setCurrentExpressCaptureState({
        status: "error",
        message:
          "Payment cannot be captured because the PayPal order is missing.",
      });
      setShellStatus("Payment capture missing PayPal order ID.");
      return;
    }

    setCurrentExpressCaptureState({
      status: "capturing",
      message: "Capturing payment...",
    });
    setGuestOrderLinkStatus("idle");
    setLinkedGuestOrderCount(0);
    setShellStatus("Capturing PayPal payment.");

    try {
      const response = await apiClient.post<CaptureOrderApiResponse>(
        `/api/paypal/orders/${encodeURIComponent(paypalOrderId)}/capture`,
        {},
        {
          market: config.market.code,
        },
      );

      setCurrentExpressCaptureState({
        status: "captured",
        message: "Payment captured",
        captureId: response.paypal_capture_id,
      });
      setCurrentExpressReviewData((data) => ({
        ...data,
        merchantOrderNumber: response.order_number,
        paypalOrderId: response.paypal_order_id,
        statusLabel: "Payment captured",
      }));
      setShellStatus(`Payment captured for order ${response.order_number}.`);
    } catch (error) {
      const debugId = resolveApiClientDebugId(error);

      console.error("[paypal-retail-demo] Express review capture failed", {
        error,
        paypalOrderId,
      });
      setCurrentExpressCaptureState({
        status: "error",
        message:
          "Payment capture failed. Please retry or choose another method.",
        ...(debugId ? { debugId } : {}),
      });
      setShellStatus("Payment capture failed. Please retry.");
    }
  }

  const expressAccountLinkPrompt: ExpressReviewAccountLinkPrompt | undefined =
    currentExpressCaptureState.status === "captured"
      ? currentAuthSession
        ? guestOrderLinkStatus === "idle"
          ? undefined
          : {
              status: guestOrderLinkStatus,
              linkedOrderCount: linkedGuestOrderCount,
            }
        : {
            status: "idle",
            onCreateAccount: openGuestAccountPrompt,
          }
      : undefined;
  const accountActionLabel = currentAuthSession ? "Account" : "Sign in";
  const accountAvatarFallback =
    currentAuthSession?.email?.trim().slice(0, 2).toUpperCase() ||
    (currentAuthSession ? "AC" : "IN");

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
        <div className="site-utility" aria-label="Store services">
          <span>Free delivery and pickup options</span>
          <div className="site-utility__links">
            <a href="/account">Help</a>
            <a href="/guest-orders">Track order</a>
            <a href="/guest-orders">Order recovery</a>
          </div>
        </div>
        <div className="site-header__inner">
          <a
            className="site-header__brand"
            href="/"
            aria-label={assets.logoText}
          >
            <span className="site-header__brand-mark" aria-hidden="true">
              POP
            </span>
            <span className="site-header__brand-text">
              <strong>
                {assets.logoText} <em>Retail</em>
              </strong>
              <small>Collectible checkout studio</small>
            </span>
          </a>
          <form
            action="/products"
            aria-label="Product search"
            className="site-header__discovery"
            method="get"
            onSubmit={handleHeaderSearchSubmit}
            role="search"
          >
            <Input
              aria-label="Search products"
              autoComplete="off"
              className="site-header__discovery-input"
              name="q"
              onKeyDown={handleHeaderSearchKeyDown}
              onChange={(event) => setHeaderSearchQuery(event.target.value)}
              placeholder="Search figures, series, characters..."
              type="search"
              value={headerSearchQuery}
            />
            <Button
              aria-label="Search products"
              className="site-header__discovery-submit"
              size="icon-sm"
              type="submit"
              variant="ghost"
            >
              <SearchIcon
                aria-hidden="true"
                className="site-header__lucide-icon site-header__lucide-icon--search"
              />
            </Button>
          </form>
          <div className="site-header__actions" aria-label="Buyer actions">
            <button
              type="button"
              aria-label={accountActionLabel}
              onClick={handleAccountNavigate}
            >
              <span className="site-header__action-icon" aria-hidden="true">
                <Avatar className="site-header__account-avatar">
                  <AvatarFallback>{accountAvatarFallback}</AvatarFallback>
                </Avatar>
              </span>
              <span className="site-header__action-label">
                {accountActionLabel}
              </span>
            </button>
            <button
              className="site-header__wishlist"
              type="button"
              disabled
              aria-disabled="true"
              aria-describedby="site-header-wishlist-disabled-reason"
              aria-label="Wishlist unavailable"
              title="Wishlist is coming in a later demo slice"
            >
              <span className="site-header__action-icon" aria-hidden="true">
                <HeartIcon
                  className="site-header__lucide-icon site-header__lucide-icon--wishlist"
                  aria-hidden="true"
                />
              </span>
              <span className="site-header__action-label">Wishlist</span>
              <span
                className="site-header__disabled-reason"
                id="site-header-wishlist-disabled-reason"
              >
                Coming soon
              </span>
            </button>
            <button
              type="button"
              aria-label="Open minicart"
              onClick={openMinicart}
            >
              <span className="site-header__action-icon" aria-hidden="true">
                <ShoppingCartIcon
                  className="site-header__lucide-icon site-header__lucide-icon--cart"
                  aria-hidden="true"
                />
              </span>
              <span className="site-header__action-label">
                Cart ({cartItemCount})
              </span>
              <span className="site-header__cart-count" aria-hidden="true">
                {cartItemCount}
              </span>
            </button>
            <button
              className="site-header__menu-button"
              type="button"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
              aria-label="Open mobile menu"
              onClick={() => {
                setCurrentMinicartState("closed");
                setIsMobileMenuOpen((isOpen) => !isOpen);
                setShellStatus(
                  isMobileMenuOpen ? "Closed menu." : "Opened menu.",
                );
              }}
            >
              <span className="site-header__action-icon" aria-hidden="true">
                <MenuIcon
                  className="site-header__lucide-icon site-header__lucide-icon--menu"
                  aria-hidden="true"
                />
              </span>
              <span className="site-header__action-label">Menu</span>
            </button>
          </div>
        </div>
        <nav className="site-header__nav" aria-label="Product categories">
          {buyerCategoryNavLinks.map((link) => (
            <a
              href={link.href}
              data-tone={"tone" in link ? link.tone : undefined}
              key={link.label}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div
          className="site-header__mobile-menu"
          hidden={!isMobileMenuOpen}
          id="mobile-menu"
        >
          <div className="site-header__mobile-menu-panel">
            <div className="site-header__mobile-menu-header">
              <div>
                <strong>Shop menu</strong>
                <span>{assets.logoText}</span>
              </div>
              <button
                type="button"
                aria-label="Close mobile menu"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShellStatus("Closed menu.");
                }}
              >
                <XIcon
                  className="site-header__lucide-icon site-header__lucide-icon--close"
                  aria-hidden="true"
                />
              </button>
            </div>
            <nav className="site-header__mobile-nav" aria-label="Mobile menu">
              <section aria-labelledby="mobile-menu-shop-title">
                <h2 id="mobile-menu-shop-title">Shop</h2>
                <div className="site-header__mobile-nav-grid">
                  {buyerCategoryNavLinks.map((link) => (
                    <a
                      href={link.href}
                      data-tone={"tone" in link ? link.tone : undefined}
                      key={link.label}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </section>
              <section aria-labelledby="mobile-menu-support-title">
                <h2 id="mobile-menu-support-title">Support</h2>
                <div className="site-header__mobile-support-links">
                  {buyerMobileSupportLinks.map((link) => (
                    <a
                      href={link.href}
                      key={link.label}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </section>
            </nav>
          </div>
        </div>
      </header>
      <main className="buyer-shell__main" id="main-content" tabIndex={-1}>
        <RouteStage
          route={currentRoute}
          homePageData={currentHomePageData}
          categoryPageData={currentCategoryPageData}
          missingProductSlugs={missingProductSlugs}
          productPages={currentProductPages}
          cartData={currentCart}
          checkoutData={currentCheckoutData}
          expressAccountLinkPrompt={expressAccountLinkPrompt}
          expressReviewData={currentExpressReviewData}
          expressCaptureState={currentExpressCaptureState}
          accountAddresses={accountAddresses}
          accountAddressesStatus={accountAddressesStatus}
          accountEmail={currentAuthSession?.email ?? null}
          accountOrders={accountOrders}
          accountOrdersStatus={accountOrdersStatus}
          guestOrder={guestOrder}
          guestOrderError={guestOrderError}
          guestOrderStatus={guestOrderStatus}
          savedPayments={savedPayments}
          savedPaymentsStatus={savedPaymentsStatus}
          suppressCheckoutPaymentActions={
            isMobileMenuOpen ||
            currentMinicartState !== "closed" ||
            currentAuthModalState !== "closed"
          }
          onCreateAddress={handleCreateAddress}
          onDeleteAddress={handleDeleteAddress}
          onDeleteReview={handleDeleteReview}
          onDeleteSavedPayment={handleDeleteSavedPayment}
          onGuestOrderLookup={handleGuestOrderLookup}
          onMakeDefaultAddress={handleMakeDefaultAddress}
          onSubmitReview={handleSubmitReview}
          onUpdateAddress={handleUpdateAddress}
          onUpdateReview={handleUpdateReview}
          onAddProductToCart={handleAddProductToCart}
          onCartQuantityChange={handleCartQuantityChange}
          onCheckoutDraftUpdate={updateCheckoutDraft}
          onExpressReviewCapture={handleExpressReviewCapture}
          renderDeliveryExpressAction={(method, source, totalLabel) =>
            renderDeliveryExpressAction({
              authSession: currentAuthSession,
              cart: currentCart,
              config,
              method,
              onApproved: handleDeliveryExpressApproved,
              onBeforeCreateOrder: () =>
                refreshCartBefore("express_payment_start"),
              source,
              totalLabel,
            })
          }
          onNavigate={navigateBuyer}
          renderCardPaymentBox={(context) =>
            renderCardPaymentBox({
              authSession: currentAuthSession,
              cart: currentCart,
              config,
              context,
              onApproved: handleCheckoutPaymentApproved,
            })
          }
          renderCheckoutPaymentAction={(context) =>
            renderCheckoutPaymentAction({
              authSession: currentAuthSession,
              cart: currentCart,
              config,
              context,
              onApproved: handleCheckoutPaymentApproved,
            })
          }
          renderStorefrontPayLaterMessage={(context) =>
            renderStorefrontPayLaterMessage({
              config,
              ...context,
            })
          }
        />
      </main>
      <footer className="site-footer">
        <section
          className="site-footer__newsletter"
          aria-labelledby="site-footer-title"
        >
          <div className="site-footer__lead">
            <p className="homepage-eyebrow">Collector updates</p>
            <h2 id="site-footer-title">Stay in the loop</h2>
            <p>
              Follow new drops, delivery and pickup choices, and account order
              recovery from one demo storefront.
            </p>
          </div>
          <div className="site-footer__newsletter-actions">
            <a href="/products?sort=newest">Shop new drops</a>
            <a href="/guest-orders">Track order</a>
          </div>
        </section>
        <div className="site-footer__base">
          <nav className="site-footer__links" aria-label="Footer">
            {buyerFooterColumns.map((column) => (
              <div key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a href={link.href}>{link.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="site-footer__commerce">
            <p className="site-footer__support">
              Secure PayPal checkout, pickup, and order recovery in one demo.
            </p>
            <section
              className="site-footer__payment"
              aria-label="Accepted checkout options"
            >
              <h3>Checkout options</h3>
              <div className="site-footer__payment-marks">
                {buyerFooterPaymentMarks.map((mark) => (
                  <span className="site-footer__payment-mark" key={mark.label}>
                    <img src={mark.src} alt={mark.label} loading="lazy" />
                  </span>
                ))}
              </div>
            </section>
          </div>
        </div>
      </footer>
      <StatusRegion id="shell-status" className="sr-only">
        {shellStatus}
      </StatusRegion>
      <AuthModalShell
        state={currentAuthModalState}
        statusMessage={authModalStatus}
        onChangeEmail={changeAuthEmail}
        onClose={closeAuthModal}
        onEmailSubmit={handleAuthEmailSubmit}
        onPasswordSubmit={handleAuthPasswordSubmit}
        onRegisterSubmit={handleAuthRegisterSubmit}
      />
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
        onQuantityChange={handleCartQuantityChange}
        renderDeliveryExpressAction={(method, totalLabel) =>
          renderDeliveryExpressAction({
            authSession: currentAuthSession,
            cart: currentCart,
            config,
            method,
            onApproved: handleDeliveryExpressApproved,
            onBeforeCreateOrder: () =>
              refreshCartBefore("express_payment_start"),
            source: "minicart",
            totalLabel,
          })
        }
        renderPayLaterMessage={(totalLabel, fallbackMessage) =>
          renderStorefrontPayLaterMessage({
            amountLabel: totalLabel,
            config,
            fallbackMessage,
            placement: "minicart-summary",
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
  missingProductSlugs,
  productPages,
  cartData,
  checkoutData,
  expressAccountLinkPrompt,
  expressReviewData,
  expressCaptureState,
  accountAddresses,
  accountAddressesStatus,
  accountEmail,
  accountOrders,
  accountOrdersStatus,
  guestOrder,
  guestOrderError,
  guestOrderStatus,
  savedPayments,
  savedPaymentsStatus,
  suppressCheckoutPaymentActions,
  onCreateAddress,
  onDeleteAddress,
  onDeleteReview,
  onDeleteSavedPayment,
  onGuestOrderLookup,
  onMakeDefaultAddress,
  onSubmitReview,
  onUpdateAddress,
  onUpdateReview,
  onAddProductToCart,
  onCartQuantityChange,
  onCheckoutDraftUpdate,
  onExpressReviewCapture,
  onNavigate,
  renderCardPaymentBox,
  renderCheckoutPaymentAction,
  renderDeliveryExpressAction,
  renderStorefrontPayLaterMessage,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "buyer" }>;
  readonly homePageData: HomePageData;
  readonly categoryPageData: CategoryPageData;
  readonly missingProductSlugs: ReadonlySet<string>;
  readonly productPages: Readonly<Record<string, ProductDetailPageData>>;
  readonly cartData: CartData;
  readonly checkoutData: CheckoutPageData;
  readonly expressAccountLinkPrompt?:
    | ExpressReviewAccountLinkPrompt
    | undefined;
  readonly expressReviewData: ExpressReviewPageData;
  readonly expressCaptureState: ExpressReviewCaptureState;
  readonly accountAddresses: readonly AccountAddressView[];
  readonly accountAddressesStatus: "error" | "idle" | "loading" | "ready";
  readonly accountEmail: string | null;
  readonly accountOrders: readonly AccountOrderView[];
  readonly accountOrdersStatus: "empty" | "error" | "loading" | "ready";
  readonly guestOrder: GuestOrderView | null;
  readonly guestOrderError: string | null;
  readonly guestOrderStatus: "error" | "idle" | "loading" | "ready";
  readonly savedPayments: readonly AccountSavedPaymentMethodView[];
  readonly savedPaymentsStatus: "error" | "idle" | "loading" | "ready";
  readonly suppressCheckoutPaymentActions: boolean;
  readonly onCreateAddress: (
    address: AccountAddressMutationInput,
  ) => Promise<void>;
  readonly onDeleteAddress: (addressId: string) => Promise<void>;
  readonly onDeleteReview: (
    orderNumber: string,
    itemId: string,
  ) => Promise<void>;
  readonly onDeleteSavedPayment: (savedPaymentId: string) => Promise<void>;
  readonly onGuestOrderLookup: (input: GuestOrderLookupInput) => Promise<void>;
  readonly onMakeDefaultAddress: (addressId: string) => Promise<void>;
  readonly onSubmitReview: (
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) => Promise<void>;
  readonly onUpdateAddress: (
    addressId: string,
    address: AccountAddressMutationInput,
  ) => Promise<void>;
  readonly onUpdateReview: (
    orderNumber: string,
    itemId: string,
    review: AccountReviewInput,
  ) => Promise<void>;
  readonly onAddProductToCart: (
    product: ProductDetailPageData,
    selection: ProductPurchaseSelection,
  ) => void;
  readonly onCartQuantityChange: (
    slug: string,
    nextQuantity: number,
    cartItemId: string,
  ) => void;
  readonly onCheckoutDraftUpdate: (
    request: CheckoutDraftUpdateRequest,
    currentData: CheckoutPageData,
  ) => Promise<CheckoutPageData>;
  readonly onExpressReviewCapture: () => void;
  readonly onNavigate: (
    navigation: BuyerNavigationContext,
  ) => void | Promise<void>;
  readonly renderCardPaymentBox: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderCheckoutPaymentAction: (
    context: CheckoutPaymentActionContext,
  ) => ReactNode;
  readonly renderDeliveryExpressAction: (
    method: DeliveryExpressPaymentMethod,
    source: DeliveryExpressSource,
    totalLabel: string,
  ) => ReactNode;
  readonly renderStorefrontPayLaterMessage: (
    context: StorefrontPayLaterMessageContext,
  ) => ReactNode;
}) {
  if (route.page === "checkout") {
    return (
      <CheckoutPage
        data={checkoutData}
        onDraftUpdate={onCheckoutDraftUpdate}
        suppressMobileStickySummary={suppressCheckoutPaymentActions}
        renderCardPaymentBox={
          suppressCheckoutPaymentActions ? () => null : renderCardPaymentBox
        }
        renderPaymentAction={
          suppressCheckoutPaymentActions
            ? () => null
            : renderCheckoutPaymentAction
        }
      />
    );
  }

  if (route.page === "express_review") {
    return (
      <ExpressReviewPage
        accountLinkPrompt={expressAccountLinkPrompt}
        captureState={expressCaptureState}
        data={expressReviewData}
        onConfirmCapture={onExpressReviewCapture}
      />
    );
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
        renderDeliveryExpressAction={(method, totalLabel) =>
          renderDeliveryExpressAction(method, "cart", totalLabel)
        }
        renderPayLaterMessage={(totalLabel, fallbackMessage) =>
          renderStorefrontPayLaterMessage({
            amountLabel: totalLabel,
            fallbackMessage,
            placement: "cart-summary",
          })
        }
        onQuantityChange={onCartQuantityChange}
      />
    );
  }

  if (route.page === "account") {
    return (
      <AccountPage
        addresses={accountAddresses}
        addressesStatus={accountAddressesStatus}
        email={accountEmail}
        orders={accountOrders}
        ordersStatus={accountOrdersStatus}
        savedPayments={savedPayments}
        savedPaymentsStatus={savedPaymentsStatus}
        selectedOrderNumber={
          route.section === "orders" ? (route.orderNumber ?? null) : null
        }
        section={route.section}
        onCreateAddress={onCreateAddress}
        onDeleteAddress={onDeleteAddress}
        onDeleteReview={onDeleteReview}
        onDeleteSavedPayment={onDeleteSavedPayment}
        onMakeDefaultAddress={onMakeDefaultAddress}
        onSubmitReview={onSubmitReview}
        onUpdateAddress={onUpdateAddress}
        onUpdateReview={onUpdateReview}
      />
    );
  }

  if (route.page === "guest_orders") {
    return (
      <GuestOrderLookupPage
        lookupError={guestOrderError}
        lookupStatus={guestOrderStatus}
        order={guestOrder}
        onLookup={onGuestOrderLookup}
      />
    );
  }

  if (route.page === "product") {
    const productPage = productPages[route.productSlug];

    return productPage ? (
      <ProductDetailPage
        data={productPage}
        onAddToCart={onAddProductToCart}
        renderDeliveryExpressAction={(method, product, amountLabel) =>
          renderDeliveryExpressAction(method, "product_detail", amountLabel)
        }
        renderPayLaterMessage={(product, fallbackMessage, amountLabel) =>
          renderStorefrontPayLaterMessage({
            amountLabel,
            fallbackMessage,
            placement: "product-detail",
          })
        }
      />
    ) : missingProductSlugs.has(route.productSlug) ? (
      <NotFoundStage />
    ) : (
      <ProductPendingStage />
    );
  }

  if (route.page === "catalog") {
    return (
      <CategoryPage
        data={categoryPageData}
        renderPayLaterPromoMessage={(promo) =>
          renderStorefrontPayLaterMessage({
            fallbackMessage: promo.body,
            placement: "catalog-promo",
          })
        }
      />
    );
  }

  if (route.page === "not_found") {
    return <NotFoundStage />;
  }

  return (
    <HomePage
      data={homePageData}
      renderPayLaterPromoMessage={(promo) =>
        renderStorefrontPayLaterMessage({
          fallbackMessage: promo.body,
          placement: "home-promo",
        })
      }
    />
  );
}

type CartBinding = Pick<CartData, "cartClientSecret" | "cartPublicId">;

const starterCartProductIdsBySlug: Readonly<Record<string, string>> = {
  "labubu-have-a-seat": "2399a35e-ea68-566d-a6cf-f6ad63425e05",
  "hirono-little-mischief": "579f3095-579d-5c95-9260-9ecdb5306b9c",
};

function resolveProductDetailCartProductId(
  product: ProductDetailPageData,
): string | undefined {
  return product.productId ?? starterCartProductIdsBySlug[product.slug];
}

function resolveApiClientDebugId(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("debugId" in error)) {
    return undefined;
  }

  const debugId = (error as { readonly debugId?: unknown }).debugId;
  return typeof debugId === "string" && debugId.trim() ? debugId : undefined;
}

function buildCartRequestOptions(
  cart: CartBinding,
  authSession?: BuyerAuthSession | null,
): ApiRequestOptions | undefined {
  const headers: Record<string, string> = {};

  if (authSession?.accessToken) {
    headers.authorization = `Bearer ${authSession.accessToken}`;
  }

  if (hasServerReadyCartBinding(cart)) {
    headers["x-cart-id"] = cart.cartPublicId;
    headers["x-cart-secret"] = cart.cartClientSecret;
  }

  if (Object.keys(headers).length === 0) {
    return undefined;
  }

  return {
    headers,
  };
}

function buildAuthRequestOptions(
  authSession: BuyerAuthSession,
): ApiRequestOptions {
  return {
    headers: {
      authorization: `Bearer ${authSession.accessToken}`,
    },
  };
}

function mapAccountSavedPayments(
  response: AccountSavedPaymentsApiResponse,
): readonly AccountSavedPaymentMethodView[] {
  return response.saved_payments.map((savedPayment) => ({
    id: savedPayment.id,
    brand: savedPayment.brand,
    expiryMonth: savedPayment.expiry_month,
    expiryYear: savedPayment.expiry_year,
    label: savedPayment.label,
    last4: savedPayment.last4,
    methodType: savedPayment.method_type === "card" ? "card" : "paypal_wallet",
    status: mapAccountSavedPaymentStatus(savedPayment.status),
  }));
}

function mapAccountSavedPaymentStatus(
  status: string,
): AccountSavedPaymentStatus {
  if (
    status === "active" ||
    status === "deleted" ||
    status === "disabled" ||
    status === "pending"
  ) {
    return status;
  }

  return "active";
}

function mapAccountAddresses(
  response: AccountAddressesApiResponse,
): readonly AccountAddressView[] {
  return response.addresses.map((address) => ({
    id: address.id,
    label: address.label,
    recipient_name: address.recipient_name,
    phone: address.phone,
    address_line1: address.address_line1,
    address_line2: address.address_line2,
    city: address.city,
    state: address.state,
    postal_code: address.postal_code,
    country_code: address.country_code,
    is_default_shipping: address.is_default_shipping,
    is_default_billing: address.is_default_billing,
  }));
}

function mapHomePageFromApiResponse(
  response: CatalogProductsApiResponse,
  fallback: HomePageData,
  locale: string,
): HomePageData {
  const products = Array.isArray(response.products)
    ? response.products.filter((product) => product.image_path)
    : [];
  const heroProduct = products[0];

  if (!heroProduct) {
    return fallback;
  }

  return {
    ...fallback,
    loading: false,
    hero: {
      ...fallback.hero,
      eyebrow: formatReleaseStatus(heroProduct.release_status),
      title: heroProduct.name,
      imagePath:
        heroProduct.image_path ?? "/assets/generic/products/placeholder.svg",
      imageAlt: `${heroProduct.name} collectible`,
      primaryCta: {
        href: `/products/${heroProduct.slug}`,
        label: "Shop featured drop",
      },
    },
    hotSales: products
      .slice(0, 4)
      .map((product, index) =>
        mapHomeProductCardFromApi(
          product,
          index === 0
            ? "Featured drop"
            : formatCategorySlug(product.category_slug),
          locale,
        ),
      ),
    categories: mapHomeCategoryCardsFromApi(products),
    calendar: {
      ...fallback.calendar,
      days: fallback.calendar.days.map((day, index) => {
        const product = products[index];

        return product ? { ...day, productSlugs: [product.slug] } : day;
      }),
      selectedProducts: products.slice(0, 3).map((product) => ({
        slug: product.slug,
        name: product.name,
        statusLabel: formatReleaseStatus(product.release_status),
        href: `/products/${product.slug}`,
      })),
    },
    popularSeries: mapHomeSeriesCardsFromApi(products),
  };
}

function mapHomeProductCardFromApi(
  product: CatalogProductApiItem,
  eyebrow: string,
  locale: string,
): HomePageProductCard {
  return {
    slug: product.slug,
    name: product.name,
    eyebrow,
    imagePath: product.image_path ?? "/assets/generic/products/placeholder.svg",
    imageAlt: `${product.name} collectible`,
    priceLabel: formatMinorMoney(
      product.price.current_price_minor,
      product.price.currency_code,
      locale,
    ),
    statusLabel: formatReleaseStatus(product.release_status),
    href: `/products/${product.slug}`,
  };
}

function mapHomeCategoryCardsFromApi(
  products: readonly CatalogProductApiItem[],
): readonly HomePageCategoryCard[] {
  const cards = new Map<string, HomePageCategoryCard>();

  for (const product of products) {
    if (cards.has(product.category_slug)) {
      continue;
    }

    const categoryName = formatCategorySlug(product.category_slug);
    cards.set(product.category_slug, {
      slug: product.category_slug,
      name: categoryName,
      description: `${categoryName} collectibles from the live catalog.`,
      imagePath:
        product.image_path ?? "/assets/generic/products/placeholder.svg",
      imageAlt: `${categoryName} category`,
      href: `/products?category=${encodeURIComponent(product.category_slug)}`,
    });
  }

  return [...cards.values()];
}

function mapHomeSeriesCardsFromApi(
  products: readonly CatalogProductApiItem[],
): readonly HomePageSeriesCard[] {
  return products.slice(0, 4).map((product) => ({
    name: product.name,
    imagePath: product.image_path ?? "/assets/generic/products/placeholder.svg",
    imageAlt: `${product.name} collectible`,
    href: `/products/${product.slug}`,
  }));
}

function reconcileCheckoutDataFromCart(
  data: CheckoutPageData,
  cart: CartData,
): CheckoutPageData {
  const merchandiseSubtotalMinor = cart.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
  const merchandiseSubtotalLabel = formatMinorMoney(
    merchandiseSubtotalMinor,
    cart.currencyCode,
    cart.locale,
  );
  const summaryItems = mapCheckoutSummaryItemsFromCart(cart);

  return {
    ...data,
    delivery: reconcileCheckoutDraftSummaryFromCart(
      data.delivery,
      merchandiseSubtotalLabel,
      summaryItems,
    ),
    pickup: reconcileCheckoutDraftSummaryFromCart(
      data.pickup,
      merchandiseSubtotalLabel,
      summaryItems,
    ),
  };
}

function reconcileCheckoutDraftSummaryFromCart<
  TDraft extends CheckoutPageData["delivery"],
>(
  draft: TDraft,
  merchandiseSubtotalLabel: string,
  items: readonly CheckoutSummaryItem[],
): TDraft {
  return {
    ...draft,
    summary: {
      ...draft.summary,
      items,
      subtotalLabel: merchandiseSubtotalLabel,
      totalLabel: merchandiseSubtotalLabel,
    },
  };
}

function mapCheckoutSummaryItemsFromCart(
  cart: CartData,
): readonly CheckoutSummaryItem[] {
  return cart.items.map((item) => ({
    id: item.id ?? item.slug,
    name: item.name,
    detailLabel: item.categoryName,
    imagePath: normalizeCheckoutSummaryImagePath(item),
    imageAlt: item.imageAlt,
    quantity: item.quantity,
    amountLabel: formatMinorMoney(
      item.unitPriceCents * item.quantity,
      cart.currencyCode,
      cart.locale,
    ),
  }));
}

function normalizeCheckoutSummaryImagePath(item: CartItem): string {
  if (item.imagePath.endsWith("/labubu-have-a-seat-1.svg")) {
    return "/assets/popmart/products/blind-boxes-1-1.png";
  }

  if (item.imagePath.endsWith("/hirono-little-mischief-1.svg")) {
    return "/assets/popmart/products/plush-11-1.png";
  }

  return item.imagePath;
}

function mapCategoryPageFromApiResponse(
  response: CatalogProductsApiResponse,
  fallback: CategoryPageData,
  locale: string,
  location: string,
): CategoryPageData {
  const searchParams = getSearchParamsFromLocation(location);
  const categorySwitcher = applyFilterOptionState(
    fallback.categorySwitcher,
    searchParams,
    "category",
  );
  const filters = fallback.filters.map((group) =>
    applyFilterOptionState(group, searchParams),
  );
  const sortOptions = fallback.sortOptions.map((option) => ({
    ...option,
    active: isCatalogFilterOptionActive(option.href, searchParams, {
      emptyStateParam: "sort",
    }),
  }));

  return {
    ...fallback,
    resultCountLabel:
      response.products.length === 1
        ? "1 product"
        : `${response.products.length} products`,
    appliedFilterCount: countAppliedFilters(categorySwitcher, filters),
    categorySwitcher,
    filters,
    sortOptions,
    products: response.products.map((product) =>
      mapCategoryProductFromApi(product, locale),
    ),
  };
}

function mapCategoryPageFallbackData(
  fallback: CategoryPageData,
  location: string,
): CategoryPageData {
  const searchParams = getSearchParamsFromLocation(location);
  const categorySwitcher = applyFilterOptionState(
    fallback.categorySwitcher,
    searchParams,
    "category",
  );
  const filters = fallback.filters.map((group) =>
    applyFilterOptionState(group, searchParams),
  );
  const sortOptions = fallback.sortOptions.map((option) => ({
    ...option,
    active: isCatalogFilterOptionActive(option.href, searchParams, {
      emptyStateParam: "sort",
    }),
  }));
  const products = filterFallbackCatalogProducts(
    fallback.products,
    searchParams,
  );

  return {
    ...fallback,
    resultCountLabel:
      products.length === 1 ? "1 product" : `${products.length} products`,
    appliedFilterCount: countAppliedFilters(categorySwitcher, filters),
    categorySwitcher,
    filters,
    sortOptions,
    products,
  };
}

function filterFallbackCatalogProducts(
  products: readonly CategoryPageProduct[],
  searchParams: URLSearchParams,
): readonly CategoryPageProduct[] {
  const category = getCatalogQueryValue(searchParams, "category");
  const query = getCatalogQueryValue(searchParams, "q");

  return products.filter(
    (product) =>
      (!category || slugifyCategoryLabel(product.categoryName) === category) &&
      (!query || fallbackProductMatchesSearch(product, query)),
  );
}

function fallbackProductMatchesSearch(
  product: CategoryPageProduct,
  query: string,
): boolean {
  return normalizedSearchTerms(query).every((term) =>
    normalizeSearchText(
      [
        product.name,
        product.slug,
        product.categoryName,
        product.statusLabel,
        product.pickupLabel,
        product.priceLabel,
        product.regularPriceLabel,
      ].join(" "),
    ).includes(term),
  );
}

function slugifyCategoryLabel(label: string): string {
  return label
    .toLowerCase()
    .replaceAll("&", "and")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/(^-|-$)/g, "");
}

function buildCatalogProductsQuery({
  location,
  market,
  profile,
}: {
  readonly location: string;
  readonly market: string;
  readonly profile: string;
}): ApiQueryParams {
  const searchParams = getSearchParamsFromLocation(location);
  const query: ApiQueryParams = {
    market,
    profile,
  };
  const category = getCatalogQueryValue(searchParams, "category");
  const price = getCatalogQueryValue(searchParams, "price");
  const availability = getCatalogQueryValue(searchParams, "availability");
  const releaseStatus = getCatalogQueryValue(searchParams, "release_status");
  const searchQuery = getCatalogQueryValue(searchParams, "q");
  const pickupAvailable = getCatalogQueryValue(
    searchParams,
    "pickup_available",
  );
  const sort = getCatalogQueryValue(searchParams, "sort");

  if (category) {
    query.category = category;
  }
  if (price === "under-20") {
    query.price_max = 1999;
  }
  if (price === "20-50") {
    query.price_min = 2000;
    query.price_max = 5000;
  }
  if (price === "50-up") {
    query.price_min = 5001;
  }
  if (availability === "in-stock") {
    query.availability = "available";
  }
  if (availability === "coming-soon") {
    query.release_status = "coming_soon";
  }
  if (releaseStatus === "not-released") {
    query.release_status = "unreleased";
  } else if (releaseStatus) {
    query.release_status = releaseStatus;
  }
  if (pickupAvailable === "true") {
    query.pickup_available = true;
  }
  if (sort === "price_asc" || sort === "price_desc") {
    query.sort = sort;
  }
  if (searchQuery) {
    query.q = searchQuery;
  }

  return query;
}

function applyFilterOptionState<
  TGroup extends
    | CategoryPageData["categorySwitcher"]
    | CategoryPageData["filters"][number],
>(
  group: TGroup,
  searchParams: URLSearchParams,
  emptyStateParam?: string,
): TGroup {
  const optionContext = emptyStateParam ? { emptyStateParam } : {};

  return {
    ...group,
    options: group.options.map((option) => ({
      ...option,
      active: isCatalogFilterOptionActive(
        option.href,
        searchParams,
        optionContext,
      ),
    })),
  };
}

function isCatalogFilterOptionActive(
  href: string,
  searchParams: URLSearchParams,
  {
    emptyStateParam,
  }: {
    readonly emptyStateParam?: string;
  } = {},
): boolean {
  const optionSearchParams = getSearchParamsFromLocation(href);
  const optionEntries = [...optionSearchParams.entries()];

  if (optionEntries.length === 0) {
    return emptyStateParam
      ? !getCatalogQueryValue(searchParams, emptyStateParam)
      : searchParams.toString() === "";
  }

  return optionEntries.every(
    ([key, value]) => getCatalogQueryValue(searchParams, key) === value,
  );
}

function countAppliedFilters(
  categorySwitcher: CategoryPageData["categorySwitcher"],
  filters: readonly CategoryPageData["filters"][number][],
): number {
  return [
    ...categorySwitcher.options,
    ...filters.flatMap((group) => group.options),
  ].filter((option) => option.href !== "/products" && option.active).length;
}

function getSearchParamsFromLocation(location: string): URLSearchParams {
  const searchStart = location.indexOf("?");
  if (searchStart === -1) {
    return new URLSearchParams();
  }

  const hashStart = location.indexOf("#", searchStart);
  return new URLSearchParams(
    location.slice(searchStart + 1, hashStart === -1 ? undefined : hashStart),
  );
}

function getCatalogQueryValue(
  searchParams: URLSearchParams,
  key: string,
): string | null {
  const value = searchParams.get(key)?.trim();
  return value ? value : null;
}

function buildCatalogSearchPath(query: string): string {
  if (!query) {
    return "/products";
  }

  const params = new URLSearchParams({ q: query });
  return `/products?${params.toString()}`;
}

function normalizedSearchTerms(query: string): readonly string[] {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseProductSlugFromUrl(productUrl: string | null): string | null {
  if (!productUrl) {
    return null;
  }

  const [pathname = ""] = productUrl.split(/[?#]/);
  const productPathPrefix = "/products/";
  const productPathStart = pathname.indexOf(productPathPrefix);

  if (productPathStart === -1) {
    return null;
  }

  const encodedSlug =
    pathname.slice(productPathStart + productPathPrefix.length).split("/")[0] ??
    "";

  if (!encodedSlug.trim()) {
    return null;
  }

  try {
    return decodeURIComponent(encodedSlug);
  } catch {
    return encodedSlug;
  }
}

function mapCategoryProductFromApi(
  product: CatalogProductApiItem,
  locale: string,
): CategoryPageProduct {
  const currentPriceLabel = formatMinorMoney(
    product.price.current_price_minor,
    product.price.currency_code,
    locale,
  );

  return {
    slug: product.slug,
    name: product.name,
    categoryName: formatCategorySlug(product.category_slug),
    imagePath: product.image_path ?? "/assets/generic/products/placeholder.svg",
    imageAlt: `${product.name} collectible`,
    priceLabel: currentPriceLabel,
    regularPriceLabel: formatMinorMoney(
      product.price.regular_price_minor,
      product.price.currency_code,
      locale,
    ),
    statusLabel: formatReleaseStatus(product.release_status),
    pickupLabel: formatInventoryLabel(product.inventory),
    href: `/products/${product.slug}`,
  };
}

function normalizeProductImageAltText(
  productName: string,
  altText: string | null | undefined,
): string {
  const normalizedAlt = altText?.trim();
  const isGenericAlt =
    !normalizedAlt ||
    /\b(?:image|picture|mock)\b/i.test(normalizedAlt) ||
    /\bview\s+\d+\b/i.test(normalizedAlt);

  return isGenericAlt
    ? `${productName} collectible on a pastel display`
    : normalizedAlt;
}

function mapProductDetailPageFromApiResponse(
  response: CatalogProductDetailApiResponse,
  locale: string,
  vendorName: string,
): ProductDetailPageData {
  const product = response.product;
  const currentPriceLabel = formatMinorMoney(
    product.price.current_price_minor,
    product.price.currency_code,
    locale,
  );
  const regularPriceLabel = formatMinorMoney(
    product.price.regular_price_minor,
    product.price.currency_code,
    locale,
  );
  const statusLabel = formatReleaseStatus(product.release_status);
  const gallery = product.images.map((image) => ({
    imagePath: image.image_path,
    imageAlt: normalizeProductImageAltText(product.name, image.alt_text),
    lowResolutionImagePath:
      image.low_resolution_image_path?.trim() || image.image_path,
    highResolutionImagePath:
      image.high_resolution_image_path?.trim() || image.image_path,
  }));
  const purchaseOptions = buildProductPurchaseOptions(
    product,
    currentPriceLabel,
    regularPriceLabel,
    locale,
  );
  const scarcitySignal = product.purchasable
    ? buildProductScarcitySignal(product)
    : undefined;
  const seriesLineup = buildProductSeriesLineup(product);

  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    categoryName: formatCategorySlug(product.category_slug),
    seriesName: product.series_name,
    vendorName,
    statusLabel,
    purchasable: product.purchasable,
    ...(product.purchasable
      ? {}
      : {
          unavailableReason: formatCheckoutBlockReason(
            product.checkout_block_reason,
          ),
        }),
    currentPriceLabel,
    regularPriceLabel,
    unitPriceCents: product.price.current_price_minor,
    maxQuantity: buildProductMaxQuantity(product),
    introduction: product.description,
    details: [
      { label: "Series", value: product.series_name },
      { label: "SKU", value: product.sku },
      { label: "Fulfillment", value: formatInventoryLabel(product.inventory) },
    ],
    gallery,
    mediaHighlights: buildProductMediaHighlights(product, gallery),
    ...(purchaseOptions ? { purchaseOptions } : {}),
    ...(scarcitySignal ? { scarcitySignal } : {}),
    story: buildProductStory(product),
    ...(seriesLineup ? { seriesLineup } : {}),
    specHighlights: buildProductSpecHighlights(product),
    trustBadges: buildProductTrustBadges(),
    socialProof: product.purchasable ? buildProductSocialProof(product) : [],
    recommendations: buildProductRecommendations(product, locale),
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: `Flexible payment options may be available for ${currentPriceLabel} at checkout.`,
    },
    reviews: product.reviews.visible
      ? product.reviews.items.map((review, index) => ({
          id:
            review.id?.trim() ||
            `${product.id}:review:${review.created_at ?? index}`,
          authorName: review.author_name?.trim() || "Collector",
          ratingLabel:
            typeof review.rating === "number"
              ? `${review.rating} out of 5`
              : "Review",
          title: review.title?.trim() || "Collector review",
          body: review.body?.trim() || "No review text provided.",
        }))
      : [],
  };
}

function buildProductMaxQuantity(
  product: CatalogProductDetailApiResponse["product"],
): number {
  const requestedCap = isBlindBoxProduct(product) ? 12 : 1;

  return Math.max(product.max_quantity_per_order, requestedCap);
}

function buildProductPurchaseOptions(
  product: CatalogProductDetailApiResponse["product"],
  currentPriceLabel: string,
  regularPriceLabel: string,
  locale: string,
) {
  if (!isBlindBoxProduct(product)) {
    return undefined;
  }

  const wholeBoxQuantity = 12;
  const wholeBoxMinor = Math.round(
    product.price.current_price_minor * wholeBoxQuantity * 0.95,
  );
  const wholeBoxRegularMinor =
    product.price.current_price_minor * wholeBoxQuantity;

  return [
    {
      id: "random-1pc",
      label: "Random 1PC",
      description: "One sealed blind box selected at random.",
      priceLabel: currentPriceLabel,
      regularPriceLabel,
      quantity: 1,
      badgeLabel: "Single box",
      ctaLabel: "Add to cart",
    },
    {
      id: "whole-box-12pc",
      label: "Whole Box - 12PC no duplicates",
      description: "Full demo box format for collectors who want the set.",
      priceLabel: formatMinorMoney(
        wholeBoxMinor,
        product.price.currency_code,
        locale,
      ),
      regularPriceLabel: formatMinorMoney(
        wholeBoxRegularMinor,
        product.price.currency_code,
        locale,
      ),
      quantity: wholeBoxQuantity,
      badgeLabel: "Best value",
      valueLabel: "5% bundle saving",
      ctaLabel: "Add whole box",
    },
  ];
}

function buildProductScarcitySignal(
  product: CatalogProductDetailApiResponse["product"],
) {
  const seed = [...product.slug].reduce((total, char) => {
    return total + char.charCodeAt(0);
  }, 0);
  const remaining = 6 + (seed % 17);
  const viewers = 24 + (seed % 31);

  return {
    stockLabel: `Only ${remaining} left in this demo drop`,
    viewerLabel: `${viewers} collectors are viewing this item`,
  };
}

function buildProductMediaHighlights(
  product: CatalogProductDetailApiResponse["product"],
  gallery: ProductDetailPageData["gallery"],
) {
  const primaryImage = gallery[0];

  return [
    ...(primaryImage
      ? [
          {
            id: "front-render",
            label: "Front render",
            description: "Current generated catalog image",
            imagePath: primaryImage.imagePath,
            imageAlt: primaryImage.imageAlt,
            kind: "image" as const,
          },
        ]
      : []),
    {
      id: "size-comparison",
      label: "Size comparison",
      description: isBlindBoxProduct(product)
        ? "8-10cm demo spec"
        : "Demo scale",
      kind: "image" as const,
    },
    {
      id: "package-view",
      label: "Package view",
      description: "Asset slot for box exterior",
      kind: "image" as const,
    },
    {
      id: "secret-silhouette",
      label: "Secret silhouette",
      description: "Hidden figure preview slot",
      kind: "silhouette" as const,
    },
    {
      id: "material-clip",
      label: "Material detail",
      description: "Short-video slot",
      kind: "video" as const,
    },
  ];
}

function buildProductStory(
  product: CatalogProductDetailApiResponse["product"],
) {
  const seriesName = product.series_name || "Collector";

  return {
    eyebrow: `${seriesName} story`,
    title: `${product.name} collector note`,
    body: isMollyProduct(product)
      ? "In this demo merchandising story, Molly is framed as a curious little artist exploring color, tiny props, and gallery-day surprises. The goal is to make the blind-box reveal feel emotional without implying official character lore beyond the seeded demo catalog."
      : `This demo story frames ${product.name} as a shelf-friendly collectible with a clear character moment, display value, and surprise-driven appeal.`,
  };
}

function buildProductSeriesLineup(
  product: CatalogProductDetailApiResponse["product"],
) {
  if (!isBlindBoxProduct(product)) {
    return undefined;
  }

  const lineupNames = [
    "Canvas Molly",
    "Color Mixer",
    "Gallery Day",
    "Sketchbook",
    "Tiny Easel",
    "Brush Case",
    "Studio Light",
    "Apron Day",
    "Paint Splash",
    "Quiet Muse",
    "Frame Shop",
    "Collector Shelf",
    "Secret Silhouette",
  ];

  return {
    title: "Series lineup",
    subtitle: "12 regular demo styles plus 1 secret-style slot.",
    secretOddsLabel: "Secret odds 1:144",
    items: lineupNames.map((name, index) => ({
      name,
      typeLabel: index === lineupNames.length - 1 ? "Secret" : "Regular",
      ...(index < 5
        ? {
            imagePath: `/assets/popmart/products/blind-boxes-${index + 1}-1.png`,
            imageAlt: `${name} demo lineup collectible`,
          }
        : {}),
    })),
  };
}

function buildProductSpecHighlights(
  product: CatalogProductDetailApiResponse["product"],
) {
  return [
    {
      label: "Material",
      value: isBlindBoxProduct(product) ? "PVC / ABS demo spec" : "Mixed media",
    },
    {
      label: "Height",
      value: isBlindBoxProduct(product)
        ? "Approx. 8-10 cm"
        : "See product data",
    },
    {
      label: "Age",
      value: "15+ collector demo",
    },
    {
      label: "Box type",
      value: isBlindBoxProduct(product) ? "Sealed blind box" : "Retail box",
    },
  ];
}

function buildProductTrustBadges() {
  return [
    {
      title: "PayPal checkout",
      body: "Official PayPal buttons and messages render when eligible.",
    },
    {
      title: "Delivery choices",
      body: "Shipping and pickup choices are confirmed during checkout.",
    },
    {
      title: "Order recovery",
      body: "Buyers can track or recover orders after checkout.",
    },
    {
      title: "Demo policies",
      body: "Final shipping and return handling stay visible before payment.",
    },
  ];
}

function buildProductSocialProof(
  product: CatalogProductDetailApiResponse["product"],
) {
  if (!isBlindBoxProduct(product)) {
    return [];
  }

  return [
    {
      id: `${product.slug}-unboxing-1`,
      mediaLabel: "Photo unboxing",
      title: "Reveal moment feels clear",
      body: "Seeded demo social proof showing the buyer value of a visible unboxing moment and product-scale context.",
      authorName: "Demo collector",
    },
    {
      id: `${product.slug}-clip-1`,
      mediaLabel: "Short clip",
      title: "Material detail cue",
      body: "Video-style proof slot for future close-up media without replacing the official PayPal purchase surfaces.",
      authorName: "Demo studio",
    },
  ];
}

function buildProductRecommendations(
  product: CatalogProductDetailApiResponse["product"],
  locale: string,
) {
  if (!isBlindBoxProduct(product)) {
    return [];
  }

  const recommendationSeeds = [
    {
      slug: "blind-boxes-1",
      name: "Midnight Carnival Blind Box",
      eyebrow: "Blind Boxes",
      priceMinor: 1599,
    },
    {
      slug: "blind-boxes-3",
      name: "Sky Wanderer Blind Box",
      eyebrow: "Blind Boxes",
      priceMinor: 1599,
    },
    {
      slug: "blind-boxes-4",
      name: "Cosmic Explorer Blind Box",
      eyebrow: "Blind Boxes",
      priceMinor: 1699,
    },
    {
      slug: "accessories-21",
      name: "Protective Showcase",
      eyebrow: "Accessories",
      priceMinor: 999,
    },
  ];

  return recommendationSeeds
    .filter((recommendation) => recommendation.slug !== product.slug)
    .map((recommendation) => ({
      slug: recommendation.slug,
      name: recommendation.name,
      eyebrow: recommendation.eyebrow,
      priceLabel: formatMinorMoney(
        recommendation.priceMinor,
        product.price.currency_code,
        locale,
      ),
      imagePath: `/assets/popmart/products/${recommendation.slug}-1.png`,
      imageAlt: `${recommendation.name} generated demo product`,
      href: `/products/${recommendation.slug}`,
    }));
}

function isBlindBoxProduct(
  product: Pick<CatalogProductApiItem, "category_slug" | "name">,
): boolean {
  return (
    product.category_slug === "blind-boxes" ||
    product.name.toLowerCase().includes("blind box")
  );
}

function isMollyProduct(
  product: Pick<CatalogProductApiItem, "name"> & {
    readonly series_name?: string;
  },
): boolean {
  return `${product.name} ${product.series_name ?? ""}`
    .toLowerCase()
    .includes("molly");
}

function formatCategorySlug(categorySlug: string): string {
  return categorySlug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatReleaseStatus(releaseStatus: string): string {
  if (releaseStatus === "released") {
    return "Released";
  }
  if (releaseStatus === "coming_soon") {
    return "Coming soon";
  }
  return "Not released";
}

function formatInventoryLabel(
  inventory: CatalogProductApiItem["inventory"],
): string {
  if (inventory.pickup_available) {
    return "Pickup eligible";
  }
  if (inventory.delivery_available) {
    return "Delivery only";
  }
  return "Pickup soon";
}

function formatCheckoutBlockReason(reason: string | null | undefined): string {
  if (reason === "not_released") {
    return "This collectible is not released yet.";
  }
  if (reason === "out_of_stock") {
    return "This collectible is currently out of stock.";
  }
  return "This collectible is not available for checkout.";
}

function mapAccountOrders(
  orders: readonly AccountOrderApiItem[],
  locale: string,
): readonly AccountOrderView[] {
  return orders.map((order) => mapAccountOrder(order, locale));
}

function mapAccountOrder(
  order: AccountOrderApiItem,
  locale: string,
): AccountOrderView {
  return {
    orderNumber: order.order_number,
    placedDateLabel: `Placed ${formatAccountDate(order.placed_at, locale)}`,
    fulfillmentMode: order.fulfillment_mode,
    status: mapAccountOrderStatus(order.status),
    fulfillmentLabel: order.fulfillment_label,
    paymentStatusLabel: formatAccountPaymentStatus(order.payment_status),
    totalLabel: formatMinorMoney(
      order.totals.total_minor,
      order.currency_code,
      locale,
    ),
    note: buildAccountOrderNote(order),
    items: order.items.map((item) => ({
      id: item.id,
      imageAlt: `${item.product_name} collectible`,
      imagePath:
        item.product_image_url ??
        "/assets/popmart/products/labubu-have-a-seat-1.svg",
      lineTotalLabel: formatMinorMoney(
        item.line_total_minor,
        order.currency_code,
        locale,
      ),
      name: item.product_name,
      quantity: item.quantity,
      review: item.review
        ? {
            body: item.review.body,
            rating: item.review.rating,
            title: item.review.title,
          }
        : null,
      reviewEligible: item.review_eligible,
      reviewSubmitted: item.review_submitted,
    })),
    timeline: order.timeline.map((step) => ({
      description: step.description,
      label: step.label,
      status: step.status,
    })),
    totals: [
      {
        label: "Merchandise",
        value: formatMinorMoney(
          order.totals.subtotal_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Promo",
        value:
          order.totals.discount_minor > 0
            ? `-${formatMinorMoney(
                order.totals.discount_minor,
                order.currency_code,
                locale,
              )}`
            : formatMinorMoney(0, order.currency_code, locale),
      },
      {
        label: "Tax",
        value: formatMinorMoney(
          order.totals.tax_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Shipping",
        value: formatMinorMoney(
          order.totals.shipping_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Total",
        value: formatMinorMoney(
          order.totals.total_minor,
          order.currency_code,
          locale,
        ),
      },
    ],
  };
}

function mapGuestOrder(
  order: GuestOrderApiItem,
  locale: string,
): GuestOrderView {
  return {
    orderNumber: order.order_number,
    fulfillmentMode: order.fulfillment_mode,
    status: mapAccountOrderStatus(order.status),
    paymentStatusLabel: formatAccountPaymentStatus(order.payment_status),
    totalLabel: formatMinorMoney(
      order.totals.total_minor,
      order.currency_code,
      locale,
    ),
    note: order.review_eligible
      ? "This completed guest order can be linked to an account before reviews are submitted."
      : "Guest orders are read-only until they are linked to an account.",
    addresses: order.addresses.map((address) => ({
      addressType: address.address_type,
      city: address.city,
      countryCode: address.country_code,
      postalCode: address.postal_code ?? null,
      recipientName: address.recipient_name?.trim() || "Guest buyer",
      state: address.state ?? null,
    })),
    items: order.items.map((item) => ({
      imageAlt: `${item.product_name} collectible`,
      imagePath:
        item.product_image_url ??
        "/assets/popmart/products/labubu-have-a-seat-1.svg",
      lineTotalLabel: formatMinorMoney(
        item.line_total_minor,
        order.currency_code,
        locale,
      ),
      name: item.product_name,
      quantity: item.quantity,
    })),
    totals: [
      {
        label: "Merchandise",
        value: formatMinorMoney(
          order.totals.subtotal_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Promo",
        value:
          order.totals.discount_minor > 0
            ? `-${formatMinorMoney(
                order.totals.discount_minor,
                order.currency_code,
                locale,
              )}`
            : formatMinorMoney(0, order.currency_code, locale),
      },
      {
        label: "Tax",
        value: formatMinorMoney(
          order.totals.tax_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Shipping",
        value: formatMinorMoney(
          order.totals.shipping_minor,
          order.currency_code,
          locale,
        ),
      },
      {
        label: "Total",
        value: formatMinorMoney(
          order.totals.total_minor,
          order.currency_code,
          locale,
        ),
      },
    ],
  };
}

function mapAccountOrderStatus(status: string): AccountOrderView["status"] {
  if (
    status === "cancelled" ||
    status === "delivered" ||
    status === "paid" ||
    status === "pending" ||
    status === "picked_up" ||
    status === "preparing_pickup" ||
    status === "processing" ||
    status === "ready_for_pickup" ||
    status === "shipped"
  ) {
    return status;
  }

  return "processing";
}

function buildAccountOrderNote(order: AccountOrderApiItem): string {
  if (order.status === "pending") {
    return "Totals and offers refresh before payment.";
  }

  if (order.review_eligible) {
    return "Review eligible items from this completed order.";
  }

  return "Order activity and fulfillment status are up to date.";
}

function formatAccountPaymentStatus(status: string): string {
  if (status === "captured") {
    return "Paid with PayPal";
  }

  if (status === "started") {
    return "Payment pending";
  }

  return status
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatAccountDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatMinorMoney(
  amountMinor: number,
  currencyCode: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    currency: currencyCode,
    style: "currency",
  }).format(amountMinor / 100);
}

function parseMoneyLabelToMinor(value: string): number | null {
  const normalizedValue = value.replace(/[^0-9.]/g, "");
  const amount = Number(normalizedValue);

  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function shouldSeedStarterCart(
  starterCart: CartData,
  response: CartApiResponse,
  serverCart: CartData,
): boolean {
  return (
    starterCart.items.length > 0 &&
    serverCart.items.length === 0 &&
    Array.isArray(response.cart?.items) &&
    response.cart.items.length === 0 &&
    hasServerReadyCartBinding(serverCart)
  );
}

async function seedStarterCart({
  apiClient,
  config,
  serverCart,
  starterCart,
}: {
  readonly apiClient: ApiClient;
  readonly config: StorefrontRuntimeConfig;
  readonly serverCart: CartData;
  readonly starterCart: CartData;
}): Promise<CartData> {
  let nextCart = serverCart;

  for (const item of starterCart.items) {
    const productId = resolveStarterCartProductId(item);

    if (!productId || item.quantity <= 0) {
      continue;
    }

    const response = await apiClient.post<CartApiResponse>(
      "/api/cart/items",
      {
        product_id: productId,
        quantity: item.quantity,
      },
      {
        market: config.market.code,
      },
      buildCartRequestOptions(nextCart),
    );
    nextCart = reconcileCartDataForStorefront(nextCart, response, starterCart);
  }

  return nextCart;
}

function reconcileCartDataForStorefront(
  cart: CartData,
  response: CartApiResponse,
  starterCart?: CartData,
): CartData {
  const reconciledCart = reconcileCartDataFromApiResponse(cart, response);

  return starterCart
    ? applyStarterCartQuantityConstraints(reconciledCart, starterCart)
    : reconciledCart;
}

function applyStarterCartProductIds(cart: CartData): CartData {
  return {
    ...cart,
    items: cart.items.map((item) => {
      const productId = starterCartProductIdsBySlug[item.slug];

      return productId ? { ...item, productId } : item;
    }),
  };
}

function applyStarterCartQuantityConstraints(
  cart: CartData,
  starterCart: CartData,
): CartData {
  const starterItemsByProductId = new Map(
    starterCart.items
      .filter((item) => item.productId)
      .map((item) => [item.productId as string, item]),
  );

  return {
    ...cart,
    items: cart.items.map((item) => {
      const starterItem = item.productId
        ? starterItemsByProductId.get(item.productId)
        : undefined;

      return starterItem
        ? {
            ...item,
            maxQuantity: Math.max(
              item.maxQuantity,
              starterItem.maxQuantity,
              item.quantity,
            ),
          }
        : item;
    }),
  };
}

function resolveStarterCartProductId(item: CartItem): string | undefined {
  return starterCartProductIdsBySlug[item.slug] ?? item.productId;
}

function hasServerReadyCartBinding(
  cart: CartBinding,
): cart is Required<CartBinding> {
  return Boolean(cart.cartPublicId?.trim() && cart.cartClientSecret?.trim());
}

function hasCartApiAccess(
  cart: CartBinding,
  authSession: BuyerAuthSession | null | undefined,
): boolean {
  return Boolean(authSession?.accessToken || hasServerReadyCartBinding(cart));
}

class CartBindingIncompleteError extends Error {
  constructor() {
    super("Cart binding is incomplete.");
    this.name = "CartBindingIncompleteError";
  }
}

function readStoredCartBinding(
  config: StorefrontRuntimeConfig,
): CartBinding | null {
  const storage = getBrowserStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(cartBindingStorageKey(config));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      readonly cart_client_secret?: unknown;
      readonly cart_public_id?: unknown;
    };
    const cartPublicId =
      typeof parsed.cart_public_id === "string"
        ? parsed.cart_public_id.trim()
        : "";
    const cartClientSecret =
      typeof parsed.cart_client_secret === "string"
        ? parsed.cart_client_secret.trim()
        : "";

    return cartPublicId && cartClientSecret
      ? {
          cartPublicId,
          cartClientSecret,
        }
      : null;
  } catch {
    return null;
  }
}

function syncStoredCartBinding(
  config: StorefrontRuntimeConfig,
  cart: CartData,
) {
  if (!cart.cartPublicId || !cart.cartClientSecret) {
    clearStoredCartBinding(config);
    return;
  }

  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      cartBindingStorageKey(config),
      JSON.stringify({
        cart_public_id: cart.cartPublicId,
        cart_client_secret: cart.cartClientSecret,
      }),
    );
  } catch {
    // Storage can be unavailable in private or SSR-like contexts.
  }
}

function clearStoredCartBinding(config: StorefrontRuntimeConfig) {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(cartBindingStorageKey(config));
  } catch {
    // Storage can be unavailable in private or SSR-like contexts.
  }
}

function cartBindingStorageKey(config: StorefrontRuntimeConfig): string {
  return `paypal-retail-demo:cart-binding:${config.profile.slug}:${config.market.code}`;
}

function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

async function sendCheckoutDraftUpdate(
  apiClient: ApiClient,
  config: StorefrontRuntimeConfig,
  request: CheckoutDraftUpdateRequest,
  cart: CartData,
  authSession: BuyerAuthSession | null | undefined,
): Promise<CheckoutDraftApiResponse> {
  const draftPath = `/api/checkout/drafts/${encodeURIComponent(
    request.draftId ?? "",
  )}`;
  const query = {
    market: config.market.code,
  };
  const requestOptions = buildCartRequestOptions(cart, authSession);

  switch (request.type) {
    case "delivery_shipping_address":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/shipping-address`,
        buildAddressBody(request.fields, config, {
          addressLine2Label: "Apt, suite, or building",
          cityLabel: "City",
          firstNameLabel: "First name",
          fallbackNameLabel: "Full name",
          lastNameLabel: "Last name",
          nameLabel: "Full name",
          phoneLabel: "Phone number",
          postalCodeLabel: "ZIP code",
          stateLabel: "State",
          streetLabel: "Street address",
        }),
        query,
        requestOptions,
      );
    case "delivery_billing_address":
      return apiClient.patch<CheckoutDraftApiResponse>(
        `${draftPath}/billing-address`,
        buildBillingAddressBody(request.fields, config),
        query,
        requestOptions,
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
        requestOptions,
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
        requestOptions,
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
        requestOptions,
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
        requestOptions,
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
        requestOptions,
      );
  }
}

async function ensureCheckoutDraft({
  authSession,
  apiClient,
  cart,
  config,
  currentData,
  fulfillmentMode,
  requestedDraftId,
}: {
  readonly apiClient: ApiClient;
  readonly authSession: BuyerAuthSession | null | undefined;
  readonly cart: CartData;
  readonly config: StorefrontRuntimeConfig;
  readonly currentData: CheckoutPageData;
  readonly fulfillmentMode: CheckoutDraftUpdateRequest["fulfillmentMode"];
  readonly requestedDraftId: string | null;
}): Promise<{
  readonly draftId: string | null;
  readonly nextData: CheckoutPageData;
}> {
  if (isServerCheckoutDraftId(requestedDraftId)) {
    return {
      draftId: requestedDraftId,
      nextData: currentData,
    };
  }

  const response = await apiClient.post<CheckoutDraftApiResponse>(
    "/api/checkout/drafts",
    {
      fulfillment_mode: fulfillmentMode,
    },
    {
      market: config.market.code,
    },
    buildCartRequestOptions(cart, authSession),
  );
  const nextData = reconcileCheckoutDataFromDraftResponse(
    currentData,
    response,
  );
  const draftId =
    fulfillmentMode === "delivery"
      ? nextData.delivery.checkoutDraftId
      : nextData.pickup.checkoutDraftId;
  const serverDraftId = isServerCheckoutDraftId(draftId) ? draftId : null;

  return {
    draftId: serverDraftId,
    nextData,
  };
}

function isServerCheckoutDraftId(
  draftId: string | null | undefined,
): draftId is string {
  return (
    typeof draftId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      draftId,
    )
  );
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
      fallbackNameLabel: "Full name",
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
    readonly firstNameLabel?: string;
    readonly lastNameLabel?: string;
    readonly fallbackNameLabel?: string;
    readonly streetLabel: string;
    readonly addressLine2Label?: string;
    readonly cityLabel: string;
    readonly stateLabel: string;
    readonly postalCodeLabel: string;
    readonly phoneLabel?: string;
  },
) {
  return {
    address_line1: getSubmittedFieldValue(fields, labels.streetLabel),
    address_line2: getOptionalSubmittedFieldValue(
      fields,
      labels.addressLine2Label,
    ),
    city: getSubmittedFieldValue(fields, labels.cityLabel),
    country_code: config.market.code,
    county: null,
    phone: getOptionalSubmittedFieldValue(fields, labels.phoneLabel),
    postal_code: getSubmittedFieldValue(fields, labels.postalCodeLabel),
    recipient_name: getSubmittedRecipientName(fields, labels),
    state: getSubmittedFieldValue(fields, labels.stateLabel) || null,
  };
}

function getSubmittedRecipientName(
  fields: readonly CheckoutSubmittedField[],
  labels: {
    readonly nameLabel: string;
    readonly firstNameLabel?: string;
    readonly lastNameLabel?: string;
    readonly fallbackNameLabel?: string;
  },
): string {
  const splitName = [
    getSubmittedFieldValue(fields, labels.firstNameLabel),
    getSubmittedFieldValue(fields, labels.lastNameLabel),
  ]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .join(" ");

  return (
    splitName ||
    getSubmittedFieldValue(fields, labels.nameLabel) ||
    getSubmittedFieldValue(fields, labels.fallbackNameLabel) ||
    "Pickup buyer"
  );
}

function getSubmittedFieldValue(
  fields: readonly CheckoutSubmittedField[],
  label: string | undefined,
): string {
  if (!label) {
    return "";
  }

  const value = fields.find((field) => field.label === label)?.value;
  return typeof value === "string" ? value : "";
}

function getOptionalSubmittedFieldValue(
  fields: readonly CheckoutSubmittedField[],
  label: string | undefined,
): string | null {
  const value = getSubmittedFieldValue(fields, label).trim();

  return value.length > 0 ? value : null;
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

function parseExpressReviewLookup(
  location: string,
): ExpressReviewLookup | null {
  const queryStart = location.indexOf("?");
  if (queryStart < 0) {
    return null;
  }

  const params = new URLSearchParams(location.slice(queryStart));
  const paypalOrderId = params.get("paypal_order_id")?.trim();
  const paymentSessionId = params.get("payment_session_id")?.trim();

  if (paypalOrderId) {
    return {
      paypal_order_id: paypalOrderId,
    };
  }

  return paymentSessionId
    ? {
        payment_session_id: paymentSessionId,
      }
    : null;
}

function buildExpressReviewPath(
  context: DeliveryExpressApprovedContext,
): string {
  const params = new URLSearchParams({
    paypal_order_id: context.paypalOrderId,
  });

  if (context.paymentSessionId) {
    params.set("payment_session_id", context.paymentSessionId);
  }

  return `/checkout/express-review?${params.toString()}`;
}

function renderDeliveryExpressAction({
  authSession,
  cart,
  config,
  method,
  onApproved,
  onBeforeCreateOrder,
  source,
  totalLabel,
}: {
  readonly authSession?: BuyerAuthSession | null | undefined;
  readonly cart: CartData;
  readonly config: StorefrontRuntimeConfig;
  readonly method: DeliveryExpressPaymentMethod;
  readonly onApproved: (
    context: DeliveryExpressApprovedContext,
  ) => void | Promise<void>;
  readonly onBeforeCreateOrder: () =>
    | DeliveryExpressCreateOrderCartContext
    | Promise<DeliveryExpressCreateOrderCartContext | void>
    | void;
  readonly source: DeliveryExpressSource;
  readonly totalLabel: string;
}) {
  const requestOptions = buildCartRequestOptions(cart, authSession);

  if (!hasCartApiAccess(cart, authSession) || !cart.cartPublicId?.trim()) {
    if (method === "paylater") {
      return null;
    }

    return (
      <StatusRegion
        id={`delivery-express-${source}-missing-cart`}
        tone="assertive"
      >
        Cart is refreshing before delivery express checkout.
      </StatusRegion>
    );
  }

  return (
    <PayPalSdkProviderScope
      key={`${config.paypal.providerKey}:express:${source}:${method}`}
      providerKey={config.paypal.providerKey}
      configRequest={{
        market: config.market.code,
        pageType: "checkout",
        flow: "standard",
        method,
      }}
    >
      <DeliveryExpressAction
        cartClientSecret={cart.cartClientSecret}
        cartPublicId={cart.cartPublicId}
        currencyCode={config.market.currencyCode}
        market={config.market.code}
        method={method}
        onApproved={onApproved}
        onBeforeCreateOrder={onBeforeCreateOrder}
        requestOptions={requestOptions}
        source={source}
        totalLabel={totalLabel}
      />
    </PayPalSdkProviderScope>
  );
}

function renderCheckoutPaymentAction({
  authSession,
  cart,
  config,
  context,
  onApproved,
}: {
  readonly authSession?: BuyerAuthSession | null | undefined;
  readonly cart: CartData;
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
  readonly onApproved: (
    context: CheckoutApprovedPaymentContext,
  ) => Promise<void>;
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
  const requestOptions = buildCartRequestOptions(cart, authSession);

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
          requestOptions={requestOptions}
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
          onApproved={onApproved}
          requestOptions={requestOptions}
          totalLabel={context.totalLabel}
        />
      ) : (
        <PayPalStandaloneAction
          canSavePaymentMethod={context.saveForFutureEligible}
          checkoutDraftId={context.checkoutDraftId}
          fulfillmentMode={context.fulfillmentMode}
          market={config.market.code}
          onApproved={onApproved}
          requestOptions={requestOptions}
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
  authSession,
  cart,
  config,
  context,
  onApproved,
}: {
  readonly authSession?: BuyerAuthSession | null | undefined;
  readonly cart: CartData;
  readonly config: StorefrontRuntimeConfig;
  readonly context: CheckoutPaymentActionContext;
  readonly onApproved: (
    context: CheckoutApprovedPaymentContext,
  ) => Promise<void>;
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
        onApproved={onApproved}
        requestOptions={buildCartRequestOptions(cart, authSession)}
      />
    </PayPalSdkProviderScope>
  );
}

function renderStorefrontPayLaterMessage({
  amountLabel,
  config,
  fallbackMessage,
  placement,
}: StorefrontPayLaterMessageContext & {
  readonly config: StorefrontRuntimeConfig;
}) {
  return (
    <div className="paylater-message-stack">
      <PayPalSdkProviderScope
        key={`${config.paypal.providerKey}:${placement}:paylater-message`}
        providerKey={config.paypal.providerKey}
        configRequest={{
          market: config.market.code,
          pageType: "checkout",
          flow: "standard",
          method: "paylater",
        }}
        fallback={
          <p className="paylater-message-fallback">{fallbackMessage}</p>
        }
      >
        <PayLaterAmountMessage
          {...(amountLabel ? { amountLabel } : {})}
          buyerCountry={resolvePayLaterBuyerCountry(config)}
          currencyCode={config.market.currencyCode}
          fallbackMessage={fallbackMessage}
          placement={placement}
        />
      </PayPalSdkProviderScope>
    </div>
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

function ProductPendingStage() {
  return (
    <section className="route-stage route-stage--loading" aria-busy="true">
      <p className="route-stage__eyebrow">Loading</p>
      <h1>Loading product details</h1>
      <div className="route-stage__skeleton" aria-hidden="true">
        <Skeleton className="route-stage__skeleton-line route-stage__skeleton-line--short" />
        <Skeleton className="route-stage__skeleton-line" />
        <div className="route-stage__skeleton-grid">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    </section>
  );
}

function AdminShell({
  route,
  apiClient,
  token,
  initialConfig,
  onLogout,
  session,
  isLoggingOut,
}: {
  readonly route: Extract<AppRoute, { readonly scope: "admin" }>;
  readonly apiClient: ApiClient;
  readonly token: string;
  readonly initialConfig: StorefrontRuntimeConfig;
  readonly onLogout: () => Promise<void> | void;
  readonly session: AdminSessionInfo | null;
  readonly isLoggingOut: boolean;
}) {
  const [activeConfig, setActiveConfig] =
    useState<StorefrontRuntimeConfig>(initialConfig);
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    resolveAdminProfileOption(activeConfig.profile.slug).id,
  );
  const [selectedMarketId, setSelectedMarketId] = useState<string>(
    resolveAdminMarketOption(activeConfig.market.code).id,
  );
  const [switchState, setSwitchState] = useState<{
    readonly status: "idle" | "saving" | "saved" | "error";
    readonly message: string;
  }>({
    status: "idle",
    message: "Profile and market changes apply to new storefront context.",
  });
  const [ordersState, setOrdersState] = useState<{
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly orders: readonly AdminOrderSummaryResponse[];
    readonly message: string;
  }>({
    status: "idle",
    orders: [],
    message: "Order lifecycle controls are loaded from the Admin API.",
  });
  const [selectedOrder, setSelectedOrder] = useState<
    AdminOrderDetailResponse["order"] | null
  >(null);
  const [selectedOrderState, setSelectedOrderState] = useState<{
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly message: string;
  }>({
    status: "idle",
    message: "Select an order to inspect items, addresses, and timeline.",
  });
  const [lifecycleState, setLifecycleState] = useState<{
    readonly status: "idle" | "saving" | "saved" | "error";
    readonly message: string;
  }>({
    status: "idle",
    message: "Manual lifecycle actions follow delivery and pickup rules.",
  });
  const [inventoryState, setInventoryState] = useState<{
    readonly status:
      | "idle"
      | "loading"
      | "ready"
      | "saving"
      | "saved"
      | "error";
    readonly inventory: readonly AdminInventoryItemResponse[];
    readonly message: string;
  }>({
    status: "idle",
    inventory: [],
    message: "Inventory controls are loaded from the Admin API.",
  });
  const [pickupDateState, setPickupDateState] = useState<{
    readonly status:
      | "idle"
      | "loading"
      | "ready"
      | "saving"
      | "saved"
      | "error";
    readonly pickupDates: readonly AdminPickupDateResponse[];
    readonly message: string;
  }>({
    status: "idle",
    pickupDates: [],
    message: "Pickup-date controls are loaded from the Admin API.",
  });
  const [webhookState, setWebhookState] = useState<{
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly webhooks: readonly AdminWebhookEventResponse[];
    readonly message: string;
  }>({
    status: "idle",
    webhooks: [],
    message: "Webhook events are loaded from the Admin API.",
  });
  const [paymentDebugState, setPaymentDebugState] = useState<{
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly paymentSessions: readonly AdminPaymentDebugSessionResponse[];
    readonly message: string;
  }>({
    status: "idle",
    paymentSessions: [],
    message: "Payment debug sessions are loaded from the Admin API.",
  });
  const [runtimeDebugLogState, setRuntimeDebugLogState] = useState<{
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly logs: readonly AdminRuntimeDebugLogResponse[];
    readonly message: string;
  }>({
    status: "idle",
    logs: [],
    message: "Runtime debug logs are loaded from the Admin API.",
  });
  const [inventoryDrafts, setInventoryDrafts] = useState<
    Readonly<Record<string, string>>
  >({});
  const [pickupDateDrafts, setPickupDateDrafts] = useState<
    Readonly<
      Record<
        string,
        {
          readonly capacity?: string;
          readonly isAvailable?: boolean;
        }
      >
    >
  >({});

  useEffect(() => {
    let isCancelled = false;

    async function loadAdminOrders() {
      setOrdersState((current) => ({
        ...current,
        status: "loading",
        message: "Loading admin orders.",
      }));

      try {
        const response = await apiClient.get<AdminOrderListResponse>(
          "/api/admin/orders",
          undefined,
          {
            headers: {
              "x-admin-session": token,
            },
          },
        );

        if (isCancelled) {
          return;
        }

        setOrdersState({
          status: "ready",
          orders: response.orders ?? [],
          message:
            (response.orders ?? []).length > 0
              ? "Orders are ready for inspection."
              : "No orders are available yet.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setOrdersState({
          status: "error",
          orders: [],
          message:
            error instanceof ApiClientError
              ? error.message
              : "Unable to load admin orders.",
        });
      }
    }

    void loadAdminOrders();

    return () => {
      isCancelled = true;
    };
  }, [apiClient, token]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAdminWebhooks() {
      setWebhookState((current) => ({
        ...current,
        status: "loading",
        message: "Loading webhook events.",
      }));

      try {
        const response = await apiClient.get<AdminWebhookListResponse>(
          "/api/admin/webhooks",
          undefined,
          {
            headers: {
              "x-admin-session": token,
            },
          },
        );

        if (isCancelled) {
          return;
        }

        setWebhookState({
          status: "ready",
          webhooks: response.webhooks ?? [],
          message:
            (response.webhooks ?? []).length > 0
              ? "Webhook events are ready."
              : "No webhook events are available yet.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setWebhookState({
          status: "error",
          webhooks: [],
          message:
            error instanceof ApiClientError
              ? error.message
              : "Unable to load webhook events.",
        });
      }
    }

    void loadAdminWebhooks();

    return () => {
      isCancelled = true;
    };
  }, [apiClient, token]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAdminPaymentDebug() {
      setPaymentDebugState((current) => ({
        ...current,
        status: "loading",
        message: "Loading payment debug sessions.",
      }));

      try {
        const response = await apiClient.get<AdminPaymentDebugListResponse>(
          "/api/admin/payment-debug",
          undefined,
          {
            headers: {
              "x-admin-session": token,
            },
          },
        );

        if (isCancelled) {
          return;
        }

        setPaymentDebugState({
          status: "ready",
          paymentSessions: response.payment_sessions ?? [],
          message:
            (response.payment_sessions ?? []).length > 0
              ? "Payment debug sessions are ready."
              : "No payment debug sessions are available yet.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPaymentDebugState({
          status: "error",
          paymentSessions: [],
          message:
            error instanceof ApiClientError
              ? error.message
              : "Unable to load payment debug sessions.",
        });
      }
    }

    void loadAdminPaymentDebug();

    return () => {
      isCancelled = true;
    };
  }, [apiClient, token]);

  useEffect(() => {
    let isCancelled = false;

    async function loadAdminRuntimeDebugLogs() {
      setRuntimeDebugLogState((current) => ({
        ...current,
        status: "loading",
        message: "Loading runtime debug logs.",
      }));

      try {
        const response = await apiClient.get<AdminRuntimeDebugLogListResponse>(
          "/api/admin/debug-logs",
          undefined,
          {
            headers: {
              "x-admin-session": token,
            },
          },
        );

        if (isCancelled) {
          return;
        }

        setRuntimeDebugLogState({
          status: "ready",
          logs: response.debug_logs ?? [],
          message:
            (response.debug_logs ?? []).length > 0
              ? "Runtime debug logs are ready."
              : "No runtime debug logs are available yet.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setRuntimeDebugLogState({
          status: "error",
          logs: [],
          message:
            error instanceof ApiClientError
              ? error.message
              : "Unable to load runtime debug logs.",
        });
      }
    }

    void loadAdminRuntimeDebugLogs();

    return () => {
      isCancelled = true;
    };
  }, [apiClient, token]);

  useEffect(() => {
    let isCancelled = false;

    async function loadInventoryControls() {
      setInventoryState((current) => ({
        ...current,
        status: "loading",
        message: "Loading inventory controls.",
      }));
      setPickupDateState((current) => ({
        ...current,
        status: "loading",
        message: "Loading pickup-date controls.",
      }));

      try {
        const [inventoryResponse, pickupDateResponse] = await Promise.all([
          apiClient.get<AdminInventoryListResponse>(
            "/api/admin/inventory",
            undefined,
            {
              headers: {
                "x-admin-session": token,
              },
            },
          ),
          apiClient.get<AdminPickupDateListResponse>(
            "/api/admin/pickup-dates",
            undefined,
            {
              headers: {
                "x-admin-session": token,
              },
            },
          ),
        ]);

        if (isCancelled) {
          return;
        }

        setInventoryState({
          status: "ready",
          inventory: inventoryResponse.inventory ?? [],
          message:
            (inventoryResponse.inventory ?? []).length > 0
              ? "Inventory controls are ready."
              : "No inventory rows are available yet.",
        });
        setPickupDateState({
          status: "ready",
          pickupDates: pickupDateResponse.pickup_dates ?? [],
          message:
            (pickupDateResponse.pickup_dates ?? []).length > 0
              ? "Pickup-date controls are ready."
              : "No pickup dates are available yet.",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message =
          error instanceof ApiClientError
            ? error.message
            : "Unable to load inventory and pickup-date controls.";
        setInventoryState({
          status: "error",
          inventory: [],
          message,
        });
        setPickupDateState({
          status: "error",
          pickupDates: [],
          message,
        });
      }
    }

    void loadInventoryControls();

    return () => {
      isCancelled = true;
    };
  }, [apiClient, token]);

  const handleSelectOrder = async (orderId: string) => {
    setSelectedOrderState({
      status: "loading",
      message: "Loading order detail.",
    });
    setLifecycleState({
      status: "idle",
      message: "Manual lifecycle actions follow delivery and pickup rules.",
    });

    try {
      const response = await apiClient.get<AdminOrderDetailResponse>(
        `/api/admin/orders/${orderId}`,
        undefined,
        {
          headers: {
            "x-admin-session": token,
          },
        },
      );

      setSelectedOrder(response.order);
      setSelectedOrderState({
        status: "ready",
        message: `${response.order.order_number} detail loaded.`,
      });
    } catch (error) {
      setSelectedOrder(null);
      setSelectedOrderState({
        status: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to load order detail.",
      });
    }
  };

  const handleAdvanceLifecycle = async (nextStatus: AdminOrderStatus) => {
    if (!selectedOrder) {
      return;
    }

    setLifecycleState({
      status: "saving",
      message: `Marking ${selectedOrder.order_number} as ${formatAdminStatusLabel(
        nextStatus,
      )}.`,
    });

    try {
      const response = await apiClient.post<AdminOrderDetailResponse>(
        `/api/admin/orders/${selectedOrder.id}/lifecycle`,
        {
          next_status: nextStatus,
        },
        undefined,
        {
          headers: {
            "x-admin-session": token,
          },
        },
      );
      const nextOrder = response.order;

      setSelectedOrder(nextOrder);
      setOrdersState((current) => ({
        ...current,
        orders: current.orders.map((order) =>
          order.id === nextOrder.id ? toAdminOrderSummary(nextOrder) : order,
        ),
      }));
      setLifecycleState({
        status: "saved",
        message: `${nextOrder.order_number} is now ${formatAdminStatusLabel(
          nextOrder.status,
        )}.`,
      });
    } catch (error) {
      setLifecycleState({
        status: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to update order lifecycle.",
      });
    }
  };

  const handleSaveInventory = async (
    event: FormEvent<HTMLFormElement>,
    item: AdminInventoryItemResponse,
  ) => {
    event.preventDefault();

    const availableQuantity = normalizeAdminIntegerDraft(
      inventoryDrafts[item.id] ?? String(item.available_quantity),
    );

    if (availableQuantity === null) {
      setInventoryState((current) => ({
        ...current,
        status: "error",
        message: "Inventory quantity must be a non-negative whole number.",
      }));
      return;
    }

    setInventoryState((current) => ({
      ...current,
      status: "saving",
      message: `Saving inventory for ${item.product_sku}.`,
    }));

    try {
      const response = await apiClient.patch<AdminInventoryUpdateResponse>(
        `/api/admin/inventory/${encodeURIComponent(item.id)}`,
        {
          available_quantity: availableQuantity,
        },
        undefined,
        {
          headers: {
            "x-admin-session": token,
          },
        },
      );
      const mergedStoreName =
        response.inventory.store_name ?? item.store_name ?? "";
      const updatedInventory: AdminInventoryItemResponse = {
        ...item,
        ...response.inventory,
        product_name: response.inventory.product_name || item.product_name,
        product_sku: response.inventory.product_sku || item.product_sku,
        ...(mergedStoreName ? { store_name: mergedStoreName } : {}),
      };

      setInventoryState((current) => ({
        status: "saved",
        inventory: current.inventory.map((inventoryItem) =>
          inventoryItem.id === updatedInventory.id
            ? updatedInventory
            : inventoryItem,
        ),
        message: `${updatedInventory.product_sku} inventory saved at ${updatedInventory.available_quantity}.`,
      }));
      setInventoryDrafts((current) => ({
        ...current,
        [updatedInventory.id]: String(updatedInventory.available_quantity),
      }));
    } catch (error) {
      setInventoryState((current) => ({
        ...current,
        status: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to save inventory.",
      }));
    }
  };

  const handleSavePickupDate = async (
    event: FormEvent<HTMLFormElement>,
    pickupDate: AdminPickupDateResponse,
  ) => {
    event.preventDefault();

    const draft = pickupDateDrafts[pickupDate.id] ?? {};
    const capacity = normalizeAdminIntegerDraft(
      draft.capacity ?? String(pickupDate.capacity),
    );

    if (capacity === null) {
      setPickupDateState((current) => ({
        ...current,
        status: "error",
        message: "Pickup capacity must be a non-negative whole number.",
      }));
      return;
    }

    setPickupDateState((current) => ({
      ...current,
      status: "saving",
      message: `Saving pickup date for ${pickupDate.store_name}.`,
    }));

    try {
      const response = await apiClient.patch<AdminPickupDateUpdateResponse>(
        `/api/admin/pickup-dates/${encodeURIComponent(pickupDate.id)}`,
        {
          capacity,
          is_available: draft.isAvailable ?? pickupDate.is_available,
        },
        undefined,
        {
          headers: {
            "x-admin-session": token,
          },
        },
      );
      const updatedPickupDate = {
        ...pickupDate,
        ...response.pickup_date,
        store_name: response.pickup_date.store_name || pickupDate.store_name,
      };

      setPickupDateState((current) => ({
        status: "saved",
        pickupDates: current.pickupDates.map((currentPickupDate) =>
          currentPickupDate.id === updatedPickupDate.id
            ? updatedPickupDate
            : currentPickupDate,
        ),
        message: `${updatedPickupDate.store_name} ${updatedPickupDate.pickup_date} saved.`,
      }));
      setPickupDateDrafts((current) => ({
        ...current,
        [updatedPickupDate.id]: {
          capacity: String(updatedPickupDate.capacity),
          isAvailable: updatedPickupDate.is_available,
        },
      }));
    } catch (error) {
      setPickupDateState((current) => ({
        ...current,
        status: "error",
        message:
          error instanceof ApiClientError
            ? error.message
            : "Unable to save pickup date.",
      }));
    }
  };

  const handleProfileMarketSwitch = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSwitchState({
      status: "saving",
      message: "Switching active storefront context.",
    });

    try {
      const response = await apiClient.patch<AdminStorefrontConfigResponse>(
        "/api/admin/profile-market",
        {
          profile_id: selectedProfileId,
          market_id: selectedMarketId,
        },
        undefined,
        {
          headers: {
            "x-admin-session": token,
          },
        },
      );
      const nextConfig = mapAdminStorefrontConfig(response, activeConfig);

      setActiveConfig(nextConfig);
      setSelectedProfileId(
        resolveAdminProfileOption(nextConfig.profile.slug).id,
      );
      setSelectedMarketId(resolveAdminMarketOption(nextConfig.market.code).id);
      setSwitchState({
        status: "saved",
        message: `${nextConfig.profile.displayName} / ${nextConfig.market.code} is active for new storefront requests.`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof ApiClientError
          ? error.message
          : "Unable to switch profile and market.";

      setSwitchState({
        status: "error",
        message: errorMessage,
      });
    }
  };

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
          {session ? (
            <p className="admin-shell__session">Session {session.session_id}</p>
          ) : null}
          <nav aria-label="Admin sections" className="admin-shell__nav">
            <a href="/admin/orders">Orders</a>
            <a href="/admin/inventory">Inventory</a>
            <a href="/admin/webhooks">Webhooks</a>
            <a href="/admin/lifecycle">Lifecycle</a>
          </nav>
          <div className="admin-shell__grid">
            <Card className="admin-shell__card" size="sm">
              <CardHeader>
                <CardTitle>Storefront context</CardTitle>
                <CardDescription>
                  Switch the active demo profile and market for new catalog,
                  cart, checkout, and PayPal SDK config requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="admin-shell__context-form"
                  onSubmit={handleProfileMarketSwitch}
                >
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="admin-profile-select">
                        Profile
                      </FieldLabel>
                      <select
                        id="admin-profile-select"
                        className="admin-shell__select"
                        value={selectedProfileId}
                        onChange={(event) =>
                          setSelectedProfileId(event.target.value)
                        }
                        disabled={switchState.status === "saving"}
                      >
                        {adminProfileOptions.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="admin-market-select">
                        Market
                      </FieldLabel>
                      <select
                        id="admin-market-select"
                        className="admin-shell__select"
                        value={selectedMarketId}
                        onChange={(event) =>
                          setSelectedMarketId(event.target.value)
                        }
                        disabled={switchState.status === "saving"}
                      >
                        {adminMarketOptions.map((market) => (
                          <option key={market.id} value={market.id}>
                            {market.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <FieldDescription>
                      Current: {activeConfig.profile.displayName} /{" "}
                      {activeConfig.market.code} /{" "}
                      {activeConfig.market.currencyCode}
                    </FieldDescription>
                  </FieldGroup>
                  <Button
                    type="submit"
                    disabled={switchState.status === "saving"}
                  >
                    {switchState.status === "saving"
                      ? "Switching"
                      : "Apply context"}
                  </Button>
                </form>
                <p
                  className="admin-shell__feedback"
                  data-status={switchState.status}
                  {...(switchState.status === "error" ? { role: "alert" } : {})}
                >
                  {switchState.message}
                </p>
              </CardContent>
            </Card>
            <Card className="admin-shell__card" size="sm">
              <CardHeader>
                <CardTitle>Active runtime</CardTitle>
                <CardDescription>
                  Buyer UI stays unlinked from admin navigation; this context is
                  applied through API requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="admin-shell__runtime-list">
                  <div>
                    <dt>Profile</dt>
                    <dd>{activeConfig.profile.slug}</dd>
                  </div>
                  <div>
                    <dt>Market</dt>
                    <dd>{activeConfig.market.code}</dd>
                  </div>
                  <div>
                    <dt>Locale</dt>
                    <dd>{activeConfig.market.locale}</dd>
                  </div>
                  <div>
                    <dt>Currency</dt>
                    <dd>{activeConfig.market.currencyCode}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
          <Card
            className="admin-shell__card admin-shell__orders-card"
            size="sm"
          >
            <CardHeader>
              <CardTitle>Orders and lifecycle</CardTitle>
              <CardDescription>
                Inspect recent orders and advance the manual fulfillment
                lifecycle with the signed admin session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className="admin-shell__feedback"
                data-status={ordersState.status === "error" ? "error" : "idle"}
                {...(ordersState.status === "error" ? { role: "alert" } : {})}
              >
                {ordersState.message}
              </p>
              <div className="admin-shell__orders-layout">
                <div
                  className="admin-shell__order-list"
                  aria-label="Admin order list"
                >
                  {ordersState.orders.length > 0 ? (
                    ordersState.orders.map((order) => (
                      <button
                        key={order.id}
                        type="button"
                        className="admin-shell__order-row"
                        aria-pressed={selectedOrder?.id === order.id}
                        onClick={() => {
                          void handleSelectOrder(order.id);
                        }}
                      >
                        <span>
                          <strong>{order.order_number}</strong>
                          <small>
                            {formatAdminStatusLabel(order.fulfillment_mode)} /{" "}
                            {formatAdminStatusLabel(order.status)}
                          </small>
                        </span>
                        <span>
                          {formatMinorMoney(
                            order.total_minor,
                            order.currency_code,
                            activeConfig.market.locale,
                          )}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="admin-shell__empty-state">
                      {ordersState.status === "loading"
                        ? "Loading orders"
                        : "No orders found"}
                    </p>
                  )}
                </div>
                <div className="admin-shell__order-detail">
                  <p
                    className="admin-shell__feedback"
                    data-status={
                      selectedOrderState.status === "error" ? "error" : "idle"
                    }
                    {...(selectedOrderState.status === "error"
                      ? { role: "alert" }
                      : {})}
                  >
                    {selectedOrderState.message}
                  </p>
                  {selectedOrder ? (
                    <>
                      <div className="admin-shell__order-detail-header">
                        <div>
                          <h2>{selectedOrder.order_number}</h2>
                          <p>
                            {formatAdminStatusLabel(
                              selectedOrder.fulfillment_mode,
                            )}{" "}
                            order /{" "}
                            {formatAdminStatusLabel(selectedOrder.status)}
                          </p>
                        </div>
                        <strong>
                          {formatMinorMoney(
                            selectedOrder.totals.total_minor,
                            selectedOrder.currency_code,
                            activeConfig.market.locale,
                          )}
                        </strong>
                      </div>
                      <dl className="admin-shell__runtime-list admin-shell__order-totals">
                        <div>
                          <dt>Payment</dt>
                          <dd>
                            {formatAdminStatusLabel(
                              selectedOrder.payment_status,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Items</dt>
                          <dd>{selectedOrder.items.length}</dd>
                        </div>
                        <div>
                          <dt>Timeline</dt>
                          <dd>{selectedOrder.timeline.length}</dd>
                        </div>
                      </dl>
                      <div className="admin-shell__order-items">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id}>
                            <span>{item.product_name}</span>
                            <strong>Qty {item.quantity}</strong>
                          </div>
                        ))}
                      </div>
                      <ol className="admin-shell__timeline-list">
                        {selectedOrder.timeline.map((event) => (
                          <li key={event.id}>
                            <strong>
                              {formatAdminStatusLabel(event.to_status)}
                            </strong>
                            <span>
                              {event.actor_type} /{" "}
                              {formatAccountDate(
                                event.created_at,
                                activeConfig.market.locale,
                              )}
                            </span>
                            {event.note ? <p>{event.note}</p> : null}
                          </li>
                        ))}
                      </ol>
                      <div
                        className="admin-shell__debug-sections"
                        aria-label="Admin order debug sections"
                      >
                        <div>
                          <h3>Payment sessions</h3>
                          {(selectedOrder.payment_sessions ?? []).map(
                            (session) => (
                              <p key={session.id}>
                                {formatAdminStatusLabel(session.method)} /{" "}
                                {formatAdminStatusLabel(session.status)} /{" "}
                                {session.paypal_order_id ?? "No PayPal ID"} /{" "}
                                {session.amount_consistency_status}
                              </p>
                            ),
                          )}
                          {(selectedOrder.payment_sessions ?? []).length ===
                          0 ? (
                            <p>No payment sessions linked.</p>
                          ) : null}
                        </div>
                        <div>
                          <h3>Total snapshots</h3>
                          {(selectedOrder.total_snapshots ?? []).map(
                            (snapshot) => (
                              <p key={snapshot.id}>
                                {snapshot.calculation_stage} /{" "}
                                {formatMinorMoney(
                                  snapshot.total_minor,
                                  snapshot.currency_code,
                                  activeConfig.market.locale,
                                )}
                              </p>
                            ),
                          )}
                          {(selectedOrder.total_snapshots ?? []).length ===
                          0 ? (
                            <p>No total snapshots linked.</p>
                          ) : null}
                        </div>
                        <div>
                          <h3>PayPal snapshots</h3>
                          {(selectedOrder.paypal_snapshots ?? []).map(
                            (snapshot) => (
                              <p key={snapshot.id}>
                                {snapshot.paypal_invoice_id ?? "No invoice"} /{" "}
                                {snapshot.paypal_request_id ?? "No request ID"}
                              </p>
                            ),
                          )}
                          {(selectedOrder.paypal_snapshots ?? []).length ===
                          0 ? (
                            <p>No PayPal snapshots linked.</p>
                          ) : null}
                        </div>
                        <div>
                          <h3>Promo lines</h3>
                          {(selectedOrder.promo_evaluation_lines ?? []).map(
                            (line) => (
                              <p key={line.id}>
                                {line.code_snapshot} /{" "}
                                {formatAdminStatusLabel(line.evaluation_status)}{" "}
                                /{" "}
                                {line.rejection_reason ??
                                  line.explanation ??
                                  "No reason"}
                              </p>
                            ),
                          )}
                          {(selectedOrder.promo_evaluation_lines ?? [])
                            .length === 0 ? (
                            <p>No promo evaluation lines linked.</p>
                          ) : null}
                        </div>
                        <div>
                          <h3>Inventory effect</h3>
                          {(selectedOrder.inventory_effects ?? []).map(
                            (effect) => (
                              <p key={effect.order_item_id}>
                                {effect.product_sku} / requested{" "}
                                {effect.requested_quantity} / fulfillable{" "}
                                {effect.fulfillable_quantity}
                              </p>
                            ),
                          )}
                          {(selectedOrder.inventory_effects ?? []).length ===
                          0 ? (
                            <p>No inventory effect rows linked.</p>
                          ) : null}
                        </div>
                        <div>
                          <h3>Linked webhooks</h3>
                          {(selectedOrder.linked_webhooks ?? []).map(
                            (webhook) => (
                              <p key={webhook.id}>
                                {webhook.event_type} /{" "}
                                {webhook.verification_status} /{" "}
                                {webhook.processing_status}
                              </p>
                            ),
                          )}
                          {(selectedOrder.linked_webhooks ?? []).length ===
                          0 ? (
                            <p>No linked webhooks.</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="admin-shell__lifecycle-actions">
                        {selectedOrder.next_statuses.length > 0 ? (
                          selectedOrder.next_statuses.map((nextStatus) => (
                            <Button
                              key={nextStatus}
                              type="button"
                              onClick={() => {
                                void handleAdvanceLifecycle(nextStatus);
                              }}
                              disabled={lifecycleState.status === "saving"}
                            >
                              Mark {formatAdminStatusLabel(nextStatus)}
                            </Button>
                          ))
                        ) : (
                          <p className="admin-shell__empty-state">
                            No manual lifecycle action available.
                          </p>
                        )}
                      </div>
                      <p
                        className="admin-shell__feedback"
                        data-status={lifecycleState.status}
                        {...(lifecycleState.status === "error"
                          ? { role: "alert" }
                          : {})}
                      >
                        {lifecycleState.message}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className="admin-shell__card admin-shell__orders-card"
            size="sm"
          >
            <CardHeader>
              <CardTitle>Inventory and pickup dates</CardTitle>
              <CardDescription>
                Update stock levels and store pickup capacity used by checkout
                validation and pending-order resume.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="admin-shell__inventory-grid">
                <section aria-labelledby="admin-inventory-title">
                  <h2 id="admin-inventory-title">Inventory</h2>
                  <p
                    className="admin-shell__feedback"
                    data-status={
                      inventoryState.status === "error" ? "error" : "idle"
                    }
                    {...(inventoryState.status === "error"
                      ? { role: "alert" }
                      : {})}
                  >
                    {inventoryState.message}
                  </p>
                  <div className="admin-shell__control-list">
                    {inventoryState.inventory.length > 0 ? (
                      inventoryState.inventory.map((item) => {
                        const inputId = `admin-inventory-${toAdminDomId(
                          item.id,
                        )}`;

                        return (
                          <form
                            key={item.id}
                            className="admin-shell__control-row"
                            onSubmit={(event) => {
                              void handleSaveInventory(event, item);
                            }}
                          >
                            <label htmlFor={inputId}>
                              <strong>{item.product_sku}</strong>
                              <span>
                                {item.inventory_type === "store"
                                  ? item.store_name
                                  : "Central warehouse"}
                              </span>
                            </label>
                            <input
                              id={inputId}
                              aria-label={`Available quantity for ${
                                item.product_sku
                              } ${
                                item.inventory_type === "store"
                                  ? item.store_name
                                  : "Central warehouse"
                              }`}
                              className="admin-shell__input"
                              type="number"
                              min="0"
                              step="1"
                              value={
                                inventoryDrafts[item.id] ??
                                String(item.available_quantity)
                              }
                              onChange={(event) =>
                                setInventoryDrafts((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                            />
                            <Button
                              type="submit"
                              disabled={inventoryState.status === "saving"}
                            >
                              Save stock
                            </Button>
                          </form>
                        );
                      })
                    ) : (
                      <p className="admin-shell__empty-state">
                        {inventoryState.status === "loading"
                          ? "Loading inventory"
                          : "No inventory rows found"}
                      </p>
                    )}
                  </div>
                </section>
                <section aria-labelledby="admin-pickup-title">
                  <h2 id="admin-pickup-title">Pickup dates</h2>
                  <p
                    className="admin-shell__feedback"
                    data-status={
                      pickupDateState.status === "error" ? "error" : "idle"
                    }
                    {...(pickupDateState.status === "error"
                      ? { role: "alert" }
                      : {})}
                  >
                    {pickupDateState.message}
                  </p>
                  <div className="admin-shell__control-list">
                    {pickupDateState.pickupDates.length > 0 ? (
                      pickupDateState.pickupDates.map((pickupDate) => {
                        const inputId = `admin-pickup-${toAdminDomId(
                          pickupDate.id,
                        )}`;
                        const checkboxId = `${inputId}-available`;
                        const pickupDraft = pickupDateDrafts[pickupDate.id];

                        return (
                          <form
                            key={pickupDate.id}
                            className="admin-shell__control-row admin-shell__control-row--pickup"
                            onSubmit={(event) => {
                              void handleSavePickupDate(event, pickupDate);
                            }}
                          >
                            <label htmlFor={inputId}>
                              <strong>{pickupDate.store_name}</strong>
                              <span>{pickupDate.pickup_date}</span>
                            </label>
                            <input
                              id={inputId}
                              aria-label={`Pickup capacity for ${pickupDate.store_name} ${pickupDate.pickup_date}`}
                              className="admin-shell__input"
                              type="number"
                              min="0"
                              step="1"
                              value={
                                pickupDraft?.capacity ??
                                String(pickupDate.capacity)
                              }
                              onChange={(event) =>
                                setPickupDateDrafts((current) => ({
                                  ...current,
                                  [pickupDate.id]: {
                                    ...current[pickupDate.id],
                                    capacity: event.target.value,
                                  },
                                }))
                              }
                            />
                            <label
                              className="admin-shell__checkbox-label"
                              htmlFor={checkboxId}
                            >
                              <input
                                id={checkboxId}
                                type="checkbox"
                                checked={
                                  pickupDraft?.isAvailable ??
                                  pickupDate.is_available
                                }
                                onChange={(event) =>
                                  setPickupDateDrafts((current) => ({
                                    ...current,
                                    [pickupDate.id]: {
                                      ...current[pickupDate.id],
                                      isAvailable: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              Available
                            </label>
                            <Button
                              type="submit"
                              disabled={pickupDateState.status === "saving"}
                            >
                              Save date
                            </Button>
                          </form>
                        );
                      })
                    ) : (
                      <p className="admin-shell__empty-state">
                        {pickupDateState.status === "loading"
                          ? "Loading pickup dates"
                          : "No pickup dates found"}
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </CardContent>
          </Card>
          <Card
            className="admin-shell__card admin-shell__orders-card"
            size="sm"
          >
            <CardHeader>
              <CardTitle>Webhook events</CardTitle>
              <CardDescription>
                Review sanitized PayPal webhook verification and processing
                state without mutating order or payment data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className="admin-shell__feedback"
                data-status={webhookState.status === "error" ? "error" : "idle"}
                {...(webhookState.status === "error" ? { role: "alert" } : {})}
              >
                {webhookState.message}
              </p>
              <div
                className="admin-shell__webhook-list"
                aria-label="Admin webhook events"
              >
                {webhookState.webhooks.length > 0 ? (
                  webhookState.webhooks.map((webhook) => (
                    <article
                      key={webhook.id}
                      className="admin-shell__webhook-row"
                    >
                      <div>
                        <h2>{webhook.event_id}</h2>
                        <p>{webhook.event_type}</p>
                      </div>
                      <dl className="admin-shell__runtime-list">
                        <div>
                          <dt>Verification</dt>
                          <dd>
                            {formatAdminStatusLabel(
                              webhook.verification_status,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Processing</dt>
                          <dd>
                            {formatAdminStatusLabel(webhook.processing_status)}
                          </dd>
                        </div>
                        <div>
                          <dt>Order</dt>
                          <dd>{webhook.linked_order_id ?? "Unlinked"}</dd>
                        </div>
                        <div>
                          <dt>Payment session</dt>
                          <dd>
                            {webhook.linked_payment_session_id ?? "Unlinked"}
                          </dd>
                        </div>
                        <div>
                          <dt>Received</dt>
                          <dd>
                            {formatAccountDate(
                              webhook.received_at,
                              activeConfig.market.locale,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt>Processed</dt>
                          <dd>
                            {webhook.processed_at
                              ? formatAccountDate(
                                  webhook.processed_at,
                                  activeConfig.market.locale,
                                )
                              : "Not processed"}
                          </dd>
                        </div>
                      </dl>
                    </article>
                  ))
                ) : (
                  <p className="admin-shell__empty-state">
                    {webhookState.status === "loading"
                      ? "Loading webhook events"
                      : "No webhook events found"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card
            className="admin-shell__card admin-shell__orders-card"
            size="sm"
          >
            <CardHeader>
              <CardTitle>Payment and order debug</CardTitle>
              <CardDescription>
                Trace PayPal payment sessions against order totals, provider
                captures, total snapshots, and linked webhook events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className="admin-shell__feedback"
                data-status={
                  paymentDebugState.status === "error" ? "error" : "idle"
                }
                {...(paymentDebugState.status === "error"
                  ? { role: "alert" }
                  : {})}
              >
                {paymentDebugState.message}
              </p>
              <div
                className="admin-shell__payment-debug-list"
                aria-label="Admin payment debug sessions"
              >
                {paymentDebugState.paymentSessions.length > 0 ? (
                  paymentDebugState.paymentSessions.map((session) => {
                    const latestTotalSnapshot =
                      session.total_snapshots[0] ?? null;

                    return (
                      <article
                        key={session.id}
                        className="admin-shell__payment-debug-row"
                      >
                        <div className="admin-shell__payment-debug-summary">
                          <div>
                            <h2>
                              {session.order?.order_number ??
                                session.order_id ??
                                session.id}
                            </h2>
                            <p>
                              {formatAdminStatusLabel(session.method)} /{" "}
                              {formatAdminStatusLabel(session.status)} / Attempt{" "}
                              {session.attempt_number}
                            </p>
                          </div>
                          <strong>
                            {formatMinorMoney(
                              session.merchant_total_minor,
                              session.currency_code,
                              activeConfig.market.locale,
                            )}
                          </strong>
                        </div>
                        <dl className="admin-shell__runtime-list admin-shell__payment-debug-metrics">
                          <div>
                            <dt>Amount check</dt>
                            <dd>
                              {formatAdminStatusLabel(
                                session.amount_consistency_status,
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Provider total</dt>
                            <dd>
                              {session.provider_total_minor === null
                                ? "Pending"
                                : formatMinorMoney(
                                    session.provider_total_minor,
                                    session.currency_code,
                                    activeConfig.market.locale,
                                  )}
                            </dd>
                          </div>
                          <div>
                            <dt>PayPal order</dt>
                            <dd>{session.paypal_order_id ?? "Pending"}</dd>
                          </div>
                          <div>
                            <dt>PayPal capture</dt>
                            <dd>{session.paypal_capture_id ?? "Pending"}</dd>
                          </div>
                          <div>
                            <dt>Total stage</dt>
                            <dd>
                              {latestTotalSnapshot
                                ? `${formatAdminStatusLabel(
                                    latestTotalSnapshot.calculation_stage,
                                  )} snapshot`
                                : "Missing"}
                            </dd>
                          </div>
                          <div>
                            <dt>Updated</dt>
                            <dd>
                              {formatAccountDate(
                                session.updated_at,
                                activeConfig.market.locale,
                              )}
                            </dd>
                          </div>
                        </dl>
                        <div className="admin-shell__payment-debug-details">
                          <section>
                            <h3>Total snapshots</h3>
                            {session.total_snapshots.length > 0 ? (
                              session.total_snapshots.map((snapshot) => (
                                <p
                                  key={snapshot.id}
                                  className="admin-shell__payment-debug-line"
                                >
                                  <strong>
                                    {formatAdminStatusLabel(
                                      snapshot.calculation_stage,
                                    )}
                                  </strong>
                                  <span>
                                    {formatMinorMoney(
                                      snapshot.total_minor,
                                      snapshot.currency_code,
                                      activeConfig.market.locale,
                                    )}
                                  </span>
                                </p>
                              ))
                            ) : (
                              <p>No total snapshots linked.</p>
                            )}
                          </section>
                          <section>
                            <h3>PayPal snapshots</h3>
                            {session.paypal_snapshots.length > 0 ? (
                              session.paypal_snapshots.map((snapshot) => (
                                <p
                                  key={snapshot.id}
                                  className="admin-shell__payment-debug-line"
                                >
                                  <strong>
                                    {snapshot.paypal_invoice_id ?? "No invoice"}
                                  </strong>
                                  <span>
                                    {snapshot.paypal_request_id ??
                                      "No request ID"}
                                  </span>
                                </p>
                              ))
                            ) : (
                              <p>No PayPal snapshots linked.</p>
                            )}
                          </section>
                          <section>
                            <h3>Linked webhooks</h3>
                            {session.linked_webhooks.length > 0 ? (
                              session.linked_webhooks.map((webhook) => (
                                <p
                                  key={webhook.id}
                                  className="admin-shell__payment-debug-line"
                                >
                                  <strong>{webhook.event_id}</strong>
                                  <span>
                                    {formatAdminStatusLabel(
                                      webhook.processing_status,
                                    )}
                                  </span>
                                </p>
                              ))
                            ) : (
                              <p>No linked webhooks.</p>
                            )}
                          </section>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="admin-shell__empty-state">
                    {paymentDebugState.status === "loading"
                      ? "Loading payment debug sessions"
                      : "No payment debug sessions found"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card
            className="admin-shell__card admin-shell__orders-card"
            size="sm"
          >
            <CardHeader>
              <CardTitle>Runtime debug logs</CardTitle>
              <CardDescription>
                Inspect recent API runtime events with redacted context for
                checkout and PayPal troubleshooting.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p
                className="admin-shell__feedback"
                data-status={
                  runtimeDebugLogState.status === "error" ? "error" : "idle"
                }
                {...(runtimeDebugLogState.status === "error"
                  ? { role: "alert" }
                  : {})}
              >
                {runtimeDebugLogState.message}
              </p>
              <div
                className="admin-shell__runtime-debug-list"
                aria-label="Admin runtime debug logs"
              >
                {runtimeDebugLogState.logs.length > 0 ? (
                  runtimeDebugLogState.logs.map((entry) => {
                    const contextLines = formatAdminRuntimeDebugContext(
                      entry.context,
                    ).filter(
                      (line) =>
                        !adminRuntimeDebugElevatedContextKeys.has(line.key),
                    );

                    return (
                      <article
                        key={`${entry.timestamp}:${entry.message}:${
                          entry.debug_id ?? "no-debug-id"
                        }`}
                        className="admin-shell__runtime-debug-row"
                      >
                        <div className="admin-shell__runtime-debug-summary">
                          <div>
                            <h2>{entry.message}</h2>
                            <p>
                              {entry.debug_id ?? "No debug ID"} /{" "}
                              {entry.request_path ?? "No request path"}
                            </p>
                          </div>
                          <strong>{formatAdminStatusLabel(entry.level)}</strong>
                        </div>
                        <dl className="admin-shell__runtime-list admin-shell__runtime-debug-metrics">
                          <div>
                            <dt>Debug ID</dt>
                            <dd>{entry.debug_id ?? "Missing"}</dd>
                          </div>
                          <div>
                            <dt>Source</dt>
                            <dd>{entry.source ?? "Unknown"}</dd>
                          </div>
                          <div>
                            <dt>Path</dt>
                            <dd>{entry.request_path ?? "Unknown"}</dd>
                          </div>
                          <div>
                            <dt>Logged</dt>
                            <dd>
                              {formatAccountDate(
                                entry.timestamp,
                                activeConfig.market.locale,
                              )}
                            </dd>
                          </div>
                        </dl>
                        {contextLines.length > 0 ? (
                          <dl className="admin-shell__runtime-debug-context">
                            {contextLines.map((line) => (
                              <div key={line.key}>
                                <dt>{line.key}</dt>
                                <dd>{line.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="admin-shell__empty-state">
                            No runtime context linked.
                          </p>
                        )}
                      </article>
                    );
                  })
                ) : (
                  <p className="admin-shell__empty-state">
                    {runtimeDebugLogState.status === "loading"
                      ? "Loading runtime debug logs"
                      : "No runtime debug logs found"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void onLogout();
            }}
            disabled={isLoggingOut}
          >
            Log out
          </Button>
        </section>
      </main>
    </div>
  );
}

function readAdminSessionTokenFromStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(adminSessionStorageKey) ?? null;
  } catch {
    return null;
  }
}

function setAdminSessionTokenInStorage(token: string | null): void {
  try {
    if (!token) {
      globalThis.localStorage?.removeItem(adminSessionStorageKey);
      return;
    }

    globalThis.localStorage?.setItem(adminSessionStorageKey, token);
  } catch {
    // Local storage persistence is optional.
  }
}

function mapAdminStorefrontConfig(
  response: AdminStorefrontConfigResponse,
  fallback: StorefrontRuntimeConfig,
): StorefrontRuntimeConfig {
  return {
    profile: {
      slug: response.profile.slug,
      displayName: response.profile.display_name,
      brandMode: response.profile.brand_mode,
    },
    market: {
      code: response.market.code,
      currencyCode: response.market.currency_code,
      locale: response.market.locale,
    },
    paypal: {
      providerKey: response.paypal?.provider_key ?? fallback.paypal.providerKey,
    },
  };
}

function toAdminOrderSummary(
  order: AdminOrderDetailResponse["order"],
): AdminOrderSummaryResponse {
  return {
    id: order.id,
    profile_id: order.profile_id,
    market_id: order.market_id,
    order_number: order.order_number,
    fulfillment_mode: order.fulfillment_mode,
    status: order.status,
    payment_status: order.payment_status,
    currency_code: order.currency_code,
    total_minor: order.total_minor,
    placed_at: order.placed_at,
    updated_at: order.updated_at,
    next_statuses: order.next_statuses,
  };
}

function formatAdminStatusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function formatAdminRuntimeDebugContext(
  context: AdminRuntimeDebugLogContext,
): readonly {
  readonly key: string;
  readonly value: string;
}[] {
  const lines: {
    readonly key: string;
    readonly value: string;
  }[] = [];

  collectAdminRuntimeDebugContextLines(lines, [], context);

  return lines;
}

function collectAdminRuntimeDebugContextLines(
  lines: {
    readonly key: string;
    readonly value: string;
  }[],
  path: readonly string[],
  value: AdminRuntimeDebugLogContext,
): void {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push({
        key: path.join(".") || "context",
        value: "[]",
      });
      return;
    }

    value.forEach((item, index) => {
      collectAdminRuntimeDebugContextLines(
        lines,
        [...path, `[${index}]`],
        item,
      );
    });
    return;
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);

    if (entries.length === 0) {
      lines.push({
        key: path.join(".") || "context",
        value: "{}",
      });
      return;
    }

    entries.forEach(([key, nestedValue]) => {
      collectAdminRuntimeDebugContextLines(lines, [...path, key], nestedValue);
    });
    return;
  }

  lines.push({
    key: path.join(".") || "context",
    value: value === null ? "null" : String(value),
  });
}

function normalizeAdminIntegerDraft(value: string): number | null {
  const trimmedValue = value.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);

  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
}

function toAdminDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function resolveAdminProfileOption(profileSlug: string) {
  return (
    adminProfileOptions.find((profile) => profile.slug === profileSlug) ??
    adminProfileOptions[0]
  );
}

function resolveAdminMarketOption(marketCode: string) {
  return (
    adminMarketOptions.find((market) => market.code === marketCode) ??
    adminMarketOptions[0]
  );
}

function browserPathname(): string {
  const pathname = globalThis.location?.pathname ?? "/";
  const search = globalThis.location?.search ?? "";
  return `${pathname}${search}`;
}

function pushBuyerHistory(pathname: string) {
  if (globalThis.location?.pathname !== pathname) {
    globalThis.history?.pushState(null, "", pathname);
  }
}

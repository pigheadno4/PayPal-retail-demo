import { useEffect, useState, type ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { type DeliveryExpressPaymentMethod } from "../payments/deliveryExpress.js";
import { PayPalPaymentFrame } from "../payments/PayPalPaymentFrame.js";

export interface ProductGalleryImage {
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly lowResolutionImagePath?: string;
  readonly highResolutionImagePath?: string;
}

export interface ProductDetailRow {
  readonly label: string;
  readonly value: string;
}

export interface ProductPayLaterMessage {
  readonly title: string;
  readonly body: string;
}

export interface ProductReview {
  readonly id: string;
  readonly authorName: string;
  readonly ratingLabel: string;
  readonly title: string;
  readonly body: string;
}

export interface ProductPurchaseOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly priceLabel: string;
  readonly regularPriceLabel?: string;
  readonly quantity: number;
  readonly badgeLabel?: string;
  readonly valueLabel?: string;
  readonly ctaLabel?: string;
}

export interface ProductPurchaseSelection {
  readonly optionId: string;
  readonly label: string;
  readonly quantity: number;
  readonly priceLabel: string;
}

export interface ProductScarcitySignal {
  readonly stockLabel: string;
  readonly viewerLabel: string;
}

export interface ProductMediaHighlight {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly imagePath?: string;
  readonly imageAlt?: string;
  readonly kind?: "image" | "silhouette" | "video";
}

export interface ProductStorySection {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
}

export interface ProductSeriesLineupItem {
  readonly name: string;
  readonly typeLabel: string;
  readonly imagePath?: string;
  readonly imageAlt?: string;
}

export interface ProductSeriesLineup {
  readonly title: string;
  readonly subtitle: string;
  readonly secretOddsLabel: string;
  readonly items: readonly ProductSeriesLineupItem[];
}

export interface ProductTrustBadge {
  readonly title: string;
  readonly body: string;
}

export interface ProductSocialProof {
  readonly id: string;
  readonly mediaLabel: string;
  readonly title: string;
  readonly body: string;
  readonly authorName: string;
}

export interface ProductRecommendation {
  readonly slug: string;
  readonly name: string;
  readonly eyebrow: string;
  readonly priceLabel: string;
  readonly imagePath: string;
  readonly imageAlt: string;
  readonly href: string;
}

export interface ProductDetailPageData {
  readonly productId?: string;
  readonly slug: string;
  readonly name: string;
  readonly categoryName: string;
  readonly seriesName: string;
  readonly vendorName?: string;
  readonly statusLabel: string;
  readonly purchasable: boolean;
  readonly unavailableReason?: string;
  readonly currentPriceLabel: string;
  readonly regularPriceLabel: string;
  readonly unitPriceCents?: number;
  readonly maxQuantity?: number;
  readonly introduction: string;
  readonly details: readonly ProductDetailRow[];
  readonly gallery: readonly ProductGalleryImage[];
  readonly mediaHighlights?: readonly ProductMediaHighlight[];
  readonly purchaseOptions?: readonly ProductPurchaseOption[];
  readonly scarcitySignal?: ProductScarcitySignal;
  readonly story?: ProductStorySection;
  readonly seriesLineup?: ProductSeriesLineup;
  readonly specHighlights?: readonly ProductDetailRow[];
  readonly trustBadges?: readonly ProductTrustBadge[];
  readonly socialProof?: readonly ProductSocialProof[];
  readonly recommendations?: readonly ProductRecommendation[];
  readonly payLaterMessage: ProductPayLaterMessage;
  readonly reviews: readonly ProductReview[];
}

export interface ProductDetailPageProps {
  readonly data: ProductDetailPageData;
  readonly onAddToCart?: (
    product: ProductDetailPageData,
    selection: ProductPurchaseSelection,
  ) => void;
  readonly onDeliveryExpressStart?: (
    method: DeliveryExpressPaymentMethod,
    product: ProductDetailPageData,
  ) => void;
  readonly renderDeliveryExpressAction?: (
    method: DeliveryExpressPaymentMethod,
    product: ProductDetailPageData,
    amountLabel: string,
  ) => ReactNode;
  readonly renderPayLaterMessage?: (
    product: ProductDetailPageData,
    fallbackMessage: string,
    amountLabel: string,
  ) => ReactNode;
}

type ProductDetailTabId =
  | "collector"
  | "facts"
  | "gallery"
  | "reviews"
  | "shipping"
  | "qa";

interface ProductDetailTab {
  readonly id: ProductDetailTabId;
  readonly label: string;
  readonly content: ReactNode;
}

export function ProductDetailPage({
  data,
  onAddToCart,
  onDeliveryExpressStart,
  renderDeliveryExpressAction,
  renderPayLaterMessage,
}: ProductDetailPageProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeDetailTab, setActiveDetailTab] =
    useState<ProductDetailTabId>("collector");
  const purchaseOptions =
    data.purchaseOptions && data.purchaseOptions.length > 0
      ? data.purchaseOptions
      : [buildDefaultPurchaseOption(data)];
  const [selectedPurchaseOptionId, setSelectedPurchaseOptionId] = useState(
    purchaseOptions[0]?.id ?? "single-item",
  );
  const selectedPurchaseOption =
    purchaseOptions.find((option) => option.id === selectedPurchaseOptionId) ??
    purchaseOptions[0] ??
    buildDefaultPurchaseOption(data);
  const selectedPurchaseSelection: ProductPurchaseSelection = {
    optionId: selectedPurchaseOption.id,
    label: selectedPurchaseOption.label,
    quantity: selectedPurchaseOption.quantity,
    priceLabel: selectedPurchaseOption.priceLabel,
  };
  const selectedRegularPriceLabel =
    selectedPurchaseOption.regularPriceLabel ?? data.regularPriceLabel;
  const activeImage = data.gallery[activeImageIndex] ?? data.gallery[0];
  const showReviews = data.purchasable && data.reviews.length > 0;
  const socialProof = data.socialProof ?? [];
  const trustBadges =
    data.trustBadges && data.trustBadges.length > 0
      ? data.trustBadges
      : defaultTrustBadges;
  const recommendationCards = data.recommendations ?? [];
  const reviewCountLabel = `${data.reviews.length} ${
    data.reviews.length === 1 ? "collector review" : "collector reviews"
  }`;
  const detailTabPrefix = `product-detail-${data.slug}`;
  const detailTabs: readonly ProductDetailTab[] = [
    {
      id: "collector",
      label: "Collector details",
      content: (
        <div className="product-story-stack">
          {data.story ? (
            <Card className="product-story">
              <CardHeader className="product-story__header">
                <CardDescription className="product-story__eyebrow">
                  {data.story.eyebrow}
                </CardDescription>
                <CardTitle className="product-story__title">
                  <h3>{data.story.title}</h3>
                </CardTitle>
              </CardHeader>
              <CardContent className="product-story__content">
                <p>{data.story.body}</p>
              </CardContent>
            </Card>
          ) : (
            <p>{data.introduction}</p>
          )}
          {data.seriesLineup ? (
            <Card
              className="product-lineup"
              aria-label={data.seriesLineup.title}
            >
              <CardHeader className="product-lineup__header">
                <div>
                  <CardTitle className="product-lineup__title">
                    <h3>{data.seriesLineup.title}</h3>
                  </CardTitle>
                  <CardDescription className="product-lineup__subtitle">
                    {data.seriesLineup.subtitle}
                  </CardDescription>
                </div>
                <CardAction className="product-lineup__odds">
                  <strong>{data.seriesLineup.secretOddsLabel}</strong>
                </CardAction>
              </CardHeader>
              <CardContent className="product-lineup__grid">
                {data.seriesLineup.items.map((item) => (
                  <Card
                    className="product-lineup__item"
                    key={item.name}
                    size="sm"
                  >
                    <CardContent className="product-lineup__item-media">
                      {item.imagePath ? (
                        <img
                          src={item.imagePath}
                          alt={item.imageAlt ?? ""}
                          loading="lazy"
                        />
                      ) : (
                        <span aria-hidden="true" />
                      )}
                    </CardContent>
                    <CardHeader className="product-lineup__item-copy">
                      <CardTitle className="product-lineup__item-title">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="product-lineup__item-type">
                        {item.typeLabel}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      ),
    },
    {
      id: "facts",
      label: "Product facts",
      content:
        data.details.length > 0 || (data.specHighlights?.length ?? 0) > 0 ? (
          <>
            {data.specHighlights && data.specHighlights.length > 0 ? (
              <dl className="product-spec-grid">
                {data.specHighlights.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {data.details.length > 0 ? (
              <dl className="product-detail-list">
                {data.details.map((detail) => (
                  <div key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </>
        ) : (
          <p>Product facts are not available for this item yet.</p>
        ),
    },
    {
      id: "gallery",
      label: "Gallery",
      content: (
        <div className="product-gallery-detail">
          <p>
            {data.gallery.length === 1
              ? "1 product view is available."
              : `${data.gallery.length} product views are available.`}
          </p>
        </div>
      ),
    },
    ...(showReviews || socialProof.length > 0
      ? [
          {
            id: "reviews" as const,
            label: "Customer reviews",
            content: (
              <>
                <h3>Collector reviews</h3>
                <div className="product-reviews__list">
                  {data.reviews.map((review) => (
                    <Card className="product-review" key={review.id}>
                      <CardHeader className="product-review__header">
                        <CardTitle className="product-review__title">
                          {review.title}
                        </CardTitle>
                        <CardDescription className="product-review__meta">
                          {review.ratingLabel}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="product-review__content">
                        <p>{review.body}</p>
                      </CardContent>
                      <CardFooter className="product-review__footer">
                        {review.authorName}
                      </CardFooter>
                    </Card>
                  ))}
                  {socialProof.map((proof) => (
                    <Card className="product-review" key={proof.id}>
                      <CardHeader className="product-review__header">
                        <CardTitle className="product-review__title">
                          {proof.title}
                        </CardTitle>
                        <CardDescription className="product-review__meta">
                          {proof.mediaLabel}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="product-review__content">
                        <p>{proof.body}</p>
                      </CardContent>
                      <CardFooter className="product-review__footer">
                        {proof.authorName}
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </>
            ),
          },
        ]
      : []),
    {
      id: "shipping",
      label: "Shipping and returns",
      content: (
        <p>
          Shipping options and totals are confirmed during checkout before
          payment. Return handling is not simulated in this demo.
        </p>
      ),
    },
    {
      id: "qa",
      label: "Q&A",
      content: (
        <p>No customer questions are published for this demo item yet.</p>
      ),
    },
  ];

  function startDeliveryExpress(method: DeliveryExpressPaymentMethod) {
    if (data.purchasable) {
      onDeliveryExpressStart?.(method, data);
    }
  }

  return (
    <div className="product-page">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a>
        <span aria-hidden="true">/</span>
        <a href="/products">Products</a>
        <span aria-hidden="true">/</span>
        <a href="/products">{data.categoryName}</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{data.name}</span>
      </nav>

      <section className="product-gallery" aria-label={`${data.name} images`}>
        <div
          className="product-gallery__stage"
          data-has-thumbs={data.gallery.length > 1 ? "true" : "false"}
        >
          {activeImage ? (
            <div className="product-gallery__viewer">
              <ProductProgressiveImage
                className="product-gallery__main"
                alt={activeImage.imageAlt}
                loading="eager"
                imagePath={activeImage.imagePath}
                lowResolutionImagePath={activeImage.lowResolutionImagePath}
                highResolutionImagePath={activeImage.highResolutionImagePath}
              />
            </div>
          ) : null}
          {data.gallery.length > 1 ? (
            <div className="product-gallery__thumbs">
              {data.gallery.map((image, index) => (
                <button
                  className="product-gallery__thumb"
                  data-active={index === activeImageIndex ? "true" : "false"}
                  type="button"
                  aria-label={`View ${image.imageAlt}`}
                  aria-pressed={index === activeImageIndex}
                  onClick={() => setActiveImageIndex(index)}
                  key={image.imagePath}
                >
                  <ProductProgressiveImage
                    className="product-gallery__thumb-image"
                    alt=""
                    imagePath={image.imagePath}
                    loading="lazy"
                    lowResolutionImagePath={image.lowResolutionImagePath}
                    highResolutionImagePath={image.highResolutionImagePath}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="product-summary" aria-labelledby="product-title">
        <p className="homepage-eyebrow">{data.seriesName}</p>
        <h1 id="product-title">{data.name}</h1>
        <div className="product-status-row" aria-label="Product summary">
          <span data-purchasable={data.purchasable ? "true" : "false"}>
            {data.statusLabel}
          </span>
          {data.vendorName ? (
            <span className="product-status-row__vendor">
              By {data.vendorName}
            </span>
          ) : null}
          {showReviews ? <span>{reviewCountLabel}</span> : null}
        </div>
        <div className="product-chip-row" aria-label="Product attributes">
          <span>{data.seriesName}</span>
          <span>{data.categoryName}</span>
        </div>

        <div className="product-purchase-panel" aria-label="Purchase panel">
          <div className="product-price" aria-label="Product price">
            <strong>{selectedPurchaseOption.priceLabel}</strong>
            {selectedPurchaseOption.priceLabel ===
            selectedRegularPriceLabel ? null : (
              <s>{selectedRegularPriceLabel}</s>
            )}
          </div>

          {data.purchasable ? (
            <div className="product-paylater" aria-label="Pay Later message">
              {renderPayLaterMessage ? (
                renderPayLaterMessage(
                  data,
                  data.payLaterMessage.body,
                  selectedPurchaseOption.priceLabel,
                )
              ) : (
                <p>
                  Flexible payment options may be available for{" "}
                  {selectedPurchaseOption.priceLabel} at checkout.
                </p>
              )}
            </div>
          ) : null}

          {purchaseOptions.length > 1 ? (
            <fieldset className="product-purchase-options">
              <legend>Choose box format</legend>
              <div>
                {purchaseOptions.map((option) => (
                  <label
                    className="product-purchase-option"
                    data-selected={
                      selectedPurchaseOption.id === option.id ? "true" : "false"
                    }
                    key={option.id}
                  >
                    <input
                      type="radio"
                      name={`purchase-option-${data.slug}`}
                      value={option.id}
                      checked={selectedPurchaseOption.id === option.id}
                      onChange={() => setSelectedPurchaseOptionId(option.id)}
                    />
                    <span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                    <span>
                      {option.badgeLabel ? <em>{option.badgeLabel}</em> : null}
                      <strong>{option.priceLabel}</strong>
                      {option.valueLabel ? (
                        <small>{option.valueLabel}</small>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          {data.scarcitySignal ? (
            <aside className="product-scarcity" aria-label="Product demand">
              <strong>{data.scarcitySignal.stockLabel}</strong>
              <span>{data.scarcitySignal.viewerLabel}</span>
            </aside>
          ) : null}

          <section className="product-actions" aria-label="Purchase actions">
            {data.unavailableReason ? (
              <p className="product-actions__notice">
                {data.unavailableReason}
              </p>
            ) : null}
            <Button
              className="button button--primary product-actions__button"
              type="button"
              disabled={!data.purchasable}
              onClick={() => {
                if (data.purchasable) {
                  onAddToCart?.(data, selectedPurchaseSelection);
                }
              }}
            >
              {selectedPurchaseOption.ctaLabel ?? "Add to cart"}
            </Button>
          </section>

          <PayPalPaymentFrame className="product-paypal-frame">
            <div className="product-express-actions">
              {data.purchasable && renderDeliveryExpressAction ? (
                <>
                  {renderDeliveryExpressAction(
                    "paypal",
                    data,
                    selectedPurchaseOption.priceLabel,
                  )}
                  {renderDeliveryExpressAction(
                    "paylater",
                    data,
                    selectedPurchaseOption.priceLabel,
                  )}
                </>
              ) : (
                <>
                  <button
                    className="product-express-actions__paypal"
                    data-fulfillment-mode="delivery"
                    type="button"
                    disabled={!data.purchasable}
                    onClick={() => startDeliveryExpress("paypal")}
                  >
                    PayPal
                  </button>
                  <button
                    className="product-express-actions__paylater"
                    data-fulfillment-mode="delivery"
                    type="button"
                    disabled={!data.purchasable}
                    onClick={() => startDeliveryExpress("paylater")}
                  >
                    Pay Later
                  </button>
                </>
              )}
            </div>
          </PayPalPaymentFrame>

          <section className="product-trust-grid" aria-label="Product trust">
            {trustBadges.map((badge) => (
              <Card className="product-trust-card" key={badge.title} size="sm">
                <CardHeader className="product-trust-card__header">
                  <CardTitle className="product-trust-card__title">
                    {badge.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="product-trust-card__content">
                  <span>{badge.body}</span>
                </CardContent>
              </Card>
            ))}
          </section>
        </div>

        <p className="product-summary__intro">{data.introduction}</p>
      </section>

      <section className="product-detail-tabs" aria-label="Product details">
        <Tabs
          value={activeDetailTab}
          onValueChange={(value) =>
            setActiveDetailTab(value as ProductDetailTabId)
          }
          className="product-detail-tabs__root"
        >
          <TabsList
            className="product-detail-tabs__nav"
            variant="line"
            aria-label="Product detail sections"
          >
            {detailTabs.map((tab) => (
              <TabsTrigger
                className="product-detail-tabs__trigger"
                id={`${detailTabPrefix}-${tab.id}-tab`}
                onClick={() => setActiveDetailTab(tab.id)}
                value={tab.id}
                key={tab.id}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {detailTabs.map((tab) => (
            <TabsContent
              className="product-detail-tabs__panel"
              aria-hidden={activeDetailTab !== tab.id}
              hidden={activeDetailTab !== tab.id}
              value={tab.id}
              forceMount
              key={tab.id}
            >
              <h2>{tab.label}</h2>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </section>

      {recommendationCards.length > 0 ? (
        <section
          className="product-commerce-rail"
          aria-label="You may also like"
        >
          <div className="product-commerce-rail__header">
            <h2>You may also like</h2>
            <a href="/products">View all</a>
          </div>
          <div className="product-commerce-rail__grid">
            {recommendationCards.map((recommendation) => (
              <Card
                className="product-recommendation-card"
                key={recommendation.slug}
                size="sm"
              >
                <a
                  className="product-recommendation-card__link"
                  href={recommendation.href}
                >
                  <CardContent className="product-recommendation-card__media">
                    <img
                      src={recommendation.imagePath}
                      alt={recommendation.imageAlt}
                      loading="lazy"
                    />
                  </CardContent>
                  <CardHeader className="product-recommendation-card__header">
                    <CardDescription className="product-recommendation-card__eyebrow">
                      {recommendation.eyebrow}
                    </CardDescription>
                    <CardTitle className="product-recommendation-card__title">
                      {recommendation.name}
                    </CardTitle>
                  </CardHeader>
                  <CardFooter className="product-recommendation-card__footer">
                    <em>{recommendation.priceLabel}</em>
                  </CardFooter>
                </a>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

interface ProductProgressiveImageProps {
  readonly alt: string;
  readonly className?: string;
  readonly highResolutionImagePath?: string | undefined;
  readonly imagePath: string;
  readonly loading?: "eager" | "lazy";
  readonly lowResolutionImagePath?: string | undefined;
}

function ProductProgressiveImage({
  alt,
  className,
  imagePath,
  lowResolutionImagePath,
  highResolutionImagePath,
  loading = "lazy",
}: ProductProgressiveImageProps) {
  const lowImage = lowResolutionImagePath || imagePath;
  const highImage = highResolutionImagePath || imagePath;
  const showProgressive = lowImage !== highImage;
  const [activeImage, setActiveImage] = useState(lowImage);
  const [isHighQuality, setIsHighQuality] = useState(!showProgressive);

  useEffect(() => {
    setActiveImage(lowImage);
    setIsHighQuality(!showProgressive);

    if (!showProgressive) {
      return;
    }

    let active = true;
    const imageLoader = new Image();

    imageLoader.onload = () => {
      if (active) {
        setActiveImage(highImage);
        setIsHighQuality(true);
      }
    };

    imageLoader.onerror = () => {
      if (active) {
        setActiveImage(lowImage);
        setIsHighQuality(false);
      }
    };

    imageLoader.src = highImage;

    return () => {
      active = false;
      imageLoader.onload = null;
      imageLoader.onerror = null;
    };
  }, [imagePath, lowImage, highImage, showProgressive]);

  const classNames = [
    className,
    isHighQuality ? undefined : "product-gallery__image--low-quality",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <img
      alt={alt}
      className={classNames || undefined}
      loading={loading}
      src={activeImage}
      onError={(event) => {
        const current = event.currentTarget;

        if (current.src === new URL(highImage, window.location.href).href) {
          current.src = lowImage;
          setIsHighQuality(false);
          setActiveImage(lowImage);
        }
      }}
    />
  );
}

const defaultTrustBadges: readonly ProductTrustBadge[] = [
  {
    title: "PayPal checkout",
    body: "Official PayPal surfaces render when eligible.",
  },
  {
    title: "Delivery express",
    body: "Delivery checkout can start from this PDP.",
  },
  {
    title: "Pay Later",
    body: "Shown only for purchasable eligible products.",
  },
  {
    title: "Order recovery",
    body: "Buyers can track or recover orders after checkout.",
  },
];

function buildDefaultPurchaseOption(
  data: ProductDetailPageData,
): ProductPurchaseOption {
  return {
    id: "single-item",
    label: "Single item",
    description: "Add one collectible to your cart.",
    priceLabel: data.currentPriceLabel,
    regularPriceLabel: data.regularPriceLabel,
    quantity: 1,
    ctaLabel: "Add to cart",
  };
}

export const defaultProductDetailPages: Readonly<
  Record<string, ProductDetailPageData>
> = {
  "blind-boxes-2": {
    slug: "blind-boxes-2",
    name: "Molly Blind Boxes 2",
    categoryName: "Blind Boxes",
    seriesName: "Molly",
    vendorName: "POP MART",
    statusLabel: "Released",
    purchasable: true,
    currentPriceLabel: "$14.99",
    regularPriceLabel: "$19.69",
    unitPriceCents: 1499,
    maxQuantity: 12,
    introduction:
      "A colorful Molly blind-box demo drop built around painterly shelf presence, surprise reveals, and flexible checkout.",
    details: [
      {
        label: "Material",
        value: "PVC / ABS demo spec",
      },
      {
        label: "Size",
        value: "Approx. 8-10 cm",
      },
      {
        label: "Fulfillment",
        value: "Delivery and pickup eligible",
      },
    ],
    gallery: [
      {
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 front view",
      },
      {
        imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
        imageAlt: "Molly Blind Boxes 2 lineup view",
      },
      {
        imagePath: "/assets/popmart/products/blind-boxes-3-1.png",
        imageAlt: "Molly Blind Boxes 2 alternate collectible view",
      },
    ],
    mediaHighlights: [
      {
        id: "front-render",
        label: "Front render",
        description: "Generated catalog image",
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 front view",
        kind: "image",
      },
      {
        id: "secret-silhouette",
        label: "Secret silhouette",
        description: "Hidden figure preview slot",
        kind: "silhouette",
      },
    ],
    purchaseOptions: [
      {
        id: "random-1pc",
        label: "Random 1PC",
        description: "One sealed blind box selected at random.",
        priceLabel: "$14.99",
        regularPriceLabel: "$19.69",
        quantity: 1,
        badgeLabel: "Single box",
        ctaLabel: "Add to cart",
      },
      {
        id: "whole-box-12pc",
        label: "Whole Box - 12PC no duplicates",
        description: "Full demo box format for collectors who want the set.",
        priceLabel: "$170.89",
        regularPriceLabel: "$179.88",
        quantity: 12,
        badgeLabel: "Best value",
        valueLabel: "5% bundle saving",
        ctaLabel: "Add whole box",
      },
    ],
    scarcitySignal: {
      stockLabel: "Only 14 left in this demo drop",
      viewerLabel: "38 collectors are viewing this item",
    },
    story: {
      eyebrow: "Molly story",
      title: "Molly Blind Boxes 2 collector note",
      body: "This fallback demo frames Molly as a curious studio artist, giving the blind-box reveal a clear character moment without implying official IP lore beyond the seeded demo catalog.",
    },
    seriesLineup: {
      title: "Series lineup",
      subtitle: "12 regular demo styles plus 1 secret-style slot.",
      secretOddsLabel: "Secret odds 1:144",
      items: [
        {
          name: "Canvas Molly",
          typeLabel: "Regular",
          imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
          imageAlt: "Canvas Molly demo lineup collectible",
        },
        {
          name: "Color Mixer",
          typeLabel: "Regular",
          imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
          imageAlt: "Color Mixer demo lineup collectible",
        },
        {
          name: "Gallery Day",
          typeLabel: "Regular",
          imagePath: "/assets/popmart/products/blind-boxes-3-1.png",
          imageAlt: "Gallery Day demo lineup collectible",
        },
        {
          name: "Secret Silhouette",
          typeLabel: "Secret",
        },
      ],
    },
    specHighlights: [
      { label: "Material", value: "PVC / ABS demo spec" },
      { label: "Height", value: "Approx. 8-10 cm" },
      { label: "Age", value: "15+ collector demo" },
      { label: "Box type", value: "Sealed blind box" },
    ],
    socialProof: [
      {
        id: "proof-blind-boxes-2-1",
        mediaLabel: "Photo unboxing",
        title: "Reveal moment feels clear",
        body: "Seeded demo social proof showing how buyer media can reduce hesitation before checkout.",
        authorName: "Demo collector",
      },
    ],
    recommendations: [
      {
        slug: "blind-boxes-1",
        name: "Midnight Carnival Blind Box",
        eyebrow: "Blind Boxes",
        priceLabel: "$15.99",
        imagePath: "/assets/popmart/products/blind-boxes-1-1.png",
        imageAlt: "Midnight Carnival Blind Box generated demo product",
        href: "/products/blind-boxes-1",
      },
      {
        slug: "accessories-21",
        name: "Protective Showcase",
        eyebrow: "Accessories",
        priceLabel: "$9.99",
        imagePath: "/assets/popmart/products/accessories-21-1.png",
        imageAlt: "Protective Showcase generated demo product",
        href: "/products/accessories-21",
      },
    ],
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available for $14.99 at checkout.",
    },
    reviews: [
      {
        id: "review-blind-boxes-2-1",
        authorName: "Mina",
        ratingLabel: "5 out of 5",
        title: "Great blind box moment",
        body: "The demo reveal flow feels clear and the product media gives enough context to continue checkout.",
      },
    ],
  },
  "vinyl-figures-7": {
    slug: "vinyl-figures-7",
    name: "Pucky Vinyl Figures 2",
    categoryName: "Vinyl Figures",
    seriesName: "Pucky",
    vendorName: "POP MART",
    statusLabel: "Not released",
    purchasable: false,
    unavailableReason: "Checkout opens after release.",
    currentPriceLabel: "$22.99",
    regularPriceLabel: "$22.99",
    introduction:
      "A preview-only vinyl figure demo page for collectors comparing upcoming drops before checkout opens.",
    details: [
      {
        label: "Release window",
        value: "July 2026",
      },
      {
        label: "Order type",
        value: "Preview only",
      },
    ],
    gallery: [
      {
        imagePath: "/assets/popmart/products/vinyl-figures-7-1.png",
        imageAlt: "Pucky Vinyl Figures 2 front view",
      },
    ],
    specHighlights: [
      { label: "Material", value: "PVC / ABS demo spec" },
      { label: "Height", value: "Preview spec pending" },
      { label: "Age", value: "15+ collector demo" },
      { label: "Box type", value: "Retail figure box" },
    ],
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available for $22.99 at checkout.",
    },
    reviews: [],
  },
  "plush-12": {
    slug: "plush-12",
    name: "Molly Plush 2",
    categoryName: "Plush",
    seriesName: "Molly",
    vendorName: "POP MART",
    statusLabel: "Released",
    purchasable: true,
    currentPriceLabel: "$19.99",
    regularPriceLabel: "$19.99",
    unitPriceCents: 1999,
    maxQuantity: 3,
    introduction:
      "A soft Molly plush demo item designed for gifting-led browsing, pickup eligibility, and PayPal checkout testing.",
    details: [
      {
        label: "Material",
        value: "Plush textile demo spec",
      },
      {
        label: "Fulfillment",
        value: "Delivery and pickup eligible",
      },
    ],
    gallery: [
      {
        imagePath: "/assets/popmart/products/plush-12-1.png",
        imageAlt: "Molly Plush 2 front view",
      },
    ],
    specHighlights: [
      { label: "Material", value: "Plush textile demo spec" },
      { label: "Height", value: "Approx. 18 cm" },
      { label: "Age", value: "15+ collector demo" },
      { label: "Box type", value: "Giftable plush pack" },
    ],
    recommendations: [
      {
        slug: "blind-boxes-2",
        name: "Molly Blind Boxes 2",
        eyebrow: "Blind Boxes",
        priceLabel: "$14.99",
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 generated demo product",
        href: "/products/blind-boxes-2",
      },
    ],
    payLaterMessage: {
      title: "Pay Later with PayPal",
      body: "Flexible payment options may be available for $19.99 at checkout.",
    },
    reviews: [],
  },
};

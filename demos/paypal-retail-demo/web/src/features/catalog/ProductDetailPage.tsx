import { useState } from "react";

export interface ProductGalleryImage {
  readonly imagePath: string;
  readonly imageAlt: string;
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

export interface ProductDetailPageData {
  readonly slug: string;
  readonly name: string;
  readonly categoryName: string;
  readonly seriesName: string;
  readonly statusLabel: string;
  readonly purchasable: boolean;
  readonly unavailableReason?: string;
  readonly currentPriceLabel: string;
  readonly regularPriceLabel: string;
  readonly introduction: string;
  readonly details: readonly ProductDetailRow[];
  readonly gallery: readonly ProductGalleryImage[];
  readonly payLaterMessage: ProductPayLaterMessage;
  readonly reviews: readonly ProductReview[];
}

export interface ProductDetailPageProps {
  readonly data: ProductDetailPageData;
  readonly onAddToCart?: (product: ProductDetailPageData) => void;
}

export function ProductDetailPage({
  data,
  onAddToCart,
}: ProductDetailPageProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImage = data.gallery[activeImageIndex] ?? data.gallery[0];
  const showReviews = data.purchasable && data.reviews.length > 0;

  return (
    <div className="product-page">
      <section className="product-gallery" aria-label={`${data.name} images`}>
        {activeImage ? (
          <img
            className="product-gallery__main"
            src={activeImage.imagePath}
            alt={activeImage.imageAlt}
          />
        ) : null}
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
              <img src={image.imagePath} alt="" />
            </button>
          ))}
        </div>
      </section>

      <section className="product-summary" aria-labelledby="product-title">
        <p className="homepage-eyebrow">{data.seriesName}</p>
        <h1 id="product-title">{data.name}</h1>
        <div className="product-summary__meta">
          <span>{data.categoryName}</span>
          <span data-purchasable={data.purchasable ? "true" : "false"}>
            {data.statusLabel}
          </span>
        </div>
        <p className="product-summary__intro">{data.introduction}</p>

        <div className="product-price" aria-label="Product price">
          <strong>{data.currentPriceLabel}</strong>
          {data.currentPriceLabel === data.regularPriceLabel ? null : (
            <s>{data.regularPriceLabel}</s>
          )}
        </div>

        <dl className="product-detail-list">
          {data.details.map((detail) => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>

        {data.purchasable ? (
          <section
            className="product-paylater"
            aria-labelledby="product-paylater-title"
          >
            <h2 id="product-paylater-title">{data.payLaterMessage.title}</h2>
            <p>{data.payLaterMessage.body}</p>
          </section>
        ) : null}

        <section className="product-actions" aria-label="Purchase actions">
          {data.unavailableReason ? (
            <p className="product-actions__notice">{data.unavailableReason}</p>
          ) : null}
          <button
            className="button button--primary"
            type="button"
            disabled={!data.purchasable}
            onClick={() => {
              if (data.purchasable) {
                onAddToCart?.(data);
              }
            }}
          >
            Add to cart
          </button>
          <div className="product-express-actions">
            <button
              className="product-express-actions__paypal"
              type="button"
              disabled={!data.purchasable}
            >
              PayPal
            </button>
            <button
              className="product-express-actions__paylater"
              type="button"
              disabled={!data.purchasable}
            >
              Pay Later
            </button>
          </div>
        </section>
      </section>

      {showReviews ? (
        <section
          className="product-reviews"
          aria-labelledby="product-reviews-title"
        >
          <h2 id="product-reviews-title">Collector reviews</h2>
          <div className="product-reviews__list">
            {data.reviews.map((review) => (
              <article className="product-review" key={review.id}>
                <div>
                  <strong>{review.title}</strong>
                  <span>{review.ratingLabel}</span>
                </div>
                <p>{review.body}</p>
                <footer>{review.authorName}</footer>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export const defaultProductDetailPages: Readonly<
  Record<string, ProductDetailPageData>
> = {
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
    details: [
      {
        label: "Material",
        value: "PVC / ABS",
      },
      {
        label: "Size",
        value: "Approx. 8 cm",
      },
      {
        label: "Order type",
        value: "Delivery express available",
      },
    ],
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
        id: "review-labubu-1",
        authorName: "Mina",
        ratingLabel: "5 out of 5",
        title: "Cute desk companion",
        body: "Arrived safely and looks great next to my monitor.",
      },
      {
        id: "review-labubu-2",
        authorName: "Alex",
        ratingLabel: "4 out of 5",
        title: "Great blind box moment",
        body: "Packaging felt premium and the reveal was fun.",
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
    details: [
      {
        label: "Release window",
        value: "June 2026",
      },
      {
        label: "Order type",
        value: "Preview only",
      },
    ],
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

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  ProductDetailPage,
  type ProductDetailPageData,
} from "./ProductDetailPage.js";

describe("ProductDetailPage", () => {
  it("renders released product details with gallery, amount-aware Pay Later, actions, and reviews", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain("Blind Boxes");
    expect(html).toContain("$13.99");
    expect(html).toContain("$15.99");
    expect(html).toContain("Pay Later with PayPal");
    expect(html).toContain(
      "Flexible payment options may be available for $13.99",
    );
    expect(html).toContain("Add to cart");
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain("Collector reviews");
    expect(html).toContain("Cute desk companion");
    expect(html).toContain('alt="Labubu Have a Seat front view"');
    expect(html.match(/class="product-gallery__thumb"/g)?.length).toBe(3);
    expect(html).not.toContain("Pickup");
  });

  it("keeps future-release PDPs viewable while blocking checkout actions and hiding reviews", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={unreleasedProduct()} />,
    );

    expect(html).toContain("Skullpanda Future Drop");
    expect(html).toContain("Not released");
    expect(html).toContain("Checkout opens after release.");
    expect(html).toContain("disabled");
    expect(html).not.toContain("Collector reviews");
    expect(html).not.toContain(
      "Flexible payment options may be available for $15.99",
    );
    expect(html).not.toContain("Pickup");
  });
});

export function releasedProduct(): ProductDetailPageData {
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
      {
        label: "Size",
        value: "Approx. 8 cm",
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
        id: "review-1",
        authorName: "Mina",
        ratingLabel: "5 out of 5",
        title: "Cute desk companion",
        body: "Arrived safely and looks great next to my monitor.",
      },
    ],
  };
}

export function unreleasedProduct(): ProductDetailPageData {
  return {
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
  };
}

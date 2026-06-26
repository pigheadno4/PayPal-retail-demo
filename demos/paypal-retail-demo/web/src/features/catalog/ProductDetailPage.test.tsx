// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(html).toContain(
      "Flexible payment options may be available for $13.99",
    );
    expect(html).toContain("Add to cart");
    expect(html).toContain("PayPal");
    expect(html).toContain("Pay Later");
    expect(html).toContain("Collector reviews");
    expect(html).toContain("Cute desk companion");
    expect(html).toContain('data-review-card="true"');
    expect(html).toContain("Random 1PC");
    expect(html).toContain("Whole Box - 12PC no duplicates");
    expect(html).toContain("Only 14 left in this demo drop");
    expect(html).toContain("Series lineup");
    expect(html).toContain("Secret odds 1:144");
    expect(html).toContain("You may also like");
    expect(html).toContain('alt="Labubu Have a Seat front view"');
    expect(html.match(/class="product-gallery__thumb"/g)?.length).toBe(3);
    expect(html).not.toContain('class="product-media-strip"');
    expect(html).not.toContain('class="product-media-card"');
    expect(html).not.toContain("Front render");
    expect(html).not.toContain("Secret silhouette");
    expect(html).not.toContain("Pickup");
  });

  it("renders the supported detailed PDP reference structure", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain("Home");
    expect(html).toContain("Products");
    expect(html).toContain("Blind Boxes");
    expect(html).toContain("Labubu Have a Seat");
    expect(html).toContain('class="product-status-row"');
    expect(html).toContain("By POP MART");
    expect(html).toContain("1 collector review");
    expect(html).toContain('class="product-chip-row"');
    expect(html).toMatch(
      /<button[^>]*data-slot="button"[^>]*class="[^"]*product-actions__button/,
    );
    expect(html).toMatch(
      /<fieldset[^>]*data-slot="field-set"[^>]*class="[^"]*product-paypal-frame/,
    );
    expect(html).toContain("Secured by PayPal");
    expect(html).toContain('class="product-trust-grid"');
    expect(html).toContain("PayPal checkout");
    expect(html).toContain("Order recovery");
    expect(html).toContain("Collector details");
    expect(html).toContain("Product facts");
    expect(html).toContain("Customer reviews");
    expect(html).toContain("Shipping and returns");
    expect(html).toContain("Q&amp;A");
    expect(html).toContain("You may also like");
    expect(html).toContain('data-slot="card"');
    expect(html).toContain('data-slot="card-header"');
    expect(html).toContain('data-slot="card-title"');
    expect(html).toContain('data-slot="card-content"');
    expect(html).toContain('data-slot="card-footer"');
    expect(html).not.toContain("Recently viewed");
    expect(html).not.toContain("Deposit");
    expect(html).not.toContain("Purchase status");
    expect(html).not.toContain('class="product-release-panel"');
  });

  it("uses low-resolution gallery media first when high-resolution source is provided", () => {
    const product = releasedProduct();

    const withProgressiveGallery = {
      ...product,
      gallery: product.gallery.map((image, index) => ({
        ...image,
        lowResolutionImagePath: `${image.imagePath}?w=240`,
        highResolutionImagePath:
          index === 0
            ? `${image.imagePath}?w=2048`
            : `${image.imagePath}?w=1200`,
      })),
    };

    const html = renderToStaticMarkup(
      <ProductDetailPage data={withProgressiveGallery} />,
    );

    expect(html).toContain(
      'class="product-gallery__main product-gallery__image--low-quality"',
    );
    expect(html).toContain(
      'class="product-gallery__thumb-image product-gallery__image--low-quality"',
    );
    expect(html).toContain(
      "/assets/popmart/products/labubu-have-a-seat-1.svg?w=240",
    );
    expect(html).not.toContain(
      '"/assets/popmart/products/labubu-have-a-seat-1.svg?w=1200"',
    );
  });

  it("updates Pay Later amount and cart selection when the whole-box option is selected", () => {
    const selections: unknown[] = [];

    render(
      <ProductDetailPage
        data={releasedProduct()}
        onAddToCart={(_product, selection) => selections.push(selection)}
        renderPayLaterMessage={(_product, _fallbackMessage, amountLabel) => (
          <p data-testid="paylater-amount">{amountLabel}</p>
        )}
      />,
    );

    expect(screen.getByTestId("paylater-amount").textContent).toBe("$13.99");

    fireEvent.click(
      screen.getByRole("radio", {
        name: /Whole Box - 12PC no duplicates/,
      }),
    );

    expect(screen.getByTestId("paylater-amount").textContent).toBe("$159.49");
    fireEvent.click(screen.getByRole("button", { name: "Add whole box" }));

    expect(selections).toEqual([
      {
        optionId: "whole-box-12pc",
        label: "Whole Box - 12PC no duplicates",
        quantity: 12,
        priceLabel: "$159.49",
      },
    ]);
  });

  it("places the official Pay Later message directly under the price before primary actions", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    const priceIndex = html.indexOf('class="product-price"');
    const payLaterIndex = html.indexOf(
      'class="product-paylater" aria-label="Pay Later message"',
    );
    const actionIndex = html.indexOf('class="product-actions"');
    const frameIndex = html.indexOf("product-paypal-frame");

    expect(priceIndex).toBeGreaterThan(-1);
    expect(payLaterIndex).toBeGreaterThan(priceIndex);
    expect(actionIndex).toBeGreaterThan(payLaterIndex);
    expect(frameIndex).toBeGreaterThan(actionIndex);
    expect(html).not.toContain('id="product-paylater-title"');
  });

  it("renders lower PDP details as tabs instead of loose desktop cards", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    expect(html).toContain('data-slot="tabs"');
    expect(html).toContain('data-slot="tabs-list"');
    expect(html).toContain('data-slot="tabs-trigger"');
    expect(html).toContain('data-slot="tabs-content"');
    expect(html).toContain('data-variant="line"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-selected="false"');
  });

  it("switches detail tabs and hides inactive force-mounted panels", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProductDetailPage data={releasedProduct()} />,
    );
    const view = within(container);

    const collectorTab = view.getByRole("tab", {
      name: "Collector details",
    });
    const factsTab = view.getByRole("tab", { name: "Product facts" });
    const qaTab = view.getByRole("tab", { name: "Q&A" });
    const panels = Array.from(
      container.querySelectorAll('[data-slot="tabs-content"]'),
    );
    const collectorPanel = panels.find((panel) =>
      panel.textContent?.includes("Labubu Have a Seat collector note"),
    );
    const factsPanel = panels.find((panel) =>
      panel.textContent?.includes("PVC / ABS demo spec"),
    );
    const qaPanel = panels.find((panel) =>
      panel.textContent?.includes("No customer questions are published"),
    );

    expect(factsTab.id).toBe("product-detail-labubu-have-a-seat-facts-tab");
    expect(collectorTab.getAttribute("aria-selected")).toBe("true");
    expect(factsTab.getAttribute("aria-selected")).toBe("false");
    expect(qaTab.getAttribute("aria-selected")).toBe("false");
    expect(collectorPanel?.hasAttribute("hidden")).toBe(false);
    expect(collectorPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(factsPanel?.hasAttribute("hidden")).toBe(true);
    expect(factsPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(qaPanel?.hasAttribute("hidden")).toBe(true);
    expect(qaPanel?.getAttribute("aria-hidden")).toBe("true");

    await user.click(factsTab);

    expect(collectorTab.getAttribute("aria-selected")).toBe("false");
    expect(factsTab.getAttribute("aria-selected")).toBe("true");
    expect(qaTab.getAttribute("aria-selected")).toBe("false");
    expect(collectorPanel?.hasAttribute("hidden")).toBe(true);
    expect(collectorPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(factsPanel?.hasAttribute("hidden")).toBe(false);
    expect(factsPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(factsPanel?.textContent).toContain("PVC / ABS demo spec");

    await user.click(qaTab);

    expect(collectorTab.getAttribute("aria-selected")).toBe("false");
    expect(factsTab.getAttribute("aria-selected")).toBe("false");
    expect(qaTab.getAttribute("aria-selected")).toBe("true");
    expect(collectorPanel?.hasAttribute("hidden")).toBe(true);
    expect(collectorPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(factsPanel?.hasAttribute("hidden")).toBe(true);
    expect(factsPanel?.getAttribute("aria-hidden")).toBe("true");
    expect(qaPanel?.hasAttribute("hidden")).toBe(false);
    expect(qaPanel?.getAttribute("aria-hidden")).toBe("false");
    expect(qaPanel?.textContent).toContain(
      "No customer questions are published",
    );
  });

  it("keeps detailed PDP thumbnails in a stage for desktop rail styling", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    expect(html).toContain('class="product-gallery__stage"');
    expect(html).toContain('class="product-gallery__viewer"');
    expect(html.match(/class="product-gallery__thumb"/g)?.length).toBe(3);
  });

  it("places the mobile purchase hierarchy before long PDP content", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage data={releasedProduct()} />,
    );

    const titleIndex = html.indexOf('id="product-title"');
    const purchasePanelIndex = html.indexOf('class="product-purchase-panel"');
    const addToCartIndex = html.indexOf("Add to cart");
    const introIndex = html.indexOf('class="product-summary__intro"');
    const detailsIndex = html.indexOf('class="product-detail-list"');
    const reviewsIndex = html.indexOf("Collector reviews");

    expect(titleIndex).toBeGreaterThan(-1);
    expect(purchasePanelIndex).toBeGreaterThan(titleIndex);
    expect(addToCartIndex).toBeGreaterThan(purchasePanelIndex);
    expect(addToCartIndex).toBeLessThan(introIndex);
    expect(purchasePanelIndex).toBeLessThan(detailsIndex);
    expect(purchasePanelIndex).toBeLessThan(reviewsIndex);
  });

  it("omits the thumbnail rail when the PDP has only one gallery image", () => {
    const html = renderToStaticMarkup(
      <ProductDetailPage
        data={{
          ...releasedProduct(),
          gallery: releasedProduct().gallery.slice(0, 1),
        }}
      />,
    );

    expect(html).toContain('class="product-gallery__main"');
    expect(html).not.toContain('class="product-gallery__thumbs"');
    expect(html).not.toContain('class="product-gallery__thumb"');
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
    expect(html).not.toContain("Customer reviews");
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
    vendorName: "POP MART",
    statusLabel: "Released",
    purchasable: true,
    currentPriceLabel: "$13.99",
    regularPriceLabel: "$15.99",
    unitPriceCents: 1399,
    maxQuantity: 12,
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
    mediaHighlights: [
      {
        id: "front-render",
        label: "Front render",
        description: "Current generated catalog image",
        imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
        imageAlt: "Labubu Have a Seat front view",
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
        priceLabel: "$13.99",
        regularPriceLabel: "$15.99",
        quantity: 1,
        badgeLabel: "Single box",
        ctaLabel: "Add to cart",
      },
      {
        id: "whole-box-12pc",
        label: "Whole Box - 12PC no duplicates",
        description: "Full demo box format for collectors who want the set.",
        priceLabel: "$159.49",
        regularPriceLabel: "$167.88",
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
      eyebrow: "THE MONSTERS story",
      title: "Labubu Have a Seat collector note",
      body: "This demo story frames the figure as a shelf-friendly collectible with a clear character moment, display value, and surprise-driven appeal.",
    },
    seriesLineup: {
      title: "Series lineup",
      subtitle: "12 regular demo styles plus 1 secret-style slot.",
      secretOddsLabel: "Secret odds 1:144",
      items: [
        {
          name: "Canvas Labubu",
          typeLabel: "Regular",
          imagePath: "/assets/popmart/products/labubu-have-a-seat-1.svg",
          imageAlt: "Canvas Labubu demo lineup collectible",
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
        id: "proof-1",
        mediaLabel: "Photo unboxing",
        title: "Shelf-ready reveal",
        body: "Demo social proof showing the buyer value of an unboxing moment.",
        authorName: "Demo collector",
      },
    ],
    recommendations: [
      {
        slug: "blind-boxes-2",
        name: "Molly Blind Boxes 2",
        eyebrow: "Blind Boxes",
        priceLabel: "$19.69",
        imagePath: "/assets/popmart/products/blind-boxes-2-1.png",
        imageAlt: "Molly Blind Boxes 2 generated demo product",
        href: "/products/blind-boxes-2",
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
    vendorName: "POP MART",
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

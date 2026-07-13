import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalCss = readFileSync(
  new URL("./global.css", import.meta.url),
  "utf8",
);
const indexHtml = readFileSync(
  new URL("../../index.html", import.meta.url),
  "utf8",
);

describe("global storefront visual tokens", () => {
  it("defines the POP MART profile with multi-accent retail tokens and round typography", () => {
    const popmartTheme = cssBlock(".theme-popmart");

    expect(popmartTheme).toContain("--pm-coral-red: #f42434");
    expect(popmartTheme).toContain("--pm-candy-pink: #ff8ab3");
    expect(popmartTheme).toContain("--pm-lemon: #ffd75a");
    expect(popmartTheme).toContain("--pm-mint: #4ecf9a");
    expect(popmartTheme).toContain("--pm-sky: #82cfff");
    expect(popmartTheme).toContain("--pm-warm-white: #fff8f3");
    expect(popmartTheme).toContain("--pm-ink: #161616");
    expect(popmartTheme).toContain("--shell-accent: var(--pm-coral-red)");
    expect(popmartTheme).toContain("--shell-bg: var(--pm-warm-white)");
    expect(popmartTheme).toContain("--shell-card-radius: 14px");
    expect(popmartTheme).toContain('"Nunito Sans"');
    expect(popmartTheme).toContain('"Rubik"');
    expect(popmartTheme).toContain("--transaction-heading-font:");
    expect(popmartTheme).toContain("--transaction-body-font:");
  });

  it("keeps the generic profile on its own palette instead of inheriting POP MART tokens", () => {
    const genericTheme = cssBlock(".theme-generic");

    expect(genericTheme).toContain("--shell-accent: #c5914e");
    expect(genericTheme).not.toContain("--pm-coral-red");
    expect(genericTheme).not.toContain('"Rubik"');
    expect(genericTheme).not.toContain("--transaction-heading-font");
    expect(genericTheme).not.toContain("--transaction-body-font");
  });

  it("scopes softer transaction typography to auth minicart and checkout surfaces", () => {
    const rootBlock = cssBlock(":root");
    const transactionSurfaceBlock = cssBlock(
      ".auth-modal__panel,\n.minicart-shell,\n.checkout-workflow,\n.checkout-summary,\n.checkout-sticky-summary,\n.checkout-order-sheet,\n.checkout-modal__panel",
    );
    const transactionHeadingBlock = cssBlock(
      ".auth-modal__panel h2,\n.auth-modal__panel h3,\n.minicart-shell h2,\n.checkout-workflow h2,\n.checkout-summary h2,\n.checkout-order-sheet h2,\n.checkout-modal__header h2",
    );
    const transactionLabelBlock = cssBlock(
      '.auth-modal__panel label,\n.auth-modal__panel [data-slot="label"],\n.minicart-shell strong,\n.checkout-field,\n.checkout-choice b,\n.checkout-store-card h3,\n.checkout-store-card__inventory-lines span,\n.checkout-step__state',
    );
    const transactionHelperBlock = cssBlock(
      '.auth-modal__status,\n.minicart-shell__header [data-slot="sheet-description"],\n.checkout-step p,\n.checkout-summary__description,\n.checkout-payment-readiness p,\n.checkout-store-card__inventory-lines strong',
    );

    expect(rootBlock).toContain(
      "--transaction-heading-font: var(--shell-heading-font)",
    );
    expect(rootBlock).toContain(
      "--transaction-body-font: var(--shell-ui-font)",
    );
    expect(rootBlock).toContain("--transaction-heading-weight: 740");
    expect(rootBlock).toContain("--transaction-strong-weight: 680");
    expect(rootBlock).toContain("--transaction-body-weight: 560");
    expect(transactionSurfaceBlock).toContain(
      "font-family: var(--transaction-body-font)",
    );
    expect(transactionSurfaceBlock).toContain(
      "font-weight: var(--transaction-body-weight)",
    );
    expect(transactionHeadingBlock).toContain(
      "font-family: var(--transaction-heading-font)",
    );
    expect(transactionHeadingBlock).toContain(
      "font-weight: var(--transaction-heading-weight)",
    );
    expect(transactionLabelBlock).toContain(
      "font-weight: var(--transaction-strong-weight)",
    );
    expect(transactionHelperBlock).toContain(
      "font-weight: var(--transaction-body-weight)",
    );
    expect(transactionHeadingBlock).not.toContain("font-weight: 900");
    expect(transactionHeadingBlock).not.toContain("font-weight: 950");
  });

  it("links a local favicon so visual QA is not polluted by favicon 404 noise", () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('href="/favicon.svg"');
    expect(indexHtml).not.toMatch(/rel="icon"[^>]+href="https:\/\//);
  });

  it("keeps pickup inventory rows compact and scannable across checkout widths", () => {
    const inventoryLineBlock = cssBlock(
      ".checkout-store-card__inventory-lines li",
    );
    const inventoryNameBlock = cssBlock(".checkout-store-card__inventory-name");
    const inventoryStatusBlock = cssBlock(
      ".checkout-store-card__inventory-status",
    );
    const mobileInventoryLineBlock = cssBlockContaining(
      ".checkout-store-card__inventory-lines li",
      "grid-template-columns: minmax(0, 1fr);",
    );
    const mobileInventoryStatusBlock = cssBlockContaining(
      ".checkout-store-card__inventory-status",
      "white-space: normal",
    );
    const storeHeadingBlock = cssBlock(".checkout-store-card__heading");
    const mobileStoreHeadingBlock = cssBlockContaining(
      ".checkout-store-card__heading",
      "grid-template-columns: minmax(0, 1fr);",
    );
    const mobileStoreDistanceBlock = cssBlockContaining(
      ".checkout-store-card__distance",
      "justify-self: end",
    );

    expect(inventoryLineBlock).toContain("display: grid");
    expect(inventoryLineBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(inventoryLineBlock).toContain("min-width: 0");
    expect(inventoryNameBlock).toContain("-webkit-line-clamp: 2");
    expect(inventoryNameBlock).toContain("overflow: hidden");
    expect(inventoryNameBlock).toContain("word-break: normal");
    expect(inventoryStatusBlock).toContain("justify-self: end");
    expect(inventoryStatusBlock).toContain("text-align: right");
    expect(inventoryStatusBlock).toContain("white-space: nowrap");
    expect(mobileInventoryLineBlock).toContain(
      "grid-template-columns: minmax(0, 1fr);",
    );
    expect(mobileInventoryStatusBlock).toContain("white-space: normal");
    expect(storeHeadingBlock).toContain("display: grid");
    expect(storeHeadingBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(mobileStoreHeadingBlock).toContain(
      "grid-template-columns: minmax(0, 1fr);",
    );
    expect(mobileStoreDistanceBlock).toContain("justify-self: end");
  });

  it("locks Round 4 auth modal form sizing and inline password affordances", () => {
    const authPanelBlock = cssBlock(".auth-modal__panel");
    const authActionsBlock = cssBlock(".auth-modal__actions");
    const authPrimaryActionBlock = cssBlock(".auth-modal__primary-action");
    const authInputBlock = cssBlock('.auth-modal__panel [data-slot="input"]');
    const passwordControlBlock = cssBlock(".auth-modal__password-control");
    const passwordInputBlock = cssBlock(".auth-modal__password-input");
    const passwordToggleBlock = cssBlock(".auth-modal__password-toggle");
    const emailSummaryBlock = cssBlock(".auth-modal__email-summary");
    const emailSummaryValueBlock = cssBlock(
      ".auth-modal__email-summary strong",
    );
    const closeButtonBlock = cssBlock(
      ".auth-modal__panel .dialog-close-button",
    );

    expect(authPanelBlock).toContain("width: min(450px, calc(100vw - 32px))");
    expect(authActionsBlock).toContain("display: grid");
    expect(authActionsBlock).toContain("grid-template-columns: 1fr");
    expect(authPrimaryActionBlock).toContain("min-height: 44px");
    expect(authPrimaryActionBlock).toContain("width: 100%");
    expect(authInputBlock).toContain("min-height: 44px");
    expect(passwordControlBlock).toContain("min-height: 44px");
    expect(passwordControlBlock).toContain("position: relative");
    expect(passwordInputBlock).toContain("padding-right: 52px");
    expect(passwordToggleBlock).toContain("min-height: 44px");
    expect(passwordToggleBlock).toContain("min-width: 44px");
    expect(passwordToggleBlock).toContain("position: absolute");
    expect(emailSummaryBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(emailSummaryValueBlock).toContain("overflow: hidden");
    expect(emailSummaryValueBlock).toContain("text-overflow: ellipsis");
    expect(emailSummaryValueBlock).toContain("white-space: nowrap");
    expect(emailSummaryValueBlock).not.toContain("overflow-wrap: anywhere");
    expect(closeButtonBlock).toContain("min-height: 44px");
    expect(closeButtonBlock).toContain("min-width: 44px");
  });

  it("keeps blocked mobile payment readiness compact inside the sticky drawer", () => {
    const readinessBlock = cssBlock(".checkout-sticky-summary__readiness");
    const readinessBodyBlock = cssBlock(
      ".checkout-sticky-summary__readiness p",
    );

    expect(readinessBlock).toContain("min-height: 52px");
    expect(readinessBlock).toContain("width: 100%");
    expect(readinessBodyBlock).toContain("-webkit-line-clamp: 2");
    expect(readinessBodyBlock).toContain("overflow: hidden");
  });

  it("applies the POP MART heading font through shared heading selectors", () => {
    const headingBlock = cssBlock("h1,\nh2,\nh3");

    expect(headingBlock).toContain("font-family: var(--shell-heading-font)");
    expect(headingBlock).toContain("letter-spacing: 0");
  });

  it("compresses category filters on mobile before product cards", () => {
    const catalogShopControlsBlock = cssBlock(".catalog-shop-controls");
    const catalogCategoryQuickFiltersBlock = cssBlock(
      ".catalog-category-quick-filters",
    );
    const catalogSortControlBlock = cssBlock(".catalog-sort-control");
    const catalogAppliedFiltersBlock = cssBlock(".catalog-applied-filters");

    expect(catalogShopControlsBlock).toContain(
      "grid-template-columns:\n    minmax(108px, 0.16fr) minmax(360px, 1fr) minmax(220px, 0.34fr) auto\n    minmax(160px, 0.28fr);",
    );
    expect(catalogCategoryQuickFiltersBlock).toContain(
      "grid-template-columns: auto minmax(0, 1fr);",
    );
    expect(catalogSortControlBlock).toContain(
      "grid-template-columns: auto minmax(0, 1fr);",
    );
    expect(catalogAppliedFiltersBlock).not.toContain("grid-column: 1 / -1");
    expect(globalCss).toContain(".catalog-mobile-filter-rail");
    expect(globalCss).toContain(".catalog-mobile-filters");
    expect(globalCss).toContain(".catalog-mobile-filter-trigger");
    expect(globalCss).toContain(".catalog-shop-controls {\n    display: none;");
    expect(globalCss).toContain(".catalog-filters {\n    display: none;");
    expect(globalCss).toContain(
      ".catalog-product-section {\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(globalCss).not.toContain(".catalog-mobile-filters[open] {");
  });

  it("prioritizes the mobile home hero and release content before utility cards", () => {
    const siteHeaderBlock = cssBlock(".site-header");
    const heroBlock = cssBlock(".homepage-hero");
    const heroOverlayBlock = cssBlock(".homepage-hero__visual-link::after");
    const trustIconBlock = cssBlock(".homepage-trust-card__icon");
    const productCtaBlock = cssBlock(".product-card__cta");
    const categoryArrowBlock = cssBlock(".category-pill__arrow");
    const railScrollBlock = cssBlock(
      ".category-strip__scroll,\n.series-grid__scroll",
    );
    const railViewportBlock = cssBlock(
      '.category-strip__scroll [data-slot="scroll-area-viewport"],\n.series-grid__scroll [data-slot="scroll-area-viewport"]',
    );

    expect(globalCss).toContain(".homepage-hero__visual-link");
    expect(globalCss).toContain(
      '.homepage[data-loading="true"] .homepage-hero__visual-link::after',
    );
    expect(heroBlock).toContain("min-height: clamp(400px, 38vw, 520px)");
    expect(heroOverlayBlock).toContain("position: absolute");
    expect(globalCss).toContain("min-height: clamp(320px, 86vw, 380px);");
    expect(globalCss).toContain(".homepage-hero::after");
    expect(globalCss).toContain(".homepage-drop-board {\n    order: 2;");
    expect(globalCss).toContain(".homepage-trust-strip {\n    order: 5;");
    expect(globalCss).toContain(".homepage-paylater-promo {\n    order: 6;");
    expect(globalCss).toContain("grid-auto-columns: minmax(214px, 74vw);");
    expect(globalCss).toContain("grid-auto-columns: minmax(270px, 88vw);");
    expect(globalCss).toContain("scroll-snap-type: x proximity;");
    expect(railScrollBlock).toContain("max-width: 100%");
    expect(railScrollBlock).toContain("min-width: 0");
    expect(railScrollBlock).toContain("overflow: hidden");
    expect(railViewportBlock).toContain("max-width: 100%");
    expect(railViewportBlock).toContain("min-width: 0");
    expect(railViewportBlock).toContain("scroll-snap-type: x proximity");
    expect(globalCss).toContain(
      ".category-strip,\n  .series-grid {\n    grid-auto-flow: column;",
    );
    expect(globalCss).toContain("overflow: visible;");
    expect(siteHeaderBlock).toContain("z-index: 40");
    expect(cssBlock(".skip-link")).toContain("z-index: 45");
    expect(trustIconBlock).toContain("border-radius: 999px");
    expect(productCtaBlock).toContain("display: inline-flex");
    expect(categoryArrowBlock).toContain("width: 30px");
    expect(globalCss.replace(/\s+/g, "")).toContain(
      ".homepage>:not(.homepage-hero,.homepage-drop-board,.homepage-trust-strip,.homepage-paylater-promo)",
    );
  });

  it("keeps Homepage Reference Polish V4 typography lighter outside rare hero emphasis", () => {
    const heroTitleBlock = cssBlock(".homepage-hero__copy h1");
    const sectionHeadingBlock = cssBlock(
      ".section-heading h2,\n.homepage-promo h2",
    );
    const trustTitleBlock = cssBlock(".homepage-trust-card__title");
    const productTitleBlock = cssBlock(
      ".product-card__name,\n.series-card__title",
    );
    const productPriceBlock = cssBlock(".product-card__price");
    const productCtaBlock = cssBlock(".product-card__cta");
    const dateChipDayBlock = cssBlock(".release-calendar__date-chip span");
    const releaseListTitleBlock = cssBlock(
      ".release-calendar__compact-list span",
    );
    const calendarCaptionBlock = cssBlock(
      ".release-calendar .rdp-month_caption",
    );
    const promoTitleBlock = cssBlock(".homepage-promo__title h2");

    expect(heroTitleBlock).toContain("font-weight: 800");
    expect(heroTitleBlock).toContain("line-height: 1.08");
    expect(sectionHeadingBlock).toContain("font-weight: 760");
    expect(trustTitleBlock).toContain("font-weight: 750");
    expect(productTitleBlock).toContain("font-weight: 750");
    expect(productPriceBlock).toContain("font-weight: 760");
    expect(productCtaBlock).toContain("font-weight: 800");
    expect(dateChipDayBlock).toContain("font-weight: 750");
    expect(releaseListTitleBlock).toContain("font-weight: 750");
    expect(calendarCaptionBlock).toContain("font-weight: 760");
    expect(promoTitleBlock).toContain("font-weight: 760");
  });

  it("keeps the shadcn release calendar inside narrow mobile viewports", () => {
    const fullCalendarTriggerBlock = cssBlock(
      ".release-calendar__full-trigger",
    );

    expect(globalCss).toContain(".release-calendar__agenda");
    expect(globalCss).toContain(".release-calendar__date-rail");
    expect(globalCss).toContain(".release-calendar__date-chip:focus-visible");
    expect(globalCss).toContain(".release-calendar__compact-legend");
    expect(globalCss).toContain(".release-calendar__full-content");
    expect(globalCss).toContain(".homepage-release-shelf__context");
    expect(globalCss).toContain(
      "@media (max-width: 1180px) and (min-width: 1021px)",
    );
    expect(fullCalendarTriggerBlock).toContain("min-height: 44px");
    expect(globalCss).toContain(
      '.release-calendar__full-content[data-state="closed"],\n  .release-calendar__full-content[hidden]',
    );
    expect(globalCss).toContain(".release-calendar .rdp-month_grid tr");
    expect(globalCss).toContain(
      "grid-template-columns: repeat(7, minmax(0, 1fr));",
    );
    expect(globalCss).toContain(
      ".release-calendar .rdp-day {\n    min-width: 0;",
    );
    expect(globalCss).toContain(
      ".release-calendar__day {\n    min-height: 48px;",
    );
    expect(globalCss).toContain("border-spacing: 0;");
  });

  it("renders Pay Later messages directly without extra wrapper chrome", () => {
    const paylaterMessageBlock = cssBlock(".paylater-amount-message");
    const homePaylaterBlock = cssBlock(".homepage-paylater-promo");
    const catalogPaylaterBlock = cssBlock(".catalog-paylater");
    const cartPaylaterBlock = cssBlock(".cart-paylater,\n.minicart-paylater");

    expect(paylaterMessageBlock).toContain("background: transparent");
    expect(paylaterMessageBlock).toContain("border: 0");
    expect(paylaterMessageBlock).toContain("padding: 0");
    expect(homePaylaterBlock).toContain("background: transparent");
    expect(homePaylaterBlock).toContain("border: 0");
    expect(homePaylaterBlock).toContain("padding: 0");
    expect(catalogPaylaterBlock).not.toContain("background:");
    expect(catalogPaylaterBlock).not.toContain("border:");
    expect(catalogPaylaterBlock).not.toContain("padding:");
    expect(cartPaylaterBlock).not.toContain("background:");
    expect(cartPaylaterBlock).not.toContain("border:");
    expect(cartPaylaterBlock).not.toContain("padding:");
  });

  it("marks sale catalog cards with a compact top-right badge", () => {
    const saleBadgeBlock = cssBlock(".catalog-product-card__sale-badge");

    expect(saleBadgeBlock).toContain("position: absolute");
    expect(saleBadgeBlock).toContain("right: 12px");
    expect(saleBadgeBlock).toContain("top: 12px");
    expect(saleBadgeBlock).toContain("text-transform: uppercase");
  });

  it("keeps the PDP purchase panel reachable before long mobile content", () => {
    expect(globalCss).toContain(".product-purchase-panel");
    expect(globalCss).toContain(".product-purchase-panel .product-actions");
    expect(globalCss).toContain(".product-summary__intro {\n    font-size:");
    expect(globalCss).toContain(".product-gallery__main {\n    max-height:");
    expect(globalCss).toContain(".product-gallery__thumb {\n    min-height:");
  });

  it("styles the detailed PDP gallery rail and trust/detail sections", () => {
    const productDetailTabsBlock = cssBlock(".product-detail-tabs");
    const productTabsRootBlock = cssBlock(".product-detail-tabs__root");
    const productTabsNavShellBlock = cssBlock(
      ".product-detail-tabs__nav-shell",
    );
    const productTabsNavShellEdgeBlock = cssBlock(
      ".product-detail-tabs__nav-shell::before,\n.product-detail-tabs__nav-shell::after",
    );
    const productTabsNavBlock = cssBlock(".product-detail-tabs__nav");
    const productTabsTriggerBlock = cssBlock(
      ".product-detail-tabs__nav .product-detail-tabs__trigger",
    );
    const productDetailSupportBlock = cssBlock(".product-detail-support");
    const productDetailSupportItemBlock = cssBlock(
      ".product-detail-support__item",
    );
    const productRatingSummaryBlock = cssBlock(".product-rating-summary");
    const productRatingStarsBlock = cssBlock(".product-rating-stars");
    const productRatingStarFilledBlock = cssBlock(
      ".product-rating-star__shape--filled,\n.product-rating-star__shape--half",
    );
    const productRatingStarHalfBlock = cssBlock(
      ".product-rating-star__shape--half",
    );
    const productRatingStarEmptyBlock = cssBlock(
      ".product-rating-star__shape--empty",
    );
    const productReviewSummaryBlock = cssBlock(".product-review-summary-card");
    const productSocialProofListBlock = cssBlock(".product-social-proof-list");
    const productSocialProofCardBlock = cssBlock(".product-social-proof-card");
    const productStickyPurchaseBlock = cssBlock(".product-sticky-purchase");

    expect(globalCss).toContain(".product-breadcrumb");
    expect(globalCss).toContain(".product-gallery__stage");
    expect(globalCss).toContain(".product-gallery__viewer");
    expect(globalCss).toContain(".product-status-row");
    expect(globalCss).toContain(".product-rating-summary");
    expect(globalCss).toContain(".product-paypal-frame");
    expect(globalCss).toContain(".product-paypal-frame legend");
    expect(globalCss).toContain(".product-detail-support");
    expect(globalCss).not.toContain(".product-trust-grid");
    expect(globalCss).not.toContain(".product-trust-card");
    expect(globalCss).not.toContain(".product-support-band");
    expect(globalCss).toContain(".product-detail-tabs");
    expect(globalCss).toContain(".product-detail-tabs__nav-shell");
    expect(globalCss).toContain(".product-detail-tabs__nav");
    expect(globalCss).toContain(".product-detail-tabs__trigger");
    expect(globalCss).toContain(".product-review-summary-card");
    expect(globalCss).toContain(".product-social-proof-card");
    expect(globalCss).toContain(".product-sticky-purchase");
    expect(productRatingSummaryBlock).toContain("display: inline-flex");
    expect(productRatingStarsBlock).toContain("display: inline-flex");
    expect(productRatingStarFilledBlock).toContain("fill: #f6b529");
    expect(productRatingStarHalfBlock).toContain("fill: #f6b529");
    expect(globalCss).toContain(
      ".product-rating-star__shape--half {\n  clip-path: inset(0 50% 0 0);",
    );
    expect(productRatingStarEmptyBlock).toContain("fill: #171717");
    expect(productDetailSupportBlock).toContain("grid-template-columns");
    expect(productDetailSupportBlock).toContain("repeat(4, minmax(0, 1fr))");
    expect(productDetailSupportItemBlock).toContain("display: grid");
    expect(productReviewSummaryBlock).toContain("box-shadow: none");
    expect(productSocialProofListBlock).toContain("display: grid");
    expect(productSocialProofCardBlock).toContain("box-shadow");
    expect(productStickyPurchaseBlock).toContain("display: none");
    expect(productDetailTabsBlock).toContain("min-width: 0");
    expect(productTabsRootBlock).toContain("max-width: 100%");
    expect(productTabsRootBlock).toContain("min-width: 0");
    expect(productTabsRootBlock).toContain("width: 100%");
    expect(productTabsNavShellBlock).toContain("overflow: hidden");
    expect(productTabsNavShellBlock).toContain("position: relative");
    expect(productTabsNavShellEdgeBlock).toContain("pointer-events: none");
    expect(productTabsNavBlock).toContain("max-width: 100%");
    expect(productTabsNavBlock).toContain("display: flex !important");
    expect(productTabsNavBlock).toContain("inline-size: 100% !important");
    expect(productTabsNavBlock).toContain(
      "justify-content: flex-start !important",
    );
    expect(productTabsNavBlock).toContain("block-size: auto !important");
    expect(productTabsNavBlock).toContain("min-block-size: 55px");
    expect(productTabsNavBlock).toContain("width: 100% !important");
    expect(productTabsNavBlock).toContain("overflow-y: hidden");
    expect(productTabsNavBlock).toContain("scrollbar-width: none");
    expect(productTabsTriggerBlock).toContain("height: 44px !important");
    expect(productTabsTriggerBlock).toContain("flex: 0 0 auto");
    expect(globalCss).toContain(".product-detail-tabs__nav::-webkit-scrollbar");
    expect(globalCss).toContain(
      '.product-detail-tabs__nav .product-detail-tabs__trigger[aria-selected="true"]',
    );
    expect(globalCss).toContain(".product-detail-tabs__nav-shell::after");
    expect(globalCss).toContain(".product-detail-tabs__panel > h2::before");
    expect(globalCss).toContain(".product-gallery__thumbs {\n  order: -1;");
  });

  it("uses shadcn skeleton blocks for route loading states", () => {
    const routeSkeletonBlock = cssBlock(".route-stage__skeleton");
    const routeSkeletonSlotBlock = cssBlock(
      '.route-stage__skeleton [data-slot="skeleton"]',
    );

    expect(routeSkeletonBlock).toContain("display: grid");
    expect(routeSkeletonSlotBlock).toContain("background: linear-gradient");
    expect(globalCss).toContain(".route-stage__skeleton-line");
    expect(globalCss).toContain(".route-stage__skeleton-grid");
  });

  it("keeps PDP payment hierarchy conversion-first on mobile", () => {
    expect(globalCss).toContain(
      ".product-gallery__main {\n    max-height: min(68vw, 260px);",
    );
    expect(globalCss).toContain(
      ".product-gallery__thumb {\n    min-height: 52px;",
    );
    expect(globalCss).toContain(
      ".product-purchase-options > div {\n    grid-template-columns: repeat(2, minmax(0, 1fr));",
    );
    expect(globalCss).toContain(
      ".product-purchase-option span:first-of-type small {\n    display: none;",
    );
    expect(globalCss).toContain(".product-purchase-options {\n    order: 1;");
    expect(globalCss).toContain(".product-scarcity {\n    align-items: start;");
    expect(globalCss).toContain(
      ".product-purchase-panel .product-actions {\n    order: 3;",
    );
    expect(globalCss).toContain(".product-paypal-frame {\n    order: 4;");
    expect(globalCss).toContain(
      ".product-detail-support {\n    grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));",
    );
    expect(globalCss).toContain(
      '.product-page[data-sticky-purchase-visible="true"] {\n    padding-bottom: calc(112px + env(safe-area-inset-bottom));',
    );
    expect(globalCss).toContain(
      ".product-sticky-purchase {\n    background: rgba(255, 255, 255, 0.96);",
    );
    expect(globalCss).toContain(
      "bottom: calc(12px + env(safe-area-inset-bottom));",
    );
    expect(globalCss).toContain(
      ".product-sticky-purchase__content {\n    align-items: center;",
    );
    expect(globalCss).toContain(
      ".product-sticky-purchase__button {\n    min-height: 44px;",
    );
    expect(globalCss).toContain(
      ".product-sticky-purchase__content {\n    align-items: stretch;\n    grid-template-columns: 1fr;",
    );
    expect(globalCss).toContain(
      ".product-paylater {\n  background: transparent;",
    );
    expect(globalCss).toContain(".product-paylater {\n    order: 0;");
    expect(globalCss).toContain(
      "@container product-payment (max-width: 460px)",
    );
    expect(globalCss.replace(/\s+/g, "")).toContain(
      '.product-express-actions:not(:has(.delivery-express-action[data-delivery-express-method="paylater"] [data-paylater-button-eligibility="eligible"]))'.replace(
        /\s+/g,
        "",
      ),
    );
  });

  it("styles unreleased PDP preview cards without exposing payment surfaces", () => {
    const releasePreviewBlock = cssBlock(".product-release-preview");
    const releasePreviewFooterBlock = cssBlock(
      ".product-release-preview__footer",
    );

    expect(releasePreviewBlock).toContain("background: #fff8f3");
    expect(releasePreviewBlock).toContain("border: 1px solid #ffd4bf");
    expect(releasePreviewBlock).toContain("box-shadow: none");
    expect(globalCss).toContain(".product-release-preview__header");
    expect(globalCss).toContain(".product-release-preview__content");
    expect(globalCss).toContain(".product-release-preview__button");
    expect(releasePreviewFooterBlock).toContain("background: transparent");
    expect(releasePreviewFooterBlock).toContain("border-top: 0");
  });

  it("uses a shared PayPal frame and mobile-safe quantity targets in cart surfaces", () => {
    const cartFrameBlock = cssBlock(".cart-paypal-frame");
    const quantityBlock = cssBlock(".cart-quantity");
    const quantityControlBlock = cssBlock(
      ".cart-quantity button,\n.cart-quantity input",
    );
    const quantityInputBlock = cssBlockContaining(
      ".cart-quantity input",
      "appearance: textfield",
    );
    const minicartQuantityBlock = cssBlock(".minicart-item__quantity");
    const minicartQuantityControlBlock = cssBlock(
      ".minicart-item__quantity button,\n.minicart-item__quantity input",
    );
    const minicartShellBlock = cssBlockContaining(
      ".minicart-shell",
      "box-shadow",
    );
    const minicartRightSideBlock = cssBlock(
      '.minicart-shell[data-side="right"]',
    );
    const minicartAccentBlock = cssBlock(".minicart-shell::before");
    const minicartOverlayBlock = cssBlock(".minicart-shell__overlay");
    const minicartBodyBlock = cssBlock(".minicart-shell__body");
    const minicartItemsPanelBlock = cssBlock(".minicart-items-panel");
    const minicartItemBlock = cssBlock(".minicart-item");
    const minicartItemNameBlock = cssBlock(".minicart-item__name");
    const minicartItemMetaBlock = cssBlock(".minicart-item__meta");
    const minicartPanelBlock = cssBlock(".minicart-checkout-panel");
    const minicartActionLinkBlock = cssBlock(".minicart-actions__link");
    const minicartEmptyActionBlock = cssBlock(".minicart-empty-state .button");
    const minicartPaylaterBlock = cssBlockContaining(
      ".minicart-paylater",
      "border-top",
    );
    const minicartPaylaterCopyBlock = cssBlock(".minicart-paylater p");
    const deliveryExpressActionBlock = cssBlock(
      ".product-express-actions .delivery-express-action",
    );
    const deliveryExpressSdkButtonBlock = cssBlock(
      ".delivery-express-action paypal-button,\n.delivery-express-action paypal-pay-later-button",
    );
    const paypalStandaloneActionBlock = cssBlock(".paypal-standalone-action");
    const paylaterStandaloneActionBlock = cssBlock(
      ".paylater-standalone-action",
    );
    const walletCheckoutActionBlock = cssBlock(".wallet-checkout-action");
    const checkoutSdkButtonBlock = cssBlock(
      ".paypal-standalone-action paypal-button,\n.paylater-standalone-action paypal-pay-later-button,\n.wallet-checkout-action apple-pay-button,\n.wallet-checkout-action venmo-button",
    );
    const applePayButtonBlock = cssBlock(
      ".wallet-checkout-action apple-pay-button",
    );
    const googlePayContainerBlock = cssBlock(
      ".wallet-checkout-action__google-pay",
    );
    const paylaterAmountMessageBlock = cssBlockContaining(
      ".paylater-amount-message",
      "min-height",
    );
    const paylaterSdkMessageBlock = cssBlock(
      ".paylater-amount-message paypal-message",
    );
    const checkoutProgressBlock = cssBlock(".checkout-progress");
    const checkoutReadinessBlock = cssBlock(".checkout-payment-readiness");
    const checkoutTrustStripBlock = cssBlock(".checkout-trust-strip");
    const mobileCheckoutTrustStripBlock = cssBlockContaining(
      ".checkout-trust-strip",
      "flex-wrap: wrap",
    );
    const mobileCheckoutTrustItemBlock = cssBlockContaining(
      ".checkout-trust-strip__item",
      "background: transparent",
    );
    const mobileCheckoutTrustItemAccentBlock = cssBlockContaining(
      ".checkout-trust-strip__item::before",
      "display: none",
    );
    const mobileCheckoutTrustBadgeBlock = cssBlockContaining(
      '.checkout-trust-strip__item [data-slot="badge"]',
      "white-space: nowrap",
    );
    const mobileCheckoutTrustCopyBlock = cssBlockContaining(
      ".checkout-trust-strip__item p",
      "display: none",
    );
    const checkoutStickySummaryBlock = cssBlock(".checkout-sticky-summary");
    const checkoutStickyReviewBlock = cssBlock(
      ".checkout-sticky-summary__review",
    );
    const checkoutStickyGrabberBlock = cssBlock(
      ".checkout-sticky-summary__grabber",
    );
    const checkoutSelectedPaymentSlotBlock = cssBlock(
      ".checkout-summary__slot,\n.checkout-sticky-summary__action,\n.checkout-order-sheet__payment",
    );
    const checkoutSelectedPaymentProviderScopeBlock = cssBlock(
      ".checkout-summary__slot > .paypal-provider-scope,\n.checkout-sticky-summary__action > .paypal-provider-scope,\n.checkout-order-sheet__payment > .paypal-provider-scope",
    );
    const checkoutSelectedPaymentRuntimeBlock = cssBlock(
      ".paypal-provider-runtime",
    );
    const checkoutSelectedPaymentProviderActionBlock = cssBlock(
      ".checkout-summary__slot .paypal-standalone-action,\n.checkout-summary__slot .paylater-standalone-action,\n.checkout-summary__slot .wallet-checkout-action,\n.checkout-sticky-summary__action .paypal-standalone-action,\n.checkout-sticky-summary__action .paylater-standalone-action,\n.checkout-sticky-summary__action .wallet-checkout-action,\n.checkout-order-sheet__payment .paypal-standalone-action,\n.checkout-order-sheet__payment .paylater-standalone-action,\n.checkout-order-sheet__payment .wallet-checkout-action",
    );
    const compactSelectedPaymentActionBlock = cssBlock(
      ".checkout-sticky-summary .paypal-standalone-action,\n.checkout-sticky-summary .paylater-standalone-action,\n.checkout-sticky-summary .wallet-checkout-action,\n.checkout-order-sheet__payment .paypal-standalone-action,\n.checkout-order-sheet__payment .paylater-standalone-action,\n.checkout-order-sheet__payment .wallet-checkout-action",
    );
    const compactPaylaterMessageBlock = cssBlock(
      ".checkout-sticky-summary .paylater-amount-message,\n.checkout-order-sheet__payment .paylater-amount-message",
    );
    const checkoutModalBlock = cssBlock(".checkout-modal");
    const siteHeaderBlock = cssBlock(".site-header");
    const checkoutStickyViewportClearanceBlock = cssBlock(
      "html:has(.checkout-sticky-summary)",
    );
    const checkoutStickyFooterClearanceBlock = cssBlock(
      "body:has(.checkout-sticky-summary) .site-footer",
    );
    const checkoutStickyFieldClearanceBlock = cssBlock(
      ".checkout-field input:focus,\n  .checkout-field__select:focus,\n  .checkout-choice__card-box,\n  .checkout-choice__message,\n  .card-fields-checkout-action",
    );
    const cardHostedFieldBlock = cssBlock(
      ".card-fields-checkout-action__hosted-field",
    );
    const checkoutOrderSheetBlock = cssBlock(
      '.checkout-order-sheet[data-side="bottom"]',
    );
    const checkoutOrderSheetHandleBlock = cssBlock(
      ".checkout-order-sheet__handle",
    );
    const checkoutOrderSheetHandleVisualBlock = cssBlock(
      ".checkout-order-sheet__handle span",
    );
    const checkoutOrderSheetHeaderBlock = cssBlock(
      ".checkout-order-sheet__header",
    );
    const checkoutOrderSheetContentBlock = cssBlock(
      ".checkout-order-sheet__content",
    );
    const checkoutOrderSheetPaymentBlock = cssBlockContaining(
      ".checkout-order-sheet__payment",
      "border-top",
    );
    const checkoutOrderSheetRowsBlock = cssBlock(
      ".checkout-order-sheet dl div",
    );
    const mobileCheckoutPageBlock = cssBlockContaining(
      ".checkout-page",
      "padding-bottom: calc(\n      var(--checkout-mobile-sticky-clearance) + env(safe-area-inset-bottom)\n    )",
    );
    const mobileCheckoutStickySummaryBlock = cssBlockContaining(
      ".checkout-sticky-summary",
      "env(safe-area-inset-bottom)",
    );

    expect(globalCss).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(420px, 0.38fr);",
    );
    expect(globalCss).toContain(
      ".product-express-actions {\n    grid-template-columns: 1fr;",
    );
    expect(globalCss).toContain(
      ".cart-page {\n    grid-template-columns: 1fr;",
    );
    expect(cartFrameBlock).toContain("container-name: cart-payment");
    expect(cartFrameBlock).toContain("border: 1.5px solid #cbdff7");
    expect(cartFrameBlock).toContain("min-inline-size: 0");
    expect(globalCss).toContain(".cart-paypal-frame legend");
    expect(globalCss).toContain(".cart-paypal-frame--mini");
    expect(quantityBlock).toContain("grid-template-columns: 44px");
    expect(quantityControlBlock).toContain("min-height: 44px");
    expect(quantityControlBlock).toContain("min-width: 44px");
    expect(quantityInputBlock).toContain("appearance: textfield");
    expect(quantityInputBlock).toContain("-moz-appearance: textfield");
    expect(globalCss).toContain(
      ".cart-quantity input::-webkit-outer-spin-button",
    );
    expect(globalCss).toContain(
      ".cart-quantity input::-webkit-inner-spin-button",
    );
    expect(globalCss).toContain("-webkit-appearance: none");
    expect(minicartQuantityBlock).toContain("grid-template-columns: 44px");
    expect(minicartQuantityControlBlock).toContain("min-height: 44px");
    expect(minicartQuantityControlBlock).toContain("min-width: 44px");
    expect(minicartShellBlock).toContain("max-height: 100dvh");
    expect(minicartShellBlock).toContain("overflow: hidden");
    expect(minicartShellBlock).toContain("-20px 0 54px");
    expect(minicartShellBlock).not.toContain("position: relative");
    expect(minicartRightSideBlock).toContain("left: auto");
    expect(minicartRightSideBlock).toContain("right: 0");
    expect(minicartAccentBlock).toContain("linear-gradient");
    expect(minicartAccentBlock).toContain("var(--brand-red)");
    expect(minicartAccentBlock).toContain("width: 4px");
    expect(minicartOverlayBlock).toContain("background: rgb(5 13 26 / 0.44)");
    expect(minicartOverlayBlock).toContain("backdrop-filter: blur(2px)");
    expect(minicartBodyBlock).toContain(
      "grid-template-rows: minmax(0, 1fr) auto",
    );
    expect(minicartBodyBlock).toContain("overflow: hidden");
    expect(minicartItemsPanelBlock).toContain("height: 100%");
    expect(minicartItemBlock).toContain("align-items: start");
    expect(minicartItemBlock).toContain("grid-template-columns: 64px");
    expect(minicartItemBlock).toContain("min-width: 0");
    expect(minicartItemNameBlock).toContain("display: -webkit-box");
    expect(minicartItemNameBlock).toContain("-webkit-line-clamp: 2");
    expect(minicartItemNameBlock).toContain("overflow: hidden");
    expect(minicartItemMetaBlock).toContain("flex-wrap: wrap");
    expect(minicartActionLinkBlock).toContain("min-height: 44px");
    expect(minicartEmptyActionBlock).toContain("min-height: 44px");
    expect(minicartEmptyActionBlock).toContain("width: 100%");
    expect(minicartPaylaterBlock).toContain("border-top: 1px solid");
    expect(minicartPaylaterBlock).toContain("padding-top: 10px");
    expect(minicartPaylaterCopyBlock).toContain("font-size: 0.82rem");
    expect(globalCss).toContain(".minicart-checkout-panel");
    expect(minicartPanelBlock).toContain("border-top: 1px solid");
    expect(minicartPanelBlock).toContain("box-shadow: 0 -14px");
    expect(globalCss).toContain(".minicart-checkout-panel {\n    max-height:");
    expect(globalCss).toContain("overscroll-behavior: contain");
    expect(deliveryExpressActionBlock).toContain("display: block");
    expect(deliveryExpressActionBlock).toContain("min-height: 44px");
    expect(deliveryExpressActionBlock).toContain("min-width: 0");
    expect(deliveryExpressActionBlock).toContain("width: 100%");
    expect(deliveryExpressSdkButtonBlock).toContain("display: block");
    expect(deliveryExpressSdkButtonBlock).toContain("min-height: 44px");
    expect(deliveryExpressSdkButtonBlock).toContain("width: 100%");
    expect(paypalStandaloneActionBlock).toContain("display: grid");
    expect(paypalStandaloneActionBlock).toContain("min-height: 52px");
    expect(paypalStandaloneActionBlock).toContain("width: 100%");
    expect(paylaterStandaloneActionBlock).toContain("display: grid");
    expect(paylaterStandaloneActionBlock).toContain("min-height: 80px");
    expect(paylaterStandaloneActionBlock).toContain("width: 100%");
    expect(walletCheckoutActionBlock).toContain("display: grid");
    expect(walletCheckoutActionBlock).toContain("min-height: 52px");
    expect(walletCheckoutActionBlock).toContain("width: 100%");
    expect(checkoutSdkButtonBlock).toContain("display: block");
    expect(checkoutSdkButtonBlock).toContain("min-height: 52px");
    expect(checkoutSdkButtonBlock).toContain("width: 100%");
    expect(applePayButtonBlock).toContain("--apple-pay-button-width: 100%");
    expect(applePayButtonBlock).toContain("--apple-pay-button-height: 52px");
    expect(applePayButtonBlock).toContain(
      "--apple-pay-button-border-radius: var(--shell-compact-radius)",
    );
    expect(googlePayContainerBlock).toContain("display: grid");
    expect(googlePayContainerBlock).toContain("height: 52px");
    expect(googlePayContainerBlock).toContain("width: 100%");
    expect(globalCss).not.toContain(
      ".wallet-checkout-action__google-pay > div",
    );
    expect(globalCss).not.toContain(
      ".wallet-checkout-action__google-pay-button",
    );
    expect(paylaterAmountMessageBlock).toContain("min-height: 28px");
    expect(paylaterSdkMessageBlock).toContain("display: block");
    expect(paylaterSdkMessageBlock).toContain("min-height: 28px");
    expect(checkoutProgressBlock).toContain("min-height: 40px");
    expect(checkoutProgressBlock).toContain("font-size: 0.84rem");
    expect(checkoutReadinessBlock).toContain("background: #fff8f3");
    expect(checkoutReadinessBlock).toContain("border: 1px solid");
    expect(checkoutTrustStripBlock).toContain(
      "grid-template-columns: repeat(4, minmax(0, 1fr))",
    );
    expect(mobileCheckoutTrustStripBlock).toContain("display: flex");
    expect(mobileCheckoutTrustStripBlock).toContain("flex-wrap: wrap");
    expect(mobileCheckoutTrustStripBlock).toContain("padding: 10px 12px");
    expect(mobileCheckoutTrustItemBlock).toContain("display: inline-flex");
    expect(mobileCheckoutTrustItemBlock).toContain("padding: 0");
    expect(mobileCheckoutTrustItemAccentBlock).toContain("display: none");
    expect(mobileCheckoutTrustBadgeBlock).toContain("min-height: 28px");
    expect(mobileCheckoutTrustBadgeBlock).toContain("white-space: nowrap");
    expect(mobileCheckoutTrustCopyBlock).toContain("display: none");
    expect(checkoutStickySummaryBlock).toContain("bottom: 0");
    expect(checkoutStickySummaryBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(156px, min(46vw, 220px))",
    );
    expect(checkoutStickyReviewBlock).toContain("cursor: pointer");
    expect(checkoutStickyReviewBlock).toContain("display: grid");
    expect(checkoutStickyReviewBlock).toContain("min-height: 54px");
    expect(checkoutStickyReviewBlock).toContain("text-align: left");
    expect(checkoutStickyGrabberBlock).toContain("background: transparent");
    expect(checkoutStickyGrabberBlock).toContain("border: 0");
    expect(checkoutStickyGrabberBlock).toContain("box-shadow: none");
    expect(checkoutStickyGrabberBlock).toContain("position: absolute");
    expect(checkoutStickyGrabberBlock).toContain("transform: translateX(-50%)");
    expect(checkoutStickyGrabberBlock).toContain("height: 18px");
    expect(checkoutStickyGrabberBlock).toContain("min-width: 88px");
    expect(checkoutStickyGrabberBlock).toContain("pointer-events: none");
    expect(checkoutSelectedPaymentSlotBlock).toContain("justify-self: stretch");
    expect(checkoutSelectedPaymentSlotBlock).toContain("min-inline-size: 0");
    expect(checkoutSelectedPaymentSlotBlock).toContain("width: 100%");
    expect(checkoutSelectedPaymentProviderScopeBlock).toContain(
      "display: grid",
    );
    expect(checkoutSelectedPaymentProviderScopeBlock).toContain(
      "justify-self: stretch",
    );
    expect(checkoutSelectedPaymentProviderScopeBlock).toContain(
      "min-inline-size: 0",
    );
    expect(checkoutSelectedPaymentProviderScopeBlock).toContain("width: 100%");
    expect(checkoutSelectedPaymentRuntimeBlock).toContain("display: grid");
    expect(checkoutSelectedPaymentRuntimeBlock).toContain("min-inline-size: 0");
    expect(checkoutSelectedPaymentRuntimeBlock).toContain("width: 100%");
    expect(checkoutSelectedPaymentProviderActionBlock).toContain(
      "justify-self: stretch",
    );
    expect(checkoutSelectedPaymentProviderActionBlock).toContain(
      "max-inline-size: 100%",
    );
    expect(checkoutSelectedPaymentProviderActionBlock).toContain(
      "min-inline-size: 0",
    );
    expect(checkoutSelectedPaymentProviderActionBlock).toContain("width: 100%");
    expect(compactSelectedPaymentActionBlock).toContain("min-height: 52px");
    expect(compactSelectedPaymentActionBlock).toContain("padding: 0");
    expect(compactPaylaterMessageBlock).toContain("display: none");
    expect(siteHeaderBlock).toContain("z-index: 40");
    expect(checkoutModalBlock).toContain("z-index: 50");
    expect(checkoutStickyViewportClearanceBlock).toContain(
      "scroll-padding-bottom: calc(\n      var(--checkout-mobile-sticky-clearance) + env(safe-area-inset-bottom)\n    )",
    );
    expect(checkoutStickyFooterClearanceBlock).toContain(
      "padding-bottom: calc(\n      var(--checkout-mobile-sticky-clearance) + env(safe-area-inset-bottom)\n    )",
    );
    expect(checkoutStickyFieldClearanceBlock).toContain(
      "scroll-margin-bottom: calc(\n      var(--checkout-mobile-sticky-clearance) + env(safe-area-inset-bottom)\n    )",
    );
    expect(cardHostedFieldBlock).toContain("height: 50px");
    expect(cardHostedFieldBlock).toContain("overflow: hidden");
    expect(globalCss).not.toContain(
      ".card-fields-checkout-action__hosted-field iframe",
    );
    expect(checkoutOrderSheetBlock).toContain("border-radius: 20px 20px 0 0");
    expect(checkoutOrderSheetBlock).toContain("gap: 0");
    expect(checkoutOrderSheetBlock).toContain("max-height: min(78dvh, 640px)");
    expect(checkoutOrderSheetBlock).toContain("overflow-y: auto");
    expect(checkoutOrderSheetBlock).toContain("overscroll-behavior: contain");
    expect(checkoutOrderSheetBlock).toContain("padding-top: 0");
    expect(checkoutOrderSheetHandleBlock).toContain("cursor: pointer");
    expect(checkoutOrderSheetHandleBlock).toContain("inset: 0 0 auto");
    expect(checkoutOrderSheetHandleBlock).toContain("min-height: 44px");
    expect(checkoutOrderSheetHandleBlock).toContain("min-width: 44px");
    expect(checkoutOrderSheetHandleBlock).toContain("padding: 8px 0 0");
    expect(checkoutOrderSheetHandleBlock).toContain("position: absolute");
    expect(checkoutOrderSheetHandleBlock).toContain("z-index: 2");
    expect(checkoutOrderSheetHandleVisualBlock).toContain("width: 44px");
    expect(checkoutOrderSheetHandleVisualBlock).toContain(
      "background: #b8aea8",
    );
    expect(checkoutOrderSheetHeaderBlock).toContain("padding: 22px 24px 10px");
    expect(checkoutOrderSheetContentBlock).toContain("padding: 12px 24px 14px");
    expect(checkoutOrderSheetPaymentBlock).toContain(
      "padding: 14px 24px calc(16px + env(safe-area-inset-bottom))",
    );
    expect(checkoutOrderSheetRowsBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(checkoutOrderSheetRowsBlock).toContain("align-items: center");
    expect(mobileCheckoutPageBlock).toContain(
      "padding-bottom: calc(\n      var(--checkout-mobile-sticky-clearance) + env(safe-area-inset-bottom)\n    )",
    );
    expect(mobileCheckoutStickySummaryBlock).toContain(
      "padding-bottom: calc(12px + env(safe-area-inset-bottom))",
    );
    expect(globalCss).toContain(
      "body:has(.site-header__mobile-menu:not([hidden])) .checkout-sticky-summary",
    );
    expect(
      cssBlock(
        "body:has(.site-header__mobile-menu:not([hidden])) .checkout-sticky-summary",
      ),
    ).toContain("display: none");
    expect(globalCss).toContain(
      'body:has([data-slot="dialog-content"]) .checkout-sticky-summary',
    );
    expect(
      cssBlock(
        'body:has([data-slot="dialog-content"]) .checkout-sticky-summary',
      ),
    ).toContain("display: none");
    expect(globalCss).toContain("@container cart-payment (max-width: 340px)");
    expect(globalCss).toContain(".cart-item {\n    align-items: start;");
    expect(globalCss).toContain(
      "grid-template-columns: repeat(3, minmax(44px, 1fr));",
    );
    expect(globalCss).toContain("@media (max-width: 520px)");
  });

  it("keeps minicart checkout actions visible when the sheet is portaled", () => {
    const minicartPrimaryActionBlock = cssBlock(
      ".minicart-actions .minicart-actions__link--primary",
    );
    const minicartSecondaryActionBlock = cssBlock(
      ".minicart-actions .minicart-actions__link--secondary",
    );

    expect(minicartPrimaryActionBlock).toContain(
      "background-color: var(--shell-accent, #f42434) !important",
    );
    expect(minicartPrimaryActionBlock).toContain(
      "border-color: var(--shell-accent, #f42434) !important",
    );
    expect(minicartPrimaryActionBlock).toContain("color: #ffffff");
    expect(minicartSecondaryActionBlock).toContain("var(--shell-bg, #fff8f3)");
    expect(minicartSecondaryActionBlock).toContain("var(--shell-ink, #191919)");
  });

  it("keeps cart and checkout visual accents on merchant-owned surfaces only", () => {
    const cartStatusBlock = cssBlock(".cart-status");
    const cartStatusHeadingBlock = cssBlock(".cart-status h1");
    const checkoutStatusBlock = cssBlock(".checkout-status");
    const checkoutStatusHeadingBlock = cssBlock(".checkout-status h1");
    const cartItemBlock = cssBlock(".cart-item");
    const cartItemAccentBlock = cssBlock(".cart-item::before");
    const cartSummaryBlock = cssBlock(".cart-summary");
    const cartSummaryAccentBlock = cssBlock(
      ".cart-summary::before,\n.checkout-summary::before",
    );
    const cartSummaryDescriptionBlock = cssBlock(
      '.cart-summary__header [data-slot="card-description"]',
    );
    const cartFrameBlock = cssBlock(".cart-paypal-frame");
    const checkoutStepBlock = cssBlock(".checkout-step");
    const checkoutStepAccentBlock = cssBlock(".checkout-step::before");
    const checkoutSummaryBlock = cssBlock(".checkout-summary");
    const checkoutTrustItemAccentBlock = cssBlock(
      ".checkout-trust-strip__item::before",
    );
    const checkoutSlotBlock = cssBlock(".checkout-summary__slot");

    expect(globalCss).not.toContain(".cart-hero");
    expect(globalCss).not.toContain(".checkout-hero");
    expect(globalCss).not.toContain(".checkout-summary {\n    order: -1;");
    expect(cartStatusBlock).toContain("display: flex");
    expect(cartStatusBlock).toContain("padding: 0");
    expect(cartStatusHeadingBlock).toContain(
      "font-size: clamp(1.25rem, 2vw, 1.55rem)",
    );
    expect(checkoutStatusBlock).toContain("display: flex");
    expect(checkoutStatusBlock).toContain("padding: 0");
    expect(checkoutStatusHeadingBlock).toContain(
      "font-size: clamp(1.25rem, 2vw, 1.6rem)",
    );
    expect(cartItemBlock).toContain("transition:");
    expect(cartItemAccentBlock).toContain("color-mix");
    expect(cartSummaryBlock).toContain("linear-gradient(180deg");
    expect(cartSummaryBlock).toContain("overflow: hidden");
    expect(cartSummaryAccentBlock).toContain("var(--pm-candy-pink)");
    expect(cartSummaryDescriptionBlock).toContain("var(--shell-accent)");
    expect(checkoutStepBlock).toContain("transition:");
    expect(checkoutStepAccentBlock).toContain("var(--shell-border)");
    expect(globalCss).toContain(
      '.checkout-step[data-step-state="editing"]::before',
    );
    expect(checkoutSummaryBlock).toContain("linear-gradient(180deg");
    expect(checkoutTrustItemAccentBlock).toContain("var(--pm-lemon)");
    expect(cartFrameBlock).not.toContain("linear-gradient(135deg");
    expect(cartFrameBlock).not.toContain("var(--pm-candy-pink)");
    expect(checkoutSlotBlock).not.toContain("var(--pm-candy-pink)");
  });

  it("keeps checkout tabs high contrast and mobile-safe", () => {
    const tabsBlock = cssBlock(".checkout-tabs");
    const triggerBlock = cssBlock(".checkout-tabs button");
    const selectedTriggerBlock = cssBlock(
      '.checkout-tabs button[aria-selected="true"],\n.checkout-tabs button[data-state="active"]',
    );
    const disabledTriggerBlock = cssBlock(
      '.checkout-tabs button[aria-disabled="true"],\n.checkout-tabs button:disabled',
    );
    const dataSlotTriggerBlock = cssBlock(
      '.checkout-tabs [data-slot="tabs-trigger"]',
    );
    const mobileTabsBlock = cssBlockContaining(
      ".checkout-tabs",
      "padding: 4px",
    );
    const mobileTriggerBlock = cssBlockContaining(
      ".checkout-tabs button",
      "padding: 0 12px",
    );

    expect(tabsBlock).toContain("background: #ffffff");
    expect(tabsBlock).toContain("border-radius: 999px");
    expect(tabsBlock).toContain("display: grid");
    expect(tabsBlock).toContain("overflow: hidden");
    expect(triggerBlock).toContain("color: #26425f");
    expect(triggerBlock).toContain("min-height: 40px");
    expect(triggerBlock).toContain("height: 40px");
    expect(triggerBlock).toContain("max-height: 40px");
    expect(triggerBlock).toContain("overflow: hidden");
    expect(selectedTriggerBlock).toContain("background: #ff2438");
    expect(selectedTriggerBlock).toContain("color: #ffffff");
    expect(disabledTriggerBlock).toContain("color: #8b817c");
    expect(dataSlotTriggerBlock).toContain("height: 40px");
    expect(dataSlotTriggerBlock).toContain("min-height: 40px");
    expect(dataSlotTriggerBlock).toContain("text-overflow: ellipsis");
    expect(dataSlotTriggerBlock).toContain("white-space: nowrap");
    expect(mobileTabsBlock).toContain("min-height: 52px");
    expect(mobileTriggerBlock).toContain("min-height: 44px");
  });

  it("keeps mobile responsive controls at touch-target size without touching PayPal surfaces", () => {
    const siteHeaderBlock = cssBlock(".site-header");
    const siteUtilityBlock = cssBlock(".site-utility");
    const siteBrandBlock = cssBlock(".site-header__brand");
    const headerInnerBlock = cssBlock(".site-header__inner");
    const discoveryBlock = cssBlock(".site-header__discovery");
    const buttonBlock = cssBlockContaining(".button", "min-height: 44px");
    const calendarNavBlock = cssBlock(
      ".release-calendar .rdp-button_previous,\n.release-calendar .rdp-button_next",
    );
    const productBreadcrumbBlock = cssBlock(".product-breadcrumb a");
    const checkoutBreadcrumbBlock = cssBlock(".checkout-breadcrumb a");
    const filterChipBlock = cssBlock(".catalog-filter-chip");
    const footerLinkBlock = cssBlock(".site-footer__links a");
    const footerNewsletterBlock = cssBlock(".site-footer__newsletter");
    const footerActionsBlock = cssBlock(".site-footer__newsletter-actions a");
    const footerPaymentMarksBlock = cssBlock(".site-footer__payment-marks");
    const footerPaymentMarkBlock = cssBlock(".site-footer__payment-mark");
    const footerPaymentMarkImageBlock = cssBlock(
      ".site-footer__payment-mark img",
    );
    const footerBaseBlock = cssBlockContaining(
      ".site-footer__base",
      "background: #082643",
    );
    const minicartCloseBlock = cssBlock(".minicart-shell__close");
    const headerCartBadgeBlock = cssBlock(".site-header__cart-count");
    const cartFrameBlock = cssBlock(".cart-paypal-frame");
    const checkoutSlotBlock = cssBlock(".checkout-summary__slot");

    expect(siteHeaderBlock).toContain(
      "background: color-mix(in srgb, var(--shell-bg), #ffffff 76%)",
    );
    expect(siteUtilityBlock).toContain("color: #243143");
    expect(siteBrandBlock).toContain("color: #082643");
    expect(headerInnerBlock).toContain(
      "grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 520px) minmax(\n      460px,",
    );
    expect(discoveryBlock).toContain("min-height: 44px");
    expect(discoveryBlock).toContain("border: 1px solid var(--shell-border)");
    expect(globalCss).toContain(
      "@media (max-width: 1280px) and (min-width: 901px)",
    );
    expect(globalCss).toContain(
      "grid-template-columns: minmax(190px, 0.62fr) minmax(300px, 1fr) auto;",
    );
    expect(buttonBlock).toContain("min-height: 44px");
    expect(calendarNavBlock).toContain("height: 44px");
    expect(calendarNavBlock).toContain("width: 44px");
    expect(productBreadcrumbBlock).toContain("min-height: 44px");
    expect(productBreadcrumbBlock).toContain("min-width: 44px");
    expect(checkoutBreadcrumbBlock).toContain("min-height: 44px");
    expect(checkoutBreadcrumbBlock).toContain("min-width: 44px");
    expect(filterChipBlock).toContain("min-height: 44px");
    expect(footerLinkBlock).toContain("min-height: 44px");
    expect(footerLinkBlock).toContain("min-width: 44px");
    expect(footerNewsletterBlock).toContain(
      "background: linear-gradient(135deg, #ffffff 0%, #fff8f3 64%, #fff0f4 100%)",
    );
    expect(footerNewsletterBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) auto",
    );
    expect(footerActionsBlock).toContain("min-height: 44px");
    expect(footerPaymentMarksBlock).toContain("display: flex");
    expect(footerPaymentMarksBlock).toContain("flex-wrap: wrap");
    expect(footerPaymentMarkBlock).toContain("height: 32px");
    expect(footerPaymentMarkBlock).toContain("border-radius: 6px");
    expect(footerPaymentMarkImageBlock).toContain("object-fit: contain");
    expect(footerBaseBlock).toContain("background: #082643");
    expect(footerBaseBlock).toContain(
      "grid-template-columns: minmax(0, 1fr) minmax(220px, 0.34fr)",
    );
    expect(minicartCloseBlock).toContain("min-height: 44px");
    expect(minicartCloseBlock).toContain("min-width: 44px");
    expect(headerCartBadgeBlock).toContain("right: 0");
    expect(globalCss).toContain('[data-slot="tabs-trigger"]');
    expect(globalCss).toContain('[data-slot="input"]');
    expect(cartFrameBlock).not.toContain("min-height: 44px");
    expect(checkoutSlotBlock).not.toContain("min-height: 44px");
  });

  it("keeps the Admin workbench compact, responsive, and free of page overflow", () => {
    const shellBlock = cssBlock(".admin-shell");
    const headerBlock = cssBlock(".admin-shell__header");
    const filterFieldsBlock = cssBlock(".admin-filters__fields");
    const workbenchBlock = cssBlock(".admin-workbench");
    const mobileFilterTriggerBlock = cssBlock(".admin-filters__mobile-trigger");

    expect(shellBlock).toContain("overflow-x: clip");
    expect(headerBlock).toContain("display: flex");
    expect(headerBlock).toContain("justify-content: space-between");
    expect(filterFieldsBlock).toContain(
      "grid-template-columns: repeat(auto-fit, minmax(176px, 1fr))",
    );
    expect(workbenchBlock).toContain("min-width: 0");
    expect(mobileFilterTriggerBlock).toContain("display: none");
    expect(globalCss).toContain(
      '.admin-workbench__inventory-content[data-inventory-dataset="stock"]',
    );
    expect(globalCss).toContain(
      '.admin-workbench__diagnostics-content[data-diagnostics-dataset="runtime"]',
    );
    expect(globalCss).toContain(
      ".admin-filters__form--desktop {\n    display: none;",
    );
    expect(globalCss).toContain(
      ".admin-filters__mobile-trigger {\n    display: inline-flex;",
    );
  });
});

function cssBlock(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = globalCss.match(new RegExp(`${escapedSelector} \\{[^}]*\\}`));
  if (!match) {
    throw new Error(`Missing CSS block: ${selector}`);
  }

  return match[0];
}

function cssBlockContaining(selector: string, text: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = Array.from(
    globalCss.matchAll(new RegExp(`${escapedSelector} \\{[^}]*\\}`, "g")),
  );
  const block = matches
    .map((match) => match[0])
    .find((css) => css.includes(text));

  if (!block) {
    throw new Error(`Missing CSS block: ${selector} containing ${text}`);
  }

  return block;
}

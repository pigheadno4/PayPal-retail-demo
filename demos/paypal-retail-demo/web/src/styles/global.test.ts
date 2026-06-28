import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const globalCss = readFileSync(
  new URL("./global.css", import.meta.url),
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
  });

  it("keeps the generic profile on its own palette instead of inheriting POP MART tokens", () => {
    const genericTheme = cssBlock(".theme-generic");

    expect(genericTheme).toContain("--shell-accent: #c5914e");
    expect(genericTheme).not.toContain("--pm-coral-red");
    expect(genericTheme).not.toContain('"Rubik"');
  });

  it("applies the POP MART heading font through shared heading selectors", () => {
    const headingBlock = cssBlock("h1,\nh2,\nh3");

    expect(headingBlock).toContain("font-family: var(--shell-heading-font)");
    expect(headingBlock).toContain("letter-spacing: 0");
  });

  it("compresses category filters on mobile before product cards", () => {
    expect(globalCss).toContain(".catalog-mobile-filter-rail");
    expect(globalCss).toContain(".catalog-mobile-filters");
    expect(globalCss).toContain(".catalog-mobile-filter-trigger");
    expect(globalCss).toContain("grid-column: 1 / -1;");
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

    expect(globalCss).toContain(".homepage-hero__visual-link");
    expect(globalCss).toContain(
      '.homepage[data-loading="true"] .homepage-hero__visual-link::after',
    );
    expect(heroBlock).toContain("min-height: clamp(400px, 38vw, 520px)");
    expect(heroOverlayBlock).toContain("position: absolute");
    expect(globalCss).toContain("min-height: clamp(320px, 86vw, 380px);");
    expect(globalCss).toContain(".homepage-hero::after");
    expect(globalCss).toContain(".homepage-drop-board {\n    order: 2;");
    expect(globalCss).toContain(".homepage-trust-strip {\n    order: 3;");
    expect(globalCss).toContain(".homepage-paylater-promo {\n    order: 3;");
    expect(globalCss).toContain("grid-auto-columns: minmax(214px, 74vw);");
    expect(globalCss).toContain("grid-auto-columns: minmax(270px, 88vw);");
    expect(globalCss).toContain("scroll-snap-type: x proximity;");
    expect(siteHeaderBlock).toContain("z-index: 40");
    expect(trustIconBlock).toContain("border-radius: 999px");
    expect(productCtaBlock).toContain("display: inline-flex");
    expect(categoryArrowBlock).toContain("width: 30px");
    expect(globalCss.replace(/\s+/g, "")).toContain(
      ".homepage>:not(.homepage-hero,.homepage-drop-board,.homepage-trust-strip,.homepage-paylater-promo)",
    );
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
    const productTabsNavBlock = cssBlock(".product-detail-tabs__nav");
    const productTabsTriggerBlock = cssBlock(
      ".product-detail-tabs__nav .product-detail-tabs__trigger",
    );

    expect(globalCss).toContain(".product-breadcrumb");
    expect(globalCss).toContain(".product-gallery__stage");
    expect(globalCss).toContain(".product-gallery__viewer");
    expect(globalCss).toContain(".product-status-row");
    expect(globalCss).toContain(".product-paypal-frame");
    expect(globalCss).toContain(".product-paypal-frame legend");
    expect(globalCss).toContain(".product-trust-grid");
    expect(globalCss).toContain(".product-detail-tabs");
    expect(globalCss).toContain(".product-detail-tabs__nav");
    expect(globalCss).toContain(".product-detail-tabs__trigger");
    expect(productDetailTabsBlock).toContain("min-width: 0");
    expect(productTabsRootBlock).toContain("max-width: 100%");
    expect(productTabsRootBlock).toContain("min-width: 0");
    expect(productTabsRootBlock).toContain("width: 100%");
    expect(productTabsNavBlock).toContain("max-width: 100%");
    expect(productTabsNavBlock).toContain("display: flex !important");
    expect(productTabsNavBlock).toContain("inline-size: 100% !important");
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

  it("uses a shared PayPal frame and mobile-safe quantity targets in cart surfaces", () => {
    const cartFrameBlock = cssBlock(".cart-paypal-frame");
    const quantityBlock = cssBlock(".cart-quantity");
    const quantityControlBlock = cssBlock(
      ".cart-quantity button,\n.cart-quantity input",
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
    const minicartPanelBlock = cssBlock(".minicart-checkout-panel");
    const deliveryExpressSdkButtonBlock = cssBlock(
      ".delivery-express-action paypal-button,\n.delivery-express-action paypal-pay-later-button",
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
    expect(globalCss).toContain(".minicart-checkout-panel");
    expect(minicartPanelBlock).toContain("border-top: 1px solid");
    expect(minicartPanelBlock).toContain("box-shadow: 0 -14px");
    expect(globalCss).toContain(".minicart-checkout-panel {\n    max-height:");
    expect(globalCss).toContain("overscroll-behavior: contain");
    expect(deliveryExpressSdkButtonBlock).toContain("min-height: 44px");
    expect(deliveryExpressSdkButtonBlock).toContain("width: 100%");
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
    const cartHeroBlock = cssBlock(".cart-hero");
    const cartHeroAccentBlock = cssBlock(".cart-hero::before");
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
    const checkoutHeroBlock = cssBlock(".checkout-hero");
    const checkoutHeroAccentBlock = cssBlock(".checkout-hero::before");
    const checkoutStepBlock = cssBlock(".checkout-step");
    const checkoutStepAccentBlock = cssBlock(".checkout-step::before");
    const checkoutSummaryBlock = cssBlock(".checkout-summary");
    const checkoutTrustItemAccentBlock = cssBlock(
      ".checkout-trust-strip__item::before",
    );
    const checkoutSlotBlock = cssBlock(".checkout-summary__slot");

    expect(cartHeroBlock).toContain("linear-gradient(135deg");
    expect(cartHeroBlock).toContain("overflow: hidden");
    expect(cartHeroAccentBlock).toContain("var(--shell-accent)");
    expect(cartItemBlock).toContain("transition:");
    expect(cartItemAccentBlock).toContain("color-mix");
    expect(cartSummaryBlock).toContain("linear-gradient(180deg");
    expect(cartSummaryBlock).toContain("overflow: hidden");
    expect(cartSummaryAccentBlock).toContain("var(--pm-candy-pink)");
    expect(cartSummaryDescriptionBlock).toContain("var(--shell-accent)");
    expect(checkoutHeroBlock).toContain("linear-gradient(135deg");
    expect(checkoutHeroAccentBlock).toContain("var(--pm-candy-pink)");
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
    const minicartCloseBlock = cssBlock(".minicart-shell__close");
    const headerCartBadgeBlock = cssBlock(".site-header__cart-count");
    const cartFrameBlock = cssBlock(".cart-paypal-frame");
    const checkoutSlotBlock = cssBlock(".checkout-summary__slot");

    expect(headerInnerBlock).toContain(
      "grid-template-columns: minmax(220px, 0.8fr) minmax(320px, 520px) minmax(\n      460px,",
    );
    expect(discoveryBlock).toContain("min-height: 44px");
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
    expect(minicartCloseBlock).toContain("min-height: 44px");
    expect(minicartCloseBlock).toContain("min-width: 44px");
    expect(headerCartBadgeBlock).toContain("right: 0");
    expect(globalCss).toContain('[data-slot="tabs-trigger"]');
    expect(globalCss).toContain('[data-slot="input"]');
    expect(cartFrameBlock).not.toContain("min-height: 44px");
    expect(checkoutSlotBlock).not.toContain("min-height: 44px");
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

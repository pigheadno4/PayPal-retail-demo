import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../", import.meta.url);

function readProjectFile(path: string): string {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

describe("evidence scripts", () => {
  it("registers the Round 4 auth minicart checkout evidence helper", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const helperPath = join(
      "tools",
      "round4-auth-minicart-checkout-evidence.playwright.js",
    );
    const helperSource = readProjectFile(helperPath);

    expect(packageJson.scripts).toMatchObject({
      "evidence:round4:auth-minicart-checkout": `playwright-cli --raw run-code --filename=${helperPath}`,
    });

    for (const rowId of [
      "auth-email-modal-320",
      "auth-password-modal-320",
      "auth-register-modal-320",
      "auth-email-modal-390",
      "auth-password-modal-390",
      "auth-register-modal-390",
      "auth-email-modal-1440",
      "auth-password-modal-1440",
      "auth-register-modal-1440",
      "minicart-open-320",
      "minicart-open-390",
      "minicart-open-1440",
      "checkout-payment-method-390",
      "checkout-payment-method-768",
      "checkout-selected-paypal-390",
      "checkout-selected-paypal-768",
      "checkout-selected-paypal-1440",
      "checkout-selected-paylater-390",
      "checkout-selected-card-390",
      "checkout-recalculating-readiness-390",
      "checkout-failed-readiness-390",
      "checkout-expanded-order-sheet-390",
      "checkout-expanded-order-sheet-320",
      "pickup-store-picker-inventory-320",
      "pickup-store-picker-inventory-390",
      "pickup-store-picker-inventory-1440",
      "pickup-preselected-inventory-320",
      "pickup-preselected-inventory-390",
      "pickup-preselected-inventory-1440",
      "checkout-safeguards-payment-ready-390",
      "desktop-auth-minicart-checkout-1440",
    ]) {
      expect(helperSource).toContain(rowId);
    }

    for (const requiredMetric of [
      "screenshotPath",
      "consoleIssues",
      "responseIssues",
      "faviconStatus",
      "horizontalOverflow",
      "focusedElement",
      "dialogState",
      "sheetState",
      "handleBackground",
      "stickyOverlapCount",
      "providerCounts",
      "officialProviderNodes",
      "contrastSamples",
      "minimumContrastRatio",
      "inputButtonWidthDelta",
      "passwordToggle",
      "passwordAutocomplete",
      "productNameRenderedLines",
      "pickupInventoryRows",
      "pickupHeadingOverflows",
      "pickerHeaderOverlap",
      "screenshotPixelMetrics",
      "nearBlackPixelRatio",
      "mockupComparison",
    ]) {
      expect(helperSource).toContain(requiredMetric);
    }

    expect(helperSource).toContain("full");
    expect(helperSource).toContain("partial");
    expect(helperSource).toContain("sold-out");
    expect(helperSource).not.toMatch(/[?&]qa=/);
    expect(helperSource).not.toContain("new URL(");
    expect(helperSource).toContain('getByLabel("Password", { exact: true })');
    expect(helperSource).toContain('locator(".minicart-shell")');
    expect(helperSource).toContain(".minicart-item__quantity button");
    expect(helperSource).toContain("quantityControls.length === 0");
    expect(helperSource).toContain("sample.scope === expected.contrastScope");
    expect(helperSource).toContain("measureScreenshotPixels");
    expect(helperSource).toContain("screenshotPixelMetrics.suspicious");
    expect(helperSource).toContain('type: "jpeg"');
    expect(helperSource).toContain("quality: 95");
    expect(helperSource).toContain("hasProductSpecificName");
    expect(helperSource).toContain("data:image/jpeg;base64");
    expect(helperSource).toContain("providerCounts.minicart");
    expect(helperSource).toContain("officialProviderNodes.byPlacement");
    expect(helperSource).toContain("pickupStateScreenshots");
    expect(helperSource).toContain("const stickyOverlapCount = pickerPanel");
    expect(helperSource).toContain(
      "initialFocusedElement?.id?.startsWith(expected.initialFocusIdPrefix)",
    );
    expect(helperSource).toContain(
      "[data-payment-action-placement][data-payment-method='${method}'] ${officialSelector}",
    );
    expect(helperSource).toContain('pickupInventoryStates.includes("empty")');
    expect(helperSource).toContain("await resetEvidenceRoutes()");
    expect(helperSource).toContain("postCloseFocusedElement?.ariaLabel");
    expect(helperSource).toContain(
      'document.querySelector("[data-payment-method-row]")',
    );
    expect(helperSource).toContain(
      '"[data-payment-action-placement][data-payment-method]"',
    );
    expect(helperSource).toContain('includes("/pickup-store")');
    expect(helperSource).toContain('getByText("Enter your password.", {');
    expect(helperSource).toContain(
      '"Accept the terms before creating an account."',
    );
    expect(helperSource).toContain(
      'target.closest(".checkout-sticky-summary, .checkout-order-sheet")',
    );
    expect(helperSource).toContain('passwordAutocomplete: "current-password"');
    expect(helperSource).toContain('passwordAutocomplete: "new-password"');
    expect(helperSource).toContain('[data-slot="sheet-overlay"]');
    expect(helperSource).toContain(
      'const closeMethods = ["escape", "handle", "scrim"]',
    );
    expect(helperSource).toContain("row.viewport.width <= 760");
    expect(helperSource).toContain("widthCoverage");
    expect(helperSource).toContain("320px and 390px exercise the same mobile");
    expect(helperSource).toContain(
      "390px is the designated 390/414 representative",
    );
    expect(helperSource).toContain(
      "1440px exercises the same desktop provider branch",
    );
    expect(helperSource).toContain('["paypal-button", "paypalButton"]');
    expect(helperSource).toContain(
      '["paypal-pay-later-button", "payLaterButton"]',
    );
    expect(helperSource).toContain(
      '["paypal-hosted-card-field", "cardHostedFields"]',
    );
    expect(helperSource).toContain("minimumContrastRatio < 4.5");
    expect(helperSource).toContain("color\\(srgb");
    expect(helperSource).not.toContain(": 21,");
  });

  it("registers the Round 3 checkout pickup drawer evidence helper", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const helperPath = join(
      "tools",
      "round3-checkout-pickup-drawer-evidence.playwright.js",
    );
    const helperSource = readProjectFile(helperPath);

    expect(packageJson.scripts).toMatchObject({
      "evidence:round3:checkout-pickup-drawer": `playwright-cli --raw run-code --filename=${helperPath}`,
    });

    for (const rowId of [
      "pickup-picker-open-390",
      "pickup-picker-cancel-390",
      "pickup-picker-confirm-390",
      "preselected-pickup-store-summary-390",
      "delivery-billing-latency-390",
      "delivery-billing-failure-390",
      "checkout-selected-paypal-390",
      "checkout-selected-paylater-390",
      "checkout-selected-apple-pay-390",
      "checkout-selected-google-pay-390",
      "checkout-selected-venmo-390",
      "checkout-selected-card-390",
      "checkout-expanded-order-details-390",
    ]) {
      expect(helperSource).toContain(rowId);
    }

    for (const requiredMetric of [
      "selectedProviderRects",
      "pickerHeaderOverlap",
      "storeSummaryHasContinue",
      "drawerTrigger",
      "billingTransitionMs",
      "createOrderRequests",
      "providerCounts",
    ]) {
      expect(helperSource).toContain(requiredMetric);
    }

    expect(helperSource).not.toContain(
      'document.body.innerText.includes("Molly Blind Boxes 2")',
    );
    expect(helperSource).toContain("isCheckoutEvidenceReady");
    expect(helperSource).toContain("commitPickupStoreSelection");
  });
});

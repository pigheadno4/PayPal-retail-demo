import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../", import.meta.url);

function readProjectFile(path: string): string {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

describe("evidence scripts", () => {
  it("registers the API-backed post-purchase operations evidence helper", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const helperPath = join(
      "tools",
      "post-purchase-operations-evidence.playwright.js",
    );
    const helperSource = readProjectFile(helperPath);
    const runnerPath = join(
      "tools",
      "run-post-purchase-operations-evidence.mjs",
    );
    const runnerSource = readProjectFile(runnerPath);

    expect(packageJson.scripts).toMatchObject({
      "evidence:post-purchase-operations": `node ${runnerPath}`,
    });
    expect(runnerSource).toContain("process.env.ADMIN_PASSCODE");
    expect(runnerSource).toContain(helperPath);
    expect(runnerSource).toContain('spawnSync("playwright-cli"');
    expect(runnerSource).toContain("report.summary.failedRows.length > 0");
    expect(runnerSource).not.toContain("adminPasscode,");
    expect(runnerSource).toContain("randomUUID");
    expect(runnerSource).toContain("mkdtempSync");
    expect(runnerSource).toContain("writeFileSync(authHelperPath");
    expect(runnerSource).toContain("0o600");
    expect(runnerSource).toContain("finally");
    expect(runnerSource).not.toContain(
      '[sessionOption, "fill", "#admin-passcode", passcode]',
    );

    for (const rowId of [
      "admin-orders-route-375",
      "admin-orders-route-768",
      "admin-orders-route-1024",
      "admin-orders-route-1440",
      "admin-lifecycle-route-1024",
      "admin-inventory-route-1024",
      "admin-webhooks-route-1024",
      "admin-filter-persistence-1440",
      "admin-order-drill-down-1440",
      "admin-lifecycle-account-refresh-1440",
      "admin-lifecycle-zero-webhook-growth-1440",
      "admin-diagnostics-payment-tab-1024",
      "admin-diagnostics-runtime-tab-1024",
      "admin-keyboard-navigation-375",
      "admin-loading-state-768",
      "admin-filtered-empty-state-1024",
      "admin-error-state-1440",
    ]) {
      expect(helperSource).toContain(rowId);
    }

    for (const requiredMetric of [
      "screenshotPath",
      "consoleIssues",
      "responseIssues",
      "horizontalOverflow",
      "minimumInteractiveTarget",
      "stickyFixedOcclusionCount",
      "filterPersistence",
      "drillDown",
      "lifecycleAccountRefresh",
      "webhookCountBefore",
      "webhookCountAfter",
      "diagnosticsDataset",
      "diagnosticsSanitization",
      "keyboardOperation",
      "pageState",
    ]) {
      expect(helperSource).toContain(requiredMetric);
    }

    expect(helperSource).toContain("PAYPAL_RETAIL_EVIDENCE_BASE_URL");
    expect(helperSource).toContain("process.env.ADMIN_PASSCODE");
    expect(helperSource).toContain("page.screenshot");
    expect(helperSource).toContain("failedRows");
    expect(helperSource).toContain("failedRows.length > 0");
    expect(helperSource).toContain("webhookCountAfter !== webhookCountBefore");
    expect(helperSource).toContain('["error", "warning"]');
    expect(helperSource).toContain(
      "entry.text === knownGooglePayManifestIssue",
    );
    expect(helperSource).toContain(
      "entry.text === knownGooglePayManifestWarning",
    );
    expect(helperSource).toContain(
      "entry.text === knownGooglePayManifestUnavailableIssue",
    );
    expect(helperSource).toMatch(
      /const merchantNoteVisible = await currentStage\s+\.getByText\(\s*"Evidence: merchant lifecycle update is visible in Account\."/,
    );
    expect(helperSource).toContain("Number.isSafeInteger(totalCount)");
    expect(helperSource).toContain("expectedAccountStatus");
    expect(helperSource).toContain("accountStatusMatchesExpected");
    expect(helperSource).toContain(
      'const evidenceLifecycleOrderNumber = "DO-20260714-900001"',
    );
    expect(helperSource).toContain(
      "candidate.order_number === evidenceLifecycleOrderNumber",
    );
    expect(helperSource).toContain('actionableOrder.status === "paid"');
    expect(helperSource).toMatch(
      /getByRole\("button", \{\s*name: "Mark Processing",\s*exact: true,?\s*\}\)/,
    );
    expect(helperSource).toContain('expectedAccountStatus === "processing"');
    expect(helperSource).toContain("method: response.request().method()");
    expect(helperSource).toContain("nonReadRequests");
    expect(helperSource).toContain('["GET", "HEAD"].includes(entry.method)');
    expect(helperSource).toContain("representativeScrollPositions");
    expect(helperSource).toContain("occlusionSamplePoints");
    expect(helperSource).not.toContain('paymentDataset ?? "payment"');
    expect(helperSource).not.toContain('runtimeDataset ?? "runtime"');
    expect(helperSource).not.toContain("failedRows: []");
    expect(helperSource).not.toContain("page.context().route");
  });

  it("synchronizes hosted lifecycle refresh and loading evidence with committed UI state", () => {
    const helperSource = readProjectFile(
      join("tools", "post-purchase-operations-evidence.playwright.js"),
    );
    const accountCommitHelper = helperSource.slice(
      helperSource.indexOf("async function waitForExpectedAccountRefresh"),
      helperSource.indexOf("async function observeRealOrdersLoadingState"),
    );
    const loadingStateHelper = helperSource.slice(
      helperSource.indexOf("async function observeRealOrdersLoadingState"),
      helperSource.indexOf("async function activeAdminSection"),
    );

    expect(helperSource).toContain(
      "async function waitForExpectedAccountRefresh",
    );
    expect(helperSource).toContain("await waitForExpectedAccountRefresh(");
    expect(accountCommitHelper).toMatch(
      /getByRole\("heading", \{\s*name: expectedOrderNumber,\s*exact: true/,
    );
    expect(accountCommitHelper).toContain(
      '.getByRole("region", {\n      name: "Current stage",',
    );
    expect(accountCommitHelper).toContain(
      '.locator(".account-page__timeline-step--current strong")',
    );
    expect(accountCommitHelper).toContain(
      ".getByText(merchantNote, { exact: true })",
    );
    expect(helperSource).toContain(
      "mutationResponseBody?.data?.order?.order_number === orderNumber",
    );
    expect(helperSource).toContain(
      "accountRefreshApiOrderNumber === orderNumber",
    );
    expect(helperSource).toContain("accountDetailOrderNumber === orderNumber");
    expect(helperSource).toContain(
      "async function observeRealOrdersLoadingState",
    );
    expect(helperSource).toContain(
      "const realOrdersResponse = await route.fetch();",
    );
    expect(helperSource).toContain(
      "await route.fulfill({ response: realOrdersResponse });",
    );
    expect(helperSource).toContain(
      "await targetPage.unroute(ordersRoutePattern, holdRealOrdersResponse);",
    );
    expect(helperSource).toContain(".waitForRequest(");
    expect(helperSource).toContain(".waitForResponse(");
    expect(helperSource).toContain("screenshotAlreadyCaptured");
    expect(helperSource).not.toContain("clearTimeout");
    expect(helperSource).not.toContain("setTimeout");
    expect(loadingStateHelper).toContain("realOrdersResponseStatus !== 200");
    expect(loadingStateHelper).toContain(
      "function isAdminOrdersListRequest(request)",
    );
    expect(loadingStateHelper).toContain(
      "/\\/api\\/admin\\/orders(?:\\?.*)?$/.test(request.url())",
    );
    expect(loadingStateHelper).not.toContain('.includes("/api/admin/orders")');
    expect(loadingStateHelper).toMatch(
      /finally\s*\{[\s\S]*releaseHeldOrdersResponse\(\);[\s\S]*await targetPage\.unroute\(ordersRoutePattern, holdRealOrdersResponse\);[\s\S]*\}/,
    );

    const responseHeldAt = helperSource.indexOf(
      "const realOrdersResponse = await route.fetch();",
    );
    const loadingWaitAt = helperSource.indexOf("await loadingState.waitFor({");
    const responseReleasedAt = helperSource.indexOf(
      "releaseHeldOrdersResponse();",
    );
    const loadingScreenshotAt = helperSource.indexOf(
      "const loadingScreenshotPath = `${outputPrefix}-admin-loading-state-768.png`;",
    );
    const realResponseFulfilledAt = helperSource.indexOf(
      "await route.fulfill({ response: realOrdersResponse });",
    );
    const routeHeldAwaitAt = helperSource.indexOf(
      "await realOrdersResponseHeld;",
    );
    const bypassCheckAt = helperSource.indexOf(
      "if (!ordersResponseIntercepted)",
    );

    expect(responseHeldAt).toBeGreaterThan(-1);
    expect(realResponseFulfilledAt).toBeGreaterThan(responseHeldAt);
    expect(routeHeldAwaitAt).toBeGreaterThan(-1);
    expect(bypassCheckAt).toBeGreaterThan(routeHeldAwaitAt);
    expect(loadingWaitAt).toBeGreaterThan(-1);
    expect(loadingScreenshotAt).toBeGreaterThan(loadingWaitAt);
    expect(responseReleasedAt).toBeGreaterThan(loadingWaitAt);
    expect(responseReleasedAt).toBeGreaterThan(loadingScreenshotAt);
    expect(helperSource).toMatch(
      /const realOrdersResponse = await route\.fetch\(\);[\s\S]*await heldOrdersResponseRelease;[\s\S]*await route\.fulfill\(\{ response: realOrdersResponse \}\);/,
    );
    expect(helperSource).not.toContain("page.context().route");
  });

  it("treats renamed Render services as hosted evidence targets", () => {
    for (const helperPath of [
      "tools/round2-hosted-checkout-smoke.playwright.js",
      "tools/round3-checkout-pickup-drawer-evidence.playwright.js",
      "tools/round4-auth-minicart-checkout-evidence.playwright.js",
    ]) {
      const helperSource = readProjectFile(helperPath);
      expect(helperSource).toContain("function isRenderHostedBaseUrl");
      expect(helperSource).toMatch(/\\\.onrender\\\.com/);
      expect(helperSource).not.toContain(
        'baseUrl === "https://retail-demo.onrender.com"',
      );
    }

    expect(
      readProjectFile("tools/round2-hosted-checkout-smoke.playwright.js"),
    ).toContain("https://paypal-retail-demo.onrender.com");
  });

  it("registers the Round 4 auth minicart checkout evidence helper", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };
    const helperPath = join(
      "tools",
      "round4-auth-minicart-checkout-evidence.playwright.js",
    );
    const helperSource = readProjectFile(helperPath);
    const runnerPath = join(
      "tools",
      "run-round4-auth-minicart-checkout-evidence.mjs",
    );
    const runnerSource = readProjectFile(runnerPath);

    expect(packageJson.scripts).toMatchObject({
      "evidence:round4:auth-minicart-checkout": `node ${runnerPath}`,
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
      "selectedPaymentAction",
      "touchTargets",
      "minimumMeasuredTouchTarget",
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
    expect(runnerSource).toContain("playwright-cli");
    expect(runnerSource).toContain('spawnSync("playwright-cli", ["list"]');
    expect(runnerSource).toContain("PAYPAL_RETAIL_EVIDENCE_BASE_URL");
    expect(runnerSource).toContain(
      'spawnSync("playwright-cli", ["goto", baseUrl]',
    );
    expect(runnerSource).toContain("async function waitForBrowserAppShell");
    expect(runnerSource).toContain("function isRenderHostedBaseUrl");
    expect(runnerSource).toMatch(/\\\.onrender\\\.com/);
    expect(runnerSource).toContain("async function assertHostedStaticAssets");
    expect(runnerSource).toContain(
      '"/assets/paypal-logos/applepay-default.svg"',
    );
    expect(runnerSource).toContain(
      '"/assets/popmart/products/blind-boxes-1-1.png"',
    );
    expect(runnerSource).toContain('method: "HEAD"');
    expect(runnerSource).toContain(
      "Boolean(document.querySelector('.app-shell'))",
    );
    expect(runnerSource).toContain("writeFileSync");
    expect(runnerSource).toContain("JSON.stringify(report, null, 2)");
    expect(runnerSource).toContain("process.stderr.write(stdout)");
    expect(runnerSource).toContain(
      'stdout.trimStart().startsWith("### Error")',
    );
    expect(runnerSource).toContain(
      "Playwright helper failed before producing an evidence report.",
    );
    expect(runnerSource).toContain("report.summary.failedRows.length > 0");
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
    expect(helperSource).toContain('data-paypal-sdk-status="ready"');
    expect(helperSource).toContain('data-paypal-sdk-runtime-status="resolved"');
    expect(helperSource).toContain("shadowRoot?.querySelector");
    expect(helperSource).toContain("selectedPaymentAction.visible");
    expect(helperSource).toContain("selectedPaymentAction.officialRect");
    expect(helperSource).toContain(
      'selectedPaymentAction.runtimeStatus !== "resolved"',
    );
    expect(helperSource).toContain('contrastScope: "checkout"');
    expect(helperSource).toContain(".checkout-payment-readiness p");
    expect(helperSource).toContain(".checkout-trust-strip__item p");
    expect(helperSource).toContain(".checkout-sticky-summary__total > span");
    expect(helperSource).toContain(".checkout-sticky-summary__total > em");
    expect(helperSource).toContain(".checkout-order-sheet dt");
    expect(helperSource).toContain(
      ".checkout-order-sheet .checkout-summary__item span",
    );
    expect(helperSource).toContain('[data-slot="dialog-close"]');
    expect(helperSource).toContain(".checkout-modal__actions button");
    expect(helperSource).toContain('"paypal-button"');
    expect(helperSource).toContain('"paypal-pay-later-button"');
    expect(helperSource).toContain('"paypal-hosted-card-field"');
    expect(helperSource).toContain("minimumMeasuredTouchTarget < 44");
    expect(helperSource).toContain('pickupInventoryStates.includes("empty")');
    expect(helperSource).toContain("await resetEvidenceRoutes()");
    expect(helperSource).toContain(
      'page.context().route("**/api/account/auth/lookup"',
    );
    expect(helperSource).toContain(
      'const navigationTimeout = outputScope === "hosted" ? 90000 : 30000',
    );
    expect(helperSource).toContain("function isRenderHostedBaseUrl");
    expect(helperSource).toMatch(/\\\.onrender\\\.com/);
    expect(helperSource).toContain(
      'const interactionTimeout = outputScope === "hosted" ? 60000 : 10000',
    );
    expect(helperSource).toContain(
      'const readinessTimeout = outputScope === "hosted" ? 60000 : 20000',
    );
    expect(helperSource).toContain(
      'const navigationWaitUntil =\n    outputScope === "hosted" ? "commit" : "domcontentloaded"',
    );
    expect(helperSource).toContain("async function waitForOptionalNetworkIdle");
    expect(helperSource).toContain('if (outputScope !== "local") return');
    expect(helperSource).toContain("async function waitForAppShell");
    expect(helperSource).toContain("await page.reload");
    expect(helperSource).toContain("async function gotoEvidenceRoute");
    expect(helperSource).toContain('message.includes("net::ERR_ABORTED")');
    expect(helperSource).toContain("await page.waitForTimeout(250)");
    expect(helperSource).toContain("async function waitForGuestCartBinding");
    expect(helperSource).toContain(
      'key.startsWith("paypal-retail-demo:cart-binding:")',
    );
    expect(helperSource).toContain("await waitForGuestCartBinding()");
    expect(helperSource).toContain(
      "async function waitForMinicartEvidenceReady",
    );
    expect(helperSource).toContain("await waitForMinicartEvidenceReady()");
    expect(helperSource).toContain("async function waitForVisibleImages");
    expect(helperSource).toContain("image.complete && image.naturalWidth > 0");
    expect(helperSource).toContain("await image.decode()");
    expect(helperSource).toContain("rect.bottom > 0");
    expect(helperSource).toContain("rect.top < window.innerHeight");
    expect(helperSource).toContain("await waitForVisibleImages()");
    expect(helperSource).toContain(
      "route.fetch({ timeout: navigationTimeout })",
    );
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

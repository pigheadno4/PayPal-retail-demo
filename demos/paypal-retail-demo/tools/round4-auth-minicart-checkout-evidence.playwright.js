/* eslint-disable @typescript-eslint/no-unused-vars */
/* global document, fetch, getComputedStyle, Image, process, requestAnimationFrame, window */
async function round4AuthMinicartCheckoutEvidence(page) {
  const envBaseUrl =
    typeof process !== "undefined"
      ? process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL
      : undefined;
  const currentUrl = page.url();
  const currentOrigin = currentUrl.match(/^https?:\/\/[^/]+/)?.[0] ?? null;
  const baseUrl =
    envBaseUrl ??
    (currentOrigin && /\/(?:cart|checkout)?(?:[/?#]|$)/.test(currentUrl)
      ? currentOrigin
      : "http://localhost:5173");
  const outputScope = isRenderHostedBaseUrl(baseUrl) ? "hosted" : "local";
  const navigationTimeout = outputScope === "hosted" ? 90000 : 30000;
  const interactionTimeout = outputScope === "hosted" ? 60000 : 10000;
  const readinessTimeout = outputScope === "hosted" ? 60000 : 20000;
  const navigationWaitUntil =
    outputScope === "hosted" ? "commit" : "domcontentloaded";
  const outputPrefix = `/private/tmp/paypal-retail-round4-${outputScope}-auth-minicart-checkout-evidence`;
  const consoleEntries = [];
  const responseEntries = [];
  const createOrderRequests = [];
  const requiredRowIds = [
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
  ];
  const widthCoverage = {
    included: [320, 390, 768, 1440],
    notApplicable: [
      {
        width: 375,
        reason:
          "320px and 390px exercise the same mobile component and CSS branches; 375px adds no Round 4 breakpoint.",
      },
      {
        width: 414,
        reason:
          "390px is the designated 390/414 representative and both widths stay inside the same Round 4 mobile branches.",
      },
      {
        width: 1024,
        reason:
          "1440px exercises the same desktop provider branch as 1024px; 768px separately covers the compact two-column branch.",
      },
    ],
  };

  function isRenderHostedBaseUrl(candidate) {
    return /^https:\/\/[^/]+\.onrender\.com(?:[/?#]|$)/i.test(candidate);
  }

  page.on("console", (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });
  page.on("pageerror", (error) => {
    consoleEntries.push({
      type: "error",
      text: error.message,
      location: null,
    });
  });
  page.on("response", (response) => {
    responseEntries.push({
      status: response.status(),
      url: response.url(),
    });
  });
  page.on("request", (request) => {
    if (
      request.url().includes("/api/paypal/orders/delivery") ||
      request.url().includes("/api/paypal/orders/bopis")
    ) {
      createOrderRequests.push({
        method: request.method(),
        url: request.url(),
        postData: request.postData(),
      });
    }
  });

  await resetEvidenceRoutes();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.context().route("**/api/account/auth/lookup", async (route) => {
    const body = route.request().postDataJSON();
    const email = String(body?.email ?? "").toLowerCase();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: {
        "access-control-allow-origin": "*",
      },
      body: JSON.stringify({
        ok: true,
        debug_id: "dbg_round4_auth_lookup",
        data: {
          email,
          status: email.startsWith("new.") ? "new" : "existing",
        },
      }),
    });
  });

  const deployment = await inspectDeployment();
  const screenshotAnalyzerPage = await page.context().newPage();
  await screenshotAnalyzerPage.setContent("<canvas></canvas>");
  const rows = [];

  for (const width of [320, 390, 1440]) {
    rows.push(await collectEmailModalRow(width));
    rows.push(await collectPasswordModalRow(width));
    rows.push(await collectRegisterModalRow(width));
  }

  for (const width of [320, 390, 1440]) {
    rows.push(await collectMinicartRow(width));
  }

  for (const width of [320, 390, 1440]) {
    rows.push(await collectPickupPickerRow(width));
    rows.push(await collectPreselectedPickupRow(width));
  }

  await openFreshCheckout(390);
  await advanceDeliveryCheckoutToPayment();
  rows.push(
    await collectRow({
      rowId: "checkout-payment-method-390",
      checkpoint: markCheckpoint(),
      expected: {
        contrastScope: "checkout",
        checkoutPayment: "none",
      },
    }),
  );
  rows.push(
    await collectRow({
      rowId: "checkout-safeguards-payment-ready-390",
      checkpoint: markCheckpoint(),
      expected: {
        contrastScope: "checkout",
        checkoutPayment: "none",
        safeguards: true,
      },
    }),
  );
  rows.push(await collectSelectedPaymentRow("paypal"));
  rows.push(await collectExpandedOrderSheetRow(390));
  await closeOrderSheetAndRecordFocus(rows.at(-1));
  rows.push(await collectSelectedPaymentRow("paylater"));
  rows.push(await collectSelectedPaymentRow("card"));
  rows.push(await collectReadinessRow("recalculating"));
  rows.push(await collectReadinessRow("failed"));

  await openFreshCheckout(320);
  await advanceDeliveryCheckoutToPayment();
  await selectPaymentMethod("paypal");
  rows.push(await collectExpandedOrderSheetRow(320));
  await closeOrderSheetAndRecordFocus(rows.at(-1));

  await openFreshCheckout(768);
  await advanceDeliveryCheckoutToPayment();
  rows.push(
    await collectRow({
      rowId: "checkout-payment-method-768",
      checkpoint: markCheckpoint(),
      expected: {
        contrastScope: "checkout",
        checkoutPayment: "none",
      },
    }),
  );
  rows.push(await collectSelectedPaymentRow("paypal", 768));

  await openFreshCheckout(1440);
  await advanceDeliveryCheckoutToPayment();
  rows.push(
    await collectRow({
      rowId: "desktop-auth-minicart-checkout-1440",
      checkpoint: markCheckpoint(),
      expected: {
        contrastScope: "checkout",
        checkoutPayment: "none",
        safeguards: true,
      },
    }),
  );
  rows.push(await collectSelectedPaymentRow("paypal", 1440));

  const missingRows = requiredRowIds.filter(
    (rowId) => !rows.some((row) => row.rowId === rowId),
  );
  const failedRows = rows
    .filter((row) => row.failures.length > 0)
    .map((row) => ({ rowId: row.rowId, failures: row.failures }));

  await screenshotAnalyzerPage.close();

  const report = {
    baseUrl,
    outputPrefix,
    deployment,
    widthCoverage,
    requiredRowIds,
    rows,
    summary: {
      rowCount: rows.length,
      missingRows,
      failedRows,
    },
  };
  return report;

  async function resetEvidenceRoutes() {
    await page
      .context()
      .unroute("**/api/account/auth/lookup")
      .catch(() => undefined);
    for (const routePattern of [
      "**/api/checkout/drafts/**/shipping-option**",
    ]) {
      await page.unroute(routePattern).catch(() => undefined);
    }
  }

  async function inspectDeployment() {
    if (!page.url().startsWith(baseUrl)) {
      await gotoEvidenceRoute(baseUrl);
    }
    await waitForAppShell("deployment inspection");
    await waitForOptionalNetworkIdle();

    return await page.evaluate(async () => {
      const faviconHref =
        document.querySelector('link[rel~="icon"]')?.getAttribute("href") ??
        "/favicon.ico";
      const faviconResponse = await fetch(faviconHref);

      return {
        url: window.location.href,
        title: document.title,
        assets: [...document.querySelectorAll("script[src], link[href]")].map(
          (node) => node.getAttribute("src") ?? node.getAttribute("href") ?? "",
        ),
        faviconStatus: faviconResponse.status,
        faviconHref,
      };
    });
  }

  async function setViewport(width) {
    await page.setViewportSize({
      width,
      height: width < 768 ? 844 : 900,
    });
  }

  async function waitForOptionalNetworkIdle() {
    if (outputScope !== "local") return;
    await page
      .waitForLoadState("networkidle", { timeout: 20000 })
      .catch(() => undefined);
  }

  async function waitForVisibleImages() {
    await page.waitForFunction(
      () => {
        const images = Array.from(document.images).filter((image) => {
          const style = window.getComputedStyle(image);
          const rect = image.getBoundingClientRect();
          return (
            image.getClientRects().length > 0 &&
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.right > 0 &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.top < window.innerHeight
          );
        });

        return images.every(
          (image) => image.complete && image.naturalWidth > 0,
        );
      },
      undefined,
      { timeout: readinessTimeout },
    );

    await page.evaluate(async () => {
      const images = Array.from(document.images).filter((image) => {
        const style = window.getComputedStyle(image);
        const rect = image.getBoundingClientRect();
        return (
          image.getClientRects().length > 0 &&
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.right > 0 &&
          rect.bottom > 0 &&
          rect.left < window.innerWidth &&
          rect.top < window.innerHeight
        );
      });

      for (const image of images) {
        await image.decode();
      }
    });
  }

  async function gotoEvidenceRoute(url) {
    const navigationOptions = {
      timeout: navigationTimeout,
      waitUntil: navigationWaitUntil,
    };

    try {
      return await page.goto(url, navigationOptions);
    } catch (error) {
      const message = String(error);
      if (outputScope !== "hosted" || !message.includes("net::ERR_ABORTED")) {
        throw error;
      }

      await page.waitForTimeout(250);
      return await page.goto(url, navigationOptions);
    }
  }

  async function waitForAppShell(routeLabel) {
    const appShell = page.locator(".app-shell");
    try {
      await appShell.waitFor({ state: "visible", timeout: readinessTimeout });
      return;
    } catch (firstError) {
      if (outputScope !== "hosted") throw firstError;
    }

    await page.reload({
      timeout: navigationTimeout,
      waitUntil: navigationWaitUntil,
    });
    try {
      await appShell.waitFor({ state: "visible", timeout: readinessTimeout });
    } catch (retryError) {
      throw new Error(
        `Hosted app shell did not render for ${routeLabel} after one retry: ${String(retryError)}`,
      );
    }
  }

  async function openFreshRoute(route, width) {
    await setViewport(width);
    await page.context().clearCookies();
    if (!page.url().startsWith(baseUrl)) {
      await gotoEvidenceRoute(baseUrl);
    }
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await gotoEvidenceRoute(`${baseUrl}${route}`);
    await waitForOptionalNetworkIdle();
    await waitForAppShell(route);
  }

  async function openFreshCheckout(width) {
    await openFreshRoute("/checkout", width);
    await page.waitForFunction(
      () =>
        Boolean(
          document.querySelector(
            "#shipping-address-first-name, #pickup-location-zip-or-postcode",
          ),
        ),
      undefined,
      { timeout: readinessTimeout },
    );
    await waitForGuestCartBinding();
  }

  async function waitForGuestCartBinding() {
    await page.waitForFunction(
      () => {
        const key = Object.keys(window.localStorage).find((key) =>
          key.startsWith("paypal-retail-demo:cart-binding:"),
        );
        if (!key) return false;

        try {
          const binding = JSON.parse(window.localStorage.getItem(key) ?? "{}");
          return Boolean(
            String(binding.cart_public_id ?? "").trim() &&
            String(binding.cart_client_secret ?? "").trim(),
          );
        } catch {
          return false;
        }
      },
      undefined,
      { timeout: readinessTimeout },
    );
    await page
      .locator('[role="status"]')
      .filter({ hasText: /Prepared guest cart|Restored saved cart/ })
      .first()
      .waitFor({ state: "visible", timeout: readinessTimeout });
  }

  async function collectEmailModalRow(width) {
    await openFreshRoute("/", width);
    const checkpoint = markCheckpoint();
    const trigger = page.getByRole("button", { name: "Sign in" });
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Sign in" });
    await dialog.waitFor({ state: "visible", timeout: interactionTimeout });
    const initialFocusedElement = await describeFocusedElement();
    const emailInput = dialog.getByLabel("Email");
    await emailInput.fill("invalid");
    await dialog.getByRole("button", { name: "Continue" }).click();
    await dialog.getByRole("alert").waitFor({ state: "visible" });
    await emailInput.focus();
    const row = await collectRow({
      rowId: `auth-email-modal-${width}`,
      checkpoint,
      expected: {
        contrastScope: "auth",
        dialogName: "Sign in",
        initialFocusIdPrefix: "auth-modal-email-",
        invalidEmailError: true,
        inputButtonWidthDelta: true,
      },
      extras: { initialFocusedElement },
    });
    await closeAuthDialogAndRecordFocus(row);
    return row;
  }

  async function collectPasswordModalRow(width) {
    await openFreshRoute("/", width);
    const checkpoint = markCheckpoint();
    const trigger = page.getByRole("button", { name: "Sign in" });
    await trigger.click();
    const emailDialog = page.getByRole("dialog", { name: "Sign in" });
    await emailDialog.getByLabel("Email").fill("alice.la@example.test");
    await emailDialog.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog", { name: "Enter password" });
    await dialog.waitFor({ state: "visible", timeout: interactionTimeout });
    const initialFocusedElement = await describeFocusedElement();
    const passwordInput = dialog.getByLabel("Password", { exact: true });
    const typeBefore = await passwordInput.getAttribute("type");
    await dialog.getByRole("button", { name: "Show password" }).click();
    const typeVisible = await passwordInput.getAttribute("type");
    await dialog.getByRole("button", { name: "Hide password" }).click();
    const typeRestored = await passwordInput.getAttribute("type");
    await passwordInput.focus();
    const row = await collectRow({
      rowId: `auth-password-modal-${width}`,
      checkpoint,
      expected: {
        contrastScope: "auth",
        dialogName: "Enter password",
        initialFocusIdPrefix: "auth-modal-password-",
        inputButtonWidthDelta: true,
        passwordToggle: true,
        passwordAutocomplete: "current-password",
        editEmail: true,
      },
      extras: {
        initialFocusedElement,
        passwordTypeSequence: [typeBefore, typeVisible, typeRestored],
      },
    });
    if (
      JSON.stringify(row.passwordTypeSequence) !==
      JSON.stringify(["password", "text", "password"])
    ) {
      row.failures.push(
        "Password visibility did not toggle password/text/password.",
      );
    }
    await closeAuthDialogAndRecordFocus(row);
    return row;
  }

  async function collectRegisterModalRow(width) {
    await openFreshRoute("/", width);
    const checkpoint = markCheckpoint();
    const trigger = page.getByRole("button", { name: "Sign in" });
    await trigger.click();
    const emailDialog = page.getByRole("dialog", { name: "Sign in" });
    await emailDialog.getByLabel("Email").fill("new.collector@example.test");
    await emailDialog.getByRole("button", { name: "Continue" }).click();
    const dialog = page.getByRole("dialog", { name: "Create account" });
    await dialog.waitFor({ state: "visible", timeout: interactionTimeout });
    const initialFocusedElement = await describeFocusedElement();
    await dialog.getByRole("button", { name: "Create account" }).click();
    const passwordError = dialog.getByText("Enter your password.", {
      exact: true,
    });
    await passwordError.waitFor({
      state: "visible",
      timeout: interactionTimeout,
    });
    const passwordErrorObserved = await passwordError.isVisible();
    const passwordInput = dialog.getByLabel("Password", { exact: true });
    await passwordInput.fill("collector-secret");
    await dialog.getByRole("button", { name: "Create account" }).click();
    const termsError = dialog.getByText(
      "Accept the terms before creating an account.",
      { exact: true },
    );
    await termsError.waitFor({
      state: "visible",
      timeout: interactionTimeout,
    });
    const termsErrorObserved = await termsError.isVisible();
    await passwordInput.focus();
    const row = await collectRow({
      rowId: `auth-register-modal-${width}`,
      checkpoint,
      expected: {
        contrastScope: "auth",
        dialogName: "Create account",
        initialFocusIdPrefix: "auth-modal-password-",
        inputButtonWidthDelta: true,
        passwordToggle: true,
        passwordAutocomplete: "new-password",
        editEmail: true,
        registerErrors: true,
      },
      extras: {
        initialFocusedElement,
        passwordErrorObserved,
        termsErrorObserved,
      },
    });
    await closeAuthDialogAndRecordFocus(row);
    return row;
  }

  async function closeAuthDialogAndRecordFocus(row) {
    await page.getByRole("button", { name: "Close" }).click();
    await page
      .locator('[data-slot="dialog-content"]')
      .waitFor({ state: "hidden", timeout: interactionTimeout });
    await page.waitForTimeout(100);
    row.postCloseFocusedElement = await describeFocusedElement();
    if (
      !/Sign in/i.test(row.postCloseFocusedElement?.ariaLabel ?? "") &&
      !/Sign in/i.test(row.postCloseFocusedElement?.text ?? "")
    ) {
      row.failures.push(
        "Auth dialog did not return focus to the Sign in trigger.",
      );
    }
  }

  async function collectMinicartRow(width) {
    await openFreshRoute("/cart", width);
    await waitForGuestCartBinding();
    const checkpoint = markCheckpoint();
    const trigger = page.getByRole("button", { name: "Open minicart" });
    await trigger.click();
    await page
      .locator(".minicart-shell")
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await waitForMinicartEvidenceReady();
    const row = await collectRow({
      rowId: `minicart-open-${width}`,
      checkpoint,
      expected: { contrastScope: "minicart", minicart: true },
    });
    await page.keyboard.press("Escape");
    await page.locator(".minicart-shell").waitFor({ state: "hidden" });
    await page.waitForTimeout(100);
    row.postCloseFocusedElement = await describeFocusedElement();
    if (
      !/Open minicart/i.test(row.postCloseFocusedElement?.ariaLabel ?? "") &&
      !/Open minicart/i.test(row.postCloseFocusedElement?.text ?? "")
    ) {
      row.failures.push("Minicart did not return focus to its trigger.");
    }
    return row;
  }

  async function waitForMinicartEvidenceReady() {
    await page.waitForFunction(
      () => {
        const shell = document.querySelector(".minicart-shell");
        if (!shell) return false;

        const quantityControls = [
          ...shell.querySelectorAll(".minicart-item__quantity button"),
        ];
        const expressMethods = [
          ...shell.querySelectorAll(
            ".delivery-express-action[data-delivery-express-source='minicart']",
          ),
        ].map((element) =>
          element.getAttribute("data-delivery-express-method"),
        );

        return Boolean(
          shell.querySelector(".minicart-item") &&
          shell.querySelector(".minicart-item__meta") &&
          shell.querySelector(".minicart-actions__link--primary") &&
          quantityControls.length > 0 &&
          quantityControls.every((control) =>
            control.getAttribute("aria-label")?.includes("quantity"),
          ) &&
          expressMethods.filter((method) => method === "paypal").length === 1 &&
          expressMethods.filter((method) => method === "paylater").length === 1,
        );
      },
      undefined,
      { timeout: readinessTimeout },
    );
  }

  async function openPickupPicker(width) {
    await openFreshCheckout(width);
    const checkpoint = markCheckpoint();
    const injectSoldOutStore = async (route) => {
      const response = await route.fetch({ timeout: navigationTimeout });
      const envelope = await response.json();
      const stores = envelope?.data?.draft?.pickup?.stores;
      const soldOutStore = Array.isArray(stores) ? stores.at(-1) : null;
      if (!soldOutStore) {
        await route.fulfill({ response });
        return;
      }
      soldOutStore.available_items_count = 0;
      soldOutStore.unavailable_items_count =
        soldOutStore.inventory_lines?.reduce(
          (sum, line) => sum + Number(line.requested_quantity ?? 0),
          0,
        ) ?? 0;
      soldOutStore.inventory_lines = soldOutStore.inventory_lines?.map(
        (line) => ({
          ...line,
          fulfillable_quantity: 0,
          unavailable_quantity: Number(line.requested_quantity ?? 0),
          status: "unavailable",
          status_label: "Sold out",
        }),
      );
      const headers = response.headers();
      delete headers["content-length"];
      await route.fulfill({
        status: response.status(),
        headers,
        body: JSON.stringify(envelope),
      });
    };
    const pickupResponsePatterns = [
      "**/api/checkout/drafts/**/pickup-location**",
      "**/api/checkout/drafts/**/promos/evaluate**",
      "**/api/checkout/drafts/**/promos/apply**",
    ];
    for (const pattern of pickupResponsePatterns) {
      await page.route(pattern, injectSoldOutStore);
    }
    await page.getByRole("tab", { name: "Pickup" }).click();
    const zipInput = page.locator("#pickup-location-zip-or-postcode");
    await zipInput.waitFor({
      state: "visible",
      timeout: interactionTimeout,
    });
    await zipInput.fill("19720");
    await page.getByRole("button", { name: "Find pickup stores" }).click();
    await page
      .getByRole("dialog", { name: "Choose pickup store" })
      .waitFor({ state: "visible", timeout: readinessTimeout });
    for (const pattern of pickupResponsePatterns) {
      await page.unroute(pattern, injectSoldOutStore);
    }
    return checkpoint;
  }

  async function collectPickupPickerRow(width) {
    const checkpoint = await openPickupPicker(width);
    const pickupStateScreenshots = await collectPickupStateScreenshots(width);
    return await collectRow({
      rowId: `pickup-store-picker-inventory-${width}`,
      checkpoint,
      expected: {
        contrastScope: "pickup",
        pickupInventory: "picker",
        touchTargets: true,
      },
      extras: { pickupStateScreenshots },
    });
  }

  async function collectPickupStateScreenshots(width) {
    const dialog = page.getByRole("dialog", { name: "Choose pickup store" });
    const stateScreenshots = [];

    for (const state of ["full", "partial", "empty"]) {
      const card = dialog
        .locator(`.checkout-store-card[data-inventory-state='${state}']`)
        .first();
      await card.waitFor({ state: "visible", timeout: interactionTimeout });
      await card.scrollIntoViewIfNeeded();
      await waitForVisibleImages();
      await page.waitForTimeout(100);
      const screenshotPath = `${outputPrefix}/pickup-store-picker-${state}-${width}.jpg`;
      const screenshot = await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
        type: "jpeg",
        quality: 95,
      });
      const screenshotPixelMetrics = await measureScreenshotPixels(screenshot);
      const rect = await card.boundingBox();
      const viewport = page.viewportSize();
      stateScreenshots.push({
        state,
        screenshotPath,
        screenshotPixelMetrics,
        visiblyInViewport: Boolean(
          rect &&
          viewport &&
          rect.y >= 0 &&
          rect.y + rect.height <= viewport.height,
        ),
      });
    }

    await dialog.evaluate((element) => {
      element.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: "instant" });
    });
    await page.waitForTimeout(100);

    return stateScreenshots;
  }

  async function collectPreselectedPickupRow(width) {
    const checkpoint = markCheckpoint();
    const dialog = page.getByRole("dialog", { name: "Choose pickup store" });
    const chooseButton = dialog
      .getByRole("button", { name: /Use selected store|Select this store/ })
      .first();
    const pickupStoreResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/pickup-store") &&
        response.request().method() === "PATCH",
      { timeout: readinessTimeout },
    );
    await chooseButton.click();
    const confirmButton = dialog.getByRole("button", {
      name: "Confirm pickup store",
    });
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
    const pickupStoreResponse = await pickupStoreResponsePromise;
    if (!pickupStoreResponse.ok()) {
      throw new Error(
        `Pickup-store save returned ${pickupStoreResponse.status()}.`,
      );
    }
    await page
      .getByRole("button", { name: "Save billing address" })
      .waitFor({ state: "visible", timeout: readinessTimeout });
    return await collectRow({
      rowId: `pickup-preselected-inventory-${width}`,
      checkpoint,
      expected: { pickupInventory: "preselected" },
    });
  }

  async function advanceDeliveryCheckoutToPayment() {
    await page.getByRole("button", { name: "Submit shipping address" }).click();
    await page
      .getByRole("button", { name: "Save billing address" })
      .waitFor({ state: "visible", timeout: readinessTimeout });
    await page.getByRole("button", { name: "Save billing address" }).click();
    await page
      .getByRole("button", { name: "Submit shipping option" })
      .waitFor({ state: "visible", timeout: readinessTimeout });
    await page.getByRole("button", { name: "Submit shipping option" }).click();
    await page
      .locator("[data-payment-method-row='paypal'] input")
      .waitFor({ state: "visible", timeout: readinessTimeout });
  }

  async function selectPaymentMethod(method) {
    await page.locator(`[data-payment-method-row='${method}'] input`).click();
    const readyText = {
      paypal: "PayPal payment button ready.",
      paylater: "Pay Later payment option ready.",
      card: "Card payment fields ready.",
    }[method];
    await page
      .getByText(readyText)
      .waitFor({ state: "visible", timeout: readinessTimeout });
    const placementSelector =
      method === "card"
        ? ".checkout-choice__card-box"
        : (page.viewportSize()?.width ?? 1440) <= 760
          ? ".checkout-sticky-summary__action"
          : ".checkout-summary__slot";
    await waitForOfficialPaymentAction(method, placementSelector);
  }

  async function waitForOfficialPaymentAction(method, placementSelector) {
    const officialSelector = {
      paypal: "paypal-button",
      paylater: "paypal-pay-later-button",
      card: "paypal-hosted-card-field",
    }[method];
    const officialLocator = page.locator(
      `${placementSelector} [data-paypal-sdk-status="ready"] [data-paypal-sdk-runtime-status="resolved"] [data-payment-action-placement][data-payment-method='${method}'] ${officialSelector}`,
    );

    if (method === "card") {
      await officialLocator
        .first()
        .waitFor({ state: "visible", timeout: readinessTimeout });
      await page.waitForFunction(
        ({ placementSelector, officialSelector }) =>
          [
            ...document.querySelectorAll(
              `${placementSelector} [data-paypal-sdk-status="ready"] [data-paypal-sdk-runtime-status="resolved"] ${officialSelector}`,
            ),
          ].filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          }).length === 3,
        { placementSelector, officialSelector },
        { timeout: readinessTimeout },
      );
      return;
    }

    await page.waitForFunction(
      ({ method, placementSelector, officialSelector }) => {
        const scope = document.querySelector(
          `${placementSelector} [data-paypal-sdk-status="ready"] [data-paypal-sdk-runtime-status="resolved"]`,
        );
        const official = scope?.querySelector(
          `[data-payment-action-placement][data-payment-method='${method}'] ${officialSelector}`,
        );
        const shadowControl = official?.shadowRoot?.querySelector(
          "button, [role='button'], iframe",
        );
        const officialRect = official?.getBoundingClientRect();
        const controlRect = shadowControl?.getBoundingClientRect();
        return Boolean(
          officialRect &&
          officialRect.width > 0 &&
          officialRect.height > 0 &&
          controlRect &&
          controlRect.width > 0 &&
          controlRect.height > 0,
        );
      },
      { method, placementSelector, officialSelector },
      { timeout: readinessTimeout },
    );
  }

  async function collectSelectedPaymentRow(method, width = 390) {
    const checkpoint = markCheckpoint();
    await selectPaymentMethod(method);
    return await collectRow({
      rowId: `checkout-selected-${method}-${width}`,
      checkpoint,
      expected: {
        checkoutPayment: method,
        contrastScope: "checkout",
        touchTargets: true,
      },
    });
  }

  async function collectExpandedOrderSheetRow(width) {
    const checkpoint = markCheckpoint();
    await page.getByRole("button", { name: "Review order details" }).click();
    await page
      .getByRole("button", { name: "Close order details" })
      .waitFor({ state: "visible", timeout: interactionTimeout });
    const selectedMethod = await page
      .locator("[data-payment-method-row]:has(input:checked)")
      .getAttribute("data-payment-method-row");
    if (selectedMethod === "paypal" || selectedMethod === "paylater") {
      await waitForOfficialPaymentAction(
        selectedMethod,
        ".checkout-order-sheet__payment",
      );
    }
    return await collectRow({
      rowId: `checkout-expanded-order-sheet-${width}`,
      checkpoint,
      expected: {
        contrastScope: "checkout",
        orderSheet: true,
        touchTargets: true,
      },
    });
  }

  async function closeOrderSheetAndRecordFocus(row) {
    const trigger = page.getByRole("button", { name: "Review order details" });
    const closeMethods = ["escape", "handle", "scrim"];
    row.closeMethods = [];

    for (const [index, method] of closeMethods.entries()) {
      if (index > 0) {
        await trigger.click();
        await page
          .getByRole("button", { name: "Close order details" })
          .waitFor({ state: "visible", timeout: interactionTimeout });
      }

      if (method === "escape") {
        await page.keyboard.press("Escape");
      } else if (method === "handle") {
        await page.getByRole("button", { name: "Close order details" }).click();
      } else {
        const overlay = page.locator('[data-slot="sheet-overlay"]');
        const overlayBox = await overlay.boundingBox();
        if (!overlayBox) {
          throw new Error("Order sheet scrim did not have a measurable box.");
        }
        await page.mouse.click(overlayBox.x + 8, overlayBox.y + 8);
      }

      await trigger.waitFor({ state: "visible", timeout: interactionTimeout });
      await page.waitForTimeout(100);
      const focusedElement = await describeFocusedElement();
      row.closeMethods.push({ method, focusedElement });
      row.postCloseFocusedElement = focusedElement;
      if (
        !/Review order details/i.test(focusedElement?.ariaLabel ?? "") &&
        !/Review order details/i.test(focusedElement?.text ?? "")
      ) {
        row.failures.push(
          `Order sheet ${method} close did not return focus to its summary trigger.`,
        );
      }
    }
  }

  async function collectReadinessRow(state) {
    await page
      .unroute("**/api/checkout/drafts/**/shipping-option**")
      .catch(() => undefined);
    const readiness =
      state === "recalculating"
        ? {
            state,
            title: "Payment is recalculating",
            body: "Updated totals are syncing before payment.",
          }
        : {
            state,
            title: "Payment needs refresh",
            body: "Refresh checkout details before continuing.",
          };
    await page.route(
      "**/api/checkout/drafts/**/shipping-option**",
      async (route) => {
        const response = await route.fetch();
        const envelope = await response.json();
        if (envelope?.ok && envelope.data?.draft) {
          envelope.data.draft.payment_readiness = readiness;
        }
        await route.fulfill({ response, json: envelope });
      },
    );
    await openFreshCheckout(390);
    const checkpoint = markCheckpoint();
    await advanceDeliveryCheckoutToPayment();
    await page.locator("[data-payment-method-row='paypal'] input").click();
    await page.getByText(readiness.title).waitFor({ state: "visible" });
    const row = await collectRow({
      rowId: `checkout-${state}-readiness-390`,
      checkpoint,
      expected: {
        contrastScope: "checkout",
        readiness: readiness.title,
      },
    });
    await page.unroute("**/api/checkout/drafts/**/shipping-option**");
    return row;
  }

  function markCheckpoint() {
    return {
      consoleStart: consoleEntries.length,
      responseStart: responseEntries.length,
      createOrderStart: createOrderRequests.length,
    };
  }

  async function collectRow({ rowId, checkpoint, expected, extras = {} }) {
    await waitForVisibleImages();
    await page.waitForTimeout(250);
    const screenshotPath = `${outputPrefix}/${rowId}.jpg`;
    let screenshotPixelMetrics = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      const screenshot = await page.screenshot({
        path: screenshotPath,
        fullPage: false,
        animations: "disabled",
        caret: "hide",
        type: "jpeg",
        quality: 95,
      });
      screenshotPixelMetrics = await measureScreenshotPixels(screenshot);
      if (!screenshotPixelMetrics.suspicious) break;
      await page.waitForTimeout(250 * attempt);
    }
    const metrics = await collectDomMetrics();
    const consoleIssues = consoleEntries
      .slice(checkpoint.consoleStart)
      .filter((entry) => entry.type === "error" || entry.type === "warning");
    const responseIssues = responseEntries
      .slice(checkpoint.responseStart)
      .filter((entry) => entry.status >= 400);
    const row = {
      rowId,
      route:
        page
          .url()
          .replace(/^https?:\/\/[^/]+/, "")
          .split(/[?#]/)[0] || "/",
      viewport: page.viewportSize(),
      screenshotPath,
      screenshotPixelMetrics,
      nearBlackPixelRatio: screenshotPixelMetrics?.nearBlackPixelRatio ?? null,
      consoleIssues,
      responseIssues,
      createOrderRequests:
        createOrderRequests.length - checkpoint.createOrderStart,
      faviconStatus: metrics.faviconStatus,
      horizontalOverflow: metrics.horizontalOverflow,
      focusedElement: metrics.focusedElement,
      dialogState: metrics.dialogState,
      sheetState: metrics.sheetState,
      handleBackground: metrics.orderSheet.handleBackground,
      stickyOverlapCount: metrics.stickyOverlapCount,
      providerCounts: metrics.providerCounts,
      officialProviderNodes: metrics.officialProviderNodes,
      selectedPaymentAction: metrics.selectedPaymentAction,
      contrastSamples: metrics.contrastSamples,
      minimumContrastRatio: metrics.minimumContrastRatio,
      touchTargets: metrics.touchTargets,
      minimumMeasuredTouchTarget: metrics.minimumMeasuredTouchTarget,
      inputButtonWidthDelta: metrics.inputButtonWidthDelta,
      passwordToggle: metrics.passwordToggle,
      passwordAutocomplete: metrics.passwordAutocomplete,
      pickupInventoryRows: metrics.pickupInventoryRows,
      pickupHeadingOverflows: metrics.pickupHeadingOverflows,
      pickerHeaderOverlap: metrics.pickerHeaderOverlap,
      mockupComparison: metrics.mockupComparison,
      metrics,
      ...extras,
      failures: [],
    };
    applyCommonAssertions(row);
    applyExpectedAssertions(row, expected);
    return row;
  }

  function applyCommonAssertions(row) {
    if (row.screenshotPixelMetrics?.suspicious) {
      row.failures.push(
        `Screenshot contains suspicious black coverage (${row.screenshotPixelMetrics.nearBlackPixelRatio}).`,
      );
    }
    if (row.consoleIssues.length > 0) {
      row.failures.push(`Console issues: ${JSON.stringify(row.consoleIssues)}`);
    }
    if (row.responseIssues.length > 0) {
      row.failures.push(
        `Response issues: ${JSON.stringify(row.responseIssues)}`,
      );
    }
    if (row.faviconStatus !== 200) {
      row.failures.push(`Favicon returned ${row.faviconStatus}.`);
    }
    if (row.horizontalOverflow > 1) {
      row.failures.push(`Horizontal overflow is ${row.horizontalOverflow}px.`);
    }
    if (row.stickyOverlapCount > 0) {
      row.failures.push(
        `Sticky/fixed overlap count is ${row.stickyOverlapCount}.`,
      );
    }
    if (
      typeof row.minimumContrastRatio === "number" &&
      row.minimumContrastRatio < 4.5
    ) {
      row.failures.push(
        `Transaction body/helper contrast fell to ${row.minimumContrastRatio}.`,
      );
    }
    if (
      typeof row.minimumMeasuredTouchTarget === "number" &&
      row.minimumMeasuredTouchTarget < 44
    ) {
      row.failures.push(
        `A measured interactive target fell to ${row.minimumMeasuredTouchTarget}px.`,
      );
    }
  }

  function applyExpectedAssertions(row, expected) {
    if (
      expected.contrastScope &&
      row.contrastSamples.filter(
        (sample) => sample.scope === expected.contrastScope,
      ).length === 0
    ) {
      row.failures.push(
        `No ${expected.contrastScope} body/helper contrast samples were measured.`,
      );
    }
    if (expected.dialogName && row.dialogState.name !== expected.dialogName) {
      row.failures.push(`Expected dialog ${expected.dialogName}.`);
    }
    if (
      expected.initialFocusIdPrefix &&
      !row.initialFocusedElement?.id?.startsWith(expected.initialFocusIdPrefix)
    ) {
      row.failures.push(
        `Initial focus did not land on ${expected.initialFocusIdPrefix}.`,
      );
    }
    if (
      expected.inputButtonWidthDelta &&
      (row.inputButtonWidthDelta === null || row.inputButtonWidthDelta > 2)
    ) {
      row.failures.push(
        `Input/button width delta is ${row.inputButtonWidthDelta ?? "missing"}px.`,
      );
    }
    if (expected.invalidEmailError && !row.metrics.invalidEmailError) {
      row.failures.push("Invalid email error was not visible.");
    }
    if (expected.passwordToggle && !row.passwordToggle?.meetsTouchTarget) {
      row.failures.push("Password toggle did not meet its 44px touch target.");
    }
    if (
      expected.passwordAutocomplete &&
      row.passwordAutocomplete !== expected.passwordAutocomplete
    ) {
      row.failures.push(
        `Expected password autocomplete ${expected.passwordAutocomplete}.`,
      );
    }
    if (expected.editEmail && !row.metrics.hasEditEmail) {
      row.failures.push("Edit email control was missing.");
    }
    if (
      expected.registerErrors &&
      (!row.passwordErrorObserved || !row.termsErrorObserved)
    ) {
      row.failures.push(
        "Register password and terms errors were not both observed.",
      );
    }
    if (expected.minicart) {
      const minicart = row.metrics.minicart;
      if (
        !minicart.open ||
        !minicart.firstProductVisible ||
        !minicart.checkoutVisible
      ) {
        row.failures.push(
          "Minicart first viewport omitted its product row or Checkout action.",
        );
      }
      if (
        minicart.quantityControls.length === 0 ||
        minicart.quantityControls.some(
          (control) =>
            !control.meetsTouchTarget || !control.hasProductSpecificName,
        )
      ) {
        row.failures.push(
          "Minicart quantity controls were missing, unnamed, generic, or smaller than 44px.",
        );
      }
      if (
        row.providerCounts.minicart.paypal !== 1 ||
        row.providerCounts.minicart.paylater !== 1
      ) {
        row.failures.push(
          "Minicart did not own exactly one PayPal and one Pay Later action.",
        );
      }
      if (minicart.hasCheckoutStickySummary) {
        row.failures.push(
          "Checkout sticky summary rendered behind the minicart.",
        );
      }
      if (
        minicart.productNameRenderedLines > 2.2 ||
        minicart.productNameOverflows
      ) {
        row.failures.push(
          "The first minicart product name exceeded its two-line boundary.",
        );
      }
    }
    if (expected.pickupInventory) {
      if (row.pickupInventoryRows.length === 0) {
        row.failures.push("Pickup inventory rows were missing.");
      }
      if (row.pickupInventoryRows.some((item) => item.renderedLines > 2.2)) {
        row.failures.push(
          "A pickup inventory item exceeded the two-line clamp.",
        );
      }
      if (row.pickupInventoryRows.some((item) => item.overflowsContainer)) {
        row.failures.push("A pickup inventory row overflowed its container.");
      }
      if (row.pickupHeadingOverflows) {
        row.failures.push("A pickup store heading overflowed its card.");
      }
      if (expected.pickupInventory === "picker" && row.pickerHeaderOverlap) {
        row.failures.push("The pickup picker is covered by the site header.");
      }
      const confirmPickupTarget = row.touchTargets.find(
        (target) => target.name === "Confirm pickup store",
      );
      if (
        expected.pickupInventory === "picker" &&
        (!confirmPickupTarget || confirmPickupTarget.renderedLines > 1.2)
      ) {
        row.failures.push(
          "Confirm pickup store was missing or wrapped beyond one line.",
        );
      }
      if (
        expected.pickupInventory === "picker" &&
        (!row.metrics.pickupInventoryStates.includes("full") ||
          !row.metrics.pickupInventoryStates.includes("partial") ||
          !row.metrics.pickupInventoryStates.includes("empty"))
      ) {
        row.failures.push(
          "Picker did not show full, partial, and sold-out inventory states.",
        );
      }
      if (expected.pickupInventory === "picker") {
        const capturedStates = new Set(
          (row.pickupStateScreenshots ?? []).map((item) => item.state),
        );
        if (
          !["full", "partial", "empty"].every((state) =>
            capturedStates.has(state),
          ) ||
          row.pickupStateScreenshots.some(
            (item) =>
              !item.visiblyInViewport ||
              item.screenshotPixelMetrics?.suspicious,
          )
        ) {
          row.failures.push(
            "Picker did not capture visible, healthy screenshots for full, partial, and sold-out states.",
          );
        }
      }
    }
    if (expected.checkoutPayment) {
      if (!row.metrics.paymentMethodVisible) {
        row.failures.push("Payment method section was not visible.");
      }
      if (
        expected.checkoutPayment === "none" &&
        row.metrics.selectedPaymentMethod
      ) {
        row.failures.push("A payment method was selected before buyer action.");
      }
      if (
        expected.checkoutPayment !== "none" &&
        row.metrics.selectedPaymentMethod !== expected.checkoutPayment
      ) {
        row.failures.push(
          `Expected selected payment ${expected.checkoutPayment}.`,
        );
      }
      if (
        expected.checkoutPayment === "paypal" &&
        (row.viewport.width <= 760
          ? row.providerCounts.checkoutSticky.paypal !== 1
          : row.providerCounts.desktopSummary.paypal !== 1)
      ) {
        row.failures.push(
          "Selected PayPal did not render one sticky PayPal provider.",
        );
      }
      if (
        (expected.checkoutPayment === "paypal" ||
          expected.checkoutPayment === "paylater" ||
          expected.checkoutPayment === "card") &&
        (row.selectedPaymentAction.providerStatus !== "ready" ||
          row.selectedPaymentAction.runtimeStatus !== "resolved" ||
          !row.selectedPaymentAction.visible ||
          !row.selectedPaymentAction.officialRect ||
          !row.selectedPaymentAction.inViewport)
      ) {
        row.failures.push(
          `Selected ${expected.checkoutPayment} action was not visibly hydrated.`,
        );
      }
      if (
        expected.checkoutPayment === "paypal" &&
        (row.officialProviderNodes.paypalButton !== 1 ||
          row.officialProviderNodes.byPlacement[
            row.viewport.width <= 760 ? "checkoutSticky" : "desktopSummary"
          ].paypalButton !== 1)
      ) {
        row.failures.push(
          "Selected PayPal did not render exactly one official button in its expected checkout placement.",
        );
      }
      if (
        expected.checkoutPayment === "paylater" &&
        row.providerCounts.checkoutSticky.paylater !== 1
      ) {
        row.failures.push(
          "Selected Pay Later did not render one sticky Pay Later provider.",
        );
      }
      if (
        expected.checkoutPayment === "paylater" &&
        (row.officialProviderNodes.payLaterButton !== 1 ||
          row.officialProviderNodes.byPlacement.checkoutSticky
            .payLaterButton !== 1)
      ) {
        row.failures.push(
          "Selected Pay Later did not render exactly one official button in its expected checkout placement.",
        );
      }
      if (
        expected.checkoutPayment === "card" &&
        row.providerCounts.inlineCard.card !== 1
      ) {
        row.failures.push(
          "Selected Card did not render one inline Card provider.",
        );
      }
      if (
        expected.checkoutPayment === "card" &&
        (row.officialProviderNodes.cardHostedFields !== 3 ||
          row.officialProviderNodes.byPlacement.inlineCard.cardHostedFields !==
            3)
      ) {
        row.failures.push(
          "Selected Card did not render exactly three hosted card fields in its inline placement.",
        );
      }
    }
    if (
      expected.readiness &&
      !row.metrics.readinessText.includes(expected.readiness)
    ) {
      row.failures.push(`Expected readiness ${expected.readiness}.`);
    }
    if (expected.orderSheet) {
      if (
        !row.metrics.orderSheet.open ||
        row.sheetState.name !== "Order details"
      ) {
        row.failures.push(
          "Order details Sheet was not open with its accessible name.",
        );
      }
      if (!row.metrics.orderSheet.handleMeetsTouchTarget) {
        row.failures.push("Order sheet handle is smaller than 44px.");
      }
      if (
        row.selectedPaymentAction.runtimeStatus !== "resolved" ||
        !row.selectedPaymentAction.visible
      ) {
        row.failures.push(
          "Expanded order sheet did not contain a visibly hydrated payment action.",
        );
      }
      if (
        !row.handleBackground ||
        row.handleBackground === "transparent" ||
        row.handleBackground === "rgba(0, 0, 0, 0)"
      ) {
        row.failures.push("Order sheet handle is visually transparent.");
      }
      if (row.metrics.orderSheet.topPadding > 24) {
        row.failures.push(
          `Order sheet title top padding is ${row.metrics.orderSheet.topPadding}px.`,
        );
      }
    }
    if (
      expected.touchTargets &&
      (row.touchTargets.length === 0 ||
        row.touchTargets.some((target) => !target.meetsTouchTarget))
    ) {
      row.failures.push(
        "Required visible controls did not all meet the 44px touch target.",
      );
    }
    if (expected.safeguards && !row.metrics.safeguards.compact) {
      row.failures.push(
        "Checkout safeguards were not rendered as a compact trust row.",
      );
    }
  }

  async function describeFocusedElement() {
    return await page.evaluate(() => {
      const element = document.activeElement;
      if (!element) return null;
      return {
        tag: element.tagName?.toLowerCase() ?? null,
        id: element.id || null,
        role: element.getAttribute?.("role") ?? null,
        ariaLabel: element.getAttribute?.("aria-label") ?? null,
        text:
          element.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ?? "",
      };
    });
  }

  async function measureScreenshotPixels(screenshot) {
    return await screenshotAnalyzerPage.evaluate(
      async (dataUrl) => {
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        const canvas = document.querySelector("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        ).data;
        let nearBlackPixels = 0;
        const pixelCount = pixels.length / 4;
        for (let index = 0; index < pixels.length; index += 4) {
          if (
            pixels[index] < 8 &&
            pixels[index + 1] < 8 &&
            pixels[index + 2] < 8 &&
            pixels[index + 3] > 245
          ) {
            nearBlackPixels += 1;
          }
        }
        const nearBlackPixelRatio =
          Math.round((nearBlackPixels / pixelCount) * 10000) / 10000;
        return {
          width: canvas.width,
          height: canvas.height,
          nearBlackPixelRatio,
          suspicious: nearBlackPixelRatio > 0.08,
        };
      },
      `data:image/jpeg;base64,${screenshot.toString("base64")}`,
    );
  }

  async function collectDomMetrics() {
    return await page.evaluate(async () => {
      const faviconHref =
        document.querySelector('link[rel~="icon"]')?.getAttribute("href") ??
        "/favicon.ico";
      const faviconResponse = await fetch(faviconHref);
      const dialog = document.querySelector(
        '[data-slot="dialog-content"], .checkout-modal[role="dialog"]',
      );
      const sheet = document.querySelector('[data-slot="sheet-content"]');
      const authInput = dialog?.querySelector("input:not([type='checkbox'])");
      const authAction = dialog?.querySelector(".auth-modal__primary-action");
      const passwordToggle = dialog?.querySelector(
        ".auth-modal__password-toggle",
      );
      const passwordInput = dialog?.querySelector(
        ".auth-modal__password-input",
      );
      const minicart = document.querySelector(".minicart-shell");
      const orderSheet = document.querySelector(".checkout-order-sheet");
      const orderSheetTitle = orderSheet?.querySelector(
        '[data-slot="sheet-title"]',
      );
      const orderSheetHandle = orderSheet?.querySelector(
        ".checkout-order-sheet__handle",
      );
      const orderSheetHandleVisual = orderSheetHandle?.querySelector("span");
      const pickerPanel = document.querySelector(".checkout-modal__panel");
      const header = document.querySelector(".site-header");
      const sticky = document.querySelector(".checkout-sticky-summary");
      const stickyRect = sticky?.getBoundingClientRect() ?? null;
      const pickupInventoryRows = [
        ...document.querySelectorAll(
          ".checkout-store-card__inventory-lines li",
        ),
      ].map((row) => {
        const name = row.querySelector(".checkout-store-card__inventory-name");
        const status = row.querySelector(
          ".checkout-store-card__inventory-status",
        );
        const rowRect = row.getBoundingClientRect();
        const nameRect = name?.getBoundingClientRect();
        const computed = name ? getComputedStyle(name) : null;
        const lineHeight = computed
          ? Number.parseFloat(computed.lineHeight)
          : 0;
        return {
          name: name?.textContent?.trim() ?? "",
          status: status?.textContent?.trim() ?? "",
          kind: row.getAttribute("data-inventory-kind"),
          renderedLines:
            nameRect && lineHeight ? nameRect.height / lineHeight : 0,
          overflowsContainer:
            row.scrollWidth > row.clientWidth + 1 ||
            Boolean(name && name.scrollWidth > name.clientWidth + 1),
          rect: toPlainRect(rowRect),
        };
      });
      const pickupHeadingOverflows = [
        ...document.querySelectorAll(".checkout-store-card__heading"),
      ].some((heading) => {
        const headingRect = heading.getBoundingClientRect();
        return (
          heading.scrollWidth > heading.clientWidth + 1 ||
          [...heading.children].some((child) => {
            const childRect = child.getBoundingClientRect();
            return (
              childRect.left < headingRect.left - 1 ||
              childRect.right > headingRect.right + 1
            );
          })
        );
      });
      const pickerHeaderOverlap = (() => {
        if (!pickerPanel) return false;
        const rect = pickerPanel.getBoundingClientRect();
        const sample = document.elementFromPoint(
          Math.max(
            0,
            Math.min(window.innerWidth - 1, rect.left + rect.width / 2),
          ),
          Math.max(0, Math.min(window.innerHeight - 1, rect.top + 8)),
        );
        return !sample?.closest(".checkout-modal__panel");
      })();
      const trackedTargets = [
        ...document.querySelectorAll(
          [
            "input:focus",
            ".checkout-modal__header",
            ".checkout-modal__actions",
            ".checkout-order-sheet__handle",
            ".checkout-payment-readiness",
            "paypal-button",
            "paypal-pay-later-button",
            "paypal-message",
            ".site-footer",
          ].join(","),
        ),
      ];
      const stickyOverlapCount = pickerPanel
        ? 0
        : trackedTargets.filter((target) => {
            if (
              target.closest(".checkout-sticky-summary, .checkout-order-sheet")
            ) {
              return false;
            }
            const rect = target.getBoundingClientRect();
            return Boolean(
              stickyRect && isVisible(rect) && intersects(stickyRect, rect),
            );
          }).length;
      const inputButtonWidthDelta =
        authInput && authAction
          ? Math.abs(
              authInput.getBoundingClientRect().width -
                authAction.getBoundingClientRect().width,
            )
          : null;
      const minicartCheckout = minicart?.querySelector("a[href='/checkout']");
      const minicartProduct = minicart?.querySelector(
        "[data-minicart-row='product-first']",
      );
      const minicartProductName = minicartProduct?.querySelector(
        ".minicart-item__name",
      );
      const minicartProductNameRect =
        minicartProductName?.getBoundingClientRect();
      const minicartProductNameLineHeight = minicartProductName
        ? Number.parseFloat(getComputedStyle(minicartProductName).lineHeight)
        : 0;
      const quantityControls = minicart
        ? [
            ...minicart.querySelectorAll(
              ".minicart-item__quantity button, .minicart-item__quantity input",
            ),
          ].map((control) => {
            const rect = control.getBoundingClientRect();
            const productName = control
              .closest(".minicart-item")
              ?.querySelector(".minicart-item__name")
              ?.textContent?.trim();
            const name =
              control.getAttribute("aria-label") ??
              control.textContent?.trim() ??
              "";
            return {
              name,
              productName: productName ?? "",
              hasProductSpecificName: Boolean(
                productName && name.includes(productName),
              ),
              rect: toPlainRect(rect),
              meetsTouchTarget: rect.width >= 44 && rect.height >= 44,
            };
          })
        : [];
      const providerCounts = getProviderCounts();
      const officialProviderNodes = getOfficialProviderNodes();
      const selectedPaymentAction = getSelectedPaymentAction();
      const contrastSamples = getContrastSamples();
      const minimumContrastRatio = contrastSamples.length
        ? Math.min(...contrastSamples.map((sample) => sample.ratio))
        : null;
      const touchTargets = getTouchTargets();
      const minimumMeasuredTouchTarget = touchTargets.length
        ? Math.min(
            ...touchTargets.flatMap((target) => [
              target.rect.width,
              target.rect.height,
            ]),
          )
        : null;
      const selectedPaymentRow = document.querySelector(
        "[data-payment-method-row][data-selected='true'], [data-payment-method-row]:has(input:checked)",
      );
      const safeguards = document.querySelector(".checkout-trust-strip");
      const orderSheetRect = orderSheet?.getBoundingClientRect();
      const orderSheetTitleRect = orderSheetTitle?.getBoundingClientRect();
      const orderSheetHandleRect = orderSheetHandle?.getBoundingClientRect();

      return {
        faviconStatus: faviconResponse.status,
        horizontalOverflow: Math.max(
          0,
          document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        ),
        focusedElement: describeElement(document.activeElement),
        dialogState: {
          open: Boolean(dialog),
          name: dialog ? accessibleName(dialog) : null,
          role: dialog?.getAttribute("role") ?? null,
        },
        sheetState: {
          open: Boolean(sheet),
          name: sheet ? accessibleName(sheet) : null,
          side: sheet?.getAttribute("data-side") ?? null,
        },
        stickyOverlapCount,
        providerCounts,
        officialProviderNodes,
        selectedPaymentAction,
        contrastSamples,
        minimumContrastRatio,
        touchTargets,
        minimumMeasuredTouchTarget,
        inputButtonWidthDelta,
        invalidEmailError: Boolean(
          dialog
            ?.querySelector('[role="alert"]')
            ?.textContent?.includes("valid email"),
        ),
        hasEditEmail: Boolean(
          [...(dialog?.querySelectorAll("button") ?? [])].some((button) =>
            button.textContent?.includes("Edit email"),
          ),
        ),
        passwordToggle: passwordToggle
          ? (() => {
              const rect = passwordToggle.getBoundingClientRect();
              return {
                label: passwordToggle.getAttribute("aria-label"),
                rect: toPlainRect(rect),
                meetsTouchTarget: rect.width >= 44 && rect.height >= 44,
              };
            })()
          : null,
        passwordAutocomplete:
          passwordInput?.getAttribute("autocomplete") ?? null,
        minicart: {
          open: Boolean(minicart),
          firstProductVisible: Boolean(
            minicartProduct &&
            isVisible(minicartProduct.getBoundingClientRect()),
          ),
          checkoutVisible: Boolean(
            minicartCheckout &&
            isVisible(minicartCheckout.getBoundingClientRect()),
          ),
          quantityControls,
          productNameRenderedLines:
            minicartProductNameRect && minicartProductNameLineHeight
              ? minicartProductNameRect.height / minicartProductNameLineHeight
              : 0,
          productNameOverflows: Boolean(
            minicartProductName &&
            minicartProductName.scrollWidth >
              minicartProductName.clientWidth + 1,
          ),
          hasCheckoutStickySummary: Boolean(sticky),
        },
        pickupInventoryRows,
        pickupHeadingOverflows,
        pickupInventoryStates: [
          ...new Set(
            [
              ...document.querySelectorAll(
                ".checkout-store-card[data-inventory-state]",
              ),
            ].map((card) => card.getAttribute("data-inventory-state")),
          ),
        ],
        pickerHeaderOverlap,
        pickerLayering: {
          modalZIndex: document.querySelector(".checkout-modal")
            ? getComputedStyle(document.querySelector(".checkout-modal")).zIndex
            : null,
          headerZIndex: header ? getComputedStyle(header).zIndex : null,
        },
        paymentMethodVisible: Boolean(
          document.querySelector("[data-payment-method-row]"),
        ),
        selectedPaymentMethod:
          selectedPaymentRow?.getAttribute("data-payment-method-row") ?? null,
        readinessText:
          document.querySelector(".checkout-payment-readiness")?.textContent ??
          "",
        orderSheet: {
          open: Boolean(orderSheet),
          handleBackground: orderSheetHandleVisual
            ? getComputedStyle(orderSheetHandleVisual).backgroundColor
            : null,
          topPadding:
            orderSheetRect && orderSheetTitleRect
              ? orderSheetTitleRect.top - orderSheetRect.top
              : 0,
          handleMeetsTouchTarget: Boolean(
            orderSheetHandleRect &&
            orderSheetHandleRect.width >= 44 &&
            orderSheetHandleRect.height >= 44,
          ),
        },
        safeguards: {
          compact: Boolean(
            safeguards && safeguards.getBoundingClientRect().height <= 132,
          ),
          rect: safeguards
            ? toPlainRect(safeguards.getBoundingClientRect())
            : null,
        },
        mockupComparison: {
          inputButtonWidthDelta,
          orderSheetTopPadding:
            orderSheetRect && orderSheetTitleRect
              ? orderSheetTitleRect.top - orderSheetRect.top
              : null,
          minimumTouchTarget: 44,
          minimumMeasuredTouchTarget,
          minicartFirstViewport: Boolean(
            minicartProduct &&
            minicartCheckout &&
            isVisible(minicartProduct.getBoundingClientRect()) &&
            isVisible(minicartCheckout.getBoundingClientRect()),
          ),
        },
      };

      function accessibleName(element) {
        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy) {
          return labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
            .filter(Boolean)
            .join(" ");
        }
        return element.getAttribute("aria-label") ?? "";
      }

      function describeElement(element) {
        if (!element) return null;
        return {
          tag: element.tagName?.toLowerCase() ?? null,
          id: element.id || null,
          role: element.getAttribute?.("role") ?? null,
          ariaLabel: element.getAttribute?.("aria-label") ?? null,
          text:
            element.textContent?.trim().replace(/\s+/g, " ").slice(0, 100) ??
            "",
        };
      }

      function toPlainRect(rect) {
        return {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          top: Math.round(rect.top * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          bottom: Math.round(rect.bottom * 100) / 100,
          left: Math.round(rect.left * 100) / 100,
        };
      }

      function isVisible(rect) {
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom >= 0 &&
          rect.top <= window.innerHeight
        );
      }

      function intersects(first, second) {
        return !(
          first.right <= second.left ||
          first.left >= second.right ||
          first.bottom <= second.top ||
          first.top >= second.bottom
        );
      }

      function getProviderCounts() {
        const result = {
          checkoutSticky: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
          desktopSummary: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
          orderSheet: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
          inlineCard: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
          minicart: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
          other: { paypal: 0, paylater: 0, card: 0, wallet: 0 },
        };
        for (const node of document.querySelectorAll(
          "[data-payment-action-placement][data-payment-method]",
        )) {
          const method = node.getAttribute("data-payment-method");
          const kind =
            method === "paypal" || method === "paylater" || method === "card"
              ? method
              : "wallet";
          const bucket = getPaymentPlacementBucket(node);
          result[bucket][kind] += 1;
        }
        for (const node of document.querySelectorAll(
          ".delivery-express-action[data-delivery-express-source='minicart']",
        )) {
          const method = node.getAttribute("data-delivery-express-method");
          if (method === "paypal" || method === "paylater") {
            result.minicart[method] += 1;
          }
        }
        return result;
      }

      function getOfficialProviderNodes() {
        const createCounts = () => ({
          paypalButton: 0,
          payLaterButton: 0,
          cardHostedFields: 0,
        });
        const byPlacement = {
          checkoutSticky: createCounts(),
          desktopSummary: createCounts(),
          orderSheet: createCounts(),
          inlineCard: createCounts(),
          minicart: createCounts(),
          other: createCounts(),
        };
        const totals = createCounts();
        const selectors = [
          ["paypal-button", "paypalButton"],
          ["paypal-pay-later-button", "payLaterButton"],
          ["paypal-hosted-card-field", "cardHostedFields"],
        ];

        for (const [selector, key] of selectors) {
          for (const node of document.querySelectorAll(selector)) {
            totals[key] += 1;
            byPlacement[getPaymentPlacementBucket(node)][key] += 1;
          }
        }

        return { ...totals, byPlacement };
      }

      function getSelectedPaymentAction() {
        const selectedRow = document.querySelector(
          "[data-payment-method-row]:has(input:checked)",
        );
        const method = selectedRow?.getAttribute("data-payment-method-row");
        const placement =
          method === "card"
            ? document.querySelector(".checkout-choice__card-box")
            : (document.querySelector(".checkout-order-sheet__payment") ??
              (window.innerWidth <= 760
                ? document.querySelector(".checkout-sticky-summary__action")
                : document.querySelector(".checkout-summary__slot")));
        const wrapper = method
          ? placement?.querySelector(
              `[data-payment-action-placement][data-payment-method='${method}']`,
            )
          : null;
        const officialSelector =
          method === "paypal"
            ? "paypal-button"
            : method === "paylater"
              ? "paypal-pay-later-button"
              : method === "card"
                ? "paypal-hosted-card-field"
                : method === "apple_pay"
                  ? "apple-pay-button"
                  : method === "venmo"
                    ? "venmo-button"
                    : method === "google_pay"
                      ? ".wallet-checkout-action__google-pay-button"
                      : null;
        const official = officialSelector
          ? wrapper?.querySelector(officialSelector)
          : null;
        const wrapperRect = wrapper?.getBoundingClientRect() ?? null;
        const officialRect = official?.getBoundingClientRect() ?? null;
        const shadowControl = official?.shadowRoot?.querySelector(
          "button, [role='button'], iframe",
        );
        const controlRect = shadowControl?.getBoundingClientRect() ?? null;
        const providerScope = wrapper?.closest(".paypal-provider-scope");
        const runtimeScope = wrapper?.closest(
          "[data-paypal-sdk-runtime-status]",
        );
        const visible = Boolean(
          wrapperRect &&
          officialRect &&
          wrapperRect.width > 0 &&
          wrapperRect.height > 0 &&
          officialRect.width > 0 &&
          officialRect.height > 0 &&
          (method === "card" ||
            method === "google_pay" ||
            (controlRect && controlRect.width > 0 && controlRect.height > 0)),
        );

        return {
          method: method ?? null,
          providerStatus:
            providerScope?.getAttribute("data-paypal-sdk-status") ?? null,
          runtimeStatus:
            runtimeScope?.getAttribute("data-paypal-sdk-runtime-status") ??
            null,
          wrapperRect: wrapperRect ? toPlainRect(wrapperRect) : null,
          officialRect: officialRect ? toPlainRect(officialRect) : null,
          controlRect: controlRect ? toPlainRect(controlRect) : null,
          inViewport: Boolean(
            visible &&
            officialRect &&
            isVisible(officialRect) &&
            (method === "card" ||
              method === "google_pay" ||
              (controlRect && isVisible(controlRect))),
          ),
          visible,
        };
      }

      function getTouchTargets() {
        const selectors = [
          '[data-slot="dialog-close"]',
          ".auth-modal__password-toggle",
          ".minicart-item__quantity button",
          ".minicart-item__quantity input",
          ".checkout-modal__header button",
          ".checkout-modal__actions button",
          ".checkout-choice",
          ".checkout-order-sheet__handle",
          "paypal-button",
          "paypal-pay-later-button",
          "paypal-hosted-card-field",
          "apple-pay-button",
          "venmo-button",
          ".wallet-checkout-action__google-pay-button",
        ];
        const targets = [];

        for (const selector of selectors) {
          for (const element of document.querySelectorAll(selector)) {
            const rect = element.getBoundingClientRect();
            if (!isVisible(rect)) continue;
            const textLineTops = new Set();
            const textWalker = document.createTreeWalker(
              element,
              window.NodeFilter.SHOW_TEXT,
            );
            let textNode = textWalker.nextNode();
            while (textNode) {
              if (textNode.textContent?.trim()) {
                const range = document.createRange();
                range.selectNodeContents(textNode);
                for (const lineRect of range.getClientRects()) {
                  textLineTops.add(Math.round(lineRect.top));
                }
              }
              textNode = textWalker.nextNode();
            }
            targets.push({
              selector,
              name:
                element.getAttribute("aria-label") ??
                element.textContent?.trim().replace(/\s+/g, " ") ??
                "",
              rect: toPlainRect(rect),
              renderedLines: Math.max(1, textLineTops.size),
              meetsTouchTarget: rect.width >= 44 && rect.height >= 44,
            });
          }
        }

        return targets;
      }

      function getPaymentPlacementBucket(node) {
        return node.closest(".checkout-sticky-summary")
          ? "checkoutSticky"
          : node.closest(".checkout-summary__slot")
            ? "desktopSummary"
            : node.closest(".checkout-order-sheet")
              ? "orderSheet"
              : node.closest(
                    ".checkout-choice__card-box, .card-fields-checkout-action",
                  )
                ? "inlineCard"
                : node.closest(".minicart-shell")
                  ? "minicart"
                  : "other";
      }

      function getContrastSamples() {
        const targets = [
          { selector: '[data-slot="dialog-description"]', scope: "auth" },
          { selector: ".auth-modal__panel label", scope: "auth" },
          { selector: ".auth-modal__email-summary span", scope: "auth" },
          { selector: ".minicart-item__meta", scope: "minicart" },
          { selector: ".minicart-paylater p", scope: "minicart" },
          { selector: ".checkout-step p", scope: "checkout" },
          { selector: ".checkout-step__description", scope: "checkout" },
          { selector: ".checkout-choice small", scope: "checkout" },
          { selector: ".checkout-payment-readiness p", scope: "checkout" },
          { selector: ".checkout-trust-strip__item p", scope: "checkout" },
          {
            selector: ".checkout-sticky-summary__total > span",
            scope: "checkout",
          },
          {
            selector: ".checkout-sticky-summary__total > em",
            scope: "checkout",
          },
          { selector: ".checkout-order-sheet dt", scope: "checkout" },
          {
            selector: ".checkout-order-sheet .checkout-summary__item span",
            scope: "checkout",
          },
          { selector: ".checkout-summary__description", scope: "checkout" },
          { selector: ".checkout-store-card__route", scope: "pickup" },
          {
            selector: ".checkout-store-card__inventory-status",
            scope: "pickup",
          },
        ];
        const elements = new Map();
        for (const target of targets) {
          for (const element of document.querySelectorAll(target.selector)) {
            if (!elements.has(element)) elements.set(element, target);
          }
        }

        return [...elements.entries()]
          .filter(([element]) => {
            const rect = element.getBoundingClientRect();
            return element.textContent?.trim() && isVisible(rect);
          })
          .map(([element, target]) => {
            const foreground = parseCssColor(getComputedStyle(element).color);
            const background = findOpaqueBackground(element);
            if (!foreground || !background) return null;
            return {
              selector: target.selector,
              scope: target.scope,
              text: element.textContent
                ?.trim()
                .replace(/\s+/g, " ")
                .slice(0, 80),
              foreground: foreground?.css ?? null,
              background: background?.css ?? null,
              ratio: contrastRatio(foreground.rgb, background.rgb),
            };
          })
          .filter(Boolean);
      }

      function findOpaqueBackground(element) {
        let current = element;
        while (current) {
          const parsed = parseCssColor(
            getComputedStyle(current).backgroundColor,
          );
          if (parsed && parsed.alpha >= 0.95) {
            return parsed;
          }
          current = current.parentElement;
        }
        return { css: "rgb(255, 255, 255)", rgb: [255, 255, 255], alpha: 1 };
      }

      function parseCssColor(value) {
        const srgbMatch = value.match(
          /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/,
        );
        if (srgbMatch) {
          const alphaValue = srgbMatch[4] ?? "1";
          return {
            css: value,
            rgb: srgbMatch.slice(1, 4).map((channel) => Number(channel) * 255),
            alpha: alphaValue.endsWith("%")
              ? Number.parseFloat(alphaValue) / 100
              : Number.parseFloat(alphaValue),
          };
        }
        const match = value.match(
          /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/,
        );
        if (!match) {
          const canvas = document.createElement("canvas");
          canvas.width = 1;
          canvas.height = 1;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          context.clearRect(0, 0, 1, 1);
          context.fillStyle = value;
          context.fillRect(0, 0, 1, 1);
          const [red, green, blue, alpha] = context.getImageData(
            0,
            0,
            1,
            1,
          ).data;
          return {
            css: value,
            rgb: [red, green, blue],
            alpha: alpha / 255,
          };
        }
        const alphaValue = match[4] ?? "1";
        const alpha = alphaValue.endsWith("%")
          ? Number.parseFloat(alphaValue) / 100
          : Number.parseFloat(alphaValue);
        return {
          css: value,
          rgb: match.slice(1, 4).map(Number),
          alpha,
        };
      }

      function contrastRatio(foreground, background) {
        const foregroundLuminance = relativeLuminance(foreground);
        const backgroundLuminance = relativeLuminance(background);
        const lighter = Math.max(foregroundLuminance, backgroundLuminance);
        const darker = Math.min(foregroundLuminance, backgroundLuminance);
        return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
      }

      function relativeLuminance(rgb) {
        const channels = rgb.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      }
    });
  }
}

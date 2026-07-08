/* eslint-disable @typescript-eslint/no-unused-vars */
/* global document, process, window */
async function round3CheckoutPickupDrawerEvidence(page) {
  const envBaseUrl =
    typeof process !== "undefined"
      ? process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL
      : undefined;
  const currentUrl = page.url();
  const currentOrigin = currentUrl.match(/^https?:\/\/[^/]+/)?.[0] ?? null;
  const baseUrl =
    envBaseUrl ??
    (currentOrigin && /\/(cart|checkout)(?:[/?#]|$)/.test(currentUrl)
      ? currentOrigin
      : "http://127.0.0.1:5173");
  const outputScope =
    baseUrl === "https://retail-demo.onrender.com" ? "hosted" : "local";
  const outputPrefix = `/private/tmp/paypal-retail-round3-${outputScope}-checkout-pickup-drawer-evidence`;
  const consoleEntries = [];
  const responseIssues = [];
  const createOrderRequests = [];
  const viewportForWidth = (width) => ({
    width,
    height: width < 768 ? 844 : 900,
  });
  const pickupPickerOpenRows = [
    { rowId: "pickup-picker-open-320", width: 320 },
    { rowId: "pickup-picker-open-390", width: 390 },
    { rowId: "pickup-picker-open-414", width: 414 },
    { rowId: "pickup-picker-open-1440", width: 1440 },
  ];
  const paymentMethods = [
    {
      label: "PayPal",
      method: "paypal",
      readyText: "PayPal payment button ready.",
      rowId: "checkout-selected-paypal-390",
      expandedRowId: "checkout-expanded-order-details-390",
      stickyProvider: "paypal",
    },
    {
      label: "Pay Later",
      method: "paylater",
      readyText: "Pay Later payment option ready.",
      rowId: "checkout-selected-paylater-390",
      expandedRowId: "checkout-expanded-paylater-390",
      stickyProvider: "paylater",
    },
    {
      label: "Apple Pay",
      method: "apple_pay",
      readyText: "Apple Pay payment option",
      rowId: "checkout-selected-apple-pay-390",
      expandedRowId: "checkout-expanded-apple-pay-390",
      stickyProvider: "wallet",
    },
    {
      label: "Google Pay",
      method: "google_pay",
      readyText: "Google Pay payment option",
      rowId: "checkout-selected-google-pay-390",
      expandedRowId: "checkout-expanded-google-pay-390",
      stickyProvider: "wallet",
    },
    {
      label: "Venmo",
      method: "venmo",
      readyText: "Venmo payment option",
      rowId: "checkout-selected-venmo-390",
      expandedRowId: "checkout-expanded-venmo-390",
      stickyProvider: "wallet",
    },
  ];

  const onConsole = (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  };
  const onResponse = (response) => {
    if (response.status() >= 400) {
      responseIssues.push({
        status: response.status(),
        url: response.url(),
      });
    }
  };
  const onRequest = (request) => {
    const url = request.url();

    if (
      url.includes("/api/paypal/orders/delivery") ||
      url.includes("/api/paypal/orders/bopis")
    ) {
      createOrderRequests.push({
        method: request.method(),
        url,
        postData: request.postData(),
      });
    }
  };

  page.on("console", onConsole);
  page.on("response", onResponse);
  page.on("request", onRequest);

  try {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    const deployment = await inspectDeployment();
    const rows = [];

    for (const { rowId, width } of pickupPickerOpenRows) {
      await setViewport(width);
      rows.push(
        await openPickupPickerAndCollect({
          rowId,
          assertions: {
            requireCheckoutStatus: true,
            requirePickupPicker: true,
          },
        }),
      );
    }

    await setViewport(390);
    await openPickupPicker();
    rows.push(
      await collectRow({
        rowId: "pickup-picker-cancel-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("button", { name: "Cancel" }).click();
          await page
            .locator("#pickup-location-zip-or-postcode")
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Pickup location", "Find pickup stores"],
        assertions: {
          requireCheckoutStatus: true,
          requireNoPickupPicker: true,
          requirePickupLocationEditing: true,
          requireNoInlineStoreCards: true,
        },
      }),
    );

    await openPickupPicker();
    rows.push(
      await collectRow({
        rowId: "pickup-picker-confirm-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await commitPickupStoreSelection();
        }),
        expectedText: ["Store selection", "Billing address"],
        assertions: {
          requireCheckoutStatus: true,
          requireNoPickupPicker: true,
          requireNoStoreContinue: true,
          requirePickupBillingActive: true,
        },
      }),
    );

    rows.push(
      await collectRow({
        rowId: "preselected-pickup-store-summary-390",
        route: "/checkout",
        checkpoint: markCheckpoint(),
        expectedText: ["Store selection", "Billing address"],
        assertions: {
          requireCheckoutStatus: true,
          requireNoStoreContinue: true,
          requirePickupBillingActive: true,
        },
      }),
    );

    await openFreshRoute("/checkout");
    await advanceDeliveryCheckoutToBilling();
    rows.push(
      await collectRow({
        rowId: "delivery-billing-latency-390",
        route: "/checkout",
        checkpoint: await runTimedAction(async () => {
          await page
            .getByRole("button", { name: "Save billing address" })
            .click();
          await page
            .getByRole("button", { name: "Submit shipping option" })
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: ["Shipping options", "Standard Delivery"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireBillingLatency: true,
        },
      }),
    );

    await openFreshRoute("/checkout");
    await advanceDeliveryCheckoutToBilling();
    await page.route("**/api/checkout/drafts/**/billing-address**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: "round3_billing_failure_evidence",
        }),
      }),
    );
    rows.push(
      await collectRow({
        rowId: "delivery-billing-failure-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Save billing address" })
            .click();
          await page
            .getByText("We could not save Billing address. Please try again.")
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: [
          "Billing address",
          "We could not save Billing address. Please try again.",
        ],
        assertions: {
          allowInterceptedBillingFailure: true,
          requireCheckoutStatus: true,
          requireBillingFailureState: true,
          requireNoProviderNodes: true,
        },
      }),
    );
    await page.unroute("**/api/checkout/drafts/**/billing-address**");

    await openFreshRoute("/checkout");
    await advanceDeliveryCheckoutToPayment();
    rows.push(
      await collectRow({
        rowId: "checkout-payment-ready-no-method-390",
        route: "/checkout",
        checkpoint: markCheckpoint(),
        expectedText: [
          "Payment method",
          "PayPal",
          "Pay Later",
          "Credit or debit card",
        ],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireNoProviderNodes: true,
          requirePromoDiscountWhenAvailable: true,
        },
      }),
    );

    for (const methodConfig of paymentMethods) {
      rows.push(await selectPaymentMethodAndCollect(methodConfig));
      rows.push(await expandOrderDetailsAndCollect(methodConfig));
      await closeOrderDetailsWithEscape();
    }

    rows.push(
      await collectRow({
        rowId: "checkout-collapsed-order-details-390",
        route: "/checkout",
        checkpoint: markCheckpoint(),
        expectedText: ["Payment method"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireNoOrderSheet: true,
          requirePassiveDrawerTrigger: true,
        },
      }),
    );

    rows.push(
      await collectRow({
        rowId: "checkout-selected-card-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await selectPaymentChoice("card");
          await page
            .getByText("Card payment fields ready.")
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: ["Card payment fields ready.", "Pay by card"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireInlineCardProvider: true,
          requireNoCheckoutStickyProvider: true,
        },
      }),
    );

    assertCrossRowActionParity(rows, "collapsed", [
      "checkout-selected-paypal-390",
      "checkout-selected-paylater-390",
      "checkout-selected-apple-pay-390",
      "checkout-selected-google-pay-390",
      "checkout-selected-venmo-390",
    ]);
    assertCrossRowActionParity(rows, "expanded", [
      "checkout-expanded-order-details-390",
      "checkout-expanded-paylater-390",
      "checkout-expanded-apple-pay-390",
      "checkout-expanded-google-pay-390",
      "checkout-expanded-venmo-390",
    ]);

    const failedRows = rows
      .filter((row) => row.failures.length > 0)
      .map((row) => ({
        rowId: row.rowId,
        failures: row.failures,
      }));

    if (failedRows.length > 0) {
      throw new Error(
        `Round 3 checkout pickup drawer evidence failed: ${JSON.stringify(
          failedRows,
        )}`,
      );
    }

    return {
      baseUrl,
      outputPrefix,
      deployment,
      rows,
      summary: {
        rowCount: rows.length,
        failedRows,
      },
    };

    async function inspectDeployment() {
      await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
      });
      await page
        .waitForLoadState("networkidle", {
          timeout: 20000,
        })
        .catch(() => undefined);

      return await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        assets: [...document.querySelectorAll("script[src], link[href]")].map(
          (node) => node.getAttribute("src") ?? node.getAttribute("href") ?? "",
        ),
      }));
    }

    async function setViewport(width) {
      await page.setViewportSize(viewportForWidth(width));
    }

    async function openFreshRoute(route) {
      await page.context().clearCookies();
      const checkpoint = markCheckpoint();
      await page.goto(`${baseUrl}${route}`, {
        waitUntil: "domcontentloaded",
      });
      await page
        .waitForLoadState("networkidle", {
          timeout: 20000,
        })
        .catch(() => undefined);
      await page.waitForFunction(
        () => {
          const isCheckoutEvidenceReady = () => {
            const bodyText = document.body.innerText;
            const hasCheckoutShell =
              bodyText.includes("Secure checkout") ||
              Boolean(document.querySelector(".checkout-status"));
            const hasCheckoutAction = [
              ...document.querySelectorAll("button"),
            ].some((button) =>
              /Submit shipping address|Save billing address|Submit shipping option|Find pickup stores/.test(
                button.textContent ?? "",
              ),
            );
            const hasCheckoutInput = Boolean(
              document.querySelector(
                "#shipping-address-first-name, #pickup-location-zip-or-postcode",
              ),
            );

            return hasCheckoutShell && (hasCheckoutAction || hasCheckoutInput);
          };

          return isCheckoutEvidenceReady();
        },
        { timeout: 20000 },
      );

      return checkpoint;
    }

    async function openPickupPickerAndCollect({ rowId, assertions }) {
      await openPickupPicker();

      return await collectRow({
        rowId,
        route: "/checkout",
        checkpoint: markCheckpoint(),
        expectedText: ["Choose pickup store"],
        assertions,
      });
    }

    async function openPickupPicker() {
      await openFreshRoute("/checkout");
      await page.getByRole("tab", { name: "Pickup" }).click();
      await page
        .locator("#pickup-location-zip-or-postcode")
        .waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#pickup-location-zip-or-postcode").fill("19720");
      await page.getByRole("button", { name: "Find pickup stores" }).click();
      await page
        .getByRole("dialog", { name: "Choose pickup store" })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    async function commitPickupStoreSelection() {
      await page
        .getByRole("button", {
          name: /Use selected store|Select this store/,
        })
        .first()
        .click();

      const confirmButton = page.getByRole("button", {
        name: "Confirm pickup store",
      });

      try {
        await confirmButton.waitFor({ state: "visible", timeout: 1500 });
        await confirmButton.click();
      } catch {
        // Some deployed builds commit immediately when a store card is chosen.
      }

      await page
        .getByRole("button", { name: "Save billing address" })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    async function fillShippingAddress() {
      await page.locator("#shipping-address-first-name").fill("Taylor");
      await page.locator("#shipping-address-last-name").fill("Chen");
      await page
        .locator("#shipping-address-street-address")
        .fill("88 Spring Street");
      await page
        .locator("#shipping-address-apt-suite-or-building")
        .fill("Apt 5B");
      await page.locator("#shipping-address-city").fill("New York");
      await page.locator("#shipping-address-zip-code").fill("10012");
      await page
        .locator("#shipping-address-phone-number")
        .fill("(212) 555-0188");
    }

    async function advanceDeliveryCheckoutToBilling() {
      await fillShippingAddress();
      await page
        .getByRole("button", { name: "Submit shipping address" })
        .click();
      await page
        .getByRole("button", { name: "Save billing address" })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    async function advanceDeliveryCheckoutToPayment() {
      await advanceDeliveryCheckoutToBilling();
      await page.getByRole("button", { name: "Save billing address" }).click();
      await page
        .getByRole("button", { name: "Submit shipping option" })
        .waitFor({ state: "visible", timeout: 20000 });
      await page
        .getByRole("button", { name: "Submit shipping option" })
        .click();
      await page
        .locator("[data-payment-method-row='paypal'] input")
        .waitFor({ state: "visible", timeout: 20000 });
    }

    async function selectPaymentMethodAndCollect(methodConfig) {
      return await collectRow({
        rowId: methodConfig.rowId,
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await selectPaymentChoice(methodConfig.method);
          await page
            .getByText(methodConfig.readyText)
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: [methodConfig.readyText],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requirePassiveDrawerTrigger: true,
          requireCheckoutStickyProvider: methodConfig.stickyProvider,
          requireSelectedActionRect: "collapsed",
        },
      });
    }

    async function expandOrderDetailsAndCollect(methodConfig) {
      return await collectRow({
        rowId: methodConfig.expandedRowId,
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Review order details" })
            .click();
          await page
            .getByRole("button", { name: "Close order details" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Order details", methodConfig.readyText],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireOrderSheet: true,
          requireOrderSheetProvider: methodConfig.stickyProvider,
          requireSelectedActionRect: "expanded",
        },
      });
    }

    async function closeOrderDetailsWithEscape() {
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Review order details" })
        .waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(200);
    }

    async function selectPaymentChoice(method) {
      await page.locator(`[data-payment-method-row='${method}'] input`).click();
    }

    async function runAction(action) {
      const checkpoint = markCheckpoint();
      await action();
      await page.waitForTimeout(400);

      return checkpoint;
    }

    async function runTimedAction(action) {
      const checkpoint = markCheckpoint();
      const start = Date.now();
      await action();
      checkpoint.billingTransitionMs = Date.now() - start;
      await page.waitForTimeout(400);

      return checkpoint;
    }

    function markCheckpoint() {
      return {
        billingTransitionMs: null,
        consoleStart: consoleEntries.length,
        responseStart: responseIssues.length,
        requestStart: createOrderRequests.length,
        callbackStart: countCreateOrderCallbacks(consoleEntries),
      };
    }

    async function collectRow({
      rowId,
      route,
      checkpoint,
      expectedText,
      assertions = {},
    }) {
      const viewport = page.viewportSize();
      const screenshotPath = `${outputPrefix}-${rowId}.png`;
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      const metrics = await page.evaluate(() => {
        const stickySummary = document.querySelector(
          ".checkout-sticky-summary",
        );
        const stickyRect = stickySummary?.getBoundingClientRect() ?? null;
        const drawerTrigger = document.querySelector(
          ".checkout-sticky-summary__review",
        );
        const grabber = document.querySelector(
          ".checkout-sticky-summary__grabber",
        );
        const orderSheet = document.querySelector(".checkout-order-sheet");
        const orderSheetHandle = document.querySelector(
          ".checkout-order-sheet__handle",
        );
        const modal = document.querySelector(".checkout-modal");
        const modalPanel = document.querySelector(".checkout-modal__panel");
        const header = document.querySelector(".site-header");
        const activeElement = document.activeElement;
        const selectedProviderRects = getSelectedProviderRects();
        const trackedTargets = [
          ...document.querySelectorAll(
            [
              ".checkout-modal__panel",
              ".checkout-step",
              ".checkout-step [role='alert']",
              ".checkout-step__body input",
              ".checkout-step__body button",
              ".checkout-summary",
              ".checkout-summary__slot",
              ".checkout-card-action",
              ".card-fields-checkout-action",
              ".checkout-order-sheet",
              ".checkout-order-sheet__handle",
              ".checkout-order-sheet__payment",
              ".checkout-sticky-summary__action",
              ".site-footer__newsletter",
              ".site-footer__links a",
              ".site-footer__support",
              ".site-footer__payment",
              "paypal-message",
              "paypal-button",
              "paypal-pay-later-button",
              "apple-pay-button",
              "venmo-button",
              ".wallet-checkout-action__google-pay-button",
            ].join(","),
          ),
        ];
        const stickyOverlapTargets = trackedTargets
          .map((target) => {
            const rect = target.getBoundingClientRect();
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              rect.bottom >= 0 &&
              rect.top <= window.innerHeight;
            const insideSticky = stickySummary
              ? stickySummary === target || stickySummary.contains(target)
              : false;
            const occludedBySticky = Boolean(
              visible &&
              stickyRect &&
              !insideSticky &&
              intersects(stickyRect, rect) &&
              stickyOwnsPoint(stickySummary, rect),
            );

            return {
              tag: target.tagName.toLowerCase(),
              className:
                typeof target.className === "string" ? target.className : "",
              ariaLabel: target.getAttribute("aria-label"),
              text: target.textContent
                ?.trim()
                .replace(/\s+/g, " ")
                .slice(0, 100),
              rect: toPlainRect(rect),
              visible,
              insideSticky,
              occludedBySticky,
            };
          })
          .filter((target) => target.visible);

        return {
          url: window.location.href,
          pageTitle: document.title,
          bodyText: document.body.innerText,
          horizontalOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
          checkoutStatusPresent: Boolean(
            document.querySelector(".checkout-status"),
          ),
          checkoutHeroPresent: Boolean(
            document.querySelector(".checkout-hero"),
          ),
          summaryPresent: Boolean(document.querySelector(".checkout-summary")),
          pickupPickerOpen: isVisible(modal),
          pickupLocationEditing: isVisible(
            document.querySelector("#pickup-location-zip-or-postcode"),
          ),
          pickupBillingActive: isVisible(
            [...document.querySelectorAll(".checkout-step")]
              .find((step) => step.textContent?.includes("Billing address"))
              ?.querySelector("button"),
          ),
          inlineStoreCardCount: [
            ...document.querySelectorAll(
              ".checkout-store-grid:not(.checkout-store-grid--modal) [data-pickup-store-ticket='true']",
            ),
          ].filter(isVisible).length,
          modalStoreCardCount: [
            ...document.querySelectorAll(
              ".checkout-store-grid--modal [data-pickup-store-ticket='true']",
            ),
          ].filter(isVisible).length,
          pickerHeaderOverlap: Boolean(
            modalPanel &&
            header &&
            intersects(
              modalPanel.getBoundingClientRect(),
              header.getBoundingClientRect(),
            ),
          ),
          storeSummaryHasContinue: document.body.innerText.includes(
            "Continue with this store",
          ),
          summaryLabels: getSummaryLabels(),
          sticky: stickySummary
            ? {
                text: stickySummary.textContent?.trim().replace(/\s+/g, " "),
                rect: toPlainRect(stickySummary.getBoundingClientRect()),
              }
            : null,
          drawerTrigger: drawerTrigger
            ? {
                ariaControls: drawerTrigger.getAttribute("aria-controls"),
                ariaExpanded: drawerTrigger.getAttribute("aria-expanded"),
                ariaLabel: drawerTrigger.getAttribute("aria-label"),
                rect: toPlainRect(drawerTrigger.getBoundingClientRect()),
              }
            : null,
          grabber: grabber
            ? {
                pointerEvents: window.getComputedStyle(grabber).pointerEvents,
                rect: toPlainRect(grabber.getBoundingClientRect()),
              }
            : null,
          orderSheet: orderSheet
            ? {
                text: orderSheet.textContent?.trim().replace(/\s+/g, " "),
                rect: toPlainRect(orderSheet.getBoundingClientRect()),
              }
            : null,
          orderSheetHandle: orderSheetHandle
            ? {
                ariaLabel: orderSheetHandle.getAttribute("aria-label"),
                rect: toPlainRect(orderSheetHandle.getBoundingClientRect()),
              }
            : null,
          providerCounts: getProviderCounts(),
          selectedProviderRects,
          focusedElement: activeElement
            ? {
                tag: activeElement.tagName.toLowerCase(),
                id: activeElement.id,
                className:
                  typeof activeElement.className === "string"
                    ? activeElement.className
                    : "",
                ariaLabel: activeElement.getAttribute("aria-label"),
                text: activeElement.textContent
                  ?.trim()
                  .replace(/\s+/g, " ")
                  .slice(0, 100),
                rect: toPlainRect(activeElement.getBoundingClientRect()),
              }
            : null,
          stickyOverlapTargets,
          occludedByStickyCount: stickyOverlapTargets.filter(
            (target) => target.occludedBySticky,
          ).length,
        };

        function getSelectedProviderRects() {
          const slots = [
            [".checkout-summary__slot", "desktopSummary"],
            [".checkout-sticky-summary__action", "collapsed"],
            [".checkout-order-sheet__payment", "expanded"],
            [".checkout-choice__card-box", "inlineCard"],
          ];

          return slots.flatMap(([selector, surface]) =>
            [...document.querySelectorAll(selector)]
              .filter(isVisible)
              .map((slot) => {
                const action =
                  slot.querySelector(
                    [
                      ".paypal-standalone-action",
                      ".paylater-standalone-action",
                      ".wallet-checkout-action",
                      ".card-fields-checkout-action",
                      ".checkout-sticky-summary__choose-payment",
                    ].join(","),
                  ) ?? slot.firstElementChild;
                const customElement = action?.querySelector(
                  [
                    "paypal-button",
                    "paypal-pay-later-button",
                    "apple-pay-button",
                    "venmo-button",
                    ".wallet-checkout-action__google-pay-button",
                    ".card-fields-checkout-action__submit",
                  ].join(","),
                );

                return {
                  surface,
                  method:
                    action?.getAttribute("data-payment-method") ??
                    action?.getAttribute("data-wallet-method") ??
                    action
                      ?.querySelector("[data-payment-method]")
                      ?.getAttribute("data-payment-method") ??
                    action
                      ?.querySelector("[data-wallet-method]")
                      ?.getAttribute("data-wallet-method") ??
                    action?.className ??
                    "unknown",
                  slotRect: toPlainRect(slot.getBoundingClientRect()),
                  actionRect: action
                    ? toPlainRect(action.getBoundingClientRect())
                    : null,
                  customRect: customElement
                    ? toPlainRect(customElement.getBoundingClientRect())
                    : null,
                  text: slot.textContent?.trim().replace(/\s+/g, " "),
                };
              }),
          );
        }

        function getSummaryLabels() {
          const labels = {};
          for (const row of document.querySelectorAll(
            ".checkout-summary dl div, .checkout-order-sheet dl div",
          )) {
            const term = row.querySelector("dt")?.textContent?.trim();
            const value = row.querySelector("dd")?.textContent?.trim();

            if (term && value) {
              labels[term] = value;
            }
          }

          return labels;
        }

        function getProviderCounts() {
          const result = {
            checkoutSticky: createProviderBucket(),
            orderSheet: createProviderBucket(),
            inlineCard: createProviderBucket(),
            messageOnly: createProviderBucket(),
            other: createProviderBucket(),
          };
          const nodes = [
            ...document.querySelectorAll(
              [
                "[data-payment-method]",
                "[data-wallet-method]",
                "paypal-button",
                "paypal-pay-later-button",
                "paypal-message",
                "apple-pay-button",
                "venmo-button",
                ".wallet-checkout-action__google-pay-button",
                ".paypal-provider-scope",
              ].join(","),
            ),
          ];

          for (const node of nodes) {
            const surface = getProviderSurface(node);
            const type = getProviderType(node);
            result[surface].total += 1;
            result[surface][type] += 1;
          }

          return result;
        }

        function createProviderBucket() {
          return {
            total: 0,
            paypal: 0,
            paylater: 0,
            card: 0,
            wallet: 0,
            message: 0,
            providerScope: 0,
            unknown: 0,
          };
        }

        function getProviderSurface(node) {
          if (node.closest(".checkout-sticky-summary")) {
            return "checkoutSticky";
          }

          if (node.closest(".checkout-order-sheet")) {
            return "orderSheet";
          }

          if (
            node.closest(".checkout-card-action, .card-fields-checkout-action")
          ) {
            return "inlineCard";
          }

          if (node.tagName.toLowerCase() === "paypal-message") {
            return "messageOnly";
          }

          return "other";
        }

        function getProviderType(node) {
          const tagName = node.tagName.toLowerCase();
          const method =
            node.getAttribute("data-payment-method") ??
            node.getAttribute("data-wallet-method");

          if (tagName === "paypal-message") {
            return "message";
          }

          if (node.classList.contains("paypal-provider-scope")) {
            return "providerScope";
          }

          if (method === "paypal" || tagName === "paypal-button") {
            return "paypal";
          }

          if (method === "paylater" || tagName === "paypal-pay-later-button") {
            return "paylater";
          }

          if (method === "card") {
            return "card";
          }

          if (
            method === "apple_pay" ||
            method === "google_pay" ||
            method === "venmo" ||
            tagName === "apple-pay-button" ||
            tagName === "venmo-button" ||
            node.classList.contains("wallet-checkout-action__google-pay-button")
          ) {
            return "wallet";
          }

          return "unknown";
        }

        function isVisible(element) {
          if (!element) {
            return false;
          }

          const rect = element.getBoundingClientRect();

          return rect.width > 0 && rect.height > 0;
        }

        function stickyOwnsPoint(sticky, rect) {
          if (!sticky) {
            return false;
          }

          const points = [
            [rect.left + rect.width / 2, rect.top + rect.height / 2],
            [
              rect.left + rect.width / 2,
              Math.max(rect.top + 1, rect.bottom - 4),
            ],
          ];

          return points.some(([x, y]) => {
            const topElement = document.elementFromPoint(
              Math.min(Math.max(x, 0), window.innerWidth - 1),
              Math.min(Math.max(y, 0), window.innerHeight - 1),
            );

            return Boolean(topElement && sticky.contains(topElement));
          });
        }

        function intersects(left, right) {
          return !(
            left.right <= right.left ||
            left.left >= right.right ||
            left.bottom <= right.top ||
            left.top >= right.bottom
          );
        }

        function toPlainRect(rect) {
          return {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            left: Math.round(rect.left),
          };
        }
      });
      const rowConsole = consoleEntries.slice(checkpoint.consoleStart);
      const rowResponses = responseIssues.slice(checkpoint.responseStart);
      const rowRequests = createOrderRequests.slice(checkpoint.requestStart);
      const callbackEntries = consoleEntries
        .slice(checkpoint.consoleStart)
        .filter((entry) =>
          /PayPal order created|Pay Later order created/.test(entry.text),
        );
      const failures = [];

      assertGenericRow({
        rowId,
        metrics,
        rowConsole,
        rowResponses,
        rowRequests,
        callbackEntries,
        expectedText,
        assertions,
        failures,
        checkpoint,
      });

      return {
        rowId,
        route,
        viewport,
        screenshotPath,
        console: summarizeConsole(rowConsole),
        responseIssues: rowResponses,
        createOrderRequests: {
          baseline: checkpoint.requestStart,
          delta: rowRequests.length,
          cumulative: createOrderRequests.length,
          requests: rowRequests,
        },
        createOrderCallbacks: {
          baseline: checkpoint.callbackStart,
          delta: callbackEntries.length,
          cumulative: countCreateOrderCallbacks(consoleEntries),
          entries: callbackEntries,
        },
        metrics: {
          ...metrics,
          billingTransitionMs: checkpoint.billingTransitionMs,
        },
        failures,
      };
    }

    function assertGenericRow({
      rowId,
      metrics,
      rowConsole,
      rowResponses,
      rowRequests,
      callbackEntries,
      expectedText,
      assertions,
      failures,
      checkpoint,
    }) {
      if (metrics.horizontalOverflow > 0) {
        failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
      }

      for (const expected of expectedText ?? []) {
        assertContains(metrics.bodyText, expected, failures);
      }

      const unexpectedConsole = rowConsole.filter(
        (entry) =>
          (entry.type === "error" || entry.type === "warning") &&
          !isAllowedConsoleEntry(entry, assertions),
      );
      const unexpectedResponses = rowResponses.filter(
        (response) => !isAllowedResponseIssue(response, assertions),
      );

      if (unexpectedConsole.length > 0) {
        failures.push(
          `unexpected console warnings/errors: ${unexpectedConsole
            .map((entry) => `${entry.type}:${entry.text}`.slice(0, 120))
            .join(" | ")}`,
        );
      }

      if (unexpectedResponses.length > 0) {
        failures.push(
          `unexpected 4xx/5xx responses: ${unexpectedResponses
            .map((response) =>
              `${response.status}:${response.url}`.slice(0, 140),
            )
            .join(" | ")}`,
        );
      }

      if (rowRequests.length !== 0) {
        failures.push(
          `expected zero create-order requests, saw ${rowRequests.length}`,
        );
      }

      if (callbackEntries.length !== 0) {
        failures.push(
          `expected zero create-order callbacks, saw ${callbackEntries.length}`,
        );
      }

      if (metrics.occludedByStickyCount > 0) {
        failures.push(
          `sticky occluded ${metrics.occludedByStickyCount} independent targets`,
        );
      }

      if (assertions.requireCheckoutStatus) {
        if (!metrics.checkoutStatusPresent) {
          failures.push("missing compact checkout-status marker");
        }

        if (metrics.checkoutHeroPresent) {
          failures.push("legacy checkout-hero marker still present");
        }
      }

      if (assertions.requireSticky) {
        assertSticky(metrics, failures);
      }

      if (
        assertions.requireNoProviderNodes &&
        countProviderTotal(metrics.providerCounts) !== 0
      ) {
        failures.push(
          `expected zero provider nodes, saw ${countProviderTotal(metrics.providerCounts)}`,
        );
      }

      if (assertions.requirePickupPicker) {
        if (!metrics.pickupPickerOpen) {
          failures.push("expected pickup store picker dialog");
        }

        if (metrics.modalStoreCardCount === 0) {
          failures.push("expected store cards in pickup picker dialog");
        }

        if (metrics.pickerHeaderOverlap) {
          failures.push("pickup picker panel overlaps sticky header");
        }
      }

      if (assertions.requireNoPickupPicker && metrics.pickupPickerOpen) {
        failures.push("expected pickup store picker dialog to be closed");
      }

      if (
        assertions.requirePickupLocationEditing &&
        !metrics.pickupLocationEditing
      ) {
        failures.push("expected cancel fallback to reopen Pickup location");
      }

      if (
        assertions.requireNoInlineStoreCards &&
        metrics.inlineStoreCardCount
      ) {
        failures.push(
          `expected no inline pickup store cards, saw ${metrics.inlineStoreCardCount}`,
        );
      }

      if (
        assertions.requireNoStoreContinue &&
        metrics.storeSummaryHasContinue
      ) {
        failures.push("redundant Continue with this store action is visible");
      }

      if (
        assertions.requirePickupBillingActive &&
        !metrics.pickupBillingActive
      ) {
        failures.push("expected Pickup billing address to be active");
      }

      if (assertions.requireBillingLatency) {
        const billingTransitionMs = checkpoint.billingTransitionMs;

        if (typeof billingTransitionMs !== "number") {
          failures.push("missing billingTransitionMs metric");
        } else if (billingTransitionMs > 250) {
          failures.push(
            `billing transition exceeded 250ms target: ${billingTransitionMs}ms`,
          );
        }
      }

      if (assertions.requireBillingFailureState) {
        if (
          metrics.focusedElement?.tag !== "button" ||
          !/Save billing address/.test(metrics.focusedElement?.text ?? "")
        ) {
          failures.push("expected focus to return to Save billing address");
        }
      }

      if (assertions.requireCheckoutStickyProvider) {
        const bucket = metrics.providerCounts.checkoutSticky;
        const provider = assertions.requireCheckoutStickyProvider;

        if (bucket.total === 0 || bucket[provider] === 0) {
          failures.push(
            `expected ${provider} provider in checkout sticky surface`,
          );
        }
      }

      if (assertions.requireNoCheckoutStickyProvider) {
        const bucket = metrics.providerCounts.checkoutSticky;

        if (bucket.total !== 0) {
          failures.push(
            `expected zero checkout sticky provider nodes, saw ${bucket.total}`,
          );
        }
      }

      if (assertions.requireOrderSheet) {
        if (!metrics.orderSheet) {
          failures.push("expected order details sheet to be open");
        }

        if (
          !metrics.orderSheetHandle ||
          metrics.orderSheetHandle.rect.height < 44
        ) {
          failures.push(
            "expected order sheet close handle to be at least 44px high",
          );
        }
      }

      if (assertions.requireNoOrderSheet && metrics.orderSheet) {
        failures.push("expected order details sheet to be closed");
      }

      if (assertions.requireOrderSheetProvider) {
        const bucket = metrics.providerCounts.orderSheet;
        const provider = assertions.requireOrderSheetProvider;

        if (bucket.total === 0 || bucket[provider] === 0) {
          failures.push(`expected ${provider} provider in order details sheet`);
        }
      }

      if (assertions.requireSelectedActionRect) {
        const rect = getActionRect(
          metrics,
          assertions.requireSelectedActionRect,
        );

        if (!rect) {
          failures.push(
            `missing ${assertions.requireSelectedActionRect} selected payment action rect`,
          );
        } else {
          if (rect.actionRect.width < 150 || rect.actionRect.height < 52) {
            failures.push(
              `${assertions.requireSelectedActionRect} action rect too small: ${rect.actionRect.width}x${rect.actionRect.height}`,
            );
          }

          if (
            Math.abs(rect.actionRect.width - rect.slotRect.width) > 2 ||
            rect.actionRect.height < 52
          ) {
            failures.push(
              `${assertions.requireSelectedActionRect} provider action does not fill its merchant slot`,
            );
          }
        }
      }

      if (assertions.requirePassiveDrawerTrigger) {
        assertPassiveDrawerTrigger(metrics, failures);
      }

      if (assertions.requireInlineCardProvider) {
        const bucket = metrics.providerCounts.inlineCard;

        if (bucket.card === 0) {
          failures.push("expected card provider to stay inline");
        }
      }

      if (assertions.requirePromoDiscountWhenAvailable) {
        const promoLabel = metrics.summaryLabels.Promo ?? metrics.bodyText;

        if (
          /No promo applied/.test(promoLabel) &&
          metrics.bodyText.includes("AUTO10")
        ) {
          failures.push("promo code visible without signed discount amount");
        }
      }
    }

    function assertSticky(metrics, failures) {
      if (!metrics.sticky) {
        failures.push("expected checkout sticky summary");
        return;
      }

      assertPassiveDrawerTrigger(metrics, failures);
    }

    function assertPassiveDrawerTrigger(metrics, failures) {
      if (!metrics.drawerTrigger) {
        failures.push("expected checkout sticky drawer trigger");
        return;
      }

      if (
        metrics.drawerTrigger.ariaControls !== "checkout-order-details-sheet"
      ) {
        failures.push(
          "drawer trigger aria-controls does not target order details sheet",
        );
      }

      if (metrics.drawerTrigger.ariaLabel !== "Review order details") {
        failures.push("drawer trigger accessible name changed");
      }

      if (
        metrics.drawerTrigger.rect.height < 44 ||
        metrics.drawerTrigger.rect.width < 44
      ) {
        failures.push(
          `drawer trigger hit target too small: ${metrics.drawerTrigger.rect.width}x${metrics.drawerTrigger.rect.height}`,
        );
      }

      if (!metrics.grabber) {
        failures.push("expected passive visual grabber");
        return;
      }

      if (metrics.grabber.pointerEvents !== "none") {
        failures.push("visual grabber should be passive, not an extra button");
      }
    }

    function assertCrossRowActionParity(rowsToCheck, surface, rowIds) {
      const parityRects = rowIds
        .map((rowId) => {
          const row = rowsToCheck.find(
            (candidate) => candidate.rowId === rowId,
          );
          const rect = row ? getActionRect(row.metrics, surface) : null;

          return { row, rect };
        })
        .filter((entry) => entry.row && entry.rect);
      const reference = parityRects.find((entry) =>
        entry.row.rowId.includes("venmo"),
      );

      if (!reference) {
        for (const { row } of parityRects) {
          row.failures.push(`missing ${surface} Venmo reference rect`);
        }
        return;
      }

      for (const { row, rect } of parityRects) {
        const widthDelta = Math.abs(
          rect.actionRect.width - reference.rect.actionRect.width,
        );
        const heightDelta = Math.abs(
          rect.actionRect.height - reference.rect.actionRect.height,
        );

        if (widthDelta > 2 || heightDelta > 2) {
          row.failures.push(
            `${surface} selected action rect ${rect.actionRect.width}x${rect.actionRect.height} differs from Venmo ${reference.rect.actionRect.width}x${reference.rect.actionRect.height}`,
          );
        }
      }
    }

    function getActionRect(metrics, surface) {
      return metrics.selectedProviderRects.find(
        (rect) =>
          rect.surface === surface &&
          rect.actionRect &&
          !/choose payment/i.test(rect.text ?? ""),
      );
    }

    function summarizeConsole(entries) {
      return {
        errors: entries.filter((entry) => entry.type === "error"),
        warnings: entries.filter((entry) => entry.type === "warning"),
        allowedCount: entries.filter((entry) =>
          isAllowedConsoleEntry(entry, {}),
        ).length,
        infoCount: entries.filter((entry) => entry.type === "info").length,
      };
    }

    function isAllowedConsoleEntry(entry, assertions) {
      const url = entry.location?.url ?? "";

      if (
        entry.type === "error" &&
        /Failed to load resource/.test(entry.text) &&
        url.endsWith("/favicon.ico")
      ) {
        return true;
      }

      if (
        /Failed to load resource/.test(entry.text) &&
        /paypal\.com|paypalobjects\.com/.test(url)
      ) {
        return true;
      }

      if (
        /paypal\.com|paypalobjects\.com/.test(url) &&
        /Unable to load localized content|Failed to fetch/.test(entry.text)
      ) {
        return true;
      }

      if (
        assertions.allowInterceptedBillingFailure &&
        /checkout draft update failed/.test(entry.text)
      ) {
        return true;
      }

      return false;
    }

    function isAllowedResponseIssue(response, assertions) {
      if (response.status === 404 && response.url.endsWith("/favicon.ico")) {
        return true;
      }

      if (/paypal\.com|paypalobjects\.com/.test(response.url)) {
        return true;
      }

      if (
        assertions.allowInterceptedBillingFailure &&
        response.status === 500 &&
        response.url.includes("/api/checkout/drafts/") &&
        response.url.includes("/billing-address")
      ) {
        return true;
      }

      return false;
    }

    function countProviderTotal(providerCounts) {
      return Object.values(providerCounts).reduce(
        (sum, bucket) => sum + bucket.total,
        0,
      );
    }

    function countCreateOrderCallbacks(entries) {
      return entries.filter((entry) =>
        /PayPal order created|Pay Later order created/.test(entry.text),
      ).length;
    }

    function assertContains(value, expected, failures) {
      if (!value || !value.includes(expected)) {
        failures.push(`missing visible copy: ${expected}`);
      }
    }
  } finally {
    page.off("console", onConsole);
    page.off("response", onResponse);
    page.off("request", onRequest);
  }
}

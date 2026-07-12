/* eslint-disable @typescript-eslint/no-unused-vars */
/* global document, window */
async function round2HostedCheckoutSmoke(page) {
  const currentUrl = page.url();
  const currentOrigin = currentUrl.match(/^https?:\/\/[^/]+/)?.[0] ?? null;
  const baseUrl = currentOrigin ?? "https://paypal-retail-demo.onrender.com";
  const outputScope = isRenderHostedBaseUrl(baseUrl) ? "hosted" : "local";
  const outputPrefix = `/private/tmp/paypal-retail-round2-${outputScope}-smoke-evidence`;
  const viewportWidths = [320, 375, 390, 768, 1024, 1280, 1440];
  const consoleEntries = [];
  const responseIssues = [];
  const createOrderRequests = [];
  const viewportForWidth = (width) => ({
    width,
    height: width < 768 ? 844 : 900,
  });

  function isRenderHostedBaseUrl(candidate) {
    return /^https:\/\/[^/]+\.onrender\.com(?:[/?#]|$)/i.test(candidate);
  }

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

    for (const width of viewportWidths) {
      await setViewport(width);
      rows.push(
        await openAndCollect({
          rowId: `cart-first-pass-${width}`,
          route: "/cart",
          expectedText: ["Bag", "Order summary", "Molly Blind Boxes 2"],
          assertions: {
            requireCartStatus: true,
          },
        }),
      );
      rows.push(
        await openAndCollect({
          rowId: `checkout-initial-${width}`,
          route: "/checkout",
          expectedText: ["Secure checkout", "Shipping address"],
          assertions: {
            requireCheckoutStatus: true,
            requireStickyWhenMobile: true,
          },
        }),
      );
    }

    await setViewport(390);
    await openFreshRoute("/checkout");
    rows.push(
      await collectRow({
        rowId: "checkout-billing-active-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await fillShippingAddress();
          await page
            .getByRole("button", { name: "Submit shipping address" })
            .click();
          await page
            .getByRole("button", { name: "Save billing address" })
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: ["Billing address", "Save billing address"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-shipping-method-visible-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
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
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-payment-ready-no-method-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Submit shipping option" })
            .click();
          await page
            .getByRole("radio", { name: /PayPal/ })
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: [
          "Payment method",
          "PayPal",
          "Pay Later",
          "Credit or debit card",
        ],
        expectedLabels: {
          "Merchandise subtotal": "$69.68",
          Promo: "No promo applied",
          Shipping: "$5.95",
          "Estimated tax": "Calculated before payment",
          Total: "$75.63",
        },
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireNoProviderNodes: true,
        },
      }),
    );

    rows.push(
      await collectRow({
        rowId: "checkout-selected-paypal-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("radio", { name: /PayPal/ }).click();
          await page
            .getByText("PayPal payment button ready.")
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: ["PayPal payment button ready."],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireCheckoutStickyProvider: "paypal",
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-expanded-order-details-paypal-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Review order details" })
            .click();
          await page
            .getByRole("button", { name: "Close order details" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Order details", "PayPal payment button ready."],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireOrderSheet: true,
          requireOrderSheetProvider: "paypal",
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-collapsed-order-details-paypal-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Close order details" })
            .click();
          await page
            .getByRole("button", { name: "Review order details" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["PayPal payment button ready."],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireNoOrderSheet: true,
          requireFocusReturnedToGrabber: true,
          requireCheckoutStickyProvider: "paypal",
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-selected-paylater-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("radio", { name: /Pay Later/ }).click();
          await page
            .getByText("Pay Later payment option ready.")
            .waitFor({ state: "visible", timeout: 20000 });
        }),
        expectedText: ["Pay Later payment option ready."],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireCheckoutStickyProvider: "paylater",
        },
      }),
    );
    rows.push(
      await collectRow({
        rowId: "checkout-selected-card-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("radio", { name: /Credit or debit card/ })
            .click();
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
    rows.push(
      await collectRow({
        rowId: "checkout-focused-shipping-input-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page
            .getByRole("button", { name: "Edit shipping address" })
            .click();
          await page
            .locator("#shipping-address-street-address")
            .waitFor({ state: "visible", timeout: 10000 });
          await page.locator("#shipping-address-street-address").focus();
        }),
        expectedText: ["Shipping address", "Submit shipping address"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
          requireFocusedInput: true,
        },
      }),
    );

    await openFreshRoute("/checkout");
    await advanceDeliveryCheckoutToPayment();
    rows.push(
      await collectRow({
        rowId: "checkout-footer-clearance-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.evaluate(() =>
            window.scrollTo(0, document.body.scrollHeight),
          );
          await page.waitForTimeout(600);
        }),
        expectedText: ["COLLECTOR UPDATES", "Secure PayPal checkout"],
        assertions: {
          requireCheckoutStatus: true,
          requireSticky: true,
        },
      }),
    );

    await openFreshRoute("/checkout");
    await advanceDeliveryCheckoutToPayment();
    rows.push(
      await collectRow({
        rowId: "checkout-mobile-menu-open-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("button", { name: "Open mobile menu" }).click();
          await page
            .getByRole("button", { name: "Close mobile menu" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Shop menu", "SUPPORT"],
        assertions: {
          requireMobileMenu: true,
          requireNoSticky: true,
        },
      }),
    );
    await page.getByRole("button", { name: "Close mobile menu" }).click();
    rows.push(
      await collectRow({
        rowId: "checkout-minicart-open-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("button", { name: "Open minicart" }).click();
          await page
            .getByRole("button", { name: "Close minicart" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Cart", "Molly Blind Boxes 2"],
        assertions: {
          requireMinicart: true,
          requireNoSticky: true,
        },
      }),
    );
    await page.getByRole("button", { name: "Close minicart" }).click();
    rows.push(
      await collectRow({
        rowId: "checkout-sign-in-dialog-open-390",
        route: "/checkout",
        checkpoint: await runAction(async () => {
          await page.getByRole("button", { name: "Sign in" }).click();
          await page
            .getByRole("button", { name: "Close" })
            .waitFor({ state: "visible", timeout: 10000 });
        }),
        expectedText: ["Sign in", "Enter your email to continue."],
        assertions: {
          requireDialog: true,
          requireNoSticky: true,
        },
      }),
    );

    const failedRows = rows
      .filter((row) => row.failures.length > 0)
      .map((row) => ({
        rowId: row.rowId,
        failures: row.failures,
      }));

    if (failedRows.length > 0) {
      throw new Error(
        `Round 2 hosted checkout smoke failed: ${JSON.stringify(failedRows)}`,
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

    async function openAndCollect({
      rowId,
      route,
      expectedText,
      expectedLabels,
      assertions,
    }) {
      const checkpoint = await openFreshRoute(route);

      return await collectRow({
        rowId,
        route,
        checkpoint,
        expectedText,
        expectedLabels,
        assertions,
      });
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
        (routeName) => {
          const text = document.body.innerText;

          if (routeName === "/cart") {
            return (
              Boolean(document.querySelector(".cart-status")) &&
              text.includes("Bag") &&
              text.includes("Order summary")
            );
          }

          return (
            text.includes("Secure checkout") &&
            text.includes("Molly Blind Boxes 2")
          );
        },
        route,
        { timeout: 20000 },
      );

      return checkpoint;
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

    async function advanceDeliveryCheckoutToPayment() {
      await fillShippingAddress();
      await page
        .getByRole("button", { name: "Submit shipping address" })
        .click();
      await page
        .getByRole("button", { name: "Save billing address" })
        .waitFor({ state: "visible", timeout: 20000 });
      await page.getByRole("button", { name: "Save billing address" }).click();
      await page
        .getByRole("button", { name: "Submit shipping option" })
        .waitFor({ state: "visible", timeout: 20000 });
      await page
        .getByRole("button", { name: "Submit shipping option" })
        .click();
      await page
        .getByRole("radio", { name: /PayPal/ })
        .waitFor({ state: "visible", timeout: 20000 });
    }

    async function runAction(action) {
      const checkpoint = markCheckpoint();
      await action();
      await page.waitForTimeout(400);

      return checkpoint;
    }

    function markCheckpoint() {
      return {
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
      expectedLabels = {},
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
        const grabber = document.querySelector(
          ".checkout-sticky-summary__grabber",
        );
        const orderSheet = document.querySelector(".checkout-order-sheet");
        const closeHandle = document.querySelector(
          ".checkout-order-sheet__handle",
        );
        const activeElement = document.activeElement;
        const trackedTargets = [
          ...document.querySelectorAll(
            [
              ".checkout-payment-readiness",
              ".checkout-step [role='alert']",
              ".checkout-step__body input",
              ".checkout-step__body button",
              ".checkout-summary__slot",
              ".checkout-card-action",
              ".card-fields-checkout-action",
              ".checkout-order-sheet",
              ".checkout-order-sheet__handle",
              ".site-header__mobile-menu",
              ".minicart-shell",
              ".auth-modal__panel",
              ".site-footer__newsletter",
              ".site-footer__newsletter-actions a",
              ".site-footer__links a",
              ".site-footer__support",
              ".site-footer__payment",
              ".site-footer__payment-mark",
              "paypal-message",
              "paypal-button",
              "paypal-pay-later-button",
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
          cartStatusPresent: Boolean(document.querySelector(".cart-status")),
          cartHeroPresent: Boolean(document.querySelector(".cart-hero")),
          checkoutStatusPresent: Boolean(
            document.querySelector(".checkout-status"),
          ),
          checkoutHeroPresent: Boolean(
            document.querySelector(".checkout-hero"),
          ),
          summaryLabels: getSummaryLabels(),
          sticky: stickySummary
            ? {
                text: stickySummary.textContent?.trim().replace(/\s+/g, " "),
                rect: toPlainRect(stickySummary.getBoundingClientRect()),
              }
            : null,
          grabber: grabber
            ? {
                ariaControls: grabber.getAttribute("aria-controls"),
                ariaExpanded: grabber.getAttribute("aria-expanded"),
                ariaLabel: grabber.getAttribute("aria-label"),
                rect: toPlainRect(grabber.getBoundingClientRect()),
              }
            : null,
          orderSheet: orderSheet
            ? {
                text: orderSheet.textContent?.trim().replace(/\s+/g, " "),
                rect: toPlainRect(orderSheet.getBoundingClientRect()),
              }
            : null,
          closeHandle: closeHandle
            ? {
                ariaLabel: closeHandle.getAttribute("aria-label"),
                rect: toPlainRect(closeHandle.getBoundingClientRect()),
              }
            : null,
          mobileMenuOpen: isVisible(
            document.querySelector(".site-header__mobile-menu"),
          ),
          minicartOpen: isVisible(document.querySelector(".minicart-shell")),
          dialogOpen: isVisible(document.querySelector(".auth-modal__panel")),
          providerCounts: getProviderCounts(),
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

        function getSummaryLabels() {
          const labels = {};
          for (const row of document.querySelectorAll(
            ".checkout-summary dl div",
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
            minicart: createProviderBucket(),
            messageOnly: createProviderBucket(),
            other: createProviderBucket(),
          };
          const nodes = [
            ...document.querySelectorAll(
              [
                "[data-payment-method]",
                "paypal-button",
                "paypal-pay-later-button",
                "paypal-message",
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

          if (node.closest(".minicart-shell, [aria-label='Minicart']")) {
            return "minicart";
          }

          if (node.tagName.toLowerCase() === "paypal-message") {
            return "messageOnly";
          }

          return "other";
        }

        function getProviderType(node) {
          const tagName = node.tagName.toLowerCase();
          const method = node.getAttribute("data-payment-method");

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
            method === "venmo"
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
        expectedLabels,
        assertions,
        failures,
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
        metrics,
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
      expectedLabels,
      assertions,
      failures,
    }) {
      if (metrics.horizontalOverflow > 0) {
        failures.push(`horizontal overflow ${metrics.horizontalOverflow}px`);
      }

      for (const expected of expectedText ?? []) {
        assertContains(metrics.bodyText, expected, failures);
      }

      for (const [label, expectedValue] of Object.entries(
        expectedLabels ?? {},
      )) {
        const actualValue = metrics.summaryLabels[label];

        if (actualValue !== expectedValue) {
          failures.push(
            `expected ${label} label "${expectedValue}", saw "${actualValue ?? "missing"}"`,
          );
        }
      }

      const unexpectedConsole = rowConsole.filter(
        (entry) =>
          (entry.type === "error" || entry.type === "warning") &&
          !isAllowedConsoleEntry(entry),
      );
      const unexpectedResponses = rowResponses.filter(
        (response) => !isAllowedResponseIssue(response),
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

      if (assertions.requireCartStatus) {
        if (!metrics.cartStatusPresent) {
          failures.push("missing compact cart-status marker");
        }

        if (metrics.cartHeroPresent) {
          failures.push("legacy cart-hero marker still present");
        }
      }

      if (assertions.requireCheckoutStatus) {
        if (!metrics.checkoutStatusPresent) {
          failures.push("missing compact checkout-status marker");
        }

        if (metrics.checkoutHeroPresent) {
          failures.push("legacy checkout-hero marker still present");
        }
      }

      if (assertions.requireStickyWhenMobile && metrics.sticky === null) {
        const width = metrics.url ? page.viewportSize()?.width : null;

        if (width && width < 768) {
          failures.push("expected mobile sticky checkout summary");
        }
      }

      if (assertions.requireSticky) {
        assertSticky(metrics, failures);
      }

      if (assertions.requireNoSticky && metrics.sticky !== null) {
        failures.push(
          "expected checkout sticky summary to unmount behind overlay",
        );
      }

      if (
        assertions.requireNoProviderNodes &&
        countProviderTotal(metrics.providerCounts) !== 0
      ) {
        failures.push(
          `expected zero provider nodes, saw ${countProviderTotal(metrics.providerCounts)}`,
        );
      }

      if (assertions.requireCheckoutStickyProvider) {
        const bucket = metrics.providerCounts.checkoutSticky;

        if (
          bucket.total === 0 ||
          bucket[assertions.requireCheckoutStickyProvider] === 0
        ) {
          failures.push(
            `expected ${assertions.requireCheckoutStickyProvider} provider in checkout sticky surface`,
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

        if (!metrics.closeHandle || metrics.closeHandle.rect.height < 44) {
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

        if (
          bucket.total === 0 ||
          bucket[assertions.requireOrderSheetProvider] === 0
        ) {
          failures.push(
            `expected ${assertions.requireOrderSheetProvider} provider in order details sheet`,
          );
        }
      }

      if (assertions.requireFocusReturnedToGrabber) {
        if (
          metrics.focusedElement?.ariaLabel !== "Review order details" ||
          metrics.focusedElement?.tag !== "button"
        ) {
          failures.push(
            "expected focus to return to the order details grabber",
          );
        }
      }

      if (assertions.requireInlineCardProvider) {
        const bucket = metrics.providerCounts.inlineCard;

        if (bucket.card === 0) {
          failures.push("expected card provider to stay inline");
        }
      }

      if (assertions.requireFocusedInput) {
        if (
          metrics.focusedElement?.tag !== "input" ||
          metrics.focusedElement?.id !== "shipping-address-street-address"
        ) {
          failures.push("expected shipping street input to keep focus");
        }
      }

      if (assertions.requireMobileMenu && !metrics.mobileMenuOpen) {
        failures.push("expected mobile menu overlay to be open");
      }

      if (assertions.requireMinicart && !metrics.minicartOpen) {
        failures.push("expected minicart sheet to be open");
      }

      if (assertions.requireDialog && !metrics.dialogOpen) {
        failures.push("expected sign-in dialog to be open");
      }
    }

    function assertSticky(metrics, failures) {
      if (!metrics.sticky) {
        failures.push("expected checkout sticky summary");
        return;
      }

      if (!metrics.grabber) {
        failures.push("expected checkout sticky grabber");
        return;
      }

      if (metrics.grabber.ariaControls !== "checkout-order-details-sheet") {
        failures.push(
          "grabber aria-controls does not target order details sheet",
        );
      }

      if (metrics.grabber.ariaLabel !== "Review order details") {
        failures.push("grabber accessible name changed");
      }

      if (metrics.grabber.rect.height < 44 || metrics.grabber.rect.width < 44) {
        failures.push(
          `grabber hit target too small: ${metrics.grabber.rect.width}x${metrics.grabber.rect.height}`,
        );
      }
    }

    function summarizeConsole(entries) {
      return {
        errors: entries.filter((entry) => entry.type === "error"),
        warnings: entries.filter((entry) => entry.type === "warning"),
        allowedCount: entries.filter(isAllowedConsoleEntry).length,
        infoCount: entries.filter((entry) => entry.type === "info").length,
      };
    }

    function isAllowedConsoleEntry(entry) {
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

      return false;
    }

    function isAllowedResponseIssue(response) {
      if (response.status === 404 && response.url.endsWith("/favicon.ico")) {
        return true;
      }

      if (/paypal\.com|paypalobjects\.com/.test(response.url)) {
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

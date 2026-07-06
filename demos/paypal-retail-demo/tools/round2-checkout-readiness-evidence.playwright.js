/* eslint-disable @typescript-eslint/no-unused-vars */
/* global document, window */
async function round2CheckoutReadinessEvidence(page) {
  const baseUrl = "http://127.0.0.1:5173";
  const outputDir =
    "/private/tmp/paypal-retail-round2-checkout-readiness-evidence";
  const viewport = {
    width: 390,
    height: 844,
  };
  const consoleEntries = [];
  const createOrderRequests = [];

  page.on("console", (message) => {
    consoleEntries.push({
      type: message.type(),
      text: message.text(),
      location: message.location(),
    });
  });
  page.on("request", (request) => {
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
  });

  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });

  const rows = [];
  rows.push(
    await runReadinessRow({
      rowId: "checkout-recalculating-readiness-390",
      readiness: {
        state: "recalculating",
        title: "Payment is recalculating",
        body: "Updated totals are syncing before payment.",
      },
      summary: {
        merchandiseSubtotalMinor: 6968,
        discountMinor: 399,
        shippingMinor: 595,
        taxMinor: 111,
        totalMinor: 4300,
        selectedCodes: ["ROUND2MOCK"],
        expectedLabels: {
          "Merchandise subtotal": "$69.68",
          Promo: "-$3.99 promo (ROUND2MOCK)",
          Shipping: "$5.95",
          "Estimated tax": "Calculated before payment",
          Total: "$43.00",
        },
      },
    }),
  );
  rows.push(
    await runReadinessRow({
      rowId: "checkout-failed-readiness-390",
      readiness: {
        state: "failed",
        title: "Payment needs refresh",
        body: "Refresh checkout details before continuing.",
      },
      summary: {
        merchandiseSubtotalMinor: 6968,
        discountMinor: 0,
        shippingMinor: 595,
        taxMinor: 111,
        totalMinor: 4644,
        selectedCodes: [],
        expectedLabels: {
          "Merchandise subtotal": "$69.68",
          Promo: "No promo applied",
          Shipping: "$5.95",
          "Estimated tax": "Calculated before payment",
          Total: "$46.44",
        },
      },
    }),
  );
  rows.push(await runFailedSaveRow());

  const failedRows = rows
    .filter((row) => row.failures.length > 0)
    .map((row) => ({
      rowId: row.rowId,
      failures: row.failures,
    }));

  if (failedRows.length > 0) {
    throw new Error(
      `Round 2 checkout readiness evidence failed: ${JSON.stringify(failedRows)}`,
    );
  }

  return {
    outputDir,
    viewport,
    rows,
    summary: {
      rowCount: rows.length,
      failedRows,
    },
  };

  async function runReadinessRow({ rowId, readiness, summary }) {
    await resetPageRoutes();
    let interceptedDraft = null;

    await page.route(
      "**/api/checkout/drafts/**/shipping-option**",
      async (route) => {
        const response = await route.fetch();
        const envelope = await response.json();

        if (envelope && envelope.ok && envelope.data?.draft) {
          const draft = envelope.data.draft;
          interceptedDraft = {
            id: draft.id ?? null,
            readiness,
            summary,
          };
          draft.payment_readiness = readiness;
          draft.summary = {
            ...draft.summary,
            currency_code: "USD",
            merchandise_subtotal_minor: summary.merchandiseSubtotalMinor,
            discount_minor: summary.discountMinor,
            shipping_minor: summary.shippingMinor,
            tax_minor: summary.taxMinor,
            total_minor: summary.totalMinor,
          };
          draft.promo = {
            ...(draft.promo ?? {}),
            status: summary.discountMinor > 0 ? "applied" : "none",
            selected_codes: summary.selectedCodes,
            recommended_codes: [],
          };
        }

        await route.fulfill({
          response,
          json: envelope,
        });
      },
    );

    await openFreshCheckout();
    const rowConsoleStart = consoleEntries.length;
    const requestBaseline = createOrderRequests.length;
    await advanceDeliveryCheckoutToPayment();
    await page.getByRole("radio", { name: /PayPal/ }).click();
    await page.getByText(readiness.title).waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.getByText(readiness.body).waitFor({
      state: "visible",
      timeout: 10000,
    });

    return await collectRow({
      rowId,
      expectedReadiness: readiness.state,
      expectedLabels: summary.expectedLabels,
      rowConsoleStart,
      requestBaseline,
      interceptedDraft,
    });
  }

  async function runFailedSaveRow() {
    await resetPageRoutes();
    const rowId = "checkout-shipping-save-failed-390";
    let interceptedDraft = null;

    await page.route(
      "**/api/checkout/drafts/**/shipping-address**",
      async (route) => {
        interceptedDraft = {
          id: extractDraftId(route.request().url()),
          readiness: {
            state: "failed-save",
            title: "Shipping save failed",
            body: "We could not save Shipping address. Please try again.",
          },
          summary: null,
        };
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            debug_id: "dbg_round2_shipping_save_failed",
            error: {
              code: "CHECKOUT_DRAFT_UPDATE_FAILED",
              message: "Round 2 evidence intercepted shipping save failure.",
              details: {},
            },
          }),
        });
      },
    );

    await openFreshCheckout();
    const rowConsoleStart = consoleEntries.length;
    const requestBaseline = createOrderRequests.length;
    await page.getByRole("button", { name: "Submit shipping address" }).click();
    await page.getByRole("alert").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page
      .getByText("We could not save Shipping address. Please try again.")
      .waitFor({
        state: "visible",
        timeout: 10000,
      });

    return await collectRow({
      rowId,
      expectedReadiness: "failed-save",
      expectedLabels: {
        "Merchandise subtotal": "$69.68",
        Promo: "No promo applied",
        "Estimated tax": "Calculated before payment",
        Total: "$69.68",
      },
      rowConsoleStart,
      requestBaseline,
      interceptedDraft,
    });
  }

  async function resetPageRoutes() {
    await page
      .unroute("**/api/checkout/drafts/**/shipping-option**")
      .catch(() => undefined);
    await page
      .unroute("**/api/checkout/drafts/**/shipping-address**")
      .catch(() => undefined);
  }

  async function openFreshCheckout() {
    await page.context().clearCookies();
    await page.goto(baseUrl);
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
    await page.goto(`${baseUrl}/checkout`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", {
      timeout: 15000,
    });
    await page.waitForFunction(
      () =>
        document.body.innerText.includes("Molly Blind Boxes 2") &&
        document.body.innerText.includes("The Monsters Plush 1"),
      undefined,
      { timeout: 15000 },
    );
  }

  async function advanceDeliveryCheckoutToPayment() {
    await page.getByRole("button", { name: "Submit shipping address" }).click();
    await page
      .getByRole("button", { name: "Save billing address" })
      .waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Save billing address" }).click();
    await page
      .getByRole("button", { name: "Submit shipping option" })
      .waitFor({ state: "visible", timeout: 10000 });
    await page.getByRole("button", { name: "Submit shipping option" }).click();
    await page
      .getByRole("radio", { name: /PayPal/ })
      .waitFor({ state: "visible", timeout: 10000 });
  }

  async function collectRow({
    rowId,
    expectedReadiness,
    expectedLabels,
    rowConsoleStart,
    requestBaseline,
    interceptedDraft,
  }) {
    const screenshotPath = `${outputDir}/${rowId}.png`;
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
    });
    const domMetrics = await page.evaluate(() => {
      const summaryLabels = getSummaryLabels();
      const stickySummary = document.querySelector(".checkout-sticky-summary");
      const grabber = document.querySelector(
        ".checkout-sticky-summary__grabber",
      );
      const orderSheet = document.querySelector(".checkout-order-sheet");
      const stickyRect = stickySummary?.getBoundingClientRect();
      const trackedTargets = [
        ...document.querySelectorAll(
          [
            ".checkout-payment-readiness",
            ".checkout-step [role='alert']",
            ".checkout-step__body input",
            ".checkout-step__body button",
            ".checkout-order-sheet",
            ".checkout-order-sheet__handle",
            "footer",
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
          const occludedBySticky = Boolean(
            visible && stickyRect && intersects(stickyRect, rect),
          );

          return {
            tag: target.tagName.toLowerCase(),
            className:
              typeof target.className === "string" ? target.className : "",
            ariaLabel: target.getAttribute("aria-label"),
            text: target.textContent?.trim().replace(/\s+/g, " ").slice(0, 90),
            rect: toPlainRect(rect),
            visible,
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
        paymentReadinessText:
          document.querySelector(".checkout-payment-readiness")?.textContent ??
          null,
        shippingSaveAlert:
          document.querySelector(".checkout-step [role='alert']")
            ?.textContent ?? null,
        summaryLabels,
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
        orderSheetPresent: Boolean(orderSheet),
        providerCounts: getProviderCounts(),
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

        if (node.closest(".checkout-card-action, .card-fields-checkout")) {
          return "inlineCard";
        }

        if (node.closest(".minicart, [aria-label='Minicart']")) {
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
    const rowConsole = consoleEntries.slice(rowConsoleStart);
    const rowRequests = createOrderRequests.slice(requestBaseline);
    const callbackEntries = rowConsole.filter((entry) =>
      /PayPal order created|Pay Later order created/.test(entry.text),
    );
    const providerTotal = countProviderTotal(domMetrics.providerCounts);
    const failures = [];

    if (domMetrics.horizontalOverflow > 0) {
      failures.push(`horizontal overflow ${domMetrics.horizontalOverflow}px`);
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

    if (providerTotal !== 0) {
      failures.push(`expected zero provider nodes, saw ${providerTotal}`);
    }

    assertExpectedLabels(domMetrics.summaryLabels, expectedLabels, failures);
    assertConsoleAllowed(rowConsole, expectedReadiness, failures);

    if (expectedReadiness === "recalculating") {
      assertContains(
        domMetrics.paymentReadinessText,
        "Payment is recalculating",
        failures,
      );
      assertContains(
        domMetrics.paymentReadinessText,
        "Updated totals are syncing before payment.",
        failures,
      );
    }

    if (expectedReadiness === "failed") {
      assertContains(
        domMetrics.paymentReadinessText,
        "Payment needs refresh",
        failures,
      );
      assertContains(
        domMetrics.paymentReadinessText,
        "Refresh checkout details before continuing.",
        failures,
      );
    }

    if (expectedReadiness === "failed-save") {
      assertContains(
        domMetrics.shippingSaveAlert,
        "We could not save Shipping address. Please try again.",
        failures,
      );
    }

    return {
      rowId,
      route: "/checkout",
      screenshotPath,
      viewport,
      expectedReadiness,
      interceptedDraft,
      console: summarizeConsole(rowConsole),
      createOrderRequests: {
        baseline: requestBaseline,
        delta: rowRequests.length,
        cumulative: createOrderRequests.length,
        requests: rowRequests,
      },
      createOrderCallbacks: {
        baseline: countCreateOrderCallbacks(
          consoleEntries.slice(0, rowConsoleStart),
        ),
        delta: callbackEntries.length,
        cumulative: countCreateOrderCallbacks(consoleEntries),
        entries: callbackEntries,
      },
      metrics: domMetrics,
      failures,
    };
  }

  function summarizeConsole(entries) {
    return {
      errors: entries.filter((entry) => entry.type === "error"),
      warnings: entries.filter((entry) => entry.type === "warning"),
      infoCount: entries.filter((entry) => entry.type === "info").length,
    };
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

  function assertExpectedLabels(actualLabels, expectedLabels, failures) {
    for (const [label, expectedValue] of Object.entries(expectedLabels)) {
      const actualValue = actualLabels[label];

      if (actualValue !== expectedValue) {
        failures.push(
          `expected ${label} label "${expectedValue}", saw "${actualValue ?? "missing"}"`,
        );
      }
    }
  }

  function assertConsoleAllowed(entries, expectedReadiness, failures) {
    const errors = entries.filter((entry) => entry.type === "error");
    const warnings = entries.filter((entry) => entry.type === "warning");

    if (warnings.length > 0) {
      failures.push(`expected zero console warnings, saw ${warnings.length}`);
    }

    if (expectedReadiness !== "failed-save") {
      if (errors.length > 0) {
        failures.push(`expected zero console errors, saw ${errors.length}`);
      }

      return;
    }

    const isExpectedResourceError = (entry) => {
      const url = entry.location?.url ?? "";

      return (
        /status of 500/.test(entry.text) &&
        url.includes("/api/checkout/drafts/") &&
        url.includes("/shipping-address")
      );
    };
    const isExpectedAppError = (entry) =>
      /Checkout draft update failed/.test(entry.text) &&
      /Round 2 evidence intercepted shipping save failure/.test(entry.text);
    const resourceErrors = errors.filter(isExpectedResourceError);
    const appErrors = errors.filter(isExpectedAppError);
    const unexpectedErrors = errors.filter(
      (entry) => !isExpectedResourceError(entry) && !isExpectedAppError(entry),
    );

    if (resourceErrors.length !== 1 || appErrors.length !== 1) {
      failures.push(
        `expected exactly one intercepted shipping-address 500 and one checkout draft app error, saw ${resourceErrors.length} resource and ${appErrors.length} app`,
      );
    }

    if (unexpectedErrors.length > 0) {
      failures.push(
        `expected only intercepted shipping-save console errors, saw ${unexpectedErrors.length} unexpected`,
      );
    }
  }

  function extractDraftId(url) {
    const match = url.match(/\/api\/checkout\/drafts\/([^/]+)\//);

    return match ? decodeURIComponent(match[1]) : null;
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
/* global document, fetch, getComputedStyle, HTMLInputElement, process, URLSearchParams, window */
async function postPurchaseOperationsEvidence(page) {
  const envBaseUrl =
    typeof process !== "undefined"
      ? process.env.PAYPAL_RETAIL_EVIDENCE_BASE_URL
      : undefined;
  const adminPasscode =
    typeof process !== "undefined" ? process.env.ADMIN_PASSCODE : undefined;
  const accountEmail =
    typeof process !== "undefined"
      ? (process.env.PAYPAL_RETAIL_EVIDENCE_ACCOUNT_EMAIL ??
        "alice.la@example.test")
      : "alice.la@example.test";
  const accountPassword =
    typeof process !== "undefined"
      ? (process.env.PAYPAL_RETAIL_EVIDENCE_ACCOUNT_PASSWORD ??
        "RetailDemo2026!")
      : "RetailDemo2026!";
  const currentOrigin = page.url().match(/^https?:\/\/[^/]+/)?.[0] ?? null;
  const baseUrl = (
    envBaseUrl ??
    currentOrigin ??
    "http://127.0.0.1:5173"
  ).replace(/\/$/, "");
  const outputPrefix =
    "/private/tmp/paypal-retail-post-purchase-operations-evidence";
  const interactionTimeout = 20000;
  const evidenceLifecycleOrderNumber = "DO-20260714-900001";
  const knownGooglePayManifestIssue =
    'Failed to download or decode a non-empty icon for payment app with "https://pay.google.com/gp/p/web_manifest.json" manifest.';
  const knownGooglePayManifestUnavailableIssue =
    'Unable to download payment manifest "https://pay.google.com/gp/p/web_manifest.json".';
  const knownGooglePayManifestWarning =
    'Cannot download icons after the webpage has been closed (web app manifest "https://pay.google.com/gp/p/web_manifest.json" for payment handler manifest "https://google.com/pay").';
  const rows = [];
  const consoleEntries = [];
  const responseEntries = [];
  const requiredRowIds = [
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
  ];

  attachIssueListeners(page, "admin");
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const width of [375, 768, 1024, 1440]) {
    const checkpoint = markCheckpoint();
    await setViewport(page, width);
    await openAdminRoute(page, "/admin/orders");
    const activeSection = await activeAdminSection(page);
    const routePath = await page.evaluate(() => window.location.pathname);
    const workbenchHeading = (
      await page.locator("#admin-workbench-title").textContent()
    )?.trim();
    const apiEvidence = findRouteApiEvidence(checkpoint, "/api/admin/orders");
    rows.push(
      await collectRow({
        rowId: `admin-orders-route-${width}`,
        targetPage: page,
        checkpoint,
        assertions: {
          pageState: await readWorkbenchState(page),
          activeSection,
          routePath,
          workbenchHeading,
          apiEvidence,
        },
        scenarioFailures: [
          ...(activeSection === "Orders"
            ? []
            : [
                `Expected Orders navigation to be active; received ${activeSection}.`,
              ]),
          ...(routePath === "/admin/orders"
            ? []
            : [`Expected /admin/orders; received ${routePath}.`]),
          ...(workbenchHeading === "Orders"
            ? []
            : [`Expected Orders workbench; received ${workbenchHeading}.`]),
          ...(apiEvidence
            ? []
            : ["Orders route did not produce successful Orders API evidence."]),
        ],
      }),
    );
  }

  for (const route of [
    {
      rowId: "admin-lifecycle-route-1024",
      path: "/admin/lifecycle",
      section: "Lifecycle",
      apiPath: "/api/admin/lifecycle",
    },
    {
      rowId: "admin-inventory-route-1024",
      path: "/admin/inventory",
      section: "Inventory",
      apiPath: "/api/admin/inventory",
    },
    {
      rowId: "admin-webhooks-route-1024",
      path: "/admin/webhooks",
      section: "Webhooks",
      apiPath: "/api/admin/webhooks",
    },
  ]) {
    const checkpoint = markCheckpoint();
    await setViewport(page, 1024);
    await openAdminRoute(page, route.path);
    const activeSection = await activeAdminSection(page);
    const routePath = await page.evaluate(() => window.location.pathname);
    const workbenchHeading = (
      await page.locator("#admin-workbench-title").textContent()
    )?.trim();
    const pageState = await readWorkbenchState(page);
    const apiEvidence = findRouteApiEvidence(checkpoint, route.apiPath);
    rows.push(
      await collectRow({
        rowId: route.rowId,
        targetPage: page,
        checkpoint,
        assertions: {
          activeSection,
          routePath,
          workbenchHeading,
          apiEvidence,
          pageState,
        },
        scenarioFailures: [
          ...(activeSection === route.section
            ? []
            : [
                `Expected ${route.section} navigation to be active; received ${activeSection}.`,
              ]),
          ...(routePath === route.path
            ? []
            : [`Expected ${route.path}; received ${routePath}.`]),
          ...(workbenchHeading === route.section
            ? []
            : [
                `Expected ${route.section} workbench; received ${workbenchHeading}.`,
              ]),
          ...(apiEvidence
            ? []
            : [
                `${route.section} route did not produce successful ${route.apiPath} evidence.`,
              ]),
          ...(["error", "loading"].includes(pageState)
            ? [`${route.section} workbench settled in ${pageState} state.`]
            : []),
        ],
      }),
    );
  }

  await collectFilterAndDrillDownRows();
  await collectLifecycleAndAccountRows();
  await collectDiagnosticsRows();
  await collectKeyboardRow();
  await collectPageStateRows();

  const missingRows = requiredRowIds.filter(
    (rowId) => !rows.some((row) => row.rowId === rowId),
  );
  const failedRows = rows
    .filter((row) => row.failures.length > 0)
    .map((row) => ({ rowId: row.rowId, failures: row.failures }));
  const report = {
    baseUrl,
    outputPrefix,
    accountEmail,
    requiredRowIds,
    rows,
    summary: {
      rowCount: rows.length,
      missingRows,
      failedRows,
      status:
        missingRows.length === 0 && failedRows.length === 0
          ? "passed"
          : "failed",
    },
  };

  if (failedRows.length > 0) {
    report.summary.status = "failed";
  }

  return report;

  function attachIssueListeners(targetPage, surface) {
    targetPage.on("console", (message) => {
      if (!["error", "warning"].includes(message.type())) {
        return;
      }
      consoleEntries.push({
        surface,
        type: message.type(),
        text: message.text(),
        location: message.location(),
      });
    });
    targetPage.on("pageerror", (error) => {
      consoleEntries.push({
        surface,
        type: "pageerror",
        text: error.message,
        location: null,
      });
    });
    targetPage.on("response", (response) => {
      responseEntries.push({
        surface,
        method: response.request().method(),
        status: response.status(),
        url: response.url(),
      });
    });
  }

  function markCheckpoint() {
    return {
      consoleIndex: consoleEntries.length,
      responseIndex: responseEntries.length,
    };
  }

  async function setViewport(targetPage, width) {
    await targetPage.setViewportSize({
      width,
      height: width <= 768 ? 900 : 960,
    });
  }

  async function gotoRoute(targetPage, path) {
    await targetPage.goto(`${baseUrl}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
  }

  async function openAdminRoute(targetPage, path) {
    await gotoRoute(targetPage, path);
    const lockedPasscode = targetPage.getByLabel("Admin passcode");

    if (await lockedPasscode.isVisible().catch(() => false)) {
      if (!adminPasscode?.trim()) {
        throw new Error(
          "ADMIN_PASSCODE is required for post-purchase operations evidence.",
        );
      }
      await lockedPasscode.fill(adminPasscode);
      await targetPage
        .getByRole("button", { name: "Open Admin Portal" })
        .click();
    }

    await targetPage
      .locator("nav[aria-label='Admin sections']")
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await targetPage
      .locator("#admin-workbench-title")
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await waitForWorkbenchSettled(targetPage);
  }

  async function waitForWorkbenchSettled(targetPage) {
    await targetPage
      .locator(".admin-workbench__state[aria-busy='true']")
      .waitFor({ state: "hidden", timeout: interactionTimeout })
      .catch(() => undefined);
  }

  async function waitForExpectedAccountRefresh(
    targetPage,
    expectedOrderNumber,
    expectedStatusLabel,
    merchantNote,
  ) {
    const currentStage = targetPage.getByRole("region", {
      name: "Current stage",
    });
    await Promise.all([
      targetPage
        .getByRole("heading", {
          name: expectedOrderNumber,
          exact: true,
        })
        .waitFor({ state: "visible", timeout: interactionTimeout }),
      targetPage
        .locator(
          ".account-page__order-detail > .account-page__section-heading .account-page__status-chip",
        )
        .filter({ hasText: expectedStatusLabel })
        .waitFor({ state: "visible", timeout: interactionTimeout }),
      currentStage
        .getByRole("heading", { name: expectedStatusLabel, exact: true })
        .waitFor({ state: "visible", timeout: interactionTimeout }),
      targetPage
        .locator(".account-page__timeline-step--current strong")
        .filter({ hasText: expectedStatusLabel })
        .waitFor({ state: "visible", timeout: interactionTimeout }),
      currentStage
        .getByText(merchantNote, { exact: true })
        .waitFor({ state: "visible", timeout: interactionTimeout }),
    ]);
  }

  async function observeRealOrdersLoadingState(targetPage, refreshButton) {
    const ordersRoutePattern = /\/api\/admin\/orders(?:\?.*)?$/;
    let ordersResponseIntercepted = false;
    let ordersRouteFailure = null;
    let realOrdersResponseStatus = null;
    let markRealOrdersResponseHeld = () => undefined;
    let markRealOrdersResponseHandled = () => undefined;
    let releaseHeldOrdersResponse = () => undefined;
    const realOrdersResponseHeld = new Promise((resolve) => {
      markRealOrdersResponseHeld = resolve;
    });
    const realOrdersResponseHandled = new Promise((resolve) => {
      markRealOrdersResponseHandled = resolve;
    });
    const heldOrdersResponseRelease = new Promise((resolve) => {
      releaseHeldOrdersResponse = resolve;
    });

    function isAdminOrdersListRequest(request) {
      return (
        request.method() === "GET" &&
        /\/api\/admin\/orders(?:\?.*)?$/.test(request.url())
      );
    }

    const holdRealOrdersResponse = async (route) => {
      if (
        ordersResponseIntercepted ||
        !isAdminOrdersListRequest(route.request())
      ) {
        await route.continue();
        return;
      }

      ordersResponseIntercepted = true;
      try {
        const realOrdersResponse = await route.fetch();
        realOrdersResponseStatus = realOrdersResponse.status();
        markRealOrdersResponseHeld();
        await heldOrdersResponseRelease;
        await route.fulfill({ response: realOrdersResponse });
      } catch (error) {
        ordersRouteFailure =
          error instanceof Error ? error.message : String(error);
        markRealOrdersResponseHeld();
        await route.abort("failed").catch(() => undefined);
      } finally {
        markRealOrdersResponseHandled();
      }
    };

    const loadingState = targetPage.getByText("Loading orders.", {
      exact: true,
    });
    let loadingObserved = false;
    let loadingScreenshotCaptured = false;
    let loadingObservationFailure = null;

    await targetPage.route(ordersRoutePattern, holdRealOrdersResponse);
    const ordersRequestObservation = targetPage
      .waitForRequest((request) => isAdminOrdersListRequest(request), {
        timeout: interactionTimeout,
      })
      .then(
        (request) => ({ request, failure: null }),
        (error) => ({
          request: null,
          failure: error instanceof Error ? error.message : String(error),
        }),
      );
    const ordersResponseObservation = targetPage
      .waitForResponse(
        (response) => isAdminOrdersListRequest(response.request()),
        { timeout: interactionTimeout },
      )
      .then(
        (response) => ({ status: response.status(), failure: null }),
        (error) => ({
          status: null,
          failure: error instanceof Error ? error.message : String(error),
        }),
      );
    try {
      await refreshButton.click({ noWaitAfter: true });
      const requestObservation = await ordersRequestObservation;
      if (requestObservation.failure) {
        throw new Error(requestObservation.failure);
      }
      await realOrdersResponseHeld;
      if (!ordersResponseIntercepted) {
        throw new Error("The real Orders request bypassed the evidence route.");
      }
      if (ordersRouteFailure) {
        throw new Error(ordersRouteFailure);
      }
      await loadingState.waitFor({
        state: "visible",
        timeout: interactionTimeout,
      });
      loadingObserved = await loadingState.isVisible();
      const loadingScreenshotPath = `${outputPrefix}-admin-loading-state-768.png`;
      await targetPage.screenshot({
        path: loadingScreenshotPath,
        fullPage: true,
      });
      loadingScreenshotCaptured = true;
    } catch (error) {
      loadingObservationFailure =
        error instanceof Error ? error.message : String(error);
    } finally {
      releaseHeldOrdersResponse();
      if (ordersResponseIntercepted) {
        await realOrdersResponseHandled;
        if (!ordersRouteFailure) {
          const responseObservation = await ordersResponseObservation;
          if (responseObservation.failure) {
            loadingObservationFailure ??= responseObservation.failure;
          } else if (responseObservation.status !== realOrdersResponseStatus) {
            loadingObservationFailure ??= `The released Orders response status ${String(responseObservation.status)} did not match the fetched status ${String(realOrdersResponseStatus)}.`;
          }
        }
      }
      await targetPage.unroute(ordersRoutePattern, holdRealOrdersResponse);
    }

    await waitForWorkbenchSettled(targetPage);
    const settledPageState = await readWorkbenchState(targetPage);
    if (!loadingObservationFailure && realOrdersResponseStatus !== 200) {
      loadingObservationFailure = `The released real Orders response returned ${String(realOrdersResponseStatus)} instead of 200.`;
    }
    if (!loadingObservationFailure && settledPageState !== "ready") {
      loadingObservationFailure = `The Orders workbench settled in ${settledPageState} state after the real response was released.`;
    }

    return {
      loadingObserved,
      loadingScreenshotCaptured,
      loadingObservationFailure,
      realOrdersResponseStatus,
      settledPageState,
    };
  }

  async function activeAdminSection(targetPage) {
    return (
      (
        await targetPage
          .locator("nav[aria-label='Admin sections'] [aria-current='page']")
          .textContent()
      )?.trim() ?? null
    );
  }

  function findRouteApiEvidence(checkpoint, apiPath) {
    return (
      responseEntries
        .slice(checkpoint.responseIndex)
        .find(
          (entry) =>
            entry.url.includes(apiPath) &&
            entry.status >= 200 &&
            entry.status < 400,
        ) ?? null
    );
  }

  async function collectFilterAndDrillDownRows() {
    await setViewport(page, 1440);
    await openAdminRoute(page, "/admin/orders");
    const firstOpenButton = page
      .locator(".admin-workbench__table-action")
      .first();
    const firstOpenLabel =
      (await firstOpenButton.textContent().catch(() => null))?.trim() ?? null;
    const orderNumber = firstOpenLabel?.replace(/^Open\s+/, "") ?? null;

    const filterCheckpoint = markCheckpoint();
    let filterPersistence = {
      attempted: Boolean(orderNumber),
      orderNumber,
      queryValue: null,
      restoredValue: null,
      activeChipVisible: false,
    };
    const filterFailures = [];

    if (!orderNumber) {
      filterFailures.push(
        "No API-backed order row was available for filter evidence.",
      );
    } else {
      const filterInput = page.locator(
        "#admin-filter-desktop-orders-order_number",
      );
      await filterInput.fill(orderNumber);
      await page
        .locator("form[aria-label='Orders filters']")
        .getByRole("button", { name: "Apply filters" })
        .click();
      await page.waitForURL(
        (url) => url.searchParams.get("order_number") === orderNumber,
        {
          timeout: interactionTimeout,
        },
      );
      await waitForWorkbenchSettled(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page
        .locator("#admin-workbench-title")
        .waitFor({ state: "visible", timeout: interactionTimeout });
      await waitForWorkbenchSettled(page);

      const queryValue = await page.evaluate(() =>
        new URLSearchParams(window.location.search).get("order_number"),
      );
      const restoredValue = await filterInput.inputValue();
      const activeChipVisible = await page
        .locator("[aria-label='Active filters']")
        .getByText(`Order number: ${orderNumber}`)
        .isVisible()
        .catch(() => false);
      filterPersistence = {
        attempted: true,
        orderNumber,
        queryValue,
        restoredValue,
        activeChipVisible,
      };
      if (queryValue !== orderNumber || restoredValue !== orderNumber) {
        filterFailures.push(
          "The order-number filter did not survive URL reload.",
        );
      }
      if (!activeChipVisible) {
        filterFailures.push(
          "The persisted order-number filter chip is not visible.",
        );
      }
    }

    rows.push(
      await collectRow({
        rowId: "admin-filter-persistence-1440",
        targetPage: page,
        checkpoint: filterCheckpoint,
        assertions: {
          filterPersistence,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures: filterFailures,
      }),
    );

    const drillCheckpoint = markCheckpoint();
    const drillFailures = [];
    let drillDown = {
      attempted: Boolean(orderNumber),
      orderNumber,
      detailVisible: false,
      selectedRowPressed: false,
    };

    if (!orderNumber) {
      drillFailures.push(
        "No API-backed order row was available for drill-down evidence.",
      );
    } else {
      const openButton = page.getByRole("button", {
        name: `Open ${orderNumber}`,
      });
      await openButton.click();
      const detailHeader = page.locator(".admin-shell__order-detail-header");
      await detailHeader.waitFor({
        state: "visible",
        timeout: interactionTimeout,
      });
      const detailVisible = await detailHeader
        .getByRole("heading", { name: orderNumber })
        .isVisible();
      const selectedRowPressed =
        (await openButton.getAttribute("aria-pressed")) === "true";
      drillDown = {
        attempted: true,
        orderNumber,
        detailVisible,
        selectedRowPressed,
      };
      if (!detailVisible || !selectedRowPressed) {
        drillFailures.push(
          "The selected API order did not open its canonical detail.",
        );
      }
    }

    rows.push(
      await collectRow({
        rowId: "admin-order-drill-down-1440",
        targetPage: page,
        checkpoint: drillCheckpoint,
        assertions: {
          drillDown,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures: drillFailures,
      }),
    );
  }

  async function collectLifecycleAndAccountRows() {
    const lifecycleCheckpoint = markCheckpoint();
    await setViewport(page, 1440);
    await openAdminRoute(page, "/admin/lifecycle?actionable=true&limit=100");
    const lifecycleResponse = await fetchAdminJson(
      page,
      "/api/admin/lifecycle?actionable=true&limit=100",
    );
    const actionableOrders = Array.isArray(lifecycleResponse?.lifecycle)
      ? lifecycleResponse.lifecycle
      : [];
    let webhookCountBefore = null;
    let webhookCountBeforeFailure = null;
    try {
      webhookCountBefore = await fetchWebhookCount(page);
    } catch (error) {
      webhookCountBeforeFailure =
        error instanceof Error ? error.message : String(error);
    }
    const accountPage = await page.context().newPage();
    attachIssueListeners(accountPage, "account");
    await accountPage.emulateMedia({ reducedMotion: "reduce" });
    await setViewport(accountPage, 1440);

    let accountOrders = [];
    let accountSignInFailure = null;
    try {
      const apiAccountOrders = await signInAndOpenAccountOrders(accountPage);
      const renderedAccountOrders = await accountPage
        .locator(".account-page__order-number")
        .allTextContents();
      accountOrders = [...apiAccountOrders, ...renderedAccountOrders]
        .map((value) => value.trim())
        .filter(
          (value, index, values) =>
            Boolean(value) && values.indexOf(value) === index,
        );
    } catch (error) {
      accountSignInFailure =
        error instanceof Error ? error.message : String(error);
    }

    const actionableOrder = actionableOrders.find(
      (candidate) =>
        candidate.order_number === evidenceLifecycleOrderNumber &&
        accountOrders.includes(candidate.order_number),
    );
    const actionableOrderIsPaid =
      actionableOrder !== undefined && actionableOrder.status === "paid";
    const lifecycleFailures = [];
    let lifecycleAccountRefresh = {
      accountEmail,
      accountOrders,
      actionableOrders: actionableOrders.map(
        (candidate) => candidate.order_number,
      ),
      matchedOrderNumber: actionableOrder?.order_number ?? null,
      mutationAttempted: false,
      expectedOrderNumber: evidenceLifecycleOrderNumber,
      expectedPreMutationStatus: "paid",
      preMutationStatus: actionableOrder?.status ?? null,
      mutationOrderNumber: null,
      beforeStage: null,
      afterStage: null,
      expectedAccountStatus: null,
      expectedAccountStatusLabel: null,
      accountStatusLabel: null,
      accountCurrentStageLabel: null,
      accountTimelineCurrentLabel: null,
      accountStatusMatchesExpected: false,
      accountRefreshApiOrderNumber: null,
      accountRefreshApiStatus: null,
      accountRefreshUiCommitted: false,
      accountRefreshCommitFailure: null,
      accountDetailOrderNumber: null,
      merchantNoteVisible: false,
      refreshed: false,
    };

    if (accountSignInFailure) {
      lifecycleFailures.push(`Account sign-in failed: ${accountSignInFailure}`);
    } else if (!actionableOrder) {
      lifecycleFailures.push(
        `${evidenceLifecycleOrderNumber} is not an actionable order owned by ${accountEmail}; refusing to substitute another order for lifecycle-to-Account evidence.`,
      );
    } else if (!actionableOrderIsPaid) {
      lifecycleFailures.push(
        `${evidenceLifecycleOrderNumber} must start paid; received ${String(actionableOrder.status)}. Reseed before rerunning evidence.`,
      );
    } else {
      const orderNumber = actionableOrder.order_number;
      await gotoRoute(
        accountPage,
        `/account/orders/${encodeURIComponent(orderNumber)}`,
      );
      await accountPage
        .getByRole("region", { name: "Current stage" })
        .waitFor({ state: "visible", timeout: interactionTimeout });
      const beforeStage = await accountPage
        .getByRole("region", { name: "Current stage" })
        .textContent();
      const accountBeforeStageLabel = (
        await accountPage
          .getByRole("region", { name: "Current stage" })
          .getByRole("heading")
          .textContent()
      )?.trim();

      if (accountBeforeStageLabel !== "Paid") {
        lifecycleFailures.push(
          `${evidenceLifecycleOrderNumber} Account detail must start at Paid; received ${String(accountBeforeStageLabel)}.`,
        );
      }

      const openLifecycleOrder = page.getByRole("button", {
        name: `Open ${orderNumber}`,
      });
      await openLifecycleOrder.click();
      await page
        .locator(".admin-shell__order-detail-header")
        .waitFor({ state: "visible", timeout: interactionTimeout });
      const markButton = page.getByRole("button", {
        name: "Mark Processing",
        exact: true,
      });
      const markLabel =
        (await markButton.textContent())?.trim() ?? "next stage";
      await markButton.click();
      const dialog = page.getByRole("dialog", {
        name: "Confirm lifecycle update",
      });
      await dialog
        .getByLabel("Merchant note (optional)")
        .fill("Evidence: merchant lifecycle update is visible in Account.");
      const mutationResponsePromise = page.waitForResponse(
        (response) =>
          response
            .url()
            .includes(`/api/admin/orders/${actionableOrder.id}/lifecycle`) &&
          response.request().method() === "POST",
        { timeout: interactionTimeout },
      );
      await dialog.getByRole("button", { name: "Confirm update" }).click();
      const mutationResponse = await mutationResponsePromise;
      const mutationResponseBody = await mutationResponse.json();
      const mutationOrderNumber =
        mutationResponseBody?.data?.order?.order_number ?? null;
      const expectedAccountStatus =
        mutationResponse.status() === 200 &&
        mutationResponseBody?.data?.order?.order_number === orderNumber &&
        mutationResponseBody?.data?.order?.status === "processing"
          ? mutationResponseBody.data.order.status
          : null;
      const expectedAccountStatusLabel = expectedAccountStatus
        ? formatEvidenceStatusLabel(expectedAccountStatus)
        : null;
      await page
        .getByRole("status")
        .filter({ hasText: "is now" })
        .waitFor({ state: "visible", timeout: interactionTimeout });

      const refreshResponse = accountPage.waitForResponse(
        (response) =>
          response
            .url()
            .includes(
              `/api/account/orders/${encodeURIComponent(orderNumber)}`,
            ) && response.status() === 200,
        { timeout: interactionTimeout },
      );
      await accountPage.getByRole("button", { name: "Refresh orders" }).click();
      const accountRefreshResponse = await refreshResponse;
      const accountRefreshResponseBody = await accountRefreshResponse
        .json()
        .catch(() => null);
      const accountRefreshApiOrderNumber =
        accountRefreshResponseBody?.data?.order?.order_number ?? null;
      const accountRefreshApiStatus =
        accountRefreshResponseBody?.data?.order?.status ?? null;
      let accountRefreshUiCommitted = false;
      let accountRefreshCommitFailure = null;
      if (
        expectedAccountStatusLabel &&
        accountRefreshApiOrderNumber === orderNumber &&
        accountRefreshApiStatus === expectedAccountStatus
      ) {
        try {
          await waitForExpectedAccountRefresh(
            accountPage,
            orderNumber,
            expectedAccountStatusLabel,
            "Evidence: merchant lifecycle update is visible in Account.",
          );
          accountRefreshUiCommitted = true;
        } catch (error) {
          accountRefreshCommitFailure =
            error instanceof Error ? error.message : String(error);
        }
      }
      const currentStage = accountPage.getByRole("region", {
        name: "Current stage",
      });
      const afterStage = await currentStage.textContent();
      const accountDetailOrderNumber = (
        await accountPage
          .getByRole("heading", { name: orderNumber, exact: true })
          .textContent()
          .catch(() => null)
      )?.trim();
      const accountStatusLabel = (
        await accountPage
          .locator(
            ".account-page__order-detail > .account-page__section-heading .account-page__status-chip",
          )
          .textContent()
      )?.trim();
      const accountCurrentStageLabel = (
        await currentStage.getByRole("heading").textContent()
      )?.trim();
      const accountTimelineCurrentLabel = (
        await accountPage
          .locator(".account-page__timeline-step--current strong")
          .textContent()
          .catch(() => null)
      )?.trim();
      const accountStatusMatchesExpected = Boolean(
        expectedAccountStatus === "processing" &&
        expectedAccountStatusLabel === "Processing" &&
        accountStatusLabel === expectedAccountStatusLabel &&
        accountCurrentStageLabel === expectedAccountStatusLabel &&
        accountTimelineCurrentLabel === expectedAccountStatusLabel,
      );
      const merchantNoteVisible = await currentStage
        .getByText(
          "Evidence: merchant lifecycle update is visible in Account.",
          {
            exact: true,
          },
        )
        .isVisible()
        .catch(() => false);
      const refreshed =
        beforeStage !== afterStage &&
        mutationOrderNumber === orderNumber &&
        accountRefreshApiOrderNumber === orderNumber &&
        accountRefreshApiStatus === expectedAccountStatus &&
        accountRefreshUiCommitted &&
        accountDetailOrderNumber === orderNumber &&
        accountStatusMatchesExpected &&
        merchantNoteVisible;
      lifecycleAccountRefresh = {
        accountEmail,
        accountOrders,
        actionableOrders: actionableOrders.map(
          (candidate) => candidate.order_number,
        ),
        matchedOrderNumber: orderNumber,
        mutationAttempted: true,
        mutationAction: markLabel,
        expectedOrderNumber: evidenceLifecycleOrderNumber,
        expectedPreMutationStatus: "paid",
        preMutationStatus: actionableOrder.status,
        mutationOrderNumber,
        accountBeforeStageLabel,
        beforeStage,
        afterStage,
        expectedAccountStatus,
        expectedAccountStatusLabel,
        accountStatusLabel,
        accountCurrentStageLabel,
        accountTimelineCurrentLabel,
        accountStatusMatchesExpected,
        accountRefreshApiOrderNumber,
        accountRefreshApiStatus,
        accountRefreshUiCommitted,
        accountRefreshCommitFailure,
        accountDetailOrderNumber,
        merchantNoteVisible,
        refreshed,
      };
      if (mutationOrderNumber !== orderNumber) {
        lifecycleFailures.push(
          `The lifecycle mutation response returned ${String(mutationOrderNumber)} instead of ${orderNumber}.`,
        );
      }
      if (accountRefreshApiOrderNumber !== orderNumber) {
        lifecycleFailures.push(
          `The refreshed Account API returned ${String(accountRefreshApiOrderNumber)} instead of ${orderNumber}.`,
        );
      }
      if (accountRefreshApiStatus !== expectedAccountStatus) {
        lifecycleFailures.push(
          `The refreshed Account API returned ${String(accountRefreshApiStatus)} instead of ${String(expectedAccountStatus)}.`,
        );
      }
      if (accountRefreshCommitFailure) {
        lifecycleFailures.push(
          `The Account UI did not commit the refreshed lifecycle state: ${accountRefreshCommitFailure}`,
        );
      }
      if (accountDetailOrderNumber !== orderNumber) {
        lifecycleFailures.push(
          `The refreshed Account detail rendered ${String(accountDetailOrderNumber)} instead of ${orderNumber}.`,
        );
      }
      if (!refreshed) {
        lifecycleFailures.push(
          "The canonical Account detail did not show the exact mutated status, current timeline stage, and merchant note after refresh.",
        );
      }
    }

    let webhookCountAfter = null;
    let webhookCountAfterFailure = null;
    try {
      webhookCountAfter = await fetchWebhookCount(page);
    } catch (error) {
      webhookCountAfterFailure =
        error instanceof Error ? error.message : String(error);
    }

    rows.push(
      await collectRow({
        rowId: "admin-lifecycle-account-refresh-1440",
        targetPage: accountPage,
        checkpoint: lifecycleCheckpoint,
        assertions: {
          lifecycleAccountRefresh,
          webhookCountBefore,
          webhookCountAfter,
          pageState: await readWorkbenchState(accountPage),
        },
        scenarioFailures: lifecycleFailures,
      }),
    );

    rows.push(
      await collectRow({
        rowId: "admin-lifecycle-zero-webhook-growth-1440",
        targetPage: page,
        checkpoint: lifecycleCheckpoint,
        assertions: {
          lifecycleAccountRefresh,
          webhookCountBefore,
          webhookCountAfter,
          webhookCountBeforeFailure,
          webhookCountAfterFailure,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures: [
          ...(!lifecycleAccountRefresh.mutationAttempted
            ? [
                "No eligible Account-owned lifecycle mutation occurred, so zero-growth evidence is incomplete.",
              ]
            : []),
          ...(webhookCountBeforeFailure
            ? [
                `Could not prove the initial webhook count: ${webhookCountBeforeFailure}`,
              ]
            : []),
          ...(webhookCountAfterFailure
            ? [
                `Could not prove the final webhook count: ${webhookCountAfterFailure}`,
              ]
            : []),
          ...(webhookCountBefore !== null &&
          webhookCountAfter !== null &&
          webhookCountAfter !== webhookCountBefore
            ? [
                `Received webhook count changed from ${webhookCountBefore} to ${webhookCountAfter}.`,
              ]
            : []),
        ],
      }),
    );

    await accountPage.close();
  }

  async function fetchAdminJson(targetPage, path) {
    const requestUrl = resolveAdminApiUrl(path);
    return await targetPage.evaluate(async (requestPath) => {
      const token = window.localStorage.getItem(
        "paypal-retail-demo:admin-session",
      );
      const response = await fetch(requestPath, {
        headers: token ? { "x-admin-session": token } : {},
      });
      const responseText = await response.text();
      let body;
      try {
        body = JSON.parse(responseText);
      } catch {
        throw new Error(
          `${requestPath} returned non-JSON ${response.status} ${response.headers.get("content-type") ?? "without content type"}.`,
        );
      }
      if (!response.ok || !body.ok) {
        throw new Error(
          body?.error?.message ?? `Admin request failed (${response.status}).`,
        );
      }
      return body.data;
    }, requestUrl);
  }

  function resolveAdminApiUrl(path) {
    const apiEntry = [...responseEntries]
      .reverse()
      .find((entry) => entry.url.includes("/api/admin/"));
    if (apiEntry) {
      const apiIndex = apiEntry.url.indexOf("/api/");
      return `${apiEntry.url.slice(0, apiIndex)}${path}`;
    }
    return baseUrl.includes(":5173")
      ? `${baseUrl.replace(":5173", ":3000")}${path}`
      : `${baseUrl}${path}`;
  }

  async function fetchWebhookCount(targetPage) {
    const response = await fetchAdminJson(
      targetPage,
      "/api/admin/webhooks?limit=1",
    );
    const totalCount = response?.page_info?.total_count;
    if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
      throw new Error(
        "Webhook evidence response is missing a non-negative integer page_info.total_count.",
      );
    }
    return totalCount;
  }

  function formatEvidenceStatusLabel(status) {
    return status
      .split("_")
      .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
      .join(" ");
  }

  async function signInAndOpenAccountOrders(targetPage) {
    await gotoRoute(targetPage, "/account/orders");
    const existingAccountSession = await targetPage
      .getByRole("button", { name: "Account", exact: true })
      .isVisible()
      .catch(() => false);
    if (existingAccountSession) {
      const existingOrdersResponse = waitForAccountOrdersResponse(targetPage);
      await targetPage.reload({ waitUntil: "domcontentloaded" });
      return await readAccountOrdersResponse(await existingOrdersResponse);
    }

    const signInButton = targetPage
      .getByRole("button", { name: "Sign in", exact: true })
      .first();
    await signInButton.waitFor({
      state: "visible",
      timeout: interactionTimeout,
    });
    await signInButton.click();
    await targetPage.getByLabel("Email").fill(accountEmail);
    await targetPage.getByRole("button", { name: "Continue" }).click();
    await targetPage
      .getByLabel("Password", { exact: true })
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await targetPage
      .getByLabel("Password", { exact: true })
      .fill(accountPassword);
    const accountOrdersResponse = waitForAccountOrdersResponse(targetPage);
    await targetPage.getByRole("button", { name: "Sign in" }).last().click();
    await targetPage
      .getByRole("button", { name: "Account" })
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await targetPage
      .getByRole("dialog")
      .waitFor({ state: "hidden", timeout: interactionTimeout });
    const apiAccountOrders = await readAccountOrdersResponse(
      await accountOrdersResponse,
    );
    await targetPage
      .getByRole("heading", { name: "Order history" })
      .waitFor({ state: "visible", timeout: interactionTimeout });
    await targetPage
      .getByText(/Loading your orders/i)
      .waitFor({ state: "hidden", timeout: interactionTimeout })
      .catch(() => undefined);
    return apiAccountOrders;
  }

  function waitForAccountOrdersResponse(targetPage) {
    return targetPage.waitForResponse(
      (response) =>
        /\/api\/account\/orders(?:\?|$)/.test(response.url()) &&
        response.status() === 200,
      { timeout: interactionTimeout },
    );
  }

  async function readAccountOrdersResponse(response) {
    const responseBody = await response.json();
    return Array.isArray(responseBody?.data?.orders)
      ? responseBody.data.orders.map((order) => order.order_number)
      : [];
  }

  async function collectDiagnosticsRows() {
    await setViewport(page, 1024);
    const paymentCheckpoint = markCheckpoint();
    await openAdminRoute(page, "/admin/diagnostics?dataset=payment");
    const paymentTab = page.getByRole("tab", { name: "Payment" });
    const paymentSelected =
      (await paymentTab.getAttribute("aria-selected")) === "true";
    const paymentDiagnostics = await inspectDiagnosticsDataset(
      page,
      "payment",
      "/api/admin/payment-debug?limit=25",
      paymentCheckpoint,
    );
    const paymentQueryDataset = await page.evaluate(() =>
      new URLSearchParams(window.location.search).get("dataset"),
    );
    const diagnosticsActiveSection = await activeAdminSection(page);
    const diagnosticsHeading = (
      await page.locator("#admin-workbench-title").textContent()
    )?.trim();
    const paymentApiEvidence = findRouteApiEvidence(
      paymentCheckpoint,
      "/api/admin/payment-debug",
    );
    rows.push(
      await collectRow({
        rowId: "admin-diagnostics-payment-tab-1024",
        targetPage: page,
        checkpoint: paymentCheckpoint,
        assertions: {
          diagnosticsDataset: paymentDiagnostics.visibleDataset,
          diagnosticsSanitization: paymentDiagnostics,
          tabSelected: paymentSelected,
          activeSection: diagnosticsActiveSection,
          workbenchHeading: diagnosticsHeading,
          apiEvidence: paymentApiEvidence,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures: [
          ...(paymentSelected
            ? []
            : ["Payment diagnostics tab is not selected."]),
          ...(paymentQueryDataset === "payment"
            ? []
            : ["Payment diagnostics dataset is not URL-backed."]),
          ...(diagnosticsActiveSection === "Diagnostics" &&
          diagnosticsHeading === "Diagnostics"
            ? []
            : [
                "Diagnostics route does not expose its active workbench state.",
              ]),
          ...(paymentApiEvidence
            ? []
            : [
                "Diagnostics route did not produce successful payment-debug API evidence.",
              ]),
          ...diagnosticsFailures("Payment", paymentDiagnostics),
        ],
      }),
    );

    const runtimeCheckpoint = markCheckpoint();
    const runtimeTab = page.getByRole("tab", { name: "Runtime logs" });
    await runtimeTab.click();
    await page.waitForURL(
      (url) => url.searchParams.get("dataset") === "runtime",
      {
        timeout: interactionTimeout,
      },
    );
    await waitForWorkbenchSettled(page);
    const runtimeSelected =
      (await runtimeTab.getAttribute("aria-selected")) === "true";
    const runtimeDiagnostics = await inspectDiagnosticsDataset(
      page,
      "runtime",
      "/api/admin/debug-logs?limit=25",
      runtimeCheckpoint,
    );
    rows.push(
      await collectRow({
        rowId: "admin-diagnostics-runtime-tab-1024",
        targetPage: page,
        checkpoint: runtimeCheckpoint,
        assertions: {
          diagnosticsDataset: runtimeDiagnostics.visibleDataset,
          diagnosticsSanitization: runtimeDiagnostics,
          tabSelected: runtimeSelected,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures: [
          ...(runtimeSelected
            ? []
            : ["Runtime diagnostics tab is not selected."]),
          ...diagnosticsFailures("Runtime", runtimeDiagnostics),
        ],
      }),
    );
  }

  function diagnosticsFailures(label, diagnostics) {
    return [
      ...(diagnostics.visibleDataset === diagnostics.expectedDataset
        ? []
        : [
            `${label} diagnostics did not render the expected ${diagnostics.expectedDataset} dataset.`,
          ]),
      ...(diagnostics.hasResultOrExplicitEmpty
        ? []
        : [
            `${label} diagnostics rendered neither API-backed results nor an explicit empty state.`,
          ]),
      ...(diagnostics.mutationControls.length === 0
        ? []
        : [
            `${label} diagnostics exposed mutation controls: ${diagnostics.mutationControls.join(", ")}.`,
          ]),
      ...(diagnostics.nonReadRequests.length === 0
        ? []
        : [
            `${label} diagnostics issued non-read requests: ${diagnostics.nonReadRequests.join(", ")}.`,
          ]),
      ...(diagnostics.forbiddenApiPaths.length === 0
        ? []
        : [
            `${label} diagnostics API exposed forbidden fields or values: ${diagnostics.forbiddenApiPaths.join(", ")}.`,
          ]),
      ...(diagnostics.forbiddenRenderedEvidence.length === 0
        ? []
        : [
            `${label} diagnostics rendered forbidden evidence: ${diagnostics.forbiddenRenderedEvidence.join(", ")}.`,
          ]),
    ];
  }

  async function inspectDiagnosticsDataset(
    targetPage,
    expectedDataset,
    apiPath,
    checkpoint,
  ) {
    const apiEvidence = await fetchAdminJson(targetPage, apiPath);
    const visibleDataset = await visibleDiagnosticsDataset(targetPage);
    const workbenchState = await readWorkbenchState(targetPage);
    const resultCount = await targetPage
      .locator(".admin-workbench__result-count")
      .textContent()
      .catch(() => null);
    const mutationControls = (
      await targetPage
        .locator(".admin-workbench")
        .getByRole("button")
        .allTextContents()
    )
      .map((label) => label.trim())
      .filter((label) =>
        /\b(mark|save|delete|remove|replay|confirm|edit|update)\b/i.test(label),
      );
    const renderedText = await targetPage
      .locator(".admin-workbench")
      .innerText();
    const forbiddenRenderedEvidence =
      findForbiddenRenderedEvidence(renderedText);
    const nonReadRequests = responseEntries
      .slice(checkpoint.responseIndex)
      .filter(
        (entry) =>
          entry.surface === "admin" &&
          entry.url.includes("/api/admin/") &&
          !["GET", "HEAD"].includes(entry.method),
      )
      .map((entry) => `${entry.method} ${entry.url}`);

    return {
      expectedDataset,
      visibleDataset,
      workbenchState,
      resultCount: resultCount?.trim() ?? null,
      hasResultOrExplicitEmpty:
        (visibleDataset === expectedDataset && Boolean(resultCount?.trim())) ||
        workbenchState === "empty",
      mutationControls,
      nonReadRequests,
      forbiddenApiPaths: findForbiddenDiagnosticApiPaths(apiEvidence),
      forbiddenRenderedEvidence,
    };
  }

  function findForbiddenDiagnosticApiPaths(value, path = "data") {
    const forbiddenKeys = new Set([
      "access_token",
      "admin_passcode",
      "admin_session_token",
      "address",
      "address_line1",
      "address_line2",
      "address_line_1",
      "address_line_2",
      "authorization",
      "auth_token",
      "billing_address",
      "card_number",
      "cart_client_secret",
      "cart_secret",
      "cart_secret_hash",
      "client_secret",
      "client_token",
      "cookie",
      "cvv",
      "cvc",
      "email",
      "full_name",
      "headers_json",
      "merchant_snapshot_json",
      "oauth_token",
      "password",
      "paypal_client_secret",
      "paypal_client_token",
      "phone",
      "raw_payload",
      "recipient_name",
      "request_json",
      "response_json",
      "security_code",
      "shipping_address",
      "street",
      "supabase_key",
      "webhook_payload",
    ]);
    const findings = [];

    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        findings.push(
          ...findForbiddenDiagnosticApiPaths(entry, `${path}[${index}]`),
        );
      });
      return findings;
    }
    if (value && typeof value === "object") {
      for (const [key, entry] of Object.entries(value)) {
        const entryPath = `${path}.${key}`;
        if (forbiddenKeys.has(key.toLowerCase())) {
          findings.push(entryPath);
        }
        findings.push(...findForbiddenDiagnosticApiPaths(entry, entryPath));
      }
      return findings;
    }
    if (
      typeof value === "string" &&
      (/\bBearer\s+[A-Za-z0-9._~-]+/i.test(value) ||
        /\b(?:adm_|cart_secret_|access_token=|client_secret=)/i.test(value) ||
        /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value))
    ) {
      findings.push(path);
    }
    return findings;
  }

  function findForbiddenRenderedEvidence(renderedText) {
    const findings = [];
    for (const pattern of [
      /\bBearer\s+[A-Za-z0-9._~-]+/i,
      /\b(?:adm_|cart_secret_|access_token=|client_secret=)/i,
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
      /\b(?:request_json|response_json|raw_payload|headers_json)\b/i,
    ]) {
      if (pattern.test(renderedText)) {
        findings.push(pattern.source);
      }
    }
    return findings;
  }

  async function visibleDiagnosticsDataset(targetPage) {
    return await targetPage
      .locator("[data-diagnostics-dataset]")
      .getAttribute("data-diagnostics-dataset")
      .catch(() => null);
  }

  async function collectKeyboardRow() {
    const checkpoint = markCheckpoint();
    await setViewport(page, 375);
    await openAdminRoute(page, "/admin/orders");
    const trigger = page.getByRole("button", { name: "Filters", exact: true });
    await trigger.focus();
    const focusBefore = await page.evaluate(() =>
      document.activeElement?.textContent?.trim(),
    );
    await page.keyboard.press("Enter");
    const sheet = page.getByRole("dialog", { name: "Orders filters" });
    await sheet.waitFor({ state: "visible", timeout: interactionTimeout });
    const openedWithKeyboard = await sheet.isVisible();
    await page.keyboard.press("Escape");
    await sheet.waitFor({ state: "hidden", timeout: interactionTimeout });
    await page.waitForTimeout(50);
    const focusReturned = await trigger.evaluate(
      (element) => document.activeElement === element,
    );
    const keyboardOperation = {
      focusBefore,
      openedWithKeyboard,
      closedWithEscape: !(await sheet.isVisible()),
      focusReturned,
    };
    rows.push(
      await collectRow({
        rowId: "admin-keyboard-navigation-375",
        targetPage: page,
        checkpoint,
        assertions: {
          keyboardOperation,
          pageState: await readWorkbenchState(page),
        },
        scenarioFailures:
          openedWithKeyboard && focusReturned
            ? []
            : [
                "Mobile Filters did not support Enter, Escape, and trigger focus return.",
              ],
      }),
    );
  }

  async function collectPageStateRows() {
    await setViewport(page, 768);
    await openAdminRoute(page, "/admin/orders");
    const loadingCheckpoint = markCheckpoint();
    const refreshButton = page.getByRole("button", {
      name: "Refresh",
      exact: true,
    });
    const loadingEvidence = await observeRealOrdersLoadingState(
      page,
      refreshButton,
    );
    const { loadingObserved } = loadingEvidence;
    rows.push(
      await collectRow({
        rowId: "admin-loading-state-768",
        targetPage: page,
        checkpoint: loadingCheckpoint,
        assertions: {
          pageState: loadingObserved
            ? "loading"
            : await readWorkbenchState(page),
          ...loadingEvidence,
        },
        screenshotAlreadyCaptured: loadingEvidence.loadingScreenshotCaptured,
        scenarioFailures: loadingEvidence.loadingObservationFailure
          ? [loadingEvidence.loadingObservationFailure]
          : loadingObserved
            ? []
            : ["The real Refresh transition did not render its loading state."],
      }),
    );

    const emptyCheckpoint = markCheckpoint();
    await setViewport(page, 1024);
    await openAdminRoute(
      page,
      "/admin/orders?order_number=EVIDENCE-NO-SUCH-ORDER-000000",
    );
    const filteredEmpty = await page
      .getByText("No orders match these filters.", { exact: true })
      .isVisible()
      .catch(() => false);
    rows.push(
      await collectRow({
        rowId: "admin-filtered-empty-state-1024",
        targetPage: page,
        checkpoint: emptyCheckpoint,
        assertions: {
          pageState: filteredEmpty
            ? "filtered-empty"
            : await readWorkbenchState(page),
          filteredEmpty,
        },
        scenarioFailures: filteredEmpty
          ? []
          : [
              "The impossible server filter did not render the filtered-empty state.",
            ],
      }),
    );

    const errorCheckpoint = markCheckpoint();
    await setViewport(page, 1440);
    await gotoRoute(page, "/admin/orders?status=definitely_invalid");
    await page
      .locator("#admin-workbench-title")
      .waitFor({ state: "visible", timeout: interactionTimeout });
    const alert = page.locator(".admin-workbench__state[role='alert']");
    await alert.waitFor({ state: "visible", timeout: interactionTimeout });
    const pageState = (await alert.textContent())?.trim() ? "error" : "unknown";
    rows.push(
      await collectRow({
        rowId: "admin-error-state-1440",
        targetPage: page,
        checkpoint: errorCheckpoint,
        assertions: {
          pageState,
          errorMessage: (await alert.textContent())?.trim() ?? null,
        },
        expectedResponse: (entry) =>
          entry.status === 400 &&
          entry.url.includes("/api/admin/orders") &&
          entry.url.includes("status=definitely_invalid"),
        expectedConsole: (entry) =>
          entry.text.includes("status of 400") &&
          entry.location?.url?.includes("status=definitely_invalid"),
        scenarioFailures:
          pageState === "error"
            ? []
            : ["The real invalid filter did not render an error state."],
      }),
    );
  }

  async function readWorkbenchState(targetPage) {
    const state = targetPage.locator(".admin-workbench__state").first();
    if (await state.isVisible().catch(() => false)) {
      if ((await state.getAttribute("role")) === "alert") {
        return "error";
      }
      if ((await state.getAttribute("aria-busy")) === "true") {
        return "loading";
      }
      const text = (await state.textContent())?.trim().toLowerCase() ?? "";
      return text.startsWith("no ") ? "empty" : "state";
    }
    return "ready";
  }

  async function collectRow({
    rowId,
    targetPage,
    checkpoint,
    assertions,
    screenshotAlreadyCaptured = false,
    scenarioFailures = [],
    expectedResponse = () => false,
    expectedConsole = () => false,
  }) {
    const screenshotPath = `${outputPrefix}-${rowId}.png`;
    if (!screenshotAlreadyCaptured) {
      if (targetPage === page) {
        await page.screenshot({ path: screenshotPath, fullPage: true });
      } else {
        await targetPage.screenshot({ path: screenshotPath, fullPage: true });
      }
    }
    const metrics = await measurePage(targetPage);
    const observedConsoleIssues = consoleEntries.slice(checkpoint.consoleIndex);
    const ignoredConsoleIssues = observedConsoleIssues.filter(
      (entry) => isKnownExternalConsoleIssue(entry) || expectedConsole(entry),
    );
    const consoleIssues = observedConsoleIssues.filter(
      (entry) => !isKnownExternalConsoleIssue(entry) && !expectedConsole(entry),
    );
    const responseIssues = responseEntries
      .slice(checkpoint.responseIndex)
      .filter((entry) => entry.status >= 400 && !expectedResponse(entry));
    const failures = [...scenarioFailures];

    if (consoleIssues.length > 0) {
      failures.push(`Observed ${consoleIssues.length} console/page error(s).`);
    }
    if (responseIssues.length > 0) {
      failures.push(
        `Observed ${responseIssues.length} unexpected HTTP error response(s).`,
      );
    }
    if (metrics.horizontalOverflow > 0) {
      failures.push(
        `Page-level horizontal overflow is ${metrics.horizontalOverflow}px.`,
      );
    }
    if (
      metrics.minimumInteractiveTarget &&
      (metrics.minimumInteractiveTarget.width < 44 ||
        metrics.minimumInteractiveTarget.height < 44)
    ) {
      failures.push(
        `Smallest interactive target is ${metrics.minimumInteractiveTarget.width}x${metrics.minimumInteractiveTarget.height}px (${metrics.minimumInteractiveTarget.label}).`,
      );
    }
    if (metrics.stickyFixedOcclusionCount > 0) {
      failures.push(
        `${metrics.stickyFixedOcclusionCount} visible control/content target(s) are occluded by sticky or fixed UI.`,
      );
    }

    return {
      rowId,
      url: targetPage.url(),
      viewport: targetPage.viewportSize(),
      screenshotPath,
      consoleIssues,
      ignoredConsoleIssues,
      responseIssues,
      horizontalOverflow: metrics.horizontalOverflow,
      minimumInteractiveTarget: metrics.minimumInteractiveTarget,
      stickyFixedOcclusionCount: metrics.stickyFixedOcclusionCount,
      ...assertions,
      failures,
    };
  }

  function isKnownExternalConsoleIssue(entry) {
    if (
      entry.surface !== "admin" ||
      entry.location?.url?.startsWith(`${baseUrl}/admin/`) !== true
    ) {
      return false;
    }
    return (
      (entry.type === "error" && entry.text === knownGooglePayManifestIssue) ||
      (entry.type === "error" &&
        entry.text === knownGooglePayManifestUnavailableIssue) ||
      (entry.type === "warning" && entry.text === knownGooglePayManifestWarning)
    );
  }

  async function measurePage(targetPage) {
    return await targetPage.evaluate(async () => {
      const root = document.documentElement;
      const body = document.body;
      const horizontalOverflow = Math.max(
        0,
        Math.ceil(
          Math.max(root.scrollWidth, body?.scrollWidth ?? 0) - root.clientWidth,
        ),
      );
      const targetSelector =
        "a[href], button, input, select, textarea, [role='button'], [role='tab']";
      const targets = [...document.querySelectorAll(targetSelector)]
        .flatMap((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (
            style.display === "none" ||
            style.visibility === "hidden" ||
            Number(style.opacity) === 0 ||
            rect.width === 0 ||
            rect.height === 0
          ) {
            return [];
          }
          const type = element instanceof HTMLInputElement ? element.type : "";
          const hitElement =
            type === "checkbox" || type === "radio"
              ? (element.closest("label") ?? element)
              : element;
          const hitRect = hitElement.getBoundingClientRect();
          return [
            {
              width: Math.round(hitRect.width * 10) / 10,
              height: Math.round(hitRect.height * 10) / 10,
              label:
                element.getAttribute("aria-label") ??
                element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) ??
                element.tagName.toLowerCase(),
            },
          ];
        })
        .sort(
          (left, right) =>
            Math.min(left.width, left.height) -
            Math.min(right.width, right.height),
        );

      const occlusionTargets = [
        ...document.querySelectorAll(
          "h1, h2, h3, a[href], button, input, select, textarea",
        ),
      ];
      const occlusionCandidates = new Set();
      const occluded = new Set();
      const maxScroll = Math.max(
        0,
        Math.max(root.scrollHeight, body?.scrollHeight ?? 0) -
          window.innerHeight,
      );
      const representativeScrollPositions = [
        ...new Set([0, Math.round(maxScroll / 2), maxScroll]),
      ];

      function occlusionSamplePoints(rect) {
        const left = Math.max(1, rect.left + 2);
        const right = Math.min(window.innerWidth - 2, rect.right - 2);
        const top = Math.max(1, rect.top + 2);
        const bottom = Math.min(window.innerHeight - 2, rect.bottom - 2);
        if (left > right || top > bottom) {
          return [];
        }
        return [
          { x: (left + right) / 2, y: (top + bottom) / 2 },
          { x: left, y: top },
          { x: right, y: top },
          { x: left, y: bottom },
          { x: right, y: bottom },
        ];
      }

      function visibleStickyFixedOverlays() {
        return [...document.querySelectorAll("body *")].filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            (style.position === "fixed" || style.position === "sticky") &&
            style.visibility !== "hidden" &&
            Number(style.opacity) > 0 &&
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < window.innerHeight
          );
        });
      }

      function isTargetOccluded(target, overlays) {
        const style = getComputedStyle(target);
        const rect = target.getBoundingClientRect();
        if (
          style.visibility === "hidden" ||
          Number(style.opacity) === 0 ||
          rect.width === 0 ||
          rect.height === 0 ||
          rect.bottom <= 0 ||
          rect.top >= window.innerHeight
        ) {
          return false;
        }

        return occlusionSamplePoints(rect).some((point) => {
          const topElement = document.elementFromPoint(point.x, point.y);
          if (
            !topElement ||
            topElement === target ||
            target.contains(topElement)
          ) {
            return false;
          }
          return overlays.some(
            (overlay) =>
              (overlay === topElement || overlay.contains(topElement)) &&
              !overlay.contains(target),
          );
        });
      }

      for (const scrollPosition of representativeScrollPositions) {
        window.scrollTo(0, scrollPosition);
        await new Promise((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(resolve),
          ),
        );
        const overlays = visibleStickyFixedOverlays();

        for (const target of occlusionTargets) {
          if (isTargetOccluded(target, overlays)) {
            occlusionCandidates.add(target);
          }
        }
      }

      for (const target of occlusionCandidates) {
        target.scrollIntoView({ block: "center", inline: "nearest" });
        await new Promise((resolve) =>
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(resolve),
          ),
        );
        if (isTargetOccluded(target, visibleStickyFixedOverlays())) {
          occluded.add(target);
        }
      }
      window.scrollTo(0, 0);

      return {
        horizontalOverflow,
        minimumInteractiveTarget: targets[0] ?? null,
        stickyFixedOcclusionCount: occluded.size,
      };
    });
  }
}

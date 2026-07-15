import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = new URL("../../", import.meta.url);

function readProjectFile(path: string): string {
  return readFileSync(new URL(path, repoRoot), "utf8");
}

function sliceBetween(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  expect(start, `Missing ${startMarker}`).toBeGreaterThan(-1);
  expect(end, `Missing ${endMarker}`).toBeGreaterThan(start);
  return source.slice(start, end);
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
    const accountCommitHelper = sliceBetween(
      helperSource,
      "async function waitForExpectedAccountRefresh",
      "async function observeRealOrdersLoadingState",
    );
    const loadingStateHelper = sliceBetween(
      helperSource,
      "async function observeRealOrdersLoadingState",
      "async function activeAdminSection",
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

  it("uses retryable commit navigation without replaying lifecycle mutations", () => {
    const helperSource = readProjectFile(
      join("tools", "post-purchase-operations-evidence.playwright.js"),
    );
    const safeNavigationHelper = sliceBetween(
      helperSource,
      "async function retrySafeNavigation",
      "async function gotoRoute",
    );
    const gotoRouteHelper = sliceBetween(
      helperSource,
      "async function gotoRoute",
      "async function reloadRoute",
    );
    const reloadRouteHelper = sliceBetween(
      helperSource,
      "async function reloadRoute",
      "async function openAdminRoute",
    );
    const openAdminRouteHelper = sliceBetween(
      helperSource,
      "async function openAdminRoute",
      "async function waitForWorkbenchSettled",
    );
    const accountOrdersHelper = sliceBetween(
      helperSource,
      "async function signInAndOpenAccountOrders",
      "function waitForAccountOrdersResponse",
    );
    const accountDetailHelper = sliceBetween(
      helperSource,
      "async function openAccountOrderDetail",
      "async function signInAndOpenAccountOrders",
    );
    const lifecycleCollectionHelper = sliceBetween(
      helperSource,
      "async function collectLifecycleAndAccountRows",
      "async function fetchAdminJson",
    );
    const isolatedAccountHelper = sliceBetween(
      helperSource,
      "async function createIsolatedAccountPage",
      "async function signInAndOpenAccountOrders",
    );

    expect(helperSource).toContain("async function retrySafeNavigation");
    expect(helperSource).toContain("async function reloadRoute");
    expect(safeNavigationHelper).toContain('waitUntil: "commit"');
    expect(helperSource).toContain(
      "const navigationTimeout = isRenderHostedBaseUrl ? 60000 : 30000",
    );
    expect(helperSource).toContain("const navigationAttemptLimit = 2");
    expect(helperSource).toContain(
      "const navigationRetryBudget = navigationTimeout * navigationAttemptLimit",
    );
    expect(safeNavigationHelper).toContain(
      "navigationAttempt < navigationAttemptLimit",
    );
    expect(safeNavigationHelper).toContain('error.name === "TimeoutError"');
    expect(safeNavigationHelper).toContain('"net::ERR_ABORTED"');
    expect(safeNavigationHelper).toContain("targetPage.goto");
    expect(safeNavigationHelper).toContain("targetPage.reload");
    expect(safeNavigationHelper).toContain("switch (navigationKind)");
    expect(safeNavigationHelper).toContain("Unsupported safe navigation kind");
    expect(safeNavigationHelper).not.toContain(".click(");
    expect(safeNavigationHelper).not.toContain('method: "POST"');
    expect(gotoRouteHelper).toContain('"goto"');
    expect(reloadRouteHelper).toContain('"reload"');
    expect(helperSource).not.toContain('waitUntil: "domcontentloaded"');
    expect(helperSource).toContain("const routeReadinessTimeout =");
    expect(helperSource).toContain("async function openAccountOrderDetail");

    expect(openAdminRouteHelper).toContain(
      "locator(\"nav[aria-label='Admin sections']\")",
    );
    expect(openAdminRouteHelper).toContain("await waitForAdminAuthSurface");
    expect(openAdminRouteHelper).toContain('locator("#admin-workbench-title")');
    expect(openAdminRouteHelper).toContain("await waitForWorkbenchSettled");
    expect(lifecycleCollectionHelper).toContain(
      "await createIsolatedAccountPage(page)",
    );
    expect(lifecycleCollectionHelper).toContain("await accountContext.close()");
    expect(isolatedAccountHelper).toContain("sourcePage.context().browser()");
    expect(isolatedAccountHelper).toContain("await browser.newContext()");
    expect(isolatedAccountHelper).toContain("await accountContext.newPage()");
    expect(accountOrdersHelper).not.toContain("waitForAccountAuthSurface");
    expect(accountOrdersHelper).not.toContain("existingAccountSession");
    expect(accountOrdersHelper).not.toContain("reloadRoute(targetPage)");
    expect(accountOrdersHelper).toContain(
      "const [ordersResponse] = await Promise.all([",
    );
    expect(accountOrdersHelper).toContain(
      '.waitFor({ state: "visible", timeout: routeReadinessTimeout })',
    );
    expect(accountOrdersHelper).toContain(
      '.waitFor({ state: "hidden", timeout: routeReadinessTimeout })',
    );
    expect(accountOrdersHelper).not.toContain(
      "await readAccountOrdersResponse(\n      await accountOrdersResponse",
    );
    expect(accountOrdersHelper).toContain(
      'getByRole("heading", { name: "Order history" })',
    );
    expect(accountDetailHelper).toContain(
      "const accountDetailResponsePromise = waitForAccountOrderDetailResponse",
    );
    expect(accountDetailHelper).toContain("gotoRoute(");
    expect(accountDetailHelper).toContain("accountDetailResponsePromise,");
    expect(accountDetailHelper).toContain("await Promise.all([");
    expect(accountDetailHelper).toContain("routeReadinessTimeout");
    expect(accountDetailHelper).toContain("navigationRetryBudget");
    expect(accountDetailHelper).toContain("response.status() !== 200");
    expect(accountDetailHelper).not.toContain(".click(");
    expect(accountDetailHelper).not.toContain("new URL(");
    expect(
      accountDetailHelper.indexOf("accountDetailResponsePromise"),
    ).toBeLessThan(accountDetailHelper.indexOf("gotoRoute("));
    expect(helperSource).toContain(
      "await openAccountOrderDetail(accountPage, orderNumber)",
    );
    expect(helperSource.match(/retrySafeNavigation\(/g)?.length).toBe(3);

    const lifecycleMutationSource = sliceBetween(
      helperSource,
      "const mutationResponsePromise",
      "const mutationResponse = await mutationResponsePromise",
    );
    expect(lifecycleMutationSource).toContain(
      'getByRole("button", { name: "Confirm update" }).click()',
    );
    expect(lifecycleMutationSource).not.toContain("retrySafeNavigation");
  });

  it("behaviorally retries only supported transient page navigation", async () => {
    const helperSource = readProjectFile(
      join("tools", "post-purchase-operations-evidence.playwright.js"),
    );
    const helper = sliceBetween(
      helperSource,
      "async function retrySafeNavigation",
      "async function gotoRoute",
    );
    const retrySafeNavigation = Function(
      "navigationTimeout",
      "navigationAttemptLimit",
      `${helper}; return retrySafeNavigation;`,
    )(30000, 2) as (
      targetPage: {
        goto: (url: string, options: unknown) => Promise<unknown>;
        reload: (options: unknown) => Promise<unknown>;
      },
      navigationKind: string,
      url?: string | null,
    ) => Promise<unknown>;

    const transientCases = [
      {
        label: "TimeoutError",
        createError() {
          const error = new Error("navigation timed out");
          error.name = "TimeoutError";
          return error;
        },
      },
      {
        label: "ERR_ABORTED",
        createError: () =>
          new Error("page.goto: net::ERR_ABORTED at https://example.test"),
      },
      {
        label: "ERR_CONNECTION_CLOSED",
        createError: () =>
          new Error(
            "page.goto: net::ERR_CONNECTION_CLOSED at https://example.test",
          ),
      },
      {
        label: "ERR_CONNECTION_RESET",
        createError: () =>
          new Error(
            "page.goto: net::ERR_CONNECTION_RESET at https://example.test",
          ),
      },
    ] as const;

    for (const navigationKind of ["goto", "reload"] as const) {
      for (const transientCase of transientCases) {
        let gotoCalls = 0;
        let reloadCalls = 0;
        const transientPage = {
          async goto() {
            gotoCalls += 1;
            if (gotoCalls === 1) {
              throw transientCase.createError();
            }
            return "goto-complete";
          },
          async reload() {
            reloadCalls += 1;
            if (reloadCalls === 1) {
              throw transientCase.createError();
            }
            return "reload-complete";
          },
        };

        await expect(
          retrySafeNavigation(
            transientPage,
            navigationKind,
            navigationKind === "goto" ? "https://example.test" : undefined,
          ),
          `${navigationKind} should retry ${transientCase.label}`,
        ).resolves.toBe(`${navigationKind}-complete`);
        expect(gotoCalls).toBe(navigationKind === "goto" ? 2 : 0);
        expect(reloadCalls).toBe(navigationKind === "reload" ? 2 : 0);
      }

      let persistentCalls = 0;
      const persistentPage = {
        async goto() {
          persistentCalls += 1;
          throw new Error(
            "page.goto: net::ERR_CONNECTION_RESET at https://example.test",
          );
        },
        async reload() {
          persistentCalls += 1;
          throw new Error(
            "page.reload: net::ERR_CONNECTION_RESET at https://example.test",
          );
        },
      };
      await expect(
        retrySafeNavigation(
          persistentPage,
          navigationKind,
          navigationKind === "goto" ? "https://example.test" : undefined,
        ),
      ).rejects.toThrow("net::ERR_CONNECTION_RESET");
      expect(persistentCalls).toBe(2);
    }

    for (const nearMissError of [
      Object.assign(new Error("navigation timed out"), {
        name: "TimeoutErrorSuffix",
      }),
      new Error("page.goto: net::ERR_ABORTEDISH at https://example.test"),
      new Error(
        "page.goto: net::ERR_CONNECTION_CLOSED_LATE at https://example.test",
      ),
      new Error("certificate rejected"),
    ]) {
      let nearMissCalls = 0;
      const nearMissPage = {
        async goto() {
          nearMissCalls += 1;
          throw nearMissError;
        },
        async reload() {
          nearMissCalls += 1;
          throw nearMissError;
        },
      };
      await expect(
        retrySafeNavigation(nearMissPage, "goto", "https://example.test"),
      ).rejects.toThrow();
      expect(nearMissCalls).toBe(1);
    }

    let unknownCalls = 0;
    const unknownPage = {
      async goto() {
        unknownCalls += 1;
        return "unexpected";
      },
      async reload() {
        unknownCalls += 1;
        return "unexpected";
      },
    };
    await expect(
      retrySafeNavigation(unknownPage, "post", "https://example.test"),
    ).rejects.toThrow("Unsupported safe navigation kind");
    expect(unknownCalls).toBe(0);

    let missingUrlCalls = 0;
    const missingUrlPage = {
      async goto() {
        missingUrlCalls += 1;
        return "unexpected";
      },
      async reload() {
        missingUrlCalls += 1;
        return "unexpected";
      },
    };
    await expect(retrySafeNavigation(missingUrlPage, "goto")).rejects.toThrow(
      "requires a URL",
    );
    expect(missingUrlCalls).toBe(0);
  });

  it("builds retained metrics paths only from safe evidence run ids", () => {
    const runnerSource = readProjectFile(
      join("tools", "run-post-purchase-operations-evidence.mjs"),
    );
    const helper = sliceBetween(
      runnerSource,
      "function resolveEvidenceMetricsArtifact",
      "async function unlockAdminSession",
    );
    expect(runnerSource).toContain(
      'artifact.runId ? { flag: "wx" } : undefined',
    );
    const resolveEvidenceMetricsArtifact = Function(
      `${helper}; return resolveEvidenceMetricsArtifact;`,
    )() as (
      outputPrefix: string,
      requestedRunId?: string,
    ) => { runId: string | null; metricsPath: string };

    expect(
      resolveEvidenceMetricsArtifact("/tmp/post-purchase", " final-a "),
    ).toEqual({
      runId: "final-a",
      metricsPath: "/tmp/post-purchase-final-a-metrics.json",
    });
    expect(resolveEvidenceMetricsArtifact("/tmp/post-purchase")).toEqual({
      runId: null,
      metricsPath: "/tmp/post-purchase-metrics.json",
    });
    expect(() =>
      resolveEvidenceMetricsArtifact("/tmp/post-purchase", "../overwrite"),
    ).toThrow("PAYPAL_RETAIL_EVIDENCE_RUN_ID");
    expect(() =>
      resolveEvidenceMetricsArtifact("/tmp/post-purchase", "unsafe/id"),
    ).toThrow("PAYPAL_RETAIL_EVIDENCE_RUN_ID");
  });

  it("matches only the exact Account order-detail GET", async () => {
    const helperSource = readProjectFile(
      join("tools", "post-purchase-operations-evidence.playwright.js"),
    );
    const helper = sliceBetween(
      helperSource,
      "function waitForAccountOrderDetailResponse",
      "async function signInAndOpenAccountOrders",
    );
    const navigationTimeoutMatch = helperSource.match(
      /const navigationTimeout = isRenderHostedBaseUrl \? (\d+) : \d+;/,
    );
    const navigationAttemptLimitMatch = helperSource.match(
      /const navigationAttemptLimit = (\d+);/,
    );
    const routeReadinessTimeoutMatch = helperSource.match(
      /const routeReadinessTimeout = isRenderHostedBaseUrl\s*\? (\d+)/,
    );
    expect(navigationTimeoutMatch).not.toBeNull();
    expect(navigationAttemptLimitMatch).not.toBeNull();
    expect(routeReadinessTimeoutMatch).not.toBeNull();
    const hostedNavigationTimeout = Number(navigationTimeoutMatch?.[1]);
    const navigationAttemptLimit = Number(navigationAttemptLimitMatch?.[1]);
    const hostedRouteReadinessTimeout = Number(routeReadinessTimeoutMatch?.[1]);
    const navigationRetryBudget =
      hostedNavigationTimeout * navigationAttemptLimit;
    const waitForAccountOrderDetailResponse = Function(
      "routeReadinessTimeout",
      "navigationRetryBudget",
      `${helper}; return waitForAccountOrderDetailResponse;`,
    )(hostedRouteReadinessTimeout, navigationRetryBudget) as (
      targetPage: {
        waitForResponse: (
          matcher: (response: {
            request: () => { method: () => string };
            url: () => string;
          }) => boolean,
          options: { timeout: number },
        ) => Promise<unknown>;
      },
      orderNumber: string,
    ) => Promise<unknown>;
    let responseMatcher:
      | ((response: {
          request: () => { method: () => string };
          url: () => string;
        }) => boolean)
      | undefined;
    let responseTimeout = 0;
    const targetPage = {
      async waitForResponse(
        matcher: NonNullable<typeof responseMatcher>,
        options: { timeout: number },
      ) {
        responseMatcher = matcher;
        responseTimeout = options.timeout;
        return null;
      },
    };
    await waitForAccountOrderDetailResponse(targetPage, "DO-20260714-900001");
    const response = (url: string, method = "GET") => ({
      request: () => ({ method: () => method }),
      url: () => url,
    });

    expect(
      responseMatcher?.(
        response(
          "https://paypal-retail-demo.onrender.com/api/account/orders/DO-20260714-900001",
        ),
      ),
    ).toBe(true);
    expect(
      responseMatcher?.(
        response(
          "https://paypal-retail-demo.onrender.com/api/account/orders/DO-20260714-900001?refresh=1",
        ),
      ),
    ).toBe(true);
    expect(
      responseMatcher?.(
        response(
          "https://paypal-retail-demo.onrender.com/api/account/orders/DO-20260714-900001/items/line-1/review",
        ),
      ),
    ).toBe(false);
    expect(
      responseMatcher?.(
        response(
          "https://paypal-retail-demo.onrender.com/api/account/orders/DO-20260714-900001",
          "POST",
        ),
      ),
    ).toBe(false);
    expect(responseTimeout).toBe(180000);
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

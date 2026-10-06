import { expect, test, type Locator, type Page, type Route, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const promoteEvidence = process.env.TASK0008_CAPTURE_EVIDENCE === "1";
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0003");
if (promoteEvidence) mkdirSync(evidenceDirectory, { recursive: true });

function screenshotPath(testInfo: TestInfo, name: string, promote = false) {
  const fileName = `${testInfo.project.name}-${name}.png`;
  return promoteEvidence && promote ? resolve(evidenceDirectory, fileName) : testInfo.outputPath(fileName);
}

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

function expectOnlyNetworkErrors(errors: readonly string[], count: number) {
  expect(errors).toHaveLength(count);
  for (const error of errors) {
    expect(error).toMatch(/Failed to load resource: (net::ERR_FAILED|the server responded with a status of (409|503))/);
  }
}

async function setTheme(page: Page, theme: "light" | "dark") {
  const toggle = page.locator(".icon-button");
  const current = (await toggle.getAttribute("aria-label"))?.includes("light") ? "dark" : "light";
  const explicit = await page.locator("html").getAttribute("data-theme");
  if (current !== theme) {
    await toggle.click();
  } else if (explicit !== theme) {
    await toggle.click();
    await toggle.click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  await expect(toggle).toHaveAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe(theme);
}

async function expectInteractionQuality(page: Page, focusTarget: Locator) {
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    undersized: [...document.querySelectorAll<HTMLElement>("button,input:not([type=checkbox])")]
      .filter((element) => element.getClientRects().length > 0)
      .filter((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.width < 44 || bounds.height < 44;
      })
      .map((element) => element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.tagName),
  }));
  expect(metrics).toEqual({ overflow: false, undersized: [] });

  await page.locator("body").click({ position: { x: 2, y: 2 } });
  for (let index = 0; index < 20 && !(await focusTarget.evaluate((element) => element === document.activeElement)); index += 1) {
    await page.keyboard.press("Tab");
  }
  await expect(focusTarget).toBeFocused();
  expect(await focusTarget.evaluate((element) => {
    const style = getComputedStyle(element);
    return element.matches(":focus-visible") && style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  })).toBe(true);
}

async function captureThemes(page: Page, testInfo: TestInfo, state: string, focusTarget: Locator) {
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectInteractionQuality(page, focusTarget);
    await page.screenshot({ path: screenshotPath(testInfo, `${state}-${theme}`, true), fullPage: true });
  }
}

const review = {
  intentId: INTENT_ID, quoteId: QUOTE_ID, tier: "go", cadence: "monthly",
  base: { currency: "USD", cents: 1000 }, promotion: { currency: "USD", cents: -500 }, taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055, tax: { currency: "USD", cents: 53 }, dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2027-07-15T19:15:00.000Z", renewsAt: "2027-08-15T19:00:00.000Z", allowanceResetsAt: "2027-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles", pricingVersion: "go-monthly-intro-v1", taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

async function stubProvider(page: Page, readiness: "pending" | "ready") {
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await page.addInitScript((key) => {
    localStorage.setItem(key, JSON.stringify({
      access_token: "redacted-e2e-access",
      refresh_token: "redacted-e2e-refresh",
      expires_at: 4_102_444_800,
      expires_in: 86_400,
      token_type: "bearer",
      user: { id: "44444444-4444-4444-8444-444444444444", aud: "authenticated", role: "authenticated", email: "customer@example.test" },
    }));
  },`sb-${new URL(process.env.VITE_SUPABASE_URL??"https://task0007.supabase.test").hostname.split('.')[0]}-auth-token`);
  await page.route("**/api/v1/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(review) }));
  await page.route("**/api/v1/paypal/id-token", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ idToken: "ID-TOKEN-REDACTED", fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true } }) }));
  await page.route("https://c.paypal.com/da/r/fb.js", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "void 0;" }));
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.paypal={Buttons:(options)=>({isEligible:()=>true,render:async(container)=>{const label=document.createElement('small');label.textContent='Simulated provider control';container.appendChild(label);const button=document.createElement('button');button.textContent='Pay with PayPal';button.style.minHeight='44px';button.onclick=async()=>{try{const orderID=await options.createOrder();await options.onApprove({orderID});}catch(error){options.onError(error);}};container.appendChild(button);},close:()=>Promise.resolve()})};` }));
  await page.route("**/api/v1/paypal/orders", async (route) => {
    const input = await route.request().postDataJSON();
    expect(input.clientMetadataId).toMatch(/^[a-f0-9]{32}$/);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ready", operationId: input.operationId, orderId: "ORDER-REDACTED" }) });
  });
  await page.route("**/api/v1/paypal/orders/*/capture", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ operationId: "33333333-3333-4333-8333-333333333333", funding: "verified", reusableReadiness: readiness, customerMessage: readiness === "ready" ? "PayPal Wallet is ready for future recurring payments." : "Payment verified. Reusable payment setup is finishing." }) }));
}

async function loadProviderControl(page: Page) {
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toBeVisible();
}

async function expectNonceParity(page: Page) {
  const proof = await page.evaluate(() => {
    const nonce = document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content ?? "";
    return {
      nonce,
      fraudNetNonce: document.querySelector<HTMLScriptElement>('script[fncls]')?.nonce ?? "",
      loaderNonce: document.querySelector<HTMLScriptElement>('script[src="https://c.paypal.com/da/r/fb.js"]')?.nonce ?? "",
    };
  });
  expect(proof.nonce).toBeTruthy();
  expect(proof.fraudNetNonce).toBe(proof.nonce);
  expect(proof.loaderNonce).toBe(proof.nonce);
}

test("TC-0006 review surface is bounded and accessible in both themes", async ({ page }, testInfo) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: testInfo.project.name === "chromium" ? 1280 : 375, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await stubProvider(page, "ready");
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await loadProviderControl(page);
  await expectNonceParity(page);
  for (const theme of ["light", "dark"] as const) {
    await setTheme(page, theme);
    await expectInteractionQuality(page, page.getByRole("button", { name: "Pay with PayPal" }));
  const quoteOrder = await page.locator(".summary-card").evaluate((summary) => {
    const provider = document.querySelector(".paypal-provider-region")!;
    const financialRows = [...summary.querySelectorAll("dl > div,.quote-facts > p")];
    const quoteBounds = summary.getBoundingClientRect();
    const controlBounds = provider.getBoundingClientRect();
    return {
      completeRows: financialRows.length,
      allRowsBeforeControl: financialRows.every((row) => Boolean(row.compareDocumentPosition(provider) & Node.DOCUMENT_POSITION_FOLLOWING)),
      visualQuoteFirst: quoteBounds.bottom <= controlBounds.top || quoteBounds.right <= controlBounds.left,
    };
  });
  expect(quoteOrder).toEqual({ completeRows: 9, allRowsBeforeControl: true, visualQuoteFirst: true });
    await page.screenshot({ path: screenshotPath(testInfo, `quote-before-control-${theme}`), fullPage: true });
  }
  expect(consoleErrors).toEqual([]);
});

for (const readiness of ["pending", "ready"] as const) {
  test(`TC-0006 official SDK control hands verified funding to ${readiness} reusable readiness`, async ({ page }, testInfo) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.emulateMedia({ colorScheme: "light" });
    await stubProvider(page, readiness);
    await page.goto(`/checkout/${INTENT_ID}`);
    await loadProviderControl(page);
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Preparing your Go workspace" })).toBeVisible();
    await expect(page.locator(".handoff-status").filter({ hasText: "Funding" })).toContainText("Verified");
    await expect(page.getByText("Ready to activate")).toBeVisible();
    await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open Go workspace" })).toBeVisible();
    await expectInteractionQuality(page, page.locator(".icon-button"));
    expect(consoleErrors).toEqual([]);
    await captureThemes(
      page,
      testInfo,
      readiness === "ready" ? "task-0008-vault-ready" : "task-0008-vault-pending",
      page.locator(".icon-button"),
    );
  });
}

test("TC-0006 cancellation returns to review and grants nothing", async ({ page }, testInfo) => {
  const consoleErrors = collectConsoleErrors(page);
  await stubProvider(page, "ready");
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.paypal={Buttons:(options)=>({isEligible:()=>true,render:async(container)=>{const label=document.createElement('small');label.textContent='Simulated provider control';container.appendChild(label);const cancel=document.createElement('button');cancel.textContent='Cancel PayPal';cancel.style.minHeight='44px';cancel.onclick=()=>options.onCancel();container.appendChild(cancel);},close:()=>Promise.resolve()})};` }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.getByRole("button", { name: "Cancel PayPal" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await captureThemes(page, testInfo, "task-0008-cancel", page.getByRole("button", { name: "Cancel PayPal" }));
  expect(consoleErrors).toEqual([]);
});

test("TC-0006 capture failure returns to retryable review and grants nothing", async ({ page }, testInfo) => {
  const consoleErrors = collectConsoleErrors(page);
  await stubProvider(page, "ready");
  await page.unroute("**/api/v1/paypal/orders/*/capture");
  await page.route("**/api/v1/paypal/orders/*/capture", (route) => route.fulfill({ status: 409, contentType: "application/json", body: '{"error":{"code":"payment_not_available"}}' }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await loadProviderControl(page);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Payment was not completed" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await captureThemes(page, testInfo, "task-0008-failure", page.getByRole("button", { name: "Try PayPal again" }));
  expectOnlyNetworkErrors(consoleErrors, 1);
});

test("TC-0005 definitive create failure retries with a fresh application operation", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await stubProvider(page, "ready");
  const operationIds: string[] = [];
  let createRequests = 0;
  await page.unroute("**/api/v1/paypal/orders");
  await page.route("**/api/v1/paypal/orders", async (route) => {
    createRequests += 1;
    const input = await route.request().postDataJSON();
    operationIds.push(input.operationId);
    if (createRequests === 1) {
      return route.fulfill({ status: 409, contentType: "application/json", body: '{"error":{"code":"payment_not_available"}}' });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ready", operationId: input.operationId, orderId: "ORDER-RETRY-REDACTED" }) });
  });

  await page.goto(`/checkout/${INTENT_ID}`);
  await loadProviderControl(page);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Payment was not completed" })).toBeVisible();
  await page.getByRole("button", { name: "Try PayPal again" }).click();
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Preparing your Go workspace" })).toBeVisible();

  expect(operationIds).toHaveLength(2);
  expect(operationIds[1]).not.toBe(operationIds[0]);
  expectOnlyNetworkErrors(consoleErrors, 1);
});

for (const uncertainty of ["aborted", "server-5xx", "malformed", "unknown"] as const) {
  test(`TC-0005 ${uncertainty} create keeps the same operation pending`, async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await stubProvider(page, "ready");
    const operationIds = new Set<string>();
    let createRequests = 0;
    let captureRequests = 0;
    await page.unroute("**/api/v1/paypal/orders");
    await page.route("**/api/v1/paypal/orders", async (route) => {
      createRequests += 1;
      const input = await route.request().postDataJSON();
      operationIds.add(input.operationId);
      if (uncertainty === "aborted") return route.abort();
      if (uncertainty === "server-5xx") return route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"internal_error"}}' });
      if (uncertainty === "malformed") return route.fulfill({ status: 200, contentType: "application/json", body: "not-json" });
      return route.fulfill({ status: 200, contentType: "application/json", body: '{"status":"unknown"}' });
    });
    await page.unroute("**/api/v1/paypal/orders/*/capture");
    await page.route("**/api/v1/paypal/orders/*/capture", (route) => {
      captureRequests += 1;
      return route.abort();
    });

    await page.goto(`/checkout/${INTENT_ID}`);
    await loadProviderControl(page);
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment was not completed" })).toHaveCount(0);
    await page.getByRole("button", { name: "Check payment status" }).click();
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();

    expect(createRequests).toBe(2);
    expect(operationIds.size).toBe(1);
    expect(captureRequests).toBe(0);
    if (uncertainty === "aborted" || uncertainty === "server-5xx") expectOnlyNetworkErrors(consoleErrors, 2);
    else expect(consoleErrors).toEqual([]);
  });
}

for (const uncertainty of ["aborted", "server-5xx"] as const) {
  test(`TC-0006 ${uncertainty} capture keeps the same operation pending`, async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await stubProvider(page, "ready");
    const operationIds = new Set<string>();
    await page.unroute("**/api/v1/paypal/orders");
    await page.route("**/api/v1/paypal/orders", async (route) => {
      const input = await route.request().postDataJSON();
      operationIds.add(input.operationId);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "ready", operationId: input.operationId, orderId: "ORDER-REDACTED" }),
      });
    });
    await page.unroute("**/api/v1/paypal/orders/*/capture");
    await page.route("**/api/v1/paypal/orders/*/capture", (route) => uncertainty === "aborted"
      ? route.abort()
      : route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"internal_error"}}' }));

    await page.goto(`/checkout/${INTENT_ID}`);
    await loadProviderControl(page);
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
    await expect(page.getByText("Payment was not completed.")).toHaveCount(0);
    await page.getByRole("button", { name: "Check payment status" }).click();
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
    expect(operationIds.size).toBe(1);
    expectOnlyNetworkErrors(consoleErrors, 2);
  });
}

test("TC-0005 unresolved create ownership stays pending without capture or terminal copy", async ({ page }) => {
  const consoleErrors = collectConsoleErrors(page);
  await stubProvider(page, "ready");
  let createRequests = 0;
  let captureRequests = 0;
  const operationIds = new Set<string>();
  const metadataIds = new Set<string>();
  await page.unroute("**/api/v1/paypal/orders");
  await page.route("**/api/v1/paypal/orders", async (route) => {
    createRequests += 1;
    const input = await route.request().postDataJSON();
    operationIds.add(input.operationId);
    metadataIds.add(input.clientMetadataId);
    return route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({
        status: "in_progress",
        operationId: input.operationId,
        retryable: true,
      }),
    });
  });
  await page.unroute("**/api/v1/paypal/orders/*/capture");
  await page.route("**/api/v1/paypal/orders/*/capture", (route) => {
    captureRequests += 1;
    return route.abort();
  });

  await page.goto(`/checkout/${INTENT_ID}`);
  await loadProviderControl(page);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();

  await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
  await expect(page.getByText("Payment was not completed.")).toHaveCount(0);
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(page.getByRole("button", { name: "Pay with PayPal" })).toBeVisible();
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
  expect(createRequests).toBe(2);
  expect(operationIds.size).toBe(1);
  expect(metadataIds.size).toBe(1);
  expect(captureRequests).toBe(0);
  expect(consoleErrors).toEqual([]);
});

test("TC-0006 in-progress capture stays pending and can return to a safe status retry", async ({ page }, testInfo) => {
  const consoleErrors = collectConsoleErrors(page);
  await page.emulateMedia({ colorScheme: "light" });
  await stubProvider(page, "ready");
  await page.unroute("**/api/v1/paypal/orders/*/capture");
  await page.route("**/api/v1/paypal/orders/*/capture", (route) => route.fulfill({
    status: 202,
    contentType: "application/json",
    body: JSON.stringify({
      operationId: "33333333-3333-4333-8333-333333333333",
      funding: "pending",
      reusableReadiness: "pending",
      customerMessage: "Payment verification is still in progress.",
    }),
  }));

  await page.goto(`/checkout/${INTENT_ID}`);
  await loadProviderControl(page);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();

  await expect(page.getByRole("heading", { name: "Confirming your payment" })).toBeVisible();
  await expect(page.locator(".handoff-status").filter({ hasText: "Funding" })).toContainText("Pending");
  await expect(page.getByRole("heading", { name: "Preparing your Go workspace" })).toHaveCount(0);
  await captureThemes(page, testInfo, "task-0008-pending", page.getByRole("button", { name: "Check payment status" }));
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test.skip("@sandbox @hosted real PayPal SDK, FraudNet, capture, and webhook evidence", async () => {
  // Requires an orchestrator-supplied hosted URL and configured direct sandbox merchant.
});

test("preparation stays loading until render and manually retries without payment", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: testInfo.project.name === "chromium" ? 1280 : 375, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/*", (route) => new URL(route.request().url()).hostname === "127.0.0.1" ? route.fallback() : route.abort());
  await stubProvider(page, "ready");
  let tokenRequests = 0;
  let paymentRequests = 0;
  await page.route("**/api/v1/paypal/id-token", (route) => {
    tokenRequests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ idToken: "SYNTHETIC", fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true } }) });
  });
  await page.route("**/api/v1/paypal/orders**", (route) => { paymentRequests += 1; return route.abort(); });
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `
    window.syntheticClosed=window.syntheticClosed||0;
    window.paypal={Buttons:()=>({isEligible:()=>true,render:(container)=>new Promise((resolve,reject)=>{
      window.syntheticRenders=(window.syntheticRenders||0)+1;
      window.syntheticFinish=()=>{const button=document.createElement('button');button.textContent='Simulated PayPal control';button.style.minHeight='44px';container.appendChild(button);resolve();};
      window.syntheticReject=()=>reject(new Error('private-provider-detail'));
    }),close:async()=>{window.syntheticClosed++;}})};` }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { syntheticFinish?: unknown }).syntheticFinish)).toBe("function");
  const initialTokenRequests = tokenRequests;
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Preparing secure PayPal checkout" })).toBeVisible();
  await expect(page.getByText("Secure PayPal checkout ready", { exact: true })).toHaveCount(0);
  const region = page.locator(".paypal-provider-region");
  const loadingHeight = await region.evaluate((element) => element.getBoundingClientRect().height);
  await page.screenshot({ path: testInfo.outputPath("preparation-loading-light.png"), fullPage: true });
  await page.evaluate(() => (window as unknown as { syntheticReject(): void }).syntheticReject());
  const retry = page.getByRole("button", { name: "Try loading PayPal again" });
  await expect(retry).toBeVisible();
  await expect(page.getByRole("heading", { name: "Payment was not completed" })).toHaveCount(0);
  await expect(page.getByText("private-provider-detail")).toHaveCount(0);
  await expect(page.locator('script[src="https://c.paypal.com/da/r/fb.js"]')).toHaveCount(0);
  await captureThemes(page, testInfo, "preparation-failed", retry);
  expect(await page.locator(".paypal-provider-region .warning-note p").evaluate((element) => getComputedStyle(element).color === getComputedStyle(document.body).color)).toBe(true);
  expect(await region.evaluate((element) => element.getBoundingClientRect().height)).toBe(loadingHeight);
  expect(tokenRequests).toBe(initialTokenRequests);
  await page.keyboard.press("Enter");
  await expect.poll(() => tokenRequests).toBe(initialTokenRequests + 1);
  await expect(page.getByText("Preparing secure PayPal checkout…", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator('script[src="https://c.paypal.com/da/r/fb.js"]').count()).toBe(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { syntheticRenders: number }).syntheticRenders)).toBe(2);
  await page.evaluate(() => (window as unknown as { syntheticFinish(): void }).syntheticFinish());
  await expect(page.getByText("Secure PayPal checkout ready", { exact: true })).toBeVisible();
  await captureThemes(page, testInfo, "preparation-ready", page.getByRole("button", { name: "Simulated PayPal control" }));
  expect(await region.evaluate((element) => element.getBoundingClientRect().height)).toBe(loadingHeight);
  expect(paymentRequests).toBe(0);
  expect(await page.evaluate(() => (window as unknown as { syntheticClosed: number }).syntheticClosed)).toBeGreaterThan(0);
});

test("expired review never bootstraps PayPal", async ({ page }) => {
  await stubProvider(page, "ready");
  let tokenRequests = 0;
  await page.route("**/api/v1/paypal/id-token", (route) => { tokenRequests += 1; return route.abort(); });
  await page.route("**/api/v1/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...review, expiresAt: "2020-01-01T00:00:00Z" }) }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.getByText("Review expired", { exact: true })).toBeVisible();
  await expect(page.locator(".paypal-area")).toHaveCount(0);
  expect(tokenRequests).toBe(0);
});

test("expiry removes pending SDK resources and rejects late payment callbacks", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T00:00:00Z") });
  await stubProvider(page, "ready");
  await page.route("**/api/v1/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...review, expiresAt: "2026-10-04T00:01:00Z" }) }));
  let paymentRequests = 0;
  await page.route("**/api/v1/paypal/orders**", (route) => { paymentRequests += 1; return route.abort(); });
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.syntheticClosed=0;window.paypal={Buttons:(options)=>{window.syntheticOptions=options;return {isEligible:()=>true,render:()=>new Promise(resolve=>{window.syntheticLate=resolve}),close:async()=>{window.syntheticClosed++}}}};` }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { syntheticLate: unknown }).syntheticLate)).toBe("function");
  await page.clock.runFor(60_001);
  await expect(page.getByText("Review expired", { exact: true })).toBeVisible();
  await expect(page.locator(".paypal-area,script[fncls],script[src*='paypal.com/sdk/js'],script[src='https://c.paypal.com/da/r/fb.js']")).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const target = window as unknown as { syntheticLate(): void; syntheticClosed: number; syntheticOptions: { createOrder(): Promise<string>; onApprove(data: { orderID: string }): Promise<void>; onCancel(): void } };
    target.syntheticLate();
    let rejected = false;
    try { await target.syntheticOptions.createOrder(); } catch { rejected = true; }
    await target.syntheticOptions.onApprove({ orderID: "SYNTHETIC" });
    target.syntheticOptions.onCancel();
    return { rejected, closed: target.syntheticClosed };
  });
  expect(result).toEqual({ rejected: true, closed: 1 });
  expect(paymentRequests).toBe(0);
  await expect(page.getByText("Secure PayPal checkout ready", { exact: true })).toHaveCount(0);
});

test("mounted quote and credential replacements invalidate late token and FraudNet callbacks", async ({ page }) => {
  await stubProvider(page, "ready");
  const tokens: Route[] = [];
  const fraudScripts: Route[] = [];
  let sdkRequests = 0;
  let paymentRequests = 0;
  await page.route("**/api/v1/paypal/id-token", (route) => { tokens.push(route); });
  await page.route("https://c.paypal.com/da/r/fb.js", (route) => { fraudScripts.push(route); });
  await page.route("https://www.paypal.com/sdk/js**", (route) => { sdkRequests += 1; return route.abort(); });
  await page.route("**/api/v1/paypal/orders**", (route) => { paymentRequests += 1; return route.abort(); });
  await page.goto("/");
  const loadedModules = await page.evaluate(() => performance.getEntriesByType("resource").map((entry) => entry.name));
  await page.clock.install({ time: new Date("2026-10-04T00:00:00Z") });
  await page.evaluate(async ({ review, loadedModules,taskRuntime }) => {
    const reactPath = loadedModules.find((name) => /\/react\.js\?/.test(name));
    const clientPath = loadedModules.find((name) => /\/react-dom_client\.js\?/.test(name));
    if (!taskRuntime&&(!reactPath || !clientPath)) throw new Error("synthetic_runtime_modules_unavailable");
    const componentPath = "/src/components/checkout/quote-review.tsx";
    const taskPath="/assets/task0011-runtime.js";
    const runtime=taskRuntime?await import(taskPath):null;
    const React = runtime?.React??(await import(reactPath!)).default;
    const { createRoot } = runtime??(await import(clientPath!)).default;
    const { QuoteReview } = runtime??await import(componentPath);
    const host = document.createElement("div");
    host.id = "synthetic-mounted-review";
    document.body.appendChild(host);
    const root = createRoot(host);
    const target = window as unknown as { syntheticUpdate(change: Record<string, unknown>): void; syntheticUnmount(): void };
    let props = { review, stale: false, busy: false, accessToken: "synthetic-first", nonce: document.querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')?.content??"synthetic-nonce", onReplace: () => {} };
    target.syntheticUpdate = (change) => { props = { ...props, ...change }; root.render(React.createElement(QuoteReview, props)); };
    target.syntheticUnmount = () => root.unmount();
    target.syntheticUpdate({});
  }, { review, loadedModules,taskRuntime:process.env.TASK0011_LOCAL==="1" });
  await expect.poll(() => tokens.length).toBe(1);
  await page.evaluate(() => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate({ accessToken: "synthetic-second" }));
  await expect.poll(() => tokens.length).toBe(2);
  const bootstrap = { idToken: "SYNTHETIC", fraudNet: { sourceId: "AI_SERVICE_STUDIO_CHECKOUT", sandbox: true } };
  await tokens[0].fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrap) });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(fraudScripts).toHaveLength(0);
  await tokens[1].fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrap) });
  await expect.poll(() => fraudScripts.length).toBe(1);
  await page.evaluate(() => {
    const target = window as unknown as { syntheticOldFraudLoad: unknown };
    target.syntheticOldFraudLoad = document.querySelector<HTMLScriptElement>('script[src="https://c.paypal.com/da/r/fb.js"]')?.onload;
  });
  await page.evaluate((review) => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate({ review: { ...review, quoteId: "55555555-5555-4555-8555-555555555555" } }), review);
  await expect.poll(() => tokens.length).toBe(3);
  await expect(page.locator('script[fncls],script[src="https://c.paypal.com/da/r/fb.js"]')).toHaveCount(0);
  await fraudScripts[0].fulfill({ status: 200, contentType: "application/javascript", body: "void 0;" });
  await page.evaluate(() => (window as unknown as { syntheticOldFraudLoad(event: Event): void }).syntheticOldFraudLoad(new Event("load")));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(sdkRequests).toBe(0);
  await page.evaluate(() => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate({ busy: true }));
  await expect(page.locator("#synthetic-mounted-review .paypal-area")).toHaveCount(0);
  await tokens[2].fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrap) });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(fraudScripts).toHaveLength(1);
  for (const change of [{ busy: false, accessToken: "" }, { accessToken: "synthetic-third", stale: true }]) {
    await page.evaluate((change) => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate(change), change);
    await expect(page.locator("#synthetic-mounted-review .paypal-area")).toHaveCount(0);
  }
  expect(tokens).toHaveLength(3);
  await page.clock.setSystemTime(new Date("2026-10-05T00:00:00Z"));
  await page.evaluate((review) => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate({ stale: false, review: { ...review, expiresAt: "2026-10-04T12:00:00Z" } }), review);
  await expect(page.locator("#synthetic-mounted-review .paypal-area")).toHaveCount(0);
  expect(tokens).toHaveLength(3);
  await page.evaluate((review) => (window as unknown as { syntheticUpdate(change: Record<string, unknown>): void }).syntheticUpdate({ review }), review);
  await expect.poll(() => tokens.length).toBe(4);
  await page.evaluate(() => (window as unknown as { syntheticUnmount(): void }).syntheticUnmount());
  await tokens[3].fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(bootstrap) });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  expect(fraudScripts).toHaveLength(1);
  expect(sdkRequests).toBe(0);
  expect(paymentRequests).toBe(0);
});

test("unmounted pending SDK download cannot construct or ready a late control", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T00:00:00Z") });
  await stubProvider(page, "ready");
  await page.route("**/api/v1/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...review, expiresAt: "2026-10-04T00:01:00Z" }) }));
  let download: Route | undefined;
  let paymentRequests = 0;
  await page.route("**/api/v1/paypal/orders**", (route) => { paymentRequests += 1; return route.abort(); });
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => { download = route; });
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect.poll(() => Boolean(download)).toBe(true);
  await page.evaluate(() => {
    const script = document.querySelector<HTMLScriptElement>('script[src*="paypal.com/sdk/js"]');
    const target = window as unknown as { syntheticSdkLoad: unknown; syntheticConstructed: number };
    target.syntheticSdkLoad = script?.onload;
    target.syntheticConstructed = 0;
  });
  await expect(page.getByText("Preparing secure PayPal checkout…", { exact: true })).toBeVisible();
  await page.clock.runFor(60_001);
  await expect(page.getByText("Review expired", { exact: true })).toBeVisible();
  await expect(page.locator(".paypal-area,script[fncls],script[src*='paypal.com/sdk/js'],script[src='https://c.paypal.com/da/r/fb.js']")).toHaveCount(0);
  await download!.fulfill({ status: 200, contentType: "application/javascript", body: "window.syntheticDownloadCompleted=true;window.paypal={Buttons:()=>{window.syntheticConstructed++;return {isEligible:()=>true,render:async()=>{},close:async()=>{}}}};" });
  const constructed = await page.evaluate(async () => {
    const target = window as unknown as { paypal: unknown; syntheticSdkLoad(event: Event): void; syntheticConstructed: number };
    // Force the captured real loader's success callback after detached download completion.
    // This exercises the provider subscription cleanup even if the browser cancels detached scripts.
    target.paypal = { Buttons: () => { target.syntheticConstructed += 1; return { isEligible: () => true, render: async () => {}, close: async () => {} }; } };
    target.syntheticSdkLoad(new Event("load"));
    await Promise.resolve(); await Promise.resolve();
    return target.syntheticConstructed;
  });
  expect(constructed).toBe(0);
  expect(paymentRequests).toBe(0);
  await expect(page.getByText("Secure PayPal checkout ready", { exact: true })).toHaveCount(0);
  await expect(page.locator(".paypal-area,script[fncls],script[src*='paypal.com/sdk/js'],script[src='https://c.paypal.com/da/r/fb.js']")).toHaveCount(0);
});
import "./support/task0011-browser-network.js";

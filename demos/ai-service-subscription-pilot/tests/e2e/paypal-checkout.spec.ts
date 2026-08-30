import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
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
  await page.addInitScript(() => {
    localStorage.setItem("sb-task0007-auth-token", JSON.stringify({
      access_token: "redacted-e2e-access",
      refresh_token: "redacted-e2e-refresh",
      expires_at: 4_102_444_800,
      expires_in: 86_400,
      token_type: "bearer",
      user: { id: "44444444-4444-4444-8444-444444444444", aud: "authenticated", role: "authenticated", email: "customer@example.test" },
    }));
  });
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
  await page.getByLabel("Save my PayPal Wallet for future recurring Go payments.").check();
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
  await page.emulateMedia({ colorScheme: "light" });
  await stubProvider(page, "ready");
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await loadProviderControl(page);
  await expectNonceParity(page);
  await captureThemes(page, testInfo, "review", page.getByRole("button", { name: "Pay with PayPal" }));
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
    await expect(page.getByText("Not granted yet")).toBeVisible();
    await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /workspace|continue/i })).toHaveCount(0);
    await expectInteractionQuality(page, page.locator(".icon-button"));
    expect(consoleErrors).toEqual([]);
    if (readiness === "ready") {
      await captureThemes(page, testInfo, "ready", page.locator(".icon-button"));
    } else {
      await page.screenshot({ path: screenshotPath(testInfo, "reusable-pending-light"), fullPage: true });
    }
  });
}

test("TC-0006 cancellation returns to review and grants nothing", async ({ page }, testInfo) => {
  await stubProvider(page, "ready");
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.paypal={Buttons:(options)=>({isEligible:()=>true,render:async(container)=>{const label=document.createElement('small');label.textContent='Simulated provider control';container.appendChild(label);const cancel=document.createElement('button');cancel.textContent='Cancel PayPal';cancel.style.minHeight='44px';cancel.onclick=()=>options.onCancel();container.appendChild(cancel);},close:()=>Promise.resolve()})};` }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await page.getByLabel("Save my PayPal Wallet for future recurring Go payments.").check();
  await expect(page.getByRole("button", { name: "Cancel PayPal" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await page.screenshot({ path: screenshotPath(testInfo, "cancel"), fullPage: true });
});

test("TC-0006 capture failure returns to retryable review and grants nothing", async ({ page }, testInfo) => {
  await stubProvider(page, "ready");
  await page.unroute("**/api/v1/paypal/orders/*/capture");
  await page.route("**/api/v1/paypal/orders/*/capture", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":{"code":"payment_not_available"}}' }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await loadProviderControl(page);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Payment was not completed" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await page.screenshot({ path: screenshotPath(testInfo, "capture-failure"), fullPage: true });
});

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
  await captureThemes(page, testInfo, "funding-pending", page.getByRole("button", { name: "Check payment status" }));
  await page.getByRole("button", { name: "Check payment status" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test.skip("@sandbox @hosted real PayPal SDK, FraudNet, capture, and webhook evidence", async () => {
  // Requires an orchestrator-supplied hosted URL and configured direct sandbox merchant.
});

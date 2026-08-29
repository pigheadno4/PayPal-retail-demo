import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const SUCCESSOR_ID = "33333333-3333-4333-8333-333333333333";
const PERSISTENT_EMAIL = "persistent-fixture@example.test";
const TEMPORARY_EMAIL = "demo-redacted@test";
const OTP_FIXTURE = "000000";
const SESSION_COOKIE_FIXTURE = "redacted-origin-proof";
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0002");
mkdirSync(evidenceDirectory, { recursive: true });

const review = (overrides: Record<string, unknown> = {}) => ({
  intentId: INTENT_ID,
  quoteId: QUOTE_ID,
  tier: "go",
  cadence: "monthly",
  base: { currency: "USD", cents: 1000 },
  promotion: { currency: "USD", cents: -500 },
  taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055,
  tax: { currency: "USD", cents: 53 },
  dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2027-08-29T04:15:00.000Z",
  renewsAt: "2027-09-29T04:00:00.000Z",
  allowanceResetsAt: "2027-09-29T04:00:00.000Z",
  timeZone: "America/Los_Angeles",
  pricingVersion: "go-monthly-intro-v1",
  taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
  ...overrides,
});

async function installSelection(page: Page) {
  await page.route("**/api/v1/checkout-intents", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    headers: { "Set-Cookie": `ai_demo_session=${SESSION_COOKIE_FIXTURE}; HttpOnly; SameSite=Lax; Path=/` },
    body: JSON.stringify({ intentId: INTENT_ID, tier: "go", cadence: "monthly", state: "selected" }),
  }));
}

async function installSupabaseVerification(page: Page) {
  await page.route("**/auth/v1/verify**", async (route) => {
    const body = route.request().postDataJSON() as Record<string, string>;
    expect(body.type).toBe("email");
    expect(body.token).toBe(OTP_FIXTURE);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "redacted-e2e-access",
        refresh_token: "redacted-e2e-refresh",
        expires_in: 86_400,
        expires_at: 4_102_444_800,
        token_type: "bearer",
        user: {
          id: "44444444-4444-4444-8444-444444444444",
          aud: "authenticated",
          role: "authenticated",
          email: body.email,
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-08-29T04:00:00.000Z",
        },
      }),
    });
  });
}

async function expectResponsiveBoundary(page: Page) {
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    undersized: [...document.querySelectorAll("button,input:not([type=radio])")]
      .filter((element) => element.getBoundingClientRect().height < 44).length,
  }));
  expect(metrics).toEqual({ overflow: false, undersized: 0 });
  await expect(page.getByRole("button", { name: /paypal|pay with|card|apple pay|google pay/i })).toHaveCount(0);
}

async function expectLoadedLocalFonts(page: Page) {
  const proof = await page.evaluate(async () => {
    await document.fonts.ready;
    const heading = document.querySelector("h1");
    if (!heading) throw new Error("heading_missing");
    return {
      bodyFamily: getComputedStyle(document.body).fontFamily,
      headingFamily: getComputedStyle(heading).fontFamily,
      interfaceReady: document.fonts.check('400 16px "Source Sans 3 Variable"'),
      displayReady: document.fonts.check('600 48px "Fraunces Variable"'),
      loadedUrls: performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((url) => url.includes("/assets/") && url.endsWith(".woff2")),
    };
  });
  expect(proof.bodyFamily).toContain("Source Sans 3 Variable");
  expect(proof.headingFamily).toContain("Fraunces Variable");
  expect(proof.interfaceReady).toBe(true);
  expect(proof.displayReady).toBe(true);
  expect(proof.loadedUrls.length).toBeGreaterThanOrEqual(2);
}

test("TC-0002 selection and persistent Supabase identity resume the same intent", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const providerRequests: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("request", (request) => {
    if (/paypal|stripe/i.test(request.url())) providerRequests.push(request.url());
  });

  await installSelection(page);
  await installSupabaseVerification(page);
  await page.route("**/api/v1/quotes?**", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(review()),
  }));
  await page.route("**/api/v1/auth/request-otp", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      intentId: INTENT_ID,
      identityRoute: "persistent",
      email: PERSISTENT_EMAIL,
    });
    await route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' });
  });
  await page.route(`**/api/v1/checkout-intents/${INTENT_ID}/resume`, async (route) => {
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    expect(route.request().headers().cookie).toContain("ai_demo_session=");
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(review()) });
  });

  await page.goto("/");
  await expectLoadedLocalFonts(page);
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: resolve(evidenceDirectory, "task-0007-choose-go-laptop.png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Choose Go Monthly" }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${INTENT_ID}$`));
  await page.getByLabel("Email address").fill(PERSISTENT_EMAIL);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Verification code").fill(OTP_FIXTURE);
  await page.getByRole("button", { name: "Verify and review" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  await expect(page.getByText("$5.53", { exact: true })).toBeVisible();
  await expect(page.getByText("Payment step not started")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: resolve(evidenceDirectory, "task-0007-review-laptop.png"), fullPage: true });
  }
  expect(providerRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("TC-0003 temporary alias reveals and consumes OTP only in browser A", async ({ page, browser, baseURL }) => {
  await installSelection(page);
  await installSupabaseVerification(page);
  await page.route("**/api/v1/demo-sessions", (route) => route.fulfill({
    status: 201,
    contentType: "application/json",
    body: JSON.stringify({ email: TEMPORARY_EMAIL, expiresAt: "2026-08-30T04:00:00.000Z" }),
  }));
  await page.route("**/api/v1/auth/request-otp", (route) => route.fulfill({
    status: 202,
    contentType: "application/json",
    body: '{"accepted":true}',
  }));
  await page.route("**/api/v1/demo-sessions/otp", (route) => {
    const hasOrigin = route.request().headers().cookie?.includes("ai_demo_session=");
    return route.fulfill(hasOrigin ? {
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ otp: OTP_FIXTURE, expiresAt: "2026-08-29T04:05:00.000Z" }),
    } : {
      status: 404,
      contentType: "application/json",
      body: '{"error":{"code":"not_found"}}',
    });
  });
  await page.route(`**/api/v1/checkout-intents/${INTENT_ID}/resume`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(review()),
  }));

  await page.goto("/");
  await page.getByRole("button", { name: "Choose Go Monthly" }).click();
  await page.getByLabel("24-hour demo address").check();
  await page.getByRole("button", { name: "Send verification code" }).click();
  await expect(page.getByText(TEMPORARY_EMAIL, { exact: false })).toBeVisible();

  const browserB: BrowserContext = await browser.newContext();
  try {
    await browserB.route("**/api/v1/demo-sessions/otp", (route) => {
      const hasOrigin = route.request().headers().cookie?.includes("ai_demo_session=");
      return route.fulfill({
        status: hasOrigin ? 200 : 404,
        contentType: "application/json",
        body: hasOrigin ? JSON.stringify({ otp: OTP_FIXTURE }) : '{"error":{"code":"not_found"}}',
      });
    });
    const pageB = await browserB.newPage();
    await pageB.goto(baseURL ?? "http://127.0.0.1:3000");
    const browserBStatus = await pageB.evaluate(async () => (await fetch("/api/v1/demo-sessions/otp")).status);
    expect(browserBStatus).toBe(404);
  } finally {
    await browserB.close();
  }

  await page.getByRole("button", { name: "Retrieve this browser’s demo code" }).click();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
});

test("TC-0004 stale review exposes one replacement and no payment action", async ({ page }) => {
  const stale = review({ expiresAt: "2026-08-28T04:15:00.000Z" });
  await installSelection(page);
  await installSupabaseVerification(page);
  await page.route("**/api/v1/auth/request-otp", (route) => route.fulfill({
    status: 202,
    contentType: "application/json",
    body: '{"accepted":true}',
  }));
  await page.route(`**/api/v1/checkout-intents/${INTENT_ID}/resume`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(stale),
  }));
  await page.route("**/api/v1/quotes", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ intentId: INTENT_ID, currentQuoteId: QUOTE_ID });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ review: review({ quoteId: SUCCESSOR_ID }), replacementCreated: true }),
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Choose Go Monthly" }).click();
  await page.getByLabel("Email address").fill(PERSISTENT_EMAIL);
  await page.getByRole("button", { name: "Send verification code" }).click();
  await page.getByLabel("Verification code").fill(OTP_FIXTURE);
  await page.getByRole("button", { name: "Verify and review" }).click();
  await expect(page.getByText("Review expired")).toBeVisible();
  await page.getByRole("button", { name: "Refresh review" }).click();
  await expect(page.getByText("Current review", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: /pay|paypal|card/i })).toHaveCount(0);
});

test("mobile light and dark identity/review surfaces remain usable", async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.getByRole("heading", { name: "Keep your Go selection" })).toBeVisible();
  await expectResponsiveBoundary(page);
  const themeButton = page.getByRole("button", { name: "Switch to dark theme" });
  await themeButton.focus();
  await expect(themeButton).toBeFocused();
  await themeButton.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => ({
    foregroundVariable: getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim(),
    backgroundVariable: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    bodyForegroundVariable: getComputedStyle(document.body).getPropertyValue("--foreground").trim(),
    body: getComputedStyle(document.body).color,
    brand: getComputedStyle(document.querySelector<HTMLElement>(".brand")!).color,
    selectionAmount: getComputedStyle(document.querySelector<HTMLElement>(".selection-summary strong")!).color,
  }))).toEqual({
    foregroundVariable: "#fff6ef",
    backgroundVariable: "#201a1b",
    bodyForegroundVariable: "#fff6ef",
    body: "rgb(255, 246, 239)",
    brand: "rgb(255, 246, 239)",
    selectionAmount: "rgb(201, 183, 175)",
  });
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: resolve(evidenceDirectory, "task-0007-identity-mobile-dark.png"), fullPage: true });
  }
  expect(consoleErrors).toEqual([]);
});

test.skip("@hosted originating-session isolation", async () => {
  // Requires an orchestrator-supplied Render URL and configured Supabase Send Email Hook.
});

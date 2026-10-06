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
const evidenceDirectory = resolve("/private/tmp/task0005-email-only-local");
mkdirSync(evidenceDirectory, { recursive: true });

const forbiddenRequests = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page, context, baseURL }) => {
  const forbidden: string[] = [];
  forbiddenRequests.set(page, forbidden);
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/^\/api\/v1\/(demo-sessions|paypal\/(orders|wallet)|usage|me\/activation)(?:\/|$)/.test(url.pathname)) {
      forbidden.push("forbidden_identity_operation");
    }
  });
  // Page-specific fixtures take precedence. Any unmatched API or external call
  // stops here rather than reaching a real provider or the local database.
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL??"http://127.0.0.1:3000").origin || /^\/(api|webhooks)(?:\/|$)/.test(url.pathname)) {
      forbidden.push("unmocked_request");
      await route.abort();
    } else await route.continue();
  });
  // Approved checkbox-free TASK-0009 preparation is non-paying; all loaders are synthetic.
  await page.route("**/api/v1/paypal/id-token",route=>route.fulfill({json:{idToken:"synthetic-no-provider",fraudNet:{sourceId:"AI_SERVICE_STUDIO_CHECKOUT",sandbox:true}}}));
  await page.route("https://c.paypal.com/da/r/fb.js",route=>route.fulfill({contentType:"application/javascript",body:"void 0;"}));
  await page.route("https://www.paypal.com/sdk/js**",route=>route.fulfill({contentType:"application/javascript",body:"window.paypal={Buttons:()=>({isEligible:()=>true,render:async container=>{const b=document.createElement('button');b.textContent='Simulated provider control';b.className='primary-button';container.append(b);},close:async()=>{}})};"}));
});
test.afterEach(async ({ page }) => {
  expect(forbiddenRequests.get(page)).toEqual([]);
});

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
    expect(body.email).toBe(PERSISTENT_EMAIL);
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
    undersized: [...document.querySelectorAll("button,input:not([type=radio]):not([type=checkbox]),label.consent-control")]
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
    if (/\/api\/v1\/paypal\/(orders|wallet)|stripe/i.test(request.url())) providerRequests.push(request.url());
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
  await expect(page.getByText("Your recurring-payment terms")).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: resolve(evidenceDirectory, "task-0007-review-laptop.png"), fullPage: true });
  }
  expect(providerRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

// Deferred by the 2026-09-19 email-only amendment; historical body retained, not passed.
test.skip("TC-0003 temporary alias reveals and consumes OTP only in browser A", async ({ page, browser, baseURL }) => {
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
  await page.route("**/api/v1/auth/request-otp", async (route) => {
    expect(route.request().postDataJSON()).toEqual({ intentId: INTENT_ID, identityRoute: "persistent", email: PERSISTENT_EMAIL });
    await route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' });
  });
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

for (const theme of ["light", "dark"] as const) {
  test(`email-only ${theme} request/verify busy, errors and review remain accessible`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    let releaseRequest!: () => void;
    let releaseVerify!: () => void;
    const requestGate = new Promise<void>((resolveGate) => { releaseRequest = resolveGate; });
    const verifyGate = new Promise<void>((resolveGate) => { releaseVerify = resolveGate; });
    let requests = 0;
    await page.route("**/api/v1/auth/request-otp", async (route) => {
      expect(route.request().postDataJSON()).toEqual({ intentId: INTENT_ID, identityRoute: "persistent", email: PERSISTENT_EMAIL });
      requests += 1;
      if (requests === 1) await requestGate;
      await route.fulfill({ status: requests === 1 ? 503 : 202, contentType: "application/json",
        body: requests === 1 ? '{"error":{"code":"integration_not_configured"}}' : '{"accepted":true}' });
    });
    await page.route("**/auth/v1/verify**", async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({ email: PERSISTENT_EMAIL, token: OTP_FIXTURE, type: "email" });
      await verifyGate;
      await route.fulfill({ status: 400, contentType: "application/json", body: '{"msg":"Invalid code","error_code":"otp_expired"}' });
    });
    await page.route(`**/api/v1/checkout-intents/${INTENT_ID}/resume`, (route) => route.fulfill({
      status: 200, contentType: "application/json", body: JSON.stringify(review()),
    }));
    const capture = async (state: string) => {
      await expectResponsiveBoundary(page);
      await expect(page.getByRole("radio")).toHaveCount(0);
      await expect(page.getByText(/24-hour demo address|Retrieve this browser|high-entropy/)).toHaveCount(0);
      await page.screenshot({ path: resolve(evidenceDirectory, `${testInfo.project.name}-${theme}-${state}.png`), fullPage: true });
    };
    await page.goto(`/checkout/${INTENT_ID}`);
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.getByLabel("Email address").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Send verification code" })).toBeFocused();
    await capture("entry");
    await page.getByLabel("Email address").fill(PERSISTENT_EMAIL);
    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(page.getByRole("button", { name: "Requesting…" })).toBeDisabled();
    await capture("request-busy");
    releaseRequest();
    await expect(page.getByRole("alert")).toHaveText("The code could not be requested.");
    await capture("request-error");
    await page.getByRole("button", { name: "Send verification code" }).click();
    await expect(page.getByRole("status")).toHaveText("Code requested.");
    await page.getByLabel("Verification code").focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Verify and review" })).toBeFocused();
    await capture("code");
    await page.getByLabel("Verification code").fill(OTP_FIXTURE);
    await page.getByRole("button", { name: "Verify and review" }).click();
    await expect(page.getByRole("button", { name: "Verifying…" })).toBeDisabled();
    await capture("verify-busy");
    releaseVerify();
    await expect(page.getByRole("alert")).toHaveText("That code could not be verified.");
    await capture("verify-error");
    await installSupabaseVerification(page);
    await page.getByRole("button", { name: "Verify and review" }).click();
    await expect(page.getByRole("heading", { name: "Review your newly calculated order" })).toBeVisible();
    await expect(page.getByText("$5.53", { exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await capture("review");
    expect(requests).toBe(2);
  });
}

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

test("manual light selection overrides dark-OS body and evidence surfaces", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto(`/checkout/${INTENT_ID}`);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate(() => ({
    backgroundVariable: getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
    foregroundVariable: getComputedStyle(document.documentElement).getPropertyValue("--foreground").trim(),
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    bodyForeground: getComputedStyle(document.body).color,
    readingSurface: getComputedStyle(document.querySelector<HTMLElement>(".identity-card")!).backgroundColor,
    evidenceSurface: getComputedStyle(document.querySelector<HTMLElement>(".selection-summary")!).backgroundColor,
  }))).toEqual({
    backgroundVariable: "#fff8f1",
    foregroundVariable: "#352623",
    bodyBackground: "rgb(255, 248, 241)",
    bodyForeground: "rgb(53, 38, 35)",
    readingSurface: "rgba(255, 253, 249, 0.94)",
    evidenceSurface: "rgba(255, 253, 249, 0.82)",
  });
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: resolve(evidenceDirectory, "task-0007-identity-mobile-light.png"), fullPage: true });
  }
});

test.skip("@hosted originating-session isolation", async () => {
  // Requires an orchestrator-supplied Render URL and configured Supabase Send Email Hook.
});
import "./support/task0011-browser-network.js";

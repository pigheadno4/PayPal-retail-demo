import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0002");
mkdirSync(evidenceDirectory, { recursive: true });

test.use({
  ...(executablePath ? { launchOptions: { executablePath } } : {}),
  ...(baseURL ? { baseURL } : {}),
});

const review = (overrides: Record<string, unknown> = {}) => ({
  intentId: INTENT_ID, quoteId: QUOTE_ID, tier: "go", cadence: "monthly",
  base: { currency: "USD", cents: 1000 }, promotion: { currency: "USD", cents: -500 },
  taxableSubtotal: { currency: "USD", cents: 500 }, taxBasisPoints: 1055,
  tax: { currency: "USD", cents: 53 }, dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2027-07-15T19:15:00.000Z", renewsAt: "2027-08-15T19:00:00.000Z",
  allowanceResetsAt: "2027-08-15T19:00:00.000Z", timeZone: "America/Los_Angeles",
  pricingVersion: "go-monthly-intro-v1", taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
  ...overrides,
});

async function routeNoCurrentQuote(page: Page) {
  await page.route("**/api/quotes?**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: '{"error":"quote_not_found"}' }));
}

async function expectResponsiveBoundary(page: Page) {
  const metrics = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    undersized: [...document.querySelectorAll("button,input")].filter((element) => element.getBoundingClientRect().height < 44).length,
  }));
  expect(metrics).toEqual({ overflow: false, undersized: 0 });
  await expect(page.getByRole("button", { name: /paypal|pay with|card|apple pay|google pay/i })).toHaveCount(0);
}

test("TC-0002 selection and persistent identity execute the API lifecycle without URL exposure", async ({ page }) => {
  let selected = false;
  let requestedEmail = "";
  let verifiedBody: Record<string, string> = {};
  await page.route("**/api/checkout-intents", (route) => {
    selected = true;
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ intentId: INTENT_ID, tier: "go", cadence: "monthly", state: "selected" }) });
  });
  await routeNoCurrentQuote(page);
  await page.route("**/api/auth/request-otp", async (route) => {
    requestedEmail = (await route.request().postDataJSON()).email;
    await route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' });
  });
  await page.route("**/api/auth/verify-otp", async (route) => {
    verifiedBody = await route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(review()) });
  });

  await page.goto("/");
  await page.screenshot({ path: resolve(evidenceDirectory, "01-choose-plan-laptop.png"), fullPage: true });
  await page.getByRole("button", { name: "Choose Go" }).click();
  await expect(page).toHaveURL(new RegExp(`/checkout/${INTENT_ID}$`));
  expect(selected).toBe(true);
  await page.screenshot({ path: resolve(evidenceDirectory, "02-choose-identity-laptop.png"), fullPage: true });
  await page.getByLabel("Email").fill("person@example.com");
  await page.getByRole("button", { name: "Continue with email" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  expect(requestedEmail).toBe("person@example.com");
  expect(page.url()).not.toContain("person%40example.com");
  await page.getByLabel("Six-digit code").fill("385104");
  await page.getByRole("button", { name: "Verify and review" }).click();
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();
  expect(verifiedBody).toEqual({ intentId: INTENT_ID, identityRoute: "persistent", email: "person@example.com", token: "385104" });
  await expect(page.getByText("$5.53", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "04-review-laptop.png"), fullPage: true });
});

test("TC-0003 uses the issued temporary alias, originating-session OTP API, and stops on failures", async ({ page }) => {
  await routeNoCurrentQuote(page);
  await page.route("**/api/auth/demo-session", (route) => route.fulfill({ status: 201, contentType: "application/json", body: '{"email":"demo-redacted@example.test","expiresAt":"2027-07-16T19:00:00.000Z"}' }));
  await page.route("**/api/auth/request-otp", (route) => route.fulfill({ status: 202, contentType: "application/json", body: '{"accepted":true}' }));
  await page.route("**/api/auth/demo-session/otp", (route) => route.fulfill({ status: 200, contentType: "application/json", body: '{"otp":"385104","expiresAt":"2027-07-15T19:05:00.000Z"}' }));
  await page.route("**/api/auth/verify-otp", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(review()) }));

  await page.goto(`/checkout/${INTENT_ID}`);
  await page.getByRole("button", { name: "Create temporary identity" }).click();
  await expect(page.getByText("demo-redacted@example.test")).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "03-verify-code-laptop.png"), fullPage: true });
  await page.getByRole("button", { name: "Reveal code in this browser" }).click();
  await expect(page.getByLabel("Six-digit code")).toHaveValue("385104");

  await page.goto(`/checkout/${INTENT_ID}`);
  await page.unroute("**/api/auth/demo-session");
  await page.route("**/api/auth/demo-session", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"session_unavailable"}' }));
  await page.getByRole("button", { name: "Create temporary identity" }).click();
  await expect(page.getByRole("heading", { name: "Choose how to continue" })).toBeVisible();
  await expect(page.getByText("We could not start verification.")).toBeVisible();
});

test("TC-0004 query state cannot grant review and stale replacement uses the strict API", async ({ page }) => {
  let current = review({ expiresAt: "2026-07-15T19:15:00.000Z" });
  let replacementBody: Record<string, string> = {};
  await page.route("**/api/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(current) }));
  await page.route("**/api/quotes", async (route) => {
    replacementBody = await route.request().postDataJSON();
    current = review({ quoteId: "33333333-3333-4333-8333-333333333333" });
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ review: current, replacementCreated: true }) });
  });

  await page.goto(`/checkout/${INTENT_ID}?state=review`);
  await expect(page.getByRole("heading", { name: "Your review changed" })).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "05-stale-review-laptop.png"), fullPage: true });
  await page.getByRole("button", { name: "Review updated total" }).click();
  expect(replacementBody).toEqual({ intentId: INTENT_ID, currentQuoteId: QUOTE_ID });
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();

  await page.unroute("**/api/quotes?**");
  await page.route("**/api/quotes?**", (route) => route.fulfill({ status: 404, contentType: "application/json", body: '{"error":"quote_not_found"}' }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Choose how to continue" })).toBeVisible();
});

test("theme switches from both effective schemes and 390px identity, review, and stale states stay bounded", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  let current: ReturnType<typeof review> | null = null;
  await page.route("**/api/quotes?**", (route) => current
    ? route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(current) })
    : route.fulfill({ status: 200, contentType: "application/json", body: "null" }));
  await page.setViewportSize({ width: 390, height: 844 });

  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto(`/checkout/${INTENT_ID}`);
  const themeToggle = page.getByRole("button", { name: "Toggle theme" });
  await expect(themeToggle).toHaveAttribute("aria-pressed", "true");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(themeToggle).toHaveAttribute("aria-pressed", "false");
  await themeToggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByText("Demo account")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose how to continue" })).toBeVisible();
  await expectResponsiveBoundary(page);
  await page.screenshot({ path: resolve(evidenceDirectory, "06-account-route-mobile-dark.png"), fullPage: true });

  current = review();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();
  await expectResponsiveBoundary(page);

  current = review({ expiresAt: "2026-07-15T19:15:00.000Z" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your review changed" })).toBeVisible();
  await expectResponsiveBoundary(page);
  expect(consoleErrors).toEqual([]);
});

test.skip("@hosted originating-session isolation", async () => {
  // Requires orchestrator-supplied Render URL and configured Supabase Send Email Hook.
});

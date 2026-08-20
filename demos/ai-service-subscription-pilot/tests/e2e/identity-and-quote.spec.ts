import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0002");
mkdirSync(evidenceDirectory, { recursive: true });

test.use({
  ...(executablePath ? { launchOptions: { executablePath } } : {}),
  ...(baseURL ? { baseURL } : {}),
});

test("TC-0002 selection starts at Choose Go without a payment control", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "AI service, with a payment story you can inspect." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Choose Go" })).toBeVisible();
  await expect(page.getByText(/PayPal|payment method/i)).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: resolve(evidenceDirectory, "01-choose-go-laptop.png"), fullPage: true });
});

test("TC-0002 and TC-0003 expose both approved identity and OTP treatments", async ({ page }) => {
  await page.goto(`/checkout/${INTENT_ID}?state=identity`);
  await expect(page.getByRole("heading", { name: "Choose how to continue" })).toBeVisible();
  await expect(page.getByText("Persistent real email")).toBeVisible();
  await expect(page.getByText("Temporary .test identity")).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "02-account-route-laptop.png"), fullPage: true });

  await page.goto(`/checkout/${INTENT_ID}?state=otp&route=temporary`);
  await expect(page.getByRole("heading", { name: "Verify your temporary demo identity" })).toBeVisible();
  await expect(page.getByText(/demo-q7n4k2@test/)).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "03-verify-code-laptop.png"), fullPage: true });

  await page.goto(`/checkout/${INTENT_ID}?state=otp&route=persistent`);
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("TC-0004 presents exact review and stale replacement without advancing to payment", async ({ page }) => {
  await page.goto(`/checkout/${INTENT_ID}?state=review`);
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();
  await expect(page.getByText("$5.53", { exact: true })).toBeVisible();
  await expect(page.getByText("10.55%")).toBeVisible();
  await expect(page.getByText(/Quote expires/)).toBeVisible();
  await expect(page.getByText(/Renews/)).toBeVisible();
  await expect(page.getByText(/Allowance resets/)).toBeVisible();
  await expect(page.getByText(/PayPal|payment method/i)).toHaveCount(0);
  await page.screenshot({ path: resolve(evidenceDirectory, "04-review-laptop.png"), fullPage: true });

  await page.goto(`/checkout/${INTENT_ID}?state=stale`);
  await expect(page.getByRole("heading", { name: "Your review changed" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Review updated total" })).toBeVisible();
  await page.screenshot({ path: resolve(evidenceDirectory, "05-stale-review-laptop.png"), fullPage: true });
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`focused states fit 390px with 44px controls in ${colorScheme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`/checkout/${INTENT_ID}?state=identity`);
    const metrics = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      undersized: [...document.querySelectorAll("button,input")].filter((element) => element.getBoundingClientRect().height < 44).length,
    }));
    expect(metrics).toEqual({ overflow: false, undersized: 0 });
    if (colorScheme === "dark") await page.screenshot({ path: resolve(evidenceDirectory, "06-account-route-mobile-dark.png"), fullPage: true });
  });
}

test.skip("@hosted originating-session isolation", async () => {
  // Requires orchestrator-supplied Render URL and configured Supabase Send Email Hook.
});

import { expect, test, type Page } from "@playwright/test";
import axe from "axe-core";
import type { PayPalWallet } from "../../shared/src/paypal.js";

const ready: PayPalWallet = { methodId: "11111111-1111-4111-8111-111111111111", brand: "PayPal Wallet", state: "ready", renewalReady: true, paidThrough: "2030-11-01T00:00:00.000Z" };
async function fixture(page: Page, outcome: PayPalWallet["state"] = "removed", readFailure = false) {
  let wallet = ready;
  let removals = 0;
  const paymentCalls: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("sb-task0007-auth-token", JSON.stringify({ access_token: "task0010-local-fixture", refresh_token: "nonreusable-fixture", expires_at: 4102444800, expires_in: 86400, token_type: "bearer", user: { id: "fixture-user", aud: "authenticated", role: "authenticated" } }));
  });
  await page.route("https://task0007.supabase.test/**", (route) => route.abort());
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === "/api/v1/me/summary") return route.fulfill({ json: { tier: "go", allowance: { granted: 100, reserved: 0, committed: 0, available: 100 }, resetsAt: "2030-11-01T00:00:00.000Z", operations: [] } });
    if (path === "/api/v1/paypal/wallet") return route.fulfill(readFailure ? { status: 503, json: { error: { code: "unavailable" } } } : { json: { wallet } });
    if (path === `/api/v1/paypal/wallet/${ready.methodId}/remove`) {
      removals += 1;
      expect(request.postDataJSON()).toEqual({ confirmed: true });
      await new Promise((resolve) => setTimeout(resolve, 120));
      wallet = { ...ready, state: outcome, renewalReady: false };
      return route.fulfill({ status: outcome === "removed" ? 200 : outcome === "rejected" ? 409 : 202, json: { wallet } });
    }
    paymentCalls.push(path);
    return route.fulfill({ status: 500, json: { error: { code: "unexpected_test_request" } } });
  });
  return { removals: () => removals, paymentCalls };
}

test("TC-0016/17 confirmation, safe focus, Escape/cancel and no payment", async ({ page }, testInfo) => {
  const state = await fixture(page);
  await page.addInitScript({ content: axe.source });
  await page.goto("/workspace");
  const trigger = page.getByRole("button", { name: "Remove wallet", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Keep wallet" })).toBeFocused();
  await expect(dialog).toContainText("already-paid service period stay unchanged");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Confirm removal" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Keep wallet" })).toBeFocused();
  for (const button of await dialog.getByRole("button").all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const violations = await page.evaluate(async () => (await (window as unknown as { axe: typeof axe }).axe.run(".wallet-dialog")).violations.map(({ id, impact }) => ({ id, impact })));
  expect(violations).toEqual([]);
  await dialog.screenshot({ path: testInfo.outputPath("confirmation-light.png") });
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await dialog.screenshot({ path: testInfo.outputPath("confirmation-dark.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Keep wallet" }).click();
  expect(state.removals()).toBe(0);
  expect(state.paymentCalls).toEqual([]);
});

for (const outcome of ["removed", "rejected", "unknown", "removing"] as const) {
  test(`TC-0018/19/20 ${outcome}, duplicate protection, reload and paid allowance`, async ({ page }, testInfo) => {
    const state = await fixture(page, outcome);
    await page.goto("/workspace");
    await page.getByRole("button", { name: "Remove wallet", exact: true }).click();
    await page.getByRole("button", { name: "Confirm removal" }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
    await expect(page.getByRole("button", { name: "Removing…", exact: true })).toBeDisabled();
    await expect(page.locator(".payment-method")).toHaveAttribute("data-state", outcome);
    await expect(page.getByRole("button", { name: "Remove wallet", exact: true })).toHaveCount(0);
    expect(state.removals()).toBe(1);
    expect(state.paymentCalls).toEqual([]);
    await page.reload();
    await expect(page.locator(".payment-method")).toHaveAttribute("data-state", outcome);
    await expect(page.getByRole("heading", { name: "#Generate Answer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Explain usage-based AI credits to a new customer." })).toBeEnabled();
    expect(await page.locator("body").innerText()).toContain("100");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator(".payment-method").screenshot({ path: testInfo.outputPath(`wallet-${outcome}.png`) });
  });
}

test("wallet read failure leaves paid workspace usable", async ({ page }) => {
  await fixture(page, "removed", true);
  await page.goto("/workspace");
  await expect(page.getByRole("alert")).toContainText("Your paid workspace remains available");
  await expect(page.getByRole("button", { name: "Explain usage-based AI credits to a new customer." })).toBeEnabled();
});

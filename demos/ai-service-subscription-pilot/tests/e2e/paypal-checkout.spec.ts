import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const INTENT_ID = "11111111-1111-4111-8111-111111111111";
const QUOTE_ID = "22222222-2222-4222-8222-222222222222";
const evidenceDirectory = resolve("tracking/evidence/artifacts/EVID-0003");
mkdirSync(evidenceDirectory, { recursive: true });

const review = {
  intentId: INTENT_ID, quoteId: QUOTE_ID, tier: "go", cadence: "monthly",
  base: { currency: "USD", cents: 1000 }, promotion: { currency: "USD", cents: -500 }, taxableSubtotal: { currency: "USD", cents: 500 },
  taxBasisPoints: 1055, tax: { currency: "USD", cents: 53 }, dueToday: { currency: "USD", cents: 553 },
  expiresAt: "2027-07-15T19:15:00.000Z", renewsAt: "2027-08-15T19:00:00.000Z", allowanceResetsAt: "2027-08-15T19:00:00.000Z",
  timeZone: "America/Los_Angeles", pricingVersion: "go-monthly-intro-v1", taxVersion: "us-wa-seattle-digital-ai-q3-2026-v1",
};

async function stubProvider(page: Page, readiness: "pending" | "ready") {
  await page.route("**/api/quotes?**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(review) }));
  await page.route("**/api/paypal/id-token", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ idToken: "ID-TOKEN-REDACTED", fraudNet: { sourceId: "MERCHANT123_checkout-page", sandbox: true } }) }));
  await page.route("https://c.paypal.com/da/r/fb.js", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: "void 0;" }));
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.paypal={Buttons:(options)=>({isEligible:()=>true,render:async(container)=>{const button=document.createElement('button');button.textContent='Pay with PayPal';button.onclick=async()=>{const orderID=await options.createOrder();await options.onApprove({orderID});};container.appendChild(button);},close:()=>Promise.resolve()})};` }));
  await page.route("**/api/paypal/orders", async (route) => {
    const input = await route.request().postDataJSON();
    expect(input.clientMetadataId).toMatch(/^[a-f0-9]{32}$/);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ready", operationId: input.operationId, orderId: "ORDER-REDACTED" }) });
  });
  await page.route("**/api/paypal/orders/*/capture", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ operationId: "33333333-3333-4333-8333-333333333333", funding: "verified", reusableReadiness: readiness, customerMessage: readiness === "ready" ? "vault token verified; future-charge path documented" : "Payment verified. Reusable payment setup is finishing." }) }));
}

for (const readiness of ["pending", "ready"] as const) {
  test(`TC-0006 official SDK control hands verified funding to ${readiness} reusable readiness`, async ({ page }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await stubProvider(page, readiness);
    await page.goto(`/checkout/${INTENT_ID}`);
    await page.getByRole("button", { name: "Pay with PayPal" }).click();
    await expect(page.getByRole("heading", { name: "Preparing your Go workspace" })).toBeVisible();
    await expect(page.locator(".status-row").filter({ hasText: "Funding" })).toContainText("Verified");
    await expect(page.getByText("Not granted yet")).toBeVisible();
    await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
    await expect(page.getByRole("button", { name: /workspace|continue/i })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    expect(consoleErrors).toEqual([]);
    await page.screenshot({ path: resolve(evidenceDirectory, `${testInfo.project.name}-${readiness}.png`), fullPage: true });
  });
}

test("TC-0006 cancellation returns to review and grants nothing", async ({ page }, testInfo) => {
  await stubProvider(page, "ready");
  await page.unroute("https://www.paypal.com/sdk/js**");
  await page.route("https://www.paypal.com/sdk/js**", (route) => route.fulfill({ status: 200, contentType: "application/javascript", body: `window.paypal={Buttons:(options)=>({isEligible:()=>true,render:async(container)=>{const cancel=document.createElement('button');cancel.textContent='Cancel PayPal';cancel.onclick=()=>options.onCancel();container.appendChild(cancel);},close:()=>Promise.resolve()})};` }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await page.getByRole("button", { name: "Cancel PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await page.screenshot({ path: resolve(evidenceDirectory, `${testInfo.project.name}-cancel.png`), fullPage: true });
});

test("TC-0006 capture failure returns to retryable review and grants nothing", async ({ page }, testInfo) => {
  await stubProvider(page, "ready");
  await page.unroute("**/api/paypal/orders/*/capture");
  await page.route("**/api/paypal/orders/*/capture", (route) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"payment_not_available"}' }));
  await page.goto(`/checkout/${INTENT_ID}`);
  await page.getByRole("button", { name: "Pay with PayPal" }).click();
  await expect(page.getByRole("heading", { name: "Review Go Monthly" })).toBeVisible();
  await expect(page.getByText("Payment was not completed.")).toBeVisible();
  await expect(page.getByText(/100 units|Go active/i)).toHaveCount(0);
  await page.screenshot({ path: resolve(evidenceDirectory, `${testInfo.project.name}-capture-failure.png`), fullPage: true });
});

test.skip("@sandbox @hosted real PayPal SDK, FraudNet, capture, and webhook evidence", async () => {
  // Requires an orchestrator-supplied hosted URL and configured direct sandbox merchant.
});

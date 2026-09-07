import { test, type APIResponse, type BrowserContext, type Page, type Response } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  sanitizeTask0005Record, TASK0005_BLOCKED_CLAIMS, validateTask0005Manifest,
  type Task0005Case, type Task0005Record,
} from "../evidence/task0005-sanitize";

// This test never reads persistent OTP inputs or Supabase verify payloads.
// Request/response values needed for correlation remain in memory only.
function check(condition: unknown): asserts condition {
  if (!condition) throw new Error("hosted_identity_check_failed");
}

async function safeJson(response: APIResponse | Response) {
  try { return await response.json() as Record<string, unknown>; }
  catch { throw new Error("hosted_identity_check_failed"); }
}

async function denial(context: BrowserContext) {
  const response = await context.request.get("/api/v1/demo-sessions/otp");
  check(response.status() === 404);
  check(JSON.stringify(await safeJson(response)) === JSON.stringify({ error: { code: "not_found" } }));
}

async function selectGo(page: Page) {
  await page.goto("/");
  const selection = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/checkout-intents"
    && response.request().method() === "POST");
  await page.getByRole("button", { name: "Choose Go Monthly" }).click();
  const response = await selection;
  check(response.status() === 201);
  const body = await safeJson(response);
  check(typeof body.intentId === "string" && body.tier === "go" && body.cadence === "monthly" && body.state === "selected");
  await page.getByRole("heading", { name: "Keep your Go selection" }).waitFor();
  return body.intentId;
}

async function requestTemporary(page: Page) {
  const intent = await selectGo(page);
  await page.getByRole("radio", { name: /24-hour demo address/ }).check();
  const sessionResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/demo-sessions");
  const acceptedResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/auth/request-otp");
  await page.getByRole("button", { name: "Send verification code" }).click();
  const session = await sessionResponse;
  check(session.status() === 201 && session.headers()["cache-control"] === "private, no-store");
  const body = await safeJson(session);
  check(typeof body.email === "string" && /^demo-[A-Za-z0-9_-]{20,}@test$/.test(body.email));
  const accepted = await acceptedResponse;
  check(accepted.status() === 202 && JSON.stringify(await safeJson(accepted)) === '{"accepted":true}');
  return intent;
}

async function waitForOtpExpiry(context: BrowserContext) {
  // Only the timestamp is used. The transient response is never reported.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const response = await context.request.get("/api/v1/demo-sessions/otp");
    if (response.status() === 200) {
      check(response.headers()["cache-control"] === "private, no-store");
      const body = await safeJson(response);
      check(typeof body.otp === "string" && /^\d{6}$/.test(body.otp));
      check(typeof body.expiresAt === "string");
      const expiresAt = Date.parse(body.expiresAt);
      check(expiresAt > Date.now() && expiresAt <= Date.now() + 300_000);
      return expiresAt;
    }
    check(response.status() === 404);
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  throw new Error("hosted_identity_check_failed");
}

async function verifiedReview(page: Page, response: Response, intent: string, startedAt: number) {
  check(response.status() === 200);
  const review = await safeJson(response);
  check(review.intentId === intent && typeof review.quoteId === "string");
  check(typeof review.expiresAt === "string" && Date.parse(review.expiresAt) > startedAt);
  await page.getByRole("heading", { name: "Review your newly calculated order" }).waitFor();
  check(await page.getByLabel("Verification code").count() === 0);
  check(await page.getByRole("checkbox").isChecked() === false);
  // A read-only application query proves identity did not create allowance.
  const authorization = await response.request().headerValue("authorization");
  check(authorization && authorization.startsWith("Bearer "));
  const summary = await page.context().request.get("/api/v1/me/summary", { headers: { authorization } });
  check(summary.status() === 404);
  check(JSON.stringify(await safeJson(summary)) === '{"error":{"code":"not_found"}}');
  return review;
}

async function identitySubject(response: Response): Promise<string> {
  const authorization = await response.request().headerValue("authorization");
  check(authorization && authorization.startsWith("Bearer "));
  const payload = authorization.slice(7).split(".")[1];
  check(payload);
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: unknown };
  check(typeof claims.sub === "string");
  return claims.sub;
}

async function safeReviewScreenshot(page: Page, name: string) {
  check(await page.locator("input:not([type=checkbox]):not([type=radio])").count() === 0);
  const text = await page.locator("body").innerText();
  check(!/[\w.+-]+@[\w.-]+|\b\d{6}\b|Bearer\s|ai_demo_session|whsec_|[0-9a-f]{8}-[0-9a-f-]{27}/i.test(text));
  return { name, bytes: await page.screenshot({ fullPage: true }) };
}

test("TC-0014 and TC-0015 hosted identity only", async ({ browser, baseURL }) => {
  const contexts: BrowserContext[] = [];
  const records: Task0005Record[] = [];
  const screenshots: { name: string; bytes: Buffer }[] = [];
  const capture = process.env.TASK0005_CAPTURE_EVIDENCE === "1";
  const record = (caseLabel: Task0005Case, httpStatus: number | null, outcome: string, proofLevel = "hosted") => {
    records.push(sanitizeTask0005Record({ schemaVersion: 1, task: "TASK-0005", proofLevel,
      case: caseLabel, capturedAt: new Date().toISOString(), httpStatus, outcome,
      evidenceBoundary: "identity_only", blockedClaims: [...TASK0005_BLOCKED_CLAIMS] }));
  };
  let unexpectedErrors = 0;
  let prohibitedRequests = 0;
  try {
    check(baseURL && new URL(baseURL).protocol === "https:" && new URL(baseURL).origin === baseURL);
    const email = process.env.TASK0005_PERSISTENT_EMAIL;
    check(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !email.endsWith(".test"));
    const newContext = async () => {
      const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
      contexts.push(context);
      await context.route((url) => /paypal|stripe/i.test(url.hostname)
        || /^\/api\/v1\/(paypal|usage|me\/activation)/.test(url.pathname), async (route) => {
        prohibitedRequests += 1;
        await route.abort();
      });
      // Do not print raw console text, URLs, page errors, request headers or bodies.
      context.on("page", (page) => {
        page.on("pageerror", () => { unexpectedErrors += 1; });
        page.on("console", (message) => { if (message.type() === "error") unexpectedErrors += 1; });
      });
      context.on("request", (request) => {
        const url = new URL(request.url());
        if (/paypal|stripe/i.test(url.hostname) || /^\/api\/v1\/(paypal|usage|me\/activation)/.test(url.pathname)) prohibitedRequests += 1;
      });
      return context;
    };
    const persistent = await newContext();
    const health = await persistent.request.get("/api/v1/health");
    check(health.status() === 200 && JSON.stringify(await safeJson(health)) === '{"status":"ready"}');
    record("health", 200, "ready");
    const history = await persistent.request.get("/checkout/history", { headers: { accept: "text/html" } });
    check(history.status() === 200 && history.headers()["content-type"]?.includes("text/html"));
    record("history_route", 200, "compiled_customer_route");
    for (const [path, label] of [["/api/v1/missing", "api_isolation"], ["/webhooks/missing", "webhook_isolation"], ["/api/missing", "legacy_api_isolation"]] as const) {
      const response = await persistent.request.get(path);
      check(response.status() === 404 && JSON.stringify(await safeJson(response)) === '{"error":{"code":"not_found"}}');
      record(label, 404, "not_found");
    }
    const invalid = await persistent.request.post("/webhooks/supabase/send-email", {
      headers: { "content-type": "application/json", "webhook-id": "invalid", "webhook-timestamp": "0", "webhook-signature": "v1,invalid" }, data: "{}",
    });
    check(invalid.status() === 401 && JSON.stringify(await safeJson(invalid)) === '{"error":{"code":"hook_rejected"}}');
    record("invalid_hook", 401, "hook_rejected");

    const page = await persistent.newPage();
    const intent = await selectGo(page);
    await page.getByLabel("Email address").fill(email);
    const requested = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/auth/request-otp");
    await page.getByRole("button", { name: "Send verification code" }).click();
    check((await requested).status() === 202);
    const startedAt = Date.now();
    // User reads the mailbox and enters the code directly in the headed browser.
    const resumed = await page.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/checkout-intents/${intent}/resume`, { timeout: 5 * 60_000 });
    const review = await verifiedReview(page, resumed, intent, startedAt);
    record("persistent_resume", 200, "same_intent_new_review");
    page.on("dialog", () => { /* Intentionally left to the human in the headed browser. */ });
    check(await page.evaluate(() => window.confirm("Confirm you received exactly one six-digit verification code, with no Magic Link, and entered it yourself. Click Cancel if this was not confirmed.")));
    record("persistent_inbox", null, "six_digit_otp_received", "manual_inbox");
    const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/quotes");
    await page.reload();
    const refreshedResponse = await refreshed;
    const restoredReview = await safeJson(refreshedResponse);
    check(refreshedResponse.status() === 200 && restoredReview.intentId === intent && restoredReview.quoteId === review.quoteId);
    check(await identitySubject(resumed) === await identitySubject(refreshedResponse));
    await page.getByRole("heading", { name: "Review your newly calculated order" }).waitFor();
    record("persistent_refresh", 200, "same_account_review_retained");
    if (capture) screenshots.push(await safeReviewScreenshot(page, "persistent-review.png"));
    await persistent.close();

    const origin = await newContext();
    const other = await newContext();
    const temporaryPage = await origin.newPage();
    const temporaryIntent = await requestTemporary(temporaryPage);
    const originCookie = (await origin.cookies()).find((cookie) => cookie.name === "ai_demo_session");
    check(originCookie?.secure && originCookie.httpOnly && originCookie.sameSite === "Lax" && originCookie.path === "/" && originCookie.expires > Date.now() / 1000);
    record("secure_origin_cookie", 201, "secure_http_only_lax");
    await waitForOtpExpiry(origin);
    await denial(other); record("second_browser", 404, "not_found");
    await other.clearCookies(); await denial(other); record("missing_cookie", 404, "not_found");
    await other.request.post("/api/v1/checkout-intents");
    await denial(other); record("unknown_session", 404, "not_found");
    await other.clearCookies();
    await other.addCookies([{ ...originCookie, value: `${originCookie.value.slice(0, -1)}${originCookie.value.endsWith("x") ? "y" : "x"}` }]);
    await denial(other); record("tampered_cookie", 404, "not_found");
    const temporaryStarted = Date.now();
    const temporaryResume = temporaryPage.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/checkout-intents/${temporaryIntent}/resume`);
    await temporaryPage.getByRole("button", { name: "Retrieve this browser’s demo code" }).click();
    await verifiedReview(temporaryPage, await temporaryResume, temporaryIntent, temporaryStarted);
    record("temporary_origin", 200, "same_intent_new_review");
    await denial(origin); record("consumed_session", 404, "not_found");
    if (capture) screenshots.push(await safeReviewScreenshot(temporaryPage, "temporary-review.png"));
    await origin.close(); await other.close();

    const expiry = await newContext();
    const expiryPage = await expiry.newPage();
    await requestTemporary(expiryPage);
    const expiresAt = await waitForOtpExpiry(expiry);
    // Real wall-clock boundary, with no production clock or session bypass.
    while (Date.now() <= expiresAt) {
      await new Promise((resolveWait) => setTimeout(resolveWait, Math.min(30_000, expiresAt - Date.now() + 1000)));
    }
    await denial(expiry); record("expired_otp", 404, "not_found");
    await expiry.close();
    check(unexpectedErrors === 0 && prohibitedRequests === 0);
    record("authentication_only", 200, "no_payment_or_allowance");

    if (capture) {
      // Created only by the orchestrator's actual reversible hosted failure probe.
      // It must be a sanitized row; no provider request/response is accepted here.
      const failure = sanitizeTask0005Record(JSON.parse(readFileSync("/private/tmp/task0005-hosted-failure.json", "utf8")));
      check(failure.case === "email_capability_absent" || failure.case === "email_provider_unavailable");
      const manifest = validateTask0005Manifest([...records, failure]);
      const directory = resolve("tracking/evidence/artifacts/EVID-0006");
      mkdirSync(directory, { recursive: true });
      for (const screenshot of screenshots) writeFileSync(resolve(directory, screenshot.name), screenshot.bytes, { mode: 0o600 });
      writeFileSync(resolve(directory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    }
  } catch {
    // Playwright errors can otherwise include email input arguments or request URLs.
    throw new Error("hosted_identity_failed_no_raw_evidence_retained");
  } finally {
    await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
  }
});

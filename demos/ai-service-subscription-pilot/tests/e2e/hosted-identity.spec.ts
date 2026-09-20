import { test, type APIResponse, type BrowserContext, type Page, type Response } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { hostedIdentityFailure, waitForHostedReadiness } from "../evidence/task0005-readiness";
import { assertUnchangedAllowance, readAllowanceBaseline, validateBaselineConfiguration, validatePersistentSummary, type AllowanceBaseline } from "../evidence/task0005-allowance-baseline";
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

async function selectGo(page: Page, setStage?: (stage: "persistent_request_navigation" | "persistent_request_selection") => void) {
  setStage?.("persistent_request_navigation");
  await page.goto("/");
  setStage?.("persistent_request_selection");
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

async function verifiedReview(page: Page, response: Response, intent: string, startedAt: number, setStage: (stage: string, httpStatus?: number) => void, persistentBaseline?: { before: AllowanceBaseline; email: string }) {
  setStage("review_status");
  check(response.status() === 200);
  setStage("review_json");
  const review = await safeJson(response);
  setStage("review_intent_quote");
  check(review.intentId === intent && typeof review.quoteId === "string");
  setStage("review_expiry");
  check(typeof review.expiresAt === "string" && Date.parse(review.expiresAt) > startedAt);
  setStage("review_heading");
  await page.getByRole("heading", { name: "Review your newly calculated order" }).waitFor();
  setStage("review_code_input_read");
  const codeInputs = await page.getByLabel("Verification code").count();
  setStage("review_code_input_absent");
  check(codeInputs === 0);
  setStage("review_checkbox_read");
  const checked = await page.getByRole("checkbox").isChecked();
  setStage("review_checkbox_unchecked");
  check(checked === false);
  // Persistent no-grant proof requires the pre-OTP database baseline below.
  setStage("review_authorization_read");
  const authorization = await response.request().headerValue("authorization");
  setStage("review_authorization_valid");
  check(authorization && authorization.startsWith("Bearer "));
  setStage("review_summary_request");
  const summary = await page.context().request.get("/api/v1/me/summary", { headers: { authorization } });
  setStage("review_summary_status");
  const summaryStatus = summary.status();
  setStage("review_summary_status", summaryStatus);
  check(persistentBaseline ? summaryStatus === 200 || summaryStatus === 404 : summaryStatus === 404);
  setStage("review_summary_json");
  const summaryBody = await safeJson(summary);
  setStage("review_summary_body");
  if (persistentBaseline) {
    validatePersistentSummary(summaryStatus, summaryBody);
    const claims = JSON.parse(Buffer.from(authorization.slice(7).split(".")[1]!, "base64url").toString("utf8")) as { sub?: unknown; iss?: unknown };
    check(claims.iss === validateBaselineConfiguration(process.env).issuer && typeof claims.sub === "string");
    const after = await readAllowanceBaseline(persistentBaseline.email);
    assertUnchangedAllowance(persistentBaseline.before, after, claims.sub);
  } else {
    check(JSON.stringify(summaryBody) === '{"error":{"code":"not_found"}}');
  }
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

test("TC-0014 hosted persistent email identity only", async ({ browser, baseURL }) => {
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
  let stage = "setup";
  let summaryHttpStatus: number | undefined;
  try {
    check(baseURL && new URL(baseURL).protocol === "https:" && new URL(baseURL).origin === baseURL);
    const email = process.env.TASK0005_PERSISTENT_EMAIL;
    check(email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && !email.endsWith(".test"));
    const newContext = async () => {
      const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
      contexts.push(context);
      await context.route((url) => /paypal|stripe/i.test(url.hostname)
        || /^\/api\/v1\/(paypal|usage|me\/activation|demo-sessions)/.test(url.pathname), async (route) => {
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
        if (/paypal|stripe/i.test(url.hostname) || /^\/api\/v1\/(paypal|usage|me\/activation|demo-sessions)/.test(url.pathname)) prohibitedRequests += 1;
      });
      return context;
    };
    const persistent = await newContext();
    stage = "readiness";
    await waitForHostedReadiness(persistent.request);
    record("health", 200, "ready");
    stage = "route_boundaries";
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

    stage = "persistent_request_page";
    const page = await persistent.newPage();
    const intent = await selectGo(page, (nextStage) => { stage = nextStage; });
    stage = "persistent_request_email";
    await page.getByLabel("Email address").fill(email);
    stage = "persistent_request_baseline";
    const before = await readAllowanceBaseline(email);
    stage = "persistent_request_send";
    const requested = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/auth/request-otp");
    await page.getByRole("button", { name: "Send verification code" }).click();
    stage = "persistent_request_response";
    const requestedResponse = await requested;
    stage = "persistent_request_status";
    check(requestedResponse.status() === 202);
    stage = "persistent_resume";
    const startedAt = Date.now();
    // User reads the mailbox and enters the code directly in the headed browser.
    const resumed = await page.waitForResponse((response) => new URL(response.url()).pathname === `/api/v1/checkout-intents/${intent}/resume`, { timeout: 5 * 60_000 });
    const review = await verifiedReview(page, resumed, intent, startedAt, (nextStage, httpStatus) => { stage = nextStage; summaryHttpStatus = httpStatus; }, { before, email });
    record("persistent_resume", 200, "same_intent_new_review");
    stage = "persistent_inbox";
    page.on("dialog", () => { /* Intentionally left to the human in the headed browser. */ });
    check(await page.evaluate(() => window.confirm("Confirm you received exactly one six-digit verification code, with no Magic Link, and entered it yourself. Click Cancel if this was not confirmed.")));
    record("persistent_inbox", null, "six_digit_otp_received", "manual_inbox");
    stage = "persistent_refresh";
    const refreshed = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/v1/quotes");
    await page.reload();
    const refreshedResponse = await refreshed;
    const restoredReview = await safeJson(refreshedResponse);
    check(refreshedResponse.status() === 200 && restoredReview.intentId === intent && restoredReview.quoteId === review.quoteId);
    check(await identitySubject(resumed) === await identitySubject(refreshedResponse));
    await page.getByRole("heading", { name: "Review your newly calculated order" }).waitFor();
    record("persistent_refresh", 200, "same_account_review_retained");
    if (capture) screenshots.push(await safeReviewScreenshot(page, "persistent-review-email-otp-only.png"));
    await persistent.close();

    stage = "authentication_only";
    check(unexpectedErrors === 0 && prohibitedRequests === 0);
    record("authentication_only", 200, "no_payment_or_allowance");

    if (capture) {
      stage = "evidence_capture";
      // Created only by the orchestrator's actual reversible hosted failure probe.
      // It must be a sanitized row; no provider request/response is accepted here.
      const failure = sanitizeTask0005Record(JSON.parse(readFileSync("/private/tmp/task0005-hosted-failure.json", "utf8")));
      check(failure.case === "email_capability_absent" || failure.case === "email_provider_unavailable");
      const manifest = validateTask0005Manifest([...records, failure], "persistent_email");
      const directory = resolve("tracking/evidence/artifacts/EVID-0006");
      mkdirSync(directory, { recursive: true });
      for (const screenshot of screenshots) writeFileSync(resolve(directory, screenshot.name), screenshot.bytes, { mode: 0o600 });
      writeFileSync(resolve(directory, "manifest-email-otp-only.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    }
  } catch {
    // Playwright errors can otherwise include email input arguments or request URLs.
    throw hostedIdentityFailure(stage, summaryHttpStatus);
  } finally {
    await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
  }
});

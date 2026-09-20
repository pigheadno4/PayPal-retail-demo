import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { hostedIdentityFailure, TemporaryExpiryDiagnostics, waitForHostedReadiness, type HealthRequest } from "./task0005-readiness";

it.each([
  ["Timeout 30000ms exceeded.", "timeout"],
  ["getaddrinfo ENOTFOUND private.example.invalid", "dns"],
  ["getaddrinfo EAI_AGAIN private.example.invalid", "dns"],
  ["self-signed certificate in certificate chain", "tls"],
  ["unable to verify the first certificate", "tls"],
  ["certificate has expired", "tls"],
  ["connect ECONNREFUSED 127.0.0.1:443", "connection"],
  ["read ECONNRESET", "connection"],
  ["socket hang up", "connection"],
  ["https://private.invalid/?error=ECONNRESET", "other"],
  ["private error", "other"],
])("classifies API-client failure without retaining private message: %#", (message, category) => {
  const diagnostic = new TemporaryExpiryDiagnostics();
  diagnostic.begin("temporary_expiry_poll_request");
  const raw = new Error(`apiRequestContext.get: ${message}\nCall log:\n  - GET https://private.invalid/?otp=123456\n  - cookie: private`);
  const failure = diagnostic.failure(raw);
  expect(failure.message).toBe(`hosted_identity_failed_stage_temporary_expiry_poll_request_elapsedMs_0_network_${category}`);
  expect(failure.cause).toBeUndefined();
});

it.each([undefined, null, "apiRequestContext.get: socket hang up", { message: "apiRequestContext.get: socket hang up" },
  Object.defineProperty(new Error(), "message", { get: () => { throw new Error("private"); } }),
  new Error("apiRequestContext.get: private\ngetaddrinfo ENOTFOUND private.invalid")])(
  "falls back safely for untrusted or ambiguous request errors %#", (raw) => {
    const diagnostic = new TemporaryExpiryDiagnostics();
    diagnostic.begin("temporary_expiry_denial_request");
    expect(diagnostic.failure(raw).message).toBe("hosted_identity_failed_stage_temporary_expiry_denial_request_elapsedMs_0_network_other");
  },
);

it("does not infer HTTP status from a request error or carry network categories into response checks", () => {
  const diagnostic = new TemporaryExpiryDiagnostics();
  diagnostic.begin("temporary_expiry_denial_request");
  expect(diagnostic.failure(Object.assign(new Error("apiRequestContext.get: 503 private"), { status: 503 })).message)
    .toBe("hosted_identity_failed_stage_temporary_expiry_denial_request_elapsedMs_0_network_other");
  diagnostic.begin("temporary_expiry_denial_status");
  diagnostic.httpStatus = 503;
  expect(diagnostic.failure(new Error("apiRequestContext.get: socket hang up")).message)
    .toBe("hosted_identity_failed_stage_temporary_expiry_denial_status_http_503_elapsedMs_0");
  expect(hostedIdentityFailure("temporary_expiry_poll_request", undefined, { elapsedMs: 600001, networkCategory: "private" }).message)
    .toBe("hosted_identity_failed_stage_temporary_expiry_poll_request");
});

// Missing a fixed persistent boundary or echoing private diagnostic data breaks this contract.
it.each(["page", "navigation", "selection", "email", "baseline", "send", "response", "status"])(
  "identifies persistent request %s without carrying status, metrics, or private data", (operation) => {
    const error = hostedIdentityFailure(`persistent_request_${operation}`, 403, {
      elapsedMs: 12, email: "private@example.invalid", otp: "123456", cookie: "ai_demo_session=private",
      body: "private response", url: "https://example.invalid/?token=private", id: "private-id",
    });
    expect(error.message).toBe(`hosted_identity_failed_stage_persistent_request_${operation}`);
    expect(error.cause).toBeUndefined();
  },
);

it.each(["persistent_request_email private@example.invalid", "persistent_request_send_123456",
  "persistent_request_response?token=private", "persistent_request_unknown", new Error("persistent_request_baseline"),
  { toString: () => { throw new Error("must not inspect"); } }])(
  "rejects untrusted values resembling persistent request labels %#", (stage) => {
    const error = hostedIdentityFailure(stage, "private response", { elapsedMs: 12 });
    expect(error.message).toBe("hosted_identity_failed_stage_unknown");
    expect(error.cause).toBeUndefined();
  },
);

// Missing stage separation, stale metadata, or unbounded/private fields must fail these tests.
it("separates acquisition from final denial and resets operation metadata", () => {
  const diagnostic = new TemporaryExpiryDiagnostics();
  diagnostic.begin("temporary_expiry_poll_status");
  diagnostic.httpStatus = 404;
  diagnostic.pollCount = 3;
  expect(diagnostic.failure().message).toBe("hosted_identity_failed_stage_temporary_expiry_poll_status_http_404_elapsedMs_0_pollCount_3");
  diagnostic.begin("temporary_expiry_denial_request");
  expect(diagnostic.failure().message).toBe("hosted_identity_failed_stage_temporary_expiry_denial_request_elapsedMs_0_network_other");
  diagnostic.begin("temporary_expiry_denial_status");
  diagnostic.httpStatus = 200;
  diagnostic.expiryDeltaMs = -125;
  expect(diagnostic.failure().message).toBe("hosted_identity_failed_stage_temporary_expiry_denial_status_http_200_elapsedMs_0_expiryDeltaMs_-125");
});

it.each(["context", "page", "selection", "address", "send", "session_response", "session_status", "session_cache", "session_json", "session_schema", "request_response", "request_status", "request_json", "request_schema", "poll_request", "poll_status", "poll_cache", "poll_json", "poll_schema", "timestamp", "poll_wait", "poll_exhausted", "wait", "denial_request", "denial_status", "denial_json", "denial_body", "close"])("retains expiry operation %s and bounded timing", (operation) => {
  expect(hostedIdentityFailure(`temporary_expiry_${operation}`, undefined, { elapsedMs: 600000 }).message)
    .toBe(`hosted_identity_failed_stage_temporary_expiry_${operation}_elapsedMs_600000`);
});

it.each([-1, 600001, 1.5, NaN, Infinity, "123456", "private@example.invalid", null, new Error("private"), { toString: () => { throw new Error("must not inspect"); } }])("rejects private or unbounded expiry timing %#", (value) => {
  const error = hostedIdentityFailure("temporary_expiry_wait", "404", { elapsedMs: value, pollCount: value, expiryDeltaMs: value, body: "private" });
  // Negative one is a valid bounded signed expiry delta, but not elapsed time or poll count.
  expect(error.message).toBe(`hosted_identity_failed_stage_temporary_expiry_wait${value === -1 ? "_expiryDeltaMs_-1" : ""}`);
  expect(error.cause).toBeUndefined();
});

it("drops unknown fields, out-of-stage status, and diagnostic data outside expiry", () => {
  expect(hostedIdentityFailure("temporary_expiry_session_json", 201, { elapsedMs: 12, pollCount: 301, expiryDeltaMs: -600001, otp: "123456", email: "private@example.invalid" }).message)
    .toBe("hosted_identity_failed_stage_temporary_expiry_session_json_elapsedMs_12");
  expect(hostedIdentityFailure("setup", 200, { elapsedMs: 1 }).message).toBe("hosted_identity_failed_stage_setup");
  expect(hostedIdentityFailure("temporary_expiry_private", 200, { elapsedMs: 1 }).message).toBe("hosted_identity_failed_stage_unknown");
});

// Losing the actual HTTP status or coercing untrusted values must fail these regressions.
it.each([100, 200, 401, 403, 500, 599])("retains numeric summary HTTP status %i", (status) => {
  const error = hostedIdentityFailure("review_summary_status", status);
  expect(error.message).toBe(`hosted_identity_failed_stage_review_summary_status_http_${status}`);
  expect(error.cause).toBeUndefined();
});

it.each([99, 600, 404.5, NaN, Infinity, -Infinity, "403", "Bearer private", null, undefined, true,
  new Error("private response"), { toString: () => { throw new Error("must not inspect"); } }])(
  "discards invalid or untrusted summary status %#", (status) => {
    const error = hostedIdentityFailure("review_summary_status", status);
    expect(error.message).toBe("hosted_identity_failed_stage_review_summary_status");
    expect(error.cause).toBeUndefined();
  },
);

it.each(["review_summary_request", "review_summary_json", "temporary_resume", "private stage"])(
  "does not attach a stale HTTP status to %s", (stage) => {
    expect(hostedIdentityFailure(stage, 403).message).toBe(hostedIdentityFailure(stage).message);
  },
);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// Removing the exact readiness check, bounded retries, or redaction must fail these tests.
const ready = { status: () => 200, json: async () => ({ status: "ready" }) };

it("permits the next stage only after an exact ready response using a bounded health GET", async () => {
  const calls: unknown[] = [];
  await waitForHostedReadiness({ get: async (path, options) => {
    calls.push([path, options]);
    return ready;
  } });
  expect(calls).toEqual([["/api/v1/health", { timeout: 10_000, maxRetries: 0, maxRedirects: 0 }]]);
  expect(vi.getTimerCount()).toBe(0);
});

it("recovers from transport errors and non-ready responses without calling an identity endpoint", async () => {
  const calls: string[] = [];
  let attempts = 0;
  const result = waitForHostedReadiness({ get: async (path) => {
    calls.push(path);
    attempts += 1;
    if (attempts === 1) throw new Error("private transport details");
    if (attempts === 2) return { ...ready, status: () => 503 };
    return ready;
  } }).then(() => "ready", () => "failed");
  await vi.runAllTimersAsync();
  expect(await result).toBe("ready");
  expect(calls).toEqual(["/api/v1/health", "/api/v1/health", "/api/v1/health"]);
});

it.each([
  { status: "ready", extra: "private" },
  { status: "starting" },
  null,
  ["ready"],
])("does not advance on a malformed readiness body: %j", async (body) => {
  let advanced = false;
  const result = waitForHostedReadiness({ get: async () => ({ ...ready, json: async () => body }) })
    .then(() => { advanced = true; }, (error: unknown) => error);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(await result).toEqual(new Error("hosted_identity_failed_stage_readiness"));
  expect(advanced).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});

it("exhausts persistent failures within the overall budget with no later attempts", async () => {
  let attempts = 0;
  const result = waitForHostedReadiness({ get: async () => {
    attempts += 1;
    throw new Error("private provider payload");
  } }).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(await result).toEqual(new Error("hosted_identity_failed_stage_readiness"));
  expect(attempts).toBe(30);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(attempts).toBe(30);
});

it.each(["request", "body"])("bounds a stalled %s even if the transport ignores timeout", async (stall) => {
  const timeouts: number[] = [];
  const get: HealthRequest["get"] = async (_path, options) => {
    timeouts.push(options.timeout);
    if (stall === "request") return new Promise(() => undefined);
    return { ...ready, json: () => new Promise(() => undefined) };
  };
  const result = waitForHostedReadiness({ get }).catch((error: unknown) => error);
  await vi.advanceTimersByTimeAsync(60_000);
  expect(await result).toEqual(new Error("hosted_identity_failed_stage_readiness"));
  expect(timeouts).toEqual([10_000, 10_000, 10_000, 10_000, 10_000]);
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["setup", "readiness", "route_boundaries", "persistent_request", "persistent_resume", "persistent_inbox", "persistent_refresh", "temporary_request", "temporary_isolation", "temporary_resume", "temporary_expiry", "authentication_only", "evidence_capture"])("retains only the allowlisted %s stage", (stage) => {
  const error = hostedIdentityFailure(stage);
  expect(error.message).toBe(`hosted_identity_failed_stage_${stage}`);
  expect(error.cause).toBeUndefined();
});

it.each(["private@example.invalid", "123456", "Bearer private", "ai_demo_session=private", "whsec_private", { toString: () => { throw new Error("must not inspect"); } }])("never echoes an unrecognized stage", (stage) => {
  expect(hostedIdentityFailure(stage).message).toBe("hosted_identity_failed_stage_unknown");
});

// Removing any approved review-operation label must make its exact-output test fail.
it.each(["review_status", "review_json", "review_intent_quote", "review_expiry", "review_heading",
  "review_code_input_read", "review_code_input_absent", "review_checkbox_read", "review_checkbox_unchecked",
  "review_authorization_read", "review_authorization_valid", "review_summary_request", "review_summary_status",
  "review_summary_json", "review_summary_body"])("identifies the specific %s operation without a raw cause", (stage) => {
  const error = hostedIdentityFailure(stage);
  expect(error.message).toBe(`hosted_identity_failed_stage_${stage}`);
  expect(error.cause).toBeUndefined();
});

it.each(["review_status:403", "review_json private@example.invalid", "review_authorization_valid Bearer private",
  "review_summary_body 123456", new Error("review_status")])("rejects untrusted values resembling review labels", (stage) => {
  const error = hostedIdentityFailure(stage);
  expect(error.message).toBe("hosted_identity_failed_stage_unknown");
  expect(error.cause).toBeUndefined();
});

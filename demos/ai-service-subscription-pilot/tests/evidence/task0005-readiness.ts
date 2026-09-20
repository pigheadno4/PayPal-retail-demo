export interface HealthRequest {
  get(path: string, options: { timeout: number; maxRetries: number; maxRedirects: number }): Promise<{
    status(): number;
    json(): Promise<unknown>;
  }>;
}

export async function waitForHostedReadiness(request: HealthRequest): Promise<void> {
  const deadline = performance.now() + 60_000;
  while (performance.now() < deadline) {
    const timeout = Math.min(10_000, deadline - performance.now());
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Bound body parsing too; transport timeout alone does not cover a stalled body reader.
      const ready = await Promise.race([
        (async () => {
          const response = await request.get("/api/v1/health", { timeout, maxRetries: 0, maxRedirects: 0 });
          return response.status() === 200 && JSON.stringify(await response.json()) === '{"status":"ready"}';
        })(),
        new Promise<false>((resolve) => { timer = setTimeout(() => resolve(false), timeout); }),
      ]);
      if (ready && performance.now() < deadline) return;
    } catch {
      // Transport errors and response bodies never become diagnostic output.
    } finally {
      clearTimeout(timer);
    }
    const remaining = deadline - performance.now();
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(2000, remaining)));
  }
  throw hostedIdentityFailure("readiness");
}

const expiryStages = ["context", "page", "selection", "address", "send", "session_response", "session_status",
  "session_cache", "session_json", "session_schema", "request_response", "request_status", "request_json",
  "request_schema", "poll_request", "poll_status", "poll_cache", "poll_json", "poll_schema", "timestamp",
  "poll_wait", "poll_exhausted", "wait", "denial_request", "denial_status", "denial_json", "denial_body", "close"] as const;
type ExpiryStage = `temporary_expiry_${typeof expiryStages[number]}`;

// Playwright serializes name/message, not Node's error code. Match only the
// API GET error's first line; never search its URL-bearing call log or cause.
function requestFailureCategory(error: unknown): "timeout" | "dns" | "tls" | "connection" | "other" {
  try {
    if (!(error instanceof Error) || typeof error.message !== "string") return "other";
    const firstLine = error.message.split("\n", 1)[0];
    if (!firstLine.startsWith("apiRequestContext.get: ")) return "other";
    const message = firstLine.slice("apiRequestContext.get: ".length);
    if (/^Timeout [0-9]+ms exceeded\.$/.test(message)) return "timeout";
    if (/^getaddrinfo (?:ENOTFOUND|EAI_AGAIN) [^\s/:?]+$/.test(message)) return "dns";
    if (["self-signed certificate in certificate chain", "unable to verify the first certificate", "certificate has expired"].includes(message)) return "tls";
    if (message === "socket hang up" || /^(?:read|write) (?:ECONNRESET|EPIPE)$/.test(message)
      || /^connect ECONNREFUSED [0-9a-fA-F:.]+:[0-9]+$/.test(message)) return "connection";
  } catch {
    // Even hostile error getters must collapse to the fixed fallback.
  }
  return "other";
}

// Only the second temporary session uses this operation-local diagnostic state.
export class TemporaryExpiryDiagnostics {
  private stage: ExpiryStage = "temporary_expiry_context";
  private startedAt = performance.now();
  httpStatus: number | undefined;
  pollCount: number | undefined;
  expiryDeltaMs: number | undefined;

  begin(stage: ExpiryStage) {
    this.stage = stage;
    this.startedAt = performance.now();
    this.httpStatus = undefined;
    this.pollCount = undefined;
    this.expiryDeltaMs = undefined;
  }

  failure(error?: unknown): Error {
    return hostedIdentityFailure(this.stage, this.httpStatus, {
      elapsedMs: Math.floor(performance.now() - this.startedAt),
      pollCount: this.pollCount,
      // Positive means remaining; negative means the runner has crossed expiry.
      expiryDeltaMs: this.expiryDeltaMs,
      networkCategory: this.stage === "temporary_expiry_poll_request" || this.stage === "temporary_expiry_denial_request"
        ? requestFailureCategory(error) : undefined,
    });
  }
}

export function hostedIdentityFailure(stage: unknown, httpStatus?: unknown, metrics: Record<string, unknown> = {}): Error {
  const allowed = ["setup", "readiness", "route_boundaries", "persistent_request", "persistent_resume",
    "persistent_request_page", "persistent_request_navigation", "persistent_request_selection",
    "persistent_request_email", "persistent_request_baseline", "persistent_request_send",
    "persistent_request_response", "persistent_request_status",
    "persistent_inbox", "persistent_refresh", "temporary_request", "temporary_isolation", "temporary_resume",
    "temporary_expiry", "authentication_only", "evidence_capture",
    "review_status", "review_json", "review_intent_quote", "review_expiry", "review_heading",
    "review_code_input_read", "review_code_input_absent", "review_checkbox_read", "review_checkbox_unchecked",
    "review_authorization_read", "review_authorization_valid", "review_summary_request", "review_summary_status",
    "review_summary_json", "review_summary_body", ...expiryStages.map((operation) => `temporary_expiry_${operation}`)];
  const safeStage = typeof stage === "string" && allowed.includes(stage) ? stage : "unknown";
  const safeStatus = ["review_summary_status", "temporary_expiry_session_status", "temporary_expiry_request_status",
    "temporary_expiry_poll_status", "temporary_expiry_denial_status"].includes(safeStage) && typeof httpStatus === "number"
    && Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599 ? `_http_${httpStatus}` : "";
  let safeMetrics = "";
  if (safeStage.startsWith("temporary_expiry_")) {
    for (const [key, minimum, maximum] of [["elapsedMs", 0, 600_000], ["pollCount", 0, 300], ["expiryDeltaMs", -600_000, 600_000]] as const) {
      const value = metrics[key];
      if (typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum) {
        safeMetrics += `_${key}_${value}`;
      }
    }
  }
  if (["temporary_expiry_poll_request", "temporary_expiry_denial_request"].includes(safeStage)
    && typeof metrics.networkCategory === "string"
    && ["timeout", "dns", "tls", "connection", "other"].includes(metrics.networkCategory)) {
    safeMetrics += `_network_${metrics.networkCategory}`;
  }
  return new Error(`hosted_identity_failed_stage_${safeStage}${safeStatus}${safeMetrics}`);
}

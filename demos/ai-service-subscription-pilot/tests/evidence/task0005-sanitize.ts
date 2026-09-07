export const TASK0005_BLOCKED_CLAIMS = [
  "hosted_paypal", "production_deliverability", "production_ready", "complete_e2e",
  "EVID-0003", "EVID-0005", "TASK-0009",
] as const;

const cases = {
  health: [200, "ready", "hosted"],
  history_route: [200, "compiled_customer_route", "hosted"],
  api_isolation: [404, "not_found", "hosted"],
  webhook_isolation: [404, "not_found", "hosted"],
  legacy_api_isolation: [404, "not_found", "hosted"],
  invalid_hook: [401, "hook_rejected", "hosted"],
  email_capability_absent: [503, "integration_not_configured", "hosted"],
  email_provider_unavailable: [500, "internal_error", "hosted"],
  persistent_inbox: [null, "six_digit_otp_received", "manual_inbox"],
  persistent_resume: [200, "same_intent_new_review", "hosted"],
  persistent_refresh: [200, "same_account_review_retained", "hosted"],
  secure_origin_cookie: [201, "secure_http_only_lax", "hosted"],
  temporary_origin: [200, "same_intent_new_review", "hosted"],
  second_browser: [404, "not_found", "hosted"],
  missing_cookie: [404, "not_found", "hosted"],
  tampered_cookie: [404, "not_found", "hosted"],
  unknown_session: [404, "not_found", "hosted"],
  consumed_session: [404, "not_found", "hosted"],
  expired_otp: [404, "not_found", "hosted"],
  authentication_only: [200, "no_payment_or_allowance", "hosted"],
} as const;

export type Task0005Case = keyof typeof cases;
export type Task0005Record = Readonly<{
  schemaVersion: 1;
  task: "TASK-0005";
  proofLevel: "hosted" | "manual_inbox";
  case: Task0005Case;
  capturedAt: string;
  httpStatus: number | null;
  outcome: string;
  evidenceBoundary: "identity_only";
  blockedClaims: readonly string[];
}>;

function invalid(): never { throw new Error("invalid_task0005_evidence"); }

export function sanitizeTask0005Record(input: unknown): Task0005Record {
  if (!input || typeof input !== "object" || Array.isArray(input)) return invalid();
  const row = input as Record<string, unknown>;
  const keys = ["schemaVersion", "task", "proofLevel", "case", "capturedAt", "httpStatus", "outcome", "evidenceBoundary", "blockedClaims"];
  if (Object.keys(row).length !== keys.length || keys.some((key) => !Object.hasOwn(row, key))) return invalid();
  if (row.schemaVersion !== 1 || row.task !== "TASK-0005" || row.evidenceBoundary !== "identity_only"
    || typeof row.case !== "string" || !Object.hasOwn(cases, row.case)) return invalid();
  const caseLabel = row.case as Task0005Case;
  const [status, outcome, level] = cases[caseLabel];
  if (row.httpStatus !== status || row.outcome !== outcome || row.proofLevel !== level) return invalid();
  if (typeof row.capturedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.capturedAt)
    || !Number.isFinite(Date.parse(row.capturedAt)) || new Date(row.capturedAt).toISOString() !== row.capturedAt) return invalid();
  const blockedClaims = row.blockedClaims;
  if (!Array.isArray(blockedClaims) || blockedClaims.length !== TASK0005_BLOCKED_CLAIMS.length
    || TASK0005_BLOCKED_CLAIMS.some((claim, index) => blockedClaims[index] !== claim)) return invalid();
  return {
    schemaVersion: 1, task: "TASK-0005", proofLevel: level, case: caseLabel,
    capturedAt: row.capturedAt, httpStatus: status, outcome, evidenceBoundary: "identity_only",
    blockedClaims: [...TASK0005_BLOCKED_CLAIMS],
  };
}

export function validateTask0005Manifest(input: unknown): Task0005Record[] {
  if (!Array.isArray(input)) return invalid();
  const records = input.map(sanitizeTask0005Record);
  const labels = new Set(records.map((record) => record.case));
  const required = Object.keys(cases).filter((name) => name !== "email_capability_absent" && name !== "email_provider_unavailable");
  if (labels.size !== records.length || records.length !== required.length + 1
    || required.some((name) => !labels.has(name as Task0005Case))
    || Number(labels.has("email_capability_absent")) + Number(labels.has("email_provider_unavailable")) !== 1) return invalid();
  return records;
}

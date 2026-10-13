export type CreationDiagnostic = Readonly<{
  stage: "review" | "claim" | "oauth" | "create_request" | "create_response" | "json_parse" | "id_projection" | "persistence";
  outcome: "success" | "failure";
  category: "none" | "exception" | "transport" | "http";
  httpStatus?: number;
  issues?: readonly string[];
  issueDiagnostic?: "recognized" | "json_parse_failed" | "details_missing" | "unrecognized_issue";
}>;
export type CreationDiagnosticSink = (record: CreationDiagnostic) => void;

// Observational subset of Create order details[].issue, checked 2026-10-12:
// https://developer.paypal.com/api/orders/v2/error-messages (Create order section).
// This list never determines definitive payment failures.
const creationIssues = new Set([
  "PREVIOUS_REQUEST_IN_PROGRESS", "INVALID_ACCOUNT_STATUS", "INVALID_ARRAY_MAX_ITEMS", "INVALID_ARRAY_MIN_ITEMS",
  "INVALID_COUNTRY_CODE", "INVALID_PARAMETER_SYNTAX", "INVALID_STRING_LENGTH", "INVALID_PARAMETER_VALUE",
  "MISSING_REQUIRED_PARAMETER", "NOT_SUPPORTED", "PAYPAL_REQUEST_ID_REQUIRED", "MALFORMED_REQUEST_JSON",
  "PERMISSION_DENIED", "MALFORMED_REQUEST", "PAYEE_NOT_CONSENTED", "AMOUNT_MISMATCH",
  "BILLING_AGREEMENTS_CANNOT_BE_USED_FOR_SUBSCRIPTIONS", "DECIMAL_PRECISION", "INVALID_CURRENCY_CODE",
  "ITEM_TOTAL_MISMATCH", "ITEM_TOTAL_REQUIRED", "PAYMENT_DENIED", "PAYEE_ACCOUNT_INVALID",
  "PAYEE_ACCOUNT_LOCKED_OR_CLOSED", "PAYEE_ACCOUNT_RESTRICTED", "PAYMENT_ORIGIN_NOT_ENABLED",
  "UNSUPPORTED_PAYMENT_SOURCE_FOR_SUBSCRIPTIONS", "TAX_TOTAL_MISMATCH", "TAX_TOTAL_REQUIRED",
  "UNSUPPORTED_INTENT", "INSTRUMENT_DECLINED", "INCOMPATIBLE_PARAMETER_VALUE",
  "VAULT_INSTRUCTION_DUPLICATED", "VAULT_INSTRUCTION_REQUIRED", "MISMATCHED_VAULT_OWNER_ID", "VAULT_OWNER_ID_NOT_SUPPORTED",
  "NOT_ENABLED_TO_VAULT_PAYMENT_SOURCE", "MISMATCHED_VAULT_ID_TO_PAYMENT_SOURCE", "MISMATCHED_VAULT_SETUP_TOKEN_TO_PAYMENT_SOURCE",
  "INVALID_VAULT_ID", "NOT_ENABLED_FOR_PAYMENT_SOURCE", "AGREEMENT_ALREADY_CANCELLED", "BILLING_AGREEMENT_NOT_FOUND",
  "DUPLICATE_INVOICE_ID", "PAYER_ACCOUNT_LOCKED_OR_CLOSED", "PAYER_ACCOUNT_RESTRICTED", "PAYER_CANNOT_PAY",
  "BILLING_ITEM_AMOUNT_MISMATCH",
]);

export function safeCreationIssues(values: unknown): readonly string[] {
  const safe = new Set<string>();
  if (Array.isArray(values)) for (const value of values) {
    safe.add(typeof value === "string" && creationIssues.has(value) ? value : "unknown_issue");
  }
  if (safe.size === 0) safe.add("unknown_issue");
  return Object.freeze([...safe]);
}

export function creationIssueDiagnostic(values: readonly unknown[], jsonParsed: boolean): CreationDiagnostic["issueDiagnostic"] {
  if (!jsonParsed) return "json_parse_failed";
  if (!values.some(value => typeof value === "string" && value.trim().length > 0)) return "details_missing";
  return safeCreationIssues(values).includes("unknown_issue") ? "unrecognized_issue" : "recognized";
}

export function emitCreationDiagnostic(sink: CreationDiagnosticSink | undefined, record: CreationDiagnostic): void {
  // Diagnostics cannot change payment classification, persistence or retry decisions.
  try {
    sink?.(Object.freeze({ stage: record.stage, outcome: record.outcome, category: record.category,
      ...(Number.isInteger(record.httpStatus) && record.httpStatus! >= 100 && record.httpStatus! <= 599 ? { httpStatus: record.httpStatus } : {}),
      ...(record.stage === "create_response" && record.outcome === "failure" && record.issues !== undefined ? { issues: safeCreationIssues(record.issues) } : {}),
      ...(record.stage === "create_response" && record.outcome === "failure"
        && (record.issueDiagnostic === "recognized" || record.issueDiagnostic === "json_parse_failed" || record.issueDiagnostic === "details_missing" || record.issueDiagnostic === "unrecognized_issue")
        ? { issueDiagnostic: record.issueDiagnostic } : {}),
    }));
  } catch { /* Logging is strictly best effort. */ }
}

export async function observeCreation<T>(sink: CreationDiagnosticSink | undefined, stage: CreationDiagnostic["stage"], operation: () => Promise<T>, category: CreationDiagnostic["category"] = "exception"): Promise<T> {
  try {
    const result = await operation();
    emitCreationDiagnostic(sink, { stage, outcome: "success", category: "none" });
    return result;
  } catch (error) {
    emitCreationDiagnostic(sink, { stage, outcome: "failure", category });
    throw error;
  }
}

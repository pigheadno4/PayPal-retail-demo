import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sanitizeTask0005Record, validateTask0005Manifest } from "./task0005-sanitize";

const row = () => ({
  schemaVersion: 1, task: "TASK-0005", proofLevel: "hosted",
  case: "health", capturedAt: "2026-09-05T12:00:00.000Z", httpStatus: 200,
  outcome: "ready", evidenceBoundary: "identity_only",
  blockedClaims: ["hosted_paypal", "production_deliverability", "production_ready", "complete_e2e", "EVID-0003", "EVID-0005", "TASK-0009"],
});

describe("TASK-0005 allowlisted evidence", () => {
  it("projects only the complete fixed evidence contract", () => {
    expect(sanitizeTask0005Record(row())).toEqual(row());
    const input = row();
    const result = sanitizeTask0005Record(input);
    input.blockedClaims.length = 0;
    expect(result.blockedClaims).toHaveLength(7);
  });

  it.each([
    "customer@example.test", "demo-random@test", "123456", 123456,
    "Bearer sensitive-token", "Authorization: secret", "ai_demo_session=secret",
    "webhook-signature: private", "whsec_private", "re_private", "sb_secret_private",
    "raw provider failure payload", "11111111-1111-4111-8111-111111111111",
    "complete-provider-identifier", "hosted PayPal verified", "production deliverability verified",
    "production ready", "complete E2E verified",
  ])("rejects unapproved values and unexpected fields without echoing input", (value) => {
    for (const input of [{ ...row(), outcome: value }, { ...row(), detail: value }]) {
      expect(() => sanitizeTask0005Record(input)).toThrow(/^invalid_task0005_evidence$/);
    }
  });

  it.each([
    { httpStatus: 503 }, { proofLevel: "local" }, { capturedAt: "not-a-time" },
    { capturedAt: "2026-02-31T12:00:00.000Z" }, { blockedClaims: [] }, { task: "TASK-0009" },
  ])("rejects mismatched, incomplete, or false proof metadata", (change) => {
    expect(() => sanitizeTask0005Record({ ...row(), ...change })).toThrow("invalid_task0005_evidence");
  });

  it("requires all hosted cases and exactly one observed contained-failure case", () => {
    expect(() => validateTask0005Manifest([row()])).toThrow("invalid_task0005_evidence");
    expect(() => validateTask0005Manifest([row(), row()])).toThrow("invalid_task0005_evidence");
  });

  it("accepts a complete identity-only manifest but rejects both failure cases or duplicates", () => {
    const cases = [
      ["health", 200, "ready"], ["history_route", 200, "compiled_customer_route"],
      ["api_isolation", 404, "not_found"], ["webhook_isolation", 404, "not_found"],
      ["legacy_api_isolation", 404, "not_found"], ["invalid_hook", 401, "hook_rejected"],
      ["persistent_inbox", null, "six_digit_otp_received"],
      ["persistent_resume", 200, "same_intent_new_review"],
      ["persistent_refresh", 200, "same_account_review_retained"],
      ["secure_origin_cookie", 201, "secure_http_only_lax"],
      ["temporary_origin", 200, "same_intent_new_review"],
      ...["second_browser", "missing_cookie", "tampered_cookie", "unknown_session", "consumed_session", "expired_otp"].map((label) => [label, 404, "not_found"]),
      ["authentication_only", 200, "no_payment_or_allowance"],
      ["email_capability_absent", 503, "integration_not_configured"],
    ].map(([caseLabel, httpStatus, outcome]) => ({ ...row(), case: caseLabel, httpStatus, outcome,
      proofLevel: caseLabel === "persistent_inbox" ? "manual_inbox" : "hosted" }));
    expect(validateTask0005Manifest(cases)).toEqual(cases);
    expect(() => validateTask0005Manifest([...cases, cases[0]])).toThrow("invalid_task0005_evidence");
    const fallback = { ...row(), case: "email_provider_unavailable", httpStatus: 500, outcome: "internal_error" };
    expect(() => validateTask0005Manifest([...cases, fallback])).toThrow("invalid_task0005_evidence");
    expect(validateTask0005Manifest([...cases.slice(0, -1), fallback])).toHaveLength(19);
  });

  it("checks a generated manifest only when an explicit hosted capture exists", () => {
    const path = "tracking/evidence/artifacts/EVID-0006/manifest.json";
    if (existsSync(path)) {
      expect(() => validateTask0005Manifest(JSON.parse(readFileSync(path, "utf8")))).not.toThrow();
    }
  });
});

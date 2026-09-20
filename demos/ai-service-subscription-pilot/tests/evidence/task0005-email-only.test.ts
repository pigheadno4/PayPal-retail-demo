import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// Approved source guards complement mocked browser interaction; they are not hosted proof.
const hosted = readFileSync("tests/e2e/hosted-identity.spec.ts", "utf8");
const local = readFileSync("tests/e2e/identity-and-quote.spec.ts", "utf8");

it("selects only persistent TC-0014 and an explicitly scoped new capture", () => {
  expect(hosted).toContain('test("TC-0014 hosted persistent email identity only"');
  expect(hosted).not.toMatch(/requestTemporary|waitForOtpExpiry|TemporaryExpiryDiagnostics|temporary_request|temporary_resume|temporary_expiry|async function denial/);
  expect(hosted).toContain('validateTask0005Manifest([...records, failure], "persistent_email")');
  expect(hosted).toContain('"manifest-email-otp-only.json"');
  expect(hosted).toContain('"persistent-review-email-otp-only.png"');
  expect(hosted).not.toContain('"manifest.json"');
});

it("retains persistent non-mutation, inbox, refresh, isolation and privacy guards", () => {
  for (const contract of ["waitForHostedReadiness(persistent.request)", "readAllowanceBaseline(email)",
    "assertUnchangedAllowance(persistentBaseline.before, after, claims.sub)", 'stage = "persistent_inbox"',
    'stage = "persistent_refresh"', "identitySubject(resumed) === await identitySubject(refreshedResponse)",
    "prohibitedRequests === 0", "unexpectedErrors === 0", "webhook_isolation", "legacy_api_isolation",
    "sanitizeTask0005Record", "hostedIdentityFailure(stage, summaryHttpStatus)"]) expect(hosted).toContain(contract);
  expect(hosted.match(/paypal\|usage\|me\\\/activation\|demo-sessions/g)).toHaveLength(2);
});

it("defers the temporary browser case with its historical body retained", () => {
  expect(local).toContain('test.skip("TC-0003 temporary alias');
  expect(local).toContain("2026-09-19 email-only amendment");
  expect(local).toContain('"Retrieve this browser’s demo code"');
  expect(local).not.toContain('resolve("tracking/evidence/artifacts/EVID-0002")');
});

import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { sanitizeTask0009Record } from "./task0009-sanitize.js";

const valid = {
  task: "TASK-0009", proofLevel: "local_synthetic", outcome: "fixture_contract_passed",
  candidate: "a".repeat(64),
  coverage: ["review", "funding_handoff", "usage_return"],
  gaps: ["hosted_provider_unverified", "delayed_webhook_unverified", "EVID-0006_partial", "resend_failure_skipped_not_passed"],
};

describe("TASK-0009 local evidence boundary", () => {
  it("retains explicit synthetic provenance and all open evidence gaps", () => {
    expect(sanitizeTask0009Record(valid)).toEqual(valid);
  });
  for (const key of ["email", "otp", "cookie", "authorization", "access_token", "userId", "orderId", "rawProviderError", "payload"]) {
    it(`rejects unexpected ${key} without echoing its contents`, () => {
      expect(() => sanitizeTask0009Record({ ...valid, [key]: "synthetic-sensitive-canary" }))
        .toThrow(/^invalid_task0009_evidence$/);
    });
  }
  for (const patch of [
    { proofLevel: "hosted" }, { outcome: "complete_e2e" }, { candidate: "private-value" },
    { coverage: ["review", "funding_handoff"] }, { gaps: [] },
    { gaps: [...valid.gaps, "resend_failure_passed"] },
    { coverage: ["review", "funding_handoff", "raw-provider-canary"] },
  ]) {
    it("rejects missing proof rows, private free text, or promoted evidence", () => {
      expect(() => sanitizeTask0009Record({ ...valid, ...patch })).toThrow(/^invalid_task0009_evidence$/);
    });
  }
});

describe("TASK-0009 runner isolation", () => {
  for (const name of ["PLAYWRIGHT_BASE_URL", "TASK0009_BASE_URL"]) {
    it(`rejects ${name} before starting a browser or server`, () => {
      const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", "await import('./playwright.task0009.config.ts')"], {
        env: { NODE_ENV: "test", PATH: process.env.PATH, [name]: "https://synthetic-target.invalid/private-canary" }, encoding: "utf8",
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("task0009_target_override_forbidden");
      expect(result.stderr).not.toContain("private-canary");
    });
  }
});

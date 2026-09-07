import { afterEach, describe, expect, it, vi } from "vitest";
import { Webhook } from "standardwebhooks";
import { processSendEmailHook, HookRejectedError, type DemoSessionRepository } from "./send-email-hook";
import { createAuthDiagnostic, observeResend } from "./diagnostics";

afterEach(() => vi.restoreAllMocks());
const secret = Buffer.from("diagnostic-fixture-signing-secret").toString("base64");
const repository: DemoSessionRepository = {
  findByAlias: async () => null, findByPublicId: async () => null,
  storeOtp: async () => true, clearOtp: async () => undefined,
};
const sensitive = "private@example.test OTP=987654 Bearer private-token";
function hook(token = "012345") {
  const rawBody = JSON.stringify({ user: { email: "private@example.test" }, email_data: { token } });
  const now = new Date();
  return { rawBody, headers: { "webhook-id": "private-provider-id", "webhook-timestamp": String(Math.floor(now.getTime() / 1000)),
    "webhook-signature": new Webhook(secret).sign("private-provider-id", now, rawBody) },
    clock: () => now, hookSecret: secret, encryptionSecret: "fixture-encryption-secret-at-least-32", repository,
    sendPersistentEmail: async () => undefined };
}
describe("bounded auth diagnostics", () => {
  it.each(["returned", "thrown"] as const)("distinguishes Resend %s failures without provider details", async (kind) => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const failure = new Error(sensitive);
    await expect(observeResend(async () => {
      if (kind === "thrown") throw failure;
      return { error: { message: sensitive, statusCode: 429, name: sensitive } };
    }, createAuthDiagnostic())).rejects.toBeInstanceOf(Error);
    expect(output.mock.calls.map(([line]) => JSON.parse(line as string))).toEqual([{
      correlationId: expect.any(String), stage: "resend_delivery", status: 500,
      code: kind === "returned" ? "resend_rejected" : "resend_threw",
    }]);
    expect(JSON.stringify(output.mock.calls)).not.toMatch(/private|987654|Bearer|429/);
  });
  it("drops arbitrary event keys and ignores logger failure", async () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => { throw new Error(sensitive); });
    const diagnostic = createAuthDiagnostic();
    diagnostic(sensitive as Parameters<typeof diagnostic>[0]);
    expect(output).not.toHaveBeenCalled();
    expect(() => diagnostic("database_failed")).not.toThrow();
    await expect(observeResend(async () => ({ error: null }), diagnostic)).resolves.toBeUndefined();
  });
  it.each(["signature", "payload", "database"] as const)("exposes only safe %s stage diagnostics", async (stage) => {
    const output = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const input = hook(stage === "payload" ? "bad" : "012345");
    if (stage === "signature") input.headers["webhook-signature"] = sensitive;
    if (stage === "database") input.repository = { ...repository, findByAlias: async () => { throw new Error(sensitive); } };
    await expect(processSendEmailHook(input)).rejects.toBeInstanceOf(stage === "database" ? Error : HookRejectedError);
    const rows = output.mock.calls.map(([value]) => JSON.parse(value as string));
    expect(rows).toContainEqual({ correlationId: expect.any(String), stage: stage === "database" ? "database_lookup" : `hook_${stage}`,
      status: stage === "database" ? 500 : 401, code: `${stage}_failed` });
    expect(JSON.stringify(rows)).not.toMatch(/private|987654|012345|Bearer/);
    expect(new Set(rows.map((r) => r.correlationId)).size).toBe(1);
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(["code", "correlationId", "stage", "status"]);
  });
  it("does not let logger failure alter successful delivery", async () => {
    vi.spyOn(console, "info").mockImplementation(() => { throw new Error(sensitive); });
    await expect(processSendEmailHook(hook())).resolves.toBeUndefined();
  });
});

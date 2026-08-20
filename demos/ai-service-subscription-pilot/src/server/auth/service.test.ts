import { Webhook } from "standardwebhooks";
import { describe, expect, it } from "vitest";

import {
  createSignedDemoSession,
  decryptDemoOtp,
  verifySignedDemoSession,
} from "@/server/auth/demo-session";
import {
  DemoOtpUnavailableError,
  processSendEmailHook,
  retrieveDemoOtp,
  type DemoSessionRecord,
  type DemoSessionRepository,
} from "@/server/auth/send-email-hook";

const SESSION_SECRET = "session-signing-secret-with-at-least-thirty-two-bytes";
const HOOK_SECRET = Buffer.from("hook-secret-with-at-least-thirty-two-bytes").toString("base64");
const NOW = new Date("2026-07-15T19:00:00.000Z");

class MemorySessionRepository implements DemoSessionRepository {
  readonly sessions: DemoSessionRecord[] = [];

  async findByPublicId(publicId: string) {
    return this.sessions.find((session) => session.publicId === publicId) ?? null;
  }

  async findByAlias(alias: string) {
    return this.sessions.find((session) => session.testAlias === alias) ?? null;
  }

  async storeOtp(publicId: string, ciphertext: string, expiresAt: Date) {
    const session = await this.findByPublicId(publicId);
    if (!session) return false;
    session.otpCiphertext = ciphertext;
    session.otpExpiresAt = expiresAt;
    return true;
  }

  async clearOtp(publicId: string, consumedAt?: Date) {
    const session = await this.findByPublicId(publicId);
    if (!session) return;
    session.otpCiphertext = null;
    session.otpExpiresAt = null;
    session.consumedAt = consumedAt ?? session.consumedAt;
  }
}

function signedHeaders(webhook: Webhook, rawBody: string) {
  const id = "msg_01";
  const signatureTime = new Date();
  const signature = webhook.sign(id, signatureTime, rawBody);
  return {
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(signatureTime.getTime() / 1000)),
    "webhook-signature": signature,
  };
}

describe("TC-0003 originating-session temporary OTP", () => {
  it("creates a signed 24-hour session whose token is not embedded in its public id", () => {
    const session = createSignedDemoSession(SESSION_SECRET, () => NOW);
    const verified = verifySignedDemoSession(session.cookieValue, SESSION_SECRET, NOW);

    expect(session.expiresAt.toISOString()).toBe("2026-07-16T19:00:00.000Z");
    expect(session.publicId).not.toBe(session.rawToken);
    expect(verified.publicId).toBe(session.publicId);
    expect(verified.tokenHash).toHaveLength(64);
  });

  it("verifies the untouched body before storing five-minute encrypted OTP state", async () => {
    const repository = new MemorySessionRepository();
    const signedSession = createSignedDemoSession(SESSION_SECRET, () => NOW);
    repository.sessions.push({
      publicId: signedSession.publicId,
      tokenHash: signedSession.tokenHash,
      testAlias: "demo-q7n4k2@test",
      expiresAt: signedSession.expiresAt,
      otpCiphertext: null,
      otpExpiresAt: null,
      consumedAt: null,
    });
    const rawBody = JSON.stringify({
      user: { email: "demo-q7n4k2@test" },
      email_data: { token: "385104", token_hash: "redacted-hash", redirect_to: "https://example.test", email_action_type: "email", site_url: "https://example.test", token_new: "", token_hash_new: "" },
    });
    const webhook = new Webhook(HOOK_SECRET);

    await processSendEmailHook({
      rawBody,
      headers: signedHeaders(webhook, rawBody),
      clock: () => NOW,
      hookSecret: HOOK_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
      sendPersistentEmail: async () => undefined,
    });

    const record = repository.sessions[0]!;
    expect(record.otpCiphertext).not.toContain("385104");
    expect(record.otpExpiresAt?.toISOString()).toBe("2026-07-15T19:05:00.000Z");
    expect(decryptDemoOtp(record.otpCiphertext!, SESSION_SECRET)).toBe("385104");
  });

  it("returns the OTP only to browser A and denies replay with the same result", async () => {
    const repository = new MemorySessionRepository();
    const browserA = createSignedDemoSession(SESSION_SECRET, () => NOW);
    const browserB = createSignedDemoSession(SESSION_SECRET, () => NOW);
    repository.sessions.push({
      publicId: browserA.publicId,
      tokenHash: browserA.tokenHash,
      testAlias: "demo-q7n4k2@test",
      expiresAt: browserA.expiresAt,
      otpCiphertext: null,
      otpExpiresAt: null,
      consumedAt: null,
    });
    const rawBody = JSON.stringify({ user: { email: "demo-q7n4k2@test" }, email_data: { token: "385104" } });
    const webhook = new Webhook(HOOK_SECRET);
    await processSendEmailHook({ rawBody, headers: signedHeaders(webhook, rawBody), clock: () => NOW, hookSecret: HOOK_SECRET, encryptionSecret: SESSION_SECRET, repository, sendPersistentEmail: async () => undefined });

    await expect(retrieveDemoOtp({ cookieValue: browserB.cookieValue, clock: () => NOW, signingSecret: SESSION_SECRET, encryptionSecret: SESSION_SECRET, repository })).rejects.toBeInstanceOf(DemoOtpUnavailableError);
    await expect(retrieveDemoOtp({ cookieValue: browserA.cookieValue, clock: () => NOW, signingSecret: SESSION_SECRET, encryptionSecret: SESSION_SECRET, repository })).resolves.toEqual({ otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" });
    await expect(retrieveDemoOtp({ cookieValue: browserA.cookieValue, clock: () => NOW, signingSecret: SESSION_SECRET, encryptionSecret: SESSION_SECRET, repository })).rejects.toBeInstanceOf(DemoOtpUnavailableError);
  });

  it("clears both OTP fields when expiry is observed", async () => {
    const repository = new MemorySessionRepository();
    const browserA = createSignedDemoSession(SESSION_SECRET, () => NOW);
    repository.sessions.push({ publicId: browserA.publicId, tokenHash: browserA.tokenHash, testAlias: "demo-q7n4k2@test", expiresAt: browserA.expiresAt, otpCiphertext: "expired", otpExpiresAt: new Date("2026-07-15T19:05:00.000Z"), consumedAt: null });

    await expect(retrieveDemoOtp({ cookieValue: browserA.cookieValue, clock: () => new Date("2026-07-15T19:05:01.000Z"), signingSecret: SESSION_SECRET, encryptionSecret: SESSION_SECRET, repository })).rejects.toBeInstanceOf(DemoOtpUnavailableError);
    expect(repository.sessions[0]).toMatchObject({ otpCiphertext: null, otpExpiresAt: null });
  });

  it("rejects an invalid hook signature before parsing or storing", async () => {
    const repository = new MemorySessionRepository();
    await expect(processSendEmailHook({
      rawBody: "not-json",
      headers: { "webhook-id": "bad", "webhook-timestamp": String(Math.floor(NOW.getTime() / 1000)), "webhook-signature": "v1,bad" },
      clock: () => NOW,
      hookSecret: HOOK_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
      sendPersistentEmail: async () => undefined,
    })).rejects.toThrow("hook_rejected");
    expect(repository.sessions).toHaveLength(0);
  });
});

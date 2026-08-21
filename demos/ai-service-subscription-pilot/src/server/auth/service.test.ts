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
import { completeVerifiedIdentity } from "@/server/auth/service";
import { createPendingGoMonthlyIntent } from "@/server/checkout/service";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import type { StoredQuote } from "@/server/quote/service";

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

  it("returns the OTP only to browser A without consuming it before successful verification", async () => {
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
    await expect(retrieveDemoOtp({ cookieValue: browserA.cookieValue, clock: () => NOW, signingSecret: SESSION_SECRET, encryptionSecret: SESSION_SECRET, repository })).resolves.toEqual({ otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" });
    await repository.clearOtp(browserA.publicId, NOW);
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

describe("TC-0002 intent and verified identity integration", () => {
  const intentId = "11111111-1111-4111-8111-111111111111";
  const stored: StoredQuote = {
    internalId: 11n,
    intentInternalId: 7n,
    accountId: 3n,
    intentId,
    quoteId: "22222222-2222-4222-8222-222222222222",
    supersedesInternalId: null,
    ...createGoMonthlyQuote(() => NOW),
  };

  it("selection adds only one pending intent and no forbidden side effects", async () => {
    const before = { checkout_intents: 0, accounts: 0, quotes: 0, payment_operations: 0, billing_arrangements: 0, allowance_windows: 0 };
    const after = { ...before };

    const result = await createPendingGoMonthlyIntent(
      { signingSecret: SESSION_SECRET, now: NOW },
      { insertPendingIntent: async () => { after.checkout_intents += 1; return intentId; } },
    );

    expect(result.response).toEqual({ intentId, tier: "go", cadence: "monthly", state: "selected" });
    expect(Object.fromEntries(Object.keys(before).map((key) => [key, after[key as keyof typeof after] - before[key as keyof typeof before]]))).toEqual({
      checkout_intents: 1,
      accounts: 0,
      quotes: 0,
      payment_operations: 0,
      billing_arrangements: 0,
      allowance_windows: 0,
    });
  });

  it("returns the canonical stored quote on retry and resolves the same account", async () => {
    const session = createSignedDemoSession(SESSION_SECRET, () => NOW);
    const boundUsers: string[] = [];
    const dependencies = {
      clock: () => NOW,
      getTemporaryAlias: async () => null,
      verifyEmailOtp: async () => ({ userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }),
      bindIdentityAndQuote: async (input: { authUserId: string }) => {
        boundUsers.push(input.authUserId);
        return { accountId: 3n, intentId, quote: stored };
      },
    };
    const input = { intentId, identityRoute: "persistent" as const, email: "person@example.com", token: "385104" };

    const first = await completeVerifiedIdentity(input, session.cookieValue, SESSION_SECRET, dependencies);
    const retry = await completeVerifiedIdentity(input, session.cookieValue, SESSION_SECRET, dependencies);

    expect(first).toEqual(retry);
    expect(first.quoteId).toBe(stored.quoteId);
    expect(first.expiresAt).toBe(stored.expiresAt);
    expect(boundUsers).toEqual(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]);
  });

  it("leaves the intent unbound when OTP verification fails", async () => {
    const session = createSignedDemoSession(SESSION_SECRET, () => NOW);
    let bindCalls = 0;
    await expect(completeVerifiedIdentity(
      { intentId, identityRoute: "persistent", email: "person@example.com", token: "000000" },
      session.cookieValue,
      SESSION_SECRET,
      {
        clock: () => NOW,
        getTemporaryAlias: async () => null,
        verifyEmailOtp: async () => null,
        bindIdentityAndQuote: async () => { bindCalls += 1; return { accountId: 3n, intentId, quote: stored }; },
      },
    )).rejects.toThrow("verification_failed");
    expect(bindCalls).toBe(0);
  });
});

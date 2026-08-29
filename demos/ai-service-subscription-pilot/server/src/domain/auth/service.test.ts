import { Webhook } from "standardwebhooks";
import { describe, expect, it, vi } from "vitest";

import {
  createSignedDemoSession,
  decryptDemoOtp,
} from "./demo-session";
import {
  DemoOtpUnavailableError,
  processSendEmailHook,
  retrieveDemoOtp,
  type DemoSessionRecord,
  type DemoSessionRepository,
} from "./send-email-hook";
import {
  IdentityUnavailableError,
  requestOtp,
  resumeVerifiedIdentity,
} from "./service";
import type { StoredQuote } from "../quote/service";
import { createGoMonthlyQuote } from "../quote/go-monthly-seattle";

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
  return {
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(signatureTime.getTime() / 1000)),
    "webhook-signature": webhook.sign(id, signatureTime, rawBody),
  };
}

describe("TC-0003 originating-session temporary identity", () => {
  it("catches storing a raw OTP or exposing it to another browser", async () => {
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
    const rawBody = JSON.stringify({
      user: { email: "demo-q7n4k2@test" },
      email_data: { token: "385104" },
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

    const stored = repository.sessions[0]!;
    expect(stored.otpCiphertext).not.toContain("385104");
    expect(decryptDemoOtp(stored.otpCiphertext!, SESSION_SECRET)).toBe("385104");
    expect(stored.otpExpiresAt?.toISOString()).toBe("2026-07-15T19:05:00.000Z");
    await expect(retrieveDemoOtp({
      cookieValue: browserB.cookieValue,
      clock: () => NOW,
      signingSecret: SESSION_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
    })).rejects.toBeInstanceOf(DemoOtpUnavailableError);
    await expect(retrieveDemoOtp({
      cookieValue: browserA.cookieValue,
      clock: () => NOW,
      signingSecret: SESSION_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
    })).resolves.toEqual({ otp: "385104", expiresAt: "2026-07-15T19:05:00.000Z" });
  });

  it("clears expired OTP state and rejects invalid hook evidence", async () => {
    const repository = new MemorySessionRepository();
    const browser = createSignedDemoSession(SESSION_SECRET, () => NOW);
    repository.sessions.push({
      publicId: browser.publicId,
      tokenHash: browser.tokenHash,
      testAlias: "demo-q7n4k2@test",
      expiresAt: browser.expiresAt,
      otpCiphertext: "expired",
      otpExpiresAt: new Date("2026-07-15T19:05:00.000Z"),
      consumedAt: null,
    });

    await expect(retrieveDemoOtp({
      cookieValue: browser.cookieValue,
      clock: () => new Date("2026-07-15T19:05:01.000Z"),
      signingSecret: SESSION_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
    })).rejects.toBeInstanceOf(DemoOtpUnavailableError);
    expect(repository.sessions[0]).toMatchObject({ otpCiphertext: null, otpExpiresAt: null });

    await expect(processSendEmailHook({
      rawBody: "not-json",
      headers: {
        "webhook-id": "bad",
        "webhook-timestamp": String(Math.floor(NOW.getTime() / 1000)),
        "webhook-signature": "v1,bad",
      },
      clock: () => NOW,
      hookSecret: HOOK_SECRET,
      encryptionSecret: SESSION_SECRET,
      repository,
      sendPersistentEmail: async () => undefined,
    })).rejects.toThrow("hook_rejected");
  });
});

describe("TC-0002 bearer resume owns identity", () => {
  const intentId = "11111111-1111-4111-8111-111111111111";
  const browser = createSignedDemoSession(SESSION_SECRET, () => NOW);
  const storedQuote: StoredQuote = {
    internalId: 11n,
    intentInternalId: 7n,
    accountId: 3n,
    intentId,
    quoteId: "22222222-2222-4222-8222-222222222222",
    supersedesInternalId: null,
    ...createGoMonthlyQuote(() => NOW),
  };

  it("catches requesting OTP for an intent outside the signed origin", async () => {
    const requestEmailOtp = vi.fn();

    await expect(requestOtp(
      { intentId, identityRoute: "persistent", email: "customer@example.com" },
      browser.cookieValue,
      SESSION_SECRET,
      {
        intentBelongsToSession: async () => false,
        getTemporaryAlias: async () => null,
        requestEmailOtp,
        clock: () => NOW,
      },
    )).rejects.toBeInstanceOf(IdentityUnavailableError);
    expect(requestEmailOtp).not.toHaveBeenCalled();
  });

  it("derives temporary identity only from verified email and exact session alias", async () => {
    const bindIdentityAndQuote = vi.fn().mockResolvedValue({ accountId: 3n, quote: storedQuote });
    const result = await resumeVerifiedIdentity({
      intentId,
      verifiedUser: {
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        email: "demo-q7n4k2@test",
      },
      cookieValue: browser.cookieValue,
      signingSecret: SESSION_SECRET,
      dependencies: {
        findSessionByPublicId: async () => ({
          publicId: browser.publicId,
          tokenHash: browser.tokenHash,
          testAlias: "demo-q7n4k2@test",
          expiresAt: browser.expiresAt,
          otpCiphertext: "encrypted",
          otpExpiresAt: new Date("2026-07-15T19:05:00.000Z"),
          consumedAt: null,
        }),
        bindIdentityAndQuote,
        clock: () => NOW,
      },
    });

    expect(result.dueToday.cents).toBe(553);
    expect(bindIdentityAndQuote).toHaveBeenCalledWith(expect.objectContaining({
      authUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      identityKind: "temporary",
      demoSessionPublicId: browser.publicId,
    }));
  });

  it("rejects a test-suffix user without exact alias correlation", async () => {
    await expect(resumeVerifiedIdentity({
      intentId,
      verifiedUser: {
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        email: "caller-selected@test",
      },
      cookieValue: browser.cookieValue,
      signingSecret: SESSION_SECRET,
      dependencies: {
        findSessionByPublicId: async () => null,
        bindIdentityAndQuote: vi.fn(),
        clock: () => NOW,
      },
    })).rejects.toBeInstanceOf(IdentityUnavailableError);
  });
});

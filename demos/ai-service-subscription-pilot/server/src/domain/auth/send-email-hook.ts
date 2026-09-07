import { Webhook } from "standardwebhooks";

import {
  decryptDemoOtp,
  encryptDemoOtp,
  sessionHashesMatch,
  verifySignedDemoSession,
} from "./demo-session.js";

export type DemoSessionRecord = {
  publicId: string;
  tokenHash: string;
  testAlias: string | null;
  expiresAt: Date;
  otpCiphertext: string | null;
  otpIssuedAt: Date | null;
  otpExpiresAt: Date | null;
  consumedAt: Date | null;
};

export interface DemoSessionRepository {
  findByPublicId(publicId: string): Promise<DemoSessionRecord | null>;
  findByAlias(alias: string): Promise<DemoSessionRecord | null>;
  storeOtp(publicId: string, ciphertext: string, issuedAt: Date, expiresAt: Date): Promise<boolean>;
  clearOtp(publicId: string, consumedAt?: Date): Promise<void>;
}

export class DemoOtpUnavailableError extends Error {
  constructor() { super("demo_otp_unavailable"); }
}

export class HookRejectedError extends Error {
  constructor() { super("hook_rejected"); }
}

type HookPayload = { user: { email: string }; email_data: { token: string } };

export async function processSendEmailHook(input: Readonly<{
  rawBody: string;
  headers: Record<string, string>;
  clock: () => Date;
  hookSecret: string;
  encryptionSecret: string;
  repository: DemoSessionRepository;
  sendPersistentEmail: (email: string, otp: string) => Promise<void>;
}>): Promise<void> {
  let payload: HookPayload;
  try {
    payload = new Webhook(input.hookSecret.replace(/^v1,whsec_/, ""))
      .verify(input.rawBody, input.headers) as HookPayload;
  } catch {
    throw new HookRejectedError();
  }
  if (!payload?.user?.email || typeof payload?.email_data?.token !== "string"
    || !/^\d{6}$/.test(payload.email_data.token)) {
    throw new HookRejectedError();
  }

  const session = await input.repository.findByAlias(payload.user.email);
  if (session && session.testAlias === payload.user.email) {
    const now = input.clock();
    if (session.expiresAt.getTime() <= now.getTime() || session.consumedAt) {
      return;
    }
    await input.repository.storeOtp(
      session.publicId,
      encryptDemoOtp(payload.email_data.token, input.encryptionSecret),
      now,
      new Date(Math.min(now.getTime() + 5 * 60_000, session.expiresAt.getTime())),
    );
    return;
  }

  await input.sendPersistentEmail(payload.user.email, payload.email_data.token);
}

export async function retrieveDemoOtp(input: Readonly<{
  cookieValue: string;
  clock: () => Date;
  signingSecret: string;
  encryptionSecret: string;
  repository: DemoSessionRepository;
}>): Promise<{ otp: string; expiresAt: string }> {
  const now = input.clock();
  let proof: ReturnType<typeof verifySignedDemoSession>;
  try {
    proof = verifySignedDemoSession(input.cookieValue, input.signingSecret, now);
  } catch {
    throw new DemoOtpUnavailableError();
  }
  const session = await input.repository.findByPublicId(proof.publicId);
  if (
    !session ||
    !sessionHashesMatch(session.tokenHash, proof.tokenHash) ||
    session.consumedAt ||
    !session.otpCiphertext ||
    !session.otpIssuedAt ||
    !session.otpExpiresAt
  ) {
    throw new DemoOtpUnavailableError();
  }
  if (session.otpExpiresAt.getTime() <= now.getTime()) {
    await input.repository.clearOtp(session.publicId);
    throw new DemoOtpUnavailableError();
  }
  return {
    otp: decryptDemoOtp(session.otpCiphertext, input.encryptionSecret),
    expiresAt: session.otpExpiresAt.toISOString(),
  };
}

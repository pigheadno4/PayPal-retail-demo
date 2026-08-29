import { createSignedDemoSession, verifySignedDemoSession } from "../auth/demo-session.js";

export async function createPendingGoMonthlyIntent(input: Readonly<{
  signingSecret: string;
  insertPendingIntent: (tokenHash: string, now: Date) => Promise<string>;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  const session = createSignedDemoSession(input.signingSecret, () => now);
  const intentId = await input.insertPendingIntent(session.tokenHash, now);
  return {
    response: {
      intentId,
      tier: "go" as const,
      cadence: "monthly" as const,
      state: "selected" as const,
    },
    cookieValue: session.cookieValue,
    cookieExpiresAt: session.expiresAt,
  };
}

export async function createTemporaryDemoSession(input: Readonly<{
  cookieValue: string;
  signingSecret: string;
  createOrRead: (proof: Readonly<{
    publicId: string;
    tokenHash: string;
    expiresAt: Date;
  }>) => Promise<{ email: string; expiresAt: string }>;
  now?: Date;
}>) {
  const proof = verifySignedDemoSession(
    input.cookieValue,
    input.signingSecret,
    input.now ?? new Date(),
  );
  return input.createOrRead(proof);
}

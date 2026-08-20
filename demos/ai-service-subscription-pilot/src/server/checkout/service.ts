import { createSignedDemoSession } from "@/server/auth/demo-session";
import { insertPendingIntent } from "@/server/checkout/repository";

export async function createPendingGoMonthlyIntent(input: Readonly<{
  signingSecret: string;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  const session = createSignedDemoSession(input.signingSecret, () => now);
  const intentId = await insertPendingIntent(session.tokenHash, now);
  return {
    response: { intentId, tier: "go" as const, cadence: "monthly" as const, state: "selected" as const },
    cookieValue: session.cookieValue,
    cookieExpiresAt: session.expiresAt,
  };
}

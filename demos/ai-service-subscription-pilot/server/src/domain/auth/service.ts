import type {
  CheckoutReview,
} from "../../../../shared/src/checkout.js";
import type { RequestOtpRequest } from "../../../../shared/src/identity.js";
import { createGoMonthlyQuote } from "../quote/go-monthly-seattle.js";
import { toCheckoutReview, type StoredQuote } from "../quote/service.js";
import {
  sessionHashesMatch,
  verifySignedDemoSession,
} from "./demo-session.js";
import type { DemoSessionRecord } from "./send-email-hook.js";

export class IdentityUnavailableError extends Error {
  constructor() { super("identity_unavailable"); }
}

type RequestOtpDependencies = Readonly<{
  intentBelongsToSession: (intentId: string, tokenHash: string, now: Date) => Promise<boolean>;
  getTemporaryAlias: (publicId: string) => Promise<string | null>;
  requestEmailOtp: (email: string) => Promise<void>;
  clock?: () => Date;
}>;

type BindIdentityAndQuote = (input: Readonly<{
  authUserId: string;
  identityKind: "persistent" | "temporary";
  temporaryExpiresAt: Date | null;
  intentId: string;
  sessionTokenHash: string;
  demoSessionPublicId: string;
  quote: ReturnType<typeof createGoMonthlyQuote>;
}>) => Promise<{ accountId: bigint; quote: StoredQuote }>;

type ResumeDependencies = Readonly<{
  findSessionByPublicId: (publicId: string) => Promise<DemoSessionRecord | null>;
  bindIdentityAndQuote: BindIdentityAndQuote;
  clock?: () => Date;
}>;

export async function requestOtp(
  input: RequestOtpRequest,
  cookieValue: string,
  signingSecret: string,
  dependencies: RequestOtpDependencies,
): Promise<{ accepted: true }> {
  const now = dependencies.clock?.() ?? new Date();
  let proof: ReturnType<typeof verifySignedDemoSession>;
  try {
    proof = verifySignedDemoSession(cookieValue, signingSecret, now);
  } catch {
    throw new IdentityUnavailableError();
  }
  if (!await dependencies.intentBelongsToSession(input.intentId, proof.tokenHash, now)) {
    throw new IdentityUnavailableError();
  }
  const email = input.identityRoute === "persistent"
    ? input.email
    : await dependencies.getTemporaryAlias(proof.publicId);
  if (!email) throw new IdentityUnavailableError();
  await dependencies.requestEmailOtp(email);
  return { accepted: true };
}

export async function resumeVerifiedIdentity(input: Readonly<{
  intentId: string;
  verifiedUser: Readonly<{ userId: string; email: string }>;
  cookieValue: string;
  signingSecret: string;
  dependencies: ResumeDependencies;
}>): Promise<CheckoutReview> {
  const now = input.dependencies.clock?.() ?? new Date();
  let proof: ReturnType<typeof verifySignedDemoSession>;
  try {
    proof = verifySignedDemoSession(input.cookieValue, input.signingSecret, now);
  } catch {
    throw new IdentityUnavailableError();
  }

  const session = await input.dependencies.findSessionByPublicId(proof.publicId);
  const isTemporary = Boolean(
    session
    && session.testAlias === input.verifiedUser.email
    && sessionHashesMatch(session.tokenHash, proof.tokenHash)
    && !session.consumedAt
    && session.expiresAt.getTime() > now.getTime(),
  );
  if (input.verifiedUser.email.endsWith("@test") && !isTemporary) {
    throw new IdentityUnavailableError();
  }

  const bound = await input.dependencies.bindIdentityAndQuote({
    authUserId: input.verifiedUser.userId,
    identityKind: isTemporary ? "temporary" : "persistent",
    temporaryExpiresAt: isTemporary ? proof.expiresAt : null,
    intentId: input.intentId,
    sessionTokenHash: proof.tokenHash,
    demoSessionPublicId: proof.publicId,
    quote: createGoMonthlyQuote(() => now),
  });
  return toCheckoutReview(bound.quote);
}

import type { RequestOtpRequest, VerifyOtpRequest } from "@/contracts/identity";
import type { CheckoutReview } from "@/contracts/checkout";
import { verifySignedDemoSession } from "@/server/auth/demo-session";
import { bindVerifiedIdentityAndQuote, getTemporaryAlias } from "@/server/checkout/repository";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";
import { toCheckoutReview } from "@/server/quote/service";

type RequestOtpDependencies = Readonly<{
  getTemporaryAlias: typeof getTemporaryAlias;
  requestEmailOtp: (email: string) => Promise<void>;
  clock?: () => Date;
}>;

type VerifyOtpDependencies = Readonly<{
  getTemporaryAlias: typeof getTemporaryAlias;
  verifyEmailOtp: (email: string, token: string) => Promise<{ userId: string } | null>;
  bindIdentityAndQuote: typeof bindVerifiedIdentityAndQuote;
  clock?: () => Date;
}>;

async function requestEmailOtp(email: string): Promise<void> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) throw new Error("request_not_available");
}

async function verifyEmailOtp(email: string, token: string): Promise<{ userId: string } | null> {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  return error || !data.user ? null : { userId: data.user.id };
}

const requestDependencies: RequestOtpDependencies = { getTemporaryAlias, requestEmailOtp };
const verifyDependencies: VerifyOtpDependencies = {
  getTemporaryAlias,
  verifyEmailOtp,
  bindIdentityAndQuote: bindVerifiedIdentityAndQuote,
};

export async function requestOtp(
  input: RequestOtpRequest,
  cookieValue: string,
  signingSecret: string,
  dependencies: RequestOtpDependencies = requestDependencies,
) {
  const proof = verifySignedDemoSession(cookieValue, signingSecret, dependencies.clock?.() ?? new Date());
  const email = input.identityRoute === "persistent" ? input.email : await dependencies.getTemporaryAlias(proof.publicId);
  if (!email) throw new Error("request_not_available");
  await dependencies.requestEmailOtp(email);
  return { accepted: true as const };
}

export async function completeVerifiedIdentity(
  input: VerifyOtpRequest,
  cookieValue: string,
  signingSecret: string,
  dependencyOverrides: Partial<VerifyOtpDependencies> = {},
): Promise<CheckoutReview> {
  const dependencies = { ...verifyDependencies, ...dependencyOverrides };
  const now = dependencies.clock?.() ?? new Date();
  const proof = verifySignedDemoSession(cookieValue, signingSecret, now);
  const temporaryAlias = input.identityRoute === "temporary" ? await dependencies.getTemporaryAlias(proof.publicId) : null;
  const email = input.identityRoute === "persistent" ? input.email : temporaryAlias;
  if (!email) throw new Error("verification_failed");
  const verified = await dependencies.verifyEmailOtp(email, input.token);
  if (!verified) throw new Error("verification_failed");
  const bound = await dependencies.bindIdentityAndQuote({
    authUserId: verified.userId,
    identityKind: input.identityRoute,
    temporaryExpiresAt: input.identityRoute === "temporary" ? proof.expiresAt : null,
    intentId: input.intentId,
    sessionTokenHash: proof.tokenHash,
    demoSessionPublicId: proof.publicId,
    quote: createGoMonthlyQuote(() => now),
  });
  return toCheckoutReview(bound.quote);
}

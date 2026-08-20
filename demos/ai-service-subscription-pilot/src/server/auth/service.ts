import type { RequestOtpRequest, VerifyOtpRequest } from "@/contracts/identity";
import type { CheckoutReview } from "@/contracts/checkout";
import { verifySignedDemoSession } from "@/server/auth/demo-session";
import { bindVerifiedIdentityAndQuote, getTemporaryAlias } from "@/server/checkout/repository";
import { createGoMonthlyQuote } from "@/server/quote/go-monthly-seattle";

export async function requestOtp(input: RequestOtpRequest, cookieValue: string, signingSecret: string) {
  const proof = verifySignedDemoSession(cookieValue, signingSecret);
  const email = input.identityRoute === "persistent" ? input.email : await getTemporaryAlias(proof.publicId);
  if (!email) throw new Error("request_not_available");
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  return { accepted: true as const };
}

export async function completeVerifiedIdentity(input: VerifyOtpRequest, cookieValue: string, signingSecret: string): Promise<CheckoutReview> {
  const proof = verifySignedDemoSession(cookieValue, signingSecret);
  const temporaryAlias = input.identityRoute === "temporary" ? await getTemporaryAlias(proof.publicId) : null;
  const email = input.identityRoute === "persistent" ? input.email : temporaryAlias;
  if (!email) throw new Error("verification_failed");
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token: input.token, type: "email" });
  if (error || !data.user) throw new Error("verification_failed");
  const draft = createGoMonthlyQuote();
  const bound = await bindVerifiedIdentityAndQuote({
    authUserId: data.user.id,
    identityKind: input.identityRoute,
    temporaryExpiresAt: input.identityRoute === "temporary" ? proof.expiresAt : null,
    intentId: input.intentId,
    sessionTokenHash: proof.tokenHash,
    demoSessionPublicId: proof.publicId,
    quote: draft,
  });
  const money = (cents: number) => ({ currency: "USD" as const, cents });
  return {
    intentId: bound.intentId, quoteId: bound.quoteId, tier: "go", cadence: "monthly",
    base: money(draft.baseCents), promotion: money(draft.promotionCents), taxableSubtotal: money(draft.taxableSubtotalCents),
    taxBasisPoints: 1055, tax: money(draft.taxCents), dueToday: money(draft.totalCents), expiresAt: draft.expiresAt,
    renewsAt: draft.renewsAt, allowanceResetsAt: draft.allowanceResetsAt, timeZone: draft.timeZone,
    pricingVersion: draft.pricingVersion, taxVersion: draft.taxVersion,
  };
}

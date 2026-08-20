import { IdentityPanel } from "@/components/checkout/identity-panel";
import { QuoteReview } from "@/components/checkout/quote-review";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ intentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { intentId } = await params;
  const query = await searchParams;
  const state = typeof query.state === "string" ? query.state : "identity";
  const route = typeof query.route === "string" ? query.route : "persistent";
  return <main className="shell checkout"><aside className="summary"><p className="eyebrow">Selection retained</p><h2>Go Monthly</h2><p><strong>$5.00</strong> first period before tax</p><p>100 included units</p><ol><li className={state === "identity" ? "current" : ""}>Account</li><li className={state === "otp" ? "current" : ""}>Verify</li><li className={state === "review" || state === "stale" ? "current" : ""}>Review</li></ol></aside>{state === "review" || state === "stale" ? <QuoteReview intentId={intentId} stale={state === "stale"} /> : <IdentityPanel intentId={intentId} state={state} route={route} />}</main>;
}

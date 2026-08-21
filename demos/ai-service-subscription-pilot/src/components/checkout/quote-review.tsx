"use client";

import type { CheckoutReview } from "@/contracts/checkout";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function instant(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(new Date(value));
}

export function QuoteReview({
  review,
  stale,
  busy,
  notice,
  onReplace,
}: Readonly<{
  review: CheckoutReview;
  stale: boolean;
  busy: boolean;
  notice: string;
  onReplace: () => void;
}>) {
  if (stale) return <section className="evidence-card"><p className="step warning">Review changed · action required</p><h1>Your review changed</h1><p>The previous immutable quote is no longer current. Generate one replacement and review it before any later checkout step.</p><div className="status-row"><span>Previous review</span><strong>Expired</strong></div>{notice && <p className="warning" role="alert">{notice}</p>}<button disabled={busy} onClick={onReplace}>{busy ? "Updating review…" : "Review updated total"}</button></section>;

  return <section className="evidence-card"><p className="step">Step 3 of 3 · Review</p><h1>Review Go Monthly</h1><p className="muted">Seattle, WA · fixed Q3 2026 demo fixture</p><div className="money-list"><div><span>Monthly base</span><strong>{money(review.base.cents)}</strong></div><div><span>First-period promotion</span><strong>−{money(Math.abs(review.promotion.cents))}</strong></div><div><span>Taxable subtotal</span><strong>{money(review.taxableSubtotal.cents)}</strong></div><div><span>Seattle tax ({(review.taxBasisPoints / 100).toFixed(2)}%)</span><strong>{money(review.tax.cents)}</strong></div><div className="total"><span>Due today</span><strong>{money(review.dueToday.cents)}</strong></div></div><div className="timeline"><p><strong>Quote expires</strong><span>{instant(review.expiresAt, review.timeZone)}</span></p><p><strong>Renews</strong><span>{instant(review.renewsAt, review.timeZone)} · {money(review.base.cents)} plus then-applicable tax</span></p><p><strong>Allowance resets</strong><span>{instant(review.allowanceResetsAt, review.timeZone)}</span></p></div><p className="safe-note">Identity is verified. No charge, access, or allowance has been created.</p></section>;
}

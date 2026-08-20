"use client";

import { useRouter } from "next/navigation";

export function QuoteReview({ intentId, stale }: { intentId: string; stale: boolean }) {
  const router = useRouter();
  if (stale) return <section className="evidence-card"><p className="step warning">Review changed · action required</p><h1>Your review changed</h1><p>The previous immutable quote is no longer current. Generate one replacement and review it before any later checkout step.</p><div className="status-row"><span>Previous review</span><strong>Expired</strong></div><button onClick={() => router.push(`/checkout/${intentId}?state=review`)}>Review updated total</button></section>;
  return <section className="evidence-card"><p className="step">Step 3 of 3 · Review</p><h1>Review Go Monthly</h1><p className="muted">Seattle, WA · fixed Q3 2026 demo fixture</p><div className="money-list"><div><span>Monthly base</span><strong>$10.00</strong></div><div><span>First-period promotion</span><strong>−$5.00</strong></div><div><span>Taxable subtotal</span><strong>$5.00</strong></div><div><span>Seattle tax (10.55%)</span><strong>$0.53</strong></div><div className="total"><span>Due today</span><strong>$5.53</strong></div></div><div className="timeline"><p><strong>Quote expires</strong><span>Jul 15, 2026 · 12:15 PM PDT</span></p><p><strong>Renews</strong><span>Aug 15, 2026 · 12:00 PM PDT · $10.00 plus then-applicable tax</span></p><p><strong>Allowance resets</strong><span>Aug 15, 2026 · 12:00 PM PDT</span></p></div><p className="safe-note">Identity is verified. No charge, access, or allowance has been created.</p></section>;
}

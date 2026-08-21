"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function chooseGo() {
    setBusy(true);
    try {
      const response = await fetch("/api/checkout-intents", { method: "POST" });
      const result = await response.json();
      if (response.ok) router.push(`/checkout/${result.intentId}`);
      else setBusy(false);
    } catch { setBusy(false); }
  }
  return <main className="shell home"><section className="hero"><p className="eyebrow">Go Monthly · 100 units</p><h1>AI service, with a payment story you can inspect.</h1><p>Start with one application-owned plan choice. Identity and the exact Seattle review come next; checkout does not pay automatically.</p></section><section className="plan-card"><div><p className="eyebrow">First monthly period</p><h2>Go</h2><p className="price"><s>$10.00</s> <strong>$5.00</strong></p><p>100 included units · renews monthly</p></div><ul><li>Generate Answer access</li><li>Exact quote before checkout</li><li>Return with the same account state</li></ul><button onClick={chooseGo} disabled={busy}>{busy ? "Creating your selection…" : "Choose Go"}</button></section></main>;
}

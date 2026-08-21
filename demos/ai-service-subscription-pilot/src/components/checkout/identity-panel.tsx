"use client";

import { useEffect, useState } from "react";

import type { CheckoutReview } from "@/contracts/checkout";
import { QuoteReview } from "@/components/checkout/quote-review";

type Stage = "loading" | "identity" | "otp" | "review" | "stale";
type IdentityRoute = "persistent" | "temporary";

function expired(review: CheckoutReview) {
  return Date.parse(review.expiresAt) <= Date.now();
}

export function IdentityPanel({ intentId }: { intentId: string }) {
  const [stage, setStage] = useState<Stage>("loading");
  const [identityRoute, setIdentityRoute] = useState<IdentityRoute>("persistent");
  const [email, setEmail] = useState("");
  const [temporaryAlias, setTemporaryAlias] = useState("");
  const [token, setToken] = useState("");
  const [review, setReview] = useState<CheckoutReview | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(`/api/quotes?intentId=${encodeURIComponent(intentId)}`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<CheckoutReview> : null)
      .then((current) => {
        if (!active) return;
        if (current) {
          setReview(current);
          setStage(expired(current) ? "stale" : "review");
        } else setStage("identity");
      })
      .catch(() => { if (active) setStage("identity"); });
    return () => { active = false; };
  }, [intentId]);

  async function begin(route: IdentityRoute) {
    setBusy(true);
    setNotice("");
    try {
      let alias = "";
      if (route === "temporary") {
        const sessionResponse = await fetch("/api/auth/demo-session", { method: "POST" });
        if (!sessionResponse.ok) throw new Error("start_failed");
        const session = await sessionResponse.json() as { email: string };
        alias = session.email;
      }
      const body = route === "persistent"
        ? { intentId, identityRoute: route, email }
        : { intentId, identityRoute: route };
      const requestResponse = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!requestResponse.ok) throw new Error("request_failed");
      setIdentityRoute(route);
      setTemporaryAlias(alias);
      setStage("otp");
    } catch {
      setNotice("We could not start verification. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function revealTemporaryOtp() {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/demo-session/otp", { cache: "no-store" });
      if (!response.ok) throw new Error("otp_unavailable");
      const result = await response.json() as { otp: string };
      setToken(result.otp);
    } catch {
      setNotice("That code is unavailable or expired. Request a new code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setNotice("");
    try {
      const body = identityRoute === "persistent"
        ? { intentId, identityRoute, email, token }
        : { intentId, identityRoute, token };
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("verification_failed");
      const current = await response.json() as CheckoutReview;
      setReview(current);
      setStage(expired(current) ? "stale" : "review");
    } catch {
      setNotice("That code is unavailable or expired. Request a new code.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceReview() {
    if (!review) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, currentQuoteId: review.quoteId }),
      });
      if (!response.ok) throw new Error("replacement_failed");
      const result = await response.json() as { review: CheckoutReview };
      setReview(result.review);
      setStage(expired(result.review) ? "stale" : "review");
    } catch {
      setNotice("The updated review is not available yet. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const activeStep = stage === "identity" || stage === "loading" ? 0 : stage === "otp" ? 1 : 2;
  let content: React.ReactNode;
  if (stage === "loading") {
    content = <section className="evidence-card identity" aria-live="polite"><p className="step">Restoring checkout</p><h1>Checking your account…</h1></section>;
  } else if ((stage === "review" || stage === "stale") && review) {
    content = <QuoteReview review={review} stale={stage === "stale"} busy={busy} notice={notice} onReplace={replaceReview} />;
  } else if (stage === "otp") {
    content = <section className="evidence-card identity"><p className="step">Step 2 of 3 · Verify</p><h1>{identityRoute === "temporary" ? "Verify your temporary demo identity" : "Check your email"}</h1><p>{identityRoute === "temporary" ? <>This browser can securely reveal the short-lived code sent to <strong>{temporaryAlias}</strong>.</> : <>Enter the code sent to <strong>{email}</strong>. Your checkout selection is waiting.</>}</p>{identityRoute === "temporary" && <button className="secondary" disabled={busy} onClick={revealTemporaryOtp}>Reveal code in this browser</button>}<label>Six-digit code<input inputMode="numeric" maxLength={6} value={token} onChange={(event) => setToken(event.target.value)} /></label>{notice && <p className="warning" role="alert">{notice}</p>}<button disabled={busy || token.length !== 6} onClick={verify}>{busy ? "Verifying…" : "Verify and review"}</button></section>;
  } else {
    content = <section className="evidence-card identity"><p className="step">Step 1 of 3 · Account</p><h1>Choose how to continue</h1><p>Both routes create the same Supabase-owned application account model. Your selection remains separate from checkout.</p>{notice && <p className="warning" role="alert">{notice}</p>}<div className="route-grid"><article><h2>Persistent real email</h2><p>Keep subscription and usage state across future visits.</p><label>Email<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button disabled={busy || !email} onClick={() => begin("persistent")}>Continue with email</button></article><article><h2>Temporary .test identity</h2><p>Use a 24-hour presenter session; only this browser can retrieve its code.</p><button className="secondary" disabled={busy} onClick={() => begin("temporary")}>{busy ? "Starting…" : "Create temporary identity"}</button></article></div></section>;
  }

  return <main className="shell checkout"><aside className="summary"><p className="eyebrow">Selection retained</p><h2>Go Monthly</h2><p><strong>$5.00</strong> first period before tax</p><p>100 included units</p><ol><li className={activeStep === 0 ? "current" : ""}>Account</li><li className={activeStep === 1 ? "current" : ""}>Verify</li><li className={activeStep === 2 ? "current" : ""}>Review</li></ol></aside>{content}</main>;
}

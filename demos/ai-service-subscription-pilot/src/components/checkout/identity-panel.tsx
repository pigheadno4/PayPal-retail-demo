"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IdentityPanel({ intentId, state, route }: { intentId: string; state: string; route: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState("");
  async function begin(identityRoute: "persistent" | "temporary") {
    if (identityRoute === "temporary") await fetch("/api/auth/demo-session", { method: "POST" });
    const body = identityRoute === "persistent" ? { intentId, identityRoute, email } : { intentId, identityRoute };
    await fetch("/api/auth/request-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    router.push(`/checkout/${intentId}?state=otp&route=${identityRoute}`);
  }
  async function verify() {
    const body = route === "persistent" ? { intentId, identityRoute: "persistent", email, token } : { intentId, identityRoute: "temporary", token };
    const response = await fetch("/api/auth/verify-otp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) router.push(`/checkout/${intentId}?state=review`); else setNotice("That code is unavailable or expired. Request a new code.");
  }
  if (state === "otp") return <section className="evidence-card identity"><p className="step">Step 2 of 3 · Verify</p><h1>{route === "temporary" ? "Verify your temporary demo identity" : "Check your email"}</h1><p>{route === "temporary" ? <>This browser can securely reveal the short-lived code sent to <strong>demo-q7n4k2@test</strong>.</> : "Enter the code sent to your persistent email. Your checkout selection is waiting."}</p>{route === "persistent" && <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>}<label>Six-digit code<input inputMode="numeric" maxLength={6} value={token} onChange={(event) => setToken(event.target.value)} /></label>{notice && <p className="warning" role="alert">{notice}</p>}<button onClick={verify}>Verify and review</button></section>;
  return <section className="evidence-card identity"><p className="step">Step 1 of 3 · Account</p><h1>Choose how to continue</h1><p>Both routes create the same Supabase-owned application account model. Your selection remains separate from checkout.</p><div className="route-grid"><article><h2>Persistent real email</h2><p>Keep subscription and usage state across future visits.</p><label>Email<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label><button onClick={() => begin("persistent")}>Continue with email</button></article><article><h2>Temporary .test identity</h2><p>Use a 24-hour presenter session; only this browser can retrieve its code.</p><button className="secondary" onClick={() => begin("temporary")}>Create temporary identity</button></article></div></section>;
}

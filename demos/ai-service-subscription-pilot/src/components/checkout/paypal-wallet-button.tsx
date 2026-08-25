"use client";
/* eslint-disable @next/next/no-img-element -- PayPal documents this exact FraudNet noscript pixel. */

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Script from "next/script";
import { useEffect, useState } from "react";

import type { PayPalCheckoutStatus, PayPalIdTokenResponse } from "@/contracts/paypal";

type Props = Readonly<{
  intentId: string;
  quoteId: string;
  nonce: string;
  onVerifying(): void;
  onComplete(status: PayPalCheckoutStatus): void;
  onCancel(): void;
  onFailure(): void;
}>;

function newAttemptId() { return crypto.randomUUID().replaceAll("-", ""); }

export function PayPalWalletButton(props: Props) {
  const [bootstrap, setBootstrap] = useState<PayPalIdTokenResponse | null>(null);
  const [fraudNetReady, setFraudNetReady] = useState(false);
  const [error, setError] = useState("");
  const [attemptId] = useState(newAttemptId);
  const [operationId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let active = true;
    fetch("/api/paypal/id-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: props.intentId, quoteId: props.quoteId }) })
      .then(async (response) => { if (!response.ok) throw new Error(); return response.json() as Promise<PayPalIdTokenResponse>; })
      .then((value) => { if (active) setBootstrap(value); })
      .catch(() => { if (active) setError("PayPal is not available right now."); });
    return () => { active = false; };
  }, [props.intentId, props.quoteId]);

  const params = bootstrap ? { f: attemptId, s: bootstrap.fraudNet.sourceId, sandbox: bootstrap.fraudNet.sandbox } : null;
  return <div className="paypal-area">
    {params && <>
      <script type="application/json" nonce={props.nonce} {...({ fncls: "fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99" } as Record<string, string>)} dangerouslySetInnerHTML={{ __html: JSON.stringify(params).replaceAll("<", "\\u003c") }} />
      <Script src="https://c.paypal.com/da/r/fb.js" nonce={props.nonce} strategy="afterInteractive" onLoad={() => setFraudNetReady(true)} onError={() => setError("PayPal risk checks could not initialize.")} />
      <noscript><img alt="" width="1" height="1" src={`https://c.paypal.com/v1/r/d/b/ns?f=${attemptId}&s=${encodeURIComponent(params.s)}&js=0&r=1`} /></noscript>
    </>}
    {bootstrap && fraudNetReady && <PayPalScriptProvider options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, components: "buttons", currency: "USD", intent: "capture", vault: true, dataUserIdToken: bootstrap.idToken }}>
      <PayPalButtons fundingSource="paypal" style={{ layout: "vertical", shape: "rect", label: "paypal" }} createOrder={async () => {
        setError("");
        const response = await fetch("/api/paypal/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: props.intentId, quoteId: props.quoteId, operationId, clientMetadataId: attemptId }) });
        const result = await response.json() as { status?: string; orderId?: string };
        if (!response.ok || result.status !== "ready" || !result.orderId) throw new Error("payment_not_available");
        return result.orderId;
      }} onApprove={async ({ orderID }) => {
        props.onVerifying();
        const response = await fetch(`/api/paypal/orders/${encodeURIComponent(orderID)}/capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: props.intentId, quoteId: props.quoteId, operationId }) });
        if (!response.ok) { props.onFailure(); return; }
        props.onComplete(await response.json() as PayPalCheckoutStatus);
      }} onCancel={props.onCancel} onError={() => props.onFailure()} />
    </PayPalScriptProvider>}
    {!fraudNetReady && !error && <p className="muted" aria-live="polite">Preparing secure PayPal checkout…</p>}
    {error && <p className="warning" role="alert">{error}</p>}
  </div>;
}

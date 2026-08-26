"use client";
/* eslint-disable @next/next/no-img-element -- PayPal documents this exact FraudNet noscript pixel. */

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import type { CreatePayPalOrderResponse, PayPalCheckoutStatus, PayPalIdTokenResponse } from "@/contracts/paypal";

type Props = Readonly<{
  intentId: string;
  quoteId: string;
  nonce: string;
  onVerifying(): void;
  onComplete(status: PayPalCheckoutStatus): void;
  onPending(status: PayPalCheckoutStatus): void;
  onCancel(): void;
  onFailure(): void;
}>;

function newAttemptId() { return crypto.randomUUID().replaceAll("-", ""); }

export function buildPayPalScriptOptions(input: Readonly<{ clientId: string; idToken: string; nonce: string }>) {
  return Object.freeze({
    clientId: input.clientId,
    components: "buttons",
    currency: "USD",
    intent: "capture",
    vault: true,
    dataUserIdToken: input.idToken,
    dataCspNonce: input.nonce,
  });
}

export function classifyCaptureStatus(status: PayPalCheckoutStatus) {
  if (status.funding === "verified") return "complete" as const;
  if (status.funding === "pending") return "pending" as const;
  return "failed" as const;
}

export function classifyCreateOrderResponse(result: Partial<CreatePayPalOrderResponse>) {
  if (result.status === "ready" && result.operationId && result.orderId) {
    return Object.freeze({ kind: "ready" as const, operationId: result.operationId, orderId: result.orderId });
  }
  if (result.status === "in_progress" && result.operationId) {
    return Object.freeze({
      kind: "pending" as const,
      status: Object.freeze({
        operationId: result.operationId,
        funding: "pending" as const,
        reusableReadiness: "pending" as const,
        customerMessage: "Payment verification is still in progress.",
      }),
    });
  }
  return Object.freeze({ kind: "failed" as const });
}

export function PayPalWalletButton(props: Props) {
  const [bootstrap, setBootstrap] = useState<PayPalIdTokenResponse | null>(null);
  const [fraudNetReady, setFraudNetReady] = useState(false);
  const [error, setError] = useState("");
  const [attemptId] = useState(newAttemptId);
  const operationId = useRef(crypto.randomUUID());
  const createPending = useRef(false);

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
    {bootstrap && fraudNetReady && <PayPalScriptProvider options={buildPayPalScriptOptions({ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, idToken: bootstrap.idToken, nonce: props.nonce })}>
      <PayPalButtons fundingSource="paypal" style={{ layout: "vertical", shape: "rect", label: "paypal" }} createOrder={async () => {
        setError("");
        createPending.current = false;
        const response = await fetch("/api/paypal/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: props.intentId, quoteId: props.quoteId, operationId: operationId.current, clientMetadataId: attemptId }) });
        const result = await response.json() as Partial<CreatePayPalOrderResponse>;
        if (!response.ok) throw new Error("payment_not_available");
        const outcome = classifyCreateOrderResponse(result);
        if (outcome.kind === "failed") throw new Error("payment_not_available");
        operationId.current = outcome.kind === "ready" ? outcome.operationId : outcome.status.operationId;
        if (outcome.kind === "pending") {
          createPending.current = true;
          props.onPending(outcome.status);
          throw new Error("payment_in_progress");
        }
        return outcome.orderId;
      }} onApprove={async ({ orderID }) => {
        props.onVerifying();
        const response = await fetch(`/api/paypal/orders/${encodeURIComponent(orderID)}/capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intentId: props.intentId, quoteId: props.quoteId, operationId: operationId.current }) });
        if (!response.ok) { props.onFailure(); return; }
        const status = await response.json() as PayPalCheckoutStatus;
        const outcome = classifyCaptureStatus(status);
        if (outcome === "complete") props.onComplete(status);
        else if (outcome === "pending") props.onPending(status);
        else props.onFailure();
      }} onCancel={props.onCancel} onError={() => {
        if (createPending.current) {
          createPending.current = false;
          return;
        }
        props.onFailure();
      }} />
    </PayPalScriptProvider>}
    {!fraudNetReady && !error && <p className="muted" aria-live="polite">Preparing secure PayPal checkout…</p>}
    {error && <p className="warning" role="alert">{error}</p>}
  </div>;
}

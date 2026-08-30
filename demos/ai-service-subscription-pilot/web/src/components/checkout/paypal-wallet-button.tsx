import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { createElement, useEffect, useRef, useState } from "react";

import type {
  CreatePayPalOrderResponse,
  PayPalCheckoutStatus,
  PayPalIdTokenResponse,
} from "../../../../shared/src/paypal.js";
import { demoApi } from "../../lib/api.js";

type Props = Readonly<{
  intentId: string;
  quoteId: string;
  accessToken: string;
  nonce: string;
  operationId: string;
  clientMetadataId: string;
  onOperationResolved(operationId: string): void;
  onVerifying(): void;
  onComplete(status: PayPalCheckoutStatus): void;
  onPending(status: PayPalCheckoutStatus): void;
  onCancel(): void;
  onFailure(operationId: string): void;
}>;

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
  const operationId = useRef<string>(props.operationId);
  const createPending = useRef(false);

  useEffect(() => {
    let active = true;
    void demoApi.paypalIdToken(props.intentId, props.quoteId, props.accessToken)
      .then((value) => { if (active) setBootstrap(value); })
      .catch(() => { if (active) setError("PayPal is not available right now."); });
    return () => { active = false; };
  }, [props.intentId, props.quoteId, props.accessToken]);

  useEffect(() => {
    if (!bootstrap) return;
    const loader = document.createElement("script");
    loader.src = "https://c.paypal.com/da/r/fb.js";
    loader.nonce = props.nonce;
    loader.async = true;
    loader.onload = () => setFraudNetReady(true);
    loader.onerror = () => setError("PayPal risk checks could not initialize.");
    document.head.append(loader);
    return () => loader.remove();
  }, [bootstrap, props.nonce]);

  const params = bootstrap
    ? { f: props.clientMetadataId, s: bootstrap.fraudNet.sourceId, sandbox: bootstrap.fraudNet.sandbox }
    : null;
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  return (
    <div className="paypal-area">
      {params ? (
        <>
          <script
            type="application/json"
            nonce={props.nonce}
            {...({ fncls: "fnparams-dede7cc5-15fd-4c75-a9f4-36c430ee3a99" } as Record<string, string>)}
            dangerouslySetInnerHTML={{ __html: JSON.stringify(params).replaceAll("<", "\\u003c") }}
          />
          <noscript>
            {createElement("img", {
              alt: "",
              width: 1,
              height: 1,
              src: `https://c.paypal.com/v1/r/d/b/ns?f=${props.clientMetadataId}&s=${encodeURIComponent(params.s)}&js=0&r=1`,
            })}
          </noscript>
        </>
      ) : null}
      {bootstrap && fraudNetReady && clientId ? (
        <PayPalScriptProvider options={buildPayPalScriptOptions({ clientId, idToken: bootstrap.idToken, nonce: props.nonce })}>
          <PayPalButtons
            fundingSource="paypal"
            style={{ layout: "vertical", shape: "rect", label: "paypal" }}
            createOrder={async () => {
              setError("");
              createPending.current = false;
              const result = await demoApi.createPayPalOrder({
                intentId: props.intentId,
                quoteId: props.quoteId,
                operationId: operationId.current,
                clientMetadataId: props.clientMetadataId,
              }, props.accessToken);
              const outcome = classifyCreateOrderResponse(result);
              if (outcome.kind === "failed") throw new Error("payment_not_available");
              operationId.current = outcome.kind === "ready" ? outcome.operationId : outcome.status.operationId;
              props.onOperationResolved(operationId.current);
              if (outcome.kind === "pending") {
                createPending.current = true;
                props.onPending(outcome.status);
                throw new Error("payment_in_progress");
              }
              return outcome.orderId;
            }}
            onApprove={async ({ orderID }) => {
              props.onVerifying();
              try {
                const status = await demoApi.capturePayPalOrder(orderID, {
                  intentId: props.intentId,
                  quoteId: props.quoteId,
                  operationId: operationId.current,
                }, props.accessToken);
                const outcome = classifyCaptureStatus(status);
                if (outcome === "complete") props.onComplete(status);
                else if (outcome === "pending") props.onPending(status);
                else props.onFailure(operationId.current);
              } catch {
                props.onFailure(operationId.current);
              }
            }}
            onCancel={props.onCancel}
            onError={() => {
              if (createPending.current) {
                createPending.current = false;
                return;
              }
              props.onFailure(operationId.current);
            }}
          />
        </PayPalScriptProvider>
      ) : null}
      {!fraudNetReady && !error ? <p className="muted" aria-live="polite">Preparing secure PayPal checkout…</p> : null}
      {error ? <p className="warning-note" role="alert">{error}</p> : null}
    </div>
  );
}

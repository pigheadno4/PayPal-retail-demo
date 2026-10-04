import { destroySDKScript, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import type { PayPalButtonsComponent, PayPalButtonsComponentOptions } from "@paypal/paypal-js";
import { createElement, useEffect, useRef, useState } from "react";

import type {
  CreatePayPalOrderResponse,
  PayPalCheckoutStatus,
  PayPalIdTokenResponse,
} from "../../../../shared/src/paypal.js";
import { ApiRequestError, demoApi } from "../../lib/api.js";

type Props = Readonly<{
  intentId: string;
  quoteId: string;
  accessToken: string;
  nonce: string;
  operationId: string;
  clientMetadataId: string;
  expiresAt: string;
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

export function classifyCaptureError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 409 && error.code === "payment_not_available"
    ? "failed" as const
    : "pending" as const;
}

export function classifyCreateOrderError(error: unknown) {
  return error instanceof ApiRequestError && error.status === 409 && error.code === "payment_not_available"
    ? "failed" as const
    : "pending" as const;
}

function uncertainCaptureStatus(operationId: string): PayPalCheckoutStatus {
  return Object.freeze({
    operationId,
    funding: "pending",
    reusableReadiness: "pending",
    customerMessage: "Payment verification is still in progress.",
  });
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

export function renderPayPalControl(buttons: Pick<PayPalButtonsComponent, "isEligible" | "render" | "close">, container: HTMLElement, ready: () => void, failed: () => void) {
  let active = true;
  try {
    if (!buttons.isEligible()) failed();
    else void buttons.render(container).then(() => { if (active) ready(); }, () => { if (active) failed(); });
  } catch { failed(); }
  return () => { active = false; void buttons.close().catch(() => {}); };
}

function measurePreparation(stage: "bootstrap" | "fraudnet" | "sdk" | "render") {
  const startedAt = performance.now();
  let settled = false;
  return (outcome: "success" | "failure" | "cancelled") => {
    if (settled) return false;
    settled = true;
    const durationMs = performance.now() - startedAt;
    if (Number.isFinite(durationMs) && durationMs >= 0) {
      // Diagnostics never carry provider context or change preparation/payment behavior.
      try { console.info({ stage, durationMs, outcome }); } catch { /* unavailable diagnostic sink */ }
    }
    return true;
  };
}

function OfficialControl(props: Readonly<{ options: PayPalButtonsComponentOptions; ready: () => void; failed: () => void; expiresAt: string }>) {
  const [{ isResolved, isRejected, options }] = usePayPalScriptReducer();
  const scriptId = options["data-react-paypal-script-id"];
  useEffect(() => () => destroySDKScript(scriptId), [scriptId]);
  const container = useRef<HTMLDivElement>(null);
  const sdkMeasurement = useRef<ReturnType<typeof measurePreparation> | null>(null);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; }, [props]);
  // Child mount precedes the retained provider's loader effect. This includes
  // React scheduling/loading overhead, not just SDK network download time.
  useEffect(() => {
    const finish = measurePreparation("sdk");
    sdkMeasurement.current = finish;
    return () => { finish("cancelled"); };
  }, []);
  useEffect(() => {
    if (isRejected) { sdkMeasurement.current?.("failure"); latest.current.failed(); return; }
    if (isResolved) sdkMeasurement.current?.("success");
    if (!isResolved || !container.current) return;
    let active = true;
    const valid = () => active && Date.parse(latest.current.expiresAt) > Date.now();
    let started = false;
    let rendered = false;
    const finishRender = measurePreparation("render");
    try {
      const buttons = window.paypal?.Buttons?.({
        ...latest.current.options,
        createOrder: async (data, actions) => {
          if (!valid()) throw new Error("review_expired");
          started = true;
          return latest.current.options.createOrder!(data, actions);
        },
        onApprove: async (data, actions) => {
          if (!valid()) return;
          return latest.current.options.onApprove!(data, actions);
        },
        onCancel: (data, actions) => { if (valid()) return latest.current.options.onCancel?.(data, actions); },
        onError: (error) => {
          if (!valid()) return;
          if (rendered && started) latest.current.options.onError?.(error);
          else { finishRender("failure"); latest.current.failed(); }
        },
      });
      if (!buttons) { finishRender("failure"); latest.current.failed(); return () => { active = false; }; }
      const cleanup = renderPayPalControl(buttons, container.current, () => {
        if (valid()) { if (finishRender("success")) { rendered = true; latest.current.ready(); } }
        else finishRender("cancelled");
      }, () => { if (valid()) { finishRender("failure"); latest.current.failed(); } else finishRender("cancelled"); });
      return () => { active = false; finishRender("cancelled"); cleanup(); };
    } catch { finishRender("failure"); latest.current.failed(); }
    return () => { active = false; finishRender("cancelled"); };
  }, [isResolved, isRejected]);
  return <div ref={container} />;
}

export function PayPalWalletButton(props: Props) {
  // Credentials stay out of keys and presentation; a context change remounts preparation.
  const [context, setContext] = useState({ quoteId: props.quoteId, accessToken: props.accessToken, generation: 0 });
  if (context.quoteId !== props.quoteId || context.accessToken !== props.accessToken) {
    setContext({ quoteId: props.quoteId, accessToken: props.accessToken, generation: context.generation + 1 });
  }
  return <PayPalPreparation key={context.generation} {...props} />;
}

function PayPalPreparation(props: Props) {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const [bootstrap, setBootstrap] = useState<PayPalIdTokenResponse | null>(null);
  const [fraudNetReady, setFraudNetReady] = useState(false);
  const [error, setError] = useState(clientId ? "" : "PayPal checkout could not load.");
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const operationId = useRef<string>(props.operationId);
  const createPending = useRef(false);

  useEffect(() => {
    let active = true;
    if (!import.meta.env.VITE_PAYPAL_CLIENT_ID) {
      return;
    }
    const finish = measurePreparation("bootstrap");
    void demoApi.paypalIdToken(props.intentId, props.quoteId, props.accessToken)
      .then((value) => { if (active) { finish("success"); setBootstrap(value); } })
      .catch(() => { if (active) { finish("failure"); setError("PayPal is not available right now."); } });
    return () => { active = false; finish("cancelled"); };
  }, [props.intentId, props.quoteId, props.accessToken, attempt]);

  useEffect(() => {
    if (!bootstrap || error) return;
    const loader = document.createElement("script");
    loader.src = "https://c.paypal.com/da/r/fb.js";
    loader.nonce = props.nonce;
    loader.async = true;
    let active = true;
    const finish = measurePreparation("fraudnet");
    loader.onload = () => { if (active && finish("success")) setFraudNetReady(true); };
    loader.onerror = () => { if (active && finish("failure")) setError("PayPal checkout could not load."); };
    document.head.append(loader);
    return () => { active = false; finish("cancelled"); loader.onload = null; loader.onerror = null; loader.remove(); };
  }, [bootstrap, props.nonce, error]);

  const params = bootstrap
    ? { f: props.clientMetadataId, s: bootstrap.fraudNet.sourceId, sandbox: bootstrap.fraudNet.sandbox }
    : null;
  const failed = () => { setReady(false); setError("PayPal checkout could not load."); };

  return (
    <div className="paypal-area">
      <style nonce={props.nonce}>{".paypal-provider-region{min-height:250px;border:1px solid var(--border);border-radius:12px;padding:20px;display:flex;flex-direction:column;justify-content:center;gap:10px}.paypal-provider-region p{margin:0}.paypal-provider-region .warning-note{color:var(--foreground)}@media(max-width:740px){.paypal-provider-region{min-height:320px}}"}</style>
      <div className="paypal-provider-region" aria-busy={!ready && !error}>
      <div role="status" aria-live="polite" aria-busy={!ready && !error}>
        {error ? "PayPal checkout could not load." : ready ? "Secure PayPal checkout ready" : "Preparing secure PayPal checkout…"}
      </div>
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
      {bootstrap && fraudNetReady && clientId && !error ? (
        <PayPalScriptProvider options={buildPayPalScriptOptions({ clientId, idToken: bootstrap.idToken, nonce: props.nonce })}>
          <OfficialControl ready={() => setReady(true)} failed={failed} expiresAt={props.expiresAt} options={{
            fundingSource: "paypal",
            style: { layout: "vertical", shape: "rect", label: "subscribe" },
            createOrder: async () => {
              setError("");
              createPending.current = false;
              let result: CreatePayPalOrderResponse;
              try {
                result = await demoApi.createPayPalOrder({
                  intentId: props.intentId,
                  quoteId: props.quoteId,
                  operationId: operationId.current,
                  clientMetadataId: props.clientMetadataId,
                }, props.accessToken);
              } catch (error) {
                if (classifyCreateOrderError(error) === "failed") throw error;
                createPending.current = true;
                props.onPending(uncertainCaptureStatus(operationId.current));
                throw new Error("payment_in_progress");
              }
              const outcome = classifyCreateOrderResponse(result);
              if (outcome.kind === "failed") {
                createPending.current = true;
                props.onPending(uncertainCaptureStatus(operationId.current));
                throw new Error("payment_in_progress");
              }
              operationId.current = outcome.kind === "ready" ? outcome.operationId : outcome.status.operationId;
              props.onOperationResolved(operationId.current);
              if (outcome.kind === "pending") {
                createPending.current = true;
                props.onPending(outcome.status);
                throw new Error("payment_in_progress");
              }
              return outcome.orderId;
            },
            onApprove: async ({ orderID }) => {
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
              } catch (error) {
                if (classifyCaptureError(error) === "failed") {
                  props.onFailure(operationId.current);
                } else {
                  props.onPending(uncertainCaptureStatus(operationId.current));
                }
              }
            },
            onCancel: props.onCancel,
            onError: () => {
              if (createPending.current) {
                createPending.current = false;
                return;
              }
              props.onFailure(operationId.current);
            },
          }} />
        </PayPalScriptProvider>
      ) : null}
      {error ? <div className="warning-note" role="alert"><p>No payment has been submitted by preparation. Your order is unchanged.</p><button className="primary-button" type="button" onClick={() => { setBootstrap(null); setFraudNetReady(false); setReady(false); setError(clientId ? "" : "PayPal checkout could not load."); setAttempt((value) => value + 1); }}>Try loading PayPal again</button></div> : null}
      </div>
      <p className="muted">Preparing and ready describe the control only. Funding, wallet readiness and account activation require separate verified evidence.</p>
    </div>
  );
}
